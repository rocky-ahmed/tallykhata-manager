# TALLYKHATA — PROJECT CURRENT STATE
**Document Version:** 1.0.0  
**Updated:** 2026-11-01  
**Current Iteration:** ITER-001  
**Release Milestone:** Release Candidate 1 (RC-1)

---

## 1. Project Status Overview
- **Application:** TallyKhata Offline Bookkeeping & Personal Money Manager (`com.progoti.tallykhata.offline`)
- **Repository:** `tallybook-expo` (`rocky-ahmed/tallykhata-manager`)
- **Current Milestone:** Phase 12 Final Quality Assurance Complete & Release Ready.
- **Continuous Improvement Phase:** Autonomous Multi-Agent Iteration Loop Active.
- **Git Branch:** `main` (In sync with `origin/main` at commit `d95725e`).
- **Test Baseline:** 32 automated test suites, 100% passing rate, >720 discrete assertions, 0 open P0/P1/P2/P3 defects.

---

## 2. Architecture & Technology Stack
- **Framework:** React Native `0.86.3` / Expo SDK `57` (Bare Workflow with `expo-dev-client`).
- **Engine:** Hermes JavaScript Engine with New Architecture enabled (`newArchEnabled=true`).
- **UI & Layout:** React Native Core + SVG (`react-native-svg`), Edge-to-Edge Android Display, safe-area inset protection for 3-button navigation bars (95dp bottom padding).
- **Typography & Theme:** 10 typography scales with Bengali line-height multiplier ($1.45\times$), 77-key symmetrical theme tokens for Light and Dark modes with WCAG 2.2 AA/AAA compliance.
- **Financial Math Engine:** Exact integer-paisa double-entry arithmetic ($1\text{ Taka} = 100\text{ Paisa}$) preventing IEEE-754 floating-point drift across millions of transactions.
- **Performance & Caching:** 7 WeakMap memoization caches in `src/ledgerEngine.js` and `src/moneyManagerService.js` with sub-microsecond warm latency (~0.0009ms).
- **Multi-Tenancy:** Multi-business isolation partitioned by `businessId` across accounts, journals, cashEntries, inventory, stock, and reports.
- **Cloud Backup:** Google Drive AppData folder isolation with OAuth2 token validation and SHA-256 tamper-evident integrity checksums. Merchant PIN stripped before cloud backup for security.

---

## 3. Worker Team Structure
- **Main Agent:** Lead Architect, Orchestrator, Strategy Owner & Final Auditor.
- **Worker 1 (Gibbs):** Frontend, UI/UX, product ergonomics, screens, modals, Bengali layout (`01a19154-99ab-72a0-9e23-2611b9ffc74c`).
- **Worker 2 (Averroes):** Backend, data architecture, integer paisa math, ledgerEngine, backup/restore (`01a19154-c135-75d0-b38a-1ea50f004895`).
- **Worker 3 (Ohm):** Independent QA, automated test suites, bug reproduction, security verification (`01a19154-e3ee-7ab2-b682-798b64a0bb6b`).

---

## 4. Open Blockers & Production Release Boundaries
- **Local / Debug / Offline Status:** 100% Functional, verified on physical Xiaomi Redmi Note 9 (`737ee4410405`, Android 11).
- **Production APK Release Signing:** Currently `android/app/build.gradle` uses `signingConfigs.debug` as a fallback. Production AAB/APK signing requires external injection of the merchant's private keystore credentials via environment variables (`RELEASE_STORE_FILE`, etc.), which are deliberately not hardcoded for security.
