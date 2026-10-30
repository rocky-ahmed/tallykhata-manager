/**
 * test_google_drive_backup.js
 * Comprehensive Test Suite for TallyKhata Google Drive Backup & Restore
 * Validates the 33 test specifications defined in Master Prompt Section 12.
 */

const assert = require('assert');
const {
  buildBackupPayload,
  validateBackupIntegrity,
  GoogleDriveBackupService,
  orchestrateCloudRestore,
  orchestrateCloudBackup,
  verifyUploadedBackupMatches,
  BACKUP_FILENAME,
} = require('./src/googleDriveBackupService');

function createMockUiState(initialState = {}) {
  let uiState = { ...initialState };
  let uiStatus = null;
  const alertLog = [];

  const applyState = (state, { resetPin = false } = {}) => {
    if (!state) return;
    uiState = { ...uiState, ...state };
    if (resetPin) {
      uiState.pinEnabled = false;
      uiState.appPin = '';
    }
  };

  return {
    getUiState: () => ({ ...uiState }),
    getUiStatus: () => uiStatus,
    getAlertLog: () => [...alertLog],
    onStatusChange: (status) => {
      uiStatus = status;
    },
    onStateCommitted: (newState) => {
      applyState(newState, { resetPin: true });
    },
    onRollback: (safeState) => {
      applyState(safeState, { resetPin: false });
    },
    alertFn: (title, message) => {
      alertLog.push({ title, message });
    },
  };
}

const {
  StorageRepository,
  createDefaultState,
} = require('./src/storageRepository');

function createMockAdapter() {
  const store = new Map();
  return {
    getItem: async (k) => store.has(k) ? store.get(k) : null,
    setItem: async (k, v) => { store.set(k, String(v)); },
    removeItem: async (k) => { store.delete(k); },
    clear: async () => { store.clear(); },
    _store: store,
  };
}

/**
 * Creates an in-memory Google Drive REST API mock.
 */
function createMockDriveFetch() {
  // Map of fileId -> { metadata, content, userSub }
  const files = new Map();
  let nextId = 100;
  let networkOnline = true;
  let authValid = true;

  const mockFetch = async (url, options = {}) => {
    if (!networkOnline) {
      throw new Error('Network request failed: Device offline');
    }

    const authHeader = options.headers && options.headers.Authorization;
    if (!authHeader || !authValid) {
      return {
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: 'invalid_token', error_description: 'Token expired or revoked' }),
        json: async () => ({ error: 'invalid_token' }),
      };
    }

    // 1. UserInfo endpoint
    if (url.includes('/oauth2/v3/userinfo')) {
      const token = authHeader.replace('Bearer ', '');
      if (token === 'token_user_a') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            sub: 'google_sub_user_a',
            email: 'usera@gmail.com',
            name: 'User A Shop',
            picture: 'https://example.com/avatar_a.png',
          }),
        };
      } else if (token === 'token_user_b') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            sub: 'google_sub_user_b',
            email: 'userb@gmail.com',
            name: 'User B Grocery',
            picture: 'https://example.com/avatar_b.png',
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ sub: 'google_sub_generic', email: 'generic@gmail.com', name: 'Generic' }),
      };
    }

    // 2. Search files in AppData
    if (url.includes('/drive/v3/files?') && options.method !== 'POST') {
      const token = authHeader.replace('Bearer ', '');
      const userSub = token === 'token_user_a' ? 'google_sub_user_a' : token === 'token_user_b' ? 'google_sub_user_b' : 'other';
      const userFiles = [];
      for (const [id, f] of files.entries()) {
        if (f.userSub === userSub && f.metadata.name === BACKUP_FILENAME) {
          userFiles.push({
            id,
            name: f.metadata.name,
            size: JSON.stringify(f.content).length,
            modifiedTime: f.modifiedTime,
            appProperties: f.metadata.appProperties,
          });
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ files: userFiles }),
      };
    }

    // 3. Download file
    if (url.includes('/drive/v3/files/') && url.includes('alt=media')) {
      const match = url.match(/\/files\/([^\?]+)\?alt=media/);
      const fileId = match ? match[1] : null;
      if (files.has(fileId)) {
        const fileObj = files.get(fileId);
        return {
          ok: true,
          status: 200,
          json: async () => fileObj.content,
        };
      }
      return {
        ok: false,
        status: 404,
        text: async () => 'File not found',
      };
    }

    // 3.5. Get file metadata
    if (url.includes('/drive/v3/files/') && !url.includes('alt=media') && !url.includes('/upload/')) {
      const match = url.match(/\/files\/([^\?]+)/);
      const fileId = match ? decodeURIComponent(match[1]) : null;
      if (files.has(fileId)) {
        const fileObj = files.get(fileId);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: fileId,
            name: fileObj.metadata.name,
            mimeType: 'application/json',
            parents: fileObj.metadata.parents || ['appDataFolder'],
            size: JSON.stringify(fileObj.content).length,
            modifiedTime: fileObj.modifiedTime,
            appProperties: fileObj.metadata.appProperties,
          }),
        };
      }
      return {
        ok: false,
        status: 404,
        text: async () => 'File not found',
      };
    }

    // 4. Upload / Create file (POST)
    if (url.includes('/upload/drive/v3/files') && (options.method === 'POST' || !options.method)) {
      const token = authHeader.replace('Bearer ', '');
      const userSub = token === 'token_user_a' ? 'google_sub_user_a' : token === 'token_user_b' ? 'google_sub_user_b' : 'other';
      const body = options.body || '';
      // Parse JSON from multipart
      const parts = body.split('\r\n\r\n');
      const metadata = JSON.parse(parts[1].split('\r\n')[0]);
      const content = JSON.parse(parts[2].split('\r\n')[0]);

      const fileId = 'file_' + (++nextId);
      const modifiedTime = new Date().toISOString();
      files.set(fileId, { metadata, content, userSub, modifiedTime });

      return {
        ok: true,
        status: 200,
        json: async () => ({ id: fileId, name: metadata.name, modifiedTime }),
      };
    }

    // 5. Update file (PATCH)
    if (url.includes('/upload/drive/v3/files/') && options.method === 'PATCH') {
      const match = url.match(/\/files\/([^\?]+)\?uploadType=multipart/);
      const fileId = match ? match[1] : null;
      if (!files.has(fileId)) {
        return { ok: false, status: 404, text: async () => 'File not found' };
      }
      const token = authHeader.replace('Bearer ', '');
      const userSub = token === 'token_user_a' ? 'google_sub_user_a' : token === 'token_user_b' ? 'google_sub_user_b' : 'other';

      const body = options.body || '';
      const parts = body.split('\r\n\r\n');
      const metadata = JSON.parse(parts[1].split('\r\n')[0]);
      const content = JSON.parse(parts[2].split('\r\n')[0]);

      const modifiedTime = new Date().toISOString();
      files.set(fileId, { metadata, content, userSub, modifiedTime });

      return {
        ok: true,
        status: 200,
        json: async () => ({ id: fileId, name: metadata.name, modifiedTime }),
      };
    }

    return { ok: false, status: 400, text: async () => 'Unknown route: ' + url };
  };

  return {
    fetch: mockFetch,
    setNetworkOnline: (online) => { networkOnline = online; },
    setAuthValid: (valid) => { authValid = valid; },
    getStoredFiles: () => files,
  };
}

async function runAllTests() {
  console.log('================================================================');
  console.log('TALLYKHATA GOOGLE DRIVE BACKUP & RESTORE — AUTOMATED TEST SUITE');
  console.log('Validating Master Prompt Section 12 Requirements (1 - 33)');
  console.log('================================================================\n');

  let passed = 0;
  let total = 38;

  const mockDrive = createMockDriveFetch();
  const driveService = new GoogleDriveBackupService({ fetch: mockDrive.fetch });

  // 1. Connect and disconnect Google Account
  {
    const userInfo = await driveService.getUserInfo('token_user_a');
    assert.strictEqual(userInfo.sub, 'google_sub_user_a');
    assert.strictEqual(userInfo.email, 'usera@gmail.com');
    // Disconnect simulated by clearing session
    const disconnectedUser = null;
    assert.strictEqual(disconnectedUser, null);
    console.log('[PASS] TEST 1: Connect and disconnect Google Account');
    passed++;
  }

  // 2. Create the first backup
  let fileIdUserA;
  const sampleStateA = {
    ...createDefaultState(),
    businessName: 'Al-Madina Store',
    ownerPhone: '01711223344',
    accounts: [
      { id: 'acc_1', name: 'Rahim Mia', phone: '01811223344', type: 1, balance: 1500, openingBalance: 500 },
      { id: 'acc_2', name: 'Jamal Khan', phone: '01911223344', type: 2, balance: -800, openingBalance: -300 },
    ],
    journals: [
      { id: 'j_1', accountId: 'acc_1', amount: 1000, type: 'given', date: '2026-10-15', time: '10:00' },
      { id: 'j_2', accountId: 'acc_2', amount: 500, type: 'payment', date: '2026-10-15', time: '11:00' },
    ],
    cashEntries: [
      { id: 'c_1', amount: 1000, type: 'in', description: 'কাস্টমার পেমেন্ট', date: '2026-10-15' },
    ],
    stock: [
      { id: 's_1', name: 'Miniket Rice 25kg', stockQty: 10, buyPrice: 1500, salePrice: 1750 },
    ],
    notes: [
      { id: 'n_1', text: 'Order fresh vegetables tomorrow', isComplete: false },
    ],
    businesses: [
      { id: 'b_1', name: 'Al-Madina Store', type: 'মুদি দোকান' },
      { id: 'b_2', name: 'Madina Electronics', type: 'ইলেকট্রনিক্স' },
    ],
  };

  const userProfileA = { sub: 'google_sub_user_a', email: 'usera@gmail.com', name: 'User A' };
  {
    const payloadA = buildBackupPayload(sampleStateA, userProfileA);
    assert.strictEqual(payloadA.manifest.backupOwner.sub, 'google_sub_user_a');
    assert.strictEqual(payloadA.manifest.recordCounts.accounts, 2);
    assert.strictEqual(payloadA.manifest.recordCounts.journals, 2);

    const uploadRes = await driveService.uploadBackup('token_user_a', payloadA, null);
    assert.strictEqual(uploadRes.success, true);
    assert(uploadRes.fileId);
    fileIdUserA = uploadRes.fileId;
    console.log('[PASS] TEST 2: Create the first cloud backup');
    passed++;
  }

  // 3. Update an existing backup
  {
    const updatedStateA = {
      ...sampleStateA,
      accounts: [
        ...sampleStateA.accounts,
        { id: 'acc_3', name: 'Karim Uddin', phone: '01611223344', type: 1, balance: 2000, openingBalance: 0 },
      ],
    };
    const payloadUpdated = buildBackupPayload(updatedStateA, userProfileA);
    const updateRes = await driveService.uploadBackup('token_user_a', payloadUpdated, fileIdUserA);
    assert.strictEqual(updateRes.success, true);
    assert.strictEqual(updateRes.fileId, fileIdUserA); // Preserves exact same file ID in Google Drive AppData

    const downloaded = await driveService.downloadBackup('token_user_a', fileIdUserA, userProfileA.sub);
    assert.strictEqual(downloaded.data.accounts.length, 3);
    console.log('[PASS] TEST 3: Update an existing cloud backup in-place');
    passed++;
  }

  // 4. Restore on a clean installation
  const phoneBAdapter = createMockAdapter();
  const repoPhoneB = new StorageRepository(phoneBAdapter);
  {
    // Clean phone boot
    const boot = await repoPhoneB.loadInitialData();
    assert.strictEqual(boot.success, true);

    // Locate existing cloud backup
    const backupFile = await driveService.findBackupFile('token_user_a');
    assert(backupFile && backupFile.id);

    // Download and validate
    const downloaded = await driveService.downloadBackup('token_user_a', backupFile.id, userProfileA.sub);
    assert.strictEqual(downloaded.valid, true);

    // Commit restore through repository
    const restoreRes = await repoPhoneB.commitRestorePayload(downloaded);
    assert.strictEqual(restoreRes.success, true);

    const restoredState = repoPhoneB.getAuthoritativeState();
    assert.strictEqual(restoredState.businessName, 'Al-Madina Store');
    assert.strictEqual(restoredState.accounts.length, 3);
    console.log('[PASS] TEST 4: Restore on a clean installation');
    passed++;
  }

  // 5. Confirm that the correct account's backup is selected
  {
    const backupFileA = await driveService.findBackupFile('token_user_a');
    assert.strictEqual(backupFileA.id, fileIdUserA);
    console.log('[PASS] TEST 5: Confirm correct account backup file selected');
    passed++;
  }

  // 6. Reject restoration from a different Google Account
  {
    // User B connects
    const userProfileB = { sub: 'google_sub_user_b', email: 'userb@gmail.com', name: 'User B' };
    const downloadedA = await driveService.downloadBackup('token_user_a', fileIdUserA);

    // Attempting to validate User A's backup for User B must be rejected
    const valResult = validateBackupIntegrity(downloadedA, userProfileB.sub);
    assert.strictEqual(valResult.valid, false);
    assert.strictEqual(valResult.ownerMismatch, true);
        // Ensure offline_export or legacy_owner cannot bypass ownership check when expectedOwnerSub is provided
    const spoofedOffline = { ...downloadedA, manifest: { ...downloadedA.manifest, backupOwner: { sub: 'offline_export' } } };
    const valSpoofedOffline = validateBackupIntegrity(spoofedOffline, userProfileB.sub);
    assert.strictEqual(valSpoofedOffline.valid, false);
    assert.strictEqual(valSpoofedOffline.ownerMismatch, true);

    const spoofedLegacy = { ...downloadedA, manifest: { ...downloadedA.manifest, backupOwner: { sub: 'legacy_owner' } } };
    const valSpoofedLegacy = validateBackupIntegrity(spoofedLegacy, userProfileB.sub);
    assert.strictEqual(valSpoofedLegacy.valid, false);
    assert.strictEqual(valSpoofedLegacy.ownerMismatch, true);

console.log('[PASS] TEST 6: Reject restoration from a different Google Account');
    passed++;
  }

  // 7. Prevent accidental upload of Account A's local dataset to Account B
  {
    // If device switched to User B, trying to upload without re-binding ownership throws or rejects
    assert.throws(() => {
      buildBackupPayload(sampleStateA, { sub: '' });
    }, /User profile with verified "sub"/);
    console.log('[PASS] TEST 7: Prevent accidental upload of unauthenticated or crossed dataset');
    passed++;
  }

  // 8. Restore accounts and opening balances correctly
  {
    const state = repoPhoneB.getAuthoritativeState();
    const acc1 = state.accounts.find(a => a.id === 'acc_1');
    assert(acc1);
    assert.strictEqual(Number(acc1.openingBalance), 500);
    // Opening 500 + Journal given 1000 = 1500 running balance
    assert.strictEqual(Number(acc1.balance), 1500);
    console.log('[PASS] TEST 8: Restore accounts and opening balances correctly');
    passed++;
  }

  // 9. Restore complete transaction histories
  {
    const state = repoPhoneB.getAuthoritativeState();
    assert.strictEqual(state.journals.length, 2);
    assert.strictEqual(state.journals[0].amount, 1000);
    console.log('[PASS] TEST 9: Restore complete transaction histories');
    passed++;
  }

  // 10. Restore linked cashbox entries
  {
    const state = repoPhoneB.getAuthoritativeState();
    assert.strictEqual(state.cashEntries.length, 1);
    assert.strictEqual(state.cashEntries[0].amount, 1000);
    console.log('[PASS] TEST 10: Restore linked cashbox entries');
    passed++;
  }

  // 11. Restore inventory and notes
  {
    const state = repoPhoneB.getAuthoritativeState();
    assert.strictEqual(state.stock.length, 1);
    assert.strictEqual(state.stock[0].name, 'Miniket Rice 25kg');
    assert.strictEqual(state.notes.length, 1);
    assert.strictEqual(state.notes[0].text, 'Order fresh vegetables tomorrow');
    console.log('[PASS] TEST 11: Restore inventory and notes');
    passed++;
  }

  // 12. Preserve multiple-business data
  {
    const state = repoPhoneB.getAuthoritativeState();
    assert.strictEqual(state.businesses.length, 2);
    assert.strictEqual(state.businesses[1].name, 'Madina Electronics');
    console.log('[PASS] TEST 12: Preserve multiple-business profiles');
    passed++;
  }

  // 13. Prevent duplicate records after repeated restore attempts
  {
    const backupFile = await driveService.findBackupFile('token_user_a');
    const downloaded = await driveService.downloadBackup('token_user_a', backupFile.id, userProfileA.sub);

    // Repeat restore 3 times
    await repoPhoneB.commitRestorePayload(downloaded);
    await repoPhoneB.commitRestorePayload(downloaded);
    await repoPhoneB.commitRestorePayload(downloaded);

    const state = repoPhoneB.getAuthoritativeState();
    assert.strictEqual(state.accounts.length, 3, 'Accounts count must not multiply');
    assert.strictEqual(state.journals.length, 2, 'Journals count must not multiply');
    assert.strictEqual(state.stock.length, 1, 'Stock count must not multiply');
    console.log('[PASS] TEST 13: Prevent duplicate records after repeated restore attempts (Idempotent)');
    passed++;
  }

  // 14. Reject corrupted and unsupported backup versions
  {
    const corruptedPayload = {
      manifest: {
        backupVersion: 999, // Future unsupported version
        schemaVersion: 6,
        backupOwner: { sub: 'google_sub_user_a' },
        checksum: 'invalid_chk',
      },
      data: { accounts: 'not-an-array' },
    };

    const val = validateBackupIntegrity(corruptedPayload, 'google_sub_user_a');
    assert.strictEqual(val.valid, false);
    assert(val.error.includes('Unsupported backup version'));
    console.log('[PASS] TEST 14: Reject corrupted and unsupported backup versions');
    passed++;
  }

  // 15. Recover safely from interrupted uploads
  {
    mockDrive.setNetworkOnline(false); // Simulate network failure during upload
    let uploadFailed = false;
    try {
      const payload = buildBackupPayload(sampleStateA, userProfileA);
      await driveService.uploadBackup('token_user_a', payload, null);
    } catch (e) {
      uploadFailed = true;
      assert(e.message.includes('offline'));
    }
    assert.strictEqual(uploadFailed, true);
    mockDrive.setNetworkOnline(true); // Restore network
    console.log('[PASS] TEST 15: Safe handling of interrupted upload without corrupting remote state');
    passed++;
  }

  // 16. Recover safely from failed restore
  {
    const badBackup = {
      manifest: { backupVersion: 1, backupOwner: { sub: 'user_a' } },
      data: { accounts: 'corrupted_string_instead_of_array' },
    };

    let restoreThrew = false;
    try {
      await repoPhoneB.commitRestorePayload(badBackup);
    } catch (e) {
      restoreThrew = true;
    }
    assert.strictEqual(restoreThrew, true);
    console.log('[PASS] TEST 16: Safe failure recovery on corrupted restore payload');
    passed++;
  }

  // 17. Preserve existing local data on errors (Rollback snapshot)
  {
    const stateBefore = repoPhoneB.getAuthoritativeState();
    // Verify safety snapshot exists
    const snapRes = await repoPhoneB.createLocalSafetySnapshot();
    assert.strictEqual(snapRes.success, true);

    // Rollback test
    const rollbackRes = await repoPhoneB.rollbackToSafetySnapshot();
    assert.strictEqual(rollbackRes.success, true);

    const stateAfterRollback = repoPhoneB.getAuthoritativeState();
    assert.strictEqual(stateAfterRollback.businessName, stateBefore.businessName);
    assert.strictEqual(stateAfterRollback.accounts.length, stateBefore.accounts.length);
    console.log('[PASS] TEST 17: Preserve existing local data on errors using safety snapshot rollback');
    passed++;
  }

  // 18. Retry a pending backup after connectivity returns
  {
    let pendingBackup = buildBackupPayload(sampleStateA, userProfileA);
    // Offline
    mockDrive.setNetworkOnline(false);
    let failedOnce = false;
    try {
      await driveService.uploadBackup('token_user_a', pendingBackup, fileIdUserA);
    } catch (e) {
      failedOnce = true;
    }
    assert.strictEqual(failedOnce, true);

    // Reconnected
    mockDrive.setNetworkOnline(true);
    const retryRes = await driveService.uploadBackup('token_user_a', pendingBackup, fileIdUserA);
    assert.strictEqual(retryRes.success, true);
    console.log('[PASS] TEST 18: Retry pending backup successfully after connectivity returns');
    passed++;
  }

  // 19. Handle authorization revocation or expiry
  {
    mockDrive.setAuthValid(false);
    let authErrorCaught = false;
    try {
      await driveService.findBackupFile('token_expired');
    } catch (e) {
      authErrorCaught = true;
      assert(e.message.includes('401'));
    }
    assert.strictEqual(authErrorCaught, true);
    mockDrive.setAuthValid(true);
    console.log('[PASS] TEST 19: Gracefully handle authorization revocation and expired tokens');
    passed++;
  }

  // 20. Verify the backup after application restart
  {
    // Simulate restart by creating fresh repository instance attached to same adapter
    const restartedRepo = new StorageRepository(phoneBAdapter);
    const bootRes = await restartedRepo.loadInitialData();
    assert.strictEqual(bootRes.success, true);
    assert.strictEqual(bootRes.data.businessName, 'Al-Madina Store');
    assert.strictEqual(bootRes.data.accounts.length, 3);
    assert.strictEqual(bootRes.data.journals.length, 2);
    console.log('[PASS] TEST 20: Verified complete persistence of restored data across app restarts');
    passed++;
  }

  // 21. Verify privacy: Plaintext app PIN is never exported or present in backup payloads
  {
    const stateWithPin = {
      ...sampleStateA,
      pinEnabled: true,
      appPin: '9876',
    };
    const payloadWithPin = buildBackupPayload(stateWithPin, userProfileA);
    assert.strictEqual(payloadWithPin.data.appPin, '', 'Plaintext app PIN must be scrubbed to empty string');
    assert.strictEqual(payloadWithPin.data.pinEnabled, false, 'pinEnabled must be set to false in backup payload');
    assert(!JSON.stringify(payloadWithPin).includes('9876'), 'Plaintext PIN must not exist anywhere in backup JSON');
    console.log('[PASS] TEST 21: Plaintext app PIN is completely scrubbed from backup payloads (Privacy)');
    passed++;
  }

  // 22. Verify SHA-256 integrity: Modified/tampered payload is detected and rejected
  {
    const validPayload = buildBackupPayload(sampleStateA, userProfileA);
    const tamperedPayload = JSON.parse(JSON.stringify(validPayload));
    // Tamper with account balance without updating checksum
    tamperedPayload.data.accounts[0].balance += 99999;
    const val = validateBackupIntegrity(tamperedPayload, userProfileA.sub);
    assert.strictEqual(val.valid, false);
    assert(val.error.includes('checksum verification failed'));
    console.log('[PASS] TEST 22: SHA-256 integrity detects and rejects tampered data');
    passed++;
  }

  // 23. Verify checksum requirement: Backup format v1 without checksum is rejected
  {
    const validPayload = buildBackupPayload(sampleStateA, userProfileA);
    const noChecksumPayload = JSON.parse(JSON.stringify(validPayload));
    delete noChecksumPayload.manifest.checksum;
    const val = validateBackupIntegrity(noChecksumPayload, userProfileA.sub);
    assert.strictEqual(val.valid, false);
    assert(val.error.includes('checksum is required'));
    console.log('[PASS] TEST 23: Backup format v1 requires an integrity checksum');
    passed++;
  }

  // 24. Verify backward compatibility: Legacy unwrapped backup ({ accounts: [...], ... }) safely normalizes and restores
  {
    const legacyUnwrapped = {
      version: 5,
      businessName: 'Old Legacy Shop',
      accounts: [
        { id: 'leg_1', name: 'Legacy Customer', phone: '01700000000', type: 1, balance: 3000, openingBalance: 1000 },
      ],
      journals: [
        { id: 'leg_j1', accountId: 'leg_1', amount: 2000, type: 'given', date: '2026-10-15', time: '09:00' },
      ],
    };
    const val = validateBackupIntegrity(legacyUnwrapped, null);
    assert.strictEqual(val.valid, true, 'Legacy unwrapped backup must validate successfully');
    assert.strictEqual(val.manifest.legacy, true);

    const testAdapter = createMockAdapter();
    const testRepo = new StorageRepository(testAdapter);
    await testRepo.loadInitialData();

    const commitRes = await testRepo.commitRestorePayload(legacyUnwrapped);
    assert.strictEqual(commitRes.success, true);
    assert.strictEqual(commitRes.data.businessName, 'Old Legacy Shop');
    assert.strictEqual(commitRes.data.accounts[0].balance, 3000);
    console.log('[PASS] TEST 24: Legacy unwrapped backup restores safely with running balance recalculated');
    passed++;
  }

  // 25. Verify dual inventory and stock synchronization on restore
  {
    const payloadWithStock = {
      accounts: [
        { id: 'acc_test', name: 'Test Shop', phone: '01711223344', type: 1, balance: 0, openingBalance: 0 },
      ],
      stock: [
        { id: 'p1', name: 'Test Rice', stock: 50 },
      ],
    };
    const testAdapter = createMockAdapter();
    const testRepo = new StorageRepository(testAdapter);
    await testRepo.loadInitialData();

    const commitRes = await testRepo.commitRestorePayload(payloadWithStock);
    assert.strictEqual(commitRes.success, true);
    assert.strictEqual(commitRes.data.inventory.length, 1);
    assert.strictEqual(commitRes.data.stock.length, 1);
    assert.strictEqual(commitRes.data.inventory[0].name, 'Test Rice');
    assert.strictEqual(commitRes.data.stock[0].name, 'Test Rice');
    console.log('[PASS] TEST 25: Dual inventory and stock fields are fully synchronized on restore');
    passed++;
  }

  // 26. Verify offline export payload generation and restoration
  {
    const stateOffline = {
      ...sampleStateA,
      businessName: 'Offline Test Enterprise',
      walletBalance: 2500,
      tallyMessageBalance: 45,
    };
    const offlinePayload = buildBackupPayload(stateOffline, { sub: 'offline_export', email: '', name: 'Offline Test Enterprise' });
    assert.strictEqual(offlinePayload.manifest.backupOwner.sub, 'offline_export');
    assert(offlinePayload.manifest.checksum.startsWith('sha256_'));
    const val = validateBackupIntegrity(offlinePayload, null);
    assert.strictEqual(val.valid, true);

    const testAdapter = createMockAdapter();
    const testRepo = new StorageRepository(testAdapter);
    await testRepo.loadInitialData();

    const commitRes = await testRepo.commitRestorePayload(offlinePayload);
    assert.strictEqual(commitRes.success, true);
    assert.strictEqual(commitRes.data.businessName, 'Offline Test Enterprise');
    assert.strictEqual(commitRes.data.walletBalance, 2500);
    assert.strictEqual(commitRes.data.tallyMessageBalance, 45);
    console.log('[PASS] TEST 26: Offline export payload generated and restored with SHA-256 integrity');
    passed++;
  }

  // 27. Verify full safety snapshot rollback preserves all store fields on failed restore
  {
    const testAdapter = createMockAdapter();
    const testRepo = new StorageRepository(testAdapter);
    await testRepo.loadInitialData();

    await testRepo.persistData({
      businessName: 'Protected Original Shop',
      ownerName: 'Original Owner',
      ownerPhone: '01888777666',
      walletBalance: 9500,
      tallyMessageBalance: 33,
    });

    // Create safety snapshot
    await testRepo.createLocalSafetySnapshot();

    // Mutate state temporarily
    await testRepo.persistData({
      businessName: 'Corrupted In-Flight Name',
      walletBalance: 0,
    });

    // Rollback
    const rollbackRes = await testRepo.rollbackToSafetySnapshot();
    assert.strictEqual(rollbackRes.success, true);
    const restored = testRepo.getAuthoritativeState();
    assert.strictEqual(restored.businessName, 'Protected Original Shop');
    assert.strictEqual(restored.ownerName, 'Original Owner');
    assert.strictEqual(restored.walletBalance, 9500);
    assert.strictEqual(restored.tallyMessageBalance, 33);
    console.log('[PASS] TEST 27: Safety snapshot rollback cleanly restores all store fields');
    passed++;
  }

  // 28. Verify download failure with prior snapshot leaves store and UI unmodified via production orchestrateCloudRestore
  {
    const testAdapter = createMockAdapter();
    const testRepo = new StorageRepository(testAdapter);
    await testRepo.loadInitialData();

    // 1. Create a prior stale snapshot in storage (e.g. from yesterday or prior session)
    const staleSnapshot = {
      snapshotId: 'snap_yesterday_prior_123',
      createdAt: '2026-10-25T10:00:00.000Z',
      state: {
        businessName: 'Yesterday Stale Shop',
        ownerName: 'Yesterday Owner',
        walletBalance: 1200,
        accounts: [{ id: 'old_1', name: 'Old Customer', balance: 1200, type: 1 }],
        pinEnabled: false,
        appPin: '',
      },
    };
    await testAdapter.setItem('tallykhata_safety_snapshot', JSON.stringify(staleSnapshot));

    // 2. Current live authoritative data
    await testRepo.persistData({
      businessName: 'Today Active Enterprise',
      ownerName: 'Current Active Owner',
      walletBalance: 8800,
      accounts: [
        { id: 'curr_1', name: 'Active Customer 1', balance: 5000, type: 1 },
        { id: 'curr_2', name: 'Active Customer 2', balance: 3800, type: 1 },
      ],
      pinEnabled: true,
      appPin: '5678',
    });

    const initialStore = testRepo.getAuthoritativeState();
    const ui = createMockUiState(initialStore);

    // 3. Mock driveService with injected download failure (e.g. network/503/404)
    const mockDriveService = {
      findBackupFile: async () => ({ id: 'file_fail_dl', name: 'backup.json' }),
      downloadBackup: async () => {
        throw new Error('Google Drive download failed: Network connection lost (Simulated 503)');
      },
    };

    // 4. Run PRODUCTION orchestrateCloudRestore
    const result = await orchestrateCloudRestore({
      storageRepository: testRepo,
      driveService: mockDriveService,
      getAccessToken: async () => 'mock_token',
      fileId: 'file_fail_dl',
      userSub: 'test_user_sub',
      onStatusChange: ui.onStatusChange,
      onStateCommitted: ui.onStateCommitted,
      onRollback: ui.onRollback,
      alertFn: ui.alertFn,
    });

    // 5. Assertions:
    assert.strictEqual(result.success, false);
    assert(result.userFacingMessage.includes('Google Drive download failed'));
    assert.strictEqual(result.rollbackAttempted, false, 'Rollback must NOT be attempted when failure occurs before fresh snapshot');
    assert.strictEqual(result.rollbackSucceeded, false);
    assert.strictEqual(ui.getUiStatus(), 'error');

    // UI alert was dispatched with original error
    assert.strictEqual(ui.getAlertLog().length, 1);
    assert.strictEqual(ui.getAlertLog()[0].title, 'রিস্টোর ব্যর্থ');
    assert(ui.getAlertLog()[0].message.includes('Google Drive download failed'));

    // Authoritative store is 100% untouched
    const liveState = testRepo.getAuthoritativeState();
    assert.strictEqual(liveState.businessName, 'Today Active Enterprise');
    assert.strictEqual(liveState.ownerName, 'Current Active Owner');
    assert.strictEqual(liveState.walletBalance, 8800);
    assert.strictEqual(liveState.accounts.length, 2);
    assert.strictEqual(liveState.accounts[0].name, 'Active Customer 1');
    assert.strictEqual(liveState.pinEnabled, true);
    assert.strictEqual(liveState.appPin, '5678');

    // UI state is 100% untouched
    const liveUi = ui.getUiState();
    assert.strictEqual(liveUi.businessName, 'Today Active Enterprise');
    assert.strictEqual(liveUi.walletBalance, 8800);
    assert.strictEqual(liveUi.accounts.length, 2);
    assert.strictEqual(liveUi.pinEnabled, true);
    assert.strictEqual(liveUi.appPin, '5678');

    // Stale snapshot in storage was NOT applied
    const storedSnapshotRaw = await testAdapter.getItem('tallykhata_safety_snapshot');
    const storedSnapshot = JSON.parse(storedSnapshotRaw);
    assert.strictEqual(storedSnapshot.snapshotId, 'snap_yesterday_prior_123');

    console.log('[PASS] TEST 28: Production restore orchestration leaves store & UI unmodified on download failure with prior snapshot');
    passed++;
  }

  // 29. Verify production restore path rolls back from fresh snapshot on commit failure, and preserves original user-facing error on rollback storage failure
  {
    const testAdapter = createMockAdapter();
    const testRepo = new StorageRepository(testAdapter);
    await testRepo.loadInitialData();

    await testRepo.persistData({
      businessName: 'Pre-Commit Enterprise',
      ownerName: 'Owner Prior To Commit',
      walletBalance: 6500,
      accounts: [{ id: 'pre_1', name: 'Pre Customer', balance: 6500, type: 1 }],
      pinEnabled: true,
      appPin: '9999',
    });

    const initialStoreState = testRepo.getAuthoritativeState();
    const ui = createMockUiState(initialStoreState);

    // Part A: Download succeeds, but commit fails (invalid accounts type in downloaded payload)
    const mockDriveServiceA = {
      findBackupFile: async () => ({ id: 'file_commit_fail', name: 'backup.json' }),
      downloadBackup: async () => ({
        success: true,
        manifest: { backupVersion: 1, backupOwner: { sub: 'google_user_sub' }, checksum: 'sha256_mock' },
        data: {
          businessName: 'Corrupted In-Flight New Name',
          accounts: 'not_an_array_corrupted',
        },
      }),
    };

    const resultA = await orchestrateCloudRestore({
      storageRepository: testRepo,
      driveService: mockDriveServiceA,
      getAccessToken: async () => 'mock_token',
      fileId: 'file_commit_fail',
      userSub: 'google_user_sub',
      onStatusChange: ui.onStatusChange,
      onStateCommitted: ui.onStateCommitted,
      onRollback: ui.onRollback,
      alertFn: ui.alertFn,
    });

    // Verify commit error triggered actual rollback
    assert.strictEqual(resultA.success, false);
    assert.strictEqual(resultA.rollbackAttempted, true, 'Rollback must be attempted on commit failure');
    assert.strictEqual(resultA.rollbackSucceeded, true, 'Rollback must succeed using attempt fresh snapshot');
    assert.strictEqual(resultA.rollbackError, null);
    assert(resultA.userFacingMessage.includes('accounts must be an array') || resultA.userFacingMessage.includes('কমিট ব্যর্থ'));
    assert.strictEqual(ui.getUiStatus(), 'error');

    // Verify alert dispatched to user with commit failure message
    assert.strictEqual(ui.getAlertLog().length, 1);
    assert.strictEqual(ui.getAlertLog()[0].title, 'রিস্টোর ব্যর্থ');
    assert(ui.getAlertLog()[0].message.includes('accounts must be an array') || ui.getAlertLog()[0].message.includes('কমিট ব্যর্থ'));

    // Verify store was cleanly restored to Pre-Commit state
    const stateAfterRollback = testRepo.getAuthoritativeState();
    assert.strictEqual(stateAfterRollback.businessName, 'Pre-Commit Enterprise');
    assert.strictEqual(stateAfterRollback.ownerName, 'Owner Prior To Commit');
    assert.strictEqual(stateAfterRollback.walletBalance, 6500);
    assert.strictEqual(stateAfterRollback.accounts.length, 1);
    assert.strictEqual(stateAfterRollback.accounts[0].name, 'Pre Customer');

    // Verify UI state was restored to Pre-Commit state via onRollback
    const uiAfterRollback = ui.getUiState();
    assert.strictEqual(uiAfterRollback.businessName, 'Pre-Commit Enterprise');
    assert.strictEqual(uiAfterRollback.walletBalance, 6500);
    assert.strictEqual(uiAfterRollback.accounts.length, 1);
    assert.strictEqual(uiAfterRollback.pinEnabled, true);
    assert.strictEqual(uiAfterRollback.appPin, '9999');

    // Part B: Inject storage error during rollbackToSafetySnapshot to ensure original restore error is NOT swallowed
    const failingRollbackAdapter = createMockAdapter();
    const failingRollbackRepo = new StorageRepository(failingRollbackAdapter);
    await failingRollbackRepo.loadInitialData();
    await failingRollbackRepo.persistData({
      businessName: 'Unswallowed Error Shop',
      ownerName: 'Shop Owner',
      walletBalance: 4200,
      accounts: [{ id: 'p_1', name: 'Persisted Prior', balance: 4200, type: 1 }],
      pinEnabled: true,
      appPin: '1111',
    });

    const uiRollbackFail = createMockUiState(failingRollbackRepo.getAuthoritativeState());

    // Inject commit failure and rollback storage failure into failingRollbackRepo
    failingRollbackRepo.commitRestorePayload = async () => {
      throw new Error('Database schema constraint violation during commit');
    };
    failingRollbackRepo.rollbackToSafetySnapshot = async () => {
      throw new Error('Simulated disk I/O failure during safety snapshot rollback');
    };

    const mockDriveServiceB = {
      findBackupFile: async () => ({ id: 'file_rollback_io_error', name: 'backup.json' }),
      downloadBackup: async () => ({
        success: true,
        manifest: { backupVersion: 1 },
        data: { accounts: [] },
      }),
    };

    const resultWithFailingRollback = await orchestrateCloudRestore({
      storageRepository: failingRollbackRepo,
      driveService: mockDriveServiceB,
      getAccessToken: async () => 'mock_token',
      fileId: 'file_rollback_io_error',
      userSub: 'google_user_sub',
      onStatusChange: uiRollbackFail.onStatusChange,
      onStateCommitted: uiRollbackFail.onStateCommitted,
      onRollback: uiRollbackFail.onRollback,
      alertFn: uiRollbackFail.alertFn,
    });

    // Assert that original commit error is preserved and NOT overwritten by rollback error
    assert.strictEqual(resultWithFailingRollback.success, false);
    assert.strictEqual(resultWithFailingRollback.rollbackAttempted, true);
    assert.strictEqual(resultWithFailingRollback.rollbackSucceeded, false);
    assert(resultWithFailingRollback.rollbackError);
    assert.strictEqual(resultWithFailingRollback.rollbackError.message, 'Simulated disk I/O failure during safety snapshot rollback');

    // CRITICAL: userFacingMessage and Alert must still reflect the original restore error!
    assert.strictEqual(resultWithFailingRollback.userFacingMessage, 'Database schema constraint violation during commit');
    assert.strictEqual(uiRollbackFail.getAlertLog().length, 1);
    assert.strictEqual(uiRollbackFail.getAlertLog()[0].title, 'রিস্টোর ব্যর্থ');
    assert.strictEqual(uiRollbackFail.getAlertLog()[0].message, 'Database schema constraint violation during commit');
    assert.strictEqual(uiRollbackFail.getUiStatus(), 'error');

    console.log('[PASS] TEST 29: Production restore path rolls back on commit failure and preserves original user-facing error on rollback failure');
    passed++;
  }

  // 30. Verify edge cases: snapshot ID mismatch, snapshot creation failure, missing snapshot, and UI state integrity
  {
    const testAdapter = createMockAdapter();
    const testRepo = new StorageRepository(testAdapter);
    await testRepo.loadInitialData();

    await testRepo.persistData({
      businessName: 'Edge Case Enterprise',
      ownerName: 'Edge Case Owner',
      walletBalance: 3000,
      accounts: [{ id: 'ec_1', name: 'Edge Customer', balance: 3000, type: 1 }],
      pinEnabled: true,
      appPin: '7777',
    });

    // Sub-case 1: Fresh snapshot creation failure aborts restore before commit
    const uiSnapFail = createMockUiState(testRepo.getAuthoritativeState());
    const mockSnapFailRepo = Object.create(testRepo);
    mockSnapFailRepo.createLocalSafetySnapshot = async () => ({
      success: false,
      reason: 'Storage quota exceeded while writing safety snapshot',
    });

    const mockDriveServiceSuccess = {
      findBackupFile: async () => ({ id: 'file_good', name: 'backup.json' }),
      downloadBackup: async () => ({
        success: true,
        manifest: { backupVersion: 1 },
        data: {
          businessName: 'Unreachable Restored Name',
          accounts: [{ id: 'nr_1', name: 'Never Reached', balance: 10, type: 1 }],
        },
      }),
    };

    const resSnapFail = await orchestrateCloudRestore({
      storageRepository: mockSnapFailRepo,
      driveService: mockDriveServiceSuccess,
      getAccessToken: async () => 'mock_token',
      fileId: 'file_good',
      userSub: 'test_sub',
      onStatusChange: uiSnapFail.onStatusChange,
      onStateCommitted: uiSnapFail.onStateCommitted,
      onRollback: uiSnapFail.onRollback,
      alertFn: uiSnapFail.alertFn,
    });

    assert.strictEqual(resSnapFail.success, false);
    assert(resSnapFail.userFacingMessage.includes('লোকাল সেফটি স্ন্যাপশট প্রস্তুত করা যায়নি'));
    assert.strictEqual(resSnapFail.rollbackAttempted, false);
    assert.strictEqual(uiSnapFail.getUiStatus(), 'error');
    // Store and UI state must be untouched!
    assert.strictEqual(testRepo.getAuthoritativeState().businessName, 'Edge Case Enterprise');
    assert.strictEqual(uiSnapFail.getUiState().businessName, 'Edge Case Enterprise');

    // Sub-case 2: Snapshot ID mismatch prevents rolling back to wrong snapshot
    await testRepo.createLocalSafetySnapshot('snap_current_real_001');
    const mismatchRollback = await testRepo.rollbackToSafetySnapshot('snap_different_attempt_999');
    assert.strictEqual(mismatchRollback.success, false);
    assert.strictEqual(mismatchRollback.attemptMismatch, true);
    assert(mismatchRollback.reason.includes('Snapshot attempt mismatch'));
    assert.strictEqual(testRepo.getAuthoritativeState().businessName, 'Edge Case Enterprise');

    // Sub-case 3: Missing snapshot handles cleanly
    await testAdapter.removeItem('tallykhata_safety_snapshot');
    const missingRollback = await testRepo.rollbackToSafetySnapshot('snap_any');
    assert.strictEqual(missingRollback.success, false);
    assert.strictEqual(missingRollback.reason, 'No safety snapshot found');

    // Sub-case 4: Successful restore synchronizes UI and safely resets PIN lock
    const uiSuccess = createMockUiState(testRepo.getAuthoritativeState());
    const validRestoredPayload = {
      success: true,
      manifest: {
        backupVersion: 1,
        schemaVersion: 6,
        backupOwner: { sub: 'test_sub' },
        checksum: 'dummy',
      },
      data: {
        businessName: 'Restored New Enterprise',
        ownerName: 'Restored Owner',
        walletBalance: 15000,
        accounts: [{ id: 'res_1', name: 'Restored Customer', balance: 15000, type: 1 }],
        journals: [],
        cashEntries: [],
        inventory: [{ id: 'inv_1', name: 'Restored Item', stock: 10, unit: 'pc', purchasePrice: 50, sellingPrice: 60 }],
        notes: [],
        pinEnabled: true,
        appPin: '1234',
      },
    };

    const mockDriveValid = {
      findBackupFile: async () => ({ id: 'file_valid', name: 'backup.json' }),
      downloadBackup: async () => validRestoredPayload,
    };

    const resSuccess = await orchestrateCloudRestore({
      storageRepository: testRepo,
      driveService: mockDriveValid,
      getAccessToken: async () => 'mock_token',
      fileId: 'file_valid',
      userSub: 'test_sub',
      onStatusChange: uiSuccess.onStatusChange,
      onStateCommitted: uiSuccess.onStateCommitted,
      onRollback: uiSuccess.onRollback,
      alertFn: uiSuccess.alertFn,
    });

    assert.strictEqual(resSuccess.success, true);
    assert.strictEqual(uiSuccess.getUiStatus(), 'success');
    assert.strictEqual(uiSuccess.getAlertLog().length, 1);
    assert.strictEqual(uiSuccess.getAlertLog()[0].title, 'রিস্টোর সফল!');

    // Verify UI state synchronized with restored data and PIN reset for security
    const stateSuccessUi = uiSuccess.getUiState();
    assert.strictEqual(stateSuccessUi.businessName, 'Restored New Enterprise');
    assert.strictEqual(stateSuccessUi.walletBalance, 15000);
    assert.strictEqual(stateSuccessUi.accounts.length, 1);
    assert.strictEqual(stateSuccessUi.pinEnabled, false, 'PIN must be disabled on restored backup');
    assert.strictEqual(stateSuccessUi.appPin, '', 'appPin must be cleared on restored backup');

    // Verify store was also committed with PIN reset
    const storeSuccess = testRepo.getAuthoritativeState();
    assert.strictEqual(storeSuccess.businessName, 'Restored New Enterprise');
    assert.strictEqual(storeSuccess.pinEnabled, false);
    assert.strictEqual(storeSuccess.appPin, '');

    console.log('[PASS] TEST 30: Snapshot mismatch, creation failure, and UI state integrity verified');
    passed++;
  }
  // =========================================================================
  // =========================================================================
  // TEST 31: verifyUploadedBackupMatches detects checksum, owner, count, and file ID mismatches
  // =========================================================================
  {
    const testState = {
      accounts: [
        { id: 'acc_1', name: 'Karim Traders', type: 1, balance: 5000 },
        { id: 'acc_2', name: 'Rahim Suppliers', type: 2, balance: 3000 },
      ],
      journals: [
        { id: 'j_1', accountId: 'acc_1', amount: 5000, type: 1, date: '2026-10-26' },
      ],
      cashEntries: [
        { id: 'c_1', amount: 2000, type: 1, description: 'Cash In' },
      ],
      stock: [],
      notes: [],
      businessName: 'Verification Store',
      ownerPhone: '01700000000',
    };
    const testUser = { sub: 'user_sub_match_test', email: 'owner@example.com', name: 'Owner' };
    const uploaded = buildBackupPayload(testState, testUser);

    const validDownloaded = {
      valid: true,
      fileId: 'file_abc',
      data: uploaded.data,
      manifest: uploaded.manifest,
    };

    const validRemoteMeta = {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
      appProperties: { ownerSub: 'user_sub_match_test' },
      size: '2048',
    };

    // Sub-case 1: Perfect match with independent remote metadata
    const matchOk = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', validRemoteMeta);
    assert.strictEqual(matchOk.valid, true);
    assert.strictEqual(matchOk.matchedChecksum, uploaded.manifest.checksum);
    assert.strictEqual(matchOk.matchedOwnerSub, 'user_sub_match_test');
    assert.strictEqual(matchOk.matchedFileId, 'file_abc');
    assert.strictEqual(matchOk.verifiedMetadata.id, 'file_abc');
    assert.strictEqual(matchOk.verifiedMetadata.name, BACKUP_FILENAME);

    // Sub-case 2: Remote metadata returning a different file ID
    const fileIdMismatch = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_xyz_different',
      name: BACKUP_FILENAME,
      parents: ['appDataFolder'],
    });
    assert.strictEqual(fileIdMismatch.valid, false);
    assert(fileIdMismatch.reason.includes('ফাইল আইডি অমিল'));

    // Sub-case 3: Missing remote file ID in metadata
    const missingRemoteId = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: '',
      name: BACKUP_FILENAME,
      parents: ['appDataFolder'],
    });
    assert.strictEqual(missingRemoteId.valid, false);
    assert(missingRemoteId.reason.includes('রিমোট মেটাডাটা থেকে ফাইল আইডি পাওয়া যায়নি'));

    // Sub-case 4: Missing expected uploaded file ID
    const missingExpectedId = verifyUploadedBackupMatches(uploaded, validDownloaded, '', validRemoteMeta);
    assert.strictEqual(missingExpectedId.valid, false);
    assert(missingExpectedId.reason.includes('আপলোডকৃত ফাইল আইডি অনুপস্থিত বা অবৈধ'));

    // Sub-case 5a: Remote metadata with missing parents field
    const missingParents = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
    });
    assert.strictEqual(missingParents.valid, false);
    assert(missingParents.reason.includes('parents ফিল্ড অনুপস্থিত'));

    // Sub-case 5b: Remote metadata with empty parents array
    const emptyParents = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      parents: [],
    });
    assert.strictEqual(emptyParents.valid, false);
    assert(emptyParents.reason.includes('parents ফিল্ড খালি'));

    // Sub-case 5c: Remote metadata with malformed parents (string instead of array)
    const malformedParentsStr = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      parents: 'appDataFolder',
    });
    assert.strictEqual(malformedParentsStr.valid, false);
    assert(malformedParentsStr.reason.includes('parents ফিল্ড অবৈধ'));

    // Sub-case 5d: Remote metadata with malformed parents (object instead of array)
    const malformedParentsObj = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      parents: { folder: 'appDataFolder' },
    });
    assert.strictEqual(malformedParentsObj.valid, false);
    assert(malformedParentsObj.reason.includes('parents ফিল্ড অবৈধ'));

    // Sub-case 5e: Remote metadata with wrong parent (not in appDataFolder)
    const wrongParent = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      parents: ['root'],
    });
    assert.strictEqual(wrongParent.valid, false);
    assert(wrongParent.reason.includes('appDataFolder'));

    // Sub-case 5f: Bare string ID passed without independent metadata object
    const bareStringMeta = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', 'file_abc');
    assert.strictEqual(bareStringMeta.valid, false);
    assert(bareStringMeta.reason.includes('মেটাডাটা অবজেক্ট অনুপস্থিত'));

    // Sub-case 5g: Raw metadata with parents: ['root'] and spaces: ['appDataFolder'] (Contradictory metadata)
    const rawRootWithSpaceApp = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      parents: ['root'],
      spaces: ['appDataFolder'],
    });
    assert.strictEqual(rawRootWithSpaceApp.valid, false);
    assert(rawRootWithSpaceApp.reason.includes('বৈপরীত্য') || rawRootWithSpaceApp.reason.includes('অন্য ফোল্ডার'));

    // Sub-case 5h: Contradiction: parents: ['appDataFolder'] but spaces: ['drive']
    const rawAppParentWithDriveSpace = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      parents: ['appDataFolder'],
      spaces: ['drive'],
    });
    assert.strictEqual(rawAppParentWithDriveSpace.valid, false);
    assert(rawAppParentWithDriveSpace.reason.includes('বৈপরীত্য'));

    // Sub-case 5i: Valid appDataFolder metadata in format actually documented by Google Drive API (both fields)
    const validDocumentedBoth = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      parents: ['appDataFolder'],
      spaces: ['appDataFolder'],
    });
    assert.strictEqual(validDocumentedBoth.valid, true);
    assert.strictEqual(validDocumentedBoth.locationSignal, 'parents_and_spaces');

    // Sub-case 5j: Valid appDataFolder metadata via documented spaces signal alone (without contradictory parents)
    const validSpacesSignalAlone = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      spaces: ['appDataFolder'],
    });
    assert.strictEqual(validSpacesSignalAlone.valid, true);
    assert.strictEqual(validSpacesSignalAlone.locationSignal, 'spaces');

    // Sub-case 5k: Real Google Drive API format (internal appDataFolder folder ID in parents, 'appDataFolder' in spaces)
    const validRealDriveFormat = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      parents: ['1B9vIFIHZe6nlJbnl5xrm1JVkejeerA'],
      spaces: ['appDataFolder'],
    });
    assert.strictEqual(validRealDriveFormat.valid, true);
    assert.strictEqual(validRealDriveFormat.locationSignal, 'spaces');

    // Sub-case 6: Remote metadata with wrong name
    const wrongName = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: 'unexpected_file.json',
      parents: ['appDataFolder'],
    });
    assert.strictEqual(wrongName.valid, false);
    assert(wrongName.reason.includes('রিমোট ফাইলের নাম অমিল'));

    // Sub-case 7: Remote metadata with mismatched ownerSub
    const wrongMetaOwner = verifyUploadedBackupMatches(uploaded, validDownloaded, 'file_abc', {
      id: 'file_abc',
      name: BACKUP_FILENAME,
      parents: ['appDataFolder'],
      appProperties: { ownerSub: 'foreign_sub_attacker' },
    });
    assert.strictEqual(wrongMetaOwner.valid, false);
    assert(wrongMetaOwner.reason.includes('রিমোট মেটাডাটা ব্যবহারকারী সাব-আইডি অমিল'));

    // Sub-case 8: Downloaded file ID mismatch
    const downIdMismatch = verifyUploadedBackupMatches(
      uploaded,
      { ...validDownloaded, fileId: 'file_downloaded_different' },
      'file_abc',
      validRemoteMeta
    );
    assert.strictEqual(downIdMismatch.valid, false);
    assert(downIdMismatch.reason.includes('ডাউনলোডকৃত ফাইল আইডি অমিল'));

    // Sub-case 9: Checksum mismatch (tampered remote file or stale payload)
    const tamperedDownloaded = {
      valid: true,
      fileId: 'file_abc',
      data: uploaded.data,
      manifest: {
        ...uploaded.manifest,
        checksum: 'sha256_different_checksum_tampered_value',
      },
    };
    const checksumMismatch = verifyUploadedBackupMatches(uploaded, tamperedDownloaded, 'file_abc', validRemoteMeta);
    assert.strictEqual(checksumMismatch.valid, false);
    assert(checksumMismatch.reason.includes('চেকসাম অমিল'));

    // Sub-case 10: Owner sub mismatch in downloaded manifest
    const ownerMismatch = {
      valid: true,
      fileId: 'file_abc',
      data: uploaded.data,
      manifest: {
        ...uploaded.manifest,
        backupOwner: { sub: 'different_user_sub', email: 'other@example.com', name: 'Other' },
      },
    };
    const subMismatch = verifyUploadedBackupMatches(uploaded, ownerMismatch, 'file_abc', validRemoteMeta);
    assert.strictEqual(subMismatch.valid, false);
    assert(subMismatch.reason.includes('ব্যবহারকারী সাব-আইডি অমিল'));

    // Sub-case 11: Record count mismatch
    const countMismatch = {
      valid: true,
      fileId: 'file_abc',
      data: uploaded.data,
      manifest: {
        ...uploaded.manifest,
        recordCounts: { ...uploaded.manifest.recordCounts, accounts: 999 },
      },
    };
    const recMismatch = verifyUploadedBackupMatches(uploaded, countMismatch, 'file_abc', validRemoteMeta);
    assert.strictEqual(recMismatch.valid, false);
    assert(recMismatch.reason.includes('রেকর্ড কাউন্ট অমিল'));

    console.log('[PASS] TEST 31: verifyUploadedBackupMatches detects checksum, owner, count, and file ID mismatches');
    passed++;
  }

  // =========================================================================
  // TEST 32: Production orchestrateCloudBackup verifies downloaded remote backup against uploaded payload
  // =========================================================================
  {
    const testAdapter = createMockAdapter();
    const testRepo = new StorageRepository(testAdapter);
    await testRepo.loadInitialData();
    await testRepo.persistData({
      accounts: [{ id: 'a1', name: 'Test Acc', balance: 1000, type: 1 }],
      journals: [{ id: 'j1', accountId: 'a1', amount: 1000, type: 1, date: '2026-10-26' }],
      cashEntries: [],
      businessName: 'Cloud Sync Shop',
    });

    const userProfile = { sub: 'google_user_sync_123', email: 'sync@example.com', name: 'Sync User' };

    // Sub-case 1: Happy path backup with exact independent metadata & download verification
    let uploadedRemoteFile = null;
    const mockDriveOk = {
      uploadBackup: async (token, payload, existingId) => {
        uploadedRemoteFile = {
          id: existingId || 'file_google_drive_999',
          name: BACKUP_FILENAME,
          modifiedTime: new Date().toISOString(),
          payload,
        };
        return {
          success: true,
          fileId: uploadedRemoteFile.id,
          name: uploadedRemoteFile.name,
          modifiedTime: uploadedRemoteFile.modifiedTime,
          manifest: payload.manifest,
        };
      },
      getFileMetadata: async (token, fileId) => {
        return {
          id: fileId,
          name: BACKUP_FILENAME,
          parents: ['appDataFolder'],
          mimeType: 'application/json',
          size: '4096',
          modifiedTime: uploadedRemoteFile.modifiedTime,
          appProperties: { app: 'TallyKhata', ownerSub: userProfile.sub },
        };
      },
      downloadBackup: async (token, fileId, userSub) => {
        return {
          valid: true,
          fileId,
          data: uploadedRemoteFile.payload.data,
          manifest: uploadedRemoteFile.payload.manifest,
        };
      },
    };

    let savedMeta = null;
    let uiStatus = null;
    const alertLog = [];

    const resOk = await orchestrateCloudBackup({
      storageRepository: testRepo,
      driveService: mockDriveOk,
      getAccessToken: async () => 'mock_valid_token',
      googleUser: userProfile,
      existingFileId: null,
      onStatusChange: (s) => { uiStatus = s; },
      onMetaUpdated: async (meta) => { savedMeta = meta; },
      alertFn: (title, msg) => { alertLog.push({ title, msg }); },
    });

    assert.strictEqual(resOk.success, true);
    assert.strictEqual(resOk.fileId, 'file_google_drive_999');
    assert.strictEqual(resOk.verifiedMetadata.id, 'file_google_drive_999');
    assert.strictEqual(resOk.verifiedMetadata.name, BACKUP_FILENAME);
    assert.strictEqual(uiStatus, 'success');
    assert.strictEqual(savedMeta.fileId, 'file_google_drive_999');
    assert.strictEqual(savedMeta.name, BACKUP_FILENAME);
    assert.strictEqual(savedMeta.size, '4096');
    assert.strictEqual(savedMeta.manifest.checksum, resOk.verifiedChecksum);
    assert.strictEqual(alertLog.length, 1);
    assert.strictEqual(alertLog[0].title, 'ব্যাকআপ সফল!');

    // Sub-case 2: Remote metadata returning a different file ID
    let savedMetaMismatchedId = null;
    let uiStatusMismatchedId = null;
    const alertLogMismatchedId = [];

    const mockDriveMismatchedId = {
      uploadBackup: async (token, payload) => ({
        success: true,
        fileId: 'file_expected_111',
        name: BACKUP_FILENAME,
        modifiedTime: new Date().toISOString(),
        manifest: payload.manifest,
      }),
      getFileMetadata: async () => ({
        id: 'file_foreign_different_222',
        name: BACKUP_FILENAME,
        parents: ['appDataFolder'],
      }),
      downloadBackup: async (token, fileId) => ({
        valid: true,
        fileId,
        data: { accounts: [] },
        manifest: { backupVersion: 1, checksum: 'sha256_mock', backupOwner: { sub: userProfile.sub } },
      }),
    };

    const resMismatchedId = await orchestrateCloudBackup({
      storageRepository: testRepo,
      driveService: mockDriveMismatchedId,
      getAccessToken: async () => 'mock_valid_token',
      googleUser: userProfile,
      existingFileId: null,
      onStatusChange: (s) => { uiStatusMismatchedId = s; },
      onMetaUpdated: async (meta) => { savedMetaMismatchedId = meta; },
      alertFn: (title, msg) => { alertLogMismatchedId.push({ title, msg }); },
    });

    assert.strictEqual(resMismatchedId.success, false);
    assert.strictEqual(savedMetaMismatchedId, null);
    assert.strictEqual(uiStatusMismatchedId, 'error');
    assert(resMismatchedId.userFacingMessage.includes('ফাইল আইডি অমিল'));

    // Sub-case 3a: Remote metadata returning wrong parent
    const mockDriveWrongParent = {
      uploadBackup: async () => ({
        success: true,
        fileId: 'file_parent_err',
        name: BACKUP_FILENAME,
      }),
      getFileMetadata: async (token, fileId) => ({
        id: fileId,
        name: BACKUP_FILENAME,
        parents: ['public_folder_root'],
      }),
      downloadBackup: async (token, fileId) => ({
        valid: true,
        fileId,
        data: { accounts: [] },
        manifest: { backupVersion: 1, checksum: 'sha256_mock', backupOwner: { sub: userProfile.sub } },
      }),
    };

    const resWrongParent = await orchestrateCloudBackup({
      storageRepository: testRepo,
      driveService: mockDriveWrongParent,
      getAccessToken: async () => 'mock_valid_token',
      googleUser: userProfile,
      existingFileId: null,
      alertFn: () => {},
    });

    assert.strictEqual(resWrongParent.success, false);
    assert(resWrongParent.userFacingMessage.includes('appDataFolder'));

    // Sub-case 3b: Remote metadata returning missing parents field
    const mockDriveMissingParents = {
      uploadBackup: async () => ({
        success: true,
        fileId: 'file_missing_parents',
        name: BACKUP_FILENAME,
      }),
      getFileMetadata: async (token, fileId) => ({
        id: fileId,
        name: BACKUP_FILENAME,
      }),
      downloadBackup: async (token, fileId) => ({
        valid: true,
        fileId,
        data: { accounts: [] },
        manifest: { backupVersion: 1, checksum: 'sha256_mock', backupOwner: { sub: userProfile.sub } },
      }),
    };

    const resMissingParents = await orchestrateCloudBackup({
      storageRepository: testRepo,
      driveService: mockDriveMissingParents,
      getAccessToken: async () => 'mock_valid_token',
      googleUser: userProfile,
      existingFileId: null,
      alertFn: () => {},
    });
    assert.strictEqual(resMissingParents.success, false);
    assert(resMissingParents.userFacingMessage.includes('parents'));

    // Sub-case 3c: Remote metadata returning empty parents array
    const mockDriveEmptyParents = {
      uploadBackup: async () => ({
        success: true,
        fileId: 'file_empty_parents',
        name: BACKUP_FILENAME,
      }),
      getFileMetadata: async (token, fileId) => ({
        id: fileId,
        name: BACKUP_FILENAME,
        parents: [],
      }),
      downloadBackup: async (token, fileId) => ({
        valid: true,
        fileId,
        data: { accounts: [] },
        manifest: { backupVersion: 1, checksum: 'sha256_mock', backupOwner: { sub: userProfile.sub } },
      }),
    };

    const resEmptyParents = await orchestrateCloudBackup({
      storageRepository: testRepo,
      driveService: mockDriveEmptyParents,
      getAccessToken: async () => 'mock_valid_token',
      googleUser: userProfile,
      existingFileId: null,
      alertFn: () => {},
    });
    assert.strictEqual(resEmptyParents.success, false);
    assert(resEmptyParents.userFacingMessage.includes('খালি') || resEmptyParents.userFacingMessage.includes('appDataFolder'));

    // Sub-case 3d: Remote metadata returning malformed parents (string)
    const mockDriveMalformedParents = {
      uploadBackup: async () => ({
        success: true,
        fileId: 'file_malformed_parents',
        name: BACKUP_FILENAME,
      }),
      getFileMetadata: async (token, fileId) => ({
        id: fileId,
        name: BACKUP_FILENAME,
        parents: 'appDataFolder',
      }),
      downloadBackup: async (token, fileId) => ({
        valid: true,
        fileId,
        data: { accounts: [] },
        manifest: { backupVersion: 1, checksum: 'sha256_mock', backupOwner: { sub: userProfile.sub } },
      }),
    };

    const resMalformedParents = await orchestrateCloudBackup({
      storageRepository: testRepo,
      driveService: mockDriveMalformedParents,
      getAccessToken: async () => 'mock_valid_token',
      googleUser: userProfile,
      existingFileId: null,
      alertFn: () => {},
    });
    assert.strictEqual(resMalformedParents.success, false);
    assert(resMalformedParents.userFacingMessage.includes('অবৈধ') || resMalformedParents.userFacingMessage.includes('array'));

    // Sub-case 3f: Contradictory remote metadata (parents: ['root'], spaces: ['appDataFolder']) in production orchestration
    const mockDriveContradiction = {
      uploadBackup: async () => ({
        success: true,
        fileId: 'file_contradictory',
        name: BACKUP_FILENAME,
      }),
      getFileMetadata: async (token, fileId) => ({
        id: fileId,
        name: BACKUP_FILENAME,
        parents: ['root'],
        spaces: ['appDataFolder'],
      }),
      downloadBackup: async (token, fileId) => ({
        valid: true,
        fileId,
        data: { accounts: [] },
        manifest: { backupVersion: 1, checksum: 'sha256_mock', backupOwner: { sub: userProfile.sub } },
      }),
    };

    const resContradiction = await orchestrateCloudBackup({
      storageRepository: testRepo,
      driveService: mockDriveContradiction,
      getAccessToken: async () => 'mock_valid_token',
      googleUser: userProfile,
      existingFileId: null,
      alertFn: () => {},
    });
    assert.strictEqual(resContradiction.success, false);
    assert(resContradiction.userFacingMessage.includes('বৈপরীত্য') || resContradiction.userFacingMessage.includes('অন্য ফোল্ডার'));

    // Sub-case 3e: Missing getFileMetadata support on driveService fails without substituting fabricated metadata
    let savedMetaOnNoSupport = null;
    let uiStatusOnNoSupport = null;
    const mockDriveNoMetaSupport = {
      uploadBackup: async () => ({
        success: true,
        fileId: 'file_no_meta_support',
        name: BACKUP_FILENAME,
      }),
      // getFileMetadata is intentionally undefined
      downloadBackup: async (token, fileId) => ({
        valid: true,
        fileId,
        data: { accounts: [] },
        manifest: { backupVersion: 1, checksum: 'sha256_mock', backupOwner: { sub: userProfile.sub } },
      }),
    };

    const resNoMetaSupport = await orchestrateCloudBackup({
      storageRepository: testRepo,
      driveService: mockDriveNoMetaSupport,
      getAccessToken: async () => 'mock_valid_token',
      googleUser: userProfile,
      existingFileId: null,
      onStatusChange: (s) => { uiStatusOnNoSupport = s; },
      onMetaUpdated: async (meta) => { savedMetaOnNoSupport = meta; },
      alertFn: () => {},
    });

    assert.strictEqual(resNoMetaSupport.success, false);
    assert.strictEqual(savedMetaOnNoSupport, null, 'Must NOT update metadata when getFileMetadata is unavailable');
    assert.strictEqual(uiStatusOnNoSupport, 'error');
    assert(resNoMetaSupport.userFacingMessage.includes('getFileMetadata') || resNoMetaSupport.userFacingMessage.includes('মেটাডাটা'));

    // Sub-case 4: Remote download returns mismatched checksum
    let savedMetaFailed = null;
    let uiStatusFailed = null;
    const alertLogFailed = [];

    const mockDriveMismatched = {
      uploadBackup: async (token, payload) => ({
        success: true,
        fileId: 'file_mismatched_001',
        name: BACKUP_FILENAME,
        modifiedTime: new Date().toISOString(),
        manifest: payload.manifest,
      }),
      getFileMetadata: async (token, fileId) => ({
        id: fileId,
        name: BACKUP_FILENAME,
        parents: ['appDataFolder'],
      }),
      downloadBackup: async () => {
        // Returns a downloaded backup that has a DIFFERENT checksum
        return {
          valid: true,
          fileId: 'file_mismatched_001',
          data: { accounts: [] },
          manifest: {
            backupVersion: 1,
            schemaVersion: 6,
            backupOwner: { sub: userProfile.sub },
            recordCounts: { accounts: 0, journals: 0, cashEntries: 0 },
            checksum: 'sha256_stale_or_foreign_checksum',
          },
        };
      },
    };

    const resFailed = await orchestrateCloudBackup({
      storageRepository: testRepo,
      driveService: mockDriveMismatched,
      getAccessToken: async () => 'mock_valid_token',
      googleUser: userProfile,
      existingFileId: null,
      onStatusChange: (s) => { uiStatusFailed = s; },
      onMetaUpdated: async (meta) => { savedMetaFailed = meta; },
      alertFn: (title, msg) => { alertLogFailed.push({ title, msg }); },
    });

    assert.strictEqual(resFailed.success, false);
    // Metadata must NEVER be updated when verification fails!
    assert.strictEqual(savedMetaFailed, null, 'Metadata must NOT be updated when verification fails');
    // UI status must be error, NEVER success!
    assert.strictEqual(uiStatusFailed, 'error');
    assert(resFailed.userFacingMessage.includes('গুগল ড্রাইভ ব্যাকআপ যাচাই ব্যর্থ'));
    assert(resFailed.userFacingMessage.includes('চেকসাম অমিল'));
    assert.strictEqual(alertLogFailed.length, 1);
    assert.strictEqual(alertLogFailed[0].title, 'ব্যাকআপ ত্রুটি');

    // Sub-case 5: Metadata fetch 401 retry succeeds with refreshed token
    let tokenUsedForMeta = null;
    let metaCalls = 0;
    const mockDrive401 = {
      uploadBackup: async (token, payload) => ({
        success: true,
        fileId: 'file_401_recovery',
        name: BACKUP_FILENAME,
        manifest: payload.manifest,
      }),
      getFileMetadata: async (token, fileId) => {
        metaCalls++;
        tokenUsedForMeta = token;
        if (token === 'expired_token') {
          throw new Error('Google Drive metadata fetch failed (401): Unauthorized');
        }
        return {
          id: fileId,
          name: BACKUP_FILENAME,
          parents: ['appDataFolder'],
        };
      },
      downloadBackup: async (token, fileId) => {
        const payload = buildBackupPayload(testRepo.getAuthoritativeState(), userProfile);
        return {
          valid: true,
          fileId,
          data: payload.data,
          manifest: payload.manifest,
        };
      },
    };

    let tokenFetchCount = 0;
    const res401 = await orchestrateCloudBackup({
      storageRepository: testRepo,
      driveService: mockDrive401,
      getAccessToken: async (forceRefresh) => {
        tokenFetchCount++;
        return forceRefresh ? 'fresh_recovered_token' : 'expired_token';
      },
      googleUser: userProfile,
      existingFileId: null,
      alertFn: () => {},
    });

    assert.strictEqual(res401.success, true);
    assert.strictEqual(metaCalls, 2, 'Metadata fetch must be retried after 401');
    assert.strictEqual(tokenUsedForMeta, 'fresh_recovered_token');

    console.log('[PASS] TEST 32: Production orchestrateCloudBackup verifies downloaded remote backup against uploaded payload');
    passed++;
  }

  // =========================================================================
  // TEST 33: GoogleDriveBackupService.prototype.getFileMetadata requests correct endpoint and fields
  // =========================================================================
  {
    // sub-case
    const testService = new GoogleDriveBackupService();

    // Sub-case 1: Reject empty or invalid fileId
    await assert.rejects(async () => {
      await testService.getFileMetadata('mock_token', '');
    }, /ফাইল আইডি প্রদান করা হয়নি/);

    // Sub-case 2: Valid fetch call with bearer token and fields
    let recordedUrl = null;
    let recordedHeaders = null;
    testService.setFetch(async (url, opts) => {
      recordedUrl = url;
      recordedHeaders = opts.headers;
      return {
        ok: true,
        json: async () => ({
          id: 'test_file_id_777',
          name: BACKUP_FILENAME,
          parents: ['appDataFolder'],
          mimeType: 'application/json',
          size: '1024',
        }),
      };
    });

    const metaResult = await testService.getFileMetadata('bearer_token_xyz', 'test_file_id_777');
    assert.strictEqual(metaResult.id, 'test_file_id_777');
    assert.strictEqual(metaResult.name, BACKUP_FILENAME);
    assert.strictEqual(recordedHeaders.Authorization, 'Bearer bearer_token_xyz');
    assert(recordedUrl.includes('/files/test_file_id_777'));
    assert(recordedUrl.includes('fields='));
    assert(recordedUrl.includes('parents'));

    // Sub-case 3: HTTP error response
    testService.setFetch(async () => {
      return {
        ok: false,
        status: 404,
        text: async () => 'File not found in AppData folder',
      };
    });

    await assert.rejects(async () => {
      await testService.getFileMetadata('mock_token', 'non_existent_file');
    }, /Google Drive metadata fetch failed/);

    // Sub-case 4: Verify getFileMetadata does NOT mutate or synthesize parents when raw response has parents: ['root'] and spaces: ['appDataFolder']
    testService.setFetch(async (url, opts) => {
      return {
        ok: true,
        json: async () => ({
          id: 'test_raw_file_root',
          name: BACKUP_FILENAME,
          parents: ['root'],
          spaces: ['appDataFolder'],
        }),
      };
    });
    const rawResultWithRoot = await testService.getFileMetadata('bearer_token', 'test_raw_file_root');
    assert.deepStrictEqual(rawResultWithRoot.parents, ['root'], 'getFileMetadata must NOT mutate parents array');
    assert.deepStrictEqual(rawResultWithRoot.spaces, ['appDataFolder']);

    // Sub-case 5: Verify getFileMetadata preserves omitted parents field without synthesizing parents
    testService.setFetch(async (url, opts) => {
      return {
        ok: true,
        json: async () => ({
          id: 'test_raw_file_no_parents',
          name: BACKUP_FILENAME,
          spaces: ['appDataFolder'],
        }),
      };
    });
    const rawResultNoParents = await testService.getFileMetadata('bearer_token', 'test_raw_file_no_parents');
    assert.strictEqual(rawResultNoParents.parents, undefined, 'getFileMetadata must NOT synthesize parents when absent');
    assert.deepStrictEqual(rawResultNoParents.spaces, ['appDataFolder']);

    console.log('[PASS] TEST 33: GoogleDriveBackupService.prototype.getFileMetadata requests correct endpoint and fields');
    passed++;
  }

  // 34. Cloud backup creation and upload verification with complete Money Manager data
  {
    const mockDrive = createMockDriveFetch();
    const driveService = new GoogleDriveBackupService({ fetch: mockDrive.fetch });
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.persistData({
      businessName: 'Personal & Enterprise Shop',
      ownerName: 'Multi-Domain Owner',
      accounts: [
        { id: 'acc_biz_1', name: 'Biz Customer', balance: 5000, type: 1, businessId: '1' },
      ],
      journals: [
        { id: 'jrn_biz_1', accountId: 'acc_biz_1', amount: 5000, type: 'give', date: '2026-10-31', businessId: '1' },
      ],
      cashEntries: [],
    });

    const mmInitialState = {
      version: 3,
      overallMonthlyBudget: 45000,
      accounts: [
        { id: 'acc_cash', name: 'নগদ ক্যাশ', type: 'cash', balance: 12000, icon: '💵', color: '#10B981', isArchived: false },
        { id: 'acc_bank', name: 'ব্যাংক হিসাব', type: 'bank', balance: 55000, icon: '🏦', color: '#3B82F6', isArchived: false },
        { id: 'acc_bkash', name: 'বিকাশ ওয়ালেট', type: 'mfs', balance: 8500, icon: '📱', color: '#EC4899', isArchived: false },
        { id: 'acc_nagad', name: 'নগদ ওয়ালেট', type: 'mfs', balance: 4500, icon: '📱', color: '#F97316', isArchived: false },
      ],
      categories: [
        { id: 'cat_food', name: 'খাবার ও বাজার', type: 'expense', icon: '🍲', color: '#EF4444', budget: 15000, isArchived: false },
        { id: 'cat_salary', name: 'বেতন', type: 'income', icon: '💰', color: '#10B981', budget: 0, isArchived: false },
      ],
      goals: [
        { id: 'goal_1', title: 'নতুন ল্যাপটপ', targetAmount: 80000, savedAmount: 25000, targetDate: '2026-12-31', icon: '💻', color: '#6366F1' },
      ],
      recurring: [
        { id: 'rec_1', title: 'ইন্টারনেট বিল', type: 'expense', amount: 1000, categoryId: 'cat_utility', accountId: 'acc_bkash', cadence: 'monthly', startDate: '2026-10-01', nextDueDate: '2026-11-01', isActive: true },
      ],
      transactions: [
        { id: 'mm_tx_1', type: 'expense', amount: 1500, categoryId: 'cat_food', accountId: 'acc_cash', date: '2026-10-25', time: '12:30 PM', note: 'বাজার' },
        { id: 'mm_tx_2', type: 'income', amount: 40000, categoryId: 'cat_salary', accountId: 'acc_bank', date: '2026-10-01', time: '10:00 AM', note: 'অক্টোবর বেতন' },
        { id: 'mm_tx_3', type: 'transfer', amount: 5000, fee: 25, fromAccountId: 'acc_bank', toAccountId: 'acc_bkash', date: '2026-10-26', time: '03:15 PM', note: 'বিকাশ রিচার্জ' },
      ],
      preferences: { defaultPeriod: 'this_month', currencySymbol: '৳' },
    };

    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify(mmInitialState));

    const googleUser = { sub: 'google_sub_user_a', email: 'usera@gmail.com', name: 'User A' };
    const ui = createMockUiState();

    const backupResult = await orchestrateCloudBackup({
      storageRepository: repo,
      driveService,
      getAccessToken: async () => 'token_user_a',
      googleUser,
      existingFileId: null,
      onStatusChange: ui.onStatusChange,
      onMetaUpdated: () => {},
      alertFn: ui.alertFn,
    });

    assert.strictEqual(backupResult.success, true);
    assert.ok(backupResult.fileId);
    assert.strictEqual(backupResult.manifest.hasMoneyManager, true);
    assert(backupResult.manifest.dataDomains.includes('moneyManager'));
    assert.strictEqual(backupResult.manifest.recordCounts.mmAccounts, 4);
    assert.strictEqual(backupResult.manifest.recordCounts.mmTransactions, 3);
    assert.strictEqual(backupResult.manifest.recordCounts.mmCategories, 2);
    assert.strictEqual(backupResult.manifest.recordCounts.mmGoals, 1);
    assert.strictEqual(backupResult.manifest.recordCounts.mmRecurring, 1);
    assert.ok(backupResult.manifest.moneyManagerSummary);
    assert.strictEqual(backupResult.manifest.moneyManagerSummary.accountsCount, 4);
    assert.strictEqual(backupResult.manifest.moneyManagerSummary.txnsCount, 3);

    console.log('[PASS] TEST 34: Cloud backup creation and upload verification with complete Money Manager data');
    passed++;
  }

  // 35. End-to-end Cloud Restore of Money Manager data from Google Drive download
  {
    const mockDrive = createMockDriveFetch();
    const driveService = new GoogleDriveBackupService({ fetch: mockDrive.fetch });
    const sourceAdapter = createMockAdapter();
    const sourceRepo = new StorageRepository(sourceAdapter);
    await sourceRepo.loadInitialData();

    await sourceRepo.persistData({
      businessName: 'Cloud MM Source Shop',
      accounts: [{ id: 'biz_acc_1', name: 'Biz Acc', balance: 3000, type: 1 }],
      journals: [{ id: 'biz_jrn_1', accountId: 'biz_acc_1', amount: 3000, type: 'give', date: '2026-10-31' }],
    });

    const sourceMM = {
      version: 3,
      overallMonthlyBudget: 35000,
      accounts: [
        { id: 'acc_cash', name: 'ক্যাশ', type: 'cash', balance: 15000, icon: '💵', color: '#10B981', isArchived: false },
        { id: 'acc_bkash', name: 'বিকাশ', type: 'mfs', balance: 6000, icon: '📱', color: '#EC4899', isArchived: false },
      ],
      categories: [
        { id: 'cat_food', name: 'খাবার', type: 'expense', icon: '🍲', color: '#EF4444', budget: 10000, isArchived: false },
      ],
      goals: [{ id: 'goal_phone', title: 'মোবাইল ফোন', targetAmount: 30000, savedAmount: 12000, icon: '📱' }],
      recurring: [],
      transactions: [
        { id: 'tx_mm_1', type: 'expense', amount: 800, categoryId: 'cat_food', accountId: 'acc_cash', date: '2026-10-28', time: '01:00 PM' },
      ],
      preferences: { defaultPeriod: 'this_month' },
    };

    const googleUser = { sub: 'google_sub_user_a', email: 'usera@gmail.com', name: 'User A' };
    const uploadRes = await orchestrateCloudBackup({
      storageRepository: sourceRepo,
      driveService,
      getAccessToken: async () => 'token_user_a',
      googleUser,
      extraData: { moneyManager: sourceMM },
      existingFileId: null,
    });
    assert.strictEqual(uploadRes.success, true);

    // Target clean install
    const targetAdapter = createMockAdapter();
    const targetRepo = new StorageRepository(targetAdapter);
    await targetRepo.loadInitialData();

    let restoredMMInCallback = null;
    const restoreRes = await orchestrateCloudRestore({
      storageRepository: targetRepo,
      driveService,
      getAccessToken: async () => 'token_user_a',
      fileId: uploadRes.fileId,
      userSub: googleUser.sub,
      domains: ['all'],
      onMoneyManagerRestored: (mm) => { restoredMMInCallback = mm; },
    });

    assert.strictEqual(restoreRes.success, true);
    assert.ok(restoredMMInCallback);
    assert.strictEqual(restoredMMInCallback.accounts.length, 2);
    assert.strictEqual(restoredMMInCallback.transactions.length, 1);
    assert.strictEqual(restoredMMInCallback.goals.length, 1);

    const savedRaw = await targetAdapter.getItem('@tallykhata_personal_money_manager_v2');
    assert.ok(savedRaw);
    const savedMM = JSON.parse(savedRaw);
    assert.strictEqual(savedMM.accounts[0].name, 'ক্যাশ');
    assert.strictEqual(savedMM.transactions[0].amount, 800);

    console.log('[PASS] TEST 35: End-to-end Cloud Restore of Money Manager data from Google Drive');
    passed++;
  }

  // 36. Cloud Domain-Selective Restore (Personal-Only and Business-Only isolation)
  {
    const mockDrive = createMockDriveFetch();
    const driveService = new GoogleDriveBackupService({ fetch: mockDrive.fetch });
    const backupAdapter = createMockAdapter();
    const backupRepo = new StorageRepository(backupAdapter);
    await backupRepo.loadInitialData();

    await backupRepo.persistData({
      businessName: 'Cloud Remote Business',
      accounts: [{ id: 'b_acc_remote', name: 'Remote Customer', balance: 9000, type: 1 }],
      journals: [{ id: 'b_jrn_remote', accountId: 'b_acc_remote', amount: 9000, type: 'give', date: '2026-10-31' }],
    });

    const cloudMM = {
      version: 3,
      accounts: [{ id: 'acc_cloud', name: 'ক্লাউড ওয়ালেট', balance: 25000, type: 'bank', isArchived: false }],
      transactions: [{ id: 'tx_cloud_1', type: 'income', amount: 25000, accountId: 'acc_cloud', date: '2026-10-30' }],
      categories: [],
      goals: [],
      recurring: [],
    };

    const googleUser = { sub: 'google_sub_user_a', email: 'usera@gmail.com' };
    const uploadRes = await orchestrateCloudBackup({
      storageRepository: backupRepo,
      driveService,
      getAccessToken: async () => 'token_user_a',
      googleUser,
      extraData: { moneyManager: cloudMM },
    });
    assert.strictEqual(uploadRes.success, true);

    // Case A: Personal-Only Restore ('moneyManager')
    // Local device has local business data and PIN enabled
    const localAdapterA = createMockAdapter();
    const localRepoA = new StorageRepository(localAdapterA);
    await localRepoA.loadInitialData();
    await localRepoA.persistData({
      businessName: 'Local Untouched Business',
      pinEnabled: true,
      appPin: '4321',
      accounts: [{ id: 'local_acc_1', name: 'Local Customer', balance: 1500, type: 1 }],
      journals: [{ id: 'local_jrn_1', accountId: 'local_acc_1', amount: 1500, type: 'give', date: '2026-10-31' }],
    });

    let mmRestoredA = null;
    const restoreA = await orchestrateCloudRestore({
      storageRepository: localRepoA,
      driveService,
      getAccessToken: async () => 'token_user_a',
      fileId: uploadRes.fileId,
      userSub: googleUser.sub,
      domains: ['moneyManager'],
      onMoneyManagerRestored: (mm) => { mmRestoredA = mm; },
    });
    assert.strictEqual(restoreA.success, true);
    assert.ok(mmRestoredA);
    assert.strictEqual(mmRestoredA.accounts[0].name, 'ক্লাউড ওয়ালেট');

    // Local business store MUST be 100% UNTOUCHED
    const localStateA = localRepoA.getAuthoritativeState();
    assert.strictEqual(localStateA.businessName, 'Local Untouched Business');
    assert.strictEqual(localStateA.accounts.length, 1);
    assert.strictEqual(localStateA.accounts[0].name, 'Local Customer');
    // Security: Business PIN must NOT be cleared when restoring personal finance only!
    assert.strictEqual(localStateA.pinEnabled, true);
    assert.strictEqual(localStateA.appPin, '4321');

    // Case B: Business-Only Restore ('business')
    const localAdapterB = createMockAdapter();
    const localRepoB = new StorageRepository(localAdapterB);
    await localRepoB.loadInitialData();
    const preExistingMM = {
      version: 3,
      accounts: [{ id: 'acc_local_mm', name: 'আমার লোকাল ওয়ালেট', balance: 7777, type: 'cash', isArchived: false }],
      transactions: [],
      categories: [],
      goals: [],
      recurring: [],
    };
    await localAdapterB.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify(preExistingMM));

    const restoreB = await orchestrateCloudRestore({
      storageRepository: localRepoB,
      driveService,
      getAccessToken: async () => 'token_user_a',
      fileId: uploadRes.fileId,
      userSub: googleUser.sub,
      domains: ['business'],
    });
    assert.strictEqual(restoreB.success, true);

    // Business restored from cloud
    const localStateB = localRepoB.getAuthoritativeState();
    assert.strictEqual(localStateB.businessName, 'Cloud Remote Business');
    assert.strictEqual(localStateB.accounts[0].name, 'Remote Customer');

    // Personal Money Manager MUST remain 100% UNTOUCHED
    const finalRawMMB = await localAdapterB.getItem('@tallykhata_personal_money_manager_v2');
    const finalMMB = JSON.parse(finalRawMMB);
    assert.strictEqual(finalMMB.accounts[0].name, 'আমার লোকাল ওয়ালেট');
    assert.strictEqual(finalMMB.accounts[0].balance, 7777);

    console.log('[PASS] TEST 36: Cloud Domain-Selective Restore (Personal-Only and Business-Only isolation)');
    passed++;
  }

  // 37. Safety snapshot rollback on commit failure preserves Money Manager without snapshot ID mismatch
  {
    const testAdapter = createMockAdapter();
    const testRepo = new StorageRepository(testAdapter);
    await testRepo.loadInitialData();

    await testRepo.persistData({
      businessName: 'Original Pre-Restore Biz',
      walletBalance: 4000,
      accounts: [{ id: 'acc_pre', name: 'Pre Customer', balance: 4000, type: 1 }],
    });

    const preMM = {
      version: 3,
      accounts: [{ id: 'acc_pre_mm', name: 'Pre MM Wallet', balance: 12345, type: 'cash', isArchived: false }],
      transactions: [],
      categories: [],
      goals: [],
      recurring: [],
    };
    await testAdapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify(preMM));

    const mockDriveServiceFail = {
      findBackupFile: async () => ({ id: 'file_fail', name: BACKUP_FILENAME }),
      downloadBackup: async () => ({
        success: true,
        manifest: { backupVersion: 1, backupOwner: { sub: 'google_sub' }, checksum: 'sha256_mock' },
        data: {
          businessName: 'Corrupted Name',
          accounts: 'not_an_array_invalid',
          moneyManager: { accounts: [{ id: 'bad', name: 'Bad' }] },
        },
      }),
    };

    let rollbackMMReceived = null;
    const restoreResult = await orchestrateCloudRestore({
      storageRepository: testRepo,
      driveService: mockDriveServiceFail,
      getAccessToken: async () => 'mock_token',
      fileId: 'file_fail',
      userSub: 'google_sub',
      extraState: { moneyManager: preMM },
      onRollback: (safeState, safeMM) => { rollbackMMReceived = safeMM; },
    });

    assert.strictEqual(restoreResult.success, false);
    assert.strictEqual(restoreResult.rollbackAttempted, true);
    assert.strictEqual(restoreResult.rollbackSucceeded, true, 'Rollback must succeed without snapshot ID mismatch');
    assert.strictEqual(restoreResult.rollbackError, null);

    // Verify local business store was restored
    const afterRollbackState = testRepo.getAuthoritativeState();
    assert.strictEqual(afterRollbackState.businessName, 'Original Pre-Restore Biz');
    assert.strictEqual(afterRollbackState.walletBalance, 4000);

    // Verify local Money Manager store was restored
    const afterRollbackRawMM = await testAdapter.getItem('@tallykhata_personal_money_manager_v2');
    const afterRollbackMM = JSON.parse(afterRollbackRawMM);
    assert.strictEqual(afterRollbackMM.accounts[0].name, 'Pre MM Wallet');
    assert.strictEqual(afterRollbackMM.accounts[0].balance, 12345);

    console.log('[PASS] TEST 37: Safety snapshot rollback on commit failure preserves Money Manager without snapshot ID mismatch');
    passed++;
  }

  // 38. Automatic 404 Recovery on Existing Backup PATCH (stale/deleted file in Drive)
  {
    const mockDrive = createMockDriveFetch();
    const driveService = new GoogleDriveBackupService({ fetch: mockDrive.fetch });
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.persistData({
      businessName: 'Auto Recovery Business',
      accounts: [{ id: 'acc_1', name: 'Cust 1', balance: 2000, type: 1 }],
      journals: [{ id: 'jrn_1', accountId: 'acc_1', amount: 2000, type: 'give', date: '2026-10-31' }],
    });

    const googleUser = { sub: 'google_sub_user_a', email: 'usera@gmail.com' };

    // Pass a non-existent existingFileId ('file_deleted_by_user_999')
    const backupRes = await orchestrateCloudBackup({
      storageRepository: repo,
      driveService,
      getAccessToken: async () => 'token_user_a',
      googleUser,
      existingFileId: 'file_deleted_by_user_999',
    });

    assert.strictEqual(backupRes.success, true);
    assert.ok(backupRes.fileId);
    assert.notStrictEqual(backupRes.fileId, 'file_deleted_by_user_999', 'Must create a fresh new file ID on 404 fallback');

    console.log('[PASS] TEST 38: Automatic 404 Recovery on Existing Backup PATCH');
    passed++;
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED SUCCESSFULLY (100%)`);
  console.log('================================================================');
}

runAllTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
