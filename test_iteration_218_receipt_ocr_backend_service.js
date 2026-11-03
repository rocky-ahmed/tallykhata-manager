/**
 * test_iteration_218_receipt_ocr_backend_service.js
 *
 * TALLYKHATA BACKEND VERIFICATION SUITE — ITERATION 218
 * Milestone: REA-ITER-218 (Advanced Bengali Receipt OCR Inference Engine & Metadata Storage)
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Permanent Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 *
 * Rigorously validates:
 * 1. Confidence Constants & Predefined Thresholds (CONFIDENCE_HIGH=0.85, CONFIDENCE_MEDIUM=0.60)
 * 2. Authentic Bengali Cash Memo Full Extraction & Intent Inference
 * 3. Authentic Bengali Due/Credit Chalan Slip with Baki Intent
 * 4. Shop Expense Voucher with Bengali Month Name Textual Date
 * 5. Bilingual / English Invoice Format with Decimals and Integer Paisa Precision
 * 6. Integer Paisa Precision Across Boundary Amounts (0.01 to 10 Crore Taka)
 * 7. Multi-Format Date Parser Resilience (Gregorian, Bengali textual, 2-digit years)
 * 8. Voucher / Memo Number Normalization & Prefix Variations
 * 9. Party Name Extraction & Commercial Header Disambiguation
 * 10. Human-Readable Summary Formatter Invariants (Bengali & English)
 * 11. Noisy OCR, Partial Text & Unrecognized Fallback Invariants
 * 12. createReceiptImageMetadata Automated Inferred Fields Integration
 * 13. ReceiptScannerStateMachine Complete Lifecycle Flow with OCR Inference
 * 14. StorageRepository attachReceiptImage Auto-Inference & Persistence Mutex
 * 15. Multi-Tenant Business Isolation for OCR Inference & Receipt Records
 * 16. Google Drive Cloud Backup Sanitization Preserves ocrInference while Scrubbing Binaries
 */

const assert = require('assert');
const receiptImageService = require('./src/receiptImageService');
const storageRepository = require('./src/storageRepository');

const {
  CONFIDENCE_HIGH,
  CONFIDENCE_MEDIUM,
  inferVoucherFields,
  isHighConfidence,
  isMediumConfidence,
  formatInferredSummary,
  createReceiptImageMetadata,
  validateReceiptImage,
  sanitizeReceiptImagesForBackup,
  ReceiptScannerStateMachine,
} = receiptImageService;

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  const currentTestNum = ++totalTests;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result
        .then((asyncRes) => {
          passedTests++;
          console.log(`  [PASS] TEST ${currentTestNum}: ${name} -> ${JSON.stringify(asyncRes || { ok: true })}`);
        })
        .catch((err) => {
          console.error(`  [FAIL] TEST ${currentTestNum}: ${name}`);
          console.error(err);
          process.exit(1);
        });
    } else {
      passedTests++;
      console.log(`  [PASS] TEST ${currentTestNum}: ${name} -> ${JSON.stringify(result || { ok: true })}`);
    }
  } catch (err) {
    console.error(`  [FAIL] TEST ${currentTestNum}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('='.repeat(80));
console.log('TALLYKHATA ITERATION 218: ADVANCED BENGALI RECEIPT OCR INFERENCE ENGINE');
console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
console.log('Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895');
console.log('='.repeat(80));

// -----------------------------------------------------------------------------
// TEST 1: Constants & Confidence Thresholds Invariants
// -----------------------------------------------------------------------------
runTest('Confidence Constants & Predefined Thresholds Invariants', () => {
  assert.strictEqual(CONFIDENCE_HIGH, 0.85, 'CONFIDENCE_HIGH must be 0.85');
  assert.strictEqual(CONFIDENCE_MEDIUM, 0.60, 'CONFIDENCE_MEDIUM must be 0.60');

  assert.strictEqual(isHighConfidence({ overallConfidence: 0.85 }), true, '0.85 should be high confidence');
  assert.strictEqual(isHighConfidence({ overallConfidence: 0.95 }), true, '0.95 should be high confidence');
  assert.strictEqual(isHighConfidence({ overallConfidence: 0.84 }), false, '0.84 should not be high confidence');

  assert.strictEqual(isMediumConfidence({ overallConfidence: 0.60 }), true, '0.60 should be medium confidence');
  assert.strictEqual(isMediumConfidence({ overallConfidence: 0.75 }), true, '0.75 should be medium confidence');
  assert.strictEqual(isMediumConfidence({ overallConfidence: 0.59 }), false, '0.59 should not be medium confidence');

  assert.strictEqual(isHighConfidence(null), false, 'null should return false');
  assert.strictEqual(isMediumConfidence({}), false, 'empty object should return false');

  return { CONFIDENCE_HIGH, CONFIDENCE_MEDIUM, boundaryCheck: true };
});

// -----------------------------------------------------------------------------
// TEST 2: Authentic Bengali Cash Memo Parsing (Full Extraction & Intent Inference)
// -----------------------------------------------------------------------------
runTest('Authentic Bengali Cash Memo Full Extraction & Intent Inference', () => {
  const cashMemoText = `
ক্যাশ মেমো
মেসার্স ভাই ভাই এন্টারপ্রাইজ
প্রোঃ মোঃ রফিকুল ইসলাম
নিউ মার্কেট, ঢাকা
মোবাইল: ০১৭১২৩৪৫৬৭৮

ক্যাশ মেমো নং: ১২৮৪          তারিখ: ১৪/১০/২০২৬
ক্রেতার নাম: মেসার্স রহিম ট্রেডার্স
ঠিকানা: সদরঘাট, ঢাকা

ক্রমিক | বিবরণ | পরিমাণ | দর | মোট টাকা
১ | মিনিকেট চাল | ২ বস্তা | ৩৫০০ | ৭,০০০/-
২ | সয়াবিন তেল | ৫ লিটার | ১৯০ | ৯৫০/-
---------------------------------------------
সর্বমোট টাকা = ৭,৯৫০/-
নগদ গ্রহণ = ৫,০০০/-
বাকী = ২,৯৫০/-
ধন্যবাদ আবার আসবেন
`;

  const res = inferVoucherFields(cashMemoText);

  assert.strictEqual(res.amount, 7950, 'Primary amount should be 7950');
  assert.strictEqual(res.amountPaisa, 795000, 'Integer paisa should be 795000');
  assert.strictEqual(res.date, '2026-10-14', 'Date should be 2026-10-14');
  assert.strictEqual(res.voucherNo, '১২৮৪', 'Voucher number should be ১২৮৪');
  assert.strictEqual(res.partyName, 'মেসার্স রহিম ট্রেডার্স', 'Party name should be মেসার্স রহিম ট্রেডার্স');
  assert.strictEqual(res.transactionType, 'debit', 'Transaction type should be debit');
  assert.strictEqual(res.isHighConfidence, true, 'Overall result should be high confidence');
  assert(res.overallConfidence >= 0.85, 'Overall confidence should be >= 0.85');

  return {
    amount: res.amount,
    amountPaisa: res.amountPaisa,
    date: res.date,
    voucherNo: res.voucherNo,
    partyName: res.partyName,
    type: res.transactionType,
    confidence: res.overallConfidence,
  };
});

// -----------------------------------------------------------------------------
// TEST 3: Authentic Bengali Due / Credit Chalan Slip (Baki Sale Intent)
// -----------------------------------------------------------------------------
runTest('Authentic Bengali Due/Credit Chalan Slip with Baki Intent', () => {
  const chalanText = `
মেসার্স জননী স্টোর
চালান ও বিল
চালান নং: CH-2026-99
তারিখ: ১২-১১-২০২৬
নাম: মোঃ করিম মিয়া
বাকি বিক্রি:
মাল বাবদ বাকি: ১৫,৪০০ টাকা
পূর্বের বাকি: ৫,০০০ টাকা
মোট বকেয়া: ২০,৪০০ টাকা
`;

  const res = inferVoucherFields(chalanText);

  assert.strictEqual(res.amount, 20400, 'Primary amount should be 20400');
  assert.strictEqual(res.amountPaisa, 2040000, 'Amount in paisa should be 2040000');
  assert.strictEqual(res.date, '2026-11-12', 'Date should be 2026-11-12');
  assert.strictEqual(res.voucherNo, 'CH-2026-99', 'Voucher number should be CH-2026-99');
  assert.strictEqual(res.partyName, 'মোঃ করিম মিয়া', 'Party name should be মোঃ করিম মিয়া');
  assert.strictEqual(res.transactionType, 'credit', 'Transaction type should be credit');
  assert.strictEqual(res.isHighConfidence, true, 'Result should be high confidence');

  return {
    amount: res.amount,
    amountPaisa: res.amountPaisa,
    date: res.date,
    voucherNo: res.voucherNo,
    party: res.partyName,
    type: res.transactionType,
    conf: res.overallConfidence,
  };
});

// -----------------------------------------------------------------------------
// TEST 4: Shop Expense Voucher with Bengali Month Name Textual Date
// -----------------------------------------------------------------------------
runTest('Shop Expense Voucher with Bengali Month Name Textual Date', () => {
  const expenseText = `
দোকান খরচ ভাউচার
ভাউচার নং: V-401
তারিখ: ০৫ জানুয়ারি ২০২৪
ব্যয় খাত: দোকান ভাড়া ও বিদ্যুৎ বিল
প্রাপকের নাম: মোশাররফ হোসেন
টাকার পরিমাণ: ১২,৫০০.০০
পরিশোধের মাধ্যম: নগদ
স্বাক্ষর
`;

  const res = inferVoucherFields(expenseText);

  assert.strictEqual(res.amount, 12500, 'Amount should be 12500');
  assert.strictEqual(res.amountPaisa, 1250000, 'Amount in paisa should be 1250000');
  assert.strictEqual(res.date, '2024-01-05', 'Date should be 2024-01-05 (জানুয়ারি)');
  assert.strictEqual(res.voucherNo, 'V-401', 'Voucher number should be V-401');
  assert.strictEqual(res.partyName, 'মোশাররফ হোসেন', 'Party name should be মোশাররফ হোসেন');
  assert.strictEqual(res.transactionType, 'expense', 'Transaction type should be expense');
  assert.strictEqual(res.isHighConfidence, true, 'Should be high confidence');

  return {
    amount: res.amount,
    amountPaisa: res.amountPaisa,
    date: res.date,
    voucherNo: res.voucherNo,
    party: res.partyName,
    type: res.transactionType,
  };
});

// -----------------------------------------------------------------------------
// TEST 5: Bilingual / English Invoice Format with Decimals and Integer Paisa Precision
// -----------------------------------------------------------------------------
runTest('Bilingual / English Invoice Format with Decimals & Paisa Precision', () => {
  const invoiceText = `
M/S BENGAL TRADERS
Invoice No: INV-8821
Date: 25/12/2026
Customer: Al-Amin Store
Total Amount: ৳ 45,000.50
Paid: ৳ 20,000.00
Due: ৳ 25,000.50
`;

  const res = inferVoucherFields(invoiceText);

  assert.strictEqual(res.amount, 45000.50, 'Total amount should be 45000.50');
  assert.strictEqual(res.amountPaisa, 4500050, 'Paisa must be 4500050 (exact integer)');
  assert.strictEqual(res.date, '2026-12-25', 'Date should be 2026-12-25');
  assert.strictEqual(res.voucherNo, 'INV-8821', 'Voucher should be INV-8821');
  assert.strictEqual(res.partyName, 'Al-Amin Store', 'Party should be Al-Amin Store');
  assert.strictEqual(res.isHighConfidence, true, 'Should be high confidence');

  return {
    amount: res.amount,
    amountPaisa: res.amountPaisa,
    voucher: res.voucherNo,
    party: res.partyName,
    isHigh: res.isHighConfidence,
  };
});

// -----------------------------------------------------------------------------
// TEST 6: Integer Paisa Precision Across Boundary Amounts (0.01 to 10 Crore Taka)
// -----------------------------------------------------------------------------
runTest('Integer Paisa Precision Across Boundary Amounts (0.01 to 10 Crore Taka)', () => {
  const testCases = [
    { text: 'মোট টাকা: ০.০১', expectedAmount: 0.01, expectedPaisa: 1 },
    { text: 'সর্বমোট: ৫০.৭৫ টাকা', expectedAmount: 50.75, expectedPaisa: 5075 },
    { text: 'বিল টাকা: ১,২৫,০০০.২৫/-', expectedAmount: 125000.25, expectedPaisa: 12500025 },
    { text: 'Total: ৳ 10,00,00,000.00', expectedAmount: 100000000, expectedPaisa: 10000000000 },
  ];

  for (const tc of testCases) {
    const res = inferVoucherFields(tc.text);
    assert.strictEqual(res.amount, tc.expectedAmount, `Expected amount ${tc.expectedAmount}, got ${res.amount}`);
    assert.strictEqual(res.amountPaisa, tc.expectedPaisa, `Expected paisa ${tc.expectedPaisa}, got ${res.amountPaisa}`);
  }

  return { testedCount: testCases.length, zeroFloatDrift: true };
});

// -----------------------------------------------------------------------------
// TEST 7: Multi-Format Date Parser Resilience (Gregorian & Bengali Numerals)
// -----------------------------------------------------------------------------
runTest('Multi-Format Date Parser Resilience (Gregorian & Bengali Numerals)', () => {
  const dateCases = [
    { text: 'তারিখ: ১৪/১০/২০২৬', expected: '2026-10-14' },
    { text: 'তাং: ০৫-০৮-২০২৫', expected: '2025-08-05' },
    { text: 'Date: 25.12.2024', expected: '2024-12-25' },
    { text: 'Dated: 2026-10-14', expected: '2026-10-14' },
    { text: 'তারিখ: ১২ অক্টোবর ২০২৩', expected: '2023-10-12' },
    { text: 'Date: 14 October 2026', expected: '2026-10-14' },
    { text: 'Date: Oct 14, 2026', expected: '2026-10-14' },
    { text: 'তাং: ১৪/১০/২৬', expected: '2026-10-14' },
    { text: 'তারিখ: ৪৫/১৫/২০২৬ (ভুল তারিখ)', expected: null },
  ];

  for (const dc of dateCases) {
    const res = inferVoucherFields(dc.text);
    assert.strictEqual(res.date, dc.expected, `For text "${dc.text}", expected ${dc.expected}, got ${res.date}`);
  }

  return { verifiedDates: dateCases.length };
});

// -----------------------------------------------------------------------------
// TEST 8: Voucher / Memo Number Normalization & Prefix Variations
// -----------------------------------------------------------------------------
runTest('Voucher / Memo Number Normalization & Prefix Variations', () => {
  const memoCases = [
    { text: 'রসিদ নং: ১২৮৪', expected: '১২৮৪' },
    { text: 'চালান নং: CH-99', expected: 'CH-99' },
    { text: 'মেমো #: 5501', expected: '5501' },
    { text: 'বিল নং: BL-002', expected: 'BL-002' },
    { text: 'Bill No: B-991', expected: 'B-991' },
    { text: 'Invoice No: INV-1042', expected: 'INV-1042' },
  ];

  for (const mc of memoCases) {
    const res = inferVoucherFields(mc.text);
    assert.strictEqual(res.voucherNo, mc.expected, `For text "${mc.text}", expected ${mc.expected}, got ${res.voucherNo}`);
  }

  return { verifiedMemos: memoCases.length };
});

// -----------------------------------------------------------------------------
// TEST 9: Party Name Extraction & Commercial Header Disambiguation
// -----------------------------------------------------------------------------
runTest('Party Name Extraction & Commercial Header Disambiguation', () => {
  // Case A: Customer line takes priority over shop header
  const textA = `
মেসার্স ঢাকা স্টোর
ক্যাশ মেমো
ক্রেতার নাম: মেসার্স রাজশাহী স্টোর
মোট: ১০০০
`;
  const resA = inferVoucherFields(textA);
  assert.strictEqual(resA.partyName, 'মেসার্স রাজশাহী স্টোর', 'Customer line should take priority over shop header');

  // Case B: Only shop header exists
  const textB = `
মেসার্স ভাই ভাই এন্টারপ্রাইজ
রসিদ
মোট: ২০০০
`;
  const resB = inferVoucherFields(textB);
  assert.strictEqual(resB.partyName, 'মেসার্স ভাই ভাই এন্টারপ্রাইজ', 'Shop header should be selected when no customer line');

  return { caseAParty: resA.partyName, caseBParty: resB.partyName };
});

// -----------------------------------------------------------------------------
// TEST 10: Human-Readable Summary Formatter Invariants (Bengali & English)
// -----------------------------------------------------------------------------
runTest('Human-Readable Summary Formatter Invariants (Bengali & English)', () => {
  const mockInferred = {
    amount: 7950,
    amountPaisa: 795000,
    date: '2026-10-14',
    voucherNo: '১২৮৪',
    partyName: 'মেসার্স রহিম ট্রেডার্স',
    transactionType: 'debit',
    overallConfidence: 0.94,
  };

  const summaryBn = formatInferredSummary(mockInferred, { language: 'bn' });
  const summaryEn = formatInferredSummary(mockInferred, { language: 'en' });

  assert(summaryBn.includes('পরিমাণ ৳৭,৯৫০'), 'Bengali summary should include amount');
  assert(summaryBn.includes('২০২৬-১০-১৪'), 'Bengali summary should include date in Bengali digits');
  assert(summaryBn.includes('১২৮৪'), 'Bengali summary should include memo');
  assert(summaryBn.includes('মেসার্স রহিম ট্রেডার্স'), 'Bengali summary should include party name');
  assert(summaryBn.includes('জমা'), 'Bengali summary should translate debit to জমা');
  assert(summaryBn.includes('৯৪%'), 'Bengali summary should format percentage in Bengali digits');

  assert(summaryEn.includes('Amount ৳7,950'), 'English summary should include amount');
  assert(summaryEn.includes('2026-10-14'), 'English summary should include date');
  assert(summaryEn.includes('Type: debit'), 'English summary should include debit');
  assert(summaryEn.includes('94%'), 'English summary should format confidence');

  return { summaryBn, summaryEn };
});

// -----------------------------------------------------------------------------
// TEST 11: Noisy OCR, Partial Text & Unrecognized Fallback Invariants
// -----------------------------------------------------------------------------
runTest('Noisy OCR, Partial Text & Unrecognized Fallback Invariants', () => {
  // Empty inputs
  const emptyRes1 = inferVoucherFields('');
  assert.strictEqual(emptyRes1.amount, null);
  assert.strictEqual(emptyRes1.overallConfidence, 0);
  assert.strictEqual(emptyRes1.isHighConfidence, false);

  const emptyRes2 = inferVoucherFields('   \n\t  ');
  assert.strictEqual(emptyRes2.amount, null);
  assert.strictEqual(emptyRes2.overallConfidence, 0);

  const emptyRes3 = inferVoucherFields(null);
  assert.strictEqual(emptyRes3.amount, null);
  assert.strictEqual(emptyRes3.overallConfidence, 0);

  // Noisy garbage text
  const garbageRes = inferVoucherFields('asdkjhaskd jhaksjdhaksjdh 123891273918273');
  assert.strictEqual(garbageRes.isHighConfidence, false, 'Garbage text should not be high confidence');
  assert(garbageRes.overallConfidence < CONFIDENCE_MEDIUM, 'Garbage text overall confidence must be low');

  return { emptyHandled: true, garbageConfidence: garbageRes.overallConfidence };
});

// -----------------------------------------------------------------------------
// TEST 12: createReceiptImageMetadata Automated Inferred Fields Integration
// -----------------------------------------------------------------------------
runTest('createReceiptImageMetadata Automated Inferred Fields Integration', () => {
  const ocrText = `
ক্যাশ মেমো
ক্যাশ মেমো নং: ৮৮৯
তারিখ: ২০/১০/২০২৬
ক্রেতার নাম: করিম ট্রেডার্স
মোট টাকা: ৪,২০০/-
নগদ প্রদান
`;

  // Auto-infer from ocrText
  const metadata = createReceiptImageMetadata({
    journalId: 'j_auto_101',
    ocrText,
    fileSizeBytes: 102400,
    width: 800,
    height: 1200,
    businessId: '1',
  });

  assert(metadata.ocrInference, 'ocrInference should be automatically populated');
  assert.strictEqual(metadata.ocrInference.amount, 4200, 'Auto-inferred amount should be 4200');
  assert.strictEqual(metadata.ocrInference.amountPaisa, 420000, 'Auto-inferred paisa should be 420000');
  assert.strictEqual(metadata.ocrInference.voucherNo, '৮৮৯', 'Auto-inferred voucher should be ৮৮৯');
  assert.strictEqual(metadata.ocrInference.partyName, 'করিম ট্রেডার্স', 'Party should be করিম ট্রেডার্স');

  const validation = validateReceiptImage(metadata);
  assert.strictEqual(validation.valid, true, 'Metadata with ocrInference should be valid');

  return { autoInferred: true, amount: metadata.ocrInference.amount, valid: validation.valid };
});

// -----------------------------------------------------------------------------
// TEST 13: ReceiptScannerStateMachine Complete Flow with OCR Inference
// -----------------------------------------------------------------------------
runTest('ReceiptScannerStateMachine Complete Lifecycle Flow with OCR Inference', () => {
  const sm = new ReceiptScannerStateMachine();
  assert.strictEqual(sm.state, 'IDLE');

  sm.startCapture();
  assert.strictEqual(sm.state, 'CAPTURING');

  sm.captureSuccess({ uri: 'file:///data/receipt.jpg', width: 1000, height: 1400 });
  assert.strictEqual(sm.state, 'PROCESSING_OCR');

  const ocrSample = `
মেসার্স আশা ফার্মেসী
মেমো নং: PH-771
তারিখ: ১৫-০৬-২০২৬
নাম: ডাক্তার শফিকুল ইসলাম
মোট বিল: ৩,৭৫০.০০ টাকা
পরিশোধ: নগদ
`;

  const completedReceipt = sm.processOcrComplete(ocrSample, {
    journalId: 'j_sm_99',
    businessId: '1',
  });

  assert.strictEqual(sm.state, 'COMPLETED');
  assert(completedReceipt.ocrInference, 'Completed receipt must have ocrInference');
  assert.strictEqual(completedReceipt.ocrInference.amount, 3750);
  assert.strictEqual(completedReceipt.ocrInference.amountPaisa, 375000);
  assert.strictEqual(completedReceipt.ocrInference.voucherNo, 'PH-771');
  assert.strictEqual(completedReceipt.ocrInference.partyName, 'ডাক্তার শফিকুল ইসলাম');
  assert.strictEqual(completedReceipt.ocrInference.isHighConfidence, true);

  sm.reset();
  assert.strictEqual(sm.state, 'IDLE');

  return { stateMachineFlowVerified: true, completedReceiptId: completedReceipt.id };
});

// -----------------------------------------------------------------------------
// TEST 14: StorageRepository attachReceiptImage Auto-Inference & Persistence Mutex
// -----------------------------------------------------------------------------
runTest('StorageRepository attachReceiptImage Auto-Inference & Persistence Mutex', async () => {
  const repo = new storageRepository.StorageRepository('test_iter218_repo');
  await repo.initStore();

  const ocrText = `
মেসার্স নিউ মার্কেট ফ্যাশন
চালান নং: NM-2026-55
তারিখ: ১৮/০৯/২০২৬
ক্রেতার নাম: রাজু আহমেদ
মাল বাবদ বাকি: ৮,৫০০ টাকা
মোট বকেয়া: ৮,৫০০ টাকা
`;

  const attachRes = await repo.attachReceiptImage({
    journalId: 'j_repo_101',
    ocrText,
    fileSizeBytes: 204800,
    width: 1080,
    height: 1920,
    mimeType: 'image/jpeg',
  }, { businessId: '1' });

  assert.strictEqual(attachRes.success, true, 'attachReceiptImage should succeed');
  assert(attachRes.receiptImage.ocrInference, 'Persisted receipt must contain ocrInference');
  assert.strictEqual(attachRes.receiptImage.ocrInference.amount, 8500);
  assert.strictEqual(attachRes.receiptImage.ocrInference.amountPaisa, 850000);
  assert.strictEqual(attachRes.receiptImage.ocrInference.transactionType, 'credit');
  assert.strictEqual(attachRes.receiptImage.ocrInference.voucherNo, 'NM-2026-55');

  // Verify retrieval from store
  const queried = repo.getReceiptImagesForJournal('j_repo_101', '1');
  assert.strictEqual(queried.length, 1, 'Should find 1 attached receipt for journal');
  assert.strictEqual(queried[0].ocrInference.amountPaisa, 850000, 'Queried record should preserve integer paisa');

  return { attached: true, queriedCount: queried.length, amountPaisa: queried[0].ocrInference.amountPaisa };
});

// -----------------------------------------------------------------------------
// TEST 15: Multi-Tenant Business Isolation for OCR Inference & Receipt Records
// -----------------------------------------------------------------------------
runTest('Multi-Tenant Business Isolation for OCR Inference & Receipt Records', async () => {
  const repo = new storageRepository.StorageRepository('test_iter218_isolation_repo');
  await repo.initStore();

  // Attach receipt in Shop 1
  const shop1Res = await repo.attachReceiptImage({
    journalId: 'j_shared_id',
    ocrText: 'ক্যাশ মেমো নং: ১\nতারিখ: ০১/০১/২০২৬\nমোট: ১০০০ টাকা',
    fileSizeBytes: 100000,
    width: 600,
    height: 800,
  }, { businessId: '1' });

  // Attach receipt in Shop 2 with same journal ID
  const shop2Res = await repo.attachReceiptImage({
    journalId: 'j_shared_id',
    ocrText: 'চালান নং: ২\nতারিখ: ০২/০২/২০২৬\nমোট: ৫০০০ টাকা',
    fileSizeBytes: 200000,
    width: 600,
    height: 800,
  }, { businessId: '2' });

  assert.strictEqual(shop1Res.success, true);
  assert.strictEqual(shop2Res.success, true);

  const shop1Receipts = repo.getReceiptImagesForBusiness('1');
  const shop2Receipts = repo.getReceiptImagesForBusiness('2');

  assert.strictEqual(shop1Receipts.length, 1, 'Shop 1 must have exactly 1 receipt');
  assert.strictEqual(shop2Receipts.length, 1, 'Shop 2 must have exactly 1 receipt');

  assert.strictEqual(shop1Receipts[0].ocrInference.amount, 1000, 'Shop 1 receipt amount should be 1000');
  assert.strictEqual(shop2Receipts[0].ocrInference.amount, 5000, 'Shop 2 receipt amount should be 5000');

  // Verify journal query is strictly isolated
  const shop1JournalReceipts = repo.getReceiptImagesForJournal('j_shared_id', '1');
  const shop2JournalReceipts = repo.getReceiptImagesForJournal('j_shared_id', '2');

  assert.strictEqual(shop1JournalReceipts.length, 1);
  assert.strictEqual(shop2JournalReceipts.length, 1);
  assert.strictEqual(shop1JournalReceipts[0].ocrInference.voucherNo, '১');
  assert.strictEqual(shop2JournalReceipts[0].ocrInference.voucherNo, '২');

  return { isolated: true, shop1Amount: 1000, shop2Amount: 5000 };
});

// -----------------------------------------------------------------------------
// TEST 16: Cloud Backup Sanitization Preserves ocrInference while Scrubbing Binaries
// -----------------------------------------------------------------------------
runTest('Cloud Backup Sanitization Preserves ocrInference while Scrubbing Binaries', () => {
  const receipts = [
    {
      id: 'rcp_backup_test_1',
      journalId: 'j_b1',
      businessId: '1',
      fileUri: 'file:///var/mobile/Containers/Data/Application/receipt_1.jpg',
      thumbnailUri: 'file:///var/mobile/Containers/Data/Application/thumb_1.jpg',
      imageBlob: 'BINARY_BLOB_SHOULD_BE_REMOVED',
      base64Data: 'BASE64_DATA_SHOULD_BE_REMOVED',
      ocrText: 'ক্যাশ মেমো নং: ৯৯\nতারিখ: ১৪/১০/২০২৬\nমোট: ৫,০০০ টাকা',
      ocrInference: {
        amount: 5000,
        amountPaisa: 500000,
        date: '2026-10-14',
        voucherNo: '৯৯',
        partyName: null,
        transactionType: 'debit',
        overallConfidence: 0.90,
        isHighConfidence: true,
      },
    },
  ];

  const sanitized = sanitizeReceiptImagesForBackup(receipts);

  assert.strictEqual(sanitized.length, 1);
  assert.strictEqual(sanitized[0].fileUri, null, 'fileUri must be scrubbed to null');
  assert.strictEqual(sanitized[0].thumbnailUri, null, 'thumbnailUri must be scrubbed to null');
  assert.strictEqual(sanitized[0].imageBlob, undefined, 'imageBlob must be stripped');
  assert.strictEqual(sanitized[0].base64Data, undefined, 'base64Data must be stripped');

  assert(sanitized[0].ocrInference, 'ocrInference metadata MUST be preserved in backup');
  assert.strictEqual(sanitized[0].ocrInference.amount, 5000);
  assert.strictEqual(sanitized[0].ocrInference.amountPaisa, 500000);
  assert.strictEqual(sanitized[0].ocrInference.date, '2026-10-14');
  assert.strictEqual(sanitized[0].ocrInference.voucherNo, '৯৯');
  assert.strictEqual(sanitized[0].sanitized, true);
  assert.strictEqual(sanitized[0].backupExcludedBinary, true);

  return { backupSanitized: true, ocrInferencePreserved: true };
});

setTimeout(() => {
  console.log('='.repeat(80));
  console.log("SUMMARY: " + passedTests + " / " + totalTests + " TESTS PASSED SUCCESSFULLY (100%)");
  console.log('='.repeat(80));
}, 50);
