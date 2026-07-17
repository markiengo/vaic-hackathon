# Decision Register — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Project Lead
> **Applies to:** Mọi module và agent của TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Mọi decision liệt kê area affected và verification step

---

## DEC-001 — Multi-agent architecture with Planner + 3 specialist agents

**Status:** Accepted
**Date:** 2026-07-17
**Owner:** Project Lead

### Decision

TaxLens dùng Planner Agent phân tách yêu cầu operational phức tạp thành task, rồi delegate cho ba specialist agent: Reconciliation Agent, Tax & Compliance Agent, và Merchant Operations Agent. Mỗi agent có tool allowlist riêng, output schema riêng, và inline context source riêng.

### Rationale

Một LLM call không thể đáng tin cậy xử lý đối soát, tax validation, và case management trong một pass. Tách concern cho phép deterministic tool xử lý certainty (reference matching, tax formula) trong khi AI xử lý ambiguity (interpret text tiếng Việt, candidate scoring, draft message).

### Affected areas

- `03-engineering/01-system-architecture.md`
- `05-domain/01-ai-advisor.md`
- `02-requirements/04-functional-requirements.md`
- `03-engineering/02-data-models.md` (agent_runs, tool_calls tables)

### Rejected alternatives

- **Single-agent với function calling:** Quá nhiều context cho một agent; mất traceability mỗi specialty.
- **Pipeline không có Planner:** Không thể xử lý variable task ordering hoặc conditional delegation.

### Verification

- Planner tạo plan với ≥3 step cho yêu cầu phức tạp
- Mỗi specialist agent chỉ gọi tool trong allowlist của nó
- Agent trace cho thấy agent nào gọi tool nào

---

## DEC-002 — Canonical Event Ledger as single source of truth

**Status:** Accepted
**Date:** 2026-07-17
**Owner:** Tech Lead

### Decision

Mọi nguồn dữ liệu (SHB transaction, POS, cash session, invoice, COD) được normalize vào Canonical Event Ledger trong PostgreSQL. Mỗi nguồn đi qua adapter map external schema sang canonical schema.

### Rationale

Không có canonical ledger, reconciliation logic phải xử lý N source format. Với adapter, core reconciliation engine làm việc với một schema duy nhất bất kể nguồn.

### Affected areas

- `03-engineering/01-system-architecture.md`
- `03-engineering/02-data-models.md`
- `03-engineering/05-integration.md`
- `05-domain/02-algorithm.md`

### Rejected alternatives

- **Direct query mỗi source:** Fragile, logic duplicate, không có single audit trail.
- **Data warehouse approach:** Quá nặng cho MVP; PostgreSQL với schema đúng là đủ.

### Verification

- Mọi source data xuất hiện trong canonical table sau khi adapter chạy
- Reconciliation query chỉ reference canonical table

---

## DEC-003 — Payment reference as the primary link key

**Status:** Accepted
**Date:** 2026-07-17
**Owner:** Tech Lead

### Decision

`payment_reference` (vd: `PAY-A8F21X`) do hệ thống sinh là primary link giữa sales order, payment intent, và bank transaction. Ba ID (POS order_id, payment_reference, bank transaction_id) không cần match nhau mà liên kết qua field payment_reference trong database.

### Rationale

Note chuyển khoản ngân hàng Việt Nam không đáng tin cậy (thiếu, viết tắt, hoặc sai). Reference do hệ thống sinh nhúng trong dynamic QR đảm bảo deterministic matching cho giao dịch mới. Fuzzy matching chỉ cần cho giao dịch legacy hoặc external không có reference.

### Affected areas

- `03-engineering/02-data-models.md` (payment_intents, payment_allocations)
- `05-domain/02-algorithm.md` (matching algorithm)
- `02-requirements/04-functional-requirements.md`

### Rejected alternatives

- **Dùng note giao dịch ngân hàng làm key:** Không đáng tin cậy; note tiếng Việt thường trống hoặc mơ hồ.
- **Dùng order ID làm key:** Không có trong dữ liệu bank transaction.

### Verification

- Giao dịch với reference hợp lệ auto-match ≥95% thời gian
- Giao dịch không có reference đi qua candidate matching

---

## DEC-004 — Tax Rules Engine is deterministic and separate from LLM

**Status:** Accepted
**Date:** 2026-07-17
**Owner:** Tech Lead

### Decision

Tax Rules Engine là deterministic service với versioned rule lưu trong PostgreSQL. LLM có thể giải thích rule bằng ngôn ngữ tự nhiên nhưng không được tính tax formula, sửa rule, hoặc tạo tax rate mới.

### Rationale

Tax calculation phải reproducible và auditable. LLM non-deterministic và không thể tin cậy cho tính toán tài chính chính xác. Rule versioning đảm bảo report reference đúng rule set có hiệu lực tại thời điểm generate.

### Affected areas

- `05-domain/05-compliance.md`
- `05-domain/01-ai-advisor.md`
- `03-engineering/02-data-models.md` (tax_rule_versions table)
- `02-requirements/04-functional-requirements.md`

### Rejected alternatives

- **LLM cho tax calculation:** Non-deterministic, không auditable, rủi ro pháp lý.
- **Hardcoded rule:** Không thể version hoặc update mà không code change.

### Verification

- Tax-readiness report bao gồm rule_version và effective_date
- LLM không bao giờ gọi tax calculation tool; chỉ gọi `retrieve_tax_rules` và `classify_revenue_category`

---

## DEC-005 — Exception-first UX with human approval for ambiguous cases

**Status:** Accepted
**Date:** 2026-07-17
**Owner:** Project Lead

### Decision

UI chỉ hiển thị ngoại lệ cần human decision, không hiển thị full transaction list. AI suggestion bao gồm confidence score. Giao dịch dưới auto-match threshold (≥95%) yêu cầu human confirmation. AI không bao giờ auto-resolve giao dịch mơ hồ.

### Rationale

Nhân viên bank không thể review hàng trăm giao dịch thủ công. Chỉ hiển thị ngoại lệ giảm workload 80%+ trong khi duy trì human control over risky decision.

### Affected areas

- `04-delivery/03-design.md` (Exception Inbox screen)
- `02-requirements/04-functional-requirements.md`
- `05-domain/01-ai-advisor.md` (confidence thresholds)

### Rejected alternatives

- **Hiển thị tất cả giao dịch:** Quá tải; thất bại mục đích.
- **Auto-resolve tất cả:** Quá rủi ro cho dữ liệu tài chính; compliance yêu cầu human approval.

### Verification

- Exception Inbox chỉ hiển thị item confidence < 95%
- Không giao dịch nào auto-resolve dưới threshold
- Human approval được log trong audit_events

---

## DEC-006 — Next.js + FastAPI + PostgreSQL stack

**Status:** Accepted
**Date:** 2026-07-17
**Owner:** Tech Lead

### Decision

Frontend: Next.js với TypeScript. Backend: FastAPI với Python. Database: PostgreSQL. Agent orchestration: LangGraph. Tool protocol: typed function calling (Python functions passed to LLM, không dùng MCP). LLM provider: DeepSeek V4 Flash với thinking mode. Tích hợp ngân hàng: SePay API (real) cho giao dịch SHB. Business guidance injected trực tiếp vào agent prompts (~200 lines, không cần vector search).

### Rationale

Next.js cung cấp SSR và DX tốt cho dashboard. FastAPI nhanh, typed, và Python ecosystem hỗ trợ AI library. PostgreSQL đủ cho MVP. Business guidance documents (~200 lines) được inject trực tiếp vào agent prompts, không cần pgvector hay vector DB. LangGraph cung cấp stateful agent orchestration.

### Affected areas

- `03-engineering/01-system-architecture.md`
- `04-delivery/01-environment-setup.md`
- `04-delivery/04-implementation-plan.md`

### Rejected alternatives

- **Django:** Nặng hơn; ít thân thiện async cho agent workload.
- **Node.js backend:** Python hỗ trợ AI ecosystem tốt hơn.
- **MCP (Model Context Protocol):** Thêm protocol overhead không cần thiết cho 4 agent; typed function calling đơn giản hơn cho hackathon.
- **Custom state machine:** LangGraph đã cung cấp state management; không cần tự xây.

### Verification

- Frontend build với `npm run build`
- Backend start với `uvicorn main:app`

---

## DEC-007 — MVP scope: 1 salon merchant, sandbox integrations

**Status:** Accepted
**Date:** 2026-07-17
**Owner:** Project Lead

### Decision

MVP hackathon bao gồm 1 merchant salon với 30 đơn hàng, 20 chuyển khoản, 8 thanh toán tiền mặt, 2 giao dịch không phải doanh thu, 2 giao dịch cùng số tiền gây mơ hồ, 1 hoàn tiền, 2 đơn thiếu hóa đơn, và 1 chênh lệch tiền mặt. SePay API (real) dùng cho giao dịch SHB. Invoice, case management dùng mock API.

### Rationale

Demo tập trung với edge case thực tế chứng minh multi-agent workflow end-to-end mà không cần production API access.

### Affected areas

- `04-delivery/05-roadmap.md`
- `04-delivery/02-testing-spec.md`
- `03-engineering/05-integration.md`

### Rejected alternatives

- **Nhiều merchant:** Quá nhiều data prep cho 48 giờ.
- **Production API:** Không có sẵn; sandbox đủ cho demo.

### Verification

- Demo flow chạy end-to-end từ yêu cầu natural language đến agent action
- Tất cả 9 MVP feature từ product.md §17 được demo

---

## DEC-008 — Audit every agent action

**Status:** Accepted
**Date:** 2026-07-17
**Owner:** Security Lead

### Decision

Mọi tool call, agent decision, và human approval được record trong `audit_events` table với actor, tool, input hash, output hash, rule version, confidence, và timestamp. Audit log export được dưới dạng JSON hoặc CSV.

### Rationale

Banking operation yêu cầu full traceability. Audit log là bằng chứng pháp lý và operational rằng decision được đưa ra đúng.

### Affected areas

- `03-engineering/06-security.md`
- `03-engineering/02-data-models.md` (audit_events table)
- `05-domain/05-compliance.md`

### Rejected alternatives

- **Log ra file:** Không queryable; khó export và verify.
- **Application-level logging only:** Không có structured schema; không auditable.

### Verification

- Mọi tool call có audit_event record tương ứng
- Audit log export produce JSON/CSV hợp lệ

---

## DEC-009 — Dynamic QR for payment intent

**Status:** Accepted
**Date:** 2026-07-17
**Owner:** Tech Lead

### Decision

Mỗi payment tạo payment intent với reference duy nhất và dynamic QR code pre-fill amount và reference. QR hết hạn sau 15 phút. Bank webhook match giao dịch với order qua reference.

### Rationale

Static QR code gây mơ hồ khi nhiều khách hàng thanh toán cùng số tiền cùng lúc. Dynamic QR với reference đảm bảo deterministic matching.

### Affected areas

- `02-requirements/04-functional-requirements.md`
- `03-engineering/02-data-models.md` (payment_intents table)
- `03-engineering/05-integration.md` (SePay/SHB webhook)

### Rejected alternatives

- **Static QR:** Mơ hồ; không phân biệt được thanh toán cùng số tiền.
- **Nhập reference thủ công:** Dễ sai; khách hàng thường bỏ qua.

### Verification

- QR chứa amount và reference
- Webhook với reference auto-match đúng order

---

## DEC-010 — Vietnamese as primary product language, English for documentation

**Status:** Accepted
**Date:** 2026-07-17
**Owner:** Project Lead

### Decision

Product UI, AI message, và nội dung merchant-facing bằng tiếng Việt. Tài liệu bằng tiếng Anh với domain term tiếng Việt trong `05-domain/04-glossary.md`.

### Rationale

User là nhân viên SHB và merchant Việt Nam. Tài liệu bằng tiếng Anh cho phép broader team collaboration. Domain term (hóa đơn, đối soát, kê khai) giữ tiếng Việt với giải thích tiếng Anh.

### Affected areas

- `01-foundation/01-overview.md`
- `05-domain/04-glossary.md`
- `04-delivery/03-design.md`

### Verification

- UI text bằng tiếng Việt
- AI-generated merchant message bằng tiếng Việt
- 05-domain/04-glossary.md cover mọi domain term tiếng Việt dùng trong docs

---

*Last updated: 2026-07-17*
