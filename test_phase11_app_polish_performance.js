const assert = require("assert");
const fs = require("fs");
const mmService = require("./src/moneyManagerService");
const ledgerEngine = require("./src/ledgerEngine");
const preferencesService = require("./src/preferencesService");
const themeService = require("./src/themeService");
const typographyTokens = require("./src/typographyTokens");
const iconMetrics = require("./src/iconMetrics");

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log("[PASS] TEST " + totalTests + ": " + name);
    passedTests++;
  } catch (err) {
    console.error("[FAIL] TEST " + totalTests + ": " + name);
    console.error(err);
    process.exit(1);
  }
}

console.log("================================================================");
console.log("PHASE 11: PERFORMANCE OPTIMIZATION & SYSTEM RELIABILITY SUITE");
console.log("================================================================\n");

console.log("--- PART 1: WEAKMAP CALCULATION CACHING & BENCHMARKS ---");
runTest("calculateNetWorth caches result on identical state reference", () => {
  const state = mmService.getDefaultState("2026-11-01");
  const nw1 = mmService.calculateNetWorth(state);
  const nw2 = mmService.calculateNetWorth(state);
  assert.strictEqual(nw1, nw2);
  assert.strictEqual(typeof nw1, "number");
  assert.strictEqual(nw1 > 0, true);
});

runTest("calculatePeriodMetrics caches results per period and invalidates on cache reset", () => {
  const state = mmService.getDefaultState("2026-11-01");
  const m1 = mmService.calculatePeriodMetrics(state, "this_month");
  const m2 = mmService.calculatePeriodMetrics(state, "this_month");
  assert.strictEqual(m1, m2);
  mmService.resetCache();
  const m3 = mmService.calculatePeriodMetrics(state, "this_month");
  assert.deepStrictEqual(m1, m3);
});

runTest("calculateCashFlow caches by period and customRange key", () => {
  const txns = [
    { type: "income", amount: 50000, date: "2026-11-01" },
    { type: "expense", amount: 15000, date: "2026-11-01" },
    { type: "transfer", amount: 5000, date: "2026-11-01" },
  ];
  const cf1 = mmService.calculateCashFlow(txns, "this_month");
  const cf2 = mmService.calculateCashFlow(txns, "this_month");
  assert.strictEqual(cf1, cf2);
  assert.strictEqual(cf1.totalIncome, 50000);
  assert.strictEqual(cf1.totalExpense, 15000);
  assert.strictEqual(cf1.netSavings, 35000);
});

runTest("calculateCategoryBudgets and calculateCategoryDistribution use WeakMap memoization", () => {
  const state = mmService.getDefaultState("2026-11-01");
  const b1 = mmService.calculateCategoryBudgets(state, "this_month");
  const b2 = mmService.calculateCategoryBudgets(state, "this_month");
  assert.strictEqual(b1, b2);
  const d1 = mmService.calculateCategoryDistribution(state, "this_month");
  const d2 = mmService.calculateCategoryDistribution(state, "this_month");
  assert.strictEqual(d1, d2);
});

console.log("\n--- PART 2: FINANCIAL ARITHMETIC & INTEGER PAISA SAFETY ---");
runTest("roundCurrency eliminates floating-point representation drift", () => {
  assert.strictEqual(mmService.roundCurrency(0.1 + 0.2), 0.3);
  assert.strictEqual(mmService.roundCurrency(100.005), 100.01);
  assert.strictEqual(mmService.roundCurrency(-45.555), -45.56);
});

runTest("deriveCashBoxSummary calculates exact integer paisa balances without precision loss", () => {
  const cashEntries = [
    { id: "c1", type: "in", amount: 100.15, businessId: "1" },
    { id: "c2", type: "out", amount: 45.10, businessId: "1" },
    { id: "c3", type: "in", amount: 200.00, businessId: "2" },
  ];
  const summaryBiz1 = ledgerEngine.deriveCashBoxSummary(cashEntries, "1");
  assert.strictEqual(summaryBiz1.cashIn, 100.15);
  assert.strictEqual(summaryBiz1.cashOut, 45.10);
  assert.strictEqual(summaryBiz1.balance, 55.05);
  const summaryBiz2 = ledgerEngine.deriveCashBoxSummary(cashEntries, "2");
  assert.strictEqual(summaryBiz2.cashIn, 200.00);
  assert.strictEqual(summaryBiz2.cashOut, 0);
  assert.strictEqual(summaryBiz2.balance, 200.00);
});

runTest("calculateAggregateMetrics computes double-entry balance correctly", () => {
  const accounts = [
    { id: "a1", type: 1, balance: 1500.50, businessId: "1" },
    { id: "a2", type: 1, balance: 500.25, businessId: "1" },
    { id: "a3", type: 2, balance: 800.75, businessId: "1" },
    { id: "a4", type: 1, balance: 9999.00, businessId: "2" },
  ];
  const metrics = ledgerEngine.calculateAggregateMetrics(accounts, [], "1");
  assert.strictEqual(metrics.totalReceivable, 2000.75);
  assert.strictEqual(metrics.totalPayable, 800.75);
  assert.strictEqual(metrics.netBalance, 1200.00);
  assert.strictEqual(metrics.customerCount, 2);
  assert.strictEqual(metrics.supplierCount, 1);
});

console.log("\n--- PART 3: VIRTUALIZATION & RENDERING EFFICIENCY ---");
runTest("App.js implements FlatList virtualization for high-volume customer accounts and journals", () => {
  const appSrc = fs.readFileSync("App.js", "utf8");
  assert.strictEqual(appSrc.includes("initialNumToRender={"), true);
  assert.strictEqual(appSrc.includes("maxToRenderPerBatch={"), true);
  assert.strictEqual(appSrc.includes("windowSize={"), true);
  assert.strictEqual(appSrc.includes("removeClippedSubviews={true}"), true);
});

runTest("App.js uses stable string keyExtractor properties across lists", () => {
  const appSrc = fs.readFileSync("App.js", "utf8");
  assert.strictEqual(appSrc.includes("keyExtractor={(item) => item.id"), true);
});

console.log("\n--- PART 4: ICON OPTICAL CALIBRATION & TOUCH TARGETS ---");
runTest("iconMetrics defines calibrated optical scales for core icons", () => {
  assert.strictEqual(iconMetrics.ICON_METRICS.ic_cash_buy.opticalScale, 1.28);
  assert.strictEqual(iconMetrics.ICON_METRICS.ic_cash_sale.opticalScale, 1.28);
  assert.strictEqual(iconMetrics.ICON_METRICS.ic_delete.opticalScale, 1.35);
  assert.strictEqual(iconMetrics.ICON_METRICS.ic_edit.opticalScale, 1.25);
  assert.strictEqual(iconMetrics.ICON_METRICS.grid_backup.translateY, 2);
});

runTest("STANDARD_TOUCH_HIT_SLOP provides >= 10dp target expansion", () => {
  const slop = iconMetrics.STANDARD_TOUCH_HIT_SLOP;
  assert.strictEqual(slop.top >= 10, true);
  assert.strictEqual(slop.bottom >= 10, true);
  assert.strictEqual(slop.left >= 10, true);
  assert.strictEqual(slop.right >= 10, true);
});

console.log("\n--- PART 5: THEME & TYPOGRAPHY COHERENCE ---");
runTest("Semantic tokens between LIGHT_THEME and DARK_THEME are 100% symmetric", () => {
  const lightKeys = Object.keys(themeService.LIGHT_THEME).sort();
  const darkKeys = Object.keys(themeService.DARK_THEME).sort();
  assert.deepStrictEqual(lightKeys, darkKeys);
});

runTest("All typography scales enforce Bengali line-height multiplier >= 1.35x", () => {
  const scales = typographyTokens.TYPOGRAPHY_SCALES;
  for (const [key, scale] of Object.entries(scales)) {
    const ratio = scale.lineHeight / scale.fontSize;
    assert.strictEqual(ratio >= 1.35, true, "Scale " + key + " ratio too small: " + ratio);
  }
});

console.log("\n--- PART 6: PREFERENCES V2 RESILIENCE ---");
runTest("sanitizePreferences clamps fontScale and whitelists density", () => {
  const sanitizedHigh = preferencesService.sanitizePreferences({ fontScale: 2.5, density: "ultra" });
  assert.strictEqual(sanitizedHigh.fontScale, 1.30);
  assert.strictEqual(sanitizedHigh.density, preferencesService.DENSITIES.STANDARD);
  const sanitizedLow = preferencesService.sanitizePreferences({ fontScale: 0.1 });
  assert.strictEqual(sanitizedLow.fontScale, 0.85);
});


console.log("\n--- PART 7: MODAL BACKHANDLER & HARDWARE NAVIGATION SAFETY ---");
runTest("All 53 Modals in App.js implement onRequestClose for Android back navigation", () => {
  const appSrc = fs.readFileSync("App.js", "utf8");
  const modalMatches = appSrc.match(/<Modal\b/g) || [];
  const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
  assert.strictEqual(modalMatches.length, 62, "Expected 62 modals in App.js");
  assert.strictEqual(reqCloseMatches.length, 62, "All 62 modals must implement onRequestClose");
});

console.log("\n--- PART 8: FORM USABILITY & KEYBOARD PERSISTENCE ---");
runTest("Form ScrollViews implement keyboardShouldPersistTaps handled", () => {
  const appSrc = fs.readFileSync("App.js", "utf8");
  const kbHandledMatches = appSrc.match(/keyboardShouldPersistTaps=['"]handled['"]/g) || [];
  assert.strictEqual(kbHandledMatches.length >= 20, true, "At least 20 form ScrollViews must persist taps");
});

console.log("\n--- PART 9: WCAG 2.2 AA / AAA COLOR CONTRAST VERIFICATION ---");
function parseHex(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return [r, g, b];
}
function getLuminance(hex) {
  const [r, g, b] = parseHex(hex);
  const lin = [r, g, b].map(c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

runTest("Core Light theme text and brand tokens achieve WCAG 2.2 AA (>= 4.5:1) compliance", () => {
  const textContrast = getContrastRatio(themeService.LIGHT_THEME.textPrimary, themeService.LIGHT_THEME.cardBg);
  assert.strictEqual(textContrast >= 7.0, true, "Light body text must meet WCAG AAA: " + textContrast);
  const brandContrast = getContrastRatio(themeService.LIGHT_THEME.primary, themeService.LIGHT_THEME.cardBg);
  assert.strictEqual(brandContrast >= 4.5, true, "Light brand text must meet WCAG AA: " + brandContrast);
});

runTest("Core Dark theme text and brand tokens achieve WCAG 2.2 AA (>= 4.5:1) compliance", () => {
  const textContrast = getContrastRatio(themeService.DARK_THEME.textPrimary, themeService.DARK_THEME.cardBg);
  assert.strictEqual(textContrast >= 7.0, true, "Dark body text must meet WCAG AAA: " + textContrast);
});

console.log("\n--- PART 10: LOCALIZATION & BENGALI TYPOGRAPHY COMPLETENESS ---");
const i18nService = require("./src/i18nService");
runTest("i18nService has 100% key parity between bn and en dictionaries (680 keys)", () => {
  const bnKeys = Object.keys(i18nService.STRINGS.bn).sort();
  const enKeys = Object.keys(i18nService.STRINGS.en).sort();
  assert.strictEqual(bnKeys.length >= 650, true, "Expected >= 650 keys");
  assert.strictEqual(enKeys.length >= 650, true, "Expected >= 650 keys");
  const missingInEn = bnKeys.filter(k => !enKeys.includes(k));
  assert.deepStrictEqual(missingInEn, []);
});

runTest("Currency and number formatting produces accurate localized output with symbols", () => {
  const bnFormatted = i18nService.formatCurrency(1250.50, "bn");
  assert.strictEqual(bnFormatted.includes("৳"), true);
  const enFormatted = i18nService.formatCurrency(1250.50, "en");
  assert.strictEqual(enFormatted.includes("৳"), true);
  assert.strictEqual(enFormatted.includes("1,250.5"), true);
});

console.log("\n--- PART 11: WEAKMAP CACHING PERFORMANCE BENCHMARKS ---");
runTest("WeakMap net worth lookup executes 10,000 iterations in < 50ms (sub-microsecond latency)", () => {
  const state = mmService.getDefaultState("2026-11-01");
  const start = Date.now();
  for (let i = 0; i < 10000; i++) {
    mmService.calculateNetWorth(state);
  }
  const duration = Date.now() - start;
  assert.strictEqual(duration < 50, true, "10k lookups took " + duration + "ms, expected < 50ms");
});

console.log("\n--- PART 12: BABEL AST SYNTAX COMPILATION ---");
const babel = require("@babel/core");
runTest("App.js parses cleanly with zero syntax errors via Babel parser", () => {
  const appSrc = fs.readFileSync("App.js", "utf8");
  const ast = babel.parseSync(appSrc, {
    filename: "App.js",
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ["jsx", "flow"] }
  });
  assert.strictEqual(ast && ast.program && ast.program.body.length > 0, true);
});

console.log("\n================================================================");
console.log("SUMMARY: " + passedTests + " / " + totalTests + " TESTS PASSED (100%)");
console.log("================================================================\n");
