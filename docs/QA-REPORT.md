# TaxLens — QA Report

## Test Summary

| Suite | Tests | Passed | Failed | Status |
|---|---|---|---|---|
| Backend (pytest) | 210 | 210 | 0 | ✅ Pass |
| Frontend (vitest) | 84 | 84 | 0 | ✅ Pass |
| Frontend (tsc) | — | — | 0 errors | ✅ Pass |
| Frontend (build) | — | — | — | ✅ Pass |

---

## Backend Test Coverage

### Unit Tests
- **Auth & RBAC** (5 tests): valid login, wrong password, valid JWT, missing JWT (401), expired JWT (ERR-AUTH-002)
- **Error codes** (24 tests): ERR-AUTH-001/002/003, ERR-MERCHANT-001, ERR-RECON-001/002, ERR-GEN-001/002
- **Matching** (12 tests): exact match, fuzzy candidate scoring, no-match, split payment, refund, multi-order penalty
- **Allocation** (8 tests): payment allocation totals, partial allocation, overpayment, refund allocation
- **Reconciliation** (10 tests): case creation, exception generation, cash reconciliation, discrepancy detection
- **Tax rules** (8 tests): rule version selection, readiness calculation, compliance checks
- **Seed data** (17 tests): merchant/store/device/user/product/sale/transaction/invoice/tax counts and field verification
- **Models** (23 tests): 20 tables registered, table names match, each table has correct tablename
- **Agents** (6 tests): planner retry with invalid JSON, tool execution, budget enforcement, concurrency limiter
- **Integration** (30+ tests): full API flows from login through reconciliation, exception resolution, case management
- **SePay webhook** (6 tests): idempotent webhook processing, duplicate prevention
- **Truth set** (3 tests): evaluation truth set verification
- **Tools** (27 tests): tool registry, execution, validation
- **Vietnamese NLP** (5 tests): note interpretation, normalization

### Integration Test Flows
1. Login → get me → complete onboarding
2. Create sale → generate QR → simulate payment → verify match
3. Start reconciliation → verify exceptions → resolve exception
4. Escalate to SHB → verify case created → approve case
5. Agent run → verify plan → verify trace
6. Demo reset → verify clean state

---

## Frontend Test Coverage

### Component Tests
- **Auth gateway** (7 tests): CSRF validation, origin checking, cookie management, session expiry, demo cookies
- **Agent ops contracts** (5 tests): agent run streaming, polling, action approval/execution, ops detail contracts
- **Dashboard** (2 tests): KPI rendering, period switching
- **Exceptions** (3 tests): decision queue, confirm/reclassify/dismiss actions
- **Sales workspace** (2 tests): sale creation, QR intent, cash payment
- **Tax readiness** (2 tests): checklist rendering, export generation
- **Transactions hook** (1 test): fixture data contract
- **Settings workspace** (2 tests): profile, SePay sync
- **Public confirmation** (3 tests): evidence display, classification confirmation
- **Format** (4 tests): money formatting, NaN protection, Vietnamese currency
- **Vietnamese i18n** (3 tests): translation coverage, diacritics
- **Query keys** (1 test): cache key scoping

### Type Safety
- `tsc --noEmit` passes with 0 errors
- All API responses typed via TypeScript interfaces
- Zod schemas validate runtime data

### Build
- `next build` succeeds
- All 22 routes compile and render
- No hydration errors, no console errors

---

## Security Verification

| Check | Status |
|---|---|
| JWT enforced on all protected endpoints | ✅ |
| Missing token → 401 ERR-AUTH-001 | ✅ |
| Expired token → 401 ERR-AUTH-002 | ✅ |
| Insufficient role → 403 ERR-AUTH-003 | ✅ |
| HttpOnly cookies (access, refresh) | ✅ |
| CSRF double-submit on mutations | ✅ |
| Rolling-window login lockout (5 attempts → 15 min) | ✅ |
| Audit events immutable (no edit/delete API) | ✅ |
| SHB cannot alter merchant source transactions | ✅ |
| No credentials in API responses | ✅ |
| No chain-of-thought exposed to client | ✅ |

---

## Known Limitations

1. **Agent streaming** — POST+polling implementation (not SSE). Trace fetched when run reaches WAITING_FOR_HUMAN or terminal status to surface tool calls and approval gates.
2. **Email/Zalo** — Simulated, not real integrations.
3. **Invoice issuance** — Sandbox only, not production invoice issuance.
4. **Tax filing** — Export only, no direct tax filing.
5. **LLM dependency** — Deterministic fallback agent used when no API key configured. Responses are pre-computed, not dynamic.
6. **Redis** — In-memory fallback works for single-instance; Redis needed for multi-instance deployment.

---

## Test Commands

```bash
# Backend
cd backend
python -m pytest -v

# Frontend
cd frontend
npx vitest run
npx tsc --noEmit
npx next build

# E2E (if Playwright configured)
cd frontend
npx playwright test
```

---

## Verification Date

2026-07-20 — All tests passing on commit `460505d` (main branch).

### Changelog
- **sse-client.ts**: Fixed to fetch `/agents/runs/{id}/trace` when run reaches WAITING_FOR_HUMAN or terminal status, yielding `tool_started`, `tool_completed`, and `approval_required` events.
- **AssistantWorkspace.tsx**: Added "Bằng chứng, không phải suy nghĩ riêng." tagline to approval section.
- **agentops.spec.ts**: Updated E2E test to match POST+polling implementation with trace fetching.
