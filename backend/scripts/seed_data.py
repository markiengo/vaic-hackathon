"""Seed the TaxLens demo dataset (product.md §17 / docs/04-delivery/00-work-split.md).

Populates one merchant (Salon Hoa) with a full month of July 2026 activity:

- 1 merchant, 1 store, 1 device, 5 users, 10 products
- 30 sales: 15 paid by bank transfer with a payment reference (exact-match
  candidates), 3 paid by bank transfer with no reference (fuzzy-match
  candidates), 2 unpaid sales that share one ambiguous amount, 8 paid by
  cash, 2 plain unpaid
- 23 bank_transactions: the 15 exact-match transfers, 1 refund against one
  of them, 3 fuzzy transfers, 2 ambiguous same-amount transfers, and 2
  non-revenue transfers (an internal/owner transfer and a supplier payment)
- 1 cash session with a -120,000 VND discrepancy
- 28 invoices (2 of the 8 cash sales are deliberately left un-invoiced)
- 1 APPROVED tax rule version (2026.07)

bank_transactions use the same `SEPAY-{id}` canonical ID / bare source_id
convention as the live webhook handler in `app/adapters/sepay.py`, so seeded
rows and any real webhook-inserted rows share one consistent ID scheme.

Only bank_transactions, payment_intents, cash records, invoices, and sales
are inserted here — reconciliation (payment_allocations, exceptions) is not
run by this script. That is P1/P2's Sprint 2 integration against this raw,
ingested data; pre-computing it here would just be redone (and could
silently diverge) once the real matching engine runs against these rows.

Usage:
    python scripts/seed_data.py            # seed once; aborts if M001 exists
    python scripts/seed_data.py --reset     # wipe all TaxLens data, then seed

Also importable (e.g. from tests/conftest.py):
    from scripts.seed_data import seed
    await seed(reset=True)
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, func, select

from app.adapters import invoice as invoice_adapter
from app.adapters import shb
from app.adapters.sepay import normalize_note, split_sender_and_note
from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models.agent import AgentRun, AuditEvent, ToolCall
from app.models.cash import CashSession
from app.models.invoice import Invoice
from app.models.merchant import Device, Merchant, Store
from app.models.notification import Notification
from app.models.payment import PaymentAllocation, PaymentIntent
from app.models.product import Product
from app.models.reconciliation import ExceptionRecord, ReconciliationCase
from app.models.sale import Sale, SaleLine
from app.models.tax import TaxClassification, TaxRuleVersion
from app.models.transaction import BankTransaction
from app.models.user import User

MERCHANT_ID = "M001"
STORE_ID = "S001"
DEVICE_ID = "D001"
ACCOUNT_NUMBER = "0778478888"
PERIOD_YEAR = 2026
PERIOD_MONTH = 7


def _dt(day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(PERIOD_YEAR, PERIOD_MONTH, day, hour, minute, tzinfo=timezone.utc)


async def reset_all(db) -> None:
    """Delete all TaxLens rows in FK-safe (child-first) order."""

    for model in (
        Notification,
        AuditEvent,
        ToolCall,
        AgentRun,
        ExceptionRecord,
        ReconciliationCase,
        TaxClassification,
        TaxRuleVersion,
        Invoice,
        PaymentAllocation,
        CashSession,
        PaymentIntent,
        BankTransaction,
        SaleLine,
        Sale,
        Product,
        Device,
        User,
        Store,
        Merchant,
    ):
        await db.execute(delete(model))
    await db.commit()


async def seed_merchant_and_org(db) -> None:
    db.add(
        Merchant(
            id=MERCHANT_ID,
            name="Salon Hoa",
            business_type="salon",
            business_category="beauty_services",
            tax_id="8012345678",
            contact_phone="0901234567",
            contact_email="salonhoa@gmail.com",
            status="ACTIVE",
        )
    )
    await db.flush()

    db.add(
        Store(
            id=STORE_ID,
            merchant_id=MERCHANT_ID,
            name="Salon Hoa - Chi nhánh Quận 1",
            address="12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
            phone="0281234567",
        )
    )
    await db.flush()

    db.add(
        Device(
            id=DEVICE_ID,
            store_id=STORE_ID,
            name="iPad quầy thu ngân",
            device_type="tablet",
            is_active=True,
        )
    )

    users = [
        User(
            id="U001",
            name="Đỗ Minh Admin",
            email="admin@shb.com.vn",
            role="admin",
            merchant_id=None,
            password_hash=hash_password("TaxLensDemo!2026"),
        ),
        User(
            id="U002",
            name="Trần Văn Long",
            email="long.ops@shb.com.vn",
            role="ops_staff",
            merchant_id=None,
            password_hash=hash_password("TaxLensDemo!2026"),
        ),
        User(
            id="U003",
            name="Phạm Văn Đức",
            email="duc.rm@shb.com.vn",
            role="rm",
            merchant_id=None,
            password_hash=hash_password("TaxLensDemo!2026"),
        ),
        User(
            id="U004",
            name="Vũ Thị Lan",
            email="lan.compliance@shb.com.vn",
            role="compliance",
            merchant_id=None,
            password_hash=hash_password("TaxLensDemo!2026"),
        ),
        User(
            id="U005",
            name="Nguyễn Thị Hương",
            email="huong.salonhoa@gmail.com",
            role="merchant",
            merchant_id=MERCHANT_ID,
            password_hash=hash_password("TaxLensDemo!2026"),
        ),
    ]
    for user in users:
        db.add(user)

    products = [
        Product(id="P001", merchant_id=MERCHANT_ID, name="Cắt tóc nữ", category="hair", price=Decimal("150000"), is_service=True),
        Product(id="P002", merchant_id=MERCHANT_ID, name="Cắt tóc nam", category="hair", price=Decimal("100000"), is_service=True),
        Product(id="P003", merchant_id=MERCHANT_ID, name="Nhuộm tóc", category="hair", price=Decimal("450000"), is_service=True),
        Product(id="P004", merchant_id=MERCHANT_ID, name="Uốn tóc", category="hair", price=Decimal("600000"), is_service=True),
        Product(id="P005", merchant_id=MERCHANT_ID, name="Gội đầu dưỡng sinh", category="hair", price=Decimal("80000"), is_service=True),
        Product(id="P006", merchant_id=MERCHANT_ID, name="Chăm sóc da mặt", category="skincare", price=Decimal("350000"), is_service=True),
        Product(id="P007", merchant_id=MERCHANT_ID, name="Massage thư giãn", category="spa", price=Decimal("300000"), is_service=True),
        Product(id="P008", merchant_id=MERCHANT_ID, name="Làm nail", category="nail", price=Decimal("200000"), is_service=True),
        Product(id="P009", merchant_id=MERCHANT_ID, name="Trang điểm", category="makeup", price=Decimal("500000"), is_service=True),
        Product(id="P010", merchant_id=MERCHANT_ID, name="Dầu gội dưỡng tóc", category="retail", price=Decimal("180000"), is_service=False),
    ]
    for product in products:
        db.add(product)

    await db.flush()


async def _create_sale(
    db,
    sale_id: str,
    *,
    created_at: datetime,
    lines: list[tuple[str | None, str, int, Decimal]],
    discount: Decimal = Decimal("0"),
    staff_id: str = "U005",
) -> Sale:
    """lines: (product_id_or_None, product_name, quantity, unit_price)"""

    gross = sum((qty * price for _, _, qty, price in lines), Decimal("0"))
    net = gross - discount
    sale = Sale(
        id=sale_id,
        merchant_id=MERCHANT_ID,
        store_id=STORE_ID,
        device_id=DEVICE_ID,
        staff_id=staff_id,
        gross_amount=gross,
        discount=discount,
        net_amount=net,
        payment_status="UNPAID",
        invoice_status="PENDING",
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(sale)
    for product_id, name, qty, price in lines:
        db.add(
            SaleLine(
                sale_id=sale_id,
                product_id=product_id,
                product_name=name,
                quantity=qty,
                unit_price=price,
                line_total=qty * price,
            )
        )
    await db.flush()
    return sale


async def _insert_bank_tx(
    db,
    *,
    sepay_id: int,
    account_number: str,
    transaction_date: datetime,
    amount: Decimal,
    transaction_content: str,
    transaction_type: str = "in",
    payment_code: str | None = None,
    reference_number: str | None = None,
    sub_account: str | None = None,
    accumulated: Decimal | None = None,
) -> BankTransaction:
    """Insert one bank_transactions row using the same `SEPAY-{id}` canonical
    ID / bare source_id convention as the live webhook handler
    (`app.adapters.sepay.process_webhook`), so seeded and live-inserted rows
    are consistent.
    """

    sender_name, _ = split_sender_and_note(transaction_content)
    row = BankTransaction(
        id=f"SEPAY-{sepay_id}",
        merchant_id=MERCHANT_ID,
        account_number=account_number,
        amount=amount,
        sender_name=sender_name,
        raw_note=transaction_content,
        normalized_note=normalize_note(transaction_content),
        transaction_type=transaction_type,
        reference_number=reference_number,
        payment_code=payment_code,
        sub_account=sub_account,
        accumulated=accumulated,
        source="sepay",
        source_id=str(sepay_id),
        transaction_date=transaction_date,
    )
    db.add(row)
    await db.flush()
    return row


# (sale_id, day, hour, minute, [(product_id, name, qty, price)])
EXACT_MATCH_SALES = [
    ("ORDER-1842", 2, 9, 10, [("P001", "Cắt tóc nữ", 1, Decimal("150000")), ("P008", "Làm nail", 1, Decimal("200000"))]),
    ("ORDER-1843", 2, 10, 30, [("P003", "Nhuộm tóc", 1, Decimal("450000"))]),
    ("ORDER-1844", 3, 9, 45, [("P004", "Uốn tóc", 1, Decimal("600000"))]),
    ("ORDER-1845", 3, 14, 0, [("P006", "Chăm sóc da mặt", 1, Decimal("350000"))]),
    ("ORDER-1846", 4, 11, 15, [("P007", "Massage thư giãn", 1, Decimal("300000"))]),
    ("ORDER-1847", 4, 16, 20, [("P009", "Trang điểm", 1, Decimal("500000"))]),
    ("ORDER-1848", 5, 9, 0, [("P002", "Cắt tóc nam", 1, Decimal("100000"))]),
    ("ORDER-1849", 5, 13, 40, [("P005", "Gội đầu dưỡng sinh", 1, Decimal("80000"))]),
    ("ORDER-1850", 6, 10, 10, [("P010", "Dầu gội dưỡng tóc", 1, Decimal("180000"))]),  # refunded later
    ("ORDER-1851", 6, 15, 30, [("P001", "Cắt tóc nữ", 1, Decimal("150000"))]),
    ("ORDER-1852", 7, 9, 20, [("P008", "Làm nail", 1, Decimal("200000"))]),
    ("ORDER-1853", 7, 14, 50, [("P003", "Nhuộm tóc", 1, Decimal("450000"))]),
    ("ORDER-1854", 8, 10, 0, [("P007", "Massage thư giãn", 1, Decimal("300000"))]),
    ("ORDER-1855", 8, 16, 0, [("P009", "Trang điểm", 1, Decimal("500000"))]),
    ("ORDER-1856", 9, 11, 30, [("P006", "Chăm sóc da mặt", 1, Decimal("350000"))]),
]
REFUNDED_SALE_ID = "ORDER-1850"

# Sender is deliberately the same "NGUYEN VAN A" as the ORDER-1842 exact
# match (a regular customer who doesn't always use the QR reference) so
# these score the known-sender bonus. Without it, an exact-amount transfer
# arriving within a minute but with no reference and no identifier only
# reaches score 70 under app.services.matching's weights — short of the
# 75 HUMAN_CONFIRM threshold, so it would fall through to an unlinked
# NO_MATCH instead of a reviewable candidate. That's correct, conservative
# engine behavior (P1 owns tuning it) — this is a seed-data fix, not a
# workaround for a bug.
FUZZY_MATCH_SALES = [
    ("ORDER-1857", 10, 9, 15, [(None, "Combo chăm sóc tóc", 1, Decimal("620000"))], "NGUYEN VAN A", "chuyen khoan tien cat toc hom nay"),
    ("ORDER-1858", 10, 15, 0, [(None, "Combo trang điểm + gội đầu", 1, Decimal("275000"))], "NGUYEN VAN A", "ck tien lam dep"),
    ("ORDER-1859", 11, 10, 45, [(None, "Combo chăm sóc da + nail", 1, Decimal("430000"))], "NGUYEN VAN A", "thanh toan dich vu salon"),
]

AMBIGUOUS_AMOUNT = Decimal("85000")
AMBIGUOUS_SALES = [
    ("ORDER-1860", 12, 9, 0),
    ("ORDER-1861", 12, 9, 5),
]

CASH_SALES = [
    ("ORDER-1862", 13, 9, 0, [("P004", "Uốn tóc", 1, Decimal("600000"))]),
    ("ORDER-1863", 13, 11, 0, [("P009", "Trang điểm", 1, Decimal("500000"))]),
    ("ORDER-1864", 13, 13, 0, [("P003", "Nhuộm tóc", 1, Decimal("450000"))]),
    ("ORDER-1865", 13, 14, 30, [("P004", "Uốn tóc", 1, Decimal("600000")), ("P005", "Gội đầu dưỡng sinh", 1, Decimal("100000"))]),
    ("ORDER-1866", 13, 15, 30, [("P006", "Chăm sóc da mặt", 1, Decimal("350000")), ("P008", "Làm nail", 1, Decimal("200000"))]),
    ("ORDER-1867", 13, 16, 30, [("P002", "Cắt tóc nam", 1, Decimal("100000")), ("P005", "Gội đầu dưỡng sinh", 1, Decimal("300000"))]),
    ("ORDER-1868", 13, 17, 15, [("P009", "Trang điểm", 1, Decimal("500000")), ("P007", "Massage thư giãn", 1, Decimal("300000"))]),
    ("ORDER-1869", 13, 18, 0, [("P001", "Cắt tóc nữ", 1, Decimal("150000")), ("P008", "Làm nail", 1, Decimal("200000")), ("P010", "Dầu gội dưỡng tóc", 1, Decimal("150000"))]),
]
CASH_MISSING_INVOICE_IDS = {"ORDER-1868", "ORDER-1869"}

PLAIN_UNPAID_SALES = [
    ("ORDER-1870", 15, 17, 0, [("P003", "Nhuộm tóc", 1, Decimal("450000"))]),
    ("ORDER-1871", 16, 18, 0, [("P004", "Uốn tóc", 1, Decimal("600000"))]),
]


def _pay_ref(seed: int) -> str:
    # Deterministic 6-char [A-Z0-9] token satisfying PAY-[A-Z0-9]{6}.
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    token = []
    n = seed
    for _ in range(6):
        token.append(alphabet[n % len(alphabet)])
        n //= len(alphabet)
    return "PAY-" + "".join(token)


async def seed_sales_and_bank_transactions(db) -> dict[str, Sale]:
    sales: dict[str, Sale] = {}

    # --- Exact-match group: sale + payment_intent + matching bank_transaction ---
    for index, (sale_id, day, hour, minute, lines) in enumerate(EXACT_MATCH_SALES):
        created_at = _dt(day, hour, minute)
        sale = await _create_sale(db, sale_id, created_at=created_at, lines=lines)
        sales[sale_id] = sale

        pay_ref = "PAY-A8F21X" if sale_id == "ORDER-1842" else _pay_ref(1000 + index)
        intent = PaymentIntent(
            id=pay_ref,
            sale_id=sale_id,
            merchant_id=MERCHANT_ID,
            amount=sale.net_amount,
            status="PENDING",
            expires_at=created_at + timedelta(minutes=15),
            created_at=created_at,
        )
        db.add(intent)
        await db.flush()

        tx_time = created_at + timedelta(minutes=3)
        if sale_id == "ORDER-1842":
            # Documented fixture (docs/05-domain/02-algorithm.md): reference
            # carried in the free-text note, not the SePay 'code' field.
            await _insert_bank_tx(
                db,
                sepay_id=902194810,
                account_number=ACCOUNT_NUMBER,
                transaction_date=tx_time,
                amount=sale.net_amount,
                transaction_content=f"NGUYEN VAN A chuyen tien {pay_ref}",
                accumulated=Decimal("1200541768"),
            )
        else:
            await _insert_bank_tx(
                db,
                sepay_id=902194900 + index,
                account_number=ACCOUNT_NUMBER,
                transaction_date=tx_time,
                amount=sale.net_amount,
                transaction_content="KHACH HANG chuyen khoan thanh toan dich vu",
                payment_code=pay_ref,
                accumulated=Decimal("1200541768") + sale.net_amount,
            )

    # --- Refund against ORDER-1850 ---
    refunded_sale = sales[REFUNDED_SALE_ID]
    refund_intent_stmt = select(PaymentIntent).where(PaymentIntent.sale_id == REFUNDED_SALE_ID)
    refund_intent = (await db.execute(refund_intent_stmt)).scalar_one()
    refund_time = refunded_sale.created_at + timedelta(days=1, hours=2)
    await _insert_bank_tx(
        db,
        sepay_id=902194950,
        account_number=ACCOUNT_NUMBER,
        transaction_date=refund_time,
        amount=-refunded_sale.net_amount,
        transaction_content=f"HOAN TIEN {refund_intent.id} khach doi tra hang",
        transaction_type="out",
        payment_code=refund_intent.id,
    )

    # --- Fuzzy-match group: sale with no payment reference ---
    for sepay_id, (sale_id, day, hour, minute, lines, sender, note) in enumerate(FUZZY_MATCH_SALES, start=902194960):
        created_at = _dt(day, hour, minute)
        sale = await _create_sale(db, sale_id, created_at=created_at, lines=lines)
        sales[sale_id] = sale

        # Under 1 minute: scores the <1min time tier (+20, not +10) —
        # combined with the known-sender bonus this reaches HUMAN_CONFIRM.
        tx_time = created_at + timedelta(seconds=45)
        await _insert_bank_tx(
            db,
            sepay_id=sepay_id,
            account_number=ACCOUNT_NUMBER,
            transaction_date=tx_time,
            amount=sale.net_amount,
            transaction_content=f"{sender} {note}",
        )

    # --- Ambiguous same-amount group: two unpaid sales, two unreferenced transfers ---
    for sale_id, day, hour, minute in AMBIGUOUS_SALES:
        created_at = _dt(day, hour, minute)
        sale = await _create_sale(
            db,
            sale_id,
            created_at=created_at,
            lines=[(None, "Gội đầu + sấy", 1, AMBIGUOUS_AMOUNT)],
        )
        sales[sale_id] = sale

    ambiguous_tx_time = _dt(*AMBIGUOUS_SALES[0][1:])
    # Documented fixture (docs/05-domain/02-algorithm.md): empty note, 85,000.
    await _insert_bank_tx(
        db,
        sepay_id=902194820,
        account_number=ACCOUNT_NUMBER,
        transaction_date=ambiguous_tx_time + timedelta(minutes=10),
        amount=AMBIGUOUS_AMOUNT,
        transaction_content="",
    )
    await _insert_bank_tx(
        db,
        sepay_id=902194821,
        account_number=ACCOUNT_NUMBER,
        transaction_date=ambiguous_tx_time + timedelta(minutes=15),
        amount=AMBIGUOUS_AMOUNT,
        transaction_content="chuyen khoan 85000",
    )

    # --- Non-revenue transactions: no matching sale ---
    # Documented fixture: owner/relative transfer, no order, suggested internal_transfer.
    await _insert_bank_tx(
        db,
        sepay_id=902194815,
        account_number=ACCOUNT_NUMBER,
        transaction_date=_dt(14, 10, 0),
        amount=Decimal("5000000"),
        transaction_content="ck cho em",
    )

    # Supplier/purchase payment note (product.md §10 example): not revenue.
    await _insert_bank_tx(
        db,
        sepay_id=902194970,
        account_number=ACCOUNT_NUMBER,
        transaction_date=_dt(14, 15, 30),
        amount=Decimal("2300000"),
        transaction_content="NGUYEN SUPPLIER nhap hang 20/10",
    )

    # --- Cash sales ---
    # app.services.cash_reconciliation.reconcile_cash_session computes
    # "cash sales" by summing payment_allocations rows with
    # bank_transaction_id IS NULL for the store, within the cash session's
    # opened_at/closed_at window (by allocation created_at) — not by reading
    # Sale.payment_status directly. A cash sale must therefore also get a
    # PaymentAllocation row, with created_at pinned to the sale's own
    # timestamp (not the real seeding time) so it falls inside that window.
    for sale_id, day, hour, minute, lines in CASH_SALES:
        created_at = _dt(day, hour, minute)
        sale = await _create_sale(db, sale_id, created_at=created_at, lines=lines)
        sale.payment_status = "PAID"
        sales[sale_id] = sale
        db.add(
            PaymentAllocation(
                bank_transaction_id=None,
                payment_intent_id=None,
                sale_id=sale_id,
                amount=sale.net_amount,
                allocation_type="PAYMENT",
                match_method="MANUAL",
                created_at=created_at + timedelta(minutes=1),
            )
        )

    # --- Plain unpaid sales (no transaction at all yet) ---
    for sale_id, day, hour, minute, lines in PLAIN_UNPAID_SALES:
        created_at = _dt(day, hour, minute)
        sale = await _create_sale(db, sale_id, created_at=created_at, lines=lines)
        sales[sale_id] = sale

    await db.flush()
    return sales


async def seed_cash_session(db) -> None:
    cash_sales_total = sum(
        (
            db_sale_net
            for _, _, _, _, lines in CASH_SALES
            for db_sale_net in [sum((qty * price for _, _, qty, price in lines), Decimal("0"))]
        ),
        Decimal("0"),
    )
    assert cash_sales_total == Decimal("4500000"), cash_sales_total

    opening_cash = Decimal("1000000")
    cash_expenses = Decimal("300000")
    expected_cash = opening_cash + cash_sales_total - cash_expenses
    counted_cash = Decimal("5080000")
    discrepancy = counted_cash - expected_cash

    session = CashSession(
        store_id=STORE_ID,
        staff_id="U005",
        opening_cash=opening_cash,
        expected_cash=expected_cash,
        counted_cash=counted_cash,
        cash_expenses=cash_expenses,
        discrepancy=discrepancy,
        # app.services.cash_reconciliation.reconcile_cash_session hard-rejects
        # a non-zero discrepancy with no reason (DISCREPANCY_REASON_REQUIRED),
        # so this can't be left null even though the *cause* is genuinely
        # unknown at seed time — the placeholder says exactly that; a human
        # still has to investigate and resolve the CASH_DISCREPANCY exception.
        discrepancy_reason="Chưa xác định nguyên nhân — cần nhân viên xác nhận",
        status="RECONCILED",
        opened_at=_dt(13, 8, 0),
        closed_at=_dt(13, 20, 0),
    )
    db.add(session)
    await db.flush()


async def seed_invoices(db, sales: dict[str, Sale]) -> None:
    invoiced_ids = [
        sale_id
        for sale_id in sales
        if sale_id not in CASH_MISSING_INVOICE_IDS
    ]
    for sale_id in invoiced_ids:
        sale = sales[sale_id]
        await invoice_adapter.create_invoice(
            db,
            merchant_id=MERCHANT_ID,
            amount=sale.net_amount,
            sale_id=sale_id,
            invoice_date=sale.created_at + timedelta(hours=1),
        )
        sale.invoice_status = "ISSUED"
    await db.flush()


async def seed_tax_rule(db) -> None:
    db.add(
        TaxRuleVersion(
            version="2026.07",
            merchant_type="salon",
            business_category="beauty_services",
            effective_from=datetime(2021, 7, 1).date(),
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
                "revenue_total_formula": "sum(sale.net_amount where payment_status in (PAID, REFUNDED))",
                "invoice_coverage": "count(invoices) / count(sales where payment_status in (PAID, REFUNDED)) >= 0.9",
                "cash_session_required": "all cash_sessions.status = RECONCILED",
            },
            legal_source="Thông tư 40/2021/TT-BTC",
            approval_status="APPROVED",
            approved_by="compliance_lead",
            approved_at=datetime(2026, 7, 1, tzinfo=timezone.utc),
        )
    )
    await db.flush()


async def _counts(db) -> dict[str, int]:
    async def count(model):
        return (await db.execute(select(func.count()).select_from(model))).scalar_one()

    return {
        "merchants": await count(Merchant),
        "stores": await count(Store),
        "devices": await count(Device),
        "users": await count(User),
        "products": await count(Product),
        "sales": await count(Sale),
        "bank_transactions": await count(BankTransaction),
        "cash_sessions": await count(CashSession),
        "invoices": await count(Invoice),
        "payment_intents": await count(PaymentIntent),
        "tax_rule_versions": await count(TaxRuleVersion),
        "cases": await count(ReconciliationCase),
        "exceptions": await count(ExceptionRecord),
    }


def print_summary(counts: dict[str, int]) -> None:
    print("Seed summary:")
    for label, value in counts.items():
        print(f"  {label:<18} = {value}")


async def seed_portfolio_merchants(db) -> None:
    """Create additional portfolio merchants with cases for SHB ops view.

    These merchants have minimal data (profile + a case with exceptions)
    so the SHB operations dashboard shows a realistic portfolio.
    """
    portfolio_merchants = [
        {"id": "M002", "name": "Cafe Mỹ Tho", "business_type": "fnb", "business_category": "food_beverage", "tax_id": "8012345679", "status": "ACTIVE"},
        {"id": "M003", "name": "Bakery Hương Mai", "business_type": "fnb", "business_category": "bakery", "tax_id": "8012345680", "status": "ACTIVE"},
        {"id": "M004", "name": "Pharmacy Long Châu", "business_type": "retail", "business_category": "pharmacy", "tax_id": "8012345681", "status": "ACTIVE"},
        {"id": "M005", "name": "Fashion Store LM", "business_type": "retail", "business_category": "fashion_retail", "tax_id": "8012345682", "status": "ACTIVE"},
        {"id": "M006", "name": "Electronics Zone", "business_type": "retail", "business_category": "electronics", "tax_id": "8012345683", "status": "ACTIVE"},
        {"id": "M007", "name": "Spa Thiên An", "business_type": "salon", "business_category": "beauty_services", "tax_id": "8012345684", "status": "ACTIVE"},
        {"id": "M008", "name": "Bookstore Tri Thức", "business_type": "retail", "business_category": "books", "tax_id": "8012345685", "status": "INACTIVE"},
        {"id": "M009", "name": "Gym Fitness Pro", "business_type": "service", "business_category": "fitness", "tax_id": "8012345686", "status": "ACTIVE"},
    ]

    for m in portfolio_merchants:
        db.add(Merchant(
            id=m["id"],
            name=m["name"],
            business_type=m["business_type"],
            business_category=m["business_category"],
            tax_id=m["tax_id"],
            contact_phone="0901234567",
            contact_email=f"contact@{m['id'].lower()}.vn",
            status=m["status"],
        ))
    await db.flush()

    # Create cases for some merchants
    cases_data = [
        {"id": "CASE-M002-2026-07", "merchant_id": "M002", "priority": "HIGH", "status": "OPEN",
         "exceptions": [{"type": "unmatched_transaction", "suggestion": {"classification": "revenue", "confidence": 0.72, "reason": "Giao dịch 15M chưa khớp đơn hàng"}}]},
        {"id": "CASE-M004-2026-07", "merchant_id": "M004", "priority": "MEDIUM", "status": "ASSIGNED",
         "assigned_rm": "U003",
         "exceptions": [{"type": "missing_invoice", "suggestion": {"classification": "needs_review", "confidence": 0.85, "reason": "3 đơn hàng thiếu hóa đơn"}}]},
        {"id": "CASE-M005-2026-07", "merchant_id": "M005", "priority": "LOW", "status": "OPEN",
         "exceptions": [{"type": "cash_discrepancy", "suggestion": {"classification": "internal_transfer", "confidence": 0.91, "reason": "Chênh lệch 200K VND trong ca sáng"}}]},
        {"id": "CASE-M007-2026-07", "merchant_id": "M007", "priority": "MEDIUM", "status": "OPEN",
         "exceptions": [
             {"type": "unmatched_transaction", "suggestion": {"classification": "revenue", "confidence": 0.68, "reason": "Giao dịch 500K không có reference"}},
             {"type": "missing_invoice", "suggestion": {"classification": "needs_review", "confidence": 0.80, "reason": "2 đơn thiếu hóa đơn"}},
         ]},
        {"id": "CASE-M009-2026-07", "merchant_id": "M009", "priority": "HIGH", "status": "ASSIGNED",
         "assigned_rm": "U003",
         "exceptions": [{"type": "invoice_issue", "suggestion": {"classification": "revenue", "confidence": 0.95, "reason": "Hóa đơn sai MST khách hàng"}}]},
    ]

    for case_data in cases_data:
        case = ReconciliationCase(
            id=case_data["id"],
            merchant_id=case_data["merchant_id"],
            period="2026-07",
            status=case_data["status"],
            priority=case_data["priority"],
            assigned_rm_id=case_data.get("assigned_rm"),
            tax_rule_version="2026.07",
        )
        db.add(case)
        await db.flush()

        for ex_data in case_data["exceptions"]:
            db.add(ExceptionRecord(
                case_id=case_data["id"],
                exception_type=ex_data["type"],
                ai_suggestion=ex_data["suggestion"],
                status="PENDING",
            ))

    await db.flush()


async def seed_notifications(db) -> None:
    """Create demo notifications for merchant and ops users."""
    notifs = [
        # Merchant notifications (U005 = merchant user)
        {"user_id": "U005", "merchant_id": "M001", "type": "exception", "title": "3 ngoại lệ cần xác nhận", "body": "Có 3 giao dịch chưa khớp trong kỳ 07/2026.", "link": "/exceptions?period=2026-07", "is_read": False},
        {"user_id": "U005", "merchant_id": "M001", "type": "agent_run", "title": "Agent đã hoàn tất phân tích", "body": "Agent đối soát đã phân loại 20/23 giao dịch.", "link": "/assistant", "is_read": False},
        {"user_id": "U005", "merchant_id": "M001", "type": "system", "title": "Chào mừng đến TaxLens", "body": "Tài khoản demo đã sẵn sàng. Kỳ đối soát tháng 7/2026 đang mở.", "link": "/dashboard", "is_read": True},
        # Ops notifications (U002 = ops_staff user)
        {"user_id": "U002", "merchant_id": None, "type": "case_update", "title": "Case mới từ Cafe Mỹ Tho", "body": "CASE-M002-2026-07: Giao dịch 15M chưa khớp đơn hàng.", "link": "/ops/cases", "is_read": False},
        {"user_id": "U002", "merchant_id": None, "type": "case_update", "title": "Case ưu tiên cao từ Gym Fitness Pro", "body": "CASE-M009-2026-07: Hóa đơn sai MST khách hàng.", "link": "/ops/cases", "is_read": False},
        {"user_id": "U002", "merchant_id": None, "type": "system", "title": "Portfolio cập nhật", "body": "9 merchants đang hoạt động, 5 cases đang mở.", "link": "/ops", "is_read": True},
    ]
    for n in notifs:
        db.add(Notification(**n))
    await db.flush()


async def seed(reset: bool = True) -> dict[str, int]:
    """Seed the demo dataset. Importable entrypoint (e.g. from conftest.py).

    ``reset=True`` (the default for test/CI use) always wipes existing
    TaxLens data first, for a clean, reproducible dataset. The CLI defaults
    to ``reset=False`` so an interactive run doesn't destroy data by
    accident — pass ``--reset`` explicitly there.
    """

    async with AsyncSessionLocal() as db:
        existing = await db.get(Merchant, MERCHANT_ID)
        if existing is not None:
            if not reset:
                print(f"Merchant {MERCHANT_ID} already exists — pass --reset to reseed.")
                return await _counts(db)
            await reset_all(db)

        await seed_merchant_and_org(db)
        sales = await seed_sales_and_bank_transactions(db)
        await seed_cash_session(db)
        await seed_invoices(db, sales)
        await seed_tax_rule(db)
        await seed_portfolio_merchants(db)
        await seed_notifications(db)
        await db.commit()

        counts = await _counts(db)
        print_summary(counts)
        return counts


async def _cli_main(reset: bool) -> None:
    await seed(reset=reset)
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the TaxLens demo dataset.")
    parser.add_argument("--reset", action="store_true", help="wipe all TaxLens data before seeding")
    args = parser.parse_args()
    asyncio.run(_cli_main(reset=args.reset))
