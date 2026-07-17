# Integration — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Tất cả integration service ngoài
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Integration overview

| Service | Purpose | MVP Status | Adapter |
|---|---|---|---|
| SePay (SHB) | API giao dịch ngân hàng + webhook | API thật (SePay) | `sepay.py` |
| POS (KiotViet) | Dữ liệu đơn hàng | Read-only (post-MVP) | `kiotvet.py` |
| CSV/Excel import | Import dữ liệu cũ | Supported | `csv.py` |
| Mini POS | Tạo sale nội bộ | Built-in | — |
| E-invoice provider | Dữ liệu hóa đơn | Mock provider | `invoice.py` |
| SHB Case Management | Tạo case và giao RM | Mock API | `case.py` |
| MISA / Accounting | Đích export | Sandbox (post-MVP) | — |
| LLM Provider | AI reasoning | Provider abstraction | — |

## Adapter pattern

Tất cả nguồn ngoài đi qua adapter normalize data vào Canonical Event Ledger schema:

```text
SHB API ────────┐
SePay webhook ──┤
KiotViet API ───┤
CSV import ─────┼──► Adapter ──► Canonical Event Ledger (PostgreSQL)
Mini POS ───────┤
Invoice mock ───┘
```

Mỗi adapter implement:

```python
class BaseAdapter(ABC):
    @abstractmethod
    async def fetch(self, merchant_id: str, period: str) -> list[CanonicalRecord]:
        """Fetch data from source and return canonical records."""
    
    @abstractmethod
    async def ingest(self, records: list[CanonicalRecord]) -> IngestionResult:
        """Insert canonical records into ledger. Idempotent."""
```

## SePay API (giao dịch SHB)

### Base URL

`https://my.sepay.vn/userapi`

### Auth

```
Authorization: Bearer API-TOKEN
Content-Type: application/json
```

### Endpoints

| Method | Path | Mục đích |
|---|---|---|
| `GET` | `/transactions/list` | Danh sách giao dịch (có filter) |
| `GET` | `/transactions/count` | Đếm số lượng giao dịch |
| `GET` | `/transactions/details/{id}` | Chi tiết một giao dịch |

### Query parameters cho `/transactions/list`

| Param | Mô tả | Format |
|---|---|---|
| `account_number` | Số tài khoản ngân hàng | String |
| `transaction_date_min` | Giao dịch tạo sau (>=) | `yyyy-mm-dd` hoặc `yyyy-mm-dd HH:MM:SS` |
| `transaction_date_max` | Giao dịch tạo trước (<=) | `yyyy-mm-dd` hoặc `yyyy-mm-dd HH:MM:SS` |
| `since_id` | Giao dịch từ ID này (>=) | Integer |
| `limit` | Giới hạn kết quả (mặc định 5000, max 5000) | Integer |
| `reference_number` | Lọc theo mã tham chiếu | String |
| `amount_in` | Lọc tiền vào khớp | Decimal |
| `amount_out` | Lọc tiền ra khớp | Decimal |

### API response — transaction object

```json
{
  "id": "49682",
  "bank_brand_name": "SHB",
  "account_number": "0778478888",
  "transaction_date": "2024-05-05 19:59:48",
  "amount_out": "0.00",
  "amount_in": "18067000.00",
  "accumulated": "1200541768.00",
  "transaction_content": "NGUYEN TIEN LUAT chuyen tien...",
  "reference_number": null,
  "code": null,
  "sub_account": null,
  "bank_account_id": "21"
}
```

### API to canonical mapping

| SePay API field | Canonical field | Ghi chú |
|---|---|---|
| `id` | `source_id` | Prefix `SEPAY-` cho canonical ID |
| `account_number` | `merchant_id` | Map qua merchant account lookup |
| `amount_in` | `amount` | Dùng `amount_in` (tiền vào); `amount_out` = bỏ qua |
| `transaction_content` | `raw_note` | Text tiếng Việt gốc — chứa sender name + note |
| `reference_number` | `reference_number` | Reference ngân hàng (không phải payment intent ref) |
| `code` | `payment_code` | Payment code SePay tự nhận diện |
| `transaction_date` | `transaction_date` | Format: `yyyy-mm-dd HH:MM:SS` |
| `bank_brand_name` | `source` | Luôn `SHB` |
| `sub_account` | `sub_account` | Tài khoản ảo nếu có |
| — | `normalized_note` | Sinh bởi normalization service |
| — | `ai_interpretation` | Sinh bởi AI (nếu cần) |

### Trích sender name

`transaction_content` chứa cả sender name và note gộp chung (vd: `"NGUYEN TIEN LUAT chuyen tien..."`). Adapter phải parse:
- Trích sender name (thường trước động từ đầu tiên: `chuyen`, `ck`, `thanhtoan`, `tt`)
- Trích note (text sau sender name)
- Nếu field `code` có giá trị, dùng làm payment reference cho exact matching

## SePay Webhook (thông báo giao dịch real-time)

### Cấu hình webhook (SePay dashboard)

Cấu hình tại my.sepay.vn → WebHook → Thêm webhook:
- **Event:** "Có tiền vào" và/hoặc "Có tiền ra"
- **URL:** `https://<taxlens-domain>/api/v1/webhooks/sepay`
- **Auth:** API Key — SePay gửi header `Authorization: Apikey API_KEY_CUA_BAN`
- **Content-Type:** `application/json`
- **Retry khi fail:** Có (SePay retry tối đa 7 lần, khoảng cách Fibonacci, tối đa 5 giờ)
- **Bỏ qua nếu không có mã thanh toán:** Tùy chọn — đặt "No" để nhận tất cả giao dịch

### Webhook payload

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

### Webhook success response

Phải trả HTTP 200 hoặc 201 với:
```json
{
  "success": true
}
```
Nếu không trả đúng, SePay coi webhook THẤT BẠI và sẽ retry.

### Webhook to canonical mapping

| Webhook field | Canonical field | Ghi chú |
|---|---|---|
| `id` | `source_id` | Prefix `SEPAY-`; **dedup key** |
| `gateway` | `source` | Luôn `SHB` |
| `accountNumber` | `merchant_id` | Map qua merchant account lookup |
| `transferAmount` | `amount` | Direct |
| `transferType` | `transaction_type` | `in` → tiền vào, `out` → tiền ra |
| `content` | `raw_note` | Transfer note — có thể chứa payment reference |
| `description` | `raw_note` (full) | Toàn bộ nội dung chuyển khoản |
| `code` | `payment_code` | Payment code SePay tự nhận diện — **key chính cho exact matching** |
| `referenceCode` | `reference_number` | Mã tham chiếu ngân hàng |
| `transactionDate` | `transaction_date` | Format: `yyyy-mm-dd HH:MM:SS` |
| `subAccount` | `sub_account` | Tài khoản ảo nếu có |

### Idempotency

Deduplicate theo field `id` của SePay. SePay có thể retry tối đa 7 lần (Fibonacci intervals) nếu response không 200/201. Check nếu `source_id = SEPAY-{id}` đã tồn tại trước khi xử lý.

### Trích payment reference

Adapter tìm payment reference trong `content` và `code`:
1. Check field `code` trước — SePay tự nhận diện payment code
2. Search `content` cho pattern `PAY-[A-Z0-9]{6}` (TaxLens payment intent reference)
3. Nếu tìm thấy → trigger exact matching
4. Nếu không → giao dịch đi qua candidate matching

### Webhook retry handling

Quy tắc retry SePay:
- Max retries: 7
- Tổng thời gian tối đa: 5 giờ
- Connect timeout: 5s
- Read timeout: 8s
- Khoảng cách retry: Fibonacci sequence

TaxLens phải response trong 8 giây (read timeout). Nếu xử lý lâu hơn, trả 200 ngay và xử lý async qua Redis queue.

## KiotViet POS Adapter (post-MVP)

| Aspect | Detail |
|---|---|
| Source | KiotViet API (read-only) |
| Auth | OAuth token |
| Polling | On-demand mỗi reconciliation run |
| Data mapping | KiotViet order → canonical sale |

## CSV/Excel Import Adapter

| Aspect | Detail |
|---|---|
| Source | File CSV/Excel user upload |
| Format | Template với column: date, amount, sender, note, type |
| Validation | Validate từng row; row không hợp lệ được log và bỏ qua |
| Idempotency | Deduplicate theo row hash + import batch ID |

## Invoice Mock Adapter

| Aspect | Detail |
|---|---|
| Source | Mock e-invoice provider |
| Response | Dữ liệu hóa đơn giả lập cho demo |
| Data mapping | Invoice number, amount, date, sale_id linkage |

## SHB Case Management Mock

| Aspect | Detail |
|---|---|
| Source | Mock SHB case-management API |
| Operations | Tạo case, giao RM, cập nhật status |
| Data mapping | TaxLens case → mock case record |

## LLM Provider

| Aspect | Detail |
|---|---|
| Provider | DeepSeek (V4 Flash, thinking mode) |
| Models | `deepseek-chat` cho tất cả agent; Planner dùng thinking mode |
| Rate limits | Xử lý tại provider abstraction layer với retry và fallback |
| Data masking | Dữ liệu nhạy cảm được mask trước khi gửi (xem `03-engineering/06-security.md` SEC-MASK-001) |
| No training | Provider API cấu hình không train trên dữ liệu TaxLens |
| Error handling | Timeout: 30s, retry: 1, fallback: rule-based default |

## Configuration

Tất cả cấu hình integration qua environment variable (xem `04-delivery/01-environment-setup.md`):

| Env var | Description | Required |
|---|---|---|
| `SEPAY_API_URL` | SePay API base URL | Yes |
| `SEPAY_API_TOKEN` | SePay API Bearer token | Yes |
| `SEPAY_WEBHOOK_API_KEY` | SePay webhook API key cho auth verification | Yes |
| `INVOICE_API_URL` | Mock invoice provider URL | Yes |
| `CASE_API_URL` | Mock case management API URL | Yes |
| `LLM_PROVIDER` | LLM provider name | Yes |
| `LLM_API_KEY` | DeepSeek API key | Yes |
| `LLM_MODEL_PLANNER` | Model cho Planner Agent (with thinking) | Yes |
| `LLM_MODEL_SPECIALIST` | Model cho specialist agent | Yes |

## Error handling summary

| Scenario | Behavior |
|---|---|
| SePay API timeout | Retry 2x, rồi dùng cached data nếu có, else log error |
| SePay webhook invalid API key | Return 401, log attempt |
| SePay webhook xử lý chậm | Return 200 ngay, xử lý async qua Redis |
| LLM provider unavailable | Return rule-based default, log error, flag để retry |
| Invoice mock unavailable | Bỏ qua invoice check, flag trong tax-readiness là "invoice data unavailable" |
| Case API unavailable | Lưu case local, set sync flag để sync sau |

## Verification

### Automated

- `cd backend && python -m pytest tests/test_adapters/ -v` — test adapter
- `cd backend && python -m pytest tests/test_webhooks.py -v` — test webhook

### Manual

- Gọi SePay API `GET /transactions/list?account_number=...&limit=20` → verify canonical record tạo đúng
- Gửi test SePay webhook → verify giao dịch ingest, dedup hoạt động, matching trigger đúng
- Upload CSV → verify record import
- Verify error handling cho mỗi adapter (timeout, dữ liệu không hợp lệ, v.v.)

---

*Last updated: 2026-07-17*
