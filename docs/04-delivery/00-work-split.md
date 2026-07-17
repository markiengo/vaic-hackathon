from pathlib import Path

translated = r'''# Phân chia công việc nhóm — TaxLens Hackathon MVP

> **Status:** Draft | **Authority:** Informative | **Owner:** Project Lead  
> **Applies to:** Nhóm 5 người, hackathon 48 giờ

---

## Thành viên nhóm

| Người | Kỹ năng | Vai trò | Phụ trách |
|--------|---------|---------|-----------|
| **P1** | Toán, quantitative analysis, problem solving | Matching & Financial Logic | Match scoring, payment allocation, cash reconciliation, confidence thresholds |
| **P2** | LLM agents + Vietnamese NLP | AI Agent Layer | LangGraph, 4 agents, system prompts, note interpretation, inline context |
| **P3** | Backend + product taste, vibecodes frontend | Product + Frontend | Toàn bộ UI screens, API client, WebSocket, demo script, pitch |
| **P4** | Backend, Redis, APIs | Backend Infra | FastAPI, REST endpoints, WebSocket server, Redis, DB migrations, models |
| **P5** | MCP, AI, data + tax domain | Data Pipeline + Tax | Adapters, tool implementations, seed data, Tax Rules Engine, tax seed |

---

## Sprint 1 — Nền tảng (Giờ 1–8)

**Mục tiêu:** Toàn bộ project compile được, DB chạy, seed data đã load, frontend shell tồn tại, adapters tạo ra canonical records.

### P1 — Matching & Financial Logic

**Công việc:**
- Xây dựng exact matching engine: match `bank_transactions` → `sales` thông qua `payment_reference`
- Xây dựng candidate/fuzzy matching với scoring theo `product.md` §9.4 (amount +50, time +20, ref +20, sender +10, multi-order -30)
- Threshold logic: ≥95% auto, 75–94% hỏi human, <75% unmatched
- Payment allocation: many-to-many thông qua `payment_allocations`, kiểm tra tổng tiền
- Xử lý edge cases: split payment, two-payer, multi-order, over/underpayment, deposit+remainder, refund

**Exit criteria:**
- `exact_match()` trả về True khi ref+amount+UNPAID+unused
- `candidate_match()` trả về danh sách `MatchCandidate` đã được xếp hạng kèm scores
- `allocate_payment()` tạo records và xác nhận tổng phân bổ ≤ transaction amount
- Có ít nhất 10 unit tests pass, bao phủ exact, fuzzy, no-match, split, refund

**Files:** `backend/app/services/matching.py`, `backend/app/services/allocation.py`, `backend/tests/test_matching.py`, `backend/tests/test_allocation.py`

---

### P2 — AI Agent Layer

**Công việc:**
- Tạo LangGraph project structure trong `backend/app/agents/`
- Cấu hình DeepSeek API client (`deepseek-chat`, OpenAI-compatible endpoint)
- Viết system prompts cho cả 4 agents dựa trên `05-domain/01-ai-advisor.md`
- Định nghĩa tool function signatures dưới dạng stubs — P5 implement, P2 định nghĩa interface
- Tạo Pydantic schemas cho agent I/O và Shared Case State
- Xây dựng agent state machine: `PENDING → PLANNING → EXECUTING → WAITING_FOR_HUMAN → COMPLETED / FAILED`
- Temperature: 0.1 cho deterministic behavior, 0.3 cho message drafting. Bật Thinking mode cho Planner.

**Exit criteria:**
- Tất cả agent modules import được: `from app.agents.planner import planner_agent`
- DeepSeek phản hồi được test prompt
- Toàn bộ 19 tool signatures được định nghĩa đầy đủ với type hints
- Shared Case State model validate được JSON từ architecture doc
- State machine enum có đầy đủ 6 states

**Files:** `backend/app/agents/{__init__,planner,reconciliation,tax_compliance,merchant_ops,state,prompts}.py`, `backend/app/schemas/agent.py`, `backend/app/tools/__init__.py`

---

### P3 — Product + Frontend

**Công việc:**
- Setup Next.js 14 + TypeScript + TailwindCSS
- Áp dụng design tokens từ `04-delivery/03-design.md` (SHB green #006837, Inter font, spacing 4–48px)
- Xây dựng app shell: header (logo + merchant selector + user) + sidebar (7 items) + content area
- Tạo routing cho đủ 8 routes: `/dashboard`, `/exceptions`, `/tax`, `/cases`, `/trace`, `/audit`, `/pos`, `/confirm/[token]`
- Tạo API client `src/lib/api.ts` với mock responses
- Tạo WebSocket client stub `src/lib/ws.ts`
- Tạo Zustand store cho UI state
- Tạo đủ 7 page shells dùng mock data theo screen specs
- Cài đặt TanStack Query, Zustand, Axios, Lucide React

**Exit criteria:**
- `npm run build` và `npm run lint` đều pass
- Sidebar điều hướng được tới đủ 7 pages, không có blank screen
- SHB green hiển thị đúng, Inter font được load
- Tiếng Việt render chính xác: “Đối soát”, “Ngoại lệ”, “Hóa đơn”
- Responsive tốt ở 1280px

**Files:** `frontend/{package.json,next.config.js,tailwind.config.ts}`, `frontend/src/app/{layout,page}.tsx`, 8 page files, `frontend/src/components/{AppShell,Sidebar,Header}.tsx`, `frontend/src/lib/{api,ws,store}.ts`, `frontend/src/types/index.ts`

---

### P4 — Backend Infrastructure

**Công việc:**
- Tạo FastAPI project structure theo architecture doc
- Tạo đủ 16 SQLAlchemy models từ `03-engineering/02-data-models.md`
- Viết Alembic migration cho toàn bộ tables, FKs, cascade rules, indexes
- Chạy PostgreSQL trong Docker, thêm Redis container
- Tạo `docker-compose.yml` gồm postgres, redis, backend, frontend
- Thiết lập DB session management và dependency injection
- Cấu hình core config: env vars, DB URL, Redis URL, JWT secret, DeepSeek key
- Tạo base Pydantic schema patterns

**Exit criteria:**
- `alembic upgrade head` tạo đủ 16 tables
- `alembic downgrade base` rollback sạch
- `docker-compose up` khởi động toàn bộ services
- `from app.main import app` import được
- Toàn bộ indexes được tạo, cascade rules được verify
- `.env.example` được document đầy đủ

**Files:** `backend/app/main.py`, `backend/app/core/{config,database,redis}.py`, `backend/app/models/*.py`, `backend/alembic/versions/001_initial_schema.py`, `backend/alembic.ini`, `backend/requirements.txt`, `docker-compose.yml`, `backend/.env.example`

---

### P5 — Data Pipeline + Tax

**Công việc:**
- Tạo SHB mock adapter với realistic Vietnamese bank transactions gồm sender_name, raw_note có/không dấu, reference_number, amount, date
- Tạo SePay webhook handler: parse payload (`transaction_date`, `transaction_content`, `amount_in`, `transferType`, `reference_number`, `code`, `sub_account`, `accumulated`), tạo `bank_transactions` với `source='sepay'`
- Tạo CSV import adapter: parse CSV → canonical records, `source='csv'`
- Tạo invoice mock adapter: create + retrieve invoices
- Tạo seed data theo `product.md` §17: 1 salon, 1 store, 1 device, 5 users, 10 products, 30 sales, 20 transfers, 8 cash, 2 non-revenue, 2 same-amount, 1 refund, 2 missing invoices, 1 cash discrepancy, 28 invoices
- Xây dựng Tax Rules Engine gồm `retrieve_tax_rules()`, `validate_rule_version()`, `check_required_fields()`
- Tạo tax rule seed: version 2026.07, salon, effective 2021-07-01, source “Thông tư 40/2021/TT-BTC”, APPROVED
- Tạo required fields JSON và validation formula JSON

**Exit criteria:**
- `python scripts/seed_data.py` populate đủ dữ liệu vào tables
- Verify counts: 30 sales, 23 bank_transactions, 1 cash_session, 28 invoices
- `get_bank_transactions("M001", "2026-07")` trả về 23 records
- POST tới `/webhooks/sepay` tạo được bank_transaction
- CSV import tạo ra canonical records
- `retrieve_tax_rules("salon", "beauty")` trả về 2026.07
- `validate_rule_version("2026.07")` trả về valid+APPROVED+effective
- `check_required_fields("M001", "2026-07")` phát hiện 2 missing invoices

**Files:** `backend/app/adapters/{shb,sepay,csv,invoice}.py`, `backend/app/tools/{bank,pos,invoice,case,rules}.py`, `backend/app/services/tax_rules.py`, `backend/scripts/seed_data.py`

---

## Sprint 2 — Core Logic (Giờ 9–20)

**Mục tiêu:** Agents chạy end-to-end, matching hoạt động trên seed data, toàn bộ APIs phản hồi, frontend dùng real data.

### P1 — Matching & Financial Logic

**Công việc:**
- Kết nối matching logic với DB models và seed data
- Verify trên seed data: 25 exact, 5 exceptions (2 ambiguous, 2 no-match, 1 cash discrepancy)
- Xây dựng cash reconciliation: expected = opening + cash sales - expenses, so sánh với counted, tạo exception nếu có discrepancy
- Implement tool `score_match_candidates`: query candidates theo merchant/amount±5%/time window, áp dụng weights, trả về ranked results
- Implement tool `find_payment_reference`: lookup payment_intents theo code
- Implement tool `create_reconciliation_exception`: tạo exception record với `ai_suggestion` JSONB

**Exit criteria:**
- Matching trên seed data cho kết quả: 25 matched, 5 exceptions, 0 false matches
- `score_match_candidates("M001", 350000, 60, "Nguyen Van A", "cat toc")` trả về ranked candidates
- Cash reconciliation: expected 5,200,000, counted 5,080,000, discrepancy -120,000 → exception
- Toàn bộ integration tests pass

**Files:** `backend/app/services/matching.py` (updated), `backend/app/services/cash_reconciliation.py`, `backend/app/tools/reconciliation.py`, `backend/tests/test_matching_integration.py`, `backend/tests/test_cash_reconciliation.py`

---

### P2 — AI Agent Layer

**Công việc:**
- Planner Agent: nhận NL request → decompose → assign agents. Output plan JSON.
- Reconciliation Agent: gọi bank/sales/cash/invoice tools, `find_payment_reference`, `score_match_candidates`, `create_reconciliation_exception`. Output match summary JSON.
- Tax & Compliance Agent: gọi `retrieve_tax_rules`, `validate_rule_version`, `classify_revenue_category`, `check_required_fields`, `generate_tax_readiness_report`, `create_draft_export`. Output readiness report JSON.
- Merchant Ops Agent: gọi `create_case`, `assign_task_to_rm`, `draft_merchant_message`, `send_confirmation_request`, `update_case_status`, `export_to_accounting_system`. Output action summary JSON.
- Xây dựng agent run state machine với transitions được log vào `agent_runs`
- Audit logging: mỗi tool call → tạo records trong `tool_calls` + `audit_events`
- Error handling: invalid JSON retry tối đa 2 lần, reject hallucinated tool + log, fallback khi LLM unavailable
- Budget limits: 50 LLM calls/run, 10K input/2K output tokens, 5 concurrent runs qua Redis

**Exit criteria:**
- Full agent run với request: “Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa”
  - Planner tạo plan có ít nhất 3 steps
  - Reconciliation trả về matched=25, unmatched=5
  - Tax trả về readiness report với `rule_version=2026.07`, `ready=false` do thiếu 2 invoices
  - Merchant Ops tạo cases và draft Vietnamese message
- `agent_runs` record có `status=COMPLETED`
- `tool_calls` table có record cho mọi tool được gọi
- `audit_events` có record cho mọi tool call và human approval
- Hallucination test: inject invalid tool name → bị reject + logged, run tiếp tục

**Files:** `backend/app/agents/{planner,reconciliation,tax_compliance,merchant_ops}.py` (full implementations), `backend/app/agents/audit.py`, `backend/tests/test_agents.py`

---

### P3 — Product + Frontend

**Công việc:**
- Dashboard: 4 summary cards gồm total transactions, reconciliation rate, open exceptions, tax readiness; thêm active agents panel và button “Bắt đầu đối soát”. Kết nối với real endpoints `/api/merchants/{id}/dashboard` và `/api/agents`.
- Exception Inbox: filter bar gồm merchant, period, type; exception cards gồm amount, sender, note, AI suggestion badge với confidence, expandable reasoning; action buttons `[Duyệt] [Từ chối] [Phân loại lại]`. Kết nối với `/api/reconciliation/exceptions`.
- Mini POS: product grid bên trái, cart với quantity controls bên phải, buttons `[Tiền mặt] [Tạo QR]`, QR modal có timer, cash session summary bar. Kết nối với `/api/pos/sales`, `/api/pos/payment-intents`, `/api/pos/cash-sessions`.
- Thay toàn bộ mock data bằng TanStack Query hooks gọi real API
- Kết nối WebSocket để nhận real-time agent trace updates → cập nhật Zustand store

**Exit criteria:**
- Dashboard hiển thị đúng seed data: 30 transactions, 83% reconciliation rate, 5 exceptions, not ready
- Exception Inbox hiển thị 5 real exceptions với AI suggestions và confidence scores
- Mini POS: chọn product → thêm vào cart → tạo sale → generate QR với reference → hiển thị QR + timer 15 phút
- Mini POS: nhấn cash button → record cash payment → update sale status
- Toàn bộ data đến từ real backend, không dùng mocks
- WebSocket kết nối và nhận agent trace events

**Files:** `frontend/src/app/dashboard/page.tsx` (updated), `frontend/src/app/exceptions/page.tsx` (updated), `frontend/src/app/pos/page.tsx` (updated), `frontend/src/components/{SummaryCard,ExceptionCard,ProductGrid,Cart,QRModal,CashSessionBar}.tsx`, `frontend/src/hooks/{useDashboard,useExceptions,usePOS,useAgentTrace}.ts`

---

### P4 — Backend Infrastructure

**Công việc:**
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
- WebSocket: `/ws/agent-trace/{run_id}` push tool_call events theo real-time
- Tạo Pydantic request/response schemas cho toàn bộ endpoints
- Thêm JWT auth middleware và role-based access
- Dùng Redis queue cho async agent runs

**Exit criteria:**
- Toàn bộ 20 endpoints phản hồi đúng status codes
- Login trả về JWT, protected routes reject request không có token
- `POST /api/reconciliation/start` trigger agent run và trả về `run_id`
- `GET /api/agents/runs/{id}/trace` trả về tool call history
- WebSocket `/ws/agent-trace/{run_id}` push events khi agent execute
- `GET /api/audit?format=json` trả về audit events array
- `GET /api/audit?format=csv` trả về CSV download
- Toàn bộ 22 error codes trong `03-engineering/07-error-codes.md` trả về response đúng
- Redis queue xử lý agent runs theo async

**Files:** `backend/app/routers/{auth,merchants,transactions,reconciliation,tax,cases,agents,audit,pos,confirm}.py`, `backend/app/schemas/*.py`, `backend/app/core/security.py`, `backend/app/core/queue.py`

---

### P5 — Data Pipeline + Tax

**Công việc:**
- Implement toàn bộ 19 tool functions với real DB queries theo signatures do P2 định nghĩa:
  - Bank tools: `get_bank_transactions`, `get_sales_orders`, `get_cash_sessions`, `get_invoices`, `find_payment_reference`
  - Matching tools: `score_match_candidates` gọi service của P1, `create_reconciliation_exception`
  - Tax tools: `retrieve_tax_rules`, `validate_rule_version`, `classify_revenue_category`, `check_required_fields`, `generate_tax_readiness_report`, `create_draft_export`
  - Case tools: `create_case`, `assign_task_to_rm`, `draft_merchant_message`, `send_confirmation_request`, `update_case_status`, `export_to_accounting_system`
- `classify_revenue_category`: dùng LLM để suggest classification gồm revenue, internal_transfer, loan, purchase_payment, other dựa trên transaction patterns + note
- `generate_tax_readiness_report`: tổng hợp reconciliation rate, invoice coverage, cash session status, pending exceptions → checklist pass/fail
- `create_draft_export`: generate JSON/CSV export chứa toàn bộ reconciled data, rule version, timestamp
- `draft_merchant_message`: LLM tạo Vietnamese confirmation request message
- `export_to_accounting_system`: tạo MISA-compatible export format dạng mock
- Tool call logging: mỗi tool execution tạo records trong `tool_calls` + `audit_events`

**Exit criteria:**
- Toàn bộ 19 tools callable với return types đúng theo Pydantic schemas
- `classify_revenue_category("SEPAY-49682", "M001")` trả về `{"classification": "internal_transfer", "confidence": 0.82}`
- `generate_tax_readiness_report("M001", "2026-07", "2026.07")` trả về checklist có 2 failing items do missing invoices
- `create_draft_export("M001", "2026-07", "json")` tạo valid JSON file
- `draft_merchant_message("CASE-001", exception_id)` trả về Vietnamese message
- Mọi tool call có records trong `tool_calls` + `audit_events` với `input_hash`, `output_hash`

**Files:** `backend/app/tools/{bank,pos,invoice,case,rules}.py` (full implementations), `backend/app/services/tax_rules.py` (updated), `backend/app/services/export.py`, `backend/tests/test_tools.py`

---

## Sprint 3 — Tích hợp (Giờ 21–32)

**Mục tiêu:** Full pipeline chạy end-to-end, toàn bộ screens hoạt động, Vietnamese NLP hoạt động, performance đạt yêu cầu.

### P1 — Matching & Financial Logic

**Công việc:**
- Tune scoring weights trên seed data để đạt auto-reconciliation rate ≥80%
- Verify không có false matches với 2 same-amount ambiguous transactions
- Verify refund được match đúng với `allocation_type=REFUND`
- Performance: matching hoàn thành dưới 5 giây trên 30 transactions
- Hỗ trợ P5 validate truth set gồm expected match outcomes cho toàn bộ hơn 30 transactions

**Exit criteria:**
- Auto-reconciliation rate ≥80% (ít nhất 25/30 được match không cần human)
- 0 false matches
- Matching latency <5 giây
- Truth set được document: từng transaction → expected outcome gồm matched hoặc exception type

**Files:** `backend/app/services/matching.py` (tuned), `backend/tests/test_truth_set.py`

---

### P2 — AI Agent Layer

**Công việc:**
- Vietnamese note interpretation: normalize diacritics bằng NFC, expand abbreviations như “ck” → “chuyển khoản”, “toc” → “tóc”, suggest transaction type + confidence
- Inline context injection: nhúng business guidance documents (~200 lines) trực tiếp vào agent prompts phù hợp
- Tune agent prompts để cải thiện plan quality, match reasoning, message drafting
- Confidence calibration: bảo đảm AI suggestions khớp truth set
- Message drafting: tiếng Việt tự nhiên, merchant-friendly, yêu cầu hành động rõ ràng
- Hoàn thiện error handling cho toàn bộ edge cases trong `05-domain/01-ai-advisor.md` phần Error handling

**Exit criteria:**
- Note classification đạt ≥85% trên test set 50 Vietnamese notes
- AI suggestions đạt ≥80% agreement với human decisions trên seed data
- Drafted messages có ≥90% đạt mức chấp nhận được mà không cần major edit
- Hallucination rate <5% tính theo invalid tool calls / total
- Inline context injection cung cấp guidance phù hợp cho agent prompts

**Files:** `backend/app/agents/prompts.py` (tuned), `backend/app/services/vietnamese_nlp.py`, `backend/tests/test_vietnamese_nlp.py`, `backend/tests/test_agent_evaluation.py`

---

### P3 — Product + Frontend

**Công việc:**
- Agent Trace page: timeline view với plan steps, status icons gồm completed/running/waiting/failed, tool call details gồm agent, tool, confidence, timestamp, duration, waiting indicator cho human approval, run status badge. Nhận real-time updates qua WebSocket.
- Tax-Readiness page: rule version banner “Rule version: 2026.07 | Effective: 2021-07-01 | Source: Thông tư 40/2021”, checklist items có ✓/✗ + values, ready/not-ready banner, export button chỉ enabled khi ready
- Cases page: case list gồm merchant, period, status, assigned RM; có action assign RM, draft message view + edit, send confirmation
- Audit Export page: filter form gồm merchant, period; format selector JSON/CSV; export button; preview table hiển thị 10 events đầu tiên
- Merchant Confirmation page: transaction details gồm amount, sender, date; AI suggestion với confidence; option buttons `[Chuyển nội bộ] [Doanh thu] [Tiền vay] [Khác]`; submit. Các states gồm default, submitted, expired, already confirmed.
- Animations: exception resolve fade-out + slide-up 300ms, agent step color change + check 200ms, QR modal fade+scale 200ms, page transition fade 150ms, loading skeleton pulse loop 1.5s

**Exit criteria:**
- Agent Trace: steps update real-time khi agent chạy qua WebSocket, tool calls hiển thị confidence + duration
- Tax-Readiness: hiển thị 2 failing items do missing invoices, có rule version banner, export disabled
- Cases: hiển thị 5 cases, assign được RM, draft message hiển thị bằng tiếng Việt
- Audit Export: JSON + CSV download đều hoạt động, preview hiển thị 10 events đầu
- Merchant Confirmation: page dựa trên token load không cần auth, submit ghi nhận decision
- Toàn bộ animations mượt, không jank
- Toàn bộ text bằng tiếng Việt

**Files:** `frontend/src/app/trace/page.tsx` (updated), `frontend/src/app/tax/page.tsx` (updated), `frontend/src/app/cases/page.tsx` (updated), `frontend/src/app/audit/page.tsx` (updated), `frontend/src/app/confirm/[token]/page.tsx` (updated), `frontend/src/components/{Timeline,ChecklistItem,CaseCard,MessageEditor,AuditTable,ConfirmationCard}.tsx`

---

### P4 — Backend Infrastructure

**Công việc:**
- Endpoint integration testing cho toàn bộ 20 endpoints với real data flow
- Error handling: toàn bộ 22 error codes từ `03-engineering/07-error-codes.md` trả về đúng HTTP status + error body
- Auth flow: login → JWT → Axios interceptor → route guard → refresh → redirect khi expiry
- Redis queue stability: agent runs được queue và xử lý không có race conditions
- WebSocket stability: connection duy trì xuyên suốt agent run, reconnect khi disconnect
- Performance: initial response <5 giây, full case completion <30 giây
- Hoàn thiện environment variables trong `.env.example`

**Exit criteria:**
- Toàn bộ 20 endpoints trả về đúng data trên seed data
- Toàn bộ 22 error codes được test và trả về đúng responses
- Auth flow hoạt động: login → protected route → token expiry → refresh → new token → tiếp tục
- WebSocket giữ kết nối xuyên suốt full agent run khoảng 30 giây
- Agent run hoàn thành <30 giây trên seed data
- Initial API response <5 giây
- `docker-compose up` chạy sạch không lỗi

**Files:** `backend/app/routers/*.py` (bug fixes), `backend/app/core/security.py` (updated), `backend/tests/test_integration.py`, `backend/.env.example` (finalized)

---

### P5 — Data Pipeline + Tax

**Công việc:**
- Chạy end-to-end data pipeline test: adapters → canonical ledger → agents → exceptions → tax report → export
- Data validation: so sánh agent output với truth set cho toàn bộ hơn 30 transactions
- Invoice adapter integration: Tax Agent phát hiện đúng 2 missing invoices
- Draft export validation: JSON + CSV export chứa đầy đủ reconciled data cùng rule version
- Audit log export: JSON + CSV đều download được, chứa toàn bộ tool calls + human approvals
- Tạo backup demo data dưới dạng DB snapshot để reset giữa các demo runs
- Chuẩn bị fallback data nếu live SePay webhook fail trong demo

**Exit criteria:**
- Full pipeline: seed data → agent run → 25 matched, 5 exceptions, tax report not ready do 2 missing invoices, 5 cases được tạo, draft export được generate
- Truth set match: outcome của mọi transaction khớp expected
- Audit export: JSON valid, CSV mở được trong Excel, đủ events
- Có thể tạo và restore DB snapshot
- Fallback mock SePay webhook trả về valid response

**Files:** `backend/scripts/validate_pipeline.py`, `backend/scripts/backup_demo.py`, `backend/scripts/restore_demo.py`, `backend/tests/test_end_to_end.py`

---

## Sprint 4 — Hoàn thiện & Demo (Giờ 33–48)

**Mục tiêu:** Demo chạy ổn định, toàn bộ KPIs đạt, pitch sẵn sàng.

### P1 — Matching & Financial Logic

**Công việc:**
- Điều chỉnh scoring weights lần cuối nếu integration testing phát hiện false matches
- Verify KPI: auto-reconciliation rate ≥80%, exception reduction ≥80%
- Verify KPI: 100% agent decisions có audit records
- Standby xử lý matching bugs trong demo rehearsal

**Exit criteria:**
- 0 false matches trên seed data
- Auto-reconciliation ≥80%
- Toàn bộ matching decisions có audit records

---

### P2 — AI Agent Layer

**Công việc:**
- Tune prompts lần cuối dựa trên integration test results
- Verify message quality: toàn bộ drafted messages bằng tiếng Việt tự nhiên, merchant-friendly
- Verify confidence scores được calibrated, không overconfident hoặc underconfident một cách hệ thống
- Verify latency: agent run <30 giây trên seed data
- Standby xử lý agent bugs trong demo rehearsal

**Exit criteria:**
- Toàn bộ agent outputs là structured JSON đúng Pydantic schemas
- Messages bằng tiếng Việt, RM có thể dùng mà không cần major edit
- Agent run hoàn thành <30 giây
- Hallucination rate <5%

---

### P3 — Product + Frontend

**Công việc:**
- Kiểm tra Vietnamese text rendering trên toàn bộ 7 screens
- Polish animations: exception resolve, agent step transitions, QR modal, page transitions
- Hoàn thiện empty/loading/error states cho toàn bộ screens
- Viết demo flow script gồm 6 scenes từ `product.md` §18:
  1. Nhân viên SHB nhập “Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa” → Planner hiển thị plan
  2. Mini POS tạo sale 350,000₫ + dynamic QR → SePay webhook → auto-match
  3. Giao dịch ambiguous 5,000,000₫ → AI suggest “chuyển nội bộ” với confidence 82% → human confirm trong Exception Inbox
  4. Tax Agent phát hiện 2 orders thiếu invoices → hiển thị trong tax-readiness checklist
  5. Merchant Ops Agent tạo cases, assign RM, draft Vietnamese message, tạo draft export
  6. So sánh before/after: 30 records → 25 auto-matched, 5 exceptions, dưới 5 phút so với 45 phút
- Chuẩn bị pitch deck gồm problem, solution, demo screenshots, KPIs, architecture, team
- Rehearse demo flow 2–3 lần

**Exit criteria:**
- Toàn bộ 7 screens render tiếng Việt chính xác
- Toàn bộ animations mượt
- Toàn bộ empty/loading/error states được xử lý
- Demo script được document với exact steps + expected outcomes
- Pitch deck hoàn thành
- Demo được rehearse end-to-end thành công ít nhất một lần

**Files:** `frontend/src/app/*.tsx` (polish), `frontend/src/components/*.tsx` (polish), `docs/demo-script.md`, `docs/pitch-deck.md` hoặc slides

---

### P4 — Backend Infrastructure

**Công việc:**
- Hoàn thiện Docker Compose config để toàn bộ services khởi động sạch, port mappings đúng, có volume cho DB persistence
- Document và test toàn bộ environment variables
- Fix các endpoint bugs còn lại từ integration testing
- Bảo đảm WebSocket stability trong demo: connect, run, disconnect gracefully
- Bảo đảm Redis queue không có stuck jobs, clean state giữa các demo runs
- Chuẩn bị DB reset script cho demo gồm drop + recreate + seed

**Exit criteria:**
- `docker-compose up` khởi động đủ 4 services không lỗi
- Toàn bộ endpoints phản hồi đúng
- WebSocket ổn định xuyên suốt full demo run
- DB reset script `python scripts/reset_demo.py` drop + recreate + seed trong <30 giây
- Không còn endpoint bugs

**Files:** `docker-compose.yml` (final), `backend/scripts/reset_demo.py`, `backend/.env.example` (final)

---

### P5 — Data Pipeline + Tax

**Công việc:**
- Chạy toàn bộ 6 demo scenes end-to-end và verify từng scene pass
- Verify KPIs từ `product.md` §19:
  1. Auto-reconciliation rate ≥80%
  2. Exception reduction ≥80%
  3. Traceability: 100% decisions có tool call + confidence + audit record
  4. Action completion: Planner hoàn tất workflow với ít nhất 3 agents + ít nhất 2 write actions
  5. Latency: initial response <5 giây, full case <30 giây
- Audit log export: JSON + CSV đều hoạt động và chứa complete trace
- Backup demo data snapshot
- Chuẩn bị fallback nếu live SePay webhook fail
- Verify toàn bộ 12 acceptance criteria từ `product.md` §20

**Exit criteria:**
- Cả 6 demo scenes pass end-to-end
- Đạt toàn bộ 5 hackathon KPIs
- Đạt toàn bộ 12 acceptance criteria từ §20
- Audit export hoạt động ở cả JSON và CSV
- DB backup + restore được verify
- Fallback webhook được test
- Demo có thể reset và chạy lại trong <30 giây

**Files:** `backend/scripts/run_demo.py`, `backend/scripts/verify_kpis.py`, `backend/tests/test_demo_flow.py`

---

## Dependency Map

```text
Sprint 1:
  P4 (DB migrations) ──► P5 (seed data cần tables)
  P4 (DB migrations) ──► P1 (matching cần models)
  P5 (seed data) ──────► P1 (matching cần data để test)
  P2 (tool signatures) ─► P5 (tools implement signatures)
  P3 làm việc độc lập với mock data

Sprint 2:
  P5 (tool implementations) ──► P2 (agents gọi tools)
  P1 (matching service) ──────► P5 (score_match_candidates gọi P1)
  P4 (API endpoints) ────────► P3 (frontend gọi API)
  P4 (WebSocket) ────────────► P3 (agent trace real-time)

Sprint 3:
  P1 (tuning) phụ thuộc P5 (pipeline test results)
  P2 (NLP) phụ thuộc P5 (seed data có Vietnamese notes)
  P3 (remaining screens) phụ thuộc P4 (toàn bộ endpoints sẵn sàng)
  P5 (pipeline test) phụ thuộc P1 + P2 + P4

Sprint 4:
  P3 (demo script) phụ thuộc tất cả mọi người
  P5 (demo validation) phụ thuộc tất cả mọi người
  Tất cả phụ thuộc P4 (stable infra)