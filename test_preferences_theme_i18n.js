const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');
const preferencesService = require('./src/preferencesService');
const themeService = require('./src/themeService');
const i18nService = require('./src/i18nService');

function createMockAdapter(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: async (k) => (map.has(k) ? map.get(k) : null),
    setItem: async (k, v) => { map.set(k, String(v)); },
    removeItem: async (k) => { map.delete(k); },
    clear: async () => { map.clear(); },
    _map: map,
  };
}

console.log('================================================================');
console.log('TALLYKHATA PREFERENCES, THEME & LOCALIZATION TEST SUITE');
console.log('================================================================');

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

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`[PASS] TEST ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] TEST ${total}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

(async () => {
  // Test 1: Preferences defaults and sanitization
  runTest('preferencesService defaults to Light theme and Bangla language', () => {
    const def = preferencesService.DEFAULT_PREFERENCES;
    assert.strictEqual(def.theme, 'light');
    assert.strictEqual(def.language, 'bn');

    const sanitizedNull = preferencesService.sanitizePreferences(null);
    assert.strictEqual(sanitizedNull.theme, 'light');
    assert.strictEqual(sanitizedNull.language, 'bn');

    const sanitizedInvalid = preferencesService.sanitizePreferences({ theme: 'sepia', language: 'fr' });
    assert.strictEqual(sanitizedInvalid.theme, 'light');
    assert.strictEqual(sanitizedInvalid.language, 'bn');

    const validDarkEn = preferencesService.sanitizePreferences({ theme: 'dark', language: 'en' });
    assert.strictEqual(validDarkEn.theme, 'dark');
    assert.strictEqual(validDarkEn.language, 'en');
  });

  // Test 2: Preferences storage persistence
  await runAsyncTest('getStoredPreferences and savePreferences persist to storage adapter', async () => {
    const adapter = createMockAdapter();
    const initial = await preferencesService.getStoredPreferences(adapter);
    assert.strictEqual(initial.theme, 'light');
    assert.strictEqual(initial.language, 'bn');

    await preferencesService.savePreferences(adapter, { theme: 'dark', language: 'en' });
    const updated = await preferencesService.getStoredPreferences(adapter);
    assert.strictEqual(updated.theme, 'dark');
    assert.strictEqual(updated.language, 'en');
    assert(updated.updatedAt, 'updatedAt timestamp must be set');
  });

  // Test 3: Theme tokens structure and contrast safety
  runTest('themeService provides complete tokens for Light and Dark modes', () => {
    const light = themeService.getThemeTokens('light');
    const dark = themeService.getThemeTokens('dark');

    const requiredKeys = [
      'mode', 'isDark', 'screenBg', 'headerBg', 'headerText', 'cardBg',
      'cardBorder', 'inputBg', 'inputBorder', 'inputText', 'textPrimary',
      'textSecondary', 'tabBarBg', 'modalSurface', 'divider', 'primary',
      'success', 'danger', 'warning', 'info'
    ];

    requiredKeys.forEach(k => {
      assert(light[k] !== undefined, `Light theme missing token: ${k}`);
      assert(dark[k] !== undefined, `Dark theme missing token: ${k}`);
    });

    assert.strictEqual(light.isDark, false);
    assert.strictEqual(dark.isDark, true);
    assert.notStrictEqual(light.screenBg, dark.screenBg);
    assert.notStrictEqual(light.textPrimary, dark.textPrimary);
  });

  // Test 4: Icon theme palettes for Light and Dark
  runTest('themeService provides tactile 3D icon palettes for all variants in Light and Dark', () => {
    const variants = ['primary', 'success', 'danger', 'warning', 'info', 'purple', 'neutral', 'secondary', 'white'];
    variants.forEach(v => {
      const iconLight = themeService.getIconTheme(v, 'light');
      assert(iconLight.bg, `Light icon variant ${v} missing bg`);
      assert(iconLight.tint, `Light icon variant ${v} missing tint`);
      assert(iconLight.borderTop, `Light icon variant ${v} missing borderTop`);
      assert(iconLight.borderBottom, `Light icon variant ${v} missing borderBottom`);

      const iconDark = themeService.getIconTheme(v, 'dark');
      assert(iconDark.bg, `Dark icon variant ${v} missing bg`);
      assert(iconDark.tint, `Dark icon variant ${v} missing tint`);
    });
  });

  // Test 5: i18n number and currency formatting
  runTest('i18nService formats numbers and currency correctly in Bangla and English', () => {
    assert.strictEqual(i18nService.formatNumber(12345, 'bn'), '১২৩৪৫');
    assert.strictEqual(i18nService.formatNumber(12345, 'en'), '12345');
    assert.strictEqual(i18nService.formatNumber(0, 'bn'), '০');
    assert.strictEqual(i18nService.formatNumber(null, 'bn'), '');

    const currBn = i18nService.formatCurrency(5000, 'bn');
    assert(currBn.includes('৫,০০০') || currBn.includes('৫০০০'), `Expected Bengali 5000, got: ${currBn}`);
    assert(currBn.includes('৳'), 'Must include currency symbol');

    const currEn = i18nService.formatCurrency(5000, 'en');
    assert(currEn.includes('5,000'), `Expected English 5,000, got: ${currEn}`);

    const negBn = i18nService.formatCurrency(-750, 'bn');
    assert(negBn.startsWith('-'), 'Negative currency must have negative sign');
  });

  // Test 6: i18n translations coverage
  runTest('i18nService provides complete translations for navigation, menus, and actions', () => {
    const testKeys = [
      'tab_home', 'tab_cashbox', 'tab_tallypay', 'tab_menu',
      'qa_cash_sale', 'qa_expense', 'qa_cash_purchase', 'qa_owner_cash',
      'qa_money_manager', 'qa_multi_biz', 'qa_stock', 'qa_reports',
      'btn_give_credit', 'btn_receive_cash', 'btn_save', 'btn_cancel',
      'menu_title', 'menu_appearance', 'menu_language', 'menu_business_management',
      'menu_money_manager', 'menu_backup_restore', 'backup_title', 'backup_now',
      'restore_online', 'mm_title', 'mm_tab_txns', 'mm_tab_wallets', 'mm_tab_budgets'
    ];

    testKeys.forEach(k => {
      const bnText = i18nService.t(k, 'bn');
      const enText = i18nService.t(k, 'en');
      assert(bnText && bnText !== k, `Missing Bangla translation for: ${k}`);
      assert(enText && enText !== k, `Missing English translation for: ${k}`);
      assert.notStrictEqual(bnText, enText, `Bangla and English should differ for: ${k}`);
    });
  });

  // Test 7: i18n parameter interpolation
  runTest('i18nService interpolates parameters correctly', () => {
    const textBn = i18nService.t('menu_business_sub', 'bn', { name: 'রহিম ট্রেডার্স' });
    assert(textBn.includes('রহিম ট্রেডার্স'), 'Must contain interpolated name in Bangla');

    const textEn = i18nService.t('menu_business_sub', 'en', { name: 'Rahim Traders' });
    assert(textEn.includes('Rahim Traders'), 'Must contain interpolated name in English');
  });

  // Test 8: App.js integrates ThemeContext, themeService, and i18nService
  runTest('App.js syntax validates via Babel and exports/integrates theme and i18n', () => {
    const appSource = fs.readFileSync('App.js', 'utf8');
    babel.parseSync(appSource, {
      filename: 'App.js',
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ['jsx', 'flow'] },
    });

    assert(appSource.includes("preferencesService.getStoredPreferences"), "Missing getStoredPreferences call in App.js");
    assert(appSource.includes("appTheme"), "Missing appTheme state in App.js");
    assert(appSource.includes("appLanguage"), "Missing appLanguage state in App.js");
  });

  console.log(`\n================================================================`);
  console.log(`PREFERENCES, THEME & LOCALIZATION SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log(`================================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
