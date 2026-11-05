# TALLYKHATA — WORKER ASSIGNMENT MATRIX

**Living Worker Registry & Task Tracking Document**  
**Milestone:** REA-ITER-240 (TallyPay Merchant Cashback, Scratch Card Rewards & Loyalty Points Subsystem)  
**Main Orchestrator:** Lead Software Architect & Principal Engineer  

---

## 1. Permanent Worker Registry & Persistent Subagents

The project operates with exactly **THREE designated persistent Subagent workers** coordinated by the Main Agent.

| Worker Name | Persistent Thread ID | Permanent Assigned Role | Subagent Operational Status |
| :--- | :--- | :--- | :--- |
| **Worker 1 (Gibbs)** | `01a19154-99ab-72a0-9e23-2611b9ffc74c` | Principal REA Reverse Engineering Investigator | Active & Operational (Completed Iter 240: 137/137 pass) |
| **Worker 2 (Averroes / Peirce)** | `01a1a349-61ae-74d0-aed6-1792e7d1d594` | Permanent Backend Developer & Business Logic | Active & Operational (Completed Iter 240: 37/37 pass) |
| **Worker 3 (Ohm)** | `01a19154-e3ee-7ab2-b682-798b64a0bb6b` | Permanent Frontend Developer, UI/UX & Interactions | Active & Operational (Completed Iter 240: 65/65 pass) |
| **Main Orchestrator** | — | System Architecture, Audit, QA Gate & Integration | Active |

---

## 2. Iteration Task Assignments & Progression

### Iteration 240: TallyPay Merchant Cashback, Scratch Card Rewards & Loyalty Points Subsystem (COMPLETED — 100% PASS)

| Field | Worker 1 (Gibbs) | Worker 2 (Averroes) | Worker 3 (Ohm) |
| :--- | :--- | :--- | :--- |
| **Thread ID** | `01a19154-99ab-72a0-9e23-2611b9ffc74c` | `01a1a349-61ae-74d0-aed6-1792e7d1d594` | `01a19154-e3ee-7ab2-b682-798b64a0bb6b` |
| **Task ID** | `TASK-240-REA` | `TASK-240-BACKEND` | `TASK-240-FRONTEND` |
| **Feature** | Reward Activities, Scratch Card Animations & ARSC Analysis | Reward Points Ledger, Cashback Engine & Campaign DAO | Modals 122–126, Scratch Surface, Points Balance, Redemption |
| **Assignment Status** | Completed (137/137 pass) | Completed (37/37 pass) | Completed (65/65 pass) |
| **Deliverable** | `REA_INVESTIGATION_ITER_240_REWARDS_CASHBACK.md`, `test_iteration_240_rewards_cashback_reference_architecture.js` | `src/rewardsSubsystem.js`, `src/tallyPayService.js`, `src/storageRepository.js`, `ITERATION_240_AVERROES_REPORT.md`, `test_iteration_240_rewards_cashback_backend.js` | `App.js` (126 Modals), `src/i18nService.js`, `ITERATION_240_OHM_REPORT.md`, `test_iteration_240_ui_rewards_cashback.js` |
| **Files** | `docs/rea-reconstruction/investigations/`, `test_iteration_240_rewards_cashback_reference_architecture.js` | `src/rewardsSubsystem.js`, `src/tallyPayService.js`, `src/storageRepository.js`, `test_iteration_240_rewards_cashback_backend.js` | `App.js`, `src/i18nService.js`, `test_iteration_240_ui_rewards_cashback.js`, regression suites |
| **Review Status** | Accepted & Verified | Accepted & Verified | Accepted & Verified |

---

### Iteration 241: TallyPay Merchant Business Analytics & Revenue Forecasting Subsystem (QUEUED / IN PLANNING)

| Field | Worker 1 (Gibbs) | Worker 2 (Averroes) | Worker 3 (Ohm) |
| :--- | :--- | :--- | :--- |
| **Thread ID** | `01a19154-99ab-72a0-9e23-2611b9ffc74c` | `01a1a349-61ae-74d0-aed6-1792e7d1d594` | `01a19154-e3ee-7ab2-b682-798b64a0bb6b` |
| **Task ID** | `TASK-241-REA` | `TASK-241-BACKEND` | `TASK-241-FRONTEND` |
| **Feature** | Business Analytics Activities, Graph Layouts & Forecast Models | Analytics Aggregation Engine, Revenue Forecast DAO & SQLite Schemas | Modals 127–131, Visual Charting, Growth Metrics & Insights |
| **Assignment Status** | Ready to Dispatch | Queued | Queued |
| **Deliverable** | Investigation report & Reference Architecture test suite | Backend service modules, SQLite schemas & tests | `App.js` modals (131 Modals), UI tests & BackHandler |
| **Files** | Investigation doc & Reference Architecture suite | Backend service modules & tests | `App.js` screens, modals & UI tests |
| **Review Status** | Pending | Pending | Pending |
