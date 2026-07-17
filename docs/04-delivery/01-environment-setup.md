# Environment Setup — TaxLens

> **Status:** Canonical
> **Authority:** Informative
> **Owner:** DevOps
> **Applies to:** Môi trường development và demo
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Yêu cầu hệ thống

| Tool | Version | Mục đích |
|---|---|---|
| Python | 3.11+ | Backend runtime |
| Node.js | 20+ | Frontend runtime |
| PostgreSQL | 16+ | Database |
| Redis | 7+ | Queue/cache |
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Multi-container orchestration |
| Git | 2.40+ | Version control |

## Clone và install

```bash
git clone <repo-url> taxlens
cd taxlens

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

Tạo file `.env` ở project root:

| Name | Description | Required | Default | Example |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes | — | `postgresql://taxlens:taxlens@localhost:5432/taxlens` |
| `REDIS_URL` | Redis connection string | Yes | — | `redis://localhost:6379/0` |
| `JWT_SECRET` | JWT signing secret | Yes | — | (generate bằng `openssl rand -hex 32`) |
| `JWT_ALGORITHM` | JWT algorithm | No | `HS256` | `HS256` |
| `JWT_ACCESS_EXPIRE_MINUTES` | Access token expiry | No | `15` | `15` |
| `JWT_REFRESH_EXPIRE_DAYS` | Refresh token expiry | No | `7` | `7` |
| `SEPAY_API_URL` | SePay API base URL | Yes | — | `https://my.sepay.vn/userapi` |
| `SEPAY_API_TOKEN` | SePay API Bearer token | Yes | — | (lấy từ my.sepay.vn → API Access) |
| `SEPAY_WEBHOOK_API_KEY` | SePay webhook API key cho auth verification | Yes | — | (set trong SePay webhook config) |
| `INVOICE_API_URL` | URL mock invoice provider | Yes | — | `http://localhost:8001/mock/invoice` |
| `CASE_API_URL` | URL mock case management API | Yes | — | `http://localhost:8001/mock/case` |
| `LLM_PROVIDER` | LLM provider name | Yes | — | `deepseek` |
| `LLM_API_KEY` | DeepSeek API key | Yes | — | `sk-...` |
| `LLM_MODEL_PLANNER` | Model cho Planner Agent (with thinking) | Yes | — | `deepseek-chat` |
| `LLM_MODEL_SPECIALIST` | Model cho specialist agents | Yes | — | `deepseek-chat` |
| `CORS_ORIGINS` | CORS origins cho phép | No | `http://localhost:3000` | `http://localhost:3000` |
| `ENVIRONMENT` | Tên environment | No | `development` | `development` |

## Sinh key/secret

```bash
# JWT secret
openssl rand -hex 32

# SePay API token và webhook API key lấy từ my.sepay.vn dashboard
# API Access → Create API Token
# WebHook → Add webhook → API Key auth
```

## Docker và services setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: taxlens
      POSTGRES_PASSWORD: taxlens
      POSTGRES_DB: taxlens
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mock-services:
    image: taxlens-mock:latest
    ports:
      - "8001:8001"
    # Cung cấp mock SHB, SePay, invoice, case APIs

volumes:
  pgdata:
```

```bash
# Khởi động services
docker-compose up -d

# Kiểm tra
docker-compose ps
```

## Database setup

```bash
# Run migrations
cd backend
alembic upgrade head

# Seed demo data
alembic seed demo
```

## Chạy application

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

## Chạy tests

```bash
# Backend tests
cd backend
source venv/bin/activate
pytest tests/ -v

# Backend tests với coverage
pytest tests/ -v --cov=app --cov-report=term

# Frontend build check
cd frontend
npm run build
npm run lint
```

## Cấu trúc project

Xem `03-engineering/01-system-architecture.md` § Module structure and directory map.

## Vấn đề thường gặp và cách xử lý

| Vấn đề | Cách xử lý |
|---|---|
| `alembic upgrade head` fails | Kiểm tra PostgreSQL đang chạy: `docker-compose ps` |
| `LLM_API_KEY invalid` | Kiểm tra key trong `.env`; check provider dashboard |
| `CORS error in browser` | Kiểm tra `CORS_ORIGINS` bao gồm frontend URL |
| `Port already in use` | Kiểm tra process đang chạy: `lsof -i :8000` hoặc `netstat -ano \| findstr :8000` |
| `SePay webhook not received` | Kiểm tra mock services chạy trên port 8001 |
| `Vietnamese text garbled` | Kiểm tra database encoding UTF-8: `SHOW server_encoding;` |

## Verification

### Automated

- `docker-compose ps` — tất cả services đang chạy
- `alembic current` — migrations up to date
- `curl http://localhost:8000/docs` — API docs accessible
- `curl http://localhost:3000` — frontend accessible

### Manual

- Setup từ máy sạch → kiểm tra tất cả bước thành công
- Kiểm tra env vars table khớp với code references

---

*Last updated: 2026-07-17*
