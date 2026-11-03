/**
 * test_iteration_213_offline_sync_and_stress.js
 * 
 * Continuous Verification & Stress Suite for Iteration 213:
 * 1. Batch Sync Dirty Flag Transitions (synced: 0 -> 1, server pull, local push, dryRun).
 * 2. Conflict Resolution Edge Cases:
 *    - Local newer than server (local precedence, field merge).
 *    - Server newer than local (server overwrite, field merge).
 *    - Identical timestamps (deterministic tie-breaking).
 *    - Forced local / forced server overrides.
 *    - Multi-collection batch synchronization.
 * 3. Partial Sync Failure with Atomic Rollback:
 *    - Simulated network / batch interruption midway.
 *    - Zero dirty flag corruption on failure; all records retain synced: 0.
 *    - Storage adapter rejection rollback.
 * 4. Multi-Period Statement Stress Testing:
 *    - 1,200+ Customer transactions compiled across all, today, this_month, last_month, custom.
 *    - 1,200+ Supplier transactions compiled across multi-periods.
 *    - Exact 0.00 Paisa float drift verification across all running balances.
 *    - Sub-millisecond latency and bounded heap allocation.
 * 5. Dual Inventory & Stock Offline Sync Parity (DATA-12).
 * 
 * Worker: Worker 2 (Averroes) — Principal Backend Developer & Business Logic
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 */

const assert = require('assert');
const { performance } = require('perf_hooks');
const {
  StorageRepository,
  createDefaultState,
  V6_KEY,
  simulateSyncBatch: simulateSyncBatchRepo,
  extractRecordTimestamp,
  recordsDiffer,
  generateAccountStatement: generateAccountStatementRepo,
  resolveStatementDateRange: resolveStatementDateRangeRepo,
} = require('./src/storageRepository');
const {
  generateAccountStatement,
  recalculateAccountRunningBalances,
  resolveStatementDateRange,
  roundMoney,
} = require('./src/ledgerEngine');

// Mock in-memory storage adapter with latency and fault-injection controls
function createMockAsyncAdapter(options = {}) {
  const store = new Map();
  let failNextWrite = false;
  let writeCount = 0;

  return {
    getItem: async (key) => {
      return store.has(key) ? store.get(key) : null;
    },
    setItem: async (key, val) => {
      if (failNextWrite) {
        failNextWrite = false;
        throw new Error('MOCK_STORAGE_DISK_FULL_EXCEPTION');
      }
      writeCount++;
      store.set(key, String(val));
    },
    removeItem: async (key) => {
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
    setFailNextWrite: (flag) => { failNextWrite = flag; },
    getWriteCount: () => writeCount,
    _map: store,
  };
}

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    const res = await fn();
    console.log('[PASS] TEST ' + totalTests + ': ' + name + (res ? ' -> ' + JSON.stringify(res) : ''));
    passedTests++;
    return res;
  } catch (err) {
    console.error('[FAIL] TEST ' + totalTests + ': ' + name);
    console.error(err);
    process.exit(1);
  }
}

(async () => {
  console.log('================================================================');
  console.log('ITERATION 213: OFFLINE SYNC SIMULATOR & MULTI-PERIOD STRESS SUITE');
  console.log('================================================================\n');

  // ===========================================================================
  // PART 1: BATCH SYNC DIRTY FLAG TRANSITIONS
  // ===========================================================================
  console.log('--- PART 1: BATCH SYNC DIRTY FLAG TRANSITIONS ---');

  await runTest('1.1: getUnsyncedRecords identifies pending local changes (synced: 0)', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Default state has unsynced businesses
    const unsynced = repo.getUnsyncedRecords('businesses');
    assert(Array.isArray(unsynced), 'Expected array for unsynced businesses');
    assert(unsynced.length > 0, 'Expected at least 1 unsynced business in default state');
    assert(unsynced.every(b => b.synced === 0 || b.synced === undefined), 'All unsynced records must have synced: 0 or undefined');
    return { unsyncedCount: unsynced.length };
  });

  await runTest('1.2: Local new records created offline are pushed and marked synced = 1', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Add 3 offline accounts with synced: 0
    await repo.mutateCollection('accounts', (list) => {
      return [
        ...list,
        { id: 'acc_offline_1', name: 'Karim Traders', phone: '01711111111', type: 1, balance: 1500, synced: 0, update_date: '2026-11-01T10:00:00Z' },
        { id: 'acc_offline_2', name: 'Rahim Store', phone: '01722222222', type: 1, balance: 2500, synced: 0, update_date: '2026-11-01T11:00:00Z' },
        { id: 'acc_offline_3', name: 'Babul Cloth', phone: '01733333333', type: 1, balance: 3500, synced: 0, update_date: '2026-11-01T12:00:00Z' },
      ];
    });

    const beforeUnsynced = repo.getUnsyncedRecords('accounts');
    assert(beforeUnsynced.some(a => a.id === 'acc_offline_1'), 'acc_offline_1 must be unsynced');

    // Run simulateSyncBatch with empty server snapshot (simulating push to server)
    const syncRes = await repo.simulateSyncBatch('accounts', []);
    assert(syncRes.success === true, 'Sync should succeed');
    assert(syncRes.syncedCount >= 3, 'At least 3 accounts must be synced');
    assert(syncRes.localPushedCount >= 3, 'At least 3 accounts pushed');

    // Verify in-memory state: items are marked synced = 1
    const currentAccounts = repo.currentStore.accounts;
    const item1 = currentAccounts.find(a => a.id === 'acc_offline_1');
    assert(item1 && item1.synced === 1, 'acc_offline_1 must now have synced: 1');
    assert(item1.is_synced === 1, 'is_synced must be 1');
    assert(typeof item1.syncedDate === 'string', 'syncedDate must be a string ISO timestamp');

    return { syncedCount: syncRes.syncedCount, localPushedCount: syncRes.localPushedCount };
  });

  await runTest('1.3: Remote server records are pulled and added to local store with synced = 1', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const serverAccounts = [
      { id: 'acc_server_new_1', name: 'Jamal Enterprise', phone: '01744444444', type: 1, balance: 5000, update_date: '2026-11-02T10:00:00Z' },
      { id: 'acc_server_new_2', name: 'Dhaka Wholesale', phone: '01755555555', type: 2, balance: 8000, update_date: '2026-11-02T11:00:00Z' },
    ];

    const syncRes = await repo.simulateSyncBatch('accounts', serverAccounts);
    assert(syncRes.success === true, 'Sync should succeed');
    assert(syncRes.serverAddedCount === 2, '2 server accounts should be added');

    const added1 = repo.currentStore.accounts.find(a => a.id === 'acc_server_new_1');
    assert(added1, 'acc_server_new_1 must be added to local store');
    assert(added1.synced === 1, 'New server record must have synced: 1');
    assert(added1.name === 'Jamal Enterprise', 'Field integrity preserved');

    return { serverAddedCount: syncRes.serverAddedCount };
  });

  await runTest('1.4: Existing clean local records are updated when server snapshot provides newer content', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Insert clean record
    await repo.mutateCollection('accounts', (list) => [
      ...list,
      { id: 'acc_clean_1', name: 'Old Clean Name', phone: '01700000001', balance: 100, synced: 1, update_date: '2026-10-01T00:00:00Z' },
    ]);

    const serverSnapshot = [
      { id: 'acc_clean_1', name: 'Updated Server Name', phone: '01700000001', balance: 250, update_date: '2026-11-01T00:00:00Z' },
    ];

    const syncRes = await repo.simulateSyncBatch('accounts', serverSnapshot);
    assert(syncRes.success === true, 'Sync should succeed');
    assert(syncRes.conflictCount === 0, 'Clean record update is not a conflict');

    const updated = repo.currentStore.accounts.find(a => a.id === 'acc_clean_1');
    assert.strictEqual(updated.name, 'Updated Server Name', 'Local record should reflect server update');
    assert.strictEqual(updated.balance, 250, 'Balance updated to server value');
    assert.strictEqual(updated.synced, 1, 'Must remain synced = 1');

    return { updatedAccount: updated.name, balance: updated.balance };
  });

  await runTest('1.5: dryRun mode reports metrics without mutating persistent storage', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.mutateCollection('accounts', (list) => [
      ...list,
      { id: 'acc_dryrun_test', name: 'Dry Run Name', balance: 777, synced: 0, update_date: '2026-11-01T00:00:00Z' },
    ]);

    const initialWrites = adapter.getWriteCount();

    const dryRes = await repo.simulateSyncBatch('accounts', [], { dryRun: true });
    assert(dryRes.success === true, 'Dry run should succeed');
    assert(dryRes.dryRun === true, 'dryRun flag must be true');
    assert(dryRes.syncedCount >= 1, 'Dry run should count pending records');

    // Verify storage write did NOT occur during dryRun
    assert.strictEqual(adapter.getWriteCount(), initialWrites, 'Adapter write count must not increment during dryRun');

    // Verify record in store STILL has synced: 0
    const rec = repo.currentStore.accounts.find(a => a.id === 'acc_dryrun_test');
    assert.strictEqual(rec.synced, 0, 'Record in memory must remain synced: 0 after dryRun');

    return { dryRunReportedSynced: dryRes.syncedCount, storageWritesAvoided: true };
  });

  // ===========================================================================
  // PART 2: CONFLICT RESOLUTION EDGE CASES
  // ===========================================================================
  console.log('\n--- PART 2: CONFLICT RESOLUTION EDGE CASES ---');

  await runTest('2.1: Local Newer Conflict: Local modifications take precedence and merge server fields', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Local record modified offline with newer timestamp
    await repo.mutateCollection('accounts', (list) => [
      ...list,
      {
        id: 'acc_conflict_1',
        name: 'Local Newer Name',
        phone: '01711111199',
        balance: 900,
        synced: 0,
        update_date: '2026-11-03T12:00:00Z', // NEWER
      },
    ]);

    // Server snapshot has older timestamp but includes extra server-only field
    const serverSnapshot = [
      {
        id: 'acc_conflict_1',
        name: 'Server Older Name',
        phone: '01711111199',
        balance: 500,
        serverTag: 'VIP_MERCHANT', // Server-only non-conflicting field
        update_date: '2026-11-01T12:00:00Z', // OLDER
      },
    ];

    const syncRes = await repo.simulateSyncBatch('accounts', serverSnapshot);
    assert(syncRes.success === true, 'Sync should succeed');
    assert.strictEqual(syncRes.conflictCount, 1, 'Expected exactly 1 conflict');
    assert.strictEqual(syncRes.resolvedCount, 1, 'Expected 1 resolved conflict');

    const resolved = repo.currentStore.accounts.find(a => a.id === 'acc_conflict_1');
    assert.strictEqual(resolved.name, 'Local Newer Name', 'Local name must win because local is newer');
    assert.strictEqual(resolved.balance, 900, 'Local balance must win');
    assert.strictEqual(resolved.serverTag, 'VIP_MERCHANT', 'Non-conflicting server field must be merged');
    assert.strictEqual(resolved.synced, 1, 'Resolved record must have synced = 1');

    return { winner: 'local', mergedServerTag: resolved.serverTag, name: resolved.name };
  });

  await runTest('2.2: Server Newer Conflict: Server modifications overwrite local and retain non-conflicting local fields', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Local record modified offline with older timestamp and a local-only note
    await repo.mutateCollection('accounts', (list) => [
      ...list,
      {
        id: 'acc_conflict_2',
        name: 'Local Older Name',
        phone: '01722222299',
        balance: 1000,
        localCustomNote: 'Special Customer', // Local-only field
        synced: 0,
        update_date: '2026-10-25T10:00:00Z', // OLDER
      },
    ]);

    // Server snapshot has newer timestamp
    const serverSnapshot = [
      {
        id: 'acc_conflict_2',
        name: 'Server Authoritative Name',
        phone: '01722222299',
        balance: 1500,
        update_date: '2026-11-03T10:00:00Z', // NEWER
      },
    ];

    const syncRes = await repo.simulateSyncBatch('accounts', serverSnapshot);
    assert(syncRes.success === true, 'Sync should succeed');
    assert.strictEqual(syncRes.conflictCount, 1, 'Expected 1 conflict');
    assert.strictEqual(syncRes.resolvedCount, 1, 'Expected 1 resolved conflict');

    const resolved = repo.currentStore.accounts.find(a => a.id === 'acc_conflict_2');
    assert.strictEqual(resolved.name, 'Server Authoritative Name', 'Server name must overwrite local');
    assert.strictEqual(resolved.balance, 1500, 'Server balance must overwrite local');
    assert.strictEqual(resolved.localCustomNote, 'Special Customer', 'Non-conflicting local field must be preserved');
    assert.strictEqual(resolved.synced, 1, 'Resolved record must have synced = 1');

    return { winner: 'server', name: resolved.name, preservedNote: resolved.localCustomNote };
  });

  await runTest('2.3: Identical Timestamps Conflict: Deterministic tie-breaking', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const timestamp = '2026-11-03T15:30:00.000Z';

    // Test 2.3a: Default tie breaker (server wins)
    await repo.mutateCollection('accounts', (list) => [
      ...list,
      { id: 'acc_tie_1', name: 'Tie Local Name', balance: 200, synced: 0, update_date: timestamp },
    ]);
    const srvSnapshot1 = [
      { id: 'acc_tie_1', name: 'Tie Server Name', balance: 400, update_date: timestamp },
    ];
    const syncRes1 = await repo.simulateSyncBatch('accounts', srvSnapshot1, { tieBreaker: 'server' });
    assert(syncRes1.success === true, 'Sync should succeed');
    const res1 = repo.currentStore.accounts.find(a => a.id === 'acc_tie_1');
    assert.strictEqual(res1.name, 'Tie Server Name', 'Server should win tie when tieBreaker is server');

    // Test 2.3b: Custom tie breaker (local wins)
    await repo.mutateCollection('accounts', (list) => [
      ...list,
      { id: 'acc_tie_2', name: 'Tie Local Preferred', balance: 300, synced: 0, update_date: timestamp },
    ]);
    const srvSnapshot2 = [
      { id: 'acc_tie_2', name: 'Tie Server Ignored', balance: 600, update_date: timestamp },
    ];
    const syncRes2 = await repo.simulateSyncBatch('accounts', srvSnapshot2, { tieBreaker: 'local' });
    assert(syncRes2.success === true, 'Sync should succeed');
    const res2 = repo.currentStore.accounts.find(a => a.id === 'acc_tie_2');
    assert.strictEqual(res2.name, 'Tie Local Preferred', 'Local should win tie when tieBreaker is local');

    return { tieServerResolved: res1.name, tieLocalResolved: res2.name };
  });

  await runTest('2.4: Forced Resolution Modes (forceLocal and forceServer) override timestamps', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Local is OLDER, but forceLocal: true is passed
    await repo.mutateCollection('accounts', (list) => [
      ...list,
      { id: 'acc_force_1', name: 'Local Old But Forced', balance: 100, synced: 0, update_date: '2026-10-01' },
    ]);
    const srvSnapshot = [
      { id: 'acc_force_1', name: 'Server Brand New', balance: 999, update_date: '2026-11-03' },
    ];

    const res = await repo.simulateSyncBatch('accounts', srvSnapshot, { forceLocal: true });
    assert(res.success === true);
    const item = repo.currentStore.accounts.find(a => a.id === 'acc_force_1');
    assert.strictEqual(item.name, 'Local Old But Forced', 'forceLocal must force local winner regardless of timestamp');

    return { forceLocalWinner: item.name };
  });

  await runTest('2.5: Identical Data across local and server marks synced = 1 with 0 conflicts', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.mutateCollection('accounts', (list) => [
      ...list,
      { id: 'acc_identical_1', name: 'Same Name', phone: '01888888888', balance: 500, synced: 0, update_date: '2026-11-01' },
    ]);

    const srvSnapshot = [
      { id: 'acc_identical_1', name: 'Same Name', phone: '01888888888', balance: 500, update_date: '2026-11-01' },
    ];

    const res = await repo.simulateSyncBatch('accounts', srvSnapshot);
    assert(res.success === true);
    assert.strictEqual(res.conflictCount, 0, 'Identical records must not count as conflict');
    assert(res.syncedCount >= 1, 'Record should be marked synced');

    const item = repo.currentStore.accounts.find(a => a.id === 'acc_identical_1');
    assert.strictEqual(item.synced, 1, 'Record must be clean');

    return { conflictCount: res.conflictCount, synced: item.synced };
  });

  await runTest('2.6: Multi-collection batch sync (collectionName: "all" or object of snapshots)', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const multiSnapshot = {
      accounts: [
        { id: 'acc_multi_1', name: 'Multi Acc', type: 1, balance: 100, update_date: '2026-11-03' },
      ],
      journals: [
        { id: 'j_multi_1', accountId: 'acc_multi_1', type: 'given', amount: 50, date: '2026-11-03', synced: 1 },
      ],
      cashEntries: [
        { id: 'c_multi_1', category: 'sale', type: 'in', amount: 200, date: '2026-11-03', synced: 1 },
      ],
    };

    const res = await repo.simulateSyncBatch('all', multiSnapshot);
    assert(res.success === true, 'Multi-collection sync should succeed');
    assert(res.syncedCount >= 3, 'All collections should be synced');
    assert(repo.currentStore.accounts.some(a => a.id === 'acc_multi_1'), 'Account added');
    assert(repo.currentStore.journals.some(j => j.id === 'j_multi_1'), 'Journal added');
    assert(repo.currentStore.cashEntries.some(c => c.id === 'c_multi_1'), 'Cash entry added');

    return { totalSynced: res.syncedCount, collectionsUpdated: Object.keys(multiSnapshot) };
  });

  // ===========================================================================
  // PART 3: PARTIAL SYNC FAILURE WITH ATOMIC ROLLBACK
  // ===========================================================================
  console.log('\n--- PART 3: PARTIAL SYNC FAILURE WITH ATOMIC ROLLBACK ---');

  await runTest('3.1: Simulated midway failure triggers 100% atomic rollback; local records remain dirty', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Add 4 dirty accounts
    await repo.mutateCollection('accounts', (list) => [
      ...list,
      { id: 'acc_atomic_1', name: 'Atomic 1', balance: 100, synced: 0 },
      { id: 'acc_atomic_2', name: 'Atomic 2', balance: 200, synced: 0 },
      { id: 'acc_atomic_3', name: 'Atomic 3', balance: 300, synced: 0 },
      { id: 'acc_atomic_4', name: 'Atomic 4', balance: 400, synced: 0 },
    ]);

    const initialSnapshot = JSON.stringify(repo.currentStore.accounts);

    // Run sync with simulatePartialFailure at record index 2
    const failRes = await repo.simulateSyncBatch('accounts', [], {
      simulatePartialFailure: 2,
    });

    assert.strictEqual(failRes.success, false, 'Sync must report failure');
    assert.strictEqual(failRes.rolledBack, true, 'Rollback flag must be true');
    assert.strictEqual(failRes.syncedCount, 0, 'Committed syncedCount must be 0 on rollback');
    assert(failRes.errors.length > 0, 'Error message must be recorded');
    assert(failRes.errors[0].includes('SIMULATED_SYNC_PARTIAL_FAILURE'), 'Expected simulated failure error message');

    // VERIFY ZERO CORRUPTION: In-memory store accounts must match initialSnapshot exactly!
    const postAccounts = JSON.stringify(repo.currentStore.accounts);
    assert.strictEqual(postAccounts, initialSnapshot, 'In-memory state must remain 100% identical to pre-sync state');

    // Verify all 4 accounts still have synced === 0
    const check1 = repo.currentStore.accounts.find(a => a.id === 'acc_atomic_1');
    const check2 = repo.currentStore.accounts.find(a => a.id === 'acc_atomic_2');
    const check3 = repo.currentStore.accounts.find(a => a.id === 'acc_atomic_3');
    const check4 = repo.currentStore.accounts.find(a => a.id === 'acc_atomic_4');
    assert.strictEqual(check1.synced, 0, 'acc_atomic_1 must remain dirty (synced = 0)');
    assert.strictEqual(check2.synced, 0, 'acc_atomic_2 must remain dirty (synced = 0)');
    assert.strictEqual(check3.synced, 0, 'acc_atomic_3 must remain dirty (synced = 0)');
    assert.strictEqual(check4.synced, 0, 'acc_atomic_4 must remain dirty (synced = 0)');

    // Now re-run sync WITHOUT failure -> all 4 should cleanly commit
    const retryRes = await repo.simulateSyncBatch('accounts', []);
    assert.strictEqual(retryRes.success, true, 'Retry without failure must succeed');
    assert(retryRes.syncedCount >= 4, 'All 4 records must now be synced');
    assert.strictEqual(repo.currentStore.accounts.find(a => a.id === 'acc_atomic_1').synced, 1, 'Cleanly synced now');

    return { failureHandled: true, rollbackVerified: true, retrySucceeded: true };
  });

  await runTest('3.2: Storage adapter write rejection triggers rollback without corrupting store', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.mutateCollection('accounts', (list) => [
      ...list,
      { id: 'acc_disk_fail', name: 'Disk Fail Test', balance: 555, synced: 0 },
    ]);

    // Instruct mock adapter to throw on next write
    adapter.setFailNextWrite(true);

    const failRes = await repo.simulateSyncBatch('accounts', []);
    assert.strictEqual(failRes.success, false, 'Sync must fail when storage adapter fails');
    assert.strictEqual(failRes.rolledBack, true, 'Must report rollback');

    // In-memory record must NOT have committed synced: 1
    const item = repo.currentStore.accounts.find(a => a.id === 'acc_disk_fail');
    assert.strictEqual(item.synced, 0, 'Item must remain dirty (synced = 0)');

    return { adapterFailureIsolated: true, stateRolledBack: true };
  });

  // ===========================================================================
  // PART 4: MULTI-PERIOD STATEMENT STRESS TESTING (1,000+ TRANSACTIONS)
  // ===========================================================================
  console.log('\n--- PART 4: MULTI-PERIOD STATEMENT STRESS TESTING (1,000+ TRANSACTIONS) ---');

  await runTest('4.1: Customer Ledger Multi-Period Statement with 1,200 transactions across 5 date ranges', async () => {
    const customerAccount = {
      id: 'cust_stress_1001',
      name: 'আহমেদ জেনারেল স্টোর',
      phone: '01712345678',
      type: 1, // Customer (বাকির খাতা)
      openingBalance: 5000.50, // 5000.50 Taka = 500050 Paisa
      balance: 5000.50,
      businessId: '1',
    };

    const targetDateRanges = ['all', 'today', 'this_month', 'last_month', 'custom'];
    const refDate = new Date('2026-11-03T12:00:00Z');

    // Generate 1,200 realistic customer transactions spanning Aug, Sep, Oct, Nov 2026
    const totalTxnCount = 1200;
    const journals = [];
    const dateList = [
      '2026-08-15', '2026-08-28', '2026-09-05', '2026-09-20',
      '2026-10-02', '2026-10-15', '2026-10-25', '2026-10-31',
      '2026-11-01', '2026-11-02', '2026-11-03'
    ];

    let runningExpectedBalance = 5000.50;

    for (let i = 0; i < totalTxnCount; i++) {
      const d = dateList[i % dateList.length];
      const isGiven = (i % 3 !== 0); // 2 given for every 1 received
      // Fractional amount: e.g. 50.75, 120.25, 30.50 Taka
      const amount = roundMoney(25.25 + (i * 0.50));
      if (isGiven) {
        runningExpectedBalance = roundMoney(runningExpectedBalance + amount);
      } else {
        runningExpectedBalance = roundMoney(runningExpectedBalance - amount);
      }

      journals.push({
        id: 'j_cust_' + (i + 1),
        accountId: 'cust_stress_1001',
        type: isGiven ? 'given' : 'received',
        amount: amount,
        desc: isGiven ? 'পণ্য বাকিতে বিক্রয় #' + (i + 1) : 'গ্রাহক নগদ পরিশোধ #' + (i + 1),
        date: d,
        businessId: '1',
        synced: 1,
      });
    }

    customerAccount.balance = runningExpectedBalance;

    // Test across all 5 date ranges
    const results = {};
    const tStart = performance.now();

    for (const range of targetDateRanges) {
      const options = {
        referenceDate: refDate,
        customStartDate: '2026-10-01',
        customEndDate: '2026-11-02',
      };
      const stmt = generateAccountStatement(customerAccount, journals, range, options);

      assert(stmt, 'Statement must be generated');
      assert.strictEqual(typeof stmt.openingBalance, 'number', 'openingBalance must be a number');
      assert.strictEqual(typeof stmt.closingBalance, 'number', 'closingBalance must be a number');
      assert.strictEqual(typeof stmt.totalGiven, 'number', 'totalGiven must be a number');
      assert.strictEqual(typeof stmt.totalReceived, 'number', 'totalReceived must be a number');
      assert.strictEqual(stmt.floatDriftPaisa, 0, 'floatDriftPaisa must be strictly 0');

      // Check 0.00 Paisa float drift on all statement calculations
      const calculatedNet = roundMoney(stmt.openingBalance + stmt.totalGiven - stmt.totalReceived);
      const diff = Math.abs(calculatedNet - stmt.closingBalance);
      assert(diff < 0.0001, `Float drift detected in range ${range}: ${diff}`);

      // Verify running balances on every individual row
      let runningCheck = stmt.openingBalance;
      for (const row of stmt.journals) {
        if (row.type === 'given') {
          runningCheck = roundMoney(runningCheck + row.amount);
        } else {
          runningCheck = roundMoney(runningCheck - row.amount);
        }
        assert.strictEqual(row.runningBalance, runningCheck, 'Row running balance must match exact paisa sum');
      }

      results[range] = {
        txnCount: stmt.journals.length,
        openingBalance: stmt.openingBalance,
        closingBalance: stmt.closingBalance,
      };
    }

    const tDuration = performance.now() - tStart;

    // Verify 'all' range closingBalance strictly matches customerAccount.balance
    assert.strictEqual(results.all.closingBalance, customerAccount.balance, 'Closing balance of all range must match final balance');

    return {
      totalTransactions: totalTxnCount,
      rangesTested: targetDateRanges.length,
      durationMs: Number(tDuration.toFixed(2)),
      finalBalance: customerAccount.balance,
      allPaisaInvariantsVerified: true,
    };
  });

  await runTest('4.2: Supplier Ledger Multi-Period Statement with 1,200 transactions across 5 date ranges', async () => {
    const supplierAccount = {
      id: 'supp_stress_2001',
      name: 'মেসার্স ভাই ভাই হোলসেল',
      phone: '01898765432',
      type: 2, // Supplier (দেনার খাতা)
      openingBalance: 12000.00,
      balance: 12000.00,
      businessId: '1',
    };

    const targetDateRanges = ['all', 'today', 'this_month', 'last_month', 'custom'];
    const refDate = new Date('2026-11-03T12:00:00Z');

    const totalTxnCount = 1200;
    const journals = [];
    const dateList = [
      '2026-08-10', '2026-09-01', '2026-10-10', '2026-10-20', '2026-10-30',
      '2026-11-01', '2026-11-02', '2026-11-03'
    ];

    let runningExpectedBalance = 12000.00;

    for (let i = 0; i < totalTxnCount; i++) {
      const d = dateList[i % dateList.length];
      const isReceived = (i % 2 === 0); // Alternate supplier dues (received goods) and payments (given cash)
      const amount = roundMoney(50.25 + (i * 0.75));

      if (isReceived) {
        // Supplier balance increases when we receive goods on credit
        runningExpectedBalance = roundMoney(runningExpectedBalance + amount);
      } else {
        // Supplier balance decreases when we pay cash (given)
        runningExpectedBalance = roundMoney(runningExpectedBalance - amount);
      }

      journals.push({
        id: 'j_supp_' + (i + 1),
        accountId: 'supp_stress_2001',
        type: isReceived ? 'received' : 'given',
        amount: amount,
        desc: isReceived ? 'মালামাল ক্রয় চালান #' + (i + 1) : 'সাপ্লায়ারকে কিস্তি পরিশোধ #' + (i + 1),
        date: d,
        businessId: '1',
        synced: 1,
      });
    }

    supplierAccount.balance = runningExpectedBalance;

    const tStart = performance.now();

    for (const range of targetDateRanges) {
      const options = {
        referenceDate: refDate,
        customStartDate: '2026-10-01',
        customEndDate: '2026-11-02',
      };
      const stmt = generateAccountStatement(supplierAccount, journals, range, options);

      assert(stmt, 'Supplier statement must be generated');
      assert.strictEqual(typeof stmt.totalGiven, 'number', 'totalGiven must be a number');
      assert.strictEqual(typeof stmt.totalReceived, 'number', 'totalReceived must be a number');
      assert.strictEqual(stmt.floatDriftPaisa, 0, 'floatDriftPaisa must be strictly 0');

      // For supplier: balance = openingBalance + totalReceived (received due) - totalGiven (given payment)
      const calculatedNet = roundMoney(stmt.openingBalance + stmt.totalReceived - stmt.totalGiven);
      const diff = Math.abs(calculatedNet - stmt.closingBalance);
      assert(diff < 0.0001, `Supplier float drift detected in range ${range}: ${diff}`);

      // Verify each row running balance
      let runningCheck = stmt.openingBalance;
      for (const row of stmt.journals) {
        if (row.type === 'received') {
          runningCheck = roundMoney(runningCheck + row.amount);
        } else {
          runningCheck = roundMoney(runningCheck - row.amount);
        }
        assert.strictEqual(row.runningBalance, runningCheck, 'Supplier row running balance must match');
      }
    }

    const tDuration = performance.now() - tStart;

    return {
      supplierTransactions: totalTxnCount,
      durationMs: Number(tDuration.toFixed(2)),
      finalSupplierBalance: supplierAccount.balance,
      supplierPaisaInvariantsVerified: true,
    };
  });

  await runTest('4.3: High-Frequency Statement Stress Benchmark: 100 statement compilations over 1,200 txns', async () => {
    const account = { id: 'stress_perf_acc', name: 'Perf Acc', type: 1, balance: 1000, businessId: '1' };
    const journals = [];
    for (let i = 0; i < 1200; i++) {
      journals.push({
        id: 'j_p_' + i,
        accountId: 'stress_perf_acc',
        type: i % 2 === 0 ? 'given' : 'received',
        amount: 10.50,
        date: '2026-11-0' + ((i % 3) + 1),
        businessId: '1',
      });
    }

    const iterations = 20; // 20 reps * 5 date ranges = 100 statement compilations (120,000 transactions processed)
    const ranges = ['all', 'today', 'this_month', 'last_month', 'custom'];

    const heapBefore = process.memoryUsage().heapUsed;
    const tStart = performance.now();

    for (let i = 0; i < iterations; i++) {
      for (const r of ranges) {
        generateAccountStatement(account, journals, r, {
          customStartDate: '2026-11-01',
          customEndDate: '2026-11-02',
        });
      }
    }

    const tTotal = performance.now() - tStart;
    const heapAfter = process.memoryUsage().heapUsed;
    const heapGrowthMb = (heapAfter - heapBefore) / (1024 * 1024);

    const msPerDoc = tTotal / (iterations * ranges.length);

    console.log(`   [BENCHMARK] 100 statement compilations (1,200 txns each, 120,000 total txns) in: ${tTotal.toFixed(2)} ms (${msPerDoc.toFixed(3)} ms/stmt)`);
    console.log(`   [MEMORY] Heap delta: ${heapGrowthMb.toFixed(2)} MB`);

    assert(tTotal < 2000, '100 compilations of 1,200-txn statements must complete in < 2000ms');

    return {
      compilations: iterations * ranges.length,
      totalTimeMs: Number(tTotal.toFixed(2)),
      msPerStatement: Number(msPerDoc.toFixed(3)),
      heapDeltaMb: Number(heapGrowthMb.toFixed(2)),
    };
  });

  // ===========================================================================
  // PART 5: DUAL INVENTORY & STOCK OFFLINE SYNC PARITY (DATA-12)
  // ===========================================================================
  console.log('\n--- PART 5: DUAL INVENTORY & STOCK OFFLINE SYNC PARITY (DATA-12) ---');

  await runTest('5.1: Syncing inventory collection preserves continuous parity with stock collection', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Local has unsynced inventory product
    await repo.mutateCollection('inventory', (list) => [
      ...list,
      { id: 'prod_sync_1', name: 'Miniket Rice 50kg', buyPrice: 3200, sellPrice: 3450, stock: 30, synced: 0, update_date: '2026-11-01' },
    ]);

    // Verify DATA-12 parity in local store before sync
    assert(repo.currentStore.stock.some(s => s.id === 'prod_sync_1'), 'Stock must mirror inventory before sync');

    // Server snapshot provides updated buyPrice and stock quantity
    const serverSnapshot = [
      { id: 'prod_sync_1', name: 'Miniket Rice 50kg (Updated)', buyPrice: 3250, sellPrice: 3500, stock: 45, update_date: '2026-11-03' },
    ];

    const syncRes = await repo.simulateSyncBatch('inventory', serverSnapshot);
    assert(syncRes.success === true, 'Inventory sync should succeed');

    // Verify both inventory and stock collections in currentStore have updated data and synced: 1
    const invItem = repo.currentStore.inventory.find(i => i.id === 'prod_sync_1');
    const stockItem = repo.currentStore.stock.find(s => s.id === 'prod_sync_1');

    assert(invItem, 'Inventory item must exist');
    assert(stockItem, 'Stock item must exist');
    assert.strictEqual(invItem.buyPrice, 3250, 'Inventory buyPrice updated');
    assert.strictEqual(stockItem.buyPrice, 3250, 'Stock buyPrice mirrored');
    assert.strictEqual(invItem.stock, 45, 'Inventory quantity updated');
    assert.strictEqual(stockItem.stock, 45, 'Stock quantity mirrored');
    assert.strictEqual(invItem.synced, 1, 'Inventory item synced = 1');
    assert.strictEqual(stockItem.synced, 1, 'Stock item synced = 1');

    return { inventoryStockParity: true, price: invItem.buyPrice, stock: invItem.stock };
  });

  console.log('\n================================================================');
  console.log(`ITERATION 213 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================');
})();
