# Hướng dẫn Deploy TaxLens lên Render

Tài liệu này hướng dẫn deploy toàn bộ TaxLens (Next.js + FastAPI) lên **một Web Service duy nhất** trên Render.

---

## Kiến trúc

```
Trình duyệt
  └─► https://taxlens.onrender.com  (Render Web Service, port do Render cấp)
        └─► Next.js standalone server  (node server.js)
              ├── Trang web: render các trang React bình thường
              └── /api/backend/* → proxy server-side → FastAPI  (127.0.0.1:8001, internal)
                    └─► Supabase PostgreSQL
```

Không có hai service riêng. Browser không bao giờ gọi FastAPI trực tiếp — mọi request API đều đi qua Next.js proxy route (`src/app/api/backend/[...path]/route.ts`).

**Lưu ý về WebSocket:** Trong cấu hình một-service này, WebSocket agent-trace (`/ws/agent-trace/{run_id}`) không hoạt động với browser vì FastAPI chạy trên port nội bộ (8001). Agent trace UI sẽ không nhận real-time events. Vì agent run hiện tại là no-op (P0 architecture gap), điều này không ảnh hưởng đến demo.

---

## Bước 1: Chuẩn bị Supabase

TaxLens cần một PostgreSQL database. Nếu chưa có Supabase project:

1. Đăng ký tại [supabase.com](https://supabase.com) → tạo project mới
2. Vào **Settings → Database** → copy **Connection string** loại "URI"
3. Thay `postgres://` thành `postgresql+asyncpg://` (cần thiết cho asyncpg của Python)
4. URL cuối cùng có dạng:
   ```
   postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

**Quan trọng về connection string:**
- Dùng **Direct connection** (hostname `db.[REF].supabase.co`, port `5432`) — KHÔNG dùng Transaction Pooler (port `6543`) vì asyncpg dùng prepared statements không tương thích với pgBouncer transaction mode.
- Nếu Supabase project của bạn yêu cầu IPv4 (thường trên free plan mới), dùng **Session Pooler** thay vì Direct: `postgresql+asyncpg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`

**Alembic migration sẽ chạy tự động** mỗi khi deploy (qua `preDeployCommand` trong render.yaml). Không cần chạy thủ công lần đầu trừ khi deploy fail.

---

## Bước 2: Chuẩn bị Upstash Redis (miễn phí)

TaxLens dùng Redis cho auth lockout. Render không có Redis miễn phí — dùng Upstash:

1. Đăng ký tại [upstash.com](https://upstash.com) → **Create Database** → chọn region gần Render region của bạn (mặc định Render dùng `Oregon`)
2. Chọn **Free** plan (10.000 lệnh/ngày, đủ cho demo)
3. Sau khi tạo xong, copy **Redis URL** dạng:
   ```
   rediss://default:[PASSWORD]@[HOST].upstash.io:6379
   ```
   (chú ý `rediss://` — có `s`, là TLS, đây là đúng)

---

## Bước 3: Tạo Web Service trên Render

### 3a. Deploy từ Blueprint (render.yaml)

1. Đăng nhập [render.com](https://render.com) → **New → Blueprint**
2. Kết nối GitHub repository TaxLens
3. Render sẽ phát hiện `render.yaml` ở root repo và hiển thị danh sách services
4. Click **Apply** — Render sẽ hỏi giá trị cho các biến có `sync: false`

### 3b. Hoặc: Tạo thủ công (nếu không dùng Blueprint)

1. **New → Web Service**
2. Kết nối GitHub repo
3. Cấu hình:
   - **Name:** `taxlens`
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `./Dockerfile.render`
   - **Docker Context:** `.` (root repo)
   - **Plan:** Starter ($7/tháng) hoặc Free (có cold start)
4. Thêm biến môi trường theo danh sách ở Bước 4

---

## Bước 4: Nhập biến môi trường trên Render Dashboard

Vào service → **Environment** tab → thêm từng biến sau.

### Biến PHẢI nhập (secrets — không đặt trong file):

| Tên biến | Giá trị | Ghi chú |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:[PW]@db.[REF].supabase.co:5432/postgres` | Supabase direct connection |
| `REDIS_URL` | `rediss://default:[PW]@[HOST].upstash.io:6379` | Upstash Redis URL |
| `JWT_SECRET` | (32-byte hex ngẫu nhiên) | Chạy: `openssl rand -hex 32` |
| `SEPAY_API_URL` | `https://my.sepay.vn/userapi` | URL SePay (không phải secret, nhưng đặt ở đây cho nhất quán) |
| `SEPAY_API_TOKEN` | (token của SePay account) | Nếu không có, nhập `demo-placeholder` |
| `SEPAY_WEBHOOK_API_KEY` | (khóa webhook bạn tự đặt) | Nếu không dùng live webhook, nhập bất kỳ chuỗi nào |
| `LLM_API_KEY` | (DeepSeek API key) | Lấy tại platform.deepseek.com — dùng cùng giá trị với `DEEPSEEK_API_KEY` |
| `DEEPSEEK_API_KEY` | (DeepSeek API key) | **Cùng giá trị** với `LLM_API_KEY` — P2 agent code đọc biến này trực tiếp |
| `OPENROUTER_API_KEY` | (OpenRouter API key, optional) | Chỉ cần nếu dùng OpenRouter thay DeepSeek. Để trống nếu dùng DeepSeek trực tiếp |

### Biến đã được đặt sẵn trong render.yaml (không cần nhập thêm):

| Tên biến | Giá trị |
|----------|---------|
| `ENVIRONMENT` | `production` |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_ACCESS_EXPIRE_MINUTES` | `15` |
| `JWT_REFRESH_EXPIRE_DAYS` | `7` |
| `LLM_PROVIDER` | `deepseek` |
| `LLM_MODEL_PLANNER` | `deepseek-chat` |
| `LLM_MODEL_SPECIALIST` | `deepseek-chat` |
| `INVOICE_API_URL` | `http://127.0.0.1:8001/mock/invoice` |
| `CASE_API_URL` | `http://127.0.0.1:8001/mock/case` |
| `CORS_ORIGINS` | `*` |

---

## Bước 5: Deploy

1. Sau khi điền xong biến môi trường → **Save Changes** (nếu thêm thủ công) hoặc **Apply** (nếu qua Blueprint)
2. Render bắt đầu build — quá trình mất khoảng 5–10 phút:
   - Pull code từ GitHub
   - Build Docker image (Next.js build + pip install)
   - Chạy `preDeployCommand`: `alembic upgrade head` (tạo tables trong Supabase)
   - Start container: FastAPI trên :8001 → Next.js trên :$PORT
3. Khi status chuyển sang **Live** → service sẵn sàng

---

## Bước 6: Chạy Alembic migration thủ công (nếu cần)

`preDeployCommand` trong render.yaml sẽ tự chạy `alembic upgrade head` mỗi deploy. Nếu cần chạy thủ công (ví dụ: debug migration fail):

1. Render Dashboard → service `taxlens` → **Shell** tab
2. Trong shell:
   ```bash
   cd /app/backend
   alembic current          # xem migration hiện tại
   alembic upgrade head     # apply tất cả migrations
   alembic history          # xem lịch sử migrations
   ```
3. Nếu migration fail do schema conflict: `alembic downgrade base` rồi `alembic upgrade head`

**Lưu ý:** Chạy `alembic downgrade base` sẽ DROP toàn bộ tables. Chỉ làm trên DB test/demo, không làm trên production data.

---

## Bước 7: Seed data (cho demo)

Sau khi migration xong, cần seed data để demo có dữ liệu:

1. Vào **Shell** tab trong Render Dashboard
2. Chạy:
   ```bash
   cd /app/backend
   python scripts/seed_data.py
   ```

Nếu không có `seed_data.py` hoặc script fail: kiểm tra log để biết lý do.

---

## Bước 8: Lấy URL public

Sau khi service **Live**:
- Render Dashboard → service `taxlens` → phần **Your service is live at:** → copy URL dạng `https://taxlens.onrender.com`
- Truy cập URL này để test

---

## Xem log khi deploy fail

- Render Dashboard → service → **Logs** tab → chọn **Deploy Logs** để xem log build + migration
- Xem **Service Logs** để xem log runtime (lỗi FastAPI, lỗi Next.js)
- Phần quan trọng cần tìm trong log:
  - `[taxlens] Backend ready.` → FastAPI đã start thành công
  - `[taxlens] Starting Next.js` → sắp start Next.js
  - Dòng `alembic upgrade head` trong build log → xem migration có apply không
  - `ERROR` trong log FastAPI → lỗi config (thường do thiếu env var)

---

## Giới hạn cần biết khi demo qua Render

### Free plan (Render free tier)
- Service **sleep sau 15 phút không có request** — khi ai request lại, phải chờ **30–60 giây** cold start
- **Ảnh hưởng nghiêm trọng đến demo:** Nếu demo live mà để service sleep, mở trình duyệt lần đầu sẽ timeout hoặc trả về lỗi
- **Giải pháp:** Dùng **Starter plan ($7/tháng)** — không có sleep, service luôn chạy. Hoặc: mở tab và refresh liên tục trước khi demo để giữ service thức

### Render Starter plan
- Không có sleep (service luôn running)
- 512 MB RAM, 0.5 CPU — đủ cho demo nhỏ
- Build Docker mất 5–10 phút (Node.js + Python combined image ~500MB)

### Build thất bại do timeout
- Nếu `npm ci` hoặc `pip install` timeout: thử retry — Render cache layers nên lần 2 nhanh hơn
- Nếu vẫn fail: kiểm tra internet connectivity của build server (rất hiếm)

### WebSocket agent-trace
- WebSocket (`/ws/agent-trace/{run_id}`) **không hoạt động** trong cấu hình single-service này
- Agent trace UI sẽ không có real-time events (chỉ load data tĩnh khi mở trang)
- Acceptable cho demo vì agent run hiện tại là placeholder (không có real-time events anyway)
- Nếu cần WebSocket thật: chạy frontend và backend làm 2 Render services riêng, set `TAXLENS_BACKEND_URL` trong frontend service trỏ sang backend service URL

---

## Checklist trước khi bấm Deploy

- [ ] `DATABASE_URL` trỏ đúng Supabase, không dùng port 6543
- [ ] `REDIS_URL` là Upstash URL, format `rediss://...`
- [ ] `JWT_SECRET` đã generate, không để trống
- [ ] `LLM_API_KEY` và `DEEPSEEK_API_KEY` cùng giá trị (DeepSeek API key)
- [ ] `SEPAY_API_TOKEN` và `SEPAY_WEBHOOK_API_KEY` đã nhập (dùng placeholder nếu không có real SePay)
- [ ] Render plan là **Starter** (không phải Free) nếu demo live
