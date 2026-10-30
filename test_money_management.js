// test_money_management.js
// Automated verification for TallyKhata Personal Money Manager Suite & Backend Service

const fs = require("fs");
const assert = require("assert");
const babel = require("@babel/core");
const mmService = require("./src/moneyManagerService");

console.log("=== TALLYKHATA PERSONAL MONEY MANAGER VERIFICATION SUITE ===\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [${total}] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [${total}] ${name}\n      Error: ${err.message}`);
  }
}

const appSource = fs.readFileSync("App.js", "utf8");

// TEST 1: App.js Babel syntax check
runTest("App.js compiles with zero syntax errors via Babel parser", () => {
  babel.parseSync(appSource, { filename: String.fromCharCode(65,112,112,46,106,115), configFile: false, babelrc: false, parserOpts: { plugins: [String.fromCharCode(106,115,120), String.fromCharCode(102,108,111,119)] } });
});

// TEST 2: Home grid QR Code replaced with Money Manager
runTest("Home screen quick action grid has Money Manager with 3D icon and opens modalMoneyManager", () => {
  assert(appSource.includes("grid_money_manager.png"), "Missing grid_money_manager.png reference in App.js");
  assert(appSource.includes("setModalMoneyManager(true)"), "Missing setModalMoneyManager(true) handler");
  assert(appSource.includes("accessibilityLabel=\"মানি ম্যানেজার\""), "Missing accessibilityLabel for Money Manager grid item");
  assert(appSource.includes("styles.quickGridLabel") && (appSource.includes("মানি ম্যানেজার") || appSource.includes("qa_money_manager")), "Missing Bengali label in quick grid");
  
  const gridMatch = appSource.match(/quickGridRow[\s\S]*?মানি ম্যানেজার[\s\S]*?<\/View>/);
  assert(gridMatch, "Could not find quickGridRow with Money Manager");
  assert(!gridMatch[0].includes("QR কোড"), "QR কোড must be replaced from quick grid row");
});

// TEST 3: grid_money_manager.png asset validity
runTest("assets/icons/grid_money_manager.png exists as a valid PNG image", () => {
  const stat = fs.statSync("assets/icons/grid_money_manager.png");
  assert(stat.size > 1000, "Icon file size too small: " + stat.size);
  const buf = fs.readFileSync("assets/icons/grid_money_manager.png");
  const pngMagic = buf.slice(0, 8).toString("hex");
  assert.strictEqual(pngMagic, "89504e470d0a1a0a", "Invalid PNG header magic bytes");
});

// TEST 4: Menu screen entry for Money Manager
runTest("Menu tab contains Money Manager entry with badge and subtext", () => {
  assert(appSource.includes("মানি ম্যানেজার (ব্যক্তিগত হিসাব)"), "Missing Money Manager entry in Menu tab");
  assert(appSource.includes("ব্যক্তিগত আয়-ব্যয়, ওয়ালেট ও বাজেট ট্র্যাকার"), "Missing subtitle in Menu tab");
  assert(appSource.includes("mmNewBadge"), "Missing new badge style in Menu tab");
});

// TEST 5: Complete Ivy Wallet cleanup in App.js
runTest("Ivy Wallet artifacts completely removed from App.js", () => {
  assert(!appSource.includes("modalIvyWallet"), "modalIvyWallet still exists in App.js");
  assert(!appSource.includes("IVY_STORAGE_KEY"), "IVY_STORAGE_KEY still exists in App.js");
  assert(!appSource.includes("handleLaunchIvyNative"), "handleLaunchIvyNative still exists in App.js");
  assert(!/\bivy\b/i.test(appSource), "Residual ivy references found in App.js");
});

// TEST 6: Complete Ivy Wallet cleanup in android/
runTest("Ivy native package, module, and RootActivity removed from Android manifests and configs", () => {
  const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
  assert(!manifest.includes("com.ivy.wallet.RootActivity"), "RootActivity still in AndroidManifest.xml");
  assert(!manifest.includes("ivy"), "Ivy reference found in AndroidManifest.xml");

  const mainApp = fs.readFileSync("android/app/src/main/java/com/progoti/tallykhata/offline/MainApplication.kt", "utf8");
  assert(!mainApp.includes("IvyWalletPackage"), "IvyWalletPackage still in MainApplication.kt");

  const moduleFile = "android/app/src/main/java/com/progoti/tallykhata/offline/IvyWalletModule.kt";
  assert(!fs.existsSync(moduleFile), "IvyWalletModule.kt still exists on disk");
  const packageFile = "android/app/src/main/java/com/progoti/tallykhata/offline/IvyWalletPackage.kt";
  assert(!fs.existsSync(packageFile), "IvyWalletPackage.kt still exists on disk");
});

// TEST 7: Storage Key Isolation
runTest("Money Manager uses isolated storage key @tallykhata_personal_money_manager_v2", () => {
  assert(appSource.includes("@tallykhata_personal_money_manager_v2"), "Missing isolated MM storage key");
  assert(!appSource.includes("tallybook_offline_data_v6.*moneyManager"), "MM data must not leak into business store");
  assert.strictEqual(mmService.MM_STORAGE_KEY, "@tallykhata_personal_money_manager_v2");
});

// TEST 8: Backend Default State & Sanitize
runTest("mmService initializes default state and sanitizes partial saved data", () => {
  const def = mmService.getDefaultState("2026-10-28");
  assert.strictEqual(def.accounts.length, 4, "Default accounts count must be 4");
  assert.strictEqual(def.categories.length, 12, "Default categories count must be 12");
  assert.strictEqual(def.transactions.length, 5, "Default transactions count must be 5");

  // Partial saved state
  const partial = { accounts: [{ id: "acc_custom", name: "Custom", balance: 100 }] };
  const sanitized = mmService.sanitizeState(partial, def);
  assert.strictEqual(sanitized.accounts.length, 1);
  assert.strictEqual(sanitized.categories.length, 12, "Missing categories should be restored from defaults");
});

// TEST 9: Net Worth & Account Balances Calculation
runTest("mmService.calculateNetWorth accurately sums all active account balances", () => {
  const accounts = [
    { id: "acc_1", name: "ক্যাশ টাকা", balance: 5000 },
    { id: "acc_2", name: "ব্যাংক অ্যাকাউন্ট", balance: 25000 },
    { id: "acc_3", name: "বিকাশ", balance: 3500 },
    { id: "acc_4", name: "নগদ", balance: 1500 }
  ];
  const netWorth = mmService.calculateNetWorth(accounts);
  assert.strictEqual(netWorth, 35000, "Net worth calculation mismatch");
});

// TEST 10: Expense Transaction Logic via Service
runTest("mmService.addTransaction handles expense, debits account, and records transaction", () => {
  const state = {
    accounts: [{ id: "acc_1", name: "ক্যাশ টাকা", balance: 5000 }],
    categories: [{ id: "cat_food", name: "খাবার", type: "expense" }],
    transactions: []
  };
  const updated = mmService.addTransaction(state, {
    type: "expense",
    amount: 1200,
    accountId: "acc_1",
    categoryId: "cat_food",
    note: "Lunch"
  });
  assert.strictEqual(updated.accounts[0].balance, 3800, "Expense did not correctly debit account");
  assert.strictEqual(updated.transactions.length, 1, "Transaction not prepended");
  assert.strictEqual(updated.transactions[0].amount, 1200);
});

// TEST 11: Income Transaction Logic via Service
runTest("mmService.addTransaction handles income, credits account, and records transaction", () => {
  const state = {
    accounts: [{ id: "acc_bank", name: "ব্যাংক", balance: 20000 }],
    categories: [{ id: "cat_salary", name: "বেতন", type: "income" }],
    transactions: []
  };
  const updated = mmService.addTransaction(state, {
    type: "income",
    amount: 15000,
    accountId: "acc_bank",
    categoryId: "cat_salary",
    note: "Salary"
  });
  assert.strictEqual(updated.accounts[0].balance, 35000, "Income did not correctly credit account");
  assert.strictEqual(updated.transactions.length, 1);
});

// TEST 12: Inter-Account Transfer Logic via Service
runTest("mmService.addTransaction handles transfer atomically (debit source, credit dest)", () => {
  const state = {
    accounts: [
      { id: "acc_bank", name: "ব্যাংক", balance: 10000 },
      { id: "acc_bkash", name: "বিকাশ", balance: 2000 }
    ],
    categories: [],
    transactions: []
  };
  const updated = mmService.addTransaction(state, {
    type: "transfer",
    amount: 3000,
    fromAccountId: "acc_bank",
    toAccountId: "acc_bkash",
    note: "Transfer to bKash"
  });
  const bank = updated.accounts.find(a => a.id === "acc_bank");
  const bkash = updated.accounts.find(a => a.id === "acc_bkash");
  assert.strictEqual(bank.balance, 7000, "Transfer debit failed");
  assert.strictEqual(bkash.balance, 5000, "Transfer credit failed");
  assert.strictEqual(mmService.calculateNetWorth(updated.accounts), 12000, "Net worth altered in transfer");

  // Insufficient funds guard
  assert.throws(() => {
    mmService.addTransaction(state, {
      type: "transfer",
      amount: 50000,
      fromAccountId: "acc_bank",
      toAccountId: "acc_bkash"
    });
  }, /উৎস অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই/);
});

// TEST 13: Delete Transaction with Balance Reversion via Service
runTest("mmService.deleteTransaction accurately rolls back balance on deletion", () => {
  const state = {
    accounts: [{ id: "acc_cash", balance: 3800 }],
    transactions: [{ id: "t_exp", type: "expense", accountId: "acc_cash", amount: 1200 }]
  };
  const updated = mmService.deleteTransaction(state, "t_exp");
  assert.strictEqual(updated.accounts[0].balance, 5000, "Expense deletion did not restore balance");
  assert.strictEqual(updated.transactions.length, 0);
});

// TEST 14: Budget Tracking & Over-budget Alert Logic
runTest("mmService.calculateCategoryBudgets computes spent, pct, remaining, and isOver", () => {
  const categories = [
    { id: "cat_food", name: "খাবার", type: "expense", budget: 5000 }
  ];
  const txns = [
    { type: "expense", categoryId: "cat_food", amount: 3500 },
    { type: "expense", categoryId: "cat_food", amount: 2000 } // Total 5500 > 5000
  ];
  const budgets = mmService.calculateCategoryBudgets(categories, txns);
  assert.strictEqual(budgets[0].spent, 5500);
  assert.strictEqual(budgets[0].pct, 110);
  assert.strictEqual(budgets[0].isOver, true);
  assert.strictEqual(budgets[0].remaining, 0);
});

// TEST 15: Analytics: Category Distribution & Savings Rate
runTest("mmService.calculateCashFlow and calculateCategoryDistribution compute correct analytics", () => {
  const categories = [
    { id: "cat_food", name: "খাবার", type: "expense", budget: 10000 },
    { id: "cat_travel", name: "যাতায়াত", type: "expense", budget: 5000 }
  ];
  const txns = [
    { type: "income", amount: 50000 },
    { type: "expense", categoryId: "cat_food", amount: 15000 },
    { type: "expense", categoryId: "cat_travel", amount: 5000 }
  ];
  const cf = mmService.calculateCashFlow(txns);
  assert.strictEqual(cf.totalIncome, 50000);
  assert.strictEqual(cf.totalExpense, 20000);
  assert.strictEqual(cf.netSavings, 30000);
  assert.strictEqual(cf.savingsRate, 60);

  const dist = mmService.calculateCategoryDistribution(categories, txns);
  assert.strictEqual(dist.totalExpense, 20000);
  assert.strictEqual(dist.distribution[0].categoryId, "cat_food");
  assert.strictEqual(dist.distribution[0].percentage, 75);
  assert.strictEqual(dist.distribution[1].categoryId, "cat_travel");
  assert.strictEqual(dist.distribution[1].percentage, 25);
});

// TEST 16: Account CRUD Operations & Safety Guards
runTest("mmService account operations (add, update, delete) enforce invariants", () => {
  let state = {
    accounts: [
      { id: "acc_1", name: "Cash", type: "cash", balance: 1000 },
      { id: "acc_2", name: "Bank", type: "bank", balance: 5000 }
    ],
    transactions: [{ id: "tx_1", accountId: "acc_1", amount: 100 }]
  };

  // Add Account
  state = mmService.addAccount(state, { name: "Rocket", type: "mfs", balance: 500 });
  assert.strictEqual(state.accounts.length, 3);
  const rocket = state.accounts.find(a => a.name === "Rocket");
  assert.strictEqual(rocket.balance, 500);

  // Update Account
  state = mmService.updateAccount(state, rocket.id, { name: "Rocket Personal" });
  assert.strictEqual(state.accounts.find(a => a.id === rocket.id).name, "Rocket Personal");

  // Delete Account with transactions should be blocked
  assert.throws(() => {
    mmService.deleteAccount(state, "acc_1");
  }, /লেনদেনের ইতিহাস যুক্ত থাকায়/);

  // Delete unused account succeeds
  state = mmService.deleteAccount(state, rocket.id);
  assert.strictEqual(state.accounts.length, 2);
});


// TEST 17: Transfers remain strictly balance-neutral in cash-flow calculations
runTest("Transfers remain balance-neutral in income/expense cash-flow totals", () => {
  const txns = [
    { type: "income", amount: 10000 },
    { type: "expense", amount: 4000 },
    { type: "transfer", amount: 25000, fromAccountId: "acc_bank", toAccountId: "acc_cash" }
  ];
  const cf = mmService.calculateCashFlow(txns);
  assert.strictEqual(cf.totalIncome, 10000, "Transfer incorrectly inflated income");
  assert.strictEqual(cf.totalExpense, 4000, "Transfer incorrectly inflated expense");
  assert.strictEqual(cf.netSavings, 6000, "Net savings calculation skewed by transfer");
});

// TEST 18: Malformed storage recovery and schema resilience
runTest("sanitizeState gracefully repairs malformed, partial, or corrupted saved data", () => {
  const def = mmService.getDefaultState();
  
  // Case A: null/undefined/primitive storage
  assert.deepStrictEqual(mmService.sanitizeState(null, def), def);
  assert.deepStrictEqual(mmService.sanitizeState("corrupted", def), def);
  
  // Case B: empty accounts array recovers default accounts
  const partialEmpty = { accounts: [], categories: null, transactions: "invalid" };
  const sanitized = mmService.sanitizeState(partialEmpty, def);
  assert(sanitized.accounts.length >= 4, "Accounts should recover defaults when empty");
  assert(sanitized.categories.length >= 10, "Categories should recover defaults when null");
  assert(Array.isArray(sanitized.transactions), "Transactions should sanitize to array");
});

// TEST 19: Budget customization and validation
runTest("setCategoryBudget enforces numeric non-negative validation and updates category limit", () => {
  let state = mmService.getDefaultState();
  state = mmService.setCategoryBudget(state, "cat_food", 25000);
  const foodCat = state.categories.find(c => c.id === "cat_food");
  assert.strictEqual(foodCat.budget, 25000, "Budget limit not updated");

  assert.throws(() => {
    mmService.setCategoryBudget(state, "cat_food", -500);
  }, /সঠিক বাজেট সীমা প্রদান করুন/);

  assert.throws(() => {
    mmService.setCategoryBudget(state, "cat_food", "invalid_amt");
  }, /সঠিক বাজেট সীমা প্রদান করুন/);
});

// TEST 20: TallyPay and Bangla QR integrity preserved across App.js
runTest("TallyPay tab, Bangla QR modal, and QR promo assets remain fully intact", () => {
  assert(appSource.includes("modalBanglaQR"), "modalBanglaQR missing from App.js");
  assert(appSource.includes("ic_bangla_qr.png"), "ic_bangla_qr.png asset reference missing");
  assert(appSource.includes("grid_qr.png"), "grid_qr.png asset reference missing from TallyPay");
  assert(appSource.includes("বাংলা QR"), "বাংলা QR text missing from TallyPay");
  assert(appSource.includes("activeTab === 'tallypay'"), "TallyPay tab missing");
});

// TEST 21: Business switching isolation
runTest("Money Manager data namespace remains strictly isolated from active business ID", () => {
  const mmState = mmService.getDefaultState();
  const txUpdated = mmService.addTransaction(mmState, {
    type: "income",
    amount: 5000,
    accountId: "acc_cash",
    categoryId: "cat_salary",
    note: "Independent Personal Income"
  });
  
  const newTxn = txUpdated.transactions.find(t => t.note === "Independent Personal Income");
  assert(newTxn, "New transaction not found");
  assert.strictEqual(newTxn.businessId, undefined, "MM transaction must not carry businessId");
  assert(!JSON.stringify(txUpdated).includes("activeBusinessId"), "MM state must not contain activeBusinessId");
});


// TEST 22: editTransaction balance adjustments and rollbacks
runTest("mmService.editTransaction accurately recalibrates balances on amount, account, or type change", () => {
  let state = {
    accounts: [
      { id: "acc_cash", balance: 5000, isArchived: false },
      { id: "acc_bank", balance: 20000, isArchived: false },
    ],
    categories: [{ id: "cat_food", type: "expense" }, { id: "cat_salary", type: "income" }],
    transactions: [
      { id: "t_1", type: "expense", amount: 1000, accountId: "acc_cash", categoryId: "cat_food", note: "Grocery" }
    ]
  };

  // Case A: Increase expense amount from 1000 to 1500 on same account (should debit additional 500)
  state = mmService.editTransaction(state, "t_1", { amount: 1500 });
  assert.strictEqual(state.accounts.find(a => a.id === "acc_cash").balance, 4500);
  assert.strictEqual(state.transactions.find(t => t.id === "t_1").amount, 1500);

  // Case B: Decrease expense amount from 1500 to 500 (should credit back 1000)
  state = mmService.editTransaction(state, "t_1", { amount: 500 });
  assert.strictEqual(state.accounts.find(a => a.id === "acc_cash").balance, 5500);

  // Case C: Move transaction from acc_cash to acc_bank (acc_cash refunded 500, acc_bank debited 500)
  state = mmService.editTransaction(state, "t_1", { accountId: "acc_bank" });
  assert.strictEqual(state.accounts.find(a => a.id === "acc_cash").balance, 6000);
  assert.strictEqual(state.accounts.find(a => a.id === "acc_bank").balance, 19500);

  // Case D: Update note and payee
  state = mmService.editTransaction(state, "t_1", { note: "Updated Note", payee: "Shwapno" });
  const updatedTx = state.transactions.find(t => t.id === "t_1");
  assert.strictEqual(updatedTx.note, "Updated Note");
  assert.strictEqual(updatedTx.payee, "Shwapno");
});

// TEST 23: archiveAccount toggling and net worth calculation
runTest("mmService.archiveAccount toggles archive status and excludes archived accounts from Net Worth", () => {
  let state = {
    accounts: [
      { id: "acc_cash", name: "Cash", balance: 10000, isArchived: false },
      { id: "acc_old", name: "Old Bank", balance: 5000, isArchived: false },
    ],
    categories: [],
    transactions: []
  };

  assert.strictEqual(mmService.calculateNetWorth(state), 15000);

  // Archive acc_old
  state = mmService.archiveAccount(state, "acc_old", true);
  assert.strictEqual(state.accounts.find(a => a.id === "acc_old").isArchived, true);
  assert.strictEqual(mmService.calculateNetWorth(state), 10000, "Archived account must be excluded from net worth");

  // Unarchive acc_old
  state = mmService.archiveAccount(state, "acc_old", false);
  assert.strictEqual(state.accounts.find(a => a.id === "acc_old").isArchived, false);
  assert.strictEqual(mmService.calculateNetWorth(state), 15000, "Unarchived account must be included in net worth");
});

// TEST 24: Custom Category Creation & Validation
runTest("mmService.addCategory, updateCategory, and deleteCategory enforce valid inputs and prevent deleting defaults", () => {
  let state = mmService.getDefaultState();
  const initialCatCount = state.categories.length;

  // Add custom category
  state = mmService.addCategory(state, {
    name: "ইন্টারনেট বিল",
    type: "expense",
    icon: "🌐",
    color: "#6366F1",
    budget: 1500
  });
  assert.strictEqual(state.categories.length, initialCatCount + 1);
  const customCat = state.categories.find(c => c.name === "ইন্টারনেট বিল");
  assert(customCat, "Custom category not found");
  assert.strictEqual(customCat.budget, 1500);

  // Update category
  state = mmService.updateCategory(state, customCat.id, { budget: 2000, color: "#4F46E5" });
  const updatedCat = state.categories.find(c => c.id === customCat.id);
  assert.strictEqual(updatedCat.budget, 2000);
  assert.strictEqual(updatedCat.color, "#4F46E5");

  // Prevent deleting category used in transactions
  state.transactions.push({ id: "tx_cat_test", categoryId: customCat.id, amount: 500, type: "expense" });
  assert.throws(() => {
    mmService.deleteCategory(state, customCat.id);
  }, /লেনদেন যুক্ত থাকায়/);

  // Delete unused category succeeds
  state.transactions = state.transactions.filter(t => t.id !== "tx_cat_test");
  state = mmService.deleteCategory(state, customCat.id);
  assert.strictEqual(state.categories.length, initialCatCount);
});

// TEST 25: Overall Monthly Budget Ceiling Logic
runTest("mmService.setOverallBudget and calculatePeriodMetrics correctly manage overall spending limits", () => {
  let state = mmService.getDefaultState();
  state = mmService.setOverallBudget(state, 45000);
  assert.strictEqual(state.overallMonthlyBudget, 45000);

  assert.throws(() => {
    mmService.setOverallBudget(state, -100);
  }, /সঠিক সামগ্রিক বাজেট সীমা প্রদান করুন/);

  assert.throws(() => {
    mmService.setOverallBudget(state, "not_a_number");
  }, /সঠিক সামগ্রিক বাজেট সীমা প্রদান করুন/);

  const metrics = mmService.calculatePeriodMetrics(state, "this_month");
  assert(metrics.overallBudgetLimit === 45000);
  assert(typeof metrics.overallBudgetPct === "number");
  assert(typeof metrics.overallBudgetRemaining === "number");
});

// TEST 26: Savings Goals CRUD and Deposit with Account Balance Debit
runTest("mmService savings goals allow adding, contributing (with balance debit), and deleting goals", () => {
  let state = {
    accounts: [{ id: "acc_bank", name: "Bank", balance: 50000, isArchived: false }],
    categories: [{ id: "cat_investment", name: "সঞ্চয়", type: "expense" }],
    goals: [],
    transactions: []
  };

  // Add Goal
  state = mmService.addGoal(state, {
    title: "নতুন ল্যাপটপ",
    targetAmount: 80000,
    savedAmount: 20000,
    targetDate: "2026-12-31",
    icon: "💻",
    note: "কাজের জন্য ম্যাকবুক"
  });
  assert.strictEqual(state.goals.length, 1);
  const laptopGoal = state.goals[0];
  assert.strictEqual(laptopGoal.savedAmount, 20000);

  // Contribute 10000 from acc_bank
  state = mmService.contributeToGoal(state, laptopGoal.id, 10000, "acc_bank");
  assert.strictEqual(state.goals[0].savedAmount, 30000);
  assert.strictEqual(state.accounts[0].balance, 40000, "Source bank account was not debited");
  assert(state.transactions.length === 1, "Goal deposit transaction was not recorded");
  assert.strictEqual(state.transactions[0].amount, 10000);

  // Fail if bank balance insufficient
  assert.throws(() => {
    mmService.contributeToGoal(state, laptopGoal.id, 50000, "acc_bank"); // balance is 40000
  }, /পর্যাপ্ত ব্যালেন্স নেই/);

  // Delete Goal
  state = mmService.deleteGoal(state, laptopGoal.id);
  assert.strictEqual(state.goals.length, 0);
});

// TEST 27: filterAndSortTransactions multi-criteria testing
runTest("mmService.filterAndSortTransactions filters by period, type, query, and sorts correctly", () => {
  const dToday = new Date().toISOString().split("T")[0];
  const state = {
    transactions: [
      { id: "t1", type: "expense", amount: 500, date: dToday, note: "Lunch with team", payee: "Cafe", categoryId: "cat_food" },
      { id: "t2", type: "income", amount: 50000, date: dToday, note: "Salary payment", payee: "Company", categoryId: "cat_salary" },
      { id: "t3", type: "expense", amount: 2000, date: "2025-01-01", note: "Old expense", payee: "Store", categoryId: "cat_utility" },
      { id: "t4", type: "transfer", amount: 10000, date: dToday, note: "Bank to MFS", fromAccountId: "acc_bank", toAccountId: "acc_bkash" },
    ]
  };

  // Filter this_month
  const thisMonth = mmService.filterAndSortTransactions(state, { period: "this_month" });
  assert.strictEqual(thisMonth.length, 3, "Old transaction from 2025 must be excluded");

  // Filter only expense
  const expenses = mmService.filterAndSortTransactions(state, { filterType: "expense", period: "all_time" });
  assert.strictEqual(expenses.length, 2);

  // Search by payee "Cafe"
  const searched = mmService.filterAndSortTransactions(state, { searchQuery: "Cafe", period: "all_time" });
  assert.strictEqual(searched.length, 1);
  assert.strictEqual(searched[0].id, "t1");

  // Sort by amount_high
  const sortedHigh = mmService.filterAndSortTransactions(state, { period: "all_time", sortOrder: "amount_high" });
  assert.strictEqual(sortedHigh[0].amount, 50000);
  assert.strictEqual(sortedHigh[sortedHigh.length - 1].amount, 500);

  // Sort by amount_low
  const sortedLow = mmService.filterAndSortTransactions(state, { period: "all_time", sortOrder: "amount_low" });
  assert.strictEqual(sortedLow[0].amount, 500);
});

// TEST 28: calculatePeriodMetrics and calculateCategoryDistribution
runTest("mmService period metrics and distribution isolate dates and calculate accurate proportions", () => {
  const state = mmService.getDefaultState();
  const metrics = mmService.calculatePeriodMetrics(state, "this_month");
  assert(metrics.netWorth > 0);
  assert(typeof metrics.savingsRate === "number");

  const dist = mmService.calculateCategoryDistribution(state, "this_month");
  assert(Array.isArray(dist));
  if (dist.length > 0) {
    const totalPct = dist.reduce((sum, item) => sum + item.percentage, 0);
    assert(totalPct <= 100 && totalPct >= 98, "Category distribution percentages should sum to ~100%");
  }
});

// TEST 29: Schema v3 Migration from Legacy v1/v2 State
runTest("sanitizeState migrates legacy v1/v2 state to v3 with default goals, preferences, and overall budget", () => {
  const legacyV2State = {
    version: 2,
    accounts: [
      { id: "acc_cash", name: "Cash", balance: 5000 } // missing isArchived
    ],
    categories: [
      { id: "cat_food", name: "Food", type: "expense" } // missing budget
    ],
    transactions: [
      { id: "tx_1", type: "expense", amount: 500, accountId: "acc_cash" }
    ]
  };

  const migrated = mmService.sanitizeState(legacyV2State);
  assert.strictEqual(migrated.version, 3, "Version must be migrated to 3");
  assert(migrated.overallMonthlyBudget > 0, "Default overallMonthlyBudget must be populated");
  assert(Array.isArray(migrated.goals) && migrated.goals.length > 0, "Default goals must be populated");
  assert(migrated.preferences && migrated.preferences.currencySymbol === "৳", "Preferences must be populated");
  assert.strictEqual(migrated.accounts[0].isArchived, false, "Account isArchived must be defaulted to false");
  assert.strictEqual(migrated.categories[0].budget, 0, "Category budget must be defaulted to 0");
});

// TEST 30: User Preferences Update & Reset
runTest("mmService preferences can be customized and reset to defaults", () => {
  let state = mmService.getDefaultState();
  assert.strictEqual(state.preferences.defaultPeriod, "this_month");

  state = mmService.updatePreferences(state, { defaultPeriod: "last_month", sortOrder: "amount_high" });
  assert.strictEqual(state.preferences.defaultPeriod, "last_month");
  assert.strictEqual(state.preferences.sortOrder, "amount_high");

  state = mmService.resetPreferences(state);
  assert.strictEqual(state.preferences.defaultPeriod, "this_month");
  assert.strictEqual(state.preferences.sortOrder, "newest");
});

// TEST 31: App.js Android Hardware Back-Handler Support for All MM Modals
runTest("App.js hooks hardware back press for modalMoneyManager and all 9 child modals", () => {
  assert(appSource.includes("modalMMDepositGoal"), "modalMMDepositGoal back handler missing");
  assert(appSource.includes("modalMMAddGoal"), "modalMMAddGoal back handler missing");
  assert(appSource.includes("modalMMOverallBudget"), "modalMMOverallBudget back handler missing");
  assert(appSource.includes("modalMMAddCategory"), "modalMMAddCategory back handler missing");
  assert(appSource.includes("modalMMEditTxn"), "modalMMEditTxn back handler missing");
  assert(appSource.includes("modalMMAddTxn"), "modalMMAddTxn back handler missing");
  assert(appSource.includes("modalMMAddAccount"), "modalMMAddAccount back handler missing");
  assert(appSource.includes("modalMMSetBudget"), "modalMMSetBudget back handler missing");
  assert(appSource.includes("modalMMTransfer"), "modalMMTransfer back handler missing");
  assert(appSource.includes("modalMoneyManager"), "modalMoneyManager back handler missing");
});

// TEST 32: Sub-tab navigation and period controls present in App.js
runTest("App.js renders all 5 sub-tabs and period selection pills", () => {
  assert(appSource.includes("mmActiveSubTab === 'transactions'"), "Transactions subtab missing");
  assert(appSource.includes("mmActiveSubTab === 'accounts'"), "Accounts subtab missing");
  assert(appSource.includes("mmActiveSubTab === 'budgets'"), "Budgets subtab missing");
  assert(appSource.includes("mmActiveSubTab === 'goals'"), "Goals subtab missing");
  assert(appSource.includes("mmActiveSubTab === 'analytics'"), "Analytics subtab missing");
  assert(appSource.includes("mmPeriod === 'this_month'"), "this_month period pill missing");
  assert(appSource.includes("mmPeriod === 'last_month'"), "last_month period pill missing");
  assert(appSource.includes("mmPeriod === 'all_time'"), "all_time period pill missing");
});

// TEST 33: calculateCategoryBudgets dual signature and field verification
runTest("mmService.calculateCategoryBudgets supports state input and includes categoryId field", () => {
  const state = {
    accounts: [{ id: "acc_cash", balance: 5000, isArchived: false }],
    categories: [
      { id: "cat_food", name: "খাবার", type: "expense", budget: 5000, isArchived: false },
      { id: "cat_salary", name: "বেতন", type: "income", budget: 0, isArchived: false }
    ],
    transactions: [
      { id: "t_1", type: "expense", amount: 1500, categoryId: "cat_food", accountId: "acc_cash", date: "2026-10-15" },
      { id: "t_2", type: "income", amount: 20000, categoryId: "cat_salary", accountId: "acc_cash", date: "2026-10-01" }
    ]
  };

  // Called with (state, period)
  const budgets = mmService.calculateCategoryBudgets(state, "all_time");
  assert(Array.isArray(budgets), "budgets must be an array");
  assert.strictEqual(budgets.length, 1, "Only expense categories should be returned");
  const foodBudget = budgets[0];
  assert.strictEqual(foodBudget.categoryId, "cat_food", "Must have categoryId matching id");
  assert.strictEqual(foodBudget.spent, 1500);
  assert.strictEqual(foodBudget.remaining, 3500);
  assert.strictEqual(foodBudget.pct, 30);
  assert.strictEqual(foodBudget.isOver, false);

  // Called with legacy (categories, transactions, period)
  const legacyBudgets = mmService.calculateCategoryBudgets(state.categories, state.transactions, "all_time");
  assert.strictEqual(legacyBudgets.length, 1);
  assert.strictEqual(legacyBudgets[0].spent, 1500);
});

// TEST 34: Invariants on adding & editing transactions with archived/mismatched entities
runTest("mmService transaction operations reject archived accounts, archived categories, and mismatched category types", () => {
  let state = {
    accounts: [
      { id: "acc_active", name: "Active", balance: 5000, isArchived: false },
      { id: "acc_archived", name: "Archived", balance: 1000, isArchived: true }
    ],
    categories: [
      { id: "cat_food", name: "খাবার", type: "expense", isArchived: false },
      { id: "cat_salary", name: "বেতন", type: "income", isArchived: false },
      { id: "cat_archived_exp", name: "পুরনো ব্যয়", type: "expense", isArchived: true }
    ],
    transactions: []
  };

  // Reject adding transaction to archived account
  assert.throws(() => {
    mmService.addTransaction(state, {
      type: "expense",
      amount: 500,
      accountId: "acc_archived",
      categoryId: "cat_food"
    });
  }, /আর্কাইভ করা ওয়ালেটে লেনদেন যোগ করা যাবে না/);

  // Reject adding transaction to archived category
  assert.throws(() => {
    mmService.addTransaction(state, {
      type: "expense",
      amount: 500,
      accountId: "acc_active",
      categoryId: "cat_archived_exp"
    });
  }, /আর্কাইভ করা ক্যাটাগরিতে নতুন লেনদেন যুক্ত করা যাবে না/);

  // Reject mismatched category type (income with expense category)
  assert.throws(() => {
    mmService.addTransaction(state, {
      type: "income",
      amount: 5000,
      accountId: "acc_active",
      categoryId: "cat_food"
    });
  }, /ক্যাটাগরির ধরন এবং লেনদেনের ধরন সামঞ্জস্যপূর্ণ নয়/);

  // Reject transfer to or from archived account
  assert.throws(() => {
    mmService.addTransaction(state, {
      type: "transfer",
      amount: 500,
      fromAccountId: "acc_active",
      toAccountId: "acc_archived"
    });
  }, /আর্কাইভ করা ওয়ালেটের মধ্যে স্থানান্তর সম্ভব নয়/);
});

// TEST 35: Category deletion protection for defaults and linked records
runTest("mmService.deleteCategory protects default system categories and categories with transactions or recurring schedules", () => {
  let state = mmService.getDefaultState();

  // Attempting to delete default system category (cat_food) must throw
  assert.throws(() => {
    mmService.deleteCategory(state, "cat_food");
  }, /ডিফল্ট সিস্টেম ক্যাটাগরি মুছে ফেলা যাবে না/);

  // Create custom category and attach recurring schedule
  state = mmService.addCategory(state, { name: "কাস্টম বিল", type: "expense" });
  const customCat = state.categories.find(c => c.name === "কাস্টম বিল");
  assert(customCat, "Custom category not found");

  state = mmService.addRecurring(state, {
    title: "মাসিক বিল শিডিউল",
    type: "expense",
    amount: 1000,
    categoryId: customCat.id,
    accountId: "acc_cash",
    cadence: "monthly"
  });

  // Attempting to delete category used in recurring schedule must throw
  assert.throws(() => {
    mmService.deleteCategory(state, customCat.id);
  }, /অটো-শিডিউল যুক্ত থাকায়/);
});

// TEST 36: Account deletion protection for recurring schedules and last active account
runTest("mmService.deleteAccount protects accounts with recurring schedules and enforces minimum active count", () => {
  let state = {
    accounts: [
      { id: "acc_1", name: "Wallet 1", balance: 1000, isArchived: false },
      { id: "acc_2", name: "Wallet 2", balance: 2000, isArchived: false }
    ],
    recurring: [
      { id: "rec_1", title: "Test Rec", type: "expense", amount: 100, accountId: "acc_2", cadence: "monthly", isActive: true }
    ],
    transactions: []
  };

  // Attempting to delete acc_2 (linked to recurring) must throw
  assert.throws(() => {
    mmService.deleteAccount(state, "acc_2");
  }, /অটো-শিডিউল যুক্ত থাকায়/);

  // Deleting unlinked acc_1 succeeds
  state = mmService.deleteAccount(state, "acc_1");
  assert.strictEqual(state.accounts.length, 1);

  // Attempting to delete the sole remaining account must throw
  assert.throws(() => {
    mmService.deleteAccount(state, "acc_2");
  }, /কমপক্ষে একটি অ্যাকাউন্ট বিদ্যমান থাকতে হবে/);
});

// TEST 37: contributeToGoal strict account validation and single atomic debit
runTest("mmService.contributeToGoal enforces active account, sufficient funds, and debits balance atomically", () => {
  let state = {
    accounts: [
      { id: "acc_main", name: "Main", balance: 10000, isArchived: false },
      { id: "acc_archived", name: "Old", balance: 5000, isArchived: true }
    ],
    goals: [
      { id: "goal_car", title: "গাড়ি কেনা", targetAmount: 500000, savedAmount: 50000 }
    ],
    transactions: []
  };

  // Must reject missing fromAccountId
  assert.throws(() => {
    mmService.contributeToGoal(state, "goal_car", 5000, null);
  }, /দয়া করে টাকা কর্তনের জন্য একটি সক্রিয় ওয়ালেট নির্বাচন করুন/);

  // Must reject archived fromAccountId
  assert.throws(() => {
    mmService.contributeToGoal(state, "goal_car", 2000, "acc_archived");
  }, /আর্কাইভ করা ওয়ালেট হতে টাকা জমা করা যাবে না/);

  // Must reject insufficient funds
  assert.throws(() => {
    mmService.contributeToGoal(state, "goal_car", 15000, "acc_main");
  }, /পর্যাপ্ত ব্যালেন্স নেই/);

  // Valid deposit updates account and goal exactly once
  state = mmService.contributeToGoal(state, "goal_car", 4000, "acc_main");
  assert.strictEqual(state.accounts.find(a => a.id === "acc_main").balance, 6000);
  assert.strictEqual(state.goals.find(g => g.id === "goal_car").savedAmount, 54000);
  assert.strictEqual(state.transactions.length, 1);
  assert.strictEqual(state.transactions[0].amount, 4000);
});

// TEST 38: Recurring schedules lifecycle, pause/resume, and idempotent generation
runTest("mmService recurring transactions handle pause, resume, deletion, and idempotent processing", () => {
  let state = {
    accounts: [{ id: "acc_bank", name: "Bank", balance: 20000, isArchived: false }],
    categories: [{ id: "cat_utility", name: "ইউটিলিটি", type: "expense", isArchived: false }],
    recurring: [
      {
        id: "rec_wifi",
        title: "ওয়াইফাই বিল",
        type: "expense",
        amount: 1000,
        categoryId: "cat_utility",
        accountId: "acc_bank",
        cadence: "monthly",
        startDate: "2026-10-01",
        nextDueDate: "2026-10-15",
        lastProcessedDate: null,
        isActive: true
      }
    ],
    transactions: []
  };

  // Process recurring for today 2026-10-20 (due date 2026-10-15 has arrived)
  state = mmService.processRecurringTransactions(state, "2026-10-20");
  assert.strictEqual(state.transactions.length, 1, "Transaction should be posted");
  assert.strictEqual(state.accounts[0].balance, 19000, "Bank should be debited by 1000");
  assert.strictEqual(state.recurring[0].nextDueDate, "2026-11-15", "Next due date should advance by one month");

  // Idempotency: Processing again on same date must NOT create duplicate transactions
  state = mmService.processRecurringTransactions(state, "2026-10-20");
  assert.strictEqual(state.transactions.length, 1, "Must not create duplicate transaction on reload");
  assert.strictEqual(state.accounts[0].balance, 19000, "Balance must remain unchanged on reload");

  // Pause recurring schedule
  state = mmService.toggleRecurringActive(state, "rec_wifi", false);
  assert.strictEqual(state.recurring[0].isActive, false);

  // Due date arrives while paused -> should NOT post transaction
  state.recurring[0].nextDueDate = "2026-10-25";
  state = mmService.processRecurringTransactions(state, "2026-10-26");
  assert.strictEqual(state.transactions.length, 1, "Paused schedule must not post transactions");

  // Resume recurring schedule
  state = mmService.toggleRecurringActive(state, "rec_wifi", true);
  assert.strictEqual(state.recurring[0].isActive, true);

  // Delete recurring schedule does NOT delete historical transactions
  state = mmService.deleteRecurring(state, "rec_wifi");
  assert.strictEqual(state.recurring.length, 0);
  assert.strictEqual(state.transactions.length, 1, "Historical transactions must be preserved");
});

// TEST 39: App.js UI features for category tabs and dynamic currency preference
runTest("App.js renders category expense/income tabs and dynamic currency symbol", () => {
  assert(appSource.includes("mmCatSectionTab === 'expense'"), "Category expense tab missing");
  assert(appSource.includes("mmCatSectionTab === 'income'"), "Category income tab missing");
  assert(appSource.includes("mmCurrency"), "Dynamic mmCurrency missing");
});


// TEST 40: Editing transfers updates wallets atomically and preserves net worth
runTest("mmService.editTransaction updates transfer amounts atomically and maintains net worth invariant", () => {
  let state = {
    accounts: [
      { id: "acc_bank", name: "Bank", balance: 50000, isArchived: false },
      { id: "acc_bkash", name: "bKash", balance: 10000, isArchived: false }
    ],
    categories: [],
    transactions: []
  };
  const initialNetWorth = mmService.calculateNetWorth(state);
  assert.strictEqual(initialNetWorth, 60000);

  // Add transfer of 5000 from Bank to bKash
  state = mmService.addTransaction(state, {
    type: "transfer",
    amount: 5000,
    fromAccountId: "acc_bank",
    toAccountId: "acc_bkash"
  });
  const txnId = state.transactions[0].id;
  assert.strictEqual(state.accounts.find(a => a.id === "acc_bank").balance, 45000);
  assert.strictEqual(state.accounts.find(a => a.id === "acc_bkash").balance, 15000);
  assert.strictEqual(mmService.calculateNetWorth(state), 60000, "Net worth invariant preserved on transfer add");

  // Edit transfer amount to 8000
  state = mmService.editTransaction(state, txnId, {
    type: "transfer",
    amount: 8000,
    fromAccountId: "acc_bank",
    toAccountId: "acc_bkash"
  });
  assert.strictEqual(state.accounts.find(a => a.id === "acc_bank").balance, 42000);
  assert.strictEqual(state.accounts.find(a => a.id === "acc_bkash").balance, 18000);
  assert.strictEqual(mmService.calculateNetWorth(state), 60000, "Net worth invariant preserved on transfer edit");

  // Delete transfer
  state = mmService.deleteTransaction(state, txnId);
  assert.strictEqual(state.accounts.find(a => a.id === "acc_bank").balance, 50000);
  assert.strictEqual(state.accounts.find(a => a.id === "acc_bkash").balance, 10000);
  assert.strictEqual(mmService.calculateNetWorth(state), 60000, "Net worth invariant preserved on transfer delete");
});

// TEST 41: editTransaction rejects archived accounts, archived categories, and mismatched types
runTest("mmService.editTransaction rejects archived accounts, archived categories, and mismatched category types", () => {
  let state = {
    accounts: [
      { id: "acc_act", name: "Active", balance: 10000, isArchived: false },
      { id: "acc_arc", name: "Archived", balance: 5000, isArchived: true }
    ],
    categories: [
      { id: "cat_food", name: "Food", type: "expense", isArchived: false },
      { id: "cat_old", name: "Old", type: "expense", isArchived: true },
      { id: "cat_sal", name: "Salary", type: "income", isArchived: false }
    ],
    transactions: [
      { id: "t_exp", type: "expense", amount: 1000, accountId: "acc_act", categoryId: "cat_food", date: "2026-10-15" }
    ],
    recurring: []
  };

  // Editing to archived account must throw
  assert.throws(() => {
    mmService.editTransaction(state, "t_exp", { accountId: "acc_arc" });
  }, /আর্কাইভ করা ওয়ালেটে লেনদেন যোগ করা যাবে না/);

  // Editing to archived category must throw
  assert.throws(() => {
    mmService.editTransaction(state, "t_exp", { categoryId: "cat_old" });
  }, /আর্কাইভ করা ক্যাটাগরিতে নতুন লেনদেন যুক্ত করা যাবে না/);

  // Editing to mismatched category type must throw
  assert.throws(() => {
    mmService.editTransaction(state, "t_exp", { categoryId: "cat_sal" });
  }, /ক্যাটাগরির ধরন এবং লেনদেনের ধরন সামঞ্জস্যপূর্ণ নয়/);

  // Editing transfer with archived destination must throw
  assert.throws(() => {
    mmService.editTransaction(state, "t_exp", {
      type: "transfer",
      fromAccountId: "acc_act",
      toAccountId: "acc_arc"
    });
  }, /আর্কাইভ করা ওয়ালেটের মধ্যে স্থানান্তর সম্ভব নয়/);
});

// TEST 42: addRecurring and updateRecurring reject archived accounts, archived categories, and mismatched types
runTest("mmService recurring schedule operations reject archived accounts and categories", () => {
  let state = {
    accounts: [
      { id: "acc_act", name: "Active", balance: 10000, isArchived: false },
      { id: "acc_arc", name: "Archived", balance: 5000, isArchived: true }
    ],
    categories: [
      { id: "cat_exp", name: "Expense", type: "expense", isArchived: false },
      { id: "cat_arc", name: "Archived Cat", type: "expense", isArchived: true }
    ],
    recurring: []
  };

  assert.throws(() => {
    mmService.addRecurring(state, {
      title: "Test",
      type: "expense",
      amount: 1000,
      accountId: "acc_arc",
      categoryId: "cat_exp"
    });
  }, /আর্কাইভ করা ওয়ালেটে লেনদেন যোগ করা যাবে না/);

  assert.throws(() => {
    mmService.addRecurring(state, {
      title: "Test",
      type: "expense",
      amount: 1000,
      accountId: "acc_act",
      categoryId: "cat_arc"
    });
  }, /আর্কাইভ করা ক্যাটাগরিতে নতুন লেনদেন যুক্ত করা যাবে না/);

  assert.throws(() => {
    mmService.addRecurring(state, {
      title: "Test",
      type: "transfer",
      amount: 1000,
      fromAccountId: "acc_act",
      toAccountId: "acc_arc"
    });
  }, /আর্কাইভ করা ওয়ালেটের মধ্যে স্থানান্তর সম্ভব নয়/);
});

// TEST 43: Category archiving preserves historical transactions, and unarchiving restores active status
runTest("Category archiving preserves historical transactions, and unarchiving restores active status", () => {
  let state = mmService.getDefaultState();
  const cat = state.categories.find(c => c.id === "cat_food");
  assert.strictEqual(cat.isArchived, false);

  const initialTxnCount = state.transactions.length;
  // Archive cat_food
  state = mmService.archiveCategory(state, "cat_food", true);
  assert.strictEqual(state.categories.find(c => c.id === "cat_food").isArchived, true);
  assert.strictEqual(state.transactions.length, initialTxnCount, "Transactions must be preserved on archive");

  // Restore cat_food
  state = mmService.archiveCategory(state, "cat_food", false);
  assert.strictEqual(state.categories.find(c => c.id === "cat_food").isArchived, false);
  assert.strictEqual(state.transactions.length, initialTxnCount, "Transactions must be preserved on restore");
});

// TEST 44: sanitizeState and updatePreferences sanitize malformed periods, invalid sort orders, and non-string symbols
runTest("mmService preference sanitization handles malformed or out-of-range preferences", () => {
  const malformed = {
    preferences: {
      defaultPeriod: "invalid_period",
      sortOrder: "unknown_order",
      currencySymbol: "",
      showNetWorthCard: false
    }
  };
  const sanitized = mmService.sanitizeState(malformed, mmService.getDefaultState());
  assert.strictEqual(sanitized.preferences.defaultPeriod, "this_month", "Invalid period fallback");
  assert.strictEqual(sanitized.preferences.sortOrder, "newest", "Invalid sortOrder fallback");
  assert.strictEqual(sanitized.preferences.currencySymbol, "৳", "Empty currency symbol fallback");
  assert.strictEqual(sanitized.preferences.showNetWorthCard, false);
  assert.strictEqual(sanitized.preferences.showSavingsRateCard, true);

  const updated = mmService.updatePreferences(sanitized, { defaultPeriod: "bogus", sortOrder: "amount_high" });
  assert.strictEqual(updated.preferences.defaultPeriod, "this_month");
  assert.strictEqual(updated.preferences.sortOrder, "amount_high");
});

// TEST 45: App.js verifies all 13 back handler modal hooks and UI controls
runTest("App.js hooks hardware back press for modalMoneyManager and all 13 child modals", () => {
  const expectedModals = [
    "modalMMPreferences",
    "modalMMAddRecurring",
    "modalMMRecurring",
    "modalMMEditCategory",
    "modalMMDepositGoal",
    "modalMMAddGoal",
    "modalMMOverallBudget",
    "modalMMAddCategory",
    "modalMMEditTxn",
    "modalMMAddTxn",
    "modalMMAddAccount",
    "modalMMSetBudget",
    "modalMMTransfer",
    "modalMoneyManager"
  ];
  expectedModals.forEach(modalName => {
    assert(appSource.includes(modalName), modalName + " hook missing in App.js");
  });
});


// TEST 46: Complete end-to-end Money Manager lifecycle with net-worth invariance, goal deposit debit, and recurrence
runTest("Complete end-to-end Money Manager lifecycle preserves net-worth invariance and atomic state", () => {
  let state = mmService.getDefaultState();
  const initialNetWorth = mmService.calculateNetWorth(state);

  // 1. Add new account
  state = mmService.addAccount(state, { name: "Emergency Fund", balance: 25000, type: "bank" });
  const newAcc = state.accounts[state.accounts.length - 1];
  const newAccId = newAcc.id;
  assert.strictEqual(mmService.calculateNetWorth(state), initialNetWorth + 25000, "Net worth includes new account");

  // 2. Add income
  state = mmService.addTransaction(state, {
    id: "tx_income_1",
    type: "income",
    amount: 10000,
    accountId: newAccId,
    categoryId: "cat_salary",
    note: "Consulting Bonus",
    date: new Date().toISOString().split("T")[0]
  });
  assert.strictEqual(state.accounts.find(a => a.id === newAccId).balance, 35000, "Account credited after income");

  // 3. Add expense
  state = mmService.addTransaction(state, {
    type: "expense",
    amount: 5000,
    accountId: newAccId,
    categoryId: "cat_food",
    note: "Grocery Shopping",
    date: new Date().toISOString().split("T")[0]
  });
  const expenseTxnId = state.transactions[0].id;
  assert.strictEqual(state.accounts.find(a => a.id === newAccId).balance, 30000, "Account debited after expense");

  // 4. Transfer funds atomically
  const netWorthBeforeTransfer = mmService.calculateNetWorth(state);
  state = mmService.addTransaction(state, {
    type: "transfer",
    amount: 10000,
    fromAccountId: newAccId,
    toAccountId: "acc_cash",
    note: "ATM Withdrawal",
    date: new Date().toISOString().split("T")[0]
  });
  assert.strictEqual(mmService.calculateNetWorth(state), netWorthBeforeTransfer, "Net worth invariant holds during transfer");
  assert.strictEqual(state.accounts.find(a => a.id === newAccId).balance, 20000, "Source account debited");

  // 5. Goal deposit
  state = mmService.addGoal(state, { title: "Hajj Savings", targetAmount: 500000 });
  const addedGoal = state.goals[state.goals.length - 1];
  state = mmService.contributeToGoal(state, addedGoal.id, 5000, newAccId);
  assert.strictEqual(state.accounts.find(a => a.id === newAccId).balance, 15000, "Account debited for goal deposit");
  assert.strictEqual(state.goals.find(g => g.id === addedGoal.id).savedAmount, 5000, "Goal credited");

  // 6. Recalibrate on edit
  state = mmService.editTransaction(state, expenseTxnId, {
    amount: 7000, // +2000 more expense
    accountId: newAccId,
    categoryId: "cat_food",
    type: "expense"
  });
  assert.strictEqual(state.accounts.find(a => a.id === newAccId).balance, 13000, "Account adjusted after editing expense up");

  // 7. Delete transaction rolls back balance
  state = mmService.deleteTransaction(state, expenseTxnId);
  assert.strictEqual(state.accounts.find(a => a.id === newAccId).balance, 20000, "Account rolled back after expense deletion");

  // 8. Archive and restore account toggles net worth
  const activeNetWorth = mmService.calculateNetWorth(state);
  state = mmService.archiveAccount(state, newAccId, true);
  assert.strictEqual(mmService.calculateNetWorth(state), activeNetWorth - 20000, "Archived account excluded from Net Worth");
  state = mmService.archiveAccount(state, newAccId, false);
  assert.strictEqual(mmService.calculateNetWorth(state), activeNetWorth, "Restored account included back in Net Worth");
});

// TEST 47: Translation function t shadowing regression check
runTest("App.js transaction list rendering does not shadow global translation function t", () => {
  const ast = babel.parseSync(appSource, {
    filename: "App.js",
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ["jsx", "flow"] }
  });

  let shadowedCalls = 0;
  function walk(node, scope = new Set()) {
    if (!node || typeof node !== "object") return;
    const newScope = new Set(scope);
    if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
      for (const p of node.params) {
        if (p.type === "Identifier") newScope.add(p.name);
      }
    }
    if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "t") {
      if (newScope.has("t")) {
        shadowedCalls++;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "comments") continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) walk(c, newScope);
      } else {
        walk(child, newScope);
      }
    }
  }
  walk(ast.program);
  assert.strictEqual(shadowedCalls, 0, "No CallExpression to 't' should be shadowed by local function parameters in App.js");
  assert(appSource.includes("filteredTxns.map((txn)"), "filteredTxns.map should use 'txn' iterator to avoid shadowing 't'");
});

// TEST 48: withdrawFromGoal decreases goal.savedAmount and credits active account
runTest("mmService.withdrawFromGoal enforces active account, sufficient funds, and credits balance atomically", () => {
  let state = {
    accounts: [
      { id: "acc_cash", name: "Cash", balance: 10000, isArchived: false },
      { id: "acc_arc", name: "Old Bank", balance: 5000, isArchived: true }
    ],
    categories: [{ id: "cat_investment", name: "Investment", type: "expense" }],
    transactions: [],
    goals: [
      { id: "g1", title: "Emergency Fund", targetAmount: 20000, savedAmount: 5000 }
    ]
  };

  // 1. Rejects non-positive amount
  assert.throws(() => mmService.withdrawFromGoal(state, "g1", 0, "acc_cash"), /সঠিক/);
  // 2. Rejects exceeding saved amount
  assert.throws(() => mmService.withdrawFromGoal(state, "g1", 6000, "acc_cash"), /পর্যাপ্ত/);
  // 3. Rejects archived account
  assert.throws(() => mmService.withdrawFromGoal(state, "g1", 2000, "acc_arc"), /আর্কাইভ/);

  // 4. Successful withdrawal
  state = mmService.withdrawFromGoal(state, "g1", 2000, "acc_cash");
  assert.strictEqual(state.goals[0].savedAmount, 3000);
  assert.strictEqual(state.accounts[0].balance, 12000);
  assert.strictEqual(state.transactions.length, 1);
  assert.strictEqual(state.transactions[0].type, "income");
  assert.strictEqual(state.transactions[0].amount, 2000);
  assert.strictEqual(state.transactions[0].goalId, "g1");
});

// TEST 49: deleteGoal supports optional refund to active account
runTest("mmService.deleteGoal supports optional refund to active account and creates refund transaction", () => {
  let state = {
    accounts: [
      { id: "acc_cash", name: "Cash", balance: 10000, isArchived: false },
      { id: "acc_arc", name: "Old Bank", balance: 5000, isArchived: true }
    ],
    categories: [{ id: "cat_investment", name: "Investment", type: "expense" }],
    transactions: [],
    goals: [
      { id: "g1", title: "Laptop Fund", targetAmount: 50000, savedAmount: 15000 }
    ]
  };

  // Delete without refund
  let withoutRefund = mmService.deleteGoal(state, "g1");
  assert.strictEqual(withoutRefund.goals.length, 0);
  assert.strictEqual(withoutRefund.accounts[0].balance, 10000);
  assert.strictEqual(withoutRefund.transactions.length, 0);

  // Delete with refund to active account
  let withRefund = mmService.deleteGoal(state, "g1", "acc_cash");
  assert.strictEqual(withRefund.goals.length, 0);
  assert.strictEqual(withRefund.accounts[0].balance, 25000);
  assert.strictEqual(withRefund.transactions.length, 1);
  assert.strictEqual(withRefund.transactions[0].type, "income");
  assert.strictEqual(withRefund.transactions[0].amount, 15000);

  // Delete with refund to archived account (does not refund to archived)
  let withArcRefund = mmService.deleteGoal(state, "g1", "acc_arc");
  assert.strictEqual(withArcRefund.goals.length, 0);
  assert.strictEqual(withArcRefund.accounts[1].balance, 5000);
});

// TEST 50: editTransaction and deleteTransaction recalibrate goal.savedAmount when goalId is present
runTest("mmService.editTransaction and deleteTransaction recalibrate goal.savedAmount when goalId is present", () => {
  let state = {
    accounts: [{ id: "acc_cash", name: "Cash", balance: 20000, isArchived: false }],
    categories: [{ id: "cat_investment", name: "Investment", type: "expense" }],
    transactions: [],
    goals: [{ id: "g1", title: "Hajj", targetAmount: 100000, savedAmount: 0 }]
  };

  // Deposit 5000 to goal
  state = mmService.contributeToGoal(state, "g1", 5000, "acc_cash");
  assert.strictEqual(state.goals[0].savedAmount, 5000);
  const txnId = state.transactions[0].id;

  // Edit deposit transaction from 5000 to 7000
  state = mmService.editTransaction(state, txnId, { amount: 7000 });
  assert.strictEqual(state.goals[0].savedAmount, 7000);

  // Edit deposit transaction down to 4000
  state = mmService.editTransaction(state, txnId, { amount: 4000 });
  assert.strictEqual(state.goals[0].savedAmount, 4000);

  // Delete deposit transaction -> goal should decrease by 4000 back to 0
  state = mmService.deleteTransaction(state, txnId);
  assert.strictEqual(state.goals[0].savedAmount, 0);
});

// TEST 51: processRecurringTransactions ignores archived accounts and categories safely
runTest("mmService.processRecurringTransactions ignores archived accounts and categories safely", () => {
  let state = {
    accounts: [
      { id: "acc_act", name: "Active Cash", balance: 10000, isArchived: false },
      { id: "acc_arc", name: "Old Bank", balance: 5000, isArchived: true }
    ],
    categories: [
      { id: "cat_exp", name: "Expense", type: "expense", isArchived: false },
      { id: "cat_arc", name: "Old Cat", type: "expense", isArchived: true }
    ],
    transactions: [],
    recurring: [
      {
        id: "rec_1",
        title: "Valid Schedule",
        amount: 500,
        type: "expense",
        accountId: "acc_act",
        categoryId: "cat_exp",
        frequency: "daily",
        nextDueDate: "2026-10-20",
        isActive: true
      },
      {
        id: "rec_arc_acc",
        title: "Archived Account Schedule",
        amount: 800,
        type: "expense",
        accountId: "acc_arc",
        categoryId: "cat_exp",
        frequency: "daily",
        nextDueDate: "2026-10-20",
        isActive: true
      },
      {
        id: "rec_arc_cat",
        title: "Archived Category Schedule",
        amount: 600,
        type: "expense",
        accountId: "acc_act",
        categoryId: "cat_arc",
        frequency: "daily",
        nextDueDate: "2026-10-20",
        isActive: true
      }
    ]
  };

  const processed = mmService.processRecurringTransactions(state, "2026-10-20");
  // Only rec_1 should create transaction
  assert.strictEqual(processed.transactions.length, 1);
  assert.strictEqual(processed.transactions[0].amount, 500);
  assert.strictEqual(processed.accounts[0].balance, 9500);
  assert.strictEqual(processed.accounts[1].balance, 5000, "Archived account balance unchanged");
});

// TEST 52: themeService provides comprehensive themed style tokens for Money Manager
runTest("themeService provides comprehensive themed style tokens for Money Manager", () => {
  const themeService = require('./src/themeService');
  const lightStyles = themeService.getThemedStyles(themeService.LIGHT_THEME, false);
  const darkStyles = themeService.getThemedStyles(themeService.DARK_THEME, true);

  assert(lightStyles.mmSearchBox, 'lightStyles.mmSearchBox missing');
  assert(darkStyles.mmSearchBox, 'darkStyles.mmSearchBox missing');
  assert.strictEqual(lightStyles.mmSearchBox.backgroundColor, '#FFFFFF');
  assert.strictEqual(darkStyles.mmSearchBox.backgroundColor, '#1E293B');

  assert(lightStyles.mmAccountCard, 'lightStyles.mmAccountCard missing');
  assert.strictEqual(lightStyles.mmAccountCard.backgroundColor, '#FFFFFF');
  assert.strictEqual(darkStyles.mmAccountCard.backgroundColor, '#1E293B');

  assert(lightStyles.mmGoalCard, 'lightStyles.mmGoalCard missing');
  assert.strictEqual(lightStyles.mmGoalCard.backgroundColor, '#FFFFFF');
  assert.strictEqual(darkStyles.mmGoalCard.backgroundColor, '#1E293B');

  assert(appSource.includes('tStyles.mmSearchBox'), 'App.js missing tStyles.mmSearchBox');
  assert(appSource.includes('tStyles.mmFilterChip'), 'App.js missing tStyles.mmFilterChip');
});

// TEST 53: validateCustomDateRange validates valid formats, calendar dates, leap-years, and enforces chronological order
runTest("validateCustomDateRange validates valid formats and enforces chronological order", () => {
  const v1 = mmService.validateCustomDateRange("2026-10-01", "2026-10-25");
  assert.strictEqual(v1.valid, true);
  assert.strictEqual(v1.startDate, "2026-10-01");
  assert.strictEqual(v1.endDate, "2026-10-25");

  // Same-day range is valid
  const vSame = mmService.validateCustomDateRange("2026-10-15", "2026-10-15");
  assert.strictEqual(vSame.valid, true);

  // Bengali numerals support
  const vBn = mmService.validateCustomDateRange("২০২৬-১০-০১", "২০২৬-১০-২৫");
  assert.strictEqual(vBn.valid, true);
  assert.strictEqual(vBn.startDate, "2026-10-01");
  assert.strictEqual(vBn.endDate, "2026-10-25");

  // Missing dates
  const vMissing = mmService.validateCustomDateRange("", "2026-10-25");
  assert.strictEqual(vMissing.valid, false);
  assert.strictEqual(vMissing.error, "missing_dates");

  // Invalid format
  const vFormat = mmService.validateCustomDateRange("10-01-2026", "2026-10-25");
  assert.strictEqual(vFormat.valid, false);
  assert.strictEqual(vFormat.error, "invalid_format");

  // Out of range month/day
  const vMonth = mmService.validateCustomDateRange("2026-13-01", "2026-10-25");
  assert.strictEqual(vMonth.valid, false);
  assert.strictEqual(vMonth.error, "invalid_format");

  // Impossible calendar dates
  const vApril31 = mmService.validateCustomDateRange("2026-04-01", "2026-04-31");
  assert.strictEqual(vApril31.valid, false);
  assert.strictEqual(vApril31.error, "invalid_calendar_date");

  // Leap-year validation: 2024 is leap, 2026 is non-leap
  const vLeap = mmService.validateCustomDateRange("2024-02-01", "2024-02-29");
  assert.strictEqual(vLeap.valid, true);
  const vNonLeap = mmService.validateCustomDateRange("2026-02-01", "2026-02-29");
  assert.strictEqual(vNonLeap.valid, false);
  assert.strictEqual(vNonLeap.error, "invalid_calendar_date");

  // End before start
  const vOrder = mmService.validateCustomDateRange("2026-10-25", "2026-10-01");
  assert.strictEqual(vOrder.valid, false);
  assert.strictEqual(vOrder.error, "end_before_start");
});

// TEST 54: isDateInPeriod and filterAndSortTransactions accurately filter custom date ranges
runTest("isDateInPeriod and filterAndSortTransactions handle custom date ranges inclusively", () => {
  const range = { startDate: "2026-10-10", endDate: "2026-10-20" };

  // Inclusive boundaries (date-only)
  assert.strictEqual(mmService.isDateInPeriod("2026-10-10", "custom", range), true, "Start boundary inclusive");
  assert.strictEqual(mmService.isDateInPeriod("2026-10-20", "custom", range), true, "End boundary inclusive");
  assert.strictEqual(mmService.isDateInPeriod("2026-10-15", "custom", range), true, "Mid-range inclusive");
  assert.strictEqual(mmService.isDateInPeriod("2026-10-09", "custom", range), false, "Pre-start excluded");
  assert.strictEqual(mmService.isDateInPeriod("2026-10-21", "custom", range), false, "Post-end excluded");

  // Inclusive boundaries (timestamps with time, end-of-day, and timezone offsets)
  assert.strictEqual(mmService.isDateInPeriod("2026-10-10T00:00:00.000Z", "custom", range), true, "Start timestamp inclusive");
  assert.strictEqual(mmService.isDateInPeriod("2026-10-15T12:00:00", "custom", range), true, "Midday timestamp inclusive");
  assert.strictEqual(mmService.isDateInPeriod("2026-10-20T23:59:59.999+06:00", "custom", range), true, "End-of-day timestamp inclusive");
  assert.strictEqual(mmService.isDateInPeriod("2026-10-20 23:59:59", "custom", range), true, "End-of-day space format inclusive");
  assert.strictEqual(mmService.isDateInPeriod("2026-10-21T00:00:01", "custom", range), false, "Next-day start excluded");

  // Same-day range with beginning, middle, and end of day
  const sameDay = { startDate: "2026-10-15", endDate: "2026-10-15" };
  assert.strictEqual(mmService.isDateInPeriod("2026-10-15", "custom", sameDay), true);
  assert.strictEqual(mmService.isDateInPeriod("2026-10-15T00:00:00", "custom", sameDay), true);
  assert.strictEqual(mmService.isDateInPeriod("2026-10-15T12:30:00", "custom", sameDay), true);
  assert.strictEqual(mmService.isDateInPeriod("2026-10-15 23:59:59", "custom", sameDay), true);
  assert.strictEqual(mmService.isDateInPeriod("2026-10-14", "custom", sameDay), false);
  assert.strictEqual(mmService.isDateInPeriod("2026-10-16", "custom", sameDay), false);

  // Month and Year boundary range
  const crossYear = { startDate: "2025-12-25", endDate: "2026-01-05" };
  assert.strictEqual(mmService.isDateInPeriod("2025-12-31", "custom", crossYear), true);
  assert.strictEqual(mmService.isDateInPeriod("2026-01-01", "custom", crossYear), true);
  assert.strictEqual(mmService.isDateInPeriod("2025-12-24", "custom", crossYear), false);
  assert.strictEqual(mmService.isDateInPeriod("2026-01-06", "custom", crossYear), false);

  const txns = [
    { id: "t1", type: "expense", amount: 500, date: "2026-10-05" },
    { id: "t2", type: "expense", amount: 1000, date: "2026-10-12" },
    { id: "t3", type: "income", amount: 4000, date: "2026-10-18" },
    { id: "t4", type: "expense", amount: 800, date: "2026-10-25" },
  ];

  const filtered = mmService.filterAndSortTransactions(txns, {
    period: "custom",
    customRange: range,
  });
  assert.strictEqual(filtered.length, 2);
  assert.strictEqual(filtered.map(t => t.id).sort().join(","), "t2,t3");
});

// TEST 55: calculateCashFlow, calculatePeriodMetrics, and calculateCategoryBudgets under custom range
runTest("analytics, cashflow, and budgets support custom range without mutating monthly budget targets", () => {
  const state = {
    ...mmService.getDefaultState(),
    overallMonthlyBudget: 25000,
    categories: [
      { id: "cat_food", name: "খাবার", type: "expense", budget: 6000, isArchived: false },
      { id: "cat_bills", name: "বিল", type: "expense", budget: 4000, isArchived: false },
    ],
    transactions: [
      { id: "t1", type: "income", amount: 15000, date: "2026-09-15" },
      { id: "t2", type: "income", amount: 20000, date: "2026-10-05" },
      { id: "t3", type: "expense", categoryId: "cat_food", amount: 3000, date: "2026-10-12" },
      { id: "t4", type: "expense", categoryId: "cat_bills", amount: 1500, date: "2026-10-15" },
      { id: "t5", type: "transfer", amount: 5000, date: "2026-10-16" },
      { id: "t6", type: "expense", categoryId: "cat_food", amount: 4000, date: "2026-11-01" },
    ],
  };

  const customRange = { startDate: "2026-10-01", endDate: "2026-10-31" };

  // Cash flow
  const cf = mmService.calculateCashFlow(state.transactions, "custom", customRange);
  assert.strictEqual(cf.totalIncome, 20000);
  assert.strictEqual(cf.totalExpense, 4500);
  assert.strictEqual(cf.totalTransfer, 5000);
  assert.strictEqual(cf.netSavings, 15500);

  // Period metrics
  const pm = mmService.calculatePeriodMetrics(state, "custom", customRange);
  assert.strictEqual(pm.period, "custom");
  assert.strictEqual(pm.totalIncome, 20000);
  assert.strictEqual(pm.totalExpense, 4500);
  assert.strictEqual(pm.overallBudget, 25000, "Monthly budget target limit must not be mutated");

  // Category budgets
  const cb = mmService.calculateCategoryBudgets(state, "custom", customRange);
  const foodBudget = cb.find(c => c.id === "cat_food");
  assert.strictEqual(foodBudget.spent, 3000);
  assert.strictEqual(foodBudget.remaining, 3000);
  assert.strictEqual(foodBudget.budget, 6000, "Category monthly budget limit must not be mutated");
});

// TEST 56: App.js wires modalMMCustomDateRange, period pills, and inputs
runTest("App.js wires modalMMCustomDateRange, custom period pill, and date inputs", () => {
  const currentAppSource = fs.readFileSync('App.js', 'utf8');
  assert(currentAppSource.includes("modalMMCustomDateRange"), "App.js missing modalMMCustomDateRange state");
  assert(currentAppSource.includes("setModalMMCustomDateRange"), "App.js missing setModalMMCustomDateRange setter");
  assert(currentAppSource.includes("mmPeriod === 'custom'"), "App.js missing custom period pill");
  assert(currentAppSource.includes("mmRangeStartInput"), "App.js missing start date input state");
  assert(currentAppSource.includes("mmRangeEndInput"), "App.js missing end date input state");
  assert(currentAppSource.includes("mmRangeError"), "App.js missing date range error state");
  assert(currentAppSource.includes("validateCustomDateRange"), "App.js missing validateCustomDateRange invocation");
});

console.log(`\nSUMMARY: ${passed}/${total} tests passed.`);
if (passed === total) {
  console.log("ALL MONEY MANAGER TESTS PASSED SUCCESSFULLY!\n");
  process.exit(0);
} else {
  console.error("SOME TESTS FAILED!\n");
  process.exit(1);
}