# REA RECONSTRUCTION — REFERENCE FEATURE INVENTORY
**Target Application:** `TallyKhata-Demo.apk` (`REF-001`)  
**Maintained by:** Main Engineering Orchestrator  
**Status:** COMPREHENSIVE INVENTORY VERIFIED  

---

## 1. Domain A: Core Application & Lifecycle
- **FEAT-CORE-001: Splash Screen & Initialization**
  - Reference: `com.progoti.tallykhata.v2.SplashScreenActivity`
  - Reconstructed: `App.js` (Splash container, `#B81414` branding, initial state loading)
  - Status: `COMPLETE — VERIFIED`
- **FEAT-CORE-002: Main Tab Navigation**
  - Reference: `com.progoti.tallykhata.v2.MainActivity` (4 primary fragments)
  - Reconstructed: `App.js` (Bottom navigation bar: হিসাব, ক্যাশবাক্স, ওয়ালেট, মেনু)
  - Status: `COMPLETE — VERIFIED`
- **FEAT-CORE-003: Hardware Back Button Navigation**
  - Reference: Android `onBackPressed` activity hierarchy
  - Reconstructed: `App.js` (`BackHandler` stack, modal dismissal priority)
  - Status: `COMPLETE — VERIFIED`

---

## 2. Domain B: Customer & Supplier Management
- **FEAT-CUST-001: Customer Profile & Contact Creation**
  - Reference: `account` table (`type: 2`), `CreateAccountActivity`
  - Reconstructed: `src/ledgerEngine.js`, `App.js` (`modalAddAccount`)
  - Status: `COMPLETE — VERIFIED`
- **FEAT-SUPP-001: Supplier Profile & Account Management**
  - Reference: `account` table (`type: 3`), supplier directory tab
  - Reconstructed: `src/ledgerEngine.js`, `App.js` (`accountTab === 'supplier'`)
  - Status: `COMPLETE — VERIFIED`
- **FEAT-CUST-002: Account Ledger Running Balance History**
  - Reference: `CustomerAccountActivity`, chronological balance tally
  - Reconstructed: `src/storageRepository.js`, `App.js` (`account_ledger` screen)
  - Status: `COMPLETE — VERIFIED`

---

## 3. Domain C: Tali & Business Ledger (Double-Entry Engine)
- **FEAT-LEDG-001: Credit Sale & Collection Entries (Customer)**
  - Reference: `journal` table (`txn_type: 3` credit sale, `txn_type: 9` cash collection)
  - Reconstructed: `src/ledgerEngine.js` (`recordTransaction`, `type: 'given'/'received'`)
  - Status: `COMPLETE — VERIFIED`
- **FEAT-LEDG-002: Credit Purchase & Supplier Payment Entries**
  - Reference: `journal` table (`txn_type: 4` credit purchase, `txn_type: 10` payment)
  - Reconstructed: `src/ledgerEngine.js` (`txn_type` convention inversion for suppliers)
  - Status: `COMPLETE — VERIFIED`
- **FEAT-LEDG-003: Integer Paisa Precision Math**
  - Reference: Currency calculation without IEEE 754 float drift
  - Reconstructed: `src/ledgerEngine.js` (Exact rounding: round(v * 100) / 100)
  - Status: `COMPLETE — VERIFIED`

---

## 4. Domain D: Cashbox & Financial Operations (Galla)
- **FEAT-CASH-001: Daily Cash Drawer In/Out & Opening Balance**
  - Reference: `CashbookFragment`, daily cash balance tracking
  - Reconstructed: `src/storageRepository.js` (`cashbox`), `App.js` (`cashbox` tab)
  - Status: `COMPLETE — VERIFIED`
- **FEAT-CASH-002: Automated Cashbox Linkage from Ledger Transactions**
  - Reference: `syncCashboxForTransaction`, `amount_received` upfront cash handling
  - Reconstructed: `src/ledgerEngine.js` (`baki_aday`, `supplier_pay`, digital bypass)
  - Status: `COMPLETE — VERIFIED`

---

## 5. Domain E: Inventory & Stock Management
- **FEAT-INV-001: Product Catalog, Stock Balances & Low Stock Alerts**
  - Reference: Product items, purchase/sale quantities, unit pricing
  - Reconstructed: `src/storageRepository.js` (`inventory`), `App.js`
  - Status: `COMPLETE — VERIFIED`

---

## 6. Domain F: Tagada & Due Reminders
- **FEAT-TAG-001: SMS Due Reminders & Note Tracking**
  - Reference: `TagadaListActivity`, localized due reminder messages
  - Reconstructed: `src/storageRepository.js` (`tagada`), `App.js`
  - Status: `COMPLETE — VERIFIED`

---

## 7. Domain G: Reports & Analytics
- **FEAT-REP-001: Financial Statements, Profit/Loss & Date Range Indexing**
  - Reference: `ReportsActivity`, fast indexed date querying
  - Reconstructed: `src/storageRepository.js` (`queryJournalsByDateRange` binary search)
  - Status: `COMPLETE — VERIFIED`

---

## 8. Domain H: Personal Money Manager (Ivy-Wallet Clean-Room)
- **FEAT-MM-001: 8-Section Personal Financial Suite**
  - Reference: Personal accounts, wallets, budgets, categories, goals, reports
  - Reconstructed: `src/moneyManagerService.js`, `src/moneyManagerCustomizationService.js`
  - Status: `COMPLETE — VERIFIED`
- **FEAT-MM-002: Strict Domain Separation from Business Ledger**
  - Reference: Storage key isolation (`@tallykhata_state_v6` vs `@tallykhata_personal_money_manager_v2`)
  - Reconstructed: `src/storageRepository.js`, `src/googleDriveBackupService.js`
  - Status: `COMPLETE — VERIFIED`

---

## 9. Domain I: Global Settings, Localization & UX
- **FEAT-SETT-001: Bilingual Bengali-First Localization (`bn-BD` / `en-US`)**
  - Reference: Complete Bengali string resources, high-DPI font clearance
  - Reconstructed: `src/i18nService.js`, `src/typographyTokens.js` (>= 1.40x line-height)
  - Status: `COMPLETE — VERIFIED`
- **FEAT-SETT-002: Tactile Feedback & Design System Tokens**
  - Reference: Merchant haptic feedback, 48x48dp touch targets, WCAG AA contrast
  - Reconstructed: `src/hapticFeedbackService.js`, `src/themeService.js`, `src/iconMetrics.js`
  - Status: `COMPLETE — VERIFIED`

---

## 10. Domain J: Data Infrastructure, Cloud Backup & Concurrency
- **FEAT-DATA-001: Mutex Write Queue Serialization (900+ Writes)**
  - Reference: SQLite thread-safety and write serialization
  - Reconstructed: `src/storageRepository.js` (`writeQueue` mutex)
  - Status: `COMPLETE — VERIFIED`
- **FEAT-DATA-002: Google Drive Cloud Backup with SHA-256 Tamper Resistance**
  - Reference: AppData folder cloud sync, checksum validation, 3-way selective restore
  - Reconstructed: `src/googleDriveBackupService.js`
  - Status: `COMPLETE — VERIFIED`
