# 04-delivery/03-design.md — TaxLens Product Design System

> **Status:** Current
> **Authority:** Normative
> **Owner:** Design Lead
> **Applies to:** Merchant Workspace and SHB Operations Console
> **Implementation state:** Current product direction; screen specifications are design-complete for the core merchant flow
> **Theme:** Light, dark, and system appearance modes
> **Product name:** TaxLens
> **Endorsement:** by SHB
> **Last updated:** 2026-07-18

---

## 1. Purpose

This document defines the current TaxLens product design system, information architecture, interaction model, and core screen specifications.

TaxLens is an SHB-backed TaxOps product that connects merchant transactions, orders, cash sessions, and invoices into a clean and auditable operating ledger. It helps merchants resolve only the cases that require human judgment, then verifies whether the resulting dataset is ready to move into accounting or tax workflows.

TaxLens is not:

- a full POS
- an accounting suite
- an electronic invoice issuer
- a tax filing product
- a generic AI chatbot
- a replacement for MISA, KiotViet, SePay, or existing merchant systems

TaxLens is the control and reconciliation layer between those systems.

### Product promise

> **Dòng tiền khớp. Sổ sách sạch. Vận hành nhẹ.**

### Core operating principle

> **Rules handle certainty. AI handles ambiguity. Humans approve important decisions.**

---

## 2. Product model

TaxLens has two distinct workspaces.

```text
Merchant Workspace
- Daily merchant operations
- Reconciliation visibility
- Human confirmation
- Invoice gap handling
- Lightweight sales capture
- Tax readiness

                ↓ escalation

SHB Operations Console
- Merchant portfolio oversight
- Escalated case handling
- Agent-run inspection
- Audit and compliance
- RM coordination
```

### Primary merchant persona

Hương, a salon owner:

- uses banking, QR, Zalo, and a simple POS comfortably
- does not think in accounting terminology
- wants to know what needs attention now
- should not have to inspect every transaction
- should complete routine exception handling in minutes

### Primary SHB operations persona

Linh, SHB merchant support:

- monitors many merchants
- reviews escalated cases
- inspects agent evidence and trace
- coordinates with Relationship Managers
- needs auditable decisions and operational accountability

---

## 3. Experience principles

1. **Exception-first**
   Show the user what requires judgment, not every raw record.

2. **Action before analytics**
   A screen should first answer: what happened, why it matters, and what to do next.

3. **Plain Vietnamese first**
   Use merchant language before technical, tax, or accounting terminology.

4. **One dominant action per state**
   Orange identifies the most important next step. Secondary actions must not compete visually.

5. **Human control remains explicit**
   AI suggestions never look like final decisions when human approval is required.

6. **Evidence accompanies uncertainty**
   Suggestions include confidence, supporting evidence, and reasons for doubt.

7. **Connected records remain visible**
   Users should understand the relationship:

   ```text
   Đơn hàng → Thanh toán → Hóa đơn → Sẵn sàng thuế
   ```

8. **No duplicate sources of truth**
   The same transaction, order, invoice, exception, or case must resolve to the same underlying record across screens.

9. **Progressive disclosure**
   Merchant-facing screens show the simple explanation first. Technical trace remains available but collapsed.

10. **TaxLens must not look like a generic admin template**
    It should feel editorial, warm, calm, and bank-grade.

---

## 4. Final information architecture

> **Superseded navigation snapshot:** Section 27.1 is the current normative information architecture and adds `Trợ lý TaxLens`. This section remains for decision history only.

## 4.1 Merchant Workspace sidebar

The final merchant navigation is:

```text
Tổng quan
Giao dịch
Cần xác nhận
Hóa đơn
Bán hàng
Sẵn sàng thuế
```

Utility destinations:

```text
Hỗ trợ SHB
Cài đặt
Đăng xuất
```

### Removed standalone items

Do not show separate sidebar entries for:

- Đơn hàng
- Tiền mặt
- Mini POS
- Agents
- Agent trace
- Audit logs

### Consolidation decision

`Bán hàng` contains:

```text
Tạo đơn
Lịch sử đơn
Ca tiền mặt
```

Orders remain a required domain entity, but order management is not a standalone TaxLens product module.

Cash remains operationally important, but it belongs inside the sales workflow rather than the global navigation.

AI agents are experienced contextually by merchants and operated directly only in the SHB Operations Console.

---

## 4.2 SHB Operations Console navigation

```text
Tổng quan danh mục
Cases
Agent runs
Trace & audit
Compliance
```

Utility destinations:

```text
Thông báo
Cài đặt
Đăng xuất
```

The SHB console is visually related to TaxLens but denser, more operational, and more explicit about system internals.

---

## 5. Brand foundation

TaxLens should feel:

- 90% credible
- 10% warm and playful
- structured without being bureaucratic
- intelligent without AI clichés
- premium without luxury decoration
- accessible to Vietnamese merchants
- trustworthy enough for financial operations

### Visual personality

Use:

- warm neutral canvas
- white operational surfaces
- navy structure
- orange action
- blue selection and trust
- mist information panels
- restrained mango progress accents
- generous whitespace
- thin borders
- subtle shadows
- editorial typography

Avoid:

- gradients
- glassmorphism
- dark mode
- green fintech themes
- neon colors
- robot illustrations
- generic banking dashboards
- heavy chart grids
- large colorful KPI walls
- decorative doodles in operational screens

---

## 6. Color system

| Token | Value | Usage |
|---|---:|---|
| `--color-text` | `#19244E` | Primary text, navigation, headings |
| `--color-background` | `#FCFBF8` | Main application canvas |
| `--color-surface` | `#FFFFFF` | Cards, panels, dialogs |
| `--color-primary` | `#F36B2E` | Primary action |
| `--color-primary-hover` | `#DD5C24` | Primary hover and pressed state |
| `--color-secondary` | `#253C96` | Active navigation, selected states, links |
| `--color-secondary-hover` | `#1F327F` | Secondary hover and pressed state |
| `--color-accent` | `#C4E7E5` | AI reasoning, calm information surfaces |
| `--color-mango` | `#F59A1E` | Supporting progress and small emphasis |
| `--color-border` | `#E5E7EE` | Standard divider |
| `--color-border-strong` | `#CDD1DD` | Focused or emphasized boundary |
| `--color-text-secondary` | `#5D647A` | Supporting text |
| `--color-text-tertiary` | `#858B9D` | Metadata, placeholders, disabled text |

### Color rules

- White and warm neutral surfaces dominate.
- Orange is reserved for the current primary action.
- Blue identifies active navigation, selected tabs, links, and focus.
- Mist supports AI explanation and neutral information.
- Mango supports progress but does not replace orange.
- Status must never rely on color alone.
- Do not use orange as the universal warning color.
- Error and negative values may use restrained semantic red.
- Success may use a restrained semantic green icon, but not large green surfaces.

---

## 7. Typography

```css
--font-display: "Newsreader", Georgia, serif;
--font-ui: "Momo Trust Display", Arial, sans-serif;
--font-mono: "JetBrains Mono", monospace;
```

### Font roles

#### Newsreader

Use for:

- page titles
- hero statements
- large financial values
- readiness percentage
- focused decision questions
- important completion states

Do not use for:

- navigation
- dense lists
- compact controls
- table cells
- buttons

#### Momo Trust Display

Use for:

- navigation
- body content
- labels
- buttons
- status pills
- card titles
- merchant-facing descriptions
- filters
- list rows

#### JetBrains Mono

Use for:

- transaction IDs
- payment references
- order IDs
- invoice IDs
- rule versions
- case IDs
- technical references
- audit references

Do not use monospace for general merchant-facing copy.

### Type scale

| Style | Font | Size | Line height | Weight |
|---|---|---:|---:|---:|
| Display | Newsreader | 56–64px | 1.05 | 700 |
| Page title | Newsreader | 34–40px | 1.10 | 700 |
| Section hero | Newsreader | 28–34px | 1.15 | 600 |
| Card title | Momo Trust Display | 18–22px | 1.30 | 600 |
| Body | Momo Trust Display | 15–16px | 1.50 | 400 |
| Standard UI | Momo Trust Display | 13–14px | 1.40 | 400 |
| Label | Momo Trust Display | 13–14px | 1.30 | 500 |
| Caption | Momo Trust Display | 11–12px | 1.40 | 400 |
| Technical | JetBrains Mono | 11–12px | 1.45 | 400 |

### Typography rules

- Merchant-facing body text must not fall below 14px.
- Sidebar labels should remain 14–15px.
- Vietnamese labels must not wrap letter-by-letter.
- Currency must remain on one line.
- Use tabular numerals where available.
- Currency format: `1.500.000₫`.
- Preserve names before IDs when truncation is required.
- Use `font-synthesis: none`.

---

## 8. Shape, surfaces, and elevation

### Radius

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 20px;
--radius-pill: 9999px;
```

### Shadow

```css
--shadow-xs: 0 1px 2px rgba(25, 36, 78, 0.05);
--shadow-sm: 0 2px 6px rgba(25, 36, 78, 0.07);
--shadow-md: 0 8px 20px rgba(25, 36, 78, 0.09);
--shadow-lg: 0 18px 40px rgba(25, 36, 78, 0.12);
```

### Surface rules

- Default card: white surface, thin border, no shadow or `--shadow-xs`.
- Elevated detail panel: white surface, thin border, `--shadow-sm`.
- Modal: white surface, `--shadow-lg`.
- Avoid stacking cards inside cards.
- Prefer section dividers and spacing over multiple nested boxes.
- Read-only values should not look like editable form inputs.

---

## 9. Layout system

### Desktop target

- Primary canvas: 1280px and above
- Reference design width: approximately 1440px
- Sidebar: 240–250px
- Main content horizontal padding: 36–44px
- Main content top padding: 28–36px
- Section gap: 24–32px
- Card padding: 20–28px

### Grid

Use a 12-column grid for page composition.

Recommended workspace splits:

- Transactions: 44% list / 56% detail
- Hóa đơn: 43% list / 57% detail
- Cần xác nhận: 30% queue / 70% guided review
- Bán hàng create mode: 60% catalog / 40% order
- Sẵn sàng thuế: 65% checklist / 35% supporting context

### Minimum widths

Never collapse operational panels below usable width.

- List panel: minimum 430–440px
- Detail panel: minimum 540–560px
- Current order panel: minimum 400px
- Service catalog: minimum 600px

### Scrolling

Where master-detail layouts are used:

- outer page should remain stable
- list panel scrolls independently
- detail panel scrolls independently
- filters stay visible
- selected-record header may be sticky
- action footer remains sticky
- final content must not be obscured by the footer

---

## 10. Global application shell

### Sidebar

The sidebar is visually fixed across Merchant Workspace screens.

Requirements:

- full TaxLens logo visible
- no clipping
- width approximately 240–250px
- navigation row height 44–48px
- active item uses blue selection treatment
- support and settings remain anchored near the bottom
- icons use Lucide with consistent stroke width
- no screen may shrink the sidebar to gain content width

### Page header

Standard page header contains:

Left:

- merchant chip or context
- reporting period
- update timestamp
- page title
- short explanatory subtitle

Right:

- up to three actions
- only one solid-orange action
- other actions are orange-outline or text

### Global agent activity

Merchant screens include a header utility:

`TaxLens đang xử lý`

This opens a plain-language activity drawer.

Example:

```text
Đang kiểm tra dữ liệu tháng 7

✓ Đã lấy giao dịch SHB
✓ Đã đối soát giao dịch
● Đang kiểm tra hóa đơn
○ Chuẩn bị báo cáo sẵn sàng thuế
```

Do not add an `Agents` sidebar item for merchants.

---

## 11. Shared interaction components

### Buttons

#### Primary

- solid orange
- one dominant action per screen state
- use for confirmation, resolution, creation, or continuation

#### Secondary

- orange outline
- use for alternatives that remain important

#### Tertiary

- orange or blue text
- use for navigation, detail views, or low-risk secondary actions

#### Overflow

Use for uncommon or potentially destructive actions.

### Status pills

Use plain Vietnamese labels:

- `Đã khớp`
- `Cần xác nhận`
- `Chưa xác định`
- `Thiếu hóa đơn`
- `Sai số tiền`
- `Chờ đồng bộ`
- `Đã hoàn tiền`
- `Đang xử lý`
- `Đã thanh toán`
- `Chưa thanh toán`
- `Đạt`
- `Cần xử lý`
- `Chưa sẵn sàng`
- `Sẵn sàng`

Pills must include readable text and must not depend on color alone.

### Lists

Operational lists should be:

- roomy
- horizontally stable
- optimized for scanning
- free from dense spreadsheet grids
- free from row-level CTA clutter

### Tables

Use a table only when comparison across columns is the primary task.

Tables must:

- preserve currency on one line
- use sticky headers when long
- maintain 44px minimum row height
- avoid excessive borders
- preserve names and amounts before secondary metadata

### Detail panels

Detail panels prioritize:

1. record identity
2. current status
3. connected records
4. TaxLens explanation
5. available actions
6. activity history

### Empty states

Empty states should answer:

- what is empty
- whether that is good or bad
- what the user can do next

No confetti. No cartoon mascots.

---

## 12. Merchant-facing AI and trace

TaxLens AI should be visible through results, not as a separate product surface.

### Default merchant view

Show:

- suggestion
- confidence
- supporting evidence
- uncertainty
- action requiring approval
- plain-language progress

### Contextual trace entry point

Use:

`Xem cách TaxLens xử lý`

Available on:

- transaction detail
- exception detail
- invoice issue detail
- tax readiness report
- completed payment match
- cash reconciliation result

### Merchant trace drawer

Default view:

- what data was checked
- what conclusion was proposed
- why
- confidence
- whether human approval is pending
- rule version where relevant

Advanced collapsed area may include:

- specialist agent
- tool name
- timestamp
- audit reference

Do not show hashes, JSON, raw prompts, or terminal-style logs by default.

---

# 13. Core Merchant Workspace screens

## 13.1 Tổng quan

### Purpose

The dashboard answers:

- What needs attention now?
- How close is the merchant to clean, tax-ready data?
- What changed recently?
- What should the merchant do next?

### Layout

Top row:

1. Readiness hero
2. Seven-day reconciliation progress
3. Invoice and tax snapshot

Below:

- `Thao tác nhanh`
- `Cần bạn xác nhận`
- full-width recent transactions

### Hero

Show:

- readiness percentage
- readiness status
- blocker summary
- one dominant CTA: `Xử lý 5 mục`

### Reconciliation card

Show:

- `25/30 đã khớp`
- compact trend visualization
- no oversized analytics

### Invoice and tax card

Show:

- missing invoices
- unresolved classifications
- rule version or readiness context

### Quick actions

Use four compact actions maximum.

Examples:

- `Tạo đơn`
- `Xử lý ngoại lệ`
- `Kiểm tra hóa đơn`
- `Chạy kiểm tra lại`

### Exceptions preview

Show:

- one featured exception
- two compact previews
- no direct approval on dashboard
- CTA: `Xem và xác nhận`

### Recent transactions

Use a roomy table or structured list.

Show:

- sender
- amount
- note
- source
- reconciliation status
- date

No row-level action overload.

### Traces to

- USR-MW-RECON-003
- USR-MW-TAX-001
- USR-MW-TAX-002
- USR-MW-AGENT-001

---

## 13.2 Giao dịch

### Purpose

The Transactions screen is the source of truth for finding, understanding, and investigating normalized financial flows.

It is not a prettier bank statement.

### User tasks

- search by sender, amount, note, date, or reference
- inspect reconciliation status
- inspect linked order and invoice
- inspect classification and TaxLens reasoning
- take contextual action
- understand allocation, refund, or partial payment

### Layout

Master-detail workspace:

- left list: 44%
- right detail: 56%

### Header

Actions:

- `Xuất dữ liệu`
- `Cập nhật dữ liệu`
- `Tạo giao dịch`

Only `Tạo giao dịch` is solid orange.

### Tabs

Counts are placed inside tabs:

- `Tất cả (30)`
- `Cần xử lý (5)`
- `Đã khớp (25)`
- `Thiếu hóa đơn (2)`

Do not add separate KPI cards.

### Left list

Controls:

- search
- reporting period
- filter
- sort

Each row contains:

- avatar or company icon
- sender
- transfer note
- amount
- time
- status

Amounts never wrap.

Selected row:

- soft mist or warm tint
- orange left indicator
- all content remains visible

### Right detail

Show:

- sender
- source
- timestamp
- amount
- raw note
- current classification
- reconciliation result
- TaxLens recommendation
- related records
- activity history

Use one mist reasoning card.

Avoid read-only form inputs.

### Sticky actions

Primary:

`Xem và xác nhận`

Secondary:

`Đổi phân loại`

Tertiary:

`Nhờ SHB hỗ trợ`

Overflow:

- `Ghép với đơn khác`
- `Chia cho nhiều đơn`
- `Xem lịch sử đầy đủ`

### Traces to

- USR-MW-RECON-001
- USR-MW-RECON-002
- USR-MW-RECON-004
- USR-MW-RECON-005
- USR-MW-RECON-006

---

## 13.3 Cần xác nhận

### Purpose

This is the core guided exception workflow.

The user resolves one ambiguous item at a time.

This screen should occupy nearly the full main workspace.

### Layout

- queue: 30%
- guided review: 70%

### Queue

Show only unresolved exceptions.

Each item contains:

- sender
- amount
- issue type
- confidence
- priority
- age

No row-level decision buttons.

Resolved items leave the active queue.

### Guided review

The primary question depends on exception type.

Examples:

- `Khoản tiền này là gì?`
- `Khoản thanh toán này thuộc đơn nào?`
- `Đơn này đã thanh toán nhưng chưa có hóa đơn. Bạn muốn làm gì?`

### TaxLens recommendation

Show:

- suggested classification or action
- confidence
- evidence supporting the suggestion
- reasons TaxLens remains uncertain

Do not auto-select the recommendation.

### Classification choices

Possible choices:

- `Chuyển nội bộ`
- `Doanh thu`
- `Tiền vay`
- `Tiền cọc`
- `Hoàn tiền`
- `Khác`

Each choice includes a short explanation.

### Sticky footer

Primary:

`Xác nhận lựa chọn`

Secondary:

`Nhờ SHB hỗ trợ`

Tertiary:

`Để sau`

The primary action is disabled until a choice is made.

After confirmation:

- progress updates
- item leaves queue
- next item loads automatically
- audit event is created

### Completion state

Show:

- `Bạn đã xử lý xong tất cả`
- `5/5`
- readiness improvement
- CTA: `Xem sẵn sàng thuế`

No confetti.

### Traces to

- USR-MW-RECON-003
- USR-MW-RECON-004
- USR-MW-RECON-006
- USR-MW-SUPPORT-001

---

## 13.4 Hóa đơn

### Purpose

The invoice screen is an invoice coverage and reconciliation workspace.

It answers:

- Which paid orders still lack an invoice?
- Which invoices are mismatched?
- Which invoices are unlinked?
- Which provider is out of sync?
- What is blocking tax readiness?

It is not an invoice-authoring product.

### Header actions

- `Đồng bộ lại`
- `Xuất danh sách`
- `Mở hệ thống hóa đơn`

Do not add `Tạo hóa đơn`.

### Primary action banner

Show:

- `2 đơn đã thanh toán nhưng chưa có hóa đơn`
- impact on readiness
- `28/30 đơn đã có hóa đơn phù hợp`
- CTA: `Xử lý 2 đơn`

### Tabs

- `Cần xử lý (2)`
- `Đã khớp (28)`
- `Chờ đồng bộ (1)`
- `Tất cả (31)`

### Layout

Master-detail:

- list: 43%
- detail: 57%

### List model

Organize by order, not raw invoice record.

Each row shows:

- customer
- service
- order ID
- amount
- payment status
- invoice status
- provider
- date

### Detail model

The central relationship is:

```text
Đơn hàng → Thanh toán → Hóa đơn
```

Show:

- order
- payment
- invoice state
- why the issue was flagged
- impact on readiness
- provider and synchronization state
- activity history

### Main actions

Primary:

`Mở hệ thống hóa đơn`

Secondary:

`Liên kết hóa đơn`

Tertiary:

`Nhờ SHB hỗ trợ`

Overflow:

- `Đã xuất ở hệ thống khác`
- `Đơn này không yêu cầu hóa đơn`
- `Xem lịch sử đồng bộ`
- `Xem audit log`

`Đơn này không yêu cầu hóa đơn` requires a reason and explicit confirmation.

### Supported issue types

- missing invoice
- amount mismatch
- unlinked invoice
- waiting for sync
- cancelled or replaced invoice
- provider not connected

### Scope boundary

Do not build:

- invoice templates
- digital signatures
- production issuance
- tax-authority submission
- full invoice editing

### Traces to

- USR-MW-TAX-002
- FR-TAX-003

---

## 13.5 Bán hàng

### Purpose

Bán hàng is a lightweight sales capture workspace that creates reliable records for reconciliation.

It combines:

- Mini POS
- order history
- cash session management

It does not replace a full POS.

### Main tabs

```text
Tạo đơn
Lịch sử đơn
Ca tiền mặt
```

---

### A. Tạo đơn

#### Layout

- service catalog: 60%
- current order: 40%

#### Catalog

Show:

- search
- category filters
- service cards
- custom item action

Sample categories:

- `Tất cả`
- `Cắt tóc`
- `Nhuộm`
- `Chăm sóc`
- `Sản phẩm`

Service cards contain:

- name
- duration or product label
- price
- compact add action

Do not make the catalog look like e-commerce.

#### Current order

Show:

- customer, default `Khách lẻ`
- selected items
- quantity
- item note
- subtotal
- discount
- total

Primary payment choices:

- `Tạo mã QR`
- `Tiền mặt`

Tertiary:

- `Lưu đơn chưa thanh toán`

#### Dynamic QR

Show:

- amount
- QR
- SHB account
- unique payment reference
- expiry timer
- waiting state

On payment:

- show success
- automatically match the payment
- link order, payment intent, and bank transaction
- make order available to invoice checking

#### Cash payment

Show:

- total
- amount received
- change
- active shift
- staff

On confirmation:

- mark order paid
- record cash entry
- update the active cash session
- create audit event

#### Invoice follow-up

After payment:

- show invoice status
- allow `Xử lý sau`
- do not force invoice issuance during checkout

---

### B. Lịch sử đơn

#### Purpose

A lightweight order history, not full order management.

User tasks:

- find recent sale
- inspect payment method
- inspect payment match
- inspect invoice status
- open linked transaction
- refund or cancel when necessary

#### Layout

Master-detail:

- order list: 44%
- order detail: 56%

#### Order relationship

```text
Đơn hàng → Thanh toán → Hóa đơn
```

#### Contextual primary action

- unpaid: `Tạo QR`
- paid: `Xem giao dịch`
- missing invoice: `Xử lý hóa đơn`

Rare actions remain in overflow.

---

### C. Ca tiền mặt

#### Purpose

Help staff:

- understand active shift
- see expected cash
- enter counted cash
- explain discrepancies
- close the shift

#### Active shift

Show:

- opening time
- staff
- starting cash
- cash sales
- cash expenses
- expected cash

Primary:

`Đóng và đối soát ca`

Secondary:

`Ghi khoản chi tiền mặt`

#### Close-shift flow

Show:

1. system expectation
2. counted cash
3. difference
4. required reason when difference is non-zero
5. final confirmation

Do not automatically resolve a discrepancy.

#### Closed shift history

Show:

- date
- shift
- expected
- counted
- difference
- status

No chart is required.

### Traces to

- USR-MW-POS-001
- USR-MW-POS-002
- USR-MW-POS-003
- USR-MW-POS-004

---

## 13.6 Sẵn sàng thuế

### Purpose

This screen answers:

> Dữ liệu tháng này đã đủ sạch để chuyển cho kế toán hoặc quy trình thuế chưa?

It does not calculate or file taxes.

### Header actions

- `Xem báo cáo`
- `Chạy kiểm tra lại`
- `Xử lý 5 mục`

Only `Xử lý 5 mục` is solid orange.

### Readiness hero

Show:

- `92%`
- `Chưa sẵn sàng`
- blocker summary
- completed groups
- direct CTA

### Recharts usage

Use Recharts only for:

1. `RadialBarChart` for current readiness score
2. `AreaChart` for readiness trend over recent periods

Do not use charts for:

- checklist rows
- blocker counts
- record counts
- rule version
- next actions

### Checklist

Show five guided criteria:

1. bank reconciliation rate
2. cash session closure
3. unclassified transactions
4. missing invoices
5. active rule version

Each row includes:

- status
- current result
- required threshold
- plain-language explanation
- direct action

Failed criteria must be more prominent than passed criteria.

### Direct routing

- unclassified transactions → `Cần xác nhận`
- missing invoices → `Hóa đơn`
- cash discrepancy → `Bán hàng > Ca tiền mặt`
- unmatched transaction → `Giao dịch`

Preserve the reporting period and apply the relevant filter automatically.

### Supporting column

Show:

- next actions
- estimated completion time
- data checked
- rule and report information
- merchant-friendly trace entry point

### Draft export

When blockers remain:

- disable draft creation
- disable CSV/JSON export
- explain exactly what remains

When all criteria pass:

- show `100%`
- show `Dữ liệu đã sẵn sàng`
- enable:
  - `Tạo bản nháp`
  - `Xuất CSV`
  - `Xuất JSON`
  - `Chuyển sang MISA sandbox`

Never use:

- `Nộp thuế`
- `Tờ khai hoàn chỉnh`
- `Gửi cơ quan thuế`

### Traces to

- USR-MW-TAX-001
- USR-MW-TAX-003
- FR-TAX-001
- FR-TAX-002
- FR-TAX-004

---

# 14. SHB Operations Console core screens

> **Superseded summary:** Use sections 27 and 28 for the current SHB Operations and agent-first specifications. The screen principles below remain historical context where they do not conflict.

## 14.1 Tổng quan danh mục

Purpose:

- see merchant portfolio health
- identify merchants requiring attention
- monitor readiness distribution
- inspect unresolved case aging

Show:

- merchant list
- readiness status
- unresolved case count
- oldest case age
- assigned RM
- latest agent run
- direct route to merchant or case

Charts are allowed when they summarize a portfolio, but should remain restrained.

---

## 14.2 Cases

Purpose:

- receive escalated merchant cases
- prioritize by risk and age
- review evidence
- assign RM
- draft merchant follow-up
- close case

Use master-detail:

- case queue
- evidence and actions

Show:

- merchant
- issue type
- amount
- priority
- confidence
- age
- assigned RM
- case status

Primary actions depend on state:

- `Phê duyệt đề xuất`
- `Yêu cầu merchant xác nhận`
- `Giao cho RM`
- `Đóng case`

---

## 14.3 Agent runs

Purpose:

- inspect multi-agent workflow execution
- see planner decomposition
- see specialist assignments
- identify failures and waiting states

Show:

- run status
- initiating request
- plan
- current step
- agents involved
- duration
- case and merchant references
- approval state

This screen may be denser than merchant screens.

---

## 14.4 Trace & audit

Purpose:

- inspect tool calls and decisions
- verify evidence
- export audit records
- support compliance review

Show:

- actor
- agent
- action
- tool
- input/output reference
- confidence
- rule version
- approval status
- timestamp

Hashes and technical references are appropriate here.

Support JSON and CSV export.

---

## 14.5 Compliance

Purpose:

- review rule versions
- confirm effective dates
- inspect report reproducibility
- approve rule updates
- inspect audit history

Show:

- rule version
- status
- effective period
- legal source
- approver
- related reports
- affected merchants

Do not allow LLM-generated tax calculation.

---

# 15. Cross-screen journeys

## 15.1 Missing invoice journey

```text
Dashboard
→ Hóa đơn
→ Selected paid order
→ Open provider or link invoice
→ Tax readiness recalculates
```

The same missing-invoice record may appear in `Cần xác nhận`, but must resolve to the same underlying issue.

---

## 15.2 Unclassified transaction journey

```text
Dashboard
→ Cần xác nhận
→ Select classification
→ Confirm
→ Transaction detail updates
→ Tax readiness recalculates
```

---

## 15.3 QR payment journey

```text
Bán hàng > Tạo đơn
→ Generate dynamic QR
→ SHB transaction received
→ Exact match
→ Order marked paid
→ Invoice status checked
→ Readiness updates
```

---

## 15.4 Cash discrepancy journey

```text
Bán hàng > Ca tiền mặt
→ Count cash
→ Difference detected
→ User provides reason
→ Shift closes
→ Readiness updates
```

---

## 15.5 SHB escalation journey

```text
Merchant exception
→ Nhờ SHB hỗ trợ
→ Case created
→ SHB Operations Console
→ Agent trace reviewed
→ RM action or approval
→ Merchant receives outcome
```

---

# 16. Charts and data visualization

### Merchant Workspace

Charts are secondary and must support a direct operational question.

Allowed:

- readiness radial chart
- readiness trend area chart
- compact reconciliation trend
- small dashboard progress visualization

Avoid:

- multi-series analytics
- stacked financial dashboards
- decorative charts
- charts duplicating visible text

### Recharts rules

- use `ResponsiveContainer`
- include readable text fallback
- use TaxLens palette only
- no gradients
- no 3D
- no dense legend
- subtle animation
- accessible tooltip
- meaningful axis range
- no random colors

---

# 17. Content design

### Merchant language

Prefer:

- `Cần bạn xác nhận`
- `Chưa có hóa đơn`
- `Sai số tiền`
- `Chờ đồng bộ`
- `Đã khớp`
- `Chưa sẵn sàng`
- `Xử lý 2 mục`
- `Mở hệ thống hóa đơn`
- `Xem cách TaxLens xử lý`

Avoid:

- ingestion
- schema
- adapter
- reconciliation pipeline
- provider payload
- candidate vector
- ledger entity
- agent orchestration
- tax computation

### Confidence

Display as:

`Độ tin cậy: 82%`

Always accompany with:

- evidence
- uncertainty
- human action

Never present confidence alone as proof.

### Time estimates

Time estimates may be used for merchant tasks:

- `Khoảng 2 phút`
- `Còn khoảng 5 phút để hoàn tất`

Do not use project-management language.

---

# 18. Motion

Motion communicates state.

| Interaction | Duration |
|---|---:|
| Hover and focus | 120–150ms |
| Button feedback | 150ms |
| Card expansion | 200ms |
| Dialog entrance | 220ms |
| Exception resolution | 250–300ms |
| Readiness update | 400–600ms |

Recommended completion motion:

1. selected item aligns
2. status changes
3. check appears
4. queue count or readiness updates

Avoid:

- bounce
- elastic motion
- constant floating
- looping decoration
- confetti
- fake terminal typing

Respect reduced-motion preferences.

---

# 19. Accessibility

- Meet WCAG AA contrast.
- Minimum interactive target: 40×40px.
- Body text: 14px minimum.
- Status requires text or icon, not color alone.
- Focus uses a visible blue outline.
- Orange buttons require tested white or navy text.
- Mist surfaces use navy text.
- Currency and IDs must remain readable at zoom.
- Keyboard users must access tabs, list rows, detail actions, drawers, and dialogs.
- Sticky footers must not trap focus or obscure content.
- Charts require text alternatives.
- Vietnamese diacritics must render correctly.

---

# 20. Responsive behavior

### Desktop

Primary target.

- full sidebar
- split workspaces
- independent scrolling
- sticky contextual actions

### Smaller desktop and tablet

- keep sidebar usable
- stack supporting columns beneath primary content
- preserve list minimum width where possible
- allow master-detail to switch to list → detail navigation
- never compress text into unreadable columns
- keep currency unwrapped
- preserve primary actions

### Mobile

Not part of the MVP product scope.

Do not distort desktop architecture to simulate a mobile-first app.

---

# 21. Loading, error, and empty states

### Loading

Show meaningful progress:

- `Đang lấy giao dịch SHB`
- `Đang kiểm tra hóa đơn`
- `Đang chạy bộ quy tắc 2026.07`

Avoid generic full-screen spinners where step progress is available.

### Partial data

If a provider is unavailable:

- show what is missing
- show last successful sync
- explain impact
- offer retry
- do not claim readiness is complete

### Error

Error messages include:

- what failed
- whether data was changed
- what the user can do next
- support path when required

### Empty good state

Example:

`Không còn mục nào cần xác nhận`

### Empty setup state

Example:

`Chưa kết nối hệ thống hóa đơn`

Action:

`Thiết lập kết nối`

---

# 22. Iconography

Primary library: Lucide.

- stroke width: 1.75–2px
- default: navy
- action: orange
- selected: blue
- semantic status: restrained functional colors

Agent symbols:

- Planner: route or branching
- Reconciliation: link or merge
- Tax and Compliance: checklist or document-check
- Merchant Operations: workflow or send

Do not use robot avatars.

---

# 23. Identity and product guardrails

### Do

- preserve the approved dashboard as the visual source of truth
- keep the sidebar stable across screens
- use orange for the current primary action
- keep master-detail layouts roomy
- preserve names, amounts, and status visibility
- link every blocker to a direct resolution path
- show evidence before technical trace
- keep agents contextual for merchants
- keep full agent operations inside the SHB console
- treat orders as required data, not a standalone product category
- use charts only when they clarify progress

### Do not

- create separate sidebar screens for Orders, Cash, Mini POS, or Agents
- redesign the application shell per screen
- build another MISA, SePay, or KiotViet
- create invoice-authoring workflows
- create a full POS
- create tax filing or tax calculation screens
- use dense spreadsheet layouts for merchant tasks
- place actions on every row
- auto-resolve low-confidence exceptions
- hide uncertainty
- hide rule version
- allow draft export while blockers remain
- use gradients
- use glassmorphism
- use green fintech branding
- use robot or AI cliché visuals
- shrink list columns until values wrap
- clip the TaxLens logo
- allow `₫` to wrap onto a new line

---

# 24. Core screen completion checklist

A screen is ready for implementation only when:

- purpose is clear within five seconds
- one dominant action is visible
- sidebar remains unchanged
- page title and logo are not clipped
- currency never wraps
- merchant language is plain
- status is visible without relying on color
- related records are connected
- AI reasoning includes evidence and uncertainty
- action routing preserves period and filters
- loading, empty, error, and completion states are defined
- sticky actions do not obscure content
- no duplicate source of truth is created
- the screen remains visually consistent with the approved TaxLens dashboard

---

# 25. Screen inventory summary

> **Superseded inventory:** Use the current inventory and route requirements in sections 27, 28, and 32. This earlier table remains for decision history only.

## Merchant Workspace

| Screen | Core job | Layout |
|---|---|---|
| Tổng quan | See status and next actions | Dashboard |
| Giao dịch | Find and investigate financial flows | Master-detail |
| Cần xác nhận | Resolve ambiguous cases | Queue + guided review |
| Hóa đơn | Resolve invoice coverage and mismatch issues | Master-detail |
| Bán hàng | Create sales, review orders, reconcile cash | Three-tab workspace |
| Sẵn sàng thuế | Verify readiness and unblock export | Hero + checklist |

## SHB Operations Console

| Screen | Core job | Layout |
|---|---|---|
| Tổng quan danh mục | Monitor merchant portfolio | Portfolio dashboard |
| Cases | Resolve escalated merchant issues | Queue + detail |
| Agent runs | Inspect multi-agent workflow | Run list + timeline |
| Trace & audit | Verify actions and export evidence | Dense audit workspace |
| Compliance | Govern rule versions and reports | Rule and report management |

---

# 26. Final positioning

TaxLens should never feel like a collection of unrelated financial modules.

Every merchant screen contributes to one continuous operating loop:

```text
Capture sale
→ Receive payment
→ Reconcile
→ Resolve exceptions
→ Verify invoice coverage
→ Confirm tax readiness
→ Export clean data
```

The design must make that loop feel simple, trustworthy, and visibly controlled by the user.

---

# 27. Agent-first experience, SHB Operations expansion, settings, and theming

> **Status:** Current
> **Authority:** Normative
> **Applies to:** Merchant Workspace, SHB Operations Console, authentication surfaces
> **Supersedes:** Previous light-mode-only requirement, previous Merchant Workspace navigation, and abbreviated SHB Operations screen descriptions

This section records the final design decisions made after the original core-screen specification.

TaxLens remains a structured operational product rather than a generic chatbot. The agent-first experience is expressed through:

- goal-based conversation
- visible task decomposition
- meaningful progress
- coordination between specialist capabilities
- evidence and uncertainty
- explicit human approval gates
- persistent artifacts and results
- auditable execution

The interface must never expose private chain-of-thought, raw prompts, hidden scratchpads, or unfiltered internal reasoning.

---

## 27.1 Updated information architecture

### Merchant Workspace

The final Merchant Workspace navigation is:

```text
Tổng quan
Trợ lý TaxLens
Giao dịch
Cần xác nhận
Hóa đơn
Bán hàng
Sẵn sàng thuế
````

Utility destinations:

```text
Hỗ trợ SHB
Cài đặt
Đăng xuất
```

### Rationale

`Trợ lý TaxLens` is a justified top-level destination because TaxLens is an agent-first product. It gives merchants one place to state a goal, let TaxLens coordinate work, review results, and approve important actions.

It is not an `Agents` screen.

The distinction is:

```text
Agents
= internal system architecture

Trợ lý TaxLens
= merchant-facing interface to the coordinated system
```

Do not add separate merchant navigation items for:

* Agents
* Agent trace
* Đơn hàng
* Tiền mặt
* Mini POS
* Audit logs

Orders, payments, invoices, and cash sessions remain authoritative domain records, but they are accessed through their correct operational workspaces.

---

### SHB Operations Console

The final SHB Operations navigation is:

```text
VẬN HÀNH

Tổng quan
Merchant
Cases

GIÁM SÁT HỆ THỐNG

Agent runs
Truy vết & kiểm toán
Tuân thủ
```

Utility destinations:

```text
Hỗ trợ nội bộ
Cài đặt
Đăng xuất
```

### Rationale

SHB employees need a different information architecture because they manage a portfolio of merchants rather than one store.

The console separates:

* portfolio monitoring
* merchant-wide investigation
* human-owned operational cases
* machine execution monitoring
* immutable audit evidence
* deterministic rule governance

Merchant-facing destinations such as `Bán hàng`, `Hóa đơn`, and `Sẵn sàng thuế` must not appear as primary SHB navigation items. SHB accesses those records through Merchant details, Cases, Agent Runs, or Audit.

---

## 27.2 Merchant screen — Trợ lý TaxLens

### Purpose

`Trợ lý TaxLens` is the merchant-facing orchestration workspace.

It allows the merchant to ask TaxLens to:

* check a reporting period
* investigate transactions
* explain readiness blockers
* find missing invoices
* create a payment QR
* prepare safe classifications or links
* process unresolved items one by one
* recalculate readiness
* route into authoritative workspaces

The assistant should feel like one trusted TaxLens identity coordinating several specialist capabilities.

The merchant should not need to select or understand individual agents.

### Core mental model

```text
Merchant gives TaxLens one goal
→ TaxLens creates a structured plan
→ several specialist tasks may run in parallel
→ results are handed between tasks
→ TaxLens pauses where human judgment is required
→ merchant approves
→ TaxLens resumes and creates usable outputs
```

### Layout

Use two permanent columns:

```text
Conversation and work journal      Tài liệu & kết quả
60–62%                             38–40%
```

At a 1440px viewport, the artifact pane should be approximately `400–460px` wide.

Do not add a permanent conversation-history rail. Conversation history opens in a drawer.

Below 1280px, the artifact pane may become a drawer.

---

### Conversation and work journal

The left side contains:

* merchant messages
* concise TaxLens replies
* structured plans
* meaningful progress
* task handoffs
* evidence summaries
* uncertainty
* decision cards
* approval cards
* completion summaries
* sticky composer

Do not make every element look like an identical chat bubble.

Use distinct structured surfaces for:

* progress
* recommendation
* approval
* error
* artifact creation
* completion

### Orchestration language

Use merchant-friendly labels such as:

* `TaxLens đang xử lý`
* `Các bước TaxLens đã thực hiện`
* `Đang thực hiện song song`
* `Đang sử dụng kết quả từ bước trước`
* `Đã chuyển 3 mục sang Cần xác nhận`
* `Đang tổng hợp kết quả`
* `Cần chị xác nhận`
* `Đã nhận xác nhận — TaxLens đang tiếp tục`

Do not call this content `chain of thought`.

Do not display:

* hidden reasoning
* private model scratchpads
* raw prompts
* token-by-token narration
* terminal output
* every API or tool call
* speculative internal monologue

### Example structured plan

```text
TaxLens đã chia yêu cầu thành 4 việc

✓ Đối soát giao dịch
  25 giao dịch đã tự động khớp
  3 giao dịch cần chị xác nhận
  Đã chuyển 3 mục sang Cần xác nhận

✓ Kiểm tra đơn và tiền mặt
  30 đơn đã được kiểm tra
  Tất cả ca tiền mặt đã đóng

● Kiểm tra hóa đơn
  Đã kiểm tra 28/30 đơn

○ Đánh giá sẵn sàng thuế
  Đang chờ kết quả kiểm tra hóa đơn
```

A new journal entry should appear only when:

* a plan is created
* parallel work begins
* a meaningful task completes
* one task hands results to another
* human input is required
* execution resumes
* an artifact is created or updated
* the workflow completes or fails

---

### Human approval

TaxLens may automatically perform read-only work:

* search
* inspect
* compare
* summarize
* run deterministic checks
* prepare proposals
* filter and navigate screens

TaxLens must request explicit approval before:

* changing transaction classification
* linking a payment
* linking an invoice
* marking an invoice exempt
* closing a cash session
* creating an SHB support case
* initiating a refund
* exporting or sending sensitive data

Approval cards must state exactly:

* what will change
* which records are affected
* what will not change
* whether an audit event will be created
* what TaxLens will do after approval

Recommendations must not be auto-selected.

---

### Tài liệu & kết quả pane

The right pane contains persistent artifacts produced or updated during the conversation.

Header:

```text
Tài liệu & kết quả
Các kết quả TaxLens đã tạo trong cuộc trò chuyện này.
```

Supported artifact types include:

* readiness report
* transaction-review set
* missing-invoice list
* classification approval receipt
* QR payment
* merchant-confirmation request
* export draft
* audit receipt

Example:

```text
Báo cáo tháng 7

92% hoàn thiện
5 mục cần xử lý
Rule 2026.07
Cập nhật lúc 10:42
```

Example:

```text
3 giao dịch cần xác nhận

Tổng giá trị: 8.500.000₫
Đã xử lý: 1/3
```

Example:

```text
2 đơn thiếu hóa đơn

DH-1023 · 1.500.000₫
DH-1028 · 1.700.000₫
```

Only one artifact may be expanded at a time.

Expanded artifacts show:

* summary
* status
* generated time
* source records
* version
* contextual actions
* link to the authoritative workspace

Artifacts update in place when their state changes.

Do not create a new artifact card for every progress update.

Artifacts are working views, not a second source of truth.

Every artifact must link to the authoritative screen:

* `Giao dịch`
* `Cần xác nhận`
* `Hóa đơn`
* `Bán hàng`
* `Sẵn sàng thuế`

### Empty artifact state

```text
Chưa có kết quả nào

Các báo cáo, danh sách cần xử lý và tài liệu
TaxLens tạo sẽ xuất hiện tại đây.
```

### Charts

Do not use Recharts on `Trợ lý TaxLens`.

Use structured progress, percentages, checklists, evidence, and artifacts.

---

# 28. Expanded SHB Operations screens

## 28.1 Tổng quan vận hành

### Purpose

The SHB Operations overview answers:

* How healthy is the merchant portfolio?
* Which merchants require intervention?
* Which cases are aging?
* Are TaxLens workflows operating normally?
* What should the employee open next?

It is an operations command center, not a generic analytics dashboard.

### Top metrics

Show four compact operational summaries:

* merchant đang theo dõi
* merchant đang bị chặn
* cases cần xử lý
* agent runs cần chú ý

Do not place charts inside these cards.

### Main sections

1. `Tình trạng merchant`
2. `Cần chú ý ngay`
3. `Cases theo thời gian xử lý`
4. `Hàng đợi của tôi`
5. `Hoạt động agent`
6. `Agent runs gần đây`
7. `Merchant cần theo dõi`

### Recharts limit

Use exactly three primary charts:

1. horizontal merchant-readiness distribution
2. stacked case-aging bar chart
3. seven-day agent-run status chart

Do not use:

* giant donut charts
* radial gauges
* one chart per metric
* decorative analytics
* charts inside list rows

Ranked lists and queues must remain more visually actionable than charts.

---

## 28.2 Merchant directory

### Purpose

The Merchant screen gives SHB a merchant-wide operational profile.

It answers:

* What is happening with this merchant?
* What is blocking readiness?
* Are any connected systems failing?
* Which cases and agent runs are active?
* Does SHB need to intervene?

### Rationale

The screen is not a generic company profile. It consolidates merchant-wide context that would otherwise require SHB to navigate across multiple operational screens.

### Layout

Use the Transactions master-detail interaction model:

```text
Merchant list                 Merchant operational profile
40–42%                        58–60%
```

Both panels scroll independently.

### Merchant list

Default tab:

`Cần chú ý`

Additional tabs:

* `Tất cả`
* `Bị chặn`
* `Lỗi đồng bộ`
* `Sẵn sàng`

Rows show:

* merchant
* business type
* merchant ID
* readiness
* open case count
* oldest issue
* assigned RM
* primary status

Do not turn each row into a dense table.

### Merchant profile

Prioritize:

1. merchant identity and readiness
2. current blockers
3. readiness checklist summary
4. connected systems
5. open cases
6. recent agent runs
7. merchant timeline

Primary actions depend on state:

* `Mở case đang xử lý`
* `Tạo case`
* `Liên hệ merchant`

SHB must not perform store-operating actions such as creating sales, closing cash sessions, or issuing invoices from this screen.

### Charts

Use only a readiness progress bar or a very small trend if needed.

Portfolio analytics belong on `Tổng quan vận hành`.

---

## 28.3 Cases

### Purpose

Cases are the main human-owned operational workspace for SHB.

A Case is broader than a merchant Exception.

```text
Exception
= one unresolved merchant data issue

Case
= SHB’s operational container for investigation,
communication, approval, ownership, SLA, and closure
```

One case may include:

* several exceptions
* transactions
* orders
* invoices
* merchant messages
* RM activity
* agent runs
* approvals
* audit events

### Layout

Use only two permanent columns:

```text
Case queue rail               Case workspace
300–320px                     Remaining width
```

Do not create a permanent third conversation or evidence column.

### Queue

Show:

* case ID
* merchant
* issue
* status
* priority
* age
* one important amount or reference

Move advanced filters into a popover.

### Case workspace

Use a persistent header, lifecycle, tabs, and sticky action footer.

Tabs:

* `Tổng quan`
* `Bằng chứng`
* `Trao đổi`
* `Agent & audit`

### Rationale

The tabbed structure prevents evidence, conversation, agent execution, assignment, and audit history from competing simultaneously for space.

### Tổng quan tab

Show:

* problem summary
* operational impact
* TaxLens recommendation
* confidence
* evidence
* uncertainty
* proposed action
* SHB and RM ownership

### Bằng chứng tab

Show connected:

* orders
* payments
* invoices
* provider state
* relationship chain

Do not reproduce entire merchant screens.

### Trao đổi tab

Show merchant-visible communication and draft confirmation requests.

Internal notes must remain visually and functionally separate.

### Agent & audit tab

Show:

* related run summary
* readable execution progress
* case activity
* link to full trace

### Charts

Do not use Recharts on Cases.

Cases is for investigation and action.

---

## 28.4 Agent runs

### Purpose

Agent Runs monitors machine execution.

It answers:

* What is TaxLens doing?
* Which request started the work?
* What plan was created?
* Which specialist capabilities ran?
* Which tools were used?
* Which steps completed or failed?
* Is the run waiting for human approval?
* Can SHB retry or investigate it?
* Did it create or update a Case?

### Distinction

```text
Trợ lý TaxLens
= user-facing conversational interface

Agent runs
= SHB execution monitor

Cases
= human-owned operational problem

Truy vết & kiểm toán
= permanent evidence
```

### Layout

Use:

```text
Run queue                      Run workspace
310–330px                      Remaining width
```

Use tabs:

* `Tổng quan`
* `Kế hoạch & bước`
* `Công cụ & đầu ra`
* `Sự kiện`

### Tổng quan

Show:

* initiating request
* current result
* linked merchant and case
* current human decision
* direct operational actions

### Kế hoạch & bước

Show only structured execution plans and task outputs.

Never show hidden chain-of-thought.

Purpose-first labels should precede technical agent names:

```text
Đối soát giao dịch
Reconciliation Agent
```

### Công cụ & đầu ra

Show expandable tool rows with:

* purpose
* status
* record count
* duration
* output summary
* retry count
* trace reference

Do not show credentials or raw payloads by default.

### Sự kiện

Show an operational timeline, not a terminal log.

### Supported run states

* `Đang chạy`
* `Chờ SHB phê duyệt`
* `Chờ merchant xác nhận`
* `Thất bại`
* `Hoàn tất`
* `Đã hủy`

Failed runs should support targeted step retry where possible.

### Charts

Do not use Recharts on Agent Runs.

Use progress, steps, timelines, and status.

---

## 28.5 Truy vết & kiểm toán

### Purpose

This screen is the immutable evidence ledger for TaxLens.

It answers:

* who or what acted
* what action occurred
* which merchant and records were affected
* which agent and tool were involved
* which evidence and rule version were used
* whether human approval occurred
* what changed before and after
* whether the evidence can be exported and verified

### Layout

Use:

```text
Audit event list               Audit event detail
410–430px                      Remaining width
```

Both panels scroll independently.

### Event types

* human approval
* agent action
* tool call
* rule event
* export
* error
* integrity verification

### Detail tabs

* `Tổng quan`
* `Trước & sau`
* `Bằng chứng`
* `Phê duyệt`
* `Kỹ thuật`

### Immutability

Audit events cannot be:

* edited
* deleted
* rewritten
* silently replaced

Corrections create new linked events.

### Technical disclosure

The technical tab may show:

* event ID
* trace ID
* run ID
* case ID
* tool
* agent
* rule version
* retry count
* integrity hash
* input/output references

Do not show secrets, credentials, private prompts, or hidden reasoning.

### Audit packages

Support exporting:

* selected events
* evidence snapshots
* approval history
* rule versions
* references
* manifest

Formats may include:

* ZIP
* CSV
* JSON

### Charts

Do not use Recharts.

---

## 28.6 Tuân thủ

### Purpose

The Compliance screen governs deterministic readiness rules, verified sources, approvals, and report reproducibility.

It answers:

* Which rule version is active?
* When did it become effective?
* Which sources support it?
* Who approved it?
* What changed?
* Which reports used it?
* Can an old report be reproduced?

### Layout

Use:

```text
Rule-version list              Rule-version workspace
350–380px                      Remaining width
```

### Tabs

* `Tổng quan`
* `Tiêu chí`
* `Nguồn`
* `Reports sử dụng`
* `Lịch sử & phê duyệt`

### Rule governance

Statuses:

* `Bản nháp`
* `Đang review`
* `Chờ phê duyệt`
* `Đã phê duyệt`
* `Đang có hiệu lực`
* `Đã thay thế`
* `Đã thu hồi`

Active rules are immutable.

Changes require a new version.

The creator should not approve their own version unless explicitly authorized.

### Deterministic criteria

Show:

* condition
* merchant-facing label
* evidence required
* severity
* failure result
* linked workspace

LLMs must not calculate taxes or determine authoritative legal rules.

AI-generated source summaries must be labeled as assistance and must not replace the original source.

### Report reproducibility

Reproduction must use:

* same input snapshot
* same rule version
* same deterministic logic

### Charts

Do not use Recharts.

---

# 29. Settings, appearance, authentication, and session flows

## 29.1 Cài đặt

### Purpose

Settings allows users to control basic profile, connection, notification, security, privacy, and appearance preferences.

Merchant settings sections:

* `Hồ sơ cửa hàng`
* `Tài khoản`
* `Giao diện`
* `Thông báo`
* `Kết nối dữ liệu`
* `Bảo mật`
* `Dữ liệu & quyền riêng tư`
* `Hỗ trợ`

Use an internal settings navigation approximately `240–260px` wide with a readable content column.

Do not create another full application sidebar.

### Standard settings behavior

* show a sticky unsaved-changes bar for normal forms
* disable save until a value changes
* show compact success feedback
* require verification for email or phone changes
* require confirmation for sensitive actions

---

## 29.2 Appearance modes

TaxLens now supports:

* `Sáng`
* `Tối`
* `Theo thiết bị`

This supersedes the previous `Light mode only` requirement.

Appearance changes apply immediately and are saved automatically.

Users may switch appearance from:

* `Cài đặt > Giao diện`
* the profile menu
* the login screen

### Dark-mode tokens

```css
--color-dark-background: #0F1220;
--color-dark-sidebar: #121628;
--color-dark-surface: #171B2E;
--color-dark-surface-elevated: #1E2338;
--color-dark-text: #F7F4EE;
--color-dark-text-secondary: #B9C0D4;
--color-dark-text-tertiary: #858EA8;
--color-dark-border: #2A3047;
--color-dark-border-strong: #3A425F;
--color-dark-primary: #F36B2E;
--color-dark-primary-hover: #FF7B3D;
--color-dark-secondary: #8FA4FF;
--color-dark-accent-surface: #18353A;
```

### Dark-mode rules

* use deep navy, not pure black
* use warm off-white, not pure white everywhere
* preserve the orange action hierarchy
* preserve visible borders
* meet WCAG AA
* do not invert the application
* do not recolor logos, uploaded images, QR codes, or avatars
* do not add neon glows
* do not introduce glassmorphism
* do not use gradients

Dark mode should feel like the same TaxLens product under lower light.

---

## 29.3 Notifications

Merchant notification categories include:

* items requiring confirmation
* missing or mismatched invoices
* provider synchronization failure
* cash discrepancy
* monthly readiness completion
* QR payment received
* security alerts

Channels may include:

* in-app
* email
* Zalo, when connected

Do not expose notifications such as raw agent retry, connector payload, model timeout, or tool-call failure. Translate system conditions into merchant outcomes.

---

## 29.4 Connected systems

Settings must show:

* provider
* status
* latest synchronization
* permissions
* impact of failure
* reconnect or resync action

Core SHB connections must not be casually disconnected.

A failed provider must explain which TaxLens results may now be incomplete.

---

## 29.5 Security

Support:

* password changes
* two-factor authentication
* new-login alerts
* active device list
* sign out individual device
* sign out all other devices
* reauthentication before sensitive actions

Sensitive actions include:

* account changes
* sensitive exports
* refunds
* provider disconnection
* merchant-visible confirmation requests

---

## 29.6 Profile menu

The profile menu contains:

* profile
* settings
* support
* compact appearance selector
* logout

Appearance selector:

```text
Giao diện
[Sáng] [Tối] [Tự động]
```

Logout should not appear as a large red button.

---

## 29.7 Logout

Logout is a confirmation modal, not a dedicated screen.

Title:

`Đăng xuất khỏi TaxLens?`

Actions:

* `Hủy`
* `Đăng xuất`

Optional unchecked setting:

`Đăng xuất khỏi tất cả thiết bị khác`

After confirmation:

1. show `Đang đăng xuất…`
2. end the session
3. clear sensitive client state
4. preserve only non-sensitive appearance preference
5. redirect to login
6. show `Bạn đã đăng xuất an toàn`

The modal must trap focus and restore focus after cancellation.

---

## 29.8 Login

The login screen:

* has no application sidebar
* uses the TaxLens endorsed lockup
* supports current appearance mode
* uses a centered card around `420–460px`
* remains quiet and security-focused

Fields:

* `Email hoặc số điện thoại`
* `Mật khẩu`

Actions:

* `Đăng nhập`
* `Quên mật khẩu?`

Only show identity providers that are genuinely implemented.

Authentication errors must not reveal whether a specific account exists.

---

# 30. Updated chart policy

## Merchant Workspace

Recharts is allowed only where a chart answers a clear operational question.

Approved use:

* compact dashboard reconciliation trend
* readiness radial score
* readiness trend area chart

Do not use Recharts on:

* Trợ lý TaxLens
* Giao dịch
* Cần xác nhận
* Hóa đơn
* Bán hàng

## SHB Operations

Approved use on `Tổng quan vận hành`:

1. merchant-readiness distribution
2. case-aging distribution
3. agent-run status over time

Do not use Recharts on:

* Merchant
* Cases
* Agent runs
* Truy vết & kiểm toán
* Tuân thủ

Lists, timelines, progress, diffs, and structured evidence are more useful on those screens.

---

# 31. Updated cross-screen journeys

## 31.1 Agent-first merchant journey

```text
Merchant asks Trợ lý TaxLens
→ TaxLens creates structured plan
→ specialist tasks execute
→ artifacts appear
→ TaxLens requests approval where needed
→ merchant confirms
→ authoritative records update
→ readiness recalculates
→ artifact and operational screens refresh
```

## 31.2 Merchant escalation journey

```text
Merchant selects Nhờ SHB hỗ trợ
→ Case is created
→ Agent run and evidence are linked
→ SHB reviews the Case
→ SHB communicates with merchant or RM
→ human decision is recorded
→ Case closes
→ merchant receives outcome
```

## 31.3 Audit journey

```text
Human or agent performs an action
→ audit event is created
→ before/after state is preserved
→ evidence and rule version are linked
→ approval chain is recorded
→ event may be exported in an audit package
```

## 31.4 Compliance journey

```text
New rule version is drafted
→ verified sources are attached
→ deterministic criteria are reviewed
→ authorized human approves
→ version becomes effective
→ reports reference the exact version
→ old reports remain reproducible
```

---

# 32. Updated screen inventory

## Merchant Workspace

| Screen         | Core job                                              | Primary layout                |
| -------------- | ----------------------------------------------------- | ----------------------------- |
| Tổng quan      | See readiness and next actions                        | Dashboard                     |
| Trợ lý TaxLens | Ask TaxLens to coordinate work and produce artifacts  | Conversation + artifact pane  |
| Giao dịch      | Investigate normalized financial flows                | Master-detail                 |
| Cần xác nhận   | Resolve ambiguous cases                               | Queue + guided review         |
| Hóa đơn        | Resolve invoice coverage issues                       | Master-detail                 |
| Bán hàng       | Capture sales, orders, QR payments, and cash          | Three-tab workspace           |
| Sẵn sàng thuế  | Verify readiness and unblock export                   | Hero + checklist              |
| Cài đặt        | Manage profile, connections, security, and appearance | Settings navigation + content |

## SHB Operations Console

| Screen               | Core job                                        | Primary layout                  |
| -------------------- | ----------------------------------------------- | ------------------------------- |
| Tổng quan            | Monitor portfolio health and intervention needs | Operational dashboard           |
| Merchant             | Inspect merchant-wide health                    | Master-detail                   |
| Cases                | Investigate and resolve SHB-owned issues        | Queue + tabbed workspace        |
| Agent runs           | Monitor multi-agent execution                   | Run queue + execution workspace |
| Truy vết & kiểm toán | Verify immutable evidence                       | Event list + detail             |
| Tuân thủ             | Govern rule versions and reproducibility        | Version list + workspace        |
| Cài đặt              | Manage employee preferences and security        | Settings navigation + content   |

---

# 33. Final agent-first positioning

TaxLens should be understandable without exposing its internal complexity.

For merchants:

> TaxLens understood the goal, divided the work, checked each part, asked when judgment was needed, and left behind usable results.

For SHB Operations:

> TaxLens provides clear visibility into portfolio health, human-owned cases, machine execution, immutable evidence, and deterministic rule governance.

The product must demonstrate agent orchestration through:

* coordinated work
* visible progress
* meaningful handoffs
* human approval
* persistent artifacts
* linked records
* auditability

It must not demonstrate agent orchestration through:

* robot avatars
* technical node diagrams
* raw reasoning streams
* hidden chain-of-thought
* terminal logs
* AI jargon

TaxLens remains one coherent product:

```text
Conversation coordinates work
Operational screens hold authoritative records
Artifacts make outcomes tangible
Cases coordinate human intervention
Agent Runs expose execution
Audit preserves evidence
Compliance governs deterministic rules
```

> **TaxLens — Dòng tiền khớp. Sổ sách sạch. Vận hành nhẹ.**
