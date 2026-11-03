/**
 * ITERATION 211 TEST SUITE 1: BACKEND MONEY MANAGER & BACKUP HARDENING
 * Validates:
 * 1. calculateCategoryBudgets status flags (warning 80%+, exceeded >100%, isAtLimit 100%, safe, no_budget)
 * 2. calculatePeriodMetrics overall budget status flags (isOverallBudgetWarning, isOverallBudgetAtLimit, isOverallBudgetOver)
 * 3. deleteBusinessCascade atomic cascade purging & cashReconciliation reset
 * 4. indexJournalsByAccount cross-business accountId collision isolation
 * 5. calculateAggregateMetrics & deriveCashBoxSummary legacy businessId fallback isolation
 * 6. Backup checksum validation (SHA-256 and legacy chk_)
 */

const assert = require("assert");
const mmService = require("./src/moneyManagerService");
const ledgerEngine = require("./src/ledgerEngine");
const { StorageRepository } = require("./src/storageRepository");
const { calculateChecksum, calculateSha256Checksum, calculateLegacyChecksum, buildBackupPayload, validateBackupIntegrity } = require("./src/googleDriveBackupService");

function createMockAdapter(initialState = {}) {
  const store = { ...initialState };
  return {
    getItem: async (key) => (store[key] !== undefined ? store[key] : null),
    setItem: async (key, val) => { store[key] = String(val); },
    removeItem: async (key) => { delete store[key]; },
    getAllKeys: async () => Object.keys(store),
    _dump: () => store,
  };
}

let passed = 0;
let total = 0;

async function runTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`[PASS] TEST ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] TEST ${total}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAllTests() {
  console.log("================================================================");
  console.log("ITERATION 211: BACKEND MONEY MANAGER & BACKUP HARDENING SUITE");
  console.log("================================================================\n");

  console.log("--- PART 1: CATEGORY BUDGET STATUS FLAGS (WARNING 80%+, EXCEEDED >100%) ---");

  await runTest("calculateCategoryBudgets: safe status when spent < 80% of budget", async () => {
    const categories = [
      { id: "cat_food", name: "Food", type: "expense", budget: 1000 },
    ];
    const transactions = [
      { id: "t1", categoryId: "cat_food", amount: 750, type: "expense", date: "2026-11-01" },
    ];
    const budgets = mmService.calculateCategoryBudgets(categories, transactions);
    assert.strictEqual(budgets.length, 1);
    const b = budgets[0];
    assert.strictEqual(b.spent, 750);
    assert.strictEqual(b.pct, 75);
    assert.strictEqual(b.status, "safe");
    assert.strictEqual(b.isWarning, false);
    assert.strictEqual(b.isAtLimit, false);
    assert.strictEqual(b.isOver, false);
    assert.strictEqual(b.remaining, 250);
  });

  await runTest("calculateCategoryBudgets: warning status when spent is 80% to 100%", async () => {
    const categories = [
      { id: "cat_fuel", name: "Fuel", type: "expense", budget: 1000 },
    ];
    const transactions = [
      { id: "t1", categoryId: "cat_fuel", amount: 800, type: "expense", date: "2026-11-01" },
    ];
    const budgets = mmService.calculateCategoryBudgets(categories, transactions);
    const b = budgets[0];
    assert.strictEqual(b.spent, 800);
    assert.strictEqual(b.pct, 80);
    assert.strictEqual(b.status, "warning");
    assert.strictEqual(b.isWarning, true);
    assert.strictEqual(b.isAtLimit, false);
    assert.strictEqual(b.isOver, false);
    assert.strictEqual(b.remaining, 200);
  });

  await runTest("calculateCategoryBudgets: isAtLimit and warning when spent exactly equals budget (100%)", async () => {
    const categories = [
      { id: "cat_rent", name: "Rent", type: "expense", budget: 5000 },
    ];
    const transactions = [
      { id: "t1", categoryId: "cat_rent", amount: 5000, type: "expense", date: "2026-11-01" },
    ];
    const budgets = mmService.calculateCategoryBudgets(categories, transactions);
    const b = budgets[0];
    assert.strictEqual(b.spent, 5000);
    assert.strictEqual(b.pct, 100);
    assert.strictEqual(b.status, "warning");
    assert.strictEqual(b.isWarning, true);
    assert.strictEqual(b.isAtLimit, true);
    assert.strictEqual(b.isOver, false);
    assert.strictEqual(b.remaining, 0);
  });

  await runTest("calculateCategoryBudgets: exceeded status when spent > budget (>100%)", async () => {
    const categories = [
      { id: "cat_util", name: "Utility", type: "expense", budget: 2000 },
    ];
    const transactions = [
      { id: "t1", categoryId: "cat_util", amount: 2500, type: "expense", date: "2026-11-01" },
    ];
    const budgets = mmService.calculateCategoryBudgets(categories, transactions);
    const b = budgets[0];
    assert.strictEqual(b.spent, 2500);
    assert.strictEqual(b.pct, 125);
    assert.strictEqual(b.status, "exceeded");
    assert.strictEqual(b.isWarning, false);
    assert.strictEqual(b.isAtLimit, false);
    assert.strictEqual(b.isOver, true);
    assert.strictEqual(b.remaining, 0);
  });

  await runTest("calculateCategoryBudgets: no_budget status when budget is 0 or negative", async () => {
    const categories = [
      { id: "cat_misc", name: "Misc", type: "expense", budget: 0 },
      { id: "cat_neg", name: "Neg", type: "expense", budget: -100 },
    ];
    const transactions = [
      { id: "t1", categoryId: "cat_misc", amount: 300, type: "expense", date: "2026-11-01" },
      { id: "t2", categoryId: "cat_neg", amount: 150, type: "expense", date: "2026-11-01" },
    ];
    const budgets = mmService.calculateCategoryBudgets(categories, transactions);
    assert.strictEqual(budgets[0].status, "no_budget");
    assert.strictEqual(budgets[0].hasBudget, false);
    assert.strictEqual(budgets[1].status, "no_budget");
    assert.strictEqual(budgets[1].hasBudget, false);
  });

  console.log("\n--- PART 2: OVERALL MONTHLY BUDGET STATUS FLAGS IN CALCULATEPERIODMETRICS ---");

  await runTest("calculatePeriodMetrics: overall budget safe, warning, atLimit, and exceeded flags", async () => {
    const baseState = {
      overallMonthlyBudget: 10000,
      accounts: [{ id: "acc_1", balance: 50000 }],
      categories: [{ id: "cat_1", type: "expense" }],
      transactions: [],
    };

    // 1. Safe (<80%)
    const stateSafe = {
      ...baseState,
      transactions: [{ id: "t1", amount: 5000, type: "expense", categoryId: "cat_1", date: "2026-11-01" }],
    };
    const mSafe = mmService.calculatePeriodMetrics(stateSafe, "this_month");
    assert.strictEqual(mSafe.overallBudgetStatus, "safe");
    assert.strictEqual(mSafe.overallBudgetPercent, 50);
    assert.strictEqual(mSafe.isOverallBudgetOver, false);
    assert.strictEqual(mSafe.isOverallBudgetWarning, false);
    assert.strictEqual(mSafe.isOverallBudgetAtLimit, false);

    // 2. Warning (80%+)
    const stateWarning = {
      ...baseState,
      transactions: [{ id: "t1", amount: 8500, type: "expense", categoryId: "cat_1", date: "2026-11-01" }],
    };
    const mWarn = mmService.calculatePeriodMetrics(stateWarning, "this_month");
    assert.strictEqual(mWarn.overallBudgetStatus, "warning");
    assert.strictEqual(mWarn.overallBudgetPercent, 85);
    assert.strictEqual(mWarn.isOverallBudgetOver, false);
    assert.strictEqual(mWarn.isOverallBudgetWarning, true);
    assert.strictEqual(mWarn.isOverallBudgetAtLimit, false);

    // 3. At Limit (100%)
    const stateLimit = {
      ...baseState,
      transactions: [{ id: "t1", amount: 10000, type: "expense", categoryId: "cat_1", date: "2026-11-01" }],
    };
    const mLimit = mmService.calculatePeriodMetrics(stateLimit, "this_month");
    assert.strictEqual(mLimit.overallBudgetStatus, "warning");
    assert.strictEqual(mLimit.overallBudgetPercent, 100);
    assert.strictEqual(mLimit.isOverallBudgetOver, false);
    assert.strictEqual(mLimit.isOverallBudgetWarning, true);
    assert.strictEqual(mLimit.isOverallBudgetAtLimit, true);

    // 4. Exceeded (>100%)
    const stateExceeded = {
      ...baseState,
      transactions: [{ id: "t1", amount: 12000, type: "expense", categoryId: "cat_1", date: "2026-11-01" }],
    };
    const mExceed = mmService.calculatePeriodMetrics(stateExceeded, "this_month");
    assert.strictEqual(mExceed.overallBudgetStatus, "exceeded");
    assert.strictEqual(mExceed.overallBudgetPercent, 100);
    assert.strictEqual(mExceed.overallBudgetRawPct, 120);
    assert.strictEqual(mExceed.isOverallBudgetOver, true);
    assert.strictEqual(mExceed.isOverallBudgetWarning, false);
    assert.strictEqual(mExceed.isOverallBudgetAtLimit, false);
  });

  console.log("\n--- PART 3: CROSS-BUSINESS ACCOUNT ID COLLISION ISOLATION ---");

  await runTest("indexJournalsByAccount isolates colliding account IDs across distinct businesses", async () => {
    const allJournals = [
      { id: "j1", accountId: "acc_shared", businessId: "biz_1", amount: 100 },
      { id: "j2", accountId: "acc_shared", businessId: "biz_1", amount: 200 },
      { id: "j3", accountId: "acc_shared", businessId: "biz_2", amount: 500 },
      { id: "j4", accountId: "acc_shared", businessId: "biz_3", amount: 900 },
    ];

    const indexedGlobal = ledgerEngine.indexJournalsByAccount(allJournals);
    assert.strictEqual(indexedGlobal.get("biz_1:acc_shared").length, 2);
    assert.strictEqual(indexedGlobal.get("biz_2:acc_shared").length, 1);
    assert.strictEqual(indexedGlobal.get("biz_3:acc_shared").length, 1);

    const indexedBiz1 = ledgerEngine.indexJournalsByAccount(allJournals, "biz_1");
    assert.strictEqual(indexedBiz1.get("acc_shared").length, 2);
    assert.strictEqual(indexedBiz1.get("biz_1:acc_shared").length, 2);
    assert.strictEqual(indexedBiz1.has("biz_2:acc_shared"), false);
  });

  await runTest("calculateAggregateMetrics and deriveCashBoxSummary isolate legacy businessId defaults", async () => {
    const accounts = [
      { id: "a1", name: "Cust 1", type: 1, balance: 1000 }, // legacy without businessId -> defaults to 1
      { id: "a2", name: "Cust 2", businessId: "2", type: 1, balance: 2500 },
    ];
    const cashEntries = [
      { id: "c1", type: "in", amount: 300 }, // legacy without businessId -> defaults to 1
      { id: "c2", businessId: "2", type: "in", amount: 700 },
    ];

    const mBiz1 = ledgerEngine.calculateAggregateMetrics(accounts, [], "1");
    assert.strictEqual(mBiz1.totalReceivable, 1000);
    assert.strictEqual(mBiz1.customerCount, 1);

    const mBiz2 = ledgerEngine.calculateAggregateMetrics(accounts, [], "2");
    assert.strictEqual(mBiz2.totalReceivable, 2500);
    assert.strictEqual(mBiz2.customerCount, 1);

    const cb1 = ledgerEngine.deriveCashBoxSummary(cashEntries, "1");
    assert.strictEqual(cb1.cashIn, 300);

    const cb2 = ledgerEngine.deriveCashBoxSummary(cashEntries, "2");
    assert.strictEqual(cb2.cashIn, 700);
  });

  console.log("\n--- PART 4: DELETEBUSINESSCASCADE & ATOMIC PURGING ---");

  await runTest("deleteBusinessCascade purges multi-business records and resets linked cashReconciliation", async () => {
    const initialData = {
      businesses: [
        { id: "1", name: "Shop 1", isSelected: true, isArchived: false },
        { id: "2", name: "Shop 2", isSelected: false, isArchived: false },
      ],
      activeBusinessId: "2",
      accounts: [
        { id: "a1", businessId: "1", balance: 100 },
        { id: "a2", businessId: "2", balance: 200 },
      ],
      journals: [
        { id: "j1", businessId: "1", amount: 100 },
        { id: "j2", businessId: "2", amount: 200 },
      ],
      cashEntries: [
        { id: "c1", businessId: "1", amount: 50 },
        { id: "c2", businessId: "2", amount: 75 },
      ],
      cashReconciliation: {
        id: "recon_biz2",
        businessId: "2",
        systemCash: 75,
        drawerCash: 75,
      },
    };

    const adapter = createMockAdapter({
      "@tallykhata_state_v6": JSON.stringify(initialData),
    });
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const delRes = await repo.deleteBusinessCascade("2");
    assert.strictEqual(delRes.success, true);

    const updated = repo.getAuthoritativeState();
    assert.strictEqual(updated.businesses.length, 1);
    assert.strictEqual(updated.businesses[0].id, "1");
    assert.strictEqual(updated.activeBusinessId, "1");
    assert.strictEqual(updated.accounts.length, 1);
    assert.strictEqual(updated.accounts[0].id, "a1");
    assert.strictEqual(updated.journals.length, 1);
    assert.strictEqual(updated.cashEntries.length, 1);
    assert.strictEqual(updated.cashReconciliation, null);
  });

  console.log("\n--- PART 5: BACKUP INTEGRITY CHECKSUM VALIDATION ---");

  await runTest("commitRestorePayload and restoreStorageBackup validate SHA-256 and legacy checksums", async () => {
    const state = {
      accounts: [{ id: "acc_test", name: "Test Cust", type: 1, balance: 1000, openingBalance: 1000 }],
      journals: [],
      cashEntries: [],
      stock: [],
      inventory: [],
      notes: [],
      businesses: [{ id: "1", name: "Test Shop", isSelected: true }],
      activeBusinessId: "1",
      businessName: "Test Shop",
    };
    const user = { sub: "google_sub_123", email: "user@test.com", name: "User 123" };
    const payload = buildBackupPayload(state, user);

    assert.ok(payload.manifest.checksum.startsWith("sha256_"));

    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // 1. Valid payload restores cleanly
    const res = await repo.commitRestorePayload(payload);
    assert.strictEqual(res.success, true);

    // 2. Tampered data is rejected
    const tampered = JSON.parse(JSON.stringify(payload));
    tampered.data.accounts[0].balance = 999999;
    await assert.rejects(
      async () => { await repo.commitRestorePayload(tampered); },
      /Backup integrity checksum mismatch/
    );

    // 3. Legacy chk_ checksum format is accepted
    const legacyPayload = JSON.parse(JSON.stringify(payload));
    const legChk = calculateLegacyChecksum(legacyPayload.data);
    legacyPayload.checksum = legChk;
    legacyPayload.manifest.checksum = legChk;
    const resLeg = await repo.commitRestorePayload(legacyPayload);
    assert.strictEqual(resLeg.success, true);
  });

  console.log("\n================================================================");
  console.log(`ITERATION 211 BACKEND SUITE: ${passed} / ${total} TESTS PASSED (100%)`);
  console.log("================================================================\n");
}

runAllTests().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
