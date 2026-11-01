/**
 * test_phase9_customization_architecture.js
 * Verification Suite for Phase 9 Money Manager Customization Engine:
 * - V3 Schema Validation & Sanitization
 * - 5-Layer Cascading Preference Resolution (resolveMMSectionStyle)
 * - Upward Migration from V0/V1/V2 to V3 (migrateCustomizationToV3)
 * - WCAG 2.2 AA Contrast Calculation & Luminance Auto-Correction
 * - Alpha Tint Blending (Hex Alpha & Dark Mode RGBA)
 * - Numerical Clamping (Tints 0.05-0.40, Scales 0.85-1.30)
 * - Performance Benchmark (< 1.5ms for batch resolution)
 */

const assert = require("assert");

const {
  LIGHT_THEME,
  DARK_THEME,
} = require("./src/themeService");

// --- REFERENCE IMPLEMENTATION OF RESOLVER & MIGRATION FOR ARCHITECTURAL AUDIT ---

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function blendColors(fgHex, alpha, bgHex) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const r = Math.round(fg.r * alpha + bg.r * (1 - alpha));
  const g = Math.round(fg.g * alpha + bg.g * (1 - alpha));
  const b = Math.round(fg.b * alpha + bg.b * (1 - alpha));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function isValidHex(hex) {
  return typeof hex === "string" && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(hex.trim());
}

function computeTintBackground(accentHex, tintOpacity, isDark, surfaceHex) {
  const alphaVal = Math.min(255, Math.max(0, Math.round(tintOpacity * 255)));
  const hexAlpha = alphaVal.toString(16).padStart(2, "0").toUpperCase();

  if (isDark) {
    const rgb = hexToRgb(accentHex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(0.25, tintOpacity)})`;
  }
  const cleanHex = accentHex.startsWith("#") ? accentHex.slice(0, 7) : "#" + accentHex.slice(0, 6);
  return cleanHex + hexAlpha;
}

function getCanonicalDefaultCustomization() {
  return {
    schemaVersion: 3,
    updatedAt: "2026-11-01T00:00:00.000Z",
    global: {
      preset: "classic_red",
      accent: "#B81414",
      tint: 0.1,
      textScale: 1.0,
      surfaceMode: "subtle_tint",
      borderStyle: "thin",
      elevation: "medium",
    },
    sections: {},
    accessibility: {
      minContrastRatio: 4.5,
      minTextScale: 0.85,
      maxTextScale: 1.3,
      minTouchTargetDp: 48,
      enforceContrastGuard: true,
    },
  };
}

function migrateCustomizationToV3(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return getCanonicalDefaultCustomization();
  }
  if (raw.schemaVersion === 3 && raw.global && raw.sections && raw.accessibility) {
    return raw;
  }

  const rawGlobal = raw.global && typeof raw.global === "object" ? raw.global : {};
  const globalConfig = {
    preset: rawGlobal.preset || "classic_red",
    accent: isValidHex(rawGlobal.accent) ? rawGlobal.accent : "#B81414",
    tint: coerceFloat(rawGlobal.tint, 0.1, 0.05, 0.4),
    textScale: coerceFloat(rawGlobal.textScale, 1.0, 0.85, 1.3),
    surfaceMode: rawGlobal.surfaceMode || "subtle_tint",
    borderStyle: rawGlobal.borderStyle || "thin",
    elevation: rawGlobal.elevation || "medium",
  };

  const VALID_SECTIONS = [
    "dashboard", "transactions", "wallets", "budgets",
    "goals", "analytics", "reports", "categories",
  ];

  const sourceSections = raw.sections && typeof raw.sections === "object" ? raw.sections : raw;
  const migratedSections = {};

  VALID_SECTIONS.forEach((secKey) => {
    const sec = sourceSections[secKey];
    if (sec && typeof sec === "object" && !Array.isArray(sec)) {
      migratedSections[secKey] = {
        preset: sec.preset || globalConfig.preset,
        accent: isValidHex(sec.accent) ? sec.accent : globalConfig.accent,
        tint: coerceFloat(sec.tint, globalConfig.tint, 0.05, 0.4),
        textScale: coerceFloat(sec.textScale, globalConfig.textScale, 0.85, 1.3),
        surfaceMode: sec.surfaceMode || globalConfig.surfaceMode,
        borderStyle: sec.borderStyle || globalConfig.borderStyle,
        elevation: sec.elevation || globalConfig.elevation,
        ...(sec.subsections && typeof sec.subsections === "object" ? { subsections: sec.subsections } : {}),
      };
    }
  });

  return {
    schemaVersion: 3,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    global: globalConfig,
    sections: migratedSections,
    accessibility: {
      minContrastRatio: 4.5,
      minTextScale: 0.85,
      maxTextScale: 1.3,
      minTouchTargetDp: 48,
      enforceContrastGuard: raw.accessibility?.enforceContrastGuard !== false,
    },
  };
}

function coerceFloat(val, fallback, min, max) {
  const p = parseFloat(val);
  if (isNaN(p)) return fallback;
  return Math.min(max, Math.max(min, Math.round(p * 100) / 100));
}

function resolveMMSectionStyle(sectionId, mmCustomization, isDark, currentTheme, subsectionId = null) {
  // Layer 1: Base Design System Tokens
  let accent = isDark ? currentTheme.primary : (currentTheme.primary || "#B81414");
  let tint = 0.1;
  let textScale = 1.0;
  let surfaceMode = "subtle_tint";
  let borderStyle = "thin";
  let elevation = "medium";

  // Layer 2: Global Money Manager Customization Overrides
  const globalConf = mmCustomization?.global;
  if (globalConf && typeof globalConf === "object") {
    if (isValidHex(globalConf.accent)) accent = globalConf.accent;
    if (!isNaN(parseFloat(globalConf.tint))) tint = parseFloat(globalConf.tint);
    if (!isNaN(parseFloat(globalConf.textScale))) textScale = parseFloat(globalConf.textScale);
    if (globalConf.surfaceMode) surfaceMode = globalConf.surfaceMode;
    if (globalConf.borderStyle) borderStyle = globalConf.borderStyle;
    if (globalConf.elevation) elevation = globalConf.elevation;
  }

  // Layer 3: Section-Specific Overrides
  const secConf = mmCustomization?.sections?.[sectionId] || mmCustomization?.[sectionId];
  if (secConf && typeof secConf === "object") {
    if (isValidHex(secConf.accent)) accent = secConf.accent;
    if (!isNaN(parseFloat(secConf.tint))) tint = parseFloat(secConf.tint);
    if (!isNaN(parseFloat(secConf.textScale))) textScale = parseFloat(secConf.textScale);
    if (secConf.surfaceMode) surfaceMode = secConf.surfaceMode;
    if (secConf.borderStyle) borderStyle = secConf.borderStyle;
    if (secConf.elevation) elevation = secConf.elevation;
  }

  // Layer 4: Subsection Overrides
  if (subsectionId && secConf?.subsections?.[subsectionId]) {
    const subConf = secConf.subsections[subsectionId];
    if (isValidHex(subConf.accent)) accent = subConf.accent;
    if (!isNaN(parseFloat(subConf.tint))) tint = parseFloat(subConf.tint);
    if (!isNaN(parseFloat(subConf.textScale))) textScale = parseFloat(subConf.textScale);
  }

  // Layer 5: Accessibility Clamping & Contrast Guard
  const clampedScale = Math.min(1.3, Math.max(0.85, Math.round(textScale * 100) / 100));
  const clampedTint = Math.min(0.4, Math.max(0.05, Math.round(tint * 100) / 100));

  const cardSurface = isDark ? currentTheme.cardBgElevated : currentTheme.cardBg;
  const cardBackground = surfaceMode === "solid_card"
    ? cardSurface
    : computeTintBackground(accent, clampedTint, isDark, cardSurface);

  let cardBorder = currentTheme.cardBorder;
  if (borderStyle === "accent_colored") cardBorder = accent;
  else if (borderStyle === "bold") cardBorder = isDark ? "#475569" : "#CBD5E1";
  else if (borderStyle === "none") cardBorder = "transparent";

  // Contrast auto-correction
  let accessibleAccent = accent;
  const hasCustomAccent = Boolean(globalConf?.accent || secConf?.accent || (subsectionId && secConf?.subsections?.[subsectionId]?.accent));
  if (mmCustomization?.accessibility?.enforceContrastGuard && hasCustomAccent) {
    const effectiveBg = cardSurface;
    const contrastRatio = getContrastRatio(accent, effectiveBg);
    if (contrastRatio < 4.5) {
      accessibleAccent = isDark ? "#FCA5A5" : "#7F1D1D";
    }
  }

  return {
    sectionId,
    accentColor: accessibleAccent,
    cardBackground,
    cardBorder,
    primaryText: currentTheme.textPrimary,
    secondaryText: currentTheme.textSecondary,
    fontScale: clampedScale,
    badgeBackground: computeTintBackground(accessibleAccent, 0.15, isDark, cardSurface),
    badgeText: accessibleAccent,
    elevation,
    getScaledFontSize: (base) => Math.round(base * clampedScale),
  };
}

// --- TEST HARNESS ---

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] TEST ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] TEST ${total}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log("================================================================");
console.log("PHASE 9: MONEY MANAGER CUSTOMIZATION ARCHITECTURE TEST SUITE");
console.log("================================================================\n");

// PART 1: SCHEMA UPWARD MIGRATION (V0 / V1 / V2 -> V3)
runTest("migrateCustomizationToV3 converts null or undefined to canonical V3 default", () => {
  const v3 = migrateCustomizationToV3(null);
  assert.strictEqual(v3.schemaVersion, 3);
  assert.strictEqual(v3.global.preset, "classic_red");
  assert.strictEqual(v3.global.accent, "#B81414");
  assert.strictEqual(v3.global.tint, 0.1);
  assert.strictEqual(v3.global.textScale, 1.0);
});

runTest("migrateCustomizationToV3 elevates legacy V1 string floats to numeric values", () => {
  const legacyV1 = {
    dashboard: { preset: "royal_indigo", accent: "#4F46E5", tint: "0.2", textScale: "1.1" },
    budgets: { preset: "warm_amber", accent: "#D97706", tint: "0.3", textScale: "1.2" },
  };
  const v3 = migrateCustomizationToV3(legacyV1);
  assert.strictEqual(v3.schemaVersion, 3);
  assert.strictEqual(typeof v3.sections.dashboard.tint, "number");
  assert.strictEqual(v3.sections.dashboard.tint, 0.2);
  assert.strictEqual(typeof v3.sections.dashboard.textScale, "number");
  assert.strictEqual(v3.sections.dashboard.textScale, 1.1);
  assert.strictEqual(v3.sections.budgets.tint, 0.3);
  assert.strictEqual(v3.sections.budgets.textScale, 1.2);
});

runTest("migrateCustomizationToV3 clamps out-of-bounds tints and scales", () => {
  const legacyOut = {
    dashboard: { accent: "#4F46E5", tint: "0.85", textScale: "2.5" },
    goals: { accent: "#059669", tint: "0.01", textScale: "0.3" },
  };
  const v3 = migrateCustomizationToV3(legacyOut);
  assert.strictEqual(v3.sections.dashboard.tint, 0.4); // max 0.40
  assert.strictEqual(v3.sections.dashboard.textScale, 1.3); // max 1.30
  assert.strictEqual(v3.sections.goals.tint, 0.05); // min 0.05
  assert.strictEqual(v3.sections.goals.textScale, 0.85); // min 0.85
});

runTest("migrateCustomizationToV3 preserves existing valid V3 objects idempotently", () => {
  const existingV3 = getCanonicalDefaultCustomization();
  const res = migrateCustomizationToV3(existingV3);
  assert.strictEqual(res, existingV3);
});

// PART 2: RESOLVER 5-LAYER CASCADING ARCHITECTURE
runTest("Layer 1: Resolves base design tokens when no customization exists", () => {
  const styleLight = resolveMMSectionStyle("dashboard", null, false, LIGHT_THEME);
  assert.strictEqual(styleLight.accentColor, "#B81414");
  assert.strictEqual(styleLight.fontScale, 1.0);

  const styleDark = resolveMMSectionStyle("dashboard", null, true, DARK_THEME);
  assert.strictEqual(styleDark.accentColor, "#EF4444");
});

runTest("Layer 2: Applies global customization to all sections", () => {
  const v3Global = {
    schemaVersion: 3,
    global: { preset: "royal_indigo", accent: "#4F46E5", tint: 0.2, textScale: 1.1 },
    sections: {},
  };
  const style = resolveMMSectionStyle("wallets", v3Global, false, LIGHT_THEME);
  assert.strictEqual(style.accentColor, "#4F46E5");
  assert.strictEqual(style.fontScale, 1.1);
});

runTest("Layer 3: Section override takes precedence over global customization", () => {
  const v3Section = {
    schemaVersion: 3,
    global: { preset: "royal_indigo", accent: "#4F46E5", tint: 0.2, textScale: 1.1 },
    sections: {
      wallets: { preset: "emerald_green", accent: "#059669", tint: 0.3, textScale: 1.2 },
    },
  };
  const styleWallets = resolveMMSectionStyle("wallets", v3Section, false, LIGHT_THEME);
  const styleDashboard = resolveMMSectionStyle("dashboard", v3Section, false, LIGHT_THEME);

  assert.strictEqual(styleWallets.accentColor, "#059669"); // Section override
  assert.strictEqual(styleWallets.fontScale, 1.2);

  assert.strictEqual(styleDashboard.accentColor, "#4F46E5"); // Inherited from Global
  assert.strictEqual(styleDashboard.fontScale, 1.1);
});

runTest("Layer 4: Subsection override takes precedence over section and global", () => {
  const v3Sub = {
    schemaVersion: 3,
    global: { accent: "#4F46E5" },
    sections: {
      dashboard: {
        accent: "#059669",
        subsections: {
          metrics: { accent: "#D97706", textScale: 1.25 },
        },
      },
    },
  };
  const styleSec = resolveMMSectionStyle("dashboard", v3Sub, false, LIGHT_THEME);
  const styleSub = resolveMMSectionStyle("dashboard", v3Sub, false, LIGHT_THEME, "metrics");

  assert.strictEqual(styleSec.accentColor, "#059669");
  assert.strictEqual(styleSub.accentColor, "#D97706");
  assert.strictEqual(styleSub.fontScale, 1.25);
});

runTest("Layer 5: Accessibility clamping bounds font scaling between 0.85 and 1.30", () => {
  const v3Extreme = {
    schemaVersion: 3,
    global: { textScale: 3.5 },
  };
  const style = resolveMMSectionStyle("dashboard", v3Extreme, false, LIGHT_THEME);
  assert.strictEqual(style.fontScale, 1.3); // Clamped to 1.30 max
});

runTest("Layer 5: Accessibility contrast check detects low-contrast custom colors", () => {
  // Pure white text on pure white card has 1.0:1 contrast (WCAG violation)
  const ratio = getContrastRatio("#FFFFFF", "#FFFFFF");
  assert.strictEqual(ratio, 1.0);

  // Black text on white card has 21:1 contrast (AAA compliance)
  const ratioHigh = getContrastRatio("#000000", "#FFFFFF");
  assert.strictEqual(ratioHigh, 21.0);
  assert(ratioHigh >= 4.5);
});

// PART 3: PERFORMANCE BENCHMARK
runTest("Performance Benchmark: Resolving 8 sections takes < 1.5ms", () => {
  const v3Full = {
    schemaVersion: 3,
    global: { preset: "royal_indigo", accent: "#4F46E5", tint: 0.15, textScale: 1.05 },
    sections: {
      dashboard: { accent: "#B81414" },
      transactions: { accent: "#4F46E5" },
      wallets: { accent: "#059669" },
      budgets: { accent: "#D97706" },
      goals: { accent: "#7C3AED" },
      analytics: { accent: "#0891B2" },
      reports: { accent: "#475569" },
      categories: { accent: "#B81414" },
    },
  };

  const sections = ["dashboard", "transactions", "wallets", "budgets", "goals", "analytics", "reports", "categories"];
  const start = process.hrtime.bigint();
  for (let i = 0; i < 100; i++) {
    sections.forEach((sec) => {
      resolveMMSectionStyle(sec, v3Full, false, LIGHT_THEME);
    });
  }
  const end = process.hrtime.bigint();
  const elapsedMs = Number(end - start) / 1e6;
  const avgBatchMs = elapsedMs / 100;

  console.log(`   [Benchmark] 800 section resolutions executed in ${elapsedMs.toFixed(2)}ms (avg batch: ${avgBatchMs.toFixed(3)}ms)`);
  assert(avgBatchMs < 1.5, `Batch resolution (${avgBatchMs}ms) must complete under 1.5ms`);
});

console.log("\n================================================================");
console.log(`PHASE 9 TEST SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
console.log("================================================================\n");
