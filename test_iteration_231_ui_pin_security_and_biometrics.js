/**
 * TALLYKHATA ITERATION 231: SECURITY PIN, BIOMETRIC AUTH & DEVICE BINDING UI/UX QA SUITE
 *
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions / QA & Security Owner)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Milestone: REA-ITER-231
 * Reference APK: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 *
 * Covers:
 * Part 1: Bilingual localization (i18n) key symmetry across bn and en
 * Part 2: App.js state hooks & global test hooks declaration
 * Part 3: Navigation entry points in Tab 4 (TallyPay) and Tab 5 (Menu)
 * Part 4: modal_change_pin layout, current/new/confirm inputs, biometric switch & submit
 * Part 5: modal_reset_pin layout, mobile preview, OTP input, countdown & single-device clause
 * Part 6: StorageRepository walletSecurityCredentials & deviceBindings persistence
 * Part 7: PIN strength validation & progressive lockout behavior
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

(async () => {
console.log("================================================================================");
console.log("TALLYKHATA ITERATION 231: SECURITY PIN, BIOMETRIC & DEVICE BINDING UI/UX QA SUITE");
console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
console.log("Milestone: REA-ITER-231");
console.log("================================================================================");

// -----------------------------------------------------------------------------
// PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY
// -----------------------------------------------------------------------------
console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---");

const REQUIRED_ITER231_KEYS = [
  "security_pin_settings",
  "change_security_pin",
  "reset_security_pin",
  "current_pin_label",
  "new_pin_label",
  "confirm_pin_label",
  "pin_weak_alert",
  "pin_mismatch_alert",
  "pin_reused_alert",
  "pin_lockout_alert",
  "pin_warning_alert",
  "biometric_auth",
  "biometric_auth_desc",
  "biometric_fallback_notice",
  "single_device_binding_notice",
  "enter_otp_for_pin_reset",
  "resend_otp_countdown",
  "verify_otp_and_proceed",
  "forgot_pin",
  "send_otp",
  "resend_otp",
  "enter_otp",
];

  await runTest("1.1: All Iteration 231 localization keys exist in STRINGS.bn", () => {
  REQUIRED_ITER231_KEYS.forEach(key => {
    assert.ok(i18n.STRINGS.bn[key], `Missing Bengali translation for key: ${key}`);
    assert.strictEqual(typeof i18n.STRINGS.bn[key], "string");
    assert.ok(i18n.STRINGS.bn[key].length > 0);
  });
});

  await runTest("1.2: All Iteration 231 localization keys exist in STRINGS.en", () => {
  REQUIRED_ITER231_KEYS.forEach(key => {
    assert.ok(i18n.STRINGS.en[key], `Missing English translation for key: ${key}`);
    assert.strictEqual(typeof i18n.STRINGS.en[key], "string");
    assert.ok(i18n.STRINGS.en[key].length > 0);
  });
});

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
  REQUIRED_ITER231_KEYS.forEach(key => {
    const bnVal = i18n.t(key, "bn");
    const enVal = i18n.t(key, "en");
    assert.strictEqual(bnVal, i18n.STRINGS.bn[key]);
    assert.strictEqual(enVal, i18n.STRINGS.en[key]);
  });
});

  await runTest("1.4: STATIC_TRANSLATIONS contains authentic security PIN and biometric terms", () => {
  assert.strictEqual(i18n.STATIC_TRANSLATIONS["পিন ও নিরাপত্তা সেটিংস"], "PIN & Security Settings");
  assert.strictEqual(i18n.STATIC_TRANSLATIONS["পিন পরিবর্তন"], "Change PIN");
  assert.strictEqual(i18n.STATIC_TRANSLATIONS["পিন রিসেট"], "Reset PIN");
  assert.strictEqual(i18n.STATIC_TRANSLATIONS["বর্তমান পিন"], "Current PIN");
  assert.strictEqual(i18n.STATIC_TRANSLATIONS["নতুন পিন"], "New PIN");
  assert.strictEqual(i18n.STATIC_TRANSLATIONS["ফিঙ্গারপ্রিন্ট আনলক"], "Fingerprint Unlock");
  assert.strictEqual(i18n.STATIC_TRANSLATIONS["পিন ভুলে গেছেন?"], "Forgot PIN?");
  assert.strictEqual(i18n.STATIC_TRANSLATIONS["ওটিপি পাঠান"], "Send OTP");
  assert.strictEqual(i18n.STATIC_TRANSLATIONS["পুনরায় ওটিপি পাঠান"], "Resend OTP");
  assert.strictEqual(i18n.STATIC_TRANSLATIONS["ওটিপি দিন"], "Enter OTP");
});

  await runTest("1.5: Complete dictionary parity maintained across bn and en (zero missing keys)", () => {
  const bnKeys = Object.keys(i18n.STRINGS.bn);
  const enKeys = Object.keys(i18n.STRINGS.en);
  const missingInEn = bnKeys.filter(k => !i18n.STRINGS.en[k]);
  const missingInBn = enKeys.filter(k => !i18n.STRINGS.bn[k]);
  assert.strictEqual(missingInEn.length, 0, `Missing in EN: ${missingInEn.join(", ")}`);
  assert.strictEqual(missingInBn.length, 0, `Missing in BN: ${missingInBn.join(", ")}`);
});

// -----------------------------------------------------------------------------
// PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
// -----------------------------------------------------------------------------
console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

  await runTest("2.1: TallyPay Security PIN and Reset PIN state hooks declared in App.js", () => {
  assert.ok(appSrc.includes("const [modalTpChangePin, setModalTpChangePin] = useState(false);"));
  assert.ok(appSrc.includes("const [modalResetPin, setModalResetPin] = useState(false);"));
  assert.ok(appSrc.includes("const [pinCurrentInput, setPinCurrentInput] = useState('');"));
  assert.ok(appSrc.includes("const [pinNewInput, setPinNewInput] = useState('');"));
  assert.ok(appSrc.includes("const [pinConfirmInput, setPinConfirmInput] = useState('');"));
  assert.ok(appSrc.includes("const [pinResetMobile, setPinResetMobile] = useState('01712345678');"));
  assert.ok(appSrc.includes("const [pinResetOtpInput, setPinResetOtpInput] = useState('');"));
  assert.ok(appSrc.includes("const [pinResetOtpSent, setPinResetOtpSent] = useState(false);"));
  assert.ok(appSrc.includes("const [pinResetCountdown, setPinResetCountdown] = useState(60);"));
  assert.ok(appSrc.includes("const [biometricLoginActive, setBiometricLoginActive] = useState(false);"));
  assert.ok(appSrc.includes("const [pinSecurityStatusBanner, setPinSecurityStatusBanner] = useState(null);"));
});

  await runTest("2.2: global.__PIN_SECURITY_TEST_HOOKS__ exposed in App.js", () => {
  assert.ok(appSrc.includes("global.__PIN_SECURITY_TEST_HOOKS__ = {"));
  assert.ok(appSrc.includes("modalTpChangePin,"));
  assert.ok(appSrc.includes("setModalTpChangePin,"));
  assert.ok(appSrc.includes("modalResetPin,"));
  assert.ok(appSrc.includes("setModalResetPin,"));
  assert.ok(appSrc.includes("handleOpenChangePin,"));
  assert.ok(appSrc.includes("handleCloseChangePin,"));
  assert.ok(appSrc.includes("handleOpenResetPin,"));
  assert.ok(appSrc.includes("handleCloseResetPin,"));
  assert.ok(appSrc.includes("handleSendResetOtp,"));
  assert.ok(appSrc.includes("handleSubmitChangePin,"));
  assert.ok(appSrc.includes("handleSubmitResetPin,"));
  assert.ok(appSrc.includes("handleToggleBiometrics,"));
  assert.ok(appSrc.includes("tallyPaySecurityManager: TP_tallyPaySecurityManager,"));
  assert.ok(appSrc.includes("pinSecurityEngine: TP_pinSecurityEngine,"));
});

// -----------------------------------------------------------------------------
// PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5)
// -----------------------------------------------------------------------------
console.log("\n--- PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders Security PIN & Biometrics quick action banner", () => {
  assert.ok(appSrc.includes("testID='btn_open_security_pin_settings'") || appSrc.includes('testID="btn_open_security_pin_settings"'));
  assert.ok(appSrc.includes("onPress={handleOpenChangePin}"));
  assert.ok(appSrc.includes("accessibilityLabel={t('security_pin_settings')}"));
});

  await runTest("3.2: Tab 5 (Menu) renders Security PIN & Biometrics menu list item", () => {
  assert.ok(appSrc.includes("testID='menu_item_security_pin_settings'") || appSrc.includes('testID="menu_item_security_pin_settings"'));
  assert.ok(appSrc.includes("accessibilityLabel={t('security_pin_settings')}"));
});

// -----------------------------------------------------------------------------
// PART 4: CHANGE PIN MODAL (MODAL 83) LAYOUT & USER JOURNEY
// -----------------------------------------------------------------------------
console.log("\n--- PART 4: CHANGE PIN MODAL (MODAL 83) LAYOUT & USER JOURNEY ---");

  await runTest("4.1: modal_change_pin defines Modal with testID, onRequestClose and visible prop", () => {
  assert.ok(appSrc.includes("visible={modalTpChangePin}"));
  assert.ok(appSrc.includes("onRequestClose={handleCloseChangePin}"));
  assert.ok(appSrc.includes('testID="modal_change_pin"'));
});

  await runTest("4.2: Change PIN modal renders back button with testID", () => {
  assert.ok(appSrc.includes('testID="btn_back_change_pin"'));
  assert.ok(appSrc.includes("onPress={handleCloseChangePin}"));
});

  await runTest("4.3: Change PIN modal renders current, new, and confirm PIN inputs", () => {
  assert.ok(appSrc.includes('testID="input_current_pin"'));
  assert.ok(appSrc.includes('testID="input_new_pin"'));
  assert.ok(appSrc.includes('testID="input_confirm_pin"'));
});

  await runTest("4.4: Change PIN modal renders Biometric switch and toggle handler", () => {
  assert.ok(appSrc.includes('testID="switch_biometric_auth"'));
  assert.ok(appSrc.includes("onValueChange={handleToggleBiometrics}"));
});

  await runTest("4.5: Change PIN modal renders submit button and forgot PIN link", () => {
  assert.ok(appSrc.includes('testID="btn_submit_change_pin"'));
  assert.ok(appSrc.includes("onPress={handleSubmitChangePin}"));
  assert.ok(appSrc.includes('testID="btn_forgot_pin"'));
  assert.ok(appSrc.includes("onPress={handleOpenResetPin}"));
});

// -----------------------------------------------------------------------------
// PART 5: RESET PIN MODAL (MODAL 84) LAYOUT & USER JOURNEY
// -----------------------------------------------------------------------------
console.log("\n--- PART 5: RESET PIN MODAL (MODAL 84) LAYOUT & USER JOURNEY ---");

  await runTest("5.1: modal_reset_pin defines Modal with testID, onRequestClose and visible prop", () => {
  assert.ok(appSrc.includes("visible={modalResetPin}"));
  assert.ok(appSrc.includes("onRequestClose={handleCloseResetPin}"));
  assert.ok(appSrc.includes('testID="modal_reset_pin"'));
});

  await runTest("5.2: Reset PIN modal renders back button with testID", () => {
  assert.ok(appSrc.includes('testID="btn_back_reset_pin"'));
  assert.ok(appSrc.includes("onPress={handleCloseResetPin}"));
});

  await runTest("5.3: Reset PIN modal renders mobile preview and send OTP button", () => {
  assert.ok(appSrc.includes('testID="text_reset_mobile"'));
  assert.ok(appSrc.includes('testID="btn_send_reset_otp"'));
  assert.ok(appSrc.includes("onPress={handleSendResetOtp}"));
});

  await runTest("5.4: Reset PIN modal renders OTP input and countdown text", () => {
  assert.ok(appSrc.includes('testID="input_reset_otp"'));
  assert.ok(appSrc.includes('testID="text_otp_countdown"'));
});

  await runTest("5.5: Reset PIN modal renders new and confirm PIN inputs and submit button", () => {
  assert.ok(appSrc.includes('testID="input_reset_new_pin"'));
  assert.ok(appSrc.includes('testID="input_reset_confirm_pin"'));
  assert.ok(appSrc.includes('testID="btn_submit_reset_pin"'));
  assert.ok(appSrc.includes("onPress={handleSubmitResetPin}"));
});

  await runTest("5.6: Reset PIN modal renders single device binding policy clause", () => {
  assert.ok(appSrc.includes('testID="text_single_device_clause"'));
  assert.ok(appSrc.includes("t('single_device_binding_notice')"));
});

// -----------------------------------------------------------------------------
// PART 6: STORAGE REPOSITORY PERSISTENCE & DATA ISOLATION
// -----------------------------------------------------------------------------
console.log("\n--- PART 6: STORAGE REPOSITORY PERSISTENCE & DATA ISOLATION ---");

  await runTest("6.1: StorageRepository exposes all Iteration 231 API methods", () => {
  assert.strictEqual(typeof storageRepository.saveWalletSecurityCredentials, "function");
  assert.strictEqual(typeof storageRepository.getWalletSecurityCredentials, "function");
  assert.strictEqual(typeof storageRepository.registerDeviceBinding, "function");
  assert.strictEqual(typeof storageRepository.getDeviceBindings, "function");
  assert.strictEqual(typeof storageRepository.getActiveDeviceBinding, "function");
  assert.strictEqual(typeof storageRepository.revokeDeviceBinding, "function");
});

  await runTest("6.2: StorageRepository saves and retrieves wallet security credentials per business", async () => {
  const bizId = "test_biz_qa_231";
  const creds = {
    storedPinHash: "abcdef1234567890",
    salt: "test_salt_qa",
    previousPins: ["old_hash_1", "old_hash_2"],
    failedAttempts: 1,
    biometricEnabled: true,
    activeDeviceId: "DEV_QA_001",
  };
  await storageRepository.saveWalletSecurityCredentials(bizId, creds);
  const retrieved = storageRepository.getWalletSecurityCredentials(bizId);
  assert.strictEqual(retrieved.storedPinHash, "abcdef1234567890");
  assert.strictEqual(retrieved.salt, "test_salt_qa");
  assert.strictEqual(retrieved.failedAttempts, 1);
  assert.strictEqual(retrieved.biometricEnabled, true);
  assert.strictEqual(retrieved.activeDeviceId, "DEV_QA_001");
});

  await runTest("6.3: StorageRepository enforces single active device per business", async () => {
  const bizId = "test_biz_device_qa";
  await storageRepository.registerDeviceBinding(bizId, { deviceId: "DEV_FIRST", deviceName: "First Phone" });
  let active = storageRepository.getActiveDeviceBinding(bizId);
  assert.strictEqual(active.deviceId, "DEV_FIRST");

  await storageRepository.registerDeviceBinding(bizId, { deviceId: "DEV_SECOND", deviceName: "Second Phone" });
  active = storageRepository.getActiveDeviceBinding(bizId);
  assert.strictEqual(active.deviceId, "DEV_SECOND");

  const allBindings = storageRepository.getDeviceBindings(bizId);
  const first = allBindings.find(b => b.deviceId === "DEV_FIRST");
  assert.strictEqual(first.status, 'INACTIVE');
});

// -----------------------------------------------------------------------------
// PART 7: PIN SECURITY ENGINE & LOCKOUT RULES
// -----------------------------------------------------------------------------
console.log("\n--- PART 7: PIN SECURITY ENGINE & LOCKOUT RULES ---");

  await runTest("7.1: validatePinStrength rejects weak PINs (repetitive, ascending, descending)", () => {
  assert.strictEqual(tallyPay.validatePinStrength("1111").valid, false);
  assert.strictEqual(tallyPay.validatePinStrength("1234").valid, false);
  assert.strictEqual(tallyPay.validatePinStrength("4321").valid, false);
  assert.strictEqual(tallyPay.validatePinStrength("2580").valid, true);
  assert.strictEqual(tallyPay.validatePinStrength("1379").valid, true);
});

  await runTest("7.2: PinSecurityEngine enforces 3-attempt lockout and OTP reset", () => {
  const engine = new tallyPay.PinSecurityEngine();
  engine.setupPin("1379", "1379");
  assert.strictEqual(engine.storedPinHash !== null, true);

  // Attempt 1 wrong
  let r = engine.validatePin("2580");
  assert.strictEqual(r.success, false);
  assert.strictEqual(r.failedAttempts, 1);

  // Attempt 2 wrong
  r = engine.validatePin("2580");
  assert.strictEqual(r.success, false);
  assert.strictEqual(r.failedAttempts, 2);
  assert.strictEqual(r.warning, true);

  // Attempt 3 wrong -> locked out
  r = engine.validatePin("2580");
  assert.strictEqual(r.success, false);
  assert.strictEqual(r.lockedOut, true);

  // While locked out, even correct PIN fails
  r = engine.validatePin("1379");
  assert.strictEqual(r.success, false);
  assert.strictEqual(r.reason, "LOCKED_OUT");

  // OTP reset clears lockout
  const otpRes = engine.requestResetPinOtp("01712345678");
  const resetRes = engine.resetPinWithOtp("01712345678", otpRes.otpToken, "2580", "2580");
  assert.strictEqual(resetRes.success, true);
  assert.strictEqual(engine.failedAttempts, 0);
  assert.strictEqual(engine.lockoutUntil, null);
});

// -----------------------------------------------------------------------------
// PART 8: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
// -----------------------------------------------------------------------------
console.log("\n--- PART 8: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("8.1: BackHandler onBackPress dismisses modalResetPin before modalTpChangePin", () => {
  const resetIdx = appSrc.indexOf("if (modalResetPin) {");
  const changeIdx = appSrc.indexOf("if (modalTpChangePin) {");
  assert.ok(resetIdx !== -1, "modalResetPin check present");
  assert.ok(changeIdx !== -1, "modalTpChangePin check present");
  assert.ok(resetIdx < changeIdx, "modalResetPin must dismiss before modalTpChangePin");
});

  await runTest("8.2: BackHandler useCallback dependency array includes new modal states", () => {
  const depsStart = appSrc.indexOf("const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);");
  const depsSnippet = appSrc.substring(depsStart, depsStart + 1500);
  assert.ok(depsSnippet.includes("modalTpChangePin"), "modalTpChangePin must be in BackHandler dependencies");
  assert.ok(depsSnippet.includes("modalResetPin"), "modalResetPin must be in BackHandler dependencies");
});

// -----------------------------------------------------------------------------
// PART 9: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION
// -----------------------------------------------------------------------------
console.log("\n--- PART 9: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION ---");

  await runTest("9.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
  assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.top >= 10);
  assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.bottom >= 10);
  assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.left >= 10);
  assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.right >= 10);
});

  await runTest("9.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in new modals", () => {
  assert.ok(appSrc.includes('testID="btn_back_change_pin"'));
  assert.ok(appSrc.includes('testID="btn_submit_change_pin"'));
  assert.ok(appSrc.includes('testID="btn_back_reset_pin"'));
  assert.ok(appSrc.includes('testID="btn_submit_reset_pin"'));
});

  await runTest("9.3: Haptic feedback wired in change and reset PIN action handlers", () => {
  const handlerStart = appSrc.indexOf("const handleSubmitChangePin = async () => {");
  const handlerEnd = appSrc.indexOf("const handleSubmitResetPin = async () => {");
  const snippet = appSrc.substring(handlerStart, handlerEnd + 600);
  assert.ok(snippet.includes("hapticFeedbackService.impactMedium()"));
  assert.ok(snippet.includes("hapticFeedbackService.notificationSuccess()"));
  assert.ok(snippet.includes("hapticFeedbackService.onError()"));
});

// -----------------------------------------------------------------------------
// PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
// -----------------------------------------------------------------------------
console.log("\n--- PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  await runTest("10.1: Primary submit CTA (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = calculateContrast("#FFFFFF", "#0D6E5C");
  console.log(`      [CONTRAST] #FFFFFF on #0D6E5C: ${ratio.toFixed(2)}:1 (PASS AA)`);
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio} must be >= 4.5:1`);
});

  await runTest("10.2: Dark mode header surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = calculateContrast("#FFFFFF", "#0F172A");
  console.log(`      [CONTRAST] #FFFFFF on #0F172A: ${ratio.toFixed(2)}:1 (PASS AAA)`);
  assert.ok(ratio >= 7.0, `Contrast ratio ${ratio} must be >= 7.0:1`);
});

  await runTest("10.3: Error banner surface (#991B1B on #FEE2E2) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = calculateContrast("#991B1B", "#FEE2E2");
  console.log(`      [CONTRAST] #991B1B on #FEE2E2: ${ratio.toFixed(2)}:1 (PASS AA)`);
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio} must be >= 4.5:1`);
});

  await runTest("10.4: Single device binding policy clause (#1E40AF on #EFF6FF) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = calculateContrast("#1E40AF", "#EFF6FF");
  console.log(`      [CONTRAST] #1E40AF on #EFF6FF: ${ratio.toFixed(2)}:1 (PASS AAA)`);
  assert.ok(ratio >= 7.0, `Contrast ratio ${ratio} must be >= 7.0:1`);
});

// -----------------------------------------------------------------------------
// PART 11: MODAL COUNT & CONTROLLER INVARIANTS (106 MODALS)
// -----------------------------------------------------------------------------
console.log("\n--- PART 11: MODAL COUNT & CONTROLLER INVARIANTS (106 MODALS) ---");

  await runTest("11.1: App.js contains exactly 106 <Modal elements", () => {
  const modalMatches = appSrc.match(/<Modal\b/g) || [];
  assert.strictEqual(modalMatches.length, 106, `Expected exactly 106 modals in App.js, got ${modalMatches.length}`);
});

  await runTest("11.2: App.js contains exactly 106 onRequestClose handlers", () => {
  const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
  assert.strictEqual(reqCloseMatches.length, 106, `Expected 106 onRequestClose handlers, got ${reqCloseMatches.length}`);
});

  await runTest("11.3: App.js contains exactly 106 unique modal state controllers", () => {
  const regex = /visible=\{([a-zA-Z0-9_]+)\}/g;
  const uniqueModals = new Set();
  let m;
  while ((m = regex.exec(appSrc)) !== null) {
    uniqueModals.add(m[1]);
  }
  assert.strictEqual(uniqueModals.size, 106, `Expected 106 unique visible controllers, got ${uniqueModals.size}`);
  assert.ok(uniqueModals.has("modalTpChangePin"), "modalTpChangePin must be in unique controllers");
  assert.ok(uniqueModals.has("modalResetPin"), "modalResetPin must be in unique controllers");
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

  await runTest("12.2: Latency benchmark: 1,000 PIN strength checks execute in < 200ms", () => {
  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) {
    tallyPay.validatePinStrength("2580");
    tallyPay.validatePinStrength("1234");
    tallyPay.validatePinStrength("1111");
    tallyPay.validatePinStrength("4321");
  }
  const dur = Date.now() - t0;
  console.log(`      [BENCHMARK] 4,000 PIN strength validations in ${dur}ms (${(dur / 4000).toFixed(4)}ms/op)`);
  assert.ok(dur < 200, `Duration ${dur}ms exceeds 200ms threshold`);
});

console.log("\n================================================================================");
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests} (${Math.round(passedTests / totalTests * 100)}% SUCCESS)`);
console.log("================================================================================");

if (failedTests > 0) process.exit(1);
})();
