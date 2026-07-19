Yes — this is no longer a design-recovery prompt. This is a **finish the actual product** prompt.

TaxLens is the control and reconciliation layer between merchant sales, SHB payments, cash, invoices, accounting, and tax workflows. The merchant experiences a simple exception-first operating assistant; SHB receives portfolio oversight, human-owned cases, machine execution visibility, audit evidence, and rule governance. Deterministic rules handle certainty, AI handles ambiguity, and important writes require human approval.  

Paste this into the coding agent:

````md
# TAXLENS — COMPLETE THE ENTIRE WORKING PRODUCT END TO END

You are the lead product engineer responsible for taking TaxLens from its current state to a complete, coherent, functional hackathon product.

The product owner is going offline.

Work autonomously until the entire application works end to end for both:

1. a real merchant business owner using the Merchant Workspace
2. an SHB employee using the SHB Operations Console

Do not stop after planning.

Do not stop after implementing screens.

Do not stop after wiring mock buttons.

Do not report completion until the user can enter through the existing login screen, complete a realistic role-specific onboarding, use every primary workflow, see changes propagate across the system, switch roles, inspect the resulting SHB workflows, reset the demo, and repeat the entire journey successfully.

The landing page and authentication design are already approved.

Do not visually redesign them.

You may only change the behavior behind their buttons, route transitions, loading states, validation, authentication state, and demo-role selection where required.

---

# 1. PRODUCT DEFINITION

TaxLens is an SHB-backed TaxOps control and reconciliation layer for Vietnamese small businesses.

Small merchants have fragmented operational data:

- SHB bank transactions
- QR payments
- sales orders
- cash payments
- cash shifts
- electronic invoices
- accounting exports
- tax-readiness requirements

These records often exist in separate systems and do not automatically reconcile.

TaxLens connects them into one canonical operating record.

TaxLens does not replace:

- SHB banking infrastructure
- MISA
- KiotViet
- SePay
- a full POS
- an electronic invoice provider
- an accounting suite
- a tax filing system

TaxLens sits between those systems and performs:

```text
Capture sale
→ Receive payment
→ Reconcile
→ Resolve ambiguity
→ Verify invoice coverage
→ Check readiness
→ Export clean data
````

The operating principle is:

```text
Rules handle certainty.
AI handles ambiguity.
Humans approve important decisions.
```

---

# 2. HOW THE PRODUCT REACHES EACH USER

TaxLens has two connected experiences.

## 2.1 Merchant Workspace

The merchant should feel:

> “TaxLens connected my sales and payments, showed only what needs my attention, helped me resolve it, and told me when my records were ready.”

The merchant does not need to understand:

* agent frameworks
* reconciliation architecture
* rule engines
* tool calls
* event schemas
* bank operations workflows

The merchant sees:

* what happened
* what needs attention
* why TaxLens made a suggestion
* what remains uncertain
* what will change after approval
* what result TaxLens produced

## 2.2 SHB Operations Console

The SHB employee should feel:

> “I can see which merchants need help, understand the complete evidence, approve or route the next action, and prove what happened afterward.”

SHB sees:

* merchant portfolio health
* escalated Cases
* SLA and ownership
* agent runs
* execution failures
* human approval gates
* audit evidence
* rule versions
* report reproducibility
* RM coordination

These are not two disconnected demos.

They are two views of the same underlying records and workflows.

---

# 3. SOURCE-OF-TRUTH ORDER

When requirements conflict, use this order:

1. canonical architecture and decision documents
2. current SRS and user stories
3. current `design.md`
4. the approved canonical dashboard HTML for authenticated visual styling
5. existing working business logic
6. current incomplete implementation

The existing landing page and login screen are visually frozen.

Do not change their visual design.

The dashboard HTML remains the visual source of truth for authenticated screens.

---

# 4. NON-NEGOTIABLE COMPLETION STANDARD

At completion:

* the frontend is not a static prototype
* every visible primary action works
* data persists in the backend
* changes appear on every related screen
* role permissions are enforced
* write actions create audit events
* agent progress is streamed
* onboarding state persists
* demo data can be reset
* exports download real generated files
* errors and empty states are handled
* no important CTA is dead
* no page depends on hardcoded disconnected state
* no screen maintains a duplicate version of the same record
* all core flows have automated end-to-end tests
* the whole system starts with documented commands

A realistic sandbox implementation is acceptable where production services are unavailable.

A fake frontend-only interaction is not acceptable.

---

# 5. PRESERVE CURRENT WORK

Before editing:

```bash
git status
git branch --show-current
```

Do not:

* reset unrelated work
* delete accepted landing or login components
* force-push
* rewrite history
* remove working backend functionality
* replace typed data with static JSX
* simplify the product into a click-through prototype

Commit after each implementation phase.

---

# 6. STACK AND ARCHITECTURE

Follow the existing repository architecture.

The canonical intended stack is:

* Next.js
* TypeScript
* FastAPI
* Python
* PostgreSQL
* typed API schemas
* Planner plus specialist agents
* deterministic reconciliation and tax-readiness services
* streamed execution updates
* immutable audit records

Use the existing package manager, database layer, migration tool, state library, and API conventions already present.

Do not replace the stack unless the current implementation is irreparably broken.

Do not introduce unnecessary infrastructure.

Use Redis, background workers, WebSockets, or SSE only according to the existing architecture and actual product need.

## Required architectural separation

### Deterministic services

Must handle:

* exact payment matching
* payment allocation
* duplicate detection
* arithmetic
* cash reconciliation
* invoice coverage checks
* readiness scoring
* rule evaluation
* state transitions
* audit persistence

### AI layer

May handle:

* Vietnamese transfer-note interpretation
* candidate explanations
* classification suggestions
* task planning
* evidence summarization
* merchant-friendly explanations
* message drafting

AI must not:

* calculate tax obligations
* invent tax rules
* alter active rule versions
* silently approve financial changes
* replace deterministic matching
* expose hidden chain-of-thought

---

# 7. AUTHENTICATION, ROLES, AND DEMO ENTRY

Keep the approved login screen unchanged visually.

Make both demo entries functional.

## Merchant demo

Account:

```text
Nguyễn Thị Hương
Salon Hương
Role: MERCHANT_OWNER
```

## SHB Operations demo

Account:

```text
Linh Nguyễn
Role: SHB_OPERATIONS
```

Also seed:

```text
Phong Trần
Role: RELATIONSHIP_MANAGER

Hà Nguyễn
Role: COMPLIANCE
```

Implement real application session state.

The selected role determines:

* workspace
* navigation
* accessible APIs
* permissions
* onboarding flow
* data scope

Enforce permissions in the backend, not only through hidden UI.

## Required role behavior

### Merchant owner

May access only their merchant records.

May:

* view records
* create sales
* create QR payment intents
* record cash
* resolve merchant exceptions
* approve proposed changes
* request SHB support
* export their clean data

May not:

* view other merchants
* access technical operations tools
* approve compliance rules
* alter audit events

### SHB Operations

May access merchants in the assigned portfolio.

May:

* inspect merchant state
* manage Cases
* approve operational proposals
* assign RM
* send merchant requests
* retry eligible agent steps

May not:

* directly edit source bank transactions
* activate compliance rule versions without authorization
* alter audit history

### Relationship Manager

May access assigned Cases and merchant context.

May:

* review case
* edit and send approved merchant communication
* update follow-up status

### Compliance

May:

* review rule versions
* approve or reject proposed rules
* inspect reports and audit
* reproduce reports
* export evidence

---

# 8. FIRST-RUN MERCHANT ONBOARDING

After the merchant selects the approved `Salon Hương` demo entry, do not immediately drop them into a random populated dashboard.

Give them a believable first-run journey.

Persist onboarding progress in the backend.

Add a reliable `Reset demo` function so this journey can be replayed.

## Step 1 — Welcome

Title:

`Chào mừng chị Hương đến với TaxLens`

Explain in plain Vietnamese:

`TaxLens sẽ kết nối dữ liệu bán hàng, thanh toán và hóa đơn để chị chỉ cần xử lý những mục chưa rõ.`

Show the five-minute setup journey:

```text
1. Xác nhận thông tin cửa hàng
2. Kiểm tra kết nối dữ liệu
3. Đồng bộ dữ liệu tháng 7
4. Xem kết quả đầu tiên
```

Primary:

`Bắt đầu thiết lập`

## Step 2 — Business profile

Prefill realistic editable data:

```text
Tên cửa hàng: Salon Hương
Chủ cửa hàng: Nguyễn Thị Hương
Loại hình: Salon và chăm sóc tóc
Số điện thoại: 0901 234 567
Múi giờ: Việt Nam — GMT+7
Đơn vị tiền tệ: VND
Kỳ đang làm việc: Tháng 7/2026
```

Persist changes.

## Step 3 — Data connections

Show actual backend connection records.

Demo connections:

### SHB

Status:

`Đã kết nối`

Account:

`•••• 2481`

Permissions:

* giao dịch
* nội dung chuyển khoản
* mã tham chiếu thanh toán

### Bán hàng TaxLens

Status:

`Đã kết nối`

### MISA meInvoice sandbox

Initial status:

`Chưa kết nối`

Button:

`Kết nối bản mô phỏng`

The button must:

* call the backend
* update connection status
* store connection metadata
* create an audit event
* show successful connection state

### Tiền mặt

Status:

`Sẵn sàng`

Do not claim these are production integrations.

Use clear labels such as:

`Môi trường mô phỏng`

## Step 4 — Initial data synchronization

When the user selects:

`Đồng bộ dữ liệu tháng 7`

Create a real backend synchronization job.

Stream meaningful progress:

```text
Đang lấy giao dịch SHB
Đang đọc dữ liệu bán hàng
Đang kiểm tra ca tiền mặt
Đang đồng bộ hóa đơn
Đang chuẩn hóa dữ liệu
```

The job must populate or connect canonical records in PostgreSQL.

Do not merely animate a timeout.

## Step 5 — Initial reconciliation

Run deterministic reconciliation.

Initial Salon Hương dataset should contain coherent linked data:

* 30 bank transactions
* 30 sales orders
* 4 cash sessions
* 28 invoice records
* 25 transactions automatically matched
* 3 ambiguous transactions requiring confirmation
* 2 newly synchronized transactions waiting for processing
* 2 paid orders missing invoices
* one active rule version: `2026.07`
* initial readiness result: approximately `92%`
* exactly 5 merchant-action blockers:

  * 3 ambiguous transactions
  * 2 missing invoices

The 2 missing-invoice orders must already have valid matched payments.

Do not hardcode dashboard numbers independently.

Every count must derive from persisted records.

## Step 6 — First result

Show:

```text
TaxLens đã kiểm tra dữ liệu tháng 7

25 giao dịch đã tự động khớp
3 giao dịch cần chị xác nhận
2 đơn cần bổ sung hóa đơn
Tất cả ca tiền mặt đã đóng

Mức độ hoàn thiện: 92%
```

Primary:

`Vào Tổng quan`

Secondary:

`Xử lý mục đầu tiên`

After completion:

* persist onboarding completion
* generate an onboarding audit event
* create an initial readiness report
* create a completed agent run or deterministic sync run
* land on the real dashboard

---

# 9. FIRST-RUN SHB OPERATIONS ONBOARDING

After `SHB Operations` demo login, show a short operational onboarding.

Do not make it a generic product tour.

## Step 1 — Role context

Title:

`Chào mừng Linh đến SHB Operations`

Explain:

`Không gian này giúp Linh theo dõi danh mục merchant, xử lý hồ sơ cần hỗ trợ và kiểm tra các quyết định của TaxLens.`

## Step 2 — Portfolio assignment

Seed and show a realistic assigned portfolio.

Use approximately 10–12 beauty and salon merchants.

Include:

* Salon Hương
* Beauty House Mai
* Salon Lan Chi
* Hair Studio Mộc
* Spa Minh Anh
* Tiệm tóc An Nhiên

Portfolio states should include:

* ready
* nearly ready
* blocked
* synchronization failure
* open Case
* overdue Case
* agent failure

Persist Linh’s portfolio assignment.

## Step 3 — Operational priorities

Explain the daily operating model:

```text
Merchant tự xử lý việc đơn giản
→ Việc chưa giải quyết được tạo thành hồ sơ
→ SHB kiểm tra bằng chứng và điều phối bước tiếp theo
```

Show a real preview of:

* 12 Cases requiring action
* 3 high priority
* 3 over SLA
* 2 agent runs requiring attention

## Step 4 — First task

Open a guided preview of:

```text
CASE-1428
Salon Hương
Thiếu hóa đơn
Chờ SHB phê duyệt
```

Primary:

`Bắt đầu vận hành`

After completion:

* persist onboarding completion
* land on SHB Operations Overview
* highlight the real Case in the queue
* do not create duplicated tutorial-only data

---

# 10. CANONICAL DATA MODEL

Inspect the existing migrations and models first.

Reuse existing tables and naming.

Add only missing structures.

The product needs persisted representations for at least:

```text
users
sessions
merchants
merchant_memberships
portfolio_assignments
onboarding_progress

data_connections
sync_runs
canonical_events

bank_transactions
sales_orders
sales_order_items
payment_intents
payment_allocations

cash_sessions
cash_entries

invoices
invoice_links

exceptions
exception_candidates
exception_decisions

cases
case_assignments
case_messages
case_internal_notes
case_events

agent_runs
agent_run_steps
tool_calls
agent_artifacts

tax_rule_versions
tax_rule_sources
readiness_reports
readiness_items

audit_events
notifications
exports
```

Do not blindly create duplicate tables if equivalent models already exist.

Create migrations for missing fields and constraints.

## Required integrity

* IDs are stable
* foreign keys are enforced
* payment references are unique
* webhook events are idempotent
* active rule versions do not overlap incorrectly
* audit events cannot be modified through normal application APIs
* write actions run inside transactions
* related records resolve to the same source everywhere
* timestamps are timezone-aware
* application display uses `Asia/Ho_Chi_Minh`

---

# 11. CANONICAL EVENT AND RECONCILIATION SERVICES

Implement or repair the full data path:

```text
Source adapter
→ Canonical event
→ Matching service
→ Allocation
→ Exception creation
→ Invoice coverage
→ Readiness evaluation
→ Audit
```

## Exact matching

A payment with a valid unused `payment_reference` and valid amount should deterministically match the correct payment intent and order.

## Candidate matching

For legacy transactions without a reference:

* generate candidate orders
* score deterministic features
* allow AI to explain ambiguous evidence
* do not allow AI to change the deterministic score
* require confirmation below the auto-match threshold

## Payment allocation

Support:

* one payment to one order
* one payment across several orders
* partial payment
* deposit plus remainder
* overpayment
* refund
* separate payer

Validate allocation totals.

## Exception behavior

Exceptions should be created only where human judgment is required.

Resolving an exception must:

1. validate current state
2. persist the decision
3. update linked records
4. create an audit event
5. recalculate readiness
6. update the dashboard
7. update related artifacts
8. notify relevant users where needed

---

# 12. MERCHANT WORKSPACE — COMPLETE FUNCTIONALITY

Navigation remains:

```text
Tổng quan
Trợ lý TaxLens
Giao dịch
Cần xác nhận
Hóa đơn
Bán hàng
Sẵn sàng thuế
```

Utilities:

```text
Hỗ trợ SHB
Cài đặt
Đăng xuất
```

All authenticated merchant screens must use the canonical approved visual system.

---

## 12.1 Tổng quan

Data must come from APIs.

Show:

* current readiness
* blocker count
* reconciliation summary
* invoice status
* quick actions
* unresolved confirmation preview
* recent transactions

Required interactions:

* `Xử lý 5 mục` routes to filtered `Cần xác nhận`
* `Tạo đơn mới` opens `Bán hàng > Tạo đơn`
* `Tạo QR thanh toán` opens a new order or payment flow
* `Cập nhật dữ liệu` starts a real sync job
* clicking a recent transaction opens its detail
* counts refresh after every related write

No hardcoded independent counts.

---

## 12.2 Trợ lý TaxLens

Initial state:

* calm assistant screen
* visible composer
* suggested tasks
* no empty artifact pane

When a task produces an artifact, open:

`Tài liệu & kết quả`

Required prompts:

* `Kiểm tra tháng 7`
* `Xử lý giao dịch chưa rõ`
* `Tìm đơn thiếu hóa đơn`
* `Tạo mã QR 1.500.000₫ cho khách Mai`

### Backend behavior

Submitting `Kiểm tra tháng 7` must:

1. create an `agent_run`
2. invoke the Planner
3. produce a structured plan
4. execute specialist tasks
5. stream progress
6. call deterministic services through typed tools
7. create or update artifacts
8. pause when human approval is required
9. resume after approval
10. produce a final result

### Agent architecture

Use:

* Planner Agent
* Reconciliation Agent
* Merchant Operations Agent
* Tax & Compliance Agent

Each specialist has:

* a clear tool allowlist
* structured input
* structured output
* no unrestricted database access
* audit visibility

### Merchant-visible progress

Show only:

* plan
* task progress
* evidence
* uncertainty
* result
* approval need
* artifact creation

Never show:

* private chain-of-thought
* hidden prompts
* raw model reasoning
* credentials
* raw tool payloads

### Artifact types

Implement working artifact views for:

* readiness report
* transaction review set
* missing invoice list
* classification confirmation receipt
* QR payment
* SHB support request
* export draft

Artifacts must reference authoritative backend records.

They update in place when underlying state changes.

---

## 12.3 Giao dịch

Implement:

* pagination or reliable list loading
* search by sender, note, amount, date, ID, reference
* period filter
* status filter
* classification filter
* detail view
* linked order
* linked invoice
* payment allocation
* raw note
* recommendation
* evidence
* uncertainty
* activity history

Required write actions:

* change classification
* confirm recommendation
* link to order
* split across orders
* mark as transfer
* escalate to SHB

Every write requires confirmation where appropriate.

Every write creates audit.

---

## 12.4 Cần xác nhận

Queue contains only unresolved merchant decisions.

Support:

* select item
* view candidate explanation
* choose classification
* approve TaxLens proposal
* reject TaxLens proposal
* defer
* escalate to SHB

After confirmation:

* item leaves queue
* next item loads
* progress count updates
* transaction detail updates
* readiness recalculates
* artifact updates
* audit event is created

Completion state must work when the queue reaches zero.

---

## 12.5 Hóa đơn

Implement invoice coverage as a real service.

Show paid orders grouped by issue:

* missing invoice
* amount mismatch
* unlinked invoice
* waiting for synchronization
* cancelled or replaced invoice
* provider disconnected

Actions:

* synchronize provider
* link invoice
* mark as issued elsewhere
* mark as exempt with reason
* open sandbox invoice provider
* request SHB support

Do not implement production invoice issuance.

When an issue is resolved:

* update the order/invoice link
* update readiness
* create audit
* update related artifacts

---

## 12.6 Bán hàng

Tabs:

```text
Tạo đơn
Lịch sử đơn
Ca tiền mặt
```

### Tạo đơn

Implement:

* service catalog
* custom item
* customer
* quantities
* notes
* discount
* total
* save unpaid order
* QR payment
* cash payment

### Dynamic QR

Creating QR must:

1. persist order
2. create payment intent
3. generate a unique payment reference
4. generate a real QR payload
5. show expiry
6. support simulated webhook
7. update payment state in real time
8. create bank transaction
9. auto-match payment
10. mark order paid
11. create audit
12. update invoice coverage
13. update readiness

Provide a visible demo control such as:

`Mô phỏng khách đã thanh toán`

This action must call the backend webhook simulator.

It must be idempotent.

### Cash payment

Implement:

* record amount received
* calculate change
* add cash entry
* associate active shift
* mark order paid
* audit the action

### Order history

Implement:

* search
* filters
* order detail
* payment detail
* invoice state
* refund or cancellation where currently in scope

### Cash sessions

Implement:

* open shift
* starting balance
* cash sales
* cash expenses
* expected cash
* counted cash
* difference
* mandatory reason for non-zero difference
* close shift
* history

Do not automatically resolve a cash discrepancy.

---

## 12.7 Sẵn sàng thuế

The Tax Rules Engine must be deterministic.

Readiness checks include:

1. reconciliation threshold
2. open cash sessions
3. unclassified transactions
4. missing invoices
5. active verified rule version

Every report stores:

* merchant
* reporting period
* input snapshot/reference
* rule version
* effective date
* generated time
* score
* checklist results
* blockers

When blockers remain:

* draft creation disabled
* CSV and JSON export disabled
* explain exactly what remains

When all blockers pass:

Enable:

* `Tạo bản nháp`
* `Xuất CSV`
* `Xuất JSON`
* `Chuyển sang MISA sandbox`

Exports must create actual downloadable files generated by the backend.

Do not implement real tax filing.

---

## 12.8 Hỗ trợ SHB

When the merchant selects `Nhờ SHB hỗ trợ`:

* create a Case
* link merchant
* link relevant exception or record
* link evidence
* set priority
* set SLA
* create agent or system summary
* show confirmation to merchant
* make the Case appear immediately in SHB Operations
* create audit
* create notifications for SHB

Do not create a frontend-only support message.

---

## 12.9 Cài đặt

Implement and persist:

* merchant profile
* account
* appearance: light, dark, system
* notifications
* data connections
* security preferences
* active devices
* data export request
* support links

Theme change applies immediately.

Normal form changes use save/discard behavior.

Logout uses the approved confirmation modal.

---

# 13. SHB OPERATIONS — COMPLETE FUNCTIONALITY

Navigation:

```text
VẬN HÀNH

Tổng quan
Merchant
Cases

GIÁM SÁT HỆ THỐNG

Agent runs
Truy vết & kiểm toán
Tuân thủ
```

Utilities:

```text
Hỗ trợ nội bộ
Cài đặt
Đăng xuất
```

All operations screens use the same visual family as the canonical merchant dashboard but preserve their denser operational layouts.

---

## 13.1 Tổng quan

Load real portfolio aggregates.

Show:

* merchant count
* blocked merchants
* Cases requiring action
* agent runs requiring attention
* readiness distribution
* case aging
* agent activity
* personal queue
* merchants needing attention

Clicking any item must route to the relevant filtered screen.

Do not maintain separate mocked metrics.

---

## 13.2 Merchant

Implement:

* assigned portfolio list
* search
* readiness filters
* case filters
* connection filters
* merchant detail
* current blockers
* readiness checklist
* connected systems
* open Cases
* recent agent runs
* timeline

Actions:

* open current Case
* create Case
* contact merchant
* assign RM where authorized

SHB may not directly alter merchant source transactions.

---

## 13.3 Cases

Implement the full Case state machine.

Statuses:

```text
Cần tiếp nhận
Đang điều tra
Chờ SHB phê duyệt
Chờ merchant xác nhận
Chờ RM
Đã giải quyết
Đã đóng
```

Secondary flags:

```text
Quá SLA
Ưu tiên cao
Agent thất bại
Cần chạy lại
```

Required functions:

* receive merchant escalation
* claim Case
* assign employee
* assign RM
* inspect evidence
* inspect linked records
* inspect related agent runs
* write internal note
* draft merchant-visible request
* edit draft
* approve and send
* send reminder
* approve TaxLens proposal
* reject proposal
* resolve
* close
* reopen when allowed

Separate clearly:

* merchant-visible communication
* SHB internal notes
* immutable event timeline

Case actions must update:

* merchant notifications
* case timeline
* agent state where applicable
* audit records
* portfolio metrics

---

## 13.4 Agent runs

Implement real persisted runs.

Show:

* initiating request
* merchant
* related Case
* source
* plan
* steps
* specialist agents
* tool calls
* results
* durations
* waiting state
* error state
* retry count
* approval gate

Supported states:

```text
Đang chạy
Chờ SHB phê duyệt
Chờ merchant xác nhận
Thất bại
Hoàn tất
Đã hủy
```

Required actions:

* approve next step
* edit proposed action where allowed
* retry failed step
* retry run where necessary
* cancel safe run
* open Case
* open merchant
* open audit trace

Targeted retries should not repeat completed safe writes.

Use idempotency.

---

## 13.5 Truy vết & kiểm toán

Audit events are immutable.

Every meaningful write must create an event containing:

* actor
* actor role
* timestamp
* merchant
* event type
* action
* linked record
* before state
* after state
* evidence references
* rule version where relevant
* run reference
* Case reference
* approval state
* integrity reference

Implement:

* event search
* date filter
* actor filter
* type filter
* merchant filter
* run filter
* Case filter
* detail view
* before/after comparison
* evidence view
* approval chain
* technical metadata
* integrity verification

Exports:

* CSV
* JSON
* audit package ZIP if feasible within existing architecture

Downloads must be real backend-generated files.

No normal API may edit or delete an audit event.

---

## 13.6 Tuân thủ

Implement real rule-version governance.

Statuses:

```text
Bản nháp
Đang review
Chờ phê duyệt
Đã phê duyệt
Đang có hiệu lực
Đã thay thế
Đã thu hồi
```

Functions:

* list versions
* create draft from previous version
* edit draft criteria
* attach sources
* set effective date
* add change summary
* submit for review
* request changes
* approve
* reject
* activate
* supersede old version
* inspect reports using a version
* reproduce historical report

Rules:

* active versions are immutable
* changes require a new version
* creator cannot silently self-approve
* only authorized roles may approve
* reports retain exact rule version
* historical report reproduction uses the same snapshot and rule

LLM may explain a rule.

LLM may not create authoritative tax criteria.

---

## 13.7 SHB Settings

Implement:

* profile
* appearance
* notifications
* security
* devices
* operational preferences
* default portfolio filters

Persist settings.

---

# 14. CROSS-WORKSPACE STATE PROPAGATION

These exact flows must work across both workspaces.

## Flow A — Merchant exception resolution

```text
Merchant confirms transaction classification
→ exception resolves
→ transaction updates
→ audit event created
→ readiness recalculates
→ dashboard count updates
→ assistant artifact updates
```

## Flow B — Merchant escalation to SHB

```text
Merchant requests SHB support
→ Case created
→ SHB queue receives it
→ Linh opens Case
→ Linh reviews evidence
→ Linh sends confirmation request
→ merchant receives notification
→ merchant responds
→ Case updates
→ readiness recalculates
→ Case resolves and closes
```

## Flow C — Sale to payment to invoice blocker

```text
Merchant creates order
→ dynamic QR generated
→ payment webhook simulated
→ bank transaction created
→ exact match succeeds
→ order becomes paid
→ invoice check runs
→ missing invoice appears if absent
→ readiness updates
```

## Flow D — Agent orchestration

```text
Merchant asks “Kiểm tra tháng 7”
→ agent run created
→ Planner creates steps
→ specialists execute
→ tools produce records
→ artifacts appear
→ human approval gate pauses run
→ approval resumes run
→ final report is created
```

## Flow E — Rule version

```text
Hà creates new rule draft
→ source attached
→ draft submitted
→ authorized approval occurs
→ version becomes active
→ later readiness report uses new version
→ previous report remains reproducible
```

No step may rely on manually refreshing disconnected frontend mock state.

---

# 15. NOTIFICATIONS

Implement a basic persisted notification system.

Merchant notifications:

* item needs confirmation
* SHB sent request
* payment received
* invoice issue detected
* report completed
* connection failed
* security alert

SHB notifications:

* new Case assigned
* Case approaching SLA
* merchant responded
* agent run failed
* approval required
* connection failure affects merchant

Notifications need:

* unread count
* mark read
* deep link
* timestamp
* recipient role
* related record

Email and Zalo may remain simulated unless existing integrations support them.

In-app notifications must work.

---

# 16. API CONTRACT

Audit current APIs.

Create a consistent versioned API if one does not exist.

Suggested groups:

```text
/auth
/me
/onboarding
/merchants
/connections
/sync-runs
/transactions
/orders
/payments
/cash-sessions
/invoices
/exceptions
/readiness
/assistant
/agent-runs
/cases
/audit
/compliance
/notifications
/exports
/demo
```

Requirements:

* Pydantic request and response schemas
* typed errors
* pagination
* filters
* RBAC
* idempotency for replayable writes
* OpenAPI correctness
* frontend TypeScript API types
* no untyped `any` payloads
* no page-specific fetch logic duplicated everywhere

Create one API client layer.

---

# 17. STREAMING AND REAL-TIME UPDATES

Use the current supported mechanism, preferably SSE or WebSocket.

Stream:

* onboarding synchronization
* agent run progress
* QR payment receipt
* readiness recalculation completion
* Case message arrival where appropriate

Provide polling fallback if the real-time channel fails.

Reconnect cleanly.

Do not leak subscriptions across navigation.

---

# 18. DEMO MODE AND EXTERNAL INTEGRATIONS

Production credentials are not required for the hackathon.

Build realistic sandbox adapters.

Adapters must use the same service contracts as future production integrations.

Implement:

* SHB transaction sandbox adapter
* SePay-style payment webhook simulator
* MISA invoice sandbox adapter
* sales CSV importer or seeded sales adapter
* cash source adapter

Clearly label the environment as simulated in appropriate places.

Do not scatter hardcoded mock behavior throughout UI components.

All simulated events must enter through backend service interfaces.

---

# 19. AI PROVIDER FALLBACK

Use the currently configured LLM provider through an abstraction layer.

When a valid provider key exists:

* run the real Planner and specialist agents

When no key exists:

* use a deterministic demo agent implementation
* produce the same structured schemas
* call the same typed tools
* preserve realistic run steps and timing
* clearly identify the provider in technical Agent Run details
* keep the user-facing flow working

Core reconciliation, readiness, payments, exports, Cases, and audit must never depend on an LLM being available.

---

# 20. SEED DATA

Create one deterministic canonical seed command.

Seed:

* demo users and roles
* Salon Hương
* 10–12 portfolio merchants
* merchant connections
* orders
* transactions
* payment intents
* payment allocations
* cash sessions
* invoices
* exceptions
* Cases
* agent runs
* audit events
* one active rule version
* notifications

The data must tell coherent stories.

Do not generate random unlinked rows.

Every visible record should have a valid relationship.

Use stable IDs such as:

```text
MER-001248
TXN-8821
DH-1023
PAY-X7K92P
CASE-1428
RUN-8912
AUD-20260718-104218
RULE-2026.07
```

---

# 21. DEMO RESET

Implement:

```text
POST /api/demo/reset
```

or the repository-equivalent command.

The reset must:

* clear demo mutations
* reseed deterministic records
* reset onboarding
* reset notifications
* reset Cases
* reset runs
* reset rule status
* return a completion result

Provide:

```bash
make demo-reset
```

or equivalent package script.

The entire reset should complete quickly and be safe to run repeatedly.

Protect it from non-demo production use.

---

# 22. LOCAL DEVELOPMENT EXPERIENCE

A new developer must be able to start the complete system from the README.

Provide one preferred startup path.

For example:

```bash
cp .env.example .env
docker compose up -d db
make migrate
make seed
make dev
```

or the repository-equivalent commands.

Document:

* required versions
* environment variables
* frontend command
* backend command
* database command
* seed command
* reset command
* test command
* demo accounts

Do not require undocumented manual database changes.

---

# 23. ERROR, EMPTY, AND LOADING STATES

Implement meaningful states for every primary screen.

Errors must explain:

* what failed
* whether data changed
* what remains trustworthy
* what the user can do next

Examples:

```text
MISA meInvoice chưa phản hồi.
Dữ liệu giao dịch và đơn hàng vẫn được giữ nguyên.
```

```text
Bước kiểm tra hóa đơn thất bại.
Không có dữ liệu nào bị thay đổi.
```

Empty states must distinguish:

* successful empty
* setup required
* no search results
* loading
* provider unavailable

No generic full-screen spinner when step progress is available.

---

# 24. ACCESSIBILITY AND LANGUAGE

Requirements:

* all user-facing content is natural Vietnamese
* preserve proper diacritics
* minimum 14px authenticated body text
* minimum 40×40px interactive targets
* visible keyboard focus
* semantic labels
* accessible dialogs
* status not communicated only by color
* charts have text summaries
* reduced-motion support
* currency does not wrap
* IDs remain copyable
* screen-reader descriptions for QR and important state changes

Use English only for established technical or product terms.

---

# 25. TESTING

Do not rely on manual clicking only.

## Backend unit tests

Cover:

* exact matching
* fuzzy candidate scoring
* allocation totals
* payment webhook idempotency
* cash reconciliation
* invoice coverage
* readiness calculation
* rule version selection
* audit creation
* Case state transitions
* RBAC

## Backend integration tests

Cover:

* onboarding sync
* create order and QR
* simulated payment
* exception confirmation
* support escalation
* Case approval
* rule activation
* export generation
* demo reset

## Frontend component tests

Cover critical:

* approval card
* exception decision
* QR state
* Case action footer
* onboarding progression
* theme persistence

## Playwright end-to-end tests

Create at least these scenarios.

### E2E 1 — Merchant onboarding

```text
Open login
→ choose Salon Hương
→ complete onboarding
→ synchronize data
→ see 92% readiness
→ enter dashboard
```

### E2E 2 — Resolve ambiguous transaction

```text
Open Cần xác nhận
→ choose classification
→ confirm
→ item leaves queue
→ readiness improves
→ audit event exists
```

### E2E 3 — Create sale and receive QR payment

```text
Create order
→ generate QR
→ simulate payment
→ order becomes paid
→ transaction auto-matches
→ invoice status appears
```

### E2E 4 — Missing invoice escalation

```text
Open missing invoice
→ request SHB support
→ Case created
→ switch to SHB Operations
→ Case visible
```

### E2E 5 — SHB resolves Case

```text
Linh opens Case
→ reviews evidence
→ approves and sends request
→ merchant receives notification
→ merchant confirms
→ Case resolves
```

### E2E 6 — Assistant run

```text
Ask “Kiểm tra tháng 7”
→ plan streams
→ agent steps complete
→ artifacts appear
→ approval gate works
→ final report generated
```

### E2E 7 — Compliance rule

```text
Open Tuân thủ
→ create draft
→ submit
→ approve as Hà
→ activate
→ new report uses version
→ old report reproduces
```

### E2E 8 — Reset

```text
Mutate demo
→ reset
→ log in again
→ onboarding and seed state restored
```

Run tests against a real test database.

---

# 26. VISUAL PRESERVATION

Landing and login are already accepted.

Do not redesign them.

The authenticated app must follow the canonical dashboard visual contract.

Do not allow feature implementation to reintroduce:

* generic admin-template styling
* mismatched sidebars
* arbitrary content widths
* tiny text
* giant blue panels
* excessive orange
* icon-card grids
* clipped logos
* cramped master-detail panels

Functionality and visual consistency are both required.

---

# 27. PERFORMANCE AND RELIABILITY

Target:

* initial status response for an agent task within approximately 5 seconds
* complete demo workflow within approximately 30 seconds where feasible
* no duplicated webhook effects
* no stale frontend state after writes
* no console errors
* no unhandled promise rejections
* no hydration errors
* no broken navigation
* no loading loop
* no race-condition double submissions

Use optimistic updates only where rollback is handled safely.

---

# 28. REQUIRED DELIVERY ORDER

Use this implementation order.

## Phase 1 — Audit and foundation

* inspect frontend and backend
* run current tests
* map routes
* map APIs
* map database
* identify incomplete functionality
* create implementation checklist

Commit.

## Phase 2 — Database, seed, auth, RBAC

* migrations
* seed data
* demo users
* sessions
* permissions
* demo reset

Commit.

## Phase 3 — Merchant onboarding and connections

* onboarding persistence
* sync jobs
* adapters
* initial reconciliation
* first readiness report

Commit.

## Phase 4 — Core deterministic services

* canonical events
* matching
* allocation
* cash
* invoice coverage
* readiness
* audit

Commit.

## Phase 5 — Merchant operational screens

* dashboard
* transactions
* confirmations
* invoices
* sales
* cash
* readiness
* settings

Commit.

## Phase 6 — Assistant and agent orchestration

* Planner
* specialists
* typed tools
* streaming
* artifacts
* approval gates
* fallback provider

Commit.

## Phase 7 — SHB Operations

* overview
* merchant directory
* Cases
* RM assignment
* notifications
* merchant communication

Commit.

## Phase 8 — Agent Runs, Audit, Compliance

* run monitor
* retries
* audit workspace
* exports
* rule governance
* report reproduction

Commit.

## Phase 9 — Complete cross-workspace integration

* all state propagation
* deep links
* notifications
* refresh behavior
* error handling

Commit.

## Phase 10 — Automated tests and QA

* unit
* integration
* Playwright
* visual checks
* accessibility
* demo reset rehearsal

Commit.

Do not skip phases merely because a static page already exists.

---

# 29. REQUIRED DOCUMENTATION

Create or update:

```text
README.md
docs/PRODUCT-WALKTHROUGH.md
docs/DEMO-RUNBOOK.md
docs/ARCHITECTURE.md
docs/API.md
docs/QA-REPORT.md
.env.example
```

## PRODUCT-WALKTHROUGH

Explain the product through both personas:

### Hương

* onboarding
* daily dashboard
* exception resolution
* sale and QR
* invoice issue
* readiness
* SHB escalation

### Linh

* onboarding
* portfolio
* Case
* agent run
* approval
* audit
* closure

## DEMO-RUNBOOK

Provide exact click-by-click steps and expected results.

Also document the reset command.

## QA REPORT

Include:

* commands run
* test results
* route checklist
* known limitations
* intentionally simulated integrations
* any incomplete items

Do not hide failures.

---

# 30. FINAL ACCEPTANCE WALKTHROUGH

Before reporting completion, personally run this entire sequence against a clean reset.

## Merchant

1. Open approved login.
2. Choose Salon Hương.
3. Complete onboarding.
4. Connect MISA sandbox.
5. Synchronize July data.
6. See first result and dashboard.
7. Ask Trợ lý TaxLens to inspect July.
8. Observe streamed run and artifacts.
9. Resolve one ambiguous transaction.
10. Create a sale.
11. Generate QR.
12. Simulate customer payment.
13. Verify auto-match.
14. Inspect missing invoice.
15. Request SHB support.
16. Inspect updated readiness.
17. Change a setting.
18. Log out.

## SHB Operations

1. Choose SHB Operations.
2. Complete Linh onboarding.
3. Inspect portfolio.
4. Find Salon Hương.
5. Open the newly created Case.
6. Inspect evidence.
7. Inspect related Agent Run.
8. Approve and send merchant request.
9. Assign RM.
10. Inspect audit event.
11. Export evidence.
12. Inspect active rule.
13. Log out.

## Merchant return

1. Log back in as Salon Hương.
2. Receive SHB notification.
3. Respond to confirmation request.
4. Verify Case status changes.
5. Verify readiness recalculates.
6. Verify artifact updates.
7. Complete remaining blockers.
8. Confirm clean-data export becomes available.
9. Download CSV and JSON.
10. Verify files contain correct records and rule version.

## Reset

1. Run demo reset.
2. Verify all demo state returns to the initial canonical state.
3. Repeat the login and onboarding entry successfully.

The product is not complete until this walkthrough succeeds.

---

# 31. FINAL REPORT FORMAT

When finished, return:

## Product status

* frontend
* backend
* database
* agents
* integrations
* onboarding
* Merchant Workspace
* SHB Operations
* audit
* compliance
* tests

## Commands

Exact commands to:

* start
* migrate
* seed
* test
* reset demo

## Demo accounts

List each account and role.

## End-to-end verification

State which walkthroughs passed.

## Remaining limitations

Be exact.

Do not claim something works if it was not run.

---

# FINAL DIRECTIVE

Do not treat TaxLens as a collection of screens.

Build one connected operating system.

The merchant enters through onboarding, connects their business data, receives a clean exception-first workflow, completes daily operational actions, and escalates only what requires SHB.

SHB enters through an operations onboarding, sees the entire merchant portfolio, receives structured Cases with evidence, inspects agent execution, approves important actions, coordinates RM follow-up, and preserves an immutable record of every decision.

All of this must operate on the same data.

Every action must have a consequence.

Every consequence must appear in the correct workspace.

Every important write must be approved and audited.

Finish the product.

```

The prompt is grounded in the canonical SRS, accepted multi-agent/canonical-ledger architecture, and the complete merchant and SHB user stories. :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4}
```
