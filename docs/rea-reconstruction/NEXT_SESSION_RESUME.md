# REA RECONSTRUCTION — RESUME DIRECTIVE & CHECKPOINT
**Current Iteration Completed:** REA-ITER-233 (TallyPay Add Money from Bank / Card / MFS Subsystem & Saved Cards — `AddMoneyActivity`, `AddMoneyFromBankActivity`, `AddMoneyFromCardActivity`, `AddMoneyWebViewActivity`, `AddMoneyFromNagadActivity`, `AddMoneyFromRocketActivity`)  
**Next Iteration Target:** REA-ITER-234 (TallyPay Money Out / Wallet Transfer Subsystem — `TpTransferActivity` & `SelectCustomerForAdayActivity`)  
**System Status:** ACTIVE — REVERSE ENGINEERING AND RECONSTRUCTION IN PROGRESS  
**Reference Target:** D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk (REF-001)  
**SHA-256:** 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9  
**Latest Built APK:** android/app/build/outputs/apk/debug/app-debug.apk  
**Target Device:** Xiaomi Redmi Note 9 (737ee4410405) — Verified Live Running  
**Test Baseline:** 331 / 331 test suites passing (100% green, 8,000+ discrete assertions, 0 regressions)  

---

## 1. Permanent Worker Registry & Persistent Thread IDs
The system operates with exactly THREE persistent Subagent workers:

| Worker | Persistent Thread ID | Permanent Assigned Role | Operational Status |
| :--- | :--- | :--- | :--- |
| **Worker 1 (Gibbs)** | 01a19154-99ab-72a0-9e23-2611b9ffc74c | Permanent REA Reverse Engineering Investigator | Active & Verified (Iteration 233 Completed) |
| **Worker 2 (Averroes / Peirce)** | 01a1a349-61ae-74d0-aed6-1792e7d1d594 | Permanent Backend Developer & Business Logic | Active & Verified (Iteration 233 Completed) |
| **Worker 3 (Ohm)** | 01a19154-e3ee-7ab2-b682-798b64a0bb6b | Permanent Frontend Developer, UI/UX & Interactions | Active & Verified (Iteration 233 Completed) |
| **Main Agent** | (Orchestrator) | Architecture, Integration, Evidence Review & Parity Audit | Active |

---

## 2. Iteration 233 Deliverables Summary
1. **Reference Architecture Parity (`test_iteration_233_add_money_reference_architecture.js`):** 117 / 117 passed (100%).
2. **Backend Engine & Persistence (`test_iteration_233_add_money_backend.js`):** 26 / 26 passed (100%).
3. **Frontend UI/UX & Interactions (`test_iteration_233_ui_add_money.js`):** 46 / 46 passed (100%).
4. **Consolidated Audit Report:** `docs/rea-reconstruction/iterations/ITERATION_233_REPORT.md`.
5. **Full Regression Suite:** 100% green across all existing and phase test suites (0 regressions).

---

## 3. Next Iteration Action Plan (Iteration 234)
1. **Wallet Transfer & Money Out Architecture:** Reverse engineer `TpTransferActivity`, `SelectCustomerForAdayActivity`, and `WalletTransferDto` from `REF-001`.
2. **Transfer Engine & Transaction Limits:** Implement P2P merchant wallet transfers, QR-scanned payee resolution, fee structure, and OTP/PIN confirmation.
3. **Transfer UI Flows:** Implement Modals 92+ for recipient selection, transfer amount entry, PIN verification, and digital debit voucher.
