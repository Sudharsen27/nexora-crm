"""Tenant-safe cache policy for dashboard responses."""

from __future__ import annotations

import hashlib
import json
import logging
from collections.abc import Iterable
from uuid import UUID

from redis import Redis
from redis.exceptions import RedisError

from app.cache.cache_manager import get_cache, set_cache
from app.core.redis import get_redis_client
from app.schemas.dashboard import DashboardQueryParams, DashboardResponse

logger = logging.getLogger(__name__)

DASHBOARD_CACHE_TTL_SECONDS = 60


def dashboard_cache_key(
    tenant_id: UUID,
    user_id: UUID,
    params: DashboardQueryParams,
    permissions: Iterable[str],
) -> str:
    """Build a tenant-prefixed key without mixing user/RBAC-scoped responses."""
    dimensions = {
        "user_id": str(user_id),
        "params": params.model_dump(mode="json"),
        "permissions": sorted(permissions),
    }
    raw = json.dumps(dimensions, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"dashboard:{tenant_id}:{digest}"


def get_dashboard_cache(key: str, *, client: Redis | None = None) -> DashboardResponse | None:
    cached = get_cache(key, client=client)
    if cached is None:
        return None
    try:
        return DashboardResponse.model_validate(cached)
    except ValueError:
        logger.warning("Cached dashboard payload failed validation key=%s", key, exc_info=True)
        return None


def set_dashboard_cache(
    key: str,
    response: DashboardResponse,
    *,
    client: Redis | None = None,
) -> bool:
    return set_cache(
        key,
        response.model_dump(mode="json"),
        ttl=DASHBOARD_CACHE_TTL_SECONDS,
        client=client,
    )


def invalidate_dashboard_cache(
    tenant_id: UUID,
    *,
    client: Redis | None = None,
) -> int:
    """Delete every dashboard variant for one tenant using non-blocking SCAN."""
    redis_client = client or get_redis_client()
    pattern = f"dashboard:{tenant_id}:*"
    deleted = 0
    try:
        batch: list[str] = []
        for key in redis_client.scan_iter(match=pattern, count=100):
            batch.append(key)
            if len(batch) == 100:
                deleted += int(redis_client.delete(*batch))
                batch.clear()
        if batch:
            deleted += int(redis_client.delete(*batch))
        logger.info("Dashboard cache invalidation tenant_id=%s deleted=%s", tenant_id, deleted)
        return deleted
    except RedisError:
        logger.warning(
            "Dashboard cache invalidation failed tenant_id=%s",
            tenant_id,
            exc_info=True,
        )
        return 0
