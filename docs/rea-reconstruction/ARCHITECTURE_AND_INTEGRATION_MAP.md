# REA RECONSTRUCTION — ARCHITECTURE & INTEGRATION MAP
**System:** TallyKhata Modern Reconstructed Application  
**Maintained by:** Main Engineering Orchestrator  
**Status:** FULLY INTEGRATED & VERIFIED  

---

## 1. Clean-Room Architectural Pipeline

```
+-----------------------------------------------------------------------------------+
|                                 USER INTERFACE                                    |
|                       App.js (React Native / Expo Frontend)                       |
|   - 4-Tab Navigation (হিসাব, ক্যাশবাক্স, ওয়ালেট, মেনু)                               |
|   - Bengali-First Typography (>= 1.40x Line Height, 14sp-62sp)                   |
|   - Merchant 3D Tactile Buttons & Haptics                                         |
|   - WCAG 2.1 AA Contrast Surfaces (Light: #FFFFFF/#B81414, Dark: #1E293B)        |
+-----------------------------------------------------------------------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                                                               |
         v                                                               v
+------------------------------------+          +------------------------------------+
|     BUSINESS ACCOUNTING DOMAIN     |          |   PERSONAL MONEY MANAGER DOMAIN    |
|   `src/ledgerEngine.js`            |          |   `src/moneyManagerService.js`     |
|   - Double-entry debit/credit rules|          |   - 8-Section Personal Suite       |
|   - Cashbox upfront settlement     |          |   - Ivy-Wallet clean-room design   |
|   - Integer-paisa precision math   |          |   - Wallets, Budgets, Categories   |
|   - Composite key tenant isolation |          |   - Recurring transaction engine   |
+------------------------------------+          +------------------------------------+
         |                                                               |
         +-------------------------------+-------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                           STORAGE & PERSISTENCE LAYER                             |
|                        `src/storageRepository.js`                                 |
|   - Mutex Write Queue (`writeQueue`) with FIFO serialization                     |
|   - Storage Compaction & Auto-Balance Recalculation                               |
|   - Indexed Date Range Binary Search (`queryJournalsByDateRange`)                 |
|   - Privacy-Preserving Telemetry with PII Scrubbing                               |
+-----------------------------------------------------------------------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                                                               |
         v                                                               v
+------------------------------------+          +------------------------------------+
|    LOCAL STORAGE PERSISTENCE       |          |      CLOUD BACKUP & RESTORE        |
|    - `@tallykhata_state_v6`        |          |   `src/googleDriveBackupService.js`|
|    - `@tallykhata_personal_...`    |          |   - Google Drive AppData sandbox   |
|    - `@tallykhata_app_pref_...`    |          |   - Deterministic SHA-256 checksum |
|    (AsyncStorage / Room SQLite)    |          |   - 3-Way Selective Domain Restore |
+------------------------------------+          +------------------------------------+
```

---

## 2. Source File Inventory & Component Responsibilities

| Subsystem | Source Path | Primary Architecture & Roles |
| :--- | :--- | :--- |
| **Frontend Root** | `App.js` | Top summary cards, dual-tab switchers, modals, screen stack, `BackHandler` |
| **Ledger Engine** | `src/ledgerEngine.js` | Double-entry math, Room DB field normalization, cashbox sync, validation |
| **Storage Repository** | `src/storageRepository.js` | Mutex queue, compaction, binary search queries, telemetry, state models |
| **Money Manager** | `src/moneyManagerService.js` | Personal accounts, budgets, goals, transactions, analytics, custom categories |
| **Money Manager UI** | `src/moneyManagerCustomizationService.js` | Section layout registration (8 sections), visibility toggles |
| **Cloud Backup** | `src/googleDriveBackupService.js` | Payload builder, checksum generation, integrity validation, selective restore |
| **Localization** | `src/i18nService.js` | Complete Bengali (`bn-BD`) and English (`en-US`) string catalogs |
| **Theme System** | `src/themeService.js` | Light & dark mode palettes, WCAG 2.1 AA luminance contrast calculations |
| **Typography** | `src/typographyTokens.js` | Bengali vowel-mark clearance scaling, dynamic line height calculation |
| **Icon Metrics** | `src/iconMetrics.js` | Optical icon scaling (1.05x-1.28x), `STANDARD_TOUCH_HIT_SLOP` |
| **Tactile Haptics** | `src/hapticFeedbackService.js` | 3-tier haptic vibration fallbacks for merchant keypad and tab actions |
| **Preferences** | `src/preferencesService.js` | Display density ("compact", "standard", "comfortable"), theme persistence |
