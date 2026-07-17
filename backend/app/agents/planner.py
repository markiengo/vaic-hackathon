"""Planner agent LangGraph scaffold."""

from typing import Any

from app.agents.graph import build_single_agent_graph, planner_node


planner_agent: Any = build_single_agent_graph("planner", planner_node)


__all__ = ["planner_agent"]
