# FORM AND MODAL POLISH REPORT: KEYBOARD ERGONOMICS & ACCESSIBILITY
**TallyKhata (tallybook-expo) — Phase 11 Form Usability & Input Architecture**
**Author:** Worker 1 (Gibbs) — Frontend & UI/UX Specialist
**Permanent Thread ID:** `01a19154-99ab-72a0-9e23-2611b9ffc74c`
**Standard Applied:** Android Software Keyboard Handling, WCAG 2.2 Form Accessibility, Bengali Input Ergonomics

---

## 1. Keyboard Avoidance & Persistence Architecture

A common usability flaw in mobile forms occurs when tapping a submit button, selector chip, or secondary input field while the soft keyboard is open: without explicit handling, the first tap merely dismisses the keyboard without registering the action, forcing the user to tap twice.

In Phase 11, Worker 1 conducted a comprehensive audit of all 67 `ScrollView` components in `App.js` and eliminated this friction by enforcing `keyboardShouldPersistTaps="handled"` across all ScrollViews containing interactive `TextInput` elements.

### 1.1 Complete Form ScrollView Registry

| Form / Screen / Modal | ScrollView Opening Tag | `keyboardShouldPersistTaps` Status |
| :--- | :--- | :--- |
| **SCR-23: Tagada Tab** | `<ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED (Phase 11)** |
| **SCR-07: Add Txn Modal** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED (Phase 11)** |
| **SCR-12: Cash Reconcile** | `<ScrollView style={{ marginVertical: 8 }} keyboardShouldPersistTaps="handled">` | **VERIFIED (Phase 11)** |
| **SCR-20: Stock & Inventory** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED (Phase 11)** |
| **SCR-24: Business Notes** | `<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 10 }}>` | **VERIFIED (Phase 11)** |
| **SCR-27: Shop Settings** | `<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 10 }}>` | **VERIFIED (Phase 11)** |
| **SCR-30: Selective Restore** | `<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>` | **VERIFIED (Phase 11)** |
| **MM: Add Txn Modal** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED** |
| **MM: Edit Txn Modal** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED** |
| **MM: Add Wallet Modal** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED** |
| **MM: Set Budget Modal** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED** |
| **MM: Total Budget Modal** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED** |
| **MM: Add Category Modal** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED** |
| **MM: Add Goal Modal** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED** |
| **MM: Deposit Goal Modal** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED** |
| **MM: Customization Hub** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED (Phase 11)** |
| **MM: Recurring List** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED (Phase 11)** |
| **MM: Add Recurring** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED (Phase 11)** |
| **MM: Edit Category** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED (Phase 11)** |
| **MM: Custom Date Range** | `<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" ...>` | **VERIFIED** |

---

## 2. Input Hierarchy & Visual Grouping

### 2.1 Standardized Input Heights & Spacing
- **Primary Input Fields (`modalSimpleInput`, `mmInput`):** Standard height 46-48dp, border radius 10-12dp, padding horizontal 14dp.
- **Input Surfaces:** Mapped to `currentTheme.inputSurface` with `currentTheme.inputBorder` / `cardBorder`.
- **Placeholder Text:** Light mode uses `#94A3B8` / `#9CA3AF`; Dark mode uses `#64748B` / `currentTheme.textMuted`, guaranteeing WCAG contrast without competing with entered text.
- **Focus Highlighting:** Active inputs highlight with `currentTheme.primary` or theme preset accent stroke.

### 2.2 Localized Labels & Error States
- All form labels use `TYPOGRAPHY_SCALES.formLabel` (13sp, font weight 600, line height 19dp) with Bengali Unicode text.
- Form validation provides clear, contextual feedback (e.g. "নাম আবশ্যক", "টাকার পরিমাণ সঠিক নয়") using `Alert.alert` or inline danger text, preventing silent failures.

---

## 3. Modal Header Hierarchy & Visual Architecture

Each modal adheres to a unified visual scaffold:
1. **Header Row:** Sits at the top of the modal card with `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`.
2. **Title:** Uses `modalCardTitle` or `mmModalTitle` (17-18sp, font weight bold), themed dynamically with `isDark && tStyles.textPrimary`.
3. **Close Button:** Always positioned at the top right, styled as a subtle circular surface with touch hitSlop expanding to $ge 52\times 52\text{dp}$.
4. **Bottom Safe Area Padding:** Modal scroll containers specify `contentContainerStyle={{ paddingBottom: 24 }}` (or 95dp for root tab scroll containers), ensuring the bottom inputs and CTA buttons never clip beneath Android system navigation bars or gesture pills.

---
*Verified by Worker 1 (Gibbs) — Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c*
