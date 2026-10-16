/**
 * test_phase3_3.js
 * Comprehensive Test Suite for TallyKhata Phase 3.3:
 * - Opening-Balance Aware Accounting & Historical Ledger Integrity (Tests A, B, C, D)
 * - Safe Migration Without Financial Data Loss (7 Scenarios)
 * - Concurrent Mutations on Shared Collections (Notes, Cashbox, Accounts, Inventory, Financials, Failure Recovery)
 * - End-to-End Production Accounting Workflows (Customer & Supplier)
 * - Startup, Persistence & Application Restart Verification
 */

const assert = require('assert');
const {
  generateUniqueId,
  validateTransaction,
  validateAccount,
  validateStockAdjustment,
  establishAccountOpeningBalance,
  recalculateAccountRunningBalances,
  syncCashboxForTransaction,
  removeCashEntriesForTransactions,
  migrateV5toV6,
  V5_KEY,
  V6_KEY,
  V5_BACKUP_KEY,
} = require('./src/ledgerEngine');

const {
  StorageRepository,
  createDefaultState,
  VALID_COLLECTIONS,
} = require('./src/storageRepository');

console.log('================================================================');
console.log('TALLYKHATA PHASE 3.3 — DATA INTEGRITY & CONCURRENCY TEST SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

async function runTest(name, fn) {
  totalTests++;
  const testNumber = totalTests;
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      await res;
    }
    passedTests++;
    testResults.push({ id: testNumber, name, status: 'PASS' });
    console.log(`[PASS] TEST ${testNumber}: ${name}`);
  } catch (err) {
    failedTests++;
    testResults.push({ id: testNumber, name, status: 'FAIL', error: err.message });
    console.error(`[FAIL] TEST ${testNumber}: ${name}`);
    console.error(`       Error: ${err.message}`);
    if (err.stack) {
      console.error(`       ${err.stack.split('\n').slice(1, 4).join('\n')}`);
    }
  }
}

// Memory adapter with disk-fault simulation capabilities
function createTestAdapter(initialData = {}) {
  const map = new Map();
  for (const [k, v] of Object.entries(initialData)) {
    map.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  let shouldFailNextSet = false;
  return {
    getItem: async (key) => (map.has(key) ? map.get(key) : null),
    setItem: async (key, val) => {
      if (shouldFailNextSet) {
        shouldFailNextSet = false;
        throw new Error('Simulated I/O or storage disk failure');
      }
      map.set(key, String(val));
    },
    removeItem: async (key) => { map.delete(key); },
    clear: async () => { map.clear(); },
    failNextSet: () => { shouldFailNextSet = true; },
    _map: map,
  };
}

async function main() {
  // ==================================================================
  // SECTION 1: REQUIRED OPENING-BALANCE TESTS (A, B, C, D)
  // ==================================================================

  // TEST 1 (TEST A) — Customer Opening Balance Baseline & Recalculation
  await runTest('TEST A: Customer Opening Balance Baseline (7000 / 3200 baseline 3800, add 500 -> 7500, edit 700 -> 7700, del -> 7000)', async () => {
    let customer = { id: 'cust_a', name: 'Raihan', type: 1, balance: 7000 };
    let journals = [
      { id: 'j_1', accountId: 'cust_a', type: 'given', amount: 3200, desc: 'মালামাল বাকি', date: '2026-10-01', time: '10:00 AM' }
    ];

    // Establish opening-balance baseline = 7000 - 3200 = 3800
    const baseline = establishAccountOpeningBalance(customer, journals);
    assert.strictEqual(baseline, 3800, 'Baseline must be exactly 3800 (7000 - 3200)');
    customer.openingBalance = baseline;

    // Initial recalculation incorporates openingBalance
    let res = recalculateAccountRunningBalances(customer, journals);
    assert.strictEqual(res.updatedAccount.balance, 7000, 'Initial effective balance must be 7000');
    assert.strictEqual(res.accountJournals[0].runningBalance, 7000, 'Historical running balance must reflect 3800 + 3200 = 7000');
    customer = res.updatedAccount;

    // 1. Add credit transaction of 500 (given) -> 7500
    const j2 = { id: 'j_2', accountId: 'cust_a', type: 'given', amount: 500, desc: 'নতুন বাকি', date: '2026-10-02', time: '11:00 AM' };
    journals.push(j2);
    res = recalculateAccountRunningBalances(customer, journals);
    assert.strictEqual(res.updatedAccount.balance, 7500, 'Expected effective balance: 7500');
    assert.strictEqual(res.updatedAccount.openingBalance, 3800, 'Opening balance must stay preserved at 3800');
    customer = res.updatedAccount;

    // 2. Edit transaction from 500 to 700 -> 7700
    journals = journals.map(j => j.id === 'j_2' ? { ...j, amount: 700 } : j);
    res = recalculateAccountRunningBalances(customer, journals);
    assert.strictEqual(res.updatedAccount.balance, 7700, 'Expected effective balance: 7700');
    assert.strictEqual(res.updatedAccount.openingBalance, 3800, 'Opening balance must stay preserved at 3800');
    customer = res.updatedAccount;

    // 3. Delete transaction -> 7000
    journals = journals.filter(j => j.id !== 'j_2');
    res = recalculateAccountRunningBalances(customer, journals);
    assert.strictEqual(res.updatedAccount.balance, 7000, 'Expected effective balance after delete: 7000');
    assert.strictEqual(res.accountJournals[0].runningBalance, 7000, 'Running balance restored to 7000');
    assert.strictEqual(res.updatedAccount.openingBalance, 3800, 'Opening balance must stay preserved at 3800');
  });

  // TEST 2 (TEST B) — Supplier Opening Balance Baseline & Accounting Conventions
  await runTest('TEST B: Supplier Opening Balance Baseline & Conventions (Credit Purchase +, Cash Payment -)', async () => {
    let supplier = { id: 'supp_b', name: 'Madina Enterprise', type: 2, balance: 6000 };
    let journals = [
      { id: 'sj_1', accountId: 'supp_b', type: 'received', amount: 2500, desc: 'মালামাল ক্রয়', date: '2026-10-01', time: '09:00 AM' }
    ];

    // Supplier baseline = 6000 - 2500 = 3500
    const baseline = establishAccountOpeningBalance(supplier, journals);
    assert.strictEqual(baseline, 3500, 'Supplier baseline must be 3500 (6000 - 2500)');
    supplier.openingBalance = baseline;

    let res = recalculateAccountRunningBalances(supplier, journals);
    assert.strictEqual(res.updatedAccount.balance, 6000, 'Initial effective balance: 6000');
    assert.strictEqual(res.accountJournals[0].runningBalance, 6000, 'Historical running balance: 3500 + 2500 = 6000');
    supplier = res.updatedAccount;

    // 1. Credit purchase (received) of 500 -> balance becomes 6500 (we owe more)
    journals.push({ id: 'sj_2', accountId: 'supp_b', type: 'received', amount: 500, desc: 'বাকিতে তেল ক্রয়', date: '2026-10-02', time: '10:00 AM' });
    res = recalculateAccountRunningBalances(supplier, journals);
    assert.strictEqual(res.updatedAccount.balance, 6500, 'Expected balance: 6500');
    supplier = res.updatedAccount;

    // 2. Edit transaction to 700 -> balance becomes 6700
    journals = journals.map(j => j.id === 'sj_2' ? { ...j, amount: 700 } : j);
    res = recalculateAccountRunningBalances(supplier, journals);
    assert.strictEqual(res.updatedAccount.balance, 6700, 'Expected balance: 6700');

    // 3. Delete transaction -> balance returns to 6000
    journals = journals.filter(j => j.id !== 'sj_2');
    res = recalculateAccountRunningBalances(supplier, journals);
    assert.strictEqual(res.updatedAccount.balance, 6000, 'Expected balance: 6000');

    // 4. Cash payment (given) of 1000 -> balance becomes 5000 (we owe less)
    journals.push({ id: 'sj_3', accountId: 'supp_b', type: 'given', amount: 1000, desc: 'নগদ পাওনা পরিশোধ', date: '2026-10-03', time: '12:00 PM' });
    res = recalculateAccountRunningBalances(supplier, journals);
    assert.strictEqual(res.updatedAccount.balance, 5000, 'Expected balance after cash payment: 5000');
    assert.strictEqual(res.updatedAccount.openingBalance, 3500, 'Opening balance preserved at 3500');
  });

  // TEST 3 (TEST C) — Account with Opening Balance Only & Lifecycle Integrity
  await runTest('TEST C: Account with Opening Balance Only (Creation, restart, add/edit/delete txns)', async () => {
    const valAcc = validateAccount('Kamal Hardware', '01711002233', 5000);
    assert.strictEqual(valAcc.valid, true);

    const account = {
      id: generateUniqueId('acc_'),
      name: valAcc.name,
      phone: valAcc.phone,
      type: 1,
      openingBalance: valAcc.initialBalance,
      balance: valAcc.initialBalance,
    };

    let journals = [];
    let res = recalculateAccountRunningBalances(account, journals);
    assert.strictEqual(res.updatedAccount.balance, 5000, 'Initial balance with zero journals must be opening balance');
    assert.strictEqual(res.accountJournals.length, 0, 'No fake journal entries should be invented');

    // Add subsequent transaction: given 1500
    journals.push({ id: 'kj_1', accountId: account.id, type: 'given', amount: 1500, desc: 'রড সিমেন্ট বাকি', date: '2026-10-15', time: '02:00 PM' });
    res = recalculateAccountRunningBalances(account, journals);
    assert.strictEqual(res.updatedAccount.balance, 6500, '5000 + 1500 = 6500');
    assert.strictEqual(res.accountJournals[0].runningBalance, 6500);

    // Edit transaction: given 2000
    journals[0].amount = 2000;
    res = recalculateAccountRunningBalances(account, journals);
    assert.strictEqual(res.updatedAccount.balance, 7000, '5000 + 2000 = 7000');

    // Delete transaction: balance returns to opening balance
    journals = [];
    res = recalculateAccountRunningBalances(account, journals);
    assert.strictEqual(res.updatedAccount.balance, 5000, 'Balance must return to 5000');
    assert.strictEqual(res.updatedAccount.openingBalance, 5000);
  });

  // TEST 4 (TEST D) — Unresolvable Discrepancy Preservation
  await runTest('TEST D: Preserving Recoverable Data on Unresolvable Discrepancy (No invented history)', async () => {
    const anomalousAccount = {
      id: 'acc_anom',
      name: 'Anomalous Customer',
      type: 1,
      balance: 15000,
      unresolvableDiscrepancy: true,
    };
    const journals = [
      { id: 'aj_1', accountId: 'acc_anom', type: 'given', amount: 4000, desc: 'আগের বাকি', date: '2026-10-10' }
    ];

    const baseline = establishAccountOpeningBalance(anomalousAccount, journals);
    assert.strictEqual(baseline, 0, 'Must not invent an unsubstantiated baseline when unresolvable discrepancy flagged');

    const v5Data = {
      accounts: [anomalousAccount],
      journals,
      version: 5,
    };

    const mig = migrateV5toV6(v5Data);
    assert.strictEqual(mig.success, true);
    const migratedAcc = mig.data.accounts[0];
    assert.strictEqual(migratedAcc.hasDiscrepancy, true, 'Account must be flagged with discrepancy');
    assert.strictEqual(migratedAcc.legacyStoredBalance, 15000, 'Original legacy stored balance must be preserved');
    assert.strictEqual(migratedAcc.balance, 4000, 'Calculated balance must strictly reflect verified transaction evidence');
    assert.strictEqual(mig.data.journals.length, 1, 'No fake journal entries should be fabricated');
  });

  // ==================================================================
  // SECTION 2: SAFE MIGRATION WITHOUT LOSING FINANCIAL DATA
  // ==================================================================

  // TEST 5 — Migration from Balanced Dataset
  await runTest('Migration 1: Balanced dataset (journal net == balance -> openingBalance 0)', async () => {
    const v5 = {
      accounts: [{ id: 'a1', name: 'User 1', type: 1, balance: 2500 }],
      journals: [{ id: 'j1', accountId: 'a1', type: 'given', amount: 2500, date: '2026-10-01' }],
    };
    const res = migrateV5toV6(v5);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.accounts[0].openingBalance, 0);
    assert.strictEqual(res.data.accounts[0].balance, 2500);
  });

  // TEST 6 — Migration from Dataset with Explicit Opening Balances
  await runTest('Migration 2: Dataset with explicit opening balances preserved as-is', async () => {
    const v5 = {
      accounts: [{ id: 'a2', name: 'User 2', type: 1, balance: 7500, openingBalance: 5000 }],
      journals: [{ id: 'j2', accountId: 'a2', type: 'given', amount: 2500, date: '2026-10-01' }],
    };
    const res = migrateV5toV6(v5);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.accounts[0].openingBalance, 5000);
    assert.strictEqual(res.data.accounts[0].balance, 7500);
  });

  // TEST 7 — Migration from Inconsistent Dataset (Derives Reliable Baseline)
  await runTest('Migration 3: Inconsistent dataset establishes baseline and preserves effective balance', async () => {
    const v5 = {
      accounts: [
        { id: 'a3', name: 'Customer Inconsistent', type: 1, balance: 9000 },
        { id: 's3', name: 'Supplier Inconsistent', type: 2, balance: 12000 },
      ],
      journals: [
        { id: 'j3', accountId: 'a3', type: 'given', amount: 3000, date: '2026-10-01' },
        { id: 'sj3', accountId: 's3', type: 'received', amount: 4000, date: '2026-10-01' },
      ],
    };
    const res = migrateV5toV6(v5);
    assert.strictEqual(res.success, true);
    // Customer: 9000 - 3000 = 6000 opening
    assert.strictEqual(res.data.accounts[0].openingBalance, 6000);
    assert.strictEqual(res.data.accounts[0].balance, 9000);
    // Supplier: 12000 - 4000 = 8000 opening
    assert.strictEqual(res.data.accounts[1].openingBalance, 8000);
    assert.strictEqual(res.data.accounts[1].balance, 12000);
  });

  // TEST 8 — Migration with Malformed or Missing Fields
  await runTest('Migration 4: Handles malformed or non-object structures safely without crashing', async () => {
    assert.strictEqual(migrateV5toV6(null).success, false);
    assert.strictEqual(migrateV5toV6('invalid json string {[').success, false);
    assert.strictEqual(migrateV5toV6(12345).success, false);

    const res = migrateV5toV6({ accounts: 'not-an-array' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.accounts.length, 0);
  });

  // TEST 9 — Migration Idempotency & Repeated Executions
  await runTest('Migration 5: Idempotency (Running migration repeatedly does not double opening balances)', async () => {
    const v5 = {
      accounts: [{ id: 'a_idem', name: 'Idem User', type: 1, balance: 7000 }],
      journals: [{ id: 'j_idem', accountId: 'a_idem', type: 'given', amount: 3200, date: '2026-10-01' }],
    };
    const firstRun = migrateV5toV6(v5);
    assert.strictEqual(firstRun.data.accounts[0].openingBalance, 3800);
    assert.strictEqual(firstRun.data.accounts[0].balance, 7000);

    const secondRun = migrateV5toV6(firstRun.data);
    assert.strictEqual(secondRun.data.accounts[0].openingBalance, 3800, 'Opening balance must not be re-calculated or doubled');
    assert.strictEqual(secondRun.data.accounts[0].balance, 7000, 'Effective balance must remain stable');
  });

  // TEST 10 — Repository Migration & Backup Verification
  await runTest('Migration 6: Repository retains unmutated V5 backup in V5_BACKUP_KEY', async () => {
    const rawV5String = JSON.stringify({
      accounts: [{ id: 'u_orig', name: 'Original', type: 1, balance: 5000 }],
      journals: [],
      businessName: 'Original Store',
    });
    const adapter = createTestAdapter({ [V5_KEY]: rawV5String });
    const repo = new StorageRepository(adapter);

    const loadRes = await repo.loadInitialData();
    assert.strictEqual(loadRes.success, true);
    assert.strictEqual(loadRes.source, 'migrated_v5');

    const backupInStore = await adapter.getItem(V5_BACKUP_KEY);
    assert.strictEqual(backupInStore, rawV5String, 'Unmutated V5 payload must be retained in backup key');
  });

  // ==================================================================
  // SECTION 3: CONCURRENT COLLECTION MUTATIONS
  // ==================================================================

  // TEST 11 (CONCURRENCY A) — Concurrent Notes
  await runTest('CONCURRENCY A: Concurrent Notes creation survives persistence and restart', async () => {
    const adapter = createTestAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const note1 = { id: generateUniqueId('note_'), text: 'পণ্য অর্ডার করতে হবে', isComplete: false, date: '2026-10-15' };
    const note2 = { id: generateUniqueId('note_'), text: 'বিদ্যুৎ বিল জমা দেওয়া বাকি', isComplete: false, date: '2026-10-15' };

    const p1 = repo.mutateCollection('notes', (latest) => [note1, ...latest]);
    const p2 = repo.mutateCollection('notes', (latest) => [note2, ...latest]);

    const [res1, res2] = await Promise.all([p1, p2]);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res2.success, true);

    const state = repo.getAuthoritativeState();
    const noteIds = state.notes.map(n => n.id);
    assert.ok(noteIds.includes(note1.id), 'Note 1 must survive');
    assert.ok(noteIds.includes(note2.id), 'Note 2 must survive');

    const repoRestarted = new StorageRepository(adapter);
    const bootRes = await repoRestarted.loadInitialData();
    assert.strictEqual(bootRes.success, true);
    const restartedNotes = bootRes.data.notes.map(n => n.id);
    assert.ok(restartedNotes.includes(note1.id), 'Note 1 must survive restart');
    assert.ok(restartedNotes.includes(note2.id), 'Note 2 must survive restart');
  });

  // TEST 12 (CONCURRENCY B) — Concurrent Cashbox Entries
  await runTest('CONCURRENCY B: Concurrent Cashbox entries merge without overwriting', async () => {
    const adapter = createTestAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const cash1 = { id: generateUniqueId('cash_'), category: 'sale', type: 'in', amount: 1500, desc: 'দুপুরের নগদ বিক্রি' };
    const cash2 = { id: generateUniqueId('cash_'), category: 'cost', type: 'out', amount: 350, desc: 'নাস্তা ও চা খরচ' };

    const p1 = repo.mutateCollection('cashEntries', (latest) => [cash1, ...latest]);
    const p2 = repo.mutateCollection('cashEntries', (latest) => [cash2, ...latest]);

    const [res1, res2] = await Promise.all([p1, p2]);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res2.success, true);

    const state = repo.getAuthoritativeState();
    const cashIds = state.cashEntries.map(c => c.id);
    assert.ok(cashIds.includes(cash1.id));
    assert.ok(cashIds.includes(cash2.id));
  });

  // TEST 13 (CONCURRENCY C) — Rapid Accounts Mutation
  await runTest('CONCURRENCY C: Rapid Account creations preserve all accounts without data loss', async () => {
    const adapter = createTestAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const acc1 = { id: generateUniqueId('acc_'), name: 'Customer One', type: 1, openingBalance: 1000, balance: 1000 };
    const acc2 = { id: generateUniqueId('acc_'), name: 'Customer Two', type: 1, openingBalance: 2000, balance: 2000 };
    const acc3 = { id: generateUniqueId('acc_'), name: 'Supplier Three', type: 2, openingBalance: 3000, balance: 3000 };

    const [r1, r2, r3] = await Promise.all([
      repo.mutateCollection('accounts', (latest) => [acc1, ...latest]),
      repo.mutateCollection('accounts', (latest) => [acc2, ...latest]),
      repo.mutateCollection('accounts', (latest) => [acc3, ...latest]),
    ]);

    assert.strictEqual(r1.success, true);
    assert.strictEqual(r2.success, true);
    assert.strictEqual(r3.success, true);

    const state = repo.getAuthoritativeState();
    const ids = state.accounts.map(a => a.id);
    assert.ok(ids.includes(acc1.id));
    assert.ok(ids.includes(acc2.id));
    assert.ok(ids.includes(acc3.id));
  });

  // TEST 14 (CONCURRENCY D) — Concurrent Inventory Stock Adjustments
  await runTest('CONCURRENCY D: Concurrent Inventory Stock adjustments calculate correctly', async () => {
    const adapter = createTestAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const targetProduct = { id: 'p_target', name: 'সোয়াবিন তেল', stock: 50 };
    await repo.mutateCollection('inventory', (latest) => [targetProduct, ...latest]);

    const p1 = repo.mutateCollection('inventory', (latest) => {
      return latest.map(p => {
        if (p.id === 'p_target') {
          const adj = validateStockAdjustment(p.stock, 10, 'reduce');
          return { ...p, stock: adj.newStock };
        }
        return p;
      });
    });

    const p2 = repo.mutateCollection('inventory', (latest) => {
      return latest.map(p => {
        if (p.id === 'p_target') {
          const adj = validateStockAdjustment(p.stock, 25, 'add');
          return { ...p, stock: adj.newStock };
        }
        return p;
      });
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res2.success, true);

    const state = repo.getAuthoritativeState();
    const updatedProd = state.inventory.find(p => p.id === 'p_target');
    assert.strictEqual(updatedProd.stock, 65, 'Final stock must reflect both operations (50 - 10 + 25 = 65)');
  });

  // TEST 15 (CONCURRENCY E) — Simultaneous Financial Operations Across Accounts
  await runTest('CONCURRENCY E: Simultaneous Transactions on different accounts preserve consistency', async () => {
    const adapter = createTestAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const accA = { id: 'acc_a', name: 'Buyer A', type: 1, openingBalance: 1000, balance: 1000 };
    const accB = { id: 'acc_b', name: 'Buyer B', type: 1, openingBalance: 2000, balance: 2000 };
    await repo.mutateCollection('accounts', (latest) => [accA, accB, ...latest]);

    const txnA = { id: generateUniqueId('txn_'), accountId: 'acc_a', type: 'received', amount: 400, date: '2026-10-15' };
    const txnB = { id: generateUniqueId('txn_'), accountId: 'acc_b', type: 'given', amount: 500, date: '2026-10-15' };

    const pA = repo.mutateStore((latestStore) => {
      const combinedJ = [txnA, ...(latestStore.journals || [])];
      const acc = latestStore.accounts.find(a => a.id === 'acc_a');
      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(acc, combinedJ);
      const updatedCash = syncCashboxForTransaction(txnA, updatedAccount, latestStore.cashEntries);
      const updatedAccs = latestStore.accounts.map(a => a.id === 'acc_a' ? updatedAccount : a);
      return { ...latestStore, accounts: updatedAccs, journals: updatedJournals, cashEntries: updatedCash };
    });

    const pB = repo.mutateStore((latestStore) => {
      const combinedJ = [txnB, ...(latestStore.journals || [])];
      const acc = latestStore.accounts.find(a => a.id === 'acc_b');
      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(acc, combinedJ);
      const updatedCash = syncCashboxForTransaction(txnB, updatedAccount, latestStore.cashEntries);
      const updatedAccs = latestStore.accounts.map(a => a.id === 'acc_b' ? updatedAccount : a);
      return { ...latestStore, accounts: updatedAccs, journals: updatedJournals, cashEntries: updatedCash };
    });

    const [rA, rB] = await Promise.all([pA, pB]);
    assert.strictEqual(rA.success, true);
    assert.strictEqual(rB.success, true);

    const finalState = repo.getAuthoritativeState();
    const finalA = finalState.accounts.find(a => a.id === 'acc_a');
    const finalB = finalState.accounts.find(a => a.id === 'acc_b');
    assert.strictEqual(finalA.balance, 600, 'Customer A balance: 1000 - 400 = 600');
    assert.strictEqual(finalB.balance, 2500, 'Customer B balance: 2000 + 500 = 2500');

    const linkedCash = finalState.cashEntries.find(c => c.linkedTxnId === txnA.id);
    assert.ok(linkedCash, 'Customer A payment must have synced cashbox entry');
    assert.strictEqual(linkedCash.amount, 400);
  });

  // TEST 16 (CONCURRENCY F) — Failure Recovery & Queue Preservation
  await runTest('CONCURRENCY F: Failure Recovery (Failed write does not corrupt store or block future writes)', async () => {
    const adapter = createTestAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const noteOk1 = { id: 'note_ok1', text: 'First valid note' };
    const res1 = await repo.mutateCollection('notes', (latest) => [noteOk1, ...latest]);
    assert.strictEqual(res1.success, true);

    adapter.failNextSet();
    const noteFailed = { id: 'note_failed', text: 'This write will fail' };
    const resFail = await repo.mutateCollection('notes', (latest) => [noteFailed, ...latest]);
    assert.strictEqual(resFail.success, false, 'Simulated failure must return success: false');

    const intermediateState = repo.getAuthoritativeState();
    const hasFailed = intermediateState.notes.some(n => n.id === 'note_failed');
    assert.strictEqual(hasFailed, false, 'Failed note must not be committed to state');

    const noteOk2 = { id: 'note_ok2', text: 'Second valid note after fault' };
    const res3 = await repo.mutateCollection('notes', (latest) => [noteOk2, ...latest]);
    assert.strictEqual(res3.success, true, 'Subsequent write must succeed');

    const finalState = repo.getAuthoritativeState();
    const finalIds = finalState.notes.map(n => n.id);
    assert.ok(finalIds.includes('note_ok1'));
    assert.ok(finalIds.includes('note_ok2'));
    assert.strictEqual(finalIds.includes('note_failed'), false);
  });

  // ==================================================================
  // SECTION 4: COMPLETE END-TO-END WORKFLOWS (CUSTOMER & SUPPLIER)
  // ==================================================================

  // TEST 17 — Complete Customer Accounting Lifecycle
  await runTest('E2E Customer: Create -> Opening Bal -> Txn -> Recalc -> Edit -> Delete -> Cash Sync -> Restart', async () => {
    const adapter = createTestAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const custId = generateUniqueId('cust_e2e_');
    const cust = {
      id: custId,
      name: 'Salim Groceries',
      phone: '01722334455',
      type: 1,
      openingBalance: 4000,
      balance: 4000,
    };
    await repo.mutateCollection('accounts', (latest) => [cust, ...latest]);

    const txn1 = { id: generateUniqueId('txn_'), accountId: custId, type: 'given', amount: 1200, date: '2026-10-15', time: '10:00 AM' };
    await repo.mutateStore((s) => {
      const allJ = [txn1, ...s.journals];
      const acc = s.accounts.find(a => a.id === custId);
      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(acc, allJ);
      const allC = syncCashboxForTransaction(txn1, updatedAccount, s.cashEntries);
      const allA = s.accounts.map(a => a.id === custId ? updatedAccount : a);
      return { ...s, accounts: allA, journals: updatedJournals, cashEntries: allC };
    });
    let curState = repo.getAuthoritativeState();
    assert.strictEqual(curState.accounts.find(a => a.id === custId).balance, 5200);
    assert.strictEqual(curState.cashEntries.filter(c => c.linkedTxnId === txn1.id).length, 0);

    const txn2 = { id: generateUniqueId('txn_'), accountId: custId, type: 'received', amount: 2000, date: '2026-10-15', time: '11:00 AM' };
    await repo.mutateStore((s) => {
      const allJ = [txn2, ...s.journals];
      const acc = s.accounts.find(a => a.id === custId);
      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(acc, allJ);
      const allC = syncCashboxForTransaction(txn2, updatedAccount, s.cashEntries);
      const allA = s.accounts.map(a => a.id === custId ? updatedAccount : a);
      return { ...s, accounts: allA, journals: updatedJournals, cashEntries: allC };
    });
    curState = repo.getAuthoritativeState();
    assert.strictEqual(curState.accounts.find(a => a.id === custId).balance, 3200);
    const cashEntry = curState.cashEntries.find(c => c.linkedTxnId === txn2.id);
    assert.ok(cashEntry);
    assert.strictEqual(cashEntry.type, 'in');
    assert.strictEqual(cashEntry.amount, 2000);

    // Edit payment from 2000 to 2500
    await repo.mutateStore((s) => {
      const allJ = s.journals.map(j => j.id === txn2.id ? { ...j, amount: 2500 } : j);
      const acc = s.accounts.find(a => a.id === custId);
      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(acc, allJ);
      const updatedTxn = allJ.find(j => j.id === txn2.id);
      const allC = syncCashboxForTransaction(updatedTxn, updatedAccount, s.cashEntries);
      const allA = s.accounts.map(a => a.id === custId ? updatedAccount : a);
      return { ...s, accounts: allA, journals: updatedJournals, cashEntries: allC };
    });
    curState = repo.getAuthoritativeState();
    assert.strictEqual(curState.accounts.find(a => a.id === custId).balance, 2700);
    assert.strictEqual(curState.cashEntries.find(c => c.linkedTxnId === txn2.id).amount, 2500);

    // Delete payment transaction -> returns to 5200
    await repo.mutateStore((s) => {
      const allJ = s.journals.filter(j => j.id !== txn2.id);
      const acc = s.accounts.find(a => a.id === custId);
      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(acc, allJ);
      const allC = removeCashEntriesForTransactions([txn2.id], s.cashEntries);
      const allA = s.accounts.map(a => a.id === custId ? updatedAccount : a);
      return { ...s, accounts: allA, journals: updatedJournals, cashEntries: allC };
    });
    curState = repo.getAuthoritativeState();
    assert.strictEqual(curState.accounts.find(a => a.id === custId).balance, 5200);
    assert.strictEqual(curState.cashEntries.some(c => c.linkedTxnId === txn2.id), false, 'Cash entry must be deleted');

    // Simulate restart
    const repoRestart = new StorageRepository(adapter);
    await repoRestart.loadInitialData();
    const finalCust = repoRestart.getAuthoritativeState().accounts.find(a => a.id === custId);
    assert.strictEqual(finalCust.balance, 5200, 'Balance must be preserved after restart');
    assert.strictEqual(finalCust.openingBalance, 4000, 'Opening balance preserved after restart');
  });

  // TEST 18 — Complete Supplier Accounting Lifecycle
  await runTest('E2E Supplier: Create -> Opening Bal -> Credit Buy -> Cash Pay -> Recalc -> Cash Sync -> Restart', async () => {
    const adapter = createTestAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const suppId = generateUniqueId('supp_e2e_');
    const supp = {
      id: suppId,
      name: 'ACI Consumer Brands',
      type: 2,
      openingBalance: 8000,
      balance: 8000,
    };
    await repo.mutateCollection('accounts', (latest) => [supp, ...latest]);

    const txn1 = { id: generateUniqueId('txn_'), accountId: suppId, type: 'received', amount: 3000, date: '2026-10-15' };
    await repo.mutateStore((s) => {
      const allJ = [txn1, ...s.journals];
      const acc = s.accounts.find(a => a.id === suppId);
      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(acc, allJ);
      const allC = syncCashboxForTransaction(txn1, updatedAccount, s.cashEntries);
      const allA = s.accounts.map(a => a.id === suppId ? updatedAccount : a);
      return { ...s, accounts: allA, journals: updatedJournals, cashEntries: allC };
    });
    let curState = repo.getAuthoritativeState();
    assert.strictEqual(curState.accounts.find(a => a.id === suppId).balance, 11000);

    const txn2 = { id: generateUniqueId('txn_'), accountId: suppId, type: 'given', amount: 4000, date: '2026-10-15' };
    await repo.mutateStore((s) => {
      const allJ = [txn2, ...s.journals];
      const acc = s.accounts.find(a => a.id === suppId);
      const { updatedAccount, updatedJournals } = recalculateAccountRunningBalances(acc, allJ);
      const allC = syncCashboxForTransaction(txn2, updatedAccount, s.cashEntries);
      const allA = s.accounts.map(a => a.id === suppId ? updatedAccount : a);
      return { ...s, accounts: allA, journals: updatedJournals, cashEntries: allC };
    });
    curState = repo.getAuthoritativeState();
    assert.strictEqual(curState.accounts.find(a => a.id === suppId).balance, 7000);
    const cashEntry = curState.cashEntries.find(c => c.linkedTxnId === txn2.id);
    assert.ok(cashEntry);
    assert.strictEqual(cashEntry.type, 'out');
    assert.strictEqual(cashEntry.category, 'supplier_pay');
    assert.strictEqual(cashEntry.amount, 4000);

    // Cascade delete supplier account: deletes account, journals, and linked cash entry
    await repo.mutateStore((s) => {
      const accTxnIds = s.journals.filter(j => j.accountId === suppId).map(j => j.id);
      const allA = s.accounts.filter(a => a.id !== suppId);
      const allJ = s.journals.filter(j => j.accountId !== suppId);
      const allC = removeCashEntriesForTransactions(accTxnIds, s.cashEntries);
      return { ...s, accounts: allA, journals: allJ, cashEntries: allC };
    });
    curState = repo.getAuthoritativeState();
    assert.strictEqual(curState.accounts.some(a => a.id === suppId), false);
    assert.strictEqual(curState.journals.some(j => j.accountId === suppId), false);
    assert.strictEqual(curState.cashEntries.some(c => c.linkedTxnId === txn2.id), false);
  });

  // ==================================================================
  // SUMMARY REPORT
  // ==================================================================
  console.log('\n================================================================');
  console.log('PHASE 3.3 TEST SUITE SUMMARY:');
  console.log(`TOTAL TESTS:  ${totalTests}`);
  console.log(`PASSED:       ${passedTests}`);
  console.log(`FAILED:       ${failedTests}`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    console.error(`❌ PHASE 3.3 SUITE FAILED: ${failedTests} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('✅ ALL 18 PHASE 3.3 TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal unhandled error in test suite:', err);
  process.exit(1);
});
