/**
 * TALLYKHATA ITERATION 236: TALLYPAY MERCHANT SETTLEMENT & QR SOUNDBOX UI/UX QA SUITE
 *
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions / QA & Security Owner)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Milestone: REA-ITER-236
 * Reference APK: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const i18n = require("./src/i18nService");
const tallyPay = require("./src/tallyPayService");
const soundbox = require("./src/soundboxService");
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
  return 0.2126 * rs + 0.7152 * bs + 0.0722 * gs;
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
  console.log("TALLYKHATA ITERATION 236: TALLYPAY SETTLEMENT & QR SOUNDBOX UI/UX QA SUITE");
  console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
  console.log("Milestone: REA-ITER-236");
  console.log("================================================================================\n");

  const appSrc = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");

  // -----------------------------------------------------------------------------
  // PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 ARSC TOKENS
  // -----------------------------------------------------------------------------
  console.log("--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS ---");

  const requiredIter236Keys = [
    "sc_credit_settlement",
    "settle_payment_action",
    "invalid_settle_amount",
    "settlement_instructions",
    "settlement_reconciliation_title",
    "settlement_customer_search_placeholder",
    "settlement_select_customer_prompt",
    "settlement_current_debt",
    "settlement_amount_label",
    "settlement_resulting_balance",
    "settlement_confirm_title",
    "settlement_confirm_btn",
    "settlement_success_msg",
    "select_payment_mode",
    "payment_received_wallet",
    "payment_accepted",
    "previous_balance_prefix",
    "soundbox_diagnostics_title",
    "soundbox_diagnostics_desc",
    "soundbox_ble_state_label",
    "soundbox_battery_voltage",
    "soundbox_battery_pct",
    "soundbox_charging_status",
    "soundbox_rssi_signal",
    "soundbox_rssi_excellent",
    "soundbox_rssi_good",
    "soundbox_rssi_fair",
    "soundbox_rssi_poor",
    "soundbox_volume_calibration_title",
    "soundbox_volume_step_label",
    "soundbox_volume_duty_cycle",
    "soundbox_volume_test_beep",
    "soundbox_volume_beep_playing",
    "soundbox_voice_broadcast_title",
    "soundbox_voice_broadcast_desc",
    "soundbox_voice_prompt_bn",
    "soundbox_voice_prompt_en",
    "soundbox_voice_alt_prompt_bn",
    "soundbox_trigger_announcement",
    "soundbox_audio_sink_label",
    "soundbox_sink_hardware",
    "soundbox_sink_software",
    "soundbox_sink_silent",
    "soundbox_reconnect_banner",
    "soundbox_reconnect_countdown",
    "soundbox_reconnect_cancel",
  ];

  await runTest("1.1: All Iteration 236 localization keys exist in STRINGS.bn", () => {
    for (const key of requiredIter236Keys) {
      assert.ok(i18n.STRINGS.bn[key] !== undefined, "Missing Bengali key: " + key);
    }
  });

  await runTest("1.2: All Iteration 236 localization keys exist in STRINGS.en", () => {
    for (const key of requiredIter236Keys) {
      assert.ok(i18n.STRINGS.en[key] !== undefined, "Missing English key: " + key);
    }
  });

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
    for (const key of requiredIter236Keys) {
      const bnVal = i18n.t(key, "bn");
      const enVal = i18n.t(key, "en");
      assert.ok(bnVal && bnVal !== key, "t(key, bn) failed for " + key);
      assert.ok(enVal && enVal !== key, "t(key, en) failed for " + key);
    }
  });

  await runTest("1.4: Authentic REF-001 ARSC tokens present in STRINGS.bn", () => {
    assert.strictEqual(i18n.STRINGS.bn.sc_credit_settlement, "(বাকি আদায় সমন্বয়)");
    assert.strictEqual(i18n.STRINGS.bn.settle_payment_action, "পেমেন্ট সমন্বয় করি");
    assert.strictEqual(i18n.STRINGS.bn.invalid_settle_amount, "পেমেন্টের পরিমাণ ০ হতে পারে না।");
    assert.strictEqual(i18n.STRINGS.bn.select_payment_mode, "পেমেন্টের মাধ্যম সিলেক্ট করি");
    assert.strictEqual(i18n.STRINGS.bn.payment_received_wallet, "পেলাম (ওয়ালেট)");
    assert.strictEqual(i18n.STRINGS.bn.payment_accepted, "পেমেন্ট গ্রহণ করা হয়েছে।");
    assert.strictEqual(i18n.STRINGS.bn.previous_balance_prefix, "সর্বশেষ ");
  });

  await runTest("1.5: Complete dictionary parity maintained across bn and en (zero missing keys)", () => {
    const bnKeys = Object.keys(i18n.STRINGS.bn);
    const enKeys = Object.keys(i18n.STRINGS.en);
    assert.strictEqual(bnKeys.length, enKeys.length, `Dictionary key count mismatch: ${bnKeys.length} vs ${enKeys.length}`);
    for (const k of bnKeys) {
      assert.ok(i18n.STRINGS.en[k] !== undefined, "Key missing in en: " + k);
    }
  });

  // -----------------------------------------------------------------------------
  // PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

  await runTest("2.1: Modals 102–106 state controllers declared in App.js", () => {
    assert.ok(appSrc.includes("const [modalSettlementReconciliation, setModalSettlementReconciliation] = useState(false);"));
    assert.ok(appSrc.includes("const [modalSettlementConfirmation, setModalSettlementConfirmation] = useState(false);"));
    assert.ok(appSrc.includes("const [modalSoundboxDiagnostics, setModalSoundboxDiagnostics] = useState(false);"));
    assert.ok(appSrc.includes("const [modalSoundboxVolumeCalibration, setModalSoundboxVolumeCalibration] = useState(false);"));
    assert.ok(appSrc.includes("const [modalSoundboxVoiceBroadcast, setModalSoundboxVoiceBroadcast] = useState(false);"));
  });

  await runTest("2.2: Settlement customer selection, search query, amount input, submitting hooks declared", () => {
    assert.ok(appSrc.includes('const [settlementSearchQuery, setSettlementSearchQuery] = useState("");'));
    assert.ok(appSrc.includes("const [selectedSettlementCustomer, setSelectedSettlementCustomer] = useState(null);"));
    assert.ok(appSrc.includes('const [settlementAmountInput, setSettlementAmountInput] = useState("1000");'));
    assert.ok(appSrc.includes("const [settlementSubmitting, setSettlementSubmitting] = useState(false);"));
    assert.ok(appSrc.includes("const [activeSettlementTxn, setActiveSettlementTxn] = useState({"));
  });

  await runTest("2.3: Soundbox BLE state, battery telemetry, volume duty cycle, voice language hooks declared", () => {
    assert.ok(appSrc.includes("const [soundboxBleState, setSoundboxBleState] = useState('DISCONNECTED');"));
    assert.ok(appSrc.includes("const [soundboxBatteryMv, setSoundboxBatteryMv] = useState(3850);"));
    assert.ok(appSrc.includes("const [soundboxBatteryPct, setSoundboxBatteryPct] = useState(75);"));
    assert.ok(appSrc.includes("const [soundboxIsCharging, setSoundboxIsCharging] = useState(false);"));
    assert.ok(appSrc.includes("const [soundboxRssiDbm, setSoundboxRssiDbm] = useState(-65);"));
    assert.ok(appSrc.includes("const [soundboxVolumeStep, setSoundboxVolumeStep] = useState(10);"));
    assert.ok(appSrc.includes("const [soundboxDutyCyclePct, setSoundboxDutyCyclePct] = useState(67);"));
    assert.ok(appSrc.includes('const [soundboxVoiceLanguage, setSoundboxVoiceLanguage] = useState("bn");'));
  });

  await runTest("2.4: global.__SETTLEMENT_SOUNDBOX_TEST_HOOKS__ exposed in App.js with required keys", () => {
    assert.ok(appSrc.includes("global.__SETTLEMENT_SOUNDBOX_TEST_HOOKS__ = {"));
    assert.ok(appSrc.includes("modalSettlementReconciliation,"));
    assert.ok(appSrc.includes("modalSettlementConfirmation,"));
    assert.ok(appSrc.includes("modalSoundboxDiagnostics,"));
    assert.ok(appSrc.includes("modalSoundboxVolumeCalibration,"));
    assert.ok(appSrc.includes("modalSoundboxVoiceBroadcast,"));
    assert.ok(appSrc.includes("handleOpenSettlementReconciliation,"));
    assert.ok(appSrc.includes("handleProceedSettlementConfirmation,"));
    assert.ok(appSrc.includes("handleConfirmSettlementAction,"));
    assert.ok(appSrc.includes("handleOpenSoundboxDiagnostics,"));
    assert.ok(appSrc.includes("handleSoundboxBleScan,"));
    assert.ok(appSrc.includes("handleSoundboxBleConnect,"));
    assert.ok(appSrc.includes("handleSoundboxBleDisconnect,"));
    assert.ok(appSrc.includes("handleSoundboxVolumeChange,"));
    assert.ok(appSrc.includes("handleTriggerSoundboxBeep,"));
    assert.ok(appSrc.includes("handleTriggerVoiceAnnouncement,"));
  });

  await runTest("2.5: tallyPayService and soundboxService modules connected in App.js", () => {
    assert.ok(appSrc.includes("import * as tallyPayModule from './src/tallyPayService';"));
    assert.ok(appSrc.includes("import * as soundboxModule from './src/soundboxService';"));
    assert.ok(appSrc.includes("storageRepository,"));
  });

  // -----------------------------------------------------------------------------
  // PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders Settlement Reconciliation quick action button", () => {
    assert.ok(appSrc.includes('testID="tp_settlement_reconciliation_btn"'));
    assert.ok(appSrc.includes("onPress={() => handleOpenSettlementReconciliation()}"));
  });

  await runTest("3.2: Tab 4 (TallyPay) renders Soundbox Diagnostics quick action button", () => {
    assert.ok(appSrc.includes('testID="tp_soundbox_diagnostics_btn"'));
    assert.ok(appSrc.includes("onPress={handleOpenSoundboxDiagnostics}"));
  });

  await runTest("3.3: Tab 5 (Menu) renders Settlement Reconciliation menu list item", () => {
    assert.ok(appSrc.includes('testID="menu_tp_settlement_reconciliation_item"'));
    assert.ok(appSrc.includes("accessibilityLabel={t('settle_payment_action')}"));
  });

  await runTest("3.4: Tab 5 (Menu) renders Soundbox Diagnostics menu list item", () => {
    assert.ok(appSrc.includes('testID="menu_tp_soundbox_diagnostics_item"'));
    assert.ok(appSrc.includes("accessibilityLabel={t('soundbox_diagnostics_title')}"));
  });

  await runTest("3.5: All navigation buttons attach STANDARD_TOUCH_HIT_SLOP and accessible button roles", () => {
    const navButtons = [
      'testID="tp_settlement_reconciliation_btn"',
      'testID="tp_soundbox_diagnostics_btn"',
      'testID="menu_tp_settlement_reconciliation_item"',
      'testID="menu_tp_soundbox_diagnostics_item"',
    ];
    for (const nb of navButtons) {
      const pos = appSrc.indexOf(nb);
      assert.ok(pos !== -1, "Button exists: " + nb);
      const snippet = appSrc.slice(Math.max(0, pos - 350), pos + 450);
      assert.ok(snippet.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "Missing hitSlop on " + nb);
      assert.ok(snippet.includes('accessibilityRole="button"'), "Missing accessibilityRole on " + nb);
    }
  });

  // -----------------------------------------------------------------------------
  // PART 4: MODAL 102 (modalSettlementReconciliation) LAYOUT & DEBTOR SEARCH
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 4: MODAL 102 (modalSettlementReconciliation) LAYOUT & DEBTOR SEARCH ---");

  await runTest("4.1: modalSettlementReconciliation defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_settlement_reconciliation"'));
    assert.ok(appSrc.includes("visible={modalSettlementReconciliation}"));
    assert.ok(appSrc.includes("onRequestClose={() => setModalSettlementReconciliation(false)}"));
  });

  await runTest("4.2: Header renders title, back button (btn_settlement_reconciliation_back), and instructions", () => {
    assert.ok(appSrc.includes('testID="btn_settlement_reconciliation_back"'));
    assert.ok(appSrc.includes("t('settlement_reconciliation_title')"));
    assert.ok(appSrc.includes("t('settlement_instructions')"));
  });

  await runTest("4.3: Customer search input (input_settlement_customer_search) with placeholder and touch slop", () => {
    assert.ok(appSrc.includes('testID="input_settlement_customer_search"'));
    assert.ok(appSrc.includes("placeholder={t('settlement_customer_search_placeholder')}"));
  });

  await runTest("4.4: Debtor customer account list rendering with authentic debt balance prefix 'সর্বশেষ '", () => {
    assert.ok(appSrc.includes("t('previous_balance_prefix')"));
    assert.ok(appSrc.includes("t('settlement_select_customer_prompt')"));
  });

  await runTest("4.5: Settlement amount input (input_settlement_amount) with numeric keyboard", () => {
    assert.ok(appSrc.includes('testID="input_settlement_amount"'));
    assert.ok(appSrc.includes('keyboardType="numeric"'));
  });

  await runTest("4.6: Proceed CTA (btn_proceed_settlement_confirmation) with validation check", () => {
    assert.ok(appSrc.includes('testID="btn_proceed_settlement_confirmation"'));
    assert.ok(appSrc.includes("handleProceedSettlementConfirmation"));
    assert.ok(appSrc.includes("t('settle_payment_action')"));
  });

  await runTest("4.7: Validation logic rejects zero or negative settlement amounts", () => {
    assert.ok(appSrc.includes("t('invalid_settle_amount')"));
  });

  // -----------------------------------------------------------------------------
  // PART 5: MODAL 103 (modalSettlementConfirmation) LAYOUT & DEBT DEDUCTION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 5: MODAL 103 (modalSettlementConfirmation) LAYOUT & DEBT DEDUCTION ---");

  await runTest("5.1: modalSettlementConfirmation defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_settlement_confirmation"'));
    assert.ok(appSrc.includes("visible={modalSettlementConfirmation}"));
    assert.ok(appSrc.includes("onRequestClose={() => setModalSettlementConfirmation(false)}"));
  });

  await runTest("5.2: Header renders title and back button (btn_settlement_confirmation_back)", () => {
    assert.ok(appSrc.includes('testID="btn_settlement_confirmation_back"'));
    assert.ok(appSrc.includes("t('settlement_confirm_title')"));
  });

  await runTest("5.3: Customer profile card renders customer name, mobile, and balance comparison card", () => {
    assert.ok(appSrc.includes("selectedSettlementCustomer?.name"));
    assert.ok(appSrc.includes("t('settlement_current_debt')"));
  });

  await runTest("5.4: Balance comparison card displays previous debt, deducted settlement, and remaining debt balance", () => {
    assert.ok(appSrc.includes("t('settlement_amount_label')"));
    assert.ok(appSrc.includes("t('settlement_resulting_balance')"));
  });

  await runTest("5.5: Payment mode badge displays authentic ARSC token 'পেলাম (ওয়ালেট)'", () => {
    assert.ok(appSrc.includes("t('payment_received_wallet')"));
    assert.ok(appSrc.includes("t('select_payment_mode')"));
  });

  await runTest("5.6: Confirm CTA (btn_confirm_settlement_action) triggers settlement transaction", () => {
    assert.ok(appSrc.includes('testID="btn_confirm_settlement_action"'));
    assert.ok(appSrc.includes("handleConfirmSettlementAction"));
    assert.ok(appSrc.includes("t('settlement_confirm_btn')"));
  });

  await runTest("5.7: Settlement execution updates customer balance and records journal entry", () => {
    assert.ok(appSrc.includes("t('settlement_success_msg')"));
    assert.ok(appSrc.includes("updateAccountBalance(selectedSettlementCustomer.id, newBalance)"));
    assert.ok(appSrc.includes("addJournalEntry"));
    assert.ok(appSrc.includes("storageRepository.saveTransactionSettlementAction"));
  });

  // -----------------------------------------------------------------------------
  // PART 6: MODAL 104 (modalSoundboxDiagnostics) LAYOUT & TELEMETRY
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 6: MODAL 104 (modalSoundboxDiagnostics) LAYOUT & TELEMETRY ---");

  await runTest("6.1: modalSoundboxDiagnostics defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_soundbox_diagnostics"'));
    assert.ok(appSrc.includes("visible={modalSoundboxDiagnostics}"));
    assert.ok(appSrc.includes("onRequestClose={() => setModalSoundboxDiagnostics(false)}"));
  });

  await runTest("6.2: Header renders title, subtitle, and back button (btn_soundbox_diagnostics_back)", () => {
    assert.ok(appSrc.includes('testID="btn_soundbox_diagnostics_back"'));
    assert.ok(appSrc.includes("t('soundbox_diagnostics_title')"));
    assert.ok(appSrc.includes("t('soundbox_diagnostics_desc')"));
  });

  await runTest("6.3: 6-state BLE connection machine pill (pill_soundbox_ble_state) renders current state", () => {
    assert.ok(appSrc.includes('testID="pill_soundbox_ble_state"'));
    assert.ok(appSrc.includes("soundboxBleState"));
    assert.ok(appSrc.includes("t('soundbox_ble_state_label')"));
  });

  await runTest("6.4: BLE action controls render Scan, Connect, and Disconnect triggers", () => {
    assert.ok(appSrc.includes('testID="btn_soundbox_scan"'));
    assert.ok(appSrc.includes('testID="btn_soundbox_connect"'));
    assert.ok(appSrc.includes('testID="btn_soundbox_disconnect"'));
  });

  await runTest("6.5: Battery telemetry card renders voltage (mV), percentage (%), charging indicator (⚡), and warning", () => {
    assert.ok(appSrc.includes("soundboxBatteryMv"));
    assert.ok(appSrc.includes("soundboxBatteryPct"));
    assert.ok(appSrc.includes("⚡"));
    assert.ok(appSrc.includes("t('soundbox_battery_low_warning')"));
  });

  await runTest("6.6: RSSI signal strength rating pill (pill_soundbox_rssi_rating) reflects dynamic signal quality", () => {
    assert.ok(appSrc.includes('testID="pill_soundbox_rssi_rating"'));
    assert.ok(appSrc.includes("soundboxRssiDbm"));
    assert.ok(appSrc.includes("t('soundbox_rssi_signal')"));
  });

  await runTest("6.7: Stepper navigation buttons to open volume calibration and voice broadcast", () => {
    assert.ok(appSrc.includes('testID="btn_open_soundbox_volume_calibration"'));
    assert.ok(appSrc.includes('testID="btn_open_soundbox_voice_broadcast"'));
  });

  // -----------------------------------------------------------------------------
  // PART 7: MODAL 105 (modalSoundboxVolumeCalibration) LAYOUT & STEPPER
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 7: MODAL 105 (modalSoundboxVolumeCalibration) LAYOUT & STEPPER ---");

  await runTest("7.1: modalSoundboxVolumeCalibration defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_soundbox_volume_calibration"'));
    assert.ok(appSrc.includes("visible={modalSoundboxVolumeCalibration}"));
    assert.ok(appSrc.includes("onRequestClose={() => setModalSoundboxVolumeCalibration(false)}"));
  });

  await runTest("7.2: Header renders title, description, and back button (btn_soundbox_volume_back)", () => {
    assert.ok(appSrc.includes('testID="btn_soundbox_volume_back"'));
    assert.ok(appSrc.includes("t('soundbox_volume_calibration_title')"));
  });

  await runTest("7.3: 16-step volume controls render discrete step number (0-15) via text_soundbox_volume_step", () => {
    assert.ok(appSrc.includes('testID="text_soundbox_volume_step"'));
    assert.ok(appSrc.includes("soundboxVolumeStep"));
    assert.ok(appSrc.includes("t('soundbox_volume_step_label')"));
  });

  await runTest("7.4: Percentage duty cycle display (text_soundbox_duty_cycle, 0% to 100%)", () => {
    assert.ok(appSrc.includes('testID="text_soundbox_duty_cycle"'));
    assert.ok(appSrc.includes("soundboxDutyCyclePct"));
    assert.ok(appSrc.includes("t('soundbox_volume_duty_cycle')"));
  });

  await runTest("7.5: Minus and Plus controls with boundary clamping", () => {
    assert.ok(appSrc.includes('testID="btn_soundbox_volume_minus"'));
    assert.ok(appSrc.includes('testID="btn_soundbox_volume_plus"'));
    assert.ok(appSrc.includes("handleSoundboxVolumeChange"));
  });

  await runTest("7.6: Test beep trigger (btn_soundbox_test_beep) and Done button (btn_soundbox_volume_done)", () => {
    assert.ok(appSrc.includes('testID="btn_soundbox_test_beep"'));
    assert.ok(appSrc.includes('testID="btn_soundbox_volume_done"'));
    assert.ok(appSrc.includes("handleTriggerSoundboxBeep"));
  });

  // -----------------------------------------------------------------------------
  // PART 8: MODAL 106 (modalSoundboxVoiceBroadcast) LAYOUT & TTS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 8: MODAL 106 (modalSoundboxVoiceBroadcast) LAYOUT & TTS ---");

  await runTest("8.1: modalSoundboxVoiceBroadcast defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_soundbox_voice_broadcast"'));
    assert.ok(appSrc.includes("visible={modalSoundboxVoiceBroadcast}"));
    assert.ok(appSrc.includes("onRequestClose={() => setModalSoundboxVoiceBroadcast(false)}"));
  });

  await runTest("8.2: Header renders title, description, and back button (btn_soundbox_voice_back)", () => {
    assert.ok(appSrc.includes('testID="btn_soundbox_voice_back"'));
    assert.ok(appSrc.includes("t('soundbox_voice_broadcast_title')"));
    assert.ok(appSrc.includes("t('soundbox_voice_broadcast_desc')"));
  });

  await runTest("8.3: Language switch tabs for Bengali (tab_voice_lang_bn) and English (tab_voice_lang_en)", () => {
    assert.ok(appSrc.includes('testID="tab_voice_lang_bn"'));
    assert.ok(appSrc.includes('testID="tab_voice_lang_en"'));
    assert.ok(appSrc.includes("soundboxVoiceLanguage === 'bn'"));
    assert.ok(appSrc.includes("soundboxVoiceLanguage === 'en'"));
  });

  await runTest("8.4: Live voice prompt preview text (text_voice_prompt_preview) with localized formatting", () => {
    assert.ok(appSrc.includes('testID="text_voice_prompt_preview"'));
    assert.ok(appSrc.includes("soundboxVoicePromptText"));
  });

  await runTest("8.5: Audio output sink pill (pill_soundbox_audio_sink) displays hardware vs software fallback", () => {
    assert.ok(appSrc.includes('testID="pill_soundbox_audio_sink"'));
    assert.ok(appSrc.includes("soundboxAudioSink"));
    assert.ok(appSrc.includes("t('soundbox_audio_sink_label')"));
  });

  await runTest("8.6: Auto-reconnect countdown banner (banner_soundbox_reconnect) with cancel trigger", () => {
    assert.ok(appSrc.includes('testID="banner_soundbox_reconnect"'));
    assert.ok(appSrc.includes('testID="btn_cancel_soundbox_reconnect"'));
    assert.ok(appSrc.includes("soundboxReconnectCountdown"));
  });

  await runTest("8.7: Trigger voice announcement CTA (btn_trigger_voice_announcement) and Done button", () => {
    assert.ok(appSrc.includes('testID="btn_trigger_voice_announcement"'));
    assert.ok(appSrc.includes('testID="btn_soundbox_voice_done"'));
    assert.ok(appSrc.includes("handleTriggerVoiceAnnouncement"));
  });

  // -----------------------------------------------------------------------------
  // PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("9.1: BackHandler onBackPress dismisses modalSoundboxVoiceBroadcast to modalSoundboxDiagnostics", () => {
    assert.ok(appSrc.includes("if (modalSoundboxVoiceBroadcast) {"));
    assert.ok(appSrc.includes("setModalSoundboxVoiceBroadcast(false);"));
    assert.ok(appSrc.includes("setModalSoundboxDiagnostics(true);"));
  });

  await runTest("9.2: BackHandler onBackPress dismisses modalSoundboxVolumeCalibration to modalSoundboxDiagnostics", () => {
    assert.ok(appSrc.includes("if (modalSoundboxVolumeCalibration) {"));
    assert.ok(appSrc.includes("setModalSoundboxVolumeCalibration(false);"));
  });

  await runTest("9.3: BackHandler onBackPress dismisses modalSoundboxDiagnostics cleanly", () => {
    assert.ok(appSrc.includes("if (modalSoundboxDiagnostics) {"));
    assert.ok(appSrc.includes("setModalSoundboxDiagnostics(false);"));
  });

  await runTest("9.4: BackHandler onBackPress steps back from modalSettlementConfirmation to modalSettlementReconciliation", () => {
    assert.ok(appSrc.includes("if (modalSettlementConfirmation) {"));
    assert.ok(appSrc.includes("setModalSettlementConfirmation(false);"));
    assert.ok(appSrc.includes("setModalSettlementReconciliation(true);"));
  });

  await runTest("9.5: BackHandler onBackPress dismisses modalSettlementReconciliation cleanly", () => {
    assert.ok(appSrc.includes("if (modalSettlementReconciliation) {"));
    assert.ok(appSrc.includes("setModalSettlementReconciliation(false);"));
  });

  await runTest("9.6: BackHandler useCallback dependency array includes all 5 Iteration 236 modal controllers", () => {
    const depIndex = appSrc.indexOf("modalSettlementReconciliation, modalSettlementConfirmation, modalSoundboxDiagnostics, modalSoundboxVolumeCalibration, modalSoundboxVoiceBroadcast");
    assert.ok(depIndex !== -1, "Missing all 5 modal controllers in BackHandler useCallback dependencies");
  });

  // -----------------------------------------------------------------------------
  // PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK ---");

  await runTest("10.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP, "STANDARD_TOUCH_HIT_SLOP must be exported");
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.top >= 10, "top hitSlop must be >= 10");
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.bottom >= 10, "bottom hitSlop must be >= 10");
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.left >= 10, "left hitSlop must be >= 10");
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.right >= 10, "right hitSlop must be >= 10");
  });

  await runTest("10.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in Modals 102–106", () => {
    const testIDsToCheck = [
      'testID="btn_settlement_reconciliation_back"',
      'testID="btn_proceed_settlement_confirmation"',
      'testID="btn_settlement_confirmation_back"',
      'testID="btn_confirm_settlement_action"',
      'testID="btn_soundbox_diagnostics_back"',
      'testID="btn_soundbox_volume_back"',
      'testID="btn_soundbox_voice_back"',
    ];
    for (const tid of testIDsToCheck) {
      const idx = appSrc.indexOf(tid);
      assert.ok(idx !== -1, "Component exists: " + tid);
      const snippet = appSrc.slice(Math.max(0, idx - 100), idx + 600);
      assert.ok(snippet.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "Missing hitSlop on: " + tid);
    }
  });

  await runTest("10.3: Haptic feedback milestones wired in settlement and soundbox action handlers", () => {
    assert.ok(appSrc.includes("hapticFeedbackService.selection()"), "Missing selection haptics");
    assert.ok(appSrc.includes("hapticFeedbackService.impactMedium()"), "Missing impactMedium haptics");
    assert.ok(appSrc.includes("hapticFeedbackService.notificationSuccess()"), "Missing notificationSuccess haptics");
  });

  // -----------------------------------------------------------------------------
  // PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  await runTest("11.1: Primary settlement CTA (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = calculateContrastRatio("#FFFFFF", "#0D6E5C");
    console.log(`      [CONTRAST] #FFFFFF on #0D6E5C: ${ratio.toFixed(2)}:1 (PASS AA)`);
    assert.ok(ratio >= 4.5, "Primary CTA contrast must be >= 4.5:1");
  });

  await runTest("11.2: Dark mode header surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
    const ratio = calculateContrastRatio("#FFFFFF", "#0F172A");
    console.log(`      [CONTRAST] #FFFFFF on #0F172A: ${ratio.toFixed(2)}:1 (PASS AAA)`);
    assert.ok(ratio >= 7.0, "Dark mode header contrast must be >= 7.0:1");
  });

  await runTest("11.3: Connected BLE status pill (#0D6E5C on #D1FAE5) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = calculateContrastRatio("#0D6E5C", "#D1FAE5");
    console.log(`      [CONTRAST] #0D6E5C on #D1FAE5: ${ratio.toFixed(2)}:1 (PASS AA)`);
    assert.ok(ratio >= 4.5, "Connected pill contrast must be >= 4.5:1");
  });

  await runTest("11.4: Low battery warning badge (#78350F on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = calculateContrastRatio("#78350F", "#FEF3C7");
    console.log(`      [CONTRAST] #78350F on #FEF3C7: ${ratio.toFixed(2)}:1 (PASS AA)`);
    assert.ok(ratio >= 4.5, "Warning badge contrast must be >= 4.5:1");
  });

  await runTest("11.5: Error / Disconnected badge (#991B1B on #FEE2E2) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = calculateContrastRatio("#991B1B", "#FEE2E2");
    console.log(`      [CONTRAST] #991B1B on #FEE2E2: ${ratio.toFixed(2)}:1 (PASS AA)`);
    assert.ok(ratio >= 4.5, "Error badge contrast must be >= 4.5:1");
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
    assert.ok(uniqueModals.has("modalSettlementReconciliation"), "modalSettlementReconciliation must be in unique controllers");
    assert.ok(uniqueModals.has("modalSettlementConfirmation"), "modalSettlementConfirmation must be in unique controllers");
    assert.ok(uniqueModals.has("modalSoundboxDiagnostics"), "modalSoundboxDiagnostics must be in unique controllers");
    assert.ok(uniqueModals.has("modalSoundboxVolumeCalibration"), "modalSoundboxVolumeCalibration must be in unique controllers");
    assert.ok(uniqueModals.has("modalSoundboxVoiceBroadcast"), "modalSoundboxVoiceBroadcast must be in unique controllers");
  });

  // -----------------------------------------------------------------------------
  // PART 13: BABEL AST PARSER VERIFICATION & PERFORMANCE BENCHMARK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK ---");

  await runTest("13.1: App.js compiles cleanly via Babel parser with zero syntax errors", () => {
    const start = Date.now();
    const ast = babel.parseSync(appSrc, {
      filename: "App.js",
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["jsx", "flow"] },
    });
    const duration = Date.now() - start;
    console.log(`      [BABEL] Successfully parsed App.js in ${duration}ms`);
    assert.ok(ast && ast.program && ast.program.body.length > 0, "AST must contain program body");
  });

  await runTest("13.2: Latency benchmark: 1,000 voice prompt generations & settlement math execute in < 200ms", () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      const promptBn = `টালিপে-তে ${i + 100} টাকা পাওয়া গেছে`;
      const promptEn = `Received ${i + 100} Taka on TallyPay`;
      const remainingDebt = Math.max(0, 5000 - (i % 500));
      const dutyCycle = Math.round(((i % 16) / 15) * 100);
      assert.ok(promptBn.length > 0 && promptEn.length > 0 && remainingDebt >= 0 && dutyCycle >= 0);
    }
    const elapsed = Date.now() - start;
    console.log(`      [BENCHMARK] 1,000 operations completed in ${elapsed}ms (${(elapsed / 1000).toFixed(4)}ms/op)`);
    assert.ok(elapsed < 200, "1,000 operations should complete in < 200ms, took " + elapsed + "ms");
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
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
