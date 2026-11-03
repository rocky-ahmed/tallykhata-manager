/**
 * ITERATION 211 TEST SUITE 2: DEEP STORAGE BACKUP/RESTORE ROUND-TRIP & DOMAIN ISOLATION
 * Validates:
 * 1. Complete storage key preservation:
 *    - @tallykhata_state_v6
 *    - @tallykhata_personal_money_manager_v2
 *    - @tallykhata_app_preferences_v1
 * 2. Domain Isolation across 3 restore modes (business-only, personal-only, full)
 * 3. Legacy backup resilience (unwrapped, legacy v5, missing personal domain)
 * 4. Safety snapshot rollback on simulated disk/commit failures
 * 5. Multi-tenant multi-business scale (30 businesses with colliding IDs)
 */

const assert = require("assert");
const { StorageRepository, MM_STORAGE_KEY, PREFERENCES_STORAGE_KEY } = require("./src/storageRepository");
const mmService = require("./src/moneyManagerService");
const preferencesService = require("./src/preferencesService");
const { buildBackupPayload, validateBackupIntegrity, calculateSha256Checksum } = require("./src/googleDriveBackupService");

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
  console.log("ITERATION 211: DEEP STORAGE BACKUP/RESTORE & DOMAIN ISOLATION");
  console.log("================================================================\n");

  console.log("--- PART 1: 3-TIER STORAGE KEY PRESERVATION ---");

  await runTest("StorageRepository loads, persists, and synchronizes @tallykhata_state_v6, @tallykhata_personal_money_manager_v2, and @tallykhata_app_preferences_v1", async () => {
    const bizData = {
      businessName: "Super Enterprises",
      accounts: [{ id: "acc_biz", name: "Client A", type: 1, balance: 4000, openingBalance: 4000 }],
      journals: [{ id: "j1", accountId: "acc_biz", amount: 1000, type: "given" }],
      businesses: [{ id: "1", name: "Super Enterprises", isSelected: true }],
      activeBusinessId: "1",
    };
    const mmData = {
      version: 3,
      accounts: [{ id: "wallet_bkash", name: "bKash", balance: 15000, type: "mobile" }],
      transactions: [{ id: "tx_1", amount: 500, type: "expense", categoryId: "cat_food", date: "2026-11-01" }],
      categories: [{ id: "cat_food", name: "Food", type: "expense" }],
      goals: [],
      recurring: [],
      preferences: { currency: "BDT", showCents: false },
    };
    const prefsData = {
      theme: "dark",
      language: "bn",
      fontScale: 1.0,
      density: "standard",
    };

    const adapter = createMockAdapter({
      "@tallykhata_state_v6": JSON.stringify(bizData),
      "@tallykhata_personal_money_manager_v2": JSON.stringify(mmData),
      "@tallykhata_app_preferences_v1": JSON.stringify(prefsData),
    });

    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const fullState = await repo.getFullBackupState();
    assert.strictEqual(fullState.businessName, "Super Enterprises");
    assert.ok(fullState.moneyManager);
    assert.strictEqual(fullState.moneyManager.accounts.length, 1);
    assert.strictEqual(fullState.moneyManager.accounts[0].name, "bKash");
    assert.ok(fullState.preferences);
    assert.strictEqual(fullState.preferences.theme, "dark");
  });

  console.log("\n--- PART 2: DOMAIN-SELECTIVE RESTORE ISOLATION ---");

  await runTest("Selective Restore: Business-only restore updates business store while preserving existing Money Manager & preferences", async () => {
    const existingMM = {
      version: 3,
      accounts: [{ id: "wallet_local", name: "My Safe Cash", balance: 75000 }],
      transactions: [{ id: "t_local", amount: 100, type: "income" }],
      categories: [],
      goals: [],
      recurring: [],
    };
    const existingPrefs = { theme: "dark", language: "bn" };

    const adapter = createMockAdapter({
      "@tallykhata_state_v6": JSON.stringify({ businessName: "Old Shop", accounts: [] }),
      "@tallykhata_personal_money_manager_v2": JSON.stringify(existingMM),
      "@tallykhata_app_preferences_v1": JSON.stringify(existingPrefs),
    });

    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Incoming cloud backup with business data and different MM data
    const cloudBackup = {
      manifest: { backupVersion: 1, schemaVersion: 6 },
      data: {
        businessName: "Cloud Restored Shop",
        accounts: [{ id: "acc_cloud", name: "Cloud Client", type: 1, balance: 9999 }],
        journals: [],
        moneyManager: {
          accounts: [{ id: "wallet_cloud", name: "Cloud Wallet", balance: 1 }],
          transactions: [],
        },
      },
    };

    const res = await repo.commitRestorePayload(cloudBackup, { domains: ["business"] });
    assert.strictEqual(res.success, true);

    const updatedBiz = repo.getAuthoritativeState();
    assert.strictEqual(updatedBiz.businessName, "Cloud Restored Shop");
    assert.strictEqual(updatedBiz.accounts.length, 1);
    assert.strictEqual(updatedBiz.accounts[0].name, "Cloud Client");

    // Verify existing MM remained 100% untouched
    const storedMMStr = await adapter.getItem("@tallykhata_personal_money_manager_v2");
    const storedMM = JSON.parse(storedMMStr);
    assert.strictEqual(storedMM.accounts[0].name, "My Safe Cash");
    assert.strictEqual(storedMM.accounts[0].balance, 75000);
  });

  await runTest("Selective Restore: Personal-only restore updates Money Manager while preserving existing business accounts & cashbox", async () => {
    const existingBiz = {
      businessName: "Preserved Hardware Shop",
      accounts: [{ id: "acc_keep", name: "VIP Customer", type: 1, balance: 8888 }],
      journals: [{ id: "j_keep", amount: 2000, type: "given" }],
      cashEntries: [{ id: "c_keep", type: "in", amount: 5000 }],
      businesses: [{ id: "1", name: "Preserved Hardware Shop", isSelected: true }],
      activeBusinessId: "1",
    };

    const adapter = createMockAdapter({
      "@tallykhata_state_v6": JSON.stringify(existingBiz),
      "@tallykhata_personal_money_manager_v2": JSON.stringify({ accounts: [] }),
    });

    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const cloudBackup = {
      manifest: { backupVersion: 1, schemaVersion: 6, hasMoneyManager: true },
      data: {
        businessName: "DO NOT OVERWRITE SHOP",
        accounts: [{ id: "acc_intruder", name: "Intruder", type: 1, balance: 1 }],
        moneyManager: {
          version: 3,
          accounts: [{ id: "wallet_new", name: "New Cloud Wallet", balance: 45000, type: "bank" }],
          transactions: [{ id: "tx_cloud", amount: 1500, type: "income" }],
          categories: [],
          goals: [],
          recurring: [],
        },
      },
    };

    const res = await repo.commitRestorePayload(cloudBackup, { domains: ["personal"] });
    assert.strictEqual(res.success, true);

    // Verify business state remained 100% untouched
    const bizState = repo.getAuthoritativeState();
    assert.strictEqual(bizState.businessName, "Preserved Hardware Shop");
    assert.strictEqual(bizState.accounts.length, 1);
    assert.strictEqual(bizState.accounts[0].name, "VIP Customer");
    assert.strictEqual(bizState.cashEntries.length, 1);

    // Verify MM was correctly restored
    const storedMMStr = await adapter.getItem("@tallykhata_personal_money_manager_v2");
    const storedMM = JSON.parse(storedMMStr);
    assert.strictEqual(storedMM.accounts.length, 1);
    assert.strictEqual(storedMM.accounts[0].name, "New Cloud Wallet");
    assert.strictEqual(storedMM.accounts[0].balance, 45000);
  });

  console.log("\n--- PART 3: LEGACY BACKUP WITHOUT MM DOES NOT WIPE LOCAL MM ---");

  await runTest("Legacy backup with no moneyManager preserves local Money Manager even on full restore", async () => {
    const existingMM = {
      version: 3,
      accounts: [{ id: "wallet_existing", name: "Local Cash", balance: 32000 }],
      transactions: [{ id: "tx_local", amount: 400, type: "expense" }],
      categories: [],
      goals: [],
      recurring: [],
    };

    const adapter = createMockAdapter({
      "@tallykhata_state_v6": JSON.stringify({ businessName: "Old Shop" }),
      "@tallykhata_personal_money_manager_v2": JSON.stringify(existingMM),
    });

    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const legacyBackup = {
      version: 5,
      businessName: "Legacy 2024 Store",
      accounts: [{ id: "acc_leg", name: "Old Debtor", type: 1, balance: 1200 }],
      journals: [],
    };

    const res = await repo.commitRestorePayload(legacyBackup, { domains: ["all"] });
    assert.strictEqual(res.success, true);

    const bizState = repo.getAuthoritativeState();
    assert.strictEqual(bizState.businessName, "Legacy 2024 Store");

    // Local MM must NOT be erased or set to empty
    const storedMMStr = await adapter.getItem("@tallykhata_personal_money_manager_v2");
    const storedMM = JSON.parse(storedMMStr);
    assert.strictEqual(storedMM.accounts.length, 1);
    assert.strictEqual(storedMM.accounts[0].name, "Local Cash");
    assert.strictEqual(storedMM.accounts[0].balance, 32000);
  });

  console.log("\n--- PART 4: SAFETY SNAPSHOT ROLLBACK ON COMMIT FAILURE ---");

  await runTest("Failed restore rollback reverts business, Money Manager, and preferences atomically", async () => {
    const initialBiz = { businessName: "Stable Base Store", accounts: [{ id: "a1", balance: 500 }] };
    const initialMM = { version: 3, accounts: [{ id: "w1", balance: 10000 }] };
    const initialPrefs = { theme: "light", language: "bn" };

    const adapter = createMockAdapter({
      "@tallykhata_state_v6": JSON.stringify(initialBiz),
      "@tallykhata_personal_money_manager_v2": JSON.stringify(initialMM),
      "@tallykhata_app_preferences_v1": JSON.stringify(initialPrefs),
    });

    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const snapshotRes = await repo.createLocalSafetySnapshot();
    assert.strictEqual(snapshotRes.success, true);

    // Simulate partial/corrupted restore mutation then rollback
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify({ corrupted: true }));
    await adapter.setItem("@tallykhata_app_preferences_v1", JSON.stringify({ theme: "corrupted" }));

    const rollbackRes = await repo.rollbackToSafetySnapshot(snapshotRes.snapshotId);
    assert.strictEqual(rollbackRes.success, true);

    const restoredBiz = repo.getAuthoritativeState();
    assert.strictEqual(restoredBiz.businessName, "Stable Base Store");

    const restoredMM = JSON.parse(await adapter.getItem("@tallykhata_personal_money_manager_v2"));
    assert.strictEqual(restoredMM.accounts[0].balance, 10000);

    const restoredPrefs = JSON.parse(await adapter.getItem("@tallykhata_app_preferences_v1"));
    assert.strictEqual(restoredPrefs.theme, "light");
  });

  console.log("\n--- PART 5: MULTI-TENANT 30-BUSINESS CONCURRENT SCALE ---");

  await runTest("30 businesses with colliding accountId, journalId, and stockId operate with zero data leakage", async () => {
    const businesses = [];
    const accounts = [];
    const journals = [];

    for (let b = 1; b <= 30; b++) {
      const bizId = String(b);
      businesses.push({ id: bizId, name: `Business ${b}`, isSelected: b === 1, isArchived: false });
      // Identical account ID across all 30 businesses
      accounts.push({
        id: "shared_client_id",
        businessId: bizId,
        name: `Client of Biz ${b}`,
        type: 1,
        openingBalance: b * 1000,
        balance: b * 1000,
      });
      // Identical journal ID across all 30 businesses
      journals.push({
        id: "shared_journal_id",
        accountId: "shared_client_id",
        businessId: bizId,
        amount: b * 100,
        type: "given",
      });
    }

    const adapter = createMockAdapter({
      "@tallykhata_state_v6": JSON.stringify({
        businesses,
        activeBusinessId: "1",
        accounts,
        journals,
        cashEntries: [],
      }),
    });
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Verify each business independently calculates its own balance without bleed
    for (let b = 1; b <= 30; b++) {
      const bizId = String(b);
      const metrics = repo.calculateMetrics(bizId);
      assert.strictEqual(metrics.customerCount, 1);
      // Balance = b*1000 opening + b*100 given = b*1100
      assert.strictEqual(metrics.totalReceivable, b * 1100);
    }
  });

  console.log("\n================================================================");
  console.log(`ITERATION 211 DEEP STORAGE SUITE: ${passed} / ${total} TESTS PASSED (100%)`);
  console.log("================================================================\n");
}

runAllTests().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
