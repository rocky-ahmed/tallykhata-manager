# Implementation Log — Phase 3.1

## Phase 3.1 Milestones
1. **Domain Engine Implementation (`src/ledgerEngine.js`)**:
   - `validateTransaction`: Validates amounts (>0, <=100M, numeric, valid given/received type).
   - `validateAccount`: Validates non-empty name and non-negative initial balance.
   - `validateStockAdjustment`: Bounds adjustments, preventing negative inventory.
   - `recalculateAccountRunningBalances`: Traverses account journals chronologically, computes sequential running balances, updates account current balance.
   - `syncCashboxForTransaction`: Automatically creates/updates linked cashbox entry for customer payment (`baki_aday`) and supplier payment (`supplier_pay`).
   - `removeCashEntriesForTransactions`: Cleans up linked cash records upon transaction or account deletion.
   - `migrateV5toV6`: Safe migration from `tallykhata_offline_store_v5` to `v6` with backup retention in `tallykhata_offline_store_v5_backup`.

2. **State & Handlers Refactoring (`part2_state_and_handlers.js`)**:
   - Added Promise queue mutex to `persistData` returning `{ success: boolean, payload?: any, error?: any }`.
   - Updated `handleSaveTransaction`, `handleUpdateTransaction`, `handleDeleteTransaction`, `handleSaveAccount`, `handleDeleteAccount`, `handleAdjustStock`, `handleSaveProduct`, `handleSaveCashEntry`, `handleAddMoney`, `handleMobileRecharge`, and `handleMoneyOut` to await persistence and verify write success before closing modals or clearing inputs.
   - Added `isSaving` guard against rapid double-clicks.

3. **1:1 Visual Parity (`part3_views_and_tabs.js`)**:
   - Fixed quick grid item 8 to authentic `ক্যাশবক্স`.
   - Fixed bottom tab 2 to `ক্যাশবক্স`, tab 3 to `টালিপে`, tab 4 to `মেন্যু`, tab 1 to `টালি`.
   - Rebuilt `App.js` (8,032 lines, 288,245 characters).

4. **Automated Testing (`test_phase3_1.js`)**:
   - Created test suite with 9 exhaustive test cases.
   - Ran `node test_phase3_1.js`: 9 / 9 tests passed.

5. **Live Device Verification**:
   - Connected Xiaomi Redmi Note 9 over USB with `adb reverse tcp:8081 tcp:8081`.
   - Reloaded Expo Go on device (`exp://127.0.0.1:8081`).
   - Captured and visually verified `live_device_screen.png`.

---

## 2026-10-16: Phase 3.2 Production-Path Testing & Complete Functional Repair
- **Created Production Storage Repository**:
  - Implemented `src/storageRepository.js` exporting `StorageRepository`, singleton `storageRepository`, and `createDefaultState`.
  - Added module-scoped `writeQueue` mutex to guarantee serialization across all React component re-render lifecycles.
  - Implemented authoritative in-memory caching and field merging to eliminate stale React snapshot overwrites.
  - Implemented failure-safe queue chaining that prevents deadlock when I/O or storage errors occur.
  - Built safe migration integration with `tallykhata_offline_store_v5_backup` preservation.
- **Audited and Fixed All 27 Persistence Sites**:
  - Refactored `part2_state_and_handlers.js` and `part4_modals_and_screens.js` to strictly `await persistData(...)` and verify `saveRes.success` before updating component state or dismissing modals.
  - Corrected cash entries, stock inventory, notes, business multi-profile switcher, Tagada SMS logs, backup restoration, and PIN security lock setup.
  - Fixed initial supplier balance journal type convention from hardcoded `'given'` to `accType === 1 ? 'given' : 'received'`.
- **Created and Verified Phase 3.2 Async Test Suite**:
  - Implemented `test_phase3_2.js` using async/await test harness with non-zero exit codes on failure.
  - Verified 12/12 production-path tests spanning customer and supplier ledger recalculations, race-condition prevention, error recovery, cascade deletion, double-entry cashbox synchronization, and end-to-end workflows.
- **Built and Verified Full Application**:
  - Rebuilt `App.js` (8,070 lines, 290,191 characters) via `build_full_app.py`.
  - Verified zero syntax errors with `node -c App.js`.
  - Verified clean bundle serving on Metro (4.50 MB, 0 errors).
  - Verified live device screen on Xiaomi Redmi Note 9 (`737ee4410405`).
---

## 2026-10-16: Phase 3.3 Critical Accounting Repair & Data Integrity Verification
- **Opening-Balance Aware Accounting Model (src/ledgerEngine.js)**:
  - Introduced explicit openingBalance on account records (default 0).
  - Implemented stablishAccountOpeningBalance to safely derive baselines from stored balance and journal net without inventing fake transactions.
  - Implemented customer (alance = openingBalance + sum(given) - sum(received)) and supplier (alance = openingBalance + sum(received) - sum(given)) sign conventions.
  - Historical running balances on ledger journal rows now incorporate openingBalance as the chronological baseline.
  - Flagged and preserved recoverable raw data on unresolvable discrepancies (hasDiscrepancy: true, legacyStoredBalance).
  - Fixed demonstration dataset: Raihan (opening 3800, journal 3200 -> balance 7000), Faysal (opening 8550, journal 1450 -> balance 10000), Abd. Samad (opening 3000, journal 5000 -> balance 8000).
- **Atomic Collection Mutations (src/storageRepository.js)**:
  - Implemented mutateCollection(collectionName, updater) to apply updates strictly on the latest committed store inside the serialized write mutex.
  - Implemented mutateStore(updater) for multi-collection atomic mutations (e.g., adding/editing/deleting a transaction updates accounts, journals, and linked cashbox entries atomically).
  - Added monotonic sequence + random component ID generator generateUniqueId(prefix) to completely prevent collisions under rapid/concurrent writes.
- **Handler Modernization (part2_state_and_handlers.js, part4_modals_and_screens.js)**:
  - Replaced all legacy Date.now() ID calls with collision-free generateUniqueId.
  - Updated all persistence handlers (handleSaveAccount, handleUpdateAccount, handleDeleteAccount, handleSaveTxn, handleUpdateTransaction, handleDeleteTransaction, handleSaveCashEntry, handleDeleteCashEntry, handleSaveProduct, handleAdjustStock, handleDeleteProduct, handleAddNote, handleToggleNote, handleDeleteNote, handleAddMoney, handleMobileRecharge, handleCreateBusiness, handleSaveDenominations, handleSendSingleTagada) to use authoritative repository mutation APIs.
  - Guaranteed UI state updates only after successful persistence.
- **Comprehensive Automated Test Suite (	est_phase3_3.js)**:
  - Wrote 18 tests covering:
    - TEST A: Customer opening-balance baseline (7000 / 3200 -> 3800, add 500 -> 7500, edit 700 -> 7700, del -> 7000).
    - TEST B: Supplier opening-balance baseline & conventions (6000 / 2500 -> 3500, add 500 -> 6500, edit 700 -> 6700, del -> 6000, pay 1000 -> 5000).
    - TEST C: Account with opening balance only (zero journals, lifecycle verification).
    - TEST D: Preservation of unresolvable discrepancy source data without fake financial history.
    - 6 Safe migration tests: balanced, explicit opening balances, inconsistent baseline derivation, malformed structures, idempotency, unmutated V5 backup retention.
    - 6 Concurrency tests: concurrent notes, concurrent cashbox, rapid accounts, concurrent stock adjustments, simultaneous financial transactions across accounts, simulated disk fault failure recovery.
    - 2 End-to-end production workflow tests: full customer and supplier lifecycles with restart persistence.
  - All 18 / 18 Phase 3.3 tests passed with 100% success.
  - Total test coverage: 39 / 39 tests across Phase 3.1, Phase 3.2, and Phase 3.3 passed.

---

## 2026-10-26: Phase 5 & 5.1 Google Drive Backup, Token Lifecycle & Data Integrity Verification
- **Privacy & Security Hardening (src/googleDriveBackupService.js, src/storageRepository.js)**:
  - Scrubbed plaintext app PIN and lock state (`pinEnabled: false, appPin: ''`) from backup payloads.
  - Ensured OAuth access tokens are kept strictly in memory and never written to persistent disk or included in backup payloads.
  - Forced PIN reset to safe defaults upon restoring any backup.
- **Hermes-Compatible SHA-256 Integrity Verification (src/googleDriveBackupService.js)**:
  - Implemented zero-dependency universal SHA-256 algorithm (`sha256Hex`) adhering to FIPS 180-4.
  - Enforced mandatory checksum on format version v1+; automatically detects and rejects tampered data.
  - Maintained backward compatibility with legacy 32-bit rolling hash checksums (`chk_...`).
- **Seamless Backward Compatibility & Dual Inventory Sync**:
  - Added `normalizeBackupPayload` to accept and normalize legacy unwrapped payloads (`{ accounts: [...], ... }`).
  - Synchronized `stock` and `inventory` collections identically in all payloads, commits, and state loaders.
- **Robust Offline File Import (App.js)**:
  - Fixed `ReferenceError: importedStock is not defined` in `handleImportBackup`.
  - Routed offline file imports through `storageRepository.commitRestorePayload` for ledger recalculation and safety snapshots.
  - Updated `handleExportBackup` to generate authoritative payloads with SHA-256 checksums and `offline_export` manifests.
- **Cloud Restore Auto-Discovery & Full State Rollback (App.js)**:
  - Added dynamic backup discovery via `findBackupFile` on restore for fresh app installations.
  - Added silent token refresh via `getValidGoogleAccessToken(true)` on HTTP 401 across all operations.
  - Hardened safety snapshot rollback on restore failures to restore all 14 store fields cleanly.
- **Physical Device Live Verification (Xiaomi Redmi Note 9 `737ee4410405`)**:
  - Verified active Google OAuth connection for the authorized Google account.
  - Executed live "এখন ব্যাকআপ নিন" (Backup Now): uploaded multipart payload to Google Drive AppData folder, downloaded and verified SHA-256 integrity. Confirmed with live success dialog.
  - Executed live "অনলাইন ব্যাকআপ রিস্টোর" (Restore Online): prompted confirmation dialog showing backup timestamp and counts, downloaded remote file, validated SHA-256, committed to database, and confirmed with live success dialog.
- **Automated Regression Suite (test_google_drive_backup.js)**:
  - Expanded test suite to 27 tests (Tests 21-27 covering privacy, SHA-256 tampering rejection, checksum requirements, legacy restore, dual stock sync, offline export restore, and safety snapshot rollback).
  - All 77 / 77 tests pass across all 6 test suites (100% success rate: 29 + 9 + 12 + 18 + 3 + 6 = 77).

- **Restore Failure & Snapshot Lifecycle Hardening (src/storageRepository.js, App.js)**:
  - Scoped `createLocalSafetySnapshot` to assign and return unique `snapshotId` per restore attempt.
  - Enforced `snapshotId` matching in `rollbackToSafetySnapshot`, rejecting rollbacks to stale snapshots from prior operations.
  - In `executeCloudRestore`, fresh snapshot is created strictly after download and validation succeed, before `commitRestorePayload`.
  - Download or network failures leave current authoritative local data completely untouched without invoking rollback.
  - Wrapped rollback in try/catch to guarantee original restore error message and UI failure state are always preserved.
  - Added regression Tests 28 & 29 in `test_google_drive_backup.js` verifying stale snapshot rejection and error preservation.

- **Unified Production Restore Orchestration & Parity Verification (src/googleDriveBackupService.js, App.js, test_google_drive_backup.js)**:
  - Extracted shared orchestrateCloudRestore helper in src/googleDriveBackupService.js, establishing an identical execution path for App.js (executeCloudRestore) and automated tests.
  - Hardened snapshot lifecycle: fresh snapshot is created strictly after download validation and before commit; failure before snapshot aborts immediately without rollback or store corruption.
  - Guaranteed error preservation: rollback failures in storage layer are logged and do not overwrite or swallow the original restore/validation error displayed to the user.
  - Synchronized UI state and database store upon successful restore or rollback, ensuring PIN lock is safely reset on restore.
  - Upgraded Test 28 and Test 29 to invoke production orchestrateCloudRestore directly with injected failures, and added Test 30 verifying snapshot ID mismatch, snapshot creation failure, and UI state integrity.
  - All 78 tests across all 6 test suites pass with 100% success (30 + 9 + 12 + 18 + 3 + 6 = 78).

- **Unified Production Cloud Backup Orchestration & Exact Payload Verification (src/googleDriveBackupService.js, App.js, test_google_drive_backup.js)**:
  - Extracted shared `orchestrateCloudBackup` and `verifyUploadedBackupMatches` in `src/googleDriveBackupService.js`, establishing an identical execution path between `App.js` (`executeCloudBackup`) and automated regression test suites.
  - Enforced strict payload-to-upload round-trip verification: compares expected canonical checksum, owner sub-identifier, record counts (`accounts`, `journals`, `cashEntries`), schemaVersion, formatVersion, and fileId against the downloaded remote file.
  - Prohibited updating cloud backup success metadata (`updatedMeta`) or setting UI status to `'success'` unless exact payload verification passes.
  - Added focused regression Tests 31 & 32 in `test_google_drive_backup.js` verifying mismatch detection and ensuring metadata is never saved upon verification failure.
  - Executed live round-trip verification on physical Xiaomi Redmi Note 9 (`737ee4410405`): Google OAuth connected for the authorized Google account, multipart payload uploaded, remote file downloaded, canonical SHA-256 checksum matched, verified in SQLite database via REA, and confirmed in live UI dialog.
  - Left live Restore Online unperformed against device active ledger to protect physical phone records and prevent resetting active PIN.
  - All 80 tests pass across all 6 test suites with 100% success (32 + 9 + 12 + 18 + 3 + 6 = 80).

- **Independent Remote File Metadata & Non-Tautological Identity Verification (src/googleDriveBackupService.js, test_google_drive_backup.js)**:
  - Added `getFileMetadata(accessToken, fileId)` to `GoogleDriveBackupService` querying Google Drive REST API (`/files/{fileId}?supportsAllDrives=false&fields=id,name,mimeType,parents,size,modifiedTime,createdTime,appProperties,description`) with automatic HTTP 401 token refresh.
  - Hardened `verifyUploadedBackupMatches` to reject tautological comparisons: requires non-empty uploaded file ID, independently observed remote metadata object, matching remote file ID, verified file name (`tallykhata_cloud_backup.json`), and verified parent folder (`appDataFolder`).
  - Scoped `orchestrateCloudBackup` to execute a 4-stage pipeline: (1) upload backup, (2) independently fetch remote metadata from Drive, (3) download remote payload, and (4) verify exact file ID, metadata, canonical SHA-256 checksum, owner, and record counts before persisting success metadata or altering UI state.
  - Expanded test suite in `test_google_drive_backup.js` to 33 tests (Tests 31, 32, and 33 covering expected file ID match, mismatched remote ID rejection, missing remote ID rejection, wrong parent/name rejection, checksum mismatch rejection, 401 metadata fetch token refresh, and direct `getFileMetadata` unit tests).
  - All 81 tests pass across all 6 test suites with 100% success (33 + 9 + 12 + 18 + 3 + 6 = 81).

- **Strict AppDataFolder & Zero-Fabrication Metadata Verification Enforcement (src/googleDriveBackupService.js, test_google_drive_backup.js)**:
  - Hardened `verifyUploadedBackupMatches` parents validation: strictly requires `remoteMeta.parents` to be a non-empty array containing `'appDataFolder'`. Rejects missing parents, empty array `[]`, malformed non-array types (string, object), and wrong parents.
  - Eliminated fabricated metadata fallback in `orchestrateCloudBackup`: if `driveService.getFileMetadata` is unavailable or fails, it throws immediately before download verification, preventing success metadata or UI emission without independent proof.
  - Added native `getFileMetadata` route handling to `createMockDriveFetch` in `test_google_drive_backup.js`.
  - Added focused regression tests in `test_google_drive_backup.js` (Test 31 subcases 5a-5f and Test 32 subcases 3a-3e) exercising missing parents, empty parents, malformed parents, wrong parent, missing `getFileMetadata` support, and bare string ID rejection.
  - All 81 tests pass across all 6 test suites with 100% success (33 + 9 + 12 + 18 + 3 + 6 = 81).
