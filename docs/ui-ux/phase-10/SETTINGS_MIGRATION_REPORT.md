# TALLYKHATA — PHASE 10 SETTINGS MIGRATION REPORT
## Upward Lossless Migration, Legacy V1 Compatibility & Storage Verification

---

## 1. MIGRATION OBJECTIVES & REQUIREMENTS

1. **Zero Data Loss**: Users upgrading from legacy versions with existing preferences (`{ theme: 'dark', language: 'en' }`) must retain their exact selections.
2. **Idempotency**: Running migration repeatedly on an already migrated object must yield an identical result without property duplication or timestamp drift.
3. **Safe Fallback**: Any malformed, corrupted, or null JSON string stored in `@tallykhata_app_preferences_v1` must cleanly fall back to canonical Phase 10 defaults without crashing app startup.

---

## 2. MIGRATION MATRIX ACROSS GENERATIONS

| Legacy State Input | Migrated Output Properties | Verification Assertion |
| :--- | :--- | :--- |
| `null` or `undefined` | Canonical Phase 10 defaults (`theme: 'light', language: 'bn', fontScale: 1.0, ...`) | Test 1: Null safety check |
| `{ theme: 'dark' }` (Missing language & Phase 10 fields) | `{ theme: 'dark', language: 'bn', fontScale: 1.0, density: 'standard', ... }` | Test 2: Partial object completion |
| `{ theme: 'invalid', language: 'fr' }` | `{ theme: 'light', language: 'bn', ... }` | Test 3: Invalid enum fallback |
| `{ fontScale: '1.2' }` (String float coercion) | `{ fontScale: 1.2, ... }` | Test 4: String-to-number float coercion |
| `{ fontScale: 2.5 }` (Out-of-bounds scale) | `{ fontScale: 1.30, ... }` | Test 5: Strict upper bounding |
| `{ fontScale: 0.5 }` (Out-of-bounds scale) | `{ fontScale: 0.85, ... }` | Test 6: Strict lower bounding |
| Full Canonical V2 object | Identical object returned idempotently | Test 7: Idempotent preservation |

---

## 3. REPOSITORY STORAGE COMPATIBILITY

`storageRepository.js` integrates `preferencesService.sanitizePreferences` in all backup collection, restoration, and cache-reloading methods:
- **Cloud Backup Export**: Captures complete serialized preferences under domain `'preferences'`.
- **Selective Restore**: When restoring domain `'preferences'`, the restored payload is sanitized through `sanitizePreferences` before being committed to `@tallykhata_app_preferences_v1`.
- **Domain Isolation**: Restoring business or personal finance records leaves `@tallykhata_app_preferences_v1` completely untouched unless domain `'preferences'` is explicitly selected.
