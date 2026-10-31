# TALLYKHATA — PHASE 3 SHARED COMPONENT INVENTORY
## Complete Catalog of Reusable 3D Components, Props Interface, Semantics & Usage Matrix

**Phase:** Phase 3 — Shared UI Components, Professional 3D Visual System, Home Screen & Navigation Redesign
**Date:** 2026-10-31
**Target Directory:** `src/components/`
**Authors:** Main Agent (Lead Architect) & Worker 1: Gibbs (Frontend Specialist)

---

## 1. COMPONENT INVENTORY TABLE

| Component Name | File Path | Props Signature | Variants Supported | Primary Screen Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Card3D** | `src/components/Card3D.js` | `children, variant, style, onPress, isDark, elevation, noLedge` | `primary`, `elevated`, `financial`, `secondary`, `highlight` | Home Dashboard, Net Summary Card, Menu Shop Profile, Customer List Items |
| **Button3D** | `src/components/Button3D.js` | `title, onPress, variant, icon, size, disabled, style, textStyle, isDark` | `primary`, `secondary`, `compact`, `destructive`, `outline` | Home Header Actions, Modal Save/Submit, Ledger Quick-Actions, Search Filters |
| **SquircleBadge** | `src/components/SquircleBadge.js` | `source, iconKey, variant, size, containerSize, count, isDark, style` | `primary`, `warning`, `info`, `danger`, `secondary`, `success`, `purple`, `teal` | Quick Actions Grid, Customer Avatars, Menu List Icons, Tab Active Pills |

---

## 2. DETAILED PROPS & INTERFACE SPECIFICATIONS

### 2.1 Card3D (`src/components/Card3D.js`)
- `children`: ReactNode — Child content elements.
- `variant`: string — One of `primary`, `elevated`, `financial`, `secondary`, `highlight`.
- `style`: ViewStyle — Custom container style overrides.
- `onPress`: function — Optional press handler making the card touchable with activeOpacity 0.85.
- `isDark`: boolean — Dark mode flag (defaults to currentTheme.isDark via ThemeContext).
- `noLedge`: boolean (default: false) — Disables 3D bottom extrusion ledge when flat surface is desired.
- `elevation`: number (default: 2) — Android elevation / iOS shadow radius multiplier.

### 2.2 Button3D (`src/components/Button3D.js`)
- `title`: string — Text label displayed inside button.
- `onPress`: function — Click/tap callback.
- `variant`: string — One of `primary`, `secondary`, `compact`, `destructive`, `outline`.
- `icon`: ReactNode — Optional leading or standalone icon.
- `size`: string — One of `sm` (36dp), `md` (44dp), `lg` (52dp).
- `disabled`: boolean (default: false) — Disabled state applying 0.38 opacity and blocking clicks.
- `style`: ViewStyle — Additional container style overrides.
- `textStyle`: TextStyle — Additional text style overrides.
- `isDark`: boolean — Theme mode override.

### 2.3 SquircleBadge (`src/components/SquircleBadge.js`)
- `source`: ImageSource — Raster image or icon asset.
- `iconKey`: string — Key for automated optical scale and offset retrieval from iconMetrics.
- `variant`: string — Color palette key (`primary`, `warning`, `info`, `danger`, `secondary`, `success`, `purple`, `teal`).
- `size`: number (default: 24) — Base size of the icon inside the badge.
- `containerSize`: number (default: 44) — Total width and height of the 3D squircle container.
- `count`: number|string — Optional notification counter displayed in the top-right corner.
- `isDark`: boolean — Theme mode override.
- `style`: ViewStyle — Outer container style overrides.

---

## 3. SEMANTIC TOKEN MAPPING MATRIX

| Component Sub-Element | Semantic Token Consumed (Light Mode) | Semantic Token Consumed (Dark Mode) |
| :--- | :--- | :--- |
| **Card3D Background** | `t.cardBg` (#FFFFFF) / `t.surfaceContainer` (#F1F5F9) | `t.cardBg` (#1E293B) / `t.surfaceContainer` (#1E293B) |
| **Card3D Border** | `t.cardBorder` (#E2E8F0) | `t.cardBorder` (#334155) |
| **Card3D Ledge** | `t.surfaceVariant` (#E2E8F0) | `t.cardBorder` (#334155) |
| **Button3D Primary Fill** | `t.primary` (#B81414) | `t.primary` (#EF4444) |
| **Button3D Primary Text** | `t.onPrimary` (#FFFFFF) | `t.onPrimary` (#FFFFFF) |
| **Button3D Secondary Fill** | `t.surfaceVariant` (#E2E8F0) | `t.surfaceVariant` (#334155) |
| **Button3D Secondary Text** | `t.textPrimary` (#1E293B) | `t.textPrimary` (#F8FAFC) |
| **Squircle Extrusion** | `theme.edge` (Calibrated per variant) | `theme.edge` (Calibrated per variant) |
| **Squircle Highlight** | `theme.highlight` (Calibrated top shine) | `theme.highlight` (Calibrated top shine) |