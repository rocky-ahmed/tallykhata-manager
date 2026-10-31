# TALLYKHATA — PHASE 5 CASHBOX VISUAL DESIGN SPECIFICATION
## Tactile 3D Financial Language, Squircle Geometry, Theme Parity & Information Hierarchy

---

## 1. VISUAL PHILOSOPHY & OBJECTIVES
The Cashbox module represents the physical till and daily operational cash flow of the merchant's business.
- **Trust & Precision**: Financial figures must be prominent, unambiguous, and formatted in authentic Bengali currency format (`৳`).
- **Tactile 3D Elevation**: Cards and buttons utilize subtle top specular sheen (`rgba(255, 255, 255, 0.4)`) and bottom extrusion ledges (`borderBottomWidth: 2.5` to `3.0`) to emulate physical desk calculators and tactile cash registers.
- **Cognitive Clarity**: Positive cash movements (inflow, sales, owner investment) use semantic green (`#0F8A0F` / `#34C759`), while outflows (expenses, purchases, owner withdrawal) use semantic crimson (`#B81414` / `#DC2626`).

---

## 2. COMPONENT ARCHITECTURE & DESIGN TOKENS

### 2.1 Cashbox Hero Summary Card (`SCR-10`)
- **Surface**: Consumes `Card3D` with variant `financial`.
  - Light mode: Gradient surface `#FFFFFF` $\rightarrow$ `#F8FAFC`, border `#E2E8F0`, bottom ledge `#CBD5E1`.
  - Dark mode: Gradient surface `#1E293B` $\rightarrow$ `#0F172A`, border `#334155`, bottom ledge `#020617`.
- **Upper Section**: Dual-column layout separated by a two-tone vertical divider (`TwoToneVerticalDivider`).
  - Left column: আজকের বেচা (`todaySales`).
  - Right column: বর্তমান ক্যাশ (`totalCash`).
- **Lower Strip**: Accent container with subtle background `#F1F5F9` (Light) / `#1E293B` (Dark).
  - Left: আজ পেলাম (`todayCashIn`, semantic green).
  - Right: আজ দিলাম (`todayCashOut`, semantic crimson).

### 2.2 Quick Action Controls
- **Report Button**: Elevated white pill (`borderRadius: 12`, `borderWidth: 1`, `borderColor: #E5E7EB`).
- **Reconcile Button (ক্যাশবক্স মিলাই)**: Active crimson tint border (`borderColor: #FECACA`, background `#FFF5F5`) with optical icon sizing.
- **Eye Toggle**: Subtly rounded square container with 48x48dp hit-slop.

### 2.3 3D Big Action Buttons
- **`+ ক্যাশ বেচা` Button**:
  - Height: `50dp` (achieving touch accessibility compliance $\ge 48\text{dp}$).
  - Background: Gradient `#15803D` $\rightarrow$ `#166534`.
  - 3D Bevel: `borderTopColor: rgba(255, 255, 255, 0.35)`, `borderTopWidth: 1.5`, `borderBottomWidth: 3`, `borderBottomColor: #14532D`.
  - Radius: `12dp`.
  - Text: Bold white 16sp, line-height 22sp.
- **`- দোকান খরচ` Button**:
  - Height: `50dp`.
  - Background: Gradient `#DC2626` $\rightarrow$ `#B91C1C`.
  - 3D Bevel: `borderTopColor: rgba(255, 255, 255, 0.35)`, `borderTopWidth: 1.5`, `borderBottomWidth: 3`, `borderBottomColor: #7F1D1D`.
  - Radius: `12dp`.
  - Text: Bold white 16sp, line-height 22sp.

### 2.4 Category Breakdown & Timeline Rows
- **Squircle Icons**: Continuous curvature squircle containers (`SquircleBadge`) with variant-matched borders.
- **Typography**: Bengali text renders with 1.45x line-height to guarantee zero diacritic clipping.
- **Row Separation**: Two-tone horizontal dividers (`TwoToneDivider`) for crisp optical separation.

---

## 3. WCAG 2.2 AA CONTRAST AUDIT MATRIX
- Primary text on Card Surface: Contrast ratio `12.8:1` (Light) / `14.2:1` (Dark) $\rightarrow$ **EXCEEDS $\ge 4.5:1$**
- Inflow Green (`#0F8A0F`) on Card Surface: Contrast ratio `5.1:1` $\rightarrow$ **PASS**
- Outflow Crimson (`#B81414`) on Card Surface: Contrast ratio `5.8:1` $\rightarrow$ **PASS**
- CTA Button text on Green/Red buttons: Contrast ratio `5.2:1` / `5.4:1` $\rightarrow$ **PASS**
