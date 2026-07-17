# Glossary — TaxLens

> **Status:** Canonical
> **Authority:** Informative
> **Owner:** PM
> **Applies to:** Toàn bộ tài liệu TaxLens
> **Implementation state:** Current
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Định nghĩa thuật ngữ (thứ tự alphabet)

| Thuật ngữ | Định nghĩa |
|---|---|
| Adapter | Module convert data từ external source (SHB, SePay, POS, CSV) sang Canonical Event Ledger schema |
| Agent | Component AI-powered với role cụ thể, tool allowlist, và output schema |
| Agent run | Một lần thực thi multi-agent workflow, tracked trong agent_runs table |
| Agent trace | Timeline trực quan hiển thị planner decomposition, agent assignments, tool calls, và decisions |
| Allocation | Việc gán payment amount cho một hoặc nhiều orders qua payment_allocations |
| Audit event | Record append-only của agent hoặc human action, stored trong audit_events |
| Canonical Event Ledger | Database schema unified mà tất cả source data được normalize vào |
| Candidate matching | Matching probabilistic transactions với orders dùng weighted scoring factors |
| Cash session | Record per-store, per-shift của cash transactions với opening, expected, và counted amounts |
| Case | Workflow item structured cho unresolved exceptions, tracked trong reconciliation_cases |
| Confidence score | Giá trị 0.0–1.0 chỉ độ chắc chắn của AI về một suggestion |
| Đối soát | Reconciliation — quá trình match transactions với orders |
| Dynamic QR | QR code generated per payment intent chứa amount và payment reference |
| Exception | Transaction hoặc order cần human decision, hiển thị trong Exception Inbox |
| Exact matching | Matching deterministic dùng payment reference, amount, và order status |
| Hóa đơn | Invoice — electronic tax invoice issued cho một sale |
| Hộ kinh doanh | Household business — loại đăng ký kinh doanh Việt Nam cho small businesses |
| Kê khai | Tax declaration/filing — quá trình submit tax reports |
| Match score | Weighted score (0–100) cho candidate matching, computed từ nhiều factors |
| Mini POS | POS interface tối giản để tạo sales và generate QR codes |
| MCP | Model Context Protocol — standard cho connecting AI systems với external tools |
| Payment intent | Record của expected payment với unique reference, amount, và expiry |
| Payment reference | Unique code system-generated (e.g., PAY-A8F21X) link orders với bank transactions |
| Planner Agent | Agent phân tách requests và delegate cho specialist agents |
| Reconciliation | Quá trình match bank transactions, cash, và invoices với sales orders |
| Reconciliation Agent | Specialist agent chịu trách nhiệm matching và exception creation |
| RM | Relationship Manager — SHB staff quản lý merchant relationships |
| Rule version | Versioned set của tax rules (e.g., 2026.07), immutable một khi approved |
| SHB | Saigon-Hanoi Bank — bank partner cho TaxLens |
| Specialist agent | Một trong ba agents: Reconciliation, Tax & Compliance, hoặc Merchant Operations |
| Tax-readiness | Trạng thái tất cả data complete, consistent, và sẵn sàng cho tax process |
| Tax-readiness report | Report hiển thị checklist items với pass/fail status và rule version |
| Tax Rules Engine | Service deterministic validate data theo versioned tax rules |
| Three-layer note handling | Store raw_note, normalized_note, và ai_interpretation separately |
| Tool allowlist | Set tools mà agent được phép call; enforced tại tool layer |
| Tool call | Một lần invocation của tool bởi agent, logged trong tool_calls table |

## Acronyms và abbreviations

| Acronym | Expansion |
|---|---|
| COD | Cash on Delivery |
| CSV | Comma-Separated Values |
| JWT | JSON Web Token |
| MCP | Model Context Protocol |
| NFR | Non-Functional Requirement |
| ORM | Object-Relational Mapping |
| POS | Point of Sale |
| QR | Quick Response (code) |
| RBAC | Role-Based Access Control |
| RM | Relationship Manager |
| RLS | Row-Level Security |
| SHB | Saigon-Hanoi Bank (Ngân hàng Sài Gòn – Hà Nội) |
| SSR | Server-Side Rendering |
| TLS | Transport Layer Security |
| TDE | Transparent Data Encryption |
| VPC | Virtual Private Cloud |

## Concept domain-specific với examples

### Payment reference linkage

```text
POS order_id:        ORDER-1842
    ↓ create payment intent
Payment reference:   PAY-A8F21X
    ↓ embed in dynamic QR
Customer transfers money
    ↓ webhook receives note with PAY-A8F21X
Bank transaction_id: SHB-902194810
```

Cả ba IDs được stored và linked qua `payment_reference`.

### Three-layer note handling

```json
{
  "raw_note": "nhap hang 20/10",
  "normalized_note": "nhập hàng 20/10",
  "ai_interpretation": {
    "suggested_type": "purchase_payment",
    "probable_date": "20/10",
    "confidence": 0.62
  }
}
```

### Match scoring example

```text
Transaction: 350,000₫, không reference, 2 minutes sau order

Score:
  Amount match:        +50
  Time <5 min:         +10
  No reference:         +0
  Familiar sender:      +0
  No same-amount:       +0
  ────────────────────────
  Total:               60 → UNMATCHED (<75)
```

## Verification

### Automated

- `grep -r "đối soát\|hóa đơn\|kê khai\|hộ kinh doanh" docs/` — kiểm tra Vietnamese terms có trong glossary

### Manual

- Review glossary với team — mỗi term dùng trong docs được định nghĩa
- Kiểm tra definitions concise (1-2 câu)

---

*Last updated: 2026-07-17*
