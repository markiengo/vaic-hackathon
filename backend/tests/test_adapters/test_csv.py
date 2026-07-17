from decimal import Decimal

import pytest

from app.adapters.csv import parse_csv


VALID_CSV = """date,amount,sender,note,type
2026-07-05 09:00:00,275000,NGUYEN THI CSV,thanh toan don hang cu,in
2026-07-06 11:00:00,180000,TRAN VAN LEGACY,import tu excel cu,in
"""


def test_parse_csv_happy_path():
    result = parse_csv(VALID_CSV, merchant_id="M001")
    assert len(result.rows) == 2
    assert len(result.errors) == 0
    first = result.rows[0]
    assert first.merchant_id == "M001"
    assert first.amount == Decimal("275000")
    assert first.sender_name == "NGUYEN THI CSV"
    assert first.source_id.startswith("CSVROW-")


def test_parse_csv_missing_columns_raises():
    with pytest.raises(ValueError):
        parse_csv("date,amount\n2026-07-05,100\n", merchant_id="M001")


def test_parse_csv_invalid_row_is_collected_not_raised():
    content = (
        "date,amount,sender,note,type\n"
        "2026-07-05 09:00:00,not-a-number,BAD ROW,invalid,in\n"
        "2026-07-06 11:00:00,180000,GOOD ROW,ok,in\n"
    )
    result = parse_csv(content, merchant_id="M001")
    assert len(result.rows) == 1
    assert len(result.errors) == 1
    assert result.errors[0].row_number == 2


def test_parse_csv_zero_amount_is_invalid():
    content = "date,amount,sender,note,type\n2026-07-05 09:00:00,0,SENDER,note,in\n"
    result = parse_csv(content, merchant_id="M001")
    assert len(result.rows) == 0
    assert len(result.errors) == 1


def test_parse_csv_row_hash_is_deterministic():
    result1 = parse_csv(VALID_CSV, merchant_id="M001")
    result2 = parse_csv(VALID_CSV, merchant_id="M001")
    assert result1.rows[0].source_id == result2.rows[0].source_id


def test_parse_csv_different_merchant_changes_source_id():
    result1 = parse_csv(VALID_CSV, merchant_id="M001")
    result2 = parse_csv(VALID_CSV, merchant_id="M002")
    assert result1.rows[0].source_id != result2.rows[0].source_id
