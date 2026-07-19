# TaxLens Frontend

Giao diện TaxLens cho chủ hộ kinh doanh và nhân viên vận hành SHB, xây dựng bằng Next.js 16, React 19 và TypeScript.

## Chạy local

Yêu cầu: Node.js 20+ và backend TaxLens đang chạy tại `http://127.0.0.1:8000`.

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`. Tài khoản demo và dữ liệu đăng nhập do backend cung cấp.

Các biến môi trường chính:

```dotenv
# Chỉ được đọc ở server Next.js; không đưa URL backend trực tiếp vào browser.
TAXLENS_BACKEND_URL=http://127.0.0.1:8000

# Browser dùng hostname hiện tại và cổng này cho WebSocket.
NEXT_PUBLIC_TAXLENS_WS_PORT=8000

# Đặt false khi chạy HTTP local; giữ true sau HTTPS ở production.
TAXLENS_COOKIE_SECURE=false
```

Frontend dùng gateway cùng origin tại `/api/backend/*`. Gateway gắn access token từ HttpOnly cookie, tự thử refresh session khi backend trả `401`, và chuyển tiếp yêu cầu đến `${TAXLENS_BACKEND_URL}/api/v1/*`. Không thêm `NEXT_PUBLIC_API_URL` hoặc lưu JWT trong JavaScript phía client.

## Tuyến chính

- Merchant: `/dashboard`, `/transactions`, `/exceptions`, `/invoices`, `/tax-readiness`, `/sales`, `/assistant`, `/support`, `/settings`
- SHB Operations: `/ops`, `/ops/merchants`, `/ops/cases`, `/ops/agent-runs`, `/ops/audit`, `/ops/compliance`, `/ops/settings`
- Public/Auth: `/login`, `/confirm/[token]`
- Design QA nội bộ: `/_dev/showcase`

## Tài khoản demo

| Vai trò           | Email                         | Mật khẩu             |
| ------------------- | ----------------------------- | ------------------- |
| Merchant (Salon Hương) | `huong.salonhoa@gmail.com`    | `TaxLensDemo!2026`  |
| SHB Ops Staff      | `long.ops@shb.com.vn`        | `TaxLensDemo!2026`  |

Đăng nhập tại `/login`. Backend phải đã seed dữ liệu (`python scripts/seed_data.py --reset`).

## Cổng kiểm tra

```powershell
npm run lint
npm run typecheck
npm test -- --run
npm run build
npm run test:e2e
```

`npm run test:e2e` chạy Playwright trên ba kích thước desktop, compact và mobile. Cổng release chỉ đạt khi toàn bộ lệnh trên đều qua và luồng demo sáu cảnh được diễn tập với backend tích hợp.
