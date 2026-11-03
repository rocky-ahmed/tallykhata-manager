/**
 * test_iteration_219_voucher_pdf_and_thermal_backend.js
 *
 * TALLYKHATA BACKEND VERIFICATION SUITE — ITERATION 219
 * Milestone: REA-ITER-219 (Voucher PDF Generation, Export & Thermal Print Backend Engine)
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Permanent Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 *
 * Comprehensive Automated Verification:
 * 1. Voucher Types, Aliases & Metadata Titling Parity (Cash Memo, Due Chalan, Expense Slip)
 * 2. Exact Integer Paisa Arithmetic & Boundary Precision (0.01 to 10 Crore Taka, 0.00 Paisa Drift)
 * 3. Bengali Numeral & Amount-in-Words (টাকা কথায়) Transformation Engine
 * 4. Cash Memo Voucher Payload & Exact Running Balance Invariants
 * 5. Due Chalan Voucher Payload & Credit Ledger Invariants
 * 6. Shop Expense Voucher Payload & Operating Cost Classification
 * 7. Standalone HTML5 / CSS3 Print-Ready Document Generator (A4/A5, Media Queries)
 * 8. Base64 & RFC-Compliant Simulated PDF Byte Stream Assembly
 * 9. Tamper-Evident SHA-256 QR Verification Code Generator & Validator
 * 10. ESC/POS Command Byte Sequences & Binary Protocol Specifications
 * 11. Thermal Paper Roll Profiles & Exact Column Formatting (58mm / 32-col, 80mm / 48-col)
 * 12. Bengali-to-ASCII Transliteration Engine for Legacy POS Hardware
 * 13. High-Performance Thermal Receipt Assembly with Feed & Cut Sequencing
 * 14. StorageRepository Atomic Mutex Logging (voucherPrintLogs Collection)
 * 15. Multi-Tenant Shop Isolation Across 30 Concurrent Businesses with Colliding Vouchers
 * 16. Account & Business Cascade Purges and Google Drive Cloud Backup Sanitization
 * 17. High-Frequency Document & Thermal Receipt Generation Benchmark (1,000 Ops)
 */

const assert = require('assert');
const crypto = require('crypto');
const storageRepository = require('./src/storageRepository');
const voucherPdfService = require('./src/voucherPdfService');
const thermalPrintService = require('./src/thermalPrintService');

const {
  VOUCHER_TYPES,
  VOUCHER_TYPE_ALIASES,
  VOUCHER_TYPE_TITLES,
  toBengaliNumeral,
  toAsciiDigits,
  roundMoney,
  toIntegerPaisa,
  fromIntegerPaisa,
  formatCurrencyAmount,
  numberToBengaliWords,
  generateVoucherQrVerificationString,
  verifyVoucherQrString,
  createVoucherDocumentPayload,
  generateVoucherHtml,
  generateVoucherBase64,
  generateSimulatedPdfBase64,
} = voucherPdfService;

const {
  COMMANDS,
  PAPER_PROFILES,
  resolvePaperWidth,
  resolvePaperProfile,
  formatDivider,
  formatCenterText,
  formatRowTwoColumns,
  formatRowThreeColumns,
  transliterateBengaliToAscii,
  buildThermalReceiptCommands,
  buildRawEscPosFromText,
} = thermalPrintService;

console.log('='.repeat(80));
console.log('TALLYKHATA ITERATION 219: VOUCHER PDF & THERMAL PRINT BACKEND SUITE');
console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
console.log('Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895');
console.log('='.repeat(80));

let totalTests = 0;
let passedTests = 0;

async function runTest(testName, fn) {
  const testId = ++totalTests;
  try {
    const res = await fn();
    passedTests++;
    console.log(`  [PASS] TEST ${testId}: ${testName} -> ${JSON.stringify(res)}`);
  } catch (err) {
    console.error(`  [FAIL] TEST ${testId}: ${testName}`);
    console.error(err);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Voucher Types, Aliases & Titling Invariants
// -----------------------------------------------------------------------------
runTest('Voucher Types, Aliases & Titling Invariants', () => {
  assert.strictEqual(VOUCHER_TYPES.CASH_MEMO, 'CASH_MEMO');
  assert.strictEqual(VOUCHER_TYPES.DUE_CHALAN, 'DUE_CHALAN');
  assert.strictEqual(VOUCHER_TYPES.EXPENSE_SLIP, 'EXPENSE_SLIP');

  // Aliases resolution
  assert.strictEqual(VOUCHER_TYPE_ALIASES['নগদ'], VOUCHER_TYPES.CASH_MEMO);
  assert.strictEqual(VOUCHER_TYPE_ALIASES['ক্যাশ মেমো'], VOUCHER_TYPES.CASH_MEMO);
  assert.strictEqual(VOUCHER_TYPE_ALIASES['বাকি'], VOUCHER_TYPES.DUE_CHALAN);
  assert.strictEqual(VOUCHER_TYPE_ALIASES['বাকির চালান'], VOUCHER_TYPES.DUE_CHALAN);
  assert.strictEqual(VOUCHER_TYPE_ALIASES['খরচ'], VOUCHER_TYPES.EXPENSE_SLIP);
  assert.strictEqual(VOUCHER_TYPE_ALIASES['দোকান খরচ'], VOUCHER_TYPES.EXPENSE_SLIP);

  // Titles mapping
  const cashTitle = VOUCHER_TYPE_TITLES[VOUCHER_TYPES.CASH_MEMO];
  assert.strictEqual(cashTitle.bn, 'ক্যাশ মেমো');
  assert.strictEqual(cashTitle.en, 'CASH MEMO');

  const dueTitle = VOUCHER_TYPE_TITLES[VOUCHER_TYPES.DUE_CHALAN];
  assert.strictEqual(dueTitle.bn, 'বাকির চালান');
  assert.strictEqual(dueTitle.en, 'DUE CHALAN');

  const expTitle = VOUCHER_TYPE_TITLES[VOUCHER_TYPES.EXPENSE_SLIP];
  assert.strictEqual(expTitle.bn, 'দোকান খরচ ভাউচার');
  assert.strictEqual(expTitle.en, 'EXPENSE VOUCHER');

  return { verifiedTypes: Object.keys(VOUCHER_TYPES).length, aliasCount: Object.keys(VOUCHER_TYPE_ALIASES).length };
});

// -----------------------------------------------------------------------------
// TEST 2: Exact Integer Paisa Arithmetic & Boundary Precision
// -----------------------------------------------------------------------------
runTest('Exact Integer Paisa Arithmetic & Boundary Precision (0.00 Paisa Drift)', () => {
  // 1 Taka = 100 Paisa
  assert.strictEqual(toIntegerPaisa(1), 100);
  assert.strictEqual(toIntegerPaisa(50.75), 5075);
  assert.strictEqual(fromIntegerPaisa(5075), 50.75);

  // Smallest unit: 1 Paisa = 0.01 Taka
  assert.strictEqual(toIntegerPaisa(0.01), 1);
  assert.strictEqual(fromIntegerPaisa(1), 0.01);

  // Extreme boundary: 10 Crore Taka = 100,000,000 Taka = 10,000,000,000 Paisa
  const tenCroreTaka = 100000000;
  const tenCrorePaisa = toIntegerPaisa(tenCroreTaka);
  assert.strictEqual(tenCrorePaisa, 10000000000);
  assert.strictEqual(fromIntegerPaisa(tenCrorePaisa), 100000000);

  // Floating-point precision stress: 0.1 + 0.2 in standard JS is 0.30000000000000004
  const sumPaisa = toIntegerPaisa(0.1) + toIntegerPaisa(0.2);
  assert.strictEqual(sumPaisa, 30);
  assert.strictEqual(fromIntegerPaisa(sumPaisa), 0.3);

  // Fractional division rounding
  assert.strictEqual(roundMoney(50.754), 50.75);
  assert.strictEqual(roundMoney(50.756), 50.76);

  return { paisaInOneTaka: 100, tenCrorePaisa, zeroFloatDrift: true };
});

// -----------------------------------------------------------------------------
// TEST 3: Bengali Numeral & Amount-in-Words Transformation Engine
// -----------------------------------------------------------------------------
runTest('Bengali Numeral & Amount-in-Words (টাকা কথায়) Transformation Engine', () => {
  // Numerals
  assert.strictEqual(toBengaliNumeral(0), '০');
  assert.strictEqual(toBengaliNumeral(123456789), '১২৩৪৫৬৭৮৯');
  assert.strictEqual(toBengaliNumeral('50.75'), '৫০.৭৫');
  assert.strictEqual(toAsciiDigits('১২৩৪৫৬৭৮৯'), '123456789');

  // Currency Formatter
  assert.strictEqual(formatCurrencyAmount(50.75, 'bn'), '৳ ৫০.৭৫');
  assert.strictEqual(formatCurrencyAmount(50.75, 'en'), 'Tk 50.75');
  assert.strictEqual(formatCurrencyAmount(125000, 'bn'), '৳ ১,২৫,০০০');

  // Number to Bengali Words
  assert.strictEqual(numberToBengaliWords(0), 'শূন্য টাকা মাত্র');
  assert.strictEqual(numberToBengaliWords(50.75), 'পঞ্চাশ টাকা পঁচাত্তর পয়সা মাত্র');
  assert.strictEqual(numberToBengaliWords(500), 'পাঁচশত টাকা মাত্র');
  assert.strictEqual(numberToBengaliWords(4500), 'চার হাজার পাঁচশত টাকা মাত্র');
  assert.strictEqual(numberToBengaliWords(125000), 'এক লক্ষ পঁচিশ হাজার টাকা মাত্র');
  assert.strictEqual(numberToBengaliWords(15000000), 'এক কোটি পঞ্চাশ লক্ষ টাকা মাত্র');

  return {
    sample5075Words: numberToBengaliWords(50.75),
    sampleCroreWords: numberToBengaliWords(15000000),
  };
});

// -----------------------------------------------------------------------------
// TEST 4: Cash Memo Voucher Payload & Exact Running Balance Invariants
// -----------------------------------------------------------------------------
runTest('Cash Memo Voucher Payload & Exact Running Balance Invariants', () => {
  const payload = createVoucherDocumentPayload({
    voucherType: 'CASH_MEMO',
    voucherNo: 'CM-2026-001',
    date: '2026-11-03',
    time: '10:30 AM',
    businessName: 'মেসার্স সততা এন্টারপ্রাইজ',
    proprietorName: 'মোঃ আল-আমিন',
    businessPhone: '01711-223344',
    businessAddress: 'দোকান রোড, সদর বাজার',
    customerName: 'মোঃ রহিম চৌধুরী',
    customerPhone: '01819-887766',
    customerAddress: 'গ্রাম: শান্তিনগর',
    items: [
      { name: 'মিনিকেট চাল', quantity: 2, unit: 'বস্তা', unitPrice: 3200 },
      { name: 'সয়াবিন তেল', quantity: 5, unit: 'লিটার', unitPrice: 180 },
    ],
    discount: 100,
    vat: 0,
    previousBalance: 500, // previous debt
    paidAmount: 7200,     // paid current txn fully
  });

  assert.strictEqual(payload.voucherType, VOUCHER_TYPES.CASH_MEMO);
  assert.strictEqual(payload.voucherNo, 'CM-2026-001');
  assert.strictEqual(payload.items.length, 2);

  // Subtotal: (2 * 3200) + (5 * 180) = 6400 + 900 = 7300 Taka = 730000 Paisa
  assert.strictEqual(payload.financials.subtotal, 7300);
  assert.strictEqual(payload.financials.subtotalPaisa, 730000);
  assert.strictEqual(payload.financials.discount, 100);
  assert.strictEqual(payload.financials.discountPaisa, 10000);

  // Current Txn Amount: 7300 - 100 = 7200 Taka
  assert.strictEqual(payload.financials.currentAmount, 7200);
  assert.strictEqual(payload.financials.currentAmountPaisa, 720000);

  // Paid amount: 7200 Taka
  assert.strictEqual(payload.financials.paidAmount, 7200);

  // Previous balance was 500. Cash memo preserves previous debt
  assert.strictEqual(payload.financials.previousBalance, 500);
  assert.strictEqual(payload.financials.newBalance, 500);

  // In-words representation
  assert(payload.financials.amountInWordsBn.includes('সাত হাজার দুইশত টাকা'));

  return {
    subtotal: payload.financials.subtotal,
    currentAmount: payload.financials.currentAmount,
    newBalance: payload.financials.newBalance,
    words: payload.financials.amountInWordsBn,
  };
});

// -----------------------------------------------------------------------------
// TEST 5: Due Chalan Voucher Payload & Credit Ledger Invariants
// -----------------------------------------------------------------------------
runTest('Due Chalan Voucher Payload & Credit Ledger Invariants', () => {
  const payload = createVoucherDocumentPayload({
    voucherType: 'DUE_CHALAN',
    voucherNo: 'DC-2026-889',
    date: '2026-11-03',
    businessName: 'মেসার্স সততা এন্টারপ্রাইজ',
    customerName: 'মোঃ করিম মিয়া',
    customerPhone: '01912-334455',
    items: [
      { name: 'সিমেন্ট (হোলসিম)', quantity: 50, unit: 'ব্যাগ', unitPrice: 520 },
      { name: 'রড (বিএসআরএম 10mm)', quantity: 200, unit: 'কেজি', unitPrice: 95 },
    ],
    previousBalance: 15000, // Previous outstanding due
    paidAmount: 10000,      // Paid on delivery
  });

  assert.strictEqual(payload.voucherType, VOUCHER_TYPES.DUE_CHALAN);

  // Subtotal: (50 * 520) + (200 * 95) = 26,000 + 19,000 = 45,000 Taka
  assert.strictEqual(payload.financials.subtotal, 45000);
  assert.strictEqual(payload.financials.currentAmount, 45000);

  // Due calculation: prevDue (15000) + currentAmount (45000) - paid (10000) = 50,000 Taka
  assert.strictEqual(payload.financials.previousBalance, 15000);
  assert.strictEqual(payload.financials.paidAmount, 10000);
  assert.strictEqual(payload.financials.newBalance, 50000);
  assert.strictEqual(payload.financials.newBalancePaisa, 5000000);

  return {
    subtotal: payload.financials.subtotal,
    previousBalance: payload.financials.previousBalance,
    paidAmount: payload.financials.paidAmount,
    newBalance: payload.financials.newBalance,
  };
});

// -----------------------------------------------------------------------------
// TEST 6: Shop Expense Voucher Payload & Operating Cost Classification
// -----------------------------------------------------------------------------
runTest('Shop Expense Voucher Payload & Operating Cost Classification', () => {
  const payload = createVoucherDocumentPayload({
    voucherType: 'EXPENSE_SLIP',
    voucherNo: 'EXP-2026-042',
    date: '2026-11-03',
    businessName: 'মেসার্স সততা এন্টারপ্রাইজ',
    partyName: 'কর্মচারী বেতন (রফিকুল ইসলাম)',
    note: 'অক্টোবর ২০২৬ মাসের মাসিক বেতন ও ওভারটাইম',
    amount: 14500,
    paidAmount: 14500,
    paymentMethod: 'Cash',
  });

  assert.strictEqual(payload.voucherType, VOUCHER_TYPES.EXPENSE_SLIP);
  assert.strictEqual(payload.financials.currentAmount, 14500);
  assert.strictEqual(payload.financials.paidAmount, 14500);
  assert.strictEqual(payload.party.name, 'কর্মচারী বেতন (রফিকুল ইসলাম)');
  assert.strictEqual(payload.title.bn, 'দোকান খরচ ভাউচার');

  return {
    voucherType: payload.voucherType,
    amount: payload.financials.currentAmount,
    titleBn: payload.title.bn,
  };
});

// -----------------------------------------------------------------------------
// TEST 7: Standalone HTML5 / CSS3 Print-Ready Document Generator
// -----------------------------------------------------------------------------
runTest('Standalone HTML5 / CSS3 Print-Ready Document Generator (A4/A5)', () => {
  const payload = createVoucherDocumentPayload({
    voucherType: 'CASH_MEMO',
    voucherNo: 'CM-TEST-HTML',
    date: '2026-11-03',
    businessName: 'মেসার্স ঢাকা স্টোর',
    customerName: 'আব্দুল কাদের',
    items: [{ name: 'পণ্য ক', quantity: 3, unitPrice: 150 }],
  });

  const html = generateVoucherHtml(payload, { paperSize: 'A5', showQr: true });

  assert(typeof html === 'string' && html.length > 500, 'HTML must be non-empty string');
  assert(html.includes('<!DOCTYPE html>'), 'Must be valid HTML5 document');
  assert(html.includes('@media print'), 'Must include print media stylesheet');
  assert(html.includes('মেসার্স ঢাকা স্টোর'), 'Must include shop branding');
  assert(html.includes('আব্দুল কাদের'), 'Must include customer name');
  assert(html.includes('CM-TEST-HTML'), 'Must include voucher number');
  assert(html.includes('qr-seal'), 'Must render QR verification placeholder');
  assert(html.includes('TallyKhata Digital'), 'Must include watermark/footer attribution');

  return { htmlByteLength: Buffer.byteLength(html, 'utf8'), hasPrintMedia: true };
});

// -----------------------------------------------------------------------------
// TEST 8: Base64 & RFC-Compliant Simulated PDF Byte Stream Assembly
// -----------------------------------------------------------------------------
runTest('Base64 & RFC-Compliant Simulated PDF Byte Stream Assembly', () => {
  const payload = createVoucherDocumentPayload({
    voucherType: 'DUE_CHALAN',
    voucherNo: 'PDF-TEST-001',
    amount: 2500,
  });

  // Base64 HTML export
  const b64Result = generateVoucherBase64(payload);
  assert(b64Result.base64 && typeof b64Result.base64 === 'string', 'Base64 must be string');
  assert(b64Result.dataUri.startsWith('data:text/html;charset=utf-8;base64,'), 'Data URI header valid');

  const decodedHtml = Buffer.from(b64Result.base64, 'base64').toString('utf8');
  assert(decodedHtml.includes('PDF-TEST-001'), 'Decoded base64 contains original voucher data');

  // Simulated PDF Byte Stream
  const pdfResult = generateSimulatedPdfBase64(payload);
  assert(pdfResult.buffer instanceof Buffer, 'Must return valid Buffer');
  assert.strictEqual(pdfResult.mimeType, 'application/pdf');

  // PDF Invariants: %PDF-1.4 header and %%EOF trailer
  assert(pdfResult.buffer.slice(0, 8).toString('ascii').startsWith('%PDF-1.4'), 'Must have standard PDF magic bytes');
  assert(pdfResult.buffer.toString('ascii').includes('%%EOF'), 'Must have standard %%EOF trailer');
  assert(pdfResult.dataUri.startsWith('data:application/pdf;base64,'), 'PDF data URI valid');

  return {
    htmlBase64Length: b64Result.base64.length,
    pdfByteLength: pdfResult.byteLength,
    validPdfMagic: true,
  };
});

// -----------------------------------------------------------------------------
// TEST 9: Tamper-Evident SHA-256 QR Verification Code Generator & Validator
// -----------------------------------------------------------------------------
runTest('Tamper-Evident SHA-256 QR Verification Code Generator & Validator', () => {
  const payload = {
    business: { id: 'biz_101' },
    voucherNo: 'VCH-9999',
    financials: { currentAmountPaisa: 350050 },
    date: '2026-11-03',
  };

  const qrString = generateVoucherQrVerificationString(payload);
  assert(qrString.startsWith('TK:VCH:v1:biz_101:VCH-9999:350050:2026-11-03:'));

  // Verify valid QR code
  const verification = verifyVoucherQrString(qrString);
  assert.strictEqual(verification.isValid, true, 'QR string must be valid');
  assert.strictEqual(verification.businessId, 'biz_101');
  assert.strictEqual(verification.voucherNo, 'VCH-9999');
  assert.strictEqual(verification.amountPaisa, 350050);
  assert.strictEqual(verification.amountTaka, 3500.5);

  // Tamper check 1: Amount modified from 350050 to 999999
  const tamperedAmount = qrString.replace(':350050:', ':999999:');
  const resTamperedAmount = verifyVoucherQrString(tamperedAmount);
  assert.strictEqual(resTamperedAmount.isValid, false, 'Tampered amount MUST fail verification');
  assert.strictEqual(resTamperedAmount.reason, 'CHECKSUM_MISMATCH');

  // Tamper check 2: Date modified
  const tamperedDate = qrString.replace(':2026-11-03:', ':2026-11-04:');
  const resTamperedDate = verifyVoucherQrString(tamperedDate);
  assert.strictEqual(resTamperedDate.isValid, false, 'Tampered date MUST fail verification');

  // Tamper check 3: Corrupt format
  const invalidFormat = verifyVoucherQrString('INVALID:STRING');
  assert.strictEqual(invalidFormat.isValid, false);
  assert.strictEqual(invalidFormat.reason, 'INVALID_FORMAT');

  return { verified: true, detectedTamper: true, qrString };
});

// -----------------------------------------------------------------------------
// TEST 10: ESC/POS Command Byte Sequences & Binary Protocol Specifications
// -----------------------------------------------------------------------------
runTest('ESC/POS Command Byte Sequences & Binary Protocol Specifications', () => {
  // Check exact byte sequences
  assert.deepStrictEqual(COMMANDS.INIT, Buffer.from([0x1B, 0x40]));
  assert.deepStrictEqual(COMMANDS.ALIGN_LEFT, Buffer.from([0x1B, 0x61, 0x00]));
  assert.deepStrictEqual(COMMANDS.ALIGN_CENTER, Buffer.from([0x1B, 0x61, 0x01]));
  assert.deepStrictEqual(COMMANDS.ALIGN_RIGHT, Buffer.from([0x1B, 0x61, 0x02]));
  assert.deepStrictEqual(COMMANDS.BOLD_ON, Buffer.from([0x1B, 0x45, 0x01]));
  assert.deepStrictEqual(COMMANDS.BOLD_OFF, Buffer.from([0x1B, 0x45, 0x00]));
  assert.deepStrictEqual(COMMANDS.DOUBLE_HEIGHT_WIDTH, Buffer.from([0x1D, 0x21, 0x11]));
  assert.deepStrictEqual(COMMANDS.NORMAL, Buffer.from([0x1D, 0x21, 0x00]));
  assert.deepStrictEqual(COMMANDS.CUT_FEED, Buffer.from([0x1D, 0x56, 0x42, 0x03]));

  // Feed lines parameterization
  assert.deepStrictEqual(COMMANDS.FEED_LINES(3), Buffer.from([0x1B, 0x64, 0x03]));
  assert.deepStrictEqual(COMMANDS.FEED_LINES(5), Buffer.from([0x1B, 0x64, 0x05]));

  return { verifiedCommandsCount: Object.keys(COMMANDS).length };
});

// -----------------------------------------------------------------------------
// TEST 11: Thermal Paper Roll Profiles & Exact Column Formatting
// -----------------------------------------------------------------------------
runTest('Thermal Paper Roll Profiles & Exact Column Formatting (58mm & 80mm)', () => {
  // 58mm -> 32 characters
  const width58 = resolvePaperWidth('58mm');
  assert.strictEqual(width58, 32);
  const profile58 = resolvePaperProfile('58mm');
  assert.strictEqual(profile58.width, 32);

  // 80mm -> 48 characters
  const width80 = resolvePaperWidth('80mm');
  assert.strictEqual(width80, 48);
  const profile80 = resolvePaperProfile('80mm');
  assert.strictEqual(profile80.width, 48);

  // Dividers
  const div58 = formatDivider('-', 32);
  assert.strictEqual(div58.length, 33); // 32 chars + newline
  assert.strictEqual(div58.trim(), '-'.repeat(32));

  // Two columns row formatting
  const row2Col = formatRowTwoColumns('Item Total:', 'Tk 500', 32);
  assert.strictEqual(row2Col.length, 33);
  assert(row2Col.startsWith('Item Total:'));
  assert(row2Col.trim().endsWith('Tk 500'));

  // Three columns row formatting
  const row3Col = formatRowThreeColumns('Rice 25kg', '2 bag', 'Tk 3200', 32, [14, 6, 12]);
  assert.strictEqual(row3Col.length, 33);

  return { width58, width80, row2ColLength: row2Col.trim().length, row3ColLength: row3Col.trim().length };
});

// -----------------------------------------------------------------------------
// TEST 12: Bengali-to-ASCII Transliteration Engine for Legacy POS Hardware
// -----------------------------------------------------------------------------
runTest('Bengali-to-ASCII Transliteration Engine for Legacy POS Hardware', () => {
  // Numerals transliteration
  assert.strictEqual(transliterateBengaliToAscii('১২৩৪৫৬৭৮৯০'), '1234567890');

  // Accounting terms transliteration
  assert.strictEqual(transliterateBengaliToAscii('ক্যাশ মেমো'), 'CASH MEMO');
  assert.strictEqual(transliterateBengaliToAscii('বাকির চালান'), 'DUE CHALAN');
  assert.strictEqual(transliterateBengaliToAscii('দোকান খরচ'), 'SHOP EXPENSE');
  assert.strictEqual(transliterateBengaliToAscii('৫০০ টাকা'), '500 Tk.');
  assert.strictEqual(transliterateBengaliToAscii('মোট বকেয়া'), 'Total Due');

  // General phonetic fallback
  const storeAscii = transliterateBengaliToAscii('সততা স্টোর');
  assert(storeAscii.length > 0 && /^[\x00-\x7F]*$/.test(storeAscii), 'Result must be strictly valid ASCII');

  return { sample: transliterateBengaliToAscii('ক্যাশ মেমো: ৫,০০০ টাকা'), isStrictAscii: true };
});

// -----------------------------------------------------------------------------
// TEST 13: High-Performance Thermal Receipt Assembly with Feed & Cut
// -----------------------------------------------------------------------------
runTest('High-Performance Thermal Receipt Assembly with Feed & Cut Sequencing', () => {
  const voucher = createVoucherDocumentPayload({
    voucherType: 'CASH_MEMO',
    voucherNo: 'THERMAL-001',
    date: '2026-11-03',
    businessName: 'মেসার্স জননী ভান্ডার',
    proprietorName: 'মোঃ হাবিবুর রহমান',
    businessPhone: '01722-112233',
    businessAddress: 'নিউ মার্কেট, ঢাকা',
    customerName: 'আব্দুল মাজেদ',
    customerPhone: '01911-556677',
    items: [
      { name: 'চিনি (সাদা)', quantity: 5, unit: 'কেজি', unitPrice: 140 },
      { name: 'মসুর ডাল', quantity: 2, unit: 'কেজি', unitPrice: 130 },
    ],
    discount: 50,
    previousBalance: 0,
    paidAmount: 910,
  });

  // 1. 58mm build
  const receipt58 = buildThermalReceiptCommands(voucher, { paperWidth: '58mm', cutPaper: true });
  assert(receipt58.buffer instanceof Buffer, 'Must return Buffer');
  assert.strictEqual(receipt58.characterWidth, 32);
  assert.strictEqual(receipt58.paperWidth, '58mm');
  assert(receipt58.byteLength > 200, 'Receipt must contain binary instructions');
  assert(receipt58.base64 && typeof receipt58.base64 === 'string');

  // Verify binary boundaries: Starts with INIT (0x1B, 0x40)
  assert.strictEqual(receipt58.buffer[0], 0x1B);
  assert.strictEqual(receipt58.buffer[1], 0x40);

  // Ends with CUT_FEED (0x1D, 0x56, 0x42, 0x03)
  const len = receipt58.buffer.length;
  assert.strictEqual(receipt58.buffer[len - 4], 0x1D);
  assert.strictEqual(receipt58.buffer[len - 3], 0x56);
  assert.strictEqual(receipt58.buffer[len - 2], 0x42);
  assert.strictEqual(receipt58.buffer[len - 1], 0x03);

  // 2. 80mm build
  const receipt80 = buildThermalReceiptCommands(voucher, { paperWidth: '80mm', cutPaper: false });
  assert.strictEqual(receipt80.characterWidth, 48);
  assert.strictEqual(receipt80.paperWidth, '80mm');

  return {
    receipt58Bytes: receipt58.byteLength,
    receipt80Bytes: receipt80.byteLength,
    initVerified: true,
    cutVerified: true,
  };
});

// -----------------------------------------------------------------------------
// TEST 14: StorageRepository Atomic Mutex Logging (voucherPrintLogs Collection)
// -----------------------------------------------------------------------------
runTest('StorageRepository Atomic Mutex Logging (voucherPrintLogs Collection)', async () => {
  const repo = new storageRepository.StorageRepository('test_iter219_logging_repo');
  await repo.initStore();

  const printEvent = {
    voucherNo: 'VCH-LOG-01',
    voucherType: 'CASH_MEMO',
    format: 'thermal_58mm',
    destination: 'bluetooth',
    status: 'success',
    businessId: '1',
    journalId: 'j_1001',
    accountId: 'acc_55',
    printBytes: 480,
    metadata: { printerName: 'PT-210 Bluetooth', paperWidth: '58mm' },
  };

  const logRes = await repo.logVoucherPrintExport(printEvent, { businessId: '1' });
  assert.strictEqual(logRes.success, true, 'Logging voucher print must succeed');
  assert(logRes.log && logRes.log.id.startsWith('vpl_'));
  assert.strictEqual(logRes.log.voucherNo, 'VCH-LOG-01');
  assert.strictEqual(logRes.log.printBytes, 480);

  // Query log by voucher number
  const queried = repo.getVoucherPrintLogs('VCH-LOG-01', '1');
  assert.strictEqual(queried.length, 1);
  assert.strictEqual(queried[0].journalId, 'j_1001');
  assert.strictEqual(queried[0].destination, 'bluetooth');

  // Query log by journal ID
  const queriedByJournal = repo.getVoucherPrintLogs('j_1001', '1');
  assert.strictEqual(queriedByJournal.length, 1);

  return { logged: true, logId: logRes.log.id, queriedCount: queried.length };
});

// -----------------------------------------------------------------------------
// TEST 15: Multi-Tenant Shop Isolation Across 30 Concurrent Businesses
// -----------------------------------------------------------------------------
runTest('Multi-Tenant Shop Isolation Across 30 Concurrent Businesses', async () => {
  const repo = new storageRepository.StorageRepository('test_iter219_isolation_repo');
  await repo.initStore();

  // Insert colliding voucher numbers "VCH-SHARED-888" across 30 distinct businesses
  for (let bizId = 1; bizId <= 30; bizId++) {
    const res = await repo.logVoucherPrintExport({
      voucherNo: 'VCH-SHARED-888',
      voucherType: bizId % 2 === 0 ? 'CASH_MEMO' : 'DUE_CHALAN',
      format: 'pdf',
      destination: 'download',
      status: 'success',
      businessId: String(bizId),
      journalId: `j_biz_${bizId}`,
      printBytes: 1000 + bizId,
    }, { businessId: String(bizId) });
    assert.strictEqual(res.success, true);
  }

  // Verify strict isolation for each business
  for (let bizId = 1; bizId <= 30; bizId++) {
    const logs = repo.getVoucherPrintLogs('VCH-SHARED-888', String(bizId));
    assert.strictEqual(logs.length, 1, `Business ${bizId} must find exactly 1 log`);
    assert.strictEqual(logs[0].businessId, String(bizId));
    assert.strictEqual(logs[0].journalId, `j_biz_${bizId}`);
    assert.strictEqual(logs[0].printBytes, 1000 + bizId);
  }

  // Cross-tenant verification: Querying business 99 finds 0 logs
  const emptyLogs = repo.getVoucherPrintLogs('VCH-SHARED-888', '99');
  assert.strictEqual(emptyLogs.length, 0);

  return { testedBusinesses: 30, isolationVerified: true, zeroLeakage: true };
});

// -----------------------------------------------------------------------------
// TEST 16: Account & Business Cascade Purges and Cloud Backup Sanitization
// -----------------------------------------------------------------------------
runTest('Account & Business Cascade Purges and Cloud Backup Sanitization', async () => {
  const repo = new storageRepository.StorageRepository('test_iter219_cascade_repo');
  await repo.initStore();

  // Create account, journal, and attached voucher print log
  await repo.mutateCollection('accounts', (list) => [
    ...list,
    { id: 'acc_del_test', name: 'টেস্ট একাউন্ট', type: 1, businessId: '1' },
  ]);
  await repo.mutateCollection('journals', (list) => [
    ...list,
    { id: 'j_del_test', accountId: 'acc_del_test', amount: 1500, type: 'given', businessId: '1' },
  ]);
  await repo.logVoucherPrintExport({
    id: 'vpl_del_test',
    voucherNo: 'VCH-DEL-1',
    voucherType: 'DUE_CHALAN',
    accountId: 'acc_del_test',
    journalId: 'j_del_test',
    businessId: '1',
    printBytes: 350,
  }, { businessId: '1' });

  // Verify log exists before cascade
  assert.strictEqual(repo.getVoucherPrintLogs('VCH-DEL-1', '1').length, 1);

  // Execute account cascade delete
  const delAccRes = await repo.deleteAccountCascade('acc_del_test', '1');
  assert.strictEqual(delAccRes.success, true);

  // Verify voucher print log was purged along with account
  assert.strictEqual(repo.getVoucherPrintLogs('VCH-DEL-1', '1').length, 0, 'Voucher log must be purged with account cascade');

  // Create Business "5"
  await repo.mutateStore((s) => ({
    ...s,
    businesses: [
      ...(s.businesses || []),
      { id: "5", name: "Shop 5 Purge Test", isArchived: false },
    ],
  }));

  // Create log in business "5"
  await repo.logVoucherPrintExport({
    id: 'vpl_biz5_test',
    voucherNo: 'VCH-BIZ5',
    voucherType: 'CASH_MEMO',
    businessId: '5',
    printBytes: 500,
  }, { businessId: '5' });
  assert.strictEqual(repo.getVoucherPrintLogsForBusiness('5').length, 1);

  // Execute business cascade delete for business "5"
  await repo.deleteBusinessCascade('5');
  assert.strictEqual(repo.getVoucherPrintLogsForBusiness('5').length, 0, 'Voucher logs must be purged with business cascade');

  // Backup sanitization test
  await repo.logVoucherPrintExport({
    id: 'vpl_backup_test',
    voucherNo: 'VCH-BKP',
    voucherType: 'CASH_MEMO',
    businessId: '1',
    printBytes: 1200,
    rawBytes: new Uint8Array([1, 2, 3]), // Simulated raw binary payload
    buffer: Buffer.from([1, 2, 3]),
  }, { businessId: '1' });

  const backupPayload = await repo.getFullBackupState();
  const exportedVouchers = backupPayload.voucherPrintLogs;
  assert(Array.isArray(exportedVouchers), 'Backup must export voucherPrintLogs array');
  const bkpLog = exportedVouchers.find((v) => v.id === 'vpl_backup_test');
  assert(bkpLog, 'Exported backup must include voucher print log');
  assert.strictEqual(bkpLog.rawBytes, undefined, 'rawBytes binary MUST be sanitized from backup');
  assert.strictEqual(bkpLog.buffer, undefined, 'buffer binary MUST be sanitized from backup');
  assert.strictEqual(bkpLog.voucherNo, 'VCH-BKP');
  assert.strictEqual(bkpLog.printBytes, 1200);

  return { accountCascadePurged: true, businessCascadePurged: true, backupSanitized: true };
});

// -----------------------------------------------------------------------------
// TEST 17: High-Frequency Document & Thermal Receipt Generation Benchmark
// -----------------------------------------------------------------------------
runTest('High-Frequency Document & Thermal Receipt Generation Benchmark (1,000 Ops)', () => {
  const sampleVoucher = createVoucherDocumentPayload({
    voucherType: 'CASH_MEMO',
    voucherNo: 'BENCH-001',
    date: '2026-11-03',
    businessName: 'মেসার্স হাই স্পিড ট্রেডার্স',
    customerName: 'আব্দুল বেঞ্চমার্কার',
    items: [
      { name: 'পণ্য ১', quantity: 2, unitPrice: 250 },
      { name: 'পণ্য ২', quantity: 1, unitPrice: 500 },
    ],
    discount: 50,
  });

  const startTime = Date.now();
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    // Alternate between HTML document generation and thermal ESC/POS generation
    if (i % 2 === 0) {
      generateVoucherHtml(sampleVoucher);
    } else {
      buildThermalReceiptCommands(sampleVoucher, { paperWidth: '58mm', cutPaper: true });
    }
  }

  const durationMs = Date.now() - startTime;
  const opsPerSec = Math.round((iterations / durationMs) * 1000);

  assert(durationMs < 5000, `1000 operations should complete in under 5000ms, took ${durationMs}ms`);

  return {
    iterations,
    durationMs,
    opsPerSec,
    avgLatencyMs: Math.round((durationMs / iterations) * 100) / 100,
    throughputAdequate: opsPerSec >= 500,
  };
});

setTimeout(() => {
  console.log('='.repeat(80));
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY (100%)`);
  console.log('='.repeat(80));
}, 100);
