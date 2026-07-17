"""Seed data script — populates the database with demo data for TaxLens MVP.

Creates:
  - 1 merchant (M001, Salon Hoa)
  - 1 store (S001)
  - 1 device (D001)
  - 1 user (U001, rm)
  - 5 products (services)
  - 30 sales (mix of UNPAID/PAID/PARTIAL, July 2026)
  - 5 payment_intents (linked to 5 unpaid sales)
  - 23 bank_transactions (various matching scenarios)
  - 1 cash_session (CLOSED, not RECONCILED)
  - 28 invoices (2 intentionally missing)
  - 1 tax_rule_version (2026.07, APPROVED)

Usage:
    cd backend
    py -3.12 scripts/seed_data.py
"""

from __future__ import annotations

import asyncio
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

# Ensure backend dir is on sys.path so `app` package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from app.core.database import AsyncSessionLocal, engine
from app.models.cash import CashSession
from app.models.invoice import Invoice
from app.models.merchant import Device, Merchant, Store
from app.models.payment import PaymentIntent
from app.models.product import Product
from app.models.sale import Sale, SaleLine
from app.models.tax import TaxRuleVersion
from app.models.transaction import BankTransaction
from app.models.user import User


async def clear_data(session):
    """Delete all existing data in FK-safe order."""
    tables = [
        "payment_allocations",
        "payment_intents",
        "invoices",
        "cash_sessions",
        "bank_transactions",
        "sale_lines",
        "sales",
        "tax_classifications",
        "tax_rule_versions",
        "products",
        "devices",
        "stores",
        "users",
        "merchants",
        "reconciliation_cases",
        "exceptions",
        "agent_runs",
        "tool_calls",
        "audit_events",
    ]
    for table in tables:
        await session.execute(text(f'DELETE FROM "{table}"'))
    await session.commit()


async def seed():
    session = AsyncSessionLocal()

    try:
        print("Clearing existing data...")
        await clear_data(session)

        # --- Merchant ---
        merchant = Merchant(
            id="M001",
            name="Salon Hoa",
            business_type="salon",
            business_category="beauty_services",
            tax_id="0123456789",
            contact_phone="0901234567",
            contact_email="salonhoa@example.com",
            status="ACTIVE",
        )
        session.add(merchant)
        await session.flush()

        # --- Store ---
        store = Store(
            id="S001",
            merchant_id="M001",
            name="Salon Hoa - Quan 1",
            address="123 Nguyen Hue, Q1, TP.HCM",
            phone="0901234567",
        )
        session.add(store)
        await session.flush()

        # --- Device ---
        device = Device(
            id="D001",
            store_id="S001",
            name="Tablet POS",
            device_type="tablet",
            is_active=True,
        )
        session.add(device)
        await session.flush()

        # --- User ---
        user = User(
            id="U001",
            name="Nguyen Van A",
            email="nguyenvana@salonhoa.com",
            role="rm",
            merchant_id="M001",
            is_active=True,
        )
        session.add(user)
        await session.flush()

        # --- Products (5 services) ---
        products_data = [
            ("P001", "Cat toc", Decimal("50000")),
            ("P002", "Uon toc", Decimal("150000")),
            ("P003", "Nhuom toc", Decimal("300000")),
            ("P004", "Goi dau", Decimal("80000")),
            ("P005", "Massage da", Decimal("200000")),
        ]
        products = {}
        for pid, name, price in products_data:
            p = Product(
                id=pid,
                merchant_id="M001",
                name=name,
                category="beauty_services",
                price=price,
                is_service=True,
                is_active=True,
            )
            session.add(p)
            products[pid] = p
        await session.flush()

        # --- Sales (30) ---
        # Mix of UNPAID/PAID/PARTIAL, spread across July 2026
        # Sales 1-15: PAID, 16-20: PARTIAL, 21-30: UNPAID
        sales = {}
        sale_amounts = [
            50000, 80000, 150000, 200000, 50000,   # 1-5
            300000, 80000, 50000, 150000, 200000,  # 6-10
            100000, 50000, 300000, 150000, 80000,  # 11-15
            200000, 150000, 300000, 50000, 100000, # 16-20
            80000, 200000, 150000, 50000, 300000,  # 21-25
            100000, 150000, 80000, 200000, 50000,  # 26-30
        ]
        payment_statuses = (
            ["PAID"] * 15 +
            ["PARTIAL"] * 5 +
            ["UNPAID"] * 10
        )

        for i in range(30):
            sale_id = f"ORDER-{i+1:04d}"
            amount = Decimal(str(sale_amounts[i]))
            status = payment_statuses[i]
            day = (i // 2) + 1  # spread across days 1-15
            created = datetime(2026, 7, day, 10 + (i % 8), (i * 7) % 60, tzinfo=timezone.utc)

            sale = Sale(
                id=sale_id,
                merchant_id="M001",
                store_id="S001",
                device_id="D001",
                staff_id="U001",
                gross_amount=amount,
                discount=Decimal("0"),
                net_amount=amount,
                payment_status=status,
                invoice_status="PENDING",
                created_at=created,
                updated_at=created,
            )
            session.add(sale)
            sales[sale_id] = sale

            # Add a sale line for each sale (pick a product cyclically)
            pid = list(products.keys())[i % 5]
            session.add(SaleLine(
                sale_id=sale_id,
                product_id=pid,
                product_name=products[pid].name,
                quantity=1,
                unit_price=amount,
                line_total=amount,
            ))

        await session.flush()

        # --- Payment Intents (5) — linked to 5 unpaid sales (ORDER-0021 to ORDER-0025) ---
        for i in range(5):
            sale_id = f"ORDER-{21+i:04d}"
            pi_id = f"PAY-{100001+i:06d}"
            pi = PaymentIntent(
                id=pi_id,
                sale_id=sale_id,
                merchant_id="M001",
                amount=Decimal(str(sale_amounts[20 + i])),
                status="PENDING",
                expires_at=datetime(2026, 7, 31, 23, 59, 59, tzinfo=timezone.utc),
                created_at=datetime(2026, 7, 10 + i, 9, 0, 0, tzinfo=timezone.utc),
            )
            session.add(pi)
        await session.flush()

        # --- Bank Transactions (23) ---
        # SEPAY-0001 to SEPAY-0005: payment_code matching payment intents
        payment_codes = ["PAY-100001", "PAY-100002", "PAY-100003", "PAY-100004", "PAY-100005"]
        for i in range(5):
            tx_id = f"SEPAY-{i+1:04d}"
            session.add(BankTransaction(
                id=tx_id,
                merchant_id="M001",
                account_number="99998888777766",
                amount=Decimal(str(sale_amounts[20 + i])),
                raw_note=f"Chuyen khoan {payment_codes[i]} Salon Hoa",
                transaction_type="in",
                transaction_date=datetime(2026, 7, 10 + i, 10, 30, tzinfo=timezone.utc),
                reference_number=payment_codes[i],
                payment_code=payment_codes[i],
                source="sepay",
                source_id=str(i + 1),
                accumulated=Decimal(str(5000000 + (i + 1) * 100000)),
            ))

        # SEPAY-0006 to SEPAY-0015: amount matching unpaid sales but no reference
        unpaid_amounts = [80000, 200000, 150000, 50000, 300000, 100000, 150000, 80000, 200000, 50000]
        for i in range(10):
            tx_id = f"SEPAY-{i+6:04d}"
            session.add(BankTransaction(
                id=tx_id,
                merchant_id="M001",
                account_number="99998888777766",
                amount=Decimal(str(unpaid_amounts[i])),
                raw_note=f"KH chuyen tien lam dich vu Salon Hoa",
                transaction_type="in",
                transaction_date=datetime(2026, 7, 11 + i, 14, 0, tzinfo=timezone.utc),
                source="sepay",
                source_id=str(i + 6),
                accumulated=Decimal(str(6000000 + (i + 1) * 50000)),
            ))

        # SEPAY-0016 to SEPAY-0018: no matching amount (random amounts)
        random_amounts = [75000, 125000, 99999]
        for i in range(3):
            tx_id = f"SEPAY-{i+16:04d}"
            session.add(BankTransaction(
                id=tx_id,
                merchant_id="M001",
                account_number="99998888777766",
                amount=Decimal(str(random_amounts[i])),
                raw_note=f"Chuyen khoan khong xac dinh",
                transaction_type="in",
                transaction_date=datetime(2026, 7, 16 + i, 9, 15, tzinfo=timezone.utc),
                source="sepay",
                source_id=str(i + 16),
                accumulated=Decimal(str(7000000 + (i + 1) * 30000)),
            ))

        # SEPAY-0019 to SEPAY-0020: same amount pointing to same sale (duplicate-ish)
        for i in range(2):
            tx_id = f"SEPAY-{i+19:04d}"
            session.add(BankTransaction(
                id=tx_id,
                merchant_id="M001",
                account_number="99998888777766",
                amount=Decimal("150000"),
                raw_note=f"Chuyen khoan ORDER-0007 Salon Hoa",
                transaction_type="in",
                transaction_date=datetime(2026, 7, 18, 11 + i, 0, tzinfo=timezone.utc),
                source="sepay",
                source_id=str(i + 19),
                accumulated=Decimal(str(8000000 + (i + 1) * 150000)),
            ))

        # SEPAY-0021 to SEPAY-0023: internal transfers (transferType="out" or special notes)
        internal_notes = [
            "Chuyen tien noi bo chi hoat dong",
            "Tra luong nhan vien",
            "Chuyen tien qua tai khoan khac",
        ]
        for i in range(3):
            tx_id = f"SEPAY-{i+21:04d}"
            session.add(BankTransaction(
                id=tx_id,
                merchant_id="M001",
                account_number="99998888777766",
                amount=Decimal(str([500000, 2000000, 300000][i])),
                raw_note=internal_notes[i],
                transaction_type="out",
                transaction_date=datetime(2026, 7, 20 + i, 8, 0, tzinfo=timezone.utc),
                source="sepay",
                source_id=str(i + 21),
                accumulated=Decimal(str(9000000 + (i + 1) * 100000)),
            ))

        await session.flush()

        # --- Cash Session (1) — CLOSED, not RECONCILED ---
        session.add(CashSession(
            id=1,
            store_id="S001",
            staff_id="U001",
            opening_cash=Decimal("2000000"),
            expected_cash=Decimal("5200000"),
            counted_cash=Decimal("5080000"),
            cash_expenses=Decimal("0"),
            discrepancy=Decimal("-120000"),
            discrepancy_reason="Thieu tien khong xac dinh",
            status="CLOSED",
            opened_at=datetime(2026, 7, 1, 8, 0, 0, tzinfo=timezone.utc),
            closed_at=datetime(2026, 7, 15, 22, 0, 0, tzinfo=timezone.utc),
        ))
        await session.flush()

        # --- Invoices (28) — linked to 28 of 30 sales (ORDER-0001 to ORDER-0028) ---
        # ORDER-0029 and ORDER-0030 intentionally missing invoices
        for i in range(28):
            sale_id = f"ORDER-{i+1:04d}"
            inv_id = f"INV-{i+1:03d}"
            session.add(Invoice(
                id=inv_id,
                sale_id=sale_id,
                merchant_id="M001",
                invoice_number=f"HD-{i+1:03d}",
                amount=Decimal(str(sale_amounts[i])),
                invoice_date=datetime(2026, 7, (i // 2) + 1, 12, 0, 0, tzinfo=timezone.utc),
                status="ISSUED",
                source="mock_api",
                source_id=inv_id,
            ))
        await session.flush()

        # --- Tax Rule Version (1) ---
        session.add(TaxRuleVersion(
            version="2026.07",
            merchant_type="hộ_kinh_doanh",
            business_category="beauty_services",
            effective_from=date(2026, 7, 1),
            effective_to=None,
            required_fields=[
                "merchant_name",
                "tax_id",
                "revenue_total",
                "invoice_count",
                "cash_revenue",
                "bank_revenue",
            ],
            formula_or_validation={
                "revenue_total_formula": "sum(sale.net_amount where payment_status=PAID)",
                "invoice_coverage": "count(invoices) / count(sales where payment_status=PAID) >= 0.9",
                "cash_session_required": "all cash_sessions.status = RECONCILED",
            },
            legal_source="Thông tư 40/2021/TT-BTC",
            approval_status="APPROVED",
            approved_by="compliance_lead",
            approved_at=datetime(2026, 7, 1, 0, 0, 0, tzinfo=timezone.utc),
        ))
        await session.commit()

        # --- Summary ---
        from sqlalchemy import func as sa_func, select as sa_select
        counts = {}
        for model, label in [
            (Merchant, "merchants"), (Store, "stores"), (Device, "devices"),
            (User, "users"), (Product, "products"), (Sale, "sales"),
            (SaleLine, "sale_lines"), (PaymentIntent, "payment_intents"),
            (BankTransaction, "bank_transactions"), (CashSession, "cash_sessions"),
            (Invoice, "invoices"), (TaxRuleVersion, "tax_rule_versions"),
        ]:
            result = await session.scalar(
                sa_select(sa_func.count(model.id))
            )
            counts[label] = result

        print("\n=== Seed Data Summary ===")
        for label, count in counts.items():
            print(f"  {label}: {count}")

        expected = {
            "merchants": 1, "stores": 1, "devices": 1, "users": 1,
            "products": 5, "sales": 30, "sale_lines": 30,
            "payment_intents": 5, "bank_transactions": 23,
            "cash_sessions": 1, "invoices": 28, "tax_rule_versions": 1,
        }

        all_ok = True
        for label, expected_count in expected.items():
            if counts.get(label) != expected_count:
                print(f"  WARNING: {label} expected {expected_count}, got {counts.get(label)}")
                all_ok = False

        if all_ok:
            print("\nAll counts match expected values!")
        else:
            print("\nSome counts don't match!")

    finally:
        await session.close()
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())