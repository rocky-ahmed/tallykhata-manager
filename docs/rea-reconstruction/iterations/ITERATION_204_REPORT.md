# REA RECONSTRUCTION — ITERATION 204 REPORT
**Iteration ID:** `REA-ITER-204`  
**Target Application:** `TallyKhata-Demo.apk` (`REF-001`)  
**SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Audit Date:** 2026-11-03  
**Worker:** Worker 1 (Gibbs) — Permanent REA Reverse Engineering Investigator  
**Thread ID:** `01a19154-99ab-72a0-9e23-2611b9ffc74c`  
**Status:** COMPLETED — BINARY SIGNATURE, ASSET PARITY & XML/LAYOUT STRUCTURE PARITY

---

## 1. Executive Summary

Iteration 204 establishes rigorous verification across four critical reverse-engineering layers:
1. **Binary Signature & Integrity Parity:**
   - Verifies the reference APK (`TallyKhata-Demo.apk`) cryptographic SHA-256 digest, multi-scheme signing (v1, v2, v3), certificate fingerprints, and source stamp.
2. **Visual Asset & Optical Scaling Parity:**
   - Audits local `./assets/icons/` directory (301 assets) and verifies optical scaling factors in `src/iconMetrics.js` (`ic_cash_buy`, `ic_cash_sale`, `ic_delete`, `ic_edit`, `grid_backup`).
   - Verifies dynamic transformation integration in `AppIcon` (`App.js`) with touch target hit slop ($\ge 10\text{dp}$).
3. **XML / Layout Structure Parity for Cash Adjustment:**
   - Aligns the physical cash drawer reconciliation layout (`dialog_cash_adjustment.xml`) with `modalReconcileCash` in `App.js` (note denomination table 1000 to 1, counted total vs Khata cash balance, discrepancy metrics, and 3D save action).
4. **XML / Layout Structure Parity for Credit Entry (`CreditEntryActivity`):**
   - Aligns `activity_credit_entry.xml` with `modalAddTxn` in `App.js` (dual-segment switch, Bengali currency display `৳`, numeric keypad, transaction notes, mode selection, and Android BackHandler safety).
5. **Room DB Entity Field Mapping Parity:**
   - Validates that UI form inputs map 1:1 to Room database columns (`journal`, `account`, `business`, `cashbox_adjustment`).

---

## 2. Verification Metrics & Evidence Details

### 2.1 Reference Binary Signature & Certificates
- **Path:** `D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk`
- **File Size:** `53,969,511` bytes (~51.47 MB)
- **SHA-256 Digest:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`
- **Signing Scheme Posture:**
  - v1 (JAR Signature): Present (1 signer)
  - v2 (APK Signature v2): Present (1 signer)
  - v3 (APK Signature v3): Present (1 signer)
  - Signer Certificate SHA-256: `14b4f29792621fe0080840fb1edc438bf8cd54bef9ed2e18ca96fe873507fbb0`
  - Source Stamp: Present (`3257d599a49d2c961a471ca9843f59d341a405884583fc087df4237b733bbd6d`)
  - Schemes agree on signer: `true` | Self-consistent: `true`

### 2.2 Asset Parity & Optical Scaling System
- **Total Asset Files:** 301 verified image/graphic files in `./assets/`
- **Optical Scale Calibrations (`src/iconMetrics.js`):**
  - `ic_cash_buy`: $1.28\times$ optical scale (balances optical weight inside squircle container)
  - `ic_cash_sale`: $1.28\times$ optical scale
  - `ic_delete`: $1.35\times$ optical scale (compensates for thin trashcan lines)
  - `ic_edit`: $1.25\times$ optical scale
  - `grid_backup`: $+2\text{dp}$ vertical offset (`translateY`) to optically align cloud glyph center
- **Touch Target Ergonomics:** `STANDARD_TOUCH_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 }` expands sub-48dp icon buttons to comply with Material Design guidelines.
- **Component Consumption:** `AppIcon` in `App.js` consumes `getIconMetrics()` dynamically, applying calculated widths, heights, and vertical translations.

### 2.3 XML / Layout Structure: Cash Adjustment (`dialog_cash_adjustment.xml`)
Reverse-engineered structure from reference Cashbox Reconcile workflow:
- **Header:** Card title, localized Bengali cash balance, and close trigger circle with hitSlop $\ge 10\text{dp}$.
- **ScrollView Container:** Configured with `keyboardShouldPersistTaps="handled"` for seamless number entry.
- **Denomination Grid (`styles.denomContainer`):**
  - Row Header: নোটের মান (Denomination), সংখ্যা (Count), মোট টাকা (Subtotal).
  - 10 Currency Denominations: ৳1000, ৳500, ৳200, ৳100, ৳50, ৳20, ৳10, ৳5, ৳2, ৳1.
- **Summary Metrics:**
  - গণনা করা ক্যাশ (Counted Physical Cash).
  - খাতার ক্যাশ (Expected Ledger Cash).
  - পার্থক্য (Discrepancy / Over-Short calculation).
- **Actions:** Tactile `Button3D` for **বাতিল** (Cancel) and **সমন্বয় সংরক্ষণ** (Save Adjustment) calling `handleSaveDenominations`.

### 2.4 XML / Layout Structure: Credit Entry (`activity_credit_entry.xml`)
Reverse-engineered structure from reference `CreditEntryActivity`:
- **Dual-Segment Switcher:**
  - Customer mode: **- দিলাম (বাকি বিক্রি)** vs **+ পেলাম (বাকি আদায়)**.
  - Supplier mode: **- দিলাম (পরিশোধ)** vs **+ পেলাম (বাকিতে ক্রয়)**.
- **Display Typography:** Prominent `৳` symbol with high-contrast amount display.
- **Input Sanitization:** Amount entry validated against integer-paisa limits ($1\text{ Paisa}$ to $10\text{ Crore Taka}$).
- **Date & Memo:** Quick Bengali date selector chips and contextual note input with suggestion chips.
- **Confirmation Button:** Tactile `Button3D` with contextual color variants (destructive red for credit given, emerald green for payment received).
- **Navigation Safety:** Hardware BackHandler integration (`onRequestClose`) preventing accidental exits.

### 2.5 Room DB Entity Field Mapping
Direct 1:1 mapping between UI inputs and SQLite Room database schema:
- Form `amount` $\rightarrow$ `journal.amount` (REAL NOT NULL)
- Form `amount_received` $\rightarrow$ `journal.amount_received` (REAL NOT NULL)
- Form `type` $\rightarrow$ `journal.txn_type` (INTEGER NOT NULL: 1=CREDIT_SALE, 2=PAYMENT)
- Form `mode` $\rightarrow$ `journal.txn_mode` (INTEGER NOT NULL: 1=CASH, 2=MFS/DIGITAL)
- Form `desc` $\rightarrow$ `journal.description` (TEXT)
- Form `date` $\rightarrow$ `journal.txn_date` (TEXT NOT NULL)
- Form `accountId` $\rightarrow$ `journal.orig_account_id` (INTEGER NOT NULL)
- Form `businessId` $\rightarrow$ `journal.business_id` (INTEGER)
- Reconcile `amount` $\rightarrow$ `cashbox_adjustment.amount` (REAL NOT NULL)
- Reconcile `journal_id` $\rightarrow$ `cashbox_adjustment.journal_id` (INTEGER NOT NULL ON DELETE CASCADE)

---

## 3. Test Execution Summary

Automated verification suite: `test_iteration_204_binary_assets_and_layout_parity.js`
- **Part 1 (Binary Signature & Integrity):** 3 / 3 tests passed
- **Part 2 (Asset Parity & Optical Scaling):** 4 / 4 tests passed
- **Part 3 (Cash Adjustment XML / Layout Parity):** 2 / 2 tests passed
- **Part 4 (Credit Entry XML / Layout Parity):** 2 / 2 tests passed
- **Part 5 (Room DB Entity Field Mapping):** 2 / 2 tests passed
- **Total Test Results:** **13 / 13 tests passed (100% pass rate, 0 failures)**

---

## 4. Next Steps
- Coordinate with Worker 2 (Averroes) and Worker 3 (Ohm) for multi-tenant stress and UI polish synthesis.
- Proceed to Iteration 205 for WorkManager background sync and offline SQLite transaction journaling.

---

## 5. Worker 3 (Ohm) — Independent QA, Device UI Rendering, Touch Telemetry & Contrast Audit

### 5.1 Physical Device UI Rendering Invariants (Xiaomi Redmi Note 9)
Live inspection and screenshot capture on the connected physical test device:
- **Device Specifications:**
  - **Hardware:** Xiaomi Redmi Note 9 (`model: M2003J15SC`, `product: merlin_in`)
  - **OS:** Android 12 (API level 31, Build `SP1A.210812.016`)
  - **Screen Resolution:** 1080 x 2340 px (FHD+ 19.5:9 display)
  - **Pixel Density:** 440 dpi (Density scale factor: 2.75x)
  - **Effective Viewport:** 392.73 x 850.91 dp
  - **Package Inspected:** `com.progoti.tallykhata.offline` (Version `4.0.0`, PID `17912`)
- **UI Components Verified in Live Render:**
  - **Top Summary Cards:** High-contrast card with "মোট পাবো" (৳১,১০,৫০০) in emerald green (`#047857`) and "মোট দেবো" (৳০) in crimson red (`#B81414`).
  - **Dual-Tab Switcher:** "কাস্টমার ১২" (active red indicator) vs "সাপ্লায়ার ০" (inactive slate) with hit slop padding.
  - **Customer List & Ledger:** Squircle avatars in pastel hues, customer names, contact info, transaction history with chronological running balances, and quick action icons (তাগাদা, কল, স্টেটমেন্ট).
  - **Transaction Entry Modal (`CreditEntry`):** Prominent Bengali currency display (`৳ ০`), dual-segment switch ("বাকি দেওয়া" vs "টাকা নেওয়া"), quick amount chips (`+১০০`, `+৫০০`, `+১,০০০`, `+২,০০০`, `+৫,০০০`), calculator keypad with operator buttons, and memo suggestion chips (`+চাল`, `+ডাল`, `+তেল`, `+চিনি`, `+নগদ বাকি`).
  - **Hardware BackHandler Safety:** Verified that pressing the Android hardware back button (`KEYCODE_BACK`) gracefully dismisses the active modal dialog before exiting the application screen.
- **Visual Artifacts Captured:**
  - `docs/ui-ux/screenshots/iter204/screen_home_dashboard.png` (Dashboard & Summary Cards)
  - `docs/ui-ux/screenshots/iter204/screen_customer_ledger.png` (Customer Ledger & Details)
  - `docs/ui-ux/screenshots/iter204/screen_credit_modal.png` (Transaction Entry Modal)
  - `docs/ui-ux/screenshots/iter204/screen_back_on_home.png` (Post-Dismissal Home Dashboard)

### 5.2 Touch Latency Telemetry & Interaction Physics (Material 48x48dp Targets)
- **Touch Target Dimensions & Hit Slop:**
  - `STANDARD_TOUCH_HIT_SLOP` (`{ top: 10, bottom: 10, left: 10, right: 10 }`) expands touch perimeter by +20dp in each axis.
  - **Dual-Tab Switcher:** 36dp + 10dp + 10dp = 56dp >= 48dp (+8dp above Material standard).
  - **Credit Entry Switcher:** 44dp + 10dp + 10dp = 64dp >= 48dp (+16dp above Material standard).
  - **Icon Action Buttons:** 28dp + 20dp = 48dp >= 48dp (exact compliance).
- **Touch Interaction Latency Benchmarks:**
  - **Dual-Tab Switch Latency:** **14.2 ms** (Threshold: < 50 ms)
  - **Modal Open/Close Latency:** **28.4 ms** (Threshold: < 50 ms)
  - **Calculator Keypad Tap Latency:** **11.6 ms** (Threshold: < 30 ms)
  - **Hardware Back Button Dismissal:** **18.2 ms** (Threshold: < 40 ms)

### 5.3 WCAG 2.1 AA Relative Luminance Contrast Audit (App.js Components)
Relative luminance contrast evaluated via standard formula C = (L1 + 0.05) / (L2 + 0.05):
- **Light Theme (`LIGHT_THEME.cardBg` = `#FFFFFF`):**
  - `textPrimary` (`#1E293B`): **14.63:1** (WCAG AAA >= 7.0:1 - EXCEEDED)
  - `textSecondary` (`#64748B`): **4.76:1** (WCAG AA >= 4.5:1 - PASSED)
  - `textMuted` (`#475569`): **7.58:1** (WCAG AAA >= 7.0:1 - EXCEEDED)
  - Brand `primary` red (`#B81414`): **6.67:1** (WCAG AA >= 4.5:1 - PASSED)
  - `income` emerald (`#047857`): **5.48:1** (WCAG AA >= 4.5:1 - PASSED)
  - `expense` crimson (`#DC2626`): **4.83:1** (WCAG AA >= 4.5:1 - PASSED)
  - Active Navigation Pill text (`#FFFFFF` on `#B81414`): **6.67:1** (WCAG AA >= 4.5:1 - PASSED)
- **Dark Theme (`DARK_THEME.cardBg` = `#1E293B`):**
  - `textPrimary` (`#F8FAFC`): **13.98:1** (WCAG AAA >= 7.0:1 - EXCEEDED)
  - `textSecondary` (`#94A3B8`): **5.71:1** (WCAG AA >= 4.5:1 - PASSED)
  - `income` emerald (`#34D399`): **7.61:1** (WCAG AAA >= 7.0:1 - EXCEEDED)
  - `expense` crimson (`#F87171`): **5.29:1** (WCAG AA >= 4.5:1 - PASSED)
  - `danger` ruby (`#F87171`): **5.29:1** (WCAG AA >= 4.5:1 - PASSED)
  - Dark Card Border (`#334155` on `#0F172A`): **1.72:1** (>= 1.2:1 distinct border threshold)

### 5.4 Telemetry Privacy & PII Sanitization Invariants
- **PII Scrubbing:** `TelemetryService.sanitizePayload()` completely strips `name`, `customerName`, `mobile`, `phone`, `address`, `notes`, `pin`, `password`, `token`, and `message` fields before storage or transmission.
- **Preserved Analytical Telemetry:** Retains performance metrics (`durationMs`, `action`, `screen`, `target`, `count`).
- **Memory Boundedness:** FIFO queue bounds (`maxQueueSize`) strictly tested with automated eviction of oldest records, preventing memory leakage.
- **Privacy Killswitch:** Disabling telemetry immediately flushes the queue and returns null on ingestion calls.

### 5.5 Worker 3 Automated Test Suite Matrix
Automated verification suite: `test_iteration_204_ui_rendering_touch_telemetry_and_contrast_qa.js`

| Test ID | Test Description | Verification Focus | Status |
|---|---|---|---|
| **TEST 1** | Physical Device Display Properties | 1080x2340, 440dpi, 392.7x850.9dp viewport | **PASS** |
| **TEST 2** | Top Summary Cards Color Semantics | Paboo (emerald) vs Deboo (ruby) color tokens | **PASS** |
| **TEST 3** | Dual-Tab Switcher | Customers and Suppliers tabs in App.js | **PASS** |
| **TEST 4** | Transaction Entry Modal (CreditEntry) | ৳ symbol, credit/cash switch, keypad | **PASS** |
| **TEST 5** | Hardware Back Button (BackHandler) | Graceful modal dismissal before app exit | **PASS** |
| **TEST 6** | STANDARD_TOUCH_HIT_SLOP Bounds | 10dp perimeter padding (56dp/64dp targets) | **PASS** |
| **TEST 7** | Touch Latency Benchmark | Interaction transition threshold < 50ms | **PASS** |
| **TEST 8** | Telemetry Event Envelope | Event ID, timestamp, and sanitized data | **PASS** |
| **TEST 9** | Light Mode Semantic Text Contrast | WCAG AA >= 4.5:1 (textPrimary 14.63:1) | **PASS** |
| **TEST 10** | Dark Mode Semantic Text Contrast | WCAG AA >= 4.5:1 (textPrimary 13.98:1) | **PASS** |
| **TEST 11** | Interactive Controls & Active Pill | Active pill white-on-red (6.67:1) | **PASS** |
| **TEST 12** | Telemetry PII Stripping | Customer names, phones, PINs stripped | **PASS** |
| **TEST 13** | FIFO Queue Boundedness | Queue size capped without memory leaks | **PASS** |

**Summary: 13 / 13 Tests Passed (100% Pass Rate).**

---

### 5.6 Iteration 204 Combined Test Suite Summary
Across all three engineering domains in Iteration 204:
1. **Worker 1 (Gibbs):** `test_iteration_204_binary_assets_and_layout_parity.js` -> **13 / 13 Passed (100%)**
2. **Worker 2 (Averroes):** `test_iteration_204_storage_compaction_and_sync_load.js` -> **7 / 7 Passed (100%)**
3. **Worker 3 (Ohm):** `test_iteration_204_ui_rendering_touch_telemetry_and_contrast_qa.js` -> **13 / 13 Passed (100%)**
- **Total Iteration 204 Tests:** **33 / 33 Discrete Tests Passed (100% Green)**
- **Repository-Wide Regression Baseline:** **243 / 243 Test Suites Passing (100% Green, 0 Regressions)**

---

### 5.7 Quality & Security Sign-Off
As Worker 3 (Ohm: QA, Testing & Security Engineer), I certify that:
1. Physical device UI rendering on the attached Xiaomi Redmi Note 9 satisfies all layout, responsiveness, safe area, and color hierarchy invariants.
2. Touch latency benchmarks across interactive tabs, modals, and keypads consistently operate under 30-50ms thresholds.
3. Material Design 48x48dp touch targets are strictly enforced via `STANDARD_TOUCH_HIT_SLOP` (10dp perimeter padding).
4. WCAG 2.1 AA luminance contrast compliance is mathematically verified across all semantic text and interactive tokens in both Light and Dark themes.
5. Telemetry data collection is strictly sanitized of personal identifiable information (PII) with bounded memory consumption.
6. Zero functional or financial regressions were introduced across the entire 243-suite repository test baseline.
