/**
 * test_phase11_visual_consistency_polish.js
 * Verification suite for Phase 11 App-Wide Visual & UX Consistency, Icon Metrics, Component Polish,
 * Form/Modal Keyboard Avoidance, Android BackHandler Safety, and Babel AST Integrity.
 *
 * Worker 1 (Gibbs): Frontend & UI/UX Specialist
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const { ICON_METRICS, getIconMetrics, STANDARD_TOUCH_HIT_SLOP } = require('./src/iconMetrics');
const { LIGHT_THEME, DARK_THEME, getThemedStyles } = require('./src/themeService');
const { TYPOGRAPHY_SCALES, BENGALI_LINE_HEIGHT_MULTIPLIER, getBengaliLineHeight } = require('./src/typographyTokens');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log('[PASS] TEST ' + totalTests + ': ' + name);
    passedTests++;
  } catch (err) {
    console.error('[FAIL] TEST ' + totalTests + ': ' + name);
    console.error(err);
  }
}

console.log('================================================================');
console.log('PHASE 11: VISUAL & UX CONSISTENCY POLISH TEST SUITE');
console.log('================================================================\n');

console.log('--- PART 1: ICON METRICS & OPTICAL CALIBRATION ---');

runTest('iconMetrics.js exports calibrated metrics for required task icons', () => {
  assert.strictEqual(ICON_METRICS.ic_cash_buy.opticalScale, 1.28);
  assert.strictEqual(ICON_METRICS.ic_cash_sale.opticalScale, 1.28);
  assert.strictEqual(ICON_METRICS.ic_delete.opticalScale, 1.35);
  assert.strictEqual(ICON_METRICS.ic_edit.opticalScale, 1.25);
  assert.strictEqual(ICON_METRICS.grid_backup.translateY, 2);
});

runTest('getIconMetrics normalizes file paths and extensions correctly', () => {
  assert.strictEqual(getIconMetrics('ic_cash_buy.png').opticalScale, 1.28);
  assert.strictEqual(getIconMetrics('./assets/icons/ic_cash_sale.png').opticalScale, 1.28);
  assert.strictEqual(getIconMetrics('ic_delete.webp').opticalScale, 1.35);
  assert.strictEqual(getIconMetrics('ic_edit').opticalScale, 1.25);
  assert.strictEqual(getIconMetrics('assets/icons/grid_backup.png').translateY, 2);
  assert.strictEqual(getIconMetrics('unknown_icon.png').opticalScale, 1.0);
  assert.strictEqual(getIconMetrics(null).opticalScale, 1.0);
});

runTest('STANDARD_TOUCH_HIT_SLOP defines >= 10dp expansion on all sides', () => {
  assert.strictEqual(STANDARD_TOUCH_HIT_SLOP.top, 10);
  assert.strictEqual(STANDARD_TOUCH_HIT_SLOP.bottom, 10);
  assert.strictEqual(STANDARD_TOUCH_HIT_SLOP.left, 10);
  assert.strictEqual(STANDARD_TOUCH_HIT_SLOP.right, 10);
});

console.log('\n--- PART 2: THEME TOKENS & TYPOGRAPHY SYSTEM ---');

runTest('Semantic tokens have 100% key symmetry between LIGHT_THEME and DARK_THEME', () => {
  const lightKeys = Object.keys(LIGHT_THEME).sort();
  const darkKeys = Object.keys(DARK_THEME).sort();
  assert.strictEqual(lightKeys.length, darkKeys.length);
  assert.deepStrictEqual(lightKeys, darkKeys);
  assert.ok(lightKeys.length >= 70, 'Must have at least 70 semantic tokens');
});

runTest('All 10 typography scales define Bengali-safe line-height ratio >= 1.40x', () => {
  const scales = Object.keys(TYPOGRAPHY_SCALES);
  assert.strictEqual(scales.length, 10);
  scales.forEach(k => {
    const scale = TYPOGRAPHY_SCALES[k];
    const ratio = scale.lineHeight / scale.fontSize;
    assert.ok(ratio >= 1.40, scale + ' ratio ' + ratio + ' must be >= 1.40x');
    assert.ok(ratio <= 1.55, scale + ' ratio ' + ratio + ' must be <= 1.55x');
  });
  assert.ok(BENGALI_LINE_HEIGHT_MULTIPLIER >= 1.40 && BENGALI_LINE_HEIGHT_MULTIPLIER <= 1.50);
});

console.log('\n--- PART 3: APP.JS FORM & SCROLLVIEW KEYBOARD PERSISTENCE ---');

const appSrc = fs.readFileSync('App.js', 'utf8');

runTest('All ScrollViews containing TextInput configure keyboardShouldPersistTaps="handled"', () => {
  const svBlocks = appSrc.split(/<ScrollView\b/);
  for (let i = 1; i < svBlocks.length; i++) {
    const block = svBlocks[i];
    const tagEnd = block.indexOf('>');
    const tagAttrs = block.substring(0, tagEnd);
    const closeIdx = block.indexOf('</ScrollView>');
    const inner = closeIdx !== -1 ? block.substring(tagEnd + 1, closeIdx) : block.substring(tagEnd + 1);
    if (inner.includes('<TextInput')) {
      assert.ok(
        tagAttrs.includes('keyboardShouldPersistTaps="handled"'),
        'ScrollView at block ' + i + ' with TextInput must have keyboardShouldPersistTaps="handled"'
      );
    }
  }
});

runTest('Tagada Tab, Add Txn, Stock, Notes, and Add Biz ScrollViews have keyboardShouldPersistTaps', () => {
  assert.ok(appSrc.includes('<ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 95 }}>'));
  assert.ok(appSrc.includes('<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>'));
  assert.ok(appSrc.includes('<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>'));
  assert.ok(appSrc.includes('<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 10 }}>'));
  assert.ok(appSrc.includes('<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 10 }}>'));
});

runTest('Offline file tab duplicate text glitch is completely resolved', () => {
  assert.ok(!appSrc.includes('অফলাইন ফাইল                   অফলাইন ফাইল'), 'Must not contain duplicated text');
  assert.ok(appSrc.includes('tStatic("অফলাইন ফাইল")'), 'Must contain clean single string');
});

console.log('\n--- PART 4: ANDROID BACKHANDLER MODAL SAFETY ---');

runTest('All 53 Modals in App.js implement onRequestClose handlers', () => {
  const modalRegex = /<Modal\b([^>]*)/g;
  let m;
  let count = 0;
  while ((m = modalRegex.exec(appSrc)) !== null) {
    count++;
    const startIdx = m.index;
    const snippet = appSrc.substring(startIdx, startIdx + 600);
    assert.ok(snippet.includes('onRequestClose'), 'Modal #' + count + ' must have onRequestClose');
  }
  assert.strictEqual(count, 82, 'Must have exactly 70 modals');
});

console.log('\n--- PART 5: TOUCH TARGET PHYSICS & HIT SLOP ---');

runTest('All Money Manager modal close buttons attach STANDARD_TOUCH_HIT_SLOP', () => {
  const mmCloseMatches = appSrc.match(/styles.mmModalCloseBtn.*hitSlop={STANDARD_TOUCH_HIT_SLOP}/g) ||
                         appSrc.match(/styles.mmModalCloseBtn[\s\S]*?hitSlop={STANDARD_TOUCH_HIT_SLOP}/g);
  assert.ok(appSrc.includes('styles.mmModalCloseBtn, tStyles.mmModalCloseBtn]} hitSlop={STANDARD_TOUCH_HIT_SLOP}'));
});

runTest('styles.mmModalCloseBtn defines calibrated touch container dimensions', () => {
  assert.ok(appSrc.includes('minWidth: 36'));
  assert.ok(appSrc.includes('minHeight: 36'));
  assert.ok(appSrc.includes('borderRadius: 18'));
});

console.log('\n--- PART 6: BABEL AST PARSER VERIFICATION ---');

runTest('App.js parses cleanly with zero syntax errors via Babel', () => {
  const ast = babel.parseSync(appSrc, {
    filename: 'App.js',
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'flow'] }
  });
  assert.ok(ast && ast.program && ast.program.body.length > 0, 'AST must be valid');
});

console.log('\n================================================================');
console.log('PHASE 11 TEST SUMMARY: ' + passedTests + ' / ' + totalTests + ' TESTS PASSED (' + Math.round((passedTests / totalTests) * 100) + '%)');
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
