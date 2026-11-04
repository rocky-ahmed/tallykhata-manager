/**
 * test_iteration_230_settlement_history_backend.js
 * Comprehensive Unit and Integration Test Suite for Milestone REA-ITER-230:
 * TallyPay Merchant Settlement History, Daily Auto-Disbursement & Bank Transfer Reconciliation Subsystem
 *
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic Architect)
 * Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 * Milestone: REA-ITER-230
 */

const assert = require('assert');
const tallyPayService = require('./src/tallyPayService');
const storageRepoModule = require('./src/storageRepository');

const {
  BANK_TRANSFER_MODES,
  DISBURSEMENT_STATUSES,
  RECONCILIATION_SYNC_STATUS,
  BANK_TRANSFER_FEES,
  NPSB_SUPPORTED_BANK_ROUTINGS,
  SETTLEMENT_HISTORY_DATE_RANGES,
  BANK_TRANSFER_ARSC_TOKENS,
  resolveSettlementDateRange,
  querySettlementHistory,
  processBankDisbursement,
  computeDailyReconciliation,
  recordReconciliation,
  AutoDisbursementConfigManager,
  autoDisbursementConfigManager,
  AutoDisbursementScheduler,
  autoDisbursementScheduler,
  AutoDisbursementManager,
  autoDisbursementManager,
  ReconstructedSettlementAndReconciliationEngine,
  SettlementAndReconciliationEngine,
  settlementAndReconciliationEngine,
  SETTLEMENT_ACTION_TYPES,
  toBengaliNumerals,
} = tallyPayService;

const {
  StorageRepository,
  createDefaultState,
  sanitizeState,
  saveMerchantDisbursement,
  getMerchantDisbursements,
  getDisbursementById,
  saveReconciliation,
  getReconciliations,
  getUnsyncedReconciliations,
  markReconciliationsSynced,
  getAutoDisbursementConfig,
  saveAutoDisbursementConfig,
} = storageRepoModule;

console.log('='.repeat(80));
console.log('TALLYKHATA ITERATION 230: SETTLEMENT HISTORY & AUTO-DISBURSEMENT BACKEND');
console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
console.log('Milestone: REA-ITER-230');
console.log('='.repeat(80));

let passedTests = 0;
let totalTests = 0;

async function it(desc, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log("  ✓ [PASS] " + desc);
  } catch (err) {
    console.error("  ✗ [FAIL] " + desc);
    console.error(err);
    process.exit(1);
  }
}
const itAsync = it;

async function runTests() {
  // -------------------------------------------------------------
  // GROUP 1: Enums, Constants, Fee Models & ARSC Tokens
  // -------------------------------------------------------------
  console.log('\n[GROUP 1: Enums, Constants, Fee Models & ARSC Tokens]');

  await it('1.1: BANK_TRANSFER_MODES defines NPSB_INSTANT, BEFTN_REGULAR, VISA_DIRECT', () => {
    assert.strictEqual(BANK_TRANSFER_MODES.NPSB_INSTANT, 'NPSB');
    assert.strictEqual(BANK_TRANSFER_MODES.BEFTN_REGULAR, 'BEFTN');
    assert.strictEqual(BANK_TRANSFER_MODES.VISA_DIRECT, 'VISA_DIRECT');
  });

  await it('1.2: DISBURSEMENT_STATUSES defines SCHEDULED, IN_TRANSIT, SETTLED, FAILED, INSTANT_SUCCESS, PROCESSING_BATCH', () => {
    assert.strictEqual(DISBURSEMENT_STATUSES.SCHEDULED, 'SCHEDULED');
    assert.strictEqual(DISBURSEMENT_STATUSES.IN_TRANSIT, 'IN_TRANSIT');
    assert.strictEqual(DISBURSEMENT_STATUSES.SETTLED, 'SETTLED');
    assert.strictEqual(DISBURSEMENT_STATUSES.FAILED, 'FAILED');
    assert.strictEqual(DISBURSEMENT_STATUSES.INSTANT_SUCCESS, 'INSTANT_SUCCESS');
    assert.strictEqual(DISBURSEMENT_STATUSES.PROCESSING_BATCH, 'PROCESSING_BATCH');
  });

  await it('1.3: RECONCILIATION_SYNC_STATUS defines DIRTY (0) and SYNCED (1)', () => {
    assert.strictEqual(RECONCILIATION_SYNC_STATUS.DIRTY, 0);
    assert.strictEqual(RECONCILIATION_SYNC_STATUS.SYNCED, 1);
    assert.strictEqual(RECONCILIATION_SYNC_STATUS.UNSYNCED, 0);
  });

  await it('1.4: BANK_TRANSFER_FEES defines 10.0 Taka (1000 paisa) instant charge and 0.0 regular charge', () => {
    assert.strictEqual(BANK_TRANSFER_FEES.instantTransferCharge, 10.0);
    assert.strictEqual(BANK_TRANSFER_FEES.instantTransferChargePaisa, 1000);
    assert.strictEqual(BANK_TRANSFER_FEES.regularTransferCharge, 0.0);
    assert.strictEqual(BANK_TRANSFER_FEES.regularTransferChargePaisa, 0);
  });

  await it('1.5: BANK_TRANSFER_ARSC_TOKENS contains authentic Bengali string tokens matching REF-001', () => {
    assert(BANK_TRANSFER_ARSC_TOKENS.BEFTN_SLA_NOTICE.includes('১-৩ কার্যদিবস'));
    assert(BANK_TRANSFER_ARSC_TOKENS.NPSB_INSTANT_NOTICE.includes('ইনস্ট্যান্ট'));
    assert(BANK_TRANSFER_ARSC_TOKENS.NPSB_UNSUPPORTED_FALLBACK_NOTICE.includes('সাপোর্ট করে না'));
    assert(BANK_TRANSFER_ARSC_TOKENS.VISA_INSTANT_NOTICE.includes('ভিসা কার্ড'));
    assert(BANK_TRANSFER_ARSC_TOKENS.DAILY_LIMIT_EXCEEDED_ALERT.includes('দৈনিক লিমিট'));
    assert.strictEqual(BANK_TRANSFER_ARSC_TOKENS.LEDGER_NOTE_TAG, '(বাকি আদায় সমন্বয়)');
  });

  await it('1.6: SETTLEMENT_HISTORY_DATE_RANGES defines TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, ALL_TIME, CUSTOM', () => {
    assert.strictEqual(SETTLEMENT_HISTORY_DATE_RANGES.TODAY, 'TODAY');
    assert.strictEqual(SETTLEMENT_HISTORY_DATE_RANGES.YESTERDAY, 'YESTERDAY');
    assert.strictEqual(SETTLEMENT_HISTORY_DATE_RANGES.THIS_WEEK, 'THIS_WEEK');
    assert.strictEqual(SETTLEMENT_HISTORY_DATE_RANGES.THIS_MONTH, 'THIS_MONTH');
    assert.strictEqual(SETTLEMENT_HISTORY_DATE_RANGES.ALL_TIME, 'ALL_TIME');
    assert.strictEqual(SETTLEMENT_HISTORY_DATE_RANGES.CUSTOM, 'CUSTOM');
  });

  // -------------------------------------------------------------
  // GROUP 2: Zero Floating-Point Drift & Daily Reconciliation Mathematics
  // -------------------------------------------------------------
  console.log('\n[GROUP 2: Zero Floating-Point Drift & Daily Reconciliation Mathematics]');

  await it('2.1: computeDailyReconciliation computes exact Closing Balance with zero float drift', () => {
    const res = computeDailyReconciliation(5000.0, 3000.0, 1500.0, 850.0);
    assert.strictEqual(res.opening_balance, 5000.0);
    assert.strictEqual(res.other_cash_sales, 3000.0);
    assert.strictEqual(res.other_credit_sales, 1500.0);
    assert.strictEqual(res.digital_settlements, 850.0);
    assert.strictEqual(res.closing_balance, 7350.0);
    assert.strictEqual(res.closingBalancePaisa, 735000);
  });

  await it('2.2: computeDailyReconciliation handles fractional paisa without JS float drift', () => {
    const res = computeDailyReconciliation(100.1, 200.2, 30.15, 50.05);
    assert.strictEqual(res.closingBalancePaisa, 32020);
    assert.strictEqual(res.closing_balance, 320.2);
  });

  await it('2.3: computeDailyReconciliation supports object input with paisaMode', () => {
    const payload = {
      openingBalancePaisa: 500000,
      otherCashSalePaisa: 300000,
      otherCreditSalePaisa: 150000,
      settledInflowPaisa: 85000,
    };
    const res = computeDailyReconciliation(payload);
    assert.strictEqual(res.openingBalancePaisa, 500000);
    assert.strictEqual(res.otherCashSalePaisa, 300000);
    assert.strictEqual(res.otherCreditSalePaisa, 150000);
    assert.strictEqual(res.settledInflowPaisa, 85000);
    assert.strictEqual(res.closingBalancePaisa, 735000);
    assert.strictEqual(res.closing_balance, 7350.0);
  });

  await it('2.4: computeDailyReconciliation populates both Snake_Case and CamelCase properties', () => {
    const res = computeDailyReconciliation(1000, 500, 200, 300);
    assert.strictEqual(res.opening_balance, res.openingBalance);
    assert.strictEqual(res.other_cash_sales, res.otherCashSale);
    assert.strictEqual(res.other_credit_sales, res.otherCreditSale);
    assert.strictEqual(res.digital_settlements, res.digitalSettlements);
    assert.strictEqual(res.closing_balance, res.closingBalance);
  });
  // -------------------------------------------------------------
  // GROUP 3: Settlement History Query Engine — Filters & Search
  // -------------------------------------------------------------
  console.log('\n[GROUP 3: Settlement History Query Engine — Filters & Search]');

  const now = new Date();
  const todayIso = now.toISOString();
  const yesterdayIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const pastIso = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

  const sampleSettlements = [
    {
      id: 1,
      businessId: '1',
      transactionNumber: 'TXN_QR_101',
      actionType: 'CREDIT_COLLECTION',
      amountTaka: 500.0,
      amountPaisa: 50000,
      customerName: 'করিম শেখ',
      accountId: 'ACC_1',
      synced: 1,
      status: 'SETTLED',
      createDate: todayIso,
    },
    {
      id: 2,
      businessId: '1',
      transactionNumber: 'TXN_QR_102',
      actionType: 'DIGITAL_SALE',
      amountTaka: 300.0,
      amountPaisa: 30000,
      senderName: 'রহিম এন্টারপ্রাইজ',
      senderMobile: '01711223344',
      synced: 0,
      status: 'PENDING',
      createDate: yesterdayIso,
    },
    {
      id: 3,
      businessId: '1',
      transactionNumber: 'TXN_QR_103',
      actionType: 'NO_ACTION',
      amountTaka: 150.0,
      amountPaisa: 15000,
      note: 'ব্যক্তিগত হাওলাত',
      synced: 1,
      status: 'SETTLED',
      createDate: pastIso,
    },
  ];

  await it('3.1: Filters settlement history by actionType (CREDIT_COLLECTION, DIGITAL_SALE, NO_ACTION)', () => {
    const rCredit = querySettlementHistory('1', { actions: sampleSettlements, actionType: 'CREDIT_COLLECTION' });
    assert.strictEqual(rCredit.totalCount, 1);
    assert.strictEqual(rCredit.items[0].transactionNumber, 'TXN_QR_101');

    const rSale = querySettlementHistory('1', { actions: sampleSettlements, actionType: 'DIGITAL_SALE' });
    assert.strictEqual(rSale.totalCount, 1);
    assert.strictEqual(rSale.items[0].transactionNumber, 'TXN_QR_102');

    const rNone = querySettlementHistory('1', { actions: sampleSettlements, actionType: 'NO_ACTION' });
    assert.strictEqual(rNone.totalCount, 1);
    assert.strictEqual(rNone.items[0].transactionNumber, 'TXN_QR_103');
  });

  await it('3.2: Filters settlement history by date range TODAY and YESTERDAY', () => {
    const rToday = querySettlementHistory('1', { actions: sampleSettlements, dateFilter: 'TODAY' });
    assert.strictEqual(rToday.totalCount, 1);
    assert.strictEqual(rToday.items[0].transactionNumber, 'TXN_QR_101');

    const rYesterday = querySettlementHistory('1', { actions: sampleSettlements, dateFilter: 'YESTERDAY' });
    assert.strictEqual(rYesterday.totalCount, 1);
    assert.strictEqual(rYesterday.items[0].transactionNumber, 'TXN_QR_102');
  });

  await it('3.3: Filters settlement history by custom startDate and endDate', () => {
    const start = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const end = todayIso;
    const rCustom = querySettlementHistory('1', { actions: sampleSettlements, startDate: start, endDate: end });
    assert.strictEqual(rCustom.totalCount, 2);
  });

  await it('3.4: Free-text search matches transactionNumber, customer name, mobile, and note', () => {
    const rTxn = querySettlementHistory('1', { actions: sampleSettlements, query: 'QR_101' });
    assert.strictEqual(rTxn.totalCount, 1);

    const rName = querySettlementHistory('1', { actions: sampleSettlements, query: 'রহিম' });
    assert.strictEqual(rName.totalCount, 1);

    const rPhone = querySettlementHistory('1', { actions: sampleSettlements, query: '01711' });
    assert.strictEqual(rPhone.totalCount, 1);

    const rNote = querySettlementHistory('1', { actions: sampleSettlements, query: 'হাওলাত' });
    assert.strictEqual(rNote.totalCount, 1);
  });

  await it('3.5: Filters settlement history by status and synced flag', () => {
    const rPending = querySettlementHistory('1', { actions: sampleSettlements, synced: 0 });
    assert.strictEqual(rPending.totalCount, 1);
    assert.strictEqual(rPending.items[0].transactionNumber, 'TXN_QR_102');

    const rSettled = querySettlementHistory('1', { actions: sampleSettlements, status: 'SETTLED' });
    assert.strictEqual(rSettled.totalCount, 2);
  });

  // -------------------------------------------------------------
  // GROUP 4: Settlement History Metrics & Aggregations
  // -------------------------------------------------------------
  console.log('\n[GROUP 4: Settlement History Metrics & Aggregations]');

  await it('4.1: Computes totalCount, totalAmount, and totalSettledPaisa accurately', () => {
    const res = querySettlementHistory('1', { actions: sampleSettlements });
    assert.strictEqual(res.totalCount, 3);
    assert.strictEqual(res.count, 3);
    assert.strictEqual(res.totalAmount, 950.0);
    assert.strictEqual(res.totalSettledPaisa, 95000);
  });

  await it('4.2: Breakdown metrics by settlement category (creditCollection, digitalSale, noAction)', () => {
    const res = querySettlementHistory('1', { actions: sampleSettlements });
    assert.strictEqual(res.creditCollectionPaisa, 50000);
    assert.strictEqual(res.creditCollectionAmount, 500.0);
    assert.strictEqual(res.digitalSalePaisa, 30000);
    assert.strictEqual(res.digitalSaleAmount, 300.0);
    assert.strictEqual(res.noActionPaisa, 15000);
    assert.strictEqual(res.noActionAmount, 150.0);
  });

  await it('4.3: Validates mathematical sum invariant: credit + sale + noAction === total', () => {
    const res = querySettlementHistory('1', { actions: sampleSettlements });
    assert.strictEqual(
      res.creditCollectionPaisa + res.digitalSalePaisa + res.noActionPaisa,
      res.totalSettledPaisa
    );
  });

  await it('4.4: Supports pagination with offset, limit, and hasMore', () => {
    const p1 = querySettlementHistory('1', { actions: sampleSettlements, offset: 0, limit: 2 });
    assert.strictEqual(p1.items.length, 2);
    assert.strictEqual(p1.hasMore, true);
    assert.strictEqual(p1.totalCount, 3);

    const p2 = querySettlementHistory('1', { actions: sampleSettlements, offset: 2, limit: 2 });
    assert.strictEqual(p2.items.length, 1);
    assert.strictEqual(p2.hasMore, false);
  });

  // -------------------------------------------------------------
  // GROUP 5: Bank Transfer Routing & Fee Calculation
  // -------------------------------------------------------------
  console.log('\n[GROUP 5: Bank Transfer Routing & Fee Calculation]');

  await itAsync('5.1: NPSB Instant Transfer routes successfully when bank supports NPSB (BRAC Bank: 08527)', async () => {
    const req = {
      amountTaka: 1000.0,
      bankRoutingNo: '085271234',
      bankAccountNo: '1501201234567001',
      recipientName: 'রহিম এন্টারপ্রাইজ',
      preferInstant: true,
    };
    const res = await processBankDisbursement('1', req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.disbursement.transferMode, 'NPSB');
    assert.strictEqual(res.disbursement.fee, 10.0);
    assert.strictEqual(res.disbursement.feePaisa, 1000);
    assert.strictEqual(res.disbursement.netAmount, 990.0);
    assert.strictEqual(res.disbursement.netAmountPaisa, 99000);
    assert.strictEqual(res.disbursement.status, 'INSTANT_SUCCESS');
    assert(res.disbursement.notice.includes('NPSB'));
  });

  await itAsync('5.2: Gracefully falls back to BEFTN when bank does not support NPSB (routing 99999)', async () => {
    const req = {
      amountTaka: 2000.0,
      bankRoutingNo: '999991234',
      bankAccountNo: '9991201234567001',
      recipientName: 'করিম ট্রেডার্স',
      preferInstant: true,
    };
    const res = await processBankDisbursement('1', req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.disbursement.transferMode, 'BEFTN');
    assert.strictEqual(res.disbursement.fee, 0.0);
    assert.strictEqual(res.disbursement.feePaisa, 0);
    assert.strictEqual(res.disbursement.netAmount, 2000.0);
    assert.strictEqual(res.disbursement.status, 'PROCESSING_BATCH');
    assert(res.disbursement.notice.includes('উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না'));
  });

  await itAsync('5.3: Regular transfer (preferInstant: false) routes via BEFTN with 0 fee and SLA notice', async () => {
    const req = {
      amountTaka: 1500.0,
      bankRoutingNo: '085271234',
      bankAccountNo: '1501201234567001',
      recipientName: 'রহিম এন্টারপ্রাইজ',
      preferInstant: false,
    };
    const res = await processBankDisbursement('1', req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.disbursement.transferMode, 'BEFTN');
    assert.strictEqual(res.disbursement.fee, 0.0);
    assert.strictEqual(res.disbursement.netAmount, 1500.0);
    assert(res.disbursement.notice.includes('১-৩ কার্যদিবস'));
  });

  await itAsync('5.4: Rejects zero or negative disbursement amount', async () => {
    let threw = false;
    try {
      await processBankDisbursement('1', { amountTaka: 0, bankRoutingNo: '085271234' });
    } catch (e) {
      threw = true;
      assert(e.message.includes('greater than zero'));
    }
    assert.strictEqual(threw, true);
  });
  // -------------------------------------------------------------
  // GROUP 6: Auto-Disbursement Scheduler & Manager
  // -------------------------------------------------------------
  console.log('\n[GROUP 6: Auto-Disbursement Scheduler & Manager]');

  await it('6.1: AutoDisbursementScheduler and AutoDisbursementManager aliases resolve to config manager', () => {
    assert.strictEqual(AutoDisbursementScheduler, AutoDisbursementConfigManager);
    assert.strictEqual(AutoDisbursementManager, AutoDisbursementConfigManager);
    assert.strictEqual(autoDisbursementScheduler, autoDisbursementConfigManager);
    assert.strictEqual(autoDisbursementManager, autoDisbursementConfigManager);
  });

  await it('6.2: AutoDisbursementConfigManager retrieves per-business default configuration', () => {
    const cfg = autoDisbursementConfigManager.getConfig('test_biz');
    assert.strictEqual(cfg.isAutoDisbursementEnabled, false);
    assert.strictEqual(cfg.minThresholdPaisa, 50000);
    assert.strictEqual(cfg.minThresholdTaka, 500.0);
    assert.strictEqual(cfg.payoutTime, '23:00');
  });

  await itAsync('6.3: AutoDisbursementConfigManager updates threshold and keeps Taka/Paisa synchronized', async () => {
    const updated = await autoDisbursementConfigManager.updateConfig('test_biz', {
      isAutoDisbursementEnabled: true,
      linkedBankAccountId: 'ACC_BNK_99',
      minThresholdPaisa: 100000,
    });
    assert.strictEqual(updated.isAutoDisbursementEnabled, true);
    assert.strictEqual(updated.minThresholdPaisa, 100000);
    assert.strictEqual(updated.minThresholdTaka, 1000.0);
  });

  await it('6.4: evaluateAutoDisbursementEligibility checks enabled status, linked account, and threshold', () => {
    const mgr = new AutoDisbursementConfigManager();

    // 1. Disabled
    const e1 = mgr.evaluateAutoDisbursementEligibility('b1', 100000);
    assert.strictEqual(e1.eligible, false);
    assert.strictEqual(e1.reason, 'DISABLED');

    // 2. Enabled but no linked account
    mgr.updateConfig('b1', { isAutoDisbursementEnabled: true });
    const e2 = mgr.evaluateAutoDisbursementEligibility('b1', 100000);
    assert.strictEqual(e2.eligible, false);
    assert.strictEqual(e2.reason, 'NO_LINKED_ACCOUNT');

    // 3. Enabled, linked account, but below threshold
    mgr.updateConfig('b1', { isAutoDisbursementEnabled: true, linkedBankAccountId: 'BNK_1' });
    const e3 = mgr.evaluateAutoDisbursementEligibility('b1', 40000);
    assert.strictEqual(e3.eligible, false);
    assert.strictEqual(e3.reason, 'BELOW_THRESHOLD');

    // 4. Eligible (balance >= 50,000 paisa)
    const e4 = mgr.evaluateAutoDisbursementEligibility('b1', 60000);
    assert.strictEqual(e4.eligible, true);
    assert.strictEqual(e4.balancePaisa, 60000);
  });

  await itAsync('6.5: executeAutoDisbursementIfEligible executes disbursement when eligible', async () => {
    const mgr = new AutoDisbursementConfigManager();
    await mgr.updateConfig('b_exec', {
      isAutoDisbursementEnabled: true,
      linkedBankAccountId: '1501201234567001',
      linkedBankRoutingNo: '085271234',
      linkedAccountName: 'রহিম ট্রেডার্স',
      preferInstant: true,
    });

    const res = await mgr.executeAutoDisbursementIfEligible('b_exec', 75000);
    assert.strictEqual(res.executed, true);
    assert.strictEqual(res.disbursement.amountPaisa, 75000);
    assert.strictEqual(res.disbursement.transferMode, 'NPSB');
  });

  // -------------------------------------------------------------
  // GROUP 7: Storage Repository CRUD & Reconciliation Persistence
  // -------------------------------------------------------------
  console.log('\n[GROUP 7: Storage Repository CRUD & Reconciliation Persistence]');

  await itAsync('7.1: StorageRepository saves and retrieves merchant disbursements', async () => {
    const storage = new StorageRepository();
    await storage.initialize();

    const saveRes = await storage.saveMerchantDisbursement('1', {
      amountTaka: 1200.0,
      bankRoutingNo: '060261234',
      bankAccountNo: '1101201234',
      recipientName: 'করিম ব্রাদার্স',
      transferMode: 'NPSB',
      status: 'INSTANT_SUCCESS',
    });
    assert.strictEqual(saveRes.success, true);
    assert(saveRes.disbursement.id.startsWith('DISB_'));

    const listRes = storage.getMerchantDisbursements('1');
    assert.strictEqual(listRes.totalCount, 1);
    assert.strictEqual(listRes.items[0].id, saveRes.disbursement.id);
    assert.strictEqual(listRes.totalAmount, 1200.0);

    const single = storage.getDisbursementById('1', saveRes.disbursement.id);
    assert(single !== null);
    assert.strictEqual(single.recipientName, 'করিম ব্রাদার্স');
  });

  await itAsync('7.2: StorageRepository saves daily reconciliation with dirty sync status (0)', async () => {
    const storage = new StorageRepository();
    await storage.initialize();

    const reconRes = await storage.saveReconciliation('1', {
      opening_balance: 5000.0,
      other_cash_sales: 3000.0,
      other_credit_sales: 1500.0,
      digital_settlements: 850.0,
    });
    assert.strictEqual(reconRes.success, true);
    assert.strictEqual(reconRes.reconciliation.closing_balance, 7350.0);
    assert.strictEqual(reconRes.reconciliation.sync_status, 0);

    const recons = storage.getReconciliations('1');
    assert.strictEqual(recons.totalCount, 1);
  });

  await itAsync('7.3: getUnsyncedReconciliations retrieves un-synced rows and markReconciliationsSynced updates them', async () => {
    const storage = new StorageRepository();
    await storage.initialize();

    const r1 = await storage.saveReconciliation('1', { openingBalance: 1000, otherCashSale: 500, otherCreditSale: 200, digitalSettlements: 300 });
    const r2 = await storage.saveReconciliation('1', { openingBalance: 1600, otherCashSale: 400, otherCreditSale: 100, digitalSettlements: 200 });

    const unsynced = storage.getUnsyncedReconciliations('1');
    assert.strictEqual(unsynced.length, 2);

    const syncRes = await storage.markReconciliationsSynced('1', [r1.reconciliation._id]);
    assert.strictEqual(syncRes.success, true);
    assert.strictEqual(syncRes.count, 1);

    const remainingUnsynced = storage.getUnsyncedReconciliations('1');
    assert.strictEqual(remainingUnsynced.length, 1);
    assert.strictEqual(remainingUnsynced[0]._id, r2.reconciliation._id);
  });

  await itAsync('7.4: recordReconciliation helper wraps storage insertion cleanly', async () => {
    const storage = new StorageRepository();
    await storage.initialize();

    const res = await recordReconciliation('1', {
      openingBalance: 4000,
      otherCashSale: 2000,
      otherCreditSale: 1000,
      digitalSettlements: 500,
    }, storage);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.reconciliation.closing_balance, 5500);

    const list = storage.getReconciliations('1');
    assert.strictEqual(list.totalCount, 1);
  });

  // -------------------------------------------------------------
  // GROUP 8: Multi-Tenant Business Isolation
  // -------------------------------------------------------------
  console.log('\n[GROUP 8: Multi-Tenant Business Isolation]');

  await itAsync('8.1: Disbursements and reconciliations are strictly isolated by businessId', async () => {
    const storage = new StorageRepository();
    await storage.initialize();

    await storage.saveMerchantDisbursement('biz_alpha', { amountTaka: 500, bankAccountNo: 'ALPHA_ACC' });
    await storage.saveMerchantDisbursement('biz_beta', { amountTaka: 900, bankAccountNo: 'BETA_ACC' });

    await storage.saveReconciliation('biz_alpha', { openingBalance: 1000, closingBalance: 1000 });
    await storage.saveReconciliation('biz_beta', { openingBalance: 2000, closingBalance: 2000 });

    const disbAlpha = storage.getMerchantDisbursements('biz_alpha');
    const disbBeta = storage.getMerchantDisbursements('biz_beta');
    assert.strictEqual(disbAlpha.totalCount, 1);
    assert.strictEqual(disbAlpha.items[0].bankAccountNo, 'ALPHA_ACC');
    assert.strictEqual(disbBeta.totalCount, 1);
    assert.strictEqual(disbBeta.items[0].bankAccountNo, 'BETA_ACC');

    const reconAlpha = storage.getReconciliations('biz_alpha');
    const reconBeta = storage.getReconciliations('biz_beta');
    assert.strictEqual(reconAlpha.totalCount, 1);
    assert.strictEqual(reconAlpha.items[0].opening_balance, 1000);
    assert.strictEqual(reconBeta.totalCount, 1);
    assert.strictEqual(reconBeta.items[0].opening_balance, 2000);
  });

  await itAsync('8.2: AutoDisbursementConfig is isolated per tenant', async () => {
    const storage = new StorageRepository();
    await storage.initialize();

    await storage.saveAutoDisbursementConfig('biz_alpha', { isAutoDisbursementEnabled: true, minThresholdPaisa: 100000 });
    await storage.saveAutoDisbursementConfig('biz_beta', { isAutoDisbursementEnabled: false, minThresholdPaisa: 200000 });

    const cfgA = storage.getAutoDisbursementConfig('biz_alpha');
    const cfgB = storage.getAutoDisbursementConfig('biz_beta');
    assert.strictEqual(cfgA.isAutoDisbursementEnabled, true);
    assert.strictEqual(cfgA.minThresholdPaisa, 100000);
    assert.strictEqual(cfgB.isAutoDisbursementEnabled, false);
    assert.strictEqual(cfgB.minThresholdPaisa, 200000);
  });
  // -------------------------------------------------------------
  // GROUP 9: Cascade Deletion & State Sanitization
  // -------------------------------------------------------------
  console.log('\n[GROUP 9: Cascade Deletion & State Sanitization]');

  await itAsync('9.1: deleteBusinessCascade purges merchantDisbursements, reconciliations, and autoDisbursementConfig for target business only', async () => {
    const storage = new StorageRepository();
    await storage.initialize();

    await storage.mutateStore((prev) => {
      const businesses = [
        ...prev.businesses,
        { id: 'biz_delete', name: 'Delete Shop', isArchived: false },
        { id: 'biz_keep', name: 'Keep Shop', isArchived: false },
      ];
      return { ...prev, businesses };
    });

    await storage.saveMerchantDisbursement('biz_delete', { amountTaka: 500 });
    await storage.saveMerchantDisbursement('biz_keep', { amountTaka: 800 });

    await storage.saveReconciliation('biz_delete', { openingBalance: 1000 });
    await storage.saveReconciliation('biz_keep', { openingBalance: 2000 });

    await storage.saveAutoDisbursementConfig('biz_delete', { isAutoDisbursementEnabled: true });
    await storage.saveAutoDisbursementConfig('biz_keep', { isAutoDisbursementEnabled: true });

    await storage.deleteBusinessCascade('biz_delete');

    assert.strictEqual(storage.getMerchantDisbursements('biz_delete').totalCount, 0);
    assert.strictEqual(storage.getMerchantDisbursements('biz_keep').totalCount, 1);

    assert.strictEqual(storage.getReconciliations('biz_delete').totalCount, 0);
    assert.strictEqual(storage.getReconciliations('biz_keep').totalCount, 1);

    const cfgDel = storage.getAutoDisbursementConfig('biz_delete');
    assert.strictEqual(cfgDel.isAutoDisbursementEnabled, false);
    const cfgKeep = storage.getAutoDisbursementConfig('biz_keep');
    assert.strictEqual(cfgKeep.isAutoDisbursementEnabled, true);
  });

  await it('9.2: sanitizeState ensures merchantDisbursements and reconciliations are initialized to arrays', () => {
    const raw = {};
    const sanitized = sanitizeState(raw);
    assert(Array.isArray(sanitized.merchantDisbursements));
    assert(Array.isArray(sanitized.reconciliations));
    assert(sanitized.autoDisbursementConfig && typeof sanitized.autoDisbursementConfig === 'object');
  });

  // -------------------------------------------------------------
  // GROUP 10: Backup/Restore Serialization & Latency Benchmark
  // -------------------------------------------------------------
  console.log('\n[GROUP 10: Backup/Restore Serialization & Latency Benchmark]');

  await itAsync('10.1: getFullBackupState sanitizes credentials, PINs, and live tokens', async () => {
    const storage = new StorageRepository();
    await storage.initialize();

    await storage.saveMerchantDisbursement('1', {
      amountTaka: 1000,
      pin: '1234',
      token: 'secret_jwt_token',
      credential: 'raw_passphrase',
      sessionToken: 'sess_abc',
    });

    await storage.saveReconciliation('1', {
      openingBalance: 5000,
      pin: '9999',
      apiKey: 'key_live_123',
    });

    await storage.saveAutoDisbursementConfig('1', {
      isAutoDisbursementEnabled: true,
      pin: '5555',
      secretKey: 'top_secret',
    });

    const backup = await storage.getFullBackupState();
    const disb = backup.merchantDisbursements[0];
    assert.strictEqual(disb.pin, undefined);
    assert.strictEqual(disb.token, undefined);
    assert.strictEqual(disb.credential, undefined);
    assert.strictEqual(disb.sessionToken, undefined);

    const recon = backup.reconciliations[0];
    assert.strictEqual(recon.pin, undefined);
    assert.strictEqual(recon.apiKey, undefined);

    const cfg = backup.autoDisbursementConfig['1'];
    assert.strictEqual(cfg.pin, undefined);
    assert.strictEqual(cfg.secretKey, undefined);
  });

  await itAsync('10.2: commitRestorePayload preserves new collections across full restore', async () => {
    const storage = new StorageRepository();
    await storage.initialize();

    const restorePayload = {
      manifest: { backupVersion: 6, schemaVersion: 6 },
      data: {
        accounts: [],
        journals: [],
        merchantDisbursements: [{ id: 'D_REST_1', businessId: '1', amountTaka: 1000 }],
        reconciliations: [{ _id: 'R_REST_1', businessId: '1', closing_balance: 5000 }],
        autoDisbursementConfig: { '1': { isAutoDisbursementEnabled: true, minThresholdPaisa: 80000 } },
      },
    };

    await storage.commitRestorePayload(restorePayload);

    const disb = storage.getMerchantDisbursements('1');
    assert.strictEqual(disb.totalCount, 1);
    assert.strictEqual(disb.items[0].id, 'D_REST_1');

    const recons = storage.getReconciliations('1');
    assert.strictEqual(recons.totalCount, 1);
    assert.strictEqual(recons.items[0]._id, 'R_REST_1');

    const cfg = storage.getAutoDisbursementConfig('1');
    assert.strictEqual(cfg.isAutoDisbursementEnabled, true);
    assert.strictEqual(cfg.minThresholdPaisa, 80000);
  });

  await it('10.3: Latency benchmark: 1,000 settlement, disbursement & reconciliation operations execute in < 200ms', () => {
    const engine = new ReconstructedSettlementAndReconciliationEngine();
    const startTime = Date.now();
    const ops = 1000;

    for (let i = 0; i < ops; i++) {
      engine.recordSettlement(`TXN_PERF_${i}`, i % 2 === 0 ? 'CREDIT_COLLECTION' : 'DIGITAL_SALE', 10000);
      if (i % 10 === 0) {
        computeDailyReconciliation(5000 + i, 3000, 1500, 850);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`    -> 1,000 operations completed in ${elapsed}ms (${(elapsed / ops).toFixed(4)}ms/op)`);
    assert(elapsed < 200, `Benchmark took ${elapsed}ms, which exceeds 200ms threshold`);
  });

  // -------------------------------------------------------------
  // GROUP 11: Reconstructed Engine Full-Lifecycle Verification
  // -------------------------------------------------------------
  console.log('\n[GROUP 11: Reconstructed Engine Full-Lifecycle Verification]');

  await it('11.1: ReconstructedSettlementAndReconciliationEngine executes full lifecycle matching Group 10 specification', () => {
    const engine = new SettlementAndReconciliationEngine();

    // 1. Settlements
    const s1 = engine.recordSettlement('TXN_F01', 'CREDIT_COLLECTION', 50000, 'ACC_101');
    assert(s1.success === true);
    assert.strictEqual(s1.record.amountTaka, 500.0);

    const s2 = engine.recordSettlement('TXN_F02', 'DIGITAL_SALE', 25000);
    assert(s2.success === true);

    const s3 = engine.recordSettlement('TXN_F03', 'NO_ACTION', 10000);
    assert(s3.success === true);

    // Idempotency
    const sDup = engine.recordSettlement('TXN_F01', 'CREDIT_COLLECTION', 50000);
    assert.strictEqual(sDup.success, false);
    assert.strictEqual(sDup.reason, 'ALREADY_SETTLED');

    // History query
    const hist = engine.getSettlementHistory();
    assert.strictEqual(hist.totalCount, 3);
    assert.strictEqual(hist.totalAmount, 850.0);

    // Disbursement NPSB
    const dNpsb = engine.initiateBankDisbursement({
      amountTaka: 1000.0,
      bankRoutingNo: '085271234',
      preferInstant: true,
    });
    assert.strictEqual(dNpsb.disbursement.transferMode, 'NPSB');
    assert.strictEqual(dNpsb.disbursement.fee, 10.0);

    // Disbursement BEFTN Fallback
    const dBeftn = engine.initiateBankDisbursement({
      amountTaka: 2000.0,
      bankRoutingNo: '999991234',
      preferInstant: true,
    });
    assert.strictEqual(dBeftn.disbursement.transferMode, 'BEFTN');
    assert.strictEqual(dBeftn.disbursement.fee, 0.0);

    // End-of-Day Recon
    const recon = engine.reconcileDay(5000.0, 3000.0, 1500.0, 850.0);
    assert.strictEqual(recon.closing_balance, 7350.0);
    assert.strictEqual(recon.sync_status, 0);

    // Sync Cycle
    const unsynced = engine.getUnsyncedReconciliations();
    assert.strictEqual(unsynced.length, 1);
    const syncedCount = engine.markReconciliationsSynced([recon._id]);
    assert.strictEqual(syncedCount, 1);
    assert.strictEqual(engine.getUnsyncedReconciliations().length, 0);
  });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests} (100% SUCCESS)`);
  console.log('='.repeat(80));
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
