from pathlib import Path

translated = r'''# Phân chia công việc nhóm — TaxLens Hackathon MVP

> **Status:** Draft | **Authority:** Informative | **Owner:** Project Lead  
> **Applies to:** Nhóm 5 người, hackathon 48 giờ

---

## Thành viên nhóm

| Người  | Kỹ năng                                      | Vai trò                    | Phụ trách                                                                     |
| --------| ----------------------------------------------| ----------------------------| -------------------------------------------------------------------------------|
| **P1** | Toán, quantitative analysis, problem solving | Matching & Financial Logic | Match scoring, payment allocation, cash reconciliation, confidence thresholds |
| **P2** | LLM agents + Vietnamese NLP                  | AI Agent Layer             | LangGraph, 4 agents, system prompts, note interpretation, inline context      |
| **P3** | Backend + product taste, vibecodes frontend  | Product + Frontend         | Toàn bộ UI screens, API client, WebSocket, demo script, pitch                 |
| **P4** | Backend, Redis, APIs                         | Backend Infra              | FastAPI, REST endpoints, WebSocket server, Redis, DB migrations, models       |
| **P5** | MCP, AI, data + tax domain                   | Data Pipeline + Tax        | Adapters, tool implementations, seed data, Tax Rules Engine, tax seed         |

---

## Sprint 1 — Nền tảng (Giờ 1–8)

**Mục tiêu:** Toàn bộ project compile được, DB chạy, seed data đã load, frontend shell tồn tại, adapters tạo ra canonical records.

### P1 — Matching & Financial Logic

**Công việc:**
- Xây dựng exact matching engine: match `bank_transactions` → `sales` thông qua `payment_reference`
- Xây dựng candidate/fuzzy matching với scoring theo `01-foundation/03-product-spec.md` §9.4 (amount +50, time +20, ref +20, sender +10, multi-order -30)
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
- Cấu hình DeepSeek API client (`deepseek-v4-flash`, OpenAI-compatible endpoint; OpenRouter fallback)
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
- Tạo seed data theo `01-foundation/03-product-spec.md` §17: 1 salon, 1 store, 1 device, 5 users, 10 products, 30 sales, 20 transfers, 8 cash, 2 non-revenue, 2 same-amount, 1 refund, 2 missing invoices, 1 cash discrepancy, 28 invoices
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

### Sprint 1 — Comprehensive Testing Checklist

> Mục tiêu: Verify toàn bộ nền tảng hoạt động đúng trước khi vào Sprint 2. Chạy qua từng item và đánh dấu ✓/✗.

**A. Database & Infrastructure**

- [ ] `docker-compose up` khởi động PostgreSQL + Redis không lỗi
- [ ] `alembic upgrade head` tạo đủ 16 tables: merchants, stores, devices, users, products, sales, sale_lines, payment_intents, bank_transactions, payment_allocations, cash_sessions, invoices, reconciliation_cases, exceptions, tax_classifications, tax_rule_versions, agent_runs, tool_calls, audit_events
- [ ] `alembic downgrade base` rollback sạch — không còn table nào
- [ ] Kiểm tra FK constraints: sale → merchant, bank_transaction → merchant, payment_allocation → sale + bank_transaction
- [ ] Kiểm tra cascade rules: xóa merchant → xóa stores → xóa sales → xóa sale_lines
- [ ] Kiểm tra indexes: `idx_bank_transactions_merchant_period`, `idx_sales_merchant_period`, `idx_exceptions_status` tồn tại
- [ ] Redis ping thành công: `redis-cli ping` → `PONG`
- [ ] `.env.example` có đủ env vars: DATABASE_URL, REDIS_URL, JWT_SECRET, DEEPSEEK_API_KEY, SEPAY_WEBHOOK_API_KEY, LLM_MODEL_PLANNER, LLM_MODEL_SPECIALIST

**B. Seed Data Integrity**

- [ ] `python scripts/seed_data.py` chạy không lỗi
- [ ] Verify counts trong DB:
  - [ ] 1 merchant (M001, Salon Hoa, salon/beauty_services)
  - [ ] 1 store (S001)
  - [ ] 1 device
  - [ ] 5 users (admin, ops_staff, rm, compliance, merchant_staff)
  - [ ] 10 products (dịch vụ salon: cắt tóc, gội đầu, uốn, nhuộm, ...)
  - [ ] 30 sales orders (mix: paid, unpaid, partial, overpaid)
  - [ ] 23 bank_transactions (20 transfers + 2 non-revenue + 1 refund)
  - [ ] 8 cash payments
  - [ ] 1 cash_session (open, có opening_balance)
  - [ ] 28 invoices (2 sales thiếu invoice)
  - [ ] 1 tax_rule_version (2026.07, APPROVED, effective 2021-07-01)
- [ ] Verify 2 same-amount transactions có amount giống nhau nhưng reference khác
- [ ] Verify 1 refund transaction có amount âm hoặc type=REFUND
- [ ] Verify 2 non-revenue transactions: 1 internal transfer, 1 loan
- [ ] Verify 1 cash discrepancy: counted != expected

**C. Matching Engine (P1)**

- [ ] `exact_match(txn, sale)` trả về True khi: payment_reference khớp + amount khớp + sale UNPAID + txn unused
- [ ] `exact_match()` trả về False khi: ref khớp nhưng amount sai → không match
- [ ] `exact_match()` trả về False khi: ref+amount khớp nhưng sale đã PAID → không match
- [ ] `exact_match()` trả về False khi: ref+amount khớp nhưng txn đã được allocate → không match
- [ ] `candidate_match(txn, sales)` trả về danh sách `MatchCandidate` sorted theo score giảm dần
- [ ] Score breakdown đúng weights: amount +50, time +20, ref +20, sender +10, multi-order -30
- [ ] Candidate với score ≥95 → auto-match
- [ ] Candidate với score 75–94 → human confirm
- [ ] Candidate với score <75 → unmatched
- [ ] `allocate_payment(txn_id, allocations)` tạo `payment_allocations` records
- [ ] Tổng allocation ≤ transaction amount (không over-allocate)
- [ ] Edge case: split payment — 1 txn allocate cho 2 sales, tổng đúng
- [ ] Edge case: multi-order — 1 txn cho 3+ sales, penalty -30 áp dụng đúng
- [ ] Edge case: refund — txn type REFUND match với sale có allocation_type=REFUND
- [ ] Edge case: over/underpayment — txn amount > sale total → partial allocation + exception
- [ ] Edge case: deposit + remainder — 2 txns cho 1 sale, tổng = sale total
- [ ] Edge case: two-payer — 2 txns khác sender cho cùng sale
- [ ] Ít nhất 10 unit tests pass: `pytest tests/test_matching.py tests/test_allocation.py -v`

**D. Agent Scaffolding (P2)**

- [ ] `from app.agents.planner import planner_agent` import được
- [ ] `from app.agents.reconciliation import reconciliation_agent` import được
- [ ] `from app.agents.tax_compliance import tax_compliance_agent` import được
- [ ] `from app.agents.merchant_ops import merchant_ops_agent` import được
- [ ] DeepSeek API client phản hồi test prompt: "Hello" → non-empty response
- [ ] OpenRouter fallback hoạt động khi DeepSeek API key invalid (nếu test được)
- [ ] Toàn bộ 19 tool signatures định nghĩa trong `tools/__init__.py` với type hints
- [ ] Shared Case State Pydantic model validate JSON sample từ architecture doc
- [ ] State machine enum có 6 states: PENDING, PLANNING, EXECUTING, WAITING_FOR_HUMAN, COMPLETED, FAILED
- [ ] System prompts cho 4 agents tồn tại trong `prompts.py` và không rỗng
- [ ] Temperature config: 0.1 cho deterministic, 0.3 cho message drafting

**E. Frontend Shell (P3)**

- [ ] `npm run build` pass không lỗi
- [ ] `npm run lint` pass không warnings nghiêm trọng
- [ ] App shell render: header (logo + merchant selector + user avatar) + sidebar + content area
- [ ] Sidebar có 7 items: Dashboard, Ngoại lệ, Thuế, Cases, Agent Trace, Audit, Mini POS
- [ ] Click từng sidebar item → navigate đúng route, không blank screen
- [ ] Route `/confirm/[token]` tồn tại (merchant confirmation page)
- [ ] SHB green #006837 hiển thị đúng (inspect element verify)
- [ ] Inter font load thành công (network tab không có font 404)
- [ ] Vietnamese text render chính xác: "Đối soát", "Ngoại lệ", "Hóa đơn", "Sẵn sàng thuế"
- [ ] Responsive ở 1280px: sidebar không overlap content, không horizontal scroll
- [ ] Mock data hiển thị trên đủ 7 pages (dashboard cards, exception list, etc.)
- [ ] Zustand store init được, UI state persist qua page navigation
- [ ] API client `src/lib/api.ts` có methods cho đủ endpoint groups
- [ ] WebSocket client stub `src/lib/ws.ts` có connect/disconnect methods

**F. Adapters & Tax Rules (P5)**

- [ ] SHB mock adapter tạo bank_transactions với realistic Vietnamese data:
  - [ ] sender_name có dấu: "Nguyễn Văn A", không dấu: "Nguyen Van A"
  - [ ] raw_note có dấu: "chuyen khoan cat toc", không dấu: "ck cat toc"
  - [ ] reference_number có/không
  - [ ] amount đúng range (50,000–5,000,000)
  - [ ] transaction_date trong period 2026-07
- [ ] SePay webhook handler:
  - [ ] POST `/api/v1/webhooks/sepay` với valid payload + API key → 200 + bank_transaction created
  - [ ] POST với wrong API key → 401
  - [ ] POST với missing API key → 422
  - [ ] POST với duplicate transaction ID → không tạo duplicate (dedup by `SEPAY-{id}`)
  - [ ] Payload parse đúng: transactionDate, content, transferAmount, transferType, referenceCode, code, accountNumber
- [ ] CSV import adapter: parse CSV → canonical records với `source='csv'`
- [ ] Invoice mock adapter: create invoice → retrieve invoice → data khớp
- [ ] Tax Rules Engine:
  - [ ] `retrieve_tax_rules("salon", "beauty_services")` trả về version 2026.07
  - [ ] `validate_rule_version("2026.07")` trả về valid=True, status=APPROVED, effective_date=2021-07-01
  - [ ] `validate_rule_version("999.99")` trả về valid=False
  - [ ] `check_required_fields("M001", "2026-07")` phát hiện 2 missing invoices
  - [ ] Required fields JSON parse được
  - [ ] Validation formula JSON parse được

**G. Cross-cutting**

- [ ] `from app.main import app` import được
- [ ] FastAPI app start: `uvicorn app.main:app` → server chạy trên port 8000
- [ ] CORS configured: frontend localhost:3000 có thể gọi API
- [ ] Global exception handler catch unhandled errors → 500 JSON response
- [ ] Không có hardcoded secrets trong code (chỉ trong .env, không commit)
- [ ] .env trong .gitignore
- [ ] Git: toàn bộ code committed và pushed

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
- Toàn bộ 22 error codes trong `03-engineering/05-api-reference.md` trả về response đúng
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

### Sprint 2 — Comprehensive Testing Checklist

> Mục tiêu: Verify agents chạy end-to-end, matching trên seed data đúng, APIs phản hồi đúng, frontend dùng real data. Chạy qua từng item và đánh dấu ✓/✗.

**A. Matching on Seed Data (P1)**

- [ ] Chạy matching trên toàn bộ seed data: kết quả 25 matched, 5 exceptions, 0 false matches
- [ ] Verify 25 exact matches: mỗi match có payment_reference khớp + amount khớp
- [ ] Verify 2 ambiguous exceptions: 2 transactions có same amount, score 75–94, cần human confirm
- [ ] Verify 2 no-match exceptions: transactions không có reference, score <75
- [ ] Verify 1 cash discrepancy exception: counted != expected, exception tạo tự động
- [ ] `score_match_candidates("M001", 350000, 60, "Nguyen Van A", "cat toc")` trả về ranked candidates với scores
- [ ] Cash reconciliation:
  - [ ] Expected = opening_balance + cash_sales - expenses = 5,200,000
  - [ ] Counted = 5,080,000
  - [ ] Discrepancy = -120,000 → exception tạo với type=CASH_DISCREPANCY
- [ ] Integration tests pass: `pytest tests/test_matching_integration.py tests/test_cash_reconciliation.py -v`
- [ ] Không có transaction nào match với sale của merchant khác
- [ ] Transaction đã match không bị match lại (idempotent)

**B. Agent End-to-End Run (P2)**

- [ ] Full agent run với request: "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa"
  - [ ] Planner tạo plan có ít nhất 3 steps (reconciliation, tax, merchant ops)
  - [ ] Reconciliation Agent trả về matched=25, unmatched=5
  - [ ] Tax Agent trả về readiness report với `rule_version=2026.07`, `ready=false` do thiếu 2 invoices
  - [ ] Merchant Ops Agent tạo cases và draft Vietnamese message
- [ ] `agent_runs` record có `status=COMPLETED`, `started_at` và `completed_at` không null
- [ ] `tool_calls` table có record cho mọi tool được gọi:
  - [ ] Mỗi record có `agent_name`, `tool_name`, `input_hash`, `output_hash`, `confidence`, `timestamp`
  - [ ] Số tool_calls ≥ số tools thực tế gọi (không missing)
- [ ] `audit_events` có record cho:
  - [ ] Mọi tool call
  - [ ] Mọi human approval (nếu có trong run)
  - [ ] Agent run start + completion
- [ ] Hallucination test: inject invalid tool name vào agent prompt → bị reject + logged, run tiếp tục không crash
- [ ] Error handling: LLM trả về invalid JSON → retry tối đa 2 lần → fallback graceful
- [ ] Budget limits: không vượt 50 LLM calls/run, không vượt 10K input/2K output tokens
- [ ] Concurrent runs: 2 agent runs cùng lúc không race condition (Redis queue)
- [ ] Agent run hoàn thành <60 giây trên seed data (Sprint 2 target, Sprint 3 sẽ tune <30s)

**C. Frontend with Real Data (P3)**

- [ ] Dashboard:
  - [ ] 4 summary cards hiển thị đúng seed data: total transactions=30, reconciliation rate=83%, open exceptions=5, tax readiness=not ready
  - [ ] Active agents panel hiển thị agent runs (nếu có)
  - [ ] Button "Bắt đầu đối soát" click → trigger reconciliation
  - [ ] Data đến từ real API `/api/merchants/{id}/dashboard`, không dùng mock
- [ ] Exception Inbox:
  - [ ] Filter bar: merchant dropdown, period selector, type filter
  - [ ] Hiển thị 5 real exceptions từ API `/api/reconciliation/exceptions`
  - [ ] Mỗi exception card có: amount, sender_name, raw_note, AI suggestion badge, confidence score
  - [ ] Expandable reasoning section: click → hiển thị AI reasoning text
  - [ ] Action buttons: [Duyệt] [Từ chối] [Phân loại lại] — click → API call → update UI
  - [ ] Duyệt exception → exception biến mất khỏi list (hoặc status change)
- [ ] Mini POS:
  - [ ] Product grid hiển thị 10 products từ API
  - [ ] Click product → thêm vào cart
  - [ ] Cart có quantity controls: +/- buttons, total price update
  - [ ] Button [Tạo QR] → tạo sale → generate QR với reference → QR modal hiển thị
  - [ ] QR modal có timer 15 phút countdown
  - [ ] Button [Tiền mặt] → record cash payment → sale status update → cash session update
  - [ ] Cash session summary bar hiển thị: opening balance, cash sales total, expected, counted
- [ ] TanStack Query hooks:
  - [ ] `useDashboard()` fetch real data, loading state, error state
  - [ ] `useExceptions()` fetch + filter + mutate (approve/reject)
  - [ ] `usePOS()` fetch products, create sale, create payment intent, record cash
  - [ ] Cache invalidation đúng sau mutation
- [ ] WebSocket:
  - [ ] Connect to `/ws/transactions` → connection established
  - [ ] Receive transaction event → toast/notification hiển thị
  - [ ] Agent trace events update Zustand store (nếu WS agent-trace implemented)

**D. API Endpoints (P4)**

- [ ] Auth:
  - [ ] POST `/api/v1/auth/login` với valid credentials → 200 + JWT access + refresh
  - [ ] POST `/api/v1/auth/login` với wrong password → 401
  - [ ] POST `/api/v1/auth/login` với non-existent user → 404
  - [ ] GET `/api/v1/auth/me` với valid JWT → 200 + user info
  - [ ] GET `/api/v1/auth/me` không có JWT → 401
  - [ ] GET `/api/v1/auth/me` với expired JWT → 401
  - [ ] POST `/api/v1/auth/refresh` với valid refresh token → 200 + new access token
- [ ] Merchants:
  - [ ] GET `/api/v1/merchants/{id}` → 200 + merchant profile
  - [ ] GET `/api/v1/merchants/{id}` với invalid ID → 404
  - [ ] GET `/api/v1/merchants/{id}/dashboard?period=2026-07` → 200 + summary stats
- [ ] Transactions:
  - [ ] GET `/api/v1/transactions?merchant_id=M001&period=2026-07` → 200 + 23 transactions
  - [ ] GET `/api/v1/transactions` không có merchant_id → 400
- [ ] Reconciliation:
  - [ ] POST `/api/v1/reconciliation/start` → 200 + run_id
  - [ ] GET `/api/v1/reconciliation/{case_id}` → 200 + case details
  - [ ] POST `/api/v1/reconciliation/exceptions/{id}/resolve` với decision=approve → 200
  - [ ] POST `/api/v1/reconciliation/exceptions/{id}/resolve` với decision=reject → 200
- [ ] Tax:
  - [ ] GET `/api/v1/tax/readiness?merchant_id=M001&period=2026-07` → 200 + readiness report
  - [ ] POST `/api/v1/tax/export` → 200 + export file
- [ ] Cases:
  - [ ] GET `/api/v1/cases` → 200 + case list
  - [ ] POST `/api/v1/cases` → 201 + new case
  - [ ] POST `/api/v1/cases/{id}/assign` → 200
  - [ ] POST `/api/v1/cases/{id}/message` → 200 + draft message
- [ ] Agents:
  - [ ] POST `/api/v1/agents/run` → 200 + run_id
  - [ ] GET `/api/v1/agents/runs/{id}` → 200 + run status
  - [ ] GET `/api/v1/agents/runs/{id}/trace` → 200 + tool call history
- [ ] Audit:
  - [ ] GET `/api/v1/audit?merchant_id=M001&period=2026-07` → 200 + audit events
  - [ ] GET `/api/v1/audit?format=json` → JSON response
  - [ ] GET `/api/v1/audit?format=csv` → CSV download
- [ ] POS:
  - [ ] POST `/api/v1/pos/sales` → 201 + sale created
  - [ ] POST `/api/v1/pos/payment-intents` → 201 + QR data
  - [ ] POST `/api/v1/pos/cash-payments` → 201 + cash payment recorded
  - [ ] POST `/api/v1/pos/cash-sessions/close` → 200 + session closed
- [ ] Merchant Confirmation:
  - [ ] GET `/api/v1/confirm/{token}` → 200 + transaction details
  - [ ] POST `/api/v1/confirm/{token}` với decision → 200
  - [ ] GET `/api/v1/confirm/{invalid_token}` → 404
- [ ] WebSocket:
  - [ ] `/ws/transactions` connect → receive real-time transaction notifications
  - [ ] `/ws/agent-trace/{run_id}` connect → receive tool_call events (nếu implemented)
- [ ] Protected routes reject request không có JWT token
- [ ] Role-based access: merchant_staff không truy cập được audit endpoint

**E. Tool Functions (P5)**

- [ ] Bank tools:
  - [ ] `get_bank_transactions("M001", "2026-07")` → 23 records với đầy đủ fields
  - [ ] `get_sales_orders("M001", "2026-07")` → 30 records với payment_status, invoice_status
  - [ ] `get_cash_sessions("M001", "2026-07")` → 1 record với opening/closing balance
  - [ ] `get_invoices("M001", "2026-07")` → 28 records
  - [ ] `find_payment_reference("PAY-001")` → payment_intent record hoặc None
- [ ] Matching tools:
  - [ ] `score_match_candidates("M001", 350000, 60, "Nguyen Van A", "cat toc")` → ranked candidates
  - [ ] `create_reconciliation_exception(...)` → exception record trong DB
- [ ] Tax tools:
  - [ ] `retrieve_tax_rules("salon", "beauty_services")` → rule version 2026.07
  - [ ] `validate_rule_version("2026.07")` → valid + APPROVED + effective
  - [ ] `classify_revenue_category("SEPAY-49682", "M001")` → `{"classification": "internal_transfer", "confidence": 0.82}`
  - [ ] `check_required_fields("M001", "2026-07")` → 2 failing items (missing invoices)
  - [ ] `generate_tax_readiness_report("M001", "2026-07", "2026.07")` → checklist with 2 failing items
  - [ ] `create_draft_export("M001", "2026-07", "json")` → valid JSON file
- [ ] Case tools:
  - [ ] `create_case(...)` → case record trong DB
  - [ ] `assign_task_to_rm(case_id, rm_id)` → case updated
  - [ ] `draft_merchant_message(case_id, exception_id)` → Vietnamese message string
  - [ ] `send_confirmation_request(...)` → confirmation link generated
  - [ ] `update_case_status(case_id, "RESOLVED")` → case status updated
  - [ ] `export_to_accounting_system("M001", "2026-07")` → MISA-compatible format
- [ ] Mọi tool call có records trong `tool_calls` + `audit_events` với `input_hash`, `output_hash`
- [ ] Tool call với invalid input → graceful error, không crash agent

**F. Edge Cases & Error Scenarios**

- [ ] Agent run với request không hợp lệ (empty string) → graceful error, không crash
- [ ] Agent run khi LLM unavailable (API timeout) → fallback, run không hang
- [ ] Matching với transaction không có sender_name → vẫn chạy, score giảm
- [ ] Matching với sale đã fully paid → không match thêm
- [ ] POS tạo sale với empty cart → validation error
- [ ] POS tạo sale với negative quantity → validation error
- [ ] Webhook SePay với malformed JSON → 422 error
- [ ] API endpoint với invalid UUID → 404 hoặc 422
- [ ] Concurrent API calls đến cùng resource → không data corruption
- [ ] Frontend khi API timeout → loading state → error message, không white screen

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
- Error handling: toàn bộ 22 error codes từ `03-engineering/05-api-reference.md` trả về đúng HTTP status + error body
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

### Sprint 3 — Comprehensive Testing Checklist

> Mục tiêu: Verify full pipeline end-to-end, toàn bộ screens hoạt động với real data, Vietnamese NLP hoạt động, performance đạt yêu cầu. Chạy qua từng item và đánh dấu ✓/✗.

**A. Matching Tuning & Truth Set (P1)**

- [ ] Auto-reconciliation rate ≥80% trên seed data (ít nhất 25/30 match không cần human)
- [ ] 0 false matches — kiểm tra thủ công từng match, không có transaction match sai sale
- [ ] 2 same-amount ambiguous transactions không bị auto-match với nhau (score <95 do multi-order penalty hoặc missing ref)
- [ ] Refund transaction match đúng với sale gốc, `allocation_type=REFUND`
- [ ] Matching latency <5 giây trên 30 transactions (đo bằng timer)
- [ ] Truth set document hóa: từng transaction ID → expected outcome (matched sale ID hoặc exception type)
- [ ] Truth set cover toàn bộ 30 transactions + 23 bank_transactions
- [ ] `pytest tests/test_truth_set.py -v` — toàn bộ truth set assertions pass
- [ ] Scoring weights tuned: không còn borderline cases ở 94-96 range (hoặc nếu có, đã được review)
- [ ] Matching chạy idempotent: chạy 2 lần → kết quả giống nhau, không tạo duplicate allocations

**B. Vietnamese NLP & Agent Quality (P2)**

- [ ] Vietnamese note interpretation:
  - [ ] NFC normalization: "chuyên khoản" → "chuyển khoản" (diacritics normalized)
  - [ ] Abbreviation expansion: "ck" → "chuyển khoản", "toc" → "tóc", "dv" → "dịch vụ"
  - [ ] Note không dấu: "chuyen khoan cat toc" → vẫn classify đúng "revenue"
  - [ ] Note có dấu: "chuyển khoản cắt tóc" → classify đúng "revenue"
  - [ ] Note ambiguous: "chuyen khoan" (không context) → confidence thấp, suggest "other"
- [ ] Note classification accuracy ≥85% trên test set 50 Vietnamese notes:
  - [ ] Revenue notes (cat toc, goi dau, uon toc) → classification=revenue, confidence ≥0.8
  - [ ] Internal transfer notes (chuyen noi bo, gui tien) → classification=internal_transfer, confidence ≥0.7
  - [ ] Loan notes (vay, tra no) → classification=loan, confidence ≥0.7
  - [ ] Purchase notes (tra tien hang, mua vat tu) → classification=purchase_payment, confidence ≥0.7
- [ ] AI suggestions đạt ≥80% agreement với human decisions trên seed data:
  - [ ] 2 ambiguous transactions: AI suggest đúng classification (internal_transfer, loan)
  - [ ] Confidence scores khớp truth set ±10%
- [ ] Drafted messages ≥90% chấp nhận được mà không cần major edit:
  - [ ] Tiếng Việt tự nhiên, không dịch máy
  - [ ] Merchant-friendly tone (kính gửi, cảm ơn)
  - [ ] Yêu cầu hành động rõ ràng (vui lòng xác nhận...)
  - [ ] Chứa transaction details đúng (amount, date, sender)
- [ ] Hallucination rate <5%: inject 20 invalid tool names → ≥19 bị reject + logged
- [ ] Inline context injection: agent prompts chứa business guidance phù hợp:
  - [ ] Reconciliation Agent prompt chứa matching rules + threshold logic
  - [ ] Tax Agent prompt chứa tax rule summary + required fields
  - [ ] Merchant Ops Agent prompt chứa case management rules
- [ ] Confidence calibration: không overconfident (>0.95 cho ambiguous cases) hoặc underconfident (<0.5 cho clear cases)
- [ ] `pytest tests/test_vietnamese_nlp.py tests/test_agent_evaluation.py -v` — pass

**C. Remaining Frontend Screens (P3)**

- [ ] Agent Trace page:
  - [ ] Timeline view hiển thị plan steps theo thứ tự
  - [ ] Mỗi step có status icon: ✓ completed, ⟳ running, ⏸ waiting, ✗ failed
  - [ ] Tool call details: agent name, tool name, confidence, timestamp, duration
  - [ ] Waiting indicator khi agent chờ human approval (pulsing animation)
  - [ ] Run status badge: COMPLETED (green), RUNNING (blue), FAILED (red)
  - [ ] Real-time updates qua WebSocket: step status change mà không reload page
  - [ ] Empty state: "Chưa có agent run nào" với CTA button
  - [ ] Loading state: skeleton pulse trong khi fetch
- [ ] Tax-Readiness page:
  - [ ] Rule version banner: "Rule version: 2026.07 | Effective: 2021-07-01 | Source: Thông tư 40/2021/TT-BTC"
  - [ ] Checklist items với ✓ (pass, green) hoặc ✗ (fail, red)
  - [ ] 2 failing items hiển thị: "2 đơn hàng thiếu hóa đơn" với sale IDs
  - [ ] Ready/not-ready banner: "Chưa sẵn sàng" (red) do 2 missing invoices
  - [ ] Export button disabled khi not ready (gray, not clickable)
  - [ ] Export button enabled khi ready (green, clickable) — test bằng cách mark all invoices present
- [ ] Cases page:
  - [ ] Case list hiển thị 5 cases: merchant name, period, status badge, assigned RM
  - [ ] Click case → detail view với exceptions, agent trace link
  - [ ] Assign RM: dropdown select → submit → case updated
  - [ ] Draft message view: hiển thị Vietnamese message, edit textarea, send button
  - [ ] Send confirmation: click → confirmation link generated + displayed
- [ ] Audit Export page:
  - [ ] Filter form: merchant dropdown, period selector
  - [ ] Format selector: JSON / CSV radio buttons
  - [ ] Export button: click → download file
  - [ ] Preview table: 10 events đầu tiên với columns: timestamp, actor, action, tool, confidence
  - [ ] JSON export: valid JSON, mở được trong browser/text editor
  - [ ] CSV export: mở được trong Excel, columns đúng, UTF-8 BOM cho Vietnamese
- [ ] Merchant Confirmation page (`/confirm/[token]`):
  - [ ] Load với valid token (không cần auth) → hiển thị transaction details
  - [ ] Transaction details: amount, sender_name, date, raw_note
  - [ ] AI suggestion với confidence badge
  - [ ] Option buttons: [Chuyển nội bộ] [Doanh thu] [Tiền vay] [Khác]
  - [ ] Select option → submit → success state ("Cảm ơn, đã ghi nhận")
  - [ ] Invalid token → error state ("Link không hợp lệ hoặc đã hết hạn")
  - [ ] Already confirmed token → info state ("Giao dịch đã được xác nhận")
  - [ ] Expired token → error state ("Link đã hết hạn")
- [ ] Animations:
  - [ ] Exception resolve: fade-out + slide-up 300ms, mượt không jank
  - [ ] Agent step color change: completed → green check 200ms
  - [ ] QR modal: fade-in + scale-up 200ms, fade-out + scale-down 200ms
  - [ ] Page transition: fade 150ms giữa routes
  - [ ] Loading skeleton: pulse loop 1.5s, không stutter
- [ ] Toàn bộ text bằng tiếng Việt, không English text lọt qua (trừ technical terms)

**D. API Integration & Performance (P4)**

- [ ] Endpoint integration testing với real data flow:
  - [ ] Login → get JWT → call protected endpoint → get data → logout
  - [ ] Create sale via POS → verify sale in DB → verify in transactions list
  - [ ] Start reconciliation → get run_id → poll status → get trace → verify tool_calls
  - [ ] Resolve exception → verify exception status changed → verify audit event created
  - [ ] Export audit log JSON → verify content matches DB records
  - [ ] Export audit log CSV → verify content matches DB records, Excel-compatible
- [ ] Error handling — toàn bộ 22 error codes test:
  - [ ] ERR-AUTH-001 (400): Invalid credentials → 400 + error body
  - [ ] ERR-AUTH-002 (401): Missing token → 401 + error body
  - [ ] ERR-AUTH-003 (403): Insufficient permissions → 403 + error body
  - [ ] ERR-MERCHANT-001 (404): Merchant not found → 404 + error body
  - [ ] ERR-RECON-001 (409): Reconciliation already running → 409 + error body
  - [ ] ERR-POS-001 (422): Invalid sale data → 422 + error body
  - [ ] ERR-WEBHOOK-001 (401): Invalid API key → 401 + error body
  - [ ] (Kiểm tra toàn bộ 22 codes trong `03-engineering/05-api-reference.md`)
- [ ] Auth flow end-to-end:
  - [ ] Login → JWT stored in Axios interceptor
  - [ ] Protected route call → Authorization header auto-attached
  - [ ] Token expiry → 401 → auto-refresh → retry request → success
  - [ ] Refresh token expiry → redirect to login page
  - [ ] Route guard: unauthenticated user → redirect to login
- [ ] Redis queue stability:
  - [ ] Submit 3 agent runs concurrently → all 3 complete, no stuck jobs
  - [ ] Kill backend mid-run → restart → queue resumes, no corrupt state
  - [ ] Redis queue clear between demo runs: `redis-cli FLUSHDB` → clean state
- [ ] WebSocket stability:
  - [ ] Connect → maintain connection throughout 30s agent run → disconnect gracefully
  - [ ] Disconnect mid-run → reconnect → receive missed events (or at least new ones)
  - [ ] Multiple clients connected simultaneously → all receive events
- [ ] Performance:
  - [ ] Initial API response (dashboard) <5 giây
  - [ ] Full agent run completion <30 giây trên seed data
  - [ ] Matching on 30 transactions <5 giây
  - [ ] Frontend page load <3 giây (LCP)
  - [ ] No API response >10 giây (timeout threshold)
- [ ] `docker-compose up` chạy sạch: 4 services (postgres, redis, backend, frontend) all healthy
- [ ] `.env.example` finalized: tất cả env vars documented với comments

**E. End-to-End Data Pipeline (P5)**

- [ ] Full pipeline test: `python scripts/validate_pipeline.py`
  - [ ] Seed data → adapters → canonical ledger → agents → exceptions → tax report → export
  - [ ] Output: 25 matched, 5 exceptions, tax report not ready (2 missing invoices), 5 cases created, draft export generated
- [ ] Truth set match: outcome của mọi transaction khớp expected:
  - [ ] 25 transactions → matched với correct sale IDs
  - [ ] 2 transactions → exception AMBIGUOUS (same amount)
  - [ ] 2 transactions → exception NO_MATCH (no reference, low score)
  - [ ] 1 transaction → exception CASH_DISCREPANCY
  - [ ] 1 transaction → matched as REFUND
  - [ ] 2 transactions → classified as NON_REVENUE (internal transfer, loan)
- [ ] Invoice adapter integration:
  - [ ] Tax Agent phát hiện đúng 2 missing invoices (sale IDs match)
  - [ ] Invoice count: 28 invoices for 30 sales (2 missing)
- [ ] Draft export validation:
  - [ ] JSON export: valid JSON, chứa đầy đủ reconciled data, rule_version, timestamp
  - [ ] CSV export: mở được trong Excel, UTF-8 BOM, columns đúng
  - [ ] Export contains: merchant info, period, all transactions with match status, all exceptions, tax readiness, rule version
- [ ] Audit log export:
  - [ ] JSON: valid, contains all tool_calls + human approvals
  - [ ] CSV: Excel-compatible, contains timestamp, actor, action, tool, confidence
  - [ ] Audit log covers entire agent run from start to completion
- [ ] DB snapshot backup:
  - [ ] `python scripts/backup_demo.py` → creates snapshot file
  - [ ] `python scripts/restore_demo.py` → restores from snapshot → data matches
  - [ ] Backup/restore cycle: backup → modify data → restore → data back to original
- [ ] Fallback SePay webhook:
  - [ ] Mock webhook endpoint returns valid response
  - [ ] Frontend receives transaction notification from fallback
  - [ ] Fallback can be triggered manually if live webhook fails

**F. Cross-System Integration**

- [ ] Full user journey 1: Login → Dashboard → see 5 exceptions → open Exception Inbox → approve 1, reject 1 → verify audit log
- [ ] Full user journey 2: Login → Mini POS → create sale → generate QR → (simulate payment) → verify auto-match → dashboard updates
- [ ] Full user journey 3: Login → start reconciliation → watch Agent Trace real-time → tax report generated → export
- [ ] Full user journey 4: Open confirmation link → classify transaction → submit → verify in system
- [ ] Full user journey 5: Login → Cases → view case → draft message → assign RM → send confirmation
- [ ] Full user journey 6: Login → Audit Export → filter → export JSON → export CSV → verify both files
- [ ] Vietnamese text consistent across toàn bộ UI: không mix English/Vietnamese
- [ ] No console errors trong browser DevTools trên bất kỳ page
- [ ] No 500 errors trong backend logs khi normal usage

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
- Viết demo flow script gồm 6 scenes từ `01-foundation/03-product-spec.md` §18:
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
- Verify KPIs từ `01-foundation/03-product-spec.md` §19:
  1. Auto-reconciliation rate ≥80%
  2. Exception reduction ≥80%
  3. Traceability: 100% decisions có tool call + confidence + audit record
  4. Action completion: Planner hoàn tất workflow với ít nhất 3 agents + ít nhất 2 write actions
  5. Latency: initial response <5 giây, full case <30 giây
- Audit log export: JSON + CSV đều hoạt động và chứa complete trace
- Backup demo data snapshot
- Chuẩn bị fallback nếu live SePay webhook fail
- Verify toàn bộ 12 acceptance criteria từ `01-foundation/03-product-spec.md` §20

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
```

---

### Sprint 4 — Comprehensive Testing Checklist

> Mục tiêu: Verify demo chạy ổn định, toàn bộ KPIs đạt, pitch sẵn sàng. Đây là checklist cuối cùng trước khi present. Chạy qua từng item và đánh dấu ✓/✗.

**A. Demo Flow — 6 Scenes End-to-End**

> Mỗi scene phải pass hoàn toàn. Nếu 1 scene fail, fix trước khi tiếp tục.

- [ ] **Scene 1: Natural language request → Planner**
  - [ ] Nhập "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa" vào input
  - [ ] Planner hiển thị plan trong <5 giây với ít nhất 3 steps
  - [ ] Plan steps hiển thị bằng tiếng Việt
  - [ ] Agent Trace page cập nhật real-time: PENDING → PLANNING → EXECUTING
  - [ ] Mỗi step có agent name, tool name, status icon

- [ ] **Scene 2: Mini POS → QR → SePay webhook → auto-match**
  - [ ] Mở Mini POS, chọn 1-2 products, thêm vào cart
  - [ ] Click [Tạo QR] → sale tạo → QR modal hiển thị với reference + timer 15 phút
  - [ ] Thực hiện chuyển khoản thật (hoặc mock webhook) với đúng reference + amount
  - [ ] SePay webhook nhận → bank_transaction tạo → auto-match với sale
  - [ ] Dashboard cập nhật: transaction count +1, reconciliation rate tăng
  - [ ] Toast notification "Tiền vào" hiển thị trên frontend
  - [ ] Agent Trace hiển thị match result với confidence

- [ ] **Scene 3: Ambiguous transaction → AI suggest → human confirm**
  - [ ] Giao dịch 5,000,000₫ không có reference → xuất hiện trong Exception Inbox
  - [ ] AI suggestion: "chuyển nội bộ" với confidence 82%
  - [ ] Exception card hiển thị: amount, sender, note, AI suggestion badge, reasoning (expandable)
  - [ ] Click [Duyệt] → exception resolved → audit event created
  - [ ] Exception biến mất khỏi Inbox (hoặc status change)
  - [ ] Animation: fade-out + slide-up mượt

- [ ] **Scene 4: Tax Agent phát hiện missing invoices**
  - [ ] Tax-Readiness page hiển thị checklist
  - [ ] 2 failing items: "2 đơn hàng thiếu hóa đơn" với sale IDs
  - [ ] Rule version banner: "2026.07 | Effective: 2021-07-01 | Source: Thông tư 40/2021/TT-BTC"
  - [ ] Status: "Chưa sẵn sàng" (red banner)
  - [ ] Export button disabled (gray)
  - [ ] Agent Trace hiển thị Tax Agent tool calls: retrieve_tax_rules, check_required_fields

- [ ] **Scene 5: Merchant Ops Agent → cases, message, export**
  - [ ] Cases page hiển thị 5 cases
  - [ ] Mỗi case có: merchant, period, status, assigned RM
  - [ ] Draft message hiển thị bằng tiếng Việt tự nhiên
  - [ ] Message editable → save → case updated
  - [ ] Assign RM → case status change
  - [ ] Draft export generated: JSON file download

- [ ] **Scene 6: Before/after comparison**
  - [ ] Dashboard hiển thị: 30 records → 25 auto-matched, 5 exceptions
  - [ ] Reconciliation rate: 83%
  - [ ] Time taken: <5 phút (hiển thị hoặc narrate)
  - [ ] Audit log export: JSON + CSV đều download được
  - [ ] Audit log chứa complete trace: tool calls, confidence, human approvals

**B. KPI Verification**

- [ ] **KPI 1: Auto-reconciliation rate ≥80%**
  - [ ] 25/30 transactions auto-matched (83%)
  - [ ] 0 false matches
  - [ ] Verify bằng `python scripts/verify_kpis.py` hoặc manual count

- [ ] **KPI 2: Exception reduction ≥80%**
  - [ ] Before: 30 transactions cần manual review
  - [ ] After: 5 exceptions cần human decision
  - [ ] Reduction: (30-5)/30 = 83% ≥80%
  - [ ] Verify: exception count trong DB = 5

- [ ] **KPI 3: Traceability — 100% decisions có audit records**
  - [ ] Mọi tool call có record trong `tool_calls`
  - [ ] Mọi tool call có record trong `audit_events`
  - [ ] Mọi human approval có record trong `audit_events`
  - [ ] Mọi agent decision có confidence score
  - [ ] Query: `SELECT COUNT(*) FROM tool_calls WHERE run_id = X` = số tools thực tế gọi
  - [ ] Query: `SELECT COUNT(*) FROM audit_events WHERE run_id = X` ≥ số decisions

- [ ] **KPI 4: Action completion**
  - [ ] Planner hoàn tất workflow với ít nhất 3 agents (Reconciliation, Tax, Merchant Ops)
  - [ ] Ít nhất 2 write actions (create_case, draft_merchant_message, hoặc create_reconciliation_exception)
  - [ ] Agent run status = COMPLETED

- [ ] **KPI 5: Latency**
  - [ ] Initial response (first agent output) <5 giây
  - [ ] Full case completion <30 giây
  - [ ] Đo bằng timer từ POST `/api/v1/agents/run` đến status=COMPLETED

**C. Acceptance Criteria (§20 — 12 criteria)**

- [ ] AC-01: User nhập NL request → system trả về plan + executes (Scene 1)
- [ ] AC-02: Bank transaction auto-match với sale khi có reference (Scene 2)
- [ ] AC-03: Ambiguous transaction → AI suggestion + human confirm (Scene 3)
- [ ] AC-04: Tax-readiness report hiển thị pass/fail checklist (Scene 4)
- [ ] AC-05: Missing invoices detected và flagged (Scene 4)
- [ ] AC-06: Cases tạo tự động cho unresolved exceptions (Scene 5)
- [ ] AC-07: Draft message bằng tiếng Việt, merchant-friendly (Scene 5)
- [ ] AC-08: Mini POS tạo sale + QR dynamic (Scene 2)
- [ ] AC-09: Cash payment record + cash reconciliation (test separately)
- [ ] AC-10: Agent trace hiển thị real-time (Scene 1, 2)
- [ ] AC-11: Audit log export JSON + CSV (Scene 6)
- [ ] AC-12: Merchant confirmation via link (test separately)

**D. Demo Resilience & Reset**

- [ ] DB reset script: `python scripts/reset_demo.py` → drop + recreate + seed trong <30 giây
- [ ] Reset → chạy demo lại → toàn bộ 6 scenes pass lần 2
- [ ] Reset → chạy demo lại → toàn bộ 6 scenes pass lần 3 (stability)
- [ ] Fallback SePay webhook test:
  - [ ] Live webhook fail → switch to mock webhook → Scene 2 vẫn pass
  - [ ] Mock webhook trả về valid response
  - [ ] Frontend nhận notification từ mock
- [ ] DB backup/restore:
  - [ ] `python scripts/backup_demo.py` → snapshot created
  - [ ] `python scripts/restore_demo.py` → data restored correctly
  - [ ] Restore → demo vẫn chạy đúng
- [ ] Redis clean state: `redis-cli FLUSHDB` → no stuck jobs → demo chạy đúng
- [ ] Docker restart: `docker-compose down && docker-compose up` → toàn bộ services healthy → demo chạy đúng

**E. UI Polish & Edge Cases**

- [ ] Vietnamese text rendering trên toàn bộ 7 screens:
  - [ ] Dashboard: "Tổng giao dịch", "Tỷ lệ đối soát", "Ngoại lệ", "Sẵn sàng thuế"
  - [ ] Exceptions: "Hộp thư ngoại lệ", "Duyệt", "Từ chối", "Phân loại lại"
  - [ ] Tax: "Sẵn sàng thuế", "Phiếu kiểm tra", "Quy tắc thuế", "Xuất dữ liệu"
  - [ ] Cases: "Hồ sơ", "Phân công", "Tin nhắn", "Gửi xác nhận"
  - [ ] Agent Trace: "Traces", "Bước", "Đang chạy", "Hoàn thành", "Thất bại"
  - [ ] Audit: "Nhật ký kiểm toán", "Xuất JSON", "Xuất CSV"
  - [ ] POS: "Tạo đơn", "Giỏ hàng", "Tiền mặt", "Tạo QR", "Phiên thu ngân"
- [ ] Empty states:
  - [ ] Dashboard với no data: "Chưa có dữ liệu" thay vì blank
  - [ ] Exceptions empty: "Không có ngoại lệ" với positive message
  - [ ] Agent Trace empty: "Chưa có agent run nào" với CTA
  - [ ] Cases empty: "Không có hồ sơ nào"
  - [ ] Audit empty: "Không có sự kiện nào"
  - [ ] POS empty cart: "Giỏ hàng trống" với hint
- [ ] Loading states:
  - [ ] Dashboard loading: skeleton cards (pulse animation)
  - [ ] Exceptions loading: skeleton cards
  - [ ] Agent Trace loading: skeleton timeline
  - [ ] POS products loading: skeleton grid
- [ ] Error states:
  - [ ] API 500: "Lỗi hệ thống, vui lòng thử lại" + retry button
  - [ ] API timeout: "Hết thời gian, vui lòng thử lại" + retry button
  - [ ] Network offline: "Mất kết nối" banner
  - [ ] 403: "Không có quyền truy cập"
- [ ] Animations mượt, không jank:
  - [ ] Exception resolve: fade-out + slide-up 300ms
  - [ ] Agent step transitions: color change + check icon 200ms
  - [ ] QR modal: fade + scale 200ms
  - [ ] Page transitions: fade 150ms
  - [ ] Loading skeleton: pulse 1.5s loop
- [ ] Responsive:
  - [ ] 1280px: layout đúng, không overlap
  - [ ] 1024px: sidebar có thể collapse, content vẫn readable
  - [ ] Không horizontal scroll ở bất kỳ resolution nào

**F. Pitch & Presentation**

- [ ] Pitch deck hoàn thành:
  - [ ] Problem slide: merchant pain points (Excel, manual, slow)
  - [ ] Solution slide: TaxLens multi-agent AI
  - [ ] Demo screenshots: dashboard, exceptions, agent trace, tax-readiness
  - [ ] KPI slide: 83% auto-match, 83% exception reduction, 100% traceable, <30s
  - [ ] Architecture slide: FastAPI + Next.js + PostgreSQL + Redis + DeepSeek
  - [ ] Team slide: 5 members, roles
- [ ] Demo script document hóa:
  - [ ] Exact steps cho từng scene
  - [ ] Expected outcomes cho từng scene
  - [ ] Fallback plan nếu scene fail
  - [ ] Timing: tổng demo <10 phút
- [ ] Rehearsal:
  - [ ] Rehearse 1: chạy qua, note issues
  - [ ] Rehearse 2: fix issues, chạy lại
  - [ ] Rehearse 3: full run, timing đạt tiêu chuẩn
  - [ ] Demo được rehearse end-to-end thành công ít nhất 1 lần không lỗi

**G. Final Pre-Demo Checklist**

- [ ] `docker-compose up` chạy sạch, 4 services healthy
- [ ] DB seeded đúng: 30 sales, 23 transactions, 28 invoices, 5 users, 10 products
- [ ] Redis clean: `redis-cli FLUSHDB`
- [ ] .env configured đúng: DeepSeek API key, SePay webhook key, DB URL
- [ ] ngrok tunnel running (cho SePay webhook live demo)
- [ ] Browser cache cleared, fresh session
- [ ] Backup DB snapshot created
- [ ] Fallback webhook ready
- [ ] Pitch deck open và ready
- [ ] Demo script printed hoặc trên second screen
- [ ] Team members biết phần demo của mình
- [ ] Network stable, backup hotspot sẵn sàng