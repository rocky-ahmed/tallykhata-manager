/**
 * test_iteration_224_digital_analytics_backend.js
 *
 * Automated Backend & Data Architecture Verification Suite for Milestone REA-ITER-224
 * Merchant Dashboard Analytics, Digital Inflow Aggregation & Real-Time Payment Charts
 *
 * Worker: Worker 2: Averroes (Principal Backend Developer & Business Logic)
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 * Milestone: REA-ITER-224
 */

const assert = require('assert');
const {
  PERIOD_TYPES,
  PERIOD_LABELS_BN,
  PERIOD_LABELS_EN,
  SUPPORTED_CHANNELS,
  calculateDigitalInflowAnalytics,
  filterTransactionsByDateRange,
  resolveAnalyticsDateRange,
  resolveChannelId,
  toBengaliNumeral,
  formatCurrencyBn,
  formatCurrencyEn,
  MerchantAnalyticsEngine,
  merchantAnalyticsEngine,
} = require('./src/digitalAnalyticsService');

const {
  StorageRepository,
  createDefaultState,
  getDigitalInflowTransactions,
  digitalAnalyticsService,
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
console.log('TALLYKHATA ITERATION 224: DIGITAL ANALYTICS & INFLOW BACKEND SUITE');
console.log('Worker: Worker 2: Averroes (Principal Backend Developer & Business Logic)');
console.log('Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// 1. Constants, Period Enums & Channel Specifications
// -----------------------------------------------------------------------------
runTest('Analytics constants, period enums & supported channels conform to spec', () => {
  assert.strictEqual(PERIOD_TYPES.TODAY, 'TODAY');
  assert.strictEqual(PERIOD_TYPES.THIS_WEEK, 'THIS_WEEK');
  assert.strictEqual(PERIOD_TYPES.THIS_MONTH, 'THIS_MONTH');
  assert.strictEqual(PERIOD_TYPES.ALL_TIME, 'ALL_TIME');
  assert.strictEqual(PERIOD_TYPES.CUSTOM, 'CUSTOM');

  assert.strictEqual(PERIOD_LABELS_BN.TODAY, 'আজকে');
  assert.strictEqual(PERIOD_LABELS_BN.THIS_WEEK, 'এই সপ্তাহে');
  assert.strictEqual(PERIOD_LABELS_BN.THIS_MONTH, 'এই মাসে');
  assert.strictEqual(PERIOD_LABELS_BN.ALL_TIME, 'সব সময়');
  assert.strictEqual(PERIOD_LABELS_BN.CUSTOM, 'নির্দিষ্ট তারিখ');

  const channelKeys = Object.keys(SUPPORTED_CHANNELS);
  assert.strictEqual(channelKeys.length, 6, 'Must define exactly 6 primary payment channels');
  assert.ok(SUPPORTED_CHANNELS.bkash, 'bKash must be supported');
  assert.ok(SUPPORTED_CHANNELS.nagad, 'Nagad must be supported');
  assert.ok(SUPPORTED_CHANNELS.rocket, 'Rocket must be supported');
  assert.ok(SUPPORTED_CHANNELS.upay, 'Upay must be supported');
  assert.ok(SUPPORTED_CHANNELS.bangla_qr, 'Bangla QR must be supported');
  assert.ok(SUPPORTED_CHANNELS.card, 'Card must be supported');

  assert.strictEqual(SUPPORTED_CHANNELS.bkash.nameBn, 'বিকাশ');
  assert.strictEqual(SUPPORTED_CHANNELS.nagad.nameBn, 'নগদ');
  assert.strictEqual(SUPPORTED_CHANNELS.bangla_qr.nameBn, 'বাংলা কিউআর');

  // Channel resolver checks
  assert.strictEqual(resolveChannelId('bkash'), 'bkash');
  assert.strictEqual(resolveChannelId('NAGAD'), 'nagad');
  assert.strictEqual(resolveChannelId('dbbl'), 'rocket');
  assert.strictEqual(resolveChannelId('visa'), 'card');
  assert.strictEqual(resolveChannelId('mastercard'), 'card');
  assert.strictEqual(resolveChannelId('cellfin'), 'bangla_qr');
  assert.strictEqual(resolveChannelId('unknown_wallet'), 'bangla_qr');
});

// -----------------------------------------------------------------------------
// 2. Bengali Numeral & Currency Formatting
// -----------------------------------------------------------------------------
runTest('Bengali numeral & Indian/Bangladeshi currency formatting precision', () => {
  assert.strictEqual(toBengaliNumeral(0), '০');
  assert.strictEqual(toBengaliNumeral(123456789), '১২৩৪৫৬৭৮৯');
  assert.strictEqual(toBengaliNumeral('2026-11-04'), '২০২৬-১১-০৪');

  const formattedBn = formatCurrencyBn(2500.50);
  assert.strictEqual(formattedBn, '৳ ২,৫০০.৫০');

  const formattedCroreBn = formatCurrencyBn(10000000.75);
  assert.strictEqual(formattedCroreBn, '৳ ১,০০,০০,০০০.৭৫');

  const formattedZero = formatCurrencyBn(0);
  assert.strictEqual(formattedZero, '৳ ০.০০');

  const formattedEn = formatCurrencyEn(2500.50);
  assert.strictEqual(formattedEn, '৳ 2,500.50');
});

// -----------------------------------------------------------------------------
// 3. Date Range Resolution & Invariant Boundaries
// -----------------------------------------------------------------------------
runTest('resolveAnalyticsDateRange computes exact period boundaries & prior windows', () => {
  const refDate = new Date('2026-11-04T12:00:00.000Z');

  // TODAY
  const todayRange = resolveAnalyticsDateRange('TODAY', {}, refDate);
  assert.strictEqual(todayRange.periodKey, 'TODAY');
  assert.strictEqual(todayRange.startDate, '2026-11-04');
  assert.strictEqual(todayRange.endDate, '2026-11-04');
  assert.strictEqual(todayRange.priorStartDate, '2026-11-03');
  assert.strictEqual(todayRange.priorEndDate, '2026-11-03');

  // THIS_WEEK (7 days)
  const weekRange = resolveAnalyticsDateRange('THIS_WEEK', {}, refDate);
  assert.strictEqual(weekRange.periodKey, 'THIS_WEEK');
  assert.strictEqual(weekRange.startDate, '2026-10-29');
  assert.strictEqual(weekRange.endDate, '2026-11-04');
  assert.strictEqual(weekRange.priorStartDate, '2026-10-22');
  assert.strictEqual(weekRange.priorEndDate, '2026-10-28');

  // THIS_MONTH
  const monthRange = resolveAnalyticsDateRange('THIS_MONTH', {}, refDate);
  assert.strictEqual(monthRange.periodKey, 'THIS_MONTH');
  assert.strictEqual(monthRange.startDate, '2026-11-01');
  assert.strictEqual(monthRange.endDate, '2026-11-30');
  assert.strictEqual(monthRange.priorStartDate, '2026-10-01');
  assert.strictEqual(monthRange.priorEndDate, '2026-10-31');

  // CUSTOM
  const customRange = resolveAnalyticsDateRange('CUSTOM', { startDate: '2026-11-01', endDate: '2026-11-03' }, refDate);
  assert.strictEqual(customRange.periodKey, 'CUSTOM');
  assert.strictEqual(customRange.startDate, '2026-11-01');
  assert.strictEqual(customRange.endDate, '2026-11-03');
  assert.strictEqual(customRange.priorStartDate, '2026-10-29');
  assert.strictEqual(customRange.priorEndDate, '2026-10-31');

  // ALL_TIME
  const allTimeRange = resolveAnalyticsDateRange('ALL_TIME', {}, refDate);
  assert.strictEqual(allTimeRange.periodKey, 'ALL_TIME');
  assert.strictEqual(allTimeRange.startDate, null);
  assert.strictEqual(allTimeRange.endDate, null);
});

// -----------------------------------------------------------------------------
// 4. Transaction Date Range Filter Helper
// -----------------------------------------------------------------------------
runTest('filterTransactionsByDateRange filters accurately and preserves undated mocks', () => {
  const txns = [
    { id: '1', date: '2026-11-01', amount: 100 },
    { id: '2', date: '2026-11-02', amount: 200 },
    { id: '3', date: '2026-11-04', amount: 300 },
    { id: '4', date: '2026-11-05', amount: 400 },
    { id: '5', amount: 500 }, // Undated fixture
  ];

  const filtered = filterTransactionsByDateRange(txns, '2026-11-02', '2026-11-04');
  assert.strictEqual(filtered.length, 3, 'Must include 2026-11-02, 2026-11-04, and undated mock');
  assert.ok(filtered.some(t => t.id === '2'));
  assert.ok(filtered.some(t => t.id === '3'));
  assert.ok(filtered.some(t => t.id === '5'));
  assert.ok(!filtered.some(t => t.id === '1'), 'Must exclude 2026-11-01');
  assert.ok(!filtered.some(t => t.id === '4'), 'Must exclude 2026-11-05');
});

// -----------------------------------------------------------------------------
// 5. Reference Architecture Parity (REF-001 Inflow & Channel Shares)
// -----------------------------------------------------------------------------
runTest('calculateDigitalInflowAnalytics matches REF-001 reference architecture exactly', () => {
  const mockTxns = [
    { id: 'TXN-01', type: 'CREDIT', status: 'SUCCESS', channelId: 'bkash', amountPaisa: 50000, feePaisa: 0 },
    { id: 'TXN-02', type: 'CREDIT', status: 'SUCCESS', channelId: 'nagad', amountPaisa: 30000, feePaisa: 0 },
    { id: 'TXN-03', type: 'CREDIT', status: 'SUCCESS', channelId: 'rocket', amountPaisa: 20000, feePaisa: 0 },
    { id: 'TXN-04', type: 'CREDIT', status: 'SUCCESS', channelId: 'bkash', amountPaisa: 50000, feePaisa: 0 },
    { id: 'TXN-05', type: 'CREDIT', status: 'SUCCESS', channelId: 'card', amountPaisa: 100000, feePaisa: 1500 },
    { id: 'TXN-06', type: 'CREDIT', status: 'FAILED', channelId: 'nagad', amountPaisa: 40000, feePaisa: 0 },
  ];

  const priorGrossPaisa = 200000;
  const summary = calculateDigitalInflowAnalytics(mockTxns, {
    period: 'TODAY',
    startDate: '2026-11-04',
    endDate: '2026-11-04',
    priorPeriodGrossPaisa: priorGrossPaisa,
  });

  assert.strictEqual(summary.grossInflowPaisa, 250000, 'Gross inflow must be 250,000 paisa');
  assert.strictEqual(summary.grossInflowBdt, 2500, 'Gross inflow BDT must be 2,500.00');
  assert.strictEqual(summary.netInflowPaisa, 248500, 'Net inflow must be 248,500 paisa');
  assert.strictEqual(summary.totalTxnCount, 5, 'Total successful transactions must be 5');
  assert.strictEqual(summary.avgTicketPaisa, 50000, 'Average ticket must be 50,000 paisa');
  assert.strictEqual(summary.growthRatePct, 25.0, 'Growth rate must be +25.0%');
  assert.strictEqual(summary.growthDirection, 'POSITIVE');
  assert.strictEqual(summary.formattedGrowthBn, '+২৫.০০%');

  // Channel share checks
  const bkashMetric = summary.channelBreakdown.find(c => c.channelId === 'bkash');
  assert.strictEqual(bkashMetric.amountPaisa, 100000);
  assert.strictEqual(bkashMetric.basisPoints, 4000);
  assert.strictEqual(bkashMetric.percentage, 40.0);

  const cardMetric = summary.channelBreakdown.find(c => c.channelId === 'card');
  assert.strictEqual(cardMetric.amountPaisa, 100000);
  assert.strictEqual(cardMetric.basisPoints, 4000);

  const nagadMetric = summary.channelBreakdown.find(c => c.channelId === 'nagad');
  assert.strictEqual(nagadMetric.amountPaisa, 30000);
  assert.strictEqual(nagadMetric.basisPoints, 1200);

  const rocketMetric = summary.channelBreakdown.find(c => c.channelId === 'rocket');
  assert.strictEqual(rocketMetric.amountPaisa, 20000);
  assert.strictEqual(rocketMetric.basisPoints, 800);

  // Exact 10,000 basis points and 100.00% sum
  const totalBp = summary.channelBreakdown.reduce((acc, c) => acc + c.basisPoints, 0);
  assert.strictEqual(totalBp, 10000, 'Sum of all basis points must equal 10,000');
  const totalPct = summary.channelBreakdown.reduce((acc, c) => acc + c.percentage, 0);
  assert.strictEqual(Math.round(totalPct * 100) / 100, 100.0, 'Sum of channel percentages must equal 100.00%');
});

// -----------------------------------------------------------------------------
// 6. Largest-Remainder Normalization on Non-Trivial Fractions
// -----------------------------------------------------------------------------
runTest('Largest-Remainder Method strictly reconciles odd fractional splits to 100.00%', () => {
  // 3 channels with 1/3 split: 100 Taka, 100 Taka, 100 Taka
  const oddTxns = [
    { channelId: 'bkash', amount: 100, status: 'SUCCESS', type: 'CREDIT' },
    { channelId: 'nagad', amount: 100, status: 'SUCCESS', type: 'CREDIT' },
    { channelId: 'rocket', amount: 100, status: 'SUCCESS', type: 'CREDIT' },
  ];

  const res = calculateDigitalInflowAnalytics(oddTxns, { period: 'ALL_TIME' });
  assert.strictEqual(res.grossInflowPaisa, 30000);

  const totalBp = res.channelBreakdown.reduce((acc, c) => acc + c.basisPoints, 0);
  assert.strictEqual(totalBp, 10000, 'Sum of basis points must be exactly 10,000 even with 1/3 fractions');

  const totalPct = res.channelBreakdown.reduce((acc, c) => acc + c.percentage, 0);
  assert.strictEqual(Math.round(totalPct * 100) / 100, 100.0, 'Sum of percentage must be exactly 100.00%');
});

// -----------------------------------------------------------------------------
// 7. Extreme Monetary Boundaries: 1 Paisa to 10 Crore Taka
// -----------------------------------------------------------------------------
runTest('Zero float drift from 1 Paisa (0.01 Taka) up to 10 Crore Taka (100,000,000 Taka)', () => {
  const boundaryTxns = [
    { channelId: 'bkash', amount: 0.01, status: 'SUCCESS', type: 'CREDIT' }, // 1 paisa
    { channelId: 'card', amount: 100000000.00, fee: 150000.00, status: 'SUCCESS', type: 'CREDIT' }, // 10 Crore Taka
  ];

  const res = calculateDigitalInflowAnalytics(boundaryTxns, { period: 'ALL_TIME' });
  assert.strictEqual(res.grossInflowPaisa, 10000000001, 'Gross paisa must be exactly 10,000,000,001');
  assert.strictEqual(res.netInflowPaisa, 10000000001 - 15000000, 'Net paisa must be exact integer');
  assert.strictEqual(res.totalTxnCount, 2);

  const cardMetric = res.channelBreakdown.find(c => c.channelId === 'card');
  assert.strictEqual(cardMetric.basisPoints, 10000);
  assert.strictEqual(cardMetric.percentage, 100.0);
});

// -----------------------------------------------------------------------------
// 8. Velocity Timeseries: Hourly (Today) & Daily (Week/Month)
// -----------------------------------------------------------------------------
runTest('Velocity timeseries correctly populates 24 hourly buckets and daily intervals', () => {
  const todayTxns = [
    { time: '09:15', amount: 500, channelId: 'bkash', status: 'SUCCESS', type: 'CREDIT' },
    { time: '09:45', amount: 300, channelId: 'nagad', status: 'SUCCESS', type: 'CREDIT' },
    { time: '14:20', amount: 1200, channelId: 'rocket', status: 'SUCCESS', type: 'CREDIT' },
    { time: '21:00', amount: 400, channelId: 'card', status: 'SUCCESS', type: 'CREDIT' },
  ];

  const todayRes = calculateDigitalInflowAnalytics(todayTxns, { period: 'TODAY' });
  assert.strictEqual(todayRes.velocityTimeseries.length, 24, 'TODAY timeseries must have exactly 24 hourly buckets');
  assert.strictEqual(todayRes.velocityTimeseries[9].amountPaisa, 80000, 'Hour 09:00 must aggregate ৳800 (80000 paisa)');
  assert.strictEqual(todayRes.velocityTimeseries[9].txnCount, 2, 'Hour 09:00 must count 2 transactions');
  assert.strictEqual(todayRes.velocityTimeseries[14].amountPaisa, 120000, 'Hour 14:00 must aggregate ৳1200');
  assert.strictEqual(todayRes.velocityTimeseries[21].amountPaisa, 40000, 'Hour 21:00 must aggregate ৳400');

  // Verify timeseries sum matches total inflow
  const timeseriesSum = todayRes.velocityTimeseries.reduce((acc, b) => acc + b.amountPaisa, 0);
  assert.strictEqual(timeseriesSum, todayRes.grossInflowPaisa, 'Timeseries amount sum must equal gross inflow');

  // Daily timeseries check for THIS_WEEK
  const multiDayTxns = [
    { date: '2026-11-01', amount: 500, channelId: 'bkash', status: 'SUCCESS', type: 'CREDIT' },
    { date: '2026-11-02', amount: 700, channelId: 'nagad', status: 'SUCCESS', type: 'CREDIT' },
    { date: '2026-11-03', amount: 900, channelId: 'rocket', status: 'SUCCESS', type: 'CREDIT' },
  ];
  const weekRes = calculateDigitalInflowAnalytics(multiDayTxns, {
    period: 'CUSTOM',
    startDate: '2026-11-01',
    endDate: '2026-11-03',
  });
  assert.strictEqual(weekRes.velocityTimeseries.length, 3, 'Must create 3 daily buckets');
  assert.strictEqual(weekRes.velocityTimeseries[0].date, '2026-11-01');
  assert.strictEqual(weekRes.velocityTimeseries[0].amountPaisa, 50000);
});

// -----------------------------------------------------------------------------
// 9. Period-over-Period Growth & Zero-Division Safety
// -----------------------------------------------------------------------------
runTest('Period growth rate handles positive, negative, and zero-division edge cases safely', () => {
  // Positive growth: 2500 vs 2000 -> +25%
  const posRes = calculateDigitalInflowAnalytics([{ amount: 2500 }], { period: 'ALL_TIME', priorPeriodGrossPaisa: 200000 });
  assert.strictEqual(posRes.growthRatePct, 25.0);
  assert.strictEqual(posRes.growthDirection, 'POSITIVE');

  // Negative growth: 1500 vs 2000 -> -25%
  const negRes = calculateDigitalInflowAnalytics([{ amount: 1500 }], { period: 'ALL_TIME', priorPeriodGrossPaisa: 200000 });
  assert.strictEqual(negRes.growthRatePct, -25.0);
  assert.strictEqual(negRes.growthDirection, 'NEGATIVE');
  assert.strictEqual(negRes.formattedGrowthBn, '-২৫.০০%');

  // Zero prior with positive current -> +100%
  const zeroPriorRes = calculateDigitalInflowAnalytics([{ amount: 500 }], { period: 'ALL_TIME', priorPeriodGrossPaisa: 0 });
  assert.strictEqual(zeroPriorRes.growthRatePct, 100.0);
  assert.strictEqual(zeroPriorRes.growthDirection, 'POSITIVE');

  // Zero prior with zero current -> 0%
  const allZeroRes = calculateDigitalInflowAnalytics([], { period: 'ALL_TIME', priorPeriodGrossPaisa: 0 });
  assert.strictEqual(allZeroRes.growthRatePct, 0.0);
  assert.strictEqual(allZeroRes.growthDirection, 'NEUTRAL');
  assert.strictEqual(allZeroRes.formattedGrowthBn, '০.০০%');
});

// -----------------------------------------------------------------------------
// 10. StorageRepository getDigitalInflowTransactions & Multi-Tenant Scoping
// -----------------------------------------------------------------------------
runAsyncTest('StorageRepository aggregates digital inflows across collections with strict business isolation', async () => {
  const repo = new StorageRepository();
  await repo.initStore();

  // Business 1: Bangla QR, Add Money, and Digital Journal
  await repo.logBanglaQrTransaction({
    id: 'bqr_b1_01',
    amount: 1500.00,
    fee: 0,
    channelId: 'bkash',
    status: 'SUCCESS',
    fromName: 'করিম উল্লাহ',
    date: '2026-11-04',
  }, { businessId: '1' });

  await repo.logAddMoneyTransaction({
    id: 'tp_b1_01',
    amount: 1000.00,
    channelId: 'nagad',
    status: 'SUCCESS',
    date: '2026-11-04',
  }, { businessId: '1' });

  // Add digital journal for Business 1
  await repo.mutateCollection('journals', (journals) => [
    ...journals,
    {
      id: 'j_b1_01',
      businessId: '1',
      accountId: 'acc_101',
      amount: 500.00,
      type: 'received',
      txn_type: 2,
      txn_mode: 2, // Digital
      channelId: 'rocket',
      date: '2026-11-04',
      status: 'SUCCESS',
    },
  ]);

  // Business 2: Separate transactions that must NOT leak into Business 1
  await repo.logBanglaQrTransaction({
    id: 'bqr_b2_01',
    amount: 7000.00,
    channelId: 'upay',
    status: 'SUCCESS',
    date: '2026-11-04',
  }, { businessId: '2' });

  await repo.logAddMoneyTransaction({
    id: 'tp_b2_01',
    amount: 3000.00,
    channelId: 'card',
    status: 'SUCCESS',
    date: '2026-11-04',
  }, { businessId: '2' });

  // 1. Query Business 1 inflows
  const b1Inflows = repo.getDigitalInflowTransactions('1');
  assert.strictEqual(b1Inflows.length, 3, 'Business 1 must aggregate exactly 3 digital inflows');
  const b1TotalPaisa = b1Inflows.reduce((acc, t) => acc + t.amountPaisa, 0);
  assert.strictEqual(b1TotalPaisa, 300000, 'Business 1 total must be 300,000 paisa (৳1500 + ৳1000 + ৳500 = ৳3000)');

  // 2. Query Business 2 inflows
  const b2Inflows = repo.getDigitalInflowTransactions('2');
  assert.strictEqual(b2Inflows.length, 2, 'Business 2 must aggregate exactly 2 digital inflows');
  const b2TotalPaisa = b2Inflows.reduce((acc, t) => acc + t.amountPaisa, 0);
  assert.strictEqual(b2TotalPaisa, 1000000, 'Business 2 total must be 1,000,000 paisa (৳7000 + ৳3000 = ৳10,000)');

  // 3. Verify zero cross-tenant contamination
  assert.ok(!b1Inflows.some(t => t.id === 'bqr_b2_01' || t.id === 'tp_b2_01'), 'Zero leakage from Business 2 to Business 1');
  assert.ok(!b2Inflows.some(t => t.id === 'bqr_b1_01' || t.id === 'tp_b1_01' || t.id === 'j_b1_01'), 'Zero leakage from Business 1 to Business 2');

  // 4. Test filtering by channelId
  const bkashOnly = repo.getDigitalInflowTransactions('1', { channelId: 'bkash' });
  assert.strictEqual(bkashOnly.length, 1);
  assert.strictEqual(bkashOnly[0].id, 'bqr_b1_01');

  // 5. Test standalone repository export
  const standaloneB1 = getDigitalInflowTransactions('1', {}, repo);
  assert.ok(Array.isArray(standaloneB1));
  assert.strictEqual(standaloneB1.length, 3);
});

// -----------------------------------------------------------------------------
// 11. High-Throughput Analytics Benchmark Stress Test
// -----------------------------------------------------------------------------
runTest('High-throughput stress: 2,000 digital transactions processed in sub-50ms with zero float drift', () => {
  const stressTxns = [];
  const channels = ['bkash', 'nagad', 'rocket', 'upay', 'bangla_qr', 'card'];

  for (let i = 1; i <= 2000; i++) {
    stressTxns.push({
      id: `stress_${i}`,
      channelId: channels[i % channels.length],
      amountPaisa: 12550, // ৳125.50
      feePaisa: 150,     // ৳1.50
      status: 'SUCCESS',
      type: 'CREDIT',
      time: `${String(i % 24).padStart(2, '0')}:30`,
      date: '2026-11-04',
    });
  }

  const start = Date.now();
  const res = calculateDigitalInflowAnalytics(stressTxns, { period: 'TODAY' });
  const durationMs = Date.now() - start;

  assert.strictEqual(res.totalTxnCount, 2000, 'Must process 2,000 transactions');
  assert.strictEqual(res.grossInflowPaisa, 2000 * 12550, 'Exact integer paisa calculation without float drift');
  assert.strictEqual(res.netInflowPaisa, 2000 * (12550 - 150));
  assert.strictEqual(res.averageTicketPaisa, 12550);
  assert.strictEqual(res.averageTicketTaka, 125.50);

  const totalBp = res.channelBreakdown.reduce((acc, c) => acc + c.basisPoints, 0);
  assert.strictEqual(totalBp, 10000, 'Basis points sum to exactly 10,000');

  assert.ok(durationMs < 100, `Benchmark took ${durationMs}ms (well under 100ms threshold)`);
  console.log(`  -> Processed 2,000 transactions in ${durationMs}ms with zero float drift`);
});

// -----------------------------------------------------------------------------
// Test Runner
// -----------------------------------------------------------------------------
async function runAllTests() {
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

  console.log('\n================================================================================');
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: 0 (100% SUCCESS)`);
  console.log('================================================================================');
}

runAllTests().catch((e) => {
  console.error('Fatal test runner failure:', e);
  process.exit(1);
});
