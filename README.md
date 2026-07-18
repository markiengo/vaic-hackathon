# TaxLens

> **Biến đống giao dịch ngân hàng lộn xộn thành bộ số liệu sạch, sẵn sàng kê khai thuế — tự động.**

Từ 2026, hộ kinh doanh Việt Nam phải kê khai doanh thu và nộp thuế theo từng kỳ. Vấn đề: chuyển khoản ngân hàng, đơn hàng POS, tiền mặt, hóa đơn — tất cả nằm ở bốn nơi khác nhau, không ai tự khớp với nhau.

Kế toán mất 45 phút mỗi kỳ chỉ để đối soát. Sai sót xảy ra. Tiền bị phân loại nhầm. Hóa đơn bị bỏ sót.

**TaxLens giải quyết bài toán đó bằng 4 AI agent chạy song song — không cần tải file, không cần Excel.**

---

## Người dùng

| Vai trò | Họ làm gì trong TaxLens |
|---|---|
| **Chủ hộ kinh doanh** | Xem dashboard doanh thu, xử lý các khoản AI chưa chắc chắn, confirm giao dịch bất thường, xuất dữ liệu cho kế toán |
| **Nhân viên SHB** | Tiếp nhận các case phức tạp được chuyển lên, kiểm tra quyết định của hệ thống, export audit log |

---

## Hệ thống hoạt động như thế nào

```
Bank transactions  ──┐
Sales orders       ──┤──► Matching Engine ──► Reconciliation Case ──► AI Pipeline
Cash sessions      ──┤                                                      │
Invoices           ──┘                                          ┌───────────┴────────────┐
                                                                ▼                        ▼
                                                        Auto-matched             Exception queue
                                                        (≥95% confidence)        (human review)
                                                                │                        │
                                                                └──────────┬─────────────┘
                                                                           ▼
                                                                  Tax readiness check
                                                                  → Clean export (JSON/CSV)
```

**4 AI agents chạy trong pipeline:**
- **Planner** — nhận yêu cầu bằng tiếng Việt, chia nhỏ thành các bước
- **Reconciliation Agent** — khớp giao dịch ngân hàng với đơn hàng
- **Tax Compliance Agent** — kiểm tra rule version, phát hiện hóa đơn thiếu
- **Merchant Ops Agent** — tạo case, soạn tin nhắn, gửi link xác nhận cho chủ shop

**Scoring model cho matching:**
- Amount match: +50 · Time window: +20 · Reference code: +20 · Sender name: +10 · Multi-order penalty: −30
- **≥95** → auto-match · **75–94** → human confirm · **<75** → exception

**Mục tiêu MVP:** ≥80% giao dịch được match tự động, 100% quyết định có audit record.

---

## Số liệu codebase

| | |
|---|---|
| REST endpoints | 20+ |
| SQLAlchemy models | 16 |
| Error codes (spec + tests) | 28 / 28 covered |
| Test functions | 188 |
| Integration tests (HTTP level) | 37 — in-memory SQLite, không cần Postgres |
| AI agents | 4 |
| Frontend pages | 11 |

---

## Tech stack

**Backend**
- Python 3.11 · FastAPI · SQLAlchemy 2.0 async (asyncpg) · Alembic
- LangGraph · DeepSeek / OpenRouter (OpenAI-compatible)
- Redis (auth lockout, rate limiting)
- JWT (access 15m / refresh 7d) · HMAC confirmation tokens

**Frontend**
- Next.js 16 · React 19 · TypeScript · TailwindCSS 4
- TanStack Query · Zod · Lucide React · Recharts
- Next.js App Router với server-side proxy (không expose FastAPI ra browser)

**Infrastructure**
- Docker Compose (local) · Render single-service (prod)
- Supabase PostgreSQL · Upstash Redis
- Vitest · Playwright (E2E) · pytest-asyncio

---

## Repo

```
taxlens/
├── backend/
│   ├── app/
│   │   ├── agents/          # 4 AI agents + LangGraph graph + audit
│   │   │   ├── planner.py
│   │   │   ├── reconciliation.py
│   │   │   ├── tax_compliance.py
│   │   │   ├── merchant_ops.py
│   │   │   └── graph.py     # agent state machine
│   │   ├── routers/         # 11 FastAPI routers (REST + WebSocket)
│   │   ├── services/        # matching, allocation, tax rules, export, NLP
│   │   ├── models/          # 16 SQLAlchemy models
│   │   ├── adapters/        # SePay webhook, SHB mock, CSV, invoice
│   │   └── tools/           # 19 agent tool implementations
│   ├── tests/               # 188 test functions
│   │   ├── test_integration.py   # 37 HTTP endpoint tests (in-memory SQLite)
│   │   ├── test_matching.py
│   │   ├── test_truth_set.py
│   │   └── test_vietnamese_nlp.py
│   ├── scripts/
│   │   ├── seed_data.py          # load demo data (30 sales, 23 txns, 28 invoices)
│   │   ├── validate_pipeline.py  # end-to-end pipeline check
│   │   ├── simulate_sepay_webhook.py
│   │   └── backup_demo.py / restore_demo.py
│   ├── alembic/             # DB migrations
│   └── .env.example
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (merchant)/  # dashboard, exceptions, transactions, tax-readiness,
│       │   │                #   invoices, sales, assistant, support, settings
│       │   ├── (operations)/ops/   # SHB staff view
│       │   ├── confirm/[token]/    # merchant confirmation — no auth required
│       │   └── api/backend/[...path]/  # server-side proxy → FastAPI
│       ├── components/      # AppShell, domain components, UI kit
│       └── lib/             # API client, auth, realtime WS
│
├── docs/                    # product spec, data models, API reference, design
├── docker-compose.yml
├── Dockerfile.render        # combined image for Render (Python + Node)
├── start.sh                 # startup: FastAPI :8001 → Next.js :$PORT
└── render.yaml              # Render Blueprint
```

**Đọc thêm:**
- `docs/01-foundation/03-product-spec.md` — full product spec, KPIs, demo script
- `docs/03-engineering/02-data-models.md` — 16 models, relationships, indexes
- `docs/03-engineering/05-api-reference.md` — 20+ endpoints, 28 error codes
- `docs/05-domain/01-ai-advisor.md` — agent design, tool signatures, prompts

---

## Chạy local

### Yêu cầu

- Python 3.11+ · Node.js 22+ · Docker Desktop · Git

### 1. Clone và chuẩn bị

```bash
git clone <repo-url>
cd taxlens
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Điền DATABASE_URL, REDIS_URL, JWT_SECRET, DEEPSEEK_API_KEY (hoặc OPENROUTER_API_KEY)

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Database (Docker)

```bash
# Từ root repo
docker-compose up -d postgres redis

# Chạy migration
cd backend
alembic upgrade head

# Load demo data
python scripts/seed_data.py
```

Sau khi seed: 1 merchant, 5 users, 30 sales, 23 bank transactions, 28 invoices, 1 tax rule (2026.07).

### 4. Chạy backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### 5. Frontend

```bash
cd frontend
npm install
```

Tạo file `frontend/.env.local`:

```bash
TAXLENS_BACKEND_URL=http://localhost:8000
```

```bash
npm run dev
# App: http://localhost:3000
```

### 6. Login

| Email | Password | Role |
|---|---|---|
| `admin@taxlens.vn` | `Admin@2026!` | Admin |
| `merchant@salon-hoa.vn` | `Merchant@2026!` | Merchant |

### Chạy tests

```bash
cd backend

# Integration tests (không cần Postgres, chạy ngay)
pytest tests/test_integration.py -v -k "not slow"

# Full test suite (cần Postgres đang chạy)
pytest tests/ -v

# Chỉ matching tests
pytest tests/test_matching.py tests/test_truth_set.py -v
```

### Full stack với Docker Compose

```bash
docker-compose up          # chạy postgres + redis + backend + frontend
docker-compose ps          # kiểm tra health
curl localhost:8000/health # {"status":"ok"}
```

---

## Deploy

Xem [`DEPLOY.md`](./DEPLOY.md) — hướng dẫn deploy lên Render (single service, không cần 2 URL).

TL;DR: push code → Render detect `render.yaml` → nhập 9 biến secrets trên Dashboard → done.

---

