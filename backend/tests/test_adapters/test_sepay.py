"""Pure-logic tests for the sender/note-splitting helpers added to
app/adapters/sepay.py (the webhook handler itself is exercised in
tests/test_sepay_webhook.py, which needs the seeded DB)."""

from __future__ import annotations

from app.adapters.sepay import normalize_note, split_sender_and_note


def test_split_sender_and_note_with_marker():
    sender, note = split_sender_and_note("NGUYEN VAN A chuyen tien mua iphone")
    assert sender == "Nguyen Van A"
    assert note == "chuyen tien mua iphone"


def test_split_sender_and_note_diacritics():
    sender, note = split_sender_and_note("Trần Thị Bích ck tiền cắt tóc")
    assert sender == "Trần Thị Bích"
    assert note == "ck tiền cắt tóc"


def test_split_sender_and_note_no_marker_returns_note_only():
    sender, note = split_sender_and_note("nhap hang 20/10")
    assert sender is None
    assert note == "nhap hang 20/10"


def test_split_sender_and_note_marker_at_start_has_no_sender():
    sender, note = split_sender_and_note("Chuyen khoan test Salon Hoa")
    assert sender is None
    assert note == "Chuyen khoan test Salon Hoa"


def test_split_sender_and_note_empty():
    assert split_sender_and_note(None) == (None, None)
    assert split_sender_and_note("") == (None, None)


def test_normalize_note_collapses_whitespace_and_normalizes_nfc():
    assert normalize_note("  chuyen   khoan   ") == "chuyen khoan"
    assert normalize_note(None) is None
