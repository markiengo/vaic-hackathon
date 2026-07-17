# Security — KHỚP

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Security Lead
> **Applies to:** All KHỚP modules
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Authentication

| ID | Requirement | Description |
|---|---|---|
| SEC-AUTH-001 | JWT-based authentication | SHB staff authenticate with username/password → receive JWT access token (15min) and refresh token (7 days) |
| SEC-AUTH-002 | Token-based merchant confirmation | Merchant confirmation links use opaque tokens (not JWT); no login required; tokens expire after 7 days |
| SEC-AUTH-003 | Webhook signature verification | SePay/SHB webhooks verified via HMAC-SHA256 signature in header |

## Password security

| ID | Requirement | Description |
|---|---|---|
| SEC-PASS-001 | Password hashing | bcrypt with cost factor ≥12 |
| SEC-PASS-002 | Password requirements | Min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit |
| SEC-PASS-003 | Account lockout | 5 failed attempts → account locked for 15 minutes |
| SEC-PASS-004 | Password reset | Admin-initiated reset only (MVP); self-service reset post-MVP |

## Encryption

| ID | Requirement | Description |
|---|---|---|
| SEC-ENC-001 | Encryption in transit | TLS 1.2+ for all HTTP and WebSocket connections |
| SEC-ENC-002 | Encryption at rest | PostgreSQL TDE or disk-level encryption for database |
| SEC-ENC-003 | Key management | Encryption keys stored in environment variables (MVP) or vault service (pilot) |
| SEC-ENC-004 | Token storage | Bank API tokens stored encrypted in database, never sent to frontend |

## Authorization and access control

See `09-permissions-matrix.md` for role definitions and permission matrix.

| ID | Requirement | Description |
|---|---|---|
| SEC-RBAC-001 | Role-based access control | Every API endpoint enforces role requirements |
| SEC-RBAC-002 | Merchant data isolation | Users can only access data for merchants in their portfolio |
| SEC-RBAC-003 | Agent tool allowlist | Each agent can only call tools in its defined allowlist (see `AI-ADVISOR.md`) |

## Data masking

| ID | Requirement | Description |
|---|---|---|
| SEC-MASK-001 | Sensitive data masking before LLM | Bank account numbers, full names, and tax IDs are masked before sending to LLM providers unless specifically needed |
| SEC-MASK-002 | Masking in logs | Full account numbers and tax IDs are masked in application logs |
| SEC-MASK-003 | No training on transaction data | LLM provider must not train on KHỚP transaction data (configured via provider API) |

## CORS policy

| ID | Requirement | Description |
|---|---|---|
| SEC-CORS-001 | Allowed origins | Only frontend domain (MVP: `localhost:3000`; pilot: SHB domain) |
| SEC-CORS-002 | Allowed methods | GET, POST, PUT, DELETE |
| SEC-CORS-003 | Allowed headers | Authorization, Content-Type |

## Rate limiting

| ID | Requirement | Description |
|---|---|---|
| SEC-RATE-001 | API rate limit | 100 requests/minute per authenticated user |
| SEC-RATE-002 | Webhook rate limit | 1000 requests/minute per source IP (webhook endpoints) |
| SEC-RATE-003 | Failed auth rate limit | 10 failed login attempts per IP per 15 minutes |

## Input validation

| ID | Requirement | Description |
|---|---|---|
| SEC-VAL-001 | Pydantic schema validation | All API inputs validated via Pydantic models |
| SEC-VAL-002 | SQL injection prevention | SQLAlchemy parameterized queries only; no raw SQL with string interpolation |
| SEC-VAL-003 | XSS prevention | React/Next.js auto-escaping; no dangerouslySetInnerHTML |
| SEC-VAL-004 | Webhook payload validation | Webhook payloads validated against expected schema before processing |

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
| SEC-SECRET-001 | Environment variables | All secrets (DB password, JWT secret, bank API tokens, LLM API keys) in environment variables |
| SEC-SECRET-002 | No secrets in code | Secrets never hardcoded; `.env` file in `.gitignore` |
| SEC-SECRET-003 | Secret rotation | JWT secret and bank API tokens rotatable without code changes |
| SEC-SECRET-004 | No secrets in logs | Secret values never logged |

## Audit logging

See DEC-008 and `07-data-models.md` (audit_events table).

| ID | Requirement | Description |
|---|---|---|
| SEC-AUDIT-001 | Every tool call logged | actor_type, actor_id, agent_name, action, tool_name, input_hash, output_hash, timestamp |
| SEC-AUDIT-002 | Every human decision logged | approval_status, decision_by, decision_at |
| SEC-AUDIT-003 | Audit events are append-only | No UPDATE or DELETE on audit_events table |
| SEC-AUDIT-004 | Audit log export | JSON and CSV export for compliance review |

## Idempotency

| ID | Requirement | Description |
|---|---|---|
| SEC-IDEM-001 | Webhook idempotency | Duplicate webhooks (same transaction ID) are skipped |
| SEC-IDEM-002 | Tool call idempotency | Duplicate tool calls (same input hash) return cached result |
| SEC-IDEM-003 | Sale creation idempotency | Duplicate sale creation requests do not create duplicate orders |

## Human approval

| ID | Requirement | Description |
|---|---|---|
| SEC-APPROVAL-001 | Write actions require approval | Agent write actions (case creation, message sending, export) require human approval |
| SEC-APPROVAL-002 | No auto-resolve below threshold | Transactions with confidence <95% cannot be auto-resolved |
| SEC-APPROVAL-003 | Approval logged | Every approval/rejection is logged with user, timestamp, and reason |

## Security NFRs

See `05-non-functional-requirements.md` for performance and availability targets.

## Verification

### Automated

- `cd backend && python -m pytest tests/test_security.py -v` — security tests
- `cd backend && python -m pytest tests/test_auth.py -v` — authentication tests
- `grep -r "password" backend/app/ --include="*.py"` — verify no hardcoded passwords

### Manual

- Attempt access without token → verify 401
- Attempt access with wrong role → verify 403
- Verify CORS headers in response
- Verify audit events created for tool calls and human decisions
- Verify masked data in LLM prompts (check logs)

---

*Last updated: 2026-07-17*
