/**
 * src/analyticsSubsystem.js
 *
 * Clean-Room TallyPay Merchant Business Health Analytics, Revenue Forecasting & Dynamic Insights Subsystem
 * Room SQLite Tables: merchant_analytics_snapshot, merchant_sales_forecast
 *
 * Milestone: REA-ITER-241
 * Target Reference: REF-001 (TallyKhata-Demo.apk, SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9)
 */

let _cachedIsoSec = 0;
let _cachedIsoStr = '';
function getFastIsoString() {
  const now = Date.now();
  const sec = Math.floor(now / 1000);
  if (sec !== _cachedIsoSec) {
    _cachedIsoSec = sec;
    _cachedIsoStr = new Date(now).toISOString();
  }
  return _cachedIsoStr;
}

// -------------------------------------------------------------
// 1. ROOM SQLITE SCHEMAS & DDL DEFINITIONS
// -------------------------------------------------------------

const MERCHANT_ANALYTICS_SNAPSHOT_SCHEMA = {
  tableName: 'merchant_analytics_snapshot',
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoincrement: true, notNull: true },
    { name: 'snapshot_id', type: 'TEXT', notNull: true, unique: true },
    { name: 'business_id', type: 'TEXT', notNull: true },
    { name: 'period_type', type: 'TEXT', notNull: true }, // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
    { name: 'period_key', type: 'TEXT', notNull: true },   // YYYY-MM-DD, YYYY-Www, YYYY-MM
    { name: 'total_sales_paisa', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'total_expense_paisa', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'net_profit_paisa', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'digital_inflow_paisa', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'cash_inflow_paisa', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'customer_count', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'health_score', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'created_at', type: 'TEXT', notNull: true },
    { name: 'synced', type: 'INTEGER', notNull: true, defaultValue: 0 }
  ],
  indices: [
    {
      name: 'index_merchant_analytics_snapshot_snapshot_id',
      unique: true,
      columns: ['snapshot_id'],
      ddl: 'CREATE UNIQUE INDEX IF NOT EXISTS index_merchant_analytics_snapshot_snapshot_id ON merchant_analytics_snapshot (snapshot_id);'
    },
    {
      name: 'index_merchant_analytics_snapshot_business_period',
      unique: false,
      columns: ['business_id', 'period_key'],
      ddl: 'CREATE INDEX IF NOT EXISTS index_merchant_analytics_snapshot_business_period ON merchant_analytics_snapshot (business_id, period_key);'
    }
  ],
  ddl: `CREATE TABLE IF NOT EXISTS merchant_analytics_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    snapshot_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    period_type TEXT NOT NULL,
    period_key TEXT NOT NULL,
    total_sales_paisa INTEGER NOT NULL DEFAULT 0,
    total_expense_paisa INTEGER NOT NULL DEFAULT 0,
    net_profit_paisa INTEGER NOT NULL DEFAULT 0,
    digital_inflow_paisa INTEGER NOT NULL DEFAULT 0,
    cash_inflow_paisa INTEGER NOT NULL DEFAULT 0,
    customer_count INTEGER NOT NULL DEFAULT 0,
    health_score INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );`
};
const ANALYTICS_SNAPSHOT_SCHEMA = MERCHANT_ANALYTICS_SNAPSHOT_SCHEMA;

const MERCHANT_SALES_FORECAST_SCHEMA = {
  tableName: 'merchant_sales_forecast',
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoincrement: true, notNull: true },
    { name: 'forecast_id', type: 'TEXT', notNull: true, unique: true },
    { name: 'business_id', type: 'TEXT', notNull: true },
    { name: 'forecast_period', type: 'TEXT', notNull: true }, // NEXT_7_DAYS, NEXT_30_DAYS, YYYY-MM
    { name: 'predicted_revenue_paisa', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'confidence_score_bps', type: 'INTEGER', notNull: true, defaultValue: 0 }, // 0 - 10000 bps
    { name: 'trend_direction', type: 'TEXT', notNull: true }, // UP, DOWN, STABLE
    { name: 'growth_rate_bps', type: 'INTEGER', notNull: true, defaultValue: 0 },       // basis points
    { name: 'model_type', type: 'TEXT', notNull: true },      // EXPONENTIAL_SMOOTHING, LINEAR_TREND, WEIGHTED_MOVING_AVERAGE
    { name: 'created_at', type: 'TEXT', notNull: true },
    { name: 'synced', type: 'INTEGER', notNull: true, defaultValue: 0 }
  ],
  indices: [
    {
      name: 'index_merchant_sales_forecast_forecast_id',
      unique: true,
      columns: ['forecast_id'],
      ddl: 'CREATE UNIQUE INDEX IF NOT EXISTS index_merchant_sales_forecast_forecast_id ON merchant_sales_forecast (forecast_id);'
    },
    {
      name: 'index_merchant_sales_forecast_business_period',
      unique: false,
      columns: ['business_id', 'forecast_period'],
      ddl: 'CREATE INDEX IF NOT EXISTS index_merchant_sales_forecast_business_period ON merchant_sales_forecast (business_id, forecast_period);'
    }
  ],
  ddl: `CREATE TABLE IF NOT EXISTS merchant_sales_forecast (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    forecast_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    forecast_period TEXT NOT NULL,
    predicted_revenue_paisa INTEGER NOT NULL DEFAULT 0,
    confidence_score_bps INTEGER NOT NULL DEFAULT 0,
    trend_direction TEXT NOT NULL,
    growth_rate_bps INTEGER NOT NULL DEFAULT 0,
    model_type TEXT NOT NULL,
    created_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );`
};
const SALES_FORECAST_SCHEMA = MERCHANT_SALES_FORECAST_SCHEMA;

// -------------------------------------------------------------
// 2. ENUMS & CONSTANTS
// -------------------------------------------------------------

const ANALYTICS_PERIOD_TYPES = Object.freeze({
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY'
});

const FORECAST_MODEL_TYPES = Object.freeze({
  EXPONENTIAL_SMOOTHING: 'EXPONENTIAL_SMOOTHING',
  LINEAR_TREND: 'LINEAR_TREND',
  WEIGHTED_MOVING_AVERAGE: 'WEIGHTED_MOVING_AVERAGE'
});

const TREND_DIRECTIONS = Object.freeze({
  UP: 'UP',
  DOWN: 'DOWN',
  STABLE: 'STABLE'
});

const BUSINESS_HEALTH_TIERS = Object.freeze({
  EXCELLENT: Object.freeze({
    code: 'EXCELLENT',
    minScore: 80,
    maxScore: 100,
    labelBn: 'চমৎকার',
    labelEn: 'Excellent',
    color: '#10B981',
    descriptionBn: 'আপনার ব্যবসা অত্যন্ত লাভজনক ও সুদৃঢ় আর্থিক অবস্থানে রয়েছে।'
  }),
  GOOD: Object.freeze({
    code: 'GOOD',
    minScore: 60,
    maxScore: 79,
    labelBn: 'ভালো',
    labelEn: 'Good',
    color: '#3B82F6',
    descriptionBn: 'আপনার ব্যবসার সার্বিক অবস্থা ইতিবাচক ও স্থিতিশীল।'
  }),
  FAIR: Object.freeze({
    code: 'FAIR',
    minScore: 40,
    maxScore: 59,
    labelBn: 'মোটামুটি',
    labelEn: 'Fair',
    color: '#F59E0B',
    descriptionBn: 'ব্যবসা সচল থাকলেও বাকি আদায় ও নগদ প্রবাহে উন্নতির সুযোগ রয়েছে।'
  }),
  AT_RISK: Object.freeze({
    code: 'AT_RISK',
    minScore: 0,
    maxScore: 39,
    labelBn: 'ঝুঁকিপূর্ণ',
    labelEn: 'At Risk',
    color: '#EF4444',
    descriptionBn: 'মুনাফা হ্রাস বা বাকি অনাদায়ী থাকায় জরুরি আর্থিক পদক্ষেপ প্রয়োজন।'
  })
});

const ANALYTICS_ARSC_TOKENS = Object.freeze({
  health_excellent: 'চমৎকার',
  health_good: 'ভালো',
  health_fair: 'মোটামুটি',
  health_at_risk: 'ঝুঁকিপূর্ণ',
  health_title: 'ব্যবসায়িক স্বাস্থ্য স্কোর',
  revenue_forecast_title: 'সম্ভাব্য বিক্রয় পূর্বাভাস',
  growth_trend_up: 'ঊর্ধ্বমুখী',
  growth_trend_down: 'নিম্নমুখী',
  growth_trend_stable: 'স্থিতিশীল',
  cashflow_stability: 'ক্যাশফ্লো স্থিতিশীলতা',
  profit_margin: 'মুনাফার অনুপাত',
  debt_recovery: 'বাকি আদায়ের গতি',
  customer_retention: 'গ্রাহক পুনরাবৃত্তি'
});

// -------------------------------------------------------------
// 3. FINANCIAL ALGORITHMS & MATHEMATICAL FORMULAS (INTEGER PAISA / BPS)
// -------------------------------------------------------------

/**
 * Calculates Business Health Score (0-100) based on 4 equal pillars (25 pts each):
 * 1. Cashflow Stability (25 pts): Inflow vs Outflow ratio in basis points
 * 2. Profit Margin (25 pts): Net Profit vs Sales ratio in basis points
 * 3. Debt Recovery Velocity (25 pts): Credit Collected vs Credit Given in basis points
 * 4. Customer Retention / Frequency (25 pts): Active Customers vs Total Customers
 *
 * Zero float drift, strict integer math.
 */
function calculateBusinessHealthScore({
  totalSalesPaisa = 0,
  totalExpensePaisa = 0,
  digitalInflowPaisa = 0,
  cashInflowPaisa = 0,
  creditGivenPaisa = 0,
  creditCollectedPaisa = 0,
  totalCustomers = 0,
  activeCustomers = 0
} = {}) {
  const sales = Math.max(0, Math.floor(Number(totalSalesPaisa) || 0));
  const expense = Math.max(0, Math.floor(Number(totalExpensePaisa) || 0));
  const digitalInflow = Math.max(0, Math.floor(Number(digitalInflowPaisa) || 0));
  const cashInflow = Math.max(0, Math.floor(Number(cashInflowPaisa) || 0));
  const creditGiven = Math.max(0, Math.floor(Number(creditGivenPaisa) || 0));
  const creditCollected = Math.max(0, Math.floor(Number(creditCollectedPaisa) || 0));
  const totCust = Math.max(0, Math.floor(Number(totalCustomers) || 0));
  const actCust = Math.max(0, Math.floor(Number(activeCustomers) || 0));

  // --- Pillar 1: Cashflow Stability (0-25 pts) ---
  const totalInflow = sales + digitalInflow + cashInflow;
  const totalOutflow = expense;
  let cashflowScore = 4;
  let inflowRatioBps = 0;

  if (totalOutflow <= 0) {
    cashflowScore = totalInflow > 0 ? 25 : 15;
    inflowRatioBps = totalInflow > 0 ? 25000 : 10000;
  } else {
    inflowRatioBps = Math.floor((totalInflow * 10000) / totalOutflow);
    if (inflowRatioBps >= 20000) cashflowScore = 25;       // >= 2.0x
    else if (inflowRatioBps >= 15000) cashflowScore = 22;  // >= 1.5x
    else if (inflowRatioBps >= 10000) cashflowScore = 18;  // >= 1.0x
    else if (inflowRatioBps >= 7500) cashflowScore = 12;   // >= 0.75x
    else if (inflowRatioBps >= 5000) cashflowScore = 8;    // >= 0.5x
    else cashflowScore = 4;                                // < 0.5x
  }

  // --- Pillar 2: Profit Margin (0-25 pts) ---
  const netProfitPaisa = sales - expense;
  let profitMarginScore = 0;
  let profitMarginBps = 0;

  if (sales <= 0) {
    profitMarginScore = netProfitPaisa >= 0 ? 10 : 0;
    profitMarginBps = 0;
  } else if (netProfitPaisa < 0) {
    profitMarginScore = 0;
    profitMarginBps = Math.floor((netProfitPaisa * 10000) / sales);
  } else {
    profitMarginBps = Math.floor((netProfitPaisa * 10000) / sales);
    if (profitMarginBps >= 3000) profitMarginScore = 25;       // >= 30%
    else if (profitMarginBps >= 2000) profitMarginScore = 22;  // >= 20%
    else if (profitMarginBps >= 1000) profitMarginScore = 18;  // >= 10%
    else if (profitMarginBps >= 500) profitMarginScore = 14;   // >= 5%
    else profitMarginScore = 10;                               // > 0%
  }

  // --- Pillar 3: Debt Recovery Velocity (0-25 pts) ---
  let debtRecoveryScore = 25;
  let debtRecoveryBps = 10000;

  if (creditGiven <= 0) {
    debtRecoveryScore = 25; // Zero bad debt risk in cash business
    debtRecoveryBps = 10000;
  } else {
    debtRecoveryBps = Math.floor((creditCollected * 10000) / creditGiven);
    if (debtRecoveryBps >= 9000) debtRecoveryScore = 25;       // >= 90%
    else if (debtRecoveryBps >= 7500) debtRecoveryScore = 21;  // >= 75%
    else if (debtRecoveryBps >= 5000) debtRecoveryScore = 16;  // >= 50%
    else if (debtRecoveryBps >= 2500) debtRecoveryScore = 10;  // >= 25%
    else debtRecoveryScore = 5;                                // < 25%
  }

  // --- Pillar 4: Customer Retention / Frequency (0-25 pts) ---
  let customerScore = 10;
  let retentionBps = 0;

  if (totCust <= 0) {
    customerScore = 10;
    retentionBps = 0;
  } else {
    retentionBps = Math.floor((actCust * 10000) / totCust);
    if (retentionBps >= 7500) customerScore = 25;       // >= 75%
    else if (retentionBps >= 5000) customerScore = 21;  // >= 50%
    else if (retentionBps >= 2500) customerScore = 16;  // >= 25%
    else if (actCust > 0) customerScore = 10;           // > 0
    else customerScore = 4;
  }

  const rawScore = cashflowScore + profitMarginScore + debtRecoveryScore + customerScore;
  const healthScore = Math.max(0, Math.min(100, rawScore));

  let tier = BUSINESS_HEALTH_TIERS.AT_RISK;
  if (healthScore >= 80) tier = BUSINESS_HEALTH_TIERS.EXCELLENT;
  else if (healthScore >= 60) tier = BUSINESS_HEALTH_TIERS.GOOD;
  else if (healthScore >= 40) tier = BUSINESS_HEALTH_TIERS.FAIR;

  return {
    healthScore,
    tier,
    pillars: {
      cashflowStability: {
        score: cashflowScore,
        maxScore: 25,
        ratioBps: inflowRatioBps,
        totalInflowPaisa: totalInflow,
        totalOutflowPaisa: totalOutflow
      },
      profitMargin: {
        score: profitMarginScore,
        maxScore: 25,
        marginBps: profitMarginBps,
        netProfitPaisa,
        totalSalesPaisa: sales
      },
      debtRecovery: {
        score: debtRecoveryScore,
        maxScore: 25,
        recoveryBps: debtRecoveryBps,
        creditCollectedPaisa: creditCollected,
        creditGivenPaisa: creditGiven
      },
      customerRetention: {
        score: customerScore,
        maxScore: 25,
        retentionBps,
        activeCustomers: actCust,
        totalCustomers: totCust
      }
    }
  };
}

/**
 * Classifies health score into tier.
 */
function classifyHealthTier(score = 0) {
  const s = Math.max(0, Math.min(100, Math.floor(Number(score) || 0)));
  if (s >= 80) return BUSINESS_HEALTH_TIERS.EXCELLENT;
  if (s >= 60) return BUSINESS_HEALTH_TIERS.GOOD;
  if (s >= 40) return BUSINESS_HEALTH_TIERS.FAIR;
  return BUSINESS_HEALTH_TIERS.AT_RISK;
}

// -------------------------------------------------------------
// 4. REVENUE FORECASTING ENGINE (INTEGER PAISA, BASIS POINTS)
// -------------------------------------------------------------

/**
 * Weighted Moving Average (WMA)
 * series: array of revenue values in paisa
 * weights: optional array of integer weights
 */
function calculateWeightedMovingAverage(series = [], weights = null) {
  if (!Array.isArray(series) || series.length === 0) return 0;
  if (series.length === 1) return Math.max(0, Math.floor(series[0]));

  const n = series.length;
  let w = weights;
  if (!Array.isArray(w) || w.length !== n) {
    w = Array.from({ length: n }, (_, i) => i + 1);
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < n; i++) {
    const val = Math.max(0, Math.floor(Number(series[i]) || 0));
    const weight = Math.max(1, Math.floor(Number(w[i]) || 1));
    weightedSum += val * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Exponential Smoothing
 * alphaBps: smoothing factor in basis points (1 - 10000 bps, default 3000 = 0.3)
 */
function calculateExponentialSmoothing(series = [], alphaBps = 3000) {
  if (!Array.isArray(series) || series.length === 0) return 0;
  const alpha = Math.max(1, Math.min(10000, Math.floor(Number(alphaBps) || 3000)));

  let smoothed = Math.max(0, Math.floor(Number(series[0]) || 0));
  for (let i = 1; i < series.length; i++) {
    const val = Math.max(0, Math.floor(Number(series[i]) || 0));
    smoothed = Math.round((alpha * val + (10000 - alpha) * smoothed) / 10000);
  }

  return Math.max(0, smoothed);
}

/**
 * Holt-Winters Linear Trend Model
 * Accounts for both baseline level (L) and growth trend (T).
 * alphaBps: level smoothing factor (default 3000 = 0.3)
 * betaBps: trend smoothing factor (default 1000 = 0.1)
 * horizon: future periods to project (default 1)
 */
function calculateHoltWintersLinearTrend(series = [], { alphaBps = 3000, betaBps = 1000, horizon = 1 } = {}) {
  if (!Array.isArray(series) || series.length === 0) {
    return {
      predictedRevenuePaisa: 0,
      growthRateBps: 0,
      trendDirection: TREND_DIRECTIONS.STABLE,
      confidenceScoreBps: 0,
      modelType: FORECAST_MODEL_TYPES.LINEAR_TREND
    };
  }

  const alpha = Math.max(1, Math.min(10000, Math.floor(Number(alphaBps) || 3000)));
  const beta = Math.max(1, Math.min(10000, Math.floor(Number(betaBps) || 1000)));
  const h = Math.max(1, Math.floor(Number(horizon) || 1));

  if (series.length === 1) {
    return {
      predictedRevenuePaisa: Math.max(0, Math.floor(series[0])),
      growthRateBps: 0,
      trendDirection: TREND_DIRECTIONS.STABLE,
      confidenceScoreBps: 5000,
      modelType: FORECAST_MODEL_TYPES.LINEAR_TREND
    };
  }

  let level = Math.max(0, Math.floor(Number(series[0]) || 0));
  let trend = Math.floor(Number(series[1]) || 0) - level;

  for (let t = 1; t < series.length; t++) {
    const yt = Math.max(0, Math.floor(Number(series[t]) || 0));
    const prevLevel = level;
    const prevTrend = trend;

    level = Math.round((alpha * yt + (10000 - alpha) * (prevLevel + prevTrend)) / 10000);
    trend = Math.round((beta * (level - prevLevel) + (10000 - beta) * prevTrend) / 10000);
  }

  const forecast = Math.max(0, level + h * trend);
  const growthRateBps = level > 0 ? Math.round((trend * 10000) / level) : 0;

  let trendDirection = TREND_DIRECTIONS.STABLE;
  if (growthRateBps > 100) trendDirection = TREND_DIRECTIONS.UP;
  else if (growthRateBps < -100) trendDirection = TREND_DIRECTIONS.DOWN;

  const sampleBonus = Math.min(3000, series.length * 300);
  const confidenceScoreBps = Math.min(10000, 6000 + sampleBonus);

  return {
    predictedRevenuePaisa: forecast,
    growthRateBps,
    trendDirection,
    confidenceScoreBps,
    modelType: FORECAST_MODEL_TYPES.LINEAR_TREND
  };
}

/**
 * High-level sales forecast generator.
 */
function generateSalesForecast(businessId, historicalSeries = [], options = {}) {
  const modelType = options.modelType || FORECAST_MODEL_TYPES.LINEAR_TREND;
  const forecastPeriod = options.forecastPeriod || 'NEXT_30_DAYS';
  const targetBizId = String(businessId || '1');

  let result;
  if (modelType === FORECAST_MODEL_TYPES.WEIGHTED_MOVING_AVERAGE) {
    const predicted = calculateWeightedMovingAverage(historicalSeries, options.weights);
    result = {
      predictedRevenuePaisa: predicted,
      growthRateBps: 0,
      trendDirection: TREND_DIRECTIONS.STABLE,
      confidenceScoreBps: Math.min(10000, 5000 + historicalSeries.length * 200),
      modelType: FORECAST_MODEL_TYPES.WEIGHTED_MOVING_AVERAGE
    };
  } else if (modelType === FORECAST_MODEL_TYPES.EXPONENTIAL_SMOOTHING) {
    const predicted = calculateExponentialSmoothing(historicalSeries, options.alphaBps || 3000);
    result = {
      predictedRevenuePaisa: predicted,
      growthRateBps: 0,
      trendDirection: TREND_DIRECTIONS.STABLE,
      confidenceScoreBps: Math.min(10000, 6000 + historicalSeries.length * 200),
      modelType: FORECAST_MODEL_TYPES.EXPONENTIAL_SMOOTHING
    };
  } else {
    result = calculateHoltWintersLinearTrend(historicalSeries, options);
  }

  const forecastId = options.forecastId || ('FCST-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000));

  return new MerchantSalesForecastRecord({
    forecast_id: forecastId,
    business_id: targetBizId,
    forecast_period: forecastPeriod,
    predicted_revenue_paisa: result.predictedRevenuePaisa,
    confidence_score_bps: result.confidenceScoreBps,
    trend_direction: result.trendDirection,
    growth_rate_bps: result.growthRateBps,
    model_type: result.modelType,
    created_at: options.created_at || getFastIsoString(),
    synced: 0
  });
}

// -------------------------------------------------------------
// 5. CUSTOMER RANKINGS & EXPENSE BREAKDOWN ANALYTICS
// -------------------------------------------------------------

/**
 * Calculates top customer ranking by revenue contribution & debt recovery ratio.
 */
function calculateCustomerRankings(customers = [], options = {}) {
  if (!Array.isArray(customers) || customers.length === 0) return [];

  let totalRevenuePaisa = 0;
  const normalized = customers.map((c) => {
    const purchasePaisa = Math.max(0, Math.floor(Number(c.totalPurchasePaisa !== undefined ? c.totalPurchasePaisa : (c.total_purchase_paisa || c.purchasePaisa || 0))));
    const creditOutstanding = Math.max(0, Math.floor(Number(c.creditOutstandingPaisa !== undefined ? c.creditOutstandingPaisa : (c.credit_outstanding_paisa || c.duePaisa || 0))));
    const creditPaid = Math.max(0, Math.floor(Number(c.creditPaidPaisa !== undefined ? c.creditPaidPaisa : (c.credit_paid_paisa || c.paidPaisa || 0))));
    totalRevenuePaisa += purchasePaisa;
    return {
      customerId: String(c.id || c.customerId || c.customer_id || ''),
      name: c.name || c.customerName || 'গ্রাহক',
      mobile: c.mobile || c.phone || '',
      purchasePaisa,
      creditOutstanding,
      creditPaid
    };
  });

  normalized.sort((a, b) => b.purchasePaisa - a.purchasePaisa);

  const limit = options.limit ? Math.max(1, Math.floor(Number(options.limit))) : normalized.length;

  return normalized.slice(0, limit).map((c, index) => {
    const revenueContributionBps = totalRevenuePaisa > 0
      ? Math.floor((c.purchasePaisa * 10000) / totalRevenuePaisa)
      : 0;
    const totalCredit = c.creditOutstanding + c.creditPaid;
    const debtRecoveryRatioBps = totalCredit > 0
      ? Math.floor((c.creditPaid * 10000) / totalCredit)
      : 10000;

    return {
      rank: index + 1,
      customerId: c.customerId,
      name: c.name,
      mobile: c.mobile,
      totalPurchasePaisa: c.purchasePaisa,
      creditOutstandingPaisa: c.creditOutstanding,
      creditPaidPaisa: c.creditPaid,
      revenueContributionBps,
      debtRecoveryRatioBps
    };
  });
}

/**
 * Category-wise expense breakdown.
 */
function calculateCategoryExpenseBreakdown(expenses = []) {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return { totalExpensePaisa: 0, categories: [] };
  }

  const categoryTotals = {};
  let totalExpensePaisa = 0;

  for (const exp of expenses) {
    const rawCat = String(exp.category || exp.expenseCategory || 'OTHER').toUpperCase().trim();
    const amount = Math.max(0, Math.floor(Number(exp.amountPaisa !== undefined ? exp.amountPaisa : (exp.amount_paisa || exp.amount || 0))));
    categoryTotals[rawCat] = (categoryTotals[rawCat] || 0) + amount;
    totalExpensePaisa += amount;
  }

  const categories = Object.keys(categoryTotals).map((cat) => {
    const amountPaisa = categoryTotals[cat];
    const percentageBps = totalExpensePaisa > 0
      ? Math.floor((amountPaisa * 10000) / totalExpensePaisa)
      : 0;
    return {
      category: cat,
      amountPaisa,
      percentageBps
    };
  });

  categories.sort((a, b) => b.amountPaisa - a.amountPaisa);

  return {
    totalExpensePaisa,
    categories
  };
}

/**
 * Calculates sales gross margin breakdown.
 */
function calculateSalesMarginBreakdown(salesPaisa = 0, costOfGoodsSoldPaisa = 0) {
  const sales = Math.max(0, Math.floor(Number(salesPaisa) || 0));
  const cogs = Math.max(0, Math.floor(Number(costOfGoodsSoldPaisa) || 0));
  const grossProfitPaisa = sales - cogs;
  const grossMarginBps = sales > 0 ? Math.floor((grossProfitPaisa * 10000) / sales) : 0;

  return {
    totalSalesPaisa: sales,
    costOfGoodsSoldPaisa: cogs,
    grossProfitPaisa,
    grossMarginBps
  };
}

// -------------------------------------------------------------
// 6. RECORD MODEL CLASSES
// -------------------------------------------------------------

class MerchantAnalyticsSnapshotRecord {
  constructor(data = {}) {
    this.id = data.id || ('SNAP_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    this.snapshot_id = String(data.snapshot_id || data.snapshotId || ('TK-SNAP-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)));
    this.snapshotId = this.snapshot_id;
    this.business_id = String(data.business_id || data.businessId || '1');
    this.businessId = this.business_id;
    this.period_type = data.period_type || data.periodType || ANALYTICS_PERIOD_TYPES.MONTHLY;
    this.periodType = this.period_type;
    this.period_key = String(data.period_key || data.periodKey || '');
    this.periodKey = this.period_key;
    this.total_sales_paisa = Math.max(0, Math.floor(Number(data.total_sales_paisa !== undefined ? data.total_sales_paisa : (data.totalSalesPaisa || 0))));
    this.totalSalesPaisa = this.total_sales_paisa;
    this.total_expense_paisa = Math.max(0, Math.floor(Number(data.total_expense_paisa !== undefined ? data.total_expense_paisa : (data.totalExpensePaisa || 0))));
    this.totalExpensePaisa = this.total_expense_paisa;
    this.net_profit_paisa = Math.floor(Number(data.net_profit_paisa !== undefined ? data.net_profit_paisa : (data.netProfitPaisa !== undefined ? data.netProfitPaisa : (this.total_sales_paisa - this.total_expense_paisa))));
    this.netProfitPaisa = this.net_profit_paisa;
    this.digital_inflow_paisa = Math.max(0, Math.floor(Number(data.digital_inflow_paisa !== undefined ? data.digital_inflow_paisa : (data.digitalInflowPaisa || 0))));
    this.digitalInflowPaisa = this.digital_inflow_paisa;
    this.cash_inflow_paisa = Math.max(0, Math.floor(Number(data.cash_inflow_paisa !== undefined ? data.cash_inflow_paisa : (data.cashInflowPaisa || 0))));
    this.cashInflowPaisa = this.cash_inflow_paisa;
    this.customer_count = Math.max(0, Math.floor(Number(data.customer_count !== undefined ? data.customer_count : (data.customerCount || 0))));
    this.customerCount = this.customer_count;
    this.health_score = Math.max(0, Math.min(100, Math.floor(Number(data.health_score !== undefined ? data.health_score : (data.healthScore || 0)))));
    this.healthScore = this.health_score;
    this.created_at = data.created_at || data.createdAt || getFastIsoString();
    this.createdAt = this.created_at;
    this.synced = Number(data.synced) || 0;
  }
}

class MerchantSalesForecastRecord {
  constructor(data = {}) {
    this.id = data.id || ('FCST_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    this.forecast_id = String(data.forecast_id || data.forecastId || ('TK-FCST-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)));
    this.forecastId = this.forecast_id;
    this.business_id = String(data.business_id || data.businessId || '1');
    this.businessId = this.business_id;
    this.forecast_period = String(data.forecast_period || data.forecastPeriod || 'NEXT_30_DAYS');
    this.forecastPeriod = this.forecast_period;
    this.predicted_revenue_paisa = Math.max(0, Math.floor(Number(data.predicted_revenue_paisa !== undefined ? data.predicted_revenue_paisa : (data.predictedRevenuePaisa || 0))));
    this.predictedRevenuePaisa = this.predicted_revenue_paisa;
    this.confidence_score_bps = Math.max(0, Math.min(10000, Math.floor(Number(data.confidence_score_bps !== undefined ? data.confidence_score_bps : (data.confidenceScoreBps || 0)))));
    this.confidenceScoreBps = this.confidence_score_bps;
    this.trend_direction = data.trend_direction || data.trendDirection || TREND_DIRECTIONS.STABLE;
    this.trendDirection = this.trend_direction;
    this.growth_rate_bps = Math.floor(Number(data.growth_rate_bps !== undefined ? data.growth_rate_bps : (data.growthRateBps || 0)));
    this.growthRateBps = this.growth_rate_bps;
    this.model_type = data.model_type || data.modelType || FORECAST_MODEL_TYPES.LINEAR_TREND;
    this.modelType = this.model_type;
    this.created_at = data.created_at || data.createdAt || getFastIsoString();
    this.createdAt = this.created_at;
    this.synced = Number(data.synced) || 0;
  }
}

// -------------------------------------------------------------
// 7. IN-MEMORY ROOM SQLITE DAOS
// -------------------------------------------------------------

class MerchantAnalyticsSnapshotDao {
  constructor(initialRecords = []) {
    this.records = (initialRecords || []).map((r) => (r instanceof MerchantAnalyticsSnapshotRecord ? r : new MerchantAnalyticsSnapshotRecord(r)));
  }

  insert(record) {
    const rec = record instanceof MerchantAnalyticsSnapshotRecord ? record : new MerchantAnalyticsSnapshotRecord(record);
    const existing = this.records.find((r) => r.snapshot_id === rec.snapshot_id);
    if (existing) {
      throw new Error('UNIQUE constraint failed: merchant_analytics_snapshot.snapshot_id (' + rec.snapshot_id + ')');
    }
    this.records.push(rec);
    return rec;
  }

  insertOrUpdate(record) {
    const rec = record instanceof MerchantAnalyticsSnapshotRecord ? record : new MerchantAnalyticsSnapshotRecord(record);
    const idx = this.records.findIndex((r) => r.snapshot_id === rec.snapshot_id);
    if (idx >= 0) {
      this.records[idx] = rec;
      return rec;
    }
    this.records.push(rec);
    return rec;
  }

  findById(id) {
    return this.records.find((r) => String(r.id) === String(id) || String(r.snapshot_id) === String(id)) || null;
  }

  findBySnapshotId(snapshotId) {
    return this.records.find((r) => r.snapshot_id === String(snapshotId)) || null;
  }

  findByBusinessIdAndPeriod(businessId, periodKey) {
    return this.records.find((r) => r.business_id === String(businessId) && r.period_key === String(periodKey)) || null;
  }

  query(filter = {}) {
    let result = [...this.records];
    if (filter.businessId || filter.business_id) {
      const bId = String(filter.businessId || filter.business_id);
      result = result.filter((r) => r.business_id === bId);
    }
    if (filter.periodType || filter.period_type) {
      const pType = String(filter.periodType || filter.period_type);
      result = result.filter((r) => r.period_type === pType);
    }
    if (filter.periodKey || filter.period_key) {
      const pKey = String(filter.periodKey || filter.period_key);
      result = result.filter((r) => r.period_key === pKey);
    }
    if (filter.synced !== undefined) {
      const s = Number(filter.synced);
      result = result.filter((r) => r.synced === s);
    }
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (filter.offset || filter.limit) {
      const offset = Number(filter.offset) || 0;
      const limit = Number(filter.limit) || result.length;
      result = result.slice(offset, offset + limit);
    }
    return result;
  }

  delete(snapshotId) {
    const idx = this.records.findIndex((r) => r.snapshot_id === String(snapshotId) || String(r.id) === String(snapshotId));
    if (idx >= 0) {
      this.records.splice(idx, 1);
      return true;
    }
    return false;
  }

  getUnsynced(limit = 50) {
    return this.records.filter((r) => r.synced === 0).slice(0, limit);
  }

  updateSyncStatus(ids = [], synced = 1) {
    const idSet = new Set((ids || []).map(String));
    let count = 0;
    for (const r of this.records) {
      if (idSet.has(String(r.snapshot_id)) || idSet.has(String(r.id))) {
        r.synced = Number(synced);
        count++;
      }
    }
    return count;
  }
}

class MerchantSalesForecastDao {
  constructor(initialRecords = []) {
    this.records = (initialRecords || []).map((r) => (r instanceof MerchantSalesForecastRecord ? r : new MerchantSalesForecastRecord(r)));
  }

  insert(record) {
    const rec = record instanceof MerchantSalesForecastRecord ? record : new MerchantSalesForecastRecord(record);
    const existing = this.records.find((r) => r.forecast_id === rec.forecast_id);
    if (existing) {
      throw new Error('UNIQUE constraint failed: merchant_sales_forecast.forecast_id (' + rec.forecast_id + ')');
    }
    this.records.push(rec);
    return rec;
  }

  insertOrUpdate(record) {
    const rec = record instanceof MerchantSalesForecastRecord ? record : new MerchantSalesForecastRecord(record);
    const idx = this.records.findIndex((r) => r.forecast_id === rec.forecast_id);
    if (idx >= 0) {
      this.records[idx] = rec;
      return rec;
    }
    this.records.push(rec);
    return rec;
  }

  findById(id) {
    return this.records.find((r) => String(r.id) === String(id) || String(r.forecast_id) === String(id)) || null;
  }

  findByForecastId(forecastId) {
    return this.records.find((r) => r.forecast_id === String(forecastId)) || null;
  }

  findByBusinessIdAndPeriod(businessId, forecastPeriod) {
    return this.records.find((r) => r.business_id === String(businessId) && r.forecast_period === String(forecastPeriod)) || null;
  }

  getLatest(businessId) {
    const bId = String(businessId || '1');
    const matches = this.records.filter((r) => r.business_id === bId);
    matches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return matches[0] || null;
  }

  query(filter = {}) {
    let result = [...this.records];
    if (filter.businessId || filter.business_id) {
      const bId = String(filter.businessId || filter.business_id);
      result = result.filter((r) => r.business_id === bId);
    }
    if (filter.forecastPeriod || filter.forecast_period) {
      const p = String(filter.forecastPeriod || filter.forecast_period);
      result = result.filter((r) => r.forecast_period === p);
    }
    if (filter.modelType || filter.model_type) {
      const m = String(filter.modelType || filter.model_type);
      result = result.filter((r) => r.model_type === m);
    }
    if (filter.synced !== undefined) {
      const s = Number(filter.synced);
      result = result.filter((r) => r.synced === s);
    }
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (filter.offset || filter.limit) {
      const offset = Number(filter.offset) || 0;
      const limit = Number(filter.limit) || result.length;
      result = result.slice(offset, offset + limit);
    }
    return result;
  }

  delete(forecastId) {
    const idx = this.records.findIndex((r) => r.forecast_id === String(forecastId) || String(r.id) === String(forecastId));
    if (idx >= 0) {
      this.records.splice(idx, 1);
      return true;
    }
    return false;
  }

  getUnsynced(limit = 50) {
    return this.records.filter((r) => r.synced === 0).slice(0, limit);
  }

  updateSyncStatus(ids = [], synced = 1) {
    const idSet = new Set((ids || []).map(String));
    let count = 0;
    for (const r of this.records) {
      if (idSet.has(String(r.forecast_id)) || idSet.has(String(r.id))) {
        r.synced = Number(synced);
        count++;
      }
    }
    return count;
  }
}

// -------------------------------------------------------------
// 8. UNIFIED BUSINESS ANALYTICS & REVENUE FORECASTING ENGINE
// -------------------------------------------------------------

class MerchantAnalyticsEngine {
  constructor() {
    this.snapshotDao = new MerchantAnalyticsSnapshotDao();
    this.forecastDao = new MerchantSalesForecastDao();
  }

  /**
   * Computes business health metrics from input parameters.
   */
  computeHealth(metrics) {
    return calculateBusinessHealthScore(metrics);
  }

  /**
   * Generates a snapshot and persists it to repository.
   */
  async generateSnapshot(businessId, periodType, periodKey, metrics = {}, storage = null) {
    const healthResult = calculateBusinessHealthScore(metrics);
    const targetBizId = String(businessId || '1');
    const snapshotId = 'TK-SNAP-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);

    const snapshot = new MerchantAnalyticsSnapshotRecord({
      snapshot_id: snapshotId,
      business_id: targetBizId,
      period_type: periodType || ANALYTICS_PERIOD_TYPES.MONTHLY,
      period_key: periodKey || new Date().toISOString().slice(0, 7),
      total_sales_paisa: metrics.totalSalesPaisa || 0,
      total_expense_paisa: metrics.totalExpensePaisa || 0,
      net_profit_paisa: (metrics.totalSalesPaisa || 0) - (metrics.totalExpensePaisa || 0),
      digital_inflow_paisa: metrics.digitalInflowPaisa || 0,
      cash_inflow_paisa: metrics.cashInflowPaisa || 0,
      customer_count: metrics.totalCustomers || 0,
      health_score: healthResult.healthScore,
      created_at: getFastIsoString(),
      synced: 0
    });

    if (storage && typeof storage.saveAnalyticsSnapshot === 'function') {
      await storage.saveAnalyticsSnapshot(targetBizId, snapshot);
    } else {
      this.snapshotDao.insertOrUpdate(snapshot);
    }

    return {
      snapshot,
      healthResult
    };
  }

  /**
   * Generates and persists a sales revenue forecast.
   */
  async generateForecast(businessId, forecastPeriod, historicalSeries = [], options = {}, storage = null) {
    const targetBizId = String(businessId || '1');
    const forecast = generateSalesForecast(targetBizId, historicalSeries, {
      ...options,
      forecastPeriod: forecastPeriod || 'NEXT_30_DAYS'
    });

    if (storage && typeof storage.saveSalesForecast === 'function') {
      await storage.saveSalesForecast(targetBizId, forecast);
    } else {
      this.forecastDao.insertOrUpdate(forecast);
    }

    return forecast;
  }

  /**
   * Ranks customers.
   */
  rankCustomers(customers = [], options = {}) {
    return calculateCustomerRankings(customers, options);
  }

  /**
   * Breaks down expenses.
   */
  breakdownExpenses(expenses = []) {
    return calculateCategoryExpenseBreakdown(expenses);
  }

  /**
   * Breaks down gross margin.
   */
  breakdownMargin(salesPaisa = 0, cogsPaisa = 0) {
    return calculateSalesMarginBreakdown(salesPaisa, cogsPaisa);
  }
}

const ReconstructedAnalyticsEngine = MerchantAnalyticsEngine;
const BusinessAnalyticsEngine = MerchantAnalyticsEngine;
const merchantAnalyticsEngine = new MerchantAnalyticsEngine();
const reconstructedAnalyticsEngine = merchantAnalyticsEngine;

// -------------------------------------------------------------
// MODULE EXPORTS
// -------------------------------------------------------------

module.exports = {
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
  reconstructedAnalyticsEngine
};
