# AGENTS.md — TaxLens Hackathon MVP

> **Source of truth:** `docs/04-delivery/00-work-split.md`
> If anything in this file conflicts with the work-split doc, the work-split doc wins.

---

## First rule: ask which P you are

Before reading any project files or starting any work, **ask the user**:

> "Which team member are you? P1, P2, P3, P4, or P5?"

Then read **only** the docs and files relevant to your role for the current sprint.
Do not read the entire docs tree or codebase — that wastes time and context.

---

## Role map

| Role   | Name                       | Responsibility                                                                |
| --------| ----------------------------| -------------------------------------------------------------------------------|
| **P1** | Matching & Financial Logic | Match scoring, payment allocation, cash reconciliation, confidence thresholds |
| **P2** | AI Agent Layer             | LangGraph, 4 agents, system prompts, note interpretation, inline context      |
| **P3** | Product + Frontend         | UI screens, API client, WebSocket, demo script, pitch                         |
| **P4** | Backend Infra              | FastAPI, REST endpoints, WebSocket server, Redis, DB migrations, models       |
| **P5** | Data Pipeline + Tax        | Adapters, tool implementations, seed data, Tax Rules Engine, tax seed         |

---

## What to read per role

### Everyone

- `docs/04-delivery/00-work-split.md` — **always read your sprint section first**
- `log.md` — check current implementation status and session history
- `docs/01-foundation/03-product-spec.md` — product overview and acceptance criteria
- `docs/02-requirements/03-srs.md` — consolidated software requirements specification (business, functional, non-functional, personas, user stories, compliance, evaluation)
- `docs/03-engineering/05-api-reference.md` — consolidated API reference (all endpoints, error codes, webhook contracts)

### P1 — Matching & Financial Logic

**Docs:**
- `docs/05-domain/02-algorithm.md` — normative scoring and safety gates
- `docs/05-domain/03-evaluation.md` — evaluation truth set
- `docs/03-engineering/02-data-models.md` — data models for matching inputs

**Code:**
- `backend/app/services/matching.py`
- `backend/app/services/allocation.py`
- `backend/tests/test_matching.py`
- `backend/tests/test_allocation.py`

### P2 — AI Agent Layer

**Docs:**
- `docs/05-domain/01-ai-advisor.md` — agent design, error handling, prompt strategy
- `docs/01-foundation/01-agents.md` — AI agents overview (what each agent does)
- `docs/03-engineering/01-system-architecture.md` — system architecture

**Code:**
- `backend/app/agents/` — all agent modules
- `backend/app/schemas/agent.py` — agent I/O schemas
- `backend/app/tools/__init__.py` — tool signatures
- `backend/app/agents/prompts.py` — system prompts

### P3 — Product + Frontend

**Docs:**
- `docs/04-delivery/03-design.md` — design tokens, screen specs
- `docs/02-requirements/02-user-stories.md` — user stories
- `docs/design/screens/` — design reference mockups

**Code:**
- `frontend/src/` — all frontend source
- `frontend/package.json`, `frontend/tailwind.config.ts`

### P4 — Backend Infrastructure

**Docs:**
- `docs/03-engineering/01-system-architecture.md` — architecture
- `docs/03-engineering/02-data-models.md` — data models
- `docs/03-engineering/05-api-reference.md` — consolidated API specs and error codes

**Code:**
- `backend/app/main.py` — FastAPI app
- `backend/app/core/` — config, database, redis
- `backend/app/models/` — SQLAlchemy models
- `backend/app/routers/` — API routers
- `backend/alembic/` — migrations
- `docker-compose.yml`

### P5 — Data Pipeline + Tax

**Docs:**
- `docs/03-engineering/03-integration.md` — integration points
- `docs/05-domain/05-compliance.md` — tax compliance rules
- `docs/01-foundation/03-product-spec.md` §17 — seed data spec

**Code:**
- `backend/app/adapters/` — SHB, SePay, CSV, invoice adapters
- `backend/app/services/tax_rules.py` — tax rules engine
- `backend/app/tools/` — tool implementations
- `backend/scripts/seed_data.py` — seed data script

---

## Sprint workflow

1. Read your section in `docs/04-delivery/00-work-split.md` for the current sprint.
2. Check `log.md` for current implementation status.
3. Read only the docs and code files listed above for your role.
4. Implement your tasks.
5. Verify your exit criteria pass.
6. Update `log.md` with what you did and verification results.

## Rules

- Do not modify files outside your role's scope without asking the user.
- Do not read the entire docs tree — only what your role needs.
- If the work-split doc seems wrong or outdated, ask the user before changing it.
- Always check `log.md` before starting work to avoid duplicating completed tasks.
- All docs are Vietnamese-first, English-technical only. 
---

## Team workflow & git discipline

We are a **team of 5** working in parallel with **git PRs and continuous push**. To stay coordinated:

### Branch & PR rules

- Each member works on their own branch unless specified otherwise (e.g., `p1-matching`, `p4-backend`, etc.).
- Commit frequently — at least once per logical unit of work (not once per sprint).
- Merge only after your exit criteria pass and `log.md` is updated.
- If two members touch the same file, coordinate via `log.md` first.

### Pre-commit: `log.md` is mandatory

**Before every commit**, update `log.md` with an entry that includes:

1. **What changed** — files added/modified, features implemented, bugs fixed.
2. **Why** — the reasoning behind decisions, alternatives considered, and why this approach was chosen.
3. **Verification** — how you verified the change (tests run, commands executed, manual checks).
4. **Status** — what's done, what's in progress, what's blocked.

The log entry should be as **elaborative as possible**. Future you (and your teammates) need to understand not just *what* was done, but *why* — so they don't undo or contradict your reasoning.

A good log entry:
```markdown
### 2026-07-17 — P1 — Sprint 2

**Changed:**
- `backend/app/services/matching.py`: Implemented candidate matching with weighted scoring (amount +50, time +20, ref +20, sender +10, multi-order -30).
- `backend/tests/test_matching.py`: Added 12 test cases covering exact, fuzzy, no-match, split, refund.

**Reasoning:**
- Chose to normalize scores to 0-100 range rather than raw weighted sum because it makes threshold logic cleaner (95/75/0) and easier to reason about.
- Considered using a logistic sigmoid for normalization but rejected — adds complexity without clear benefit for 0-100 bounded inputs.
- Multi-order penalty of -30 chosen empirically: -20 wasn't enough to prevent false auto-matches in same-amount scenarios, -40 was too aggressive and pushed legitimate candidates below HUMAN_CONFIRM threshold.

**Verification:**
- `pytest tests/test_matching.py -v` — 12/12 pass
- Manually verified seed data: 25 exact matches, 5 exceptions, 0 false matches

**Status:** Sprint 2 matching logic complete. Cash reconciliation next.
```

A bad log entry:
```markdown
updated matching.py
```

### Coordination via log.md

- Before starting work, read `log.md` to see what others have done and what's in progress.
- If you're about to make a decision that affects another role's scope, note it in `log.md` and ping the relevant person.
- `log.md` is the **shared memory** of the team. Treat it as such.
