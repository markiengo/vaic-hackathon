from types import SimpleNamespace

import pytest

from app.agents.audit import InMemoryAgentRunRecorder
from app.agents.budget import AgentRunBudget, BudgetExceeded, InMemoryConcurrencyLimiter
from app.agents.executor import ToolExecution, execute_tool
from app.agents.graph import planner_node
from app.agents.runner import AgentRunner
from app.agents.state import AgentRunStatus
from app.schemas.agent import AgentRunRequest


def _response(content: str) -> SimpleNamespace:
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


def test_planner_retries_invalid_json_then_returns_plan(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.agents import graph

    responses = [
        _response("not-json"),
        _response('{"plan": []}'),
        _response(
            '{"plan": ['
            '{"step": 1, "action": "Đối soát", "agent": "reconciliation"},'
            '{"step": 2, "action": "Kiểm tra thuế", "agent": "tax_compliance"},'
            '{"step": 3, "action": "Nhắn merchant", "agent": "merchant_ops"}'
            "]}"
        ),
    ]

    class FakeCompletions:
        def create(self, **_: object) -> SimpleNamespace:
            return responses.pop(0)

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    fake_settings = SimpleNamespace(
        model="deepseek/deepseek-v4-flash",
        deterministic_temperature=0.1,
        planner_thinking_enabled=True,
    )

    monkeypatch.setattr(graph, "get_deepseek_settings", lambda: fake_settings)
    monkeypatch.setattr(graph, "create_deepseek_client", lambda _: fake_client)

    output = planner_node(
        {
            "merchant_id": "M001",
            "period": "2026-07",
            "request_text": "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa",
        }
    )

    assert output["run_status"] == AgentRunStatus.EXECUTING.value
    assert [step["agent"] for step in output["plan"]] == ["reconciliation", "tax_compliance", "merchant_ops"]
    assert output["trace"][-1]["attempts"] == 3


def test_invalid_tool_name_is_rejected_without_loading_tool_registry() -> None:
    result = execute_tool("reconciliation", "create_case", {})

    assert result.status == "rejected"
    assert "not allowed" in str(result.error)


def test_agent_workflow_returns_specialist_summary_json(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.agents import specialists
    from app.agents.graph import agent_workflow

    def fake_execute(agent_name: str, tool_name: str, arguments: dict, *, agent_run_id: str | None = None) -> ToolExecution:
        outputs = {
            "get_bank_transactions": [{"id": f"TX-{index}"} for index in range(30)],
            "get_sales_orders": [{"id": f"SALE-{index}"} for index in range(30)],
            "get_cash_sessions": [{"id": "CASH-1"}],
            "get_invoices": [{"id": f"INV-{index}"} for index in range(28)],
            "find_payment_reference": {"id": "PAY-A8F21X"},
            "score_match_candidates": [{"sale_id": f"SALE-{index}", "score": "100", "confidence": "0.99"} for index in range(25)],
            "create_reconciliation_exception": {"id": "EX-1", "exception_type": "PENDING_REVIEW"},
            "retrieve_tax_rules": {"rule_version": "2026.07"},
            "validate_rule_version": {"valid": True, "rule_version": "2026.07"},
            "classify_revenue_category": {"classification": "revenue", "confidence": "0.95"},
            "check_required_fields": {"missing_invoice_sales": ["SALE-29", "SALE-30"]},
            "generate_tax_readiness_report": {
                "rule_version": "2026.07",
                "ready": False,
                "checklist": [{"name": "missing_invoices", "passed": False, "details": "2 đơn thiếu hóa đơn"}],
                "report": {"missing_invoice_count": 2},
            },
            "create_draft_export": {"status": "blocked"},
            "create_case": {"id": "CASE-M001-2026-07"},
            "assign_task_to_rm": {"case_id": "CASE-M001-2026-07", "assigned_rm_id": "RM-001"},
            "draft_merchant_message": {
                "case_id": "CASE-M001-2026-07",
                "merchant_id": "M001",
                "period": "2026-07",
                "message": "Kính gửi Salon Hoa, vui lòng xác nhận giao dịch.",
                "requires_rm_review": True,
            },
            "update_case_status": {"case_id": "CASE-M001-2026-07", "status": "WAITING_FOR_CONFIRMATION"},
            "export_to_accounting_system": {"tool_name": "export_to_accounting_system", "output": {"format": "json"}},
        }
        return ToolExecution(agent_name=agent_name, tool_name=tool_name, arguments=arguments, status="completed", output=outputs.get(tool_name, {}))

    monkeypatch.setattr(specialists, "execute_tool", fake_execute)

    output = agent_workflow.invoke(
        {
            "agent_run_id": "AR-TEST",
            "merchant_id": "M001",
            "period": "2026-07",
            "request_text": "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa",
            "plan": {
                "plan": [
                    {"step": 1, "action": "Đối soát", "agent": "reconciliation"},
                    {"step": 2, "action": "Kiểm tra thuế", "agent": "tax_compliance"},
                    {"step": 3, "action": "Nhắn merchant", "agent": "merchant_ops"},
                ]
            },
        }
    )

    assert output["run_status"] == AgentRunStatus.COMPLETED.value
    assert output["reconciliation_output"]["matched"] == 25
    assert output["reconciliation_output"]["unmatched"] == 5
    assert output["tax_compliance_output"]["rule_version"] == "2026.07"
    assert output["tax_compliance_output"]["ready"] is False
    assert output["merchant_ops_output"]["messages_drafted"] == 1
    assert len(output["reconciliation_tool_calls"]) == 7
    assert len(output["tax_compliance_tool_calls"]) == 6
    assert len(output["merchant_ops_tool_calls"]) == 6
    assert output["merchant_ops_tool_calls"][-1]["status"] == "skipped"


def test_agent_runner_records_state_machine_transitions() -> None:
    class FakeWorkflow:
        def invoke(self, state: dict) -> dict:
            assert state["agent_run_id"].startswith("AR-")
            return {
                "run_status": AgentRunStatus.COMPLETED.value,
                "plan": [{"step": 1, "action": "Đối soát", "agent": "reconciliation"}],
                "trace": [],
            }

    recorder = InMemoryAgentRunRecorder()
    runner = AgentRunner(workflow=FakeWorkflow(), recorder=recorder)

    response = runner.run(
        AgentRunRequest(
            merchant_id="M001",
            period="2026-07",
            request_text="Kiểm tra Salon Hoa",
            case_id="CASE-M001-2026-07",
        )
    )

    run_id = response.output["agent_run_id"]
    assert response.status == AgentRunStatus.COMPLETED.value
    assert [transition.status for transition in recorder.transitions[run_id]] == [
        AgentRunStatus.PENDING,
        AgentRunStatus.PLANNING,
        AgentRunStatus.EXECUTING,
        AgentRunStatus.COMPLETED,
    ]


def test_budget_and_concurrency_guards_fail_fast() -> None:
    budget = AgentRunBudget(max_llm_calls=1)
    budget.record_llm_call(input_text="hello")
    with pytest.raises(BudgetExceeded):
        budget.record_llm_call(input_text="again")

    limiter = InMemoryConcurrencyLimiter(max_concurrent_runs=1)
    limiter.acquire()
    with pytest.raises(RuntimeError):
        limiter.acquire()
    limiter.release()
