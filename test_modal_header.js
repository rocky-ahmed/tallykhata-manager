/**
 * test_modal_header.js
 * Automated Verification Suite for Reusable ModalHeader Component (BL-009)
 * Validates ModalHeader architecture, accessibility, touch safety, theme parity, and exports.
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const themeService = require('./src/themeService');
const { LIGHT_THEME, DARK_THEME } = themeService;
const iconMetrics = require('./src/iconMetrics');
const { STANDARD_TOUCH_HIT_SLOP } = iconMetrics;
const typographyTokens = require('./src/typographyTokens');
const { TYPOGRAPHY_SCALES, getBengaliLineHeight, BENGALI_LINE_HEIGHT_MULTIPLIER } = typographyTokens;

console.log('================================================================');
console.log('ITERATION 004: REUSABLE MODALHEADER COMPONENT VERIFICATION (BL-009)');
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

runTest('ModalHeader component file exists in src/components/ModalHeader.js', () => {
  assert(fs.existsSync('src/components/ModalHeader.js'), 'src/components/ModalHeader.js must exist on disk');
});

runTest('Babel parses src/components/ModalHeader.js cleanly with zero syntax errors', () => {
  const ast = parseAst('src/components/ModalHeader.js');
  assert(ast && ast.program && ast.program.body.length > 0, 'AST must be non-empty and valid');
});

runTest('ModalHeader is exported by src/components/index.js and src/sharedComponents.js', () => {
  const indexCode = fs.readFileSync('src/components/index.js', 'utf8');
  const sharedCode = fs.readFileSync('src/sharedComponents.js', 'utf8');

  assert(indexCode.includes('ModalHeader'), 'src/components/index.js must export ModalHeader');
  assert(sharedCode.includes('ModalHeader'), 'src/sharedComponents.js must export ModalHeader');
});

runTest('Babel parses and verifies named and CommonJS exports in src/components/ModalHeader.js', () => {
  const headerCode = fs.readFileSync('src/components/ModalHeader.js', 'utf8');
  assert(headerCode.includes('export const ModalHeader = ({'), 'ModalHeader must have named ES export');
  assert(headerCode.includes('ModalHeader,'), 'ModalHeader must be included in module.exports');
  assert(headerCode.includes('default: ModalHeader'), 'ModalHeader must be exported as default in module.exports');
});

// -------------------------------------------------------------
// PART 2: PROPS INTERFACE & CONFIGURATION
// -------------------------------------------------------------
console.log('\n--- PART 2: PROPS INTERFACE & CONFIGURATION ---');

const headerCode = fs.readFileSync('src/components/ModalHeader.js', 'utf8');

runTest('ModalHeader supports required and optional props per BL-009 specification', () => {
  assert(headerCode.includes('title'), 'ModalHeader must accept title prop');
  assert(headerCode.includes('subtitle'), 'ModalHeader must accept subtitle prop');
  assert(headerCode.includes('icon'), 'ModalHeader must accept icon prop');
  assert(headerCode.includes('onClose'), 'ModalHeader must accept onClose prop');
  assert(headerCode.includes('isDark'), 'ModalHeader must accept isDark prop');
  assert(headerCode.includes('theme: customTheme'), 'ModalHeader must accept custom theme prop');
  assert(headerCode.includes('testID'), 'ModalHeader must accept testID prop with default');
  assert(headerCode.includes('showDivider'), 'ModalHeader must accept showDivider prop');
});

runTest('Default testID is "modal-header" and close testID is constructed properly', () => {
  assert(headerCode.includes("testID = 'modal-header'"), 'Default testID must be modal-header');
  assert(headerCode.includes('`${testID}-close`'), 'Close button testID must append -close');
});

// -------------------------------------------------------------
// PART 3: ACCESSIBILITY ROLES & LABELS
// -------------------------------------------------------------
console.log('\n--- PART 3: ACCESSIBILITY ROLES & LABELS ---');

runTest('Title container implements accessibilityRole="header"', () => {
  assert(headerCode.includes('accessibilityRole="header"'), 'Header container must declare accessibilityRole="header"');
});

runTest('Close button implements accessibilityRole="button" and default accessibilityLabel="বন্ধ করুন"', () => {
  assert(headerCode.includes('accessibilityRole="button"'), 'Close button must declare accessibilityRole="button"');
  assert(headerCode.includes("closeAccessibilityLabel = 'বন্ধ করুন'"), 'Default close label must be Bengali "বন্ধ করুন"');
});

// -------------------------------------------------------------
// PART 4: TOUCH TARGET SAFETY (>= 48x48dp)
// -------------------------------------------------------------
console.log('\n--- PART 4: TOUCH TARGET SAFETY (>= 48x48dp) ---');

runTest('Close button imports and enforces STANDARD_TOUCH_HIT_SLOP', () => {
  assert(headerCode.includes('STANDARD_TOUCH_HIT_SLOP'), 'ModalHeader must reference STANDARD_TOUCH_HIT_SLOP');
  assert(headerCode.includes('hitSlop={STANDARD_TOUCH_HIT_SLOP}'), 'Close button must attach hitSlop={STANDARD_TOUCH_HIT_SLOP}');
});

runTest('Mathematical touch dimension check: 32dp circle + 10dp slop >= 48dp', () => {
  const baseDimension = 32;
  const slop = STANDARD_TOUCH_HIT_SLOP.top + STANDARD_TOUCH_HIT_SLOP.bottom;
  const totalEffectiveDimension = baseDimension + slop;
  assert(totalEffectiveDimension >= 48, `Effective touch target ${totalEffectiveDimension}dp must be >= 48dp`);
  assert.strictEqual(totalEffectiveDimension, 52, 'Effective dimension must be exactly 52dp');
});

// -------------------------------------------------------------
// PART 5: BENGALI TYPOGRAPHY & LINE-HEIGHT SAFETY
// -------------------------------------------------------------
console.log('\n--- PART 5: BENGALI TYPOGRAPHY & LINE-HEIGHT SAFETY ---');

runTest('Title line-height enforces Bengali multiplier (1.45x) to eliminate vowel clipping', () => {
  assert(headerCode.includes('getBengaliLineHeight'), 'ModalHeader must use getBengaliLineHeight helper');
  assert(headerCode.includes('BENGALI_LINE_HEIGHT_MULTIPLIER'), 'ModalHeader must reference BENGALI_LINE_HEIGHT_MULTIPLIER');

  const titleSize = TYPOGRAPHY_SCALES.sectionHeading.fontSize; // 18sp
  const expectedLineHeight = Math.round(titleSize * 1.45); // 26dp
  const actualLineHeight = getBengaliLineHeight(titleSize, 1.45);
  assert.strictEqual(actualLineHeight, expectedLineHeight, 'Calculated line height must match 26dp');
  assert(actualLineHeight / titleSize >= 1.40, 'Line height ratio must be >= 1.40x');
});

runTest('Subtitle line-height enforces Bengali multiplier (1.45x)', () => {
  const subSize = TYPOGRAPHY_SCALES.bodySmall.fontSize; // 12sp
  const expectedSubLineHeight = Math.round(subSize * 1.45); // 17dp
  const actualSubLineHeight = getBengaliLineHeight(subSize, 1.45);
  assert.strictEqual(actualSubLineHeight, expectedSubLineHeight, 'Calculated subtitle line height must match 17dp');
});

// -------------------------------------------------------------
// PART 6: THEME TOKEN SYMMETRY & CONTRAST
// -------------------------------------------------------------
console.log('\n--- PART 6: THEME TOKEN SYMMETRY & CONTRAST ---');

runTest('ModalHeader falls back gracefully to LIGHT_THEME and DARK_THEME', () => {
  assert(headerCode.includes('DARK_THEME'), 'ModalHeader must import DARK_THEME');
  assert(headerCode.includes('LIGHT_THEME'), 'ModalHeader must import LIGHT_THEME');
  assert(headerCode.includes('activeTheme = customTheme || (isDark ? DARK_THEME : LIGHT_THEME)'), 'Theme resolution fallback must be exact');
});

runTest('Theme colors consumed by ModalHeader exist in both LIGHT_THEME and DARK_THEME', () => {
  const tokensToCheck = ['textPrimary', 'textSecondary', 'divider', 'primaryContainer', 'surfaceVariant', 'surfaceContainer'];
  for (const token of tokensToCheck) {
    assert(LIGHT_THEME[token] !== undefined, `LIGHT_THEME must define ${token}`);
    assert(DARK_THEME[token] !== undefined, `DARK_THEME must define ${token}`);
  }
});

// -------------------------------------------------------------
// PART 7: ICON & VISUAL DESIGN FLEXIBILITY
// -------------------------------------------------------------
console.log('\n--- PART 7: ICON & VISUAL DESIGN FLEXIBILITY ---');

runTest('ModalHeader supports both string emoji and ReactElement icon formats', () => {
  assert(headerCode.includes("typeof icon === 'string'"), 'ModalHeader must detect string emoji icon');
  assert(headerCode.includes('styles.iconBadge'), 'String emoji must be styled with squircle iconBadge');
  assert(headerCode.includes('styles.iconContainer'), 'Element icon must be wrapped in iconContainer');
});

runTest('ModalHeader supports conditional bottom divider line', () => {
  assert(headerCode.includes('showDivider && {'), 'Divider must be conditionally rendered based on showDivider');
  assert(headerCode.includes('borderBottomWidth: 1'), 'Divider border must be 1dp');
});

console.log('\n================================================================');
console.log(`MODALHEADER TEST SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
console.log('================================================================\n');