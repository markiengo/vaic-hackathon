"""Tax Rules Engine — deterministic service for tax rule retrieval, validation, and reporting.

No AI/LLM is used in any calculation. All logic is deterministic per DEC-004.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cash import CashSession
from app.models.invoice import Invoice
from app.models.merchant import Store
from app.models.sale import Sale
from app.models.tax import TaxRuleVersion

logger = logging.getLogger(__name__)


async def retrieve_tax_rules(
    session: AsyncSession,
    merchant_type: str,
    business_category: str,
) -> dict | None:
    """Retrieve the latest approved tax rules for a merchant type + business category.

    Returns the rule version dict with required_fields, formula_or_validation,
    and legal_source, or None if no matching approved rule exists.
    """
    today = date.today()
    result = await session.execute(
        select(TaxRuleVersion)
        .where(
            TaxRuleVersion.merchant_type == merchant_type,
            TaxRuleVersion.business_category == business_category,
            TaxRuleVersion.approval_status == "APPROVED",
            TaxRuleVersion.effective_from <= today,
        )
        .order_by(TaxRuleVersion.effective_from.desc())
        .limit(1)
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        return None

    return {
        "version": rule.version,
        "merchant_type": rule.merchant_type,
        "business_category": rule.business_category,
        "effective_from": rule.effective_from.isoformat() if rule.effective_from else None,
        "effective_to": rule.effective_to.isoformat() if rule.effective_to else None,
        "required_fields": rule.required_fields,
        "formula_or_validation": rule.formula_or_validation,
        "legal_source": rule.legal_source,
        "approval_status": rule.approval_status,
        "approved_by": rule.approved_by,
    }


async def validate_rule_version(
    session: AsyncSession,
    version: str,
) -> dict:
    """Validate whether a tax rule version exists, is approved, and is currently effective.

    Returns: {"valid": bool, "status": str, "effective": bool}
    """
    result = await session.execute(
        select(TaxRuleVersion).where(TaxRuleVersion.version == version)
    )
    rule = result.scalar_one_or_none()

    if rule is None:
        return {"valid": False, "status": "NOT_FOUND", "effective": False}

    today = date.today()
    is_effective = rule.effective_from <= today and (
        rule.effective_to is None or rule.effective_to >= today
    )
    is_approved = rule.approval_status == "APPROVED"

    return {
        "valid": is_approved and is_effective,
        "status": rule.approval_status,
        "effective": is_effective,
    }


async def check_required_fields(
    session: AsyncSession,
    merchant_id: str,
    period: str,
) -> dict:
    """Check required fields for tax readiness.

    Validates:
    - Invoice coverage: count(invoices) / count(sales where payment_status=PAID) >= 0.9
    - Cash session status: all cash_sessions for period have status=RECONCILED

    Returns: {"passed": list[str], "failed": list[str]}
    """
    passed: list[str] = []
    failed: list[str] = []

    year, month = period.split("-")
    period_start = date(int(year), int(month), 1)
    if int(month) == 12:
        period_end = date(int(year) + 1, 1, 1)
    else:
        period_end = date(int(year), int(month) + 1, 1)

    paid_sales_count = await session.scalar(
        select(func.count(Sale.id))
        .where(
            Sale.merchant_id == merchant_id,
            Sale.payment_status == "PAID",
            Sale.created_at >= period_start,
            Sale.created_at < period_end,
        )
    )

    invoice_count = await session.scalar(
        select(func.count(Invoice.id))
        .where(
            Invoice.merchant_id == merchant_id,
            Invoice.ingested_at >= period_start,
            Invoice.ingested_at < period_end,
        )
    )

    paid_sales_count = paid_sales_count or 0
    invoice_count = invoice_count or 0

    if paid_sales_count == 0:
        failed.append("invoice_coverage")
    else:
        coverage = invoice_count / paid_sales_count
        if coverage >= 0.9:
            passed.append("invoice_coverage")
        else:
            failed.append("invoice_coverage")

    # Missing invoices: count sales without a linked invoice (threshold: 0)
    total_sales_count = await session.scalar(
        select(func.count(Sale.id))
        .where(
            Sale.merchant_id == merchant_id,
            Sale.created_at >= period_start,
            Sale.created_at < period_end,
        )
    )
    total_sales_count = total_sales_count or 0

    sales_with_invoices = await session.scalar(
        select(func.count(func.distinct(Invoice.sale_id)))
        .where(
            Invoice.merchant_id == merchant_id,
            Invoice.ingested_at >= period_start,
            Invoice.ingested_at < period_end,
            Invoice.sale_id.isnot(None),
        )
    )
    sales_with_invoices = sales_with_invoices or 0

    missing_invoices = total_sales_count - sales_with_invoices
    if missing_invoices == 0:
        passed.append("missing_invoices")
    else:
        failed.append("missing_invoices")

    store_ids_subq = select(Store.id).where(Store.merchant_id == merchant_id)

    cash_sessions_count = await session.scalar(
        select(func.count(CashSession.id))
        .where(
            CashSession.store_id.in_(store_ids_subq),
            CashSession.opened_at >= period_start,
            CashSession.opened_at < period_end,
        )
    )

    reconciled_count = await session.scalar(
        select(func.count(CashSession.id))
        .where(
            CashSession.store_id.in_(store_ids_subq),
            CashSession.opened_at >= period_start,
            CashSession.opened_at < period_end,
            CashSession.status == "RECONCILED",
        )
    )

    cash_sessions_count = cash_sessions_count or 0
    reconciled_count = reconciled_count or 0

    if cash_sessions_count == 0:
        failed.append("cash_session_closure")
    elif reconciled_count == cash_sessions_count:
        passed.append("cash_session_closure")
    else:
        failed.append("cash_session_closure")

    logger.info(
        "check_required_fields: merchant=%s period=%s paid_sales=%d invoices=%d cash_sessions=%d reconciled=%d",
        merchant_id, period, paid_sales_count, invoice_count, cash_sessions_count, reconciled_count,
    )

    return {"passed": passed, "failed": failed}


async def generate_tax_readiness_report(
    session: AsyncSession,
    merchant_id: str,
    period: str,
    rule_version: str,
) -> dict:
    """Generate a full tax-readiness report.

    Includes checklist items with pass/fail and overall ready status.
    """
    validation = await validate_rule_version(session, rule_version)
    fields_check = await check_required_fields(session, merchant_id, period)

    rule_result = await session.execute(
        select(TaxRuleVersion).where(TaxRuleVersion.version == rule_version)
    )
    rule = rule_result.scalar_one_or_none()

    checklist: list[dict] = []

    checklist.append({
        "item": "rule_version_valid",
        "passed": validation["valid"],
        "detail": f"status={validation['status']}, effective={validation['effective']}",
    })

    for item_name in fields_check["passed"]:
        checklist.append({"item": item_name, "passed": True, "detail": ""})
    for item_name in fields_check["failed"]:
        checklist.append({"item": item_name, "passed": False, "detail": ""})

    all_passed = all(item["passed"] for item in checklist)

    report = {
        "merchant_id": merchant_id,
        "period": period,
        "rule_version": rule_version,
        "effective_from": rule.effective_from.isoformat() if rule and rule.effective_from else None,
        "legal_source": rule.legal_source if rule else None,
        "approved_by": rule.approved_by if rule else None,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "checklist": checklist,
        "ready": all_passed,
    }

    logger.info(
        "generate_tax_readiness_report: merchant=%s period=%s rule=%s ready=%s",
        merchant_id, period, rule_version, all_passed,
    )

    return report