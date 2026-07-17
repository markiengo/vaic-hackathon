---
name: TaxLens
colors:
  surface: '#f6fbf3'
  surface-dim: '#d7dbd4'
  surface-bright: '#f6fbf3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f5ee'
  surface-container: '#ebefe8'
  surface-container-high: '#e5e9e2'
  surface-container-highest: '#dfe4dd'
  on-surface: '#181d19'
  on-surface-variant: '#3f4940'
  inverse-surface: '#2d322d'
  inverse-on-surface: '#eef2eb'
  outline: '#6f7a70'
  outline-variant: '#bec9be'
  surface-tint: '#0b6d3b'
  primary: '#004d27'
  on-primary: '#ffffff'
  primary-container: '#006837'
  on-primary-container: '#8ee4a6'
  inverse-primary: '#83d99c'
  secondary: '#345cab'
  on-secondary: '#ffffff'
  secondary-container: '#85aaff'
  on-secondary-container: '#043b8a'
  tertiary: '#762730'
  on-tertiary: '#ffffff'
  tertiary-container: '#943e46'
  on-tertiary-container: '#ffc3c5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ef6b6'
  primary-fixed-dim: '#83d99c'
  on-primary-fixed: '#00210e'
  on-primary-fixed-variant: '#00522a'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b0c6ff'
  on-secondary-fixed: '#001944'
  on-secondary-fixed-variant: '#144392'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#7b2b34'
  background: '#f6fbf3'
  on-background: '#181d19'
  surface-variant: '#dfe4dd'
  primary-light: '#E6F2EC'
  primary-dark: '#004D27'
  secondary-light: '#EEF2FA'
  danger: '#DC2626'
  danger-light: '#FEE2E2'
  warning: '#F59E0B'
  warning-light: '#FEF3C7'
  success: '#16A34A'
  success-light: '#DCFCE7'
  text-primary: '#111827'
  text-secondary: '#6B7280'
  text-tertiary: '#9CA3AF'
  border-default: '#E5E7EB'
  border-strong: '#D1D5DB'
typography:
  hero-numbers:
    fontFamily: inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  page-title:
    fontFamily: inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  section-header:
    fontFamily: inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  default:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: jetbrainsMono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 2rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

# TaxLens Design System (Vietnam Merchant TaxOps)

## Brand Identity
TaxLens is a Merchant TaxOps platform provided by SHB for business owners in Vietnam, with a two-sided model: Merchant Workspace (daily user: business owner) and SHB Operations Console (operational user: SHB staff). It focuses on reconciliation, exception management, and tax-ready data preparation.

## Colors
- **Primary:** `#006837` (SHB green) — primary actions, headers, branding
- **Primary Light:** `#E6F2EC` — hover states, subtle backgrounds
- **Primary Dark:** `#004D27` — active/pressed, gradient ends
- **Secondary:** `#1A4796` — secondary actions, links
- **Secondary Light:** `#EEF2FA` — secondary hover backgrounds
- **Danger:** `#DC2626`
- **Danger Light:** `#FEE2E2`
- **Warning:** `#F59E0B`
- **Warning Light:** `#FEF3C7`
- **Success:** `#16A34A`
- **Success Light:** `#DCFCE7`
- **Background:** `#F9FAFB`
- **Surface:** `#FFFFFF`
- **Text Primary:** `#111827`
- **Text Secondary:** `#6B7280`
- **Text Tertiary:** `#9CA3AF`
- **Border:** `#E5E7EB`
- **Border Strong:** `#D1D5DB`

## Gradients
- **Primary Gradient:** `linear-gradient(135deg, #006837 0%, #004D27 100%)`
- **Surface Gradient:** `linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)`
- **Header Gradient:** `linear-gradient(90deg, #006837 0%, #1A4796 100%)`

## Typography
- **UI Font:** Inter
- **Data/Ref Font:** JetBrains Mono
- **Hero Numbers (32px):** Bold, -0.02em tracking
- **Page Titles (24px):** Bold, -0.02em tracking
- **Section Headers (18px):** Semibold
- **Default (16px):** Regular
- **Body (14px):** Regular
- **Labels (12px):** Uppercase, 0.05em letter-spacing, Medium (500) weight

## Shadows
- **xs:** `0 1px 2px rgba(0,0,0,0.04)`
- **sm:** `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- **md:** `0 4px 8px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)`
- **lg:** `0 12px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)`
- **xl:** `0 20px 40px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)`
- **focus:** `0 0 0 3px rgba(0,104,55,0.15)`
- **card-hover:** `0 8px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)`

## Borders & Radii
- **Radius Small:** 6px
- **Radius Medium:** 10px
- **Radius Large:** 14px
- **Radius XL:** 20px
- **Radius Pill:** 9999px
- **Border Default:** 1px
- **Border Strong:** 2px

## Transitions
- **Fast:** 150ms
- **Base:** 200ms
- **Slow:** 300ms

## Language & Locale
- **Language:** Vietnamese
- **Currency:** Vietnamese đồng (₫)
- **Date Format:** DD/MM/YYYY
