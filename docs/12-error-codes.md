# Error Codes — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** All API endpoints
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Standard error response format

```json
{
  "error": {
    "code": "ERR-XXX-NNN",
    "message": "Human-readable description",
    "details": {}
  }
}
```

## Error code catalog

### Merchant errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-MERCHANT-001 | 404 | Merchant not found | Merchant ID does not exist |
| ERR-MERCHANT-002 | 400 | Invalid merchant data | Merchant creation/update with invalid fields |

### Authentication errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-AUTH-001 | 401 | Missing or invalid token | No Authorization header or invalid JWT |
| ERR-AUTH-002 | 401 | Token expired | JWT has expired |
| ERR-AUTH-003 | 403 | Insufficient permissions | User role lacks required permission |

### Reconciliation errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-RECON-001 | 409 | Reconciliation already running | Another run is active for same merchant/period |
| ERR-RECON-002 | 422 | Cannot reconcile — no data | No transactions or sales found for period |

### Run errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-RUN-001 | 404 | Agent run not found | Run ID does not exist |
| ERR-RUN-002 | 409 | Run cannot be modified | Run is already completed or failed |

### Exception errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-EXCEPTION-001 | 404 | Exception not found | Exception ID does not exist |
| ERR-EXCEPTION-002 | 409 | Exception already resolved | Exception has been resolved by another user |

### Tax errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-TAX-001 | 404 | Tax rule version not found | Requested rule version does not exist |
| ERR-TAX-002 | 400 | Data not ready for export | Unresolved exceptions prevent export |
| ERR-TAX-003 | 422 | Rule version expired | Rule version is no longer in effect |

### Case errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-CASE-001 | 404 | Case not found | Case ID does not exist |
| ERR-CASE-002 | 409 | Case already closed | Cannot modify a closed case |

### POS errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-POS-001 | 400 | Invalid sale data | Missing required fields or invalid amounts |
| ERR-POS-002 | 400 | Sale already paid | Payment intent for an already-paid sale |
| ERR-POS-003 | 404 | Sale not found | Sale ID does not exist |
| ERR-POS-004 | 404 | Cash session not found | Session ID does not exist |
| ERR-POS-005 | 409 | Cash session already closed | Attempting to close an already-closed session |

### Token errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-TOKEN-001 | 404 | Token not found | Confirmation token does not exist |
| ERR-TOKEN-002 | 410 | Token expired | Confirmation link has expired (7 days) |

### Webhook errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-WEBHOOK-001 | 400 | Invalid webhook signature | Signature verification failed |
| ERR-WEBHOOK-002 | 422 | Duplicate webhook | Transaction ID already processed |

### General errors

| ID | HTTP Status | Description | When it occurs |
|---|---|---|---|
| ERR-GEN-001 | 400 | Bad request | Malformed JSON or missing required fields |
| ERR-GEN-002 | 500 | Internal server error | Unhandled exception |
| ERR-GEN-003 | 503 | Service unavailable | Database or LLM provider unavailable |

## Implementation pattern

```python
class KHOPError(Exception):
    def __init__(self, code: str, status_code: int, message: str, details: dict = None):
        self.code = code
        self.status_code = status_code
        self.message = message
        self.details = details or {}

# Usage
raise KHOPError("ERR-MERCHANT-001", 404, "Merchant not found", {"merchant_id": "M999"})
```

## Verification

### Automated

- `cd backend && python -m pytest tests/test_errors.py -v` — error handling tests
- Scan code for error code constants: `grep -r "ERR-" backend/app/`

### Manual

- Call each endpoint with invalid input → verify correct error code and HTTP status
- Verify error response format is consistent across all endpoints

---

*Last updated: 2026-07-17*
