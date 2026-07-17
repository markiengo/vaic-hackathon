# TaxLens Development Log

This file records implementation decisions, delivered code, and verification
results. Update it in the same change whenever application code or tests are
added, removed, or behaviorally modified.

## Update convention

- Keep **Current implementation** synchronized with the codebase.
- Append a dated entry under **Session history** for every code change.
- Record the affected components, behavior changes, and exact verification run.
- Preserve old entries as history; correct an old entry only when it is factually
  inaccurate, and note the correction in the latest session entry.

## Current implementation

P1 (matching & allocation logic), P4 (backend infrastructure), and Sprint 1
(router implementations, SePay webhook, frontend UI, adapters, tests) have been
merged into `main` and pushed to `origin/main` as of 2026-07-17. The codebase
now has the functional core, SQLAlchemy models, FastAPI application with full
router endpoints, SePay webhook integration, Next.js frontend, and Docker
Compose for local development.

### P1 Sprint 1 — Matching and financial logic

Status: Implemented, unit-tested, and merged into `main` on 2026-07-17.

The implementation is a deterministic functional core with no SQLAlchemy,
FastAPI, or external-service dependency. P4's persistence layer can map
database models into the typed snapshots and persist returned allocation plans
through the provided port.

#### Matching decisions

- `exact_match()` accepts only a token-safe `PAY-[A-Z0-9]{6}` reference,
  preferring `payment_code` and falling back to `raw_note`.
- Positive exact matches require the same merchant, an incoming transaction, a
  pending and non-expired intent, exact intent amount, a payable sale, and
  sufficient transaction and sale capacity.
- Candidate matching is limited to the same merchant, and to the same store
  when a store is known. Eligible sales are `UNPAID` or `PARTIAL`, within a
  60-minute window, and not fully allocated.
- Candidate amount tolerance is
  `min(10,000 VND, max(1,000 VND, 0.5% × sale net amount))`.
- Deterministic scoring:
  - exact outstanding amount: `+50`
  - within-tolerance non-exact amount: `+35`
  - time under 1/5/30 minutes: `+20/+10/+5`
  - strict candidate-owned identifier: `+20`
  - normalized known sender: `+10`
  - unresolved same-amount duplicate: `-30`
- An external note signal contributes `0–5` to ranking and human-review
  decisions only. It cannot unlock an automatic financial write.
- `AUTO_MATCH` requires exact amount, deterministic score at least 95, no
  unresolved ambiguity, and every competing candidate below 75.
- Ties, unresolved duplicates, or a competing candidate at least 75 require
  `HUMAN_CONFIRM`.
- A unique exact-amount candidate within one minute also requires human
  confirmation when amount and time are its only strong evidence; its score is
  70, not an artificial 95.
- Within-tolerance amount mismatches can never auto-match. They require human
  review only when their evidence reaches the review threshold; otherwise they
  remain unmatched.
- Fuzzy scores are heuristic match scores, not calibrated probabilities. When
  persisted as confidence, they carry `confidence_method="heuristic_v1"`.

#### Allocation decisions

- All money uses `Decimal`; floats are not used.
- `allocate_payment()` validates the complete request before returning a plan.
  An invalid leg rejects the request atomically.
- Supported flows include one payment to many sales, many payments to one sale,
  split/two-payer payments, deposits, payment remainders, and refunds.
- Sale status is derived from net allocations:
  - no collected balance: `UNPAID`
  - positive balance below sale amount: `PARTIAL`
  - balance equal to sale amount: `PAID`
  - a previously collected balance fully reversed: `REFUNDED`
- A valid surplus remains unallocated and is returned with `OVERPAYMENT`; it is
  never silently credited to a sale.
- Over-allocation, sale overpayment, and refund beyond collected funds are
  rejected with structured validation errors.
- Refund auto-matching requires a negative outgoing transaction containing the
  original payment reference and enough previously collected funds. Other
  refunds require human selection.
- `AllocationPlanWriter` is the persistence boundary. P4's SQLAlchemy layer is
  responsible for models, migrations, row locking, revalidation, and
  transactional writes.

### P4 — Backend infrastructure

Status: Implemented and merged into `main` on 2026-07-17.

#### Application shell

- FastAPI app (`app/main.py`) with CORS middleware, global exception handler,
  `/health` endpoint, and 12 routers mounted under `/api/v1`: auth,
  merchants, transactions, sales, reconciliation, tax, cases, agents, audit,
  pos, confirm, and SePay webhooks. All routers now have full endpoint
  implementations (see Sprint 1 below).
- Pydantic settings (`app/core/config.py`) loading from `.env` with all
  required env vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, SePay API,
  mock service URLs, and LLM provider config.
- Shared response schemas (`app/schemas/base.py`): `ErrorDetail`,
  `ErrorResponse`, `SuccessResponse[T]`, `PaginatedResponse[T]`.

#### Database layer

- Async SQLAlchemy engine (`app/core/database.py`) using
  `postgresql+asyncpg://`, `async_sessionmaker`, and a `get_db()` dependency.
- `DeclarativeBase` subclass `Base` shared across all models.
- 19 SQLAlchemy ORM models across 10 modules covering merchants, stores,
  devices, users, products, sales, sale lines, bank transactions, payment
  intents, payment allocations, cash sessions, invoices, tax classifications,
  tax rule versions, reconciliation cases, exceptions, agent runs, tool calls,
  and audit events.
- Alembic migration `001_initial_schema` creates all 19 tables with FK
  constraints and `ondelete` cascade rules. No pgvector extension.

#### Caching and infrastructure

- Redis async client (`app/core/redis.py`) with connection pool, `get_redis()`
  dependency, and `close_pool()` shutdown hook.
- Docker Compose with PostgreSQL 16, Redis 7, backend (uvicorn), and frontend
  services. Health checks on postgres and redis. Mock services commented out
  pending P5.
- `backend/Dockerfile` using `python:3.11-slim`, `requirements.txt` with
  FastAPI, SQLAlchemy, asyncpg, Alembic, Pydantic, Redis, LangGraph, OpenAI,
  and supporting libraries.
- `.env.example` documenting all required environment variables.

#### Tests

- `tests/test_models.py` verifies all 19 tables are registered on
  `Base.metadata`, table names match the expected set, and `Base` is a
  `DeclarativeBase` subclass. Requires SQLAlchemy to be installed.

#### Scope boundaries

- P1 included: pure matching/allocation services, typed records and results,
  unit tests, persistence protocol, and aligned algorithm/evaluation
  documentation.
- P4 included: FastAPI shell, SQLAlchemy models, Alembic migration, Docker
  Compose, Redis client, config, response schemas, and model tests.
- Still excluded: NLP implementation, agent execution logic, and real
  external integrations (SePay API token is dummy).

## Created and updated files

### P1 — Matching and allocation

- `backend/app/services/matching.py` — matching types, exact matching, candidate
  generation/scoring, decision gates, sender/reference normalization, and refund
  matching.
- `backend/app/services/allocation.py` — allocation plans, validation errors,
  status derivation, intent updates, audit metadata, and persistence protocol.
- `backend/tests/test_matching.py` — exact, candidate, ambiguity, tolerance,
  note-gating, normalization, filtering, ordering, and refund tests.
- `backend/tests/test_allocation.py` — many-to-many, partial payment, deposit,
  surplus, validation, intent, direction, and refund tests.
- `docs/05-domain/02-algorithm.md` — updated normative scoring and safety gates.
- `docs/05-domain/03-evaluation.md` — corrected the unique amount plus time case
  from auto-match to human confirmation.

### P4 — Backend infrastructure

- `backend/app/main.py` — FastAPI application with CORS, exception handler,
  health endpoint, and 11 router mounts.
- `backend/app/core/config.py` — Pydantic settings loading from `.env`.
- `backend/app/core/database.py` — async SQLAlchemy engine, session factory,
  `get_db()` dependency.
- `backend/app/core/redis.py` — Redis async connection pool and shutdown hook.
- `backend/app/models/` — 10 model modules registering 19 ORM tables on
  `Base.metadata`.
- `backend/app/routers/` — 11 router stubs (auth, merchants, transactions,
  sales, reconciliation, tax, cases, agents, audit, pos, confirm).
- `backend/app/schemas/base.py` — shared `ErrorResponse`, `SuccessResponse`,
  `PaginatedResponse` Pydantic schemas.
- `backend/alembic/` — Alembic config, env.py, and migration
  `001_initial_schema.py` creating all 19 tables.
- `backend/tests/test_models.py` — verifies 19 tables registered, table names
  match expected set, and `Base` is `DeclarativeBase`.
- `backend/requirements.txt` — all Python dependencies pinned.
- `backend/Dockerfile` — `python:3.11-slim` with uvicorn CMD.
- `backend/.env.example` — documented environment variable template.
- `backend/expected_vars.txt` — list of expected env var keys.
- `docker-compose.yml` — PostgreSQL 16, Redis 7, backend, frontend services
  with health checks.
- `frontend/Dockerfile` — placeholder frontend container.

### Sprint 1 — Router implementations, SePay webhook, frontend UI, adapters, tests

- `backend/app/routers/transactions.py` — `GET /transactions` list endpoint with
  merchant_id + period filtering.
- `backend/app/routers/merchants.py` — `GET /merchants/{id}/dashboard` with
  transaction/sale/invoice counts and reconciliation rate.
- `backend/app/routers/sales.py` — `GET /sales` list endpoint.
- `backend/app/routers/reconciliation.py` — `GET /reconciliation/exceptions`
  listing exception records by merchant + period.
- `backend/app/routers/tax.py` — `GET /tax/readiness` checklist and
  `POST /tax/export` endpoint.
- `backend/app/routers/cases.py` — `GET /cases` list and
  `GET /cases/{id}` detail endpoints.
- `backend/app/routers/agents.py` — `POST /agents/run`, `GET /agents/runs`,
  and `GET /agents/runs/{id}/trace` endpoints.
- `backend/app/routers/audit.py` — `GET /audit` event list endpoint.
- `backend/app/routers/pos.py` — `GET /pos/products`, `POST /pos/sales`,
  `POST /pos/payment-intents`, `POST /pos/cash-sessions/close`.
- `backend/app/routers/confirm.py` — `GET /confirm/pending` and
  `POST /confirm/{id}/approve` endpoints.
- `backend/app/adapters/sepay.py` — SePay webhook handler (`POST /webhooks/sepay`)
  with API key auth, idempotent insert via `SEPAY-{id}` canonical ID,
  `SepayWebhookPayload` Pydantic model, and `fetch_transactions()` API client.
- `backend/app/adapters/csv.py` — CSV import adapter with row-hash dedup,
  flexible date parsing, and batch import.
- `backend/app/adapters/shb.py` — SHB bank adapter delegating to SePay API client.
- `backend/app/adapters/invoice.py` — Invoice mock API adapter with
  `fetch_invoices()` and `sync_invoices()` (idempotent upsert).
- `backend/app/services/tax_rules.py` — Tax rule engine with VAT classification,
  checklist generation, and readiness assessment.
- `backend/scripts/seed_data.py` — Seed script populating merchants, stores,
  products, sales, bank transactions, payment intents, invoices, and cash
  sessions for M001 (Salon Hoa).
- `backend/tests/conftest.py` — pytest fixtures with async DB session and seed
  data setup.
- `backend/tests/test_sepay_webhook.py` — Integration tests for SePay webhook:
  creates bank transaction, idempotency on duplicate POST.
- `backend/tests/test_seed_data.py` — Tests verifying seed data integrity.
- `backend/tests/test_tax_rules.py` — Tests for tax rule classification and
  readiness checklist.
- `backend/pytest.ini` — pytest config with asyncio mode.
- `frontend/package.json` — Next.js 14, React 18, Zustand, React Query, Axios,
  clsx, TailwindCSS, TypeScript.
- `frontend/next.config.js` — API proxy rewrite to backend at localhost:8000.
- `frontend/tsconfig.json` — TypeScript config with `@/*` path alias.
- `frontend/tailwind.config.ts` — TailwindCSS design system with custom colors,
  typography, spacing, and animation tokens.
- `frontend/postcss.config.js` — PostCSS with TailwindCSS and Autoprefixer.
- `frontend/src/app/layout.tsx` — Root layout with Providers and global CSS.
- `frontend/src/app/page.tsx` — Root redirect to `/dashboard`.
- `frontend/src/app/dashboard/page.tsx` — Dashboard with stat cards,
  reconciliation progress ring, and exception table (live API data).
- `frontend/src/app/exceptions/page.tsx` — Exceptions list with AI suggestions
  and resolve actions (mock data).
- `frontend/src/app/tax/page.tsx` — Tax readiness checklist (mock data).
- `frontend/src/app/cases/page.tsx` — Case list with status badges (mock data).
- `frontend/src/app/cases/[id]/page.tsx` — Case detail with assignment and
  messaging (mock data).
- `frontend/src/app/trace/page.tsx` — Agent trace timeline with tool/agent
  badges and approval actions (mock data).
- `frontend/src/app/audit/page.tsx` — Audit event log table (mock data).
- `frontend/src/app/pos/page.tsx` — Mini POS with product grid, cart,
  QR payment modal, and cash session close (mock data).
- `frontend/src/app/confirm/page.tsx` — Merchant approval queue with
  approve/reject actions (mock data).
- `frontend/src/components/AppShell.tsx` — Sidebar navigation, header, and
  main content layout shell.
- `frontend/src/components/Providers.tsx` — React Query provider wrapper.
- `frontend/src/lib/api.ts` — Axios API client with all endpoint functions.
- `frontend/src/lib/store.ts` — Zustand store for merchant ID and period.
- `frontend/src/types/index.ts` — TypeScript interfaces for all domain types.
- `stitch-screens/` — Design reference screens from Google Stitch.

## Verification

### P1 tests (no external dependencies)

Run from `backend/`:

```powershell
python -m pytest tests/test_matching.py tests/test_allocation.py -v
```

Latest result (2026-07-17):

```text
29 passed in 0.42s
```

### P4 model tests (requires SQLAlchemy installed)

Run from `backend/`:

```powershell
python -m pytest tests/test_models.py -v
```

Requires `sqlalchemy[asyncio]` from `requirements.txt` to be installed.
Collection fails with `ModuleNotFoundError: No module named 'sqlalchemy'`
if dependencies are not installed.

### Sprint 1 — SePay webhook, router, and frontend tests

Run from `backend/`:

```powershell
python -m pytest tests/test_sepay_webhook.py tests/test_seed_data.py tests/test_tax_rules.py -v
```

End-to-end webhook verification (2026-07-17):

- Backend running on `localhost:8000` with all router endpoints registered.
- Localtunnel exposing backend at `https://nine-books-taste.loca.lt`.
- `POST /api/v1/webhooks/sepay` via tunnel with test payload → `{"success": true}`.
- Transaction `SEPAY-77777` inserted into `bank_transactions` table (verified via SQL).
- `GET /api/v1/transactions?merchant_id=M001&period=2026-07` returns 25 transactions
  including the webhook-inserted one.
- `GET /api/v1/merchants/M001/dashboard?period=2026-07` returns 55 total transactions,
  45.5% reconciliation rate, 2 open exceptions.
- Frontend at `localhost:3001` proxies API calls to backend successfully.
- Dashboard page loads and displays live stats from the API.

## Session history

### 2026-07-17 — P1 Sprint 1 implementation

- Reviewed the work split, product matching rules, data model, algorithm,
  testing specification, and evaluation truth set.
- Chose the independent functional-core approach so P1 is not blocked by P4's
  models.
- Revised the original scoring proposal to prevent note signals and close-score
  competitors from enabling auto-match.
- Implemented matching and allocation services, including strict refund and
  over-allocation handling.
- Added 29 passing unit tests and performed an in-memory syntax compilation of
  all four backend Python modules.
- Updated the normative algorithm and evaluation documentation to match the
  executable behavior.

### 2026-07-17 — P4 backend infrastructure

- Built FastAPI application shell with 11 router stubs, CORS, global exception
  handler, and `/health` endpoint.
- Defined 19 SQLAlchemy ORM models across 10 modules with async engine and
  session factory.
- Created Alembic migration `001_initial_schema` for all 19 tables with FK
  constraints and cascade rules.
- Added Redis async client, Pydantic settings config, shared response schemas,
  Docker Compose, Dockerfile, requirements.txt, and `.env.example`.
- Added `test_models.py` verifying table registration and naming.
- Note: `test_models.py` requires SQLAlchemy to be installed; it cannot run in
  environments without `requirements.txt` dependencies.

### 2026-07-17 — Merge to main

- Merged `p1-sprint1-matching-allocation` into `main` (no conflicts).
- Merged `P4` into `main` with `--no-ff` (no conflicts).
- Both branches are now fully integrated on `main`. Not yet pushed to
  `origin/main`.

### 2026-07-17 — Sprint 1: router implementations, SePay webhook, frontend, tests

- Implemented all 11 backend router endpoints (transactions, merchants, sales,
  reconciliation, tax, cases, agents, audit, pos, confirm) replacing the
  previous health-only stubs.
- Added SePay webhook handler with API key authentication, idempotent insert
  via `SEPAY-{id}` canonical ID, and `SepayWebhookPayload` Pydantic model.
- Added CSV import adapter, SHB bank adapter, and invoice mock API adapter.
- Added tax rules service with VAT classification and readiness checklist.
- Added seed data script populating M001 (Salon Hoa) with 24 bank transactions,
  30 sales, 5 invoices, and supporting records.
- Added test suite: `test_sepay_webhook.py`, `test_seed_data.py`,
  `test_tax_rules.py`, and `conftest.py` with async DB fixtures.
- Built Next.js 14 frontend with 10 pages (dashboard, exceptions, tax, cases,
  case detail, trace, audit, pos, confirm), AppShell layout, API client,
  Zustand store, and React Query provider. Dashboard uses live API data;
  other pages use mock data for Sprint 1.
- Fixed frontend `tsconfig.json` target from `es5` to `es2017` for Set spread
  support. Fixed `confirm/page.tsx` Set spread to use `Array.from().concat()`.
- Removed unused `lucide-react` dependency from frontend.
- Updated `.gitignore` to exclude `frontend/node_modules/`, `frontend/.next/`,
  `frontend/next-env.d.ts`, and `code-to-clipboard.html`.
- Verified end-to-end: SePay webhook via localtunnel → DB insert → API fetch →
  frontend display. All working.
- Committed and pushed to `origin/main` (`3446872`).
