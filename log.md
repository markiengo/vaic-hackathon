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
  - independently verified known sender: `+35`
  - unresolved same-amount duplicate: `-35`
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

### P1 Sprint 3 — Matching calibration and seed truth set

Status: P1-owned matching work implemented and verified on 2026-07-18. Full
cash-seed validation has one open P5 data-contract handoff documented below.

- The auto threshold remains `95`; human threshold remains `75`. P1 did not
  lower either safety gate to reach the demo KPI.
- Known sender weight is calibrated from `+10` to `+35`, but the sender list is
  now an explicit trust boundary. It must come from history independently
  established before the transaction being scored. Copying the current
  transaction's sender into `known_sender_names` is invalid self-corroboration.
- Duplicate-amount penalty is calibrated from `-30` to `-35`. This keeps the
  non-identified rival below 75 even when the transaction sender is trusted,
  while ties and unresolved duplicate groups remain mandatory human review.
- The calibrated fuzzy auto-match path therefore requires three deterministic
  signals: exact amount `+50`, time under five minutes `+10`, and independently
  trusted sender `+35`. Amount plus time alone remains `60`/`70` and cannot
  authorize a financial write. External note signal remains ranking/review only.
- `reconcile_period()` accepts an explicit `matching_config` and documents the
  trusted-sender boundary. Existing callers remain source-compatible because
  the calibrated default is used when no config is passed.
- `backend/tests/test_truth_set.py` imports P5's canonical seed builders into
  P1's isolated in-memory database and declares the expected result for every
  one of the 23 bank transactions and all 30 sales.
- Seed results: 19/23 bank transactions auto-reconciled (`82.61%`), 4 bank
  exceptions, 0 false matches, 25 `PAID` sales, 1 `REFUNDED` sale, and 4
  `UNPAID` sales. The refund creates a `-180,000` `REFUND` allocation against
  `ORDER-1850`. Re-running produces exactly 19 allocations and 4 exceptions.
- The two 85,000 VND transfers remain `AMBIGUOUS_MATCH`; the 5,000,000 VND
  owner transfer and 2,300,000 VND supplier transfer remain `NO_MATCH`.
- The truth-set run includes a hard `<5s` latency assertion and passes locally.

#### Team integration contract

- **P2/P5 sender history:** pass only independently verified prior sender names
  to P1. NLP/note interpretation may rank or escalate but must never be converted
  into trusted sender history or an auto-match score.
- **P4/P2 reconciliation caller:** call `reconcile_period(...,
  known_sender_names=trusted_history)`. Do not build that list from the same
  transaction batch being reconciled. Commit/rollback ownership remains with
  the caller as in Sprint 2.
- **P5 seed data handoff:** the current seed marks eight cash sales `PAID` but
  creates no cash `payment_allocations`; its cash session also has a non-zero
  discrepancy with no `discrepancy_reason`. P1 deliberately does not infer cash
  collections from sale status because that can double-count money. P5 should
  add cash allocation ledger rows and a discrepancy reason before the full raw
  seed can produce the fifth `CASH_DISCREPANCY` exception end-to-end.
- **P5 public scoring tool:** it may expose ranked candidates, but any future
  write path must call P1 persistence and revalidation rather than persisting a
  displayed score directly.

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

### P5 Sprint 2 — 19 tool implementations and audit tracing (2026-07-18)

Status: Implemented and verified against a live local PostgreSQL 16.

All 19 tools P2 stubbed in `app/tools/__init__.py` (`raise
NotImplementedError`) now have real, DB-backed implementations. The
specialist LangGraph nodes (`reconciliation_agent`, `tax_compliance_agent`,
`merchant_ops_agent`) are still placeholders that never call these — this
is the tool layer itself, ready for P2 to wire in when the specialist
nodes stop being placeholders.

#### Interface note: sync stubs became async

P2's stubs were plain `def`s raising `NotImplementedError` synchronously.
Every implementation needs async DB I/O, so all 19 are now `async def`.
Confirmed via `grep` that nothing in the codebase called any of them yet
(the placeholder nodes don't), so this is a zero-risk interface
completion, not a breaking change — P2's future wiring will need `await`.

#### Traceability infrastructure (DEC-001/DEC-004)

`app/tools/_tracing.py` — a `@traced_tool` decorator wraps every one of
the 19 functions. Since tool signatures carry no `db`/`agent_run_id`
parameter (LLM function-calling needs plain JSON-serializable arguments —
see docs/05-domain/01-ai-advisor.md § Tool contracts), a contextvar-based
`agent_run_scope(agent_run_id, agent_name)` async context manager lets the
future agent-execution layer attach a run to whatever tool calls happen
inside it. Every call — with or without an active run — writes an
`audit_events` row (`actor_type="system"` when there's no run in scope);
`tool_calls` additionally gets a row only when a run is in scope, since
`tool_calls.agent_run_id` is a required FK. Only SHA-256 hashes of
input/output are stored, never raw content, per the AI-advisor spec's
privacy section.

#### Return types: honored P2's declared Pydantic schemas, not just params

6 of the 19 stubs declared Pydantic return types (`list[MatchCandidate]`,
`ReconciliationExceptionDraft`, `TaxReadinessReport`, `ToolCallResult`
(×2), `MerchantMessageDraft`) rather than plain `JSONDict`. All of these
schemas set `extra="forbid"` (via the shared `AgentSchema` base), so a
naive dict return would either violate the contract or silently drop
fields a real caller expects. Two implementation consequences:
- `draft_merchant_message`'s confirmation link has no dedicated schema
  field (`MerchantMessageDraft` only has `message`), so the signed token
  is embedded directly in the message text as a URL rather than returned
  as a separate field — which is also just what a real merchant-facing
  message needs anyway.
- `create_reconciliation_exception`'s `ReconciliationExceptionDraft` has
  no `id`/`status` fields, so the persisted exception's actual DB id and
  status are folded into its (flexible, `dict[str, Any]`) `ai_suggestion`
  field so callers aren't blind to what was actually written.

#### Tool-by-tool notes

- **Bank tools** (`get_bank_transactions`, `get_sales_orders`,
  `get_cash_sessions`, `get_invoices`, `find_payment_reference`) — direct
  period-scoped reads; `get_sales_orders` nests each sale's line items;
  `get_cash_sessions` joins through `stores.merchant_id` since
  `cash_sessions` has no direct merchant column; `find_payment_reference`
  looks up a `payment_intents` row by id (that table *is* the "payment
  reference" ledger, not `bank_transactions.reference_number`, which is
  the bank's own separate reference).
- **`score_match_candidates`** — a thin wrapper around P1's
  `app.services.matching.candidate_match()`. The tool signature has no
  `transaction_date`/`transaction_id` (only amount/sender/note), so there
  is no real bank_transaction row to anchor time-proximity scoring to;
  it builds an ephemeral, unpersisted probe transaction using the current
  time. This is correct for real usage (an agent scoring a transaction
  that just arrived), but means testing/demo calls against seed data from
  a different date need a deliberately large `time_window_minutes` to see
  candidates at all — documented in the test file, not a bug in the tool.
  `known_sender_names` is approximated as the distinct sender names seen
  on the merchant's past bank_transactions (no separate "customer" table
  exists to draw this from).
- **`create_reconciliation_exception`** — tolerant of a not-yet-created
  `case_id`: opens the case if missing rather than failing, since
  `exceptions.case_id` is a required FK and the natural agent order
  (Reconciliation finds exceptions; Merchant Ops normally opens cases) can
  run either way depending on the plan.
- **Tax tools** — `retrieve_tax_rules`/`validate_rule_version`/
  `check_required_fields` are thin wrappers over the Sprint 1
  `services/tax_rules.py` functions (dataclasses converted to dicts).
  **`classify_revenue_category`** takes P2's actual declared signature
  (`transaction: JSONDict`) — not the two-string-argument form
  (`classify_revenue_category("SEPAY-49682", "M001")`) originally used to
  illustrate the exit criterion, which predates P2's committed stub.
  Delegates the actual classification to a new pure, deterministic module
  `app/services/revenue_classifier.py` (base 0.50 + weighted evidence
  signals for loan/personal/purchase keyword phrases, an
  amount-matches-a-pending-sale signal, and a prior-pattern-count bonus,
  capped at 0.95) so the documented fixture
  (`{"classification": "internal_transfer", "confidence": 0.82}` for a
  personal-phrase transfer with no matching order) is exactly reproducible
  every run — an LLM call would not guarantee that. Persists the result to
  `tax_classifications` as a side effect (`classified_by="ai"`).
  **`generate_tax_readiness_report`** assembles the full 5-item checklist
  from compliance.md (bank reconciliation rate, cash session closure,
  unclassified transactions, missing invoices, rule version validity) —
  distinct from `check_required_fields`, which only covers the narrower
  "required fields" table in the same doc. Bank-reconciliation rate and
  classification coverage are honestly 0%/low right now since no
  reconciliation matching or classification has run against the seed data
  yet (Sprint 3's job) — `ready=False` at this stage is correct, not a bug.
  **`create_draft_export`** calls `generate_tax_readiness_report`
  internally and refuses (`ERR-TAX-002`) unless it's ready, per
  compliance.md's "only available when tax-readiness = pass" rule.
- **Case tools** — `create_case` is idempotent on a deterministic
  `CASE-{merchant_id}-{period}` id (one case per merchant per period,
  rather than proliferating cases across repeated reconciliation runs).
  `send_confirmation_request(token, message)` takes an opaque,
  already-minted token — nothing among the 19 tools generates one
  explicitly, and `/confirm/{token}` has no backing `confirmation_tokens`
  table, so `draft_merchant_message` mints an HMAC-signed, stateless token
  (`app/services/confirmation_tokens.py` — signed `exception_id:expiry`,
  no new table/migration needed) when it drafts a message, and
  `send_confirmation_request` just validates and "sends" (mocked — no
  real SMS/Zalo/email integration exists) it.
  `export_to_accounting_system` is deliberately *not* gated on
  tax-readiness like `create_draft_export` is — it's a practical MISA-format
  accounting handoff, not the compliance-tied draft tax export ERR-TAX-002
  guards.
- **`app/services/export.py`** — shared data collection
  (`collect_draft_export_data`) plus three renderers: `to_json_dict`,
  `to_csv_text` (flattened sales rows), `to_misa_csv_text` (MISA-shaped
  columns) — used by both `create_draft_export` and
  `export_to_accounting_system`.

### P5 Sprint 3 — End-to-end pipeline validation (2026-07-18)

Status: `app.services.reconciliation.reconcile_period` (P1's Sprint 2
integration layer) had never been run against the seeded `M001` dataset
before this — it existed fully built and tested, but only against P1's own
synthetic SQLite truth set (`tests/p1_db_fixtures.py`), and nothing in the
running application calls it (`POST /reconciliation/start` and
`POST /agents/run` both dispatch literal no-op background tasks). P1's own
Sprint 2 log entry flagged the shared-DB test suite as unverified and
deferred it. This sprint is that verification, run for the first time, plus
the scripts the checklist requires (`validate_pipeline.py`,
`backup_demo.py`, `restore_demo.py`).

#### One collection-blocking bug fixed (not P5's file, but blocked everyone)

`backend/app/agents/runner.py`'s `AgentRunner` dataclass had
`workflow: Any = agent_workflow` — a mutable default with no
`field(default_factory=...)`, which is invalid in Python dataclasses and
made `pytest tests` fail to *collect* at all (not just fail a test). Fixed
with `field(default_factory=lambda: agent_workflow)`, matching the
pattern already used for the class's other three fields. One separate,
non-blocking test failure remains in `test_agents.py`
(`_append_trace`'s `state.get("trace", [])` raises `TypeError` when
`state["trace"]` is explicitly `None`) — left alone; it's P2's own agent
workflow test, doesn't block anything else, and isn't something to fix
without being asked.

#### Two real integration bugs found running `reconcile_period` against seed data for the first time

1. **`app.services.cash_reconciliation.reconcile_cash_session` hard-rejects
   a non-zero discrepancy with no `discrepancy_reason`** — and
   `reconcile_period` doesn't catch that error, so it aborted the *entire*
   period's reconciliation (including already-matched bank transactions)
   before any of it could commit. My seed data left `discrepancy_reason`
   `None` deliberately (product.md: the system detects the gap, a human
   explains it later), which this function doesn't allow. Fixed on my
   side — seeded a placeholder reason string that names the actual
   situation ("chưa xác định nguyên nhân") rather than fabricating an
   explanation, since the underlying product behavior (an unresolved
   `CASH_DISCREPANCY` exception a human must still investigate) is
   unchanged.
2. **`reconcile_cash_session` computes "cash sales" from
   `payment_allocations` rows with `bank_transaction_id IS NULL`** — not
   from `Sale.payment_status`. My seed data set `payment_status = "PAID"`
   directly on the 8 cash sales with zero corresponding allocation rows,
   so cash sales computed as 0 and the intended -120,000 discrepancy came
   out as a wrong, much larger number. Fixed by also inserting a
   `PaymentAllocation` row per cash sale (`bank_transaction_id=None`,
   `match_method="MANUAL"`), with `created_at` explicitly pinned to the
   sale's own timestamp — the allocation window check
   (`created_at BETWEEN cash_session.opened_at AND closed_at`) would
   otherwise use the real seeding wall-clock time, not July 2026.

Both are seed-data fixes, not changes to P1's reconciliation code.

#### One real bug found in my own Sprint 1 seed-scenario design

The 3 "fuzzy match" bank transactions (no payment reference, first-time
sender, 2 minutes after their sale) scored 60 under
`app.services.matching`'s real weights — below the 75 `HUMAN_CONFIRM`
threshold — and fell through to an unlinked `NO_MATCH` exception instead
of a reviewable candidate. Not a bug in P1's algorithm (a bare amount+time
match with no reference or identifier genuinely shouldn't clear a review
threshold on its own — that conservatism is the point). Fixed by adjusting
the scenario: reused "NGUYEN VAN A" (an already-known sender from the
ORDER-1842 exact match) and tightened the arrival time to under a minute,
scoring 80 — a real `MATCH_REVIEW` exception a human resolves in the
Exception Inbox, which is a *better* demo of the product's actual value
proposition than a silent auto-match would have been.

#### One real bug found in my own Sprint 2 tool code

`classify_revenue_category`'s keyword-priority order was wrong:
`elif _matches_any(folded_note, PERSONAL_KEYWORDS) or not sender_name`
fires whenever no sender name could be split out of the note — which is
exactly what happens for "NGUYEN SUPPLIER nhap hang 20/10" (no
sender/note split marker matches "nhap"), so it classified as
`internal_transfer` before the purchase-keyword branch ever ran. Reordered
so keyword-specific signals (loan, purchase) are checked before the
generic no-sender fallback. Caught by `validate_pipeline.py`, not by the
Sprint 2 test suite — the Sprint 2 test for this exact transaction passed
`sender_name="Nguyen Supplier"` by hand instead of letting the adapter's
real (marker-less) parse produce `None`, so it never exercised this path.

#### Truth set: the real, observed outcome (not the aspirational one)

Running the actual engine against the actual seed data gives 16
auto-matched (15 exact + 1 refund) and 8 exceptions across 5 types (2
`AMBIGUOUS_MATCH`, 2 `NO_MATCH`, 3 `MATCH_REVIEW`, 1 `CASH_DISCREPANCY`) —
not literally the early planning docs' "25 matched, 5 exceptions"
headline (written before `reconcile_period`'s richer exception-type
taxonomy existed). Auto-reconciliation is 16/23 bank transactions
(69.6%) — below the ≥80% KPI. This is squarely P1's own stated Sprint 3
task ("tune scoring weights... to reach ≥80%"), not something addressed
by further reshaping seed data to manufacture cleaner matches, which would
undercut the demo's actual point (showing the Exception Inbox handle real
ambiguity). `scripts/validate_pipeline.py`'s `TRUTH_SET` documents the
exact, current, correct expected outcome for all 23 transactions for
whoever picks up that tuning work.

#### Demo support scripts

- `scripts/validate_pipeline.py` — seeds (optional), runs
  `reconcile_period`, and validates: the full 23-transaction truth set,
  tax classification of both non-revenue transactions, invoice detection
  (still exactly `ORDER-1868`/`ORDER-1869`), the 5-item tax-readiness
  checklist, `create_draft_export`'s `ERR-TAX-002` gate,
  `export_to_accounting_system`'s lack of one, and Merchant Ops case
  creation linking all 8 exceptions. Exit code 0/1 for CI use.
- `scripts/backup_demo.py` / `restore_demo.py` — `pg_dump -Fc` /
  `pg_restore --clean --if-exists`, not a hand-rolled per-table exporter;
  19 FK/JSONB-laden tables is exactly what those tools are for.
  `scripts/_pg_dsn.py` parses `settings.DATABASE_URL` once for both.
- `scripts/simulate_sepay_webhook.py` — manual SePay webhook fallback for
  the demo. `--reference PAY-XXXXXX` looks up the real payment_intent and
  replays an exact-match payload (for redoing "Scene 2" live if the real
  tunnel/bank connection fails); `--amount/--note/--sender` posts a
  freeform payload (e.g. for Scene 3's ambiguous-transfer moment).

#### Test-isolation notes (shared session-scoped seeded DB)

`tests/test_end_to_end.py` is the first file, alphabetically, to mutate
the shared `M001` dataset that `conftest.py` seeds once per test session
(`test_cash_reconciliation.py`/`test_reconciliation_integration.py` don't
count — they use an isolated in-memory SQLite fixture). Running
`reconcile_period` changes sale payment statuses, the cash session's
status (`RECONCILED` -> `CLOSED`, since a real unresolved discrepancy
shouldn't self-report as fully reconciled), and adds a prior-pattern
classification that legitimately raises `classify_revenue_category`'s
confidence on a second call. Adjusted the now-order-sensitive assertions
in `test_seed_data.py`, `test_tax_rules.py`, and `test_tools.py` to check
the invariant that's actually true regardless of what ran before them,
rather than only the freshly-seeded-state snapshot; kept the one
exact-value fixture pin (`confidence == 0.82`) in `test_end_to_end.py`,
where it's genuinely guaranteed to run first.

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

### P5 Sprint 2 — 19 tools and audit tracing

- `backend/app/tools/__init__.py` — all 19 stub functions replaced with
  real, `@traced_tool`-wrapped, async DB-backed implementations.
- `backend/app/tools/_tracing.py` — new: `agent_run_scope` contextvar
  scope, `@traced_tool` decorator, SHA-256 input/output hashing,
  `tool_calls`/`audit_events` persistence.
- `backend/app/services/revenue_classifier.py` — new: deterministic
  revenue-classification scoring (`classify_revenue`), no DB/LLM
  dependency, independently unit-testable.
- `backend/app/services/confirmation_tokens.py` — new: HMAC-signed,
  stateless confirmation-link tokens (`generate_confirmation_token`/
  `decode_confirmation_token`), no new table/migration.
- `backend/app/services/export.py` — new: `collect_draft_export_data`,
  `to_json_dict`, `to_csv_text`, `to_misa_csv_text`.
- `backend/tests/test_tools.py` — new: integration tests for all 19 tools
  against the seeded DB, including the exact `classify_revenue_category`
  fixture and two dedicated traceability tests (audit_events written with
  no agent context; tool_calls written with one).
- `docs/05-domain/01-ai-advisor.md` — updated "Implementation state" to
  reflect the 19 real tool implementations.

### P5 Sprint 3 — Pipeline validation and demo support

- `backend/app/agents/runner.py` — one-line fix: `field(default_factory=...)`
  for `AgentRunner.workflow` (was a bare mutable dataclass default,
  blocked `pytest tests` from collecting at all).
- `backend/scripts/seed_data.py` — cash sales now also insert a
  `PaymentAllocation` row each (`bank_transaction_id=None`,
  `match_method="MANUAL"`, `created_at` pinned to the sale's timestamp);
  `discrepancy_reason` is a placeholder string, not `None`; the 3 fuzzy
  transactions' sender changed to the already-known "NGUYEN VAN A" and
  timing tightened to under a minute. See "Two real integration bugs" and
  "One real bug in my own Sprint 1 seed-scenario design" above.
- `backend/app/services/revenue_classifier.py` — reordered keyword checks
  so purchase/loan phrases are checked before the no-sender-name fallback.
  See "One real bug found in my own Sprint 2 tool code" above.
- `backend/scripts/validate_pipeline.py` — new: end-to-end pipeline
  validation script and the 23-transaction `TRUTH_SET`.
- `backend/scripts/_pg_dsn.py` — new: shared `DATABASE_URL` -> pg CLI args
  parsing for backup/restore.
- `backend/scripts/backup_demo.py` / `restore_demo.py` — new: `pg_dump
  -Fc` / `pg_restore --clean --if-exists` snapshot cycle.
- `backend/scripts/simulate_sepay_webhook.py` — new: manual SePay webhook
  fallback for the demo.
- `backend/tests/test_end_to_end.py` — new: 7 tests running the real
  pipeline against the shared seeded DB, reusing `validate_pipeline.py`'s
  truth set rather than duplicating it.
- `backend/tests/test_seed_data.py`, `tests/test_tax_rules.py`,
  `tests/test_tools.py` — 4 assertions made order-independent (see
  "Test-isolation notes" above); no behavior change to the code under test.
- `.gitignore` — excludes `backend/scripts/demo_backups/*.dump`
  (regenerable binary snapshots).

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

### P5 Sprint 2 — 19 tools verification (2026-07-18)

Run from `backend/` against the same local PostgreSQL 16 used for Sprint 1
(reseeded with `--reset` first):

```
PYTHONPATH=. python -m pytest tests -v
```

```text
127 passed in 1.34s
```

Every tool called directly against the seeded DB and checked against its
literal exit criterion or expected behavior:

- `get_bank_transactions("M001","2026-07")` → 23; `get_sales_orders` → 30
  (with nested line items); `get_cash_sessions` → 1
  (`discrepancy=-120000.00`); `get_invoices` → 28.
- `find_payment_reference("PAY-A8F21X")` → `ORDER-1842`;
  `find_payment_reference("PAY-NOPE99")` → `None`.
- `score_match_candidates("M001", 85000, ...)` → exactly the 2 sales
  sharing that amount (`ORDER-1860`/`ORDER-1861`), both scoring 20/100 —
  the duplicate-amount penalty from P1's algorithm applying correctly, not
  a scoring bug.
- `create_reconciliation_exception(...)` → auto-opens the case, persists
  the exception, returns it.
- `retrieve_tax_rules("salon","beauty")` → version `2026.07`;
  `validate_rule_version("2026.07")` → valid.
- `classify_revenue_category({"id": "SEPAY-902194815", ..., "raw_note": "ck
  cho em", "amount": "5000000", "sender_name": None})` →
  `{"classification": "internal_transfer", "confidence": 0.82}` — the
  literal exit criterion, exact match.
- `check_required_fields` → `missing_invoice_sales=["ORDER-1868",
  "ORDER-1869"]`.
- `generate_tax_readiness_report` → `ready=False` (bank_reconciliation 0%,
  22 unclassified — both correct pre-Sprint-3, before any matching or bulk
  classification has run).
- `create_draft_export` → refused with `ERR-TAX-002` (correct, not ready).
- `create_case` → idempotent on `CASE-M001-2026-07`; `assign_task_to_rm`,
  `draft_merchant_message` (message included a real
  `https://taxlens.shb.com.vn/confirm/{token}` link),
  `send_confirmation_request` (decoded that exact token → `SENT`),
  `update_case_status`, `export_to_accounting_system` (MISA CSV,
  `MaChungTu` header present) — all verified.
- Traceability: called a tool with no agent context → `audit_events` row
  written (`actor_type="system"`); called one inside
  `agent_run_scope(run_id, "tax_compliance")` → exactly one `tool_calls`
  row with the correct `agent_name`, `tool_name`, non-null
  `input_hash`/`output_hash`, and `duration_ms`.
- Booted the real app (`uvicorn app.main:app`) after all of the above —
  still starts cleanly.

### P5 Sprint 3 — Pipeline validation (2026-07-18)

Run from `backend/` against the same local PostgreSQL 16:

```
python scripts/seed_data.py --reset
python scripts/validate_pipeline.py
python scripts/backup_demo.py
python scripts/restore_demo.py
python -m pytest tests -q
```

```text
=== TaxLens pipeline validation: M001 / 2026-07 ===
reconcile_period: transactions_scanned=23 matched=16 exceptions=8
  (ambiguous=2, no_match=2, review_required=3, cash_discrepancies=1)
[PASS] x 30 (all 23 truth-set transactions, both tax classifications,
  invoice detection, 3 tax-readiness checks, both export checks, case creation)
ALL PIPELINE VALIDATIONS PASSED

156 passed, 1 pre-existing failure (test_agents.py, not P5 — see above), in 4.2s
```

- Verified `reconcile_period` idempotency directly: ran it twice against
  the same reconciled data — identical `exception_ids`, no new
  `payment_allocations`/`exceptions` rows on the second run.
- Verified backup/restore: backed up, deleted all 8 exception rows
  directly via SQL (simulating demo-run corruption), restored, confirmed
  `payment_allocations`/`exceptions`/`sales` counts matched the backup
  exactly (24/8/30).
- Verified the SePay fallback script in both modes against a live
  `uvicorn` instance: `--reference PAY-31AAAA` correctly looked up the
  real payment_intent (amount 450,000, sale `ORDER-1843`) and got `200
  {"success": true}`; `--amount 5000000 --note "ck cho em" --sender
  "NGUYEN VAN A"` (freeform mode) also got `200`.
- Ran the full test suite twice in a row without reseeding between runs
  to check for state-corruption on repeat execution — stable both times
  (156 passed, same 1 pre-existing failure).

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

### 2026-07-18 — P5 Sprint 2: 19 tool implementations

- Before starting, fetched `origin/main` and found no new P5-relevant
  surprises this time (unlike Sprint 1) — one new docs-reorganization
  commit landed mid-session (`44d3721`, renumbering doc subfolders and
  touching `docs/05-domain/01-ai-advisor.md`, the exact file I was
  updating), so stashed the in-progress Sprint 2 code, pulled, reconciled
  the one-line overlap (clean, no real conflict), and popped the stash
  back.
- Read `app/tools/__init__.py`'s 19 stub signatures (P2's actual committed
  interface, not the informal examples from the original task briefing),
  `app/schemas/agent.py`'s Pydantic contracts, `app/agents/graph.py`
  (confirmed the specialist nodes are still placeholders — nothing calls
  these tools yet), and the AI-advisor/compliance docs for the exact
  checklist items and confidence-fixture requirements.
- Built the traceability layer first (`app/tools/_tracing.py`) since every
  one of the 19 tools needs it: a contextvar-based `agent_run_scope` plus
  a `@traced_tool` decorator, since the tool signatures (constrained to
  JSON-serializable LLM function-calling arguments) have no room for a
  `db` session or `agent_run_id` parameter.
- Implemented all 19 tools, wrapping P1's `candidate_match()` for
  `score_match_candidates`, Sprint 1's `tax_rules.py` service for the tax
  tools, and building three new small services along the way:
  `revenue_classifier.py` (deterministic, so the documented 0.82
  confidence fixture is exactly reproducible — an LLM call alone could not
  guarantee that), `confirmation_tokens.py` (stateless signed tokens,
  since `/confirm/{token}` has no backing table), and `export.py`
  (shared JSON/CSV/MISA-CSV export rendering).
- Initially wrote 6 of the 19 to return plain dicts where P2 had declared
  actual Pydantic return types (`MatchCandidate`, `ReconciliationExceptionDraft`,
  `TaxReadinessReport`, `ToolCallResult` ×2, `MerchantMessageDraft`) —
  caught this on review and fixed all 6 to construct the real declared
  types, which surfaced that `MerchantMessageDraft` and
  `ReconciliationExceptionDraft` both set `extra="forbid"` and have no
  field for a confirmation token/persisted id respectively, so adjusted
  the design (token embedded in the message text; id/status folded into
  the flexible `ai_suggestion` dict) rather than fighting the schema.
- Verified against the live seeded DB with a throwaway script before
  writing formal tests, found and fixed one real bug this way
  (`score_match_candidates` returned zero candidates against seed data
  because its "now" time anchor is ~a week off from the July seed dates —
  correct behavior for real-time production use, a test-only artifact
  here), then wrote `tests/test_tools.py` (22 tests) covering every tool
  plus two dedicated traceability tests.
- Full suite: 127 passed (105 before Sprint 2 + 22 new). Re-booted the app
  to confirm nothing broke.
- Not committed — left for the user to review.

### 2026-07-18 — P1 Sprint 2 rework verification dependency

**Changed:**
- `backend/requirements.txt`: Added `aiosqlite==0.22.1`.
- `backend/requirements-dev.txt`: Added `aiosqlite>=0.20,<1`.

**Reasoning:**
- The P1 rework branch correctly ports reconciliation and cash-session tests
  onto current `origin/main` using dedicated in-memory async SQLite fixtures in
  `backend/tests/p1_db_fixtures.py`.
- Those fixtures require SQLAlchemy's `sqlite+aiosqlite://` async driver, but
  the branch did not declare `aiosqlite`, so a fresh test environment failed
  before reaching the P1 assertions.
- Added the dependency only to backend requirements; no P4/P5 tool, seed,
  tax-rule, adapter, WebSocket, docs-structure, or frontend files were changed.

**Verification:**
- Installed backend dev requirements locally for test execution.
- With local dummy env vars, ran:
  `python -m pytest tests/test_cash_reconciliation.py tests/test_reconciliation_integration.py -q`
  — 18 passed.
- Attempted broader shared backend smoke tests with SQLite/dummy env:
  `python -m pytest tests/test_tools.py tests/test_seed_data.py tests/test_tax_rules.py tests/test_sepay_webhook.py tests/test_adapters -q`
  — blocked before assertions because the shared seed fixture expects the
  configured database to already have application tables (`no such table:
  merchants`). This is an environment/schema setup issue for that broad command,
  not a failure in the P1 SQLite fixture suite.

**Status:** P1 rework branch is structurally clean and P1-focused tests pass
after declaring the missing async SQLite dependency. Broader shared tests should
be rerun in the normal backend database environment before final merge.

### 2026-07-18 — P4 Sprint 2 endpoint integration

**Changed:**
- Ported the 18 commits from `origin/P4-Sprint2` onto current `origin/main`
  with `git cherry-pick --no-commit`, preserving newer P1/P2/P5 files from
  main instead of raw-merging the stale branch.
- `backend/app/core/security.py`: Added JWT, bcrypt password verification,
  RBAC helpers, and structured `TaxLensError` support.
- `backend/app/routers/`: Integrated P4 Sprint 2 route work for auth,
  merchants, transactions, reconciliation, tax, cases, agents, audit, POS,
  confirmation, and WebSocket endpoints.
- `backend/app/schemas/`: Added auth, confirmation, POS, and reconciliation
  schemas; extended agent tax checklist serialization aliases required by the
  P4 tax endpoint.
- `backend/app/core/ws_manager.py` and `backend/app/routers/ws.py`: Added
  per-run agent-trace WebSocket support while keeping the existing transaction
  WebSocket.
- `backend/expected_vars.txt`: Added Sprint 2 backend environment variable
  checklist from P4.

**Reasoning:**
- `P4-Sprint2` was based on an older main and `origin/main..origin/P4-Sprint2`
  appeared to delete P1/P2 reconciliation services and tests. Those deletes
  were stale-branch artifacts, not desired Sprint 2 changes.
- Cherry-picking the actual branch commits from the merge base brought in P4's
  endpoint work without deleting `backend/app/services/reconciliation.py`,
  `backend/app/services/cash_reconciliation.py`,
  `backend/app/tools/reconciliation.py`, or the P1/P2 tests already on main.
- Kept the integration backend-only so P3's active frontend/design WIP in the
  main checkout remains untouched.

**Verification:**
- `python -m compileall -q app tests` — passed.
- Targeted pyflakes on all touched P4 files — passed after removing one unused
  import from `backend/app/routers/confirm.py`.
- `git diff --check` — passed.
- Imported `app.main` with dummy test env vars and confirmed the expected P4
  routes are mounted, including `/api/v1/auth/login`,
  `/api/v1/merchants/{merchant_id}`, `/api/v1/reconciliation/start`,
  `/api/v1/agents/run`, `/api/v1/agents/runs/{run_id}/trace`,
  `/api/v1/pos/*`, `/api/v1/confirm/{token}`, and
  `/api/v1/ws/agent-trace/{run_id}`.
- With local dummy env vars, ran:
  `python -m pytest tests/test_cash_reconciliation.py tests/test_reconciliation_integration.py -q`
  — 18 passed.
- Attempted broader seed-backed tests with SQLite/dummy env. They are blocked
  by existing Postgres-specific model/schema assumptions (`JSONB` and shared
  seed fixture requiring pre-created application tables), so they should be
  rerun in the normal Postgres backend environment.

**Status:** P4 Sprint 2 endpoint code has been integrated onto current main
without rolling back P1/P2/P5. Remaining confidence gate is normal Postgres
backend verification for seed-backed API/tool suites.

### 2026-07-18 — P5 Sprint 3: end-to-end pipeline validation

- Read the current work-split doc fresh (it had been restructured since
  Sprint 2) and surveyed the codebase before starting: P1's Sprint 2
  reconciliation integration (`reconcile_period`,
  `reconcile_cash_session`) and P2's agent-tool wiring
  (`app/agents/specialists.py`, `executor.py`) had both landed on `main`,
  but neither is actually called by anything running — both
  `POST /reconciliation/start` and `POST /agents/run` dispatch no-op
  background tasks, and the specialist `reconciliation_node` always emits
  one hardcoded `PENDING_REVIEW` exception instead of using the real
  matching path. P1's own Sprint 2 log entry had already flagged the
  broader shared-DB test suite as unverified and deferred it — this
  sprint's core job was exactly that verification.
- Fixed a one-line dataclass bug in `app/agents/runner.py` that blocked
  `pytest tests` from collecting at all (not my file, but blocked
  everyone — see "Created and updated files" above for the exact issue).
- Ran `reconcile_period` against the seeded `M001` data for the first time
  ever via a throwaway probe script and hit an immediate hard crash: a
  cash discrepancy with no `discrepancy_reason` aborts the *entire*
  period's reconciliation, not just its own exception, because
  `reconcile_cash_session`'s error isn't caught. Traced it to my own
  Sprint 1 seed data (`discrepancy_reason=None`, deliberately, to match
  "system detects it, human explains later") conflicting with P1's
  function requiring the reason up front. Fixed on my side with an
  honest placeholder string.
- Fixing that revealed a second, deeper bug: the cash discrepancy came
  out wrong (not -120,000) because `reconcile_cash_session` sums cash
  sales from `payment_allocations` rows with `bank_transaction_id IS
  NULL`, not from `Sale.payment_status` — which is what my seed data set
  directly with zero corresponding allocation rows. Fixed by inserting a
  `PaymentAllocation` row per cash sale with `created_at` pinned to the
  sale's own timestamp (the allocation-window check would otherwise use
  real wall-clock seeding time, landing outside the cash session's July
  2026 window).
- With the pipeline actually running end-to-end, found that my 3 "fuzzy
  match" transactions from Sprint 1 scored only 60 under P1's real
  weights — below the 75 human-review threshold — and fell through to an
  orphaned `NO_MATCH` instead of a reviewable candidate. Concluded this
  is correct, conservative engine behavior, not a bug to route around;
  fixed the scenario itself (known sender, tighter timing) so it lands
  where it was always supposed to: `MATCH_REVIEW`.
- `validate_pipeline.py` then caught a real bug in my own Sprint 2 code:
  `classify_revenue_category` misclassified the "nhap hang 20/10"
  purchase transaction as `internal_transfer` because the no-sender
  fallback was checked before the purchase-keyword check. The Sprint 2
  test suite never caught this because it hand-supplied a sender name
  instead of exercising the adapter's real (marker-less, so `None`)
  parse of that exact note.
- Documented the real, observed truth set (16 matched, 8 exceptions
  across 5 types — not the early planning docs' "25/5" headline, written
  before this exception-type taxonomy existed) rather than reshaping seed
  data to force a number, since the actual auto-reconciliation-rate gap
  (69.6%, target ≥80%) is explicitly P1's own stated Sprint 3 tuning task.
- Built `validate_pipeline.py`, `backup_demo.py`/`restore_demo.py` (real
  `pg_dump -Fc`/`pg_restore`, not a hand-rolled exporter), and
  `simulate_sepay_webhook.py` (manual fallback, tested in both modes
  against a live server), plus `tests/test_end_to_end.py`.
- Adding a test that mutates the shared session-scoped seeded DB
  surfaced 4 pre-existing tests whose assertions silently assumed
  "nothing has reconciled yet" — fixed each to assert the invariant
  that's actually true regardless of execution order, keeping the one
  exact-value fixture pin in the test that's genuinely guaranteed to run
  first.
- Verified everything together: full pipeline validation (30/30 checks),
  backup/restore cycle (simulated corruption, confirmed exact restore),
  reconciliation idempotency, both fallback-script modes against a live
  server, and the full test suite run twice in a row without reseeding.
  156 passed both times (1 pre-existing, not-mine failure in
  `test_agents.py`, left alone).
- Not committed — left for the user to review.

### 2026-07-18 — P1 Sprint 3 matching calibration and truth-set integration

**Changed:**

- Fast-forwarded local `main` to `origin/main@60cdc9b` and created the fresh
  branch `p1-sprint3-matching-truth-set`; no Sprint 2 branch was merged into it.
- `backend/app/services/matching.py`: calibrated trusted sender from `+10` to
  `+35` and duplicate penalty from `-30` to `-35`; documented that sender
  history is caller-supplied trusted evidence, not a value copied from the
  transaction under evaluation.
- `backend/app/services/reconciliation.py`: added optional `matching_config` to
  `reconcile_period()` and passed it to candidate matching, preserving all
  existing callers through the default.
- `backend/tests/test_matching.py` and
  `backend/tests/test_reconciliation_integration.py`: updated expected factor
  values and added a calibration case proving trusted history reaches 95 while
  the same amount/time evidence without history remains unmatched.
- `backend/tests/test_truth_set.py`: added an isolated, reproducible evaluation
  over P5's 23 canonical bank transactions and 30 sales, with explicit expected
  IDs, exact/fuzzy/refund allocations, exception classes, status counts,
  idempotence, false-match, and `<5s` latency assertions.
- `docs/05-domain/02-algorithm.md`: synchronized the normative scoring weights,
  sender trust boundary, calibration rationale, and canonical `SEPAY-*` IDs.
- `docs/05-domain/03-evaluation.md`: documented every seeded bank transaction's
  expected outcome and the exact KPI calculations.

**Reasoning:**

- Lowering the auto threshold or allowing note/NLP score into the threshold was
  rejected because either choice would weaken the false-match policy agreed in
  Sprint 1. Three deterministic signals are required for the calibrated fuzzy
  path: exact amount, under-five-minute timing, and independent sender history.
- Raising only sender weight made a non-identified duplicate rival land exactly
  at 75, which would correctly block auto-match but also prevent a truly unique
  identifier from resolving its duplicate group. Raising duplicate penalty to
  35 keeps that rival at 70 and preserves both safety rules.
- P1 imports P5 seed builders in the test rather than copying their fixtures, so
  future seed-ID or amount drift fails visibly. P1 does not modify P5's seed file.
- Cash is intentionally excluded from the raw-seed matching fixture because the
  current P5 seed lacks cash allocation ledger rows and discrepancy reason. P1
  keeps allocation ledger as source of truth instead of deriving money from a
  status flag and risking double-counting.

**Verification:**

- P1 focused suite with isolated fixtures:
  `python -m pytest tests/test_matching.py tests/test_allocation.py
  tests/test_cash_reconciliation.py tests/test_reconciliation_integration.py
  tests/test_truth_set.py -q -p no:cacheprovider --noconftest` — `51 passed`.
- Sprint 3 truth set alone — `3 passed`; assertions verify `19/23 = 82.61%`
  bank auto-reconciliation, 0 false matches, refund allocation correctness,
  25/30 `PAID` sales, idempotence, and latency below 5 seconds.
- `python -m pyflakes` over all changed Python files — passed.
- Broader local SQLite regression, excluding environment-incompatible tests —
  `142 passed, 1 deselected`. The local interpreter lacks installed `langgraph`
  and `python-jose` despite both being declared in requirements; one existing P5
  public scorer test also relies on PostgreSQL returning timezone-aware
  timestamps whereas SQLite returns naive values. These are not P1 regressions.

**Status:** P1 Sprint 3 matching calibration and bank truth set are complete.
The remaining full-seed cash handoff is documented for P5 and does not require
weakening or bypassing P1's ledger invariants.

### 2026-07-18 — Full-system regression and cross-role integration fixes

**Changed:**

- `backend/app/tools/__init__.py`: normalized ORM sale timestamps to UTC at the
  P5 tool → P1 matching-domain boundary. PostgreSQL supplies timezone-aware
  values, while SQLite and some legacy/import adapters can return naive values;
  the adapter now restores the canonical UTC interpretation before P1 scoring.
- `backend/requirements-dev.txt`: made standalone development ranges compatible
  with the runtime pins and declared the previously missing `asyncpg`,
  `passlib[bcrypt]`, and `pytest-cov` dependencies.
- `frontend/package-lock.json`: synchronized the lockfile with `package.json`,
  allowing a clean `npm ci` instead of failing on a missing transitive
  `es-abstract` package and a stale `lucide-react` entry.
- `frontend/.eslintrc.json`: added the non-interactive Next.js Core Web Vitals
  lint configuration required by CI.
- `frontend/src/app/layout.tsx`: documented and locally suppressed the
  app-router font rule for the intentionally shared Material Symbols icon font.

**Reasoning:**

- P1 domain models deliberately reject naive datetimes because timezone guesses
  inside financial matching can alter candidate ordering. Timestamp repair
  belongs at the persistence/tool adapter boundary, where UTC is the documented
  database meaning; P1's invariant remains strict.
- The previous dev requirements could not be installed together with runtime
  requirements because their lower bounds excluded the pinned versions, and a
  fresh environment could not import webhook/security or PostgreSQL modules.
- Frontend source compiled, but the stale lockfile made reproducible installation
  fail and the missing ESLint config opened an interactive prompt. Both are CI
  integration defects, so they were fixed without changing product behavior.

**Verification:**

- `python -m pip check` — no broken requirements.
- Full backend suite against a generated SQLite test schema — `154 passed`.
- P1 matching/allocation/reconciliation/truth-set suite — `51 passed`.
- Targeted `pyflakes` over the P1 services and P5 adapter — passed.
- FastAPI smoke check — `/health` returned HTTP 200; 43 routes registered.
- Clean frontend install — `npm ci` passed (417 packages).
- Frontend lint — no warnings or errors.
- Frontend production build — passed; TypeScript validation and all 12 routes
  completed successfully.

**Environment notes:**

- Docker and a local PostgreSQL client/server were unavailable, so the backend
  integration run used SQLite with test-only SQLAlchemy JSONB/BigInteger dialect
  adapters. PostgreSQL-specific deployment behavior remains a CI/staging gate.
- Python 3.14 emitted dependency deprecation warnings from FastAPI, LangGraph,
  Starlette, and `pytest-asyncio`; none were application failures.
- Next.js 14.2.5 still reports its upstream security advisory during install.
  Upgrading Next.js should be handled by P3/tech lead as a dedicated dependency
  change with UI regression testing, rather than silently bundled into P1 work.

**Status:** Full locally executable regression is green, including all P1
financial logic and its P5/P4 integration paths. No known application test,
lint, build, dependency, or health-smoke failure remains in this branch.

### 2026-07-18 — P2 Sprint 3: Vietnamese NLP, inline business guidance, evaluation gates

**Changed:**

- `backend/app/services/vietnamese_nlp.py` (206 lines): NFC normalization,
  abbreviation expansion ("ck"→"chuyển khoản", "tt"→"thanh toán", etc.),
  diacritic restoration ("toc"→"tóc"), transaction type classification with
  confidence scores.
- `backend/app/agents/prompts.py`: Inline business guidance injected into all 4
  agent prompts (planner, reconciliation, tax, merchant ops). Each gets
  domain-specific context (Vietnamese note clues, confidence thresholds,
  message drafting rules).
- `backend/app/agents/specialists.py`: Reconciliation node now calls
  `interpret_transaction_note()` and passes the expanded note to
  `score_match_candidates` instead of raw text. `note_interpretation` added to
  graph state and output.
- `backend/app/agents/evaluation.py` (172 lines): Sprint 4 quality gates —
  structured output validation against Pydantic schemas, message quality scoring
  (Vietnamese markers + action markers + context), confidence calibration
  (≥80% agreement, 0 overconfident errors), hallucination rate (<5%), latency
  check.
- `backend/app/agents/__init__.py`: Updated exports for new evaluation module.
- `backend/app/agents/graph.py`: Added note_interpretation to graph state.
- `backend/tests/test_vietnamese_nlp.py` (4 tests, 50 note cases): NFC,
  abbreviation, diacritic, classification coverage.
- `backend/tests/test_agent_evaluation.py` (6 tests): Schema validation,
  message quality, confidence calibration, hallucination, latency.
- `backend/tests/test_agents.py`: Updated to verify note interpretation flows
  through the agent graph.

**Reasoning:**

- NLP is deterministic (regex + dictionary, no ML dependency) to keep the
  hackathon MVP reliable and avoid model hosting complexity.
- Note interpretation is injected at the reconciliation node boundary rather
  than inside the matching service, preserving P1's clean domain interface.
- Evaluation module is structured for Sprint 4 reuse — quality gates are
  independent and composable.

**Verification:**

- `pytest tests/test_vietnamese_nlp.py -v` — 4/4 pass, 50-case accuracy ≥85%.
- `pytest tests/test_agent_evaluation.py -v` — 6/6 pass.
- `pytest tests/test_agents.py -v` — all pass, note interpretation verified in
  graph output.

**Status:** P2 Sprint 3 complete. NLP, prompt guidance, and evaluation gates
delivered. No `log.md` entry was written by P2 — this entry was added by P3
(team lead) during merge integration.

### 2026-07-18 — P4 Sprint 3: Endpoint fixes, ERR-TAX-003 dead code path, integration tests

**Changed:**

- `backend/app/routers/reconciliation.py`: POST /reconcile endpoints now return
  HTTP 202 instead of 200, matching spec API-RECON-POST-001 for async
  acceptance.
- `backend/app/routers/tax.py`: Fixed ERR-TAX-003 dead code path — now uses
  `case.tax_rule_version` to detect expired rules instead of the unreachable
  branch.
- `backend/app/routers/merchants.py`: Expanded merchant management endpoints
  (+112 lines).
- `backend/app/routers/pos.py`: Minor endpoint fixes.
- `backend/app/routers/audit.py`: Minor fixes.
- `backend/app/routers/transactions.py`: Enhanced transaction query endpoints.
- `backend/app/core/security.py`: Minor fix.
- `backend/app/schemas/reconciliation.py`: Added schema field for async
  response.
- `backend/tests/test_integration.py` (845 lines, 37 test cases): Covers 22/28
  error codes — comprehensive integration test suite.

**Reasoning:**

- 202 vs 200 for async reconcile: spec explicitly states 202 Accepted for
  endpoints that dispatch background processing.
- ERR-TAX-003 fix: the original code path was unreachable because it checked a
  condition that could never be true given the query logic. Using
  `tax_rule_version` from the case record is the correct domain approach.
- Integration tests cover error codes systematically to catch regressions in
  Sprint 4.

**Verification:**

- `pytest tests/test_integration.py -v` — 37 test cases covering 22/28 error
  codes.
- Manual smoke test of POST /reconcile — returns 202 as expected.
- ERR-TAX-003 path verified with expired tax rule fixture.

**Status:** P4 Sprint 3 complete. Endpoint spec compliance, dead code fix, and
integration test suite delivered. No `log.md` entry was written by P4 — this
entry was added by P3 (team lead) during merge integration.

### 2026-07-18 — P3 Sprint 4: Frontend product integration on current main

**Changed:**

- Created the clean delivery branch `p3-frontend-design-consistency-final` from
  integrated `origin/main@13a3b74` and selectively ported only P3-owned
  `frontend/**` work. The old 44-commit mixed-role branch was not merged or
  rebased, preventing stale P1/P2/P4/P5 implementations from replacing the
  current shared code.
- Replaced the starter frontend with the complete TaxLens Next.js product:
  secure same-origin session gateway, seven-screen merchant workspace, SHB
  operations workspace, public confirmation, settings/import, sales/QR/cash,
  assistant evidence, responsive navigation, dark mode, accessible primitives,
  loading/empty/error states, and API/SSE/WebSocket client contracts.
- Preserved the supplied Stitch HTML/screens and brand assets as design
  references while implementing the approved TaxLens visual system as reusable
  React components. Removed Material Symbols from the app layout and retained
  the locked Momo Trust Display, Newsreader, JetBrains Mono, navy, cream, and
  orange identity.
- Fixed the Playwright release harness to exercise a production server instead
  of a hot-reload development server. The test build alone disables Next
  standalone output; deploy builds remain standalone. Dev-only showcase routes
  are exposed only when `PLAYWRIGHT_TEST=1`.
- Updated the compact transactions visual baseline after production rendering
  correctly wrapped filter controls instead of clipping them.
- Added `docs/demo-script.md` with exactly six scenes, an 8:30 runbook, expected
  outcomes, presenter cues, recovery paths, rehearsal records, and claim
  guardrails. The pitch deck was explicitly deferred by the product owner and
  was not created or modified.
- Ported `docs/04-delivery/03-design.md`, the frontend build state/acceptance
  documents, and `frontend-design-consistency-cf1ebe.md`. Changes to the
  original plan are additive/minor: current evidence, fresh-branch state, P3
  scope guard, owner blockers, and dependency risk are recorded without
  rewriting the 14-stage plan.

**Reasoning:**

- Current `main` already contains the teammates' Sprint 3 work. A whole-branch
  merge would conflict with and potentially regress calibrated matching,
  Vietnamese agent logic, backend security/routes, and the data pipeline, so
  P3's frontend was ported as a role-owned tree onto a fresh base.
- Production-mode browser tests are more representative and deterministic than
  Next development mode. The earlier dev run showed Fast Refresh navigation
  races; the production harness removes that false failure class while keeping
  deployment configuration unchanged.
- Integrated-main contract review found missing or incompatible runtime
  contracts for invoices, full tax readiness, agent streaming/approvals,
  realtime payment allocation, portfolio ops, and settings integrations. Those
  belong to P1/P2/P4/P5, so P3 records exact blockers rather than duplicating or
  overwriting teammate code.
- `npm audit` reports two moderate entries for one transitive PostCSS advisory
  pinned by the latest stable Next 16. There is no patched stable Next 16;
  npm's suggested Next 9 downgrade and preview/canary adoption would create more
  release risk. The current risk is accepted conditionally because no dynamic
  or user-controlled CSS processing path exists.

**Verification:**

- `npm ci` — 499 packages installed from the committed lockfile.
- `npm run lint` — pass.
- `npm run typecheck` — pass.
- `npm test -- --run` — 13 files, 41/41 tests pass.
- `npm run build` — pass; all 27 app routes compile and prerender as expected.
- `npm run test:e2e` with isolated production server — 33/33 tests pass across
  desktop, compact, and mobile. Coverage includes accessibility, keyboard,
  responsive overflow, visual snapshots, ledger, readiness, sales, settings,
  assistant, SHB ops, and public confirmation.
- `npm ci --dry-run --ignore-scripts` — manifest and lockfile are consistent.
- `git diff --check` over executable frontend and P3-owned docs — pass. The raw
  Stitch reference HTML/design files retain eight pre-existing trailing-space
  lines intentionally so the supplied reference assets remain byte-for-byte.

**Status:** P3-owned frontend product and deterministic browser gate are
complete. Live six-scene rehearsal is pending because integrated-main backend
contracts and demo data are owned by other Sprint 4 roles. No backend, matching,
agent-core, infrastructure, seed, reset, or data-pipeline file was modified.

### 2026-07-18 — P3: Integrated-main frontend contract hardening

**Changed:**

- Added one canonical dashboard adapter shared by the merchant dashboard and
  SHB operations views. It accepts both the documented rich response and P4's
  merged `matched`, decimal rate, boolean readiness, and missing-score shape;
  recent transactions are loaded through the existing transaction client and
  remain an optional enhancement.
- Normalized P4's `{transactions, total}` response, P4's bare sales array, the
  compact tax-readiness checklist, and the SePay WebSocket envelope into the
  stable frontend domain model. Tax export now uses the merged `POST` contract
  and exposes only the supported JSON and CSV formats.
- Removed the development-only `/pos/demo-payments` action because no such
  merged endpoint exists. Cash receipts now fall back to the returned cash
  session identifier when P4 omits `allocation_id`, avoiding
  `CASH-undefined`. A missing `/pos/context` contract now produces an explicit
  unavailable state rather than leaving checkout silently inert.
- Kept the future SSE assistant contract but added a compatibility fallback to
  merged `POST /agents/run`. A `PLANNING` response is displayed as accepted and
  waiting for backend execution; approval actions are queried only when a run
  actually emits an approval checkpoint.
- Corrected frontend session expiry to `ERR-AUTH-002`, made nullable transaction
  match status truthful, and removed proven-unused scaffold assets, legacy
  ESLint config, and domain declarations. Supplied Stitch/reference assets,
  fixtures, showcase routes, snapshots, and all used dependencies were kept.
- Expanded contract tests to cover P4's exact dashboard/readiness shapes,
  nullable/default response fields, SePay's merged WebSocket wrapper, the cash
  receipt fallback, POST tax export, and the non-streaming agent fallback.

**Reasoning:**

- The frontend previously passed mocked browser tests while bypassing main's
  actual response shapes in Ops and calling two routes absent from main. One
  adapter per domain prevents future consumer drift without editing P4-owned
  routers or P2-owned agent execution.
- Main currently accepts reconciliation/agent work in `PLANNING` but provides no
  lifecycle transition. The UI must not claim completion or poll indefinitely;
  it now reports the accepted state exactly and preserves the SSE path for the
  owning backend team to activate later.
- Dead-code removal required both symbol/import scans and repository-wide
  reference scans. Ambiguous or intentional material was retained, including
  the contract-correct but currently secondary `startAgentRun` client.

**Verification:**

- `npm test -- --run tests/ledger-api.test.ts tests/domain-contracts.test.tsx tests/sales-workspace.test.tsx tests/agentops-contract.test.tsx` — 4 files, 18/18 tests pass.
- `npm run typecheck` — pass.
- `npm run lint` — pass.
- `git diff --check` — pass for this compatibility slice.

**Status:** P3 compatibility hardening complete. Remaining live-contract gaps
are explicitly owned elsewhere: P4 must provide POS context, authenticated
dashboard/reconcile, merchant portfolio and operations routes; P1/P4 must
persist matching fields and correct the dashboard count; P2/P4 must execute and
transition agent/reconciliation runs. No teammate-owned file was modified.

### 2026-07-18 — P3: Release documentation and final browser gate

**Changed:**

- Replaced the generic create-next-app README with Vietnamese-first TaxLens
  onboarding: supported Node/npm flow, server-only backend URL, same-origin
  gateway, WebSocket/cookie variables, real route map and exact release gates.
- Reconciled the six-scene demo script with P5's validated truth set of 23 bank
  transactions, 15 matched and 8 exceptions. Hương now owns the merchant
  `/assistant` scene; Linh stays in SHB `/ops`; account/tab switches are
  explicit; unsupported MISA submission/export claims and unverified
  45-minute/under-5-minute claims were removed.
- Preserved the original frontend goal rather than rewriting it. Added a status
  banner, marked the old branch name and direct-browser API examples as
  historical, pointed current contracts to the API/schema owners, and recorded
  the `90fae49` compatibility checkpoint plus current gate evidence.
- Marked earlier duplicate information-architecture, Ops and screen-inventory
  sections in `03-design.md` as superseded by the later normative sections,
  leaving decision history intact while providing one clear current authority.
- Refreshed `STATE.md`, `ACCEPTANCE.md` and `NEXT_PROMPT.md` into a current
  release handoff with exact P3 evidence and P1/P2/P4 owner blockers. The
  corrupted/stale shared `00-work-split.md` and deferred pitch deck were
  intentionally not modified because they are outside the P3 boundary.
- Updated Ops E2E fixtures to prevent an unmocked optional transaction request
  from reaching the local backend and clearing the test session. Updated the
  compact tax-readiness snapshot after reviewing the intentional removal of the
  unsupported MISA control.

**Reasoning:**

- Repository docs had competing “final” sections and stale demo claims. Small
  authority annotations and one current handoff are safer than deleting design
  history or heavily rewriting the approved 14-stage plan.
- The first full Playwright run had 28 passes and five failures. Four failures
  were caused by the new dashboard enrichment requesting an unmocked
  `/transactions` endpoint; the gateway received an upstream auth failure and
  correctly cleared the test cookie before the next Ops navigation. The fifth
  was the expected 24px height reduction after removing MISA. Adding the
  explicit transaction fixture and regenerating only the reviewed compact
  snapshot fixed test infrastructure without weakening assertions.
- The frontend gate proves P3 implementation quality, not live backend
  completeness. POS context, authenticated/reliable lifecycle endpoints,
  allocation-derived dashboard metrics and real agent execution remain with
  their named owners and keep the overall product release blocked.

**Verification:**

- `npm run lint` — pass.
- `npm run typecheck` — pass.
- `npm test -- --run` — 13 files, 44/44 tests pass.
- `npm run build` — pass; 27 routes compile/prerender. Next emits one non-fatal
  warning because it has no fallback font metrics for Momo Trust Display.
- `npx playwright test tests/e2e/agentops.spec.ts` — 9/9 pass after fixture fix.
- `npx playwright test tests/e2e/ledger-journey.spec.ts --project=compact --update-snapshots` — 2/2 pass; only the reviewed tax-readiness snapshot changed.
- `npm run test:e2e` on isolated port 3313 — 33/33 pass across desktop,
  compact and mobile.
- `git diff --check` — pass for the current P3 release slice.

**Status:** P3 code, design consistency, onboarding, deterministic tests and
browser release gate are complete. Live six-scene rehearsal and overall product
release remain blocked by the explicitly listed P1/P2/P4 contracts. Pitch deck,
work-split, backend, matching, agent internals, infrastructure and seed/reset
files remain untouched.

### 2026-07-18 — P3: Synchronize latest integration documentation

**Changed:**

- Merged current `origin/main@4eb7391` into the P3 delivery branch after a
  conflict-free merge-tree simulation. This brings in the integration owner's
  canonical `AGENTS.md` and latest shared work-split commit without editing
  either file in P3's branch delta.
- Rechecked the Sprint 4 P3 section. It defines the live six-scene rehearsal as
  the P3 completion gate and adds no separate P3 S1–Sn simulation block.

**Reasoning:**

- Main advanced after the P3 release commits. Merging the one documentation
  commit keeps the branch current while retaining the already referenced P3
  checkpoint hashes and avoiding a stale-base PR.
- The new shared work-split still contains older `30/25/5`, SHB-on-assistant and
  pitch requirements. P3 did not rewrite this shared cross-role authority: the
  current demo handoff records P5's validated `23/15/8`, assigns the merchant
  assistant to Hương, and follows the product owner's explicit instruction to
  defer the pitch deck. These inconsistencies are flagged for the integration
  owner rather than silently changed by P3.

**Verification:**

- `git fetch origin --prune` — latest main is `4eb7391`.
- All `origin/p1-chau`, `origin/p2-nguyen`, `origin/p4-hoang` and
  `origin/p5-nhi` tips are ancestors of current main.
- `git merge-tree $(git merge-base origin/main HEAD) origin/main HEAD` — no
  conflict markers before merge.
- `git merge --no-commit --no-ff origin/main` — automatic merge completed with
  no conflicts and paused for this mandatory log entry.

**Status:** Latest main documentation integrated without conflict. P3 scope and
the deferred pitch decision remain unchanged; live rehearsal remains blocked.

