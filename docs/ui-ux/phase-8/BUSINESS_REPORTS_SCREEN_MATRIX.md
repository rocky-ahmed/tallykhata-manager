# TALLYKHATA — PHASE 8 BUSINESS REPORTS SCREEN IMPLEMENTATION MATRIX
## Comprehensive Surface Inventory & Audit Across All 7 Business Financial Reports

---

## 1. BUSINESS REPORTS SURFACES & COMPONENT MAPPING

| Screen ID | Surface / Screen Name | Component Identifier | Source File & Location | Parent Route / Trigger | Interaction Capabilities | Multi-Business Scope | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SCR-19** | Baki / Due Report | `modalBakiReport` | `App.js:9001-9125` | Menu Tab (`menu_item_baki_report`) / Home Quick Grid / Cashbox report shortcut | • High-density 3D KPI cards: মোট পাবো (কাস্টমার বাকি), মোট দেবো (সাপ্লায়ার বাকি), নীট পাওনা<br>• Breakdown counts: বাকি কাস্টমার ও বকেয়া সাপ্লায়ার সংখ্যা<br>• Drill-down customer list with direct `তাগাদা পাঠান` button<br>• Supplier payable list with due balances<br>• Statement sharing via Android Sharesheet | Scoped to active business accounts (`businessAccounts`) | **FULLY REDESIGNED** |
| **SCR-20** | Cash Report | `modalCashReport` | `App.js:9128-9240` | Menu Tab (`menu_item_cash_report`) / Cashbox quick action | • Current cashbox balance 3D metric card<br>• Inflow vs Outflow timeline cards<br>• Category badge tags (`ক্যাশ ইন` / `ক্যাশ আউট`)<br>• Bengali date and time timestamps<br>• Full cash statement share via WhatsApp/SMS | Scoped to active business cash entries (`businessCashEntries`) | **FULLY REDESIGNED** |
| **SCR-21** | Profit & Loss Statement | `modalProfitLoss` | `App.js:7917-7965` | Menu Tab (`menu_item_profit_loss`) | • Financial statement rows: মোট বিক্রয় (নগদ + বাকি), মাল ক্রয় বাবদ দেনা/ব্যয়, দোকান পরিচালনা খরচ<br>• Net profit calculation: $\max(0, \text{Sales} - \text{COGS} - \text{Expenses})$<br>• Tactile 3D card surface with Light & Dark theme parity<br>• Shareable P&L summary | Scoped to active business accounting aggregates | **FULLY REDESIGNED** |
| **SCR-22** | Full Business Statement | `modalFullReport` | `App.js:7967-8025` | Menu Tab (`menu_item_full_report`) | • Consolidated asset summary: কাস্টমার বাকি, সাপ্লায়ার দেনা, ক্যাশ টাকা, স্টক পণ্যের ক্রয়মূল্য<br>• Total business net worth: $\text{Cash} + \text{Receivables} + \text{Stock Cost}$<br>• Comprehensive statement share text formatting with merchant details | Scoped to active business entities | **FULLY REDESIGNED** |
| **SCR-23** | Sales & Purchase Report | `modalBechaKena` | `App.js:8852-9000` | Cashbox category click (`sale` / `buy`) / Menu Tab | • KPI summary: মোট বেচা (ক্যাশ + বাকি), মোট কেনা (ক্যাশ + বাকি), নীট ব্যবধান<br>• Granular sub-KPI strip: ক্যাশ বেচা, বাকি বেচা, নীট লাভ<br>• Chronological transaction list with cash/credit badges<br>• Full statement sharing via Android Sharesheet | Scoped to active business transactions | **FULLY REDESIGNED** |
| **SCR-24** | Shop Expense Report | `modalExpenseReport` | `App.js:9244-9310` | Cashbox category click (`cost`) / Menu Tab | • Total shop expense KPI card with high-contrast badge<br>• Direct `+ খরচ লিখুন` shortcut triggering `modalAddCash`<br>• Expense item card timeline with category tags<br>• Resolved legacy text duplication glitches (`- ৳ - ৳`, `খরচ খরচ`) | Scoped to active business expense entries | **FULLY REDESIGNED** |
| **SCR-25** | Owner Equity Report | `modalMalikReport` | `App.js:9312-9420` | Cashbox category click (`malik_in` / `malik_out`) / Menu Tab | • Owner capital inflow (`মালিকের জমা`) vs withdrawal (`মালিকের উত্তোলন`)<br>• Net owner equity calculation<br>• Chronological owner cash movement timeline<br>• Statement sharing | Scoped to active business owner entries | **FULLY REDESIGNED** |

---

## 2. DATA BINDINGS & STATE DEPENDENCIES

| Screen ID | Reactive State Variable | Data Source / Storage Key | Aggregation Logic | Underlying Integrity Invariant |
| :--- | :--- | :--- | :--- | :--- |
| **SCR-19** | `totalCustomerDue`, `totalSupplierDue`, `accounts` | `businessAccounts` | Sum of positive balances by type | Integer paisa precision; Customer ($type=1$), Supplier ($type=2$) |
| **SCR-20** | `totalCash`, `cashEntries` | `businessCashEntries` | Inflow minus outflow running total | Zero floating-point drift via `ledgerEngine` |
| **SCR-21** | `todaySales`, `todayCosts`, `totalCustomerDue`, `totalSupplierDue` | Active business ledger aggregates | Accounting P&L standard formula | Consistent double-entry categorization |
| **SCR-22** | `totalCash`, `totalCustomerDue`, `totalStockCost` | Multi-collection aggregates | $\text{Cash} + \text{Receivables} + \text{Stock}$ | 100% synchronized across inventory and cashbox |
| **SCR-23** | `cashEntries`, `journals` | Active business cash & journal entries | Cash sales + Credit sales vs Cash buy + Credit buy | Strictly isolated by `activeBusinessId` |
| **SCR-24** | `cashEntries` where `category === 'cost'` | Active business cash entries | Sum of operating expenses | Formatted in Bengali with negative signage |
| **SCR-25** | `cashEntries` where `category === 'malik_*'` | Active business cash entries | Malik In minus Malik Out | Preserves capital vs withdrawal audit log |

---

## 3. KEYBOARD & HARDWARE NAVIGATION PARITY

- **Android Hardware Back**:
  - All 7 report modals hook into `BackHandler` (`App.js:1979-2000`) and dismiss cleanly without unmounting parent navigation or resetting state.
