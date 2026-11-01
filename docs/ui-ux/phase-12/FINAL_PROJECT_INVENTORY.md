# TALLYKHATA — PHASE 12: FINAL PROJECT INVENTORY
## Complete Application Architecture, Screen, Modal, Service, and Asset Inventory

---

## 1. Architectural Overview
- **Application Name:** টালিখাতা (TallyKhata Offline)
- **Package ID:** `com.progoti.tallykhata.offline`
- **Application Slug:** `tallykhata-offline`
- **Version:** `4.0.0` (versionCode: 1)
- **Framework & Runtime:** React Native 0.86.3 / React 19.2.3 / Expo SDK 57 (Bare Workflow with Dev Client)
- **JavaScript Engine:** Hermes (Enabled)
- **Architecture:** React Native New Architecture (TurboModules & Fabric enabled)
- **Display Mode:** Edge-to-Edge display with light navigation bar styling
- **Storage Layer:** `@react-native-async-storage/async-storage` 2.2.0 with serialized mutex WriteQueue

---

## 2. Screen & Tab Navigation Inventory (20 Primary Screens)

| # | Screen ID | Display Name (Bengali / English) | Primary Navigation Access | Technical View / Tab Identifier |
| :- | :--- | :--- | :--- | :--- |
| 1 | `SCR-01` | হোম ড্যাশবোর্ড / Home Dashboard | Bottom Tab 1 | `activeTab === "home"` |
| 2 | `SCR-02` | খরিদ্দার লেজার / Customer Ledger | Home Tab -> Segment 1 | `ledgerSegment === "customer"` |
| 3 | `SCR-03` | পাওনাদার লেজার / Supplier Ledger | Home Tab -> Segment 2 | `ledgerSegment === "supplier"` |
| 4 | `SCR-04` | কাস্টমার বিস্তারিত / Customer Details | Customer List Item Tap | `modalCustomerDetails` |
| 5 | `SCR-05` | সাপ্লায়ার বিস্তারিত / Supplier Details | Supplier List Item Tap | `modalSupplierDetails` |
| 6 | `SCR-06` | নতুন লেনদেন / Add Transaction | Fab / Quick Action | `modalAddTxn` |
| 7 | `SCR-10` | ক্যাশবক্স / Cashbox Dashboard | Bottom Tab 2 | `activeTab === "cashbox"` |
| 8 | `SCR-11` | ক্যাশ এন্ট্রি / Add Cash In-Out | Cashbox Action Bar | `modalAddCash` |
| 9 | `SCR-12` | ক্যাশ মেলানো / Reconcile Cashbox | Cashbox Action Bar | `modalReconcileCash` |
| 10 | `SCR-15` | টালি পে / Tali Pay Dashboard | Bottom Tab 3 | `activeTab === "tallypay"` |
| 11 | `SCR-16` | বাংলা কিউআর / Bangla QR | Tali Pay Action Bar | `modalBanglaQR` |
| 12 | `SCR-17` | টাকা লোড / Add Money | Tali Pay Action Bar | `modalAddMoney` |
| 13 | `SCR-18` | টাকা ট্রান্সফার / Money Out | Tali Pay Action Bar | `modalMoneyOut` |
| 14 | `SCR-19` | লেনদেন সীমা ও চার্জ / Txn Limits | Tali Pay Header | `modalTxnLimit` |
| 15 | `SCR-20` | পণ্য ও স্টক তালিকা / Inventory Catalog | Quick Actions Grid | `modalStock` |
| 16 | `SCR-21` | স্টক সমন্বয় / Stock In-Out | Inventory Item Tap | `modalStockAdjust` |
| 17 | `SCR-25` | তাগাদা ও বকেয়া / Tagada Due | Quick Actions Grid | `modalTagada` |
| 18 | `SCR-26` | নোট ও করণীয় / Business Notes | Quick Actions Grid | `modalNotes` |
| 19 | `SCR-30` | ব্যবসার হিসাব রিপোর্ট / Business Reports | Quick Actions Grid | `modalReportsHub` |
| 20 | `SCR-40` | পার্সোনাল মানি ম্যানেজার / Money Manager | Quick Actions Grid | `modalMoneyManager` |

---

## 3. Modal Dialog Inventory (53 Modals)

Every modal in `App.js` implements an explicit `onRequestClose` handler for hardware back navigation:
1. `modalAddTxn` — নতুন লেনদেন ভাউচার
2. `modalCustomerDetails` — কাস্টমার খতিয়ান বিবরণ
3. `modalSupplierDetails` — সাপ্লায়ার খতিয়ান বিবরণ
4. `modalAddAccount` — নতুন কাস্টমার/সাপ্লায়ার তৈরি
5. `modalStock` — পণ্য ও স্টক ব্যবস্থাপনা ক্যাটালগ
6. `modalAddProduct` — নতুন পণ্য এন্ট্রি
7. `modalStockAdjust` — পণ্যের স্টক ইন/আউট সমন্বয়
8. `modalTagada` — তাগাদা ও বকেয়া আদায় বার্তা
9. `modalNotes` — নোটস ও শপ রিমাইন্ডার
10. `modalAddNote` — নতুন নোট তৈরি
11. `modalBusinessPicker` — ব্যবসা পরিচালনা ও পরিবর্তন
12. `modalAddBusiness` — নতুন ব্যবসা তৈরি
13. `modalAddCash` — ক্যাশবক্স ইন/আউট এন্ট্রি
14. `modalReconcileCash` — ক্যাশবক্স নোট গণনা ও মেলানো
15. `modalBanglaQR` — বাংলা কিউআর পেমেন্ট ডিসপ্লে
16. `modalAddMoney` — টালি পে ওয়ালেট রিচার্জ
17. `modalMoneyOut` — টালি পে টাকা উত্তোলন
18. `modalTxnLimit` — টালি পে লিমিট ও চার্জেস
19. `modalProfitLoss` — রিপোর্ট ১: লাভ-ক্ষতি হিসাব
20. `modalFullReport` — রিপোর্ট ২: পূর্ণাঙ্গ ব্যালেন্স শীট
21. `modalBechaKena` — রিপোর্ট ৩: দৈনিক ও মাসিক বেচাকেনা
22. `modalBakiReport` — রিপোর্ট ৪: বাকির খাতা বিবরণী
23. `modalCashReport` — রিপোর্ট ৫: ক্যাশ স্টেটমেন্ট
24. `modalExpenseReport` — রিপোর্ট ৬: পরিচালন খরচ রিপোর্ট
25. `modalMalikReport` — রিপোর্ট ৭: মালিকানা খতিয়ান ও ইকুইটি
26. `modalMoneyManager` — পার্সোনাল মানি ম্যানেজার ড্যাশবোর্ড
27. `modalMMAccounts` — মানি ম্যানেজার ওয়ালেট ও ব্যাংক তালিকা
28. `modalMMAddAccount` — নতুন ওয়ালেট/অ্যাকাউন্ট তৈরি
29. `modalMMCategories` — মানি ম্যানেজার ক্যাটাগরি ম্যানেজার
30. `modalMMAddCategory` — নতুন আয়/ব্যয় ক্যাটাগরি তৈরি
31. `modalMMBudgets` — ক্যাটাগরিভিত্তিক বাজেট ব্যবস্থাপনা
32. `modalMMGoals` — সেভিংস লক্ষ্য ও গোল ট্র্যাকার
33. `modalMMAddGoal` — নতুন আর্থিক গোল তৈরি
34. `modalMMRecurring` — রিকারিং পেমেন্ট ও সাবস্ক্রিপশন
35. `modalMMAddRecurring` — নতুন রিকারিং রুল তৈরি
36. `modalMMCustomization` — মানি ম্যানেজার থিম ও ৫-লেয়ার কাস্টমাইজেশন
37. `modalMMSectionCustomization` — সেকশন-লেভেল মাইক্রো-কাস্টমাইজেশন
38. `modalMMAnalytics` — মাসিক ক্যাশ ফ্লো ও পাই-চার্ট ডিস্ট্রিবিউশন
39. `modalMMFilters` — ট্রানজ্যাকশন সার্চ ও অ্যাডভান্সড ফিল্টার
40. `modalAppearanceSettings` — অ্যাপ থিম (Light / Dark / System)
41. `modalLanguageSettings` — ভাষা নির্বাচন (বাংলা / English)
42. `modalSecuritySettings` — অ্যাপ সিকিউরিটি ও ৪-ডিজিট পিন লক
43. `modalBackupRestore` — গুগল ড্রাইভ ও লোকাল ক্লাউড ব্যাকআপ
44. `modalDataStorage` — ক্যাশ ও অফলাইন ডাটা স্টোরেজ ব্যবহার
45. `modalNotifications` — পুশ ও লোকাল নোটিফিকেশন সেটিংস
46. `modalAboutApp` — অ্যাপ ভার্সন, লাইসেন্স ও শর্তাবলী
47. `modalHelpSupport` — কাস্টমার সাপোর্ট হেল্পলাইন ও টিউটোরিয়াল
48. `modalInbox` — নোটিফিকেশন ইনবক্স ও আপডেট মেসেজ
49. `modalExportData` — হিসাব এক্সপোর্ট ও ব্যাকআপ ফাইল ডাউনলোড
50. `modalConfirmDelete` — ডাটা মুছে ফেলার কনফার্মেশন ডায়ালগ
51. `modalCameraQR` — কিউআর কোড স্ক্যানার ক্যামেরা
52. `modalReconcileHistory` — পূর্ববর্তী ক্যাশবক্স মেলানোর অডিট হিস্ট্রি
53. `modalFeedback` — ব্যবহারকারীর মতামত ও রেটিং

---

## 4. Backend Services & Core Architecture Modules

1. **`src/storageRepository.js`:** Authoritative data storage adapter with serialized `writeQueue` mutex, automatic backup snapshots, SHA-256 integrity checksum calculation, multi-business cascade deletion, and multi-domain restore isolation.
2. **`src/ledgerEngine.js`:** Integer paisa double-entry accounting engine, running balance recalculation, multi-business tenancy scoping, cashbox reconciliation, and WeakMap calculation memoization.
3. **`src/moneyManagerService.js`:** Clean-room Personal Money Manager domain, 5-layer customization cascading engine, budget vs actual variance calculations, and WeakMap cached net-worth/cash-flow analytics.
4. **`src/preferencesService.js`:** Global application preferences (Preferences V2), font scaling clamping (0.85 - 1.30), display density calculation, security auto-lock timeouts, and backup schedule configuration.
5. **`src/themeService.js`:** Semantic token system with 100% key symmetry across `LIGHT_THEME` and `DARK_THEME`, WCAG 2.2 AA compliant contrast pairs, and 8 tactile quick-action palettes.
6. **`src/typographyTokens.js`:** 10 standardized typography scales with Bengali-safe line-height ratio >= 1.40x to prevent glyph and vowel clipping.
7. **`src/iconMetrics.js`:** Calibrated optical scales and vertical offsets for all task icons, paired with `STANDARD_TOUCH_HIT_SLOP` (>=10dp) for tactile touch targets.
8. **`src/i18nService.js`:** Complete bilingual translation system with 100% key symmetry between Bengali (`bn`) and English (`en`) dictionaries (680+ keys).
9. **`src/googleDriveBackupService.js`:** User-specific Google Drive AppData folder backup serialization, payload manifest generation, and tamper-proof SHA-256 checksum verification.

---

## 5. Automated Test Suite Registry (32 Suites)
32 suites passing 100% (>580 assertions).
