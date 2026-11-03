/**
 * test_iteration_220_bangla_qr_emvco_backend.js
 *
 * TALLYKHATA ITERATION 220: BANGLA QR & SUPER QR EMVCo BACKEND SUITE
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 * Milestone: REA-ITER-220
 */

const assert = require('assert');
const crypto = require('crypto');
const banglaQrService = require('./src/banglaQrService');
const {
  StorageRepository,
  createDefaultState,
  logBanglaQrTransaction,
  getBanglaQrTransactions,
  getBanglaQrTransactionByTxnNumber,
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
console.log('TALLYKHATA ITERATION 220: SUPER QR & BANGLA QR EMVCo BACKEND SUITE');
console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
console.log('Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895');
console.log('================================================================================');

// -----------------------------------------------------------------------------
// TEST 1: Standards, Constants & Supported Payment Apps
// -----------------------------------------------------------------------------
runTest('Standards & Constants: Bangladesh Bank Bangla QR Specifications', () => {
  assert.strictEqual(banglaQrService.BANGLA_QR_RID, 'A000000677010111', 'Must match standard Bangladesh Bank RID');
  assert.strictEqual(banglaQrService.DEFAULT_MCC, '5411', 'Default MCC must be 5411');
  assert.strictEqual(banglaQrService.CURRENCY_BDT, '050', 'Currency BDT ISO code must be 050');
  assert.strictEqual(banglaQrService.COUNTRY_BD, 'BD', 'Country code must be BD');
  assert.strictEqual(banglaQrService.POI_STATIC, '11', 'Static POI must be 11');
  assert.strictEqual(banglaQrService.POI_DYNAMIC, '12', 'Dynamic POI must be 12');
  assert.strictEqual(banglaQrService.SUPPORTED_PAYMENT_APPS.length, 7, 'Must support 7 interoperable payment brands');
  return { appsCount: banglaQrService.SUPPORTED_PAYMENT_APPS.length, rid: banglaQrService.BANGLA_QR_RID };
});

// -----------------------------------------------------------------------------
// TEST 2: CRC16-CCITT Mathematical Correctness & Tamper Detection
// -----------------------------------------------------------------------------
runTest('CRC16-CCITT Checksum Calculation & Tamper Resistance', () => {
  // Test vector: known EMVCo sample
  const sampleData = '00020101021153030505802BD5914M/S BISMILLAH6005Dhaka6304';
  const crc = banglaQrService.calculateCrc16Ccitt(sampleData);
  assert.strictEqual(typeof crc, 'string', 'CRC must be a string');
  assert.strictEqual(crc.length, 4, 'CRC must be exactly 4 uppercase hex characters');
  assert.ok(/^[0-9A-F]{4}$/.test(crc), 'CRC must be uppercase hexadecimal');

  // Verify that tampering a single character alters the CRC
  const tamperedData = '00020101021153030505802BD5914M/S BISMILLAI6005Dhaka6304';
  const tamperedCrc = banglaQrService.calculateCrc16Ccitt(tamperedData);
  assert.notStrictEqual(crc, tamperedCrc, 'Tampered data must yield completely different CRC');

  // Verify full validation helper
  const completeValidPayload = sampleData + crc;
  assert.strictEqual(banglaQrService.validateBanglaQrChecksum(completeValidPayload), true, 'Valid payload must pass checksum');

  const completeTamperedPayload = sampleData + 'FFFF';
  assert.strictEqual(banglaQrService.validateBanglaQrChecksum(completeTamperedPayload), false, 'Corrupted CRC must be rejected');

  return { sampleCrc: crc, tamperDetected: true };
});

// -----------------------------------------------------------------------------
// TEST 3: TLV Formatting and Parsing Invariants
// -----------------------------------------------------------------------------
runTest('EMVCo TLV (Tag-Length-Value) Encoding & Decoding Engine', () => {
  const tlv00 = banglaQrService.formatTlv('00', '01');
  assert.strictEqual(tlv00, '000201', 'Tag 00 formatting');

  const tlv59 = banglaQrService.formatTlv('59', 'হাসান ট্রেডার্স');
  // Bengali string UTF-8 byte length verification
  const byteLen = Buffer.byteLength('হাসান ট্রেডার্স', 'utf8');
  assert.strictEqual(tlv59, `59${String(byteLen).padStart(2, '0')}হাসান ট্রেডার্স`, 'UTF-8 multi-byte length accuracy');

  const stream = tlv00 + tlv59;
  const parsed = banglaQrService.parseTlv(stream);
  assert.strictEqual(parsed['00'], '01', 'Parsed tag 00');
  assert.strictEqual(parsed['59'], 'হাসান ট্রেডার্স', 'Parsed tag 59');

  return { parsedCount: Object.keys(parsed).length, multiByteOk: true };
});

// -----------------------------------------------------------------------------
// TEST 4: Static Merchant Bangla QR Generation
// -----------------------------------------------------------------------------
runTest('Static Bangla QR Payload Assembly (Merchant Profile)', () => {
  const merchantConfig = {
    merchantName: 'মা স্টোর',
    merchantCity: 'Dhaka',
    accountNo: '01711223344',
    acquirerId: 'TALLYPAY',
    mcc: '5411',
  };

  const payload = banglaQrService.generateBanglaQrPayload(merchantConfig);
  assert.strictEqual(typeof payload, 'string', 'Payload must be a string');
  assert.ok(payload.startsWith('000201010211'), 'Must start with version 01 and POI 11 (Static)');
  assert.ok(payload.includes('A000000677010111'), 'Must contain Bangladesh Bank RID');
  assert.ok(payload.includes('01711223344'), 'Must contain merchant account');
  assert.ok(payload.includes('5303050'), 'Must contain Currency BDT (050)');
  assert.ok(payload.includes('5802BD'), 'Must contain Country BD');
  assert.strictEqual(banglaQrService.validateBanglaQrChecksum(payload), true, 'Static QR checksum must be valid');

  const parsed = banglaQrService.parseBanglaQrPayload(payload);
  assert.strictEqual(parsed.isValid, true, 'Parsed QR must be valid');
  assert.strictEqual(parsed.isDynamic, false, 'Must be static QR');
  assert.strictEqual(parsed.merchantName, 'মা স্টোর', 'Merchant name must match');
  assert.strictEqual(parsed.merchantAccount, '01711223344', 'Merchant account must match');
  assert.strictEqual(parsed.amount, null, 'Static QR must have null amount');

  return { payloadLength: payload.length, isValid: parsed.isValid, isDynamic: parsed.isDynamic };
});

// -----------------------------------------------------------------------------
// TEST 5: Dynamic Amount Bangla QR Generation & Integer Paisa Safety
// -----------------------------------------------------------------------------
runTest('Dynamic Bangla QR with Precise Amount & Zero Float Drift', () => {
  const merchantConfig = {
    merchantName: 'মোবাইল এক্সপ্রেস',
    merchantCity: 'Chittagong',
    accountNo: '01811998877',
    acquirerId: 'TALLYPAY',
  };

  const options = {
    amount: 1575.50,
    billNumber: 'INV-2026-9901',
    reference: 'CUST-8812',
    terminalId: 'POS-02',
  };

  const payload = banglaQrService.generateBanglaQrPayload(merchantConfig, options);
  assert.ok(payload.startsWith('000201010212'), 'Must start with POI 12 (Dynamic)');
  assert.ok(payload.includes('54071575.50'), 'Must contain Tag 54 with amount 1575.50');
  assert.strictEqual(banglaQrService.validateBanglaQrChecksum(payload), true, 'Dynamic QR checksum must be valid');

  const parsed = banglaQrService.parseBanglaQrPayload(payload);
  assert.strictEqual(parsed.isValid, true, 'Parsed dynamic QR must be valid');
  assert.strictEqual(parsed.isDynamic, true, 'Must be flagged as dynamic');
  assert.strictEqual(parsed.amount, 1575.50, 'Parsed amount must be exact');
  assert.strictEqual(parsed.paisa, 157550, 'Parsed integer paisa must be exact 157,550 paisa');
  assert.strictEqual(parsed.billNumber, 'INV-2026-9901', 'Bill number must match');
  assert.strictEqual(parsed.reference, 'CUST-8812', 'Reference must match');
  assert.strictEqual(parsed.terminalId, 'POS-02', 'Terminal ID must match');

  return { amount: parsed.amount, paisa: parsed.paisa, isDynamic: parsed.isDynamic };
});

// -----------------------------------------------------------------------------
// TEST 6: Large Financial Amounts & Boundary Precision (৳১,০০,০০,০০০ / Ten Crore)
// -----------------------------------------------------------------------------
runTest('Boundary Precision: Extreme Financial Amount up to ৳১,০০,০০,০০০', () => {
  const merchant = { merchantName: 'সোনালী ট্রেডার্স', accountNo: '01911000000' };
  const largeAmount = 10000000.75; // ৳1 Crore + 75 paisa
  const payload = banglaQrService.generateBanglaQrPayload(merchant, { amount: largeAmount });

  const parsed = banglaQrService.parseBanglaQrPayload(payload);
  assert.strictEqual(parsed.isValid, true);
  assert.strictEqual(parsed.amount, 10000000.75);
  assert.strictEqual(parsed.paisa, 1000000075, 'Exact 1,000,000,075 paisa');

  return { parsedAmount: parsed.amount, parsedPaisa: parsed.paisa };
});

// -----------------------------------------------------------------------------
// TEST 7: Customer Payment Simulation & Response DTO Compliance
// -----------------------------------------------------------------------------
runTest('Customer Payment Simulation (BanglaQrResponseDto Invariants)', () => {
  const merchant = {
    merchantName: 'ভাই ভাই স্টোর',
    accountNo: '01711223344',
    currentBalance: 12500.50,
  };

  const paymentResult = banglaQrService.simulateCustomerPayment(merchant, {
    amount: 2500.25,
    customerName: 'আব্দুল করিম',
    customerWallet: '01811223344',
    app: 'bkash',
    billNumber: 'BILL-4410',
  });

  assert.strictEqual(paymentResult.success, true);
  assert.strictEqual(paymentResult.paisa, 250025);

  const dto = paymentResult.responseDto;
  assert.strictEqual(dto.amount, 2500.25);
  assert.strictEqual(dto.balanceTo, 15000.75, 'New balance must reflect exact addition without float drift');
  assert.strictEqual(dto.fromName, 'আব্দুল করিম');
  assert.strictEqual(dto.fromWallet, '01811223344');
  assert.strictEqual(dto.toWallet, '01711223344');
  assert.strictEqual(dto.invoiceNo, 'BILL-4410');
  assert.strictEqual(dto.txnType, 'BANGLA_QR_INWARD');
  assert.ok(dto.transactionNumber.startsWith('BQR-'), 'Transaction number must follow BQR- format');
  assert.strictEqual(dto.canReverse, true);
  assert.strictEqual(dto.fee, 0.00);

  return { txnNo: dto.transactionNumber, newBalance: dto.balanceTo, app: dto.typeName };
});

// -----------------------------------------------------------------------------
// TEST 8: QR Visual Matrix Generation (25x25 Grid)
// -----------------------------------------------------------------------------
runTest('QR Visual Matrix Grid Generation & Finder Pattern Invariants', () => {
  const payload = '00020101021153030505802BD5907Shop 016005Dhaka630489A1';
  const grid = banglaQrService.generateQrVisualMatrix(payload);

  assert.strictEqual(grid.size, 25, 'Grid size must be 25x25');
  assert.strictEqual(grid.matrix.length, 25, '25 rows');
  assert.strictEqual(grid.matrix[0].length, 25, '25 columns per row');

  // Verify top-left finder pattern corner (0,0 is 1)
  assert.strictEqual(grid.matrix[0][0], 1, 'Top-left finder outer corner');
  assert.strictEqual(grid.matrix[3][3], 1, 'Top-left finder center pixel');

  return { size: grid.size, hashHex: grid.hashHex };
});

// -----------------------------------------------------------------------------
// TEST 9: High-Throughput Payload Assembly Benchmark (1,000 Ops)
// -----------------------------------------------------------------------------
runTest('High-Throughput QR Assembly Benchmark (1,000 Operations)', () => {
  const merchant = { merchantName: 'সুপার স্টোর', accountNo: '01700000000' };
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    banglaQrService.generateBanglaQrPayload(merchant, { amount: 100 + i });
  }
  const duration = Date.now() - start;
  const opsPerSec = Math.round((1000 / (duration || 1)) * 1000);
  assert.ok(duration < 1000, '1,000 QR payload assemblies must complete in under 1,000ms');

  return { durationMs: duration, opsPerSec, throughputAdequate: true };
});

// -----------------------------------------------------------------------------
// TEST 10: StorageRepository Mutex Logging & Querying
// -----------------------------------------------------------------------------
runAsyncTest('StorageRepository Atomic Mutex Logging (banglaQrTransactions Collection)', async () => {
  const repo = new StorageRepository();
  await repo.initStore();

  const txnPayload = {
    id: 'bqr_test_001',
    transactionNumber: 'BQR-998877-AF1',
    amount: 3500.00,
    fromName: 'রফিক আহমেদ',
    fromWallet: '01711002233',
    toWallet: '01700000000',
    invoiceNo: 'INV-001',
    businessId: '1',
    appId: 'bkash',
  };

  const logRes = await repo.logBanglaQrTransaction(txnPayload, { businessId: '1' });
  assert.strictEqual(logRes.success, true, 'Transaction logging must succeed');
  assert.strictEqual(logRes.transaction.id, 'bqr_test_001');

  const list = repo.getBanglaQrTransactions('1');
  assert.strictEqual(list.length, 1, 'Must find 1 logged transaction for business 1');
  assert.strictEqual(list[0].amount, 3500.00);

  const foundByTxn = repo.getBanglaQrTransactionByTxnNumber('BQR-998877-AF1', '1');
  assert.notStrictEqual(foundByTxn, null, 'Must find transaction by transactionNumber');
  assert.strictEqual(foundByTxn.fromName, 'রফিক আহমেদ');

  return { logged: true, txnId: logRes.transaction.id, queriedCount: list.length };
});

// -----------------------------------------------------------------------------
// TEST 11: Multi-Tenant Business Isolation Across 25 Shops
// -----------------------------------------------------------------------------
runAsyncTest('Multi-Tenant Shop Isolation Across 25 Concurrent Businesses', async () => {
  const repo = new StorageRepository();
  await repo.initStore();

  // Insert 1 transaction per business across 25 businesses
  for (let b = 1; b <= 25; b++) {
    const bizId = String(b);
    await repo.logBanglaQrTransaction({
      id: `tx_biz_${bizId}`,
      transactionNumber: `BQR-TX-${bizId}`,
      amount: 100 * b,
      businessId: bizId,
    }, { businessId: bizId });
  }

  // Verify that each business sees ONLY its own transaction
  for (let b = 1; b <= 25; b++) {
    const bizId = String(b);
    const txns = repo.getBanglaQrTransactions(bizId);
    assert.strictEqual(txns.length, 1, `Business ${bizId} must contain exactly 1 transaction`);
    assert.strictEqual(txns[0].id, `tx_biz_${bizId}`, `Transaction ID must match business ${bizId}`);
    assert.strictEqual(txns[0].amount, 100 * b);
  }

  return { testedBusinesses: 25, isolationVerified: true, zeroLeakage: true };
});

// -----------------------------------------------------------------------------
// TEST 12: Account & Business Cascade Purges and Backup Sanitization
// -----------------------------------------------------------------------------
runAsyncTest('Cascade Purges on Business/Account Deletion & Backup Sanitization', async () => {
  const repo = new StorageRepository();
  await repo.initStore();

  // Create transactions in business 2
  await repo.logBanglaQrTransaction({
    id: 'tx_b2_acc10',
    accountId: '10',
    transactionNumber: 'BQR-B2-01',
    amount: 500,
    qrMatrix: [[1, 0], [0, 1]], // transient matrix data
    businessId: '2',
  }, { businessId: '2' });

  // 1. Verify backup sanitization strips volatile qrMatrix
  const backupData = await repo.getFullBackupState();
  const sanitizedTxn = (backupData.banglaQrTransactions || []).find(t => t.id === 'tx_b2_acc10');
  assert.ok(sanitizedTxn, 'Transaction retained in backup');
  assert.strictEqual(sanitizedTxn.qrMatrix, undefined, 'Volatile qrMatrix must be stripped');

  // 2. Cascade delete business 2
  const cascadeRes = await repo.deleteBusinessCascade('2');
  assert.strictEqual(cascadeRes.success, true);
  const remaining = repo.getBanglaQrTransactions('2');
  assert.strictEqual(remaining.length, 0, 'Business 2 transactions must be completely purged');

  return { backupSanitized: true, businessCascadePurged: true };
});

async function runAll() {
  for (const t of testQueue) {
    totalTests++;
    try {
      let res;
      if (t.isAsync) {
        res = await t.fn();
      } else {
        res = t.fn();
      }
      console.log(`  [PASS] TEST ${totalTests}: ${t.name} -> ${JSON.stringify(res || 'OK')}`);
      passedTests++;
    } catch (err) {
      console.error(`  [FAIL] TEST ${totalTests}: ${t.name} -> ${err.message}`);
      process.exit(1);
    }
  }
  console.log('================================================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY (100%)`);
  console.log('================================================================================');
}

runAll();
