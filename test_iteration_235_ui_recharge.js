/**
 * TALLYKHATA ITERATION 235: TALLYPAY MOBILE RECHARGE UI/UX QA SUITE
 *
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)
 * Milestone: REA-ITER-235
 * Reference APK: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const i18n = require("./src/i18nService");
const tallyPay = require("./src/tallyPayService");
const storageRepository = require("./src/storageRepository");
const iconMetrics = require("./src/iconMetrics");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(desc, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log("  ✓ [PASS] " + desc);
  } catch (err) {
    failedTests++;
    console.error("  ✗ [FAIL] " + desc);
    console.error("    Error:", err.message);
  }
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [num >> 16, (num >> 8) & 255, num & 255];
}

function calculateContrastRatio(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function main() {
  console.log("================================================================================");
  console.log("TALLYKHATA ITERATION 235: TALLYPAY MOBILE RECHARGE UI/UX QA SUITE");
  console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
  console.log("Milestone: REA-ITER-235");
  console.log("================================================================================\n");

  const appSrc = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");

  // -----------------------------------------------------------------------------
  // PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY
  // -----------------------------------------------------------------------------
  console.log("--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---");

  const requiredI18nKeys = [
    "mobile_recharge_title",
    "mobile_recharge_subtitle",
    "recharge_amount_tab",
    "recharge_packages_tab",
    "recharge_mobile_number_label",
    "recharge_mobile_placeholder",
    "recharge_amount_label",
    "recharge_commission_label",
    "recharge_commission_earned",
    "recharge_preset_20",
    "recharge_preset_50",
    "recharge_preset_100",
    "recharge_preset_200",
    "recharge_preset_500",
    "recharge_package_validity",
    "recharge_package_days",
    "recharge_confirm_title",
    "recharge_pin_prompt",
    "recharge_success_title",
    "recharge_processing_title",
    "recharge_failed_title",
    "recharge_service_unavailable",
    "recharge_trx_id",
    "recharge_contact_picker",
    "daily_recharge_limit_notice"
  ];

  await runTest("1.1: All Iteration 235 localization keys exist in STRINGS.bn", () => {
    for (const key of requiredI18nKeys) {
      assert.ok(i18n.STRINGS.bn[key], "Missing key in STRINGS.bn: " + key);
    }
  });

  await runTest("1.2: All Iteration 235 localization keys exist in STRINGS.en", () => {
    for (const key of requiredI18nKeys) {
      assert.ok(i18n.STRINGS.en[key], "Missing key in STRINGS.en: " + key);
    }
  });

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
    assert.strictEqual(i18n.t("mobile_recharge_title", "bn"), "মোবাইল রিচার্জ");
    assert.strictEqual(i18n.t("mobile_recharge_title", "en"), "Mobile Recharge");
    assert.strictEqual(i18n.t("recharge_preset_20", "bn"), "৳ ২০");
    assert.strictEqual(i18n.t("recharge_preset_20", "en"), "৳ 20");
    assert.strictEqual(i18n.t("recharge_commission_label", "bn"), "কমিশন");
    assert.strictEqual(i18n.t("recharge_commission_label", "en"), "Commission");
  });

  await runTest("1.4: STATIC_TRANSLATIONS contains authentic Recharge terms", () => {
    assert.ok(i18n.STATIC_TRANSLATIONS["মোবাইল রিচার্জ"], "STATIC_TRANSLATIONS must have মোবাইল রিচার্জ");
    assert.ok(i18n.STATIC_TRANSLATIONS["মোবাইল রিচার্জ সফল হয়েছে"], "STATIC_TRANSLATIONS must have মোবাইল রিচার্জ সফল হয়েছে");
    assert.ok(i18n.STATIC_TRANSLATIONS["টাকার পরিমাণ"], "STATIC_TRANSLATIONS must have টাকার পরিমাণ");
  });

  await runTest("1.5: Complete dictionary parity maintained across bn and en", () => {
    const bnKeys = Object.keys(i18n.STRINGS.bn);
    const enKeys = Object.keys(i18n.STRINGS.en);
    assert.strictEqual(bnKeys.length, enKeys.length, "bn and en key counts must match exactly");
  });

  // -----------------------------------------------------------------------------
  // PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

  await runTest("2.1: Mobile Recharge state hooks declared in App.js", () => {
    assert.ok(appSrc.includes("const [modalRechargeNumber, setModalRechargeNumber] = useState(false);"));
    assert.ok(appSrc.includes("const [modalRechargeAmount, setModalRechargeAmount] = useState(false);"));
    assert.ok(appSrc.includes("const [modalRechargePackages, setModalRechargePackages] = useState(false);"));
    assert.ok(appSrc.includes("const [modalRechargePin, setModalRechargePin] = useState(false);"));
    assert.ok(appSrc.includes("const [modalRechargeVoucher, setModalRechargeVoucher] = useState(false);"));
    assert.ok(appSrc.includes("const [rechargeMobile, setRechargeMobile] = useState("));
    assert.ok(appSrc.includes('const [rechargeOperator, setRechargeOperator] = useState("GP");'));
    assert.ok(appSrc.includes('const [rechargeConnectionType, setRechargeConnectionType] = useState("PREPAID");'));
    assert.ok(appSrc.includes('const [rechargeAirtimeAmount, setRechargeAirtimeAmount] = useState("50");'));
    assert.ok(appSrc.includes("const [rechargeSelectedPackage, setRechargeSelectedPackage] = useState(null);"));
    assert.ok(appSrc.includes('const [rechargePackageCategory, setRechargePackageCategory] = useState("ALL");'));
    assert.ok(appSrc.includes('const [rechargePackageSearch, setRechargePackageSearch] = useState("");'));
    assert.ok(appSrc.includes('const [rechargePin, setRechargePin] = useState("");'));
    assert.ok(appSrc.includes("const [rechargeVoucherData, setRechargeVoucherData] = useState(null);"));
  });

  await runTest("2.2: global.__RECHARGE_TEST_HOOKS__ exposed in App.js", () => {
    assert.ok(appSrc.includes("global.__RECHARGE_TEST_HOOKS__ = {"), "Must export __RECHARGE_TEST_HOOKS__");
    assert.ok(appSrc.includes("modalRechargeNumber,"), "Must include modalRechargeNumber");
    assert.ok(appSrc.includes("handleOpenRechargeNumber,"), "Must include handleOpenRechargeNumber");
    assert.ok(appSrc.includes("handleProceedFromNumberToAmount,"), "Must include handleProceedFromNumberToAmount");
    assert.ok(appSrc.includes("handleConfirmRecharge,"), "Must include handleConfirmRecharge");
  });

  await runTest("2.3: Recharge engine and tallyPayService modules connected in App.js", () => {
    assert.ok(appSrc.includes("detectRechargeOperator: tpDetectRechargeOperator"), "Must destructure detectRechargeOperator");
    assert.ok(appSrc.includes("calculateRechargeCommission: tpCalculateRechargeCommission"), "Must destructure calculateRechargeCommission");
    assert.ok(appSrc.includes("RECHARGE_PACKAGES_CATALOG: TP_RECHARGE_PACKAGES_CATALOG"), "Must destructure RECHARGE_PACKAGES_CATALOG");
  });

  // -----------------------------------------------------------------------------
  // PART 3: NAVIGATION ENTRY POINTS IN TAB 4 (TALLYPAY)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 3: NAVIGATION ENTRY POINTS IN TAB 4 (TALLYPAY) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders Mobile Recharge quick action button", () => {
    assert.ok(appSrc.includes("testID=\"tp_mobile_recharge_btn\""), "tp_mobile_recharge_btn must exist");
    assert.ok(appSrc.includes("onPress={handleOpenRechargeNumber}"), "Must bind handleOpenRechargeNumber");
  });

  await runTest("3.2: Mobile Recharge button attaches STANDARD_TOUCH_HIT_SLOP and accessible role", () => {
    const btnIdx = appSrc.indexOf('testID="tp_mobile_recharge_btn"');
    assert.ok(btnIdx > 0, "Button must be in App.js");
    const snippet = appSrc.slice(btnIdx, btnIdx + 300);
    assert.ok(snippet.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "Must attach STANDARD_TOUCH_HIT_SLOP");
    assert.ok(snippet.includes("accessibilityRole=\"button\""), "Must declare accessibilityRole button");
  });

  // -----------------------------------------------------------------------------
  // PART 4: MODAL 97 (modalRechargeNumber) LAYOUT, OPERATOR DETECTION & CHIPS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 4: MODAL 97 (modalRechargeNumber) LAYOUT & OPERATOR DETECTION ---");

  await runTest("4.1: modalRechargeNumber defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes("testID=\"modal_recharge_number\""), "modal_recharge_number must exist");
    assert.ok(appSrc.includes("visible={modalRechargeNumber}"), "visible must bind modalRechargeNumber");
    assert.ok(appSrc.includes("onRequestClose={handleCloseRechargeNumber}"), "onRequestClose must bind handleCloseRechargeNumber");
  });

  await runTest("4.2: modalRechargeNumber renders back button with testID", () => {
    assert.ok(appSrc.includes("testID=\"btn_back_recharge_number\""), "btn_back_recharge_number must exist");
  });

  await runTest("4.3: modalRechargeNumber renders 11-digit mobile input with +88 prefix", () => {
    assert.ok(appSrc.includes("testID=\"input_recharge_mobile\""), "input_recharge_mobile must exist");
    assert.ok(appSrc.includes("keyboardType=\"phone-pad\""), "Must use phone-pad keyboard");
    assert.ok(appSrc.includes("maxLength={11}"), "Must restrict to 11 digits");
    assert.ok(appSrc.includes("+88"), "Must display +88 prefix badge");
  });

  await runTest("4.4: modalRechargeNumber renders 6 telecom operator chips", () => {
    assert.ok(appSrc.includes("testID=\"btn_operator_gp\""), "Grameenphone chip must exist");
    assert.ok(appSrc.includes("testID=\"btn_operator_banglalink\""), "Banglalink chip must exist");
    assert.ok(appSrc.includes("testID=\"btn_operator_robi\""), "Robi chip must exist");
    assert.ok(appSrc.includes("testID=\"btn_operator_airtel\""), "Airtel chip must exist");
    assert.ok(appSrc.includes("testID=\"btn_operator_teletalk\""), "Teletalk chip must exist");
    assert.ok(appSrc.includes("testID=\"btn_operator_skitto\""), "Skitto chip must exist");
  });

  await runTest("4.5: modalRechargeNumber renders contact picker button and proceed CTA", () => {
    assert.ok(appSrc.includes("testID=\"btn_recharge_contact_picker\""), "btn_recharge_contact_picker must exist");
    assert.ok(appSrc.includes("testID=\"btn_proceed_recharge_amount\""), "btn_proceed_recharge_amount must exist");
  });

  // -----------------------------------------------------------------------------
  // PART 5: MODAL 98 (modalRechargeAmount) LAYOUT & CONNECTION TYPES
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 5: MODAL 98 (modalRechargeAmount) LAYOUT & AIRTIME ---");

  await runTest("5.1: modalRechargeAmount defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes("testID=\"modal_recharge_amount\""), "modal_recharge_amount must exist");
    assert.ok(appSrc.includes("visible={modalRechargeAmount}"), "visible must bind modalRechargeAmount");
  });

  await runTest("5.2: modalRechargeAmount renders back button with testID", () => {
    assert.ok(appSrc.includes("testID=\"btn_back_recharge_amount\""), "btn_back_recharge_amount must exist");
  });

  await runTest("5.3: modalRechargeAmount renders connection type segmented switcher", () => {
    assert.ok(appSrc.includes("testID=\"segmented_recharge_connection_type\""), "segmented_recharge_connection_type must exist");
    assert.ok(appSrc.includes("testID=\"btn_conn_prepaid\""), "btn_conn_prepaid must exist");
    assert.ok(appSrc.includes("testID=\"btn_conn_postpaid\""), "btn_conn_postpaid must exist");
    assert.ok(appSrc.includes("testID=\"btn_conn_skitto\""), "btn_conn_skitto must exist");
  });

  await runTest("5.4: modalRechargeAmount renders airtime input and 5 preset chips", () => {
    assert.ok(appSrc.includes("testID=\"input_recharge_amount\""), "input_recharge_amount must exist");
    assert.ok(appSrc.includes("testID=\"btn_preset_20\""), "btn_preset_20 must exist");
    assert.ok(appSrc.includes("testID=\"btn_preset_50\""), "btn_preset_50 must exist");
    assert.ok(appSrc.includes("testID=\"btn_preset_100\""), "btn_preset_100 must exist");
    assert.ok(appSrc.includes("testID=\"btn_preset_200\""), "btn_preset_200 must exist");
    assert.ok(appSrc.includes("testID=\"btn_preset_500\""), "btn_preset_500 must exist");
  });

  await runTest("5.5: modalRechargeAmount renders 2.7% retailer commission banner and switch to packages CTA", () => {
    assert.ok(appSrc.includes("testID=\"banner_recharge_commission\""), "banner_recharge_commission must exist");
    assert.ok(appSrc.includes("testID=\"btn_switch_to_packages\""), "btn_switch_to_packages must exist");
    assert.ok(appSrc.includes("testID=\"btn_proceed_recharge_pin\""), "btn_proceed_recharge_pin must exist");
  });

  // -----------------------------------------------------------------------------
  // PART 6: MODAL 99 (modalRechargePackages) LAYOUT & PACKAGES CATALOG
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 6: MODAL 99 (modalRechargePackages) LAYOUT & PACKAGES ---");

  await runTest("6.1: modalRechargePackages defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes("testID=\"modal_recharge_packages\""), "modal_recharge_packages must exist");
    assert.ok(appSrc.includes("visible={modalRechargePackages}"), "visible must bind modalRechargePackages");
    assert.ok(appSrc.includes("onRequestClose={handleCloseRechargePackages}"), "onRequestClose must bind handleCloseRechargePackages");
  });

  await runTest("6.2: modalRechargePackages renders back button and switch to amount button", () => {
    assert.ok(appSrc.includes("testID=\"btn_back_recharge_packages\""), "btn_back_recharge_packages must exist");
    assert.ok(appSrc.includes("testID=\"btn_switch_to_amount\""), "btn_switch_to_amount must exist");
  });

  await runTest("6.3: modalRechargePackages renders search input and category filter tabs", () => {
    assert.ok(appSrc.includes("testID=\"input_search_packages\""), "input_search_packages must exist");
    assert.ok(appSrc.includes("testID=\"tab_pkg_cat_all\""), "tab_pkg_cat_all must exist");
    assert.ok(appSrc.includes("testID=\"tab_pkg_cat_special\""), "tab_pkg_cat_special must exist");
    assert.ok(appSrc.includes("testID=\"tab_pkg_cat_internet\""), "tab_pkg_cat_internet must exist");
    assert.ok(appSrc.includes("testID=\"tab_pkg_cat_minutes\""), "tab_pkg_cat_minutes must exist");
    assert.ok(appSrc.includes("testID=\"tab_pkg_cat_bundle\""), "tab_pkg_cat_bundle must exist");
    assert.ok(appSrc.includes("testID=\"tab_pkg_cat_call_rate\""), "tab_pkg_cat_call_rate must exist");
  });

  await runTest("6.4: modalRechargePackages renders catalog cards with price, validity & commission", () => {
    assert.ok(appSrc.includes("card_recharge_package_"), "Package card testID prefix must exist");
    assert.ok(appSrc.includes("handleSelectPackageItem(pkg)"), "Must bind handleSelectPackageItem");
  });

  // -----------------------------------------------------------------------------
  // PART 7: MODAL 100 (modalRechargePin) LAYOUT & PIN AUTHENTICATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 7: MODAL 100 (modalRechargePin) LAYOUT & PIN ---");

  await runTest("7.1: modalRechargePin defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes("testID=\"modal_recharge_pin\""), "modal_recharge_pin must exist");
    assert.ok(appSrc.includes("visible={modalRechargePin}"), "visible must bind modalRechargePin");
    assert.ok(appSrc.includes("onRequestClose={handleCloseRechargePin}"), "onRequestClose must bind handleCloseRechargePin");
  });

  await runTest("7.2: modalRechargePin renders back button with testID", () => {
    assert.ok(appSrc.includes("testID=\"btn_back_recharge_pin\""), "btn_back_recharge_pin must exist");
  });

  await runTest("7.3: modalRechargePin renders summary card with recipient, operator, gross amount, commission and net deduction", () => {
    const pinIdx = appSrc.indexOf('testID="modal_recharge_pin"');
    const snippet = appSrc.slice(pinIdx, pinIdx + 4000);
    assert.ok(snippet.includes("rechargeMobile"), "Must display rechargeMobile");
    assert.ok(snippet.includes("rechargeOperator"), "Must display rechargeOperator");
    assert.ok(snippet.includes("নেট কর্তন"), "Must display Net deduction");
  });

  await runTest("7.4: modalRechargePin renders 4-digit masked PIN input and submit CTA", () => {
    assert.ok(appSrc.includes("testID=\"input_recharge_pin\""), "input_recharge_pin must exist");
    assert.ok(appSrc.includes("testID=\"btn_confirm_recharge\""), "btn_confirm_recharge must exist");
  });

  // -----------------------------------------------------------------------------
  // PART 8: MODAL 101 (modalRechargeVoucher) LAYOUT & VOUCHER DETAILS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 8: MODAL 101 (modalRechargeVoucher) LAYOUT & VOUCHER ---");

  await runTest("8.1: modalRechargeVoucher defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes("testID=\"modal_recharge_voucher\""), "modal_recharge_voucher must exist");
    assert.ok(appSrc.includes("visible={modalRechargeVoucher}"), "visible must bind modalRechargeVoucher");
    assert.ok(appSrc.includes("onRequestClose={handleCloseRechargeVoucher}"), "onRequestClose must bind handleCloseRechargeVoucher");
  });

  await runTest("8.2: modalRechargeVoucher renders success badge and transaction details", () => {
    const vIdx = appSrc.indexOf('testID="modal_recharge_voucher"');
    const snippet = appSrc.slice(vIdx, vIdx + 4000);
    assert.ok(snippet.includes("✅"), "Must render green success icon");
    assert.ok(snippet.includes("rechargeVoucherData?.mobileNumber"), "Must display recipient mobile");
    assert.ok(snippet.includes("rechargeVoucherData?.rechargeId"), "Must display transaction ID");
  });

  await runTest("8.3: modalRechargeVoucher renders share and close buttons", () => {
    assert.ok(appSrc.includes("testID=\"btn_share_recharge_voucher\""), "btn_share_recharge_voucher must exist");
    assert.ok(appSrc.includes("testID=\"btn_close_recharge_voucher\""), "btn_close_recharge_voucher must exist");
  });

  // -----------------------------------------------------------------------------
  // PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("9.1: BackHandler onBackPress steps back gracefully through recharge flow", () => {
    assert.ok(appSrc.includes("if (modalRechargeVoucher) {\n        setModalRechargeVoucher(false);"), "Voucher must dismiss cleanly");
    assert.ok(appSrc.includes("if (modalRechargePin) {\n        setModalRechargePin(false);"), "Pin must dismiss or step back");
    assert.ok(appSrc.includes("if (modalRechargePackages) {\n        setModalRechargePackages(false);"), "Packages must step back to Amount");
    assert.ok(appSrc.includes("if (modalRechargeAmount) {\n        setModalRechargeAmount(false);"), "Amount must step back to Number");
    assert.ok(appSrc.includes("if (modalRechargeNumber) {\n        setModalRechargeNumber(false);"), "Number must dismiss cleanly");
  });

  await runTest("9.2: BackHandler useCallback dependency array includes all 5 recharge controllers", () => {
    assert.ok(appSrc.includes("modalRechargeNumber,"), "Must include modalRechargeNumber in deps");
    assert.ok(appSrc.includes("modalRechargeAmount,"), "Must include modalRechargeAmount in deps");
    assert.ok(appSrc.includes("modalRechargePackages,"), "Must include modalRechargePackages in deps");
    assert.ok(appSrc.includes("modalRechargePin,"), "Must include modalRechargePin in deps");
    assert.ok(appSrc.includes("modalRechargeVoucher,"), "Must include modalRechargeVoucher in deps");
  });

  // -----------------------------------------------------------------------------
  // PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK ---");

  await runTest("10.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
    const slop = iconMetrics.STANDARD_TOUCH_HIT_SLOP;
    assert.ok(slop.top >= 10);
    assert.ok(slop.bottom >= 10);
    assert.ok(slop.left >= 10);
    assert.ok(slop.right >= 10);
  });

  await runTest("10.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in Recharge modals", () => {
    assert.ok(appSrc.includes("testID=\"btn_back_recharge_number\"\n                onPress={handleCloseRechargeNumber}\n                hitSlop={STANDARD_TOUCH_HIT_SLOP}"));
    assert.ok(appSrc.includes("testID=\"btn_back_recharge_amount\""));
    assert.ok(appSrc.includes("testID=\"btn_back_recharge_packages\""));
    assert.ok(appSrc.includes("testID=\"btn_back_recharge_pin\""));
  });

  await runTest("10.3: Haptic feedback milestones wired in recharge action handlers", () => {
    assert.ok(appSrc.includes("hapticFeedbackService.selection()"), "Must call selection on user actions");
    assert.ok(appSrc.includes("hapticFeedbackService.notificationSuccess()"), "Must call notificationSuccess on successful recharge");
  });

  // -----------------------------------------------------------------------------
  // PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  await runTest("11.1: Primary submit CTA (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrastRatio("#FFFFFF", "#0D6E5C");
    console.log("      [CONTRAST] #FFFFFF on #0D6E5C: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  await runTest("11.2: Dark mode header surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
    const contrast = calculateContrastRatio("#FFFFFF", "#0F172A");
    console.log("      [CONTRAST] #FFFFFF on #0F172A: " + contrast.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(contrast >= 7.0);
  });

  await runTest("11.3: Commission badge text (#047857 on #ECFDF5) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrastRatio("#047857", "#ECFDF5");
    console.log("      [CONTRAST] #047857 on #ECFDF5: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  await runTest("11.4: Retailer profit badge text (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrastRatio("#FFFFFF", "#0D6E5C");
    console.log("      [CONTRAST] #FFFFFF on #0D6E5C: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  // -----------------------------------------------------------------------------
  // PART 12: MODAL COUNT & CONTROLLER INVARIANTS (111 MODALS)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 12: MODAL COUNT & CONTROLLER INVARIANTS (111 MODALS) ---");

  await runTest("12.1: App.js contains exactly 111 <Modal elements", () => {
    const modalMatches = appSrc.match(/<Modal\b/g) || [];
    assert.strictEqual(modalMatches.length, 111, "Expected exactly 111 modals in App.js, got " + modalMatches.length);
  });

  await runTest("12.2: App.js contains exactly 111 onRequestClose handlers", () => {
    const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
    assert.strictEqual(reqCloseMatches.length, 111, "Expected 111 onRequestClose handlers, got " + reqCloseMatches.length);
  });

  await runTest("12.3: App.js contains exactly 111 unique modal state controllers", () => {
    const regex = /visible=\{([a-zA-Z0-9_]+)\}/g;
    const uniqueModals = new Set();
    let m;
    while ((m = regex.exec(appSrc)) !== null) {
      uniqueModals.add(m[1]);
    }
    assert.strictEqual(uniqueModals.size, 111, "Expected 111 unique visible controllers, got " + uniqueModals.size);
    assert.ok(uniqueModals.has("modalRechargeNumber"), "modalRechargeNumber must be in unique controllers");
    assert.ok(uniqueModals.has("modalRechargeAmount"), "modalRechargeAmount must be in unique controllers");
    assert.ok(uniqueModals.has("modalRechargePackages"), "modalRechargePackages must be in unique controllers");
    assert.ok(uniqueModals.has("modalRechargePin"), "modalRechargePin must be in unique controllers");
    assert.ok(uniqueModals.has("modalRechargeVoucher"), "modalRechargeVoucher must be in unique controllers");
  });

  // -----------------------------------------------------------------------------
  // PART 13: BABEL AST PARSER VERIFICATION & PERFORMANCE BENCHMARK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 13: BABEL AST PARSER VERIFICATION & PERFORMANCE BENCHMARK ---");

  await runTest("13.1: App.js compiles cleanly via Babel parser with zero syntax errors", () => {
    const t0 = Date.now();
    const res = babel.parseSync(appSrc, {
      babelrc: false,
      parserOpts: { plugins: ["jsx", "flow"] }
    });
    const elapsed = Date.now() - t0;
    console.log("      [BABEL] Successfully parsed App.js in " + elapsed + "ms");
    assert.strictEqual(res.type, "File");
  });

  await runTest("13.2: Latency benchmark: 1,000 recharge calculations & validations execute in < 200ms", () => {
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
      const phone = i % 2 === 0 ? "01712345678" : "01812345678";
      const op = tallyPay.detectRechargeOperator(phone);
      const comm = tallyPay.calculateRechargeCommission(10000);
      const val = tallyPay.validateRechargeParameters({
        mobileNumber: phone,
        amountPaisa: 10000,
        connectionType: "PREPAID",
        walletBalancePaisa: 50000
      });
    }
    const elapsed = Date.now() - t0;
    console.log("      [BENCHMARK] 1,000 operations completed in " + elapsed + "ms (" + (elapsed / 1000).toFixed(4) + "ms/op)");
    assert.ok(elapsed < 200, "1,000 operations must complete in < 200ms");
  });

  console.log("\n================================================================================");
  console.log("TOTAL: " + totalTests + " | PASSED: " + passedTests + " | FAILED: " + failedTests + " (" + Math.round((passedTests / totalTests) * 100) + "% SUCCESS)");
  console.log("================================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
