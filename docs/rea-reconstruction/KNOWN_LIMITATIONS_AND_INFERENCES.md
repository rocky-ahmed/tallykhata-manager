# REA RECONSTRUCTION — KNOWN LIMITATIONS & INFERENCES
**Target Application:** `TallyKhata-Demo.apk` (`REF-001`)  
**Maintained by:** Main Engineering Orchestrator  
**Status:** FULLY DISCLOSED & DOCUMENTED  

---

## 1. Classification of Knowledge (Observed vs. Inferred)

### 1.1 Verified Observed Facts (From REA Bytecode & Artifact Inspection)
- **Room SQLite Entity Structure:** Exact column names, constraints, foreign keys, and indices from `TallyKhataDatabase_Impl` in `classes4.dex`.
- **TKEnum Enumeration Values:** Exact numeric mappings for `txn_type`, `txn_mode`, and `type` from `TKEnum.class` in `classes4.dex`.
- **Packaging Invariants:** Package name `com.progoti.tallykhata.offline`, version 4.0.0, minimum SDK 24, target SDK 36 from `AndroidManifest.xml` and `app.json`.
- **Brand Palette:** Primary `#B81414`, splash background `#B81414`, adaptive icon background `#B81414`.

### 1.2 Inferred & Reconstructed Implementation Choices
- **Personal Money Manager Clean-Room Suite:** Personal finance features (Wallets, Budgets, Goals, Analytics) were independently reconstructed using modern clean-room principles (inspired by open-source Ivy Wallet) and integrated under `@tallykhata_personal_money_manager_v2`.
- **Indexed Binary Search for Ledger Queries:** To maintain 60fps scrolling on low-end Android devices with 10,000+ journal entries, `storageRepository.js` implements an in-memory sorted index binary search.
- **Mutex Write Queue Concurrency:** To ensure ACID-like write serialization across AsyncStorage and concurrent React events, an asynchronous FIFO promise queue is enforced.

---

## 2. Operational & Platform Limitations
1. **GitHub Remote Push Disabled:**
   - GitHub push is strictly disabled by project policy. All engineering milestones, reports, and code changes are maintained in local verified Git checkpoints.
2. **Windows MAX_PATH File System Handling:**
   - Deep nested Android SDK / Gradle paths on Windows can exceed the 260-character limit. The build system safely operates through the established short virtual drive mapping:
     `T:\ => C:\Users\Lenovo\Documents\Codex\2026-10-13\re\outputs\tallybook-expo`
3. **Offline-First Cloud Sync:**
   - The application functions 100% offline. Google Drive backup requires explicit user authentication and active internet connectivity. In offline mode, all transactions persist locally in authoritative storage.
4. **PII Sanitization in Operational Telemetry:**
   - Real customer names, phone numbers, merchant PINs, and authentication tokens are strictly stripped by `TelemetryService` before recording operational metrics.
