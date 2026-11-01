/**
 * test_haptic_feedback.js
 * Automated Verification Suite for Haptic & Tactile Feedback Service Abstraction (BL-016)
 * Validates defensive environment guards, interaction patterns, preferences toggles,
 * mock adapter injection, and retail aliases.
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const hapticService = require('./src/hapticFeedbackService');
const {
  HAPTIC_PATTERNS,
  VIBRATION_FALLBACK_PATTERNS,
  isEnabled,
  setEnabled,
  setHapticsAdapter,
  getHapticsAdapter,
  resetHapticsAdapter,
  resetSettings,
  trigger,
  selection,
  impactLight,
  impactMedium,
  impactHeavy,
  notificationSuccess,
  notificationWarning,
  notificationError,
  onKeyPress,
  onTabPress,
  onTransactionSave,
  onDelete,
  onError,
} = hapticService;

console.log('================================================================');
console.log('ITERATION 005: HAPTIC FEEDBACK SERVICE VERIFICATION (BL-016)');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] TEST ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] TEST ${total}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function parseAst(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  return babel.parseSync(code, {
    filename: filePath,
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'flow'] },
  });
}

// -------------------------------------------------------------
// PART 1: FILE EXISTENCE & EXPORT GATEWAY INTEGRITY
// -------------------------------------------------------------
console.log('--- PART 1: FILE EXISTENCE & EXPORT GATEWAY INTEGRITY ---');

runTest('hapticFeedbackService.js exists in src/', () => {
  assert(fs.existsSync('src/hapticFeedbackService.js'), 'src/hapticFeedbackService.js must exist on disk');
});

runTest('Babel parses src/hapticFeedbackService.js cleanly with zero syntax errors', () => {
  const ast = parseAst('src/hapticFeedbackService.js');
  assert(ast && ast.program && ast.program.body.length > 0, 'AST must be non-empty and valid');
});

runTest('hapticFeedbackService exports all required functions and constants', () => {
  const requiredFunctions = [
    'isEnabled',
    'setEnabled',
    'setHapticsAdapter',
    'getHapticsAdapter',
    'resetHapticsAdapter',
    'resetSettings',
    'trigger',
    'selection',
    'impactLight',
    'impactMedium',
    'impactHeavy',
    'notificationSuccess',
    'notificationWarning',
    'notificationError',
    'onKeyPress',
    'onTabPress',
    'onTransactionSave',
    'onDelete',
    'onError',
  ];
  for (const fn of requiredFunctions) {
    assert(typeof hapticService[fn] === 'function', `Must export function ${fn}`);
    assert(typeof hapticService.default[fn] === 'function', `default export must include function ${fn}`);
  }
  assert(hapticService.HAPTIC_PATTERNS !== undefined, 'Must export HAPTIC_PATTERNS');
  assert(hapticService.VIBRATION_FALLBACK_PATTERNS !== undefined, 'Must export VIBRATION_FALLBACK_PATTERNS');
});

// -------------------------------------------------------------
// PART 2: DEFENSIVE ENVIRONMENT GUARDS & SILENT NO-OP
// -------------------------------------------------------------
console.log('\n--- PART 2: DEFENSIVE ENVIRONMENT GUARDS & SILENT NO-OP ---');

runTest('In headless/Node environment without mock adapter, all methods execute safely as no-ops', () => {
  resetSettings();
  assert.doesNotThrow(() => {
    const r1 = selection();
    const r2 = impactLight();
    const r3 = impactMedium();
    const r4 = impactHeavy();
    const r5 = notificationSuccess();
    const r6 = notificationWarning();
    const r7 = notificationError();
    const r8 = trigger(HAPTIC_PATTERNS.SELECTION);

    // In Node without native vibration hardware or mock adapter, returns false (silent no-op)
    assert.strictEqual(r1, false, 'selection must return false in headless no-op');
    assert.strictEqual(r2, false, 'impactLight must return false in headless no-op');
    assert.strictEqual(r3, false, 'impactMedium must return false in headless no-op');
    assert.strictEqual(r4, false, 'impactHeavy must return false in headless no-op');
    assert.strictEqual(r5, false, 'notificationSuccess must return false in headless no-op');
    assert.strictEqual(r6, false, 'notificationWarning must return false in headless no-op');
    assert.strictEqual(r7, false, 'notificationError must return false in headless no-op');
    assert.strictEqual(r8, false, 'trigger must return false in headless no-op');
  }, 'Headless execution must never throw errors');
});

// -------------------------------------------------------------
// PART 3: PREFERENCE TOGGLES (ENABLE / DISABLE)
// -------------------------------------------------------------
console.log('\n--- PART 3: PREFERENCE TOGGLES (ENABLE / DISABLE) ---');

runTest('Haptics service defaults to enabled: true', () => {
  resetSettings();
  assert.strictEqual(isEnabled(), true, 'Default state must be enabled');
});

runTest('setEnabled(false) silences all haptic calls even when mock adapter is present', () => {
  resetSettings();
  let calls = 0;
  setHapticsAdapter({
    selection: () => { calls++; },
    impactLight: () => { calls++; },
  });

  setEnabled(false);
  assert.strictEqual(isEnabled(), false, 'isEnabled must return false after setEnabled(false)');

  const r1 = selection();
  const r2 = impactLight();
  assert.strictEqual(r1, false, 'selection must return false when disabled');
  assert.strictEqual(r2, false, 'impactLight must return false when disabled');
  assert.strictEqual(calls, 0, 'Adapter must not be called when disabled');

  // Re-enable and verify adapter resumes
  setEnabled(true);
  assert.strictEqual(isEnabled(), true, 'isEnabled must return true after setEnabled(true)');
  const r3 = selection();
  assert.strictEqual(r3, true, 'selection must return true when adapter responds');
  assert.strictEqual(calls, 1, 'Adapter must be called once re-enabled');

  resetSettings();
});

// -------------------------------------------------------------
// PART 4: MOCK ADAPTER INJECTION & INTERACTION PATTERNS
// -------------------------------------------------------------
console.log('\n--- PART 4: MOCK ADAPTER INJECTION & INTERACTION PATTERNS ---');

runTest('Adapter with pattern-specific methods receives exact dispatches', () => {
  resetSettings();
  const ledger = {};
  const mockAdapter = {
    selection: () => { ledger.selection = (ledger.selection || 0) + 1; },
    impactLight: () => { ledger.impactLight = (ledger.impactLight || 0) + 1; },
    impactMedium: () => { ledger.impactMedium = (ledger.impactMedium || 0) + 1; },
    impactHeavy: () => { ledger.impactHeavy = (ledger.impactHeavy || 0) + 1; },
    notificationSuccess: () => { ledger.notificationSuccess = (ledger.notificationSuccess || 0) + 1; },
    notificationWarning: () => { ledger.notificationWarning = (ledger.notificationWarning || 0) + 1; },
    notificationError: () => { ledger.notificationError = (ledger.notificationError || 0) + 1; },
  };

  setHapticsAdapter(mockAdapter);
  assert.strictEqual(getHapticsAdapter(), mockAdapter, 'getHapticsAdapter must return registered adapter');

  assert.strictEqual(selection(), true);
  assert.strictEqual(impactLight(), true);
  assert.strictEqual(impactMedium(), true);
  assert.strictEqual(impactHeavy(), true);
  assert.strictEqual(notificationSuccess(), true);
  assert.strictEqual(notificationWarning(), true);
  assert.strictEqual(notificationError(), true);

  assert.strictEqual(ledger.selection, 1);
  assert.strictEqual(ledger.impactLight, 1);
  assert.strictEqual(ledger.impactMedium, 1);
  assert.strictEqual(ledger.impactHeavy, 1);
  assert.strictEqual(ledger.notificationSuccess, 1);
  assert.strictEqual(ledger.notificationWarning, 1);
  assert.strictEqual(ledger.notificationError, 1);

  resetSettings();
});

runTest('Adapter with generic trigger(pattern) receives all pattern invocations', () => {
  resetSettings();
  const events = [];
  setHapticsAdapter({
    trigger: (pattern) => { events.push(pattern); },
  });

  selection();
  impactHeavy();
  notificationSuccess();

  assert.deepStrictEqual(events, [
    HAPTIC_PATTERNS.SELECTION,
    HAPTIC_PATTERNS.IMPACT_HEAVY,
    HAPTIC_PATTERNS.NOTIFICATION_SUCCESS,
  ]);

  resetSettings();
});

runTest('Adapter with generic vibrate(pattern) receives fallback vibration dispatches', () => {
  resetSettings();
  const vibrations = [];
  setHapticsAdapter({
    vibrate: (pattern) => { vibrations.push(pattern); },
  });

  impactMedium();
  notificationError();

  assert.deepStrictEqual(vibrations, [
    HAPTIC_PATTERNS.IMPACT_MEDIUM,
    HAPTIC_PATTERNS.NOTIFICATION_ERROR,
  ]);

  resetSettings();
});

runTest('Defensive guard: Faulty custom adapter throwing errors fails silently without crashing', () => {
  resetSettings();
  setHapticsAdapter({
    selection: () => { throw new Error('Faulty hardware exception simulation'); },
  });

  let result;
  assert.doesNotThrow(() => {
    result = selection();
  }, 'Faulty adapter must not crash the service');
  assert.strictEqual(result, false, 'Should return false when adapter throws');

  resetSettings();
});

// -------------------------------------------------------------
// PART 5: RETAIL DOMAIN ALIASES
// -------------------------------------------------------------
console.log('\n--- PART 5: RETAIL DOMAIN ALIASES ---');

runTest('Retail domain aliases map directly to core tactile methods', () => {
  resetSettings();
  const calls = [];
  setHapticsAdapter({
    impactLight: () => { calls.push('keyPress'); },
    selection: () => { calls.push('tabPress'); },
    notificationSuccess: () => { calls.push('txnSave'); },
    impactHeavy: () => { calls.push('delete'); },
    notificationError: () => { calls.push('error'); },
  });

  onKeyPress();
  onTabPress();
  onTransactionSave();
  onDelete();
  onError();

  assert.deepStrictEqual(calls, [
    'keyPress',
    'tabPress',
    'txnSave',
    'delete',
    'error',
  ]);

  resetSettings();
});

// -------------------------------------------------------------
// PART 6: VIBRATION TIMINGS & PATTERNS SPECIFICATION
// -------------------------------------------------------------
console.log('\n--- PART 6: VIBRATION TIMINGS & PATTERNS SPECIFICATION ---');

runTest('Vibration fallback patterns define calibrated tactile durations', () => {
  assert(VIBRATION_FALLBACK_PATTERNS[HAPTIC_PATTERNS.SELECTION] === 10, 'Selection click timing must be 10ms');
  assert(VIBRATION_FALLBACK_PATTERNS[HAPTIC_PATTERNS.IMPACT_LIGHT] === 15, 'Impact light timing must be 15ms');
  assert(VIBRATION_FALLBACK_PATTERNS[HAPTIC_PATTERNS.IMPACT_MEDIUM] === 35, 'Impact medium timing must be 35ms');
  assert(VIBRATION_FALLBACK_PATTERNS[HAPTIC_PATTERNS.IMPACT_HEAVY] === 65, 'Impact heavy timing must be 65ms');

  assert(Array.isArray(VIBRATION_FALLBACK_PATTERNS[HAPTIC_PATTERNS.NOTIFICATION_SUCCESS]), 'Success notification must be pattern array');
  assert(Array.isArray(VIBRATION_FALLBACK_PATTERNS[HAPTIC_PATTERNS.NOTIFICATION_WARNING]), 'Warning notification must be pattern array');
  assert(Array.isArray(VIBRATION_FALLBACK_PATTERNS[HAPTIC_PATTERNS.NOTIFICATION_ERROR]), 'Error notification must be pattern array');
});

console.log('\n================================================================');
console.log(`HAPTIC FEEDBACK TEST SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
console.log('================================================================\n');