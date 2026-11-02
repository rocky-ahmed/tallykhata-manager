/**
 * test_iteration_203_multitenant_scale_and_mutex_stress.js
 * Continuous Verification & Benchmark Suite for Iteration 203:
 * 1. Multi-Tenant Business Ledger Isolation Across 150 Businesses (ID Collisions)
 * 2. Extreme Currency Boundaries (1 Paisa to 10 Crore Taka) & Fractional Paisa Invariance
 * 3. Large-Scale Multi-Tenant Storage Compaction & Balance Recalculation
 * 4. 900 Concurrent writeQueue Mutex Stress Operations & High-Frequency I/O Serialization
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

function createMockAsyncAdapter(writeDelayMs = 0.5) {
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
  console.log('ITERATION 203: MULTI-TENANT 150-BIZ ISOLATION & 900-MUTEX STRESS');
  console.log('================================================================\n');

  console.log('--- PART 1: MULTI-TENANT ISOLATION ACROSS 150 BUSINESSES (ID COLLISIONS) ---');

  const BUSINESS_COUNT = 150;
  const allAccounts = [];
  const allJournals = [];
  const expectedBalances = new Map(); // key: bizId:accId -> expected balance

  // Generate 150 businesses, each with 2 accounts sharing identical account IDs: 'acc_cust_common' and 'acc_supp_common'
  for (let b = 1; b <= BUSINESS_COUNT; b++) {
    const bizId = String(b);
    const custId = 'acc_cust_common';
    const suppId = 'acc_supp_common';

    allAccounts.push({
      id: custId,
      name: 'কাস্টমার দোকান ' + b,
      type: 1, // Customer
      balance: 0,
      businessId: bizId
    });

    allAccounts.push({
      id: suppId,
      name: 'সাপ্লায়ার দোকান ' + b,
      type: 2, // Supplier
      balance: 0,
      businessId: bizId
    });

    // Customer transactions in Business b:
    // Given (credit sale): 500 + b, Received (payment): 200, Given: 150.75, Received: 50.75
    // Expected Net Balance = (500 + b) - 200 + 150.75 - 50.75 = 400 + b
    const expCustBal = Math.round((400 + b) * 100) / 100;
    expectedBalances.set(bizId + ':' + custId, expCustBal);

    allJournals.push({
      id: 'j_c1_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'given',
      amount: Math.round((500 + b) * 100) / 100,
      date: '2026-10-01'
    });
    allJournals.push({
      id: 'j_c2_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'received',
      amount: 200,
      date: '2026-10-02'
    });
    allJournals.push({
      id: 'j_c3_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'given',
      amount: 150.75,
      date: '2026-10-03'
    });
    allJournals.push({
      id: 'j_c4_' + b,
      accountId: custId,
      businessId: bizId,
      type: 'received',
      amount: 50.75,
      date: '2026-10-04'
    });

    // Supplier transactions in Business b:
    // Received (credit purchase): 1000 + 2*b, Given (payment): 600, Received: 300, Given: 100
    // Expected Net Balance (liability) = (1000 + 2*b) - 600 + 300 - 100 = 600 + 2*b
    const expSuppBal = Math.round((600 + 2 * b) * 100) / 100;
    expectedBalances.set(bizId + ':' + suppId, expSuppBal);

    allJournals.push({
      id: 'j_s1_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'received',
      amount: Math.round((1000 + 2 * b) * 100) / 100,
      date: '2026-10-01'
    });
    allJournals.push({
      id: 'j_s2_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'given',
      amount: 600,
      date: '2026-10-02'
    });
    allJournals.push({
      id: 'j_s3_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'received',
      amount: 300,
      date: '2026-10-03'
    });
    allJournals.push({
      id: 'j_s4_' + b,
      accountId: suppId,
      businessId: bizId,
      type: 'given',
      amount: 100,
      date: '2026-10-04'
    });
  }

  let recalculatedAccounts = [];
  let recalculatedJournals = [];
  await runTest('recalculateAllAccountBalances isolates 300 colliding accounts across 150 businesses', async () => {
    const t0 = performance.now();
    const result = recalculateAllAccountBalances(allAccounts, allJournals);
    recalculatedAccounts = result.updatedAccounts;
    recalculatedJournals = result.updatedJournals;
    const t1 = performance.now();
    const durationMs = Number((t1 - t0).toFixed(2));

    assert.strictEqual(result.updatedAccounts.length, 300, 'All 300 accounts must be recalculated');

    for (const acc of result.updatedAccounts) {
      const key = acc.businessId + ':' + acc.id;
      const expected = expectedBalances.get(key);
      assert.strictEqual(acc.balance, expected, 'Account ' + acc.name + ' in biz ' + acc.businessId + ' has contaminated balance: ' + acc.balance + ' !== ' + expected);
    }

    return {
      totalBusinesses: BUSINESS_COUNT,
      totalAccounts: allAccounts.length,
      totalJournals: allJournals.length,
      crossContaminations: 0,
      durationMs,
      status: '100% ZERO_LEAKAGE'
    };
  });

  await runTest('calculateAggregateMetrics across all 150 businesses strictly isolates receivables & payables', async () => {
    let checkedBusinesses = 0;
    for (let b = 1; b <= BUSINESS_COUNT; b++) {
      const bizId = String(b);
      const metrics = calculateAggregateMetrics(recalculatedAccounts, allJournals, bizId);

      const expectedReceivable = Math.round((400 + b) * 100) / 100;
      const expectedPayable = Math.round((600 + 2 * b) * 100) / 100;

      assert.strictEqual(metrics.totalReceivable, expectedReceivable, 'Receivable mismatch for biz ' + bizId);
      assert.strictEqual(metrics.totalPayable, expectedPayable, 'Payable mismatch for biz ' + bizId);
      assert.strictEqual(metrics.netBalance, Math.round((expectedReceivable - expectedPayable) * 100) / 100);
      checkedBusinesses++;
    }

    return { verifiedBusinesses: checkedBusinesses, isolationIntegrity: '100%' };
  });

  console.log('\n--- PART 2: EXTREME CURRENCY BOUNDARIES (1 PAISA TO 10 CRORE TAKA) ---');

  await runTest('validateTransaction boundary enforcement: 1 Paisa min, 10 Crore max, non-numeric guards', async () => {
    // 1 Paisa (0.01)
    const minVal = validateTransaction(0.01, 'given');
    assert.strictEqual(minVal.valid, true);
    assert.strictEqual(minVal.amount, 0.01);

    // 1 Paisa as string
    const minStr = validateTransaction('0.01', 'received');
    assert.strictEqual(minStr.valid, true);
    assert.strictEqual(minStr.amount, 0.01);

    // Fractional paisa (0.004 -> rounds to 0.00 -> invalid)
    const subPaisa = validateTransaction(0.004, 'given');
    assert.strictEqual(subPaisa.valid, false);

    // 10 Crore Taka (100,000,000)
    const maxVal = validateTransaction(100000000, 'given');
    assert.strictEqual(maxVal.valid, true);
    assert.strictEqual(maxVal.amount, 100000000);

    // Over 10 Crore (100,000,000.01)
    const overMax = validateTransaction(100000000.01, 'given');
    assert.strictEqual(overMax.valid, false);
    assert(overMax.error.includes('১০ কোটি'));

    // Zero and negative checks
    assert.strictEqual(validateTransaction(0, 'given').valid, false);
    assert.strictEqual(validateTransaction(-100, 'given').valid, false);
    assert.strictEqual(validateTransaction('', 'given').valid, false);
    assert.strictEqual(validateTransaction(NaN, 'given').valid, false);

    return { minBoundary: '0.01 BDT (1 Paisa)', maxBoundary: '100,000,000 BDT (10 Crore)', status: 'VALIDATED' };
  });

  await runTest('5,000 High-Scale Extreme Transactions: Zero float drift with 0.33/0.33/0.34 splits & 10 Crore limits', async () => {
    let runningBalancePaisa = 0;
    const extremeJournals = [];

    // Stress test alternating 1 paisa, 33/33/34 splits, 10 lakh, 1 crore, and 10 crore
    const stressSteps = 5000;
    for (let i = 1; i <= stressSteps; i++) {
      let amtTaka = 0;
      let type = i % 2 === 0 ? 'given' : 'received';

      if (i % 5 === 1) {
        amtTaka = 0.01; // 1 paisa
      } else if (i % 5 === 2) {
        amtTaka = 0.33; // 33 paisa
      } else if (i % 5 === 3) {
        amtTaka = 0.34; // 34 paisa
      } else if (i % 5 === 4) {
        amtTaka = 1000000; // 10 Lakh (1 Million)
      } else {
        amtTaka = (i % 10 === 0) ? 100000000 : 10000000; // 10 Crore or 1 Crore
      }

      const amtPaisa = Math.round(amtTaka * 100);
      if (type === 'given') {
        runningBalancePaisa += amtPaisa;
      } else {
        runningBalancePaisa -= amtPaisa;
      }

      extremeJournals.push({
        id: 'extreme_j_' + i,
        accountId: 'acc_stress',
        type,
        amount: amtTaka,
        date: '2026-10-01'
      });
    }

    const expectedBalanceTaka = Math.round(runningBalancePaisa) / 100;
    const testAcc = { id: 'acc_stress', type: 1, balance: 0, businessId: '1' };
    const recalc = recalculateAccountRunningBalances(testAcc, extremeJournals);

    assert.strictEqual(recalc.updatedAccount.balance, expectedBalanceTaka, 'Integer paisa math drifted on 5,000 extreme transactions');

    return {
      stressTransactions: stressSteps,
      finalBalanceTaka: expectedBalanceTaka,
      finalBalancePaisa: runningBalancePaisa,
      floatDrift: '0.00 Paisa (Absolute Exactitude)'
    };
  });

  console.log('\n--- PART 3: MULTI-TENANT STORAGE COMPACTION RECALCULATION (150 BIZ) ---');

  const compactAdapter = createMockAsyncAdapter(0.1);
  const compactRepo = new StorageRepository(compactAdapter);
  await compactRepo.loadInitialData();

  // Inject duplicate journals and orphaned journals into the 150-business store
  const journalsWithDupsAndOrphans = [...recalculatedJournals];
  // 50 duplicate journals
  for (let i = 0; i < 50; i++) {
    journalsWithDupsAndOrphans.push({ ...recalculatedJournals[i] });
  }
  // 100 orphaned journals (belonging to non-existent accounts)
  for (let i = 1; i <= 100; i++) {
    journalsWithDupsAndOrphans.push({
      id: 'j_orphan_biz_' + i,
      accountId: 'non_existent_acc',
      businessId: String((i % BUSINESS_COUNT) + 1),
      type: 'given',
      amount: 100,
      date: '2026-10-01'
    });
  }

  await compactRepo.mutateStore(s => ({
    ...s,
    accounts: recalculatedAccounts,
    journals: journalsWithDupsAndOrphans
  }));

  await runTest('compactStorage on 150-business dataset purges orphans & recalculates all running balances', async () => {
    const t0 = performance.now();
    const compactRes = await compactRepo.compactStorage({ recalculateBalances: true });
    const t1 = performance.now();
    const durationMs = Number((t1 - t0).toFixed(2));

    assert.strictEqual(compactRes.success, true);
    assert.strictEqual(compactRes.stats.orphanedJournalsRemoved, 100, 'Must purge exactly 100 orphaned journals');
    assert.strictEqual(compactRes.stats.deduplicatedRecords, 50, 'Must deduplicate 50 journals');
    assert(compactRes.stats.bytesReclaimed > 0, 'Bytes reclaimed must be > 0');

    // Verify all 300 accounts preserved their exact balances
    const postState = compactRepo.getAuthoritativeState();
    assert.strictEqual(postState.journals.length, 1200, 'Journals count must return to exact 1,200 valid entries');
    assert.strictEqual(postState.accounts.length, 300, 'Accounts count must remain 300');

    for (const acc of postState.accounts) {
      const key = acc.businessId + ':' + acc.id;
      const expected = expectedBalances.get(key);
      assert.strictEqual(acc.balance, expected, 'Compaction balance recalculation drifted for ' + acc.name);
    }

    return {
      orphanedJournalsPurged: compactRes.stats.orphanedJournalsRemoved,
      deduplicatedRecords: compactRes.stats.deduplicatedRecords,
      bytesReclaimed: compactRes.stats.bytesReclaimed,
      durationMs,
      ledgerIntegrity: '100% PRESERVED'
    };
  });

  console.log('\n--- PART 4: 900 CONCURRENT WRITEQUEUE MUTEX STRESS OPERATIONS ---');

  const stressAdapter = createMockAsyncAdapter(0.5); // 0.5ms simulated I/O
  const stressRepo = new StorageRepository(stressAdapter);
  await stressRepo.loadInitialData();

  await runTest('900 Concurrent Asynchronous Operations Interleaved Across Mutex', async () => {
    const CONCURRENT_OPS = 900;
    const promises = [];
    const t0 = performance.now();

    for (let i = 0; i < CONCURRENT_OPS; i++) {
      const opType = i % 4;
      if (opType === 0) {
        // Op 0: mutateCollection journals (225 ops)
        promises.push(stressRepo.mutateCollection('journals', (curr) => [
          ...curr,
          { id: 'stress_j_' + i, accountId: 'acc_900', amount: 50 + (i % 100), type: 'given' }
        ]));
      } else if (opType === 1) {
        // Op 1: mutateCollection cashEntries (225 ops)
        promises.push(stressRepo.mutateCollection('cashEntries', (curr) => [
          ...curr,
          { id: 'stress_c_' + i, type: 'in', amount: 25 + (i % 50) }
        ]));
      } else if (opType === 2) {
        // Op 2: executeAtomicTransaction (225 ops)
        promises.push(stressRepo.executeAtomicTransaction(async (draft) => {
          draft.accounts = (draft.accounts || []).map(a => {
            if (a.id === 'acc_900') {
              return { ...a, balance: (a.balance || 0) + 1 };
            }
            return a;
          });
          return { store: draft, result: 'tx_ok_' + i };
        }));
      } else {
        // Op 3: mutateStore notes (225 ops)
        promises.push(stressRepo.mutateStore((draft) => ({
          ...draft,
          notes: [...(draft.notes || []), { id: 'stress_n_' + i, text: 'নোট ' + i }]
        })));
      }
    }

    const results = await Promise.all(promises);
    const t1 = performance.now();
    const totalDurationMs = Number((t1 - t0).toFixed(2));
    const throughputOpsPerSec = Number(((CONCURRENT_OPS / totalDurationMs) * 1000).toFixed(2));
    const avgLatencyPerWriteMs = Number((totalDurationMs / CONCURRENT_OPS).toFixed(2));

    assert.strictEqual(results.length, CONCURRENT_OPS, 'All 900 operations must resolve');

    const finalState = stressRepo.getAuthoritativeState();
    const finalJournals = finalState.journals.filter(j => j.id.startsWith('stress_j_'));
    const finalCash = finalState.cashEntries.filter(c => c.id.startsWith('stress_c_'));
    const finalNotes = finalState.notes.filter(n => n.id.startsWith('stress_n_'));

    assert.strictEqual(finalJournals.length, 225, 'Must contain exactly 225 stress journals');
    assert.strictEqual(finalCash.length, 225, 'Must contain exactly 225 stress cash entries');
    assert.strictEqual(finalNotes.length, 225, 'Must contain exactly 225 stress notes');

    return {
      concurrentOperations: CONCURRENT_OPS,
      totalDurationMs,
      throughputOpsPerSec,
      avgLatencyPerWriteMs,
      zeroRaceConditions: true,
      dataIntegrity: '100% (225/225/225 Verified)'
    };
  });

  console.log('\n================================================================');
  console.log('ITERATION 203 SUMMARY: ' + passedTests + ' / ' + totalTests + ' TESTS PASSED (100%)');
  console.log('================================================================\n');
})();
