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
merged into `main` and pushed to `origin/main` as of 2026-07-17. Sprint 1 review
and reorganization completed on 2026-07-17 (session 2). The codebase now has
the functional core, SQLAlchemy models, FastAPI application with full router
endpoints, SePay webhook integration, Next.js frontend, and Docker Compose for
local development. All Sprint 1 exit criteria verified and gaps fixed.

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

### P5 Sprint 1 — Data pipeline and Tax Rules Engine (reconciled 2026-07-17)

Status: Two independent implementations of this Sprint existed in parallel
(one committed directly to `main` by another session, one built locally
without knowledge of the first). Reconciled by comparing both against the
work-split's literal exit criteria and running both against a live DB.
Corrections below supersede claims in the "Sprint 1 — Router
implementations..." entry further down where they conflict.

#### What was kept from the first implementation (proven, do not re-derive)

- `app/adapters/sepay.py`'s webhook mechanism: `SepayWebhookPayload`,
  `process_webhook()`, the router mounted at `POST /api/v1/webhooks/sepay`,
  the `SEPAY-{id}` canonical-ID / bare `source_id` convention, and the
  WebSocket broadcast on insert (`app/core/ws_manager.py`,
  `app/routers/ws.py`). This has been **live-tested against a real MB Bank
  account with a real money transfer** (see `docs/sepay.md` and the
  "Real-time transaction notifications" session entry below) — that is
  strong, hard-to-reproduce evidence and was not touched structurally.
- `app/adapters/csv.py` and `app/adapters/invoice.py` from the first
  implementation were considered but replaced (see below) since nothing
  else in the codebase depends on their internals — replacing them was
  zero-risk and fixed concrete gaps.

#### Corrections made

1. **`retrieve_tax_rules("salon", "beauty")` — the literal Sprint 1 exit
   criterion — did not work in the first implementation.** Its
   `retrieve_tax_rules()` used exact equality on both `merchant_type` and
   `business_category`, and its seed data stored the rule under
   `merchant_type="hộ_kinh_doanh"`, `business_category="beauty_services"`.
   Confirmed by reading its own test, which calls
   `retrieve_tax_rules(session, "hộ_kinh_doanh", "beauty_services")` — a
   different query than the one the work-split specifies. Fixed by
   rewriting `retrieve_tax_rules()`/`check_required_fields()`/
   `validate_rule_version()` in `app/services/tax_rules.py` with loose,
   case-insensitive category matching (`"beauty"` matches a stored
   `"beauty_services"`) and by seeding `merchant_type="salon"`.
2. **`check_required_fields()`'s missing-invoice check was checking the
   wrong population and the wrong date column.** It compared invoice count
   against *all* sales in the period (not just paid ones — compliance.md
   defines "missing invoices" as paid orders lacking one), and filtered
   invoices by `Invoice.ingested_at` (when the row was inserted) rather
   than the sale's own period. It also returned bare pass/fail labels with
   no sale IDs, so nothing downstream could say *which* orders were
   missing invoices. Rewritten to join through actually-`PAID`/`REFUNDED`
   sales for the period and return the specific `missing_invoice_sales`
   IDs.
3. **`app/adapters/shb.py` had no data-generation capability at all** — it
   only delegated to the SePay API client, so it could not fulfill the
   work-split's explicit "SHB mock adapter with realistic Vietnamese bank
   transactions" requirement. Added `mock_transaction()` (realistic
   Vietnamese content, with and without diacritics) alongside the existing
   delegation.
4. **`app/adapters/sepay.py` never populated `sender_name` or
   `normalized_note`** (both real canonical-schema columns per
   `docs/03-engineering/05-integration.md`). Added
   `split_sender_and_note()`/`normalize_note()` and wired them into
   `process_webhook()` — purely additive, verified live against a real
   webhook payload shape (see Verification).
5. **The webhook's 401 response used FastAPI's default
   `{"detail": "..."}` body** instead of the project's standard
   `{"error": {"code": ..., "message": ...}}` envelope used everywhere
   else (`07-error-codes.md`, `app/main.py`'s global handler). Fixed;
   zero risk to the live SePay integration, which only checks the HTTP
   status code, never the body.
6. **Seed data's two "missing invoice" sales (`ORDER-0029`/`ORDER-0030`)
   were UNPAID**, not paid-but-uninvoiced — the actual scenario
   compliance.md describes. Its cash session was `CLOSED` with
   `discrepancy_reason` pre-filled, rather than `RECONCILED` as
   `docs/03-engineering/03-api-specifications.md`'s own documented example
   shows. Its seed had only 5 products (work-split specifies 10) and no
   refund scenario at all. Replaced with a seed design (30 sales / 23
   bank_transactions / 1 cash session / 28 invoices — same target counts)
   where the 2 missing-invoice sales are 2 of the 8 *cash* sales — the only
   sales genuinely `PAID` before Sprint 2's matcher runs — and which
   includes a refund, an ambiguous same-amount pair, and reuses the literal
   fixture IDs/amounts already documented in
   `docs/05-domain/02-algorithm.md` (`SHB-902194810`/`PAY-A8F21X`/350,000;
   `SHB-902194815`/"ck cho em"/5,000,000; `SHB-902194820`/empty-note/85,000
   — now as `SEPAY-902194810`/`SEPAY-902194815`/`SEPAY-902194820`, matching
   the ID convention above). `scripts/seed_data.py` is now also importable
   (`from scripts.seed_data import seed`) with `reset=True` by default, so
   `tests/conftest.py`'s autouse session fixture reseeds cleanly every run.
7. **`app/services/tax_rules.py` had no tests exercising the specific query
   the work-split specifies**, and `app/tools/__init__.py` (P2's already-
   authored tool-stub scaffold) is untouched — Sprint 2 will wire its
   `get_bank_transactions`/`retrieve_tax_rules`/etc. stubs to call into
   these corrected service functions.

#### Still open

- `app/adapters/invoice.py` (kept from the first implementation) calls a
  external `INVOICE_API_URL` mock service that was never built — currently
  harmless because nothing calls `sync_invoices()` yet (seed data inserts
  `Invoice` rows directly), but this needs a decision before any Sprint 2
  tool wraps it: build the standalone mock-services image
  `docker-compose.yml` still has commented out, or make it a direct
  DB-writer like the corrected adapters above.

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
- `backend/app/routers/` — 12 router stubs (auth, merchants, transactions,
  sales, reconciliation, tax, cases, agents, audit, pos, confirm, SePay webhook).
- `backend/app/schemas/base.py` — shared `ErrorResponse`, `SuccessResponse`,
  `PaginatedResponse` Pydantic schemas.
- `backend/alembic/` — Alembic config, env.py, and migration
  `001_initial_schema.py` creating all 19 tables.
- `backend/tests/test_models.py` — verifies 19 tables registered, table names
  match expected set, and `Base` is `DeclarativeBase`.
- `backend/requirements.txt` — all Python dependencies pinned.
- `backend/Dockerfile` — `python:3.11-slim` with uvicorn CMD.
- `backend/.env.example` — documented environment variable template.
- `docker-compose.yml` — PostgreSQL 16, Redis 7, backend, frontend services
  with health checks.
- `frontend/Dockerfile` — placeholder frontend container.
- Note: `backend/expected_vars.txt` was removed during reorganization (duplicated
  `.env.example` content).

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
- `frontend/src/app/confirm/[token]/page.tsx` — Token-based merchant confirmation
  page with approve/reject flow and submission state (created during Sprint 1
  review to match work-split spec for `/confirm/[token]` route).
- `frontend/src/lib/ws.ts` — WebSocket client stub with `AgentTraceSocket` class
  (connect, reconnect, trace/status listeners, send, disconnect). Created during
  Sprint 1 review to fill missing file from P3 exit criteria.
- `frontend/src/components/AppShell.tsx` — Sidebar navigation, header, and
  main content layout shell.
- `frontend/src/components/Providers.tsx` — React Query provider wrapper.
- `frontend/src/lib/api.ts` — Axios API client with all endpoint functions.
- `frontend/src/lib/store.ts` — Zustand store for merchant ID and period.
- `frontend/src/types/index.ts` — TypeScript interfaces for all domain types.
- `docs/design/screens/` — Design reference screens from Google Stitch (moved
  from `stitch-screens/` during reorganization, folder names cleaned up).

### P5 — Reconciliation with the parallel implementation

- `backend/app/adapters/sepay.py` — patched in place (not replaced): added
  `split_sender_and_note()`, `normalize_note()`, wired both into
  `process_webhook()`; fixed the 401 path to return the standard error
  envelope with an optional (not required) `Authorization` header.
- `backend/app/adapters/shb.py` — patched in place: added `mock_transaction()`
  realistic-payload generator alongside the existing `SHBAdapter`.
- `backend/app/adapters/csv.py` — replaced: pure `parse_csv()` (no DB) +
  `ingest_csv()`, structured `CsvRowError`/`CsvParseResult` instead of
  string error messages, so parsing is unit-testable without a database.
- `backend/app/adapters/invoice.py` — replaced: direct DB-writer
  (`create_invoice`/`get_invoice`/`get_invoice_for_sale`/`list_invoices`);
  see the "Still open" note above on the unresolved mock-service question.
- `backend/app/services/tax_rules.py` — replaced: loose category matching,
  dataclass returns (`RuleValidation`, `RequiredFieldsResult`,
  `FieldCheck`) instead of plain dicts, `missing_invoice_sales` IDs.
- `backend/scripts/seed_data.py` — replaced: see "Corrections made" #6
  above; now also an importable `async def seed(reset: bool = True)`.
- `backend/tests/test_seed_data.py`, `backend/tests/test_tax_rules.py` —
  rewritten to match the corrected implementations and actual seed values
  (were asserting against the superseded implementation's behavior, e.g.
  1 user instead of 5, `hộ_kinh_doanh`/`beauty_services` instead of
  `salon`/`beauty`, `CLOSED` instead of `RECONCILED`).
- `backend/tests/test_sepay_webhook.py` — extended (not replaced) with
  tests for the new sender_name extraction, the standard error envelope,
  and a missing-header request; the 6 original tests needed no changes.
- `backend/tests/test_adapters/{test_sepay,test_shb,test_csv}.py` — new
  pure-logic unit tests for the corrected/added adapter functions.
- `backend/requirements.txt` — added `pytest`/`pytest-asyncio`/`pytest-cov`
  (the project already had a separate `requirements-dev.txt` with these;
  kept both since `requirements.txt` is what CI/other sessions may install
  and it was silently missing test dependencies).

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

### P5 — Reconciliation verification (2026-07-17)

No Docker in this environment; ran against a real local PostgreSQL 16
(Homebrew, `LC_ALL=en_US.UTF-8` — macOS Sequoia requires this to start) and
a `backend/.venv`, not sqlite or mocks.

```
cd backend && alembic upgrade head
PYTHONPATH=. python scripts/seed_data.py --reset
PYTHONPATH=. python -m pytest tests -v
```

```text
100 passed in 0.66s
```

Seed summary:

```text
merchants=1 stores=1 devices=1 users=5 products=10 sales=30
bank_transactions=23 cash_sessions=1 invoices=28 payment_intents=15
tax_rule_versions=1
```

Also booted the real app (`uvicorn app.main:app`) and re-verified the
merged webhook over real HTTP (not `TestClient`): valid key → `200
{"success": true}` with `sender_name`/`normalized_note` now populated
(previously always null); wrong key → `401` with the standard error
envelope; a payload shaped exactly like the real MB Bank webhook example in
`docs/sepay.md` ("NGO NHAT TAN chuyen tien ...") correctly split into
sender_name="Ngo Nhat Tan".

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
- Added seed data script populating M001 (Salon Hoa) with 23 bank transactions,
  30 sales, 28 invoices, 5 users, and supporting records.
- Added test suite: `test_sepay_webhook.py`, `test_seed_data.py`,
  `test_tax_rules.py`, and `conftest.py` with async DB fixtures.
- Built Next.js 14 frontend with 11 pages (dashboard, exceptions, tax, cases,
  case detail, trace, audit, pos, confirm, confirm/[token]), AppShell layout,
  API client, WebSocket stub, Zustand store, and React Query provider.
  Dashboard uses live API data; other pages use mock data for Sprint 1.
- Fixed frontend `tsconfig.json` target from `es5` to `es2017` for Set spread
  support. Fixed `confirm/page.tsx` Set spread to use `Array.from().concat()`.
- Removed unused `lucide-react` dependency from frontend.
- Updated `.gitignore` to exclude `frontend/node_modules/`, `frontend/.next/`,
  `frontend/next-env.d.ts`, and `code-to-clipboard.html`.
- Verified end-to-end: SePay webhook via localtunnel → DB insert → API fetch →
  frontend display. All working.
- Committed and pushed to `origin/main` (`3446872`).

### 2026-07-17 — Sprint 1 review, gap fixes, and repository reorganization

- Verified all Sprint 1 exit criteria against `docs/04-delivery/00-work-split.md`.
- Fixed three identified gaps:
  1. Created `frontend/src/lib/ws.ts` — WebSocket client stub with
     `AgentTraceSocket` class (was missing from P3 Sprint 1 deliverables).
  2. Fixed `backend/scripts/seed_data.py` — now creates 5 users (U001–U005)
     instead of 1; updated expected count from 1 to 5.
  3. Created `frontend/src/app/confirm/[token]/page.tsx` — dynamic route
     matching the work-split spec for `/confirm/[token]`.
- Repository reorganization:
  - Moved `stitch-screens/` contents into `docs/design/screens/` with readable
    English folder names (10 screen folders renamed from garbled Vietnamese).
  - Moved `docs/tech-stack.excalidraw` and `docs/tech-stack.png` into
    `docs/design/`.
  - Removed `backend/expected_vars.txt` (duplicated `.env.example`).
  - Removed `code-to-clipboard.html` (228KB standalone HTML mockup, was
    gitignored).
  - Removed `frontend/tsconfig.tsbuildinfo` (build artifact); added to
    `.gitignore`.
  - Restored `work-split.md` to `docs/04-delivery/00-work-split.md` (was
    briefly moved to root, reverted).
- Created `AGENTS.md` at repository root with role-based agent instructions
  (P1–P5) pointing to `docs/04-delivery/00-work-split.md` as source of truth.
- TypeScript compiles with 0 errors (`tsc --noEmit` clean).
- All Sprint 1 exit criteria now met. Ready for Sprint 2.

### 2026-07-17 — Real-time transaction notifications (Sprint 2 early)

- Built real-time transaction notification system (Sprint 2 P3 feature):
  - **Backend:** Created `backend/app/core/ws_manager.py` (WebSocket connection
    manager), `backend/app/routers/ws.py` (WebSocket endpoint at
    `/api/v1/ws/transactions`), and modified `backend/app/adapters/sepay.py`
    to broadcast transaction data via WebSocket after successful webhook insert.
  - **Frontend:** Created `frontend/src/hooks/useTransactionSocket.ts` (WebSocket
    hook with auto-reconnect), `frontend/src/components/TransactionToast.tsx`
    (toast popup with green "Tiền vào" badge, amount, note, auto-dismiss 8s),
    and mounted globally in `frontend/src/components/Providers.tsx`.
  - Added `animate-slide-in-right` CSS animation to `globals.css`.
- SePay webhook integration tested end-to-end:
  - Connected MB Bank account (0917963988, NGO NHAT TAN) via SePay.
  - Configured webhook with API Key auth in SePay.
  - Used ngrok tunnel (localtunnel has interstitial page issue blocking webhooks).
  - Real money transfer (10,000đ) successfully triggered webhook → DB insert →
    WebSocket broadcast → toast popup on frontend.
  - SePay webhook logs show `200 OK` with `{"success": true}`.
- Re-enabled strict API key auth on webhook endpoint (was temporarily disabled
  for testing). SePay sends `Authorization: Apikey <key>` header.
- Created `docs/sepay.md` — comprehensive SePay webhook setup and testing guide.
- Security verified: `.env` in `.gitignore`, never committed. No hardcoded secrets.
  Webhook requires auth header. Duplicate transactions handled by canonical ID.

### 2026-07-17 — P5 Sprint 1: independent implementation, then reconciliation

- Started Sprint 1 P5 (adapters, Tax Rules Engine, seed data) from a local
  checkout that was, unknown at the time, 6 commits behind `origin/main`.
  Built adapters, `services/tax_rules.py`, `scripts/seed_data.py`, a
  webhook router, and a minimal `get_bank_transactions`, verified end-to-end
  against a local Postgres, all Sprint 1 exit criteria passing.
- Ran `git status` before considering the work done and discovered
  `origin/main` was 6 commits ahead, one of which
  (`3446872`, author `markiengo`) already implemented almost exactly the
  same scope independently, plus P2's agent/schema scaffolding, P4's full
  router set, and P3's entire frontend.
- Stopped and asked the user how to proceed rather than silently
  overwriting or merging. Directed to compare both, evaluate, and finalize.
- Extracted every overlapping file from `origin/main` via `git show` for a
  side-by-side read (without touching the working tree), read the new
  `tests/conftest.py`/`test_seed_data.py`/`test_sepay_webhook.py`/
  `test_tax_rules.py`, and read `docs/sepay.md` — which revealed the first
  implementation's webhook had been live-tested against a real MB Bank
  account with a real money transfer. That materially changed the plan:
  the webhook's core mechanism and ID convention were treated as proven
  and preserved, not replaced.
- Found and fixed six concrete defects in the first implementation (see
  "Corrections made" under the P5 entry in Current Implementation above),
  the most significant being that its `retrieve_tax_rules()` could not
  satisfy the work-split's literal exit criterion
  `retrieve_tax_rules("salon", "beauty") → 2026.07` at all (confirmed by
  reading its own test, which queries different, non-matching arguments).
- `git stash -u` before pulling (never a commit — nothing was committed
  without being asked), fast-forward pulled `origin/main`, then
  reintroduced the corrected work file by file: patched the proven
  `sepay.py`/`shb.py` in place rather than replacing them; replaced
  `csv.py`/`invoice.py`/`tax_rules.py`/`seed_data.py` wholesale after
  confirming via `grep` that nothing else in the codebase depended on
  their specific internals; rewrote the three DB-integration test files to
  match the corrected behavior; left every P2/P3/P4 file untouched.
- Final verification: 100 tests passed (was 77 before the merge); reseeded
  and reverified every Sprint 1 exit criterion; booted the live app and
  re-tested the webhook over real HTTP, including a payload shaped exactly
  like the real SePay/MB Bank example from `docs/sepay.md`.
- Not committed — left for the user to review and commit, since committing
  wasn't requested.

### 2026-07-17 — Doc sync — LLM model name and env var reconciliation

**Changed:**
- `backend/.env.example`: Updated `LLM_MODEL_PLANNER` and `LLM_MODEL_SPECIALIST` from `deepseek-chat` to `deepseek-v4-flash`; added comments clarifying which config layer uses which env vars (config.py uses `LLM_*`, deepseek.py uses `DEEPSEEK_*`/`OPENROUTER_*`).
- `docs/05-domain/01-ai-advisor.md`: Fixed model name from `deepseek-chat` to `deepseek-v4-flash`; added OpenRouter fallback row; fixed endpoint URL from `/v1/chat/completions` to `/v1`; updated implementation state from Target to Partial; updated last-verified date.
- `docs/04-delivery/01-environment-setup.md`: Updated env var table with correct model names (`deepseek-v4-flash`); added `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `DEEPSEEK_TEMPERATURE`, `DEEPSEEK_MESSAGE_TEMPERATURE`, `DEEPSEEK_PLANNER_THINKING_ENABLED` rows; updated implementation state.
- `docs/03-engineering/05-integration.md`: Fixed LLM provider section model name; added OpenRouter fallback; added `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_MODEL` to configuration env var table.
- `docs/04-delivery/00-work-split.md`: Fixed P2 work description model name from `deepseek-chat` to `deepseek-v4-flash`; added OpenRouter fallback mention.
- `SRS.md`: Fixed Planner Agent LLM model row; fixed LLM provider table (model name, endpoint, auth, added fallback provider row).
- `docs/01-foundation/01-overview.md`: Updated LLM tech stack row from generic "Provider abstraction (no lock-in)" to "DeepSeek V4 Flash (OpenAI-compatible; OpenRouter fallback)".
- `docs/01-foundation/01-overview-and-conventions.md`: Same LLM tech stack row update.

**Reasoning:**
- The agent layer code (`backend/app/agents/deepseek.py`) uses `DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash"` and `DEFAULT_OPENROUTER_DEEPSEEK_MODEL = "deepseek/deepseek-v4-flash"`, not `deepseek-chat`. All docs were stale, referencing the old model name.
- The code has two separate config layers: `config.py` (P4 infrastructure) reads `LLM_PROVIDER`/`LLM_API_KEY`/`LLM_MODEL_PLANNER`/`LLM_MODEL_SPECIALIST`, while `deepseek.py` (P2 agent layer) reads `DEEPSEEK_API_KEY`/`OPENROUTER_API_KEY`/`DEEPSEEK_MODEL`/etc. Docs only listed the `LLM_*` vars and were missing the `DEEPSEEK_*`/`OPENROUTER_*` vars entirely.
- OpenRouter fallback was implemented in code but never documented. Added it to all relevant docs.
- Implementation states were all marked "Target" / "N/A (greenfield)" despite code being implemented. Updated to "Partial" with accurate descriptions and verification dates.
- No frontend docs were touched (user is handling frontend work).

**Verification:**
- `grep -r "deepseek-chat" docs/ SRS.md backend/.env.example` — 0 matches remaining (all replaced with `deepseek-v4-flash`)
- Cross-checked env var names in docs against `backend/app/agents/deepseek.py` and `backend/app/core/config.py` — all match
- Confirmed no frontend docs were modified

**Status:** Documentation sync complete. All non-frontend docs now accurately reflect the actual LLM model name (`deepseek-v4-flash`), env var structure (dual-layer `LLM_*` / `DEEPSEEK_*`), and OpenRouter fallback support.


### 2026-07-17 — Full documentation audit and reorganization

**Changed:**

**File moves (Phase 3):**
- `product.md` → `docs/01-foundation/05-product-spec.md` (git mv)
- `SRS.md` → `docs/02-requirements/06-srs.md` (move)
- `API.md` → `docs/03-engineering/09-api-reference.md` (move)
- `docs/sepay.md` → `docs/03-engineering/10-sepay-integration.md` (git mv)
- `docs/01-foundation/02-agents.md` → `docs/01-foundation/03-agents.md` (git mv, renumbered)
- `docs/01-foundation/03-decisions.md` → `docs/01-foundation/04-decisions.md` (git mv, renumbered)
- `docs/01-foundation/01-overview-and-conventions.md` → `docs/01-foundation/02-overview-and-conventions.md` (move, renumbered)
- `docs/03-engineering/03-security-and-permissions.md` → `docs/03-engineering/08-security-and-permissions.md` (move, renumbered to avoid conflict with 03-api-specifications.md)

**Cross-reference updates (Phase 4) — 15 files:**
- `AGENTS.md`: Updated all doc references (product.md → 05-product-spec.md, SRS.md → 06-srs.md, API.md → 09-api-reference.md, 02-agents.md → 03-agents.md)
- `docs/01-foundation/01-overview.md`: Fixed references to renumbered files (02-agents → 03-agents, 03-decisions → 04-decisions)
- `docs/01-foundation/02-overview-and-conventions.md`: Complete rewrite of document map, source-of-truth hierarchy, task-to-doc map, and required reading order with new file paths
- `docs/01-foundation/03-agents.md`: Fixed internal title and reading order references
- `docs/01-foundation/04-decisions.md`: Fixed product.md reference
- `docs/02-requirements/01-business-requirements.md`: Fixed product.md reference
- `docs/02-requirements/02-stakeholders-and-personas.md`: Fixed 3 product.md references
- `docs/02-requirements/06-srs.md`: Fixed 3 product.md references
- `docs/03-engineering/01-system-architecture.md`: Fixed 03-decisions.md → 04-decisions.md, updated directory map (removed product.md, added AGENTS.md and log.md)
- `docs/03-engineering/08-security-and-permissions.md`: Fixed 2 SRS.md references
- `docs/03-engineering/09-api-reference.md`: Fixed SRS.md reference
- `docs/04-delivery/00-work-split.md`: Fixed 5 product.md references
- `docs/04-delivery/02-testing-spec.md`: Fixed 2 product.md references
- `docs/04-delivery/04-implementation-plan.md`: Fixed product.md reference
- `docs/04-delivery/05-roadmap.md`: Fixed 2 product.md references
- `docs/06-meta/02-handoff-report.md`: Fixed product.md reference, updated LLM provider risk, updated capability matrix, updated completeness checklist

**Content inconsistency fixes (Phase 5) — 20 files:**
- Updated implementation state headers from "Target / N/A (greenfield)" to actual states (Implemented/Partial/Target/Current) with specific code references and verification dates in all 20 docs:
  - `01-foundation/01-overview.md`, `02-overview-and-conventions.md`, `03-agents.md`, `04-decisions.md`
  - `02-requirements/01-business-requirements.md` through `05-non-functional-requirements.md`
  - `03-engineering/01-system-architecture.md`, `02-data-models.md`, `03-api-specifications.md`, `04-permissions-matrix.md`, `05-integration.md`, `06-security.md`, `07-error-codes.md`
  - `04-delivery/02-testing-spec.md`, `03-design.md`, `04-implementation-plan.md`, `05-roadmap.md`
  - `05-domain/02-algorithm.md`, `03-evaluation.md`, `05-compliance.md`
  - `06-meta/01-traceability.md`
- Updated capability matrices in `01-overview.md`, `02-overview-and-conventions.md`, and `06-meta/02-handoff-report.md` from all-Proposed to actual implementation states (Implemented/Partial/Target) with specific code file references
- Fixed "greenfield" claims in context/anti-drift maps in `01-overview.md` and `02-overview-and-conventions.md` to describe actual implementation
- Fixed WebSocket endpoint reference in `03-api-specifications.md` from `/ws/agent-trace/{run_id}` (target) to `/ws/transactions` (implemented)
- Fixed WebSocket section in `09-api-reference.md`: marked agent-trace WS as "Target — not yet implemented", added note about REST alternative
- Updated handoff report risk items: "Chưa có implementation" → "Implementation đã bắt đầu", "LLM provider chưa chọn" → "LLM provider đã chọn"
- Updated handoff report completeness checklist 16.4 from "all Proposed" to "actual state"

**Reasoning:**
- Root files (product.md, SRS.md, API.md) were outside the docs/ tree, making the documentation structure incomplete and cross-references inconsistent. Moving them into docs/ with proper numbering creates a single canonical documentation tree.
- Numbering conflicts existed: two `01-` files in foundation (01-overview.md and 01-overview-and-conventions.md) and two `03-` files in engineering (03-api-specifications.md and 03-security-and-permissions.md). Renumbering eliminates ambiguity.
- All capability matrices claimed "Proposed" and "Chưa implement" despite substantial code existing. This is misleading for any team member reading docs. Updated to reflect actual code state with specific file references.
- All implementation state headers said "Target / N/A (greenfield)" which is factually wrong. Updated each to accurate state with last-verified date.
- The WebSocket docs referenced `/ws/agent-trace/{run_id}` which doesn't exist in code. The actual implemented endpoint is `/ws/transactions`. Marked the agent-trace WS as target spec and documented the REST alternative.
- The handoff report's risk section said "Chưa có implementation" and "LLM provider chưa chọn" — both factually incorrect. Updated to reflect reality.
- The architecture doc's directory map still listed `product.md` as a root file. Updated to show `AGENTS.md` and `log.md` instead.
- Cross-references to old file names (02-agents.md, 03-decisions.md, product.md, SRS.md, API.md) would break after the moves. Updated all references across 15+ files to point to new locations.

**Verification:**
- `grep -r "product\.md" docs/ AGENTS.md` — 0 matches (all replaced with `01-foundation/05-product-spec.md`)
- `grep -r "`SRS\.md`" docs/ AGENTS.md` — 0 old-style matches (all replaced with `02-requirements/06-srs.md`)
- `grep -r "`API\.md`" docs/ AGENTS.md` — 0 old-style matches (all replaced with `03-engineering/09-api-reference.md`)
- `grep -r "N/A (greenfield)" docs/` — 0 matches (all updated to 2026-07-17)
- `grep -r "02-agents\.md" docs/` — 0 matches (all updated to 03-agents.md)
- `grep -r "03-decisions\.md" docs/` — 0 matches (all updated to 04-decisions.md)
- `grep -r "03-security-and-permissions" docs/` — 0 matches (all updated to 08-security-and-permissions.md)
- `git status --short` — shows all moves and modifications
- Cross-checked capability matrix entries against actual code files (matching.py, tax_rules.py, sepay.py, etc.)

**Status:** Full documentation audit complete. All docs are now in the docs/ tree with correct numbering, all cross-references point to correct locations, all implementation states reflect actual code, and all capability matrices show accurate implementation status. Root directory contains only `AGENTS.md` and `log.md` as intended.


### 2026-07-17 — Doc cleanup — delete 13 duplicate/process files

**Changed:**
- Deleted 13 markdown files that were either pure duplicates (content exists in consolidated files) or process docs with no build value:
  - `docs/01-foundation/01-overview.md` — content in `05-product-spec.md`
  - `docs/01-foundation/02-overview-and-conventions.md` — content in `AGENTS.md` + `03-agents.md`
  - `docs/02-requirements/01-business-requirements.md` — content in `06-srs.md` §1, §3
  - `docs/02-requirements/04-functional-requirements.md` — content in `06-srs.md` §5
  - `docs/02-requirements/05-non-functional-requirements.md` — content in `06-srs.md` §6
  - `docs/03-engineering/03-api-specifications.md` — content in `09-api-reference.md`
  - `docs/03-engineering/04-permissions-matrix.md` — content in `08-security-and-permissions.md`
  - `docs/03-engineering/06-security.md` — content in `08-security-and-permissions.md`
  - `docs/03-engineering/07-error-codes.md` — content in `09-api-reference.md`
  - `docs/04-delivery/04-implementation-plan.md` — Draft; `00-work-split.md` covers sprints
  - `docs/04-delivery/05-roadmap.md` — Draft; `05-product-spec.md` §16 has pilot phases
  - `docs/06-meta/01-traceability.md` — Stale (old user story IDs); `06-srs.md` §12 has traceability
  - `docs/06-meta/02-handoff-report.md` — One-time historical report
- Updated references in 8 kept files to point to consolidated versions instead of deleted files:
  - `docs/01-foundation/04-decisions.md` — 8 reference updates
  - `docs/02-requirements/06-srs.md` — 6 reference updates
  - `docs/03-engineering/01-system-architecture.md` — 1 reference update
  - `docs/03-engineering/05-integration.md` — 1 reference update
  - `docs/03-engineering/08-security-and-permissions.md` — header update
  - `docs/03-engineering/09-api-reference.md` — header update
  - `docs/04-delivery/02-testing-spec.md` — 1 reference update
  - `docs/01-foundation/03-agents.md` — 3 reference updates

**Reasoning:**
- 37 markdown files for a 48-hour hackathon is excessive overhead. Many files were created by an automated documentation init tool that generated both individual specs AND consolidated versions, creating a maintenance burden where every update had to be applied twice.
- The consolidated files (`06-srs.md`, `08-security-and-permissions.md`, `09-api-reference.md`) are more useful for the team since they contain all related info in one place. The individual files were never the ones referenced by AGENTS.md or the work-split doc.
- `04-decisions.md` is KEPT — it has unique content (10 architectural decisions with rationale, rejected alternatives, and verification steps) that doesn't exist anywhere else. It is the initial decision register for the project.
- Process docs (`04-implementation-plan.md`, `05-roadmap.md`) were Draft status and duplicated sprint info already in `00-work-split.md` and pilot phases in `05-product-spec.md`.
- `01-traceability.md` referenced old user story IDs (USR-RECON-001 etc.) that were renamed in the two-sided product reframing. `06-srs.md` §12 has the current traceability matrix.
- `02-handoff-report.md` was a one-time generated report from the init-documenter skill with no ongoing value.

**Verification:**
- `grep -r "01-overview\.md" docs/ AGENTS.md` — 0 matches in kept files (only in log.md historical entries)
- `grep -r "04-functional-requirements" docs/ AGENTS.md` — 0 matches in kept files
- `grep -r "06-security\.md" docs/ AGENTS.md` — 0 matches in kept files
- AGENTS.md references only kept files — no broken links
- Doc count reduced from 37 to 24 project markdown files

**Status:** Doc cleanup complete. 37 → 24 files. All cross-references in kept files point to valid locations. `04-decisions.md` preserved as unique initial decision register.

