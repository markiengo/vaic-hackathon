# System Architecture — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** All KHỚP modules
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## High-level architecture

```text
┌──────────────────────────────┐
│ SHB Merchant Operations UI   │
│ Next.js + TypeScript         │
│ Dashboard + Exceptions +     │
│ Agent Trace + Mini POS       │
└──────────────┬───────────────┘
               │ REST / WebSocket
┌──────────────▼───────────────┐
│ FastAPI Backend              │
│ REST API + WebSocket         │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│ Planner / Orchestrator       │
│ LangGraph state flow         │
└───────┬───────────┬──────────┘
        │           │
┌───────▼──────┐ ┌──▼──────────────┐ ┌────────────────────┐
│ Reconcile    │ │ Tax & Compliance│ │ Merchant Operations│
│ Agent        │ │ Agent           │ │ Agent              │
└───────┬──────┘ └──┬──────────────┘ └─────────┬──────────┘
        │           │                          │
┌───────▼───────────▼──────────────────────────▼───────────┐
│ MCP / Tool Layer                                        │
│ Transactions | POS | Invoice | CRM | Case | Rules | RAG │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│ PostgreSQL + pgvector + Canonical Ledger + Audit Log     │
└──────────────────────────────────────────────────────────┘
```

*Figure 1: KHỚP high-level architecture*

## Component description

| Component | Technology | Purpose |
|---|---|---|
| Frontend UI | Next.js + TypeScript | Dashboard, Exception Inbox, Agent Trace, Mini POS, Tax-readiness View |
| Backend API | FastAPI (Python) | REST endpoints, WebSocket for real-time agent trace |
| Planner Agent | LangGraph | Decomposes requests, delegates to specialists, manages state |
| Reconciliation Agent | LangGraph + tools | Matches transactions to orders, creates exceptions |
| Tax & Compliance Agent | LangGraph + deterministic engine | Validates tax rules, generates readiness report |
| Merchant Operations Agent | LangGraph + tools | Creates cases, drafts messages, assigns RM, exports data |
| Tool Layer | MCP or typed function calling | Adapter interfaces for bank, POS, invoice, case, rules, RAG |
| Database | PostgreSQL + pgvector | Canonical ledger, audit log, tax rules, RAG embeddings |
| Queue | Redis + background worker | Webhook processing, async agent tasks |

## Request flow: Reconciliation workflow

```text
User: "Check if Salon Hoa is ready for July reporting"
  │
  ▼
Planner Agent
  ├──► Step 1: get_merchant_profile(M001)  → Merchant Ops Agent
  ├──► Step 2: get_bank_transactions(M001, 2026-07)  → Reconciliation Agent
  ├──► Step 3: get_sales_orders(M001, 2026-07)  → Reconciliation Agent
  ├──► Step 4: get_cash_sessions(M001, 2026-07)  → Reconciliation Agent
  ├──► Step 5: get_invoices(M001, 2026-07)  → Reconciliation Agent
  ├──► Step 6: reconcile()  → Reconciliation Agent
  │      ├── exact_match()  → 25 matched
  │      ├── candidate_match()  → 5 candidates
  │      └── create_exceptions()  → 5 exceptions
  ├──► Step 7: validate_tax_rules(2026.07)  → Tax Agent
  ├──► Step 8: check_required_fields()  → Tax Agent
  ├──► Step 9: generate_tax_readiness_report()  → Tax Agent
  ├──► Step 10: create_case(5 exceptions)  → Merchant Ops Agent
  ├──► Step 11: assign_task_to_rm()  → Merchant Ops Agent
  └──► Step 12: draft_merchant_message()  → Merchant Ops Agent
  │
  ▼
Result: Agent trace + exceptions + tax-readiness report + cases
```

*Figure 2: Reconciliation workflow request flow*

## Request flow: Dynamic QR payment

```text
Mini POS: Create sale (350,000₫)
  │
  ▼
Backend: Create payment_intent (PAY-X7K92P, 350,000₫, 15min expiry)
  │
  ▼
Frontend: Display QR with amount + reference
  │
  ▼
Customer scans QR → Bank transfer with note "PAY-X7K92P"
  │
  ▼
SePay/SHB webhook → Backend
  │
  ▼
Reconciliation Agent: find_payment_reference("PAY-X7K92P")
  ├── Match found → exact_match → order status = PAID
  └── Audit event logged
```

*Figure 3: Dynamic QR payment flow*

## Module structure and directory map

```text
khop/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/              # App router pages
│   │   │   ├── dashboard/    # Merchant overview
│   │   │   ├── exceptions/   # Exception Inbox
│   │   │   ├── trace/        # Agent trace view
│   │   │   ├── tax/          # Tax-readiness view
│   │   │   ├── pos/          # Mini POS
│   │   │   └── audit/        # Audit log export
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # API client, utils
│   │   └── types/            # TypeScript types
│   ├── package.json
│   └── next.config.js
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── routers/          # API route handlers
│   │   │   ├── merchants.py
│   │   │   ├── transactions.py
│   │   │   ├── sales.py
│   │   │   ├── reconciliation.py
│   │   │   ├── tax.py
│   │   │   ├── cases.py
│   │   │   ├── agents.py
│   │   │   └── audit.py
│   │   ├── agents/           # Agent implementations
│   │   │   ├── planner.py
│   │   │   ├── reconciliation.py
│   │   │   ├── tax_compliance.py
│   │   │   └── merchant_ops.py
│   │   ├── tools/            # Tool implementations (MCP layer)
│   │   │   ├── bank.py
│   │   │   ├── pos.py
│   │   │   ├── invoice.py
│   │   │   ├── case.py
│   │   │   ├── rules.py
│   │   │   └── rag.py
│   │   ├── adapters/         # Source adapters
│   │   │   ├── shb.py
│   │   │   ├── sepay.py
│   │   │   ├── kiotvet.py
│   │   │   ├── csv.py
│   │   │   └── invoice.py
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── core/             # Config, security, database
│   ├── alembic/              # Database migrations
│   ├── tests/                # Test suite
│   ├── requirements.txt
│   └── alembic.ini
├── docker-compose.yml
├── docs/                     # This documentation set
└── product.md                # Original product spec
```

*Figure 4: Project directory map. This document owns the directory map; other documents reference it.*

## Authentication architecture overview

Authentication is handled at the FastAPI backend using JWT tokens. See `11-security.md` for details.

- SHB staff: username/password → JWT
- Merchant confirmation: token-based links (no login required)
- API endpoints: JWT in Authorization header
- WebSocket: JWT in connection params

## Environment overview

See `13-environment-setup.md` for complete setup instructions.

| Environment | Purpose | Database |
|---|---|---|
| Development | Local dev | PostgreSQL in Docker |
| Demo | Hackathon demo | PostgreSQL in Docker with seed data |
| Pilot (future) | SHB internal | PostgreSQL in VPC |

## Key technical decisions

See `DECISIONS.md` for rationale:

- DEC-001: Multi-agent architecture
- DEC-002: Canonical Event Ledger
- DEC-003: Payment reference as link key
- DEC-004: Tax Rules Engine separate from LLM
- DEC-006: Next.js + FastAPI + PostgreSQL

## Shared Case State

Agents exchange data through a structured schema, not free text:

```json
{
  "case_id": "CASE-001",
  "merchant_id": "M001",
  "period": "2026-07",
  "transactions": [],
  "sales": [],
  "matches": [],
  "exceptions": [],
  "tax_rule_version": "2026.07",
  "human_approvals": [],
  "case_status": "WAITING_FOR_CONFIRMATION"
}
```

This schema is the inter-agent contract. Agents read and write specific fields; they do not pass unstructured text as truth.

## Verification

### Automated

- `cd backend && python -c "from app.main import app"` — verifies backend imports
- `cd frontend && npm run build` — verifies frontend builds
- `docker-compose config` — verifies compose file

### Manual

- Verify directory structure matches Figure 4
- Verify architecture diagram matches described components
- Verify request flows cover main use cases (reconciliation, QR payment)

---

*Last updated: 2026-07-17*
