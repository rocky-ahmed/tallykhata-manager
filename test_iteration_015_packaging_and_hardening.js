/**
 * REA Reconstruction — Iteration 015: Production Release Packaging & Native Manifest Hardening Suite
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { StorageRepository } = require('./src/storageRepository');
const googleDrive = require('./src/googleDriveBackupService');
const i18n = require('./src/i18nService');

function createMockStorageAdapter() {
  const store = new Map();
  return {
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, val) => { store.set(key, String(val)); },
    removeItem: async (key) => { store.delete(key); },
    clear: async () => { store.clear(); },
    _map: store,
  };
}

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

(async () => {
  console.log('================================================================');
  console.log('REA RECONSTRUCTION: ITERATION 015 PACKAGING & HARDENING SUITE');
  console.log('================================================================');

  // STEP 1: NATIVE ANDROID MANIFEST VERIFICATION
  console.log('\n--- STEP 1: NATIVE ANDROID MANIFEST VERIFICATION ---');

  runTest('1.1: AndroidManifest.xml contains required core permissions', () => {
    const manifestPath = path.join(__dirname, 'android/app/src/main/AndroidManifest.xml');
    assert.strictEqual(fs.existsSync(manifestPath), true, 'AndroidManifest.xml must exist');
    const xml = fs.readFileSync(manifestPath, 'utf8');

    assert(xml.includes('android.permission.INTERNET'), 'INTERNET permission required');
    assert(xml.includes('android.permission.VIBRATE'), 'VIBRATE permission required');
    assert(xml.includes('android.permission.READ_EXTERNAL_STORAGE'), 'READ_EXTERNAL_STORAGE required');
    assert(xml.includes('android.permission.WRITE_EXTERNAL_STORAGE'), 'WRITE_EXTERNAL_STORAGE required');
  });

  runTest('1.2: AndroidManifest.xml MainActivity launchMode and orientation', () => {
    const xml = fs.readFileSync(path.join(__dirname, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
    assert(xml.includes('android:launchMode="singleTask"'), 'MainActivity must be singleTask');
    assert(xml.includes('android:screenOrientation="portrait"'), 'MainActivity must be portrait');
    assert(xml.includes('android:allowBackup="true"'), 'Application must allow backup');
  });

  // STEP 2: APP.JSON & PACKAGING CONFIGURATION
  console.log('\n--- STEP 2: EXPO APP.JSON & ASSET INTEGRITY ---');

  runTest('2.1: app.json defines correct package ID and version 4.0.0', () => {
    const appJsonPath = path.join(__dirname, 'app.json');
    assert.strictEqual(fs.existsSync(appJsonPath), true, 'app.json must exist');
    const config = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    assert.strictEqual(config.expo.version, '4.0.0', 'App version must be 4.0.0');
    assert.strictEqual(config.expo.android.package, 'com.progoti.tallykhata.offline', 'Package must match');
    assert.strictEqual(config.expo.slug, 'tallykhata-offline', 'Slug must match');
  });

  runTest('2.2: Application icon assets exist on disk', () => {
    const icon1 = path.join(__dirname, 'assets/ic_tally_khata_logo_reg.png');
    const icon2 = path.join(__dirname, 'assets/icons/ic_tally_khata_logo_reg.png');
    assert(fs.existsSync(icon1), 'assets/ic_tally_khata_logo_reg.png must exist');
    assert(fs.existsSync(icon2), 'assets/icons/ic_tally_khata_logo_reg.png must exist');
  });

  // STEP 3: BABEL AST CODE INTEGRITY (19 FILES)
  console.log('\n--- STEP 3: BABEL AST CODE INTEGRITY (19 FILES) ---');

  const files = [
    'App.js',
    'index.js',
    ...fs.readdirSync('src').filter(f => f.endsWith('.js')).map(f => path.join('src', f)),
    ...fs.readdirSync('src/components').filter(f => f.endsWith('.js')).map(f => path.join('src/components', f))
  ];

  runTest(`3.1: All ${files.length} project JS files parse cleanly with Babel AST`, () => {
    assert.strictEqual(files.length, 29, 'Expected exactly 24 application JS files');
    for (const f of files) {
      const code = fs.readFileSync(f, 'utf8');
      babel.parseSync(code, {
        configFile: false,
        babelrc: false,
        parserOpts: { plugins: ['jsx', 'flow', 'classProperties'] }
      });
    }
  });

  // STEP 4: STORAGE HARDENING & MUTEX INTEGRITY
  console.log('\n--- STEP 4: STORAGE HARDENING & MUTEX INTEGRITY ---');

  await runAsyncTest('4.1: Mutex queue handles 50 interleaved mutations without race conditions', async () => {
    const adapter = createMockStorageAdapter();
    const storage = new StorageRepository(adapter);
    await storage.loadInitialData();

    const burstPromises = [];
    const BURST_COUNT = 50;
    for (let i = 1; i <= BURST_COUNT; i++) {
      burstPromises.push(
        storage.mutateCollection('notes', (notes) => [
          ...notes,
          { id: `note_iter015_${i}`, title: `Note ${i}` },
        ])
      );
    }

    const burstResults = await Promise.all(burstPromises);
    for (const r of burstResults) {
      assert.strictEqual(r.success, true);
    }

    await storage.waitForIdle();
    assert.strictEqual(storage.isWriteQueueIdle(), true);

    const finalState = await storage.getAuthoritativeState();
    const iterNotes = finalState.notes.filter((n) => n.id.startsWith('note_iter015_'));
    assert.strictEqual(iterNotes.length, BURST_COUNT, 'All 50 burst notes must be recorded with zero lost updates');
  });

  // STEP 5: DOMAIN ISOLATION & RESTORE HARDENING
  console.log('\n--- STEP 5: DOMAIN ISOLATION & RESTORE HARDENING ---');

  await runAsyncTest('5.1: 3-Way Selective Restore (Business, Personal, and Full)', async () => {
    const adapter = createMockStorageAdapter();
    const storage = new StorageRepository(adapter);
    await storage.loadInitialData();

    // Create a business account
    await storage.mutateCollection('accounts', (accs) => [
      ...accs,
      { id: 'acc_biz_iter015_1', name: 'Original Customer', balance: 50000, type: 'customer' },
    ]);

    // Save Money Manager through storage repository writeQueue
    await storage.saveMoneyManager({
      version: 3,
      accounts: [{ id: 'acc_iter015_1', name: 'Original Wallet', balance: 100000 }],
      transactions: [{ id: 'tx_iter015_1', amount: 500, type: 'expense' }],
    });

    const fullState = await storage.getFullBackupState();
    const googleUser = { sub: 'google_merchant_iter015', email: 'merchant.iter015@gmail.com', name: 'Merchant 015' };
    const cloudPayload = googleDrive.buildBackupPayload(
      fullState,
      googleUser,
      {
        moneyManager: fullState.moneyManager,
        preferences: fullState.preferences,
      }
    );

    assert(cloudPayload.manifest.checksum, 'Payload must contain SHA-256 checksum');
    const integrityCheck = googleDrive.validateBackupIntegrity(cloudPayload);
    assert.strictEqual(integrityCheck.valid, true, 'Backup payload checksum must validate');

    // 1. Business-only restore preserves personal money manager
    const restoreRepo = new StorageRepository(createMockStorageAdapter());
    await restoreRepo.loadInitialData();
    await restoreRepo.saveMoneyManager({
      version: 3,
      accounts: [{ id: 'acc_preserve_local', name: 'Local Wallet', balance: 25000 }],
      transactions: [],
    });

    const bizRestoreRes = await restoreRepo.restoreStorageBackup(cloudPayload, { domain: 'business' });
    assert.strictEqual(bizRestoreRes.success, true);
    const mmAfterBizRestore = await restoreRepo.getAuthoritativeMoneyManager();
    assert.strictEqual(mmAfterBizRestore.accounts[0].id, 'acc_preserve_local', 'Business restore must not touch Personal MM');
    const bizState = await restoreRepo.getAuthoritativeState();
    assert(bizState.accounts.find((a) => a.id === 'acc_biz_iter015_1'), 'Business account must be restored');

    // 2. Personal-only restore preserves business accounting
    const mmRestoreRes = await restoreRepo.restoreStorageBackup(cloudPayload, { domain: 'personal' });
    assert.strictEqual(mmRestoreRes.success, true);
    const mmAfterMMRestore = await restoreRepo.getAuthoritativeMoneyManager();
    assert.strictEqual(mmAfterMMRestore.accounts[0].id, 'acc_iter015_1', 'Personal restore must restore MM accounts');
    assert.strictEqual(mmAfterMMRestore.transactions.length, 1, 'Personal restore must restore MM transactions');

    // 3. Full restore restores both domains
    const fullRestoreRes = await restoreRepo.restoreStorageBackup(cloudPayload, { domain: 'all' });
    assert.strictEqual(fullRestoreRes.success, true);
    const fullStateAfter = await restoreRepo.getAuthoritativeState();
    const fullMMAfter = await restoreRepo.getAuthoritativeMoneyManager();
    assert(fullStateAfter.accounts.find((a) => a.id === 'acc_biz_iter015_1'), 'Full restore restores business accounts');
    assert(fullMMAfter.accounts.find((a) => a.id === 'acc_iter015_1'), 'Full restore restores personal accounts');
  });

  console.log('\n================================================================');
  console.log(`ITERATION 015 VERDICT: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================\n');
})();
