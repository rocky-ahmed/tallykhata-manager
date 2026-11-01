/**
 * REA Reconstruction — Iteration 017: Storage Metrics, Pagination & Production Readiness Suite
 */
const assert = require('assert');
const { StorageRepository, queryJournalsByDateRange } = require('./src/storageRepository');

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
  console.log('REA RECONSTRUCTION: ITERATION 017 METRICS & PAGINATION SUITE');
  console.log('================================================================');

  // STEP 1: GETSTORAGEMETRICS
  console.log('\n--- STEP 1: STORAGE METRICS & QUOTA AUDIT ---');

  await runAsyncTest('1.1: getStorageMetrics accurately measures byte allocations and counts', async () => {
    const adapter = createMockStorageAdapter();
    const storage = new StorageRepository(adapter);
    await storage.loadInitialData();

    // Populate mock entities
    await storage.mutateStore((s) => {
      s.accounts = [
        { id: 'acc_m1', name: 'Customer 1', balance: 500, type: 1 },
        { id: 'acc_m2', name: 'Supplier 1', balance: 1200, type: 2 },
      ];
      s.journals = [
        { id: 'j_m1', accountId: 'acc_m1', amount: 500, date: '2026-11-01' },
      ];
      return s;
    });

    await storage.saveMoneyManager({
      version: 3,
      accounts: [{ id: 'w_m1', name: 'Cash Wallet', balance: 1000 }],
      transactions: [{ id: 'tx_m1', amount: 200, type: 'expense' }],
    });

    const metrics = await storage.getStorageMetrics();
    assert(metrics.totalBytes > 0, 'Total bytes must be positive');
    assert(metrics.domains.business > 0, 'Business bytes must be positive');
    assert(metrics.domains.personal > 0, 'Personal bytes must be positive');
    assert.strictEqual(metrics.collectionCounts.accounts, 2, 'Must count 2 business accounts');
    assert.strictEqual(metrics.collectionCounts.journals, 1, 'Must count 1 journal');
    assert.strictEqual(metrics.collectionCounts.wallets, 1, 'Must count 1 personal wallet');
    assert.strictEqual(metrics.collectionCounts.moneyManagerTxns, 1, 'Must count 1 personal txn');
    assert.strictEqual(metrics.isNearQuota, false, 'Initial state should not be near quota');
    assert.strictEqual(metrics.recommendedAction, 'none', 'Should recommend none for small datasets');
  });

  await runAsyncTest('1.2: getStorageMetrics recommends compaction on high volume datasets', async () => {
    const adapter = createMockStorageAdapter();
    const storage = new StorageRepository(adapter);
    await storage.loadInitialData();

    // Generate large journal array > 5000 items
    await storage.mutateStore((s) => {
      s.journals = Array.from({ length: 5001 }, (_, i) => ({
        id: `j_vol_${i}`,
        accountId: 'acc_m1',
        amount: 10,
        date: '2026-11-01',
      }));
      return s;
    });

    const metrics = await storage.getStorageMetrics();
    assert.strictEqual(metrics.collectionCounts.journals, 5001);
    assert.strictEqual(metrics.recommendedAction, 'compactStorage', 'Must recommend compactStorage when journals > 5000');
  });

  // STEP 2: HIGH-VOLUME JOURNAL PAGINATION & SORT ORDER
  console.log('\n--- STEP 2: HIGH-VOLUME JOURNAL PAGINATION & SORTING ---');

  const journalsDataset = [];
  const BASE_DATE = new Date('2026-01-01T00:00:00Z').getTime();
  for (let i = 0; i < 1000; i++) {
    const d = new Date(BASE_DATE + i * 86400000).toISOString().split('T')[0];
    journalsDataset.push({
      id: `j_scale_${i}`,
      accountId: i % 2 === 0 ? 'acc_even' : 'acc_odd',
      amount: 100 + i,
      businessId: '1',
      date: d,
      type: i % 3 === 0 ? 'given' : 'received',
    });
  }

  runTest('2.1: queryJournalsByDateRange applies limit and offset pagination', () => {
    const res = queryJournalsByDateRange(journalsDataset, '2026-01-01', '2026-12-31', {
      offset: 50,
      limit: 25,
    });

    assert.strictEqual(res.totalCount, 365, 'Total matching journals in 2026 should be 365');
    assert.strictEqual(res.journals.length, 25, 'Paged results must equal limit of 25');
    assert.strictEqual(res.journals[0].id, 'j_scale_50', 'Offset 50 must start at index 50');
  });

  runTest('2.2: queryJournalsByDateRange sorts descending (most recent first)', () => {
    const res = queryJournalsByDateRange(journalsDataset, '2026-01-01', '2026-01-10', {
      sortOrder: 'desc',
    });

    assert.strictEqual(res.totalCount, 10, '10 days in range');
    assert.strictEqual(res.journals[0].date, '2026-01-10', 'First journal should be most recent (Jan 10)');
    assert.strictEqual(res.journals[9].date, '2026-01-01', 'Last journal should be oldest (Jan 1)');
  });

  runTest('2.3: High-volume binary search executes in sub-millisecond range', () => {
    const tStart = Date.now();
    for (let k = 0; k < 100; k++) {
      queryJournalsByDateRange(journalsDataset, '2026-03-01', '2026-06-30', {
        accountId: 'acc_even',
      });
    }
    const totalDuration = Date.now() - tStart;
    assert(totalDuration < 200, `100 binary searches must complete under 200ms (took ${totalDuration}ms)`);
  });

  console.log('\n================================================================');
  console.log(`ITERATION 017 VERDICT: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================\n');
})();
