"""Reconciliation agent LangGraph scaffold."""

from typing import Any

from app.agents.graph import build_single_agent_graph
from app.agents.specialists import reconciliation_node


reconciliation_agent: Any = build_single_agent_graph("reconciliation", reconciliation_node)


__all__ = ["reconciliation_agent"]
