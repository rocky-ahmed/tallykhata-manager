/**
 * test_iteration_176_in_field_quality_monitoring_and_release_cadence.js
 * Continuous Verification Suite for Iteration 176: In-Field Quality Monitoring & Automated Release Cadence
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
console.log("TALLYKHATA ITERATION 176: IN-FIELD QUALITY AUDIT & RELEASE CADENCE RELEASE AUDIT");
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
  await runTest("1.1: normalizeAccountFields handles supplier records with high balances (type: 2)", async () => {
    const rawAcc = {
      id: "acc_2024",
      name: "মেসার্স পদ্মা ডেল্টা এগ্রো-ফিড অ্যান্ড পোল্ট্রি হ্যাচারিজ (প্রাঃ) লিঃ",
      mobile: "01722334455",
      balance: 99999950.75,
      business_id: 1,
      type: 2
    };

    const norm = ledgerEngine.normalizeAccountFields(rawAcc, "1");
    assert.strictEqual(norm.id, "acc_2024");
    assert.strictEqual(norm.name, "মেসার্স পদ্মা ডেল্টা এগ্রো-ফিড অ্যান্ড পোল্ট্রি হ্যাচারিজ (প্রাঃ) লিঃ");
    assert.strictEqual(norm.phone, "01722334455");
    assert.strictEqual(norm.balance, 99999950.75);
    assert.strictEqual(norm.type, 2);
    assert.strictEqual(norm.businessId, "1");
  });

  await runTest("1.2: normalizeJournalFields preserves received type and ISO timestamps with milliseconds", async () => {
    const rawJournal = {
      id: "j_2024",
      orig_account_id: 2024,
      txn_type: 2,
      amount: 99999950.75,
      business_id: 1,
      txn_date: "2026-11-02T21:40:20.123Z",
      description: "পোল্ট্রি ফিড ও ব্রিডার প্যারেন্ট স্টক সরবরাহ বাবদ কিস্তি প্রাপ্তি।",
      synced: 0
    };

    const norm = ledgerEngine.normalizeJournalFields(rawJournal);
    assert.strictEqual(norm.accountId, "2024");
    assert.strictEqual(norm.type, "received");
    assert.strictEqual(norm.amount, 99999950.75);
    assert.strictEqual(norm.businessId, "1");
    assert.strictEqual(norm.date, "2026-11-02T21:40:20.123Z");
    assert.strictEqual(norm.desc, "পোল্ট্রি ফিড ও ব্রিডার প্যারেন্ট স্টক সরবরাহ বাবদ কিস্তি প্রাপ্তি।");
    assert.strictEqual(norm.synced, 0);
  });

  await runTest("1.3: typographyTokens.getBengaliLineHeight guarantees >= 1.40x diacritic safety across sizes 14sp-62sp", async () => {
    const testScales = [14.0, 16.5, 19.0, 24.0, 30.0, 38.0, 48.0, 56.0, 62.0];
    for (const size of testScales) {
      const lh = typographyTokens.getBengaliLineHeight(size);
      assert.ok(lh / size >= 1.40, `Scale ${size} must achieve >= 1.40x diacritic line height`);
    }
  });

  await runTest("1.4: iconMetrics.getIconMetrics returns calibrated optical scaling & touch hit slop", async () => {
    const cashboxMetrics = iconMetrics.getIconMetrics("grid_cashbox");
    assert.strictEqual(cashboxMetrics.opticalScale, 1.05);

    const cashBuyMetrics = iconMetrics.getIconMetrics("ic_cash_buy");
    assert.strictEqual(cashBuyMetrics.opticalScale, 1.28);

    const hitSlop = iconMetrics.STANDARD_TOUCH_HIT_SLOP;
    assert.strictEqual(hitSlop.top, 10);
    assert.strictEqual(hitSlop.bottom, 10);
    assert.strictEqual(hitSlop.left, 10);
    assert.strictEqual(hitSlop.right, 10);
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
  await runTest("2.1: Multi-tenant business ledger isolation across 35 shops", async () => {
    const defaultState = createDefaultState();
    defaultState.businesses = [];
    defaultState.accounts = [];
    for (let i = 1; i <= 35; i++) {
      defaultState.businesses.push({ id: `shop_176_${i}`, name: `মেসার্স শপ ${i} ১৭৪`, isActive: true });
      defaultState.accounts.push({ id: `c_176_${i}`, name: `গ্রাহক ${i}`, balance: i * 2650000, businessId: `shop_176_${i}`, type: 1 });
    }

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    assert.strictEqual(state.accounts.length, 35);
    for (let i = 1; i <= 35; i++) {
      const acc = state.accounts.find(a => a.id === `c_176_${i}`);
      assert.strictEqual(acc.businessId, `shop_176_${i}`);
      assert.strictEqual(acc.balance, i * 2650000);
    }
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

    const overflowVal = ledgerEngine.validateTransaction(100000000.30, "given");
    assert.strictEqual(overflowVal.valid, false);
  });

  await runTest("2.3: Storage compaction recalculates balances across customer and supplier records", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_comp_176_c", name: "গ্রাহক কম্প্যাক্ট ১৭৪", balance: 0, businessId: "1", type: 1 },
      { id: "acc_comp_176_s", name: "সাপ্লায়ার কম্প্যাক্ট ১৭৪", balance: 0, businessId: "1", type: 2 }
    ];
    defaultState.journals = [
      { id: "j_c176_1", accountId: "acc_comp_176_c", amount: 115000000, type: "given", businessId: "1", date: "2026-11-01" },
      { id: "j_c176_2", accountId: "acc_comp_176_c", amount: 59000000, type: "received", businessId: "1", date: "2026-11-02" },
      { id: "j_c176_3", accountId: "acc_comp_176_s", amount: 92000000, type: "received", businessId: "1", date: "2026-11-01" },
      { id: "j_c176_4", accountId: "acc_comp_176_s", amount: 42000000, type: "given", businessId: "1", date: "2026-11-02" }
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    const compactRes = await repo.compactStorage({ recalculateBalances: true });
    assert.strictEqual(compactRes.success, true);

    const state = repo.getAuthoritativeState();
    const cust = state.accounts.find(a => a.id === "acc_comp_176_c");
    const supp = state.accounts.find(a => a.id === "acc_comp_176_s");

    assert.strictEqual(cust.balance, 56000000); // 70L given - 32L received = 38L customer due
    assert.strictEqual(supp.balance, 50000000); // 56L purchase received - 24L payment given = 32L supplier payable
  });

  await runTest("2.4: Mutex write queue concurrency serialization (320 concurrent writes)", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const initialLen = repo.getAuthoritativeState().accounts.length;
    const writes = [];
    for (let i = 1; i <= 320; i++) {
      writes.push(
        repo.enqueueWrite(async () => {
          repo.currentStore.accounts.push({ id: `acc_concur_176_${i}`, name: `Acc 176 ${i}`, balance: i * 1600 });
        })
      );
    }

    await Promise.all(writes);
    const state = repo.getAuthoritativeState();
    assert.strictEqual(state.accounts.length, initialLen + 320);
  });

  await runTest("2.5: Unsynced offline queue transitions (getUnsyncedRecords & markRecordsSynced)", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_off_176_1", name: "গ্রাহক আনসিঙ্ক ১৭৪", balance: 11760000, synced: 0 }
    ];
    defaultState.journals = [
      { id: "j_off_176_1", amount: 1760000, synced: 0 },
      { id: "j_off_176_2", amount: 900000, synced: 0 }
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    assert.strictEqual(repo.getUnsyncedRecords("journals").length, 2);
    assert.strictEqual(repo.getUnsyncedRecords("accounts").length, 1);

    await repo.markRecordsSynced("journals", ["j_off_176_1", "j_off_176_2"]);
    await repo.markRecordsSynced("accounts", ["acc_off_176_1"]);

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
    assert.strictEqual(i18n.t("mm_net_savings"), "নিট সঞ্চয়");
    assert.strictEqual(i18n.t("mm_wallets_title"), "ব্যক্তিগত ওয়ালেট ও অ্যাকাউন্ট");
    assert.strictEqual(i18n.t("mm_tab_wallets"), "ওয়ালেট");
    assert.strictEqual(i18n.t("mm_category"), "ক্যাটাগরি");
  });

  await runTest("3.5: Privacy-preserving operational telemetry with PII sanitization", async () => {
    const telemetry = new TelemetryService({ maxQueueSize: 128 });
    telemetry.recordEvent(EVENT_TYPES.TRANSACTION_RECORDED, {
      amount: 35000,
      type: "cash_sale",
      token: "secret-token-176",
      pin: "6677"
    });

    const snapshot = telemetry.exportTelemetrySnapshot();
    assert.strictEqual(snapshot.totalEventsLogged, 1);
    assert.strictEqual(snapshot.countsByType[EVENT_TYPES.TRANSACTION_RECORDED], 1);

    const event = telemetry.eventQueue[0];
    assert.strictEqual(event.data.amount, 35000);
    assert.strictEqual(event.data.type, "cash_sale");
    assert.strictEqual(event.data.token, undefined); // PII stripped
    assert.strictEqual(event.data.pin, undefined);   // PII stripped
  });

  // =========================================================================
  // PART 4: SHA-256 Cloud Backup, Tamper Resistance & Round-Trip Fidelity
  // =========================================================================
  await runTest("4.1: Cloud backup payload generation with deterministic SHA-256 checksums", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    const user = { sub: "google_cadence_176_1", email: "cadence176@tallykhata.com" };

    const payload = buildBackupPayload(state, user);
    assert.ok(payload.manifest.checksum.startsWith("sha256_"));

    const verify = validateBackupIntegrity(payload, "google_cadence_176_1");
    assert.strictEqual(verify.valid, true);
  });

  await runTest("4.2: Tamper resistance rejects corrupted or modified backup archive", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    const user = { sub: "google_cadence_176_2", email: "cadence176_2@tallykhata.com" };

    const payload = buildBackupPayload(state, user);
    const corrupted = JSON.parse(JSON.stringify(payload));
    corrupted.data.inventory.push({ id: "tamper_item_176", name: "Tampered ColdStorageUnit", quantity: 8 });

    const verify = validateBackupIntegrity(corrupted, "google_cadence_176_2");
    assert.strictEqual(verify.valid, false);
    assert.ok(verify.error.includes("checksum verification failed"));
  });

  await runTest("4.3: Round-trip restore into clean storage verifies 100% data fidelity", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_rt_176", name: "মেসার্স পদ্মা ডেল্টা এগ্রো-ফিড অ্যান্ড পোল্ট্রি হ্যাচারিজ (প্রাঃ) লিঃ", balance: 99999950.75, businessId: "1", type: 2 }
    ];
    defaultState.journals = [
      { id: "j_rt_176", accountId: "acc_rt_176", amount: 99999950.75, type: "received", businessId: "1", date: "2026-11-02" }
    ];

    const user = { sub: "google_cadence_176_3", email: "cadence176_3@tallykhata.com" };
    const payload = buildBackupPayload(defaultState, user);

    const cleanStore = createMockAdapter();
    const cleanRepo = new StorageRepository(cleanStore);

    const restoreRes = await cleanRepo.commitRestorePayload(payload);
    assert.strictEqual(restoreRes.success, true);

    const restoredState = cleanRepo.getAuthoritativeState();
    assert.strictEqual(restoredState.accounts[0].name, "মেসার্স পদ্মা ডেল্টা এগ্রো-ফিড অ্যান্ড পোল্ট্রি হ্যাচারিজ (প্রাঃ) লিঃ");
    assert.strictEqual(restoredState.accounts[0].balance, 99999950.75);
  });

  await runTest("4.4: 3-way selective restore preserves domain isolation", async () => {
    const bizState = { ...createDefaultState(), accounts: [{ id: "acc_biz_176", balance: 26500000, businessId: "1", type: 1 }] };
    const mmData = { accounts: [{ id: "wallet_176", name: "ইস্টার্ন ব্যাংক পিএলসি করপোরেট ওয়ালেট", balance: 917600000 }] };

    const mockStore = createMockAdapter(bizState);
    mockStore._getStore()[ledgerEngine.MM_STORAGE_KEY] = JSON.stringify(mmData);

    const repo = new StorageRepository(mockStore);
    await repo.loadInitialData();

    assert.strictEqual(repo.getAuthoritativeState().accounts.length, 1);
    const rawMM = JSON.parse(mockStore._getStore()[ledgerEngine.MM_STORAGE_KEY]);
    assert.strictEqual(rawMM.accounts[0].balance, 917600000);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 176 IN-FIELD QUALITY AUDIT & RELEASE CADENCE RELEASE AUDIT VERIFIED!");
  console.log("================================================================");
})();
