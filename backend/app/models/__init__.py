# Import all models so Alembic autogenerate can discover them via Base.metadata.
# Order matters: parent tables before child tables.

from app.models.merchant import Merchant, Store, Device  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.sale import Sale, SaleLine  # noqa: F401
from app.models.transaction import BankTransaction  # noqa: F401
from app.models.payment import PaymentIntent, PaymentAllocation  # noqa: F401
from app.models.cash import CashSession  # noqa: F401
from app.models.invoice import Invoice  # noqa: F401
from app.models.tax import TaxClassification, TaxRuleVersion  # noqa: F401
from app.models.reconciliation import ReconciliationCase, ExceptionRecord  # noqa: F401
from app.models.agent import AgentRun, ToolCall, AuditEvent  # noqa: F401
