# TALLYKHATA — CONTINUOUS IMPROVEMENT BACKLOG
**Maintained by:** Main Agent (Lead Architect)  
**Last Updated:** 2026-11-01 (ITER-003 Completed)  
**Iteration Cadence:** Iterative Multi-Agent Continuous Development

---

## Backlog Items & Prioritization Matrix

| Item ID | Priority | Category | Description | Primary Owner | Status | Target Iteration |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BL-001** | **P1 (High)** | Build & Release | Audit production keystore configuration in `android/app/build.gradle` and document environmental injection rules | Averroes (Worker 2) | **COMPLETED** | ITER-001 |
| **BL-002** | **P1 (High)** | Security & Backup | Formalize backup integrity threat modeling (SHA-256 tamper-proofing vs OAuth2 AppData folder isolation) | Averroes (Worker 2) | **COMPLETED** | ITER-001 |
| **BL-003** | **P1 (High)** | QA & Testing | Formulate deterministic inventory test vectors covering full lifecycle (Add, In, Out, Deplete, Guard) | Ohm (Worker 3) | **COMPLETED** | ITER-001 |
| **BL-004** | **P1 (High)** | Frontend / UX | Audit inventory end-to-end user journey in `App.js` (modals, search, status filters, touch targets) | Gibbs (Worker 1) | **COMPLETED** | ITER-001 |
| **BL-005** | **P1 (High)** | QA & Release | Execute comprehensive repository test audit documenting all 32 suites, test counts, and assertion totals | Ohm (Worker 3) | **COMPLETED** | ITER-001 |
| **BL-006** | **P2 (Medium)** | UI / Polish | Re-verify high-DPI contrast on secondary labels and modal touch outside keyboard dismiss | Gibbs (Worker 1) | **COMPLETED** | ITER-002 |
| **BL-007** | **P2 (Medium)** | Performance | Harden WeakMap memoization against in-place array mutations via length/fingerprint guards | Averroes (Worker 2) | **COMPLETED** | ITER-002 |
| **BL-008** | **P2 (Medium)** | QA / Finance | Extreme financial calculation stress test vectors (৳100,000,000+ single transaction values) | Ohm (Worker 3) | **COMPLETED** | ITER-002 |
| **BL-011** | **P2 (Medium)** | UI / i18n | Audit complex Bengali conjunct glyphs (`যুক্তবর্ণ`) and custom font scale boundaries against clipping | Gibbs (Worker 1) | **COMPLETED** | ITER-003 |
| **BL-012** | **P2 (Medium)** | Backup & UX | Pre-upload compressed backup size estimation in `src/googleDriveBackupService.js` for 2G/3G merchants | Averroes (Worker 2) | **COMPLETED** | ITER-003 |
| **BL-013** | **P2 (Medium)** | QA / Testing | Author automated test suite verifying backup size estimation precision (`test_backup_size_estimation.js`) | Ohm (Worker 3) | **COMPLETED** | ITER-003 |
| **BL-009** | **P3 (Low)** | Maintainability | Extract repetitive modal header subcomponents into reusable component definitions | Gibbs (Worker 1) | **NEXT** | ITER-004 |
| **BL-014** | **P2 (Medium)** | Network / Cloud | Pre-upload Google Drive connectivity ping & exponential backoff retry policy formalization | Averroes (Worker 2) | **NEXT** | ITER-004 |
| **BL-015** | **P2 (Medium)** | QA / Stress | Multi-device concurrent backup restore state collision simulation test suite | Ohm (Worker 3) | **NEXT** | ITER-004 |
| **BL-010** | **P3 (Low)** | Build | Migrate Gradle build scripts from Groovy DSL to Kotlin DSL (`build.gradle.kts`) | Averroes (Worker 2) | **BACKLOG** | Future |

---

## Prioritization Criteria:
1. **P0 (Blocker):** Data loss, financial inaccuracy, security compromise, app crash.
2. **P1 (High):** Release readiness, backup integrity, core test vector coverage, build architecture.
3. **P2 (Medium):** UX polish, performance optimizations, secondary edge case guards.
4. **P3 (Low):** Refactoring, cosmetic enhancements, build tool modernization.
