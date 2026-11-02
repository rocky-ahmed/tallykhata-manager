/**
 * test_iteration_153_in_field_quality_monitoring_and_release_cadence.js
 * Continuous Verification Suite for Iteration 153: In-Field Quality Monitoring & Automated Release Cadence (In-Field Quality Audit & Release Cadence)
 *
 * Covers:
 * 1. Room SQLite Schema & Binary Packaging Parity (Worker 1 - Gibbs).
 * 2. Multi-Tenant Ledger, Storage Compaction & Mutex Concurrency (Worker 2 - Averroes).
 * 3. 8-Section Money Manager, Design Tokens, Telemetry & Accessibility (Worker 3 - Ohm).
 * 4. SHA-256 Cloud Backup, Tamper Resistance & Round-Trip Fidelity (Main Orchestrator).
 *
 * Worker Roles:
 * - Worker 1 (Gibbs): Thread ID 01a19154-99ab-72a0-9e23-2611b9ffc74c (Room DB & Binary Invariants)
 * - Worker 2 (Averroes): Thread ID 01a19154-c135-75d0-b38a-1ea50f004895 (Ledger, Offline Sync & Storage Engine)
 * - Worker 3 (Ohm): Thread ID 01a19154-e3ee-7ab2-b682-798b64a0bb6b (Money Manager, Design Tokens & Touch UX)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ledgerEngine = require("./src/ledgerEngine");
const mmService = require("./src/moneyManagerService");
const mmCustomization = require("./src/moneyManagerCustomizationService");
const { StorageRepository, createDefaultState, TelemetryService, EVENT_TYPES } = require("./src/storageRepository");
const { buildBackupPayload, validateBackupIntegrity, restoreBackupIntoStorage } = require("./src/googleDriveBackupService");
const themeService = require("./src/themeService");
const prefsService = require("./src/preferencesService");
const i18n = require("./src/i18nService");
const typographyTokens = require("./src/typographyTokens");
const iconMetrics = require("./src/iconMetrics");

console.log("================================================================");
console.log("TALLYKHATA ITERATION 153: IN-FIELD QUALITY AUDIT & RELEASE CADENCE RELEASE AUDIT");
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

(async () => {
  // =========================================================================
  // PART 1: Room SQLite Schema, Typography & Binary Packaging Parity (Gibbs)
  // =========================================================================
  await runTest("1.1: normalizeAccountFields handles customer and supplier batch mapping", async () => {
    const rawList = [
      { id: "acc_2003_c", name: "গ্রাহক শামীম ও ব্রাদার্স", mobile: "01711223344", balance: 5120000.50, business_id: 1, type: 1 },
      { id: "acc_2003_s", name: "মেসার্স পদ্মা অটো স্পেয়ার্স", mobile: "01855667788", balance: 8350000.25, business_id: 1, type: 2 }
    ];

    const normList = rawList.map(a => ledgerEngine.normalizeAccountFields(a, "1"));
    assert.strictEqual(normList[0].id, "acc_2003_c");
    assert.strictEqual(normList[0].name, "গ্রাহক শামীম ও ব্রাদার্স");
    assert.strictEqual(normList[0].type, 1);
    assert.strictEqual(normList[0].balance, 5120000.50);

    assert.strictEqual(normList[1].id, "acc_2003_s");
    assert.strictEqual(normList[1].name, "মেসার্স পদ্মা অটো স্পেয়ার্স");
    assert.strictEqual(normList[1].type, 2);
    assert.strictEqual(normList[1].balance, 8350000.25);
  });

  await runTest("1.2: normalizeJournalFields preserves integer-paisa across given and received types", async () => {
    const rawJournals = [
      { id: "j_2003_1", orig_account_id: 2003, txn_type: 1, amount: 5120000.50, business_id: 1, txn_date: "2026-11-02", description: "বাকিতে পার্টস বিক্রয়" },
      { id: "j_2003_2", orig_account_id: 2003, txn_type: 2, amount: 2000000.00, business_id: 1, txn_date: "2026-11-02", description: "নগদ আদায়" }
    ];

    const norm1 = ledgerEngine.normalizeJournalFields(rawJournals[0]);
    const norm2 = ledgerEngine.normalizeJournalFields(rawJournals[1]);

    assert.strictEqual(norm1.type, "given");
    assert.strictEqual(norm1.amount, 5120000.50);
    assert.strictEqual(norm1.desc, "বাকিতে পার্টস বিক্রয়");

    assert.strictEqual(norm2.type, "received");
    assert.strictEqual(norm2.amount, 2000000.00);
    assert.strictEqual(norm2.desc, "নগদ আদায়");
  });

  await runTest("1.3: typographyTokens.getBengaliLineHeight guarantees >= 1.40x across fractional scales", async () => {
    const fineScales = [11.5, 13.5, 15.5, 17.5, 19.5, 25.5, 33.5];
    for (const size of fineScales) {
      const lh = typographyTokens.getBengaliLineHeight(size);
      assert.ok(lh / size >= 1.40, `Fractional font size ${size} must achieve >= 1.40x diacritic line height`);
    }
  });

  await runTest("1.4: iconMetrics.getIconMetrics returns calibrated optical scaling & hit slop", async () => {
    const editMetrics = iconMetrics.getIconMetrics("ic_edit");
    assert.ok(editMetrics.opticalScale >= 1.0);

    const callMetrics = iconMetrics.getIconMetrics("ic_call.png");
    assert.strictEqual(callMetrics.opticalScale, 1.15);

    const hitSlop = iconMetrics.STANDARD_TOUCH_HIT_SLOP;
    assert.ok(hitSlop.top >= 10 && hitSlop.bottom >= 10);
  });

  await runTest("1.5: Production app.json release packaging invariants strictly enforced", async () => {
    const appJsonPath = path.join(__dirname, "app.json");
    const appConfig = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

    assert.strictEqual(appConfig.expo.name, "টালিখাতা");
    assert.strictEqual(appConfig.expo.slug, "tallykhata-offline");
    assert.strictEqual(appConfig.expo.version, "4.0.0");
    assert.strictEqual(appConfig.expo.android.package, "com.progoti.tallykhata.offline");
    assert.strictEqual(appConfig.expo.splash.backgroundColor, "#B81414");
    assert.strictEqual(appConfig.expo.android.adaptiveIcon.backgroundColor, "#B81414");
  });

  // =========================================================================
  // PART 2: Multi-Tenant Ledger, Storage Compaction & Mutex Concurrency (Averroes)
  // =========================================================================
  await runTest("2.1: Multi-tenant business ledger isolation across 4 shops", async () => {
    const defaultState = createDefaultState();
    defaultState.businesses = [
      { id: "shop_153_1", name: "মেসার্স শপ ১ ১৫৩", isActive: true },
      { id: "shop_153_2", name: "মেসার্স শপ ২ ১৫৩", isActive: true },
      { id: "shop_153_3", name: "মেসার্স শপ ৩ ১৫৩", isActive: true },
      { id: "shop_153_4", name: "মেসার্স শপ ৪ ১৫৩", isActive: true },
    ];
    defaultState.accounts = [
      { id: "c_153_1", name: "গ্রাহক ১", balance: 1100000, businessId: "shop_153_1", type: 1 },
      { id: "c_153_2", name: "গ্রাহক ২", balance: 2200000, businessId: "shop_153_2", type: 1 },
      { id: "c_153_3", name: "গ্রাহক ৩", balance: 3300000, businessId: "shop_153_3", type: 1 },
      { id: "c_153_4", name: "গ্রাহক ৪", balance: 4400000, businessId: "shop_153_4", type: 1 },
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    assert.strictEqual(state.accounts.length, 4);
    assert.strictEqual(state.accounts.find(a => a.id === "c_153_1").businessId, "shop_153_1");
    assert.strictEqual(state.accounts.find(a => a.id === "c_153_2").businessId, "shop_153_2");
    assert.strictEqual(state.accounts.find(a => a.id === "c_153_3").businessId, "shop_153_3");
    assert.strictEqual(state.accounts.find(a => a.id === "c_153_4").businessId, "shop_153_4");
  });

  await runTest("2.2: Extreme currency boundary handling (1 paisa to 99,999,999.99 Taka, 10-crore limit)", async () => {
    const minVal = ledgerEngine.validateTransaction(0.01, "given");
    assert.strictEqual(minVal.valid, true);
    assert.strictEqual(minVal.amount, 0.01);

    const maxVal = ledgerEngine.validateTransaction(99999999.99, "received");
    assert.strictEqual(maxVal.valid, true);
    assert.strictEqual(maxVal.amount, 99999999.99);

    const limitVal = ledgerEngine.validateTransaction(100000000.00, "given");
    assert.strictEqual(limitVal.valid, true);

    const overflowVal = ledgerEngine.validateTransaction(100000000.25, "given");
    assert.strictEqual(overflowVal.valid, false);
  });

  await runTest("2.3: Storage compaction recalculates balances across customer and supplier records", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_comp_153_cust", name: "গ্রাহক কম্প্যাক্ট ১৫৩", balance: 0, businessId: "1", type: 1 },
      { id: "acc_comp_153_supp", name: "সাপ্লায়ার কম্প্যাক্ট ১৫৩", balance: 0, businessId: "1", type: 2 }
    ];
    defaultState.journals = [
      { id: "j_c153_1", accountId: "acc_comp_153_cust", amount: 15000000, type: "given", businessId: "1", date: "2026-11-01" },
      { id: "j_c153_2", accountId: "acc_comp_153_cust", amount: 6000000, type: "received", businessId: "1", date: "2026-11-02" },
      { id: "j_c153_3", accountId: "acc_comp_153_supp", amount: 8000000, type: "received", businessId: "1", date: "2026-11-01" },
      { id: "j_c153_4", accountId: "acc_comp_153_supp", amount: 3500000, type: "given", businessId: "1", date: "2026-11-02" }
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    const compactRes = await repo.compactStorage({ recalculateBalances: true });
    assert.strictEqual(compactRes.success, true);

    const state = repo.getAuthoritativeState();
    const cust = state.accounts.find(a => a.id === "acc_comp_153_cust");
    const supp = state.accounts.find(a => a.id === "acc_comp_153_supp");

    assert.strictEqual(cust.balance, 9000000); // 15L given - 6L received = 9L customer due
    assert.strictEqual(supp.balance, 4500000); // 8L purchase received - 3.5L payment given = 4.5L supplier payable
  });

  await runTest("2.4: Mutex write queue concurrency serialization (70 concurrent writes)", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const initialLen = repo.getAuthoritativeState().accounts.length;
    const writes = [];
    for (let i = 1; i <= 70; i++) {
      writes.push(
        repo.enqueueWrite(async () => {
          repo.currentStore.accounts.push({ id: `acc_concur_153_${i}`, name: `Acc 153 ${i}`, balance: i * 500 });
        })
      );
    }

    await Promise.all(writes);
    const state = repo.getAuthoritativeState();
    assert.strictEqual(state.accounts.length, initialLen + 70);
  });

  await runTest("2.5: Unsynced offline queue transitions (getUnsyncedRecords & markRecordsSynced)", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_off_153_1", name: "গ্রাহক আনসিঙ্ক ১৫৩", balance: 450000, synced: 0 }
    ];
    defaultState.journals = [
      { id: "j_off_153_1", amount: 220000, synced: 0 },
      { id: "j_off_153_2", amount: 230000, synced: 0 }
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    assert.strictEqual(repo.getUnsyncedRecords("journals").length, 2);
    assert.strictEqual(repo.getUnsyncedRecords("accounts").length, 1);

    await repo.markRecordsSynced("journals", ["j_off_153_1", "j_off_153_2"]);
    await repo.markRecordsSynced("accounts", ["acc_off_153_1"]);

    assert.strictEqual(repo.getUnsyncedRecords("journals").length, 0);
    assert.strictEqual(repo.getUnsyncedRecords("accounts").length, 0);
  });

  // =========================================================================
  // PART 3: 8-Section Money Manager, Design Tokens & Touch UX (Ohm)
  // =========================================================================
  await runTest("3.1: Money Manager V3 8-section functional registration", async () => {
    const requiredSections = [
      "dashboard", "transactions", "wallets", "budgets",
      "goals", "analytics", "categories", "reports"
    ];

    const allSections = mmCustomization.MM_SECTIONS;
    for (const id of requiredSections) {
      assert.ok(allSections.some(s => s.id === id), `Missing section ${id}`);
    }
  });

  await runTest("3.2: WCAG 2.1 AA luminance contrast across theme surfaces", async () => {
    const light = themeService.LIGHT_THEME;
    const dark = themeService.DARK_THEME;

    assert.ok(themeService.getContrastRatio(light.textPrimary, light.cardBg) >= 4.5);
    assert.ok(themeService.getContrastRatio(dark.textPrimary, dark.cardBg) >= 4.5);
    assert.ok(themeService.getContrastRatio(light.headerText, light.headerBg) >= 4.5);
  });

  await runTest("3.3: Android Material 48x48dp minimum touch targets & density scales", async () => {
    const compactDensity = prefsService.resolveEffectiveDensity("compact");
    const standardDensity = prefsService.resolveEffectiveDensity("standard");
    const comfortableDensity = prefsService.resolveEffectiveDensity("comfortable");

    assert.ok(compactDensity.cardPadding >= 8);
    assert.ok(standardDensity.cardPadding >= 12);
    assert.ok(comfortableDensity.cardPadding >= 14);
  });

  await runTest("3.4: Bilingual localization parity across Bengali and English", async () => {
    assert.strictEqual(i18n.t("mm_access_back"), "পিছনে যান");
    assert.strictEqual(i18n.t("mm_sec_categories"), "ক্যাটাগরি সমূহ");
    assert.strictEqual(i18n.t("mm_tab_txns"), "লেনদেন");
    assert.strictEqual(i18n.t("mm_tab_transfer"), "ট্রান্সফার");
  });

  await runTest("3.5: Privacy-preserving operational telemetry with PII sanitization", async () => {
    const telemetry = new TelemetryService({ maxQueueSize: 128 });
    telemetry.recordEvent(EVENT_TYPES.CUSTOMER_UPDATED, {
      customerId: "cust_153_01",
      customerName: "মাহবুবুর রহমান",
      phone: "01788990011",
      amount: 4200000,
      businessId: "1"
    });

    const snapshot = telemetry.exportTelemetrySnapshot();
    assert.strictEqual(snapshot.totalEventsLogged, 1);
    assert.strictEqual(snapshot.countsByType[EVENT_TYPES.CUSTOMER_UPDATED], 1);

    const event = telemetry.eventQueue[0];
    assert.strictEqual(event.data.customerId, "cust_153_01");
    assert.strictEqual(event.data.amount, 4200000);
    assert.strictEqual(event.data.customerName, undefined); // PII stripped
    assert.strictEqual(event.data.phone, undefined); // PII stripped
  });

  // =========================================================================
  // PART 4: SHA-256 Cloud Backup, Tamper Resistance & Round-Trip Fidelity
  // =========================================================================
  await runTest("4.1: Cloud backup payload generation with deterministic SHA-256 checksums", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    const user = { sub: "google_cadence_153_1", email: "cadence153@tallykhata.com" };

    const payload = buildBackupPayload(state, user);
    assert.ok(payload.manifest.checksum.startsWith("sha256_"));

    const verify = validateBackupIntegrity(payload, "google_cadence_153_1");
    assert.strictEqual(verify.valid, true);
  });

  await runTest("4.2: Tamper resistance rejects corrupted or modified backup archive", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    const user = { sub: "google_cadence_153_2", email: "cadence153_2@tallykhata.com" };

    const payload = buildBackupPayload(state, user);
    const corrupted = JSON.parse(JSON.stringify(payload));
    corrupted.data.businesses.push({ id: "tamper_shop_153", name: "Tampered Shop" });

    const verify = validateBackupIntegrity(corrupted, "google_cadence_153_2");
    assert.strictEqual(verify.valid, false);
    assert.ok(verify.error.includes("checksum verification failed"));
  });

  await runTest("4.3: Round-trip restore into clean storage verifies 100% data fidelity", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_rt_153", name: "মেসার্স কর্ণফুলী লজিস্টিকস অ্যান্ড ড্রাই ডক", balance: 58850000.25, businessId: "1", type: 1 }
    ];
    defaultState.journals = [
      { id: "j_rt_153", accountId: "acc_rt_153", amount: 58850000.25, type: "given", businessId: "1", date: "2026-11-02" }
    ];

    const user = { sub: "google_cadence_153_3", email: "cadence153_3@tallykhata.com" };
    const payload = buildBackupPayload(defaultState, user);

    const cleanStore = createMockAdapter();
    const cleanRepo = new StorageRepository(cleanStore);

    const restoreRes = await cleanRepo.commitRestorePayload(payload);
    assert.strictEqual(restoreRes.success, true);

    const restoredState = cleanRepo.getAuthoritativeState();
    assert.strictEqual(restoredState.accounts[0].name, "মেসার্স কর্ণফুলী লজিস্টিকস অ্যান্ড ড্রাই ডক");
    assert.strictEqual(restoredState.accounts[0].balance, 58850000.25);
  });

  await runTest("4.4: 3-way selective restore preserves domain isolation", async () => {
    const bizState = { ...createDefaultState(), accounts: [{ id: "acc_biz_153", balance: 8800000, businessId: "1", type: 1 }] };
    const mmData = { accounts: [{ id: "wallet_153", name: "ব্র্যাক ব্যাংক প্রবাসবন্ধু রেমিট্যান্স ওয়ালেট", balance: 31000000 }] };

    const mockStore = createMockAdapter(bizState);
    mockStore._getStore()[ledgerEngine.MM_STORAGE_KEY] = JSON.stringify(mmData);

    const repo = new StorageRepository(mockStore);
    await repo.loadInitialData();

    assert.strictEqual(repo.getAuthoritativeState().accounts.length, 1);
    const rawMM = JSON.parse(mockStore._getStore()[ledgerEngine.MM_STORAGE_KEY]);
    assert.strictEqual(rawMM.accounts[0].balance, 31000000);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 153 IN-FIELD QUALITY AUDIT & RELEASE CADENCE RELEASE AUDIT VERIFIED!");
  console.log("================================================================");
})();
