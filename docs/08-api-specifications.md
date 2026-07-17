# API Specifications — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** All HTTP API endpoints
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Base URL and authentication

- **Base URL (dev):** `http://localhost:8000/api/v1`
- **Auth:** JWT Bearer token in `Authorization` header
- **Content-Type:** `application/json`
- **WebSocket:** `ws://localhost:8000/ws/agent-trace/{run_id}`

See `11-security.md` for authentication details.

## Endpoint groups

### Merchants

#### API-MERCHANT-GET-001: Get merchant profile

- **Method:** `GET`
- **Path:** `/merchants/{merchant_id}`
- **Traces to:** FR-AGENT-001
- **Response 200:**
```json
{
  "id": "M001",
  "name": "Salon Hoa",
  "business_type": "salon",
  "business_category": "beauty_services",
  "tax_id": "01A1234567",
  "status": "ACTIVE"
}
```
- **Errors:** `ERR-MERCHANT-001` (404), `ERR-AUTH-003` (403)

---

#### API-MERCHANT-GET-002: Get merchant dashboard

- **Method:** `GET`
- **Path:** `/merchants/{merchant_id}/dashboard?period={YYYY-MM}`
- **Traces to:** FR-RECON-003, FR-TAX-001
- **Response 200:**
```json
{
  "merchant_id": "M001",
  "period": "2026-07",
  "total_transactions": 30,
  "reconciled_count": 25,
  "reconciliation_rate": 0.83,
  "exception_count": 5,
  "missing_invoice_count": 2,
  "unclassified_count": 3,
  "tax_readiness": {
    "bank_reconciliation": 0.98,
    "cash_session_closure": 1.0,
    "unclassified_transactions": 3,
    "missing_invoices": 2,
    "rule_version": "2026.07",
    "ready": false
  },
  "active_agents": [
    {"agent_name": "reconciliation", "status": "EXECUTING", "run_id": "RUN-001"}
  ]
}
```
- **Errors:** `ERR-MERCHANT-001` (404), `ERR-AUTH-003` (403)

---

### Transactions

#### API-TX-GET-001: List bank transactions

- **Method:** `GET`
- **Path:** `/merchants/{merchant_id}/transactions?period={YYYY-MM}&status={matched|unmatched|all}`
- **Traces to:** FR-DATA-001
- **Response 200:**
```json
{
  "transactions": [
    {
      "id": "SHB-902194810",
      "amount": 350000,
      "sender_name": "Nguyen Van A",
      "raw_note": "PAY-A8F21X",
      "normalized_note": "PAY-A8F21X",
      "ai_interpretation": null,
      "transaction_date": "2026-07-15T10:30:00Z",
      "match_status": "matched",
      "matched_sale_id": "ORDER-1842"
    }
  ],
  "total": 30
}
```
- **Errors:** `ERR-MERCHANT-001` (404), `ERR-AUTH-003` (403)

---

### Reconciliation

#### API-RECON-POST-001: Start reconciliation

- **Method:** `POST`
- **Path:** `/merchants/{merchant_id}/reconcile`
- **Traces to:** FR-RECON-001, FR-RECON-002, FR-AGENT-001
- **Request body:**
```json
{
  "period": "2026-07",
  "request_text": "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa"
}
```
- **Response 202:**
```json
{
  "run_id": "RUN-001",
  "status": "PLANNING",
  "plan": {
    "steps": [
      {"step": 1, "action": "get_merchant_profile", "agent": "merchant_ops"},
      {"step": 2, "action": "get_bank_transactions", "agent": "reconciliation"},
      {"step": 3, "action": "reconcile", "agent": "reconciliation"},
      {"step": 4, "action": "validate_tax_rules", "agent": "tax_compliance"},
      {"step": 5, "action": "create_cases", "agent": "merchant_ops"}
    ]
  }
}
```
- **Errors:** `ERR-MERCHANT-001` (404), `ERR-AUTH-003` (403), `ERR-RECON-001` (409 — already running)

---

#### API-RECON-GET-001: Get reconciliation result

- **Method:** `GET`
- **Path:** `/reconciliation/{run_id}`
- **Traces to:** FR-RECON-001, FR-AGENT-002
- **Response 200:**
```json
{
  "run_id": "RUN-001",
  "status": "COMPLETED",
  "matched": 25,
  "unmatched": 5,
  "duplicate_candidates": 0,
  "missing_invoice_cases": 2,
  "exceptions": [
    {
      "id": 1,
      "exception_type": "AMBIGUOUS_MATCH",
      "amount": 5000000,
      "sender_name": "Nguyen Van A",
      "raw_note": "ck cho em",
      "ai_suggestion": {
        "suggested_type": "internal_transfer",
        "confidence": 0.82,
        "reasoning": [
          "Sender name matches merchant owner",
          "No matching order for amount",
          "Pattern matches 3 prior internal transfers"
        ]
      },
      "status": "PENDING"
    }
  ],
  "tax_readiness": {
    "rule_version": "2026.07",
    "ready": false
  }
}
```
- **Errors:** `ERR-RUN-001` (404)

---

#### API-RECON-POST-002: Resolve exception

- **Method:** `POST`
- **Path:** `/exceptions/{exception_id}/resolve`
- **Traces to:** FR-RECON-003
- **Request body:**
```json
{
  "decision": "approved",
  "classification": "internal_transfer",
  "note": "Confirmed with merchant"
}
```
- **Response 200:**
```json
{
  "exception_id": 1,
  "status": "RESOLVED",
  "human_decision": "approved",
  "human_decision_by": "U001",
  "human_decision_at": "2026-07-17T14:30:00Z"
}
```
- **Errors:** `ERR-EXCEPTION-001` (404), `ERR-AUTH-003` (403)

---

### Tax

#### API-TAX-GET-001: Get tax-readiness report

- **Method:** `GET`
- **Path:** `/merchants/{merchant_id}/tax-readiness?period={YYYY-MM}`
- **Traces to:** FR-TAX-001, FR-TAX-002
- **Response 200:**
```json
{
  "merchant_id": "M001",
  "period": "2026-07",
  "rule_version": "2026.07",
  "effective_from": "2026-07-01",
  "legal_source": "Thông tư 40/2021/TT-BTC",
  "approved_by": "compliance_lead",
  "generated_at": "2026-07-17T15:00:00Z",
  "checklist": [
    {"item": "bank_reconciliation", "value": 0.98, "threshold": 0.95, "pass": true},
    {"item": "cash_session_closure", "value": 1.0, "threshold": 1.0, "pass": true},
    {"item": "unclassified_transactions", "value": 3, "threshold": 0, "pass": false},
    {"item": "missing_invoices", "value": 2, "threshold": 0, "pass": false}
  ],
  "ready": false
}
```
- **Errors:** `ERR-MERCHANT-001` (404), `ERR-TAX-001` (404 — rule version not found)

---

#### API-TAX-POST-001: Export draft data

- **Method:** `POST`
- **Path:** `/merchants/{merchant_id}/export`
- **Traces to:** FR-TAX-004
- **Request body:**
```json
{
  "period": "2026-07",
  "format": "json"
}
```
- **Response 200:** (JSON export content)
- **Response 400:** `ERR-TAX-002` (data not ready — unresolved exceptions)
- **Errors:** `ERR-MERCHANT-001` (404), `ERR-AUTH-003` (403)

---

### Cases

#### API-CASE-GET-001: List cases

- **Method:** `GET`
- **Path:** `/cases?merchant_id={id}&status={status}`
- **Traces to:** FR-OPS-001
- **Response 200:**
```json
{
  "cases": [
    {
      "id": "CASE-001",
      "merchant_id": "M001",
      "period": "2026-07",
      "status": "WAITING_FOR_CONFIRMATION",
      "priority": "HIGH",
      "assigned_rm_id": "U002",
      "exception_count": 5
    }
  ]
}
```

---

#### API-CASE-POST-001: Assign RM

- **Method:** `POST`
- **Path:** `/cases/{case_id}/assign`
- **Traces to:** FR-OPS-003
- **Request body:**
```json
{
  "rm_id": "U002"
}
```
- **Response 200:**
```json
{
  "case_id": "CASE-001",
  "assigned_rm_id": "U002",
  "status": "ASSIGNED"
}
```
- **Errors:** `ERR-CASE-001` (404), `ERR-AUTH-003` (403)

---

#### API-CASE-POST-002: Draft merchant message

- **Method:** `POST`
- **Path:** `/cases/{case_id}/draft-message`
- **Traces to:** FR-OPS-002
- **Request body:**
```json
{
  "exception_ids": [1, 2]
}
```
- **Response 200:**
```json
{
  "case_id": "CASE-001",
  "message": "Chị Hương thân mến, SHB xin xác nhận khoản chuyển 5.000.000đ từ Nguyễn Văn A ngày 15/07. Khoản này là chuyển nội bộ hay doanh thu salon ạ?",
  "status": "DRAFT"
}
```
- **Errors:** `ERR-CASE-001` (404), `ERR-AUTH-003` (403)

---

### Mini POS

#### API-POS-POST-001: Create sale

- **Method:** `POST`
- **Path:** `/pos/sales`
- **Traces to:** FR-POS-001
- **Request body:**
```json
{
  "merchant_id": "M001",
  "store_id": "S001",
  "device_id": "D001",
  "staff_id": "U003",
  "items": [
    {"product_id": "P001", "product_name": "Cắt tóc", "quantity": 1, "unit_price": 150000}
  ],
  "discount": 0
}
```
- **Response 201:**
```json
{
  "sale_id": "ORDER-1843",
  "gross_amount": 150000,
  "discount": 0,
  "net_amount": 150000,
  "payment_status": "UNPAID",
  "invoice_status": "PENDING"
}
```
- **Errors:** `ERR-POS-001` (400 — invalid data), `ERR-AUTH-003` (403)

---

#### API-POS-POST-002: Create payment intent (Dynamic QR)

- **Method:** `POST`
- **Path:** `/pos/payment-intents`
- **Traces to:** FR-POS-002
- **Request body:**
```json
{
  "sale_id": "ORDER-1843",
  "amount": 150000
}
```
- **Response 201:**
```json
{
  "payment_intent_id": "PAY-X7K92P",
  "amount": 150000,
  "qr_data": "000201010212382300069704220...",
  "expires_at": "2026-07-17T15:15:00Z",
  "status": "PENDING"
}
```
- **Errors:** `ERR-POS-002` (400 — sale already paid), `ERR-POS-003` (404 — sale not found)

---

#### API-POS-POST-003: Record cash payment

- **Method:** `POST`
- **Path:** `/pos/cash-payments`
- **Traces to:** FR-POS-003
- **Request body:**
```json
{
  "sale_id": "ORDER-1843",
  "amount": 150000,
  "store_id": "S001",
  "staff_id": "U003"
}
```
- **Response 200:**
```json
{
  "sale_id": "ORDER-1843",
  "payment_status": "PAID",
  "cash_session_id": 5
}
```
- **Errors:** `ERR-POS-001` (400), `ERR-POS-003` (404)

---

#### API-POS-POST-004: Close cash session

- **Method:** `POST`
- **Path:** `/pos/cash-sessions/{session_id}/close`
- **Traces to:** FR-POS-004
- **Request body:**
```json
{
  "counted_cash": 5080000,
  "discrepancy_reason": null
}
```
- **Response 200:**
```json
{
  "session_id": 5,
  "opening_cash": 1000000,
  "expected_cash": 5200000,
  "counted_cash": 5080000,
  "discrepancy": -120000,
  "status": "RECONCILED"
}
```
- **Errors:** `ERR-POS-004` (404 — session not found)

---

### Agents

#### API-AGENT-POST-001: Start agent run

- **Method:** `POST`
- **Path:** `/agents/run`
- **Traces to:** FR-AGENT-001
- **Request body:**
```json
{
  "merchant_id": "M001",
  "request_text": "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa"
}
```
- **Response 202:**
```json
{
  "run_id": "RUN-001",
  "status": "PLANNING"
}
```

---

#### API-AGENT-GET-001: Get agent trace

- **Method:** `GET`
- **Path:** `/agents/runs/{run_id}/trace`
- **Traces to:** FR-AGENT-002
- **Response 200:**
```json
{
  "run_id": "RUN-001",
  "status": "COMPLETED",
  "plan": {
    "steps": [
      {"step": 1, "action": "get_merchant_profile", "agent": "merchant_ops", "status": "COMPLETED"},
      {"step": 2, "action": "get_bank_transactions", "agent": "reconciliation", "status": "COMPLETED"}
    ]
  },
  "tool_calls": [
    {
      "agent_name": "reconciliation",
      "tool_name": "get_bank_transactions",
      "input_hash": "a1b2c3...",
      "output_hash": "d4e5f6...",
      "confidence": null,
      "called_at": "2026-07-17T14:01:00Z",
      "duration_ms": 120
    },
    {
      "agent_name": "reconciliation",
      "tool_name": "score_match_candidates",
      "input_hash": "g7h8i9...",
      "output_hash": "j0k1l2...",
      "confidence": 0.82,
      "called_at": "2026-07-17T14:01:02Z",
      "duration_ms": 350
    }
  ]
}
```
- **Errors:** `ERR-RUN-001` (404)

---

### Audit

#### API-AUDIT-GET-001: Export audit log

- **Method:** `GET`
- **Path:** `/audit/export?merchant_id={id}&period={YYYY-MM}&format={json|csv}`
- **Traces to:** FR-AGENT-003
- **Response 200 (JSON):**
```json
{
  "events": [
    {
      "actor_type": "agent",
      "actor_id": "reconciliation",
      "agent_name": "reconciliation",
      "action": "tool_call",
      "tool_name": "score_match_candidates",
      "input_hash": "g7h8i9...",
      "output_hash": "j0k1l2...",
      "confidence": 0.82,
      "timestamp": "2026-07-17T14:01:02Z"
    }
  ]
}
```
- **Response 200 (CSV):** CSV file download
- **Errors:** `ERR-AUTH-003` (403 — requires compliance/admin role)

---

### Merchant Confirmation

#### API-MERCHANT-GET-001: Get confirmation request

- **Method:** `GET`
- **Path:** `/confirm/{token}`
- **Traces to:** FR-MERCHANT-001
- **Auth:** None (token-based)
- **Response 200:**
```json
{
  "amount": 5000000,
  "sender_name": "Nguyen Van A",
  "date": "2026-07-15",
  "ai_suggestion": "internal_transfer",
  "confidence": 0.82,
  "options": ["internal_transfer", "revenue", "loan", "other"]
}
```
- **Errors:** `ERR-TOKEN-001` (404 — token not found), `ERR-TOKEN-002` (410 — token expired)

---

#### API-MERCHANT-POST-001: Submit confirmation

- **Method:** `POST`
- **Path:** `/confirm/{token}`
- **Traces to:** FR-MERCHANT-001
- **Auth:** None (token-based)
- **Request body:**
```json
{
  "classification": "internal_transfer"
}
```
- **Response 200:**
```json
{
  "status": "CONFIRMED",
  "exception_id": 1
}
```
- **Errors:** `ERR-TOKEN-001` (404), `ERR-TOKEN-002` (410)

---

### Webhooks

#### API-WEBHOOK-POST-001: SePay/SHB transaction webhook

- **Method:** `POST`
- **Path:** `/webhooks/sepay`
- **Traces to:** FR-POS-002, FR-DATA-001
- **Auth:** Webhook signature verification
- **Request body:** (SePay format — varies by provider)
- **Response 200:**
```json
{
  "received": true,
  "matched": true,
  "sale_id": "ORDER-1843"
}
```
- **Idempotency:** Webhook deduplicated by transaction ID
- **Errors:** `ERR-WEBHOOK-001` (400 — invalid signature)

---

## Rate limiting

See `05-non-functional-requirements.md` NFR-LIMIT-003. Default: 100 requests/minute per user.

## Verification

### Automated

- `cd backend && python -m pytest tests/test_api/ -v` — API endpoint tests
- OpenAPI spec validation against route definitions

### Manual

- Start backend → call each endpoint with valid and invalid inputs
- Verify error responses match error IDs from `12-error-codes.md`

---

*Last updated: 2026-07-17*
