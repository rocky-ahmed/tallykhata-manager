# TALLYKHATA — PHASE 1 COMPLETE APPLICATION SCREEN INVENTORY
## Exhaustive 52-Surface Discovery Across All 11 Modules, Screens, Tabs & Modals

| Screen ID | Module | Screen / View Name | Route / State Key | Parent Screen | Subsection | Source File & Line Range | Main UI Components | Current UI Condition | Redesign Priority |
|---|---|---|---|---|---|---|---|---|---|
| **SCR-01** | Home / Tali | Main Dashboard & Summary | activeTab === 'home' | Root Container | Quick Actions & Stats | App.js:3350-3430 | 8x Quick Action cards, 2-column Due card, Search/Filter bar | 3D transformed, high contrast | **P0** |
| **SCR-02** | Home / Tali | Customer List Sub-Tab | activeTab === 'home' && filterMode === 'customer' | SCR-01 | Customer Master | App.js:3431-3510 | Squircle customer avatars, due balance tags, search bar | Modern squircle avatars | **P1** |
| **SCR-03** | Home / Tali | Supplier List Sub-Tab | activeTab === 'home' && filterMode === 'supplier' | SCR-01 | Supplier Master | App.js:3511-3590 | Squircle supplier avatars, payable balance tags | Reuses customer list styling | **P1** |
| **SCR-04** | Home / Tali | Customer Account Ledger | currentScreen === 'account_ledger' | SCR-02 | Transaction History | App.js:4240-4490 | 38dp action icons, 48dp quick chips, ledger rows | 3D transformed, normalized currency | **P0** |
| **SCR-05** | Home / Tali | Add Customer Modal | modalAddAccount && isCustomer | SCR-02 | Customer Form | App.js:4495-4600 | Name, phone, address, opening balance input | Standard modal, flat input borders | **P1** |
| **SCR-06** | Home / Tali | Edit Customer Modal | modalEditAccount | SCR-04 | Customer Profile Form | App.js:4601-4700 | Pre-filled customer inputs, update CTA | Standard modal | **P1** |
| **SCR-07** | Home / Tali | Add Transaction Modal | modalAddTxn | SCR-04 | Becha / Kena Entry | App.js:4705-4850 | Debit/Credit toggle, amount input, date picker | Functional, needs tactile amount input | **P0** |
| **SCR-08** | Home / Tali | Edit Transaction Modal | modalEditTxn | SCR-04 | Entry Correction | App.js:4851-4960 | Transaction details, update/delete CTA | Functional form | **P1** |
| **SCR-09** | Home / Tali | Transaction Voucher View | modalVoucher | SCR-04 | Printable Receipt | App.js:4965-5100 | Receipt card, QR code, WhatsApp/SMS share | Clean printable surface | **P2** |
| **SCR-10** | Cashbox | Cash Overview & Daily Flow | activeTab === 'cashbox' | Root Container | Balance & Timeline | App.js:5200-5380 | Cash in Hand hero card, IN/OUT stats, daily cards | 3D transformed, high contrast | **P0** |
| **SCR-11** | Cashbox | Add Cash Transaction Modal | modalAddCash | SCR-10 | Cash Entry Form | App.js:5385-5500 | IN/OUT selector, amount, category, note | Standard modal | **P1** |
| **SCR-12** | Cashbox | Reconcile Cashbox Modal | modalReconcileCash | SCR-10 | Balance Sync Form | App.js:5505-5650 | Physical cash input, diff calculation, notes | Dense layout, high functional utility | **P1** |
| **SCR-13** | Due / Tagada | Group Tagada Bulk SMS | activeTab === 'tagada' | Root Container | Bulk Tagada Manager | App.js:5655-5850 | Tagada quota banner, customer checklist, bulk CTA | Clean layout, needs badge refinement | **P1** |
| **SCR-14** | Due / Tagada | Single Tagada Modal | modalTagada | SCR-04 | Customer Alert Form | App.js:5855-5980 | Due display, SMS preview, WhatsApp trigger | Standard modal | **P2** |
| **SCR-15** | Tali Pay | Digital Wallet Dashboard | activeTab === 'tallypay' | Root Container | Digital Payments | App.js:5985-6200 | 3D wallet card, Bangla QR trigger, action grid | Promotional card removed, clean layout | **P1** |
| **SCR-16** | Tali Pay | Bangla QR Merchant Modal | modalBanglaQR | SCR-15 | QR Display & Print | App.js:6205-6320 | Merchant QR frame, download/print buttons | Authentic preserved asset | **P2** |
| **SCR-17** | Tali Pay | Add Money Modal | modalAddMoney | SCR-15 | Bank/Card Inflow | App.js:6325-6420 | Source selector, amount input, fee breakdown | Standard form | **P2** |
| **SCR-18** | Tali Pay | Send Money / Out Modal | modalMoneyOut | SCR-15 | Digital Outflow | App.js:6425-6520 | Recipient input, amount, PIN confirmation | Secure entry layout | **P2** |
| **SCR-19** | Tali Pay | Limits & Fees Modal | modalTxnLimit | SCR-15 | Compliance Table | App.js:6525-6600 | Tiered limits table, daily/monthly allowances | Information table | **P3** |
| **SCR-20** | Inventory | Stock Inventory List | modalAddStock | Root Container | Product Master | App.js:6605-6750 | Item cards, quantity badges, purchase/sell prices | Multi-business isolated | **P1** |
| **SCR-21** | Inventory | Add / Edit Product Modal | modalStockForm | SCR-20 | Item Form | App.js:6755-6850 | Name, barcode, cost, price, stock alert | Form modal | **P2** |
| **SCR-22** | Inventory | Adjust Stock Modal | modalAdjustStock | SCR-20 | Stock Adjustment | App.js:6855-6950 | Quantity diff input, reason selector | Standard modal | **P2** |
| **SCR-23** | Notes | Quick Sticky Notes | modalNotes | Root Container | Note Manager | App.js:6955-7080 | Note cards, pin toggle, rich text editor | Clean note list | **P2** |
| **SCR-24** | Reports | Baki / Due Report | modalBakiReport | SCR-30 | Debt Ledger | App.js:7085-7180 | Ranked customer list, total dues, PDF export | Printable table layout | **P1** |
| **SCR-25** | Reports | Daily Cashflow Report | modalCashReport | SCR-30 | Cash Timeline | App.js:7185-7280 | Daily net cashflow, breakdown by category | Timeline layout | **P2** |
| **SCR-26** | Reports | Profit & Loss Statement | modalProfitLoss | SCR-30 | Financial P&L | App.js:7285-7420 | Sales, COGS, gross margin, net profit | High-density financial statement | **P1** |
| **SCR-27** | Reports | Full Business Report | modalFullReport | SCR-30 | Comprehensive Audit | App.js:7425-7550 | Complete multi-metric business statement | Executive report table | **P2** |
| **SCR-28** | Business | Business Picker Switcher | modalBusinessPicker | SCR-30 | Switcher Sheet | App.js:7555-7700 | Business cards, active indicator, archive button | Clean switcher card list | **P1** |
| **SCR-29** | Business | Add Business Profile | modalAddBusiness | SCR-28 | Business Profile Form | App.js:7705-7820 | Business name, category, currency, phone | Profile form | **P1** |
| **SCR-30** | Settings | Main Menu & Settings | activeTab === 'menu' | Root Container | Hub & Shortcuts | App.js:7825-8000 | Profile hero, report shortcuts, action list | 3D list items | **P1** |
| **SCR-31** | Settings | App Preferences Dialog | modalSettings | SCR-30 | General Config | App.js:8005-8140 | Sound, SMS permission, vibration toggles | Preference toggles | **P2** |
| **SCR-32** | Settings | Theme Picker Modal | modalThemePicker | SCR-30 | Appearance Selector | App.js:8145-8240 | Radio pills (Light, Dark, System) | Themed modal | **P1** |
| **SCR-33** | Settings | Language Picker Modal | modalLanguagePicker | SCR-30 | Locale Selector | App.js:8245-8350 | Radio pills (Bangla, English, System) | Themed modal | **P1** |
| **SCR-34** | Settings | Cloud Backup & Restore | modalBackupRestore | SCR-30 | Google Drive Sync | App.js:8355-8580 | Always-visible 5-button suite, OAuth status | Fully functional & verified | **P0** |
| **SCR-35** | Settings | App PIN Lock Setup | modalPinSetup | SCR-30 | Security & Biometrics | App.js:8585-8720 | 4-digit PIN setup, biometric toggle | Secure PIN entry | **P1** |
| **SCR-36** | Money Manager | MM Dashboard | modalMoneyManager | Root Container | Net Worth Hub | App.js:8725-9450 | 3D Net Worth card, Wallets row, quick actions | 3D transformed, high contrast | **P0** |
| **SCR-37** | Money Manager | Transactions Sub-Tab | mmActiveSubTab === 'transactions' | SCR-36 | Grouped History | App.js:9455-9780 | Date group headers, transaction cards, search | Modern list layout | **P0** |
| **SCR-38** | Money Manager | Add Income / Expense Modal | modalMMAddTxn | SCR-36 | Personal Txn Entry | App.js:9785-9980 | Type toggle, amount, category, wallet selector | Clean form layout | **P0** |
| **SCR-39** | Money Manager | Edit Transaction Modal | modalMMEditTxn | SCR-37 | Personal Txn Edit | App.js:9985-10100 | Pre-filled form, delete confirmation | Form modal | **P1** |
| **SCR-40** | Money Manager | Wallets Sub-Tab | mmActiveSubTab === 'accounts' | SCR-36 | Accounts Master | App.js:10105-10350 | 1:1 account cards, monthly flow, transfer CTA | 3D transformed cards | **P0** |
| **SCR-41** | Money Manager | Add / Edit Wallet Modal | modalMMAddAccount | SCR-40 | Wallet Form | App.js:10355-10480 | Name, type (Cash/Bank/MFS), balance, color | Color picker & form | **P1** |
| **SCR-42** | Money Manager | Wallet Transfer Modal | modalMMTransfer | SCR-40 | Inter-Wallet Transfer | App.js:10485-10600 | Source/Target wallet selectors, amount, note | Transfer form | **P1** |
| **SCR-43** | Money Manager | Budgets Sub-Tab | mmActiveSubTab === 'budgets' | SCR-36 | Spending Limits | App.js:10605-10850 | Overall budget card, 3-color progress bars | 3-tier status indicators | **P0** |
| **SCR-44** | Money Manager | Set / Edit Budget Modal | modalMMAddBudget | SCR-43 | Budget Form | App.js:10855-10980 | Category selector, monthly limit, alert threshold | Form modal | **P1** |
| **SCR-45** | Money Manager | Goals Sub-Tab | mmActiveSubTab === 'goals' | SCR-36 | Target Savings | App.js:10985-11200 | Goal cards, progress bar, target date | Goal progress cards | **P1** |
| **SCR-46** | Money Manager | Add / Edit Goal Modal | modalMMAddGoal | SCR-45 | Savings Goal Form | App.js:11205-11340 | Name, target amount, deadline, icon | Form modal | **P2** |
| **SCR-47** | Money Manager | Analytics Sub-Tab | mmActiveSubTab === 'analytics' | SCR-36 | Cashflow Insights | App.js:11345-11600 | Cashflow summary, expense distribution bars | Insight cards | **P1** |
| **SCR-48** | Money Manager | Customization Engine Modal | modalMMPreferences | SCR-36 | Personalization | App.js:12300-12500 | Section selector, 6 presets, tint, scale, preview | Preview & storage functional | **P0** |
| **SCR-49** | Money Manager | Month & Period Picker | modalMMMonthPicker | SCR-36 | Date Preset Sheet | App.js:12505-12680 | Period presets (This month, Last, All time) | Modern bottom sheet | **P0** |
| **SCR-50** | Money Manager | Custom Date Range Dialog | modalMMCustomDateRange | SCR-36 | Custom Range Form | App.js:12685-12850 | Start/End date inputs, quick presets | Themed modal | **P1** |
| **SCR-51** | Money Manager | Recurring Schedules Modal | modalMMRecurring | SCR-36 | Auto Rule Master | App.js:12855-13050 | Rule list, frequency selector, pause/resume | Rule cards | **P1** |
| **SCR-52** | System | Support & Helpline Sheet | modalSupport | SCR-30 | User Assistance | App.js:13055-13200 | Helpline phone, WhatsApp chat, feedback input | Contact sheet | **P3** |
