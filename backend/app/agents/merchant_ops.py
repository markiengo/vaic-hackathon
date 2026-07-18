"""Merchant operations agent LangGraph scaffold."""

from typing import Any

from app.agents.graph import build_single_agent_graph
from app.agents.specialists import merchant_ops_node


merchant_ops_agent: Any = build_single_agent_graph("merchant_ops", merchant_ops_node)


__all__ = ["merchant_ops_agent"]
