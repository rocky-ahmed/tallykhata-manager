# TALLYKHATA RECONSTRUCTION — ITERATION 241 BACKEND REPORT

**Milestone:** REA-ITER-241 (TallyPay Merchant Business Health Analytics, Revenue Forecasting & Dynamic Insights Subsystem)  
**Worker Identity:** Worker 2: Averroes / Peirce (Permanent Backend Developer & Business Logic Architect)  
**Registered Thread ID:** `01a1a349-61ae-74d0-aed6-1792e7d1d594`  
**Task ID:** `TASK-241-BACKEND`  
**Target Reference:** REF-001 (`TallyKhata-Demo.apk`, SHA-256: `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`)  
**Date:** 2026-11-05  
**Status:** **100% COMPLETE & VERIFIED (34/34 BACKEND TESTS PASSING, 100% GREEN)**  

---

## 1. Executive Summary

Milestone REA-ITER-241 delivers the clean-room production backend models, Room SQLite schemas, mathematical analytics engines, revenue forecasting algorithms, and multi-tenant persistence layer for the **TallyPay Merchant Business Health Analytics, Revenue Forecasting & Dynamic Insights Subsystem**.

The subsystem enables merchant users to monitor their business health via a four-pillar quantitative score, forecast future sales revenue with statistical exponential smoothing and Holt-Winters trend models, analyze top customer contributions, and dissect operational expense categories—all executed in strict integer paisa and basis point precision with zero floating-point drift.

All deliverables adhere strictly to the project's permanent architecture standards:
- Room SQLite specifications with primary keys and unique/composite indices.
- Pure integer arithmetic (paisa and basis points) preventing IEEE 754 float inaccuracies.
- Strict multi-tenant business isolation by `businessId` with atomic cascade purging.
- PII and security token scrubbing in cloud backup payloads.
- 100% test pass rate across unit, integration, and performance benchmark suites.

---

## 2. Room SQLite Schemas & Persistence Invariants

The data model defines two primary tables mapped to Android Room entities:

### 2.1 Table: `merchant_analytics_snapshot`
Captures periodic aggregations of business financial performance and calculated health scores.

- **Columns (14):**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
  - `snapshot_id`: TEXT NOT NULL UNIQUE
  - `business_id`: TEXT NOT NULL
  - `period_type`: TEXT NOT NULL (`DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`)
  - `period_key`: TEXT NOT NULL (e.g., `YYYY-MM-DD`, `YYYY-Www`, `YYYY-MM`)
  - `total_sales_paisa`: INTEGER NOT NULL DEFAULT 0
  - `total_expense_paisa`: INTEGER NOT NULL DEFAULT 0
  - `net_profit_paisa`: INTEGER NOT NULL DEFAULT 0
  - `digital_inflow_paisa`: INTEGER NOT NULL DEFAULT 0
  - `cash_inflow_paisa`: INTEGER NOT NULL DEFAULT 0
  - `customer_count`: INTEGER NOT NULL DEFAULT 0
  - `health_score`: INTEGER NOT NULL DEFAULT 0 (0–100)
  - `created_at`: TEXT NOT NULL
  - `synced`: INTEGER NOT NULL DEFAULT 0
- **Indices:**
  - `index_merchant_analytics_snapshot_snapshot_id` (UNIQUE on `snapshot_id`)
  - `index_merchant_analytics_snapshot_business_period` (Composite on `business_id, period_key`)

### 2.2 Table: `merchant_sales_forecast`
Maintains projected sales revenue and statistical growth rates.

- **Columns (11):**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
  - `forecast_id`: TEXT NOT NULL UNIQUE
  - `business_id`: TEXT NOT NULL
  - `forecast_period`: TEXT NOT NULL (`NEXT_7_DAYS`, `NEXT_30_DAYS`, `YYYY-MM`)
  - `predicted_revenue_paisa`: INTEGER NOT NULL DEFAULT 0
  - `confidence_score_bps`: INTEGER NOT NULL DEFAULT 0 (0–10000 bps)
  - `trend_direction`: TEXT NOT NULL (`UP`, `DOWN`, `STABLE`)
  - `growth_rate_bps`: INTEGER NOT NULL DEFAULT 0 (basis points)
  - `model_type`: TEXT NOT NULL (`EXPONENTIAL_SMOOTHING`, `LINEAR_TREND`, `WEIGHTED_MOVING_AVERAGE`)
  - `created_at`: TEXT NOT NULL
  - `synced`: INTEGER NOT NULL DEFAULT 0
- **Indices:**
  - `index_merchant_sales_forecast_forecast_id` (UNIQUE on `forecast_id`)
  - `index_merchant_sales_forecast_business_period` (Composite on `business_id, forecast_period`)

---

## 3. Financial Mathematics & Analytics Engine

### 3.1 Business Health Score Algorithm (0–100 Points)
The algorithm evaluates four independent pillars (25 points maximum each):

1. **Cashflow Stability (25 Points):**
   - Evaluates the ratio of total inflows (sales + digital inflow + cash inflow) to total outflows (expenses) in basis points ($1\times = 10,000\text{ bps}$).
   - $\ge 20,000\text{ bps}$ ($2.0\times$): 25 pts
   - $\ge 15,000\text{ bps}$ ($1.5\times$): 22 pts
   - $\ge 10,000\text{ bps}$ ($1.0\times$): 18 pts
   - $\ge 7,500\text{ bps}$ ($0.75\times$): 12 pts
   - $\ge 5,000\text{ bps}$ ($0.5\times$): 8 pts
   - $< 5,000\text{ bps}$: 4 pts (Zero outflow edge case awards 25 pts if inflows > 0, 15 pts if zero).

2. **Profit Margin (25 Points):**
   - Margin in basis points: $\lfloor (\text{Net Profit Paisa} \times 10,000) / \text{Sales Paisa} \rfloor$.
   - $\ge 3,000\text{ bps}$ ($30\%$): 25 pts
   - $\ge 2,000\text{ bps}$ ($20\%$): 22 pts
   - $\ge 1,000\text{ bps}$ ($10\%$): 18 pts
   - $\ge 500\text{ bps}$ ($5\%$): 14 pts
   - $> 0\text{ bps}$: 10 pts
   - Net loss: 0 pts.

3. **Debt Recovery Velocity (25 Points):**
   - Recovery ratio in basis points: $\lfloor (\text{Credit Collected Paisa} \times 10,000) / \text{Credit Given Paisa} \rfloor$.
   - Zero credit given: 25 pts (Cash-only business has zero credit default risk).
   - $\ge 9,000\text{ bps}$ ($90\%$): 25 pts
   - $\ge 7,500\text{ bps}$ ($75\%$): 21 pts
   - $\ge 5,000\text{ bps}$ ($50\%$): 16 pts
   - $\ge 2,500\text{ bps}$ ($25\%$): 10 pts
   - $< 2,500\text{ bps}$: 5 pts.

4. **Customer Retention / Frequency (25 Points):**
   - Active ratio in basis points: $\lfloor (\text{Active Customers} \times 10,000) / \text{Total Customers} \rfloor$.
   - $\ge 7,500\text{ bps}$ ($75\%$): 25 pts
   - $\ge 5,000\text{ bps}$ ($50\%$): 21 pts
   - $\ge 2,500\text{ bps}$ ($25\%$): 16 pts
   - Active customers $> 0$: 10 pts
   - Zero active customers: 4 pts.

- **Tier Classification:**
  - `EXCELLENT` (80–100): "চমৎকার" (`#10B981`)
  - `GOOD` (60–79): "ভালো" (`#3B82F6`)
  - `FAIR` (40–59): "মোটামুটি" (`#F59E0B`)
  - `AT_RISK` (0–39): "ঝুঁকিপূর্ণ" (`#EF4444`)

### 3.2 Revenue Forecasting Models
- **Weighted Moving Average (`calculateWeightedMovingAverage`):** Configurable or linear integer weights ($1, 2, \dots, N$).
- **Exponential Smoothing (`calculateExponentialSmoothing`):** Smoothing factor $\alpha$ in basis points (default $3,000\text{ bps} = 0.3$).
- **Holt-Winters Linear Trend (`calculateHoltWintersLinearTrend`):** Models both level ($L_t$) and trend ($T_t$), projecting horizon periods forward with growth rate in basis points and automatic trend direction classification (`UP`, `DOWN`, `STABLE`).

### 3.3 Customer Ranking & Expense Breakdown
- **`calculateCustomerRankings`:** Computes revenue contribution in basis points and debt recovery ratio per customer.
- **`calculateCategoryExpenseBreakdown`:** Aggregates expenses by category with exact basis point percentages.
- **`calculateSalesMarginBreakdown`:** Determines gross profit paisa and gross margin in basis points.

---

## 4. Multi-Tenant StorageRepository Integration

1. **State Registration:**
   - Added `'merchantAnalyticsSnapshots'` and `'merchantSalesForecasts'` to `VALID_COLLECTIONS`, `createDefaultState`, and `sanitizeState`.
2. **Repository Methods Implemented:**
   - `saveAnalyticsSnapshot(businessId, snapshotData)`
   - `getAnalyticsSnapshots(businessId, options)`
   - `getAnalyticsSnapshotByKey(businessId, periodKey)`
   - `deleteAnalyticsSnapshot(businessId, snapshotId)`
   - `getUnsyncedAnalyticsSnapshots(businessId, limit)`
   - `updateAnalyticsSnapshotSyncStatus(businessId, ids, synced)`
   - `saveSalesForecast(businessId, forecastData)`
   - `getSalesForecasts(businessId, options)`
   - `getLatestSalesForecast(businessId)`
   - `deleteSalesForecast(businessId, forecastId)`
   - `getUnsyncedSalesForecasts(businessId, limit)`
   - `updateSalesForecastSyncStatus(businessId, ids, synced)`
   - `computeBusinessHealthMetrics(businessId, options)`
3. **Cascade Deletion:**
   - `deleteBusinessCascade(targetId)` purges both `merchantAnalyticsSnapshots` and `merchantSalesForecasts` for the targeted tenant while preserving all records of surviving tenants.
4. **Cloud Backup & Restore:**
   - `getFullBackupState()` scrubs sensitive API keys, tokens, or credentials from snapshots and forecasts.
   - `createStorageBackup()` manifests exact `recordCounts` for both collections.
   - `commitRestorePayload()` guarantees atomic restore for both full and single-tenant selective workflows.

---

## 5. Verification & Test Evidence

### 5.1 Test Suite: `test_iteration_241_business_analytics_backend.js`
Comprehensive test suite covering 10 distinct test groups:

```
======================================================================
REA-ITER-241: BUSINESS HEALTH ANALYTICS & FORECASTING TEST SUITE
Worker: Worker 2 (Averroes / Peirce - Backend & Logic Architect)
======================================================================

--- Group 1: Room SQLite DDL & Indices Verification ---
  ✓ G1.1: merchant_analytics_snapshot schema contains all 14 columns
  ✓ G1.2: merchant_analytics_snapshot has unique and composite indices
  ✓ G1.3: merchant_sales_forecast schema contains all 11 columns and indices

--- Group 2: Enums, Constants & ARSC Localization Tokens ---
  ✓ G2.1: ANALYTICS_PERIOD_TYPES defines all 5 periods
  ✓ G2.2: FORECAST_MODEL_TYPES and TREND_DIRECTIONS
  ✓ G2.3: BUSINESS_HEALTH_TIERS defines score boundaries and Bengali labels
  ✓ G2.4: ANALYTICS_ARSC_TOKENS contains authentic Bengali localized strings

--- Group 3: In-Memory DAOs CRUD & Idempotency ---
  ✓ G3.1: MerchantAnalyticsSnapshotDao insert, find, and unique constraint
  ✓ G3.2: MerchantAnalyticsSnapshotDao query and sync status
  ✓ G3.3: MerchantSalesForecastDao insert, findLatest, and query
  ✓ G3.4: MerchantSalesForecastDao delete, unsynced and sync status updates

--- Group 4: Business Health Score Algorithm (4 Pillars) ---
  ✓ G4.1: High performance business achieves 100/100 EXCELLENT
  ✓ G4.2: Distressed business with losses & uncollected debt receives AT_RISK
  ✓ G4.3: Cash-only business with zero credit given is not penalized
  ✓ G4.4: Zero floating-point drift across varying scales
  ✓ G4.5: classifyHealthTier boundary coverage

--- Group 5: Revenue Forecasting Engine ---
  ✓ G5.1: Weighted Moving Average calculation
  ✓ G5.2: Exponential Smoothing calculation
  ✓ G5.3: Holt-Winters Linear Trend detects growth rate and direction
  ✓ G5.4: generateSalesForecast creates valid record

--- Group 6: Customer Ranking & Expense Breakdown ---
  ✓ G6.1: calculateCustomerRankings ranks by revenue contribution
  ✓ G6.2: calculateCategoryExpenseBreakdown groups and sorts expenses
  ✓ G6.3: calculateSalesMarginBreakdown computes gross profit & margin

--- Group 7: StorageRepository Multi-Tenant Analytics CRUD & Isolation ---
  ✓ G7.1: saveAnalyticsSnapshot and getAnalyticsSnapshots with tenant isolation
  ✓ G7.2: saveSalesForecast and getLatestSalesForecast with tenant isolation
  ✓ G7.3: computeBusinessHealthMetrics integrates with repo store
  ✓ G7.4: StorageRepository deletion, unsynced queries, and sync updates for analytics
  ✓ G7.5: Standalone exported repository functions operate on defaultRepository

--- Group 8: Multi-Tenant Business Cascade Deletion ---
  ✓ G8.1: deleteBusinessCascade purges analytics snapshots and forecasts for deleted business only

--- Group 9: Cloud Backup Sanitization & Restore Serialization ---
  ✓ G9.1: getFullBackupState sanitizes sensitive fields and includes recordCounts
  ✓ G9.2: commitRestorePayload supports full and selective restore

--- Group 10: End-to-End Workflow & Latency Benchmark ---
  ✓ G10.1: End-to-end MerchantAnalyticsEngine snapshot and forecast generation
    Elapsed for 1,000 iterations: 17 ms
  ✓ G10.2: Performance latency benchmark: 1,000 health calculations and forecasts < 200ms
  ✓ G10.3: Engine aliases and helper methods (rankCustomers, breakdownExpenses, breakdownMargin)

======================================================================
REA-ITER-241 RESULT: 34 / 34 TESTS PASSED (100% GREEN)
======================================================================
```

### 5.2 Performance Latency Benchmark
- **Throughput:** 1,000 end-to-end health calculations and Holt-Winters linear trend projections completed in **17 ms** (well below the 200 ms benchmark requirement).

### 5.3 Regression Verification Matrix
All prior backend test suites were executed to verify zero regression:
- `test_iteration_238_qr_order_backend.js`: **67 / 67 PASSED (100%)**
- `test_iteration_239_loan_credit_backend.js`: **32 / 32 PASSED (100%)**
- `test_iteration_240_rewards_cashback_backend.js`: **37 / 37 PASSED (100%)**
- `test_iteration_241_business_analytics_backend.js`: **34 / 34 PASSED (100%)**

---

## 6. Deliverables & Artifacts Manifest

| File | Description | Ownership |
|---|---|---|
| `src/analyticsSubsystem.js` | Room SQLite schemas, DAOs, financial algorithms, forecasting engine, customer rankings, and expense breakdown | Worker 2 (Averroes) |
| `src/storageRepository.js` | Multi-tenant persistence, collections registration, cascade delete, backup sanitization, and 13 CRUD wrappers | Worker 2 (Averroes) |
| `src/tallyPayService.js` | Clean re-exports of all schemas, constants, models, and analytics engine classes | Worker 2 (Averroes) |
| `test_iteration_241_business_analytics_backend.js` | 34 comprehensive tests across 10 groups, performance latency benchmark | Worker 2 (Averroes) |
| `docs/rea-reconstruction/iterations/ITERATION_241_AVERROES_REPORT.md` | Milestone architectural and delivery report | Worker 2 (Averroes) |

**Git Safety Confirmation:**
- No git commits or pushes executed.
- Working tree preserved; `App.js` untouched (Worker 3 Ohm's exclusive territory).
- Untracked `extracted_apk/` directory remains pristine.
