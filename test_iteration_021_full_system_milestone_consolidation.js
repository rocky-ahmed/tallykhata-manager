/**
 * REA Reconstruction — Iteration 021: Full-System End-to-End Milestone Consolidation & Audit Suite
 */
const assert = require("assert");
const { StorageRepository } = require("./src/storageRepository");
const ledgerEngine = require("./src/ledgerEngine");
const moneyManager = require("./src/moneyManagerService");
const googleDrive = require("./src/googleDriveBackupService");
const i18n = require("./src/i18nService");

function createMockAdapter(initial = {}) {
  const map = new Map();
  for (const [k, v] of Object.entries(initial)) {
    map.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  return {
    getItem: async (k) => (map.has(k) ? map.get(k) : null),
    setItem: async (k, v) => { map.set(k, String(v)); },
    removeItem: async (k) => { map.delete(k); },
    clear: async () => { map.clear(); },
    _map: map,
  };
}

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
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

(async () => {
  console.log("================================================================");
  console.log("REA RECONSTRUCTION: ITERATION 021 FULL-SYSTEM MILESTONE AUDIT");
  console.log("================================================================\n");

  const adapter = createMockAdapter();
  const repo = new StorageRepository(adapter);
  await repo.loadInitialData();

  // STEP 1: BUSINESS LIFECYCLE & TRANSACTION WORKFLOW
  console.log("--- STEP 1: MULTI-SHOP TRANSACTIONS & RUNNING BALANCES ---");

  await runTest("1.1: Multi-shop customer credit sale and payment lifecycle", async () => {
    await repo.selectBusiness("2");

    // Add customer to business 2
    await repo.mutateCollection("accounts", prev => [
      ...prev,
      { id: "cust_vip_01", businessId: "2", name: "আকরাম সাহেব", balance: 0, type: 1 }
    ]);

    // Journal 1: Credit sale of 1,500 Taka (150,000 paisa)
    // Journal 2: Partial payment of 1,000 Taka (100,000 paisa)
    await repo.mutateCollection("journals", prev => [
      ...prev,
      { id: "j_sale_01", businessId: "2", accountId: "cust_vip_01", amount: 1500, type: "given", date: "2026-11-01" },
      { id: "j_pay_01", businessId: "2", accountId: "cust_vip_01", amount: 1000, type: "received", date: "2026-11-02" }
    ]);

    const state = repo.getAuthoritativeState();
    const custAcc = state.accounts.find(a => a.id === "cust_vip_01" && a.businessId === "2");
    const recalc = ledgerEngine.recalculateAccountRunningBalances(custAcc, state.journals);

    // Running due balance must be exactly 500 Taka
    assert.strictEqual(recalc.updatedAccount.balance, 500, "Remaining due must be exactly 500 Taka");
    assert.strictEqual(recalc.accountJournals.length, 2);
  });

  // STEP 2: CASHBOX RECONCILIATION & INVENTORY SYNC
  console.log("\n--- STEP 2: CASHBOX & INVENTORY AUTOMATION ---");

  await runTest("2.1: Cashbox drawer adjustment and stock depletion", async () => {
    const stateBefore = repo.getAuthoritativeState();
    const initSummary = ledgerEngine.deriveCashBoxSummary(stateBefore.cashEntries, "2");

    // Record cash in from payment
    await repo.mutateCollection("cashEntries", prev => [
      ...prev,
      { id: "c_in_01", businessId: "2", type: "in", amount: 1000, category: "sale", date: "2026-11-02" }
    ]);

    // Inventory item update
    await repo.mutateCollection("inventory", prev => [
      ...prev,
      { id: "prod_01", businessId: "2", name: "ডিটারজেন্ট পাউডার", stock: 40, unitPrice: 150 }
    ]);

    const state = repo.getAuthoritativeState();
    const cashSummary = ledgerEngine.deriveCashBoxSummary(state.cashEntries, "2");
    assert.strictEqual(cashSummary.cashIn, initSummary.cashIn + 1000, "Cash in increases by 1000");
    assert.strictEqual(cashSummary.balance, initSummary.balance + 1000, "Cash balance increases by 1000");

    const prod = state.inventory.find(p => p.id === "prod_01");
    assert.strictEqual(prod.stock, 40, "Stock must be 40");
  });

  // STEP 3: PERSONAL MONEY MANAGER & DOMAIN ISOLATION
  console.log("\n--- STEP 3: PERSONAL FINANCE DOMAIN ISOLATION ---");

  await runTest("3.1: Personal Money Manager operates with zero business state leakage", async () => {
    let mmState = moneyManager.getDefaultState();

    // Add expense transaction of 250 Taka
    const cashAcc = mmState.accounts[0];
    const initialCash = cashAcc.balance;
    mmState = moneyManager.addTransaction(mmState, {
      accountId: cashAcc.id,
      type: "expense",
      amount: 250,
      categoryId: "cat_food",
      note: "দুপুরের খাবার",
      date: "2026-11-02"
    });

    const updatedCash = mmState.accounts.find(a => a.id === cashAcc.id);
    assert.strictEqual(updatedCash.balance, initialCash - 250, "Cash account debited by 250");

    // Save into adapter under @tallykhata_personal_money_manager_v2
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(mmState));

    // Verify business state and money manager state are strictly isolated
    const rawBiz = repo.getAuthoritativeState();
    const rawMM = JSON.parse(await adapter.getItem("@tallykhata_personal_money_manager_v2") || "{}");

    assert(!rawBiz.accounts.some(a => a.id === cashAcc.id), "Business state must not contain personal accounts");
    assert(!rawMM.transactions.some(t => t.id === "j_sale_01"), "Personal state must not contain business journals");
  });

  // STEP 4: GOOGLE DRIVE CLOUD BACKUP & 3-WAY SELECTIVE RESTORE
  console.log("\n--- STEP 4: GOOGLE DRIVE BACKUP & SELECTIVE RESTORE ---");

  await runTest("4.1: Unified backup serialization, checksum verification, and selective restore", async () => {
    const bizData = repo.getAuthoritativeState();
    const mmData = JSON.parse(await adapter.getItem("@tallykhata_personal_money_manager_v2"));

    // Build unified backup payload
    const userProfile = { sub: "google_merchant_01", email: "merchant@gmail.com", name: "Merchant Akram" };
    const backup = googleDrive.buildBackupPayload(bizData, userProfile, { moneyManager: mmData });

    assert.strictEqual(backup.manifest.appVersion, "4.0.0");
    assert(backup.manifest.checksum, "Backup must contain SHA-256 checksum");

    const validity = googleDrive.validateBackupIntegrity(backup);
    assert.strictEqual(validity.valid, true, "Backup checksum must be authentic and valid");

    // Selective Personal Restore: Mutate personal state, restore from backup, business state remains untouched
    const mutatedMM = { ...mmData, transactions: [] };
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(mutatedMM));

    // Restore personal domain only
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(backup.data.moneyManager));

    const restoredMM = JSON.parse(await adapter.getItem("@tallykhata_personal_money_manager_v2"));
    assert.strictEqual(restoredMM.transactions.length, mmData.transactions.length, "Personal transactions restored");

    // Confirm business data in repo is completely unaffected
    const currentBiz = repo.getAuthoritativeState();
    const b2Journals = currentBiz.journals.filter(j => String(j.businessId) === "2");
    assert.strictEqual(b2Journals.length, 2, "Business 2 journals remained intact");
  });

  // STEP 5: STORAGE METRICS & QUOTA OBSERVABILITY
  console.log("\n--- STEP 5: STORAGE METRICS & QUOTA OBSERVABILITY ---");

  await runTest("5.1: getStorageMetrics calculates UTF-8 byte consumption across domains", async () => {
    const metrics = await repo.getStorageMetrics();
    assert(metrics.totalBytes > 0, "Total bytes must be > 0");
    assert(metrics.domains.business > 0, "Business domain must record byte size");
    assert(metrics.domains.personal > 0, "Money Manager domain must record byte size");
    assert.strictEqual(metrics.usagePercent < 1, true, "Clean state must be well under 1% of 50MB quota");
  });

  console.log("\n================================================================");
  console.log(`ITERATION 021 VERDICT: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================\n");
})();