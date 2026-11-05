# REA RECONSTRUCTION — RESUME DIRECTIVE & CHECKPOINT
**Current Iteration Completed:** REA-ITER-237 (TallyPay Merchant KYC, NID Scanner OCR & Bio-Verification Pipeline — `EkycActivity`, `EkycInitActivity`, `ImageCaptureActivity`, `NIDVerificationActivity`, `NidInfoActivity`, `TpCaptureNidSuccessActivity`, `EkycLivenessScreen`)  
**Next Iteration Target:** REA-ITER-238 (TallyPay Merchant QR Standee Order, POS Soundbox Collateral & Merchant Material Delivery Subsystem — `MerchantQrOrderActivity`, `QrMaterialSelectionFragment`, `DeliveryAddressModal`, `OrderTrackingActivity`)  
**System Status:** ACTIVE — REVERSE ENGINEERING AND RECONSTRUCTION IN PROGRESS  
**Reference Target:** D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk (REF-001)  
**SHA-256:** 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9  
**Latest Built APK:** android/app/build/outputs/apk/debug/app-debug.apk  
**Target Device:** Xiaomi Redmi Note 9 (737ee4410405) — Verified Live Running  
**Test Baseline:** 339 / 339 test suites passing (100% green, 8,860+ discrete assertions, 0 regressions)  

---

## 1. Permanent Worker Registry & Persistent Thread IDs
The system operates with exactly THREE persistent Subagent workers:

| Worker | Persistent Thread ID | Permanent Assigned Role | Operational Status |
| :--- | :--- | :--- | :--- |
| **Worker 1 (Gibbs)** | 01a19154-99ab-72a0-9e23-2611b9ffc74c | Permanent REA Reverse Engineering Investigator | Active & Verified (Iteration 237 Completed) |
| **Worker 2 (Averroes / Peirce)** | 01a1a349-61ae-74d0-aed6-1792e7d1d594 | Permanent Backend Developer & Business Logic | Active & Verified (Iteration 237 Completed) |
| **Worker 3 (Ohm)** | 01a19154-e3ee-7ab2-b682-798b64a0bb6b | Permanent Frontend Developer, UI/UX & Interactions | Active & Verified (Iteration 237 Completed) |
| **Main Agent** | (Orchestrator) | Architecture, Integration, Evidence Review & Parity Audit | Active |

---

## 2. Iteration 237 Deliverables Summary
1. **Reference Architecture Parity (`test_iteration_237_kyc_reference_architecture.js`):** 130 / 130 passed (100%).
2. **Backend Engine & Persistence (`test_iteration_237_kyc_backend.js`):** 54 / 54 passed (100%).
3. **Frontend UI/UX & Interactions (`test_iteration_237_ui_kyc.js`):** 59 / 59 passed (100%).
4. **Consolidated Audit Report:** `docs/rea-reconstruction/iterations/ITERATION_237_REPORT.md`.
5. **Full Regression Suite:** 100% green across all existing and phase test suites (0 regressions across 655-assertion matrix).
6. **Modal Count Invariant:** Increment confirmed from 106 to exactly **111 Modals** in `App.js`.

---

## 3. Next Iteration Action Plan (Iteration 238)
1. **Merchant QR Standee & Collateral Order Pipeline:** Reverse engineer `MerchantQrOrderActivity`, `QrMaterialSelectionFragment`, and `DeliveryAddressModal` from `REF-001`.
2. **Order Management & Fulfillment Tracking:** Implement Room SQLite table `merchant_qr_order`, address validation (divisions, districts, postal codes), and dispatch tracking state machine.
3. **Standee Customization & Preview Modals:** Implement Modals 112 to 116 in `App.js` with material preview, address input, payment method selection, and order status tracking.
