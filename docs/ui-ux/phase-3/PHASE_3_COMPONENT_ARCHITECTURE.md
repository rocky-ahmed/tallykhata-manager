# TALLYKHATA — PHASE 3 COMPONENT ARCHITECTURE SPECIFICATION
## Modular, Theme-Aware, 3D Dimensional Shared UI Component System

**Phase:** Phase 3 — Shared UI Components, Professional 3D Visual System, Home Screen & Navigation Redesign  
**Date:** 2026-10-31  
**Target Platform:** React Native / Expo (Android 11, Xiaomi Redmi Note 9 @ 1080x2340 px)  
**Authors:** Main Agent (Lead Architect) & Worker 1: Gibbs (Frontend Specialist)  
**Status:** ARCHITECTURAL SPECIFICATION APPROVED  

---

## 1. ARCHITECTURAL OVERVIEW & DESIGN PRINCIPLES

The TallyKhata Phase 3 Component Architecture transforms the visual and tactile experience of the application from flat, ad-hoc inline styles into an enterprise-grade, modular, and reusable shared component library.

### 1.1 Core Principles:
1. **Strict Semantic Token Consumption:** Zero hardcoded hex colors. Every surface, text, border, and active state consumes centralized tokens from `src/themeService.js` and `src/typographyTokens.js`.
2. **Tactile 3D Squircle Geometry:** A unified geometric language with mathematically calibrated continuous corner smoothing:
   $$\text{borderBottomRightRadius} = \text{containerSize} \times 0.28$$
   Coupled with subtle vertical extrusion ledges ($1.5\text{dp} - 3\text{dp}$), top specular highlights ($0.8\text{dp}$ inset), and diffused drop shadows.
3. **Android Accessibility Standards Compliance:** Every interactive element enforces a minimum $48\text{dp} \times 48\text{dp}$ touch target through `STANDARD_TOUCH_HIT_SLOP` ({ top: 10, bottom: 10, left: 10, right: 10 }) from `src/iconMetrics.js`.
4. **Zero-Lag Mid-Tier Performance:** Minimal component tree nesting, pure functional components with memoization, and zero heavyweight third-party animation libraries. Fully optimized for the 60fps budget on the Redmi Note 9.

---

## 2. SHARED COMPONENT TAXONOMY

The reusable component library is organized into three primary domain tiers in `src/components/`:

```
src/components/
├── Card3D.js            # Primary, Elevated, Secondary & Financial 3D Surfaces
├── Button3D.js          # Primary, Secondary, Compact, Destructive & Icon Buttons
├── SquircleBadge.js     # Dimensional Squircle Badges, Counter Tags & Icon Holders
└── index.js             # Consolidated export gateway for clean imports
```

### 2.1 Surface Component Architecture (`Card3D.js`)

`Card3D` serves as the universal content container across the Home Screen, Ledger summaries, and Menu sections.

| Variant | Purpose | Visual Character & Elevation | Semantic Tokens Consumed |
| :--- | :--- | :--- | :--- |
| `primary` | Standard dashboard & list card | 1dp border, 2dp bottom extrusion ledge, subtle elevation | `surfaceContainer`, `cardBorder`, `outlineVariant` |
| `elevated` | Focus cards, active metrics | 4dp shadow, 2.5dp extrusion ledge, crisp top highlight | `cardBgElevated`, `outline`, `primaryLight` |
| `financial` | Net total summary cards (পাবো/দেবো) | Dual-column split, color-coded accents, 3dp depth | `income`, `expense`, `incomeContainer`, `expenseContainer` |
| `highlight` | Notice boxes, feature callouts | Accent border, 8% tinted semantic background fill | `primaryContainer`, `onPrimaryContainer`, `accent` |

### 2.2 Interactive Button Architecture (`Button3D.js`)

`Button3D` provides a tactile, press-responsive experience mimicking real physical controls.

- **Press State Physics:** On `onPressIn`, translates $+1.5\text{dp}$ on the Y-axis and reduces extrusion ledge height, providing instantaneous tactile feedback.
- **Hit Slop Guarantee:** Automatically attaches `STANDARD_TOUCH_HIT_SLOP` when button width or height is below $48\text{dp}$.
- **Variants:**
  - `primary`: Crimson brand fill (`primary`), white text (`onPrimary`), 3dp darker extrusion ledge.
  - `secondary`: Indigo/neutral container fill (`surfaceVariant`), primary text (`textPrimary`).
  - `compact`: Scaled-down action button for table headers, account quick-actions.
  - `destructive`: Danger fill (`danger`), white text, for delete/archive operations.
  - `icon`: Circular/squircle icon wrapper with full 48dp touch bounds.

### 2.3 Dimensional Badge & Icon Architecture (`SquircleBadge.js`)

Extending the foundation established in Phase 2 (`AppIcon` and `src/iconMetrics.js`):
- Provides 3D squircle backgrounds with customizable variants (`primary`, `warning`, `info`, `danger`, `secondary`, `success`, `purple`, `teal`).
- Integrates `iconMetricsService.getIconMetrics(iconKey)` for automated optical scaling ($1.25\times - 1.35\times$) and vertical offset correction.
- Displays optional numeric counter badges (e.g., active transaction count, notification badges) with high-contrast text.

---

## 3. INTEGRATION WITH CORE SCREENS

1. **Home Screen Dashboard:**
   - Universal summary card utilizes `Card3D` with `variant="financial"`.
   - Quick Actions Grid items utilize `SquircleBadge` with 3D extrusion ledges and 100% optical consistency.
   - Customer and Supplier list items wrapped in tactile card surfaces with squircle avatar initials.
2. **Main Bottom Navigation:**
   - 4-tab docked navigation bar with active 3D squircle pill indicator and optical scaling for active/inactive states.
3. **Menu Screen:**
   - Shop profile card converted to `Card3D variant="elevated"`.
   - Section group items wrapped in standardized lists with 3D icon holders and 48dp minimum touch bounds.
