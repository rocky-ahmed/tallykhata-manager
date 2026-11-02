# REA RECONSTRUCTION — REFERENCE API & SYNC BEHAVIOR
**Target Application:** `TallyKhata-Demo.apk` (`REF-001`)  
**Maintained by:** Main Engineering Orchestrator  
**Status:** SPECIFIED & VERIFIED  

---

## 1. Cloud Backup Payload Architecture (`src/googleDriveBackupService.js`)

Cloud backups serialize application state into an authenticated archive targeted at the user's private Google Drive `appDataFolder`.

### 1.1 Archive Structure & Manifest
```json
{
  "manifest": {
    "version": "4.0.0",
    "backupVersion": 2,
    "createdAt": "2026-11-03T12:00:00.000Z",
    "userSub": "google_user_sub",
    "checksum": "sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "domains": ["business", "personal"]
  },
  "data": {
    "businessState": { ... },
    "moneyManagerState": { ... },
    "preferences": { ... }
  }
}
```

### 1.2 Deterministic SHA-256 Tamper Resistance
- A deterministic SHA-256 checksum is computed over the serialized payload.
- Before restore, `validateBackupIntegrity(payload, userSub)` re-computes the checksum and confirms user account ownership. If any record is tampered with or modified, verification fails and restore is aborted.

---

## 2. 3-Way Selective Restore & Domain Isolation

To prevent accidental data loss between merchant bookkeeping and personal finance:

1. **Business-Only Restore:**
   - Restores `@tallykhata_state_v6` (Customers, Suppliers, Journals, Cashbox, Inventory).
   - Preserves all current local `@tallykhata_personal_money_manager_v2` data completely untouched.
2. **Personal-Only Restore:**
   - Restores `@tallykhata_personal_money_manager_v2` (Wallets, Categories, Budgets, Recurring rules).
   - Preserves all current local `@tallykhata_state_v6` data completely untouched.
3. **Full Application Restore:**
   - Restores both domains with complete referential fidelity.

---

## 3. Offline Sync Queue & State Transitions
Every database record maintains a `synced` column:
- `synced = 0`: Local change pending cloud synchronization.
- `synced = 1`: Verified synchronized with server / cloud snapshot.
- `getUnsyncedRecords(entityType)`: Retrieves all dirty records for batch upload.
- `markRecordsSynced(entityType, ids)`: Atomically transitions verified IDs to `synced = 1`.
