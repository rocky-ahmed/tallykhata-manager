/**
 * test_iteration_222_tallypay_send_money_recharge_backend.js
 *
 * TALLYKHATA ITERATION 222: TALLYPAY SEND MONEY & MOBILE RECHARGE BACKEND SUITE
 * Milestone: REA-ITER-222
 */

const assert = require('assert');
const {
  TRANSACTION_LIMITS,
  RECHARGE_LIMITS,
  SUPPORTED_OPERATORS,
  detectOperator,
  validateSendMoney,
  initiateSendMoneyTransaction,
  validateMobileRecharge,
  initiateMobileRechargeTransaction,
} = require('./src/tallyPayService');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${name}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('================================================================');
console.log('  REA-ITER-222: SEND MONEY & RECHARGE BACKEND VERIFICATION      ');
console.log('================================================================\n');

// -------------------------------------------------------------
// Suite 1: Operator Detection
// -------------------------------------------------------------
console.log('--- Test Suite 1: Mobile Network Operator Detection ---');

runTest('detectOperator correctly identifies Grameenphone (017)', () => {
  const op = detectOperator('01712345678');
  assert.strictEqual(op.id, 'gp');
  assert.strictEqual(op.nameEn, 'Grameenphone');
});

runTest('detectOperator correctly identifies Grameenphone (013)', () => {
  const op = detectOperator('+8801312345678');
  assert.strictEqual(op.id, 'gp');
});

runTest('detectOperator correctly identifies Banglalink (019, 014)', () => {
  assert.strictEqual(detectOperator('01911223344').id, 'bl');
  assert.strictEqual(detectOperator('8801411223344').id, 'bl');
});

runTest('detectOperator correctly identifies Robi (018)', () => {
  assert.strictEqual(detectOperator('01811223344').id, 'robi');
});

runTest('detectOperator correctly identifies Airtel (016)', () => {
  assert.strictEqual(detectOperator('01611223344').id, 'airtel');
});

runTest('detectOperator correctly identifies Teletalk (015)', () => {
  assert.strictEqual(detectOperator('01511223344').id, 'teletalk');
});

runTest('detectOperator returns null for invalid or non-Bangladeshi numbers', () => {
  assert.strictEqual(detectOperator('01211223344'), null);
  assert.strictEqual(detectOperator(''), null);
  assert.strictEqual(detectOperator(null), null);
});

// -------------------------------------------------------------
// Suite 2: Send Money Validation & Limits
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Send Money Limits & Parameter Validation ---');

runTest('validateSendMoney rejects invalid or zero amount', () => {
  const res1 = validateSendMoney(0, '01711223344');
  assert.strictEqual(res1.valid, false);
  assert.ok(res1.error.includes('INVALID_AMOUNT'));

  const res2 = validateSendMoney(-50, '01711223344');
  assert.strictEqual(res2.valid, false);
});

runTest('validateSendMoney rejects malformed phone numbers', () => {
  const res = validateSendMoney(100, '12345');
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('INVALID_PHONE'));
});

runTest('validateSendMoney rejects below minimum amount (৳10)', () => {
  const res = validateSendMoney(5, '01711223344');
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('MIN_AMOUNT_LIMIT'));
});

runTest('validateSendMoney rejects above max per txn (৳25,000)', () => {
  const res = validateSendMoney(30000, '01711223344');
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('MAX_AMOUNT_LIMIT'));
});

runTest('validateSendMoney validates daily transaction count limit', () => {
  const fakeTxns = Array.from({ length: TRANSACTION_LIMITS.send_money.dailyMaxCount }, () => ({ amount: 100 }));
  const res = validateSendMoney(500, '01711223344', fakeTxns);
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('DAILY_COUNT_EXCEEDED'));
});

runTest('validateSendMoney validates daily cumulative amount limit', () => {
  const fakeTxns = [{ amount: 48000 }];
  const res = validateSendMoney(3000, '01711223344', fakeTxns);
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('DAILY_AMOUNT_EXCEEDED'));
});

runTest('validateSendMoney succeeds with valid inputs & computes free/zero fee', () => {
  const res = validateSendMoney(1500, '01711223344', []);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.amount, 1500);
  assert.strictEqual(res.paisa, 150000);
  assert.strictEqual(res.recipientPhone, '01711223344');
  assert.strictEqual(res.fee, 0);
  assert.strictEqual(res.netAmount, 1500);
});

// -------------------------------------------------------------
// Suite 3: Send Money Transaction Execution
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Send Money Transaction Execution ---');

runTest('initiateSendMoneyTransaction checks wallet balance and throws if insufficient', () => {
  const senderConfig = { accountNo: '01700000000' };
  assert.throws(() => {
    initiateSendMoneyTransaction(senderConfig, {
      amount: 1000,
      recipientPhone: '01711223344',
      currentBalance: 500,
    });
  }, /INSUFFICIENT_BALANCE/);
});

runTest('initiateSendMoneyTransaction successfully deducts balance and creates record', () => {
  const senderConfig = { accountNo: '01700000000' };
  const res = initiateSendMoneyTransaction(senderConfig, {
    amount: 1250,
    recipientPhone: '01899887766',
    currentBalance: 5000,
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.newBalance, 3750);
  assert.strictEqual(res.transaction.amount, 1250);
  assert.strictEqual(res.transaction.paisa, 125000);
  assert.strictEqual(res.transaction.recipientPhone, '01899887766');
  assert.strictEqual(res.transaction.direction, 'out');
  assert.strictEqual(res.transaction.type, 'send_money');
  assert.strictEqual(res.transaction.status, 'SUCCESS');
  assert.strictEqual(res.transaction.balanceBefore, 5000);
  assert.strictEqual(res.transaction.balanceAfter, 3750);
  assert.ok(res.transaction.transactionNumber.startsWith('TP-SEND-'));
});

// -------------------------------------------------------------
// Suite 4: Mobile Recharge Validation & Execution
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: Mobile Recharge Limits & Execution ---');

runTest('validateMobileRecharge validates operator detection & limits', () => {
  const res = validateMobileRecharge(50, '01912345678');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.operator.id, 'bl');
  assert.strictEqual(res.connectionType, 'prepaid');
  assert.strictEqual(res.fee, 0);
});

runTest('validateMobileRecharge rejects amounts below ৳10 and above ৳1000', () => {
  const resMin = validateMobileRecharge(5, '01712345678');
  assert.strictEqual(resMin.valid, false);
  assert.ok(resMin.error.includes('MIN_AMOUNT_LIMIT'));

  const resMax = validateMobileRecharge(1500, '01712345678');
  assert.strictEqual(resMax.valid, false);
  assert.ok(resMax.error.includes('MAX_AMOUNT_LIMIT'));
});

runTest('initiateMobileRechargeTransaction checks wallet balance and throws if insufficient', () => {
  const merchantConfig = { accountNo: '01700000000' };
  assert.throws(() => {
    initiateMobileRechargeTransaction(merchantConfig, {
      amount: 100,
      recipientPhone: '01712345678',
      currentBalance: 50,
    });
  }, /INSUFFICIENT_BALANCE/);
});

runTest('initiateMobileRechargeTransaction successfully executes recharge', () => {
  const merchantConfig = { accountNo: '01700000000' };
  const res = initiateMobileRechargeTransaction(merchantConfig, {
    amount: 100,
    recipientPhone: '01712345678',
    currentBalance: 1000,
    connectionType: 'prepaid',
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.newBalance, 900);
  assert.strictEqual(res.transaction.amount, 100);
  assert.strictEqual(res.transaction.operatorId, 'gp');
  assert.strictEqual(res.transaction.direction, 'out');
  assert.strictEqual(res.transaction.type, 'mobile_recharge');
  assert.strictEqual(res.transaction.status, 'SUCCESS');
  assert.ok(res.transaction.transactionNumber.startsWith('TP-RCG-'));
});

console.log('----------------------------------------------------------------');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: 0 (100% SUCCESS)`);
console.log('================================================================');
