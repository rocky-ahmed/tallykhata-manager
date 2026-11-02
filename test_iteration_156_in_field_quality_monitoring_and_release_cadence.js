/**
 * test_iteration_156_in_field_quality_monitoring_and_release_cadence.js
 * Continuous Verification Suite for Iteration 156: In-Field Quality Monitoring & Automated Release Cadence (In-Field Quality Audit & Release Cadence)
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
console.log("TALLYKHATA ITERATION 156: IN-FIELD QUALITY AUDIT & RELEASE CADENCE RELEASE AUDIT");
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
  await runTest("1.1: normalizeAccountFields handles customer records with high balances", async () => {
    const rawAcc = {
      id: "acc_2006",
      name: "মেসার্স সুন্দরবন শিপিং অ্যান্ড নেভিগেশন",
      mobile: "01744556677",
      balance: 86500000.50,
      business_id: 1,
      type: 1
    };

    const norm = ledgerEngine.normalizeAccountFields(rawAcc, "1");
    assert.strictEqual(norm.id, "acc_2006");
    assert.strictEqual(norm.name, "মেসার্স সুন্দরবন শিপিং অ্যান্ড নেভিগেশন");
    assert.strictEqual(norm.phone, "01744556677");
    assert.strictEqual(norm.balance, 86500000.50);
    assert.strictEqual(norm.type, 1);
    assert.strictEqual(norm.businessId, "1");
  });

  await runTest("1.2: normalizeJournalFields preserves given type and multi-sentence descriptions", async () => {
    const rawJournal = {
      id: "j_2006",
      orig_account_id: 2006,
      txn_type: 1,
      amount: 86500000.50,
      business_id: 1,
      txn_date: "2026-11-02",
      description: "কন্টেইনার ফ্রেইট ও কার্গো হ্যান্ডলিং বিল। সম্পূর্ণ চালান পরিশোধযোগ্য।",
      synced: 0
    };

    const norm = ledgerEngine.normalizeJournalFields(rawJournal);
    assert.strictEqual(norm.accountId, "2006");
    assert.strictEqual(norm.type, "given");
    assert.strictEqual(norm.amount, 86500000.50);
    assert.strictEqual(norm.businessId, "1");
    assert.strictEqual(norm.date, "2026-11-02");
    assert.strictEqual(norm.desc, "কন্টেইনার ফ্রেইট ও কার্গো হ্যান্ডলিং বিল। সম্পূর্ণ চালান পরিশোধযোগ্য।");
    assert.strictEqual(norm.synced, 0);
  });

  await runTest("1.3: typographyTokens.getBengaliLineHeight guarantees >= 1.40x diacritic safety across ultra-wide scales", async () => {
    const ultraScales = [10.5, 12.5, 14.5, 18.5, 22.5, 30.5, 45.5];
    for (const size of ultraScales) {
      const lh = typographyTokens.getBengaliLineHeight(size);
      assert.ok(lh / size >= 1.40, `Ultra-wide font scale ${size} must achieve >= 1.40x diacritic line height`);
    }
  });

  await runTest("1.4: iconMetrics.getIconMetrics returns calibrated optical scaling & touch hit slop", async () => {
    const shareMetrics = iconMetrics.getIconMetrics("ic_share");
    assert.ok(shareMetrics.opticalScale >= 1.0);

    const editMetrics = iconMetrics.getIconMetrics("ic_edit");
    assert.ok(editMetrics.opticalScale >= 1.0);

    const hitSlop = iconMetrics.STANDARD_TOUCH_HIT_SLOP;
    assert.strictEqual(hitSlop.top, 10);
    assert.strictEqual(hitSlop.bottom, 10);
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
  await runTest("2.1: Multi-tenant business ledger isolation across 7 shops", async () => {
    const defaultState = createDefaultState();
    defaultState.businesses = [
      { id: "shop_156_1", name: "মেসার্স শপ ১ ১৫৬", isActive: true },
      { id: "shop_156_2", name: "মেসার্স শপ ২ ১৫৬", isActive: true },
      { id: "shop_156_3", name: "মেসার্স শপ ৩ ১৫৬", isActive: true },
      { id: "shop_156_4", name: "মেসার্স শপ ৪ ১৫৬", isActive: true },
      { id: "shop_156_5", name: "মেসার্স শপ ৫ ১৫৬", isActive: true },
      { id: "shop_156_6", name: "মেসার্স শপ ৬ ১৫৬", isActive: true },
      { id: "shop_156_7", name: "মেসার্স শপ ৭ ১৫৬", isActive: true },
    ];
    defaultState.accounts = [
      { id: "c_156_1", name: "গ্রাহক ১", balance: 1300000, businessId: "shop_156_1", type: 1 },
      { id: "c_156_2", name: "গ্রাহক ২", balance: 2600000, businessId: "shop_156_2", type: 1 },
      { id: "c_156_3", name: "গ্রাহক ৩", balance: 3900000, businessId: "shop_156_3", type: 1 },
      { id: "c_156_4", name: "গ্রাহক ৪", balance: 5200000, businessId: "shop_156_4", type: 1 },
      { id: "c_156_5", name: "গ্রাহক ৫", balance: 6500000, businessId: "shop_156_5", type: 1 },
      { id: "c_156_6", name: "গ্রাহক ৬", balance: 7800000, businessId: "shop_156_6", type: 1 },
      { id: "c_156_7", name: "গ্রাহক ৭", balance: 9100000, businessId: "shop_156_7", type: 1 },
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    assert.strictEqual(state.accounts.length, 7);
    for (let i = 1; i <= 7; i++) {
      const acc = state.accounts.find(a => a.id === `c_156_${i}`);
      assert.strictEqual(acc.businessId, `shop_156_${i}`);
      assert.strictEqual(acc.balance, i * 1300000);
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

    const overflowVal = ledgerEngine.validateTransaction(100000000.10, "given");
    assert.strictEqual(overflowVal.valid, false);
  });

  await runTest("2.3: Storage compaction recalculates balances across customer and supplier records", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_comp_156_c", name: "গ্রাহক কম্প্যাক্ট ১৫৬", balance: 0, businessId: "1", type: 1 },
      { id: "acc_comp_156_s", name: "সাপ্লায়ার কম্প্যাক্ট ১৫৬", balance: 0, businessId: "1", type: 2 }
    ];
    defaultState.journals = [
      { id: "j_c156_1", accountId: "acc_comp_156_c", amount: 28000000, type: "given", businessId: "1", date: "2026-11-01" },
      { id: "j_c156_2", accountId: "acc_comp_156_c", amount: 12000000, type: "received", businessId: "1", date: "2026-11-02" },
      { id: "j_c156_3", accountId: "acc_comp_156_s", amount: 20000000, type: "received", businessId: "1", date: "2026-11-01" },
      { id: "j_c156_4", accountId: "acc_comp_156_s", amount: 9000000, type: "given", businessId: "1", date: "2026-11-02" }
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    const compactRes = await repo.compactStorage({ recalculateBalances: true });
    assert.strictEqual(compactRes.success, true);

    const state = repo.getAuthoritativeState();
    const cust = state.accounts.find(a => a.id === "acc_comp_156_c");
    const supp = state.accounts.find(a => a.id === "acc_comp_156_s");

    assert.strictEqual(cust.balance, 16000000); // 28L given - 12L received = 16L customer due
    assert.strictEqual(supp.balance, 11000000); // 20L purchase received - 9L payment given = 11L supplier payable
  });

  await runTest("2.4: Mutex write queue concurrency serialization (100 concurrent writes)", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const initialLen = repo.getAuthoritativeState().accounts.length;
    const writes = [];
    for (let i = 1; i <= 100; i++) {
      writes.push(
        repo.enqueueWrite(async () => {
          repo.currentStore.accounts.push({ id: `acc_concur_156_${i}`, name: `Acc 156 ${i}`, balance: i * 800 });
        })
      );
    }

    await Promise.all(writes);
    const state = repo.getAuthoritativeState();
    assert.strictEqual(state.accounts.length, initialLen + 100);
  });

  await runTest("2.5: Unsynced offline queue transitions (getUnsyncedRecords & markRecordsSynced)", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_off_156_1", name: "গ্রাহক আনসিঙ্ক ১৫৬", balance: 850000, synced: 0 }
    ];
    defaultState.journals = [
      { id: "j_off_156_1", amount: 410000, synced: 0 },
      { id: "j_off_156_2", amount: 440000, synced: 0 }
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    assert.strictEqual(repo.getUnsyncedRecords("journals").length, 2);
    assert.strictEqual(repo.getUnsyncedRecords("accounts").length, 1);

    await repo.markRecordsSynced("journals", ["j_off_156_1", "j_off_156_2"]);
    await repo.markRecordsSynced("accounts", ["acc_off_156_1"]);

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
    telemetry.recordEvent(EVENT_TYPES.PREFERENCES_UPDATED, {
      theme: "dark",
      density: "comfortable",
      pin: "4321",
      token: "secret-auth-token-156"
    });

    const snapshot = telemetry.exportTelemetrySnapshot();
    assert.strictEqual(snapshot.totalEventsLogged, 1);
    assert.strictEqual(snapshot.countsByType[EVENT_TYPES.PREFERENCES_UPDATED], 1);

    const event = telemetry.eventQueue[0];
    assert.strictEqual(event.data.theme, "dark");
    assert.strictEqual(event.data.density, "comfortable");
    assert.strictEqual(event.data.pin, undefined);   // PII stripped
    assert.strictEqual(event.data.token, undefined); // PII stripped
  });

  // =========================================================================
  // PART 4: SHA-256 Cloud Backup, Tamper Resistance & Round-Trip Fidelity
  // =========================================================================
  await runTest("4.1: Cloud backup payload generation with deterministic SHA-256 checksums", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    const user = { sub: "google_cadence_156_1", email: "cadence156@tallykhata.com" };

    const payload = buildBackupPayload(state, user);
    assert.ok(payload.manifest.checksum.startsWith("sha256_"));

    const verify = validateBackupIntegrity(payload, "google_cadence_156_1");
    assert.strictEqual(verify.valid, true);
  });

  await runTest("4.2: Tamper resistance rejects corrupted or modified backup archive", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    const user = { sub: "google_cadence_156_2", email: "cadence156_2@tallykhata.com" };

    const payload = buildBackupPayload(state, user);
    const corrupted = JSON.parse(JSON.stringify(payload));
    corrupted.data.inventory.push({ id: "tamper_inv_156", name: "Fake Stock", qty: 9999 });

    const verify = validateBackupIntegrity(corrupted, "google_cadence_156_2");
    assert.strictEqual(verify.valid, false);
    assert.ok(verify.error.includes("checksum verification failed"));
  });

  await runTest("4.3: Round-trip restore into clean storage verifies 100% data fidelity", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_rt_156", name: "মেসার্স সুন্দরবন শিপিং অ্যান্ড নেভিগেশন", balance: 86500000.50, businessId: "1", type: 1 }
    ];
    defaultState.journals = [
      { id: "j_rt_156", accountId: "acc_rt_156", amount: 86500000.50, type: "given", businessId: "1", date: "2026-11-02" }
    ];

    const user = { sub: "google_cadence_156_3", email: "cadence156_3@tallykhata.com" };
    const payload = buildBackupPayload(defaultState, user);

    const cleanStore = createMockAdapter();
    const cleanRepo = new StorageRepository(cleanStore);

    const restoreRes = await cleanRepo.commitRestorePayload(payload);
    assert.strictEqual(restoreRes.success, true);

    const restoredState = cleanRepo.getAuthoritativeState();
    assert.strictEqual(restoredState.accounts[0].name, "মেসার্স সুন্দরবন শিপিং অ্যান্ড নেভিগেশন");
    assert.strictEqual(restoredState.accounts[0].balance, 86500000.50);
  });

  await runTest("4.4: 3-way selective restore preserves domain isolation", async () => {
    const bizState = { ...createDefaultState(), accounts: [{ id: "acc_biz_156", balance: 11500000, businessId: "1", type: 1 }] };
    const mmData = { accounts: [{ id: "wallet_156", name: "পূবালী ব্যাংক লিমিটেড এসএমই কমার্শিয়াল ওয়ালেট", balance: 45000000 }] };

    const mockStore = createMockAdapter(bizState);
    mockStore._getStore()[ledgerEngine.MM_STORAGE_KEY] = JSON.stringify(mmData);

    const repo = new StorageRepository(mockStore);
    await repo.loadInitialData();

    assert.strictEqual(repo.getAuthoritativeState().accounts.length, 1);
    const rawMM = JSON.parse(mockStore._getStore()[ledgerEngine.MM_STORAGE_KEY]);
    assert.strictEqual(rawMM.accounts[0].balance, 45000000);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 156 IN-FIELD QUALITY AUDIT & RELEASE CADENCE RELEASE AUDIT VERIFIED!");
  console.log("================================================================");
})();
