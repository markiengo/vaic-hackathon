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

| Token | Value | Cách dùng |
|---|---|---|
| `--font-family` | `Inter, sans-serif` | Toàn bộ UI text |
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

## Component tái sử dụng

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
| Agent step completed | Color change + check icon | 200ms |
| QR modal open | Fade in + scale up | 200ms |
| Page transition | Fade | 150ms |
| Loading skeleton | Pulse | 1.5s loop |

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
