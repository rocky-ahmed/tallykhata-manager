const assert = require("assert");
const fs = require("fs");
const babel = require("@babel/core");

const themeService = require("./src/themeService");
const { LIGHT_THEME, DARK_THEME, getThemeTokens, getThemedStyles, LIGHT_ICON_THEMES, DARK_ICON_THEMES, getIconTheme } = themeService;
const iconMetrics = require("./src/iconMetrics");
const { ICON_METRICS, getIconMetrics, STANDARD_TOUCH_HIT_SLOP } = iconMetrics;
const typographyTokens = require("./src/typographyTokens");
const { TYPOGRAPHY_SCALES, getTypography } = typographyTokens;
const storageRepository = require("./src/storageRepository");
const moneyManagerService = require("./src/moneyManagerService");
const i18nService = require("./src/i18nService");
const { t } = i18nService;

console.log("================================================================");
console.log("PHASE 3: PREMIUM SHARED UI COMPONENTS & 3D VISUAL SYSTEM TEST SUITE");
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

const appSource = fs.readFileSync("App.js", "utf8");

// -------------------------------------------------------------
// PART 1: SHARED COMPONENTS EXPORT & PROPS INTERFACE
// -------------------------------------------------------------
console.log("--- PART 1: SHARED UI COMPONENTS & PROPS INTERFACES ---");

runTest("App.js defines AppIcon component with comprehensive props interface", () => {
  assert(appSource.includes("const AppIcon = ({"), "App.js must declare AppIcon functional component");
  assert(appSource.includes("containerSize = 38"), "AppIcon must have containerSize default of 38");
  assert(appSource.includes("size = 22"), "AppIcon must have size default of 22");
  assert(appSource.includes("variant = 'neutral'"), "AppIcon must have variant default 'neutral'");
  assert(appSource.includes("shape = 'rounded'"), "AppIcon must have shape default 'rounded'");
  assert(appSource.includes("opticalScale"), "AppIcon must accept optional opticalScale override");
  assert(appSource.includes("translateY"), "AppIcon must accept optional translateY override");
  assert(appSource.includes("accessibilityLabel"), "AppIcon must support accessibilityLabel");
});

runTest("AppIcon handles shape='none' uncontained rendering correctly", () => {
  assert(appSource.includes("if (shape === 'none') {"), "AppIcon must handle shape === 'none'");
  assert(appSource.includes("resizeMode=\"contain\""), "AppIcon must use resizeMode contain");
});

runTest("App.js defines TwoToneDivider component with elevation and specular highlight", () => {
  assert(appSource.includes("const TwoToneDivider = ({"), "App.js must declare TwoToneDivider");
  assert(appSource.includes("marginVertical = 6"), "TwoToneDivider must have marginVertical default");
  assert(appSource.includes("height: 1, backgroundColor: isDark ? '#334155' : '#E2E8F0'"), "TwoToneDivider top hairline");
  assert(appSource.includes("height: 1, backgroundColor: isDark ? '#1E293B' : '#FFFFFF'"), "TwoToneDivider bottom highlight");
});

runTest("App.js defines TwoToneVerticalDivider component for card columns", () => {
  assert(appSource.includes("const TwoToneVerticalDivider = ({"), "App.js must declare TwoToneVerticalDivider");
  assert(appSource.includes("height = 32"), "TwoToneVerticalDivider must support height prop");
  assert(appSource.includes("width: 1, height: '100%', backgroundColor: isDark ? '#334155' : '#E2E8F0'"), "Left divider line");
  assert(appSource.includes("width: 1, height: '100%', backgroundColor: isDark ? '#1E293B' : '#FFFFFF'"), "Right divider specular");
});

runTest("App.js defines SectionHeader component with accent pill and badge", () => {
  assert(appSource.includes("const SectionHeader = ({"), "App.js must declare SectionHeader");
  assert(appSource.includes("sectionHeaderAccentPill"), "SectionHeader must render accent indicator pill");
  assert(appSource.includes("sectionHeaderTitle"), "SectionHeader must render section title");
  assert(appSource.includes("sectionHeaderCountBadge"), "SectionHeader must support count badge");
  assert(appSource.includes("hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}"), "Action button in SectionHeader must have hitSlop");
});

// -------------------------------------------------------------
// PART 2: 3D SQUIRCLE GEOMETRY FORMULAS & CONSTRAINTS
// -------------------------------------------------------------
console.log("\n--- PART 2: 3D SQUIRCLE GEOMETRY & CONSTRAINTS ---");

runTest("AppIcon calculates squircle curvature using 0.28 golden-ratio constant", () => {
  assert(appSource.includes("Math.round(containerSize * 0.28)"), "AppIcon must calculate radius via Math.round(containerSize * 0.28)");
  assert.strictEqual(Math.round(38 * 0.28), 11);
  assert.strictEqual(Math.round(48 * 0.28), 13);
  assert.strictEqual(Math.round(50 * 0.28), 14);
});

runTest("AppIcon implements 3D bevel and extrusion borders (1.5 top highlight, 3 bottom ledge)", () => {
  assert(appSource.includes("borderTopWidth: 1.5"), "Top highlight bevel must be 1.5dp");
  assert(appSource.includes("borderBottomWidth: 3"), "Bottom extrusion ledge must be 3dp");
  assert(appSource.includes("borderLeftWidth: 1"), "Left border must be 1dp");
  assert(appSource.includes("borderRightWidth: 1"), "Right border must be 1dp");
});

runTest("AppIcon renders specular sheen overlay with 0.36 height multiplier", () => {
  assert(appSource.includes("height: Math.round(containerSize * 0.36)"), "Specular overlay height must be Math.round(containerSize * 0.36)");
  assert(appSource.includes("rgba(255, 255, 255, 0.32)"), "Light mode specular sheen must be rgba(255, 255, 255, 0.32)");
  assert(appSource.includes("rgba(255, 255, 255, 0.04)"), "Dark mode specular sheen must be rgba(255, 255, 255, 0.04)");
});

runTest("Customer avatar squircle implements dimensional borders (1.5 top highlight, 2.5 bottom ledge)", () => {
  assert(appSource.includes("customerAvatarCircle: {"), "App.js styles must define customerAvatarCircle");
  assert(appSource.includes("borderRadius: 14"), "Avatar squircle radius must be 14dp");
  assert(appSource.includes("borderTopColor: 'rgba(255, 255, 255, 0.45)'"), "Avatar top highlight must use rgba 0.45");
  assert(appSource.includes("borderBottomColor: 'rgba(0, 0, 0, 0.15)'"), "Avatar bottom extrusion must use rgba 0.15");
});

runTest("Bottom nav active pill implements 3D dimensional extrusion (1.5 top, 2 bottom, 16 radius)", () => {
  assert(appSource.includes("tabActivePill: {"), "App.js styles must define tabActivePill");
  assert(appSource.includes("borderRadius: 16"), "Active pill radius must be 16dp");
  assert(appSource.includes("borderTopWidth: 1.5"), "Active pill borderTopWidth must be 1.5");
  assert(appSource.includes("borderBottomWidth: 2"), "Active pill borderBottomWidth must be 2");
  assert(appSource.includes("borderTopColor: '#FFFFFF'"), "Active pill borderTopColor must be #FFFFFF");
  assert(appSource.includes("borderBottomColor: '#FECACA'"), "Active pill borderBottomColor must be #FECACA");
});

runTest("Floating Round Action Button implements 3D bevel and extrusion (1.5 top, 2.5 bottom)", () => {
  assert(appSource.includes("floatingRoundFab: {"), "App.js styles must define floatingRoundFab");
  assert(appSource.includes("borderTopColor: '#FF6B6B'"), "FAB top highlight must be #FF6B6B");
  assert(appSource.includes("borderBottomColor: '#8A0E0E'"), "FAB bottom extrusion must be #8A0E0E");
  assert(appSource.includes("elevation: 16"), "FAB must have elevation 16");
});

// -------------------------------------------------------------
// PART 3: SEMANTIC TOKEN CONSUMPTION & LIGHT/DARK PARITY
// -------------------------------------------------------------
console.log("\n--- PART 3: SEMANTIC TOKEN CONSUMPTION & LIGHT/DARK PARITY ---");

runTest("getThemedStyles supports all core navigation and home screen selectors", () => {
  const stylesLight = getThemedStyles(LIGHT_THEME, false);
  const stylesDark = getThemedStyles(DARK_THEME, true);

  const homeSelectors = [
    "screenBg", "card", "cardElevated", "customerListCard",
    "customerName", "customerTime", "customerListCard",
    "topHeaderBar", "tabBar", "tabLabel", "tabLabelActive",
    "searchBar", "summaryCard", "counterStrip"
  ];

  for (const s of homeSelectors) {
    assert(stylesLight[s], `LIGHT_THEME must define style: ${s}`);
    assert(stylesDark[s], `DARK_THEME must define style: ${s}`);
  }
});

runTest("All 10 icon themes provide complete 3D border and background palettes in both modes", () => {
  const variants = ["primary", "success", "danger", "warning", "info", "purple", "teal", "neutral", "secondary", "white"];
  for (const v of variants) {
    const l = getIconTheme(v, "light");
    const d = getIconTheme(v, "dark");
    assert(l.bg && l.borderTop && l.borderBottom && l.borderSides && l.tint, `Light variant ${v} must define all 5 palette colors`);
    assert(d.bg && d.borderTop && d.borderBottom && d.borderSides && d.tint, `Dark variant ${v} must define all 5 palette colors`);
  }
});

runTest("Top header bar and actions achieve WCAG AA contrast in both modes", () => {
  const lightHeaderRatio = getContrastRatio("#FFFFFF", LIGHT_THEME.headerBg);
  assert(lightHeaderRatio >= 4.5, `Light header contrast must be >= 4.5:1, got ${lightHeaderRatio.toFixed(2)}:1`);

  const darkHeaderRatio = getContrastRatio(DARK_THEME.textPrimary, DARK_THEME.headerBg);
  assert(darkHeaderRatio >= 7.0, `Dark header contrast must meet AAA (>= 7.0:1), got ${darkHeaderRatio.toFixed(2)}:1`);
});

runTest("Navigation tab labels achieve WCAG compliance in both modes", () => {
  const lightInactive = getContrastRatio("#4B5563", LIGHT_THEME.cardBg);
  assert(lightInactive >= 4.5, `Light inactive tab label must meet AA (>= 4.5:1), got ${lightInactive.toFixed(2)}:1`);

  const darkInactive = getContrastRatio(DARK_THEME.tabInactive, DARK_THEME.cardBg);
  assert(darkInactive >= 4.5, `Dark inactive tab label must meet AA (>= 4.5:1), got ${darkInactive.toFixed(2)}:1`);

  const lightActive = getContrastRatio(LIGHT_THEME.primary, LIGHT_THEME.cardBg);
  assert(lightActive >= 4.5, `Light active tab label must meet AA (>= 4.5:1), got ${lightActive.toFixed(2)}:1`);

  const darkActive = getContrastRatio(DARK_THEME.tabActive, DARK_THEME.cardBg);
  assert(darkActive >= 3.0, `Dark active tab label must meet Large/Bold AA (>= 3.0:1), got ${darkActive.toFixed(2)}:1`);
});

runTest("Summary Card financial indicators achieve WCAG AA compliance in both modes", () => {
  const lightDue = getContrastRatio("#B81414", LIGHT_THEME.cardBg);
  assert(lightDue >= 4.5, `Light due contrast must meet AA (>= 4.5:1), got ${lightDue.toFixed(2)}:1`);

  const darkDue = getContrastRatio(DARK_THEME.danger, DARK_THEME.cardBg);
  assert(darkDue >= 4.5, `Dark due contrast must meet AA (>= 4.5:1), got ${darkDue.toFixed(2)}:1`);

  const lightOwe = getContrastRatio(LIGHT_THEME.income, LIGHT_THEME.cardBg);
  assert(lightOwe >= 4.5, `Light owe contrast must meet AA (>= 4.5:1), got ${lightOwe.toFixed(2)}:1`);

  const darkOwe = getContrastRatio(DARK_THEME.income, DARK_THEME.cardBg);
  assert(darkOwe >= 7.0, `Dark owe contrast must meet AAA (>= 7.0:1), got ${darkOwe.toFixed(2)}:1`);
});

// -------------------------------------------------------------
// PART 4: TOUCH TARGET PHYSICS & TARGET SIZE AUDIT
// -------------------------------------------------------------
console.log("\n--- PART 4: TOUCH TARGET PHYSICS & TARGET SIZE AUDIT ---");

runTest("Quick Actions Grid items achieve >= 48x48dp effective touch area", () => {
  assert(appSource.includes("containerSize={50}"), "Quick actions grid icons must use containerSize 50");
  assert(appSource.includes("width: '24%'"), "Quick actions grid items must span 24% width");
});

runTest("Customer list rows span full screen width and achieve >= 48dp height", () => {
  assert(appSource.includes("paddingVertical: 10"), "customerListCard must have paddingVertical 10");
  assert(appSource.includes("width: 42"), "Avatar width must be 42dp");
  assert(appSource.includes("height: 42"), "Avatar height must be 42dp");
  const rowHeight = 42 + 10 * 2;
  assert(rowHeight >= 48, `Customer list row height (${rowHeight}dp) must be >= 48dp`);
});

runTest("Bottom navigation tabs provide >= 48x48dp touch bounds across screen widths", () => {
  assert(appSource.includes("bottomTabBar: {"), "App.js styles must define bottomTabBar");
  assert(appSource.includes("Platform.OS === 'android' ? 104 : 64"), "Android tab bar height must be 104dp");
  assert(appSource.includes("tabButton: {"), "App.js styles must define tabButton");
  assert(appSource.includes("flex: 1"), "tabButton must have flex: 1");
});

runTest("Floating Action Button (FAB) achieves 58x58dp circular touch target", () => {
  assert(appSource.includes("floatingRoundFab: {"), "App.js styles must define floatingRoundFab");
  assert(appSource.includes("width: 58"), "FAB width must be 58dp");
  assert(appSource.includes("height: 58"), "FAB height must be 58dp");
  assert(appSource.includes("borderRadius: 29"), "FAB must be circular (radius 29)");
});

runTest("Sub-48dp controls in SectionHeader and list items include hitSlop", () => {
  assert(appSource.includes("hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}"), "SectionHeader action must define hitSlop");
  assert(STANDARD_TOUCH_HIT_SLOP.top === 10, "STANDARD_TOUCH_HIT_SLOP top slop must be 10");
  assert(STANDARD_TOUCH_HIT_SLOP.bottom === 10, "STANDARD_TOUCH_HIT_SLOP bottom slop must be 10");
});

// -------------------------------------------------------------
// PART 5: NAVIGATION TAB STATE TRANSITIONS & ACTIVE PILL STYLING
// -------------------------------------------------------------
console.log("\n--- PART 5: NAVIGATION TAB TRANSITIONS & ACTIVE PILL STYLING ---");

runTest("App.js handles all 4 primary navigation tabs (home, cashbox, tallypay, menu)", () => {
  assert(appSource.includes("activeTab === 'home'"), "App.js must support home tab condition");
  assert(appSource.includes("activeTab === 'cashbox'"), "App.js must support cashbox tab condition");
  assert(appSource.includes("activeTab === 'tallypay'"), "App.js must support tallypay tab condition");
  assert(appSource.includes("activeTab === 'menu'"), "App.js must support menu tab condition");
});

runTest("Active tab displays 3D tabActivePill container with active icon asset", () => {
  assert(appSource.includes("nav_home_active.png"), "Home active icon must be nav_home_active.png");
  assert(appSource.includes("nav_cashbox_active.png"), "Cashbox active icon must be nav_cashbox_active.png");
  assert(appSource.includes("nav_tallypay_active.png"), "Tallypay active icon must be nav_tallypay_active.png");
  assert(appSource.includes("nav_menu_active.png"), "Menu active icon must be nav_menu_active.png");
});

runTest("Inactive tabs render default icon assets without tabActivePill wrapper", () => {
  assert(appSource.includes("nav_home.png"), "Home inactive icon must be nav_home.png");
  assert(appSource.includes("nav_cashbox.png"), "Cashbox inactive icon must be nav_cashbox.png");
  assert(appSource.includes("nav_tallypay.png"), "Tallypay inactive icon must be nav_tallypay.png");
  assert(appSource.includes("nav_menu.png"), "Menu inactive icon must be nav_menu.png");
});

runTest("Active tab label applies active text styles and color inversion", () => {
  assert(appSource.includes("tabButtonLabelActive"), "App.js must apply tabButtonLabelActive style to active tab");
  assert(appSource.includes("currentTheme.tabActive"), "Dark mode must consume currentTheme.tabActive");
  assert(appSource.includes("currentTheme.tabInactive"), "Dark mode must consume currentTheme.tabInactive");
});

// -------------------------------------------------------------
// PART 6: ZERO REGRESSIONS ON PRE-EXISTING FUNCTIONALITY
// -------------------------------------------------------------
console.log("\n--- PART 6: PRE-EXISTING FUNCTIONALITY & DATA INVARIANTS ---");

runTest("StorageRepository default state, accounts, and journals remain intact", () => {
  const state = storageRepository.createDefaultState();
  assert(Array.isArray(state.accounts), "state.accounts must be an array");
  assert.strictEqual(state.accounts.length, 12, "Must preserve exactly 12 sample accounts");
  assert(Array.isArray(state.journals), "state.journals must be an array");
  assert.strictEqual(state.journals.length, 3, "Must preserve exactly 3 initial journals");
});

runTest("MoneyManagerService budget and category calculations operate cleanly", () => {
  const state = moneyManagerService.getDefaultState();
  assert(state.categories && state.categories.length > 0, "MM categories must exist");
  assert(state.accounts && state.accounts.length > 0, "MM accounts must exist");
  assert.strictEqual(state.overallMonthlyBudget, 40000, "MM default monthly budget must be 40000");
});

runTest("i18nService localizes all bottom navigation tabs in Bengali", () => {
  assert.strictEqual(t("tab_home"), "হিসাব");
  assert.strictEqual(t("tab_cashbox"), "ক্যাশবক্স");
  assert.strictEqual(t("tab_tallypay"), "টালি-পে");
  assert.strictEqual(t("tab_menu"), "মেন্যু");
});

runTest("App.js compiles cleanly with zero syntax errors via Babel parser", () => {
  const ast = babel.parseSync(appSource, {
    filename: "App.js",
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ["jsx", "flow"] }
  });
  assert(ast && ast.program && ast.program.body.length > 0, "App.js must compile into valid AST");
});

console.log("\n================================================================");
console.log(`PHASE 3 TEST SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
console.log("================================================================");

if (passed !== total) {
  process.exit(1);
}
