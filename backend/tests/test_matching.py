from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.services.matching import (
    AllocationSnapshot,
    BankTransaction,
    MatchAction,
    MatchMethod,
    PaymentIntent,
    PaymentIntentStatus,
    PaymentStatus,
    Sale,
    amount_tolerance,
    candidate_match,
    exact_match,
    extract_payment_reference,
    normalize_name,
)


NOW = datetime(2026, 7, 17, 10, 0, tzinfo=timezone.utc)


def transaction(
    *,
    amount: str = "350000",
    payment_code: str | None = None,
    raw_note: str | None = None,
    sender_name: str | None = "Nguyễn Văn A",
    minutes: int = 0,
    direction: str = "in",
    allocated_amount: str = "0",
    store_id: str | None = "S001",
) -> BankTransaction:
    return BankTransaction(
        id="TX-001",
        merchant_id="M001",
        store_id=store_id,
        amount=Decimal(amount),
        transaction_date=NOW + timedelta(minutes=minutes),
        payment_code=payment_code,
        raw_note=raw_note,
        sender_name=sender_name,
        direction=direction,
        allocated_amount=Decimal(allocated_amount),
    )


def sale(
    sale_id: str = "ORDER-001",
    *,
    amount: str = "350000",
    minutes: int = 0,
    status: PaymentStatus = PaymentStatus.UNPAID,
    allocated: str = "0",
    identifiers: tuple[str, ...] = (),
    merchant_id: str = "M001",
    store_id: str | None = "S001",
) -> Sale:
    return Sale(
        id=sale_id,
        merchant_id=merchant_id,
        store_id=store_id,
        net_amount=Decimal(amount),
        created_at=NOW + timedelta(minutes=minutes),
        payment_status=status,
        net_allocated_amount=Decimal(allocated),
        identifiers=identifiers,
    )


def intent(
    *,
    status: PaymentIntentStatus = PaymentIntentStatus.PENDING,
    expires_delta: timedelta = timedelta(minutes=15),
    amount: str = "350000",
) -> PaymentIntent:
    return PaymentIntent(
        id="PAY-A8F21X",
        sale_id="ORDER-001",
        merchant_id="M001",
        amount=Decimal(amount),
        status=status,
        expires_at=NOW + expires_delta,
    )


def test_extract_payment_reference_prefers_valid_payment_code_and_uses_token_boundaries():
    assert extract_payment_reference("pay-a8f21x", "PAY-Z9Z9Z9") == "PAY-A8F21X"
    assert extract_payment_reference("bad", "paid PAY-Z9Z9Z9 today") == "PAY-Z9Z9Z9"
    assert extract_payment_reference(None, "XPAY-Z9Z9Z9Y") is None


def test_sender_normalization_handles_vietnamese_d_stroke():
    assert normalize_name("Đặng Thị Lan") == normalize_name("Dang Thi Lan")


def test_exact_match_returns_deterministic_allocation_decision():
    result = exact_match(
        transaction(payment_code="PAY-A8F21X"),
        [intent()],
        [sale()],
        now=NOW,
    )

    assert result.action == MatchAction.AUTO_MATCH
    assert result.method == MatchMethod.EXACT
    assert result.matched_sale_id == "ORDER-001"
    assert result.allocation_amount == Decimal("350000")
    assert result.confidence == Decimal("1")
    assert result.confidence_method == "deterministic_exact"


@pytest.mark.parametrize(
    ("tx", "payment_intent", "expected_reason"),
    [
        (transaction(raw_note="no reference"), intent(), "REFERENCE_NOT_FOUND"),
        (
            transaction(payment_code="PAY-A8F21X"),
            intent(expires_delta=timedelta(seconds=-1)),
            "PAYMENT_INTENT_EXPIRED",
        ),
        (
            transaction(amount="349000", payment_code="PAY-A8F21X"),
            intent(),
            "AMOUNT_MISMATCH",
        ),
    ],
)
def test_exact_match_rejects_missing_expired_or_wrong_amount(tx, payment_intent, expected_reason):
    result = exact_match(tx, [payment_intent], [sale()], now=NOW)
    assert result.action == MatchAction.UNMATCHED
    assert expected_reason in result.reason_codes


def test_exact_match_rejects_paid_sale_and_consumed_transaction():
    paid = exact_match(
        transaction(payment_code="PAY-A8F21X"),
        [intent()],
        [sale(status=PaymentStatus.PAID, allocated="350000")],
        now=NOW,
    )
    consumed = exact_match(
        transaction(payment_code="PAY-A8F21X", allocated_amount="350000"),
        [intent()],
        [sale()],
        now=NOW,
    )
    assert paid.reason_codes == ("SALE_NOT_PAYABLE",)
    assert consumed.action == MatchAction.INVALID
    assert consumed.reason_codes == ("TRANSACTION_FULLY_ALLOCATED",)


def test_unique_amount_and_time_only_requires_human_confirmation_at_score_70():
    candidates = candidate_match(transaction(), [sale()])
    assert len(candidates) == 1
    assert candidates[0].deterministic_score == 70
    assert candidates[0].action == MatchAction.HUMAN_CONFIRM
    assert "AMOUNT_TIME_REQUIRES_CONFIRMATION" in candidates[0].reason_codes


def test_note_signal_can_request_review_but_cannot_unlock_auto_match():
    candidate_sale = sale(identifiers=("TABLE-7",), minutes=-2)
    tx = transaction(raw_note="payment TABLE-7")
    candidates = candidate_match(
        tx,
        [candidate_sale],
        known_sender_names=["Nguyen Van A"],
        note_signals={candidate_sale.id: 5},
    )
    assert candidates[0].deterministic_score == 90
    assert candidates[0].display_score == 95
    assert candidates[0].action == MatchAction.HUMAN_CONFIRM


def test_strong_deterministic_evidence_auto_matches():
    candidate_sale = sale(identifiers=("TABLE-7",))
    candidates = candidate_match(
        transaction(raw_note="payment TABLE-7"),
        [candidate_sale],
        known_sender_names=["Nguyen Van A"],
    )
    assert candidates[0].deterministic_score == 100
    assert candidates[0].action == MatchAction.AUTO_MATCH


def test_second_candidate_at_human_threshold_blocks_auto_match():
    exact_sale = sale("ORDER-A", identifiers=("A-7",))
    near_sale = sale("ORDER-B", amount="351000", identifiers=("B-7",))
    candidates = candidate_match(
        transaction(raw_note="A-7 B-7"),
        [exact_sale, near_sale],
        known_sender_names=["Nguyen Van A"],
    )
    assert candidates[0].deterministic_score == 100
    assert candidates[1].display_score >= 75
    assert candidates[0].action == MatchAction.HUMAN_CONFIRM
    assert "AMBIGUOUS_CANDIDATES" in candidates[0].reason_codes


def test_duplicate_exact_amount_without_identifier_is_mandatory_human_review():
    candidates = candidate_match(
        transaction(),
        [sale("ORDER-A"), sale("ORDER-B")],
    )
    assert candidates[0].deterministic_score == 40
    assert candidates[0].action == MatchAction.HUMAN_CONFIRM
    assert "UNRESOLVED_DUPLICATE_AMOUNT" in candidates[0].reason_codes


def test_unique_identifier_resolves_duplicate_penalty_for_one_candidate():
    candidates = candidate_match(
        transaction(raw_note="TABLE-A"),
        [
            sale("ORDER-A", identifiers=("TABLE-A",)),
            sale("ORDER-B", identifiers=("TABLE-B",)),
        ],
        known_sender_names=["Nguyen Van A"],
    )
    assert candidates[0].sale_id == "ORDER-A"
    assert candidates[0].deterministic_score == 100
    assert candidates[1].deterministic_score == 50
    assert candidates[0].action == MatchAction.AUTO_MATCH


def test_amount_tolerance_is_bounded_and_near_amount_never_auto_matches():
    assert amount_tolerance(Decimal("100000")) == Decimal("1000")
    assert amount_tolerance(Decimal("1000000")) == Decimal("5000.000")
    assert amount_tolerance(Decimal("5000000")) == Decimal("10000")

    candidate_sale = sale(amount="351000", identifiers=("TABLE-7",))
    candidates = candidate_match(
        transaction(raw_note="TABLE-7"),
        [candidate_sale],
        known_sender_names=["Nguyen Van A"],
        note_signals={candidate_sale.id: 5},
    )
    assert candidates[0].exact_amount is False
    assert candidates[0].action == MatchAction.HUMAN_CONFIRM


def test_candidate_filtering_and_ordering_are_deterministic():
    tx = transaction(store_id="S001")
    candidates = candidate_match(
        tx,
        [
            sale("ORDER-B"),
            sale("ORDER-A"),
            sale("OTHER-MERCHANT", merchant_id="M002"),
            sale("OTHER-STORE", store_id="S002"),
            sale("TOO-OLD", minutes=-61),
        ],
    )
    assert [candidate.sale_id for candidate in candidates] == ["ORDER-A", "ORDER-B"]

    used = candidate_match(transaction(allocated_amount="1"), [sale()])
    assert used == []


def test_reference_refund_matches_only_previously_collected_sale():
    paid_sale = sale(status=PaymentStatus.PAID, allocated="350000")
    result = exact_match(
        transaction(
            amount="-100000",
            payment_code="PAY-A8F21X",
            direction="out",
        ),
        [intent(status=PaymentIntentStatus.PAID)],
        [paid_sale],
        [
            AllocationSnapshot(
                bank_transaction_id="TX-ORIGINAL",
                sale_id=paid_sale.id,
                payment_intent_id="PAY-A8F21X",
                amount=Decimal("350000"),
            )
        ],
        now=NOW,
    )
    assert result.action == MatchAction.AUTO_MATCH
    assert result.allocation_type == "REFUND"
    assert result.allocation_amount == Decimal("-100000")


def test_refund_without_reference_requires_human_confirmation():
    result = exact_match(
        transaction(amount="-100000", direction="out"),
        [],
        [sale(status=PaymentStatus.PAID, allocated="350000")],
        now=NOW,
    )
    assert result.action == MatchAction.HUMAN_CONFIRM
    assert result.reason_codes == ("REFUND_REQUIRES_REFERENCE",)
