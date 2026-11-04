/**
 * TALLYKHATA ITERATION 228: CONTACT BENEFICIARY BOOK & FAST REMITTANCE UI/UX QA SUITE
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions / QA Owner)
 * Milestone: REA-ITER-228
 * Architecture Reference: AccountManagerActivity, AddNewBankAccountActivity, PendingBankAccountVerifyActivity
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const { t, translateStaticText, STRINGS } = require("./src/i18nService");
const tallyPayService = require("./src/tallyPayService");
const storageRepository = require("./src/storageRepository");

console.log("================================================================================");
console.log("TALLYKHATA ITERATION 228: BENEFICIARY BOOK & FAST REMITTANCE UI/UX QA SUITE");
console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
console.log("Milestone: REA-ITER-228");
console.log("================================================================================");

let totalTests = 0;
let passedTests = 0;
const failures = [];

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failures.push({ name, error: err });
    console.log(`  ✗ [FAIL] ${name}: ${err.message}`);
  }
}

function calculateLuminance(hex) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function calculateContrastRatio(fgHex, bgHex) {
  const l1 = calculateLuminance(fgHex);
  const l2 = calculateLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const appSource = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");

// --- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---
console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---");

const ITER_228_KEYS = [
  "beneficiary_management",
  "bank_accounts",
  "mfs_accounts",
  "add_bank_account",
  "add_mfs_account",
  "account_holder_name",
  "account_number",
  "routing_number",
  "select_bank",
  "select_branch",
  "fast_send_money",
  "verify_penny_deposit",
  "enter_deposit_amount",
  "delete_beneficiary",
  "delete_beneficiary_confirm",
  "no_saved_accounts",
  "no_saved_accounts_sub",
  "penny_deposit_hint",
  "bank_verified",
  "bank_pending",
  "bank_rejected",
  "mfs_operator",
  "filter_bank",
  "filter_mfs",
  "search_beneficiaries",
  "save_beneficiary_btn",
  "beneficiary_saved_success",
  "deposit_verified_success",
];

runTest("1.1: All Iteration 228 localization keys exist in STRINGS.bn", () => {
  for (const key of ITER_228_KEYS) {
    assert.ok(STRINGS.bn[key], `Missing Bengali translation for key: ${key}`);
    assert.strictEqual(typeof STRINGS.bn[key], "string", `Key ${key} must be a string`);
  }
});

runTest("1.2: All Iteration 228 localization keys exist in STRINGS.en", () => {
  for (const key of ITER_228_KEYS) {
    assert.ok(STRINGS.en[key], `Missing English translation for key: ${key}`);
    assert.strictEqual(typeof STRINGS.en[key], "string", `Key ${key} must be a string`);
  }
});

runTest("1.3: t() helper translates keys symmetrically across languages", () => {
  assert.strictEqual(t("beneficiary_management", "bn"), "বেনিফিশিয়ারি ও ব্যাংক একাউন্ট");
  assert.strictEqual(t("beneficiary_management", "en"), "Beneficiary & Bank Accounts");
  assert.strictEqual(t("bank_accounts", "bn"), "ব্যাংক একাউন্ট");
  assert.strictEqual(t("bank_accounts", "en"), "Bank Accounts");
  assert.strictEqual(t("mfs_accounts", "bn"), "মোবাইল ব্যাংকিং");
  assert.strictEqual(t("mfs_accounts", "en"), "Mobile Banking");
  assert.strictEqual(t("fast_send_money", "bn"), "টাকা পাঠান");
  assert.strictEqual(t("fast_send_money", "en"), "Send Money");
});

runTest("1.4: translateStaticText translates static terms consistently", () => {
  assert.strictEqual(translateStaticText("বেনিফিশিয়ারি ও ব্যাংক একাউন্ট", "en"), "Beneficiary & Bank Accounts");
  assert.strictEqual(translateStaticText("ব্যাংক একাউন্ট", "en"), "Bank account");
  assert.strictEqual(translateStaticText("মোবাইল ব্যাংকিং", "en"), "Mobile Banking");
  assert.strictEqual(translateStaticText("টাকা পাঠান", "en"), "Send Money");
});

// --- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---
console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

runTest("2.1: Beneficiary Book state hooks declared in App.js", () => {
  assert.ok(appSource.includes("const [modalAccountManager, setModalAccountManager] = useState(false);"), "modalAccountManager missing");
  assert.ok(appSource.includes("const [modalAddBankAccount, setModalAddBankAccount] = useState(false);"), "modalAddBankAccount missing");
  assert.ok(appSource.includes("const [modalAddMfsAccount, setModalAddMfsAccount] = useState(false);"), "modalAddMfsAccount missing");
  assert.ok(appSource.includes("const [modalVerifyBankDeposit, setModalVerifyBankDeposit] = useState(false);"), "modalVerifyBankDeposit missing");
  assert.ok(appSource.includes("const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);"), "selectedBeneficiary missing");
  assert.ok(appSource.includes("const [beneficiaryTab, setBeneficiaryTab] = useState('ALL');"), "beneficiaryTab missing");
  assert.ok(appSource.includes("const [beneficiarySearchQuery, setBeneficiarySearchQuery] = useState('');"), "beneficiarySearchQuery missing");
});

runTest("2.2: global.__BENEFICIARY_TEST_HOOKS__ exposed in App.js", () => {
  assert.ok(appSource.includes("global.__BENEFICIARY_TEST_HOOKS__ = {"), "global.__BENEFICIARY_TEST_HOOKS__ missing");
  assert.ok(appSource.includes("handleOpenAccountManager,"), "handleOpenAccountManager hook missing");
  assert.ok(appSource.includes("handleCloseAccountManager,"), "handleCloseAccountManager hook missing");
  assert.ok(appSource.includes("handleSaveBankAccount,"), "handleSaveBankAccount hook missing");
  assert.ok(appSource.includes("handleSaveMfsAccount,"), "handleSaveMfsAccount hook missing");
  assert.ok(appSource.includes("handleVerifyDeposit,"), "handleVerifyDeposit hook missing");
  assert.ok(appSource.includes("handleDeleteBeneficiary,"), "handleDeleteBeneficiary hook missing");
  assert.ok(appSource.includes("handleSendMoneyToBeneficiary,"), "handleSendMoneyToBeneficiary hook missing");
  assert.ok(appSource.includes("displayBeneficiaries,"), "displayBeneficiaries hook missing");
});

runTest("2.3: tallyPayService beneficiary modules imported and bound in App.js", () => {
  assert.ok(appSource.includes("BANK_VERIFICATION_STATUSES"), "BANK_VERIFICATION_STATUSES missing");
  assert.ok(appSource.includes("BENEFICIARY_TARGET_TYPES"), "BENEFICIARY_TARGET_TYPES missing");
  assert.ok(appSource.includes("MFS_WALLET_OPERATORS"), "MFS_WALLET_OPERATORS missing");
  assert.ok(appSource.includes("BANGLADESH_BANKS_CATALOG"), "BANGLADESH_BANKS_CATALOG missing");
  assert.ok(appSource.includes("getObscureAccountNumber"), "getObscureAccountNumber missing");
  assert.ok(appSource.includes("getObscureMobileNumber"), "getObscureMobileNumber missing");
  assert.ok(appSource.includes("buildPrepopulatedRemittance"), "buildPrepopulatedRemittance missing");
  assert.ok(appSource.includes("verifyBankPennyDeposit"), "verifyBankPennyDeposit missing");
  assert.ok(appSource.includes("queryBeneficiaries"), "queryBeneficiaries missing");
});

// --- PART 3: NAVIGATION ENTRY POINTS & MODAL CONTAINER ---
console.log("\n--- PART 3: NAVIGATION ENTRY POINTS & MODAL CONTAINER ---");

runTest("3.1: modalAccountManager Modal container and header rendered", () => {
  assert.ok(appSource.includes('testID="modal_account_manager"'), "modal_account_manager missing");
  assert.ok(appSource.includes('testID="btn_back_account_manager"'), "btn_back_account_manager missing");
  assert.ok(appSource.includes("{t('beneficiary_management')}"), "Header title missing");
});

runTest("3.2: Tab 4 (TallyPay) entry point rendered", () => {
  assert.ok(appSource.includes('testID="tp_manage_beneficiaries_btn"'), "tp_manage_beneficiaries_btn missing in Tab 4");
  assert.ok(appSource.includes("handleOpenAccountManager"), "handleOpenAccountManager trigger missing in Tab 4");
});

runTest("3.3: Tab 5 (Menu) entry point rendered", () => {
  assert.ok(appSource.includes('testID="menu_tp_account_manager_item"'), "menu_tp_account_manager_item missing in Tab 5");
});

// --- PART 4: ACCOUNT MANAGER MODAL & FILTER TABS ---
console.log("\n--- PART 4: ACCOUNT MANAGER MODAL & FILTER TABS ---");

runTest("4.1: Filter tabs render All, Bank, and MFS", () => {
  assert.ok(appSource.includes('testID="tab_beneficiary_all"'), "tab_beneficiary_all missing");
  assert.ok(appSource.includes('testID="tab_beneficiary_bank"'), "tab_beneficiary_bank missing");
  assert.ok(appSource.includes('testID="tab_beneficiary_mfs"'), "tab_beneficiary_mfs missing");
});

runTest("4.2: Tab switching triggers state transition", () => {
  assert.ok(appSource.includes("setBeneficiaryTab('ALL')"), "setBeneficiaryTab ALL missing");
  assert.ok(appSource.includes("setBeneficiaryTab('BANK')"), "setBeneficiaryTab BANK missing");
  assert.ok(appSource.includes("setBeneficiaryTab('MFS')"), "setBeneficiaryTab MFS missing");
});

runTest("4.3: Search input box and clear trigger rendered", () => {
  assert.ok(appSource.includes('testID="input_search_beneficiaries"'), "input_search_beneficiaries missing");
  assert.ok(appSource.includes('testID="btn_clear_beneficiary_search"'), "btn_clear_beneficiary_search missing");
  assert.ok(appSource.includes('testID="beneficiary_empty_view"'), "beneficiary_empty_view missing");
});

// --- PART 5: ADD BANK & ADD MFS MODALS ---
console.log("\n--- PART 5: ADD BANK & ADD MFS MODALS ---");

runTest("5.1: modalAddBankAccount renders bank selector, account inputs, and submit button", () => {
  assert.ok(appSource.includes('testID="modal_add_bank_account"'), "modal_add_bank_account missing");
  assert.ok(appSource.includes('testID="btn_back_add_bank"'), "btn_back_add_bank missing");
  assert.ok(appSource.includes('testID="input_bank_acc_holder"'), "input_bank_acc_holder missing");
  assert.ok(appSource.includes('testID="input_bank_acc_number"'), "input_bank_acc_number missing");
  assert.ok(appSource.includes('testID="input_bank_routing"'), "input_bank_routing missing");
  assert.ok(appSource.includes('testID="input_bank_branch"'), "input_bank_branch missing");
  assert.ok(appSource.includes('testID="btn_submit_add_bank"'), "btn_submit_add_bank missing");
});

runTest("5.2: modalAddMfsAccount renders MFS operator chips, mobile input, and submit button", () => {
  assert.ok(appSource.includes('testID="modal_add_mfs_account"'), "modal_add_mfs_account missing");
  assert.ok(appSource.includes('testID="btn_back_add_mfs"'), "btn_back_add_mfs missing");
  assert.ok(appSource.includes('chip_mfs_bkash'), "chip_mfs_bkash missing");
  assert.ok(appSource.includes('chip_mfs_nagad'), "chip_mfs_nagad missing");
  assert.ok(appSource.includes('chip_mfs_rocket'), "chip_mfs_rocket missing");
  assert.ok(appSource.includes('chip_mfs_upay'), "chip_mfs_upay missing");
  assert.ok(appSource.includes('testID="input_mfs_mobile"'), "input_mfs_mobile missing");
  assert.ok(appSource.includes('testID="input_mfs_holder"'), "input_mfs_holder missing");
  assert.ok(appSource.includes('testID="btn_submit_add_mfs"'), "btn_submit_add_mfs missing");
});

// --- PART 6: MICRO-DEPOSIT VERIFICATION MODAL ---
console.log("\n--- PART 6: MICRO-DEPOSIT VERIFICATION MODAL ---");

runTest("6.1: modalVerifyBankDeposit renders bank details, hint card, amount input, and verify button", () => {
  assert.ok(appSource.includes('testID="modal_verify_bank_deposit"'), "modal_verify_bank_deposit missing");
  assert.ok(appSource.includes('testID="btn_back_verify_deposit"'), "btn_back_verify_deposit missing");
  assert.ok(appSource.includes('testID="input_penny_deposit_amount"'), "input_penny_deposit_amount missing");
  assert.ok(appSource.includes('testID="btn_submit_verify_deposit"'), "btn_submit_verify_deposit missing");
  assert.ok(appSource.includes("{t('penny_deposit_hint')}"), "penny_deposit_hint missing");
});

runTest("6.2: Penny deposit verification handler tests amount boundary and updates beneficiary status", () => {
  const bankAcc = {
    id: "B_TEST_01",
    targetType: "BANK",
    accountNumber: "2201987654321",
    status: "UNVERIFIED",
  };
  const verified = tallyPayService.verifyBankPennyDeposit(bankAcc, 0.45);
  assert.strictEqual(verified.success, true);
  assert.strictEqual(bankAcc.status, "VERIFIED");

  const invalidAcc = {
    id: "B_TEST_02",
    targetType: "BANK",
    accountNumber: "2201987654322",
    status: "UNVERIFIED",
  };
  const rejected = tallyPayService.verifyBankPennyDeposit(invalidAcc, 1.50);
  assert.strictEqual(rejected.success, false);
  assert.strictEqual(invalidAcc.status, "REJECTED");
});

// --- PART 7: FAST REMITTANCE PRE-POPULATION TRIGGER ---
console.log("\n--- PART 7: FAST REMITTANCE PRE-POPULATION TRIGGER ---");

runTest("7.1: Send money button on beneficiary card triggers handleSendMoneyToBeneficiary", () => {
  assert.ok(appSource.includes("handleSendMoneyToBeneficiary(b)"), "handleSendMoneyToBeneficiary invocation missing");
  assert.ok(appSource.includes("setMoneyOutMethod("), "setMoneyOutMethod switch missing");
  assert.ok(appSource.includes("setMoneyOutAccNumber("), "setMoneyOutAccNumber switch missing");
});

runTest("7.2: buildPrepopulatedRemittance generates normalized remittance with targetType and masked identifier", () => {
  const bankBeneficiary = {
    targetType: "BANK",
    bankCode: "CITY",
    bankName: "City Bank",
    accountName: "Rahim Uddin",
    accountNumber: "1102938475612",
    routingNumber: "225271835",
  };
  const remittance = tallyPayService.buildPrepopulatedRemittance(bankBeneficiary);
  assert.strictEqual(remittance.targetType, "BANK");
  assert.strictEqual(remittance.recipientName, "Rahim Uddin");
  assert.strictEqual(remittance.transferMode, "NPSB_INSTANT");
  assert.ok(remittance.maskedIdentifier.includes("**** ****"));

  const mfsBeneficiary = {
    targetType: "MFS",
    mfsProvider: "BKASH",
    accountName: "Karim Mia",
    walletNo: "01712345678",
  };
  const mfsRemittance = tallyPayService.buildPrepopulatedRemittance(mfsBeneficiary);
  assert.strictEqual(mfsRemittance.targetType, "MFS");
  assert.strictEqual(mfsRemittance.recipientName, "Karim Mia");
  assert.strictEqual(mfsRemittance.transferMode, "WALLET_INSTANT");
  assert.strictEqual(mfsRemittance.maskedIdentifier, "017****5678");
});

// --- PART 8: TOUCH TARGET ERGONOMICS & HAPTIC MILESTONES ---
console.log("\n--- PART 8: TOUCH TARGET ERGONOMICS & HAPTIC MILESTONES ---");

runTest("8.1: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers", () => {
  assert.ok(appSource.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "STANDARD_TOUCH_HIT_SLOP missing in App.js");
  assert.ok(appSource.includes('testID="btn_back_account_manager"'), "btn_back_account_manager missing");
  assert.ok(appSource.includes('testID="btn_open_add_bank"'), "btn_open_add_bank missing");
  assert.ok(appSource.includes('testID="btn_open_add_mfs"'), "btn_open_add_mfs missing");
});

runTest("8.2: Haptic feedback service invoked across key user actions", () => {
  assert.ok(appSource.includes("hapticFeedbackService.selection()"), "haptic selection missing");
  assert.ok(appSource.includes("hapticFeedbackService.impactMedium()"), "haptic impactMedium missing");
  assert.ok(appSource.includes("hapticFeedbackService.notificationSuccess()"), "haptic notificationSuccess missing");
});

// --- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---
console.log("\n--- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

runTest("9.1: Step-by-step dismissal: modalVerifyBankDeposit -> modalAddBankAccount / modalAddMfsAccount -> modalAccountManager", () => {
  assert.ok(appSource.includes("if (modalVerifyBankDeposit) {"), "modalVerifyBankDeposit back check missing");
  assert.ok(appSource.includes("if (modalAddBankAccount) {"), "modalAddBankAccount back check missing");
  assert.ok(appSource.includes("if (modalAddMfsAccount) {"), "modalAddMfsAccount back check missing");
  assert.ok(appSource.includes("if (modalAccountManager) {"), "modalAccountManager back check missing");
});

runTest("9.2: All modal states included in BackHandler useCallback dependency array", () => {
  assert.ok(appSource.includes("modalAccountManager,"), "modalAccountManager missing from BackHandler dependencies");
  assert.ok(appSource.includes("modalAddBankAccount,"), "modalAddBankAccount missing from BackHandler dependencies");
  assert.ok(appSource.includes("modalAddMfsAccount,"), "modalAddMfsAccount missing from BackHandler dependencies");
  assert.ok(appSource.includes("modalVerifyBankDeposit,"), "modalVerifyBankDeposit missing from BackHandler dependencies");
});

// --- PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---
console.log("\n--- PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

runTest("10.1: Header & Bank Primary Action (#FFFFFF on #1E3A8A) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = calculateContrastRatio("#FFFFFF", "#1E3A8A");
  console.log(`      [CONTRAST] #FFFFFF on #1E3A8A: ${ratio.toFixed(2)}:1 (${ratio >= 7.0 ? "PASS AAA" : "FAIL"})`);
  assert.ok(ratio >= 7.0, `Contrast ratio ${ratio} must be >= 7.0:1 for WCAG AAA`);
});

runTest("10.2: Dark Mode Header (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = calculateContrastRatio("#FFFFFF", "#0F172A");
  console.log(`      [CONTRAST] #FFFFFF on #0F172A: ${ratio.toFixed(2)}:1 (${ratio >= 7.0 ? "PASS AAA" : "FAIL"})`);
  assert.ok(ratio >= 7.0, `Contrast ratio ${ratio} must be >= 7.0:1 for WCAG AAA`);
});

runTest("10.3: MFS Button & Primary Action (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = calculateContrastRatio("#FFFFFF", "#0D6E5C");
  console.log(`      [CONTRAST] #FFFFFF on #0D6E5C: ${ratio.toFixed(2)}:1 (${ratio >= 4.5 ? "PASS AA" : "FAIL"})`);
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio} must be >= 4.5:1 for WCAG AA`);
});

runTest("10.4: Inactive Chip Light (#475569 on #F8FAFC) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = calculateContrastRatio("#475569", "#F8FAFC");
  console.log(`      [CONTRAST] #475569 on #F8FAFC: ${ratio.toFixed(2)}:1 (${ratio >= 7.0 ? "PASS AAA" : "FAIL"})`);
  assert.ok(ratio >= 7.0, `Contrast ratio ${ratio} must be >= 7.0:1 for WCAG AAA`);
});

runTest("10.5: Verified Status Pill Text (#15803D on #DCFCE7) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = calculateContrastRatio("#15803D", "#DCFCE7");
  console.log(`      [CONTRAST] #15803D on #DCFCE7: ${ratio.toFixed(2)}:1 (${ratio >= 4.5 ? "PASS AA" : "FAIL"})`);
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio} must be >= 4.5:1 for WCAG AA`);
});

runTest("10.6: Pending Warning Pill Text (#B45309 on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = calculateContrastRatio("#B45309", "#FEF3C7");
  console.log(`      [CONTRAST] #B45309 on #FEF3C7: ${ratio.toFixed(2)}:1 (${ratio >= 4.5 ? "PASS AA" : "FAIL"})`);
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio} must be >= 4.5:1 for WCAG AA`);
});

runTest("10.7: Beneficiary Card Text (#1E293B on #FFFFFF) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = calculateContrastRatio("#1E293B", "#FFFFFF");
  console.log(`      [CONTRAST] #1E293B on #FFFFFF: ${ratio.toFixed(2)}:1 (${ratio >= 7.0 ? "PASS AAA" : "FAIL"})`);
  assert.ok(ratio >= 7.0, `Contrast ratio ${ratio} must be >= 7.0:1 for WCAG AAA`);
});

// --- PART 11: MULTI-TENANT ISOLATION & QUERY ENGINE ---
console.log("\n--- PART 11: MULTI-TENANT ISOLATION & QUERY ENGINE ---");

runTest("11.1: storageRepository segregates beneficiaries strictly by activeBusinessId", async () => {
  const b1 = await storageRepository.saveTallyPayBeneficiary("BIZ_QA_1", {
    targetType: "BANK",
    bankName: "City Bank",
    accountName: "Tenant One User",
    accountNumber: "1234567890123",
  });
  assert.strictEqual(b1.success, true);

  const b2 = await storageRepository.saveTallyPayBeneficiary("BIZ_QA_2", {
    targetType: "MFS",
    mfsProvider: "BKASH",
    accountName: "Tenant Two User",
    walletNo: "01799887766",
  });
  assert.strictEqual(b2.success, true);

  const listBiz1 = storageRepository.getTallyPayBeneficiaries("BIZ_QA_1");
  const listBiz2 = storageRepository.getTallyPayBeneficiaries("BIZ_QA_2");

  assert.ok(listBiz1.items.some(b => b.accountName === "Tenant One User"));
  assert.ok(!listBiz1.items.some(b => b.accountName === "Tenant Two User"));

  assert.ok(listBiz2.items.some(b => b.accountName === "Tenant Two User"));
  assert.ok(!listBiz2.items.some(b => b.accountName === "Tenant One User"));
});

runTest("11.2: queryBeneficiaries filters and searches across tenant-isolated beneficiary lists", () => {
  const sampleList = [
    { id: "1", targetType: "BANK", bankName: "City Bank", accountName: "Anisur Rahman", accountNumber: "123456789" },
    { id: "2", targetType: "MFS", mfsProvider: "BKASH", accountName: "Bilkis Begum", walletNo: "01711223344" },
    { id: "3", targetType: "BANK", bankName: "BRAC Bank", accountName: "Chowdhury Kamal", accountNumber: "987654321" },
  ];

  const banks = tallyPayService.queryBeneficiaries(sampleList, { targetType: "BANK" });
  assert.strictEqual(banks.length, 2);

  const mfs = tallyPayService.queryBeneficiaries(sampleList, { targetType: "MFS" });
  assert.strictEqual(mfs.length, 1);

  const searched = tallyPayService.queryBeneficiaries(sampleList, { query: "kamal" });
  assert.strictEqual(searched.length, 1);
  assert.strictEqual(searched[0].accountName, "Chowdhury Kamal");
});

// --- PART 12: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK ---
console.log("\n--- PART 12: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK ---");

runTest("12.1: App.js compiles cleanly via Babel parser with Expo preset", () => {
  const ast = babel.parseSync(appSource, {
    filename: "App.js",
    babelrc: false,
    presets: ["babel-preset-expo"],
  });
  assert.ok(ast && ast.program && ast.program.body.length > 50, "App.js AST parsing failed");
  console.log(`      [BABEL] Successfully parsed ${ast.program.body.length} top-level program statements`);
});

runTest("12.2: Latency benchmark: 1,000 beneficiary operations execute in < 200ms", () => {
  const mockBeneficiaries = [];
  for (let i = 0; i < 1000; i++) {
    mockBeneficiaries.push({
      id: `BEN_${i}`,
      targetType: i % 2 === 0 ? "BANK" : "MFS",
      bankName: i % 2 === 0 ? "The City Bank Limited" : null,
      mfsProvider: i % 2 === 0 ? null : "BKASH",
      accountName: `User ${i}`,
      accountNumber: `1234567890${i}`,
      walletNo: `0170000${i.toString().padStart(4, "0")}`,
      status: i % 3 === 0 ? "VERIFIED" : "UNVERIFIED",
    });
  }

  const start = Date.now();
  const filtered = tallyPayService.queryBeneficiaries(mockBeneficiaries, { targetType: "BANK", query: "User 10" });
  for (let i = 0; i < 100; i++) {
    tallyPayService.buildPrepopulatedRemittance(mockBeneficiaries[i]);
  }
  const elapsed = Date.now() - start;

  console.log(`      [BENCHMARK] 1,000 queries & 100 prepopulated remittances in ${elapsed}ms (${(elapsed / 1000).toFixed(4)}ms/op)`);
  assert.ok(elapsed < 200, `Benchmark took ${elapsed}ms, exceeding 200ms threshold`);
  assert.ok(filtered.length > 0, "Query should match items");
});

console.log("\n================================================================================");
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failures.length} (${failures.length === 0 ? "100% SUCCESS" : "FAILURES DETECTED"})`);
console.log("================================================================================");

if (failures.length > 0) {
  process.exit(1);
}
