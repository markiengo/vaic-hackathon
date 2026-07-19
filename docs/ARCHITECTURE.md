# TaxLens — Architecture

## System Overview

```
Browser
  └─► Next.js (port 3000)
        ├── React Server Components + Client Components
        ├── TanStack Query for data fetching
        ├── Server-side API proxy (/api/backend/*)
        │     ├── JWT session management (HttpOnly cookies)
        │     ├── CSRF token validation
        │     └── Demo mode (auto-login with demo credentials)
        └── Routes:
              ├── (merchant)/* — Merchant Workspace
              ├── (operations)/* — SHB Operations Console
              ├── login — Authentication
              └── confirm/* — Public confirmation pages

  └─► FastAPI (port 8000)
        ├── REST API (/api/v1/*)
        ├── WebSocket (/ws/agent-trace/{run_id})
        ├── SePay Webhook (/api/v1/webhooks/sepay)
        └── Services:
              ├── Matching Engine (exact + fuzzy scoring)
              ├── Payment Allocation
              ├── Cash Reconciliation
              ├── Tax Rules Engine
              ├── Revenue Classifier
              ├── Vietnamese NLP
              └── LangGraph Agent Orchestrator
                    ├── Planner Agent
                    ├── Reconciliation Agent
                    ├── Merchant Ops Agent
                    └── Tax & Compliance Agent

  └─► PostgreSQL (Supabase)
        ├── 20 tables (merchants, users, sales, transactions, payments,
        │   cash, invoices, tax rules, reconciliation, agents, audit, notifications)
        └── Alembic migrations (001-004)

  └─► Redis (or in-memory fallback)
        ├── Rolling-window login lockout
        └── Concurrency limiter for agent runs
```

## Data Flow

### Sale → Payment → Match → Invoice → Tax

```
1. Merchant creates sale (POS)
   → Sale + SaleLine rows created
   → PaymentIntent generated with QR code

2. Customer pays via bank transfer
   → SePay webhook received
   → BankTransaction row created
   → Matching engine runs:
     - Exact match (payment_code reference) → auto-match
     - Fuzzy match (amount + note similarity) → candidate with confidence score
     - No match → exception created

3. Matched transaction
   → PaymentAllocation created (links transaction to payment intent)
   → Sale status → PAID
   → Invoice coverage checked

4. Tax readiness
   → Checklist evaluates all requirements
   → Missing invoices block readiness
   → Export generates clean dataset for accountant
```

### Agent Orchestration

```
User request (Vietnamese)
  → Planner Agent: decompose into steps
    → Reconciliation Agent: run matching, identify exceptions
    → Tax & Compliance Agent: check readiness, apply rules
    → Merchant Ops Agent: draft messages, create cases
  → Each step:
    - Tool calls are logged with input/output hashes
    - Audit events created for every action
    - Actions requiring approval are held as PROPOSED
  → Human approves → action executes → result recorded
```

## Authentication & Security

- **JWT-based**: access token (15 min) + refresh token (7 days)
- **HttpOnly cookies**: tokens never exposed to JavaScript
- **CSRF protection**: double-submit token on all mutations
- **RBAC**: role-based access control enforced on every endpoint
  - `merchant` — own merchant data only
  - `ops_staff` — operations console
  - `rm` — relationship manager
  - `compliance` — tax rule management
  - `admin` — full access
- **Rolling-window lockout**: 5 failed logins → 15 min lockout

## Error Handling

All errors follow a typed error code system:

| Code | HTTP | Meaning |
|---|---|---|
| ERR-AUTH-001 | 401 | Invalid credentials or token |
| ERR-AUTH-002 | 401 | Expired token |
| ERR-AUTH-003 | 403 | Insufficient role |
| ERR-MERCHANT-001 | 404 | Merchant not found |
| ERR-RECON-001 | 409 | Reconciliation already running |
| ERR-RECON-002 | 404 | No transactions in period |
| ERR-GEN-001 | 400 | Validation error |
| ERR-GEN-002 | 500 | Internal error |

## AI Provider Fallback

When no LLM API key is configured, the system uses a deterministic demo agent:
- Planner: returns a fixed default plan (reconciliation → tax → merchant ops)
- Specialists: return pre-computed responses based on seed data
- This ensures the demo always works without external dependencies

## Sandbox Adapters

| Adapter | Purpose |
|---|---|
| SHB | Simulated bank transaction feed |
| SePay | Payment webhook processing (real API format) |
| MISA | Invoice sync (mock) |
| CSV | Sales data import |

## Database Schema (20 tables)

```
merchants          → Merchant profiles
stores             → Physical store locations
devices            → POS devices
users              → All users (merchant, ops, rm, compliance, admin)
products           → Product/service catalog
sales              → Sales orders
sale_lines         → Line items per sale
bank_transactions  → Incoming bank transfers
payment_intents    → QR payment intents
payment_allocations→ Transaction-to-intent links
cash_sessions      → Cash drawer sessions
invoices           → Invoice records
tax_rule_versions  → Tax rule versions (per period)
tax_classifications→ Revenue classification rules
reconciliation_cases → Period reconciliation cases
exceptions         → Unresolved transaction exceptions
agent_runs         → AI agent execution records
tool_calls         → Individual tool call logs
audit_events       → Immutable audit trail
notifications      → User notifications
```
