# SePay Webhook Integration Guide

> **Audience:** P3 (Frontend) and anyone testing the real-time transaction flow.
> **Prerequisites:** Backend running, PostgreSQL running, SePay account connected to MB Bank.

---

## Architecture

```
Money arrives at MB Bank account
  → SePay detects transaction
    → SePay sends POST webhook to your tunnel URL
      → Backend saves BankTransaction to DB
        → WebSocket broadcasts to all connected frontends
          → Toast popup appears on screen
```

---

## Setup Checklist

### 1. Environment Variables

Ensure `backend/.env` has:

```env
SEPAY_API_URL=https://my.sepay.vn/userapi
SEPAY_API_TOKEN=your_sepay_api_token
SEPAY_WEBHOOK_API_KEY=your_webhook_api_key_from_sepay
```

The `SEPAY_WEBHOOK_API_KEY` is set in SePay's webhook config (Bước 3: Bảo mật → API Key). SePay sends it as `Authorization: Apikey <key>`.

### 2. Configure Webhook in SePay

1. Go to **my.sepay.vn** → **Webhooks** → **+ Add**
2. **Bước 1 — Thông tin cơ bản:**
   - Name: `TaxLens`
   - Event: `Tiền vào` (or `Tất cả` for both in/out)
   - URL: `https://<your-tunnel-url>/api/v1/webhooks/sepay?merchant_id=M001`
3. **Bước 2 — Tài khoản và bộ lọc:**
   - Select your MB Bank account
4. **Bước 3 — Bảo mật:**
   - Choose **API Key**
   - Enter a strong key (save the same value in `backend/.env` as `SEPAY_WEBHOOK_API_KEY`)
5. **Bước 4 — Cảnh báo:** Optional
6. Click **Thêm** to save

### 3. Start the Tunnel

**ngrok (recommended):**

```bash
ngrok http 8000
```

Copy the forwarding URL (e.g. `https://xxxx.ngrok-free.app`) and update the SePay webhook URL.

**localtunnel (alternative, has interstitial page issues):**

```bash
npx localtunnel --port 8000 --subdomain taxlens
```

⚠️ Localtunnel shows an interstitial "Tunnel website ahead" page that blocks webhooks. Use ngrok instead.

### 4. Start Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`. You should see a green "Live" badge in the top-right corner — that means the WebSocket is connected.

### 6. Test the Webhook

**Option A — SePay "Gửi thử" button:**

Go to your webhook detail page in SePay → click **Gửi thử**. This sends a sample payload without a real transaction.

**Option B — Real transfer:**

Transfer any amount to the bank account configured in SePay (e.g. `0917963988`, MB Bank, NGO NHAT TAN). SePay will fire the webhook within seconds.

**Option C — Manual test from terminal:**

```powershell
$body = @{
    id = 12345
    gateway = "MB"
    transactionDate = "2026-07-17 21:00:00"
    accountNumber = "0917963988"
    code = "MB"
    content = "test manual webhook"
    transferType = "in"
    transferAmount = 50000
    accumulated = 5000000
    subAccount = ""
    referenceCode = "MANUAL001"
    description = "Manual test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/webhooks/sepay?merchant_id=M001" `
    -Method Post -ContentType "application/json" `
    -Headers @{ Authorization = "Apikey YOUR_KEY" } `
    -Body $body
```

### 7. Verify

- Backend terminal: `POST /api/v1/webhooks/sepay` → `200 OK`
- Frontend: Green toast popup slides in from the right showing amount and note
- API: `GET /api/v1/transactions?merchant_id=M001&period=2026-07` shows the transaction

---

## SePay Webhook Payload

```json
{
    "id": 68701348,
    "gateway": "MBBank",
    "transactionDate": "2026-07-17 20:48:00",
    "accountNumber": "0917963988",
    "subAccount": null,
    "code": null,
    "content": "NGO NHAT TAN chuyen FT26198428860062",
    "transferType": "in",
    "description": "BankAPINotify NGO NHAT TAN chuyen ...",
    "transferAmount": 10000,
    "accumulated": 0,
    "referenceCode": "FT26198829293678"
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique transaction ID (used for dedup, canonical ID = `SEPAY-{id}`) |
| `gateway` | Bank name |
| `transactionDate` | `yyyy-mm-dd HH:MM:SS` |
| `accountNumber` | Receiving bank account |
| `content` | Transfer note / memo |
| `transferType` | `in` or `out` |
| `transferAmount` | Amount in VND |
| `referenceCode` | Bank reference code |
| `accumulated` | Running balance after transaction |

---

## Security Notes

- The webhook endpoint requires `Authorization: Apikey <key>` header. Without it, requests are rejected with 401.
- The API key is set in SePay's webhook config (Bước 3: Bảo mật) and must match `SEPAY_WEBHOOK_API_KEY` in `backend/.env`.
- `.env` is in `.gitignore` and should never be committed.
- SePay's webhook IPs (for firewall whitelist if needed):
  - `172.236.138.20`, `172.233.83.68`, `171.244.35.2`, `151.158.108.68`, `151.158.109.79`, `103.255.238.139`
- Duplicate transactions are handled: the backend checks if `SEPAY-{id}` already exists before inserting.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| 401 Unauthorized | API key mismatch | Ensure `.env` key matches SePay webhook config |
| 511 status | Localtunnel interstitial page | Switch to ngrok |
| No popup on frontend | WebSocket not connected | Check "Live" badge; ensure backend is running |
| Webhook not firing | Wrong URL in SePay | Ensure URL includes `/api/v1/webhooks/sepay?merchant_id=M001` |
| Duplicate transactions | SePay retry | Already handled — backend deduplicates by `SEPAY-{id}` |
| ngrok closes immediately | Missing authtoken | Run `ngrok config add-authtoken YOUR_TOKEN` |

---

## Files

| File | Purpose |
|------|---------|
| `backend/app/adapters/sepay.py` | Webhook endpoint, payload parsing, DB insert, WebSocket broadcast |
| `backend/app/core/ws_manager.py` | WebSocket connection manager |
| `backend/app/routers/ws.py` | WebSocket endpoint `/api/v1/ws/transactions` |
| `frontend/src/hooks/useTransactionSocket.ts` | WebSocket hook with auto-reconnect |
| `frontend/src/components/TransactionToast.tsx` | Toast popup UI component |
| `frontend/src/components/Providers.tsx` | Mounts toast globally |
