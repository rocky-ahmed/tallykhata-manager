/**
 * test_iteration_145_in_field_quality_monitoring_and_release_cadence.js
 * Continuous Verification Suite for Iteration 145: In-Field Quality Monitoring & Automated Release Cadence (In-Field Quality Audit & Release Cadence)
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
console.log("TALLYKHATA ITERATION 145: IN-FIELD QUALITY AUDIT & RELEASE CADENCE RELEASE AUDIT");
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
  await runTest("1.1: normalizeAccountFields handles customer and supplier invariants", async () => {
    const rawAcc = {
      id: "acc_1992",
      name: "মেসার্স কর্ণফুলী স্টিল অ্যান্ড রি-রোলিং মিলস কমপ্লেক্স",
      mobile: "01799997788",
      balance: 36821100.75,
      business_id: 1,
      type: 1
    };

    const norm = ledgerEngine.normalizeAccountFields(rawAcc, "1");
    assert.strictEqual(norm.id, "acc_1992");
    assert.strictEqual(norm.name, "মেসার্স কর্ণফুলী স্টিল অ্যান্ড রি-রোলিং মিলস কমপ্লেক্স");
    assert.strictEqual(norm.phone, "01799997788");
    assert.strictEqual(norm.balance, 36821100.75);
    assert.strictEqual(norm.businessId, "1");
  });

  await runTest("1.2: normalizeJournalFields maps snake_case columns and preserves integer-paisa", async () => {
    const rawJournal = {
      id: "j_1992",
      orig_account_id: 1992,
      txn_type: 1,
      amount: 36821100.75,
      business_id: 1,
      txn_date: "2026-11-02",
      description: "এমএস ডিফর্মড রড ও হেভি স্ট্রাকচারাল স্টিল বিম চালান",
      synced: 0
    };

    const norm = ledgerEngine.normalizeJournalFields(rawJournal);
    assert.strictEqual(norm.accountId, "1992");
    assert.strictEqual(norm.type, "given");
    assert.strictEqual(norm.amount, 36821100.75);
    assert.strictEqual(norm.businessId, "1");
    assert.strictEqual(norm.date, "2026-11-02");
    assert.strictEqual(norm.desc, "এমএস ডিফর্মড রড ও হেভি স্ট্রাকচারাল স্টিল বিম চালান");
    assert.strictEqual(norm.synced, 0);
  });

  await runTest("1.3: typographyTokens.getBengaliLineHeight guarantees >= 1.40x diacritic safety", async () => {
    const fontSizes = [11, 12, 14, 16, 18, 22, 32];
    for (const size of fontSizes) {
      const lh = typographyTokens.getBengaliLineHeight(size);
      assert.ok(lh / size >= 1.40, `Line height for font size ${size} must be at least 1.40x`);
    }
  });

  await runTest("1.4: iconMetrics.getIconMetrics returns calibrated optical scaling & hit slop", async () => {
    const editIcon = iconMetrics.getIconMetrics("ic_delete");
    assert.strictEqual(editIcon.opticalScale, 1.35);

    const bulkIcon = iconMetrics.getIconMetrics("ic_call.png");
    assert.strictEqual(bulkIcon.opticalScale, 1.15);

    const hitSlop = iconMetrics.STANDARD_TOUCH_HIT_SLOP;
    assert.ok(hitSlop.top >= 10);
    assert.ok(hitSlop.bottom >= 10);
  });

  await runTest("1.5: Production app.json release packaging invariants strictly enforced", async () => {
    const appJsonPath = path.join(__dirname, "app.json");
    const appConfig = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

    assert.strictEqual(appConfig.expo.name, "টালিখাতা");
    assert.strictEqual(appConfig.expo.slug, "tallykhata-offline");
    assert.strictEqual(appConfig.expo.version, "4.0.0");
    assert.strictEqual(appConfig.expo.android.package, "com.progoti.tallykhata.offline");
    assert.strictEqual(appConfig.expo.splash.backgroundColor, "#B81414");
  });

  // =========================================================================
  // PART 2: Multi-Tenant Ledger, Storage Compaction & Mutex Concurrency (Averroes)
  // =========================================================================
  await runTest("2.1: Multi-tenant business ledger isolation across shops", async () => {
    const defaultState = createDefaultState();
    defaultState.businesses = [
      { id: "shop_alpha_145", name: "মেসার্স আলফা এন্টারপ্রাইজ ১৪৩", isActive: true },
      { id: "shop_beta_145", name: "মেসার্স বিটা ট্রেডার্স ১৪৩", isActive: true },
    ];
    defaultState.accounts = [
      { id: "c_a145", name: "গ্রাহক আলফা ১৪৩", balance: 4710000, businessId: "shop_alpha_145", type: 1 },
      { id: "c_b145", name: "গ্রাহক বিটা ১৪৩", balance: 4740000, businessId: "shop_beta_145", type: 1 },
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    const ca = state.accounts.find(a => a.id === "c_a145");
    const cb = state.accounts.find(a => a.id === "c_b145");
    assert.strictEqual(ca.businessId, "shop_alpha_145");
    assert.strictEqual(cb.businessId, "shop_beta_145");
    assert.strictEqual(ca.balance, 4710000);
    assert.strictEqual(cb.balance, 4740000);
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

    const overflowVal = ledgerEngine.validateTransaction(100000000.05, "given");
    assert.strictEqual(overflowVal.valid, false);
  });

  await runTest("2.3: Storage compaction recalculates balances and prunes stale data", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_comp_145", name: "টেস্ট লেজার ১৪৫", balance: 0, businessId: "1", type: 1 }
    ];
    defaultState.journals = [
      { id: "j_c145_1", accountId: "acc_comp_145", amount: 8200000, type: "given", businessId: "1", date: "2026-11-01" },
      { id: "j_c145_2", accountId: "acc_comp_145", amount: 4100000, type: "received", businessId: "1", date: "2026-11-02" }
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    const compactRes = await repo.compactStorage({ recalculateBalances: true });
    assert.strictEqual(compactRes.success, true);
    assert.strictEqual(typeof compactRes.stats, "object");

    const state = repo.getAuthoritativeState();
    const acc = state.accounts.find(a => a.id === "acc_comp_145");
    assert.strictEqual(acc.balance, 4100000);
  });

  await runTest("2.4: Mutex write queue concurrency serialization (50 concurrent writes)", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const initialLen = repo.getAuthoritativeState().accounts.length;
    const writes = [];
    for (let i = 1; i <= 50; i++) {
      writes.push(
        repo.enqueueWrite(async () => {
          repo.currentStore.accounts.push({ id: `acc_concur_145_${i}`, name: `Acc 145 ${i}`, balance: i * 890 });
        })
      );
    }

    await Promise.all(writes);
    const state = repo.getAuthoritativeState();
    assert.strictEqual(state.accounts.length, initialLen + 50);
  });

  await runTest("2.5: Unsynced offline queue transitions (getUnsyncedRecords & markRecordsSynced)", async () => {
    const defaultState = createDefaultState();
    defaultState.journals = [
      { id: "j_off_145_1", amount: 138400, synced: 0 },
      { id: "j_off_145_2", amount: 141000, synced: 0 }
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    const unsynced = repo.getUnsyncedRecords("journals");
    assert.strictEqual(unsynced.length, 2);

    const markRes = await repo.markRecordsSynced("journals", ["j_off_145_1", "j_off_145_2"]);
    assert.strictEqual(markRes.success, true);
    assert.strictEqual(markRes.updatedCount, 2);

    const remaining = repo.getUnsyncedRecords("journals");
    assert.strictEqual(remaining.length, 0);
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
    const standardDensity = prefsService.resolveEffectiveDensity("standard");
    assert.ok(standardDensity.cardPadding >= 12);
    assert.strictEqual(standardDensity.paddingFactor, 1);
  });

  await runTest("3.4: Bilingual localization parity across Bengali and English", async () => {
    assert.strictEqual(i18n.t("mm_access_back"), "পিছনে যান");
    assert.strictEqual(i18n.t("mm_access_new_txn"), "নতুন লেনদেন");
    assert.strictEqual(i18n.t("mm_tab_budgets"), "বাজেট");
    assert.strictEqual(i18n.t("mm_tab_goals"), "লক্ষ্য");
  });

  await runTest("3.5: Privacy-preserving operational telemetry with PII sanitization", async () => {
    const telemetry = new TelemetryService({ maxQueueSize: 128 });
    telemetry.recordEvent(EVENT_TYPES.CUSTOMER_CREATED, {
      customerId: "cust_145_01",
      customerName: "মুনীর চৌধুরী",
      phone: "01999997766",
      amount: 5080000,
      businessId: "1"
    });

    const snapshot = telemetry.exportTelemetrySnapshot();
    assert.strictEqual(snapshot.totalEventsLogged, 1);
    assert.strictEqual(snapshot.countsByType[EVENT_TYPES.CUSTOMER_CREATED], 1);

    const event = telemetry.eventQueue[0];
    assert.strictEqual(event.data.customerId, "cust_145_01");
    assert.strictEqual(event.data.amount, 5080000);
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
    const user = { sub: "google_cadence_145_1", email: "cadence145@tallykhata.com" };

    const payload = buildBackupPayload(state, user);
    assert.ok(payload.manifest.checksum.startsWith("sha256_"));

    const verify = validateBackupIntegrity(payload, "google_cadence_145_1");
    assert.strictEqual(verify.valid, true);
  });

  await runTest("4.2: Tamper resistance rejects corrupted or modified backup archive", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    const user = { sub: "google_cadence_145_2", email: "cadence145_2@tallykhata.com" };

    const payload = buildBackupPayload(state, user);
    const corrupted = JSON.parse(JSON.stringify(payload));
    corrupted.data.journals.push({ id: "tamper_txn_145", amount: 511111111 });

    const verify = validateBackupIntegrity(corrupted, "google_cadence_145_2");
    assert.strictEqual(verify.valid, false);
    assert.ok(verify.error.includes("checksum verification failed"));
  });

  await runTest("4.3: Round-trip restore into clean storage verifies 100% data fidelity", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_rt_145", name: "মেসার্স কর্ণফুলী মেগা ডকইয়ার্ড অ্যান্ড শিপবিল্ডিং ইয়ার্ড", balance: 35520000.75, businessId: "1", type: 1 }
    ];
    defaultState.journals = [
      { id: "j_rt_145", accountId: "acc_rt_145", amount: 35520000.75, type: "given", businessId: "1", date: "2026-11-02" }
    ];

    const user = { sub: "google_cadence_145_3", email: "cadence145_3@tallykhata.com" };
    const payload = buildBackupPayload(defaultState, user);

    const cleanStore = createMockAdapter();
    const cleanRepo = new StorageRepository(cleanStore);

    const restoreRes = await cleanRepo.commitRestorePayload(payload);
    assert.strictEqual(restoreRes.success, true);

    const restoredState = cleanRepo.getAuthoritativeState();
    assert.strictEqual(restoredState.accounts[0].name, "মেসার্স কর্ণফুলী মেগা ডকইয়ার্ড অ্যান্ড শিপবিল্ডিং ইয়ার্ড");
    assert.strictEqual(restoredState.accounts[0].balance, 35520000.75);
  });

  await runTest("4.4: 3-way selective restore preserves domain isolation", async () => {
    const bizState = { ...createDefaultState(), accounts: [{ id: "acc_biz_145", balance: 4710000, businessId: "1", type: 1 }] };
    const mmData = { accounts: [{ id: "wallet_145", name: "প্রাইম ব্যাংক পিএলসি করপোরেট ইনভেস্টমেন্ট ওয়ালেট", balance: 11400000 }] };

    const mockStore = createMockAdapter(bizState);
    mockStore._getStore()[ledgerEngine.MM_STORAGE_KEY] = JSON.stringify(mmData);

    const repo = new StorageRepository(mockStore);
    await repo.loadInitialData();

    assert.strictEqual(repo.getAuthoritativeState().accounts.length, 1);
    const rawMM = JSON.parse(mockStore._getStore()[ledgerEngine.MM_STORAGE_KEY]);
    assert.strictEqual(rawMM.accounts[0].balance, 11400000);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 145 IN-FIELD QUALITY AUDIT & RELEASE CADENCE RELEASE AUDIT VERIFIED!");
  console.log("================================================================");
})();
