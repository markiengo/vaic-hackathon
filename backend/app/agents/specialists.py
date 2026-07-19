"""Specialist LangGraph nodes for P2 agent orchestration."""

from __future__ import annotations

from dataclasses import asdict
from decimal import Decimal
from typing import Any

from app.agents.executor import AgentName, ToolExecution, execute_tool, skip_tool
from app.services.vietnamese_nlp import interpret_transaction_note
from app.schemas.agent import (
    MerchantOpsSummary,
    ReconciliationSummary,
    TaxReadinessReport,
)


AgentGraphState = dict[str, Any]


def _append_tool_trace(state: AgentGraphState, executions: list[ToolExecution]) -> list[dict[str, Any]]:
    trace = list(state.get("trace", []))
    trace.extend(execution.as_trace_event() for execution in executions)
    return trace


def _completed_agents(state: AgentGraphState, agent_name: AgentName) -> list[str]:
    completed_agents = list(state.get("completed_agents", []))
    if agent_name not in completed_agents:
        completed_agents.append(agent_name)
    return completed_agents


def _tool_outputs(executions: list[ToolExecution]) -> list[dict[str, Any]]:
    return [execution.as_output() for execution in executions]


def _first_completed_output(executions: list[ToolExecution], tool_name: str) -> Any:
    for execution in executions:
        if execution.tool_name == tool_name and execution.status == "completed":
            return execution.output
    return None


def _execute(state: AgentGraphState, agent_name: AgentName, tool_name: str, arguments: dict[str, Any]) -> ToolExecution:
    return execute_tool(agent_name, tool_name, arguments, agent_run_id=state.get("agent_run_id"))


def reconciliation_node(state: AgentGraphState) -> dict[str, Any]:
    """Run the reconciliation agent tool sequence and return summary JSON."""

    merchant_id = str(state.get("merchant_id", ""))
    period = str(state.get("period", ""))
    case_id = str(state.get("case_id") or f"CASE-{merchant_id}-{period}")
    raw_note = str(state.get("note") or state.get("request_text") or "")
    note_interpretation = interpret_transaction_note(raw_note)
    interpreted_note = note_interpretation.expanded_text or raw_note

    executions = [
        _execute(state, "reconciliation", "get_bank_transactions", {"merchant_id": merchant_id, "period": period}),
        _execute(state, "reconciliation", "get_sales_orders", {"merchant_id": merchant_id, "period": period}),
        _execute(state, "reconciliation", "get_cash_sessions", {"merchant_id": merchant_id, "period": period}),
        _execute(state, "reconciliation", "get_invoices", {"merchant_id": merchant_id, "period": period}),
        _execute(state, "reconciliation", "find_payment_reference", {"reference_number": state.get("reference_number", "")}),
        _execute(
            state,
            "reconciliation",
            "score_match_candidates",
            {
                "merchant_id": merchant_id,
                "amount": Decimal(str(state.get("amount", "0"))),
                "time_window_minutes": int(state.get("time_window_minutes", 60)),
                "sender_name": state.get("sender_name"),
                "note": interpreted_note,
            },
        ),
    ]

    transactions = _first_completed_output(executions, "get_bank_transactions") or []
    sales = _first_completed_output(executions, "get_sales_orders") or []
    invoices = _first_completed_output(executions, "get_invoices") or []
    candidates = _first_completed_output(executions, "score_match_candidates") or []

    # Only create exception if no matches found
    exceptions = list(state.get("exceptions", []))
    if not candidates:
        exc_exec = _execute(
            state,
            "reconciliation",
            "create_reconciliation_exception",
            {
                "case_id": case_id,
                "merchant_id": merchant_id,
                "period": period,
                "exception_type": "PENDING_REVIEW",
                "reason": "No match candidates found for transaction.",
                "ai_suggestion": {
                    "source": "reconciliation_agent",
                    "note_interpretation": asdict(note_interpretation),
                },
            },
        )
        executions.append(exc_exec)
        if exc_exec.status == "completed" and exc_exec.output:
            exceptions.append(exc_exec.output)

    summary = ReconciliationSummary(
        merchant_id=merchant_id,
        matched=len(candidates) if candidates else 0,
        unmatched=max(0, len(transactions) - len(candidates)) if isinstance(transactions, list) else 0,
        duplicate_candidates=0,
        missing_invoice_cases=max(0, len(sales) - len(invoices)) if isinstance(sales, list) and isinstance(invoices, list) else 0,
        exceptions=exceptions,
    )

    return {
        "current_agent": "reconciliation",
        "completed_agents": _completed_agents(state, "reconciliation"),
        "transactions": transactions if isinstance(transactions, list) else state.get("transactions", []),
        "sales": sales if isinstance(sales, list) else state.get("sales", []),
        "matches": candidates if isinstance(candidates, list) else state.get("matches", []),
        "exceptions": exceptions,
        "note_interpretation": asdict(note_interpretation),
        "reconciliation_output": summary.model_dump(),
        "reconciliation_tool_calls": _tool_outputs(executions),
        "trace": _append_tool_trace(state, executions),
    }


def tax_compliance_node(state: AgentGraphState) -> dict[str, Any]:
    """Run the tax compliance tool sequence and return readiness JSON."""

    merchant_id = str(state.get("merchant_id", ""))
    period = str(state.get("period", ""))
    merchant_segment = str(state.get("merchant_segment", "salon"))
    business_vertical = str(state.get("business_vertical", "beauty"))
    rule_version = str(state.get("tax_rule_version", "2026.07"))
    transaction = state.get("transaction") or {}

    executions = [
        _execute(
            state,
            "tax_compliance",
            "retrieve_tax_rules",
            {"merchant_segment": merchant_segment, "business_vertical": business_vertical},
        ),
        _execute(state, "tax_compliance", "validate_rule_version", {"rule_version": rule_version}),
        _execute(state, "tax_compliance", "classify_revenue_category", {"transaction": transaction}),
        _execute(state, "tax_compliance", "check_required_fields", {"merchant_id": merchant_id, "period": period}),
        _execute(
            state,
            "tax_compliance",
            "generate_tax_readiness_report",
            {"merchant_id": merchant_id, "period": period, "rule_version": rule_version},
        ),
        _execute(
            state,
            "tax_compliance",
            "create_draft_export",
            {"merchant_id": merchant_id, "period": period, "rule_version": rule_version},
        ),
    ]

    report_output = _first_completed_output(executions, "generate_tax_readiness_report")
    if isinstance(report_output, dict):
        readiness = TaxReadinessReport.model_validate(report_output)
    else:
        readiness = TaxReadinessReport(
            rule_version=rule_version,
            checklist=[],
            ready=False,
            report={"status": "pending_tool_implementation"},
        )

    return {
        "current_agent": "tax_compliance",
        "completed_agents": _completed_agents(state, "tax_compliance"),
        "tax_rule_version": readiness.rule_version,
        "tax_compliance_output": readiness.model_dump(),
        "tax_compliance_tool_calls": _tool_outputs(executions),
        "trace": _append_tool_trace(state, executions),
    }


def merchant_ops_node(state: AgentGraphState) -> dict[str, Any]:
    """Run the merchant operations tool sequence and return action summary JSON."""

    merchant_id = str(state.get("merchant_id", ""))
    period = str(state.get("period", ""))
    case_id = str(state.get("case_id") or f"CASE-{merchant_id}-{period}")
    rm_user_id = str(state.get("rm_user_id", "RM-001"))
    confirmation_token = state.get("confirmation_token")
    exception_ids = [str(item.get("id")) for item in state.get("exceptions", []) if isinstance(item, dict) and item.get("id")]

    executions = [
        _execute(state, "merchant_ops", "create_case", {"merchant_id": merchant_id, "period": period, "exception_ids": exception_ids}),
        _execute(state, "merchant_ops", "assign_task_to_rm", {"case_id": case_id, "rm_user_id": rm_user_id}),
        _execute(state, "merchant_ops", "draft_merchant_message", {"case_id": case_id, "merchant_id": merchant_id, "period": period}),
        _execute(state, "merchant_ops", "update_case_status", {"case_id": case_id, "status": "WAITING_FOR_CONFIRMATION"}),
        _execute(state, "merchant_ops", "export_to_accounting_system", {"merchant_id": merchant_id, "period": period}),
    ]

    message_output = _first_completed_output(executions, "draft_merchant_message")
    if confirmation_token:
        message = message_output.get("message", "") if isinstance(message_output, dict) else state.get("message", "")
        executions.append(
            _execute(state, "merchant_ops", "send_confirmation_request", {"token": str(confirmation_token), "message": message})
        )
    else:
        executions.append(
            skip_tool(
                "merchant_ops",
                "send_confirmation_request",
                {"token": None, "message": state.get("message", "")},
                "Missing confirmation_token; message draft remains pending RM/human review.",
            )
        )

    case_output = _first_completed_output(executions, "create_case")
    export_output = _first_completed_output(executions, "export_to_accounting_system")
    case_ids: list[str] = []
    if isinstance(case_output, dict) and case_output.get("case_id"):
        case_ids.append(str(case_output["case_id"]))
    elif isinstance(case_output, dict) and case_output.get("id"):
        case_ids.append(str(case_output["id"]))

    summary = MerchantOpsSummary(
        cases_created=1 if case_ids else 0,
        messages_drafted=1 if message_output else 0,
        exports_created=1 if export_output else 0,
        case_ids=case_ids,
    )

    return {
        "current_agent": "merchant_ops",
        "completed_agents": _completed_agents(state, "merchant_ops"),
        "case_status": "WAITING_FOR_CONFIRMATION",
        "merchant_ops_output": summary.model_dump(),
        "merchant_ops_tool_calls": _tool_outputs(executions),
        "trace": _append_tool_trace(state, executions),
    }


__all__ = [
    "merchant_ops_node",
    "reconciliation_node",
    "tax_compliance_node",
]
