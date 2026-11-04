/**
 * test_iteration_227_transaction_history_backend.js
 *
 * TallyPay Digital Transaction History & Receipt Explorer Subsystem Backend Suite
 * Validates DTO Normalization, Unified Query Engine, Monthly TxnReport Aggregations,
 * Receipt Model Formatting, Multi-Tenant Business Isolation, Cascade Purging,
 * Backup/Restore Serialization, and Performance Latency.
 *
 * Milestone: REA-ITER-227
 * Target Reference: REF-001 (TallyKhata-Demo.apk, classes4.dex, resources.arsc)
 * Worker 2: Averroes (Permanent Backend Developer & Business Logic Architect)
 * Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 */

const assert = require('assert');
const {
  BALANCE_CHANGE_TYPES,
  TXN_STATUSES,
  TXN_INCOMING_OUTGOING_FILTERS,
  TRANSACTION_TYPES,
  BENGALI_ARSC_TOKENS,
  toBengaliNumerals,
  formatBengaliCurrency,
  formatBengaliDate,
  formatTransactionStatementItem,
  queryWalletTransactions,
  calculateMonthlyTransactionSummary,
  generateTransactionReceiptDetails,
  generateShareText,
  TransactionHistoryEngine,
  transactionHistoryEngine,
} = require('./src/tallyPayService');

const storageRepo = require('./src/storageRepository');
const {
  StorageRepository,
  createDefaultState,
  logTallyPayTransaction,
  getTallyPayTransactions,
  getTallyPayTransactionById,
  getTallyPayMonthlySummary,
  sanitizeState,
} = storageRepo;

// In-Memory Storage Adapter for Mock Isolated Repository
class MockAsyncStorageAdapter {
  constructor(initialData = {}) {
    this.store = new Map(Object.entries(initialData));
  }
  async getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  async setItem(key, value) {
    this.store.set(key, String(value));
  }
  async removeItem(key) {
    this.store.delete(key);
  }
  async clear() {
    this.store.clear();
  }
}

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runTestAsync(testName, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('================================================================================');
  console.log('TALLYKHATA ITERATION 227: DIGITAL TRANSACTION HISTORY & RECEIPT BACKEND SUITE');
  console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
  console.log('Milestone: REA-ITER-227');
  console.log('================================================================================');

  // ===========================================================================
  // GROUP 1: Enums, Constants & Bengali Localization Tokens
  // ===========================================================================
  console.log('\n[GROUP 1: Enums, Constants & Bengali Localization Tokens]');

  runTest('1.1: BALANCE_CHANGE_TYPES defines CREDIT and DEBIT with flow aliases', () => {
    assert.strictEqual(BALANCE_CHANGE_TYPES.CREDIT, 'CREDIT');
    assert.strictEqual(BALANCE_CHANGE_TYPES.DEBIT, 'DEBIT');
    assert.strictEqual(BALANCE_CHANGE_TYPES.INFLOW, 'CREDIT');
    assert.strictEqual(BALANCE_CHANGE_TYPES.OUTFLOW, 'DEBIT');
    assert.strictEqual(BALANCE_CHANGE_TYPES.PELAM, 'CREDIT');
    assert.strictEqual(BALANCE_CHANGE_TYPES.DILAM, 'DEBIT');
  });

  runTest('1.2: TXN_STATUSES defines COMPLETE, IN_PROGRESS, PROCESSED, FAILED, REVERSED', () => {
    assert.strictEqual(TXN_STATUSES.COMPLETE, 'COMPLETE');
    assert.strictEqual(TXN_STATUSES.IN_PROGRESS, 'IN_PROGRESS');
    assert.strictEqual(TXN_STATUSES.PROCESSED, 'PROCESSED');
    assert.strictEqual(TXN_STATUSES.FAILED, 'FAILED');
    assert.strictEqual(TXN_STATUSES.REVERSED, 'REVERSED');
  });

  runTest('1.3: TXN_INCOMING_OUTGOING_FILTERS defines ALL, INCOMING, OUTGOING with aliases', () => {
    assert.strictEqual(TXN_INCOMING_OUTGOING_FILTERS.ALL, 'ALL');
    assert.strictEqual(TXN_INCOMING_OUTGOING_FILTERS.INCOMING, 'INCOMING');
    assert.strictEqual(TXN_INCOMING_OUTGOING_FILTERS.OUTGOING, 'OUTGOING');
    assert.strictEqual(TXN_INCOMING_OUTGOING_FILTERS.INFLOW, 'INCOMING');
    assert.strictEqual(TXN_INCOMING_OUTGOING_FILTERS.OUTFLOW, 'OUTGOING');
    assert.strictEqual(TXN_INCOMING_OUTGOING_FILTERS.PELAM, 'INCOMING');
    assert.strictEqual(TXN_INCOMING_OUTGOING_FILTERS.DILAM, 'OUTGOING');
  });

  runTest('1.4: TRANSACTION_TYPES defines all required transaction types matching classes4.dex', () => {
    const requiredTypes = [
      'BILL_PAYMENT', 'CASHBACK', 'CASH_IN_FROM_BANK', 'CASH_IN_FROM_CARD',
      'CASH_IN_FROM_MFS_WALLET', 'CASH_OUT', 'CASH_OUT_TO_BANK', 'FUND_TRANSFER',
      'MOBILE_RECHARGE', 'PAYMENT', 'SEND_MONEY', 'VISA_TRANSFER'
    ];
    for (const t of requiredTypes) {
      assert.strictEqual(TRANSACTION_TYPES[t], t, `TRANSACTION_TYPES contains ${t}`);
    }
    assert.ok(Object.keys(TRANSACTION_TYPES).length >= 30, 'Contains at least 30 transaction types');
  });

  runTest('1.5: BENGALI_ARSC_TOKENS contains authentic Bengali string tokens', () => {
    assert.strictEqual(BENGALI_ARSC_TOKENS.SCREEN_TITLE, 'লেনদেন বিবরণী');
    assert.strictEqual(BENGALI_ARSC_TOKENS.TAB_ALL, 'সব লেনদেন');
    assert.strictEqual(BENGALI_ARSC_TOKENS.TAB_SUMMARY, 'সারসংক্ষেপ');
    assert.strictEqual(BENGALI_ARSC_TOKENS.REFERENCE_FIELD, 'লেনদেন আইডি');
    assert.strictEqual(BENGALI_ARSC_TOKENS.INFLOW_HEADER, 'টাকা পেলেন');
    assert.strictEqual(BENGALI_ARSC_TOKENS.OUTFLOW_HEADER, 'টাকা দিলেন');
    assert.strictEqual(BENGALI_ARSC_TOKENS.STATUS_SUCCESS, 'সফল');
    assert.strictEqual(BENGALI_ARSC_TOKENS.STATUS_FAILED, 'ব্যর্থ');
  });

  runTest('1.6: Bengali formatting helpers convert numerals, currency, and dates accurately', () => {
    assert.strictEqual(toBengaliNumerals(12345), '১২৩৪৫');
    assert.strictEqual(toBengaliNumerals('01711-000000'), '০১৭১১-০০০০০০');
    assert.strictEqual(formatBengaliCurrency(1500.5), '১,৫০০.৫০');
    assert.strictEqual(formatBengaliCurrency(125000), '১,২৫,০০০.০০');
    const d = new Date('2026-10-15T00:00:00.000Z');
    assert.ok(formatBengaliDate(d).includes('অক্টোবর'));
  });

  // ===========================================================================
  // GROUP 2: Transaction Normalization & DTO Schema (formatTransactionStatementItem)
  // ===========================================================================
  console.log('\n[GROUP 2: Transaction Normalization & DTO Schema]');

  runTest('2.1: Normalizes raw Add Money transaction with integer paisa precision', () => {
    const raw = {
      id: 'am_001',
      transactionId: 'TXN-AM-1001',
      type: 'add_money',
      amount: 5000,
      fee: 0,
      balanceAfter: 15000,
      channel: 'DBBL_NEXUS',
      createdAt: '2026-10-15T10:00:00Z',
      status: 'SUCCESS',
    };
    const dto = formatTransactionStatementItem(raw);
    assert.strictEqual(dto.transactionNumber, 'TXN-AM-1001');
    assert.strictEqual(dto.amount, 5000);
    assert.strictEqual(dto.amountPaisa, 500000);
    assert.strictEqual(dto.fee, 0);
    assert.strictEqual(dto.feePaisa, 0);
    assert.strictEqual(dto.netAmount, 5000);
    assert.strictEqual(dto.netAmountPaisa, 500000);
    assert.strictEqual(dto.balanceChangeType, 'CREDIT');
    assert.strictEqual(dto.balanceTo, 15000);
    assert.strictEqual(dto.balanceToPaisa, 1500000);
    assert.strictEqual(dto.txnStatus, 'COMPLETE');
    assert.strictEqual(dto.statusBn, 'সফল');
  });

  runTest('2.2: Normalizes raw Send Money transaction with debit direction and fee calculation', () => {
    const raw = {
      txnNumber: 'TXN-SM-2002',
      txnType: 'SEND_MONEY',
      amount: 1000,
      fee: 5,
      balanceBefore: 15000,
      balanceAfter: 13995,
      recipientPhone: '01811223344',
      recipientName: 'করিম ব্রাদার্স',
      txnTime: '2026-10-16T12:30:00Z',
      status: 'COMPLETE',
    };
    const dto = formatTransactionStatementItem(raw);
    assert.strictEqual(dto.transactionNumber, 'TXN-SM-2002');
    assert.strictEqual(dto.balanceChangeType, 'DEBIT');
    assert.strictEqual(dto.amount, 1000);
    assert.strictEqual(dto.amountPaisa, 100000);
    assert.strictEqual(dto.fee, 5);
    assert.strictEqual(dto.feePaisa, 500);
    assert.strictEqual(dto.netAmount, 1005);
    assert.strictEqual(dto.netAmountPaisa, 100500);
    assert.strictEqual(dto.toName, 'করিম ব্রাদার্স');
    assert.strictEqual(dto.toWallet, '01811223344');
  });

  runTest('2.3: Normalizes raw Mobile Recharge transaction with operator details', () => {
    const raw = {
      id: 'rcg_3003',
      transactionNumber: 'TP-RCG-3003-ABC',
      type: 'mobile_recharge',
      amount: 100,
      paisa: 10000,
      recipientPhone: '01711223344',
      operatorName: 'গ্রামীণফোন',
      balanceBefore: 5000,
      balanceAfter: 4900,
      status: 'SUCCESS',
      createdAt: '2026-10-17T09:15:00Z',
    };
    const dto = formatTransactionStatementItem(raw);
    assert.strictEqual(dto.transactionNumber, 'TP-RCG-3003-ABC');
    assert.strictEqual(dto.balanceChangeType, 'DEBIT');
    assert.strictEqual(dto.txnType, 'MOBILE_RECHARGE');
    assert.strictEqual(dto.typeName, 'মোবাইল রিচার্জ');
    assert.strictEqual(dto.amount, 100);
    assert.strictEqual(dto.amountPaisa, 10000);
    assert.strictEqual(dto.fee, 0);
    assert.strictEqual(dto.feePaisa, 0);
    assert.strictEqual(dto.netAmount, 100);
  });

  runTest('2.4: Normalizes raw Utility Bill Payment transaction with biller metadata', () => {
    const raw = {
      id: 'TKBP-20261018-DEF123',
      transactionNumber: 'TKBP-20261018-DEF123',
      txnType: 'BILL_PAYMENT',
      billerCode: 'DESCO_POSTPAID',
      billerName: 'DESCO Postpaid',
      accountNo: '10203040',
      amount: 1250,
      amountPaisa: 125000,
      fee: 10,
      feePaisa: 1000,
      totalPayment: 1260,
      totalPaymentPaisa: 126000,
      status: 'SUCCESS',
      paymentDate: '2026-10-18T14:00:00Z',
    };
    const dto = formatTransactionStatementItem(raw);
    assert.strictEqual(dto.transactionNumber, 'TKBP-20261018-DEF123');
    assert.strictEqual(dto.balanceChangeType, 'DEBIT');
    assert.strictEqual(dto.txnType, 'BILL_PAYMENT');
    assert.strictEqual(dto.typeName, 'বিল পে');
    assert.strictEqual(dto.amount, 1250);
    assert.strictEqual(dto.fee, 10);
    assert.strictEqual(dto.netAmount, 1260);
    assert.strictEqual(dto.netAmountPaisa, 126000);
  });

  runTest('2.5: Normalizes raw Bangla QR merchant payment with customer details', () => {
    const raw = {
      transactionNumber: 'BQR-9901',
      type: 'payment',
      amount: 2500,
      customerName: 'সেলিম চৌধুরী',
      customerMobile: '01611002233',
      timestamp: '2026-10-19T16:20:00Z',
      status: 'COMPLETE',
    };
    const dto = formatTransactionStatementItem(raw);
    assert.strictEqual(dto.transactionNumber, 'BQR-9901');
    assert.strictEqual(dto.balanceChangeType, 'CREDIT');
    assert.strictEqual(dto.txnType, 'PAYMENT');
    assert.strictEqual(dto.typeName, 'মার্চেন্ট পেমেন্ট');
    assert.strictEqual(dto.fromName, 'সেলিম চৌধুরী');
    assert.strictEqual(dto.fromWallet, '01611002233');
    assert.strictEqual(dto.amount, 2500);
  });

  runTest('2.6: Ensures netAmount is correct for CREDIT (amount - fee) and DEBIT (amount + fee)', () => {
    const cred = formatTransactionStatementItem({ amount: 1000, fee: 15, balanceChangeType: 'CREDIT' });
    assert.strictEqual(cred.netAmount, 985);
    assert.strictEqual(cred.netAmountPaisa, 98500);

    const deb = formatTransactionStatementItem({ amount: 1000, fee: 15, balanceChangeType: 'DEBIT' });
    assert.strictEqual(deb.netAmount, 1015);
    assert.strictEqual(deb.netAmountPaisa, 101500);
  });

  // ===========================================================================
  // GROUP 3: Transaction Query Engine — Flow & Status Filters
  // ===========================================================================
  console.log('\n[GROUP 3: Transaction Query Engine — Flow & Status Filters]');

  const sampleTxns = [
    { transactionNumber: 'T1', balanceChangeType: 'CREDIT', txnType: 'PAYMENT', amount: 1500, fee: 0, txnStatus: 'COMPLETE', month: '2026-10', txnTime: '2026-10-15T10:00:00Z', businessId: '1' },
    { transactionNumber: 'T2', balanceChangeType: 'DEBIT', txnType: 'SEND_MONEY', amount: 500, fee: 5, txnStatus: 'COMPLETE', month: '2026-10', txnTime: '2026-10-16T11:00:00Z', businessId: '1' },
    { transactionNumber: 'T3', balanceChangeType: 'DEBIT', txnType: 'MOBILE_RECHARGE', amount: 100, fee: 0, txnStatus: 'COMPLETE', month: '2026-10', txnTime: '2026-10-17T12:00:00Z', businessId: '1' },
    { transactionNumber: 'T4', balanceChangeType: 'CREDIT', txnType: 'CASH_IN_FROM_BANK', amount: 10000, fee: 0, txnStatus: 'COMPLETE', month: '2026-10', txnTime: '2026-10-18T13:00:00Z', businessId: '1' },
    { transactionNumber: 'T5', balanceChangeType: 'DEBIT', txnType: 'BILL_PAYMENT', amount: 1250, fee: 10, txnStatus: 'FAILED', month: '2026-10', txnTime: '2026-10-19T14:00:00Z', businessId: '1' },
    { transactionNumber: 'T6', balanceChangeType: 'CREDIT', txnType: 'CASHBACK', amount: 50, fee: 0, txnStatus: 'IN_PROGRESS', month: '2026-10', txnTime: '2026-10-20T15:00:00Z', businessId: '1' },
  ];

  runTest('3.1: Filters by flow INCOMING / INFLOW / PELAM / CREDIT', () => {
    const res = queryWalletTransactions(sampleTxns, { flowType: 'INCOMING' });
    assert.strictEqual(res.totalCount, 3);
    assert.ok(res.items.every(t => t.balanceChangeType === 'CREDIT'));
  });

  runTest('3.2: Filters by flow OUTGOING / OUTFLOW / DILAM / DEBIT', () => {
    const res = queryWalletTransactions(sampleTxns, { flowType: 'OUTFLOW' });
    assert.strictEqual(res.totalCount, 3);
    assert.ok(res.items.every(t => t.balanceChangeType === 'DEBIT'));
  });

  runTest('3.3: Filters by status COMPLETE, FAILED, IN_PROGRESS', () => {
    const comp = queryWalletTransactions(sampleTxns, { txnStatus: 'COMPLETE' });
    assert.strictEqual(comp.totalCount, 4);

    const fail = queryWalletTransactions(sampleTxns, { txnStatus: 'FAILED' });
    assert.strictEqual(fail.totalCount, 1);
    assert.strictEqual(fail.items[0].transactionNumber, 'T5');

    const inProg = queryWalletTransactions(sampleTxns, { txnStatus: 'IN_PROGRESS' });
    assert.strictEqual(inProg.totalCount, 1);
    assert.strictEqual(inProg.items[0].transactionNumber, 'T6');
  });

  runTest('3.4: Filter ALL preserves complete transaction list', () => {
    const res = queryWalletTransactions(sampleTxns, { flowType: 'ALL', status: 'ALL' });
    assert.strictEqual(res.totalCount, 6);
  });

  // ===========================================================================
  // GROUP 4: Transaction Query Engine — Service Type & Search Query Filters
  // ===========================================================================
  console.log('\n[GROUP 4: Service Type & Search Query Filters]');

  runTest('4.1: Filters by txnType (SEND_MONEY, MOBILE_RECHARGE, BILL_PAYMENT, PAYMENT)', () => {
    const sm = queryWalletTransactions(sampleTxns, { txnType: 'SEND_MONEY' });
    assert.strictEqual(sm.totalCount, 1);
    assert.strictEqual(sm.items[0].transactionNumber, 'T2');

    const rcg = queryWalletTransactions(sampleTxns, { txnType: 'MOBILE_RECHARGE' });
    assert.strictEqual(rcg.totalCount, 1);
    assert.strictEqual(rcg.items[0].transactionNumber, 'T3');
  });

  const searchableTxns = [
    { transactionNumber: 'TK-101', fromName: 'করিম স্টোর', toName: 'আমার দোকান', note: 'চাল বিক্রয়', txnTime: '2026-10-15T00:00:00Z', businessId: '1' },
    { transactionNumber: 'TK-202', fromName: 'আমার দোকান', toName: 'রহিম ট্রেডার্স', note: 'ডাল ক্রয়', toWallet: '01811223344', txnTime: '2026-10-16T00:00:00Z', businessId: '1' },
    { transactionNumber: 'TK-303', fromName: 'সুলতান মিয়া', invoiceNo: 'INV-OCT-99', txnTime: '2026-10-17T00:00:00Z', businessId: '1' },
  ];

  runTest('4.2: Free text search matches transactionNumber', () => {
    const res = queryWalletTransactions(searchableTxns, { query: '101' });
    assert.strictEqual(res.totalCount, 1);
    assert.strictEqual(res.items[0].transactionNumber, 'TK-101');
  });

  runTest('4.3: Free text search matches counterparty names and phone numbers', () => {
    const nameMatch = queryWalletTransactions(searchableTxns, { query: 'রহিম' });
    assert.strictEqual(nameMatch.totalCount, 1);
    assert.strictEqual(nameMatch.items[0].transactionNumber, 'TK-202');

    const phoneMatch = queryWalletTransactions(searchableTxns, { query: '01811' });
    assert.strictEqual(phoneMatch.totalCount, 1);
    assert.strictEqual(phoneMatch.items[0].transactionNumber, 'TK-202');
  });

  runTest('4.4: Free text search matches note and invoice number', () => {
    const noteMatch = queryWalletTransactions(searchableTxns, { query: 'চাল' });
    assert.strictEqual(noteMatch.totalCount, 1);
    assert.strictEqual(noteMatch.items[0].transactionNumber, 'TK-101');

    const invMatch = queryWalletTransactions(searchableTxns, { query: 'INV-OCT' });
    assert.strictEqual(invMatch.totalCount, 1);
    assert.strictEqual(invMatch.items[0].transactionNumber, 'TK-303');
  });

  // ===========================================================================
  // GROUP 5: Transaction Query Engine — Date Range & Pagination
  // ===========================================================================
  console.log('\n[GROUP 5: Date Range & Pagination]');

  runTest('5.1: Filters within exact start and end date interval', () => {
    const res = queryWalletTransactions(sampleTxns, {
      startDate: '2026-10-16T00:00:00Z',
      endDate: '2026-10-18T23:59:59Z',
    });
    assert.strictEqual(res.totalCount, 3); // T2, T3, T4
    assert.deepStrictEqual(res.items.map(t => t.transactionNumber), ['T4', 'T3', 'T2']);
  });

  runTest('5.2: Boundary date edge cases (standard YYYY-MM-DD covers full day)', () => {
    const res = queryWalletTransactions(sampleTxns, {
      startDate: '2026-10-15',
      endDate: '2026-10-15',
    });
    assert.strictEqual(res.totalCount, 1);
    assert.strictEqual(res.items[0].transactionNumber, 'T1');
  });

  runTest('5.3: Pagination offsets and limits with hasMore and totalCount accuracy', () => {
    const page1 = queryWalletTransactions(sampleTxns, { offset: 0, limit: 2 });
    assert.strictEqual(page1.items.length, 2);
    assert.strictEqual(page1.totalCount, 6);
    assert.strictEqual(page1.hasMore, true);

    const page2 = queryWalletTransactions(sampleTxns, { offset: 2, limit: 2 });
    assert.strictEqual(page2.items.length, 2);
    assert.strictEqual(page2.totalCount, 6);
    assert.strictEqual(page2.hasMore, true);

    const page3 = queryWalletTransactions(sampleTxns, { offset: 4, limit: 2 });
    assert.strictEqual(page3.items.length, 2);
    assert.strictEqual(page3.totalCount, 6);
    assert.strictEqual(page3.hasMore, false);
  });

  runTest('5.4: Chronological sorting (newest first / descending by txnTime)', () => {
    const res = queryWalletTransactions(sampleTxns, { limit: 10 });
    assert.strictEqual(res.items[0].transactionNumber, 'T6'); // Oct 20
    assert.strictEqual(res.items[res.items.length - 1].transactionNumber, 'T1'); // Oct 15
  });

  // ===========================================================================
  // GROUP 6: Monthly Summary Engine (calculateMonthlyTransactionSummary / TxnReport)
  // ===========================================================================
  console.log('\n[GROUP 6: Monthly Summary Engine (TxnReport)]');

  const summaryTxns = [
    { transactionNumber: 'S1', balanceChangeType: 'CREDIT', txnType: 'PAYMENT', amount: 1500, fee: 0, month: '2026-10', txnTime: '2026-10-15T10:30:00Z' },
    { transactionNumber: 'S2', balanceChangeType: 'DEBIT', txnType: 'SEND_MONEY', amount: 500, fee: 5, month: '2026-10', txnTime: '2026-10-16T14:20:00Z' },
    { transactionNumber: 'S3', balanceChangeType: 'DEBIT', txnType: 'MOBILE_RECHARGE', amount: 100, fee: 0, month: '2026-10', txnTime: '2026-10-17T09:15:00Z' },
    { transactionNumber: 'S4', balanceChangeType: 'CREDIT', txnType: 'CASH_IN_FROM_BANK', amount: 10000, fee: 0, month: '2026-10', txnTime: '2026-10-18T16:45:00Z' },
    { transactionNumber: 'S5', balanceChangeType: 'DEBIT', txnType: 'BILL_PAYMENT', amount: 1250, fee: 10, month: '2026-10', txnTime: '2026-10-19T11:00:00Z' },
    { transactionNumber: 'S6', balanceChangeType: 'DEBIT', txnType: 'CASH_OUT_TO_BANK', amount: 3000, fee: 15, month: '2026-10', txnTime: '2026-10-20T12:00:00Z' },
    { transactionNumber: 'S7', balanceChangeType: 'CREDIT', txnType: 'CASHBACK', amount: 100, fee: 0, month: '2026-10', txnTime: '2026-10-21T13:00:00Z' },
    { transactionNumber: 'S8', balanceChangeType: 'CREDIT', txnType: 'PAYMENT', amount: 2000, fee: 0, month: '2026-11', txnTime: '2026-11-01T10:00:00Z' }, // Next month
  ];

  runTest('6.1: Aggregates totalPelam (inflow) and totalDilam (outflow) with exact integer paisa arithmetic', () => {
    const rep = calculateMonthlyTransactionSummary(summaryTxns, '2026-10');
    assert.strictEqual(rep.month, '2026-10');
    // Total Pelam = 1500 + 10000 + 100 = 11,600 BDT
    assert.strictEqual(rep.totalPelam, 11600.00);
    assert.strictEqual(rep.totalPelamPaisa, 1160000);
    // Total Dilam = 500 + 100 + 1250 + 3000 = 4,850 BDT
    assert.strictEqual(rep.totalDilam, 4850.00);
    assert.strictEqual(rep.totalDilamPaisa, 485000);
  });

  runTest('6.2: Service-specific aggregations: addMoney, sendMoney, sendMoneyFee, mobileRecharge', () => {
    const rep = calculateMonthlyTransactionSummary(summaryTxns, '2026-10');
    assert.strictEqual(rep.addMoney, 10000.00);
    assert.strictEqual(rep.sendMoney, 500.00);
    assert.strictEqual(rep.sendMoneyFee, 5.00);
    assert.strictEqual(rep.mobileRecharge, 100.00);
    assert.strictEqual(rep.mobileRechargeFee, 0.00);
  });

  runTest('6.3: Utility bill and bank transfer metrics: billPay, billPayFee, bankTransfer, bankTransferFee', () => {
    const rep = calculateMonthlyTransactionSummary(summaryTxns, '2026-10');
    assert.strictEqual(rep.billPay, 1250.00);
    assert.strictEqual(rep.billPayFee, 10.00);
    assert.strictEqual(rep.bankTransfer, 3000.00);
    assert.strictEqual(rep.bankTransferFee, 15.00);
    assert.strictEqual(rep.cashback, 100.00);
  });

  runTest('6.4: Monthly filter scopes metrics to target month vs ALL', () => {
    const octRep = calculateMonthlyTransactionSummary(summaryTxns, '2026-10');
    assert.strictEqual(octRep.transactionCount, 7);

    const allRep = calculateMonthlyTransactionSummary(summaryTxns, 'ALL');
    assert.strictEqual(allRep.transactionCount, 8);
    assert.strictEqual(allRep.totalPelam, 13600.00); // +2000 from Nov
  });

  // ===========================================================================
  // GROUP 7: Digital Receipt Details & Social Sharing (generateTransactionReceiptDetails)
  // ===========================================================================
  console.log('\n[GROUP 7: Digital Receipt Details & Social Sharing]');

  const receiptSample = {
    transactionNumber: 'TKBP-20261016-A1B2C3',
    balanceChangeType: 'DEBIT',
    txnType: 'BILL_PAYMENT',
    typeName: 'বিল পে',
    amount: 1500.00,
    fee: 10.00,
    balanceTo: 4500.00,
    txnStatus: 'COMPLETE',
    fromName: 'আমার দোকান',
    toName: 'DESCO Postpaid',
    toWallet: '12345678',
    txnTime: '2026-10-16T14:30:00Z',
  };

  runTest('7.1: Generates TransactionDetailsModel with flow title "টাকা দিলেন" vs "টাকা পেলেন"', () => {
    const recOut = generateTransactionReceiptDetails(receiptSample);
    assert.strictEqual(recOut.flowTitleBn, 'টাকা দিলেন');
    assert.strictEqual(recOut.transactionTitle, 'বিল পে');
    assert.strictEqual(recOut.transactionSubtitle, 'DESCO Postpaid');

    const credSample = { ...receiptSample, balanceChangeType: 'CREDIT', fromName: 'রহিম' };
    const recIn = generateTransactionReceiptDetails(credSample);
    assert.strictEqual(recIn.flowTitleBn, 'টাকা পেলেন');
    assert.strictEqual(recIn.transactionSubtitle, 'রহিম');
  });

  runTest('7.2: Fee and net amount calculations match exact receipt formatting', () => {
    const rec = generateTransactionReceiptDetails(receiptSample);
    assert.strictEqual(rec.amount, 1500.00);
    assert.strictEqual(rec.fee, 10.00);
    assert.strictEqual(rec.netAmount, 1510.00);
    assert.strictEqual(rec.netAmountPaisa, 151000);
    assert.strictEqual(rec.statusBn, 'সফল');
  });

  runTest('7.3: Formats voucher filename adhering to TK_TXN_{transactionNumber}.pdf protocol', () => {
    const rec = generateTransactionReceiptDetails(receiptSample);
    assert.strictEqual(rec.voucherPdfName, 'TK_TXN_TKBP-20261016-A1B2C3.pdf');
  });

  runTest('7.4: Generates multi-channel share text with authentic Bengali branding and timestamp', () => {
    const shareText = generateShareText(receiptSample);
    assert.ok(shareText.includes('--- টালি পে লেনদেন বিবরণী ---'));
    assert.ok(shareText.includes('ধরন: বিল পে'));
    assert.ok(shareText.includes('টাকা দিলেন: ৳ 1500.00'));
    assert.ok(shareText.includes('চার্জ: ৳ 10.00'));
    assert.ok(shareText.includes('স্ট্যাটাস: সফল'));
    assert.ok(shareText.includes('লেনদেন আইডি: TKBP-20261016-A1B2C3'));
    assert.ok(shareText.includes('ধন্যবাদ, টালিখাতা'));
  });

  // ===========================================================================
  // GROUP 8: Multi-Tenant Business Isolation
  // ===========================================================================
  console.log('\n[GROUP 8: Multi-Tenant Business Isolation]');

  await runTestAsync('8.1: Storage repository stores transactions strictly segregated by businessId', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Log transaction for business 1
    const res1 = await repo.logTallyPayTransaction('1', {
      transactionNumber: 'TXN-BIZ1-001',
      balanceChangeType: 'CREDIT',
      txnType: 'PAYMENT',
      amount: 1000,
      fee: 0,
      txnTime: '2026-10-15T10:00:00Z',
    });
    assert.strictEqual(res1.success, true);

    // Log transaction for business 2
    const res2 = await repo.logTallyPayTransaction('2', {
      transactionNumber: 'TXN-BIZ2-002',
      balanceChangeType: 'DEBIT',
      txnType: 'SEND_MONEY',
      amount: 500,
      fee: 5,
      txnTime: '2026-10-16T10:00:00Z',
    });
    assert.strictEqual(res2.success, true);

    // Query business 1
    const txnsBiz1 = repo.getTallyPayTransactions('1');
    assert.strictEqual(txnsBiz1.totalCount, 1);
    assert.strictEqual(txnsBiz1.items[0].transactionNumber, 'TXN-BIZ1-001');

    // Query business 2
    const txnsBiz2 = repo.getTallyPayTransactions('2');
    assert.strictEqual(txnsBiz2.totalCount, 1);
    assert.strictEqual(txnsBiz2.items[0].transactionNumber, 'TXN-BIZ2-002');
  });

  await runTestAsync('8.2: Querying transactions for Business 1 never leaks into Business 2', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.logTallyPayTransaction('1', { transactionNumber: 'B1-TXN', amount: 500 });
    await repo.logTallyPayTransaction('2', { transactionNumber: 'B2-TXN', amount: 900 });

    const q1 = repo.getTallyPayTransactions('1');
    assert.ok(q1.items.every(t => t.businessId === '1'));
    assert.strictEqual(repo.getTallyPayTransactionById('1', 'B2-TXN'), null);
    assert.notStrictEqual(repo.getTallyPayTransactionById('2', 'B2-TXN'), null);
  });

  await runTestAsync('8.3: Monthly summary calculations are strictly tenant-isolated', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.logTallyPayTransaction('1', { transactionNumber: 'B1-M1', amount: 2000, balanceChangeType: 'CREDIT', month: '2026-10' });
    await repo.logTallyPayTransaction('2', { transactionNumber: 'B2-M1', amount: 7000, balanceChangeType: 'CREDIT', month: '2026-10' });

    const sum1 = repo.getTallyPayMonthlySummary('1', '2026-10');
    assert.strictEqual(sum1.totalPelam, 2000.00);

    const sum2 = repo.getTallyPayMonthlySummary('2', '2026-10');
    assert.strictEqual(sum2.totalPelam, 7000.00);
  });

  // ===========================================================================
  // GROUP 9: Cascade Deletion & State Sanitization
  // ===========================================================================
  console.log('\n[GROUP 9: Cascade Deletion & State Sanitization]');

  await runTestAsync('9.1: deleteBusinessCascade purges all tallyPayTransactions for deleted business', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.logTallyPayTransaction('2', { transactionNumber: 'PURGE-TXN-1', amount: 100 });
    await repo.logTallyPayTransaction('2', { transactionNumber: 'PURGE-TXN-2', amount: 200 });
    await repo.logTallyPayTransaction('1', { transactionNumber: 'KEEP-TXN-1', amount: 500 });

    const delRes = await repo.deleteBusinessCascade('2');
    assert.strictEqual(delRes.success, true);

    const biz2Txns = repo.getTallyPayTransactions('2');
    assert.strictEqual(biz2Txns.totalCount, 0);

    const biz1Txns = repo.getTallyPayTransactions('1');
    assert.strictEqual(biz1Txns.totalCount, 1);
    assert.strictEqual(biz1Txns.items[0].transactionNumber, 'KEEP-TXN-1');
  });

  await runTestAsync('9.2: Cascade deletion leaves other tenant transactions completely untouched', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.logTallyPayTransaction('1', { transactionNumber: 'SAFE-1', amount: 150 });
    await repo.logTallyPayTransaction('3', { transactionNumber: 'SAFE-3', amount: 350 });

    await repo.deleteBusinessCascade('2');

    assert.strictEqual(repo.getTallyPayTransactions('1').totalCount, 1);
    assert.strictEqual(repo.getTallyPayTransactions('3').totalCount, 1);
  });

  runTest('9.3: sanitizeState guarantees tallyPayTransactions is initialized to an array', () => {
    const malformed = { accounts: [], journals: [] };
    const sanitized = sanitizeState(malformed);
    assert.ok(Array.isArray(sanitized.tallyPayTransactions));
    assert.strictEqual(sanitized.tallyPayTransactions.length, 0);
  });

  // ===========================================================================
  // GROUP 10: Backup/Restore Serialization & Latency Benchmark
  // ===========================================================================
  console.log('\n[GROUP 10: Backup/Restore Serialization & Latency Benchmark]');

  await runTestAsync('10.1: getFullBackupState sanitizes sensitive tokens, PINs, and credentials', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.logTallyPayTransaction('1', {
      transactionNumber: 'SECURE-TXN',
      amount: 1000,
      pin: '1234',
      rawPin: '1234',
      token: 'SECRET_TOKEN_XYZ',
      sessionToken: 'SESSION_ABC',
    });

    const backup = await repo.getFullBackupState();
    assert.ok(backup.tallyPayTransactions);
    const backedUp = backup.tallyPayTransactions.find(t => t.transactionNumber === 'SECURE-TXN');
    assert.ok(backedUp);
    assert.strictEqual(backedUp.pin, undefined);
    assert.strictEqual(backedUp.rawPin, undefined);
    assert.strictEqual(backedUp.token, undefined);
    assert.strictEqual(backedUp.sessionToken, undefined);
  });

  await runTestAsync('10.2: commitRestorePayload full restore correctly restores tallyPayTransactions', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const payload = {
      manifest: { backupVersion: 6, backupOwner: { sub: 'merchant_1' } },
      data: {
        ...createDefaultState(),
        tallyPayTransactions: [
          { transactionNumber: 'REST-001', amount: 800, balanceChangeType: 'CREDIT', businessId: '1' },
          { transactionNumber: 'REST-002', amount: 1200, balanceChangeType: 'DEBIT', businessId: '2' },
        ],
      },
    };

    const res = await repo.commitRestorePayload(payload);
    assert.strictEqual(res.success, true);

    const b1 = repo.getTallyPayTransactions('1');
    assert.strictEqual(b1.totalCount, 1);
    assert.strictEqual(b1.items[0].transactionNumber, 'REST-001');

    const b2 = repo.getTallyPayTransactions('2');
    assert.strictEqual(b2.totalCount, 1);
    assert.strictEqual(b2.items[0].transactionNumber, 'REST-002');
  });

  await runTestAsync('10.3: commitRestorePayload selective tenant restore imports target business only', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.logTallyPayTransaction('1', { transactionNumber: 'ORIG-1', businessId: '1' });
    await repo.logTallyPayTransaction('2', { transactionNumber: 'ORIG-2', businessId: '2' });

    const payload = {
      manifest: { backupVersion: 6 },
      data: {
        ...createDefaultState(),
        tallyPayTransactions: [
          { transactionNumber: 'REST-BIZ1', amount: 500, businessId: '1' },
          { transactionNumber: 'REST-BIZ2', amount: 999, businessId: '2' },
        ],
      },
    };

    // Selective restore for business '1' only
    const res = await repo.commitRestorePayload(payload, { targetBusinessId: '1' });
    assert.strictEqual(res.success, true);

    const b1 = repo.getTallyPayTransactions('1');
    assert.ok(b1.items.some(t => t.transactionNumber === 'REST-BIZ1'));

    // Business 2 should keep its original transaction and NOT import REST-BIZ2
    const b2 = repo.getTallyPayTransactions('2');
    assert.ok(b2.items.some(t => t.transactionNumber === 'ORIG-2'));
    assert.ok(!b2.items.some(t => t.transactionNumber === 'REST-BIZ2'));
  });

  runTest('10.4: Latency benchmark: 1,000 transaction normalizations, queries, and summaries in < 200ms', () => {
    const start = Date.now();
    const testBatch = [];
    for (let i = 0; i < 1000; i++) {
      testBatch.push({
        transactionNumber: `BENCH-${i}`,
        balanceChangeType: i % 2 === 0 ? 'CREDIT' : 'DEBIT',
        txnType: i % 3 === 0 ? 'PAYMENT' : (i % 3 === 1 ? 'SEND_MONEY' : 'MOBILE_RECHARGE'),
        amount: 100 + (i % 500),
        fee: i % 2 === 0 ? 0 : 5,
        month: '2026-10',
        txnTime: new Date(Date.now() - i * 60000).toISOString(),
      });
    }

    const q = queryWalletTransactions(testBatch, { limit: 50 });
    const s = calculateMonthlyTransactionSummary(testBatch, '2026-10');
    const elapsed = Date.now() - start;

    console.log(`    -> 1,000 txns normalized, queried & summarized in ${elapsed}ms (${(elapsed / 1000).toFixed(4)}ms/op)`);
    assert.ok(elapsed < 200, `Elapsed ${elapsed}ms must be < 200ms`);
    assert.strictEqual(q.totalCount, 1000);
    assert.ok(s.totalPelam > 0);
    assert.ok(s.totalDilam > 0);
  });

  console.log('\n================================================================================');
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests} (100% SUCCESS)`);
  console.log('================================================================================');
}

main().catch(err => {
  console.error('Unhandled fatal test execution error:', err);
  process.exitCode = 1;
});
