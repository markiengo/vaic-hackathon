from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.services.allocation import (
    AllocationLeg,
    AllocationType,
    AllocationValidationError,
    allocate_payment,
)
from app.services.matching import (
    BankTransaction,
    MatchMethod,
    PaymentIntent,
    PaymentIntentStatus,
    PaymentStatus,
    Sale,
)


NOW = datetime(2026, 7, 17, 10, 0, tzinfo=timezone.utc)


def tx(amount: str, tx_id: str = "TX-001", *, direction: str = "in") -> BankTransaction:
    return BankTransaction(
        id=tx_id,
        merchant_id="M001",
        amount=Decimal(amount),
        transaction_date=NOW,
        direction=direction,
    )


def sale(
    sale_id: str,
    amount: str,
    *,
    allocated: str = "0",
    status: PaymentStatus = PaymentStatus.UNPAID,
) -> Sale:
    return Sale(
        id=sale_id,
        merchant_id="M001",
        store_id="S001",
        net_amount=Decimal(amount),
        created_at=NOW,
        net_allocated_amount=Decimal(allocated),
        payment_status=status,
    )


def test_one_payment_can_allocate_to_multiple_sales():
    plan = allocate_payment(
        tx("200000"),
        [
            AllocationLeg("ORDER-A", Decimal("120000")),
            AllocationLeg("ORDER-B", Decimal("80000")),
        ],
        [sale("ORDER-A", "120000"), sale("ORDER-B", "80000")],
    )
    assert len(plan.allocations) == 2
    assert [update.new_status for update in plan.sale_updates] == [
        PaymentStatus.PAID,
        PaymentStatus.PAID,
    ]
    assert plan.unallocated_amount == Decimal("0")


def test_multiple_payers_move_sale_from_partial_to_paid():
    first = allocate_payment(
        tx("100000", "TX-A"),
        [AllocationLeg("ORDER-A", Decimal("100000"))],
        [sale("ORDER-A", "200000")],
    )
    assert first.sale_updates[0].new_status == PaymentStatus.PARTIAL

    second = allocate_payment(
        tx("100000", "TX-B"),
        [AllocationLeg("ORDER-A", Decimal("100000"))],
        [
            sale(
                "ORDER-A",
                "200000",
                allocated="100000",
                status=PaymentStatus.PARTIAL,
            )
        ],
    )
    assert second.sale_updates[0].new_status == PaymentStatus.PAID


def test_deposit_and_remainder_are_supported():
    deposit = allocate_payment(
        tx("50000", "TX-DEPOSIT"),
        [
            AllocationLeg(
                "ORDER-A", Decimal("50000"), allocation_type=AllocationType.DEPOSIT
            )
        ],
        [sale("ORDER-A", "200000")],
    )
    assert deposit.sale_updates[0].new_status == PaymentStatus.PARTIAL

    remainder = allocate_payment(
        tx("150000", "TX-REMAINDER"),
        [AllocationLeg("ORDER-A", Decimal("150000"))],
        [
            sale(
                "ORDER-A",
                "200000",
                allocated="50000",
                status=PaymentStatus.PARTIAL,
            )
        ],
    )
    assert remainder.sale_updates[0].new_status == PaymentStatus.PAID


def test_surplus_remains_unallocated_and_flagged_as_overpayment():
    plan = allocate_payment(
        tx("210000"),
        [AllocationLeg("ORDER-A", Decimal("200000"))],
        [sale("ORDER-A", "200000")],
    )
    assert plan.unallocated_amount == Decimal("10000")
    assert plan.reason_codes == ("OVERPAYMENT",)


def test_transaction_overallocation_is_rejected_atomically():
    with pytest.raises(AllocationValidationError) as exc_info:
        allocate_payment(
            tx("200000"),
            [
                AllocationLeg("ORDER-A", Decimal("120000")),
                AllocationLeg("ORDER-B", Decimal("90000")),
            ],
            [sale("ORDER-A", "120000"), sale("ORDER-B", "90000")],
        )
    assert exc_info.value.code == "TRANSACTION_OVER_ALLOCATION"
    assert exc_info.value.transaction_remaining == Decimal("200000")


def test_sale_overallocation_is_rejected():
    with pytest.raises(AllocationValidationError) as exc_info:
        allocate_payment(
            tx("210000"),
            [AllocationLeg("ORDER-A", Decimal("210000"))],
            [sale("ORDER-A", "200000")],
        )
    assert exc_info.value.code == "SALE_OVER_ALLOCATION"
    assert exc_info.value.sale_remaining == Decimal("200000")


def test_full_refund_sets_refunded_status():
    plan = allocate_payment(
        tx("-200000", "TX-REFUND", direction="out"),
        [
            AllocationLeg(
                "ORDER-A",
                Decimal("-200000"),
                allocation_type=AllocationType.REFUND,
                match_method=MatchMethod.EXACT,
            )
        ],
        [
            sale(
                "ORDER-A",
                "200000",
                allocated="200000",
                status=PaymentStatus.PAID,
            )
        ],
    )
    assert plan.sale_updates[0].new_net_allocated == Decimal("0")
    assert plan.sale_updates[0].new_status == PaymentStatus.REFUNDED


def test_refund_cannot_exceed_collected_amount():
    with pytest.raises(AllocationValidationError) as exc_info:
        allocate_payment(
            tx("-150000", "TX-REFUND", direction="out"),
            [
                AllocationLeg(
                    "ORDER-A",
                    Decimal("-150000"),
                    allocation_type=AllocationType.REFUND,
                )
            ],
            [
                sale(
                    "ORDER-A",
                    "200000",
                    allocated="100000",
                    status=PaymentStatus.PARTIAL,
                )
            ],
        )
    assert exc_info.value.code == "REFUND_EXCEEDS_COLLECTED"
    assert exc_info.value.refundable_amount == Decimal("100000")


def test_payment_intent_becomes_paid_when_fully_allocated():
    payment_intent = PaymentIntent(
        id="PAY-A8F21X",
        sale_id="ORDER-A",
        merchant_id="M001",
        amount=Decimal("200000"),
        status=PaymentIntentStatus.PENDING,
        expires_at=NOW,
    )
    plan = allocate_payment(
        tx("200000"),
        [
            AllocationLeg(
                "ORDER-A",
                Decimal("200000"),
                payment_intent_id=payment_intent.id,
                match_method=MatchMethod.EXACT,
                confidence=Decimal("1"),
                confidence_method="deterministic_exact",
            )
        ],
        [sale("ORDER-A", "200000")],
        payment_intents=[payment_intent],
    )
    assert plan.payment_intent_updates[0].new_status == PaymentIntentStatus.PAID
    assert plan.audit.affected_sale_ids == ("ORDER-A",)


def test_mixed_payment_and_refund_legs_are_rejected():
    with pytest.raises(AllocationValidationError) as exc_info:
        allocate_payment(
            tx("200000"),
            [
                AllocationLeg(
                    "ORDER-A",
                    Decimal("-10000"),
                    allocation_type=AllocationType.REFUND,
                )
            ],
            [sale("ORDER-A", "200000")],
        )
    assert exc_info.value.code == "PAYMENT_SIGN_OR_TYPE_MISMATCH"


@pytest.mark.parametrize(
    ("transaction", "leg", "expected_code"),
    [
        (
            tx("200000", direction="out"),
            AllocationLeg("ORDER-A", Decimal("200000")),
            "PAYMENT_DIRECTION_MISMATCH",
        ),
        (
            tx("-200000", direction="in"),
            AllocationLeg(
                "ORDER-A",
                Decimal("-200000"),
                allocation_type=AllocationType.REFUND,
            ),
            "REFUND_DIRECTION_MISMATCH",
        ),
    ],
)
def test_transaction_direction_must_match_allocation_type(
    transaction, leg, expected_code
):
    with pytest.raises(AllocationValidationError) as exc_info:
        allocate_payment(
            transaction,
            [leg],
            [
                sale(
                    "ORDER-A",
                    "200000",
                    allocated="200000" if transaction.amount < 0 else "0",
                    status=(
                        PaymentStatus.PAID
                        if transaction.amount < 0
                        else PaymentStatus.UNPAID
                    ),
                )
            ],
        )
    assert exc_info.value.code == expected_code
