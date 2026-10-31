# TALLYKHATA — BASELINE VISUAL & UX AUDIT
## Comprehensive Live Audit Across All 42 Application Surfaces

---

## 1. EXECUTIVE AUDIT SUMMARY

This audit establishes the concrete visual baseline of the TallyKhata application prior to the complete app-wide 3D UI/UX transformation. Evaluations are conducted against the live Xiaomi Redmi Note 9 (`737ee4410405`) device screen captures, component hierarchy in `App.js`, and existing design tokens in `src/themeService.js`.

---

## 2. AUDIT OBSERVATIONS ACROSS PRIMARY SECTIONS

### A. Home / Tali & Business Dashboard
1. **Quick Actions Grid (8 Actions):**
   - *Current State:* Modern 3D squircle icons (`containerSize={50}`, `size={28}`) with specular bevels are properly rendered.
   - *Opportunity:* Border contrast in Dark Mode can be heightened for even richer tactical depth.
2. **Summary Due Card (মোট পাবো / মোট দেবো):**
   - *Current State:* Clean 2-column card with red/green indicators.
   - *Opportunity:* Needs subtle 3D layered surface with corner highlight and refined typography.
3. **Search & Action Filter Bar:**
   - *Current State:* Rounded search input with search, filter, and export icons.
   - *Opportunity:* Filter and export icon buttons need dedicated 3D squircle containers rather than raw inline icons.
4. **Customer / Supplier Tabs & List:**
   - *Current State:* Flat circular avatars with 2-letter initials; basic row dividers; chevron indicators.
   - *Opportunity:* Transform customer/supplier avatars into modern soft-bevel squircles with status dots. Elevate list rows into subtle tactile cards with clear due balance badges.

### B. Customer Account Ledger (`account_ledger`)
1. **Header Action Icons (`ic_call`, `ic_edit`, `ic_delete`):**
   - *Current Defect:* Optical size imbalance (`size={16}` inside `containerSize={32}`). The inner icons appear undersized, and the touch area is below the 44-48dp ergonomic standard.
   - *Fix:* Upgrade to `containerSize={38}`, `size={22}` with 3D bevels and minimum 44dp hitSlop.
2. **Profile Card:**
   - *Current Defect:* Balance label typo `{tStatic("৳                ৳ ")}` in `App.js:4296`.
   - *Fix:* Normalize to clean `৳` prefix with localized `formatMoney()` formatting.
3. **Quick Action Chips (তাগাদা পাঠান, কল করুন, স্টেটমেন্ট শেয়ার):**
   - *Current State:* `containerSize={42}` with `size={20}`.
   - *Fix:* Expand to `containerSize={48}`, `size={26}` with vibrant multi-color 3D palettes.
4. **Ledger History Table & Vouchers:**
   - *Current State:* Functional row items for Becha/Kena/Payment entries.
   - *Opportunity:* Enhance row cards with directional cash badges, date pill labels, and distinct debit/credit micro-indicators.

### C. Cashbox & Cash Management (`activeTab === 'cashbox'`)
1. **Hero Cash Card:**
   - *Current State:* Standard white/dark container with cash in hand total.
   - *Opportunity:* Transform into a dimensional Emerald/Teal hero card with gloss specular highlight, daily inflow/outflow chips, and a quick "ক্যাশ মেলান" (Reconcile) button.
2. **Cash Entries List:**
   - *Current State:* Basic list of cash in and cash out transactions.
   - *Opportunity:* Style with tactile debit/credit cards, localized timestamp tags, and category chips.

### D. Tali Pay (`activeTab === 'tallypay'`)
1. **Wallet Card & Actions:**
   - *Current State:* Dark gradient card with Add Money / Send Money actions.
   - *Opportunity:* Modernize to a realistic 3D metallic/glass card with embossed chip graphic, Bangla QR shortcut, and animated transaction limits gauge.

### E. Menu, Settings & Multi-Business Management
1. **Profile Hero & Multi-Business Switcher:**
   - *Current State:* Clean business picker modal and menu items.
   - *Opportunity:* Unify menu list items with consistent 3D squircle category icons, version badges, and tactile active-state press effects.
2. **Theme & Language Pickers:**
   - *Current State:* Themed modal with radio pills. Fully functional.
   - *Opportunity:* Add visual preview cards showing mini UI mockups for Light and Dark themes.

### F. Money Manager & Advanced Customization Engine
1. **Existing Redesign Baseline:**
   - *Current State:* Successfully upgraded with Net Worth hero card, month picker sheet, 1:1 wallet cards, 3-color budget thresholds, savings goals, and cashflow analytics.
2. **Identified Missing Architecture:**
   - *Current Defect:* `modalMMPreferences` currently only provides basic toggles (period, sort order, cards visibility). It lacks the user-requested **Section-Specific Customization Engine** (Phase 10) to personalize theme presets, background tints, card opacities, typography scales, and icon styling per subsection.
   - *Fix:* Implement full Customization Engine with live preview, section selector, preset themes, and persistent storage.

---

## 3. AUDIT CONCLUSION & IMPLEMENTATION ROADMAP

All 42 screens cataloged in `APP_SCREEN_INVENTORY.md` are accounted for. The implementation will proceed sequentially according to Stages 1 through 15 with zero regressions to the 15 passing test suites.
