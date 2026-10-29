/**
 * TallyKhata Google Drive Backup & Restore Service
 * Implements user-specific cloud backup isolation via Google Drive REST API v3.
 * Uses appDataFolder (spaces=appDataFolder) for private, secure application storage.
 */

const BACKUP_FILENAME = 'tallykhata_cloud_backup.json';
const BACKUP_FORMAT_VERSION = 1;
const SCHEMA_VERSION = 6;
const APP_VERSION = '4.0.0';

/**
 * Universal, synchronous, zero-dependency SHA-256 implementation (FIPS 180-4).
 * Works reliably in Hermes (React Native), Node.js, and web environments.
 */
function sha256Hex(asciiStr) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = "length";
  let i, j;
  let result = "";
  const words = [];
  const asciiBitLength = asciiStr[lengthProperty] * 8;
  let hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  hash = hash.slice(0, 8);
  asciiStr += "\x80";
  while ((asciiStr[lengthProperty] % 64) - 56) asciiStr += "\x00";
  for (i = 0; i < asciiStr[lengthProperty]; i++) {
    j = asciiStr.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;
  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }
  return result;
}

/**
 * Calculates a SHA-256 cryptographic checksum of any JSON data.
 */
function calculateSha256Checksum(dataObj) {
  const str = JSON.stringify(dataObj);
  const binaryStr = unescape(encodeURIComponent(str));
  return "sha256_" + sha256Hex(binaryStr);
}

/**
 * Calculates legacy 32-bit rolling hash checksum for backward compatibility.
 */
function calculateLegacyChecksum(dataObj) {
  const str = JSON.stringify(dataObj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "chk_" + Math.abs(hash).toString(16) + "_" + str.length;
}

/**
 * Authoritative checksum calculator produces modern SHA-256 checksums.
 */
function calculateChecksum(dataObj) {
  return calculateSha256Checksum(dataObj);
}

/**
 * Creates a complete authenticated backup payload with manifest.
 * Privacy rule: App PIN and PIN enabled flag are scrubbed from the backup payload.
 */
function buildBackupPayload(authoritativeState, userProfile, options = {}) {
  if (!userProfile || !userProfile.sub) {
    throw new Error('User profile with verified "sub" identifier is required for backup ownership');
  }

  const accounts = Array.isArray(authoritativeState.accounts) ? authoritativeState.accounts : [];
  const journals = Array.isArray(authoritativeState.journals) ? authoritativeState.journals : [];
  const cashEntries = Array.isArray(authoritativeState.cashEntries) ? authoritativeState.cashEntries : [];
  const stock = Array.isArray(authoritativeState.stock)
    ? authoritativeState.stock
    : (Array.isArray(authoritativeState.inventory) ? authoritativeState.inventory : []);
  const notes = Array.isArray(authoritativeState.notes) ? authoritativeState.notes : [];
  const businesses = Array.isArray(authoritativeState.businesses) ? authoritativeState.businesses : [];

  const rawData = {
    accounts,
    journals,
    cashEntries,
    cashReconciliation: authoritativeState.cashReconciliation || null,
    stock,
    inventory: stock,
    walletBalance: Number(authoritativeState.walletBalance) || 0,
    walletTxns: Array.isArray(authoritativeState.walletTxns) ? authoritativeState.walletTxns : [],
    notes,
    businessName: authoritativeState.businessName || 'Mobile Xpress',
    ownerName: authoritativeState.ownerName || '',
    ownerPhone: authoritativeState.ownerPhone || '',
    businessAddress: authoritativeState.businessAddress || '',
    businesses,
    openingBalance: Number(authoritativeState.openingBalance) || 0,
    tallyMessageBalance: Number(authoritativeState.tallyMessageBalance) || 50,
    remainingSmsCount: Number(authoritativeState.remainingSmsCount) || 5,
    pinEnabled: false,
    appPin: '', // Privacy: Plaintext app PIN is never exported or backed up
    tagadaLogs: Array.isArray(authoritativeState.tagadaLogs) ? authoritativeState.tagadaLogs : [],
  };

  // Include Money Manager if present
  const mmData = authoritativeState.moneyManager || (options && options.moneyManager) || null;
  if (mmData && typeof mmData === 'object') {
    rawData.moneyManager = mmData;
  }

  // Include App Preferences if present
  const prefsData = authoritativeState.preferences || (options && options.preferences) || null;
  if (prefsData && typeof prefsData === 'object') {
    rawData.preferences = prefsData;
  }

  const checksum = calculateChecksum(rawData);

  const recordCounts = {
    accounts: accounts.length,
    customers: accounts.filter(a => a.type === 1).length,
    suppliers: accounts.filter(a => a.type === 2).length,
    journals: journals.length,
    cashEntries: cashEntries.length,
    stock: stock.length,
    notes: notes.length,
    businesses: businesses.length,
  };

  const dataDomains = ['business'];

  if (mmData && typeof mmData === 'object') {
    recordCounts.mmAccounts = Array.isArray(mmData.accounts) ? mmData.accounts.length : 0;
    recordCounts.mmTransactions = Array.isArray(mmData.transactions) ? mmData.transactions.length : 0;
    recordCounts.mmCategories = Array.isArray(mmData.categories) ? mmData.categories.length : 0;
    recordCounts.mmGoals = Array.isArray(mmData.goals) ? mmData.goals.length : 0;
    recordCounts.mmRecurring = Array.isArray(mmData.recurring) ? mmData.recurring.length : 0;
    dataDomains.push('moneyManager');
  }

  if (prefsData && typeof prefsData === 'object') {
    dataDomains.push('preferences');
  }

  const manifest = {
    backupVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    backupOwner: {
      sub: String(userProfile.sub),
      email: String(userProfile.email || ''),
      name: String(userProfile.name || ''),
    },
    recordCounts,
    dataDomains,
    businessSummary: {
      businessName: rawData.businessName,
      ownerPhone: rawData.ownerPhone,
      totalDue: accounts.filter(a => a.type === 1 && a.balance > 0).reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    },
    checksum,
  };

  if (mmData) {
    manifest.hasMoneyManager = true;
  }
  if (prefsData) {
    manifest.hasPreferences = true;
  }

  return {
    manifest,
    data: rawData,
  };
}

/**
 * Normalizes modern wrapped ({ manifest, data }) and legacy unwrapped ({ accounts, ... }) backup payloads.
 */
function normalizeBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  // Standard format v1: { manifest, data }
  if (payload.manifest && payload.data && typeof payload.data === 'object') {
    return payload;
  }
  // Legacy / Unwrapped format: { accounts: [...], ... }
  if (Array.isArray(payload.accounts)) {
    const accounts = payload.accounts;
    const journals = Array.isArray(payload.journals) ? payload.journals : [];
    const stock = Array.isArray(payload.stock)
      ? payload.stock
      : (Array.isArray(payload.inventory) ? payload.inventory : []);
    return {
      manifest: {
        backupVersion: 0,
        schemaVersion: payload.version || 5,
        appVersion: 'legacy',
        createdAt: payload.lastModified || new Date().toISOString(),
        backupOwner: payload.googleUser ? {
          sub: payload.googleUser.sub || 'legacy_owner',
          email: payload.googleUser.email || '',
          name: payload.googleUser.name || '',
        } : { sub: 'legacy_owner', email: '', name: '' },
        recordCounts: {
          accounts: accounts.length,
          customers: accounts.filter(a => a.type === 1).length,
          suppliers: accounts.filter(a => a.type === 2).length,
          journals: journals.length,
          stock: stock.length,
        },
        businessSummary: {
          businessName: payload.businessName || 'Mobile Xpress',
          ownerPhone: payload.ownerPhone || '',
          totalDue: accounts.filter(a => a.type === 1 && a.balance > 0).reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
        },
        checksum: payload.checksum || null,
        legacy: true,
      },
      data: payload,
    };
  }
  return null;
}

/**
 * Validates integrity, schema, checksum, and ownership of a downloaded backup.
 */

/**
 * Generates an in-depth preview of a backup payload for user confirmation before restoring.
 */
function previewBackup(backupPayload) {
  if (!backupPayload || typeof backupPayload !== 'object') {
    return { valid: false, error: 'অকার্যকর ব্যাকআপ অবজেক্ট।' };
  }
  const normalized = normalizeBackupPayload(backupPayload);
  if (!normalized || !normalized.data) {
    return { valid: false, error: 'ম্যানিফেস্ট বা ডাটা পাওয়া যায়নি।' };
  }
  const { manifest, data } = normalized;
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const journals = Array.isArray(data.journals) ? data.journals : [];
  const cashEntries = Array.isArray(data.cashEntries) ? data.cashEntries : [];
  const stock = Array.isArray(data.stock) ? data.stock : (Array.isArray(data.inventory) ? data.inventory : []);
  const businesses = Array.isArray(data.businesses) ? data.businesses : [];
  const mm = data.moneyManager && typeof data.moneyManager === 'object' ? data.moneyManager : null;
  const prefs = data.preferences && typeof data.preferences === 'object' ? data.preferences : null;

  return {
    valid: true,
    manifest,
    createdAt: manifest.createdAt,
    appVersion: manifest.appVersion,
    backupOwner: manifest.backupOwner,
    hasBusinessData: accounts.length > 0 || journals.length > 0 || cashEntries.length > 0,
    hasMoneyManager: Boolean(mm),
    hasPreferences: Boolean(prefs),
    domains: {
      business: accounts.length > 0 || journals.length > 0 || cashEntries.length > 0,
      moneyManager: Boolean(mm),
      preferences: Boolean(prefs),
    },
    recordCounts: {
      accounts: accounts.length,
      customers: accounts.filter(a => a.type === 1).length,
      suppliers: accounts.filter(a => a.type === 2).length,
      journals: journals.length,
      cashEntries: cashEntries.length,
      stock: stock.length,
      businesses: businesses.length,
      mmAccounts: mm && Array.isArray(mm.accounts) ? mm.accounts.length : 0,
      mmTransactions: mm && Array.isArray(mm.transactions) ? mm.transactions.length : 0,
      mmCategories: mm && Array.isArray(mm.categories) ? mm.categories.length : 0,
      mmGoals: mm && Array.isArray(mm.goals) ? mm.goals.length : 0,
      mmRecurring: mm && Array.isArray(mm.recurring) ? mm.recurring.length : 0,
    },
    businessSummary: manifest.businessSummary || {
      businessName: data.businessName || 'Mobile Xpress',
      ownerPhone: data.ownerPhone || '',
      totalDue: accounts.filter(a => a.type === 1 && a.balance > 0).reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    },
    moneyManagerSummary: mm ? {
      accountsCount: (mm.accounts || []).length,
      txnsCount: (mm.transactions || []).length,
      netWorth: (mm.accounts || []).filter(a => !a.isArchived).reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    } : null,
  };
}

function validateBackupIntegrity(backupPayload, expectedOwnerSub = null) {
  if (!backupPayload || typeof backupPayload !== 'object') {
    return { valid: false, error: 'Malformed backup: Payload is not an object' };
  }

  const normalized = normalizeBackupPayload(backupPayload);
  if (!normalized) {
    return { valid: false, error: 'Malformed backup: Missing manifest or data section' };
  }

  const { manifest, data } = normalized;

  if (manifest.backupVersion > BACKUP_FORMAT_VERSION) {
    return { valid: false, error: 'Unsupported backup version: ' + manifest.backupVersion };
  }

  if (!manifest.backupOwner || !manifest.backupOwner.sub) {
    return { valid: false, error: 'Missing backup owner in manifest' };
  }

  if (expectedOwnerSub) {
    if (String(manifest.backupOwner.sub) !== String(expectedOwnerSub)) {
      return {
        valid: false,
        error: 'Ownership mismatch: Backup belongs to user ' + (manifest.backupOwner.email || manifest.backupOwner.sub) + ', but expected ' + expectedOwnerSub,
        ownerMismatch: true,
        actualOwner: manifest.backupOwner,
      };
    }
  }

  if (manifest.backupVersion >= 1 && !manifest.checksum) {
    return { valid: false, error: 'Integrity checksum is required for backup format version ' + manifest.backupVersion };
  }

  if (manifest.checksum) {
    if (String(manifest.checksum).startsWith("chk_")) {
      const legacyCalc = calculateLegacyChecksum(data);
      if (manifest.checksum !== legacyCalc) {
        return { valid: false, error: "Legacy integrity checksum verification failed" };
      }
    } else {
      const sha256Calc = calculateSha256Checksum(data);
      if (manifest.checksum !== sha256Calc) {
        return { valid: false, error: "SHA-256 integrity checksum verification failed" };
      }
    }
  }

  if (!Array.isArray(data.accounts)) {
    return { valid: false, error: 'Invalid data: accounts must be an array' };
  }

  return { valid: true, manifest, data };
}

class GoogleDriveBackupService {
  constructor(options = {}) {
    this.customFetch = options.fetch || (typeof fetch !== 'undefined' ? fetch : null);
    this.driveApiBase = 'https://www.googleapis.com/drive/v3';
    this.uploadApiBase = 'https://www.googleapis.com/upload/drive/v3';
  }

  setFetch(fetchFn) {
    this.customFetch = fetchFn;
  }

  getFetch() {
    if (!this.customFetch && typeof fetch !== 'undefined') {
      return fetch;
    }
    return this.customFetch;
  }

  /**
   * Fetches the user profile from Google OAuth UserInfo endpoint.
   */
  async getUserInfo(accessToken) {
    const fetchFn = this.getFetch();
    const res = await fetchFn('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch userinfo from Google: ' + res.status);
    }
    return await res.json();
  }

  /**
   * Locates the existing backup file in Google Drive AppData folder.
   */
  async findBackupFile(accessToken) {
    const fetchFn = this.getFetch();
    const query = encodeURIComponent("name = '" + BACKUP_FILENAME + "' and trashed = false");
    const url = this.driveApiBase + '/files?spaces=appDataFolder&q=' + query + '&fields=files(id,name,size,modifiedTime,createdTime,appProperties,description)';

    const res = await fetchFn(url, {
      headers: { Authorization: 'Bearer ' + accessToken },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error('Google Drive search failed (' + res.status + '): ' + errText);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  }

  /**
   * Fetches metadata for a specific file in Google Drive.
   * Requests id, name, mimeType, parents, size, modifiedTime, createdTime, appProperties, description.
   */
  async getFileMetadata(accessToken, fileId) {
    if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
      throw new Error('ফাইল আইডি প্রদান করা হয়নি।');
    }
    const fetchFn = this.getFetch();
    const fields = 'id,name,mimeType,parents,spaces,size,modifiedTime,createdTime,appProperties,description';
    const url = this.driveApiBase + '/files/' + encodeURIComponent(fileId.trim()) + '?supportsAllDrives=false&fields=' + encodeURIComponent(fields);

    const res = await fetchFn(url, {
      headers: { Authorization: 'Bearer ' + accessToken },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error('Google Drive metadata fetch failed (' + res.status + '): ' + errText);
    }

    const data = await res.json();
    if (data && typeof data === "object") {
      try {
        Object.defineProperty(data, "_httpStatus", { value: res.status, enumerable: false, writable: true });
      } catch (e) {}
    }
    return data;
  }

  /**
   * Downloads and validates the backup file from Google Drive.
   */
  async downloadBackup(accessToken, fileId, expectedSub = null) {
    const fetchFn = this.getFetch();
    const url = this.driveApiBase + '/files/' + fileId + '?alt=media';

    const res = await fetchFn(url, {
      headers: { Authorization: 'Bearer ' + accessToken },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error('Google Drive download failed (' + res.status + '): ' + errText);
    }

    let payload;
    try {
      payload = await res.json();
    } catch (e) {
      throw new Error('Failed to parse downloaded backup JSON: ' + e.message);
    }

    const valResult = validateBackupIntegrity(payload, expectedSub);
    if (!valResult.valid) {
      throw new Error('Downloaded backup validation failed: ' + valResult.error);
    }

    return {
      ...valResult,
      fileId,
      httpStatus: res.status,
    };
  }

  /**
   * Uploads or updates a backup in Google Drive appDataFolder.
   */
  async uploadBackup(accessToken, backupPayload, existingFileId = null) {
    const fetchFn = this.getFetch();
    const valResult = validateBackupIntegrity(backupPayload);
    if (!valResult.valid) {
      throw new Error('Cannot upload invalid backup payload: ' + valResult.error);
    }

    const fileContent = JSON.stringify(backupPayload, null, 2);
    const boundary = '-------314159265358979323846';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelimiter = '\r\n--' + boundary + '--';

    const metadata = {
      name: BACKUP_FILENAME,
      description: 'TallyKhata Cloud Backup (' + backupPayload.manifest.businessSummary.businessName + ')',
      appProperties: {
        app: 'TallyKhata',
        ownerSub: backupPayload.manifest.backupOwner.sub,
        schemaVersion: String(backupPayload.manifest.schemaVersion),
        createdAt: backupPayload.manifest.createdAt,
        totalAccounts: String(backupPayload.manifest.recordCounts.accounts),
      },
    };

    if (!existingFileId) {
      metadata.parents = ['appDataFolder'];
    }

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    let uploadUrl;
    let method;
    if (existingFileId) {
      uploadUrl = this.uploadApiBase + '/files/' + existingFileId + '?uploadType=multipart';
      method = 'PATCH';
    } else {
      uploadUrl = this.uploadApiBase + '/files?uploadType=multipart';
      method = 'POST';
    }

    const res = await fetchFn(uploadUrl, {
      method,
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'multipart/related; boundary=' + boundary,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error('Google Drive upload failed (' + res.status + '): ' + errText);
    }

    const result = await res.json();
    return {
      success: true,
      fileId: result.id,
      name: result.name,
      modifiedTime: result.modifiedTime || new Date().toISOString(),
      manifest: backupPayload.manifest,
      httpStatus: res.status,
    };
  }

  /**
   * Orchestrates the cloud restore process end-to-end.
   * Delegates to the shared orchestrateCloudRestore function.
   */
  async orchestrateCloudRestore(options) {
    return orchestrateCloudRestore({
      driveService: this,
      ...options,
    });
  }

  /**
   * Orchestrates the cloud backup process end-to-end with payload verification.
   * Delegates to the shared orchestrateCloudBackup function.
   */
  async orchestrateCloudBackup(options) {
    return orchestrateCloudBackup({
      driveService: this,
      ...options,
    });
  }
}

/**
 * Production Cloud Restore Orchestrator
 * Shared between App.js UI and automated test suites.
 * Ensures strict safety-snapshot scoping, atomic rollback, and UI state synchronization.
 *
 * Scenarios handled:
 * 1. Token acquisition failure -> abort before snapshot or state modification.
 * 2. File lookup failure -> abort before snapshot or state modification.
 * 3. Download / checksum / owner validation failure -> abort before snapshot or state modification.
 * 4. Snapshot creation failure -> abort before commit; no partial mutations.
 * 5. Commit failure -> rollback to the attempt's fresh snapshot; revert authoritative store and UI.
 * 6. Rollback failure -> catches storage rollback error, logs it, and preserves the original restore error for user alert.
 */
async function orchestrateCloudRestore({
  storageRepository,
  driveService,
  getAccessToken,
  fileId = null,
  userSub = null,
  domains = ['all'],
  extraState = {},
  onStatusChange = null,
  onStateCommitted = null,
  onMoneyManagerRestored = null,
  onPreferencesRestored = null,
  onRollback = null,
  onFileDiscovered = null,
  alertFn = null,
}) {
  let restoreSnapshot = null;
  try {
    if (typeof onStatusChange === 'function') {
      onStatusChange('restoring');
    }

    let token = null;
    if (typeof getAccessToken === 'function') {
      token = await getAccessToken(false);
      if (!token) {
        token = await getAccessToken(true);
      }
    }
    if (!token) {
      throw new Error('গুগল ড্রাইভ এক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় গুগল একাউন্ট সংযোগ করুন।');
    }

    let targetFileId = fileId;
    if (!targetFileId) {
      const discoveredFile = await driveService.findBackupFile(token);
      if (!discoveredFile || !discoveredFile.id) {
        throw new Error('গুগল ড্রাইভে কোনো ক্লাউড ব্যাকআপ পাওয়া যায়নি।');
      }
      targetFileId = discoveredFile.id;
      if (typeof onFileDiscovered === 'function') {
        await onFileDiscovered({
          fileId: discoveredFile.id,
          name: discoveredFile.name,
          modifiedTime: discoveredFile.modifiedTime || new Date().toISOString(),
        });
      }
    }

    // Download and validate backup integrity BEFORE taking local snapshot or touching store
    const downloadRes = await driveService.downloadBackup(token, targetFileId, userSub);
    if (!downloadRes || (!downloadRes.valid && !downloadRes.success) || !downloadRes.data) {
      throw new Error('ডাউনলোডকৃত ব্যাকআপ ফাইলটি ত্রুটিযুক্ত বা ক্ষতিগ্রস্ত।');
    }

    // Create fresh safety snapshot strictly bound to this restore attempt
    restoreSnapshot = await storageRepository.createLocalSafetySnapshot();
    if (!restoreSnapshot || !restoreSnapshot.success) {
      const failReason = restoreSnapshot && restoreSnapshot.reason ? restoreSnapshot.reason : 'অজানা ত্রুটি';
      throw new Error('রিস্টোর করার পূর্বে লোকাল সেফটি স্ন্যাপশট প্রস্তুত করা যায়নি: ' + failReason);
    }

    // Commit payload to authoritative storage
    const commitResult = await storageRepository.commitRestorePayload(downloadRes.data, {
      source: 'google_drive',
      fileId: targetFileId,
      manifest: downloadRes.manifest,
      resetPin: true,
      domains,
      extraState,
    });

    if (!commitResult || !commitResult.success) {
      const commitErr = commitResult && commitResult.error
        ? commitResult.error
        : 'ডাটাবেজে ব্যাকআপ ডাটা সফলভাবে সংরক্ষণ করা যায়নি।';
      throw new Error('কমিট ব্যর্থ: ' + commitErr);
    }

    const finalState = storageRepository.getAuthoritativeState();
    if (typeof onStateCommitted === 'function') {
      onStateCommitted(finalState);
    }
    if (commitResult && commitResult.restoredMoneyManager && typeof onMoneyManagerRestored === 'function') {
      onMoneyManagerRestored(commitResult.restoredMoneyManager);
    }
    if (commitResult && commitResult.restoredPreferences && typeof onPreferencesRestored === 'function') {
      onPreferencesRestored(commitResult.restoredPreferences);
    }

    if (typeof onStatusChange === 'function') {
      onStatusChange('success');
    }

    if (typeof alertFn === 'function') {
      alertFn(
        'রিস্টোর সফল!',
        'আপনার গুগল ড্রাইভ ক্লাউড ব্যাকআপ সফলভাবে রিস্টোর হয়েছে। মোট হিসাব: ' +
        toBengaliNumber(finalState.accounts ? finalState.accounts.length : 0) + ' টি, লেনদেন: ' +
        toBengaliNumber(finalState.journals ? finalState.journals.length : 0) + ' টি।'
      );
    }

    return {
      success: true,
      fileId: targetFileId,
      manifest: downloadRes.manifest,
      state: finalState,
      rollbackAttempted: false,
      rollbackSucceeded: false,
    };
  } catch (err) {
    if (typeof onStatusChange === 'function') {
      onStatusChange('error');
    }

    let rollbackAttempted = false;
    let rollbackSucceeded = false;
    let rollbackError = null;

    if (restoreSnapshot && restoreSnapshot.snapshotId) {
      rollbackAttempted = true;
      try {
        const rollbackRes = await storageRepository.rollbackToSafetySnapshot(restoreSnapshot.snapshotId);
        if (rollbackRes && rollbackRes.success) {
          rollbackSucceeded = true;
          const revertedState = storageRepository.getAuthoritativeState();
          if (typeof onRollback === 'function') {
            onRollback(revertedState, rollbackRes.restoredMoneyManager, rollbackRes.restoredPreferences);
          }
        } else {
          rollbackError = new Error((rollbackRes && rollbackRes.reason) || 'Rollback rejected');
        }
      } catch (rbErr) {
        console.log('[CloudRestore] Safety rollback failed:', rbErr);
        rollbackError = rbErr;
      }
    }

    const userFacingMessage = err && err.message ? err.message : 'ক্লাউড ব্যাকআপ রিস্টোর করতে সমস্যা হয়েছে।';
    if (typeof alertFn === 'function') {
      alertFn('রিস্টোর ব্যর্থ', userFacingMessage);
    }

    return {
      success: false,
      error: err,
      userFacingMessage,
      rollbackAttempted,
      rollbackSucceeded,
      rollbackError,
    };
  }
}

function toBengaliNumber(num) {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num !== undefined && num !== null ? num : 0).replace(/[0-9]/g, (d) => bn[parseInt(d, 10)]);
}

/**
 * Validates that a downloaded cloud backup payload and independently observed remote metadata
 * strictly match the newly uploaded payload and file ID.
 * Prevents treating stale, unverified, mismatched, or foreign remote files as backup success.
 *
 * Checks enforced:
 * 1. Non-empty uploaded file ID.
 * 2. Non-empty verified remote file ID (extracted from independent remote metadata).
 * 3. Exact equality between uploaded file ID and remote metadata file ID.
 * 4. Remote file metadata name matches BACKUP_FILENAME ('tallykhata_cloud_backup.json').
 * 5. Remote file parents include 'appDataFolder' (if parents specified).
 * 6. Downloaded file ID matches expected uploaded ID (if downloadedResult carries fileId).
 * 7. Presence of valid data and manifest in downloaded payload.
 * 8. Exact SHA-256 / canonical checksum equality.
 * 9. Exact backup owner sub-identifier equality.
 * 10. Exact record counts equality (accounts, journals, cashEntries).
 * 11. Exact schemaVersion and backupFormatVersion equality.
 */
function verifyUploadedBackupMatches(uploadedPayload, downloadedResult, expectedFileId = null, verifiedMetadataOrId = null) {
  if (!expectedFileId || typeof expectedFileId !== 'string' || !expectedFileId.trim()) {
    return {
      valid: false,
      reason: 'আপলোডকৃত ফাইল আইডি অনুপস্থিত বা অবৈধ।',
    };
  }
  const trimmedExpectedId = expectedFileId.trim();

  if (!verifiedMetadataOrId) {
    return {
      valid: false,
      reason: 'রিমোট ফাইল আইডি বা মেটাডাটা অনুপস্থিত।',
    };
  }

  let verifiedFileId = null;
  let remoteMeta = null;

  if (typeof verifiedMetadataOrId === 'string') {
    verifiedFileId = verifiedMetadataOrId.trim();
  } else if (typeof verifiedMetadataOrId === 'object') {
    remoteMeta = verifiedMetadataOrId;
    verifiedFileId = (remoteMeta.id || remoteMeta.fileId || '').trim();
  }

  if (!verifiedFileId) {
    return {
      valid: false,
      reason: 'রিমোট মেটাডাটা থেকে ফাইল আইডি পাওয়া যায়নি।',
    };
  }

  if (trimmedExpectedId !== verifiedFileId) {
    return {
      valid: false,
      reason: 'ফাইল আইডি অমিল: আপলোডকৃত ' + trimmedExpectedId + ', কিন্তু রিমোট মেটাডাটা ' + verifiedFileId,
    };
  }

  if (!remoteMeta || typeof remoteMeta !== 'object') {
    return {
      valid: false,
      reason: 'স্বাধীন রিমোট মেটাডাটা অবজেক্ট অনুপস্থিত: appDataFolder অবস্থান যাচাই করা সম্ভব নয়।',
    };
  }

  if (!remoteMeta.name || remoteMeta.name !== BACKUP_FILENAME) {
    return {
      valid: false,
      reason: 'রিমোট ফাইলের নাম অমিল: প্রত্যাশিত ' + BACKUP_FILENAME + ', কিন্তু পাওয়া গেছে ' + (remoteMeta.name || 'অনুপস্থিত'),
    };
  }

  // Validate raw parents and spaces fields explicitly without synthesis or mutation
  const rawParents = remoteMeta.parents;
  const rawSpaces = remoteMeta.spaces;

  if (rawParents !== undefined && rawParents !== null && !Array.isArray(rawParents)) {
    return {
      valid: false,
      reason: 'রিমোট মেটাডাটাতে parents ফিল্ড অবৈধ (array নয়): appDataFolder অবস্থান প্রমাণিত নয়।',
    };
  }

  if (rawSpaces !== undefined && rawSpaces !== null && !Array.isArray(rawSpaces)) {
    return {
      valid: false,
      reason: 'রিমোট মেটাডাটাতে spaces ফিল্ড অবৈধ (array নয়): appDataFolder অবস্থান প্রমাণিত নয়।',
    };
  }

  const hasParentsArray = Array.isArray(rawParents);
  const hasAppDataParent = hasParentsArray && rawParents.includes('appDataFolder');
  const hasRootParent = hasParentsArray && rawParents.includes('root');
  const hasOtherParents = hasParentsArray && rawParents.length > 0 && !hasAppDataParent;

  const hasSpacesArray = Array.isArray(rawSpaces);
  const hasAppDataSpace = hasSpacesArray && rawSpaces.includes('appDataFolder');
  const hasNonAppDataSpaces = hasSpacesArray && rawSpaces.length > 0 && !hasAppDataSpace;

  // Contradiction 1: parents specifies root folder while spaces claims 'appDataFolder'
  if (hasRootParent && hasAppDataSpace) {
    return {
      valid: false,
      reason: 'রিমোট মেটাডাটাতে parents এবং spaces এর মধ্যে বৈপরীত্য রয়েছে: parents root ফোল্ডার নির্দেশ করছে (' + rawParents.join(', ') + '), কিন্তু spaces এ appDataFolder নির্দেশিত।',
    };
  }

  // Contradiction 2: parents contains 'appDataFolder', but spaces explicitly only contains other spaces (e.g. ['drive'])
  if (hasAppDataParent && hasNonAppDataSpaces) {
    return {
      valid: false,
      reason: 'রিমোট মেটাডাটাতে parents এবং spaces এর মধ্যে বৈপরীত্য রয়েছে: parents এ appDataFolder হলেও spaces এ appDataFolder অনুপস্থিত (' + rawSpaces.join(', ') + ')।',
    };
  }

  // If parents specifies another folder and spaces does not indicate appDataFolder
  if (!hasAppDataSpace && hasOtherParents) {
    return {
      valid: false,
      reason: 'রিমোট ফাইল লোকেশন অমিল: parents appDataFolder নির্দেশ করছে না এবং spaces ফিল্ডেও appDataFolder নেই (পাওয়া গেছে: ' + rawParents.join(', ') + ')।',
    };
  }

  // Check documented signals for appDataFolder membership
  let locationSignal = null;
  if (hasAppDataParent && hasAppDataSpace) {
    locationSignal = 'parents_and_spaces';
  } else if (hasAppDataParent) {
    locationSignal = 'parents';
  } else if (hasAppDataSpace) {
    locationSignal = 'spaces';
  }

  if (!locationSignal) {
    if (rawParents === undefined || rawParents === null) {
      return {
        valid: false,
        reason: 'রিমোট মেটাডাটাতে parents ফিল্ড অনুপস্থিত এবং spaces ফিল্ডেও appDataFolder নেই: appDataFolder অবস্থান প্রমাণিত নয়।',
      };
    }
    if (hasParentsArray && rawParents.length === 0) {
      return {
        valid: false,
        reason: 'রিমোট মেটাডাটাতে parents ফিল্ড খালি এবং spaces ফিল্ডেও appDataFolder নেই: appDataFolder অবস্থান প্রমাণিত নয়।',
      };
    }
    return {
      valid: false,
      reason: 'রিমোট ফাইল লোকেশন অমিল: মেটাডাটা appDataFolder অবস্থান প্রমাণ করতে ব্যর্থ।',
    };
  }

  if (remoteMeta.appProperties && remoteMeta.appProperties.ownerSub) {
    const expectedSub = uploadedPayload && uploadedPayload.manifest && uploadedPayload.manifest.backupOwner && uploadedPayload.manifest.backupOwner.sub;
    if (expectedSub && remoteMeta.appProperties.ownerSub !== expectedSub) {
      return {
        valid: false,
        reason: 'রিমোট মেটাডাটা ব্যবহারকারী সাব-আইডি অমিল: প্রত্যাশিত ' + expectedSub + ', কিন্তু রিমোট ' + remoteMeta.appProperties.ownerSub,
      };
    }
  }

  if (downloadedResult && downloadedResult.fileId && downloadedResult.fileId.trim() !== trimmedExpectedId) {
    return {
      valid: false,
      reason: 'ডাউনলোডকৃত ফাইল আইডি অমিল: প্রত্যাশিত ' + trimmedExpectedId + ', কিন্তু ডাউনলোড থেকে প্রাপ্ত ' + downloadedResult.fileId,
    };
  }

  if (!downloadedResult || (!downloadedResult.data && !downloadedResult.manifest)) {
    return {
      valid: false,
      reason: 'ডাউনলোডকৃত ব্যাকআপ থেকে নির্ভরযোগ্য ডাটা বা ম্যানিফেস্ট পাওয়া যায়নি।',
    };
  }

  const downloadedManifest = downloadedResult.manifest || (downloadedResult.data && downloadedResult.data.manifest);
  const uploadedManifest = uploadedPayload && uploadedPayload.manifest;

  if (!downloadedManifest || !uploadedManifest) {
    return {
      valid: false,
      reason: 'ব্যাকআপ ম্যানিফেস্ট অনুপস্থিত।',
    };
  }

  if (!downloadedManifest.checksum || !uploadedManifest.checksum || downloadedManifest.checksum !== uploadedManifest.checksum) {
    return {
      valid: false,
      reason: 'ব্যাকআপ চেকসাম অমিল: আপলোডকৃত ' + uploadedManifest.checksum + ', কিন্তু ক্লাউড থেকে প্রাপ্ত ' + downloadedManifest.checksum,
    };
  }

  const downloadedSub = downloadedManifest.backupOwner && downloadedManifest.backupOwner.sub;
  const uploadedSub = uploadedManifest.backupOwner && uploadedManifest.backupOwner.sub;
  if (!downloadedSub || !uploadedSub || downloadedSub !== uploadedSub) {
    return {
      valid: false,
      reason: 'ব্যাকআপ ব্যবহারকারী সাব-আইডি অমিল: প্রত্যাশিত ' + uploadedSub + ', কিন্তু প্রাপ্ত ' + downloadedSub,
    };
  }

  const expCounts = uploadedManifest.recordCounts || {};
  const downCounts = downloadedManifest.recordCounts || {};
  if (
    Number(expCounts.accounts || 0) !== Number(downCounts.accounts || 0) ||
    Number(expCounts.journals || 0) !== Number(downCounts.journals || 0) ||
    Number(expCounts.cashEntries || 0) !== Number(downCounts.cashEntries || 0)
  ) {
    return {
      valid: false,
      reason: 'রেকর্ড কাউন্ট অমিল: হিসাব (' + expCounts.accounts + ' vs ' + downCounts.accounts + '), লেনদেন (' + expCounts.journals + ' vs ' + downCounts.journals + '), ক্যাশবক্স (' + expCounts.cashEntries + ' vs ' + downCounts.cashEntries + ')',
    };
  }

  if (
    uploadedManifest.schemaVersion !== downloadedManifest.schemaVersion ||
    uploadedManifest.backupFormatVersion !== downloadedManifest.backupFormatVersion
  ) {
    return {
      valid: false,
      reason: 'ব্যাকআপ স্কিমা বা ফরম্যাট ভার্সন অমিল।',
    };
  }

  return {
    valid: true,
    matchedChecksum: downloadedManifest.checksum,
    matchedOwnerSub: downloadedSub,
    matchedFileId: verifiedFileId,
    recordCounts: downCounts,
    verifiedMetadata: remoteMeta || null,
    locationSignal,
  };
}

/**
 * Production Cloud Backup Orchestrator
 * Shared between App.js UI and automated test suites.
 * Ensures:
 * 1. Google Account verification before starting.
 * 2. Authoritative state extraction and secure payload building (PIN scrubbed).
 * 3. Real upload to Google Drive REST API with automatic 401 retry.
 * 4. Independent remote file metadata retrieval (getFileMetadata) to verify existence, name, and parents.
 * 5. Immediate round-trip download of the remote file.
 * 6. Strict payload-to-upload verification (checksum, owner, counts, versions, and verified file ID).
 * 7. Metadata update and success state ONLY upon verified match.
 */
async function orchestrateCloudBackup({
  storageRepository,
  driveService,
  getAccessToken,
  googleUser,
  existingFileId = null,
  extraData = null,
  onStatusChange = null,
  onMetaUpdated = null,
  alertFn = null,
}) {
  try {
    if (!googleUser || !googleUser.sub) {
      throw new Error('ক্লাউড ব্যাকআপ নিতে প্রথমে গুগল একাউন্ট যুক্ত করতে হবে।');
    }

    if (typeof onStatusChange === 'function') {
      onStatusChange('backing_up');
    }

    let token = null;
    if (typeof getAccessToken === 'function') {
      token = await getAccessToken(false);
      if (!token) {
        token = await getAccessToken(true);
      }
    }
    if (!token) {
      throw new Error('গুগল ড্রাইভ এক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় গুগল একাউন্ট সংযোগ করুন।');
    }

    const currentState = storageRepository ? storageRepository.getAuthoritativeState() : null;
    if (!currentState || !Array.isArray(currentState.accounts)) {
      throw new Error('লোকাল ডাটাবেজ থেকে নির্ভরযোগ্য ডাটা প্রস্তুত করা যায়নি।');
    }

    let backupState = currentState;
    if (storageRepository && typeof storageRepository.getFullBackupState === 'function') {
      try {
        backupState = await storageRepository.getFullBackupState(extraData || {});
      } catch (e) {
        backupState = { ...currentState, ...(extraData || {}) };
      }
    } else if (extraData) {
      backupState = { ...currentState, ...extraData };
    }

    const payload = buildBackupPayload(backupState, googleUser);

    let uploadRes = null;
    try {
      uploadRes = await driveService.uploadBackup(token, payload, existingFileId);
    } catch (uploadErr) {
      const isAuthErr = uploadErr && uploadErr.message && (uploadErr.message.includes('401') || uploadErr.message.toLowerCase().includes('unauthorized'));
      if (isAuthErr && typeof getAccessToken === 'function') {
        console.log('[CloudBackup] 401 Unauthorized during upload. Refreshing token...');
        const freshToken = await getAccessToken(true);
        if (freshToken) {
          token = freshToken;
          uploadRes = await driveService.uploadBackup(freshToken, payload, existingFileId);
        }
      }
      if (!uploadRes) throw uploadErr;
    }

    const uploadedFileId = uploadRes && uploadRes.fileId;
    if (!uploadedFileId) {
      throw new Error('গুগল ড্রাইভ সার্ভার থেকে ফাইল আইডি পাওয়া যায়নি। আপলোড ব্যর্থ হয়েছে।');
    }

    // Step 2: Fetch remote file metadata independently from Google Drive
    if (!driveService || typeof driveService.getFileMetadata !== 'function') {
      throw new Error('গুগল ড্রাইভ মেটাডাটা সেবা (getFileMetadata) অনুপস্থিত বা অনুপলব্ধ। স্বাধীন ভেরিফিকেশন ছাড়া ব্যাকআপ নিশ্চিত করা সম্ভব নয়।');
    }

    let remoteMeta = null;
    try {
      remoteMeta = await driveService.getFileMetadata(token, uploadedFileId);
    } catch (metaErr) {
      const isAuthErr = metaErr && metaErr.message && (metaErr.message.includes('401') || metaErr.message.toLowerCase().includes('unauthorized'));
      if (isAuthErr && typeof getAccessToken === 'function') {
        console.log('[CloudBackup] 401 Unauthorized during metadata fetch. Refreshing token...');
        const freshToken = await getAccessToken(true);
        if (freshToken) {
          token = freshToken;
          remoteMeta = await driveService.getFileMetadata(freshToken, uploadedFileId);
        }
      }
      if (!remoteMeta) throw metaErr;
    }

    if (!remoteMeta) {
      throw new Error('গুগল ড্রাইভ থেকে রিমোট মেটাডাটা পাওয়া যায়নি। ব্যাকআপ যাচাই অসম্পূর্ণ।');
    }

    // Step 3: Verify uploaded remote file immediately via real download
    let verifyDownload = null;
    try {
      verifyDownload = await driveService.downloadBackup(
        token,
        uploadedFileId,
        googleUser.sub
      );
    } catch (downloadErr) {
      const isAuthErr = downloadErr && downloadErr.message && (downloadErr.message.includes('401') || downloadErr.message.toLowerCase().includes('unauthorized'));
      if (isAuthErr && typeof getAccessToken === 'function') {
        console.log('[CloudBackup] 401 Unauthorized during download verification. Refreshing token...');
        const freshToken = await getAccessToken(true);
        if (freshToken) {
          token = freshToken;
          verifyDownload = await driveService.downloadBackup(
            freshToken,
            uploadedFileId,
            googleUser.sub
          );
        }
      }
      if (!verifyDownload) throw downloadErr;
    }

    // Step 4: Exact verification check against uploaded payload & independent remote metadata
    const matchResult = verifyUploadedBackupMatches(
      payload,
      verifyDownload,
      uploadedFileId,
      remoteMeta
    );
    if (!matchResult || !matchResult.valid) {
      const failReason = matchResult && matchResult.reason ? matchResult.reason : 'ক্লাউড পেলোড ও আপলোডকৃত ডাটার অমিল রয়েছে।';
      throw new Error('গুগল ড্রাইভ ব্যাকআপ যাচাই ব্যর্থ: ' + failReason);
    }

    console.log('[CloudBackupLiveEvidence]', JSON.stringify({
      uploadStatus: (uploadRes && uploadRes.httpStatus) || 200,
      metadataStatus: (remoteMeta && remoteMeta._httpStatus) || 200,
      downloadStatus: (verifyDownload && verifyDownload.httpStatus) || 200,
      returnedUploadedFileId: Boolean(remoteMeta && remoteMeta.id && remoteMeta.id === uploadedFileId),
      rawParents: (remoteMeta && remoteMeta.parents) || null,
      rawSpaces: (remoteMeta && remoteMeta.spaces) || null,
      isAppDataFolder: matchResult.locationSignal !== null,
      locationSignal: matchResult.locationSignal,
      checksumMatch: Boolean(matchResult.matchedChecksum && matchResult.matchedChecksum === payload.manifest.checksum),
      ownerMatch: Boolean(matchResult.matchedOwnerSub && matchResult.matchedOwnerSub === payload.manifest.backupOwner.sub),
      schemaVersion: payload.manifest.schemaVersion,
      recordCounts: matchResult.recordCounts,
    }));

    const updatedMeta = {
      fileId: matchResult.matchedFileId,
      name: (remoteMeta && remoteMeta.name) || uploadRes.name || BACKUP_FILENAME,
      modifiedTime: (remoteMeta && remoteMeta.modifiedTime) || uploadRes.modifiedTime || new Date().toISOString(),
      manifest: payload.manifest,
      size: (remoteMeta && remoteMeta.size) || undefined,
    };

    if (typeof onMetaUpdated === 'function') {
      await onMetaUpdated(updatedMeta);
    }

    if (typeof onStatusChange === 'function') {
      onStatusChange('success');
    }

    if (typeof alertFn === 'function') {
      alertFn(
        'ব্যাকআপ সফল!',
        'আপনার সম্পূর্ণ খাতার ব্যাকআপ সফলভাবে গুগল ড্রাইভে সংরক্ষিত ও যাচাইকৃত হয়েছে。\n\n' +
        'মোট হিসাব: ' + toBengaliNumber(payload.manifest.recordCounts.accounts) + ' টি\n' +
        'মোট লেনদেন: ' + toBengaliNumber(payload.manifest.recordCounts.journals) + ' টি\n' +
        'ক্যাশবক্স এন্ট্রি: ' + toBengaliNumber(payload.manifest.recordCounts.cashEntries) + ' টি'
      );
    }

    return {
      success: true,
      fileId: matchResult.matchedFileId,
      metadata: updatedMeta,
      manifest: payload.manifest,
      verifiedChecksum: matchResult.matchedChecksum,
      verifiedMetadata: matchResult.verifiedMetadata,
    };
  } catch (err) {
    if (typeof onStatusChange === 'function') {
      onStatusChange('error');
    }
    const userFacingMessage = err && err.message
      ? err.message
      : 'গুগল ড্রাইভে ব্যাকআপ নিতে সমস্যা হয়েছে।';
    if (typeof alertFn === 'function') {
      alertFn('ব্যাকআপ ত্রুটি', userFacingMessage);
    }
    return {
      success: false,
      error: err,
      userFacingMessage,
    };
  }
}

module.exports = {
  BACKUP_FILENAME,
  BACKUP_FORMAT_VERSION,
  SCHEMA_VERSION,
  APP_VERSION,
  calculateChecksum,
  calculateSha256Checksum,
  calculateLegacyChecksum,
  buildBackupPayload,
  normalizeBackupPayload,
  validateBackupIntegrity,
  previewBackup,
  toBengaliNumber,
  verifyUploadedBackupMatches,
  orchestrateCloudBackup,
  orchestrateCloudRestore,
  GoogleDriveBackupService,
  googleDriveBackupService: new GoogleDriveBackupService(),
};
