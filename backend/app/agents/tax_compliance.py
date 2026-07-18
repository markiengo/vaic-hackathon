"""Tax compliance agent LangGraph scaffold."""

from typing import Any

from app.agents.graph import build_single_agent_graph
from app.agents.specialists import tax_compliance_node


tax_compliance_agent: Any = build_single_agent_graph("tax_compliance", tax_compliance_node)


__all__ = ["tax_compliance_agent"]
