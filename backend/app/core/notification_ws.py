"""WebSocket connection manager for real-time notifications."""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)

_main_loop: asyncio.AbstractEventLoop | None = None


def set_main_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _main_loop
    _main_loop = loop


class NotificationConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[tuple[str, str], set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, tenant_id: UUID, user_id: UUID) -> None:
        await websocket.accept()
        key = (str(tenant_id), str(user_id))
        async with self._lock:
            self._connections[key].add(websocket)

    async def disconnect(self, websocket: WebSocket, tenant_id: UUID, user_id: UUID) -> None:
        key = (str(tenant_id), str(user_id))
        async with self._lock:
            conns = self._connections.get(key)
            if conns and websocket in conns:
                conns.discard(websocket)
            if conns is not None and len(conns) == 0:
                self._connections.pop(key, None)

    async def send_to_user(self, tenant_id: UUID, user_id: UUID, payload: dict[str, Any]) -> None:
        key = (str(tenant_id), str(user_id))
        async with self._lock:
            sockets = list(self._connections.get(key, set()))
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections.get(key, set()).discard(ws)

    def schedule_send(self, tenant_id: UUID, user_id: UUID, payload: dict[str, Any]) -> None:
        loop: asyncio.AbstractEventLoop | None
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = _main_loop
        if loop is None:
            logger.debug("No event loop for websocket push; client will poll")
            return
        loop.call_soon_threadsafe(
            lambda: loop.create_task(self.send_to_user(tenant_id, user_id, payload))
        )


notification_manager = NotificationConnectionManager()
