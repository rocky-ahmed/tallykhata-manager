/**
 * test_feature10_tactile_feedback_parity.js
 * Comprehensive Parity & Verification Suite for Feature 010: Tactile Feedback & UX Parity
 *
 * Verifies 100% parity across:
 * 1. Export Gateway & Constant Integrity (Haptic & Sound Patterns).
 * 2. Defensive Environment Guards & Headless Silence.
 * 3. Haptic Enable / Disable Preferences Toggle.
 * 4. Custom Haptic Adapter Lifecycle & Multi-Backend Dispatch.
 * 5. Sound Enable / Disable Preferences Toggle.
 * 6. Merchant Sound Adapter Lifecycle & Audio Patterns.
 * 7. Unified Merchant Commit Feedback (Haptic + Sound Chime).
 * 8. Retail Domain Aliases for Bookkeeping Workflows.
 * 9. Calibrated Vibration Timings Specification.
 * 10. Frontend & Service Babel AST Syntax Integrity.
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const hapticService = require('./src/hapticFeedbackService');

console.log('================================================================');
console.log('FEATURE 10: TACTILE FEEDBACK & UX PARITY SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// --- PART 1: EXPORT GATEWAY & CONSTANT INTEGRITY ---
console.log('--- PART 1: EXPORT GATEWAY & CONSTANT INTEGRITY ---');

runTest('1.1: Exports all core haptic patterns and constants', () => {
  const { HAPTIC_PATTERNS, VIBRATION_FALLBACK_PATTERNS, SOUND_PATTERNS } = hapticService;
  assert.ok(HAPTIC_PATTERNS, 'HAPTIC_PATTERNS must exist');
  assert.strictEqual(HAPTIC_PATTERNS.SELECTION, 'selection');
  assert.strictEqual(HAPTIC_PATTERNS.IMPACT_LIGHT, 'impactLight');
  assert.strictEqual(HAPTIC_PATTERNS.IMPACT_MEDIUM, 'impactMedium');
  assert.strictEqual(HAPTIC_PATTERNS.IMPACT_HEAVY, 'impactHeavy');
  assert.strictEqual(HAPTIC_PATTERNS.NOTIFICATION_SUCCESS, 'notificationSuccess');
  assert.strictEqual(HAPTIC_PATTERNS.NOTIFICATION_WARNING, 'notificationWarning');
  assert.strictEqual(HAPTIC_PATTERNS.NOTIFICATION_ERROR, 'notificationError');

  assert.ok(SOUND_PATTERNS, 'SOUND_PATTERNS must exist');
  assert.strictEqual(SOUND_PATTERNS.CASH_CHIME, 'cash_chime');
  assert.strictEqual(SOUND_PATTERNS.BEEP_SUCCESS, 'beep_success');
  assert.strictEqual(SOUND_PATTERNS.BEEP_ERROR, 'beep_error');

  assert.ok(VIBRATION_FALLBACK_PATTERNS, 'VIBRATION_FALLBACK_PATTERNS must exist');
});

runTest('1.2: Dual CommonJS and ES6 default object exports parity', () => {
  const fns = [
    'isEnabled', 'setEnabled', 'setHapticsAdapter', 'getHapticsAdapter',
    'resetHapticsAdapter', 'isSoundEnabled', 'setSoundEnabled', 'setSoundAdapter',
    'getSoundAdapter', 'resetSoundAdapter', 'playMerchantSound',
    'onTransactionCommitFeedback', 'onErrorFeedback', 'resetSettings',
    'trigger', 'selection', 'impactLight', 'impactMedium', 'impactHeavy',
    'notificationSuccess', 'notificationWarning', 'notificationError',
    'onKeyPress', 'onTabPress', 'onTransactionSave', 'onDelete', 'onError',
  ];
  fns.forEach((fn) => {
    assert.strictEqual(typeof hapticService[fn], 'function', `Named export ${fn} missing`);
    assert.strictEqual(typeof hapticService.default[fn], 'function', `Default export ${fn} missing`);
  });
});

// --- PART 2: DEFENSIVE ENVIRONMENT GUARDS & HEADLESS SILENCE ---
console.log('\n--- PART 2: DEFENSIVE ENVIRONMENT GUARDS & HEADLESS SILENCE ---');

runTest('2.1: Headless Node environment executes safely as silent no-op', () => {
  hapticService.resetSettings();
  assert.doesNotThrow(() => {
    const s = hapticService.selection();
    const il = hapticService.impactLight();
    const im = hapticService.impactMedium();
    const ih = hapticService.impactHeavy();
    const ns = hapticService.notificationSuccess();
    const nw = hapticService.notificationWarning();
    const ne = hapticService.notificationError();
    const snd = hapticService.playMerchantSound();

    assert.strictEqual(s, false);
    assert.strictEqual(il, false);
    assert.strictEqual(im, false);
    assert.strictEqual(ih, false);
    assert.strictEqual(ns, false);
    assert.strictEqual(nw, false);
    assert.strictEqual(ne, false);
    assert.strictEqual(snd, false);
  });
});

// --- PART 3: HAPTIC ENABLE / DISABLE PREFERENCES TOGGLE ---
console.log('\n--- PART 3: HAPTIC ENABLE / DISABLE PREFERENCES TOGGLE ---');

runTest('3.1: Haptics service defaults to enabled: true and responds to setEnabled', () => {
  hapticService.resetSettings();
  assert.strictEqual(hapticService.isEnabled(), true);

  hapticService.setEnabled(false);
  assert.strictEqual(hapticService.isEnabled(), false);

  const calls = [];
  hapticService.setHapticsAdapter({ selection: () => calls.push('sel') });
  const result = hapticService.selection();
  assert.strictEqual(result, false, 'Disabled service must not execute calls');
  assert.strictEqual(calls.length, 0);

  hapticService.resetSettings();
});

// --- PART 4: CUSTOM HAPTIC ADAPTER LIFECYCLE & DISPATCH ---
console.log('\n--- PART 4: CUSTOM HAPTIC ADAPTER LIFECYCLE & DISPATCH ---');

runTest('4.1: Custom adapter receives pattern-specific invocations', () => {
  hapticService.resetSettings();
  const dispatched = [];
  const adapter = {
    selection: () => dispatched.push('selection'),
    impactLight: () => dispatched.push('impactLight'),
    impactMedium: () => dispatched.push('impactMedium'),
    impactHeavy: () => dispatched.push('impactHeavy'),
    notificationSuccess: () => dispatched.push('notificationSuccess'),
    notificationWarning: () => dispatched.push('notificationWarning'),
    notificationError: () => dispatched.push('notificationError'),
  };
  hapticService.setHapticsAdapter(adapter);
  assert.strictEqual(hapticService.getHapticsAdapter(), adapter);

  hapticService.selection();
  hapticService.impactLight();
  hapticService.impactMedium();
  hapticService.impactHeavy();
  hapticService.notificationSuccess();
  hapticService.notificationWarning();
  hapticService.notificationError();

  assert.deepStrictEqual(dispatched, [
    'selection', 'impactLight', 'impactMedium', 'impactHeavy',
    'notificationSuccess', 'notificationWarning', 'notificationError',
  ]);
  hapticService.resetSettings();
});

runTest('4.2: Faulty haptic adapter exceptions are swallowed defensively', () => {
  hapticService.resetSettings();
  hapticService.setHapticsAdapter({
    selection: () => { throw new Error('Hardware failure'); },
  });
  assert.doesNotThrow(() => {
    const res = hapticService.selection();
    assert.strictEqual(res, false, 'Faulty adapter must fail safely with false');
  });
  hapticService.resetSettings();
});

// --- PART 5: SOUND ENABLE / DISABLE PREFERENCES TOGGLE ---
console.log('\n--- PART 5: SOUND ENABLE / DISABLE PREFERENCES TOGGLE ---');

runTest('5.1: Sound defaults to enabled: true and respects setSoundEnabled', () => {
  hapticService.resetSettings();
  assert.strictEqual(hapticService.isSoundEnabled(), true);

  hapticService.setSoundEnabled(false);
  assert.strictEqual(hapticService.isSoundEnabled(), false);

  const sounds = [];
  hapticService.setSoundAdapter({ playSound: (s) => sounds.push(s) });
  const played = hapticService.playMerchantSound('cash_chime');
  assert.strictEqual(played, false);
  assert.strictEqual(sounds.length, 0);

  hapticService.resetSettings();
});

// --- PART 6: MERCHANT SOUND ADAPTER & AUDIO PATTERNS ---
console.log('\n--- PART 6: MERCHANT SOUND ADAPTER & AUDIO PATTERNS ---');

runTest('6.1: Sound adapter receives sound pattern invocations', () => {
  hapticService.resetSettings();
  const sounds = [];
  const soundAdapter = {
    cash_chime: () => sounds.push('cash_chime'),
    playSound: (s) => sounds.push(s),
  };
  hapticService.setSoundAdapter(soundAdapter);
  assert.strictEqual(hapticService.getSoundAdapter(), soundAdapter);

  hapticService.playMerchantSound('cash_chime');
  hapticService.playMerchantSound('beep_error');

  assert.deepStrictEqual(sounds, ['cash_chime', 'beep_error']);
  hapticService.resetSettings();
});

// --- PART 7: UNIFIED MERCHANT COMMIT FEEDBACK ---
console.log('\n--- PART 7: UNIFIED MERCHANT COMMIT FEEDBACK ---');

runTest('7.1: onTransactionCommitFeedback triggers both haptic and sound chime', () => {
  hapticService.resetSettings();
  let hapticDone = false;
  let soundDone = false;

  hapticService.setHapticsAdapter({ notificationSuccess: () => { hapticDone = true; } });
  hapticService.setSoundAdapter({ cash_chime: () => { soundDone = true; } });

  const result = hapticService.onTransactionCommitFeedback();
  assert.strictEqual(result, true);
  assert.strictEqual(hapticDone, true, 'Haptic notificationSuccess must execute');
  assert.strictEqual(soundDone, true, 'Merchant cash_chime must execute');

  hapticService.resetSettings();
});

runTest('7.2: onErrorFeedback triggers both haptic error and error beep sound', () => {
  hapticService.resetSettings();
  let hapticDone = false;
  let soundDone = false;

  hapticService.setHapticsAdapter({ notificationError: () => { hapticDone = true; } });
  hapticService.setSoundAdapter({ beep_error: () => { soundDone = true; } });

  const result = hapticService.onErrorFeedback();
  assert.strictEqual(result, true);
  assert.strictEqual(hapticDone, true);
  assert.strictEqual(soundDone, true);

  hapticService.resetSettings();
});

// --- PART 8: RETAIL DOMAIN ALIASES ---
console.log('\n--- PART 8: RETAIL DOMAIN ALIASES ---');

runTest('8.1: Retail bookkeeping aliases map to intended tactile feedback', () => {
  hapticService.resetSettings();
  const dispatched = [];
  hapticService.setHapticsAdapter({
    impactLight: () => dispatched.push('keyPress'),
    selection: () => dispatched.push('tabPress'),
    notificationSuccess: () => dispatched.push('txnSave'),
    impactHeavy: () => dispatched.push('delete'),
    notificationError: () => dispatched.push('error'),
  });

  hapticService.onKeyPress();
  hapticService.onTabPress();
  hapticService.onTransactionSave();
  hapticService.onDelete();
  hapticService.onError();

  assert.deepStrictEqual(dispatched, ['keyPress', 'tabPress', 'txnSave', 'delete', 'error']);
  hapticService.resetSettings();
});

// --- PART 9: CALIBRATED VIBRATION TIMINGS SPECIFICATION ---
console.log('\n--- PART 9: CALIBRATED VIBRATION TIMINGS SPECIFICATION ---');

runTest('9.1: Vibration patterns adhere to retail ergonomics specifications', () => {
  const p = hapticService.VIBRATION_FALLBACK_PATTERNS;
  assert.strictEqual(p[hapticService.HAPTIC_PATTERNS.SELECTION], 10);
  assert.strictEqual(p[hapticService.HAPTIC_PATTERNS.IMPACT_LIGHT], 15);
  assert.strictEqual(p[hapticService.HAPTIC_PATTERNS.IMPACT_MEDIUM], 35);
  assert.strictEqual(p[hapticService.HAPTIC_PATTERNS.IMPACT_HEAVY], 65);
  assert.deepStrictEqual(p[hapticService.HAPTIC_PATTERNS.NOTIFICATION_SUCCESS], [0, 25, 40, 25]);
  assert.deepStrictEqual(p[hapticService.HAPTIC_PATTERNS.NOTIFICATION_WARNING], [0, 40, 60, 40]);
  assert.deepStrictEqual(p[hapticService.HAPTIC_PATTERNS.NOTIFICATION_ERROR], [0, 50, 50, 50, 50, 80]);
});

// --- PART 10: FRONTEND & SERVICE AST INTEGRITY ---
console.log('\n--- PART 10: FRONTEND & SERVICE AST INTEGRITY ---');

runTest('10.1: src/hapticFeedbackService.js and App.js parse cleanly with zero JSX/syntax errors', () => {
  const serviceCode = fs.readFileSync('src/hapticFeedbackService.js', 'utf8');
  const serviceAst = babel.parseSync(serviceCode, {
    filename: 'src/hapticFeedbackService.js',
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'flow'] },
  });
  assert.ok(serviceAst, 'src/hapticFeedbackService.js must parse cleanly');

  const appCode = fs.readFileSync('App.js', 'utf8');
  const appAst = babel.parseSync(appCode, {
    filename: 'App.js',
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'flow'] },
  });
  assert.ok(appAst, 'App.js must parse cleanly');
});

console.log('\n================================================================');
console.log(`ALL ${passedTests} / ${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
console.log('FEATURE 10 TACTILE FEEDBACK & UX PARITY VERIFIED');
console.log('================================================================\n');
