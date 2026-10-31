# TALLYKHATA — PHASE 4 TALI SCREEN IMPLEMENTATION MATRIX
## Comprehensive Accounting Module Audit & Surface Tracking Across All 13 Tali Screens

| Screen ID | Module / Subsection | Screen / View Name | Route / State Key | Source File & Line Range | UI Status | Screenshot File | Functional Verification | QA Review Status | Classification |
|---|---|---|---|---|---|---|---|---|---|
| **SCR-01** | Home / Tali | Main Dashboard & Summary Card | `activeTab === 'home'` | `App.js:3350-3430` | **3D Transformed** | `tali_dashboard_before.png`, `tali_dashboard_after_light.png`, `tali_dashboard_after_dark.png` | Verified: Due/Payable summary metrics, Quick Grid, Theme & i18n | **PASSED** | Core (P0) |
| **SCR-02** | Home / Tali | Customer List Sub-Tab | `activeTab === 'home' && filterMode === 'customer'` | `App.js:3431-3510` | **3D Transformed** | `tali_dashboard_before.png` | Verified: 12 Bengali sample names, squircle avatars, search filter | **PASSED** | Core (P0) |
| **SCR-03** | Home / Tali | Supplier List Sub-Tab | `activeTab === 'home' && filterMode === 'supplier'` | `App.js:3511-3590` | **3D Transformed** | `supplier_ledger_before.png`, `supplier_ledger_after.png` | Verified: Supplier master list, payable balance indicators, empty state | **PASSED** | Core (P1) |
| **SCR-04** | Home / Tali | Customer & Supplier Account Ledger | `currentScreen === 'account_ledger'` | `App.js:4240-4490` | **3D Transformed** | `customer_ledger_before.png`, `customer_ledger_after.png` | Verified: Running balance, 3D headers, tactile dual entry bar | **PASSED** | Core (P0) |
| **SCR-05** | Home / Tali | Add Customer Modal | `modalAddAccount && isCustomer` | `App.js:4495-4600` | **3D Transformed** | `add_customer_modal.png` | Verified: Name, phone, address, opening balance input, tactile 3D CTA | **PASSED** | Core (P1) |
| **SCR-06** | Home / Tali | Edit Customer / Supplier Modal | `modalEditAccount` | `App.js:4601-4700` | **3D Transformed** | `edit_customer_modal.png` | Verified: Pre-filled account inputs, update & delete hooks | **PASSED** | Core (P1) |
| **SCR-07** | Home / Tali | Add Transaction Modal | `modalAddTxn` | `App.js:4705-4850` | **3D Transformed** | `transaction_form_before.png`, `transaction_form_after.png` | Verified: Tactile numeric keypad, amount display, quick preset chips, dual type (দিলাম/পেলাম) | **PASSED** | Core (P0) |
| **SCR-08** | Home / Tali | Edit Transaction Modal | `modalEditTxn` | `App.js:4851-4960` | **3D Transformed** | `edit_txn_modal.png` | Verified: Amount correction, date/note edit, transaction deletion | **PASSED** | Core (P1) |
| **SCR-09** | Home / Tali | Transaction Voucher View | `modalVoucher` | `App.js:4965-5100` | **3D Transformed** | `voucher_before.png`, `voucher_after.png` | Verified: 100% digital receipt, QR/logo branding, WhatsApp & SMS share, edit/delete hooks | **PASSED** | Core (P0) |
| **SCR-24** | Reports | Due / Baki Report Modal | `modalDueReport` | `App.js:7050-7180` | **3D Transformed** | `due_report_modal.png` | Verified: Total due aggregation, customer breakdown, print/share | **PASSED** | Secondary (P1) |
| **SCR-25** | Reports | Cashflow Report Modal | `modalCashReport` | `App.js:7185-7310` | **3D Transformed** | `cash_report_modal.png` | Verified: Cash in/out breakdown, daily cash summary, date filters | **PASSED** | Secondary (P1) |
| **SCR-26** | Reports | Profit & Loss Statement | `modalProfitLoss` | `App.js:7315-7430` | **3D Transformed** | `profit_loss_modal.png` | Verified: Revenue, COGS, gross margin, net profit calculation | **PASSED** | Secondary (P1) |
| **SCR-27** | Reports | Full Business Statement | `modalFullStatement` | `App.js:7435-7550` | **3D Transformed** | `full_statement_modal.png` | Verified: Multi-period ledger statement, executive financial summary | **PASSED** | Secondary (P2) |

---

## Summary Statistics
- **Total Tali-Owned Screens Audited**: 13 surfaces.
- **Core (P0/P1) Screens**: 9 surfaces (100% covered).
- **Secondary Report Screens**: 4 surfaces (100% covered).
- **Light & Dark Mode Compatibility**: Verified across all 13 screens.
- **Redmi Note 9 Layout Safety**: Zero text clipping, >= 48dp touch targets verified.
