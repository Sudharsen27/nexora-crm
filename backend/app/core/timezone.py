"""Timezone helpers for dashboard date ranges."""

from __future__ import annotations

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Browsers often send legacy IANA aliases that are missing on minimal server images.
TIMEZONE_ALIASES: dict[str, str] = {
    "Asia/Calcutta": "Asia/Kolkata",
    "US/Eastern": "America/New_York",
    "US/Central": "America/Chicago",
    "US/Mountain": "America/Denver",
    "US/Pacific": "America/Los_Angeles",
}


def normalize_timezone_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned:
        return "UTC"
    return TIMEZONE_ALIASES.get(cleaned, cleaned)


def resolve_timezone(name: str) -> ZoneInfo:
    """Resolve a client timezone string to ZoneInfo, falling back to UTC."""
    candidate = normalize_timezone_name(name)
    try:
        return ZoneInfo(candidate)
    except (ZoneInfoNotFoundError, KeyError):
        if candidate != "UTC":
            try:
                return ZoneInfo("UTC")
            except (ZoneInfoNotFoundError, KeyError) as exc:
                raise ValueError(f"Timezone data unavailable on server: {name}") from exc
        raise ValueError(f"Invalid timezone: {name}") from None
