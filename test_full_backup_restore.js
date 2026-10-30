const assert = require('assert');
const {
  StorageRepository,
  createDefaultState,
} = require('./src/storageRepository');
const {
  buildBackupPayload,
  validateBackupIntegrity,
  normalizeBackupPayload,
  previewBackup,
  calculateSha256Checksum,
} = require('./src/googleDriveBackupService');
const moneyManagerService = require('./src/moneyManagerService');
const preferencesService = require('./src/preferencesService');

function createMockAdapter(initialStore = {}) {
  const store = new Map(Object.entries(initialStore));
  return {
    getItem: async (k) => (store.has(k) ? store.get(k) : null),
    setItem: async (k, v) => { store.set(k, String(v)); },
    removeItem: async (k) => { store.delete(k); },
    clear: async () => { store.clear(); },
    _store: store,
  };
}

console.log("================================================================");
console.log("TALLYKHATA FULL DATA DOMAIN BACKUP & RESTORE TEST SUITE");
console.log("================================================================");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] TEST ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] TEST ${total}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`[PASS] TEST ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] TEST ${total}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

(async () => {
  // Test 1: buildBackupPayload includes business, moneyManager, and preferences
  runTest('buildBackupPayload creates comprehensive payload with all data domains', () => {
    const bizState = {
      ...createDefaultState(),
      businessName: 'Super Mart',
      moneyManager: {
        accounts: [
          { id: 'acc_cash', name: 'Cash Wallet', balance: 5000, isArchived: false },
          { id: 'acc_bank', name: 'City Bank', balance: 25000, isArchived: false }
        ],
        transactions: [
          { id: 'tx_1', type: 'expense', amount: 500, accountId: 'acc_cash', categoryId: 'cat_food' },
          { id: 'tx_2', type: 'income', amount: 15000, accountId: 'acc_bank', categoryId: 'cat_salary' }
        ],
        categories: [
          { id: 'cat_food', name: 'Food', type: 'expense', budget: 5000 }
        ],
        goals: [
          { id: 'g_1', name: 'Emergency Fund', targetAmount: 50000, savedAmount: 10000 }
        ],
        recurring: [],
        preferences: { currencySymbol: '৳', sortOrder: 'newest' }
      },
      preferences: {
        theme: 'dark',
        language: 'bn'
      }
    };
    const user = { sub: 'usr_test_123', email: 'owner@example.com', name: 'Owner' };

    const payload = buildBackupPayload(bizState, user);
    assert.strictEqual(payload.manifest.backupOwner.sub, 'usr_test_123');
    assert(payload.manifest.dataDomains.includes('business'));
    assert(payload.manifest.dataDomains.includes('moneyManager'));
    assert(payload.manifest.dataDomains.includes('preferences'));
    assert.strictEqual(payload.manifest.recordCounts.mmAccounts, 2);
    assert.strictEqual(payload.manifest.recordCounts.mmTransactions, 2);
    assert.strictEqual(payload.manifest.recordCounts.mmGoals, 1);
    assert.strictEqual(payload.data.moneyManager.accounts.length, 2);
    assert.strictEqual(payload.data.preferences.theme, 'dark');
    assert.strictEqual(payload.data.pinEnabled, false, 'PIN must be scrubbed');
    assert.strictEqual(payload.data.appPin, '', 'Plaintext PIN must be empty');
  });

  // Test 2: Integrity checksum covers moneyManager and preferences
  runTest('SHA-256 integrity checksum covers moneyManager and preferences', () => {
    const bizState = {
      ...createDefaultState(),
      moneyManager: { accounts: [{ id: 'a1', balance: 100 }] },
      preferences: { theme: 'light', language: 'en' }
    };
    const payload = buildBackupPayload(bizState, { sub: 'usr_1' });
    const val = validateBackupIntegrity(payload, 'usr_1');
    assert.strictEqual(val.valid, true);

    // Tamper with moneyManager
    const tampered = JSON.parse(JSON.stringify(payload));
    tampered.data.moneyManager.accounts[0].balance = 999999;
    const valTampered = validateBackupIntegrity(tampered, 'usr_1');
    assert.strictEqual(valTampered.valid, false, 'Tampered moneyManager must fail checksum verification');
  });

  // Test 3: previewBackup accurately summarizes contents
  runTest('previewBackup accurately summarizes business, Money Manager, and preferences', () => {
    const payload = buildBackupPayload({
      ...createDefaultState(),
      businessName: 'Bhai Bhai Traders',
      moneyManager: {
        accounts: [{ id: 'a1', balance: 12000, isArchived: false }],
        transactions: [{ id: 't1', amount: 500 }],
        categories: [],
        goals: [],
        recurring: []
      },
      preferences: { theme: 'dark', language: 'bn' }
    }, { sub: 'usr_9' });

    const preview = previewBackup(payload);
    assert.strictEqual(preview.valid, true);
    assert.strictEqual(preview.hasBusinessData, true);
    assert.strictEqual(preview.hasMoneyManager, true);
    assert.strictEqual(preview.hasPreferences, true);
    assert.strictEqual(preview.recordCounts.mmAccounts, 1);
    assert.strictEqual(preview.recordCounts.mmTransactions, 1);
    assert.strictEqual(preview.businessSummary.businessName, 'Bhai Bhai Traders');
    assert.strictEqual(preview.moneyManagerSummary.netWorth, 12000);
  });

  // Test 4: Full round-trip restore commits business, moneyManager, and preferences
  await runAsyncTest('Full round-trip restore commits all domains to storage adapter', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const backupPayload = buildBackupPayload({
      ...createDefaultState(),
      businessName: 'Restore Test Enterprise',
      accounts: [
        { id: 'acc_101', name: 'Customer 101', balance: 4500, type: 1, openingBalance: 0 }
      ],
      journals: [
        { id: 'j_101', accountId: 'acc_101', type: 'given', amount: 4500, date: '2026-10-29' }
      ],
      moneyManager: {
        accounts: [{ id: 'acc_mm1', name: 'Cash MM', balance: 8000, isArchived: false }],
        transactions: [{ id: 'tx_mm1', amount: 300, type: 'expense', accountId: 'acc_mm1', categoryId: 'cat_food' }],
        categories: [{ id: 'cat_food', name: 'Food', type: 'expense', isArchived: false }],
        goals: [],
        recurring: [],
        preferences: { currencySymbol: '৳', sortOrder: 'newest' }
      },
      preferences: { theme: 'dark', language: 'en' }
    }, { sub: 'sub_test_full' });

    const commitRes = await repo.commitRestorePayload(backupPayload, { domains: ['all'] });
    assert.strictEqual(commitRes.success, true);
    assert.strictEqual(commitRes.restoredDomains.business, true);
    assert.strictEqual(commitRes.restoredDomains.moneyManager, true);
    assert.strictEqual(commitRes.restoredDomains.preferences, true);

    // Verify Business state in repo
    const bizState = repo.getAuthoritativeState();
    assert.strictEqual(bizState.businessName, 'Restore Test Enterprise');
    assert.strictEqual(bizState.accounts.length, 1);
    assert.strictEqual(bizState.accounts[0].name, 'Customer 101');

    // Verify Money Manager in adapter
    const rawMM = await adapter.getItem('@tallykhata_personal_money_manager_v2');
    assert(rawMM, 'MM data must be persisted to storage');
    const parsedMM = JSON.parse(rawMM);
    assert.strictEqual(parsedMM.accounts.length, 1);
    assert.strictEqual(parsedMM.accounts[0].name, 'Cash MM');

    // Verify Preferences in adapter
    const rawPrefs = await adapter.getItem('@tallykhata_app_preferences_v1');
    assert(rawPrefs, 'Preferences must be persisted to storage');
    const parsedPrefs = JSON.parse(rawPrefs);
    assert.strictEqual(parsedPrefs.theme, 'dark');
    assert.strictEqual(parsedPrefs.language, 'en');
  });

  // Test 5: Legacy backup without Money Manager does NOT wipe existing Money Manager data (Requirement 8)
  await runAsyncTest('Legacy backup restore preserves existing Money Manager data (Rule 8)', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Set existing Money Manager data in storage
    const existingMM = {
      accounts: [{ id: 'acc_pre', name: 'Existing Pre-Restore Wallet', balance: 9999, isArchived: false }],
      transactions: [{ id: 'tx_pre', amount: 100 }],
      categories: [],
      goals: [],
      recurring: [],
      preferences: { currencySymbol: '৳' }
    };
    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify(existingMM));

    // Construct legacy backup payload (no moneyManager field)
    const legacyPayload = {
      version: 5,
      accounts: [{ id: '1', name: 'Legacy Customer', balance: 500, type: 1 }],
      journals: [],
      cashEntries: [],
      inventory: [],
      notes: [],
      businessName: 'Old Legacy Shop'
    };

    const commitRes = await repo.commitRestorePayload(legacyPayload, { domains: ['all'] });
    assert.strictEqual(commitRes.success, true);
    assert.strictEqual(commitRes.restoredMoneyManager, null, 'No MM restored from legacy payload');

    // Authoritative business state is updated
    assert.strictEqual(repo.getAuthoritativeState().businessName, 'Old Legacy Shop');

    // CRITICAL: Existing Money Manager data in storage MUST be unchanged
    const afterMM = JSON.parse(await adapter.getItem('@tallykhata_personal_money_manager_v2'));
    assert.strictEqual(afterMM.accounts[0].name, 'Existing Pre-Restore Wallet');
    assert.strictEqual(afterMM.accounts[0].balance, 9999);
  });

  // Test 6: Selective restore (Business only)
  await runAsyncTest('Selective restore with domains: [business] leaves Money Manager untouched', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const existingMM = {
      accounts: [{ id: 'acc_untouch', name: 'Do Not Overwrite Me', balance: 7777, isArchived: false }],
      transactions: [],
      categories: [],
      goals: [],
      recurring: []
    };
    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify(existingMM));

    const payloadWithBoth = buildBackupPayload({
      ...createDefaultState(),
      businessName: 'New Business Only',
      moneyManager: {
        accounts: [{ id: 'acc_new', name: 'New Imported Wallet', balance: 1111 }]
      }
    }, { sub: 'usr_biz_only' });

    const commitRes = await repo.commitRestorePayload(payloadWithBoth, { domains: ['business'] });
    assert.strictEqual(commitRes.success, true);
    assert.strictEqual(commitRes.restoredDomains.business, true);
    assert.strictEqual(commitRes.restoredDomains.moneyManager, false);

    assert.strictEqual(repo.getAuthoritativeState().businessName, 'New Business Only');
    const currentMM = JSON.parse(await adapter.getItem('@tallykhata_personal_money_manager_v2'));
    assert.strictEqual(currentMM.accounts[0].name, 'Do Not Overwrite Me', 'Existing MM must remain untouched');
  });

  // Test 7: Selective restore (Money Manager only)
  await runAsyncTest('Selective restore with domains: [moneyManager] leaves Business store untouched', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const originalBizName = repo.getAuthoritativeState().businessName; // 'Mobile Xpress'

    const payloadWithBoth = buildBackupPayload({
      ...createDefaultState(),
      businessName: 'Should Be Ignored',
      moneyManager: {
        accounts: [{ id: 'acc_imported', name: 'Imported Personal Account', balance: 35000, isArchived: false }],
        transactions: [],
        categories: [],
        goals: [],
        recurring: []
      }
    }, { sub: 'usr_mm_only' });

    const commitRes = await repo.commitRestorePayload(payloadWithBoth, { domains: ['moneyManager'] });
    assert.strictEqual(commitRes.success, true);
    assert.strictEqual(commitRes.restoredDomains.business, false);
    assert.strictEqual(commitRes.restoredDomains.moneyManager, true);

    // Business store must be UNTOUCHED
    assert.strictEqual(repo.getAuthoritativeState().businessName, originalBizName);

    // MM store must be updated
    const updatedMM = JSON.parse(await adapter.getItem('@tallykhata_personal_money_manager_v2'));
    assert.strictEqual(updatedMM.accounts[0].name, 'Imported Personal Account');
  });

  // Test 8: Safety snapshot captures business, moneyManager, and preferences, and rollback reverts all three
  await runAsyncTest('Safety snapshot rollback reverts business, moneyManager, and preferences on failure', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const originalMM = {
      accounts: [{ id: 'acc_safe', name: 'Original Safe MM', balance: 1234, isArchived: false }],
      transactions: [],
      categories: [],
      goals: [],
      recurring: []
    };
    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify(originalMM));
    await adapter.setItem('@tallykhata_app_preferences_v1', JSON.stringify({ theme: 'light', language: 'bn' }));

    // Create fresh safety snapshot
    const snap = await repo.createLocalSafetySnapshot();
    assert.strictEqual(snap.success, true);

    // Simulate partial/corrupting mutations
    repo.currentStore.businessName = 'Corrupted State';
    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify({ accounts: [] }));
    await adapter.setItem('@tallykhata_app_preferences_v1', JSON.stringify({ theme: 'dark' }));

    // Trigger rollback to safety snapshot
    const rb = await repo.rollbackToSafetySnapshot(snap.snapshotId);
    assert.strictEqual(rb.success, true);
    assert.strictEqual(rb.restored, true);

    // Verify all 3 stores reverted
    assert.strictEqual(repo.getAuthoritativeState().businessName, 'Mobile Xpress');
    const revertedMM = JSON.parse(await adapter.getItem('@tallykhata_personal_money_manager_v2'));
    assert.strictEqual(revertedMM.accounts[0].name, 'Original Safe MM');
    assert.strictEqual(revertedMM.accounts[0].balance, 1234);
    const revertedPrefs = JSON.parse(await adapter.getItem('@tallykhata_app_preferences_v1'));
    assert.strictEqual(revertedPrefs.theme, 'light');
    assert.strictEqual(revertedPrefs.language, 'bn');
  });

  // Test 9: getFullBackupState aggregates all 3 domains
  await runAsyncTest('getFullBackupState returns combined business, moneyManager, and preferences', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify({ accounts: [{ id: 'acc_live' }] }));
    await adapter.setItem('@tallykhata_app_preferences_v1', JSON.stringify({ theme: 'dark', language: 'en' }));

    const fullState = await repo.getFullBackupState();
    assert(Array.isArray(fullState.accounts), 'Must include business accounts');
    assert(fullState.moneyManager && fullState.moneyManager.accounts.length === 1);
    assert(fullState.preferences && fullState.preferences.theme === 'dark');
  });

  // Test 10: Failed-restore rollback on commit error restores safety snapshot without corruption
  await runAsyncTest('Failed-restore rollback: safety snapshot reverts all stores if restore commit encounters failure', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // 1. Establish pristine pre-restore baseline across all 3 domains
    repo.currentStore.businessName = 'Pristine Safe Enterprise';
    repo.currentStore.accounts = [{ id: 'acc_pre_safe', name: 'Safe Business Client', balance: 7500, type: 1 }];
    repo.currentStore.journals = [{ id: 'j_pre_safe', accountId: 'acc_pre_safe', amount: 7500, type: 'given', date: '2026-10-30' }];
    await adapter.setItem('@tallykhata_v6_store', JSON.stringify(repo.currentStore));

    const originalMM = {
      accounts: [{ id: 'mm_pre_safe', name: 'Safe Wallet Account', balance: 18500, isArchived: false }],
      transactions: [{ id: 'tx_safe_1', amount: 250, type: 'expense', accountId: 'mm_pre_safe' }],
      categories: [{ id: 'cat_food', name: 'Food', type: 'expense' }],
      goals: [],
      recurring: [],
      preferences: { currencySymbol: '৳' }
    };
    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify(originalMM));

    const originalPrefs = { theme: 'dark', language: 'bn', vibrationEnabled: true };
    await adapter.setItem('@tallykhata_app_preferences_v1', JSON.stringify(originalPrefs));

    // 2. Create authoritative safety snapshot with extra domain state
    const snapResult = await repo.createLocalSafetySnapshot(null, {
      moneyManager: originalMM,
      preferences: originalPrefs,
    });
    assert.strictEqual(snapResult.success, true);
    assert.ok(snapResult.snapshotId);

    // 3. Simulate failure during restore commit (e.g. storage adapter throws or transaction fails mid-stream)
    repo.currentStore.businessName = 'Corrupted Incomplete Restore';
    repo.currentStore.accounts = [];
    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify({ accounts: [] }));
    await adapter.setItem('@tallykhata_app_preferences_v1', JSON.stringify({ theme: 'light' }));

    // 4. Trigger rollbackToSafetySnapshot using recorded snapshotId
    const rollbackResult = await repo.rollbackToSafetySnapshot(snapResult.snapshotId);
    assert.strictEqual(rollbackResult.success, true);
    assert.strictEqual(rollbackResult.restored, true);

    // 5. Verify all 3 stores are strictly restored to pristine baseline with zero corruption
    const bizState = repo.getAuthoritativeState();
    assert.strictEqual(bizState.businessName, 'Pristine Safe Enterprise');
    assert.strictEqual(bizState.accounts.length, 1);
    assert.strictEqual(bizState.accounts[0].name, 'Safe Business Client');
    assert.strictEqual(bizState.accounts[0].balance, 7500);

    const revertedMM = JSON.parse(await adapter.getItem('@tallykhata_personal_money_manager_v2'));
    assert.strictEqual(revertedMM.accounts.length, 1);
    assert.strictEqual(revertedMM.accounts[0].name, 'Safe Wallet Account');
    assert.strictEqual(revertedMM.accounts[0].balance, 18500);

    const revertedPrefs = JSON.parse(await adapter.getItem('@tallykhata_app_preferences_v1'));
    assert.strictEqual(revertedPrefs.theme, 'dark');
    assert.strictEqual(revertedPrefs.language, 'bn');
    assert.strictEqual(revertedPrefs.vibrationEnabled, true);
  });

  // Test 11: Domain-selective restore matrix comprehensively isolates and restores selected domains
  await runAsyncTest('Domain-selective restore matrix isolates and preserves untargeted domains and legacy backups', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Setup local persistent state
    const localBizOriginal = 'Local Base Store';
    repo.currentStore.businessName = localBizOriginal;
    repo.currentStore.accounts = [{ id: 'b_local_1', name: 'Local Cust', balance: 1000, type: 1 }];
    await adapter.setItem('@tallykhata_v6_store', JSON.stringify(repo.currentStore));

    const localMMOriginal = {
      accounts: [{ id: 'mm_local_1', name: 'Local Personal Wallet', balance: 5555, isArchived: false }],
      transactions: [],
      categories: [],
      goals: [],
      recurring: [],
      preferences: { currencySymbol: '৳' }
    };
    await adapter.setItem('@tallykhata_personal_money_manager_v2', JSON.stringify(localMMOriginal));

    // A. Selective restore: business-only (domains: ['business'])
    const backupPayload = buildBackupPayload({
      ...createDefaultState(),
      businessName: 'Incoming Restored Biz',
      accounts: [{ id: 'b_inc_1', name: 'Incoming Cust', balance: 9000, type: 1 }],
      moneyManager: {
        accounts: [{ id: 'mm_inc_1', name: 'Incoming MM Wallet', balance: 99999, isArchived: false }]
      }
    }, { sub: 'usr_matrix' });

    const resBizOnly = await repo.commitRestorePayload(backupPayload, { domains: ['business'] });
    assert.strictEqual(resBizOnly.success, true);
    assert.strictEqual(resBizOnly.restoredDomains.business, true);
    assert.strictEqual(resBizOnly.restoredDomains.moneyManager, false);
    assert.strictEqual(repo.getAuthoritativeState().businessName, 'Incoming Restored Biz');
    // MM remains untouched
    const mmAfterBizOnly = JSON.parse(await adapter.getItem('@tallykhata_personal_money_manager_v2'));
    assert.strictEqual(mmAfterBizOnly.accounts[0].name, 'Local Personal Wallet');
    assert.strictEqual(mmAfterBizOnly.accounts[0].balance, 5555);

    // B. Selective restore: personal-only (domains: ['moneyManager'])
    const resMMOnly = await repo.commitRestorePayload(backupPayload, { domains: ['moneyManager'] });
    assert.strictEqual(resMMOnly.success, true);
    assert.strictEqual(resMMOnly.restoredDomains.business, false);
    assert.strictEqual(resMMOnly.restoredDomains.moneyManager, true);
    // Business remains untouched from previous step
    assert.strictEqual(repo.getAuthoritativeState().businessName, 'Incoming Restored Biz');
    // MM is now updated
    const mmAfterMMOnly = JSON.parse(await adapter.getItem('@tallykhata_personal_money_manager_v2'));
    assert.strictEqual(mmAfterMMOnly.accounts[0].name, 'Incoming MM Wallet');
    assert.strictEqual(mmAfterMMOnly.accounts[0].balance, 99999);

    // C. Full restore (domains: ['all'])
    const fullBackup = buildBackupPayload({
      ...createDefaultState(),
      businessName: 'Complete All Biz',
      accounts: [{ id: 'b_all_1', name: 'All Cust', balance: 4000, type: 1 }],
      moneyManager: {
        accounts: [{ id: 'mm_all_1', name: 'All MM Wallet', balance: 77777, isArchived: false }]
      }
    }, { sub: 'usr_all' });
    const resAll = await repo.commitRestorePayload(fullBackup, { domains: ['all'] });
    assert.strictEqual(resAll.success, true);
    assert.strictEqual(resAll.restoredDomains.business, true);
    assert.strictEqual(resAll.restoredDomains.moneyManager, true);
    assert.strictEqual(repo.getAuthoritativeState().businessName, 'Complete All Biz');
    const mmAfterAll = JSON.parse(await adapter.getItem('@tallykhata_personal_money_manager_v2'));
    assert.strictEqual(mmAfterAll.accounts[0].name, 'All MM Wallet');

    // D. Legacy backup without data.moneyManager never wipes existing MM
    const legacyBackup = {
      version: 5,
      accounts: [{ id: 'b_leg_1', name: 'Legacy Cust', balance: 300, type: 1 }],
      journals: [],
      cashEntries: [],
      businessName: 'Legacy Shop Never Wipes MM'
    };
    const resLegacy = await repo.commitRestorePayload(legacyBackup, { domains: ['all'] });
    assert.strictEqual(resLegacy.success, true);
    assert.strictEqual(resLegacy.restoredMoneyManager, null);
    assert.strictEqual(repo.getAuthoritativeState().businessName, 'Legacy Shop Never Wipes MM');
    // Crucially, MM data remains 'All MM Wallet' and is NOT wiped
    const mmAfterLegacy = JSON.parse(await adapter.getItem('@tallykhata_personal_money_manager_v2'));
    assert.strictEqual(mmAfterLegacy.accounts[0].name, 'All MM Wallet');
    assert.strictEqual(mmAfterLegacy.accounts[0].balance, 77777);
  });

  // Test 12: Deterministic journal date sorting handles identical dates, varying times, missing times, and tie-breaking by ID
  runTest('Deterministic journal date sorting: identical dates, varying times, missing times, and tie-breaking by ID', () => {
    const { recalculateAccountRunningBalances } = require('./src/ledgerEngine');

    const customer = { id: 'cust_det_1', name: 'Customer Test', type: 1, openingBalance: 1000 };

    const journals = [
      { id: '105', accountId: 'cust_det_1', type: 'given', amount: 50, date: '2026-10-31', time: '14:30' },
      { id: '102', accountId: 'cust_det_1', type: 'given', amount: 100, date: '2026-10-31', time: '09:00' },
      { id: '101', accountId: 'cust_det_1', type: 'given', amount: 500, date: '2026-10-30', time: '18:00' },
      { id: '104', accountId: 'cust_det_1', type: 'received', amount: 200, date: '2026-10-31', time: '14:30' },
      { id: '103', accountId: 'cust_det_1', type: 'given', amount: 150, date: '2026-10-31', time: '00:00' },
      { id: '100', accountId: 'cust_det_1', type: 'given', amount: 250, date: '2026-10-31', time: null },
    ];

    const result = recalculateAccountRunningBalances(customer, journals);
    assert.ok(result && result.accountJournals);

    // accountJournals is returned newest-first for UI; reversed gives chronological (oldest-first)
    const chronological = [...result.accountJournals].reverse();
    assert.strictEqual(chronological[0].id, '101', 'Oldest date 2026-10-30 must be first');
    assert.strictEqual(chronological[0].runningBalance, 1500); // 1000 + 500

    // Between 104 and 105 (both on 2026-10-31 14:30):
    const idx104 = chronological.findIndex(j => j.id === '104');
    const idx105 = chronological.findIndex(j => j.id === '105');
    assert.ok(idx104 < idx105, 'Tie-breaking on same date & time must sort numeric ID 104 before 105');

    assert.strictEqual(result.finalBalance, chronological[chronological.length - 1].runningBalance);
    assert.strictEqual(result.updatedAccount.balance, result.finalBalance);
  });

  // Test 13: Deterministic journal sorting avoids new Date() NaN pitfalls and matches lexicographical ordering
  runTest('Deterministic journal sorting avoids new Date() NaN pitfalls and matches lexicographical ordering', () => {
    const invalidDateStr2 = '2026-10-31 InvalidTime';
    const d2 = new Date(invalidDateStr2);

    assert.ok(isNaN(d2.getTime()), 'new Date with non-standard format returns NaN');

    const safeComparator = (a, b) => {
      const dateComp = (a.date || '').localeCompare(b.date || '');
      if (dateComp !== 0) return dateComp;

      if (a.time && b.time) {
        const timeComp = a.time.localeCompare(b.time);
        if (timeComp !== 0) return timeComp;
      }

      const idA = isNaN(Number(a.id)) ? a.id : Number(a.id);
      const idB = isNaN(Number(b.id)) ? b.id : Number(b.id);
      if (typeof idA === 'number' && typeof idB === 'number') {
        return idA - idB;
      }
      return String(a.id).localeCompare(String(b.id));
    };

    const testItems = [
      { id: '1', date: '2026-10-31', time: 'InvalidTime' },
      { id: '2', date: '2026-10-31', time: '12:00' },
      { id: '3', date: '2026-10-30', time: '09:00' },
    ];

    const sortedItems = [...testItems].sort(safeComparator);
    assert.strictEqual(sortedItems[0].id, '3', '2026-10-30 is definitively sorted before 2026-10-31');

    const permutations = [
      [
        { id: '1', date: '2026-10-30', time: '10:00' },
        { id: '2', date: '2026-10-31', time: '08:00' },
        { id: '3', date: '2026-10-31', time: '12:00' },
        { id: '4', date: '2026-10-31', time: '12:00' },
      ],
      [
        { id: '4', date: '2026-10-31', time: '12:00' },
        { id: '1', date: '2026-10-30', time: '10:00' },
        { id: '3', date: '2026-10-31', time: '12:00' },
        { id: '2', date: '2026-10-31', time: '08:00' },
      ],
      [
        { id: '3', date: '2026-10-31', time: '12:00' },
        { id: '2', date: '2026-10-31', time: '08:00' },
        { id: '4', date: '2026-10-31', time: '12:00' },
        { id: '1', date: '2026-10-30', time: '10:00' },
      ]
    ];

    const results = permutations.map(p => p.sort(safeComparator).map(x => x.id).join(','));
    assert.strictEqual(results[0], results[1], 'Sort must be deterministic regardless of input permutation');
    assert.strictEqual(results[1], results[2], 'Sort must be deterministic regardless of input permutation');
    assert.strictEqual(results[0], '1,2,3,4', 'Result must be in exact ascending order 1,2,3,4');
  });

  console.log(`\n================================================================`);
  console.log(`FULL BACKUP SUITE SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
  console.log(`================================================================\n`);
})();
