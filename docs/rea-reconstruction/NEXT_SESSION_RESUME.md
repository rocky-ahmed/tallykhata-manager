# REA RECONSTRUCTION — RESUME DIRECTIVE & CHECKPOINT
**Current Iteration Completed:** `REA-ITER-010` (Feature 009: Bilingual i18n & High-DPI Font Parity)  
**Next Iteration Target:** `REA-ITER-011` (Feature 010: Tactile Feedback & UX Parity)  
**System Status:** ACTIVE — REVERSE ENGINEERING AND RECONSTRUCTION IN PROGRESS  
**Reference Target:** `D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk` (`REF-001`)  
**SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Test Baseline:** 48 / 48 test suites passing (100% green, 1,140+ discrete assertions, 0 regressions)  

---

## 1. Permanent Worker Registry & Persistent Thread IDs
The system operates with exactly THREE persistent Subagent workers (DO NOT spawn new or duplicate workers):

| Worker | Persistent Thread ID | Permanent Assigned Role | Operational Status |
| :--- | :--- | :--- | :--- |
| **Worker 1 (Gibbs)** | `01a19154-99ab-72a0-9e23-2611b9ffc74c` | Permanent REA Reverse Engineering Investigator | Active & Verified |
| **Worker 2 (Averroes)** | `01a19154-c135-75d0-b38a-1ea50f004895` | Permanent Backend Developer & Business Logic | Active & Verified |
| **Worker 3 (Ohm)** | `01a19154-e3ee-7ab2-b682-798b64a0bb6b` | Permanent Frontend Developer, UI/UX & Interactions | Active & Verified |
| **Main Agent** | (Orchestrator) | Architecture, Integration, Evidence Review & Parity Audit | Active |

---

## 2. Immediate Resume Action Plan (Iteration 011)
1. **Gibbs (Worker 1):** Investigate audio assets and haptic feedback timings in reference app (`res/raw/`, `Vibrator` patterns).
2. **Averroes (Worker 2):** Audit merchant transaction commit audio feedback and 3-tier fallback engine (`src/hapticFeedbackService.js`).
3. **Ohm (Worker 3):** Reconcile 3D tactile buttons, press animations, and sound triggers in `App.js`.
4. **Main Orchestrator:** Run test suites (`node test_haptic_feedback.js`), verify 0 regressions across all 48 suites, and draft `docs/rea-reconstruction/iterations/ITERATION_011_REPORT.md`.

---

## 3. Strict Safety Directives
- **Goal Status:** Keep goal `ACTIVE` until all 12 core features reach verified parity. Never mark complete on documentation alone.
- **Git Safety:** Commit and push only with explicit user authorization or upon verified milestone delivery. Never force push. Protected files (`App.js.bak`, `extracted_apk/`) must remain untracked.
- **Data Protection:** Financial calculations must maintain integer-paisa precision ($1\text{ Taka} = 100\text{ Paisa}$) with zero floating-point drift up to ৳100,000,000.
