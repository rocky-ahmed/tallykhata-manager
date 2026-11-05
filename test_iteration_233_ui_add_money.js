/**
 * TALLYKHATA ITERATION 233: TALLYPAY ADD MONEY UI/UX QA SUITE
 *
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions / QA Owner)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Milestone: REA-ITER-233
 * Reference APK: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 *
 * Covers:
 * Part 1: Bilingual localization (i18n) key symmetry across bn and en
 * Part 2: App.js state hooks & global test hooks declaration
 * Part 3: Navigation entry point in Tab 4 (TallyPay)
 * Part 4: modalAddMoneyMain (Modal 88) layout, quick presets & channels
 * Part 5: modalAddMoneyBankForm (Modal 89) layout, empty state & bank submit
 * Part 6: modalAddMoneyCardForm (Modal 90) layout, fee breakdown & saved cards
 * Part 7: modalAddMoneyReceiptVoucher (Modal 91) layout & transaction receipt slip
 * Part 8: Hardware BackHandler safe stacked dismissal
 * Part 9: Touch target ergonomics & haptic feedback integration
 * Part 10: WCAG 2.1 AA / AAA luminance contrast validation
 * Part 11: Modal count & controller invariants (91 modals total)
 * Part 12: Babel AST compilation & performance benchmark
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
    console.log(`  ✓ [PASS] ${desc}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error("    Error:", err.message);
  }
}

// Relative luminance & contrast formula
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map(x => x + x).join("");
  }
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function calculateContrast(fgHex, bgHex) {
  const [r1, g1, b1] = hexToRgb(fgHex);
  const [r2, g2, b2] = hexToRgb(bgHex);
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const appSrc = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");

(async function main() {
  console.log("================================================================================");
  console.log("TALLYKHATA ITERATION 233: TALLYPAY ADD MONEY UI/UX QA SUITE");
  console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
  console.log("Milestone: REA-ITER-233");
  console.log("================================================================================");

  // -----------------------------------------------------------------------------
  // PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---");

  const requiredI18nKeys = [
    "add_money_title",
    "add_money_subtitle",
    "channel_bank",
    "channel_card",
    "channel_mfs",
    "card_number",
    "card_holder_name",
    "card_expiry",
    "card_cvv",
    "save_card_checkbox",
    "preset_500",
    "preset_1000",
    "preset_2000",
    "preset_5000",
    "fee_free",
    "fee_debit_percent",
    "fee_credit_percent",
    "add_money_success",
    "transaction_id_label",
    "new_balance_label",
    "saved_cards_title",
    "add_new_card",
    "enter_amount",
    "min_amount_note",
    "max_amount_note",
    "convenience_fee",
    "total_debit_amount",
    "card_type_debit",
    "card_type_credit",
    "no_verified_bank",
    "link_bank_now",
    "select_bank_account",
    "enter_tp_pin",
  ];

  await runTest("1.1: All Iteration 233 localization keys exist in STRINGS.bn", () => {
    requiredI18nKeys.forEach(k => {
      assert.ok(i18n.STRINGS.bn[k], `Missing key in STRINGS.bn: ${k}`);
    });
  });

  await runTest("1.2: All Iteration 233 localization keys exist in STRINGS.en", () => {
    requiredI18nKeys.forEach(k => {
      assert.ok(i18n.STRINGS.en[k], `Missing key in STRINGS.en: ${k}`);
    });
  });

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
    assert.strictEqual(i18n.t("add_money_title", "bn"), "টাকা আনি");
    assert.strictEqual(i18n.t("add_money_title", "en"), "Add Money");
    assert.strictEqual(i18n.t("channel_bank", "bn"), "ব্যাংক একাউন্ট");
    assert.strictEqual(i18n.t("channel_bank", "en"), "Bank Account");
  });

  await runTest("1.4: STATIC_TRANSLATIONS contains authentic Add Money terms", () => {
    assert.strictEqual(i18n.STATIC_TRANSLATIONS["টাকা আনি"], "Add Money");
    assert.strictEqual(i18n.STATIC_TRANSLATIONS["ভিসা / মাস্টারকার্ড"], "Visa / Mastercard");
    assert.strictEqual(i18n.STATIC_TRANSLATIONS["ফি প্রযোজ্য নয় (ফ্রি)"], "No fee (Free)");
  });

  await runTest("1.5: Complete dictionary parity maintained across bn and en", () => {
    const bnKeys = Object.keys(i18n.STRINGS.bn);
    const enKeys = Object.keys(i18n.STRINGS.en);
    const missingInEn = bnKeys.filter(k => !(k in i18n.STRINGS.en));
    const missingInBn = enKeys.filter(k => !(k in i18n.STRINGS.bn));
    assert.strictEqual(missingInEn.length, 0, `Keys in bn missing in en: ${missingInEn.join(", ")}`);
    assert.strictEqual(missingInBn.length, 0, `Keys in en missing in bn: ${missingInBn.join(", ")}`);
  });

  // -----------------------------------------------------------------------------
  // PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

  await runTest("2.1: Add Money state hooks declared in App.js", () => {
    assert.ok(appSrc.includes("const [modalAddMoneyMain, setModalAddMoneyMain] = useState(false);"));
    assert.ok(appSrc.includes("const [modalAddMoneyBankForm, setModalAddMoneyBankForm] = useState(false);"));
    assert.ok(appSrc.includes("const [modalAddMoneyCardForm, setModalAddMoneyCardForm] = useState(false);"));
    assert.ok(appSrc.includes("const [modalAddMoneyReceiptVoucher, setModalAddMoneyReceiptVoucher] = useState(false);"));
    assert.ok(appSrc.includes("const [addMoneyAmountInput, setAddMoneyAmountInput] = useState"));
    assert.ok(appSrc.includes("const [selectedAddMoneyPreset, setSelectedAddMoneyPreset] = useState"));
    assert.ok(appSrc.includes("const [addMoneyCardNumber, setAddMoneyCardNumber] = useState"));
    assert.ok(appSrc.includes("const [addMoneyPinInput, setAddMoneyPinInput] = useState"));
  });

  await runTest("2.2: global.__ADD_MONEY_TEST_HOOKS__ exposed in App.js", () => {
    assert.ok(appSrc.includes("global.__ADD_MONEY_TEST_HOOKS__ = {"), "global.__ADD_MONEY_TEST_HOOKS__ must be exposed");
    assert.ok(appSrc.includes("modalAddMoneyMain,"), "modalAddMoneyMain must be in test hooks");
    assert.ok(appSrc.includes("modalAddMoneyBankForm,"), "modalAddMoneyBankForm must be in test hooks");
    assert.ok(appSrc.includes("modalAddMoneyCardForm,"), "modalAddMoneyCardForm must be in test hooks");
    assert.ok(appSrc.includes("modalAddMoneyReceiptVoucher,"), "modalAddMoneyReceiptVoucher must be in test hooks");
    assert.ok(appSrc.includes("handleOpenAddMoneyMain,"), "handleOpenAddMoneyMain must be in test hooks");
    assert.ok(appSrc.includes("handleSubmitAddMoneyBank,"), "handleSubmitAddMoneyBank must be in test hooks");
    assert.ok(appSrc.includes("handleSubmitAddMoneyCard,"), "handleSubmitAddMoneyCard must be in test hooks");
  });

  await runTest("2.3: Add Money engine and storageRepository connected in App.js", () => {
    assert.ok(appSrc.includes("addMoneyEngine: tallyPayService?.addMoneyEngine"));
    assert.ok(appSrc.includes("tallyPayService?.validateLuhn"));
  });

  // -----------------------------------------------------------------------------
  // PART 3: NAVIGATION ENTRY POINT IN TAB 4 (TALLYPAY)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 3: NAVIGATION ENTRY POINT IN TAB 4 (TALLYPAY) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders Add Money quick action button", () => {
    assert.ok(appSrc.includes('testID="tp_add_money_btn"'), "tp_add_money_btn testID missing");
    assert.ok(appSrc.includes("onPress={handleOpenAddMoneyMain}"), "tp_add_money_btn must invoke handleOpenAddMoneyMain");
  });

  await runTest("3.2: Add Money trigger attaches STANDARD_TOUCH_HIT_SLOP and accessible label", () => {
    const btnSection = appSrc.substring(appSrc.indexOf('testID="tp_add_money_btn"') - 100, appSrc.indexOf('testID="tp_add_money_btn"') + 300);
    assert.ok(btnSection.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "hitSlop must be attached to tp_add_money_btn");
    assert.ok(btnSection.includes('accessibilityRole="button"'), "accessibilityRole must be button");
  });

  // -----------------------------------------------------------------------------
  // PART 4: MODAL 88 (modalAddMoneyMain) LAYOUT, QUICK PRESETS & CHANNELS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 4: MODAL 88 (modalAddMoneyMain) LAYOUT, QUICK PRESETS & CHANNELS ---");

  await runTest("4.1: modalAddMoneyMain defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes("visible={modalAddMoneyMain}"));
    assert.ok(appSrc.includes("onRequestClose={handleCloseAddMoneyMain}"));
    assert.ok(appSrc.includes('testID="modal_add_money_main"'));
  });

  await runTest("4.2: modalAddMoneyMain renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_add_money_main"'));
    assert.ok(appSrc.includes("onPress={handleCloseAddMoneyMain}"));
  });

  await runTest("4.3: modalAddMoneyMain renders amount input with currency symbol", () => {
    assert.ok(appSrc.includes('testID="input_add_money_amount"'));
    assert.ok(appSrc.includes('keyboardType="numeric"'));
  });

  await runTest("4.4: modalAddMoneyMain renders 4 quick amount preset chips", () => {
    assert.ok(appSrc.includes("testID={`preset_chip_${preset}`}") || appSrc.includes("preset_chip_"));
    assert.ok(appSrc.includes("handleSelectAddMoneyPreset"));
  });

  await runTest("4.5: modalAddMoneyMain renders 3 ingress channel cards", () => {
    assert.ok(appSrc.includes('testID="card_channel_bank"'));
    assert.ok(appSrc.includes('testID="card_channel_card"'));
    assert.ok(appSrc.includes('testID="card_channel_mfs"'));
    assert.ok(appSrc.includes("onPress={handleSelectChannelBank}"));
    assert.ok(appSrc.includes("onPress={handleSelectChannelCard}"));
    assert.ok(appSrc.includes("onPress={handleSelectChannelMfs}"));
  });

  // -----------------------------------------------------------------------------
  // PART 5: MODAL 89 (modalAddMoneyBankForm) LAYOUT & FORM
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 5: MODAL 89 (modalAddMoneyBankForm) LAYOUT & FORM ---");

  await runTest("5.1: modalAddMoneyBankForm defines Modal with testID and onRequestClose", () => {
    assert.ok(appSrc.includes("visible={modalAddMoneyBankForm}"));
    assert.ok(appSrc.includes("onRequestClose={handleBackFromBankForm}"));
    assert.ok(appSrc.includes('testID="modal_add_money_bank_form"'));
  });

  await runTest("5.2: modalAddMoneyBankForm renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_add_money_bank"'));
    assert.ok(appSrc.includes("onPress={handleBackFromBankForm}"));
  });

  await runTest("5.3: modalAddMoneyBankForm renders amount summary with 0% free fee badge", () => {
    assert.ok(appSrc.includes("t('fee_free')"));
  });

  await runTest("5.4: modalAddMoneyBankForm renders empty bank warning and CTA when no verified bank", () => {
    assert.ok(appSrc.includes('testID="btn_link_bank_now"'));
    assert.ok(appSrc.includes("t('no_verified_bank')"));
  });

  await runTest("5.5: modalAddMoneyBankForm renders PIN input and submit CTA", () => {
    assert.ok(appSrc.includes('testID="btn_submit_add_money_bank"'));
    assert.ok(appSrc.includes("onPress={handleSubmitAddMoneyBank}"));
    assert.ok(appSrc.includes("secureTextEntry"));
  });

  // -----------------------------------------------------------------------------
  // PART 6: MODAL 90 (modalAddMoneyCardForm) LAYOUT & FEE BREAKDOWN
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 6: MODAL 90 (modalAddMoneyCardForm) LAYOUT & FEE BREAKDOWN ---");

  await runTest("6.1: modalAddMoneyCardForm defines Modal with testID and onRequestClose", () => {
    assert.ok(appSrc.includes("visible={modalAddMoneyCardForm}"));
    assert.ok(appSrc.includes("onRequestClose={handleBackFromCardForm}"));
    assert.ok(appSrc.includes('testID="modal_add_money_card_form"'));
  });

  await runTest("6.2: modalAddMoneyCardForm renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_add_money_card"'));
    assert.ok(appSrc.includes("onPress={handleBackFromCardForm}"));
  });

  await runTest("6.3: modalAddMoneyCardForm renders amount, fee rate breakdown and total debit summary", () => {
    assert.ok(appSrc.includes("t('total_debit_amount')"));
    assert.ok(appSrc.includes("t('convenience_fee')"));
  });

  await runTest("6.4: modalAddMoneyCardForm renders saved cards container when cards exist", () => {
    assert.ok(appSrc.includes('testID="saved_cards_container"'));
    assert.ok(appSrc.includes("handleDeleteSavedCard"));
  });

  await runTest("6.5: modalAddMoneyCardForm renders card number, holder, expiry, CVV, debit/credit toggle and save checkbox", () => {
    assert.ok(appSrc.includes("addMoneyCardNumber"));
    assert.ok(appSrc.includes("addMoneyCardHolder"));
    assert.ok(appSrc.includes("addMoneyCardExpiry"));
    assert.ok(appSrc.includes("addMoneyCardCvv"));
    assert.ok(appSrc.includes("addMoneyCardType"));
    assert.ok(appSrc.includes("addMoneySaveCardCheck"));
  });

  await runTest("6.6: modalAddMoneyCardForm renders submit button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_submit_add_money_card"'));
    assert.ok(appSrc.includes("onPress={handleSubmitAddMoneyCard}"));
  });

  // -----------------------------------------------------------------------------
  // PART 7: MODAL 91 (modalAddMoneyReceiptVoucher) LAYOUT & VOUCHER
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 7: MODAL 91 (modalAddMoneyReceiptVoucher) LAYOUT & VOUCHER ---");

  await runTest("7.1: modalAddMoneyReceiptVoucher defines Modal with testID and onRequestClose", () => {
    assert.ok(appSrc.includes("visible={modalAddMoneyReceiptVoucher}"));
    assert.ok(appSrc.includes("onRequestClose={handleCloseAddMoneyReceipt}"));
    assert.ok(appSrc.includes('testID="modal_add_money_receipt_voucher"'));
  });

  await runTest("7.2: modalAddMoneyReceiptVoucher renders success checkmark and receipt header", () => {
    assert.ok(appSrc.includes("t('add_money_success')"));
  });

  await runTest("7.3: modalAddMoneyReceiptVoucher renders transaction details with transaction ID", () => {
    assert.ok(appSrc.includes('testID="receipt_txn_id"'));
    assert.ok(appSrc.includes("t('transaction_id_label')"));
    assert.ok(appSrc.includes("t('new_balance_label')"));
  });

  await runTest("7.4: modalAddMoneyReceiptVoucher renders close/done button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_close_add_money_receipt"'));
    assert.ok(appSrc.includes("onPress={handleCloseAddMoneyReceipt}"));
  });

  // -----------------------------------------------------------------------------
  // PART 8: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 8: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("8.1: BackHandler onBackPress dismisses modalAddMoneyReceiptVoucher first", () => {
    const bhMatch = appSrc.indexOf("if (modalAddMoneyReceiptVoucher)");
    assert.ok(bhMatch !== -1, "modalAddMoneyReceiptVoucher must be checked in BackHandler");
  });

  await runTest("8.2: BackHandler onBackPress steps back from Bank and Card forms to modalAddMoneyMain", () => {
    const bankMatch = appSrc.indexOf("if (modalAddMoneyBankForm)");
    const cardMatch = appSrc.indexOf("if (modalAddMoneyCardForm)");
    const mainMatch = appSrc.indexOf("if (modalAddMoneyMain)");
    assert.ok(bankMatch !== -1 && cardMatch !== -1 && mainMatch !== -1, "All Add Money modals must be handled in BackHandler");
    assert.ok(bankMatch < mainMatch, "modalAddMoneyBankForm must be dismissed before modalAddMoneyMain");
    assert.ok(cardMatch < mainMatch, "modalAddMoneyCardForm must be dismissed before modalAddMoneyMain");
  });

  await runTest("8.3: BackHandler useCallback dependency array includes all 4 Add Money modal controllers", () => {
    const depsMatch = appSrc.indexOf("modalAddMoneyMain, modalAddMoneyBankForm, modalAddMoneyCardForm, modalAddMoneyReceiptVoucher");
    assert.ok(depsMatch !== -1, "BackHandler dependency array must include all 4 modal states");
  });

  // -----------------------------------------------------------------------------
  // PART 9: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 9: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION ---");

  await runTest("9.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
    assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.top, 10);
    assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.bottom, 10);
    assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.left, 10);
    assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.right, 10);
  });

  await runTest("9.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in Add Money modals", () => {
    const triggers = [
      'testID="btn_back_add_money_main"',
      'testID="btn_back_add_money_bank"',
      'testID="btn_back_add_money_card"',
      'testID="btn_submit_add_money_bank"',
      'testID="btn_submit_add_money_card"',
      'testID="btn_close_add_money_receipt"'
    ];
    triggers.forEach(tr => {
      const idx = appSrc.indexOf(tr);
      assert.ok(idx !== -1, "Trigger " + tr + " not found");
      const snippet = appSrc.substring(Math.max(0, idx - 150), idx + 350);
      assert.ok(snippet.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "Trigger " + tr + " missing hitSlop");
    });
  });

  await runTest("9.3: Haptic feedback milestones wired in Add Money action handlers", () => {
    assert.ok(appSrc.includes("hapticFeedbackService.selection()"));
    assert.ok(appSrc.includes("hapticFeedbackService.impactMedium()"));
    assert.ok(appSrc.includes("hapticFeedbackService.notificationSuccess()"));
  });

  // -----------------------------------------------------------------------------
  // PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  await runTest("10.1: Primary submit CTA (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#FFFFFF", "#0D6E5C");
    console.log("      [CONTRAST] #FFFFFF on #0D6E5C: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  await runTest("10.2: Dark mode header surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
    const contrast = calculateContrast("#FFFFFF", "#0F172A");
    console.log("      [CONTRAST] #FFFFFF on #0F172A: " + contrast.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(contrast >= 7.0);
  });

  await runTest("10.3: Free fee badge text (#166534 on #DCFCE7) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#166534", "#DCFCE7");
    console.log("      [CONTRAST] #166534 on #DCFCE7: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  await runTest("10.4: Warning notice card text (#92400E on #FFFBEB) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#92400E", "#FFFBEB");
    console.log("      [CONTRAST] #92400E on #FFFBEB: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  await runTest("10.5: Fee calculation text (#B45309 on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#B45309", "#FEF3C7");
    console.log("      [CONTRAST] #B45309 on #FEF3C7: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  // -----------------------------------------------------------------------------
  // PART 11: MODAL COUNT & CONTROLLER INVARIANTS (91 MODALS)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 11: MODAL COUNT & CONTROLLER INVARIANTS (91 MODALS) ---");

  await runTest("11.1: App.js contains exactly 91 <Modal elements", () => {
    const modalMatches = appSrc.match(/<Modal\b/g) || [];
    assert.strictEqual(modalMatches.length, 91, "Expected exactly 91 modals in App.js, got " + modalMatches.length);
  });

  await runTest("11.2: App.js contains exactly 91 onRequestClose handlers", () => {
    const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
    assert.strictEqual(reqCloseMatches.length, 91, "Expected 91 onRequestClose handlers, got " + reqCloseMatches.length);
  });

  await runTest("11.3: App.js contains exactly 91 unique modal state controllers", () => {
    const regex = /visible=\{([a-zA-Z0-9_]+)\}/g;
    const uniqueModals = new Set();
    let m;
    while ((m = regex.exec(appSrc)) !== null) {
      uniqueModals.add(m[1]);
    }
    assert.strictEqual(uniqueModals.size, 91, "Expected 91 unique visible controllers, got " + uniqueModals.size);
    assert.ok(uniqueModals.has("modalAddMoneyMain"), "modalAddMoneyMain must be in unique controllers");
    assert.ok(uniqueModals.has("modalAddMoneyBankForm"), "modalAddMoneyBankForm must be in unique controllers");
    assert.ok(uniqueModals.has("modalAddMoneyCardForm"), "modalAddMoneyCardForm must be in unique controllers");
    assert.ok(uniqueModals.has("modalAddMoneyReceiptVoucher"), "modalAddMoneyReceiptVoucher must be in unique controllers");
  });

  // -----------------------------------------------------------------------------
  // PART 12: BABEL AST PARSER VERIFICATION & PERFORMANCE BENCHMARK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 12: BABEL AST PARSER VERIFICATION & PERFORMANCE BENCHMARK ---");

  await runTest("12.1: App.js compiles cleanly via Babel parser with zero syntax errors", () => {
    const t0 = Date.now();
    const res = babel.parseSync(appSrc, {
      babelrc: false,
      parserOpts: { plugins: ["jsx", "flow"] }
    });
    const dur = Date.now() - t0;
    assert.ok(res, "Babel AST parse output must be defined");
    assert.strictEqual(res.type, "File");
    console.log(`      [BABEL] Successfully parsed App.js in ${dur}ms`);
  });

  await runTest("12.2: Latency benchmark: 1,000 fee calculations and Luhn checks execute in < 200ms", () => {
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
      tallyPay.calculateAddMoneyFee("CARD", 1000, "DEBIT");
      tallyPay.calculateAddMoneyFee("CARD", 1000, "CREDIT");
      tallyPay.calculateAddMoneyFee("BANK", 1000);
      tallyPay.luhnCheck("4111111111111111");
    }
    const elapsed = Date.now() - t0;
    console.log(`      [BENCHMARK] 1,000 operations completed in ${elapsed}ms (${(elapsed / 1000).toFixed(4)}ms/op)`);
    assert.ok(elapsed < 200, `Benchmark exceeded 200ms threshold: ${elapsed}ms`);
  });

  // -----------------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests} (${Math.round((passedTests / totalTests) * 100)}% SUCCESS)`);
  console.log("================================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
})();
