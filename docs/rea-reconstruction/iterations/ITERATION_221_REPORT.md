# REA RECONSTRUCTION — ITERATION 221 AUDIT REPORT
**Milestone:** REA-ITER-221 (TallyPay Wallet Add Money, Transaction Limits & Merchant QR Soundbox Notification Pipeline)  
**Maintained by:** Main Engineering Orchestrator  
**Audit Date:** 2026-11-03  
**Status:** **COMPLETED — 100% PASS RATE (296 / 296 TEST SUITES GREEN, ZERO REGRESSIONS)**  
**Reference Binary:** TallyKhata-Demo.apk (REF-001, SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9)  
**Target Hardware:** Xiaomi Redmi Note 9 (737ee4410405, Android 11/12)  

---

## 1. Executive Summary

Milestone **REA-ITER-221** delivers the **TallyPay Wallet Add Money (টাকা লোড / ক্যাশ-ইন), Transaction Limits & Thresholds (লেনদেনের লিমিট ও চার্জ), and Merchant QR Soundbox Voice Notification Subsystem** for TallyKhata.

Under Bangladesh Bank's interoperable digital commerce framework, merchants need seamless wallet top-up through MFS and card channels, strict transaction velocity protection with transparent fee structures (১০০% ফ্রি অ্যাড মানি), and loud, clear audio prompts via a Soundbox queue when payments arrive in noisy bazaar retail environments.

Iteration 221 delivers:
1. **Clean-Room TallyPay Digital Wallet Engine (`src/tallyPayService.js`):**
   - Implements standard `TRANSACTION_LIMITS` for `add_money`, `send_money`, `cash_out`, and `payment_qr` matching `activity_transaction_limit.xml`.
   - Fee tiers and service charges (`SERVICE_CHARGES`): 100% free Add Money, free QR Payment Receive, free Bank Transfer, and 1.49% Agent Cash Out.
   - Multichannel provider catalog (`SUPPORTED_ADD_MONEY_CHANNELS`): bKash, Nagad, Rocket, Upay, Visa Card, Mastercard, and Internet Banking.
   - `calculateServiceFee`: Exact integer paisa precision ($1\text{ Taka} = 100\text{ Paisa}$) preventing any floating-point representation drift.
   - `validateAddMoney`: Comprehensive single-transaction min/max limits, daily frequency velocity limits, and daily volume caps.
   - `initiateAddMoneyTransaction`: Atomic wallet top-up transaction generation with unique `TP-ADD-` transaction numbers, status codes, and ledger balance updates.

2. **Clean-Room Merchant QR Soundbox Voice Notification Engine (`src/soundboxService.js`):**
   - Authentic Bengali voice prompt synthesis (`generateSoundboxPrompt`): `"{appNameBn} থেকে {amountBnWords} টাকা সফলভাবে জমা হয়েছে।"`.
   - `SoundboxQueueManager`: In-memory FIFO queue ensuring sequential audible playback without voice collision during rapid concurrent customer payments.
   - Volume controls (1 to 5, default max 5 for bazaar acoustics) and mute toggle.
   - Playback history retention (capped at 100 events).

3. **Storage Repository Mutex & Domain Isolation (`src/storageRepository.js`):**
   - Registered `tallyPayAddMoneyTxns` and `soundboxLogs` collections under writeQueue mutex.
   - Multi-tenant business partitioning by `businessId`.
   - Cascade purges on business deletion via `deleteBusinessCascade`.
   - Cloud backup sanitization stripping volatile audio buffers and raw bytes before Google Drive sync.

4. **TallyPay Add Money & Soundbox UI/UX Upgrades (`App.js`):**
   - Upgraded `modalAddMoney` with horizontal scrollable channel chips, Bengali quick amount chips (৳১০০, ৳৫০০, ৳১,০০০, ৳৫,০০০), limit hint, and zero-fee badge.
   - Added authentic Soundbox audio announcement banner to `superQrSuccessModal`.
   - Fixed repeated strings in `modalTxnLimit` (tabs, account status, NID verification).
   - Safe Android hardware BackHandler dismissal across all modals.

5. **Symmetrical Bilingual Localization (`src/i18nService.js`):**
   - Added symmetrical keys for TallyPay Add Money and Soundbox in `STRINGS.bn` and `STRINGS.en`.

---

## 2. Three Persistent Worker Contributions

1. **Worker 1 (Gibbs — 01a19154-99ab-72a0-9e23-2611b9ffc74c):**
   - Reverse-engineered reference APK: `AddMoneyActivity`, `AddMoneyFromNagadActivity`, `AddMoneyFromCardActivity`, `AddMoneyFromRocketActivity`, `activity_transaction_limit.xml`, `layout_add_money_success.xml`, `ic_add_money_large.xml`, `ic_add_money_new.xml`, and authentic ARSC strings.
   - Authored: `docs/rea-reconstruction/investigations/REA_INVESTIGATION_ITER_221_TALLYPAY_AND_SOUNDBOX.md`.
   - Delivered test suite: `test_iteration_221_tallypay_and_soundbox_reference_architecture.js` (29 / 29 passing, 100%).

2. **Worker 2 (Averroes — 01a19154-c135-75d0-b38a-1ea50f004895):**
   - Created `src/tallyPayService.js` and `src/soundboxService.js`.
   - Upgraded `src/storageRepository.js` with `tallyPayAddMoneyTxns` and `soundboxLogs`.
   - Delivered test suite: `test_iteration_221_tallypay_and_soundbox_backend.js` (10 / 10 passing, 100%).

3. **Worker 3 (Ohm — 01a19154-e3ee-7ab2-b682-798b64a0bb6b):**
   - Upgraded `modalAddMoney`, `superQrSuccessModal`, and `modalTxnLimit` in `App.js`.
   - Added symmetrical localization in `src/i18nService.js`.
   - Delivered test suite: `test_iteration_221_ui_tallypay_and_soundbox.js` (7 / 7 passing, 100%).

---

## 3. Test Suites & Quality Assurance

- `node test_iteration_221_tallypay_and_soundbox_reference_architecture.js`: 29 / 29 PASS (100%)
- `node test_iteration_221_tallypay_and_soundbox_backend.js`: 10 / 10 PASS (100%)
- `node test_iteration_221_ui_tallypay_and_soundbox.js`: 7 / 7 PASS (100%)
- Full regression across all 296 test suites: 100% green, 0 failures.
