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
  babel.parseSync(appSource, {
    filename: "App.js",
    presets: ["babel-preset-expo"]
  });
});

// TEST 2: Home grid QR Code replaced with Money Manager
runTest("Home screen quick action grid has Money Manager with 3D icon and opens modalMoneyManager", () => {
  assert(appSource.includes("grid_money_manager.png"), "Missing grid_money_manager.png reference in App.js");
  assert(appSource.includes("setModalMoneyManager(true)"), "Missing setModalMoneyManager(true) handler");
  assert(appSource.includes("accessibilityLabel=\"মানি ম্যানেজার\""), "Missing accessibilityLabel for Money Manager grid item");
  assert(appSource.includes("<Text style={styles.quickGridLabel}>মানি ম্যানেজার</Text>"), "Missing Bengali label in quick grid");
  
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

console.log(`\nSUMMARY: ${passed}/${total} tests passed.`);
if (passed === total) {
  console.log("ALL MONEY MANAGER TESTS PASSED SUCCESSFULLY!\n");
  process.exit(0);
} else {
  console.error("SOME TESTS FAILED!\n");
  process.exit(1);
}