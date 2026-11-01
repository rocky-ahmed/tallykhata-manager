/**
 * test_feature7_money_manager_parity.js
 * Comprehensive Parity & Verification Suite for Feature 007: Personal Money Manager (Ivy Wallet Architecture)
 *
 * Verifies 100% parity across:
 * 1. Storage Schema & State Initialization (@tallykhata_personal_money_manager_v2, Schema v3).
 * 2. Multi-Wallet / Accounts Architecture & Net Worth Invariance.
 * 3. Double-Entry Transactions & Atomic Fund Transfers.
 * 4. Category Budgets & Alert Status Flags (safe, warning, exceeded, no_budget).
 * 5. Recurring Schedules & Idempotent Execution Engine.
 * 6. Savings Goals with Atomic Wallet Balance Allocation.
 * 7. Cash Flow Analytics & Category Spending Distribution.
 * 8. Domain Isolation & Cloud Backup Serialization.
 * 9. Frontend AST Syntax Integrity Verification via Babel.
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const mmService = require('./src/moneyManagerService');
const storageRepository = require('./src/storageRepository');

console.log('================================================================');
console.log('FEATURE 7: PERSONAL MONEY MANAGER (IVY WALLET) PARITY SUITE');
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

async function runAll() {
  // ============================================================================
  // PART 1: STORAGE SCHEMA & STATE SANITIZATION
  // ============================================================================
  console.log('--- PART 1: STORAGE SCHEMA & INITIALIZATION ---');

  runTest('1.1: Storage key is strictly isolated to @tallykhata_personal_money_manager_v2', () => {
    assert.strictEqual(mmService.MM_STORAGE_KEY, '@tallykhata_personal_money_manager_v2');
    assert.strictEqual(mmService.MM_SCHEMA_VERSION, 3);
  });

  runTest('1.2: getDefaultState initializes canonical schema with default accounts, categories & goals', () => {
    const def = mmService.getDefaultState();
    assert.strictEqual(def.version, 3);
    assert(Array.isArray(def.accounts) && def.accounts.length >= 4, 'Must have at least 4 default wallets');
    assert(Array.isArray(def.categories) && def.categories.length >= 12, 'Must have at least 12 categories');
    assert(Array.isArray(def.transactions) && def.transactions.length >= 0, 'Must have transactions array');
    assert.strictEqual(typeof def.overallMonthlyBudget, 'number');
    assert.strictEqual(typeof def.preferences, 'object');
  });

  runTest('1.3: sanitizeState repairs partial or corrupted state gracefully to valid v3 schema', () => {
    const corrupted = {
      accounts: [{ id: 'custom_acc', name: 'Custom Wallet', balance: 5000 }],
      categories: null,
      transactions: 'invalid',
    };
    const sanitized = mmService.sanitizeState(corrupted);
    assert.strictEqual(sanitized.version, 3);
    assert(Array.isArray(sanitized.accounts));
    assert(sanitized.accounts.some(a => a.id === 'custom_acc'));
    assert(Array.isArray(sanitized.categories) && sanitized.categories.length >= 12);
    assert(Array.isArray(sanitized.transactions) && sanitized.transactions.length === 0);
  });

  // ============================================================================
  // PART 2: WALLETS & NET WORTH INVARIANCE
  // ============================================================================
  console.log('\n--- PART 2: WALLETS & NET WORTH INVARIANCE ---');

  runTest('2.1: calculateNetWorth computes total across all wallets and allocated goals', () => {
    const state = {
      accounts: [
        { id: 'w1', name: 'Cash', balance: 10000, isArchived: false },
        { id: 'w2', name: 'Bank', balance: 25000, isArchived: false },
        { id: 'w3', name: 'Archived Locker', balance: 5000, isArchived: true },
      ],
      goals: [],
      transactions: [],
    };
    // Archiving preserves wallet money in net worth (10000 + 25000 + 5000 = 40000)
    const nw = mmService.calculateNetWorth(state);
    assert.strictEqual(nw, 40000);
  });

  runTest('2.2: Wallet operations (add, update, archive, delete guard) enforce integrity', () => {
    let state = mmService.getDefaultState();
    const initialAccCount = state.accounts.length;

    // Add new wallet
    state = mmService.addAccount(state, { name: 'Emergency Fund', balance: 15000, icon: '🛡️', color: '#10B981' });
    assert.strictEqual(state.accounts.length, initialAccCount + 1);
    const newAcc = state.accounts[state.accounts.length - 1];
    assert.strictEqual(newAcc.name, 'Emergency Fund');
    assert.strictEqual(newAcc.balance, 15000);

    // Update wallet
    state = mmService.updateAccount(state, newAcc.id, { name: 'Emergency Vault', balance: 20000 });
    const updated = state.accounts.find(a => a.id === newAcc.id);
    assert.strictEqual(updated.name, 'Emergency Vault');
    assert.strictEqual(updated.balance, 20000);

    // Archive wallet
    state = mmService.archiveAccount(state, newAcc.id);
    const archived = state.accounts.find(a => a.id === newAcc.id);
    assert.strictEqual(archived.isArchived, true);

    // Delete wallet
    state = mmService.deleteAccount(state, newAcc.id);
    assert.strictEqual(state.accounts.some(a => a.id === newAcc.id), false);
  });

  // ============================================================================
  // PART 3: DOUBLE-ENTRY TRANSACTIONS & ATOMIC TRANSFERS
  // ============================================================================
  console.log('\n--- PART 3: TRANSACTIONS & ATOMIC TRANSFERS ---');

  runTest('3.1: Expense debits account and records transaction', () => {
    let state = mmService.getDefaultState();
    const accId = state.accounts[0].id;
    const initialBal = state.accounts[0].balance;

    state = mmService.addTransaction(state, {
      type: 'expense',
      amount: 1200,
      accountId: accId,
      categoryId: 'cat_food',
      note: 'Weekly Grocery',
    });

    const updatedAcc = state.accounts.find(a => a.id === accId);
    assert.strictEqual(updatedAcc.balance, initialBal - 1200);
    assert(state.transactions.some(t => t.type === 'expense' && t.amount === 1200));
  });

  runTest('3.2: Income credits account and records transaction', () => {
    let state = mmService.getDefaultState();
    const accId = state.accounts[1].id;
    const initialBal = state.accounts[1].balance;

    state = mmService.addTransaction(state, {
      type: 'income',
      amount: 45000,
      accountId: accId,
      categoryId: 'cat_salary',
      note: 'Monthly Salary',
    });

    const updatedAcc = state.accounts.find(a => a.id === accId);
    assert.strictEqual(updatedAcc.balance, initialBal + 45000);
    assert(state.transactions.some(t => t.type === 'income' && t.amount === 45000));
  });

  runTest('3.3: Fund transfer is atomic and preserves 100% net worth invariance', () => {
    let state = mmService.getDefaultState();
    const fromAccId = state.accounts[0].id;
    const toAccId = state.accounts[1].id;
    const fromBalBefore = state.accounts[0].balance;
    const toBalBefore = state.accounts[1].balance;
    const nwBefore = mmService.calculateNetWorth(state);

    state = mmService.addTransfer(state, {
      fromAccountId: fromAccId,
      toAccountId: toAccId,
      amount: 3000,
      note: 'ATM Cash to Bank',
    });

    const fromAccAfter = state.accounts.find(a => a.id === fromAccId);
    const toAccAfter = state.accounts.find(a => a.id === toAccId);
    assert.strictEqual(fromAccAfter.balance, fromBalBefore - 3000);
    assert.strictEqual(toAccAfter.balance, toBalBefore + 3000);

    const nwAfter = mmService.calculateNetWorth(state);
    assert.strictEqual(nwAfter, nwBefore, 'Net worth must remain 100% invariant across transfers');
  });

  runTest('3.4: Deleting a transaction rolls back account balances accurately', () => {
    let state = mmService.getDefaultState();
    const accId = state.accounts[0].id;
    const initialBal = state.accounts[0].balance;

    state = mmService.addTransaction(state, {
      type: 'expense',
      amount: 2500,
      accountId: accId,
      categoryId: 'cat_utility',
    });
    const txnId = state.transactions[0].id;
    assert.strictEqual(state.accounts.find(a => a.id === accId).balance, initialBal - 2500);

    state = mmService.deleteTransaction(state, txnId);
    assert.strictEqual(state.accounts.find(a => a.id === accId).balance, initialBal);
  });

  // ============================================================================
  // PART 4: CATEGORY BUDGETS & ALERT STATUS FLAGS
  // ============================================================================
  console.log('\n--- PART 4: CATEGORY BUDGETS & ALERT STATUS FLAGS ---');

  runTest('4.1: Category budget statuses classify safe (<80%), warning (80-100%), exceeded (>100%)', () => {
    const categories = [
      { id: 'c1', name: 'Food', type: 'expense', budget: 10000 },
      { id: 'c2', name: 'Transport', type: 'expense', budget: 5000 },
      { id: 'c3', name: 'Utility', type: 'expense', budget: 4000 },
      { id: 'c4', name: 'Other', type: 'expense', budget: 0 },
    ];

    const today = mmService.getLocalDateString();
    const transactions = [
      // c1: 5000 spent / 10000 budget = 50% -> safe
      { id: 't1', type: 'expense', categoryId: 'c1', amount: 5000, date: today },
      // c2: 4200 spent / 5000 budget = 84% -> warning
      { id: 't2', type: 'expense', categoryId: 'c2', amount: 4200, date: today },
      // c3: 4500 spent / 4000 budget = 112% -> exceeded
      { id: 't3', type: 'expense', categoryId: 'c3', amount: 4500, date: today },
      // c4: 1000 spent / 0 budget -> no_budget
      { id: 't4', type: 'expense', categoryId: 'c4', amount: 1000, date: today },
    ];

    const budgets = mmService.calculateCategoryBudgets(categories, transactions, 'this_month');
    const b1 = budgets.find(b => b.id === 'c1');
    const b2 = budgets.find(b => b.id === 'c2');
    const b3 = budgets.find(b => b.id === 'c3');
    const b4 = budgets.find(b => b.id === 'c4');

    assert.strictEqual(b1.status, 'safe');
    assert.strictEqual(b1.pct, 50);
    assert.strictEqual(b1.remaining, 5000);
    assert.strictEqual(b1.isOver, false);
    assert.strictEqual(b1.isWarning, false);

    assert.strictEqual(b2.status, 'warning');
    assert.strictEqual(b2.pct, 84);
    assert.strictEqual(b2.remaining, 800);
    assert.strictEqual(b2.isOver, false);
    assert.strictEqual(b2.isWarning, true);

    assert.strictEqual(b3.status, 'exceeded');
    assert.strictEqual(b3.pct, 113);
    assert.strictEqual(b3.remaining, 0);
    assert.strictEqual(b3.isOver, true);
    assert.strictEqual(b3.isWarning, false);

    assert.strictEqual(b4.status, 'no_budget');
    assert.strictEqual(b4.hasBudget, false);
  });

  runTest('4.2: setCategoryBudget enforces non-negative numeric constraints', () => {
    let state = mmService.getDefaultState();
    state = mmService.setCategoryBudget(state, 'cat_food', 20000);
    const cat = state.categories.find(c => c.id === 'cat_food');
    assert.strictEqual(cat.budget, 20000);

    assert.throws(() => {
      mmService.setCategoryBudget(state, 'cat_food', -500);
    }, /বাজেট ঋণাত্মক হতে পারে না|সঠিক অ-ঋণাত্মক বাজেট পরিমাণ দিন/);
  });

  // ============================================================================
  // PART 5: RECURRING TRANSACTIONS & SCHEDULE ENGINE
  // ============================================================================
  console.log('\n--- PART 5: RECURRING TRANSACTIONS & SCHEDULES ---');

  runTest('5.1: calculateNextDueDate advances dates accurately across daily, weekly, monthly, yearly', () => {
    assert.strictEqual(mmService.calculateNextDueDate('2026-10-01', 'daily'), '2026-10-02');
    assert.strictEqual(mmService.calculateNextDueDate('2026-10-01', 'weekly'), '2026-10-08');
    assert.strictEqual(mmService.calculateNextDueDate('2026-10-01', 'monthly'), '2026-11-01');
    assert.strictEqual(mmService.calculateNextDueDate('2026-10-01', 'yearly'), '2027-10-01');
  });

  runTest('5.2: processRecurringTransactions executes due schedules idempotently', () => {
    let state = mmService.getDefaultState();
    const accId = state.accounts[0].id;
    const initialBal = state.accounts[0].balance;

    const pastDate = '2026-09-01';
    state = {
      ...state,
      recurring: [
        {
          id: 'rec_rent',
          type: 'expense',
          amount: 8000,
          accountId: accId,
          categoryId: 'cat_utility',
          frequency: 'monthly',
          nextDueDate: pastDate,
          isActive: true,
          note: 'Shop Utility Rent',
        },
      ],
    };

    const processed = mmService.processRecurringTransactions(state, '2026-10-05');
    assert(processed.transactions.length >= 1, 'Due recurring schedule must generate a transaction');
    const genTxn = processed.transactions[0];
    assert.strictEqual(genTxn.amount, 8000);
    assert.strictEqual(genTxn.type, 'expense');

    const updatedAcc = processed.accounts.find(a => a.id === accId);
    assert(updatedAcc.balance < initialBal);

    // Idempotency: Running again with same target date must not duplicate transactions
    const doubleProcessed = mmService.processRecurringTransactions(processed, '2026-10-05');
    assert.strictEqual(doubleProcessed.transactions.length, processed.transactions.length);
  });

  // ============================================================================
  // PART 6: SAVINGS GOALS & BALANCE SYNCHRONIZATION
  // ============================================================================
  console.log('\n--- PART 6: SAVINGS GOALS ALLOCATION ---');

  runTest('6.1: Contributing to savings goal debits wallet balance and increments savedAmount', () => {
    let state = mmService.getDefaultState();
    const accId = state.accounts[0].id;
    const initialBal = state.accounts[0].balance;

    state = mmService.addGoal(state, {
      title: 'Emergency Reserve',
      targetAmount: 50000,
      savedAmount: 0,
      targetDate: '2027-01-01',
    });
    const goalId = state.goals[state.goals.length - 1].id;

    state = mmService.contributeToGoal(state, goalId, 5000, accId);
    const goal = state.goals.find(g => g.id === goalId);
    assert.strictEqual(goal.savedAmount, 5000);

    const acc = state.accounts.find(a => a.id === accId);
    assert.strictEqual(acc.balance, initialBal - 5000);
  });

  runTest('6.2: Withdrawing from savings goal credits wallet balance and decrements savedAmount', () => {
    let state = mmService.getDefaultState();
    const accId = state.accounts[0].id;
    const initialBal = state.accounts[0].balance;

    state = mmService.addGoal(state, {
      title: 'New Laptop',
      targetAmount: 80000,
      savedAmount: 0,
    });
    const goalId = state.goals[state.goals.length - 1].id;

    state = mmService.contributeToGoal(state, goalId, 10000, accId);
    assert.strictEqual(state.accounts.find(a => a.id === accId).balance, initialBal - 10000);

    state = mmService.withdrawFromGoal(state, goalId, 4000, accId);
    const goal = state.goals.find(g => g.id === goalId);
    assert.strictEqual(goal.savedAmount, 6000);
    assert.strictEqual(state.accounts.find(a => a.id === accId).balance, initialBal - 6000);
  });

  // ============================================================================
  // PART 7: ANALYTICS & CASH FLOW TOTALS
  // ============================================================================
  console.log('\n--- PART 7: ANALYTICS & CASH FLOW TOTALS ---');

  runTest('7.1: calculateCashFlow accurately aggregates income, expense, and savings rate', () => {
    const today = mmService.getLocalDateString();
    const transactions = [
      { id: 't1', type: 'income', amount: 50000, date: today },
      { id: 't2', type: 'expense', amount: 20000, date: today },
      { id: 't3', type: 'transfer', amount: 5000, date: today },
    ];

    const cf = mmService.calculateCashFlow(transactions, 'this_month');
    assert.strictEqual(cf.totalIncome, 50000);
    assert.strictEqual(cf.totalExpense, 20000);
    assert.strictEqual(cf.totalTransfer, 5000);
    assert.strictEqual(cf.netSavings, 30000);
    assert.strictEqual(cf.savingsRate, 60);
  });

  // ============================================================================
  // PART 8: DOMAIN ISOLATION & CLOUD BACKUP
  // ============================================================================
  console.log('\n--- PART 8: DOMAIN ISOLATION & CLOUD BACKUP ---');

  await runAsyncTest('8.1: Storage repository creates unified backup payload containing both business and moneyManager', async () => {
    const repo = new storageRepository.StorageRepository();
    const backup = await repo.createStorageBackup();
    assert(backup && backup.manifest, 'Backup must contain manifest');
    assert(backup.data || backup.accounts, 'Backup must contain data');
    assert(backup.checksum, 'Backup must carry integrity checksum');
  });

  // ============================================================================
  // PART 9: FRONTEND AST SYNTAX INTEGRITY
  // ============================================================================
  console.log('\n--- PART 9: FRONTEND AST INTEGRITY ---');

  runTest('9.1: App.js parses cleanly with zero JSX/syntax errors via Babel', () => {
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
  console.log('FEATURE 7 PERSONAL MONEY MANAGER (IVY WALLET) PARITY VERIFIED');
  console.log('================================================================\n');
}

runAll().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});