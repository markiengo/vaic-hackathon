# TaxLens Frontend — Complete Build with Design Consistency (v2)

> **Execution status — 2026-07-18:** This file remains the approved implementation plan and historical execution record. Current API examples are superseded by `docs/03-engineering/05-api-reference.md` and executable frontend/backend schemas; current branch, gate evidence, and owner blockers live in `docs/04-delivery/frontend-build/STATE.md` and `ACCEPTANCE.md`. P3 does not use historical backend-change examples as authorization to modify P1/P2/P4/P5 scope.

Build the entire Next.js frontend from scratch, translate HTML mockups into production React components with a locked design system from `docs/04-delivery/03-design.md`, wire every page to the real FastAPI backend, implement SSE-streamed agent tool calling, WebSocket real-time payment notifications, and verify three end-to-end demo flows — all in a 14-stage implementation order that prevents drift.

---

## Source Hierarchy

```text
1. docs/04-delivery/03-design.md — product and design authority
2. Dashboard + Transactions HTML — approved visual baseline
3. Other HTML mockups — layout references only
4. Implementation components — must conform to 1 and 2
```

Code must not preserve a mockup inconsistency merely because it appears in its HTML. When a mockup conflicts with `03-design.md`, the design doc wins.

---

## Locked Core Elements (Drift Corrections from Mockup Analysis)

The following are **hard locks** — non-negotiable design system constraints identified by analyzing every HTML mockup in `stitch_taxlens_merchant_dashboard/` and `more-screens/stitch_taxlens_merchant_dashboard/` against `03-design.md`. Every mockup drifts on these points. The implementation must not inherit any drift.

### Lock 1 — Sidebar Navigation Structure

**Merchant sidebar** (exactly 7 primary items + 3 utility):

```text
PRIMARY:     Tổng quan → /dashboard
             Trợ lý TaxLens → /assistant        ← MISSING in mockups, critical
             Giao dịch → /transactions
             Cần xác nhận → /exceptions           ← mockups say "Ngoại lệ" — wrong
             Hóa đơn → /invoices
             Bán hàng → /sales                     ← consolidates Đơn hàng + Tiền mặt + Mini POS
             Sẵn sàng thuế → /tax-readiness
UTILITY:     Hỗ trợ SHB                              ← mockups say "Trung tâm hỗ trợ" — wrong
             Cài đặt
             Đăng xuất
```

**Forbidden:** standalone Đơn hàng, Tiền mặt, Mini POS, or Agents nav items.
**Active state:** blue selection treatment (`--color-secondary`), NOT orange `primary-container`.
**Width:** 240px fixed. No screen may shrink it.
**Icons:** Lucide only, 18px, 1.75–2px stroke.

**SHB Operations sidebar** (exactly 6 items in 2 groups + 3 utility):

```text
VẬN HÀNH:        Tổng quan → /ops
                 Merchant → /ops/merchants
                 Cases → /ops/cases
GIÁM SÁT HỆ THỐNG: Agent runs → /ops/agent-runs
                   Truy vết & kiểm toán → /ops/audit
                   Tuân thủ → /ops/compliance
UTILITY:          Hỗ trợ nội bộ
                   Cài đặt
                   Đăng xuất
```

**Forbidden:** English labels (Overview, Audit, Compliance, Support, Settings).

### Lock 2 — Typography

| Role | Font | Mockup uses | Lock |
|---|---|---|---|
| UI / body / nav / buttons / labels | **Momo Trust Display** | Plus Jakarta Sans | **Must use Momo Trust Display** |
| Display / page titles | Newsreader | Newsreader | OK |
| Technical / IDs | JetBrains Mono | JetBrains Mono | OK |

**Type scale locks** (mockup values in parentheses where drifted):

| Style | Locked value | Mockup drift |
|---|---|---|
| Page title (h1) | 34-40px / 1.10 / 700 | 48px — **too large** |
| Section hero (h2) | 28-34px / 1.15 / 600 | 36px — **too large** |
| Body | 15-16px / 1.50 / 400 | 14px / 1.55 — **too small, wrong line-height** |
| Caption | 11-12px / 1.40 / 400 | 12px / 1.45 — **wrong line-height** |
| Technical | 11-12px / 1.45 / 400 | 12px / 1.50 — **wrong line-height** |

Dashboard page title must not use inline `text-[44px]` — use the `text-h1` token (34-40px range).

### Lock 3 — Iconography

**Lucide only.** Zero Material Symbols Outlined anywhere.

- Replace every `<span class="material-symbols-outlined">` with Lucide React components
- Stroke: 1.75-2px
- Default color: navy (`--color-text` / `--color-text-secondary`)
- Agent symbols: `Route`, `GitBranch`, `Link2`, `CheckSquare`, `Workflow`, `Send`
- No `auto_awesome` or `memory` for agent representation

### Lock 4 — Color Tokens

**12-token system only.** Remove all 30+ extraneous Material Design 3 tokens.

| Token | Locked value | Mockup drift |
|---|---|---|
| `--color-text` (on-surface) | `#19244E` | `#0c1842` — **wrong** |
| `--color-primary` | `#F36B2E` | Mapped to `primary-container` — **wrong mapping** |
| `--color-secondary` | `#253C96` | `#4257b2` — **wrong** |
| `--color-background` | `#FCFBF8` | OK |
| `--color-surface` | `#FFFFFF` | OK |
| `--color-border` | `#E5E7EE` | OK |
| `--color-text-secondary` | `#5D647A` | OK |
| `--color-text-tertiary` | `#858B9D` | OK |
| `--color-mango` | `#F59A1E` | OK |

**Dark mode tokens** (historical snapshot; the current normative values are owned by section 27.2 of `docs/04-delivery/03-design.md`, NOT Material dark tokens):

```text
--color-dark-background: #0F1220
--color-dark-sidebar: #121628
--color-dark-surface: #171B2E
--color-dark-text: #E5E7EE
--color-dark-text-secondary: #8B92A8
--color-dark-border: #252839
--color-dark-primary: #FF8A4C
--color-dark-secondary: #4A62D8
```

### Lock 5 — Border Radius

| Token | Locked value | Mockup value | Drift |
|---|---|---|---|
| `--radius-sm` | 6px | 4px (0.25rem) | **2px undersized** |
| `--radius-md` | 10px | 8px (0.5rem) | **2px undersized** |
| `--radius-lg` | 14px | 12px (0.75rem) | **2px undersized** |
| `--radius-xl` | 20px | missing | **Not defined** |
| `--radius-pill` | 9999px | 9999px | OK |

No `rounded-2xl` (16px) or `rounded-full` on cards/buttons — use `--radius-lg` (14px) for cards, `--radius-md` (10px) for buttons.

### Lock 6 — Spacing

| Context | Locked range | Mockup value | Drift |
|---|---|---|---|
| Main content horizontal padding | 36-44px | 32-48px | **Below min and above max** |
| Main content top padding | 28-36px | 40px | **Above max** |
| Section gap | 24-32px | 32px | OK (at max) |
| Card padding | 20-28px | 32px | **Above max** |
| Max content width | ~1440px | 1600px | **Too wide** |

### Lock 7 — Button Styling

- Primary: solid `--color-primary` bg, white text, `--radius-md` (10px) — **NOT pill**
- Secondary: `--color-primary` outline, `--radius-md` — **NOT pill**
- One dominant solid-orange action per screen state
- Button font: Momo Trust Display, not Plus Jakarta Sans

### Lock 8 — Shadow System

Use the 4-token shadow system from section 8. Do not use Tailwind's default `shadow-sm` (wrong values) or custom `shadow-[0_4px_24px_rgba(25,36,78,0.04)]`.

---

## Skills Applied

- **larper** — Bounded maker-checker loop per stage. Binary acceptance criteria. Git safety (stage exact paths, commit by stage). Reopen dependent screens after shared shell changes.
- **frontend-design** — Editorial tone: warm cream canvas, serif headlines (Newsreader), orange action accents, navy structure. No gradients, no glassmorphism, no AI clichés.
- **emil-design-eng** — Motion only on `transform` and `opacity`. `ease-out` for entrances (120–220ms). `prefers-reduced-motion` respected. Button press `scale(0.97)` at 150ms. No `ease-in` for UI.

---

## Stage 0 — Git-Safe Execution Bootstrap

This stage protects the team repository before the rebuild begins. It is the only stage allowed to change branches or manage the recovery stash.

- [x] Fetch current `origin/main` without changing another worktree.
- [x] Preserve all tracked and untracked product/design work in `codex-pre-p3-frontend-design-consistency-20260718`.
- [x] Create the original `p3-frontend-design-consistency` recovery branch from current `origin/main`; delivery was later ported to `p3-frontend-design-consistency-final` to avoid stale mixed-role history.
- [x] Apply, but do not pop, the recovery stash and verify `frontend/new-design/`, `frontend/reference/`, and this plan are present.
- [x] Retain the stash until the delivery branch is pushed and its full diff is verified.
- [ ] Never use `git reset --hard`, `git clean`, force push, broad `git add .` / `git add -A`, or modify the existing P1/P4 worktrees.
- [ ] Before every logical commit, add an elaborative `log.md` entry with changed files, reasoning, verification, and status.

### Stage 0 acceptance criteria

- [x] Historical bootstrap branch was `p3-frontend-design-consistency`; final delivery branch is `p3-frontend-design-consistency-final` on integrated `origin/main`
- [x] Recovery stash remains available
- [x] Stash applied without conflicts
- [x] Expected design and reference assets are present

---

## Stage 1 — Foundation

### 1.1 Git cleanup

Stage the existing frontend replacement only after Stage 0 is complete. Use exact paths and keep it in the Stage 1 foundation commit rather than making a destructive deletion-only commit:

```text
git add frontend/Dockerfile frontend/next.config.* frontend/package-lock.json \
  frontend/package.json frontend/postcss.config.* frontend/eslint.config.* \
  frontend/tsconfig.json frontend/src/ frontend/public/
git commit -m "feat(frontend): establish TaxLens product foundation"
```

Keep documentation and reference-asset moves in separately reviewable commits with their own `log.md` entries.

### 1.2 Project initialization (safe temp-directory approach)

`frontend/` already contains `new-design/` and `reference/` that must be preserved. Initialize into a temp directory, then move generated files:

```text
npx create-next-app@latest frontend-temp \
  --typescript --eslint --tailwind --app --src-dir \
  --import-alias "@/*" --use-npm --yes
```

Then move only generated project files into `frontend/`:

```text
Move frontend-temp/package.json → frontend/
Move frontend-temp/tsconfig.json → frontend/
Move frontend-temp/next.config.* → frontend/
Move frontend-temp/postcss.config.* → frontend/
Move frontend-temp/src/ → frontend/src/
Move frontend-temp/public/ → frontend/public/ (merge)
Move frontend-temp/eslint.config.* → frontend/
Move frontend-temp/.gitignore → frontend/
```

Preserve intact:
```text
frontend/new-design/
frontend/reference/
```

Delete `frontend-temp/` after move is verified.

### 1.3 Tailwind v4 CSS-first setup

No `tailwind.config.ts` file. Define all design tokens as CSS variables in `src/app/globals.css`:

```css
:root {
  --color-text: #19244E;
  --color-text-secondary: #5D647A;
  --color-text-tertiary: #858B9D;
  --color-background: #FCFBF8;
  --color-surface: #FFFFFF;
  --color-primary: #F36B2E;
  --color-primary-hover: #DD5C24;
  --color-secondary: #253C96;
  --color-secondary-hover: #1F327F;
  --color-accent: #C4E7E5;
  --color-mango: #F59A1E;
  --color-border: #E5E7EE;
  --color-border-strong: #CDD1DD;

  /* Semantic soft/danger/success tokens */
  --color-primary-soft: #FFF3E0;
  --color-danger: #B42318;
  --color-danger-soft: #FFEBEE;
  --color-neutral-soft: #F5F6F8;
  --color-success: #18794E;
  --color-success-soft: #EAF7F0;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-pill: 9999px;

  --shadow-xs: 0 1px 2px rgba(25, 36, 78, 0.05);
  --shadow-sm: 0 2px 6px rgba(25, 36, 78, 0.07);
  --shadow-md: 0 8px 20px rgba(25, 36, 78, 0.09);
  --shadow-lg: 0 18px 40px rgba(25, 36, 78, 0.12);

  --font-display: "Newsreader", Georgia, serif;
  --font-ui: "Momo Trust Display", Arial, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

Wire Tailwind v4 `@theme` to expose these as utility classes (`bg-primary`, `text-secondary`, `border-border`, etc.).

### 1.4 Fonts (next/font)

Use `next/font/google` for self-hosted font optimization and reduced layout shift:

```ts
// src/app/fonts.ts
import { Newsreader, JetBrains_Mono } from "next/font/google";

export const newsreader = Newsreader({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mono",
});
```

For **Momo Trust Display**: verify whether `next/font/google` exposes it. If yes, add it the same way with `variable: "--font-ui"`. If not, keep it as a CSS `@import` in `globals.css` as fallback. Do not assume support without testing the generated build.

Font roles per `03-design.md` §7:
- **Newsreader** → page titles, hero values, readiness %, decision questions
- **Momo Trust Display** → navigation, body, labels, buttons, pills, list rows
- **JetBrains Mono** → transaction IDs, payment references, order IDs, technical refs

Type scale (from `03-design.md` §7):

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

### 1.5 Dependencies

```text
npm install lucide-react class-variance-authority @tanstack/react-query recharts
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test
```

No Axios (use native `fetch`). No Zustand yet (add only in Stage 8 if needed).

### 1.6 Canonical design document

Mark `docs/design/screens/overview/DESIGN.md` as deprecated:

```markdown
# Deprecated

The canonical design specification is `docs/04-delivery/03-design.md`.
```

### 1.7 Lint, typecheck, test config

- ESLint from create-next-app defaults
- `vitest.config.ts` with jsdom environment
- `playwright.config.ts` with 1440×1000 and 1280×900 projects
- `tsconfig.json` with `@/*` alias (from create-next-app)

### 1.8 Logo assets

Logo asset priority:

1. Existing original SVG (if provided)
2. Manually recreated approved vector
3. Approved transparent PNG/WebP
4. Auto-traced SVG only after visual comparison

Do not auto-trace PNGs to SVG without visual verification. The logo component can render a raster asset temporarily. Consistency matters more than claiming it is vector.

Place assets in:

```text
public/brand/taxlens-symbol.svg    — compact mark for sidebar/favicon (or .png temporarily)
public/brand/taxlens-lockup.svg    — full "TaxLens" wordmark + symbol (or .png temporarily)
```

Build `src/components/brand/TaxLensLogo.tsx` that accepts `variant="symbol" | "lockup"` and renders the asset. Sidebar always uses this component.

### 1.9 Navigation config

`src/config/navigation.ts` — single source of truth for merchant nav:

```ts
export const merchantNav = [
  { label: "Tổng quan", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Trợ lý TaxLens", href: "/assistant", icon: "Sparkles" },
  { label: "Giao dịch", href: "/transactions", icon: "ArrowLeftRight" },
  { label: "Cần xác nhận", href: "/exceptions", icon: "CircleAlert" },
  { label: "Hóa đơn", href: "/invoices", icon: "ReceiptText" },
  { label: "Bán hàng", href: "/sales", icon: "ShoppingBag" },
  { label: "Sẵn sàng thuế", href: "/tax-readiness", icon: "ShieldCheck" },
] as const;
```

Icons are Lucide names. No standalone Đơn hàng, Tiền mặt, Mini POS, or Agents items.

### 1.10 Routes

```text
/                     → redirect to /dashboard
/dashboard            → Tổng quan
/assistant            → Trợ lý TaxLens (SSE agent streaming, Stage 10)
/transactions         → Giao dịch
/exceptions           → Cần xác nhận
/invoices             → Hóa đơn
/sales                → Bán hàng (3-tab: Tạo đơn / Lịch sử đơn / Ca tiền mặt)
/tax-readiness        → Sẵn sàng thuế
/settings             → Cài đặt (dark mode, Stage 12)
```

SHB Operations Console (separate layout group):

```text
/ops                  → Tổng quan danh mục
/ops/merchants        → Merchant
/ops/cases            → Cases
/ops/agent-runs       → Agent runs
/ops/audit            → Trace & audit
/ops/compliance       → Compliance
```

Public route (no sidebar):

```text
/confirm/[token]      → Merchant confirmation
```

Route groups:

```text
src/app/(merchant)/layout.tsx    — uses AppShell with merchant nav
src/app/(operations)/ops/layout.tsx — uses AppShell with ops nav
src/app/confirm/[token]/page.tsx — standalone, no shell
```

### Stage 1 acceptance criteria

- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] Google Fonts load: Newsreader, Momo Trust Display, JetBrains Mono
- [x] CSS variables resolve in browser DevTools
- [x] `docs/04-delivery/03-design.md` is canonical and the old competing overview file is absent
- [x] `navigation.ts` exports 7 merchant items with Lucide icon names
- [x] TaxLensLogo renders both variants without clipping

---

## Stage 2 — Locked Design System

### 2.1 Layout components

```text
src/components/layout/AppShell.tsx
src/components/layout/Sidebar.tsx
src/components/layout/PageHeader.tsx
src/components/layout/PageContent.tsx
src/components/layout/WorkspacePanel.tsx
src/components/layout/StickyActionFooter.tsx
```

**AppShell** owns:
- Fixed 240px sidebar (240–250px range)
- `--color-background` canvas
- Main area: `overflow-y-auto`, max-width ~1440px, horizontal padding 36–44px, top padding 28–36px
- `h-screen` + `overflow-hidden` on root flex container
- Agent activity drawer (slide-in from right)
- Responsive fallback: below 1280px, stack supporting columns

Every authenticated page renders through AppShell. Pages must not create their own sidebar or outer frame.

**Sidebar** (from `03-design.md` §10):
- Full TaxLensLogo (lockup variant) at top
- Nav row height 44–48px
- Active item: blue selection treatment (bg tint + `--color-secondary` text + left border or bg highlight)
- Inactive: `--color-text-secondary`, hover bg `#F5F6F8`
- Support/Settings anchored at bottom
- Icons: Lucide, 1.75–2px stroke, 18px size
- No screen may shrink sidebar

**PageHeader** — constrained API:

```tsx
<PageHeader
  title="Giao dịch"
  subtitle="Theo dõi và kiểm tra toàn bộ dòng tiền của cửa hàng."
  merchant="Salon Hương"
  period="Tháng 7/2026"
  updatedAt="10:42"
  actions={[...]}
/>
```

Left: merchant chip, period, timestamp, title (Newsreader), subtitle.
Right: up to 3 actions, only one solid-orange.

No page injects arbitrary header HTML.

**PageContent** — wraps children with consistent section gap (24–32px).

**WorkspacePanel** — master-detail container with independent scroll and responsive breakpoints:

```text
≥1440px (full mode):
  - Page padding: 36–44px
  - Master-detail: 44% list / 56% detail
  - List minimum: 430px
  - Detail minimum: 540px

1280–1439px (compact mode):
  - Page padding: 32px
  - List minimum: 400px
  - Detail flexes into remaining space
  - Secondary metadata may collapse (e.g. 2-col → 1-col grid)
  - Do NOT compress labels, currency, or status pills

Below 1280px (stack mode):
  - List → detail navigation or detail drawer
  - Not a primary target but must not break
```

Other workspace minimums:
- Current order panel: 400px minimum
- Service catalog: 600px minimum

**StickyActionFooter** — sticky bottom bar within detail panel. Must not trap focus or obscure content.

### 2.2 Primitive components (with `class-variance-authority`)

```text
src/components/ui/Button.tsx
src/components/ui/IconButton.tsx
src/components/ui/Card.tsx
src/components/ui/StatusPill.tsx
src/components/ui/Tabs.tsx
src/components/ui/SearchInput.tsx
src/components/ui/Select.tsx
src/components/ui/FilterButton.tsx
src/components/ui/Avatar.tsx
src/components/ui/EntityAvatar.tsx
src/components/ui/MetricStrip.tsx
src/components/ui/DetailSection.tsx
src/components/ui/RecordLink.tsx
src/components/ui/EmptyState.tsx
src/components/ui/LoadingState.tsx
src/components/ui/ErrorState.tsx
src/components/ui/ConfirmDialog.tsx
src/components/ui/SupportDialog.tsx
src/components/ui/TraceDrawer.tsx
```

**Button** variants:

```tsx
<Button variant="primary" />    // solid orange, white text
<Button variant="secondary" />  // orange outline
<Button variant="tertiary" />   // orange/blue text
<Button variant="danger" />     // restrained semantic red
<Button variant="ghost" />      // transparent, hover bg
```

Press animation: `active:scale-[0.97]` transition 150ms ease-out.

**Card** variants:

```tsx
<Card variant="standard" />     // white, border, no shadow or --shadow-xs
<Card variant="information" />  // mist/accent bg, navy text
<Card variant="workspace" />    // white, border, --shadow-sm
```

No decorative or redundant card nesting. Semantic inset panels are allowed for reasoning, warnings, and focused workflow states (TaxLens recommendation, warning explanation, reconciliation evidence, selected invoice issue, QR payment state).

**StatusPill** — maps Vietnamese labels to semantic styles. Never color alone — always text + optional icon:

```ts
const pillMap = {
  "Đã khớp": { bg: "bg-neutral-soft", text: "text-text-secondary", icon: "Check" },
  "Cần xác nhận": { bg: "bg-primary-soft", text: "text-primary", icon: "Clock" },
  "Chưa xác định": { bg: "bg-neutral-soft", text: "text-text-secondary", icon: "HelpCircle" },
  "Thiếu hóa đơn": { bg: "bg-danger-soft", text: "text-danger", icon: "FileX" },
  "Sai số tiền": { bg: "bg-danger-soft", text: "text-danger", icon: "AlertTriangle" },
  "Chờ đồng bộ": { bg: "bg-accent/30", text: "text-secondary", icon: "RefreshCw" },
  "Đã hoàn tiền": { bg: "bg-neutral-soft", text: "text-text-secondary", icon: "Undo" },
  "Đã thanh toán": { bg: "bg-neutral-soft", text: "text-text-secondary", icon: "CheckCircle" },
  "Chưa thanh toán": { bg: "bg-primary-soft", text: "text-primary", icon: "Clock" },
  "Đạt": { bg: "bg-success-soft", text: "text-success", icon: "Check" },
  "Cần xử lý": { bg: "bg-primary-soft", text: "text-primary", icon: "Clock" },
  "Chưa sẵn sàng": { bg: "bg-primary-soft", text: "text-primary", icon: "Clock" },
  "Sẵn sàng": { bg: "bg-success-soft", text: "text-success", icon: "CheckCircle" },
};
```

### 2.3 Domain components

```text
src/components/domain/Money.tsx
src/components/domain/TransactionRow.tsx
src/components/domain/OrderRow.tsx
src/components/domain/InvoiceIssueRow.tsx
src/components/domain/ExceptionQueueItem.tsx
src/components/domain/RecordReference.tsx
src/components/domain/RecordRelationshipChain.tsx
src/components/domain/ReadinessChecklistItem.tsx
```

**Money** — guarantees:
- Vietnamese separators: `1.500.000₫`
- `₫` attached (no space), `white-space: nowrap`
- Tabular numerals (`font-variant-numeric: tabular-nums`)
- Negative styling (red text for negative values)
- Accessible textual output (`aria-label`)

```tsx
<Money value={1500000} />        // → 1.500.000₫
<Money value={-200000} />        // → -200.000₫ (red)
```

**RecordRelationshipChain** — visual chain: `Đơn hàng → Thanh toán → Hóa đơn`

```tsx
<RecordRelationshipChain
  order={{ id: "DH-1023", amount: 1500000 }}
  payment={{ id: "TXN-456", amount: 1500000 }}
  invoice={null}
/>
```

Used in: Transactions, Invoices, Sales history, Exception evidence.

### 2.4 Data layer (API boundary before pages)

Establish the full data layer before any page is built. Pages use hooks from the start — no large refactor later.

**API client (native fetch, not Axios):**

```text
src/lib/api/client.ts          — base fetch wrapper with error handling
src/lib/api/transactions.ts    — transactions endpoints
src/lib/api/exceptions.ts      — exceptions endpoints
src/lib/api/invoices.ts        — invoices endpoints
src/lib/api/readiness.ts       — tax readiness endpoint
src/lib/api/sales.ts           — sales endpoints
```

Mock response shapes match FastAPI schemas from backend routers.

**Mock fixtures and handlers:**

```text
src/mocks/fixtures/            — typed fixture data per domain
src/mocks/handlers/            — mock request handlers (MSW or fixture imports)
```

**TanStack Query hooks:**

```text
src/components/Providers.tsx   — QueryClientProvider
src/hooks/useDashboard.ts
src/hooks/useTransactions.ts
src/hooks/useExceptions.ts
src/hooks/useInvoices.ts
src/hooks/useTaxReadiness.ts
src/hooks/useSales.ts
```

From the first page onward:

```tsx
const { data } = useTransactions();
```

The development implementation returns fixtures behind the same API contract. Later integration replaces the transport, not page architecture.

**Realtime types (no transport yet):**

```text
src/lib/realtime/types.ts      — event type definitions
src/lib/realtime/mock.ts       — mock event source for development
```

No WebSocket/SSE transport yet. Add only when backend contract is established.

### 2.5 Component showcase route

`src/app/_dev/showcase/page.tsx` — renders every variant of every component. Development-only, not linked in nav. Used for visual verification and Playwright baseline screenshots.

**Access guard:**

```tsx
if (process.env.NODE_ENV !== "development") {
  notFound();
}
```

Do not merely leave it unlinked — it must be inaccessible in production.

### Stage 2 acceptance criteria

- [x] AppShell renders sidebar + main area with correct dimensions
- [x] Sidebar active state uses blue (secondary) not orange
- [x] All Button variants render with correct colors
- [x] All Card variants render with correct shadows
- [x] StatusPill maps all 13 labels from `03-design.md` §11
- [x] Money formats `1500000` → `1.500.000₫` with nowrap
- [x] RecordRelationshipChain renders 3-node chain
- [x] PageHeader renders title in Newsreader, subtitle in Momo Trust Display
- [x] No raw hex colors in component code (all via CSS variables or semantic tokens)
- [x] `prefers-reduced-motion` disables all movement animations
- [x] Showcase page renders without errors
- [x] Showcase page returns 404 in production build
- [x] API client, hooks, and Providers wired — `useTransactions()` returns fixture data
- [x] Mock fixtures typed and importable

---

## Stage 3 — Merchant Baseline (Dashboard + Transactions)

### 3.1 Dashboard (`/dashboard`)

Reference: `taxlens_merchant_assistant_dashboard_final_refinement/code.html`

Layout:
- PageHeader: "Xin chào, chị Hương" / "Hôm nay cửa hàng có 5 mục cần xác nhận."
- 3-card row (12-col grid, 4-4-4):
  1. **Dữ liệu tháng 7** — readiness summary, blocker list, "Xử lý 5 mục" CTA
  2. **Đối soát 7 ngày gần đây** — "25 / 30 đã khớp", "83% tự động xử lý", mini bar chart (Recharts)
  3. **Hóa đơn & thuế** — issue count, rule version
- 4 quick-action buttons: Tạo đơn mới, Tạo QR thanh toán, Xem ngoại lệ, Xem sẵn sàng thuế
- "Cần bạn xác nhận" section: 2-column exception preview cards with AI suggestion + confidence
- "Giao dịch gần đây" table: sender, amount, note, classification, status, date

Data: mock fixtures matching seed data (30 transactions, 83% rate, 5 exceptions, 92% ready).

### 3.2 Transactions (`/transactions`)

Reference: `taxlens_transactions_unified_baseline_layout/code.html`

Layout: master-detail (**44% list / 56% detail** — not 40/60)
- PageHeader: "Giao dịch" / "Theo dõi và kiểm tra toàn bộ dòng tiền của cửa hàng."
- Actions: Xuất dữ liệu (secondary), Cập nhật dữ liệu (secondary), Tạo giao dịch (primary)
- **No separate metric strip** — counts live inside tabs:
  ```text
  Tất cả (30)
  Cần xử lý (5)
  Đã khớp (25)
  Thiếu hóa đơn (2)
  ```
- List panel: search, filter button, period picker, tabs with counts
- Transaction rows: avatar, sender, amount (Money), note (mono), status pill, time
- Selected row highlight: `bg-primary-soft/30` + left border
- Detail panel: avatar + name, status pill, amount (Money, large), transfer note (mono, in neutral-soft box), metadata grid (phân loại, hóa đơn, nguồn, trạng thái), TaxLens suggestion (mist bg, confidence %, evidence list), reconciliation result, sticky action footer (Xem và xác nhận / Đổi phân loại / Nhờ SHB hỗ trợ / overflow)

### 3.3 Route-level states

Each route gets:

```text
src/app/(merchant)/dashboard/loading.tsx
src/app/(merchant)/dashboard/error.tsx
src/app/(merchant)/transactions/loading.tsx
src/app/(merchant)/transactions/error.tsx
```

Loading: meaningful progress text ("Đang lấy giao dịch SHB"). No generic spinner.
Error: what failed, whether data changed, what user can do, support path.

### 3.4 Functional state fixtures

```text
src/mocks/fixtures/dashboard/
  92-percent-incomplete.ts
  100-percent-ready.ts
  no-recent-transactions.ts

src/mocks/fixtures/transactions/
  matched-transaction.ts
  unresolved-transaction.ts
  refund.ts
  partial-allocation.ts
```

### Stage 3 acceptance criteria

- [ ] Dashboard renders 3 summary cards, 4 quick actions, exception preview, recent transactions table
- [ ] Transactions renders master-detail with **44/56 split**
- [ ] **No metric strip** — counts live inside tab labels
- [ ] List panel scrolls independently from detail panel
- [ ] Selected transaction row highlighted
- [ ] Sticky action footer visible at bottom of detail panel
- [ ] Money component used for all currency (no raw formatted strings)
- [ ] StatusPill used for all statuses (no inline pill HTML)
- [ ] TaxLens suggestion shows confidence + evidence list
- [ ] Recharts mini bar chart renders on dashboard
- [ ] Loading state shows meaningful Vietnamese text
- [ ] Error state shows recovery actions
- [ ] No horizontal overflow at 1280px
- [ ] Playwright screenshot at 1440×1000 matches baseline

---

## Stage 4 — Merchant Resolution Loop (Exceptions + Invoices + Tax Readiness)

### 4.1 Exception Inbox (`/exceptions`)

Reference: `taxlens_exception_inbox_workspace/code.html` + `03-design.md` §13.3

Layout: 30% queue / 70% guided review

**Queue panel (30%):**
- Progress bar: "Đã xử lý 2/5"
- Exception items: avatar, sender, amount (Money), status pill, priority badge
- One item at a time selected
- After resolve: auto-load next item

**Review panel (70%):**
- Decision question (Newsreader, large): "Khoản tiền này là gì?" / "Khoản thanh toán này thuộc đơn nào?" / "Đơn này đã thanh toán nhưng chưa có hóa đơn. Bạn muốn làm gì?"
- Amount (Money, large, Newsreader)
- Transfer note (mono, gray box)
- TaxLens recommendation: mist bg, confidence %, evidence list, uncertainty note
- Recommendation is NOT auto-selected — user must explicitly choose
- Classification options as selectable cards/buttons
- Primary action disabled until selection made
- Sticky action footer: **Primary: Xác nhận lựa chọn** (disabled until selection) / **Secondary: Nhờ SHB hỗ trợ** / **Tertiary: Để sau**

`Duyệt / Từ chối / Phân loại lại` exist in the SHB Operations Console (Stage 6), where staff review agent recommendations. They are not the default merchant interaction.

**Completion state:**
- "Bạn đã xử lý xong tất cả" + "5/5" + readiness improvement
- CTA: "Xem sẵn sàng thuế"
- No confetti

### 4.2 Invoices (`/invoices`)

Reference: `taxlens_invoices_reconciliation_workspace/code.html` + `03-design.md` §13.4

Layout: master-detail (43% list / 57% detail)

**Primary action banner:**
- "2 đơn đã thanh toán nhưng chưa có hóa đơn"
- Impact on readiness
- "28/30 đơn đã có hóa đơn phù hợp"
- CTA: "Xử lý 2 đơn"

**Tabs:** Cần xử lý / Đã khớp / Chờ đồng bộ / Tất cả

**List panel:** invoice issue rows with status, amount, order ref

**Detail panel:**
- RecordRelationshipChain: Đơn hàng → Thanh toán → Hóa đơn
- Issue type: missing / mismatched / unlinked / waiting for sync
- Provider sync state
- Actions:
  - Primary: "Mở hệ thống hóa đơn" (opens external link)
  - Secondary: "Liên kết hóa đơn"
  - Tertiary: "Đã xuất ở hệ thống khác"
  - Overflow: "Đơn này không yêu cầu hóa đơn" (requires reason + confirmation), "Xem lịch sử đồng bộ", "Xem audit log"

**Implementation boundaries — MUST NOT include:**
- invoice templates
- digital signing
- production issuance
- tax authority submission
- full invoice editing

### 4.3 Tax Readiness (`/tax-readiness`)

Reference: `taxlens_s_n_s_ng_thu_workspace/code.html` + `03-design.md` §13.6

Layout: hero + checklist (65%) / supporting context (35%)

**Hero:**
- Score: "92%" (Newsreader, large)
- Status: "Chưa sẵn sàng" pill
- Blocker summary
- Progress bar

**Checklist (65%):**
- ReadinessChecklistItem components
- Each item: check name, pass/fail status (icon + text, not color alone), required action
- Direct routing links: unclassified → /exceptions, missing invoices → /invoices, cash discrepancy → /sales
- Links preserve reporting period and apply filter

**Supporting column (35%):**
- Next actions
- Estimated completion time
- Data checked
- Rule and report info
- Merchant-friendly trace entry point

**Charts (Recharts only here):**
- RadialBarChart: readiness score
- AreaChart: readiness trend over time

**Data model — API-shaped, not page-local math:**

```ts
type TaxReadinessReport = {
  period: string;
  score: number;
  ready: boolean;
  ruleVersion: string;
  generatedAt: string;
  checks: ReadinessCheck[];
  blockers: ReadinessBlocker[];
  exportAllowed: boolean;
};
```

**Draft export:**
- When blockers remain: disable export, explain what remains
- When all pass: "100%", "Dữ liệu đã sẵn sàng", enable Tạo bản nháp / Xuất CSV / Xuất JSON / Chuyển sang MISA sandbox
- Never use: "Nộp thuế", "Tờ khai hoàn chỉnh", "Gửi cơ quan thuế"

### 4.4 Cross-screen links

- Dashboard → exceptions (preserve period)
- Dashboard → invoices (preserve period)
- Exceptions completion → tax-readiness
- Tax readiness blockers → exceptions / invoices / sales (preserve period + filter)
- All links use URL search params for shareable state

### 4.5 Functional state fixtures

```text
src/mocks/fixtures/exceptions/
  unknown-classification.ts
  duplicate-candidate.ts
  missing-invoice.ts
  completed-queue.ts

src/mocks/fixtures/invoices/
  missing.ts
  mismatched.ts
  unlinked.ts
  waiting-for-sync.ts
  all-resolved.ts

src/mocks/fixtures/tax-readiness/
  92-percent-blocked.ts
  100-percent-ready.ts
  expired-rule-version.ts
  provider-data-unavailable.ts
```

### Stage 4 acceptance criteria

- [ ] Exception queue at 30%, review at 70%
- [ ] One exception item at a time in review
- [ ] Recommendation not auto-selected
- [ ] Primary action reads "Xác nhận lựa chọn" (not "Duyệt")
- [ ] Secondary reads "Nhờ SHB hỗ trợ", tertiary reads "Để sau"
- [ ] Primary action disabled until user selects a classification
- [ ] Auto-loads next item after resolve
- [ ] Completion state shows "Xem sẵn sàng thuế" CTA
- [ ] Invoice banner shows missing count + readiness impact
- [ ] Invoice detail shows RecordRelationshipChain
- [ ] Invoice actions do not include "Tạo hóa đơn"
- [ ] Tax readiness score comes from mock API response, not page-local calculation
- [ ] Tax readiness radial chart renders with Recharts
- [ ] Tax readiness area chart renders with Recharts
- [ ] Direct routing links preserve period in URL params
- [ ] Export disabled when blockers remain
- [ ] All loading/error/empty states defined
- [ ] Playwright screenshots pass at both resolutions

---

## Stage 5 — Merchant Sales Capture (Bán hàng)

### 5.1 Sales workspace (`/sales`)

Reference: `taxlens_b_n_h_ng_workspace/code.html` + `03-design.md` §13.5

Three-tab workspace (not separate routes):

**Tab 1: Tạo đơn (Create order)**
Layout: 60% catalog / 40% order panel

Catalog (60%, min 600px):
- Search bar
- Category filters
- Product grid: cards with name, price (Money), add button

Order panel (40%, min 400px):
- Customer selector
- Order items: name, quantity controls (+/−), line total (Money)
- Summary: **Tạm tính** / **Giảm giá** / **Tổng thanh toán** (not subtotal/tax/total — TaxLens captures the sale, it is not a checkout tax calculator)
- Payment buttons: [Tiền mặt] [Tạo QR]
- QR modal: QR code image, reference (mono), 15-minute timer

**QR payment flow (auto-match, not manual confirmation):**

The QR waiting state contains:
```text
Đang chờ thanh toán
Hủy mã QR
Tạo lại mã
Đánh dấu thanh toán cách khác
```

A mock realtime event automatically transitions the order to:
```text
Đã nhận thanh toán
Đã tự động khớp
```

This proves the core product loop: Create QR → unique reference → transaction arrives → deterministic match → order becomes paid automatically. A manual `Đã thanh toán` button weakens the central product demonstration.

**Tab 2: Lịch sử đơn (Order history)**
- Order rows: order ID (mono), customer, amount (Money), status pill, date
- Click row → detail with RecordRelationshipChain
- Contextual primary action: unpaid → "Tạo QR", paid → "Xem giao dịch", missing invoice → "Xử lý hóa đơn"

**Tab 3: Ca tiền mặt (Cash session)**
- Cash session summary bar
- Count cash → expected vs actual
- Difference detected → reason input → shift closes
- Readiness updates

### 5.2 Functional state fixtures

```text
src/mocks/fixtures/sales/
  empty-order.ts
  qr-waiting.ts
  qr-paid.ts
  cash-payment.ts
  unpaid-order.ts
  cash-discrepancy.ts
```

### Stage 5 acceptance criteria

- [ ] Three tabs render: Tạo đơn, Lịch sử đơn, Ca tiền mặt
- [ ] Product grid filters by category
- [ ] Cart updates quantity with +/− controls
- [ ] Money component used for all prices
- [ ] Order summary shows Tạm tính / Giảm giá / Tổng thanh toán (no tax line)
- [ ] QR modal shows reference + 15-min timer
- [ ] QR auto-matches via mock realtime event (no manual "Đã thanh toán" button)
- [ ] QR waiting state shows: Đang chờ thanh toán / Hủy mã QR / Tạo lại mã / Đánh dấu thanh toán cách khác
- [ ] Cash session shows expected vs actual with discrepancy flow
- [ ] Order history shows RecordRelationshipChain in detail
- [ ] No "Mini POS" or "POS" text anywhere — product name is "Bán hàng"
- [ ] Playwright screenshots pass

---

## Stage 6 — SHB Operations Console

### 6.1 Layout

`src/app/(operations)/ops/layout.tsx` — uses AppShell with operations navigation:

```text
src/config/navigation.ts (operations section)

export const opsNav = [
  { label: "Tổng quan", href: "/ops", icon: "Building2", group: "VẬN HÀNH" },
  { label: "Merchant", href: "/ops/merchants", icon: "Store", group: "VẬN HÀNH" },
  { label: "Cases", href: "/ops/cases", icon: "Briefcase", group: "VẬN HÀNH" },
  { label: "Agent runs", href: "/ops/agent-runs", icon: "Workflow", group: "GIÁM SÁT" },
  { label: "Truy vết & kiểm toán", href: "/ops/audit", icon: "FileSearch", group: "GIÁM SÁT" },
  { label: "Tuân thủ", href: "/ops/compliance", icon: "Scale", group: "GIÁM SÁT" },
] as const;
```

Visually related to TaxLens but denser, more operational.

### 6.2 Pages (prioritized)

**Priority 1 — full implementation (core agentic + SHB value):**

- **`/ops/cases`**: queue + detail. merchant, issue type, amount, priority, confidence, age, assigned RM, case status. Actions: Phê duyệt đề xuất / Yêu cầu merchant xác nhận / Giao cho RM / Đóng case
- **`/ops/agent-runs`**: run status, initiating request, plan, current step, agents involved, duration, case/merchant refs, approval state. Dense layout.
- **`/ops/audit`**: actor, agent, action, tool, input/output ref, confidence, rule version, approval status, timestamp. Hashes appropriate. JSON + CSV export.

**Priority 2 — credible shells using shared components:**

- **`/ops`** (portfolio overview): merchant list, readiness status, unresolved case count, oldest case age, assigned RM, latest agent run. Functional shell with real components but lighter content.
- **`/ops/merchants`**: merchant list + operational profile per merchant. Master-detail layout. Health score, reconciliation rate, open cases, assigned RM.
- **`/ops/compliance`**: rule version, status, effective period, legal source, approver, related reports, affected merchants. No LLM-generated tax calculation. Functional shell.

The product's MVP needs planner/specialist execution, agent trace, case creation, and audit export. The three lighter pages prove breadth without high risk.

### Stage 6 acceptance criteria

- [ ] Ops layout uses separate sidebar nav (not merchant nav)
- [ ] Ops sidebar uses Vietnamese labels with group headers (VẬN HÀNH / GIÁM SÁT HỆ THỐNG)
- [ ] `/ops/cases` has queue + detail with all fields (full implementation)
- [ ] `/ops/agent-runs` shows workflow timeline (full implementation)
- [ ] `/ops/audit` supports JSON + CSV export (full implementation)
- [ ] `/ops` portfolio overview renders as credible shell
- [ ] `/ops/merchants` renders master-detail with merchant health
- [ ] `/ops/compliance` renders as credible shell
- [ ] No merchant-facing Vietnamese simplification on ops pages (denser, more technical)

---

## Stage 7 — Public Confirmation

### 7.1 Route

`src/app/confirm/[token]/page.tsx` — standalone, no AppShell, no sidebar.

### 7.2 States

- **Valid token**: show request details (amount, sender, date, TaxLens suggestion, reasoning, classification choices). Actions: **Xác nhận đề xuất** / **Chọn phân loại khác**. Generic approve/reject does not tell the merchant what rejecting means or what data should replace the suggestion.
- **Expired token**: "Liên kết đã hết hạn" + contact support
- **Already confirmed**: "Yêu cầu đã được xác nhận" + timestamp
- **Invalid token**: "Liên kết không hợp lệ" + support path
- **Successful confirmation**: confirmation message + next steps

### Stage 7 acceptance criteria

- [ ] No sidebar or AppShell rendered
- [ ] All 5 states render correctly
- [ ] Valid token shows suggestion + reasoning + classification choices
- [ ] Actions read "Xác nhận đề xuất" and "Chọn phân loại khác" (not approve/reject)
- [ ] Confirmation flow shows submission loading state
- [ ] Accessible: keyboard navigation, focus trap on dialogs

---

## Stage 8 — Integration and Verification

The data layer (API client, hooks, Providers, mock fixtures) was established in Stage 2. This stage connects and verifies, not introduces.

### 8.1 Zustand (minimal, only if needed)

Only if cross-page client state is needed:

```text
src/lib/store.ts
```

For: selected merchant, selected reporting period, open agent drawer, unsaved POS order.

Do NOT duplicate server records in Zustand.

### 8.2 Tests

**Vitest + React Testing Library (component tests):**
- Button variants render correct classes
- StatusPill maps all 13 labels
- Money formats Vietnamese currency correctly
- Navigation active state
- RecordRelationshipChain renders 3 nodes
- ReadinessChecklistItem shows pass/fail with icon + text
- Exception flow: primary action disabled until selection

**Playwright (visual regression):**

Single root config at `frontend/playwright.config.ts` (not in tests/).

Tests live in `frontend/tests/e2e/`.

For stable screenshots:
- Disable animations
- Freeze system time
- Use deterministic fixtures
- Wait for `document.fonts.ready`
- Hide caret
- Fix timezone and locale
- Mask genuinely dynamic values
- Approve baselines manually before committing them

A screenshot test should detect drift, not encode accidental rendering noise.

Screenshot at 1440×1000 and 1280×900.
Verify: sidebar width 240px, logo not clipped, title not clipped, currency no wrap, action footer visible, no horizontal overflow, master-detail minimum widths, consistent card/button variants.
Run against: dashboard, transactions, exceptions, invoices, sales (all tabs), tax-readiness, showcase.

### 8.3 Accessibility verification

- Keyboard navigation: tabs, list rows, detail actions, drawers, dialogs
- Visible focus states (blue outline)
- No status communicated by color alone
- Minimum target size 40×40px
- Charts have text equivalents
- Dialogs trap and restore focus
- Sticky footers do not obscure focused content
- Vietnamese labels do not truncate

### 8.4 Final verification

```text
npm run build       — passes
npm run lint        — passes
npx tsc --noEmit    — passes
npx vitest run      — all component tests pass
npx playwright test — all screenshot tests pass
```

### 8.5 Commit and log

Commit by stage (8 commits minimum), staging exact paths only.

Update `log.md` with:
- What changed (all files)
- Why (design system decisions, component architecture)
- Verification (build, lint, typecheck, tests, screenshots)
- Status (complete per stage)

### Stage 8 acceptance criteria

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] All Vitest component tests pass
- [ ] All Playwright screenshot tests pass at 1440×1000 and 1280×900
- [ ] Single `playwright.config.ts` at frontend root (not duplicated)
- [ ] No raw hex colors in page components
- [ ] No Material Symbols anywhere
- [ ] No `DESIGN.md` conflicting with `03-design.md`
- [ ] `log.md` updated with all 8 stages
- [ ] All 7 merchant pages + 6 ops pages + 1 public page render without blank screens

---

## Motion Summary (emil-design-eng)

| Interaction | Duration | Easing | Property |
|---|---:|---|---|
| Button hover | 120ms | ease-out | background-color |
| Button press | 150ms | ease-out | transform: scale(0.97) |
| Card hover | 150ms | ease-out | border-color, shadow |
| Tab switch | 150ms | ease-out | opacity |
| Modal/QR open | 200ms | ease-out | opacity + scale(0.95→1) |
| Exception resolve | 250ms | ease-out | opacity + translateY |
| Drawer open | 220ms | ease-out | transform: translateX |
| Readiness update | 400ms | ease-out | width (progress bar) |
| Page load stagger | 30–80ms delay | ease-out | opacity + translateY |

All gated behind `@media (prefers-reduced-motion: no-preference)`.
Only animate `transform` and `opacity` (plus `background-color` for hovers).
Never use `ease-in` for UI.
Never animate from `scale(0)`.

---

## File Tree

```text
frontend/
├── public/
│   └── brand/
│       ├── taxlens-symbol.svg
│       └── taxlens-lockup.svg
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx                    — root layout (fonts, providers)
│   │   ├── page.tsx                       — redirect to /dashboard
│   │   ├── _dev/
│   │   │   └── showcase/
│   │   │       └── page.tsx              — component showcase
│   │   ├── (merchant)/
│   │   │   ├── layout.tsx                — AppShell with merchant nav
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   ├── exceptions/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   ├── sales/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   ├── tax-readiness/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   ├── assistant/
│   │   │   │   ├── page.tsx              — Trợ lý TaxLens (Stage 10)
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx              — Settings + dark mode (Stage 12)
│   │   ├── (operations)/
│   │   │   └── ops/
│   │   │       ├── layout.tsx            — AppShell with ops nav
│   │   │       ├── page.tsx              — portfolio overview
│   │   │       ├── merchants/
│   │   │       │   └── page.tsx          — merchant list + detail (Stage 13)
│   │   │       ├── cases/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [caseId]/
│   │   │       │       └── page.tsx      — case detail
│   │   │       ├── agent-runs/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [runId]/
│   │   │       │       └── page.tsx      — run detail + trace timeline
│   │   │       ├── audit/
│   │   │       │   └── page.tsx          — audit with JSON/CSV export
│   │   │       └── compliance/
│   │   │           └── page.tsx
│   │   └── confirm/
│   │       └── [token]/
│   │           └── page.tsx              — public, no shell
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── PageContent.tsx
│   │   │   ├── WorkspacePanel.tsx
│   │   │   └── StickyActionFooter.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── IconButton.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── StatusPill.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── FilterButton.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── EntityAvatar.tsx
│   │   │   ├── MetricStrip.tsx
│   │   │   ├── DetailSection.tsx
│   │   │   ├── RecordLink.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── SupportDialog.tsx
│   │   │   └── TraceDrawer.tsx
│   │   ├── domain/
│   │   │   ├── Money.tsx
│   │   │   ├── TransactionRow.tsx
│   │   │   ├── OrderRow.tsx
│   │   │   ├── InvoiceIssueRow.tsx
│   │   │   ├── ExceptionQueueItem.tsx
│   │   │   ├── RecordReference.tsx
│   │   │   ├── RecordRelationshipChain.tsx
│   │   │   └── ReadinessChecklistItem.tsx
│   │   ├── brand/
│   │   │   └── TaxLensLogo.tsx
│   │   └── Providers.tsx
│   ├── config/
│   │   └── navigation.ts
│   ├── hooks/
│   │   ├── useDashboard.ts
│   │   ├── useTransactions.ts
│   │   ├── useExceptions.ts
│   │   ├── useInvoices.ts
│   │   ├── useTaxReadiness.ts
│   │   ├── useSales.ts
│   │   ├── useAgentStream.ts             — SSE agent streaming (Stage 10)
│   │   ├── useRealtimeTransactions.ts    — WebSocket live updates (Stage 11)
│   │   ├── useCases.ts                   — cases API (Stage 13)
│   │   ├── useAgentRuns.ts              — agent runs list + trace (Stage 13)
│   │   ├── useAuditEvents.ts            — audit log + export (Stage 13)
│   │   ├── useProducts.ts               — POS products (Stage 9)
│   │   └── useActiveCashSession.ts      — cash session (Stage 9)
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── transactions.ts
│   │   │   ├── exceptions.ts
│   │   │   ├── invoices.ts
│   │   │   ├── readiness.ts
│   │   │   ├── sales.ts
│   │   │   ├── agents.ts                — agent run + trace endpoints (Stage 10)
│   │   │   ├── cases.ts                 — cases endpoints (Stage 13)
│   │   │   ├── audit.ts                 — audit endpoints (Stage 13)
│   │   │   ├── pos.ts                   — POS products + cash session (Stage 9)
│   │   │   └── sse-client.ts            — SSE streaming client (Stage 10)
│   │   ├── realtime/
│   │   │   ├── types.ts
│   │   │   ├── mock.ts                  — dev-only mock event source
│   │   │   └── ws-client.ts             — WebSocket client (Stage 11)
│   │   ├── merchant-context.ts          — demo merchant + period (Stage 9)
│   │   ├── store.ts                       — Zustand (minimal, Stage 8 if needed)
│   │   └── utils.ts                       — cn() helper, formatters
│   ├── types/
│   │   └── index.ts
│   └── mocks/
│       ├── fixtures/
│       │   ├── dashboard/
│       │   ├── transactions/
│       │   ├── exceptions/
│       │   ├── invoices/
│       │   ├── sales/
│       │   └── tax-readiness/
│       └── handlers/
├── tests/
│   ├── components/
│   │   ├── Button.test.tsx
│   │   ├── StatusPill.test.tsx
│   │   ├── Money.test.tsx
│   │   ├── Navigation.test.tsx
│   │   ├── RecordRelationshipChain.test.tsx
│   │   ├── ReadinessChecklistItem.test.tsx
│   │   └── ExceptionFlow.test.tsx
│   └── e2e/
│       └── visual-regression.spec.ts
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Key Constraints

- **No Material Symbols** — Lucide only, 1.75–2px stroke
- **No raw hex in components** — all colors via CSS variables or semantic tokens (`bg-primary-soft`, `bg-danger-soft`, `bg-neutral-soft`, etc.)
- **No `DESIGN.md` conflict** — `03-design.md` is canonical; mockups are references, not competing specs
- **No decorative card nesting** — semantic inset panels for reasoning/warnings/evidence are allowed
- **No gradients, no glassmorphism** — dark mode IS in scope (Stage 12)
- **No `ease-in` for UI animations**
- **No invoice authoring / tax filing / POS branding**
- **No auto-resolve low-confidence exceptions**
- **No Zustand for server state** — TanStack Query only
- **No manual "Đã thanh toán" QR button** — auto-match via real WebSocket (Stage 11)
- **No tax line in order total** — Tạm tính / Giảm giá / Tổng thanh toán
- **No metric strip on Transactions** — counts live inside tabs
- **No approve/reject on merchant confirmation** — Xác nhận đề xuất / Chọn phân loại khác
- **Currency never wraps** — `white-space: nowrap` enforced by Money component
- **Status never color-only** — always text + icon
- **Responsive parity is required** — every route must work from 360px mobile through the 1280px+ desktop target without feature loss
- **Showcase route guarded** — `notFound()` in production
- **Mock fixtures are dev-only fallback** — production uses real API (Stage 9)
- **No Plus Jakarta Sans** — Momo Trust Display for all UI text
- **No extraneous Material Design 3 tokens** — 12-token system only

---

## Stage 9 — Backend Integration: API Client & Data Layer Rewrite

> **Historical contract note:** The examples in Stage 9 describe the target known when the plan was written. The shipped frontend uses the authenticated same-origin `/api/backend/*` gateway with server-only `TAXLENS_BACKEND_URL`, and adapters normalize merged-main response shapes. Do not copy the direct `NEXT_PUBLIC_API_URL` snippets as current implementation guidance.

Rip out mock fixtures from Stage 2-8 and wire every hook to the real FastAPI backend. The API client switches from fixture imports to live `fetch` calls against `http://localhost:8000/api/v1`.

### 9.1 API surface map (frontend → backend)

```text
FRONTEND HOOK                    → BACKEND ENDPOINT
─────────────────────────────────────────────────────────────────
useDashboard()                   → GET /merchants/{id}/dashboard?period=YYYY-MM
useTransactions()                → GET /transactions?merchant_id=M001&period=YYYY-MM
useExceptions()                  → GET /reconciliation/exceptions?merchant_id=M001&period=YYYY-MM
useSales()                       → GET /sales?merchant_id=M001&period=YYYY-MM
useTaxReadiness()                → GET /tax/readiness?merchant_id=M001&period=YYYY-MM
useCases()                       → GET /cases?merchant_id=M001
useAgentRuns()                   → GET /agents/runs?merchant_id=M001
useAgentRunTrace(runId)          → GET /agents/runs/{runId}/trace
useAuditEvents()                 → GET /audit?merchant_id=M001&limit=100
useProducts()                    → GET /pos/products?merchant_id=M001
useActiveCashSession()           → GET /pos/cash-session
```

### 9.2 API client rewrite

`src/lib/api/client.ts` — replace fixture fallback with live fetch:

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}
```

### 9.3 Merchant context provider

Hardcode demo merchant for the prototype:

```ts
// src/lib/merchant-context.ts
export const DEMO_MERCHANT = {
  id: "M001",
  name: "Salon Hương",
  period: "2026-07",
};
```

All hooks use this context as default `merchant_id` and `period` query params. A period picker in PageHeader updates the context.

### 9.4 TanStack Query hooks (real transport)

Every hook from Stage 2 is rewritten to call `apiFetch` instead of returning fixtures:

```ts
// src/hooks/useTransactions.ts
export function useTransactions(period: string) {
  return useQuery({
    queryKey: ["transactions", DEMO_MERCHANT.id, period],
    queryFn: () => apiFetch<Transaction[]>("/transactions", {
      merchant_id: DEMO_MERCHANT.id,
      period,
    }),
  });
}
```

### 9.5 Backend adjustments (allowed)

This subsection is retained as plan history. Under the final team work split these changes belong to P4/P5; P3 records blockers and adapts the frontend but does not implement them.

The following backend changes are permitted to make the frontend work:

- **CORS**: ensure `CORS_ORIGINS` includes `http://localhost:3000` (already in `.env.example`)
- **Dashboard endpoint**: `GET /merchants/{id}/dashboard` already returns `total_transactions`, `reconciliation_rate`, `open_exceptions`, `tax_ready` — verify it works with seed data
- **Tax readiness**: `GET /tax/readiness` returns a checklist — verify the shape matches what the frontend expects
- **Add `GET /invoices` endpoint** if it doesn't exist (the frontend Invoices page needs it; currently no invoices router)

### 9.6 Seed data verification

Before wiring frontend, verify seed data exists:

```bash
cd backend && python scripts/seed_data.py
```

Confirm the integrated P5 truth set: M001 exists with 23 bank transactions for 2026-07, 15 matched and 8 exceptions, plus the documented sales/invoice fixtures. Any later demo mutation must be reported separately from this seed checkpoint.

### Stage 9 acceptance criteria

- [ ] `NEXT_PUBLIC_API_URL` env var set in `frontend/.env.local`
- [ ] All hooks call real API (no fixture imports in production code)
- [ ] Dashboard loads real data from `/merchants/M001/dashboard?period=2026-07`
- [ ] Transactions list loads from `/transactions?merchant_id=M001&period=2026-07`
- [ ] Exceptions list loads from `/reconciliation/exceptions`
- [ ] Tax readiness loads from `/tax/readiness`
- [ ] Sales list loads from `/sales`
- [ ] Period picker updates all queries
- [ ] Loading states show while fetching
- [ ] Error states show on API failure with retry
- [ ] Mock fixtures kept only for dev showcase and tests

---

## Stage 10 — Agent Runner: SSE Streaming & Tool Calling

Implement the Trợ lý TaxLens screen (`/assistant`) with end-to-end LLM interaction: user asks a question in Vietnamese, the backend streams safe progress summaries, specialist execution, tool calls, approval requests, and final results — all rendered live in the frontend. Never expose private chain-of-thought or hidden model reasoning.

### 10.1 Backend: SSE agent run endpoint

Add `POST /api/v1/agents/runs/stream` to `backend/app/routers/agents.py`:

```python
from fastapi import Body
from fastapi.responses import StreamingResponse
import json, asyncio
from app.agents.graph import agent_workflow
from app.agents.deepseek import get_deepseek_settings, create_deepseek_client
from app.tools._tracing import agent_run_scope
from app.models.agent import AgentRun
from app.core.database import AsyncSessionLocal
from app.agents.state import AgentRunStatus

@router.post("/runs/stream")
async def stream_agent_run(
    merchant_id: str = Body(...),
    request_text: str = Body(...),
    period: str = Body("2026-07"),
):
    run_id = f"RUN-{uuid4().hex[:12]}"

    async def event_stream():
        # 1. Create AgentRun row
        async with AsyncSessionLocal() as db:
            run = AgentRun(id=run_id, merchant_id=merchant_id, request_text=request_text, status="PLANNING")
            db.add(run)
            await db.commit()

        yield f"data: {json.dumps({'type': 'run_started', 'run_id': run_id})}\n\n"

        # 2. Run planner
        yield f"data: {json.dumps({'type': 'progress_summary', 'agent': 'planner', 'status': 'PLANNING', 'message': 'Đang phân tích yêu cầu...'})}\n\n"

        # ... execute workflow with trace events streamed as SSE
        # 3. Stream each agent step
        # 4. Stream tool call events
        # 5. Stream final result

        yield f"data: {json.dumps({'type': 'done', 'run_id': run_id})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

**SSE event types:**

```typescript
type SSEEvent =
  | { type: "run_started"; run_id: string }
  | { type: "progress_summary"; agent: string; status: string; message: string }
  | { type: "plan"; steps: PlanStep[] }
  | { type: "tool_started"; tool: string; args: Record<string, unknown>; agent: string }
  | { type: "tool_completed"; tool: string; output: unknown; duration_ms: number }
  | { type: "approval_required"; action_id: string; summary: string; impact: string }
  | { type: "action_completed"; action_id: string; output: unknown }
  | { type: "artifact"; artifact: Record<string, unknown> }
  | { type: "error"; message: string }
  | { type: "done"; run_id: string };
```

### 10.2 Backend: Wire real tool calling into specialist nodes

The current `graph.py` has placeholder nodes (`make_placeholder_node`). Replace them with real implementations that:

1. **Reconciliation node**: calls `get_bank_transactions`, `get_sales_orders`, `score_match_candidates`, `create_reconciliation_exception` via the LLM's function-calling API
2. **Tax compliance node**: calls `retrieve_tax_rules`, `validate_rule_version`, `check_required_fields`, `generate_tax_readiness_report`
3. **Merchant ops node**: calls `create_case`, `draft_merchant_message`, `update_case_status`

Each node:
- Sends the specialist system prompt + shared state to the LLM
- Exposes the allowed tools as OpenAI function definitions
- Streams each tool call as an SSE event
- Uses `agent_run_scope` for tracing

### 10.3 Frontend: Trợ lý TaxLens page (`/assistant`)

```text
src/app/(merchant)/assistant/page.tsx
```

Layout: two-column (60% conversation / 40% artifacts & results)

**Left column (60%) — Conversation:**
- Chat input at bottom: "Hỏi TaxLens về giao dịch, đối soát, thuế..."
- Suggested prompts: "Kiểm tra tháng 7 flow giúp chị", "Tổng quan sẵn sàng thuế", "Có bao nhiêu ngoại lệ?"
- Message stream (top to bottom):
  - User messages (right-aligned, neutral-soft bg)
  - Agent messages (left-aligned, surface bg)
  - **Progress summary** blocks: collapsible, accent-tinted bg, showing safe user-facing status and evidence without private reasoning
  - **Tool call** blocks: mono font, showing tool name + args, then result, with duration
  - **Plan** blocks: numbered steps with agent labels and status icons
  - **Status** indicators: animated dots while agent is working

**Right column (40%) — Artifacts & Results:**
- Tabs: "Kết quả" / "Tóm tắt" / "Audit trail"
- Kết quả: structured output from the last agent (reconciliation summary, tax readiness, case details)
- Tóm tắt: natural language summary from the final agent output
- Audit trail: trace events with timestamps, agent names, tool names

### 10.4 Frontend: SSE client

```text
src/lib/api/sse-client.ts
```

```ts
export async function* streamAgentRun(
  merchantId: string,
  requestText: string,
  period: string,
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${API_BASE}/agents/runs/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant_id: merchantId, request_text: requestText, period }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        yield JSON.parse(line.slice(6));
      }
    }
  }
}
```

### 10.5 Frontend: useAgentStream hook

```text
src/hooks/useAgentStream.ts
```

Manages SSE connection state, accumulates events into a conversation model, and exposes:

```ts
const {
  messages,      // accumulated conversation with progress summaries and tool calls
  isStreaming,   // true while SSE is active
  error,         // null or error string
  send,          // (text: string) => void — starts a new stream
  artifacts,     // structured results from agent outputs
  trace,         // audit trail events
} = useAgentStream(DEMO_MERCHANT.id, DEMO_MERCHANT.period);
```

### 10.6 Demo flow: "Kiểm tra tháng 7 flow giúp chị"

This must work end-to-end:

1. User types or clicks "Kiểm tra tháng 7 flow giúp chị"
2. Frontend sends `POST /agents/runs/stream` with `request_text: "Kiểm tra tháng 7 flow giúp chị"`, `merchant_id: "M001"`, `period: "2026-07"`
3. Backend creates AgentRun, streams `run_started`
4. Planner agent receives request, streams `progress_summary` ("Đang phân tích yêu cầu của chị Hương..."), produces plan, streams `plan`
5. Reconciliation agent executes read-only tools and streams `tool_started` / `tool_completed` events with sanitized arguments and results
6. Any proposed persistent write creates a durable action and streams `approval_required`; the tool executes only after individual approval
7. Tax compliance agent executes `check_required_fields` and `generate_tax_readiness_report`
8. Merchant ops agent proposes case or message actions through the same approval boundary
9. Final `done` event with run_id
10. Frontend renders all of this live: progress blocks expand/collapse, tool calls show in mono, plan steps check off, approval cards resolve, artifacts populate

### Stage 10 acceptance criteria

- [ ] `POST /agents/runs/stream` returns SSE stream
- [ ] Planner produces a real plan via OpenRouter/DeepSeek API
- [ ] Specialist nodes call real tools (not placeholders)
- [ ] SSE events stream in order: run_started → progress_summary → plan → tool_started → tool_completed → approval_required/action_completed → artifact → done
- [ ] Frontend `/assistant` page renders conversation with streaming
- [ ] Progress-summary blocks render safely without exposing private chain-of-thought
- [ ] Tool call blocks show tool name, args, result, duration in mono font
- [ ] Plan blocks show numbered steps with status icons
- [ ] Artifacts panel populates with structured results
- [ ] "Kiểm tra tháng 7 flow giúp chị" works end-to-end
- [ ] Error states show if LLM API fails (graceful fallback to default plan)
- [ ] AgentRun and ToolCall rows created in DB
- [ ] Audit events created for every tool call

---

## Stage 11 — Real-Time Payment Flow: WebSocket & SePay Webhook

Wire the frontend to the backend WebSocket so that when a real bank transfer arrives (via SePay webhook or manual simulation), the app responds in real-time: transaction appears, matching runs, and the merchant sees it live.

### 11.1 Frontend: WebSocket client

```text
src/lib/realtime/ws-client.ts
```

```ts
export function connectWebSocket(onMessage: (event: RealtimeEvent) => void): WebSocket {
  const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1") + "/ws/transactions";
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return ws;
}
```

### 11.2 Frontend: useRealtimeTransactions hook

```text
src/hooks/useRealtimeTransactions.ts
```

- Connects to WebSocket on mount
- On `money_received` event: invalidates TanStack Query for transactions + dashboard + exceptions
- Shows a toast notification: "Đã nhận thanh toán: {amount}₫ từ {sender}"
- If on Sales page with active QR: transitions QR state to "Đã nhận thanh toán" + "Đã tự động khớp"

### 11.3 Frontend: QR payment flow (real integration)

The Sales page "Tạo QR" flow now uses real backend:

1. User creates order in Sales → clicks "Tạo QR"
2. Frontend calls the canonical `POST /api/v1/pos/payment-intents` endpoint with the sale id and payment amount
3. Backend creates `PaymentIntent` with unique reference (e.g. `PAY-A8F21X`)
4. Frontend shows QR with reference + 15-min timer
5. User (or tester) sends money to the SePay webhook with the reference in the note
6. Backend SePay webhook fires → inserts BankTransaction → broadcasts via WebSocket
7. Frontend receives WebSocket event → invalidates queries → QR state transitions to paid
8. Backend matching service runs → auto-matches transaction to sale via reference
9. Frontend shows "Đã nhận thanh toán" + "Đã tự động khớp"

### 11.4 Backend: Canonical payment intent endpoint

Keep the existing `POST /api/v1/pos/payment-intents` contract. Harden it to validate merchant ownership, sale status, positive amount, idempotency, expiry, and audit metadata; do not add a competing `/sales/{sale_id}/payment-intent` route.

### 11.5 Backend: Auto-match on webhook

After SePay webhook inserts a transaction, run matching:

```python
# In sepay.py process_webhook, after insert:
if inserted:
    # Try auto-match by payment_code/reference
    if payload.code or payload.referenceCode:
        await auto_match_transaction(canonical_id, payload.code or payload.referenceCode)
```

`auto_match_transaction` looks up PaymentIntent by reference, creates PaymentAllocation if amount matches.

### 11.6 Demo: Simulated money transfer

For demo without a real bank:

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/sepay?merchant_id=M001 \
  -H "Authorization: Apikey {SEPAY_WEBHOOK_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 99999,
    "transactionDate": "2026-07-18 10:30:00",
    "accountNumber": "123456789",
    "transferAmount": 1500000,
    "content": "NGUYEN VAN A chuyen tien PAY-A8F21X",
    "transferType": "in",
    "referenceCode": "PAY-A8F21X"
  }'
```

The frontend should respond within 1-2 seconds: toast notification, transaction list update, QR state transition.

### 11.7 Nginx tunnel note

If the user opens an ngrok/nginx tunnel to expose `localhost:8000`, SePay webhooks from the real bank will hit the tunnel URL. The backend processes them identically. The frontend WebSocket connects to the same backend. No code changes needed for tunnel — only env config:

```text
NEXT_PUBLIC_API_URL=https://tunnel.example.com/api/v1
NEXT_PUBLIC_WS_URL=wss://tunnel.example.com/api/v1
```

### Stage 11 acceptance criteria

- [ ] WebSocket connects on app load
- [ ] `money_received` event triggers toast + query invalidation
- [ ] Transaction list updates in real-time without page reload
- [ ] QR payment flow: create intent → show QR → webhook fires → auto-match → UI updates
- [ ] `POST /pos/payment-intents` creates an idempotent, expiring PaymentIntent
- [ ] SePay webhook auto-matches by reference code
- [ ] Simulated curl webhook triggers full flow
- [ ] Dashboard reconciliation rate updates after new transaction
- [ ] No manual "Đã thanh toán" button — only auto-match
- [ ] Works through ngrok/nginx tunnel with env var change

---

## Stage 12 — Dark Mode & Settings

Implement the Settings page with appearance mode (light/dark/auto) using the dark mode tokens from Lock 4.

### 12.1 Settings page (`/settings`)

```text
src/app/(merchant)/settings/page.tsx
```

Sections:
- **Hồ sơ cửa hàng**: merchant name, tax ID, business type, address (read-only for demo)
- **Giao diện**: Light / Dark / Auto mode selectors (visual cards, not dropdown)
- **Kết nối dữ liệu**: SePay status (connected), Invoice provider (connected), sync buttons

### 12.2 Dark mode implementation

CSS variables with `.dark` class on `<html>`:

```css
.dark {
  --color-text: var(--color-dark-text);
  --color-text-secondary: var(--color-dark-text-secondary);
  --color-background: var(--color-dark-background);
  --color-surface: var(--color-dark-surface);
  --color-border: var(--color-dark-border);
  --color-primary: var(--color-dark-primary);
  --color-secondary: var(--color-dark-secondary);
}
```

Theme toggle via `next-themes` or custom context. Sidebar uses `--color-dark-sidebar` specifically.

### 12.3 Dark mode rules (from §27.2)

- Sidebar: `--color-dark-sidebar` (#121628), not `--color-dark-surface`
- No pure black backgrounds
- Mango accent stays warm (#F59A1E)
- Border opacity reduced (use `--color-dark-border`)
- Status pills: same semantic meaning, adjusted opacity for dark bg
- Charts: grid lines at 10% opacity, text at `--color-dark-text-secondary`

### Stage 12 acceptance criteria

- [ ] Settings page renders with 3 sections
- [ ] Light/Dark/Auto mode selector works
- [ ] Dark mode applies correct tokens (not Material dark tokens)
- [ ] Sidebar uses `--color-dark-sidebar` in dark mode
- [ ] All pages render correctly in dark mode
- [ ] No pure black backgrounds
- [ ] `prefers-color-scheme: dark` respected in Auto mode

---

## Stage 13 — SHB Operations: Real Data & Agent Trace

Wire the SHB Operations pages (Stage 6) to real backend data.

### 13.1 Ops pages data wiring

```text
/ops (portfolio overview)    → GET /merchants (list all) + aggregate stats
/ops/merchants               → GET /merchants (list) + per-merchant dashboard
/ops/cases                   → GET /cases (all merchants) + GET /cases/{id}
/ops/agent-runs              → GET /agents/runs (all merchants) + GET /agents/runs/{id}/trace
/ops/audit                   → GET /audit?limit=100
/ops/compliance              → GET /tax/readiness (aggregate) + TaxRuleVersion data
```

### 13.2 Agent run detail with trace

`/ops/agent-runs/{runId}` shows:
- Run metadata: request_text, status, started_at, completed_at, merchant
- Plan steps (from `run.plan` JSONB)
- Tool call timeline: each `ToolCall` row with agent, tool, confidence, duration
- Trace events in chronological order
- Link to related case if `case_id` is set

### 13.3 Audit trail with export

`/ops/audit` supports:
- Filter by merchant, agent, tool, date range
- JSON export: download filtered events as `.json`
- CSV export: download filtered events as `.csv`
- Each event row: actor, agent, action, tool, confidence, rule_version, timestamp

### Stage 13 acceptance criteria

- [ ] All ops pages load real data from backend
- [ ] Agent run detail shows plan + tool call timeline
- [ ] Audit page supports filtering + JSON/CSV export
- [ ] Cases page shows real cases with status and assigned RM
- [ ] Portfolio overview aggregates across merchants
- [ ] Compliance page shows real rule versions

---

## Stage 14 — End-to-End Verification & Documentation

### 14.1 Three demo flows verification

**Flow 1: Agent conversation ("Kiểm tra tháng 7 flow giúp chị")**
1. Open `/assistant`
2. Click "Kiểm tra tháng 7 flow giúp chị"
3. Verify: SSE streams safe progress summaries, tool calls execute, approvals gate writes, and artifacts populate
4. Verify: AgentRun + ToolCall rows in DB
5. Verify: Audit events created

**Flow 2: Real-time payment**
1. Open `/sales`, create order, click "Tạo QR"
2. Copy payment reference (e.g. `PAY-A8F21X`)
3. Send curl webhook with reference in note
4. Verify: WebSocket pushes event, toast appears, QR transitions to paid, transaction list updates
5. Verify: PaymentAllocation created, Sale status updated

**Flow 3: Merchant resolution loop**
1. Open `/exceptions` — see 5 pending exceptions
2. Select first exception, review TaxLens recommendation
3. Choose classification, click "Xác nhận lựa chọn"
4. Verify: exception status updates, auto-loads next
5. Complete all 5 → see completion state with "Xem sẵn sàng thuế" CTA
6. Open `/tax-readiness` → verify readiness score improved

### 14.2 Build & lint

```text
npm run build       — passes
npm run lint        — passes
npx tsc --noEmit    — passes
```

### 14.3 Update log.md

Add comprehensive entry covering:
- All stages 1-14
- Drift analysis results and locks applied
- Backend changes made (new endpoints, SSE, WebSocket, auto-match)
- Demo flow verification results
- Evidence that every Stage 1–14 acceptance criterion is complete, or an explicit hard blocker with preserved recovery state

### 14.4 Product completeness gate

Do not stop at a partial percentage. Finish the approved merchant, assistant, public confirmation, settings, and SHB operations workflows end-to-end. Record optional future ideas only after the working product passes the release gate.

### Stage 14 acceptance criteria

- [ ] All 3 demo flows pass end-to-end
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `log.md` updated with full implementation history
- [ ] No mock fixtures in production code paths
- [ ] No Material Symbols anywhere in codebase
- [ ] No Plus Jakarta Sans in codebase
- [ ] All 14 stages' acceptance criteria met
- [ ] App is a complete, locally demo-ready product with responsive parity and deterministic external-service fallbacks

---

## Approved Product Decisions (Execution Addendum)

These decisions are locked for this build and resolve ambiguity without replacing the stage specifications above.

### Identity, data, and demo clock

- Canonical hero merchant: **Salon Hương**, owner **Nguyễn Thị Hương**.
- Deterministic portfolio: 8 Vietnamese merchants across salon, café, cosmetics, grocery, food, nail, flowers, and fashion.
- Seed exactly 1,500 sales across May–July 2026, plus realistic bank, cash, COD, invoice, exception, case, agent, and audit records.
- Preserve the curated Salon Hương July story: 30 visible transactions, 25 resolved, 5 pending, 2 invoice gaps, and readiness moving from 92% to 100%.
- Fix the demo clock at `2026-08-03` so July is a closed reporting period.
- Cover Vietnamese accents/no accents, slang, abbreviations, blank notes, same-amount collisions, partial/split/overpayments, deposits, expired references, refunds, supplier payments, internal transfers, loans, COD, cash discrepancies, invoice mismatches, provider failures, and webhook replay.

### Authentication and security

- Support real credential login plus one-click seeded Merchant and SHB demo login.
- Use a same-origin Next.js gateway with HttpOnly, Secure, SameSite cookies, CSRF protection, refresh rotation, and logout revocation. Never store JWTs in `localStorage` or expose them to page JavaScript.
- Enforce tenant isolation and role checks in the backend, not only in route visibility.

### End-to-end product behavior

- Resolving reconciliation exceptions, linking invoices, recording invoices issued elsewhere, and reconciling cash must persist and recalculate dashboard/readiness state.
- Support live SePay synchronization plus validated CSV/XLSX import with preview, row errors, idempotency, and audit evidence.
- Support JSON, generic CSV, and MISA-compatible CSV downloads only; do not claim MISA API submission.
- Keep real SePay webhook processing and add a deterministic `DEMO_MODE` payment simulation that uses the same matching, allocation, WebSocket, and audit path.
- Public confirmation tokens are signed, expiring, single-use, tenant-bound, and replay-safe.
- SHB Console actions are real: inspect merchants/runs/traces/audit, assign and resolve cases, and export evidence.
- Read-only agent tools execute automatically. Every persistent write becomes a durable proposed action and requires individual approval before execution.
- Merchant traces show plain-language progress and evidence; SHB traces show sanitized technical tool details. Neither role sees private chain-of-thought.

## Public Interface Addendum

- Standard page envelope: `Page<T> = { items: T[]; total: number; next_cursor: string | null }`.
- Merchant access: `GET /api/v1/merchants` plus the existing merchant detail/dashboard routes.
- Invoices: `GET /api/v1/invoices`, `POST /api/v1/invoices/link`, `POST /api/v1/invoices/issued-elsewhere`.
- Data intake: `POST /api/v1/integrations/sepay/sync` and multipart `POST /api/v1/imports/ledger`.
- Agent streaming: keep `POST /api/v1/agents/run`; add `POST /api/v1/agents/runs/stream`, `GET /api/v1/agents/runs/{run_id}/actions`, and `POST /api/v1/agents/actions/{action_id}/decision`.
- Cases: `GET /api/v1/cases`, `GET /api/v1/cases/{case_id}`, `POST /api/v1/cases/{case_id}/assign`, and `POST /api/v1/cases/{case_id}/resolve`.
- Tax readiness returns `score`, `checks`, `blockers`, and `export_allowed`; `GET /api/v1/tax/export` accepts `json`, `csv`, or `misa_csv`.
- Keep canonical POS paths under `/api/v1/pos`, including `/products`, `/sales`, `/payment-intents`, `/cash-payments`, and cash-session close.
- Add durable `agent_actions`, `import_batches`, and `integration_sync_runs` records through reviewed Alembic migrations.

## Autonomous Context and Parallel Execution

### Context continuity

- Run stages through a repository-local PowerShell orchestrator using a new, non-resumed `codex exec` after every acceptance-gated significant commit.
- Persist recovery state in `docs/04-delivery/frontend-build/STATE.md`, `ACCEPTANCE.md`, and `NEXT_PROMPT.md` alongside JSONL/stderr evidence outside tracked source paths.
- Each fresh session reads `AGENTS.md`, this plan, current state, acceptance evidence, relevant `log.md`, `git status`, and the previous commit before continuing.
- Pass `model_context_window=1050000`, `model_auto_compact_token_limit=577500`, and `model_auto_compact_token_limit_scope="total"` per invocation. This compacts after 55% usage, leaving 45% of the requested full model context.
- If the installed Codex client rejects the 1.05M override, record the deviation and continue with its advertised 272K window and a 149,600-token threshold.
- Disable hooks, use strict configuration, refuse recursive runner invocation, never resume the previous session, and stop on a wrong branch, dirty integration tree, failed required test, missing commit, or state/HEAD mismatch.

### Model routing

- Main architecture, shared contracts, integration, remediation, and final acceptance: `gpt-5.6-sol` with `high` reasoning.
- Substantial isolated implementation: `gpt-5.6-terra` with `medium` or `high` reasoning.
- Bounded fixtures, tests, documentation, and checker passes: `gpt-5.6-luna` with `medium` reasoning.
- Any failed gate or ambiguous cross-slice integration escalates to `gpt-5.6-sol` with `high` reasoning.

### Parallel Git isolation

- Root is the integration owner. Parallel makers work only in temporary branches/worktrees created from the same verified checkpoint.
- Feature slices are merchant ledger, sales/payment/confirmation/settings, and assistant/SHB operations. Shared manifests, configuration, global styles, auth/API clients, migrations, registries, seed orchestration, canonical docs, and navigation remain root-owned.
- Every maker receives an exact file allowlist and a preallocated `log.md` block. Each commit contains only its owned slice and required elaborative log entry.
- Root inspects changed-file manifests and diffs, cherry-picks one commit at a time, runs the slice gate, and stops rather than guessing on any unexpected path or conflict.

## Final Product Gate

- Backend: migrations, compile, unit/integration tests, tenant isolation, RBAC, CSRF, token replay, approval boundaries, webhook idempotency, tax exports, and deterministic seed invariants.
- Frontend: lint, typecheck, unit tests, production build, and no fixture imports in production routes.
- Browser: every route at desktop and mobile widths in both themes, keyboard and reduced-motion behavior, axe checks, loading/empty/error/offline/reconnect states, and reference-image comparison.
- End-to-end: merchant login/import/reconcile/invoice/readiness/export; sale/QR/cash/realtime allocation; assistant run with per-write approval; SHB case/trace/audit operations; signed public confirmation.
- Git: exact diff against `origin/main`, no secrets, no unrelated role work, complete `log.md`, clean working tree, retained recovery stash until the pushed branch is verified.

## P3 Execution Checkpoint — 2026-07-18

This additive checkpoint preserves the original plan while recording what is verified on the fresh integration branch.

- Branch: `p3-frontend-design-consistency-final`, created from integrated `origin/main@13a3b74`; the stale mixed-role P3 branch was not merged or rebased wholesale.
- Scope: P3 frontend, API/WebSocket clients, browser integration, design consistency, and demo script only. P1 matching, P2 agent internals, P4 backend/infra, and P5 seed/reset/data remain untouched.
- Visual system: the supplied Stitch HTML and screenshots remain the reference; the shipped product translates them into reusable Next/React components under the locked TaxLens design system.
- Deterministic frontend evidence: `npm run lint`, `npm run typecheck`, 44 Vitest tests, production build of 27 routes, and 33 Playwright tests across desktop, compact, and mobile pass on 2026-07-18.
- Production-mode Playwright builds without standalone output only inside the test server, avoiding development hot-reload races while preserving standalone deployment builds.
- Dependency note: the two moderate `npm audit` entries are one transitive PostCSS advisory in the latest stable Next release. No stable patched Next 16 exists; do not accept npm's breaking Next 9 downgrade or move to a preview solely for this advisory.
- Live integration boundary: current integrated backend contracts remain incomplete for invoices, full readiness, agent streaming/approvals, realtime allocation, and several SHB/settings flows. These are owner blockers rather than cross-role P3 patches.
- Sprint 4 demo: `docs/demo-script.md` defines six scenes and an 8:30 runbook. Live rehearsal remains pending until owner contracts and demo data are ready.
- Product-owner direction: pitch deck work is deferred and intentionally excluded from this execution.
