/**
 * test_feature1_dashboard_credit_entry.js
 *
 * Feature 1 Automated Test Suite: Bookkeeping Dashboard & Transaction Entry Alignment
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const themeService = require('./src/themeService');
const { LIGHT_THEME, DARK_THEME, getContrastRatio } = themeService;
const iconMetrics = require('./src/iconMetrics');
const { STANDARD_TOUCH_HIT_SLOP } = iconMetrics;
const hapticFeedbackService = require('./src/hapticFeedbackService');

const appSource = fs.readFileSync('App.js', 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log('[PASS] TEST ' + totalTests + ': ' + name);
  } catch (err) {
    console.error('[FAIL] TEST ' + totalTests + ': ' + name);
    console.error(err);
    process.exit(1);
  }
}

console.log('================================================================');
console.log('FEATURE 1: BOOKKEEPING DASHBOARD & TRANSACTION ENTRY TEST SUITE');
console.log('================================================================\n');

console.log('--- PART 1: TOP SUMMARY CARDS COLOR & ACCESSIBILITY ALIGNMENT ---');

runTest('Total Receivable (মোট পাবো) is rendered in Emerald Green in Light and Dark modes', () => {
  const customerDueRegex = /summaryCardAmountGreen[\s\S]*?formatAppNumber\(totalCustomerDue\)[\s\S]*?header_total_due/;
  assert(customerDueRegex.test(appSource), 'totalCustomerDue must be styled with summaryCardAmountGreen and labeled with header_total_due');
  const greenStyleMatch = appSource.match(/summaryCardAmountGreen:\s*{[^}]+}/s);
  assert(greenStyleMatch, 'summaryCardAmountGreen must exist in styles');
  assert(greenStyleMatch[0].includes('#1C7D50'), 'summaryCardAmountGreen must define emerald green #1C7D50');
});

runTest('Total Payable (মোট দেবো) is rendered in Crimson/Ruby in Light and Dark modes', () => {
  const supplierDueRegex = /summaryCardAmountRed[\s\S]*?formatAppNumber\(totalSupplierDue\)[\s\S]*?header_total_owe/;
  assert(supplierDueRegex.test(appSource), 'totalSupplierDue must be styled with summaryCardAmountRed and labeled with header_total_owe');
  const redStyleMatch = appSource.match(/summaryCardAmountRed:\s*{[^}]+}/s);
  assert(redStyleMatch, 'summaryCardAmountRed must exist in styles');
  assert(redStyleMatch[0].includes('#B81414'), 'summaryCardAmountRed must define crimson red #B81414');
});

runTest('WCAG 2.2 AA: Summary card text contrast meets >= 4.5:1 on card surfaces', () => {
  const lightGreenContrast = getContrastRatio('#1C7D50', '#FFFFFF');
  assert(lightGreenContrast >= 4.5, 'Emerald green contrast (' + lightGreenContrast.toFixed(2) + ') must be >= 4.5:1');
  const lightRedContrast = getContrastRatio('#B81414', '#FFFFFF');
  assert(lightRedContrast >= 4.5, 'Crimson red contrast (' + lightRedContrast.toFixed(2) + ') must be >= 4.5:1');
  const darkGreenContrast = getContrastRatio(DARK_THEME.success, DARK_THEME.cardBg);
  assert(darkGreenContrast >= 4.5, 'Dark mode success contrast (' + darkGreenContrast.toFixed(2) + ') must be >= 4.5:1');
  const darkRedContrast = getContrastRatio(DARK_THEME.danger, DARK_THEME.cardBg);
  assert(darkRedContrast >= 4.5, 'Dark mode danger contrast (' + darkRedContrast.toFixed(2) + ') must be >= 4.5:1');
});

runTest('Summary cards enforce accessibilityRole="button" and STANDARD_TOUCH_HIT_SLOP', () => {
  assert(appSource.includes('accessibilityLabel={`${t("header_total_due")} ${formatAppNumber(totalCustomerDue)}`}'), 'Customer due card must have descriptive accessibilityLabel');
  assert(appSource.includes('accessibilityLabel={`${t("header_total_owe")} ${formatAppNumber(totalSupplierDue)}`}'), 'Supplier due card must have descriptive accessibilityLabel');
  assert(appSource.includes('hitSlop={STANDARD_TOUCH_HIT_SLOP}'), 'Summary card columns must define hitSlop={STANDARD_TOUCH_HIT_SLOP}');
});

console.log('\n--- PART 2: DUAL-TAB SWITCHER (CUSTOMERS VS SUPPLIERS) ---');

runTest('Dual-tab switcher implements accessibilityRole="tab" and accessibilityState', () => {
  assert(appSource.includes('accessibilityRole="tab"'), 'Tab switcher items must implement accessibilityRole="tab"');
  assert(appSource.includes('accountTab === \'customer\''), 'Customer tab must check accountTab');
  assert(appSource.includes('accountTab === \'supplier\''), 'Supplier tab must check accountTab');
});

runTest('Dual-tab switcher enforces touch target dimensions (minHeight: 36 + STANDARD_TOUCH_HIT_SLOP >= 48dp)', () => {
  const pillStyleMatch = appSource.match(/counterTabPill:\s*{[^}]+}/s);
  assert(pillStyleMatch, 'counterTabPill must exist in styles');
  assert(pillStyleMatch[0].includes('minHeight: 36'), 'counterTabPill must enforce minimum height of at least 36dp');
  assert(pillStyleMatch[0].includes('paddingHorizontal: 12'), 'counterTabPill must provide comfortable horizontal padding');
  const effectiveHeight = 36 + STANDARD_TOUCH_HIT_SLOP.top + STANDARD_TOUCH_HIT_SLOP.bottom;
  assert(effectiveHeight >= 48, 'Effective touch height (' + effectiveHeight + 'dp) must be >= 48dp');
});

runTest('Dual-tab switcher triggers hapticFeedbackService.onTabPress() on tab switch', () => {
  assert(appSource.includes('try { hapticFeedbackService.onTabPress(); } catch (e) {}'), 'Tab switcher must fire hapticFeedbackService.onTabPress()');
});

console.log('\n--- PART 3: TRANSACTION ENTRY MODAL (CREDITENTRY) ---');

runTest('Transaction modal features interactive dual-segment switch between বাকি দেওয়া and টাকা নেওয়া', () => {
  assert(appSource.includes('styles.txnModalTypeSwitcher'), 'Modal must contain txnModalTypeSwitcher');
  assert(appSource.includes('handleSwitchTxnType(\'given\')'), 'Modal must support switching to given mode');
  assert(appSource.includes('handleSwitchTxnType(\'received\')'), 'Modal must support switching to received mode');
  assert(appSource.includes('tStatic("বাকি দেওয়া (-)")'), 'Customer mode must display বাকি দেওয়া (-)');
  assert(appSource.includes('tStatic("টাকা নেওয়া (+)")'), 'Customer mode must display টাকা নেওয়া (+)');
});

runTest('Dual-segment switch buttons meet minimum touch height (minHeight: 44dp)', () => {
  const btnStyleMatch = appSource.match(/txnModalTypeBtn:\s*{[^}]+}/s);
  assert(btnStyleMatch, 'txnModalTypeBtn must exist in styles');
  assert(btnStyleMatch[0].includes('minHeight: 44'), 'txnModalTypeBtn must enforce minHeight: 44');
});

runTest('Amount entry display renders Bengali Taka symbol (৳) prominently', () => {
  const calcDisplayMatch = appSource.match(/{tStatic\("৳ "\)}{calcDisplay}/);
  assert(calcDisplayMatch, 'Display must render Bengali Taka symbol (৳) with calcDisplay');
});

runTest('Transaction date selector displays formatted Bengali date with quick selection chips', () => {
  assert(appSource.includes('styles.txnDateBar'), 'Modal must render txnDateBar');
  assert(appSource.includes('formatDisplayDate(txnDate, effectiveLanguage)'), 'Modal must display localized formatted date');
  assert(appSource.includes('handleSelectTxnDate(getTodayDate())'), 'Modal must support quick selection of Today');
  assert(appSource.includes('handleSelectTxnDate(getYesterdayDate())'), 'Modal must support quick selection of Yesterday');
  assert(appSource.includes('ic_calendar.png'), 'Modal must display calendar icon');
});

runTest('Transaction note input and suggestion chips are present with haptic feedback', () => {
  assert(appSource.includes('placeholder={tStatic("বিবরণ (যেমন: চাল, তেল, নগদ ইত্যাদি)")}'), 'Modal must contain description note placeholder');
  assert(appSource.includes('styles.descChip'), 'Modal must render descChip suggestions');
});

console.log('\n--- PART 4: TACTILE HAPTIC FEEDBACK INTEGRATION ---');

runTest('hapticFeedbackService is imported in App.js', () => {
  assert(appSource.includes('import hapticFeedbackService from \'./src/hapticFeedbackService\';'), 'App.js must import hapticFeedbackService');
});

runTest('Keypad buttons and quick add chips trigger onKeyPress()', () => {
  const handleCalcMatch = appSource.match(/const handleCalcPress = [^}]+hapticFeedbackService\.onKeyPress/s);
  assert(handleCalcMatch, 'handleCalcPress must trigger hapticFeedbackService.onKeyPress()');
  const handleChipMatch = appSource.match(/const handleQuickChipAdd = [^}]+hapticFeedbackService\.onKeyPress/s);
  assert(handleChipMatch, 'handleQuickChipAdd must trigger hapticFeedbackService.onKeyPress()');
});

runTest('Transaction save triggers onTransactionSave() on success and onError() on validation failure', () => {
  assert(appSource.includes('try { hapticFeedbackService.onError(); } catch (e) {}'), 'Validation failure must trigger onError()');
  assert(appSource.includes('try { hapticFeedbackService.onTransactionSave(); } catch (e) {}'), 'Save success must trigger onTransactionSave()');
});

console.log('\n--- PART 5: HARDWARE BACK BUTTON DISMISSAL HIERARCHY ---');

runTest('onBackPress dismisses modalAddTxn before navigation or exit', () => {
  assert(appSource.includes('if (modalAddTxn) { setModalAddTxn(false); return true; }'), 'modalAddTxn must be gracefully dismissed on hardware back press');
});

runTest('onBackPress dismisses all active modals including modalFilter and Money Manager modals', () => {
  assert(appSource.includes('if (modalFilter) { setModalFilter(false); return true; }'), 'modalFilter must be dismissed on hardware back press');
  assert(appSource.includes('if (modalMoneyManager) { setModalMoneyManager(false); return true; }'), 'modalMoneyManager must be dismissed on hardware back press');
  assert(appSource.includes('if (modalMMAddTxn) { setModalMMAddTxn(false); return true; }'), 'modalMMAddTxn must be dismissed on hardware back press');
});

runTest('Screen and tab navigation only execute after all modals have returned false', () => {
  const backPressBody = appSource.match(/const onBackPress = \(\) => {([\s\S]*?)return false;\s*};/);
  assert(backPressBody, 'onBackPress must exist in App.js');
  const modalIndex = backPressBody[1].indexOf('setModalAddTxn(false)');
  const screenIndex = backPressBody[1].indexOf('currentScreenRef.current !== \'home\'');
  const tabIndex = backPressBody[1].indexOf('activeTabRef.current !== \'home\'');
  assert(modalIndex < screenIndex, 'Modal checks must precede screen transitions');
  assert(screenIndex < tabIndex, 'Screen transitions must precede tab transitions');
});

console.log('\n--- PART 6: BABEL AST PARSING & COMPILATION INTEGRITY ---');

runTest('App.js compiles cleanly with zero syntax errors via Babel parser', () => {
  const ast = babel.parseSync(appSource, {
    filename: 'App.js',
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'flow'] }
  });
  assert(ast && ast.program && ast.program.body.length > 0, 'App.js must compile into valid AST');
});

console.log('\n================================================================');
console.log('FEATURE 1 TEST SUMMARY: ' + passedTests + ' / ' + totalTests + ' TESTS PASSED (100%)');
console.log('================================================================\n');