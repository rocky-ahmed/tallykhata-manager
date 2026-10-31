# TALLYKHATA — PHASE 3 MAIN NAVIGATION REDESIGN REPORT
## Bottom Navigation Bar Modernization, 3D Pill Indicator & Route Preservation

**Phase:** Phase 3 — Shared UI Components, Professional 3D Visual System, Home Screen & Navigation Redesign
**Date:** 2026-10-31
**Component Scope:** Bottom Navigation Bar (`bottomTabBar` in `App.js`) & 4 Primary Tabs
**Lead Architect:** Main Agent & Worker 1: Gibbs (Frontend Specialist)
**Target Hardware:** Xiaomi Redmi Note 9 (1080x2340 px)

---

## 1. NAVIGATION ARCHITECTURE & ROUTE VERIFICATION

The TallyKhata application features four persistent bottom navigation tabs wired directly to core business accounting workflows:

| Tab Index | Route Key | Display Label (Bengali / English) | Primary Screen Bound | Active Icon Asset |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `home` | হিসাব / Tally | Customer & Supplier Ledger Dashboard | `assets/nav/nav_home_active.png` |
| 2 | `cashbox` | ক্যাশবক্স / Cashbox | Daily Cashbook & Balance Management | `assets/nav/nav_cashbox_active.png` |
| 3 | `tallypay` | টালি-পে / TallyPay | Digital Payment & Wallet Ledger | `assets/nav/nav_tallypay_active.png` |
| 4 | `menu` | মেন্যু / Menu | Shop Profile, Reports & App Settings | `assets/nav/nav_menu_active.png` |

*Note: The `tagada` workflow is accessible via the Quick Actions Grid on the Home screen and maintains seamless sub-navigation.*

---

## 2. VISUAL & INTERACTIVE UPGRADES

### 2.1 3D Squircle Active Pill Indicator
- **Geometry:** When a tab is selected, it renders an active 3D squircle pill (`tabActivePill`) with 64dp width, 32dp height, and 16dp continuous border radius.
- **Color Token Consumption:**
  - Light Mode: `currentTheme.primaryLight` (`#FEF2F2`) background with `currentTheme.tabActive` (`#B81414`) icon tint.
  - Dark Mode: `currentTheme.primaryLight` (`#3F1212`) background with `currentTheme.tabActive` (`#EF4444`) icon tint.
- **Extrusion & Elevation:** 1dp top highlight and subtle inset border creating a tactile inset switch effect.

### 2.2 Inactive Tab Styling & Optical Balance
- Rendered with `tabInactive` (`#64748B` in Light, `#94A3B8` in Dark), achieving WCAG 2.2 AA non-text contrast against the white/dark tab bar background.
- Inactive icons centered optically without background pill clutter.

### 2.3 Typography & Bengali Localization
- Standardized to 11dp medium/semibold font weight using `t("tab_home")`, `t("tab_cashbox")`, `t("tab_tallypay")`, and `t("tab_menu")`.
- Line height calibrated to 16dp (1.45x ratio), preventing descender or vowel-sign truncation.

### 2.4 Touch Target & Accessibility Verification
- Each of the 4 tab buttons spans a 98dp horizontal width and 62dp vertical height.
- The effective touch area is 98x62dp, which is 260% larger than the minimum 48x48dp Android requirement.
- Full accessibility metadata: `accessibilityRole="button"` and localized `accessibilityLabel` attached to every tab.

---

## 3. ZERO-REGRESSION ROUTE INTEGRITY

- All deep-linking and state triggers (`handleUrl`, `handleOpenEditAccount`, `handleDeleteAccount`) continue to switch tabs flawlessly.
- Android hardware back button handler (`BackHandler`) prioritizes sub-modals, then non-home tabs (redirecting back to `home`), and finally exits when on `home`.