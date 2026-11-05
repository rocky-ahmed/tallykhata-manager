# TALLYKHATA RECONSTRUCTION — ITERATION 236 BACKEND REPORT
**Worker:** Worker 2: Averroes / Peirce (Permanent Backend Developer & Business Logic Architect)  
**Registered Thread ID:** `01a1a349-61ae-74d0-aed6-1792e7d1d594`  
**Milestone:** REA-ITER-236 (TallyPay Merchant Settlement Automation & QR Soundbox Hardware Diagnostics Backend)  
**Date:** 2026-11-05  
**Status:** **100% COMPLETE & VERIFIED** (36/36 Backend Tests Passing, 116/116 Reference Architecture Tests Passing, Zero Regressions)

---

## 1. Executive Summary

In Milestone **REA-ITER-236**, Worker 2 (Averroes / Peirce) implemented, validated, and verified the complete backend data architecture, financial settlement engines, hardware BLE diagnostics, and multi-tenant persistence layer for:
1. **Merchant Digital Settlement Automation Subsystem:**
   - Room SQLite persistence for table `transaction_settlement_action` and unique index `index_transaction_number`.
   - DAO queries: `exists(transactionNumber)`, `getUnsyncedTxnSettlementActions(limit)`, `updateTxnSettlementActionSyncStatusByIds(synced, ids)`, and `updateAllTxnSettlementActionUnsynced()`.
   - Real-time auto-settlement matching of incoming QR/digital payments:
     - Automatic classification into `CREDIT_COLLECTION` (বাকি আদায় সমন্বয়) when a debtor customer exists with credit debt > 0, reducing the customer debt balance to zero or the remaining amount and recording an accounting ledger journal entry.
     - Automatic classification into `DIGITAL_SALE` (ডিজিটাল বিক্রি) when the customer has zero debt or is an unknown sender, recording store revenue.
     - Strict idempotency protection via `exists(transactionNumber)` to reject duplicate settlements.
   - Payout Fee Rules: Instant NPSB payout (1.0% fee with min ৳10 floor) vs Regular BEFTN payout (0% fee).
2. **QR Soundbox Hardware BLE Diagnostics & Telemetry Subsystem:**
   - 6-state Bluetooth Low Energy (BLE) lifecycle state machine: `DISCONNECTED` -> `SCANNING` -> `CONNECTING` -> `CONNECTED` -> `RECONNECTING` (with automatic link-loss recovery up to 3 retries) -> `ERROR`.
   - Standard Bluetooth SIG Battery Service (UUID `0x180F` / `0x2A19`) with Li-ion voltage curve evaluation (3,200mV = 0% to 4,200mV = 100%), low battery warnings (<=15% / 3,300mV), critical battery warnings (<=5% / 3,220mV), and charging flag override.
   - Custom Soundbox Control GATT Service (UUID `0xFFE0` / `0xFFE1`) for command dispatch and 16-step volume duty-cycle synchronization (0 to 15 mapped linearly to 0%-100%).
   - 16-byte binary command packet serializer with preamble `0xAA55`, 64-bit integer paisa payload, and CRC-16 Modbus integrity checksum.
3. **Dual Audio Routing & Authentic Bengali Voice Announcement Verbalizer:**
   - Dynamic audio sink routing: routes to `HARDWARE_BLE_SOUNDBOX` when connected with >= 10% battery; falls back to `SOFTWARE_IN_APP_TTS` when disconnected or low battery; falls back to `SILENT_OR_VIBRATE` when TTS is disabled.
   - Vernacular Bengali voice announcement verbalizer generating authentic phrases matching REF-001 ARSC tokens (e.g. "টালিপে-তে পাঁচ শত টাকা পাওয়া গেছে", "ওয়ালেটে ১,০০০ টাকা গ্রহণ করা হয়েছে").
4. **Multi-Tenant StorageRepository Persistence & Isolation:**
   - Thread-safe storage under `transactionSettlementActions`, `settlementHistory`, and `soundboxConfig`.
   - Multi-tenant business isolation by `businessId`.
   - Cascading purge in `deleteBusinessCascade`.
   - Credential and session token sanitization during cloud backup serialization in `getFullBackupState`.

All implementations conform directly to the reverse-engineering discoveries established by Worker 1 (Gibbs) in `docs/rea-reconstruction/investigations/REA_INVESTIGATION_ITER_236_SETTLEMENT_SOUNDBOX.md`.

---

## 2. Architecture & Components Delivered

### 2.1 Room SQLite Schema & DAO Layer (`src/tallyPayService.js`)
- **Table Definition (`transaction_settlement_action`):**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
  - `transaction_number`: TEXT NOT NULL (Indexed Unique: `index_transaction_number`)
  - `action_type`: TEXT NOT NULL (Enum: `DIGITAL_SALE`, `CREDIT_COLLECTION`, `NO_ACTION`)
  - `synced`: INTEGER NOT NULL (0 = Dirty/Unsynced, 1 = Synced)
  - `create_date`: TEXT NOT NULL (ISO 8601 timestamp)
  - `update_date`: TEXT (Nullable ISO 8601 timestamp)
- **DAO Queries (`TransactionSettlementActionDao`):**
  - `exists(transactionNumber)`: Idempotency verification before inserting any settlement.
  - `getUnsyncedTxnSettlementActions(limit)`: Retrieves batch of unsynced settlement action rows.
  - `updateTxnSettlementActionSyncStatusByIds(synced, ids)`: Marks batch of rows synced or dirty.
  - `updateAllTxnSettlementActionUnsynced()`: Resets all rows to dirty status on sync recovery.

### 2.2 Settlement Automation Engine (`SettlementAutomationEngine`)
- **`evaluateAndSettleIncomingPayment(payment, storage, options)`**:
  - Validates payload and guards against empty transaction number.
  - Checks idempotency: if transaction number already exists in settlement actions, returns `{ settled: false, reason: "ALREADY_SETTLED" }`.
  - Debtor ledger check: queries customer accounts. If a customer matching the mobile number exists and has credit debt (`dueBalancePaisa > 0`):
    - Sets action to `CREDIT_COLLECTION`.
    - Reduces customer debt: `newDue = Math.max(0, currentDue - amountPaisa)`.
    - Creates a journal ledger entry with description including `(বাকি আদায় সমন্বয়)`.
  - If customer has 0 debt or is not found:
    - Sets action to `DIGITAL_SALE`.
    - Records digital sale revenue.
  - Automatically records the resulting action in `transaction_settlement_action`.
  - Dispatches voice notification via Soundbox BLE service or in-app TTS engine.

### 2.3 QR Soundbox BLE Diagnostics & Telemetry Service (`SoundboxBleDiagnosticsService`)
- **State Machine Transitions (`transitionBleState`):**
  - `DISCONNECTED` + `START_SCAN` -> `SCANNING`
  - `SCANNING` + `DEVICE_FOUND` -> `CONNECTING`
  - `CONNECTING` + `GATT_CONNECTED` -> `CONNECTED`
  - `CONNECTED` + `LINK_LOSS` -> `RECONNECTING`
  - `RECONNECTING` + `GATT_RECONNECTED` -> `CONNECTED`
  - `RECONNECTING` + `MAX_RETRIES_EXCEEDED` -> `DISCONNECTED`
  - `CONNECTING` + `FAILED` -> `ERROR`
  - `ERROR` + `RESET` -> `DISCONNECTED`
- **Telemetry Evaluation Functions:**
  - `evaluateRssiHealth(rssiDbm)`: Returns quality rating (`EXCELLENT` >= -60 dBm, `GOOD` >= -75 dBm, `FAIR` >= -85 dBm, `POOR` < -85 dBm) and bar count (1-4).
  - `evaluateBatteryTelemetry(voltageMv, isCharging)`: Computes percentage linearly between 3,200mV (0%) and 4,200mV (100%), with low battery warning (<=15%) and critical battery warning (<=5%).
  - `syncSoundboxVolume(step)`: Clamps volume step to 0-15 and calculates duty-cycle percentage.
  - `buildSoundboxCommandPacket(amountPaisa, channelCode)`: Generates 16-byte binary payload:
    - Bytes 0-1: Preamble `0xAA55`
    - Byte 2: Command ID `0x01`
    - Byte 3: Channel code (1 = TallyPay / SureCash, 2 = bKash, 3 = Nagad)
    - Byte 4: Reserved `0x00`
    - Bytes 5-12: 64-bit Big-Endian integer paisa amount
    - Bytes 13-14: 16-bit Little-Endian CRC-16 Modbus checksum
    - Byte 15: Postamble `0xED`

### 2.4 Dual Audio Routing & Bengali Voice Announcement Verbalizer
- **`resolveAudioOutputSink(isBleConnected, batteryLevelPct, ttsEnabled)`**:
  - Returns `HARDWARE_BLE_SOUNDBOX` if BLE connected and battery >= 10%.
  - Returns `SOFTWARE_IN_APP_TTS` if BLE disconnected or battery < 10%, provided TTS is enabled.
  - Returns `SILENT_OR_VIBRATE` if TTS is disabled.
- **`generateBengaliVoiceAnnouncement(amountPaisa, options)`**:
  - Synthesizes Bengali currency pronunciation words:
    - 50000 paisa -> "পাঁচ শত টাকা"
    - 100000 paisa -> "এক হাজার টাকা"
    - 7550 paisa -> "পঁচাত্তর টাকা পঞ্চাশ পয়সা"
  - Assembles authentic announcement phrases: "টালিপে-তে পাঁচ শত টাকা পাওয়া গেছে" and "ওয়ালেটে এক হাজার টাকা গ্রহণ করা হয়েছে" using authentic REF-001 string tokens.

### 2.5 Multi-Tenant StorageRepository Extensions (`src/storageRepository.js`)
- Collections added to `VALID_COLLECTIONS` and initialized:
  - `transactionSettlementActions`: In-memory table representation of `transaction_settlement_action`.
  - `settlementHistory`: Merchant settlement history records.
  - `soundboxConfig`: Per-tenant hardware configuration and preferences.
- Storage methods implemented:
  - `saveTransactionSettlementAction(businessId, record)`
  - `getTransactionSettlementActions(businessId, options)`
  - `getTransactionSettlementActionByTxn(businessId, txnNumber)`
  - `existsTransactionSettlementAction(businessId, txnNumber)`
  - `getUnsyncedTxnSettlementActions(businessId, limit)`
  - `updateTxnSettlementActionSyncStatusByIds(businessId, synced, ids)`
  - `updateAllTxnSettlementActionUnsynced(businessId)`
  - `saveSettlementHistoryRecord(businessId, record)`
  - `getSettlementHistory(businessId, options)`
  - `saveSoundboxConfig(businessId, config)`
  - `getSoundboxConfig(businessId)`
- Business cascade deletion updated: `deleteBusinessCascade` purges all three collections for the target tenant.
- Cloud backup sanitization updated: `getFullBackupState` sanitizes raw connection tokens and credentials from `soundboxConfig`.

---

## 3. Test Suite Verification & Results

### 3.1 Backend Test Suite (`test_iteration_236_settlement_backend.js`)
- **Total Tests:** 36
- **Passed:** 36 (100% Pass Rate)
- **Failed:** 0
- **Test Groups Verified:**
  1. Group 1: Enums, Constants & SQLite Schema Invariants (Tests 1-6)
  2. Group 2: BLE Diagnostics State Machine Transitions & Resilience (Tests 7-10)
  3. Group 3: Hardware Telemetry, Battery Curves & Signal Health (Tests 11-13)
  4. Group 4: Soundbox Binary Packet Serialization & CRC-16 Modbus (Tests 14-16)
  5. Group 5: Dual Audio Routing & Bengali Voice Announcement Verbalizer (Tests 17-19)
  6. Group 6: Payout Fee Calculation (NPSB Instant vs BEFTN Regular) (Tests 20-22)
  7. Group 7: Settlement Automation Engine & Customer Debt Auto-Matching (Tests 23-26)
  8. Group 8: Transaction Settlement Action DAO Queries & Sync State Machine (Tests 27-28)
  9. Group 9: Multi-Tenant StorageRepository Persistence & Cascade Deletion (Tests 29-34)
  10. Group 10: Cloud Backup State Sanitization & Performance Benchmark (Tests 35-36)

### 3.2 Reference Architecture Test Suite (`test_iteration_236_settlement_reference_architecture.js`)
- **Total Tests:** 116
- **Passed:** 116 (100% Pass Rate)
- **Failed:** 0

### 3.3 Zero Regression Verification Across Historical Iterations
All previous backend test suites were executed sequentially and verified with 100% green pass rates:
- `test_iteration_229_qr_settlement_backend.js`: 36/36 PASSED
- `test_iteration_230_settlement_history_backend.js`: 40/40 PASSED
- `test_iteration_231_pin_biometrics_backend.js`: 42/42 PASSED
- `test_iteration_232_account_manager_backend.js`: 20/20 PASSED
- `test_iteration_233_add_money_backend.js`: 26/26 PASSED
- `test_iteration_234_transfer_backend.js`: 32/32 PASSED
- `test_iteration_235_recharge_backend.js`: 31/31 PASSED
- `test_iteration_236_settlement_backend.js`: 36/36 PASSED

### 3.4 Performance Benchmark
- **Evaluation Throughput:** 1,000 incoming settlement auto-matching and ledger resolution operations executed in **72ms** (~0.072ms per operation), well below the 200ms target threshold.

---

## 4. Git & Code Safety Invariants

- **`App.js` Untouched:** Preserved strictly for Worker 3 (Ohm).
- **Zero Destructive Git Commands:** No commits, pushes, or resets performed.
- **Reference Assets Protected:** Untracked `extracted_apk/` and reference binaries remained intact and unmodified.

---

## 5. Conclusion & Ready for Frontend Integration

The backend services for Milestone REA-ITER-236 are completely implemented, verified, and ready for Worker 3 (Ohm) to integrate into the React Native frontend screens (`ScCreditSettlementActivity`, `ScCreditSettlementConfirmationActivity`, and Soundbox BLE diagnostics modal).
