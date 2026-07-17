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

| Role | Name | Responsibility |
|------|------|----------------|
| **P1** | Matching & Financial Logic | Match scoring, payment allocation, cash reconciliation, confidence thresholds |
| **P2** | AI Agent Layer | LangGraph, 4 agents, system prompts, note interpretation, inline context |
| **P3** | Product + Frontend | UI screens, API client, WebSocket, demo script, pitch |
| **P4** | Backend Infra | FastAPI, REST endpoints, WebSocket server, Redis, DB migrations, models |
| **P5** | Data Pipeline + Tax | Adapters, tool implementations, seed data, Tax Rules Engine, tax seed |

---

## What to read per role

### Everyone

- `docs/04-delivery/00-work-split.md` — **always read your sprint section first**
- `log.md` — check current implementation status and session history
- `product.md` — product overview and acceptance criteria

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
- `docs/01-foundation/02-agents.md` — agent overview
- `docs/03-engineering/01-system-architecture.md` — system architecture

**Code:**
- `backend/app/agents/` — all agent modules
- `backend/app/schemas/agent.py` — agent I/O schemas
- `backend/app/tools/__init__.py` — tool signatures
- `backend/app/agents/prompts.py` — system prompts

### P3 — Product + Frontend

**Docs:**
- `docs/04-delivery/03-design.md` — design tokens, screen specs
- `docs/02-requirements/03-user-stories.md` — user stories
- `docs/design/screens/` — design reference mockups

**Code:**
- `frontend/src/` — all frontend source
- `frontend/package.json`, `frontend/tailwind.config.ts`

### P4 — Backend Infrastructure

**Docs:**
- `docs/03-engineering/01-system-architecture.md` — architecture
- `docs/03-engineering/02-data-models.md` — data models
- `docs/03-engineering/03-api-specifications.md` — API specs
- `docs/03-engineering/07-error-codes.md` — error codes

**Code:**
- `backend/app/main.py` — FastAPI app
- `backend/app/core/` — config, database, redis
- `backend/app/models/` — SQLAlchemy models
- `backend/app/routers/` — API routers
- `backend/alembic/` — migrations
- `docker-compose.yml`

### P5 — Data Pipeline + Tax

**Docs:**
- `docs/03-engineering/05-integration.md` — integration points
- `docs/05-domain/05-compliance.md` — tax compliance rules
- `product.md` §17 — seed data spec

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
