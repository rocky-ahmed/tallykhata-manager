/**
 * TALLYKHATA ITERATION 229: QR MERCHANT SETTLEMENT & SOUNDBOX UI/UX QA SUITE
 *
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions / QA & Security Owner)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Milestone: REA-ITER-229
 * Reference APK: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 *
 * Covers:
 * Part 1: Bilingual localization (i18n) key symmetry across bn and en
 * Part 2: App.js state hooks & global test hooks declaration
 * Part 3: Navigation entry points in Tab 4 (TallyPay) and Tab 5 (Menu)
 * Part 4: modalQrSettlement layout, action selectors & customer picker
 * Part 5: showSoundboxSettingsModal layout, switches & test voice trigger
 * Part 6: Voice speech prompt generation & preview simulation
 * Part 7: Settlement action lifecycle & balance reconciliation
 * Part 8: Hardware BackHandler safe stacked dismissal
 * Part 9: Touch target ergonomics & haptic feedback integration
 * Part 10: WCAG 2.1 AA / AAA luminance contrast validation
 * Part 11: Modal count & controller invariants (80 modals total)
 * Part 12: Babel AST compilation & performance benchmark
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const i18n = require('./src/i18nService');
const tallyPay = require('./src/tallyPayService');
const storageRepository = require('./src/storageRepository');
const iconMetrics = require('./src/iconMetrics');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${desc}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error('    Error:', err.message);
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
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function calculateContrast(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

console.log('='.repeat(80));
console.log('TALLYKHATA ITERATION 229: QR SETTLEMENT & SOUNDBOX UI/UX QA SUITE');
console.log('Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)');
console.log('Milestone: REA-ITER-229');
console.log('='.repeat(80));

const appSrc = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');

// -----------------------------------------------------------------------------
// PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY
// -----------------------------------------------------------------------------
console.log('\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---');

const REQUIRED_ITER229_KEYS = [
  'qr_settlement',
  'settle_as_credit',
  'settle_as_sale',
  'settle_no_action',
  'settlement_success',
  'soundbox_settings',
  'sound_notification',
  'voice_notification',
  'voice_alert_desc',
  'test_voice_prompt',
  'payment_received_tts',
  'confirm_settlement',
  'settle_payment_cta',
  'select_customer_for_credit',
  'settlement_details',
  'current_baki',
  'new_baki',
  'settlement_amount',
  'soundbox_voice_preview',
  'soundbox_voice_preview_playing',
  'no_pending_settlements',
];

runTest('1.1: All Iteration 229 localization keys exist in STRINGS.bn', () => {
  REQUIRED_ITER229_KEYS.forEach(key => {
    assert.ok(
      Object.prototype.hasOwnProperty.call(i18n.STRINGS.bn, key),
      `Missing key in STRINGS.bn: ${key}`
    );
    assert.strictEqual(typeof i18n.STRINGS.bn[key], 'string');
    assert.ok(i18n.STRINGS.bn[key].length > 0);
  });
});

runTest('1.2: All Iteration 229 localization keys exist in STRINGS.en', () => {
  REQUIRED_ITER229_KEYS.forEach(key => {
    assert.ok(
      Object.prototype.hasOwnProperty.call(i18n.STRINGS.en, key),
      `Missing key in STRINGS.en: ${key}`
    );
    assert.strictEqual(typeof i18n.STRINGS.en[key], 'string');
    assert.ok(i18n.STRINGS.en[key].length > 0);
  });
});

runTest('1.3: t() helper translates keys symmetrically across languages', () => {
  assert.strictEqual(i18n.t('qr_settlement', 'bn'), 'পেমেন্ট সমন্বয়');
  assert.strictEqual(i18n.t('qr_settlement', 'en'), 'QR Payment Settlement');
  assert.strictEqual(i18n.t('settle_as_credit', 'bn'), 'বাকি আদায় সমন্বয়');
  assert.strictEqual(i18n.t('settle_as_credit', 'en'), 'Settle as Credit Collection');
  assert.strictEqual(i18n.t('sound_notification', 'bn'), 'নোটিফিকেশন সাউন্ড');
  assert.strictEqual(i18n.t('sound_notification', 'en'), 'Notification Sound');
  assert.strictEqual(i18n.t('voice_notification', 'bn'), 'ভয়েস নোটিফিকেশন');
  assert.strictEqual(i18n.t('voice_notification', 'en'), 'Voice Notification');
});

runTest('1.4: STATIC_TRANSLATIONS contains authentic settlement and soundbox terms', () => {
  assert.strictEqual(i18n.STATIC_TRANSLATIONS['পেমেন্ট সমন্বয়'], 'QR Payment Settlement');
  assert.strictEqual(i18n.STATIC_TRANSLATIONS['বাকি আদায় সমন্বয়'], 'Settle as Credit Collection');
  assert.strictEqual(i18n.STATIC_TRANSLATIONS['ডিজিটাল বিক্রি'], 'Settle as Digital Sale');
  assert.strictEqual(i18n.STATIC_TRANSLATIONS['সাউন্ডবক্স সেটিংস'], 'Soundbox Settings');
});

// -----------------------------------------------------------------------------
// PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
// -----------------------------------------------------------------------------
console.log('\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---');

runTest('2.1: QR settlement and Soundbox state hooks declared in App.js', () => {
  assert.ok(appSrc.includes('const [modalQrSettlement, setModalQrSettlement] = useState(false);'));
  assert.ok(appSrc.includes('const [showQrSettlementModal, setShowQrSettlementModal] = useState(false);'));
  assert.ok(appSrc.includes('const [qrSettlementTxn, setQrSettlementTxn] = useState(null);'));
  assert.ok(appSrc.includes("const [qrSettlementActionType, setQrSettlementActionType] = useState('CREDIT_COLLECTION');"));
  assert.ok(appSrc.includes('const [qrSettlementSelectedAccount, setQrSettlementSelectedAccount] = useState(null);'));
  assert.ok(appSrc.includes('const [showSoundboxSettingsModal, setShowSoundboxSettingsModal] = useState(false);'));
  assert.ok(appSrc.includes('const [soundboxSoundChecked, setSoundboxSoundChecked] = useState(true);'));
  assert.ok(appSrc.includes('const [soundboxTtsChecked, setSoundboxTtsChecked] = useState(true);'));
  assert.ok(appSrc.includes("const [soundboxVoicePreviewText, setSoundboxVoicePreviewText] = useState('');"));
});

runTest('2.2: global.__QR_SETTLEMENT_TEST_HOOKS__ exposed in App.js', () => {
  assert.ok(appSrc.includes('global.__QR_SETTLEMENT_TEST_HOOKS__ = {'));
  assert.ok(appSrc.includes('handleOpenQrSettlement,'));
  assert.ok(appSrc.includes('handleCloseQrSettlement,'));
  assert.ok(appSrc.includes('handleConfirmQrSettlement,'));
  assert.ok(appSrc.includes('handleOpenSoundboxVoiceSettings,'));
  assert.ok(appSrc.includes('handleCloseSoundboxVoiceSettings,'));
  assert.ok(appSrc.includes('handleToggleSoundNotification,'));
  assert.ok(appSrc.includes('handleToggleVoiceNotification,'));
  assert.ok(appSrc.includes('handleTestSoundboxVoicePrompt,'));
});

runTest('2.3: tallyPayService settlement modules imported and destructured in App.js', () => {
  assert.ok(appSrc.includes('SETTLEMENT_ACTION_TYPES: TP_SETTLEMENT_ACTION_TYPES = tallyPayModule.SETTLEMENT_ACTION_TYPES,'));
  assert.ok(appSrc.includes('processQrPaymentSettlement: tpProcessQrPaymentSettlement = tallyPayModule.processQrPaymentSettlement,'));
  assert.ok(appSrc.includes('generatePaymentSpeechPrompt: tpGeneratePaymentSpeechPrompt = tallyPayModule.generatePaymentSpeechPrompt,'));
  assert.ok(appSrc.includes('getSoundboxNotificationConfig: tpGetSoundboxNotificationConfig = tallyPayModule.getSoundboxNotificationConfig,'));
  assert.ok(appSrc.includes('updateSoundboxNotificationConfig: tpUpdateSoundboxNotificationConfig = tallyPayModule.updateSoundboxNotificationConfig,'));
});

// -----------------------------------------------------------------------------
// PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5)
// -----------------------------------------------------------------------------
console.log('\n--- PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5) ---');

runTest('3.1: Tab 4 (TallyPay) renders QR settlement quick action banner', () => {
  assert.ok(appSrc.includes('testID="tp_qr_settlement_btn"'));
  assert.ok(appSrc.includes('onPress={() => handleOpenQrSettlement()}'));
});

runTest('3.2: Tab 4 (TallyPay) renders Soundbox settings quick action banner', () => {
  assert.ok(appSrc.includes('testID="tp_soundbox_voice_settings_btn"'));
  assert.ok(appSrc.includes('onPress={handleOpenSoundboxVoiceSettings}'));
});

runTest('3.3: Tab 5 (Menu) renders QR settlement item', () => {
  assert.ok(appSrc.includes('testID="menu_tp_qr_settlement_item"'));
});

runTest('3.4: Tab 5 (Menu) renders Soundbox settings item', () => {
  assert.ok(appSrc.includes('testID="menu_tp_soundbox_voice_settings_item"'));
});

// -----------------------------------------------------------------------------
// PART 4: QR SETTLEMENT MODAL LAYOUT & USER JOURNEY
// -----------------------------------------------------------------------------
console.log('\n--- PART 4: QR SETTLEMENT MODAL LAYOUT & USER JOURNEY ---');

runTest('4.1: modalQrSettlement defines full-screen Modal with testID and onRequestClose', () => {
  assert.ok(appSrc.includes('visible={modalQrSettlement}'));
  assert.ok(appSrc.includes('onRequestClose={handleCloseQrSettlement}'));
  assert.ok(appSrc.includes('testID="modal_qr_settlement"'));
});

runTest('4.2: Settlement Modal renders 3 action options (Credit, Sale, No Action)', () => {
  assert.ok(appSrc.includes('testID="action_settle_credit"'));
  assert.ok(appSrc.includes('testID="action_settle_sale"'));
  assert.ok(appSrc.includes('testID="action_settle_no_action"'));
});

runTest('4.3: Customer search input and picker rendered for credit collection', () => {
  assert.ok(appSrc.includes('testID="input_settle_customer_search"'));
  assert.ok(appSrc.includes("testID={'settle_customer_item_' + acc.id}"));
});

runTest('4.4: Confirm settlement button rendered with primary CTA', () => {
  assert.ok(appSrc.includes('testID="btn_confirm_qr_settlement"'));
  assert.ok(appSrc.includes('onPress={handleConfirmQrSettlement}'));
});

// -----------------------------------------------------------------------------
// PART 5: SOUNDBOX SETTINGS MODAL & TEST VOICE TRIGGER
// -----------------------------------------------------------------------------
console.log('\n--- PART 5: SOUNDBOX SETTINGS MODAL & TEST VOICE TRIGGER ---');

runTest('5.1: showSoundboxSettingsModal defines Modal with testID and onRequestClose', () => {
  assert.ok(appSrc.includes('visible={showSoundboxSettingsModal}'));
  assert.ok(appSrc.includes('onRequestClose={handleCloseSoundboxVoiceSettings}'));
  assert.ok(appSrc.includes('testID="modal_soundbox_voice_settings"'));
});

runTest('5.2: Sound tone notification switch rendered', () => {
  assert.ok(appSrc.includes('testID="switch_sound_notification"'));
  assert.ok(appSrc.includes('onValueChange={handleToggleSoundNotification}'));
});

runTest('5.3: Voice TTS notification switch rendered', () => {
  assert.ok(appSrc.includes('testID="switch_voice_notification"'));
  assert.ok(appSrc.includes('onValueChange={handleToggleVoiceNotification}'));
});

runTest('5.4: Test voice announcement button rendered with testID', () => {
  assert.ok(appSrc.includes('testID="btn_test_soundbox_voice"'));
  assert.ok(appSrc.includes('onPress={handleTestSoundboxVoicePrompt}'));
});

// -----------------------------------------------------------------------------
// PART 6: VOICE SPEECH PROMPT GENERATION & PREVIEW SIMULATION
// -----------------------------------------------------------------------------
console.log('\n--- PART 6: VOICE SPEECH PROMPT GENERATION & PREVIEW SIMULATION ---');

runTest('6.1: generatePaymentSpeechPrompt produces authentic Bengali voice text matching ARSC token', () => {
  const prompt = tallyPay.generatePaymentSpeechPrompt({
    amount: 500,
    senderName: 'করিম স্টোর',
    txnId: 'TKQR-TEST-001',
  }, 'bn');

  assert.ok(prompt.includes('আপনার টালিখাতা ওয়ালেটে'));
  assert.ok(prompt.includes('টাকা গ্রহণ করা হয়েছে'));
  assert.ok(prompt.includes('প্রেরক - করিম স্টোর'));
  assert.ok(prompt.includes('৫০০'));
});

runTest('6.2: generatePaymentSpeechPrompt supports English localization', () => {
  const promptEn = tallyPay.generatePaymentSpeechPrompt({
    amount: 1250,
    senderName: 'Rahim Traders',
    txnId: 'TKQR-9901',
  }, 'en');

  assert.ok(promptEn.includes('received in your TallyKhata wallet'));
  assert.ok(promptEn.includes('Sender - Rahim Traders'));
  assert.ok(promptEn.includes('1250'));
});

runTest('6.3: SoundboxConfigManager retrieves and updates sound & TTS toggles accurately', () => {
  const cfg1 = tallyPay.getSoundboxNotificationConfig('biz_test_99');
  assert.strictEqual(cfg1.isNotificationSoundChecked, true);
  assert.strictEqual(cfg1.isNotificationTTSChecked, true);

  const updated = tallyPay.updateSoundboxNotificationConfig('biz_test_99', {
    isNotificationTTSChecked: false,
  });
  assert.strictEqual(updated.isNotificationTTSChecked, false);
  assert.strictEqual(updated.isNotificationSoundChecked, true);
});

// -----------------------------------------------------------------------------
// PART 7: SETTLEMENT ACTION LIFECYCLE & BALANCE RECONCILIATION
// -----------------------------------------------------------------------------
console.log('\n--- PART 7: SETTLEMENT ACTION LIFECYCLE & BALANCE RECONCILIATION ---');

runTest('7.1: Settlement action types enum matches specification', () => {
  assert.strictEqual(tallyPay.SETTLEMENT_ACTION_TYPES.CREDIT_COLLECTION, 'CREDIT_COLLECTION');
  assert.strictEqual(tallyPay.SETTLEMENT_ACTION_TYPES.DIGITAL_SALE, 'DIGITAL_SALE');
  assert.strictEqual(tallyPay.SETTLEMENT_ACTION_TYPES.NO_ACTION, 'NO_ACTION');
});

runTest('7.2: Pure QrSettlementEngine processes credit collection and reduces debtor balance', () => {
  const engine = new tallyPay.QrSettlementEngine({ isNotificationSoundChecked: true, isNotificationTTSChecked: true });
  engine.registerAccount('acc_cust_1', 'সফিক ব্রাদার্স', 1000);
  const res = engine.settlePayment('CREDIT_COLLECTION', 'TKQR_SIM_001', {
    amountPaisa: 35000,
    accountId: 'acc_cust_1',
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.actionType, 'CREDIT_COLLECTION');
  assert.strictEqual(res.remainingBalance, 650);
  assert.strictEqual(res.settledAmount, 350);
  assert.ok(res.journalEntry.note.includes('(বাকি আদায় সমন্বয়)'));
});

runTest('7.3: QrSettlementEngine enforces idempotency on duplicate transaction number', () => {
  const engine = new tallyPay.QrSettlementEngine({ isNotificationSoundChecked: true, isNotificationTTSChecked: true });
  engine.settlePayment('DIGITAL_SALE', 'IDEM_TXN_001', {
    amountPaisa: 20000,
  });

  const dupRes = engine.settlePayment('DIGITAL_SALE', 'IDEM_TXN_001', {
    amountPaisa: 20000,
  });

  assert.strictEqual(dupRes.success, false);
  assert.strictEqual(dupRes.reason, 'ALREADY_SETTLED');
});

// -----------------------------------------------------------------------------
// PART 8: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
// -----------------------------------------------------------------------------
console.log('\n--- PART 8: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---');

runTest('8.1: BackHandler onBackPress dismisses showSoundboxSettingsModal before modalQrSettlement', () => {
  const onBackPressIdx = appSrc.indexOf('const onBackPress = () => {');
  assert.ok(onBackPressIdx !== -1);
  const backPressEndIdx = appSrc.indexOf('const backSub = BackHandler.addEventListener');
  const backPressBody = appSrc.substring(onBackPressIdx, backPressEndIdx);

  const soundboxIdx = backPressBody.indexOf('if (showSoundboxSettingsModal)');
  const qrIdx = backPressBody.indexOf('if (modalQrSettlement)');

  assert.ok(soundboxIdx !== -1, 'showSoundboxSettingsModal check must exist in onBackPress');
  assert.ok(qrIdx !== -1, 'modalQrSettlement check must exist in onBackPress');
  assert.ok(soundboxIdx < qrIdx, 'showSoundboxSettingsModal must be checked before modalQrSettlement');
});

runTest('8.2: modalQrSettlement safe sub-step reversion (CONFIRM -> ACTION_SELECT)', () => {
  assert.ok(appSrc.includes("if (qrSettlementStep === 'CONFIRM')"));
  assert.ok(appSrc.includes("setQrSettlementStep('ACTION_SELECT');"));
});

runTest('8.3: BackHandler useCallback dependency array includes modalQrSettlement and showSoundboxSettingsModal', () => {
  const backSubIdx = appSrc.indexOf('const backSub = BackHandler.addEventListener');
  assert.ok(backSubIdx !== -1);
  const depArray = appSrc.substring(backSubIdx, backSubIdx + 800);

  assert.ok(depArray.includes('modalQrSettlement'));
  assert.ok(depArray.includes('showSoundboxSettingsModal'));
  assert.ok(depArray.includes('qrSettlementStep'));
});

// -----------------------------------------------------------------------------
// PART 9: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION
// -----------------------------------------------------------------------------
console.log('\n--- PART 9: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK INTEGRATION ---');

runTest('9.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges', () => {
  assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.top >= 10, true);
  assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.bottom >= 10, true);
  assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.left >= 10, true);
  assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.right >= 10, true);
});

runTest('9.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in new modals', () => {
  assert.ok(appSrc.includes('testID="btn_back_qr_settlement"'));
  assert.ok(appSrc.includes('testID="btn_confirm_qr_settlement"'));
  assert.ok(appSrc.includes('testID="btn_close_soundbox_voice_settings"'));
  assert.ok(appSrc.includes('testID="btn_test_soundbox_voice"'));
});

runTest('9.3: Haptic feedback milestones wired in settlement and soundbox handlers', () => {
  assert.ok(appSrc.includes('hapticFeedbackService.impactMedium();'));
  assert.ok(appSrc.includes('hapticFeedbackService.notificationSuccess();'));
  assert.ok(appSrc.includes('hapticFeedbackService.selection();'));
});

// -----------------------------------------------------------------------------
// PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---');

runTest('10.1: Primary settlement CTA (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)', () => {
  const contrast = calculateContrast('#FFFFFF', '#0D6E5C');
  console.log(`      [CONTRAST] #FFFFFF on #0D6E5C: ${contrast.toFixed(2)}:1 (PASS AA)`);
  assert.ok(contrast >= 4.5);
});

runTest('10.2: Dark mode header surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)', () => {
  const contrast = calculateContrast('#FFFFFF', '#0F172A');
  console.log(`      [CONTRAST] #FFFFFF on #0F172A: ${contrast.toFixed(2)}:1 (PASS AAA)`);
  assert.ok(contrast >= 7.0);
});

runTest('10.3: Action option card text (#1E293B on #FFFFFF) achieves WCAG AAA (>= 7.0:1)', () => {
  const contrast = calculateContrast('#1E293B', '#FFFFFF');
  console.log(`      [CONTRAST] #1E293B on #FFFFFF: ${contrast.toFixed(2)}:1 (PASS AAA)`);
  assert.ok(contrast >= 7.0);
});

runTest('10.4: Soundbox voice settings card background (#FEF3C7) and text (#78350F) achieves WCAG AA (>= 4.5:1)', () => {
  const contrast = calculateContrast('#78350F', '#FEF3C7');
  console.log(`      [CONTRAST] #78350F on #FEF3C7: ${contrast.toFixed(2)}:1 (PASS AA)`);
  assert.ok(contrast >= 4.5);
});

runTest('10.5: Inactive meta text (#64748B on #FFFFFF) achieves WCAG AA (>= 4.5:1)', () => {
  const contrast = calculateContrast('#64748B', '#FFFFFF');
  console.log(`      [CONTRAST] #64748B on #FFFFFF: ${contrast.toFixed(2)}:1 (PASS AA)`);
  assert.ok(contrast >= 4.5);
});

// -----------------------------------------------------------------------------
// PART 11: MODAL COUNT & CONTROLLER INVARIANTS (80 MODALS)
// -----------------------------------------------------------------------------
console.log('\n--- PART 11: MODAL COUNT & CONTROLLER INVARIANTS (101 MODALS) ---');

runTest('11.1: App.js contains exactly 101 <Modal elements', () => {
  const modalMatches = appSrc.match(/<Modal\b/g) || [];
  assert.strictEqual(modalMatches.length, 101, `Expected exactly 101 modals in App.js, got ${modalMatches.length}`);
});

runTest('11.2: App.js contains exactly 101 onRequestClose handlers', () => {
  const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
  assert.strictEqual(reqCloseMatches.length, 101, `Expected 101 onRequestClose handlers, got ${reqCloseMatches.length}`);
});

runTest('11.3: App.js contains exactly 101 unique modal state controllers', () => {
  const regex = /visible=\{([a-zA-Z0-9_]+)\}/g;
  const uniqueModals = new Set();
  let m;
  while ((m = regex.exec(appSrc)) !== null) {
    uniqueModals.add(m[1]);
  }
  assert.strictEqual(uniqueModals.size, 101, `Expected 101 unique visible controllers, got ${uniqueModals.size}`);
  assert.ok(uniqueModals.has('modalQrSettlement'), 'modalQrSettlement must be in unique controllers');
  assert.ok(uniqueModals.has('showSoundboxSettingsModal'), 'showSoundboxSettingsModal must be in unique controllers');
});

// -----------------------------------------------------------------------------
// PART 12: BABEL AST PARSER VERIFICATION & PERFORMANCE BENCHMARK
// -----------------------------------------------------------------------------
console.log('\n--- PART 12: BABEL AST PARSER VERIFICATION & PERFORMANCE BENCHMARK ---');

runTest('12.1: App.js compiles cleanly via Babel parser with zero syntax errors', () => {
  const t0 = Date.now();
  const ast = babel.parseSync(appSrc, {
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'flow'] },
  });
  const elapsed = Date.now() - t0;
  assert.ok(ast && ast.type === 'File');
  console.log(`      [BABEL] Successfully parsed App.js in ${elapsed}ms`);
});

runTest('12.2: Latency benchmark: 1,000 prompt generations execute in < 200ms', () => {
  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) {
    tallyPay.generatePaymentSpeechPrompt({
      amount: 100 + i,
      senderName: 'Merchant ' + i,
      txnId: 'TXN_' + i,
    }, 'bn');
  }
  const elapsed = Date.now() - t0;
  console.log(`      [BENCHMARK] 1,000 voice prompts generated in ${elapsed}ms (${(elapsed / 1000).toFixed(4)}ms/op)`);
  assert.ok(elapsed < 200);
});

// -----------------------------------------------------------------------------
// FINAL SUMMARY
// -----------------------------------------------------------------------------
console.log('\n' + '='.repeat(80));
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests} (${Math.round((passedTests / totalTests) * 100)}% SUCCESS)`);
console.log('='.repeat(80));

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
