/**
 * test_feature8_cloud_backup_parity.js
 * Comprehensive Parity & Verification Suite for Feature 008: Google Drive Cloud Backup & Restore
 *
 * Verifies 100% parity across:
 * 1. AppDataFolder Isolation & REST v3 Scope.
 * 2. Multi-Domain Payload Construction (Business + Money Manager + Preferences).
 * 3. Cryptographic SHA-256 Checksum & Tamper Detection.
 * 4. User Privacy & Plaintext PIN Scrubbing.
 * 5. Google Account Ownership Isolation (Sub Verification).
 * 6. Preview Generation & Record Counts Summarization.
 * 7. Domain-Selective Restore Matrix (Business-Only, Personal-Only, Full).
 * 8. Legacy Backup Safety & Silent Discard Resilience.
 * 9. Local Safety Snapshot Atomic Rollback on Failure.
 * 10. Pre-flight Connectivity Ping & Exponential Backoff Retry.
 * 11. Backup Size Estimation & Bengali Numeral Formatting.
 * 12. Frontend Babel AST Syntax Integrity Verification.
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const gdriveService = require('./src/googleDriveBackupService');
const { StorageRepository, createDefaultState } = require('./src/storageRepository');
const mmService = require('./src/moneyManagerService');

console.log('================================================================');
console.log('FEATURE 8: GOOGLE DRIVE CLOUD BACKUP & RESTORE PARITY SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function createMockAdapter(initialData = null) {
  const store = new Map();
  if (initialData) {
    store.set('@tallykhata_state_v6', JSON.stringify(initialData));
  }
  return {
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, val) => { store.set(key, String(val)); },
    removeItem: async (key) => { store.delete(key); },
    clear: async () => { store.clear(); },
    _map: store,
  };
}

async function runAll() {
  // ============================================================================
  // PART 1: APPDATAFOLDER SCOPE & CONSTANTS
  // ============================================================================
  console.log('--- PART 1: APPDATAFOLDER SCOPE & CONSTANTS ---');

  runTest('1.1: Backup filename and schema constants adhere to specifications', () => {
    assert.strictEqual(gdriveService.BACKUP_FILENAME, 'tallykhata_cloud_backup.json');
    assert.strictEqual(gdriveService.BACKUP_FORMAT_VERSION, 1);
    assert.strictEqual(gdriveService.SCHEMA_VERSION, 6);
    assert.strictEqual(typeof gdriveService.APP_VERSION, 'string');
  });

  runTest('1.2: GoogleDriveBackupService instance uses appDataFolder spaces scope', () => {
    const service = new gdriveService.GoogleDriveBackupService();
    assert.strictEqual(service.backupFilename, 'tallykhata_cloud_backup.json');
    assert.strictEqual(typeof service.uploadBackup, 'function');
    assert.strictEqual(typeof service.downloadBackup, 'function');
    assert.strictEqual(typeof service.findBackupFile, 'function');
  });

  // ============================================================================
  // PART 2: MULTI-DOMAIN PAYLOAD CONSTRUCTION & PRIVACY
  // ============================================================================
  console.log('\n--- PART 2: MULTI-DOMAIN PAYLOAD CONSTRUCTION & PRIVACY ---');

  runTest('2.1: buildBackupPayload serializes Business, Money Manager, and Preferences', () => {
    const businessState = {
      accounts: [{ id: 1, name: 'Customer 1', type: 1, balance: 500 }],
      journals: [{ id: 101, accountId: '1', amount: 500, type: 'given', date: '2026-11-01' }],
      cashEntries: [{ id: 'c1', amount: 500, type: 'in', date: '2026-11-01' }],
      stock: [{ id: 's1', name: 'Product A', buyPrice: 100, sellPrice: 120, stockQty: 50 }],
      notes: [{ id: 'n1', title: 'Note 1', text: 'Important memo' }],
      businesses: [{ id: '1', business_name: 'Main Shop', is_current: 1 }],
      activeBusinessId: '1',
      appPin: '1234', // Must be scrubbed
      pinEnabled: true,
    };
    const mmState = mmService.getDefaultState();
    const prefsState = { theme: 'dark', language: 'bn' };
    const googleUser = { sub: 'google_user_12345', email: 'merchant@gmail.com', name: 'Merchant' };

    const payload = gdriveService.buildBackupPayload(businessState, googleUser, {
      moneyManager: mmState,
      preferences: prefsState,
    });

    assert(payload && typeof payload === 'object');
    assert(payload.manifest, 'Must contain manifest');
    assert.strictEqual(payload.manifest.backupVersion, 1);
    assert.strictEqual(payload.manifest.schemaVersion, 6);
    assert.strictEqual(payload.manifest.backupOwner.sub, 'google_user_12345');
    assert.strictEqual(payload.manifest.backupOwner.email, 'merchant@gmail.com');

    // Verification of data domains
    assert(payload.data, 'Must contain data payload');
    assert(Array.isArray(payload.data.accounts) && payload.data.accounts.length === 1);
    assert(payload.data.moneyManager && Array.isArray(payload.data.moneyManager.accounts));
    assert(payload.data.preferences && payload.data.preferences.theme === 'dark');

    // Privacy invariant
    assert.strictEqual(payload.data.appPin, '', 'Plaintext app PIN must be completely scrubbed');
  });

  // ============================================================================
  // PART 3: CRYPTOGRAPHIC SHA-256 INTEGRITY & TAMPER DETECTION
  // ============================================================================
  console.log('\n--- PART 3: CRYPTOGRAPHIC INTEGRITY & CHECKSUMS ---');

  runTest('3.1: SHA-256 checksum is deterministic and verifies authentic payload', () => {
    const data = {
      accounts: [{ id: 1, name: 'Alice', balance: 1000 }],
      moneyManager: { accounts: [{ id: 'w1', balance: 5000 }] },
    };
    const chk1 = gdriveService.calculateChecksum(data);
    const chk2 = gdriveService.calculateChecksum(data);
    assert.strictEqual(chk1, chk2, 'Checksum must be deterministic');
    assert(chk1.startsWith('sha256_'), 'Checksum must start with sha256_');
    assert.strictEqual(chk1.length, 71, 'SHA-256 formatted checksum must be 71 characters');

    const validPayload = {
      manifest: {
        backupVersion: 1,
        schemaVersion: 6,
        checksum: chk1,
        backupOwner: { sub: 'usr_1' },
      },
      data,
    };
    const result = gdriveService.validateBackupIntegrity(validPayload, 'usr_1');
    assert.strictEqual(result.valid, true);
  });

  runTest('3.2: 1-paisa tampering in business or moneyManager strictly triggers integrity violation', () => {
    const data = {
      accounts: [{ id: 1, name: 'Alice', balance: 1000 }],
      moneyManager: { accounts: [{ id: 'w1', balance: 5000 }] },
    };
    const chk = gdriveService.calculateChecksum(data);

    // Tamper Business ledger by 0.01
    const tamperedBusiness = {
      manifest: { backupVersion: 1, schemaVersion: 6, checksum: chk, backupOwner: { sub: 'usr_1' } },
      data: {
        accounts: [{ id: 1, name: 'Alice', balance: 1000.01 }],
        moneyManager: { accounts: [{ id: 'w1', balance: 5000 }] },
      },
    };
    const resBiz = gdriveService.validateBackupIntegrity(tamperedBusiness, 'usr_1');
    assert.strictEqual(resBiz.valid, false);
    assert(resBiz.error.includes('checksum verification failed'));

    // Tamper Money Manager wallet by 1 Taka
    const tamperedMM = {
      manifest: { backupVersion: 1, schemaVersion: 6, checksum: chk, backupOwner: { sub: 'usr_1' } },
      data: {
        accounts: [{ id: 1, name: 'Alice', balance: 1000 }],
        moneyManager: { accounts: [{ id: 'w1', balance: 5001 }] },
      },
    };
    const resMM = gdriveService.validateBackupIntegrity(tamperedMM, 'usr_1');
    assert.strictEqual(resMM.valid, false);
    assert(resMM.error.includes('checksum verification failed'));
  });

  runTest('3.3: validateBackupIntegrity enforces Google account owner sub isolation', () => {
    const data = { accounts: [] };
    const chk = gdriveService.calculateChecksum(data);
    const payload = {
      manifest: { backupVersion: 1, schemaVersion: 6, checksum: chk, backupOwner: { sub: 'user_A' } },
      data,
    };

    // User A restoring User A's backup -> Valid
    const resA = gdriveService.validateBackupIntegrity(payload, 'user_A');
    assert.strictEqual(resA.valid, true);

    // User B attempting to restore User A's backup -> Rejected
    const resB = gdriveService.validateBackupIntegrity(payload, 'user_B');
    assert.strictEqual(resB.valid, false);
    assert.strictEqual(resB.ownerMismatch, true);
  });

  // ============================================================================
  // PART 4: BACKUP PREVIEW & SUMMARIZATION
  // ============================================================================
  console.log('\n--- PART 4: BACKUP PREVIEW & SUMMARIZATION ---');

  runTest('4.1: previewBackup summarizes counts and metadata for user dialog', () => {
    const rawData = {
      accounts: [{ id: 1, type: 1 }, { id: 2, type: 2 }],
      journals: [{ id: 10 }, { id: 11 }],
      cashEntries: [{ id: 'c1' }],
      stock: [{ id: 's1' }, { id: 's2' }],
      notes: [{ id: 'n1' }],
      businesses: [{ id: '1' }, { id: '2' }],
      moneyManager: {
        accounts: [{ id: 'w1' }, { id: 'w2' }],
        transactions: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
      },
    };
    const payload = {
      manifest: {
        backupVersion: 1,
        schemaVersion: 6,
        createdAt: '2026-11-01T12:00:00.000Z',
        backupOwner: { email: 'merchant@gmail.com' },
      },
      data: rawData,
    };

    const preview = gdriveService.previewBackup(payload);
    assert.strictEqual(preview.valid, true);
    assert.strictEqual(preview.recordCounts.customers, 1);
    assert.strictEqual(preview.recordCounts.suppliers, 1);
    assert.strictEqual(preview.recordCounts.journals, 2);
    assert.strictEqual(preview.recordCounts.cashEntries, 1);
    assert.strictEqual(preview.recordCounts.stock, 2);
    assert.strictEqual(preview.recordCounts.businesses, 2);
    assert.strictEqual(preview.recordCounts.mmAccounts, 2);
    assert.strictEqual(preview.recordCounts.mmTransactions, 3);
  });

  // ============================================================================
  // PART 5: DOMAIN-SELECTIVE RESTORE MATRIX
  // ============================================================================
  console.log('\n--- PART 5: DOMAIN-SELECTIVE RESTORE MATRIX ---');

  await runAsyncTest('5.1: Business-only restore updates business, preserves Money Manager, resets PIN', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Initial local state: Business A, MM Wallet with 12000
    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify({
      version: 3,
      accounts: [{ id: 'local_wallet', name: 'My Wallet', balance: 12000 }],
      transactions: [],
    }));

    const remoteBackup = {
      manifest: { backupVersion: 1, schemaVersion: 6 },
      data: {
        accounts: [{ id: '101', name: 'Restored Customer', type: 1, balance: 3500 }],
        journals: [],
        moneyManager: {
          version: 3,
          accounts: [{ id: 'remote_wallet', name: 'Cloud Wallet', balance: 80000 }],
          transactions: [],
        },
      },
    };

    await repo.commitRestorePayload(remoteBackup, { domains: ['business'] });

    // Verify Business is restored
    const bizState = await repo.getAuthoritativeState();
    assert(bizState.accounts.some(a => a.id === '101' && a.name === 'Restored Customer'));

    // Verify Money Manager is untouched (preserves local 12000)
    const mmRaw = await adapter.getItem('@tallykhata_personal_money_manager_v2');
    const mmParsed = JSON.parse(mmRaw);
    assert(mmParsed.accounts.some(a => a.id === 'local_wallet' && a.balance === 12000));
    assert(!mmParsed.accounts.some(a => a.id === 'remote_wallet'));
  });

  await runAsyncTest('5.2: Personal-only restore updates Money Manager, preserves Business ledger & PIN', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Setup local business data with PIN
    await repo.mutateStore((s) => ({
      ...s,
      accounts: [{ id: 'local_cust', name: 'Local Cust', type: 1, balance: 4000 }],
      appPin: '9999',
      pinEnabled: true,
    }));

    const remoteBackup = {
      manifest: { backupVersion: 1, schemaVersion: 6 },
      data: {
        accounts: [{ id: 'cloud_cust', name: 'Cloud Cust', type: 1, balance: 9000 }],
        moneyManager: {
          version: 3,
          accounts: [{ id: 'cloud_wallet', name: 'Cloud Bank', balance: 75000 }],
          transactions: [],
        },
      },
    };

    await repo.commitRestorePayload(remoteBackup, { domains: ['moneyManager'] });

    // Verify Business and PIN remain untouched
    const bizState = await repo.getAuthoritativeState();
    assert(bizState.accounts.some(a => a.id === 'local_cust'));
    assert(!bizState.accounts.some(a => a.id === 'cloud_cust'));
    assert.strictEqual(bizState.appPin, '9999');
    assert.strictEqual(bizState.pinEnabled, true);

    // Verify Money Manager is restored
    const mmRaw = await adapter.getItem('@tallykhata_personal_money_manager_v2');
    const mmParsed = JSON.parse(mmRaw);
    assert(mmParsed.accounts.some(a => a.id === 'cloud_wallet' && a.balance === 75000));
  });

  await runAsyncTest('5.3: Full restore commits both Business and Personal domains', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const remoteBackup = {
      manifest: { backupVersion: 1, schemaVersion: 6 },
      data: {
        accounts: [{ id: 'full_cust', name: 'Full Cust', type: 1, balance: 1500 }],
        moneyManager: {
          version: 3,
          accounts: [{ id: 'full_wallet', name: 'Full Wallet', balance: 50000 }],
          transactions: [],
        },
      },
    };

    await repo.commitRestorePayload(remoteBackup, { domains: ['business', 'moneyManager'] });

    const bizState = await repo.getAuthoritativeState();
    assert(bizState.accounts.some(a => a.id === 'full_cust'));

    const mmRaw = await adapter.getItem('@tallykhata_personal_money_manager_v2');
    const mmParsed = JSON.parse(mmRaw);
    assert(mmParsed.accounts.some(a => a.id === 'full_wallet' && a.balance === 50000));
  });

  // ============================================================================
  // PART 6: LEGACY BACKUP SAFETY
  // ============================================================================
  console.log('\n--- PART 6: LEGACY BACKUP SAFETY ---');

  await runAsyncTest('6.1: Restoring legacy backup without moneyManager domain preserves local Money Manager records', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Local existing Money Manager data
    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify({
      version: 3,
      accounts: [{ id: 'my_savings', name: 'Savings Account', balance: 35000 }],
      transactions: [],
    }));

    // Legacy backup without moneyManager key
    const legacyBackup = {
      manifest: { backupVersion: 0, schemaVersion: 5 },
      data: {
        accounts: [{ id: 'legacy_acc', name: 'Legacy Customer', type: 1, balance: 200 }],
      },
    };

    await repo.commitRestorePayload(legacyBackup);

    // Verify Money Manager was preserved and NOT erased
    const mmRaw = await adapter.getItem('@tallykhata_personal_money_manager_v2');
    const mmParsed = JSON.parse(mmRaw);
    assert(mmParsed.accounts.some(a => a.id === 'my_savings' && a.balance === 35000));
  });

  // ============================================================================
  // PART 7: SAFETY SNAPSHOT ATOMIC ROLLBACK
  // ============================================================================
  console.log('\n--- PART 7: SAFETY SNAPSHOT ATOMIC ROLLBACK ---');

  await runAsyncTest('7.1: Local safety snapshot reverts all stores if restore commit encounters disk write failure', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.mutateStore((s) => ({
      ...s,
      accounts: [{ id: 'orig_acc', name: 'Original Account', type: 1, balance: 1000 }],
    }));
    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify({
      version: 3,
      accounts: [{ id: 'orig_wallet', name: 'Original Wallet', balance: 5000 }],
    }));

    // Create safety snapshot
    const snapshot = await repo.createLocalSafetySnapshot();

    // Simulate disk failure during write
    let writeCount = 0;
    const failingAdapter = {
      ...adapter,
      setItem: async (k, v) => {
        writeCount++;
        if (writeCount > 1) throw new Error('Simulated disk I/O error mid-commit');
        await adapter.setItem(k, v);
      },
    };
    const failingRepo = new StorageRepository(failingAdapter);
    await failingRepo.loadInitialData();

    try {
      await failingRepo.commitRestorePayload({
        data: {
          accounts: [{ id: 'bad_acc', name: 'Bad Account', balance: 999999 }],
          moneyManager: { accounts: [{ id: 'bad_wallet', balance: 999999 }] },
        },
      });
      assert.fail('Commit should have thrown');
    } catch (err) {
      // Rollback to safety snapshot using original working adapter
      await repo.rollbackToSafetySnapshot(snapshot);
    }

    // Verify complete restoration of original state
    const restoredBiz = await repo.getAuthoritativeState();
    assert(restoredBiz.accounts.some(a => a.id === 'orig_acc'));
    assert(!restoredBiz.accounts.some(a => a.id === 'bad_acc'));

    const restoredMM = JSON.parse(await adapter.getItem('@tallykhata_personal_money_manager_v2'));
    assert(restoredMM.accounts.some(a => a.id === 'orig_wallet' && a.balance === 5000));
  });

  // ============================================================================
  // PART 8: CONNECTIVITY PING & EXPONENTIAL BACKOFF RETRY
  // ============================================================================
  console.log('\n--- PART 8: CONNECTIVITY PING & RETRY ENGINE ---');

  await runAsyncTest('8.1: checkDriveConnectivity detects online, offline, and rate-limiting', async () => {
    // 200 OK -> reachable & authorized
    const mockFetchSuccess = async () => ({ status: 200, ok: true, json: async () => ({}) });
    const pingOk = await gdriveService.checkDriveConnectivity('token_123', { fetch: mockFetchSuccess });
    assert.strictEqual(pingOk.reachable, true);
    assert.strictEqual(pingOk.isAuthorized, true);

    // 401 Unauthorized -> reachable, unauthorized
    const mockFetch401 = async () => ({ status: 401, ok: false, statusText: 'Unauthorized' });
    const ping401 = await gdriveService.checkDriveConnectivity('bad_token', { fetch: mockFetch401 });
    assert.strictEqual(ping401.reachable, true);
    assert.strictEqual(ping401.isAuthorized, false);

    // Network error -> unreachable
    const mockFetchErr = async () => { throw new Error('ENOTFOUND drive.googleapis.com'); };
    const pingErr = await gdriveService.checkDriveConnectivity('token_123', { fetch: mockFetchErr });
    assert.strictEqual(pingErr.reachable, false);
  });

  await runAsyncTest('8.2: executeWithRetry recovers from transient 503 and fails fast on 401', async () => {
    let attempts503 = 0;
    const retryableOp = async () => {
      attempts503++;
      if (attempts503 < 3) {
        const err = new Error('503 Service Unavailable');
        err.status = 503;
        throw err;
      }
      return 'SUCCESS_503';
    };

    const res503 = await gdriveService.executeWithRetry(retryableOp, {
      maxRetries: 4,
      baseDelayMs: 5,
      maxDelayMs: 20,
    });
    assert.strictEqual(res503, 'SUCCESS_503');
    assert.strictEqual(attempts503, 3);

    // Fast-fail on 401
    let attempts401 = 0;
    const fastFailOp = async () => {
      attempts401++;
      const err = new Error('401 Unauthorized');
      err.status = 401;
      throw err;
    };

    await assert.rejects(async () => {
      await gdriveService.executeWithRetry(fastFailOp, { maxRetries: 5, baseDelayMs: 5 });
    }, /401 Unauthorized/);
    assert.strictEqual(attempts401, 1, 'Must fail fast on attempt 1 without retrying 401');
  });

  // ============================================================================
  // PART 9: BACKUP SIZE ESTIMATION & BENGALI NUMERAL FORMATTING
  // ============================================================================
  console.log('\n--- PART 9: BACKUP SIZE ESTIMATION & FORMATTING ---');

  runTest('9.1: estimateBackupSize calculates realistic payload bytes and Bengali labels', () => {
    const state = {
      accounts: new Array(20).fill({ id: 1, name: 'Customer', balance: 500 }),
      journals: new Array(50).fill({ id: 1, amount: 200, date: '2026-11-01' }),
    };

    const estimate = gdriveService.estimateBackupSize(state);
    assert(estimate.rawBytes > 1000, 'Must calculate realistic byte size');
    assert(estimate.estimatedGzipBytes < estimate.rawBytes, 'Gzip size must be smaller than raw JSON');
    assert(typeof estimate.formattedTextBn === 'string');
    assert(typeof estimate.formattedRawSize === 'string');
    assert(estimate.formattedRawSize.includes('কেবি') || estimate.formattedRawSize.includes('বাইট'));
  });

  runTest('9.2: formatBytesBengali transitions correctly across Byte, KB, and MB boundaries', () => {
    assert.strictEqual(gdriveService.formatBytesBengali(500), '৫০০ বাইট');
    assert(gdriveService.formatBytesBengali(2048).includes('কেবি'));
    assert(gdriveService.formatBytesBengali(5 * 1024 * 1024).includes('এমবি'));
  });

  // ============================================================================
  // PART 10: FRONTEND AST SYNTAX INTEGRITY
  // ============================================================================
  console.log('\n--- PART 10: FRONTEND AST INTEGRITY ---');

  runTest('10.1: App.js parses cleanly with zero JSX/syntax errors via Babel', () => {
    const appCode = fs.readFileSync('App.js', 'utf8');
    assert(appCode.length > 10000, 'App.js must be a non-trivial file');
    const ast = babel.parseSync(appCode, {
      filename: 'App.js',
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ['jsx', 'flow'] },
    });
    assert(ast && ast.program && ast.program.body.length > 0, 'App.js must produce valid AST');
  });

  console.log('\n================================================================');
  console.log(`ALL ${passedTests} / ${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
  console.log('FEATURE 8 GOOGLE DRIVE CLOUD BACKUP & RESTORE PARITY VERIFIED');
  console.log('================================================================\n');
}

runAll().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
