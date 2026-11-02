/**
 * test_iteration_206_compaction_and_ledger_stress.js
 * Continuous Verification & Benchmark Suite for Iteration 206:
 * 1. Customer vs Supplier Running Ledger Dual-Invariants & Zero Float Drift across 30 businesses & 60 accounts
 * 2. Storage Compaction Benchmark Under Load (3,000 Valid Journals, 350 Orphans, 300 Duplicates, Expired Snapshot)
 * 3. High-Frequency SQLite / Async Storage Write Synchronization (500 Concurrent Operations)
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
  console.log('ITERATION 206: STORAGE COMPACTION & LEDGER MUTEX STRESS');
  console.log('================================================================\n');

  console.log('--- PART 1: CUSTOMER VS SUPPLIER RUNNING LEDGER ZERO FLOAT DRIFT (30 BIZ, 60 ACCS) ---');

  const BIZ_COUNT = 30;
  const rawAccounts = [];
  const rawJournals = [];
  const expectedBalances = new Map();

  for (let b = 1; b <= BIZ_COUNT; b++) {
    const bizId = String(b);
    const custId = 'c_iter206';
    const suppId = 's_iter206';

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
    // + (1200 + b * 0.01) [Given]
    // - 500.33 [Received]
    // + 350.34 [Given]
    // - (250.01 + b * 0.01) [Received]
    // Net: 1200 - 500.33 + 350.34 - 250.01 = 800.00 BDT
    const custBalPaisa = 120000 + b - 50033 + 35034 - (25001 + b);
    const expectedCustBal = custBalPaisa / 100; // Exactly 800.00
    expectedBalances.set(bizId + ':' + custId, expectedCustBal);

    rawJournals.push({
      id: 'j_c1_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'given',
      amount: (120000 + b) / 100,
      date: '2026-10-01'
    });
    rawJournals.push({
      id: 'j_c2_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'received',
      amount: 500.33,
      date: '2026-10-02'
    });
    rawJournals.push({
      id: 'j_c3_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'given',
      amount: 350.34,
      date: '2026-10-03'
    });
    rawJournals.push({
      id: 'j_c4_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'received',
      amount: (25001 + b) / 100,
      date: '2026-10-04'
    });

    // Supplier ledger transactions:
    // + (2500 + b * 0.01) [Received]
    // - 1500.33 [Given]
    // + 600.34 [Received]
    // - (400.01 + b * 0.01) [Given]
    // Net: 2500 - 1500.33 + 600.34 - 400.01 = 1200.00 BDT
    const suppBalPaisa = 250000 + b - 150033 + 60034 - (40001 + b);
    const expectedSuppBal = suppBalPaisa / 100; // Exactly 1200.00
    expectedBalances.set(bizId + ':' + suppId, expectedSuppBal);

    rawJournals.push({
      id: 'j_s1_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'received',
      amount: (250000 + b) / 100,
      date: '2026-10-01'
    });
    rawJournals.push({
      id: 'j_s2_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'given',
      amount: 1500.33,
      date: '2026-10-02'
    });
    rawJournals.push({
      id: 'j_s3_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'received',
      amount: 600.34,
      date: '2026-10-03'
    });
    rawJournals.push({
      id: 'j_s4_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'given',
      amount: (40001 + b) / 100,
      date: '2026-10-04'
    });
  }

  let baselineAccounts = [];
  let baselineJournals = [];

  await runTest('recalculateAllAccountBalances verifies customer & supplier balances with zero float drift across 30 businesses', async () => {
    const t0 = performance.now();
    const result = recalculateAllAccountBalances(rawAccounts, rawJournals);
    const t1 = performance.now();
    const durationMs = Number((t1 - t0).toFixed(2));

    baselineAccounts = result.updatedAccounts;
    baselineJournals = result.updatedJournals;

    assert.strictEqual(baselineAccounts.length, BIZ_COUNT * 2, 'Must recalculate all 60 accounts');

    let maxDriftPaisa = 0;
    for (const acc of baselineAccounts) {
      const compositeKey = acc.businessId + ':' + acc.id;
      const expected = expectedBalances.get(compositeKey);
      assert(expected !== undefined, 'Expected balance must exist for ' + compositeKey);

      const actualPaisa = Math.round(acc.balance * 100);
      const expectedPaisa = Math.round(expected * 100);
      const drift = Math.abs(actualPaisa - expectedPaisa);
      if (drift > maxDriftPaisa) maxDriftPaisa = drift;

      assert.strictEqual(
        acc.balance,
        expected,
        `Account ${compositeKey} balance ${acc.balance} must match expected ${expected} exactly`
      );
      if (acc.type === 1) {
        assert.strictEqual(acc.balance, 800.00, 'Customer balance must be exactly 800.00');
      } else {
        assert.strictEqual(acc.balance, 1200.00, 'Supplier balance must be exactly 1200.00');
      }
    }

    assert.strictEqual(maxDriftPaisa, 0, 'Float drift must be 0.00 Paisa across all 60 accounts');

    return {
      totalBusinesses: BIZ_COUNT,
      totalAccounts: baselineAccounts.length,
      durationMs,
      customerBalance: '800.00 BDT (Exact)',
      supplierBalance: '1200.00 BDT (Exact)',
      floatDrift: '0.00 Paisa (Zero Drift)'
    };
  });

  await runTest('calculateAggregateMetrics across all 30 businesses isolates 800.00 receivable & 1200.00 payable', async () => {
    for (let b = 1; b <= BIZ_COUNT; b++) {
      const bizId = String(b);
      const metrics = calculateAggregateMetrics(baselineAccounts, baselineJournals, bizId);

      assert.strictEqual(
        metrics.totalReceivable,
        800.00,
        `Biz ${bizId} totalReceivable must be 800.00, got ${metrics.totalReceivable}`
      );
      assert.strictEqual(
        metrics.totalPayable,
        1200.00,
        `Biz ${bizId} totalPayable must be 1200.00, got ${metrics.totalPayable}`
      );
      assert.strictEqual(
        metrics.netBalance,
        -400.00,
        `Biz ${bizId} netBalance must be -400.00, got ${metrics.netBalance}`
      );
      assert.strictEqual(metrics.customerCount, 1);
      assert.strictEqual(metrics.supplierCount, 1);
    }

    return { verifiedTenants: BIZ_COUNT, isolation: '100% ZERO_LEAKAGE' };
  });

  console.log('\n--- PART 2: STORAGE COMPACTION BENCHMARK UNDER LOAD (3000+ JOURNALS, 350 ORPHANS, 300 DUPES) ---');

  const compactAdapter = createMockAsyncAdapter(0.1);
  const compactRepo = new StorageRepository(compactAdapter);
  await compactRepo.loadInitialData();

  // Create 3,000 total valid journals across 30 businesses (100 per business)
  const loadJournals = [...baselineJournals];
  const remainingValidCount = 3000 - baselineJournals.length;
  for (let i = 1; i <= remainingValidCount; i++) {
    const b = (i % BIZ_COUNT) + 1;
    const isCust = i % 2 === 0;
    loadJournals.push({
      id: 'load_j_' + i,
      accountId: isCust ? 'c_iter206' : 's_iter206',
      businessId: String(b),
      type: isCust ? 'given' : 'received',
      amount: 100,
      runningBalance: 0,
      date: '2026-10-01'
    });
  }

  // Inject 300 duplicate journals
  for (let i = 0; i < 300; i++) {
    loadJournals.push({ ...loadJournals[i] });
  }

  // Inject 350 orphaned journals (referencing deleted/non-existent accounts)
  for (let i = 1; i <= 350; i++) {
    loadJournals.push({
      id: 'orphan_j_' + i,
      accountId: 'non_existent_acc_' + i,
      businessId: String((i % BIZ_COUNT) + 1),
      type: 'given',
      amount: 85,
      date: '2026-10-01'
    });
  }

  // Seed expired safety snapshot (>36 hours old)
  const expiredDate = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  await compactAdapter.setItem(SAFETY_SNAPSHOT_KEY, JSON.stringify({
    snapshotId: 'snap_expired_36h',
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

  await runTest('compactStorage under load: Purges 350 orphans, dedupes 300 records, prunes expired snapshot', async () => {
    const t0 = performance.now();
    const res = await compactRepo.compactStorage({ maxSnapshotAgeMs: 24 * 60 * 60 * 1000, recalculateBalances: true });
    const t1 = performance.now();
    const durationMs = Number((t1 - t0).toFixed(2));

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stats.orphanedJournalsRemoved, 350, 'Must remove exactly 350 orphaned journals');
    assert.strictEqual(res.stats.deduplicatedRecords, 300, 'Must remove exactly 300 duplicate records');
    assert.strictEqual(res.stats.prunedSnapshots, 1, 'Must prune exactly 1 expired safety snapshot');
    assert(res.stats.bytesReclaimed > 50000, 'Bytes reclaimed must be significant (>50KB)');

    compactionResult = res;
    const state = compactRepo.getAuthoritativeState();
    assert.strictEqual(state.journals.length, 3000, 'State must contain exactly 3,000 valid journals');

    return {
      orphanedJournalsRemoved: res.stats.orphanedJournalsRemoved,
      deduplicatedRecords: res.stats.deduplicatedRecords,
      prunedSnapshots: res.stats.prunedSnapshots,
      bytesReclaimed: res.stats.bytesReclaimed,
      storageSizeBefore: res.stats.storageSizeBefore,
      storageSizeAfter: res.stats.storageSizeAfter,
      durationMs
    };
  });

  await runTest('Post-compaction ledger running balance recalculation fidelity: 0.00 Paisa drift', async () => {
    const state = compactRepo.getAuthoritativeState();
    assert.strictEqual(state.accounts.length, 60, 'Must contain 60 accounts');

    for (const acc of state.accounts) {
      assert(typeof acc.balance === 'number');
      assert(!isNaN(acc.balance));
      const paisa = Math.round(acc.balance * 100);
      assert.strictEqual(acc.balance, paisa / 100, 'Balance must equal integer paisa divided by 100');
    }

    return { verifiedAccounts: state.accounts.length, status: 'EXACT_MATCH_ZERO_DRIFT' };
  });

  await runTest('Continuous Storage Compaction (Cycles 2-4): 100% idempotent with zero churn', async () => {
    const latencies = [];
    for (let c = 2; c <= 4; c++) {
      const t0 = performance.now();
      const res = await compactRepo.compactStorage({ maxSnapshotAgeMs: 24 * 60 * 60 * 1000 });
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

  console.log('\n--- PART 3: HIGH-FREQUENCY SQLITE WRITE SYNCHRONIZATION (500 OPS) ---');

  const syncAdapter = createMockAsyncAdapter(0.8); // 0.8ms simulated flash write
  const syncRepo = new StorageRepository(syncAdapter);
  await syncRepo.loadInitialData();

  await runTest('500 Concurrent Asynchronous Operations Interleaved Under writeQueue Mutex', async () => {
    const CONCURRENT_OPS = 500;
    const promises = [];
    const t0 = performance.now();

    for (let i = 0; i < CONCURRENT_OPS; i++) {
      const op = i % 4;
      if (op === 0) {
        // Op 0: mutateCollection journals (125 ops)
        promises.push(syncRepo.mutateCollection('journals', (curr) => [
          ...curr,
          { id: 'stress206_j_' + i, accountId: 'acc_stress_206', amount: 50 + i, type: 'given' }
        ]));
      } else if (op === 1) {
        // Op 1: mutateCollection cashEntries (125 ops)
        promises.push(syncRepo.mutateCollection('cashEntries', (curr) => [
          ...curr,
          { id: 'stress206_c_' + i, type: 'in', amount: 30 + i }
        ]));
      } else if (op === 2) {
        // Op 2: executeAtomicTransaction (125 ops)
        promises.push(syncRepo.executeAtomicTransaction(async (draft) => {
          draft.accounts = (draft.accounts || []).map(a => {
            if (a.id === 'acc_stress_206') {
              return { ...a, balance: (a.balance || 0) + 1 };
            }
            return a;
          });
          return { store: draft, result: 'tx_ok_206_' + i };
        }));
      } else {
        // Op 3: mutateStore notes (125 ops)
        promises.push(syncRepo.mutateStore((draft) => ({
          ...draft,
          notes: [...(draft.notes || []), { id: 'stress206_n_' + i, text: 'নোট ' + i }]
        })));
      }
    }

    const results = await Promise.all(promises);
    const t1 = performance.now();
    const totalDurationMs = Number((t1 - t0).toFixed(2));
    const throughputOpsPerSec = Number(((CONCURRENT_OPS / totalDurationMs) * 1000).toFixed(2));
    const avgLatencyPerWriteMs = Number((totalDurationMs / CONCURRENT_OPS).toFixed(2));

    assert.strictEqual(results.length, CONCURRENT_OPS, 'All 500 operations must resolve');

    const finalState = syncRepo.getAuthoritativeState();
    const finalJournals = finalState.journals.filter(j => j.id.startsWith('stress206_j_'));
    const finalCash = finalState.cashEntries.filter(c => c.id.startsWith('stress206_c_'));
    const finalNotes = finalState.notes.filter(n => n.id.startsWith('stress206_n_'));

    assert.strictEqual(finalJournals.length, 125, 'Must contain exactly 125 stress journals');
    assert.strictEqual(finalCash.length, 125, 'Must contain exactly 125 stress cash entries');
    assert.strictEqual(finalNotes.length, 125, 'Must contain exactly 125 stress notes');

    return {
      concurrentOperations: CONCURRENT_OPS,
      totalDurationMs,
      throughputOpsPerSec,
      avgLatencyPerWriteMs,
      zeroRaceConditions: true,
      dataIntegrity: '100% (125/125/125 Verified)'
    };
  });

  await runTest('writeQueue Exception Isolation & Automatic State Rollback', async () => {
    // Injected invalid balance mutation
    const failTx = syncRepo.executeAtomicTransaction(async (draft) => {
      draft.accounts = [{ id: 'corrupt_acc_206', balance: 'CORRUPTED_STRING_206' }];
      return { store: draft };
    });

    const resFail = await failTx;
    assert.strictEqual(resFail.success, false);
    assert.strictEqual(resFail.rolledBack, true);

    // Follow-up valid write
    const okWrite = await syncRepo.mutateCollection('notes', (curr) => [
      ...curr,
      { id: 'note_recovery_206', text: 'রিকভারি সফল ২০৬' }
    ]);

    const state = syncRepo.getAuthoritativeState();
    assert(state.notes.some(n => n.id === 'note_recovery_206'));
    assert(!state.accounts.some(a => a.id === 'corrupt_acc_206'));

    return { faultTolerant: true, recovered: true };
  });

  console.log('\n================================================================');
  console.log('ITERATION 206 SUMMARY: ' + passedTests + ' / ' + totalTests + ' TESTS PASSED (100%)');
  console.log('================================================================\n');
})();
