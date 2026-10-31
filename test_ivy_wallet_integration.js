/**
 * test_ivy_wallet_integration.js
 * Verification Suite for Money Manager Edge Cases, Multi-Wallet Transfer Fees,
 * Budget Exceed/Warning Thresholds, and Backup Checksum Validation.
 */

const assert = require('assert');
const mmService = require('./src/moneyManagerService');
const { StorageRepository, createDefaultState } = require('./src/storageRepository');
const ledgerEngine = require('./src/ledgerEngine');

console.log('================================================================');
console.log('TALLYKHATA IVY WALLET INTEGRATION & BACKEND SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log('[PASS] TEST ' + totalTests + ': ' + name);
    passedTests++;
  } catch (err) {
    console.error('[FAIL] TEST ' + totalTests + ': ' + name);
    console.error(err);
    process.exit(1);
  }
}

function createMockAdapter(initialData = null) {
  const store = new Map();
  if (initialData) {
    store.set(ledgerEngine.V6_KEY, JSON.stringify(initialData));
    store.set('tallykhata_v6_store', JSON.stringify(initialData));
  }
  return {
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, val) => { store.set(key, String(val)); },
    removeItem: async (key) => { store.delete(key); },
    clear: async () => { store.clear(); },
    _map: store,
  };
}

async function runAll() {
  // TEST 1: Precision roundCurrency and formatCurrency edge cases
  await runTest('roundCurrency and formatCurrency precision, negative formatting, and null safety', async () => {
    assert.strictEqual(mmService.roundCurrency(0.1 + 0.2), 0.3);
    assert.strictEqual(mmService.roundCurrency(1234.567), 1234.57);
    assert.strictEqual(mmService.roundCurrency('99.999'), 100);

    // formatCurrency
    assert.strictEqual(mmService.formatCurrency(null), '৳0.00');
    assert.strictEqual(mmService.formatCurrency(undefined), '৳0.00');
    assert.strictEqual(mmService.formatCurrency(NaN), '৳0.00');
    assert.strictEqual(mmService.formatCurrency(1250), '৳1,250.00');
    assert.strictEqual(mmService.formatCurrency(1250.5), '৳1,250.50');
    assert.strictEqual(mmService.formatCurrency(-1250), '-৳1,250.00');
    assert.strictEqual(mmService.formatCurrency(-1250.75), '-৳1,250.75');
    assert.strictEqual(mmService.formatCurrency(-50, '$', 'en-US'), '-$50.00');
  });

  // TEST 2: Multi-currency wallet conversion in accountNetWorth
  await runTest('calculateNetWorth applies exchangeRateToBase on multi-currency wallets', async () => {
    const state = {
      accounts: [
        { id: 'acc_bdt', balance: 5000, exchangeRate: 1 },
        { id: 'acc_usd', balance: 100, exchangeRateToBase: 120 }, // 100 * 120 = 12000
        { id: 'acc_eur', balance: 50, exchangeRate: 130 },        // 50 * 130 = 6500
      ],
      goals: [],
    };
    const netWorth = mmService.calculateNetWorth(state);
    assert.strictEqual(netWorth, 5000 + 12000 + 6500);
  });

  // TEST 3: Multi-wallet transfer with fee deduction and balance updates
  await runTest('addTransfer with fee deducts (amount + fee) from source and credits amount to destination', async () => {
    let state = {
      accounts: [
        { id: 'w_bank', name: 'Bank', balance: 10000, isArchived: false },
        { id: 'w_cash', name: 'Cash', balance: 2000, isArchived: false },
      ],
      transactions: [],
      categories: [],
    };

    state = mmService.addTransfer(state, {
      fromAccountId: 'w_bank',
      toAccountId: 'w_cash',
      amount: 3000,
      fee: 50,
      note: 'ATM withdrawal fee',
    });

    const bankAcc = state.accounts.find(a => a.id === 'w_bank');
    const cashAcc = state.accounts.find(a => a.id === 'w_cash');

    assert.strictEqual(bankAcc.balance, 6950, 'Bank balance must be 10000 - 3050 = 6950');
    assert.strictEqual(cashAcc.balance, 5000, 'Cash balance must be 2000 + 3000 = 5000');
    assert.strictEqual(state.transactions.length, 1);
    assert.strictEqual(state.transactions[0].type, 'transfer');
    assert.strictEqual(state.transactions[0].amount, 3000);
    assert.strictEqual(state.transactions[0].fee, 50);
  });

  // TEST 4: Editing transfer amount and fee reverses old impact cleanly
  await runTest('editTransaction on transfer adjusts balances and fees accurately', async () => {
    let state = {
      accounts: [
        { id: 'w_bank', name: 'Bank', balance: 10000, isArchived: false },
        { id: 'w_cash', name: 'Cash', balance: 2000, isArchived: false },
      ],
      transactions: [],
      categories: [],
    };

    state = mmService.addTransfer(state, {
      fromAccountId: 'w_bank',
      toAccountId: 'w_cash',
      amount: 3000,
      fee: 50,
    });
    const txnId = state.transactions[0].id;

    state = mmService.editTransaction(state, txnId, {
      amount: 4000,
      fee: 100,
    });

    const bankAcc = state.accounts.find(a => a.id === 'w_bank');
    const cashAcc = state.accounts.find(a => a.id === 'w_cash');

    assert.strictEqual(bankAcc.balance, 5900, 'Bank balance must be 10000 - 4100 = 5900');
    assert.strictEqual(cashAcc.balance, 6000, 'Cash balance must be 2000 + 4000 = 6000');
    assert.strictEqual(state.transactions[0].amount, 4000);
    assert.strictEqual(state.transactions[0].fee, 100);
  });

  // TEST 5: Switching transaction type between transfer and expense
  await runTest('editTransaction switching type between transfer and expense handles accounts cleanly', async () => {
    let state = {
      accounts: [
        { id: 'w_bank', name: 'Bank', balance: 10000, isArchived: false },
        { id: 'w_cash', name: 'Cash', balance: 2000, isArchived: false },
      ],
      categories: [
        { id: 'cat_bill', name: 'Utility', type: 'expense', isArchived: false },
      ],
      transactions: [],
    };

    state = mmService.addTransfer(state, {
      fromAccountId: 'w_bank',
      toAccountId: 'w_cash',
      amount: 2000,
      fee: 20,
    });
    const txnId = state.transactions[0].id;
    assert.strictEqual(state.accounts.find(a => a.id === 'w_bank').balance, 7980);
    assert.strictEqual(state.accounts.find(a => a.id === 'w_cash').balance, 4000);

    state = mmService.editTransaction(state, txnId, {
      type: 'expense',
      accountId: 'w_bank',
      categoryId: 'cat_bill',
      amount: 1500,
    });

    const bankAcc = state.accounts.find(a => a.id === 'w_bank');
    const cashAcc = state.accounts.find(a => a.id === 'w_cash');

    assert.strictEqual(bankAcc.balance, 8500, 'Bank balance must be 10000 - 1500 = 8500');
    assert.strictEqual(cashAcc.balance, 2000, 'Cash balance must return to initial 2000');
    assert.strictEqual(state.transactions[0].type, 'expense');
    assert.strictEqual(state.transactions[0].fee, 0);
  });

  // TEST 6: Transfer deletion restores fee and principal to accounts
  await runTest('deleteTransaction on transfer reverses amount + fee on source and debits destination', async () => {
    let state = {
      accounts: [
        { id: 'w_bank', name: 'Bank', balance: 10000, isArchived: false },
        { id: 'w_cash', name: 'Cash', balance: 2000, isArchived: false },
      ],
      transactions: [],
    };

    state = mmService.addTransfer(state, {
      fromAccountId: 'w_bank',
      toAccountId: 'w_cash',
      amount: 2500,
      fee: 30,
    });
    assert.strictEqual(state.accounts.find(a => a.id === 'w_bank').balance, 7470);
    assert.strictEqual(state.accounts.find(a => a.id === 'w_cash').balance, 4500);

    const txnId = state.transactions[0].id;
    state = mmService.deleteTransaction(state, txnId);

    assert.strictEqual(state.accounts.find(a => a.id === 'w_bank').balance, 10000, 'Bank refunded 2530');
    assert.strictEqual(state.accounts.find(a => a.id === 'w_cash').balance, 2000, 'Cash debited 2500');
    assert.strictEqual(state.transactions.length, 0);
  });

  // TEST 7: calculateCategoryBudgets default period is this_month and threshold indicators
  await runTest('calculateCategoryBudgets defaults to this_month and returns isWarning/isOver/isAtLimit status', async () => {
    const today = mmService.getLocalDateString();
    const lastMonthDate = mmService.shiftMonthStr(today.slice(0, 7), -1) + '-15';

    const categories = [
      { id: 'cat_safe', name: 'Safe', type: 'expense', budget: 1000 },
      { id: 'cat_warn', name: 'Warning', type: 'expense', budget: 1000 },
      { id: 'cat_limit', name: 'At Limit', type: 'expense', budget: 1000 },
      { id: 'cat_over', name: 'Over', type: 'expense', budget: 1000 },
      { id: 'cat_nobudget', name: 'No Budget', type: 'expense', budget: 0 },
    ];

    const transactions = [
      { type: 'expense', categoryId: 'cat_safe', amount: 500, date: today },
      { type: 'expense', categoryId: 'cat_warn', amount: 850, date: today },
      { type: 'expense', categoryId: 'cat_limit', amount: 1000, date: today },
      { type: 'expense', categoryId: 'cat_over', amount: 1250, date: today },
      { type: 'expense', categoryId: 'cat_nobudget', amount: 200, date: today },
      { type: 'expense', categoryId: 'cat_safe', amount: 9999, date: lastMonthDate },
    ];

    const budgets = mmService.calculateCategoryBudgets(categories, transactions);

    const safe = budgets.find(b => b.id === 'cat_safe');
    assert.strictEqual(safe.spent, 500);
    assert.strictEqual(safe.pct, 50);
    assert.strictEqual(safe.isOver, false);
    assert.strictEqual(safe.isAtLimit, false);
    assert.strictEqual(safe.isWarning, false);
    assert.strictEqual(safe.status, 'safe');
    assert.strictEqual(safe.remaining, 500);

    const warn = budgets.find(b => b.id === 'cat_warn');
    assert.strictEqual(warn.spent, 850);
    assert.strictEqual(warn.pct, 85);
    assert.strictEqual(warn.isOver, false);
    assert.strictEqual(warn.isAtLimit, false);
    assert.strictEqual(warn.isWarning, true);
    assert.strictEqual(warn.status, 'warning');
    assert.strictEqual(warn.remaining, 150);

    const limit = budgets.find(b => b.id === 'cat_limit');
    assert.strictEqual(limit.spent, 1000);
    assert.strictEqual(limit.pct, 100);
    assert.strictEqual(limit.isOver, false);
    assert.strictEqual(limit.isAtLimit, true);
    assert.strictEqual(limit.isWarning, true);
    assert.strictEqual(limit.status, 'warning');
    assert.strictEqual(limit.remaining, 0);

    const over = budgets.find(b => b.id === 'cat_over');
    assert.strictEqual(over.spent, 1250);
    assert.strictEqual(over.pct, 125);
    assert.strictEqual(over.isOver, true);
    assert.strictEqual(over.isAtLimit, false);
    assert.strictEqual(over.isWarning, false);
    assert.strictEqual(over.status, 'exceeded');
    assert.strictEqual(over.remaining, 0);

    const noBudget = budgets.find(b => b.id === 'cat_nobudget');
    assert.strictEqual(noBudget.status, 'no_budget');
    assert.strictEqual(noBudget.remaining, 0);
  });

  // TEST 8: Category deletion reassigns transactions to uncategorized
  await runTest('deleteCategory reassigns existing transactions to uncategorized without dangling IDs', async () => {
    let state = {
      categories: [
        { id: 'cat_custom', name: 'Custom', type: 'expense', isArchived: false },
      ],
      transactions: [
        { id: 'tx_1', categoryId: 'cat_custom', amount: 500, type: 'expense', accountId: 'acc_1' },
      ],
      accounts: [{ id: 'acc_1', balance: 5000 }],
      recurring: [],
    };

    state = mmService.deleteCategory(state, 'cat_custom');
    assert.strictEqual(state.categories.length, 0);
    assert.strictEqual(state.transactions.length, 1);
    assert.strictEqual(state.transactions[0].categoryId, 'uncategorized');
  });

  // TEST 9: Backup creation includes SHA-256 integrity checksum
  await runTest('createStorageBackup computes deterministic checksum and restore validates it', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const backup = await repo.createStorageBackup();
    assert.ok(backup.checksum, 'Backup must include checksum');
    assert.ok(backup.checksum.startsWith('sha256_') || backup.checksum.startsWith('chk_'));

    const restoreRes = await repo.restoreStorageBackup(backup);
    assert.strictEqual(restoreRes.success, true);

    const tampered = JSON.parse(JSON.stringify(backup));
    tampered.data.businessName = 'Tampered Business';
    let threw = false;
    try {
      await repo.restoreStorageBackup(tampered);
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('checksum mismatch') || err.message.includes('corrupted'));
    }
    assert.strictEqual(threw, true, 'Tampered backup must be rejected before mutating store');
  });

  // TEST 10: resetStore waits for writeQueue to settle
  await runTest('resetStore waits for pending writeQueue operations before clearing store', async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    let writeFinished = false;
    repo.mutateCollection('cashEntries', async (prev) => {
      await new Promise(r => setTimeout(r, 50));
      writeFinished = true;
      return [...prev, { id: 'c_async', amount: 100 }];
    });

    await repo.resetStore();
    assert.strictEqual(writeFinished, true, 'In-flight mutation must settle before resetStore resolves');
    assert.strictEqual(repo.getAuthoritativeState(), null, 'Authoritative state must be null after reset');
  });

  // TEST 11: Multi-wallet transfer with fee (transfer 500 with fee 10: from Account A to Account B)
  await runTest('Multi-wallet transfer with fee: transfer 500 with fee 10 from Account A to Account B', async () => {
    let state = {
      accounts: [
        { id: 'acc_a', name: 'Account A', balance: 1000, isArchived: false },
        { id: 'acc_b', name: 'Account B', balance: 500, isArchived: false },
      ],
      transactions: [],
      categories: [],
    };

    const initialNetWorth = mmService.calculateNetWorth(state);
    assert.strictEqual(initialNetWorth, 1500, 'Initial net worth is 1500');

    state = mmService.addTransfer(state, {
      fromAccountId: 'acc_a',
      toAccountId: 'acc_b',
      amount: 500,
      fee: 10,
      note: 'Transfer 500 with fee 10',
    });

    const accA = state.accounts.find(a => a.id === 'acc_a');
    const accB = state.accounts.find(a => a.id === 'acc_b');

    assert.strictEqual(accA.balance, 490, 'Account A balance must decrease by 510 (500 + 10 fee)');
    assert.strictEqual(accB.balance, 1000, 'Account B balance must increase by 500');
    assert.strictEqual(state.transactions.length, 1);
    assert.strictEqual(state.transactions[0].type, 'transfer');
    assert.strictEqual(state.transactions[0].amount, 500);
    assert.strictEqual(state.transactions[0].fee, 10);
    assert.strictEqual(state.transactions[0].fromAccountId, 'acc_a');
    assert.strictEqual(state.transactions[0].toAccountId, 'acc_b');

    const netWorthAfter = mmService.calculateNetWorth(state);
    assert.strictEqual(netWorthAfter, 1490, 'Net worth must decrease by exactly the fee (10)');
  });

  // TEST 12: Transfer edit and transfer delete reversal safety
  await runTest('Transfer edit and transfer delete reversal safety: editing to 400 with fee 5 or deleting reverses exact amounts and fees', async () => {
    let state = {
      accounts: [
        { id: 'acc_a', name: 'Account A', balance: 1000, isArchived: false },
        { id: 'acc_b', name: 'Account B', balance: 500, isArchived: false },
      ],
      transactions: [],
      categories: [],
    };

    state = mmService.addTransfer(state, {
      fromAccountId: 'acc_a',
      toAccountId: 'acc_b',
      amount: 500,
      fee: 10,
    });
    const txnId = state.transactions[0].id;
    assert.strictEqual(state.accounts.find(a => a.id === 'acc_a').balance, 490);
    assert.strictEqual(state.accounts.find(a => a.id === 'acc_b').balance, 1000);

    // Edit amount to 400 and fee to 5
    state = mmService.editTransaction(state, txnId, {
      amount: 400,
      fee: 5,
    });

    let accA = state.accounts.find(a => a.id === 'acc_a');
    let accB = state.accounts.find(a => a.id === 'acc_b');
    assert.strictEqual(accA.balance, 595, 'Account A balance must be 1000 - 405 = 595');
    assert.strictEqual(accB.balance, 900, 'Account B balance must be 500 + 400 = 900');
    assert.strictEqual(state.transactions[0].amount, 400);
    assert.strictEqual(state.transactions[0].fee, 5);

    // Delete transfer and verify full reversal
    state = mmService.deleteTransaction(state, txnId);
    accA = state.accounts.find(a => a.id === 'acc_a');
    accB = state.accounts.find(a => a.id === 'acc_b');
    assert.strictEqual(accA.balance, 1000, 'Account A balance restored to initial 1000');
    assert.strictEqual(accB.balance, 500, 'Account B balance restored to initial 500');
    assert.strictEqual(state.transactions.length, 0, 'Transactions array must be empty');
    assert.strictEqual(mmService.calculateNetWorth(state), 1500, 'Net worth fully restored to initial 1500');
  });

  // TEST 13: Transaction type switching (transfer to expense/income and vice versa)
  await runTest('Transaction type switching: transfer to expense/income and vice versa maintains account integrity', async () => {
    let state = {
      accounts: [
        { id: 'acc_a', name: 'Account A', balance: 1000, isArchived: false },
        { id: 'acc_b', name: 'Account B', balance: 500, isArchived: false },
      ],
      categories: [
        { id: 'cat_exp', name: 'Expense', type: 'expense', isArchived: false },
        { id: 'cat_inc', name: 'Income', type: 'income', isArchived: false },
      ],
      transactions: [],
    };

    // 1. Start with transfer (500 + 10 fee)
    state = mmService.addTransfer(state, {
      fromAccountId: 'acc_a',
      toAccountId: 'acc_b',
      amount: 500,
      fee: 10,
    });
    const txnId = state.transactions[0].id;
    assert.strictEqual(state.accounts.find(a => a.id === 'acc_a').balance, 490);
    assert.strictEqual(state.accounts.find(a => a.id === 'acc_b').balance, 1000);

    // 2. Switch transfer -> expense (250 on Account A)
    state = mmService.editTransaction(state, txnId, {
      type: 'expense',
      accountId: 'acc_a',
      categoryId: 'cat_exp',
      amount: 250,
    });
    assert.strictEqual(state.accounts.find(a => a.id === 'acc_a').balance, 750, 'Account A: 1000 - 250 = 750');
    assert.strictEqual(state.accounts.find(a => a.id === 'acc_b').balance, 500, 'Account B returned to 500');
    assert.strictEqual(state.transactions[0].type, 'expense');
    assert.strictEqual(state.transactions[0].fee, 0);

    // 3. Switch expense -> income (300 on Account B)
    state = mmService.editTransaction(state, txnId, {
      type: 'income',
      accountId: 'acc_b',
      categoryId: 'cat_inc',
      amount: 300,
    });
    assert.strictEqual(state.accounts.find(a => a.id === 'acc_a').balance, 1000, 'Account A refunded back to 1000');
    assert.strictEqual(state.accounts.find(a => a.id === 'acc_b').balance, 800, 'Account B credited: 500 + 300 = 800');
    assert.strictEqual(state.transactions[0].type, 'income');

    // 4. Switch income -> transfer (from Account B to Account A: 200 with fee 10)
    state = mmService.editTransaction(state, txnId, {
      type: 'transfer',
      fromAccountId: 'acc_b',
      toAccountId: 'acc_a',
      amount: 200,
      fee: 10,
    });
    assert.strictEqual(state.accounts.find(a => a.id === 'acc_b').balance, 290, 'Account B: 500 - 210 = 290');
    assert.strictEqual(state.accounts.find(a => a.id === 'acc_a').balance, 1200, 'Account A: 1000 + 200 = 1200');
    assert.strictEqual(state.transactions[0].type, 'transfer');
    assert.strictEqual(state.transactions[0].fee, 10);
  });

  // TEST 14: Category deletion reassigns linked transactions to 'uncategorized' without data loss
  await runTest('Category deletion: deleting category reassigns linked transactions to uncategorized without data loss', async () => {
    let state = {
      categories: [
        { id: 'cat_custom_exp', name: 'Custom Expense', type: 'expense', isArchived: false },
        { id: 'cat_other', name: 'Other', type: 'expense', isArchived: false },
      ],
      transactions: [
        { id: 'tx_1', categoryId: 'cat_custom_exp', amount: 350, type: 'expense', accountId: 'acc_1', note: 'Grocery 1' },
        { id: 'tx_2', categoryId: 'cat_custom_exp', amount: 150, type: 'expense', accountId: 'acc_1', note: 'Grocery 2' },
        { id: 'tx_3', categoryId: 'cat_other', amount: 500, type: 'expense', accountId: 'acc_1', note: 'Other expense' },
      ],
      accounts: [{ id: 'acc_1', balance: 5000 }],
      recurring: [],
    };

    state = mmService.deleteCategory(state, 'cat_custom_exp');
    assert.strictEqual(state.categories.length, 1, 'Custom category must be removed');
    assert.strictEqual(state.categories[0].id, 'cat_other', 'Other category retained');
    assert.strictEqual(state.transactions.length, 3, 'Zero data loss: all 3 transactions preserved');

    const tx1 = state.transactions.find(t => t.id === 'tx_1');
    const tx2 = state.transactions.find(t => t.id === 'tx_2');
    const tx3 = state.transactions.find(t => t.id === 'tx_3');

    assert.strictEqual(tx1.categoryId, 'uncategorized', 'tx_1 remapped to uncategorized');
    assert.strictEqual(tx1.amount, 350, 'tx_1 amount preserved');
    assert.strictEqual(tx1.note, 'Grocery 1', 'tx_1 note preserved');

    assert.strictEqual(tx2.categoryId, 'uncategorized', 'tx_2 remapped to uncategorized');
    assert.strictEqual(tx2.amount, 150, 'tx_2 amount preserved');

    assert.strictEqual(tx3.categoryId, 'cat_other', 'Unrelated transaction category preserved');
  });

  // TEST 15: Budget calculation defaults to this_month, with isWarning (80%+), isOver (>100%), remaining, and status
  await runTest('Budget calculation defaults to this_month with isWarning (80%+), isOver (>100%), remaining, and status', async () => {
    const today = mmService.getLocalDateString();
    const lastMonthDate = mmService.shiftMonthStr(today.slice(0, 7), -1) + '-15';

    const categories = [
      { id: 'cat_safe', name: 'Safe', type: 'expense', budget: 1000 },
      { id: 'cat_warn80', name: 'Warning 80', type: 'expense', budget: 1000 },
      { id: 'cat_warn85', name: 'Warning 85', type: 'expense', budget: 1000 },
      { id: 'cat_at_limit', name: 'At Limit', type: 'expense', budget: 1000 },
      { id: 'cat_over', name: 'Over', type: 'expense', budget: 1000 },
      { id: 'cat_zero', name: 'Zero Budget', type: 'expense', budget: 0 },
    ];

    const transactions = [
      { type: 'expense', categoryId: 'cat_safe', amount: 500, date: today },
      { type: 'expense', categoryId: 'cat_warn80', amount: 800, date: today },
      { type: 'expense', categoryId: 'cat_warn85', amount: 850, date: today },
      { type: 'expense', categoryId: 'cat_at_limit', amount: 1000, date: today },
      { type: 'expense', categoryId: 'cat_over', amount: 1250, date: today },
      { type: 'expense', categoryId: 'cat_zero', amount: 300, date: today },
      // Prior month txn should be excluded by default this_month period
      { type: 'expense', categoryId: 'cat_safe', amount: 9999, date: lastMonthDate },
    ];

    // Omit period parameter to verify default to this_month
    const budgets = mmService.calculateCategoryBudgets(categories, transactions);

    const safe = budgets.find(b => b.id === 'cat_safe');
    assert.strictEqual(safe.spent, 500);
    assert.strictEqual(safe.pct, 50);
    assert.strictEqual(safe.isWarning, false);
    assert.strictEqual(safe.isOver, false);
    assert.strictEqual(safe.remaining, 500);
    assert.strictEqual(safe.status, 'safe');

    const warn80 = budgets.find(b => b.id === 'cat_warn80');
    assert.strictEqual(warn80.spent, 800);
    assert.strictEqual(warn80.pct, 80);
    assert.strictEqual(warn80.isWarning, true, '80% threshold triggers isWarning');
    assert.strictEqual(warn80.isOver, false);
    assert.strictEqual(warn80.remaining, 200);
    assert.strictEqual(warn80.status, 'warning');

    const warn85 = budgets.find(b => b.id === 'cat_warn85');
    assert.strictEqual(warn85.spent, 850);
    assert.strictEqual(warn85.pct, 85);
    assert.strictEqual(warn85.isWarning, true);
    assert.strictEqual(warn85.isOver, false);
    assert.strictEqual(warn85.remaining, 150);
    assert.strictEqual(warn85.status, 'warning');

    const limit = budgets.find(b => b.id === 'cat_at_limit');
    assert.strictEqual(limit.spent, 1000);
    assert.strictEqual(limit.pct, 100);
    assert.strictEqual(limit.isWarning, true);
    assert.strictEqual(limit.isAtLimit, true);
    assert.strictEqual(limit.isOver, false);
    assert.strictEqual(limit.remaining, 0);
    assert.strictEqual(limit.status, 'warning');

    const over = budgets.find(b => b.id === 'cat_over');
    assert.strictEqual(over.spent, 1250);
    assert.strictEqual(over.pct, 125);
    assert.strictEqual(over.isWarning, false);
    assert.strictEqual(over.isOver, true, '>100% triggers isOver');
    assert.strictEqual(over.remaining, 0);
    assert.strictEqual(over.status, 'exceeded');

    const zero = budgets.find(b => b.id === 'cat_zero');
    assert.strictEqual(zero.status, 'no_budget');
    assert.strictEqual(zero.remaining, 0);
  });

  // TEST 16: formatCurrency with negative numbers (-৳1,250.00)
  await runTest('formatCurrency formatting with negative numbers (-৳1,250.00) and multi-locale verification', async () => {
    assert.strictEqual(mmService.formatCurrency(-1250), '-৳1,250.00', 'Standard negative currency formatting');
    assert.strictEqual(mmService.formatCurrency(-1250.5), '-৳1,250.50', 'Negative currency with decimal');
    assert.strictEqual(mmService.formatCurrency(-1250.75), '-৳1,250.75', 'Negative currency with two decimals');
    assert.strictEqual(mmService.formatCurrency(-1250, '৳', 'bn'), '-৳১,২৫০.০০', 'Negative currency in Bengali locale');
    assert.strictEqual(mmService.formatCurrency(-1250, '$', 'en-US'), '-$1,250.00', 'Negative currency in en-US locale');
    assert.strictEqual(mmService.formatCurrency(-0), '৳0.00', 'Negative zero formats safely to positive zero');
  });

  // TEST 17: normalizeToLocalDate parsing YYYY-MM-DD without UTC offset shifts
  await runTest('normalizeToLocalDate parsing YYYY-MM-DD without UTC offset shifts', async () => {
    assert.strictEqual(mmService.normalizeToLocalDate('2026-10-31'), '2026-10-31', 'Standard date-only must not shift');
    assert.strictEqual(mmService.normalizeToLocalDate('2024-02-29'), '2024-02-29', 'Leap day date must not shift');
    assert.strictEqual(mmService.normalizeToLocalDate('2026-01-01'), '2026-01-01', 'Year boundary start must not shift');
    assert.strictEqual(mmService.normalizeToLocalDate('2026-12-31'), '2026-12-31', 'Year boundary end must not shift');
    assert.strictEqual(mmService.normalizeToLocalDate('2026-10-31 23:59:59'), '2026-10-31', 'Date-time string must extract local date part cleanly');
    assert.strictEqual(mmService.normalizeToLocalDate('২০২৬-১০-৩১'), '2026-10-31', 'Bengali numeral date string normalizes cleanly without shifting');
    assert.strictEqual(mmService.normalizeToLocalDate(''), '', 'Empty string returns empty string');
    assert.strictEqual(mmService.normalizeToLocalDate(null), '', 'Null date returns empty string');
  });


  console.log('\n================================================================');
  console.log('IVY WALLET INTEGRATION SUITE SUMMARY: ' + passedTests + ' / ' + totalTests + ' TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runAll().catch(e => {
  console.error(e);
  process.exit(1);
});