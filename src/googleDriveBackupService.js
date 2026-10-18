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
  try {
    if (typeof require === "function") {
      const crypto = require("crypto");
      if (crypto && typeof crypto.createHash === "function") {
        return "sha256_" + crypto.createHash("sha256").update(Buffer.from(str, "utf8")).digest("hex");
      }
    }
  } catch (e) {}
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
 */
function buildBackupPayload(authoritativeState, userProfile) {
  if (!userProfile || !userProfile.sub) {
    throw new Error('User profile with verified "sub" identifier is required for backup ownership');
  }

  const accounts = Array.isArray(authoritativeState.accounts) ? authoritativeState.accounts : [];
  const journals = Array.isArray(authoritativeState.journals) ? authoritativeState.journals : [];
  const cashEntries = Array.isArray(authoritativeState.cashEntries) ? authoritativeState.cashEntries : [];
  const stock = Array.isArray(authoritativeState.stock) ? authoritativeState.stock : [];
  const notes = Array.isArray(authoritativeState.notes) ? authoritativeState.notes : [];
  const businesses = Array.isArray(authoritativeState.businesses) ? authoritativeState.businesses : [];

  const rawData = {
    accounts,
    journals,
    cashEntries,
    cashReconciliation: authoritativeState.cashReconciliation || null,
    stock,
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
    pinEnabled: Boolean(authoritativeState.pinEnabled),
    appPin: authoritativeState.appPin || '',
    tagadaLogs: Array.isArray(authoritativeState.tagadaLogs) ? authoritativeState.tagadaLogs : [],
  };

  const checksum = calculateChecksum(rawData);

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
    recordCounts: {
      accounts: accounts.length,
      customers: accounts.filter(a => a.type === 1).length,
      suppliers: accounts.filter(a => a.type === 2).length,
      journals: journals.length,
      cashEntries: cashEntries.length,
      stock: stock.length,
      notes: notes.length,
      businesses: businesses.length,
    },
    businessSummary: {
      businessName: rawData.businessName,
      ownerPhone: rawData.ownerPhone,
      totalDue: accounts.filter(a => a.type === 1 && a.balance > 0).reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    },
    checksum,
  };

  return {
    manifest,
    data: rawData,
  };
}

/**
 * Validates integrity, schema, checksum, and ownership of a downloaded backup.
 */
function validateBackupIntegrity(backupPayload, expectedOwnerSub = null) {
  if (!backupPayload || typeof backupPayload !== 'object') {
    return { valid: false, error: 'Malformed backup: Payload is not an object' };
  }

  const { manifest, data } = backupPayload;
  if (!manifest || !data) {
    return { valid: false, error: 'Malformed backup: Missing manifest or data section' };
  }

  if (manifest.backupVersion > BACKUP_FORMAT_VERSION) {
    return { valid: false, error: 'Unsupported backup version: ' + manifest.backupVersion };
  }

  if (!manifest.backupOwner || !manifest.backupOwner.sub) {
    return { valid: false, error: 'Missing backup owner in manifest' };
  }

  if (expectedOwnerSub && String(manifest.backupOwner.sub) !== String(expectedOwnerSub)) {
    return {
      valid: false,
      error: 'Ownership mismatch: Backup belongs to user ' + manifest.backupOwner.email + ', but expected ' + expectedOwnerSub,
      ownerMismatch: true,
      actualOwner: manifest.backupOwner
    };
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

    return valResult;
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
  validateBackupIntegrity,
  GoogleDriveBackupService,
  googleDriveBackupService: new GoogleDriveBackupService(),
};
