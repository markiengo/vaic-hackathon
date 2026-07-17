"""Integration tests for the seed data script.

Verifies that seed_data.py populates the database with exact expected counts.
conftest.py runs seed_data before tests, so these tests verify the result.
"""

from __future__ import annotations

from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.models.cash import CashSession
from app.models.invoice import Invoice
from app.models.merchant import Device, Merchant, Store
from app.models.payment import PaymentIntent
from app.models.product import Product
from app.models.sale import Sale
from app.models.tax import TaxRuleVersion
from app.models.transaction import BankTransaction
from app.models.user import User


async def test_seed_merchant_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(Merchant.id)))
    assert count == 1


async def test_seed_store_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(Store.id)))
    assert count == 1


async def test_seed_device_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(Device.id)))
    assert count == 1


async def test_seed_user_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(User.id)))
    assert count == 5


async def test_seed_product_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(Product.id)))
    assert count == 10


async def test_seed_sales_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(Sale.id)))
    assert count == 30


async def test_seed_payment_intents_count():
    """15 payment intents — one per exact-match bank-transfer sale."""
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(PaymentIntent.id)))
    assert count == 15


async def test_seed_bank_transactions_count():
    """15 exact + 1 refund + 3 fuzzy + 2 ambiguous + 2 non-revenue = 23."""
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(BankTransaction.id)))
    assert count == 23


async def test_seed_cash_session_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(CashSession.id)))
    assert count == 1


async def test_seed_invoices_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(Invoice.id)))
    assert count == 28


async def test_seed_tax_rule_version_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(TaxRuleVersion.id)))
    assert count == 1


async def test_seed_merchant_fields():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Merchant).where(Merchant.id == "M001"))
        merchant = result.scalar_one()
    assert merchant.name == "Salon Hoa"
    assert merchant.business_type == "salon"
    assert merchant.business_category == "beauty_services"
    assert merchant.tax_id == "8012345678"
    assert merchant.status == "ACTIVE"


async def test_seed_tax_rule_version_fields():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TaxRuleVersion).where(TaxRuleVersion.version == "2026.07")
        )
        rule = result.scalar_one()
    # merchant_type is "salon" (not "hộ_kinh_doanh") so it matches the
    # documented exit criterion `retrieve_tax_rules("salon", "beauty")`.
    assert rule.merchant_type == "salon"
    assert rule.business_category == "beauty_services"
    assert rule.approval_status == "APPROVED"
    assert rule.approved_by == "compliance_lead"
    assert rule.legal_source == "Thông tư 40/2021/TT-BTC"
    assert rule.effective_from.isoformat() == "2021-07-01"


async def test_seed_cash_session_status():
    """Matches the documented API example (docs/03-engineering/03-api-specifications.md
    API-POS-POST-004): a closed session with a discrepancy is still RECONCILED,
    not CLOSED — the discrepancy is a pending exception, not an unclosed session."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(CashSession))
        cash = result.scalars().one()
    assert cash.status == "RECONCILED"
    assert cash.discrepancy == -120000
    assert cash.opening_cash == 1000000
    assert cash.expected_cash == 5200000
    assert cash.counted_cash == 5080000


async def test_seed_two_sales_missing_invoices():
    """Exactly ORDER-1868 and ORDER-1869 (2 of the 8 cash sales) have no invoice.

    These are deliberately the two *cash* sales rather than two bank-transfer
    sales: bank-transfer sales stay UNPAID until Sprint 2's matching engine
    runs, so at seed time only cash sales are genuinely PAID — the scenario
    compliance.md describes ("đơn đã thu tiền nhưng thiếu hóa đơn") only
    applies to sales that have actually collected money.
    """
    async with AsyncSessionLocal() as session:
        all_sales = (await session.execute(select(Sale.id))).scalars().all()
        invoiced_sale_ids = {
            row[0]
            for row in (await session.execute(select(Invoice.sale_id))).all()
            if row[0] is not None
        }
    missing = set(all_sales) - invoiced_sale_ids
    assert missing == {"ORDER-1868", "ORDER-1869"}


async def test_seed_refund_transaction_matches_original_sale_amount():
    """The refund transaction (SEPAY-902194950) is negative and equals
    ORDER-1850's collected amount (180,000), keyed by the same payment
    reference so Sprint 2's matcher can find the original sale."""
    async with AsyncSessionLocal() as session:
        sale = await session.get(Sale, "ORDER-1850")
        intent_result = await session.execute(
            select(PaymentIntent).where(PaymentIntent.sale_id == "ORDER-1850")
        )
        intent = intent_result.scalar_one()
        refund = await session.get(BankTransaction, "SEPAY-902194950")

    assert refund is not None
    assert refund.amount == -sale.net_amount
    assert refund.transaction_type == "out"
    assert refund.payment_code == intent.id


async def test_seed_documented_fixtures_are_real_rows():
    """The literal fixtures from docs/05-domain/02-algorithm.md exist as
    real, queryable rows: SHB-902194810/PAY-A8F21X/350000 (exact match),
    SHB-902194815/"ck cho em"/5000000 (non-revenue), and
    SHB-902194820/empty-note/85000 (ambiguous)."""
    async with AsyncSessionLocal() as session:
        exact = await session.get(BankTransaction, "SEPAY-902194810")
        non_revenue = await session.get(BankTransaction, "SEPAY-902194815")
        ambiguous = await session.get(BankTransaction, "SEPAY-902194820")

    assert exact.amount == 350000
    assert exact.payment_code == "PAY-A8F21X" or "PAY-A8F21X" in (exact.raw_note or "")

    assert non_revenue.amount == 5000000
    assert non_revenue.raw_note == "ck cho em"

    assert ambiguous.amount == 85000
    assert ambiguous.raw_note == ""
