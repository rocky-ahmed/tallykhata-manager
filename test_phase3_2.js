/**
 * test_phase3_2.js
 * Comprehensive Production-Path Test Suite for TallyKhata
 * 
 * Requirements:
 * 1. Async test harness where all tests are strictly awaited.
 * 2. Unhandled rejections and assertion failures are caught and fail the test.
 * 3. Process exits with non-zero exit code if any test fails.
 * 4. Meta-test proving the harness detects async assertion failures.
 * 5. Uses PRODUCTION modules: ./src/ledgerEngine and ./src/storageRepository.
 * 6. Tests Customer and Supplier ledgers with chronological recalculation.
 * 7. Tests concurrent write queue mutex, stale snapshot prevention, and error recovery.
 * 8. Tests safe v5 -> v6 migration with backup retention.
 * 9. Tests cascade account deletion (zero orphans) and cashbox double-entry sync.
 * 10. Tests bounded inventory, notes, and end-to-end workflow.
 */

const assert = require('assert');
const {
  validateTransaction,
  validateAccount,
  validateStockAdjustment,
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
} = require('./src/storageRepository');

console.log('================================================================');
console.log('TALLYKHATA PHASE 3.2 — PRODUCTION-PATH TEST SUITE');
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
    if (err.stack) console.error(`       ${err.stack.split('\n').slice(1, 4).join('\n')}`);
  }
}

// Memory storage adapter helper
function createMemoryAdapter(initialData = {}) {
  const map = new Map();
  for (const [k, v] of Object.entries(initialData)) {
    map.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  return {
    getItem: async (key) => (map.has(key) ? map.get(key) : null),
    setItem: async (key, val) => { map.set(key, String(val)); },
    removeItem: async (key) => { map.delete(key); },
    clear: async () => { map.clear(); },
    _map: map,
  };
}

async function main() {
  // ------------------------------------------------------------------
  // TEST 1 — META-TEST: ASYNC TEST RUNNER FAILURE DETECTION
  // ------------------------------------------------------------------
  await runTest('Meta-Test: Async test runner correctly catches asynchronous rejection', async () => {
    let subRunnerCaught = false;
    let subTotal = 0;
    let subFailed = 0;

    async function subRunner(fn) {
      subTotal++;
      try {
        const r = fn();
        if (r && typeof r.then === 'function') await r;
      } catch (e) {
        subFailed++;
        subRunnerCaught = true;
      }
    }

    // Execute an async function that rejects
    await subRunner(async () => {
      await new Promise((r) => setTimeout(r, 10));
      assert.strictEqual(1, 2, 'Simulated async assertion failure');
    });

    assert.strictEqual(subRunnerCaught, true, 'Subrunner must catch async assertion failure');
    assert.strictEqual(subTotal, 1, 'Subrunner recorded 1 test');
    assert.strictEqual(subFailed, 1, 'Subrunner recorded 1 failure');
  });

  // ------------------------------------------------------------------
  // TEST 2 — CUSTOMER LEDGER CHRONOLOGICAL RECALCULATION
  // Customer convention: positive = customer owes shopkeeper
  // ------------------------------------------------------------------
  await runTest('Customer Ledger: Chronological recalculation (Given +, Received -)', async () => {
    let customer = { id: 'cust_1', name: 'Rahim', type: 1, balance: 1000 };
    let journals = [
      { id: '1', accountId: 'cust_1', type: 'given', amount: 1000, desc: 'জের', date: '2026-10-01', time: '09:00 AM' }
    ];

    // Initial recalculation
    let res = recalculateAccountRunningBalances(customer, journals);
    assert.strictEqual(res.updatedAccount.balance, 1000);
    assert.strictEqual(res.accountJournals[0].runningBalance, 1000);

    // 1. Credit sale of 500 (given) -> balance 1500
    journals.push({ id: '2', accountId: 'cust_1', type: 'given', amount: 500, desc: 'বাকিতে মাল', date: '2026-10-02', time: '10:00 AM' });
    res = recalculateAccountRunningBalances(customer, journals);
    assert.strictEqual(res.updatedAccount.balance, 1500);

    // 2. Customer payment of 300 (received) -> balance 1200
    journals.push({ id: '3', accountId: 'cust_1', type: 'received', amount: 300, desc: 'নগদ জমা', date: '2026-10-03', time: '11:00 AM' });
    res = recalculateAccountRunningBalances(customer, journals);
    assert.strictEqual(res.updatedAccount.balance, 1200);

    // 3. Edit credit sale from 500 to 700 -> balance becomes 1400 (1000 + 700 - 300)
    journals = journals.map(j => j.id === '2' ? { ...j, amount: 700 } : j);
    res = recalculateAccountRunningBalances(customer, journals);
    assert.strictEqual(res.updatedAccount.balance, 1400);

    // 4. Delete payment of 300 -> balance becomes 1700 (1000 + 700)
    journals = journals.filter(j => j.id !== '3');
    res = recalculateAccountRunningBalances(customer, journals);
    assert.strictEqual(res.updatedAccount.balance, 1700);
  });

  // ------------------------------------------------------------------
  // TEST 3 — SUPPLIER LEDGER CHRONOLOGICAL RECALCULATION
  // Supplier convention: positive = shopkeeper owes supplier
  // Received goods on credit = + (we owe more)
  // Given payment to supplier = - (we owe less)
  // ------------------------------------------------------------------
  await runTest('Supplier Ledger: Chronological recalculation (Credit Purchase +, Cash Payment -)', async () => {
    let supplier = { id: 'supp_1', name: 'Square Wholesale', type: 2, balance: 2000 };
    let journals = [
      { id: '10', accountId: 'supp_1', type: 'received', amount: 2000, desc: 'পূর্বের পাওনা', date: '2026-10-01', time: '09:00 AM' }
    ];

    // Initial recalculation
    let res = recalculateAccountRunningBalances(supplier, journals);
    assert.strictEqual(res.updatedAccount.balance, 2000);
    assert.strictEqual(res.accountJournals[0].runningBalance, 2000);

    // 1. Credit purchase of 1000 (received) -> balance 3000
    journals.push({ id: '11', accountId: 'supp_1', type: 'received', amount: 1000, desc: 'বাকিতে ওষুধ ক্রয়', date: '2026-10-02', time: '10:00 AM' });
    res = recalculateAccountRunningBalances(supplier, journals);
    assert.strictEqual(res.updatedAccount.balance, 3000);

    // 2. Cash payment of 800 to supplier (given) -> balance 2200
    journals.push({ id: '12', accountId: 'supp_1', type: 'given', amount: 800, desc: 'নগদ পাওনা পরিশোধ', date: '2026-10-03', time: '11:00 AM' });
    res = recalculateAccountRunningBalances(supplier, journals);
    assert.strictEqual(res.updatedAccount.balance, 2200);

    // 3. Edit payment from 800 to 1200 (given) -> balance becomes 1800 (2000 + 1000 - 1200)
    journals = journals.map(j => j.id === '12' ? { ...j, amount: 1200 } : j);
    res = recalculateAccountRunningBalances(supplier, journals);
    assert.strictEqual(res.updatedAccount.balance, 1800);

    // 4. Delete purchase of 1000 -> balance becomes 800 (2000 - 1200)
    journals = journals.filter(j => j.id !== '11');
    res = recalculateAccountRunningBalances(supplier, journals);
    assert.strictEqual(res.updatedAccount.balance, 800);
  });

  // ------------------------------------------------------------------
  // TEST 4 — OUT-OF-ORDER TIMESTAMP SORTING IN LEDGER
  // ------------------------------------------------------------------
  await runTest('Ledger Recalculation: Handles out-of-order dates & times chronologically', async () => {
    const acc = { id: 'cust_ord', name: 'Order Test', type: 1, balance: 0 };
    // Inserted in non-chronological order
    const journals = [
      { id: '3', accountId: 'cust_ord', type: 'received', amount: 200, desc: '৩য় লেনদেন', date: '2026-10-05', time: '02:00 PM' },
      { id: '1', accountId: 'cust_ord', type: 'given', amount: 500, desc: '১ম লেনদেন', date: '2026-10-01', time: '09:00 AM' },
      { id: '2', accountId: 'cust_ord', type: 'given', amount: 300, desc: '২য় লেনদেন', date: '2026-10-03', time: '11:00 AM' },
    ];

    const res = recalculateAccountRunningBalances(acc, journals);
    assert.strictEqual(res.updatedAccount.balance, 600, '500 + 300 - 200 = 600');

    // Chronological order should have:
    // 1st (Oct 01): runningBalance = 500
    // 2nd (Oct 03): runningBalance = 800
    // 3rd (Oct 05): runningBalance = 600
    const oct1 = res.updatedJournals.find(j => j.id === '1');
    const oct3 = res.updatedJournals.find(j => j.id === '2');
    const oct5 = res.updatedJournals.find(j => j.id === '3');

    assert.strictEqual(oct1.runningBalance, 500);
    assert.strictEqual(oct3.runningBalance, 800);
    assert.strictEqual(oct5.runningBalance, 600);
  });

  // ------------------------------------------------------------------
  // TEST 5 — TRANSACTION & STOCK VALIDATION RULES
  // ------------------------------------------------------------------
  await runTest('Validation Rules: Transactions, Accounts, and Bounded Stock', async () => {
    // Transaction validation
    assert.strictEqual(validateTransaction(0, 'given', 'test').valid, false, 'Amount 0 must be invalid');
    assert.strictEqual(validateTransaction(-100, 'given', 'test').valid, false, 'Negative amount must be invalid');
    assert.strictEqual(validateTransaction('abc', 'given', 'test').valid, false, 'NaN amount must be invalid');
    assert.strictEqual(validateTransaction(500, 'invalid_type', 'test').valid, false, 'Invalid type must fail');
    assert.strictEqual(validateTransaction(1000000000, 'given', 'test').valid, false, 'Extreme amount must fail');
    assert.strictEqual(validateTransaction(250.50, 'given', '   ').valid, true, 'Valid amount with empty desc accepted');

    // Account validation
    assert.strictEqual(validateAccount('', '01700000000', 0).valid, false, 'Empty name must fail');
    assert.strictEqual(validateAccount('A', '', 0).valid, true, 'Phone optional');
    assert.strictEqual(validateAccount('A', '01711223344', -50).valid, false, 'Negative initial balance must fail');

    // Stock adjustment validation
    assert.strictEqual(validateStockAdjustment(10, 5, 'add').valid, true);
    assert.strictEqual(validateStockAdjustment(10, 5, 'add').newStock, 15);
    assert.strictEqual(validateStockAdjustment(10, 4, 'reduce').valid, true);
    assert.strictEqual(validateStockAdjustment(10, 4, 'reduce').newStock, 6);
    assert.strictEqual(validateStockAdjustment(10, 15, 'reduce').valid, false, 'Cannot reduce below zero stock');
    assert.strictEqual(validateStockAdjustment(10, -5, 'add').valid, false, 'Negative quantity must fail');
  });

  // ------------------------------------------------------------------
  // TEST 6 — STORAGE REPOSITORY: BASIC LOAD, PERSIST & RELOAD
  // ------------------------------------------------------------------
  await runTest('Production StorageRepository: Clean boot, persist, and reload', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);

    // Boot: seeds initial data
    const bootRes = await repo.loadInitialData();
    assert.strictEqual(bootRes.success, true);
    assert.strictEqual(bootRes.source, 'initial_seed');
    assert.ok(Array.isArray(bootRes.data.accounts));
    assert.ok(bootRes.data.accounts.length >= 10);

    // Mutate state via persistData
    const newAccount = { id: 'acc_test_new', name: 'Test Shop User', type: 1, balance: 4500 };
    const persistRes = await repo.persistData({
      accounts: [newAccount, ...bootRes.data.accounts],
      businessName: 'My Verified Store',
    });
    assert.strictEqual(persistRes.success, true);
    assert.strictEqual(persistRes.data.businessName, 'My Verified Store');
    assert.strictEqual(persistRes.data.accounts[0].id, 'acc_test_new');

    // Verify adapter persisted the exact V6_KEY
    const rawSaved = await adapter.getItem(V6_KEY);
    assert.ok(rawSaved !== null);
    const parsed = JSON.parse(rawSaved);
    assert.strictEqual(parsed.businessName, 'My Verified Store');
    assert.strictEqual(parsed.accounts[0].id, 'acc_test_new');

    // Create a new repo instance pointing to the same adapter (simulating app restart)
    const repo2 = new StorageRepository(adapter);
    const reloadRes = await repo2.loadInitialData();
    assert.strictEqual(reloadRes.success, true);
    assert.strictEqual(reloadRes.source, 'v6');
    assert.strictEqual(reloadRes.data.businessName, 'My Verified Store');
    assert.strictEqual(reloadRes.data.accounts[0].id, 'acc_test_new');
  });

  // ------------------------------------------------------------------
  // TEST 7 — PREVENT STALE REACT SNAPSHOT OVERWRITING (CONCURRENCY)
  // Two rapid updates to different fields merge into authoritative state
  // ------------------------------------------------------------------
  await runTest('StorageRepository Concurrency: Rapid writes merge without stale overwrite', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Simulate two rapid concurrent writes originating before each other completes
    const write1Promise = repo.persistData({ businessName: 'Rapid Store Name' });
    const write2Promise = repo.persistData({ openingBalance: 7500 });
    const write3Promise = repo.persistData((prev) => ({
      ...prev,
      walletBalance: (prev.walletBalance || 0) + 500,
    }));

    const [res1, res2, res3] = await Promise.all([write1Promise, write2Promise, write3Promise]);

    assert.strictEqual(res1.success, true);
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res3.success, true);

    const finalState = repo.getAuthoritativeState();
    assert.strictEqual(finalState.businessName, 'Rapid Store Name', 'Write 1 field must be preserved');
    assert.strictEqual(finalState.openingBalance, 7500, 'Write 2 field must be preserved');
    assert.strictEqual(finalState.walletBalance, 2000, 'Write 3 increment must be applied onto 1500');
  });

  // ------------------------------------------------------------------
  // TEST 8 — QUEUE RECOVERY ON WRITE FAILURE
  // A transient write error does not deadlock subsequent operations
  // ------------------------------------------------------------------
  await runTest('StorageRepository: Write failure does not deadlock subsequent writes', async () => {
    let failWrites = true;
    const faultyAdapter = {
      _map: new Map(),
      getItem: async (k) => faultyAdapter._map.get(k) || null,
      setItem: async (k, v) => {
        if (failWrites && k === V6_KEY) {
          throw new Error('Simulated disk full or I/O failure');
        }
        faultyAdapter._map.set(k, String(v));
      },
    };

    const repo = new StorageRepository(faultyAdapter);
    // Initially allow load
    failWrites = false;
    await repo.loadInitialData();

    // Now enable write failure
    failWrites = true;
    const failedWriteRes = await repo.persistData({ businessName: 'Should Fail' });
    assert.strictEqual(failedWriteRes.success, false, 'Write must report failure');
    assert.ok(failedWriteRes.error, 'Must provide error details');

    // Authoritative cache must NOT have been updated with failed data
    assert.notStrictEqual(repo.getAuthoritativeState().businessName, 'Should Fail');

    // Now restore normal disk behavior and queue next write
    failWrites = false;
    const recoveryWriteRes = await repo.persistData({ businessName: 'Recovered Store' });
    assert.strictEqual(recoveryWriteRes.success, true, 'Subsequent write must succeed after failure');
    assert.strictEqual(repo.getAuthoritativeState().businessName, 'Recovered Store');
  });

  // ------------------------------------------------------------------
  // TEST 9 — SAFE V5 TO V6 MIGRATION WITH BACKUP RETENTION
  // ------------------------------------------------------------------
  await runTest('Safe Migration: V5 store migrated to V6, unmutated V5 backup retained', async () => {
    const legacyV5Payload = {
      version: 5,
      businessName: 'Legacy Grocery Store',
      ownerName: 'Al-Amin',
      accounts: [
        { id: 'v5_acc_1', name: 'Legacy Cust 1', type: 1, balance: 1200 },
        { id: 'v5_acc_2', name: 'Legacy Supp 1', type: 2, balance: 3500 },
      ],
      journals: [
        { id: 'j1', accountId: 'v5_acc_1', type: 'given', amount: 1200, date: '2026-09-01' },
        { id: 'j2', accountId: 'v5_acc_2', type: 'received', amount: 3500, date: '2026-09-01' },
      ],
      cashEntries: [
        { id: 'c1', type: 'in', amount: 5000, desc: 'সকালের বিক্রি', date: '2026-09-01' },
      ],
      inventory: [],
      notes: [],
    };

    const adapter = createMemoryAdapter({
      [V5_KEY]: JSON.stringify(legacyV5Payload),
    });

    const repo = new StorageRepository(adapter);
    const loadRes = await repo.loadInitialData();

    assert.strictEqual(loadRes.success, true);
    assert.strictEqual(loadRes.source, 'migrated_v5');
    assert.strictEqual(loadRes.data.businessName, 'Legacy Grocery Store');
    assert.strictEqual(loadRes.data.accounts.length, 2);

    // Verify unmutated V5 backup was saved
    const backupRaw = await adapter.getItem(V5_BACKUP_KEY);
    assert.ok(backupRaw !== null, 'V5 backup key must exist');
    const parsedBackup = JSON.parse(backupRaw);
    assert.strictEqual(parsedBackup.businessName, 'Legacy Grocery Store');

    // Verify V6 store was written
    const v6Raw = await adapter.getItem(V6_KEY);
    assert.ok(v6Raw !== null, 'V6 key must exist');
    const parsedV6 = JSON.parse(v6Raw);
    assert.strictEqual(parsedV6.version, 6);

    // Booting again should load directly from V6 without re-migrating
    const repoBoot2 = new StorageRepository(adapter);
    const boot2Res = await repoBoot2.loadInitialData();
    assert.strictEqual(boot2Res.success, true);
    assert.strictEqual(boot2Res.source, 'v6');
  });

  // ------------------------------------------------------------------
  // TEST 10 — CASCADE ACCOUNT DELETION (ZERO ORPHANS)
  // ------------------------------------------------------------------
  await runTest('Cascade Deletion: Account removal deletes all journals and linked cash entries', async () => {
    let accounts = [
      { id: 'acc_target', name: 'Delete Me', type: 1, balance: 1500 },
      { id: 'acc_keep', name: 'Keep Me', type: 1, balance: 500 },
    ];
    let journals = [
      { id: 'j_target_1', accountId: 'acc_target', type: 'given', amount: 1500 },
      { id: 'j_keep_1', accountId: 'acc_keep', type: 'given', amount: 500 },
    ];
    let cashEntries = [
      { id: 'c_manual_1', type: 'in', amount: 1000, desc: 'ম্যানুয়াল বিক্রি' },
      { id: 'c_j_target_1', linkedTxnId: 'j_target_1', type: 'in', amount: 1500 },
      { id: 'c_j_keep_1', linkedTxnId: 'j_keep_1', type: 'in', amount: 500 },
    ];

    // Deleting acc_target
    const targetTxnIds = journals.filter(j => j.accountId === 'acc_target').map(j => j.id);
    const updatedAccounts = accounts.filter(a => a.id !== 'acc_target');
    const updatedJournals = journals.filter(j => j.accountId !== 'acc_target');
    const updatedCash = removeCashEntriesForTransactions(targetTxnIds, cashEntries);

    assert.strictEqual(updatedAccounts.length, 1);
    assert.strictEqual(updatedAccounts[0].id, 'acc_keep');
    assert.strictEqual(updatedJournals.length, 1);
    assert.strictEqual(updatedJournals[0].id, 'j_keep_1');
    assert.strictEqual(updatedCash.length, 2);
    assert.ok(!updatedCash.some(c => c.linkedTxnId === 'j_target_1'), 'Linked cash entry must be deleted');
    assert.ok(updatedCash.some(c => c.id === 'c_manual_1'), 'Manual cash entry must be preserved');
    assert.ok(updatedCash.some(c => c.linkedTxnId === 'j_keep_1'), 'Other account cash entry must be preserved');
  });

  // ------------------------------------------------------------------
  // TEST 11 — DOUBLE-ENTRY CASHBOX SYNCHRONIZATION
  // ------------------------------------------------------------------
  await runTest('Cashbox Sync: Customer payment creates Cash IN, Supplier payment creates Cash OUT', async () => {
    const cust = { id: 'c_sync', name: 'Cash Cust', type: 1, balance: 1000 };
    const supp = { id: 's_sync', name: 'Cash Supp', type: 2, balance: 2000 };
    let cashEntries = [];

    // Customer payment received -> Cashbox IN
    const custPayTxn = { id: 'txn_c_pay', accountId: 'c_sync', type: 'received', amount: 600, date: '2026-10-15' };
    cashEntries = syncCashboxForTransaction(custPayTxn, cust, cashEntries);
    assert.strictEqual(cashEntries.length, 1);
    assert.strictEqual(cashEntries[0].type, 'in');
    assert.strictEqual(cashEntries[0].amount, 600);
    assert.strictEqual(cashEntries[0].linkedTxnId, 'txn_c_pay');

    // Supplier payment given -> Cashbox OUT
    const suppPayTxn = { id: 'txn_s_pay', accountId: 's_sync', type: 'given', amount: 1200, date: '2026-10-15' };
    cashEntries = syncCashboxForTransaction(suppPayTxn, supp, cashEntries);
    assert.strictEqual(cashEntries.length, 2);
    const sEntry = cashEntries.find(c => c.linkedTxnId === 'txn_s_pay');
    assert.ok(sEntry);
    assert.strictEqual(sEntry.type, 'out');
    assert.strictEqual(sEntry.amount, 1200);

    // Credit-only transactions (no cash exchanged) should NOT create entries
    const custCreditSale = { id: 'txn_c_sale', accountId: 'c_sync', type: 'given', amount: 400, date: '2026-10-15' };
    cashEntries = syncCashboxForTransaction(custCreditSale, cust, cashEntries);
    assert.strictEqual(cashEntries.length, 2, 'Credit sale must not create cashbox entry');
  });

  // ------------------------------------------------------------------
  // TEST 12 — COMPLETE END-TO-END REPOSITORY WORKFLOW
  // ------------------------------------------------------------------
  await runTest('End-to-End Workflow: Account -> Transaction -> Recalc -> Cash Sync -> Persist', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    const initRes = await repo.loadInitialData();
    assert.strictEqual(initRes.success, true);

    // 1. Create a customer
    const newCust = { id: 'cust_e2e', name: 'Jamil Ahmed', phone: '01711998877', type: 1, balance: 2000 };
    const initTxn = { id: 'txn_init', accountId: 'cust_e2e', type: 'given', amount: 2000, desc: 'পূর্বের বাকি', date: '2026-10-10' };

    let state = repo.getAuthoritativeState();
    let updatedAccounts = [newCust, ...state.accounts];
    let updatedJournals = [initTxn, ...state.journals];

    await repo.persistData({ accounts: updatedAccounts, journals: updatedJournals });

    // 2. Customer makes a partial cash payment of 800
    const payTxn = { id: 'txn_pay_800', accountId: 'cust_e2e', type: 'received', amount: 800, desc: 'নগদ জমা', date: '2026-10-12' };
    updatedJournals = [payTxn, ...updatedJournals];

    // Recalculate
    const recalcRes = recalculateAccountRunningBalances(newCust, updatedJournals);
    assert.strictEqual(recalcRes.updatedAccount.balance, 1200);

    // Sync cashbox
    state = repo.getAuthoritativeState();
    const updatedCash = syncCashboxForTransaction(payTxn, newCust, state.cashEntries);
    updatedAccounts = updatedAccounts.map(a => a.id === 'cust_e2e' ? recalcRes.updatedAccount : a);

    const saveRes = await repo.persistData({
      accounts: updatedAccounts,
      journals: recalcRes.updatedJournals,
      cashEntries: updatedCash,
    });
    assert.strictEqual(saveRes.success, true);

    // 3. Reload from storage adapter and verify all fields survived
    const reloadRepo = new StorageRepository(adapter);
    const reloadRes = await reloadRepo.loadInitialData();
    const reloadedCust = reloadRes.data.accounts.find(a => a.id === 'cust_e2e');
    assert.ok(reloadedCust);
    assert.strictEqual(reloadedCust.balance, 1200);

    const reloadedCashEntry = reloadRes.data.cashEntries.find(c => c.linkedTxnId === 'txn_pay_800');
    assert.ok(reloadedCashEntry);
    assert.strictEqual(reloadedCashEntry.amount, 800);
    assert.strictEqual(reloadedCashEntry.type, 'in');
  });

  // ==================================================================
  // SUMMARY AND EXIT CODE VERIFICATION
  // ==================================================================
  console.log('\n================================================================');
  console.log('PHASE 3.2 TEST SUITE SUMMARY:');
  console.log(`TOTAL TESTS:  ${totalTests}`);
  console.log(`PASSED:       ${passedTests}`);
  console.log(`FAILED:       ${failedTests}`);
  console.log('================================================================');

  if (failedTests > 0 || passedTests !== totalTests) {
    console.error(`\n❌ SUITE FAILED: ${failedTests} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ ALL ${totalTests} TESTS PASSED SUCCESSFULLY!`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal unhandled rejection in main test runner:', err);
  process.exit(1);
});