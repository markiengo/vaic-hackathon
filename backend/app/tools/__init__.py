"""Typed tool interface.

P1 supplies reconciliation tools; the remaining P2 contracts are stubs for
P5's request-scoped implementations.
"""

from typing import Any
from typing import Literal
from typing import NoReturn

from app.schemas.agent import (
    MerchantMessageDraft,
    TaxReadinessReport,
    ToolCallResult,
)
from app.tools.reconciliation import (
    create_reconciliation_exception,
    find_payment_reference,
    score_match_candidates,
)

JSONValue = str | int | float | bool | None | dict[str, Any] | list[Any]
JSONDict = dict[str, JSONValue]
JSONList = list[JSONDict]


def _not_implemented(tool_name: str) -> NoReturn:
    raise NotImplementedError(f"Tool '{tool_name}' is defined by P2 and must be implemented by P5.")


# Bank / source retrieval tools
def get_bank_transactions(merchant_id: str, period: str) -> JSONList:
    """Return bank transactions for a merchant and period."""
    _not_implemented("get_bank_transactions")


def get_sales_orders(merchant_id: str, period: str) -> JSONList:
    """Return sales orders for a merchant and period."""
    _not_implemented("get_sales_orders")


def get_cash_sessions(merchant_id: str, period: str) -> JSONList:
    """Return cash sessions for a merchant and period."""
    _not_implemented("get_cash_sessions")


def get_invoices(merchant_id: str, period: str) -> JSONList:
    """Return invoices for a merchant and period."""
    _not_implemented("get_invoices")


# Tax tools
def retrieve_tax_rules(merchant_segment: str, business_vertical: str) -> JSONDict | None:
    """Return the active tax rule bundle for a merchant segment."""
    _not_implemented("retrieve_tax_rules")


def validate_rule_version(rule_version: str) -> JSONDict:
    """Validate a specific tax rule version."""
    _not_implemented("validate_rule_version")


def classify_revenue_category(transaction: JSONDict) -> JSONDict:
    """Classify revenue category from a transaction payload."""
    _not_implemented("classify_revenue_category")


def check_required_fields(merchant_id: str, period: str) -> JSONDict:
    """Check required fields for tax readiness."""
    _not_implemented("check_required_fields")


def generate_tax_readiness_report(merchant_id: str, period: str, rule_version: str) -> TaxReadinessReport:
    """Generate a tax readiness report."""
    _not_implemented("generate_tax_readiness_report")


def create_draft_export(
    merchant_id: str,
    period: str,
    rule_version: str,
    export_format: Literal["json", "csv"] = "json",
) -> ToolCallResult:
    """Create an export artifact for accounting systems."""
    _not_implemented("create_draft_export")


# Merchant operations tools
def create_case(merchant_id: str, period: str, exception_ids: list[str] | None = None) -> JSONDict:
    """Create a merchant operations case."""
    _not_implemented("create_case")


def assign_task_to_rm(case_id: str, rm_user_id: str) -> JSONDict:
    """Assign a case task to a relationship manager."""
    _not_implemented("assign_task_to_rm")


def draft_merchant_message(
    case_id: str,
    merchant_id: str,
    period: str,
    tone: Literal["polite", "formal", "urgent"] = "polite",
) -> MerchantMessageDraft:
    """Draft a merchant-facing confirmation message."""
    _not_implemented("draft_merchant_message")


def send_confirmation_request(token: str, message: str) -> JSONDict:
    """Send a merchant confirmation request."""
    _not_implemented("send_confirmation_request")


def update_case_status(case_id: str, status: str) -> JSONDict:
    """Update a case status."""
    _not_implemented("update_case_status")


def export_to_accounting_system(
    merchant_id: str,
    period: str,
    export_format: Literal["json", "csv"] = "json",
) -> ToolCallResult:
    """Export cleaned data to an accounting system format."""
    _not_implemented("export_to_accounting_system")


__all__ = [
    "JSONDict",
    "JSONList",
    "JSONValue",
    "get_bank_transactions",
    "get_sales_orders",
    "get_cash_sessions",
    "get_invoices",
    "find_payment_reference",
    "score_match_candidates",
    "create_reconciliation_exception",
    "retrieve_tax_rules",
    "validate_rule_version",
    "classify_revenue_category",
    "check_required_fields",
    "generate_tax_readiness_report",
    "create_draft_export",
    "create_case",
    "assign_task_to_rm",
    "draft_merchant_message",
    "send_confirmation_request",
    "update_case_status",
    "export_to_accounting_system",
]
