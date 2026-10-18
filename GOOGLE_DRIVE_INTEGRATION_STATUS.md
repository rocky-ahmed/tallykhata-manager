# GOOGLE DRIVE INTEGRATION STATUS

## 1. Native Authentication Status
- **Package ID**: `com.progoti.tallykhata.offline`
- **Library**: `@react-native-google-signin/google-signin`
- **Build Type**: Expo Development Build (`com.progoti.tallykhata.offline` v4.0.0)
- **Verified SHA-1 Fingerprint**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- **OAuth Web Client ID**: Configured and active in `GoogleSignin.configure()`
- **Verified User Profile**:
  - Name: `ROCKY AHMED`
  - Email: `khalbococ@gmail.com`
  - Sub (Subject Identifier): `104924714691794935167`
- **Granted OAuth Scopes**:
  - `https://www.googleapis.com/auth/drive.appdata` (Private application data storage)
  - `https://www.googleapis.com/auth/userinfo.profile`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `openid`

## 2. Cloud Storage Engine (`src/googleDriveBackupService.js`)
- **Isolation Mechanism**: Google Drive AppData folder (`spaces=appDataFolder`).
- **Filename**: `tallykhata_cloud_backup.json`
- **Data Protection**: Zero access to user's personal Google Drive documents or photos.
- **Integrity Validation**:
  - Deterministic string checksum verification on upload and restore.
  - Manifest validation containing `backupVersion`, `schemaVersion`, `recordCounts`, and `backupOwner`.
  - Account sub-matching prevents restoring another user's backup over existing records.

## 3. 5 Always-Visible Controls
1. **এখন ব্যাকআপ নিন (Backup Now)**: Generates a complete atomic snapshot and uploads to Google Drive AppData.
2. **অনলাইন ব্যাকআপ রিস্টোর করুন (Restore Online)**: Downloads remote backup, validates checksum and owner, creates local safety snapshot, and restores records safely.
3. **ডাটা এক্সপোর্ট করুন (Export Data)**: Generates verified JSON export file for offline transfer.
4. **Google Drive Account পরিবর্তন করুন (Change Account)**: Disconnects current session and opens native account chooser.
5. **Google Account সরান (Remove Account)**: Safely unlinks account without affecting local offline records.
