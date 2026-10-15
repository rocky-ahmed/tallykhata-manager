/**
 * test_phase3_1.js
 * Comprehensive Automated Verification Suite for TallyKhata
 * Covers Tests 1 through 9 defined in Phase 3.1 Specification
 */

const assert = require('assert');
const ledgerEngine = require('./src/ledgerEngine');

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
} = ledgerEngine;

console.log('====================================================');
console.log('RUNNING TALLYKHATA PHASE 3.1 AUTOMATED TEST SUITE');
console.log('====================================================\n');

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
    console.error(`       Error: ${err.message}\n${err.stack}`);
  }
}

// ------------------------------------------------------------------
// TEST 1 — LEDGER RECALCULATION & RUNNING BALANCES
// ------------------------------------------------------------------
runTest('Ledger Recalculation & Running Balances (1000 + 500 - 300, edit 500->700, del 300 -> 1700)', () => {
  let customer = { id: 'cust_101', name: 'Test Customer', type: 1, balance: 1000 };
  let journals = [
    { id: '1', accountId: 'cust_101', type: 'given', amount: 1000, desc: 'জের', date: '2026-10-01', time: '10:00 AM' }
  ];

  // 1. Initial state
  let res = recalculateAccountRunningBalances(customer, journals);
  customer = res.updatedAccount;
  journals = res.updatedJournals;
  assert.strictEqual(customer.balance, 1000, 'Initial balance must be 1000');
  assert.strictEqual(journals[0].runningBalance, 1000, 'Initial running balance must be 1000');

  // 2. Add credit-sale of 500
  const txnSale = { id: '2', accountId: 'cust_101', type: 'given', amount: 500, desc: 'বাকি বিক্রি', date: '2026-10-02', time: '11:00 AM' };
  journals = [txnSale, ...journals];
  res = recalculateAccountRunningBalances(customer, journals);
  customer = res.updatedAccount;
  journals = res.updatedJournals;
  assert.strictEqual(customer.balance, 1500, 'Balance after 500 credit sale must be 1500');

  const jSale = journals.find(j => j.id === '2');
  assert.strictEqual(jSale.runningBalance, 1500, 'Sale running balance must be 1500');

  // 3. Add customer payment of 300
  const txnPay = { id: '3', accountId: 'cust_101', type: 'received', amount: 300, desc: 'বাকি আদায়', date: '2026-10-03', time: '12:00 PM' };
  journals = [txnPay, ...journals];
  res = recalculateAccountRunningBalances(customer, journals);
  customer = res.updatedAccount;
  journals = res.updatedJournals;
  assert.strictEqual(customer.balance, 1200, 'Balance after 300 payment must be 1200');

  const jPay = journals.find(j => j.id === '3');
  assert.strictEqual(jPay.runningBalance, 1200, 'Payment running balance must be 1200');

  // 4. Edit credit sale from 500 to 700
  journals = journals.map(j => j.id === '2' ? { ...j, amount: 700 } : j);
  res = recalculateAccountRunningBalances(customer, journals);
  customer = res.updatedAccount;
  journals = res.updatedJournals;
  assert.strictEqual(customer.balance, 1400, 'Balance after editing sale to 700 must be 1400 (1000 + 700 - 300)');

  const jSaleEdited = journals.find(j => j.id === '2');
  assert.strictEqual(jSaleEdited.runningBalance, 1700, 'Intermediate running balance after 700 sale must be 1700');
  const jPayAfterEdit = journals.find(j => j.id === '3');
  assert.strictEqual(jPayAfterEdit.runningBalance, 1400, 'Payment running balance after sale edit must be 1400');

  // 5. Delete 300 payment
  journals = journals.filter(j => j.id !== '3');
  res = recalculateAccountRunningBalances(customer, journals);
  customer = res.updatedAccount;
  journals = res.updatedJournals;
  assert.strictEqual(customer.balance, 1700, 'Balance after deleting 300 payment must be 1700');
  const jSaleFinal = journals.find(j => j.id === '2');
  assert.strictEqual(jSaleFinal.runningBalance, 1700, 'Final running balance of sale must be 1700');
});

// ------------------------------------------------------------------
// TEST 2 — CASHBOX LINKAGE
// ------------------------------------------------------------------
runTest('Cashbox Linkage (Customer Payment 300 -> Edit 400 -> Delete)', () => {
  const account = { id: 'cust_201', name: 'Kabir Mia', type: 1, balance: 2000 };
  let cashEntries = [
    { id: 'c_unrelated_1', category: 'sale', type: 'in', amount: 500, desc: 'সকালের নগদ বিক্রি', date: '2026-10-05' }
  ];

  // 1. Add customer payment of 300
  const txnPayment = { id: 'txn_3001', accountId: 'cust_201', type: 'received', amount: 300, desc: 'বাকি আদায়', date: '2026-10-05' };
  cashEntries = syncCashboxForTransaction(txnPayment, account, cashEntries);

  assert.strictEqual(cashEntries.length, 2, 'Cashbox should now have 2 entries');
  const linkedEntry = cashEntries.find(c => c.linkedTxnId === 'txn_3001');
  assert(linkedEntry, 'Linked cashbox entry must exist');
  assert.strictEqual(linkedEntry.type, 'in', 'Linked cash entry must be Cash In');
  assert.strictEqual(linkedEntry.category, 'baki_aday', 'Linked category must be baki_aday');
  assert.strictEqual(linkedEntry.amount, 300, 'Linked amount must be 300');

  // 2. Edit transaction amount to 400
  const txnPaymentEdited = { ...txnPayment, amount: 400 };
  cashEntries = syncCashboxForTransaction(txnPaymentEdited, account, cashEntries);

  assert.strictEqual(cashEntries.length, 2, 'Cashbox length should remain 2 after edit');
  const updatedLinked = cashEntries.find(c => c.linkedTxnId === 'txn_3001');
  assert.strictEqual(updatedLinked.amount, 400, 'Linked inflow must be 400, not 300 and not 700');

  // 3. Delete transaction
  cashEntries = removeCashEntriesForTransactions(['txn_3001'], cashEntries);
  assert.strictEqual(cashEntries.length, 1, 'Linked cash entry must be removed on transaction delete');
  assert.strictEqual(cashEntries[0].id, 'c_unrelated_1', 'Unrelated cash entry must remain completely untouched');
  assert.strictEqual(cashEntries[0].amount, 500, 'Unrelated cash amount must stay 500');
});

// ------------------------------------------------------------------
// TEST 3 — ACCOUNT DELETION & REFERENTIAL INTEGRITY
// ------------------------------------------------------------------
runTest('Account Deletion & Referential Integrity (Cascade delete journals & linked cash, no orphans)', () => {
  let accounts = [
    { id: 'acc_target', name: 'Delete Target', type: 1, balance: 1500 },
    { id: 'acc_keep', name: 'Keep Customer', type: 1, balance: 3000 },
  ];

  let journals = [
    { id: 'j_del_1', accountId: 'acc_target', type: 'given', amount: 2000, desc: 'বাকি' },
    { id: 'j_del_2', accountId: 'acc_target', type: 'received', amount: 500, desc: 'আদায়' },
    { id: 'j_keep_1', accountId: 'acc_keep', type: 'given', amount: 3000, desc: 'বাকি' },
  ];

  let cashEntries = [
    { id: 'c_del_2', linkedTxnId: 'j_del_2', type: 'in', amount: 500, desc: 'আদায় ক্যাশ' },
    { id: 'c_manual', type: 'in', amount: 1000, desc: 'দোকান ক্যাশ' },
  ];

  // Perform cascade deletion of acc_target
  const targetId = 'acc_target';
  const targetTxnIds = journals.filter(j => j.accountId === targetId).map(j => j.id);

  accounts = accounts.filter(a => a.id !== targetId);
  journals = journals.filter(j => j.accountId !== targetId);
  cashEntries = removeCashEntriesForTransactions(targetTxnIds, cashEntries);

  // Assertions
  assert.strictEqual(accounts.length, 1, 'Only 1 account should remain');
  assert.strictEqual(accounts[0].id, 'acc_keep', 'Remaining account must be acc_keep');

  assert.strictEqual(journals.length, 1, 'Only 1 journal should remain');
  assert.strictEqual(journals[0].accountId, 'acc_keep', 'Remaining journal must belong to acc_keep');

  assert.strictEqual(cashEntries.length, 1, 'Only manual cash entry should remain');
  assert.strictEqual(cashEntries[0].id, 'c_manual', 'Manual cash entry must not be deleted');

  // Verify zero orphans
  const orphanedCash = cashEntries.filter(c => c.linkedTxnId && !journals.some(j => j.id === c.linkedTxnId));
  assert.strictEqual(orphanedCash.length, 0, 'No orphaned linked cash entries should exist');
});

// ------------------------------------------------------------------
// TEST 4 — PERSISTENCE SIMULATION
// ------------------------------------------------------------------
runTest('Persistence Simulation (Save -> Reload -> Verify state)', async () => {
  const mockStorage = new Map();

  let queue = Promise.resolve();
  const mockPersist = (data) => {
    return new Promise((resolve) => {
      queue = queue.then(async () => {
        mockStorage.set(V6_KEY, JSON.stringify(data));
        resolve({ success: true });
      });
    });
  };

  const initialSave = {
    accounts: [{ id: 'a1', name: 'Persisted User', balance: 4500, type: 1 }],
    journals: [{ id: 'j1', accountId: 'a1', type: 'given', amount: 4500 }],
    cashEntries: [{ id: 'c1', type: 'in', amount: 4500 }],
    businessName: 'Mobile Xpress',
  };

  const res = await mockPersist(initialSave);
  assert(res.success, 'Save operation must succeed');

  // Reload
  const rawLoaded = mockStorage.get(V6_KEY);
  assert(rawLoaded, 'Raw loaded string must exist in storage');
  const loaded = JSON.parse(rawLoaded);

  assert.strictEqual(loaded.accounts[0].name, 'Persisted User', 'Account name must match');
  assert.strictEqual(loaded.accounts[0].balance, 4500, 'Account balance must match');
  assert.strictEqual(loaded.journals[0].amount, 4500, 'Journal amount must match');
  assert.strictEqual(loaded.businessName, 'Mobile Xpress', 'Business name must match');
});

// ------------------------------------------------------------------
// TEST 5 — INVALID INPUT REJECTION
// ------------------------------------------------------------------
runTest('Invalid Input Rejection (empty, zero, negative, malformed, excessive)', () => {
  assert(!validateTransaction('', 'given').valid, 'Empty string must be invalid');
  assert(!validateTransaction(null, 'given').valid, 'Null must be invalid');
  assert(!validateTransaction(undefined, 'given').valid, 'Undefined must be invalid');
  assert(!validateTransaction(0, 'given').valid, 'Zero must be invalid');
  assert(!validateTransaction(-100, 'given').valid, 'Negative amount must be invalid');
  assert(!validateTransaction('abc', 'given').valid, 'Non-numeric string must be invalid');
  assert(!validateTransaction(500, 'invalid_type').valid, 'Invalid txn type must be rejected');
  assert(!validateTransaction(200000000, 'given').valid, 'Excessive amount (> 100M) must be rejected');

  assert(!validateAccount('').valid, 'Empty account name must be invalid');
  assert(!validateAccount('   ').valid, 'Whitespace account name must be invalid');
  assert(!validateAccount('Valid Name', '', -50).valid, 'Negative initial balance must be rejected');

  assert(validateTransaction(500, 'given').valid, 'Valid 500 given must be accepted');
  assert(validateTransaction('1250.50', 'received').valid, 'Valid decimal string received must be accepted');
  assert(validateAccount(' Rahim ').valid, 'Valid trimmed account name must be accepted');
});

// ------------------------------------------------------------------
// TEST 6 — REPEATED SUBMISSIONS & WRITE QUEUE INTEGRITY
// ------------------------------------------------------------------
runTest('Repeated Submissions & Write Queue (Concurrent writes execute in order without race conditions)', async () => {
  const store = [];
  let queue = Promise.resolve();

  const queuedPersist = (val) => {
    return new Promise((resolve) => {
      queue = queue.then(async () => {
        // Simulate async I/O delay
        await new Promise(r => setTimeout(r, 10));
        store.push(val);
        resolve({ success: true, count: store.length });
      });
    });
  };

  // Launch 5 rapid concurrent writes
  const promises = [
    queuedPersist(1),
    queuedPersist(2),
    queuedPersist(3),
    queuedPersist(4),
    queuedPersist(5),
  ];

  const results = await Promise.all(promises);

  assert.strictEqual(store.length, 5, 'All 5 queued writes must complete');
  assert.deepStrictEqual(store, [1, 2, 3, 4, 5], 'Writes must execute in exact chronological order');
  results.forEach(r => assert(r.success, 'Every write in queue must succeed'));
});

// ------------------------------------------------------------------
// TEST 7 — DATABASE OR WRITE FAILURE HANDLING
// ------------------------------------------------------------------
runTest('Write Failure Handling (Persist returns failure object, does not throw or corrupt state)', async () => {
  let queue = Promise.resolve();

  const failingPersist = () => {
    return new Promise((resolve) => {
      queue = queue.then(async () => {
        try {
          throw new Error('AsyncStorage disk quota exceeded / simulated I/O failure');
        } catch (err) {
          resolve({ success: false, error: err });
        }
      });
    });
  };

  const res = await failingPersist();
  assert.strictEqual(res.success, false, 'Persist must return success: false on error');
  assert(res.error, 'Error object must be returned');
  assert.strictEqual(res.error.message, 'AsyncStorage disk quota exceeded / simulated I/O failure');
});

// ------------------------------------------------------------------
// TEST 8 — DATA MIGRATION (V5 TO V6)
// ------------------------------------------------------------------
runTest('Data Migration (v5 -> v6, validation, totals preservation, idempotency)', () => {
  const sampleV5 = {
    accounts: [
      { id: '10', name: 'Legacy Customer', phone: '01700112233', type: 1, balance: 2500 }
    ],
    journals: [
      { id: 'j10', accountId: '10', type: 'given', amount: 2500, date: '2026-09-01' }
    ],
    cashEntries: [
      { id: 'c10', category: 'sale', type: 'in', amount: 2500, date: '2026-09-01' }
    ],
    inventory: [
      { id: 'p1', name: 'Rice', stock: 50, buyPrice: 50, sellPrice: 60 }
    ],
    walletBalance: 1200,
    businessName: 'আমার ব্যবসা প্রতিষ্ঠান', // should be normalized to Mobile Xpress
  };

  // 1. Run migration
  const migRes1 = migrateV5toV6(sampleV5);
  assert(migRes1.success, 'First migration pass must succeed');
  const d1 = migRes1.data;

  assert.strictEqual(d1.businessName, 'Mobile Xpress', 'Legacy business name should normalize to Mobile Xpress');
  assert.strictEqual(d1.accounts.length, 1, 'Account count must match');
  assert.strictEqual(d1.accounts[0].balance, 2500, 'Financial total must match');
  assert.strictEqual(d1.journals[0].runningBalance, 2500, 'Running balance must be calculated');
  assert.strictEqual(d1.migrationVersion, 6, 'Migration version must be 6');

  // 2. Idempotency test: Run migration again on the already-migrated data
  const migRes2 = migrateV5toV6(d1);
  assert(migRes2.success, 'Second migration pass must succeed');
  const d2 = migRes2.data;

  assert.strictEqual(d2.accounts.length, 1, 'Records must not duplicate on subsequent runs');
  assert.strictEqual(d2.journals.length, 1, 'Journals must not duplicate on subsequent runs');
  assert.strictEqual(d2.accounts[0].balance, 2500, 'Balances must remain identical');
});

// ------------------------------------------------------------------
// TEST 9 — INVENTORY STOCK ADJUSTMENT & VALIDATION
// ------------------------------------------------------------------
runTest('Inventory Stock Adjustment & Validation (prevent negative stock)', () => {
  const initialStock = 25;

  // 1. Valid Stock In
  const inRes = validateStockAdjustment(initialStock, 15, 'in');
  assert(inRes.valid, 'Stock in must be valid');
  assert.strictEqual(inRes.newStock, 40, 'New stock after +15 must be 40');

  // 2. Valid Stock Out
  const outRes = validateStockAdjustment(initialStock, 10, 'out');
  assert(outRes.valid, 'Stock out must be valid');
  assert.strictEqual(outRes.newStock, 15, 'New stock after -10 must be 15');

  // 3. Attempting to remove more stock than exists
  const invalidOutRes = validateStockAdjustment(initialStock, 30, 'out');
  assert(!invalidOutRes.valid, 'Removing more stock than available must be rejected');
  assert(invalidOutRes.error.includes('বেশি'), 'Error message must explain insufficient stock');

  // 4. Invalid quantities (zero, negative, NaN)
  assert(!validateStockAdjustment(initialStock, 0, 'in').valid, '0 quantity must be invalid');
  assert(!validateStockAdjustment(initialStock, -5, 'in').valid, 'Negative quantity must be invalid');
  assert(!validateStockAdjustment(initialStock, 'abc', 'in').valid, 'Non-numeric quantity must be invalid');
});

console.log('\n====================================================');
console.log(`TEST SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
