# MONEY MANAGER SECTION CUSTOMIZATION MATRIX
**Document Version:** 3.0.0 (Phase 9 Final Implementation)  
**Author:** Worker 1 — Gibbs (Frontend & UI/UX Specialist, Thread ID: `01a19154-99ab-72a0-9e23-2611b9ffc74c`)  
**Target Module:** Personal Money Manager (`modalMoneyManager`, `modalMMPreferences`)  
**Architecture:** 5-Layer Waterfall Resolution with WCAG 2.2 AA Contrast Enforcement

---

## 1. Overview & Architectural Scope

The TallyKhata Money Manager Customization Matrix provides granular, section-by-section and global theming capabilities across all eight core Money Manager modules. Built on top of the Phase 2 design system tokens (`src/themeService.js`) and the Phase 9 Customization Engine (`src/moneyManagerCustomizationService.js`), every consumer screen dynamically queries its resolved appearance using `resolveMMSectionStyle(sectionId, elementType, fallbackStyle)`.

The system strictly enforces:
1. **Zero Financial Mutation:** Customization modifications touch only visual styling parameters and never mutate balances, ledger entries, transactions, or double-entry account states.
2. **5-Layer Cascading Inheritance:** Settings cascade predictably from base design system tokens down to section-specific and subsection-level micro-overrides.
3. **Automated Accessibility Guardrails:** Font scaling is clamped to [0.85, 1.30], background tint is bounded to [0.05, 0.40], and low-contrast accent colors are auto-corrected to meet WCAG 2.2 AA standards (>= 4.5:1 on text surfaces).
4. **Bengali Typography Protection:** Line-height multipliers are maintained at >= 1.45x across all scaled text to eliminate matra and conjunct clipping.

---

## 2. Master Section Customization Matrix

| Section Key | Section Name (BN / EN) | Subsections / Micro-Targets | Supported Element Types | Default Preset | Primary Accent (Light / Dark) | Surface Modes | Elevation Options |
|---|---|---|---|---|---|---|---|
| `dashboard` | ড্যাশবোর্ড / Dashboard | `hero`, `cards`, `inflow_outflow`, `quick_actions`, `savings_rate` | `card`, `header`, `text`, `amount`, `accent`, `border`, `pill` | Emerald (`emerald`) | #10B981 / #064E3B | `subtle_tint`, `solid_card`, `elevated` | `subtle`, `standard`, `high` |
| `transactions` | লেনদেন / Transactions | `search`, `filters`, `date_headers`, `list_cards`, `amounts` | `card`, `header`, `text`, `amount`, `accent`, `border`, `pill` | Sapphire (`sapphire`) | #2563EB / #1E3A8A | `subtle_tint`, `solid_card`, `elevated` | `subtle`, `standard`, `high` |
| `wallets` | ওয়ালেট / Wallets & Accounts | `carousel`, `account_cards`, `balance_header`, `stats` | `card`, `header`, `text`, `amount`, `accent`, `border`, `pill` | Obsidian (`obsidian`) | #334155 / #0F172A | `subtle_tint`, `solid_card`, `elevated` | `subtle`, `standard`, `high` |
| `budgets` | বাজেট / Budgets | `overall_card`, `progress_bar`, `category_tiles`, `limits` | `card`, `header`, `text`, `amount`, `progressBar`, `border` | Rose Gold (`rose`) | #EC4899 / #831843 | `subtle_tint`, `solid_card`, `elevated` | `subtle`, `standard`, `high` |
| `goals` | সঞ্চয় লক্ষ্য / Savings Goals | `goal_cards`, `progress_circle`, `metrics`, `actions` | `card`, `header`, `text`, `amount`, `progressBar`, `border` | Amber (`amber`) | #F59E0B / #78350F | `subtle_tint`, `solid_card`, `elevated` | `subtle`, `standard`, `high` |
| `analytics` | বিশ্লেষণ / Analytics | `cash_flow`, `distribution`, `kpi_columns`, `charts` | `card`, `header`, `text`, `amount`, `accent`, `border` | Amethyst (`amethyst`) | #8B5CF6 / #4C1D95 | `subtle_tint`, `solid_card`, `elevated` | `subtle`, `standard`, `high` |
| `categories` | ক্যাটাগরি / Categories | `tabs`, `category_list`, `icon_badges`, `budget_pills` | `card`, `header`, `text`, `accent`, `border`, `pill` | Royal Indigo (`royal_indigo`) | #4F46E5 / #312E81 | `subtle_tint`, `solid_card` | `subtle`, `standard` |
| `reports` | রিপোর্ট / Reports | `period_picker`, `summary_cards`, `export_buttons` | `card`, `header`, `text`, `amount`, `accent`, `border` | Crimson Ruby (`crimson_ruby`) | #B81414 / #7F1D1D | `subtle_tint`, `solid_card` | `subtle`, `standard` |

---

## 3. Section Deep-Dives & Consumer Integrations

### 3.1 Dashboard (`dashboard`)
- **Primary Function:** Financial overview hub displaying total net worth, monthly inflows/outflows, and quick transaction shortcuts.
- **Consumer Hooks in App.js:**
  ```javascript
  const dashCardStyle = resolveMMSectionStyle('dashboard', 'card');
  const dashAmountStyle = resolveMMSectionStyle('dashboard', 'amount');
  const dashAccent = resolveMMSectionStyle('dashboard', 'accent');
  ```
- **Visual Targets:**
  - Net Worth Card (`styles.mmTotalCard`): Dynamic background tint (`dashCardStyle.backgroundColor`), border color (`dashCardStyle.borderColor`), and elevation ledge.
  - Net Worth Amount (`styles.mmTotalCardAmount`): Scaled typography up to 34sp * textScale.
  - Inflows & Outflows summary containers: Subtle tinted backgrounds with directional glyph badges.
  - Quick Action Buttons (4 shortcuts: Income, Expense, Transfer, Budgets): Tactile 3D buttons consuming section accent for highlights.

### 3.2 Transactions (`transactions`)
- **Primary Function:** Chronological ledger of all user financial movements with date grouping, full-text search, and type filters.
- **Consumer Hooks in App.js:**
  ```javascript
  const txnHeaderStyle = resolveMMSectionStyle('transactions', 'header');
  const txnCardStyle = resolveMMSectionStyle('transactions', 'card');
  const txnAmountStyle = resolveMMSectionStyle('transactions', 'amount');
  ```
- **Visual Targets:**
  - Sticky Date Header (`headerLabel`): Scaled Bengali date typography (`txnHeaderStyle.fontSize`) with item count badges.
  - Transaction Row Card (`styles.mmTxnCard`): Squircle container with section-resolved border and background tint.
  - Transaction Amount Display (`styles.mmTxnAmount`): Direction-colored text (+ Emerald, - Red, ⇄ Violet) scaled proportionally with `txnAmountStyle.fontSize`.

### 3.3 Wallets / Accounts (`wallets`)
- **Primary Function:** Multi-account asset ledger supporting Cash, Bank, and MFS (bKash/Nagad) wallets with monthly flow summaries.
- **Consumer Hooks in App.js:**
  ```javascript
  const walletCardStyle = resolveMMSectionStyle('wallets', 'card');
  const walletAmountStyle = resolveMMSectionStyle('wallets', 'amount');
  ```
- **Visual Targets:**
  - Total Active Balance Card: Two-column split container (Active vs Archived balance).
  - Individual Account Card (`styles.mmAccountCard`): Two-tone card structure with rich colored top banner, 3D wallet icon, large white balance (`walletAmountStyle.fontSize`), and bottom monthly stats container styled with `walletCardStyle.backgroundColor`.

### 3.4 Budgets (`budgets`)
- **Primary Function:** Monthly spending limits and category-level ceiling monitoring with automated risk threshold indicators.
- **Consumer Hooks in App.js:**
  ```javascript
  const budgetCardStyle = resolveMMSectionStyle('budgets', 'card');
  const budgetProgressStyle = resolveMMSectionStyle('budgets', 'progressBar');
  const budgetAmountStyle = resolveMMSectionStyle('budgets', 'amount');
  ```
- **Visual Targets:**
  - Overall Monthly Budget Card (`styles.mmOverallBudgetCard`): Styled with `budgetCardStyle.backgroundColor` and `budgetCardStyle.borderColor`.
  - 3-Color Threshold Progress Bar: Dynamic fill indicating utilization (<80% theme accent / green, 80-100% amber, >100% danger red).
  - Category Budget Tiles: Squircle category icon, budget vs spent amount, and progress track.

### 3.5 Savings Goals (`goals`)
- **Primary Function:** Target-driven savings tracking with deposit/withdrawal logging and goal projection metrics.
- **Consumer Hooks in App.js:**
  ```javascript
  const goalCardStyle = resolveMMSectionStyle('goals', 'card');
  const goalAmountStyle = resolveMMSectionStyle('goals', 'amount');
  const goalProgressStyle = resolveMMSectionStyle('goals', 'progressBar');
  ```
- **Visual Targets:**
  - Goal Card (`styles.mmGoalCard`): 3D glowing squircle icon, goal title, target amount, and saved percentage.
  - Horizontal Goal Progress Bar: Styled with `goalProgressStyle.backgroundColor` and soft rounded track.

### 3.6 Analytics (`analytics`)
- **Primary Function:** Visual breakdown of monthly cash flow, category expense distribution, and net savings ratios.
- **Consumer Hooks in App.js:**
  ```javascript
  const analyticsCardStyle = resolveMMSectionStyle('analytics', 'card');
  ```
- **Visual Targets:**
  - Cash Flow Overview Card (`styles.mmAnalyticsCard`): 3-column financial KPI strip (Income, Expense, Net Savings).
  - Category Distribution Breakdown Card: Visual category rows with percent badges and progress indicators.

### 3.7 Categories (`categories`)
- **Primary Function:** Customization and archiving of Income and Expense categorization taxonomy.
- **Consumer Hooks:** Category management modal reads `resolveMMSectionStyle('categories', ...)` for category item squircle borders and budget pills.

### 3.8 Reports (`reports`)
- **Primary Function:** Formal financial statement generation, period consolidation, and CSV/PDF export.
- **Consumer Hooks:** Reads `resolveMMSectionStyle('reports', ...)` for report period pills and statement summary cards.

---

## 4. The 5-Layer Waterfall Resolution Pipeline

Every style resolution executes through a deterministic 5-layer cascade:

```
Layer 1: Base Design System Tokens (LIGHT_THEME / DARK_THEME from themeService.js)
   │
   ▼
Layer 2: Active Theme Mode (isDark evaluation for dark-content vs light-content)
   │
   ▼
Layer 3: Base Money Manager Preferences (currencySymbol, defaultPeriod, showNetWorthCard)
   │
   ▼
Layer 4: Global MM Customization Fallback (mmCustomization.global)
   │
   ▼
Layer 5: Section Override (mmCustomization[sectionKey]) & Subsection Micro-Overrides
   │
   ▼
Accessibility Clamping & Contrast Auto-Correction (WCAG 2.2 AA Guardrail)
```

1. **Layer 1 (Base Tokens):** Provides default system colors (e.g. `primary: #B81414`, `cardBg: #FFFFFF`, `textPrimary: #0F172A`).
2. **Layer 2 (Theme Mode):** Swaps palette to dark surface equivalents when `isDark` is active (e.g. `cardBgElevated: #1E293B`, `textPrimary: #F8FAFC`).
3. **Layer 3 (Base Preferences):** Injects user currency symbols and card visibility states.
4. **Layer 4 (Global Customization):** Applies user global customizations (e.g. app-wide preset or tint) across all un-overridden sections.
5. **Layer 5 (Section Overrides):** Directly overrides specific sections with custom presets, hex swatches, tints, or typography scales.
6. **Accessibility Clamp:** Clamps scale to [0.85, 1.30], bounds tint to [0.05, 0.40], and replaces low-contrast text accents (< 4.5:1) with accessible alternatives (`#7F1D1D` in Light, `#FCA5A5` in Dark).

---

## 5. Verification & Test Suite Parity

The matrix is verified by automated regression test suites:
- **Architecture Suite (`test_phase9_customization_architecture.js`):** 11 / 11 tests passed (100% green).
- **Regression Suite (`test_phase9_money_manager_customization.js`):** 65 / 65 tests passed (100% green).
- **Compilation Check:** Full Babel AST validation verified with zero syntax errors.
