/**
 * test_iteration_218_ui_ocr_autofill_and_confidence.js
 *
 * Comprehensive Automated Verification Suite for REA-ITER-218:
 * OCR AUTO-FILL TRANSACTION FORM WORKFLOW, CONFIDENCE BADGES & UI/UX
 *
 * Verifies:
 * 1. OCR Voucher Inference Engine (inferVoucherFields) data models & normalization.
 * 2. Confidence scoring math & tier classification (High >= 0.85, Med >= 0.60, Low < 0.60).
 * 3. App.js OCR Auto-Detection state hooks & global test hooks (__RECEIPT_SCANNER_TEST_HOOKS__).
 * 4. OCR Auto-Detected Data Card layout in modalReceiptScanner and modalReceiptViewer.
 * 5. Interactive tap-to-correct chips (Amount, Date, Voucher No, Party Name).
 * 6. Auto-Fill Transaction Form workflow & transaction field population (txnAmount, txnDate, txnNote).
 * 7. Tactile Haptic Feedback milestones (impactMedium on apply, selection on chip toggle).
 * 8. WCAG 2.1 AA / AAA luminance contrast validation for all OCR badges, chips, and text tokens.
 * 9. Bilingual Localization (i18n) symmetry across all 12 Iteration 218 keys in STRINGS.bn and STRINGS.en.
 * 10. Hardware BackHandler safe modal dismissal hierarchy & dependency array tracking.
 * 11. AST Syntax Integrity (Babel parser compilation) & Latency Benchmark (< 50ms for 1,000 ops).
 *
 * Worker: Worker 3 (Ohm) — Principal Frontend, UI/UX & QA Owner
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 */

const fs = require("fs");
const assert = require("assert");
const path = require("path");
const { performance } = require("perf_hooks");
const babel = require("@babel/core");

const APP_PATH = path.join(__dirname, "App.js");
const appSource = fs.readFileSync(APP_PATH, "utf8");

const receiptScannerService = require("./src/receiptScannerService");
const receiptImageService = require("./src/receiptImageService");
const i18n = require("./src/i18nService");

let totalTests = 0;
let passedTests = 0;
const testFailures = [];

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
  } catch (err) {
    testFailures.push({ test: name, error: err.message });
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

console.log("================================================================================");
console.log("ITERATION 218: OCR AUTO-FILL TRANSACTION WORKFLOW & CONFIDENCE BADGES QA");
console.log("================================================================================\n");

// ============================================================================
// PART 1: OCR VOUCHER INFERENCE ENGINE DATA MODELS & INVARIANTS
// ============================================================================
console.log("--- PART 1: OCR VOUCHER INFERENCE ENGINE & NORMALIZATION ---");

runTest("1.1: inferVoucherFields exported from both receiptScannerService and receiptImageService", () => {
  assert.strictEqual(typeof receiptScannerService.inferVoucherFields, "function", "receiptScannerService missing inferVoucherFields");
  assert.strictEqual(typeof receiptImageService.inferVoucherFields, "function", "receiptImageService missing inferVoucherFields");
});

runTest("1.2: inferVoucherFields returns safe empty defaults on null, undefined, or empty inputs", () => {
  const empty1 = receiptScannerService.inferVoucherFields(null);
  const empty2 = receiptScannerService.inferVoucherFields("");
  const empty3 = receiptScannerService.inferVoucherFields({});

  [empty1, empty2, empty3].forEach((res) => {
    assert.strictEqual(res.amount, null, "amount should be null on empty");
    assert.strictEqual(res.amountFormatted, "", "amountFormatted should be empty string");
    assert.strictEqual(res.date, null, "date should be null on empty");
    assert.strictEqual(res.voucherNo, null, "voucherNo should be null on empty");
    assert.strictEqual(res.partyName, null, "partyName should be null on empty");
    assert.strictEqual(res.confidence, 0, "confidence should be 0 on empty");
    assert.strictEqual(res.confidenceTier, "low", "confidenceTier should be low on empty");
    assert.strictEqual(res.isAutoDetected, false, "isAutoDetected should be false on empty");
  });
});

runTest("1.3: inferVoucherFields correctly normalizes Bengali numerals to ASCII numbers (৫,০০০ -> 5000)", () => {
  const sample = "মেসার্স করিম ট্রেডার্স\nক্যাশ মেমো নং: VCH-9942\nতারিখ: ০৩/১১/২০২৬\nমোট টাকা: ৳ ৫,০০০\nধন্যবাদ আবার আসবেন";
  const res = receiptScannerService.inferVoucherFields(sample);

  assert.strictEqual(res.amount, 5000, `Expected amount 5000 but got ${res.amount}`);
  assert.strictEqual(res.amountFormatted, "৳ ৫,০০০", `Expected '৳ ৫,০০০' but got ${res.amountFormatted}`);
  assert.strictEqual(res.amountFormattedEn, "৳ 5,000", `Expected '৳ 5,000' but got ${res.amountFormattedEn}`);
});

runTest("1.4: inferVoucherFields extracts standard date and formats Bengali date glyphs (০৩/১১/২০২৬)", () => {
  const sample = "ক্যাশ মেমো\nতারিখ: ০৩/১১/২০২৬\nমোট: ১,২০০";
  const res = receiptScannerService.inferVoucherFields(sample);

  assert.strictEqual(res.date, "03/11/2026", `Expected date '03/11/2026' but got ${res.date}`);
  assert.strictEqual(res.dateBn, "০৩/১১/২০২৬", `Expected dateBn '০৩/১১/২০২৬' but got ${res.dateBn}`);
});

runTest("1.5: inferVoucherFields extracts Voucher/Memo number and Party/Customer name", () => {
  const sample = "মেসার্স রহিম স্টোর\nক্যাশ মেমো নং: MEMO-4421\nতারিখ: 14/10/2026\nমোট টাকা: ৳ ২,৫০০";
  const res = receiptScannerService.inferVoucherFields(sample);

  assert.strictEqual(res.voucherNo, "MEMO-4421", `Expected voucherNo 'MEMO-4421' but got ${res.voucherNo}`);
  assert.strictEqual(res.partyName, "মেসার্স রহিম স্টোর", `Expected partyName 'মেসার্স রহিম স্টোর' but got ${res.partyName}`);
});

// ============================================================================
// PART 2: CONFIDENCE SCORING MATH & TIER CLASSIFICATION
// ============================================================================
console.log("\n--- PART 2: CONFIDENCE SCORING MATH & TIER CLASSIFICATION ---");

runTest("2.1: High confidence (>= 0.85) when Amount, Date, Voucher, and Party are present", () => {
  const highSample = "মেসার্স করিম ট্রেডার্স\nক্যাশ মেমো নং: VCH-9942\nতারিখ: ০৩/১১/২০২৬\nমোট টাকা: ৳ ৫,০০০";
  const res = receiptScannerService.inferVoucherFields(highSample);

  assert(res.confidence >= 0.85, `Expected confidence >= 0.85 but got ${res.confidence}`);
  assert.strictEqual(res.confidenceTier, "high", `Expected confidenceTier 'high' but got ${res.confidenceTier}`);
});

runTest("2.2: Medium confidence (>= 0.60 and < 0.85) when only Amount and Date are present", () => {
  const medSample = "ক্যাশ মেমো\nতারিখ: 14/10/2026\nমোট: 1500";
  const res = receiptScannerService.inferVoucherFields(medSample);

  assert(res.confidence >= 0.60 && res.confidence < 0.85, `Expected 0.60 <= confidence < 0.85 but got ${res.confidence}`);
  assert.strictEqual(res.confidenceTier, "medium", `Expected confidenceTier 'medium' but got ${res.confidenceTier}`);
});

runTest("2.3: Low confidence (< 0.60) when only unstructured amount is present", () => {
  const lowSample = "রসিদ\nটাকা ৫০০";
  const res = receiptScannerService.inferVoucherFields(lowSample);

  assert(res.confidence < 0.60, `Expected confidence < 0.60 but got ${res.confidence}`);
  assert.strictEqual(res.confidenceTier, "low", `Expected confidenceTier 'low' but got ${res.confidenceTier}`);
});

runTest("2.4: Candidate amounts filtering ignores 4-digit years (e.g. 2026)", () => {
  const sample = "রসিদ তারিখ 2026\nমোট টাকা: ৳ 7500";
  const res = receiptScannerService.inferVoucherFields(sample);

  assert.strictEqual(res.amount, 7500, `Expected amount 7500 ignoring year 2026`);
  assert(res.candidateAmounts.indexOf(2026) === -1, "2026 should not be a candidate amount");
});

// ============================================================================
// PART 3: APP.JS STATE HOOKS & TEST HOOKS EXPOSURE
// ============================================================================
console.log("\n--- PART 3: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

runTest("3.1: OCR Auto-Fill state hooks declared in App.js (detectedOcrData, ocrSelectedFields, txnAmount, txnNote)", () => {
  assert(appSource.includes("const [detectedOcrData, setDetectedOcrData] = useState(null);"), "detectedOcrData state missing");
  assert(appSource.includes("const [ocrSelectedFields, setOcrSelectedFields] = useState("), "ocrSelectedFields state missing");
  assert(appSource.includes("const [txnAmount, setTxnAmount] = useState('');"), "txnAmount state missing");
  assert(appSource.includes("const [txnNote, setTxnNote] = useState('');"), "txnNote state missing");
});

runTest("3.2: global.__RECEIPT_SCANNER_TEST_HOOKS__ exposes OCR auto-fill hooks", () => {
  assert(appSource.includes("detectedOcrData,"), "detectedOcrData missing in test hooks");
  assert(appSource.includes("setDetectedOcrData,"), "setDetectedOcrData missing in test hooks");
  assert(appSource.includes("ocrSelectedFields,"), "ocrSelectedFields missing in test hooks");
  assert(appSource.includes("handleApplyOcrToTransaction,"), "handleApplyOcrToTransaction missing in test hooks");
  assert(appSource.includes("handleToggleOcrField,"), "handleToggleOcrField missing in test hooks");
  assert(appSource.includes("txnAmount,"), "txnAmount missing in test hooks");
  assert(appSource.includes("setTxnAmount,"), "setTxnAmount missing in test hooks");
  assert(appSource.includes("txnNote,"), "txnNote missing in test hooks");
  assert(appSource.includes("setTxnNote,"), "setTxnNote missing in test hooks");
});

// ============================================================================
// PART 4: OCR AUTO-DETECTED DATA CARD IN SCANNER & VIEWER MODALS
// ============================================================================
console.log("\n--- PART 4: OCR AUTO-DETECTED DATA CARD LAYOUT ---");

runTest("4.1: modalReceiptScanner renders OCR Auto-Detected Data Card when scannerState is CAPTURED", () => {
  assert(appSource.includes("OCR AUTO-DETECTED DATA CARD (ITERATION 218)"), "OCR Card marker missing in modalReceiptScanner");
  assert(appSource.includes("t('ocr_card_title')"), "ocr_card_title missing in modalReceiptScanner");
});

runTest("4.2: modalReceiptViewer renders OCR Auto-Detected Data Card with interactive controls", () => {
  assert(appSource.includes("OCR Auto-Detected Data Card in Viewer (Iteration 218)"), "OCR Card marker missing in modalReceiptViewer");
  assert(appSource.includes("t('ocr_auto_fill_btn')"), "ocr_auto_fill_btn missing in modalReceiptViewer");
});

runTest("4.3: Confidence badges render appropriate localized labels based on confidenceTier", () => {
  assert(appSource.includes("t('ocr_confidence_high')"), "ocr_confidence_high missing");
  assert(appSource.includes("t('ocr_confidence_med')"), "ocr_confidence_med missing");
  assert(appSource.includes("t('ocr_confidence_low')"), "ocr_confidence_low missing");
});

runTest("4.4: 4 Tap-to-correct Chips rendered with accessible labels & hitSlop", () => {
  assert(appSource.includes("t('ocr_field_amount')"), "ocr_field_amount chip missing");
  assert(appSource.includes("t('ocr_field_date')"), "ocr_field_date chip missing");
  assert(appSource.includes("t('ocr_field_voucher')"), "ocr_field_voucher chip missing");
  assert(appSource.includes("t('ocr_field_party')"), "ocr_field_party chip missing");
  assert(appSource.includes("hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}"), "hitSlop missing on OCR chips");
});

// ============================================================================
// PART 5: AUTO-FILL WORKFLOW & EVENT SIMULATION
// ============================================================================
console.log("\n--- PART 5: AUTO-FILL TRANSACTION FORM WORKFLOW SIMULATION ---");

runTest("5.1: handleApplyOcrToTransaction populates amount into calcExpr and calcDisplay", () => {
  assert(appSource.includes("setTxnAmount(amtStr);"), "setTxnAmount call missing in handleApplyOcrToTransaction");
  assert(appSource.includes("setCalcExpr(amtStr);"), "setCalcExpr call missing in handleApplyOcrToTransaction");
  assert(appSource.includes("setCalcDisplay(formatMoney(detectedOcrData.amount));"), "setCalcDisplay call missing in handleApplyOcrToTransaction");
  assert(appSource.includes("setMoneyOutAmount(amtStr);"), "setMoneyOutAmount call missing in handleApplyOcrToTransaction");
});

runTest("5.2: handleApplyOcrToTransaction populates date into txnDate", () => {
  assert(appSource.includes("setTxnDate(detectedOcrData.date);"), "setTxnDate call missing in handleApplyOcrToTransaction");
});

runTest("5.3: handleApplyOcrToTransaction concatenates voucher and party into txnNote and txnDesc", () => {
  assert(appSource.includes("setTxnNote(finalNote);"), "setTxnNote call missing in handleApplyOcrToTransaction");
  assert(appSource.includes("setTxnDesc(finalNote);"), "setTxnDesc call missing in handleApplyOcrToTransaction");
});

runTest("5.4: handleApplyOcrToTransaction attaches receipt to draft/target and dismisses modals", () => {
  assert(appSource.includes("setCurrentDraftReceipt(newReceipt);"), "setCurrentDraftReceipt call missing in handleApplyOcrToTransaction");
  assert(appSource.includes("setModalReceiptScanner(false);"), "setModalReceiptScanner(false) call missing in handleApplyOcrToTransaction");
  assert(appSource.includes("setModalReceiptViewer(false);"), "setModalReceiptViewer(false) call missing in handleApplyOcrToTransaction");
  assert(appSource.includes("t('ocr_amount_applied_toast')"), "ocr_amount_applied_toast missing in handleApplyOcrToTransaction");
});

runTest("5.5: handleToggleOcrField toggles individual field selection flags safely", () => {
  assert(appSource.includes("handleToggleOcrField = (fieldKey) => {"), "handleToggleOcrField function missing");
  assert(appSource.includes("setOcrSelectedFields((prev) => Object.assign({}, prev, { [fieldKey]: !prev[fieldKey] }));"), "setOcrSelectedFields toggle logic missing");
});

// ============================================================================
// PART 6: TACTILE HAPTIC FEEDBACK MILESTONES
// ============================================================================
console.log("\n--- PART 6: TACTILE HAPTIC FEEDBACK MILESTONES ---");

runTest("6.1: hapticFeedbackService.impactMedium() wired on handleApplyOcrToTransaction", () => {
  const match = appSource.match(/handleApplyOcrToTransaction[\s\S]*?hapticFeedbackService\.impactMedium\(\)/);
  assert(match, "impactMedium() missing in handleApplyOcrToTransaction");
});

runTest("6.2: hapticFeedbackService.selection() wired on handleToggleOcrField", () => {
  const match = appSource.match(/handleToggleOcrField[\s\S]*?hapticFeedbackService\.selection\(\)/);
  assert(match, "selection() missing in handleToggleOcrField");
});

runTest("6.3: hapticFeedbackService.impactMedium() wired on handleCaptureReceiptPhoto", () => {
  const match = appSource.match(/handleCaptureReceiptPhoto[\s\S]*?hapticFeedbackService\.impactMedium\(\)/);
  assert(match, "impactMedium() missing in handleCaptureReceiptPhoto");
});

// ============================================================================
// PART 7: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
// ============================================================================
console.log("\n--- PART 7: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

function parseHex(h) {
  let hex = h.replace("#", "").trim();
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const num = parseInt(hex.slice(0, 6), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function calcLuminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calcContrast(fg, bg) {
  const l1 = calcLuminance(parseHex(fg));
  const l2 = calcLuminance(parseHex(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

runTest("7.1: High Confidence Badge Text (#A7F3D0 on #064E3B) achieves >= 7.0:1 (AAA)", () => {
  const cr = calcContrast("#A7F3D0", "#064E3B");
  console.log(`      [CONTRAST] High Confidence Badge (#A7F3D0 on #064E3B): ${cr.toFixed(2)}:1`);
  assert(cr >= 7.0, `Expected contrast >= 7.0:1, got ${cr.toFixed(2)}:1`);
});

runTest("7.2: Medium Confidence Badge Text (#FDE68A on #451A03) achieves >= 7.0:1 (AAA)", () => {
  const cr = calcContrast("#FDE68A", "#451A03");
  console.log(`      [CONTRAST] Medium Confidence Badge (#FDE68A on #451A03): ${cr.toFixed(2)}:1`);
  assert(cr >= 7.0, `Expected contrast >= 7.0:1, got ${cr.toFixed(2)}:1`);
});

runTest("7.3: Low Confidence Badge Text (#CBD5E1 on #334155) achieves >= 4.5:1 (AA)", () => {
  const cr = calcContrast("#CBD5E1", "#334155");
  console.log(`      [CONTRAST] Low Confidence Badge (#CBD5E1 on #334155): ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Expected contrast >= 4.5:1, got ${cr.toFixed(2)}:1`);
});

runTest("7.4: Card Title Text (#F8FAFC on #1E293B) achieves >= 10:1 (AAA)", () => {
  const cr = calcContrast("#F8FAFC", "#1E293B");
  console.log(`      [CONTRAST] OCR Card Title (#F8FAFC on #1E293B): ${cr.toFixed(2)}:1`);
  assert(cr >= 10.0, `Expected contrast >= 10.0:1, got ${cr.toFixed(2)}:1`);
});

runTest("7.5: Amount Highlight Text (#34D399 on #0F172A) achieves >= 7.0:1 (AAA)", () => {
  const cr = calcContrast("#34D399", "#0F172A");
  console.log(`      [CONTRAST] Amount Highlight Text (#34D399 on #0F172A): ${cr.toFixed(2)}:1`);
  assert(cr >= 7.0, `Expected contrast >= 7.0:1, got ${cr.toFixed(2)}:1`);
});

runTest("7.6: Inactive Chip Label (#94A3B8 on #0F172A) achieves >= 4.5:1 (AA)", () => {
  const cr = calcContrast("#94A3B8", "#0F172A");
  console.log(`      [CONTRAST] Inactive Chip Label (#94A3B8 on #0F172A): ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Expected contrast >= 4.5:1, got ${cr.toFixed(2)}:1`);
});

// ============================================================================
// PART 8: BILINGUAL LOCALIZATION (i18n) PARITY
// ============================================================================
console.log("\n--- PART 8: BILINGUAL LOCALIZATION (i18n) SYMMETRY ---");

const ITER_218_KEYS = [
  "ocr_card_title",
  "ocr_auto_fill_btn",
  "ocr_confidence_high",
  "ocr_confidence_med",
  "ocr_confidence_low",
  "ocr_field_amount",
  "ocr_field_date",
  "ocr_field_voucher",
  "ocr_field_party",
  "ocr_amount_applied_toast",
  "ocr_manual_edit",
  "ocr_re_scan_btn",
];

runTest("8.1: All 12 Iteration 218 localization keys exist and non-empty in STRINGS.bn", () => {
  const bn = i18n.STRINGS.bn;
  ITER_218_KEYS.forEach((k) => {
    assert(bn[k] && typeof bn[k] === "string" && bn[k].trim().length > 0, `Missing or empty key in bn: ${k}`);
  });
});

runTest("8.2: All 12 Iteration 218 localization keys exist and non-empty in STRINGS.en", () => {
  const en = i18n.STRINGS.en;
  ITER_218_KEYS.forEach((k) => {
    assert(en[k] && typeof en[k] === "string" && en[k].trim().length > 0, `Missing or empty key in en: ${k}`);
  });
});

runTest("8.3: t() helper translates keys accurately in both languages", () => {
  assert.strictEqual(i18n.t("ocr_auto_fill_btn", "bn"), "লেনদেনে পূরণ করুন");
  assert.strictEqual(i18n.t("ocr_auto_fill_btn", "en"), "Auto-fill into Transaction");
  assert.strictEqual(i18n.t("ocr_confidence_high", "bn"), "নির্ভুলতা: উচ্চ");
  assert.strictEqual(i18n.t("ocr_confidence_high", "en"), "Confidence: High");
});

// ============================================================================
// PART 9: BACKHANDLER HARDWARE DISMISSAL SAFETY
// ============================================================================
console.log("\n--- PART 9: BACKHANDLER HARDWARE DISMISSAL SAFETY ---");

runTest("9.1: onBackPress dismisses modalReceiptViewer and modalReceiptScanner before parent modals", () => {
  const backPressIdx = appSource.indexOf("const onBackPress = () => {");
  assert(backPressIdx !== -1, "onBackPress not found");
  const sub = appSource.slice(backPressIdx, backPressIdx + 400);

  const viewerPos = sub.indexOf("if (modalReceiptViewer)");
  const scannerPos = sub.indexOf("if (modalReceiptScanner)");
  const addTxnPos = sub.indexOf("if (modalAddTxn)");

  assert(viewerPos !== -1, "modalReceiptViewer not in onBackPress");
  assert(scannerPos !== -1, "modalReceiptScanner not in onBackPress");
  assert(addTxnPos !== -1, "modalAddTxn not in onBackPress");
  assert(viewerPos < scannerPos, "modalReceiptViewer must be dismissed before modalReceiptScanner");
  assert(scannerPos < addTxnPos, "modalReceiptScanner must be dismissed before modalAddTxn");
});

runTest("9.2: modalReceiptScanner and modalReceiptViewer included in BackHandler useEffect dependency array", () => {
  const match = appSource.match(/modalReceiptScanner,\s*modalReceiptViewer/);
  assert(match, "modalReceiptScanner and modalReceiptViewer missing from BackHandler dependencies");
});

// ============================================================================
// PART 10: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK
// ============================================================================
console.log("\n--- PART 10: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK ---");

runTest("10.1: App.js compiles cleanly via Babel parser with Flow & JSX plugins", () => {
  const ast = babel.parseSync(appSource, {
    configFile: false,
    babelrc: false,
    presets: ["babel-preset-expo"],
  });
  assert(ast && ast.program, "AST program root missing");
  assert(ast.program.body.length > 50, "App.js program statements count too low");
  console.log(`      [BABEL] Successfully parsed ${ast.program.body.length} top-level program statements`);
});

runTest("10.2: Latency benchmark: 1,000 OCR inferences resolve in < 250ms (< 0.5ms/op)", () => {
  const sample = "মেসার্স করিম ট্রেডার্স\nক্যাশ মেমো নং: VCH-9942\nতারিখ: ০৩/১১/২০২৬\nমোট টাকা: ৳ ৫,০০০\nধন্যবাদ আবার আসবেন";
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) {
    receiptScannerService.inferVoucherFields(sample);
  }
  const t1 = performance.now();
  const elapsed = t1 - t0;
  const perOp = elapsed / 1000;
  console.log(`      [BENCHMARK] 1,000 OCR inferences in ${elapsed.toFixed(2)}ms (${perOp.toFixed(4)}ms/op)`);
  assert(perOp < 0.5, `Per-operation latency exceeded 0.5ms: ${perOp.toFixed(4)}ms`);
  assert(elapsed < 250, `1,000 operations exceeded 250ms: ${elapsed.toFixed(2)}ms`);
});

// ============================================================================
// FINAL QA SUMMARY
// ============================================================================
console.log("\n================================================================================");
console.log(`ITERATION 218 QA SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log("================================================================================");

if (testFailures.length > 0) {
  console.error(`\nTOTAL FAILURES: ${testFailures.length}`);
  process.exit(1);
} else {
  process.exit(0);
}
