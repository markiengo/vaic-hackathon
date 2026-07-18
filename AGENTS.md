# AGENTS.md — TaxLens Hackathon MVP

> **This file replaces `CLAUDE.md` and any other agent config file.**
> Regardless of which coding agent you are (Claude, Codex, Cursor, Windsurf, Devin, etc.),
> **you MUST read this file first** before doing anything else in this repository.
> If you have a `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, or similar config file,
> this file supersedes it. Delete or ignore the other one.

> **Source of truth:** `docs/04-delivery/00-work-split.md`
> If anything in this file conflicts with the work-split doc, the work-split doc wins.

---

## Step 0: Identify yourself (MANDATORY)

Before reading any project files, writing any code, or running any commands,
**ask the user**:

> "Which team member are you? P1, P2, P3, P4, or P5?"

Once you know the role, follow the onboarding sequence below.
**Do not skip steps. Do not read files outside your role.**

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

## Onboarding sequence (run in order, every session)

### 1. Identify sprint

Ask the user: "Which sprint are we in? (Sprint 1, 2, 3, or 4?)"

If the user doesn't know, check `log.md` — the latest entry will reference a sprint.

### 2. Read your sprint section

Open `docs/04-delivery/00-work-split.md` and read **only your role's section** for the current sprint.

- Find your role (P1/P2/P3/P4/P5) under the sprint heading.
- Read the **Công việc** (tasks), **Simulations** (if Sprint 4), and **Exit criteria**.
- If Sprint 4: the simulations are **compulsory** — you must run all of them and log results.

### 3. Read `log.md`

Read the entire `log.md` to understand:
- What has been completed across all roles
- What's in progress
- What's blocked
- Any coordination notes from other teammates

**Do not start work until you've read the full `log.md`.**

### 4. Read your role's docs and code

Read **only** the files listed for your role below. Do not read the entire docs tree.

### 5. Check git state

```bash
git branch --show-current
git status --short
git log --oneline -5
```

Confirm you're on the right branch. If not, ask the user before switching.

### 6. Start work

Implement your tasks. Run your simulations. Verify your exit criteria.
Update `log.md` before every commit.

---

## What to read per role

### Everyone (all roles)

- `docs/04-delivery/00-work-split.md` — **read your sprint section first, every session**
- `log.md` — **read the full file, every session**
- `docs/01-foundation/03-product-spec.md` — product overview and acceptance criteria
- `docs/02-requirements/03-srs.md` — consolidated software requirements specification
- `docs/03-engineering/05-api-reference.md` — consolidated API reference (all endpoints, error codes, webhook contracts)

### P1 — Matching & Financial Logic

**Docs:**
- `docs/05-domain/02-algorithm.md` — normative scoring and safety gates
- `docs/05-domain/03-evaluation.md` — evaluation truth set
- `docs/03-engineering/02-data-models.md` — data models for matching inputs

**Code:**
- `backend/app/services/matching.py`
- `backend/app/services/allocation.py`
- `backend/app/services/reconciliation.py`
- `backend/tests/test_matching.py`
- `backend/tests/test_allocation.py`
- `backend/tests/test_truth_set.py`
- `backend/tests/p1_db_fixtures.py`

**Sprint 4 simulations:** See Sprint 4 section in work-split doc — S1 through S5 are compulsory. You run in-memory SQLite, no Postgres needed. Log all results to `log.md`.

### P2 — AI Agent Layer

**Docs:**
- `docs/05-domain/01-ai-advisor.md` — agent design, error handling, prompt strategy
- `docs/01-foundation/01-agents.md` — AI agents overview (what each agent does)
- `docs/03-engineering/01-system-architecture.md` — system architecture

**Code:**
- `backend/app/agents/` — all agent modules (planner, specialists, graph, runner, prompts, evaluation)
- `backend/app/schemas/agent.py` — agent I/O schemas
- `backend/app/tools/__init__.py` — tool signatures and implementations
- `backend/app/services/vietnamese_nlp.py` — Vietnamese note interpretation
- `backend/tests/test_vietnamese_nlp.py`
- `backend/tests/test_agent_evaluation.py`
- `backend/tests/test_agents.py`

**Sprint 4 simulations:** See Sprint 4 section in work-split doc — S1 through S5 are compulsory. Prompt injection, malformed notes, hallucination injection, message quality review, latency. Log all results to `log.md`.

### P3 — Product + Frontend

**Docs:**
- `docs/04-delivery/03-design.md` — design tokens, screen specs
- `docs/02-requirements/02-user-stories.md` — user stories
- `docs/04-delivery/frontend-build/` — frontend build reference
- `frontend/new-design/` — design mockups

**Code:**
- `frontend/src/` — all frontend source
- `frontend/package.json`, `frontend/tailwind.config.ts`
- `frontend/src/lib/api.ts` — API client
- `frontend/src/lib/ws.ts` — WebSocket client
- `frontend/src/config/` — frontend config

**Sprint 4 tasks:** Polish all 7 screens, empty/loading/error states, animations, demo script (6 scenes), pitch deck, rehearse. See Sprint 4 section in work-split doc for full details.

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
- `backend/app/core/security.py` — auth, JWT, error codes
- `backend/alembic/` — migrations
- `backend/tests/test_integration.py` — integration tests
- `docker-compose.yml`

**Sprint 4 simulations:** See Sprint 4 section in work-split doc — S1 through S6 are compulsory. Docker lifecycle, WebSocket lifecycle, concurrent runs + Redis, DB reset, auth gap audit (fix missing `get_current_user` on dashboard + reconcile endpoints), performance measurement. Log all results to `log.md`.

### P5 — Data Pipeline + Tax

**Docs:**
- `docs/03-engineering/03-integration.md` — integration points
- `docs/05-domain/05-compliance.md` — tax compliance rules
- `docs/01-foundation/03-product-spec.md` §17 — seed data spec

**Code:**
- `backend/app/adapters/` — SHB, SePay, CSV, invoice adapters
- `backend/app/services/tax_rules.py` — tax rules engine
- `backend/app/services/revenue_classifier.py` — revenue classification
- `backend/app/tools/` — tool implementations
- `backend/scripts/seed_data.py` — seed data script
- `backend/scripts/validate_pipeline.py` — pipeline validation
- `backend/scripts/backup_demo.py` — DB backup
- `backend/scripts/restore_demo.py` — DB restore
- `backend/scripts/simulate_sepay_webhook.py` — SePay fallback

**Sprint 4 simulations:** See Sprint 4 section in work-split doc — S1 through S7 are compulsory. Tax domain review per Thông tư 40/2021, revenue classification review, export usability, pipeline E2E, backup/restore, SePay fallback, creative edge cases. Log all results to `log.md`.

---

## Sprint workflow

1. **Identify** — Ask user which P you are and which sprint.
2. **Read** — Your sprint section in `docs/04-delivery/00-work-split.md` + full `log.md`.
3. **Read** — Your role's docs and code files listed above.
4. **Check git** — Confirm branch, status, recent commits.
5. **Implement** — Your tasks for this sprint.
6. **Simulate** — Run all compulsory simulations (Sprint 4) and log results.
7. **Verify** — Your exit criteria pass.
8. **Log** — Update `log.md` with what/why/verification/status.
9. **Commit** — Stage only your files, commit with descriptive message.

## Rules

- Do not modify files outside your role's scope without asking the user.
- Do not read the entire docs tree — only what your role needs.
- If the work-split doc seems wrong or outdated, ask the user before changing it.
- Always check `log.md` before starting work to avoid duplicating completed tasks.
- All docs are Vietnamese-first, English-technical only.
- If you see a `CLAUDE.md` file in this repo, ignore it — `AGENTS.md` is the canonical agent config.
- Sprint 4 simulations are **compulsory** — not optional. You must run all of them and log results to `log.md` before declaring your sprint done.

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
