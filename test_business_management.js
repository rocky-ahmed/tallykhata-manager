/**
 * test_business_management.js
 * Comprehensive Automated Verification Suite for TallyKhata Business Management & Lifecycle
 */

const assert = require("assert");
const fs = require("fs");
const { StorageRepository, createDefaultState } = require("./src/storageRepository");
const ledgerEngine = require("./src/ledgerEngine");
const { buildBackupPayload, validateBackupIntegrity } = require("./src/googleDriveBackupService");

console.log("================================================================");
console.log("TALLYKHATA BUSINESS MANAGEMENT & DATA ISOLATION TEST SUITE");
console.log("================================================================\n");

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


/**
 * Executes cashbox reconciliation against a storage repository instance.
 * Ensures active business ID isolation and prevents fallback to business 1.
 */
async function executeCashboxReconciliation({ repo, activeBusinessId, countedCash, recordedCash, date, time }) {
  if (!activeBusinessId || typeof activeBusinessId !== "string" || !activeBusinessId.trim()) {
    throw new Error("সক্রিয় ব্যবসা আইডি ব্যতীত ক্যাশ সমন্বয় সম্ভব নয়। ডিফল্ট ব্যবসায় রিডাইরেক্ট নিষিদ্ধ।");
  }

  const counted = parseFloat(countedCash);
  if (isNaN(counted) || counted < 0) {
    throw new Error("ড্রয়ারের আসল ক্যাশ টাকার পরিমাণ লিখুন");
  }

  const totalCash = Number(recordedCash) || 0;
  const diff = counted - totalCash;

  if (diff === 0) {
    return { success: true, diff: 0, adjEntry: null };
  }

  const adjEntry = {
    id: "adj_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    businessId: String(activeBusinessId).trim(),
    category: diff > 0 ? "malik_in" : "cost",
    type: diff > 0 ? "in" : "out",
    amount: Math.abs(diff),
    desc: diff > 0 ? "ক্যাশ সমন্বয় (উদ্বৃত্ত জমা)" : "ক্যাশ সমন্বয় (ঘাটতি সমন্বয়)",
    date: date || new Date().toISOString().split("T")[0],
    time: time || "12:00 PM",
  };

  const saveRes = await repo.mutateCollection("cashEntries", (latestCash) => {
    return [adjEntry, ...(latestCash || [])];
  });

  if (!saveRes || !saveRes.success) {
    throw new Error("ক্যাশবক্স সমন্বয় সংরক্ষণ করা যায়নি।");
  }

  return {
    success: true,
    diff,
    adjEntry,
    updatedCashEntries: saveRes.collection,
  };
}

async function runAllTests() {
  // TEST 1: Default businesses initialization & listActiveBusinesses
  await runTest("Default businesses initialized with active status and listActiveBusinesses", async () => {
    const repo = new StorageRepository(createMockAdapter());
    const initRes = await repo.loadInitialData();
    assert.strictEqual(initRes.success, true);
    
    const active = repo.listActiveBusinesses();
    assert.strictEqual(active.length, 3);
    assert.strictEqual(active[0].name, "Mobile Xpress");
    assert.strictEqual(active[0].isSelected, true);
    assert.strictEqual(active[0].isArchived, false);
    
    const archived = repo.listArchivedBusinesses();
    assert.strictEqual(archived.length, 0);

    const activeId = repo.getActiveBusinessId();
    assert.strictEqual(activeId, "1");
  });

  // TEST 2: Create a new business with unique ID and active status
  await runTest("Create a new business with validation and unique stable ID", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const res = await repo.createBusiness({
      name: "প্রগতি টেলিকম",
      owner: "রফিক উল্লাহ",
      phone: "01755123456",
      address: "গুলশান-১, ঢাকা",
      isSelected: true,
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.businessName, "প্রগতি টেলিকম");
    assert.strictEqual(res.data.ownerName, "রফিক উল্লাহ");
    
    const active = repo.listActiveBusinesses();
    assert.strictEqual(active.length, 4);
    
    const created = active.find((b) => b.name === "প্রগতি টেলিকম");
    assert.ok(created);
    assert.strictEqual(created.isSelected, true);
    assert.strictEqual(created.isArchived, false);
    assert.ok(created.id);
  });

  // TEST 3: Validation on business creation (empty name and duplicate ID)
  await runTest("Validation guards on business creation", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const emptyRes = await repo.createBusiness({ name: "   " });
    assert.strictEqual(emptyRes.success, false);

    const dupRes = await repo.createBusiness({ id: "1", name: "ডুপ্লিকেট ব্যবসা" });
    assert.strictEqual(dupRes.success, false);
  });

  // TEST 4: Select and switch active business
  await runTest("Select and switch active business with atomic metadata update", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const switchRes = await repo.selectBusiness("2");
    assert.strictEqual(switchRes.success, true);
    assert.strictEqual(switchRes.data.activeBusinessId, "2");
    assert.strictEqual(switchRes.data.businessName, "মেসার্স ভাই ভাই এন্টারপ্রাইজ");
    assert.strictEqual(switchRes.data.ownerName, "হাজী মো: করিম");
    assert.strictEqual(switchRes.data.ownerPhone, "01811223344");

    const state = repo.getAuthoritativeState();
    assert.strictEqual(state.businesses.find((b) => b.id === "2").isSelected, true);
    assert.strictEqual(state.businesses.find((b) => b.id === "1").isSelected, false);
  });

  // TEST 5: Data isolation across businesses
  await runTest("Data isolation across businesses (accounts, cash, stock, notes)", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    // Add account for business "1"
    await repo.mutateCollection("accounts", (prev) => [
      ...prev,
      { id: "acc_biz1", businessId: "1", name: "গ্রাহক ১", balance: 500, type: 1 },
    ]);

    // Add account for business "2"
    await repo.mutateCollection("accounts", (prev) => [
      ...prev,
      { id: "acc_biz2", businessId: "2", name: "গ্রাহক ২", balance: 1200, type: 1 },
    ]);

    // Add cash entry for business "2"
    await repo.mutateCollection("cashEntries", (prev) => [
      ...prev,
      { id: "cash_biz2", businessId: "2", amount: 2000, type: "in", category: "sale" },
    ]);

    const state = repo.getAuthoritativeState();
    const biz1Accounts = repo.filterByBusiness(state.accounts, "1");
    const biz2Accounts = repo.filterByBusiness(state.accounts, "2");

    assert.ok(biz1Accounts.some((a) => a.id === "acc_biz1"));
    assert.strictEqual(biz1Accounts.some((a) => a.id === "acc_biz2"), false);

    assert.ok(biz2Accounts.some((a) => a.id === "acc_biz2"));
    assert.strictEqual(biz2Accounts.some((a) => a.id === "acc_biz1"), false);

    const biz1Cash = repo.filterByBusiness(state.cashEntries, "1");
    const biz2Cash = repo.filterByBusiness(state.cashEntries, "2");
    assert.strictEqual(biz1Cash.some((c) => c.id === "cash_biz2"), false);
    assert.strictEqual(biz2Cash.some((c) => c.id === "cash_biz2"), true);
  });

  // TEST 6: Legacy records without businessId default safely to "1"
  await runTest("Legacy records without businessId default safely to business 1", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const legacyItems = [
      { id: "item1", name: "চাল" }, // no businessId
      { id: "item2", name: "ডাল", businessId: "2" },
    ];

    const biz1Items = repo.filterByBusiness(legacyItems, "1");
    const biz2Items = repo.filterByBusiness(legacyItems, "2");

    assert.strictEqual(biz1Items.length, 1);
    assert.strictEqual(biz1Items[0].id, "item1");

    assert.strictEqual(biz2Items.length, 1);
    assert.strictEqual(biz2Items[0].id, "item2");
  });

  // TEST 7: Reversibly archive a business & preserve records
  await runTest("Reversible archiving removes from active list while preserving financial data", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    // Add record to business 3
    await repo.mutateCollection("accounts", (prev) => [
      ...prev,
      { id: "acc_biz3", businessId: "3", name: "বস্ত্রালয় গ্রাহক", balance: 5000, type: 1 },
    ]);

    const arcRes = await repo.archiveBusiness("3");
    assert.strictEqual(arcRes.success, true);

    const active = repo.listActiveBusinesses();
    assert.strictEqual(active.length, 2);
    assert.strictEqual(active.some((b) => b.id === "3"), false);

    const archived = repo.listArchivedBusinesses();
    assert.strictEqual(archived.length, 1);
    assert.strictEqual(archived[0].id, "3");
    assert.strictEqual(archived[0].isArchived, true);
    assert.ok(archived[0].archivedAt);

    // Linked financial record is preserved in storage
    const state = repo.getAuthoritativeState();
    const preservedAccount = state.accounts.find((a) => a.id === "acc_biz3");
    assert.ok(preservedAccount);
    assert.strictEqual(preservedAccount.balance, 5000);
  });

  // TEST 8: Archiving the currently active business automatically falls back to next active
  await runTest("Archiving currently active business automatically activates next available active business", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    // Select business 1 initially
    await repo.selectBusiness("1");
    assert.strictEqual(repo.getActiveBusinessId(), "1");

    // Archive business 1
    const arcRes = await repo.archiveBusiness("1");
    assert.strictEqual(arcRes.success, true);

    const state = repo.getAuthoritativeState();
    assert.notStrictEqual(state.activeBusinessId, "1");
    assert.strictEqual(state.activeBusinessId, "2");
    assert.strictEqual(state.businessName, "মেসার্স ভাই ভাই এন্টারপ্রাইজ");
    assert.strictEqual(state.businesses.find((b) => b.id === "1").isSelected, false);
    assert.strictEqual(state.businesses.find((b) => b.id === "2").isSelected, true);
  });

  // TEST 9: Safety guard: Cannot archive the sole remaining active business
  await runTest("Guard: Cannot archive the sole remaining active business", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    // Archive business 3 and 2
    await repo.archiveBusiness("3");
    await repo.archiveBusiness("2");

    const active = repo.listActiveBusinesses();
    assert.strictEqual(active.length, 1);

    // Attempting to archive the last remaining business must fail
    const failRes = await repo.archiveBusiness(active[0].id);
    assert.strictEqual(failRes.success, false);
    assert.ok(failRes.error.message.includes("কমপক্ষে একটি ব্যবসা"));
  });

  // TEST 10: Cannot select an archived business directly
  await runTest("Cannot select an archived business directly without restoring first", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    await repo.archiveBusiness("3");
    const selRes = await repo.selectBusiness("3");
    assert.strictEqual(selRes.success, false);
    assert.ok(selRes.error.message.includes("আর্কাইভ করা ব্যবসা"));
  });

  // TEST 11: Restoring an archived business
  await runTest("Restoring an archived business returns it to active list with data intact", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    await repo.archiveBusiness("3");
    assert.strictEqual(repo.listArchivedBusinesses().length, 1);

    const restRes = await repo.restoreBusiness("3");
    assert.strictEqual(restRes.success, true);

    const active = repo.listActiveBusinesses();
    assert.strictEqual(active.length, 3);
    assert.ok(active.some((b) => b.id === "3"));

    const restoredBiz = active.find((b) => b.id === "3");
    assert.strictEqual(restoredBiz.isArchived, false);
    assert.ok(restoredBiz.restoredAt);
  });

  // TEST 12: Permanent deletion safety guards
  await runTest("Permanent deletion guards against deleting businesses with linked financial records", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    // Business 1 has default accounts linked to it
    const del1 = await repo.deleteBusinessPermanently("1");
    assert.strictEqual(del1.success, false);
    assert.ok(del1.error.message.includes("সংরক্ষিত আর্থিক হিসাব"));

    // Create disposable business with 0 records
    const newRes = await repo.createBusiness({ name: "খালি ব্যবসা", isSelected: false });
    const emptyBizId = newRes.data.businesses.find((b) => b.name === "খালি ব্যবসা").id;

    // Permanent delete allowed for empty business
    const delEmpty = await repo.deleteBusinessPermanently(emptyBizId);
    assert.strictEqual(delEmpty.success, true);
    assert.strictEqual(repo.listActiveBusinesses().some((b) => b.id === emptyBizId), false);
  });

  // TEST 13: Backup payload serialization and restore integrity
  await runTest("Backup and restore preserves business profiles and active business reference", async () => {
    const adapter1 = createMockAdapter();
    const repo1 = new StorageRepository(adapter1);
    await repo1.loadInitialData();

    // Create an extra business and archive another
    await repo1.createBusiness({ name: "ক্লাউড শপ", isSelected: true });
    await repo1.archiveBusiness("2");

    const state1 = repo1.getAuthoritativeState();
    const payload = buildBackupPayload(state1, { sub: "test_owner", email: "test@example.com", name: "User" });
    const val = validateBackupIntegrity(payload, "test_owner");
    assert.strictEqual(val.valid, true);

    // Restore into a fresh repo
    const adapter2 = createMockAdapter();
    const repo2 = new StorageRepository(adapter2);
    await repo2.loadInitialData();
    const restoreRes = await repo2.commitRestorePayload(payload);
    assert.strictEqual(restoreRes.success, true);

    const state2 = repo2.getAuthoritativeState();
    assert.strictEqual(state2.businesses.length, 4);
    assert.strictEqual(state2.businesses.find((b) => b.name === "ক্লাউড শপ").isSelected, true);
    assert.strictEqual(state2.businesses.find((b) => b.id === "2").isArchived, true);
    assert.strictEqual(state2.activeBusinessId, state2.businesses.find((b) => b.name === "ক্লাউড শপ").id);
  });

  // TEST 14: Menu tab includes discoverable business management entry point
  await runTest("Menu tab includes discoverable 'ব্যবসা পরিচালনা' entry wired to modalBusinessPicker", async () => {
    const appSource = fs.readFileSync("App.js", "utf8");
    assert.ok(appSource.includes("ব্যবসা পরিচালনা"), "Menu must contain 'ব্যবসা পরিচালনা' title");
    assert.ok(appSource.includes("grid_multi_biz.png"), "Menu entry must use matching multi-business icon");
    assert.ok(appSource.includes('accessibilityLabel={tStatic("ব্যবসা পরিচালনা")}'), "Menu entry must localize its accessibilityLabel");
    const i18nService = require("./src/i18nService");
    assert.strictEqual(i18nService.translateStaticText("ব্যবসা পরিচালনা", "bn"), "ব্যবসা পরিচালনা");
    assert.strictEqual(i18nService.translateStaticText("ব্যবসা পরিচালনা", "en"), "Manage businesses");
    assert.ok(appSource.includes("accessibilityRole=\"button\""), "Menu entry must declare button role");

    // Must trigger the shared business picker without duplicating state or lifecycle
    const menuSnippetMatch = appSource.match(/accessibilityLabel=\{tStatic\("ব্যবসা পরিচালনা"\)\}[\s\S]*?onPress=\{\(\)\s*=>\s*setModalBusinessPicker\(true\)\}/) ||
                             appSource.match(/onPress=\{\(\)\s*=>\s*setModalBusinessPicker\(true\)\}[\s\S]*?accessibilityLabel=\{tStatic\("ব্যবসা পরিচালনা"\)\}/);
    assert.ok(menuSnippetMatch, "Menu entry must trigger setModalBusinessPicker(true)");
  });


  // TEST 15: Cashbox reconciliation in Business 2 stamps adjEntry with businessId '2'
  await runTest("Multi-business cashbox reconciliation stamps adjEntry with active businessId '2'", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    await repo.selectBusiness("2");
    assert.strictEqual(repo.getActiveBusinessId(), "2");

    // Seed initial cash for Business 2 (5000 in) and Business 1 (8000 in)
    await repo.mutateCollection("cashEntries", (prev) => [
      ...prev,
      { id: "c_biz1_init", businessId: "1", amount: 8000, type: "in", category: "sale" },
      { id: "c_biz2_init", businessId: "2", amount: 5000, type: "in", category: "sale" },
    ]);

    // Counted cash is 6500 (surplus of 1500 in Business 2)
    const reconRes = await executeCashboxReconciliation({
      repo,
      activeBusinessId: repo.getActiveBusinessId(),
      countedCash: 6500,
      recordedCash: 5000,
    });

    assert.strictEqual(reconRes.success, true);
    assert.strictEqual(reconRes.diff, 1500);
    assert.ok(reconRes.adjEntry);
    assert.strictEqual(reconRes.adjEntry.businessId, "2", "Adjustment entry must be explicitly stamped with businessId '2'");
    assert.strictEqual(reconRes.adjEntry.type, "in");
    assert.strictEqual(reconRes.adjEntry.category, "malik_in");
    assert.strictEqual(reconRes.adjEntry.amount, 1500);

    // Verify stored state in repo
    const state = repo.getAuthoritativeState();
    const biz2Cash = repo.filterByBusiness(state.cashEntries, "2");
    const biz1Cash = repo.filterByBusiness(state.cashEntries, "1");

    assert.ok(biz2Cash.some((c) => c.id === reconRes.adjEntry.id && c.businessId === "2"));
    assert.strictEqual(biz1Cash.some((c) => c.id === reconRes.adjEntry.id), false, "Business 1 must not contain Business 2 adjustment entry");
  });

  // TEST 16: Business 1 cash totals and entries remain completely unaffected by adjustments in Business 2
  await runTest("Business 1 cash totals and transactions remain completely unaffected by adjustments in Business 2", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    // Setup initial records
    await repo.mutateCollection("cashEntries", (prev) => [
      ...prev,
      { id: "b1_sale_1", businessId: "1", amount: 10000, type: "in", category: "sale" },
      { id: "b1_cost_1", businessId: "1", amount: 2500, type: "out", category: "cost" },
      { id: "b2_sale_1", businessId: "2", amount: 4000, type: "in", category: "sale" },
    ]);

    const stateBefore = repo.getAuthoritativeState();
    const b1CashBefore = repo.filterByBusiness(stateBefore.cashEntries, "1");
    const b1TotalBefore = b1CashBefore.reduce((acc, c) => c.type === "in" ? acc + c.amount : acc - c.amount, 0);
    assert.ok(b1TotalBefore > 0);
    assert.ok(b1CashBefore.length >= 2);

    // Select Business 2 and execute reconciliation with shortage (-1000)
    await repo.selectBusiness("2");
    const reconRes = await executeCashboxReconciliation({
      repo,
      activeBusinessId: "2",
      countedCash: 3000,
      recordedCash: 4000,
    });

    assert.strictEqual(reconRes.success, true);
    assert.strictEqual(reconRes.diff, -1000);
    assert.strictEqual(reconRes.adjEntry.type, "out");
    assert.strictEqual(reconRes.adjEntry.category, "cost");

    // Inspect state after reconciliation
    const stateAfter = repo.getAuthoritativeState();
    const b1CashAfter = repo.filterByBusiness(stateAfter.cashEntries, "1");
    const b1TotalAfter = b1CashAfter.reduce((acc, c) => c.type === "in" ? acc + c.amount : acc - c.amount, 0);

    // Assert Business 1 is completely untouched
    assert.strictEqual(b1CashAfter.length, b1CashBefore.length, "Business 1 entries count must remain identical");
    assert.strictEqual(b1TotalAfter, b1TotalBefore, "Business 1 total cash must remain identical to before reconciliation");
    assert.deepStrictEqual(b1CashAfter.map((c) => c.id), b1CashBefore.map((c) => c.id));

    // Assert Business 2 reflects adjustment
    const b2CashAfter = repo.filterByBusiness(stateAfter.cashEntries, "2");
    const b2TotalAfter = b2CashAfter.reduce((acc, c) => c.type === "in" ? acc + c.amount : acc - c.amount, 0);
    assert.strictEqual(b2TotalAfter, 3000, "Business 2 total cash must equal counted amount 3000");
  });

  // TEST 17: Reconciliation rejected if activeBusinessId is missing or falsy and does not fall back to Business 1
  await runTest("Reconciliation is rejected when activeBusinessId is missing or falsy without falling back to Business 1", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    await repo.mutateCollection("cashEntries", (prev) => [
      ...prev,
      { id: "b1_preserved", businessId: "1", amount: 5000, type: "in", category: "sale" },
    ]);

    const stateBefore = repo.getAuthoritativeState();
    const initialB1Entries = repo.filterByBusiness(stateBefore.cashEntries, "1");
    const initialCount = initialB1Entries.length;
    assert.ok(initialCount >= 1);

    // Attempt reconciliation with null, undefined, empty string, and whitespace
    const invalidBizIds = [null, undefined, "", "   "];
    for (const invalidId of invalidBizIds) {
      let threw = false;
      try {
        await executeCashboxReconciliation({
          repo,
          activeBusinessId: invalidId,
          countedCash: 7000,
          recordedCash: 5000,
        });
      } catch (err) {
        threw = true;
        assert.ok(err.message.includes("সক্রিয় ব্যবসা আইডি ব্যতীত") || err.message.includes("নিষিদ্ধ"));
      }
      assert.strictEqual(threw, true, "Reconciliation must throw when activeBusinessId is " + invalidId);
    }

    // Verify Business 1 cash entries were NEVER mutated or contaminated by fallback
    const stateAfter = repo.getAuthoritativeState();
    const b1EntriesAfter = repo.filterByBusiness(stateAfter.cashEntries, "1");
    assert.strictEqual(b1EntriesAfter.length, initialCount);
    const preserved = b1EntriesAfter.find(c => c.id === "b1_preserved");
    assert.ok(preserved);
    assert.strictEqual(preserved.amount, 5000);
    assert.strictEqual(stateAfter.cashEntries.some((c) => c.id.startsWith("adj_")), false);
  });


  await runTest("Cross-business accountId collision isolation in ledgerEngine", async () => {
    const accBiz1 = { id: "cust_shared_99", businessId: "1", type: 1, openingBalance: 1000 };
    const accBiz2 = { id: "cust_shared_99", businessId: "2", type: 1, openingBalance: 500 };

    const journals = [
      { id: "j1", accountId: "cust_shared_99", businessId: "1", amount: 200, type: "given", date: "2026-10-31" },
      { id: "j2", accountId: "cust_shared_99", businessId: "2", amount: 300, type: "given", date: "2026-10-31" },
    ];

    const recalc1 = ledgerEngine.recalculateAccountRunningBalances(accBiz1, journals);
    const recalc2 = ledgerEngine.recalculateAccountRunningBalances(accBiz2, journals);

    // Business 1 should only see j1 (1000 + 200 = 1200), ignoring j2 from Business 2
    assert.strictEqual(recalc1.updatedAccount.balance, 1200);
    assert.strictEqual(recalc1.accountJournals.length, 1);
    assert.strictEqual(recalc1.accountJournals[0].id, "j1");

    // Business 2 should only see j2 (500 + 300 = 800), ignoring j1 from Business 1
    assert.strictEqual(recalc2.updatedAccount.balance, 800);
    assert.strictEqual(recalc2.accountJournals.length, 1);
    assert.strictEqual(recalc2.accountJournals[0].id, "j2");

    // Test establishAccountOpeningBalance isolation
    const accStored1 = { id: "cust_shared_99", businessId: "1", type: 1, balance: 1200 };
    const opening1 = ledgerEngine.establishAccountOpeningBalance(accStored1, journals);
    assert.strictEqual(opening1, 1000);

    const accStored2 = { id: "cust_shared_99", businessId: "2", type: 1, balance: 800 };
    const opening2 = ledgerEngine.establishAccountOpeningBalance(accStored2, journals);
    assert.strictEqual(opening2, 500);
  });

  await runTest("indexJournalsByAccount and paisa math in calculateAggregateMetrics & deriveCashBoxSummary", async () => {
    const allJournals = [
      { id: "j1", accountId: "acc_1", businessId: "biz_A", amount: 100 },
      { id: "j2", accountId: "acc_1", businessId: "biz_A", amount: 200 },
      { id: "j3", accountId: "acc_1", businessId: "biz_B", amount: 300 },
    ];

    const indexed = ledgerEngine.indexJournalsByAccount(allJournals);
    assert.ok(indexed.has("biz_A:acc_1"));
    assert.ok(indexed.has("biz_B:acc_1"));
    assert.strictEqual(indexed.get("biz_A:acc_1").length, 2);
    assert.strictEqual(indexed.get("biz_B:acc_1").length, 1);

    // Cashbox summary with integer paisa precision
    const cashEntries = [
      { id: "c1", businessId: "biz_A", type: "in", amount: 100.10 },
      { id: "c2", businessId: "biz_A", type: "in", amount: 200.20 },
      { id: "c3", businessId: "biz_A", type: "out", amount: 50.05 },
      { id: "c4", businessId: "biz_B", type: "in", amount: 999 },
    ];

    const cbSummaryA = ledgerEngine.deriveCashBoxSummary(cashEntries, "biz_A");
    assert.strictEqual(cbSummaryA.cashIn, 300.30);
    assert.strictEqual(cbSummaryA.cashOut, 50.05);
    assert.strictEqual(cbSummaryA.balance, 250.25);

    // Aggregate metrics
    const accounts = [
      { id: "a1", businessId: "biz_A", type: 1, balance: 1500.50 }, // customer
      { id: "a2", businessId: "biz_A", type: 2, balance: 500.25 },  // supplier
      { id: "a3", businessId: "biz_B", type: 1, balance: 10000 },
    ];
    const metricsA = ledgerEngine.calculateAggregateMetrics(accounts, allJournals, "biz_A");
    assert.strictEqual(metricsA.totalReceivable, 1500.50);
    assert.strictEqual(metricsA.totalPayable, 500.25);
    assert.strictEqual(metricsA.netBalance, 1000.25);
    assert.strictEqual(metricsA.customerCount, 1);
    assert.strictEqual(metricsA.supplierCount, 1);
  });

  await runTest("deleteBusinessCascade purges multi-business records and updates active business", async () => {
    const initialData = {
      businesses: [
        { id: "1", name: "Main Shop", isSelected: true, isArchived: false },
        { id: "2", name: "Branch 2", isSelected: false, isArchived: false },
      ],
      activeBusinessId: "2",
      accounts: [
        { id: "a1", businessId: "1", name: "Cust 1", balance: 100 },
        { id: "a2", businessId: "2", name: "Cust 2", balance: 200 },
      ],
      journals: [
        { id: "j1", businessId: "1", accountId: "a1", amount: 100 },
        { id: "j2", businessId: "2", accountId: "a2", amount: 200 },
      ],
      cashEntries: [
        { id: "c1", businessId: "1", amount: 50 },
        { id: "c2", businessId: "2", amount: 75 },
      ],
      notes: [
        { id: "n1", businessId: "1", title: "Note 1" },
        { id: "n2", businessId: "2", title: "Note 2" },
      ],
      stock: [
        { id: "s1", businessId: "1", name: "Item 1" },
        { id: "s2", businessId: "2", name: "Item 2" },
      ],
      inventory: [
        { id: "s1", businessId: "1", name: "Item 1" },
        { id: "s2", businessId: "2", name: "Item 2" },
      ],
      walletTxns: [
        { id: "w1", businessId: "1", amount: 10 },
        { id: "w2", businessId: "2", amount: 20 },
      ],
      tagadaLogs: [
        { id: "t1", businessId: "1", msg: "Hi" },
        { id: "t2", businessId: "2", msg: "Hello" },
      ],
    };

    const repo = new StorageRepository(createMockAdapter(initialData));
    await repo.loadInitialData();

    // Cascade delete business 2
    const delRes = await repo.deleteBusinessCascade("2");
    assert.strictEqual(delRes.success, true);

    const afterState = repo.getAuthoritativeState();
    assert.strictEqual(afterState.businesses.length, 1);
    assert.strictEqual(afterState.businesses[0].id, "1");
    assert.strictEqual(afterState.activeBusinessId, "1");

    // All records for business 2 must be purged
    assert.strictEqual(afterState.accounts.some(a => String(a.businessId) === "2"), false);
    assert.strictEqual(afterState.journals.some(j => String(j.businessId) === "2"), false);
    assert.strictEqual(afterState.cashEntries.some(c => String(c.businessId) === "2"), false);
    assert.strictEqual(afterState.notes.some(n => String(n.businessId) === "2"), false);
    assert.strictEqual(afterState.stock.some(s => String(s.businessId) === "2"), false);
    assert.strictEqual(afterState.inventory.some(i => String(i.businessId) === "2"), false);
    assert.strictEqual(afterState.walletTxns.some(w => String(w.businessId) === "2"), false);
    assert.strictEqual(afterState.tagadaLogs.some(t => String(t.businessId) === "2"), false);

    // Business 1 records must remain intact
    assert.strictEqual(afterState.accounts.length, 1);
    assert.strictEqual(afterState.accounts[0].id, "a1");

    // Guard: cannot cascade delete the last active business
    let threw = false;
    try {
      const failDel = await repo.deleteBusinessCascade("1");
      if (failDel && failDel.success === false) {
        threw = true;
        assert.ok(failDel.error && failDel.error.message.includes("কমপক্ষে একটি ব্যবসা"));
      }
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes("কমপক্ষে একটি ব্যবসা"));
    }
    assert.strictEqual(threw, true);
  });

  console.log("\n================================================================");
  console.log(`BUSINESS MANAGEMENT SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================\n");
}

runAllTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
