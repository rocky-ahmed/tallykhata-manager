# REA RECONSTRUCTION — RESUME DIRECTIVE & CHECKPOINT
**Current Iteration Completed:** `REA-ITER-208` (Bulk Tagada Multi-Customer Dispatch, Statement Document Generator & Live Device UI QA)
**Next Iteration Target:** `REA-ITER-209` (PDF Document Canvas Rendering / Export Pipeline & In-Field Release Cadence)
**System Status:** ACTIVE — PRODUCTION READY & VERIFIED  
**Reference Target:** `D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk` (`REF-001`)  
**SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Test Baseline:** 259 / 259 test suites passing (100% green, 4,974+ discrete assertions, 0 regressions)

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

## 2. Immediate Resume Action Plan (Iteration 209)
1. **Gibbs (Worker 1):** Reverse-engineer PDF Canvas rendering pipeline, `android.graphics.pdf.PdfDocument`, and statement export mechanics from reference APK.
2. **Averroes (Worker 2):** Implement print and export formatters, PDF layout generation service, and multi-tenant PDF document export verification.
3. **Ohm (Worker 3):** Physical device UI verification of PDF export workflow, print preview dialogs, and touch interaction latency on Redmi Note 9.
4. **Main Orchestrator:** Maintain 100% green status across all 259 test suites and verify zero regressions.

---

## 3. Strict Safety Directives
- **Goal Status:** Keep goal `ACTIVE` until all 12 core features reach verified parity. Never mark complete on documentation alone.
- **Git Safety:** Always adhere to user authorization. Never force push. Protected files (`App.js.bak`, `extracted_apk/`) must remain untracked.
- **Data Protection:** Financial calculations must maintain integer-paisa precision ($1\text{ Taka} = 100\text{ Paisa}$) with zero floating-point drift up to ৳100,000,000.
