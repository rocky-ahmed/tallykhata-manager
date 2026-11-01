/**
 * test_iteration_022_edge_case_hardening.js
 * Continuous Verification Suite for Iteration 022: Edge-Case Hardening & Autonomous Monitoring
 *
 * Covers:
 * 1. Extreme Financial Calculation Vectors & Integer-Paisa Precision (up to ৳99,999,999.99).
 * 2. Category & Overall Budget Status Flags (safe, warning, exceeded, no_budget).
 * 3. Cross-Business accountId Collision Isolation in ledgerEngine & storageRepository.
 * 4. High-Concurrency Mutex Unpoisoning & Error Recovery under aborted writes.
 * 5. deleteBusinessCascade with Cloud Backup Checksum Validation.
 *
 * Worker Roles:
 * - Worker 1 (Gibbs): Thread ID 01a19154-99ab-72a0-9e23-2611b9ffc74c (REA Evidence Review)
 * - Worker 2 (Averroes): Thread ID 01a19154-c135-75d0-b38a-1ea50f004895 (Backend & Storage Hardening)
 * - Worker 3 (Ohm): Thread ID 01a19154-e3ee-7ab2-b682-798b64a0bb6b (QA & Edge-Case Verification)
 */

const assert = require("assert");
const ledgerEngine = require("./src/ledgerEngine");
const mmService = require("./src/moneyManagerService");
const { StorageRepository, createDefaultState } = require("./src/storageRepository");
const { buildBackupPayload, validateBackupIntegrity } = require("./src/googleDriveBackupService");

console.log("================================================================");
console.log("TALLYKHATA ITERATION 022: EDGE-CASE HARDENING & AUDIT SUITE");
console.log("================================================================\n");

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log("[PASS] TEST " + totalTests + ": " + name);
    passedTests++;
  } catch (err) {
    console.error("[FAIL] TEST " + totalTests + ": " + name);
    console.error(err);
    process.exit(1);
  }
}

function createMockAdapter(initialData = null) {
  const store = new Map();
  if (initialData) {
    store.set(ledgerEngine.V6_KEY, JSON.stringify(initialData));
    store.set("tallykhata_v6_store", JSON.stringify(initialData));
  }
  return {
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, val) => { store.set(key, String(val)); },
    removeItem: async (key) => { store.delete(key); },
    clear: async () => { store.clear(); },
    _map: store,
  };
}

(async function main() {

  // =========================================================================
  // PART 1: Extreme Financial Vectors & Integer Paisa Arithmetic
  // =========================================================================
  await runTest("Extreme financial amounts up to ৳99,999,999.99 preserve 0-drift integer paisa balance", async () => {
    const acc = { id: "acc_extreme_01", businessId: "1", type: 1, openingBalance: 0 };
    const journals = [
      { id: "j_ext_1", accountId: "acc_extreme_01", businessId: "1", amount: 99999999.99, type: "given", date: "2026-11-01" },
      { id: "j_ext_2", accountId: "acc_extreme_01", businessId: "1", amount: 49999999.99, type: "received", date: "2026-11-02" },
    ];

    const result = ledgerEngine.recalculateAccountRunningBalances(acc, journals);
    assert.strictEqual(result.updatedAccount.balance, 50000000); // 99999999.99 - 49999999.99 = 50000000.00
    // accountJournals is returned newest-first for UI consumption
    assert.strictEqual(result.accountJournals[0].runningBalance, 50000000); // 2026-11-02 (newest)
    assert.strictEqual(result.accountJournals[1].runningBalance, 99999999.99); // 2026-11-01 (oldest)

    // Negative / zero amount rejection in ledgerEngine.validateTransaction
    const valNeg = ledgerEngine.validateTransaction({ accountId: "acc1", amount: -100, type: "given" });
    assert.strictEqual(valNeg.valid, false);
    assert.ok(valNeg.error.includes("শূন্য"));

    const valZero = ledgerEngine.validateTransaction({ accountId: "acc1", amount: 0, type: "given" });
    assert.strictEqual(valZero.valid, false);
    assert.ok(valZero.error.includes("শূন্য"));

    // Negative / zero amount rejection in mmService.addTransaction
    assert.throws(() => {
      mmService.addTransaction({ accounts: [{ id: "acc1", balance: 500 }] }, { type: "expense", amount: -100, accountId: "acc1" });
    }, /ইতিবাচক/);
  });

  // =========================================================================
  // PART 2: Budget Threshold Status Flags (safe, warning, exceeded, no_budget)
  // =========================================================================
  await runTest("Category and Overall Monthly Budget status flags correctly classify thresholds", async () => {
    const categories = [
      { id: "c_safe", name: "Safe Cat", type: "expense", budget: 1000 },
      { id: "c_warn", name: "Warning Cat", type: "expense", budget: 1000 },
      { id: "c_limit", name: "At Limit Cat", type: "expense", budget: 1000 },
      { id: "c_over", name: "Exceeded Cat", type: "expense", budget: 1000 },
      { id: "c_nobudget", name: "No Budget Cat", type: "expense", budget: 0 },
    ];

    const today = mmService.getLocalDateString();
    const transactions = [
      { type: "expense", categoryId: "c_safe", amount: 750, date: today },       // 75% -> safe (<80%)
      { type: "expense", categoryId: "c_warn", amount: 800, date: today },       // 80% -> warning (80-100%)
      { type: "expense", categoryId: "c_limit", amount: 1000, date: today },     // 100% -> warning, isAtLimit
      { type: "expense", categoryId: "c_over", amount: 1050, date: today },      // 105% -> exceeded (>100%)
      { type: "expense", categoryId: "c_nobudget", amount: 300, date: today },   // no_budget
    ];

    const catBudgets = mmService.calculateCategoryBudgets(categories, transactions, "this_month");
    const bSafe = catBudgets.find(b => b.id === "c_safe");
    const bWarn = catBudgets.find(b => b.id === "c_warn");
    const bLimit = catBudgets.find(b => b.id === "c_limit");
    const bOver = catBudgets.find(b => b.id === "c_over");
    const bNoBudget = catBudgets.find(b => b.id === "c_nobudget");

    assert.strictEqual(bSafe.status, "safe");
    assert.strictEqual(bSafe.isWarning, false);
    assert.strictEqual(bSafe.isOver, false);

    assert.strictEqual(bWarn.status, "warning");
    assert.strictEqual(bWarn.isWarning, true);
    assert.strictEqual(bWarn.isOver, false);

    assert.strictEqual(bLimit.status, "warning");
    assert.strictEqual(bLimit.isWarning, true);
    assert.strictEqual(bLimit.isAtLimit, true);
    assert.strictEqual(bLimit.isOver, false);

    assert.strictEqual(bOver.status, "exceeded");
    assert.strictEqual(bOver.isOver, true);
    assert.strictEqual(bOver.remaining, 0);

    assert.strictEqual(bNoBudget.status, "no_budget");

    // Test overallMonthlyBudget in calculatePeriodMetrics
    const stateSafe = {
      overallMonthlyBudget: 5000,
      accounts: [{ id: "acc1", balance: 10000 }],
      categories,
      transactions: [{ type: "expense", categoryId: "c_safe", amount: 3500, date: today }],
    };
    const mSafe = mmService.calculatePeriodMetrics(stateSafe, "this_month");
    assert.strictEqual(mSafe.overallBudgetStatus, "safe"); // 3500 / 5000 = 70%
    assert.strictEqual(mSafe.overallBudgetRemaining, 1500);

    const stateWarn = {
      overallMonthlyBudget: 5000,
      accounts: [{ id: "acc1", balance: 10000 }],
      categories,
      transactions: [{ type: "expense", categoryId: "c_warn", amount: 4200, date: today }],
    };
    const mWarn = mmService.calculatePeriodMetrics(stateWarn, "this_month");
    assert.strictEqual(mWarn.overallBudgetStatus, "warning"); // 4200 / 5000 = 84%

    const stateOver = {
      overallMonthlyBudget: 5000,
      accounts: [{ id: "acc1", balance: 10000 }],
      categories,
      transactions: [{ type: "expense", categoryId: "c_over", amount: 6000, date: today }],
    };
    const mOver = mmService.calculatePeriodMetrics(stateOver, "this_month");
    assert.strictEqual(mOver.overallBudgetStatus, "exceeded"); // 6000 / 5000 = 120%
    assert.strictEqual(mOver.isOverallBudgetOver, true);
    assert.strictEqual(mOver.overallBudgetRemaining, 0);
    assert.strictEqual(mOver.overallBudgetPercent, 100); // clamped
    assert.strictEqual(mOver.overallBudgetRawPct, 120);   // raw percentage
  });

  // =========================================================================
  // PART 3: Cross-Business accountId Collision Isolation
  // =========================================================================
  await runTest("Cross-business accountId collision isolation ensures zero journal or balance cross-talk", async () => {
    const acc1 = { id: "cust_coll_01", businessId: "1", type: 1, openingBalance: 1500 };
    const acc2 = { id: "cust_coll_01", businessId: "2", type: 1, openingBalance: 2500 };

    const journals = [
      { id: "j_coll_1", accountId: "cust_coll_01", businessId: "1", amount: 500, type: "given", date: "2026-11-01" },
      { id: "j_coll_2", accountId: "cust_coll_01", businessId: "2", amount: 800, type: "received", date: "2026-11-01" },
      { id: "j_coll_3", accountId: "cust_coll_01", businessId: "1", amount: 300, type: "received", date: "2026-11-02" },
    ];

    // Recalculate Business 1
    const resBiz1 = ledgerEngine.recalculateAccountRunningBalances(acc1, journals);
    assert.strictEqual(resBiz1.accountJournals.length, 2);
    assert.strictEqual(resBiz1.updatedAccount.balance, 1700); // 1500 + 500 - 300 = 1700

    // Recalculate Business 2
    const resBiz2 = ledgerEngine.recalculateAccountRunningBalances(acc2, journals);
    assert.strictEqual(resBiz2.accountJournals.length, 1);
    assert.strictEqual(resBiz2.updatedAccount.balance, 1700); // 2500 - 800 = 1700

    // Batch recalculation across all accounts
    const batchRes = ledgerEngine.recalculateAllAccountBalances([acc1, acc2], journals);
    const updatedAcc1 = batchRes.updatedAccounts.find(a => String(a.businessId) === "1");
    const updatedAcc2 = batchRes.updatedAccounts.find(a => String(a.businessId) === "2");
    assert.strictEqual(updatedAcc1.balance, 1700);
    assert.strictEqual(updatedAcc2.balance, 1700);
  });

  // =========================================================================
  // PART 4: Mutex Unpoisoning & Error Recovery
  // =========================================================================
  await runTest("StorageRepository writeQueue recovers and unpoisons queue after an aborted write", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    // 1. Enqueue an operation that intentionally rejects
    let errorCaught = false;
    try {
      await repo.enqueueWrite(async () => {
        throw new Error("Simulated storage write fault");
      });
    } catch (err) {
      errorCaught = true;
      assert.strictEqual(err.message, "Simulated storage write fault");
    }
    assert.strictEqual(errorCaught, true, "First aborted write error must be caught");

    // 2. Verify writeQueue is unpoisoned: subsequent writes succeed without deadlock
    const successRes = await repo.enqueueWrite(async () => {
      return { status: "recovered_ok" };
    });
    assert.strictEqual(successRes.status, "recovered_ok");

    // 3. Verify store mutation succeeds cleanly after fault
    const mutateRes = await repo.mutateStore((prev) => ({
      ...prev,
      businessName: "Post-Recovery Shop",
    }));
    assert.strictEqual(mutateRes.success, true);
    assert.strictEqual(repo.getAuthoritativeState().businessName, "Post-Recovery Shop");
  });

  // =========================================================================
  // PART 5: deleteBusinessCascade & Backup Checksum Integrity
  // =========================================================================
  await runTest("deleteBusinessCascade purges multi-business records and maintains valid backup checksum", async () => {
    const multiBizState = {
      ...createDefaultState(),
      businesses: [
        { id: "1", name: "Main Shop", isSelected: true, isArchived: false },
        { id: "2", name: "Secondary Branch", isSelected: false, isArchived: false },
      ],
      activeBusinessId: "2",
      accounts: [
        { id: "a_biz1", businessId: "1", name: "Customer 1", balance: 500 },
        { id: "a_biz2", businessId: "2", name: "Customer 2", balance: 800 },
      ],
      journals: [
        { id: "j_biz1", businessId: "1", accountId: "a_biz1", amount: 500, type: "given" },
        { id: "j_biz2", businessId: "2", accountId: "a_biz2", amount: 800, type: "given" },
      ],
      cashEntries: [
        { id: "c_biz1", businessId: "1", amount: 150 },
        { id: "c_biz2", businessId: "2", amount: 250 },
      ],
    };

    const repo = new StorageRepository(createMockAdapter(multiBizState));
    await repo.loadInitialData();

    // Cascade delete business 2
    const delResult = await repo.deleteBusinessCascade("2");
    assert.strictEqual(delResult.success, true);

    const postState = repo.getAuthoritativeState();
    assert.strictEqual(postState.businesses.length, 1);
    assert.strictEqual(postState.businesses[0].id, "1");
    assert.strictEqual(postState.activeBusinessId, "1");

    // Ensure all business 2 sub-records were purged
    assert.strictEqual(postState.accounts.some(a => String(a.businessId) === "2"), false);
    assert.strictEqual(postState.journals.some(j => String(j.businessId) === "2"), false);
    assert.strictEqual(postState.cashEntries.some(c => String(c.businessId) === "2"), false);

    // Build backup payload and validate SHA-256 checksum
    const userProfile = { sub: "google_user_999", email: "user@tallykhata.test", name: "Test User" };
    const backupPayload = buildBackupPayload(postState, userProfile);
    assert.ok(backupPayload.manifest.checksum.startsWith("sha256_"));

    const integrity = validateBackupIntegrity(backupPayload, "google_user_999");
    assert.strictEqual(integrity.valid, true);
    assert.ok(integrity.manifest && integrity.manifest.checksum.startsWith("sha256_"));
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 022 EDGE-CASE HARDENING VERIFIED!");
  console.log("================================================================");
})();
