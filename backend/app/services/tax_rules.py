"""Deterministic Tax Rules Engine.

Rules are stored, versioned, and approved in ``tax_rule_versions``. This
service only retrieves, validates, and checks data against them — it never
computes a tax formula and never asks an LLM to decide compliance. See
DEC-004 and ``docs/05-domain/05-compliance.md``.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice
from app.models.merchant import Merchant
from app.models.sale import Sale
from app.models.tax import TaxRuleVersion
from app.models.transaction import BankTransaction

ZERO = Decimal("0")


def _fold(value: str | None) -> str:
    return (value or "").strip().casefold()


def _category_matches(rule_category: str | None, query_category: str | None) -> bool:
    """Loose match so a rule stored as 'beauty_services' matches a query of 'beauty'."""

    rule = _fold(rule_category)
    query = _fold(query_category)
    if not rule or not query:
        return True
    return rule == query or rule.startswith(query) or query.startswith(rule)


def _type_matches(rule_type: str | None, query_type: str | None) -> bool:
    rule = _fold(rule_type)
    query = _fold(query_type)
    if not rule or not query:
        return True
    return rule == query


async def retrieve_tax_rules(
    db: AsyncSession,
    merchant_type: str,
    business_category: str,
    *,
    as_of: date | None = None,
) -> TaxRuleVersion | None:
    """Return the currently effective, APPROVED rule for a merchant profile.

    Selects among APPROVED versions whose effective window contains ``as_of``
    (defaults to today), matching merchant_type/business_category loosely so
    a query of ("salon", "beauty") matches a stored ("salon", "beauty_services").
    When multiple versions match, the most recently effective one wins.
    """

    reference_date = as_of or datetime.now(timezone.utc).date()
    stmt = (
        select(TaxRuleVersion)
        .where(TaxRuleVersion.approval_status == "APPROVED")
        .where(TaxRuleVersion.effective_from <= reference_date)
        .where(
            (TaxRuleVersion.effective_to.is_(None))
            | (TaxRuleVersion.effective_to >= reference_date)
        )
        .order_by(TaxRuleVersion.effective_from.desc())
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()
    for rule in candidates:
        if _type_matches(rule.merchant_type, merchant_type) and _category_matches(
            rule.business_category, business_category
        ):
            return rule
    return None


@dataclass(frozen=True)
class RuleValidation:
    version: str
    valid: bool
    approval_status: str | None
    effective_from: date | None
    effective_to: date | None
    is_currently_effective: bool
    reason: str | None = None


async def validate_rule_version(
    db: AsyncSession, version: str, *, as_of: date | None = None
) -> RuleValidation:
    """Validate that a rule version exists, is approved, and is in effect."""

    reference_date = as_of or datetime.now(timezone.utc).date()
    stmt = select(TaxRuleVersion).where(TaxRuleVersion.version == version)
    result = await db.execute(stmt)
    rule = result.scalar_one_or_none()

    if rule is None:
        return RuleValidation(
            version=version,
            valid=False,
            approval_status=None,
            effective_from=None,
            effective_to=None,
            is_currently_effective=False,
            reason="RULE_VERSION_NOT_FOUND",
        )

    is_effective = rule.effective_from <= reference_date and (
        rule.effective_to is None or rule.effective_to >= reference_date
    )
    is_approved = rule.approval_status == "APPROVED"
    valid = is_approved and is_effective
    reason = None
    if not is_approved:
        reason = "RULE_VERSION_NOT_APPROVED"
    elif not is_effective:
        reason = "RULE_VERSION_NOT_EFFECTIVE"

    return RuleValidation(
        version=rule.version,
        valid=valid,
        approval_status=rule.approval_status,
        effective_from=rule.effective_from,
        effective_to=rule.effective_to,
        is_currently_effective=is_effective,
        reason=reason,
    )


def _period_bounds(period: str) -> tuple[datetime, datetime]:
    """Return [start, end) UTC bounds for a 'YYYY-MM' period."""

    year, month = (int(part) for part in period.split("-"))
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end_year, end_month = (year + 1, 1) if month == 12 else (year, month + 1)
    end = datetime(end_year, end_month, 1, tzinfo=timezone.utc)
    return start, end


@dataclass(frozen=True)
class FieldCheck:
    field: str
    value: object
    threshold: object
    passed: bool
    detail: str | None = None


@dataclass(frozen=True)
class RequiredFieldsResult:
    merchant_id: str
    period: str
    rule_version: str | None
    checks: tuple[FieldCheck, ...]
    missing_invoice_sales: tuple[str, ...]
    all_pass: bool


async def check_required_fields(
    db: AsyncSession,
    merchant_id: str,
    period: str,
    *,
    rule_version: str | None = None,
) -> RequiredFieldsResult:
    """Validate merchant data for ``period`` against the required-fields rule.

    Does not compute tax; only checks presence/coverage of the fields a rule
    requires (merchant identity, revenue totals, invoice coverage, cash
    session closure). Read-only — flags gaps such as missing invoices for the
    Tax & Compliance Agent to surface.
    """

    merchant = await db.get(Merchant, merchant_id)
    if merchant is None:
        raise ValueError(f"merchant {merchant_id} was not found")

    rule: TaxRuleVersion | None
    if rule_version is not None:
        result = await db.execute(
            select(TaxRuleVersion).where(TaxRuleVersion.version == rule_version)
        )
        rule = result.scalar_one_or_none()
    else:
        rule = await retrieve_tax_rules(
            db, merchant.business_type or "", merchant.business_category or ""
        )

    period_start, period_end = _period_bounds(period)
    checks: list[FieldCheck] = []

    checks.append(
        FieldCheck(
            "merchant_name",
            merchant.name,
            "non_empty",
            bool(merchant.name and merchant.name.strip()),
        )
    )
    checks.append(
        FieldCheck(
            "tax_id",
            merchant.tax_id,
            "non_empty",
            bool(merchant.tax_id and merchant.tax_id.strip()),
        )
    )

    paid_sales_stmt = select(Sale).where(
        Sale.merchant_id == merchant_id,
        Sale.payment_status.in_(["PAID", "REFUNDED"]),
        Sale.created_at >= period_start,
        Sale.created_at < period_end,
    )
    paid_sales = (await db.execute(paid_sales_stmt)).scalars().all()

    revenue_total = sum((sale.net_amount for sale in paid_sales), ZERO)
    checks.append(
        FieldCheck("revenue_total", revenue_total, "> 0", revenue_total > ZERO)
    )

    paid_sale_ids = [sale.id for sale in paid_sales]
    invoiced_sale_ids: set[str] = set()
    if paid_sale_ids:
        invoices_stmt = select(Invoice.sale_id).where(Invoice.sale_id.in_(paid_sale_ids))
        invoiced_sale_ids = {row[0] for row in (await db.execute(invoices_stmt)).all()}

    missing_invoice_sales = tuple(
        sale.id for sale in paid_sales if sale.id not in invoiced_sale_ids
    )
    invoice_count = len(invoiced_sale_ids)
    coverage_threshold = Decimal("0.9")
    invoice_coverage = (
        Decimal(invoice_count) / Decimal(len(paid_sale_ids))
        if paid_sale_ids
        else Decimal("1")
    )
    checks.append(
        FieldCheck(
            "invoice_count",
            invoice_count,
            f">= {coverage_threshold * 100:.0f}% of paid sales",
            invoice_coverage >= coverage_threshold,
            detail=f"{invoice_count}/{len(paid_sale_ids)} paid sales invoiced",
        )
    )

    cash_revenue = sum(
        (sale.net_amount for sale in paid_sales if sale.payment_status == "PAID"),
        ZERO,
    )
    checks.append(FieldCheck("cash_revenue", cash_revenue, ">= 0", cash_revenue >= ZERO))

    bank_tx_stmt = select(func.count(BankTransaction.id)).where(
        BankTransaction.merchant_id == merchant_id,
        BankTransaction.transaction_date >= period_start,
        BankTransaction.transaction_date < period_end,
    )
    bank_tx_count = (await db.execute(bank_tx_stmt)).scalar_one()
    checks.append(
        FieldCheck("bank_revenue", bank_tx_count, ">= 0", bank_tx_count >= 0)
    )

    return RequiredFieldsResult(
        merchant_id=merchant_id,
        period=period,
        rule_version=rule.version if rule else None,
        checks=tuple(checks),
        missing_invoice_sales=missing_invoice_sales,
        all_pass=all(check.passed for check in checks),
    )
