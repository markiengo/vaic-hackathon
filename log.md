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

### P1 Sprint 1 — Matching and financial logic

Status: Implemented and unit-tested on 2026-07-17.

The implementation is a deterministic functional core with no SQLAlchemy,
FastAPI, or external-service dependency. P4 can map database models into the
typed snapshots and persist returned allocation plans through the provided
port.

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
- `AllocationPlanWriter` is the persistence boundary for P4. P4 remains
  responsible for SQLAlchemy models, migrations, row locking, revalidation, and
  transactional writes.

#### Scope boundaries

- Included: pure matching/allocation services, typed records and results, unit
  tests, persistence protocol, and aligned algorithm/evaluation documentation.
- Excluded: database models, migrations, API routes, persisted exceptions,
  audit-table writes, NLP implementation, and external integrations.

## Created and updated files

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

## Verification

Run from `backend/`:

```powershell
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
$env:PYTHONDONTWRITEBYTECODE='1'
python -X faulthandler -m pytest tests -q -p no:cacheprovider
```

Latest result:

```text
29 passed in 0.06s
syntax_ok: 4 files
```

The cache-disabling flags were used because the sandboxed checkout could not
create Python cache directories. They are not application requirements.

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
