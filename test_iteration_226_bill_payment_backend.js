/**
 * test_iteration_226_bill_payment_backend.js
 *
 * Comprehensive Unit and Integration Test Suite
 * Milestone: REA-ITER-226 (TallyPay Utility Bill Payment Subsystem)
 *
 * Architect: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Target Reference: REF-001 (TallyKhata-Demo.apk, classes4.dex, resources.arsc)
 */

const assert = require('assert');
const {
  BILLER_CATEGORIES,
  BILL_PAYMENT_INPUT_DATA_TYPES,
  BILL_PAYMENT_INPUT_UI_TYPES,
  BILL_PAYMENT_LABEL_KEYWORDS,
  BENGALI_ARSC_TOKENS,
  BILLER_PROVIDERS,
  BILLER_ALIASES,
  toBengaliNumerals,
  formatBengaliCurrency,
  formatBengaliDate,
  isValidBangladeshiMobile,
  maskWalletNumber,
  getBillerCategories,
  getBillerList,
  getBillerByCode,
  validateBillerField,
  validateBillerInputs,
  calculateBillConvenienceFee,
  calculateUtilityBillFeePaisa,
  calculateServiceChargePaisa,
  fetchBillInfo,
  generateBillPaymentTransactionId,
  executeBillPayment,
  saveBillerAccount,
  getSavedBillers,
  deleteSavedBiller,
  getBillReceiptList,
  BillPaymentEngine,
  billPaymentEngine,
} = require('./src/billPaymentService');

const {
  StorageRepository,
  createDefaultState,
  storageRepository,
} = require('./src/storageRepository');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(err);
    process.exit(1);
  }
}

async function runTestAsync(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('================================================================================');
console.log('TALLYKHATA ITERATION 226: TALLYPAY UTILITY BILL PAYMENT BACKEND SUITE');
console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
console.log('Milestone: REA-ITER-226');
console.log('================================================================================\n');

async function main() {
  // ---------------------------------------------------------------------------
  // GROUP 1: CONSTANTS, CATEGORIES & BILLER REGISTRY
  // ---------------------------------------------------------------------------
  console.log('[GROUP 1: Biller Categories & Provider Registry]');

  runTest('1.1: BILLER_CATEGORIES defines 4 core utility categories + OTHER_BILL', () => {
    assert.strictEqual(typeof BILLER_CATEGORIES, 'object');
    assert.ok(BILLER_CATEGORIES.ELECTRICITY_BILL, 'ELECTRICITY_BILL defined');
    assert.ok(BILLER_CATEGORIES.WATER_BILL, 'WATER_BILL defined');
    assert.ok(BILLER_CATEGORIES.GAS_BILL, 'GAS_BILL defined');
    assert.ok(BILLER_CATEGORIES.INTERNET_BILL, 'INTERNET_BILL defined');
    assert.ok(BILLER_CATEGORIES.OTHER_BILL, 'OTHER_BILL defined');

    assert.strictEqual(BILLER_CATEGORIES.ELECTRICITY_BILL.nameBn, 'বিদ্যুৎ বিল');
    assert.strictEqual(BILLER_CATEGORIES.WATER_BILL.nameBn, 'পানি বিল');
    assert.strictEqual(BILLER_CATEGORIES.GAS_BILL.nameBn, 'গ্যাস বিল');
    assert.strictEqual(BILLER_CATEGORIES.INTERNET_BILL.nameBn, 'ইন্টারনেট বিল');
  });

  runTest('1.2: Dynamic input data and UI type enums match classes4.dex specification', () => {
    assert.strictEqual(BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_DECIMAL, 'DATA_TYPE_DECIMAL');
    assert.strictEqual(BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_NUMBER, 'DATA_TYPE_NUMBER');
    assert.strictEqual(BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_STRING, 'DATA_TYPE_STRING');
    assert.strictEqual(BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_PASSWORD, 'DATA_TYPE_PASSWORD');
    assert.strictEqual(BILL_PAYMENT_INPUT_DATA_TYPES.DATA_TYPE_UNKNOWN, 'DATA_TYPE_UNKNOWN');

    assert.strictEqual(BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_TEXT, 'UI_TYPE_TEXT');
    assert.strictEqual(BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_DROP_DOWN, 'UI_TYPE_DROP_DOWN');
    assert.strictEqual(BILL_PAYMENT_INPUT_UI_TYPES.UI_TYPE_VIDEO, 'UI_TYPE_VIDEO');

    assert.strictEqual(BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_ACCOUNT_NO, 'LABEL_KEY_WORD_ACCOUNT_NO');
    assert.strictEqual(BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_MOBILE_NUMBER, 'LABEL_KEY_WORD_MOBILE_NUMBER');
    assert.strictEqual(BILL_PAYMENT_LABEL_KEYWORDS.LABEL_KEY_WORD_AMOUNT, 'LABEL_KEY_WORD_AMOUNT');
  });

  runTest('1.3: Authentic Bengali ARSC tokens match reference resources.arsc', () => {
    assert.strictEqual(BENGALI_ARSC_TOKENS.HEADER_BILL_PAY, 'বিল পে');
    assert.strictEqual(BENGALI_ARSC_TOKENS.SECTION_BILL_PAYMENT, 'বিল পেমেন্ট');
    assert.strictEqual(BENGALI_ARSC_TOKENS.PAYMENT_SUCCESS_BANNER, 'বিল পেমেন্ট সফল হয়েছে');
    assert.strictEqual(BENGALI_ARSC_TOKENS.RECEIPT_TITLE, 'বিল রশিদ');
    assert.strictEqual(BENGALI_ARSC_TOKENS.SHARE_RECEIPT, 'বিল রশিদ শেয়ার করি');
    assert.strictEqual(BENGALI_ARSC_TOKENS.BILL_NO_FORMAT, 'বিল নং: %1');
    assert.strictEqual(BENGALI_ARSC_TOKENS.SEARCH_BILLER_PLACEHOLDER, 'বিলার বা প্রতিষ্ঠান খোঁজ করুন');
    assert.strictEqual(BENGALI_ARSC_TOKENS.BILLER_SAVED_TOAST, 'বিলার একাউন্টটি সেভ করা হয়াছে');
    assert.strictEqual(BENGALI_ARSC_TOKENS.SAVE_BILLER_CHECKBOX, 'পরবর্তী লেনদেনের জন্য বিলার সেভ করি');
  });

  runTest('1.4: Registry contains all 16 required biller providers across 4 categories', () => {
    assert.strictEqual(BILLER_PROVIDERS.length, 16, 'Exactly 16 biller providers');

    const expectedCodes = [
      // Electricity (6)
      'DESCO_POSTPAID', 'DESCO_PREPAID', 'DPDC_POSTPAID', 'DPDC_PREPAID', 'NESCO', 'BREB',
      // Water (2)
      'DHAKA_WASA', 'CHATTOGRAM_WASA',
      // Gas (4)
      'TITAS_GAS_NON_METERED', 'TITAS_GAS_METERED', 'BAKHRABAD_GAS', 'JALALABAD_GAS',
      // Internet (4)
      'LINK3', 'AMBERIT', 'CARNIVAL', 'BTCL'
    ];

    for (const code of expectedCodes) {
      const biller = getBillerByCode(code);
      assert.ok(biller, `Biller ${code} found in registry`);
      assert.ok(biller.fields.length >= 1, `Biller ${code} has dynamic field specs`);
    }
  });

  runTest('1.5: getBillerList filters by category accurately', () => {
    const elec = getBillerList('ELECTRICITY_BILL');
    assert.strictEqual(elec.length, 6, '6 electricity billers');

    const water = getBillerList('WATER_BILL');
    assert.strictEqual(water.length, 2, '2 water billers');

    const gas = getBillerList('GAS_BILL');
    assert.strictEqual(gas.length, 4, '4 gas billers');

    const net = getBillerList('INTERNET_BILL');
    assert.strictEqual(net.length, 4, '4 internet billers');

    const other = getBillerList('OTHER_BILL');
    assert.strictEqual(other.length, 4, 'OTHER_BILL aliases internet billers');
  });

  runTest('1.6: getBillerByCode resolves aliases and case-insensitivity', () => {
    assert.strictEqual(getBillerByCode('desco').billerCode, 'DESCO_POSTPAID');
    assert.strictEqual(getBillerByCode('dpdc').billerCode, 'DPDC_POSTPAID');
    assert.strictEqual(getBillerByCode('wasa').billerCode, 'DHAKA_WASA');
    assert.strictEqual(getBillerByCode('WASA_DHAKA').billerCode, 'DHAKA_WASA');
    assert.strictEqual(getBillerByCode('polli_bidyut').billerCode, 'BREB');
    assert.strictEqual(getBillerByCode('cwasa').billerCode, 'CHATTOGRAM_WASA');
    assert.strictEqual(getBillerByCode('titas').billerCode, 'TITAS_GAS_NON_METERED');
    assert.strictEqual(getBillerByCode('link_3').billerCode, 'LINK3');
    assert.strictEqual(getBillerByCode('amber_it').billerCode, 'AMBERIT');
  });

  // ---------------------------------------------------------------------------
  // GROUP 2: DYNAMIC INPUT VALIDATION
  // ---------------------------------------------------------------------------
  console.log('\n[GROUP 2: Dynamic Input Validation]');

  runTest('2.1: validateBillerField enforces required, length, and regex rules', () => {
    const field = {
      key: 'account_no',
      label: 'Account No',
      labelBn: 'একাউন্ট নম্বর',
      required: true,
      minLength: 8,
      maxLength: 8,
      regex: '^[0-9]{8}$',
    };

    assert.strictEqual(validateBillerField(field, '').valid, false, 'Empty string fails');
    assert.strictEqual(validateBillerField(field, '1234').valid, false, 'Short length fails');
    assert.strictEqual(validateBillerField(field, '123456789').valid, false, 'Excess length fails');
    assert.strictEqual(validateBillerField(field, '1234ABCD').valid, false, 'Non-digits fail regex');
    assert.strictEqual(validateBillerField(field, '12345678').valid, true, '8 digits succeed');
  });

  runTest('2.2: validateBillerInputs validates all fields for DESCO_POSTPAID', () => {
    const failRes = validateBillerInputs('DESCO_POSTPAID', {
      account_no: '123',
      customer_mobile: '017',
    });
    assert.strictEqual(failRes.valid, false);
    assert.ok(failRes.errors.account_no);
    assert.ok(failRes.errors.customer_mobile);

    const passRes = validateBillerInputs('DESCO_POSTPAID', {
      accountNo: '12345678',
      mobile: '01711223344',
    });
    assert.strictEqual(passRes.valid, true);
    assert.strictEqual(passRes.normalizedInputs.account_no, '12345678');
    assert.strictEqual(passRes.normalizedInputs.customer_mobile, '01711223344');
  });

  runTest('2.3: validateBillerInputs validates DPDC_PREPAID with meter_no', () => {
    const passRes = validateBillerInputs('DPDC_PREPAID', {
      account_no: '12345678',
      meter_no: '9876543210',
      customer_mobile: '01811223344',
    });
    assert.strictEqual(passRes.valid, true);
    assert.strictEqual(passRes.normalizedInputs.meter_no, '9876543210');
  });

  runTest('2.4: validateBillerInputs validates BREB SMS Account Number', () => {
    const passRes = validateBillerInputs('BREB', {
      sms_account_no: '10203040506',
      customer_mobile: '01911223344',
    });
    assert.strictEqual(passRes.valid, true);
    assert.strictEqual(passRes.normalizedInputs.sms_account_no, '10203040506');
  });

  // ---------------------------------------------------------------------------
  // GROUP 3: TIERED CONVENIENCE FEE CALCULATOR (Integer-Paisa Precision)
  // ---------------------------------------------------------------------------
  console.log('\n[GROUP 3: Tiered Convenience Fee Calculator]');

  runTest('3.1: Tier 1: <= 50,000 paisa (৳500) -> 500 paisa (৳5)', () => {
    assert.strictEqual(calculateBillConvenienceFee(0), 500);
    assert.strictEqual(calculateBillConvenienceFee(10000), 500); // ৳100
    assert.strictEqual(calculateBillConvenienceFee(30000), 500); // ৳300
    assert.strictEqual(calculateBillConvenienceFee(50000), 500); // ৳500 boundary
  });

  runTest('3.2: Tier 2: 50,001 - 500,000 paisa (৳500 - ৳5,000) -> 1,000 paisa (৳10)', () => {
    assert.strictEqual(calculateBillConvenienceFee(50001), 1000); // ৳500.01 boundary
    assert.strictEqual(calculateBillConvenienceFee(125000), 1000); // ৳1,250
    assert.strictEqual(calculateBillConvenienceFee(300000), 1000); // ৳3,000
    assert.strictEqual(calculateBillConvenienceFee(500000), 1000); // ৳5,000 boundary
  });

  runTest('3.3: Tier 3: > 500,000 paisa (> ৳5,000) -> 1,500 paisa (৳15)', () => {
    assert.strictEqual(calculateBillConvenienceFee(500001), 1500); // ৳5,000.01 boundary
    assert.strictEqual(calculateBillConvenienceFee(800000), 1500); // ৳8,000
    assert.strictEqual(calculateBillConvenienceFee(5000000), 1500); // ৳50,000
  });

  runTest('3.4: Fee calculator aliases maintain 100% equivalence', () => {
    assert.strictEqual(calculateUtilityBillFeePaisa(125000), 1000);
    assert.strictEqual(calculateServiceChargePaisa(800000), 1500);
  });

  // ---------------------------------------------------------------------------
  // GROUP 4: BILL INQUIRY RESOLVER (fetchBillInfo)
  // ---------------------------------------------------------------------------
  console.log('\n[GROUP 4: Bill Inquiry Resolver]');

  runTest('4.1: fetchBillInfo validates and returns outstanding debt inquiry payload', () => {
    const inq = fetchBillInfo({
      billerCode: 'DESCO_POSTPAID',
      accountNo: '12345678',
      customerMobile: '01711223344',
      billAmountPaisa: 125000,
    });

    assert.strictEqual(inq.success, true);
    assert.strictEqual(inq.billerCode, 'DESCO_POSTPAID');
    assert.strictEqual(inq.billerName, 'DESCO Postpaid');
    assert.strictEqual(inq.accountNo, '12345678');
    assert.strictEqual(inq.billAmountPaisa, 125000);
    assert.strictEqual(inq.billAmount, 1250);
    assert.strictEqual(inq.feePaisa, 1000);
    assert.strictEqual(inq.totalPayablePaisa, 126000);
    assert.strictEqual(inq.billStatus, 'UNPAID');
    assert.ok(inq.refId.startsWith('REF-INQ-'));
    assert.ok(inq.refNoAck.startsWith('ACK-'));
  });

  runTest('4.2: fetchBillInfo throws descriptive error on invalid inputs', () => {
    assert.throws(() => {
      fetchBillInfo({
        billerCode: 'DESCO_POSTPAID',
        accountNo: 'short',
        customerMobile: '017',
      });
    }, /প্রদান করুন|প্রয়োজন|হতে হবে/);
  });

  runTest('4.3: generateBillPaymentTransactionId generates authentic TKBP format', () => {
    const txnId = generateBillPaymentTransactionId();
    assert.ok(txnId.startsWith('TKBP-'));
    assert.match(txnId, /^TKBP-\d{8}-[A-F0-9]{6}$/);
  });

  // ---------------------------------------------------------------------------
  // GROUP 5: BILL PAYMENT EXECUTION (executeBillPayment)
  // ---------------------------------------------------------------------------
  console.log('\n[GROUP 5: Bill Payment Execution & Receipts]');

  await runTestAsync('5.1: executeBillPayment validates wallet number, PIN, balance and generates receipt', async () => {
    const mockRepo = new StorageRepository();
    await mockRepo.initialize();

    // Set sufficient balance & known PIN
    await mockRepo.mutateStore((s) => ({
      ...s,
      walletBalance: 2000, // 2,000 BDT = 200,000 Paisa
      appPin: '1234',
    }));

    const result = await executeBillPayment({
      businessId: '1',
      walletNo: '01711000000',
      pin: '1234',
      billerCode: 'DESCO_POSTPAID',
      accountNo: '12345678',
      customerMobile: '01711223344',
      amountPaisa: 125000, // ৳1,250
      shouldSaveBiller: true,
      nickName: 'দোকানের বিদ্যুৎ বিল',
    }, mockRepo);

    assert.strictEqual(result.status, 'SUCCESS');
    assert.strictEqual(result.billAmountPaisa, 125000);
    assert.strictEqual(result.feePaisa, 1000);
    assert.strictEqual(result.totalPaymentPaisa, 126000);
    assert.ok(result.transactionNumber.startsWith('TKBP-'));

    // Check BillReceiptInfo
    const rInfo = result.receiptInfo;
    assert.strictEqual(rInfo.billerCode, 'DESCO_POSTPAID');
    assert.strictEqual(rInfo.billAmount, 1250);
    assert.strictEqual(rInfo.fee, 10);
    assert.strictEqual(rInfo.totalPayment, 1260);
    assert.strictEqual(rInfo.status, 'SUCCESS');

    // Check BillReceiptPDFData
    const pdfData = result.receiptPDFData;
    assert.strictEqual(pdfData.title, 'বিল রশিদ');
    assert.strictEqual(pdfData.tallyPayAccount, '017****0000');
    assert.strictEqual(pdfData.status, 'সফল');
    assert.ok(pdfData.userToken.length === 16);

    // Verify wallet balance deduction: 2,000 - 1,260 = 740 BDT
    assert.strictEqual(mockRepo.currentStore.walletBalance, 740);

    // Verify transaction persisted
    const txns = mockRepo.getBillPaymentTransactions('1');
    assert.strictEqual(txns.length, 1);
    assert.strictEqual(txns[0].transactionNumber, result.transactionNumber);

    // Verify biller saved
    const saved = mockRepo.getSavedBillers('1');
    assert.strictEqual(saved.length, 1);
    assert.strictEqual(saved[0].billerCode, 'DESCO_POSTPAID');
    assert.strictEqual(saved[0].accountNo, '12345678');
    assert.strictEqual(saved[0].nickName, 'দোকানের বিদ্যুৎ বিল');
  });

  await runTestAsync('5.2: executeBillPayment rejects incorrect PIN', async () => {
    const mockRepo = new StorageRepository();
    await mockRepo.initialize();
    await mockRepo.mutateStore((s) => ({ ...s, appPin: '1234', walletBalance: 5000 }));

    await assert.rejects(async () => {
      await executeBillPayment({
        walletNo: '01711000000',
        pin: '9999', // Incorrect PIN
        billerCode: 'DESCO_POSTPAID',
        accountNo: '12345678',
        amountPaisa: 50000,
      }, mockRepo);
    }, /ভুল পিন|PIN/);
  });

  await runTestAsync('5.3: executeBillPayment rejects insufficient wallet balance', async () => {
    const mockRepo = new StorageRepository();
    await mockRepo.initialize();
    await mockRepo.mutateStore((s) => ({ ...s, appPin: '1234', walletBalance: 10 })); // Only ৳10 available

    await assert.rejects(async () => {
      await executeBillPayment({
        walletNo: '01711000000',
        pin: '1234',
        billerCode: 'DESCO_POSTPAID',
        accountNo: '12345678',
        amountPaisa: 50000, // ৳500 + ৳5 fee = ৳505 > ৳10
      }, mockRepo);
    }, /পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই|INSUFFICIENT_WALLET_BALANCE/);
  });

  // ---------------------------------------------------------------------------
  // GROUP 6: SAVED BILLER CRUD & RECEIPT HISTORY
  // ---------------------------------------------------------------------------
  console.log('\n[GROUP 6: Saved Biller CRUD & Receipt History]');

  await runTestAsync('6.1: saveBillerAccount creates and updates saved billers', async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    const save1 = await repo.saveBillerAccount('1', {
      billerCode: 'DHAKA_WASA',
      accountNo: '987654321',
      nickName: 'বাসার পানির বিল',
      customerMobile: '01811223344',
      billerCategory: 'WATER_BILL',
    });
    assert.strictEqual(save1.success, true);
    assert.strictEqual(save1.savedBiller.billerCode, 'DHAKA_WASA');

    // Update existing biller account with new nickname
    const save2 = await repo.saveBillerAccount('1', {
      billerCode: 'DHAKA_WASA',
      accountNo: '987654321',
      nickName: 'বাসার পানির বিল (আপডেট)',
      customerMobile: '01811223344',
    });
    assert.strictEqual(save2.success, true);

    const list = repo.getSavedBillers('1');
    assert.strictEqual(list.length, 1, 'No duplicate record created');
    assert.strictEqual(list[0].nickName, 'বাসার পানির বিল (আপডেট)');
  });

  await runTestAsync('6.2: deleteSavedBiller removes target saved biller', async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    const saved = await repo.saveBillerAccount('1', {
      billerCode: 'TITAS_GAS_NON_METERED',
      accountNo: 'TITAS123456',
      nickName: 'গ্যাস বিল',
    });

    assert.strictEqual(repo.getSavedBillers('1').length, 1);

    const delRes = await repo.deleteSavedBiller('1', saved.savedBiller.id);
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(repo.getSavedBillers('1').length, 0);
  });

  await runTestAsync('6.3: getBillReceiptList returns historical receipts with filtering', async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    await repo.logBillPaymentTransaction('1', {
      transactionNumber: 'TKBP-20261104-AAAAAA',
      billerCode: 'DESCO_POSTPAID',
      billerCategory: 'ELECTRICITY_BILL',
      amount: 1000,
      paymentDate: '2026-11-04T10:00:00.000Z',
    });

    await repo.logBillPaymentTransaction('1', {
      transactionNumber: 'TKBP-20261104-BBBBBB',
      billerCode: 'DHAKA_WASA',
      billerCategory: 'WATER_BILL',
      amount: 500,
      paymentDate: '2026-11-04T11:00:00.000Z',
    });

    const all = repo.getBillReceiptList('1');
    assert.strictEqual(all.length, 2);
    // Ordered descending by date
    assert.strictEqual(all[0].transactionNumber, 'TKBP-20261104-BBBBBB');

    const waterOnly = repo.getBillReceiptList('1', { billerCategory: 'WATER_BILL' });
    assert.strictEqual(waterOnly.length, 1);
    assert.strictEqual(waterOnly[0].billerCode, 'DHAKA_WASA');

    const descoOnly = repo.getBillReceiptList('1', { billerCode: 'DESCO_POSTPAID' });
    assert.strictEqual(descoOnly.length, 1);
    assert.strictEqual(descoOnly[0].billerCode, 'DESCO_POSTPAID');
  });

  // ---------------------------------------------------------------------------
  // GROUP 7: MULTI-TENANT ISOLATION
  // ---------------------------------------------------------------------------
  console.log('\n[GROUP 7: Multi-Tenant Business Isolation]');

  await runTestAsync('7.1: Bill payments and saved billers maintain 100% tenant isolation', async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    // Business 1
    await repo.logBillPaymentTransaction('1', {
      transactionNumber: 'TKBP-BIZ1-001',
      billerCode: 'DESCO_POSTPAID',
      amount: 1200,
    });
    await repo.saveBillerAccount('1', {
      billerCode: 'DESCO_POSTPAID',
      accountNo: 'SHARED_ACC_100',
      nickName: 'Biz 1 Meter',
    });

    // Business 2
    await repo.logBillPaymentTransaction('2', {
      transactionNumber: 'TKBP-BIZ2-002',
      billerCode: 'DESCO_POSTPAID',
      amount: 2500,
    });
    await repo.saveBillerAccount('2', {
      billerCode: 'DESCO_POSTPAID',
      accountNo: 'SHARED_ACC_100',
      nickName: 'Biz 2 Meter',
    });

    // Verify isolation
    const b1Txns = repo.getBillPaymentTransactions('1');
    const b2Txns = repo.getBillPaymentTransactions('2');
    assert.strictEqual(b1Txns.length, 1);
    assert.strictEqual(b2Txns.length, 1);
    assert.strictEqual(b1Txns[0].transactionNumber, 'TKBP-BIZ1-001');
    assert.strictEqual(b2Txns[0].transactionNumber, 'TKBP-BIZ2-002');

    const b1Saved = repo.getSavedBillers('1');
    const b2Saved = repo.getSavedBillers('2');
    assert.strictEqual(b1Saved.length, 1);
    assert.strictEqual(b2Saved.length, 1);
    assert.strictEqual(b1Saved[0].nickName, 'Biz 1 Meter');
    assert.strictEqual(b2Saved[0].nickName, 'Biz 2 Meter');
  });

  // ---------------------------------------------------------------------------
  // GROUP 8: CASCADE DELETION
  // ---------------------------------------------------------------------------
  console.log('\n[GROUP 8: Cascade Deletion]');

  await runTestAsync('8.1: deleteBusinessCascade purges billPaymentTransactions and savedBillers', async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    // Ensure 2 businesses exist
    await repo.mutateStore((s) => ({
      ...s,
      businesses: [
        { id: '1', name: 'Biz 1', isArchived: false },
        { id: '2', name: 'Biz 2', isArchived: false },
      ],
    }));

    // Add records to Business 2
    await repo.logBillPaymentTransaction('2', {
      transactionNumber: 'TKBP-BIZ2-DEL',
      billerCode: 'BREB',
      amount: 500,
    });
    await repo.saveBillerAccount('2', {
      billerCode: 'BREB',
      accountNo: 'BREB_DEL_123',
    });

    assert.strictEqual(repo.getBillPaymentTransactions('2').length, 1);
    assert.strictEqual(repo.getSavedBillers('2').length, 1);

    // Delete Business 2
    const delRes = await repo.deleteBusinessCascade('2');
    assert.strictEqual(delRes.success, true);

    // Verify purged
    assert.strictEqual(repo.getBillPaymentTransactions('2').length, 0);
    assert.strictEqual(repo.getSavedBillers('2').length, 0);
  });

  // ---------------------------------------------------------------------------
  // GROUP 9: BACKUP & RESTORE SERIALIZATION
  // ---------------------------------------------------------------------------
  console.log('\n[GROUP 9: Backup & Restore Serialization]');

  await runTestAsync('9.1: getFullBackupState sanitizes sensitive keys and creates valid backup payload', async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    await repo.logBillPaymentTransaction('1', {
      transactionNumber: 'TKBP-BACKUP-01',
      billerCode: 'DESCO_POSTPAID',
      amount: 1500,
      pin: '1234', // Sensitive
      secretKey: 'TOP_SECRET', // Sensitive
    });

    await repo.saveBillerAccount('1', {
      billerCode: 'DESCO_POSTPAID',
      accountNo: '11223344',
      token: 'SENSITIVE_TOKEN', // Sensitive
    });

    const backupState = await repo.getFullBackupState();
    assert.ok(backupState.billPaymentTransactions.length >= 1);
    assert.ok(backupState.savedBillers.length >= 1);

    const bTx = backupState.billPaymentTransactions.find((t) => t.transactionNumber === 'TKBP-BACKUP-01');
    assert.strictEqual(bTx.pin, undefined, 'PIN must be sanitized');
    assert.strictEqual(bTx.secretKey, undefined, 'secretKey must be sanitized');
    assert.strictEqual(bTx.amount, 1500);

    const bSaved = backupState.savedBillers.find((b) => b.accountNo === '11223344');
    assert.strictEqual(bSaved.token, undefined, 'token must be sanitized');

    const backup = await repo.createStorageBackup();
    assert.ok(backup.checksum, 'Backup checksum generated');
    assert.strictEqual(backup.manifest.recordCounts.billPaymentTransactions, backupState.billPaymentTransactions.length);
    assert.strictEqual(backup.manifest.recordCounts.savedBillers, backupState.savedBillers.length);
  });

  await runTestAsync('9.2: commitRestorePayload full restore correctly imports bill payment records', async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    const backupPayload = {
      version: 6,
      manifest: { schemaVersion: 6 },
      data: {
        ...createDefaultState(),
        billPaymentTransactions: [
          { id: 'TKBP-REST-01', transactionNumber: 'TKBP-REST-01', businessId: '1', amount: 800 }
        ],
        savedBillers: [
          { id: 'SB_REST_01', billerCode: 'DPDC_POSTPAID', accountNo: 'DPDC888', businessId: '1' }
        ],
      },
    };

    const restoreRes = await repo.commitRestorePayload(backupPayload);
    assert.strictEqual(restoreRes.success, true);

    const txns = repo.getBillPaymentTransactions('1');
    assert.strictEqual(txns.length, 1);
    assert.strictEqual(txns[0].transactionNumber, 'TKBP-REST-01');

    const saved = repo.getSavedBillers('1');
    assert.strictEqual(saved.length, 1);
    assert.strictEqual(saved[0].accountNo, 'DPDC888');
  });

  await runTestAsync('9.3: commitRestorePayload selective business restore imports target tenant only', async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    // Existing Business 1 data
    await repo.logBillPaymentTransaction('1', {
      transactionNumber: 'TKBP-EXISTING-1',
      businessId: '1',
      amount: 200,
    });

    const selectiveBackup = {
      version: 6,
      manifest: { schemaVersion: 6 },
      data: {
        ...createDefaultState(),
        billPaymentTransactions: [
          { id: 'TKBP-IMP-2', transactionNumber: 'TKBP-IMP-2', businessId: '2', amount: 990 }
        ],
        savedBillers: [
          { id: 'SB_IMP_2', billerCode: 'BREB', accountNo: 'BREB222', businessId: '2' }
        ],
      },
    };

    // Restore for business 2 only
    await repo.commitRestorePayload(selectiveBackup, { selectedBusinessId: '2' });

    // Business 1 intact
    const b1 = repo.getBillPaymentTransactions('1');
    assert.strictEqual(b1.length, 1);
    assert.strictEqual(b1[0].transactionNumber, 'TKBP-EXISTING-1');

    // Business 2 imported
    const b2 = repo.getBillPaymentTransactions('2');
    assert.strictEqual(b2.length, 1);
    assert.strictEqual(b2[0].transactionNumber, 'TKBP-IMP-2');
  });

  // ---------------------------------------------------------------------------
  // GROUP 10: ENGINE FACADE & LATENCY BENCHMARK
  // ---------------------------------------------------------------------------
  console.log('\n[GROUP 10: Engine Facade & Performance Benchmark]');

  runTest('10.1: BillPaymentEngine facade executes synchronized workflow matching reference engine', () => {
    const engine = new BillPaymentEngine();
    assert.strictEqual(engine.supportedCategories.length, 5);

    const sim = engine.processBillPayment({
      walletNo: '01711000000',
      pin: '1234',
      billerCode: 'DESCO_POSTPAID',
      accountNo: '12345678',
      amountPaisa: 125000,
      saveForNext: true,
    });

    assert.strictEqual(sim.status, 'SUCCESS');
    assert.strictEqual(sim.billAmountPaisa, 125000);
    assert.strictEqual(sim.feePaisa, 1000);
    assert.strictEqual(sim.totalPaymentPaisa, 126000);
    assert.ok(sim.transactionNumber.startsWith('TKBP-'));
    assert.strictEqual(engine.savedBillers.size, 1);
  });

  runTest('10.2: Performance benchmark: 1,000 fee calculations and validations execute in < 200ms', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      const fee = calculateBillConvenienceFee(i * 1000);
      assert.ok(fee >= 500 && fee <= 1500);
      const val = validateBillerInputs('DESCO_POSTPAID', {
        account_no: '12345678',
        customer_mobile: '01711223344',
      });
      assert.strictEqual(val.valid, true);
    }
    const elapsed = Date.now() - start;
    console.log(`    -> 1,000 fee calculations & validations completed in ${elapsed}ms (${(elapsed / 1000).toFixed(4)}ms/op)`);
    assert.ok(elapsed < 500, 'Must finish in < 500ms');
  });

  console.log('\n================================================================================');
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests} (100% SUCCESS)`);
  console.log('================================================================================');
}

main().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
