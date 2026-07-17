"""Typed, fail-open JSON cache operations backed by Redis."""

from __future__ import annotations

import json
import logging
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from app.core.redis import get_redis_client

logger = logging.getLogger(__name__)


def get_cache(key: str, *, client: Redis | None = None) -> Any | None:
    """Return a decoded JSON value, or None on miss/unavailability."""
    redis_client = client or get_redis_client()
    try:
        raw = redis_client.get(key)
    except RedisError:
        logger.warning("Cache read failed key=%s; falling back to source", key, exc_info=True)
        return None

    if raw is None:
        logger.info("Cache miss key=%s", key)
        return None

    try:
        value = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        logger.warning("Invalid cached JSON key=%s; deleting entry", key, exc_info=True)
        delete_cache(key, client=redis_client)
        return None

    logger.info("Cache hit key=%s", key)
    return value


def set_cache(
    key: str,
    value: Any,
    *,
    ttl: int,
    client: Redis | None = None,
) -> bool:
    """JSON-encode and store a value with an explicit TTL."""
    redis_client = client or get_redis_client()
    try:
        payload = json.dumps(value, default=str, separators=(",", ":"))
        redis_client.set(name=key, value=payload, ex=ttl)
        return True
    except (RedisError, TypeError, ValueError):
        logger.warning("Cache write failed key=%s; response remains usable", key, exc_info=True)
        return False


def delete_cache(key: str, *, client: Redis | None = None) -> bool:
    """Delete one cache key."""
    redis_client = client or get_redis_client()
    try:
        deleted = bool(redis_client.delete(key))
        logger.info("Cache invalidation key=%s deleted=%s", key, deleted)
        return deleted
    except RedisError:
        logger.warning("Cache invalidation failed key=%s", key, exc_info=True)
        return False
