"""WebSocket connection manager for real-time notifications."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections for both broadcast and per-run pushes."""

    def __init__(self) -> None:
        self.active: list[WebSocket] = []
        self._agent_connections: dict[str, list[WebSocket]] = {}

    # --- /ws/transactions (broadcast) ---

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)
        logger.info("WS connected. Total: %d", len(self.active))

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)
        logger.info("WS disconnected. Total: %d", len(self.active))

    async def broadcast(self, data: dict[str, Any]) -> None:
        message = json.dumps(data, default=str, ensure_ascii=False)
        stale: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(ws)

    # --- /ws/agent-trace/{run_id} (per-run push) ---

    async def connect_agent(self, run_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._agent_connections.setdefault(run_id, []).append(ws)
        logger.info("Agent WS connected: run_id=%s", run_id)

    def disconnect_agent(self, run_id: str, ws: WebSocket) -> None:
        conns = self._agent_connections.get(run_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self._agent_connections.pop(run_id, None)
        logger.info("Agent WS disconnected: run_id=%s", run_id)

    async def push_to_run(self, run_id: str, data: dict[str, Any]) -> None:
        message = json.dumps(data, default=str, ensure_ascii=False)
        stale: list[WebSocket] = []
        for ws in self._agent_connections.get(run_id, []):
            try:
                await ws.send_text(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect_agent(run_id, ws)


ws_manager = ConnectionManager()
