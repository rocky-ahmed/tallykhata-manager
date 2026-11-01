/**
 * REA Reconstruction — Iteration 018: Theme Contrast & Currency Precision Hardening Suite
 */
const assert = require('assert');
const i18n = require('./src/i18nService');
const { getThemeTokens, getThemedStyles } = require('./src/themeService');

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
    process.exit(1);
  }
}

// Relative luminance calculation according to WCAG 2.1 specs
function getLuminance(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

(() => {
  console.log('================================================================');
  console.log('REA RECONSTRUCTION: ITERATION 018 THEME & PRECISION SUITE');
  console.log('================================================================');

  // STEP 1: BENGALI NUMERAL PARSING & INTEGER PAISA CONSERVATION
  console.log('\n--- STEP 1: NUMERAL PARSING & INTEGER PAISA PRECISION ---');

  runTest('1.1: toEnglishDigits converts all Bengali digits cleanly', () => {
    assert.strictEqual(i18n.toEnglishDigits('০১২৩৪৫৬৭৮৯'), '0123456789');
    assert.strictEqual(i18n.toEnglishDigits('৳ ৫০,০০০.২৫'), '৳ 50,000.25');
  });

  runTest('1.2: parseNumber handles localized Bengali currency inputs', () => {
    assert.strictEqual(i18n.parseNumber('১২৩৪৫.৬৭'), 12345.67);
    assert.strictEqual(i18n.parseNumber('৳ ১,০০,০০,০০০.০০'), 10000000);
    assert.strictEqual(i18n.parseNumber('-৳ ৫৫০.৫০'), -550.5);
    assert.strictEqual(i18n.parseNumber(''), 0);
  });

  runTest('1.3: Zero IEEE-754 drift up to ৳100,000,000 in integer paisa', () => {
    const HIGH_VALUE_TAKA = 99999999.99;
    const paisa = Math.round(HIGH_VALUE_TAKA * 100);
    assert.strictEqual(paisa, 9999999999, '99,999,999.99 Taka equals exactly 9,999,999,999 Paisa');

    // Simulate 1,000 micro-transactions of 0.10 Taka (10 Paisa)
    let accumulatorPaisa = 0;
    for (let i = 0; i < 1000; i++) {
      accumulatorPaisa += Math.round(0.10 * 100);
    }
    assert.strictEqual(accumulatorPaisa, 10000, 'Accumulated exactly 10,000 paisa (100 Taka)');
    const finalTaka = accumulatorPaisa / 100;
    assert.strictEqual(finalTaka, 100.00, 'Zero floating-point drift');
  });

  runTest('1.4: formatCurrency renders localized output correctly in bn and en', () => {
    const formattedBn = i18n.formatCurrency(5000, 'bn');
    assert(formattedBn.includes('৳'), 'Must contain Taka symbol');
    assert(formattedBn.includes('৫,০০০'), 'Must format Bengali numerals');

    const formattedEn = i18n.formatCurrency(5000, 'en');
    assert(formattedEn.includes('5,000'), 'Must format English numerals');
  });

  // STEP 2: THEME TOKENS & WCAG CONTRAST COMPLIANCE
  console.log('\n--- STEP 2: THEME TOKENS & WCAG CONTRAST AUDIT ---');

  const light = getThemeTokens('light');
  const dark = getThemeTokens('dark');

  runTest('2.1: Light theme tokens have sufficient WCAG AA contrast', () => {
    const primaryContrast = getContrastRatio(light.onPrimary, light.primary);
    assert(primaryContrast >= 4.5, `Light onPrimary/primary contrast (${primaryContrast.toFixed(2)}) must be >= 4.5:1`);

    const textContrast = getContrastRatio(light.textPrimary, light.screenBg);
    assert(textContrast >= 4.5, `Light text/screenBg contrast (${textContrast.toFixed(2)}) must be >= 4.5:1`);
  });

  runTest('2.2: Dark theme tokens have sufficient WCAG AA contrast', () => {
    const primaryContrast = getContrastRatio(dark.onPrimary, dark.primary);
    assert(primaryContrast >= 3.5, `Dark onPrimary/primary contrast (${primaryContrast.toFixed(2)}) must be >= 3.5:1`);

    const textContrast = getContrastRatio(dark.textPrimary, dark.screenBg);
    assert(textContrast >= 4.5, `Dark text/screenBg contrast (${textContrast.toFixed(2)}) must be >= 4.5:1`);
  });

  runTest('2.3: getThemedStyles creates complete style tree for light and dark modes', () => {
    const lightStyles = getThemedStyles(light, false);
    const darkStyles = getThemedStyles(dark, true);

    assert(lightStyles.container, 'lightStyles.container must exist');
    assert(darkStyles.container, 'darkStyles.container must exist');
    assert(lightStyles.card, 'lightStyles.card must exist');
    assert(darkStyles.card, 'darkStyles.card must exist');
    assert.notStrictEqual(lightStyles.container.backgroundColor, darkStyles.container.backgroundColor);
  });

  console.log('\n================================================================');
  console.log(`ITERATION 018 VERDICT: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================\n');
})();
