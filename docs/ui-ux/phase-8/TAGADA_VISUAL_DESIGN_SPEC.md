# TALLYKHATA — PHASE 8 TAGADA VISUAL DESIGN SPECIFICATION
## Design System Geometry, Palette Tokens, Typography & Ergonomics

---

## 1. DESIGN PHILOSOPHY & VISUAL ACCENTS

The Tagada & Due Management surfaces are designed around:
- **Trust & Urgency**: Clear differentiation between customer receivables (Primary Blue/Teal & Warning Amber/Red) and supplier payables.
- **Dimensional Surfaces**: 3D elevated cards with subtle top highlights, borders, and tactile bottom ledges matching the TallyKhata design system.
- **Zero Ambiguity**: Financial figures are presented with explicit Bengali currency formatting (`৳`), eliminating numeric confusion.
- **Ergonomic Safety**: Primary triggers (`টালি-মেসেজ`, `WhatsApp`, `গ্রুপ তাগাদা`) provide minimum $48\times 48\text{dp}$ touch target areas to prevent accidental taps.

---

## 2. COLOR PALETTE & TOKEN SPECIFICATION

| Token Role | Light Mode Hex | Dark Mode Hex | Usage in Tagada Module |
| :--- | :--- | :--- | :--- |
| `tagadaHeaderCardBg` | `#FFFFFF` | `#1E293B` | Main due summary header container |
| `tagadaCardBorder` | `#E2E8F0` | `#334155` | 1px subtle container border |
| `tagadaDueAmount` | `#DC2626` | `#F87171` | Customer outstanding debt text |
| `tagadaDueBadgeBg` | `#FEE2E2` | `#7F1D1D` | Customer due avatar background pill |
| `tagadaDueBadgeText`| `#B81414` | `#FCA5A5` | Avatar character & due alert text |
| `tagadaSmsBtnBg` | `#DC2626` | `#B91C1C` | Primary SMS action button |
| `tagadaWhatsAppBtnBg`| `#25D366` | `#16A34A` | WhatsApp communication trigger |
| `tagadaQuotaBadgeBg`| `#FEF3C7` | `#713F12` | SMS quota indicator container |
| `tagadaQuotaText` | `#B45309` | `#FBBF24` | SMS quota counter text |

---

## 3. CARD GEOMETRY & ELEVATION RULES

- **Summary Cards (`tagadaHeaderCard`)**:
  - `borderRadius`: $16\text{dp}$
  - `borderWidth`: $1\text{dp}$ (`#E2E8F0` in Light, `#334155` in Dark)
  - `borderBottomWidth`: $3\text{dp}$ (3D extrusion ledge)
  - `padding`: $16\text{dp}$
  - `elevation`: $4$
- **Customer Due Card (`tagadaCardItem`)**:
  - `borderRadius`: $12\text{dp}$
  - `marginVertical`: $4\text{dp}$
  - `padding`: $12\text{dp}$
  - `elevation`: $2$
- **Action Buttons (`Button3D`)**:
  - `height`: $\ge 48\text{dp}$
  - `borderRadius`: $10\text{dp}$
  - `borderBottomWidth`: $3\text{dp}$

---

## 4. TYPOGRAPHY SCALING & BENGALI NUMERALS

- **Header Title**: $20\text{sp}$, SemiBold ($600$), line-height $28\text{sp}$
- **Metric Figure**: $22\text{sp}$, Bold ($700$), line-height $30\text{sp}$
- **Customer Name**: $16\text{sp}$, Medium ($500$), line-height $22\text{sp}$
- **Due Subtitle**: $14\text{sp}$, Regular ($400$), line-height $20\text{sp}$
- **Numeral Rendering**: All amounts rendered via Bengali numeral conversion (`১, ২, ৩...`) with integer-precision comma separators.
