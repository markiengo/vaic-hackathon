"""Deterministic revenue-classification heuristic.

`classify_revenue_category` is documented as "LLM-assisted" (the LLM may
paraphrase the reasoning in natural Vietnamese, or explain it to a human),
but the actual classification label and confidence must be reproducible —
docs/05-domain/02-algorithm.md and product.md pin specific confidence
values to specific scenarios (e.g. a personal-transfer note with no
matching order scores exactly 0.82), which only a deterministic formula can
guarantee run over run. The LLM is layered on top of this in
`app/tools/__init__.py`; this module has no LLM/DB dependency and is
independently unit-testable.

Score formula (all classifications, so evidence weighs the same regardless
of which category it points to):
    0.50 base
  + 0.20 if the note matches a loan phrase ("cho vay", "vay tien", ...)
  + 0.20 if the note matches a personal/internal-transfer phrase
         ("cho em", "cho anh", "bieu", ...) or no sender name was extractable
  + 0.12 if the note matches a purchase/supplier phrase ("nhap hang", ...)
  + 0.25 if the amount exactly matches an outstanding sale (-> "revenue")
  + 0.12 if the amount matches no outstanding sale at all
  + 0.05 per prior transaction with the same classification from the same
         sender, capped at 3 (+0.15)
  capped at 0.95 (classification always requires human confirmation
  regardless of confidence — see product.md §13 "Con người phê duyệt hành
  động quan trọng" — a high score is stronger evidence, never an auto-apply
  threshold for this tool).
"""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from decimal import Decimal

BASE_SCORE = Decimal("0.50")
LOAN_KEYWORD_SCORE = Decimal("0.20")
PERSONAL_KEYWORD_SCORE = Decimal("0.20")
PURCHASE_KEYWORD_SCORE = Decimal("0.12")
AMOUNT_MATCHES_SALE_SCORE = Decimal("0.25")
NO_MATCHING_SALE_SCORE = Decimal("0.12")
PRIOR_PATTERN_SCORE_PER = Decimal("0.05")
PRIOR_PATTERN_MAX_COUNT = 3
MAX_CONFIDENCE = Decimal("0.95")

PURCHASE_KEYWORDS = ("nhap hang", "nhap kho", "mua hang", "thanh toan nha cung cap", "tien hang", "dat hang")
LOAN_KEYWORDS = ("cho vay", "vay tien", "tra no", "no vay")
PERSONAL_KEYWORDS = (
    "cho em", "cho anh", "cho chi", "cho me", "cho ba", "cho con",
    "gui con", "bieu", "tien nha", "cho vo", "cho chong",
)


def _fold(text: str | None) -> str:
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFKD", text)
    without_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return without_marks.replace("đ", "d").replace("Đ", "D").casefold()


def _matches_any(folded_note: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in folded_note for keyword in keywords)


@dataclass(frozen=True)
class ClassificationResult:
    classification: str
    confidence: Decimal
    reasoning: tuple[str, ...]


def classify_revenue(
    *,
    sender_name: str | None,
    raw_note: str | None,
    amount_matches_outstanding_sale: bool,
    prior_same_pattern_count: int = 0,
) -> ClassificationResult:
    folded_note = _fold(raw_note)
    reasoning: list[str] = []
    score = BASE_SCORE

    # Specific keyword phrases are stronger, more specific evidence than the
    # mere absence of a parseable sender name, so they're checked first — a
    # supplier note with no extractable sender name ("NGUYEN SUPPLIER nhap
    # hang 20/10" doesn't match any sender/note split marker) must still
    # classify as purchase_payment, not fall into the generic "no sender"
    # internal_transfer bucket.
    if _matches_any(folded_note, LOAN_KEYWORDS):
        classification = "loan"
        score += LOAN_KEYWORD_SCORE
        reasoning.append("Nội dung chuyển khoản có từ khóa liên quan đến vay/trả nợ")
    elif _matches_any(folded_note, PURCHASE_KEYWORDS):
        classification = "purchase_payment"
        score += PURCHASE_KEYWORD_SCORE
        reasoning.append("Nội dung chuyển khoản có từ khóa liên quan đến nhập hàng/mua hàng")
    elif _matches_any(folded_note, PERSONAL_KEYWORDS) or not sender_name:
        classification = "internal_transfer"
        score += PERSONAL_KEYWORD_SCORE
        if _matches_any(folded_note, PERSONAL_KEYWORDS):
            reasoning.append("Nội dung chuyển khoản mang tính cá nhân, không phải giao dịch kinh doanh")
        else:
            reasoning.append("Không xác định được tên người gửi từ nội dung chuyển khoản")
    elif amount_matches_outstanding_sale:
        classification = "revenue"
        score += AMOUNT_MATCHES_SALE_SCORE
        reasoning.append("Số tiền khớp với một đơn hàng đang chờ thanh toán")
    else:
        classification = "other"
        reasoning.append("Không đủ bằng chứng để phân loại rõ ràng")

    if classification != "revenue":
        if amount_matches_outstanding_sale:
            score += AMOUNT_MATCHES_SALE_SCORE
            reasoning.append("Số tiền cũng khớp với một đơn hàng đang chờ (cần xác nhận thêm)")
        else:
            score += NO_MATCHING_SALE_SCORE
            reasoning.append("Không có đơn hàng nào khớp với số tiền này")

    capped_prior_count = min(max(prior_same_pattern_count, 0), PRIOR_PATTERN_MAX_COUNT)
    if capped_prior_count:
        score += PRIOR_PATTERN_SCORE_PER * capped_prior_count
        reasoning.append(f"Mẫu giao dịch giống {capped_prior_count} lần trước")

    score = min(score, MAX_CONFIDENCE)
    return ClassificationResult(
        classification=classification,
        confidence=score.quantize(Decimal("0.01")),
        reasoning=tuple(reasoning),
    )


__all__ = ["ClassificationResult", "classify_revenue"]
