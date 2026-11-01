# TALLYKHATA — PHASE 10 SETTINGS PREFERENCE SCHEMA SPECIFICATION
## Canonical Preference Model, Data Types, Allowed Values & Migration Schema

---

## 1. STORAGE METADATA

- **Storage Key**: `@tallykhata_app_preferences_v1`
- **Serialization Format**: JSON UTF-8 String
- **Schema Version**: `2.0` (Phase 10 Enhanced Schema)
- **Primary Owner**: `src/preferencesService.js`
- **Consumer Modules**: `App.js`, `src/themeService.js`, `src/storageRepository.js`, `src/googleDriveBackupService.js`

---

## 2. FORMAL JSON SCHEMA (CANONICAL MODEL)

```json
{
  "theme": "light",
  "language": "bn",
  "fontScale": 1.0,
  "density": "standard",
  "accentColor": "#B8141F",
  "notifications": {
    "dueReminders": true,
    "tagadaSms": true,
    "backupAlerts": true,
    "dailySummary": false
  },
  "security": {
    "biometricEnabled": false,
    "autoLockMinutes": 5,
    "hideBalances": false
  },
  "data": {
    "autoBackupDrive": false,
    "backupFrequency": "manual"
  },
  "updatedAt": "2026-11-01T09:00:00.000Z"
}
```

---

## 3. FIELD-BY-FIELD TECHNICAL SPECIFICATION

| Field Path | Type | Default Value | Allowed Values / Constraints | Consumer Screen / Service | Fallback on Invalid / Corrupted Input |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `theme` | `string` | `'light'` | `'light'`, `'dark'`, `'system'` | `App.js`, `themeService.js` | Defaults to `'light'`. |
| `language` | `string` | `'bn'` | `'bn'`, `'en'`, `'system'` | `App.js`, `i18nService.js` | Defaults to `'bn'`. |
| `fontScale` | `number` | `1.0` | Float in range $[0.85, 1.30]$ | Global typography tokens | Clamped to nearest bound $[0.85, 1.30]$; defaults to $1.0$. |
| `density` | `string` | `'standard'` | `'comfortable'`, `'standard'`, `'compact'` | Card paddings & list item heights | Defaults to `'standard'`. |
| `accentColor` | `string` | `'#B8141F'` | Valid 7-character hex (`^#[0-9A-Fa-f]{6}$`) | Primary action buttons & indicators | Defaults to `'#B8141F'`. |
| `notifications.dueReminders` | `boolean` | `true` | `true`, `false` | Tagada due reminder scheduler | Coerced to `Boolean`; defaults to `true`. |
| `notifications.tagadaSms` | `boolean` | `true` | `true`, `false` | SMS notification dispatcher | Coerced to `Boolean`; defaults to `true`. |
| `notifications.backupAlerts` | `boolean` | `true` | `true`, `false` | Backup reminder banner | Coerced to `Boolean`; defaults to `true`. |
| `notifications.dailySummary` | `boolean` | `false` | `true`, `false` | Evening business summary banner | Coerced to `Boolean`; defaults to `false`. |
| `security.biometricEnabled` | `boolean` | `false` | `true`, `false` | Biometric fingerprint gate | Coerced to `Boolean`; defaults to `false`. |
| `security.autoLockMinutes` | `number` | `5` | `1`, `2`, `5`, `10`, `15`, `30` | Inactivity timer in `App.js` | Defaults to `5`. |
| `security.hideBalances` | `boolean` | `false` | `true`, `false` | Privacy eye toggle on dashboard | Coerced to `Boolean`; defaults to `false`. |
| `data.autoBackupDrive` | `boolean` | `false` | `true`, `false` | Automated background cloud backup | Coerced to `Boolean`; defaults to `false`. |
| `data.backupFrequency` | `string` | `'manual'` | `'manual'`, `'daily'`, `'weekly'` | Cloud sync interval planner | Defaults to `'manual'`. |
| `updatedAt` | `string` | Current ISO | Valid ISO 8601 Timestamp String | Audit logs & backup manifests | Defaults to `new Date().toISOString()`. |
