# Team Work Split — KHỚP Hackathon MVP

> **Status:** Draft | **Authority:** Informative | **Owner:** Project Lead
> **Applies to:** 5-person team, 48-hour hackathon

---

## Team Roster

| Person | Skills | Role | Owns |
|--------|--------|------|------|
| **P1** | Math, quant, problem solving | Matching & Financial Logic | Match scoring, payment allocation, cash reconciliation, confidence thresholds |
| **P2** | LLM agents + Vietnamese NLP | AI Agent Layer | LangGraph, 4 agents, system prompts, note interpretation, RAG |
| **P3** | Backend + product taste, vibecodes frontend | Product + Frontend | All UI screens, API client, WebSocket, demo script, pitch |
| **P4** | Backend, Redis, APIs | Backend Infra | FastAPI, REST endpoints, WebSocket server, Redis, DB migrations, models |
| **P5** | MCP, AI, data + tax domain | Data Pipeline + Tax | Adapters, tool implementations, seed data, Tax Rules Engine, tax seed |

---

## Sprint 1 — Foundation (Hours 1–8)

**Goal:** Everything compiles, DB up, seed data loaded, frontend shell exists, adapters produce canonical records.

### P1 — Matching & Financial Logic

**Tasks:**
- Exact matching engine: match `bank_transactions` → `sales` via `payment_reference`
- Candidate/fuzzy matching with scoring per `product.md` §9.4 (amount +50, time +20, ref +20, sender +10, multi-order -30)
- Threshold logic: ≥95% auto, 75–94% ask human, <75% unmatched
- Payment allocation: many-to-many via `payment_allocations`, sum validation
- Edge cases: split payment, two-payer, multi-order, over/underpayment, deposit+remainder, refund

**Exit criteria:**
- `exact_match()` returns True when ref+amount+UNPAID+unused
- `candidate_match()` returns ranked `MatchCandidate` list with scores
- `allocate_payment()` creates records, validates sum ≤ transaction amount
- 10+ unit tests pass covering exact, fuzzy, no-match, split, refund

**Files:** `backend/app/services/matching.py`, `backend/app/services/allocation.py`, `backend/tests/test_matching.py`, `backend/tests/test_allocation.py`

---

### P2 — AI Agent Layer

**Tasks:**
- LangGraph project structure in `backend/app/agents/`
- DeepSeek API client config (`deepseek-chat`, OpenAI-compatible endpoint)
- System prompts for all 4 agents from `05-domain/01-ai-advisor.md`
- Tool function signatures (stubs — P5 implements, P2 defines interface)
- Pydantic schemas for agent I/O and Shared Case State
- Agent state machine: `PENDING → PLANNING → EXECUTING → WAITING_FOR_HUMAN → COMPLETED / FAILED`
- Temperature: 0.1 deterministic, 0.3 message drafting. Thinking mode for Planner.

**Exit criteria:**
- All agent modules importable: `from app.agents.planner import planner_agent`
- DeepSeek responds to test prompt
- All 19 tool signatures defined with type hints
- Shared Case State model validates JSON from architecture doc
- State machine enum has all 6 states

**Files:** `backend/app/agents/{__init__,planner,reconciliation,tax_compliance,merchant_ops,state,prompts}.py`, `backend/app/schemas/agent.py`, `backend/app/tools/__init__.py`

---

### P3 — Product + Frontend

**Tasks:**
- Next.js 14 + TypeScript + TailwindCSS setup
- Design tokens from `04-delivery/03-design.md` (SHB green #006837, Inter font, spacing 4–48px)
- App shell: header (logo + merchant selector + user) + sidebar (7 items) + content area
- Routing for all 8 routes: `/dashboard`, `/exceptions`, `/tax`, `/cases`, `/trace`, `/audit`, `/pos`, `/confirm/[token]`
- API client `src/lib/api.ts` with mock responses
- WebSocket client stub `src/lib/ws.ts`
- Zustand store for UI state
- All 7 page shells with mock data matching screen specs
- Install: TanStack Query, Zustand, Axios, Lucide React

**Exit criteria:**
- `npm run build` + `npm run lint` pass
- Sidebar navigates to all 7 pages, no blank screens
- SHB green visible, Inter font loaded
- Vietnamese renders correctly ("Đối soát", "Ngoại lệ", "Hóa đơn")
- Responsive at 1280px

**Files:** `frontend/{package.json,next.config.js,tailwind.config.ts}`, `frontend/src/app/{layout,page}.tsx`, 8 page files, `frontend/src/components/{AppShell,Sidebar,Header}.tsx`, `frontend/src/lib/{api,ws,store}.ts`, `frontend/src/types/index.ts`

---

### P4 — Backend Infrastructure

**Tasks:**
- FastAPI project structure per architecture doc
- All 16 SQLAlchemy models from `03-engineering/02-data-models.md`
- Alembic migration: all tables, FKs, cascade rules, indexes
- PostgreSQL + pgvector in Docker, Redis container
- `docker-compose.yml`: postgres, redis, backend, frontend
- DB session management, dependency injection
- Core config: env vars, DB URL, Redis URL, JWT secret, DeepSeek key
- Base Pydantic schema patterns

**Exit criteria:**
- `alembic upgrade head` creates all 16 tables
- `alembic downgrade base` rolls back clean
- `docker-compose up` starts all services
- `from app.main import app` imports
- pgvector enabled: `SELECT * FROM pg_extension WHERE extname = 'vector'`
- All indexes created, cascade rules verified
- `.env.example` documented

**Files:** `backend/app/main.py`, `backend/app/core/{config,database,redis}.py`, `backend/app/models/*.py`, `backend/alembic/versions/001_initial_schema.py`, `backend/alembic.ini`, `backend/requirements.txt`, `docker-compose.yml`, `backend/.env.example`

---

### P5 — Data Pipeline + Tax

**Tasks:**
- SHB mock adapter: realistic Vietnamese bank transactions (sender_name, raw_note with/without diacritics, reference_number, amount, date)
- SePay webhook handler: parse payload (transaction_date, transaction_content, amount_in, transferType, reference_number, code, sub_account, accumulated), create `bank_transactions` with source='sepay'
- CSV import adapter: parse CSV → canonical records, source='csv'
- Invoice mock adapter: create + retrieve invoices
- Seed data per `product.md` §17: 1 salon, 1 store, 1 device, 5 users, 10 products, 30 sales, 20 transfers, 8 cash, 2 non-revenue, 2 same-amount, 1 refund, 2 missing invoices, 1 cash discrepancy, 28 invoices
- Tax Rules Engine: `retrieve_tax_rules()`, `validate_rule_version()`, `check_required_fields()`
- Tax rule seed: version 2026.07, salon, effective 2021-07-01, source "Thông tư 40/2021/TT-BTC", APPROVED
- Required fields JSON + validation formula JSON

**Exit criteria:**
- `python scripts/seed_data.py` populates all tables
- Counts verified: 30 sales, 23 bank_transactions, 1 cash_session, 28 invoices
- `get_bank_transactions("M001", "2026-07")` returns 23 records
- POST to `/webhooks/sepay` creates bank_transaction
- CSV import produces canonical records
- `retrieve_tax_rules("salon", "beauty")` returns 2026.07
- `validate_rule_version("2026.07")` returns valid+APPROVED+effective
- `check_required_fields("M001", "2026-07")` flags 2 missing invoices

**Files:** `backend/app/adapters/{shb,sepay,csv,invoice}.py`, `backend/app/tools/{bank,pos,invoice,case,rules,rag}.py`, `backend/app/services/tax_rules.py`, `backend/scripts/seed_data.py`

---

## Sprint 2 — Core Logic (Hours 9–20)

**Goal:** Agents run end-to-end, matching on seed data, all APIs responding, frontend consumes real data.

### P1 — Matching & Financial Logic

**Tasks:**
- Wire matching to DB models + seed data
- Verify on seed data: 25 exact, 5 exceptions (2 ambiguous, 2 no-match, 1 cash discrepancy)
- Cash reconciliation: expected = opening + cash sales - expenses, compare counted, create exception if discrepancy
- `score_match_candidates` tool: query candidates by merchant/amount±5%/time window, apply weights, return ranked
- `find_payment_reference` tool: lookup payment_intents by code
- `create_reconciliation_exception` tool: create exception record with ai_suggestion JSONB

**Exit criteria:**
- Seed data matching: 25 matched, 5 exceptions, 0 false matches
- `score_match_candidates("M001", 350000, 60, "Nguyen Van A", "cat toc")` returns ranked candidates
- Cash recon: expected 5,200,000, counted 5,080,000, discrepancy -120,000 → exception
- All integration tests pass

**Files:** `backend/app/services/matching.py` (updated), `backend/app/services/cash_reconciliation.py`, `backend/app/tools/reconciliation.py`, `backend/tests/test_matching_integration.py`, `backend/tests/test_cash_reconciliation.py`

---

### P2 — AI Agent Layer

**Tasks:**
- Planner Agent: accept NL request → decompose → assign agents. Output plan JSON.
- Reconciliation Agent: call bank/sales/cash/invoice tools, find_payment_reference, score_match_candidates, create_reconciliation_exception. Output match summary JSON.
- Tax & Compliance Agent: call retrieve_tax_rules, validate_rule_version, classify_revenue_category, check_required_fields, generate_tax_readiness_report, create_draft_export. Output readiness report JSON.
- Merchant Ops Agent: call create_case, assign_task_to_rm, draft_merchant_message, send_confirmation_request, update_case_status, export_to_accounting_system. Output action summary JSON.
- Agent run state machine with transitions logged to `agent_runs`
- Audit logging: every tool call → `tool_calls` + `audit_events` records
- Error handling: invalid JSON retry (max 2), hallucinated tool rejection + log, LLM unavailable fallback
- Budget limits: 50 LLM calls/run, 10K input/2K output tokens, 5 concurrent runs via Redis

**Exit criteria:**
- Full agent run on "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa":
  - Planner produces ≥3 step plan
  - Reconciliation returns matched=25, unmatched=5
  - Tax returns readiness report with rule_version=2026.07, ready=false (2 missing invoices)
  - Merchant Ops creates cases, drafts Vietnamese message
- `agent_runs` record with status=COMPLETED
- `tool_calls` table has records for every tool called
- `audit_events` has records for every tool call + human approval
- Hallucination test: inject invalid tool name → rejected + logged, run continues

**Files:** `backend/app/agents/{planner,reconciliation,tax_compliance,merchant_ops}.py` (full implementations), `backend/app/agents/audit.py`, `backend/tests/test_agents.py`

---

### P3 — Product + Frontend

**Tasks:**
- Dashboard: 4 summary cards (total transactions, reconciliation rate, open exceptions, tax readiness) + active agents panel + "Bắt đầu đối soát" button. Wire to real `/api/merchants/{id}/dashboard` + `/api/agents` endpoints.
- Exception Inbox: filter bar (merchant, period, type) + exception cards (amount, sender, note, AI suggestion badge with confidence, expandable reasoning) + action buttons [Duyệt] [Từ chối] [Phân loại lại]. Wire to `/api/reconciliation/exceptions`.
- Mini POS: product grid (left) + cart with quantity controls (right) + [Tiền mặt] [Tạo QR] buttons + QR modal with timer + cash session summary bar. Wire to `/api/pos/sales`, `/api/pos/payment-intents`, `/api/pos/cash-sessions`.
- Replace mock data with TanStack Query hooks hitting real API
- WebSocket connection for real-time agent trace updates → Zustand store

**Exit criteria:**
- Dashboard shows real seed data counts (30 transactions, 83% reconciliation rate, 5 exceptions, not ready)
- Exception Inbox lists 5 real exceptions with AI suggestions and confidence scores
- Mini POS: select product → add to cart → create sale → generate QR with reference → display QR + 15min timer
- Mini POS: cash button → record cash payment → update sale status
- All data from real backend, no mocks
- WebSocket connects and receives agent trace events

**Files:** `frontend/src/app/dashboard/page.tsx` (updated), `frontend/src/app/exceptions/page.tsx` (updated), `frontend/src/app/pos/page.tsx` (updated), `frontend/src/components/{SummaryCard,ExceptionCard,ProductGrid,Cart,QRModal,CashSessionBar}.tsx`, `frontend/src/hooks/{useDashboard,useExceptions,usePOS,useAgentTrace}.ts`

---

### P4 — Backend Infrastructure

**Tasks:**
- Auth endpoints: POST `/api/auth/login` (username+password → JWT access+refresh), POST `/api/auth/refresh`, GET `/api/auth/me`
- Merchant endpoints: GET `/api/merchants/{id}`, GET `/api/merchants/{id}/dashboard` (summary stats)
- Transaction endpoints: GET `/api/transactions?merchant_id=&period=`
- Reconciliation endpoints: POST `/api/reconciliation/start`, GET `/api/reconciliation/{case_id}`, POST `/api/reconciliation/exceptions/{id}/resolve`
- Tax endpoints: GET `/api/tax/readiness?merchant_id=&period=`, POST `/api/tax/export`
- Case endpoints: GET `/api/cases`, POST `/api/cases`, POST `/api/cases/{id}/assign`, POST `/api/cases/{id}/message`
- Agent endpoints: POST `/api/agents/run`, GET `/api/agents/runs/{id}`, GET `/api/agents/runs/{id}/trace`
- Audit endpoints: GET `/api/audit?merchant_id=&period=&format=`
- POS endpoints: POST `/api/pos/sales`, POST `/api/pos/payment-intents`, POST `/api/pos/cash-payments`, POST `/api/pos/cash-sessions/close`
- Merchant confirmation: GET `/api/confirm/{token}`, POST `/api/confirm/{token}`
- WebSocket: `/ws/agent-trace/{run_id}` pushes tool_call events in real-time
- Pydantic request/response schemas for all endpoints
- JWT auth middleware, role-based access
- Redis queue for async agent runs

**Exit criteria:**
- All 20 endpoints respond with correct status codes
- Login returns JWT, protected routes reject without token
- `POST /api/reconciliation/start` triggers agent run, returns run_id
- `GET /api/agents/runs/{id}/trace` returns tool call history
- WebSocket `/ws/agent-trace/{run_id}` pushes events as agent executes
- `GET /api/audit?format=json` returns audit events array
- `GET /api/audit?format=csv` returns CSV download
- All 22 error codes from `03-engineering/07-error-codes.md` return correct responses
- Redis queue processes agent runs asynchronously

**Files:** `backend/app/routers/{auth,merchants,transactions,reconciliation,tax,cases,agents,audit,pos,confirm}.py`, `backend/app/schemas/*.py`, `backend/app/core/security.py`, `backend/app/core/queue.py`

---

### P5 — Data Pipeline + Tax

**Tasks:**
- Implement all 19 tool functions with real DB queries (P2 defined signatures, P5 implements):
  - Bank tools: `get_bank_transactions`, `get_sales_orders`, `get_cash_sessions`, `get_invoices`, `find_payment_reference`
  - Matching tools: `score_match_candidates` (calls P1's service), `create_reconciliation_exception`
  - Tax tools: `retrieve_tax_rules`, `validate_rule_version`, `classify_revenue_category`, `check_required_fields`, `generate_tax_readiness_report`, `create_draft_export`
  - Case tools: `create_case`, `assign_task_to_rm`, `draft_merchant_message`, `send_confirmation_request`, `update_case_status`, `export_to_accounting_system`
- `classify_revenue_category`: use LLM to suggest classification (revenue, internal_transfer, loan, purchase_payment, other) based on transaction patterns + note
- `generate_tax_readiness_report`: aggregate reconciliation rate, invoice coverage, cash session status, pending exceptions → checklist with pass/fail
- `create_draft_export`: generate JSON/CSV export with all reconciled data, rule version, timestamp
- `draft_merchant_message`: LLM generates Vietnamese confirmation request message
- `export_to_accounting_system`: generate MISA-compatible export format (mock)
- RAG setup: pgvector embeddings for business guidance documents, `rag.py` tool for retrieval
- Tool call logging: every tool execution creates `tool_calls` + `audit_events` records

**Exit criteria:**
- All 19 tools callable with correct return types matching Pydantic schemas
- `classify_revenue_category("SEPAY-49682", "M001")` returns `{"classification": "internal_transfer", "confidence": 0.82}`
- `generate_tax_readiness_report("M001", "2026-07", "2026.07")` returns checklist with 2 failing items (missing invoices)
- `create_draft_export("M001", "2026-07", "json")` produces valid JSON file
- `draft_merchant_message("CASE-001", exception_id)` returns Vietnamese message
- RAG query returns relevant guidance document
- Every tool call has `tool_calls` + `audit_events` records with input_hash, output_hash

**Files:** `backend/app/tools/{bank,pos,invoice,case,rules,rag}.py` (full implementations), `backend/app/services/tax_rules.py` (updated), `backend/app/services/export.py`, `backend/app/services/rag.py`, `backend/tests/test_tools.py`

---

## Sprint 3 — Integration (Hours 21–32)

**Goal:** Full pipeline works end-to-end, all screens functional, Vietnamese NLP working, performance acceptable.

### P1 — Matching & Financial Logic

**Tasks:**
- Tune scoring weights on seed data to achieve ≥80% auto-reconciliation rate
- Verify no false matches on 2 same-amount ambiguous transactions
- Verify refund correctly matched with allocation_type=REFUND
- Performance: matching runs <5s on 30 transactions
- Help P5 validate truth set (expected match outcomes for all 30+ transactions)

**Exit criteria:**
- Auto-reconciliation rate ≥80% (25/30+ matched without human)
- 0 false matches
- Matching latency <5s
- Truth set documented: each transaction → expected outcome (matched/exception type)

**Files:** `backend/app/services/matching.py` (tuned), `backend/tests/test_truth_set.py`

---

### P2 — AI Agent Layer

**Tasks:**
- Vietnamese note interpretation: normalize diacritics (NFC), expand abbreviations ("ck" → "chuyển khoản", "toc" → "tóc"), suggest transaction type + confidence
- RAG with pgvector: index business guidance docs, query for relevant procedures
- Agent prompt tuning: improve plan quality, match reasoning, message drafting
- Confidence calibration: ensure AI suggestions align with truth set
- Message drafting: Vietnamese, merchant-friendly, clear action request
- Error handling finalization: all edge cases from `05-domain/01-ai-advisor.md` § Error handling

**Exit criteria:**
- Note classification ≥85% correct on test set of 50 Vietnamese notes
- AI suggestions ≥80% agreement with human decisions on seed data
- Drafted messages ≥90% acceptable without major edit
- Hallucination rate <5% (invalid tool calls / total)
- RAG returns relevant guidance for test queries

**Files:** `backend/app/agents/prompts.py` (tuned), `backend/app/services/vietnamese_nlp.py`, `backend/app/services/rag.py` (updated), `backend/tests/test_vietnamese_nlp.py`, `backend/tests/test_agent_evaluation.py`

---

### P3 — Product + Frontend

**Tasks:**
- Agent Trace page: timeline view with plan steps (status icons: completed/running/waiting/failed), tool call details (agent, tool, confidence, timestamp, duration), waiting indicator for human approval, run status badge. Real-time updates via WebSocket.
- Tax-Readiness page: rule version banner ("Rule version: 2026.07 | Effective: 2021-07-01 | Source: Thông tư 40/2021"), checklist items with ✓/✗ + values, ready/not-ready banner, export button (enabled when ready)
- Cases page: case list (merchant, period, status, assigned RM), assign RM action, draft message view + edit, send confirmation
- Audit Export page: filter form (merchant, period), format selector (JSON/CSV), export button, preview table (first 10 events)
- Merchant Confirmation page: transaction details (amount, sender, date), AI suggestion with confidence, option buttons [Chuyển nội bộ] [Doanh thu] [Tiền vay] [Khác], submit. States: default, submitted, expired, already confirmed.
- Animations: exception resolve fade-out + slide-up (300ms), agent step color change + check (200ms), QR modal fade+scale (200ms), page transition fade (150ms), loading skeleton pulse (1.5s loop)

**Exit criteria:**
- Agent Trace: real-time steps update as agent runs via WebSocket, tool calls visible with confidence + duration
- Tax-Readiness: shows 2 failing items (missing invoices), rule version banner, export disabled
- Cases: 5 cases listed, RM assignable, draft message visible in Vietnamese
- Audit Export: JSON + CSV download both work, preview shows first 10 events
- Merchant Confirmation: token-based page loads without auth, submit records decision
- All animations smooth, no jank
- All text in Vietnamese

**Files:** `frontend/src/app/trace/page.tsx` (updated), `frontend/src/app/tax/page.tsx` (updated), `frontend/src/app/cases/page.tsx` (updated), `frontend/src/app/audit/page.tsx` (updated), `frontend/src/app/confirm/[token]/page.tsx` (updated), `frontend/src/components/{Timeline,ChecklistItem,CaseCard,MessageEditor,AuditTable,ConfirmationCard}.tsx`

---

### P4 — Backend Infrastructure

**Tasks:**
- Endpoint integration testing: all 20 endpoints tested with real data flow
- Error handling: all 22 error codes from `03-engineering/07-error-codes.md` return correct HTTP status + error body
- Auth flow: login → JWT → Axios interceptor → route guard → refresh → redirect on expiry
- Redis queue stability: agent runs queued, processed, no race conditions
- WebSocket stability: connection persists during agent run, reconnect on disconnect
- Performance: initial response <5s, full case completion <30s
- Environment variables finalized in `.env.example`

**Exit criteria:**
- All 20 endpoints return correct data on seed data
- All 22 error codes tested and return correct responses
- Auth flow: login → protected route → token expiry → refresh → new token → continue
- WebSocket stays connected through full agent run (~30s)
- Agent run completes <30s on seed data
- Initial API response <5s
- `docker-compose up` clean with no errors

**Files:** `backend/app/routers/*.py` (bug fixes), `backend/app/core/security.py` (updated), `backend/tests/test_integration.py`, `backend/.env.example` (finalized)

---

### P5 — Data Pipeline + Tax

**Tasks:**
- End-to-end data pipeline test: adapters → canonical ledger → agents → exceptions → tax report → export
- Data validation: compare agent output against truth set (expected match outcomes for all 30+ transactions)
- Invoice adapter integration: Tax Agent detects 2 missing invoices correctly
- Draft export validation: JSON + CSV export contains all reconciled data with rule version
- Audit log export: JSON + CSV both downloadable, contain all tool calls + human approvals
- Backup demo data: snapshot DB state for reset between demo runs
- Fallback data: prepare mock responses in case live SePay webhook fails during demo

**Exit criteria:**
- Full pipeline: seed data → agent run → 25 matched, 5 exceptions, tax report (not ready, 2 missing invoices), 5 cases created, draft export generated
- Truth set match: every transaction outcome matches expected
- Audit export: JSON valid, CSV opens in Excel, all events present
- DB snapshot createable + restorable
- Fallback: mock SePay webhook returns valid response

**Files:** `backend/scripts/validate_pipeline.py`, `backend/scripts/backup_demo.py`, `backend/scripts/restore_demo.py`, `backend/tests/test_end_to_end.py`

---

## Sprint 4 — Polish & Demo (Hours 33–48)

**Goal:** Demo runs clean, all KPIs met, pitch ready.

### P1 — Matching & Financial Logic

**Tasks:**
- Final scoring weight adjustments if any false matches found in integration testing
- Verify KPI: auto-reconciliation rate ≥80%, exception reduction ≥80%
- Verify KPI: 100% agent decisions have audit records
- Standby for any matching bugs during demo rehearsal

**Exit criteria:**
- 0 false matches on seed data
- Auto-reconciliation ≥80%
- All matching decisions have audit records

---

### P2 — AI Agent Layer

**Tasks:**
- Final prompt tuning based on integration test results
- Verify message quality: all drafted messages in natural Vietnamese, merchant-friendly
- Verify confidence scores: calibrated, not systematically over/underconfident
- Verify latency: agent run <30s on seed data
- Standby for any agent bugs during demo rehearsal

**Exit criteria:**
- All agent outputs structured JSON conforming to Pydantic schemas
- Messages in Vietnamese, acceptable by RM without major edit
- Agent run completes <30s
- Hallucination rate <5%

---

### P3 — Product + Frontend

**Tasks:**
- Vietnamese text rendering check across all 7 screens
- Animation polish: exception resolve, agent step transitions, QR modal, page transitions
- Empty/loading/error states for all screens
- Demo flow script: 6 scenes from `product.md` §18:
  1. SHB staff enters "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa" → Planner shows plan
  2. Mini POS creates 350,000₫ sale + dynamic QR → SePay webhook → auto-match
  3. 5,000,000₫ ambiguous transaction → AI suggests "chuyển nội bộ" 82% → human confirms in Exception Inbox
  4. Tax Agent finds 2 orders missing invoices → shows in tax-readiness checklist
  5. Merchant Ops Agent creates cases, assigns RM, drafts Vietnamese message, creates draft export
  6. Before/after comparison: 30 records → 25 auto-matched, 5 exceptions, <5 min vs 45 min
- Pitch deck: problem, solution, demo screenshots, KPIs, architecture, team
- Rehearse demo flow 2–3 times

**Exit criteria:**
- All 7 screens render Vietnamese correctly
- All animations smooth
- All empty/loading/error states handled
- Demo script documented with exact steps + expected outcomes
- Pitch deck complete
- Demo rehearsed end-to-end at least once successfully

**Files:** `frontend/src/app/*.tsx` (polish), `frontend/src/components/*.tsx` (polish), `docs/demo-script.md`, `docs/pitch-deck.md` (or slides)

---

### P4 — Backend Infrastructure

**Tasks:**
- Docker compose final config: all services start clean, correct port mappings, volume for DB persistence
- Environment variables documented and tested
- Fix any remaining endpoint bugs from integration testing
- WebSocket stability under demo conditions (connect, run, disconnect gracefully)
- Redis queue: no stuck jobs, clean state between demo runs
- Prepare DB reset script for demo (drop + recreate + seed)

**Exit criteria:**
- `docker-compose up` starts all 4 services with no errors
- All endpoints respond correctly
- WebSocket stable through full demo run
- DB reset script: `python scripts/reset_demo.py` drops + recreates + seeds in <30s
- No outstanding endpoint bugs

**Files:** `docker-compose.yml` (final), `backend/scripts/reset_demo.py`, `backend/.env.example` (final)

---

### P5 — Data Pipeline + Tax

**Tasks:**
- Run all 6 demo scenes end-to-end, verify each passes
- Verify KPIs from `product.md` §19:
  1. Auto-reconciliation rate ≥80%
  2. Exception reduction ≥80%
  3. Traceability: 100% decisions have tool call + confidence + audit record
  4. Action completion: Planner completes workflow with ≥3 agents + ≥2 write actions
  5. Latency: initial response <5s, full case <30s
- Audit log export: JSON + CSV both work, contain complete trace
- Backup demo data snapshot
- Prepare fallback: if live SePay webhook fails, mock webhook returns valid response
- Verify acceptance criteria from `product.md` §20 (all 12 items)

**Exit criteria:**
- All 6 demo scenes pass end-to-end
- All 5 hackathon KPIs met
- All 12 acceptance criteria from §20 met
- Audit export works in both formats
- DB backup + restore verified
- Fallback webhook tested
- Demo can be reset and re-run in <30s

**Files:** `backend/scripts/run_demo.py`, `backend/scripts/verify_kpis.py`, `backend/tests/test_demo_flow.py`

---

## Dependency Map

```
Sprint 1:
  P4 (DB migrations) ──► P5 (seed data needs tables)
  P4 (DB migrations) ──► P1 (matching needs models)
  P5 (seed data) ──────► P1 (matching needs data to test)
  P2 (tool signatures) ─► P5 (tools implement signatures)
  P3 works independently with mock data

Sprint 2:
  P5 (tool implementations) ──► P2 (agents call tools)
  P1 (matching service) ──────► P5 (score_match_candidates calls P1)
  P4 (API endpoints) ────────► P3 (frontend calls API)
  P4 (WebSocket) ────────────► P3 (agent trace real-time)

Sprint 3:
  P1 (tuning) depends on P5 (pipeline test results)
  P2 (NLP) depends on P5 (seed data with Vietnamese notes)
  P3 (remaining screens) depends on P4 (all endpoints ready)
  P5 (pipeline test) depends on P1 + P2 + P4 (all working)

Sprint 4:
  P3 (demo script) depends on everyone
  P5 (demo validation) depends on everyone
  All depend on P4 (stable infra)
```

## Critical Path

```
P4 Sprint 1 (DB) → P5 Sprint 1 (seed) → P1 Sprint 2 (matching) → P5 Sprint 2 (tools) → P2 Sprint 2 (agents) → P4 Sprint 2 (API) → P3 Sprint 2 (screens) → P5 Sprint 3 (pipeline) → P3 Sprint 4 (demo) → P5 Sprint 4 (validation)
```

## Parallel Opportunities

- **Sprint 1:** P3 fully independent (mock data). P1 can start matching logic with in-memory test data before DB is ready.
- **Sprint 2:** P1 (matching) and P5 (tools) work in parallel — P1 owns matching service, P5 owns tool wrappers that call it.
- **Sprint 3:** Everyone works independently on their own integration/polish tasks.
- **Sprint 4:** P1 and P2 on standby/support. P3 leads demo prep. P4 keeps infra stable. P5 validates.

## Communication Checkpoints

| Time | Checkpoint | Who | What |
|------|-----------|-----|------|
| Hour 4 | Sprint 1 mid-point | All | Quick sync: DB ready? Seed data progress? Frontend shell? |
| Hour 8 | Sprint 1 exit | All | Demo: DB up, seed loaded, frontend navigates, adapters work |
| Hour 14 | Sprint 2 mid-point | All | Sync: agents running? APIs responding? Screens consuming real data? |
| Hour 20 | Sprint 2 exit | All | Demo: full agent run on seed data, all screens functional |
| Hour 26 | Sprint 3 mid-point | All | Sync: integration issues, blocking dependencies |
| Hour 32 | Sprint 3 exit | All | Demo: end-to-end pipeline, all KPIs close to target |
| Hour 40 | Sprint 4 mid-point | All | Demo rehearsal #1: run all 6 scenes, identify issues |
| Hour 44 | Pre-final | All | Demo rehearsal #2: final run, pitch practice |
| Hour 48 | Demo | All | Pitch + live demo |

---

*Last updated: 2026-07-17*
