# DESIGN.md — KHỚP UI Specification

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Design Lead
> **Applies to:** Frontend UI
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** See § Verification below

---

## Design system

### Colors

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#006837` (SHB green) | Primary actions, headers, branding |
| `--color-primary-light` | `#E6F2EC` | Hover states, subtle backgrounds |
| `--color-secondary` | `#1A4796` | Secondary actions, links |
| `--color-danger` | `#DC2626` | Errors, destructive actions |
| `--color-warning` | `#F59E0B` | Warnings, pending items |
| `--color-success` | `#16A34A` | Success states, matched transactions |
| `--color-background` | `#F9FAFB` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-text-primary` | `#111827` | Primary text |
| `--color-text-secondary` | `#6B7280` | Secondary text, labels |
| `--color-border` | `#E5E7EB` | Borders, dividers |

### Typography

| Token | Value | Usage |
|---|---|---|
| `--font-family` | `Inter, sans-serif` | All UI text |
| `--font-size-xs` | 12px | Labels, captions |
| `--font-size-sm` | 14px | Body text, table cells |
| `--font-size-base` | 16px | Default body |
| `--font-size-lg` | 18px | Section headers |
| `--font-size-xl` | 24px | Page titles |
| `--font-size-2xl` | 32px | Hero numbers (dashboard) |

### Spacing

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |

### Shadows

| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` |

### Borders

| Token | Value |
|---|---|
| `--border-radius-sm` | 4px |
| `--border-radius-md` | 8px |
| `--border-radius-lg` | 12px |
| `--border-width` | 1px |

## Reusable components

| Component | Variants | States |
|---|---|---|
| Button | primary, secondary, danger, ghost | default, hover, disabled, loading |
| Input | text, number, select | default, focus, error, disabled |
| Badge | success, warning, danger, info | — |
| Card | default, highlighted | — |
| Modal | confirm, form | open, closed |
| Table | striped, compact | empty, loading, error, populated |
| Alert | success, warning, danger | — |
| EmptyState | — | icon, title, description, action |

## Layout patterns

### App shell

```text
┌─────────────────────────────────────────────┐
│ Header: KHỚP logo │ Merchant selector │ User │
├──────────┬──────────────────────────────────┤
│ Sidebar  │ Main content area                │
│ - Dashboard│                                 │
│ - Exceptions│                                │
│ - Tax     │                                  │
│ - Cases   │                                  │
│ - Trace   │                                  │
│ - Audit   │                                  │
│ - Mini POS│                                  │
└──────────┴──────────────────────────────────┘
```

### Auth layout

Centered card with logo, login form. No sidebar.

## Screen-by-screen specification

### Screen 1: Merchant Dashboard

**Purpose:** Overview of merchant reconciliation status and active agents.

**Layout:** Full-width content area with summary cards in a grid, followed by active agent list.

**Components:**
- 4 summary cards: Total transactions, Reconciliation rate, Open exceptions, Tax readiness status
- Active agents panel: agent name, status, run link
- Quick action: "Start reconciliation" button

**States:**
- Default: Data loaded, cards show values
- Loading: Skeleton cards
- Empty: "No data for this period" with merchant selector
- Error: Alert with retry button

### Screen 2: Exception Inbox

**Purpose:** Show only transactions requiring human decisions.

**Layout:** List of exception cards, each expandable to show AI reasoning.

**Components:**
- Filter bar: merchant, period, exception type
- Exception card: amount, sender, note, AI suggestion badge with confidence, reasoning expandable section
- Action buttons: [Approve] [Reject] [Reclassify]
- Pagination

**States:**
- Default: List of exceptions
- Empty: "All transactions reconciled" with check icon
- Loading: Skeleton list
- Resolved: Card animates out

### Screen 3: Agent Trace

**Purpose:** Show full trace of agent actions for a run.

**Layout:** Timeline view with steps, tool calls, and decision points.

**Components:**
- Plan steps list with status icons (completed, running, waiting, failed)
- Tool call detail: agent name, tool name, confidence, timestamp, duration
- Waiting indicator for human approval steps
- Run status badge

**States:**
- Running: Steps update in real-time via WebSocket
- Completed: Full trace visible, read-only
- Failed: Error highlighted at failure point
- Empty: "No agent runs yet"

### Screen 4: Tax-Readiness View

**Purpose:** Show checklist of tax-readiness items.

**Layout:** Checklist with pass/fail indicators and rule version banner.

**Components:**
- Rule version banner: "Rule version: 2026.07 | Effective: 2021-07-01 | Source: Thông tư 40/2021"
- Checklist items with ✓/✗ icons and values
- Ready/Not ready status banner
- Export button (enabled when ready)

**States:**
- All pass: Green banner "Data ready for draft export"
- Some fail: Warning banner with list of failing items
- No data: "No data for this period"

### Screen 5: Mini POS

**Purpose:** Minimal POS for creating sales and generating QR codes.

**Layout:** Two-panel: product selection on left, cart and payment on right.

**Components:**
- Product grid: service/product cards with name and price
- Cart: line items with quantity controls, total
- Payment buttons: [Tiền mặt] [Tạo QR]
- QR display: modal with QR image and reference
- Cash session summary: opening cash, current expected, close button

**States:**
- Default: Product grid + empty cart
- QR generated: Modal with QR, timer countdown
- Cash session open: Summary bar at bottom
- Cash session closing: Modal with counted cash input

### Screen 6: Audit Log Export

**Purpose:** Export audit log as JSON or CSV.

**Layout:** Filter form + export button + preview table.

**Components:**
- Filter: merchant, period
- Format selector: JSON / CSV
- Export button
- Preview table (first 10 events)

**States:**
- Default: Filter form
- Exported: Download triggered
- No events: "No audit events for selected period"

### Screen 7: Merchant Confirmation Page

**Purpose:** Allow merchant to confirm transaction classification without login.

**Layout:** Centered card with transaction details and classification options.

**Components:**
- Transaction details: amount, sender, date
- AI suggestion with confidence
- Option buttons: [Chuyển nội bộ] [Doanh thu] [Tiền vay] [Khác]
- Submit button

**States:**
- Default: Transaction details + options
- Submitted: "Cảm ơn! Xác nhận đã được ghi nhận."
- Expired: "Liên kết đã hết hạn. Vui lòng liên hệ RM."
- Already confirmed: "Giao dịch này đã được xác nhận."

## Navigation structure

```text
Dashboard (/dashboard)
Exceptions (/exceptions)
Tax-Readiness (/tax)
Cases (/cases)
Agent Trace (/trace)
Audit Export (/audit)
Mini POS (/pos)
```

## Responsive behavior

| Breakpoint | Width | Behavior |
|---|---|---|
| Desktop | ≥1280px | Full sidebar + content |
| Tablet | 768–1279px | Collapsible sidebar (post-MVP) |
| Mobile | <768px | Not supported in MVP |

## Icon usage

- Library: Lucide React
- Key icons: `CheckCircle`, `AlertTriangle`, `XCircle`, `ArrowRight`, `QrCode`, `Banknote`, `FileText`, `Shield`

## Animation specifications

| Element | Animation | Duration |
|---|---|---|
| Exception resolved | Fade out + slide up | 300ms |
| Agent step completed | Color change + check icon | 200ms |
| QR modal open | Fade in + scale up | 200ms |
| Page transition | Fade | 150ms |
| Loading skeleton | Pulse | 1.5s loop |

## Verification

### Automated

- `cd frontend && npm run build` — verifies all pages build
- `cd frontend && npm run lint` — verifies code quality

### Manual

- Navigate to each screen → verify layout matches spec
- Test each state (default, loading, empty, error)
- Verify Vietnamese text renders correctly
- Verify responsive behavior at 1280px

### Evidence

- Screenshots of each screen in default state (to be captured during implementation)

---

*Last updated: 2026-07-17*
