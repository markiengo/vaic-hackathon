# AGENTS.md — KHỚP Agent Operating Rules

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Project Lead
> **Applies to:** All AI agents and developers working on KHỚP
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Required reading order

1. This file (`AGENTS.md`)
2. `00-overview.md` — context, capability matrix, anti-drift map
3. `DECISIONS.md` — all accepted decisions
4. Relevant specification for the task (see task-to-doc map in `00-overview.md`)
5. `AI-ADVISOR.md` — if touching agent behavior
6. `ALGORITHM.md` — if touching matching logic
7. `COMPLIANCE.md` — if touching tax rules
8. `IMPLEMENTATION-PLAN.md` — for implementation order

## Source-of-truth hierarchy

See `00-overview.md` § Source-of-truth hierarchy.

## Commands to run before changes

```bash
git status --short
git diff --stat
```

## Commands to run after changes

```bash
# Backend
cd backend && python -m pytest tests/ -v
cd backend && python -m pyflakes .

# Frontend
cd frontend && npm run build
cd frontend && npm run lint

# Database
# Verify migrations apply cleanly
cd backend && alembic upgrade head
```

## Repository boundaries

- **Do not edit:** `docs/DECISIONS.md` without Project Lead approval
- **Generated files:** `docs/07-data-models.md` schema section should match migrations — do not edit schema manually; update migrations and regenerate
- **Shared contracts:** `AI-ADVISOR.md` tool allowlists are shared across all agents — coordinate before changing
- **Tax rules:** Never modify tax rule logic outside the Tax Rules Engine service

## Prohibited operations

- Never run: `git reset --hard`, `git clean -fd`, `git push --force`
- Never delete tracked files without checking imports, history, and references
- Never stage with `git add -A`; stage exact paths only
- Never combine unrelated work in one commit
- Never use LLM for tax calculations, exact matching, or duplicate detection
- Never auto-resolve transactions with confidence < 95%
- Never send unmasked sensitive data to LLM providers
- Never call tools outside an agent's allowlist
- Never skip audit logging for any tool call or human approval

## State and persistence invariants

- Every bank transaction, sale, cash session, and invoice has a canonical ledger entry
- `payment_reference` is the primary link key between orders, payment intents, and bank transactions
- Tax rule versions are immutable once approved
- Audit events are append-only; no updates or deletes
- Agent runs have a state machine: `PENDING` → `PLANNING` → `EXECUTING` → `WAITING_FOR_HUMAN` → `COMPLETED` / `FAILED`
- Payment allocations must sum to the payment amount (no over-allocation)

## Asset handling rules

- No custom artwork or mascot for MVP
- Use standard icon libraries (Lucide)
- Vietnamese text must use proper Unicode normalization (NFC)

## Commit expectations

- One logical change per commit
- Stage exact paths, not `git add -A`
- Verify: `git status`, `git diff --cached` before committing
- Commit message format: `[module] brief description`

## Agent ownership

- **Planner Agent** owns: task decomposition, agent delegation, plan state
- **Reconciliation Agent** owns: transaction matching, exception creation, allocation
- **Tax & Compliance Agent** owns: rule validation, tax-readiness report, draft export
- **Merchant Operations Agent** owns: case creation, RM assignment, merchant messaging, export

## When to stop and ask

- A consequential product decision remains unresolved
- Multiple valid options create materially different outcomes
- A destructive action is ambiguous
- Credentials or external access are missing
- Instructions conflict
- Safe completion is impossible without clarification
- SHB sandbox API access is required but not available
- Tax rule content is ambiguous or conflicting

## What counts as evidence

- Passing test output (`pytest -v`)
- Successful build (`npm run build`, `uvicorn main:app`)
- Schema validation result (`alembic upgrade head`)
- Lint output (`pyflakes`, `npm run lint`)
- Agent trace showing tool calls, confidence, and audit records
- Audit log export (JSON/CSV)

---

*Last updated: 2026-07-17*
