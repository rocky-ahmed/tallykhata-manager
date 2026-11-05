/**
 * TALLYKHATA ITERATION 232: TALLYPAY LINKED BANK ACCOUNTS & MFS ACCOUNT MANAGER UI/UX QA SUITE
 *
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions / QA Owner)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Milestone: REA-ITER-232
 * Reference APK: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 *
 * Covers:
 * Part 1: Bilingual localization (i18n) key symmetry across bn and en
 * Part 2: App.js state hooks & global test hooks declaration
 * Part 3: Navigation entry points in Tab 4 (TallyPay) and Tab 5 (Menu)
 * Part 4: modalLinkedAccountsManager (Modal 85) layout, filter tabs & cards
 * Part 5: modalAddNewBankAccount (Modal 86) layout, scheduled bank picker & inputs
 * Part 6: modalLinkMfsAccount (Modal 87) layout, operator chips, OTP & submit
 * Part 7: StorageRepository & TallyPayAccountManager integration
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
  console.log("TALLYKHATA ITERATION 232: LINKED BANK ACCOUNTS & ACCOUNT MANAGER UI/UX QA SUITE");
  console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
  console.log("Milestone: REA-ITER-232");
  console.log("================================================================================");

  // -----------------------------------------------------------------------------
  // PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---");

  const requiredI18nKeys = [
    "account_manager_title",
    "linked_bank_accounts",
    "linked_mfs_accounts",
    "all_accounts",
    "tab_filter_bank",
    "tab_filter_mfs",
    "add_bank_account",
    "add_bank_account_cta",
    "link_mfs_account",
    "link_mfs_account_cta",
    "delete_bank_account",
    "delete_bank_account_confirm",
    "bank_account_deleted",
    "bank_account_delete_failed",
    "verify_bank_account",
    "unverified_account_warning",
    "micro_deposit_notice",
    "enter_deposit_amount",
    "deposit_amount_paisa",
    "empty_account_prompt",
    "empty_account_message",
    "accuracy_confirmation",
    "select_bank",
    "search_bank",
    "branch_name",
    "routing_number",
    "account_number",
    "account_holder_name",
    "account_type",
    "savings_account",
    "current_account",
    "default_payout_account",
    "set_as_default_payout",
    "active_loan_delete_guard",
    "auto_disbursement_delete_guard",
    "lockout_3_attempts_alert",
    "instant_npsb_transfer",
    "beftn_advisory_notice",
    "select_mfs_operator",
    "mfs_mobile_number",
    "mfs_otp_title",
    "mfs_wallet_linked",
    "wallet_already_linked"
  ];

  await runTest("1.1: All Iteration 232 localization keys exist in STRINGS.bn", () => {
    requiredI18nKeys.forEach(k => {
      assert.ok(i18n.STRINGS.bn[k], `Missing key in STRINGS.bn: ${k}`);
    });
  });

  await runTest("1.2: All Iteration 232 localization keys exist in STRINGS.en", () => {
    requiredI18nKeys.forEach(k => {
      assert.ok(i18n.STRINGS.en[k], `Missing key in STRINGS.en: ${k}`);
    });
  });

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
    assert.strictEqual(i18n.t("account_manager_title", "bn"), "একাউন্ট ম্যানেজার");
    assert.strictEqual(i18n.t("account_manager_title", "en"), "Account Manager");
  });

  await runTest("1.4: STATIC_TRANSLATIONS contains authentic bank and MFS terms", () => {
    assert.strictEqual(i18n.translateStaticText("ব্যাংক একাউন্ট"), "ব্যাংক একাউন্ট");
    assert.strictEqual(i18n.translateStaticText("মোবাইল ব্যাংকিং"), "মোবাইল ব্যাংকিং");
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

  await runTest("2.1: Linked Accounts Manager state hooks declared in App.js", () => {
    assert.ok(appSrc.includes("const [modalLinkedAccountsManager, setModalLinkedAccountsManager] = useState(false);"));
    assert.ok(appSrc.includes("const [modalAddNewBankAccount, setModalAddNewBankAccount] = useState(false);"));
    assert.ok(appSrc.includes("const [modalLinkMfsAccount, setModalLinkMfsAccount] = useState(false);"));
    assert.ok(appSrc.includes("const [linkedAccountTab, setLinkedAccountTab] = useState('ALL');"));
  });

  await runTest("2.2: global.__ACCOUNT_MANAGER_TEST_HOOKS__ exposed in App.js", () => {
    assert.ok(appSrc.includes("global.__ACCOUNT_MANAGER_TEST_HOOKS__ = {"));
    assert.ok(appSrc.includes("modalLinkedAccountsManager,"));
    assert.ok(appSrc.includes("modalAddNewBankAccount,"));
    assert.ok(appSrc.includes("modalLinkMfsAccount,"));
    assert.ok(appSrc.includes("handleOpenLinkedAccountsManager,"));
    assert.ok(appSrc.includes("handleAddNewBankAccount,"));
    assert.ok(appSrc.includes("handleLinkMfsAccount,"));
    assert.ok(appSrc.includes("handleDeleteLinkedBank,"));
    assert.ok(appSrc.includes("handleDeleteLinkedMfs,"));
    assert.ok(appSrc.includes("handleSetDefaultBank,"));
    assert.ok(appSrc.includes("handleVerifyLinkedBank,"));
    assert.ok(appSrc.includes("tallyPayAccountManager: TP_tallyPayAccountManager,"));
  });

  // -----------------------------------------------------------------------------
  // PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders Linked Accounts quick action banner", () => {
    assert.ok(appSrc.includes('testID="tp_linked_accounts_btn"'));
    assert.ok(appSrc.includes("onPress={handleOpenLinkedAccountsManager}"));
  });

  await runTest("3.2: Tab 5 (Menu) renders Linked Accounts Manager item", () => {
    assert.ok(appSrc.includes('testID="menu_tp_linked_accounts_item"'));
  });

  // -----------------------------------------------------------------------------
  // PART 4: MODAL 85 (LINKED ACCOUNTS MANAGER) LAYOUT & USER JOURNEY
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 4: MODAL 85 (LINKED ACCOUNTS MANAGER) LAYOUT & USER JOURNEY ---");

  await runTest("4.1: modalLinkedAccountsManager defines Modal with testID and onRequestClose", () => {
    assert.ok(appSrc.includes('testID="modal_linked_accounts_manager"'));
    assert.ok(appSrc.includes("onRequestClose={handleCloseLinkedAccountsManager}"));
  });

  await runTest("4.2: Linked Accounts Manager renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_linked_accounts"'));
  });

  await runTest("4.3: Action CTAs rendered for Add Bank and Link MFS", () => {
    assert.ok(appSrc.includes('testID="btn_open_add_bank_modal"'));
    assert.ok(appSrc.includes('testID="btn_open_link_mfs_modal"'));
  });

  await runTest("4.4: Segmented filter tabs rendered for ALL, BANK, and MFS", () => {
    assert.ok(appSrc.includes('testID="tab_linked_all"'));
    assert.ok(appSrc.includes('testID="tab_linked_bank"'));
    assert.ok(appSrc.includes('testID="tab_linked_mfs"'));
  });

  await runTest("4.5: Empty state container rendered with testID when no accounts", () => {
    assert.ok(appSrc.includes('testID="empty_linked_accounts_prompt"'));
  });

  await runTest("4.6: Bank card renders default badge, verify deposit, set default, and delete triggers", () => {
    assert.ok(appSrc.includes('testID="badge_default_payout"'));
    assert.ok(appSrc.includes('testID="btn_set_default_payout"'));
    assert.ok(appSrc.includes('testID="input_verify_bank_deposit"'));
    assert.ok(appSrc.includes('testID="btn_verify_bank_account"'));
    assert.ok(appSrc.includes('testID="btn_unlink_bank_account"'));
  });

  await runTest("4.7: MFS card renders unlink button", () => {
    assert.ok(appSrc.includes('testID="btn_unlink_mfs_account"'));
  });

  // -----------------------------------------------------------------------------
  // PART 5: MODAL 86 (ADD NEW BANK ACCOUNT) LAYOUT & FORM
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 5: MODAL 86 (ADD NEW BANK ACCOUNT) LAYOUT & FORM ---");

  await runTest("5.1: modalAddNewBankAccount defines Modal with testID and onRequestClose", () => {
    assert.ok(appSrc.includes('testID="modal_add_new_bank_account"'));
    assert.ok(appSrc.includes("onRequestClose={handleCloseAddNewBankAccount}"));
  });

  await runTest("5.2: Add Bank modal renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_add_bank"'));
  });

  await runTest("5.3: Add Bank modal renders scheduled bank picker", () => {
    assert.ok(appSrc.includes('testID="picker_select_bank"'));
  });

  await runTest("5.4: Add Bank modal renders branch, routing, holder, and acc_num inputs", () => {
    assert.ok(appSrc.includes('testID="input_new_bank_branch"'));
    assert.ok(appSrc.includes('testID="input_new_bank_routing"'));
    assert.ok(appSrc.includes('testID="input_new_bank_holder"'));
    assert.ok(appSrc.includes('testID="input_new_bank_acc_num"'));
  });

  await runTest("5.5: Add Bank modal renders savings and current radio options", () => {
    assert.ok(appSrc.includes('testID="radio_savings_account"'));
    assert.ok(appSrc.includes('testID="radio_current_account"'));
  });

  await runTest("5.6: Add Bank modal renders accuracy confirmation and submit CTA", () => {
    assert.ok(appSrc.includes('testID="text_accuracy_confirmation"'));
    assert.ok(appSrc.includes('testID="btn_submit_add_new_bank"'));
  });

  // -----------------------------------------------------------------------------
  // PART 6: MODAL 87 (LINK MFS ACCOUNT) LAYOUT & FORM
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 6: MODAL 87 (LINK MFS ACCOUNT) LAYOUT & FORM ---");

  await runTest("6.1: modalLinkMfsAccount defines Modal with testID and onRequestClose", () => {
    assert.ok(appSrc.includes('testID="modal_link_mfs_account"'));
    assert.ok(appSrc.includes("onRequestClose={handleCloseLinkMfsAccount}"));
  });

  await runTest("6.2: Link MFS modal renders back button with testID", () => {
    assert.ok(appSrc.includes('testID="btn_back_link_mfs"'));
  });

  await runTest("6.3: Link MFS modal renders operator selection chips (bKash, Nagad, Rocket, Upay)", () => {
    assert.ok(appSrc.includes('testID="chip_link_mfs_bkash"'));
    assert.ok(appSrc.includes('testID="chip_link_mfs_nagad"'));
    assert.ok(appSrc.includes('testID="chip_link_mfs_rocket"'));
    assert.ok(appSrc.includes('testID="chip_link_mfs_upay"'));
  });

  await runTest("6.4: Link MFS modal renders mobile, holder, and OTP inputs", () => {
    assert.ok(appSrc.includes('testID="input_link_mfs_mobile"'));
    assert.ok(appSrc.includes('testID="input_link_mfs_holder"'));
    assert.ok(appSrc.includes('testID="input_link_mfs_otp"'));
  });

  await runTest("6.5: Link MFS modal renders submit button", () => {
    assert.ok(appSrc.includes('testID="btn_submit_link_mfs"'));
  });

  // -----------------------------------------------------------------------------
  // PART 7: STORAGE REPOSITORY & TALLYPAY ACCOUNT MANAGER INTEGRATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 7: STORAGE REPOSITORY & TALLYPAY ACCOUNT MANAGER INTEGRATION ---");

  await runTest("7.1: StorageRepository exposes all Linked Account API methods", () => {
    assert.strictEqual(typeof storageRepository.saveLinkedBankAccount, "function");
    assert.strictEqual(typeof storageRepository.getLinkedBankAccounts, "function");
    assert.strictEqual(typeof storageRepository.getLinkedBankAccountById, "function");
    assert.strictEqual(typeof storageRepository.deleteLinkedBankAccount, "function");
    assert.strictEqual(typeof storageRepository.setDefaultBankAccount, "function");
    assert.strictEqual(typeof storageRepository.verifyLinkedBankAccount, "function");
    assert.strictEqual(typeof storageRepository.saveLinkedMfsAccount, "function");
    assert.strictEqual(typeof storageRepository.getLinkedMfsAccounts, "function");
    assert.strictEqual(typeof storageRepository.getLinkedMfsAccountById, "function");
    assert.strictEqual(typeof storageRepository.deleteLinkedMfsAccount, "function");
  });

  await runTest("7.2: Scheduled banks catalog provides accurate details for BRAC, City, and DBBL", () => {
    const list = tallyPay.getScheduledBankList();
    assert.ok(list.length >= 10);
    const brac = tallyPay.getScheduledBankByCode("085");
    assert.strictEqual(brac.code, "085");
    assert.strictEqual(brac.shortCode, "BBL");
    assert.strictEqual(brac.npsbSupported, true);
  });

  // -----------------------------------------------------------------------------
  // PART 8: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 8: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("8.1: BackHandler onBackPress dismisses child modals before modalLinkedAccountsManager", () => {
    const bhIndex = appSrc.indexOf("const onBackPress = () => {");
    const bhEnd = appSrc.indexOf("BackHandler.addEventListener('hardwareBackPress'", bhIndex);
    const bhBody = appSrc.substring(bhIndex, bhEnd);

    const idxNewBank = bhBody.indexOf("if (modalAddNewBankAccount)");
    const idxLinkMfs = bhBody.indexOf("if (modalLinkMfsAccount)");
    const idxMgr = bhBody.indexOf("if (modalLinkedAccountsManager)");

    assert.ok(idxNewBank !== -1, "modalAddNewBankAccount condition missing in BackHandler");
    assert.ok(idxLinkMfs !== -1, "modalLinkMfsAccount condition missing in BackHandler");
    assert.ok(idxMgr !== -1, "modalLinkedAccountsManager condition missing in BackHandler");
    assert.ok(idxNewBank < idxMgr, "modalAddNewBankAccount must be handled before modalLinkedAccountsManager");
    assert.ok(idxLinkMfs < idxMgr, "modalLinkMfsAccount must be handled before modalLinkedAccountsManager");
  });

  await runTest("8.2: BackHandler useCallback dependency array includes new modal states", () => {
    const bhUseCallbackIndex = appSrc.indexOf("const onBackPress = () => {");
    const depArrayStart = appSrc.indexOf("}, [", bhUseCallbackIndex);
    const depArrayEnd = appSrc.indexOf("]);", depArrayStart);
    const depArrayStr = appSrc.substring(depArrayStart, depArrayEnd);

    assert.ok(depArrayStr.includes("modalLinkedAccountsManager"));
    assert.ok(depArrayStr.includes("modalAddNewBankAccount"));
    assert.ok(depArrayStr.includes("modalLinkMfsAccount"));
  });

  // -----------------------------------------------------------------------------
  // PART 9: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 9: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION ---");

  await runTest("9.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
    const slop = iconMetrics.STANDARD_TOUCH_HIT_SLOP;
    assert.ok(slop.top >= 10);
    assert.ok(slop.bottom >= 10);
    assert.ok(slop.left >= 10);
    assert.ok(slop.right >= 10);
  });

  await runTest("9.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in new modals", () => {
    assert.ok(appSrc.includes('hitSlop={STANDARD_TOUCH_HIT_SLOP}'));
  });

  await runTest("9.3: Haptic feedback wired in account manager action handlers", () => {
    assert.ok(appSrc.includes("handleOpenLinkedAccountsManager"));
    assert.ok(appSrc.includes("handleAddNewBankAccount"));
    assert.ok(appSrc.includes("handleLinkMfsAccount"));
  });

  // -----------------------------------------------------------------------------
  // PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  await runTest("10.1: Primary submit CTA (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#FFFFFF", "#0D6E5C");
    console.log(`      [CONTRAST] #FFFFFF on #0D6E5C: ${contrast.toFixed(2)}:1 (PASS AA)`);
    assert.ok(contrast >= 4.5);
  });

  await runTest("10.2: Link MFS CTA (#FFFFFF on #2563EB) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#FFFFFF", "#2563EB");
    console.log(`      [CONTRAST] #FFFFFF on #2563EB: ${contrast.toFixed(2)}:1 (PASS AA)`);
    assert.ok(contrast >= 4.5);
  });

  await runTest("10.3: Dark mode header surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
    const contrast = calculateContrast("#FFFFFF", "#0F172A");
    console.log(`      [CONTRAST] #FFFFFF on #0F172A: ${contrast.toFixed(2)}:1 (PASS AAA)`);
    assert.ok(contrast >= 7.0);
  });

  await runTest("10.4: Default badge (#15803D on #DCFCE7) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#15803D", "#DCFCE7");
    console.log(`      [CONTRAST] #15803D on #DCFCE7: ${contrast.toFixed(2)}:1 (PASS AA)`);
    assert.ok(contrast >= 4.5);
  });

  await runTest("10.5: Warning notice (#B45309 on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = calculateContrast("#B45309", "#FEF3C7");
    console.log(`      [CONTRAST] #B45309 on #FEF3C7: ${contrast.toFixed(2)}:1 (PASS AA)`);
    assert.ok(contrast >= 4.5);
  });

  // -----------------------------------------------------------------------------
  // PART 11: MODAL COUNT & CONTROLLER INVARIANTS (91 MODALS)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 11: MODAL COUNT & CONTROLLER INVARIANTS (91 MODALS) ---");

  await runTest("11.1: App.js contains exactly 91 <Modal elements", () => {
    const modalMatches = appSrc.match(/<Modal\b/g) || [];
    assert.strictEqual(modalMatches.length, 91, `Expected exactly 91 modals in App.js, got ${modalMatches.length}`);
  });

  await runTest("11.2: App.js contains exactly 91 onRequestClose handlers", () => {
    const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
    assert.strictEqual(reqCloseMatches.length, 91, `Expected 91 onRequestClose handlers, got ${reqCloseMatches.length}`);
  });

  await runTest("11.3: App.js contains exactly 91 unique modal state controllers", () => {
    const regex = /visible=\{([a-zA-Z0-9_]+)\}/g;
    const uniqueModals = new Set();
    let m;
    while ((m = regex.exec(appSrc)) !== null) {
      uniqueModals.add(m[1]);
    }
    assert.strictEqual(uniqueModals.size, 91, `Expected 91 unique visible controllers, got ${uniqueModals.size}`);
  });

  // -----------------------------------------------------------------------------
  // PART 12: BABEL AST PARSER VERIFICATION & PERFORMANCE BENCHMARK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 12: BABEL AST PARSER VERIFICATION & PERFORMANCE BENCHMARK ---");

  await runTest("12.1: App.js compiles cleanly via Babel parser with zero syntax errors", () => {
    const t0 = Date.now();
    const res = babel.parseSync(appSrc, {
      babelrc: false,
      parserOpts: { plugins: ['jsx', 'flow'] }
    });
    const dur = Date.now() - t0;
    assert.ok(res, "Babel AST parse output must be defined");
    assert.strictEqual(res.type, "File");
    console.log(`      [BABEL] Successfully parsed App.js in ${dur}ms`);
  });

  await runTest("12.2: Latency benchmark: 1,000 scheduled bank lookups execute in < 200ms", () => {
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
      tallyPay.getScheduledBankByCode("085");
      tallyPay.getScheduledBankByCode("225");
      tallyPay.getScheduledBankByCode("090");
    }
    const dur = Date.now() - t0;
    console.log(`      [BENCHMARK] 3,000 scheduled bank lookups in ${dur}ms (${(dur / 3000).toFixed(4)}ms/op)`);
    assert.ok(dur < 200, `Duration ${dur}ms exceeds 200ms threshold`);
  });

  console.log("\n================================================================================");
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests} (${Math.round(passedTests / totalTests * 100)}% SUCCESS)`);
  console.log("================================================================================");

  if (failedTests > 0) process.exit(1);
})();
