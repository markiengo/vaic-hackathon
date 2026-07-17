# Testing Specification — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** QA Lead
> **Applies to:** All KHỚP modules
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Test strategy

| Level | Scope | Tool | Coverage target |
|---|---|---|---|
| Unit | Individual functions, algorithms | pytest | 80% |
| Integration | API endpoints, database, adapters | pytest + httpx | 70% |
| E2E | Full workflow from request to result | pytest + Playwright | Key flows |
| Contract | Tool schemas, API schemas | pytest + Pydantic | All tools |

## Test inventory

### Backend tests

| Test file | Covers | FRs |
|---|---|---|
| `test_reconciliation.py` | Exact matching, candidate matching, exception creation | FR-RECON-001 to 005 |
| `test_tax_rules.py` | Tax-readiness checklist, rule version, missing invoice detection | FR-TAX-001 to 004 |
| `test_agents.py` | Planner decomposition, agent delegation, tool allowlists | FR-AGENT-001, 002 |
| `test_audit.py` | Audit event creation, export JSON/CSV | FR-AGENT-003 |
| `test_pos.py` | Sale creation, QR generation, cash payment, session close | FR-POS-001 to 004 |
| `test_api/` | All API endpoints | All API-XXX |
| `test_adapters/` | SHB, SePay, CSV, invoice adapters | FR-DATA-001 |
| `test_security.py` | Auth, RBAC, masking, CORS | SEC-XXX |
| `test_permissions.py` | Role-based access per endpoint | FR-XXX |
| `test_errors.py` | Error codes and responses | ERR-XXX |
| `test_webhooks.py` | SePay webhook, idempotency, signature | FR-POS-002 |

### Frontend tests (post-MVP)

| Test file | Covers |
|---|---|
| E2E: Dashboard loads, summary cards display |
| E2E: Exception Inbox, resolve flow |
| E2E: Agent trace real-time updates |
| E2E: Mini POS sale → QR → cash flow |
| E2E: Tax-readiness checklist display |
| E2E: Audit log export download |

## Acceptance criteria summary

Every FR has binary acceptance criteria defined in `04-functional-requirements.md`. Tests verify each criterion.

## Test data and fixtures strategy

### Demo dataset (MVP)

From product.md §17:
- 1 merchant (Salon Hoa, M001)
- 1 store (S001)
- 30 sales orders (mix of paid, unpaid, partial)
- 20 bank transfers (mix of with-reference, without-reference, non-revenue)
- 8 cash payments
- 2 non-revenue transactions (internal transfer, loan)
- 2 ambiguous same-amount transactions
- 1 refund
- 2 orders missing invoices
- 1 cash discrepancy

### Truth set

| Transaction | Expected match | Expected confidence | Expected exception |
|---|---|---|---|
| TX with PAY-REF → ORDER | Exact match | 100% | No |
| TX without ref, unique amount | Fuzzy match | ≥95% | No |
| TX without ref, same amount as 2 orders | No auto-match | <75% | Yes (AMBIGUOUS_MATCH) |
| TX 5M from owner, no order | No match | 82% | Yes (NO_MATCH, suggested: internal_transfer) |
| TX for goods purchase | No match | 62% | Yes (NO_MATCH, suggested: purchase_payment) |
| Refund TX | Match to original | 100% | No |
| Paid order, no invoice | — | — | Yes (MISSING_INVOICE) |
| Cash session discrepancy | — | — | Yes (CASH_DISCREPANCY) |

### Fixture creation

- Seed data via Alembic migration (`alembic seed demo`)
- Truth set encoded in test fixtures as JSON
- Cleanup: test database recreated per test run

### Production data

- No production data used in MVP
- Pilot phase: anonymized data only (per product.md §22)

## Coverage targets

| Module | Target |
|---|---|
| Reconciliation engine | 90% |
| Tax Rules Engine | 90% |
| Agent orchestration | 80% |
| Adapters | 70% |
| API endpoints | 80% |
| Frontend | E2E for key flows only (MVP) |

## CI integration

```yaml
# .github/workflows/ci.yml (example)
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres: ...
      redis: ...
    steps:
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && alembic upgrade head
      - run: cd backend && pytest tests/ -v --cov=app --cov-report=term
  frontend:
    runs-on: ubuntu-latest
    steps:
      - run: cd frontend && npm install
      - run: cd frontend && npm run build
      - run: cd frontend && npm run lint
```

## Test case IDs

| Test ID | Description | FR traced |
|---|---|---|
| TEST-RECON-001 | Exact match with valid reference | FR-RECON-001 |
| TEST-RECON-002 | Exact match rejects mismatched amount | FR-RECON-001 |
| TEST-RECON-003 | Candidate match generates scored candidates | FR-RECON-002 |
| TEST-RECON-004 | Score ≥95% auto-matches | FR-RECON-002 |
| TEST-RECON-005 | Score 75-94% goes to Exception Inbox | FR-RECON-002 |
| TEST-RECON-006 | Score <75% marked unmatched | FR-RECON-002 |
| TEST-RECON-007 | Two identical orders → mandatory exception | FR-RECON-002 |
| TEST-RECON-008 | Exception Inbox shows only <95% items | FR-RECON-003 |
| TEST-RECON-009 | AI suggestion includes confidence and reasoning | FR-RECON-004 |
| TEST-RECON-010 | Three-layer note handling (raw, normalized, AI) | FR-RECON-004 |
| TEST-RECON-011 | Payment allocation across multiple orders | FR-RECON-005 |
| TEST-TAX-001 | Tax-readiness checklist displays all items | FR-TAX-001 |
| TEST-TAX-002 | Report includes rule version and effective date | FR-TAX-002 |
| TEST-TAX-003 | Missing invoice detection flags paid orders | FR-TAX-003 |
| TEST-TAX-004 | Draft export in JSON and CSV | FR-TAX-004 |
| TEST-OPS-001 | Case created for unresolved exceptions | FR-OPS-001 |
| TEST-OPS-002 | Draft message in Vietnamese | FR-OPS-002 |
| TEST-OPS-003 | RM assignment based on merchant mapping | FR-OPS-003 |
| TEST-POS-001 | Mini POS creates sale with items | FR-POS-001 |
| TEST-POS-002 | Dynamic QR contains amount and reference | FR-POS-002 |
| TEST-POS-003 | Cash payment records and updates order | FR-POS-003 |
| TEST-POS-004 | Cash reconciliation detects discrepancy | FR-POS-004 |
| TEST-AGENT-001 | Planner decomposes request into steps | FR-AGENT-001 |
| TEST-AGENT-002 | Agent trace shows tool calls and confidence | FR-AGENT-002 |
| TEST-AGENT-003 | Audit log export JSON and CSV | FR-AGENT-003 |
| TEST-MERCHANT-001 | Confirmation link displays transaction | FR-MERCHANT-001 |
| TEST-MERCHANT-002 | Confirmation submission resolves exception | FR-MERCHANT-001 |
| TEST-DATA-001 | SHB adapter ingests to canonical ledger | FR-DATA-001 |
| TEST-DATA-002 | SePay webhook creates transaction | FR-DATA-001 |
| TEST-DATA-003 | CSV import creates canonical records | FR-DATA-001 |

## Verification

### Automated

- `cd backend && python -m pytest tests/ -v --cov=app` — all tests with coverage

### Manual

- Run demo flow end-to-end and verify each TEST-XXX passes
- Verify truth set matches expected outcomes

---

*Last updated: 2026-07-17*
