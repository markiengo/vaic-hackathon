# TaxLens — API Reference

Base URL: `http://127.0.0.1:8000/api/v1`

Interactive docs available at `/docs` (Swagger UI) and `/redoc` (ReDoc).

---

## Authentication

### POST /auth/login
Login with email/password. Returns access + refresh tokens.

**Request:**
```json
{ "email": "huong.salonhoa@gmail.com", "password": "TaxLensDemo!2026" }
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Errors:** ERR-AUTH-001 (invalid credentials)

### POST /auth/refresh
Refresh access token using refresh token.

### GET /auth/me
Get current authenticated user.

**Response (200):**
```json
{
  "id": "U005",
  "name": "Nguyễn Thị Hương",
  "email": "huong.salonhoa@gmail.com",
  "role": "merchant",
  "merchant_id": "M001",
  "onboarding_completed": false
}
```

### POST /auth/me/onboarding
Complete first-run onboarding for the current user.

---

## Merchants

### GET /merchants
List all merchants. Query params: `status`.

### GET /merchants/{id}
Get merchant by ID. Errors: ERR-MERCHANT-001

### GET /merchants/{id}/dashboard
Get merchant dashboard data. Query params: `period` (YYYY-MM).

### GET /merchants/portfolio
Get portfolio summary (SHB Operations only).

---

## Transactions

### GET /transactions
List bank transactions. Query params: `merchant_id`, `period`, `status` (matched|unmatched|pending|all).

---

## Sales

### GET /sales
List sales. Query params: `merchant_id`, `period`.

---

## POS

### GET /pos/context
Get POS context (stores, products, active cash session). Query: `merchant_id`.

### POST /pos/sale
Create a new sale.

### POST /pos/payment-intent
Create a QR payment intent for a sale.

### POST /pos/cash-payment
Record a cash payment for a sale.

### POST /pos/cash-session/open
Open a cash session.

### POST /pos/cash-session/close
Close a cash session with counted cash and discrepancy reason.

### GET /pos/cash-session
Get active cash session. Query: `store_id`.

### GET /pos/products
List products for POS. Query: `merchant_id`.

---

## Reconciliation

### POST /reconciliation/start
Start reconciliation for a merchant + period. Returns 202 (async).

**Request:**
```json
{ "merchant_id": "M001", "period": "2026-07" }
```

**Errors:** ERR-RECON-001 (already running), ERR-RECON-002 (no transactions)

### GET /reconciliation/result/{case_id}
Get reconciliation result for a case.

### GET /reconciliation/exceptions
List exceptions. Query: `merchant_id`, `period`, `status` (PENDING|RESOLVED|DISMISSED).

### POST /reconciliation/exceptions/{id}/resolve
Resolve an exception.

**Request:**
```json
{
  "decision": "approved",
  "sale_id": "ORDER-1850",
  "classification": "revenue",
  "note": "SHB Ops approved the recorded proposal."
}
```

---

## Cases

### GET /cases
List reconciliation cases. Query: `merchant_id`, `period`, `status`.

### GET /cases/{id}
Get case detail with exceptions.

### POST /cases/support
Merchant escalates to SHB.

### POST /cases/{id}/draft-message
Draft a Vietnamese message to the merchant.

### POST /cases/{id}/assign
Assign a case to a relationship manager.

---

## Tax

### GET /tax/readiness
Get tax readiness checklist. Query: `merchant_id`, `period`.

### GET /tax/export
Export tax draft. Query: `merchant_id`, `period`, `format` (json|csv).

### GET /tax/rules
List tax rule versions.

### POST /tax/rules/activate
Activate a tax rule version (compliance role only).

---

## Invoices

### GET /invoices
List invoices. Query: `merchant_id`, `period`, `status`.

### POST /invoices/link
Link an invoice to a sale.

### POST /invoices/mark-exempt
Mark a sale as invoice-exempt.

---

## Agents

### POST /agents/run
Start an agent run.

**Request:**
```json
{
  "merchant_id": "M001",
  "request": "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa",
  "period": "2026-07"
}
```

**Response (202):**
```json
{ "run_id": "RUN-001", "status": "PLANNING" }
```

### GET /agents/runs
List agent runs. Query: `merchant_id`, `limit`.

### GET /agents/runs/{run_id}
Get agent run status and plan.

### GET /agents/runs/{run_id}/trace
Get full agent execution trace (planner steps, specialist outputs, tool calls).

### POST /agents/actions/{action_id}/decision
Approve or reject a proposed agent action.

### POST /agents/actions/{action_id}/execute
Execute an approved agent action.

---

## Audit

### GET /audit
Export audit events. Query: `merchant_id`, `period`, `format` (json|csv), `limit`.
Roles: admin, compliance, rm. Errors: ERR-AUTH-003

---

## Notifications

### GET /notifications
List notifications for current user. Query: `unread_only`, `limit`.

### POST /notifications/{id}/read
Mark a notification as read.

### POST /notifications/read-all
Mark all notifications as read.

---

## Demo

### POST /demo/reset
Reset demo data to deterministic seed state. Requires authentication.

**Response:**
```json
{
  "status": "ok",
  "summary": {
    "merchants": 9,
    "users": 5,
    "sales": 30,
    "transactions": 23,
    ...
  }
}
```

---

## Webhooks

### POST /webhooks/sepay
SePay payment webhook. Header: `X-Webhook-Api-Key`.

Idempotent: duplicate webhook calls do not create duplicate transactions.

---

## WebSocket

### WS /ws/agent-trace/{run_id}
Real-time agent execution trace stream. Sends JSON events as the agent progresses.

---

## Error Format

All errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "ERR-AUTH-001",
    "message": "Email hoặc mật khẩu không đúng",
    "details": {}
  }
}
```
