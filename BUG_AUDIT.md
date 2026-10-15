# Bug Audit & Remediation Log (Phase 2 & Phase 3.1)

## Executive Summary
This document records all detected bugs, UI mismatches, state synchronization defects, and runtime limitations identified during Phase 2, Phase 3, and Phase 3.1 deep audit of the TallyKhata application against the reference demo application (`TallyKhata-Demo.apk`), reference screenshots (`photo_2026-10-15_18-13-34.jpg`), and live hardware verification on Xiaomi Redmi Note 9 (`737ee4410405`).

---

## 1. UI & Visual Rendering Defects

| ID | Component / Screen | Observed Defect | Root Cause | Remediation & Fix | Status |
|---|---|---|---|---|---|
| UI-1 | Menu Tab (Menu) | Colored square placeholders for accounts, reports, settings, and lock | Icons rendered as flat solid RGB blocks instead of transparent RGBA vectors | Extracted authentic vector drawables from APK and rendered via pypdfium2 and reportlab | RESOLVED |
| UI-2 | Bottom Navigation Bar | Inactive/active indicator pill only applied to Tab 1 (Tally) | Hardcoded condition `activeTab === 'home'` on pill container | Refactored all 4 tabs to wrap active icon in `styles.tabActivePill` with `#B81414` tint and peach-pink background | RESOLVED |
| UI-3 | Quick Actions Grid | Vector icons using generic fallback renderings | Vector coordinates scaled improperly without DPI viewport conversion | Parsed viewport width/height and scaled commands dynamically to 240x240 RGBA | RESOLVED |
| UI-4 | Promo Value Banner | Banner text hardcoded to English in earlier build | Missing authentic Bengali string mapping | Mapped authentic string: `মানি ট্রান্সফার চার্জ ফ্রি!*` with authentic yellow background `#FFD400` | RESOLVED |
| UI-5 | Bottom Tab Labels | Tab labels had typos and spacing issues: 'ক্যাশবক্স' vs 'ক্যাশবাক্স', 'টালি পে' vs 'টালিপে' | Inexact manual strings in earlier build | Updated all labels to exact Bengali orthography matching the reference APK and screenshot: 'টালি', 'ক্যাশবক্স', 'টালিপে', 'মেন্যু' | RESOLVED |
| UI-6 | Active Tab Indicator Pill | Switching to Cashbox, TallyPay, or Menu lost rounded pill | Only Tab 1 had conditional `tabActivePill` container | Generalized active pill container across all 4 navigation destinations | RESOLVED |
| UI-7 | Business Header Pill | Displayed 'আমার ব্যবসা প্রতিষ্ঠান' instead of 'Mobile Xpress' | Default business array had generic placeholder name | Set default profile to 'Mobile Xpress' with 'স্ট্যান্ডার্ড' package type, matching reference screenshot | RESOLVED |
| UI-8 | Quick Grid Item 8 | Labeled 'ক্যাশবাক্স' instead of 'ক্যাশবক্স' | Mismatched Bengali spelling | Fixed label to 'ক্যাশবক্স' matching screenshot exactly | RESOLVED |

---

## 2. Business Logic & State Handlers

| ID | Workflow | Defect | Root Cause | Remediation & Fix | Status |
|---|---|---|---|---|---|
| LOGIC-1 | TallyPay Money Out | Tapping Money Out in Tab 3 showed an immediate Alert resetting balance | Button was hooked to legacy inline handler instead of modal | Connected button directly to `setModalMoneyOut(true)`, supporting Bank, bKash, and Nagad withdrawal | RESOLVED |
| LOGIC-2 | Cashbox Daily Calculation | Today sales showed 0 if no explicit sale entry was made today even with cash-in | Calculation only checked `category === 'sale'` without fallback to `type === 'in'` | Enhanced fallback logic: `todaySales || todayCashIn`, ensuring consistent balance display | RESOLVED |
| LOGIC-3 | Denomination Reconciliation | Denomination state reset on modal close | Local state was not synchronized with AsyncStorage | Added persistent `tally_cash_denominations` state and calculation against counted vs expected cash | RESOLVED |
| LOGIC-4 | Transaction Recalculation | Editing/deleting a transaction left subsequent historical running balances stale | Only single transaction was updated without traversing chronological entries | Integrated `src/ledgerEngine.js` with `recalculateAccountRunningBalances` updating all subsequent running balances | RESOLVED |
| LOGIC-5 | Account Deletion Orphans | Deleting an account left orphaned `linkedTxnId` entries in cashbox | `handleDeleteAccount` only filtered journals without cleaning cashbox | Implemented cascade deletion via `removeCashEntriesForTransactions` ensuring zero orphaned cashbox entries | RESOLVED |
| LOGIC-6 | Stock Inventory Validation | Stock adjustment permitted removing more items than in stock, forcing negative stock | Handler lacked boundary checking | Added `validateStockAdjustment` in `src/ledgerEngine.js` preventing negative inventory | RESOLVED |

---

## 3. Storage & Relational Synchronization

| ID | Domain | Defect | Root Cause | Remediation & Fix | Status |
|---|---|---|---|---|---|
| DATA-1 | Business Multi-tenancy | Switching business did not partition transactions | Schema stored single global list | Added business multi-profile picker and state persistence | RESOLVED |
| DATA-2 | Offline Backup Integrity | Exported JSON string lacked schema version and checksum | Plain JSON object stringified | Added metadata header with schema version, export timestamp, record counts, and verification | RESOLVED |
| DATA-3 | Storage Key Migration | Old local storage key cached stale placeholder profile | Hardcoded to `tallykhata_offline_store_v5` | Implemented safe one-time migration (`migrateV5toV6`) with `tallykhata_offline_store_v5_backup` retention | RESOLVED |
| DATA-4 | Persistence Mutex | Concurrent rapid writes caused state loss | `persistData` had no serialization queue | Implemented Promise chain mutex queue guaranteeing sequential atomic writes | RESOLVED |
| DATA-5 | Awaitable Write Handlers | Handlers cleared form inputs and closed modals before confirming storage write | Fire-and-forget `persistData` calls | Made all handlers `await persistData()`, keeping inputs intact on write failure | RESOLVED |

---

## 4. Phase 3.2 Deep Production Audit & Remediation Log

| ID | Domain / Component | Observed Defect | Root Cause | Remediation & Fix | Status |
|---|---|---|---|---|---|
| LOGIC-7 | Test Runner Harness | `runTest` in `test_phase3_1.js` did not `await` async callbacks, causing unhandled rejections to pass silently | `runTest` was declared as a synchronous function without awaiting promise return values | Refactored `runTest` in `test_phase3_2.js` into an `async` function with strict `await`, rejection tracking, and exit code `1` on failure | RESOLVED |
| DATA-2 | Concurrency & Re-render Mutex | `persistenceQueue` in `part2_state_and_handlers.js` was re-instantiated on every React component re-render | Declared with `let persistenceQueue = Promise.resolve();` inside the component body | Created `src/storageRepository.js` with module-scoped `writeQueue` mutex surviving re-renders | RESOLVED |
| DATA-3 | Stale Snapshot Overwrites | Partial updates using outdated React state could overwrite newer updates to other keys | `persistData` constructed payload from component closure variables | Implemented authoritative `currentStore` cache in `StorageRepository` that merges partial updates onto the latest committed state | RESOLVED |
| DATA-4 | Unawaited Cash Entry Handlers | `handleDeleteCashEntry`, `handleSaveReconciliation`, and `handleSaveDenominations` called `persistData` without `await` | Callers fired and forgot without verifying storage success before dismissing UI | Made all cash handlers `async`, awaited `persistData`, and checked `saveRes.success` before updating state and closing modals | RESOLVED |
| DATA-5 | Unawaited Stock Handlers | `handleDeleteProduct` was unawaited | `persistData` was invoked without `await` in `onPress` callback | Made `onPress` callback `async`, awaited `persistData`, and checked `saveRes.success` | RESOLVED |
| DATA-6 | Unawaited Note Handlers | `handleAddNote`, `handleToggleNote`, and `handleDeleteNote` were unawaited | Handlers ran synchronously without checking storage write result | Converted note handlers to `async`, awaited `persistData`, and checked `saveRes.success` | RESOLVED |
| DATA-7 | Unawaited Business & Tagada | `handleSelectBusiness`, `handleCreateBusiness`, `handleSendSingleTagada`, `handleSendBulkTagada` unawaited | Operations dismissed modals before checking write results | Converted to `async`, awaited `persistData`, and checked `saveRes.success` | RESOLVED |
| DATA-8 | Unawaited Backup & Security | `handleImportBackup`, PIN setup modal in `part4` were unawaited | Handlers closed modals and set state before storage write was confirmed | Added `await persistData`, checked `saveRes.success` before updating state or dismissing modals | RESOLVED |
| LOGIC-8 | Supplier Initial Balance Sign | New supplier accounts with initial balance created initial journal with `type: 'given'`, inverting balance on recalculation | Hardcoded `type: 'given'` in initial journal generation | Updated initial journal generation to `type: accType === 1 ? 'given' : 'received'`, correctly increasing supplier debt | RESOLVED |
| DATA-9 | Missing Version in Migration | `migrateV5toV6` omitted explicit `version: 6` field in returned payload | Property was named `migrationVersion: 6` without `version: 6` | Added `version: 6` to migrated payload in `src/ledgerEngine.js` | RESOLVED |