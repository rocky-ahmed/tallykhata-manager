# REA RECONSTRUCTION — ITERATION 223 AUDIT REPORT
**Milestone:** REA-ITER-223 (Merchant Soundbox Bluetooth Device Pairing, Audio Feedback & Battery Telemetry)  
**Maintained by:** Main Engineering Orchestrator  
**Audit Date:** 2026-11-04  
**Status:** **COMPLETED — 100% PASS RATE (ALL 132/132 NEW TESTS PASSED, ZERO REGRESSIONS)**  
**Reference Binary:** TallyKhata-Demo.apk (REF-001, SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9)  
**Target Hardware:** Xiaomi Redmi Note 9 (737ee4410405, Android 11/12)  

---

## 1. Executive Summary

Milestone **REA-ITER-223** delivers the **Merchant Soundbox Bluetooth Device Pairing, Audio Feedback & Battery Telemetry Subsystem** for TallyKhata.

Building upon the Software Soundbox (Iteration 221), this milestone implements support for external retail counter hardware via Bluetooth Low Energy (BLE), real-time battery monitoring with automatic failover to in-app TTS, and bidirectional hardware-software volume synchronization:

1. **Hardware BLE Soundbox Controller (`src/soundboxService.js`):**
   - **Connection State Machine:** Lifecycle transitions (`DISCONNECTED`, `SCANNING`, `CONNECTING`, `CONNECTED`, `ERROR`).
   - **GATT Specification:** Bluetooth SIG Battery Service (`0x180F` / `0x2A19`) and custom Soundbox Control Service (`0xFFE0` / `0xFFE1`, `0xFFE2`, `0xFFE3`).
   - **16-Byte Binary Packet Serializer (0xFFE1):** Preamble `0xAA 0x55`, command `0x01`, BDT currency, channel byte, 64-bit BigInt paisa amount, and CRC-16 Modbus/ARC checksum.
   - **Integer Paisa Invariance:** Exact integer precision ($1\text{ Taka} = 100\text{ Paisa}$) preventing any floating-point drift.
   - **Battery Telemetry & Auto-Fallback:**
     - Battery $\le 15\%$: Low battery warning telemetry.
     - Battery $< 10\%$: Critical battery event, seamlessly routing audio to local phone speaker (`SOFTWARE_IN_APP_TTS` via `SoundboxQueueManager`).
   - **Volume Synchronization:** Harmonizes 0-15 hardware volume steps with 1-5 software steps and 0-100% duty cycle.

2. **Storage Repository Mutex & Domain Isolation (`src/storageRepository.js`):**
   - Implemented `saveSoundboxDeviceSettings`, `getSoundboxDeviceSettings`, `logSoundboxTelemetry`, and `getSoundboxTelemetry`.
   - Mutex protected under `this.writeQueue` to guarantee atomic writes.
   - Multi-tenant business partitioning by `businessId`.
   - Backup sanitization in `getFullBackupState` resetting live connection handles and RSSI to `DISCONNECTED`.
   - Cascade purges on business deletion via `deleteBusinessCascade`.

3. **Merchant Soundbox BLE UI & Settings Modal (`App.js`):**
   - Created `modalSoundboxSettings` with real-time pairing status badges (Connected / Scanning / Disconnected).
   - Battery telemetry card with progress bar, charging indicator ⚡, and low-battery warning badges.
   - Volume synchronization stepper controls (0-15 scale) and 5-step quick pills.
   - Dual audio routing status badge: 'হার্ডওয়্যার সাউন্ডবক্স' vs 'ইন-অ্যাপ সাউন্ডবক্স (TTS)' fallback.
   - 'সাউন্ড টেস্ট করুন' test announcement button triggering audio prompt via `routeAudioNotification`.
   - Android hardware BackHandler safe dismissal and accessible touch targets ($\ge 48\times 48\text{dp}$).

4. **Symmetrical Bilingual Localization (`src/i18nService.js`):**
   - Symmetrically added all Soundbox BLE translation tokens in `STRINGS.bn` and `STRINGS.en`.

---

## 2. Test Verification Matrix

| Suite | Description | Tests | Status |
| :--- | :--- | :--- | :--- |
| `test_iteration_223_soundbox_hardware_and_ble_reference_architecture.js` | Reference APK Bytecode, BLE Permissions, ARSC & Protocol Spec | 77 / 77 | **PASS (100%)** |
| `test_iteration_223_soundbox_ble_and_battery_backend.js` | Connection State Machine, 0xFFE1 Packet Serialization, CRC-16 & Fallback | 17 / 17 | **PASS (100%)** |
| `test_iteration_223_ui_soundbox_ble.js` | UI Hooks, Pairing Badges, Battery Telemetry, Volume Sync & WCAG Contrast | 38 / 38 | **PASS (100%)** |
| **Total Iteration 223 Tests** | **Comprehensive Full-Stack Hardware & UI Suite** | **132 / 132** | **PASS (100%)** |

---

## 3. Worker Status & Concurrency Ledger

- **Worker 1 (Gibbs — `01a19154-99ab-72a0-9e23-2611b9ffc74c`):** Reference investigation completed (`REA_INVESTIGATION_ITER_223_SOUNDBOX_HARDWARE_AND_BLE.md`, 77/77 tests passed).
- **Worker 2 (Averroes — `01a19154-c135-75d0-b38a-1ea50f004895`):** Backend implementation completed (`src/soundboxService.js`, `src/storageRepository.js`, 17/17 tests passed).
- **Worker 3 (Ohm — `01a19154-e3ee-7ab2-b682-798b64a0bb6b`):** Frontend UI/UX completed (`App.js`, `src/i18nService.js`, 38/38 tests passed).
- **Main Agent:** Architecture integration, AST validation, full regression verification.
