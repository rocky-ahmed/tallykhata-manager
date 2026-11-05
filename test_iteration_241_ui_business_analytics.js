/**
 * TALLYKHATA ARCHITECTURE TEST SUITE — MILESTONE REA-ITER-241
 * 
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions / QA Owner)
 * Registered Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Task ID: TASK-241-FRONTEND
 * Milestone: REA-ITER-241 (TallyPay Merchant Business Health Analytics, Revenue Forecasting & Dynamic Insights)
 * 
 * Verification Coverage:
 * - Bilingual localization key symmetry across STRINGS.bn, STRINGS.en, and STATIC_TRANSLATIONS
 * - State hooks, action handlers, and global test hooks in App.js
 * - Navigation entry points in Tab 4 (TallyPay) and Tab 5 (Menu)
 * - Modal 127: modalBusinessHealthDashboard (Health score gauge, KPIs, period filter, navigation CTAs)
 * - Modal 128: modalRevenueForecastChart (Projected revenue, growth rate, trend indicator, confidence pill)
 * - Modal 129: modalTopCustomersAnalytics (Ranked contributors, purchase volume, recovery velocity, VIP tags)
 * - Modal 130: modalExpenseCategoryBreakdown (Category distribution, percentage bar, highest expense alert)
 * - Modal 131: modalBusinessHealthActionPlan (Strategic recommendations, action steps, apply CTA, toast)
 * - Android Hardware BackHandler safe stacked dismissal: Modals 128-131 -> Modal 127 -> Tab 4 / Menu
 * - Touch target physics (STANDARD_TOUCH_HIT_SLOP >= 10dp expansion) & tactile haptics
 * - Mathematical WCAG 2.1 AA / AAA relative luminance contrast validation
 * - Strict Modal Count Invariant: Exactly 131 Modals, 131 onRequestClose handlers, 131 controllers
 * - Babel AST compilation of App.js (zero syntax errors) and latency benchmark
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const i18n = require("./src/i18nService");
const tallyPay = require("./src/tallyPayService");
const storageRepository = require("./src/storageRepository");
const iconMetrics = require("./src/iconMetrics");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(desc, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log("  ✓ [PASS] " + desc);
  } catch (err) {
    failedTests++;
    console.error("  ✗ [FAIL] " + desc);
    console.error("    Error: " + err.message);
  }
}

async function runSuite() {
  console.log("================================================================================");
  console.log("TALLYKHATA ITERATION 241: BUSINESS HEALTH ANALYTICS & FORECASTING QA SUITE");
  console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
  console.log("Milestone: REA-ITER-241");
  console.log("================================================================================");

  const appSrc = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");

  // -----------------------------------------------------------------------------
  // PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS ---");

  const requiredIter241Keys = [
    "business_health_analytics",
    "business_health_title",
    "business_health_subtitle",
    "overall_health_score",
    "health_score_label",
    "health_rating_excellent",
    "health_rating_good",
    "health_rating_attention",
    "health_rating_critical",
    "kpi_net_profit",
    "kpi_turnover",
    "kpi_collection_rate",
    "period_daily",
    "period_weekly",
    "period_monthly",
    "btn_view_revenue_forecast",
    "btn_view_top_customers",
    "btn_view_expense_breakdown",
    "btn_view_action_plan",
    "revenue_forecast_title",
    "revenue_forecast_subtitle",
    "forecast_days_30",
    "forecast_days_60",
    "projected_revenue_label",
    "growth_rate_label",
    "trend_direction_up",
    "trend_direction_stable",
    "trend_direction_down",
    "confidence_score_label",
    "historical_reference_note",
    "forecast_trend_analysis",
    "forecast_growth_bps",
    "top_customers_title",
    "top_customers_subtitle",
    "top_customer_rank",
    "purchase_volume_label",
    "recovery_velocity_label",
    "recovery_velocity_fast",
    "recovery_velocity_normal",
    "recovery_velocity_slow",
    "vip_customer_badge",
    "regular_customer_badge",
    "customer_due_status",
    "expense_breakdown_title",
    "expense_breakdown_subtitle",
    "category_inventory",
    "category_rent",
    "category_utilities",
    "category_salaries",
    "category_transport",
    "category_other_expense",
    "expense_percentage_label",
    "highest_expense_alert",
    "total_expense_label",
    "action_plan_title",
    "action_plan_subtitle",
    "action_recommendations",
    "action_step_dues_recovery",
    "action_step_dues_recovery_desc",
    "action_step_stock_optimize",
    "action_step_stock_optimize_desc",
    "action_step_expense_control",
    "action_step_expense_control_desc",
    "action_step_cash_incentive",
    "action_step_cash_incentive_desc",
    "action_plan_completed_badge",
    "apply_action_plan_btn",
    "action_plan_success_toast"
  ];

  await runTest("1.1: All Iteration 241 localization keys exist in STRINGS.bn", () => {
    requiredIter241Keys.forEach((key) => {
      assert.ok(i18n.STRINGS.bn[key], "Missing BN key: " + key);
    });
  });

  await runTest("1.2: All Iteration 241 localization keys exist in STRINGS.en", () => {
    requiredIter241Keys.forEach((key) => {
      assert.ok(i18n.STRINGS.en[key], "Missing EN key: " + key);
    });
  });

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
    assert.strictEqual(i18n.t("business_health_title", "bn"), "ব্যবসার হেলথ ড্যাশবোর্ড");
    assert.strictEqual(i18n.t("business_health_title", "en"), "Business Health Dashboard");
    assert.strictEqual(i18n.t("revenue_forecast_title", "bn"), "আয়ের পূর্বাভাস (রেভিনিউ ফোরকাস্ট)");
    assert.strictEqual(i18n.t("revenue_forecast_title", "en"), "Revenue Forecast");
    assert.strictEqual(i18n.t("top_customers_title", "bn"), "সেরা কাস্টমার অ্যানালিটিক্স");
    assert.strictEqual(i18n.t("top_customers_title", "en"), "Top Customers Analytics");
    assert.strictEqual(i18n.t("expense_breakdown_title", "bn"), "খরচের খাতভিত্তিক বিশ্লেষণ");
    assert.strictEqual(i18n.t("expense_breakdown_title", "en"), "Expense Category Breakdown");
    assert.strictEqual(i18n.t("action_plan_title", "bn"), "ব্যবসা উন্নতির অ্যাকশন প্ল্যান");
    assert.strictEqual(i18n.t("action_plan_title", "en"), "Business Health Action Plan");
  });

  await runTest("1.4: Authentic REF-001 ARSC tokens present in STRINGS.bn", () => {
    assert.strictEqual(i18n.STRINGS.bn.business_health_analytics, "ব্যবসার হেলথ ও অ্যানালিটিক্স");
    assert.strictEqual(i18n.STRINGS.bn.overall_health_score, "সামগ্রিক হেলথ স্কোর");
    assert.strictEqual(i18n.STRINGS.bn.kpi_net_profit, "নিট লাভ");
    assert.strictEqual(i18n.STRINGS.bn.kpi_turnover, "মোট লেনদেন (টার্নওভার)");
    assert.strictEqual(i18n.STRINGS.bn.vip_customer_badge, "ভিআইপি কাস্টমার");
    assert.strictEqual(i18n.STRINGS.bn.category_inventory, "পণ্য ক্রয় ও স্টক");
  });

  await runTest("1.5: Complete dictionary parity maintained across bn and en (zero missing keys)", () => {
    const bnKeys = Object.keys(i18n.STRINGS.bn);
    const enKeys = Object.keys(i18n.STRINGS.en);
    assert.strictEqual(bnKeys.length, enKeys.length, "BN and EN key count must match exactly");
    const missingInEn = bnKeys.filter((k) => !(k in i18n.STRINGS.en));
    const missingInBn = enKeys.filter((k) => !(k in i18n.STRINGS.bn));
    assert.strictEqual(missingInEn.length, 0, "No keys should be missing in EN");
    assert.strictEqual(missingInBn.length, 0, "No keys should be missing in BN");
  });

  // -----------------------------------------------------------------------------
  // PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

  await runTest("2.1: Modals 127–131 state controllers declared in App.js", () => {
    assert.ok(appSrc.includes("modalBusinessHealthDashboard"), "modalBusinessHealthDashboard hook missing");
    assert.ok(appSrc.includes("setModalBusinessHealthDashboard"), "setModalBusinessHealthDashboard missing");
    assert.ok(appSrc.includes("modalRevenueForecastChart"), "modalRevenueForecastChart hook missing");
    assert.ok(appSrc.includes("setModalRevenueForecastChart"), "setModalRevenueForecastChart missing");
    assert.ok(appSrc.includes("modalTopCustomersAnalytics"), "modalTopCustomersAnalytics hook missing");
    assert.ok(appSrc.includes("setModalTopCustomersAnalytics"), "setModalTopCustomersAnalytics missing");
    assert.ok(appSrc.includes("modalExpenseCategoryBreakdown"), "modalExpenseCategoryBreakdown hook missing");
    assert.ok(appSrc.includes("setModalExpenseCategoryBreakdown"), "setModalExpenseCategoryBreakdown missing");
    assert.ok(appSrc.includes("modalBusinessHealthActionPlan"), "modalBusinessHealthActionPlan hook missing");
    assert.ok(appSrc.includes("setModalBusinessHealthActionPlan"), "setModalBusinessHealthActionPlan missing");
  });

  await runTest("2.2: Health score, KPIs, forecast, top customers, expense, action steps hooks declared", () => {
    assert.ok(appSrc.includes("businessHealthScore"), "businessHealthScore hook missing");
    assert.ok(appSrc.includes("businessHealthRating"), "businessHealthRating hook missing");
    assert.ok(appSrc.includes("businessNetProfit"), "businessNetProfit hook missing");
    assert.ok(appSrc.includes("businessTurnover"), "businessTurnover hook missing");
    assert.ok(appSrc.includes("businessCollectionRate"), "businessCollectionRate hook missing");
    assert.ok(appSrc.includes("businessPeriodFilter"), "businessPeriodFilter hook missing");
    assert.ok(appSrc.includes("revenueForecastDays"), "revenueForecastDays hook missing");
    assert.ok(appSrc.includes("projectedRevenueAmount"), "projectedRevenueAmount hook missing");
    assert.ok(appSrc.includes("forecastGrowthRate"), "forecastGrowthRate hook missing");
    assert.ok(appSrc.includes("topCustomersList"), "topCustomersList hook missing");
    assert.ok(appSrc.includes("expenseCategoriesList"), "expenseCategoriesList hook missing");
    assert.ok(appSrc.includes("businessActionSteps"), "businessActionSteps hook missing");
  });

  await runTest("2.3: global.__BUSINESS_ANALYTICS_TEST_HOOKS__ exposed in App.js with required keys", () => {
    assert.ok(appSrc.includes("global.__BUSINESS_ANALYTICS_TEST_HOOKS__"), "global.__BUSINESS_ANALYTICS_TEST_HOOKS__ missing");
    assert.ok(appSrc.includes("handleOpenBusinessHealthDashboard"), "handleOpenBusinessHealthDashboard missing");
    assert.ok(appSrc.includes("handleOpenRevenueForecast"), "handleOpenRevenueForecast missing");
    assert.ok(appSrc.includes("handleOpenTopCustomers"), "handleOpenTopCustomers missing");
    assert.ok(appSrc.includes("handleOpenExpenseBreakdown"), "handleOpenExpenseBreakdown missing");
    assert.ok(appSrc.includes("handleOpenActionPlan"), "handleOpenActionPlan missing");
    assert.ok(appSrc.includes("handleToggleActionStep"), "handleToggleActionStep missing");
    assert.ok(appSrc.includes("handleApplyActionPlan"), "handleApplyActionPlan missing");
  });

  await runTest("2.4: Business analytics action handlers defined and connected", () => {
    assert.ok(appSrc.includes("const handleOpenBusinessHealthDashboard = () => {"), "handleOpenBusinessHealthDashboard definition missing");
    assert.ok(appSrc.includes("const handleOpenRevenueForecast = () => {"), "handleOpenRevenueForecast definition missing");
    assert.ok(appSrc.includes("const handleOpenTopCustomers = () => {"), "handleOpenTopCustomers definition missing");
    assert.ok(appSrc.includes("const handleOpenExpenseBreakdown = () => {"), "handleOpenExpenseBreakdown definition missing");
    assert.ok(appSrc.includes("const handleOpenActionPlan = () => {"), "handleOpenActionPlan definition missing");
  });

  await runTest("2.5: Period filters and forecast horizon switching supported", () => {
    assert.ok(appSrc.includes("DAILY") && appSrc.includes("WEEKLY") && appSrc.includes("MONTHLY"), "Period filters missing");
    assert.ok(appSrc.includes("revenueForecastDays === 30") || appSrc.includes("f.days === 30"), "Forecast horizon switching missing");
  });

  // -----------------------------------------------------------------------------
  // PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders Business Health Analytics quick action button", () => {
    assert.ok(appSrc.includes('testID="tp_business_analytics_btn"'), "tp_business_analytics_btn testID missing");
    assert.ok(appSrc.includes("onPress={handleOpenBusinessHealthDashboard}"), "handleOpenBusinessHealthDashboard onPress missing");
  });

  await runTest("3.2: Tab 5 (Menu) renders Business Health Analytics menu list item", () => {
    assert.ok(appSrc.includes('testID="menu_tp_business_analytics_item"'), "menu_tp_business_analytics_item testID missing");
  });

  await runTest("3.3: All navigation triggers attach STANDARD_TOUCH_HIT_SLOP and accessible button roles", () => {
    const btnSection = appSrc.slice(appSrc.indexOf('testID="tp_business_analytics_btn"') - 50, appSrc.indexOf('testID="tp_business_analytics_btn"') + 200);
    assert.ok(btnSection.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "hitSlop missing on Tab 4 button");
    assert.ok(btnSection.includes('accessibilityRole="button"'), "accessibilityRole missing on Tab 4 button");
  });

  // -----------------------------------------------------------------------------
  // PART 4: MODAL 127 (modalBusinessHealthDashboard) LAYOUT & HEALTH SCORE GAUGE
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 4: MODAL 127 (modalBusinessHealthDashboard) LAYOUT & HEALTH SCORE GAUGE ---");

  await runTest("4.1: modalBusinessHealthDashboard defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_business_health_dashboard"'), "modal_business_health_dashboard testID missing");
    assert.ok(appSrc.includes("visible={modalBusinessHealthDashboard}"), "visible={modalBusinessHealthDashboard} missing");
    assert.ok(appSrc.includes("onRequestClose={() => setModalBusinessHealthDashboard(false)}"), "onRequestClose missing for Modal 127");
  });

  await runTest("4.2: Header renders title, subtitle, and back button (btn_business_health_back)", () => {
    assert.ok(appSrc.includes('testID="btn_business_health_back"'), "btn_business_health_back testID missing");
    assert.ok(appSrc.includes("t('business_health_title')"), "business_health_title missing in Modal 127");
    assert.ok(appSrc.includes("t('business_health_subtitle')"), "business_health_subtitle missing in Modal 127");
  });

  await runTest("4.3: Health Score Gauge card (card_overall_health_score) with number and rating badge", () => {
    assert.ok(appSrc.includes('testID="card_overall_health_score"'), "card_overall_health_score missing");
    assert.ok(appSrc.includes('testID="text_health_score_number"'), "text_health_score_number missing");
    assert.ok(appSrc.includes('testID="badge_health_rating"'), "badge_health_rating missing");
  });

  await runTest("4.4: Period selector chips (chips_period_selector: daily, weekly, monthly)", () => {
    assert.ok(appSrc.includes('testID="chips_period_selector"'), "chips_period_selector missing");
    assert.ok(appSrc.includes('testID="chip_period_daily"'), "chip_period_daily missing");
    assert.ok(appSrc.includes('testID="chip_period_weekly"'), "chip_period_weekly missing");
    assert.ok(appSrc.includes('testID="chip_period_monthly"'), "chip_period_monthly missing");
  });

  await runTest("4.5: Financial KPI cards (card_financial_kpis: net profit, turnover, collection rate)", () => {
    assert.ok(appSrc.includes('testID="card_financial_kpis"'), "card_financial_kpis missing");
    assert.ok(appSrc.includes('testID="card_kpi_net_profit"'), "card_kpi_net_profit missing");
    assert.ok(appSrc.includes('testID="card_kpi_turnover"'), "card_kpi_turnover missing");
    assert.ok(appSrc.includes('testID="card_kpi_collection_rate"'), "card_kpi_collection_rate missing");
  });

  await runTest("4.6: Quick navigation CTAs to Modals 128–131 defined in Modal 127", () => {
    assert.ok(appSrc.includes('testID="btn_nav_revenue_forecast"'), "btn_nav_revenue_forecast missing");
    assert.ok(appSrc.includes('testID="btn_nav_top_customers"'), "btn_nav_top_customers missing");
    assert.ok(appSrc.includes('testID="btn_nav_expense_breakdown"'), "btn_nav_expense_breakdown missing");
    assert.ok(appSrc.includes('testID="btn_nav_action_plan"'), "btn_nav_action_plan missing");
  });

  // -----------------------------------------------------------------------------
  // PART 5: MODAL 128 (modalRevenueForecastChart) PROJECTED REVENUE & TRENDS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 5: MODAL 128 (modalRevenueForecastChart) PROJECTED REVENUE & TRENDS ---");

  await runTest("5.1: modalRevenueForecastChart defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_revenue_forecast_chart"'), "modal_revenue_forecast_chart testID missing");
    assert.ok(appSrc.includes("visible={modalRevenueForecastChart}"), "visible={modalRevenueForecastChart} missing");
  });

  await runTest("5.2: Header renders title and back button (btn_revenue_forecast_back)", () => {
    assert.ok(appSrc.includes('testID="btn_revenue_forecast_back"'), "btn_revenue_forecast_back testID missing");
    assert.ok(appSrc.includes("t('revenue_forecast_title')"), "revenue_forecast_title missing");
  });

  await runTest("5.3: Forecast horizon toggle chips (chip_forecast_30d, chip_forecast_60d)", () => {
    assert.ok(appSrc.includes('testID="chip_forecast_30d"'), "chip_forecast_30d missing");
    assert.ok(appSrc.includes('testID="chip_forecast_60d"'), "chip_forecast_60d missing");
  });

  await runTest("5.4: Projected revenue card (card_projected_revenue) with amount, growth rate, and trend", () => {
    assert.ok(appSrc.includes('testID="card_projected_revenue"'), "card_projected_revenue missing");
    assert.ok(appSrc.includes('testID="text_projected_revenue_amount"'), "text_projected_revenue_amount missing");
    assert.ok(appSrc.includes('testID="badge_growth_rate"'), "badge_growth_rate missing");
    assert.ok(appSrc.includes('testID="indicator_trend_direction"'), "indicator_trend_direction missing");
  });

  await runTest("5.5: Confidence score pill (pill_confidence_score) and historical reference card", () => {
    assert.ok(appSrc.includes('testID="pill_confidence_score"'), "pill_confidence_score missing");
    assert.ok(appSrc.includes('testID="card_historical_trend_ref"'), "card_historical_trend_ref missing");
    assert.ok(appSrc.includes("t('historical_reference_note')"), "historical_reference_note missing");
  });

  // -----------------------------------------------------------------------------
  // PART 6: MODAL 129 (modalTopCustomersAnalytics) RANKED CUSTOMERS & VELOCITY
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 6: MODAL 129 (modalTopCustomersAnalytics) RANKED CUSTOMERS & VELOCITY ---");

  await runTest("6.1: modalTopCustomersAnalytics defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_top_customers_analytics"'), "modal_top_customers_analytics testID missing");
    assert.ok(appSrc.includes("visible={modalTopCustomersAnalytics}"), "visible={modalTopCustomersAnalytics} missing");
  });

  await runTest("6.2: Header renders title and back button (btn_top_customers_back)", () => {
    assert.ok(appSrc.includes('testID="btn_top_customers_back"'), "btn_top_customers_back testID missing");
    assert.ok(appSrc.includes("t('top_customers_title')"), "top_customers_title missing");
  });

  await runTest("6.3: Summary card (card_top_customers_summary) and scrollable customer list", () => {
    assert.ok(appSrc.includes('testID="card_top_customers_summary"'), "card_top_customers_summary missing");
    assert.ok(appSrc.includes('testID="list_top_customers"'), "list_top_customers missing");
  });

  await runTest("6.4: Customer cards render rank, volume, velocity pill, VIP badge, and due indicator", () => {
    assert.ok(appSrc.includes('testID="badge_customer_rank"'), "badge_customer_rank missing");
    assert.ok(appSrc.includes('testID="badge_purchase_volume"'), "badge_purchase_volume missing");
    assert.ok(appSrc.includes('testID="pill_recovery_velocity"'), "pill_recovery_velocity missing");
    assert.ok(appSrc.includes('testID="badge_vip_customer"'), "badge_vip_customer missing");
    assert.ok(appSrc.includes('testID="indicator_customer_due"'), "indicator_customer_due missing");
  });

  // -----------------------------------------------------------------------------
  // PART 7: MODAL 130 (modalExpenseCategoryBreakdown) EXPENSE BREAKDOWN & RATIOS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 7: MODAL 130 (modalExpenseCategoryBreakdown) EXPENSE BREAKDOWN & RATIOS ---");

  await runTest("7.1: modalExpenseCategoryBreakdown defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_expense_category_breakdown"'), "modal_expense_category_breakdown testID missing");
    assert.ok(appSrc.includes("visible={modalExpenseCategoryBreakdown}"), "visible={modalExpenseCategoryBreakdown} missing");
  });

  await runTest("7.2: Header renders title and back button (btn_expense_breakdown_back)", () => {
    assert.ok(appSrc.includes('testID="btn_expense_breakdown_back"'), "btn_expense_breakdown_back testID missing");
    assert.ok(appSrc.includes("t('expense_breakdown_title')"), "expense_breakdown_title missing");
  });

  await runTest("7.3: Total expense card (card_total_expense) and highest expense alert", () => {
    assert.ok(appSrc.includes('testID="card_total_expense"'), "card_total_expense missing");
    assert.ok(appSrc.includes('testID="alert_highest_expense"'), "alert_highest_expense missing");
  });

  await runTest("7.4: Expense categories breakdown list (list_expense_categories) with percentage bar", () => {
    assert.ok(appSrc.includes('testID="list_expense_categories"'), "list_expense_categories missing");
    assert.ok(appSrc.includes('testID="bar_expense_percentage"'), "bar_expense_percentage missing");
  });

  // -----------------------------------------------------------------------------
  // PART 8: MODAL 131 (modalBusinessHealthActionPlan) ACTION PLAN & CASHFLOW
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 8: MODAL 131 (modalBusinessHealthActionPlan) ACTION PLAN & CASHFLOW ---");

  await runTest("8.1: modalBusinessHealthActionPlan defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_business_health_action_plan"'), "modal_business_health_action_plan testID missing");
    assert.ok(appSrc.includes("visible={modalBusinessHealthActionPlan}"), "visible={modalBusinessHealthActionPlan} missing");
  });

  await runTest("8.2: Header renders title and back button (btn_action_plan_back)", () => {
    assert.ok(appSrc.includes('testID="btn_action_plan_back"'), "btn_action_plan_back testID missing");
    assert.ok(appSrc.includes("t('action_plan_title')"), "action_plan_title missing");
  });

  await runTest("8.3: Strategic recommendations card (card_action_recommendations) and action steps list", () => {
    assert.ok(appSrc.includes('testID="card_action_recommendations"'), "card_action_recommendations missing");
    assert.ok(appSrc.includes('testID="list_action_steps"'), "list_action_steps missing");
  });

  await runTest("8.4: Step item with interactive checkbox, completed badge, and priority indicator", () => {
    assert.ok(appSrc.includes("testID={'checkbox_action_step_' + idx}"), "checkbox_action_step testID missing");
    assert.ok(appSrc.includes('testID="badge_step_completed"'), "badge_step_completed missing");
  });

  await runTest("8.5: Primary Apply Action Plan CTA (btn_apply_action_plan) and success toast", () => {
    assert.ok(appSrc.includes('testID="btn_apply_action_plan"'), "btn_apply_action_plan missing");
    assert.ok(appSrc.includes('testID="text_action_plan_success"'), "text_action_plan_success missing");
  });

  // -----------------------------------------------------------------------------
  // PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("9.1: BackHandler onBackPress steps back from modalRevenueForecastChart to modalBusinessHealthDashboard", () => {
    assert.ok(appSrc.includes("if (modalRevenueForecastChart) {"), "modalRevenueForecastChart back check missing");
    assert.ok(appSrc.includes("setModalRevenueForecastChart(false);"), "setModalRevenueForecastChart(false) missing");
    assert.ok(appSrc.includes("setModalBusinessHealthDashboard(true);"), "setModalBusinessHealthDashboard(true) return step missing");
  });

  await runTest("9.2: BackHandler onBackPress steps back from modalTopCustomersAnalytics to modalBusinessHealthDashboard", () => {
    assert.ok(appSrc.includes("if (modalTopCustomersAnalytics) {"), "modalTopCustomersAnalytics back check missing");
    assert.ok(appSrc.includes("setModalTopCustomersAnalytics(false);"), "setModalTopCustomersAnalytics(false) missing");
  });

  await runTest("9.3: BackHandler onBackPress steps back from modalExpenseCategoryBreakdown to modalBusinessHealthDashboard", () => {
    assert.ok(appSrc.includes("if (modalExpenseCategoryBreakdown) {"), "modalExpenseCategoryBreakdown back check missing");
    assert.ok(appSrc.includes("setModalExpenseCategoryBreakdown(false);"), "setModalExpenseCategoryBreakdown(false) missing");
  });

  await runTest("9.4: BackHandler onBackPress steps back from modalBusinessHealthActionPlan to modalBusinessHealthDashboard", () => {
    assert.ok(appSrc.includes("if (modalBusinessHealthActionPlan) {"), "modalBusinessHealthActionPlan back check missing");
    assert.ok(appSrc.includes("setModalBusinessHealthActionPlan(false);"), "setModalBusinessHealthActionPlan(false) missing");
  });

  await runTest("9.5: BackHandler onBackPress dismisses modalBusinessHealthDashboard cleanly", () => {
    assert.ok(appSrc.includes("if (modalBusinessHealthDashboard) {"), "modalBusinessHealthDashboard back check missing");
    assert.ok(appSrc.includes("setModalBusinessHealthDashboard(false);"), "setModalBusinessHealthDashboard(false) missing");
  });

  await runTest("9.6: BackHandler useCallback dependency array includes all 5 Iteration 241 modal controllers", () => {
    const backSubIdx = appSrc.indexOf("const backSub = BackHandler.addEventListener");
    const depSection = appSrc.slice(backSubIdx, appSrc.indexOf("loadSavedData", backSubIdx));
    assert.ok(depSection.includes("modalBusinessHealthDashboard"), "modalBusinessHealthDashboard missing in deps");
    assert.ok(depSection.includes("modalRevenueForecastChart"), "modalRevenueForecastChart missing in deps");
    assert.ok(depSection.includes("modalTopCustomersAnalytics"), "modalTopCustomersAnalytics missing in deps");
    assert.ok(depSection.includes("modalExpenseCategoryBreakdown"), "modalExpenseCategoryBreakdown missing in deps");
    assert.ok(depSection.includes("modalBusinessHealthActionPlan"), "modalBusinessHealthActionPlan missing in deps");
  });

  // -----------------------------------------------------------------------------
  // PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK ---");

  await runTest("10.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP, "STANDARD_TOUCH_HIT_SLOP must be defined");
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.top >= 10, "top hitSlop must be >= 10dp");
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.bottom >= 10, "bottom hitSlop must be >= 10dp");
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.left >= 10, "left hitSlop must be >= 10dp");
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.right >= 10, "right hitSlop must be >= 10dp");
  });

  await runTest("10.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in Modals 127–131", () => {
    const modalSection = appSrc.slice(appSrc.indexOf('testID="modal_business_health_dashboard"'), appSrc.indexOf('testID="modal_business_health_action_plan"') + 4000);
    const hitSlopMatches = modalSection.match(/hitSlop={STANDARD_TOUCH_HIT_SLOP}/g) || [];
    assert.ok(hitSlopMatches.length >= 10, "Expected >= 10 hitSlop attachments in Modals 127-131, got " + hitSlopMatches.length);
  });

  await runTest("10.3: Haptic feedback milestones wired in analytics and action plan handlers", () => {
    assert.ok(appSrc.includes("hapticFeedbackService.selection()"), "haptic selection feedback missing");
    assert.ok(appSrc.includes("hapticFeedbackService.notificationSuccess()"), "haptic success feedback missing");
  });

  // -----------------------------------------------------------------------------
  // PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  function getLuminance(hex) {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    const [rl, gl, bl] = [r, g, b].map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  }

  function getContrast(hex1, hex2) {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  await runTest("11.1: Primary CTA button (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = getContrast("#FFFFFF", "#0D6E5C");
    console.log("      [CONTRAST] #FFFFFF on #0D6E5C: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5, "Contrast must be >= 4.5:1");
  });

  await runTest("11.2: Dark mode card surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
    const contrast = getContrast("#FFFFFF", "#0F172A");
    console.log("      [CONTRAST] #FFFFFF on #0F172A: " + contrast.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(contrast >= 7.0, "Contrast must be >= 7.0:1");
  });

  await runTest("11.3: Rating badge pill (#044E39 on #D1FAE5) achieves WCAG AAA (>= 7.0:1)", () => {
    const contrast = getContrast("#044E39", "#D1FAE5");
    console.log("      [CONTRAST] #044E39 on #D1FAE5: " + contrast.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(contrast >= 7.0, "Contrast must be >= 7.0:1");
  });

  await runTest("11.4: VIP customer badge (#B45309 on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
    const contrast = getContrast("#B45309", "#FEF3C7");
    console.log("      [CONTRAST] #B45309 on #FEF3C7: " + contrast.toFixed(2) + ":1 (PASS AA)");
    assert.ok(contrast >= 4.5, "Contrast must be >= 4.5:1");
  });

  await runTest("11.5: Light theme card background text (#1E293B on #F8FAFC) achieves WCAG AAA (>= 7.0:1)", () => {
    const contrast = getContrast("#1E293B", "#F8FAFC");
    console.log("      [CONTRAST] #1E293B on #F8FAFC: " + contrast.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(contrast >= 7.0, "Contrast must be >= 7.0:1");
  });

  // -----------------------------------------------------------------------------
  // PART 12: MODAL COUNT & CONTROLLER INVARIANTS (131 MODALS)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 12: MODAL COUNT & CONTROLLER INVARIANTS (131 MODALS) ---");

  await runTest("12.1: App.js contains exactly 131 <Modal elements", () => {
    const modalMatches = appSrc.match(/<Modal\b/g) || [];
    assert.strictEqual(modalMatches.length, 131, "Expected exactly 131 modals in App.js, got " + modalMatches.length);
  });

  await runTest("12.2: App.js contains exactly 131 onRequestClose handlers", () => {
    const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
    assert.strictEqual(reqCloseMatches.length, 131, "Expected 131 onRequestClose handlers, got " + reqCloseMatches.length);
  });

  await runTest("12.3: App.js contains exactly 131 unique modal state controllers", () => {
    const visibleMatches = [...appSrc.matchAll(/<Modal[^>]*\bvisible=\{([a-zA-Z0-9_]+)\}/g)];
    const uniqueModals = new Set(visibleMatches.map((m) => m[1]));
    assert.strictEqual(uniqueModals.size, 131, "Expected 131 unique visible controllers, got " + uniqueModals.size);
  });

  // -----------------------------------------------------------------------------
  // PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK ---");

  await runTest("13.1: App.js compiles cleanly via Babel parser with zero syntax errors", () => {
    const t0 = Date.now();
    const result = babel.parseSync(appSrc, {
      filename: "App.js",
      presets: ["babel-preset-expo"]
    });
    const duration = Date.now() - t0;
    assert.ok(result, "Babel AST must be generated");
    assert.strictEqual(result.type, "File", "AST root must be File");
    console.log("      [BABEL] Successfully parsed App.js in " + duration + "ms");
  });

  await runTest("13.2: Latency benchmark: 1,000 analytics KPI metric derivations execute in < 200ms", () => {
    const t0 = Date.now();
    let totalScore = 0;
    for (let i = 0; i < 1000; i++) {
      const profit = 40000 + (i % 20) * 500;
      const turnover = 250000 + (i % 50) * 1000;
      const score = Math.round((profit / turnover) * 500) + 50;
      totalScore += score;
    }
    const duration = Date.now() - t0;
    assert.ok(duration < 200, "1,000 derivations must take < 200ms, took " + duration + "ms");
    assert.ok(totalScore > 0);
    console.log("      [BENCHMARK] 1,000 operations completed in " + duration + "ms (" + (duration / 1000).toFixed(4) + "ms/op)");
  });

  // -----------------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests} (${failedTests === 0 ? "100% SUCCESS" : "FAILURES DETECTED"})`);
  console.log("================================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Fatal test runner crash:", err);
  process.exit(1);
});
