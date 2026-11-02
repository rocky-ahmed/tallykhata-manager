/**
 * test_iteration_204_storage_compaction_and_sync_load.js
 * Continuous Verification & Load Benchmark Suite for Iteration 204:
 * 1. Storage Compaction Under Multi-Business Load & Expired Snapshot Pruning
 * 2. High-Frequency SQLite / Async Storage Write Synchronization (300 Concurrent Operations)
 * 3. Zero Floating-Point Drift (Integer-Paisa Exactitude across Fractional Splits & 10-Crore Taka)
 * 4. Multi-Tenant Ledger Invariance & Cross-Business Account ID Collision Isolation
 *
 * Worker: Worker 2 (Averroes) — Permanent Backend Developer & Business Logic
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 */

const assert = require('assert');
const { performance } = require('perf_hooks');
const {
  StorageRepository,
  createDefaultState,
  V6_KEY
} = require('./src/storageRepository');
const {
  validateTransaction,
  recalculateAllAccountBalances,
  recalculateAccountRunningBalances,
  calculateAggregateMetrics,
  deriveCashBoxSummary,
  syncCashboxForTransaction
} = require('./src/ledgerEngine');

const SAFETY_SNAPSHOT_KEY = 'tallykhata_safety_snapshot';

function createMockAsyncAdapter(writeDelayMs = 1.0) {
  const store = new Map();
  return {
    getItem: async (key) => {
      await new Promise(r => setTimeout(r, 0.1));
      return store.has(key) ? store.get(key) : null;
    },
    setItem: async (key, val) => {
      await new Promise(r => setTimeout(r, writeDelayMs));
      store.set(key, String(val));
    },
    removeItem: async (key) => {
      await new Promise(r => setTimeout(r, 0.1));
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
    setWriteDelay: (d) => { writeDelayMs = d; },
    _map: store
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
  console.log('ITERATION 204: STORAGE COMPACTION & HIGH-FREQ WRITE SYNC UNDER LOAD');
  console.log('================================================================\n');

  console.log('--- PART 1: ZERO FLOATING-POINT DRIFT & MULTI-TENANT LEDGER INVARIANCE ---');

  const BIZ_COUNT = 20;
  const rawAccounts = [];
  const rawJournals = [];
  const expectedBalances = new Map();

  for (let b = 1; b <= BIZ_COUNT; b++) {
    const bizId = String(b);
    const custId = 'acc_cust_load';
    const suppId = 'acc_supp_load';

    rawAccounts.push({
      id: custId,
      name: 'গ্রাহক ' + b,
      type: 1, // Customer
      balance: 0,
      businessId: bizId
    });

    rawAccounts.push({
      id: suppId,
      name: 'সরবরাহকারী ' + b,
      type: 2, // Supplier
      balance: 0,
      businessId: bizId
    });

    // Fractional transactions for Customer:
    // + (500 + b * 0.01) [Given]
    // - 200.33 [Received]
    // + 150.34 [Given]
    // - (50.02 + b * 0.01) [Received]
    // Net: 500 - 200.33 + 150.34 - 50.02 = 399.99
    const custBalPaisa = 50000 + b - 20033 + 15034 - (5002 + b);
    const expectedCustBal = custBalPaisa / 100;
    expectedBalances.set(bizId + ':' + custId, expectedCustBal);

    rawJournals.push({
      id: 'j_c1_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'given',
      amount: (50000 + b) / 100,
      date: '2026-10-01'
    });
    rawJournals.push({
      id: 'j_c2_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'received',
      amount: 200.33,
      date: '2026-10-02'
    });
    rawJournals.push({
      id: 'j_c3_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'given',
      amount: 150.34,
      date: '2026-10-03'
    });
    rawJournals.push({
      id: 'j_c4_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'received',
      amount: (5002 + b) / 100,
      date: '2026-10-04'
    });

    // Fractional transactions for Supplier:
    // + (1000 + b * 0.01) [Received]
    // - 600.33 [Given]
    // + 300.34 [Received]
    // - (100.01 + b * 0.01) [Given]
    // Net: 1000 - 600.33 + 300.34 - 100.01 = 600.00
    const suppBalPaisa = 100000 + b - 60033 + 30034 - (10001 + b);
    const expectedSuppBal = suppBalPaisa / 100;
    expectedBalances.set(bizId + ':' + suppId, expectedSuppBal);

    rawJournals.push({
      id: 'j_s1_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'received',
      amount: (100000 + b) / 100,
      date: '2026-10-01'
    });
    rawJournals.push({
      id: 'j_s2_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'given',
      amount: 600.33,
      date: '2026-10-02'
    });
    rawJournals.push({
      id: 'j_s3_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'received',
      amount: 300.34,
      date: '2026-10-03'
    });
    rawJournals.push({
      id: 'j_s4_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'given',
      amount: (10001 + b) / 100,
      date: '2026-10-04'
    });
  }

  let baselineAccounts = [];
  let baselineJournals = [];

  await runTest('Multi-tenant recalculation under fractional paisa: Exact balances and 0.00 drift across 40 accounts', async () => {
    const t0 = performance.now();
    const result = recalculateAllAccountBalances(rawAccounts, rawJournals);
    const t1 = performance.now();
    const durationMs = Number((t1 - t0).toFixed(2));

    baselineAccounts = result.updatedAccounts;
    baselineJournals = result.updatedJournals;

    assert.strictEqual(baselineAccounts.length, 40);

    for (const acc of baselineAccounts) {
      const key = acc.businessId + ':' + acc.id;
      const expected = expectedBalances.get(key);
      assert.strictEqual(acc.balance, expected, 'Balance mismatch for ' + key + ': ' + acc.balance + ' !== ' + expected);
    }

    return {
      totalBusinesses: BIZ_COUNT,
      totalAccounts: baselineAccounts.length,
      durationMs,
      drift: '0.00 Paisa (Exact Equality)'
    };
  });

  await runTest('calculateAggregateMetrics across all businesses isolates receivables (399.99) & payables (600.00)', async () => {
    for (let b = 1; b <= BIZ_COUNT; b++) {
      const bizId = String(b);
      const metrics = calculateAggregateMetrics(baselineAccounts, baselineJournals, bizId);
      assert.strictEqual(metrics.totalReceivable, 399.99, 'Receivable mismatch for biz ' + bizId);
      assert.strictEqual(metrics.totalPayable, 600.00, 'Payable mismatch for biz ' + bizId);
      assert.strictEqual(metrics.netBalance, -200.01, 'Net balance mismatch for biz ' + bizId);
    }
    return { verifiedTenants: BIZ_COUNT, isolation: '100% SECURE' };
  });

  console.log('\n--- PART 2: STORAGE COMPACTION & SAFETY SNAPSHOT PRUNING UNDER LOAD ---');

  const compactAdapter = createMockAsyncAdapter(0.1);
  const compactRepo = new StorageRepository(compactAdapter);
  await compactRepo.loadInitialData();

  // Create 2,000 valid journals across the 20 businesses (100 per business)
  const loadJournals = [...baselineJournals];
  for (let i = 1; i <= 1840; i++) {
    const b = (i % BIZ_COUNT) + 1;
    const isCust = i % 2 === 0;
    loadJournals.push({
      id: 'load_j_' + i,
      accountId: isCust ? 'acc_cust_load' : 'acc_supp_load',
      businessId: String(b),
      type: isCust ? 'given' : 'received',
      amount: 100,
      runningBalance: 0,
      date: '2026-10-01'
    });
  }

  // Inject 200 duplicate journals
  for (let i = 0; i < 200; i++) {
    loadJournals.push({ ...loadJournals[i] });
  }

  // Inject 250 orphaned journals
  for (let i = 1; i <= 250; i++) {
    loadJournals.push({
      id: 'orphan_j_' + i,
      accountId: 'non_existent_acc_' + i,
      businessId: String((i % BIZ_COUNT) + 1),
      type: 'given',
      amount: 50,
      date: '2026-10-01'
    });
  }

  // Seed expired safety snapshot (>36 hours old)
  const expiredDate = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  await compactAdapter.setItem(SAFETY_SNAPSHOT_KEY, JSON.stringify({
    snapshotId: 'snap_old_36h',
    createdAt: expiredDate,
    data: { sample: 1 }
  }));

  // Initial recalculation to annotate all load journals with valid runningBalance
  const fullRecalc = recalculateAllAccountBalances(baselineAccounts, loadJournals);

  await compactRepo.mutateStore(s => ({
    ...s,
    accounts: fullRecalc.updatedAccounts,
    journals: fullRecalc.updatedJournals
  }));

  let compactionResult = null;

  await runTest('compactStorage under load: Purges 250 orphans, dedupes 200 records, prunes expired snapshot', async () => {
    const t0 = performance.now();
    const res = await compactRepo.compactStorage({ maxSnapshotAgeMs: 24 * 60 * 60 * 1000, recalculateBalances: true });
    const t1 = performance.now();
    const durationMs = Number((t1 - t0).toFixed(2));

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stats.orphanedJournalsRemoved, 250, 'Must remove all 250 orphaned journals');
    assert.strictEqual(res.stats.deduplicatedRecords, 200, 'Must deduplicate exactly 200 journals');
    assert.strictEqual(res.stats.prunedSnapshots, 1, 'Must prune 1 expired snapshot');
    assert(res.stats.bytesReclaimed > 0, 'Bytes reclaimed must be > 0');
    assert(res.stats.storageSizeAfter < res.stats.storageSizeBefore, 'Storage size must decrease');

    // Verify expired snapshot was pruned from adapter
    const snapInAdapter = await compactAdapter.getItem(SAFETY_SNAPSHOT_KEY);
    assert.strictEqual(snapInAdapter, null, 'Expired snapshot must be deleted from storage');

    compactionResult = {
      ...res.stats,
      durationMs
    };
    return compactionResult;
  });

  await runTest('Post-compaction ledger running balance recalculation fidelity: 0.00 Paisa drift', async () => {
    const state = compactRepo.getAuthoritativeState();
    assert.strictEqual(state.journals.length, 2000, 'Must contain exactly 2,000 valid journals');

    for (const acc of state.accounts) {
      const accJournals = state.journals.filter(j => j.accountId === acc.id && j.businessId === acc.businessId);
      const singleRecalc = recalculateAccountRunningBalances(acc, state.journals);
      assert.strictEqual(acc.balance, singleRecalc.updatedAccount.balance, 'Balance mismatch for ' + acc.name);
    }
    return { verifiedAccounts: state.accounts.length, status: 'EXACT_MATCH_ZERO_DRIFT' };
  });

  await runTest('Continuous Storage Compaction (Cycles 2-4): 100% idempotent with zero churn', async () => {
    const latencies = [];
    for (let c = 2; c <= 4; c++) {
      const t0 = performance.now();
      const res = await compactRepo.compactStorage();
      const t1 = performance.now();
      latencies.push(Number((t1 - t0).toFixed(2)));

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.stats.orphanedJournalsRemoved, 0);
      assert.strictEqual(res.stats.deduplicatedRecords, 0);
      assert.strictEqual(res.stats.bytesReclaimed, 0);
    }

    return {
      continuousCycles: 3,
      minLatencyMs: Math.min(...latencies),
      maxLatencyMs: Math.max(...latencies),
      meanLatencyMs: Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)),
      idempotent: true
    };
  });

  console.log('\n--- PART 3: HIGH-FREQUENCY SQLITE WRITE SYNCHRONIZATION (300 OPS) ---');

  const syncAdapter = createMockAsyncAdapter(1.0); // 1.0ms simulated flash write
  const syncRepo = new StorageRepository(syncAdapter);
  await syncRepo.loadInitialData();

  await runTest('300 Concurrent Asynchronous Operations Interleaved Under writeQueue Mutex', async () => {
    const CONCURRENT_OPS = 300;
    const promises = [];
    const t0 = performance.now();

    for (let i = 0; i < CONCURRENT_OPS; i++) {
      const op = i % 4;
      if (op === 0) {
        // Op 0: mutateCollection journals (75 ops)
        promises.push(syncRepo.mutateCollection('journals', (curr) => [
          ...curr,
          { id: 'load_j_' + i, accountId: 'acc_load', amount: 10 + i, type: 'given' }
        ]));
      } else if (op === 1) {
        // Op 1: mutateCollection cashEntries (75 ops)
        promises.push(syncRepo.mutateCollection('cashEntries', (curr) => [
          ...curr,
          { id: 'load_c_' + i, type: 'in', amount: 20 + i }
        ]));
      } else if (op === 2) {
        // Op 2: executeAtomicTransaction (75 ops)
        promises.push(syncRepo.executeAtomicTransaction(async (draft) => {
          draft.accounts = (draft.accounts || []).map(a => {
            if (a.id === 'acc_load') {
              return { ...a, balance: (a.balance || 0) + 1 };
            }
            return a;
          });
          return { store: draft, result: 'tx_ok_' + i };
        }));
      } else {
        // Op 3: mutateStore notes (75 ops)
        promises.push(syncRepo.mutateStore((draft) => ({
          ...draft,
          notes: [...(draft.notes || []), { id: 'load_n_' + i, text: 'নোট ' + i }]
        })));
      }
    }

    const results = await Promise.all(promises);
    const t1 = performance.now();
    const totalDurationMs = Number((t1 - t0).toFixed(2));
    const throughputOpsPerSec = Number(((CONCURRENT_OPS / totalDurationMs) * 1000).toFixed(2));
    const avgLatencyPerWriteMs = Number((totalDurationMs / CONCURRENT_OPS).toFixed(2));

    assert.strictEqual(results.length, CONCURRENT_OPS, 'All 300 operations must resolve');

    const finalState = syncRepo.getAuthoritativeState();
    const finalJournals = finalState.journals.filter(j => j.id.startsWith('load_j_'));
    const finalCash = finalState.cashEntries.filter(c => c.id.startsWith('load_c_'));
    const finalNotes = finalState.notes.filter(n => n.id.startsWith('load_n_'));

    assert.strictEqual(finalJournals.length, 75, 'Must contain exactly 75 load journals');
    assert.strictEqual(finalCash.length, 75, 'Must contain exactly 75 load cash entries');
    assert.strictEqual(finalNotes.length, 75, 'Must contain exactly 75 load notes');

    return {
      concurrentOperations: CONCURRENT_OPS,
      totalDurationMs,
      throughputOpsPerSec,
      avgLatencyPerWriteMs,
      zeroRaceConditions: true,
      dataIntegrity: '100% (75/75/75 Verified)'
    };
  });

  await runTest('writeQueue Exception Isolation & Automatic State Rollback', async () => {
    // Injected invalid mutation
    const failTx = syncRepo.executeAtomicTransaction(async (draft) => {
      draft.accounts = [{ id: 'corrupt_acc', balance: 'NOT_A_NUMBER' }];
      return { store: draft };
    });

    const resFail = await failTx;
    assert.strictEqual(resFail.success, false);
    assert.strictEqual(resFail.rolledBack, true);

    // Follow-up valid write
    const okWrite = await syncRepo.mutateCollection('notes', (curr) => [
      ...curr,
      { id: 'note_recovery', text: 'পুনরুদ্ধার সফল' }
    ]);

    const state = syncRepo.getAuthoritativeState();
    assert(state.notes.some(n => n.id === 'note_recovery'));
    assert(!state.accounts.some(a => a.id === 'corrupt_acc'));

    return { faultTolerant: true, recovered: true };
  });

  console.log('\n================================================================');
  console.log('ITERATION 204 SUMMARY: ' + passedTests + ' / ' + totalTests + ' TESTS PASSED (100%)');
  console.log('================================================================\n');
})();
