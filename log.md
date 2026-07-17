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

### P1 Sprint 2 — Reconciliation integration

Status: Implemented and tested on branch
`p1-sprint2-reconciliation-integration` on 2026-07-17.

The Phase 2 implementation follows three explicit integration decisions:

- **1A — isolated truth set:** P1 uses a dedicated in-memory SQLite fixture and
  leaves P5's shared seed untouched.
- **2A — canonical scoring input:** DB-backed candidate scoring requires
  `transaction_id`; callers cannot inject amount, sender, or note values.
- **3A — caller-owned case:** exception creation requires an existing `case_id`.
  P1 validates its merchant/period scope and does not create cases.

Delivered behavior:

- `services/reconciliation.py` maps SQLAlchemy rows to the Sprint 1 functional
  core, derives balances from signed allocation rows, locks and revalidates
  before persistence, and leaves commit/rollback to the caller. Transaction
  capacity includes all canonical allocation rows, including legacy null-sale
  rows, so incomplete detail cannot reopen already-consumed capacity.
- Period reconciliation runs exact matching before candidate matching,
  persists only `AUTO_MATCH`, creates idempotent review/no-match exceptions,
  and is safe to rerun without duplicate allocations or exceptions. Historical
  intent expiry is evaluated at the canonical bank-transaction timestamp.
- `services/cash_reconciliation.py` derives cash sales from allocation rows
  without a bank transaction and applies
  `opening_cash + cash_sales - cash_expenses`. A non-zero discrepancy requires
  a reason and remains `CLOSED`; zero discrepancy becomes `RECONCILED`.
- Reconciliation tools are implemented with typed output. Candidate results
  expose action, deterministic/display scores, factor breakdown, reason codes,
  match method, and confidence method.
- P4's current `payment_allocations` model has no `confidence_method` column.
  Therefore the adapter does not persist heuristic confidence by itself;
  `heuristic_v1` remains in the plan/tool result until a migration can persist
  the value and method together.
- Shared seed-data tests are now explicitly opt-in. Pure P1 tests and the P1
  SQLite truth set no longer seed or mutate the external database implicitly.

P1's isolated truth set contains 25 exact references, 2 ambiguous bank
transactions, 2 no-match transactions, and one cash discrepancy backed by 8
cash allocations totaling 3,200,000 VND. It verifies 25 matches, 5 exceptions,
and every transaction-to-sale pair against the expected map (0 false matches).

Shared-seed follow-up for P5: add allocation-backed balances rather than only
pre-setting sale statuses; add 25 canonical truth mappings and aligned times;
add the two ambiguous and two no-match transactions; and add 8 cash allocation
rows totaling 3,200,000 VND for the 5,200,000/5,080,000 cash case. Until then,
the shared seed is not the normative P1 acceptance set.

#### Phase 2 team integration guide

This section is the handoff contract between P1 and the rest of the team. If a
later implementation conflicts with this guide, preserve the safety gates in
P1's deterministic services and discuss the contract change before modifying
matching or allocation behavior.

##### Ownership and change boundaries

| Owner | Integrates with P1 by | Must not duplicate or bypass |
|---|---|---|
| P1 | Maintaining matching, allocation, DB bridge, cash reconciliation, and their tests | Agent orchestration, routes, migrations, shared production seed, or audit transport |
| P2 | Calling typed reconciliation tools from the agent and treating structured results as truth | Recomputing scores in prompts or converting a confidence number into an automatic write |
| P3 | Displaying summary, exception reasoning, and human-review actions from real APIs | Treating heuristic confidence as a probability or showing a review candidate as already paid |
| P4 | Providing request-scoped `AsyncSession`, endpoint transaction boundaries, models, migrations, and case creation | Writing allocations directly without P1 revalidation or committing inside P1 services |
| P5 | Wrapping tools with DB session/audit handling and aligning the shared seed with the truth set | Accepting caller-supplied amount/sender/note for scoring or using NLP note signals to unlock auto-match |

Expected runtime flow:

```text
P4 endpoint creates/loads case and starts one DB transaction
  -> P2 Reconciliation Agent chooses a typed tool
    -> P5 wrapper injects AsyncSession and writes ToolCall/AuditEvent
      -> P1 deterministic service reads canonical rows and flushes a plan
        -> P4 transaction commits all domain and audit writes together
          -> P3 reads summary/exceptions through the API
```

##### Canonical service and tool calls

Use the P1 orchestration service when reconciling a complete period:

```python
async with session.begin():
    summary = await reconcile_period(
        session,
        case_id=case_id,
        merchant_id=merchant_id,
        period="2026-07",
    )
```

`reconcile_period()` and all P1 persistence functions call `flush()` but never
`commit()`. The P4 endpoint or P5 tool wrapper owns commit/rollback. A failed
allocation must roll back its complete transaction; do not catch a validation
error and commit partially written allocations.

The P1-backed tool contracts are asynchronous and receive `AsyncSession`
through application dependency injection:

- `score_match_candidates(session, transaction_id, time_window_minutes=60, ...)`
- `find_payment_reference(session, reference_number)`
- `create_reconciliation_exception(session, case_id, merchant_id, period, ...)`

The LLM-visible schema should omit `session`; the P5 wrapper injects it. The
LLM-visible scoring input is only `transaction_id` plus an optional time
window. Amount, sender, direction, note, merchant, and existing allocations
must be loaded from the canonical transaction row.

Candidate output contains `action`, `deterministic_score`, `display_score`,
`match_method`, `confidence`, `confidence_method`, `reason_codes`, and factor
details. `action` is the authorization result. In particular:

- P2/P5 must never replace `action` with a rule such as
  `confidence >= 0.95 -> AUTO_MATCH`.
- `confidence` with `confidence_method="heuristic_v1"` is a display/ranking
  value, not a calibrated probability.
- External `note_signals` are integers from 0 to 5 keyed by `sale_id`. They may
  rank or escalate a candidate to review but cannot contribute to the
  deterministic auto-match threshold.
- `HUMAN_CONFIRM`, `UNMATCHED`, and `INVALID` results cannot produce a payment
  allocation until a human or a separate valid deterministic decision exists.

##### Case, exception, and audit coordination

P1 does not create `ReconciliationCase`. P4/P5 must create or load the case
first, then pass its `case_id`, `merchant_id`, and `period`. P1 rejects missing
cases and merchant/period mismatches. Reusing the same case and scope makes
period processing idempotent: consumed bank transactions are not allocated
again, and matching/cash exceptions reuse stable dedupe keys.

P2 owns agent behavior and P5 owns tool-call/audit wrappers. A wrapper should
write `ToolCall` and `AuditEvent` in the same transaction as any exception or
allocation it causes. Audit the canonical `transaction_id`, returned `action`,
scores, reason codes, match method, and human approval where applicable; do
not audit raw LLM prose as the financial decision.

Exception types currently emitted by period reconciliation are:

- `AMBIGUOUS_MATCH` for unresolved duplicate/high competing candidates.
- `NO_MATCH` when no eligible candidate exists.
- `MATCH_REVIEW` for a non-refund decision requiring human review.
- `REFUND_REVIEW` for refunds that cannot be safely linked automatically.
- `CASH_DISCREPANCY` when counted cash differs from expected cash.

The human-readable reason and candidate/cash evidence live inside
`ExceptionRecord.ai_suggestion`; the current model has no separate `reason`
column.

##### P4 model and migration coordination

Payment and sale balances are derived from signed `PaymentAllocation.amount`
rows. `Sale.payment_status` and `PaymentIntent.status` are resulting state, not
the source of financial balance. Any endpoint that accepts a manual split,
deposit, multi-sale payment, or refund should build an allocation plan and call
P1 persistence instead of inserting `PaymentAllocation` directly.

Conventions used by the adapter:

- Bank source amounts are stored as positive values; `transaction_type="out"`
  maps them to a negative domain refund. An incoming row with a negative amount
  is rejected as inconsistent canonical data.
- `PAY-[A-Z0-9]{6}` is the only system payment-reference pattern.
- Historical intent expiry is checked at `BankTransaction.transaction_date`.
- Positive allocations use `PAYMENT` or `DEPOSIT`; refund legs use a negative
  amount and `allocation_type="REFUND"`.
- A transaction's capacity includes every existing allocation row, including
  a legacy row whose `sale_id` is null.
- Row timestamps must remain timezone-aware in PostgreSQL.

The current P4 `payment_allocations` table has `confidence` but no
`confidence_method`. P1 therefore persists fuzzy `confidence` as null rather
than storing an unlabeled heuristic. If P4 adds support, add and deploy the
`confidence_method` migration and adapter update together; do not start storing
heuristic confidence before the label can be persisted.

##### P5 shared-seed contract

The shared seed should encode financial truth with allocation rows, not only
pre-set status strings. To reproduce P1's acceptance case, P5 should provide:

- 25 incoming bank transactions with valid unique `PAY-*` intents, same
  merchant, exact intent amount, eligible sale, and intent valid at transfer
  time; document the expected `transaction_id -> sale_id` map.
- 2 incoming transactions that each see unresolved same-amount candidates and
  therefore produce `AMBIGUOUS_MATCH`, with no allocation.
- 2 incoming transactions outside candidate eligibility that produce
  `NO_MATCH`, with no allocation.
- 8 cash `PaymentAllocation` rows totaling 3,200,000 VND, each with
  `bank_transaction_id=None`, a valid sale/store, and `created_at` inside the
  cash-session window.
- A cash session with opening 2,000,000, expenses 0, counted 5,080,000, and a
  discrepancy reason. P1 derives expected 5,200,000 and discrepancy -120,000.
- Refund examples with an original linked allocation; a referenced refund is a
  negative `REFUND` allocation, while an unreferenced refund is review-only.

Do not count pre-existing `PAID` strings as successful reconciliation when no
supporting allocations exist. The acceptance assertion compares every
persisted bank-transaction/sale pair with the documented truth map so a correct
count with a wrong match still fails.

##### P3/P4 API and UI expectations

The reconciliation start endpoint should create/load the case first and then
invoke the agent or `reconcile_period()` with that case. API responses should
expose separate counts for matched, ambiguous, no-match, review-required, and
cash discrepancies instead of merging every non-match into one confidence
bucket.

Exception UI should display `reason_codes`, factor details, and
`confidence_method`; only `AUTO_MATCH` may appear as automatically paid.
`HUMAN_CONFIRM` must remain actionable in the exception inbox. POS cash
payments must create allocation-ledger rows with `bank_transaction_id=None`,
and cash refunds must be signed negative so cash reconciliation nets them.

##### Integration verification checklist

Before merging a P2/P3/P4/P5 integration with P1:

1. Run `pytest tests/test_matching.py tests/test_allocation.py` to protect the
   deterministic core.
2. Run `pytest tests/test_reconciliation_integration.py
   tests/test_cash_reconciliation.py` without an external database.
3. Run the shared-seed suite with an explicit `DATABASE_URL`; these tests are
   intentionally not autouse for P1's isolated suite.
4. Confirm 25 expected pairs, exactly 5 expected exceptions, and zero false
   transaction/sale pairs.
5. Run reconciliation twice and confirm allocation and exception counts do not
   increase on the second run.
6. Confirm P5 writes one `ToolCall` and `AuditEvent` for every P1-backed tool
   invocation and that a failed transaction leaves neither partial financial
   writes nor misleading success audit records.

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

### 2026-07-17 — P1 Sprint 2 reconciliation integration

- Pulled merged `main` and created branch
  `p1-sprint2-reconciliation-integration`.
- Chose 1A/2A/3A: isolated P1 fixture, canonical `transaction_id` scoring, and
  caller-supplied existing reconciliation cases.
- Added the SQLAlchemy matching/allocation bridge with row-lock revalidation,
  idempotent period processing, and exception persistence.
- Added allocation-backed cash reconciliation and P1 reconciliation tools.
- Added 17 Phase 2 tests plus an isolated 25/5 truth set; changed shared seeded
  tests from implicit autouse setup to explicit opt-in setup.
- Verified 17 Phase 2 tests and the 68-test combined P1/model regression suite.
  The full local suite reports 68 passed and 26 external-DB tests skipped. The
  only warnings are Python 3.14 deprecations emitted by pytest-asyncio.
- Expanded `log.md` with the cross-team Phase 2 handoff contract covering
  ownership, canonical tool calls, transaction/audit boundaries, case and
  exception rules, P4 model constraints, P5 seed requirements, P3 API/UI
  expectations, and the integration verification checklist.

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
