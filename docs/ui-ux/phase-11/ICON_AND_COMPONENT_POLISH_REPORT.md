# ICON AND COMPONENT POLISH REPORT: 3D SQUIRCLE ARCHITECTURE
**TallyKhata (tallybook-expo) — Phase 11 Component Geometry & Optical Calibrations**
**Author:** Worker 1 (Gibbs) — Frontend & UI/UX Specialist
**Permanent Thread ID:** `01a19154-99ab-72a0-9e23-2611b9ffc74c`
**Standard Applied:** Continuous Squircle Curvature ($r = \text{size} \times 0.28$), Specular Highlight Overlay, 3D Extrusion Ledge

---

## 1. Icon Metrics & Optical Calibrations (`src/iconMetrics.js`)

Raw PNG icons frequently contain unequal transparent bounding margins, causing perceptual sizing imbalances when rendered side-by-side in uniform containers. The `src/iconMetrics.js` module provides precision optical scaling and vertical translation offsets to balance icon visual weights:

```javascript
const ICON_METRICS = {
  // Required task calibrations
  ic_cash_buy: { opticalScale: 1.28, translateY: 0 },
  ic_cash_sale: { opticalScale: 1.28, translateY: 0 },
  ic_delete: { opticalScale: 1.35, translateY: 0 },
  ic_edit: { opticalScale: 1.25, translateY: 0 },
  grid_backup: { opticalScale: 1.00, translateY: 2 },

  // Supplementary action & navigation balancing
  ic_call: { opticalScale: 1.15, translateY: 0 },
  ic_sms: { opticalScale: 1.15, translateY: 0 },
  ic_pdf: { opticalScale: 1.15, translateY: 0 },
  grid_stock: { opticalScale: 1.12, translateY: 0 },
  grid_note: { opticalScale: 1.10, translateY: 0 },
  grid_tally_msg: { opticalScale: 1.15, translateY: 0 },
  grid_bulk_tagada: { opticalScale: 1.08, translateY: 0 },
  grid_multi_biz: { opticalScale: 1.05, translateY: 0 },
  grid_money_manager: { opticalScale: 1.05, translateY: 0 },
  grid_cashbox: { opticalScale: 1.05, translateY: 0 },
};
```

### 1.1 Touch Target Expansion via `STANDARD_TOUCH_HIT_SLOP`
```javascript
const STANDARD_TOUCH_HIT_SLOP = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
};
```
When applied to a $32\times 32\text{dp}$ or $36\times 36\text{dp}$ button, the effective interactive touch bounds expand to:
- Width: $36 + 10 + 10 = \mathbf{56\text{dp}}$ (Exceeds Android 48dp threshold)
- Height: $36 + 10 + 10 = \mathbf{56\text{dp}}$ (Exceeds Android 48dp threshold)

---

## 2. 3D Squircle Architecture Specifications

### 2.1 Squircle Radius Formula
Rather than generic corner radii (e.g. 8dp or 12dp), all 3D squircle containers calculate corner curvature using the continuous golden-ratio curve formula:
$$\text{borderRadius} = \text{Math.round}(\text{containerSize} \times 0.28)$$

- 44dp Container $\rightarrow$ **12dp** Squircle Radius
- 48dp Container $\rightarrow$ **13dp** Squircle Radius
- 56dp Container $\rightarrow$ **16dp** Squircle Radius
- 64dp Container $\rightarrow$ **18dp** Squircle Radius

### 2.2 Specular Sheen Highlight Overlay
To simulate top-lit physical depth, a semi-transparent white highlight overlay is positioned across the top portion of the squircle container:
$$\text{sheenHeight} = \text{Math.round}(\text{containerSize} \times 0.36)$$
- Position: `absolute`, top: 0, left: 0, right: 0
- Background Color: `rgba(255, 255, 255, 0.16)` (Light Mode) / `rgba(255, 255, 255, 0.08)` (Dark Mode)
- Border Radii: `borderTopLeftRadius: radius`, `borderTopRightRadius: radius`
- Pointer Events: `none`

### 2.3 Physical Extrusion Ledge Borders
Dimensionality is achieved via asymmetrical multi-tier borders:
- **Top Bevel Highlight:** `borderTopWidth: 1.5dp`, `borderTopColor: theme.borderTop` (lighter tint)
- **Side Structural Stroke:** `borderLeftWidth: 1dp`, `borderRightWidth: 1dp`, `borderColor: theme.borderSides`
- **Bottom Extrusion Ledge:** `borderBottomWidth: 2.5dp - 3.0dp`, `borderBottomColor: theme.borderBottom` (darker, saturated shadow ledge)

---

## 3. Shared UI Component Implementations

### 3.1 `AppIcon` (`App.js`)
- Props: `source`, `size`, `containerSize`, `variant`, `shape`, `tintColor`, `iconKey`, `opticalScale`, `translateY`.
- Seamlessly resolves normalized metrics through `iconMetricsService.getIconMetrics(iconKey || source)`.
- Implements squircle geometry when `shape='rounded'` and raw image scaling when `shape='none'`.

### 3.2 `Card3D` (`src/components/Card3D.js`)
- Props: `variant` ('primary', 'elevated', 'financial', 'secondary', 'highlight'), `onPress`, `isDark`, `noLedge`.
- Surface container consuming semantic tokens with specular highlight sheen and bottom extrusion ledge.
- Renders an interactive `TouchableOpacity` when `onPress` is provided, maintaining touch feedback.

### 3.3 `Button3D` (`src/components/Button3D.js`)
- Props: `title`, `onPress`, `variant` ('primary', 'secondary', 'compact', 'destructive', 'outline', 'success', 'warning'), `size` ('sm', 'md', 'lg'), `isDark`.
- Physical extrusion ledge (2dp for small, 3dp for standard/large).
- Small variant (36dp height) automatically attaches `STANDARD_TOUCH_HIT_SLOP` to guarantee $ge 48\text{dp}$ touch clearance.
- Bengali typography line-height safety included by default.

### 3.4 `SquircleBadge` (`src/components/SquircleBadge.js`)
- Props: `source`, `iconKey`, `variant`, `size`, `containerSize`, `count`, `isDark`, `shape`.
- Renders an icon inside a 3D squircle with optional top-right notification counter bubble.
- Consumes icon theme palettes across 10 semantic variants.

---
*Verified by Worker 1 (Gibbs) — Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c*
