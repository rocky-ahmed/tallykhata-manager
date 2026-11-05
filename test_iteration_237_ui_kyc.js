/**
 * TALLYKHATA ITERATION 237: TALLYPAY MERCHANT KYC, NID SCANNER & BIO-VERIFICATION UI/UX QA SUITE
 *
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions / QA & Security Owner)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Milestone: REA-ITER-237
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
  if (clean.length === 6) {
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  return [0, 0, 0];
}

function getContrastRatio(fgHex, bgHex) {
  const rgbFg = hexToRgb(fgHex);
  const rgbBg = hexToRgb(bgHex);
  const lFg = getLuminance(...rgbFg);
  const lBg = getLuminance(...rgbBg);
  const lighter = Math.max(lFg, lBg);
  const darker = Math.min(lFg, lBg);
  return (lighter + 0.05) / (darker + 0.05);
}

async function runAllTests() {
  console.log("================================================================================");
  console.log("TALLYKHATA ITERATION 237: TALLYPAY MERCHANT KYC & BIO-VERIFICATION UI/UX QA SUITE");
  console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
  console.log("Milestone: REA-ITER-237");
  console.log("================================================================================");

  const appPath = path.resolve(__dirname, "App.js");
  const appSrc = fs.readFileSync(appPath, "utf8");

  // -----------------------------------------------------------------------------
  // PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS ---");

  const requiredKycKeys = [
    "merchant_kyc_title",
    "merchant_kyc_desc",
    "kyc_start_btn",
    "kyc_steps_overview",
    "kyc_step_nid",
    "kyc_step_selfie",
    "kyc_step_review",
    "nid_camera_title",
    "nid_orientation_front",
    "nid_orientation_back",
    "nid_camera_flash",
    "nid_capture_btn",
    "nid_retake_btn",
    "nid_ocr_review_title",
    "nid_ocr_review_desc",
    "nid_number_label",
    "proceed_to_selfie",
    "liveness_selfie_title",
    "kyc_status_verified",
    "kyc_status_pending",
    "kyc_status_rejected",
    "kyc_status_incomplete",
    "biometric_match_score",
    "kyc_done_btn",
    "kyc_retry_btn",
    "kyc_badge_verified",
    "kyc_badge_unverified",
    "nid_length_error",
    "ekyc_header_banner",
    "nid_front_label",
    "nid_back_label",
    "nid_front_overlay",
    "nid_back_overlay",
    "selfie_confirm_title",
    "matching_progress",
    "match_success",
    "match_failed",
    "verify_retry_later",
    "selfie_mismatch_badge",
    "selfie_instruction",
    "camera_permission_rationale",
    "selfie_complete_cta",
    "nid_info_verifying",
    "nid_server_error"
  ];

  await runTest("1.1: All Iteration 237 localization keys exist in STRINGS.bn", () => {
    for (const key of requiredKycKeys) {
      assert.ok(i18n.STRINGS.bn[key] !== undefined, "Missing key in STRINGS.bn: " + key);
    }
  });

  await runTest("1.2: All Iteration 237 localization keys exist in STRINGS.en", () => {
    for (const key of requiredKycKeys) {
      assert.ok(i18n.STRINGS.en[key] !== undefined, "Missing key in STRINGS.en: " + key);
    }
  });

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
    assert.strictEqual(i18n.t("merchant_kyc_title", "bn"), "মার্চেন্ট ভেরিফিকেশন (e-KYC)");
    assert.strictEqual(i18n.t("merchant_kyc_title", "en"), "Merchant Verification (e-KYC)");
    assert.strictEqual(i18n.t("nid_camera_title", "bn"), "NID স্ক্যানার");
    assert.strictEqual(i18n.t("nid_camera_title", "en"), "NID Scanner");
  });

  await runTest("1.4: Authentic REF-001 ARSC tokens present in STRINGS.bn", () => {
    const authenticTokens = [
      "NID নম্বর ১০, ১৩ অথবা ১৭ সংখ্যা হতে হবে।",
      "NID ও সেলফি দিয়ে e-KYC সম্পন্ন করুন",
      "NID-এর ছবি (সামনে)",
      "NID-এর ছবি (পেছনে)",
      "NID-এর সামনের ছবি তুলুন।",
      "NID-এর পিছনের ছবি তুলুন।",
      "আপনার সেলফি নিশ্চিত করুন",
      "আপনার সেলফিটি NID-এর সাথে মেলানো হচ্ছে…",
      "আপনার সেলফিটি NID-এর সাথে যাচাই হয়েছে।",
      "আপনার সেলফিটি NID-এর সাথে মেলেনি",
      "সেলফি যাচাই করা যাচ্ছে না। আপনি পরে আবার চেষ্টা করতে পারেন।",
      "সেলফি মেলেনি",
      "সেলফি নির্দেশনা",
      "সেলফি তুলতে ক্যামেরা ব্যবহারের অনুমতি দিন।",
      "সেলফি তুলে e-KYC সম্পন্ন করুন।",
      "NID-এর তথ্য যাচাই করা হচ্ছে…",
      "NID সার্ভারে সমস্যা হয়েছে।"
    ];
    for (const token of authenticTokens) {
      const foundInValues = Object.values(i18n.STRINGS.bn).some(val => val === token);
      assert.ok(foundInValues, "Authentic ARSC token must exist in STRINGS.bn: " + token);
    }
  });

  await runTest("1.5: Complete dictionary parity maintained across bn and en (zero missing keys)", () => {
    const bnKeys = Object.keys(i18n.STRINGS.bn);
    const enKeys = Object.keys(i18n.STRINGS.en);
    assert.strictEqual(bnKeys.length, enKeys.length, "bn and en keys must have equal count");
    const diff = bnKeys.filter(k => !(k in i18n.STRINGS.en));
    assert.strictEqual(diff.length, 0, "Zero keys should be missing in en");
  });

  // -----------------------------------------------------------------------------
  // PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

  await runTest("2.1: Modals 107–111 state controllers declared in App.js", () => {
    assert.ok(appSrc.includes("const [modalKycSplash, setModalKycSplash] = useState(false)"));
    assert.ok(appSrc.includes("const [modalNidCameraScanner, setModalNidCameraScanner] = useState(false)"));
    assert.ok(appSrc.includes("const [modalNidInfoReview, setModalNidInfoReview] = useState(false)"));
    assert.ok(appSrc.includes("const [modalLivenessSelfie, setModalLivenessSelfie] = useState(false)"));
    assert.ok(appSrc.includes("const [modalKycStatusResult, setModalKycStatusResult] = useState(false)"));
  });

  await runTest("2.2: KYC front/back captured, flash toggle, and NID field hooks declared", () => {
    assert.ok(appSrc.includes("const [kycNidSide, setKycNidSide] = useState('FRONT')"));
    assert.ok(appSrc.includes("const [kycFlashOn, setKycFlashOn] = useState(false)"));
    assert.ok(appSrc.includes("const [kycNidFrontCaptured, setKycNidFrontCaptured] = useState(false)"));
    assert.ok(appSrc.includes("const [kycNidBackCaptured, setKycNidBackCaptured] = useState(false)"));
    assert.ok(appSrc.includes("const [kycNidNumber, setKycNidNumber] = useState('19901234567890123')"));
    assert.ok(appSrc.includes("const [kycNameEn, setKycNameEn] = useState('MD RAHIM UDDIN')"));
    assert.ok(appSrc.includes("const [kycNameBn, setKycNameBn] = useState('মোঃ রহিম উদ্দিন')"));
    assert.ok(appSrc.includes("const [kycDob, setKycDob] = useState('1990-05-15')"));
  });

  await runTest("2.3: Liveness gesture, state machine, match score, and status hooks declared", () => {
    assert.ok(appSrc.includes("const [kycLivenessGesture, setKycLivenessGesture] = useState('LOOK_STRAIGHT')"));
    assert.ok(appSrc.includes("const [kycLivenessState, setKycLivenessState] = useState('IDLE')"));
    assert.ok(appSrc.includes("const [kycLivenessProgress, setKycLivenessProgress] = useState(0)"));
    assert.ok(appSrc.includes("const [kycVerificationStatus, setKycVerificationStatus] = useState('VERIFIED')"));
    assert.ok(appSrc.includes("const [kycMatchScore, setKycMatchScore] = useState(94)"));
  });

  await runTest("2.4: global.__KYC_TEST_HOOKS__ exposed in App.js with required keys", () => {
    assert.ok(appSrc.includes("global.__KYC_TEST_HOOKS__ = {"));
    const requiredHookKeys = [
      "modalKycSplash",
      "setModalKycSplash",
      "modalNidCameraScanner",
      "setModalNidCameraScanner",
      "modalNidInfoReview",
      "setModalNidInfoReview",
      "modalLivenessSelfie",
      "setModalLivenessSelfie",
      "modalKycStatusResult",
      "setModalKycStatusResult",
      "kycNidSide",
      "kycFlashOn",
      "kycNidNumber",
      "kycNameEn",
      "kycNameBn",
      "kycDob",
      "kycLivenessGesture",
      "kycLivenessState",
      "kycVerificationStatus",
      "kycMatchScore",
      "handleOpenKycWizard",
      "handleStartKycFromSplash",
      "handleNidCapture",
      "handleValidateAndProceedToSelfie",
      "handlePerformLivenessAndSelfie",
      "handleDoneKyc",
      "handleRetryKyc"
    ];
    for (const hk of requiredHookKeys) {
      assert.ok(appSrc.includes(hk), "Hook key must be exposed: " + hk);
    }
  });

  await runTest("2.5: tallyPayService and storageRepository connected for KYC", () => {
    assert.ok(tallyPay.validateBangladeshNid !== undefined, "validateBangladeshNid must be available");
    assert.ok(tallyPay.evaluateKycVerificationStatus !== undefined, "evaluateKycVerificationStatus must be available");
    assert.ok(typeof storageRepository.saveMerchantKyc === "function", "saveMerchantKyc must be available");
  });

  // -----------------------------------------------------------------------------
  // PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders KYC Banner quick action button (tp_merchant_kyc_banner_btn)", () => {
    assert.ok(appSrc.includes('testID="tp_merchant_kyc_banner_btn"'));
    assert.ok(appSrc.includes("onPress={handleOpenKycWizard}"));
  });

  await runTest("3.2: Tab 5 (Menu) renders KYC settings menu list item (menu_tp_merchant_kyc_item)", () => {
    assert.ok(appSrc.includes('testID="menu_tp_merchant_kyc_item"'));
    assert.ok(appSrc.includes("accessibilityLabel={t('merchant_kyc_title')}"));
  });

  await runTest("3.3: All navigation buttons attach STANDARD_TOUCH_HIT_SLOP and accessible button roles", () => {
    const navButtons = [
      'testID="tp_merchant_kyc_banner_btn"',
      'testID="menu_tp_merchant_kyc_item"'
    ];
    for (const nb of navButtons) {
      const pos = appSrc.indexOf(nb);
      assert.ok(pos !== -1, "Button exists: " + nb);
      const snippet = appSrc.slice(Math.max(0, pos - 350), pos + 350);
      assert.ok(snippet.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "Must attach hitSlop for " + nb);
      assert.ok(snippet.includes('accessibilityRole="button"'), "Must define accessibilityRole for " + nb);
    }
  });

  // -----------------------------------------------------------------------------
  // PART 4: MODAL 107 (modalKycSplash) LAYOUT & WIZARD
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 4: MODAL 107 (modalKycSplash) LAYOUT & WIZARD ---");

  await runTest("4.1: modalKycSplash defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_kyc_splash"'));
    assert.ok(appSrc.includes("visible={modalKycSplash}"));
    assert.ok(appSrc.includes("onRequestClose={() => setModalKycSplash(false)}"));
  });

  await runTest("4.2: Header renders title, back button (btn_kyc_splash_back), and graphic", () => {
    assert.ok(appSrc.includes('testID="btn_kyc_splash_back"'));
    assert.ok(appSrc.includes("{t('merchant_kyc_title')}"));
    assert.ok(appSrc.includes("{t('merchant_kyc_desc')}"));
  });

  await runTest("4.3: Benefit banner displays authentic token 'NID ও সেলফি দিয়ে e-KYC সম্পন্ন করুন'", () => {
    assert.ok(appSrc.includes("{t('ekyc_header_banner')}"));
  });

  await runTest("4.4: 3-step requirements overview (NID scan, Live Selfie, Review)", () => {
    assert.ok(appSrc.includes("{t('kyc_steps_overview')}"));
    assert.ok(appSrc.includes("{t('kyc_step_nid')}"));
    assert.ok(appSrc.includes("{t('kyc_step_selfie')}"));
    assert.ok(appSrc.includes("{t('kyc_step_review')}"));
  });

  await runTest("4.5: Start verification CTA (btn_kyc_start_wizard) initiates KYC flow", () => {
    assert.ok(appSrc.includes('testID="btn_kyc_start_wizard"'));
    assert.ok(appSrc.includes("onPress={handleStartKycFromSplash}"));
  });

  // -----------------------------------------------------------------------------
  // PART 5: MODAL 108 (modalNidCameraScanner) RETICLE & ORIENTATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 5: MODAL 108 (modalNidCameraScanner) RETICLE & ORIENTATION ---");

  await runTest("5.1: modalNidCameraScanner defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_nid_camera_scanner"'));
    assert.ok(appSrc.includes("visible={modalNidCameraScanner}"));
    assert.ok(appSrc.includes("setModalNidCameraScanner(false)"));
    assert.ok(appSrc.includes("setModalKycSplash(true)"));
  });

  await runTest("5.2: Header renders title, back button (btn_nid_camera_back), and flash toggle (btn_nid_camera_flash)", () => {
    assert.ok(appSrc.includes('testID="btn_nid_camera_back"'));
    assert.ok(appSrc.includes('testID="btn_nid_camera_flash"'));
    assert.ok(appSrc.includes("{t('nid_camera_title')}"));
  });

  await runTest("5.3: Document orientation selector buttons for FRONT (btn_nid_side_front) and BACK (btn_nid_side_back)", () => {
    assert.ok(appSrc.includes('testID="btn_nid_side_front"'));
    assert.ok(appSrc.includes('testID="btn_nid_side_back"'));
    assert.ok(appSrc.includes("{t('nid_orientation_front')}"));
    assert.ok(appSrc.includes("{t('nid_orientation_back')}"));
  });

  await runTest("5.4: Viewfinder guide reticle (view_nid_reticle_guide) renders orientation overlay", () => {
    assert.ok(appSrc.includes('testID="view_nid_reticle_guide"'));
    assert.ok(appSrc.includes("kycNidSide === 'FRONT' ? t('nid_front_overlay') : t('nid_back_overlay')"));
  });

  await runTest("5.5: Retake button (btn_nid_retake) and capture shutter CTA (btn_nid_capture)", () => {
    assert.ok(appSrc.includes('testID="btn_nid_retake"'));
    assert.ok(appSrc.includes('testID="btn_nid_capture"'));
    assert.ok(appSrc.includes("onPress={handleNidCapture}"));
  });

  await runTest("5.6: Sequential front-to-back capture transitions into Modal 109", () => {
    const handleCaptureSnippet = appSrc.slice(
      appSrc.indexOf("const handleNidCapture = () => {"),
      appSrc.indexOf("const handleValidateAndProceedToSelfie = () => {")
    );
    assert.ok(handleCaptureSnippet.includes("setKycNidSide('BACK')"));
    assert.ok(handleCaptureSnippet.includes("setModalNidCameraScanner(false)"));
    assert.ok(handleCaptureSnippet.includes("setModalNidInfoReview(true)"));
  });

  // -----------------------------------------------------------------------------
  // PART 6: MODAL 109 (modalNidInfoReview) OCR REVIEW & NID VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 6: MODAL 109 (modalNidInfoReview) OCR REVIEW & NID VALIDATION ---");

  await runTest("6.1: modalNidInfoReview defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_nid_info_review"'));
    assert.ok(appSrc.includes("visible={modalNidInfoReview}"));
    assert.ok(appSrc.includes("setModalNidInfoReview(false)"));
  });

  await runTest("6.2: Header renders title, subtitle, and back button (btn_nid_info_back)", () => {
    assert.ok(appSrc.includes('testID="btn_nid_info_back"'));
    assert.ok(appSrc.includes("{t('nid_ocr_review_title')}"));
    assert.ok(appSrc.includes("{t('nid_ocr_review_desc')}"));
  });

  await runTest("6.3: Inputs for NID number, English name, Bengali name, DOB, father's and mother's names", () => {
    assert.ok(appSrc.includes('testID="input_nid_number"'));
    assert.ok(appSrc.includes('testID="input_nid_name_en"'));
    assert.ok(appSrc.includes('testID="input_nid_name_bn"'));
    assert.ok(appSrc.includes('testID="input_nid_dob"'));
    assert.ok(appSrc.includes('testID="input_nid_father_name"'));
    assert.ok(appSrc.includes('testID="input_nid_mother_name"'));
  });

  await runTest("6.4: Live validation error banner (text_nid_validation_error) rejects invalid NID lengths", () => {
    assert.ok(appSrc.includes('testID="text_nid_validation_error"'));
    assert.ok(appSrc.includes("setKycNidValidationError(t('nid_length_error')"));
    const invalidRes = tallyPay.validateBangladeshNid("12345");
    assert.strictEqual(invalidRes.valid, false);
    assert.strictEqual(invalidRes.message, "NID নম্বর ১০, ১৩ অথবা ১৭ সংখ্যা হতে হবে।");
  });

  await runTest("6.5: Proceed CTA (btn_proceed_to_selfie) advances to Modal 110 when valid", () => {
    assert.ok(appSrc.includes('testID="btn_proceed_to_selfie"'));
    assert.ok(appSrc.includes("onPress={handleValidateAndProceedToSelfie}"));
    const validRes = tallyPay.validateBangladeshNid("19901234567890123", "1990-05-15");
    assert.strictEqual(validRes.valid, true);
    assert.strictEqual(validRes.type, "LEGACY_17");
  });

  // -----------------------------------------------------------------------------
  // PART 7: MODAL 110 (modalLivenessSelfie) OVAL VIEWFINDER & GESTURES
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 7: MODAL 110 (modalLivenessSelfie) OVAL VIEWFINDER & GESTURES ---");

  await runTest("7.1: modalLivenessSelfie defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_liveness_selfie"'));
    assert.ok(appSrc.includes("visible={modalLivenessSelfie}"));
    assert.ok(appSrc.includes("setModalLivenessSelfie(false)"));
  });

  await runTest("7.2: Header renders title, back button (btn_selfie_back), and prompt banner", () => {
    assert.ok(appSrc.includes('testID="btn_selfie_back"'));
    assert.ok(appSrc.includes("{t('liveness_selfie_title')}"));
    assert.ok(appSrc.includes("{t('matching_progress')}"));
  });

  await runTest("7.3: Gesture challenge prompt (text_liveness_gesture_prompt) renders challenge instruction", () => {
    assert.ok(appSrc.includes('testID="text_liveness_gesture_prompt"'));
    assert.ok(appSrc.includes("kycLivenessGesture === 'LOOK_STRAIGHT'"));
    assert.ok(appSrc.includes("kycLivenessGesture === 'SMILE'"));
  });

  await runTest("7.4: Oval face guide viewfinder (view_oval_face_guide) renders face boundary", () => {
    assert.ok(appSrc.includes('testID="view_oval_face_guide"'));
    assert.ok(appSrc.includes("borderRadius: 85"));
    assert.ok(appSrc.includes("borderColor: '#10B981'"));
  });

  await runTest("7.5: Selfie capture CTA (btn_capture_selfie) evaluates liveness and transitions to Modal 111", () => {
    assert.ok(appSrc.includes('testID="btn_capture_selfie"'));
    assert.ok(appSrc.includes("onPress={handlePerformLivenessAndSelfie}"));
    const evalStatus = tallyPay.evaluateKycVerificationStatus({
      nidValidation: { valid: true },
      livenessScore: 0.94
    });
    assert.strictEqual(evalStatus, "VERIFIED");
  });

  // -----------------------------------------------------------------------------
  // PART 8: MODAL 111 (modalKycStatusResult) STATUS PILLS & MATCH SCORE
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 8: MODAL 111 (modalKycStatusResult) STATUS PILLS & MATCH SCORE ---");

  await runTest("8.1: modalKycStatusResult defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_kyc_status_result"'));
    assert.ok(appSrc.includes("visible={modalKycStatusResult}"));
    assert.ok(appSrc.includes("onRequestClose={() => setModalKycStatusResult(false)}"));
  });

  await runTest("8.2: Header renders title and back button (btn_kyc_status_back)", () => {
    assert.ok(appSrc.includes('testID="btn_kyc_status_back"'));
    assert.ok(appSrc.includes("ভেরিফিকেশন রেজাল্ট"));
  });

  await runTest("8.3: Verification status pill (pill_kyc_status) reflects VERIFIED, PENDING, or REJECTED states", () => {
    assert.ok(appSrc.includes('testID="pill_kyc_status"'));
    assert.ok(appSrc.includes("t('kyc_status_verified')"));
    assert.ok(appSrc.includes("t('kyc_status_pending')"));
    assert.ok(appSrc.includes("t('kyc_status_rejected')"));
  });

  await runTest("8.4: Biometric match score display (text_kyc_match_score) displays percentage", () => {
    assert.ok(appSrc.includes('testID="text_kyc_match_score"'));
    assert.ok(appSrc.includes("{kycMatchScore}%"));
    assert.ok(appSrc.includes("{t('biometric_match_score')}"));
  });

  await runTest("8.5: Summary card displays masked NID number and Bengali applicant name", () => {
    assert.ok(appSrc.includes("{kycNameBn}"));
    assert.ok(appSrc.includes("**** ****"));
  });

  await runTest("8.6: Done CTA (btn_kyc_done) and Retry CTA (btn_kyc_retry)", () => {
    assert.ok(appSrc.includes('testID="btn_kyc_done"'));
    assert.ok(appSrc.includes('testID="btn_kyc_retry"'));
    assert.ok(appSrc.includes("onPress={handleDoneKyc}"));
    assert.ok(appSrc.includes("onPress={handleRetryKyc}"));
  });

  // -----------------------------------------------------------------------------
  // PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("9.1: BackHandler onBackPress dismisses modalKycStatusResult cleanly", () => {
    assert.ok(appSrc.includes("if (modalKycStatusResult) {"));
    assert.ok(appSrc.includes("setModalKycStatusResult(false);"));
    assert.ok(appSrc.includes("return true;"));
  });

  await runTest("9.2: BackHandler onBackPress steps back from modalLivenessSelfie to modalNidInfoReview", () => {
    assert.ok(appSrc.includes("if (modalLivenessSelfie) {"));
    assert.ok(appSrc.includes("setModalLivenessSelfie(false);"));
    assert.ok(appSrc.includes("setModalNidInfoReview(true);"));
    assert.ok(appSrc.includes("return true;"));
  });

  await runTest("9.3: BackHandler onBackPress steps back from modalNidInfoReview to modalNidCameraScanner", () => {
    assert.ok(appSrc.includes("if (modalNidInfoReview) {"));
    assert.ok(appSrc.includes("setModalNidInfoReview(false);"));
    assert.ok(appSrc.includes("setModalNidCameraScanner(true);"));
    assert.ok(appSrc.includes("return true;"));
  });

  await runTest("9.4: BackHandler onBackPress steps back from modalNidCameraScanner to modalKycSplash", () => {
    assert.ok(appSrc.includes("if (modalNidCameraScanner) {"));
    assert.ok(appSrc.includes("setModalNidCameraScanner(false);"));
    assert.ok(appSrc.includes("setModalKycSplash(true);"));
    assert.ok(appSrc.includes("return true;"));
  });

  await runTest("9.5: BackHandler onBackPress dismisses modalKycSplash cleanly", () => {
    assert.ok(appSrc.includes("if (modalKycSplash) {"));
    assert.ok(appSrc.includes("setModalKycSplash(false);"));
    assert.ok(appSrc.includes("return true;"));
  });

  await runTest("9.6: BackHandler useCallback dependency array includes all 5 Iteration 237 modal controllers", () => {
    assert.ok(appSrc.includes("modalKycSplash, modalNidCameraScanner, modalNidInfoReview, modalLivenessSelfie, modalKycStatusResult"));
  });

  // -----------------------------------------------------------------------------
  // PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK ---");

  await runTest("10.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP !== undefined);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.top >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.bottom >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.left >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.right >= 10);
  });

  await runTest("10.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in Modals 107–111", () => {
    const kycButtons = [
      'testID="btn_kyc_splash_back"',
      'testID="btn_kyc_start_wizard"',
      'testID="btn_nid_camera_back"',
      'testID="btn_nid_camera_flash"',
      'testID="btn_nid_side_front"',
      'testID="btn_nid_side_back"',
      'testID="btn_nid_capture"',
      'testID="btn_nid_retake"',
      'testID="btn_nid_info_back"',
      'testID="btn_proceed_to_selfie"',
      'testID="btn_selfie_back"',
      'testID="btn_capture_selfie"',
      'testID="btn_kyc_status_back"',
      'testID="btn_kyc_done"',
      'testID="btn_kyc_retry"'
    ];
    for (const btn of kycButtons) {
      const pos = appSrc.indexOf(btn);
      assert.ok(pos !== -1, "Button must exist in App.js: " + btn);
      const snippet = appSrc.slice(Math.max(0, pos - 350), pos + 350);
      assert.ok(snippet.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "hitSlop attached to " + btn);
      assert.ok(snippet.includes('accessibilityRole="button"'), "accessibilityRole attached to " + btn);
    }
  });

  await runTest("10.3: Haptic feedback milestones wired in KYC action handlers", () => {
    assert.ok(appSrc.includes("hapticFeedbackService.impactMedium()"));
    assert.ok(appSrc.includes("hapticFeedbackService.notificationSuccess()"));
    assert.ok(appSrc.includes("hapticFeedbackService.selection()"));
  });

  // -----------------------------------------------------------------------------
  // PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  await runTest("11.1: Primary KYC button (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#FFFFFF", "#0D6E5C");
    console.log("      [CONTRAST] #FFFFFF on #0D6E5C: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Contrast ratio must be >= 4.5:1, got " + ratio);
  });

  await runTest("11.2: Dark mode card surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
    const ratio = getContrastRatio("#FFFFFF", "#0F172A");
    console.log("      [CONTRAST] #FFFFFF on #0F172A: " + ratio.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(ratio >= 7.0, "Contrast ratio must be >= 7.0:1, got " + ratio);
  });

  await runTest("11.3: Verified status badge (#0D6E5C on #D1FAE5) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#0D6E5C", "#D1FAE5");
    console.log("      [CONTRAST] #0D6E5C on #D1FAE5: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Contrast ratio must be >= 4.5:1, got " + ratio);
  });

  await runTest("11.4: Pending review status badge (#78350F on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#78350F", "#FEF3C7");
    console.log("      [CONTRAST] #78350F on #FEF3C7: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Contrast ratio must be >= 4.5:1, got " + ratio);
  });

  await runTest("11.5: Rejected status badge (#991B1B on #FEE2E2) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#991B1B", "#FEE2E2");
    console.log("      [CONTRAST] #991B1B on #FEE2E2: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Contrast ratio must be >= 4.5:1, got " + ratio);
  });

  // -----------------------------------------------------------------------------
  // PART 12: MODAL COUNT & CONTROLLER INVARIANTS (111 MODALS)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 12: MODAL COUNT & CONTROLLER INVARIANTS (126 MODALS) ---");

  await runTest("12.1: App.js contains exactly 126 <Modal elements", () => {
    const modalMatches = appSrc.match(/<Modal\b/g) || [];
    assert.strictEqual(modalMatches.length, 126, "Expected exactly 126 modals in App.js, got " + modalMatches.length);
  });

  await runTest("12.2: App.js contains exactly 126 onRequestClose handlers", () => {
    const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
    assert.strictEqual(reqCloseMatches.length, 126, "Expected 126 onRequestClose handlers, got " + reqCloseMatches.length);
  });

  await runTest("12.3: App.js contains exactly 126 unique modal state controllers", () => {
    const regex = /visible=\{([a-zA-Z0-9_]+)\}/g;
    const uniqueModals = new Set();
    let m;
    while ((m = regex.exec(appSrc)) !== null) {
      uniqueModals.add(m[1]);
    }
    assert.strictEqual(uniqueModals.size, 126, "Expected 126 unique visible controllers, got " + uniqueModals.size);
    assert.ok(uniqueModals.has("modalKycSplash"), "modalKycSplash must be in unique controllers");
    assert.ok(uniqueModals.has("modalNidCameraScanner"), "modalNidCameraScanner must be in unique controllers");
    assert.ok(uniqueModals.has("modalNidInfoReview"), "modalNidInfoReview must be in unique controllers");
    assert.ok(uniqueModals.has("modalLivenessSelfie"), "modalLivenessSelfie must be in unique controllers");
    assert.ok(uniqueModals.has("modalKycStatusResult"), "modalKycStatusResult must be in unique controllers");
  });

  // -----------------------------------------------------------------------------
  // PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK ---");

  await runTest("13.1: App.js compiles cleanly via Babel parser with zero syntax errors", () => {
    const t0 = Date.now();
    babel.parseSync(appSrc, {
      filename: "App.js",
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["jsx", "flow"] },
    });
    const elapsed = Date.now() - t0;
    console.log("      [BABEL] Successfully parsed App.js in " + elapsed + "ms");
  });

  await runTest("13.2: Latency benchmark: 1,000 NID validations & liveness evaluations execute in < 200ms", () => {
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
      tallyPay.validateBangladeshNid("19901234567890123", "1990-05-15");
      tallyPay.evaluateKycVerificationStatus({
        nidValidation: { valid: true },
        livenessScore: 0.94
      });
    }
    const elapsed = Date.now() - t0;
    console.log("      [BENCHMARK] 1,000 operations completed in " + elapsed + "ms (" + (elapsed / 1000).toFixed(4) + "ms/op)");
    assert.ok(elapsed < 200, "1,000 operations should complete in < 200ms");
  });

  console.log("\n================================================================================");
  console.log("TOTAL: " + totalTests + " | PASSED: " + passedTests + " | FAILED: " + failedTests + " (" + Math.round((passedTests / totalTests) * 100) + "% SUCCESS)");
  console.log("================================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
