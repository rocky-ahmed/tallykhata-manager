# TALLYKHATA — PHASE 10 SECURITY & PRIVACY AUDIT REPORT
## Authentication Boundaries, Token Isolation, Financial Data Privacy & Zero Leakage

---

## 1. EXECUTIVE SECURITY SUMMARY

Phase 10 audits and enforces strict security and privacy standards across the application settings, local persistence, cloud backup, and financial data domains.

Key Security Guarantees:
1. **Zero Token Logging**: OAuth access tokens, refresh tokens, and client secrets are never logged to console or persisted in plain text files.
2. **User Identity Isolation**: Cloud backups in Google Drive are indexed and verified strictly by the OpenID Connect `sub` claim. Cross-account restore attempts are rejected at the protocol boundary.
3. **Financial Data Shielding**: Sensitive account balances, customer receivables, and cashbox balances can be masked via `security.hideBalances` (Privacy Eye).
4. **4-Digit PIN Security**: PIN verification is handled in-memory and hashed locally. Failed attempts trigger exponential backoff.
5. **Zero Remote Analytics Leakage**: No financial transaction data, customer phone numbers, or merchant profiles are transmitted to third-party marketing or tracking SDKs.

---

## 2. PRIVACY CONTROLS & COMPLIANCE MATRIX

| Control Name | Mechanism | Storage Key / Scope | Privacy Guarantee |
| :--- | :--- | :--- | :--- |
| **Mask Financial Balances** | `security.hideBalances` | `@tallykhata_app_preferences_v1` | Hides asset figures on home and dashboard screens (`••••••`) to prevent visual shoulder-surfing in public stores. |
| **Auto-Lock Timeout** | `security.autoLockMinutes` | `@tallykhata_app_preferences_v1` | Automatically locks the app after 1, 2, 5, 10, 15, or 30 minutes of inactivity. |
| **Biometric Gate** | `security.biometricEnabled` | `@tallykhata_app_preferences_v1` | Prompts for fingerprint authentication on supported Android hardware before unlocking financial ledgers. |
| **Local-Only Guarantee** | Offline-First Engine | `@tallykhata_state_v6` | 100% offline functionality. Application does not require an internet connection for accounting operations. |
| **Cloud Backup Isolation** | Google Drive AppData Folder | User's Private Drive Scope | Backups are stored in the user's isolated Drive AppData sandbox; no public file sharing is enabled. |
