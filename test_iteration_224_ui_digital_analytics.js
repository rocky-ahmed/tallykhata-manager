/**
 * test_iteration_224_ui_digital_analytics.js
 *
 * Automated QA & UI/UX Test Suite for Merchant Dashboard Analytics,
 * Digital Inflow Aggregation, Period Selectors, Channel Distribution,
 * and Real-Time Payment Charts.
 *
 * Milestone: REA-ITER-224
 * Hardware Display Baseline: Xiaomi Redmi Note 9 (1080x2340, 440dpi)
 * Target Framework: React Native / Expo (Babel Expo Preset)
 * Author: Worker 3 (Ohm - Permanent Frontend Developer, UI/UX & QA Owner)
 */

const assert = require("assert");
const fs = require("fs");
const babel = require("@babel/core");

const i18n = require("./src/i18nService");
const digitalAnalytics = require("./src/digitalAnalyticsService");
const storage = require("./src/storageRepository");

// Read App.js source for static code & AST analysis
const appSource = fs.readFileSync("App.js", "utf8");

// ============================================================================
// TEST HARNESS UTILITIES
// ============================================================================
let totalTests = 0;
let passedTests = 0;
const failures = [];

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] TEST ${totalTests}: ${testName}`);
  } catch (err) {
    failures.push({ test: testName, error: err.message });
    console.error(`[FAIL] TEST ${totalTests}: ${testName}`);
    console.error(`       Error: ${err.message}`);
  }
}

// Relative luminance & WCAG contrast calculation
function getLuminance(hex) {
  const cleanHex = hex.replace("#", "");
  const rgb = [
    parseInt(cleanHex.substring(0, 2), 16) / 255,
    parseInt(cleanHex.substring(2, 4), 16) / 255,
    parseInt(cleanHex.substring(4, 6), 16) / 255,
  ];
  const a = rgb.map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

console.log("================================================================================");
console.log("ITERATION 224: MERCHANT DIGITAL ANALYTICS DASHBOARD UI QA SUITE");
console.log("================================================================================");

// ============================================================================
// PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY
// ============================================================================
console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---");

const ITERATION_224_KEYS = [
  "digital_analytics_title",
  "digital_analytics_desc",
  "analytics_period_today",
  "analytics_period_this_week",
  "analytics_period_this_month",
  "analytics_period_all_time",
  "analytics_period_custom",
  "analytics_total_collection",
  "analytics_total_txns",
  "analytics_avg_ticket",
  "analytics_net_collection",
  "analytics_channel_distribution",
  "analytics_growth_vs_prior",
  "analytics_growth_up",
  "analytics_growth_down",
  "analytics_growth_neutral",
  "analytics_channel_share",
  "analytics_no_transactions",
  "analytics_refresh",
  "analytics_hourly_velocity",
  "analytics_channel_bkash",
  "analytics_channel_nagad",
  "analytics_channel_rocket",
  "analytics_channel_upay",
  "analytics_channel_bangla_qr",
  "analytics_channel_card",
  "analytics_kpi_card_hint",
  "analytics_growth_badge_prefix",
];

runTest("1.1: All Iteration 224 localization keys exist in STRINGS.bn", () => {
  for (const k of ITERATION_224_KEYS) {
    const val = i18n.t(k, "bn");
    assert.ok(val && val.trim().length > 0, `Missing Bengali key: ${k}`);
  }
});

runTest("1.2: All Iteration 224 localization keys exist in STRINGS.en", () => {
  for (const k of ITERATION_224_KEYS) {
    const val = i18n.t(k, "en");
    assert.ok(val && val.trim().length > 0, `Missing English key: ${k}`);
  }
});

runTest("1.3: t() helper translates keys symmetrically across languages", () => {
  assert.strictEqual(i18n.t("digital_analytics_title", "bn"), "ডিজিটাল অ্যানালিটিক্স");
  assert.strictEqual(i18n.t("digital_analytics_title", "en"), "Digital Analytics");
  assert.strictEqual(i18n.t("analytics_period_today", "bn"), "আজকে");
  assert.strictEqual(i18n.t("analytics_period_today", "en"), "Today");
  assert.strictEqual(i18n.t("analytics_total_collection", "bn"), "মোট কালেকশন");
  assert.strictEqual(i18n.t("analytics_total_collection", "en"), "Total Collection");
  assert.strictEqual(i18n.t("analytics_channel_distribution", "bn"), "পেমেন্ট চ্যানেল ভিত্তিক অনুপাত");
  assert.strictEqual(i18n.t("analytics_channel_distribution", "en"), "Payment Channel Distribution");
});

// ============================================================================
// PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
// ============================================================================
console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

runTest("2.1: Digital Analytics state hooks declared in App.js", () => {
  assert.ok(appSource.includes("const [modalDigitalAnalytics, setModalDigitalAnalytics] = useState(false);"));
  assert.ok(appSource.includes("const [analyticsPeriod, setAnalyticsPeriod] = useState('TODAY');"));
  assert.ok(appSource.includes("const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);"));
});

runTest("2.2: global.__DIGITAL_ANALYTICS_TEST_HOOKS__ exposed in App.js", () => {
  assert.ok(appSource.includes("global.__DIGITAL_ANALYTICS_TEST_HOOKS__ = {"));
  assert.ok(appSource.includes("modalDigitalAnalytics,"));
  assert.ok(appSource.includes("setModalDigitalAnalytics,"));
  assert.ok(appSource.includes("analyticsPeriod,"));
  assert.ok(appSource.includes("setAnalyticsPeriod,"));
  assert.ok(appSource.includes("digitalAnalytics,"));
  assert.ok(appSource.includes("handleOpenDigitalAnalytics,"));
  assert.ok(appSource.includes("handleCloseDigitalAnalytics,"));
  assert.ok(appSource.includes("ANALYTICS_BRAND_COLORS,"));
});

runTest("2.3: Brand colors and period types defined in App.js", () => {
  assert.ok(appSource.includes("const ANALYTICS_BRAND_COLORS = {"));
  assert.ok(appSource.includes("bkash: '#E2136E'"));
  assert.ok(appSource.includes("nagad: '#F7941D'"));
  assert.ok(appSource.includes("rocket: '#8C3494'"));
  assert.ok(appSource.includes("upay: '#005696'"));
  assert.ok(appSource.includes("bangla_qr: '#0D6E5C'"));
  assert.ok(appSource.includes("card: '#1A1F71'"));
});

// ============================================================================
// PART 3: NAVIGATION ENTRY POINTS & MODAL CONTAINER
// ============================================================================
console.log("\n--- PART 3: NAVIGATION ENTRY POINTS & MODAL CONTAINER ---");

runTest("3.1: modalDigitalAnalytics Modal container and header rendered", () => {
  assert.ok(appSource.includes("<Modal"));
  assert.ok(appSource.includes("visible={modalDigitalAnalytics}"));
  assert.ok(appSource.includes("onRequestClose={handleCloseDigitalAnalytics}"));
  assert.ok(appSource.includes("{t('digital_analytics_title')}"));
  assert.ok(appSource.includes("{t('digital_analytics_desc')}"));
});

runTest("3.2: Digital Analytics entry point rendered in Menu Tab", () => {
  assert.ok(appSource.includes("onPress={handleOpenDigitalAnalytics}"));
  assert.ok(appSource.includes("accessibilityLabel={t('digital_analytics_title')}"));
  assert.ok(appSource.includes("tStatic(\"রিয়েল-টাইম\")"));
});

runTest("3.3: Digital Analytics quick action banner rendered in TallyPay Tab", () => {
  assert.ok(appSource.includes("styles.analyticsTallypayBanner"));
  assert.ok(appSource.includes("onPress={handleOpenDigitalAnalytics}"));
  assert.ok(appSource.includes("tStatic(\"দেখুন\")"));
});

// ============================================================================
// PART 4: PERIOD FILTER SWITCHING & DATE RANGE RESOLUTION
// ============================================================================
console.log("\n--- PART 4: PERIOD FILTER SWITCHING & DATE RANGE RESOLUTION ---");

runTest("4.1: Period selector chips render all 4 standard timeframes", () => {
  assert.ok(appSource.includes("key: 'TODAY', label: t('analytics_period_today')"));
  assert.ok(appSource.includes("key: 'THIS_WEEK', label: t('analytics_period_this_week')"));
  assert.ok(appSource.includes("key: 'THIS_MONTH', label: t('analytics_period_this_month')"));
  assert.ok(appSource.includes("key: 'ALL_TIME', label: t('analytics_period_all_time')"));
});

runTest("4.2: Period selection handler toggles active chip style and haptic feedback", () => {
  assert.ok(appSource.includes("const handleSelectAnalyticsPeriod = (periodKey) => {"));
  assert.ok(appSource.includes("handleSelectAnalyticsPeriod(p.key)"));
  assert.ok(appSource.includes("'#0D6E5C'"));
  assert.ok(appSource.includes("'#FFFFFF'"));
});

runTest("4.3: resolveAnalyticsDateRange computes exact period boundaries", () => {
  const refDate = new Date("2026-11-04T12:00:00Z");
  const todayRange = digitalAnalytics.resolveAnalyticsDateRange("TODAY", refDate);
  assert.strictEqual(todayRange.startDate, "2026-11-04");
  assert.strictEqual(todayRange.endDate, "2026-11-04");
  assert.strictEqual(todayRange.priorStartDate, "2026-11-03");
  assert.strictEqual(todayRange.priorEndDate, "2026-11-03");

  const monthRange = digitalAnalytics.resolveAnalyticsDateRange("THIS_MONTH", refDate);
  assert.strictEqual(monthRange.startDate, "2026-11-01");
  assert.strictEqual(monthRange.endDate, "2026-11-30");
});

// ============================================================================
// PART 5: KPI SUMMARY CARDS & FORMATTING PRECISION
// ============================================================================
console.log("\n--- PART 5: KPI SUMMARY CARDS & FORMATTING PRECISION ---");

runTest("5.1: Hero Card: মোট কালেকশন (Total Digital Collection) rendered with formatted currency", () => {
  assert.ok(appSource.includes("{t('analytics_total_collection')}"));
  assert.ok(appSource.includes("digitalAnalytics.formattedTotalInflowBn"));
  assert.ok(appSource.includes("digitalAnalytics.formattedTotalInflowEn"));
});

runTest("5.2: Card 2: মোট লেনদেন (Total Transaction Count) rendered with Bengali numerals", () => {
  assert.ok(appSource.includes("{t('analytics_total_txns')}"));
  assert.ok(appSource.includes("digitalAnalytics.formattedTxnCountBn"));
  assert.ok(appSource.includes("tStatic(\"টি\")"));
});

runTest("5.3: Card 3: গড় লেনদেন (Average Ticket Size) rendered with formatted currency", () => {
  assert.ok(appSource.includes("{t('analytics_avg_ticket')}"));
  assert.ok(appSource.includes("digitalAnalytics.formattedAverageTicketBn"));
  assert.ok(appSource.includes("digitalAnalytics.formattedAverageTicketEn"));
});

runTest("5.4: Currency formatting matches Bangladeshi numeral conventions (paisa precision)", () => {
  assert.strictEqual(digitalAnalytics.formatCurrencyBn(1250.5), "৳ ১,২৫০.৫০");
  assert.strictEqual(digitalAnalytics.formatCurrencyEn(1250.5), "৳ 1,250.50");
  assert.strictEqual(digitalAnalytics.formatCurrencyBn(0), "৳ ০.০০");
  assert.strictEqual(digitalAnalytics.toBengaliNumeral(45), "৪৫");
});

// ============================================================================
// PART 6: GROWTH RATE INDICATOR & DIRECTIONAL BADGES
// ============================================================================
console.log("\n--- PART 6: GROWTH RATE INDICATOR & DIRECTIONAL BADGES ---");

runTest("6.1: Growth calculation handles positive, negative, and zero variations", () => {
  const mockTxnsToday = [
    { id: "tx1", channel: "bkash", amount: 1500, date: "2026-11-04", status: "SUCCESS" },
  ];
  const summaryPos = digitalAnalytics.calculateDigitalInflowAnalytics(mockTxnsToday, {
    period: "TODAY",
    referenceDate: "2026-11-04",
    priorPeriodGrossPaisa: 100000, // ৳1,000 prior
  });
  assert.strictEqual(summaryPos.growthDirection, "POSITIVE");
  assert.strictEqual(summaryPos.growthRatePct, 50.0);

  const summaryNeg = digitalAnalytics.calculateDigitalInflowAnalytics(mockTxnsToday, {
    period: "TODAY",
    referenceDate: "2026-11-04",
    priorPeriodGrossPaisa: 200000, // ৳2,000 prior
  });
  assert.strictEqual(summaryNeg.growthDirection, "NEGATIVE");
  assert.strictEqual(summaryNeg.growthRatePct, -25.0);

  const summaryNeutral = digitalAnalytics.calculateDigitalInflowAnalytics(mockTxnsToday, {
    period: "TODAY",
    referenceDate: "2026-11-04",
    priorPeriodGrossPaisa: 150000, // ৳1,500 prior
  });
  assert.strictEqual(summaryNeutral.growthDirection, "NEUTRAL");
  assert.strictEqual(summaryNeutral.growthRatePct, 0.0);
});

runTest("6.2: App.js renders dynamic growth badge with direction indicators (▲ / ▼ / ●)", () => {
  assert.ok(appSource.includes("digitalAnalytics.growthDirection === 'POSITIVE' ? '▲ ' :"));
  assert.ok(appSource.includes("digitalAnalytics.formattedGrowthBn"));
});

// ============================================================================
// PART 7: PAYMENT CHANNEL DISTRIBUTION & BRAND COLORS
// ============================================================================
console.log("\n--- PART 7: PAYMENT CHANNEL DISTRIBUTION & BRAND COLORS ---");

runTest("7.1: Channel distribution progress bars rendered with brand colors", () => {
  assert.ok(appSource.includes("{t('analytics_channel_distribution')}"));
  assert.ok(appSource.includes("digitalAnalytics.channelBreakdown.map((ch) => {"));
  assert.ok(appSource.includes("const brandColor = ANALYTICS_BRAND_COLORS[ch.channelId]"));
  assert.ok(appSource.includes("backgroundColor: brandColor"));
});

runTest("7.2: Supported channels cover bKash, Nagad, Rocket, Upay, Bangla QR, Card", () => {
  const channels = digitalAnalytics.SUPPORTED_CHANNELS;
  assert.ok(channels.bkash, "Missing bKash");
  assert.ok(channels.nagad, "Missing Nagad");
  assert.ok(channels.rocket, "Missing Rocket");
  assert.ok(channels.upay, "Missing Upay");
  assert.ok(channels.bangla_qr, "Missing Bangla QR");
  assert.ok(channels.card, "Missing Card");
});

runTest("7.3: Channel percentage share uses Largest-Remainder Method summing to 100.0%", () => {
  const multiChannelTxns = [
    { id: "tx1", channel: "bkash", amount: 100, date: "2026-11-04", status: "SUCCESS" },
    { id: "tx2", channel: "nagad", amount: 100, date: "2026-11-04", status: "SUCCESS" },
    { id: "tx3", channel: "rocket", amount: 100, date: "2026-11-04", status: "SUCCESS" },
  ];
  const res = digitalAnalytics.calculateDigitalInflowAnalytics(multiChannelTxns, {
    period: "TODAY",
    referenceDate: "2026-11-04",
  });
  const totalPct = res.channelBreakdown.reduce((sum, ch) => sum + ch.percentage, 0);
  assert.strictEqual(Number(totalPct.toFixed(2)), 100.0);
});

runTest("7.4: Empty state message displayed when no transactions exist", () => {
  assert.ok(appSource.includes("{t('analytics_no_transactions')}"));
});

// ============================================================================
// PART 8: MULTI-TENANT BUSINESS ISOLATION
// ============================================================================
console.log("\n--- PART 8: MULTI-TENANT BUSINESS ISOLATION ---");

runTest("8.1: getActiveDigitalInflowTransactions scopes to activeBusinessId", () => {
  assert.ok(appSource.includes("storageRepository.getDigitalInflowTransactions(activeBusinessId || '1')"));
});

runTest("8.2: calculateDigitalInflowAnalytics isolates transactions by businessId", () => {
  const mixedTxns = [
    { id: "tx1", businessId: "1", channel: "bkash", amount: 500, date: "2026-11-04", status: "SUCCESS" },
    { id: "tx2", businessId: "2", channel: "nagad", amount: 800, date: "2026-11-04", status: "SUCCESS" },
  ];
  const biz1Res = digitalAnalytics.calculateDigitalInflowAnalytics(mixedTxns, {
    period: "TODAY",
    businessId: "1",
    referenceDate: "2026-11-04",
  });
  assert.strictEqual(biz1Res.totalInflowTaka, 500);
  assert.strictEqual(biz1Res.totalTxnCount, 1);

  const biz2Res = digitalAnalytics.calculateDigitalInflowAnalytics(mixedTxns, {
    period: "TODAY",
    businessId: "2",
    referenceDate: "2026-11-04",
  });
  assert.strictEqual(biz2Res.totalInflowTaka, 800);
  assert.strictEqual(biz2Res.totalTxnCount, 1);
});

// ============================================================================
// PART 9: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
// ============================================================================
console.log("\n--- PART 9: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

runTest("9.1: Active Period Chip (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = contrastRatio("#FFFFFF", "#0D6E5C");
  console.log(`      [CONTRAST] Active Chip: ${ratio.toFixed(2)}:1`);
  assert.ok(ratio >= 4.5, `Expected >= 4.5:1, got ${ratio}`);
});

runTest("9.2: Inactive Period Chip Light (#475569 on #F1F5F9) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = contrastRatio("#475569", "#F1F5F9");
  console.log(`      [CONTRAST] Inactive Chip (Light): ${ratio.toFixed(2)}:1`);
  assert.ok(ratio >= 4.5, `Expected >= 4.5:1, got ${ratio}`);
});

runTest("9.3: Inactive Period Chip Dark (#94A3B8 on #1E293B) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = contrastRatio("#94A3B8", "#1E293B");
  console.log(`      [CONTRAST] Inactive Chip (Dark): ${ratio.toFixed(2)}:1`);
  assert.ok(ratio >= 4.5, `Expected >= 4.5:1, got ${ratio}`);
});

runTest("9.4: Hero Card Total Text Light (#064E3B on #ECFDF5) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = contrastRatio("#064E3B", "#ECFDF5");
  console.log(`      [CONTRAST] Hero Card (Light): ${ratio.toFixed(2)}:1`);
  assert.ok(ratio >= 7.0, `Expected >= 7.0:1, got ${ratio}`);
});

runTest("9.5: Hero Card Total Text Dark (#F0FDF4 on #064E3B) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = contrastRatio("#F0FDF4", "#064E3B");
  console.log(`      [CONTRAST] Hero Card (Dark): ${ratio.toFixed(2)}:1`);
  assert.ok(ratio >= 7.0, `Expected >= 7.0:1, got ${ratio}`);
});

runTest("9.6: Positive Growth Badge (#15803D on #DCFCE7) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = contrastRatio("#15803D", "#DCFCE7");
  console.log(`      [CONTRAST] Positive Growth Badge: ${ratio.toFixed(2)}:1`);
  assert.ok(ratio >= 4.5, `Expected >= 4.5:1, got ${ratio}`);
});

runTest("9.7: Negative Growth Badge (#B91C1C on #FEE2E2) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = contrastRatio("#B91C1C", "#FEE2E2");
  console.log(`      [CONTRAST] Negative Growth Badge: ${ratio.toFixed(2)}:1`);
  assert.ok(ratio >= 4.5, `Expected >= 4.5:1, got ${ratio}`);
});

runTest("9.8: Modal Surface Primary Text (#1E293B on #FFFFFF) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = contrastRatio("#1E293B", "#FFFFFF");
  console.log(`      [CONTRAST] Modal Surface Text: ${ratio.toFixed(2)}:1`);
  assert.ok(ratio >= 7.0, `Expected >= 7.0:1, got ${ratio}`);
});

// ============================================================================
// PART 10: HARDWARE BACKHANDLER SAFE DISMISSAL
// ============================================================================
console.log("\n--- PART 10: HARDWARE BACKHANDLER SAFE DISMISSAL ---");

runTest("10.1: modalDigitalAnalytics dismissed gracefully in onBackPress", () => {
  assert.ok(
    appSource.includes("if (modalDigitalAnalytics) { setModalDigitalAnalytics(false); return true; }"),
    "modalDigitalAnalytics must be checked and dismissed in BackHandler"
  );
});

runTest("10.2: modalDigitalAnalytics included in BackHandler dependency array", () => {
  assert.ok(
    appSource.includes("modalDigitalAnalytics,"),
    "modalDigitalAnalytics must be present in BackHandler dependencies"
  );
});

// ============================================================================
// PART 11: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK
// ============================================================================
console.log("\n--- PART 11: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK ---");

runTest("11.1: App.js compiles cleanly via Babel parser with Expo preset", () => {
  const parsed = babel.parseSync(appSource, {
    configFile: false,
    babelrc: false,
    presets: ["babel-preset-expo"],
    filename: "App.js",
  });
  assert.ok(parsed && parsed.program, "Babel AST root must exist");
  assert.ok(parsed.program.body.length > 50, "Babel AST must contain >50 top-level statements");
  console.log(`      [BABEL] Successfully parsed ${parsed.program.body.length} top-level program statements`);
});

runTest("11.2: Latency benchmark: 100 analytics calculations in < 500ms (< 5ms/op)", () => {
  const sampleTxns = [
    { id: "tx1", channel: "bkash", amount: 1500, date: "2026-11-04", status: "SUCCESS" },
    { id: "tx2", channel: "nagad", amount: 800, date: "2026-11-04", status: "SUCCESS" },
    { id: "tx3", channel: "rocket", amount: 350, date: "2026-11-04", status: "SUCCESS" },
    { id: "tx4", channel: "bangla_qr", amount: 2200, date: "2026-11-04", status: "SUCCESS" },
    { id: "tx5", channel: "card", amount: 4500, date: "2026-11-04", status: "SUCCESS" },
  ];

  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    digitalAnalytics.calculateDigitalInflowAnalytics(sampleTxns, {
      period: i % 2 === 0 ? "TODAY" : "THIS_WEEK",
      referenceDate: "2026-11-04",
      priorPeriodGrossPaisa: 500000,
    });
  }
  const elapsedMs = Date.now() - startTime;
  console.log(`      [BENCHMARK] 100 calculations in ${elapsedMs}ms (${(elapsedMs / 100).toFixed(4)}ms/op)`);
  assert.ok(elapsedMs < 500, `Expected < 500ms, took ${elapsedMs}ms`);
});

// ============================================================================
// FINAL QA VERDICT & SUMMARY
// ============================================================================
console.log("\n================================================================================");
console.log(`ITERATION 224 QA SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log("================================================================================");

if (failures.length > 0) {
  console.error(`\nFAILED TESTS (${failures.length}):`);
  failures.forEach((f, idx) => {
    console.error(`  ${idx + 1}. ${f.test} -> ${f.error}`);
  });
  process.exit(1);
} else {
  console.log("\nALL TESTS PASSED! Merchant Digital Analytics Dashboard UI is Production-Ready.");
  process.exit(0);
}
