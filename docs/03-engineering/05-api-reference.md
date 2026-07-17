# API Reference — TaxLens

> **Status:** Canonical | **Authority:** Normative | **Owner:** Tech Lead
> **Consolidates:** API specifications + error codes + SePay webhook integration
> **Last updated:** 2026-07-17

---

## Table of Contents

1. [Base URL & Authentication](#1-base-url--authentication)
2. [Merchants](#2-merchants)
3. [Transactions](#3-transactions)
4. [Reconciliation](#4-reconciliation)
5. [Tax & Compliance](#5-tax--compliance)
6. [Cases](#6-cases)
7. [Mini POS](#7-mini-pos)
8. [Agents](#8-agents)
9. [Audit](#9-audit)
10. [Merchant Confirmation](#10-merchant-confirmation)
11. [Webhooks (SePay)](#11-webhooks-sepay)
12. [WebSocket](#12-websocket)
13. [Error Codes](#13-error-codes)
14. [Rate Limiting](#14-rate-limiting)

---

## 1. Base URL & Authentication

- **Base URL (dev):** `http://localhost:8000/api/v1`
- **Auth:** JWT Bearer token in `Authorization` header
- **Content-Type:** `application/json`
- **WebSocket:** `ws://localhost:8000/ws/transactions` (real-time transaction notifications; agent-trace WS is target spec)

See `docs/03-engineering/04-security-and-permissions.md` for authentication details.

---

## 2. Merchants

### API-MERCHANT-GET-001: Get merchant profile

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

### API-MERCHANT-GET-002: Get merchant dashboard

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

## 3. Transactions

### API-TX-GET-001: List bank transactions

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

## 4. Reconciliation

### API-RECON-POST-001: Start reconciliation

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
- **Errors:** `ERR-MERCHANT-001` (404), `ERR-AUTH-003` (403), `ERR-RECON-001` (409 — đang chạy)

### API-RECON-GET-001: Get reconciliation results

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

### API-RECON-POST-002: Resolve exception

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

## 5. Tax & Compliance

### API-TAX-GET-001: Get tax-readiness report

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
- **Errors:** `ERR-MERCHANT-001` (404), `ERR-TAX-001` (404 — không tìm thấy rule version)

### API-TAX-POST-001: Export draft data

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
- **Response 200:** (export JSON content)
- **Response 400:** `ERR-TAX-002` (dữ liệu chưa sẵn sàng — ngoại lệ chưa giải quyết)
- **Errors:** `ERR-MERCHANT-001` (404), `ERR-AUTH-003` (403)

---

## 6. Cases

### API-CASE-GET-001: List cases

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

### API-CASE-POST-001: Assign RM

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

### API-CASE-POST-002: Draft merchant message

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

## 7. Mini POS

### API-POS-POST-001: Create sale

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
- **Errors:** `ERR-POS-001` (400 — dữ liệu không hợp lệ), `ERR-AUTH-003` (403)

### API-POS-POST-002: Create payment intent (Dynamic QR)

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
- **Errors:** `ERR-POS-002` (400 — sale đã thanh toán), `ERR-POS-003` (404 — không tìm thấy sale)

### API-POS-POST-003: Record cash payment

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

### API-POS-POST-004: Close cash session

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
- **Errors:** `ERR-POS-004` (404 — không tìm thấy session)

---

## 8. Agents

### API-AGENT-POST-001: Start agent run

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

### API-AGENT-GET-001: Get agent trace

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

## 9. Audit

### API-AUDIT-GET-001: Export audit log

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
- **Response 200 (CSV):** File download
- **Errors:** `ERR-AUTH-003` (403 — yêu cầu role compliance/admin)

---

## 10. Merchant Confirmation

### API-MERCHANT-GET-001: Get confirmation request

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
- **Errors:** `ERR-TOKEN-001` (404 — không tìm thấy token), `ERR-TOKEN-002` (410 — token hết hạn)

### API-MERCHANT-POST-001: Submit confirmation

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

## 11. Webhooks (SePay)

### API-WEBHOOK-POST-001: SePay webhook (bank transaction notification)

- **Method:** `POST`
- **Path:** `/webhooks/sepay?merchant_id={merchant_id}`
- **Traces to:** FR-POS-002, FR-DATA-001
- **Auth:** `Authorization: Apikey API_KEY` header (verify với `SEPAY_WEBHOOK_API_KEY`)
- **Request body (SePay webhook format):**
```json
{
  "id": 92704,
  "gateway": "SHB",
  "transactionDate": "2023-03-25 14:02:37",
  "accountNumber": "0123499999",
  "code": null,
  "content": "chuyen tien mua iphone",
  "transferType": "in",
  "transferAmount": 2277000,
  "accumulated": 19077000,
  "subAccount": null,
  "referenceCode": "208V009252001511",
  "description": ""
}
```
- **Response 200/201 (SePay requires):**
```json
{
  "success": true
}
```
- **Idempotency:** Deduplicate by SePay `id` — check if `source_id = SEPAY-{id}` already exists
- **Processing:** Return 200 within 8s (SePay read timeout); matching processed async via Redis queue
- **Retry:** SePay retries up to 7 times (Fibonacci intervals, 5h max) if response is not 200/201
- **Errors:** `ERR-WEBHOOK-001` (401 — invalid API key)

### SePay payload field reference

| Field | Description |
|---|---|
| `id` | Unique transaction ID (used for dedup, canonical ID = `SEPAY-{id}`) |
| `gateway` | Bank name |
| `transactionDate` | `yyyy-mm-dd HH:MM:SS` |
| `accountNumber` | Receiving bank account |
| `content` | Transfer note / memo |
| `transferType` | `in` or `out` |
| `transferAmount` | Amount in VND |
| `referenceCode` | Bank reference code |
| `accumulated` | Running balance after transaction |

### SePay webhook setup

1. **Environment variables** in `backend/.env`:
```env
SEPAY_API_URL=https://my.sepay.vn/userapi
SEPAY_API_TOKEN=your_sepay_api_token
SEPAY_WEBHOOK_API_KEY=your_webhook_api_key_from_sepay
```

2. **Configure webhook in SePay:**
   - Go to **my.sepay.vn** → **Webhooks** → **+ Add**
   - Name: `TaxLens`
   - Event: `Tiền vào` (or `Tất cả`)
   - URL: `https://<your-tunnel-url>/api/v1/webhooks/sepay?merchant_id=M001`
   - Security: Choose **API Key**, enter a strong key (must match `SEPAY_WEBHOOK_API_KEY`)

3. **Start tunnel (ngrok recommended):**
```bash
ngrok http 8000
```

4. **Start backend and frontend:**
```bash
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
```

5. **Test:**
   - Option A: SePay "Gửi thử" button sends sample payload
   - Option B: Real transfer to connected bank account
   - Option C: Manual POST (see `docs/sepay.md` for PowerShell example)

### SePay security notes

- Webhook requires `Authorization: Apikey <key>` header
- `.env` is in `.gitignore` — never commit
- SePay webhook IPs (for firewall whitelist): `172.236.138.20`, `172.233.83.68`, `171.244.35.2`, `151.158.108.68`, `151.158.109.79`, `103.255.238.139`
- Duplicate transactions handled: backend checks if `SEPAY-{id}` already exists before inserting

### SePay troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| 401 Unauthorized | API key mismatch | Ensure `.env` key matches SePay webhook config |
| 511 status | Localtunnel interstitial page | Switch to ngrok |
| No popup on frontend | WebSocket not connected | Check "Live" badge; ensure backend is running |
| Webhook not firing | Wrong URL in SePay | Ensure URL includes `/api/v1/webhooks/sepay?merchant_id=M001` |
| Duplicate transactions | SePay retry | Already handled — backend deduplicates by `SEPAY-{id}` |
| ngrok closes immediately | Missing authtoken | Run `ngrok config add-authtoken YOUR_TOKEN` |

---

## 12. WebSocket

### Agent trace WebSocket (Target — not yet implemented)

- **URL:** `ws://localhost:8000/ws/agent-trace/{run_id}` (target spec)
- **Purpose:** Real-time agent trace updates during execution
- **Messages:** JSON objects with step status, tool call events, and confidence updates
- **Note:** Not yet implemented in code. Agent trace data is currently available via REST endpoint `GET /api/v1/agents/{merchant_id}/runs/{run_id}`.

### Transaction WebSocket

- **URL:** `ws://localhost:8000/ws/transactions`
- **Purpose:** Real-time transaction notifications (from SePay webhook)
- **Frontend hook:** `frontend/src/hooks/useTransactionSocket.ts`
- **Auto-reconnect:** Yes

### WebSocket files

| File | Purpose |
|---|---|
| `backend/app/core/ws_manager.py` | WebSocket connection manager |
| `backend/app/routers/ws.py` | WebSocket endpoints |
| `frontend/src/hooks/useTransactionSocket.ts` | WebSocket hook with auto-reconnect |
| `frontend/src/components/TransactionToast.tsx` | Toast popup UI component |
| `frontend/src/components/Providers.tsx` | Mounts toast globally |

---

## 13. Error Codes

### Standard error response format

```json
{
  "error": {
    "code": "ERR-XXX-NNN",
    "message": "Human-readable description",
    "details": {}
  }
}
```

### Merchant errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-MERCHANT-001 | 404 | Không tìm thấy merchant | Merchant ID không tồn tại |
| ERR-MERCHANT-002 | 400 | Dữ liệu merchant không hợp lệ | Tạo/cập nhật merchant với field không hợp lệ |

### Authentication errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-AUTH-001 | 401 | Thiếu hoặc token không hợp lệ | Không có Authorization header hoặc JWT không hợp lệ |
| ERR-AUTH-002 | 401 | Token hết hạn | JWT đã hết hạn |
| ERR-AUTH-003 | 403 | Không đủ quyền | User role thiếu permission yêu cầu |

### Reconciliation errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-RECON-001 | 409 | Đối soát đang chạy | Một run khác đang active cho cùng merchant/period |
| ERR-RECON-002 | 422 | Không thể đối soát — không có dữ liệu | Không tìm thấy giao dịch hoặc đơn hàng cho period |

### Run errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-RUN-001 | 404 | Không tìm thấy agent run | Run ID không tồn tại |
| ERR-RUN-002 | 409 | Run không thể sửa đổi | Run đã completed hoặc failed |

### Exception errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-EXCEPTION-001 | 404 | Không tìm thấy exception | Exception ID không tồn tại |
| ERR-EXCEPTION-002 | 409 | Exception đã được giải quyết | Exception đã được resolve bởi user khác |

### Tax errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-TAX-001 | 404 | Không tìm thấy tax rule version | Rule version yêu cầu không tồn tại |
| ERR-TAX-002 | 400 | Dữ liệu chưa sẵn sàng export | Ngoại lệ chưa giải quyết ngăn export |
| ERR-TAX-003 | 422 | Rule version hết hạn | Rule version không còn hiệu lực |

### Case errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-CASE-001 | 404 | Không tìm thấy case | Case ID không tồn tại |
| ERR-CASE-002 | 409 | Case đã đóng | Không thể sửa đổi case đã đóng |

### POS errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-POS-001 | 400 | Dữ liệu sale không hợp lệ | Thiếu field yêu cầu hoặc amount không hợp lệ |
| ERR-POS-002 | 400 | Sale đã thanh toán | Payment intent cho sale đã thanh toán |
| ERR-POS-003 | 404 | Không tìm thấy sale | Sale ID không tồn tại |
| ERR-POS-004 | 404 | Không tìm thấy cash session | Session ID không tồn tại |
| ERR-POS-005 | 409 | Cash session đã đóng | Cố gắng đóng session đã đóng |

### Token errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-TOKEN-001 | 404 | Không tìm thấy token | Confirmation token không tồn tại |
| ERR-TOKEN-002 | 410 | Token hết hạn | Link xác nhận đã hết hạn (7 ngày) |

### Webhook errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-WEBHOOK-001 | 401 | Webhook API key không hợp lệ | SePay API key verification thất bại |
| ERR-WEBHOOK-002 | 422 | Webhook duplicate | Transaction ID đã xử lý |

### General errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-GEN-001 | 400 | Bad request | JSON malformed hoặc thiếu field yêu cầu |
| ERR-GEN-002 | 500 | Internal server error | Exception chưa xử lý |
| ERR-GEN-003 | 503 | Service unavailable | Database hoặc LLM provider unavailable |

### Error-to-endpoint mapping

| Error ID | Used by API endpoints |
|---|---|
| ERR-MERCHANT-001 | API-MERCHANT-GET-001, API-MERCHANT-GET-002, API-TX-GET-001, API-TAX-GET-001, API-TAX-POST-001 |
| ERR-AUTH-001 | All authenticated endpoints |
| ERR-AUTH-003 | All endpoints with role requirements |
| ERR-RECON-001 | API-RECON-POST-001 |
| ERR-RUN-001 | API-RECON-GET-001, API-AGENT-GET-001 |
| ERR-EXCEPTION-001 | API-RECON-POST-002 |
| ERR-TAX-001 | API-TAX-GET-001 |
| ERR-TAX-002 | API-TAX-POST-001 |
| ERR-CASE-001 | API-CASE-GET-001, API-CASE-POST-001, API-CASE-POST-002 |
| ERR-POS-001 | API-POS-POST-001, API-POS-POST-003 |
| ERR-POS-002 | API-POS-POST-002 |
| ERR-POS-003 | API-POS-POST-002, API-POS-POST-003 |
| ERR-POS-004 | API-POS-POST-004 |
| ERR-TOKEN-001 | API-MERCHANT-GET-001, API-MERCHANT-POST-001 |
| ERR-TOKEN-002 | API-MERCHANT-GET-001, API-MERCHANT-POST-001 |
| ERR-WEBHOOK-001 | API-WEBHOOK-POST-001 |

### Implementation pattern

```python
class TaxLensError(Exception):
    def __init__(self, code: str, status_code: int, message: str, details: dict = None):
        self.code = code
        self.status_code = status_code
        self.message = message
        self.details = details or {}

# Usage
raise TaxLensError("ERR-MERCHANT-001", 404, "Merchant not found", {"merchant_id": "M999"})
```

---

## 14. Rate Limiting

See `02-requirements/03-srs.md` §6 NFR-LIMIT-003. Default: 100 requests/minute per user.

---

*Last updated: 2026-07-17*
