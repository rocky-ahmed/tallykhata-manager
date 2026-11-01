/**
 * src/moneyManagerCustomizationService.js
 * Centralized Personal Money Manager Customization Engine
 * 5-Layer Cascading Style Resolver, V3 Schema Definition, and Lossless Upward Migration
 */

const {
  LIGHT_THEME,
  DARK_THEME,
} = require("./themeService");

const MM_CUSTOMIZATION_PRESETS = {
  default: { id: "default", name: "ডিফল্ট", color: "#B81414", dark: "#EF4444" },
  emerald: { id: "emerald", name: "এমারেল্ড", color: "#10B981", dark: "#064E3B" },
  sapphire: { id: "sapphire", name: "স্যাফায়ার", color: "#2563EB", dark: "#1E3A8A" },
  obsidian: { id: "obsidian", name: "ওবসিডিয়ান", color: "#334155", dark: "#0F172A" },
  rose: { id: "rose", name: "রোজ গোল্ড", color: "#EC4899", dark: "#831843" },
  amber: { id: "amber", name: "অ্যাম্বার", color: "#F59E0B", dark: "#78350F" },
  amethyst: { id: "amethyst", name: "অ্যামিথিস্ট", color: "#8B5CF6", dark: "#4C1D95" },
  royal_indigo: { id: "royal_indigo", name: "রয়্যাল ইন্ডিগো", color: "#4F46E5", dark: "#312E81" },
  crimson_ruby: { id: "crimson_ruby", name: "ক্রিমসন রুবি", color: "#B81414", dark: "#7F1D1D" },
};

const MM_SECTIONS = [
  { id: "dashboard", label: "ড্যাশবোর্ড", icon: "📊" },
  { id: "transactions", label: "লেনদেনসমূহ", icon: "📝" },
  { id: "wallets", label: "ওয়ালেট ও ব্যাংক", icon: "💳" },
  { id: "budgets", label: "বাজেট ও খরচ সীমা", icon: "🎯" },
  { id: "goals", label: "সঞ্চয় লক্ষ্য", icon: "🏆" },
  { id: "analytics", label: "অ্যানালিটিক্স", icon: "📈" },
  { id: "categories", label: "ক্যাটাগরি", icon: "🏷️" },
  { id: "reports", label: "মাসিক বিবরণী", icon: "📑" },
];

function getCanonicalDefaultCustomization() {
  return {
    schemaVersion: 3,
    updatedAt: new Date().toISOString(),
    global: {
      preset: "default",
      accent: "#B81414",
      tint: 0.1,
      textScale: 1.0,
      surfaceMode: "subtle_tint",
      borderStyle: "thin",
      elevation: "medium",
    },
    sections: {
      dashboard: {},
      transactions: {},
      wallets: {},
      budgets: {},
      goals: {},
      analytics: {},
      categories: {},
      reports: {},
    },
    accessibility: {
      minContrastRatio: 4.5,
      minTextScale: 0.85,
      maxTextScale: 1.3,
      minTouchTargetDp: 48,
      enforceContrastGuard: true,
    },
  };
}

function isValidHex(hex) {
  return typeof hex === "string" && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

function hexToRgb(hex) {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function luminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(fgHex, bgHex) {
  try {
    const fg = hexToRgb(fgHex);
    const bg = hexToRgb(bgHex);
    const l1 = luminance(fg.r, fg.g, fg.b);
    const l2 = luminance(bg.r, bg.g, bg.b);
    const lightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return Math.round(((lightest + 0.05) / (darkest + 0.05)) * 100) / 100;
  } catch {
    return 4.5;
  }
}

function blendColors(fgHex, alpha, bgHex) {
  try {
    const fg = hexToRgb(fgHex);
    const bg = hexToRgb(bgHex);
    const r = Math.round(fg.r * alpha + bg.r * (1 - alpha));
    const g = Math.round(fg.g * alpha + bg.g * (1 - alpha));
    const b = Math.round(fg.b * alpha + bg.b * (1 - alpha));
    const toHex = (c) => ("0" + Math.min(255, Math.max(0, c)).toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return bgHex;
  }
}

function computeTintBackground(accent, tint, isDark, cardSurface) {
  const clampedTint = Math.min(0.4, Math.max(0.05, tint));
  if (isDark) {
    const rgb = hexToRgb(accent);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedTint.toFixed(2)})`;
  }
  const alphaHex = ("0" + Math.round(clampedTint * 255).toString(16)).slice(-2).toUpperCase();
  return `${accent}${alphaHex}`;
}

function coerceFloat(val, fallback, min, max) {
  const p = parseFloat(val);
  if (isNaN(p)) return fallback;
  return Math.min(max, Math.max(min, Math.round(p * 100) / 100));
}

function migrateCustomizationToV3(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return getCanonicalDefaultCustomization();
  }

  if (raw.schemaVersion === 3 && raw.global && raw.sections && raw.accessibility) {
    return raw;
  }

  const globalConfig = {
    preset: raw.global?.preset || "default",
    accent: isValidHex(raw.global?.accent) ? raw.global.accent : "#B81414",
    tint: coerceFloat(raw.global?.tint, 0.1, 0.05, 0.4),
    textScale: coerceFloat(raw.global?.textScale, 1.0, 0.85, 1.3),
    surfaceMode: raw.global?.surfaceMode || "subtle_tint",
    borderStyle: raw.global?.borderStyle || "thin",
    elevation: raw.global?.elevation || "medium",
  };

  const migratedSections = {};
  const sourceSections = raw.sections && typeof raw.sections === "object" ? raw.sections : raw;

  const validSectionKeys = [
    "dashboard",
    "transactions",
    "wallets",
    "budgets",
    "goals",
    "analytics",
    "categories",
    "reports",
  ];

  validSectionKeys.forEach((secKey) => {
    const sec = sourceSections[secKey];
    if (sec && typeof sec === "object") {
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

function resolveMMSectionStyle(sectionId, mmCustomization, isDark, currentTheme, subsectionId = null) {
  // Layer 1: Base Design System Tokens
  let accent = isDark ? (currentTheme?.primary || "#EF4444") : (currentTheme?.primary || "#B81414");
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

  const cardSurface = isDark ? (currentTheme?.cardBgElevated || currentTheme?.cardBg || "#1E293B") : (currentTheme?.cardBg || "#FFFFFF");
  const cardBackground = surfaceMode === "solid_card"
    ? cardSurface
    : computeTintBackground(accent, clampedTint, isDark, cardSurface);

  let cardBorder = currentTheme?.cardBorder || (isDark ? "#334155" : "#E2E8F0");
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
    primaryText: currentTheme?.textPrimary || (isDark ? "#F8FAFC" : "#1E293B"),
    secondaryText: currentTheme?.textSecondary || (isDark ? "#94A3B8" : "#64748B"),
    fontScale: clampedScale,
    badgeBackground: computeTintBackground(accessibleAccent, 0.15, isDark, cardSurface),
    badgeText: accessibleAccent,
    elevation,
    getScaledFontSize: (base) => Math.round(base * clampedScale),
  };
}

module.exports = {
  MM_CUSTOMIZATION_PRESETS,
  MM_SECTIONS,
  getCanonicalDefaultCustomization,
  isValidHex,
  hexToRgb,
  luminance,
  getContrastRatio,
  blendColors,
  computeTintBackground,
  coerceFloat,
  migrateCustomizationToV3,
  resolveMMSectionStyle,
};
