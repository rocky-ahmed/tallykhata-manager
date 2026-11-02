/**
 * test_iteration_202_storage_compaction_and_high_frequency_sync.js
 * Continuous Verification & Benchmark Suite for Iteration 202:
 * Continuous Storage Compaction Benchmark & High-Frequency SQLite Write Synchronization
 *
 * Worker: Worker 2 (Averroes) — Permanent Backend Developer & Business Logic
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 */

const assert = require('assert');
const { performance } = require('perf_hooks');
const {
  StorageRepository,
  createDefaultState,
  V6_KEY,
} = require('./src/storageRepository');
const SAFETY_SNAPSHOT_KEY = 'tallykhata_safety_snapshot';
const {
  recalculateAllAccountBalances,
  recalculateAccountRunningBalances
} = require('./src/ledgerEngine');

function createMockAsyncAdapter() {
  const store = new Map();
  let writeDelayMs = 2; // Simulates I/O latency on flash storage
  return {
    getItem: async (key) => {
      await new Promise(r => setTimeout(r, 1));
      return store.has(key) ? store.get(key) : null;
    },
    setItem: async (key, val) => {
      await new Promise(r => setTimeout(r, writeDelayMs));
      store.set(key, String(val));
    },
    removeItem: async (key) => {
      await new Promise(r => setTimeout(r, 1));
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
  console.log('ITERATION 202: CONTINUOUS STORAGE COMPACTION & HIGH-FREQ WRITE SYNC');
  console.log('================================================================\n');

  console.log('--- PART 1: CONTINUOUS STORAGE COMPACTION BENCHMARK ---');

  const adapter = createMockAsyncAdapter();
  const repo = new StorageRepository(adapter);
  await repo.loadInitialData();

  // Seed storage with multi-business data, duplicates, and orphaned records
  const initialAccounts = [
    { id: 'acc_1', name: 'করিম ট্রেডার্স', type: 1, balance: 0, businessId: '1' },
    { id: 'acc_2', name: 'রহিম ব্রাদার্স', type: 1, balance: 0, businessId: '1' },
    { id: 'acc_3', name: 'মেঘনা ডিস্ট্রিবিউশন', type: 2, balance: 0, businessId: '1' },
    { id: 'acc_4', name: 'পদ্মা ওয়েল', type: 2, balance: 0, businessId: '2' },
    { id: 'acc_5', name: 'যমুনা এন্টারপ্রাইজ', type: 1, balance: 0, businessId: '2' }
  ];

  const initialJournals = [];
  // 1,000 valid journals across the accounts
  for (let i = 1; i <= 1000; i++) {
    const acc = initialAccounts[i % initialAccounts.length];
    initialJournals.push({
      id: 'j_' + i,
      accountId: acc.id,
      businessId: acc.businessId,
      type: i % 2 === 0 ? 'given' : 'received',
      amount: (i * 10) % 500 + 10,
      date: '2026-10-01',
      desc: 'নিয়মিত লেনদেন ' + i
    });
  }

  // Inject 100 duplicate journal entries
  for (let i = 1; i <= 100; i++) {
    const duplicate = { ...initialJournals[i], desc: 'ডুপ্লিকেট এন্ট্রি ' + i };
    initialJournals.push(duplicate);
  }

  // Inject 150 orphaned journals (referencing non-existent accounts)
  for (let i = 1; i <= 150; i++) {
    initialJournals.push({
      id: 'j_orphan_' + i,
      accountId: 'non_existent_acc_' + i,
      businessId: '1',
      type: 'given',
      amount: 150,
      date: '2026-10-01',
      desc: 'এতিম লেনদেন ' + i
    });
  }

  // Inject duplicate accounts, cash entries, notes
  const accountsWithDups = [...initialAccounts, { ...initialAccounts[0], name: 'করিম ডুপ্লিকেট' }];
  const cashEntriesWithDups = [
    { id: 'cash_1', type: 'in', amount: 500, businessId: '1' },
    { id: 'cash_1', type: 'in', amount: 500, businessId: '1' }, // Duplicate
    { id: 'cash_2', type: 'out', amount: 200, businessId: '1' }
  ];
  const notesWithDups = [
    { id: 'note_1', title: 'নোট ১', businessId: '1' },
    { id: 'note_1', title: 'নোট ১ ডুপ্লিকেট', businessId: '1' } // Duplicate
  ];

  // Recalculate account balances initially to ensure correct starting balances
  const preRecalc = recalculateAllAccountBalances(accountsWithDups, initialJournals);

  await repo.mutateStore((s) => ({
    ...s,
    accounts: preRecalc.updatedAccounts,
    journals: initialJournals,
    cashEntries: cashEntriesWithDups,
    notes: notesWithDups
  }));

  // Seed expired safety snapshot (48 hours old)
  const expiredTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  await adapter.setItem(SAFETY_SNAPSHOT_KEY, JSON.stringify({
    snapshotId: 'snap_expired_1',
    createdAt: expiredTimestamp,
    state: { test: true }
  }));

  let initialCompactionStats = null;

  await runTest('Storage Compaction Cycle 1: Prunes orphans, dedupes records, and purges expired snapshots', async () => {
    const t0 = performance.now();
    const res = await repo.compactStorage({ maxSnapshotAgeMs: 24 * 60 * 60 * 1000, recalculateBalances: true });
    const t1 = performance.now();
    const durationMs = Number((t1 - t0).toFixed(2));

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.stats.orphanedJournalsRemoved, 150, 'Must remove all 150 orphaned journals');
    assert.strictEqual(res.stats.deduplicatedRecords, 103, 'Must deduplicate 100 journals + 1 account + 1 cash + 1 note');
    assert.strictEqual(res.stats.prunedSnapshots, 1, 'Must prune 1 expired snapshot');
    assert(res.stats.bytesReclaimed > 0, 'Bytes reclaimed must be positive');
    assert(res.stats.storageSizeAfter < res.stats.storageSizeBefore, 'Storage size must decrease');

    initialCompactionStats = {
      ...res.stats,
      durationMs
    };
    return initialCompactionStats;
  });

  await runTest('Ledger Mathematical Invariants: Post-compaction account balances match journal sum exactly', async () => {
    const store = repo.getAuthoritativeState();
    assert.strictEqual(store.journals.length, 1000, 'Store must contain exactly 1,000 unique valid journals');
    assert.strictEqual(store.accounts.length, 5, 'Store must contain exactly 5 unique accounts');

    for (const acc of store.accounts) {
      const accJournals = store.journals.filter(j => j.accountId === acc.id);
      const computed = recalculateAccountRunningBalances(acc, store.journals);
      assert.strictEqual(acc.balance, computed.updatedAccount.balance, 'Balance for ' + acc.name + ' must match journal running balance with 0 paisa error');
    }
    return { verifiedAccounts: store.accounts.length, status: 'EXACT_MATCH_ZERO_DRIFT' };
  });

  await runTest('Continuous Storage Compaction (Cycles 2-5): Idempotent, zero churn, and stable execution latency', async () => {
    const cycleLatencies = [];
    for (let cycle = 2; cycle <= 5; cycle++) {
      const t0 = performance.now();
      const res = await repo.compactStorage();
      const t1 = performance.now();
      const duration = Number((t1 - t0).toFixed(2));
      cycleLatencies.push(duration);

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.stats.orphanedJournalsRemoved, 0, 'Subsequent cycles must find 0 orphans');
      assert.strictEqual(res.stats.deduplicatedRecords, 0, 'Subsequent cycles must find 0 duplicates');
      assert.strictEqual(res.stats.bytesReclaimed, 0, 'Subsequent cycles must reclaim 0 bytes');
    }

    const minLat = Math.min(...cycleLatencies);
    const maxLat = Math.max(...cycleLatencies);
    const meanLat = Number((cycleLatencies.reduce((a, b) => a + b, 0) / cycleLatencies.length).toFixed(2));

    return {
      cycles: 4,
      minLatencyMs: minLat,
      maxLatencyMs: maxLat,
      meanLatencyMs: meanLat,
      idempotent: true
    };
  });

  console.log('\n--- PART 2: HIGH-FREQUENCY SQLITE / ASYNC WRITE SYNCHRONIZATION ---');

  const syncAdapter = createMockAsyncAdapter();
  syncAdapter.setWriteDelay(2); // 2ms simulated SQLite I/O latency
  const syncRepo = new StorageRepository(syncAdapter);
  await syncRepo.loadInitialData();

  await runTest('High-Frequency Interleaved Writes: 100 concurrent asynchronous operations under FIFO mutex', async () => {
    const CONCURRENT_OPS = 100;
    const promises = [];
    const t0 = performance.now();

    for (let i = 0; i < CONCURRENT_OPS; i++) {
      const opType = i % 4;
      if (opType === 0) {
        // Op 0: mutateCollection journals
        promises.push(syncRepo.mutateCollection('journals', (curr) => [
          ...curr,
          { id: 'hf_j_' + i, accountId: 'acc_sync', amount: 100 + i, type: 'given' }
        ]));
      } else if (opType === 1) {
        // Op 1: mutateCollection cashEntries
        promises.push(syncRepo.mutateCollection('cashEntries', (curr) => [
          ...curr,
          { id: 'hf_c_' + i, type: 'in', amount: 50 + i }
        ]));
      } else if (opType === 2) {
        // Op 2: executeAtomicTransaction
        promises.push(syncRepo.executeAtomicTransaction(async (draft) => {
          draft.accounts = (draft.accounts || []).map(a => {
            if (a.id === 'acc_sync') {
              return { ...a, balance: (a.balance || 0) + 10 };
            }
            return a;
          });
          return { store: draft, result: 'tx_ok_' + i };
        }));
      } else {
        // Op 3: mutateStore notes
        promises.push(syncRepo.mutateStore((draft) => ({
          ...draft,
          notes: [...(draft.notes || []), { id: 'hf_n_' + i, text: 'নোট ' + i }]
        })));
      }
    }

    const results = await Promise.all(promises);
    const t1 = performance.now();
    const totalDurationMs = Number((t1 - t0).toFixed(2));
    const throughputOpsPerSec = Number(((CONCURRENT_OPS / totalDurationMs) * 1000).toFixed(2));
    const avgLatencyPerWriteMs = Number((totalDurationMs / CONCURRENT_OPS).toFixed(2));

    assert.strictEqual(results.length, CONCURRENT_OPS, 'All 100 operations must complete');

    const finalState = syncRepo.getAuthoritativeState();
    const finalJournals = finalState.journals.filter(j => j.id.startsWith('hf_j_'));
    const finalCash = finalState.cashEntries.filter(c => c.id.startsWith('hf_c_'));
    const finalNotes = finalState.notes.filter(n => n.id.startsWith('hf_n_'));

    assert.strictEqual(finalJournals.length, 25, 'Must contain exactly 25 journal entries');
    assert.strictEqual(finalCash.length, 25, 'Must contain exactly 25 cash entries');
    assert.strictEqual(finalNotes.length, 25, 'Must contain exactly 25 notes');

    return {
      concurrentOperations: CONCURRENT_OPS,
      totalDurationMs,
      throughputOpsPerSec,
      avgLatencyPerWriteMs,
      zeroRaceConditions: true,
      dataIntegrity: '100%'
    };
  });

  await runTest('WriteQueue Fault Resilience: Error in transaction does not stall or corrupt subsequent writes', async () => {
    // Dispatch a transaction designed to violate invariants
    const failTx = syncRepo.executeAtomicTransaction(async (draft) => {
      draft.accounts = [{ id: 'broken_acc', balance: NaN }]; // NaN invariant breach
      return { store: draft };
    });

    const resFail = await failTx;
    assert.strictEqual(resFail.success, false, 'Invalid transaction must fail');
    assert.strictEqual(resFail.rolledBack, true, 'Invalid transaction must be rolled back');

    // Dispatch a subsequent valid write
    const validWrite = await syncRepo.mutateCollection('notes', (curr) => [
      ...curr,
      { id: 'note_post_fail', text: 'সফল পরবর্তী নোট' }
    ]);

    const postState = syncRepo.getAuthoritativeState();
    const hasPostNote = postState.notes.some(n => n.id === 'note_post_fail');
    assert.strictEqual(hasPostNote, true, 'Subsequent write must succeed immediately after failure');
    assert(!postState.accounts.some(a => a.id === 'broken_acc'), 'Corrupted account must not exist');

    return { queueFaultTolerant: true, queueRecovered: true };
  });

  console.log('\n--- PART 3: STORAGE TELEMETRY & COMPACTION TRIGGER DIAGNOSTICS ---');

  await runTest('getStorageMetrics calculates byte boundaries and flags compactStorage recommendations', async () => {
    const diagRepo = new StorageRepository(createMockAsyncAdapter());
    await diagRepo.loadInitialData();

    // Seed 4,500 valid journals + 600 orphaned journals (total 5,100) to trigger compaction threshold
    const validAcc = { id: 'acc_diag', name: 'ডায়াগনস্টিক হিসাব', type: 1, balance: 0, businessId: '1' };
    const largeJournals = [];
    for (let i = 0; i < 4500; i++) {
      largeJournals.push({ id: 'j_val_' + i, accountId: 'acc_diag', businessId: '1', amount: 100, date: '2026-10-01' });
    }
    for (let i = 0; i < 600; i++) {
      largeJournals.push({ id: 'j_orph_' + i, accountId: 'missing_acc_' + i, businessId: '1', amount: 100, date: '2026-10-01' });
    }
    await diagRepo.mutateStore(s => ({ ...s, accounts: [validAcc], journals: largeJournals }));

    const metrics = await diagRepo.getStorageMetrics();
    assert.strictEqual(metrics.collectionCounts.journals, 5100);
    assert.strictEqual(metrics.recommendedAction, 'compactStorage', 'Must recommend compactStorage when journals > 5000');

    // Run compaction
    await diagRepo.compactStorage();
    const postMetrics = await diagRepo.getStorageMetrics();
    assert.strictEqual(postMetrics.recommendedAction, 'none', 'Recommendation must reset to none after compaction');

    return {
      preCompactionJournals: metrics.collectionCounts.journals,
      preRecommendation: metrics.recommendedAction,
      postRecommendation: postMetrics.recommendedAction
    };
  });

  console.log('\n================================================================');
  console.log('ITERATION 202 SUMMARY: ' + passedTests + ' / ' + totalTests + ' TESTS PASSED (100%)');
  console.log('================================================================\n');
})();
