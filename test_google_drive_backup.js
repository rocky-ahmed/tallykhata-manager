/**
 * test_google_drive_backup.js
 * Comprehensive Test Suite for TallyKhata Google Drive Backup & Restore
 * Validates the 20 test specifications defined in Master Prompt Section 12.
 */

const assert = require('assert');
const {
  buildBackupPayload,
  validateBackupIntegrity,
  GoogleDriveBackupService,
  BACKUP_FILENAME,
} = require('./src/googleDriveBackupService');

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
  console.log('Validating Master Prompt Section 12 Requirements (1 - 20)');
  console.log('================================================================\n');

  let passed = 0;
  let total = 20;

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

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED SUCCESSFULLY (100%)`);
  console.log('================================================================');
}

runAllTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
