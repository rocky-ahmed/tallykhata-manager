# TALLYKHATA — PHASE 8 BUSINESS REPORTS VISUAL DESIGN SPECIFICATION
## Financial Summary Cards, High-Contrast Data Rows, Navigation & Accessibility

---

## 1. DESIGN PHILOSOPHY & REPORT INTEGRITY

Business Reports are high-value analytical surfaces:
- **Numerical Hierarchy**: Major totals (Receivables, Payables, Net Cash, Net Profit) dominate top KPI cards with bold typography.
- **Color Association Without Sole Reliance**: Green for income/assets and Red for liabilities/costs are always paired with explicit textual labels and symbols (`+`, `-`, `পাবো`, `দেবো`).
- **Tactile 3D KPI Cards**: Cards use subtle bottom borders ($2\text{dp}$ to $3\text{dp}$) and card backgrounds tuned to the active theme.
- **Accessible Sharing**: Native Android Sharesheet buttons enable clean text statement sharing without exposing sensitive tokens.

---

## 2. COLOR PALETTE & TOKEN SPECIFICATION

| Token Role | Light Mode Hex | Dark Mode Hex | Usage in Reports Module |
| :--- | :--- | :--- | :--- |
| `reportHeaderBg` | `#FFFFFF` | `#1E293B` | Report navigation bar surface |
| `reportHeaderTitle` | `#1E293B` | `#F8FAFC` | Report screen title text |
| `reportCardSurface` | `#FFFFFF` | `#1E293B` | Report metric card background |
| `reportCardBorder` | `#E2E8F0` | `#334155` | Report card border |
| `reportKpiPositive` | `#047857` | `#34D399` | Inflow, receivable, profit amount |
| `reportKpiNegative` | `#DC2626` | `#F87171` | Outflow, payable, expense amount |
| `reportSubKpiBg` | `#F8FAFC` | `#0F172A` | Secondary metric container |
| `reportRowDivider` | `#F1F5F9` | `#334155` | Subtle row separator line |

---

## 3. CARD GEOMETRY & ELEVATION RULES

- **Top KPI Cards (`reportKpiCard`)**:
  - `borderRadius`: $12\text{dp}$
  - `borderWidth`: $1\text{dp}$
  - `borderBottomWidth`: $3\text{dp}$ (3D extrusion ledge)
  - `padding`: $14\text{dp}$
  - `elevation`: $3$
- **Transaction Item Cards (`reportRowCard`)**:
  - `borderRadius`: $10\text{dp}$
  - `padding`: $12\text{dp}$
  - `marginVertical`: $4\text{dp}$
  - `flexDirection`: `row`, `alignItems: 'center'`

---

## 4. TYPOGRAPHY SCALING & BENGALI NUMERALS

- **Report Header**: $18\text{sp}$, SemiBold ($600$), line-height $26\text{sp}$
- **KPI Value**: $22\text{sp}$, Bold ($700$), line-height $30\text{sp}$
- **KPI Label**: $13\text{sp}$, Regular ($400$), line-height $18\text{sp}$
- **Row Title**: $15\text{sp}$, Medium ($500$), line-height $20\text{sp}$
- **Row Subtext**: $12\text{sp}$, Regular ($400$), line-height $16\text{sp}$
