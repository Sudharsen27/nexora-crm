"""Enterprise Administration, Security & Identity service (Phase 16)."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.deps import TenantContext
from app.core.security import hash_token
from app.db.mixins import utcnow
from app.models import Permission, RefreshToken, Role, RolePermission, TenantMembership, User
from app.models.admin import (
    AdminApiKey,
    AuditLog,
    CustomField,
    FeatureFlag,
    LoginHistory,
    MfaEnrollment,
    OrganizationPolicy,
    SecurityEvent,
    TrustedDevice,
    UserSession,
)
from app.schemas.admin import (
    AdminApiKeyCreate,
    AdminApiKeyCreatedResponse,
    AdminApiKeyResponse,
    AdminDashboardResponse,
    AuditLogResponse,
    CustomFieldCreate,
    CustomFieldResponse,
    CustomFieldUpdate,
    FeatureFlagCreate,
    FeatureFlagResponse,
    FeatureFlagUpdate,
    LoginHistoryResponse,
    MfaSetupResponse,
    OrganizationPolicyResponse,
    OrganizationPolicyUpdate,
    PermissionMatrixResponse,
    RoleCloneRequest,
    RoleCreateRequest,
    SecurityOverviewResponse,
    SsoProviderResponse,
    SystemHealthResponse,
    UserSessionResponse,
)
from app.services.notification_hooks import notify_user


DEFAULT_FEATURE_FLAGS = [
    ("ai_assistant", "AI Assistant", "Enable AI assistant module"),
    ("customer_portal", "Customer Portal", "Enable customer portal"),
    ("integrations_marketplace", "Integrations", "Enable integration marketplace"),
    ("mobile_pwa", "Mobile PWA", "Enable mobile offline PWA"),
    ("bi_intelligence", "Business Intelligence", "Enable BI dashboards"),
    ("workflow_automation", "Workflows", "Enable workflow engine"),
    ("advanced_security", "Advanced Security", "Enable MFA and device trust"),
]

DEFAULT_SSO_PROVIDERS = ("google", "microsoft", "github", "magic_link")


class AdminService:
    def __init__(self, db: Session):
        self.db = db

    def record_audit(
        self,
        ctx: TenantContext,
        *,
        action: str,
        resource: str,
        description: str,
        resource_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            tenant_id=ctx.tenant.id,
            actor_id=ctx.membership.user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_=metadata or {},
            created_at=utcnow(),
        )
        self.db.add(entry)
        return entry

    def _get_or_create_policy(self, ctx: TenantContext) -> OrganizationPolicy:
        policy = self.db.scalar(
            select(OrganizationPolicy).where(OrganizationPolicy.tenant_id == ctx.tenant.id)
        )
        if policy:
            return policy
        policy = OrganizationPolicy(
            tenant_id=ctx.tenant.id,
            password_policy={
                "min_length": 8,
                "require_uppercase": True,
                "require_number": True,
                "require_special": False,
                "max_age_days": 90,
            },
            sso_config={p: {"enabled": False, "configured": False} for p in DEFAULT_SSO_PROVIDERS},
            security_settings={"mfa_required": False, "session_timeout_minutes": 480},
            business_hours={"mon": "09:00-17:00", "tue": "09:00-17:00", "wed": "09:00-17:00"},
        )
        self.db.add(policy)
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def _seed_feature_flags(self, ctx: TenantContext) -> None:
        existing = self.db.scalar(
            select(func.count()).select_from(FeatureFlag).where(FeatureFlag.tenant_id == ctx.tenant.id)
        )
        if existing:
            return
        for key, name, desc in DEFAULT_FEATURE_FLAGS:
            self.db.add(
                FeatureFlag(
                    tenant_id=ctx.tenant.id,
                    key=key,
                    name=name,
                    description=desc,
                    enabled=True,
                    scope="tenant",
                )
            )
        self.db.commit()

    def get_dashboard(self, ctx: TenantContext) -> AdminDashboardResponse:
        self._seed_feature_flags(ctx)
        user_count = self.db.scalar(
            select(func.count())
            .select_from(TenantMembership)
            .where(TenantMembership.tenant_id == ctx.tenant.id, TenantMembership.status == "active")
        ) or 0
        active_sessions = self._count_active_sessions(ctx.tenant.id)
        audit_24h = self.db.scalar(
            select(func.count())
            .select_from(AuditLog)
            .where(
                AuditLog.tenant_id == ctx.tenant.id,
                AuditLog.created_at >= utcnow() - timedelta(hours=24),
            )
        ) or 0
        api_keys = self.db.scalar(
            select(func.count())
            .select_from(AdminApiKey)
            .where(AdminApiKey.tenant_id == ctx.tenant.id, AdminApiKey.status == "active")
        ) or 0
        flags_on = self.db.scalar(
            select(func.count())
            .select_from(FeatureFlag)
            .where(FeatureFlag.tenant_id == ctx.tenant.id, FeatureFlag.enabled.is_(True))
        ) or 0
        fields = self.db.scalar(
            select(func.count())
            .select_from(CustomField)
            .where(CustomField.tenant_id == ctx.tenant.id, CustomField.is_active.is_(True))
        ) or 0
        failed = self.db.scalar(
            select(func.count())
            .select_from(LoginHistory)
            .where(
                LoginHistory.tenant_id == ctx.tenant.id,
                LoginHistory.result == "failed",
                LoginHistory.created_at >= utcnow() - timedelta(hours=24),
            )
        ) or 0
        open_events = self.db.scalar(
            select(func.count())
            .select_from(SecurityEvent)
            .where(SecurityEvent.tenant_id == ctx.tenant.id, SecurityEvent.resolved.is_(False))
        ) or 0
        score = max(0, min(100, 100 - failed * 5 - open_events * 10))
        return AdminDashboardResponse(
            organization_name=ctx.tenant.name,
            user_count=user_count,
            active_sessions=active_sessions,
            security_score=score,
            audit_events_24h=audit_24h,
            api_keys_active=api_keys,
            storage_used_mb=round(user_count * 2.5, 1),
            feature_flags_enabled=flags_on,
            custom_fields_count=fields,
            failed_logins_24h=failed,
            open_security_events=open_events,
        )

    def _count_active_sessions(self, tenant_id: uuid.UUID) -> int:
        member_ids = list(
            self.db.scalars(
                select(TenantMembership.user_id).where(
                    TenantMembership.tenant_id == tenant_id,
                    TenantMembership.status == "active",
                )
            ).all()
        )
        if not member_ids:
            return 0
        now = utcnow()
        return (
            self.db.scalar(
                select(func.count())
                .select_from(RefreshToken)
                .where(
                    RefreshToken.user_id.in_(member_ids),
                    RefreshToken.revoked_at.is_(None),
                    RefreshToken.expires_at > now,
                )
            )
            or 0
        )

    def get_policy(self, ctx: TenantContext) -> OrganizationPolicyResponse:
        return OrganizationPolicyResponse.model_validate(self._get_or_create_policy(ctx))

    def update_policy(self, ctx: TenantContext, payload: OrganizationPolicyUpdate) -> OrganizationPolicyResponse:
        policy = self._get_or_create_policy(ctx)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(policy, field, value)
        self.record_audit(
            ctx,
            action="organization_update",
            resource="organization",
            description="Organization policy updated",
            resource_id=str(ctx.tenant.id),
        )
        self.db.commit()
        self.db.refresh(policy)
        return OrganizationPolicyResponse.model_validate(policy)

    def list_audit_logs(
        self, ctx: TenantContext, *, action: str | None = None, limit: int = 100
    ) -> list[AuditLogResponse]:
        query = select(AuditLog).where(AuditLog.tenant_id == ctx.tenant.id)
        if action:
            query = query.where(AuditLog.action == action)
        rows = self.db.scalars(query.order_by(desc(AuditLog.created_at)).limit(limit)).all()
        return [AuditLogResponse.model_validate(r) for r in rows]

    def list_sessions(self, ctx: TenantContext) -> list[UserSessionResponse]:
        member_ids = list(
            self.db.scalars(
                select(TenantMembership.user_id).where(TenantMembership.tenant_id == ctx.tenant.id)
            ).all()
        )
        if not member_ids:
            return []
        now = utcnow()
        tokens = self.db.scalars(
            select(RefreshToken)
            .where(
                RefreshToken.user_id.in_(member_ids),
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
            .order_by(desc(RefreshToken.created_at))
            .limit(50)
        ).all()
        return [
            UserSessionResponse(
                id=t.id,
                user_id=t.user_id,
                status="active",
                device_name=self._parse_device(t.user_agent),
                user_agent=t.user_agent,
                ip_address=t.ip_address,
                location=None,
                is_current=False,
                last_active_at=t.created_at,
                created_at=t.created_at,
                expires_at=t.expires_at,
            )
            for t in tokens
        ]

    def terminate_session(self, ctx: TenantContext, session_id: uuid.UUID) -> None:
        token = self.db.scalar(select(RefreshToken).where(RefreshToken.id == session_id))
        if not token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        token.revoked_at = utcnow()
        self.record_audit(
            ctx,
            action="session_terminated",
            resource="session",
            description=f"Session terminated for user {token.user_id}",
            resource_id=str(session_id),
        )
        self.db.commit()

    def revoke_all_sessions(self, ctx: TenantContext, user_id: uuid.UUID | None = None) -> int:
        target_id = user_id or ctx.membership.user_id
        now = utcnow()
        tokens = list(
            self.db.scalars(
                select(RefreshToken).where(
                    RefreshToken.user_id == target_id,
                    RefreshToken.revoked_at.is_(None),
                )
            ).all()
        )
        for t in tokens:
            t.revoked_at = now
        self.record_audit(
            ctx,
            action="session_terminated",
            resource="session",
            description=f"Revoked {len(tokens)} session(s)",
            resource_id=str(target_id),
        )
        self.db.commit()
        return len(tokens)

    def list_login_history(self, ctx: TenantContext, limit: int = 50) -> list[LoginHistoryResponse]:
        rows = self.db.scalars(
            select(LoginHistory)
            .where(LoginHistory.tenant_id == ctx.tenant.id)
            .order_by(desc(LoginHistory.created_at))
            .limit(limit)
        ).all()
        return [LoginHistoryResponse.model_validate(r) for r in rows]

    def get_security_overview(self, ctx: TenantContext) -> SecurityOverviewResponse:
        policy = self._get_or_create_policy(ctx)
        failed = self.db.scalar(
            select(func.count())
            .select_from(LoginHistory)
            .where(
                LoginHistory.tenant_id == ctx.tenant.id,
                LoginHistory.result == "failed",
                LoginHistory.created_at >= utcnow() - timedelta(hours=24),
            )
        ) or 0
        blocked = list(
            self.db.scalars(
                select(SecurityEvent.ip_address).where(
                    SecurityEvent.tenant_id == ctx.tenant.id,
                    SecurityEvent.event_type == "blocked_ip",
                    SecurityEvent.resolved.is_(False),
                )
            ).all()
        )
        suspicious = self.db.scalar(
            select(func.count())
            .select_from(SecurityEvent)
            .where(
                SecurityEvent.tenant_id == ctx.tenant.id,
                SecurityEvent.event_type == "suspicious_login",
                SecurityEvent.resolved.is_(False),
            )
        ) or 0
        trusted = self.db.scalar(
            select(func.count())
            .select_from(TrustedDevice)
            .where(TrustedDevice.tenant_id == ctx.tenant.id, TrustedDevice.trust_level == "trusted")
        ) or 0
        mfa_users = self.db.scalar(
            select(func.count())
            .select_from(MfaEnrollment)
            .where(MfaEnrollment.is_enabled.is_(True))
        ) or 0
        open_events = list(
            self.db.scalars(
                select(SecurityEvent)
                .where(SecurityEvent.tenant_id == ctx.tenant.id, SecurityEvent.resolved.is_(False))
                .order_by(desc(SecurityEvent.created_at))
                .limit(10)
            ).all()
        )
        score = max(0, min(100, 100 - failed * 5 - len(blocked) * 10))
        return SecurityOverviewResponse(
            security_score=score,
            failed_logins_24h=failed,
            blocked_ips=[ip for ip in blocked if ip],
            suspicious_logins=suspicious,
            active_sessions=self._count_active_sessions(ctx.tenant.id),
            trusted_devices=trusted,
            mfa_enabled_users=mfa_users,
            open_events=[
                {
                    "id": str(e.id),
                    "type": e.event_type,
                    "severity": e.severity,
                    "description": e.description,
                    "created_at": e.created_at.isoformat(),
                }
                for e in open_events
            ],
            password_policy=policy.password_policy,
        )

    def list_api_keys(self, ctx: TenantContext) -> list[AdminApiKeyResponse]:
        rows = self.db.scalars(
            select(AdminApiKey)
            .where(AdminApiKey.tenant_id == ctx.tenant.id, AdminApiKey.status == "active")
            .order_by(desc(AdminApiKey.created_at))
        ).all()
        return [AdminApiKeyResponse.model_validate(r) for r in rows]

    def create_api_key(self, ctx: TenantContext, payload: AdminApiKeyCreate) -> AdminApiKeyCreatedResponse:
        raw_key = f"nxa_{secrets.token_urlsafe(32)}"
        prefix = raw_key[:12]
        expires_at = None
        if payload.expires_in_days:
            expires_at = utcnow() + timedelta(days=payload.expires_in_days)
        row = AdminApiKey(
            tenant_id=ctx.tenant.id,
            created_by_id=ctx.membership.user_id,
            name=payload.name,
            key_prefix=prefix,
            key_hash=hash_token(raw_key),
            scopes=payload.scopes or ["read", "write"],
            rate_limit_per_hour=payload.rate_limit_per_hour,
            expires_at=expires_at,
        )
        self.db.add(row)
        self.record_audit(
            ctx,
            action="api_key_created",
            resource="api_key",
            description=f"API key created: {payload.name}",
        )
        self.db.commit()
        self.db.refresh(row)
        return AdminApiKeyCreatedResponse(**AdminApiKeyResponse.model_validate(row).model_dump(), api_key=raw_key)

    def rotate_api_key(self, ctx: TenantContext, key_id: uuid.UUID) -> AdminApiKeyCreatedResponse:
        row = self._get_api_key(ctx, key_id)
        row.status = "revoked"
        created = self.create_api_key(
            ctx,
            AdminApiKeyCreate(name=f"{row.name} (rotated)", scopes=row.scopes, rate_limit_per_hour=row.rate_limit_per_hour),
        )
        return created

    def revoke_api_key(self, ctx: TenantContext, key_id: uuid.UUID) -> None:
        row = self._get_api_key(ctx, key_id)
        row.status = "revoked"
        self.record_audit(
            ctx,
            action="api_key_revoked",
            resource="api_key",
            description=f"API key revoked: {row.name}",
            resource_id=str(key_id),
        )
        self.db.commit()

    def _get_api_key(self, ctx: TenantContext, key_id: uuid.UUID) -> AdminApiKey:
        row = self.db.scalar(
            select(AdminApiKey).where(AdminApiKey.id == key_id, AdminApiKey.tenant_id == ctx.tenant.id)
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
        return row

    def list_feature_flags(self, ctx: TenantContext) -> list[FeatureFlagResponse]:
        self._seed_feature_flags(ctx)
        rows = self.db.scalars(
            select(FeatureFlag)
            .where(FeatureFlag.tenant_id == ctx.tenant.id)
            .order_by(FeatureFlag.name)
        ).all()
        return [FeatureFlagResponse.model_validate(r) for r in rows]

    def create_feature_flag(self, ctx: TenantContext, payload: FeatureFlagCreate) -> FeatureFlagResponse:
        row = FeatureFlag(
            tenant_id=ctx.tenant.id,
            key=payload.key,
            name=payload.name,
            description=payload.description,
            enabled=payload.enabled,
            rollout_percentage=payload.rollout_percentage,
        )
        self.db.add(row)
        self.record_audit(
            ctx,
            action="feature_flag_updated",
            resource="feature_flag",
            description=f"Feature flag created: {payload.key}",
        )
        notify_user(
            self.db,
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            actor_id=ctx.membership.user_id,
            type="feature_flag_updated",
            title="Feature flag updated",
            message=f"Feature '{payload.name}' was created.",
        )
        self.db.commit()
        self.db.refresh(row)
        return FeatureFlagResponse.model_validate(row)

    def update_feature_flag(
        self, ctx: TenantContext, flag_id: uuid.UUID, payload: FeatureFlagUpdate
    ) -> FeatureFlagResponse:
        row = self.db.scalar(
            select(FeatureFlag).where(FeatureFlag.id == flag_id, FeatureFlag.tenant_id == ctx.tenant.id)
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature flag not found")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        self.record_audit(
            ctx,
            action="feature_flag_updated",
            resource="feature_flag",
            description=f"Feature flag updated: {row.key}",
            resource_id=str(flag_id),
        )
        self.db.commit()
        self.db.refresh(row)
        return FeatureFlagResponse.model_validate(row)

    def list_custom_fields(self, ctx: TenantContext, entity_type: str | None = None) -> list[CustomFieldResponse]:
        query = select(CustomField).where(CustomField.tenant_id == ctx.tenant.id)
        if entity_type:
            query = query.where(CustomField.entity_type == entity_type)
        rows = self.db.scalars(query.order_by(CustomField.sort_order, CustomField.label)).all()
        return [CustomFieldResponse.model_validate(r) for r in rows]

    def create_custom_field(self, ctx: TenantContext, payload: CustomFieldCreate) -> CustomFieldResponse:
        row = CustomField(
            tenant_id=ctx.tenant.id,
            entity_type=payload.entity_type,
            key=payload.key,
            label=payload.label,
            field_type=payload.field_type,
            required=payload.required,
            options=payload.options,
            default_value=payload.default_value,
            sort_order=payload.sort_order,
        )
        self.db.add(row)
        self.record_audit(
            ctx,
            action="custom_field_created",
            resource="custom_field",
            description=f"Custom field created: {payload.entity_type}.{payload.key}",
        )
        self.db.commit()
        self.db.refresh(row)
        return CustomFieldResponse.model_validate(row)

    def update_custom_field(
        self, ctx: TenantContext, field_id: uuid.UUID, payload: CustomFieldUpdate
    ) -> CustomFieldResponse:
        row = self.db.scalar(
            select(CustomField).where(CustomField.id == field_id, CustomField.tenant_id == ctx.tenant.id)
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom field not found")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        self.db.commit()
        self.db.refresh(row)
        return CustomFieldResponse.model_validate(row)

    def delete_custom_field(self, ctx: TenantContext, field_id: uuid.UUID) -> None:
        row = self.db.scalar(
            select(CustomField).where(CustomField.id == field_id, CustomField.tenant_id == ctx.tenant.id)
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom field not found")
        self.db.delete(row)
        self.db.commit()

    def get_permission_matrix(self, ctx: TenantContext) -> PermissionMatrixResponse:
        permissions = list(self.db.scalars(select(Permission).order_by(Permission.resource, Permission.action)).all())
        roles = list(
            self.db.scalars(
                select(Role)
                .options(joinedload(Role.permissions))
                .where(Role.tenant_id == ctx.tenant.id)
                .order_by(Role.name)
            )
            .unique()
            .all()
        )
        return PermissionMatrixResponse(
            permissions=[
                {"slug": p.slug, "resource": p.resource, "action": p.action} for p in permissions
            ],
            roles=[
                {
                    "id": str(r.id),
                    "name": r.name,
                    "slug": r.slug,
                    "is_system": r.is_system,
                    "permissions": [p.slug for p in r.permissions],
                }
                for r in roles
            ],
        )

    def create_role(self, ctx: TenantContext, payload: RoleCreateRequest) -> dict[str, Any]:
        existing = self.db.scalar(
            select(Role).where(Role.tenant_id == ctx.tenant.id, Role.slug == payload.slug)
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role slug already exists")
        role = Role(
            tenant_id=ctx.tenant.id,
            name=payload.name,
            slug=payload.slug,
            is_system=False,
            created_at=utcnow(),
        )
        self.db.add(role)
        self.db.flush()
        if payload.permission_slugs:
            perms = list(
                self.db.scalars(select(Permission).where(Permission.slug.in_(payload.permission_slugs))).all()
            )
            for perm in perms:
                self.db.add(RolePermission(role_id=role.id, permission_id=perm.id))
        self.record_audit(
            ctx,
            action="role_change",
            resource="role",
            description=f"Role created: {payload.name}",
            resource_id=str(role.id),
        )
        self.db.commit()
        self.db.refresh(role)
        return {"id": str(role.id), "name": role.name, "slug": role.slug}

    def clone_role(self, ctx: TenantContext, role_id: uuid.UUID, payload: RoleCloneRequest) -> dict[str, Any]:
        source = self.db.scalars(
            select(Role)
            .options(joinedload(Role.permissions))
            .where(Role.id == role_id, Role.tenant_id == ctx.tenant.id)
        ).unique().first()
        if not source:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        return self.create_role(
            ctx,
            RoleCreateRequest(
                name=payload.name,
                slug=payload.slug,
                permission_slugs=[p.slug for p in source.permissions],
            ),
        )

    def setup_mfa(self, ctx: TenantContext) -> MfaSetupResponse:
        secret = secrets.token_hex(10).upper()
        backup_codes = [secrets.token_hex(4).upper() for _ in range(8)]
        enrollment = self.db.scalar(
            select(MfaEnrollment).where(
                MfaEnrollment.user_id == ctx.membership.user_id,
                MfaEnrollment.method == "totp",
            )
        )
        if not enrollment:
            enrollment = MfaEnrollment(user_id=ctx.membership.user_id, method="totp")
            self.db.add(enrollment)
        from app.core.crypto import encrypt_secret

        enrollment.secret_encrypted = encrypt_secret(secret)
        enrollment.backup_codes_hash = [hash_token(c) for c in backup_codes]
        enrollment.is_enabled = False
        self.db.commit()
        return MfaSetupResponse(
            method="totp",
            secret=secret,
            qr_uri=f"otpauth://totp/Nexora:{ctx.membership.user_id}?secret={secret}&issuer=Nexora",
            backup_codes=backup_codes,
        )

    def verify_mfa(self, ctx: TenantContext, code: str) -> dict[str, bool]:
        enrollment = self.db.scalar(
            select(MfaEnrollment).where(
                MfaEnrollment.user_id == ctx.membership.user_id,
                MfaEnrollment.method == "totp",
            )
        )
        if not enrollment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MFA not set up")
        # Demo: accept any 6-digit code
        if len(code) >= 6:
            enrollment.is_enabled = True
            enrollment.verified_at = utcnow()
            self.record_audit(
                ctx,
                action="mfa_enabled",
                resource="identity",
                description="MFA TOTP enabled",
            )
            self.db.commit()
            return {"enabled": True}
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid MFA code")

    def list_sso_providers(self, ctx: TenantContext) -> list[SsoProviderResponse]:
        policy = self._get_or_create_policy(ctx)
        sso = policy.sso_config or {}
        return [
            SsoProviderResponse(
                provider=p,
                enabled=bool(sso.get(p, {}).get("enabled")),
                configured=bool(sso.get(p, {}).get("configured")),
            )
            for p in DEFAULT_SSO_PROVIDERS
        ]

    def get_system_health(self, ctx: TenantContext) -> SystemHealthResponse:
        policy = self._get_or_create_policy(ctx)
        return SystemHealthResponse(
            status="healthy",
            database="connected",
            api_version="1.0.0",
            uptime_hint="running",
            maintenance_mode=policy.maintenance_mode,
        )

    @staticmethod
    def _parse_device(user_agent: str | None) -> str | None:
        if not user_agent:
            return None
        if "Mobile" in user_agent:
            return "Mobile Device"
        if "Windows" in user_agent:
            return "Windows"
        if "Mac" in user_agent:
            return "macOS"
        if "Linux" in user_agent:
            return "Linux"
        return "Unknown Device"

    @staticmethod
    def log_login_attempt(
        db: Session,
        *,
        tenant_id: uuid.UUID | None,
        user_id: uuid.UUID | None,
        email: str,
        result: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
        failure_reason: str | None = None,
    ) -> None:
        db.add(
            LoginHistory(
                tenant_id=tenant_id,
                user_id=user_id,
                email=email.lower(),
                result=result,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason=failure_reason,
                created_at=utcnow(),
            )
        )
        if result == "failed" and tenant_id:
            db.add(
                SecurityEvent(
                    tenant_id=tenant_id,
                    event_type="failed_login",
                    severity="medium",
                    ip_address=ip_address,
                    user_id=user_id,
                    description=f"Failed login attempt for {email}",
                    metadata_={"email": email, "reason": failure_reason},
                )
            )
