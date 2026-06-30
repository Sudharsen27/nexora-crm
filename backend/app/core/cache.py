"""Simple in-process TTL cache for analytics responses."""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Callable, TypeVar

T = TypeVar("T")

_CACHE: dict[str, tuple[float, Any]] = {}
DEFAULT_TTL_SECONDS = 60


def _cache_key(prefix: str, payload: dict) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    return f"{prefix}:{hashlib.sha256(raw.encode()).hexdigest()}"


def cached_get(prefix: str, payload: dict, factory: Callable[[], T], ttl: int = DEFAULT_TTL_SECONDS) -> T:
    key = _cache_key(prefix, payload)
    now = time.monotonic()
    entry = _CACHE.get(key)
    if entry and now - entry[0] < ttl:
        return entry[1]
    value = factory()
    _CACHE[key] = (now, value)
    if len(_CACHE) > 500:
        oldest = min(_CACHE, key=lambda k: _CACHE[k][0])
        _CACHE.pop(oldest, None)
    return value


def invalidate_prefix(prefix: str) -> None:
    keys = [k for k in _CACHE if k.startswith(f"{prefix}:")]
    for key in keys:
        _CACHE.pop(key, None)
