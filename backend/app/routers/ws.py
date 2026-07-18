"""WebSocket router for real-time notifications."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.security import TaxLensError, decode_token
from app.core.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/transactions")
async def transaction_ws(ws: WebSocket) -> None:
    """Push real-time transaction notifications to all connected clients."""
    await ws_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)


@router.websocket("/ws/agent-trace/{run_id}")
async def agent_trace_ws(
    run_id: str,
    ws: WebSocket,
    token: str = Query(..., description="JWT access token"),
) -> None:
    """Push tool_call events for a specific agent run. Pass JWT as ?token=<access_token>."""
    try:
        decode_token(token)
    except (TaxLensError, Exception):
        await ws.close(code=4001)
        return

    await ws_manager.connect_agent(run_id, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_agent(run_id, ws)
