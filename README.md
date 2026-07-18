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

## Deploy

Xem [`DEPLOY.md`](./DEPLOY.md) — hướng dẫn deploy lên Render (single service, không cần 2 URL).

TL;DR: push code → Render detect `render.yaml` → nhập 9 biến secrets trên Dashboard → done.

---

