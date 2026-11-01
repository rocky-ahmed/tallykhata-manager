# TALLYKHATA — PHASE 10 GLOBAL SETTINGS ARCHITECTURE
## End-to-End Configuration System, Service Boundaries, Persistence & Mutex Integrity

---

## 1. ARCHITECTURAL MISSION & CORE DOMAINS

Phase 10 transforms the fragmented settings entry points into a unified, high-performance configuration engine. The architecture spans four decoupled yet synchronized domains:
1. **Appearance Domain**: Theme mode, brand accent, typography scale, and layout density.
2. **Localization Domain**: App language (Bangla, English, System) with fallback cascades.
3. **Operational Domain**: Customer due reminders, Tagada SMS alerts, backup warning notifications, and daily summaries.
4. **Security & Data Domain**: 4-digit PIN lock, biometric authentication, sensitive balance masking, local storage analytics, and Google Drive cloud synchronization.

---

## 2. SETTINGS LIFECYCLE & PERSISTENCE FLOW

The global settings lifecycle follows a unidirectional, safe persistence loop:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       UI / USER INTERACTION LAYER                            │
│           (Settings Dashboard, Theme Picker, Notifications Modal)           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1. User toggles or selects setting
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER: `preferencesService.js`                 │
│              - Strict Schema Validation & Sanitization                      │
│              - Numerical Clamping & Enum Whitelisting                        │
│              - In-Memory Cache Update & Event Notification                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 2. Sanitized preference object
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 STORAGE REPOSITORY: `storageRepository.js`                   │
│              - Mutex Lock / Sequential Write Queue                          │
│              - Atomic Serialization to `@tallykhata_app_preferences_v1`     │
│              - Corruption Resilience & Fallback Recovery                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 3. Background Cloud Sync
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 GOOGLE DRIVE BACKUP: `googleDriveBackupService.js`          │
│              - User-Specific OpenID `sub` Claim Isolation                   │
│              - Inclusion in Domain: `preferences`                           │
│              - Zero Cross-User Data Bleed Guarantee                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ASYNCHRONOUS MUTEX & CONCURRENCY SAFEGUARDS

Rapid toggling of settings (e.g. quick switching between Light and Dark mode, or toggling multiple notification checkboxes) is guarded against race conditions:
1. **In-Memory Cache**: `preferencesService` maintains a synchronous cached snapshot (`_cachedPreferences`) for instant zero-latency UI re-renders.
2. **Sequential Write Queue**: Persistence operations are enqueued via a promise chain, guaranteeing that writes to AsyncStorage complete in strict order without overwriting newer state with stale responses.
3. **Atomic Error Recovery**: If an asynchronous disk write encounters an I/O error, the in-memory cache rolls back to the previous verified state and notifies the user via a localized toast message.
