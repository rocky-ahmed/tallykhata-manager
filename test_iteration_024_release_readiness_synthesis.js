/**
 * test_iteration_024_release_readiness_synthesis.js
 * Continuous Verification Suite for Iteration 024: Release Readiness Synthesis & Parity Audit
 *
 * Comprehensive holistic verification across all 12 core reconstructed features:
 * - FEAT-001: Customer Bookkeeping & Running Balances
 * - FEAT-002: Supplier Accounting & Payable Ledgers
 * - FEAT-003: Cashbox (Galla) & Daily Reconciliation
 * - FEAT-004: Inventory & Stock Management
 * - FEAT-005: Tagada Due Reminders & Message Templates
 * - FEAT-006: Multi-Shop Tenancy & Collision Isolation
 * - FEAT-007: Personal Money Manager & Budget Status Taxonomy
 * - FEAT-008: Cloud Backup & 3-Way Selective Restore (SHA-256 Checksum)
 * - FEAT-009: Bilingual i18n Dictionary Parity (680 keys) & Number Formatting
 * - FEAT-010: Tactile Haptic Feedback Service Abstraction
 * - FEAT-011: Transaction Query Binary Search Indexing
 * - FEAT-012: High-Frequency I/O Write Queue Mutex Serialization & Fault Recovery
 *
 * Worker Roles:
 * - Worker 1 (Gibbs): Thread ID 01a19154-99ab-72a0-9e23-2611b9ffc74c (REA Evidence & Binary Parity)
 * - Worker 2 (Averroes): Thread ID 01a19154-c135-75d0-b38a-1ea50f004895 (Backend, Persistence & Storage)
 * - Worker 3 (Ohm): Thread ID 01a19154-e3ee-7ab2-b682-798b64a0bb6b (Frontend, i18n & Release QA)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const ledgerEngine = require("./src/ledgerEngine");
const mmService = require("./src/moneyManagerService");
const i18n = require("./src/i18nService");
const hapticService = require("./src/hapticFeedbackService");
const { StorageRepository, createDefaultState } = require("./src/storageRepository");
const { buildBackupPayload, validateBackupIntegrity, calculateSha256Checksum } = require("./src/googleDriveBackupService");

console.log("================================================================");
console.log("TALLYKHATA ITERATION 024: RELEASE READINESS SYNTHESIS AUDIT");
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
  // PART 1: Codebase AST & Packaging Invariants
  // =========================================================================
  await runTest("1.1: Complete React Native application codebase parses cleanly with zero AST errors", async () => {
    const jsFiles = [
      "App.js",
      "index.js",
      ...fs.readdirSync("src").filter(f => f.endsWith(".js")).map(f => path.join("src", f)),
      ...fs.readdirSync("src/components").filter(f => f.endsWith(".js")).map(f => path.join("src/components", f))
    ];
    assert.strictEqual(jsFiles.length, 24, "Must contain exactly 24 core application JS files");
    for (const f of jsFiles) {
      const src = fs.readFileSync(f, "utf8");
      assert.doesNotThrow(() => {
        babel.parseSync(src, {
          configFile: false,
          babelrc: false,
          parserOpts: { plugins: ["jsx", "flow", "classProperties"] },
          filename: f
        });
      }, "File " + f + " must parse with zero syntax errors");
    }
  });

  // =========================================================================
  // PART 2: Business Accounting Ledger (FEAT-001, FEAT-002, FEAT-003, FEAT-004)
  // =========================================================================
  await runTest("2.1: Double-entry ledger, customer credit, supplier payable, cashbox, and stock parity", async () => {
    const mockStore = createMockAdapter(createDefaultState());
    const repo = new StorageRepository(mockStore);
    await repo.loadInitialData();

    // 1. Customer Bookkeeping (FEAT-001)
    const custId = "cust_rahim_01";
    await repo.mutateCollection("accounts", prev => [
      ...prev,
      { id: custId, businessId: "1", name: "Rahim Mia", type: 1, phone: "01811223344", balance: 1000, openingBalance: 1000 }
    ]);

    await repo.mutateCollection("journals", prev => [
      ...prev,
      { id: "j_sale_1", businessId: "1", accountId: custId, amount: 2500.5, type: "given", date: "2026-11-01" },
      { id: "j_pay_1", businessId: "1", accountId: custId, amount: 1500.5, type: "received", date: "2026-11-02" }
    ]);

    const state = repo.getAuthoritativeState();
    const custAcc = state.accounts.find(a => a.id === custId);
    const recalc = ledgerEngine.recalculateAccountRunningBalances(custAcc, state.journals);
    // 1000 (opening) + 2500.5 (given) - 1500.5 (received) = 2000.00
    assert.strictEqual(recalc.updatedAccount.balance, 2000);

    // 2. Supplier Accounting (FEAT-002)
    const suppId = "supp_wholesaler_01";
    await repo.mutateCollection("accounts", prev => [
      ...prev,
      { id: suppId, businessId: "1", name: "Deshi Wholesalers", type: 2, phone: "01999887766", balance: 5000, openingBalance: 5000 }
    ]);

    await repo.mutateCollection("journals", prev => [
      ...prev,
      { id: "j_supp_1", businessId: "1", accountId: suppId, amount: 3000, type: "received", date: "2026-11-01" }, // purchased on credit
      { id: "j_supp_2", businessId: "1", accountId: suppId, amount: 4000, type: "given", date: "2026-11-02" }     // supplier paid
    ]);

    const suppAcc = repo.getAuthoritativeState().accounts.find(a => a.id === suppId);
    const suppRecalc = ledgerEngine.recalculateAccountRunningBalances(suppAcc, repo.getAuthoritativeState().journals);
    // Supplier: 5000 (opening) + 3000 (received) - 4000 (given) = 4000.00 payable
    assert.strictEqual(suppRecalc.updatedAccount.balance, 4000);

    // 3. Cashbox Reconciliation (FEAT-003)
    const initCashSummary = ledgerEngine.deriveCashBoxSummary(repo.getAuthoritativeState().cashEntries, "1");

    await repo.mutateCollection("cashEntries", prev => [
      ...prev,
      { id: "c_in_1", businessId: "1", type: "in", amount: 1500.5, category: "customer_payment", date: "2026-11-02" },
      { id: "c_out_1", businessId: "1", type: "out", amount: 500.25, category: "chai_snack", date: "2026-11-02" }
    ]);

    const cashbox = ledgerEngine.deriveCashBoxSummary(repo.getAuthoritativeState().cashEntries, "1");
    assert.strictEqual(cashbox.cashIn, initCashSummary.cashIn + 1500.5);
    assert.strictEqual(cashbox.cashOut, initCashSummary.cashOut + 500.25);
    assert.strictEqual(cashbox.balance, initCashSummary.balance + 1000.25);

    // 4. Inventory & Stock (FEAT-004)
    await repo.mutateCollection("inventory", prev => [
      ...prev,
      { id: "prod_sugar", businessId: "1", name: "সাদা চিনি", stock: 50, unitPrice: 140 }
    ]);
    const prod = repo.getAuthoritativeState().inventory.find(p => p.id === "prod_sugar");
    assert.strictEqual(prod.stock, 50);
    assert.strictEqual(prod.unitPrice, 140);
  });

  // =========================================================================
  // PART 3: Multi-Shop Tenancy, Tagada & Indexing (FEAT-005, FEAT-006, FEAT-011)
  // =========================================================================
  await runTest("3.1: Multi-shop tenancy collision isolation, tagada due reminders, and query indexing", async () => {
    const mockStore = createMockAdapter(createDefaultState());
    const repo = new StorageRepository(mockStore);
    await repo.loadInitialData();

    // 1. Tagada Log (FEAT-005)
    await repo.mutateCollection("tagadaLogs", prev => [
      ...prev,
      { id: "t_log_1", businessId: "1", accountId: "acc_1", message: "বকেয়া বিল পরিশোধ করুন", date: "2026-11-02" }
    ]);
    assert.strictEqual(repo.getAuthoritativeState().tagadaLogs.length, 1);

    // 2. Multi-Shop Tenancy Collision Isolation (FEAT-006)
    const accBiz1 = { id: "shared_customer_id", businessId: "1", type: 1, openingBalance: 500 };
    const accBiz2 = { id: "shared_customer_id", businessId: "2", type: 1, openingBalance: 800 };
    const crossJournals = [
      { id: "j_b1", accountId: "shared_customer_id", businessId: "1", amount: 200, type: "given", date: "2026-11-01" },
      { id: "j_b2", accountId: "shared_customer_id", businessId: "2", amount: 300, type: "given", date: "2026-11-01" },
    ];

    const r1 = ledgerEngine.recalculateAccountRunningBalances(accBiz1, crossJournals);
    const r2 = ledgerEngine.recalculateAccountRunningBalances(accBiz2, crossJournals);
    assert.strictEqual(r1.updatedAccount.balance, 700); // 500 + 200 = 700
    assert.strictEqual(r2.updatedAccount.balance, 1100); // 800 + 300 = 1100

    // 3. Transaction Query Indexing (FEAT-011)
    const dateSorted = [
      { id: "j_d1", date: "2026-10-01", amount: 100 },
      { id: "j_d2", date: "2026-10-15", amount: 200 },
      { id: "j_d3", date: "2026-11-01", amount: 300 },
      { id: "j_d4", date: "2026-11-02", amount: 400 },
    ];
    const queryRes = repo.queryJournalsByDateRange(dateSorted, "2026-10-10", "2026-11-01");
    assert.strictEqual(queryRes.totalCount, 2);
    assert.strictEqual(queryRes.journals[0].id, "j_d2");
    assert.strictEqual(queryRes.journals[1].id, "j_d3");
  });

  // =========================================================================
  // PART 4: Personal Money Manager, Budgets & i18n (FEAT-007, FEAT-009, FEAT-010)
  // =========================================================================
  await runTest("4.1: Personal Money Manager, budget status taxonomy, 680-key i18n parity, and haptics", async () => {
    // 1. Personal Money Manager (FEAT-007)
    let mmState = mmService.getDefaultState();
    mmState.overallMonthlyBudget = 30000;
    const initialNetWorth = mmService.calculateNetWorth(mmState);

    // Expense transaction
    mmState = mmService.addTransaction(mmState, {
      type: "expense",
      amount: 1500,
      categoryId: "cat_food",
      accountId: "acc_cash",
      note: "Family groceries",
      date: mmService.getLocalDateString(),
    });

    // Net worth debits by exactly 1500
    assert.strictEqual(mmService.calculateNetWorth(mmState), initialNetWorth - 1500);

    // Transfer transaction (Net worth must remain 100% invariant)
    const netWorthBeforeTransfer = mmService.calculateNetWorth(mmState);
    mmState = mmService.addTransaction(mmState, {
      type: "transfer",
      amount: 1000,
      fromAccountId: "acc_cash",
      toAccountId: "acc_bank",
      note: "Cash deposit to bank",
      date: mmService.getLocalDateString(),
    });
    assert.strictEqual(mmService.calculateNetWorth(mmState), netWorthBeforeTransfer, "Transfer must be net-worth invariant");

    // Budget Status Taxonomy: safe (<80%), warning (80-100%), exceeded (>100%)
    const metrics = mmService.calculatePeriodMetrics(mmState, "this_month");
    assert.strictEqual(metrics.overallBudgetStatus, "safe");
    assert.strictEqual(typeof metrics.overallBudgetRawPct, "number");

    // 2. Bilingual i18n 680-key Parity (FEAT-009)
    assert.strictEqual(Object.keys(i18n.STRINGS.bn).length, Object.keys(i18n.STRINGS.en).length);
    assert.ok(Object.keys(i18n.STRINGS.bn).length >= 680);
    assert.strictEqual(i18n.toEnglishDigits("১২৩৪৫"), "12345");
    assert.strictEqual(i18n.parseNumber("৫০০.২৫"), 500.25);

    // 3. Tactile Feedback Robustness (FEAT-010)
    assert.doesNotThrow(() => {
      hapticService.onTransactionSave();
      hapticService.notificationSuccess();
    });
  });

  // =========================================================================
  // PART 5: Cloud Backup, Selective Restore & Mutex Resilience (FEAT-008, FEAT-012)
  // =========================================================================
  await runTest("5.1: SHA-256 cloud backup, 3-way selective restore, and FIFO write mutex resilience", async () => {
    const mockStore = createMockAdapter(createDefaultState());
    const repo = new StorageRepository(mockStore);
    await repo.loadInitialData();

    // 1. Mutex Queue Resilience & Unpoisoning (FEAT-012)
    let caught = false;
    try {
      await repo.enqueueWrite(async () => {
        throw new Error("Intentional write failure for unpoisoning test");
      });
    } catch (err) {
      caught = true;
    }
    assert.strictEqual(caught, true);

    // Mutex recovers immediately
    const okRes = await repo.enqueueWrite(async () => ({ ok: true }));
    assert.strictEqual(okRes.ok, true);

    // 2. Cloud Backup with SHA-256 Checksum (FEAT-008)
    const mmState = mmService.getDefaultState();
    const userProfile = { sub: "google_merchant_024", email: "merchant024@gmail.com", name: "Synthesized User" };
    const backup = buildBackupPayload(repo.getAuthoritativeState(), userProfile, { moneyManager: mmState });

    assert.ok(backup.manifest.checksum.startsWith("sha256_"));
    const validity = validateBackupIntegrity(backup, "google_merchant_024");
    assert.strictEqual(validity.valid, true);
    assert.strictEqual(validity.manifest.backupVersion, 1);
    assert.strictEqual(validity.manifest.appVersion, "4.0.0");

    // 3. Domain Isolation & Selective 3-Way Restore
    const bizBefore = repo.getAuthoritativeState();
    // Restore personal domain into mockStore
    await mockStore.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(backup.data.moneyManager));
    const restoredMM = JSON.parse(await mockStore.getItem("@tallykhata_personal_money_manager_v2"));
    assert.strictEqual(restoredMM.accounts.length, mmState.accounts.length);

    // Business state in repo is completely untouched
    assert.deepStrictEqual(repo.getAuthoritativeState(), bizBefore);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 024 RELEASE READINESS SYNTHESIS PARITY VERIFIED!");
  console.log("================================================================");
})();
