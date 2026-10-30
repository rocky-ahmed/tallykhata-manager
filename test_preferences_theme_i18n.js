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

  // System modes must remain stored as preferences while the device determines their effective values.
  runTest('System theme and locale resolve without overwriting the selected modes', () => {
    const system = preferencesService.sanitizePreferences({ theme: 'system', language: 'system' });
    assert.strictEqual(system.theme, 'system');
    assert.strictEqual(system.language, 'system');
    assert.strictEqual(preferencesService.resolveEffectiveTheme(system.theme, 'dark'), 'dark');
    assert.strictEqual(preferencesService.resolveEffectiveTheme(system.theme, 'light'), 'light');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage(system.language, 'en-US'), 'en');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage(system.language, 'en_US'), 'en');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage(system.language, 'bn-BD'), 'bn');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage(system.language, 'fr-FR'), 'bn');
    assert.strictEqual(system.theme, 'system');
    assert.strictEqual(system.language, 'system');
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

  runTest('static app copy is English in English mode and repeated legacy UI phrases render once', () => {
    const appSource = fs.readFileSync('App.js', 'utf8');
    const ast = babel.parseSync(appSource, {
      filename: 'App.js',
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ['jsx', 'flow'] },
    });
    const untranslated = [];
    let checked = 0;
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'CallExpression'
        && node.callee?.type === 'Identifier'
        && ['tStatic', 'translateStaticText'].includes(node.callee.name)
        && node.arguments[0]?.type === 'StringLiteral') {
        checked++;
        const rendered = i18nService.translateStaticText(node.arguments[0].value, 'en');
        if (/[\u0980-\u09FF]/.test(rendered.replace(/৳/g, ''))) {
          untranslated.push({ line: node.loc?.start.line, source: node.arguments[0].value, rendered });
        }
      }
      for (const [key, value] of Object.entries(node)) {
        if (['loc', 'start', 'end', 'extra'].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    }
    visit(ast);
    assert(checked > 150, `Expected broad static UI coverage, checked only ${checked} strings`);
    assert.deepStrictEqual(untranslated, [], `Untranslated English UI strings: ${JSON.stringify(untranslated)}`);
    assert.strictEqual(i18nService.translateStaticText('  লিমিট                 লিমিট  ', 'bn'), '  লিমিট  ');
    assert.strictEqual(i18nService.translateStaticText('৳ ১০০০', 'en'), '৳ 1000');
  });

  runTest('built-in Money Manager labels localize only while their seed values remain unchanged', () => {
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('category', 'cat_food', 'খাবার ও মুদি বাজার', 'en'), 'Food and groceries');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('account', 'acc_cash', 'নগদ ক্যাশ (Cash)', 'en'), 'Cash');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('account', 'acc_cash', 'নগদ ক্যাশ (Cash)', 'bn'), 'নগদ টাকা');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('account', 'acc_cash', 'নগদ টাকা', 'bn'), 'নগদ টাকা');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('goal', 'goal_emergency', 'জরুরি তহবিল (Emergency Fund)', 'bn'), 'জরুরি তহবিল');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('schedule', 'rec_internet', 'ইন্টারনেট বিল (WiFi)', 'en'), 'Internet bill (Wi-Fi)');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('account', 'acc_cash', 'নগদ ক্যাশ (Cash)', 'bn'), 'নগদ টাকা');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('account', 'acc_cash', 'নগদ টাকা', 'bn'), 'নগদ টাকা');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('goal', 'goal_emergency', 'জরুরি তহবিল (Emergency Fund)', 'bn'), 'জরুরি তহবিল');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('schedule', 'rec_internet', 'ইন্টারনেট বিল (WiFi)', 'en'), 'Internet bill (Wi-Fi)');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('transaction', 'mmtxn_2', 'সাপ্তাহিক বাজার ও সদাই', 'en', 'note'), 'Weekly groceries');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('category', 'custom_category', 'খাবার ও মুদি বাজার', 'en'), 'খাবার ও মুদি বাজার');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('category', 'cat_food', 'আমার পছন্দের বাজার', 'en'), 'আমার পছন্দের বাজার');
    assert.strictEqual(i18nService.translateMoneyManagerDefaultValue('transaction', 'custom_txn', 'ব্যক্তিগত নোট', 'en', 'note'), 'ব্যক্তিগত নোট');
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
      'restore_online', 'mm_title', 'mm_tab_txns', 'mm_tab_wallets', 'mm_tab_budgets',
      'qa_backup', 'qa_tally_msg', 'qa_group_tagada', 'qa_biz_note', 'ledger_col_desc',
      'cb_cash_in_hand', 'mm_badge', 'mm_sub', 'mm_new_txn', 'mm_period_this_month', 'mm_period_last_month', 'mm_period_all_time',
      'header_inbox', 'header_support', 'cb_report', 'cb_baki_aday', 'cb_payment_given',
      'tallypay_merchant_wallet', 'empty_accounts_title', 'ledger_call', 'ledger_share_statement',
      'ledger_total', 'btn_gave_due', 'btn_gave_payment', 'btn_got_deposit', 'btn_got_due_product',
      'menu_sec_tallykhata', 'menu_item_bechakena', 'menu_item_expense', 'menu_item_baki',
      'menu_item_full_report', 'menu_item_malik', 'menu_item_stock', 'menu_item_notes',
      'mm_filter_all', 'mm_filter_expense', 'mm_filter_income', 'mm_filter_transfer',
      'mm_sort_label', 'mm_sort_newest', 'mm_sort_oldest', 'mm_sort_high', 'mm_sort_low',
      'mm_overall_budget', 'mm_add_wallet', 'mm_wallets_title'
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

  // Test 11: App.js wires localization across quick grid, ledger headers, and money manager
  runTest('App.js wires localization across quick grid, ledger headers, and money manager', () => {
    const appSource = fs.readFileSync('App.js', 'utf8');
    assert(appSource.includes('t("qa_multi_biz")') || appSource.includes("t('qa_multi_biz')"), 'Missing qa_multi_biz in App.js');
    assert(appSource.includes('t("qa_money_manager")') || appSource.includes("t('qa_money_manager')"), 'Missing qa_money_manager in App.js');
    assert(appSource.includes('t("mm_title")') || appSource.includes("t('mm_title')"), 'Missing mm_title in App.js');
    assert(appSource.includes('t("mm_tab_txns")') || appSource.includes("t('mm_tab_txns')"), 'Missing mm_tab_txns in App.js');
    assert(appSource.includes('t("cb_current_cash")') || appSource.includes("t('cb_current_cash')"), 'Missing cb_current_cash in App.js');
    assert(appSource.includes("t('header_inbox')"), 'Missing header_inbox in App.js');
    assert(appSource.includes("t('promo_transfer')"), 'Missing promo_transfer in App.js');
    assert(appSource.includes("t('menu_sec_tallykhata')"), 'Missing menu_sec_tallykhata in App.js');
    assert(appSource.includes("t('mm_filter_all')"), 'Missing mm_filter_all in App.js');
  });

  runTest('Android follows system appearance and system language comes from Expo device locales', () => {
    const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const appSource = fs.readFileSync('App.js', 'utf8');
    assert.strictEqual(appConfig.expo.userInterfaceStyle, 'automatic');
    assert(packageJson.dependencies['expo-system-ui'], 'System appearance requires the Expo system-ui native module');
    assert(packageJson.dependencies['expo-navigation-bar'], 'Android navigation bars must follow the global theme');
    assert(appSource.includes("from 'expo-localization'"), 'Missing Expo Localization integration');
    assert(appSource.includes('Localization.getLocales()'), 'System language must read the device locale');
    assert(appSource.includes('setSystemLocale(getDeviceLanguageTag())'), 'System locale must refresh on app resume');
    assert(appSource.includes("NavigationBar.setStyle(isDark ? 'dark' : 'light')"), 'Android navigation contrast must follow the effective app theme');
    assert(appSource.includes('SystemUI.setBackgroundColorAsync(currentTheme.screenBg)'), 'Android system UI background must follow the active theme');
    const navigationBarPlugin = appConfig.expo.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-navigation-bar');
    assert(navigationBarPlugin, 'Expo config must include the Android navigation bar plugin');
    assert.strictEqual(navigationBarPlugin[1].style, 'light', 'New installs must use dark navigation buttons on the default light surface');
    assert(!appSource.includes('Intl.DateTimeFormat().resolvedOptions().locale'), 'Do not use Intl as the Android system-locale source');
  });

  runTest('Menu and customer list dividers use the active theme tokens', () => {
    const dark = themeService.getThemedStyles(themeService.getThemeTokens('dark'), true);
    const light = themeService.getThemedStyles(themeService.getThemeTokens('light'), false);
    const appSource = fs.readFileSync('App.js', 'utf8');
    assert.strictEqual(dark.menuListItem.borderBottomColor, themeService.DARK_THEME.divider);
    assert.strictEqual(light.menuListItem.borderBottomColor, themeService.LIGHT_THEME.divider);
    assert.strictEqual(dark.customerListCard.borderBottomColor, themeService.DARK_THEME.divider);
    assert(appSource.includes('style={[styles.menuListItem, isDark && tStyles.menuListItem]}'), 'Menu rows must apply the active divider token');
    assert(!appSource.includes('style={styles.menuListItem}'), 'No Menu row should retain the unthemed separator');
    assert(appSource.includes('styles.customerListCard, isDark && tStyles.customerListCard'), 'Customer rows must apply the dark divider token');
  });

  runTest('Every literal app translation key used by App.js exists in both supported languages', () => {
    const appSource = fs.readFileSync('App.js', 'utf8');
    const keys = new Set([...appSource.matchAll(/\bt\(\s*["']([^"']+)["']/g)].map(match => match[1]));
    for (const key of keys) {
      assert(i18nService.STRINGS.bn[key], `Missing Bangla translation for ${key}`);
      assert(i18nService.STRINGS.en[key], `Missing English translation for ${key}`);
    }
  });

  // Test 9: getThemedStyles provides complete tokens for Light and Dark modes
  runTest('themeService.getThemedStyles returns comprehensive light and dark style tokens for all screens and Money Manager', () => {
    const light = themeService.getThemedStyles(themeService.LIGHT_THEME, false);
    const dark = themeService.getThemedStyles(themeService.DARK_THEME, true);

    const keys = [
      'screenBg', 'card', 'cardElevated', 'textPrimary', 'textSecondary',
      'tabBar', 'headerNav', 'summaryCard', 'customerCard', 'cashTopCard',
      'ledgerRow', 'modalSurface', 'mmScreen', 'mmHeader', 'mmTotalCard',
      'mmSubTabsContainer', 'mmCard', 'mmModalSheet', 'mmInput', 'mmTxnItem'
    ];

    keys.forEach(k => {
      assert(light[k] !== undefined, 'Light getThemedStyles missing: ' + k);
      assert(dark[k] !== undefined, 'Dark getThemedStyles missing: ' + k);
    });

    assert.strictEqual(light.card.backgroundColor, '#FFFFFF');
    assert.strictEqual(dark.card.backgroundColor, '#1E293B');
    assert.strictEqual(light.mmScreen.backgroundColor, '#F8FAFC');
    assert.strictEqual(dark.mmScreen.backgroundColor, '#0B1120');
    assert.strictEqual(light.mmHeader.backgroundColor, '#FFFFFF');
    assert.strictEqual(dark.mmHeader.backgroundColor, '#0F172A');
  });

  // Test 10: App.js integrates tStyles across main navigation and Money Manager
  runTest('App.js integrates tStyles across main navigation tabs, ledger, and Money Manager modal', () => {
    const appSource = fs.readFileSync('App.js', 'utf8');
    assert(appSource.includes('tStyles.mmHeader'), 'Missing tStyles.mmHeader in App.js');
    assert(appSource.includes('tStyles.mmTotalCard'), 'Missing tStyles.mmTotalCard in App.js');
    assert(appSource.includes('tStyles.mmSubTabsContainer'), 'Missing tStyles.mmSubTabsContainer in App.js');
    assert(appSource.includes('tStyles.tabBar'), 'Missing tStyles.tabBar in App.js');
    assert(appSource.includes('tStyles.screenBg'), 'Missing tStyles.screenBg in App.js');
    assert(appSource.includes('tStyles.card'), 'Missing tStyles.card in App.js');
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

  // Test 12: Home quick action grid and navigation pill use 3D tactile icon styling
  runTest('App.js provides 3D dimensional icons for quick action grid and tactile navigation pill', () => {
    const appSource = fs.readFileSync('App.js', 'utf8');
    assert(appSource.includes('quickGrid3DIcon'), 'Missing quickGrid3DIcon style in App.js');
    assert(appSource.includes('variant="primary"') && appSource.includes('variant="secondary"'), 'Quick grid must use colored 3D icon variants');
    assert(appSource.includes("borderTopColor: '#FFFFFF'") && appSource.includes("borderBottomColor: '#FECACA'"), 'tabActivePill must provide 3D bevel lighting');
  });


  // Test 13: System theme resolution
  runTest('resolveEffectiveTheme correctly derives effective appearance from system color scheme', () => {
    assert.strictEqual(preferencesService.resolveEffectiveTheme('system', 'dark'), 'dark');
    assert.strictEqual(preferencesService.resolveEffectiveTheme('system', 'light'), 'light');
    assert.strictEqual(preferencesService.resolveEffectiveTheme('system', null), 'light'); // fallback
    assert.strictEqual(preferencesService.resolveEffectiveTheme('dark', 'light'), 'dark'); // explicit override
    assert.strictEqual(preferencesService.resolveEffectiveTheme('light', 'dark'), 'light'); // explicit override
  });

  // Test 14: System language resolution
  runTest('resolveEffectiveLanguage correctly derives language from system locale with stable fallback', () => {
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('system', 'en-US'), 'en');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('system', 'en-GB'), 'en');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('system', 'bn-BD'), 'bn');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('system', 'bn-IN'), 'bn');
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('system', 'fr-FR'), 'bn'); // fallback for unsupported
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('system', null), 'bn'); // fallback
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('en', 'bn-BD'), 'en'); // explicit override
    assert.strictEqual(preferencesService.resolveEffectiveLanguage('bn', 'en-US'), 'bn'); // explicit override
  });

  // Test 15: Storing and sanitizing system mode preferences
  await runAsyncTest('preferencesService sanitizes and persists system mode preferences', async () => {
    const sanitized = preferencesService.sanitizePreferences({ theme: 'system', language: 'system' });
    assert.strictEqual(sanitized.theme, 'system');
    assert.strictEqual(sanitized.language, 'system');

    const adapter = createMockAdapter();
    await preferencesService.savePreferences(adapter, { theme: 'system', language: 'system' });
    const stored = await preferencesService.getStoredPreferences(adapter);
    assert.strictEqual(stored.theme, 'system');
    assert.strictEqual(stored.language, 'system');
  });

  // Test 16: App.js wires System theme and language options in picker modals
  runTest('App.js wires System theme and language options in modal pickers and Menu tab', () => {
    const appSource = fs.readFileSync('App.js', 'utf8');
    assert(appSource.includes("handleToggleTheme('system')"), 'App.js missing handleToggleTheme system option');
    assert(appSource.includes("handleSelectLanguage('system')"), 'App.js missing handleSelectLanguage system option');
    assert(appSource.includes("resolveEffectiveTheme"), 'App.js missing resolveEffectiveTheme');
    assert(appSource.includes("resolveEffectiveLanguage"), 'App.js missing resolveEffectiveLanguage');
    assert(appSource.includes("theme_system"), 'App.js missing theme_system translation key');
    assert(appSource.includes("lang_system"), 'App.js missing lang_system translation key');
    assert(appSource.includes("t('lang_english_sub')"), 'English language option must be localized in both app languages');
    assert(appSource.includes("t('lang_bn_sub')"), 'Bangla language option must be localized in both app languages');
    assert(appSource.includes("t('theme_light_sub')") && appSource.includes("t('theme_dark_sub')"), 'Theme option descriptions must be localized');
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
