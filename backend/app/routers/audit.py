import csv
import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TaxLensError, require_role
from app.models.agent import AuditEvent

router = APIRouter(prefix="/audit", tags=["audit"])

_CSV_FIELDS = [
    "id", "actor_type", "actor_id", "agent_name", "action", "tool_name",
    "input_hash", "output_hash", "confidence", "rule_version",
    "approval_status", "merchant_id", "timestamp",
]


def _event_to_dict(e: AuditEvent) -> dict:
    return {
        "id": e.id,
        "actor_type": e.actor_type,
        "actor_id": e.actor_id,
        "agent_name": e.agent_name,
        "action": e.action,
        "tool_name": e.tool_name,
        "input_hash": e.input_hash,
        "output_hash": e.output_hash,
        "confidence": float(e.confidence) if e.confidence else None,
        "rule_version": e.rule_version,
        "approval_status": e.approval_status,
        "merchant_id": e.merchant_id,
        "timestamp": e.timestamp.isoformat() if e.timestamp else None,
    }


# TODO Q-A5: dual path (/audit and /audit/export) matches both P3's api.ts and
# API spec §9. Confirm with P3 which one to keep before final integration.
@router.get("")
@router.get("/export")
async def export_audit(
    merchant_id: str = Query(None),
    period: str = Query(None, description="YYYY-MM"),
    format: str = Query("json"),
    limit: int = Query(500, le=2000),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("admin", "compliance", "rm")),
) -> Response:
    if format not in ("json", "csv"):
        raise TaxLensError("ERR-GEN-001", 400, "format phải là 'json' hoặc 'csv'")

    q = select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(limit)
    if merchant_id:
        q = q.where(AuditEvent.merchant_id == merchant_id)
    if period:
        year, month = (int(p) for p in period.split("-"))
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        end_year, end_month = (year + 1, 1) if month == 12 else (year, month + 1)
        end = datetime(end_year, end_month, 1, tzinfo=timezone.utc)
        q = q.where(AuditEvent.timestamp >= start, AuditEvent.timestamp < end)

    result = await db.execute(q)
    events = [_event_to_dict(e) for e in result.scalars().all()]

    if format == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=_CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(events)
        return Response(
            content=buf.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="audit_{period or "all"}.csv"'},
        )

    return Response(
        content=json.dumps({"events": events}, ensure_ascii=False, indent=2),
        media_type="application/json",
    )
