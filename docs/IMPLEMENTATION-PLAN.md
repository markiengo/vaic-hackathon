# Implementation Plan — KHỚP

> **Status:** Draft
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Frontend and backend implementation
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Tech stack and dependencies

### Backend

| Dependency | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.110+ | Web framework |
| SQLAlchemy | 2.0+ | ORM |
| Alembic | 1.13+ | Migrations |
| Pydantic | 2.0+ | Schema validation |
| LangGraph | latest | Agent orchestration |
| Redis | 5.0+ (Python client) | Queue/cache |
| psycopg2-binary | latest | PostgreSQL driver |
| pgvector | latest | Vector search for RAG |
| python-jose | latest | JWT |
| bcrypt | latest | Password hashing |
| httpx | latest | HTTP client for adapters |

### Frontend

| Dependency | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| Next.js | 14+ | Framework |
| TypeScript | 5.0+ | Type safety |
| TailwindCSS | 3.4+ | Styling |
| Lucide React | latest | Icons |
| TanStack Query | 5.0+ | Data fetching |
| Zustand | 4.0+ | State management |
| Axios | 1.6+ | HTTP client |

## Project structure

See `06-system-architecture.md` § Module structure and directory map. This document does not duplicate the directory tree.

## API layer design

### Backend (FastAPI)

- Router-based module separation (merchants, transactions, reconciliation, tax, cases, agents, audit, pos)
- Pydantic schemas for request/response validation
- Dependency injection for auth, database session, and role checks
- WebSocket endpoint for real-time agent trace updates

### Frontend (Next.js)

- API client in `src/lib/api.ts` with typed methods per module
- TanStack Query for caching and refetching
- WebSocket client in `src/lib/ws.ts` for agent trace
- Axios interceptors for JWT attachment and error handling

## State management

- **Server state:** TanStack Query (cache, refetch, optimistic updates)
- **Client state:** Zustand stores for UI state (selected merchant, active filters, modal state)
- **Agent trace:** WebSocket → Zustand store → React components

## Page-by-page implementation details

### Phase 1: Core backend + data layer

1. Database models and migrations (`07-data-models.md`)
2. SHB adapter (mock/sandbox)
3. SePay webhook handler
4. CSV import adapter
5. Invoice mock adapter
6. Canonical Event Ledger ingestion service
7. Seed data migration (1 salon, 30 orders, etc.)

### Phase 2: Agent layer

8. Tool implementations (bank, pos, invoice, case, rules, rag)
9. Reconciliation Agent (exact match + candidate match)
10. Tax & Compliance Agent (rule validation + readiness report)
11. Merchant Operations Agent (case creation + message drafting)
12. Planner Agent (request decomposition + delegation)
13. Agent run state machine
14. Tool call logging and audit events

### Phase 3: API layer

15. Auth endpoints (login, refresh, me)
16. Merchant endpoints (profile, dashboard)
17. Transaction endpoints (list, filter)
18. Reconciliation endpoints (start, get result, resolve exception)
19. Tax endpoints (readiness report, export)
20. Case endpoints (list, assign, draft message)
21. Agent endpoints (start run, get trace)
22. Audit endpoint (export)
23. POS endpoints (create sale, payment intent, cash payment, close session)
24. Merchant confirmation endpoints (get, submit)
25. WebSocket for agent trace

### Phase 4: Frontend

26. App shell (header, sidebar, routing)
27. Auth page (login)
28. Dashboard page (summary cards, active agents)
29. Exception Inbox page (list, resolve, AI reasoning)
30. Agent Trace page (timeline, tool calls, real-time)
31. Tax-Readiness page (checklist, export)
32. Cases page (list, assign, draft message)
33. Audit Export page (filter, export)
34. Mini POS page (product selection, cart, QR, cash)
35. Merchant Confirmation page (token-based, no auth)

### Phase 5: Integration & Polish

36. End-to-end demo flow testing
37. Performance optimization (NFR targets)
38. Error handling polish
39. Vietnamese text rendering verification
40. Demo data validation

## Theme/styling setup

- TailwindCSS with custom design tokens from `DESIGN.md`
- SHB green primary color
- Inter font family
- Responsive: desktop-first (1280px+)

## Auth flow and route protection

```text
Login → JWT (access + refresh) → Store in memory (not localStorage)
  → Axios interceptor attaches Authorization header
  → Route guard checks JWT validity
  → Expired token → refresh token → new access token
  → Refresh expired → redirect to login
```

Protected routes: all except `/confirm/{token}` (merchant confirmation is token-based).

## Environment variables

See `13-environment-setup.md` for complete env var table.

## Implementation sprint order

| Sprint | Focus | Items | Exit criteria |
|---|---|---|---|
| Sprint 1 (Hours 1-8) | Data layer + adapters | 1-7 | Seed data ingested; canonical ledger populated |
| Sprint 2 (Hours 9-16) | Agent layer | 8-14 | All 4 agents functional with tool calls logged |
| Sprint 3 (Hours 17-24) | API layer | 15-25 | All endpoints responding; WebSocket working |
| Sprint 4 (Hours 25-36) | Frontend | 26-35 | All screens functional; Vietnamese rendering |
| Sprint 5 (Hours 37-48) | Integration & polish | 36-40 | End-to-end demo runs <30s |

## Verification

### Automated

- `cd backend && python -m pytest tests/ -v` — all backend tests
- `cd frontend && npm run build` — frontend builds
- `cd frontend && npm run lint` — lint passes

### Manual

- Run end-to-end demo flow (product.md §18)
- Verify all screens match DESIGN.md specs
- Verify agent trace shows real-time updates

---

*Last updated: 2026-07-17*
