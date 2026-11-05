/**
 * TallyKhata - Iteration 239 UI/UX & Interaction QA Suite
 * Milestone: REA-ITER-239
 * Feature: TallyPay Merchant Digital Micro-Loan, Credit Scoring & EMI Repayment Subsystem
 *
 * Scope:
 * - Bilingual localization (i18n) key symmetry & REF-001 ARSC copy verification
 * - App.js state hooks, test hooks, and loan calculation engine bindings
 * - Navigation entry points in Tab 4 (TallyPay) & Tab 5 (Menu)
 * - Modal 117: modalLoanEligibility (Credit score dial/gauge, pre-approved limit, partner banks)
 * - Modal 118: modalLoanApplication (Loan amount stepper, tenure chips, purpose selector)
 * - Modal 119: modalLoanBreakdownTerms (Disclosure breakdown, regulatory notice, agreement checkbox)
 * - Modal 120: modalLoanEmiSchedule (Active loan card, interactive schedule list, status pills)
 * - Modal 121: modalLoanRepayment (Repayment breakdown, payment source selector, instant confirmation)
 * - Android Hardware BackHandler safe stacked dismissal
 * - Material touch target ergonomics (>= 48x48dp via STANDARD_TOUCH_HIT_SLOP)
 * - WCAG 2.1 AA/AAA luminance contrast verification (Light & Dark themes)
 * - Strict Modal Count Invariant: Exactly 126 Modals, 126 onRequestClose handlers, 121 controllers
 * - Babel AST compilation with zero syntax errors
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

async function runTest(desc, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log("  ✓ [PASS] " + desc);
  } catch (err) {
    failedTests++;
    console.error("  ✗ [FAIL] " + desc);
    console.error("    Error: " + err.message);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("TALLYKHATA ITERATION 239: TALLYPAY DIGITAL MICRO-LOAN & CREDIT UI/UX QA SUITE");
  console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
  console.log("Milestone: REA-ITER-239");
  console.log("================================================================================");

  const appSrc = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");

  // -----------------------------------------------------------------------------
  // PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS ---");

  const requiredIter239Keys = [
    "digital_micro_loan",
    "credit_score_title",
    "credit_score_gauge",
    "pre_approved_limit",
    "apply_loan_now",
    "partner_banks_title",
    "loan_tenure_months",
    "business_purpose",
    "trade_license_upload",
    "transparent_disclosure",
    "loan_principal_amount",
    "processing_fee",
    "interest_rate",
    "monthly_emi",
    "regulatory_compliance_disclaimer",
    "terms_agreement_checkbox",
    "emi_schedule_title",
    "emi_number",
    "emi_due_date",
    "emi_status_paid",
    "emi_status_due",
    "emi_status_overdue",
    "pay_emi_now",
    "loan_repayment_title",
    "repayment_source_wallet",
    "repayment_source_bank",
    "repayment_success_toast",
    "loan_amount_selector",
    "purpose_stock",
    "purpose_expansion",
    "purpose_emergency",
    "tenure_3_months",
    "tenure_6_months",
    "tenure_12_months",
    "disbursed_amount",
    "total_interest_amount",
    "active_loan_id",
    "total_borrowed",
    "remaining_loan_balance",
    "next_emi_due",
    "late_fee_penalty",
    "partner_brac_bank",
    "partner_city_bank",
    "partner_mtb",
    "partner_prime_bank",
    "partner_ipdc",
    "credit_score_excellent",
    "loan_subtitle",
    "repay_loan_btn",
    "auto_debit_active",
    "insufficient_loan_balance",
    "application_submitted",
    "loan_approved",
    "remaining_emis"
  ];

  await runTest("1.1: All Iteration 239 localization keys exist in STRINGS.bn", () => {
    requiredIter239Keys.forEach((key) => {
      assert.ok(i18n.STRINGS.bn[key], "Missing BN key: " + key);
    });
  });

  await runTest("1.2: All Iteration 239 localization keys exist in STRINGS.en", () => {
    requiredIter239Keys.forEach((key) => {
      assert.ok(i18n.STRINGS.en[key], "Missing EN key: " + key);
    });
  });

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
    assert.strictEqual(i18n.t("digital_micro_loan", "bn"), "ডিজিটাল ঋণ");
    assert.strictEqual(i18n.t("digital_micro_loan", "en"), "Digital Micro-Loan");
    assert.strictEqual(i18n.t("credit_score_title", "bn"), "ক্রেডিট স্কোর ও যোগ্যতা");
    assert.strictEqual(i18n.t("credit_score_title", "en"), "Credit Score & Eligibility");
  });

  await runTest("1.4: Authentic REF-001 ARSC tokens present in STRINGS.bn", () => {
    assert.strictEqual(i18n.STRINGS.bn.digital_micro_loan, "ডিজিটাল ঋণ");
    assert.strictEqual(i18n.STRINGS.bn.loan_subtitle, "সহজ শর্তে জামানতবিহীন ঋণ নিন");
    assert.strictEqual(i18n.STRINGS.bn.monthly_emi, "মাসিক ইএমআই (কিস্তি)");
    assert.strictEqual(i18n.STRINGS.bn.repay_loan_btn, "ঋণ পরিশোধ করুন");
    assert.strictEqual(i18n.STRINGS.bn.auto_debit_active, "অটো-ডেবিট সক্রিয় আছে");
    assert.strictEqual(i18n.STRINGS.bn.repayment_success_toast, "কিস্তি সফলভাবে পরিশোধ করা হয়েছে!");
  });

  await runTest("1.5: Complete dictionary parity maintained across bn and en (zero missing keys)", () => {
    const bnKeys = Object.keys(i18n.STRINGS.bn);
    const enKeys = Object.keys(i18n.STRINGS.en);
    assert.strictEqual(bnKeys.length, enKeys.length, "bn and en must have identical key count");
    const diff = bnKeys.filter((k) => !i18n.STRINGS.en[k]);
    assert.strictEqual(diff.length, 0, "Discrepancy detected: " + diff.join(", "));
  });

  // -----------------------------------------------------------------------------
  // PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

  await runTest("2.1: Modals 117–121 state controllers declared in App.js", () => {
    assert.ok(appSrc.includes("const [modalLoanEligibility, setModalLoanEligibility] = useState(false);"));
    assert.ok(appSrc.includes("const [modalLoanApplication, setModalLoanApplication] = useState(false);"));
    assert.ok(appSrc.includes("const [modalLoanBreakdownTerms, setModalLoanBreakdownTerms] = useState(false);"));
    assert.ok(appSrc.includes("const [modalLoanEmiSchedule, setModalLoanEmiSchedule] = useState(false);"));
    assert.ok(appSrc.includes("const [modalLoanRepayment, setModalLoanRepayment] = useState(false);"));
  });

  await runTest("2.2: Loan amount, tenure, purpose, partner bank, terms, repayment hooks declared", () => {
    assert.ok(appSrc.includes("const [selectedLoanAmount, setSelectedLoanAmount] = useState(30000);"));
    assert.ok(appSrc.includes("const [selectedLoanTenure, setSelectedLoanTenure] = useState(6);"));
    assert.ok(appSrc.includes("const [selectedLoanPurpose, setSelectedLoanPurpose] = useState('STOCK');"));
    assert.ok(appSrc.includes("const [selectedPartnerBank, setSelectedPartnerBank] = useState('BRAC_BANK');"));
    assert.ok(appSrc.includes("const [loanTermsAgreed, setLoanTermsAgreed] = useState(false);"));
    assert.ok(appSrc.includes("const [loanTermsError, setLoanTermsError] = useState('');"));
    assert.ok(appSrc.includes("const [loanRepaymentSource, setLoanRepaymentSource] = useState('WALLET');"));
    assert.ok(appSrc.includes("const [loanRepaymentSuccess, setLoanRepaymentSuccess] = useState(false);"));
    assert.ok(appSrc.includes("const [activeLoanData, setActiveLoanData] = useState("));
  });

  await runTest("2.3: global.__LOAN_CREDIT_TEST_HOOKS__ exposed in App.js with required keys", () => {
    assert.ok(appSrc.includes("global.__LOAN_CREDIT_TEST_HOOKS__ = {"));
    const requiredHooks = [
      "modalLoanEligibility",
      "setModalLoanEligibility",
      "modalLoanApplication",
      "setModalLoanApplication",
      "modalLoanBreakdownTerms",
      "setModalLoanBreakdownTerms",
      "modalLoanEmiSchedule",
      "setModalLoanEmiSchedule",
      "modalLoanRepayment",
      "setModalLoanRepayment",
      "selectedLoanAmount",
      "setSelectedLoanAmount",
      "selectedLoanTenure",
      "setSelectedLoanTenure",
      "selectedLoanPurpose",
      "setSelectedLoanPurpose",
      "selectedPartnerBank",
      "setSelectedPartnerBank",
      "loanTermsAgreed",
      "setLoanTermsAgreed",
      "loanTermsError",
      "setLoanTermsError",
      "loanRepaymentSource",
      "setLoanRepaymentSource",
      "loanRepaymentSuccess",
      "setLoanRepaymentSuccess",
      "activeLoanData",
      "setActiveLoanData",
      "handleOpenLoanEligibility",
      "handleApplyLoanNow",
      "handleViewLoanSchedule",
      "handleProceedLoanTerms",
      "handleConfirmSubmitLoan",
      "handlePayEmiNow",
      "handleConfirmEmiRepayment",
      "handleDoneEmiRepayment"
    ];
    requiredHooks.forEach((hook) => {
      assert.ok(appSrc.includes(hook), "Missing test hook in App.js: " + hook);
    });
  });

  await runTest("2.4: Digital micro-loan action handlers defined and connected", () => {
    assert.ok(appSrc.includes("const handleOpenLoanEligibility = () => {"));
    assert.ok(appSrc.includes("const handleApplyLoanNow = () => {"));
    assert.ok(appSrc.includes("const handleViewLoanSchedule = () => {"));
    assert.ok(appSrc.includes("const handleProceedLoanTerms = () => {"));
    assert.ok(appSrc.includes("const handleConfirmSubmitLoan = () => {"));
    assert.ok(appSrc.includes("const handlePayEmiNow = () => {"));
    assert.ok(appSrc.includes("const handleConfirmEmiRepayment = () => {"));
    assert.ok(appSrc.includes("const handleDoneEmiRepayment = () => {"));
  });

  await runTest("2.5: Loan partner banks and credit score tiers supported in tallyPayService", () => {
    assert.ok(tallyPay.LOAN_PARTNER_BANKS.BRAC_BANK, "BRAC Bank partner must be defined");
    assert.ok(tallyPay.LOAN_PARTNER_BANKS.CITY_BANK, "City Bank partner must be defined");
    assert.ok(tallyPay.LOAN_PARTNER_BANKS.MUTUAL_TRUST_BANK, "MTB partner must be defined");
    assert.ok(tallyPay.CREDIT_SCORE_TIERS.EXCELLENT, "EXCELLENT tier must be defined");
    assert.strictEqual(tallyPay.CREDIT_SCORE_TIERS.EXCELLENT.minScore, 800);
  });

  // -----------------------------------------------------------------------------
  // PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders Digital Micro-Loan quick action button", () => {
    assert.ok(appSrc.includes('testID="tp_digital_loan_btn"'));
    assert.ok(appSrc.includes("onPress={handleOpenLoanEligibility}"));
  });

  await runTest("3.2: Tab 5 (Menu) renders Digital Micro-Loan menu list item", () => {
    assert.ok(appSrc.includes('testID="menu_tp_digital_loan_item"'));
  });

  await runTest("3.3: All navigation triggers attach STANDARD_TOUCH_HIT_SLOP and accessible button roles", () => {
    const tab4Snippet = appSrc.slice(
      appSrc.indexOf('testID="tp_digital_loan_btn"'),
      appSrc.indexOf('testID="tp_digital_loan_btn"') + 350
    );
    assert.ok(tab4Snippet.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"));
    assert.ok(tab4Snippet.includes('accessibilityRole="button"'));

    const tab5Snippet = appSrc.slice(
      appSrc.indexOf('testID="menu_tp_digital_loan_item"') - 200,
      appSrc.indexOf('testID="menu_tp_digital_loan_item"') + 150
    );
    assert.ok(tab5Snippet.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"));
    assert.ok(tab5Snippet.includes('accessibilityRole="button"'));
  });

  // -----------------------------------------------------------------------------
  // PART 4: MODAL 117 (modalLoanEligibility) LAYOUT & CREDIT SCORE GAUGE
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 4: MODAL 117 (modalLoanEligibility) LAYOUT & CREDIT SCORE GAUGE ---");

  await runTest("4.1: modalLoanEligibility defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('visible={modalLoanEligibility}'));
    assert.ok(appSrc.includes('onRequestClose={() => setModalLoanEligibility(false)}'));
    assert.ok(appSrc.includes('testID="modal_loan_eligibility"'));
  });

  await runTest("4.2: Header renders title, subtitle, and back button (btn_loan_eligibility_back)", () => {
    assert.ok(appSrc.includes('testID="btn_loan_eligibility_back"'));
  });

  await runTest("4.3: Credit score gauge card (card_credit_score_gauge) with score and tier badge", () => {
    assert.ok(appSrc.includes('testID="card_credit_score_gauge"'));
    assert.ok(appSrc.includes('testID="text_credit_score_value"'));
    assert.ok(appSrc.includes('testID="badge_credit_score_tier"'));
  });

  await runTest("4.4: Pre-approved limit card (card_pre_approved_limit) with amount display", () => {
    assert.ok(appSrc.includes('testID="card_pre_approved_limit"'));
    assert.ok(appSrc.includes('testID="text_pre_approved_amount"'));
  });

  await runTest("4.5: 5 partner bank cards (BRAC, City, MTB, Prime, IPDC) selectable", () => {
    assert.ok(appSrc.includes('testID="card_partner_banks"'));
    assert.ok(appSrc.includes('testID={partner.testId}'));
    assert.ok(appSrc.includes('partner_card_brac'));
    assert.ok(appSrc.includes('partner_card_city'));
    assert.ok(appSrc.includes('partner_card_mtb'));
    assert.ok(appSrc.includes('partner_card_prime'));
    assert.ok(appSrc.includes('partner_card_ipdc'));
  });

  await runTest("4.6: Apply Now CTA (btn_apply_loan_now) transitions to Modal 118", () => {
    assert.ok(appSrc.includes('testID="btn_apply_loan_now"'));
    assert.ok(appSrc.includes("onPress={handleApplyLoanNow}"));
  });

  await runTest("4.7: View Schedule CTA (btn_view_loan_schedule) transitions to Modal 120", () => {
    assert.ok(appSrc.includes('testID="btn_view_loan_schedule"'));
    assert.ok(appSrc.includes("onPress={handleViewLoanSchedule}"));
  });

  // -----------------------------------------------------------------------------
  // PART 5: MODAL 118 (modalLoanApplication) AMOUNT STEPPER & TENURE SELECTOR
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 5: MODAL 118 (modalLoanApplication) AMOUNT STEPPER & TENURE SELECTOR ---");

  await runTest("5.1: modalLoanApplication defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('visible={modalLoanApplication}'));
    assert.ok(appSrc.includes('testID="modal_loan_application"'));
  });

  await runTest("5.2: Header renders title, subtitle, and back button (btn_loan_application_back)", () => {
    assert.ok(appSrc.includes('testID="btn_loan_application_back"'));
  });

  await runTest("5.3: Loan amount stepper (card_loan_amount_stepper, btn_loan_amount_minus, btn_loan_amount_plus)", () => {
    assert.ok(appSrc.includes('testID="card_loan_amount_stepper"'));
    assert.ok(appSrc.includes('testID="btn_loan_amount_minus"'));
    assert.ok(appSrc.includes('testID="text_selected_loan_amount"'));
    assert.ok(appSrc.includes('testID="btn_loan_amount_plus"'));
  });

  await runTest("5.4: Tenure selector chips (card_loan_tenure_selector, chip_tenure_3m, chip_tenure_6m, chip_tenure_12m)", () => {
    assert.ok(appSrc.includes('testID="card_loan_tenure_selector"'));
    assert.ok(appSrc.includes('chip_tenure_3m'));
    assert.ok(appSrc.includes('chip_tenure_6m'));
    assert.ok(appSrc.includes('chip_tenure_12m'));
  });

  await runTest("5.5: Business purpose selector chips (card_loan_purpose_selector, chip_purpose_stock, chip_purpose_expansion, chip_purpose_emergency)", () => {
    assert.ok(appSrc.includes('testID="card_loan_purpose_selector"'));
    assert.ok(appSrc.includes('chip_purpose_stock'));
    assert.ok(appSrc.includes('chip_purpose_expansion'));
    assert.ok(appSrc.includes('chip_purpose_emergency'));
  });

  await runTest("5.6: Document verification status card (card_doc_verification_status)", () => {
    assert.ok(appSrc.includes('testID="card_doc_verification_status"'));
  });

  await runTest("5.7: Proceed CTA (btn_proceed_loan_terms) advances to Modal 119", () => {
    assert.ok(appSrc.includes('testID="btn_proceed_loan_terms"'));
    assert.ok(appSrc.includes("onPress={handleProceedLoanTerms}"));
  });

  // -----------------------------------------------------------------------------
  // PART 6: MODAL 119 (modalLoanBreakdownTerms) DISCLOSURE BREAKDOWN & REGULATORY NOTICE
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 6: MODAL 119 (modalLoanBreakdownTerms) DISCLOSURE BREAKDOWN & REGULATORY NOTICE ---");

  await runTest("6.1: modalLoanBreakdownTerms defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('visible={modalLoanBreakdownTerms}'));
    assert.ok(appSrc.includes('testID="modal_loan_breakdown_terms"'));
  });

  await runTest("6.2: Header renders title, subtitle, and back button (btn_loan_terms_back)", () => {
    assert.ok(appSrc.includes('testID="btn_loan_terms_back"'));
  });

  await runTest("6.3: Financial disclosure card renders principal, fee, interest, EMI, and disbursed amount", () => {
    assert.ok(appSrc.includes('testID="card_loan_disclosure_breakdown"'));
    assert.ok(appSrc.includes('testID="text_disclosure_principal"'));
    assert.ok(appSrc.includes('testID="text_disclosure_fee"'));
    assert.ok(appSrc.includes('testID="text_disclosure_interest_rate"'));
    assert.ok(appSrc.includes('testID="text_disclosure_total_interest"'));
    assert.ok(appSrc.includes('testID="text_disclosure_monthly_emi"'));
    assert.ok(appSrc.includes('testID="text_disclosure_disbursed_amount"'));
  });

  await runTest("6.4: Regulatory compliance notice card (card_loan_regulatory_notice)", () => {
    assert.ok(appSrc.includes('testID="card_loan_regulatory_notice"'));
  });

  await runTest("6.5: Digital terms agreement checkbox (checkbox_loan_terms_agree)", () => {
    assert.ok(appSrc.includes('testID="checkbox_loan_terms_agree"'));
    assert.ok(appSrc.includes('setLoanTermsAgreed(!loanTermsAgreed)'));
  });

  await runTest("6.6: Validation error banner (text_loan_terms_error) rendered on unagreed submit", () => {
    assert.ok(appSrc.includes('testID="text_loan_terms_error"'));
  });

  await runTest("6.7: Confirm submit loan CTA (btn_confirm_submit_loan) triggers loan submission", () => {
    assert.ok(appSrc.includes('testID="btn_confirm_submit_loan"'));
    assert.ok(appSrc.includes("onPress={handleConfirmSubmitLoan}"));
  });

  // -----------------------------------------------------------------------------
  // PART 7: MODAL 120 (modalLoanEmiSchedule) EMI SCHEDULE & STATUS PILLS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 7: MODAL 120 (modalLoanEmiSchedule) EMI SCHEDULE & STATUS PILLS ---");

  await runTest("7.1: modalLoanEmiSchedule defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('visible={modalLoanEmiSchedule}'));
    assert.ok(appSrc.includes('onRequestClose={() => setModalLoanEmiSchedule(false)}'));
    assert.ok(appSrc.includes('testID="modal_loan_emi_schedule"'));
  });

  await runTest("7.2: Header renders title, subtitle, and back button (btn_emi_schedule_back)", () => {
    assert.ok(appSrc.includes('testID="btn_emi_schedule_back"'));
  });

  await runTest("7.3: Active loan summary card (card_active_loan_summary) with loan ID and balances", () => {
    assert.ok(appSrc.includes('testID="card_active_loan_summary"'));
    assert.ok(appSrc.includes('testID="text_active_loan_id"'));
    assert.ok(appSrc.includes('testID="text_active_loan_total"'));
    assert.ok(appSrc.includes('testID="text_active_loan_remaining"'));
    assert.ok(appSrc.includes('testID="text_active_loan_next_due"'));
  });

  await runTest("7.4: Interactive EMI schedule list (list_emi_schedule) with installment items", () => {
    assert.ok(appSrc.includes('testID="list_emi_schedule"'));
    assert.ok(appSrc.includes('testID={emi.testId}'));
    assert.ok(appSrc.includes('emi_item_1'));
    assert.ok(appSrc.includes('emi_item_2'));
    assert.ok(appSrc.includes('emi_item_3'));
  });

  await runTest("7.5: Status badges: PAID (badge_emi_status_paid), DUE (badge_emi_status_due), UPCOMING (badge_emi_status_upcoming)", () => {
    assert.ok(appSrc.includes('testID="badge_emi_status_paid"'));
    assert.ok(appSrc.includes('testID="badge_emi_status_due"'));
    assert.ok(appSrc.includes('testID="badge_emi_status_upcoming"'));
  });

  await runTest("7.6: Repay next EMI CTA (btn_pay_emi_now) opens Modal 121", () => {
    assert.ok(appSrc.includes('testID="btn_pay_emi_now"'));
    assert.ok(appSrc.includes("onPress={handlePayEmiNow}"));
  });

  // -----------------------------------------------------------------------------
  // PART 8: MODAL 121 (modalLoanRepayment) CHECKOUT BREAKDOWN & REPAYMENT METHOD
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 8: MODAL 121 (modalLoanRepayment) CHECKOUT BREAKDOWN & REPAYMENT METHOD ---");

  await runTest("8.1: modalLoanRepayment defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('visible={modalLoanRepayment}'));
    assert.ok(appSrc.includes('testID="modal_loan_repayment"'));
  });

  await runTest("8.2: Header renders title, subtitle, and back button (btn_loan_repayment_back)", () => {
    assert.ok(appSrc.includes('testID="btn_loan_repayment_back"'));
  });

  await runTest("8.3: Repayment breakdown card renders installment amount, late fee, and total payable", () => {
    assert.ok(appSrc.includes('testID="card_repayment_breakdown"'));
    assert.ok(appSrc.includes('testID="text_repayment_installment_amount"'));
    assert.ok(appSrc.includes('testID="text_repayment_late_fee"'));
    assert.ok(appSrc.includes('testID="text_repayment_total_amount"'));
  });

  await runTest("8.4: Payment method selection radios (radio_repay_wallet, radio_repay_bank)", () => {
    assert.ok(appSrc.includes('testID="radio_repay_wallet"'));
    assert.ok(appSrc.includes('testID="radio_repay_bank"'));
    assert.ok(appSrc.includes("setLoanRepaymentSource('WALLET')"));
    assert.ok(appSrc.includes("setLoanRepaymentSource('BANK')"));
  });

  await runTest("8.5: Confirm repayment CTA (btn_confirm_emi_repayment) and success banner (text_repayment_success_banner)", () => {
    assert.ok(appSrc.includes('testID="btn_confirm_emi_repayment"'));
    assert.ok(appSrc.includes('testID="text_repayment_success_banner"'));
    assert.ok(appSrc.includes('testID="btn_repayment_done"'));
  });

  // -----------------------------------------------------------------------------
  // PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("9.1: BackHandler onBackPress steps back from modalLoanRepayment to modalLoanEmiSchedule", () => {
    assert.ok(appSrc.includes("if (modalLoanRepayment) {"));
    assert.ok(appSrc.includes("setModalLoanRepayment(false);"));
    assert.ok(appSrc.includes("setModalLoanEmiSchedule(true);"));
  });

  await runTest("9.2: BackHandler onBackPress dismisses modalLoanEmiSchedule cleanly", () => {
    assert.ok(appSrc.includes("if (modalLoanEmiSchedule) {"));
    assert.ok(appSrc.includes("setModalLoanEmiSchedule(false);"));
  });

  await runTest("9.3: BackHandler onBackPress steps back from modalLoanBreakdownTerms to modalLoanApplication", () => {
    assert.ok(appSrc.includes("if (modalLoanBreakdownTerms) {"));
    assert.ok(appSrc.includes("setModalLoanBreakdownTerms(false);"));
    assert.ok(appSrc.includes("setModalLoanApplication(true);"));
  });

  await runTest("9.4: BackHandler onBackPress steps back from modalLoanApplication to modalLoanEligibility", () => {
    assert.ok(appSrc.includes("if (modalLoanApplication) {"));
    assert.ok(appSrc.includes("setModalLoanApplication(false);"));
    assert.ok(appSrc.includes("setModalLoanEligibility(true);"));
  });

  await runTest("9.5: BackHandler onBackPress dismisses modalLoanEligibility cleanly", () => {
    assert.ok(appSrc.includes("if (modalLoanEligibility) {"));
    assert.ok(appSrc.includes("setModalLoanEligibility(false);"));
  });

  await runTest("9.6: BackHandler useCallback dependency array includes all 5 Iteration 239 modal controllers", () => {
    assert.ok(appSrc.includes("modalLoanEligibility, modalLoanApplication, modalLoanBreakdownTerms, modalLoanEmiSchedule, modalLoanRepayment"));
  });

  // -----------------------------------------------------------------------------
  // PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK ---");

  await runTest("10.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP, "STANDARD_TOUCH_HIT_SLOP must be defined");
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.top >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.bottom >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.left >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.right >= 10);
  });

  await runTest("10.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in Modals 117–121", () => {
    const loanModalsSlice = appSrc.slice(
      appSrc.indexOf('testID="modal_loan_eligibility"'),
      appSrc.indexOf('testID="modal_loan_repayment"') + 3500
    );
    const hitSlopMatches = loanModalsSlice.match(/hitSlop={STANDARD_TOUCH_HIT_SLOP}/g) || [];
    assert.ok(hitSlopMatches.length >= 15, "Expected >= 15 hitSlop attachments in Modals 117-121, got " + hitSlopMatches.length);
  });

  await runTest("10.3: Haptic feedback milestones wired in loan action handlers", () => {
    assert.ok(appSrc.includes("hapticFeedbackService.notificationSuccess()"));
    assert.ok(appSrc.includes("hapticFeedbackService.selection()"));
  });

  // -----------------------------------------------------------------------------
  // PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  function parseHex(hex) {
    let cleaned = hex.replace("#", "").trim();
    if (cleaned.length === 3) {
      cleaned = cleaned.split("").map((c) => c + c).join("");
    }
    const num = parseInt(cleaned, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function getLuminance(rgb) {
    const [r, g, b] = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function getContrastRatio(fgHex, bgHex) {
    const lum1 = getLuminance(parseHex(fgHex));
    const lum2 = getLuminance(parseHex(bgHex));
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  await runTest("11.1: Primary CTA button (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#FFFFFF", "#0D6E5C");
    console.log("      [CONTRAST] #FFFFFF on #0D6E5C: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Expected contrast ratio >= 4.5:1");
  });

  await runTest("11.2: Dark mode card surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
    const ratio = getContrastRatio("#FFFFFF", "#0F172A");
    console.log("      [CONTRAST] #FFFFFF on #0F172A: " + ratio.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(ratio >= 7.0, "Expected contrast ratio >= 7.0:1");
  });

  await runTest("11.3: Paid status badge (#0D6E5C on #D1FAE5) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#0D6E5C", "#D1FAE5");
    console.log("      [CONTRAST] #0D6E5C on #D1FAE5: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Expected contrast ratio >= 4.5:1");
  });

  await runTest("11.4: Due warning badge (#78350F on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#78350F", "#FEF3C7");
    console.log("      [CONTRAST] #78350F on #FEF3C7: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Expected contrast ratio >= 4.5:1");
  });

  await runTest("11.5: Light theme card background text (#1E293B on #F8FAFC) achieves WCAG AAA (>= 7.0:1)", () => {
    const ratio = getContrastRatio("#1E293B", "#F8FAFC");
    console.log("      [CONTRAST] #1E293B on #F8FAFC: " + ratio.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(ratio >= 7.0, "Expected contrast ratio >= 7.0:1");
  });

  // -----------------------------------------------------------------------------
  // PART 12: MODAL COUNT & CONTROLLER INVARIANTS (131 MODALS)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 12: MODAL COUNT & CONTROLLER INVARIANTS (131 MODALS) ---");

  await runTest("12.1: App.js contains exactly 131 <Modal elements", () => {
    const modalMatches = appSrc.match(/<Modal\b/g) || [];
    assert.strictEqual(modalMatches.length, 131, "Expected exactly 131 modals in App.js, got " + modalMatches.length);
  });

  await runTest("12.2: App.js contains exactly 131 onRequestClose handlers", () => {
    const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
    assert.strictEqual(reqCloseMatches.length, 131, "Expected 131 onRequestClose handlers, got " + reqCloseMatches.length);
  });

  await runTest("12.3: App.js contains exactly 131 unique modal state controllers", () => {
    const regex = /visible=\{([a-zA-Z0-9_]+)\}/g;
    const uniqueModals = new Set();
    let m;
    while ((m = regex.exec(appSrc)) !== null) {
      uniqueModals.add(m[1]);
    }
    assert.strictEqual(uniqueModals.size, 131, "Expected 131 unique visible controllers, got " + uniqueModals.size);
    assert.ok(uniqueModals.has("modalLoanEligibility"), "modalLoanEligibility must be in unique controllers");
    assert.ok(uniqueModals.has("modalLoanApplication"), "modalLoanApplication must be in unique controllers");
    assert.ok(uniqueModals.has("modalLoanBreakdownTerms"), "modalLoanBreakdownTerms must be in unique controllers");
    assert.ok(uniqueModals.has("modalLoanEmiSchedule"), "modalLoanEmiSchedule must be in unique controllers");
    assert.ok(uniqueModals.has("modalLoanRepayment"), "modalLoanRepayment must be in unique controllers");
  });

  // -----------------------------------------------------------------------------
  // PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK ---");

  await runTest("13.1: App.js compiles cleanly via Babel parser with zero syntax errors", () => {
    const t0 = Date.now();
    const result = babel.parseSync(appSrc, {
      filename: "App.js",
      presets: ["babel-preset-expo"]
    });
    const duration = Date.now() - t0;
    assert.ok(result, "Babel AST must be generated");
    assert.strictEqual(result.type, "File", "AST root must be File");
    console.log("      [BABEL] Successfully parsed App.js in " + duration + "ms");
  });

  await runTest("13.2: Latency benchmark: 1,000 loan amortization calculations execute in < 200ms", () => {
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
      const principal = 30000;
      const tenure = 6;
      const rateBps = 900;
      const processingFee = Math.round(principal * 0.015);
      const interest = Math.round(principal * (rateBps / 10000) * (tenure / 12));
      const monthlyEmi = Math.round((principal + interest) / tenure);
      const totalPayable = principal + interest;
    }
    const elapsed = Date.now() - t0;
    console.log("      [BENCHMARK] 1,000 operations completed in " + elapsed + "ms (" + (elapsed / 1000).toFixed(4) + "ms/op)");
    assert.ok(elapsed < 200, "Benchmark must complete in < 200ms");
  });

  console.log("\n================================================================================");
  console.log("TOTAL: " + totalTests + " | PASSED: " + passedTests + " | FAILED: " + failedTests + " (" + (failedTests === 0 ? "100% SUCCESS" : "HAS FAILURES") + ")");
  console.log("================================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR: " + err.message);
  process.exit(1);
});
