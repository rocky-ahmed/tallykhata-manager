/**
 * test_business_management.js
 * Comprehensive Automated Verification Suite for TallyKhata Business Management & Lifecycle
 */

const assert = require("assert");
const fs = require("fs");
const { StorageRepository, createDefaultState } = require("./src/storageRepository");
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

  console.log("\n================================================================");
  console.log(`BUSINESS MANAGEMENT SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================\n");
}

runAllTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
