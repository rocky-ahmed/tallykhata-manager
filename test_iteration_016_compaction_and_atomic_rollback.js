/**
 * REA Reconstruction — Iteration 016: Storage Compaction & Atomic Rollback Suite
 */
const assert = require('assert');
const { StorageRepository } = require('./src/storageRepository');

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
  console.log('REA RECONSTRUCTION: ITERATION 016 COMPACTION & ROLLBACK SUITE');
  console.log('================================================================');

  // STEP 1: ENQUEUEWRITE FIFO AND ERROR CONTAINMENT
  console.log('\n--- STEP 1: ENQUEUEWRITE SERIALIZATION & ERROR CONTAINMENT ---');

  await runAsyncTest('1.1: enqueueWrite executes in strict FIFO order', async () => {
    const storage = new StorageRepository(createMockStorageAdapter());
    await storage.loadInitialData();

    const sequence = [];
    const p1 = storage.enqueueWrite(async () => {
      await new Promise((r) => setTimeout(r, 10));
      sequence.push('first');
      return 1;
    });
    const p2 = storage.enqueueWrite(async () => {
      sequence.push('second');
      return 2;
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.strictEqual(r1, 1);
    assert.strictEqual(r2, 2);
    assert.deepStrictEqual(sequence, ['first', 'second']);
  });

  await runAsyncTest('1.2: enqueueWrite failure does not poison subsequent queue tasks', async () => {
    const storage = new StorageRepository(createMockStorageAdapter());
    await storage.loadInitialData();

    let caughtError = null;
    try {
      await storage.enqueueWrite(async () => {
        throw new Error('Simulated operation crash');
      });
    } catch (e) {
      caughtError = e;
    }
    assert(caughtError, 'Error must be caught by caller');
    assert.strictEqual(caughtError.message, 'Simulated operation crash');

    // Next operation must still succeed
    const subsequent = await storage.enqueueWrite(async () => {
      return 'recovered';
    });
    assert.strictEqual(subsequent, 'recovered');
  });

  // STEP 2: EXECUTEATOMIC TRANSACTION AUTO-ROLLBACK
  console.log('\n--- STEP 2: EXECUTE ATOMIC TRANSACTION & AUTO-ROLLBACK ---');

  await runAsyncTest('2.1: Atomic transaction successfully commits multi-step changes', async () => {
    const adapter = createMockStorageAdapter();
    const storage = new StorageRepository(adapter);
    await storage.loadInitialData();

    const txRes = await storage.executeAtomicTransaction(async (draft) => {
      draft.accounts.push({ id: 'acc_tx_1', name: 'Merchant A', balance: 1000, type: 1 });
      draft.journals.push({ id: 'j_tx_1', accountId: 'acc_tx_1', amount: 1000, type: 'credit' });
      return { store: draft, result: { journalId: 'j_tx_1' } };
    });

    assert.strictEqual(txRes.success, true);
    assert.strictEqual(txRes.rolledBack, false);
    assert.strictEqual(txRes.result.journalId, 'j_tx_1');

    const state = await storage.getAuthoritativeState();
    assert.strictEqual(state.accounts.find((a) => a.id === 'acc_tx_1').balance, 1000);
    assert.strictEqual(state.journals.find((j) => j.id === 'j_tx_1').amount, 1000);
  });

  await runAsyncTest('2.2: Atomic transaction automatically rolls back when mutation throws midway', async () => {
    const adapter = createMockStorageAdapter();
    const storage = new StorageRepository(adapter);
    await storage.loadInitialData();

    // Baseline account
    await storage.mutateCollection('accounts', (accs) => [
      ...accs,
      { id: 'acc_stable_1', name: 'Stable Account', balance: 5000, type: 1 },
    ]);

    const txRes = await storage.executeAtomicTransaction(async (draft) => {
      draft.accounts.find((a) => a.id === 'acc_stable_1').balance = 999999;
      throw new Error('Network timeout during payment commit');
    });

    assert.strictEqual(txRes.success, false);
    assert.strictEqual(txRes.rolledBack, true);
    assert(txRes.error.includes('Network timeout'));

    // State must remain strictly at 5000, not 999999
    const state = await storage.getAuthoritativeState();
    assert.strictEqual(state.accounts.find((a) => a.id === 'acc_stable_1').balance, 5000);
  });

  await runAsyncTest('2.3: Atomic transaction rolls back on financial invariant violation (NaN balance)', async () => {
    const adapter = createMockStorageAdapter();
    const storage = new StorageRepository(adapter);
    await storage.loadInitialData();

    await storage.mutateCollection('accounts', (accs) => [
      ...accs,
      { id: 'acc_nan_1', name: 'Check NaN', balance: 200, type: 1 },
    ]);

    const txRes = await storage.executeAtomicTransaction(async (draft) => {
      draft.accounts.find((a) => a.id === 'acc_nan_1').balance = NaN;
      return draft;
    });

    assert.strictEqual(txRes.success, false);
    assert.strictEqual(txRes.rolledBack, true);
    assert(txRes.error.includes('NaN or invalid'));

    const state = await storage.getAuthoritativeState();
    assert.strictEqual(state.accounts.find((a) => a.id === 'acc_nan_1').balance, 200);
  });

  // STEP 3: STORAGE VACUUM & COMPACTION
  console.log('\n--- STEP 3: STORAGE COMPACTION & VACUUMING ---');

  await runAsyncTest('3.1: compactStorage removes orphaned journals and deduplicates entries', async () => {
    const adapter = createMockStorageAdapter();
    const storage = new StorageRepository(adapter);
    await storage.loadInitialData();

    // Populate valid account and duplicate accounts
    await storage.mutateStore((s) => {
      s.accounts = [
        { id: 'acc_valid_1', name: 'Valid Merchant', balance: 500, type: 1, businessId: '1' },
        { id: 'acc_valid_1', name: 'Valid Merchant Duplicate', balance: 500, type: 1, businessId: '1' }, // duplicate
      ];
      s.journals = [
        { id: 'j_1', accountId: 'acc_valid_1', amount: 500, businessId: '1', type: 'credit', date: '2026-11-01' },
        { id: 'j_orphan', accountId: 'acc_non_existent', amount: 999, businessId: '1', type: 'credit', date: '2026-11-01' }, // orphan
      ];
      return s;
    });

    const compactRes = await storage.compactStorage({ recalculateBalances: true });
    assert.strictEqual(compactRes.success, true);
    assert.strictEqual(compactRes.stats.deduplicatedRecords, 1, '1 duplicate account removed');
    assert.strictEqual(compactRes.stats.orphanedJournalsRemoved, 1, '1 orphaned journal removed');

    const cleanState = await storage.getAuthoritativeState();
    assert.strictEqual(cleanState.accounts.length, 1);
    assert.strictEqual(cleanState.journals.length, 1);
    assert.strictEqual(cleanState.journals[0].id, 'j_1');
  });

  console.log('\n================================================================');
  console.log(`ITERATION 016 VERDICT: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================\n');
})();
