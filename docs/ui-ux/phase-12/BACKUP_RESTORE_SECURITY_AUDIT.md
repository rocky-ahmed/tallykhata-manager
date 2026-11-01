# TALLYKHATA — PHASE 12: BACKUP, RESTORE & SECURITY AUDIT REPORT
## Google Drive AppData Isolation, SHA-256 Checksum Validation & Multi-Domain Restore

---

## 1. Executive Summary

This audit evaluates the Google Drive cloud backup serialization, manifest generation, tamper-proof checksum verification, and selective restore domain isolation in TallyKhata.

---

## 2. Google Drive AppData Folder Isolation

TallyKhata utilizes Google Drive's hidden Application Data folder (`appDataFolder`):
- **Scope:** `https://www.googleapis.com/auth/drive.appdata`.
- **Privacy Guarantee:** The AppData folder is invisible to other Google Drive applications and users. No file outside TallyKhata can read, modify, or overwrite backup archives.
- **User Ownership:** Backup files are bound to the authenticated Google account (`user.id`). Cross-account restore attempts are strictly rejected.

---

## 3. Backup Payload Structure & SHA-256 Checksums

Every generated backup produces a standardized envelope with FIPS-compliant SHA-256 checksums. Modifying a single character or byte in the payload results in immediate abort with:
`Backup integrity checksum mismatch: data may be corrupted or tampered`

---

## 4. Multi-Domain Selective Restore Isolation

The restore engine supports three distinct restore scopes:
1. **Full Application Restore:** Restores Business Accounting state and Personal Money Manager state simultaneously.
2. **Business-Only Restore:** Restores Business Accounting records while preserving 100% of local Personal Money Manager data without overwriting.
3. **Personal-Only Restore:** Restores Personal Money Manager records while preserving 100% of local Business Accounting data.
4. **Safety Snapshot & Rollback:** Before committing a restore payload to disk, `createLocalSafetySnapshot` writes an emergency rollback snapshot. If an error occurs during restore, the previous local state is atomically restored.
