/**
 * test_feature1_room_parity.js
 * Comprehensive Verification Suite for Feature 1: Backend Parity & Room DB Schema Alignment
 * 
 * Verifies:
 * 1. Journal records support reference fields (orig_account_id, txn_type, txn_mode, amount, amount_received, business_id)
 *    while preserving integer-paisa math (1 Taka = 100 Paisa).
 * 2. syncCashboxForTransaction accurately accounts for cash transactions (txn_mode === 1)
 *    and bypasses non-cash/digital adjustments (txn_mode === 2, digital, bank, mfs).
 *    Removes linked cash entries if a transaction is modified to non-cash.
 * 3. Multi-business accountId collisions are completely isolated across filtering, indexing, and recalculating balances.
 */

const assert = require('assert');
const ledgerEngine = require('./src/ledgerEngine');
const { storageRepository, queryJournalsByDateRange, indexJournalsChronologically } = require('./src/storageRepository');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
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
    passedTests++;
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('================================================================');
console.log('FEATURE 1: BACKEND PARITY & ROOM DB SCHEMA ALIGNMENT SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// PART 1: ROOM DB SCHEMA REFERENCE FIELDS & INTEGER-PAISA ARITHMETIC
// -----------------------------------------------------------------------------
console.log('--- PART 1: ROOM DB REFERENCE FIELDS & INTEGER-PAISA ARITHMETIC ---');

runTest('1.1: normalizeJournalFields correctly maps camelCase to Room DB reference fields', () => {
  const customer = { id: 'acc_101', type: 1, businessId: 'biz_1' };
  const journal = {
    id: 'txn_101',
    accountId: '101',
    type: 'given',
    amount: 1500.75,
    businessId: 'biz_1',
    date: '2026-11-02',
    desc: 'বাকিতে মাল বিক্রি',
  };

  const norm = ledgerEngine.normalizeJournalFields(journal, customer);
  assert.strictEqual(norm.accountId, '101');
  assert.strictEqual(norm.orig_account_id, 101);
  assert.strictEqual(norm.businessId, 'biz_1');
  assert.strictEqual(norm.business_id, 'biz_1');
  assert.strictEqual(norm.amount, 1500.75);
  assert.strictEqual(norm.amount_received, 0); // Credit sale -> received is 0
  assert.strictEqual(norm.txn_type, 1); // 1 = Credit sale (বাকি দেওয়া)
  assert.strictEqual(norm.txn_mode, 1); // 1 = Cash mode default
  assert.strictEqual(norm.txn_date, '2026-11-02');
  assert.strictEqual(norm.description, 'বাকিতে মাল বিক্রি');
});

runTest('1.2: normalizeJournalFields correctly maps Room DB reference fields to camelCase', () => {
  const customer = { id: 202, type: 1, business_id: 2 };
  const rawRoomRecord = {
    id: 5001,
    orig_account_id: 202,
    txn_type: 2, // Payment collection (টাকা পাওয়া)
    txn_mode: 1, // Cash
    amount: 750.50,
    amount_received: 750.50,
    business_id: 2,
    txn_date: '2026-11-02',
    description: 'নগদ বাকি আদায়',
  };

  const norm = ledgerEngine.normalizeJournalFields(rawRoomRecord, customer);
  assert.strictEqual(norm.accountId, '202');
  assert.strictEqual(norm.orig_account_id, 202);
  assert.strictEqual(norm.type, 'received'); // txn_type 2 for customer is received
  assert.strictEqual(norm.txn_type, 2);
  assert.strictEqual(norm.amount, 750.50);
  assert.strictEqual(norm.amount_received, 750.50);
  assert.strictEqual(norm.businessId, '2');
  assert.strictEqual(norm.business_id, 2);
  assert.strictEqual(norm.date, '2026-11-02');
  assert.strictEqual(norm.desc, 'নগদ বাকি আদায়');
});

runTest('1.3: normalizeJournalFields for Supplier correctly inverts txn_type conventions', () => {
  const supplier = { id: 'sup_1', type: 2, businessId: '1' };
  
  // Supplier Credit Purchase: txn_type 1 -> received
  const purchase = { orig_account_id: 'sup_1', txn_type: 1, amount: 5000 };
  const normPurchase = ledgerEngine.normalizeJournalFields(purchase, supplier);
  assert.strictEqual(normPurchase.type, 'received');
  assert.strictEqual(normPurchase.txn_type, 1);

  // Supplier Payment Made: txn_type 2 -> given
  const payment = { orig_account_id: 'sup_1', txn_type: 2, amount: 3000 };
  const normPayment = ledgerEngine.normalizeJournalFields(payment, supplier);
  assert.strictEqual(normPayment.type, 'given');
  assert.strictEqual(normPayment.txn_type, 2);
  assert.strictEqual(normPayment.amount_received, 3000);
});

runTest('1.4: Strict integer-paisa precision (1 Taka = 100 Paisa) with fractional sums', () => {
  // Test floating point edge cases: 50.75 Taka = 5075 Paisa
  const customer = { id: 'c1', type: 1, openingBalance: 0 };
  const journals = [
    { id: 'j1', orig_account_id: 'c1', txn_type: 1, amount: 50.75 }, // +50.75
    { id: 'j2', orig_account_id: 'c1', txn_type: 1, amount: 0.10 },  // +0.10
    { id: 'j3', orig_account_id: 'c1', txn_type: 1, amount: 0.20 },  // +0.20 (0.1+0.2 float hazard)
    { id: 'j4', orig_account_id: 'c1', txn_type: 2, amount: 25.05 }, // -25.05
  ];

  const { updatedAccount, accountJournals } = ledgerEngine.recalculateAccountRunningBalances(customer, journals);
  // Expected: 50.75 + 0.10 + 0.20 - 25.05 = 26.00 exactly
  assert.strictEqual(updatedAccount.balance, 26.00);
  assert.strictEqual(accountJournals[0].runningBalance, 26.00);
});

runTest('1.5: validateTransaction accepts single object with Room DB schema fields', () => {
  const res = ledgerEngine.validateTransaction({
    orig_account_id: 101,
    txn_type: 1,
    amount: 1250.25,
    description: 'চাল ক্রয়',
  });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.amount, 1250.25);

  const res2 = ledgerEngine.validateTransaction(500, 2);
  assert.strictEqual(res2.valid, true);
  assert.strictEqual(res2.amount, 500);
});

// -----------------------------------------------------------------------------
// PART 2: CASHBOX SYNCHRONIZATION & DIGITAL BYPASS (syncCashboxForTransaction)
// -----------------------------------------------------------------------------
console.log('\n--- PART 2: CASHBOX SYNCHRONIZATION & DIGITAL BYPASS ---');

runTest('2.1: Cash payment received (customer, txn_mode: 1) records cash-in entry', () => {
  const customer = { id: 'c10', name: 'রহিম ট্রেডার্স', type: 1, businessId: '1' };
  const txn = {
    id: 'tx_99',
    accountId: 'c10',
    type: 'received',
    txn_mode: 1, // Cash
    amount: 2500,
    date: '2026-11-02',
    time: '11:00 AM',
  };

  const cashEntries = ledgerEngine.syncCashboxForTransaction(txn, customer, []);
  assert.strictEqual(cashEntries.length, 1);
  assert.strictEqual(cashEntries[0].type, 'in');
  assert.strictEqual(cashEntries[0].category, 'baki_aday');
  assert.strictEqual(cashEntries[0].amount, 2500);
  assert.strictEqual(cashEntries[0].linkedTxnId, 'tx_99');
  assert.strictEqual(cashEntries[0].txn_mode, 1);
});

runTest('2.2: Cash payment given (supplier, txn_mode: 1) records cash-out entry', () => {
  const supplier = { id: 's20', name: 'আল-মদিনা মিল', type: 2, businessId: '1' };
  const txn = {
    id: 'tx_100',
    accountId: 's20',
    type: 'given',
    txn_mode: 1, // Cash
    amount: 4000,
    date: '2026-11-02',
    time: '12:30 PM',
  };

  const cashEntries = ledgerEngine.syncCashboxForTransaction(txn, supplier, []);
  assert.strictEqual(cashEntries.length, 1);
  assert.strictEqual(cashEntries[0].type, 'out');
  assert.strictEqual(cashEntries[0].category, 'supplier_pay');
  assert.strictEqual(cashEntries[0].amount, 4000);
  assert.strictEqual(cashEntries[0].linkedTxnId, 'tx_100');
});

runTest('2.3: Credit sale (customer, type: given / txn_type: 1) bypasses cashbox', () => {
  const customer = { id: 'c10', name: 'রহিম ট্রেডার্স', type: 1, businessId: '1' };
  const txn = {
    id: 'tx_101',
    accountId: 'c10',
    type: 'given',
    txn_mode: 1,
    amount: 1500,
    date: '2026-11-02',
  };

  const cashEntries = ledgerEngine.syncCashboxForTransaction(txn, customer, []);
  assert.strictEqual(cashEntries.length, 0); // No cash entry created
});

runTest('2.4: Digital transactions (txn_mode: 2, digital, bank, mfs) bypass cashbox completely', () => {
  const customer = { id: 'c10', name: 'রহিম ট্রেডার্স', type: 1, businessId: '1' };
  
  // txn_mode === 2 (Digital)
  const txn1 = { id: 'tx_d1', accountId: 'c10', type: 'received', txn_mode: 2, amount: 1000 };
  assert.strictEqual(ledgerEngine.syncCashboxForTransaction(txn1, customer, []).length, 0);

  // txn_mode === 'digital'
  const txn2 = { id: 'tx_d2', accountId: 'c10', type: 'received', txn_mode: 'digital', amount: 1000 };
  assert.strictEqual(ledgerEngine.syncCashboxForTransaction(txn2, customer, []).length, 0);

  // txn_mode === 'bank'
  const txn3 = { id: 'tx_d3', accountId: 'c10', type: 'received', txn_mode: 'bank', amount: 1000 };
  assert.strictEqual(ledgerEngine.syncCashboxForTransaction(txn3, customer, []).length, 0);

  // txn_mode === 'mfs'
  const txn4 = { id: 'tx_d4', accountId: 'c10', type: 'received', txn_mode: 'mfs', amount: 1000 };
  assert.strictEqual(ledgerEngine.syncCashboxForTransaction(txn4, customer, []).length, 0);

  // isDigital: true
  const txn5 = { id: 'tx_d5', accountId: 'c10', type: 'received', isDigital: true, amount: 1000 };
  assert.strictEqual(ledgerEngine.syncCashboxForTransaction(txn5, customer, []).length, 0);
});

runTest('2.5: Modification of cash transaction to digital PURGES linked cashbox entry', () => {
  const customer = { id: 'c10', name: 'রহিম ট্রেডার্স', type: 1, businessId: '1' };
  
  // Step 1: Created initially as cash payment
  const cashTxn = { id: 'tx_edit_1', accountId: 'c10', type: 'received', txn_mode: 1, amount: 2000 };
  let cashEntries = ledgerEngine.syncCashboxForTransaction(cashTxn, customer, []);
  assert.strictEqual(cashEntries.length, 1);
  assert.strictEqual(cashEntries[0].linkedTxnId, 'tx_edit_1');

  // Step 2: User edits transaction to digital (txn_mode: 2)
  const digitalTxn = { id: 'tx_edit_1', accountId: 'c10', type: 'received', txn_mode: 2, amount: 2000 };
  cashEntries = ledgerEngine.syncCashboxForTransaction(digitalTxn, customer, cashEntries);
  
  // Linked cash entry must be automatically purged!
  assert.strictEqual(cashEntries.length, 0);
});

runTest('2.6: Partial cash collection uses amount_received for cashbox inflow', () => {
  const customer = { id: 'c10', name: 'রহিম', type: 1, businessId: '1' };
  const txn = {
    id: 'tx_partial',
    accountId: 'c10',
    type: 'received',
    amount: 1000,
    amount_received: 350.50, // Partial cash received
    txn_mode: 1,
  };

  const cashEntries = ledgerEngine.syncCashboxForTransaction(txn, customer, []);
  assert.strictEqual(cashEntries.length, 1);
  assert.strictEqual(cashEntries[0].amount, 350.50);
});

// -----------------------------------------------------------------------------
// PART 3: CROSS-BUSINESS ACCOUNT ID COLLISION ISOLATION
// -----------------------------------------------------------------------------
console.log('\n--- PART 3: CROSS-BUSINESS ACCOUNT ID COLLISION ISOLATION ---');

runTest('3.1: Indexing journals by account isolates accounts sharing the same id in different businesses', () => {
  const journals = [
    { id: 'j1', accountId: '1', businessId: '1', amount: 100 },
    { id: 'j2', accountId: '1', businessId: '1', amount: 200 },
    { id: 'j3', orig_account_id: '1', business_id: '2', amount: 999 }, // Same ID '1', but Business 2!
  ];

  const map = ledgerEngine.indexJournalsByAccount(journals);
  assert.ok(map.has('1:1'));
  assert.ok(map.has('2:1'));
  assert.strictEqual(map.get('1:1').length, 2);
  assert.strictEqual(map.get('2:1').length, 1);
  assert.strictEqual(map.get('1:1')[0].amount, 100);
  assert.strictEqual(map.get('2:1')[0].amount, 999);
});

runTest('3.2: recalculateAccountRunningBalances isolates accounts sharing ID across businesses', () => {
  const accBiz1 = { id: '1', name: 'দোকান ১ কাস্টমার', type: 1, businessId: '1', openingBalance: 0 };
  const accBiz2 = { id: '1', name: 'দোকান ২ কাস্টমার', type: 1, businessId: '2', openingBalance: 0 };

  const allJournals = [
    { id: 'j1', accountId: '1', businessId: '1', type: 'given', amount: 500 },
    { id: 'j2', orig_account_id: '1', business_id: '2', txn_type: 1, amount: 8000 },
  ];

  const res1 = ledgerEngine.recalculateAccountRunningBalances(accBiz1, allJournals);
  const res2 = ledgerEngine.recalculateAccountRunningBalances(accBiz2, allJournals);

  // Business 1 customer balance must be 500, NOT 8500
  assert.strictEqual(res1.updatedAccount.balance, 500);
  assert.strictEqual(res1.accountJournals.length, 1);
  assert.strictEqual(res1.accountJournals[0].amount, 500);

  // Business 2 customer balance must be 8000, NOT 8500
  assert.strictEqual(res2.updatedAccount.balance, 8000);
  assert.strictEqual(res2.accountJournals.length, 1);
  assert.strictEqual(res2.accountJournals[0].amount, 8000);
});

runTest('3.3: recalculateAllAccountBalances batch calculation guarantees zero cross-business contamination', () => {
  const accounts = [
    { id: '1', type: 1, businessId: '1', openingBalance: 100 },
    { id: '1', type: 1, businessId: '2', openingBalance: 500 },
  ];

  const allJournals = [
    { id: 'j1_1', accountId: '1', businessId: '1', type: 'given', amount: 50 },
    { id: 'j2_1', orig_account_id: '1', business_id: '2', txn_type: 1, amount: 200 },
  ];

  const res = ledgerEngine.recalculateAllAccountBalances(accounts, allJournals);
  const acc1 = res.updatedAccounts.find(a => String(a.businessId) === '1');
  const acc2 = res.updatedAccounts.find(a => String(a.businessId) === '2');

  assert.strictEqual(acc1.balance, 150); // 100 + 50
  assert.strictEqual(acc2.balance, 700); // 500 + 200
});

runTest('3.4: queryJournalsByDateRange scopes strictly by business_id and orig_account_id', () => {
  const journals = [
    { id: '1', orig_account_id: '1', business_id: '1', txn_date: '2026-11-02', txn_type: 1, amount: 100 },
    { id: '2', orig_account_id: '1', business_id: '2', txn_date: '2026-11-02', txn_type: 1, amount: 999 },
    { id: '3', accountId: '2', businessId: '1', date: '2026-11-02', type: 'given', amount: 300 },
  ];

  // Query with Room DB reference options: business_id: '1', orig_account_id: '1'
  const res = queryJournalsByDateRange(journals, '2026-11-01', '2026-11-03', {
    business_id: '1',
    orig_account_id: '1',
  });

  assert.strictEqual(res.journals.length, 1);
  assert.strictEqual(res.journals[0].id, '1');
  assert.strictEqual(res.journals[0].amount, 100);

  // Query with txn_type filter
  const resCredit = queryJournalsByDateRange(journals, '2026-11-01', '2026-11-03', {
    txn_type: 1,
    business_id: '1',
  });
  assert.strictEqual(resCredit.journals.length, 2); // id '1' and id '3'
});

runTest('3.5: filterByBusiness in storageRepository respects both businessId and business_id', () => {
  const mixed = [
    { id: 'a', businessId: '1' },
    { id: 'b', business_id: 1 },
    { id: 'c', businessId: '2' },
    { id: 'd', business_id: 2 },
    { id: 'e' }, // legacy default '1'
  ];

  const biz1 = storageRepository.filterByBusiness(mixed, '1');
  const biz2 = storageRepository.filterByBusiness(mixed, '2');

  assert.strictEqual(biz1.length, 3); // 'a', 'b', 'e'
  assert.strictEqual(biz2.length, 2); // 'c', 'd'
});

runTest('3.6: calculateAggregateMetrics & deriveCashBoxSummary isolate by business_id', () => {
  const accounts = [
    { id: '1', type: 1, balance: 1000, business_id: 'biz_X' },
    { id: '2', type: 1, balance: 5000, business_id: 'biz_Y' },
  ];

  const mX = ledgerEngine.calculateAggregateMetrics(accounts, [], 'biz_X');
  assert.strictEqual(mX.totalReceivable, 1000);
  assert.strictEqual(mX.customerCount, 1);

  const cash = [
    { id: 'c1', type: 'in', amount: 300, business_id: 'biz_X' },
    { id: 'c2', type: 'in', amount: 7000, business_id: 'biz_Y' },
  ];

  const cbX = ledgerEngine.deriveCashBoxSummary(cash, 'biz_X');
  assert.strictEqual(cbX.cashIn, 300);
  assert.strictEqual(cbX.netCash, 300);
});

console.log('\n================================================================');
console.log(`FEATURE 1 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
console.log('================================================================');
