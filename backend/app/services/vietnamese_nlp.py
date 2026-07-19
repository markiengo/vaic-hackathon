"""Deterministic Vietnamese note normalization and interpretation."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Literal


SuggestedTransactionType = Literal["revenue", "internal_transfer", "loan", "refund", "fee", "other"]


@dataclass(frozen=True)
class NoteInterpretation:
    raw_note: str
    normalized_text: str
    expanded_text: str
    suggested_type: SuggestedTransactionType
    confidence: float
    evidence: list[str] = field(default_factory=list)


_ABBREVIATION_PATTERNS: tuple[tuple[str, str], ...] = (
    (r"\bck\b", "chuyen khoan"),
    (r"\bckhoan\b", "chuyen khoan"),
    (r"\bchuyen\s+khoan\b", "chuyen khoan"),
    (r"\bchuyen\s+tien\b", "chuyen khoan"),
    (r"\btt\b", "thanh toan"),
    (r"\bttoan\b", "thanh toan"),
    (r"\bthanhtoan\b", "thanh toan"),
    (r"\bhd\b", "hoa don"),
    (r"\bdv\b", "dich vu"),
    (r"\btk\b", "tai khoan"),
    (r"\bnb\b", "noi bo"),
    (r"\bnoi\s+bo\b", "noi bo"),
)

_TOKEN_RESTORATIONS: dict[str, str] = {
    "anh": "anh",
    "bo": "bộ",
    "cat": "cắt",
    "chuyen": "chuyển",
    "cho": "cho",
    "coc": "cọc",
    "dau": "đầu",
    "dich": "dịch",
    "don": "đơn",
    "em": "em",
    "ep": "ép",
    "goi": "gội",
    "gui": "gửi",
    "hoa": "hóa",
    "hoan": "hoàn",
    "khoan": "khoản",
    "lai": "lại",
    "luong": "lương",
    "muon": "mượn",
    "nhuom": "nhuộm",
    "no": "nợ",
    "noi": "nội",
    "phi": "phí",
    "quy": "quỹ",
    "rut": "rút",
    "salon": "salon",
    "tam": "tạm",
    "tai": "tài",
    "thanh": "thanh",
    "tien": "tiền",
    "toa": "toa",
    "toan": "toán",
    "toc": "tóc",
    "tra": "trả",
    "truoc": "trước",
    "ung": "ứng",
    "uon": "uốn",
    "vay": "vay",
    "ve": "về",
    "vu": "vụ",
}

_TYPE_PATTERNS: dict[SuggestedTransactionType, tuple[tuple[str, str, float], ...]] = {
    "refund": (
        ("hoan tien", "Có từ khóa hoàn tiền", 0.45),
        ("refund", "Có từ khóa refund", 0.45),
        ("tra lai", "Có từ khóa trả lại", 0.35),
        ("hoan coc", "Có từ khóa hoàn cọc", 0.35),
    ),
    "loan": (
        ("tien vay", "Có từ khóa tiền vay", 0.45),
        ("vay", "Có từ khóa vay", 0.35),
        ("muon", "Có từ khóa mượn", 0.35),
        ("tra no", "Có từ khóa trả nợ", 0.35),
        ("tam ung", "Có từ khóa tạm ứng", 0.3),
        ("ung truoc", "Có từ khóa ứng trước", 0.3),
    ),
    "internal_transfer": (
        ("noi bo", "Có từ khóa nội bộ", 0.45),
        ("rut quy", "Có từ khóa rút quỹ", 0.35),
        ("nap quy", "Có từ khóa nạp quỹ", 0.35),
        ("ve tai khoan", "Có dấu hiệu chuyển về tài khoản", 0.3),
        ("cho em", "Ghi chú cá nhân cần phân loại nội bộ", 0.32),
        ("gui em", "Ghi chú cá nhân cần phân loại nội bộ", 0.32),
        ("gui lai", "Ghi chú gửi lại tiền", 0.28),
        ("ca nhan", "Có từ khóa cá nhân", 0.3),
    ),
    "fee": (
        ("phi ngan hang", "Có từ khóa phí ngân hàng", 0.45),
        ("phi dich vu", "Có từ khóa phí dịch vụ", 0.35),
        ("phi", "Có từ khóa phí", 0.2),
    ),
    "revenue": (
        ("pay-", "Có mã thanh toán", 0.45),
        ("thanh toan", "Có từ khóa thanh toán", 0.35),
        ("hoa don", "Có từ khóa hóa đơn", 0.32),
        ("dich vu", "Có từ khóa dịch vụ", 0.28),
        ("cat toc", "Có dịch vụ cắt tóc", 0.38),
        ("goi dau", "Có dịch vụ gội đầu", 0.35),
        ("nhuom", "Có dịch vụ nhuộm", 0.3),
        ("uon", "Có dịch vụ uốn", 0.3),
        ("ep toc", "Có dịch vụ ép tóc", 0.3),
        ("salon", "Có ngữ cảnh salon", 0.25),
    ),
    "other": (),
}


def strip_diacritics(text: str) -> str:
    """Return a lowercase ASCII-ish matching form while preserving word order."""

    normalized = unicodedata.normalize("NFD", text)
    without_marks = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return without_marks.replace("đ", "d").replace("Đ", "D").casefold()


def normalize_vietnamese_note(raw_note: str | None) -> str:
    """Normalize Unicode with NFC and collapse whitespace."""

    if raw_note is None:
        return ""
    normalized = unicodedata.normalize("NFC", raw_note)
    return " ".join(normalized.strip().split())


def expand_vietnamese_note(raw_note: str | None) -> str:
    """Expand common transfer-note abbreviations and restore known accents."""

    normalized = normalize_vietnamese_note(raw_note)
    folded = strip_diacritics(normalized)
    folded = re.sub(r"[^0-9a-zA-Z\-]+", " ", folded)
    folded = " " + re.sub(r"\s+", " ", folded).strip() + " "
    for pattern, replacement in _ABBREVIATION_PATTERNS:
        folded = re.sub(pattern, replacement, folded)
    folded = re.sub(r"\s+", " ", folded).strip()

    tokens = []
    for token in folded.split():
        if re.fullmatch(r"[a-z]+", token):
            tokens.append(_TOKEN_RESTORATIONS.get(token, token))
        else:
            tokens.append(token)
    return " ".join(tokens)


def interpret_transaction_note(raw_note: str | None) -> NoteInterpretation:
    """Suggest a transaction type and confidence from a Vietnamese bank note."""

    normalized = normalize_vietnamese_note(raw_note)
    expanded = expand_vietnamese_note(normalized)
    folded = strip_diacritics(expanded)
    scores: dict[SuggestedTransactionType, float] = {kind: 0.0 for kind in _TYPE_PATTERNS}
    evidence: dict[SuggestedTransactionType, list[str]] = {kind: [] for kind in _TYPE_PATTERNS}

    for kind, patterns in _TYPE_PATTERNS.items():
        for pattern, reason, weight in patterns:
            if pattern in folded:
                scores[kind] += weight
                evidence[kind].append(reason)

    suggested_type = max(scores, key=scores.get)
    if scores[suggested_type] == 0:
        suggested_type = "other"
        confidence = 0.4
        selected_evidence = ["Không có tín hiệu phân loại đủ mạnh"]
    else:
        confidence = min(0.95, 0.5 + scores[suggested_type])
        selected_evidence = evidence[suggested_type]

    return NoteInterpretation(
        raw_note=raw_note or "",
        normalized_text=normalized,
        expanded_text=expanded,
        suggested_type=suggested_type,
        confidence=round(confidence, 2),
        evidence=selected_evidence,
    )


__all__ = [
    "NoteInterpretation",
    "SuggestedTransactionType",
    "expand_vietnamese_note",
    "interpret_transaction_note",
    "normalize_vietnamese_note",
    "strip_diacritics",
]
