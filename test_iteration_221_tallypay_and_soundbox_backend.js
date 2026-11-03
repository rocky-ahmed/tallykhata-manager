/**
 * test_iteration_221_tallypay_and_soundbox_backend.js
 *
 * TALLYKHATA ITERATION 221: TALLYPAY ADD MONEY, TRANSACTION LIMITS & SOUNDBOX BACKEND SUITE
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 * Milestone: REA-ITER-221
 */

const assert = require('assert');
const {
  TRANSACTION_LIMITS,
  SERVICE_CHARGES,
  SUPPORTED_ADD_MONEY_CHANNELS,
  calculateServiceFee,
  validateAddMoney,
  initiateAddMoneyTransaction,
} = require('./src/tallyPayService');

const {
  generateSoundboxPrompt,
  SoundboxQueueManager,
  soundboxQueueManager,
} = require('./src/soundboxService');

const {
  StorageRepository,
  createDefaultState,
  logAddMoneyTransaction,
  getAddMoneyTransactions,
  logSoundboxNotification,
  getSoundboxNotifications,
} = require('./src/storageRepository');

let totalTests = 0;
let passedTests = 0;
const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn, isAsync: false });
}

function runAsyncTest(name, fn) {
  testQueue.push({ name, fn, isAsync: true });
}

console.log('================================================================================');
console.log('TALLYKHATA ITERATION 221: TALLYPAY & SOUNDBOX BACKEND TEST SUITE');
console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
console.log('Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895');
console.log('================================================================================');

// -----------------------------------------------------------------------------
// 1. Transaction Limits & Fee Structures
// -----------------------------------------------------------------------------
runTest('TallyPay limits and fee structures are correctly defined', () => {
  assert(TRANSACTION_LIMITS.add_money, 'add_money limits missing');
  assert.strictEqual(TRANSACTION_LIMITS.add_money.minAmount, 10.00);
  assert.strictEqual(TRANSACTION_LIMITS.add_money.maxAmountPerTxn, 50000.00);
  assert.strictEqual(TRANSACTION_LIMITS.add_money.dailyMaxCount, 5);
  assert.strictEqual(TRANSACTION_LIMITS.add_money.dailyMaxAmount, 50000.00);

  assert(SERVICE_CHARGES.add_money, 'add_money charge rule missing');
  assert.strictEqual(SERVICE_CHARGES.add_money.isFree, true);
  assert.strictEqual(SERVICE_CHARGES.add_money.ratePercent, 0.00);

  assert(SERVICE_CHARGES.cash_out_agent, 'cash_out_agent charge rule missing');
  assert.strictEqual(SERVICE_CHARGES.cash_out_agent.isFree, false);
  assert.strictEqual(SERVICE_CHARGES.cash_out_agent.ratePercent, 1.49);

  assert(Array.isArray(SUPPORTED_ADD_MONEY_CHANNELS), 'SUPPORTED_ADD_MONEY_CHANNELS should be array');
  const ids = SUPPORTED_ADD_MONEY_CHANNELS.map(c => c.id);
  assert(ids.includes('bkash'));
  assert(ids.includes('nagad'));
  assert(ids.includes('rocket'));
  assert(ids.includes('upay'));
  assert(ids.includes('visa'));
  assert(ids.includes('mastercard'));
});

// -----------------------------------------------------------------------------
// 2. Fee Calculation with Integer Paisa Precision
// -----------------------------------------------------------------------------
runTest('Fee calculation preserves exact integer paisa arithmetic', () => {
  // Free Add Money
  const freeFee = calculateServiceFee(5000, 'add_money');
  assert.strictEqual(freeFee.isFree, true);
  assert.strictEqual(freeFee.fee, 0.00);
  assert.strictEqual(freeFee.feePaisa, 0);
  assert.strictEqual(freeFee.netAmount, 5000.00);
  assert.strictEqual(freeFee.netPaisa, 500000);

  // Agent Cash Out at 1.49% (৳ 1,000 -> ৳ 14.90 fee, ৳ 985.10 net)
  const agentFee = calculateServiceFee(1000, 'cash_out_agent');
  assert.strictEqual(agentFee.isFree, false);
  assert.strictEqual(agentFee.feePaisa, 1490);
  assert.strictEqual(agentFee.fee, 14.90);
  assert.strictEqual(agentFee.netPaisa, 98510);
  assert.strictEqual(agentFee.netAmount, 985.10);

  // Zero / negative amounts
  const zeroFee = calculateServiceFee(0, 'add_money');
  assert.strictEqual(zeroFee.netAmount, 0);
  assert.strictEqual(zeroFee.netPaisa, 0);
});

// -----------------------------------------------------------------------------
// 3. Add Money Validation (Min, Max, Velocity Limits)
// -----------------------------------------------------------------------------
runTest('validateAddMoney enforces boundaries and daily limits', () => {
  // Valid transaction
  const validRes = validateAddMoney(1500, 'bkash');
  assert.strictEqual(validRes.valid, true);
  assert.strictEqual(validRes.amount, 1500);
  assert.strictEqual(validRes.paisa, 150000);
  assert.strictEqual(validRes.fee, 0);

  // Below minimum
  const belowMin = validateAddMoney(5, 'bkash');
  assert.strictEqual(belowMin.valid, false);
  assert(belowMin.error.includes('MIN_AMOUNT_LIMIT'));

  // Exceeds single transaction max
  const aboveMax = validateAddMoney(60000, 'bkash');
  assert.strictEqual(aboveMax.valid, false);
  assert(aboveMax.error.includes('MAX_AMOUNT_LIMIT'));

  // Invalid / non-numeric
  const invalidAmt = validateAddMoney(-50, 'bkash');
  assert.strictEqual(invalidAmt.valid, false);
  assert(invalidAmt.error.includes('INVALID_AMOUNT'));

  // Daily count limit exceeded (max 5)
  const fiveTxns = [
    { amount: 500 }, { amount: 500 }, { amount: 500 }, { amount: 500 }, { amount: 500 }
  ];
  const countExceeded = validateAddMoney(500, 'bkash', fiveTxns);
  assert.strictEqual(countExceeded.valid, false);
  assert(countExceeded.error.includes('DAILY_COUNT_EXCEEDED'));

  // Daily volume limit exceeded (max 50,000)
  const heavyTxns = [
    { amount: 20000 }, { amount: 25000 }
  ];
  const volExceeded = validateAddMoney(10000, 'bkash', heavyTxns);
  assert.strictEqual(volExceeded.valid, false);
  assert(volExceeded.error.includes('DAILY_AMOUNT_EXCEEDED'));
});

// -----------------------------------------------------------------------------
// 4. Transaction Initiation & Balance Updates
// -----------------------------------------------------------------------------
runTest('initiateAddMoneyTransaction creates valid transaction with balance updates', () => {
  const merchantConfig = { accountNo: '01711223344', merchantName: 'Rahim Store' };
  const res = initiateAddMoneyTransaction(merchantConfig, {
    amount: 1250.50,
    channel: 'bkash',
    currentBalance: 5000.00,
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.newBalance, 6250.50);
  assert(res.transaction);
  assert.strictEqual(res.transaction.amount, 1250.50);
  assert.strictEqual(res.transaction.paisa, 125050);
  assert.strictEqual(res.transaction.balanceBefore, 5000.00);
  assert.strictEqual(res.transaction.balanceAfter, 6250.50);
  assert.strictEqual(res.transaction.status, 'SUCCESS');
  assert(res.transaction.transactionNumber.startsWith('TP-ADD-'));
  assert.strictEqual(res.transaction.merchantWallet, '01711223344');

  // Throws on limit violation
  assert.throws(() => {
    initiateAddMoneyTransaction(merchantConfig, { amount: 2, channel: 'bkash' });
  }, /MIN_AMOUNT_LIMIT/);
});

// -----------------------------------------------------------------------------
// 5. Soundbox Prompt Generation & Words Conversion
// -----------------------------------------------------------------------------
runTest('generateSoundboxPrompt creates authentic Bengali audio prompts', () => {
  const prompt = generateSoundboxPrompt({
    amount: 500,
    appNameBn: 'বিকাশ',
    appNameEn: 'bKash',
    transactionNumber: 'BQR-998877',
  });

  assert(prompt.id.startsWith('sb_evt_'));
  assert.strictEqual(prompt.amount, 500);
  assert.strictEqual(prompt.paisa, 50000);
  assert(prompt.speechTextBn.includes('বিকাশ'));
  assert(prompt.speechTextBn.includes('টাকা সফলভাবে জমা হয়েছে'));
  assert.strictEqual(prompt.volume, 5);
  assert.strictEqual(prompt.soundFrequencyHz, 440);
  assert.strictEqual(prompt.played, false);
});

// -----------------------------------------------------------------------------
// 6. SoundboxQueueManager FIFO Queue, Volume & Mute Controls
// -----------------------------------------------------------------------------
runTest('SoundboxQueueManager manages sequential playback and controls', () => {
  const qm = new SoundboxQueueManager();
  assert.strictEqual(qm.queue.length, 0);

  const prompt1 = generateSoundboxPrompt({ amount: 100, appNameBn: 'নগদ' });
  const prompt2 = generateSoundboxPrompt({ amount: 200, appNameBn: 'রকেট' });

  qm.enqueue(prompt1);
  qm.enqueue(prompt2);

  assert.strictEqual(qm.getPendingItems().length, 2);
  assert.strictEqual(qm.peek().id, prompt1.id);

  // Dequeue first
  const dequeued1 = qm.dequeue();
  assert.strictEqual(dequeued1.id, prompt1.id);
  assert.strictEqual(dequeued1.played, true);
  assert.strictEqual(qm.getPendingItems().length, 1);
  assert.strictEqual(qm.getHistory().length, 1);

  // Volume controls (clamps between 1 and 5)
  qm.setVolume(10);
  assert.strictEqual(qm.getVolume(), 5);
  qm.setVolume(0);
  assert.strictEqual(qm.getVolume(), 1);
  qm.setVolume(3);
  assert.strictEqual(qm.getVolume(), 3);

  // Mute controls
  qm.setMuted(true);
  assert.strictEqual(qm.isMuted(), true);
  qm.setMuted(false);
  assert.strictEqual(qm.isMuted(), false);

  const status = qm.getStatus();
  assert.strictEqual(status.pendingCount, 1);
  assert.strictEqual(status.volume, 3);
  assert.strictEqual(status.muted, false);

  qm.clear();
  assert.strictEqual(qm.getPendingItems().length, 0);
});

// -----------------------------------------------------------------------------
// 7. StorageRepository State Defaults & Schema Collections
// -----------------------------------------------------------------------------
runTest('createDefaultState initializes tallyPayAddMoneyTxns and soundboxLogs collections', () => {
  const state = createDefaultState();
  assert(Array.isArray(state.tallyPayAddMoneyTxns), 'tallyPayAddMoneyTxns missing in default state');
  assert.strictEqual(state.tallyPayAddMoneyTxns.length, 0);
  assert(Array.isArray(state.soundboxLogs), 'soundboxLogs missing in default state');
  assert.strictEqual(state.soundboxLogs.length, 0);
});

// -----------------------------------------------------------------------------
// 8. StorageRepository Mutex Logging & Multi-Tenant Business Isolation
// -----------------------------------------------------------------------------
runAsyncTest('StorageRepository logs Add Money and Soundbox notifications with business isolation', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  // Add Money for Business 1
  const txnB1 = {
    amount: 1000,
    channelId: 'bkash',
    transactionNumber: 'TP-ADD-001',
    status: 'SUCCESS',
  };
  const res1 = await repo.logAddMoneyTransaction(txnB1, { businessId: '1' });
  assert.strictEqual(res1.success, true);

  // Add Money for Business 2
  const txnB2 = {
    amount: 2500,
    channelId: 'nagad',
    transactionNumber: 'TP-ADD-002',
    status: 'SUCCESS',
  };
  const res2 = await repo.logAddMoneyTransaction(txnB2, { businessId: '2' });
  assert.strictEqual(res2.success, true);

  // Isolation check
  const b1Txns = repo.getAddMoneyTransactions('1');
  const b2Txns = repo.getAddMoneyTransactions('2');
  assert.strictEqual(b1Txns.length, 1);
  assert.strictEqual(b1Txns[0].transactionNumber, 'TP-ADD-001');
  assert.strictEqual(b2Txns.length, 1);
  assert.strictEqual(b2Txns[0].transactionNumber, 'TP-ADD-002');

  // Soundbox Logging for Business 1
  const sbPrompt = generateSoundboxPrompt({ amount: 1000, appNameBn: 'বিকাশ' });
  const sbRes = await repo.logSoundboxNotification(sbPrompt, { businessId: '1' });
  assert.strictEqual(sbRes.success, true);

  const b1Sb = repo.getSoundboxNotifications('1');
  const b2Sb = repo.getSoundboxNotifications('2');
  assert.strictEqual(b1Sb.length, 1);
  assert.strictEqual(b1Sb[0].amount, 1000);
  assert.strictEqual(b2Sb.length, 0);
});

// -----------------------------------------------------------------------------
// 9. Cascade Purge on Business Deletion
// -----------------------------------------------------------------------------
runAsyncTest('deleteBusinessCascade purges Add Money txns and Soundbox logs for target business', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  // Business 2 exists in default businesses
  await repo.logAddMoneyTransaction({ amount: 500, transactionNumber: 'B2-ADD' }, { businessId: '2' });
  await repo.logSoundboxNotification({ amount: 500, id: 'sb_2' }, { businessId: '2' });

  await repo.logAddMoneyTransaction({ amount: 700, transactionNumber: 'B1-ADD' }, { businessId: '1' });
  await repo.logSoundboxNotification({ amount: 700, id: 'sb_1' }, { businessId: '1' });

  // Delete business 2
  const delRes = await repo.deleteBusinessCascade('2');
  assert.strictEqual(delRes.success, true);

  const delAdd = repo.getAddMoneyTransactions('2');
  const delSb = repo.getSoundboxNotifications('2');
  assert.strictEqual(delAdd.length, 0, 'Business 2 add money should be purged');
  assert.strictEqual(delSb.length, 0, 'Business 2 soundbox logs should be purged');

  const keepAdd = repo.getAddMoneyTransactions('1');
  const keepSb = repo.getSoundboxNotifications('1');
  assert.strictEqual(keepAdd.length, 1, 'Business 1 add money should be preserved');
  assert.strictEqual(keepSb.length, 1, 'Business 1 soundbox logs should be preserved');
});

// -----------------------------------------------------------------------------
// 10. Standalone helper function bindings export
// -----------------------------------------------------------------------------
runAsyncTest('Standalone exported repository helpers function correctly', async () => {
  const addRes = await logAddMoneyTransaction({ amount: 200, transactionNumber: 'ST-001' });
  assert.strictEqual(addRes.success, true);
  const txns = getAddMoneyTransactions('1');
  assert(txns.length > 0);

  const sbRes = await logSoundboxNotification({ amount: 200, speechTextBn: 'টেস্ট' });
  assert.strictEqual(sbRes.success, true);
  const sbs = getSoundboxNotifications('1');
  assert(sbs.length > 0);
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
