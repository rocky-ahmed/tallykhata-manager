# PHASE 1 APPLICATION ARCHITECTURE, THEME, PREFERENCES & DATA INTEGRATION AUDIT
**Worker Role**: Worker 2 — Backend & Data Architect (Averroes)  
**Registered Thread ID**: `01a19154-c135-75d0-b38a-1ea50f004895`  
**Date**: 2026-10-31  
**Project**: TallyKhata (tallybook-expo)  
**Status**: COMPLETE (Audit Only — 0 Source Code Files Modified)

---

## EXECUTIVE SUMMARY

As designated **Worker 2: Backend & Data Architect (Averroes)**, I have executed a comprehensive Phase 1 architectural, state, theming, localization, customization, and data safety audit of the TallyKhata Expo application.

The core findings of this audit are:
1. **Financial and Ledger Invariants are Solid**: The foundational business ledger (`src/ledgerEngine.js`), concurrency serialization (`src/storageRepository.js`), personal finance engine (`src/moneyManagerService.js`), and cloud backup pipeline (`src/googleDriveBackupService.js`) are completely stable, mathematically verified (integer paisa math, single-pass O(N) analytics, atomic goal allocations), and 100% passing across 70 Money Manager tests and 16 QA backup/security tests.
2. **Theme Token Fragmentation**: While a centralized theme token architecture exists (`src/themeService.js`, 39 tokens per mode) and is consumed across 727 `tStyles` and 269 `currentTheme` locations, `App.js` contains **1,510 hardcoded raw hex color literals** across 136 unique hex codes. This creates significant visual inconsistency in dark mode and high-contrast environments.
3. **Money Manager Customization Engine Status**: The customization UI in `modalMMPreferences` (section pills, 6 preset palettes, 4 tint levels, 3 text scales) provides a functional **live preview card**, but is **100% preview-only** for consumer screens. While saved to `preferences.customization` in state and AsyncStorage, none of the 6 consumer tabs (`dashboard`, `transactions`, `wallets`, `budgets`, `goals`, `analytics`) consume these overrides. Core functional preferences (`defaultPeriod`, `sortOrder`, `currencySymbol`, and the 3 card visibility toggles) work end-to-end.
4. **Google Drive Backup Compatibility**: Neither the existing preferences nor any future expansion of the customization schema breaks Google Drive backup, restore, or SHA-256 integrity validation.

---

## 1. ARCHITECTURE & TECHNOLOGY STACK AUDIT

### 1.1 Core Framework & Dependency Inventory

The application is built on modern React Native and Expo infrastructure, configured as follows in `package.json`:

| Dependency | Installed Version | Architectural Role & Runtime Notes |
| :--- | :--- | :--- |
| **Expo SDK** | `~57.0.28` | Application runtime, asset bundling, native module bridge |
| **React Native** | `0.86.3` | Core mobile framework, Hermes JavaScript engine |
| **React** | `19.2.3` | UI component lifecycle, hooks, fiber reconciler |
| **AsyncStorage** | `2.2.0` (`@react-native-async-storage/async-storage`) | Offline client-side key-value persistence |
| **Google Sign-In** | `^16.1.5` (`@react-native-google-signin/google-signin`) | OAuth2 authentication for private cloud backup |
| **Expo Dev Client** | `~57.0.20` | Custom native debug client for standalone builds |
| **Expo Navigation Bar** | `~57.0.3` | System bottom navigation bar color and theme synchronization |
| **Expo Status Bar** | `~57.0.1` | Top status bar style management (light/dark) |
| **Expo System UI** | `~57.0.4` | Root Android view background color control |
| **Expo Localization** | `~57.0.2` | Device locale detection for English/Bengali fallback |

### 1.2 Component & State Management Architecture

- **Monolithic Container Pattern**: `App.js` acts as a monolithic controller containing ~13,100 lines of code. It directly holds top-level state for all primary domains:
  - Business store: `store`, `accounts`, `journals`, `cashEntries`, `stock`, `notes`, `businesses`.
  - Personal Money Manager: `moneyManagerState` (isolated state containing `accounts`, `transactions`, `categories`, `goals`, `recurring`, `preferences`).
  - Modal Visibility: 18+ modal boolean flags (`modalMoneyManager`, `modalMMAddTxn`, `modalMMEditTxn`, `modalMMAddAccount`, `modalMMSetBudget`, `modalMMTransfer`, `modalMMAddCategory`, `modalMMOverallBudget`, `modalMMAddGoal`, `modalMMDepositGoal`, `modalMMWithdrawGoal`, `modalMMPreferences`, `modalMMRecurring`, `modalMMAddRecurring`, `modalMMEditCategory`, `modalMMCustomDateRange`, `modalMMMonthPicker`).
  - Active Tab Navigation: `activeTab` (`'khata'`, `'cashbox'`, `'tallypay'`, `'menu'`) and `mmActiveSubTab` (`'dashboard'`, `'transactions'`, `'wallets'`, `'budgets'`, `'goals'`, `'analytics'`).
- **Data Repositories & Concurrency Layer**:
  - `src/storageRepository.js`: Encapsulates AsyncStorage mutations within a dedicated `WriteQueue`. The queue serializes concurrent write operations via chained Promises, preventing disk corruption and race conditions during high-frequency balance updates.
  - `src/ledgerEngine.js`: Stateless pure mathematical module that enforces double-entry invariant recalculations.
  - `src/moneyManagerService.js`: Self-contained service with internal in-memory caching (`_cachedMMState`, `resetCache()`, `reloadCache()`) and atomic immutable state transformation functions.

### 1.3 Theme Architecture (`src/themeService.js`)

The application implements a centralized theme token architecture:
- **Token Count**: Exactly 39 semantic tokens defined for `LIGHT_THEME` and `DARK_THEME`.
- **Token Categories**:
  - *Surfaces & Backgrounds*: `screenBg`, `headerBg`, `cardBg`, `cardBgElevated`, `cardBorder`, `modalSurface`, `modalOverlay`, `tabBarBg`, `divider`.
  - *Typography*: `textPrimary`, `textSecondary`, `textMuted`, `textInverted`, `headerText`.
  - *Inputs*: `inputBg`, `inputBorder`, `inputText`, `inputPlaceholder`.
  - *Brand & Semantics*: `primary` (#B81414 / #EF4444), `primaryLight`, `success`, `successLight`, `danger`, `dangerLight`, `warning`, `warningLight`, `info`, `infoLight`, `purple`, `purpleLight`, `neutral`, `neutralLight`.
  - *Navigation & Controls*: `tabActive`, `tabInactive`, `tabBarBorder`, `modalHandle`, `statusBar`.
- **Style Compilation**: `getThemedStyles(t, isDark)` compiles token values into ~180 pre-computed StyleSheet objects (`tStyles`).
- **Dynamic Theme Resolution**:
  ```javascript
  const effectiveTheme = preferencesService.resolveEffectiveTheme(appPreferences?.theme, systemColorScheme);
  const isDark = effectiveTheme === preferencesService.THEMES.DARK;
  const currentTheme = isDark ? themeService.DARK_THEME : themeService.LIGHT_THEME;
  const tStyles = useMemo(() => themeService.getThemedStyles(currentTheme, isDark), [currentTheme, isDark]);
  ```

### 1.4 Hardcoded Color Usage vs. Semantic Tokens

An exhaustive static scan of `App.js` revealed **1,510 hardcoded hex color occurrences** across **136 distinct hex codes**, contrasted with **727 `tStyles`** usages and **269 `currentTheme`** token references.

#### Top 20 Hardcoded Colors in `App.js`
| Hex Code | Count | Semantic Meaning / Role | Correct Replacement Token |
| :--- | :---: | :--- | :--- |
| `#FFFFFF` | 202 | Card backgrounds, pure white text, modal cards | `currentTheme.cardBg` / `currentTheme.textInverted` |
| `#B81414` | 88 | TallyKhata brand primary red | `currentTheme.primary` |
| `#E2E8F0` | 60 | Light slate container borders | `currentTheme.cardBorder` |
| `#64748B` | 57 | Slate secondary / subtitle text | `currentTheme.textSecondary` |
| `#E5E7EB` | 56 | Gray divider / border | `currentTheme.divider` |
| `#94A3B8` | 56 | Light slate muted labels | `currentTheme.textMuted` |
| `#6B7280` | 48 | Cool gray text | `currentTheme.textSecondary` |
| `#1E293B` | 43 | Slate dark title text | `currentTheme.textPrimary` |
| `#1A1A1A` | 41 | Deep black headers | `currentTheme.textPrimary` |
| `#334155` | 41 | Dark slate subtitles | `currentTheme.textSecondary` |
| `#3B82F6` | 34 | Blue accent (Bank, Goals) | `currentTheme.info` |
| `#0F8A0F` | 33 | Deep green success badge | `currentTheme.success` |
| `#F3F4F6` | 33 | Gray surface background | `currentTheme.screenBg` / `cardBgElevated` |
| `#4B5563` | 33 | Slate body text | `currentTheme.textSecondary` |
| `#10B981` | 30 | Emerald green success | `currentTheme.success` |
| `#F1F5F9` | 27 | Slate pill/button background | `currentTheme.cardBgElevated` |
| `#EF4444` | 26 | Expense red / danger badge | `currentTheme.danger` |
| `#0F172A` | 25 | Dark slate surface | `currentTheme.cardBg` (Dark) |
| `#9CA3AF` | 23 | Muted icon / placeholder | `currentTheme.inputPlaceholder` |
| `#FFF0F1` | 18 | Light red brand tint background | `currentTheme.primaryLight` |

**Impact Assessment**: Because these colors are hardcoded inline (e.g. `style={{ backgroundColor: '#FFFFFF', color: '#1E293B' }}`), elements do not adapt when users switch to Dark Mode, resulting in bright white cards on dark backgrounds or dark text on dark surfaces. A critical goal of UI modernization is migrating these 1,510 instances to `tStyles` and `currentTheme` tokens.

### 1.5 Localization Architecture (`src/i18nService.js`)

- **Dual Translation API in `App.js`**:
  1. `t(key, params)` (**576 calls**): Performs structured key lookups in `STRINGS[lang]`. If missing, it gracefully falls back to `STRINGS.bn[key]`. Supports dynamic template parameter interpolation (e.g. `{count}`, `{amount}`).
  2. `tStatic(bengaliText)` (**889 calls**): Translates inline legacy Bengali literal strings to English using `translateStaticText(text, effectiveLanguage)`. This allows legacy UI components to support English mode without breaking existing Bengali string literals.
- **Numeral Normalization**:
  - `toEnglishDigits(str)`: Converts Bengali numerals (`০-৯`) to standard ASCII digits (`0-9`) prior to any numeric parsing or mathematical calculation.
  - `formatNumber(num, locale)`: Formats ASCII numbers into localized Bengali or English digits with localized grouping separators.
  - `formatCurrency(amount, currencySymbol, locale)`: Produces consistent, precision-rounded currency strings (e.g., `৳ ১,৫০,০০০.০০`).

---

## 2. PREFERENCES & MONEY MANAGER CUSTOMIZATION AUDIT

### 2.1 Persistence Keys and Segregation

The application strictly isolates app-level settings from personal finance settings:

| Storage Key | Owning Domain | Stored Structure | Invariants & Validation |
| :--- | :--- | :--- | :--- |
| `@tallykhata_app_preferences_v1` | App Global | `{ theme, language, updatedAt }` | Validated by `preferencesService.sanitizePreferences()`. Defaults to `theme: 'light'`, `language: 'bn'`. |
| `@tallykhata_personal_money_manager_v2` | Personal Money Manager | `{ version, overallMonthlyBudget, preferences, accounts, categories, goals, recurring, transactions, updatedAt }` | Isolated personal state schema v3. Managed exclusively by `moneyManagerService.js`. |

### 2.2 Money Manager Customization Engine Implementation

Inside `modalMMPreferences` (`App.js:12197-12550`), the UI offers a dedicated **Customization Engine** section:
- **Section Selector**: Horizontal pill selector with 6 options:
  - `dashboard` (📊 ড্যাশবোর্ড)
  - `transactions` (📝 লেনদেন)
  - `wallets` (💳 ওয়ালেট)
  - `budgets` (🎯 বাজেট)
  - `goals` (🏆 লক্ষ্য)
  - `analytics` (📈 অ্যানালিটিক্স)
- **Theme Presets (6 Palettes)**:
  - এমারেল্ড (`emerald`, #10B981)
  - স্যাফায়ার (`sapphire`, #2563EB)
  - ওবসিডিয়ান (`obsidian`, #334155)
  - রোজ গোল্ড (`rose`, #EC4899)
  - অ্যাম্বার (`amber`, #F59E0B)
  - অ্যামিথিস্ট (`amethyst`, #8B5CF6)
- **Background Tint Opacities**: `10%` (`0.1`), `20%` (`0.2`), `30%` (`0.3`), `40%` (`0.4`).
- **Typography & Text Scale**: `স্বাভাবিক (1.0)`, `মাঝারি (1.1)`, `বড় (1.2)`.
- **Live Preview Card**: Renders a styled sample card demonstrating the active section's chosen preset accent color, background tint opacity, and text scale.

### 2.3 Ground-Truth Evaluation: Functional vs. Preview-Only

A rigorous code trace of `mmCustomization` across the codebase establishes the following ground truth:

| Customization / Preference Option | Implementation State | Actual Consumer Screen Effect | Ground-Truth Verdict |
| :--- | :--- | :--- | :--- |
| **Default Period** (`mmPrefDefaultPeriod`) | Full pipeline | Sets initial `mmPeriod`, filters transaction queries, recalculates cash flow & budgets. | **GENUINELY FUNCTIONAL** |
| **Default Sort Order** (`mmPrefSortOrder`) | Full pipeline | Sets initial `mmSortOrder`, orders transaction lists (`newest`, `oldest`, `amount_high`, `amount_low`). | **GENUINELY FUNCTIONAL** |
| **Currency Symbol** (`mmPrefCurrencySymbol`) | Full pipeline | Controls prefix symbol (`৳` vs `BDT`) in summary banners and transaction list items. | **GENUINELY FUNCTIONAL** |
| **Net Worth Card Toggle** (`mmPrefShowNetWorth`) | Full pipeline | Directly toggles rendering of `styles.mmNetWorthCard` on Dashboard. | **GENUINELY FUNCTIONAL** |
| **Savings Rate Card Toggle** (`mmPrefShowSavingsRate`) | Full pipeline | Directly toggles rendering of `styles.mmSavingsRateCard` on Dashboard. | **GENUINELY FUNCTIONAL** |
| **Financial Tips Card Toggle** (`mmPrefShowTips`) | Full pipeline | Directly toggles rendering of `styles.mmTipCard` on Dashboard. | **GENUINELY FUNCTIONAL** |
| **Section Theme Presets** (`preset`, `accent`) | `App.js:12347-12380` | **Preview-only**. Stored in `preferences.customization[section]`, but consumer screens never read it. | **PREVIEW-ONLY** |
| **Section Background Tint** (`tint`) | `App.js:12389-12420` | **Preview-only**. Stored in `preferences.customization[section]`, but consumer screens never read it. | **PREVIEW-ONLY** |
| **Section Text Scale** (`textScale`) | `App.js:12431-12465` | **Preview-only**. Stored in `preferences.customization[section]`, but consumer screens never read it. | **PREVIEW-ONLY** |

**Architectural Recommendation**: The customization preferences (`preset`, `accent`, `tint`, `textScale`) are already safely preserved in `moneyManagerState.preferences.customization`. During Phase 2 implementation, these tokens should either be formally wired to consumer card styles via `useMemo` hooks or cleanly unified with the global `themeService` tokens to eliminate dormant state.

### 2.4 Cloud Backup & Restore Compatibility

We audited `src/googleDriveBackupService.js` to determine if saving customization fields impacts Google Drive backup and restore integrity:
1. **Serialization**: In `buildBackupPayload()`, the entire `authoritativeState.moneyManager` object is copied directly into `rawData.moneyManager`. The nested `preferences.customization` object serializes into standard UTF-8 JSON without circular references.
2. **Integrity Checksum**: The FIPS 180-4 SHA-256 checksum is computed over the entire `rawData` string. Any valid JSON structure within `customization` generates a deterministic, verifiable hash.
3. **Selective Restore**:
   - Mode 1 (*Business Only*): Money Manager and its customization are untouched.
   - Mode 2 (*Personal Only*): Money Manager state (including `preferences.customization`) is fully restored to disk and memory.
   - Mode 3 (*Full Restore*): Both domains are committed atomically.
4. **Safety Verification**: `test_qa_data_security_backup.js` confirms that all 16 backup/restore test cases pass with 100% integrity.

---

## 3. FINANCIAL AND BUSINESS DATA SAFETY BOUNDARIES

During UI/UX modernization, frontend modifications must strictly respect the boundary between UI rendering and core backend services. Under no circumstances should backend engines or their data models be edited.

```
+--------------------------------------------------------------------------------+
|                        PROTECTED DATA SERVICES BOUNDARY                        |
|                                                                                |
|   +-----------------------+   +----------------------+   +-----------------+   |
|   |   ledgerEngine.js     |   | storageRepository.js |   |  mmService.js   |   |
|   |  - Running balances   |   |  - WriteQueue        |   |  - Net Worth    |   |
|   |  - Double-entry math  |   |  - Concurrency lock  |   |  - Analytics    |   |
|   |  - Integer paisa math |   |  - Multi-business    |   |  - Budgets      |   |
|   +-----------------------+   +----------------------+   +-----------------+   |
|                                                                                |
|   +------------------------------------------------------------------------+   |
|   |                   googleDriveBackupService.js                          |   |
|   |  - SHA-256 Checksums  - User Sub Ownership  - Privacy Scrubbing        |   |
|   +------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------+
                                       ▲
                                       │ READ-ONLY CONSUMPTION ONLY
                                       │ (Zero mutations during UI tasks)
+--------------------------------------------------------------------------------+
|                        FRONTEND PRESENTATION LAYER                             |
|                                                                                |
|       App.js   •   part1/3/5 modules   •   themeService   •   i18nService      |
+--------------------------------------------------------------------------------+
```

1. **`src/ledgerEngine.js`**:
   - **Responsibility**: Authoritative double-entry ledger calculation, customer/supplier balances, cashbox reconciliation, journal transactions.
   - **Invariants**:
     - Running balance calculation: O(N + M log M) indexed batch algorithm.
     - Cash entry synchronization: Each transaction with cash impact creates or updates corresponding cash entries atomically.
     - Mathematical precision: Integer paisa calculation (`Math.round(taka * 100)`) preventing JavaScript floating-point drift.
2. **`src/storageRepository.js`**:
   - **Responsibility**: Physical persistence and concurrency serialization.
   - **Invariants**:
     - All AsyncStorage writes must pass through `WriteQueue` to serialize disk writes.
     - Multi-business datasets must maintain strict isolation using business-scoped identifiers.
3. **`src/moneyManagerService.js`**:
   - **Responsibility**: Personal money management business logic.
   - **Invariants**:
     - Complete isolation: Personal records must never touch the business accounting database (`@tallykhata_v6_authoritative`).
     - Net Worth invariant: `calculateNetWorth()` must always account for both active and archived wallets.
     - Single-pass analytics: `calculatePeriodMetrics()` accumulates income, expenses, and category totals in a single O(N) pass (~4ms over 3,000 transactions).
     - Goal funding balance neutrality: Goal deposits and withdrawals must debit/credit wallets atomically via internal transfer records (`isGoalTransfer: true`).
4. **`src/googleDriveBackupService.js`**:
   - **Responsibility**: End-to-end cloud synchronization and cryptographic data protection.
   - **Invariants**:
     - Plaintext PIN is scrubbed from backup payloads for privacy.
     - FIPS 180-4 SHA-256 checksum validation ensures zero data tampering.
     - Restores must support domain-selective commit (business-only, personal-only, full).

---

## 4. DESIGN RESEARCH REFERENCES & APPLICATION TO TALLYKHATA

To guide the UI modernization, the following four official design and performance standards were reviewed and mapped to TallyKhata's architecture:

### 4.1 Material Design 3 Semantic Color System
- **Reference**: [Material Design 3 Color System](https://m3.material.io/styles/color/the-color-system)
- **Core Principles**:
  - Semantic role-based color definition (`primary`, `onPrimary`, `surface`, `onSurface`, `outline`, `error`).
  - Dynamic accessibility: Contrast ratios adhering to WCAG 2.1 AA (minimum 4.5:1 for body text, 3:1 for large text and graphical components).
  - Tonal palettes that adapt consistently across Light and Dark themes.
- **Application to TallyKhata**:
  - Directly addresses the **1,510 hardcoded hex colors** identified in `App.js`.
  - Replaces arbitrary hex codes (e.g. `#B81414`, `#1E293B`, `#64748B`, `#E2E8F0`) with semantic tokens from `src/themeService.js` (`currentTheme.primary`, `currentTheme.textPrimary`, `currentTheme.textSecondary`, `currentTheme.cardBorder`).
  - Guarantees readable contrast for Bengali text across both Light and Dark modes.

### 4.2 React Native Responsive Layouts (`useWindowDimensions`)
- **Reference**: [React Native useWindowDimensions Hook](https://reactnative.dev/docs/usewindowdimensions)
- **Core Principles**:
  - Automatic reactivity to display dimension changes (device rotation, Android multi-window split screen, foldable unfolding).
  - Clean separation from static `Dimensions.get()`, which does not trigger re-renders on layout change.
- **Application to TallyKhata**:
  - `App.js` currently contains static `Dimensions.get('window').width` calls that fail to adjust when Android split-screen or foldables change screen width.
  - Migrating grid layouts (e.g. 4-column quick action icons on Home screen, 2-column wallet grid in Money Manager) to dynamic `useWindowDimensions` ensures flawless display across device aspect ratios.

### 4.3 React Native Performance Optimization
- **Reference**: [React Native Performance Guidelines](https://reactnative.dev/docs/performance)
- **Core Principles**:
  - Avoiding expensive inline object allocations in render paths.
  - Memoization of computed views and complex list items using `React.memo`, `useMemo`, and `useCallback`.
  - Maintaining 60 FPS on the JavaScript thread by avoiding synchronous heavy computations during UI animations.
- **Application to TallyKhata**:
  - TallyKhata's customer list (up to thousands of ledger accounts) and transaction list require windowed list rendering (`FlatList` with `getItemLayout` and tuned `initialNumToRender`).
  - `themeService.getThemedStyles` must remain memoized (`useMemo([currentTheme, isDark])`) so that 180+ style rules are not re-compiled on every single state tick or keystroke.

### 4.4 Android Adaptive Layout Guidelines
- **Reference**: [Android Adaptive App Quality Guidelines](https://developer.android.com/docs/quality-guidelines/adaptive-app-quality)
- **Core Principles**:
  - Support for Window Size Classes: Compact (<600dp), Medium (600–840dp), and Expanded (>840dp).
  - Adaptive bottom sheets, navigation rails, and responsive modal dialogues.
- **Application to TallyKhata**:
  - Bangladeshi SME merchants use devices ranging from low-end 4.7-inch budget smartphones (320–360dp width) to 10-inch retail POS tablets (800dp+ width).
  - Modals (such as `modalMMPreferences`, `modalMMAddTxn`, `modalAddCustomer`) must employ scrollable content containers with percentage-based maximum widths (`maxWidth: 540`, `alignSelf: 'center'`) on tablet screens, preventing oversized, stretched form inputs.

---

## 5. PHASE 1 VERIFICATION & TEST EVIDENCE

All financial calculation and safety verification test suites were executed to establish a baseline before any UI redesign work begins:

```
=== TEST EXECUTION RESULTS ===
1. node test_money_management.js
   Result: 70/70 TESTS PASSED (100%)
   Coverage: Net worth invariance, integer paisa math, atomic goal deposits/withdrawals,
             recurring transaction idempotence, budget calculation, category protection.

2. node test_ui_modernization_theme_perf.js
   Result: 16/16 TESTS PASSED (100%)
   Coverage: 12 modernized sample customer names, Bengali/English cashbox localization,
             theme persistence, language fallback, O(1) indexed lookup performance,
             single-pass O(N) calculatePeriodMetrics (<5ms over 3,000 txns), WriteQueue concurrency.

3. node test_qa_data_security_backup.js
   Result: 16/16 TESTS PASSED (100%)
   Coverage: Full backup field retention, PIN privacy scrubbing, selective restore (3 modes),
             SHA-256 integrity checksum, ownership verification, local safety snapshots.

TOTAL TEST VERIFICATION: 102 / 102 TESTS PASSED (100%)
```

---

## 6. CONCLUSION & RECOMMENDATIONS FOR PHASE 2

1. **Preserve Protected Services**: All backend services (`ledgerEngine.js`, `storageRepository.js`, `moneyManagerService.js`, `googleDriveBackupService.js`) must remain completely untouched during UI implementation.
2. **Systematic Token Migration**: Phase 2 UI modernization should systematically replace inline hardcoded hex colors with semantic tokens from `src/themeService.js`.
3. **Resolve Customization Engine Status**: For the Money Manager customization engine, either:
   - *Option A*: Wire the existing `mmCustomization` preset colors, tints, and font scales to the consumer card styles in `App.js` so they become genuinely functional.
   - *Option B*: Formally integrate them into the global `themeService` token system to avoid duplicate theming concepts.
4. **Responsive Layouts**: Replace static dimension queries with dynamic hooks to support Android adaptive layout guidelines.

---
*Report prepared and certified by Worker 2 (Averroes), Backend & Data Architect for TallyKhata.*
