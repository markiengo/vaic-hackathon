from decimal import Decimal

from pydantic import BaseModel, Field


class PosLineItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(gt=0)


class PosCreateSaleRequest(BaseModel):
    merchant_id: str
    store_id: str
    device_id: str | None = None
    staff_id: str
    items: list[PosLineItem] = Field(min_length=1)
    discount: Decimal = Decimal("0")


class PosCreateSaleResponse(BaseModel):
    sale_id: str
    gross_amount: Decimal
    discount: Decimal
    net_amount: Decimal
    payment_status: str
    invoice_status: str


class PosPaymentIntentRequest(BaseModel):
    sale_id: str
    amount: Decimal = Field(gt=0)


class PosPaymentIntentResponse(BaseModel):
    payment_intent_id: str
    amount: Decimal
    qr_data: str
    expires_at: str
    status: str


class PosCashPaymentRequest(BaseModel):
    sale_id: str
    amount: Decimal = Field(gt=0)
    store_id: str
    staff_id: str


class PosCashPaymentResponse(BaseModel):
    sale_id: str
    payment_status: str
    cash_session_id: str


class PosCashSessionCloseRequest(BaseModel):
    counted_cash: Decimal = Field(ge=0)
    discrepancy_reason: str | None = None


class PosCashSessionFlatCloseRequest(BaseModel):
    session_id: int
    counted_cash: Decimal = Field(ge=0)
    discrepancy_reason: str | None = None


class PosCashSessionCloseResponse(BaseModel):
    session_id: str
    opening_cash: Decimal
    expected_cash: Decimal
    counted_cash: Decimal
    discrepancy: Decimal
    status: str


class PosCashSessionOpenRequest(BaseModel):
    store_id: str
    staff_id: str
    opening_cash: Decimal = Field(ge=0)


class PosCashSessionOpenResponse(BaseModel):
    session_id: str
    store_id: str | None
    opening_cash: Decimal
    status: str
    opened_at: str | None
