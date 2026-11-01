/**
 * test_feature6_double_entry_ledger_parity.js
 * Comprehensive Room DB Parity & Double-Entry Accounting Ledger Automated Verification Suite
 *
 * Verifies 100% parity against Dalvik bytecode evidence in classes4.dex:
 * - Table: CREATE TABLE account (id, name, contact, type, ac_date, start_balance, description, create_date, synced, share_link, last_share_media, is_updated, last_update_date, is_active, server_id, synced_date, report_visibility, business_id, profile_image_device, profile_image)
 * - Table: CREATE TABLE journal (id, amount, amount_received, txn_type, txn_mode, description, txn_date, create_date, orig_account_id, synced, is_updated, last_update_date, is_active, server_id, synced_date, business_id)
 * - Table: CREATE TABLE ledger (id, amount, type, journal_id, account_id, create_date, synced, is_active, server_id)
 *
 * Scope:
 * 1. normalizeAccountFields: Bidirectional mapping between Room DB columns and camelCase application state.
 * 2. Integer-paisa monetary precision (1 Taka = 100 Paisa) and IEEE-754 drift elimination.
 * 3. Customer (type 1) and Supplier (type 2) dual-convention running balance calculations.
 * 4. Cross-business compound indexing `${businessId}:${accountId}` preventing multi-tenant balance bleed.
 * 5. Full double-entry balance reconciliation with start_balance / startBalance / openingBalance.
 * 6. Customer & Supplier account queries and search filtering.
 * 7. Frontend AST syntax integrity verification via Babel.
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const ledgerEngine = require('./src/ledgerEngine');
const {
  normalizeAccountFields,
  normalizeJournalFields,
  recalculateAccountRunningBalances,
  recalculateAllAccountBalances,
  establishAccountOpeningBalance,
  indexJournalsByAccount,
  queryCustomerAccounts,
  createAccountLookupMap,
} = ledgerEngine;

const storageRepository = require('./src/storageRepository');

console.log('================================================================');
console.log('FEATURE 6: CUSTOMER & SUPPLIER DOUBLE-ENTRY LEDGER PARITY SUITE');
console.log('================================================================\n');

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

// ============================================================================
// PART 1: ROOM DB SCHEMA PARITY & NORMALIZE_ACCOUNT_FIELDS MAPPING
// ============================================================================
console.log('--- PART 1: ROOM DB SCHEMA PARITY & FIELD NORMALIZATION ---');

runTest('normalizeAccountFields maps Room DB reference columns into camelCase state', () => {
  const roomDbAccount = {
    id: 101,
    name: 'করিম এন্টারপ্রাইজ',
    contact: '01711223344',
    type: 1,
    ac_date: '2026-10-01',
    start_balance: 5000.75,
    description: 'পাইকারি কাস্টমার',
    create_date: '2026-10-01T10:00:00.000Z',
    synced: 1,
    share_link: 'https://tk.link/acc/101',
    last_share_media: 'whatsapp',
    is_updated: 0,
    last_update_date: null,
    is_active: 1,
    server_id: 9988,
    synced_date: '2026-10-01T10:05:00.000Z',
    report_visibility: 1,
    business_id: 2,
    profile_image_device: '/data/user/0/img101.jpg',
    profile_image: 'https://cdn.tk.com/img101.jpg',
  };

  const norm = normalizeAccountFields(roomDbAccount);
  assert.strictEqual(norm.id, '101');
  assert.strictEqual(norm.account_id, 101);
  assert.strictEqual(norm.name, 'করিম এন্টারপ্রাইজ');
  assert.strictEqual(norm.contact, '01711223344');
  assert.strictEqual(norm.phone, '01711223344');
  assert.strictEqual(norm.type, 1);
  assert.strictEqual(norm.account_type, 1);
  assert.strictEqual(norm.start_balance, 5000.75);
  assert.strictEqual(norm.openingBalance, 5000.75);
  assert.strictEqual(norm.startBalance, 5000.75);
  assert.strictEqual(norm.balance, 5000.75);
  assert.strictEqual(norm.businessId, '2');
  assert.strictEqual(norm.business_id, 2);
  assert.strictEqual(norm.ac_date, '2026-10-01');
  assert.strictEqual(norm.date, '2026-10-01');
  assert.strictEqual(norm.is_active, 1);
  assert.strictEqual(norm.isActive, true);
  assert.strictEqual(norm.isArchived, false);
  assert.strictEqual(norm.report_visibility, 1);
  assert.strictEqual(norm.reportVisibility, true);
  assert.strictEqual(norm.synced, 1);
  assert.strictEqual(norm.server_id, 9988);
  assert.strictEqual(norm.share_link, 'https://tk.link/acc/101');
  assert.strictEqual(norm.profile_image, 'https://cdn.tk.com/img101.jpg');
});

runTest('normalizeAccountFields maps camelCase state properties back to Room DB fields', () => {
  const stateAccount = {
    id: 'cust_202',
    name: 'রহিম ট্রেডার্স',
    phone: '01899887766',
    type: 1,
    openingBalance: 12000.5,
    businessId: '3',
    isArchived: true,
    notes: 'ভিআইপি গ্রাহক',
  };

  const norm = normalizeAccountFields(stateAccount);
  assert.strictEqual(norm.id, 'cust_202');
  assert.strictEqual(norm.name, 'রহিম ট্রেডার্স');
  assert.strictEqual(norm.contact, '01899887766');
  assert.strictEqual(norm.phone, '01899887766');
  assert.strictEqual(norm.start_balance, 12000.5);
  assert.strictEqual(norm.openingBalance, 12000.5);
  assert.strictEqual(norm.business_id, 3);
  assert.strictEqual(norm.businessId, '3');
  assert.strictEqual(norm.is_active, 0);
  assert.strictEqual(norm.isArchived, true);
  assert.strictEqual(norm.isActive, false);
  assert.strictEqual(norm.description, 'ভিআইপি গ্রাহক');
});

runTest('normalizeAccountFields normalizes string types customer and supplier correctly', () => {
  const cust = normalizeAccountFields({ name: 'Cust', type: 'customer' });
  const supp = normalizeAccountFields({ name: 'Supp', type: 'supplier' });
  const custUpper = normalizeAccountFields({ name: 'CustU', type: 'CUSTOMER' });
  const suppUpper = normalizeAccountFields({ name: 'SuppU', type: 'SUPPLIER' });

  assert.strictEqual(cust.type, 1);
  assert.strictEqual(cust.account_type, 1);
  assert.strictEqual(supp.type, 2);
  assert.strictEqual(supp.account_type, 2);
  assert.strictEqual(custUpper.type, 1);
  assert.strictEqual(suppUpper.type, 2);
});

runTest('normalizeAccountFields defaults to businessId 1 when omitted', () => {
  const norm = normalizeAccountFields({ name: 'Default Biz Acc' });
  assert.strictEqual(norm.businessId, '1');
  assert.strictEqual(norm.business_id, 1);
});

runTest('storageRepository exports normalizeAccountFields with 1:1 identity', () => {
  assert.strictEqual(typeof storageRepository.normalizeAccountFields, 'function');
  const res = storageRepository.normalizeAccountFields({ name: 'Repo Test', contact: '01700000000', start_balance: 100 });
  assert.strictEqual(res.name, 'Repo Test');
  assert.strictEqual(res.openingBalance, 100);
  assert.strictEqual(res.start_balance, 100);
});

// ============================================================================
// PART 2: INTEGER-PAISA MONETARY PRECISION & FLOAT DRIFT ELIMINATION
// ============================================================================
console.log('\n--- PART 2: INTEGER-PAISA MONETARY PRECISION ---');

runTest('Monetary amounts enforce exact integer-paisa precision without 3rd decimal drift', () => {
  const raw = {
    name: 'Paisa Acc',
    start_balance: 1250.555,
    balance: 3400.999,
  };
  const norm = normalizeAccountFields(raw);
  assert.strictEqual(norm.start_balance, 1250.56);
  assert.strictEqual(norm.openingBalance, 1250.56);
  assert.strictEqual(norm.balance, 3401.00);
});

runTest('Running balance calculations eliminate 0.10 + 0.20 IEEE-754 floating point drift', () => {
  const acc = normalizeAccountFields({ id: 'fp_acc', type: 1, openingBalance: 0 });
  const journals = [
    { id: 'j1', accountId: 'fp_acc', type: 'given', amount: 0.1, date: '2026-10-01' },
    { id: 'j2', accountId: 'fp_acc', type: 'given', amount: 0.2, date: '2026-10-02' },
  ];
  const { updatedAccount, accountJournals } = recalculateAccountRunningBalances(acc, journals);
  assert.strictEqual(updatedAccount.balance, 0.3);
  assert.strictEqual(accountJournals[0].runningBalance, 0.3);
  assert.strictEqual(accountJournals[1].runningBalance, 0.1);
});

runTest('Boundary financial transactions up to 100,000,000 Taka calculate cleanly', () => {
  const acc = normalizeAccountFields({ id: 'whale', type: 1, start_balance: 50000000 });
  const journals = [
    { id: 'j1', accountId: 'whale', type: 'given', amount: 25000000.50, date: '2026-10-01' },
    { id: 'j2', accountId: 'whale', type: 'received', amount: 15000000.25, date: '2026-10-02' },
  ];
  const { updatedAccount } = recalculateAccountRunningBalances(acc, journals);
  // 50,000,000 + 25,000,000.50 - 15,000,000.25 = 60,000,000.25
  assert.strictEqual(updatedAccount.balance, 60000000.25);
});

// ============================================================================
// PART 3: DUAL-CONVENTION DOUBLE-ENTRY RUNNING BALANCES
// ============================================================================
console.log('\n--- PART 3: DUAL-CONVENTION DOUBLE-ENTRY RUNNING BALANCES ---');

runTest('Customer (type 1): Given increases debt (+), Received decreases debt (-)', () => {
  const cust = normalizeAccountFields({ id: 'c101', type: 1, start_balance: 1000 });
  const journals = [
    { id: 'j1', accountId: 'c101', type: 'given', amount: 500, date: '2026-10-01', time: '10:00' },
    { id: 'j2', accountId: 'c101', type: 'received', amount: 300, date: '2026-10-02', time: '11:00' },
    { id: 'j3', accountId: 'c101', type: 'given', amount: 700, date: '2026-10-03', time: '12:00' },
  ];
  const { updatedAccount, accountJournals } = recalculateAccountRunningBalances(cust, journals);
  // 1000 + 500 - 300 + 700 = 1900
  assert.strictEqual(updatedAccount.balance, 1900);
  assert.strictEqual(updatedAccount.openingBalance, 1000);
  assert.strictEqual(updatedAccount.start_balance, 1000);
  assert.strictEqual(updatedAccount.startBalance, 1000);

  // accountJournals rendered newest first for UI: j3, j2, j1
  assert.strictEqual(accountJournals[0].id, 'j3');
  assert.strictEqual(accountJournals[0].runningBalance, 1900);
  assert.strictEqual(accountJournals[1].id, 'j2');
  assert.strictEqual(accountJournals[1].runningBalance, 1200);
  assert.strictEqual(accountJournals[2].id, 'j1');
  assert.strictEqual(accountJournals[2].runningBalance, 1500);
});

runTest('Customer (type 1): Overpayment produces negative balance representing advance deposit', () => {
  const cust = normalizeAccountFields({ id: 'c_adv', type: 1, start_balance: 500 });
  const journals = [
    { id: 'j1', accountId: 'c_adv', type: 'received', amount: 800, date: '2026-10-01' },
  ];
  const { updatedAccount } = recalculateAccountRunningBalances(cust, journals);
  // 500 - 800 = -300
  assert.strictEqual(updatedAccount.balance, -300);
});

runTest('Supplier (type 2): Received increases debt (+), Given decreases debt (-)', () => {
  const supp = normalizeAccountFields({ id: 's201', type: 2, start_balance: 5000 });
  const journals = [
    { id: 'j1', accountId: 's201', type: 'received', amount: 2000, date: '2026-10-01', time: '09:00' },
    { id: 'j2', accountId: 's201', type: 'given', amount: 4000, date: '2026-10-02', time: '14:00' },
  ];
  const { updatedAccount, accountJournals } = recalculateAccountRunningBalances(supp, journals);
  // Supplier: 5000 + 2000 (received) - 4000 (given) = 3000
  assert.strictEqual(updatedAccount.balance, 3000);
  assert.strictEqual(updatedAccount.start_balance, 5000);
  assert.strictEqual(accountJournals[0].id, 'j2');
  assert.strictEqual(accountJournals[0].runningBalance, 3000);
  assert.strictEqual(accountJournals[1].id, 'j1');
  assert.strictEqual(accountJournals[1].runningBalance, 7000);
});

runTest('Supplier (type 2): Overpayment produces negative balance representing advance paid', () => {
  const supp = normalizeAccountFields({ id: 's_adv', type: 2, start_balance: 2000 });
  const journals = [
    { id: 'j1', accountId: 's_adv', type: 'given', amount: 3500, date: '2026-10-01' },
  ];
  const { updatedAccount } = recalculateAccountRunningBalances(supp, journals);
  // 2000 - 3500 = -1500
  assert.strictEqual(updatedAccount.balance, -1500);
});

runTest('establishAccountOpeningBalance supports start_balance and startBalance correctly', () => {
  const a1 = { id: 'a1', type: 1, start_balance: 4500 };
  const a2 = { id: 'a2', type: 1, startBalance: 7200 };
  assert.strictEqual(establishAccountOpeningBalance(a1, []), 4500);
  assert.strictEqual(establishAccountOpeningBalance(a2, []), 7200);
});

runTest('recalculateAllAccountBalances batch recalculates accounts with start_balance baselines', () => {
  const accs = [
    { id: 'c1', type: 1, start_balance: 1000, businessId: '1' },
    { id: 's1', type: 2, start_balance: 3000, businessId: '1' },
  ];
  const journals = [
    { id: 'j1', accountId: 'c1', type: 'given', amount: 500, businessId: '1' },
    { id: 'j2', accountId: 's1', type: 'received', amount: 1500, businessId: '1' },
  ];
  const res = recalculateAllAccountBalances(accs, journals, '1');
  assert.strictEqual(res[0].balance, 1500);
  assert.strictEqual(res[0].start_balance, 1000);
  assert.strictEqual(res[0].startBalance, 1000);
  assert.strictEqual(res[1].balance, 4500);
  assert.strictEqual(res[1].start_balance, 3000);
  assert.strictEqual(res[1].startBalance, 3000);
});

// ============================================================================
// PART 4: MULTI-TENANT COMPOUND INDEXING & CROSS-SHOP ISOLATION
// ============================================================================
console.log('\n--- PART 4: MULTI-TENANT COMPOUND INDEXING ---');

runTest('Duplicate account IDs across different businesses are 100% isolated without balance bleed', () => {
  // Shop 1: Account ID 1 (Customer in Shop 1)
  const shop1Cust = normalizeAccountFields({ id: '1', name: 'Shop 1 Customer', type: 1, start_balance: 1000, businessId: '1' });
  // Shop 2: Account ID 1 (Customer in Shop 2)
  const shop2Cust = normalizeAccountFields({ id: '1', name: 'Shop 2 Customer', type: 1, start_balance: 5000, businessId: '2' });

  const allJournals = [
    { id: 'j1_1', accountId: '1', type: 'given', amount: 200, businessId: '1', date: '2026-10-01' },
    { id: 'j2_1', accountId: '1', type: 'given', amount: 3000, businessId: '2', date: '2026-10-01' },
  ];

  // Recalculate Shop 1 single account
  const res1 = recalculateAccountRunningBalances(shop1Cust, allJournals);
  assert.strictEqual(res1.updatedAccount.balance, 1200, 'Shop 1 balance must only include Shop 1 journals');
  assert.strictEqual(res1.accountJournals.length, 1);
  assert.strictEqual(res1.accountJournals[0].id, 'j1_1');

  // Recalculate Shop 2 single account
  const res2 = recalculateAccountRunningBalances(shop2Cust, allJournals);
  assert.strictEqual(res2.updatedAccount.balance, 8000, 'Shop 2 balance must only include Shop 2 journals');
  assert.strictEqual(res2.accountJournals.length, 1);
  assert.strictEqual(res2.accountJournals[0].id, 'j2_1');

  // Batch recalculation scoped to Shop 1
  const batchRes1 = recalculateAllAccountBalances([shop1Cust, shop2Cust], allJournals, '1');
  const b1Acc = batchRes1.find(a => a.name === 'Shop 1 Customer');
  assert.strictEqual(b1Acc.balance, 1200);
});

runTest('indexJournalsByAccount indexes journals under composite businessId:accountId keys', () => {
  const journals = [
    { id: 'j1', orig_account_id: 1, business_id: 1, amount: 100 },
    { id: 'j2', orig_account_id: 1, business_id: 2, amount: 200 },
    { id: 'j3', accountId: '2', businessId: '1', amount: 300 },
  ];
  const map = indexJournalsByAccount(journals);
  assert.strictEqual(map.get('1:1').length, 1);
  assert.strictEqual(map.get('1:1')[0].id, 'j1');
  assert.strictEqual(map.get('2:1').length, 1);
  assert.strictEqual(map.get('2:1')[0].id, 'j2');
  assert.strictEqual(map.get('1:2').length, 1);
  assert.strictEqual(map.get('1:2')[0].id, 'j3');
});

// ============================================================================
// PART 5: QUERYING, FILTERING & LOOKUP PARITY
// ============================================================================
console.log('\n--- PART 5: QUERYING, FILTERING & LOOKUP PARITY ---');

runTest('queryCustomerAccounts searches by name or contact across Room DB and camelCase fields', () => {
  const accounts = [
    normalizeAccountFields({ id: '1', name: 'আকবর আলী', contact: '01711000000', type: 1, balance: 500, businessId: '1' }),
    normalizeAccountFields({ id: '2', name: 'বশির আহমেদ', phone: '01822000000', type: 1, balance: 0, businessId: '1' }),
    normalizeAccountFields({ id: '3', name: 'করিম মেটাল', contact: '01933000000', type: 2, balance: 1000, businessId: '1' }),
  ];

  // Search by name
  const qName = queryCustomerAccounts(accounts, { searchQuery: 'আকবর' });
  assert.strictEqual(qName.length, 1);
  assert.strictEqual(qName[0].id, '1');

  // Search by phone
  const qPhone = queryCustomerAccounts(accounts, { searchQuery: '01822' });
  assert.strictEqual(qPhone.length, 1);
  assert.strictEqual(qPhone[0].id, '2');

  // Filter due only
  const qDue = queryCustomerAccounts(accounts, { filter: 'due' });
  assert.strictEqual(qDue.length, 1, 'Only account 1 has positive due balance among customers');
  assert.strictEqual(qDue[0].id, '1');

  // Filter suppliers (type: 2)
  const qSupp = queryCustomerAccounts(accounts, { type: 2 });
  assert.strictEqual(qSupp.length, 1);
  assert.strictEqual(qSupp[0].id, '3');
});

runTest('createAccountLookupMap creates O(1) string ID lookup Map', () => {
  const accounts = [
    { id: 1, name: 'Num 1' },
    { id: '2', name: 'Str 2' },
  ];
  const lookup = createAccountLookupMap(accounts);
  assert.strictEqual(lookup.get('1').name, 'Num 1');
  assert.strictEqual(lookup.get('2').name, 'Str 2');
  assert.strictEqual(lookup.get('3'), undefined);
});

// ============================================================================
// PART 6: BABEL AST PARSING & FRONTEND INTEGRITY
// ============================================================================
console.log('\n--- PART 6: BABEL AST PARSING & FRONTEND INTEGRITY ---');

runTest('App.js parses cleanly with zero JSX/syntax errors', () => {
  const appCode = fs.readFileSync('App.js', 'utf8');
  assert(appCode.length > 10000, 'App.js must be a non-trivial file');
  const ast = babel.parseSync(appCode, {
    filename: 'App.js',
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'flow'] },
  });
  assert(ast && ast.program && ast.program.body.length > 0, 'App.js must produce valid AST');
});

console.log('\n================================================================');
console.log(`ALL ${passedTests} / ${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
console.log('FEATURE 6 DOUBLE-ENTRY LEDGER ROOM PARITY VERIFIED');
console.log('================================================================\n');