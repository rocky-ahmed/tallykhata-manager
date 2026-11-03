/**
 * test_iteration_221_ui_tallypay_and_soundbox.js
 *
 * TALLYKHATA ITERATION 221: TALLYPAY & SOUNDBOX UI & MODAL SUITE
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Milestone: REA-ITER-221
 */

const assert = require('assert');
const fs = require('fs');
const i18nService = require('./src/i18nService');
const tallyPayService = require('./src/tallyPayService');
const soundboxService = require('./src/soundboxService');

const testQueue = [];
let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  testQueue.push({ name, fn, isAsync: false });
}

function runAsyncTest(name, fn) {
  testQueue.push({ name, fn, isAsync: true });
}

console.log('================================================================================');
console.log('TALLYKHATA ITERATION 221: TALLYPAY & SOUNDBOX UI & MODAL SUITE');
console.log('Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)');
console.log('Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b');
console.log('================================================================================');

// Read App.js for static UI/UX verification
const appJsCode = fs.readFileSync('App.js', 'utf8');

// -----------------------------------------------------------------------------
// TEST 1: Service Wiring & Component Declarations in App.js
// -----------------------------------------------------------------------------
runTest('App.js Service Imports & Component Wiring', () => {
  assert.ok(appJsCode.includes("import * as tallyPayModule from './src/tallyPayService'"), 'tallyPayModule must be imported in App.js');
  assert.ok(appJsCode.includes('const tallyPayService = tallyPayModule'), 'tallyPayService helper must be declared');
  assert.ok(appJsCode.includes("import * as soundboxModule from './src/soundboxService'"), 'soundboxModule must be imported in App.js');
  assert.ok(appJsCode.includes('const soundboxService = soundboxModule'), 'soundboxService helper must be declared');
  assert.ok(appJsCode.includes('modalAddMoney'), 'modalAddMoney state must be present');
  assert.ok(appJsCode.includes('addMoneyAmount'), 'addMoneyAmount state must be present');
  assert.ok(appJsCode.includes('addMoneyMethod'), 'addMoneyMethod state must be present');
});

// -----------------------------------------------------------------------------
// TEST 2: Add Money Channels & Bengali Quick Amount Chips
// -----------------------------------------------------------------------------
runTest('TallyPay Add Money Modal contains channels and quick chips', () => {
  assert.ok(appJsCode.includes("['bKash', 'Nagad', 'Rocket', 'Upay', 'Visa / Card', 'Bank']"), 'Channels list must include MFS and Cards');
  assert.ok(appJsCode.includes("{ label: '৳১০০', val: '100' }"), 'Quick chip ৳১০০ must be present');
  assert.ok(appJsCode.includes("{ label: '৳৫০০', val: '500' }"), 'Quick chip ৳৫০০ must be present');
  assert.ok(appJsCode.includes("{ label: '৳১,০০০', val: '1000' }"), 'Quick chip ৳১,০০০ must be present');
  assert.ok(appJsCode.includes("{ label: '৳৫,০০০', val: '5000' }"), 'Quick chip ৳৫,০০০ must be present');
  assert.ok(appJsCode.includes('tallypay_min_limit_hint'), 'Limit hint must be present');
  assert.ok(appJsCode.includes('tallypay_zero_fee'), 'Zero fee badge must be present');
});

// -----------------------------------------------------------------------------
// TEST 3: Soundbox Audio Announcement Banner in Super QR Success Modal
// -----------------------------------------------------------------------------
runTest('Super QR Success Modal contains Soundbox audio banner', () => {
  assert.ok(appJsCode.includes('soundbox_voice_banner_title'), 'Soundbox voice banner title key must be referenced');
  assert.ok(appJsCode.includes('soundbox_voice_received_prefix'), 'Soundbox voice received prefix key must be referenced');
  assert.ok(appJsCode.includes('🔊'), 'Soundbox audio speaker icon/emoji must be rendered');
});

// -----------------------------------------------------------------------------
// TEST 4: Transaction Limit Modal Strings Cleanliness & Symmetrical Keys
// -----------------------------------------------------------------------------
runTest('modalTxnLimit strings are clean without duplicate spacing', () => {
  assert.ok(!appJsCode.includes('লিমিট                 লিমিট'), 'Duplicated limit string must be eliminated');
  assert.ok(!appJsCode.includes('চার্জ                 চার্জ'), 'Duplicated charge string must be eliminated');
  assert.ok(!appJsCode.includes('স্ট্যান্ডার্ড একাউন্ট                         স্ট্যান্ডার্ড একাউন্ট'), 'Duplicated standard account string must be eliminated');

  // Verify bilingual keys in i18nService
  const bn = i18nService.STRINGS.bn;
  const en = i18nService.STRINGS.en;

  const requiredKeys = [
    'tallypay_add_money_title',
    'tallypay_select_channel',
    'tallypay_min_limit_hint',
    'tallypay_quick_100',
    'tallypay_quick_500',
    'tallypay_quick_1000',
    'tallypay_quick_5000',
    'tallypay_add_money_btn',
    'tallypay_zero_fee',
    'soundbox_voice_banner_title',
    'soundbox_voice_received_prefix',
  ];

  for (const k of requiredKeys) {
    assert.ok(bn[k], `Missing Bengali translation for ${k}`);
    assert.ok(en[k], `Missing English translation for ${k}`);
  }
});

// -----------------------------------------------------------------------------
// TEST 5: WCAG Touch Targets, HitSlop & Accessibility
// -----------------------------------------------------------------------------
runTest('WCAG Touch Targets, HitSlop & Accessibility Compliance', () => {
  assert.ok(appJsCode.includes('hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}'), 'Modal close button must have generous touch hitSlop');
  assert.ok(appJsCode.includes('styles.paymentMethodChip'), 'Payment method chips must use styled container');
  assert.ok(appJsCode.includes('styles.paymentMethodChipActive'), 'Active payment method chip must have distinct active styling');
});

// -----------------------------------------------------------------------------
// TEST 6: Hardware BackHandler Safety
// -----------------------------------------------------------------------------
runTest('Android BackHandler Safety on Modals', () => {
  assert.ok(appJsCode.includes('onRequestClose={() => setModalAddMoney(false)}'), 'Add money modal must safely handle hardware back press');
  assert.ok(appJsCode.includes('onRequestClose={() => setSuperQrSuccessModal(false)}'), 'Success modal must safely handle hardware back press');
  assert.ok(appJsCode.includes('onRequestClose={() => setModalTxnLimit(false)}'), 'Transaction limit modal must safely handle hardware back press');
});

// -----------------------------------------------------------------------------
// TEST 7: Translation Resolution in both Bengali and English
// -----------------------------------------------------------------------------
runTest('i18nService translates TallyPay and Soundbox strings cleanly', () => {
  const titleBn = i18nService.t('tallypay_add_money_title', 'bn');
  const titleEn = i18nService.t('tallypay_add_money_title', 'en');
  assert.strictEqual(titleBn, 'ওয়ালেটে অ্যাড মানি');
  assert.strictEqual(titleEn, 'Add Money to Wallet');

  const zeroFeeBn = i18nService.t('tallypay_zero_fee', 'bn');
  const zeroFeeEn = i18nService.t('tallypay_zero_fee', 'en');
  assert.ok(zeroFeeBn.includes('১০০% ফ্রি'));
  assert.ok(zeroFeeEn.includes('100% Free'));

  const sbTitleBn = i18nService.t('soundbox_voice_banner_title', 'bn');
  const sbTitleEn = i18nService.t('soundbox_voice_banner_title', 'en');
  assert.ok(sbTitleBn.includes('সাউন্ডবক্স'));
  assert.ok(sbTitleEn.includes('Soundbox'));
});

// -----------------------------------------------------------------------------
// Test Execution Runner
// -----------------------------------------------------------------------------
async function runAll() {
  for (const t of testQueue) {
    totalTests++;
    try {
      if (t.isAsync) {
        await t.fn();
      } else {
        t.fn();
      }
      passedTests++;
      console.log(`  ✓ [PASS] ${t.name}`);
    } catch (err) {
      console.error(`  ✗ [FAIL] ${t.name}`);
      console.error(err);
      process.exit(1);
    }
  }

  console.log('--------------------------------------------------------------------------------');
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: 0 (100% SUCCESS)`);
  console.log('================================================================================');
}

runAll().catch(e => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
