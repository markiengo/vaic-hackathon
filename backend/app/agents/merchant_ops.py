"""Merchant operations agent LangGraph scaffold."""

from typing import Any

from app.agents.graph import build_single_agent_graph


merchant_ops_agent: Any = build_single_agent_graph("merchant_ops")


__all__ = ["merchant_ops_agent"]
