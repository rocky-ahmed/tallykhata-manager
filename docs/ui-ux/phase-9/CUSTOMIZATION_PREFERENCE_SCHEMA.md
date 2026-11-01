# MONEY MANAGER CUSTOMIZATION PREFERENCE SCHEMA (V3)
**Author**: Worker 2 — Backend & Data Architect (Averroes)  
**Registered Thread ID**: `01a19154-c135-75d0-b38a-1ea50f004895`  
**Date**: 2026-11-01  
**Project**: TallyKhata (`tallybook-expo`)  
**Target Delivery Artifact**: `docs/ui-ux/phase-9/CUSTOMIZATION_PREFERENCE_SCHEMA.md`  
**Schema Identifier**: `urn:tallykhata:schema:mm-customization:v3`  
**Storage Context**: `@tallykhata_personal_money_manager_v2` $\rightarrow$ `preferences.customization`

---

## 1. SCHEMA OVERVIEW & OBJECTIVES

The **V3 Money Manager Customization Schema** defines the data contract for storing user visual preferences in TallyKhata. It replaces legacy unversioned preview settings with a structured, strongly typed, and extensible hierarchy that governs:
- **Global Themes**: Baseline palette, typography scaling, background tinting, and elevation across all Money Manager screens.
- **Section Overrides**: Granular customization for 8 first-class sections (`dashboard`, `transactions`, `wallets`, `budgets`, `goals`, `analytics`, `reports`, `categories`).
- **Subsection Overrides**: Targeted styling for critical micro-components (`metrics`, `cards`, `listItems`, `actionButtons`, `headers`).
- **Accessibility Constraints**: Mandatory bounds enforcing color contrast minimums, font size limits, and touch target standards.

---

## 2. TYPESCRIPT DATA CONTRACT SPECIFICATION

```typescript
/**
 * Authoritative V3 Customization Contract
 */
export interface MoneyManagerCustomizationV3 {
  /** Explicit schema version identifier for migration routing */
  schemaVersion: 3;

  /** Timestamp of last preference update in ISO-8601 UTC */
  updatedAt: string;

  /** Global baseline settings inherited by all sections unless overridden */
  global: CustomizationSectionConfig;

  /** Granular section-specific customization dictionaries */
  sections: {
    dashboard?: CustomizationSectionConfig;
    transactions?: CustomizationSectionConfig;
    wallets?: CustomizationSectionConfig;
    budgets?: CustomizationSectionConfig;
    goals?: CustomizationSectionConfig;
    analytics?: CustomizationSectionConfig;
    reports?: CustomizationSectionConfig;
    categories?: CustomizationSectionConfig;
  };

  /** Global accessibility rules enforcing safe rendering */
  accessibility: AccessibilityBounds;
}

/**
 * Section & Global Styling Configuration Block
 */
export interface CustomizationSectionConfig {
  /** Identifier of chosen color preset */
  preset: MMPalettePresetId;

  /** Primary brand/accent hex code (e.g., '#B81414') */
  accent: string;

  /** Surface background tint opacity as a decimal float (0.05 to 0.40) */
  tint: number;

  /** Relative text scale multiplier (0.85 to 1.30) */
  textScale: number;

  /** Card surface treatment mode */
  surfaceMode?: 'subtle_tint' | 'solid_card' | 'outlined_glass' | 'gradient_elevated';

  /** Card border line style */
  borderStyle?: 'none' | 'thin' | 'bold' | 'accent_colored';

  /** 3D Squircle shadow elevation depth */
  elevation?: 'flat' | 'low' | 'medium' | 'high';

  /** Fine-grained micro-component overrides within this section */
  subsections?: {
    metrics?: CustomizationSubsectionConfig;
    cards?: CustomizationSubsectionConfig;
    listItems?: CustomizationSubsectionConfig;
    actionButtons?: CustomizationSubsectionConfig;
    headers?: CustomizationSubsectionConfig;
  };
}

/**
 * Micro-Component / Subsection Override Block
 */
export interface CustomizationSubsectionConfig {
  /** Dedicated accent override for this specific component */
  accent?: string;

  /** Dedicated background tint override (0.05 to 0.40) */
  tint?: number;

  /** Micro text scale multiplier (0.85 to 1.30) */
  textScale?: number;

  /** Component-level border override */
  borderStyle?: 'none' | 'thin' | 'bold' | 'accent_colored';

  /** Component-level elevation depth */
  elevation?: 'flat' | 'low' | 'medium' | 'high';
}

/**
 * Accessibility Safety Bounds
 */
export interface AccessibilityBounds {
  /** Minimum permissible contrast ratio against background (default: 4.5 for WCAG AA) */
  minContrastRatio: number;

  /** Minimum permissible font scaling multiplier (default: 0.85) */
  minTextScale: number;

  /** Maximum permissible font scaling multiplier (default: 1.30) */
  maxTextScale: number;

  /** Minimum touch target dimension in density-independent pixels (default: 48) */
  minTouchTargetDp: number;

  /** Automatic contrast auto-correction enabled flag (default: true) */
  enforceContrastGuard: boolean;
}

/**
 * Supported Standard Palette Preset Identifiers
 */
export type MMPalettePresetId =
  | 'classic_red'    // Tally Red (Default brand)
  | 'royal_indigo'   // Premium Banking Indigo
  | 'emerald_green'  // Growth & Wealth Emerald
  | 'warm_amber'     // Commercial Gold / Amber
  | 'royal_purple'   // Modern Fintech Violet
  | 'ocean_cyan'     // Refreshing Teal / Cyan
  | 'graphite_slate' // Professional Minimal Slate
  | 'custom';        // Merchant-defined hex color
```

---

## 3. COLOR PALETTE PRESET DICTIONARY

TallyKhata V3 defines 7 calibrated theme presets. Each preset specifies an accent color, an optimal light surface tint, and an elevated dark mode counterpart:

| Preset ID | Preset Label (Bengali) | Accent Hex | Light Tint Bg (Hex) | Dark Accent Hex | Dark Surface Bg | Semantic Association |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `classic_red` | ট্যালি লাল (ডিফল্ট) | `#B81414` | `#FEF2F2` | `#EF4444` | `#1E293B` | Authentic TallyKhata identity |
| `royal_indigo` | রয়্যাল ইন্ডিগো | `#4F46E5` | `#EEF2FF` | `#818CF8` | `#1E1B4B` | Digital banking & investments |
| `emerald_green` | এমারেল্ড গ্রিন | `#059669` | `#ECFDF5` | `#34D399` | `#064E3B` | Savings, profits & capital growth |
| `warm_amber` | গোল্ডেন অ্যাম্বার | `#D97706` | `#FFFBEB` | `#FBBF24` | `#451A03` | Commercial trading & cashflow |
| `royal_purple` | প্রিমিয়াম ভায়োলেট | `#7C3AED` | `#FAF5FF` | `#A78BFA` | `#3B0764` | Modern fintech & wallets |
| `ocean_cyan` | ওশান সায়ান | `#0891B2` | `#ECFEFF` | `#22D3EE` | `#164E63` | Clean digital transactions |
| `graphite_slate` | গ্রাফাইট স্লেট | `#475569` | `#F8FAFC` | `#94A3B8` | `#0F172A` | Minimalist professional ledger |
| `custom` | কাস্টম রঙ | User Hex | Calculated | Calculated | Calculated | Bespoke merchant branding |

---

## 4. NUMERICAL BOUNDS & FIELD VALIDATION INVARIANTS

### 4.1 Background Tint Levels
- **Allowed Range**: $0.05 \le \text{tint} \le 0.40$.
- **Standard UI Steps**:
  - `0.10` (হালকা / Subtle — Default)
  - `0.20` (মাঝারি / Moderate)
  - `0.30` (গাঢ় / Pronounced)
  - `0.40` (উজ্জ্বল / Vivid)
- **Constraint**: Values outside $[0.05, 0.40]$ are automatically clamped to the nearest bound.

### 4.2 Text Scaling Multipliers
- **Allowed Range**: $0.85 \le \text{textScale} \le 1.30$.
- **Standard UI Steps**:
  - `1.00` (স্বাভাবিক / Normal — Default)
  - `1.10` (মাঝারি বড় / Medium)
  - `1.20` (বড় / Large)
- **Constraint**: Scale factors $< 0.85$ cause illegibility on small screens; scale factors $> 1.30$ cause horizontal clipping in fixed-width cards. Clamped to $[0.85, 1.30]$.

### 4.3 Hex Color Validation
- **Format**: Case-insensitive 6-character hex (`^#([A-Fa-f0-9]{6})$`) or 8-character hex (`^#([A-Fa-f0-9]{8})$`).
- **Sanitization**: Missing `#` prefix is prepended automatically. Invalid hex strings fall back to `#B81414` (Light) or `#EF4444` (Dark).

---

## 5. CANONICAL DEFAULT CUSTOMIZATION STATE

When no prior user customization exists, or when the user triggers a "Reset to Defaults" action, the engine initializes the following canonical V3 object:

```json
{
  "schemaVersion": 3,
  "updatedAt": "2026-11-01T00:00:00.000Z",
  "global": {
    "preset": "classic_red",
    "accent": "#B81414",
    "tint": 0.10,
    "textScale": 1.00,
    "surfaceMode": "subtle_tint",
    "borderStyle": "thin",
    "elevation": "medium"
  },
  "sections": {},
  "accessibility": {
    "minContrastRatio": 4.5,
    "minTextScale": 0.85,
    "maxTextScale": 1.30,
    "minTouchTargetDp": 48,
    "enforceContrastGuard": true
  }
}
```

---

## 6. SANITIZATION & INTEGRITY VALIDATION ALGORITHM

The sanitization function `sanitizeCustomizationV3` executes the following verification sequence:

```javascript
function sanitizeCustomizationV3(raw) {
  if (!raw || typeof raw !== 'object') {
    return getCanonicalDefaultCustomization();
  }

  // Coerce or clamp global section
  const rawGlobal = raw.global && typeof raw.global === 'object' ? raw.global : {};
  const globalConfig = sanitizeSectionConfig(rawGlobal, DEFAULT_GLOBAL_CONFIG);

  // Validate sections dictionary
  const sanitizedSections = {};
  const VALID_SECTIONS = [
    'dashboard', 'transactions', 'wallets', 'budgets',
    'goals', 'analytics', 'reports', 'categories'
  ];

  const rawSections = raw.sections && typeof raw.sections === 'object' ? raw.sections : raw;
  VALID_SECTIONS.forEach((secKey) => {
    if (rawSections[secKey] && typeof rawSections[secKey] === 'object') {
      sanitizedSections[secKey] = sanitizeSectionConfig(rawSections[secKey], globalConfig);
    }
  });

  return {
    schemaVersion: 3,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    global: globalConfig,
    sections: sanitizedSections,
    accessibility: {
      minContrastRatio: 4.5,
      minTextScale: 0.85,
      maxTextScale: 1.30,
      minTouchTargetDp: 48,
      enforceContrastGuard: raw.accessibility?.enforceContrastGuard !== false,
    },
  };
}

function sanitizeSectionConfig(sec, fallback) {
  const accent = isValidHex(sec.accent) ? sec.accent : fallback.accent;
  const rawTint = parseFloat(sec.tint);
  const tint = !isNaN(rawTint) ? Math.min(0.40, Math.max(0.05, Math.round(rawTint * 100) / 100)) : fallback.tint;
  const rawScale = parseFloat(sec.textScale);
  const textScale = !isNaN(rawScale) ? Math.min(1.30, Math.max(0.85, Math.round(rawScale * 100) / 100)) : fallback.textScale;

  return {
    preset: sec.preset || fallback.preset || 'classic_red',
    accent,
    tint,
    textScale,
    surfaceMode: sec.surfaceMode || fallback.surfaceMode || 'subtle_tint',
    borderStyle: sec.borderStyle || fallback.borderStyle || 'thin',
    elevation: sec.elevation || fallback.elevation || 'medium',
    ...(sec.subsections && typeof sec.subsections === 'object' ? { subsections: sec.subsections } : {}),
  };
}

function isValidHex(hex) {
  return typeof hex === 'string' && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(hex.trim());
}
```

---

## 7. JSON SCHEMA (DRAFT-07) VERIFICATION SUITE

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MoneyManagerCustomizationV3",
  "type": "object",
  "required": ["schemaVersion", "updatedAt", "global", "sections", "accessibility"],
  "properties": {
    "schemaVersion": {
      "type": "integer",
      "const": 3
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "global": {
      "$ref": "#/definitions/SectionConfig"
    },
    "sections": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/definitions/SectionConfig"
      }
    },
    "accessibility": {
      "type": "object",
      "required": ["minContrastRatio", "minTextScale", "maxTextScale", "minTouchTargetDp", "enforceContrastGuard"],
      "properties": {
        "minContrastRatio": { "type": "number", "minimum": 3.0, "maximum": 7.0 },
        "minTextScale": { "type": "number", "minimum": 0.75, "maximum": 1.0 },
        "maxTextScale": { "type": "number", "minimum": 1.0, "maximum": 1.5 },
        "minTouchTargetDp": { "type": "integer", "minimum": 44 },
        "enforceContrastGuard": { "type": "boolean" }
      }
    }
  },
  "definitions": {
    "SectionConfig": {
      "type": "object",
      "required": ["preset", "accent", "tint", "textScale"],
      "properties": {
        "preset": { "type": "string" },
        "accent": { "type": "string", "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$" },
        "tint": { "type": "number", "minimum": 0.05, "maximum": 0.40 },
        "textScale": { "type": "number", "minimum": 0.85, "maximum": 1.30 },
        "surfaceMode": { "type": "string", "enum": ["subtle_tint", "solid_card", "outlined_glass", "gradient_elevated"] },
        "borderStyle": { "type": "string", "enum": ["none", "thin", "bold", "accent_colored"] },
        "elevation": { "type": "string", "enum": ["flat", "low", "medium", "high"] }
      }
    }
  }
}
```
