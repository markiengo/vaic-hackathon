# TaxLens — Demo Runbook

> Step-by-step guide for demonstrating TaxLens to a client. Total time: ~8 minutes.

---

## Prerequisites

1. Backend running on `http://127.0.0.1:8000`
2. Frontend running on `http://localhost:3000`
3. Database seeded with deterministic demo data
4. Two browser tabs ready:
   - **Tab A (Merchant):** logged in as `huong.salonhoa@gmail.com` / `TaxLensDemo!2026`
   - **Tab B (SHB Ops):** logged in as `long.ops@shb.com.vn` / `TaxLensDemo!2026`

### Pre-flight Check

```bash
# Verify backend is up
curl http://127.0.0.1:8000/health

# Reset demo data to clean state
curl -X POST http://127.0.0.1:8000/api/v1/demo/reset \
  -H "Authorization: Bearer <jwt>"
```

---

## Scene 1: Merchant Dashboard & AI Assistant (2 min)

**Tab A — Merchant Workspace**

1. Show the dashboard at `/dashboard` — period July 2026.
2. Point out: 23 bank transactions, 15 auto-matched, 8 exceptions, 2 missing invoices.
3. Navigate to `/assistant`.
4. Type: "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa"
5. Show the Planner decomposing the request into steps: reconciliation → tax → merchant ops.
6. Progress updates appear in real-time.

**Key message:** *Merchant giao mục tiêu bằng tiếng Việt, AI tự phân việc.*

---

## Scene 2: Create Sale & QR Payment (2 min)

**Tab A — `/sales`**

1. Select 2 products (e.g., "Gội đầu dưỡng sinh" + "Cắt tóc nam").
2. Total: ~480,000₫.
3. Click "Tạo QR thanh toán" — a dynamic QR code appears.
4. Simulate SePay webhook:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/webhooks/sepay \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Api-Key: QOAGD42JP7VLZHHEXWD2JBZLBYGN9YVXIGEKE4HRG0INRD1KBAFF7LQCKPFYXNBU" \
  -d '{"transaction_id":"SEPAY-DEMO-001","amount":480000,"sender":"Nguyễn Minh Anh","note":"PAY-XXXX","type":"in"}'
```

5. Navigate to `/transactions` — the new transaction appears, auto-matched to the sale.

**Key message:** *Tạo đơn, nhận QR, thanh toán tự khớp — không cần Excel.*

---

## Scene 3: Resolve Ambiguous Transaction (1.5 min)

**Tab A — `/exceptions`**

1. Show the exception queue — 3 items with different scenarios.
2. Click the 5,000,000₫ transaction (non-revenue "ck cho em").
3. AI suggests "chuyển nội bộ" with 82% confidence.
4. Click "Xác nhận" to approve the AI classification.
5. The exception disappears from the queue.

**Key message:** *AI xử lý điều chắc chắn, con người xác nhận điều mơ hồ.*

---

## Scene 4: Missing Invoice & Tax Readiness (1 min)

**Tab A — `/tax-readiness`**

1. Show the checklist — "Hóa đơn đầy đủ" item shows FAIL.
2. Two cash sales (ORDER-1868, ORDER-1869) are missing invoices.
3. Navigate to `/invoices` to see the missing invoices highlighted.
4. Go back to `/tax-readiness` — click "Xuất dự thảo" to generate a JSON export.

**Key message:** *TaxLens chỉ ra chính xác điều gì còn thiếu, không bỏ sót.*

---

## Scene 5: SHB Operations — Case Resolution (1 min)

**Tab B — SHB Operations Console**

1. Navigate to `/ops/cases` — show the case list.
2. Click into a case — show exceptions, agent trace, evidence.
3. Draft a message to the merchant in Vietnamese.
4. Approve a proposed action.
5. Navigate to `/ops/audit` — show the immutable audit trail.

**Key message:** *SHB có đầy đủ dấu vết vận hành, mọi quyết định có bằng chứng.*

---

## Scene 6: Demo Reset (0.5 min)

**Tab A — `/settings`**

1. Scroll to "Demo Reset" section.
2. Click "Reset dữ liệu demo".
3. System returns to clean state.
4. Navigate to `/dashboard` — numbers are back to seed values.

**Key message:** *Reset một click, sẵn sàng demo lại từ đầu.*

---

## Closing

> **Merchant tự xử lý ngoại lệ đơn giản. SHB chỉ can thiệp khi cần. Dữ liệu thuế sẵn sàng đúng hạn.**

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Backend not responding | Check `uvicorn` process, verify port 8000 |
| Frontend API errors | Verify `TAXLENS_BACKEND_URL` in `.env.local` |
| Login fails | Run `python scripts/seed_data.py --reset` to reseed |
| Empty dashboard | Check that seed data was loaded successfully |
| Agent run hangs | Verify LLM API key in `.env`, or use deterministic fallback |
