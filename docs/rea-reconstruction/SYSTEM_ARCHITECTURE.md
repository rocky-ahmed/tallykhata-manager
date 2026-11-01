# REA-DRIVEN AUTONOMOUS APP RECONSTRUCTION ARCHITECTURE
**Document Version:** 1.0.0  
**System:** REA-Driven Continuous App Reconstruction System  
**Maintained by:** Main Engineering Orchestrator  
**Last Updated:** 2026-11-01  

---

## 1. Architectural Philosophy: Clean-Room Parity Engineering

The REA-Driven Autonomous Reconstruction System pairs deep, evidence-backed reverse engineering of authorized reference applications with clean-room, independent implementation.

### Operating Principles:
1. **Evidence-Based Reverse Engineering:** All structural, behavioral, schema, and API observations are derived from REA tools (`rea inspect-artifact`, `rea project-android-application-graph`, `rea inspect-apk-signature`, etc.) and saved as immutable Evidence bundles.
2. **Clean-Room Implementation:** No proprietary source code is copied or reproduced. The clone is written from scratch in modern React Native + Expo, using proven open-source architectures (e.g. Ivy Wallet for personal finance, custom double-entry engine for bookkeeping).
3. **Behavioral & Data Parity:** Functional equivalence is verified through automated regression suites, boundary stress tests, and end-to-end cloud round trips.

---

## 2. Permanent Multi-Agent Team Structure

```
+---------------------------------------------------------------------------------+
|                         MAIN ENGINEERING ORCHESTRATOR                            |
|        (System Architecture, Integration, Evidence Review & Parity Audit)       |
+---------------------------------------------------------------------------------+
                                       |
        +------------------------------+------------------------------+
        |                              |                              |
        v                              v                              v
+-----------------------+  +-----------------------+  +-----------------------+
|   WORKER 1 (GIBBS)    |  |  WORKER 2 (AVERROES)  |  |    WORKER 3 (OHM)     |
|   REA Investigator    |  |   Backend & Logic     |  |   Frontend & UI/UX    |
|   Thread ID:          |  |   Thread ID:          |  |   Thread ID:          |
|   01a19154-99ab-...   |  |   01a19154-c135-...   |  |   01a19154-e3ee-...   |
+-----------------------+  +-----------------------+  +-----------------------+
        |                              |                              |
        | Inspects Reference Target    | Implements Storage, Data,    | Implements React      |
        | Generates Evidence Bundles   | Financial Engines, Cloud     | Native Screens, UX,   |
        | Delivers Specifications      | Backup, and Indexing         | Visuals, and Haptics  |
```

---

## 3. Data Pipeline & Domain Isolation

1. **Business Bookkeeping Domain:**
   - Storage Key: `@tallykhata_state_v6`
   - Engine: `src/ledgerEngine.js`, `src/storageRepository.js`
   - Invariants: Integer-paisa arithmetic, mutex-serialized writes, multi-business tenancy.

2. **Personal Money Manager Domain:**
   - Storage Key: `@tallykhata_personal_money_manager_v2`
   - Engine: `src/moneyManagerService.js`
   - Invariants: Ivy-wallet clean-room architecture, wallets, budgets, categories, recurring transactions.

3. **Cloud Backup & Restore Domain:**
   - Service: `src/googleDriveBackupService.js`
   - Invariants: Google Drive `appDataFolder` sandbox, SHA-256 integrity check, domain isolation.

---

## 4. Verification Framework

- **Automated Test Baseline:** 40 suites / 959 passing tests.
- **Verification Matrix:** `docs/rea-reconstruction/FEATURE_PARITY_MATRIX.md`.
- **Target Registry:** `docs/rea-reconstruction/REFERENCE_APP_REGISTRY.md`.
