import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import TaxLensError, get_current_user
from app.models.cash import CashSession
from app.models.payment import PaymentIntent
from app.models.product import Product
from app.models.sale import Sale, SaleLine
from app.schemas.pos import (
    PosCashPaymentRequest,
    PosCashPaymentResponse,
    PosCashSessionCloseRequest,
    PosCashSessionCloseResponse,
    PosCashSessionFlatCloseRequest,
    PosCreateSaleRequest,
    PosCreateSaleResponse,
    PosPaymentIntentRequest,
    PosPaymentIntentResponse,
)

router = APIRouter(prefix="/pos", tags=["pos"])

_QR_MOCK_PREFIX = "000201010212382300069704220"


@router.get("/products")
async def list_products(
    merchant_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[dict]:
    result = await db.execute(
        select(Product)
        .where(Product.merchant_id == merchant_id, Product.is_active == True)
        .order_by(Product.name.asc())
    )
    products = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "price": float(p.price) if p.price else 0,
            "is_service": p.is_service,
        }
        for p in products
    ]


@router.get("/cash-session")
async def get_active_cash_session(
    store_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(CashSession)
        .where(CashSession.store_id == store_id, CashSession.status == "OPEN")
        .order_by(CashSession.opened_at.desc())
        .limit(1)
    )
    s = result.scalars().first()
    if not s:
        return {"status": "no active session"}
    return {
        "id": s.id,
        "opening_cash": float(s.opening_cash),
        "expected_cash": float(s.expected_cash) if s.expected_cash is not None else None,
        "status": s.status,
        "opened_at": s.opened_at.isoformat() if s.opened_at else None,
    }


@router.post("/sales", status_code=201, response_model=PosCreateSaleResponse)
async def create_sale(
    body: PosCreateSaleRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> PosCreateSaleResponse:
    # Anti-tampering: verify unit_price against product catalog when product_id given
    product_ids = [item.product_id for item in body.items if item.product_id]
    if product_ids:
        products_result = await db.execute(
            select(Product).where(Product.id.in_(product_ids))
        )
        catalog = {p.id: p for p in products_result.scalars().all()}
        for item in body.items:
            if item.product_id and item.product_id in catalog:
                catalog_price = catalog[item.product_id].price
                if abs(item.unit_price - catalog_price) > Decimal("0.01"):
                    raise TaxLensError(
                        "ERR-POS-001",
                        400,
                        f"unit_price {item.unit_price} cho sản phẩm {item.product_id} "
                        f"không khớp với giá catalog {catalog_price}",
                    )

    gross_amount = sum(item.unit_price * item.quantity for item in body.items)
    discount = body.discount
    net_amount = gross_amount - discount
    if net_amount < Decimal("0"):
        raise TaxLensError("ERR-POS-001", 400, "net_amount không được âm")

    sale_id = f"ORDER-{uuid.uuid4().hex[:8].upper()}"
    sale = Sale(
        id=sale_id,
        merchant_id=body.merchant_id,
        store_id=body.store_id,
        device_id=body.device_id,
        staff_id=body.staff_id,
        gross_amount=gross_amount,
        discount=discount,
        net_amount=net_amount,
        payment_status="UNPAID",
        invoice_status="PENDING",
    )
    db.add(sale)

    for item in body.items:
        db.add(SaleLine(
            sale_id=sale_id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=item.unit_price * item.quantity,
        ))

    await db.commit()

    return PosCreateSaleResponse(
        sale_id=sale_id,
        gross_amount=gross_amount,
        discount=discount,
        net_amount=net_amount,
        payment_status="UNPAID",
        invoice_status="PENDING",
    )


@router.post("/payment-intents", status_code=201, response_model=PosPaymentIntentResponse)
async def create_payment_intent(
    body: PosPaymentIntentRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> PosPaymentIntentResponse:
    sale = await db.get(Sale, body.sale_id)
    if sale is None:
        raise TaxLensError("ERR-POS-003", 404, "Đơn hàng không tồn tại")
    if sale.payment_status == "PAID":
        raise TaxLensError("ERR-POS-002", 400, "Đơn hàng đã được thanh toán")

    intent_id = f"PAY-{uuid.uuid4().hex[:6].upper()}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    intent = PaymentIntent(
        id=intent_id,
        sale_id=body.sale_id,
        merchant_id=sale.merchant_id,
        amount=body.amount,
        status="PENDING",
        expires_at=expires_at,
    )
    db.add(intent)
    await db.commit()

    qr_data = f"{_QR_MOCK_PREFIX}{intent_id}5303704540{int(body.amount)}5802VN"

    return PosPaymentIntentResponse(
        payment_intent_id=intent_id,
        amount=body.amount,
        qr_data=qr_data,
        expires_at=expires_at.isoformat(),
        status="PENDING",
    )


@router.post("/cash-payments", response_model=PosCashPaymentResponse)
async def record_cash_payment(
    body: PosCashPaymentRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> PosCashPaymentResponse:
    sale = await db.get(Sale, body.sale_id)
    if sale is None:
        raise TaxLensError("ERR-POS-003", 404, "Đơn hàng không tồn tại")
    if sale.payment_status == "PAID":
        raise TaxLensError("ERR-POS-001", 400, "Đơn hàng đã được thanh toán")

    session_result = await db.execute(
        select(CashSession)
        .where(CashSession.store_id == body.store_id, CashSession.status == "OPEN")
        .order_by(CashSession.opened_at.desc())
        .limit(1)
    )
    session = session_result.scalars().first()
    # TODO Q-A6: spec uses ERR-POS-004 here — confirm with team (currently no open CashSession check)
    if session is None:
        raise TaxLensError("ERR-POS-004", 404, "Không có ca tiền mặt đang mở cho cửa hàng này")

    if abs(body.amount - sale.net_amount) > Decimal("0.01"):
        raise TaxLensError(
            "ERR-POS-001",
            400,
            f"Số tiền thanh toán {body.amount} không khớp với giá trị đơn hàng {sale.net_amount}",
        )

    sale.payment_status = "PAID"
    prev_expected = session.expected_cash or Decimal("0")
    session.expected_cash = prev_expected + body.amount

    await db.commit()

    return PosCashPaymentResponse(
        sale_id=sale.id,
        payment_status="PAID",
        cash_session_id=str(session.id),
    )


async def _close_session(
    session_id: int, counted_cash: Decimal, discrepancy_reason: str | None, db: AsyncSession
) -> PosCashSessionCloseResponse:
    session = await db.get(CashSession, session_id)
    if session is None or session.status != "OPEN":
        raise TaxLensError("ERR-POS-004", 404, "Ca tiền mặt không tồn tại hoặc đã đóng")
    expected = session.expected_cash or Decimal("0")
    discrepancy = counted_cash - expected
    session.counted_cash = counted_cash
    session.discrepancy = discrepancy
    session.discrepancy_reason = discrepancy_reason
    session.status = "RECONCILED" if discrepancy == Decimal("0") else "DISCREPANCY"
    session.closed_at = datetime.now(timezone.utc)
    await db.commit()
    return PosCashSessionCloseResponse(
        session_id=str(session.id),
        opening_cash=session.opening_cash,
        expected_cash=expected,
        counted_cash=counted_cash,
        discrepancy=discrepancy,
        status=session.status,
    )


@router.post("/cash-sessions/close", response_model=PosCashSessionCloseResponse)
async def close_cash_session_flat(
    body: PosCashSessionFlatCloseRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> PosCashSessionCloseResponse:
    return await _close_session(body.session_id, body.counted_cash, body.discrepancy_reason, db)


@router.post("/cash-sessions/{session_id}/close", response_model=PosCashSessionCloseResponse)
async def close_cash_session(
    session_id: int,
    body: PosCashSessionCloseRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> PosCashSessionCloseResponse:
    return await _close_session(session_id, body.counted_cash, body.discrepancy_reason, db)
