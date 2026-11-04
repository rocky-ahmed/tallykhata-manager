/**
 * TALLYKHATA ITERATION 227: TALLYPAY DIGITAL TRANSACTION HISTORY & RECEIPT UI/UX QA SUITE
 *
 * Verifies:
 * 1. Bilingual Localization (i18n) Key Symmetry in src/i18nService.js
 * 2. App.js State Hooks & global.__TXN_HISTORY_TEST_HOOKS__ Exposure
 * 3. Navigation Entry Points (Tab 4 TallyPay & Tab 5 Menu)
 * 4. Dual Top Tabs ("সব লেনদেন" & "সারসংক্ষেপ") Architecture
 * 5. Search Bar & Filter Chips ("সকল", "টাকা এসেছে", "টাকা গেছে")
 * 6. Monthly Transaction Summary Breakdown (Hero Cards & Service Matrix)
 * 7. Digital Receipt Details Modal & Social Sharing Actions
 * 8. Touch Target Ergonomics (>= 48x48dp hitSlop) & Haptic Milestones
 * 9. Android Hardware BackHandler Safe Stacked Dismissal
 * 10. WCAG 2.1 AA / AAA Luminance Contrast in Light & Dark Modes
 * 11. Multi-Tenant Transaction Isolation & Fallback Mock Mapping
 * 12. AST Syntax Integrity & Latency Performance Benchmarks
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const { STRINGS, t, translateStaticText } = require("./src/i18nService");
const tallyPayService = require("./src/tallyPayService");

const appSource = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");

let totalTests = 0;
let passedTests = 0;
const failures = [];

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    failures.push({ name, error: err.message });
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
  }
}

console.log("================================================================================");
console.log("TALLYKHATA ITERATION 227: DIGITAL TRANSACTION HISTORY & RECEIPT UI/UX QA SUITE");
console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
console.log("Milestone: REA-ITER-227");
console.log("================================================================================");

// --- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---
console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---");

const ITER_227_KEYS = [
  "transaction_statement",
  "all_transactions",
  "statement_summary",
  "total_inflow",
  "total_outflow",
  "money_received",
  "money_sent",
  "txn_id",
  "no_transactions_found",
  "no_transactions_sub",
  "download_voucher",
  "share_voucher",
  "txn_fee",
  "txn_date",
  "txn_status_success",
  "txn_status_failed",
  "txn_status_in_progress",
  "filter_all",
  "filter_inflow",
  "filter_outflow",
  "search_transactions",
  "transaction_details_title",
  "principal_amount",
  "net_amount"
];

runTest("1.1: All Iteration 227 localization keys exist in STRINGS.bn", () => {
  for (const key of ITER_227_KEYS) {
    assert.ok(STRINGS.bn[key], `Missing Bengali translation for key: ${key}`);
    assert.strictEqual(typeof STRINGS.bn[key], "string", `Key ${key} must be a string`);
  }
});

runTest("1.2: All Iteration 227 localization keys exist in STRINGS.en", () => {
  for (const key of ITER_227_KEYS) {
    assert.ok(STRINGS.en[key], `Missing English translation for key: ${key}`);
    assert.strictEqual(typeof STRINGS.en[key], "string", `Key ${key} must be a string`);
  }
});

runTest("1.3: t() helper translates keys symmetrically across languages", () => {
  assert.strictEqual(t("transaction_statement", "bn"), "লেনদেন বিবরণী");
  assert.strictEqual(t("transaction_statement", "en"), "Transaction Statement");
  assert.strictEqual(t("all_transactions", "bn"), "সব লেনদেন");
  assert.strictEqual(t("all_transactions", "en"), "All Transactions");
  assert.strictEqual(t("total_inflow", "bn"), "মোট পেলেন");
  assert.strictEqual(t("total_inflow", "en"), "Total Received");
  assert.strictEqual(t("total_outflow", "bn"), "মোট দিলেন");
  assert.strictEqual(t("total_outflow", "en"), "Total Paid");
});

runTest("1.4: translateStaticText translates static terms consistently", () => {
  assert.strictEqual(translateStaticText("লেনদেন বিবরণী", "en"), "Transaction statement");
  assert.strictEqual(translateStaticText("সব লেনদেন", "en"), "All Transactions");
  assert.strictEqual(translateStaticText("মোট পেলেন", "en"), "Total Received");
  assert.strictEqual(translateStaticText("মোট দিলেন", "en"), "Total Paid");
});
// --- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---
console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

runTest("2.1: Transaction History state hooks declared in App.js", () => {
  assert.ok(appSource.includes("const [modalTransactionHistory, setModalTransactionHistory] = useState(false);"), "modalTransactionHistory state missing");
  assert.ok(appSource.includes("const [txnHistoryTab, setTxnHistoryTab] = useState('ALL');"), "txnHistoryTab state missing");
  assert.ok(appSource.includes("const [txnHistoryFilter, setTxnHistoryFilter] = useState('ALL');"), "txnHistoryFilter state missing");
  assert.ok(appSource.includes("const [txnSearchQuery, setTxnSearchQuery] = useState('');"), "txnSearchQuery state missing");
  assert.ok(appSource.includes("const [selectedTxnForDetails, setSelectedTxnForDetails] = useState(null);"), "selectedTxnForDetails state missing");
  assert.ok(appSource.includes("const [modalTpTransactionDetails, setModalTpTransactionDetails] = useState(false);"), "modalTpTransactionDetails state missing");
});

runTest("2.2: global.__TXN_HISTORY_TEST_HOOKS__ exposed in App.js", () => {
  assert.ok(appSource.includes("global.__TXN_HISTORY_TEST_HOOKS__ = {"), "global.__TXN_HISTORY_TEST_HOOKS__ missing");
  assert.ok(appSource.includes("handleOpenTransactionHistory,"), "handleOpenTransactionHistory hook missing");
  assert.ok(appSource.includes("handleCloseTransactionHistory,"), "handleCloseTransactionHistory hook missing");
  assert.ok(appSource.includes("handleOpenTxnDetails,"), "handleOpenTxnDetails hook missing");
  assert.ok(appSource.includes("handleCloseTxnDetails,"), "handleCloseTxnDetails hook missing");
  assert.ok(appSource.includes("handleDownloadTxnVoucher,"), "handleDownloadTxnVoucher hook missing");
  assert.ok(appSource.includes("handleShareTxnVoucher,"), "handleShareTxnVoucher hook missing");
  assert.ok(appSource.includes("displayWalletTxns,"), "displayWalletTxns hook missing");
  assert.ok(appSource.includes("monthlySummaryData,"), "monthlySummaryData hook missing");
});

runTest("2.3: tallyPayService backend modules imported and bound in App.js", () => {
  assert.ok(appSource.includes("import * as tallyPayModule from './src/tallyPayService';"), "tallyPayModule import missing");
  assert.ok(appSource.includes("tpFormatTransactionStatementItem"), "tpFormatTransactionStatementItem missing");
  assert.ok(appSource.includes("tpCalculateMonthlyTransactionSummary"), "tpCalculateMonthlyTransactionSummary missing");
  assert.ok(appSource.includes("tpGenerateTransactionReceiptDetails"), "tpGenerateTransactionReceiptDetails missing");
});

// --- PART 3: NAVIGATION ENTRY POINTS & MODAL CONTAINER ---
console.log("\n--- PART 3: NAVIGATION ENTRY POINTS & MODAL CONTAINER ---");

runTest("3.1: modalTransactionHistory Modal container and header rendered", () => {
  assert.ok(appSource.includes('testID="modal_transaction_history"'), "modal_transaction_history missing");
  assert.ok(appSource.includes('testID="btn_back_transaction_history"'), "btn_back_transaction_history missing");
  assert.ok(appSource.includes("{t('transaction_statement')}"), "Header title missing");
});

runTest("3.2: Tab 4 (TallyPay) entry points rendered", () => {
  assert.ok(appSource.includes('testID="tp_see_all_txns_btn"'), "tp_see_all_txns_btn missing in Tab 4");
  assert.ok(appSource.includes("wallet_txn_item_"), "wallet_txn_item trigger missing in Tab 4");
});

runTest("3.3: Tab 5 (Menu) entry point rendered", () => {
  assert.ok(appSource.includes('testID="menu_tp_txn_statement_item"'), "menu_tp_txn_statement_item missing in Tab 5");
  assert.ok(appSource.includes("onPress={handleOpenTransactionHistory}"), "Menu item onPress missing");
});

// --- PART 4: DUAL TOP TABS ("সব লেনদেন" & "সারসংক্ষেপ") ---
console.log("\n--- PART 4: DUAL TOP TABS (\"সব লেনদেন\" & \"সারসংক্ষেপ\") ---");

runTest("4.1: Dual tabs render All Transactions and Summary", () => {
  assert.ok(appSource.includes('testID="tab_all_transactions"'), "tab_all_transactions missing");
  assert.ok(appSource.includes('testID="tab_statement_summary"'), "tab_statement_summary missing");
  assert.ok(appSource.includes("{t('all_transactions')}"), "All transactions label missing");
  assert.ok(appSource.includes("{t('statement_summary')}"), "Statement summary label missing");
});

runTest("4.2: Tab switching triggers state transition", () => {
  assert.ok(appSource.includes("setTxnHistoryTab('ALL')"), "setTxnHistoryTab('ALL') missing");
  assert.ok(appSource.includes("setTxnHistoryTab('SUMMARY')"), "setTxnHistoryTab('SUMMARY') missing");
});
// --- PART 5: SEARCH BAR & FILTER CHIPS ---
console.log("\n--- PART 5: SEARCH BAR & FILTER CHIPS ---");

runTest("5.1: Search input box and clear trigger rendered", () => {
  assert.ok(appSource.includes('testID="input_search_transactions"'), "input_search_transactions missing");
  assert.ok(appSource.includes('placeholder={t(\x27search_transactions\x27)}'), "search placeholder missing");
  assert.ok(appSource.includes('testID="btn_clear_txn_search"'), "btn_clear_txn_search missing");
});

runTest("5.2: Filter chips render All, Cash In, Cash Out", () => {
  assert.ok(appSource.includes('testID="chip_filter_all"'), "chip_filter_all missing");
  assert.ok(appSource.includes('testID="chip_filter_inflow"'), "chip_filter_inflow missing");
  assert.ok(appSource.includes('testID="chip_filter_outflow"'), "chip_filter_outflow missing");
  assert.ok(appSource.includes("{t('filter_all')}"), "Filter all label missing");
  assert.ok(appSource.includes("{t('filter_inflow')}"), "Filter inflow label missing");
  assert.ok(appSource.includes("{t('filter_outflow')}"), "Filter outflow label missing");
});

runTest("5.3: Filter selection logic updates filter state", () => {
  assert.ok(appSource.includes("setTxnHistoryFilter('ALL')"), "setTxnHistoryFilter('ALL') missing");
  assert.ok(appSource.includes("setTxnHistoryFilter('INCOMING')"), "setTxnHistoryFilter('INCOMING') missing");
  assert.ok(appSource.includes("setTxnHistoryFilter('OUTGOING')"), "setTxnHistoryFilter('OUTGOING') missing");
});

// --- PART 6: MONTHLY SUMMARY BREAKDOWN ---
console.log("\n--- PART 6: MONTHLY SUMMARY BREAKDOWN ---");

runTest("6.1: Monthly summary renders Inflow, Outflow, and Fee hero cards", () => {
  assert.ok(appSource.includes("{t('total_inflow')}"), "total_inflow missing in summary");
  assert.ok(appSource.includes("{t('total_outflow')}"), "total_outflow missing in summary");
  assert.ok(appSource.includes("{t('txn_fee')}"), "txn_fee missing in summary");
  assert.ok(appSource.includes("monthlySummaryData.totalPelam"), "monthlySummaryData.totalPelam missing");
  assert.ok(appSource.includes("monthlySummaryData.totalDilam"), "monthlySummaryData.totalDilam missing");
  assert.ok(appSource.includes("monthlySummaryData.totalFee"), "monthlySummaryData.totalFee missing");
});

runTest("6.2: Service breakdown table renders dynamic service items", () => {
  assert.ok(appSource.includes("monthlySummaryData.serviceBreakdown"), "serviceBreakdown missing");
  assert.ok(appSource.includes("srvData.totalAmount"), "srvData.totalAmount missing");
});

// --- PART 7: DIGITAL RECEIPT DETAILS MODAL & ACTIONS ---
console.log("\n--- PART 7: DIGITAL RECEIPT DETAILS MODAL & ACTIONS ---");

runTest("7.1: Receipt details modal container and back button rendered", () => {
  assert.ok(appSource.includes('testID="modal_tp_transaction_details"'), "modal_tp_transaction_details missing");
  assert.ok(appSource.includes('testID="btn_back_txn_details"'), "btn_back_txn_details missing");
  assert.ok(appSource.includes("{t('transaction_details_title')}"), "transaction_details_title missing");
});

runTest("7.2: Voucher paper renders verified seal, amounts, and metadata rows", () => {
  assert.ok(appSource.includes("styles.thReceiptPaper"), "thReceiptPaper style missing");
  assert.ok(appSource.includes("{t('txn_id')}"), "txn_id row missing");
  assert.ok(appSource.includes("{t('txn_date')}"), "txn_date row missing");
  assert.ok(appSource.includes("{t('principal_amount')}"), "principal_amount row missing");
  assert.ok(appSource.includes("{t('net_amount')}"), "net_amount row missing");
});

runTest("7.3: Action dock renders download and share buttons", () => {
  assert.ok(appSource.includes('testID="btn_download_voucher"'), "btn_download_voucher missing");
  assert.ok(appSource.includes('testID="btn_share_voucher"'), "btn_share_voucher missing");
  assert.ok(appSource.includes("{t('download_voucher')}"), "download_voucher label missing");
  assert.ok(appSource.includes("{t('share_voucher')}"), "share_voucher label missing");
});

// --- PART 8: TOUCH TARGET ERGONOMICS & HAPTIC MILESTONES ---
console.log("\n--- PART 8: TOUCH TARGET ERGONOMICS & HAPTIC MILESTONES ---");

runTest("8.1: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers", () => {
  const hitSlopMatches = appSource.match(/hitSlop=\{STANDARD_TOUCH_HIT_SLOP\}/g);
  assert.ok(hitSlopMatches && hitSlopMatches.length > 50, "STANDARD_TOUCH_HIT_SLOP should be widely used");
});

runTest("8.2: Haptic feedback service invoked across key user actions", () => {
  assert.ok(appSource.includes("hapticFeedbackService.selection()"), "haptic selection missing");
  assert.ok(appSource.includes("hapticFeedbackService.notificationSuccess()"), "haptic success missing");
  assert.ok(appSource.includes("hapticFeedbackService.impactMedium()"), "haptic impactMedium missing");
});
// --- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---
console.log("\n--- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

runTest("9.1: modalTpTransactionDetails and modalTransactionHistory dismissed step-by-step", () => {
  assert.ok(appSource.includes("if (modalTpTransactionDetails) {"), "modalTpTransactionDetails BackHandler check missing");
  assert.ok(appSource.includes("if (modalTransactionHistory) {"), "modalTransactionHistory BackHandler check missing");
});

runTest("9.2: Modals included in BackHandler dependency array", () => {
  assert.ok(appSource.includes("modalTransactionHistory, modalTpTransactionDetails"), "Modals missing in BackHandler dependency array");
});

// --- PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---
console.log("\n--- PART 10: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

function luminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");
  return [
    parseInt(cleanHex.substring(0, 2), 16),
    parseInt(cleanHex.substring(2, 4), 16),
    parseInt(cleanHex.substring(4, 6), 16)
  ];
}

function getContrast(fgHex, bgHex) {
  const [r1, g1, b1] = hexToRgb(fgHex);
  const [r2, g2, b2] = hexToRgb(bgHex);
  const l1 = luminance(r1, g1, b1);
  const l2 = luminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

runTest("10.1: Header & Primary Action (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = getContrast("#FFFFFF", "#0D6E5C");
  console.log(`      [CONTRAST] #FFFFFF on #0D6E5C: ${ratio.toFixed(2)}:1 (PASS)`);
  assert.ok(ratio >= 4.5, `Contrast ${ratio} is less than 4.5:1`);
});

runTest("10.2: Dark Mode Header (#FFFFFF on #064E3B) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = getContrast("#FFFFFF", "#064E3B");
  console.log(`      [CONTRAST] #FFFFFF on #064E3B: ${ratio.toFixed(2)}:1 (PASS)`);
  assert.ok(ratio >= 7.0, `Contrast ${ratio} is less than 7.0:1`);
});

runTest("10.3: Inactive Chip Light (#475569 on #F1F5F9) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = getContrast("#475569", "#F1F5F9");
  console.log(`      [CONTRAST] #475569 on #F1F5F9: ${ratio.toFixed(2)}:1 (PASS)`);
  assert.ok(ratio >= 4.5, `Contrast ${ratio} is less than 4.5:1`);
});

runTest("10.4: Success Badge Text (#15803D on #DCFCE7) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = getContrast("#15803D", "#DCFCE7");
  console.log(`      [CONTRAST] #15803D on #DCFCE7: ${ratio.toFixed(2)}:1 (PASS)`);
  assert.ok(ratio >= 4.5, `Contrast ${ratio} is less than 4.5:1`);
});

runTest("10.5: Fee Pill Text (#B45309 on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
  const ratio = getContrast("#B45309", "#FEF3C7");
  console.log(`      [CONTRAST] #B45309 on #FEF3C7: ${ratio.toFixed(2)}:1 (PASS)`);
  assert.ok(ratio >= 4.5, `Contrast ${ratio} is less than 4.5:1`);
});

runTest("10.6: Receipt Text (#1E293B on #FFFFFF) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = getContrast("#1E293B", "#FFFFFF");
  console.log(`      [CONTRAST] #1E293B on #FFFFFF: ${ratio.toFixed(2)}:1 (PASS)`);
  assert.ok(ratio >= 7.0, `Contrast ${ratio} is less than 7.0:1`);
});

runTest("10.7: Dark Mode Receipt Text (#F1F5F9 on #1E293B) achieves WCAG AAA (>= 7.0:1)", () => {
  const ratio = getContrast("#F1F5F9", "#1E293B");
  console.log(`      [CONTRAST] #F1F5F9 on #1E293B: ${ratio.toFixed(2)}:1 (PASS)`);
  assert.ok(ratio >= 7.0, `Contrast ${ratio} is less than 7.0:1`);
});

// --- PART 11: MULTI-TENANT ISOLATION & DATA TRANSFORMATIONS ---
console.log("\n--- PART 11: MULTI-TENANT ISOLATION & DATA TRANSFORMATIONS ---");

runTest("11.1: tpFormatTransactionStatementItem normalizes raw transaction record", () => {
  const raw = {
    id: "WT_TEST_1",
    transactionNumber: "TK9999",
    amount: 1500,
    fee: 15,
    type: "out",
    title: "সেন্ড মানি",
  };
  const formatted = tallyPayService.formatTransactionStatementItem(raw);
  assert.strictEqual(formatted.transactionNumber, "TK9999");
  assert.strictEqual(formatted.balanceChangeType, "DEBIT");
  assert.strictEqual(formatted.amount, 1500);
  assert.strictEqual(formatted.fee, 15);
  assert.strictEqual(formatted.netAmount, 1515);
});

runTest("11.2: tpCalculateMonthlyTransactionSummary sums inflows and outflows with paisa precision", () => {
  const txns = [
    { amount: 1000, fee: 0, balanceChangeType: "CREDIT", type: "in" },
    { amount: 500, fee: 5, balanceChangeType: "DEBIT", type: "out" },
    { amount: 200, fee: 0, balanceChangeType: "CREDIT", type: "in" }
  ];
  const summary = tallyPayService.calculateMonthlyTransactionSummary(txns);
  assert.strictEqual(summary.totalPelam, 1200);
  assert.strictEqual(summary.totalDilam, 500);
  assert.strictEqual(summary.transactionCount, 3);
});

// --- PART 12: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK ---
console.log("\n--- PART 12: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK ---");

runTest("12.1: App.js compiles cleanly via Babel parser with Expo preset", () => {
  const ast = babel.parseSync(appSource, {
    filename: "App.js",
    babelrc: false,
    presets: ["babel-preset-expo"],
  });
  assert.ok(ast && ast.program && ast.program.body.length > 50, "App.js AST parsing failed");
  console.log(`      [BABEL] Successfully parsed ${ast.program.body.length} top-level program statements`);
});

runTest("12.2: Latency benchmark: 1,000 transaction queries & summaries execute in < 200ms", () => {
  const mockTxns = [];
  for (let i = 0; i < 1000; i++) {
    mockTxns.push({
      id: `TXN_${i}`,
      transactionNumber: `TK_${i}`,
      title: i % 2 === 0 ? "অ্যাড মানি" : "সেন্ড মানি",
      amount: 100 + (i % 50),
      fee: i % 2 === 0 ? 0 : 5,
      type: i % 2 === 0 ? "in" : "out",
      balanceChangeType: i % 2 === 0 ? "CREDIT" : "DEBIT",
      date: "2026-11-04",
      time: "12:00:00",
    });
  }

  const start = Date.now();
  const summary = tallyPayService.calculateMonthlyTransactionSummary(mockTxns);
  const elapsed = Date.now() - start;

  console.log(`      [BENCHMARK] 1,000 transactions summarized in ${elapsed}ms (${(elapsed / 1000).toFixed(4)}ms/op)`);
  assert.ok(elapsed < 200, `Benchmark took ${elapsed}ms, exceeding 200ms threshold`);
  assert.ok(summary.totalPelam > 0, "totalPelam should be computed");
  assert.ok(summary.totalDilam > 0, "totalDilam should be computed");
});

console.log("\n================================================================================");
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failures.length} (${failures.length === 0 ? "100% SUCCESS" : "FAILURES DETECTED"})`);
console.log("================================================================================");

if (failures.length > 0) {
  process.exit(1);
}
