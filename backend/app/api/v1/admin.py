from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
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
    MfaVerifyRequest,
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
from app.services.admin_service import AdminService

router = APIRouter(prefix="/tenants/{slug}/admin", tags=["admin"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    ctx: TenantContext = Depends(require_permission("admin:read")),
    db: Session = Depends(get_db),
) -> AdminDashboardResponse:
    return AdminService(db).get_dashboard(ctx)


@router.get("/health", response_model=SystemHealthResponse)
def get_system_health(
    ctx: TenantContext = Depends(require_permission("admin:read")),
    db: Session = Depends(get_db),
) -> SystemHealthResponse:
    return AdminService(db).get_system_health(ctx)


@router.get("/organization", response_model=OrganizationPolicyResponse)
def get_organization_policy(
    ctx: TenantContext = Depends(require_permission("admin:read")),
    db: Session = Depends(get_db),
) -> OrganizationPolicyResponse:
    return AdminService(db).get_policy(ctx)


@router.patch("/organization", response_model=OrganizationPolicyResponse)
def update_organization_policy(
    payload: OrganizationPolicyUpdate,
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> OrganizationPolicyResponse:
    return AdminService(db).update_policy(ctx, payload)


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def list_audit_logs(
    action: str | None = None,
    limit: int = Query(100, le=500),
    ctx: TenantContext = Depends(require_permission("audit:read")),
    db: Session = Depends(get_db),
) -> list[AuditLogResponse]:
    return AdminService(db).list_audit_logs(ctx, action=action, limit=limit)


@router.get("/sessions", response_model=list[UserSessionResponse])
def list_sessions(
    ctx: TenantContext = Depends(require_permission("session:read")),
    db: Session = Depends(get_db),
) -> list[UserSessionResponse]:
    return AdminService(db).list_sessions(ctx)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def terminate_session(
    session_id: UUID,
    ctx: TenantContext = Depends(require_permission("session:write")),
    db: Session = Depends(get_db),
) -> None:
    AdminService(db).terminate_session(ctx, session_id)


@router.post("/sessions/revoke-all")
def revoke_all_sessions(
    ctx: TenantContext = Depends(require_permission("session:write")),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    count = AdminService(db).revoke_all_sessions(ctx)
    return {"revoked": count}


@router.get("/login-history", response_model=list[LoginHistoryResponse])
def list_login_history(
    ctx: TenantContext = Depends(require_permission("security:read")),
    db: Session = Depends(get_db),
) -> list[LoginHistoryResponse]:
    return AdminService(db).list_login_history(ctx)


@router.get("/security", response_model=SecurityOverviewResponse)
def get_security_overview(
    ctx: TenantContext = Depends(require_permission("security:read")),
    db: Session = Depends(get_db),
) -> SecurityOverviewResponse:
    return AdminService(db).get_security_overview(ctx)


@router.get("/api-keys", response_model=list[AdminApiKeyResponse])
def list_admin_api_keys(
    ctx: TenantContext = Depends(require_permission("admin:read")),
    db: Session = Depends(get_db),
) -> list[AdminApiKeyResponse]:
    return AdminService(db).list_api_keys(ctx)


@router.post("/api-keys", response_model=AdminApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_admin_api_key(
    payload: AdminApiKeyCreate,
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> AdminApiKeyCreatedResponse:
    return AdminService(db).create_api_key(ctx, payload)


@router.post("/api-keys/{key_id}/rotate", response_model=AdminApiKeyCreatedResponse)
def rotate_admin_api_key(
    key_id: UUID,
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> AdminApiKeyCreatedResponse:
    return AdminService(db).rotate_api_key(ctx, key_id)


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_admin_api_key(
    key_id: UUID,
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> None:
    AdminService(db).revoke_api_key(ctx, key_id)


@router.get("/feature-flags", response_model=list[FeatureFlagResponse])
def list_feature_flags(
    ctx: TenantContext = Depends(require_permission("admin:read")),
    db: Session = Depends(get_db),
) -> list[FeatureFlagResponse]:
    return AdminService(db).list_feature_flags(ctx)


@router.post("/feature-flags", response_model=FeatureFlagResponse, status_code=status.HTTP_201_CREATED)
def create_feature_flag(
    payload: FeatureFlagCreate,
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> FeatureFlagResponse:
    return AdminService(db).create_feature_flag(ctx, payload)


@router.patch("/feature-flags/{flag_id}", response_model=FeatureFlagResponse)
def update_feature_flag(
    flag_id: UUID,
    payload: FeatureFlagUpdate,
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> FeatureFlagResponse:
    return AdminService(db).update_feature_flag(ctx, flag_id, payload)


@router.get("/custom-fields", response_model=list[CustomFieldResponse])
def list_custom_fields(
    entity_type: str | None = None,
    ctx: TenantContext = Depends(require_permission("admin:read")),
    db: Session = Depends(get_db),
) -> list[CustomFieldResponse]:
    return AdminService(db).list_custom_fields(ctx, entity_type)


@router.post("/custom-fields", response_model=CustomFieldResponse, status_code=status.HTTP_201_CREATED)
def create_custom_field(
    payload: CustomFieldCreate,
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> CustomFieldResponse:
    return AdminService(db).create_custom_field(ctx, payload)


@router.patch("/custom-fields/{field_id}", response_model=CustomFieldResponse)
def update_custom_field(
    field_id: UUID,
    payload: CustomFieldUpdate,
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> CustomFieldResponse:
    return AdminService(db).update_custom_field(ctx, field_id, payload)


@router.delete("/custom-fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_field(
    field_id: UUID,
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> None:
    AdminService(db).delete_custom_field(ctx, field_id)


@router.get("/roles/matrix", response_model=PermissionMatrixResponse)
def get_permission_matrix(
    ctx: TenantContext = Depends(require_permission("role:read")),
    db: Session = Depends(get_db),
) -> PermissionMatrixResponse:
    return AdminService(db).get_permission_matrix(ctx)


@router.post("/roles", status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreateRequest,
    ctx: TenantContext = Depends(require_permission("role:write")),
    db: Session = Depends(get_db),
) -> dict:
    return AdminService(db).create_role(ctx, payload)


@router.post("/roles/{role_id}/clone", status_code=status.HTTP_201_CREATED)
def clone_role(
    role_id: UUID,
    payload: RoleCloneRequest,
    ctx: TenantContext = Depends(require_permission("role:write")),
    db: Session = Depends(get_db),
) -> dict:
    return AdminService(db).clone_role(ctx, role_id, payload)


@router.get("/identity/sso", response_model=list[SsoProviderResponse])
def list_sso_providers(
    ctx: TenantContext = Depends(require_permission("admin:read")),
    db: Session = Depends(get_db),
) -> list[SsoProviderResponse]:
    return AdminService(db).list_sso_providers(ctx)


@router.post("/identity/mfa/setup", response_model=MfaSetupResponse)
def setup_mfa(
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> MfaSetupResponse:
    return AdminService(db).setup_mfa(ctx)


@router.post("/identity/mfa/verify")
def verify_mfa(
    payload: MfaVerifyRequest,
    ctx: TenantContext = Depends(require_permission("admin:write")),
    db: Session = Depends(get_db),
) -> dict:
    return AdminService(db).verify_mfa(ctx, payload.code)
