"""Application-wide Redis connection management."""

from __future__ import annotations

import logging
from functools import lru_cache

from redis import ConnectionPool, Redis
from redis.exceptions import RedisError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_redis_pool() -> ConnectionPool:
    """Create one process-local, thread-safe Redis connection pool."""
    settings = get_settings()
    return ConnectionPool.from_url(
        settings.redis_url,
        decode_responses=True,
        max_connections=20,
        socket_connect_timeout=2,
        socket_timeout=2,
        health_check_interval=30,
        retry_on_timeout=True,
    )


@lru_cache(maxsize=1)
def get_redis_client() -> Redis:
    """Return the reusable Redis client."""
    return Redis(connection_pool=get_redis_pool())


def get_redis() -> Redis:
    """FastAPI dependency for the shared Redis client."""
    return get_redis_client()


def check_redis_connection() -> bool:
    """Check Redis availability without making application startup fatal."""
    try:
        available = bool(get_redis_client().ping())
        if available:
            logger.info("Redis connection established")
        return available
    except RedisError:
        logger.warning("Redis is unavailable; cache operations will fail open", exc_info=True)
        return False


def close_redis() -> None:
    """Close the client and disconnect all pooled connections."""
    if get_redis_client.cache_info().currsize:
        get_redis_client().close()
    if get_redis_pool.cache_info().currsize:
        get_redis_pool().disconnect()
    get_redis_client.cache_clear()
    get_redis_pool.cache_clear()
