from app.agents.prompts import (
    BUSINESS_GUIDANCE_CONTEXT,
    MERCHANT_OPS_SYSTEM_PROMPT,
    RECONCILIATION_GUIDANCE_CONTEXT,
    RECONCILIATION_SYSTEM_PROMPT,
    SYSTEM_PROMPTS,
    TAX_COMPLIANCE_SYSTEM_PROMPT,
)
from app.agents.evaluation import (
    evaluate_confidence_calibration,
    evaluate_message_quality,
    hallucination_rate,
    latency_within_limit,
    message_acceptance_rate,
    validate_structured_agent_outputs,
)


def test_inline_business_guidance_is_injected_into_relevant_prompts() -> None:
    assert "Inline business guidance:" in RECONCILIATION_SYSTEM_PROMPT
    assert "Inline business guidance:" in TAX_COMPLIANCE_SYSTEM_PROMPT
    assert "Inline business guidance:" in MERCHANT_OPS_SYSTEM_PROMPT
    assert "Confidence 0.75-0.94 requires human/RM confirmation." in RECONCILIATION_SYSTEM_PROMPT
    assert "Missing invoices block tax readiness" in TAX_COMPLIANCE_SYSTEM_PROMPT
    assert "Draft messages in natural Vietnamese" in MERCHANT_OPS_SYSTEM_PROMPT


def test_reconciliation_prompt_has_vietnamese_note_guidance() -> None:
    assert "ck=chuyển khoản" in RECONCILIATION_SYSTEM_PROMPT
    assert "toc=tóc" in RECONCILIATION_SYSTEM_PROMPT
    assert "Loan clues include vay" in RECONCILIATION_SYSTEM_PROMPT
    assert RECONCILIATION_GUIDANCE_CONTEXT in RECONCILIATION_SYSTEM_PROMPT


def test_all_system_prompts_are_non_empty_and_include_guidance() -> None:
    assert BUSINESS_GUIDANCE_CONTEXT.strip()
    assert set(SYSTEM_PROMPTS) == {"planner", "reconciliation", "tax_compliance", "merchant_ops"}
    for prompt in SYSTEM_PROMPTS.values():
        assert len(prompt) > 500
        assert "Write all human-readable values" in prompt
        assert "Inline business guidance:" in prompt


def test_sprint4_agent_outputs_validate_against_pydantic_schemas() -> None:
    workflow_output = {
        "plan": [
            {"step": 1, "action": "Đối soát giao dịch", "agent": "reconciliation"},
            {"step": 2, "action": "Kiểm tra sẵn sàng thuế", "agent": "tax_compliance"},
            {"step": 3, "action": "Soạn tin nhắn cho merchant", "agent": "merchant_ops"},
        ],
        "reconciliation_output": {
            "merchant_id": "M001",
            "matched": 25,
            "unmatched": 5,
            "duplicate_candidates": 2,
            "missing_invoice_cases": 2,
            "exceptions": [{"id": "EX-1", "exception_type": "PENDING_REVIEW"}],
        },
        "tax_compliance_output": {
            "rule_version": "2026.07",
            "ready": False,
            "checklist": [{"name": "missing_invoices", "passed": False, "details": "2 đơn thiếu hóa đơn"}],
            "report": {"missing_invoice_count": 2},
        },
        "merchant_ops_output": {
            "cases_created": 1,
            "messages_drafted": 1,
            "exports_created": 1,
            "case_ids": ["CASE-M001-2026-07"],
        },
    }

    result = validate_structured_agent_outputs(workflow_output)

    assert result.passed, result.errors


def test_sprint4_merchant_messages_are_vietnamese_and_actionable() -> None:
    messages = [
        (
            "Kính gửi Salon Hoa, trong kỳ tháng 7 chúng tôi cần đối soát một "
            "giao dịch chưa đủ căn cứ. Vui lòng xác nhận giao dịch liên quan "
            "đến hồ sơ M001-2026-07 hoặc cung cấp hóa đơn bổ sung. Cảm ơn anh/chị."
        ),
        (
            "Kính gửi merchant M001, TaxLens phát hiện 2 hóa đơn còn thiếu cho "
            "kỳ 2026-07. Vui lòng cung cấp chứng từ hoặc phản hồi để RM hỗ trợ "
            "hoàn tất đối soát. Cảm ơn anh/chị."
        ),
    ]

    assert all(evaluate_message_quality(message).passed for message in messages)
    assert message_acceptance_rate(messages) >= 0.9
    assert not evaluate_message_quality("Please check.").passed


def test_sprint4_confidence_scores_are_calibrated_on_seed_like_sample() -> None:
    suggestions = [
        {"suggested_type": "revenue", "expected_type": "revenue", "confidence": 0.96},
        {"suggested_type": "revenue", "expected_type": "revenue", "confidence": 0.9},
        {"suggested_type": "internal_transfer", "expected_type": "internal_transfer", "confidence": 0.82},
        {"suggested_type": "loan", "expected_type": "loan", "confidence": 0.84},
        {"suggested_type": "refund", "expected_type": "refund", "confidence": 0.88},
        {"suggested_type": "other", "expected_type": "other", "confidence": 0.76},
        {"suggested_type": "revenue", "expected_type": "revenue", "confidence": 0.93},
        {"suggested_type": "fee", "expected_type": "fee", "confidence": 0.81},
        {"suggested_type": "internal_transfer", "expected_type": "loan", "confidence": 0.72},
        {"suggested_type": "other", "expected_type": "revenue", "confidence": 0.68},
    ]

    result = evaluate_confidence_calibration(suggestions)

    assert result.passed
    assert result.agreement_rate == 0.8
    assert result.overconfident_errors == 0


def test_sprint4_hallucination_rate_and_latency_gates() -> None:
    tool_calls = [
        {"agent": "reconciliation", "tool_name": "get_bank_transactions"},
        {"agent": "reconciliation", "tool_name": "score_match_candidates"},
        {"agent": "tax_compliance", "tool_name": "retrieve_tax_rules"},
        {"agent": "merchant_ops", "tool_name": "draft_merchant_message"},
    ]

    assert hallucination_rate(tool_calls) < 0.05
    assert hallucination_rate(tool_calls + [{"agent": "merchant_ops", "tool_name": "made_up_tool"}]) >= 0.05
    assert latency_within_limit(0.2)
    assert not latency_within_limit(30.0)
