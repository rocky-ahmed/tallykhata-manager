# REA RECONSTRUCTION — REFERENCE NAVIGATION MAP
**Target Application:** `TallyKhata-Demo.apk` (`REF-001`)  
**Maintained by:** Main Engineering Orchestrator  
**Status:** MAPPED & VERIFIED  

---

## 1. Top-Level Activity & Fragment Architecture

```
                                  [ SplashScreenActivity ]
                                             |
                                             v
                                     [ MainActivity ]
                                             |
         +--------------------+--------------+--------------------+--------------------+
         |                    |                                   |                    |
         v                    v                                   v                    v
  [ HomeFragment ]   [ CashbookFragment ]                 [ WalletFragment ]   [ ProfileFragment ]
  (হিসাব / খাতা)       (ক্যাশবাক্স)                          (তালীপে)              (মেনু)
         |                    |                                   |                    |
         |-- Top Cards        |-- Cash In / Out Register          |-- Digital Wallet   |-- Business Switcher
         |   (মোট পাবো /      |-- Opening Balance                 |-- Bangla QR        |-- Reports
         |    মোট দেবো)       |-- Cash Adjustment Modal           |-- Payment History  |-- Tagada Reminders
         |                    |-- Daily Statement View            |-- Settlement       |-- Notes
         |-- Dual Tab                                                                  |-- Backup & Restore
         |   (কাস্টমার /                                                                |-- Settings & Theme
         |    সাপ্লায়ার)
         |
         |-- CustomerAccountActivity (খতিয়ান / Ledger History)
         |       |
         |       |-- Sticky Bottom Action Bar: [ দিলাম (-) ]  [ পেলাম (+) ]
         |       |
         |       +--> CreditEntryActivity (লেনদেন এন্ট্রি)
         |                |-- Amount & Upfront Cash Input
         |                |-- Date Picker Modal
         |                |-- Note / Description
         |                +-- Mode Switcher (নগদ / ডিজিটাল)
```

---

## 2. Navigation State & Modal Dismissal Priority (BackHandler)

When the Android hardware back button is pressed, the application strictly evaluates the following dismissal hierarchy:

1. **Transaction Entry Modals (`modalAddTxn`, `modalEditTxn`):**
   - Dismisses without saving uncommitted draft. Returns `true`.
2. **Account Creation & Quick Modals (`modalAddAccount`, `modalCashAdjust`):**
   - Closes active modal overlay. Returns `true`.
3. **Filter & Date Picker Dialogs (`modalReportFilter`, `modalDatePicker`):**
   - Closes dialog overlay. Returns `true`.
4. **Money Manager Modal Overlays (Wallets, Categories, Budgets):**
   - Closes Money Manager sub-modal. Returns `true`.
5. **Screen Level Back Navigation:**
   - If in `account_ledger` or `report_view`, navigates back to `home` tab. Returns `true`.
   - If in non-home tab (`cashbox`, `wallet`, `profile`), switches tab to `home`. Returns `true`.
6. **Application Exit:**
   - If on `home` tab with no active modals, permits clean OS exit. Returns `false`.

---

## 3. Money Manager V3 Embedded Flow
Accessible from Main Navigation:
- **Dashboard Hub:** Net savings, expense summary, recent transactions.
- **Transactions Tab:** Filterable chronological list (All, Income, Expense, Transfer).
- **Wallets Tab:** Multi-account balances (Cash, Bank, bKash, Nagad).
- **Budgets Tab:** Category monthly spending limits with progress indicators.
- **Goals Tab:** Savings target tracker with milestone alerts.
- **Analytics Tab:** Visual spend distribution by category.
- **Categories Tab:** Standard & custom transaction tags.
- **Reports Tab:** Exportable monthly financial summaries.
