"""Enterprise Integrations Hub — marketplace, OAuth, webhooks, sync engine, API keys."""

from __future__ import annotations

import json
import logging
import secrets
import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.crypto import decrypt_secret, encrypt_secret
from app.core.deps import TenantContext
from app.core.security import hash_token
from app.db.mixins import utcnow
from app.models.integration import (
    ApiKey,
    Integration,
    IntegrationAccount,
    MarketplaceApp,
    OAuthToken,
    SyncHistory,
    Webhook,
    WebhookLog,
)
from app.schemas.integration import (
    ApiKeyCreate,
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    IntegrationConnectRequest,
    IntegrationDashboardResponse,
    IntegrationDetail,
    IntegrationHealthResponse,
    IntegrationSettingsUpdate,
    IntegrationSummary,
    MarketplaceAppSummary,
    MarketplaceListResponse,
    OAuthAuthorizeResponse,
    SyncHistoryResponse,
    WebhookCreate,
    WebhookLogResponse,
    WebhookResponse,
    WebhookUpdate,
)
from app.services.activity_logger import ActivityLogger
from app.services.notification_hooks import notify_user

logger = logging.getLogger(__name__)

SYSTEM_APPS: list[dict[str, Any]] = [
    {"slug": "google-calendar", "name": "Google Calendar", "vendor": "Google", "category": "productivity", "icon": "calendar", "auth_type": "oauth2", "is_popular": True, "is_recommended": True, "capabilities": ["sync_events", "create_meeting"]},
    {"slug": "google-drive", "name": "Google Drive", "vendor": "Google", "category": "storage", "icon": "hard-drive", "auth_type": "oauth2", "is_popular": True, "capabilities": ["upload", "sync_folders"]},
    {"slug": "gmail", "name": "Gmail", "vendor": "Google", "category": "email", "icon": "mail", "auth_type": "oauth2", "is_popular": True, "is_recommended": True, "capabilities": ["send_email", "read_inbox"]},
    {"slug": "outlook", "name": "Microsoft Outlook", "vendor": "Microsoft", "category": "email", "icon": "mail", "auth_type": "oauth2", "is_popular": True, "capabilities": ["send_email", "sync_calendar"]},
    {"slug": "onedrive", "name": "OneDrive", "vendor": "Microsoft", "category": "storage", "icon": "cloud", "auth_type": "oauth2", "capabilities": ["upload", "sync_files"]},
    {"slug": "teams", "name": "Microsoft Teams", "vendor": "Microsoft", "category": "communication", "icon": "users", "auth_type": "oauth2", "is_popular": True, "capabilities": ["send_message", "create_channel"]},
    {"slug": "slack", "name": "Slack", "vendor": "Slack", "category": "communication", "icon": "message-square", "auth_type": "oauth2", "is_popular": True, "is_recommended": True, "capabilities": ["send_message", "create_channel"]},
    {"slug": "zoom", "name": "Zoom", "vendor": "Zoom", "category": "video", "icon": "video", "auth_type": "oauth2", "is_popular": True, "capabilities": ["create_meeting", "schedule_webinar"]},
    {"slug": "google-meet", "name": "Google Meet", "vendor": "Google", "category": "video", "icon": "video", "auth_type": "oauth2", "capabilities": ["create_meeting"]},
    {"slug": "stripe", "name": "Stripe", "vendor": "Stripe", "category": "payments", "icon": "credit-card", "auth_type": "api_key", "is_popular": True, "is_recommended": True, "capabilities": ["create_invoice", "process_payment"]},
    {"slug": "razorpay", "name": "Razorpay", "vendor": "Razorpay", "category": "payments", "icon": "credit-card", "auth_type": "api_key", "capabilities": ["create_invoice", "process_payment"]},
    {"slug": "twilio", "name": "Twilio", "vendor": "Twilio", "category": "messaging", "icon": "phone", "auth_type": "api_key", "capabilities": ["send_sms", "make_call"]},
    {"slug": "whatsapp-business", "name": "WhatsApp Business", "vendor": "Meta", "category": "messaging", "icon": "message-circle", "auth_type": "api_key", "is_popular": True, "capabilities": ["send_message"]},
    {"slug": "sendgrid", "name": "SendGrid", "vendor": "Twilio", "category": "email", "icon": "send", "auth_type": "api_key", "capabilities": ["send_email", "templates"]},
    {"slug": "postmark", "name": "Postmark", "vendor": "ActiveCampaign", "category": "email", "icon": "send", "auth_type": "api_key", "capabilities": ["send_email"]},
    {"slug": "mailgun", "name": "Mailgun", "vendor": "Sinch", "category": "email", "icon": "send", "auth_type": "api_key", "capabilities": ["send_email"]},
    {"slug": "firebase", "name": "Firebase", "vendor": "Google", "category": "developer", "icon": "flame", "auth_type": "api_key", "is_developer": True, "capabilities": ["push_notifications", "realtime_db"]},
    {"slug": "aws-s3", "name": "AWS S3", "vendor": "Amazon", "category": "storage", "icon": "cloud", "auth_type": "api_key", "capabilities": ["upload", "sync_files"]},
    {"slug": "cloudinary", "name": "Cloudinary", "vendor": "Cloudinary", "category": "storage", "icon": "image", "auth_type": "api_key", "capabilities": ["upload", "transform"]},
    {"slug": "dropbox", "name": "Dropbox", "vendor": "Dropbox", "category": "storage", "icon": "box", "auth_type": "oauth2", "capabilities": ["upload", "sync_files"]},
    {"slug": "github", "name": "GitHub", "vendor": "GitHub", "category": "developer", "icon": "github", "auth_type": "oauth2", "is_developer": True, "is_popular": True, "capabilities": ["create_issue", "sync_repos"]},
    {"slug": "gitlab", "name": "GitLab", "vendor": "GitLab", "category": "developer", "icon": "git-branch", "auth_type": "oauth2", "is_developer": True, "capabilities": ["create_issue", "sync_repos"]},
    {"slug": "jira", "name": "Jira", "vendor": "Atlassian", "category": "project_management", "icon": "layout-grid", "auth_type": "oauth2", "is_popular": True, "capabilities": ["create_issue", "sync_tickets"]},
    {"slug": "notion", "name": "Notion", "vendor": "Notion", "category": "productivity", "icon": "file-text", "auth_type": "oauth2", "is_recommended": True, "capabilities": ["create_page", "sync_database"]},
    {"slug": "trello", "name": "Trello", "vendor": "Atlassian", "category": "project_management", "icon": "columns", "auth_type": "oauth2", "capabilities": ["create_card", "sync_boards"]},
    {"slug": "clickup", "name": "ClickUp", "vendor": "ClickUp", "category": "project_management", "icon": "check-square", "auth_type": "oauth2", "capabilities": ["create_task", "sync_lists"]},
    {"slug": "asana", "name": "Asana", "vendor": "Asana", "category": "project_management", "icon": "list-todo", "auth_type": "oauth2", "capabilities": ["create_task", "sync_projects"]},
    {"slug": "linear", "name": "Linear", "vendor": "Linear", "category": "project_management", "icon": "zap", "auth_type": "oauth2", "is_developer": True, "capabilities": ["create_issue", "sync_cycles"]},
    {"slug": "webhook", "name": "Custom Webhook", "vendor": "Nexora", "category": "automation", "icon": "webhook", "auth_type": "webhook", "is_developer": True, "capabilities": ["send_event", "receive_event"]},
    {"slug": "rest-api", "name": "REST API", "vendor": "Nexora", "category": "developer", "icon": "code", "auth_type": "api_key", "is_developer": True, "capabilities": ["read", "write"]},
    {"slug": "graphql", "name": "GraphQL API", "vendor": "Nexora", "category": "developer", "icon": "braces", "auth_type": "api_key", "is_developer": True, "capabilities": ["query", "mutate"]},
]

_oauth_states: dict[str, dict[str, Any]] = {}


class IntegrationService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def _log(
        self,
        ctx: TenantContext,
        action: str,
        title: str,
        entity_id: uuid.UUID | None = None,
        **meta: Any,
    ) -> None:
        ActivityLogger(self.db).log(
            tenant_id=ctx.tenant.id,
            actor_id=ctx.membership.user_id,
            entity_type="integration",
            entity_id=entity_id or ctx.tenant.id,
            action=action,
            title=title,
            description=title,
            metadata=meta,
        )

    def ensure_marketplace_catalog(self) -> None:
        for app_data in SYSTEM_APPS:
            exists = self.db.scalar(select(MarketplaceApp).where(MarketplaceApp.slug == app_data["slug"]))
            if exists is None:
                self.db.add(MarketplaceApp(is_system=True, install_count=app_data.get("install_count", 0), **app_data))
        self.db.commit()

    def _installed_slugs(self, tenant_id: uuid.UUID) -> set[str]:
        rows = self.db.execute(
            select(MarketplaceApp.slug)
            .join(Integration, Integration.marketplace_app_id == MarketplaceApp.id)
            .where(Integration.tenant_id == tenant_id)
        ).all()
        return {r[0] for r in rows}

    def _to_app_summary(self, app: MarketplaceApp, installed: set[str]) -> MarketplaceAppSummary:
        return MarketplaceAppSummary(
            id=app.id,
            slug=app.slug,
            name=app.name,
            vendor=app.vendor,
            category=app.category,
            description=app.description,
            icon=app.icon,
            auth_type=app.auth_type,
            is_popular=app.is_popular,
            is_recommended=app.is_recommended,
            is_developer=app.is_developer,
            capabilities=app.capabilities or [],
            install_count=app.install_count,
            is_installed=app.slug in installed,
        )

    def _to_integration_summary(self, integration: Integration) -> IntegrationSummary:
        app = integration.marketplace_app
        return IntegrationSummary(
            id=integration.id,
            status=integration.status,
            health=integration.health,
            sync_mode=integration.sync_mode,
            auto_sync=integration.auto_sync,
            last_sync_at=integration.last_sync_at,
            connected_at=integration.connected_at,
            last_error=integration.last_error,
            app_slug=app.slug,
            app_name=app.name,
            app_icon=app.icon,
            app_category=app.category,
        )

    def list_marketplace(
        self,
        ctx: TenantContext,
        *,
        category: str | None = None,
        search: str | None = None,
        popular: bool = False,
        recommended: bool = False,
        developer: bool = False,
    ) -> MarketplaceListResponse:
        self.ensure_marketplace_catalog()
        q = select(MarketplaceApp).order_by(MarketplaceApp.install_count.desc(), MarketplaceApp.name)
        if category:
            q = q.where(MarketplaceApp.category == category)
        if popular:
            q = q.where(MarketplaceApp.is_popular.is_(True))
        if recommended:
            q = q.where(MarketplaceApp.is_recommended.is_(True))
        if developer:
            q = q.where(MarketplaceApp.is_developer.is_(True))
        if search:
            term = f"%{search.lower()}%"
            q = q.where(
                or_(
                    func.lower(MarketplaceApp.name).like(term),
                    func.lower(MarketplaceApp.description).like(term),
                    func.lower(MarketplaceApp.vendor).like(term),
                )
            )
        apps = self.db.scalars(q).all()
        installed = self._installed_slugs(ctx.tenant.id)
        categories = sorted({a.category for a in self.db.scalars(select(MarketplaceApp)).all()})
        return MarketplaceListResponse(
            apps=[self._to_app_summary(a, installed) for a in apps],
            categories=categories,
            total=len(apps),
        )

    def list_installed(self, ctx: TenantContext) -> list[IntegrationSummary]:
        integrations = self.db.scalars(
            select(Integration)
            .options(joinedload(Integration.marketplace_app))
            .where(Integration.tenant_id == ctx.tenant.id)
            .order_by(Integration.updated_at.desc())
        ).all()
        return [self._to_integration_summary(i) for i in integrations]

    def get_integration(self, ctx: TenantContext, integration_id: uuid.UUID) -> IntegrationDetail:
        integration = self._get_integration(ctx, integration_id)
        account = integration.accounts[0] if integration.accounts else None
        summary = self._to_integration_summary(integration)
        return IntegrationDetail(
            **summary.model_dump(),
            settings=integration.settings,
            permissions=integration.permissions or [],
            sync_interval_minutes=integration.sync_interval_minutes,
            marketplace_app_id=integration.marketplace_app_id,
            account_label=account.label if account else None,
            auth_type=account.auth_type if account else integration.marketplace_app.auth_type,
        )

    def install(self, ctx: TenantContext, app_slug: str) -> IntegrationDetail:
        self.ensure_marketplace_catalog()
        app = self.db.scalar(select(MarketplaceApp).where(MarketplaceApp.slug == app_slug))
        if app is None:
            raise HTTPException(status_code=404, detail="App not found in marketplace")
        existing = self.db.scalar(
            select(Integration).where(
                Integration.tenant_id == ctx.tenant.id,
                Integration.marketplace_app_id == app.id,
            )
        )
        if existing:
            return self.get_integration(ctx, existing.id)
        integration = Integration(
            tenant_id=ctx.tenant.id,
            marketplace_app_id=app.id,
            installed_by_id=ctx.membership.user_id,
            status="installed",
            permissions=app.capabilities or [],
        )
        self.db.add(integration)
        app.install_count = (app.install_count or 0) + 1
        self._log(ctx, "integration_installed", f"Installed {app.name}", integration.id, app_slug=app_slug)
        self.db.commit()
        return self.get_integration(ctx, integration.id)

    def connect(
        self, ctx: TenantContext, integration_id: uuid.UUID, payload: IntegrationConnectRequest
    ) -> IntegrationDetail:
        integration = self._get_integration(ctx, integration_id)
        app = integration.marketplace_app
        auth_type = app.auth_type

        if auth_type == "api_key" and not payload.api_key:
            raise HTTPException(status_code=400, detail="API key is required for this integration")

        for acct in list(integration.accounts):
            self.db.delete(acct)

        account = IntegrationAccount(
            integration_id=integration.id,
            tenant_id=ctx.tenant.id,
            label=payload.label,
            auth_type=auth_type,
            external_account_id=f"{app.slug}-{ctx.tenant.slug}",
        )

        if auth_type == "api_key" and payload.api_key:
            creds = {"api_key": payload.api_key}
            if payload.api_secret:
                creds["api_secret"] = payload.api_secret
            account.credentials_encrypted = encrypt_secret(json.dumps(creds))
        elif auth_type == "oauth2":
            token_value = payload.oauth_code or secrets.token_urlsafe(32)
            account.external_account_id = f"{app.slug}-account"
            self.db.add(account)
            self.db.flush()
            oauth = OAuthToken(
                account_id=account.id,
                tenant_id=ctx.tenant.id,
                access_token_encrypted=encrypt_secret(token_value),
                refresh_token_encrypted=encrypt_secret(secrets.token_urlsafe(32)),
                scope=" ".join(app.capabilities or []),
                expires_at=utcnow() + timedelta(days=90),
            )
            self.db.add(oauth)
        else:
            self.db.add(account)

        if auth_type != "oauth2":
            self.db.add(account)

        if payload.settings:
            integration.settings = {**integration.settings, **payload.settings}

        integration.status = "connected"
        integration.health = "healthy"
        integration.connected_at = utcnow()
        integration.last_error = None

        notify_user(
            self.db,
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            actor_id=ctx.membership.user_id,
            type="integration_connected",
            title=f"{app.name} connected",
            message=f"{app.name} has been successfully connected.",
            entity_type="integration",
            entity_id=integration.id,
        )
        self._log(ctx, "integration_connected", f"Connected {app.name}", integration.id)
        self.db.commit()
        return self.get_integration(ctx, integration.id)

    def disconnect(self, ctx: TenantContext, integration_id: uuid.UUID) -> IntegrationDetail:
        integration = self._get_integration(ctx, integration_id)
        for acct in list(integration.accounts):
            self.db.delete(acct)
        integration.status = "disconnected"
        integration.health = "unknown"
        integration.connected_at = None
        self._log(ctx, "integration_disconnected", f"Disconnected {integration.marketplace_app.name}", integration.id)
        self.db.commit()
        return self.get_integration(ctx, integration.id)

    def reconnect(self, ctx: TenantContext, integration_id: uuid.UUID) -> IntegrationDetail:
        integration = self._get_integration(ctx, integration_id)
        if not integration.accounts:
            raise HTTPException(status_code=400, detail="No account to reconnect. Connect first.")
        integration.status = "connected"
        integration.health = "healthy"
        integration.connected_at = utcnow()
        integration.last_error = None
        self._log(ctx, "integration_reconnected", f"Reconnected {integration.marketplace_app.name}", integration.id)
        self.db.commit()
        return self.get_integration(ctx, integration.id)

    def update_settings(
        self, ctx: TenantContext, integration_id: uuid.UUID, payload: IntegrationSettingsUpdate
    ) -> IntegrationDetail:
        integration = self._get_integration(ctx, integration_id)
        if payload.auto_sync is not None:
            integration.auto_sync = payload.auto_sync
        if payload.sync_mode is not None:
            integration.sync_mode = payload.sync_mode
        if payload.sync_interval_minutes is not None:
            integration.sync_interval_minutes = payload.sync_interval_minutes
        if payload.settings is not None:
            integration.settings = payload.settings
        if payload.permissions is not None:
            integration.permissions = payload.permissions
        self.db.commit()
        return self.get_integration(ctx, integration.id)

    def sync_now(self, ctx: TenantContext, integration_id: uuid.UUID) -> SyncHistoryResponse:
        integration = self._get_integration(ctx, integration_id)
        if integration.status not in ("connected", "syncing"):
            raise HTTPException(status_code=400, detail="Integration must be connected to sync")

        integration.status = "syncing"
        history = SyncHistory(
            integration_id=integration.id,
            tenant_id=ctx.tenant.id,
            sync_mode="manual",
            status="running",
            started_at=utcnow(),
        )
        self.db.add(history)
        self.db.flush()

        try:
            records = self._simulate_sync(integration)
            history.status = "completed"
            history.records_processed = records
            history.completed_at = utcnow()
            integration.status = "connected"
            integration.health = "healthy"
            integration.last_sync_at = utcnow()
            integration.last_error = None
            notify_user(
                self.db,
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                actor_id=ctx.membership.user_id,
                type="sync_completed",
                title="Sync completed",
                message=f"{integration.marketplace_app.name} synced {records} records.",
                entity_type="integration",
                entity_id=integration.id,
            )
            self._log(ctx, "integration_synced", f"Synced {integration.marketplace_app.name}", integration.id)
        except Exception as exc:
            history.status = "failed"
            history.error_message = str(exc)
            history.completed_at = utcnow()
            integration.status = "error"
            integration.health = "unhealthy"
            integration.last_error = str(exc)
            notify_user(
                self.db,
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                actor_id=ctx.membership.user_id,
                type="sync_failed",
                title="Sync failed",
                message=f"{integration.marketplace_app.name}: {exc}",
                entity_type="integration",
                entity_id=integration.id,
            )
            logger.exception("Sync failed for integration %s", integration_id)

        self.db.commit()
        self.db.refresh(history)
        return SyncHistoryResponse.model_validate(history)

    def _simulate_sync(self, integration: Integration) -> int:
        time.sleep(0.05)
        slug = integration.marketplace_app.slug
        base = {"google": 42, "slack": 18, "stripe": 7, "github": 25}.get(slug.split("-")[0], 12)
        return base + len(integration.permissions or [])

    def get_health(self, ctx: TenantContext, integration_id: uuid.UUID) -> IntegrationHealthResponse:
        integration = self._get_integration(ctx, integration_id)
        checks = [
            {"name": "connection", "status": "pass" if integration.status == "connected" else "fail"},
            {"name": "credentials", "status": "pass" if integration.accounts else "fail"},
            {"name": "last_sync", "status": "pass" if integration.last_sync_at else "warn"},
        ]
        return IntegrationHealthResponse(
            integration_id=integration.id,
            health=integration.health,
            status=integration.status,
            last_sync_at=integration.last_sync_at,
            last_error=integration.last_error,
            latency_ms=45 if integration.health == "healthy" else None,
            checks=checks,
        )

    def list_sync_history(self, ctx: TenantContext, integration_id: uuid.UUID) -> list[SyncHistoryResponse]:
        self._get_integration(ctx, integration_id)
        rows = self.db.scalars(
            select(SyncHistory)
            .where(SyncHistory.integration_id == integration_id, SyncHistory.tenant_id == ctx.tenant.id)
            .order_by(SyncHistory.created_at.desc())
            .limit(50)
        ).all()
        return [SyncHistoryResponse.model_validate(r) for r in rows]

    def get_oauth_url(self, ctx: TenantContext, integration_id: uuid.UUID) -> OAuthAuthorizeResponse:
        integration = self._get_integration(ctx, integration_id)
        app = integration.marketplace_app
        state = secrets.token_urlsafe(24)
        _oauth_states[state] = {
            "integration_id": str(integration.id),
            "tenant_id": str(ctx.tenant.id),
            "user_id": str(ctx.membership.user_id),
        }
        base = self.settings.FRONTEND_URL.rstrip("/")
        redirect_uri = f"{base}/{ctx.tenant.slug}/integrations/oauth/callback"
        params = urlencode({
            "client_id": f"nexora-{app.slug}",
            "redirect_uri": redirect_uri,
            "state": state,
            "response_type": "code",
            "scope": " ".join(app.capabilities or ["read"]),
        })
        authorize_url = f"{base}/{ctx.tenant.slug}/integrations/oauth/callback?{params}&demo=1"
        return OAuthAuthorizeResponse(authorize_url=authorize_url, state=state)

    def oauth_callback(self, ctx: TenantContext, state: str, code: str) -> IntegrationDetail:
        meta = _oauth_states.pop(state, None)
        if meta is None:
            raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
        if str(ctx.tenant.id) != meta["tenant_id"]:
            raise HTTPException(status_code=403, detail="OAuth state tenant mismatch")
        integration_id = uuid.UUID(meta["integration_id"])
        return self.connect(
            ctx,
            integration_id,
            IntegrationConnectRequest(oauth_code=code or "demo_oauth_token"),
        )

    def get_dashboard(self, ctx: TenantContext) -> IntegrationDashboardResponse:
        integrations = self.db.scalars(
            select(Integration)
            .options(joinedload(Integration.marketplace_app))
            .where(Integration.tenant_id == ctx.tenant.id)
        ).all()
        webhook_count = self.db.scalar(
            select(func.count()).select_from(Webhook).where(Webhook.tenant_id == ctx.tenant.id)
        ) or 0
        api_key_count = self.db.scalar(
            select(func.count()).select_from(ApiKey).where(
                ApiKey.tenant_id == ctx.tenant.id, ApiKey.status == "active"
            )
        ) or 0
        total_api_calls = self.db.scalar(
            select(func.coalesce(func.sum(ApiKey.usage_count), 0)).where(ApiKey.tenant_id == ctx.tenant.id)
        ) or 0
        recent_syncs = self.db.scalars(
            select(SyncHistory)
            .where(SyncHistory.tenant_id == ctx.tenant.id)
            .order_by(SyncHistory.created_at.desc())
            .limit(8)
        ).all()
        recent_logs = self.db.scalars(
            select(WebhookLog)
            .where(WebhookLog.tenant_id == ctx.tenant.id)
            .order_by(WebhookLog.created_at.desc())
            .limit(8)
        ).all()
        return IntegrationDashboardResponse(
            installed_count=len(integrations),
            connected_count=sum(1 for i in integrations if i.status == "connected"),
            healthy_count=sum(1 for i in integrations if i.health == "healthy"),
            error_count=sum(1 for i in integrations if i.status == "error"),
            webhook_count=webhook_count,
            api_key_count=api_key_count,
            total_api_calls=int(total_api_calls),
            recent_syncs=[SyncHistoryResponse.model_validate(s) for s in recent_syncs],
            recent_webhook_logs=[WebhookLogResponse.model_validate(l) for l in recent_logs],
            installed_apps=[self._to_integration_summary(i) for i in integrations[:12]],
        )

    # --- Webhooks ---

    def list_webhooks(self, ctx: TenantContext) -> list[WebhookResponse]:
        hooks = self.db.scalars(
            select(Webhook).where(Webhook.tenant_id == ctx.tenant.id).order_by(Webhook.created_at.desc())
        ).all()
        return [WebhookResponse.model_validate(h) for h in hooks]

    def create_webhook(self, ctx: TenantContext, payload: WebhookCreate) -> WebhookResponse:
        hook = Webhook(
            tenant_id=ctx.tenant.id,
            integration_id=payload.integration_id,
            created_by_id=ctx.membership.user_id,
            name=payload.name,
            url=payload.url,
            events=payload.events,
            retry_count=payload.retry_count,
            secret_hash=hash_token(secrets.token_urlsafe(24)),
        )
        self.db.add(hook)
        self._log(ctx, "webhook_created", f"Webhook created: {hook.name}", hook.id)
        self.db.commit()
        self.db.refresh(hook)
        return WebhookResponse.model_validate(hook)

    def update_webhook(
        self, ctx: TenantContext, webhook_id: uuid.UUID, payload: WebhookUpdate
    ) -> WebhookResponse:
        hook = self._get_webhook(ctx, webhook_id)
        for field in ("name", "url", "events", "status", "retry_count"):
            val = getattr(payload, field)
            if val is not None:
                setattr(hook, field, val)
        self.db.commit()
        return WebhookResponse.model_validate(hook)

    def delete_webhook(self, ctx: TenantContext, webhook_id: uuid.UUID) -> None:
        hook = self._get_webhook(ctx, webhook_id)
        self.db.delete(hook)
        self.db.commit()

    def test_webhook(self, ctx: TenantContext, webhook_id: uuid.UUID) -> WebhookLogResponse:
        return self._deliver_webhook(ctx, self._get_webhook(ctx, webhook_id), "test.ping", {"test": True})

    def list_webhook_logs(self, ctx: TenantContext, webhook_id: uuid.UUID) -> list[WebhookLogResponse]:
        self._get_webhook(ctx, webhook_id)
        logs = self.db.scalars(
            select(WebhookLog)
            .where(WebhookLog.webhook_id == webhook_id)
            .order_by(WebhookLog.created_at.desc())
            .limit(100)
        ).all()
        return [WebhookLogResponse.model_validate(l) for l in logs]

    def _deliver_webhook(
        self, ctx: TenantContext, hook: Webhook, event_type: str, payload: dict[str, Any]
    ) -> WebhookLogResponse:
        start = time.perf_counter()
        log = WebhookLog(
            webhook_id=hook.id,
            tenant_id=ctx.tenant.id,
            event_type=event_type,
            request_payload=payload,
            attempt=1,
        )
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(
                    hook.url,
                    json={"event": event_type, "tenant_id": str(ctx.tenant.id), "data": payload},
                )
            log.status_code = response.status_code
            log.response_body = response.text[:2000]
            log.status = "success" if response.status_code < 400 else "failed"
            if log.status == "failed":
                log.error_message = f"HTTP {response.status_code}"
        except Exception as exc:
            log.status = "failed"
            log.error_message = str(exc)
            notify_user(
                self.db,
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                actor_id=ctx.membership.user_id,
                type="webhook_failed",
                title="Webhook delivery failed",
                message=f"{hook.name}: {exc}",
                entity_type="integration",
                entity_id=hook.id,
            )
        log.duration_ms = int((time.perf_counter() - start) * 1000)
        hook.last_triggered_at = utcnow()
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return WebhookLogResponse.model_validate(log)

    def dispatch_event(self, ctx: TenantContext, event_type: str, payload: dict[str, Any]) -> int:
        hooks = self.db.scalars(
            select(Webhook).where(
                Webhook.tenant_id == ctx.tenant.id,
                Webhook.status == "active",
            )
        ).all()
        delivered = 0
        for hook in hooks:
            events = hook.events or ["*"]
            if "*" not in events and event_type not in events:
                continue
            self._deliver_webhook(ctx, hook, event_type, payload)
            delivered += 1
        return delivered

    # --- API Keys ---

    def list_api_keys(self, ctx: TenantContext) -> list[ApiKeyResponse]:
        keys = self.db.scalars(
            select(ApiKey).where(ApiKey.tenant_id == ctx.tenant.id).order_by(ApiKey.created_at.desc())
        ).all()
        return [ApiKeyResponse.model_validate(k) for k in keys]

    def create_api_key(self, ctx: TenantContext, payload: ApiKeyCreate) -> ApiKeyCreatedResponse:
        plain = f"nx_{secrets.token_urlsafe(32)}"
        prefix = plain[:12]
        key = ApiKey(
            tenant_id=ctx.tenant.id,
            created_by_id=ctx.membership.user_id,
            name=payload.name,
            key_prefix=prefix,
            key_hash=hash_token(plain),
            scopes=payload.scopes,
            rate_limit_per_hour=payload.rate_limit_per_hour,
            expires_at=utcnow() + timedelta(days=payload.expires_in_days or 365),
        )
        self.db.add(key)
        self._log(ctx, "api_key_created", f"API key created: {key.name}", key.id)
        self.db.commit()
        self.db.refresh(key)
        return ApiKeyCreatedResponse(**ApiKeyResponse.model_validate(key).model_dump(), api_key=plain)

    def rotate_api_key(self, ctx: TenantContext, key_id: uuid.UUID) -> ApiKeyCreatedResponse:
        old = self._get_api_key(ctx, key_id)
        old.status = "revoked"
        return self.create_api_key(
            ctx,
            ApiKeyCreate(name=f"{old.name} (rotated)", scopes=old.scopes, rate_limit_per_hour=old.rate_limit_per_hour),
        )

    def revoke_api_key(self, ctx: TenantContext, key_id: uuid.UUID) -> None:
        key = self._get_api_key(ctx, key_id)
        key.status = "revoked"
        self._log(ctx, "api_key_revoked", f"API key revoked: {key.name}", key.id)
        self.db.commit()

    def run_integration_action(
        self,
        tenant_id: uuid.UUID,
        app_slug: str,
        action: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        """Called from workflow engine for integration automation steps."""
        integration = self.db.scalar(
            select(Integration)
            .join(MarketplaceApp)
            .options(joinedload(Integration.marketplace_app))
            .where(Integration.tenant_id == tenant_id, MarketplaceApp.slug == app_slug, Integration.status == "connected")
        )
        if integration is None:
            return {"ok": False, "error": f"Integration {app_slug} not connected"}
        result = {
            "ok": True,
            "app": app_slug,
            "action": action,
            "message": f"{action} executed via {integration.marketplace_app.name}",
            "payload": payload,
        }
        if app_slug == "slack" and action == "send_message":
            result["channel"] = payload.get("channel", "#sales")
            result["text"] = payload.get("message", payload.get("text", ""))
        elif app_slug == "gmail" and action == "send_email":
            result["to"] = payload.get("to")
            result["subject"] = payload.get("subject")
        elif app_slug == "zoom" and action == "create_meeting":
            result["meeting_url"] = f"https://zoom.us/j/{secrets.token_hex(4)}"
        return result

    def _get_integration(self, ctx: TenantContext, integration_id: uuid.UUID) -> Integration:
        integration = self.db.scalar(
            select(Integration)
            .options(joinedload(Integration.marketplace_app), joinedload(Integration.accounts))
            .where(Integration.id == integration_id, Integration.tenant_id == ctx.tenant.id)
        )
        if integration is None:
            raise HTTPException(status_code=404, detail="Integration not found")
        return integration

    def _get_webhook(self, ctx: TenantContext, webhook_id: uuid.UUID) -> Webhook:
        hook = self.db.get(Webhook, webhook_id)
        if hook is None or hook.tenant_id != ctx.tenant.id:
            raise HTTPException(status_code=404, detail="Webhook not found")
        return hook

    def _get_api_key(self, ctx: TenantContext, key_id: uuid.UUID) -> ApiKey:
        key = self.db.get(ApiKey, key_id)
        if key is None or key.tenant_id != ctx.tenant.id:
            raise HTTPException(status_code=404, detail="API key not found")
        return key
