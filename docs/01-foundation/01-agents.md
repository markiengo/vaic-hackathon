# AI Agents Overview — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** 4 AI agents trong TaxLens
> **Implementation state:** Partial — agent scaffolding and prompts implemented; specialist nodes are stubs
> **Last verified against code:** 2026-07-17
> **Detailed spec:** `05-domain/01-ai-advisor.md` (tools, schemas, prompts, error handling)

---

## Kiến trúc tổng quan

TaxLens dùng **4 AI agent** phối hợp qua LangGraph. Planner nhận yêu cầu, phân tách thành task, delegate cho 3 specialist agent. Mỗi agent có tool allowlist riêng và không thể gọi tool ngoài scope.

```text
User request (natural language)
        │
        ▼
  ┌─────────────┐
  │   Planner   │  ← Phân tách task, delegate
  └──────┬──────┘
         │
    ┌────┼────────────┬─────────────────┐
    ▼    ▼            ▼                 ▼
┌───────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐
│ Recon │ │ Tax &    │ │ Merchant   │ │  (kết quả    │
│ Agent │ │ Compl.   │ │ Ops Agent   │ │  trả về      │
│       │ │ Agent    │ │             │ │  Planner)    │
└───────┘ └──────────┘ └────────────┘ └──────────────┘
```

---

## 1. Planner Agent

**Vai trò:** Nhận yêu cầu natural language từ user, phân tách thành multi-step plan, delegate từng step cho specialist agent phù hợp.

**Ví dụ:**
- User: "Đối soát tháng 7 cho Salon Hoa, kiểm tra sẵn sàng thuế"
- Planner tạo plan: Step 1 → Reconciliation Agent (đối soát), Step 2 → Tax & Compliance Agent (tax-readiness), Step 3 → Merchant Ops Agent (tạo case nếu có ngoại lệ)

**Không làm:**
- Không gọi tool trực tiếp
- Không match transaction
- Không tính tax

**LLM:** DeepSeek V4 Flash với thinking mode (cần reasoning cho task decomposition)

---

## 2. Reconciliation Agent

**Vai trò:** Đối soát giao dịch ngân hàng với đơn hàng POS, tiền mặt, và hóa đơn. Tự động match giao dịch có reference, tạo exception cho giao dịch mơ hồ.

**Ví dụ:**
- Match `SEPAY-123` (500k, ref "PAY-A8F21X") với `SALE-045` (500k, unpaid) → auto-match (confidence 100%)
- Match `SEPAY-124` (300k, no ref) với 2 sales cùng amount → candidate scoring → confidence 78% → human confirm
- Phát hiện `SEPAY-125` là chuyển khoản nội bộ (non-revenue) → skip

**Tools:** `get_bank_transactions`, `get_sales_orders`, `get_cash_sessions`, `get_invoices`, `find_payment_reference`, `score_match_candidates`, `create_reconciliation_exception`

**Không làm:**
- Không auto-resolve giao dịch confidence < 95%
- Không tính tax
- Không gửi message cho merchant

---

## 3. Tax & Compliance Agent

**Vai trò:** Validate dữ liệu theo tax rules, generate tax-readiness report, kiểm tra thiếu hóa đơn, classify revenue category.

**Ví dụ:**
- Kiểm tra 30 sales → 28 có hóa đơn, 2 thiếu → flag missing invoices
- Validate rule version 2026.07 (APPROVED, effective 2021-07-01)
- Classify "cắt tóc" → beauty_services → VAT 5%
- Generate checklist: 28/30 hóa đơn ✓, cash session balanced ✓, 2 missing invoices ✗

**Tools:** `retrieve_tax_rules`, `validate_rule_version`, `classify_revenue_category`, `check_required_fields`, `generate_tax_readiness_report`, `create_draft_export`

**Không làm:**
- Không tính tax formula (deterministic engine làm)
- Không sửa tax rules
- Không submit filing

---

## 4. Merchant Operations Agent

**Vai trò:** Biến kết quả phân tích thành hành động: tạo case, assign RM, draft message cho merchant, export dữ liệu.

**Ví dụ:**
- 2 ngoại lệ chưa match → tạo CASE-001, assign cho RM (Phong)
- Draft SMS cho Hương: "Salon Hoa có 2 giao dịch cần xác nhận, vui lòng kiểm tra tại [link]"
- Export reconciliation report dạng JSON cho hệ thống kế toán

**Tools:** `create_case`, `assign_task_to_rm`, `draft_merchant_message`, `send_confirmation_request`, `update_case_status`, `export_to_accounting_system`

**Không làm:**
- Không gửi message mà không có RM review
- Không match transaction
- Không tính tax

---

## Agent interaction flow

```text
1. User gửi request → Planner tạo plan
2. Planner delegate → Reconciliation Agent chạy
   - Match transactions, tạo exceptions
3. Planner delegate → Tax & Compliance Agent chạy
   - Validate tax rules, generate report
4. Planner delegate → Merchant Ops Agent chạy
   - Tạo cases, draft messages, export
5. Nếu có WAITING_FOR_HUMAN → user approve/reject
6. Planner tổng hợp kết quả → trả về user
```

## State machine

Mỗi agent run đi qua state machine:

```text
PENDING → PLANNING → EXECUTING → WAITING_FOR_HUMAN → COMPLETED
                                         ↘ FAILED
```

## Key boundaries

| Rule | Lý do |
|---|---|
| AI không tính tax | Phải deterministic, auditable (DEC-004) |
| AI không auto-resolve confidence < 95% | Cần human approval (DEC-005) |
| AI không gọi tool ngoài allowlist | Security boundary (SEC-RBAC-003) |
| AI không gửi unmasked data cho LLM | Privacy (SEC-MASK-001) |
| Mọi tool call logged trong audit_events | Traceability (DEC-008) |

## Chi tiết kỹ thuật

Xem `05-domain/01-ai-advisor.md` cho:
- Tool contracts (typed function calling schemas)
- System prompts cho từng agent
- Output schemas (Pydantic models)
- Error handling và hallucination prevention
- LLM provider config (DeepSeek + OpenRouter fallback)
- Budget và rate limits
- Evaluation criteria

---

*Last updated: 2026-07-17*
