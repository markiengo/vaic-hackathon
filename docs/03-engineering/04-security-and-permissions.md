# Security & Permissions — TaxLens

> **Status:** Canonical | **Authority:** Normative | **Owner:** Security Lead
> **Consolidates:** security requirements + permissions matrix
> **Last updated:** 2026-07-17

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Password Security](#2-password-security)
3. [Encryption](#3-encryption)
4. [Role Definitions](#4-role-definitions)
5. [Permission Matrix](#5-permission-matrix)
6. [Enforcement Mechanism](#6-enforcement-mechanism)
7. [Business Rules](#7-business-rules)
8. [Data Masking](#8-data-masking)
9. [CORS Policy](#9-cors-policy)
10. [Rate Limiting](#10-rate-limiting)
11. [Input Validation](#11-input-validation)
12. [Security Headers](#12-security-headers)
13. [Secrets Management](#13-secrets-management)
14. [Audit Logging](#14-audit-logging)
15. [Idempotency](#15-idempotency)
16. [Human Approval](#16-human-approval)
17. [Edge Cases](#17-edge-cases)

---

## 1. Authentication

| ID | Requirement | Description |
|---|---|---|
| SEC-AUTH-001 | JWT-based authentication | Nhân viên SHB và merchant đều authenticate bằng username/password → nhận JWT access token (15phút) và refresh token (7 ngày). Role trong JWT xác định workspace (Merchant Workspace hoặc SHB Operations Console) |
| SEC-AUTH-002 | Token-based merchant confirmation | Link xác nhận merchant dùng opaque token (không cần login); token hết hạn sau 7 ngày. Dùng cho trường hợp merchant không muốn đăng nhập đầy đủ |
| SEC-AUTH-003 | Webhook API key verification | SePay webhook verify qua header `Authorization: Apikey API_KEY` checked với `SEPAY_WEBHOOK_API_KEY` |

## 2. Password Security

| ID | Requirement | Description |
|---|---|---|
| SEC-PASS-001 | Password hashing | bcrypt với cost factor ≥12 |
| SEC-PASS-002 | Password requirements | Tối thiểu 8 ký tự, ít nhất 1 uppercase, 1 lowercase, 1 digit |
| SEC-PASS-003 | Account lockout | 5 lần thất bại → account khóa 15 phút |
| SEC-PASS-004 | Password reset | Chỉ admin reset (MVP); self-service reset post-MVP |

## 3. Encryption

| ID | Requirement | Description |
|---|---|---|
| SEC-ENC-001 | Encryption in transit | TLS 1.2+ cho mọi kết nối HTTP và WebSocket |
| SEC-ENC-002 | Encryption at rest | PostgreSQL TDE hoặc disk-level encryption cho database |
| SEC-ENC-003 | Key management | Encryption key lưu trong environment variable (MVP) hoặc vault service (pilot) |
| SEC-ENC-004 | Token storage | Bank API token lưu encrypted trong database, không bao giờ gửi frontend |

## 4. Role Definitions

| Role | Description | Hierarchy |
|---|---|---|
| `admin` | Quản trị hệ thống; full access | Level 1 (cao nhất) |
| `compliance` | Chuyên viên tax/compliance; truy cập audit và export | Level 2 |
| `ops_staff` | Nhân viên vận hành merchant SHB; đối soát và ngoại lệ | Level 3 |
| `rm` | Relationship Manager; case management và nhắn merchant | Level 3 |
| `merchant_staff` | Nhân viên salon; chỉ Mini POS | Level 4 (thấp nhất) |

## 5. Permission Matrix

| Action | admin | compliance | ops_staff | rm | merchant_staff |
|---|---|---|---|---|---|
| Xem merchant dashboard | ✓ | ✓ | ✓ | ✓ | ✗ |
| Start reconciliation | ✓ | ✗ | ✓ | ✗ | ✗ |
| Xem ngoại lệ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Resolve ngoại lệ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Xem tax-readiness report | ✓ | ✓ | ✓ | ✓ | ✗ |
| Export audit log | ✓ | ✓ | ✗ | ✗ | ✗ |
| Export dữ liệu nháp | ✓ | ✓ | ✓ | ✗ | ✗ |
| Xem agent trace | ✓ | ✓ | ✓ | ✓ | ✗ |
| Tạo case | ✓ | ✗ | ✓ | ✗ | ✗ |
| Giao RM | ✓ | ✗ | ✓ | ✗ | ✗ |
| Draft tin nhắn merchant | ✓ | ✗ | ✓ | ✓ | ✗ |
| Gửi tin nhắn merchant | ✓ | ✗ | ✗ | ✓ | ✗ |
| Tạo sale (Mini POS) | ✓ | ✗ | ✗ | ✗ | ✓ |
| Tạo QR | ✓ | ✗ | ✗ | ✗ | ✓ |
| Ghi thanh toán tiền mặt | ✓ | ✗ | ✗ | ✗ | ✓ |
| Đóng cash session | ✓ | ✗ | ✗ | ✗ | ✓ |
| Quản lý user | ✓ | ✗ | ✗ | ✗ | ✗ |
| Quản lý tax rule | ✓ | ✓ | ✗ | ✗ | ✗ |
| Xác nhận giao dịch (token) | — | — | — | — | ✓ (dựa trên token) |

## 6. Enforcement Mechanism

- **Backend:** FastAPI dependency injection kiểm JWT claim với role yêu cầu
- **Frontend:** Route guard redirect user không có quyền
- **Agent tool:** Allowlist tool mỗi agent được enforce tại tool layer (xem `02-requirements/03-srs.md` §7)
- **Data isolation:** ops_staff và rm chỉ thấy merchant được giao; admin thấy tất cả

```python
# Example enforcement
def require_role(*roles: str):
    async def dependency(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise TaxLensError("ERR-AUTH-003", 403, "Insufficient permissions")
        return user
    return dependency

# Usage
@router.post("/reconcile", dependencies=[Depends(require_role("admin", "ops_staff"))])
```

| ID | Requirement | Description |
|---|---|---|
| SEC-RBAC-001 | Role-based access control | Mọi API endpoint enforce role requirement |
| SEC-RBAC-002 | Merchant data isolation | User chỉ truy cập dữ liệu merchant trong portfolio của mình |
| SEC-RBAC-003 | Agent tool allowlist | Mỗi agent chỉ gọi tool trong allowlist định nghĩa (xem `02-requirements/03-srs.md` §7) |

## 7. Business Rules

- RM chỉ xem case được giao hoặc merchant của mình
- ops_staff chỉ truy cập merchant trong portfolio của mình
- merchant_staff chỉ truy cập Mini POS cho store được giao
- Compliance xem tất cả merchant nhưng không start reconciliation
- Admin thực hiện được mọi action
- Xác nhận merchant dựa trên token bypass role check (token chính là auth)

## 8. Data Masking

| ID | Requirement | Description |
|---|---|---|
| SEC-MASK-001 | Sensitive data masking before LLM | Số tài khoản ngân hàng, tên đầy đủ, và tax ID được mask trước khi gửi LLM provider trừ khi cụ thể cần |
| SEC-MASK-002 | Masking in logs | Số tài khoản đầy đủ và tax ID được mask trong application log |
| SEC-MASK-003 | No training on transaction data | LLM provider không được train trên dữ liệu giao dịch TaxLens (cấu hình qua provider API) |

## 9. CORS Policy

| ID | Requirement | Description |
|---|---|---|
| SEC-CORS-001 | Allowed origins | Chỉ frontend domain (MVP: `localhost:3000`; pilot: SHB domain) |
| SEC-CORS-002 | Allowed methods | GET, POST, PUT, DELETE |
| SEC-CORS-003 | Allowed headers | Authorization, Content-Type |

## 10. Rate Limiting

| ID | Requirement | Description |
|---|---|---|
| SEC-RATE-001 | API rate limit | 100 request/phút mỗi authenticated user |
| SEC-RATE-002 | Webhook rate limit | 1000 request/phút mỗi source IP (webhook endpoint) |
| SEC-RATE-003 | Failed auth rate limit | 10 lần login thất bại mỗi IP mỗi 15 phút |

## 11. Input Validation

| ID | Requirement | Description |
|---|---|---|
| SEC-VAL-001 | Pydantic schema validation | Mọi API input validate qua Pydantic model |
| SEC-VAL-002 | SQL injection prevention | Chỉ dùng SQLAlchemy parameterized query; không raw SQL với string interpolation |
| SEC-VAL-003 | XSS prevention | React/Next.js auto-escaping; không dangerouslySetInnerHTML |
| SEC-VAL-004 | Webhook payload validation | Webhook payload validate với schema mong đợi trước khi xử lý |

## 12. Security Headers

| Header | Value |
|---|---|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| X-XSS-Protection | 1; mode=block |
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| Content-Security-Policy | default-src 'self'; script-src 'self' 'unsafe-inline' |

## 13. Secrets Management

| ID | Requirement | Description |
|---|---|---|
| SEC-SECRET-001 | Environment variables | Mọi secret (DB password, JWT secret, bank API token, LLM API key) trong environment variable |
| SEC-SECRET-002 | No secrets in code | Secret không bao giờ hardcode; file `.env` trong `.gitignore` |
| SEC-SECRET-003 | Secret rotation | JWT secret và bank API token rotatable mà không cần code change |
| SEC-SECRET-004 | No secrets in logs | Giá trị secret không bao giờ log |

## 14. Audit Logging

Xem DEC-008 và `03-engineering/02-data-models.md` (audit_events table).

| ID | Requirement | Description |
|---|---|---|
| SEC-AUDIT-001 | Every tool call logged | actor_type, actor_id, agent_name, action, tool_name, input_hash, output_hash, timestamp |
| SEC-AUDIT-002 | Every human decision logged | approval_status, decision_by, decision_at |
| SEC-AUDIT-003 | Audit events are append-only | Không UPDATE hay DELETE trên audit_events table |
| SEC-AUDIT-004 | Audit log export | Export JSON và CSV cho compliance review |

## 15. Idempotency

| ID | Requirement | Description |
|---|---|---|
| SEC-IDEM-001 | Webhook idempotency | Webhook duplicate (cùng transaction ID) được bỏ qua |
| SEC-IDEM-002 | Tool call idempotency | Tool call duplicate (cùng input hash) return cached result |
| SEC-IDEM-003 | Sale creation idempotency | Request tạo sale duplicate không tạo duplicate order |

## 16. Human Approval

| ID | Requirement | Description |
|---|---|---|
| SEC-APPROVAL-001 | Write actions require approval | Agent write action (tạo case, gửi tin nhắn, export) yêu cầu human approval |
| SEC-APPROVAL-002 | No auto-resolve below threshold | Giao dịch confidence <95% không thể auto-resolve |
| SEC-APPROVAL-003 | Approval logged | Mọi approval/rejection được log với user, timestamp, và lý do |

## 17. Edge Cases

| Scenario | Resolution |
|---|---|
| RM được giao portfolio khác | Case cũ vẫn truy cập được; case mới từ portfolio mới |
| Nhân viên merchant nghỉ việc | User bị deactivate; cash session giữ trong audit |
| Cố gắng escalate role | Log trong audit_events; truy cập bị từ chối |
| Token dùng sau khi nhân viên merchant thay đổi | Token vẫn hợp lệ đến khi hết hạn (7 ngày) |

---

## Verification

### Automated

- `cd backend && python -m pytest tests/test_security.py -v` — test security
- `cd backend && python -m pytest tests/test_auth.py -v` — test authentication
- `cd backend && python -m pytest tests/test_permissions.py -v` — test role-based access
- `grep -r "password" backend/app/ --include="*.py"` — verify không có password hardcode

### Manual

- Thử truy cập không token → verify 401
- Thử truy cập sai role → verify 403
- Login mỗi role → verify endpoint truy cập được và không được
- Verify CORS header trong response
- Verify audit event tạo cho tool call và human decision
- Verify dữ liệu mask trong LLM prompt (check log)

---

*Last updated: 2026-07-17*
