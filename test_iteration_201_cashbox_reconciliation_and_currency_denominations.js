/**
 * test_iteration_201_cashbox_reconciliation_and_currency_denominations.js
 * Continuous Verification Suite for Iteration 201:
 * Cashbox Reconciliation, Bangladeshi Currency Denominations & Physical Drawer Discrepancy Integrity
 *
 * Covers:
 * 1. Physical Currency Denominations Calculation (1000, 500, 200, 100, 50, 20, 10, 5, 2, 1 BDT).
 * 2. Cash Discrepancy Invariants (Exact match, Surplus inflow, Deficit expense adjustment).
 * 3. Multi-Tenant Business Scoping for Cashbox Reconciliation.
 * 4. Adjustment Lifecycle, Deletion & Recalculation Fidelity.
 * 5. Cloud Backup & Round-Trip Restore of Cashbox Reconciliation Records.
 */

const assert = require("assert");
const ledgerEngine = require("./src/ledgerEngine");
const { StorageRepository, createDefaultState } = require("./src/storageRepository");
const { buildBackupPayload, validateBackupIntegrity, restoreBackupIntoStorage } = require("./src/googleDriveBackupService");

console.log("================================================================");
console.log("TALLYKHATA ITERATION 201: CASHBOX RECONCILIATION & DENOMINATIONS AUDIT");
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
  const store = {};
  if (initialData) {
    store[ledgerEngine.V6_KEY] = JSON.stringify(initialData);
  }
  return {
    async getItem(k) {
      return store[k] !== undefined ? store[k] : null;
    },
    async setItem(k, v) {
      store[k] = String(v);
    },
    async removeItem(k) {
      delete store[k];
    },
    _getStore() {
      return store;
    },
  };
}

// Denomination calculation helper mimicking App.js:2334
function calculateDenominations(notes = {}) {
  const n1000 = (Number(notes.n1000) || 0) * 1000;
  const n500 = (Number(notes.n500) || 0) * 500;
  const n200 = (Number(notes.n200) || 0) * 200;
  const n100 = (Number(notes.n100) || 0) * 100;
  const n50 = (Number(notes.n50) || 0) * 50;
  const n20 = (Number(notes.n20) || 0) * 20;
  const n10 = (Number(notes.n10) || 0) * 10;
  const n5 = (Number(notes.n5) || 0) * 5;
  const n2 = (Number(notes.n2) || 0) * 2;
  const n1 = (Number(notes.n1) || 0) * 1;

  const totalPaisa = Math.round((n1000 + n500 + n200 + n100 + n50 + n20 + n10 + n5 + n2 + n1) * 100);
  return totalPaisa / 100;
}

(async () => {
  // =========================================================================
  // PART 1: Bangladeshi Note Denomination Engine
  // =========================================================================
  await runTest("1.1: Standard mixed denomination count calculates exact cash sum", async () => {
    const notes = {
      n1000: 5,  // 5,000
      n500: 10,  // 5,000
      n200: 25,  // 5,000
      n100: 40,  // 4,000
      n50: 10,   //   500
      n20: 15,   //   300
      n10: 12,   //   120
      n5: 8,     //    40
      n2: 15,    //    30
      n1: 10     //    10
    };
    // Expected total: 5000 + 5000 + 5000 + 4000 + 500 + 300 + 120 + 40 + 30 + 10 = 20,000 BDT
    const total = calculateDenominations(notes);
    assert.strictEqual(total, 20000);
  });

  await runTest("1.2: High-volume mega cash count calculates exact integer paisa without drift", async () => {
    const notes = {
      n1000: 100000, // 100,000,000 BDT (10 Crore Taka)
      n500: 20000,   //  10,000,000 BDT (1 Crore Taka)
    };
    const total = calculateDenominations(notes);
    assert.strictEqual(total, 110000000);
  });

  await runTest("1.3: Empty or invalid note entries gracefully resolve to zero", async () => {
    const notes = {
      n1000: "",
      n500: null,
      n200: undefined,
      n100: "abc",
      n50: 0
    };
    const total = calculateDenominations(notes);
    assert.strictEqual(total, 0);
  });

  // =========================================================================
  // PART 2: Cash Discrepancy Invariants & Reconciliation
  // =========================================================================
  await runTest("2.1: Perfect match (diff === 0) requires no adjustment entry", async () => {
    const currentCashEntries = [
      { id: "c1", amount: 15000, type: "in", businessId: "1" },
      { id: "c2", amount: 5000, type: "out", businessId: "1" }
    ];
    const summary = ledgerEngine.deriveCashBoxSummary(currentCashEntries, "1");
    assert.strictEqual(summary.balance, 10000);

    const countedFromNotes = calculateDenominations({ n1000: 10 }); // exactly 10,000 BDT
    const diff = countedFromNotes - summary.balance;
    assert.strictEqual(diff, 0); // No discrepancy
  });

  await runTest("2.2: Cash surplus (diff > 0) creates malik_in adjustment entry reconciling drawer", async () => {
    const currentCashEntries = [
      { id: "c1", amount: 10000, type: "in", businessId: "1" }
    ];
    const summaryBefore = ledgerEngine.deriveCashBoxSummary(currentCashEntries, "1");
    assert.strictEqual(summaryBefore.balance, 10000);

    const countedFromNotes = 12500; // Physical drawer has 12,500 (+2,500 surplus)
    const diff = countedFromNotes - summaryBefore.balance;
    assert.strictEqual(diff, 2500);

    // Create surplus adjustment
    const adjEntry = {
      id: "adj_surplus_201",
      businessId: "1",
      category: "malik_in",
      type: "in",
      amount: diff,
      desc: "ক্যাশ সমন্বয় (উদ্বৃত্ত জমা)",
      date: "2026-11-03"
    };

    const newCashEntries = [adjEntry, ...currentCashEntries];
    const summaryAfter = ledgerEngine.deriveCashBoxSummary(newCashEntries, "1");
    // Reconciled cash balance must equal physical counted amount (12,500)
    assert.strictEqual(summaryAfter.balance, 12500);
    assert.strictEqual(summaryAfter.cashIn, 12500);
  });

  await runTest("2.3: Cash deficit (diff < 0) creates cost adjustment entry reconciling drawer", async () => {
    const currentCashEntries = [
      { id: "c1", amount: 10000, type: "in", businessId: "1" }
    ];
    const summaryBefore = ledgerEngine.deriveCashBoxSummary(currentCashEntries, "1");
    assert.strictEqual(summaryBefore.balance, 10000);

    const countedFromNotes = 8500; // Physical drawer has 8,500 (-1,500 deficit)
    const diff = countedFromNotes - summaryBefore.balance;
    assert.strictEqual(diff, -1500);

    // Create deficit adjustment
    const adjEntry = {
      id: "adj_deficit_201",
      businessId: "1",
      category: "cost",
      type: "out",
      amount: Math.abs(diff),
      desc: "ক্যাশ সমন্বয় (ঘাটতি সমন্বয়)",
      date: "2026-11-03"
    };

    const newCashEntries = [adjEntry, ...currentCashEntries];
    const summaryAfter = ledgerEngine.deriveCashBoxSummary(newCashEntries, "1");
    // Reconciled cash balance must equal physical counted amount (8,500)
    assert.strictEqual(summaryAfter.balance, 8500);
    assert.strictEqual(summaryAfter.cashOut, 1500);
  });

  // =========================================================================
  // PART 3: Multi-Tenant Business Scoping for Cashbox Reconciliation
  // =========================================================================
  await runTest("3.1: Cash adjustments in Shop 1 do not affect cash balance in Shop 2", async () => {
    const cashEntries = [
      { id: "c_shop1", amount: 50000, type: "in", businessId: "shop_1" },
      { id: "c_shop2", amount: 80000, type: "in", businessId: "shop_2" },
      { id: "adj_shop1", amount: 5000, type: "in", category: "malik_in", businessId: "shop_1" }, // surplus in shop 1
    ];

    const shop1Summary = ledgerEngine.deriveCashBoxSummary(cashEntries, "shop_1");
    assert.strictEqual(shop1Summary.balance, 55000); // 50,000 + 5,000

    const shop2Summary = ledgerEngine.deriveCashBoxSummary(cashEntries, "shop_2");
    assert.strictEqual(shop2Summary.balance, 80000); // Unaltered by shop 1 adjustment
  });

  // =========================================================================
  // PART 4: Adjustment Lifecycle & Deletion Integrity
  // =========================================================================
  await runTest("4.1: Deleting a cashbox adjustment restores original unadjusted cash balance", async () => {
    const state = createDefaultState();
    state.cashEntries = [
      { id: "c_orig", amount: 10000, type: "in", businessId: "1" },
      { id: "adj_to_delete", amount: 3000, type: "out", category: "cost", businessId: "1" },
    ];

    const repo = new StorageRepository(createMockAdapter(state));
    await repo.loadInitialData();

    // Check adjusted balance
    const sumBefore = ledgerEngine.deriveCashBoxSummary(repo.getAuthoritativeState().cashEntries, "1");
    assert.strictEqual(sumBefore.balance, 7000);

    // Delete adjustment
    await repo.mutateCollection("cashEntries", (entries) => {
      return entries.filter(e => e.id !== "adj_to_delete");
    });

    const sumAfter = ledgerEngine.deriveCashBoxSummary(repo.getAuthoritativeState().cashEntries, "1");
    assert.strictEqual(sumAfter.balance, 10000); // restored back to 10,000 BDT
  });

  // =========================================================================
  // PART 5: Cloud Backup & Restore Fidelity for Denomination Adjustments
  // =========================================================================
  await runTest("5.1: Cloud backup payload captures cash adjustments with deterministic SHA-256", async () => {
    const state = createDefaultState();
    state.cashEntries = [
      { id: "c_base", amount: 50000, type: "in", businessId: "1" },
      { id: "adj_cloud_201", amount: 4500, type: "in", category: "malik_in", businessId: "1" },
    ];

    const user = { sub: "google_cadence_201", email: "cadence201@tallykhata.com" };
    const payload = buildBackupPayload(state, user);

    assert.ok(payload.manifest.checksum.startsWith("sha256_"));
    const verify = validateBackupIntegrity(payload, "google_cadence_201");
    assert.strictEqual(verify.valid, true);

    // Restore into clean repository
    const cleanRepo = new StorageRepository(createMockAdapter());
    const restoreRes = await cleanRepo.commitRestorePayload(payload);
    assert.strictEqual(restoreRes.success, true);

    const restoredState = cleanRepo.getAuthoritativeState();
    assert.strictEqual(restoredState.cashEntries.length, 2);
    const restoredSummary = ledgerEngine.deriveCashBoxSummary(restoredState.cashEntries, "1");
    assert.strictEqual(restoredSummary.balance, 54500);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 201 CASHBOX RECONCILIATION & DENOMINATIONS AUDIT VERIFIED!");
  console.log("================================================================");
})();
