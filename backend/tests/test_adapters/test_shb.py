from datetime import datetime, timezone
from decimal import Decimal

from app.adapters.shb import mock_transaction


def test_mock_transaction_shape_matches_sepay_api_schema():
    raw = mock_transaction(
        sepay_id=902194810,
        account_number="0778478888",
        transaction_date=datetime(2026, 7, 2, 9, 13, tzinfo=timezone.utc),
        amount_in=Decimal("350000"),
        transaction_content="NGUYEN VAN A chuyen tien PAY-A8F21X",
    )
    assert raw["id"] == "902194810"
    assert raw["bank_brand_name"] == "SHB"
    assert raw["amount_in"] == "350000"
    assert raw["amount_out"] == "0"
    assert raw["transaction_date"] == "2026-07-02 09:13:00"


def test_mock_transaction_carries_code_and_reference():
    raw = mock_transaction(
        sepay_id=1,
        account_number="0778478888",
        transaction_date=datetime(2026, 7, 2, 9, 13, tzinfo=timezone.utc),
        amount_in=Decimal("350000"),
        transaction_content="NGUYEN VAN A chuyen tien PAY-A8F21X",
        code="PAY-A8F21X",
        reference_number="REF001",
    )
    assert raw["code"] == "PAY-A8F21X"
    assert raw["reference_number"] == "REF001"
