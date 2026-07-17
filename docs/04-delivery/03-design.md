# 04-delivery/03-design.md — TaxLens UI Specification

> **Status:** Canonical
> **Authority:** Normative
> **Owner:** Design Lead
> **Applies to:** Frontend UI
> **Implementation state:** Target
> **Last verified against code:** N/A (greenfield)
> **Verification:** Xem § Verification bên dưới

---

## Design system

### Màu sắc

| Token | Value | Cách dùng |
|---|---|---|
| `--color-primary` | `#006837` (SHB green) | Primary actions, headers, branding |
| `--color-primary-light` | `#E6F2EC` | Hover states, subtle backgrounds |
| `--color-primary-dark` | `#004D27` | Active/pressed states, gradient ends |
| `--color-secondary` | `#1A4796` | Secondary actions, links |
| `--color-secondary-light` | `#EEF2FA` | Secondary hover backgrounds |
| `--color-danger` | `#DC2626` | Errors, destructive actions |
| `--color-danger-light` | `#FEE2E2` | Error backgrounds, alert fills |
| `--color-warning` | `#F59E0B` | Warnings, pending items |
| `--color-warning-light` | `#FEF3C7` | Warning backgrounds, alert fills |
| `--color-success` | `#16A34A` | Success states, matched transactions |
| `--color-success-light` | `#DCFCE7` | Success backgrounds, alert fills |
| `--color-background` | `#F9FAFB` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-surface-elevated` | `#FFFFFF` | Elevated cards, modals — with stronger shadow |
| `--color-text-primary` | `#111827` | Primary text |
| `--color-text-secondary` | `#6B7280` | Secondary text, labels |
| `--color-text-tertiary` | `#9CA3AF` | Placeholder text, disabled labels |
| `--color-border` | `#E5E7EB` | Borders, dividers |
| `--color-border-strong` | `#D1D5DB` | Emphasized borders, input focus rings |

### Gradient accents

| Token | Value | Cách dùng |
|---|---|---|
| `--gradient-primary` | `linear-gradient(135deg, #006837 0%, #004D27 100%)` | Primary button, hero header bar, active sidebar item accent |
| `--gradient-surface` | `linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)` | Card backgrounds for visual depth |
| `--gradient-sidebar` | `linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)` | Sidebar background for subtle elevation |
| `--gradient-header` | `linear-gradient(90deg, #006837 0%, #1A4796 100%)` | Login card header accent, brand banner |

### Typography

| Token | Value | Cách dùng |
|---|---|---|
| `--font-family` | `Inter, sans-serif` | Toàn bộ UI text |
| `--font-family-mono` | `JetBrains Mono, monospace` | Transaction IDs, payment references, code snippets |
| `--font-size-xs` | 12px | Labels, captions |
| `--font-size-sm` | 14px | Body text, table cells |
| `--font-size-base` | 16px | Default body |
| `--font-size-lg` | 18px | Section headers |
| `--font-size-xl` | 24px | Page titles |
| `--font-size-2xl` | 32px | Hero numbers (dashboard) |
| `--font-weight-normal` | 400 | Body text |
| `--font-weight-medium` | 500 | Labels, table headers |
| `--font-weight-semibold` | 600 | Card titles, button text |
| `--font-weight-bold` | 700 | Hero numbers, page titles, logo |
| `--letter-spacing-tight` | -0.02em | Hero numbers, page titles |
| `--letter-spacing-wide` | 0.05em | Uppercase labels, badges |

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

| Token | Value | Cách dùng |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` | Badges, inline elements |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Default cards, inputs |
| `--shadow-md` | `0 4px 8px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)` | Hover cards, dropdowns |
| `--shadow-lg` | `0 12px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)` | Modals, elevated panels |
| `--shadow-xl` | `0 20px 40px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)` | Login card, full-screen modals |
| `--shadow-focus` | `0 0 0 3px rgba(0,104,55,0.15)` | Input focus ring |
| `--shadow-card-hover` | `0 8px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | Interactive card hover state |

### Borders

| Token | Value |
|---|---|
| `--border-radius-sm` | 6px |
| `--border-radius-md` | 10px |
| `--border-radius-lg` | 14px |
| `--border-radius-xl` | 20px |
| `--border-radius-full` | 9999px |
| `--border-width` | 1px |
| `--border-width-strong` | 2px |

### Transitions

| Token | Value | Cách dùng |
|---|---|---|
| `--transition-fast` | `150ms ease` | Hover states, color changes |
| `--transition-base` | `200ms ease` | Button, card interactions |
| `--transition-slow` | `300ms ease` | Modal, page transitions |

### Glassmorphism accents

| Token | Value | Cách dùng |
|---|---|---|
| `--glass-bg` | `rgba(255,255,255,0.85)` | Header bar, sticky filter bars |
| `--glass-blur` | `blur(12px)` | Header bar backdrop filter |
| `--glass-border` | `rgba(255,255,255,0.6)` | Subtle top border on glass surfaces |

## Component tái sử dụng

| Component | Variants | States | Aesthetic notes |
|---|---|---|---|
| Button | primary (gradient), secondary, danger, ghost | default, hover, disabled, loading | Primary uses `--gradient-primary`; hover lifts with `--shadow-md`; 10px radius; semibold text; subtle scale(1.02) on hover |
| Input | text, number, select | default, focus, error, disabled | Focus ring uses `--shadow-focus`; 10px radius; transition 150ms on border-color |
| Badge | success, warning, danger, info | — | Pill shape (`--border-radius-full`); uppercase letter-spacing-wide; 12px font; subtle light background fill (e.g. success = `--color-success-light` bg + `--color-success` text) |
| Card | default, highlighted, interactive | default, hover | Default: white surface, `--shadow-sm`, 10px radius. Highlighted: left border 3px accent color. Interactive: hover lifts to `--shadow-card-hover` + translateY(-2px) |
| Modal | confirm, form | open, closed | `--shadow-xl`, 14px radius, fade+scale 200ms, backdrop blur 4px |
| Table | striped, compact | empty, loading, error, populated | Header row: #F9FAFB bg, semibold 14px, letter-spacing-wide. Striped rows: alternating #FFFFFF / #FAFAFA. Row hover: #E6F2EC |
| Alert | success, warning, danger | — | Light background fill (e.g. `--color-danger-light`), left border 3px, icon + title + description, 10px radius |
| EmptyState | — | icon, title, description, action | Centered, 48px icon in circular light background, 18px title, 14px description, optional ghost button |
| StatCard | default, trend-positive, trend-negative | — | Hero number 32px bold tight-tracking; label 12px uppercase secondary; optional trend arrow with colored value |
| Timeline | vertical | running, completed, failed | Left rail 2px #E5E7EB; node icons 20px circles; step content card with subtle left indent |

## Layout patterns

### App shell

```text
┌─────────────────────────────────────────────┐
│ Header: TaxLens logo │ Merchant selector │ User │
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

Card căn giữa với logo, login form. Không sidebar.

## Đặc tả từng screen

### Screen 1: Merchant Dashboard

**Mục đích:** Tổng quan trạng thái đối soát merchant và active agents.

**Layout:** Content area full-width với summary cards dạng grid, theo sau là active agent list.

**Components:**
- 4 summary cards: Total transactions, Reconciliation rate, Open exceptions, Tax readiness status
- Active agents panel: agent name, status, run link
- Quick action: nút "Bắt đầu đối soát"

**States:**
- Default: Data loaded, cards hiển thị values
- Loading: Skeleton cards
- Empty: "Không có data cho kỳ này" với merchant selector
- Error: Alert với retry button

### Screen 2: Exception Inbox

**Mục đích:** Hiển thị chỉ những transaction cần quyết định con người.

**Layout:** Danh sách exception cards, mỗi card expandable để hiển thị AI reasoning.

**Components:**
- Filter bar: merchant, period, exception type
- Exception card: amount, sender, note, AI suggestion badge với confidence, reasoning expandable section
- Action buttons: [Duyệt] [Từ chối] [Phân loại lại]
- Pagination

**States:**
- Default: Danh sách exceptions
- Empty: "Tất cả transaction đã đối soát" với check icon
- Loading: Skeleton list
- Resolved: Card animate out

### Screen 3: Agent Trace

**Mục đích:** Hiển thị full trace của agent actions trong một run.

**Layout:** Timeline view với steps, tool calls, và decision points.

**Components:**
- Plan steps list với status icons (completed, running, waiting, failed)
- Tool call detail: agent name, tool name, confidence, timestamp, duration
- Waiting indicator cho human approval steps
- Run status badge

**States:**
- Running: Steps update real-time qua WebSocket
- Completed: Full trace visible, read-only
- Failed: Error highlight tại failure point
- Empty: "Chưa có agent run nào"

### Screen 4: Tax-Readiness View

**Mục đích:** Hiển thị checklist các tax-readiness items.

**Layout:** Checklist với pass/fail indicators và rule version banner.

**Components:**
- Rule version banner: "Rule version: 2026.07 | Effective: 2021-07-01 | Source: Thông tư 40/2021"
- Checklist items với ✓/✗ icons và values
- Ready/Not ready status banner
- Export button (enabled khi ready)

**States:**
- All pass: Green banner "Data sẵn sàng cho draft export"
- Some fail: Warning banner với danh sách failing items
- No data: "Không có data cho kỳ này"

### Screen 5: Mini POS

**Mục đích:** POS tối giản để tạo sales và generate QR codes.

**Layout:** Hai panel: product selection bên trái, cart và payment bên phải.

**Components:**
- Product grid: service/product cards với name và price
- Cart: line items với quantity controls, total
- Payment buttons: [Tiền mặt] [Tạo QR]
- QR display: modal với QR image và reference
- Cash session summary: opening cash, current expected, close button

**States:**
- Default: Product grid + empty cart
- QR generated: Modal với QR, timer countdown
- Cash session open: Summary bar ở bottom
- Cash session closing: Modal với counted cash input

### Screen 6: Audit Log Export

**Mục đích:** Export audit log dạng JSON hoặc CSV.

**Layout:** Filter form + export button + preview table.

**Components:**
- Filter: merchant, period
- Format selector: JSON / CSV
- Export button
- Preview table (10 events đầu)

**States:**
- Default: Filter form
- Exported: Download triggered
- No events: "Không có audit events cho kỳ đã chọn"

### Screen 7: Merchant Confirmation Page

**Mục đích:** Cho phép merchant xác nhận phân loại transaction mà không cần login.

**Layout:** Card căn giữa với transaction details và classification options.

**Components:**
- Transaction details: amount, sender, date
- AI suggestion với confidence
- Option buttons: [Chuyển nội bộ] [Doanh thu] [Tiền vay] [Khác]
- Submit button

**States:**
- Default: Transaction details + options
- Submitted: "Cảm ơn! Xác nhận đã được ghi nhận."
- Expired: "Liên kết đã hết hạn. Vui lòng liên hệ RM."
- Already confirmed: "Giao dịch này đã được xác nhận."

## Cấu trúc navigation

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
| Mobile | <768px | Không hỗ trợ trong MVP |

## Sử dụng icon

- Library: Lucide React
- Key icons: `CheckCircle`, `AlertTriangle`, `XCircle`, `ArrowRight`, `QrCode`, `Banknote`, `FileText`, `Shield`

## Đặc tả animation

| Element | Animation | Duration |
|---|---|---|
| Exception resolved | Fade out + slide up | 300ms |
| Agent step completed | Color change + check icon pop (scale 0.8→1.0) | 200ms |
| QR modal open | Fade in + scale up (0.95→1.0) | 200ms |
| Page transition | Fade | 150ms |
| Loading skeleton | Pulse (opacity 0.5→1.0) | 1.5s loop |
| Card hover | translateY(-2px) + shadow elevation | 200ms ease |
| Button hover | scale(1.02) + shadow-md | 150ms ease |
| Badge appear | Fade in + scale up | 200ms |
| Number count-up | Hero numbers animate from 0 to value on load | 600ms ease-out |
| Progress bar fill | Width transition from 0 to target | 800ms ease-out |
| Sidebar item hover | Background slide-in from left | 150ms ease |

## Verification

### Automated

- `cd frontend && npm run build` — verify tất cả pages build
- `cd frontend && npm run lint` — verify code quality

### Manual

- Navigate từng screen → verify layout khớp spec
- Test từng state (default, loading, empty, error)
- Kiểm tra Vietnamese text render đúng
- Kiểm tra responsive behavior tại 1280px

### Evidence

- Screenshots từng screen ở default state (capture trong quá trình implementation)

---

*Last updated: 2026-07-17*
