"""Atomic payment-allocation planning for the TaxLens ledger."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Protocol, Sequence

from app.services.matching import (
    ZERO,
    AllocationSnapshot,
    BankTransaction,
    MatchMethod,
    PaymentIntent,
    PaymentIntentStatus,
    PaymentStatus,
    Sale,
)


class AllocationType(str, Enum):
    PAYMENT = "PAYMENT"
    REFUND = "REFUND"
    DEPOSIT = "DEPOSIT"


@dataclass(frozen=True)
class AllocationLeg:
    sale_id: str
    amount: Decimal
    allocation_type: AllocationType = AllocationType.PAYMENT
    payment_intent_id: str | None = None
    match_method: MatchMethod = MatchMethod.MANUAL
    confidence: Decimal | None = None
    confidence_method: str | None = None


@dataclass(frozen=True)
class PlannedAllocation:
    bank_transaction_id: str
    sale_id: str
    amount: Decimal
    allocation_type: AllocationType
    payment_intent_id: str | None
    match_method: MatchMethod
    confidence: Decimal | None
    confidence_method: str | None


@dataclass(frozen=True)
class SaleStatusUpdate:
    sale_id: str
    previous_net_allocated: Decimal
    new_net_allocated: Decimal
    previous_status: PaymentStatus
    new_status: PaymentStatus


@dataclass(frozen=True)
class PaymentIntentUpdate:
    payment_intent_id: str
    previous_allocated: Decimal
    new_allocated: Decimal
    previous_status: PaymentIntentStatus
    new_status: PaymentIntentStatus


@dataclass(frozen=True)
class AllocationAuditMetadata:
    operation: str
    transaction_id: str
    transaction_amount: Decimal
    previously_allocated: Decimal
    requested_amount: Decimal
    affected_sale_ids: tuple[str, ...]
    reason_codes: tuple[str, ...]


@dataclass(frozen=True)
class AllocationPlan:
    transaction_id: str
    allocations: tuple[PlannedAllocation, ...]
    sale_updates: tuple[SaleStatusUpdate, ...]
    payment_intent_updates: tuple[PaymentIntentUpdate, ...]
    unallocated_amount: Decimal
    reason_codes: tuple[str, ...]
    audit: AllocationAuditMetadata


class AllocationPlanWriter(Protocol):
    """Persistence port implemented by P4's transactional SQLAlchemy layer."""

    def persist(self, plan: AllocationPlan) -> None:
        ...


class AllocationValidationError(ValueError):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        transaction_remaining: Decimal | None = None,
        sale_remaining: Decimal | None = None,
        refundable_amount: Decimal | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.transaction_remaining = transaction_remaining
        self.sale_remaining = sale_remaining
        self.refundable_amount = refundable_amount


def _find_sale(sales: Sequence[Sale], sale_id: str) -> Sale:
    sale = next((item for item in sales if item.id == sale_id), None)
    if sale is None:
        raise AllocationValidationError("SALE_NOT_FOUND", f"sale {sale_id} was not found")
    return sale


def _find_intent(
    payment_intents: Sequence[PaymentIntent], payment_intent_id: str
) -> PaymentIntent:
    intent = next((item for item in payment_intents if item.id == payment_intent_id), None)
    if intent is None:
        raise AllocationValidationError(
            "PAYMENT_INTENT_NOT_FOUND",
            f"payment intent {payment_intent_id} was not found",
        )
    return intent


def _transaction_allocated_amount(
    transaction: BankTransaction,
    existing_allocations: Sequence[AllocationSnapshot],
) -> Decimal:
    detailed = [
        abs(item.amount)
        for item in existing_allocations
        if item.bank_transaction_id == transaction.id
    ]
    if detailed:
        return sum(detailed, ZERO)
    return abs(transaction.allocated_amount)


def _status_for_balance(
    sale: Sale,
    new_balance: Decimal,
    delta: Decimal,
) -> PaymentStatus:
    if new_balance == ZERO:
        if delta < ZERO and sale.net_allocated_amount > ZERO:
            return PaymentStatus.REFUNDED
        return PaymentStatus.UNPAID
    if new_balance < sale.net_amount:
        return PaymentStatus.PARTIAL
    return PaymentStatus.PAID


def allocate_payment(
    transaction: BankTransaction,
    legs: Sequence[AllocationLeg],
    sales: Sequence[Sale],
    *,
    payment_intents: Sequence[PaymentIntent] = (),
    existing_allocations: Sequence[AllocationSnapshot] = (),
) -> AllocationPlan:
    """Validate an allocation request and return an immutable persistence plan.

    The function is atomic by construction: it performs every validation before
    returning any planned records.  Invalid input raises a structured exception
    and therefore cannot produce a partially persistable plan.
    """

    if transaction.amount == ZERO:
        raise AllocationValidationError(
            "ZERO_TRANSACTION_AMOUNT", "a zero-value transaction cannot be allocated"
        )
    if transaction.amount > ZERO and transaction.direction.casefold() not in {
        "in",
        "credit",
    }:
        raise AllocationValidationError(
            "PAYMENT_DIRECTION_MISMATCH",
            "positive payment allocations require an incoming transaction",
        )
    if transaction.amount < ZERO and transaction.direction.casefold() not in {
        "out",
        "refund",
    }:
        raise AllocationValidationError(
            "REFUND_DIRECTION_MISMATCH",
            "refund allocations require an outgoing transaction",
        )
    if not legs:
        raise AllocationValidationError(
            "EMPTY_ALLOCATION", "at least one allocation leg is required"
        )

    previously_allocated = _transaction_allocated_amount(
        transaction, existing_allocations
    )
    transaction_capacity = abs(transaction.amount) - previously_allocated
    if transaction_capacity < ZERO:
        raise AllocationValidationError(
            "CORRUPT_TRANSACTION_BALANCE",
            "existing allocations exceed the transaction amount",
            transaction_remaining=transaction_capacity,
        )

    is_refund_transaction = transaction.amount < ZERO
    requested_amount = sum((abs(leg.amount) for leg in legs), ZERO)
    if requested_amount > transaction_capacity:
        raise AllocationValidationError(
            "TRANSACTION_OVER_ALLOCATION",
            "requested allocations exceed remaining transaction capacity",
            transaction_remaining=transaction_capacity,
        )

    sale_deltas: dict[str, Decimal] = {}
    intent_deltas: dict[str, Decimal] = {}
    resolved_sales: dict[str, Sale] = {}
    resolved_intents: dict[str, PaymentIntent] = {}

    for leg in legs:
        sale = _find_sale(sales, leg.sale_id)
        if sale.merchant_id != transaction.merchant_id:
            raise AllocationValidationError(
                "MERCHANT_MISMATCH",
                f"sale {sale.id} does not belong to transaction merchant",
            )
        if leg.amount == ZERO:
            raise AllocationValidationError(
                "ZERO_ALLOCATION_AMOUNT", "allocation legs cannot have zero amount"
            )
        if is_refund_transaction:
            if leg.allocation_type != AllocationType.REFUND or leg.amount >= ZERO:
                raise AllocationValidationError(
                    "REFUND_SIGN_OR_TYPE_MISMATCH",
                    "negative transactions require negative REFUND legs",
                )
        elif leg.allocation_type == AllocationType.REFUND or leg.amount <= ZERO:
            raise AllocationValidationError(
                "PAYMENT_SIGN_OR_TYPE_MISMATCH",
                "positive transactions require positive PAYMENT or DEPOSIT legs",
            )

        if leg.confidence is not None and not ZERO <= leg.confidence <= Decimal("1"):
            raise AllocationValidationError(
                "INVALID_CONFIDENCE", "confidence must be between 0 and 1"
            )

        resolved_sales[sale.id] = sale
        sale_deltas[sale.id] = sale_deltas.get(sale.id, ZERO) + leg.amount

        if leg.payment_intent_id is not None:
            intent = _find_intent(payment_intents, leg.payment_intent_id)
            if intent.sale_id != sale.id or intent.merchant_id != transaction.merchant_id:
                raise AllocationValidationError(
                    "PAYMENT_INTENT_MISMATCH",
                    f"payment intent {intent.id} does not belong to sale {sale.id}",
                )
            resolved_intents[intent.id] = intent
            if not is_refund_transaction:
                intent_deltas[intent.id] = intent_deltas.get(intent.id, ZERO) + leg.amount

    sale_updates: list[SaleStatusUpdate] = []
    for sale_id, delta in sale_deltas.items():
        sale = resolved_sales[sale_id]
        new_balance = sale.net_allocated_amount + delta
        if new_balance < ZERO:
            raise AllocationValidationError(
                "REFUND_EXCEEDS_COLLECTED",
                f"refund for sale {sale.id} exceeds its collected amount",
                refundable_amount=max(ZERO, sale.net_allocated_amount),
            )
        if new_balance > sale.net_amount:
            raise AllocationValidationError(
                "SALE_OVER_ALLOCATION",
                f"allocation for sale {sale.id} exceeds its outstanding balance",
                sale_remaining=sale.remaining_amount,
            )
        sale_updates.append(
            SaleStatusUpdate(
                sale_id=sale.id,
                previous_net_allocated=sale.net_allocated_amount,
                new_net_allocated=new_balance,
                previous_status=sale.payment_status,
                new_status=_status_for_balance(sale, new_balance, delta),
            )
        )

    intent_updates: list[PaymentIntentUpdate] = []
    for intent_id, delta in intent_deltas.items():
        intent = resolved_intents[intent_id]
        if intent.status not in {
            PaymentIntentStatus.PENDING,
            PaymentIntentStatus.PAID,
        }:
            raise AllocationValidationError(
                "PAYMENT_INTENT_NOT_ALLOCATABLE",
                f"payment intent {intent.id} has status {intent.status.value}",
            )
        new_allocated = intent.allocated_amount + delta
        if new_allocated > intent.amount:
            raise AllocationValidationError(
                "PAYMENT_INTENT_OVER_ALLOCATION",
                f"allocation exceeds payment intent {intent.id}",
            )
        new_status = (
            PaymentIntentStatus.PAID
            if new_allocated == intent.amount
            else PaymentIntentStatus.PENDING
        )
        intent_updates.append(
            PaymentIntentUpdate(
                payment_intent_id=intent.id,
                previous_allocated=intent.allocated_amount,
                new_allocated=new_allocated,
                previous_status=intent.status,
                new_status=new_status,
            )
        )

    allocations = tuple(
        PlannedAllocation(
            bank_transaction_id=transaction.id,
            sale_id=leg.sale_id,
            amount=leg.amount,
            allocation_type=leg.allocation_type,
            payment_intent_id=leg.payment_intent_id,
            match_method=leg.match_method,
            confidence=leg.confidence,
            confidence_method=leg.confidence_method,
        )
        for leg in legs
    )
    remaining_capacity = transaction_capacity - requested_amount
    unallocated_amount = (
        -remaining_capacity if is_refund_transaction else remaining_capacity
    )
    reasons: list[str] = []
    if remaining_capacity > ZERO:
        reasons.append(
            "PARTIAL_REFUND_UNALLOCATED"
            if is_refund_transaction
            else "OVERPAYMENT"
        )

    sale_updates.sort(key=lambda update: update.sale_id)
    intent_updates.sort(key=lambda update: update.payment_intent_id)
    reason_codes = tuple(reasons)
    audit = AllocationAuditMetadata(
        operation="allocate_payment",
        transaction_id=transaction.id,
        transaction_amount=transaction.amount,
        previously_allocated=previously_allocated,
        requested_amount=requested_amount,
        affected_sale_ids=tuple(sorted(sale_deltas)),
        reason_codes=reason_codes,
    )
    return AllocationPlan(
        transaction_id=transaction.id,
        allocations=allocations,
        sale_updates=tuple(sale_updates),
        payment_intent_updates=tuple(intent_updates),
        unallocated_amount=unallocated_amount,
        reason_codes=reason_codes,
        audit=audit,
    )
