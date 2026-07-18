"""Shared LangGraph scaffolding and workflow wiring for TaxLens agents."""

import json
import re
from typing import Any, Callable, Literal, TypedDict

from langgraph.graph import END, START, StateGraph

from app.agents.budget import AgentRunBudget, BudgetExceeded
from app.agents.deepseek import create_deepseek_client, get_deepseek_settings
from app.agents.prompts import PLANNER_SYSTEM_PROMPT
from app.agents.specialists import merchant_ops_node, reconciliation_node, tax_compliance_node
from app.agents.state import AgentRunStatus
from app.schemas.agent import PlannerPlan


SpecialistAgentName = Literal["reconciliation", "tax_compliance", "merchant_ops"]
RouteName = Literal["reconciliation", "tax_compliance", "merchant_ops", "__end__"]
ALLOWED_SPECIALIST_AGENTS: tuple[SpecialistAgentName, ...] = (
    "reconciliation",
    "tax_compliance",
    "merchant_ops",
)
MAX_PLANNER_JSON_RETRIES = 2


class AgentGraphState(TypedDict, total=False):
    """Common graph state passed between agent nodes."""

    case_id: str
    agent_run_id: str
    merchant_id: str
    period: str
    request_text: str
    reference_number: str | None
    amount: str | int | float
    time_window_minutes: int
    sender_name: str | None
    note: str | None
    merchant_segment: str
    business_vertical: str
    transaction: dict[str, Any]
    rm_user_id: str
    confirmation_token: str | None
    message: str
    transactions: list[dict[str, Any]]
    sales: list[dict[str, Any]]
    matches: list[dict[str, Any]]
    exceptions: list[dict[str, Any]]
    tax_rule_version: str
    human_approvals: list[dict[str, Any]]
    case_status: str
    run_status: str
    current_agent: str
    plan: Any
    completed_agents: list[str]
    errors: list[str]
    trace: list[dict[str, Any]]
    reconciliation_output: dict[str, Any]
    tax_compliance_output: dict[str, Any]
    merchant_ops_output: dict[str, Any]
    reconciliation_tool_calls: list[dict[str, Any]]
    tax_compliance_tool_calls: list[dict[str, Any]]
    merchant_ops_tool_calls: list[dict[str, Any]]
    budget: dict[str, Any]


AgentNode = Callable[[AgentGraphState], dict[str, Any]]


def _append_trace(
    state: AgentGraphState,
    *,
    agent: str,
    status: str,
    message: str,
    **extra: Any,
) -> list[dict[str, Any]]:
    trace = list(state.get("trace", []))
    trace.append({"agent": agent, "status": status, "message": message, **extra})
    return trace


def _default_plan() -> list[dict[str, Any]]:
    return [
        {"step": 1, "action": "Doi soat giao dich va tao ngoai le neu can.", "agent": "reconciliation"},
        {"step": 2, "action": "Kiem tra tinh san sang thue va rule version.", "agent": "tax_compliance"},
        {"step": 3, "action": "Tao case, gan RM, va draft message cho merchant.", "agent": "merchant_ops"},
    ]


def _strip_json_fence(content: str) -> str:
    stripped = content.strip()
    match = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", stripped, flags=re.DOTALL | re.IGNORECASE)
    return match.group(1).strip() if match else stripped


def _parse_planner_output(content: str) -> list[dict[str, Any]]:
    parsed = json.loads(_strip_json_fence(content))
    plan = PlannerPlan.model_validate(parsed)
    return [step.model_dump() for step in plan.plan if step.agent in ALLOWED_SPECIALIST_AGENTS]


def _normalize_plan_steps(plan_payload: Any) -> list[dict[str, Any]]:
    if isinstance(plan_payload, dict):
        plan_payload = plan_payload.get("plan", [])
    if hasattr(plan_payload, "model_dump"):
        plan_payload = plan_payload.model_dump().get("plan", [])
    steps: list[dict[str, Any]] = []
    for step in plan_payload or []:
        if hasattr(step, "model_dump"):
            step_dict = step.model_dump()
        elif isinstance(step, dict):
            step_dict = dict(step)
        else:
            continue
        if step_dict.get("agent") in ALLOWED_SPECIALIST_AGENTS:
            steps.append(step_dict)
    return steps


def _planner_payload(state: AgentGraphState) -> str:
    payload = {
        "request_text": state.get("request_text", ""),
        "case_id": state.get("case_id"),
        "merchant_id": state.get("merchant_id"),
        "period": state.get("period"),
        "case_status": state.get("case_status"),
        "tax_rule_version": state.get("tax_rule_version"),
        "shared_state_counts": {
            "transactions": len(state.get("transactions", [])),
            "sales": len(state.get("sales", [])),
            "matches": len(state.get("matches", [])),
            "exceptions": len(state.get("exceptions", [])),
            "human_approvals": len(state.get("human_approvals", [])),
        },
    }
    return json.dumps(payload, ensure_ascii=False)


def planner_node(state: AgentGraphState) -> dict[str, Any]:
    """Plan the workflow with DeepSeek unless a plan is already provided."""

    if state.get("plan"):
        plan = _normalize_plan_steps(state["plan"])
        return {
            "current_agent": "planner",
            "run_status": AgentRunStatus.EXECUTING.value,
            "plan": plan,
            "trace": _append_trace(
                state,
                agent="planner",
                status="completed",
                message="Using precomputed plan from state.",
                plan_steps=len(plan),
            ),
        }

    attempt_errors: list[str] = []
    try:
        settings = get_deepseek_settings()
        client = create_deepseek_client(settings)
        system_prompt = (
            PLANNER_SYSTEM_PROMPT
            + (
                "\nPlanner thinking mode is enabled: reason internally about task "
                "decomposition, but return only the required JSON."
                if settings.planner_thinking_enabled
                else ""
            )
        )
        user_payload = _planner_payload(state)
        budget = AgentRunBudget.from_state(state.get("budget"))
        for attempt in range(MAX_PLANNER_JSON_RETRIES + 1):
            try:
                budget.record_llm_call(input_text=system_prompt + user_payload)
                response = client.chat.completions.create(
                    model=settings.model,
                    temperature=settings.deterministic_temperature,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_payload},
                    ],
                )
                content = response.choices[0].message.content or ""
                budget.record_output(content)
                plan = _parse_planner_output(content)
                if not plan:
                    raise ValueError("Planner returned an empty plan.")
                trace = _append_trace(
                    state,
                    agent="planner",
                    status="completed",
                    message="Planner generated workflow plan.",
                    plan_steps=len(plan),
                    attempts=attempt + 1,
                )
                return {
                    "current_agent": "planner",
                    "run_status": AgentRunStatus.EXECUTING.value,
                    "plan": plan,
                    "budget": budget.model_dump(),
                    "trace": trace,
                }
            except BudgetExceeded as exc:
                errors = list(state.get("errors", []))
                errors.append(f"budget_exceeded: {exc}")
                return {
                    "current_agent": "planner",
                    "run_status": AgentRunStatus.FAILED.value,
                    "errors": errors,
                    "budget": budget.model_dump(),
                    "trace": _append_trace(
                        state,
                        agent="planner",
                        status="failed",
                        message=str(exc),
                    ),
                }
            except Exception as exc:
                attempt_errors.append(f"planner_attempt_{attempt + 1}: {exc}")
    except Exception as exc:
        attempt_errors.append(f"planner_unavailable: {exc}")

    plan = _default_plan()
    errors = list(state.get("errors", []))
    errors.extend(attempt_errors)
    errors.append("planner_fallback: deterministic default plan")
    trace = _append_trace(
        state,
        agent="planner",
        status="fallback",
        message="Planner failed; using deterministic default plan.",
        plan_steps=len(plan),
        attempts=min(len(attempt_errors), MAX_PLANNER_JSON_RETRIES + 1),
    )
    return {
        "current_agent": "planner",
        "run_status": AgentRunStatus.EXECUTING.value,
        "plan": plan,
        "errors": errors,
        "trace": trace,
    }


def make_placeholder_node(agent_name: str) -> AgentNode:
    """Create a no-op node that marks the intended agent execution point."""

    def node(state: AgentGraphState) -> dict[str, Any]:
        completed_agents = list(state.get("completed_agents", []))
        if agent_name not in completed_agents:
            completed_agents.append(agent_name)
        output_key = f"{agent_name}_output"
        return {
            "current_agent": agent_name,
            "completed_agents": completed_agents,
            output_key: {
                "status": "pending_implementation",
                "message": "Specialist node scaffold; tool calls pending.",
            },
            "trace": _append_trace(
                state,
                agent=agent_name,
                status="placeholder",
                message="Specialist node scaffold; tool calls pending.",
            ),
        }

    return node


def build_single_agent_graph(agent_name: str, node: AgentNode | None = None) -> Any:
    """Build a minimal compiled LangGraph for one agent module."""

    graph = StateGraph(AgentGraphState)
    graph.add_node(agent_name, node or make_placeholder_node(agent_name))
    graph.add_edge(START, agent_name)
    graph.add_edge(agent_name, END)
    return graph.compile()


def _next_agent(state: AgentGraphState) -> RouteName:
    if state.get("run_status") == AgentRunStatus.FAILED.value:
        return "__end__"
    completed = set(state.get("completed_agents", []))
    for step in sorted(_normalize_plan_steps(state.get("plan", [])), key=lambda item: int(item.get("step", 0))):
        agent = step.get("agent")
        if agent in ALLOWED_SPECIALIST_AGENTS and agent not in completed:
            return agent
    return "__end__"


def _complete_workflow(state: AgentGraphState) -> dict[str, Any]:
    if state.get("run_status") == AgentRunStatus.FAILED.value:
        return {
            "run_status": AgentRunStatus.FAILED.value,
            "trace": _append_trace(
                state,
                agent="workflow",
                status="failed",
                message="Agent workflow failed before completion.",
                completed_agents=len(state.get("completed_agents", [])),
            ),
        }
    return {
        "run_status": AgentRunStatus.COMPLETED.value,
        "trace": _append_trace(
            state,
            agent="workflow",
            status="completed",
            message="Agent workflow completed.",
            completed_agents=len(state.get("completed_agents", [])),
        ),
    }


def build_agent_workflow() -> Any:
    """Build the full Planner -> Specialist LangGraph workflow."""

    graph = StateGraph(AgentGraphState)
    graph.add_node("planner", planner_node)
    graph.add_node("reconciliation", reconciliation_node)
    graph.add_node("tax_compliance", tax_compliance_node)
    graph.add_node("merchant_ops", merchant_ops_node)
    graph.add_node("complete", _complete_workflow)

    route_map = {
        "reconciliation": "reconciliation",
        "tax_compliance": "tax_compliance",
        "merchant_ops": "merchant_ops",
        "__end__": "complete",
    }

    graph.add_edge(START, "planner")
    graph.add_conditional_edges("planner", _next_agent, route_map)
    graph.add_conditional_edges("reconciliation", _next_agent, route_map)
    graph.add_conditional_edges("tax_compliance", _next_agent, route_map)
    graph.add_conditional_edges("merchant_ops", _next_agent, route_map)
    graph.add_edge("complete", END)
    return graph.compile()


agent_workflow: Any = build_agent_workflow()


__all__ = [
    "ALLOWED_SPECIALIST_AGENTS",
    "AgentGraphState",
    "AgentNode",
    "MAX_PLANNER_JSON_RETRIES",
    "RouteName",
    "SpecialistAgentName",
    "agent_workflow",
    "build_agent_workflow",
    "build_single_agent_graph",
    "make_placeholder_node",
    "planner_node",
]
