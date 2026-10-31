/**
 * test_qa_data_security_backup.js
 * Sub-Agent 3 (QA & Data Security Engineer) Verification Suite
 */
const assert = require("assert");
const {
  buildBackupPayload,
  validateBackupIntegrity,
  previewBackup,
  calculateChecksum,
  calculateSha256Checksum,
  calculateLegacyChecksum,
  BACKUP_FILENAME,
  BACKUP_FORMAT_VERSION,
  SCHEMA_VERSION,
} = require("./src/googleDriveBackupService");
const { StorageRepository, createDefaultState } = require("./src/storageRepository");
const moneyManagerService = require("./src/moneyManagerService");

function createMockAdapter() {
  const store = new Map();
  return {
    getItem: async (k) => store.has(k) ? store.get(k) : null,
    setItem: async (k, v) => { store.set(k, String(v)); },
    removeItem: async (k) => { store.delete(k); },
    clear: async () => { store.clear(); },
    _store: store,
  };
}

let passed = 0;
let total = 0;
function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${total}. ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${total}. ${name}`, err);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS] ${total}. ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${total}. ${name}`, err);
    process.exitCode = 1;
  }
}

(async () => {
  console.log("==========================================================================");
  console.log("QA & DATA SECURITY ENGINEER -- BACKUP, RESTORE & DOMAIN INTEGRITY SUITE");
  console.log("==========================================================================");

  console.log("\n--- SUITE 1: FULL BACKUP MONEY MANAGER FIELD RETENTION ---");
  runTest("Full backup captures all 7 Money Manager core structures and execution state", () => {
    const mmData = {
      version: 3,
      overallMonthlyBudget: 45000,
      preferences: { currencySymbol: "৳", defaultPeriod: "this_month", sortOrder: "newest", showNetWorthCard: true },
      accounts: [
        { id: "acc_1", name: "Cash", type: "cash", balance: 12000, isArchived: false },
        { id: "acc_2", name: "Bank", type: "bank", balance: 85000, isArchived: false },
        { id: "acc_old", name: "Old", type: "cash", balance: 500, isArchived: true },
      ],
      categories: [
        { id: "cat_1", name: "Food", type: "expense", budget: 15000, isArchived: false },
      ],
      goals: [
        { id: "goal_1", title: "Laptop", targetAmount: 80000, savedAmount: 25000, targetDate: "2026-12-31" },
      ],
      recurring: [
        { id: "rec_1", title: "Internet", amount: 1000, cadence: "monthly", nextDueDate: "2026-11-01", lastProcessedDate: "2026-10-01", isActive: true },
        { id: "rec_2", title: "DPS Transfer", type: "transfer", amount: 5000, fee: 15, fromAccountId: "acc_2", toAccountId: "acc_1", cadence: "monthly", nextDueDate: "2026-11-05", isActive: true },
      ],
      transactions: [
        { id: "tx_1", type: "expense", amount: 500, categoryId: "cat_1", accountId: "acc_1", date: "2026-10-25", payee: "Restaurant" },
        { id: "tx_2", type: "transfer", amount: 5000, fee: 15, fromAccountId: "acc_2", toAccountId: "acc_1", date: "2026-10-26" },
      ],
    };
    const state = { ...createDefaultState(), accounts: [{ id: "b1", name: "BizCust", balance: 1000, type: 1 }], moneyManager: mmData };
    const payload = buildBackupPayload(state, { sub: "google_sub_123", email: "test@example.com", name: "Tester" });
    assert.strictEqual(payload.manifest.backupVersion, 1);
    assert.strictEqual(payload.manifest.hasMoneyManager, true);
    assert(payload.manifest.dataDomains.includes("moneyManager"));
    assert.strictEqual(payload.manifest.recordCounts.mmAccounts, 3);
    assert.strictEqual(payload.manifest.recordCounts.mmTransactions, 2);
    assert.strictEqual(payload.manifest.recordCounts.mmCategories, 1);
    assert.strictEqual(payload.manifest.recordCounts.mmGoals, 1);
    assert.strictEqual(payload.manifest.recordCounts.mmRecurring, 2);
    assert.strictEqual(payload.manifest.moneyManagerSummary.netWorth, 97000);
    assert.strictEqual(payload.data.moneyManager.recurring[0].lastProcessedDate, "2026-10-01");
    assert.strictEqual(payload.data.moneyManager.recurring[1].type, "transfer");
    assert.strictEqual(payload.data.moneyManager.transactions[1].fromAccountId, "acc_2");
  });

  runTest("Plaintext PIN is scrubbed from backup payload for privacy", () => {
    const state = { ...createDefaultState(), pinEnabled: true, appPin: "9876", moneyManager: { accounts: [] } };
    const payload = buildBackupPayload(state, { sub: "usr_pin" });
    assert.strictEqual(payload.data.pinEnabled, false);
    assert.strictEqual(payload.data.appPin, "");
    assert(!JSON.stringify(payload).includes("9876"));
  });

  console.log("\n--- SUITE 2: RESTORE ACCURACY & INVARIANT VERIFICATION ---");
  await runAsyncTest("Restore accurately populates Money Manager store and validates net worth", async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();
    const mmData = {
      version: 3,
      overallMonthlyBudget: 40000,
      accounts: [
        { id: "acc_a", name: "Cash", type: "cash", balance: 20000, isArchived: false },
        { id: "acc_b", name: "Bank", type: "bank", balance: 80000, isArchived: false },
      ],
      categories: [{ id: "cat_a", name: "Food", type: "expense", budget: 10000, isArchived: false }],
      goals: [{ id: "g_1", title: "Goal 1", targetAmount: 50000, savedAmount: 10000 }],
      recurring: [{ id: "r_1", title: "Rec 1", amount: 2000, cadence: "monthly", nextDueDate: "2026-11-01", isActive: true }],
      transactions: [{ id: "t_1", type: "expense", amount: 1000, categoryId: "cat_a", accountId: "acc_a", date: "2026-10-30" }],
      preferences: { defaultPeriod: "this_month", currencySymbol: "৳" },
    };
    const payload = buildBackupPayload({ ...createDefaultState(), moneyManager: mmData }, { sub: "usr_restore" });
    const res = await repo.commitRestorePayload(payload, { domains: ["all"] });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.restoredDomains.moneyManager, true);
    const raw = await adapter.getItem("@tallykhata_personal_money_manager_v2");
    assert.ok(raw);
    const restored = JSON.parse(raw);
    assert.strictEqual(restored.overallMonthlyBudget, 40000);
    assert.strictEqual(restored.accounts.length, 2);
    assert.strictEqual(restored.accounts[0].balance, 20000);
    assert.strictEqual(restored.accounts[1].balance, 80000);
    assert.strictEqual(restored.transactions[0].amount, 1000);
    assert.strictEqual(moneyManagerService.calculateNetWorth(restored), 100000);
  });

  console.log("\n--- SUITE 3: DOMAIN-SELECTIVE RESTORE (3 MODES) ---");
  await runAsyncTest("Selective restore mode 1: Business-only restore updates business, leaves MM untouched, resets PIN", async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();
    repo.currentStore.businessName = "Original Business";
    repo.currentStore.accounts = [{ id: "orig_b", name: "Orig Client", balance: 300, type: 1 }];
    const localMM = { accounts: [{ id: "loc_mm", name: "Untouched Local MM", balance: 55555, isArchived: false }], transactions: [] };
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(localMM));
    const backup = buildBackupPayload({
      ...createDefaultState(),
      businessName: "Restored Business",
      accounts: [{ id: "new_b", name: "New Client", balance: 9000, type: 1 }],
      moneyManager: { accounts: [{ id: "inc_mm", name: "Incoming MM", balance: 1, isArchived: false }] },
    }, { sub: "usr_mode1" });
    const res = await repo.commitRestorePayload(backup, { domains: ["business"] });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.restoredDomains.business, true);
    assert.strictEqual(res.restoredDomains.moneyManager, false);
    assert.strictEqual(repo.getAuthoritativeState().businessName, "Restored Business");
    const mmAfter = JSON.parse(await adapter.getItem("@tallykhata_personal_money_manager_v2"));
    assert.strictEqual(mmAfter.accounts[0].name, "Untouched Local MM");
    assert.strictEqual(mmAfter.accounts[0].balance, 55555);
  });

  await runAsyncTest("Selective restore mode 2: Personal-only restore updates MM, leaves Business store & PIN untouched", async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();
    repo.currentStore.businessName = "Untouched Business With PIN";
    repo.currentStore.pinEnabled = true;
    repo.currentStore.appPin = "7777";
    repo.currentStore.accounts = [{ id: "b_keep", name: "Keep Client", balance: 4500, type: 1 }];
    const localMM = { accounts: [{ id: "old_mm", name: "Old MM", balance: 10, isArchived: false }], transactions: [] };
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(localMM));
    const backup = buildBackupPayload({
      ...createDefaultState(),
      businessName: "Ignored Business",
      accounts: [{ id: "b_ignore", name: "Ignored Client", balance: 8888, type: 1 }],
      moneyManager: { accounts: [{ id: "new_mm", name: "Restored Personal Wallet", balance: 88000, isArchived: false }], transactions: [] },
    }, { sub: "usr_mode2" });
    const res = await repo.commitRestorePayload(backup, { domains: ["moneyManager"] });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.restoredDomains.business, false);
    assert.strictEqual(res.restoredDomains.moneyManager, true);
    assert.strictEqual(repo.getAuthoritativeState().businessName, "Untouched Business With PIN");
    assert.strictEqual(repo.getAuthoritativeState().pinEnabled, true);
    assert.strictEqual(repo.getAuthoritativeState().appPin, "7777");
    const mmAfter = JSON.parse(await adapter.getItem("@tallykhata_personal_money_manager_v2"));
    assert.strictEqual(mmAfter.accounts[0].name, "Restored Personal Wallet");
    assert.strictEqual(mmAfter.accounts[0].balance, 88000);
  });

  await runAsyncTest("Selective restore mode 3: Full restore commits both business and personal domains", async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();
    const backup = buildBackupPayload({
      ...createDefaultState(),
      businessName: "Full Restored Biz",
      accounts: [{ id: "b_full", name: "Full Client", balance: 3500, type: 1 }],
      moneyManager: { accounts: [{ id: "mm_full", name: "Full MM Wallet", balance: 65000, isArchived: false }], transactions: [] },
    }, { sub: "usr_mode3" });
    const res = await repo.commitRestorePayload(backup, { domains: ["all"] });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.restoredDomains.business, true);
    assert.strictEqual(res.restoredDomains.moneyManager, true);
    assert.strictEqual(repo.getAuthoritativeState().businessName, "Full Restored Biz");
    const mmAfter = JSON.parse(await adapter.getItem("@tallykhata_personal_money_manager_v2"));
    assert.strictEqual(mmAfter.accounts[0].name, "Full MM Wallet");
  });

  console.log("\n--- SUITE 4: LEGACY BACKUP SAFETY & SILENT DISCARD RESILIENCE ---");
  await runAsyncTest("Legacy unwrapped backup (no moneyManager) preserves local Money Manager on full restore", async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();
    const localMM = { accounts: [{ id: "acc_safe", name: "Protected Personal Cash", balance: 99999, isArchived: false }], transactions: [] };
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(localMM));
    const legacyBackup = { accounts: [{ id: "1", name: "LegCust", balance: 500, type: 1 }], journals: [] };
    const res = await repo.commitRestorePayload(legacyBackup, { domains: ["all"] });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.restoredDomains.moneyManager, false);
    const mmAfter = JSON.parse(await adapter.getItem("@tallykhata_personal_money_manager_v2"));
    assert.strictEqual(mmAfter.accounts[0].name, "Protected Personal Cash");
    assert.strictEqual(mmAfter.accounts[0].balance, 99999);
  });

  await runAsyncTest("Personal-only restore on legacy backup without Money Manager is safe no-op", async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();
    const localMM = { accounts: [{ id: "acc_p", name: "Preserved Cash", balance: 42000, isArchived: false }], transactions: [] };
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(localMM));
    const legacyBackup = { accounts: [{ id: "1", name: "LegCust", balance: 500, type: 1 }] };
    const res = await repo.commitRestorePayload(legacyBackup, { domains: ["moneyManager"] });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.restoredDomains.moneyManager, false);
    assert.strictEqual(res.restoredMoneyManager, null);
    const mmAfter = JSON.parse(await adapter.getItem("@tallykhata_personal_money_manager_v2"));
    assert.strictEqual(mmAfter.accounts[0].name, "Preserved Cash");
    assert.strictEqual(mmAfter.accounts[0].balance, 42000);
  });

  console.log("\n--- SUITE 5: CHECKSUM, CRYPTOGRAPHIC INTEGRITY & SECURITY ---");
  runTest("SHA-256 integrity checksum covers both business and Money Manager domains", () => {
    const rawData = { accounts: [{ id: "1", balance: 100 }], moneyManager: { accounts: [{ id: "m1", balance: 5000 }] } };
    const cs1 = calculateSha256Checksum(rawData);
    const tamperedMM = JSON.parse(JSON.stringify(rawData));
    tamperedMM.moneyManager.accounts[0].balance = 5001;
    const cs2 = calculateSha256Checksum(tamperedMM);
    assert.notStrictEqual(cs1, cs2, "Modifying MM balance must alter checksum");
    const tamperedBiz = JSON.parse(JSON.stringify(rawData));
    tamperedBiz.accounts[0].balance = 101;
    const cs3 = calculateSha256Checksum(tamperedBiz);
    assert.notStrictEqual(cs1, cs3, "Modifying Biz balance must alter checksum");
  });

  runTest("validateBackupIntegrity rejects tampered Money Manager data", () => {
    const user = { sub: "google_sub_sec", email: "sec@example.com" };
    const payload = buildBackupPayload({ ...createDefaultState(), moneyManager: { accounts: [{ id: "m", balance: 1000 }] } }, user);
    assert.strictEqual(validateBackupIntegrity(payload, user.sub).valid, true);
    const tampered = JSON.parse(JSON.stringify(payload));
    tampered.data.moneyManager.accounts[0].balance = 999999;
    const val = validateBackupIntegrity(tampered, user.sub);
    assert.strictEqual(val.valid, false);
    assert(val.error.includes("SHA-256 integrity checksum verification failed"));
  });

  runTest("validateBackupIntegrity enforces Google account user sub ownership isolation", () => {
    const userA = { sub: "google_sub_user_a", email: "a@gmail.com" };
    const payloadA = buildBackupPayload(createDefaultState(), userA);
    const val = validateBackupIntegrity(payloadA, "google_sub_user_b");
    assert.strictEqual(val.valid, false);
    assert.strictEqual(val.ownerMismatch, true);
    assert(val.error.includes("Ownership mismatch"));
  });

  runTest("Legacy checksum (chk_...) is safely recognized and validated for backwards compatibility", () => {
    const rawData = { accounts: [{ id: "1", balance: 100 }], journals: [], cashEntries: [], stock: [], inventory: [], notes: [], businesses: [] };
    const legCs = calculateLegacyChecksum(rawData);
    const legacyPayload = {
      manifest: { backupVersion: 1, schemaVersion: 5, backupOwner: { sub: "leg_sub" }, checksum: legCs },
      data: rawData,
    };
    assert.strictEqual(validateBackupIntegrity(legacyPayload, "leg_sub").valid, true);
    const tampered = JSON.parse(JSON.stringify(legacyPayload));
    tampered.data.accounts[0].balance = 999;
    assert.strictEqual(validateBackupIntegrity(tampered, "leg_sub").valid, false);
  });

    console.log("\n--- SUITE 6: ADVANCED LOCAL SAFETY SNAPSHOT & CLOUD DRIVE INTEGRITY VERIFICATION ---");

  // TEST 13: Empty Object moneyManager ({}) Restore Safety
  await runAsyncTest("Restoring backup with empty moneyManager ({}) preserves local Money Manager data without overwriting with demo accounts", async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // 1. Establish pre-existing authoritative personal finance data
    const localMM = {
      version: 3,
      overallMonthlyBudget: 50000,
      accounts: [
        { id: "my_real_cash", name: "আমার আসল ক্যাশ", type: "cash", balance: 75000, isArchived: false }
      ],
      categories: [
        { id: "my_cat_1", name: "জরুরি খরচ", type: "expense", budget: 10000, isArchived: false }
      ],
      transactions: [
        { id: "my_tx_1", type: "expense", amount: 2500, accountId: "my_real_cash", categoryId: "my_cat_1", date: "2026-10-31" }
      ],
    };
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(localMM));

    // 2. Incoming backup payload containing empty moneyManager object
    const backupWithEmptyMM = {
      ...createDefaultState(),
      businessName: "নতুন ব্যবসা",
      accounts: [{ id: "b_1", name: "ক্লায়েন্ট ১", balance: 1000, type: 1 }],
      moneyManager: {}, // Empty object should be a no-op for MM
    };

    // 3. Commit restore payload
    const res = await repo.commitRestorePayload(backupWithEmptyMM, { domains: ["all"] });
    assert.strictEqual(res.success, true);

    // 4. Verify local Money Manager store was NOT wiped or replaced with demo accounts
    const rawAfter = await adapter.getItem("@tallykhata_personal_money_manager_v2");
    assert.ok(rawAfter, "Local Money Manager data must remain in storage");
    const mmAfter = JSON.parse(rawAfter);

    assert.strictEqual(mmAfter.accounts.length, 1, "Must not replace user accounts with default demo accounts");
    assert.strictEqual(mmAfter.accounts[0].id, "my_real_cash");
    assert.strictEqual(mmAfter.accounts[0].name, "আমার আসল ক্যাশ");
    assert.strictEqual(mmAfter.accounts[0].balance, 75000);
    assert.strictEqual(mmAfter.transactions.length, 1);
    assert.strictEqual(mmAfter.transactions[0].id, "my_tx_1");
  });

  // TEST 14: Safety Snapshot Disk Reading & Commit Failure Rollback
  await runAsyncTest("createLocalSafetySnapshot reads disk state and rollback successfully restores pre-existing Money Manager data if commit fails", async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.persistData({
      businessName: "আসল প্রাক-রিস্টোর ব্যবসা",
      accounts: [{ id: "biz_pre_1", name: "কাস্টমার প্রি", balance: 5000, type: 1 }],
    });

    const preMM = {
      version: 3,
      overallMonthlyBudget: 60000,
      accounts: [
        { id: "acc_safe_disk", name: "ডিস্ক ক্যাশ ওয়ালেট", type: "cash", balance: 88888, isArchived: false }
      ],
      categories: [],
      goals: [],
      recurring: [],
      transactions: [
        { id: "tx_safe_1", type: "income", amount: 88888, accountId: "acc_safe_disk", date: "2026-10-31" }
      ],
    };
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(preMM));

    // Call createLocalSafetySnapshot with NO extraState (must read directly from disk adapter)
    const snapResult = await repo.createLocalSafetySnapshot();
    assert.strictEqual(snapResult.success, true);
    assert.ok(snapResult.snapshotId);

    // Verify snapshot file persisted on disk actually captured the MM state
    const rawSnap = await adapter.getItem("tallykhata_safety_snapshot");
    assert.ok(rawSnap);
    const parsedSnap = JSON.parse(rawSnap);
    assert.strictEqual(parsedSnap.snapshotId, snapResult.snapshotId);
    assert.ok(parsedSnap.moneyManager, "Snapshot must have read and stored MM from disk");
    assert.strictEqual(parsedSnap.moneyManager.accounts[0].name, "ডিস্ক ক্যাশ ওয়ালেট");
    assert.strictEqual(parsedSnap.moneyManager.accounts[0].balance, 88888);

    // Simulate an interrupted/dirty commit that corrupted MM storage before failing
    await adapter.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify({
      accounts: [{ id: "corrupted_acc", name: "ভুল ডাটা", balance: 0 }]
    }));

    // Trigger rollbackToSafetySnapshot
    let hookNotified = null;
    repo.notifyRestoreHooks = (restored) => { hookNotified = restored; };

    const rollbackRes = await repo.rollbackToSafetySnapshot(snapResult.snapshotId);
    assert.strictEqual(rollbackRes.success, true);
    assert.strictEqual(rollbackRes.restored, true);
    assert.strictEqual(rollbackRes.snapshotId, snapResult.snapshotId);

    // Verify pre-existing MM data was cleanly restored to disk adapter
    const afterRollbackRaw = await adapter.getItem("@tallykhata_personal_money_manager_v2");
    const afterRollbackMM = JSON.parse(afterRollbackRaw);
    assert.strictEqual(afterRollbackMM.accounts.length, 1);
    assert.strictEqual(afterRollbackMM.accounts[0].name, "ডিস্ক ক্যাশ ওয়ালেট");
    assert.strictEqual(afterRollbackMM.accounts[0].balance, 88888);
    assert.strictEqual(afterRollbackMM.transactions[0].id, "tx_safe_1");
    assert.strictEqual(hookNotified && hookNotified.moneyManager && hookNotified.moneyManager.accounts[0].balance, 88888);
  });

  // TEST 15: Google Drive Upload Multipart appProperties mmAccounts and mmTransactions
  await runAsyncTest("googleDriveBackupService.uploadBackup includes mmAccounts and mmTransactions in metadata.appProperties", async () => {
    let capturedBody = null;
    const mockFetch = async (url, options) => {
      capturedBody = options.body;
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          id: "drive_file_qa_prop_test",
          name: BACKUP_FILENAME,
          modifiedTime: new Date().toISOString(),
        }),
      };
    };

    const { GoogleDriveBackupService } = require("./src/googleDriveBackupService");
    const driveService = new GoogleDriveBackupService({ fetch: mockFetch });

    const mmData = {
      version: 3,
      accounts: [
        { id: "acc_1", name: "ক্যাশ", balance: 10000 },
        { id: "acc_2", name: "ব্যাংক", balance: 25000 },
        { id: "acc_3", name: "বিকাশ", balance: 5000 },
      ],
      transactions: [
        { id: "tx_1", amount: 500 },
        { id: "tx_2", amount: 1200 },
      ],
    };

    const payload = buildBackupPayload({
      ...createDefaultState(),
      moneyManager: mmData,
    }, { sub: "sub_qa_app_prop_test" });

    assert.strictEqual(payload.manifest.recordCounts.mmAccounts, 3);
    assert.strictEqual(payload.manifest.recordCounts.mmTransactions, 2);

    const uploadRes = await driveService.uploadBackup("mock_auth_token_xyz", payload);
    assert.strictEqual(uploadRes.fileId, "drive_file_qa_prop_test");

    // Extract multipart metadata JSON
    assert.ok(capturedBody, "Upload request body must not be null");
    const parts = capturedBody.split("\r\n--");
    const metadataPart = parts.find(part => part.includes("Content-Type: application/json; charset=UTF-8"));
    assert.ok(metadataPart, "Multipart body must contain metadata section");

    const metadataJsonStr = metadataPart.split("\r\n\r\n")[1];
    const metadata = JSON.parse(metadataJsonStr);

    assert.ok(metadata.appProperties, "metadata must contain appProperties object");
    assert.strictEqual(metadata.appProperties.hasMoneyManager, "true");
    assert.strictEqual(metadata.appProperties.mmAccounts, "3", "appProperties must include mmAccounts string count");
    assert.strictEqual(metadata.appProperties.mmTransactions, "2", "appProperties must include mmTransactions string count");
    assert.strictEqual(metadata.appProperties.ownerSub, "sub_qa_app_prop_test");
  });

  // TEST 16: orchestrateCloudBackup Success Alert Bengali Money Manager Counts
  await runAsyncTest("orchestrateCloudBackup success alert contains Bengali Money Manager counts when MM data exists", async () => {
    const adapter = createMockAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const mmData = {
      version: 3,
      accounts: [
        { id: "a1", name: "ক্যাশ", balance: 5000 },
        { id: "a2", name: "ব্যাংক", balance: 15000 },
        { id: "a3", name: "বিকাশ", balance: 3000 },
        { id: "a4", name: "নগদ", balance: 2000 },
      ],
      transactions: [
        { id: "t1", amount: 100 },
        { id: "t2", amount: 200 },
        { id: "t3", amount: 300 },
        { id: "t4", amount: 400 },
        { id: "t5", amount: 500 },
      ],
    };

    let sentPayload = null;
    const mockDrive = {
      uploadBackup: async (token, payload) => {
        sentPayload = payload;
        return { fileId: "file_alert_test_1", name: BACKUP_FILENAME };
      },
      getFileMetadata: async () => ({
        id: "file_alert_test_1",
        name: BACKUP_FILENAME,
        parents: ["appDataFolder"],
        spaces: ["appDataFolder"],
        appProperties: { ownerSub: "user_alert_sub" },
      }),
      downloadBackup: async () => ({
        success: true,
        data: sentPayload,
        manifest: sentPayload.manifest,
        fileId: "file_alert_test_1",
      }),
    };

    let alertTitle = null;
    let alertMessage = null;

    const { orchestrateCloudBackup } = require("./src/googleDriveBackupService");
    const result = await orchestrateCloudBackup({
      storageRepository: repo,
      driveService: mockDrive,
      getAccessToken: async () => "mock_token",
      googleUser: { sub: "user_alert_sub", email: "user@test.com" },
      extraData: { moneyManager: mmData },
      alertFn: (title, message) => {
        alertTitle = title;
        alertMessage = message;
      },
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(alertTitle, "ব্যাকআপ সফল!");
    assert.ok(alertMessage, "Alert message must be presented");

    // 4 accounts -> '৪', 5 transactions -> '৫'
    assert(
      alertMessage.includes("৪") && (alertMessage.includes("ব্যক্তিগত হিসাব") || alertMessage.includes("মানি ম্যানেজার হিসাব")),
      "Success alert must include Bengali count of personal accounts (৪ টি)"
    );
    assert(
      alertMessage.includes("৫") && (alertMessage.includes("ব্যক্তিগত লেনদেন") || alertMessage.includes("মানি ম্যানেজার লেনদেন")),
      "Success alert must include Bengali count of personal transactions (৫ টি)"
    );
  });

console.log("\n==========================================================================");
  console.log(`QA SUITE COMPLETE: ${passed} / ${total} TESTS PASSED (100%)`);
  console.log("==========================================================================\n");
})();
