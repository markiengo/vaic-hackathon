# TaxLens Visual Contract

> Canonical visual source of truth: `frontend/new-design/SME-owner/merchant-dashboard.html`
> Product/IA source of truth: `docs/04-delivery/03-design.md`
> Routes/data/state: existing Next.js implementation

## 1. Color tokens

| Token | Value | Usage |
|---|---|---|
| `--color-canvas` | `#FCFBF8` | page background |
| `--color-surface` | `#FFFFFF` | cards, sidebar |
| `--color-ink` | `#0C1842` | headings, logo, important text |
| `--color-brand-navy` | `#19244E` | body text default |
| `--color-text-secondary` | `#5D647A` | secondary text |
| `--color-text-tertiary` | `#858B9D` | tertiary/caption text |
| `--color-primary` | `#F36B2E` | dominant action only |
| `--color-primary-hover` | `#DD5C24` | primary hover |
| `--color-selection` | `#253C96` | active nav, links, selection |
| `--color-selection-soft` | `#EAF0FF` | active nav background |
| `--color-secondary-blue` | `#4257B2` | secondary blue |
| `--color-neutral-soft` | `#F5F6F8` | raw notes, hover bg, merchant chip |
| `--color-information-soft` | `#F3F2FF` | recommendation panels |
| `--color-warning-soft` | `#FFF3E0` | priority pills, warning accents |
| `--color-border` | `#E5E7EE` | standard borders |
| `--color-border-strong` | `#CDD1DD` | strong borders |
| `--color-error` | `#BA1A1A` | errors |

## 2. Radius tokens

| Token | Value | Usage |
|---|---|---|
| `--radius-md` | `6px` | small elements |
| `--radius-lg` | `12px` | controls, buttons, nav items |
| `--radius-xl` | `16px` | cards (`rounded-2xl`) |
| `--radius-full` | `9999px` | pills, header secondary buttons |

## 3. Typography

### Font roles
- **Newsreader** (`--font-display`): page titles, section titles, large values, card titles
- **Momo Trust Display** (`--font-ui`): navigation, body, labels, controls, buttons, tables
- **JetBrains Mono** (`--font-mono`): transaction IDs, raw notes, technical references

### Type scale
| Role | Size | Line height | Weight | Tracking |
|---|---|---|---|---|
| Page title | 44px | 1.10 | 700 | -0.02em |
| Section title | 28px | 1.20 | 600 | -0.02em |
| Large value | 36-38px | 1.10 | 700 | -0.03em |
| Card title | 22px | 1.30 | 600 | — |
| Body | 14px | 1.55 | 400 | — |
| Button | 14px | 1.20 | 600 | — |
| Label | 13px | 1.30 | 500 | — |
| Caption | 12px | 1.45 | 400 | — |
| Technical | 12px | 1.50 | 400 | — |

## 4. Spacing scale

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 8px | very small internal separation |
| `--space-2` | 12px | closely related controls, action gap |
| `--space-3` | 16px | standard internal stack |
| `--space-4` | 24px | component gap, compact section gap |
| `--space-5` | 32px | card padding, major grid gap |
| `--space-6` | 48px | major section separation |

## 5. Shell geometry

- Max application width: 1920px (centered)
- Sidebar: 240px fixed, white bg, `border-r border-border`, `shadow-[4px_0_24px_rgba(25,36,78,0.02)]`
- Main content max-width: 1600px, `margin-inline: auto`
- Page padding: `40px 48px 56px` (top/horizontal/bottom)
- Smaller desktop padding: `32px 32px 48px`

## 6. Sidebar anatomy

- Logo area: `p-8 pb-6` (32px top/horizontal, 24px bottom)
- Logo: 32×32px mark + 12px gap + "TaxLens" wordmark (Newsreader, 26px, bold, `text-ink`)
- Nav container: `px-6 py-2 gap-1`
- Nav row: `px-4 py-2.5 gap-3 rounded-xl text-[14px]`, icon 18px
- Active: `bg-[#EAF0FF] text-[#253C96] font-semibold border-l-4 border-[#253C96]`
- Inactive: `text-[#5D647A] hover:bg-[#F5F6F8] hover:text-[#19244E]`
- Utility area: `p-6`, same row proportions
- Utilities: Hỗ trợ SHB, Cài đặt, Đăng xuất
- **No** FirstVisitHint, ThemeButton, or user identity block in sidebar

## 7. Page header

- Layout: flex row, items-end, justify-between, `mb-12` (48px bottom)
- Left: merchant chip (pill `bg-[#F5F6F8] text-secondary px-3 py-1 text-xs font-semibold`), period/update text (`text-xs text-text-tertiary`), title (`font-display text-[44px] text-ink`), subtitle (`text-sm text-text-secondary`)
- Right: up to 3 actions, 12px gap, one solid orange max, secondary = pill outline
- **No** border-bottom, **no** uppercase eyebrow

## 8. Cards

### Major card
`bg-white rounded-2xl border border-border p-8 shadow-[0_4px_24px_rgba(25,36,78,0.04)]`

### Compact card
`bg-white rounded-2xl border border-border p-6 shadow-[0_4px_24px_rgba(25,36,78,0.04)]`

### Inset information surface
`bg-[#F3F2FF] rounded-xl p-5 border border-border` (optional)

## 9. Buttons

| Variant | Style |
|---|---|
| Primary | `bg-primary text-white rounded-xl min-h-10 px-5 text-sm font-semibold hover:bg-primary-hover` |
| Header secondary | `bg-white border border-primary text-primary rounded-full min-h-10 px-5 text-sm font-semibold` |
| Card secondary | `bg-white border border-primary text-primary rounded-xl min-h-10 px-5 text-sm font-semibold` |
| Tertiary | `text-primary text-sm font-semibold` (no container) |

## 10. Status pills

`px-3 py-1 rounded-full text-[13px] font-medium` — no border, no icon.
- Neutral: `bg-gray-100 text-gray-700`
- Warning/priority: `bg-[#FFF3E0] text-primary`
- Info: `bg-[#EAF0FF] text-secondary`

## 11. Tables

- Container: major white card, `rounded-2xl p-8`
- Header: `text-[13px] font-medium text-text-tertiary`, subtle bottom border
- Body row: `py-6 px-6`, min height ~68-72px, `divide-y divide-border/30`
- Names: `text-sm font-medium text-ink`
- Amounts: `text-sm font-semibold text-right tabular-nums whitespace-nowrap`
- Raw notes: `font-mono text-xs text-text-secondary`
- Hover: `hover:bg-gray-50/50`, no movement

## 12. Quick action cards

4-column grid, 24px gap, `p-6 rounded-2xl border bg-surface`, vertical centered, 30px icon, 12px gap, `text-sm font-semibold`

## 13. Grids

- 12-column major layout, 32px major grid gap (`gap-8`)
- 24px compact grid gap (`gap-6`)
- Dashboard: top summary 4/4/4, quick actions 4 equal, featured 6/6

## 14. Section structure

- Section title: `font-display text-[28px] text-ink`
- 32px spacing to content, 48px after complete section
- Section action: `text-sm font-semibold text-primary`, right aligned

## 15. Navigation order (merchant)

1. Tổng quan
2. Trợ lý TaxLens
3. Giao dịch
4. Cần xác nhận
5. Hóa đơn
6. Bán hàng
7. Sẵn sàng thuế

## 16. Dark mode

- Change semantic tokens only
- Do NOT change: component size, sidebar width, page padding, card padding, typography, grid structure, border radius, action hierarchy
- No CSS inversion, no glow/gradients/glassmorphism

## 17. Migration order

1. Foundation (tokens, shell, fonts)
2. Primitive components
3. Golden dashboard
4. Merchant routes
5. SHB Operations routes
6. Auth & overlays
7. Visual regression
