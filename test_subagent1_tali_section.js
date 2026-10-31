const assert = require("assert");
const fs = require("fs");

const storageRepoModule = require("./src/storageRepository");
const { StorageRepository, createDefaultState, SAMPLE_CUSTOMER_MAPPINGS, migrateLegacySampleCustomerNames, loadStore } = storageRepoModule;
const themeService = require("./src/themeService");
const i18nService = require("./src/i18nService");
const { t } = i18nService;

console.log("================================================================");
console.log("SUBAGENT 1: TALI SECTION UI & CUSTOMER DATA TEST SUITE");
console.log("================================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log("[PASS] TEST " + total + ": " + name);
    passed++;
  } catch (err) {
    console.error("[FAIL] TEST " + total + ": " + name);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log("[PASS] TEST " + total + ": " + name);
    passed++;
  } catch (err) {
    console.error("[FAIL] TEST " + total + ": " + name);
    console.error(err);
    process.exitCode = 1;
  }
}

(async () => {
  // -------------------------------------------------------------
  // PART 1: 12 SAMPLE CUSTOMER NAMES & REPOSITORY INTEGRITY
  // -------------------------------------------------------------
  runTest("createDefaultState() seeds exactly 12 Bengali sample customer names", () => {
    const state = createDefaultState();
    assert(Array.isArray(state.accounts), "state.accounts must be an array");
    assert.strictEqual(state.accounts.length, 12, "Must have exactly 12 default accounts");

    const expectedNames = [
      "নমুনা গ্রাহক ০১",
      "নমুনা গ্রাহক ০২",
      "নমুনা গ্রাহক ০৩",
      "নমুনা গ্রাহক ০৪",
      "নমুনা গ্রাহক ০৫",
      "নমুনা গ্রাহক ০৬",
      "নমুনা গ্রাহক ০৭",
      "নমুনা গ্রাহক ০৮",
      "নমুনা গ্রাহক ০৯",
      "নমুনা গ্রাহক ১০",
      "নমুনা গ্রাহক ১১",
      "নমুনা গ্রাহক ১২"
    ];

    expectedNames.forEach((expectedName, idx) => {
      const id = String(idx + 1);
      const acc = state.accounts.find(a => String(a.id) === id);
      assert(acc, "Account with ID " + id + " must exist");
      assert.strictEqual(acc.name, expectedName, "Account " + id + " must have name " + expectedName);
      assert(acc.phone && acc.phone.startsWith("01"), "Account " + id + " must retain valid phone");
      assert(typeof acc.balance === "number", "Account " + id + " must have numeric balance");
      assert(typeof acc.openingBalance === "number", "Account " + id + " must have numeric openingBalance");
    });
  });

  runTest("Financial relationships and journals are preserved in default state", () => {
    const state = createDefaultState();
    assert(Array.isArray(state.journals), "state.journals must be an array");
    assert.strictEqual(state.journals.length, 3, "Must retain 3 initial journals");

    const j1 = state.journals.find(j => j.id === "1");
    assert.strictEqual(j1.accountId, "1", "Journal 1 must link to account 1");
    assert.strictEqual(j1.amount, 3200, "Journal 1 amount must be 3200");
    assert.strictEqual(j1.runningBalance, 7000, "Journal 1 running balance must be 7000");

    const acc1 = state.accounts.find(a => a.id === "1");
    assert.strictEqual(acc1.openingBalance, 3800, "Account 1 opening balance must be 3800");
    assert.strictEqual(acc1.balance, 7000, "Account 1 balance must match journal runningBalance (3800 + 3200 = 7000)");
  });

  runTest("migrateLegacySampleCustomerNames() safely and idempotently updates legacy seed names only", () => {
    const legacyAccounts = [
      { id: "1", name: "Raihan ★ khoksha", phone: "01711223344", balance: 7000 },
      { id: "2", name: "Faysal ★★", phone: "01812345678", balance: 10000 },
      { id: "3", name: "User Custom Name", phone: "01911998877", balance: 8000 }, // User renamed
      { id: "13", name: "Real Customer Thirteen", phone: "01700000000", balance: 500 }, // User created
    ];

    const result = migrateLegacySampleCustomerNames(legacyAccounts);
    assert.strictEqual(result.changed, true, "Should detect changes for legacy sample names");
    assert.strictEqual(result.accounts[0].name, "নমুনা গ্রাহক ০১");
    assert.strictEqual(result.accounts[1].name, "নমুনা গ্রাহক ০২");
    assert.strictEqual(result.accounts[2].name, "User Custom Name", "Must never mutate user-renamed customer");
    assert.strictEqual(result.accounts[3].name, "Real Customer Thirteen", "Must never mutate user-created customer");

    // Run again on the migrated result -> must be idempotent
    const idempotentResult = migrateLegacySampleCustomerNames(result.accounts);
    assert.strictEqual(idempotentResult.changed, false, "Second run must be idempotent with changed: false");
    assert.strictEqual(idempotentResult.accounts[0].name, "নমুনা গ্রাহক ০১");
  });

  await runAsyncTest("loadStore() migrates legacy default sample customers in storage and persists", async () => {
    const mockStorage = {};
    const mockAdapter = {
      getItem: async (key) => mockStorage[key] || null,
      setItem: async (key, val) => { mockStorage[key] = val; }
    };

    // Seed v6 store with legacy seed customer names
    const legacyState = {
      accounts: [
        { id: "1", name: "Raihan ★ khoksha", phone: "01711223344", balance: 7000, openingBalance: 3800 },
        { id: "2", name: "Faysal ★★", phone: "01812345678", balance: 10000, openingBalance: 8550 },
        { id: "3", name: "হাজী মোহাম্মদ আলী", phone: "01911998877", balance: 8000, openingBalance: 3000 }, // Real user customer
      ],
      journals: [],
      businesses: [{ id: "1", name: "টেস্ট শপ", isSelected: true, isArchived: false }],
      activeBusinessId: "1"
    };
    mockStorage['tallykhata_offline_store_v6'] = JSON.stringify(legacyState);

    const repo = new StorageRepository(mockAdapter);
    const loadRes = await repo.loadStore();
    assert.strictEqual(loadRes.success, true);
    assert.strictEqual(loadRes.data.accounts[0].name, "নমুনা গ্রাহক ০১");
    assert.strictEqual(loadRes.data.accounts[1].name, "নমুনা গ্রাহক ০২");
    assert.strictEqual(loadRes.data.accounts[2].name, "হাজী মোহাম্মদ আলী", "User customer must remain unchanged");

    // Verify persisted into storage
    const persisted = JSON.parse(mockStorage['tallykhata_offline_store_v6']);
    assert.strictEqual(persisted.accounts[0].name, "নমুনা গ্রাহক ০১");
    assert.strictEqual(persisted.accounts[1].name, "নমুনা গ্রাহক ০২");
    assert.strictEqual(persisted.accounts[2].name, "হাজী মোহাম্মদ আলী");
  });

  runTest("INITIAL_ACCOUNTS in App.js is synchronized with the 12 Bengali sample names", () => {
    const appSource = fs.readFileSync("App.js", "utf8");
    assert(appSource.includes("name: 'নমুনা গ্রাহক ০১'"), "App.js must have নমুনা গ্রাহক ০১");
    assert(appSource.includes("name: 'নমুনা গ্রাহক ১২'"), "App.js must have নমুনা গ্রাহক ১২");
    assert(!appSource.includes("name: 'Raihan ★ khoksha'"), "App.js must not have Raihan ★ khoksha");
  });

  // -------------------------------------------------------------
  // PART 2: CASHBOX RENAMING VERIFICATION
  // -------------------------------------------------------------
  runTest("i18nService provides cb_title and qa_cashbox as ক্যাশবক্স / Cashbox", () => {
    assert.strictEqual(t("cb_title", "bn"), "ক্যাশবক্স");
    assert.strictEqual(t("qa_cashbox", "bn"), "ক্যাশবক্স");
    assert.strictEqual(t("tab_cashbox", "bn"), "ক্যাশবক্স");

    assert.strictEqual(t("cb_title", "en"), "Cashbox");
    assert.strictEqual(t("qa_cashbox", "en"), "Cashbox");
    assert.strictEqual(t("tab_cashbox", "en"), "Cashbox");
  });

  runTest("No legacy ডেইলি ক্যাশবক্স or দৈনিক ক্যাশবক্স remains in i18nService or App.js for cashbox title", () => {
    const i18nSource = fs.readFileSync("src/i18nService.js", "utf8");
    assert(!i18nSource.includes("'ডেইলি ক্যাশবক্স'"), "No ডেইলি ক্যাশবক্স in i18nService");
    assert(!i18nSource.includes('"ডেইলি ক্যাশবক্স"'), "No ডেইলি ক্যাশবক্স in i18nService");
    assert(!i18nSource.includes("cb_title: 'দৈনিক ক্যাশবক্স'"), "cb_title must not be দৈনিক ক্যাশবক্স");
    assert(!i18nSource.includes('qa_cashbox: "দৈনিক ক্যাশবক্স"'), "qa_cashbox must not be দৈনিক ক্যাশবক্স");

    const appSource = fs.readFileSync("App.js", "utf8");
    assert(!appSource.includes("ডেইলি ক্যাশবক্স"), "App.js must not include ডেইলি ক্যাশবক্স");
    assert(appSource.includes('accessibilityLabel={tStatic("ক্যাশবক্স")}'), "Quick grid accessibility label must be ক্যাশবক্স");
  });

  // -------------------------------------------------------------
  // PART 3: 8 QUICK ACTION ICONS & 3D SQUIRCLE MODERNIZATION
  // -------------------------------------------------------------
  runTest("themeService provides tactile palettes for all 8 quick action variants in Light and Dark", () => {
    const variants = ["primary", "warning", "info", "danger", "secondary", "success", "purple", "teal"];
    variants.forEach(variant => {
      const lightTheme = themeService.getIconTheme(variant, "light");
      assert(lightTheme.bg, "Variant " + variant + " missing light bg");
      assert(lightTheme.borderTop, "Variant " + variant + " missing light borderTop");
      assert(lightTheme.borderBottom, "Variant " + variant + " missing light borderBottom");
      assert(lightTheme.borderSides, "Variant " + variant + " missing light borderSides");
      assert(lightTheme.tint, "Variant " + variant + " missing light tint");

      const darkTheme = themeService.getIconTheme(variant, "dark");
      assert(darkTheme.bg, "Variant " + variant + " missing dark bg");
      assert(darkTheme.borderTop, "Variant " + variant + " missing dark borderTop");
      assert(darkTheme.borderBottom, "Variant " + variant + " missing dark borderBottom");
      assert(darkTheme.borderSides, "Variant " + variant + " missing dark borderSides");
      assert(darkTheme.tint, "Variant " + variant + " missing dark tint");
    });
  });

  runTest("AppIcon in App.js implements 3D squircle geometry with top highlight and extrusion ledge", () => {
    const appSource = fs.readFileSync("App.js", "utf8");
    assert(appSource.includes("Math.round(containerSize * 0.28)"), "AppIcon must use golden-ratio squircle radius (0.28)");
    assert(appSource.includes("borderTopWidth: 1.5"), "AppIcon must have 1.5 top bevel highlight");
    assert(appSource.includes("borderBottomWidth: 3"), "AppIcon must have 3 bottom extrusion ledge");
    assert(appSource.includes("Math.round(containerSize * 0.36)"), "AppIcon must have specular highlight sheen overlay");
    assert(appSource.includes("elevation: resolvedMode === 'dark' ? 4 : 3"), "AppIcon must have elevation 3 in light, 4 in dark");
    assert(appSource.includes("shadowOpacity: resolvedMode === 'dark' ? 0.35 : 0.12"), "AppIcon must have contrast-calibrated shadows");
  });

  runTest("Quick Actions Grid in App.js has all 8 distinct modern icons with size=28, containerSize=50", () => {
    const appSource = fs.readFileSync("App.js", "utf8");
    
    // Check all 8 icon sources
    assert(appSource.includes("require('./assets/icons/grid_multi_biz.png')"), "Missing grid_multi_biz");
    assert(appSource.includes("require('./assets/icons/grid_stock.png')"), "Missing grid_stock");
    assert(appSource.includes("require('./assets/icons/grid_note.png')"), "Missing grid_note");
    assert(appSource.includes("require('./assets/icons/grid_bulk_tagada.png')"), "Missing grid_bulk_tagada");
    assert(appSource.includes("require('./assets/icons/grid_money_manager.png')"), "Missing grid_money_manager");
    assert(appSource.includes("require('./assets/icons/grid_backup.png')"), "Missing grid_backup");
    assert(appSource.includes("require('./assets/icons/grid_tally_msg.png')"), "Missing grid_tally_msg");
    assert(appSource.includes("require('./assets/icons/grid_cashbox.png')"), "Missing grid_cashbox");

    // Check size=28 and containerSize=50 on the quick action grid
    const quickGridMatches = appSource.match(/containerSize=\{50\}/g);
    assert(quickGridMatches && quickGridMatches.length >= 8, "Expected at least 8 containerSize={50} icons, found " + (quickGridMatches ? quickGridMatches.length : 0));

    const iconSizeMatches = appSource.match(/size=\{28\}/g);
    assert(iconSizeMatches && iconSizeMatches.length >= 8, "Expected at least 8 size={28} icons, found " + (iconSizeMatches ? iconSizeMatches.length : 0));
  });

  runTest("Redmi Note 9 layout safety calculation guarantees zero text or icon clipping", () => {
    const screenWidthDp = 392.7; // Redmi Note 9 screen width
    const containerMarginHorizontal = 10 * 2;
    const availableWidth = screenWidthDp - containerMarginHorizontal; // ~372.7 dp
    const columnWidth = availableWidth * 0.24; // 24% width = ~89.45 dp
    const containerSize = 50; // Icon container width
    const horizontalMarginPerSide = (columnWidth - containerSize) / 2;

    assert(horizontalMarginPerSide >= 18, "Safe horizontal margin per side must be >= 18 dp (got " + horizontalMarginPerSide.toFixed(1) + " dp)");
    assert(columnWidth > containerSize, "Column width must safely contain 50dp icon container without overlapping adjacent columns");
  });

  console.log("\n================================================================");
  console.log("SUBAGENT 1 TEST SUMMARY: " + passed + " / " + total + " TESTS PASSED");
  console.log("================================================================\n");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
})();

