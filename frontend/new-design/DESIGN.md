---
name: TaxLens Identity System
colors:
  surface: '#FFFFFF'
  surface-dim: '#d1d8ff'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f2ff'
  surface-container: '#ecedff'
  surface-container-high: '#e4e7ff'
  surface-container-highest: '#dde1ff'
  on-surface: '#0c1842'
  on-surface-variant: '#594239'
  inverse-surface: '#232e58'
  inverse-on-surface: '#efefff'
  outline: '#8c7167'
  outline-variant: '#e0c0b4'
  surface-tint: '#a63b00'
  primary: '#a63b00'
  on-primary: '#ffffff'
  primary-container: '#f36b2e'
  on-primary-container: '#541a00'
  inverse-primary: '#ffb599'
  secondary: '#4257b2'
  on-secondary: '#ffffff'
  secondary-container: '#8ca0ff'
  on-secondary-container: '#1a328d'
  tertiary: '#446463'
  on-tertiary: '#ffffff'
  tertiary-container: '#7a9b99'
  on-tertiary-container: '#113231'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#7f2b00'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c3ff'
  on-secondary-fixed: '#001355'
  on-secondary-fixed-variant: '#283f98'
  tertiary-fixed: '#c6e9e7'
  tertiary-fixed-dim: '#abcdcb'
  on-tertiary-fixed: '#00201f'
  on-tertiary-fixed-variant: '#2c4c4b'
  background: '#FCFBF8'
  on-background: '#0c1842'
  surface-variant: '#dde1ff'
  primary-hover: '#DD5C24'
  secondary-hover: '#1F327F'
  mango: '#F59A1E'
  border: '#E5E7EE'
  border-strong: '#CDD1DD'
  text-secondary: '#5D647A'
  text-tertiary: '#858B9D'
typography:
  display:
    fontFamily: Newsreader
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.05'
    letterSpacing: -0.04em
  h1:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.10'
    letterSpacing: -0.03em
  h2:
    fontFamily: Newsreader
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.15'
    letterSpacing: -0.02em
  h3:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.20'
    letterSpacing: -0.02em
  h4:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.30'
  body:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.55'
  small:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.50'
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.45'
  button:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.20'
  label:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.30'
  technical:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.50'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 2rem
  gutter: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

# 04-delivery/03-design.md — TaxLens Identity System

> **Status:** Draft — global identity locked; per-screen specifications pending
> **Authority:** Normative
> **Owner:** Design Lead
> **Applies to:** All TaxLens frontend surfaces
> **Theme:** Light mode only
> **Product name:** TaxLens
> **Endorsement:** by SHB

---

## 1. Scope

This document currently defines only:

* brand personality
* color system
* typography
* logo architecture
* favicon direction
* global visual language
* shared component character
* motion and accessibility principles

Screen layouts, navigation structures, content hierarchy and responsive behavior remain pending.

This identity replaces the previous SHB-green, Inter, gradient-heavy and glassmorphism direction in the existing design specification. 

---

## 2. Brand foundation

TaxLens is an SHB-backed financial operations product that helps merchants turn disconnected transactions, sales, cash and invoice records into a clean, explainable and tax-ready dataset. 

### Brand promise

> **Dòng tiền khớp. Sổ sách sạch. Vận hành nhẹ.**

### Personality

TaxLens should feel:

* **90% credible:** precise, calm, structured, trustworthy
* **10% playful:** warm, approachable and recognisably human
* modern without looking experimental
* bank-backed without looking bureaucratic
* intelligent without relying on AI clichés
* suitable for Vietnamese merchants, not only banking specialists

### Experience principles

1. **Clarity before decoration**
2. **Exception-first**
3. **Human control remains visible**
4. **Plain Vietnamese before accounting terminology**
5. **Warmth through shape and color—not illustrations or gimmicks**
6. **Every important status should explain what happened and what comes next**

The product should visually reinforce the underlying rule:

> Rules handle certainty. AI handles ambiguity. Humans approve important decisions.

---

## Brand identity and visual system

### Brand direction

TaxLens is a credible SHB-backed financial operations product with a **90% serious, 10% warm and playful** personality.

The interface should feel:

* trustworthy
* structured
* modern
* merchant-friendly
* precise without becoming cold
* bank-backed without looking bureaucratic

TaxLens uses a light-mode-first interface with restrained brand color usage. White and warm neutral surfaces dominate; orange drives action; navy and blue provide trust and structure; mist supports calm informational areas.

---

### Core palette

| Token                     |     Value | Usage                                                 |
| ------------------------- | --------: | ----------------------------------------------------- |
| `--color-text`            | `#19244E` | Primary text, navigation, headings                    |
| `--color-background`      | `#FCFBF8` | Main page canvas                                      |
| `--color-surface`         | `#FFFFFF` | Cards, panels, modals                                 |
| `--color-primary`         | `#F36B2E` | Primary CTA, key actions                              |
| `--color-primary-hover`   | `#DD5C24` | Primary hover/pressed state                           |
| `--color-secondary`       | `#253C96` | Active navigation, links, selected states             |
| `--color-secondary-hover` | `#1F327F` | Secondary hover/pressed state                         |
| `--color-accent`          | `#C4E7E5` | Soft info panels, AI reasoning, calm highlights       |
| `--color-mango`           | `#F59A1E` | Progress, positive emphasis, charts, small highlights |
| `--color-border`          | `#E5E7EE` | Standard dividers                                     |
| `--color-border-strong`   | `#CDD1DD` | Focused or emphasized boundaries                      |
| `--color-text-secondary`  | `#5D647A` | Supporting copy                                       |
| `--color-text-tertiary`   | `#858B9D` | Metadata, disabled text, placeholders                 |

### Realtime Colors preview

Use:

```text
Text:       #19244E
Background: #FCFBF8
Primary:    #F36B2E
Secondary:  #253C96
Accent:     #C4E7E5
```

`#F59A1E` remains a supporting brand color rather than one of the five structural preview colors.

### Color usage rules

* White and tinted-white surfaces should occupy most of the interface.
* Orange is reserved for primary action and high-value emphasis.
* Blue is used for navigation, links and selected states.
* Navy anchors typography and structural areas.
* Mist is used for calm informational surfaces.
* Mango is used sparingly for progress, charts and secondary emphasis.
* Do not use orange as the warning color.
* Do not fill large application areas with saturated brand colors.
* Do not use gradients in core operational screens.

---

## Typography

### Font families

```css
--font-display: "Newsreader", Georgia, serif;
--font-ui: "Momo Trust Display", Arial, sans-serif;
--font-mono: "JetBrains Mono", monospace;
```

### Font responsibilities

**Newsreader**

Use for:

* display headlines
* page titles
* hero statements
* major readiness percentages
* important empty-state messages

Do not use for dense tables, buttons or compact controls.

**Momo Trust Display**

Use for:

* navigation
* buttons
* form controls
* body text
* labels
* card titles
* badges
* transaction summaries
* status messages

**JetBrains Mono**

Use for:

* transaction IDs
* payment references
* case IDs
* rule versions
* audit hashes
* tool names
* code snippets

Do not use monospace for general merchant-facing copy.

---

### Type scale

| Style               | Font               |    Size | Line height | Weight | Letter spacing |
| ------------------- | ------------------ | ------: | ----------: | -----: | -------------: |
| Display             | Newsreader         |    64px |        1.05 |    700 |      `-0.04em` |
| H1                  | Newsreader         |    48px |        1.10 |    700 |      `-0.03em` |
| H2                  | Newsreader         |    36px |        1.15 |    600 |      `-0.02em` |
| H3                  | Newsreader         |    28px |        1.20 |    600 |      `-0.02em` |
| H4                  | Momo Trust Display |    22px |        1.30 |    600 |            `0` |
| Body                | Momo Trust Display |    16px |        1.55 |    400 |            `0` |
| Small               | Momo Trust Display |    14px |        1.50 |    400 |            `0` |
| Caption             | Momo Trust Display |    12px |        1.45 |    400 |            `0` |
| Button              | Momo Trust Display | 14–16px |        1.20 |    600 |            `0` |
| Label               | Momo Trust Display | 13–14px |        1.30 |    500 |            `0` |
| Technical reference | JetBrains Mono     |    12px |        1.50 |    400 |            `0` |

### Typography rules

* Newsreader should generally not be used below 22px.
* Vietnamese text must retain complete diacritics.
* Avoid uppercase Vietnamese sentences.
* Avoid letter spacing above `0.03em`.
* Use `font-synthesis: none` to prevent fake weights.
* Use tabular numbers where available for financial data.
* Merchant-facing currency format: `5.000.000₫`.
* Preserve names before IDs when truncation is required.

---

## Logo architecture

TaxLens uses an original standalone product identity with SHB as endorsement.

Preferred lockups:

```text
TaxLens
```

```text
TaxLens
by SHB
```

Rules:

* TaxLens remains the dominant name.
* `by SHB` is secondary and smaller.
* Do not modify or merge the official SHB logo into the TaxLens mark.
* Use the endorsed lockup on login, presentation and external-facing surfaces.
* Use the compact TaxLens mark inside the authenticated app shell.
* Use the standalone symbol for favicon and app icon.

The logo should communicate clarity, reconciliation and alignment without using generic AI, shield or fintech clichés.

---

## Shape and surface language

* Light mode only.
* Warm tinted-white canvas.
* White cards and operational panels.
* Thin borders before shadows.
* Precise layouts softened by rounded corners.
* No glassmorphism.
* No decorative doodles inside operational screens.
* No heavy gradients or 3D effects.

### Radius tokens

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 20px;
--radius-pill: 9999px;
```

### Shadow tokens

```css
--shadow-xs: 0 1px 2px rgba(25, 36, 78, 0.05);
--shadow-sm: 0 2px 6px rgba(25, 36, 78, 0.07);
--shadow-md: 0 8px 20px rgba(25, 36, 78, 0.09);
--shadow-lg: 0 18px 40px rgba(25, 36, 78, 0.12);
```

Most cards should use a border with either no shadow or `--shadow-xs`.

### Decorative expression

The 10% playful quality may appear through:

* slightly unexpected color blocking
* soft overlapping geometry
* rounded section dividers
* warm microcopy
* subtle alignment/matching motifs
* brief celebratory motion after completed reconciliation

Do not use doodles, cartoons or background illustrations inside operational screens.

---

## 9. Iconography

* Primary library: Lucide
* Stroke width: consistent, approximately 1.75–2px
* Default icon color: navy
* Action icon color: orange
* Selected icon color: blue
* Status icons use functional colors

Avoid mixing outlined and filled icon sets.

AI agents should not receive robot avatars. Represent them through functional symbols:

* Planner: route or branching
* Reconciliation: link or merge
* Tax rules: checklist or document-check
* Operations: workflow or send

---

## 10. Motion

Motion should communicate system state, not decorate the interface.

### Timing

| Interaction         |  Duration |
| ------------------- | --------: |
| Hover/focus         | 120–150ms |
| Button feedback     |     150ms |
| Card expansion      |     200ms |
| Dialog entrance     |     220ms |
| Resolved exception  | 250–300ms |
| Progress completion | 400–600ms |

### Motion character

* smooth
* direct
* low-bounce
* no elastic fintech animation
* no constant floating elements
* no looping decorative motion

Recommended completion motion:

* item aligns
* status changes
* check appears
* readiness value updates

---

## 11. Accessibility

* Meet WCAG AA contrast for all operational text.
* Never communicate status using color alone.
* Every status requires icon or label support.
* Focus states use a blue outline with sufficient separation.
* Orange buttons require navy or white text based on tested contrast.
* Mist backgrounds require navy text.
* Minimum interactive target: 40×40px.
* Body text should not fall below 14px.
* Respect reduced-motion preferences.

---

## 12. Identity guardrails

### Do

* let navy establish trust
* use orange sparingly for action
* use Newsreader for important moments
* use Momo Trust Display to make daily finance feel approachable
* keep records structured and scannable
* describe AI activity in plain language
* present TaxLens as independent but endorsed by SHB

### Do not

* imitate MoMo’s broader visual identity
* redesign SHB’s corporate logo
* turn every surface into a brand-color showcase
* use gradients throughout the application
* use glassmorphism for data
* use playful illustration inside serious workflows
* overload screens with colorful badges
* make the AI visually louder than the user’s task
* create dark-mode tokens during this phase

---

## 13. Asset checklist

Before screen design begins, global assets should include:

* approved primary TaxLens logo
* approved `TaxLens by SHB` lockup
* standalone symbol
* SVG monochrome versions
* favicon `.svg`
* favicon `.ico`
* PNG app icons
* Google Fonts configuration
* typography test sheet containing Vietnamese transaction copy
* palette contrast test
* icon usage sheet
* light-mode application shell reference

---

*Per-screen specifications will be added after each screen-level design discussion.*
