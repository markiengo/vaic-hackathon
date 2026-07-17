# System Architecture — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Tất cả module của TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

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

*Figure 1: Kiến trúc tổng quan TaxLens*

## Component description

| Component | Technology | Purpose |
|---|---|---|
| Frontend UI | Next.js + TypeScript | Dashboard, Exception Inbox, Agent Trace, Mini POS, Tax-readiness View |
| Backend API | FastAPI (Python) | REST endpoint, WebSocket cho agent trace real-time |
| Planner Agent | LangGraph | Phân tách yêu cầu, delegate cho specialist, quản lý state |
| Reconciliation Agent | LangGraph + tool | Match giao dịch với đơn hàng, tạo ngoại lệ |
| Tax & Compliance Agent | LangGraph + deterministic engine | Kiểm tra tax rule, tạo readiness report |
| Merchant Operations Agent | LangGraph + tool | Tạo case, draft tin nhắn, giao RM, xuất dữ liệu |
| Tool Layer | Typed function calling (Python) | Adapter interface cho bank, POS, invoice, case, rule, RAG |
| Database | PostgreSQL + pgvector | Canonical ledger, audit log, tax rule, RAG embedding |
| Queue | Redis + background worker | Webhook processing, async agent task |

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

*Figure 2: Flow yêu cầu reconciliation workflow*

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

*Figure 3: Flow thanh toán Dynamic QR*

## Module structure and directory map

```text
taxlens/
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

*Figure 4: Bản đồ thư mục dự án. Tài liệu này sở hữu directory map; tài liệu khác tham chiếu nó.*

## Authentication architecture overview

Authentication được xử lý tại FastAPI backend bằng JWT token. Xem `03-engineering/06-security.md` cho chi tiết.

- Nhân viên SHB: username/password → JWT
- Xác nhận merchant: link dựa trên token (không cần login)
- API endpoint: JWT trong Authorization header
- WebSocket: JWT trong connection param

## Environment overview

Xem `04-delivery/01-environment-setup.md` cho hướng dẫn setup đầy đủ.

| Environment | Purpose | Database |
|---|---|---|
| Development | Dev local | PostgreSQL trong Docker |
| Demo | Demo hackathon | PostgreSQL trong Docker với seed data |
| Pilot (tương lai) | SHB internal | PostgreSQL trong VPC |

## Key technical decisions

Xem `01-foundation/03-decisions.md` cho rationale:

- DEC-001: Multi-agent architecture
- DEC-002: Canonical Event Ledger
- DEC-003: Payment reference as link key
- DEC-004: Tax Rules Engine separate from LLM
- DEC-006: Next.js + FastAPI + PostgreSQL

## Shared Case State

Agent trao đổi dữ liệu qua schema structured, không phải free text:

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

Schema này là inter-agent contract. Agent đọc và ghi field cụ thể; không truyền unstructured text làm truth.

## Verification

### Automated

- `cd backend && python -c "from app.main import app"` — verify backend import
- `cd frontend && npm run build` — verify frontend build
- `docker-compose config` — verify compose file

### Manual

- Verify cấu trúc thư mục khớp Figure 4
- Verify architecture diagram khớp component mô tả
- Verify request flow cover use case chính (reconciliation, QR payment)

---

*Last updated: 2026-07-17*
