"""WebSocket router for real-time transaction notifications."""

from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/transactions")
async def transaction_ws(ws: WebSocket) -> None:
    """WebSocket endpoint that pushes real-time transaction notifications.

    Clients connect to /api/v1/ws/transactions and receive a JSON message
    every time a new bank transaction is ingested (e.g. via SePay webhook).
    """
    await ws_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
