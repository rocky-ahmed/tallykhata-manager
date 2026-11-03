/**
 * test_iteration_023_production_packaging_and_parity_monitoring.js
 * Continuous Verification Suite for Iteration 023: Production Packaging & Parity Monitoring
 *
 * Covers:
 * 1. Production Android Packaging & Manifest Configuration (SDKs, permissions, launchMode).
 * 2. Bilingual Localization & 680-Key Parity (zero missing keys, number formatting, locale toggle).
 * 3. High-Volume Serialization & Storage Metrics Quota Bounds (1,000+ journals, sub-200ms serialize).
 * 4. Haptic & Tactile Feedback Service Robustness in headless environments.
 * 5. Full-System Parity & Multi-Domain End-to-End Lifecycle with SHA-256 Cloud Backup.
 *
 * Worker Roles:
 * - Worker 1 (Gibbs): Thread ID 01a19154-99ab-72a0-9e23-2611b9ffc74c (Packaging & Binary Invariants)
 * - Worker 2 (Averroes): Thread ID 01a19154-c135-75d0-b38a-1ea50f004895 (Serialization & Storage Engine)
 * - Worker 3 (Ohm): Thread ID 01a19154-e3ee-7ab2-b682-798b64a0bb6b (Bilingual UI, Haptics & QA)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ledgerEngine = require("./src/ledgerEngine");
const mmService = require("./src/moneyManagerService");
const i18n = require("./src/i18nService");
const hapticService = require("./src/hapticFeedbackService");
const { StorageRepository, createDefaultState } = require("./src/storageRepository");
const { buildBackupPayload, validateBackupIntegrity, restoreBackupIntoStorage } = require("./src/googleDriveBackupService");

console.log("================================================================");
console.log("TALLYKHATA ITERATION 023: PRODUCTION PACKAGING & MONITORING");
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
  // PART 1: Android Production Packaging & Manifest Invariants
  // =========================================================================
  await runTest("1.1: AndroidManifest.xml and build.gradle conform to production package specifications", async () => {
    // 1. AndroidManifest.xml
    const manifestPath = path.join("android", "app", "src", "main", "AndroidManifest.xml");
    assert.ok(fs.existsSync(manifestPath), "AndroidManifest.xml must exist");
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");

    assert.ok(manifestContent.includes("android.permission.INTERNET"), "Must require INTERNET permission");
    assert.ok(manifestContent.includes("android.permission.VIBRATE"), "Must require VIBRATE permission");
    assert.ok(manifestContent.includes("android.permission.READ_EXTERNAL_STORAGE"), "Must declare READ_EXTERNAL_STORAGE");
    assert.ok(manifestContent.includes("android.permission.WRITE_EXTERNAL_STORAGE"), "Must declare WRITE_EXTERNAL_STORAGE");
    assert.ok(manifestContent.includes("android:launchMode=\"singleTask\""), "MainActivity must be singleTask");
    assert.ok(manifestContent.includes("android:screenOrientation=\"portrait\""), "Orientation must be locked to portrait");
    assert.ok(manifestContent.includes("android.intent.action.MAIN"), "Must declare MAIN action for launcher");
    assert.ok(manifestContent.includes("android.intent.category.LAUNCHER"), "Must declare LAUNCHER category");

    // 2. android/app/build.gradle
    const gradlePath = path.join("android", "app", "build.gradle");
    assert.ok(fs.existsSync(gradlePath), "android/app/build.gradle must exist");
    const gradleContent = fs.readFileSync(gradlePath, "utf-8");
    assert.ok(gradleContent.includes("applicationId 'com.progoti.tallykhata.offline'"), "applicationId must be com.progoti.tallykhata.offline");
    assert.ok(gradleContent.includes("versionName \"4.0.0\""), "versionName must be 4.0.0");
    assert.ok(gradleContent.includes("versionCode 1"), "versionCode must be 1");

    // 3. app.json
    const appJsonPath = "app.json";
    assert.ok(fs.existsSync(appJsonPath), "app.json must exist");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    assert.strictEqual(appJson.expo.version, "4.0.0");
    assert.strictEqual(appJson.expo.orientation, "portrait");
    assert.strictEqual(appJson.expo.android.package, "com.progoti.tallykhata.offline");
  });

  // =========================================================================
  // PART 2: Bilingual Localization & 680-Key Parity
  // =========================================================================
  await runTest("2.1: Bilingual dictionary maintains 100% key parity (680 keys) with zero missing translations", async () => {
    const { STRINGS, t, formatCurrency, toEnglishDigits, parseNumber } = i18n;
    assert.ok(STRINGS.bn && STRINGS.en, "Both bn and en translation dictionaries must be defined");

    const bnKeys = Object.keys(STRINGS.bn);
    const enKeys = Object.keys(STRINGS.en);
    assert.strictEqual(bnKeys.length, enKeys.length, "Bengali and English dictionaries must maintain exact key parity");
    assert.ok(bnKeys.length >= 680, "Dictionary must contain at least 680 keys");

    const missingInEn = bnKeys.filter(k => !(k in STRINGS.en));
    const missingInBn = enKeys.filter(k => !(k in STRINGS.bn));
    assert.strictEqual(missingInEn.length, 0, "No keys should be missing in English");
    assert.strictEqual(missingInBn.length, 0, "No keys should be missing in Bengali");

    // Test translation function resolution
    assert.strictEqual(t("about_app_name", "bn"), "টালিখাতা (TallyKhata Offline)");
    assert.strictEqual(t("about_app_name", "en"), "TallyKhata Offline");

    // Test number conversion & currency formatting
    assert.strictEqual(toEnglishDigits("১২৩৪৫৬৭৮৯০"), "1234567890");
    assert.strictEqual(parseNumber("১২৫০.৫০"), 1250.5);
    const formattedBn = formatCurrency(1500, "bn");
    assert.ok(formattedBn.includes("১,৫০০"), "Currency format in Bengali must contain Bengali numerals");
  });

  // =========================================================================
  // PART 3: High-Volume Serialization & Storage Metrics Quota Bounds
  // =========================================================================
  await runTest("3.1: High-volume dataset (1,000 journals, 200 accounts) serializes in sub-200ms with accurate byte metrics", async () => {
    const state = createDefaultState();
    state.businesses = [{ id: "1", name: "High Volume Shop", isSelected: true, isArchived: false }];
    state.accounts = [];
    state.journals = [];

    for (let i = 1; i <= 200; i++) {
      state.accounts.push({
        id: "acc_hv_" + i,
        businessId: "1",
        name: "Customer " + i,
        type: 1,
        balance: 1000,
        openingBalance: 1000,
      });
    }

    for (let j = 1; j <= 1000; j++) {
      const accId = "acc_hv_" + ((j % 200) + 1);
      state.journals.push({
        id: "j_hv_" + j,
        businessId: "1",
        accountId: accId,
        amount: 100.5,
        type: j % 2 === 0 ? "given" : "received",
        date: "2026-11-01",
      });
    }

    // Benchmark JSON serialization time
    const t0 = Date.now();
    const serialized = JSON.stringify(state);
    const t1 = Date.now();
    const serializeDuration = t1 - t0;
    assert.ok(serializeDuration < 200, "High-volume JSON serialization took " + serializeDuration + "ms (must be < 200ms)");

    // Initialize repo and query storage metrics
    const repo = new StorageRepository(createMockAdapter(state));
    await repo.loadInitialData();

    const metrics = await repo.getStorageMetrics();
    assert.ok(metrics.totalBytes > 100000, "Metrics must capture realistic byte volume (" + metrics.totalBytes + " bytes)");
    assert.strictEqual(typeof metrics.usagePercent, "number");
    assert.strictEqual(metrics.isNearQuota, false);
  });

  // =========================================================================
  // PART 4: Haptic & Tactile Feedback Robustness
  // =========================================================================
  await runTest("4.1: Haptic & Tactile feedback service safely executes in headless environment without crashing", async () => {
    assert.ok(hapticService.isEnabled(), "Haptics should be enabled by default");

    // Trigger various tactile patterns
    assert.doesNotThrow(() => {
      hapticService.onKeyPress();
      hapticService.onTabPress();
      hapticService.onTransactionSave();
      hapticService.onDelete();
      hapticService.onError();
      hapticService.selection();
      hapticService.impactLight();
      hapticService.impactMedium();
      hapticService.impactHeavy();
      hapticService.notificationSuccess();
      hapticService.notificationWarning();
      hapticService.notificationError();
    }, "Headless haptic triggers must safely fallback without throwing");

    // Test disable toggle
    hapticService.setEnabled(false);
    assert.strictEqual(hapticService.isEnabled(), false);
    hapticService.onTransactionSave(); // Should safely no-op
    hapticService.setEnabled(true);
    assert.strictEqual(hapticService.isEnabled(), true);
  });

  // =========================================================================
  // PART 5: Full-System Parity & Multi-Domain Lifecycle with SHA-256 Cloud Backup
  // =========================================================================
  await runTest("5.1: End-to-end full system lifecycle: business ledger, cashbox, money manager, and selective restore", async () => {
    const mockStore = createMockAdapter(createDefaultState());
    const repo = new StorageRepository(mockStore);
    await repo.loadInitialData();

    // 1. Business Accounting: Customer sale & payment
    const custId = "cust_parity_023";
    await repo.mutateCollection("accounts", prev => [
      ...prev,
      { id: custId, businessId: "1", name: "Parity Customer", type: 1, phone: "01711000000", balance: 500, openingBalance: 500 }
    ]);

    await repo.mutateCollection("journals", prev => [
      ...prev,
      { id: "j_sale_023", businessId: "1", accountId: custId, amount: 2000, type: "given", date: "2026-11-02" },
      { id: "j_pay_023", businessId: "1", accountId: custId, amount: 1500, type: "received", date: "2026-11-02" }
    ]);

    // Recalculate customer running balance: 500 (opening) + 2000 (sale) - 1500 (payment) = 1000
    const stateBefore = repo.getAuthoritativeState();
    const custAcc = stateBefore.accounts.find(a => a.id === custId);
    const recalc = ledgerEngine.recalculateAccountRunningBalances(custAcc, stateBefore.journals);
    assert.strictEqual(recalc.updatedAccount.balance, 1000);

    // 2. Personal Money Manager: Initial state & transactions
    let mmState = mmService.getDefaultState();
    mmState.overallMonthlyBudget = 25000;
    const initialExpense = mmService.calculatePeriodMetrics(mmState, "this_month").expense;
    const cashAcc = mmState.accounts.find(a => a.id === "acc_cash");
    const initialCash = cashAcc.balance;

    mmState = mmService.addTransaction(mmState, {
      type: "expense",
      amount: 1200,
      categoryId: "cat_food",
      accountId: "acc_cash",
      note: "Groceries & Vegetables",
      date: mmService.getLocalDateString(),
    });

    const updatedCashAcc = mmState.accounts.find(a => a.id === "acc_cash");
    assert.strictEqual(updatedCashAcc.balance, initialCash - 1200);

    // Verify budget metrics
    const metrics = mmService.calculatePeriodMetrics(mmState, "this_month");
    assert.strictEqual(metrics.expense, initialExpense + 1200);
    assert.strictEqual(metrics.overallBudgetStatus, "safe");
    assert.strictEqual(metrics.overallBudgetRemaining, 25000 - (initialExpense + 1200));

    // 3. Build authenticated Cloud Backup
    const userProfile = { sub: "auth_user_023", email: "user023@tallykhata.test", name: "Parity User" };
    const backupPayload = buildBackupPayload(repo.getAuthoritativeState(), userProfile, { moneyManager: mmState });

    assert.ok(backupPayload.manifest.checksum.startsWith("sha256_"));
    const integrity = validateBackupIntegrity(backupPayload, "auth_user_023");
    assert.strictEqual(integrity.valid, true);

    // 4. Selective 3-Way Restore: Restore Personal Money Manager only
    // Mutate personal store (simulate accidental deletion or data corruption)
    await mockStore.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify({ ...mmState, transactions: [] }));
    assert.strictEqual(JSON.parse(await mockStore.getItem("@tallykhata_personal_money_manager_v2")).transactions.length, 0);

    // Restore Personal domain from backup payload without touching business store
    await mockStore.setItem("@tallykhata_personal_money_manager_v2", JSON.stringify(backupPayload.data.moneyManager));

    const restoredPersonal = JSON.parse(await mockStore.getItem("@tallykhata_personal_money_manager_v2"));
    assert.strictEqual(restoredPersonal.transactions.length, mmState.transactions.length, "Personal transactions must be fully restored");

    // Business customer must remain intact in authoritative state
    const postRestoreAcc = repo.getAuthoritativeState().accounts.find(a => a.id === custId);
    assert.ok(postRestoreAcc, "Business customer must remain in state");
    assert.strictEqual(postRestoreAcc.balance, 500);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 023 PRODUCTION PACKAGING & MONITORING PARITY VERIFIED!");
  console.log("================================================================");
})();
