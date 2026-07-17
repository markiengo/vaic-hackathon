# Implementation Plan — TaxLens

> **Status:** Draft
> **Authority:** Normative
> **Owner:** Tech Lead
> **Applies to:** Frontend và backend implementation
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Tech stack và dependencies

### Backend

| Dependency | Version | Mục đích |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.110+ | Web framework |
| SQLAlchemy | 2.0+ | ORM |
| Alembic | 1.13+ | Migrations |
| Pydantic | 2.0+ | Schema validation |
| LangGraph | latest | Agent orchestration |
| Redis | 5.0+ (Python client) | Queue/cache |
| psycopg2-binary | latest | PostgreSQL driver |
| python-jose | latest | JWT |
| bcrypt | latest | Password hashing |
| httpx | latest | HTTP client cho adapters |
| openai | latest | DeepSeek API client (OpenAI-compatible endpoint) |

### Frontend

| Dependency | Version | Mục đích |
|---|---|---|
| Node.js | 20+ | Runtime |
| Next.js | 14+ | Framework |
| TypeScript | 5.0+ | Type safety |
| TailwindCSS | 3.4+ | Styling |
| Lucide React | latest | Icons |
| TanStack Query | 5.0+ | Data fetching |
| Zustand | 4.0+ | State management |
| Axios | 1.6+ | HTTP client |

## Cấu trúc project

Xem `03-engineering/01-system-architecture.md` § Module structure and directory map. Tài liệu này không lặp lại directory tree.

## Thiết kế API layer

### Backend (FastAPI)

- Router-based module separation (merchants, transactions, reconciliation, tax, cases, agents, audit, pos)
- Pydantic schemas cho request/response validation
- Dependency injection cho auth, database session, và role checks
- WebSocket endpoint cho real-time agent trace updates

### Frontend (Next.js)

- API client trong `src/lib/api.ts` với typed methods per module
- TanStack Query cho caching và refetching
- WebSocket client trong `src/lib/ws.ts` cho agent trace
- Axios interceptors cho JWT attachment và error handling

## State management

- **Server state:** TanStack Query (cache, refetch, optimistic updates)
- **Client state:** Zustand stores cho UI state (selected merchant, active filters, modal state)
- **Agent trace:** WebSocket → Zustand store → React components

## Chi tiết implementation từng page

### Phase 1: Core backend + data layer

1. Database models và migrations (`03-engineering/02-data-models.md`)
2. SHB adapter (mock/sandbox)
3. SePay webhook handler
4. CSV import adapter
5. Invoice mock adapter
6. Canonical Event Ledger ingestion service
7. Seed data migration (1 salon, 30 orders, v.v.)

### Phase 2: Agent layer

8. Tool implementations (bank, pos, invoice, case, rules)
9. Reconciliation Agent (exact match + candidate match)
10. Tax & Compliance Agent (rule validation + readiness report)
11. Merchant Operations Agent (case creation + message drafting)
12. Planner Agent (request decomposition + delegation)
13. Agent run state machine
14. Tool call logging và audit events

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
25. WebSocket cho agent trace

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
39. Kiểm tra Vietnamese text rendering
40. Demo data validation

## Theme/styling setup

- TailwindCSS với custom design tokens từ `04-delivery/03-design.md`
- SHB green primary color
- Inter font family
- Responsive: desktop-first (1280px+)

## Auth flow và route protection

```text
Login → JWT (access + refresh) → Store in memory (không localStorage)
  → Axios interceptor attaches Authorization header
  → Route guard checks JWT validity
  → Expired token → refresh token → new access token
  → Refresh expired → redirect to login
```

Protected routes: tất cả trừ `/confirm/{token}` (merchant confirmation là token-based).

## Environment variables

Xem `04-delivery/01-environment-setup.md` cho bảng env var đầy đủ.

## Thứ tự implementation sprint

| Sprint | Focus | Items | Exit criteria |
|---|---|---|---|
| Sprint 1 (Hours 1-8) | Data layer + adapters | 1-7 | Seed data ingested; canonical ledger populated |
| Sprint 2 (Hours 9-16) | Agent layer | 8-14 | Cả 4 agents functional với tool calls logged |
| Sprint 3 (Hours 17-24) | API layer | 15-25 | Tất cả endpoints responding; WebSocket working |
| Sprint 4 (Hours 25-36) | Frontend | 26-35 | Tất cả screens functional; Vietnamese rendering |
| Sprint 5 (Hours 37-48) | Integration & polish | 36-40 | End-to-end demo runs <30s |

## Verification

### Automated

- `cd backend && python -m pytest tests/ -v` — tất cả backend tests
- `cd frontend && npm run build` — frontend builds
- `cd frontend && npm run lint` — lint passes

### Manual

- Chạy end-to-end demo flow (product.md §18)
- Kiểm tra tất cả screens khớp 04-delivery/03-design.md specs
- Kiểm tra agent trace hiển thị real-time updates

---

*Last updated: 2026-07-17*
