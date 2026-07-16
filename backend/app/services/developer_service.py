"""Developer Platform & Plugin SDK service (Phase 18)."""

from __future__ import annotations

import hashlib
import random
import re
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.deps import TenantContext
from app.models.developer import (
    PLUGIN_CATALOG,
    PLUGIN_CATEGORIES,
    PLUGIN_TYPES,
    ApiUsageEvent,
    Developer,
    MarketplaceReview,
    PlatformWebhook,
    PlatformWebhookLog,
    Plugin,
    PluginInstallation,
    PluginLog,
    PluginVersion,
    SdkProject,
)
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
    PluginSummary,
    PluginVersionResponse,
    RestExplorerRequest,
    RestExplorerResponse,
    SdkProjectCreate,
    SdkProjectResponse,
)
from app.services.activity_logger import ActivityLogger
from app.services.notification_hooks import notify_user

GRAPHQL_SDL = '''
"""Nexora CRM Public GraphQL Schema (Phase 18)"""
type Query {
  me: DeveloperProfile
  companies(limit: Int = 20): [Company!]!
  contacts(limit: Int = 20): [Contact!]!
  deals(limit: Int = 20): [Deal!]!
  leads(limit: Int = 20): [Lead!]!
  plugins(featured: Boolean): [Plugin!]!
  installedPlugins: [PluginInstallation!]!
}

type Mutation {
  installPlugin(slug: String!): PluginInstallation!
  enablePlugin(id: ID!): PluginInstallation!
  disablePlugin(id: ID!): PluginInstallation!
  createWebhook(name: String!, url: String!, events: [String!]): PlatformWebhook!
}

type Subscription {
  webhookDelivery(tenantId: ID!): WebhookEvent!
  pluginStatusChanged(tenantId: ID!): PluginInstallation!
}

type DeveloperProfile { id: ID! displayName: String! verified: Boolean! }
type Company { id: ID! name: String! }
type Contact { id: ID! fullName: String! email: String }
type Deal { id: ID! title: String! stage: String! value: Float }
type Lead { id: ID! title: String! status: String! }
type Plugin { id: ID! slug: String! name: String! pluginType: String! avgRating: Float! }
type PluginInstallation { id: ID! status: String! installedVersion: String! }
type PlatformWebhook { id: ID! name: String! url: String! status: String! }
type WebhookEvent { id: ID! eventType: String! status: String! }
'''

CLI_COMMANDS = [
    {"command": "nexora plugin create <name>", "description": "Scaffold a new plugin project"},
    {"command": "nexora widget generate <name>", "description": "Generate a dashboard widget package"},
    {"command": "nexora theme generate <name>", "description": "Generate a theme SDK package"},
    {"command": "nexora plugin validate", "description": "Validate plugin manifest and permissions"},
    {"command": "nexora plugin package", "description": "Package plugin for marketplace publish"},
    {"command": "nexora plugin publish", "description": "Publish plugin version to marketplace"},
    {"command": "nexora plugin deploy", "description": "Deploy plugin to tenant sandbox"},
]

DOCS_LINKS = [
    {"slug": "rest-api", "title": "REST API", "summary": "Authenticate and call CRM resources over HTTPS."},
    {"slug": "graphql", "title": "GraphQL API", "summary": "Schema explorer, queries, mutations, subscriptions."},
    {"slug": "plugins", "title": "Plugin SDK", "summary": "Build CRM modules, widgets, AI tools, and themes."},
    {"slug": "webhooks", "title": "Webhooks", "summary": "Receive signed event payloads with automatic retries."},
    {"slug": "cli", "title": "CLI", "summary": "Scaffold, validate, package, and publish plugins."},
    {"slug": "samples", "title": "Sample Projects", "summary": "Starter kits for widgets, connectors, and themes."},
]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def slugify(value: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return s[:80] or "project"


class DeveloperPlatformService:
    def __init__(self, db: Session):
        self.db = db

    # ── Catalog bootstrap ──────────────────────────────────────

    def ensure_catalog(self, ctx: TenantContext) -> Developer:
        developer = self.db.scalar(
            select(Developer).where(Developer.tenant_id == ctx.tenant.id, Developer.slug == "nexora-labs")
        )
        if not developer:
            developer = Developer(
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                slug="nexora-labs",
                display_name="Nexora Labs",
                email="developers@nexora.app",
                website="https://developers.nexora.app",
                bio="Official Nexora platform developer organization.",
                status="active",
                verified=True,
                api_calls_30d=0,
            )
            self.db.add(developer)
            self.db.flush()

        existing = {p.slug for p in self.db.scalars(select(Plugin)).all()}
        for spec in PLUGIN_CATALOG:
            if spec["slug"] in existing:
                continue
            plugin = Plugin(
                developer_id=developer.id,
                slug=spec["slug"],
                name=spec["name"],
                description=spec["description"],
                plugin_type=spec["type"],
                category=spec["category"],
                icon=spec["icon"],
                status="published",
                latest_version=spec["version"],
                permissions=spec["permissions"],
                dependencies=[],
                settings_schema={"enabled": {"type": "boolean", "default": True}},
                manifest={
                    "sdk": "nexora-plugin-sdk@1.0.0",
                    "entry": "dist/index.js",
                    "sandbox": True,
                },
                is_featured=bool(spec.get("featured")),
                is_official=True,
                install_count=random.randint(40, 1200),
                avg_rating=float(spec.get("rating", 4.5)),
                review_count=random.randint(5, 80),
            )
            self.db.add(plugin)
            self.db.flush()
            self.db.add(
                PluginVersion(
                    plugin_id=plugin.id,
                    version=spec["version"],
                    changelog=f"Initial marketplace release of {spec['name']}.",
                    package_url=f"nexora://plugins/{spec['slug']}/{spec['version']}.tgz",
                    checksum=hashlib.sha256(spec["slug"].encode()).hexdigest()[:32],
                    min_platform_version="18.0.0",
                    download_count=plugin.install_count,
                    manifest=plugin.manifest,
                )
            )
        self.db.commit()
        self.db.refresh(developer)
        return developer

    def ensure_developer_profile(self, ctx: TenantContext) -> Developer:
        self.ensure_catalog(ctx)
        profile = self.db.scalar(
            select(Developer).where(
                Developer.tenant_id == ctx.tenant.id,
                Developer.user_id == ctx.membership.user_id,
            )
        )
        if profile:
            return profile
        name = getattr(ctx.membership, "user", None)
        display = "Workspace Developer"
        email = None
        # membership may not have user loaded
        profile = Developer(
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            slug=f"dev-{str(ctx.membership.user_id)[:8]}",
            display_name=display,
            email=email,
            status="active",
            verified=False,
            api_calls_30d=0,
        )
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    # ── Dashboard ──────────────────────────────────────────────

    def get_dashboard(self, ctx: TenantContext) -> DeveloperDashboardResponse:
        developer = self.ensure_catalog(ctx)
        since = utcnow() - timedelta(hours=24)

        installs = self.db.scalars(
            select(PluginInstallation)
            .options(joinedload(PluginInstallation.plugin))
            .where(PluginInstallation.tenant_id == ctx.tenant.id)
            .order_by(desc(PluginInstallation.created_at))
            .limit(8)
        ).unique().all()

        webhook_count = self.db.scalar(
            select(func.count()).select_from(PlatformWebhook).where(PlatformWebhook.tenant_id == ctx.tenant.id)
        ) or 0
        webhook_fail = self.db.scalar(
            select(func.count())
            .select_from(PlatformWebhookLog)
            .where(
                PlatformWebhookLog.tenant_id == ctx.tenant.id,
                PlatformWebhookLog.status == "failed",
                PlatformWebhookLog.created_at >= since,
            )
        ) or 0
        api_calls = self.db.scalar(
            select(func.count())
            .select_from(ApiUsageEvent)
            .where(ApiUsageEvent.tenant_id == ctx.tenant.id, ApiUsageEvent.created_at >= since)
        ) or 0
        sdk_count = self.db.scalar(
            select(func.count()).select_from(SdkProject).where(SdkProject.tenant_id == ctx.tenant.id)
        ) or 0
        marketplace_count = self.db.scalar(
            select(func.count()).select_from(Plugin).where(Plugin.status == "published")
        ) or 0
        featured_count = self.db.scalar(
            select(func.count()).select_from(Plugin).where(Plugin.is_featured.is_(True))
        ) or 0

        featured = self.db.scalars(
            select(Plugin).where(Plugin.is_featured.is_(True), Plugin.status == "published").limit(6)
        ).all()
        installed_ids = {i.plugin_id for i in installs}
        install_map = {i.plugin_id: i.status for i in installs}

        recent_logs = self.db.scalars(
            select(PlatformWebhookLog)
            .where(PlatformWebhookLog.tenant_id == ctx.tenant.id)
            .order_by(desc(PlatformWebhookLog.created_at))
            .limit(8)
        ).all()

        usage_rows = self.db.execute(
            select(ApiUsageEvent.resource, func.count())
            .where(ApiUsageEvent.tenant_id == ctx.tenant.id, ApiUsageEvent.created_at >= since)
            .group_by(ApiUsageEvent.resource)
            .order_by(desc(func.count()))
            .limit(8)
        ).all()

        enabled = sum(1 for i in installs if i.status == "enabled")

        return DeveloperDashboardResponse(
            installed_plugins=len(installs),
            enabled_plugins=enabled,
            marketplace_plugins=marketplace_count,
            featured_plugins=featured_count,
            webhook_count=webhook_count,
            webhook_failures_24h=webhook_fail,
            api_calls_24h=api_calls,
            sdk_projects=sdk_count,
            developer=DeveloperResponse.model_validate(developer),
            recent_installs=[self._to_install(i) for i in installs],
            recent_webhook_logs=[PlatformWebhookLogResponse.model_validate(l) for l in recent_logs],
            featured=[
                self._to_plugin_summary(p, installed=p.id in installed_ids, install_status=install_map.get(p.id))
                for p in featured
            ],
            api_usage=[{"resource": r, "count": int(c)} for r, c in usage_rows],
            docs=DOCS_LINKS,
            cli_commands=CLI_COMMANDS,
            graphql_sdl=GRAPHQL_SDL.strip(),
        )

    # ── Marketplace / plugins ──────────────────────────────────

    def list_marketplace(
        self,
        ctx: TenantContext,
        *,
        category: str | None = None,
        plugin_type: str | None = None,
        search: str | None = None,
        featured: bool = False,
    ) -> MarketplaceListResponse:
        self.ensure_catalog(ctx)
        query = select(Plugin).where(Plugin.status == "published")
        if category:
            query = query.where(Plugin.category == category)
        if plugin_type:
            query = query.where(Plugin.plugin_type == plugin_type)
        if featured:
            query = query.where(Plugin.is_featured.is_(True))
        if search:
            like = f"%{search.strip()}%"
            query = query.where(
                or_(Plugin.name.ilike(like), Plugin.description.ilike(like), Plugin.slug.ilike(like))
            )

        plugins = self.db.scalars(query.order_by(desc(Plugin.is_featured), desc(Plugin.install_count))).all()
        installs = {
            i.plugin_id: i
            for i in self.db.scalars(
                select(PluginInstallation).where(PluginInstallation.tenant_id == ctx.tenant.id)
            ).all()
        }
        items = [
            self._to_plugin_summary(
                p,
                installed=p.id in installs,
                install_status=installs[p.id].status if p.id in installs else None,
            )
            for p in plugins
        ]
        return MarketplaceListResponse(
            items=items,
            total=len(items),
            categories=list(PLUGIN_CATEGORIES),
            types=list(PLUGIN_TYPES),
        )

    def get_plugin(self, ctx: TenantContext, plugin_id: uuid.UUID) -> PluginDetail:
        self.ensure_catalog(ctx)
        plugin = self.db.scalar(
            select(Plugin)
            .options(joinedload(Plugin.versions), joinedload(Plugin.reviews))
            .where(Plugin.id == plugin_id)
        )
        if not plugin:
            raise HTTPException(status_code=404, detail="Plugin not found")
        install = self.db.scalar(
            select(PluginInstallation).where(
                PluginInstallation.tenant_id == ctx.tenant.id,
                PluginInstallation.plugin_id == plugin.id,
            )
        )
        base = self._to_plugin_summary(
            plugin,
            installed=install is not None,
            install_status=install.status if install else None,
        )
        return PluginDetail(
            **base.model_dump(),
            dependencies=plugin.dependencies or [],
            settings_schema=plugin.settings_schema or {},
            manifest=plugin.manifest or {},
            versions=[PluginVersionResponse.model_validate(v) for v in plugin.versions],
            reviews=[MarketplaceReviewResponse.model_validate(r) for r in plugin.reviews[:20]],
        )

    def list_installed(self, ctx: TenantContext) -> list[PluginInstallationResponse]:
        self.ensure_catalog(ctx)
        rows = self.db.scalars(
            select(PluginInstallation)
            .options(joinedload(PluginInstallation.plugin))
            .where(PluginInstallation.tenant_id == ctx.tenant.id)
            .order_by(desc(PluginInstallation.created_at))
        ).unique().all()
        return [self._to_install(r) for r in rows]

    def install_plugin(self, ctx: TenantContext, payload: PluginInstallRequest) -> PluginInstallationResponse:
        self.ensure_catalog(ctx)
        plugin = self.db.scalar(select(Plugin).where(Plugin.slug == payload.plugin_slug))
        if not plugin:
            raise HTTPException(status_code=404, detail="Plugin not found")
        existing = self.db.scalar(
            select(PluginInstallation).where(
                PluginInstallation.tenant_id == ctx.tenant.id,
                PluginInstallation.plugin_id == plugin.id,
            )
        )
        if existing:
            raise HTTPException(status_code=400, detail="Plugin already installed")

        now = utcnow()
        install = PluginInstallation(
            tenant_id=ctx.tenant.id,
            plugin_id=plugin.id,
            installed_by_id=ctx.membership.user_id,
            installed_version=plugin.latest_version,
            status="enabled",
            settings=payload.settings or {"enabled": True},
            granted_permissions=list(plugin.permissions or []),
            enabled_at=now,
        )
        self.db.add(install)
        plugin.install_count = (plugin.install_count or 0) + 1
        self.db.add(
            PluginLog(
                tenant_id=ctx.tenant.id,
                plugin_id=plugin.id,
                level="info",
                event="installed",
                message=f"Installed {plugin.name} v{plugin.latest_version}",
                details={"permissions": plugin.permissions},
            )
        )
        ActivityLogger(self.db).log(
            tenant_id=ctx.tenant.id,
            actor_id=ctx.membership.user_id,
            entity_type="plugin",
            entity_id=plugin.id,
            action="plugin_installed",
            title=f"Installed plugin {plugin.name}",
            description=f"Version {plugin.latest_version}",
        )
        notify_user(
            self.db,
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            actor_id=ctx.membership.user_id,
            type="plugin_installed",
            title="Plugin installed",
            message=f"{plugin.name} is ready to use.",
        )
        self.db.commit()
        self.db.refresh(install)
        install = self.db.scalar(
            select(PluginInstallation)
            .options(joinedload(PluginInstallation.plugin))
            .where(PluginInstallation.id == install.id)
        )
        return self._to_install(install)

    def uninstall_plugin(self, ctx: TenantContext, installation_id: uuid.UUID) -> dict:
        install = self._get_install(ctx, installation_id)
        plugin = install.plugin
        self.db.add(
            PluginLog(
                tenant_id=ctx.tenant.id,
                plugin_id=install.plugin_id,
                installation_id=install.id,
                level="info",
                event="uninstalled",
                message=f"Uninstalled {plugin.name if plugin else 'plugin'}",
            )
        )
        ActivityLogger(self.db).log(
            tenant_id=ctx.tenant.id,
            actor_id=ctx.membership.user_id,
            entity_type="plugin",
            entity_id=install.plugin_id,
            action="plugin_uninstalled",
            title="Plugin uninstalled",
            description=plugin.name if plugin else str(install.plugin_id),
        )
        self.db.delete(install)
        self.db.commit()
        return {"ok": True}

    def set_plugin_enabled(self, ctx: TenantContext, installation_id: uuid.UUID, enabled: bool) -> PluginInstallationResponse:
        install = self._get_install(ctx, installation_id)
        install.status = "enabled" if enabled else "disabled"
        if enabled:
            install.enabled_at = utcnow()
            install.disabled_at = None
        else:
            install.disabled_at = utcnow()
        self.db.add(
            PluginLog(
                tenant_id=ctx.tenant.id,
                plugin_id=install.plugin_id,
                installation_id=install.id,
                level="info",
                event="enabled" if enabled else "disabled",
                message=f"Plugin {'enabled' if enabled else 'disabled'}",
            )
        )
        self.db.commit()
        self.db.refresh(install)
        return self._to_install(install)

    def update_plugin_settings(
        self, ctx: TenantContext, installation_id: uuid.UUID, payload: PluginSettingsUpdate
    ) -> PluginInstallationResponse:
        install = self._get_install(ctx, installation_id)
        install.settings = payload.settings
        self.db.commit()
        self.db.refresh(install)
        return self._to_install(install)

    def update_plugin_version(self, ctx: TenantContext, installation_id: uuid.UUID) -> PluginInstallationResponse:
        install = self._get_install(ctx, installation_id)
        plugin = install.plugin
        if not plugin:
            raise HTTPException(status_code=404, detail="Plugin missing")
        prev = install.installed_version
        install.installed_version = plugin.latest_version
        install.status = "enabled"
        self.db.add(
            PluginLog(
                tenant_id=ctx.tenant.id,
                plugin_id=plugin.id,
                installation_id=install.id,
                level="info",
                event="updated",
                message=f"Updated from {prev} to {plugin.latest_version}",
            )
        )
        notify_user(
            self.db,
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            actor_id=ctx.membership.user_id,
            type="plugin_updated",
            title="Plugin updated",
            message=f"{plugin.name} updated to {plugin.latest_version}.",
        )
        ActivityLogger(self.db).log(
            tenant_id=ctx.tenant.id,
            actor_id=ctx.membership.user_id,
            entity_type="plugin",
            entity_id=plugin.id,
            action="plugin_updated",
            title=f"Updated {plugin.name}",
            description=f"{prev} → {plugin.latest_version}",
        )
        self.db.commit()
        self.db.refresh(install)
        return self._to_install(install)

    def list_plugin_logs(self, ctx: TenantContext, plugin_id: uuid.UUID | None = None) -> list[PluginLogResponse]:
        query = select(PluginLog).where(PluginLog.tenant_id == ctx.tenant.id)
        if plugin_id:
            query = query.where(PluginLog.plugin_id == plugin_id)
        rows = self.db.scalars(query.order_by(desc(PluginLog.created_at)).limit(100)).all()
        return [PluginLogResponse.model_validate(r) for r in rows]

    def add_review(
        self, ctx: TenantContext, plugin_id: uuid.UUID, payload: MarketplaceReviewCreate
    ) -> MarketplaceReviewResponse:
        plugin = self.db.get(Plugin, plugin_id)
        if not plugin:
            raise HTTPException(status_code=404, detail="Plugin not found")
        installed = self.db.scalar(
            select(PluginInstallation).where(
                PluginInstallation.tenant_id == ctx.tenant.id,
                PluginInstallation.plugin_id == plugin_id,
            )
        )
        review = MarketplaceReview(
            tenant_id=ctx.tenant.id,
            plugin_id=plugin_id,
            user_id=ctx.membership.user_id,
            rating=payload.rating,
            title=payload.title,
            body=payload.body,
            is_verified_install=installed is not None,
        )
        self.db.add(review)
        # recompute rating
        stats = self.db.execute(
            select(func.avg(MarketplaceReview.rating), func.count())
            .where(MarketplaceReview.plugin_id == plugin_id)
        ).one()
        # include pending review after flush
        self.db.flush()
        stats = self.db.execute(
            select(func.avg(MarketplaceReview.rating), func.count()).where(MarketplaceReview.plugin_id == plugin_id)
        ).one()
        plugin.avg_rating = round(float(stats[0] or payload.rating), 2)
        plugin.review_count = int(stats[1] or 1)
        notify_user(
            self.db,
            tenant_id=ctx.tenant.id,
            user_id=ctx.membership.user_id,
            actor_id=ctx.membership.user_id,
            type="marketplace_review",
            title="Marketplace review submitted",
            message=f"Thanks for reviewing {plugin.name}.",
        )
        self.db.commit()
        self.db.refresh(review)
        return MarketplaceReviewResponse.model_validate(review)

    # ── Developers / SDK ───────────────────────────────────────

    def upsert_developer(self, ctx: TenantContext, payload: DeveloperUpsert) -> DeveloperResponse:
        self.ensure_catalog(ctx)
        profile = self.db.scalar(
            select(Developer).where(
                Developer.tenant_id == ctx.tenant.id,
                Developer.user_id == ctx.membership.user_id,
            )
        )
        if not profile:
            profile = Developer(
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                slug=slugify(payload.display_name)[:60] + "-" + secrets.token_hex(2),
                display_name=payload.display_name,
                status="active",
                verified=False,
                api_calls_30d=0,
            )
            self.db.add(profile)
        profile.display_name = payload.display_name
        profile.email = payload.email
        profile.website = payload.website
        profile.bio = payload.bio
        self.db.commit()
        self.db.refresh(profile)
        return DeveloperResponse.model_validate(profile)

    def list_sdk_projects(self, ctx: TenantContext) -> list[SdkProjectResponse]:
        self.ensure_catalog(ctx)
        rows = self.db.scalars(
            select(SdkProject)
            .where(SdkProject.tenant_id == ctx.tenant.id)
            .order_by(desc(SdkProject.created_at))
        ).all()
        return [SdkProjectResponse.model_validate(r) for r in rows]

    def create_sdk_project(self, ctx: TenantContext, payload: SdkProjectCreate) -> SdkProjectResponse:
        developer = self.ensure_catalog(ctx)
        sample = self._sample_code(payload.project_type, payload.name)
        project = SdkProject(
            tenant_id=ctx.tenant.id,
            developer_id=developer.id,
            created_by_id=ctx.membership.user_id,
            name=payload.name,
            slug=slugify(payload.name),
            project_type=payload.project_type,
            description=payload.description,
            sdk_version="1.0.0",
            status="active",
            config={"sandbox": True, "lazyLoad": True},
            sample_code=sample,
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return SdkProjectResponse.model_validate(project)

    # ── Webhooks ───────────────────────────────────────────────

    def list_webhooks(self, ctx: TenantContext) -> list[PlatformWebhookResponse]:
        rows = self.db.scalars(
            select(PlatformWebhook)
            .where(PlatformWebhook.tenant_id == ctx.tenant.id)
            .order_by(desc(PlatformWebhook.created_at))
        ).all()
        return [PlatformWebhookResponse.model_validate(r) for r in rows]

    def create_webhook(self, ctx: TenantContext, payload: PlatformWebhookCreate) -> PlatformWebhookResponse:
        wh = PlatformWebhook(
            tenant_id=ctx.tenant.id,
            created_by_id=ctx.membership.user_id,
            name=payload.name,
            url=payload.url,
            secret=f"nxs_{secrets.token_urlsafe(24)}",
            events=payload.events or ["*"],
            status="active",
            retry_limit=payload.retry_limit,
            success_count=0,
            failure_count=0,
        )
        self.db.add(wh)
        self.db.flush()
        ActivityLogger(self.db).log(
            tenant_id=ctx.tenant.id,
            actor_id=ctx.membership.user_id,
            entity_type="platform_webhook",
            entity_id=wh.id,
            action="webhook_created",
            title=f"Webhook created: {payload.name}",
            description=payload.url,
        )
        self.db.commit()
        self.db.refresh(wh)
        return PlatformWebhookResponse.model_validate(wh)

    def update_webhook(
        self, ctx: TenantContext, webhook_id: uuid.UUID, payload: PlatformWebhookUpdate
    ) -> PlatformWebhookResponse:
        wh = self._get_webhook(ctx, webhook_id)
        if payload.name is not None:
            wh.name = payload.name
        if payload.url is not None:
            wh.url = payload.url
        if payload.events is not None:
            wh.events = payload.events
        if payload.status is not None:
            wh.status = payload.status
        if payload.retry_limit is not None:
            wh.retry_limit = payload.retry_limit
        self.db.commit()
        self.db.refresh(wh)
        return PlatformWebhookResponse.model_validate(wh)

    def delete_webhook(self, ctx: TenantContext, webhook_id: uuid.UUID) -> dict:
        wh = self._get_webhook(ctx, webhook_id)
        self.db.delete(wh)
        self.db.commit()
        return {"ok": True}

    def test_webhook(self, ctx: TenantContext, webhook_id: uuid.UUID) -> PlatformWebhookLogResponse:
        wh = self._get_webhook(ctx, webhook_id)
        start = time.perf_counter()
        # Simulated delivery (sandbox) — no outbound network from demo env
        ok = random.random() > 0.15
        duration = int((time.perf_counter() - start) * 1000) + random.randint(40, 220)
        log = PlatformWebhookLog(
            webhook_id=wh.id,
            tenant_id=ctx.tenant.id,
            event_type="plugin.test",
            status="success" if ok else "failed",
            status_code=200 if ok else 502,
            attempt=1,
            duration_ms=duration,
            request_payload={
                "event": "plugin.test",
                "tenant": ctx.tenant.slug,
                "timestamp": utcnow().isoformat(),
            },
            response_body='{"received":true}' if ok else None,
            error_message=None if ok else "Simulated endpoint unavailable",
        )
        self.db.add(log)
        wh.last_triggered_at = utcnow()
        if ok:
            wh.success_count = (wh.success_count or 0) + 1
        else:
            wh.failure_count = (wh.failure_count or 0) + 1
            notify_user(
                self.db,
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                actor_id=ctx.membership.user_id,
                type="webhook_delivery_failed",
                title="Webhook delivery failed",
                message=f"{wh.name} failed test delivery.",
            )
            ActivityLogger(self.db).log(
                tenant_id=ctx.tenant.id,
                actor_id=ctx.membership.user_id,
                entity_type="platform_webhook",
                entity_id=wh.id,
                action="webhook_failed",
                title=f"Webhook failed: {wh.name}",
                description="Test delivery failed",
            )
        self.db.commit()
        self.db.refresh(log)
        return PlatformWebhookLogResponse.model_validate(log)

    def retry_webhook_log(self, ctx: TenantContext, log_id: uuid.UUID) -> PlatformWebhookLogResponse:
        original = self.db.scalar(
            select(PlatformWebhookLog).where(
                PlatformWebhookLog.id == log_id,
                PlatformWebhookLog.tenant_id == ctx.tenant.id,
            )
        )
        if not original:
            raise HTTPException(status_code=404, detail="Webhook log not found")
        wh = self._get_webhook(ctx, original.webhook_id)
        ok = True
        log = PlatformWebhookLog(
            webhook_id=wh.id,
            tenant_id=ctx.tenant.id,
            event_type=original.event_type,
            status="success" if ok else "failed",
            status_code=200,
            attempt=(original.attempt or 1) + 1,
            duration_ms=random.randint(50, 180),
            request_payload=original.request_payload or {},
            response_body='{"retried":true,"received":true}',
            error_message=None,
        )
        self.db.add(log)
        wh.success_count = (wh.success_count or 0) + 1
        wh.last_triggered_at = utcnow()
        self.db.commit()
        self.db.refresh(log)
        return PlatformWebhookLogResponse.model_validate(log)

    def list_webhook_logs(
        self, ctx: TenantContext, webhook_id: uuid.UUID | None = None
    ) -> list[PlatformWebhookLogResponse]:
        query = select(PlatformWebhookLog).where(PlatformWebhookLog.tenant_id == ctx.tenant.id)
        if webhook_id:
            query = query.where(PlatformWebhookLog.webhook_id == webhook_id)
        rows = self.db.scalars(query.order_by(desc(PlatformWebhookLog.created_at)).limit(100)).all()
        return [PlatformWebhookLogResponse.model_validate(r) for r in rows]

    # ── REST explorer / GraphQL / CLI ──────────────────────────

    def rest_explorer(self, ctx: TenantContext, payload: RestExplorerRequest) -> RestExplorerResponse:
        start = time.perf_counter()
        path = payload.path.strip()
        method = payload.method.upper()
        catalog = {
            "GET /companies": {"items": [{"id": "demo", "name": "Acme Corp"}], "total": 1},
            "GET /contacts": {"items": [{"id": "demo", "full_name": "Jane Doe"}], "total": 1},
            "GET /deals": {"items": [{"id": "demo", "title": "Enterprise Deal", "stage": "negotiation"}], "total": 1},
            "GET /leads": {"items": [{"id": "demo", "title": "Inbound Lead", "status": "new"}], "total": 1},
            "GET /plugins": {"items": [p["slug"] for p in PLUGIN_CATALOG[:5]]},
            "GET /webhooks": {"items": self.list_webhooks(ctx)},
            "GET /notifications": {"ok": True, "resource": "notifications"},
            "GET /documents": {"ok": True, "resource": "documents"},
            "GET /workflows": {"ok": True, "resource": "workflows"},
            "GET /ai/agents": {"ok": True, "resource": "ai_agents"},
            "GET /reports": {"ok": True, "resource": "reports"},
            "GET /portal": {"ok": True, "resource": "customer_portal"},
        }
        key = f"{method} {path.split('?')[0]}"
        # normalize /api/v1/tenants/{slug}/...
        for k, v in list(catalog.items()):
            if path.rstrip("/").endswith(k.split(" ", 1)[1]):
                key = k
                break
        body = catalog.get(key)
        if body is None and method == "GET":
            body = {
                "message": "Route recognized by Public API surface",
                "path": path,
                "hint": "Use /companies, /contacts, /deals, /leads, /plugins, /webhooks",
            }
            status_code = 200
        elif body is None:
            body = {"error": "Unsupported explorer path"}
            status_code = 404
        else:
            if hasattr(body, "__iter__") and not isinstance(body, (dict, str)):
                body = {"items": [b.model_dump() if hasattr(b, "model_dump") else b for b in body]}
            elif hasattr(body, "model_dump"):
                body = body.model_dump()
            status_code = 200

        duration = int((time.perf_counter() - start) * 1000) + random.randint(5, 40)
        self.db.add(
            ApiUsageEvent(
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                resource=path[:80],
                method=method,
                status_code=status_code,
                duration_ms=duration,
                api_style="rest",
            )
        )
        self.db.commit()
        return RestExplorerResponse(
            status_code=status_code,
            duration_ms=duration,
            headers={"content-type": "application/json", "x-nexora-api": "v1"},
            body=body,
        )

    def graphql(self, ctx: TenantContext, payload: GraphQLRequest) -> GraphQLResponse:
        q = payload.query.strip()
        self.db.add(
            ApiUsageEvent(
                tenant_id=ctx.tenant.id,
                user_id=ctx.membership.user_id,
                resource="graphql",
                method="POST",
                status_code=200,
                duration_ms=random.randint(8, 60),
                api_style="graphql",
            )
        )
        self.db.commit()

        if "__schema" in q or "IntrospectionQuery" in q:
            return GraphQLResponse(
                data={
                    "__schema": {
                        "queryType": {"name": "Query"},
                        "mutationType": {"name": "Mutation"},
                        "subscriptionType": {"name": "Subscription"},
                        "types": [
                            {"kind": "OBJECT", "name": "Query"},
                            {"kind": "OBJECT", "name": "Mutation"},
                            {"kind": "OBJECT", "name": "Plugin"},
                            {"kind": "OBJECT", "name": "Deal"},
                        ],
                    }
                }
            )

        if "installedPlugins" in q:
            installs = self.list_installed(ctx)
            return GraphQLResponse(
                data={
                    "installedPlugins": [
                        {"id": str(i.id), "status": i.status, "installedVersion": i.installed_version}
                        for i in installs
                    ]
                }
            )

        if "plugins" in q:
            market = self.list_marketplace(ctx, featured="featured: true" in q.replace(" ", ""))
            return GraphQLResponse(
                data={
                    "plugins": [
                        {
                            "id": str(p.id),
                            "slug": p.slug,
                            "name": p.name,
                            "pluginType": p.plugin_type,
                            "avgRating": p.avg_rating,
                        }
                        for p in market.items[:20]
                    ]
                }
            )

        if "me" in q:
            dev = self.ensure_catalog(ctx)
            return GraphQLResponse(
                data={"me": {"id": str(dev.id), "displayName": dev.display_name, "verified": dev.verified}}
            )

        return GraphQLResponse(
            data={"ok": True, "sdlHint": "See /developers/graphql for schema"},
            extensions={"sdl": GRAPHQL_SDL.strip()[:500]},
        )

    def graphql_sdl(self) -> dict:
        return {"sdl": GRAPHQL_SDL.strip()}

    def run_cli(self, ctx: TenantContext, payload: CliActionRequest) -> CliActionResponse:
        action = payload.action.strip().lower()
        name = payload.name or "my-plugin"

        if action in ("create", "plugin.create", "create-plugin"):
            project = self.create_sdk_project(
                ctx,
                SdkProjectCreate(name=name, project_type=payload.plugin_type, description="CLI scaffolded plugin"),
            )
            return CliActionResponse(
                success=True,
                action=action,
                message=f"Created plugin project '{name}'",
                output={"project_id": str(project.id), "slug": project.slug, "sample": project.sample_code},
            )

        if action in ("widget", "generate-widget", "widget.generate"):
            project = self.create_sdk_project(
                ctx, SdkProjectCreate(name=name, project_type="widget", description="CLI generated widget")
            )
            return CliActionResponse(
                success=True,
                action=action,
                message=f"Generated widget '{name}'",
                output={"project_id": str(project.id), "type": "widget"},
            )

        if action in ("validate", "plugin.validate"):
            return CliActionResponse(
                success=True,
                action=action,
                message="Manifest valid · permissions ok · sandbox compatible",
                output={"checks": ["manifest", "permissions", "dependencies", "sdk_version"], "passed": True},
            )

        if action in ("package", "plugin.package"):
            return CliActionResponse(
                success=True,
                action=action,
                message=f"Packaged {name}@{payload.version}",
                output={"artifact": f"{slugify(name)}-{payload.version}.tgz", "size_kb": random.randint(40, 400)},
            )

        if action in ("publish", "plugin.publish"):
            return CliActionResponse(
                success=True,
                action=action,
                message=f"Published {name}@{payload.version} to marketplace (sandbox)",
                output={"status": "published", "version": payload.version},
            )

        if action in ("deploy", "plugin.deploy"):
            return CliActionResponse(
                success=True,
                action=action,
                message=f"Deployed {name} to tenant sandbox '{ctx.tenant.slug}'",
                output={"tenant": ctx.tenant.slug, "status": "deployed"},
            )

        raise HTTPException(status_code=400, detail=f"Unknown CLI action: {action}")

    # ── Helpers ────────────────────────────────────────────────

    def _get_install(self, ctx: TenantContext, installation_id: uuid.UUID) -> PluginInstallation:
        install = self.db.scalar(
            select(PluginInstallation)
            .options(joinedload(PluginInstallation.plugin))
            .where(
                PluginInstallation.id == installation_id,
                PluginInstallation.tenant_id == ctx.tenant.id,
            )
        )
        if not install:
            raise HTTPException(status_code=404, detail="Installation not found")
        return install

    def _get_webhook(self, ctx: TenantContext, webhook_id: uuid.UUID) -> PlatformWebhook:
        wh = self.db.scalar(
            select(PlatformWebhook).where(
                PlatformWebhook.id == webhook_id,
                PlatformWebhook.tenant_id == ctx.tenant.id,
            )
        )
        if not wh:
            raise HTTPException(status_code=404, detail="Webhook not found")
        return wh

    def _to_plugin_summary(
        self, plugin: Plugin, *, installed: bool = False, install_status: str | None = None
    ) -> PluginSummary:
        return PluginSummary(
            id=plugin.id,
            slug=plugin.slug,
            name=plugin.name,
            description=plugin.description,
            plugin_type=plugin.plugin_type,
            category=plugin.category,
            icon=plugin.icon,
            status=plugin.status,
            latest_version=plugin.latest_version,
            permissions=plugin.permissions or [],
            is_featured=plugin.is_featured,
            is_official=plugin.is_official,
            install_count=plugin.install_count or 0,
            avg_rating=plugin.avg_rating or 0.0,
            review_count=plugin.review_count or 0,
            installed=installed,
            install_status=install_status,
        )

    def _to_install(self, install: PluginInstallation) -> PluginInstallationResponse:
        plugin_summary = None
        if install.plugin:
            plugin_summary = self._to_plugin_summary(
                install.plugin, installed=True, install_status=install.status
            )
        return PluginInstallationResponse(
            id=install.id,
            plugin_id=install.plugin_id,
            installed_version=install.installed_version,
            status=install.status,
            settings=install.settings or {},
            granted_permissions=install.granted_permissions or [],
            last_error=install.last_error,
            enabled_at=install.enabled_at,
            disabled_at=install.disabled_at,
            created_at=install.created_at,
            plugin=plugin_summary,
        )

    def _sample_code(self, project_type: str, name: str) -> str:
        if project_type == "widget":
            return (
                f"import {{ defineWidget }} from '@nexora/widget-sdk';\n\n"
                f"export default defineWidget({{\n"
                f"  id: '{slugify(name)}',\n"
                f"  title: '{name}',\n"
                f"  size: 'md',\n"
                f"  async render(ctx) {{\n"
                f"    const deals = await ctx.api.deals.list({{ stage: 'open' }});\n"
                f"    return <PipelineChart deals={{deals}} />;\n"
                f"  }},\n"
                f"}});\n"
            )
        if project_type == "theme":
            return (
                f"import {{ defineTheme }} from '@nexora/theme-sdk';\n\n"
                f"export default defineTheme({{\n"
                f"  id: '{slugify(name)}',\n"
                f"  tokens: {{\n"
                f"    '--brand': '#0F766E',\n"
                f"    '--surface': '#0B1220',\n"
                f"  }},\n"
                f"}});\n"
            )
        return (
            f"import {{ definePlugin }} from '@nexora/plugin-sdk';\n\n"
            f"export default definePlugin({{\n"
            f"  name: '{name}',\n"
            f"  version: '1.0.0',\n"
            f"  permissions: ['deal:read'],\n"
            f"  async onInstall(ctx) {{\n"
            f"    await ctx.log.info('Plugin installed');\n"
            f"  }},\n"
            f"}});\n"
        )
