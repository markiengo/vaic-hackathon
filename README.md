# TaxLens

> **Biến đống giao dịch ngân hàng lộn xộn thành bộ số liệu sạch, sẵn sàng kê khai thuế — tự động.**

TaxLens là lớp kết nối và kiểm soát TaxOps do SHB cung cấp. Sản phẩm hợp nhất giao dịch ngân hàng, đơn hàng POS, tiền mặt, và hóa đơn thành một ledger có thể kiểm tra; rules xử lý điều chắc chắn, AI giải thích sự mơ hồ, và con người phê duyệt quyết định quan trọng.

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL (or Supabase)
- Redis (or `memory://` for local dev)

### 1. Environment

```bash
# Copy the example env and fill in real values
cp .env.example .env
```

Key variables:
- `DATABASE_URL` — PostgreSQL connection string (asyncpg format)
- `REDIS_URL` — Redis URL or `memory://` for in-memory
- `JWT_SECRET` — generate with `openssl rand -hex 32`
- `TAXLENS_BACKEND_URL` — backend URL (default `http://127.0.0.1:8000`)

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Run migrations
python -m alembic upgrade head

# Seed demo data
python scripts/seed_data.py --reset

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm ci
copy-item .env.example .env.local  # Windows
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Accounts

| Role | Email | Password | Workspace |
|---|---|---|---|
| **Merchant Owner** (Salon Hương) | `huong.salonhoa@gmail.com` | `TaxLensDemo!2026` | `/dashboard` |
| **SHB Operations** (Trần Văn Long) | `long.ops@shb.com.vn` | `TaxLensDemo!2026` | `/ops` |

---

## Main Routes

### Merchant Workspace
- `/dashboard` — Revenue overview, KPIs, period selector
- `/transactions` — Bank transaction list with AI interpretation and match status
- `/exceptions` — Exception decision queue (confirm, reclassify, dismiss)
- `/sales` — POS: create sale, generate QR payment intent, record cash
- `/invoices` — Invoice coverage and missing invoice tracking
- `/tax-readiness` — Tax readiness checklist with export
- `/assistant` — AI assistant with agent run streaming
- `/support` — Escalate to SHB, view case history
- `/settings` — Profile, appearance, demo reset

### SHB Operations Console
- `/ops` — Portfolio overview
- `/ops/merchants` — Merchant portfolio list
- `/ops/cases` — Reconciliation cases with approval workflow
- `/ops/agent-runs` — Agent run history and trace inspection
- `/ops/audit` — Immutable audit event log with CSV export
- `/ops/compliance` — Tax rule version management
- `/ops/settings` — Operations settings

---

## Testing

### Backend

```bash
cd backend
python -m pytest -v
```

210 tests covering: auth/RBAC, matching, allocation, reconciliation, tax rules, seed data, agent planning, integration flows.

### Frontend

```bash
cd frontend
npx vitest run          # 84 unit/component tests
npx tsc --noEmit        # type check
npx next build          # production build
```

### End-to-End (Playwright)

```bash
cd frontend
npx playwright test
```

---

## Demo Reset

From the Merchant Settings screen, or via API:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/demo/reset \
  -H "Authorization: Bearer <your_jwt>"
```

This wipes all demo mutations and re-seeds the deterministic dataset.

---

## Architecture

```
Browser
  └─► Next.js (port 3000)
        ├── Pages: React Server Components + Client Components
        └── /api/backend/* → server-side proxy → FastAPI (port 8000)
              ├── PostgreSQL (Supabase)
              ├── Redis (or in-memory)
              ├── LangGraph Agent Orchestrator
              │     ├── Planner Agent
              │     ├── Reconciliation Agent
              │     ├── Merchant Ops Agent
              │     └── Tax & Compliance Agent
              └── Sandbox Adapters (SHB, SePay, MISA, CSV)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

---

## Documentation

- [Product Walkthrough](docs/PRODUCT-WALKTHROUGH.md)
- [Demo Runbook](docs/DEMO-RUNBOOK.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [QA Report](docs/QA-REPORT.md)
- [Deployment Guide](docs/DEPLOY.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, TailwindCSS, TanStack Query |
| Backend | FastAPI, Python 3.12+, SQLAlchemy 2.0 (async), Alembic |
| Database | PostgreSQL (Supabase) |
| Cache | Redis (or in-memory fallback) |
| AI | LangGraph, DeepSeek/OpenRouter (deterministic fallback if no key) |
| Auth | JWT (access + refresh), HttpOnly cookies, CSRF tokens |
