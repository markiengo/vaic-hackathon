import unicodedata

import pytest

from app.services.vietnamese_nlp import (
    expand_vietnamese_note,
    interpret_transaction_note,
    normalize_vietnamese_note,
    strip_diacritics,
)


NOTE_CLASSIFICATION_CASES = [
    ("ck cat toc", "revenue"),
    ("thanh toan goi dau", "revenue"),
    ("tt dich vu nhuom", "revenue"),
    ("PAY-A8F21X salon", "revenue"),
    ("ck uon toc", "revenue"),
    ("hd dich vu ep toc", "revenue"),
    ("chuyen khoan cat toc", "revenue"),
    ("thanh toán hóa đơn", "revenue"),
    ("mua dich vu salon", "revenue"),
    ("ck gội đầu", "revenue"),
    ("ttoan cat toc", "revenue"),
    ("dv nhuom toc", "revenue"),
    ("thanh toan PAY-123", "revenue"),
    ("chuyen tien dich vu cat toc", "revenue"),
    ("hd salon thang 7", "revenue"),
    ("ep toc va goi dau", "revenue"),
    ("cat toc be", "revenue"),
    ("salon hoa thanh toan", "revenue"),
    ("nhuom uon", "revenue"),
    ("dịch vụ cắt tóc", "revenue"),
    ("ck noi bo", "internal_transfer"),
    ("rut quy", "internal_transfer"),
    ("nap quy", "internal_transfer"),
    ("chuyen ve tk", "internal_transfer"),
    ("ck cho em", "internal_transfer"),
    ("gui em", "internal_transfer"),
    ("gui lai", "internal_transfer"),
    ("chuyen khoan ca nhan", "internal_transfer"),
    ("nb sang tk khac", "internal_transfer"),
    ("chuyen noi bo gia dinh", "internal_transfer"),
    ("vay tam thoi", "loan"),
    ("tien vay ngan han", "loan"),
    ("muon tien", "loan"),
    ("tra no", "loan"),
    ("tam ung", "loan"),
    ("ung truoc", "loan"),
    ("ck tien vay", "loan"),
    ("khach tra no", "loan"),
    ("hoan tien", "refund"),
    ("refund sale", "refund"),
    ("tra lai tien", "refund"),
    ("hoan coc", "refund"),
    ("ck hoan tien cat toc", "refund"),
    ("phi ngan hang", "fee"),
    ("phi dich vu", "fee"),
    ("phi sms", "fee"),
    ("hello", "other"),
    ("abc xyz", "other"),
    ("nguyen van a", "other"),
    ("", "other"),
]


def test_normalize_vietnamese_note_uses_nfc_and_collapses_whitespace() -> None:
    decomposed = "to\u0301c   kha\u0301ch"

    normalized = normalize_vietnamese_note(decomposed)

    assert normalized == unicodedata.normalize("NFC", "tóc khách")


def test_normalize_vietnamese_note_handles_none_and_trims_noise() -> None:
    assert normalize_vietnamese_note(None) == ""
    assert normalize_vietnamese_note("   cắt   tóc   khách   ") == "cắt tóc khách"


def test_expand_vietnamese_note_restores_common_abbreviations_and_accents() -> None:
    expanded = expand_vietnamese_note("ck cat toc hd")

    assert expanded == "chuyển khoản cắt tóc hóa đơn"


def test_expand_vietnamese_note_handles_symbols_and_preserves_word_order() -> None:
    expanded = expand_vietnamese_note("CK!!! @#$% cat toc  hd")

    assert expanded == "chuyển khoản cắt tóc hóa đơn"


def test_strip_diacritics_removes_marks_without_reordering_words() -> None:
    assert strip_diacritics("Đặng Thùy Trâm") == "dang thuy tram"


def test_note_classification_reaches_85_percent_accuracy_on_50_note_set() -> None:
    results = [
        interpret_transaction_note(raw_note).suggested_type == expected_type
        for raw_note, expected_type in NOTE_CLASSIFICATION_CASES
    ]

    accuracy = sum(results) / len(results)
    assert len(NOTE_CLASSIFICATION_CASES) == 50
    assert accuracy >= 0.85


def test_note_interpretation_returns_confidence_and_evidence() -> None:
    interpretation = interpret_transaction_note("ck cho em")

    assert interpretation.suggested_type == "internal_transfer"
    assert interpretation.confidence >= 0.8
    assert interpretation.evidence


@pytest.mark.parametrize(
    ("raw_note", "expected_type", "minimum_confidence"),
    [
        ("hoan tien don hang", "refund", 0.85),
        ("vay tam ung", "loan", 0.8),
        ("phi ngan hang", "fee", 0.8),
        ("ck noi bo", "internal_transfer", 0.85),
        ("", "other", 0.4),
    ],
)
def test_note_interpretation_covers_non_revenue_paths(
    raw_note: str, expected_type: str, minimum_confidence: float
) -> None:
    interpretation = interpret_transaction_note(raw_note)

    assert interpretation.suggested_type == expected_type
    assert interpretation.confidence >= minimum_confidence


def test_note_interpretation_caps_confidence_for_repetitive_revenue_signal() -> None:
    note = " ".join(["chuyen khoan cat toc goi dau uon toc"] * 20)

    interpretation = interpret_transaction_note(note)

    assert interpretation.suggested_type == "revenue"
    assert interpretation.confidence == 0.95
    assert "Có dịch vụ cắt tóc" in interpretation.evidence
