# TaxLens — Product Walkthrough

> A complete journey through both workspaces: Merchant and SHB Operations.

---

## Persona 1: Nguyễn Thị Hương — Merchant Owner (Salon Hương)

### First Run — Onboarding

1. Hương navigates to `http://localhost:3000` and sees the landing page.
2. She clicks "Đăng nhập" and enters `huong.salonhoa@gmail.com` / `TaxLensDemo!2026`.
3. First-time onboarding screen appears: she confirms her business profile (name, tax ID, business type, category).
4. Onboarding completes → she lands on `/dashboard`.

### Dashboard

- Period selector (default: current month).
- KPIs: total revenue, matched transactions, pending exceptions, missing invoices, tax readiness score.
- All numbers are computed from real database rows — no hardcoded metrics.

### Transactions (`/transactions`)

- Lists all bank transactions for the selected period.
- Each transaction shows: amount, sender, raw note, AI interpretation (summary + confidence), match status.
- Filter by status (matched / unmatched / pending) and search by sender name or note.
- Click a transaction to see detail panel with AI reasoning and linked sale/invoice.

### Exceptions (`/exceptions`)

- Decision queue for transactions the matching engine couldn't auto-resolve.
- Three actions per exception:
  - **Confirm** — accept AI's proposed classification
  - **Reclassify** — change the classification (e.g., "internal transfer" → "revenue")
  - **Dismiss** — reject and close the exception
- Each action persists to the database and updates the reconciliation case.

### Sales (`/sales`)

- POS interface: select products, set quantities, create a sale.
- Payment options:
  - **QR Payment** — generates a payment intent with a dynamic QR code. When SePay webhook fires, the sale auto-matches.
  - **Cash** — record cash payment immediately.
- Cash session management: open session with opening cash, close with counted cash and discrepancy reason.

### Invoices (`/invoices`)

- Lists all sales and their invoice status (issued / missing / exempt).
- Missing invoice sales are highlighted — these block tax readiness.
- Actions: link an existing invoice, mark as exempt, sync with MISA (sandbox).

### Tax Readiness (`/tax-readiness`)

- Checklist of requirements for the current period:
  - All transactions matched or resolved
  - All paid sales have invoices
  - Cash sessions reconciled
  - Tax rule version active
- Each item shows pass/fail with evidence.
- Export draft: generates a JSON or CSV with all financial data ready for accountant.

### Assistant (`/assistant`)

- Hương types a request in Vietnamese (e.g., "Kiểm tra Salon Hoa đã sẵn sàng cho kỳ báo cáo tháng 7 chưa").
- The Planner agent decomposes the request into steps (reconciliation → tax → merchant ops).
- Progress updates stream in real-time via polling.
- Agent actions that modify data require human approval before execution.

### Support (`/support`)

- Hương can escalate an unresolved exception to SHB.
- She selects the exception, writes a message, and submits.
- A case is created in the SHB Operations console.
- She can view her case history and any responses from SHB staff.

### Settings (`/settings`)

- Profile: name, email, business details.
- Appearance: theme preference (persisted).
- Demo Reset: one-click reset to deterministic seed data.

---

## Persona 2: Trần Văn Long — SHB Operations Staff

### First Run — Onboarding

1. Long navigates to `http://localhost:3000` and logs in with `long.ops@shb.com.vn` / `TaxLensDemo!2026`.
2. SHB-specific onboarding: he confirms his role and region.
3. Lands on `/ops` — the SHB Operations Console.

### Portfolio Overview (`/ops`)

- Summary of all merchants in the portfolio (9 merchants: Salon Hương + 8 portfolio merchants).
- Aggregate metrics: total transactions, open cases, pending approvals.

### Merchants (`/ops/merchants`)

- List of all merchants with status, business type, and key metrics.
- Click a merchant to see their dashboard data (read-only — SHB cannot alter merchant source transactions).

### Cases (`/ops/cases`)

- List of reconciliation cases escalated by merchants or auto-created by the system.
- Each case shows: merchant, period, status, exceptions count, assigned RM.
- Case detail view:
  - View all exceptions in the case
  - Approve or reject AI-proposed actions
  - Draft a message to the merchant in Vietnamese
  - Resolve individual exceptions (confirm sale link, reclassify, dismiss)

### Agent Runs (`/ops/agent-runs`)

- History of all agent runs across merchants.
- Click a run to see the full trace: planner steps, specialist agent outputs, tool calls, evidence.
- Audit trail is immutable — no API can edit or delete audit events.

### Audit (`/ops/audit`)

- Immutable log of all audit events: agent actions, human decisions, tool calls.
- Filter by merchant, period.
- Export as CSV or JSON.

### Compliance (`/ops/compliance`)

- List of tax rule versions.
- View rule details: merchant type, business category, legal source, effective date.
- Only compliance role can activate a new rule version.

### Settings (`/ops/settings`)

- Operations profile and preferences.
- Demo reset access.

---

## Cross-Workspace State Propagation

1. **Merchant resolves exception** → reconciliation case updates → SHB sees resolved status in cases list.
2. **Merchant escalates to SHB** → case created → SHB sees new case in their queue.
3. **Sale → payment → invoice blocker** → creating a sale and receiving payment updates the invoice coverage and tax readiness.
4. **Agent orchestration** → agent runs are visible in both merchant assistant and SHB agent-runs views.
5. **Rule version activation** → compliance activates a new rule → all merchants' tax readiness recalculates with the new rules.

---

## Demo Reset

At any point, either user can reset the demo from Settings → "Reset demo data". This:
1. Wipes all mutations (sales, payments, exceptions, cases, agent runs).
2. Re-seeds the deterministic dataset.
3. Resets onboarding status.
4. Returns the system to its initial state — ready for a fresh demo.
