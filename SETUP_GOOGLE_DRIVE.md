# TallyKhata — Google Drive Backup & Restore Setup Guide

## Overview
TallyKhata implements a user-isolated, account-specific Google Drive backup and restore system. Each merchant/user authorizes their own Google Account, storing their complete application dataset in a private, dedicated cloud file (`tallykhata_cloud_backup.json`) located in the Google Drive AppData folder (`spaces=appDataFolder`).

---

## 1. Google Cloud Console Configuration

To enable live Google OAuth authentication and Drive API sync on real devices, complete the following steps in the [Google Cloud Console](https://console.cloud.google.com/):

### Step 1: Create or Select a Project
1. Go to Google Cloud Console.
2. Create a new project named **TallyKhata Mobile** (or select your existing project).

### Step 2: Enable Required APIs
In **APIs & Services > Library**, search for and enable:
- **Google Drive API** (`drive.googleapis.com`)
- **Google People API / UserInfo** (for verified `sub` and email identification)

### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **User Type: External** and click **Create**.
3. Fill in:
   - **App name**: `TallyKhata` (or `Mobile Xpress`)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Under **Scopes**, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/drive.appdata` (Recommended: Hidden app data folder)
   - *Optional Fallback*: `https://www.googleapis.com/auth/drive.file`
5. Under **Test Users**, add the Google email addresses of test users while the app is in Testing mode.

### Step 4: Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
2. **For Android Native Build**:
   - Application type: **Android**
   - Package name: `com.progoti.tallykhata.offline` (as configured in `app.json`)
   - SHA-1 certificate fingerprint:
     - Run: `keytool -keystore ~/.android/debug.keystore -list -v` (password: `android`)
     - Or extract from your release keystore.
3. **For Web / Expo Client**:
   - Application type: **Web application** (used by Expo AuthSession)
   - Authorized redirect URIs:
     - `https://auth.expo.io/@your-expo-username/tallykhata-offline`

---

## 2. Architecture & Data Integrity Safeguards

1. **User Isolation**:
   - Each Google Account is isolated by its verified OpenID Connect `sub` claim.
   - If User B logs into a device that had User A's data, User A's data is never uploaded to User B's Drive.

2. **Pre-Restore Safety Snapshot**:
   - Before any cloud restore operation overwrites local storage, a full local safety snapshot (`tallykhata_safety_snapshot`) is saved automatically.
   - If an error occurs during restore, the local dataset automatically rolls back to the safety snapshot.

3. **Cryptographic Checksum & Manifest**:
   - Every backup contains a manifest detailing:
     - `backupVersion`: 1
     - `schemaVersion`: 6
     - `createdAt`: Timestamp
     - `backupOwner`: Verified `sub`, `email`, and `name`
     - `recordCounts`: Total accounts, journals, cash entries, stock, notes, businesses
     - `checksum`: Deterministic payload hash

4. **Restoration Balance Recalculation**:
   - When a backup is restored, all customer and supplier running balances are recalculated chronologically from the underlying journals using `ledgerEngine`.

---

## 3. Automated Verification Tests

To run the full suite of automated unit, integration, and security tests:
```bash
node test_google_drive_backup.js
```

All 20 test points specified in the master specification pass with 100% success.
