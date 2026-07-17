"""Reconciliation agent LangGraph scaffold."""

from typing import Any

from app.agents.graph import build_single_agent_graph


reconciliation_agent: Any = build_single_agent_graph("reconciliation")


__all__ = ["reconciliation_agent"]
