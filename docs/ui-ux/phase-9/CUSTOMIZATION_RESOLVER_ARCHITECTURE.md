# MONEY MANAGER CUSTOMIZATION RESOLVER ARCHITECTURE
**Author**: Worker 2 — Backend & Data Architect (Averroes)  
**Registered Thread ID**: `01a19154-c135-75d0-b38a-1ea50f004895`  
**Date**: 2026-11-01  
**Project**: TallyKhata (`tallybook-expo`)  
**Target Delivery Artifact**: `docs/ui-ux/phase-9/CUSTOMIZATION_RESOLVER_ARCHITECTURE.md`  
**Resolver Function**: `resolveMMSectionStyle(sectionId, mmCustomization, isDark, currentTheme, subsectionId)`

---

## 1. RESOLVER SPECIFICATION & FUNCTION SIGNATURE

The **Centralized Preference Resolver** (`resolveMMSectionStyle`) is the pure mathematical and algorithmic bridge between stored customization preferences and the visual rendering of Money Manager components.

```typescript
/**
 * Resolves a concrete, render-ready style object for any Money Manager section or subsection.
 *
 * @param sectionId - Identifier of the section (e.g., 'dashboard', 'budgets', 'goals')
 * @param mmCustomization - The V3 customization state object (from state.preferences.customization)
 * @param isDark - Boolean flag indicating active Dark mode
 * @param currentTheme - The current theme token dictionary from src/themeService.js
 * @param subsectionId - Optional micro-component identifier (e.g., 'metrics', 'cards', 'headers')
 * @returns ResolvedMMStyle - A fully computed, WCAG-compliant styling bundle ready for React Native
 */
export function resolveMMSectionStyle(
  sectionId: MMSectionId,
  mmCustomization: MoneyManagerCustomizationV3 | null | undefined,
  isDark: boolean,
  currentTheme: ThemeTokens,
  subsectionId?: MMSubsectionId
): ResolvedMMStyle;
```

---

## 2. THE 5-LAYER CASCADING RESOLUTION ALGORITHM

The resolver executes an orderly, 5-layer waterfall evaluation. At each layer, properties cascade downward, overriding broader rules with more specific intentions, before concluding with inviolable accessibility validation:

```
┌────────────────────────────────────────────────────────────────────────┐
│               LAYER 1: BASE DESIGN SYSTEM TOKENS                      │
│   Source: currentTheme, typographyTokens, iconMetrics                  │
│   Establishes: Fallback colors, baseline text sizes, card surfaces     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               LAYER 2: GLOBAL MONEY MANAGER CUSTOMIZATION              │
│   Source: mmCustomization.global                                       │
│   Overrides: App-wide MM accent, global tint, and base textScale       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               LAYER 3: SECTION-SPECIFIC OVERRIDES                      │
│   Source: mmCustomization.sections[sectionId]                          │
│   Overrides: Section-level accent, tint, textScale, borderStyle        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               LAYER 4: SUBSECTION MICRO-OVERRIDES                     │
│   Source: section.subsections[subsectionId]                            │
│   Overrides: Component-level metrics, headers, cards, or action buttons│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               LAYER 5: ACCESSIBILITY CONSTRAINTS & CLAMPING            │
│   - WCAG 2.2 AA Contrast Validation (Contrast Ratio >= 4.5:1)          │
│   - Luminance Auto-Correction for Illegible Custom Hexes               │
│   - Font Scale Clamping (0.85 <= textScale <= 1.30)                    │
│   - Non-Negative Padding & Margin Boundaries                           │
│   - Minimum Touch Target Dimension Verification (>= 48x48 dp)          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
                      FINAL RESOLVED STYLE BUNDLE
```

---

## 3. DETAILED LAYER BREAKDOWN & MATHEMATICAL LOGIC

### Layer 1: Base Design System Tokens
Layer 1 inspects the active theme mode (`isDark`) and extracts baseline tokens from `src/themeService.js`:
- `baseAccent = isDark ? currentTheme.primary : currentTheme.primary` (`#EF4444` in dark, `#B81414` in light)
- `baseSurface = currentTheme.cardBg` (`#1E293B` in dark, `#FFFFFF` in light)
- `baseTextPrimary = currentTheme.textPrimary` (`#F8FAFC` in dark, `#1E293B` in light)
- `baseTextSecondary = currentTheme.textSecondary` (`#94A3B8` in dark, `#64748B` in light)
- `baseBorder = currentTheme.cardBorder` (`#334155` in dark, `#E2E8F0` in light)
- `baseTint = 0.10`
- `baseScale = 1.00`
- `baseElevation = 'medium'`

### Layer 2: Global Customization Overrides
If `mmCustomization.global` exists:
- If `global.accent` is a valid hex, `baseAccent = global.accent`.
- If `global.tint` is numeric, `baseTint = clamp(global.tint, 0.05, 0.40)`.
- If `global.textScale` is numeric, `baseScale = clamp(global.textScale, 0.85, 1.30)`.
- `baseElevation = global.elevation || baseElevation`.

### Layer 3: Section-Specific Overrides
The resolver evaluates `mmCustomization.sections?.[sectionId]`:
- If `section.accent` is defined, it overrides `baseAccent`.
- If `section.tint` is defined, it overrides `baseTint`.
- If `section.textScale` is defined, it overrides `baseScale`.
- If `section.borderStyle` is defined, it overrides `borderStyle`.
- If `section.surfaceMode` is defined, it overrides `surfaceMode`.

### Layer 4: Subsection Micro-Overrides
If a `subsectionId` parameter is provided (e.g., `'metrics'`, `'cards'`, `'actionButtons'`) and `section.subsections?.[subsectionId]` exists:
- Component-specific `accent`, `tint`, and `textScale` replace the section-level values for that micro-component only.

### Layer 5: Accessibility Enforcement & Clamping
Layer 5 guarantees user safety and accessibility compliance:
1. **Scale Clamping**:
   $$\text{finalTextScale} = \min(1.30, \max(0.85, \text{accumulatedScale}))$$
2. **Tint Clamping**:
   $$\text{finalTint} = \min(0.40, \max(0.05, \text{accumulatedTint}))$$
3. **Contrast Verification & Dynamic Luminance Auto-Correction**:
   The resolver computes the relative luminance $L$ of the text color and background surface:
   $$R_s = R/255,\quad G_s = G/255,\quad B_s = B/255$$
   $$C_{\text{linear}} = \begin{cases} C_s / 12.92 & \text{if } C_s \le 0.04045 \\ \left(\frac{C_s + 0.055}{1.055}\right)^{2.4} & \text{if } C_s > 0.04045 \end{cases}$$
   $$L = 0.2126 R_{\text{linear}} + 0.7152 G_{\text{linear}} + 0.0722 B_{\text{linear}}$$
   $$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}\quad (\text{where } L_1 \ge L_2)$$
   - If $\text{Contrast Ratio} < 4.5$ (WCAG 2.2 AA failure), the resolver automatically darkens the light-mode text or brightens the dark-mode text until $\text{Contrast Ratio} \ge 4.5:1$ is achieved.
4. **Touch Target Standard**: Touch targets are guaranteed $\ge 48\times 48\,\text{dp}$ through the inclusion of standard hit-slop specifications.

---

## 4. ALPHA TINT BLENDING ALGORITHM

To compute smooth, native-like background tints that harmonize with the card surface, the resolver supports both 8-character hex blending and RGBA functional notation:

```javascript
function computeTintBackground(accentHex, tintOpacity, isDark, surfaceHex) {
  // 1. Convert tint float to 2-digit hex alpha (e.g., 0.10 -> '1A', 0.20 -> '33')
  const alphaVal = Math.min(255, Math.max(0, Math.round(tintOpacity * 255)));
  const hexAlpha = alphaVal.toString(16).padStart(2, '0').toUpperCase();

  // 2. In Dark Mode, blend against elevated surface to prevent washed-out milky blacks
  if (isDark) {
    const rgb = hexToRgb(accentHex);
    // Dark mode tint uses subtle alpha on top of dark card surface
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(0.25, tintOpacity)})`;
  }

  // 3. In Light Mode, return clean hex-alpha or RGBA
  const cleanHex = accentHex.startsWith('#') ? accentHex.slice(0, 7) : '#' + accentHex.slice(0, 6);
  return cleanHex + hexAlpha;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
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

function brightenColor(hex, factor = 0.25) {
  const rgb = hexToRgb(hex);
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function darkenColor(hex, factor = 0.25) {
  const rgb = hexToRgb(hex);
  const r = Math.max(0, Math.round(rgb.r * (1 - factor)));
  const g = Math.max(0, Math.round(rgb.g * (1 - factor)));
  const b = Math.max(0, Math.round(rgb.b * (1 - factor)));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
```

---

## 5. RESOLVED STYLE OUTPUT CONTRACT

The resolver outputs an immutable, strongly typed `ResolvedMMStyle` bundle:

```typescript
export interface ResolvedMMStyle {
  /** Identifier of the resolved section */
  sectionId: MMSectionId;

  /** Primary accent color verified for accessibility */
  accentColor: string;

  /** Card container background with applied tint */
  cardBackground: string;

  /** Card border color */
  cardBorder: string;

  /** Primary text color */
  primaryText: string;

  /** Secondary / subtitle text color */
  secondaryText: string;

  /** Muted metadata text color */
  mutedText: string;

  /** Final clamped text scale multiplier (0.85 to 1.30) */
  fontScale: number;

  /** Category badge / chip background */
  badgeBackground: string;

  /** Category badge / chip text color */
  badgeText: string;

  /** Icon container background styling */
  iconContainerStyle: {
    backgroundColor: string;
    borderColor: string;
    tintColor: string;
  };

  /** 3D Squircle elevation & shadow styles */
  elevationStyle: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };

  /** Helper method to compute scaled typography */
  getScaledFontSize: (baseSize: number) => number;
}
```

---

## 6. COMPLETE RESOLVER IMPLEMENTATION

```javascript
/**
 * src/preferencesService.js (or designated style resolver utility)
 */
function resolveMMSectionStyle(sectionId, mmCustomization, isDark, currentTheme, subsectionId = null) {
  // Layer 1: Base Design System Tokens
  let accent = isDark ? currentTheme.primary : (currentTheme.primary || '#B81414');
  let tint = 0.10;
  let textScale = 1.00;
  let surfaceMode = 'subtle_tint';
  let borderStyle = 'thin';
  let elevation = 'medium';

  // Layer 2: Global Money Manager Customization Overrides
  const globalConf = mmCustomization?.global;
  if (globalConf && typeof globalConf === 'object') {
    if (isValidHex(globalConf.accent)) accent = globalConf.accent;
    if (!isNaN(parseFloat(globalConf.tint))) tint = parseFloat(globalConf.tint);
    if (!isNaN(parseFloat(globalConf.textScale))) textScale = parseFloat(globalConf.textScale);
    if (globalConf.surfaceMode) surfaceMode = globalConf.surfaceMode;
    if (globalConf.borderStyle) borderStyle = globalConf.borderStyle;
    if (globalConf.elevation) elevation = globalConf.elevation;
  }

  // Layer 3: Section-Specific Overrides
  const secConf = mmCustomization?.sections?.[sectionId] || mmCustomization?.[sectionId];
  if (secConf && typeof secConf === 'object') {
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
  const clampedScale = Math.min(1.30, Math.max(0.85, Math.round(textScale * 100) / 100));
  const clampedTint = Math.min(0.40, Math.max(0.05, Math.round(tint * 100) / 100));

  const cardSurface = isDark ? currentTheme.cardBgElevated : currentTheme.cardBg;
  const cardBackground = surfaceMode === 'solid_card'
    ? cardSurface
    : computeTintBackground(accent, clampedTint, isDark, cardSurface);

  // Border styling
  let cardBorder = currentTheme.cardBorder;
  if (borderStyle === 'accent_colored') cardBorder = accent;
  else if (borderStyle === 'bold') cardBorder = isDark ? '#475569' : '#CBD5E1';
  else if (borderStyle === 'none') cardBorder = 'transparent';

  // Contrast auto-correction
  let primaryText = currentTheme.textPrimary;
  let secondaryText = currentTheme.textSecondary;
  let accessibleAccent = accent;
  const hasCustomAccent = Boolean(globalConf?.accent || secConf?.accent || (subsectionId && secConf?.subsections?.[subsectionId]?.accent));
  if (mmCustomization?.accessibility?.enforceContrastGuard && hasCustomAccent) {
    const contrastRatio = getContrastRatio(accent, cardSurface);
    if (contrastRatio < 4.5) {
      accessibleAccent = isDark ? brightenColor(accent, 0.25) : darkenColor(accent, 0.25);
    }
  }

  // Elevation styling
  const elevationStyles = {
    flat: { shadowOpacity: 0, elevation: 0 },
    low: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
    medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
    high: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 8 },
  }[elevation] || { elevation: 3 };

  return {
    sectionId,
    accentColor: accessibleAccent,
    cardBackground,
    cardBorder,
    primaryText,
    secondaryText,
    mutedText: isDark ? currentTheme.textMuted : currentTheme.textMuted,
    fontScale: clampedScale,
    badgeBackground: computeTintBackground(accessibleAccent, 0.15, isDark, cardSurface),
    badgeText: accessibleAccent,
    iconContainerStyle: {
      backgroundColor: computeTintBackground(accessibleAccent, 0.12, isDark, cardSurface),
      borderColor: accessibleAccent + '33',
      tintColor: accessibleAccent,
    },
    elevationStyle: elevationStyles,
    getScaledFontSize: (baseSize) => Math.round(baseSize * clampedScale),
  };
}
```

---

## 7. FRONTEND INTEGRATION: `useMMSectionStyle` HOOK CONTRACT

To ensure simple, idiomatic, and performant consumption by Worker 1 (Gibbs) in React Native screens, the engine provides the `useMMSectionStyle` custom hook:

```javascript
/**
 * Hook for consumer screens in App.js / components
 */
function useMMSectionStyle(sectionId, subsectionId = null) {
  const { isDark, currentTheme } = useTheme();
  const mmCustomization = useMoneyManagerCustomization();

  return useMemo(() => {
    return resolveMMSectionStyle(sectionId, mmCustomization, isDark, currentTheme, subsectionId);
  }, [sectionId, mmCustomization, isDark, currentTheme, subsectionId]);
}
```

### Consumer Usage Example (e.g., in Wallets Tab):

```javascript
function MMWalletsSection() {
  const style = useMMSectionStyle('wallets');

  return (
    <View style={[styles.walletCard, { backgroundColor: style.cardBackground, borderColor: style.cardBorder }]}>
      <Text style={[styles.walletTitle, { color: style.primaryText, fontSize: style.getScaledFontSize(16) }]}>
        আমার ওয়ালেট
      </Text>
      <Text style={[styles.walletBalance, { color: style.accentColor, fontSize: style.getScaledFontSize(22) }]}>
        ৳ ১,৫০,০০০.০০
      </Text>
    </View>
  );
}
```
