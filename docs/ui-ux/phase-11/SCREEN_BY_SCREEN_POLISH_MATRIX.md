# SCREEN-BY-SCREEN POLISH MATRIX: BEFORE & AFTER TRANSFORMATION
**TallyKhata (tallybook-expo) — Phase 11 Visual Consistency & UI Polish**
**Evaluator:** Worker 1 (Gibbs) — Frontend & UI/UX Specialist
**Permanent Thread ID:** `01a19154-99ab-72a0-9e23-2611b9ffc74c`

---

## 1. Overview

This matrix documents the screen-by-screen before and after transformation for all 20 modules in TallyKhata, highlighting the specific UI, visual geometry, and interaction refinements implemented up to and including Phase 11.

---

## 2. Screen-by-Screen Transformation Details

### SCR-01: Home Dashboard (`activeTab === 'home'`)
- **Before:** Flat red banner header, crowded layout, uncontained icons in quick action grid, flat summary card with poor contrast in dark mode.
- **After:** Modern business switcher with status pill, 3D Net Summary Card (মোট পাবো / মোট দেবো) with two-tone vertical divider, 8-icon Quick Actions grid using `AppIcon` with calibrated optical scales, 3D squircle backgrounds, and crisp labels.
- **Tokens & Geometry:** `primary`, `income`, `expense`, `cardBg`, squircle radius 16dp, 3D bottom extrusion ledge (3dp), specular sheen (0.36 height).

### SCR-02 & SCR-03: Customer & Supplier Directory Lists
- **Before:** Generic flat avatar circles, lack of clear due indicators, cramped text rows, sub-40dp touch targets on filter buttons.
- **After:** 3D squircle initials-based avatars with dimensional borders (1.5dp top highlight, 2.5dp bottom ledge), high-contrast due/advance pills, search bar with touch-slop clear button, full-width rows with height $ge 64\text{dp}$.
- **Tokens & Geometry:** `surfaceVariant`, `incomeContainer`, `expenseContainer`, `textPrimary`, `textSecondary`.

### SCR-04: Account Ledger (Customer & Supplier)
- **Before:** Crowded statement view, no distinct profile header, plain table headers, small bottom entry buttons without physical elevation.
- **After:** Ivy Wallet style account header card with balance summary, 3D column headers with sorting cues, date-grouped transaction rows with squircle indicator pills, sticky bottom dual action bar (দিলাম / পেলাম) with tactile `Button3D` components (48dp height).
- **Tokens & Geometry:** `income`, `expense`, `cardBgElevated`, `outline`.

### SCR-05 & SCR-06: Add & Edit Account Modals
- **Before:** White-only background, harsh input borders, hardcoded colors, missing hitSlop on modal close icon.
- **After:** Theme-adaptive `modalCard` with `tStyles.modalSurface`, high-contrast segmented toggle switch for Customer vs Supplier, structured inputs with focus states, `Button3D` CTA buttons, and modal close hitSlop expanding touch area to $52\times 52\text{dp}$.
- **Tokens & Geometry:** `modalSurface`, `inputSurface`, `inputBorder`, `primary`, `danger`.

### SCR-07 & SCR-08: Add & Edit Transaction Modals
- **Before:** Complex inline calculations causing keyboard dismissal on outside taps, uneven keypad buttons.
- **After:** Full calculator keypad with tactile 3D buttons, preset amount increment chips, high-contrast transaction amount display, `keyboardShouldPersistTaps="handled"` on ScrollView, and BackHandler `onRequestClose` safety.
- **Tokens & Geometry:** `income`, `expense`, `cardBg`, `surfaceContainer`.

### SCR-09: Digital Transaction Voucher (`modalVoucher`)
- **Before:** Plain text preview without visual appeal or authenticity cues.
- **After:** Realistic physical paper receipt design with serrated top visual cues, 3D squircle business logo, authenticated digital transaction certification badge, two-tone divider, and 48dp multi-channel share buttons (SMS, WhatsApp, Image).
- **Tokens & Geometry:** `cardBg`, `divider`, `success`, `textPrimary`.

### SCR-10: Cashbox Dashboard & Timeline (`activeTab === 'cashbox'`)
- **Before:** Static summary numbers, unclear timeline, lack of privacy controls.
- **After:** Daily transaction timeline with date grouping, Net Cash summary with privacy eye toggle (***), quick action strip (+ ক্যাশ বেচা, - দোকান খরচ) using tactile 3D buttons, and category breakdown chips.
- **Tokens & Geometry:** `income`, `expense`, `cardBg`, `surfaceVariant`.

### SCR-11 & SCR-12: Add Cash Transaction & Reconcile Modals
- **Before:** Confusing category selector, raw denomination table without keyboard persistence.
- **After:** 5 visual category chips (বেচা, কেনা, খরচ, মালিক দিল, মালিক নিল) with semantic icons, structured currency denomination table (১০০০৳ to ১৳) with live calculated physical vs system difference, and `keyboardShouldPersistTaps="handled"`.
- **Tokens & Geometry:** `modalSurface`, `inputBorder`, `success`, `danger`.

### SCR-15, SCR-16, SCR-17, SCR-18, SCR-19: Tali Pay Digital Wallet Suite
- **Before:** Bare-bones wallet screen, flat QR container, uncalibrated MFS partner icons.
- **After:** Premium virtual wallet card with light sheen and balance toggle, Quick Pay action grid with calibrated `AppIcon` optical metrics, high-contrast Bangla QR merchant modal, Add Money and Send Money modals with `Button3D` and PIN focus states, and quota progress bars.
- **Tokens & Geometry:** `primary`, `primaryContainer`, `cardBgElevated`, `income`, `outlineVariant`.

### SCR-20, SCR-21, SCR-22: Inventory & Stock Management Suite
- **Before:** Repeated text glitches ('ক্রয়: ৳    ক্রয়: ৳'), white-only background in dark mode, flat cards.
- **After:** 4 3D KPI metric cards (Total Products, Purchase Value, Sales Value, Low Stock), search bar with hit-slop clear, status chips (All, Low <= 5, Out == 0), inline Add Product form (`SCR-21`), and stock adjustment modal (`SCR-22`) with segmented In/Out switch and `keyboardShouldPersistTaps="handled"`.
- **Tokens & Geometry:** `cardBgElevated`, `warning`, `danger`, `income`, `outline`.

### SCR-23: Tagada / Due Management Dashboard (`activeTab === 'tagada'`)
- **Before:** Repeated text glitches ('বকেয়া কাস্টমার: বকেয়া কাস্টমার:', 'মোট বাকি: মোট বাকি:'), missing keyboard persistence on customer list.
- **After:** 3 3D metric cards, free SMS quota indicator badge, bulk tagada action button with loading states, customer due cards with squircle avatars, direct SMS/WhatsApp triggers, and `keyboardShouldPersistTaps="handled"`.
- **Tokens & Geometry:** `expense`, `due`, `cardBgElevated`, `surfaceVariant`.

### SCR-24: Business Notes & Memos (`modalNotes`)
- **Before:** Basic text list, no search, no status filtering, keyboard dismiss on tap.
- **After:** Quick search bar with hitSlop clear, filter chips (All, Pending, Completed), comfortable memo editor, 3D note cards with checkbox toggle, and `keyboardShouldPersistTaps="handled"`.
- **Tokens & Geometry:** `cardBg`, `inputSurface`, `success`, `textPrimary`.

### SCR-25: Business Reports & Analytics (7 Modals)
- **Before:** Repeated text glitches ('- ৳ - ৳', 'খরচ খরচ'), flat lists, poor dark mode contrast.
- **After:** 7 specialized modals (Due, Cash, Sales, Expense, Owner Equity, P&L, Consolidated Statement) with 3D KPI cards, clean data tables, date filters, two-tone dividers, and share triggers with $ge 48\text{dp}$ touch clearance.
- **Tokens & Geometry:** `income`, `expense`, `cardBg`, `textPrimary`, `textSecondary`.

### SCR-26: Money Manager Hub & Modals (`modalMoneyManager`)
- **Before:** Static non-customizable personal finance view, small modal close buttons (24dp touch area).
- **After:** 8 sub-tabs (Dashboard, Txns, Wallets, Budgets, Goals, Analytics, Categories, Reports), 5-layer customization engine, 6 theme presets, live preview, and all 16 close buttons calibrated to 36dp with `STANDARD_TOUCH_HIT_SLOP` ($ge 52\times 52\text{dp}$ touch bounds).
- **Tokens & Geometry:** `mmCustomization` (Layer 1-5), `Card3D`, `Button3D`, `SquircleBadge`.

### SCR-27: Global Settings Menu Tab (`activeTab === 'menu'`)
- **Before:** Incomplete settings grouping, uncontained icons, duplicate offline notice text.
- **After:** Merchant shop profile card, 10 unified settings groups with 3D squircle icon containers, clear section counters, chevron indicators, and verified offline guarantee card with clean text.
- **Tokens & Geometry:** `cardBg`, `surfaceVariant`, `primary`, `textPrimary`.

### SCR-28: Appearance & Theme Modal (`modalThemePicker`)
- **Before:** Bare theme toggle, no font scale or density controls.
- **After:** 3-mode theme selector (Light, Dark, System) with live preview cards, font scale picker (0.85x, 1.0x, 1.1x, 1.2x, 1.3x), and layout density selector (Comfortable, Standard, Compact).
- **Tokens & Geometry:** `modalSurface`, `cardBorder`, `primaryContainer`.

### SCR-29: Notifications Settings Modal (`modalNotifications`)
- **Before:** Hardcoded alert triggers without persistent user preferences.
- **After:** Categorized toggle rows (Due alerts, Daily backup reminder, Promo alerts) with tactile 3D switches and Bengali descriptions.
- **Tokens & Geometry:** `cardBg`, `primary`, `surfaceVariant`.

### SCR-30: Data Backup & Cloud Restore Modal (`modalBackupRestore`)
- **Before:** Duplicate tab text ('অফলাইন ফাইল                   অফলাইন ফাইল'), missing selective restore options.
- **After:** Google Drive native status card, selective domain restore checklist (Tali, Cashbox, Stock, Notes, Money Manager), and clean offline backup tab with resolved duplicate text glitch.
- **Tokens & Geometry:** `cardBgElevated`, `success`, `primary`, `outline`.

### SCR-31: Security & PIN Settings Modal (`modalSecurityPrivacy`)
- **Before:** Basic PIN prompt without auto-lock configuration.
- **After:** App lock toggle, biometric unlock switch, auto-lock timeout radio selector (Immediately, 1m, 5m, 15m), and PIN change trigger.
- **Tokens & Geometry:** `cardBg`, `inputBorder`, `primary`.

---
*Verified by Worker 1 (Gibbs) — Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c*
