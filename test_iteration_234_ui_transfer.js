/**
 * TALLYKHATA ITERATION 234: TALLYPAY MONEY OUT / WALLET TRANSFER & ADAY KORI UI/UX QA SUITE
 *
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions / QA Owner)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Milestone: REA-ITER-234
 * Reference APK: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 *
 * Covers:
 * Part 1: Bilingual localization (i18n) key symmetry across bn and en
 * Part 2: App.js state hooks & global test hooks declaration
 * Part 3: Navigation entry points in Tab 4 (TallyPay)
 * Part 4: modalTransferHub (Modal 92) layout, wallet balance & channel chooser
 * Part 5: modalTransferWallet (Modal 93) layout, amount presets & wallet transfer
 * Part 6: modalTransferBank (Modal 94) layout, bank picker & instant NPSB toggle
 * Part 7: modalTransferMfs (Modal 95) layout, operator chips & MFS transfer
 * Part 8: modalSelectCustomerAday (Modal 96) layout, debtor list & payment link
 * Part 9: Hardware BackHandler safe stacked dismissal
 * Part 10: Touch target ergonomics & haptic feedback integration
 * Part 11: WCAG 2.1 AA / AAA luminance contrast validation
 * Part 12: Modal count & controller invariants (101 modals total)
 * Part 13: Babel AST compilation & performance benchmark
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
  console.log("TALLYKHATA ITERATION 234: TALLYPAY MONEY OUT & ADAY KORI UI/UX QA SUITE");
  console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
  console.log("Milestone: REA-ITER-234");
  console.log("================================================================================");

  // -----------------------------------------------------------------------------
  // PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---");

  const requiredIter234Keys = [
    "transfer_hub_title",
    "transfer_hub_subtitle",
    "send_money_vernacular",
    "send_money_transliterated",
    "transfer_master_title",
    "channel_tp_wallet",
    "channel_bank_transfer",
    "channel_mfs_transfer",
    "aday_kori_title",
    "aday_kori_subtitle",
    "instant_transfer_toggle",
    "instant_transfer_charge_notice",
    "instant_transfer_charge_label",
    "instant_transfer_active_status",
    "instant_transfer_disabled_status",
    "bank_unsupported_instant_notice",
    "max_daily_bank_transfer_warning",
    "transfer_success_title",
    "recipient_mobile_label",
    "transfer_note_label",
    "aday_sms_sent",
    "reconcile_due",
    "fee_free_transfer",
    "regular_beftn_note",
    "select_mfs_operator_transfer",
    "total_debit_transfer",
    "daily_transfer_limit_notice",
    "no_debtor_customers",
    "aday_action_label",
    "payment_link_aday_prompt",
    "status_sent_notification",
  ];

  await runTest("1.1: All Iteration 234 localization keys exist in STRINGS.bn", () => {
    requiredIter234Keys.forEach(k => {
      assert.ok(i18n.STRINGS.bn[k], `Missing Bengali string for key: ${k}`);
    });
  });

  await runTest("1.2: All Iteration 234 localization keys exist in STRINGS.en", () => {
    requiredIter234Keys.forEach(k => {
      assert.ok(i18n.STRINGS.en[k], `Missing English string for key: ${k}`);
    });
  });

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
    assert.strictEqual(i18n.t("transfer_hub_title", "bn"), "টাকা পাঠানো");
    assert.strictEqual(i18n.t("transfer_hub_title", "en"), "Send Money");
    assert.strictEqual(i18n.t("aday_kori_title", "bn"), "বাকি আদায়");
    assert.strictEqual(i18n.t("aday_kori_title", "en"), "Collect Due");
    assert.strictEqual(i18n.t("fee_free_transfer", "bn"), "১০০% ফ্রি");
    assert.strictEqual(i18n.t("fee_free_transfer", "en"), "100% Free");
  });

  await runTest("1.4: STATIC_TRANSLATIONS contains authentic Transfer & Aday terms", () => {
    assert.ok(i18n.STATIC_TRANSLATIONS["টাকা পাঠানো"], "STATIC_TRANSLATIONS must have টাকা পাঠানো");
    assert.ok(i18n.STATIC_TRANSLATIONS["বাকি আদায়"], "STATIC_TRANSLATIONS must have বাকি আদায়");
    assert.ok(i18n.STATIC_TRANSLATIONS["ইনস্ট্যান্ট ব্যাংক ট্রান্সফার (NPSB)"], "STATIC_TRANSLATIONS must have NPSB");
    assert.ok(i18n.STATIC_TRANSLATIONS["আদায়"], "STATIC_TRANSLATIONS must have আদায়");
  });

  await runTest("1.5: Complete dictionary parity maintained across bn and en", () => {
    const bnKeys = Object.keys(i18n.STRINGS.bn).sort();
    const enKeys = Object.keys(i18n.STRINGS.en).sort();
    assert.strictEqual(bnKeys.length, enKeys.length, `Key counts differ: bn=${bnKeys.length}, en=${enKeys.length}`);
    const missingInEn = bnKeys.filter(k => !i18n.STRINGS.en[k]);
    assert.strictEqual(missingInEn.length, 0, `Missing in en: ${missingInEn.join(", ")}`);
  });

  // -----------------------------------------------------------------------------
  // PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

  await runTest("2.1: Transfer & Aday Kori state hooks declared in App.js", () => {
    const hooks = [
      "modalTransferHub",
      "modalTransferWallet",
      "modalTransferBank",
      "modalTransferMfs",
      "modalSelectCustomerAday",
      "transferWalletMobile",
      "transferWalletAmount",
      "transferWalletPreset",
      "transferWalletPin",
      "transferBankId",
      "transferBankAmount",
      "isInstantBankTransfer",
      "transferBankPin",
      "transferMfsOperator",
      "transferMfsMobile",
      "transferMfsAmount",
      "transferMfsPin",
      "searchAdayCustomerQuery",
      "lastTransferReceipt",
    ];
    hooks.forEach(h => {
      assert.ok(appSrc.includes(h), `Expected App.js to declare state hook: ${h}`);
    });
  });

  await runTest("2.2: global.__TRANSFER_TEST_HOOKS__ exposed in App.js", () => {
    assert.ok(appSrc.includes("global.__TRANSFER_TEST_HOOKS__ = {"), "global.__TRANSFER_TEST_HOOKS__ must be exposed");
    const requiredExposed = [
      "modalTransferHub",
      "modalTransferWallet",
      "modalTransferBank",
      "modalTransferMfs",
      "modalSelectCustomerAday",
      "handleOpenTransferHub",
      "handleCloseTransferHub",
      "handleOpenTransferWallet",
      "handleCloseTransferWallet",
      "handleOpenTransferBank",
      "handleCloseTransferBank",
      "handleOpenTransferMfs",
      "handleCloseTransferMfs",
      "handleOpenSelectCustomerAday",
      "handleCloseSelectCustomerAday",
      "handleSubmitWalletTransfer",
      "handleSubmitBankTransfer",
      "handleSubmitMfsTransfer",
      "handleSendAdaySms",
      "handleReconcileAday",
    ];
    requiredExposed.forEach(k => {
      assert.ok(appSrc.includes(k), `Expected __TRANSFER_TEST_HOOKS__ to expose: ${k}`);
    });
  });

  await runTest("2.3: Transfer engine and tallyPayService modules connected in App.js", () => {
    assert.ok(appSrc.includes("TRANSFER_CHANNELS: TP_TRANSFER_CHANNELS"), "App.js must destructure TRANSFER_CHANNELS");
    assert.ok(appSrc.includes("calculateTransferFee: tpCalculateTransferFee"), "App.js must destructure calculateTransferFee");
    assert.ok(appSrc.includes("selectCustomerForAday: tpSelectCustomerForAday"), "App.js must destructure selectCustomerForAday");
    assert.ok(appSrc.includes("generateAdayPaymentLink: tpGenerateAdayPaymentLink"), "App.js must destructure generateAdayPaymentLink");
    assert.ok(appSrc.includes("recordAdayCollection: tpRecordAdayCollection"), "App.js must destructure recordAdayCollection");
  });

  // -----------------------------------------------------------------------------
  // PART 3: NAVIGATION ENTRY POINTS IN TAB 4 (TALLYPAY)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 3: NAVIGATION ENTRY POINTS IN TAB 4 (TALLYPAY) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders Send Money quick action button", () => {
    assert.ok(appSrc.includes('testID="tp_send_money_btn"'), "Tab 4 must have tp_send_money_btn");
    assert.ok(appSrc.includes("onPress={handleOpenTransferHub}"), "tp_send_money_btn must call handleOpenTransferHub");
  });

  await runTest("3.2: Tab 4 (TallyPay) renders Aday Kori quick action button", () => {
    assert.ok(appSrc.includes('testID="tp_aday_kori_btn"'), "Tab 4 must have tp_aday_kori_btn");
    assert.ok(appSrc.includes("onPress={handleOpenSelectCustomerAday}"), "tp_aday_kori_btn must call handleOpenSelectCustomerAday");
  });

  await runTest("3.3: Navigation triggers attach STANDARD_TOUCH_HIT_SLOP and accessible role", () => {
    const sendMoneyBtnIdx = appSrc.indexOf('testID="tp_send_money_btn"');
    const sendMoneySlice = appSrc.substring(sendMoneyBtnIdx, sendMoneyBtnIdx + 400);
    assert.ok(sendMoneySlice.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "tp_send_money_btn must attach hitSlop");
    assert.ok(sendMoneySlice.includes('accessibilityRole="button"'), "tp_send_money_btn must attach accessibilityRole");

    const adayBtnIdx = appSrc.indexOf('testID="tp_aday_kori_btn"');
    const adaySlice = appSrc.substring(adayBtnIdx, adayBtnIdx + 400);
    assert.ok(adaySlice.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "tp_aday_kori_btn must attach hitSlop");
    assert.ok(adaySlice.includes('accessibilityRole="button"'), "tp_aday_kori_btn must attach accessibilityRole");
  });

  // -----------------------------------------------------------------------------
  // PART 4: MODAL 92 (modalTransferHub) LAYOUT, WALLET BALANCE & CHANNELS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 4: MODAL 92 (modalTransferHub) LAYOUT, WALLET BALANCE & CHANNELS ---");

  await runTest("4.1: modalTransferHub defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_transfer_hub"'), "Must have testID='modal_transfer_hub'");
    assert.ok(appSrc.includes("visible={modalTransferHub}"), "Must have visible={modalTransferHub}");
    assert.ok(appSrc.includes("onRequestClose={handleCloseTransferHub}"), "Must have onRequestClose={handleCloseTransferHub}");
  });

  await runTest("4.2: modalTransferHub renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_transfer_hub"'), "Must have testID='btn_back_transfer_hub'");
  });

  await runTest("4.3: modalTransferHub renders Wallet Balance banner with currency formatting", () => {
    const hubIdx = appSrc.indexOf('testID="modal_transfer_hub"');
    const hubSlice = appSrc.substring(hubIdx, hubIdx + 3500);
    assert.ok(hubSlice.includes("formatMoney(walletBalance)"), "Wallet balance banner must format walletBalance");
    assert.ok(hubSlice.includes("TallyPay"), "Must display TallyPay pill");
  });

  await runTest("4.4: modalTransferHub renders 3 ingress channel cards", () => {
    assert.ok(appSrc.includes('testID="card_channel_tp_wallet"'), "Must render card_channel_tp_wallet");
    assert.ok(appSrc.includes('testID="card_channel_bank_transfer"'), "Must render card_channel_bank_transfer");
    assert.ok(appSrc.includes('testID="card_channel_mfs_transfer"'), "Must render card_channel_mfs_transfer");
  });

  await runTest("4.5: modalTransferHub channel cards connect to their modal openers", () => {
    const tpCardIdx = appSrc.indexOf('testID="card_channel_tp_wallet"');
    const tpCardSlice = appSrc.substring(tpCardIdx, tpCardIdx + 600);
    assert.ok(tpCardSlice.includes("onPress={handleOpenTransferWallet}"), "Must open modalTransferWallet");

    const bankCardIdx = appSrc.indexOf('testID="card_channel_bank_transfer"');
    const bankCardSlice = appSrc.substring(bankCardIdx, bankCardIdx + 600);
    assert.ok(bankCardSlice.includes("onPress={handleOpenTransferBank}"), "Must open modalTransferBank");

    const mfsCardIdx = appSrc.indexOf('testID="card_channel_mfs_transfer"');
    const mfsCardSlice = appSrc.substring(mfsCardIdx, mfsCardIdx + 600);
    assert.ok(mfsCardSlice.includes("onPress={handleOpenTransferMfs}"), "Must open modalTransferMfs");
  });

  // -----------------------------------------------------------------------------
  // PART 5: MODAL 93 (modalTransferWallet) LAYOUT & PEER-TO-PEER TRANSFER
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 5: MODAL 93 (modalTransferWallet) LAYOUT & PEER-TO-PEER TRANSFER ---");

  await runTest("5.1: modalTransferWallet defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_transfer_wallet"'), "Must have testID='modal_transfer_wallet'");
    assert.ok(appSrc.includes("visible={modalTransferWallet}"), "Must have visible={modalTransferWallet}");
    assert.ok(appSrc.includes("onRequestClose={handleCloseTransferWallet}"), "Must have onRequestClose={handleCloseTransferWallet}");
  });

  await runTest("5.2: modalTransferWallet renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_transfer_wallet"'), "Must have testID='btn_back_transfer_wallet'");
  });

  await runTest("5.3: modalTransferWallet renders 11-digit recipient mobile input", () => {
    assert.ok(appSrc.includes('testID="input_transfer_wallet_mobile"'), "Must have input_transfer_wallet_mobile");
    const inputIdx = appSrc.indexOf('testID="input_transfer_wallet_mobile"');
    const inputSlice = appSrc.substring(inputIdx, inputIdx + 600);
    assert.ok(inputSlice.includes('maxLength={11}'), "Mobile input must enforce maxLength 11");
    assert.ok(inputSlice.includes('keyboardType="phone-pad"'), "Mobile input must use phone-pad keyboard");
  });

  await runTest("5.4: modalTransferWallet renders amount input and 4 quick preset chips", () => {
    assert.ok(appSrc.includes('testID="input_transfer_wallet_amount"'), "Must have input_transfer_wallet_amount");
    [500, 1000, 2000, 5000].forEach(amt => {
      assert.ok(appSrc.includes(`testID={'chip_transfer_' + amt}`), `Must have chip_transfer_${amt}`);
    });
  });

  await runTest("5.5: modalTransferWallet renders 0% free fee badge, PIN input, and submit CTA", () => {
    assert.ok(appSrc.includes('testID="input_transfer_wallet_pin"'), "Must have input_transfer_wallet_pin");
    assert.ok(appSrc.includes('testID="btn_submit_wallet_transfer"'), "Must have btn_submit_wallet_transfer");
    const btnIdx = appSrc.indexOf('testID="btn_submit_wallet_transfer"');
    const btnSlice = appSrc.substring(btnIdx, btnIdx + 400);
    assert.ok(btnSlice.includes("onPress={handleSubmitWalletTransfer}"), "Submit button must call handleSubmitWalletTransfer");
    assert.ok(btnSlice.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "Submit button must have hitSlop");
  });

  // -----------------------------------------------------------------------------
  // PART 6: MODAL 94 (modalTransferBank) LAYOUT & NPSB VS BEFTN BANK TRANSFER
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 6: MODAL 94 (modalTransferBank) LAYOUT & NPSB VS BEFTN BANK TRANSFER ---");

  await runTest("6.1: modalTransferBank defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_transfer_bank"'), "Must have testID='modal_transfer_bank'");
    assert.ok(appSrc.includes("visible={modalTransferBank}"), "Must have visible={modalTransferBank}");
    assert.ok(appSrc.includes("onRequestClose={handleCloseTransferBank}"), "Must have onRequestClose={handleCloseTransferBank}");
  });

  await runTest("6.2: modalTransferBank renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_transfer_bank"'), "Must have testID='btn_back_transfer_bank'");
  });

  await runTest("6.3: modalTransferBank renders bank account selector container", () => {
    assert.ok(appSrc.includes('testID="picker_transfer_bank"'), "Must render picker_transfer_bank");
  });

  await runTest("6.4: modalTransferBank renders amount input and instant transfer switch", () => {
    assert.ok(appSrc.includes('testID="input_transfer_bank_amount"'), "Must render input_transfer_bank_amount");
    assert.ok(appSrc.includes('testID="switch_instant_bank_transfer"'), "Must render switch_instant_bank_transfer");
  });

  await runTest("6.5: modalTransferBank renders fee calculation breakdown and submit CTA", () => {
    assert.ok(appSrc.includes('testID="input_transfer_bank_pin"'), "Must render input_transfer_bank_pin");
    assert.ok(appSrc.includes('testID="btn_submit_bank_transfer"'), "Must render btn_submit_bank_transfer");
    const btnIdx = appSrc.indexOf('testID="btn_submit_bank_transfer"');
    const btnSlice = appSrc.substring(btnIdx, btnIdx + 400);
    assert.ok(btnSlice.includes("onPress={handleSubmitBankTransfer}"), "Submit button must call handleSubmitBankTransfer");
  });

  // -----------------------------------------------------------------------------
  // PART 7: MODAL 95 (modalTransferMfs) LAYOUT & MFS OPERATORS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 7: MODAL 95 (modalTransferMfs) LAYOUT & MFS OPERATORS ---");

  await runTest("7.1: modalTransferMfs defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_transfer_mfs"'), "Must have testID='modal_transfer_mfs'");
    assert.ok(appSrc.includes("visible={modalTransferMfs}"), "Must have visible={modalTransferMfs}");
    assert.ok(appSrc.includes("onRequestClose={handleCloseTransferMfs}"), "Must have onRequestClose={handleCloseTransferMfs}");
  });

  await runTest("7.2: modalTransferMfs renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_transfer_mfs"'), "Must have testID='btn_back_transfer_mfs'");
  });

  await runTest("7.3: modalTransferMfs renders 3 operator chips (bKash, Nagad, Rocket)", () => {
    assert.ok(appSrc.includes("chip_mfs_bkash"), "Must render chip_mfs_bkash");
    assert.ok(appSrc.includes("chip_mfs_nagad"), "Must render chip_mfs_nagad");
    assert.ok(appSrc.includes("chip_mfs_rocket"), "Must render chip_mfs_rocket");
  });

  await runTest("7.4: modalTransferMfs renders recipient mobile, amount, PIN and submit CTA", () => {
    assert.ok(appSrc.includes('testID="input_transfer_mfs_mobile"'), "Must render input_transfer_mfs_mobile");
    assert.ok(appSrc.includes('testID="input_transfer_mfs_amount"'), "Must render input_transfer_mfs_amount");
    assert.ok(appSrc.includes('testID="input_transfer_mfs_pin"'), "Must render input_transfer_mfs_pin");
    assert.ok(appSrc.includes('testID="btn_submit_mfs_transfer"'), "Must render btn_submit_mfs_transfer");
  });

  // -----------------------------------------------------------------------------
  // PART 8: MODAL 96 (modalSelectCustomerAday) LAYOUT & CUSTOMER DUE ADAY
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 8: MODAL 96 (modalSelectCustomerAday) LAYOUT & CUSTOMER DUE ADAY ---");

  await runTest("8.1: modalSelectCustomerAday defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_select_customer_aday"'), "Must have testID='modal_select_customer_aday'");
    assert.ok(appSrc.includes("visible={modalSelectCustomerAday}"), "Must have visible={modalSelectCustomerAday}");
    assert.ok(appSrc.includes("onRequestClose={handleCloseSelectCustomerAday}"), "Must have onRequestClose={handleCloseSelectCustomerAday}");
  });

  await runTest("8.2: modalSelectCustomerAday renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_customer_aday"'), "Must have testID='btn_back_customer_aday'");
  });

  await runTest("8.3: modalSelectCustomerAday renders customer search input", () => {
    assert.ok(appSrc.includes('testID="input_search_aday_customer"'), "Must render input_search_aday_customer");
  });

  await runTest("8.4: modalSelectCustomerAday renders ScrollView with keyboardShouldPersistTaps='handled'", () => {
    const adayModalIdx = appSrc.indexOf('testID="modal_select_customer_aday"');
    const adayModalSlice = appSrc.substring(adayModalIdx, adayModalIdx + 2500);
    assert.ok(adayModalSlice.includes('keyboardShouldPersistTaps="handled"'), "ScrollView must specify keyboardShouldPersistTaps='handled'");
  });

  await runTest("8.5: modalSelectCustomerAday renders action buttons for SMS and Reconcile with testIDs", () => {
    assert.ok(appSrc.includes('testID="btn_send_aday_sms"'), "Must render btn_send_aday_sms");
    assert.ok(appSrc.includes('testID="btn_reconcile_aday"'), "Must render btn_reconcile_aday");
  });

  // -----------------------------------------------------------------------------
  // PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("9.1: BackHandler onBackPress steps back from sub-modals to modalTransferHub", () => {
    assert.ok(appSrc.includes("if (modalTransferWallet) {\n        setModalTransferWallet(false);\n        setModalTransferHub(true);\n        return true;\n      }"), "modalTransferWallet must revert to modalTransferHub");
    assert.ok(appSrc.includes("if (modalTransferBank) {\n        setModalTransferBank(false);\n        setModalTransferHub(true);\n        return true;\n      }"), "modalTransferBank must revert to modalTransferHub");
    assert.ok(appSrc.includes("if (modalTransferMfs) {\n        setModalTransferMfs(false);\n        setModalTransferHub(true);\n        return true;\n      }"), "modalTransferMfs must revert to modalTransferHub");
  });

  await runTest("9.2: BackHandler onBackPress dismisses modalTransferHub and modalSelectCustomerAday", () => {
    assert.ok(appSrc.includes("if (modalTransferHub) {\n        setModalTransferHub(false);\n        return true;\n      }"), "modalTransferHub must dismiss cleanly");
    assert.ok(appSrc.includes("if (modalSelectCustomerAday) {\n        setModalSelectCustomerAday(false);\n        return true;\n      }"), "modalSelectCustomerAday must dismiss cleanly");
  });

  await runTest("9.3: BackHandler useCallback dependency array includes all 5 transfer controllers", () => {
    const depsIdx = appSrc.indexOf("modalTransferHub, modalTransferWallet, modalTransferBank, modalTransferMfs, modalSelectCustomerAday");
    assert.ok(depsIdx !== -1, "BackHandler dependencies must include all 5 transfer modal controllers");
  });

  // -----------------------------------------------------------------------------
  // PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION ---");

  await runTest("10.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP, "STANDARD_TOUCH_HIT_SLOP must be exported");
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.top >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.bottom >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.left >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.right >= 10);
  });

  await runTest("10.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in Transfer modals", () => {
    const modalTriggers = [
      'testID="btn_back_transfer_hub"',
      'testID="card_channel_tp_wallet"',
      'testID="card_channel_bank_transfer"',
      'testID="card_channel_mfs_transfer"',
      'testID="btn_back_transfer_wallet"',
      'testID="btn_submit_wallet_transfer"',
      'testID="btn_back_transfer_bank"',
      'testID="btn_submit_bank_transfer"',
      'testID="btn_back_transfer_mfs"',
      'testID="btn_submit_mfs_transfer"',
      'testID="btn_back_customer_aday"',
      'testID="btn_send_aday_sms"',
      'testID="btn_reconcile_aday"',
    ];
    modalTriggers.forEach(tid => {
      const idx = appSrc.indexOf(tid);
      assert.ok(idx !== -1, `Trigger not found: ${tid}`);
      const slice = appSrc.substring(idx - 100, idx + 400);
      assert.ok(slice.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), `${tid} must attach STANDARD_TOUCH_HIT_SLOP`);
    });
  });

  await runTest("10.3: Haptic feedback milestones wired in transfer action handlers", () => {
    assert.ok(appSrc.includes("hapticFeedbackService.impactMedium()"), "Must call impactMedium on transfer submit");
    assert.ok(appSrc.includes("hapticFeedbackService.selection()"), "Must call selection on chip/channel tap");
    assert.ok(appSrc.includes("hapticFeedbackService.notificationSuccess()"), "Must call notificationSuccess on successful transfer");
  });

  // -----------------------------------------------------------------------------
  // PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  await runTest("11.1: Primary submit CTA (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#FFFFFF", "#0D6E5C");
    console.log("      [CONTRAST] #FFFFFF on #0D6E5C: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  await runTest("11.2: Dark mode header surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
    const contrast = calculateContrast("#FFFFFF", "#0F172A");
    console.log("      [CONTRAST] #FFFFFF on #0F172A: " + contrast.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(contrast >= 7.0);
  });

  await runTest("11.3: Free fee badge text (#166534 on #DCFCE7) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#166534", "#DCFCE7");
    console.log("      [CONTRAST] #166534 on #DCFCE7: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  await runTest("11.4: Instant transfer notice text (#78350F on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#78350F", "#FEF3C7");
    console.log("      [CONTRAST] #78350F on #FEF3C7: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  await runTest("11.5: Debtor outstanding due pill (#991B1B on #FEE2E2) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#991B1B", "#FEE2E2");
    console.log("      [CONTRAST] #991B1B on #FEE2E2: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5);
  });

  // -----------------------------------------------------------------------------
  // PART 12: MODAL COUNT & CONTROLLER INVARIANTS (101 MODALS)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 12: MODAL COUNT & CONTROLLER INVARIANTS (101 MODALS) ---");

  await runTest("12.1: App.js contains exactly 101 <Modal elements", () => {
    const modalMatches = appSrc.match(/<Modal\b/g) || [];
    assert.strictEqual(modalMatches.length, 101, "Expected exactly 101 modals in App.js, got " + modalMatches.length);
  });

  await runTest("12.2: App.js contains exactly 101 onRequestClose handlers", () => {
    const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
    assert.strictEqual(reqCloseMatches.length, 101, "Expected 101 onRequestClose handlers, got " + reqCloseMatches.length);
  });

  await runTest("12.3: App.js contains exactly 101 unique modal state controllers", () => {
    const regex = /visible=\{([a-zA-Z0-9_]+)\}/g;
    const uniqueModals = new Set();
    let m;
    while ((m = regex.exec(appSrc)) !== null) {
      uniqueModals.add(m[1]);
    }
    assert.strictEqual(uniqueModals.size, 101, "Expected 101 unique visible controllers, got " + uniqueModals.size);
    assert.ok(uniqueModals.has("modalTransferHub"), "modalTransferHub must be in unique controllers");
    assert.ok(uniqueModals.has("modalTransferWallet"), "modalTransferWallet must be in unique controllers");
    assert.ok(uniqueModals.has("modalTransferBank"), "modalTransferBank must be in unique controllers");
    assert.ok(uniqueModals.has("modalTransferMfs"), "modalTransferMfs must be in unique controllers");
    assert.ok(uniqueModals.has("modalSelectCustomerAday"), "modalSelectCustomerAday must be in unique controllers");
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
    const dur = Date.now() - t0;
    assert.ok(res, "Babel AST parse output must be defined");
    assert.strictEqual(res.type, "File");
    console.log(`      [BABEL] Successfully parsed App.js in ${dur}ms`);
  });

  await runTest("13.2: Latency benchmark: 1,000 transfer fee calculations, limit validations & payment link generations execute in < 200ms", () => {
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
      tallyPay.calculateTransferFee("WALLET", 1000);
      tallyPay.calculateTransferFee("BANK_REGULAR", 1000);
      tallyPay.calculateTransferFee("BANK_INSTANT", 1000);
      tallyPay.calculateTransferFee("MFS", 1000);
      tallyPay.validateTransferLimits("WALLET", 1000, 5000);
      tallyPay.generateAdayPaymentLink("c1", 1500, "করিম চাচা");
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
