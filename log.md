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

Both P1 (matching & allocation logic) and P4 (backend infrastructure) have been
merged into `main` as of 2026-07-17. The codebase now has the functional core,
the SQLAlchemy models, the FastAPI application shell, and Docker Compose for
local development.

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
  `/health` endpoint, and 11 router stubs mounted under `/api/v1`: auth,
  merchants, transactions, sales, reconciliation, tax, cases, agents, audit,
  pos, confirm. Each router currently exposes only a `/health` placeholder.
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
- Still excluded: router endpoint implementations, persisted exceptions,
  audit-table writes, NLP implementation, and external integrations.

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
