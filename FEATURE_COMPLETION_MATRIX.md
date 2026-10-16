# Feature Completion Matrix — Phase 3.1

| Module / Feature | Reference Target (APK / Specs) | Current State | Backend Engine Verified | UI Parity (1:1) |
|---|---|---|---|---|
| Customer Ledger (টালি) | Customer credit/payment ledger with running balances | Complete | Yes (`recalculateAccountRunningBalances`) | 100% |
| Supplier Ledger | Supplier credit purchase & cash payment | Complete | Yes (`recalculateAccountRunningBalances`) | 100% |
| Cashbox (ক্যাশবক্স) | Daily cash in/out, opening balance & reconciliation | Complete | Yes (`syncCashboxForTransaction`) | 100% |
| Cash Reconciliation | 10-denomination note counter (1000 to 1 Taka) | Complete | Yes (`handleSaveDenominations`) | 100% |
| TallyPay (টালিপে) | Wallet balance, Add Money, Money Out, Mobile Recharge | Complete (Local Offline Ledger) | Yes (`handleMoneyOut`, `handleAddMoney`) | 100% |
| Stock Inventory | Product list, buy/sell prices, bounded stock adjustment | Complete | Yes (`validateStockAdjustment`) | 100% |
| Business Notes | Todo list with completion toggles & persistence | Complete | Yes (`handleAddNote`, `handleToggleNote`) | 100% |
| Multi-Business | Business profile bottom sheet & active switcher | Complete | Yes (`handleSelectBusiness`, `handleCreateBusiness`) | 100% |
| Reports (5 Types) | Becha-Kena, Baki, Cash, Expense, Malik | Complete | Yes (`modalBechaKena`, `modalBakiReport`, etc.) | 100% |
| Data Backup & Restore | JSON export, share via WhatsApp/Drive, JSON import | Complete | Yes (`handleExportBackup`, `handleImportBackup`) | 100% |
| Security (PIN Lock) | 4-digit security PIN lock screen on launch | Complete | Yes (`isLocked`, `handleVerifyPin`) | 100% |
| Tagada Reminders | Single customer Bangla SMS/WhatsApp & bulk tagada | Complete | Yes (`handleSendSingleTagada`, `handleSendBulkTagada`) | 100% |

---

## Phase 3.3 Core Accounting & Concurrency Matrix

| Feature / Capability | Requirements | Implementation | Test Verification | Status |
|---|---|---|---|---|
| Explicit Opening Balances | Accounts store explicit openingBalance (default 0) | src/ledgerEngine.js | Test A, B, C | VERIFIED |
| Chronological Running Balances | Journals running totals include opening balance baseline | src/ledgerEngine.js | Test A, B, C, D | VERIFIED |
| Supplier Conventions | Credit buy (+), cash payment (-) | src/ledgerEngine.js | Test B, Test 18 | VERIFIED |
| Unresolvable Discrepancies | Flag and preserve raw balance without fake history | src/ledgerEngine.js | Test D | VERIFIED |
| Safe Migration | Preserve V5 backup, handle malformed fields, idempotency | src/storageRepository.js | Tests 5, 6, 7, 8, 9, 10 | VERIFIED |
| Atomic Collection Mutations | mutateCollection on latest committed store | src/storageRepository.js | Concurrency Tests A, B, C, D | VERIFIED |
| Multi-Collection Mutations | mutateStore for atomic cascade updates | src/storageRepository.js | Concurrency Test E, F | VERIFIED |
| Collision-Free IDs | Monotonic sequence + random entropy | src/ledgerEngine.js | Concurrency Tests A-F | VERIFIED |
| End-to-End Persistence | Restart preserves full customer and supplier lifecycles | src/storageRepository.js | E2E Tests 17, 18 | VERIFIED |
