from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.integration import (
    ApiKeyCreate,
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    IntegrationConnectRequest,
    IntegrationDashboardResponse,
    IntegrationDetail,
    IntegrationHealthResponse,
    IntegrationInstallRequest,
    IntegrationSettingsUpdate,
    IntegrationSummary,
    MarketplaceListResponse,
    OAuthAuthorizeResponse,
    SyncHistoryResponse,
    WebhookCreate,
    WebhookLogResponse,
    WebhookResponse,
    WebhookUpdate,
)
from app.services.integration_service import IntegrationService

router = APIRouter(prefix="/tenants/{slug}/integrations", tags=["integrations"])


@router.get("/dashboard", response_model=IntegrationDashboardResponse)
def get_integration_dashboard(
    ctx: TenantContext = Depends(require_permission("integration:read")),
    db: Session = Depends(get_db),
) -> IntegrationDashboardResponse:
    return IntegrationService(db).get_dashboard(ctx)


@router.get("/marketplace", response_model=MarketplaceListResponse)
def list_marketplace(
    category: str | None = None,
    search: str | None = None,
    popular: bool = False,
    recommended: bool = False,
    developer: bool = False,
    ctx: TenantContext = Depends(require_permission("integration:read")),
    db: Session = Depends(get_db),
) -> MarketplaceListResponse:
    return IntegrationService(db).list_marketplace(
        ctx,
        category=category,
        search=search,
        popular=popular,
        recommended=recommended,
        developer=developer,
    )


@router.get("/installed", response_model=list[IntegrationSummary])
def list_installed_integrations(
    ctx: TenantContext = Depends(require_permission("integration:read")),
    db: Session = Depends(get_db),
) -> list[IntegrationSummary]:
    return IntegrationService(db).list_installed(ctx)


@router.post("/install", response_model=IntegrationDetail, status_code=status.HTTP_201_CREATED)
def install_integration(
    payload: IntegrationInstallRequest,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> IntegrationDetail:
    return IntegrationService(db).install(ctx, payload.app_slug)


@router.post("/oauth/callback", response_model=IntegrationDetail)
def oauth_callback(
    state: str = Query(...),
    code: str = Query(default="demo"),
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> IntegrationDetail:
    return IntegrationService(db).oauth_callback(ctx, state, code)


# --- Webhooks (before /{integration_id}) ---

@router.get("/webhooks", response_model=list[WebhookResponse])
def list_webhooks(
    ctx: TenantContext = Depends(require_permission("integration:read")),
    db: Session = Depends(get_db),
) -> list[WebhookResponse]:
    return IntegrationService(db).list_webhooks(ctx)


@router.post("/webhooks", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
def create_webhook(
    payload: WebhookCreate,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> WebhookResponse:
    return IntegrationService(db).create_webhook(ctx, payload)


@router.patch("/webhooks/{webhook_id}", response_model=WebhookResponse)
def update_webhook(
    webhook_id: UUID,
    payload: WebhookUpdate,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> WebhookResponse:
    return IntegrationService(db).update_webhook(ctx, webhook_id, payload)


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook(
    webhook_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> None:
    IntegrationService(db).delete_webhook(ctx, webhook_id)


@router.post("/webhooks/{webhook_id}/test", response_model=WebhookLogResponse)
def test_webhook(
    webhook_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> WebhookLogResponse:
    return IntegrationService(db).test_webhook(ctx, webhook_id)


@router.get("/webhooks/{webhook_id}/logs", response_model=list[WebhookLogResponse])
def list_webhook_logs(
    webhook_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:read")),
    db: Session = Depends(get_db),
) -> list[WebhookLogResponse]:
    return IntegrationService(db).list_webhook_logs(ctx, webhook_id)


# --- API Keys ---

@router.get("/api-keys", response_model=list[ApiKeyResponse])
def list_api_keys(
    ctx: TenantContext = Depends(require_permission("integration:read")),
    db: Session = Depends(get_db),
) -> list[ApiKeyResponse]:
    return IntegrationService(db).list_api_keys(ctx)


@router.post("/api-keys", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_api_key(
    payload: ApiKeyCreate,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> ApiKeyCreatedResponse:
    return IntegrationService(db).create_api_key(ctx, payload)


@router.post("/api-keys/{key_id}/rotate", response_model=ApiKeyCreatedResponse)
def rotate_api_key(
    key_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> ApiKeyCreatedResponse:
    return IntegrationService(db).rotate_api_key(ctx, key_id)


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_key(
    key_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> None:
    IntegrationService(db).revoke_api_key(ctx, key_id)


# --- Per-integration routes ---

@router.get("/{integration_id}", response_model=IntegrationDetail)
def get_integration(
    integration_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:read")),
    db: Session = Depends(get_db),
) -> IntegrationDetail:
    return IntegrationService(db).get_integration(ctx, integration_id)


@router.post("/{integration_id}/connect", response_model=IntegrationDetail)
def connect_integration(
    integration_id: UUID,
    payload: IntegrationConnectRequest,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> IntegrationDetail:
    return IntegrationService(db).connect(ctx, integration_id, payload)


@router.post("/{integration_id}/disconnect", response_model=IntegrationDetail)
def disconnect_integration(
    integration_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> IntegrationDetail:
    return IntegrationService(db).disconnect(ctx, integration_id)


@router.post("/{integration_id}/reconnect", response_model=IntegrationDetail)
def reconnect_integration(
    integration_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> IntegrationDetail:
    return IntegrationService(db).reconnect(ctx, integration_id)


@router.patch("/{integration_id}/settings", response_model=IntegrationDetail)
def update_integration_settings(
    integration_id: UUID,
    payload: IntegrationSettingsUpdate,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> IntegrationDetail:
    return IntegrationService(db).update_settings(ctx, integration_id, payload)


@router.post("/{integration_id}/sync", response_model=SyncHistoryResponse)
def sync_integration(
    integration_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> SyncHistoryResponse:
    return IntegrationService(db).sync_now(ctx, integration_id)


@router.get("/{integration_id}/health", response_model=IntegrationHealthResponse)
def get_integration_health(
    integration_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:read")),
    db: Session = Depends(get_db),
) -> IntegrationHealthResponse:
    return IntegrationService(db).get_health(ctx, integration_id)


@router.get("/{integration_id}/sync-history", response_model=list[SyncHistoryResponse])
def list_sync_history(
    integration_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:read")),
    db: Session = Depends(get_db),
) -> list[SyncHistoryResponse]:
    return IntegrationService(db).list_sync_history(ctx, integration_id)


@router.get("/{integration_id}/oauth/authorize", response_model=OAuthAuthorizeResponse)
def oauth_authorize(
    integration_id: UUID,
    ctx: TenantContext = Depends(require_permission("integration:write")),
    db: Session = Depends(get_db),
) -> OAuthAuthorizeResponse:
    return IntegrationService(db).get_oauth_url(ctx, integration_id)
