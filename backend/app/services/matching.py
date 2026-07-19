"""Deterministic bank-transaction to sale matching.

The module deliberately has no SQLAlchemy dependency.  P4's persistence layer
can map database records to these immutable snapshots and persist the returned
decisions in a transaction.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from enum import Enum
from typing import Iterable, Mapping, Sequence


ZERO = Decimal("0")
ONE = Decimal("1")
PAYMENT_REFERENCE_RE = re.compile(
    r"(?<![A-Z0-9])PAY-[A-Z0-9]{6}(?![A-Z0-9])", re.IGNORECASE
)


class MatchAction(str, Enum):
    AUTO_MATCH = "AUTO_MATCH"
    HUMAN_CONFIRM = "HUMAN_CONFIRM"
    UNMATCHED = "UNMATCHED"
    INVALID = "INVALID"


class MatchMethod(str, Enum):
    EXACT = "EXACT"
    FUZZY = "FUZZY"
    MANUAL = "MANUAL"
    NONE = "NONE"


class PaymentStatus(str, Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    REFUNDED = "REFUNDED"


class PaymentIntentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


@dataclass(frozen=True)
class BankTransaction:
    id: str
    merchant_id: str
    amount: Decimal
    transaction_date: datetime
    payment_code: str | None = None
    raw_note: str | None = None
    sender_name: str | None = None
    store_id: str | None = None
    direction: str = "in"
    allocated_amount: Decimal = ZERO

    @property
    def available_amount(self) -> Decimal:
        return max(ZERO, abs(self.amount) - abs(self.allocated_amount))


@dataclass(frozen=True)
class Sale:
    id: str
    merchant_id: str
    store_id: str | None
    net_amount: Decimal
    created_at: datetime
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    net_allocated_amount: Decimal = ZERO
    identifiers: tuple[str, ...] = ()

    @property
    def remaining_amount(self) -> Decimal:
        return max(ZERO, self.net_amount - self.net_allocated_amount)


@dataclass(frozen=True)
class PaymentIntent:
    id: str
    sale_id: str
    merchant_id: str
    amount: Decimal
    status: PaymentIntentStatus
    expires_at: datetime
    allocated_amount: Decimal = ZERO


@dataclass(frozen=True)
class AllocationSnapshot:
    bank_transaction_id: str
    sale_id: str
    amount: Decimal
    payment_intent_id: str | None = None
    allocation_type: str = "PAYMENT"


@dataclass(frozen=True)
class ScoreFactor:
    name: str
    points: int
    detail: str


@dataclass(frozen=True)
class MatchDecision:
    action: MatchAction
    method: MatchMethod
    deterministic_score: int
    display_score: int
    factors: tuple[ScoreFactor, ...] = ()
    reason_codes: tuple[str, ...] = ()
    transaction_id: str | None = None
    matched_sale_id: str | None = None
    matched_payment_intent_id: str | None = None
    allocation_amount: Decimal | None = None
    allocation_type: str | None = None
    confidence: Decimal | None = None
    confidence_method: str | None = None


@dataclass(frozen=True)
class MatchCandidate:
    sale_id: str
    deterministic_score: int
    display_score: int
    amount_difference: Decimal
    time_difference: timedelta
    exact_amount: bool
    identifier_matched: bool
    factors: tuple[ScoreFactor, ...]
    reason_codes: tuple[str, ...]
    action: MatchAction = MatchAction.UNMATCHED
    method: MatchMethod = MatchMethod.FUZZY
    confidence: Decimal = ZERO
    confidence_method: str = "heuristic_v1"


@dataclass(frozen=True)
class MatchingConfig:
    candidate_window: timedelta = timedelta(minutes=60)
    tolerance_rate: Decimal = Decimal("0.005")
    tolerance_min: Decimal = Decimal("1000")
    tolerance_max: Decimal = Decimal("10000")
    exact_amount_points: int = 50
    near_amount_points: int = 35
    time_under_one_minute_points: int = 20
    time_under_five_minutes_points: int = 10
    time_under_thirty_minutes_points: int = 5
    identifier_points: int = 20
    # Sprint 3 seed calibration: a sender must come from independently trusted
    # history supplied by the caller.  Exact amount (50) + under five minutes
    # (10) + trusted sender (35) reaches the unchanged auto threshold of 95.
    # Amount/time alone still cannot authorize a financial write.
    known_sender_points: int = 35
    # Keep the non-identified rival below the human threshold even when the
    # transaction sender is trusted.  Ambiguity gates continue to win over the
    # arithmetic score.
    duplicate_penalty: int = 35
    human_threshold: int = 75
    auto_threshold: int = 95
    max_note_signal: int = 5

    def __post_init__(self) -> None:
        if not ZERO <= self.tolerance_rate:
            raise ValueError("tolerance_rate must be non-negative")
        if not ZERO <= self.tolerance_min <= self.tolerance_max:
            raise ValueError("invalid tolerance bounds")
        if not 0 <= self.human_threshold < self.auto_threshold <= 100:
            raise ValueError("invalid matching thresholds")


DEFAULT_MATCHING_CONFIG = MatchingConfig()


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise ValueError("timestamps must be timezone-aware")
    return value.astimezone(timezone.utc)


def _clamp_score(value: int) -> int:
    return max(0, min(100, value))


def _heuristic_confidence(score: int) -> Decimal:
    return (Decimal(score) / Decimal("100")).quantize(Decimal("0.01"))


def normalize_name(value: str | None) -> str:
    """Normalize a sender name without performing fuzzy/NLP interpretation."""

    if not value:
        return ""
    value = value.replace("Đ", "D").replace("đ", "d")
    decomposed = unicodedata.normalize("NFKD", value)
    without_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    alphanumeric = re.sub(r"[^0-9A-Za-z]+", " ", without_marks)
    return " ".join(alphanumeric.casefold().split())


def extract_payment_reference(
    payment_code: str | None, raw_note: str | None
) -> str | None:
    """Return a token-safe TaxLens payment reference, preferring payment_code."""

    code = (payment_code or "").strip().upper()
    if PAYMENT_REFERENCE_RE.fullmatch(code):
        return code
    match = PAYMENT_REFERENCE_RE.search((raw_note or "").upper())
    return match.group(0).upper() if match else None


def _contains_identifier(raw_note: str | None, identifier: str) -> bool:
    token = identifier.strip()
    if not token:
        return False
    pattern = re.compile(
        rf"(?<![0-9A-Z]){re.escape(token)}(?![0-9A-Z])", re.IGNORECASE
    )
    return bool(pattern.search(raw_note or ""))


def _failure(
    transaction: BankTransaction,
    action: MatchAction,
    *reason_codes: str,
) -> MatchDecision:
    return MatchDecision(
        action=action,
        method=MatchMethod.NONE,
        deterministic_score=0,
        display_score=0,
        reason_codes=tuple(reason_codes),
        transaction_id=transaction.id,
    )


def _find_sale(sales: Sequence[Sale], sale_id: str) -> Sale | None:
    return next((sale for sale in sales if sale.id == sale_id), None)


def _refundable_amount(
    sale: Sale,
    payment_intent_id: str,
    allocations: Sequence[AllocationSnapshot],
) -> Decimal:
    linked = [
        allocation.amount
        for allocation in allocations
        if allocation.sale_id == sale.id
        and allocation.payment_intent_id == payment_intent_id
    ]
    if linked:
        return max(ZERO, sum(linked, ZERO))
    return max(ZERO, sale.net_allocated_amount)


def exact_match(
    transaction: BankTransaction,
    payment_intents: Sequence[PaymentIntent],
    sales: Sequence[Sale],
    allocations: Sequence[AllocationSnapshot] = (),
    *,
    now: datetime | None = None,
) -> MatchDecision:
    """Match a transaction through a system-owned payment reference.

    Failed positive exact matches return ``UNMATCHED`` so the caller may run
    candidate matching.  Refunds without a safe reference return
    ``HUMAN_CONFIRM`` because a person must choose the original sale.
    """

    if transaction.amount == ZERO:
        return _failure(transaction, MatchAction.INVALID, "ZERO_TRANSACTION_AMOUNT")
    if transaction.available_amount == ZERO:
        return _failure(transaction, MatchAction.INVALID, "TRANSACTION_FULLY_ALLOCATED")

    try:
        current_time = _utc(now or datetime.now(timezone.utc))
        _utc(transaction.transaction_date)
    except ValueError:
        return _failure(transaction, MatchAction.INVALID, "NAIVE_TIMESTAMP")

    reference = extract_payment_reference(transaction.payment_code, transaction.raw_note)
    is_refund = transaction.amount < ZERO
    if not reference:
        action = MatchAction.HUMAN_CONFIRM if is_refund else MatchAction.UNMATCHED
        reason = "REFUND_REQUIRES_REFERENCE" if is_refund else "REFERENCE_NOT_FOUND"
        return _failure(transaction, action, reason)

    intent = next((item for item in payment_intents if item.id.upper() == reference), None)
    if intent is None:
        action = MatchAction.HUMAN_CONFIRM if is_refund else MatchAction.UNMATCHED
        return _failure(transaction, action, "PAYMENT_INTENT_NOT_FOUND")
    if intent.merchant_id != transaction.merchant_id:
        return _failure(transaction, MatchAction.INVALID, "MERCHANT_MISMATCH")

    sale = _find_sale(sales, intent.sale_id)
    if sale is None:
        return _failure(transaction, MatchAction.INVALID, "SALE_NOT_FOUND")
    if sale.merchant_id != transaction.merchant_id:
        return _failure(transaction, MatchAction.INVALID, "MERCHANT_MISMATCH")

    if is_refund:
        if transaction.direction.casefold() not in {"out", "refund"}:
            return _failure(transaction, MatchAction.INVALID, "REFUND_DIRECTION_MISMATCH")
        refundable = _refundable_amount(sale, intent.id, allocations)
        if refundable == ZERO:
            return _failure(transaction, MatchAction.HUMAN_CONFIRM, "NO_REFUNDABLE_PAYMENT")
        if abs(transaction.amount) > refundable:
            return _failure(transaction, MatchAction.HUMAN_CONFIRM, "REFUND_EXCEEDS_COLLECTED")
        return MatchDecision(
            action=MatchAction.AUTO_MATCH,
            method=MatchMethod.EXACT,
            deterministic_score=100,
            display_score=100,
            factors=(ScoreFactor("payment_reference", 100, reference),),
            reason_codes=("REFERENCE_REFUND_MATCH",),
            transaction_id=transaction.id,
            matched_sale_id=sale.id,
            matched_payment_intent_id=intent.id,
            allocation_amount=transaction.amount,
            allocation_type="REFUND",
            confidence=ONE,
            confidence_method="deterministic_exact",
        )

    if transaction.direction.casefold() not in {"in", "credit"}:
        return _failure(transaction, MatchAction.INVALID, "PAYMENT_DIRECTION_MISMATCH")
    if intent.status != PaymentIntentStatus.PENDING:
        return _failure(transaction, MatchAction.UNMATCHED, "PAYMENT_INTENT_NOT_PENDING")
    try:
        is_expired = _utc(intent.expires_at) <= current_time
    except ValueError:
        return _failure(transaction, MatchAction.INVALID, "NAIVE_TIMESTAMP")
    if is_expired:
        return _failure(transaction, MatchAction.UNMATCHED, "PAYMENT_INTENT_EXPIRED")
    if transaction.amount != intent.amount:
        return _failure(transaction, MatchAction.UNMATCHED, "AMOUNT_MISMATCH")
    if sale.payment_status not in {PaymentStatus.UNPAID, PaymentStatus.PARTIAL}:
        return _failure(transaction, MatchAction.UNMATCHED, "SALE_NOT_PAYABLE")
    if transaction.available_amount < intent.amount:
        return _failure(transaction, MatchAction.INVALID, "INSUFFICIENT_TRANSACTION_CAPACITY")
    if sale.remaining_amount < intent.amount:
        return _failure(transaction, MatchAction.INVALID, "INSUFFICIENT_SALE_BALANCE")

    return MatchDecision(
        action=MatchAction.AUTO_MATCH,
        method=MatchMethod.EXACT,
        deterministic_score=100,
        display_score=100,
        factors=(
            ScoreFactor("payment_reference", 100, reference),
            ScoreFactor("amount", 0, "transaction amount equals payment intent"),
        ),
        reason_codes=("EXACT_REFERENCE_MATCH",),
        transaction_id=transaction.id,
        matched_sale_id=sale.id,
        matched_payment_intent_id=intent.id,
        allocation_amount=transaction.amount,
        allocation_type="PAYMENT",
        confidence=ONE,
        confidence_method="deterministic_exact",
    )


def amount_tolerance(net_amount: Decimal, config: MatchingConfig = DEFAULT_MATCHING_CONFIG) -> Decimal:
    calculated = net_amount * config.tolerance_rate
    return min(config.tolerance_max, max(config.tolerance_min, calculated))


@dataclass(frozen=True)
class _CandidateWork:
    sale: Sale
    amount_difference: Decimal
    time_difference: timedelta
    exact_amount: bool
    identifier_matched: bool
    sender_matched: bool
    note_signal: int
    factors: tuple[ScoreFactor, ...] = field(default_factory=tuple)
    deterministic_score: int = 0


def candidate_match(
    transaction: BankTransaction,
    sales: Sequence[Sale],
    *,
    known_sender_names: Iterable[str] = (),
    note_signals: Mapping[str, int] | None = None,
    config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
) -> list[MatchCandidate]:
    """Rank eligible sale candidates and attach conservative decisions.

    ``known_sender_names`` is a trust boundary: callers may only supply names
    established independently of the transaction currently being scored.  A
    name copied from the current transaction is not sender history and would
    incorrectly amplify its own evidence.
    """

    if transaction.amount <= ZERO or transaction.direction.casefold() not in {"in", "credit"}:
        return []
    if transaction.allocated_amount != ZERO or transaction.available_amount == ZERO:
        return []

    try:
        transaction_time = _utc(transaction.transaction_date)
    except ValueError:
        return []

    normalized_senders = {normalize_name(value) for value in known_sender_names}
    normalized_senders.discard("")
    sender_matched = normalize_name(transaction.sender_name) in normalized_senders
    supplied_note_signals = note_signals or {}
    work: list[_CandidateWork] = []

    for sale in sales:
        if sale.merchant_id != transaction.merchant_id:
            continue
        if transaction.store_id is not None and sale.store_id != transaction.store_id:
            continue
        if sale.payment_status not in {PaymentStatus.UNPAID, PaymentStatus.PARTIAL}:
            continue
        target_amount = sale.remaining_amount
        if target_amount <= ZERO:
            continue
        try:
            time_difference = abs(transaction_time - _utc(sale.created_at))
        except ValueError:
            continue
        if time_difference > config.candidate_window:
            continue
        amount_difference = abs(transaction.amount - target_amount)
        exact_amount = amount_difference == ZERO
        if not exact_amount and amount_difference > amount_tolerance(sale.net_amount, config):
            continue
        identifier_matched = any(
            _contains_identifier(transaction.raw_note, identifier)
            for identifier in sale.identifiers
        )
        note_signal = supplied_note_signals.get(sale.id, 0)
        if not isinstance(note_signal, int) or not 0 <= note_signal <= config.max_note_signal:
            raise ValueError(
                f"note signal for {sale.id} must be an integer from 0 to {config.max_note_signal}"
            )
        work.append(
            _CandidateWork(
                sale=sale,
                amount_difference=amount_difference,
                time_difference=time_difference,
                exact_amount=exact_amount,
                identifier_matched=identifier_matched,
                sender_matched=sender_matched,
                note_signal=note_signal,
            )
        )

    exact_groups: dict[Decimal, list[_CandidateWork]] = {}
    for item in work:
        if item.exact_amount:
            exact_groups.setdefault(item.sale.remaining_amount, []).append(item)

    scored: list[MatchCandidate] = []
    for item in work:
        factors: list[ScoreFactor] = []
        amount_points = (
            config.exact_amount_points if item.exact_amount else config.near_amount_points
        )
        factors.append(
            ScoreFactor(
                "amount",
                amount_points,
                "exact outstanding amount" if item.exact_amount else "within amount tolerance",
            )
        )
        deterministic_score = amount_points

        if item.time_difference < timedelta(minutes=1):
            time_points = config.time_under_one_minute_points
        elif item.time_difference < timedelta(minutes=5):
            time_points = config.time_under_five_minutes_points
        elif item.time_difference < timedelta(minutes=30):
            time_points = config.time_under_thirty_minutes_points
        else:
            time_points = 0
        if time_points:
            factors.append(ScoreFactor("time", time_points, str(item.time_difference)))
            deterministic_score += time_points

        if item.identifier_matched:
            factors.append(
                ScoreFactor("identifier", config.identifier_points, "strict token match")
            )
            deterministic_score += config.identifier_points
        if item.sender_matched:
            factors.append(
                ScoreFactor("known_sender", config.known_sender_points, "normalized exact match")
            )
            deterministic_score += config.known_sender_points

        unresolved_duplicate = False
        group = exact_groups.get(item.sale.remaining_amount, []) if item.exact_amount else []
        if len(group) > 1:
            identifier_matches = [candidate for candidate in group if candidate.identifier_matched]
            has_unique_identifier = len(identifier_matches) == 1
            if not has_unique_identifier or not item.identifier_matched:
                factors.append(
                    ScoreFactor(
                        "duplicate_amount",
                        -config.duplicate_penalty,
                        f"{len(group)} candidates share the exact outstanding amount",
                    )
                )
                deterministic_score -= config.duplicate_penalty
            unresolved_duplicate = not has_unique_identifier

        deterministic_score = _clamp_score(deterministic_score)
        display_score = _clamp_score(deterministic_score + item.note_signal)
        if item.note_signal:
            factors.append(
                ScoreFactor(
                    "external_note_signal",
                    item.note_signal,
                    "ranking/review only; excluded from auto-match threshold",
                )
            )
        reasons: list[str] = []
        if not item.exact_amount:
            reasons.append("AMOUNT_WITHIN_TOLERANCE")
        if unresolved_duplicate:
            reasons.append("UNRESOLVED_DUPLICATE_AMOUNT")
        scored.append(
            MatchCandidate(
                sale_id=item.sale.id,
                deterministic_score=deterministic_score,
                display_score=display_score,
                amount_difference=item.amount_difference,
                time_difference=item.time_difference,
                exact_amount=item.exact_amount,
                identifier_matched=item.identifier_matched,
                factors=tuple(factors),
                reason_codes=tuple(reasons),
                confidence=_heuristic_confidence(display_score),
            )
        )

    scored.sort(
        key=lambda candidate: (
            -candidate.display_score,
            -candidate.deterministic_score,
            candidate.amount_difference,
            candidate.time_difference,
            candidate.sale_id,
        )
    )
    if not scored:
        return []

    top = scored[0]
    second_score = scored[1].display_score if len(scored) > 1 else 0
    top_tied = len(scored) > 1 and scored[1].display_score == top.display_score
    unresolved_duplicate = "UNRESOLVED_DUPLICATE_AMOUNT" in top.reason_codes
    strong_amount_time_pair = (
        top.exact_amount
        and top.time_difference < timedelta(minutes=1)
        and sum(1 for candidate in scored if candidate.exact_amount) == 1
    )

    if unresolved_duplicate or top_tied or second_score >= config.human_threshold:
        top_action = MatchAction.HUMAN_CONFIRM
        top_reasons = (*top.reason_codes, "AMBIGUOUS_CANDIDATES")
    elif (
        top.exact_amount
        and top.deterministic_score >= config.auto_threshold
        and second_score < config.human_threshold
    ):
        top_action = MatchAction.AUTO_MATCH
        top_reasons = (*top.reason_codes, "UNIQUE_HIGH_CONFIDENCE_CANDIDATE")
    elif top.display_score >= config.human_threshold or strong_amount_time_pair:
        top_action = MatchAction.HUMAN_CONFIRM
        review_reason = (
            "AMOUNT_TIME_REQUIRES_CONFIRMATION"
            if strong_amount_time_pair and top.display_score < config.human_threshold
            else "BELOW_AUTO_THRESHOLD"
        )
        top_reasons = (*top.reason_codes, review_reason)
    else:
        top_action = MatchAction.UNMATCHED
        top_reasons = (*top.reason_codes, "INSUFFICIENT_EVIDENCE")

    result = [replace(top, action=top_action, reason_codes=top_reasons)]
    for candidate in scored[1:]:
        action = (
            MatchAction.HUMAN_CONFIRM
            if candidate.display_score >= config.human_threshold
            else MatchAction.UNMATCHED
        )
        result.append(replace(candidate, action=action))
    return result
