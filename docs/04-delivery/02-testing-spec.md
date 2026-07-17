# Testing Specification — TaxLens

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** QA Lead
> **Applies to:** Tất cả module TaxLens
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Chiến lược test

| Level | Phạm vi | Tool | Coverage target |
|---|---|---|---|
| Unit | Function riêng lẻ, algorithms | pytest | 80% |
| Integration | API endpoints, database, adapters | pytest + httpx | 70% |
| E2E | Full workflow từ request đến result | pytest + Playwright | Key flows |
| Contract | Tool schemas, API schemas | pytest + Pydantic | All tools |

## Danh mục test

### Backend tests

| Test file | Phạm vi | FRs |
|---|---|---|
| `test_reconciliation.py` | Exact matching, candidate matching, exception creation | FR-RECON-001 to 005 |
| `test_tax_rules.py` | Tax-readiness checklist, rule version, missing invoice detection | FR-TAX-001 to 004 |
| `test_agents.py` | Planner decomposition, agent delegation, tool allowlists | FR-AGENT-001, 002 |
| `test_audit.py` | Audit event creation, export JSON/CSV | FR-AGENT-003 |
| `test_pos.py` | Sale creation, QR generation, cash payment, session close | FR-POS-001 to 004 |
| `test_api/` | Tất cả API endpoints | All API-XXX |
| `test_adapters/` | SHB, SePay, CSV, invoice adapters | FR-DATA-001 |
| `test_security.py` | Auth, RBAC, masking, CORS | SEC-XXX |
| `test_permissions.py` | Role-based access per endpoint | FR-XXX |
| `test_errors.py` | Error codes và responses | ERR-XXX |
| `test_webhooks.py` | SePay webhook, idempotency, API key auth | FR-POS-002 |

### Frontend tests (post-MVP)

| Test file | Phạm vi |
|---|---|
| E2E: Dashboard load, summary cards hiển thị |
| E2E: Exception Inbox, resolve flow |
| E2E: Agent trace real-time updates |
| E2E: Mini POS sale → QR → cash flow |
| E2E: Tax-readiness checklist hiển thị |
| E2E: Audit log export download |

## Tóm tắt acceptance criteria

Mỗi FR có binary acceptance criteria định nghĩa trong `02-requirements/04-functional-requirements.md`. Tests verify từng criterion.

## Test data và fixtures strategy

### Demo dataset (MVP)

Theo product.md §17:
- 1 merchant (Salon Hoa, M001)
- 1 store (S001)
- 30 sales orders (mix paid, unpaid, partial)
- 20 bank transfers (mix có reference, không reference, non-revenue)
- 8 cash payments
- 2 non-revenue transactions (internal transfer, loan)
- 2 ambiguous same-amount transactions
- 1 refund
- 2 orders thiếu invoice
- 1 cash discrepancy

### Truth set

| Transaction | Match mong đợi | Confidence mong đợi | Exception mong đợi |
|---|---|---|---|
| TX có PAY-REF → ORDER | Exact match | 100% | Không |
| TX không ref, amount duy nhất | Fuzzy match | ≥95% | Không |
| TX không ref, cùng amount với 2 orders | No auto-match | <75% | Có (AMBIGUOUS_MATCH) |
| TX 5M từ owner, không order | No match | 82% | Có (NO_MATCH, suggested: internal_transfer) |
| TX mua hàng | No match | 62% | Có (NO_MATCH, suggested: purchase_payment) |
| Refund TX | Match với original | 100% | Không |
| Order đã paid, không invoice | — | — | Có (MISSING_INVOICE) |
| Cash session discrepancy | — | — | Có (CASH_DISCREPANCY) |

### Tạo fixture

- Seed data qua Alembic migration (`alembic seed demo`)
- Truth set encode trong test fixtures dạng JSON
- Cleanup: test database recreate mỗi test run

### Production data

- Không dùng production data trong MVP
- Pilot phase: chỉ dùng anonymized data (theo product.md §22)

## Coverage targets

| Module | Target |
|---|---|
| Reconciliation engine | 90% |
| Tax Rules Engine | 90% |
| Agent orchestration | 80% |
| Adapters | 70% |
| API endpoints | 80% |
| Frontend | E2E cho key flows only (MVP) |

## CI integration

```yaml
# .github/workflows/ci.yml (example)
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres: ...
      redis: ...
    steps:
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && alembic upgrade head
      - run: cd backend && pytest tests/ -v --cov=app --cov-report=term
  frontend:
    runs-on: ubuntu-latest
    steps:
      - run: cd frontend && npm install
      - run: cd frontend && npm run build
      - run: cd frontend && npm run lint
```

## Test case IDs

| Test ID | Mô tả | FR traced |
|---|---|---|
| TEST-RECON-001 | Exact match với reference hợp lệ | FR-RECON-001 |
| TEST-RECON-002 | Exact match reject amount không khớp | FR-RECON-001 |
| TEST-RECON-003 | Candidate match sinh scored candidates | FR-RECON-002 |
| TEST-RECON-004 | Score ≥95% auto-match | FR-RECON-002 |
| TEST-RECON-005 | Score 75-94% vào Exception Inbox | FR-RECON-002 |
| TEST-RECON-006 | Score <75% mark unmatched | FR-RECON-002 |
| TEST-RECON-007 | Hai order giống nhau → mandatory exception | FR-RECON-002 |
| TEST-RECON-008 | Exception Inbox chỉ hiển thị <95% | FR-RECON-003 |
| TEST-RECON-009 | AI suggestion gồm confidence và reasoning | FR-RECON-004 |
| TEST-RECON-010 | Three-layer note handling (raw, normalized, AI) | FR-RECON-004 |
| TEST-RECON-011 | Payment allocation cho nhiều orders | FR-RECON-005 |
| TEST-TAX-001 | Tax-readiness checklist hiển thị tất cả items | FR-TAX-001 |
| TEST-TAX-002 | Report bao gồm rule version và effective date | FR-TAX-002 |
| TEST-TAX-003 | Missing invoice detection flag paid orders | FR-TAX-003 |
| TEST-TAX-004 | Draft export JSON và CSV | FR-TAX-004 |
| TEST-OPS-001 | Case tạo cho exception chưa giải quyết | FR-OPS-001 |
| TEST-OPS-002 | Draft message bằng tiếng Việt | FR-OPS-002 |
| TEST-OPS-003 | RM assignment dựa trên merchant mapping | FR-OPS-003 |
| TEST-POS-001 | Mini POS tạo sale với items | FR-POS-001 |
| TEST-POS-002 | Dynamic QR chứa amount và reference | FR-POS-002 |
| TEST-POS-003 | Cash payment record và update order | FR-POS-003 |
| TEST-POS-004 | Cash reconciliation phát hiện discrepancy | FR-POS-004 |
| TEST-AGENT-001 | Planner phân tách request thành steps | FR-AGENT-001 |
| TEST-AGENT-002 | Agent trace hiển thị tool calls và confidence | FR-AGENT-002 |
| TEST-AGENT-003 | Audit log export JSON và CSV | FR-AGENT-003 |
| TEST-MERCHANT-001 | Confirmation link hiển thị transaction | FR-MERCHANT-001 |
| TEST-MERCHANT-002 | Confirmation submission resolve exception | FR-MERCHANT-001 |
| TEST-DATA-001 | SHB adapter ingest vào canonical ledger | FR-DATA-001 |
| TEST-DATA-002 | SePay webhook tạo transaction | FR-DATA-001 |
| TEST-DATA-003 | CSV import tạo canonical records | FR-DATA-001 |

## Verification

### Automated

- `cd backend && python -m pytest tests/ -v --cov=app` — tất cả tests với coverage

### Manual

- Chạy demo flow end-to-end và verify mỗi TEST-XXX pass
- Kiểm tra truth set khớp với expected outcomes

---

*Last updated: 2026-07-17*
