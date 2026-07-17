"""Integration tests for the seed data script.

Verifies that seed_data.py populates the database with exact expected counts.
conftest.py runs seed_data before tests, so these tests verify the result.
"""

from __future__ import annotations

import pytest
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

pytestmark = pytest.mark.usefixtures("seeded_db")


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
    assert count == 1


async def test_seed_product_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(Product.id)))
    assert count == 5


async def test_seed_sales_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(Sale.id)))
    assert count == 30


async def test_seed_payment_intents_count():
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(PaymentIntent.id)))
    assert count == 5


async def test_seed_bank_transactions_count():
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
    assert merchant.tax_id == "0123456789"
    assert merchant.status == "ACTIVE"


async def test_seed_tax_rule_version_fields():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TaxRuleVersion).where(TaxRuleVersion.version == "2026.07")
        )
        rule = result.scalar_one()
    assert rule.merchant_type == "hộ_kinh_doanh"
    assert rule.business_category == "beauty_services"
    assert rule.approval_status == "APPROVED"
    assert rule.approved_by == "compliance_lead"
    assert rule.legal_source == "Thông tư 40/2021/TT-BTC"


async def test_seed_cash_session_status():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(CashSession).where(CashSession.id == 1))
        cash = result.scalar_one()
    assert cash.status == "CLOSED"
    assert cash.discrepancy == -120000


async def test_seed_two_sales_missing_invoices():
    """Verify that ORDER-0029 and ORDER-0030 have no invoices."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Invoice).where(Invoice.sale_id.in_(["ORDER-0029", "ORDER-0030"]))
        )
        invoices = result.scalars().all()
    assert len(invoices) == 0
