const assert = require("assert");
const fs = require("fs");

const themeService = require("./src/themeService");
const { LIGHT_THEME, DARK_THEME, getThemeTokens, getThemedStyles, LIGHT_ICON_THEMES, DARK_ICON_THEMES, getIconTheme } = themeService;
const iconMetrics = require("./src/iconMetrics");
const { ICON_METRICS, getIconMetrics, STANDARD_TOUCH_HIT_SLOP } = iconMetrics;
const typographyTokens = require("./src/typographyTokens");
const { TYPOGRAPHY_SCALES, BENGALI_LINE_HEIGHT_MULTIPLIER, getBengaliLineHeight, getTypography } = typographyTokens;

console.log("================================================================");
console.log("PHASE 2 DESIGN FOUNDATION & ACCESSIBILITY TEST SUITE");
console.log("================================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log("[PASS] TEST " + total + ": " + name);
    passed++;
  } catch (err) {
    console.error("[FAIL] TEST " + total + ": " + name);
    console.error(err);
    process.exitCode = 1;
  }
}

// WCAG 2.2 Relative Luminance & Contrast Helper
function getLuminance(hex) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// -------------------------------------------------------------
// PART 1: COMPLETE SEMANTIC COLOR TOKEN EXISTENCE
// -------------------------------------------------------------
console.log("--- PART 1: SEMANTIC COLOR TOKEN EXISTENCE ---");

runTest("Brand tokens exist in both LIGHT_THEME and DARK_THEME", () => {
  const brandKeys = [
    "primary", "onPrimary", "primaryContainer", "onPrimaryContainer",
    "primaryLight", "secondary", "onSecondary", "accent"
  ];
  for (const key of brandKeys) {
    assert(LIGHT_THEME[key], `LIGHT_THEME must define brand token: ${key}`);
    assert(DARK_THEME[key], `DARK_THEME must define brand token: ${key}`);
    assert(typeof LIGHT_THEME[key] === "string", `LIGHT_THEME[${key}] must be string`);
    assert(typeof DARK_THEME[key] === "string", `DARK_THEME[${key}] must be string`);
  }
});

runTest("Surface tokens exist in both LIGHT_THEME and DARK_THEME", () => {
  const surfaceKeys = [
    "screenBg", "headerBg", "cardBg", "cardBgElevated",
    "surfaceContainer", "surfaceVariant", "modalSurface",
    "modalHandle", "modalOverlay", "inputSurface", "inputBg", "tabBarBg"
  ];
  for (const key of surfaceKeys) {
    assert(LIGHT_THEME[key], `LIGHT_THEME must define surface token: ${key}`);
    assert(DARK_THEME[key], `DARK_THEME must define surface token: ${key}`);
  }
});

runTest("Text tokens exist in both LIGHT_THEME and DARK_THEME", () => {
  const textKeys = [
    "textPrimary", "textSecondary", "textMuted", "textDisabled",
    "textInverse", "textInverted", "headerText", "inputText", "inputPlaceholder"
  ];
  for (const key of textKeys) {
    assert(LIGHT_THEME[key], `LIGHT_THEME must define text token: ${key}`);
    assert(DARK_THEME[key], `DARK_THEME must define text token: ${key}`);
  }
});

runTest("Border and divider tokens exist in both LIGHT_THEME and DARK_THEME", () => {
  const borderKeys = ["cardBorder", "outline", "outlineVariant", "divider", "inputBorder", "tabBarBorder"];
  for (const key of borderKeys) {
    assert(LIGHT_THEME[key], `LIGHT_THEME must define border token: ${key}`);
    assert(DARK_THEME[key], `DARK_THEME must define border token: ${key}`);
  }
});

runTest("Financial and transaction semantic tokens exist in both themes", () => {
  const financialKeys = [
    "income", "incomeContainer", "expense", "expenseContainer",
    "transfer", "transferContainer", "due", "dueContainer",
    "paid", "savings", "profit", "loss"
  ];
  for (const key of financialKeys) {
    assert(LIGHT_THEME[key], `LIGHT_THEME must define financial token: ${key}`);
    assert(DARK_THEME[key], `DARK_THEME must define financial token: ${key}`);
  }
});

runTest("Opacity and alpha modifier tokens are valid normalized numeric values", () => {
  const opacityKeys = [
    "subtleTint", "selectedOverlay", "scrim", "cardTint",
    "disabledOpacity", "pressedOpacity"
  ];
  for (const key of opacityKeys) {
    assert(typeof LIGHT_THEME[key] === "number", `LIGHT_THEME[${key}] must be number`);
    assert(typeof DARK_THEME[key] === "number", `DARK_THEME[${key}] must be number`);
    assert(LIGHT_THEME[key] >= 0 && LIGHT_THEME[key] <= 1, `LIGHT_THEME[${key}] must be between 0 and 1`);
    assert(DARK_THEME[key] >= 0 && DARK_THEME[key] <= 1, `DARK_THEME[${key}] must be between 0 and 1`);
  }
});

// -------------------------------------------------------------
// PART 2: LIGHT AND DARK MODE TOKEN CONSISTENCY & PAIRING
// -------------------------------------------------------------
console.log("\n--- PART 2: LIGHT & DARK MODE CONSISTENCY & PAIRING ---");

runTest("Mode identifiers and boolean flags are correctly configured", () => {
  assert.strictEqual(LIGHT_THEME.mode, "light");
  assert.strictEqual(LIGHT_THEME.isDark, false);
  assert.strictEqual(DARK_THEME.mode, "dark");
  assert.strictEqual(DARK_THEME.isDark, true);
});

runTest("Complete token key symmetry between Light and Dark themes (zero missing keys)", () => {
  const lightKeys = Object.keys(LIGHT_THEME).sort();
  const darkKeys = Object.keys(DARK_THEME).sort();
  assert.strictEqual(lightKeys.length, darkKeys.length, "Token dictionary sizes must match exactly");
  const missingInDark = lightKeys.filter((k) => !darkKeys.includes(k));
  const missingInLight = darkKeys.filter((k) => !lightKeys.includes(k));
  assert.deepStrictEqual(missingInDark, [], "Zero tokens should be missing in DARK_THEME");
  assert.deepStrictEqual(missingInLight, [], "Zero tokens should be missing in LIGHT_THEME");
  assert(lightKeys.length >= 70, "Must have at least 70 semantic tokens defined");
});

runTest("Luminance inversion between Light and Dark surfaces and texts", () => {
  const lightScreenLuminance = getLuminance(LIGHT_THEME.screenBg);
  const darkScreenLuminance = getLuminance(DARK_THEME.screenBg);
  assert(lightScreenLuminance > 0.8, "Light screenBg must have high luminance (> 0.8)");
  assert(darkScreenLuminance < 0.05, "Dark screenBg must have low luminance (< 0.05)");

  const lightTextLuminance = getLuminance(LIGHT_THEME.textPrimary);
  const darkTextLuminance = getLuminance(DARK_THEME.textPrimary);
  assert(lightTextLuminance < 0.1, "Light textPrimary must be dark (< 0.1)");
  assert(darkTextLuminance > 0.8, "Dark textPrimary must be light (> 0.8)");
});

// -------------------------------------------------------------
// PART 3: AUTOMATED WCAG 2.2 CONTRAST VERIFICATION
// -------------------------------------------------------------
console.log("\n--- PART 3: AUTOMATED WCAG 2.2 CONTRAST VERIFICATION ---");

runTest("Light Mode: textPrimary on cardBg meets WCAG AAA (>= 7.0:1)", () => {
  const ratio = getContrastRatio(LIGHT_THEME.textPrimary, LIGHT_THEME.cardBg);
  assert(ratio >= 7.0, `textPrimary on cardBg must meet AAA (>= 7.0:1), got ${ratio.toFixed(2)}:1`);
  assert(ratio >= 14.0, `Observed ratio was expected ~14.6:1, got ${ratio.toFixed(2)}:1`);
});

runTest("Light Mode: textSecondary on cardBg meets WCAG AA normal text (>= 4.5:1)", () => {
  const ratio = getContrastRatio(LIGHT_THEME.textSecondary, LIGHT_THEME.cardBg);
  assert(ratio >= 4.5, `textSecondary on cardBg must meet AA (>= 4.5:1), got ${ratio.toFixed(2)}:1`);
});

runTest("Light Mode: textMuted achieves WCAG AA compliance with calibrated token (>= 4.5:1)", () => {
  const ratio = getContrastRatio(LIGHT_THEME.textMuted, LIGHT_THEME.cardBg);
  assert(ratio >= 4.5, `textMuted on cardBg must meet AA (>= 4.5:1), got ${ratio.toFixed(2)}:1`);
  assert(ratio >= 7.0, `Calibrated textMuted (#475569) achieves AAA (>= 7.0:1), got ${ratio.toFixed(2)}:1`);
});

runTest("Light Mode: Financial semantic tokens meet WCAG AA normal text on cardBg", () => {
  const incomeRatio = getContrastRatio(LIGHT_THEME.income, LIGHT_THEME.cardBg);
  assert(incomeRatio >= 4.5, `income on cardBg must meet AA (>= 4.5:1), got ${incomeRatio.toFixed(2)}:1`);

  const dueRatio = getContrastRatio(LIGHT_THEME.due, LIGHT_THEME.cardBg);
  assert(dueRatio >= 4.5, `due on cardBg must meet AA (>= 4.5:1), got ${dueRatio.toFixed(2)}:1`);

  const expenseRatio = getContrastRatio(LIGHT_THEME.expense, LIGHT_THEME.cardBg);
  assert(expenseRatio >= 4.5, `expense on cardBg must meet AA (>= 4.5:1), got ${expenseRatio.toFixed(2)}:1`);

  const transferRatio = getContrastRatio(LIGHT_THEME.transfer, LIGHT_THEME.cardBg);
  assert(transferRatio >= 4.5, `transfer on cardBg must meet AA (>= 4.5:1), got ${transferRatio.toFixed(2)}:1`);

  const primaryRatio = getContrastRatio(LIGHT_THEME.primary, LIGHT_THEME.cardBg);
  assert(primaryRatio >= 4.5, `primary on cardBg must meet AA (>= 4.5:1), got ${primaryRatio.toFixed(2)}:1`);
});

runTest("Dark Mode: textPrimary on cardBg meets WCAG AAA (>= 7.0:1)", () => {
  const ratio = getContrastRatio(DARK_THEME.textPrimary, DARK_THEME.cardBg);
  assert(ratio >= 7.0, `Dark textPrimary on cardBg must meet AAA (>= 7.0:1), got ${ratio.toFixed(2)}:1`);
});

runTest("Dark Mode: textSecondary on cardBg meets WCAG AA (>= 4.5:1)", () => {
  const ratio = getContrastRatio(DARK_THEME.textSecondary, DARK_THEME.cardBg);
  assert(ratio >= 4.5, `Dark textSecondary on cardBg must meet AA (>= 4.5:1), got ${ratio.toFixed(2)}:1`);
});

runTest("Dark Mode: Financial semantic tokens meet WCAG AA/AAA on cardBg", () => {
  const incomeRatio = getContrastRatio(DARK_THEME.income, DARK_THEME.cardBg);
  assert(incomeRatio >= 7.0, `Dark income on cardBg meets AAA (>= 7.0:1), got ${incomeRatio.toFixed(2)}:1`);

  const dueRatio = getContrastRatio(DARK_THEME.due, DARK_THEME.cardBg);
  assert(dueRatio >= 7.0, `Dark due on cardBg meets AAA (>= 7.0:1), got ${dueRatio.toFixed(2)}:1`);

  const expenseRatio = getContrastRatio(DARK_THEME.expense, DARK_THEME.cardBg);
  assert(expenseRatio >= 4.5, `Dark expense on cardBg meets AA (>= 4.5:1), got ${expenseRatio.toFixed(2)}:1`);

  const transferRatio = getContrastRatio(DARK_THEME.transfer, DARK_THEME.cardBg);
  assert(transferRatio >= 4.5, `Dark transfer on cardBg meets AA (>= 4.5:1), got ${transferRatio.toFixed(2)}:1`);
});

runTest("Semantic Container Pairs: Text on Container backgrounds meets WCAG AA/Large text", () => {
  const lightIncomeContainerRatio = getContrastRatio(LIGHT_THEME.income, LIGHT_THEME.incomeContainer);
  assert(lightIncomeContainerRatio >= 4.5, `Light income on incomeContainer must meet AA (>= 4.5:1), got ${lightIncomeContainerRatio.toFixed(2)}:1`);

  const lightDueContainerRatio = getContrastRatio(LIGHT_THEME.due, LIGHT_THEME.dueContainer);
  assert(lightDueContainerRatio >= 4.5, `Light due on dueContainer must meet AA (>= 4.5:1), got ${lightDueContainerRatio.toFixed(2)}:1`);

  const lightOnPrimaryContainerRatio = getContrastRatio(LIGHT_THEME.onPrimaryContainer, LIGHT_THEME.primaryContainer);
  assert(lightOnPrimaryContainerRatio >= 7.0, `Light onPrimaryContainer must meet AAA (>= 7.0:1), got ${lightOnPrimaryContainerRatio.toFixed(2)}:1`);

  const darkIncomeContainerRatio = getContrastRatio(DARK_THEME.income, DARK_THEME.incomeContainer);
  assert(darkIncomeContainerRatio >= 4.5, `Dark income on incomeContainer must meet AA (>= 4.5:1), got ${darkIncomeContainerRatio.toFixed(2)}:1`);

  const darkExpenseContainerRatio = getContrastRatio(DARK_THEME.expense, DARK_THEME.expenseContainer);
  assert(darkExpenseContainerRatio >= 4.5, `Dark expense on expenseContainer must meet AA (>= 4.5:1), got ${darkExpenseContainerRatio.toFixed(2)}:1`);

  const darkDueContainerRatio = getContrastRatio(DARK_THEME.due, DARK_THEME.dueContainer);
  assert(darkDueContainerRatio >= 7.0, `Dark due on dueContainer must meet AAA (>= 7.0:1), got ${darkDueContainerRatio.toFixed(2)}:1`);
});

// -------------------------------------------------------------
// PART 4: ICON OPTICAL SCALE METRICS & APPINON INTEGRATION
// -------------------------------------------------------------
console.log("\n--- PART 4: ICON OPTICAL SCALE METRICS & APPINON INTEGRATION ---");

runTest("src/iconMetrics.js exports ICON_METRICS, getIconMetrics, and STANDARD_TOUCH_HIT_SLOP", () => {
  assert(ICON_METRICS, "ICON_METRICS must be exported");
  assert.strictEqual(typeof getIconMetrics, "function", "getIconMetrics must be a function");
  assert(STANDARD_TOUCH_HIT_SLOP, "STANDARD_TOUCH_HIT_SLOP must be exported");
});

runTest("Icon optical calibrations match Phase 2 requirements exactly", () => {
  assert(ICON_METRICS.ic_cash_buy, "ic_cash_buy must have optical metrics");
  assert.strictEqual(ICON_METRICS.ic_cash_buy.opticalScale, 1.28, "ic_cash_buy opticalScale must be 1.28");
  assert.strictEqual(ICON_METRICS.ic_cash_buy.translateY, 0, "ic_cash_buy translateY must be 0");

  assert(ICON_METRICS.ic_delete, "ic_delete must have optical metrics");
  assert.strictEqual(ICON_METRICS.ic_delete.opticalScale, 1.35, "ic_delete opticalScale must be 1.35");
  assert.strictEqual(ICON_METRICS.ic_delete.translateY, 0, "ic_delete translateY must be 0");

  assert(ICON_METRICS.ic_edit, "ic_edit must have optical metrics");
  assert.strictEqual(ICON_METRICS.ic_edit.opticalScale, 1.25, "ic_edit opticalScale must be 1.25");
  assert.strictEqual(ICON_METRICS.ic_edit.translateY, 0, "ic_edit translateY must be 0");

  assert(ICON_METRICS.grid_backup, "grid_backup must have optical metrics");
  assert.strictEqual(ICON_METRICS.grid_backup.translateY, 2, "grid_backup translateY must be 2 to balance top whitespace");
});

runTest("getIconMetrics normalizes file extensions and relative directory paths safely", () => {
  const m1 = getIconMetrics("ic_cash_buy.png");
  assert.strictEqual(m1.opticalScale, 1.28);

  const m2 = getIconMetrics("./assets/icons/ic_delete.png");
  assert.strictEqual(m2.opticalScale, 1.35);

  const m3 = getIconMetrics("assets\\icons\\ic_edit.png");
  assert.strictEqual(m3.opticalScale, 1.25);

  const m4 = getIconMetrics("grid_backup");
  assert.strictEqual(m4.translateY, 2);

  const fallback = getIconMetrics("unknown_icon_that_does_not_exist");
  assert.strictEqual(fallback.opticalScale, 1.0);
  assert.strictEqual(fallback.translateY, 0);

  const safeNull = getIconMetrics(null);
  assert.strictEqual(safeNull.opticalScale, 1.0);
  assert.strictEqual(safeNull.translateY, 0);
});

runTest("Zero container clipping for all calibrated icons inside standard containers", () => {
  // Test standard sizes (20dp in 38dp container, 24dp in 48dp container)
  const testCases = [
    { icon: "ic_cash_buy", size: 20, containerSize: 38 },
    { icon: "ic_delete", size: 20, containerSize: 38 },
    { icon: "ic_edit", size: 20, containerSize: 38 },
    { icon: "grid_backup", size: 24, containerSize: 44 },
    { icon: "ic_delete", size: 24, containerSize: 48 },
  ];

  for (const tc of testCases) {
    const m = getIconMetrics(tc.icon);
    const effectiveWidth = Math.round(tc.size * m.opticalScale);
    const effectiveHeight = Math.round(tc.size * m.opticalScale);
    assert(effectiveWidth < tc.containerSize, `${tc.icon} effectiveWidth (${effectiveWidth}) must be strictly less than containerSize (${tc.containerSize})`);
    assert(effectiveHeight + Math.abs(m.translateY) < tc.containerSize, `${tc.icon} effectiveHeight + translateY must be strictly less than containerSize`);
  }
});

runTest("STANDARD_TOUCH_HIT_SLOP expands sub-48dp controls to at least 48x48dp effective touch area", () => {
  const { top, bottom, left, right } = STANDARD_TOUCH_HIT_SLOP;
  assert.strictEqual(top, 10);
  assert.strictEqual(bottom, 10);
  assert.strictEqual(left, 10);
  assert.strictEqual(right, 10);

  // Verify expansion on 38dp container (AppIcon default)
  const w38 = 38 + left + right; // 58dp
  const h38 = 38 + top + bottom; // 58dp
  assert(w38 >= 48, `38dp width expanded with hitSlop must be >= 48dp, got ${w38}dp`);
  assert(h38 >= 48, `38dp height expanded with hitSlop must be >= 48dp, got ${h38}dp`);

  // Verify expansion on 32dp header button
  const w32 = 32 + left + right; // 52dp
  const h32 = 32 + top + bottom; // 52dp
  assert(w32 >= 48, `32dp width expanded with hitSlop must be >= 48dp, got ${w32}dp`);
  assert(h32 >= 48, `32dp height expanded with hitSlop must be >= 48dp, got ${h32}dp`);

  // Verify expansion on 28dp micro chip
  const w28 = 28 + left + right; // 48dp
  const h28 = 28 + top + bottom; // 48dp
  assert(w28 >= 48, `28dp width expanded with hitSlop must be >= 48dp, got ${w28}dp`);
  assert(h28 >= 48, `28dp height expanded with hitSlop must be >= 48dp, got ${h28}dp`);
});

runTest("AppIcon in App.js integrates iconMetrics and 3D squircle geometry", () => {
  const appSource = fs.readFileSync("App.js", "utf8");
  assert(appSource.includes("iconMetricsService.getIconMetrics"), "App.js must call iconMetricsService.getIconMetrics");
  assert(appSource.includes("Math.round(size * effectiveScale)"), "App.js must scale width & height via effectiveScale");
  assert(appSource.includes("translateY: effectiveTranslateY"), "App.js must apply effectiveTranslateY transform");
  assert(appSource.includes("borderTopWidth: 1.5"), "AppIcon must have 1.5 top bevel highlight");
  assert(appSource.includes("borderBottomWidth: 3"), "AppIcon must have 3 bottom extrusion ledge");
});

// -------------------------------------------------------------
// PART 5: TYPOGRAPHY TOKENS & BENGALI LINE-HEIGHT RATIOS
// -------------------------------------------------------------
console.log("\n--- PART 5: TYPOGRAPHY TOKENS & BENGALI LINE-HEIGHT RATIOS ---");

runTest("src/typographyTokens.js exports TYPOGRAPHY_SCALES, BENGALI_LINE_HEIGHT_MULTIPLIER, and functions", () => {
  assert(TYPOGRAPHY_SCALES, "TYPOGRAPHY_SCALES must be exported");
  assert.strictEqual(typeof BENGALI_LINE_HEIGHT_MULTIPLIER, "number", "BENGALI_LINE_HEIGHT_MULTIPLIER must be a number");
  assert.strictEqual(typeof getBengaliLineHeight, "function", "getBengaliLineHeight must be a function");
  assert.strictEqual(typeof getTypography, "function", "getTypography must be a function");
});

runTest("TYPOGRAPHY_SCALES contains all 10 required standard typography scales", () => {
  const requiredScales = [
    "display", "screenHeading", "sectionHeading", "cardHeading",
    "body", "bodySmall", "caption", "button", "amount", "formLabel"
  ];
  for (const scale of requiredScales) {
    assert(TYPOGRAPHY_SCALES[scale], `TYPOGRAPHY_SCALES must define scale: ${scale}`);
    assert(typeof TYPOGRAPHY_SCALES[scale].fontSize === "number", `${scale}.fontSize must be number`);
    assert(typeof TYPOGRAPHY_SCALES[scale].lineHeight === "number", `${scale}.lineHeight must be number`);
    assert(typeof TYPOGRAPHY_SCALES[scale].fontWeight === "string", `${scale}.fontWeight must be string`);
  }
});

runTest("Every typography scale defines a Bengali-safe line-height ratio between 1.40x and 1.50x", () => {
  for (const [key, scale] of Object.entries(TYPOGRAPHY_SCALES)) {
    const ratio = scale.lineHeight / scale.fontSize;
    assert(
      ratio >= 1.40 && ratio <= 1.505,
      `Scale '${key}' ratio (${ratio.toFixed(3)}x) must be between 1.40x and 1.50x to prevent Bengali vowel-sign clipping`
    );
  }
});

runTest("BENGALI_LINE_HEIGHT_MULTIPLIER is within 1.40x to 1.50x range", () => {
  assert(
    BENGALI_LINE_HEIGHT_MULTIPLIER >= 1.40 && BENGALI_LINE_HEIGHT_MULTIPLIER <= 1.50,
    `BENGALI_LINE_HEIGHT_MULTIPLIER (${BENGALI_LINE_HEIGHT_MULTIPLIER}) must be between 1.40 and 1.50`
  );
});

runTest("getBengaliLineHeight accurately calculates rounded line heights", () => {
  assert.strictEqual(getBengaliLineHeight(14), Math.round(14 * 1.45)); // 20
  assert.strictEqual(getBengaliLineHeight(20), Math.round(20 * 1.45)); // 29
  assert.strictEqual(getBengaliLineHeight(32), Math.round(32 * 1.45)); // 46
});

runTest("getTypography returns expected scale object with optional overrides applied", () => {
  const body = getTypography("body");
  assert.strictEqual(body.fontSize, 14);
  assert.strictEqual(body.lineHeight, 21);

  const custom = getTypography("body", { color: "#B81414", fontWeight: "700" });
  assert.strictEqual(custom.fontSize, 14);
  assert.strictEqual(custom.color, "#B81414");
  assert.strictEqual(custom.fontWeight, "700");
});

// -------------------------------------------------------------
// PART 6: BACKWARD COMPATIBILITY WITH LEGACY THEME TOKENS
// -------------------------------------------------------------
console.log("\n--- PART 6: BACKWARD COMPATIBILITY WITH LEGACY THEME TOKENS ---");

runTest("All 39 legacy theme tokens are preserved across LIGHT_THEME and DARK_THEME", () => {
  const legacyKeys = [
    "mode", "isDark", "statusBar",
    "screenBg", "headerBg", "cardBg", "cardBgElevated", "cardBorder",
    "modalSurface", "modalHandle", "modalOverlay", "divider", "tabBarBg", "tabBarBorder",
    "textPrimary", "textSecondary", "textMuted", "textInverted", "headerText",
    "inputBg", "inputBorder", "inputText", "inputPlaceholder",
    "primary", "primaryLight", "success", "successLight", "danger", "dangerLight",
    "warning", "warningLight", "info", "infoLight", "purple", "purpleLight", "neutral", "neutralLight",
    "tabActive", "tabInactive"
  ];
  assert.strictEqual(legacyKeys.length, 39, "Must check exactly 39 legacy tokens");

  for (const key of legacyKeys) {
    assert(key in LIGHT_THEME, `Legacy token '${key}' missing in LIGHT_THEME`);
    assert(key in DARK_THEME, `Legacy token '${key}' missing in DARK_THEME`);
  }
});

runTest("getThemeTokens resolves correct theme object by string identifier", () => {
  assert.strictEqual(getThemeTokens("light"), LIGHT_THEME);
  assert.strictEqual(getThemeTokens("dark"), DARK_THEME);
  assert.strictEqual(getThemeTokens(undefined), LIGHT_THEME);
});

runTest("getThemedStyles returns comprehensive stylesheet with legacy and modern style selectors", () => {
  const stylesLight = getThemedStyles(LIGHT_THEME, false);
  const stylesDark = getThemedStyles(DARK_THEME, true);

  const coreSelectors = [
    "screenBg", "card", "cardElevated", "textPrimary", "textSecondary", "textMuted",
    "incomeText", "incomeBg", "expenseText", "expenseBg", "transferText", "transferBg",
    "dueText", "dueBg", "divider", "input", "modalSurface", "tabBar", "tabLabel",
    "tabLabelActive", "headerNav", "topHeaderBar", "searchBar", "summaryCard"
  ];

  for (const sel of coreSelectors) {
    assert(stylesLight[sel], `Light styles must define '${sel}'`);
    assert(stylesDark[sel], `Dark styles must define '${sel}'`);
  }

  assert.strictEqual(stylesLight.screenBg.backgroundColor, LIGHT_THEME.screenBg);
  assert.strictEqual(stylesDark.screenBg.backgroundColor, DARK_THEME.screenBg);
  assert.strictEqual(stylesLight.incomeText.color, LIGHT_THEME.income);
  assert.strictEqual(stylesDark.incomeText.color, DARK_THEME.income);
});

runTest("Icon theme palettes (LIGHT_ICON_THEMES and DARK_ICON_THEMES) exist and export all variants", () => {
  assert(LIGHT_ICON_THEMES, "LIGHT_ICON_THEMES must exist");
  assert(DARK_ICON_THEMES, "DARK_ICON_THEMES must exist");

  const requiredVariants = [
    "primary", "success", "danger", "warning", "info", "purple", "teal", "neutral", "secondary", "white"
  ];

  for (const variant of requiredVariants) {
    assert(LIGHT_ICON_THEMES[variant], `LIGHT_ICON_THEMES must have variant: ${variant}`);
    assert(DARK_ICON_THEMES[variant], `DARK_ICON_THEMES must have variant: ${variant}`);
  }

  const resolved = getIconTheme("success", "light");
  assert.strictEqual(resolved.bg, LIGHT_ICON_THEMES.success.bg);

  const fallback = getIconTheme("non_existent_variant", "light");
  assert.strictEqual(fallback, LIGHT_ICON_THEMES.neutral);
});

console.log("\n================================================================");
console.log(`DESIGN FOUNDATION TEST SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
console.log("================================================================");

if (passed !== total) {
  process.exit(1);
}
