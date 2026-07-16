"""Developer Platform & Plugin SDK API (Phase 18)."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.developer import (
    CliActionRequest,
    CliActionResponse,
    DeveloperDashboardResponse,
    DeveloperResponse,
    DeveloperUpsert,
    GraphQLRequest,
    GraphQLResponse,
    MarketplaceListResponse,
    MarketplaceReviewCreate,
    MarketplaceReviewResponse,
    PlatformWebhookCreate,
    PlatformWebhookLogResponse,
    PlatformWebhookResponse,
    PlatformWebhookUpdate,
    PluginDetail,
    PluginInstallRequest,
    PluginInstallationResponse,
    PluginLogResponse,
    PluginSettingsUpdate,
    RestExplorerRequest,
    RestExplorerResponse,
    SdkProjectCreate,
    SdkProjectResponse,
)
from app.services.developer_service import DeveloperPlatformService

router = APIRouter(prefix="/tenants/{slug}/developers", tags=["developers"])


@router.get("/dashboard", response_model=DeveloperDashboardResponse)
def get_dashboard(
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> DeveloperDashboardResponse:
    return DeveloperPlatformService(db).get_dashboard(ctx)


@router.get("/marketplace", response_model=MarketplaceListResponse)
def list_marketplace(
    category: str | None = None,
    plugin_type: str | None = None,
    search: str | None = None,
    featured: bool = False,
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> MarketplaceListResponse:
    return DeveloperPlatformService(db).list_marketplace(
        ctx, category=category, plugin_type=plugin_type, search=search, featured=featured
    )


@router.get("/plugins/installed", response_model=list[PluginInstallationResponse])
def list_installed(
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> list[PluginInstallationResponse]:
    return DeveloperPlatformService(db).list_installed(ctx)


@router.post("/plugins/install", response_model=PluginInstallationResponse, status_code=status.HTTP_201_CREATED)
def install_plugin(
    payload: PluginInstallRequest,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> PluginInstallationResponse:
    return DeveloperPlatformService(db).install_plugin(ctx, payload)


@router.get("/plugins/{plugin_id}", response_model=PluginDetail)
def get_plugin(
    plugin_id: UUID,
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> PluginDetail:
    return DeveloperPlatformService(db).get_plugin(ctx, plugin_id)


@router.post("/plugins/{plugin_id}/reviews", response_model=MarketplaceReviewResponse, status_code=status.HTTP_201_CREATED)
def add_review(
    plugin_id: UUID,
    payload: MarketplaceReviewCreate,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> MarketplaceReviewResponse:
    return DeveloperPlatformService(db).add_review(ctx, plugin_id, payload)


@router.delete("/installations/{installation_id}")
def uninstall_plugin(
    installation_id: UUID,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> dict:
    return DeveloperPlatformService(db).uninstall_plugin(ctx, installation_id)


@router.post("/installations/{installation_id}/enable", response_model=PluginInstallationResponse)
def enable_plugin(
    installation_id: UUID,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> PluginInstallationResponse:
    return DeveloperPlatformService(db).set_plugin_enabled(ctx, installation_id, True)


@router.post("/installations/{installation_id}/disable", response_model=PluginInstallationResponse)
def disable_plugin(
    installation_id: UUID,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> PluginInstallationResponse:
    return DeveloperPlatformService(db).set_plugin_enabled(ctx, installation_id, False)


@router.post("/installations/{installation_id}/update", response_model=PluginInstallationResponse)
def update_plugin(
    installation_id: UUID,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> PluginInstallationResponse:
    return DeveloperPlatformService(db).update_plugin_version(ctx, installation_id)


@router.patch("/installations/{installation_id}/settings", response_model=PluginInstallationResponse)
def update_settings(
    installation_id: UUID,
    payload: PluginSettingsUpdate,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> PluginInstallationResponse:
    return DeveloperPlatformService(db).update_plugin_settings(ctx, installation_id, payload)


@router.get("/logs", response_model=list[PluginLogResponse])
def list_logs(
    plugin_id: UUID | None = None,
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> list[PluginLogResponse]:
    return DeveloperPlatformService(db).list_plugin_logs(ctx, plugin_id)


@router.get("/profile", response_model=DeveloperResponse)
def get_profile(
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> DeveloperResponse:
    return DeveloperResponse.model_validate(DeveloperPlatformService(db).ensure_developer_profile(ctx))


@router.put("/profile", response_model=DeveloperResponse)
def upsert_profile(
    payload: DeveloperUpsert,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> DeveloperResponse:
    return DeveloperPlatformService(db).upsert_developer(ctx, payload)


@router.get("/sdk/projects", response_model=list[SdkProjectResponse])
def list_sdk_projects(
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> list[SdkProjectResponse]:
    return DeveloperPlatformService(db).list_sdk_projects(ctx)


@router.post("/sdk/projects", response_model=SdkProjectResponse, status_code=status.HTTP_201_CREATED)
def create_sdk_project(
    payload: SdkProjectCreate,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> SdkProjectResponse:
    return DeveloperPlatformService(db).create_sdk_project(ctx, payload)


@router.get("/webhooks", response_model=list[PlatformWebhookResponse])
def list_webhooks(
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> list[PlatformWebhookResponse]:
    return DeveloperPlatformService(db).list_webhooks(ctx)


@router.post("/webhooks", response_model=PlatformWebhookResponse, status_code=status.HTTP_201_CREATED)
def create_webhook(
    payload: PlatformWebhookCreate,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> PlatformWebhookResponse:
    return DeveloperPlatformService(db).create_webhook(ctx, payload)


@router.patch("/webhooks/{webhook_id}", response_model=PlatformWebhookResponse)
def update_webhook(
    webhook_id: UUID,
    payload: PlatformWebhookUpdate,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> PlatformWebhookResponse:
    return DeveloperPlatformService(db).update_webhook(ctx, webhook_id, payload)


@router.delete("/webhooks/{webhook_id}")
def delete_webhook(
    webhook_id: UUID,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> dict:
    return DeveloperPlatformService(db).delete_webhook(ctx, webhook_id)


@router.post("/webhooks/{webhook_id}/test", response_model=PlatformWebhookLogResponse)
def test_webhook(
    webhook_id: UUID,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> PlatformWebhookLogResponse:
    return DeveloperPlatformService(db).test_webhook(ctx, webhook_id)


@router.post("/webhook-logs/{log_id}/retry", response_model=PlatformWebhookLogResponse)
def retry_webhook_log(
    log_id: UUID,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> PlatformWebhookLogResponse:
    return DeveloperPlatformService(db).retry_webhook_log(ctx, log_id)


@router.get("/webhook-logs", response_model=list[PlatformWebhookLogResponse])
def list_webhook_logs(
    webhook_id: UUID | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> list[PlatformWebhookLogResponse]:
    return DeveloperPlatformService(db).list_webhook_logs(ctx, webhook_id)


@router.post("/api-explorer", response_model=RestExplorerResponse)
def api_explorer(
    payload: RestExplorerRequest,
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> RestExplorerResponse:
    return DeveloperPlatformService(db).rest_explorer(ctx, payload)


@router.get("/graphql/schema")
def graphql_schema(
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> dict:
    return DeveloperPlatformService(db).graphql_sdl()


@router.post("/graphql", response_model=GraphQLResponse)
def graphql_query(
    payload: GraphQLRequest,
    ctx: TenantContext = Depends(require_permission("developer:read")),
    db: Session = Depends(get_db),
) -> GraphQLResponse:
    return DeveloperPlatformService(db).graphql(ctx, payload)


@router.post("/cli", response_model=CliActionResponse)
def run_cli(
    payload: CliActionRequest,
    ctx: TenantContext = Depends(require_permission("developer:write")),
    db: Session = Depends(get_db),
) -> CliActionResponse:
    return DeveloperPlatformService(db).run_cli(ctx, payload)
