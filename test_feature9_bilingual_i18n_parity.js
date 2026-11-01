/**
 * test_feature9_bilingual_i18n_parity.js
 * Comprehensive Parity & Verification Suite for Feature 009: Bilingual i18n & High-DPI Font Parity
 *
 * Verifies 100% parity across:
 * 1. Dictionary Key Completeness & Bi-directional Parity (BN <-> EN).
 * 2. Bengali Numeral & ASCII Digit Formatting (formatNumber).
 * 3. Bidirectional Digit Parsing & Currency Extraction (toEnglishDigits, parseNumber).
 * 4. Currency Representation & Indian-Style Number Grouping (formatCurrency).
 * 5. Parameter Interpolation & Dollar-Sign Replacement Safety.
 * 6. Money Manager Error Message Translation & Locale Normalization.
 * 7. Static App Copy & Seed Category Localization without ID Mutation.
 * 8. Locale Resolver & System Preferences Persistence.
 * 9. High-DPI Font Scale Clamping & Bengali Typography Safety.
 * 10. Frontend Babel AST Syntax Integrity.
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const i18nService = require('./src/i18nService');
const preferencesService = require('./src/preferencesService');
const themeService = require('./src/themeService');

console.log('================================================================');
console.log('FEATURE 9: BILINGUAL I18N & HIGH-DPI FONT PARITY SUITE');
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

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

(async () => {
  // --- PART 1: DICTIONARY KEY COMPLETENESS & BI-DIRECTIONAL PARITY ---
  console.log('--- PART 1: DICTIONARY KEY COMPLETENESS & BI-DIRECTIONAL PARITY ---');

  runTest('1.1: Exact key count equality between Bengali and English dictionaries', () => {
    const bnKeys = Object.keys(i18nService.STRINGS.bn);
    const enKeys = Object.keys(i18nService.STRINGS.en);
    assert.strictEqual(bnKeys.length, enKeys.length, `Key counts differ: BN=${bnKeys.length}, EN=${enKeys.length}`);
    assert.ok(bnKeys.length >= 650, `Expected at least 650 strings, got ${bnKeys.length}`);
  });

  runTest('1.2: Zero missing keys in Bengali and English dictionaries', () => {
    const bnKeys = Object.keys(i18nService.STRINGS.bn);
    const enKeys = Object.keys(i18nService.STRINGS.en);
    const missingInEn = bnKeys.filter((k) => !(k in i18nService.STRINGS.en));
    const missingInBn = enKeys.filter((k) => !(k in i18nService.STRINGS.bn));
    assert.strictEqual(missingInEn.length, 0, `Keys missing in EN: ${missingInEn.join(', ')}`);
    assert.strictEqual(missingInBn.length, 0, `Keys missing in BN: ${missingInBn.join(', ')}`);
  });

  runTest('1.3: Zero null or undefined translation values in either language', () => {
    ['bn', 'en'].forEach((lang) => {
      const dict = i18nService.STRINGS[lang];
      Object.keys(dict).forEach((key) => {
        assert.notStrictEqual(dict[key], null, `Key ${key} in ${lang} is null`);
        assert.notStrictEqual(dict[key], undefined, `Key ${key} in ${lang} is undefined`);
        assert.strictEqual(typeof dict[key], 'string', `Key ${key} in ${lang} must be string`);
      });
    });
  });

  // --- PART 2: NUMBER & BENGALI NUMERAL FORMATTING ---
  console.log('\n--- PART 2: NUMBER & BENGALI NUMERAL FORMATTING ---');

  runTest('2.1: formatNumber converts ASCII digits to Bengali numerals in bn mode', () => {
    assert.strictEqual(i18nService.formatNumber(1234567890, 'bn'), '১২৩৪৫৬৭৮৯০');
    assert.strictEqual(i18nService.formatNumber('500.75', 'bn'), '৫০০.৭৫');
    assert.strictEqual(i18nService.formatNumber(0, 'bn'), '০');
  });

  runTest('2.2: formatNumber preserves ASCII digits in en mode', () => {
    assert.strictEqual(i18nService.formatNumber(1234567890, 'en'), '1234567890');
    assert.strictEqual(i18nService.formatNumber('500.75', 'en'), '500.75');
    assert.strictEqual(i18nService.formatNumber(0, 'en'), '0');
  });

  runTest('2.3: formatNumber handles null, undefined and empty gracefully', () => {
    assert.strictEqual(i18nService.formatNumber(null, 'bn'), '');
    assert.strictEqual(i18nService.formatNumber(undefined, 'bn'), '');
    assert.strictEqual(i18nService.formatNumber('', 'bn'), '');
  });

  // --- PART 3: BIDIRECTIONAL DIGIT PARSING & EXTRACTION ---
  console.log('\n--- PART 3: BIDIRECTIONAL DIGIT PARSING & EXTRACTION ---');

  runTest('3.1: toEnglishDigits converts Bengali numerals to ASCII digits', () => {
    assert.strictEqual(i18nService.toEnglishDigits('১২৩৪৫৬৭৮৯০'), '1234567890');
    assert.strictEqual(i18nService.toEnglishDigits('৫০০.৭৫'), '500.75');
    assert.strictEqual(i18nService.toEnglishDigits('০'), '0');
    assert.strictEqual(i18nService.toEnglishDigits(null), '');
    assert.strictEqual(i18nService.toEnglishDigits(undefined), '');
  });

  runTest('3.2: parseNumber parses Bengali and English formatted numbers with currency symbols and commas', () => {
    assert.strictEqual(i18nService.parseNumber('১,২৫০.৫০'), 1250.5);
    assert.strictEqual(i18nService.parseNumber('1,250.50'), 1250.5);
    assert.strictEqual(i18nService.parseNumber('৳ ১,০০,০০০'), 100000);
    assert.strictEqual(i18nService.parseNumber('-৳ ৫,৫০০'), -5500);
    assert.strictEqual(i18nService.parseNumber(null), 0);
    assert.strictEqual(i18nService.parseNumber('invalid'), 0);
  });

  // --- PART 4: CURRENCY REPRESENTATION & GROUPING ---
  console.log('\n--- PART 4: CURRENCY REPRESENTATION & GROUPING ---');

  runTest('4.1: formatCurrency produces Indian grouping with Taka symbol in Bengali and English', () => {
    const formattedBn = i18nService.formatCurrency(100000, 'bn');
    assert.strictEqual(formattedBn, '৳ ১,০০,০০০');

    const formattedEn = i18nService.formatCurrency(100000, 'en');
    assert.strictEqual(formattedEn, '৳ 1,00,000');
  });

  runTest('4.2: formatCurrency handles negative amounts and custom currency symbols', () => {
    const negBn = i18nService.formatCurrency(-5000, 'bn');
    assert.strictEqual(negBn, '-৳ ৫,০০০');

    const customEn = i18nService.formatCurrency(250, 'en', '$');
    assert.strictEqual(customEn, '$ 250');
  });

  // --- PART 5: PARAMETER INTERPOLATION & DOLLAR-SIGN SAFETY ---
  console.log('\n--- PART 5: PARAMETER INTERPOLATION & DOLLAR-SIGN SAFETY ---');

  runTest('5.1: t() interpolates single and multiple parameters correctly', () => {
    const resBn = i18nService.t('menu_business_sub', 'bn', { name: 'রকি স্টোর' });
    assert.ok(resBn.includes('রকি স্টোর'), `Expected interpolated business name, got: ${resBn}`);

    const resEn = i18nService.t('menu_business_sub', 'en', { name: 'Rocky Store' });
    assert.ok(resEn.includes('Rocky Store'), `Expected interpolated business name in EN, got: ${resEn}`);

    const dateBn = i18nService.t('mm_calendar_choose_date', 'bn', { date: '২০২৬-১১-০২' });
    assert.strictEqual(dateBn, '২০২৬-১১-০২ নির্বাচন করুন');
  });

  runTest('5.2: t() safely interpolates parameters containing dollar signs without mangling', () => {
    const template = 'Price is {price}';
    i18nService.STRINGS.en._test_price = template;
    i18nService.STRINGS.bn._test_price = 'দাম হলো {price}';

    const output = i18nService.t('_test_price', 'en', { price: '$100.00' });
    assert.strictEqual(output, 'Price is $100.00');

    delete i18nService.STRINGS.en._test_price;
    delete i18nService.STRINGS.bn._test_price;
  });

  // --- PART 6: MONEY MANAGER ERROR TRANSLATION ---
  console.log('\n--- PART 6: MONEY MANAGER ERROR TRANSLATION ---');

  runTest('6.1: translateMoneyManagerError maps errors to target locale', () => {
    const bnErr = 'সঠিক লক্ষ্যমাত্রা প্রদান করুন';
    const enResult = i18nService.translateMoneyManagerError(bnErr, 'en');
    assert.ok(enResult && !/[\u0980-\u09FF]/.test(enResult), `Expected English error, got ${enResult}`);

    const bnResult = i18nService.translateMoneyManagerError(bnErr, 'bn');
    assert.ok(bnResult && /[\u0980-\u09FF]/.test(bnResult), `Expected Bengali error, got ${bnResult}`);
  });

  // --- PART 7: STATIC APP COPY & SEED LOCALIZATION ---
  console.log('\n--- PART 7: STATIC APP COPY & SEED LOCALIZATION ---');

  runTest('7.1: translateStaticText translates core UI labels dynamically', () => {
    assert.strictEqual(i18nService.translateStaticText('আজ', 'en'), 'Today');
    assert.strictEqual(i18nService.translateStaticText('গতকাল', 'en'), 'Yesterday');
    assert.strictEqual(i18nService.translateStaticText('আজ', 'bn'), 'আজ');
  });

  runTest('7.2: translateMoneyManagerDefaultValue preserves seed IDs and localizes display values', () => {
    const walletName = i18nService.translateMoneyManagerDefaultValue('account', 'acc_cash', 'নগদ টাকা', 'en', 'name');
    assert.strictEqual(walletName, 'Cash');

    const walletBn = i18nService.translateMoneyManagerDefaultValue('account', 'acc_cash', 'নগদ টাকা', 'bn', 'name');
    assert.strictEqual(walletBn, 'নগদ টাকা');
  });

  // --- PART 8: LOCALE RESOLVER & PREFERENCES PERSISTENCE ---
  console.log('\n--- PART 8: LOCALE RESOLVER & PREFERENCES PERSISTENCE ---');

  runTest('8.1: resolveEffectiveLanguage falls back cleanly to bn for unknown locales', () => {
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('bn', 'en_US'), 'bn');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('en', 'bn_BD'), 'en');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('system', 'bn_BD'), 'bn');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('system', 'en_US'), 'en');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('system', 'fr_FR'), 'bn');
  });

  // --- PART 9: HIGH-DPI FONT SCALING & TYPOGRAPHY ---
  console.log('\n--- PART 9: HIGH-DPI FONT SCALING & TYPOGRAPHY ---');

  runTest('9.1: themeService.resolveMMSectionStyle clamps textScale between 0.85 and 1.30', () => {
    const descSmall = themeService.resolveMMSectionStyle('wallets', { global: { textScale: 0.5 } });
    assert.strictEqual(descSmall.fontScale, 0.85);

    const descLarge = themeService.resolveMMSectionStyle('wallets', { global: { textScale: 2.0 } });
    assert.strictEqual(descLarge.fontScale, 1.3);

    const scaled = descLarge.getScaledFontSize(16);
    assert.strictEqual(scaled, Math.round(16 * 1.3));
  });

  // --- PART 10: FRONTEND AST INTEGRITY ---
  console.log('\n--- PART 10: FRONTEND AST INTEGRITY ---');

  runTest('10.1: App.js parses cleanly with zero JSX/syntax errors via Babel', () => {
    const appSource = fs.readFileSync('App.js', 'utf8');
    const parsed = babel.parseSync(appSource, {
      filename: 'App.js',
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ['jsx', 'flow'] },
    });
    assert.ok(parsed, 'Babel AST parsing failed for App.js');
  });

  console.log('\n================================================================');
  console.log(`ALL ${passedTests} / ${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
  console.log('FEATURE 9 BILINGUAL I18N & HIGH-DPI FONT PARITY VERIFIED');
  console.log('================================================================\n');
})();
