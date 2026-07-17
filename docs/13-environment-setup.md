# Environment Setup — KHỚP

> **Status:** Canonical
> **Authority:** Informative
> **Owner:** DevOps
> **Applies to:** Development and demo environments
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Backend runtime |
| Node.js | 20+ | Frontend runtime |
| PostgreSQL | 16+ | Database |
| Redis | 7+ | Queue/cache |
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Multi-container orchestration |
| Git | 2.40+ | Version control |
| pgvector extension | latest | Vector search for RAG |

## Clone and install

```bash
git clone <repo-url> khop
cd khop

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## Environment variables

Create `.env` in project root:

| Name | Description | Required | Default | Example |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes | — | `postgresql://khop:khop@localhost:5432/khop` |
| `REDIS_URL` | Redis connection string | Yes | — | `redis://localhost:6379/0` |
| `JWT_SECRET` | JWT signing secret | Yes | — | (generate with `openssl rand -hex 32`) |
| `JWT_ALGORITHM` | JWT algorithm | No | `HS256` | `HS256` |
| `JWT_ACCESS_EXPIRE_MINUTES` | Access token expiry | No | `15` | `15` |
| `JWT_REFRESH_EXPIRE_DAYS` | Refresh token expiry | No | `7` | `7` |
| `SHB_API_URL` | SHB sandbox API URL | Yes | — | `http://localhost:8001/mock/shb` |
| `SHB_API_KEY` | SHB sandbox API key | Yes | — | `shb-sandbox-key` |
| `SEPAY_WEBHOOK_SECRET` | SePay webhook HMAC secret | Yes | — | (generate with `openssl rand -hex 32`) |
| `SEPAY_API_URL` | SePay sandbox API URL | No | — | `http://localhost:8001/mock/sepay` |
| `INVOICE_API_URL` | Mock invoice provider URL | Yes | — | `http://localhost:8001/mock/invoice` |
| `CASE_API_URL` | Mock case management API URL | Yes | — | `http://localhost:8001/mock/case` |
| `LLM_PROVIDER` | LLM provider name | Yes | — | `openai` |
| `LLM_API_KEY` | LLM provider API key | Yes | — | `sk-...` |
| `LLM_MODEL_PLANNER` | Model for Planner Agent | Yes | — | `gpt-4o` |
| `LLM_MODEL_SPECIALIST` | Model for specialist agents | Yes | — | `gpt-4o-mini` |
| `CORS_ORIGINS` | Allowed CORS origins | No | `http://localhost:3000` | `http://localhost:3000` |
| `ENVIRONMENT` | Environment name | No | `development` | `development` |

## Key/secret generation

```bash
# JWT secret
openssl rand -hex 32

# SePay webhook secret
openssl rand -hex 32
```

## Docker and services setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: khop
      POSTGRES_PASSWORD: khop
      POSTGRES_DB: khop
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mock-services:
    image: khop-mock:latest
    ports:
      - "8001:8001"
    # Provides mock SHB, SePay, invoice, case APIs

volumes:
  pgdata:
```

```bash
# Start services
docker-compose up -d

# Verify
docker-compose ps
```

## Database setup

```bash
# Install pgvector extension
docker-compose exec postgres psql -U khop -d khop -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run migrations
cd backend
alembic upgrade head

# Seed demo data
alembic seed demo
```

## Running the application

```bash
# Backend (terminal 1)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (terminal 2)
cd frontend
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/v1`
- API docs: `http://localhost:8000/docs`

## Running tests

```bash
# Backend tests
cd backend
source venv/bin/activate
pytest tests/ -v

# Backend tests with coverage
pytest tests/ -v --cov=app --cov-report=term

# Frontend build check
cd frontend
npm run build
npm run lint
```

## Project structure

See `06-system-architecture.md` § Module structure and directory map.

## Common issues and solutions

| Issue | Solution |
|---|---|
| `pgvector extension not found` | Use `pgvector/pgvector:pg16` Docker image instead of plain `postgres:16` |
| `alembic upgrade head` fails | Ensure PostgreSQL is running: `docker-compose ps` |
| `LLM_API_KEY invalid` | Verify key in `.env`; check provider dashboard |
| `CORS error in browser` | Verify `CORS_ORIGINS` includes frontend URL |
| `Port already in use` | Check for running processes: `lsof -i :8000` or `netstat -ano \| findstr :8000` |
| `SePay webhook not received` | Ensure mock services running on port 8001 |
| `Vietnamese text garbled` | Ensure database encoding is UTF-8: `SHOW server_encoding;` |

## Verification

### Automated

- `docker-compose ps` — all services running
- `alembic current` — migrations up to date
- `curl http://localhost:8000/docs` — API docs accessible
- `curl http://localhost:3000` — frontend accessible

### Manual

- Follow setup from clean machine → verify all steps succeed
- Verify env vars table matches code references

---

*Last updated: 2026-07-17*
