/**
 * test_iteration_224_merchant_dashboard_analytics_reference_architecture.js
 *
 * REA-ITER-224: MERCHANT DASHBOARD ANALYTICS & REAL-TIME DIGITAL INFLOW CHARTS REFERENCE ARCHITECTURE
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-224
 * Target Binary: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 * SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9
 */

const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`[FAIL] Test ${totalTests}: ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  }
}

console.log('================================================================');
console.log('  REA-ITER-224: MERCHANT DASHBOARD ANALYTICS REFERENCE ARCH     ');
console.log('================================================================\n');

// -------------------------------------------------------------
// HELPER: Read Zip Entry
// -------------------------------------------------------------
function readZipEntry(apkPath, entryName) {
  const buf = fs.readFileSync(apkPath);
  let eocdOffset = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdOffset === -1) throw new Error('EOCD not found');
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let cur = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    const fnLen = buf.readUInt16LE(cur + 28);
    const extraLen = buf.readUInt16LE(cur + 30);
    const commentLen = buf.readUInt16LE(cur + 32);
    const localHeaderOffset = buf.readUInt32LE(cur + 42);
    const compMethod = buf.readUInt16LE(cur + 10);
    const compSize = buf.readUInt32LE(cur + 20);
    const fn = buf.toString('utf8', cur + 46, cur + 46 + fnLen);
    if (fn === entryName) {
      const locFnLen = buf.readUInt16LE(localHeaderOffset + 26);
      const locExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + locFnLen + locExtraLen;
      const compData = buf.subarray(dataStart, dataStart + compSize);
      if (compMethod === 0) return compData;
      if (compMethod === 8) return zlib.inflateRawSync(compData);
    }
    cur += 46 + fnLen + extraLen + commentLen;
  }
  return null;
}

function getAllZipEntries(apkPath) {
  const buf = fs.readFileSync(apkPath);
  let eocdOffset = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdOffset === -1) throw new Error('EOCD not found');
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let cur = cdOffset;
  const entries = [];
  for (let i = 0; i < totalEntries; i++) {
    const fnLen = buf.readUInt16LE(cur + 28);
    const extraLen = buf.readUInt16LE(cur + 30);
    const commentLen = buf.readUInt16LE(cur + 32);
    const fn = buf.toString('utf8', cur + 46, cur + 46 + fnLen);
    entries.push(fn);
    cur += 46 + fnLen + extraLen + commentLen;
  }
  return entries;
}

function parseBinaryXmlStrings(buf) {
  const strings = [];
  if (!buf || buf.length < 32) return strings;
  const stringCount = buf.readUInt32LE(16);
  const flags = buf.readUInt32LE(24);
  const stringsStart = 8 + buf.readUInt32LE(28);
  const isUtf8 = (flags & (1 << 8)) !== 0;

  for (let i = 0; i < stringCount; i++) {
    const strOffset = stringsStart + buf.readUInt32LE(36 + i * 4);
    if (isUtf8) {
      let len = buf[strOffset];
      let p = strOffset + 1;
      if (len & 0x80) p++;
      let u8len = buf[p];
      p++;
      if (u8len & 0x80) p++;
      strings.push(buf.toString('utf8', p, p + u8len));
    } else {
      const len = buf.readUInt16LE(strOffset);
      strings.push(buf.toString('utf16le', strOffset + 2, strOffset + 2 + len * 2));
    }
  }
  return strings;
}

const apkPath = 'D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk';

// -------------------------------------------------------------
// Test Suite 1: Reference APK Cryptographic Identity & Size
// -------------------------------------------------------------
console.log('--- Test Suite 1: Reference APK Cryptographic Identity ---');
assert(fs.existsSync(apkPath), 'Reference APK exists at ' + apkPath);
const apkStat = fs.statSync(apkPath);
assert(apkStat.size === 53969511, `APK file size matches expected (53969511 === ${apkStat.size})`);
const apkSha256 = crypto.createHash('sha256').update(fs.readFileSync(apkPath)).digest('hex');
assert(apkSha256 === '267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9', 'APK SHA-256 matches expected digest');

// -------------------------------------------------------------
// Test Suite 2: AndroidManifest Report & Analytics Activities
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: AndroidManifest.xml Report & Analytics Activities ---');
const manifestBuf = readZipEntry(apkPath, 'AndroidManifest.xml');
assert(manifestBuf !== null, 'AndroidManifest.xml extracted successfully');
const manifestStrings = parseBinaryXmlStrings(manifestBuf);

const requiredManifestActivities = [
  'com.progoti.tallykhata.v2.reports.BakiReportActivity',
  'com.progoti.tallykhata.v2.reports.BechaKenaReportActivity',
  'com.progoti.tallykhata.v2.reports.CashReportActivity',
  'com.progoti.tallykhata.v2.reports.DailyBuySaleReportActivity',
  'com.progoti.tallykhata.v2.reports.DailyCashBechaReportActivity',
  'com.progoti.tallykhata.v2.reports.DailyCashExpenseReportActivity',
  'com.progoti.tallykhata.v2.reports.ExpenseReportActivity',
  'com.progoti.tallykhata.v2.reports.MalikReportActivity',
  'com.progoti.tallykhata.v2.reports.SmsReportActivity',
  'com.progoti.tallykhata.v2.activities.CustomerReportActivity',
  'com.progoti.tallykhata.v2.activities.DailyReportActivity',
  'com.progoti.tallykhata.v2.activities.MonthlyCashActivity'
];

for (const act of requiredManifestActivities) {
  assert(manifestStrings.includes(act), `Manifest registers report activity: ${act}`);
}

// -------------------------------------------------------------
// Test Suite 3: Layout Resources for Transaction Summaries & Reports
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Layout Resources in APK ---');
const zipEntries = getAllZipEntries(apkPath);

const requiredLayouts = [
  'res/layout/fragment_tallypay_transaction_summary.xml',
  'res/layout/layout_tallypay_all_txn_history_and_txn_summary.xml',
  'res/layout/layout_txn_summary.xml',
  'res/layout/adapter_report_download_date_range_selection.xml',
  'res/layout/cashbook_dashboard_item.xml',
  'res/layout/layout_cashbook_dashboard_total.xml',
  'res/layout/shimmer_txn_summary.xml',
  'res/layout/activity_becha_kena_report.xml',
  'res/layout/activity_baki_report.xml',
  'res/layout/activity_cash_report.xml',
  'res/layout/activity_expense_report.xml'
];

for (const layout of requiredLayouts) {
  assert(zipEntries.includes(layout), `Verified layout resource: ${layout}`);
}

// -------------------------------------------------------------
// Test Suite 4: DEX Bytecode Architecture & Classes
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: DEX Bytecode Architecture & Classes ---');
const classes4DexBuf = readZipEntry(apkPath, 'classes4.dex');
assert(classes4DexBuf !== null, 'classes4.dex extracted successfully');
const classes4DexStr = classes4DexBuf.toString('utf8');

assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/TpTransactionHistorySummaryFragment;'), 'TpTransactionHistorySummaryFragment present in classes4.dex');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/summary/MonthlyTxnResponseDto;'), 'MonthlyTxnResponseDto present in classes4.dex');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/summary/TxnReport;'), 'TxnReport present in classes4.dex');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/StatementSummaryDto;'), 'StatementSummaryDto present in classes4.dex');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/Summary;'), 'Summary present in classes4.dex');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/dashboard/WalletFragment;'), 'WalletFragment present in classes4.dex');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/dashboard/TpWalletRecentTransactionFragment;'), 'TpWalletRecentTransactionFragment present in classes4.dex');

// Metrics fields in bytecode
assert(classes4DexStr.includes('creditTxnCount'), 'creditTxnCount metric present in classes4.dex');
assert(classes4DexStr.includes('totalCreditPerDay'), 'totalCreditPerDay metric present in classes4.dex');
assert(classes4DexStr.includes('totalCreditPerMonth'), 'totalCreditPerMonth metric present in classes4.dex');
assert(classes4DexStr.includes('totalDebitCreditLimit'), 'totalDebitCreditLimit metric present in classes4.dex');
assert(classes4DexStr.includes('totalDebitCreditUsage'), 'totalDebitCreditUsage metric present in classes4.dex');
assert(classes4DexStr.includes('totalDebitPerMonth'), 'totalDebitPerMonth metric present in classes4.dex');

// -------------------------------------------------------------
// Test Suite 5: ARSC Authentic Bengali Resource Strings
// -------------------------------------------------------------
console.log('\n--- Test Suite 5: ARSC Authentic Bengali Resource Strings ---');
const arscBuf = readZipEntry(apkPath, 'resources.arsc');
assert(arscBuf !== null, 'resources.arsc extracted successfully');
const arscStr = arscBuf.toString('utf8');

// Period tokens
const expectedPeriodTerms = [
  'দৈনিক',
  'মাসিক',
  'আজকের ক্যাশ',
  'আজকের পেমেন্ট',
  'আজকের বাকি',
  'আজকের বেচা',
  'আজকের সংগ্রহ',
  'আজকের হিসাব',
  'আজ পেলাম',
  'এই মাসের ডাটা সার্ভার এ নেই'
];

for (const term of expectedPeriodTerms) {
  assert(arscStr.includes(term), `ARSC contains period term: "${term}"`);
}

// Digital Collection copy
const expectedCollectionTerms = [
  'এখন ডিজিটাল কালেকশন করুন খুব সহজেই।',
  'কালেকশন',
  'কালেকশন করতে টালিখাতার কাস্টমার সিলেক্ট করি'
];

for (const term of expectedCollectionTerms) {
  assert(arscStr.includes(term), `ARSC contains digital collection copy: "${term}"`);
}

// Channel tokens
const expectedChannelTerms = [
  'বিকাশ',
  'নগদ',
  'রকেট',
  'উপায়'
];

for (const term of expectedChannelTerms) {
  assert(arscStr.includes(term), `ARSC contains payment channel copy: "${term}"`);
}

// Financial aggregate metrics
const expectedAggregateTerms = [
  'মোট লেনদেনের পরিমাণ লিমিট অতিক্রম করেছে।',
  'মোট ব্যয়',
  'মোট লাভ'
];

for (const term of expectedAggregateTerms) {
  assert(arscStr.includes(term), `ARSC contains financial aggregate copy: "${term}"`);
}

// -------------------------------------------------------------
// Test Suite 6: Merchant Analytics & Inflow Engine Invariants
// -------------------------------------------------------------
console.log('\n--- Test Suite 6: Merchant Analytics & Inflow Engine Invariants ---');

/**
 * Reconstructed Analytics Engine Core Implementation
 */
class MerchantAnalyticsEngine {
  constructor() {
    this.CHANNELS = {
      bkash: { id: 'bkash', nameBn: 'বিকাশ' },
      nagad: { id: 'nagad', nameBn: 'নগদ' },
      rocket: { id: 'rocket', nameBn: 'রকেট' },
      upay: { id: 'upay', nameBn: 'উপায়' },
      card: { id: 'card', nameBn: 'কার্ড' },
      bangla_qr: { id: 'bangla_qr', nameBn: 'বাংলা কিউআর' }
    };
  }

  calculatePeriodSummary(transactions, periodKey, periodLabelBn, startDate, endDate, priorPeriodGrossPaisa = 0) {
    let grossInflowPaisa = 0;
    let netInflowPaisa = 0;
    let totalTxnCount = 0;
    const channelMap = {};

    for (const key of Object.keys(this.CHANNELS)) {
      channelMap[key] = {
        channelId: key,
        channelNameBn: this.CHANNELS[key].nameBn,
        totalAmountPaisa: 0,
        txnCount: 0,
        percentageShare: 0,
        basisPoints: 0
      };
    }

    for (const txn of transactions) {
      if (txn.status === 'SUCCESS' && txn.type === 'CREDIT') {
        const paisa = Math.round(Number(txn.amountPaisa));
        const fee = Math.round(Number(txn.feePaisa || 0));
        grossInflowPaisa += paisa;
        netInflowPaisa += (paisa - fee);
        totalTxnCount++;

        const ch = channelMap[txn.channelId] || channelMap['bangla_qr'];
        ch.totalAmountPaisa += paisa;
        ch.txnCount++;
      }
    }

    const avgTicketPaisa = totalTxnCount > 0 ? Math.round(grossInflowPaisa / totalTxnCount) : 0;

    // Calculate percentage shares and basis points using largest remainder
    const breakdown = Object.values(channelMap);
    if (grossInflowPaisa > 0) {
      let allocatedBp = 0;
      for (const ch of breakdown) {
        ch.basisPoints = Math.round((ch.totalAmountPaisa * 10000) / grossInflowPaisa);
        allocatedBp += ch.basisPoints;
      }
      // Reconcile rounding drift to exactly 10,000 bp
      let diff = 10000 - allocatedBp;
      if (diff !== 0) {
        const sorted = [...breakdown].sort((a, b) => b.totalAmountPaisa - a.totalAmountPaisa);
        if (sorted.length > 0 && sorted[0].totalAmountPaisa > 0) {
          sorted[0].basisPoints += diff;
        }
      }
      for (const ch of breakdown) {
        ch.percentageShare = Number((ch.basisPoints / 100).toFixed(2));
      }
    }

    // Period growth rate vs prior period
    let growthRatePct = 0;
    if (priorPeriodGrossPaisa > 0) {
      growthRatePct = Number((((grossInflowPaisa - priorPeriodGrossPaisa) * 100) / priorPeriodGrossPaisa).toFixed(2));
    } else if (priorPeriodGrossPaisa === 0 && grossInflowPaisa > 0) {
      growthRatePct = 100.0;
    }

    return {
      periodKey,
      periodLabelBn,
      startDate,
      endDate,
      grossInflowPaisa,
      grossInflowBdt: grossInflowPaisa / 100,
      netInflowPaisa,
      netInflowBdt: netInflowPaisa / 100,
      totalTxnCount,
      avgTicketPaisa,
      avgTicketBdt: avgTicketPaisa / 100,
      channelBreakdown: breakdown,
      growthRatePct
    };
  }
}

const engine = new MerchantAnalyticsEngine();

// Fixture 1: Multi-channel retail transactions
const mockTxns = [
  { id: 'TXN-01', type: 'CREDIT', status: 'SUCCESS', channelId: 'bkash', amountPaisa: 50000, feePaisa: 0 },    // ৳500
  { id: 'TXN-02', type: 'CREDIT', status: 'SUCCESS', channelId: 'nagad', amountPaisa: 30000, feePaisa: 0 },    // ৳300
  { id: 'TXN-03', type: 'CREDIT', status: 'SUCCESS', channelId: 'rocket', amountPaisa: 20000, feePaisa: 0 },   // ৳200
  { id: 'TXN-04', type: 'CREDIT', status: 'SUCCESS', channelId: 'bkash', amountPaisa: 50000, feePaisa: 0 },    // ৳500
  { id: 'TXN-05', type: 'CREDIT', status: 'SUCCESS', channelId: 'card', amountPaisa: 100000, feePaisa: 1500 }, // ৳1000, fee ৳15
  { id: 'TXN-06', type: 'CREDIT', status: 'FAILED', channelId: 'nagad', amountPaisa: 40000, feePaisa: 0 }     // Ignored
];

const priorGrossPaisa = 200000; // Prior period was ৳2,000.00
const summary = engine.calculatePeriodSummary(mockTxns, 'TODAY', 'আজকে', '2026-11-04', '2026-11-04', priorGrossPaisa);

assert(summary.grossInflowPaisa === 250000, 'Gross inflow is 250000 paisa (৳2,500.00)');
assert(summary.grossInflowBdt === 2500, 'Gross inflow BDT is exactly 2500.00');
assert(summary.netInflowPaisa === 248500, 'Net inflow is 248500 paisa (৳2,485.00 after ৳15 fee)');
assert(summary.totalTxnCount === 5, 'Total successful transactions count is exactly 5');
assert(summary.avgTicketPaisa === 50000, 'Average ticket is 50000 paisa (৳500.00)');
assert(summary.avgTicketBdt === 500, 'Average ticket BDT is exactly 500.00');
assert(summary.growthRatePct === 25.0, 'Growth rate is +25.0% vs prior period (2500 vs 2000)');

// Test channel breakdown and basis point reconciliation
const bkashMetric = summary.channelBreakdown.find(c => c.channelId === 'bkash');
assert(bkashMetric.totalAmountPaisa === 100000, 'bKash total is 100000 paisa (৳1,000.00)');
assert(bkashMetric.txnCount === 2, 'bKash transaction count is 2');
assert(bkashMetric.basisPoints === 4000, 'bKash represents 4000 basis points (40.0%)');
assert(bkashMetric.percentageShare === 40.0, 'bKash percentage share is 40.0%');

const cardMetric = summary.channelBreakdown.find(c => c.channelId === 'card');
assert(cardMetric.totalAmountPaisa === 100000, 'Card total is 100000 paisa (৳1,000.00)');
assert(cardMetric.basisPoints === 4000, 'Card represents 4000 basis points (40.0%)');

const nagadMetric = summary.channelBreakdown.find(c => c.channelId === 'nagad');
assert(nagadMetric.totalAmountPaisa === 30000, 'Nagad total is 30000 paisa (৳300.00)');
assert(nagadMetric.basisPoints === 1200, 'Nagad represents 1200 basis points (12.0%)');

const rocketMetric = summary.channelBreakdown.find(c => c.channelId === 'rocket');
assert(rocketMetric.totalAmountPaisa === 20000, 'Rocket total is 20000 paisa (৳200.00)');
assert(rocketMetric.basisPoints === 800, 'Rocket represents 800 basis points (8.0%)');

// Sum of basis points must equal 10,000
const totalBp = summary.channelBreakdown.reduce((acc, c) => acc + c.basisPoints, 0);
assert(totalBp === 10000, 'Sum of all channel basis points strictly equals 10,000 (100.0%)');

// Test empty transactions edge case
const emptySummary = engine.calculatePeriodSummary([], 'THIS_MONTH', 'এই মাসে', '2026-11-01', '2026-11-30', 0);
assert(emptySummary.grossInflowPaisa === 0, 'Empty ledger produces 0 gross inflow');
assert(emptySummary.totalTxnCount === 0, 'Empty ledger produces 0 transaction count');
assert(emptySummary.avgTicketPaisa === 0, 'Empty ledger produces 0 avg ticket');
assert(emptySummary.growthRatePct === 0, 'Empty ledger produces 0 growth rate');

console.log('----------------------------------------------------------------');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: 0 (100% SUCCESS)`);
console.log('================================================================');
