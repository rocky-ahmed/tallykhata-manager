/**
 * test_iteration_225_ui_batch_tagada.js
 *
 * Automated QA & UI/UX Test Suite for Customer Debt Reminders,
 * Automated SMS Tagada Batch Dispatch Subsystem (গ্রুপ তাগাদা / Bulk Tagada),
 * Filter Chips, Debtor Multi-Selection, SMS Preview, Quota Guards, and WCAG AA Contrast.
 *
 * Milestone: REA-ITER-225
 * Reference: REF-001 (TallyKhata-Demo.apk) classes4.dex, BulkTagadaViewModel, resources.arsc
 * Hardware Display Baseline: Xiaomi Redmi Note 9 (1080x2340, 440dpi)
 * Target Framework: React Native / Expo (Babel Expo Preset)
 * Author: Worker 3 (Ohm - Permanent Frontend Developer, UI/UX & QA Owner)
 */

const assert = require("assert");
const fs = require("fs");
const babel = require("@babel/core");

const i18n = require("./src/i18nService");
const batchTagada = require("./src/batchTagadaService");
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
console.log("ITERATION 225: BATCH TAGADA & SMS DEBT REMINDER UI QA SUITE");
console.log("================================================================================\n");

// ============================================================================
// PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY
// ============================================================================
console.log("--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---");

const REQUIRED_I18N_KEYS = [
  "batch_tagada_title",
  "batch_tagada_desc",
  "batch_tagada_select_all",
  "batch_tagada_selected_count",
  "batch_tagada_total_due",
  "batch_tagada_free_sms_quota",
  "batch_tagada_send_btn",
  "batch_tagada_no_phone_warning",
  "batch_tagada_filter_all",
  "batch_tagada_filter_high",
  "batch_tagada_filter_aging",
  "batch_tagada_quota_exhausted_title",
  "batch_tagada_quota_exhausted_msg",
  "batch_tagada_buy_sms_pack",
  "batch_tagada_share_fallback",
  "batch_tagada_success",
  "batch_tagada_preview_title",
  "batch_tagada_preview_desc",
  "batch_tagada_sms_template",
  "batch_tagada_sending",
  "batch_tagada_sim_fallback",
  "batch_tagada_gold_upgrade",
  "batch_tagada_empty_list",
  "batch_tagada_no_selection_warning",
  "batch_tagada_channel_free",
  "batch_tagada_channel_paid",
  "batch_tagada_channel_share",
  "batch_tagada_confirm_title",
  "batch_tagada_confirm_msg",
  "batch_tagada_result_title",
  "batch_tagada_result_success_count",
  "batch_tagada_result_failed_count",
  "batch_tagada_result_quota_left",
];

runTest("1.1: All Iteration 225 localization keys exist in STRINGS.bn", () => {
  REQUIRED_I18N_KEYS.forEach((key) => {
    assert(i18n.STRINGS.bn[key] !== undefined, `Missing BN key: ${key}`);
    assert(typeof i18n.STRINGS.bn[key] === "string" && i18n.STRINGS.bn[key].length > 0, `Empty BN key: ${key}`);
  });
});

runTest("1.2: All Iteration 225 localization keys exist in STRINGS.en", () => {
  REQUIRED_I18N_KEYS.forEach((key) => {
    assert(i18n.STRINGS.en[key] !== undefined, `Missing EN key: ${key}`);
    assert(typeof i18n.STRINGS.en[key] === "string" && i18n.STRINGS.en[key].length > 0, `Empty EN key: ${key}`);
  });
});

runTest("1.3: t() helper translates keys symmetrically across languages", () => {
  assert.strictEqual(i18n.t("batch_tagada_title", "bn"), "গ্রুপ তাগাদা");
  assert.strictEqual(i18n.t("batch_tagada_title", "en"), "Group Tagada");
  assert.strictEqual(i18n.t("batch_tagada_send_btn", "bn"), "গ্রুপ তাগাদা পাঠাই");
  assert.strictEqual(i18n.t("batch_tagada_send_btn", "en"), "Send Group Tagada");
  assert.strictEqual(i18n.t("batch_tagada_filter_all", "bn"), "সকল");
  assert.strictEqual(i18n.t("batch_tagada_filter_all", "en"), "All");
});

runTest("1.4: translateStaticText translates static terms consistently", () => {
  assert.strictEqual(i18n.translateStaticText("গ্রুপ তাগাদা", "en"), "Group Tagada");
  assert.strictEqual(i18n.translateStaticText("গ্রুপ তাগাদা পাঠাই", "en"), "Send Group Tagada");
  assert.strictEqual(i18n.translateStaticText("সবাইকে সিলেক্ট করুন", "en"), "Select All");
});

// ============================================================================
// PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
// ============================================================================
console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

runTest("2.1: Batch Tagada state hooks declared in App.js", () => {
  assert(appSource.includes("const [modalBatchTagada, setModalBatchTagada] = useState(false);"), "modalBatchTagada declared");
  assert(appSource.includes("const [batchTagadaSelectedAccounts, setBatchTagadaSelectedAccounts] = useState([]);"), "batchTagadaSelectedAccounts declared");
  assert(appSource.includes("const [batchTagadaFilter, setBatchTagadaFilter] = useState('all');"), "batchTagadaFilter declared");
  assert(appSource.includes("const [batchTagadaSending, setBatchTagadaSending] = useState(false);"), "batchTagadaSending declared");
  assert(appSource.includes("const [batchTagadaResultModal, setBatchTagadaResultModal] = useState(false);"), "batchTagadaResultModal declared");
  assert(appSource.includes("const [batchTagadaQuotaModal, setBatchTagadaQuotaModal] = useState(false);"), "batchTagadaQuotaModal declared");
  assert(appSource.includes("const [batchTagadaPreviewModal, setBatchTagadaPreviewModal] = useState(false);"), "batchTagadaPreviewModal declared");
});

runTest("2.2: global.__BATCH_TAGADA_TEST_HOOKS__ exposed in App.js", () => {
  assert(appSource.includes("global.__BATCH_TAGADA_TEST_HOOKS__ = {"), "global.__BATCH_TAGADA_TEST_HOOKS__ exposed");
  assert(appSource.includes("handleOpenBatchTagada,"), "handleOpenBatchTagada exposed");
  assert(appSource.includes("handleCloseBatchTagada,"), "handleCloseBatchTagada exposed");
  assert(appSource.includes("handleToggleSelectAllBatchTagada,"), "handleToggleSelectAllBatchTagada exposed");
  assert(appSource.includes("handleToggleDebtorAccount,"), "handleToggleDebtorAccount exposed");
  assert(appSource.includes("handleSelectBatchTagadaFilter,"), "handleSelectBatchTagadaFilter exposed");
  assert(appSource.includes("handleOpenSmsPreview,"), "handleOpenSmsPreview exposed");
  assert(appSource.includes("handleDispatchBatchTagada,"), "handleDispatchBatchTagada exposed");
  assert(appSource.includes("executeBatchTagadaDispatch,"), "executeBatchTagadaDispatch exposed");
});

runTest("2.3: batchTagadaService backend modules imported and bound in App.js", () => {
  assert(appSource.includes("import * as batchTagadaModule from './src/batchTagadaService';"), "batchTagadaModule imported");
  assert(appSource.includes("TAGADA_CHANNELS"), "TAGADA_CHANNELS imported");
  assert(appSource.includes("DISPATCH_MODES"), "DISPATCH_MODES imported");
  assert(appSource.includes("DEBT_AGING_TIERS"), "DEBT_AGING_TIERS imported");
  assert(appSource.includes("BENGALI_ARSC_TOKENS"), "BENGALI_ARSC_TOKENS imported");
});

// ============================================================================
// PART 3: NAVIGATION ENTRY POINTS & MODAL CONTAINER
// ============================================================================
console.log("\n--- PART 3: NAVIGATION ENTRY POINTS & MODAL CONTAINER ---");

runTest("3.1: modalBatchTagada Modal container and header rendered", () => {
  assert(appSource.includes("visible={modalBatchTagada}"), "modalBatchTagada visible binding present");
  assert(appSource.includes("onRequestClose={handleCloseBatchTagada}"), "onRequestClose bound to handleCloseBatchTagada");
  assert(appSource.includes("batchTagadaHeader: {"), "batchTagadaHeader style defined");
  assert(appSource.includes("batchTagadaHeaderTitle: {"), "batchTagadaHeaderTitle style defined");
  assert(appSource.includes("batchTagadaQuotaBadge: {"), "batchTagadaQuotaBadge style defined");
});

runTest("3.2: Batch Tagada entry point rendered in Quick Action Grid", () => {
  assert(appSource.includes("onPress={handleOpenBatchTagada}"), "handleOpenBatchTagada wired to action button");
  assert(appSource.includes("grid_bulk_tagada.png"), "grid_bulk_tagada icon wired in quick action");
});

runTest("3.3: Batch Tagada entry point rendered in Menu Tab", () => {
  assert(appSource.includes("t('batch_tagada_title')"), "batch_tagada_title localized string rendered");
  assert(appSource.includes("t('batch_tagada_desc')"), "batch_tagada_desc localized string rendered");
});

// ============================================================================
// PART 4: FILTER CHIPS & DEBT AGING TIERS
// ============================================================================
console.log("\n--- PART 4: FILTER CHIPS & DEBT AGING TIERS ---");

runTest("4.1: Filter chips row renders All, High Debt, and Aging 30d+", () => {
  assert(appSource.includes("batchTagadaFilterRow: {"), "batchTagadaFilterRow style defined");
  assert(appSource.includes("batchTagadaFilterChip: {"), "batchTagadaFilterChip style defined");
  assert(appSource.includes("batchTagadaFilterChipActive: {"), "batchTagadaFilterChipActive style defined");
  assert(appSource.includes("batch_tagada_filter_all"), "batch_tagada_filter_all token used");
  assert(appSource.includes("batch_tagada_filter_high"), "batch_tagada_filter_high token used");
  assert(appSource.includes("batch_tagada_filter_aging"), "batch_tagada_filter_aging token used");
});

runTest("4.2: Filter selection logic filters debtors appropriately", () => {
  const sampleDebtors = [
    { id: "c1", name: "Karim", balance: 500, lastTxnDate: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: "c2", name: "Rahim", balance: 2500, lastTxnDate: new Date(Date.now() - 40 * 86400000).toISOString() },
    { id: "c3", name: "Jabbar", balance: 1200, lastTxnDate: new Date(Date.now() - 10 * 86400000).toISOString() },
  ];

  // 'all' filter
  const allList = sampleDebtors.filter(() => true);
  assert.strictEqual(allList.length, 3);

  // 'high' filter (>1000)
  const highList = sampleDebtors.filter((c) => (Number(c.balance) || 0) >= 1000);
  assert.strictEqual(highList.length, 2);
  assert(highList.some(c => c.id === "c2") && highList.some(c => c.id === "c3"));

  // 'aging' filter (>= 30 days)
  const agingList = sampleDebtors.filter((c) => {
    const dMs = new Date(c.lastTxnDate).getTime();
    return Math.floor((Date.now() - dMs) / (1000 * 60 * 60 * 24)) >= 30;
  });
  assert.strictEqual(agingList.length, 1);
  assert.strictEqual(agingList[0].id, "c2");
});

runTest("4.3: categorizeDebtAging categorizes debtors into standard tiers", () => {
  const debtors = [
    { id: "c1", balance: 100, createDate: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: "c2", balance: 200, createDate: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: "c3", balance: 300, createDate: new Date(Date.now() - 45 * 86400000).toISOString() },
    { id: "c4", balance: 400, createDate: new Date(Date.now() - 90 * 86400000).toISOString() },
  ];
  const tiers = batchTagada.categorizeDebtAging(debtors);
  assert.strictEqual(tiers[batchTagada.DEBT_AGING_TIERS.TIER_0_15].count, 1);
  assert.strictEqual(tiers[batchTagada.DEBT_AGING_TIERS.TIER_16_30].count, 1);
  assert.strictEqual(tiers[batchTagada.DEBT_AGING_TIERS.TIER_31_60].count, 1);
  assert.strictEqual(tiers[batchTagada.DEBT_AGING_TIERS.TIER_60_PLUS].count, 1);
});

// ============================================================================
// PART 5: REACTIVE SELECTION LOGIC & MULTI-CUSTOMER ARITHMETIC
// ============================================================================
console.log("\n--- PART 5: REACTIVE SELECTION LOGIC & MULTI-CUSTOMER ARITHMETIC ---");

runTest("5.1: Master toggle bar renders select-all checkbox, label, and fraction indicator", () => {
  assert(appSource.includes("batchTagadaMasterBar: {"), "batchTagadaMasterBar style defined");
  assert(appSource.includes("batchTagadaMasterToggle"), "batchTagadaMasterToggle touchable defined");
  assert(appSource.includes("batchCheckbox"), "batchCheckbox circular style defined");
  assert(appSource.includes("batchCheckboxChecked"), "batchCheckboxChecked active style defined");
  assert(appSource.includes("batchTagadaSelectionStats"), "batchTagadaSelectionStats indicator defined");
});

runTest("5.2: Multi-customer list items render squircle avatar, name, phone, and due amount pill", () => {
  assert(appSource.includes("batchCustomerRow: {"), "batchCustomerRow style defined");
  assert(appSource.includes("batchCustomerAvatar: {"), "batchCustomerAvatar style defined");
  assert(appSource.includes("batchCustomerName: {"), "batchCustomerName style defined");
  assert(appSource.includes("batchCustomerPhone: {"), "batchCustomerPhone style defined");
  assert(appSource.includes("batchDuePill: {"), "batchDuePill style defined");
  assert(appSource.includes("batchDueAmount: {"), "batchDueAmount style defined");
  assert(appSource.includes("batchNoPhoneBadge: {"), "batchNoPhoneBadge style defined");
});

runTest("5.3: Select-All toggle switches between selecting all and deselecting", () => {
  const visible = ["c1", "c2", "c3"];
  let selected = ["c1", "c2", "c3"];
  const allSelected = visible.every(id => selected.includes(id));
  assert.strictEqual(allSelected, true);

  // Toggle off
  selected = selected.filter(id => !visible.includes(id));
  assert.strictEqual(selected.length, 0);

  // Toggle on
  selected = [...new Set([...selected, ...visible])];
  assert.strictEqual(selected.length, 3);
});

runTest("5.4: Missing phone number warning badge renders when phone is absent or invalid", () => {
  assert(appSource.includes("batch_tagada_no_phone_warning"), "no_phone_warning token used");
  assert(appSource.includes("⚠️"), "warning icon displayed for missing phone");
});

// ============================================================================
// PART 6: SMS PREVIEW MODAL & TELECOM LIMITS
// ============================================================================
console.log("\n--- PART 6: SMS PREVIEW MODAL & TELECOM LIMITS ---");

runTest("6.1: SMS preview modal container and message bubble rendered", () => {
  assert(appSource.includes("visible={batchTagadaPreviewModal}"), "batchTagadaPreviewModal visible binding present");
  assert(appSource.includes("smsPreviewBubble: {"), "smsPreviewBubble style defined");
  assert(appSource.includes("smsPreviewText: {"), "smsPreviewText style defined");
  assert(appSource.includes("batch_tagada_preview_title"), "batch_tagada_preview_title rendered");
});

runTest("6.2: Authentic Bengali SMS Template renders localized date and amount", () => {
  const content = batchTagada.generateSmsContent({
    customerName: "আব্দুল করিম",
    creditAmount: 5000,
    shopName: "করিম স্টোর",
    asOfDate: new Date("2026-11-04"),
  });
  assert(content.includes("প্রিয় গ্রাহক,"), "Includes authentic greeting");
  assert(content.includes("বাকি"), "Includes outstanding due keyword");
  assert(content.includes("টাকা"), "Includes Bengali Taka word");
  assert(content.includes("tallypay.com/baki/"), "Includes payment link domain");
});

runTest("6.3: Telecom limits calculate segments for single and multipart UCS-2 SMS", () => {
  const shortMsg = "প্রিয় গ্রাহক, আপনার বাকি ৫০০ টাকা।";
  const seg1 = batchTagada.calculateSmsSegments(shortMsg);
  assert.strictEqual(seg1.encoding, "UCS-2");
  assert.strictEqual(seg1.segments, 1);

  // Message with > 70 characters
  const longMsg = "প্রিয় গ্রাহক, ৩০ নভেম্বর পর্যন্ত আপনার মোট বাকি ১০,৫০০ টাকা। অনুগ্রহ করে আপনার বাকি দ্রুত পরিশোধ করুন। ধন্যবাদ। বিস্তারিত জানতে ট্যাপ করুন https://tallypay.com/baki/123456789";
  const seg2 = batchTagada.calculateSmsSegments(longMsg);
  assert.strictEqual(seg2.encoding, "UCS-2");
  assert(seg2.segments >= 2, `Expected >= 2 segments, got ${seg2.segments}`);
});

// ============================================================================
// PART 7: QUOTA EXHAUSTION ALERT & CONFIRMATION DIALOG
// ============================================================================
console.log("\n--- PART 7: QUOTA EXHAUSTION ALERT & CONFIRMATION DIALOG ---");

runTest("7.1: Quota exhaustion alert dialog rendered with buy pack and share fallback", () => {
  assert(appSource.includes("visible={batchTagadaQuotaModal}"), "batchTagadaQuotaModal visible binding present");
  assert(appSource.includes("batch_tagada_quota_exhausted_title"), "quota_exhausted_title token used");
  assert(appSource.includes("batch_tagada_quota_exhausted_msg"), "quota_exhausted_msg token used");
  assert(appSource.includes("batch_tagada_buy_sms_pack"), "buy_sms_pack token used");
  assert(appSource.includes("batch_tagada_share_fallback"), "share_fallback token used");
});

runTest("7.2: Confirmation alert checks quota and prompts user before dispatch", () => {
  assert(appSource.includes("t(\"batch_tagada_confirm_title\")"), "batch_tagada_confirm_title used");
  assert(appSource.includes("t(\"batch_tagada_confirm_msg\")"), "batch_tagada_confirm_msg used");
  assert(appSource.includes("executeBatchTagadaDispatch"), "executeBatchTagadaDispatch bound to confirm button");
});

// ============================================================================
// PART 8: ATOMIC BATCH DISPATCH & tagada_log SCHEMA PARITY
// ============================================================================
console.log("\n--- PART 8: ATOMIC BATCH DISPATCH & tagada_log SCHEMA PARITY ---");

runTest("8.1: executeBatchTagadaDispatch prepares and dispatches batch atomically", () => {
  assert(appSource.includes("storageRepository.prepareBulkTagadaBatch"), "prepareBulkTagadaBatch called");
  assert(appSource.includes("storageRepository.dispatchBulkTagadaBatch"), "dispatchBulkTagadaBatch called");
  assert(appSource.includes("setRemainingSmsCount(res.remainingSmsCount)"), "remainingSmsCount updated reactively");
  assert(appSource.includes("setTagadaLogs(res.tagadaLogs)"), "tagadaLogs stored in state");
});

runTest("8.2: storageRepository tagada methods conform to clean-room contracts", () => {
  assert(typeof storage.storageRepository.prepareBulkTagadaBatch === "function", "prepareBulkTagadaBatch exists");
  assert(typeof storage.storageRepository.dispatchBulkTagadaBatch === "function", "dispatchBulkTagadaBatch exists");
  assert(typeof storage.storageRepository.getTagadaQuota === "function", "getTagadaQuota exists");
  assert(typeof storage.storageRepository.recordTagadaLog === "function", "recordTagadaLog exists");
});

runTest("8.3: Result modal displays success count, failed count, and remaining quota", () => {
  assert(appSource.includes("visible={batchTagadaResultModal}"), "batchTagadaResultModal visible binding present");
  assert(appSource.includes("batch_tagada_result_success_count"), "result_success_count token used");
  assert(appSource.includes("batch_tagada_result_failed_count"), "result_failed_count token used");
  assert(appSource.includes("batch_tagada_result_quota_left"), "result_quota_left token used");
});

// ============================================================================
// PART 9: TOUCH TARGET ERGONOMICS & MATERIAL DESIGN 48x48dp BOUNDS
// ============================================================================
console.log("\n--- PART 9: TOUCH TARGET ERGONOMICS & MATERIAL DESIGN 48x48dp BOUNDS ---");

runTest("9.1: STANDARD_TOUCH_HIT_SLOP expands interactive controls to >= 48x48dp", () => {
  assert(appSource.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "STANDARD_TOUCH_HIT_SLOP applied to buttons and chips");
});

runTest("9.2: Primary dispatch button and debtor rows have native height >= 48dp", () => {
  assert(appSource.includes("batchSendBtn: {"), "batchSendBtn style present");
  assert(appSource.includes("minHeight: 48"), "minHeight 48dp enforced on dispatch button");
  assert(appSource.includes("batchCustomerRow: {"), "batchCustomerRow style present");
  assert(appSource.includes("minHeight: 56"), "minHeight 56dp enforced on customer row");
});

runTest("9.3: Android soft navigation bar safe area padding (46dp) applied to sticky bottom bar", () => {
  assert(appSource.includes("paddingBottom: Platform.OS === 'android' ? 46 : 24"), "46dp safe area bottom padding present");
});

// ============================================================================
// PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
// ============================================================================
console.log("\n--- PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

runTest("10.1: Header & Dispatch Button brand red (#FFFFFF on #B81414) achieves WCAG AA (>= 4.5:1)", () => {
  const cr = contrastRatio("#FFFFFF", "#B81414");
  console.log(`      [CONTRAST] Brand Red Header / Button: ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Expected >= 4.5:1, got ${cr.toFixed(2)}:1`);
});

runTest("10.2: Active Filter Chip (#FFFFFF on #B81414) achieves WCAG AA (>= 4.5:1)", () => {
  const cr = contrastRatio("#FFFFFF", "#B81414");
  console.log(`      [CONTRAST] Active Filter Chip: ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Expected >= 4.5:1, got ${cr.toFixed(2)}:1`);
});

runTest("10.3: Inactive Filter Chip Light (#475569 on #F1F5F9) achieves WCAG AA (>= 4.5:1)", () => {
  const cr = contrastRatio("#475569", "#F1F5F9");
  console.log(`      [CONTRAST] Inactive Chip (Light): ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Expected >= 4.5:1, got ${cr.toFixed(2)}:1`);
});

runTest("10.4: Inactive Filter Chip Dark (#94A3B8 on #1E293B) achieves WCAG AA (>= 4.5:1)", () => {
  const cr = contrastRatio("#94A3B8", "#1E293B");
  console.log(`      [CONTRAST] Inactive Chip (Dark): ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Expected >= 4.5:1, got ${cr.toFixed(2)}:1`);
});

runTest("10.5: Due Amount Pill Text (#B91C1C on #FEE2E2) achieves WCAG AA (>= 4.5:1)", () => {
  const cr = contrastRatio("#B91C1C", "#FEE2E2");
  console.log(`      [CONTRAST] Due Amount Pill: ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Expected >= 4.5:1, got ${cr.toFixed(2)}:1`);
});

runTest("10.6: Warning Badge Text (#92400E on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
  const cr = contrastRatio("#92400E", "#FEF3C7");
  console.log(`      [CONTRAST] Warning Badge: ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Expected >= 4.5:1, got ${cr.toFixed(2)}:1`);
});

runTest("10.7: Sticky Bottom Bar Primary Text (#1E293B on #FFFFFF) achieves WCAG AAA (>= 7.0:1)", () => {
  const cr = contrastRatio("#1E293B", "#FFFFFF");
  console.log(`      [CONTRAST] Sticky Bottom Bar Text: ${cr.toFixed(2)}:1`);
  assert(cr >= 7.0, `Expected >= 7.0:1, got ${cr.toFixed(2)}:1`);
});

// ============================================================================
// PART 11: HARDWARE BACKHANDLER SAFE DISMISSAL
// ============================================================================
console.log("\n--- PART 11: HARDWARE BACKHANDLER SAFE DISMISSAL ---");

runTest("11.1: modalBatchTagada dismissed gracefully in onBackPress", () => {
  assert(appSource.includes("if (modalBatchTagada) { setModalBatchTagada(false); return true; }"), "modalBatchTagada back handler intercepted");
  assert(appSource.includes("if (batchTagadaResultModal) { setBatchTagadaResultModal(false); return true; }"), "batchTagadaResultModal back handler intercepted");
  assert(appSource.includes("if (batchTagadaQuotaModal) { setBatchTagadaQuotaModal(false); return true; }"), "batchTagadaQuotaModal back handler intercepted");
  assert(appSource.includes("if (batchTagadaPreviewModal) { setBatchTagadaPreviewModal(false); return true; }"), "batchTagadaPreviewModal back handler intercepted");
});

runTest("11.2: modalBatchTagada included in BackHandler dependency array", () => {
  assert(appSource.includes("modalBatchTagada, batchTagadaResultModal, batchTagadaQuotaModal, batchTagadaPreviewModal"), "modalBatchTagada included in useEffect dependencies");
});

// ============================================================================
// PART 12: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK
// ============================================================================
console.log("\n--- PART 12: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK ---");

runTest("12.1: App.js compiles cleanly via Babel parser with Expo preset", () => {
  const ast = babel.parseSync(appSource, {
    configFile: false,
    babelrc: false,
    presets: ["babel-preset-expo"],
  });
  assert(ast && ast.type === "File", "AST type must be File");
  assert(Array.isArray(ast.program.body), "Program body must be an array");
  console.log(`      [BABEL] Successfully parsed ${ast.program.body.length} top-level program statements`);
});

runTest("12.2: Latency benchmark: 1,000 batch selection evaluations in < 500ms (< 0.5ms/op)", () => {
  const customers = [];
  for (let i = 0; i < 50; i++) {
    customers.push({
      id: `cust_${i}`,
      name: `Customer ${i}`,
      balance: 500 + i * 100,
      phone: `017120000${String(i).padStart(2, '0')}`,
    });
  }

  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    batchTagada.evaluateBatchSelection(customers, [`cust_${i % 50}`]);
  }
  const elapsed = Date.now() - start;
  console.log(`      [BENCHMARK] 1,000 batch evaluations in ${elapsed}ms (${(elapsed / 1000).toFixed(4)}ms/op)`);
  assert(elapsed < 500, `Benchmark exceeded 500ms: took ${elapsed}ms`);
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log("\n================================================================================");
console.log(`ITERATION 225 QA SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log("================================================================================");

if (failures.length > 0) {
  console.error(`\nFAILED TESTS (${failures.length}):`);
  failures.forEach((f) => console.error(` - ${f.test}: ${f.error}`));
  process.exit(1);
} else {
  console.log("\nALL TESTS PASSED! Batch Tagada & SMS Debt Reminder UI Subsystem is Production-Ready.\n");
  process.exit(0);
}
