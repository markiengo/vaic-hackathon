import json
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TaxLensError, get_current_user
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.tax import TaxRuleVersion
from app.schemas.agent import TaxChecklistItem
from app.services.export import collect_draft_export_data, to_csv_text, to_json_dict
from app.services.tax_rules import check_required_fields

router = APIRouter(prefix="/tax", tags=["tax"])


class TaxExportRequest(BaseModel):
    merchant_id: str
    period: str
    format: str = "json"  # "json" | "csv"


@router.get("/readiness")
async def tax_readiness(
    merchant_id: str = Query(...),
    period: str = Query(..., description="YYYY-MM"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    try:
        result = await check_required_fields(db, merchant_id, period)
    except ValueError:
        raise TaxLensError("ERR-MERCHANT-001", 404, "Merchant không tồn tại")

    if result.rule_version is None:
        raise TaxLensError("ERR-TAX-001", 404, "Không tìm thấy tax rule version cho merchant này")

    checklist = [
        TaxChecklistItem(
            name=check.field,
            value=check.value,
            threshold=check.threshold,
            passed=check.passed,
            details=check.detail,
        ).model_dump(by_alias=True)
        for check in result.checks
    ]

    return {
        "merchant_id": merchant_id,
        "period": period,
        "rule_version": result.rule_version,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "ready": result.all_pass,
        "checklist": checklist,
    }


@router.post("/export")
async def export_draft(
    body: TaxExportRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> Response:
    if body.format not in ("json", "csv"):
        raise TaxLensError("ERR-GEN-001", 400, "format phải là 'json' hoặc 'csv'")

    # ERR-TAX-002: unresolved exceptions block export
    case_result = await db.execute(
        select(ReconciliationCase).where(
            ReconciliationCase.merchant_id == body.merchant_id,
            ReconciliationCase.period == body.period,
        )
    )
    cases = case_result.scalars().all()
    if cases:
        case_ids = [c.id for c in cases]
        pending_count = await db.scalar(
            select(func.count(ExceptionRecord.id)).where(
                ExceptionRecord.case_id.in_(case_ids),
                ExceptionRecord.status == "PENDING",
            )
        )
        if pending_count and pending_count > 0:
            raise TaxLensError(
                "ERR-TAX-002",
                400,
                f"Còn {pending_count} ngoại lệ chưa giải quyết — không thể xuất dữ liệu",
                {"pending_exceptions": pending_count},
            )

    try:
        fields_result = await check_required_fields(db, body.merchant_id, body.period)
    except ValueError:
        raise TaxLensError("ERR-MERCHANT-001", 404, "Merchant không tồn tại")

    rule_version = fields_result.rule_version or "unknown"

    # ERR-TAX-003: rule version đã hết hạn (effective_to < today)
    if rule_version != "unknown":
        rv_row = await db.scalar(
            select(TaxRuleVersion).where(TaxRuleVersion.version == rule_version)
        )
        if rv_row and rv_row.effective_to and rv_row.effective_to < date.today():
            raise TaxLensError(
                "ERR-TAX-003",
                422,
                f"Rule version {rule_version} đã hết hạn kể từ {rv_row.effective_to}",
            )

    # ERR-TAX-002: no revenue data for period (blocked export)
    if not any(c.field == "revenue_total" and c.passed for c in fields_result.checks):
        raise TaxLensError(
            "ERR-TAX-002",
            400,
            "Không có dữ liệu doanh thu cho kỳ này — không thể xuất",
        )

    data = await collect_draft_export_data(db, body.merchant_id, body.period, rule_version)

    if body.format == "csv":
        return Response(
            content="﻿" + to_csv_text(data),
            media_type="text/csv; charset=utf-8-sig",
            headers={"Content-Disposition": f'attachment; filename="export_{body.merchant_id}_{body.period}.csv"'},
        )

    return Response(
        content=json.dumps(to_json_dict(data), ensure_ascii=False, indent=2),
        media_type="application/json",
    )
