# REA RECONSTRUCTION — ITERATION 223 REPORT
**Worker Identity:** Worker 2: Averroes (Permanent Backend Developer & Business Logic / Backend & Data Architect)  
**Registered Thread ID:** `01a19154-c135-75d0-b38a-1ea50f004895`  
**Iteration Milestone:** `REA-ITER-223` (Hardware BLE Soundbox Controller & Battery Telemetry Engine)  
**Target Subsystems:** `src/soundboxService.js`, `src/storageRepository.js`, `test_iteration_223_soundbox_ble_and_battery_backend.js`  
**Reference Evidence:** `docs/rea-reconstruction/investigations/REA_INVESTIGATION_ITER_223_SOUNDBOX_HARDWARE_AND_BLE.md` (`REF-001`)  
**Audit Date:** 2026-11-03  
**Status:** COMPLETED — 100% PASS RATE (17 / 17 TESTS PASSED IN ITER-223 BACKEND SUITE; 77 / 77 TESTS PASSED IN REFERENCE SUITE)

---

## 1. Executive Summary

Milestone **REA-ITER-223** delivers the clean-room **Hardware BLE Soundbox Controller & Battery Telemetry Engine** for TallyKhata. In high-density retail bazaars across Bangladesh, micro-merchants rely on instantaneous, loud audible payment confirmations (e.g., *"বিকাশ থেকে পাঁচশত টাকা সফলভাবে জমা হয়েছে।"*) to prevent payment fraud and confirm transactions without constantly diverting attention to mobile screens.

Building directly upon the reverse-engineering evidence documented by Worker 1 (Gibbs) in `REA_INVESTIGATION_ITER_223_SOUNDBOX_HARDWARE_AND_BLE.md`, Worker 2 (Averroes) has implemented:
1. **Bluetooth Low Energy (BLE) Soundbox Controller (`src/soundboxService.js`)**:
   - Connection lifecycle state machine: `DISCONNECTED`, `SCANNING`, `CONNECTING`, `CONNECTED`, `ERROR`.
   - Comprehensive BLE Soundbox device model schema (`id`, `name`, `macAddress`, `rssi`, `batteryLevel`, `isCharging`, `lastSeen`, `volumeLevel`, `firmwareVersion`).
   - GATT Service & Characteristic specifications adhering to standard Bluetooth SIG (Battery Service `0x180F` / Char `0x2A19`) and proprietary Soundbox Control Service (`0xFFE0` / Chars `0xFFE1`, `0xFFE2`, `0xFFE3`).
2. **0xFFE1 Characteristic Binary Packet Serializer & CRC-16 Checksum**:
   - 16-byte fixed binary packet structure: preamble (`0xAA 0x55`), payment command (`0x01`), currency code (`0x01` BDT), channel ID (bKash, Nagad, Rocket, Bangla QR, Cash), 8-byte Big-Endian unsigned BigInt paisa amount (1 Taka = 100 Paisa), and Little-Endian CRC-16 checksum.
   - CRC-16 (Modbus/ARC, polynomial `0xA001`, initial `0xFFFF`) calculation and tamper rejection over payload bytes.
   - 0.00 Paisa float drift across boundary conditions (from 1 paisa to 10 crore taka).
3. **Battery Telemetry State Machine & Low-Power Threshold Monitoring**:
   - Continuous battery level monitoring (`0` to `100%`) and AC charging state detection.
   - Multi-tier thresholds: `BATTERY_LOW_THRESHOLD = 15%` (triggers advisory telemetry event) and `BATTERY_CRITICAL_THRESHOLD = 10%` (triggers critical alert and auto-failover).
4. **Dual-Routing Audio Feedback Engine (`routeAudioNotification`)**:
   - Intelligently routes payment announcements to `HARDWARE_BLE_SOUNDBOX` when BLE is connected and battery is >= 10%.
   - Transparently falls back to `SOFTWARE_IN_APP_TTS` (via `SoundboxQueueManager`) when BLE is disconnected, unbonded, or in a critical battery state (< 10%).
   - Supports `SILENT_OR_VIBRATE` fallback when merchant disables TTS notifications.
5. **Bidirectional Volume Scale Synchronization**:
   - Harmonizes hardware media stream volume steps (`0` to `15`) with software queue volume levels (`1` to `5`) and duty cycle percentages (`0%` to `100%`).
6. **Multi-Tenant Storage Persistence & Mutual Exclusion (`src/storageRepository.js`)**:
   - Persists soundbox device settings (`saveSoundboxDeviceSettings`, `getSoundboxDeviceSettings`) and telemetry logs (`logSoundboxTelemetry`, `getSoundboxTelemetry`) strictly isolated by `businessId`.
   - Serialized under `this.writeQueue` mutex to prevent race conditions during high-frequency Bluetooth sync.
   - Cloud backup sanitization in `getFullBackupState`: strips live connection tokens, socket handles, and live RSSI, resetting state to `DISCONNECTED`.
   - Cascade cleanup in `deleteBusinessCascade`: removes soundbox settings and purges telemetry logs for deleted businesses.

---

## 2. Technical Invariants & GATT Protocol Specifications

### 2.1 GATT Profile Architecture

| Service / Characteristic | UUID | Properties | Data Representation |
| :--- | :--- | :--- | :--- |
| **Battery Service** | `0000180F-0000-1000-8000-00805F9B34FB` | Primary Service | Standard Bluetooth SIG Service |
| **Battery Level Char** | `00002A19-0000-1000-8000-00805F9B34FB` | `READ | NOTIFY` | 1 byte UInt8 (0-100% battery percentage) |
| **Soundbox Control Service** | `0000FFE0-0000-1000-8000-00805F9B34FB` | Primary Service | Custom Merchant Soundbox GATT Service |
| **Audio Command Char** | `0000FFE1-0000-1000-8000-00805F9B34FB` | `WRITE | WRITE_NO_RESP` | 16-byte binary payment command packet |
| **Volume Sync Char** | `0000FFE2-0000-1000-8000-00805F9B34FB` | `READ | WRITE | NOTIFY` | 1 byte UInt8 (0-15 hardware volume step) |
| **Hardware Telemetry Char** | `0000FFE3-0000-1000-8000-00805F9B34FB` | `READ | NOTIFY` | Telemetry fields (charging status, RSSI, ping) |

### 2.2 0xFFE1 Binary Payment Packet Structure

The 16-byte binary packet transmitted to characteristic `0xFFE1` follows this exact byte layout:

```
Offset (Bytes)   Field Name         Type           Description
─────────────────────────────────────────────────────────────────────────────
0x00 .. 0x01     Preamble           UInt16BE       Fixed header sync word: 0xAA55
0x02             Command ID         UInt8          0x01 = Payment Announcement
0x03             Currency Code      UInt8          0x01 = BDT (Bangladeshi Taka)
0x04             Channel ID         UInt8          Payment source:
                                                   0x00 = Default / In-App
                                                   0x01 = bKash
                                                   0x02 = Nagad
                                                   0x03 = Rocket
                                                   0x04 = Bangla QR / Bank
                                                   0x05 = Upay
                                                   0x06 = Cash
0x05 .. 0x0C     Amount (Paisa)     BigUInt64BE    64-bit integer paisa (1 Tk = 100 Ps)
0x0D .. 0x0E     CRC-16 Checksum    UInt16LE       CRC-16/ARC checksum of bytes 0..12
0x0F             Reserved           UInt8          0x00 delimiter / reserved byte
─────────────────────────────────────────────────────────────────────────────
Total Length: 16 Bytes
```

### 2.3 CRC-16 Calculation & Bit-Flip Rejection
The packet checksum is computed across the first 13 payload bytes (offsets `0x00` through `0x0C`) using standard CRC-16 (Modbus/ARC algorithm):
Polynomial = 0xA001, Initial Value = 0xFFFF.
Upon reception or verification, `parseAudioCommandPacket` recomputes the checksum. Any single-bit corruption or transmission corruption marks `isValid: false` and `isCrcValid: false`, preventing erroneous audio announcements.

### 2.4 Volume Scale Synchronization Logic
Soundbox volume levels operate on two synchronized scales:
1. **Software Audio Queue Scale:** 1 (minimum audible) to 5 (maximum retail bazaar volume).
2. **Hardware Soundbox Scale:** 0 (muted) to 15 (maximum hardware amplifier gain, matching Android media volume steps).

Conversion Formulas:
- **Software to Hardware:** `hwStep = Math.max(0, Math.min(15, Math.round(swVol * 3)))` (1 -> 3, 2 -> 6, 3 -> 9, 4 -> 12, 5 -> 15).
- **Hardware to Software:** `swVol = Math.max(1, Math.min(5, Math.round(hwStep / 3)))` (0 -> 1, 1..3 -> 1, 4..6 -> 2, 7..9 -> 3, 10..12 -> 4, 13..15 -> 5).
- **Duty Cycle Percentage (0-100%):** `duty = Math.round((hwStep / 15) * 100)`.

### 2.5 Dual-Routing Audio Feedback Invariant
The decision logic for `routeAudioNotification` executes deterministically:
- Routes to `HARDWARE_BLE_SOUNDBOX` if `isConnected` is true and `batteryLevel >= 10%`.
- Routes to `SOFTWARE_IN_APP_TTS` if disconnected or `batteryLevel < 10%`, provided TTS is enabled.
- Routes to `SILENT_OR_VIBRATE` if disconnected or critical battery, and TTS is disabled.

---

## 3. Storage Persistence & Multi-Tenant Data Contracts

### 3.1 Repository Schema Extension (`src/storageRepository.js`)
To maintain complete multi-tenant isolation across multiple business shops, soundbox configurations and telemetry are persisted with strict `businessId` scoping:

1. **`soundboxSettings` Store Property:**
   - Map of `[businessId]: SoundboxDeviceSettings`.
   - Fields: `id`, `name`, `macAddress`, `volumeLevel`, `autoConnect`, `businessId`, `updatedAt`.
2. **`soundboxLogs` Collection:**
   - Appended with telemetry records: `id` (`sbt_...`), `businessId`, `type`, `batteryLevel`, `isCharging`, `status`, `rssi`, `timestamp`.
3. **Repository Methods:**
   - `saveSoundboxDeviceSettings(settings, options = {})`: Mutates store under `writeQueue` mutex.
   - `getSoundboxDeviceSettings(businessId = null)`: Returns configuration for target shop.
   - `logSoundboxTelemetry(telemetryEvent, options = {})`: Appends telemetry record to `soundboxLogs`.
   - `getSoundboxTelemetry(businessId = null)`: Filters telemetry logs for target shop.
4. **Cloud Backup Sanitization (`getFullBackupState`):**
   - Strips transient hardware attributes (`connectionToken`, `socketHandle`, `rssi`) before serializing Google Drive backup payloads.
   - Explicitly resets `isConnected = false` and `connectionState = "DISCONNECTED"` so restoring a backup on another device never assumes stale hardware pairing.
5. **Business Cascade Deletion (`deleteBusinessCascade`):**
   - Automatically cleans up `soundboxSettings[targetId]` and purges all entries in `soundboxLogs` where `getBizId(s) === targetId`.

---

## 4. Automated Test Verification Results

### 4.1 Iteration 223 Backend Verification Suite
**File:** `test_iteration_223_soundbox_ble_and_battery_backend.js`  
**Execution Command:** `node test_iteration_223_soundbox_ble_and_battery_backend.js`  
**Result:** 17 / 17 Tests Passed (100% Success Rate)

```
================================================================================
TALLYKHATA ITERATION 223: SOUNDBOX BLE & BATTERY BACKEND TEST SUITE
Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
================================================================================

--- 1. Protocol Constants & GATT Specification ---
  ✓ [PASS] Protocol constants and GATT UUIDs conform to Bluetooth SIG & Soundbox spec

--- 2. Device Connection State Machine ---
  ✓ [PASS] SoundboxDeviceManager executes valid state transitions

--- 3. 0xFFE1 Binary Packet Encoding & CRC-16 Integrity ---
  ✓ [PASS] buildAudioCommandPacket encodes 16-byte buffer with exact layout and CRC-16
  ✓ [PASS] Tampered packet fails CRC-16 verification
  ✓ [PASS] Integer paisa arithmetic handles extreme boundaries without float drift

--- 4. Battery Telemetry & Automatic Threshold Logic ---
  ✓ [PASS] updateBatteryTelemetry tracks normal, low, and critical thresholds

--- 5. Volume Synchronization (Hardware 0-15 vs Software 1-5) ---
  ✓ [PASS] Volume conversion and bidirectional synchronization

--- 6. Dual Audio Routing & Automatic Fallback Engine ---
  ✓ [PASS] resolveAudioFeedbackSink adheres to connectivity and power invariants
  ✓ [PASS] routeAudioNotification routes to hardware when connected and battery >= 10%
  ✓ [PASS] routeAudioNotification falls back to Software TTS on low battery (< 10%)
  ✓ [PASS] routeAudioNotification falls back to Software TTS when disconnected
  ✓ [PASS] routeAudioNotification returns SILENT_OR_VIBRATE when TTS is disabled

--- 7. Storage Persistence, Mutex & Multi-Tenant Isolation ---
  ✓ [PASS] saveSoundboxDeviceSettings & getSoundboxDeviceSettings isolate across businesses
  ✓ [PASS] logSoundboxTelemetry & getSoundboxTelemetry record and isolate logs
  ✓ [PASS] getFullBackupState sanitizes live tokens, socket handles, and live RSSI
  ✓ [PASS] deleteBusinessCascade purges soundboxSettings and telemetry logs for target business
  ✓ [PASS] Standalone exported repository helpers function correctly

================================================================================
TOTAL: 17 | PASSED: 17 | FAILED: 0 (100% SUCCESS)
================================================================================
```

### 4.2 Reference APK Cross-Verification Suite
**File:** `test_iteration_223_soundbox_hardware_and_ble_reference_architecture.js`  
**Execution Command:** `node test_iteration_223_soundbox_hardware_and_ble_reference_architecture.js`  
**Result:** 77 / 77 Tests Passed (100% Success Rate)

---

## 5. Architectural Deliverable Matrix

| Component | Target File | Exported APIs / Interfaces | Milestone Status |
| :--- | :--- | :--- | :--- |
| **BLE Soundbox Controller** | `src/soundboxService.js` | `SoundboxDeviceManager`, `soundboxDeviceManager`, `CONNECTION_STATES`, `GATT_UUIDS` | Certified Clean-Room |
| **0xFFE1 Packet Serializer** | `src/soundboxService.js` | `buildAudioCommandPacket`, `parseAudioCommandPacket`, `calculatePacketCrc16` | Certified Clean-Room |
| **Battery Telemetry** | `src/soundboxService.js` | `BATTERY_THRESHOLDS`, `updateBatteryTelemetry`, `isLowBattery`, `isCriticalBattery` | Certified Clean-Room |
| **Volume Scaling** | `src/soundboxService.js` | `convertVolumeStepToDuty`, `convertSoftwareVolumeToHardware`, `syncHardwareVolume` | Certified Clean-Room |
| **Dual Audio Router** | `src/soundboxService.js` | `routeAudioNotification`, `resolveAudioFeedbackSink`, `ROUTING_TARGETS` | Certified Clean-Room |
| **Storage Persistence** | `src/storageRepository.js` | `saveSoundboxDeviceSettings`, `getSoundboxDeviceSettings`, `logSoundboxTelemetry` | Certified Clean-Room |
| **Automated Tests** | `test_iteration_223_...js` | 17 comprehensive unit & integration tests | 100% Passing |

---

## 6. Git Safety & Non-Destructive Integrity Certification

In compliance with AGENTS.md rules and TallyKhata production guidelines:
- **Zero Git Mutations:** No `git commit`, `git push`, or destructive commands were executed.
- **Untracked Directory Preservation:** `extracted_apk/` and local binary caches remain completely untouched.
- **Zero External Dependencies:** Built strictly with Node.js standard libraries (`crypto`, `Buffer`).
- **Paisa Precision Guaranteed:** Integer paisa arithmetic (1 Taka = 100 Paisa) verified with 0.00 Paisa float drift.
