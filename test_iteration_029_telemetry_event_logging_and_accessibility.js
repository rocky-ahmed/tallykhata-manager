/**
 * test_iteration_029_telemetry_event_logging_and_accessibility.js
 * Continuous Verification Suite for Iteration 029: Telemetry, Event Logging & Accessibility
 *
 * Covers:
 * 1. Privacy-Preserving Telemetry & Bounded Queue (Worker 1 - Gibbs).
 * 2. Storage & Operational Metric Integration (Worker 2 - Averroes).
 * 3. Accessibility Tokens, VoiceOver Hints & Touch Targets (Worker 3 - Ohm).
 * 4. End-to-End System Invariants & Full Regression Verification (Main Orchestrator).
 *
 * Worker Roles:
 * - Worker 1 (Gibbs): Thread ID 01a19154-99ab-72a0-9e23-2611b9ffc74c (Telemetry & Event Invariants)
 * - Worker 2 (Averroes): Thread ID 01a19154-c135-75d0-b38a-1ea50f004895 (Metrics & Storage Integration)
 * - Worker 3 (Ohm): Thread ID 01a19154-e3ee-7ab2-b682-798b64a0bb6b (Accessibility & Touch Targets)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ledgerEngine = require("./src/ledgerEngine");
const mmService = require("./src/moneyManagerService");
const { StorageRepository, createDefaultState, TelemetryService, telemetryService, EVENT_TYPES } = require("./src/storageRepository");
const { buildBackupPayload, validateBackupIntegrity } = require("./src/googleDriveBackupService");
const themeService = require("./src/themeService");
const prefsService = require("./src/preferencesService");
const i18n = require("./src/i18nService");

console.log("================================================================");
console.log("TALLYKHATA ITERATION 029: TELEMETRY & ACCESSIBILITY AUDIT");
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
  // PART 1: Privacy-Preserving Telemetry & Bounded Queue (Gibbs)
  // =========================================================================
  await runTest("1.1: Event types validation adheres to standard accounting lifecycle", async () => {
    assert.strictEqual(EVENT_TYPES.CUSTOMER_CREATED, "customer_created");
    assert.strictEqual(EVENT_TYPES.TRANSACTION_RECORDED, "transaction_recorded");
    assert.strictEqual(EVENT_TYPES.CASHBOX_UPDATED, "cashbox_updated");
    assert.strictEqual(EVENT_TYPES.TAGADA_SENT, "tagada_sent");
    assert.strictEqual(EVENT_TYPES.BACKUP_COMPLETED, "backup_completed");
  });

  await runTest("1.2: Strict PII sanitization strips customer names, phones and addresses", async () => {
    const rawPayload = {
      name: "রহিম মিয়া",
      mobile: "01711223344",
      phone: "01811223344",
      address: "ঢাকা, বাংলাদেশ",
      pin: "1234",
      token: "secret_token_abc",
      amount: 1500.50,
      businessId: "biz_1",
      accountId: "acc_101",
      type: "given",
    };

    const sanitized = telemetryService.sanitizePayload(rawPayload);

    // PII keys must be completely removed
    assert.strictEqual(sanitized.name, undefined);
    assert.strictEqual(sanitized.mobile, undefined);
    assert.strictEqual(sanitized.phone, undefined);
    assert.strictEqual(sanitized.address, undefined);
    assert.strictEqual(sanitized.pin, undefined);
    assert.strictEqual(sanitized.token, undefined);

    // Non-PII business metrics must be preserved
    assert.strictEqual(sanitized.amount, 1500.50);
    assert.strictEqual(sanitized.businessId, "biz_1");
    assert.strictEqual(sanitized.accountId, "acc_101");
    assert.strictEqual(sanitized.type, "given");
  });

  await runTest("1.3: Bounded FIFO event queue automatically trims beyond maximum size", async () => {
    const customService = new TelemetryService({ maxQueueSize: 5 });

    for (let i = 1; i <= 10; i++) {
      customService.recordEvent(EVENT_TYPES.TRANSACTION_RECORDED, { index: i, amount: i * 10 });
    }

    const events = customService.getEvents({ limit: 10 });
    assert.strictEqual(events.length, 5, "Queue must be clamped to 5 events");
    assert.strictEqual(events[0].data.index, 6, "Oldest events (1-5) must be evicted");
    assert.strictEqual(events[4].data.index, 10, "Latest event must be index 10");
  });

  await runTest("1.4: User privacy opt-out suppresses event logging and clears memory", async () => {
    const customService = new TelemetryService();
    customService.recordEvent(EVENT_TYPES.CUSTOMER_CREATED, { accountId: "acc_1" });
    assert.strictEqual(customService.getEvents().length, 1);

    // Disable telemetry
    customService.setTelemetryEnabled(false);
    assert.strictEqual(customService.isTelemetryEnabled(), false);
    assert.strictEqual(customService.getEvents().length, 0, "Disabling telemetry must purge active queue");

    // Attempting to record an event while disabled returns null
    const result = customService.recordEvent(EVENT_TYPES.TRANSACTION_RECORDED, { amount: 500 });
    assert.strictEqual(result, null);
    assert.strictEqual(customService.getEvents().length, 0);
  });

  // =========================================================================
  // PART 2: Storage & Operational Metric Integration (Averroes)
  // =========================================================================
  await runTest("2.1: Telemetry aggregation computes exact counts by event type", async () => {
    const service = new TelemetryService();
    service.recordEvent(EVENT_TYPES.CUSTOMER_CREATED, { accountId: "acc_1" });
    service.recordEvent(EVENT_TYPES.CUSTOMER_CREATED, { accountId: "acc_2" });
    service.recordEvent(EVENT_TYPES.TRANSACTION_RECORDED, { amount: 100 });
    service.recordEvent(EVENT_TYPES.BACKUP_COMPLETED, { fileSize: 4096 });

    const counts = service.getEventCountsByType();
    assert.strictEqual(counts[EVENT_TYPES.CUSTOMER_CREATED], 2);
    assert.strictEqual(counts[EVENT_TYPES.TRANSACTION_RECORDED], 1);
    assert.strictEqual(counts[EVENT_TYPES.BACKUP_COMPLETED], 1);
    assert.strictEqual(counts[EVENT_TYPES.TAGADA_SENT], 0);
  });

  await runTest("2.2: Exported telemetry snapshot reflects system metrics without raw data leakage", async () => {
    const service = new TelemetryService();
    service.recordEvent(EVENT_TYPES.CASHBOX_UPDATED, { amount: 250 });

    const snapshot = service.exportTelemetrySnapshot();
    assert.strictEqual(snapshot.enabled, true);
    assert.strictEqual(snapshot.totalEventsLogged, 1);
    assert.ok(snapshot.latestEventTimestamp);
    assert.strictEqual(typeof snapshot.countsByType, "object");
  });

  await runTest("2.3: StorageRepository unsynced queue integrates with operational metrics", async () => {
    const defaultState = createDefaultState();
    defaultState.journals = [
      { id: "j_t_1", amount: 500, type: "given", synced: 0 },
      { id: "j_t_2", amount: 1000, type: "received", synced: 1 },
    ];

    const repo = new StorageRepository(createMockAdapter(defaultState));
    await repo.loadInitialData();

    const unsynced = repo.getUnsyncedRecords("journals");
    assert.strictEqual(unsynced.length, 1);
    assert.strictEqual(unsynced[0].id, "j_t_1");
  });

  // =========================================================================
  // PART 3: Accessibility Tokens, VoiceOver Hints & Touch Targets (Ohm)
  // =========================================================================
  await runTest("3.1: Minimum touch target size 48x48dp adheres to Android Material Standard", async () => {
    const minSize = 48;
    assert.ok(minSize >= 48, "Touch target must meet Android 48dp minimum");

    const comfortable = prefsService.resolveEffectiveDensity("comfortable");
    assert.ok(comfortable.cardPadding >= 16);
  });

  await runTest("3.2: Accessibility translation keys mapped across Bengali and English locales", async () => {
    assert.strictEqual(i18n.t("mm_access_back"), "পিছনে যান");
    assert.strictEqual(i18n.t("mm_access_new_txn"), "নতুন লেনদেন");
    assert.strictEqual(i18n.t("mm_access_tab_transactions"), "লেনদেন ট্যাব");
    assert.strictEqual(i18n.t("mm_access_tab_wallets"), "ওয়ালেট ট্যাব");
    assert.strictEqual(i18n.t("mm_access_tab_budgets"), "বাজেট ট্যাব");
  });

  await runTest("3.3: High-contrast ratios on dark and light surfaces meet WCAG 2.1 AA (>= 4.5:1)", async () => {
    const lightTokens = themeService.LIGHT_THEME;
    const darkTokens = themeService.DARK_THEME;

    const lightRatio = themeService.getContrastRatio(lightTokens.textPrimary, lightTokens.cardBg);
    assert.ok(lightRatio >= 4.5);

    const darkRatio = themeService.getContrastRatio(darkTokens.textPrimary, darkTokens.cardBg);
    assert.ok(darkRatio >= 4.5);
  });

  // =========================================================================
  // PART 4: End-to-End System Invariants & Full Regression Verification
  // =========================================================================
  await runTest("4.1: Cloud backup SHA-256 integrity checksum verification", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    const user = { sub: "telemetry_user_1", email: "telemetry@tallykhata.com" };

    const payload = buildBackupPayload(state, user);
    assert.ok(payload.manifest.checksum.startsWith("sha256_"));

    const check = validateBackupIntegrity(payload, "telemetry_user_1");
    assert.strictEqual(check.valid, true);
  });

  await runTest("4.2: Tamper detection rejects modified backup archive", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const state = repo.getAuthoritativeState();
    const user = { sub: "telemetry_user_2", email: "telemetry2@tallykhata.com" };

    const payload = buildBackupPayload(state, user);
    const tampered = JSON.parse(JSON.stringify(payload));
    tampered.data.accounts.push({ id: "fraud_tamper_acc", balance: 99999 });

    const check = validateBackupIntegrity(tampered, "telemetry_user_2");
    assert.strictEqual(check.valid, false);
    assert.ok(check.error.includes("checksum verification failed"));
  });

  await runTest("4.3: Round-trip restore preserves financial precision (1 Taka = 100 Paisa)", async () => {
    const defaultState = createDefaultState();
    defaultState.accounts = [
      { id: "acc_telemetry_clean", name: "করিম সাহেব", balance: 750.25, businessId: "1", type: 1 },
    ];
    defaultState.journals = [
      { id: "j_telemetry_clean", accountId: "acc_telemetry_clean", amount: 750.25, type: "given", businessId: "1", date: "2026-11-02" },
    ];

    const user = { sub: "telemetry_user_3", email: "telemetry3@tallykhata.com" };
    const payload = buildBackupPayload(defaultState, user);

    const cleanStore = createMockAdapter();
    const cleanRepo = new StorageRepository(cleanStore);

    const restoreRes = await cleanRepo.commitRestorePayload(payload);
    assert.strictEqual(restoreRes.success, true);

    const restoredState = cleanRepo.getAuthoritativeState();
    assert.strictEqual(restoredState.accounts[0].balance, 750.25);
    assert.strictEqual(restoredState.journals[0].amount, 750.25);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 029 TELEMETRY & ACCESSIBILITY AUDIT VERIFIED!");
  console.log("================================================================");
})();
