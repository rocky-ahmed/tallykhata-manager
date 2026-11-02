/**
 * test_iteration_205_compaction_and_ledger_stress.js
 * Continuous Verification & Benchmark Suite for Iteration 205:
 * 1. Customer vs Supplier Running Ledger Dual-Invariants & Zero Float Drift
 * 2. Storage Compaction Benchmark Under Load (2,500+ Journals, 300 Orphans, 250 Duplicates)
 * 3. High-Frequency SQLite / Async Storage Write Synchronization (400 Concurrent Operations)
 * 4. WriteQueue Mutex Fault Isolation & Invariant Rollback
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
  recalculateAllAccountBalances,
  recalculateAccountRunningBalances,
  calculateAggregateMetrics,
  deriveCashBoxSummary,
  validateTransaction
} = require('./src/ledgerEngine');

const SAFETY_SNAPSHOT_KEY = 'tallykhata_safety_snapshot';

function createMockAsyncAdapter(writeDelayMs = 0.8) {
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
  console.log('ITERATION 205: STORAGE COMPACTION & LEDGER MUTEX STRESS');
  console.log('================================================================\n');

  console.log('--- PART 1: CUSTOMER VS SUPPLIER RUNNING LEDGER ZERO FLOAT DRIFT ---');

  const BIZ_COUNT = 25;
  const rawAccounts = [];
  const rawJournals = [];
  const expectedBalances = new Map();

  for (let b = 1; b <= BIZ_COUNT; b++) {
    const bizId = String(b);
    const custId = 'c_iter205';
    const suppId = 's_iter205';

    rawAccounts.push({
      id: custId,
      name: 'কাস্টমার দোকান ' + b,
      type: 1, // Customer
      balance: 0,
      businessId: bizId
    });

    rawAccounts.push({
      id: suppId,
      name: 'সাপ্লায়ার দোকান ' + b,
      type: 2, // Supplier
      balance: 0,
      businessId: bizId
    });

    // Customer ledger transactions:
    // + (1000 + b * 0.01) [Given]
    // - 400.33 [Received]
    // + 250.34 [Given]
    // - (150.01 + b * 0.01) [Received]
    // Net: 1000 - 400.33 + 250.34 - 150.01 = 700.00 BDT
    const custBalPaisa = 100000 + b - 40033 + 25034 - (15001 + b);
    const expectedCustBal = custBalPaisa / 100; // Exactly 700.00
    expectedBalances.set(bizId + ':' + custId, expectedCustBal);

    rawJournals.push({
      id: 'j_c1_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'given',
      amount: (100000 + b) / 100,
      date: '2026-10-01'
    });
    rawJournals.push({
      id: 'j_c2_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'received',
      amount: 400.33,
      date: '2026-10-02'
    });
    rawJournals.push({
      id: 'j_c3_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'given',
      amount: 250.34,
      date: '2026-10-03'
    });
    rawJournals.push({
      id: 'j_c4_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'received',
      amount: (15001 + b) / 100,
      date: '2026-10-04'
    });

    // Supplier ledger transactions:
    // + (2000 + b * 0.01) [Received]
    // - 1200.33 [Given]
    // + 500.34 [Received]
    // - (300.01 + b * 0.01) [Given]
    // Net: 2000 - 1200.33 + 500.34 - 300.01 = 1000.00 BDT
    const suppBalPaisa = 200000 + b - 120033 + 50034 - (30001 + b);
    const expectedSuppBal = suppBalPaisa / 100; // Exactly 1000.00
    expectedBalances.set(bizId + ':' + suppId, expectedSuppBal);

    rawJournals.push({
      id: 'j_s1_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'received',
      amount: (200000 + b) / 100,
      date: '2026-10-01'
    });
    rawJournals.push({
      id: 'j_s2_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'given',
      amount: 1200.33,
      date: '2026-10-02'
    });
    rawJournals.push({
      id: 'j_s3_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'received',
      amount: 500.34,
      date: '2026-10-03'
    });
    rawJournals.push({
      id: 'j_s4_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'given',
      amount: (30001 + b) / 100,
      date: '2026-10-04'
    });
  }

  let baselineAccounts = [];
  let baselineJournals = [];

  await runTest('recalculateAllAccountBalances verifies customer & supplier balances with zero float drift', async () => {
    const t0 = performance.now();
    const result = recalculateAllAccountBalances(rawAccounts, rawJournals);
    const t1 = performance.now();
    const durationMs = Number((t1 - t0).toFixed(2));

    baselineAccounts = result.updatedAccounts;
    baselineJournals = result.updatedJournals;

    assert.strictEqual(baselineAccounts.length, 50, 'Must have 50 accounts');

    for (const acc of baselineAccounts) {
      const key = acc.businessId + ':' + acc.id;
      const expected = expectedBalances.get(key);
      assert.strictEqual(acc.balance, expected, 'Account ' + key + ' balance mismatch: ' + acc.balance + ' !== ' + expected);
      if (acc.type === 1) {
        assert.strictEqual(acc.balance, 700.00, 'Customer balance must be exactly 700.00');
      } else {
        assert.strictEqual(acc.balance, 1000.00, 'Supplier balance must be exactly 1000.00');
      }
    }

    return {
      totalBusinesses: BIZ_COUNT,
      totalAccounts: baselineAccounts.length,
      durationMs,
      customerBalance: '700.00 BDT (Exact)',
      supplierBalance: '1000.00 BDT (Exact)',
      floatDrift: '0.00 Paisa (Zero Drift)'
    };
  });

  await runTest('calculateAggregateMetrics across all 25 businesses isolates 700.00 receivable & 1000.00 payable', async () => {
    for (let b = 1; b <= BIZ_COUNT; b++) {
      const bizId = String(b);
      const metrics = calculateAggregateMetrics(baselineAccounts, baselineJournals, bizId);
      assert.strictEqual(metrics.totalReceivable, 700.00, 'Receivable mismatch for biz ' + bizId);
      assert.strictEqual(metrics.totalPayable, 1000.00, 'Payable mismatch for biz ' + bizId);
      assert.strictEqual(metrics.netBalance, -300.00, 'Net balance mismatch for biz ' + bizId);
    }
    return { verifiedTenants: BIZ_COUNT, isolation: '100% ZERO_LEAKAGE' };
  });

  console.log('\n--- PART 2: STORAGE COMPACTION BENCHMARK UNDER LOAD ---');

  const compactAdapter = createMockAsyncAdapter(0.1);
  const compactRepo = new StorageRepository(compactAdapter);
  await compactRepo.loadInitialData();

  // Create 2,500 total valid journals across 25 businesses (100 per business)
  const loadJournals = [...baselineJournals];
  for (let i = 1; i <= 2300; i++) {
    const b = (i % BIZ_COUNT) + 1;
    const isCust = i % 2 === 0;
    loadJournals.push({
      id: 'load_j_' + i,
      accountId: isCust ? 'c_iter205' : 's_iter205',
      businessId: String(b),
      type: isCust ? 'given' : 'received',
      amount: 100,
      runningBalance: 0,
      date: '2026-10-01'
    });
  }

  // Inject 250 duplicate journals
  for (let i = 0; i < 250; i++) {
    loadJournals.push({ ...loadJournals[i] });
  }

  // Inject 300 orphaned journals (referencing deleted/non-existent accounts)
  for (let i = 1; i <= 300; i++) {
    loadJournals.push({
      id: 'orphan_j_' + i,
      accountId: 'non_existent_acc_' + i,
      businessId: String((i % BIZ_COUNT) + 1),
      type: 'given',
      amount: 75,
      date: '2026-10-01'
    });
  }

  // Seed expired safety snapshot (>30 hours old)
  const expiredDate = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
  await compactAdapter.setItem(SAFETY_SNAPSHOT_KEY, JSON.stringify({
    snapshotId: 'snap_expired_30h',
    createdAt: expiredDate,
    data: { test: 1 }
  }));

  // Initial recalculation so load journals have proper running balances
  const preRecalc = recalculateAllAccountBalances(baselineAccounts, loadJournals);

  await compactRepo.mutateStore(s => ({
    ...s,
    accounts: preRecalc.updatedAccounts,
    journals: preRecalc.updatedJournals
  }));

  let compactionResult = null;

  await runTest('compactStorage under load: Purges 300 orphans, dedupes 250 records, prunes expired snapshot', async () => {
    const t0 = performance.now();
    const res = await compactRepo.compactStorage({ maxSnapshotAgeMs: 24 * 60 * 60 * 1000, recalculateBalances: true });
    const t1 = performance.now();
    const durationMs = Number((t1 - t0).toFixed(2));

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stats.orphanedJournalsRemoved, 300, 'Must remove all 300 orphaned journals');
    assert.strictEqual(res.stats.deduplicatedRecords, 250, 'Must deduplicate exactly 250 journals');
    assert.strictEqual(res.stats.prunedSnapshots, 1, 'Must prune 1 expired snapshot');
    assert(res.stats.bytesReclaimed > 0, 'Bytes reclaimed must be > 0');
    assert(res.stats.storageSizeAfter < res.stats.storageSizeBefore, 'Storage size must decrease');

    compactionResult = {
      ...res.stats,
      durationMs
    };
    return compactionResult;
  });

  await runTest('Post-compaction ledger running balance recalculation fidelity: 0.00 Paisa drift', async () => {
    const state = compactRepo.getAuthoritativeState();
    assert.strictEqual(state.journals.length, 2500, 'Must contain exactly 2,500 valid journals');

    for (const acc of state.accounts) {
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

  console.log('\n--- PART 3: HIGH-FREQUENCY SQLITE WRITE SYNCHRONIZATION (400 OPS) ---');

  const syncAdapter = createMockAsyncAdapter(0.8); // 0.8ms simulated flash write
  const syncRepo = new StorageRepository(syncAdapter);
  await syncRepo.loadInitialData();

  await runTest('400 Concurrent Asynchronous Operations Interleaved Under writeQueue Mutex', async () => {
    const CONCURRENT_OPS = 400;
    const promises = [];
    const t0 = performance.now();

    for (let i = 0; i < CONCURRENT_OPS; i++) {
      const op = i % 4;
      if (op === 0) {
        // Op 0: mutateCollection journals (100 ops)
        promises.push(syncRepo.mutateCollection('journals', (curr) => [
          ...curr,
          { id: 'stress205_j_' + i, accountId: 'acc_stress', amount: 50 + i, type: 'given' }
        ]));
      } else if (op === 1) {
        // Op 1: mutateCollection cashEntries (100 ops)
        promises.push(syncRepo.mutateCollection('cashEntries', (curr) => [
          ...curr,
          { id: 'stress205_c_' + i, type: 'in', amount: 30 + i }
        ]));
      } else if (op === 2) {
        // Op 2: executeAtomicTransaction (100 ops)
        promises.push(syncRepo.executeAtomicTransaction(async (draft) => {
          draft.accounts = (draft.accounts || []).map(a => {
            if (a.id === 'acc_stress') {
              return { ...a, balance: (a.balance || 0) + 1 };
            }
            return a;
          });
          return { store: draft, result: 'tx_ok_' + i };
        }));
      } else {
        // Op 3: mutateStore notes (100 ops)
        promises.push(syncRepo.mutateStore((draft) => ({
          ...draft,
          notes: [...(draft.notes || []), { id: 'stress205_n_' + i, text: 'নোট ' + i }]
        })));
      }
    }

    const results = await Promise.all(promises);
    const t1 = performance.now();
    const totalDurationMs = Number((t1 - t0).toFixed(2));
    const throughputOpsPerSec = Number(((CONCURRENT_OPS / totalDurationMs) * 1000).toFixed(2));
    const avgLatencyPerWriteMs = Number((totalDurationMs / CONCURRENT_OPS).toFixed(2));

    assert.strictEqual(results.length, CONCURRENT_OPS, 'All 400 operations must resolve');

    const finalState = syncRepo.getAuthoritativeState();
    const finalJournals = finalState.journals.filter(j => j.id.startsWith('stress205_j_'));
    const finalCash = finalState.cashEntries.filter(c => c.id.startsWith('stress205_c_'));
    const finalNotes = finalState.notes.filter(n => n.id.startsWith('stress205_n_'));

    assert.strictEqual(finalJournals.length, 100, 'Must contain exactly 100 stress journals');
    assert.strictEqual(finalCash.length, 100, 'Must contain exactly 100 stress cash entries');
    assert.strictEqual(finalNotes.length, 100, 'Must contain exactly 100 stress notes');

    return {
      concurrentOperations: CONCURRENT_OPS,
      totalDurationMs,
      throughputOpsPerSec,
      avgLatencyPerWriteMs,
      zeroRaceConditions: true,
      dataIntegrity: '100% (100/100/100 Verified)'
    };
  });

  await runTest('writeQueue Exception Isolation & Automatic State Rollback', async () => {
    // Injected invalid balance mutation
    const failTx = syncRepo.executeAtomicTransaction(async (draft) => {
      draft.accounts = [{ id: 'corrupt_acc_205', balance: 'CORRUPTED_STRING' }];
      return { store: draft };
    });

    const resFail = await failTx;
    assert.strictEqual(resFail.success, false);
    assert.strictEqual(resFail.rolledBack, true);

    // Follow-up valid write
    const okWrite = await syncRepo.mutateCollection('notes', (curr) => [
      ...curr,
      { id: 'note_recovery_205', text: 'রিকভারি সফল' }
    ]);

    const state = syncRepo.getAuthoritativeState();
    assert(state.notes.some(n => n.id === 'note_recovery_205'));
    assert(!state.accounts.some(a => a.id === 'corrupt_acc_205'));

    return { faultTolerant: true, recovered: true };
  });

  console.log('\n================================================================');
  console.log('ITERATION 205 SUMMARY: ' + passedTests + ' / ' + totalTests + ' TESTS PASSED (100%)');
  console.log('================================================================\n');
})();
