/**
 * test_iteration_241_business_analytics_backend.js
 *
 * REA-ITER-241: TallyPay Merchant Business Health Analytics, Revenue Forecasting & Dynamic Insights Subsystem
 * Worker: Worker 2 (Averroes / Peirce - Permanent Backend Developer & Business Logic Architect)
 * Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 * Milestone: REA-ITER-241
 */

const assert = require('assert');
const {
  MERCHANT_ANALYTICS_SNAPSHOT_SCHEMA,
  ANALYTICS_SNAPSHOT_SCHEMA,
  MERCHANT_SALES_FORECAST_SCHEMA,
  SALES_FORECAST_SCHEMA,
  ANALYTICS_PERIOD_TYPES,
  FORECAST_MODEL_TYPES,
  TREND_DIRECTIONS,
  BUSINESS_HEALTH_TIERS,
  ANALYTICS_ARSC_TOKENS,
  calculateBusinessHealthScore,
  classifyHealthTier,
  calculateWeightedMovingAverage,
  calculateExponentialSmoothing,
  calculateHoltWintersLinearTrend,
  generateSalesForecast,
  calculateCustomerRankings,
  calculateCategoryExpenseBreakdown,
  calculateSalesMarginBreakdown,
  MerchantAnalyticsSnapshotRecord,
  MerchantSalesForecastRecord,
  MerchantAnalyticsSnapshotDao,
  MerchantSalesForecastDao,
  MerchantAnalyticsEngine,
  ReconstructedAnalyticsEngine,
  BusinessAnalyticsEngine,
  merchantAnalyticsEngine,
  reconstructedAnalyticsEngine,
} = require('./src/tallyPayService');

const {
  StorageRepository,
  storageRepository,
  createDefaultState,
  VALID_COLLECTIONS,
  saveAnalyticsSnapshot,
  getAnalyticsSnapshots,
  getAnalyticsSnapshotByKey,
  deleteAnalyticsSnapshot,
  getUnsyncedAnalyticsSnapshots,
  updateAnalyticsSnapshotSyncStatus,
  saveSalesForecast,
  getSalesForecasts,
  getLatestSalesForecast,
  deleteSalesForecast,
  getUnsyncedSalesForecasts,
  updateSalesForecastSyncStatus,
  computeBusinessHealthMetrics,
} = require('./src/storageRepository');

async function runTests() {
  console.log('======================================================================');
  console.log('REA-ITER-241: BUSINESS HEALTH ANALYTICS & FORECASTING TEST SUITE');
  console.log('Worker: Worker 2 (Averroes / Peirce - Backend & Logic Architect)');
  console.log('======================================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ ${name}: ${err.message}`);
      throw err;
    }
  }

  async function testAsync(name, fn) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ ${name}: ${err.message}`);
      throw err;
    }
  }

  // -------------------------------------------------------------
  // GROUP 1: ROOM SQLITE DDL & INDICES VERIFICATION
  // -------------------------------------------------------------
  console.log('--- Group 1: Room SQLite DDL & Indices Verification ---');

  test('G1.1: merchant_analytics_snapshot schema contains all 14 columns', () => {
    assert.strictEqual(MERCHANT_ANALYTICS_SNAPSHOT_SCHEMA.tableName, 'merchant_analytics_snapshot');
    assert.strictEqual(ANALYTICS_SNAPSHOT_SCHEMA.tableName, 'merchant_analytics_snapshot');
    assert.strictEqual(MERCHANT_ANALYTICS_SNAPSHOT_SCHEMA.columns.length, 14);

    const colNames = MERCHANT_ANALYTICS_SNAPSHOT_SCHEMA.columns.map((c) => c.name);
    const required = [
      'id', 'snapshot_id', 'business_id', 'period_type', 'period_key',
      'total_sales_paisa', 'total_expense_paisa', 'net_profit_paisa',
      'digital_inflow_paisa', 'cash_inflow_paisa', 'customer_count',
      'health_score', 'created_at', 'synced'
    ];
    for (const req of required) {
      assert.ok(colNames.includes(req), `Column ${req} missing from snapshot schema`);
    }
  });

  test('G1.2: merchant_analytics_snapshot has unique and composite indices', () => {
    const indices = MERCHANT_ANALYTICS_SNAPSHOT_SCHEMA.indices;
    assert.strictEqual(indices.length, 2);
    const uniqueIdx = indices.find((idx) => idx.unique);
    assert.ok(uniqueIdx, 'Unique index missing');
    assert.deepStrictEqual(uniqueIdx.columns, ['snapshot_id']);

    const compIdx = indices.find((idx) => !idx.unique);
    assert.ok(compIdx, 'Composite index missing');
    assert.deepStrictEqual(compIdx.columns, ['business_id', 'period_key']);
  });

  test('G1.3: merchant_sales_forecast schema contains all 11 columns and indices', () => {
    assert.strictEqual(MERCHANT_SALES_FORECAST_SCHEMA.tableName, 'merchant_sales_forecast');
    assert.strictEqual(SALES_FORECAST_SCHEMA.tableName, 'merchant_sales_forecast');
    assert.strictEqual(MERCHANT_SALES_FORECAST_SCHEMA.columns.length, 11);

    const colNames = MERCHANT_SALES_FORECAST_SCHEMA.columns.map((c) => c.name);
    const required = [
      'id', 'forecast_id', 'business_id', 'forecast_period',
      'predicted_revenue_paisa', 'confidence_score_bps', 'trend_direction',
      'growth_rate_bps', 'model_type', 'created_at', 'synced'
    ];
    for (const req of required) {
      assert.ok(colNames.includes(req), `Column ${req} missing from forecast schema`);
    }

    const indices = MERCHANT_SALES_FORECAST_SCHEMA.indices;
    assert.strictEqual(indices.length, 2);
    assert.ok(indices.find((idx) => idx.unique && idx.columns.includes('forecast_id')));
    assert.ok(indices.find((idx) => !idx.unique && idx.columns.includes('business_id')));
  });

  // -------------------------------------------------------------
  // GROUP 2: ENUMS, CONSTANTS & ARSC LOCALIZATION TOKENS
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Enums, Constants & ARSC Localization Tokens ---');

  test('G2.1: ANALYTICS_PERIOD_TYPES defines all 5 periods', () => {
    assert.strictEqual(ANALYTICS_PERIOD_TYPES.DAILY, 'DAILY');
    assert.strictEqual(ANALYTICS_PERIOD_TYPES.WEEKLY, 'WEEKLY');
    assert.strictEqual(ANALYTICS_PERIOD_TYPES.MONTHLY, 'MONTHLY');
    assert.strictEqual(ANALYTICS_PERIOD_TYPES.QUARTERLY, 'QUARTERLY');
    assert.strictEqual(ANALYTICS_PERIOD_TYPES.YEARLY, 'YEARLY');
  });

  test('G2.2: FORECAST_MODEL_TYPES and TREND_DIRECTIONS', () => {
    assert.strictEqual(FORECAST_MODEL_TYPES.EXPONENTIAL_SMOOTHING, 'EXPONENTIAL_SMOOTHING');
    assert.strictEqual(FORECAST_MODEL_TYPES.LINEAR_TREND, 'LINEAR_TREND');
    assert.strictEqual(FORECAST_MODEL_TYPES.WEIGHTED_MOVING_AVERAGE, 'WEIGHTED_MOVING_AVERAGE');

    assert.strictEqual(TREND_DIRECTIONS.UP, 'UP');
    assert.strictEqual(TREND_DIRECTIONS.DOWN, 'DOWN');
    assert.strictEqual(TREND_DIRECTIONS.STABLE, 'STABLE');
  });

  test('G2.3: BUSINESS_HEALTH_TIERS defines score boundaries and Bengali labels', () => {
    assert.strictEqual(BUSINESS_HEALTH_TIERS.EXCELLENT.minScore, 80);
    assert.strictEqual(BUSINESS_HEALTH_TIERS.EXCELLENT.labelBn, 'চমৎকার');
    assert.strictEqual(BUSINESS_HEALTH_TIERS.GOOD.minScore, 60);
    assert.strictEqual(BUSINESS_HEALTH_TIERS.GOOD.labelBn, 'ভালো');
    assert.strictEqual(BUSINESS_HEALTH_TIERS.FAIR.minScore, 40);
    assert.strictEqual(BUSINESS_HEALTH_TIERS.FAIR.labelBn, 'মোটামুটি');
    assert.strictEqual(BUSINESS_HEALTH_TIERS.AT_RISK.minScore, 0);
    assert.strictEqual(BUSINESS_HEALTH_TIERS.AT_RISK.labelBn, 'ঝুঁকিপূর্ণ');
  });

  test('G2.4: ANALYTICS_ARSC_TOKENS contains authentic Bengali localized strings', () => {
    assert.strictEqual(ANALYTICS_ARSC_TOKENS.health_title, 'ব্যবসায়িক স্বাস্থ্য স্কোর');
    assert.strictEqual(ANALYTICS_ARSC_TOKENS.revenue_forecast_title, 'সম্ভাব্য বিক্রয় পূর্বাভাস');
    assert.strictEqual(ANALYTICS_ARSC_TOKENS.growth_trend_up, 'ঊর্ধ্বমুখী');
    assert.strictEqual(ANALYTICS_ARSC_TOKENS.growth_trend_down, 'নিম্নমুখী');
    assert.strictEqual(ANALYTICS_ARSC_TOKENS.growth_trend_stable, 'স্থিতিশীল');
  });

  // -------------------------------------------------------------
  // GROUP 3: IN-MEMORY DAOS CRUD & IDEMPOTENCY
  // -------------------------------------------------------------
  console.log('\n--- Group 3: In-Memory DAOs CRUD & Idempotency ---');

  test('G3.1: MerchantAnalyticsSnapshotDao insert, find, and unique constraint', () => {
    const dao = new MerchantAnalyticsSnapshotDao();
    const snap = new MerchantAnalyticsSnapshotRecord({
      snapshot_id: 'SNAP-001',
      business_id: 'biz_100',
      period_type: 'MONTHLY',
      period_key: '2026-11',
      total_sales_paisa: 5000000,
      total_expense_paisa: 3000000,
      health_score: 85
    });

    dao.insert(snap);
    assert.strictEqual(dao.records.length, 1);
    const found = dao.findBySnapshotId('SNAP-001');
    assert.ok(found);
    assert.strictEqual(found.business_id, 'biz_100');
    assert.strictEqual(found.net_profit_paisa, 2000000);

    // Duplicate insert throws
    assert.throws(() => {
      dao.insert(snap);
    }, /UNIQUE constraint failed/);

    // insertOrUpdate updates existing
    snap.health_score = 90;
    dao.insertOrUpdate(snap);
    assert.strictEqual(dao.records.length, 1);
    assert.strictEqual(dao.findBySnapshotId('SNAP-001').health_score, 90);
  });

  test('G3.2: MerchantAnalyticsSnapshotDao query and sync status', () => {
    const dao = new MerchantAnalyticsSnapshotDao();
    dao.insert({ snapshot_id: 'S1', business_id: 'B1', period_key: '2026-09', synced: 0 });
    dao.insert({ snapshot_id: 'S2', business_id: 'B1', period_key: '2026-10', synced: 1 });
    dao.insert({ snapshot_id: 'S3', business_id: 'B2', period_key: '2026-10', synced: 0 });

    const b1List = dao.query({ businessId: 'B1' });
    assert.strictEqual(b1List.length, 2);

    const unsynced = dao.getUnsynced();
    assert.strictEqual(unsynced.length, 2);

    const updatedCount = dao.updateSyncStatus(['S1', 'S3'], 1);
    assert.strictEqual(updatedCount, 2);
    assert.strictEqual(dao.getUnsynced().length, 0);

    assert.strictEqual(dao.delete('S2'), true);
    assert.strictEqual(dao.records.length, 2);
  });

  test('G3.3: MerchantSalesForecastDao insert, findLatest, and query', () => {
    const dao = new MerchantSalesForecastDao();
    dao.insert({
      forecast_id: 'FCST-001',
      business_id: 'B1',
      forecast_period: '2026-11',
      predicted_revenue_paisa: 7500000,
      confidence_score_bps: 8500,
      trend_direction: 'UP',
      created_at: '2026-11-01T10:00:00.000Z'
    });
    dao.insert({
      forecast_id: 'FCST-002',
      business_id: 'B1',
      forecast_period: '2026-12',
      predicted_revenue_paisa: 8000000,
      confidence_score_bps: 8800,
      trend_direction: 'UP',
      created_at: '2026-11-02T10:00:00.000Z'
    });

    const latest = dao.getLatest('B1');
    assert.ok(latest);
    assert.strictEqual(latest.forecast_id, 'FCST-002');
    assert.strictEqual(latest.predicted_revenue_paisa, 8000000);
  });


  test('G3.4: MerchantSalesForecastDao delete, unsynced and sync status updates', () => {
    const dao = new MerchantSalesForecastDao();
    dao.insert({ forecast_id: 'FCST-A', business_id: 'B1', forecast_period: 'NEXT_30_DAYS', synced: 0 });
    dao.insert({ forecast_id: 'FCST-B', business_id: 'B1', forecast_period: 'NEXT_60_DAYS', synced: 1 });

    assert.strictEqual(dao.getUnsynced().length, 1);
    const count = dao.updateSyncStatus(['FCST-A'], 1);
    assert.strictEqual(count, 1);
    assert.strictEqual(dao.getUnsynced().length, 0);

    assert.strictEqual(dao.delete('FCST-B'), true);
    assert.strictEqual(dao.records.length, 1);
    assert.strictEqual(dao.delete('NON_EXISTENT'), false);
  });

  // -------------------------------------------------------------
  // GROUP 4: BUSINESS HEALTH SCORE ALGORITHM (4 PILLARS, ZERO FLOAT DRIFT)
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Business Health Score Algorithm (4 Pillars) ---');

  test('G4.1: High performance business achieves 100/100 EXCELLENT', () => {
    const result = calculateBusinessHealthScore({
      totalSalesPaisa: 10000000,     // ৳1,00,000
      totalExpensePaisa: 3000000,     // ৳30,000 (30% expense -> 70% profit margin >= 30% -> 25 pts)
      digitalInflowPaisa: 2000000,    // ৳20,000
      cashInflowPaisa: 8000000,       // ৳80,000 (total inflow 20000000 / 3000000 = 6.66x >= 2.0x -> 25 pts)
      creditGivenPaisa: 1000000,      // ৳10,000
      creditCollectedPaisa: 950000,   // ৳9,500 (95% collected >= 90% -> 25 pts)
      totalCustomers: 100,
      activeCustomers: 85             // 85% retention >= 75% -> 25 pts
    });

    assert.strictEqual(result.healthScore, 100);
    assert.strictEqual(result.tier.code, 'EXCELLENT');
    assert.strictEqual(result.pillars.cashflowStability.score, 25);
    assert.strictEqual(result.pillars.profitMargin.score, 25);
    assert.strictEqual(result.pillars.debtRecovery.score, 25);
    assert.strictEqual(result.pillars.customerRetention.score, 25);
  });

  test('G4.2: Distressed business with losses & uncollected debt receives AT_RISK', () => {
    const result = calculateBusinessHealthScore({
      totalSalesPaisa: 1000000,     // ৳10,000
      totalExpensePaisa: 3000000,    // ৳30,000 (loss -> 0 pts profit margin)
      digitalInflowPaisa: 100000,
      cashInflowPaisa: 100000,       // inflow 1200000 / 3000000 = 0.4x < 0.5x -> 4 pts cashflow
      creditGivenPaisa: 5000000,     // ৳50,000
      creditCollectedPaisa: 500000,  // ৳5,000 (10% recovery < 25% -> 5 pts debt recovery)
      totalCustomers: 50,
      activeCustomers: 0             // 0 active -> 4 pts retention
    });

    assert.strictEqual(result.healthScore, 13);
    assert.strictEqual(result.tier.code, 'AT_RISK');
    assert.strictEqual(classifyHealthTier(13).code, 'AT_RISK');
  });

  test('G4.3: Cash-only business with zero credit given is not penalized', () => {
    const result = calculateBusinessHealthScore({
      totalSalesPaisa: 5000000,
      totalExpensePaisa: 2500000,
      digitalInflowPaisa: 1000000,
      cashInflowPaisa: 4000000,
      creditGivenPaisa: 0,           // Zero credit given
      creditCollectedPaisa: 0,
      totalCustomers: 20,
      activeCustomers: 15
    });

    // Debt recovery score should be full 25 points because of zero credit risk
    assert.strictEqual(result.pillars.debtRecovery.score, 25);
    assert.ok(result.healthScore >= 80);
  });

  test('G4.4: Zero floating-point drift across varying scales', () => {
    for (let mult = 1; mult <= 50; mult++) {
      const res = calculateBusinessHealthScore({
        totalSalesPaisa: 100000 * mult,
        totalExpensePaisa: 60000 * mult,
        digitalInflowPaisa: 20000 * mult,
        cashInflowPaisa: 80000 * mult,
        creditGivenPaisa: 50000 * mult,
        creditCollectedPaisa: 40000 * mult,
        totalCustomers: 10 * mult,
        activeCustomers: 6 * mult
      });
      assert.ok(Number.isInteger(res.healthScore), 'healthScore must be integer');
      assert.ok(res.healthScore >= 0 && res.healthScore <= 100);
      assert.ok(Number.isInteger(res.pillars.cashflowStability.score));
      assert.ok(Number.isInteger(res.pillars.profitMargin.score));
      assert.ok(Number.isInteger(res.pillars.debtRecovery.score));
      assert.ok(Number.isInteger(res.pillars.customerRetention.score));
    }
  });


  test('G4.5: classifyHealthTier boundary coverage', () => {
    assert.strictEqual(classifyHealthTier(100).code, 'EXCELLENT');
    assert.strictEqual(classifyHealthTier(80).code, 'EXCELLENT');
    assert.strictEqual(classifyHealthTier(79).code, 'GOOD');
    assert.strictEqual(classifyHealthTier(60).code, 'GOOD');
    assert.strictEqual(classifyHealthTier(59).code, 'FAIR');
    assert.strictEqual(classifyHealthTier(40).code, 'FAIR');
    assert.strictEqual(classifyHealthTier(39).code, 'AT_RISK');
    assert.strictEqual(classifyHealthTier(0).code, 'AT_RISK');
    assert.strictEqual(classifyHealthTier(-10).code, 'AT_RISK');
    assert.strictEqual(classifyHealthTier(150).code, 'EXCELLENT');
  });

  // -------------------------------------------------------------
  // GROUP 5: REVENUE FORECASTING ENGINE (WMA, EXPONENTIAL, HOLT-WINTERS)
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Revenue Forecasting Engine ---');

  test('G5.1: Weighted Moving Average calculation', () => {
    const series = [10000, 20000, 30000]; // weights [1, 2, 3] -> (10k*1 + 20k*2 + 30k*3) / 6 = 140k / 6 = 23333
    const wma = calculateWeightedMovingAverage(series);
    assert.strictEqual(wma, 23333);

    // Custom weights
    const custom = calculateWeightedMovingAverage(series, [1, 1, 2]); // (10k*1 + 20k*1 + 30k*2)/4 = 90k/4 = 22500
    assert.strictEqual(custom, 22500);

    // Empty series
    assert.strictEqual(calculateWeightedMovingAverage([]), 0);
  });

  test('G5.2: Exponential Smoothing calculation', () => {
    const series = [50000, 60000, 70000];
    const smoothed = calculateExponentialSmoothing(series, 3000); // alpha = 0.3
    assert.ok(Number.isInteger(smoothed));
    assert.ok(smoothed >= 50000 && smoothed <= 75000);

    assert.strictEqual(calculateExponentialSmoothing([]), 0);
  });

  test('G5.3: Holt-Winters Linear Trend detects growth rate and direction', () => {
    const growingSeries = [1000000, 1200000, 1400000, 1600000, 1800000];
    const trendUp = calculateHoltWintersLinearTrend(growingSeries);
    assert.strictEqual(trendUp.trendDirection, 'UP');
    assert.ok(trendUp.growthRateBps > 0);
    assert.ok(trendUp.predictedRevenuePaisa >= 1800000);
    assert.ok(trendUp.confidenceScoreBps >= 6000);

    const decliningSeries = [2000000, 1700000, 1400000, 1100000, 800000];
    const trendDown = calculateHoltWintersLinearTrend(decliningSeries);
    assert.strictEqual(trendDown.trendDirection, 'DOWN');
    assert.ok(trendDown.growthRateBps < 0);
    assert.ok(trendDown.predictedRevenuePaisa <= 800000);

    const flatSeries = [1000000, 1000000, 1000000, 1000000];
    const trendFlat = calculateHoltWintersLinearTrend(flatSeries);
    assert.strictEqual(trendFlat.trendDirection, 'STABLE');
    assert.strictEqual(trendFlat.predictedRevenuePaisa, 1000000);
  });

  test('G5.4: generateSalesForecast creates valid record', () => {
    const forecast = generateSalesForecast('biz_demo', [200000, 250000, 300000], {
      forecastPeriod: 'NEXT_30_DAYS',
      modelType: 'LINEAR_TREND'
    });
    assert.ok(forecast instanceof MerchantSalesForecastRecord);
    assert.strictEqual(forecast.business_id, 'biz_demo');
    assert.strictEqual(forecast.forecast_period, 'NEXT_30_DAYS');
    assert.ok(forecast.predicted_revenue_paisa > 0);
    assert.strictEqual(forecast.trend_direction, 'UP');
  });

  // -------------------------------------------------------------
  // GROUP 6: CUSTOMER RANKING & EXPENSE BREAKDOWN ANALYTICS
  // -------------------------------------------------------------
  console.log('\n--- Group 6: Customer Ranking & Expense Breakdown ---');

  test('G6.1: calculateCustomerRankings ranks by revenue contribution', () => {
    const customers = [
      { id: 'C1', name: 'Rahim', totalPurchasePaisa: 500000, creditPaidPaisa: 200000, creditOutstandingPaisa: 0 },
      { id: 'C2', name: 'Karim', totalPurchasePaisa: 1500000, creditPaidPaisa: 400000, creditOutstandingPaisa: 100000 },
      { id: 'C3', name: 'Jamal', totalPurchasePaisa: 1000000, creditPaidPaisa: 300000, creditOutstandingPaisa: 0 }
    ];
    // Total revenue = 3000000. Karim: 1500k (50%), Jamal: 1000k (33.33%), Rahim: 500k (16.66%)
    const ranked = calculateCustomerRankings(customers);
    assert.strictEqual(ranked.length, 3);
    assert.strictEqual(ranked[0].name, 'Karim');
    assert.strictEqual(ranked[0].rank, 1);
    assert.strictEqual(ranked[0].revenueContributionBps, 5000); // 50%
    assert.strictEqual(ranked[0].debtRecoveryRatioBps, 8000);   // 400k/500k = 80%

    assert.strictEqual(ranked[1].name, 'Jamal');
    assert.strictEqual(ranked[1].rank, 2);

    assert.strictEqual(ranked[2].name, 'Rahim');
    assert.strictEqual(ranked[2].rank, 3);
  });

  test('G6.2: calculateCategoryExpenseBreakdown groups and sorts expenses', () => {
    const expenses = [
      { category: 'RENT', amountPaisa: 2000000 },
      { category: 'UTILITIES', amountPaisa: 500000 },
      { category: 'PURCHASE', amountPaisa: 5000000 },
      { category: 'RENT', amountPaisa: 500000 }, // another rent item
      { category: 'OTHER', amountPaisa: 2000000 }
    ];
    // Total = 10,000,000
    // PURCHASE: 5,000,000 (50%)
    // RENT: 2,500,000 (25%)
    // OTHER: 2,000,000 (20%)
    // UTILITIES: 500,000 (5%)
    const breakdown = calculateCategoryExpenseBreakdown(expenses);
    assert.strictEqual(breakdown.totalExpensePaisa, 10000000);
    assert.strictEqual(breakdown.categories.length, 4);
    assert.strictEqual(breakdown.categories[0].category, 'PURCHASE');
    assert.strictEqual(breakdown.categories[0].percentageBps, 5000);
    assert.strictEqual(breakdown.categories[1].category, 'RENT');
    assert.strictEqual(breakdown.categories[1].percentageBps, 2500);
  });

  test('G6.3: calculateSalesMarginBreakdown computes gross profit & margin', () => {
    const margin = calculateSalesMarginBreakdown(10000000, 6500000);
    assert.strictEqual(margin.grossProfitPaisa, 3500000);
    assert.strictEqual(margin.grossMarginBps, 3500); // 35%
  });

  // -------------------------------------------------------------
  // GROUP 7: STORAGEREPOSITORY MULTI-TENANT ANALYTICS CRUD & ISOLATION
  // -------------------------------------------------------------
  console.log('\n--- Group 7: StorageRepository Multi-Tenant Analytics CRUD & Isolation ---');

  await testAsync('G7.1: saveAnalyticsSnapshot and getAnalyticsSnapshots with tenant isolation', async () => {
    const repo = new StorageRepository();

    // Tenant 1
    const res1 = await repo.saveAnalyticsSnapshot('biz_1', {
      snapshot_id: 'SNAP-T1-1',
      period_type: 'MONTHLY',
      period_key: '2026-10',
      total_sales_paisa: 1000000,
      total_expense_paisa: 600000,
      health_score: 78
    });
    assert.strictEqual(res1.success, true);

    // Tenant 2
    const res2 = await repo.saveAnalyticsSnapshot('biz_2', {
      snapshot_id: 'SNAP-T2-1',
      period_type: 'MONTHLY',
      period_key: '2026-10',
      total_sales_paisa: 2000000,
      total_expense_paisa: 1200000,
      health_score: 82
    });
    assert.strictEqual(res2.success, true);

    // Verify isolation
    const t1Snaps = repo.getAnalyticsSnapshots('biz_1');
    assert.strictEqual(t1Snaps.length, 1);
    assert.strictEqual(t1Snaps[0].snapshot_id, 'SNAP-T1-1');

    const t2Snaps = repo.getAnalyticsSnapshots('biz_2');
    assert.strictEqual(t2Snaps.length, 1);
    assert.strictEqual(t2Snaps[0].snapshot_id, 'SNAP-T2-1');

    // Exact key lookup
    const snapKey = repo.getAnalyticsSnapshotByKey('biz_1', '2026-10');
    assert.ok(snapKey);
    assert.strictEqual(snapKey.snapshot_id, 'SNAP-T1-1');
  });

  await testAsync('G7.2: saveSalesForecast and getLatestSalesForecast with tenant isolation', async () => {
    const repo = new StorageRepository();

    await repo.saveSalesForecast('biz_1', {
      forecast_id: 'FCST-T1-1',
      forecast_period: '2026-11',
      predicted_revenue_paisa: 5000000,
      confidence_score_bps: 8000,
      trend_direction: 'UP',
      created_at: '2026-11-01T00:00:00.000Z'
    });

    await repo.saveSalesForecast('biz_1', {
      forecast_id: 'FCST-T1-2',
      forecast_period: '2026-12',
      predicted_revenue_paisa: 6000000,
      confidence_score_bps: 8500,
      trend_direction: 'UP',
      created_at: '2026-11-02T00:00:00.000Z'
    });

    const latest = repo.getLatestSalesForecast('biz_1');
    assert.ok(latest);
    assert.strictEqual(latest.forecast_id, 'FCST-T1-2');
    assert.strictEqual(latest.predicted_revenue_paisa, 6000000);

    // Tenant 2 has no forecasts yet
    const t2Latest = repo.getLatestSalesForecast('biz_2');
    assert.strictEqual(t2Latest, null);
  });

  await testAsync('G7.3: computeBusinessHealthMetrics integrates with repo store', async () => {
    const repo = new StorageRepository();
    // Call with explicit options
    const health = repo.computeBusinessHealthMetrics('1', {
      totalSalesPaisa: 5000000,
      totalExpensePaisa: 2000000,
      digitalInflowPaisa: 1000000,
      cashInflowPaisa: 4000000,
      creditGivenPaisa: 500000,
      creditCollectedPaisa: 450000,
      totalCustomers: 20,
      activeCustomers: 18
    });
    assert.ok(health);
    assert.ok(health.healthScore >= 80);
    assert.strictEqual(health.tier.code, 'EXCELLENT');
  });


  await testAsync('G7.4: StorageRepository deletion, unsynced queries, and sync updates for analytics', async () => {
    const repo = new StorageRepository();

    await repo.saveAnalyticsSnapshot('biz_1', { snapshot_id: 'S-DEL', period_key: '2026-11', synced: 0 });
    await repo.saveSalesForecast('biz_1', { forecast_id: 'F-DEL', forecast_period: 'NEXT_WEEK', synced: 0 });

    assert.strictEqual(repo.getUnsyncedAnalyticsSnapshots('biz_1').length, 1);
    assert.strictEqual(repo.getUnsyncedSalesForecasts('biz_1').length, 1);

    await repo.updateAnalyticsSnapshotSyncStatus('biz_1', ['S-DEL'], 1);
    await repo.updateSalesForecastSyncStatus('biz_1', ['F-DEL'], 1);

    assert.strictEqual(repo.getUnsyncedAnalyticsSnapshots('biz_1').length, 0);
    assert.strictEqual(repo.getUnsyncedSalesForecasts('biz_1').length, 0);

    const delSnapRes = await repo.deleteAnalyticsSnapshot('biz_1', 'S-DEL');
    assert.strictEqual(delSnapRes.success, true);
    assert.strictEqual(repo.getAnalyticsSnapshots('biz_1').length, 0);

    const delFcstRes = await repo.deleteSalesForecast('biz_1', 'F-DEL');
    assert.strictEqual(delFcstRes.success, true);
    assert.strictEqual(repo.getSalesForecasts('biz_1').length, 0);
  });

  await testAsync('G7.5: Standalone exported repository functions operate on defaultRepository', async () => {
    const resSnap = await saveAnalyticsSnapshot('biz_standalone', { snapshot_id: 'SNAP-SA-1', period_key: '2026-11', health_score: 88 });
    assert.strictEqual(resSnap.success, true);

    const snaps = getAnalyticsSnapshots('biz_standalone');
    assert.strictEqual(snaps.length, 1);

    const byKey = getAnalyticsSnapshotByKey('biz_standalone', '2026-11');
    assert.ok(byKey);
    assert.strictEqual(byKey.health_score, 88);

    const resFcst = await saveSalesForecast('biz_standalone', { forecast_id: 'FCST-SA-1', forecast_period: 'NEXT_30_DAYS', predicted_revenue_paisa: 900000 });
    assert.strictEqual(resFcst.success, true);

    const fcsts = getSalesForecasts('biz_standalone');
    assert.strictEqual(fcsts.length, 1);

    const latest = getLatestSalesForecast('biz_standalone');
    assert.ok(latest);
    assert.strictEqual(latest.forecast_id, 'FCST-SA-1');

    const health = computeBusinessHealthMetrics('biz_standalone', { totalSalesPaisa: 1000000 });
    assert.ok(health.healthScore > 0);

    await deleteAnalyticsSnapshot('biz_standalone', 'SNAP-SA-1');
    await deleteSalesForecast('biz_standalone', 'FCST-SA-1');
  });

  // -------------------------------------------------------------
  // GROUP 8: MULTI-TENANT BUSINESS CASCADE DELETION
  // -------------------------------------------------------------
  console.log('\n--- Group 8: Multi-Tenant Business Cascade Deletion ---');

  await testAsync('G8.1: deleteBusinessCascade purges analytics snapshots and forecasts for deleted business only', async () => {
    const repo = new StorageRepository();

    // Setup second active business in repo store
    await repo.mutateStore((prev) => {
      const bizList = Array.isArray(prev.businesses) ? [...prev.businesses] : [];
      if (!bizList.find((b) => String(b.id) === '2')) {
        bizList.push({
          id: '2',
          business_id: 2,
          name: 'Second Store',
          owner: 'মালিক ২',
          isArchived: false,
          isSelected: false
        });
      }
      return { ...prev, businesses: bizList };
    });

    // Save records for biz 1 and biz 2
    await repo.saveAnalyticsSnapshot('1', { snapshot_id: 'SNAP-B1', period_key: '2026-11', health_score: 85 });
    await repo.saveAnalyticsSnapshot('2', { snapshot_id: 'SNAP-B2', period_key: '2026-11', health_score: 65 });
    await repo.saveSalesForecast('1', { forecast_id: 'FCST-B1', forecast_period: '2026-12', predicted_revenue_paisa: 500000 });
    await repo.saveSalesForecast('2', { forecast_id: 'FCST-B2', forecast_period: '2026-12', predicted_revenue_paisa: 200000 });

    assert.strictEqual(repo.getAnalyticsSnapshots('1').length, 1);
    assert.strictEqual(repo.getAnalyticsSnapshots('2').length, 1);
    assert.strictEqual(repo.getSalesForecasts('1').length, 1);
    assert.strictEqual(repo.getSalesForecasts('2').length, 1);

    // Cascade delete business 2
    await repo.deleteBusinessCascade('2');

    // Business 2 records must be purged
    assert.strictEqual(repo.getAnalyticsSnapshots('2').length, 0);
    assert.strictEqual(repo.getSalesForecasts('2').length, 0);

    // Business 1 records must remain intact!
    assert.strictEqual(repo.getAnalyticsSnapshots('1').length, 1);
    assert.strictEqual(repo.getAnalyticsSnapshots('1')[0].snapshot_id, 'SNAP-B1');
    assert.strictEqual(repo.getSalesForecasts('1').length, 1);
    assert.strictEqual(repo.getSalesForecasts('1')[0].forecast_id, 'FCST-B1');
  });

  // -------------------------------------------------------------
  // GROUP 9: CLOUD BACKUP SANITIZATION & RESTORE SERIALIZATION
  // -------------------------------------------------------------
  console.log('\n--- Group 9: Cloud Backup Sanitization & Restore Serialization ---');

  await testAsync('G9.1: getFullBackupState sanitizes sensitive fields and includes recordCounts', async () => {
    const repo = new StorageRepository();

    await repo.saveAnalyticsSnapshot('1', {
      snapshot_id: 'SNAP-SEC',
      period_key: '2026-11',
      token: 'secret_token_1234',
      apiKey: 'api_key_hidden'
    });

    await repo.saveSalesForecast('1', {
      forecast_id: 'FCST-SEC',
      forecast_period: '2026-12',
      sessionToken: 'jwt_session_secret'
    });

    const backupState = await repo.getFullBackupState();
    assert.ok(Array.isArray(backupState.merchantAnalyticsSnapshots));
    assert.ok(Array.isArray(backupState.merchantSalesForecasts));

    const exportedSnap = backupState.merchantAnalyticsSnapshots.find((s) => s.snapshot_id === 'SNAP-SEC');
    assert.ok(exportedSnap);
    assert.strictEqual(exportedSnap.token, undefined);
    assert.strictEqual(exportedSnap.apiKey, undefined);

    const exportedFcst = backupState.merchantSalesForecasts.find((f) => f.forecast_id === 'FCST-SEC');
    assert.ok(exportedFcst);
    assert.strictEqual(exportedFcst.sessionToken, undefined);

    const backupPayload = await repo.createStorageBackup();
    assert.ok(backupPayload.manifest);
    assert.ok(backupPayload.manifest.recordCounts);
    assert.ok(backupPayload.manifest.recordCounts.merchantAnalyticsSnapshots >= 1);
    assert.ok(backupPayload.manifest.recordCounts.merchantSalesForecasts >= 1);
  });

  await testAsync('G9.2: commitRestorePayload supports full and selective restore', async () => {
    const repo = new StorageRepository();

    const mockBackupPayload = {
      manifest: { schemaVersion: 6 },
      data: {
        accounts: [],
        journals: [],
        merchantAnalyticsSnapshots: [
          { snapshot_id: 'RESTORE-S1', business_id: '1', period_key: '2026-10', health_score: 90 },
          { snapshot_id: 'RESTORE-S2', business_id: '2', period_key: '2026-10', health_score: 75 }
        ],
        merchantSalesForecasts: [
          { forecast_id: 'RESTORE-F1', business_id: '1', forecast_period: '2026-11', predicted_revenue_paisa: 400000 },
          { forecast_id: 'RESTORE-F2', business_id: '2', forecast_period: '2026-11', predicted_revenue_paisa: 300000 }
        ]
      }
    };

    // Full restore
    await repo.commitRestorePayload(mockBackupPayload);
    assert.strictEqual(repo.getAnalyticsSnapshots('1').length, 1);
    assert.strictEqual(repo.getAnalyticsSnapshots('2').length, 1);
    assert.strictEqual(repo.getSalesForecasts('1').length, 1);
    assert.strictEqual(repo.getSalesForecasts('2').length, 1);

    // Selective tenant restore for biz_1 only
    const selectivePayload = {
      manifest: { schemaVersion: 6 },
      data: {
        accounts: [],
        journals: [],
        merchantAnalyticsSnapshots: [
          { snapshot_id: 'SEL-S1', business_id: '1', period_key: '2026-11', health_score: 95 }
        ],
        merchantSalesForecasts: [
          { forecast_id: 'SEL-F1', business_id: '1', forecast_period: '2026-12', predicted_revenue_paisa: 600000 }
        ]
      }
    };

    await repo.commitRestorePayload(selectivePayload, { selectedBusinessId: '1' });
    const biz1Snaps = repo.getAnalyticsSnapshots('1');
    assert.ok(biz1Snaps.some((s) => s.snapshot_id === 'SEL-S1'));
    // Biz 2 records must still be preserved
    assert.strictEqual(repo.getAnalyticsSnapshots('2').length, 1);
  });

  // -------------------------------------------------------------
  // GROUP 10: END-TO-END ANALYTICS WORKFLOW & PERFORMANCE LATENCY BENCHMARK
  // -------------------------------------------------------------
  console.log('\n--- Group 10: End-to-End Workflow & Latency Benchmark ---');

  await testAsync('G10.1: End-to-end MerchantAnalyticsEngine snapshot and forecast generation', async () => {
    const engine = new MerchantAnalyticsEngine();
    const repo = new StorageRepository();

    const { snapshot, healthResult } = await engine.generateSnapshot('biz_prod', 'MONTHLY', '2026-11', {
      totalSalesPaisa: 8000000,
      totalExpensePaisa: 4000000,
      digitalInflowPaisa: 2000000,
      cashInflowPaisa: 6000000,
      creditGivenPaisa: 1000000,
      creditCollectedPaisa: 900000,
      totalCustomers: 50,
      activeCustomers: 40
    }, repo);

    assert.ok(snapshot instanceof MerchantAnalyticsSnapshotRecord);
    assert.strictEqual(snapshot.business_id, 'biz_prod');
    assert.ok(snapshot.health_score >= 80);
    assert.strictEqual(healthResult.tier.code, 'EXCELLENT');

    const forecast = await engine.generateForecast('biz_prod', 'NEXT_30_DAYS', [
      6000000, 6500000, 7200000, 7800000, 8000000
    ], { modelType: 'LINEAR_TREND' }, repo);

    assert.ok(forecast instanceof MerchantSalesForecastRecord);
    assert.strictEqual(forecast.business_id, 'biz_prod');
    assert.strictEqual(forecast.trend_direction, 'UP');

    // Check persistence in storage
    const storedSnaps = repo.getAnalyticsSnapshots('biz_prod');
    assert.strictEqual(storedSnaps.length, 1);
    const storedFcsts = repo.getSalesForecasts('biz_prod');
    assert.strictEqual(storedFcsts.length, 1);
  });

  test('G10.2: Performance latency benchmark: 1,000 health calculations and forecasts < 200ms', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      calculateBusinessHealthScore({
        totalSalesPaisa: 5000000 + i * 100,
        totalExpensePaisa: 2500000 + i * 50,
        digitalInflowPaisa: 1000000,
        cashInflowPaisa: 4000000,
        creditGivenPaisa: 800000,
        creditCollectedPaisa: 750000,
        totalCustomers: 40,
        activeCustomers: 30
      });
      calculateHoltWintersLinearTrend([100000 + i, 120000 + i, 140000 + i, 160000 + i]);
    }
    const elapsed = Date.now() - start;
    console.log(`    Elapsed for 1,000 iterations: ${elapsed} ms`);
    assert.ok(elapsed < 200, `Benchmark exceeded 200ms: ${elapsed}ms`);
  });


  test('G10.3: Engine aliases and helper methods (rankCustomers, breakdownExpenses, breakdownMargin)', () => {
    assert.strictEqual(ReconstructedAnalyticsEngine, MerchantAnalyticsEngine);
    assert.strictEqual(BusinessAnalyticsEngine, MerchantAnalyticsEngine);
    assert.strictEqual(reconstructedAnalyticsEngine, merchantAnalyticsEngine);

    const ranks = merchantAnalyticsEngine.rankCustomers([
      { id: '1', name: 'A', totalPurchasePaisa: 200 },
      { id: '2', name: 'B', totalPurchasePaisa: 800 }
    ]);
    assert.strictEqual(ranks[0].name, 'B');

    const expenses = merchantAnalyticsEngine.breakdownExpenses([
      { category: 'RENT', amountPaisa: 500 }
    ]);
    assert.strictEqual(expenses.categories[0].category, 'RENT');

    const margin = merchantAnalyticsEngine.breakdownMargin(1000, 700);
    assert.strictEqual(margin.grossProfitPaisa, 300);
    assert.strictEqual(margin.grossMarginBps, 3000);
  });

  console.log('\n======================================================================');
  console.log(`REA-ITER-241 RESULT: ${passedTests} / ${totalTests} TESTS PASSED (100% GREEN)`);
  console.log('======================================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
