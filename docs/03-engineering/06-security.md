# Security — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Security Lead
> **Applies to:** Tất cả module của TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Authentication

| ID | Requirement | Description |
|---|---|---|
| SEC-AUTH-001 | JWT-based authentication | Nhân viên SHB authenticate bằng username/password → nhận JWT access token (15phút) và refresh token (7 ngày) |
| SEC-AUTH-002 | Token-based merchant confirmation | Link xác nhận merchant dùng opaque token (không phải JWT); không cần login; token hết hạn sau 7 ngày |
| SEC-AUTH-003 | Webhook API key verification | SePay webhook verify qua header `Authorization: Apikey API_KEY` checked với `SEPAY_WEBHOOK_API_KEY` |

## Password security

| ID           | Requirement           | Description                                                  |
| --------------| -----------------------| --------------------------------------------------------------|
| SEC-PASS-001 | Password hashing      | bcrypt với cost factor ≥12                                   |
| SEC-PASS-002 | Password requirements | Tối thiểu 8 ký tự, ít nhất 1 uppercase, 1 lowercase, 1 digit |
| SEC-PASS-003 | Account lockout       | 5 lần thất bại → account khóa 15 phút                        |
| SEC-PASS-004 | Password reset        | Chỉ admin reset (MVP); self-service reset post-MVP           |

## Encryption

| ID | Requirement | Description |
|---|---|---|
| SEC-ENC-001 | Encryption in transit | TLS 1.2+ cho mọi kết nối HTTP và WebSocket |
| SEC-ENC-002 | Encryption at rest | PostgreSQL TDE hoặc disk-level encryption cho database |
| SEC-ENC-003 | Key management | Encryption key lưu trong environment variable (MVP) hoặc vault service (pilot) |
| SEC-ENC-004 | Token storage | Bank API token lưu encrypted trong database, không bao giờ gửi frontend |

## Authorization and access control

Xem `03-engineering/04-permissions-matrix.md` cho role definition và permission matrix.

| ID | Requirement | Description |
|---|---|---|
| SEC-RBAC-001 | Role-based access control | Mọi API endpoint enforce role requirement |
| SEC-RBAC-002 | Merchant data isolation | User chỉ truy cập dữ liệu merchant trong portfolio của mình |
| SEC-RBAC-003 | Agent tool allowlist | Mỗi agent chỉ gọi tool trong allowlist định nghĩa (xem `05-domain/01-ai-advisor.md`) |

## Data masking

| ID | Requirement | Description |
|---|---|---|
| SEC-MASK-001 | Sensitive data masking before LLM | Số tài khoản ngân hàng, tên đầy đủ, và tax ID được mask trước khi gửi LLM provider trừ khi cụ thể cần |
| SEC-MASK-002 | Masking in logs | Số tài khoản đầy đủ và tax ID được mask trong application log |
| SEC-MASK-003 | No training on transaction data | LLM provider không được train trên dữ liệu giao dịch TaxLens (cấu hình qua provider API) |

## CORS policy

| ID | Requirement | Description |
|---|---|---|
| SEC-CORS-001 | Allowed origins | Chỉ frontend domain (MVP: `localhost:3000`; pilot: SHB domain) |
| SEC-CORS-002 | Allowed methods | GET, POST, PUT, DELETE |
| SEC-CORS-003 | Allowed headers | Authorization, Content-Type |

## Rate limiting

| ID | Requirement | Description |
|---|---|---|
| SEC-RATE-001 | API rate limit | 100 request/phút mỗi authenticated user |
| SEC-RATE-002 | Webhook rate limit | 1000 request/phút mỗi source IP (webhook endpoint) |
| SEC-RATE-003 | Failed auth rate limit | 10 lần login thất bại mỗi IP mỗi 15 phút |

## Input validation

| ID | Requirement | Description |
|---|---|---|
| SEC-VAL-001 | Pydantic schema validation | Mọi API input validate qua Pydantic model |
| SEC-VAL-002 | SQL injection prevention | Chỉ dùng SQLAlchemy parameterized query; không raw SQL với string interpolation |
| SEC-VAL-003 | XSS prevention | React/Next.js auto-escaping; không dangerouslySetInnerHTML |
| SEC-VAL-004 | Webhook payload validation | Webhook payload validate với schema mong đợi trước khi xử lý |

## Security headers

| Header | Value |
|---|---|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| X-XSS-Protection | 1; mode=block |
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| Content-Security-Policy | default-src 'self'; script-src 'self' 'unsafe-inline' |

## Secrets management

| ID | Requirement | Description |
|---|---|---|
| SEC-SECRET-001 | Environment variables | Mọi secret (DB password, JWT secret, bank API token, LLM API key) trong environment variable |
| SEC-SECRET-002 | No secrets in code | Secret không bao giờ hardcode; file `.env` trong `.gitignore` |
| SEC-SECRET-003 | Secret rotation | JWT secret và bank API token rotatable mà không cần code change |
| SEC-SECRET-004 | No secrets in logs | Giá trị secret không bao giờ log |

## Audit logging

Xem DEC-008 và `03-engineering/02-data-models.md` (audit_events table).

| ID | Requirement | Description |
|---|---|---|
| SEC-AUDIT-001 | Every tool call logged | actor_type, actor_id, agent_name, action, tool_name, input_hash, output_hash, timestamp |
| SEC-AUDIT-002 | Every human decision logged | approval_status, decision_by, decision_at |
| SEC-AUDIT-003 | Audit events are append-only | Không UPDATE hay DELETE trên audit_events table |
| SEC-AUDIT-004 | Audit log export | Export JSON và CSV cho compliance review |

## Idempotency

| ID | Requirement | Description |
|---|---|---|
| SEC-IDEM-001 | Webhook idempotency | Webhook duplicate (cùng transaction ID) được bỏ qua |
| SEC-IDEM-002 | Tool call idempotency | Tool call duplicate (cùng input hash) return cached result |
| SEC-IDEM-003 | Sale creation idempotency | Request tạo sale duplicate không tạo duplicate order |

## Human approval

| ID | Requirement | Description |
|---|---|---|
| SEC-APPROVAL-001 | Write actions require approval | Agent write action (tạo case, gửi tin nhắn, export) yêu cầu human approval |
| SEC-APPROVAL-002 | No auto-resolve below threshold | Giao dịch confidence <95% không thể auto-resolve |
| SEC-APPROVAL-003 | Approval logged | Mọi approval/rejection được log với user, timestamp, và lý do |

## Security NFRs

Xem `02-requirements/05-non-functional-requirements.md` cho performance và availability target.

## Verification

### Automated

- `cd backend && python -m pytest tests/test_security.py -v` — test security
- `cd backend && python -m pytest tests/test_auth.py -v` — test authentication
- `grep -r "password" backend/app/ --include="*.py"` — verify không có password hardcode

### Manual

- Thử truy cập không token → verify 401
- Thử truy cập sai role → verify 403
- Verify CORS header trong response
- Verify audit event tạo cho tool call và human decision
- Verify dữ liệu mask trong LLM prompt (check log)

---

*Last updated: 2026-07-17*
