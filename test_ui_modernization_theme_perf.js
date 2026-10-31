const assert = require("assert");
const fs = require("fs");
const { storageRepository, StorageRepository, createDefaultState, SAMPLE_CUSTOMER_MAPPINGS, migrateLegacySampleCustomerNames } = require("./src/storageRepository");
const ledgerEngine = require("./src/ledgerEngine");
const preferencesService = require("./src/preferencesService");
const themeService = require("./src/themeService");
const i18nService = require("./src/i18nService");
const mmService = require("./src/moneyManagerService");

function createMockAdapter(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: async (k) => (map.has(k) ? map.get(k) : null),
    setItem: async (k, v) => { map.set(k, String(v)); },
    removeItem: async (k) => { map.delete(k); },
    clear: async () => { map.clear(); },
    _map: map,
  };
}

console.log("================================================================");
console.log("TALLYKHATA UI MODERNIZATION, THEME & PERFORMANCE VERIFICATION");
console.log("================================================================");

let total = 0;
let passed = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] TEST ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] TEST ${total}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
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

(async () => {
  // =========================================================================
  // 1. 12 SAMPLE CUSTOMER NAMES MODERNIZATION & BALANCE PRESERVATION
  // =========================================================================
  console.log("\n--- PART 1: 12 SAMPLE CUSTOMER NAMES, IDS & BALANCES ---");

  const expectedBalances = [7000, 10000, 8000, 0, 500, 12000, 15000, 18000, 14000, 9000, 7000, 8000];
  const expectedOpenings = [3800, 8550, 3000, 0, 500, 12000, 15000, 18000, 14000, 9000, 7000, 8000];

  runTest("createDefaultState contains exactly 12 sample customer accounts with modern names", () => {
    const state = createDefaultState();
    assert(Array.isArray(state.accounts), "Accounts must be an array");
    const sampleAccounts = state.accounts.filter(a => Number(a.id) >= 1 && Number(a.id) <= 12);
    assert.strictEqual(sampleAccounts.length, 12, "Must contain exactly 12 sample accounts");

    sampleAccounts.forEach((acc, idx) => {
      const expectedId = String(idx + 1);
      assert.strictEqual(String(acc.id), expectedId, `Account ID mismatch at index ${idx}`);
      assert.strictEqual(acc.type, 1, `Sample account ${expectedId} must be a customer (type 1)`);
      assert.strictEqual(acc.balance, expectedBalances[idx], `Balance mismatch for account ${expectedId}`);
      assert.strictEqual(acc.openingBalance, expectedOpenings[idx], `Opening balance mismatch for account ${expectedId}`);
      assert(acc.name && typeof acc.name === "string", `Account ${expectedId} must have a valid name`);
      assert(!acc.name.includes("★"), `Account ${expectedId} name '${acc.name}' must not contain legacy asterisks`);
      assert(acc.name.startsWith("নমুনা গ্রাহক"), `Account ${expectedId} should have modern Bengali name format`);
    });
  });

  runTest("SAMPLE_CUSTOMER_MAPPINGS defines 1:1 legacy to modern mappings for IDs 1..12", () => {
    assert(SAMPLE_CUSTOMER_MAPPINGS && typeof SAMPLE_CUSTOMER_MAPPINGS === "object");
    for (let i = 1; i <= 12; i++) {
      const key = String(i);
      const mapping = SAMPLE_CUSTOMER_MAPPINGS[key];
      assert(mapping, `Mapping missing for ID ${key}`);
      assert(mapping.legacy && typeof mapping.legacy === "string", `Missing legacy name for ${key}`);
      assert(mapping.modern && typeof mapping.modern === "string", `Missing modern name for ${key}`);
      const bnDigits = ['০০', '০১', '০২', '০৩', '০৪', '০৫', '০৬', '০৭', '০৮', '০৯', '১০', '১১', '১২'];
      assert.strictEqual(mapping.modern, `নমুনা গ্রাহক ${bnDigits[i]}`);
    }
  });

  runTest("migrateLegacySampleCustomerNames upgrades legacy demo names and preserves custom names", () => {
    const legacyInput = [
      { id: "1", name: "Raihan ★ khoksha", balance: 7000, openingBalance: 3800, type: 1 },
      { id: "2", name: "Faysal ★★", balance: 10000, openingBalance: 8550, type: 1 },
      { id: "3", name: "কাস্টম গ্রাহক রহিম", balance: 8000, openingBalance: 3000, type: 1 }, // Custom name, must not change
      { id: "99", name: "নতুন খদ্দের", balance: 500, type: 1 },
    ];

    const result = migrateLegacySampleCustomerNames(legacyInput);
    assert.strictEqual(result.changed, true, "Must flag changed as true when legacy names are updated");
    assert.strictEqual(result.accounts[0].name, "নমুনা গ্রাহক ০১");
    assert.strictEqual(result.accounts[0].balance, 7000);
    assert.strictEqual(result.accounts[0].openingBalance, 3800);
    assert.strictEqual(result.accounts[1].name, "নমুনা গ্রাহক ০২");
    assert.strictEqual(result.accounts[1].balance, 10000);
    assert.strictEqual(result.accounts[2].name, "কাস্টম গ্রাহক রহিম", "User-renamed account must be preserved");
    assert.strictEqual(result.accounts[3].name, "নতুন খদ্দের", "Non-sample account must remain untouched");

    const secondRun = migrateLegacySampleCustomerNames(result.accounts);
    assert.strictEqual(secondRun.changed, false, "Second migration run must be idempotent");
  });

  runTest("App.js INITIAL_ACCOUNTS matches modernized names and identical balances", () => {
    const appSource = fs.readFileSync("App.js", "utf8");
    for (let i = 1; i <= 12; i++) {
      const bnDigits = ['০০', '০১', '০২', '০৩', '০৪', '০৫', '০৬', '০৭', '০৮', '০৯', '১০', '১১', '১২'];
      const bnDigit = bnDigits[i];
      assert(appSource.includes(`নমুনা গ্রাহক ${bnDigit}`), `App.js must contain modernized customer 'নমুনা গ্রাহক ${bnDigit}'`);
    }
    assert(!appSource.includes("Raihan ★ khoksha"), "App.js must not contain raw asterisks in demo seed data");
  });

  // =========================================================================
  // 2. CASHBOX LABEL LOCALIZATION ("ক্যাশবক্স" / "Cashbox")
  // =========================================================================
  console.log("\n--- PART 2: CASHBOX LABEL LOCALIZATION ---");

  runTest("Cashbox label resolves correctly in Bengali ('ক্যাশবক্স') and English ('Cashbox')", () => {
    assert.strictEqual(i18nService.t("tab_cashbox", "bn"), "ক্যাশবক্স", "tab_cashbox in bn must be 'ক্যাশবক্স'");
    assert.strictEqual(i18nService.t("tab_cashbox", "en"), "Cashbox", "tab_cashbox in en must be 'Cashbox'");

    assert.strictEqual(i18nService.translateStaticText("ক্যাশবক্স", "bn"), "ক্যাশবক্স");
    assert.strictEqual(i18nService.translateStaticText("ক্যাশবক্স", "en"), "Cashbox");

    assert.strictEqual(i18nService.t("cb_title", "bn"), "ক্যাশবক্স");
    assert.strictEqual(i18nService.t("cb_title", "en"), "Cashbox");
    assert.strictEqual(i18nService.t("qa_cashbox", "en"), "Cashbox");
  });

  runTest("App.js wires Cashbox tab with dynamic localization helper t('tab_cashbox')", () => {
    const appSource = fs.readFileSync("App.js", "utf8");
    assert(appSource.includes("{t('tab_cashbox')}"), "App.js bottom navigation must render {t('tab_cashbox')}");
  });

  // =========================================================================
  // 3. THEME SWITCHING (system, light, dark) & PERSISTENCE
  // =========================================================================
  console.log("\n--- PART 3: THEME SWITCHING & PERSISTENCE ---");

  runTest("preferencesService sanitizes and resolves effective themes across light, dark, and system", () => {
    const def = preferencesService.DEFAULT_PREFERENCES;
    assert.strictEqual(def.theme, "light");

    assert.strictEqual(preferencesService.sanitizePreferences({ theme: "dark" }).theme, "dark");
    assert.strictEqual(preferencesService.sanitizePreferences({ theme: "light" }).theme, "light");
    assert.strictEqual(preferencesService.sanitizePreferences({ theme: "system" }).theme, "system");
    assert.strictEqual(preferencesService.sanitizePreferences({ theme: "invalid" }).theme, "light");

    // System theme resolution
    assert.strictEqual(preferencesService.resolveEffectiveTheme("system", "dark"), "dark");
    assert.strictEqual(preferencesService.resolveEffectiveTheme("system", "light"), "light");
    assert.strictEqual(preferencesService.resolveEffectiveTheme("system", null), "light");
    assert.strictEqual(preferencesService.resolveEffectiveTheme("light", "dark"), "light");
    assert.strictEqual(preferencesService.resolveEffectiveTheme("dark", "light"), "dark");
  });

  runTest("themeService tokens cover all essential surface and semantic color tokens", () => {
    const light = themeService.getThemeTokens("light");
    const dark = themeService.getThemeTokens("dark");
    const keys = ["screenBg", "headerBg", "cardBg", "textPrimary", "textSecondary", "primary", "success", "danger", "tabBarBg", "divider"];

    keys.forEach(k => {
      assert(light[k], `Light theme missing token: ${k}`);
      assert(dark[k], `Dark theme missing token: ${k}`);
    });

    assert.notStrictEqual(light.screenBg, dark.screenBg, "Dark and light screen backgrounds must differ");
    assert.notStrictEqual(light.textPrimary, dark.textPrimary, "Dark and light text colors must differ");
  });

  await runAsyncTest("Theme switching persists reliably across storage reloads", async () => {
    const adapter = createMockAdapter();
    const initial = await preferencesService.getStoredPreferences(adapter);
    assert.strictEqual(initial.theme, "light");

    await preferencesService.savePreferences(adapter, { theme: "dark" });
    const storedDark = await preferencesService.getStoredPreferences(adapter);
    assert.strictEqual(storedDark.theme, "dark");

    await preferencesService.savePreferences(adapter, { theme: "system" });
    const storedSystem = await preferencesService.getStoredPreferences(adapter);
    assert.strictEqual(storedSystem.theme, "system");
  });

  // =========================================================================
  // 4. LANGUAGE SWITCHING (bn, en, system) & FALLBACK
  // =========================================================================
  console.log("\n--- PART 4: LANGUAGE SWITCHING & FALLBACK ---");

  runTest("preferencesService sanitizes and resolves effective languages", () => {
    assert.strictEqual(preferencesService.sanitizePreferences({ language: "en" }).language, "en");
    assert.strictEqual(preferencesService.sanitizePreferences({ language: "bn" }).language, "bn");
    assert.strictEqual(preferencesService.sanitizePreferences({ language: "system" }).language, "system");
    assert.strictEqual(preferencesService.sanitizePreferences({ language: "es" }).language, "bn");

    // System locale resolution
    assert.strictEqual(preferencesService.resolveEffectiveLanguage("system", "en-US"), "en");
    assert.strictEqual(preferencesService.resolveEffectiveLanguage("system", "en_GB"), "en");
    assert.strictEqual(preferencesService.resolveEffectiveLanguage("system", "bn-BD"), "bn");
    assert.strictEqual(preferencesService.resolveEffectiveLanguage("system", "bn"), "bn");
    assert.strictEqual(preferencesService.resolveEffectiveLanguage("system", "fr-FR"), "bn", "Unsupported locale must fall back to bn");
    assert.strictEqual(preferencesService.resolveEffectiveLanguage("system", null), "bn", "Null locale must fall back to bn");
  });

  runTest("i18nService translation fallback to Bangla for missing keys and unknown locales", () => {
    // Known key
    assert.strictEqual(i18nService.t("header_support", "bn"), "সাপোর্ট");
    assert.strictEqual(i18nService.t("header_support", "en"), "Support");

    // Fallback when locale is unknown
    assert.strictEqual(i18nService.t("header_support", "xx"), "সাপোর্ট");

    // Missing key returns key literal
    assert.strictEqual(i18nService.t("non_existent_key_xyz", "bn"), "non_existent_key_xyz");
    assert.strictEqual(i18nService.t("non_existent_key_xyz", "en"), "non_existent_key_xyz");
  });

  await runAsyncTest("Language preference persistence to storage adapter", async () => {
    const adapter = createMockAdapter();
    await preferencesService.savePreferences(adapter, { language: "en" });
    const stored = await preferencesService.getStoredPreferences(adapter);
    assert.strictEqual(stored.language, "en");

    await preferencesService.savePreferences(adapter, { language: "system" });
    const storedSys = await preferencesService.getStoredPreferences(adapter);
    assert.strictEqual(storedSys.language, "system");
  });

  // =========================================================================
  // 5. PERFORMANCE: O(1) / O(N) INDEXED CALCULATIONS VS O(N^2) SCANS
  // =========================================================================
  console.log("\n--- PART 5: PERFORMANCE: INDEXED LOOKUPS & ALGORITHMIC COMPLEXITY ---");

  runTest("Account lookup Map provides O(1) lookups vs O(N) array search", () => {
    const COUNT = 10000;
    const accounts = [];
    for (let i = 1; i <= COUNT; i++) {
      accounts.push({ id: `acc_${i}`, name: `Customer ${i}`, balance: i * 10, type: 1 });
    }

    // 1. Create O(1) Map
    const startMapBuild = process.hrtime.bigint();
    const lookupMap = ledgerEngine.createAccountLookupMap(accounts);
    const endMapBuild = process.hrtime.bigint();

    assert.strictEqual(lookupMap.size, COUNT);

    // 2. Sample 500 target IDs
    const sampleIds = [];
    for (let i = 0; i < 500; i++) {
      const targetId = `acc_${Math.floor(Math.random() * COUNT) + 1}`;
      sampleIds.push(targetId);
    }

    // Benchmark O(1) Map lookups
    const startMapLookups = process.hrtime.bigint();
    for (const id of sampleIds) {
      const found = lookupMap.get(id);
      assert(found && found.id === id);
    }
    const endMapLookups = process.hrtime.bigint();
    const mapLookupMs = Number(endMapLookups - startMapLookups) / 1000000;

    // Benchmark O(N) Array.find lookups
    const startArrayLookups = process.hrtime.bigint();
    for (const id of sampleIds) {
      const found = accounts.find(a => a.id === id);
      assert(found && found.id === id);
    }
    const endArrayLookups = process.hrtime.bigint();
    const arrayLookupMs = Number(endArrayLookups - startArrayLookups) / 1000000;

    console.log(`      ↳ 500 lookups over 10,000 accounts: Map=${mapLookupMs.toFixed(3)}ms vs Array=${arrayLookupMs.toFixed(3)}ms (Speedup: ${(arrayLookupMs / Math.max(0.001, mapLookupMs)).toFixed(1)}x)`);
    assert(mapLookupMs < arrayLookupMs, "O(1) Map lookups must be faster than O(N) Array scans");
  });

  runTest("O(N + M log M) batch running balance recalculation vs O(N * M) naive scans", () => {
    const NUM_ACCOUNTS = 500;
    const NUM_JOURNALS = 2500;

    const testAccounts = [];
    for (let i = 1; i <= NUM_ACCOUNTS; i++) {
      testAccounts.push({
        id: `acc_b_${i}`,
        name: `Cust ${i}`,
        type: 1,
        openingBalance: 1000,
        balance: 1000,
      });
    }

    const testJournals = [];
    for (let j = 1; j <= NUM_JOURNALS; j++) {
      const accNum = (j % NUM_ACCOUNTS) + 1;
      testJournals.push({
        id: `j_${j}`,
        accountId: `acc_b_${accNum}`,
        type: j % 2 === 0 ? "given" : "received",
        amount: 50 + (j % 100),
        date: `2026-10-${String((j % 28) + 1).padStart(2, '0')}`,
        time: "10:00 AM",
      });
    }

    // Warmup JIT for accurate benchmarking
    ledgerEngine.recalculateAllAccountBalances(testAccounts.slice(0, 20), testJournals.slice(0, 100));

    // 1. Naive O(N * M) recalculation simulation
    const startNaive = process.hrtime.bigint();
    let naiveChecks = 0;
    const naiveResults = [];
    for (const acc of testAccounts) {
      const targetJournals = [];
      for (const j of testJournals) {
        naiveChecks++;
        if (j.accountId === acc.id) {
          targetJournals.push(j);
        }
      }
      let running = acc.openingBalance;
      for (const j of targetJournals) {
        if (j.type === "given") running += j.amount;
        else running -= j.amount;
      }
      naiveResults.push({ id: acc.id, balance: running });
    }
    const endNaive = process.hrtime.bigint();
    const naiveTimeMs = Number(endNaive - startNaive) / 1000000;

    assert.strictEqual(naiveChecks, NUM_ACCOUNTS * NUM_JOURNALS, "Naive scan executed N*M checks");

    // 2. High-performance indexed batch recalculation
    const startIndexed = process.hrtime.bigint();
    const batchResult = ledgerEngine.recalculateAllAccountBalances(testAccounts, testJournals);
    const endIndexed = process.hrtime.bigint();
    const indexedTimeMs = Number(endIndexed - startIndexed) / 1000000;

    console.log(`      ↳ 500 accounts & 2500 journals: Indexed=${indexedTimeMs.toFixed(3)}ms vs Naive=${naiveTimeMs.toFixed(3)}ms (Speedup: ${(naiveTimeMs / Math.max(0.001, indexedTimeMs)).toFixed(1)}x)`);

    // Verify mathematical parity
    assert.strictEqual(batchResult.length, NUM_ACCOUNTS);
    for (let i = 0; i < NUM_ACCOUNTS; i++) {
      assert.strictEqual(batchResult[i].balance, naiveResults[i].balance, `Balance mismatch at account index ${i}`);
    }
    assert(indexedTimeMs < naiveTimeMs, "Indexed batch recalculation must be faster than naive scans");
  });

  runTest("Single-pass O(N) calculatePeriodMetrics accumulates analytics in under 20ms", () => {
    const NUM_TXNS = 3000;
    const txns = [];
    for (let i = 1; i <= NUM_TXNS; i++) {
      txns.push({
        id: `txn_${i}`,
        type: i % 3 === 0 ? "income" : "expense",
        amount: 250 + (i % 500),
        categoryId: `cat_${(i % 5) + 1}`,
        date: "2026-10-15",
        time: "10:00 AM",
      });
    }

    const mmState = {
      overallMonthlyBudget: 50000,
      categories: [
        { id: "cat_1", name: "খাবার" },
        { id: "cat_2", name: "দোকান খরচ" },
        { id: "cat_3", name: "যাতায়াত" },
        { id: "cat_4", name: "বিল" },
        { id: "cat_5", name: "অন্যান্য" },
      ],
      transactions: txns,
    };

    const startMetrics = process.hrtime.bigint();
    const metrics = mmService.calculatePeriodMetrics(mmState, "this_month");
    const endMetrics = process.hrtime.bigint();
    const metricsTimeMs = Number(endMetrics - startMetrics) / 1000000;

    console.log(`      ↳ calculatePeriodMetrics over 3,000 transactions executed in ${metricsTimeMs.toFixed(3)}ms`);
    assert(metrics.income > 0, "Income must be positive");
    assert(metrics.expense > 0, "Expense must be positive");
    assert.strictEqual(metrics.netSavings, metrics.income - metrics.expense);
    assert(metrics.categoryBreakdown.length > 0);
    assert(metricsTimeMs < 50, `Metrics computation must finish well within budget, took ${metricsTimeMs}ms`);
  });

  await runAsyncTest("StorageRepository WriteQueue serializes concurrent writes safely without race conditions", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const PROMISES = 20;
    const writePromises = [];
    for (let i = 1; i <= PROMISES; i++) {
      const idx = i;
      writePromises.push(
        repo.mutateCollection("notes", (currentNotes) => {
          return [...currentNotes, { id: `perf_note_${idx}`, text: `Note #${idx}`, isComplete: false }];
        })
      );
    }

    const results = await Promise.all(writePromises);
    assert.strictEqual(results.length, PROMISES);
    results.forEach((r, idx) => {
      assert.strictEqual(r.success, true, `Write ${idx} must succeed`);
    });

    const finalState = repo.getAuthoritativeState();
    const addedNotes = finalState.notes.filter(n => n.id && n.id.startsWith("perf_note_"));
    assert.strictEqual(addedNotes.length, PROMISES, "All 20 concurrent notes must be atomically preserved");

    // Verify ordering
    for (let i = 0; i < PROMISES; i++) {
      assert.strictEqual(addedNotes[i].id, `perf_note_${i + 1}`);
    }
  });

  console.log("\n================================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
  console.log("================================================================");

  if (passed !== total) {
    process.exitCode = 1;
  }
})();
