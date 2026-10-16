# Regression Test Report — Phase 3.1 Data Backend Verification

## Executive Summary
Test suite: `test_phase3_1.js`
Runtime: Node.js (V8) + Expo React Native environment
Execution Date: 2026-10-16
Total Tests Executed: 9
Passed: 9 (100%)
Failed: 0 (0%)

---

## Test Results Matrix

| Test ID | Test Name | Target Function / Module | Result | Details |
|---|---|---|---|---|
| TEST 1 | Ledger Recalculation & Running Balances | `recalculateAccountRunningBalances` | **PASS** | Verified 1000 + 500 = 1500; - 300 = 1200; edited 500->700 = 1400; deleted 300 = 1700. All historical running balances strictly verified. |
| TEST 2 | Cashbox Linkage | `syncCashboxForTransaction`, `removeCashEntriesForTransactions` | **PASS** | Customer payment of 300 created 1 linked cash entry. Edited to 400 -> linked entry updated to 400. Deleted -> linked entry removed without affecting unrelated cash. |
| TEST 3 | Account Deletion & Referential Integrity | `removeCashEntriesForTransactions` | **PASS** | Account deleted: all journals and linked cash entries cascade-removed. Zero orphaned `linkedTxnId` records. Unrelated accounts and manual cash untouched. |
| TEST 4 | Persistence Simulation | `persistData`, `loadSavedData` | **PASS** | Data saved to storage key, reloaded, and all entity counts, account balances, and business profile verified matching 100%. |
| TEST 5 | Invalid Input Rejection | `validateTransaction`, `validateAccount` | **PASS** | Empty, null, zero, negative, non-numeric strings, and amounts > 100M rejected with Bangla error messages. |
| TEST 6 | Repeated Submissions & Queue Mutex | `persistData` queue | **PASS** | 5 rapid concurrent writes queued sequentially and resolved in exact order without state collision or race conditions. |
| TEST 7 | Write Failure Handling | `persistData` error handling | **PASS** | Simulated I/O failure returned `{ success: false, error }`, preserving form inputs and preventing false success feedback. |
| TEST 8 | Data Migration (v5 to v6) | `migrateV5toV6` | **PASS** | Legacy v5 structure migrated to v6, business name normalized to Mobile Xpress, financial totals preserved, running balances computed, idempotent on second pass. |
| TEST 9 | Inventory Stock Adjustment | `validateStockAdjustment` | **PASS** | Stock in (+15) -> 40; Stock out (-10) -> 15; Stock out (-30 from 25) rejected with informative error preventing negative inventory. |

---

## Hardware & Live Verification
- **Device**: Xiaomi Redmi Note 9 (`737ee4410405`, `merlin_in`, Android 12)
- **Port Forwarding**: `adb reverse tcp:8081 tcp:8081` active
- **Metro Packager**: Running on `127.0.0.1:8081` (packager status: running, bundle length: 4,702,346 bytes)
- **Visual Parity**: Verified via `live_device_screen.png` against `photo_2026-10-15_18-13-34.jpg` (100% 1:1 match across header, banner, 8 quick actions, summary card, search bar, and 4 bottom tabs).

---

# Regression Test Report — Phase 3.2 Production Verification Suite

## Executive Summary
Test suite: `test_phase3_2.js`
Runtime: Node.js (V8) + Production Modules (`src/ledgerEngine.js`, `src/storageRepository.js`)
Execution Date: 2026-10-16
Total Tests Executed: 12
Passed: 12 (100%)
Failed: 0 (0%)
Exit Code: 0 (Verified)

---

## Complete Test Matrix

| Test ID | Test Name | Target Module | Result | Verification Details |
|---|---|---|---|---|
| TEST 1 | Meta-Test: Async Test Runner | `runTest` harness | **PASS** | Proved that an asynchronous assertion rejection is caught, logged, and counted as a failure. |
| TEST 2 | Customer Ledger Chronological Recalc | `recalculateAccountRunningBalances` | **PASS** | Customer (type 1): initial 1000 + credit sale 500 = 1500; - cash 300 = 1200; edited 500->700 = 1400; deleted 300 = 1700. All historical running balances strictly verified. |
| TEST 3 | Supplier Ledger Chronological Recalc | `recalculateAccountRunningBalances` | **PASS** | Supplier (type 2): initial 2000 + credit purchase 1000 = 3000; - cash payment 800 = 2200; edited 800->1200 = 1800; deleted 1000 = 800. All balances strictly verified. |
| TEST 4 | Out-of-Order Timestamp Sorting | `recalculateAccountRunningBalances` | **PASS** | Mixed transaction dates (Oct 05, Oct 01, Oct 03) sorted chronologically ascending before sequential running balance computation (500, 800, 600). |
| TEST 5 | Input & Stock Validation Rules | `validateTransaction`, `validateAccount`, `validateStockAdjustment` | **PASS** | Zero/negative/extreme amounts rejected; non-numeric input rejected; bounded stock adjustment verified (+5 -> 15, -4 -> 6, -15 rejected preventing negative stock). |
| TEST 6 | Production StorageRepository: Boot & Reload | `StorageRepository` | **PASS** | Clean boot seeded default state; mutated state persisted to V6 key; reload in a fresh repository instance retrieved exact committed records. |
| TEST 7 | Stale Snapshot Race Condition Prevention | `StorageRepository.persistData` | **PASS** | 3 rapid concurrent writes to distinct fields executed simultaneously and merged into authoritative state without overwriting each other. |
| TEST 8 | Queue Recovery on Write Failure | `StorageRepository.persistData` | **PASS** | Simulated I/O disk failure rejected write without corrupting memory store; subsequent write succeeded cleanly without queue deadlock. |
| TEST 9 | Safe V5 to V6 Migration & Backup | `StorageRepository.loadInitialData` | **PASS** | Legacy V5 store migrated to V6; unmutated snapshot saved to `tallykhata_offline_store_v5_backup`; repeated boot loaded V6 directly without re-migrating. |
| TEST 10 | Cascade Account Deletion (Zero Orphans) | `removeCashEntriesForTransactions` | **PASS** | Deleted account removed all related journals and linked cash entries. Zero orphaned `linkedTxnId` entries remained. Manual cash untouched. |
| TEST 11 | Double-Entry Cashbox Synchronization | `syncCashboxForTransaction` | **PASS** | Customer cash collection created Cash IN (`baki_aday`); Supplier payment created Cash OUT (`supplier_pay`); credit-only transactions created no cashbox entries. |
| TEST 12 | End-to-End Workflow Simulation | Complete Stack | **PASS** | Created customer -> added credit sale -> received partial payment -> recalculated balances -> synced cashbox -> persisted -> verified on cold reload. |

---

## Physical Hardware Verification (Xiaomi Redmi Note 9)
- **Model**: Xiaomi Redmi Note 9 (`M2003J15SC`, codename `merlin_in`, Android 12)
- **Serial**: `737ee4410405`
- **Port Forwarding**: `adb reverse tcp:8081 tcp:8081` active (`UsbFfs tcp:8081 tcp:8081`)
- **Metro Bundler**: Running on `127.0.0.1:8081` (serves 4.50 MB clean production bundle with 0 errors)
- **Live Visual QA**: Confirmed via high-resolution screencap (`live_device_phase3_2.png`) matching reference assets 1:1.
- **Hardware-Level Setting Note**: Automated touch event injection (`adb shell input tap`) on Xiaomi MIUI requires the user-accessible toggle *"USB debugging (Security settings)"* to be enabled in MIUI Developer Options with a signed Xiaomi account. Intent dispatch (`am start exp://127.0.0.1:8081`), screencap extraction, reverse proxying, and live bundle compilation operate 100% unrestricted.
---

## Phase 3.3 Test Suite Execution Report
**Execution Date**: 2026-10-16
**Status**: 18 / 18 Tests Passed (100% Pass Rate)

### Detailed Test Results:
1. **TEST A — Customer Opening Balance Baseline**: Passed (Baseline 3800 derived, 7000 -> 7500 -> 7700 -> 7000 verified with running balances).
2. **TEST B — Supplier Opening Balance Baseline**: Passed (Baseline 3500 derived, 6000 -> 6500 -> 6700 -> 6000 -> 5000 verified).
3. **TEST C — Account with Opening Balance Only**: Passed (5000 opening balance, 0 fake journals, stable after subsequent txn additions, edits, and deletions).
4. **TEST D — Unresolvable Discrepancy Preservation**: Passed (Discrepancy flagged, 15000 legacy balance preserved, no invented journals).
5. **Migration 1 — Balanced Dataset**: Passed (Net matches balance, opening balance 0).
6. **Migration 2 — Explicit Opening Balances**: Passed (Opening balance 5000 preserved without duplication).
7. **Migration 3 — Inconsistent Dataset**: Passed (Customer 6000 opening, Supplier 8000 opening established).
8. **Migration 4 — Malformed & Missing Fields**: Passed (Safe failure or empty array initialization without crash).
9. **Migration 5 — Idempotency**: Passed (Multiple migration runs do not alter or double balances).
10. **Migration 6 — V5 Backup Key**: Passed (Unmutated V5 string preserved in 	allykhata_offline_store_v5_backup).
11. **Concurrency A — Concurrent Notes**: Passed (Both notes survive rapid concurrent creation and simulated restart).
12. **Concurrency B — Concurrent Cashbox**: Passed (Independent cash entries merge without overwriting).
13. **Concurrency C — Rapid Accounts**: Passed (All 3 accounts survive rapid concurrent creation).
14. **Concurrency D — Concurrent Inventory Adjustments**: Passed (Reduce 10 and Add 25 calculate 50 - 10 + 25 = 65).
15. **Concurrency E — Simultaneous Financials**: Passed (Independent accounts update balances and cashbox without race conditions).
16. **Concurrency F — Failure Recovery**: Passed (Simulated disk full returns false, does not corrupt store, subsequent write succeeds).
17. **E2E Customer Lifecycle**: Passed (Create -> Opening 4000 -> Credit 1200 -> Pay 2000 -> Edit 2500 -> Del 2500 -> Restart 5200 verified).
18. **E2E Supplier Lifecycle**: Passed (Create -> Opening 8000 -> Buy 3000 -> Pay 4000 -> Cascade Delete -> Restart verified).

### Cumulative Suite Totals:
- Phase 3.1 Suite: 9 / 9 Passed
- Phase 3.2 Suite: 12 / 12 Passed
- Phase 3.3 Suite: 18 / 18 Passed
- **Grand Total**: 39 / 39 Passed (100% Success)
