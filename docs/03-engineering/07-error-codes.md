# Error Codes — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Tất cả API endpoint
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

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

## Implementation pattern

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

## Verification

### Automated

- `cd backend && python -m pytest tests/test_errors.py -v` — test error handling
- Scan code cho error code constant: `grep -r "ERR-" backend/app/`

### Manual

- Gọi mỗi endpoint với input không hợp lệ → verify error code và HTTP status đúng
- Verify error response format nhất quán across mọi endpoint

---

*Last updated: 2026-07-17*
