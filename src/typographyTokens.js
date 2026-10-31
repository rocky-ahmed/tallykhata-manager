/**
 * src/typographyTokens.js
 * Unified Typography Token System for TallyKhata.
 * Provides standardized font sizes, line heights, font weights, letter spacings,
 * and Bengali-safe line-height multipliers (min 1.4x-1.5x) to eliminate matra/vowel-sign clipping.
 */

const BENGALI_LINE_HEIGHT_MULTIPLIER = 1.45;

/**
 * Calculates a Bengali-safe line-height to ensure vowel diacritics
 * (e.g. হ্রস্ব-ই কার, দীর্ঘ-উ কার, হসন্ত, রেফ) are never vertically clipped.
 * @param {number} fontSize 
 * @param {number} [multiplier=1.45] 
 * @returns {number}
 */
function getBengaliLineHeight(fontSize, multiplier = BENGALI_LINE_HEIGHT_MULTIPLIER) {
  return Math.round(fontSize * multiplier);
}

/**
 * Standardized Typography Scales for TallyKhata:
 * - display: Hero balances, Net Worth totals (32-34sp)
 * - screenHeading: Fullscreen titles, primary screen headers (22sp)
 * - sectionHeading: Section headers, major category group labels (18sp)
 * - cardHeading: Card titles, customer names, wallet titles (16sp)
 * - body: Standard paragraphs, ledger descriptions, note texts (14sp)
 * - bodySmall: Secondary descriptions, timestamps, sub-labels (12sp)
 * - caption: Micro metadata, badge labels, status indicators (11sp)
 * - button: Action button labels, CTA chips (14sp)
 * - amount: Transaction amounts, monetary badges (20sp)
 * - formLabel: Form input labels, field headers (13sp)
 */
const TYPOGRAPHY_SCALES = {
  display: {
    fontSize: 32,
    lineHeight: 45, // 1.406x
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenHeading: {
    fontSize: 22,
    lineHeight: 32, // 1.455x
    fontWeight: '700',
    letterSpacing: 0,
  },
  sectionHeading: {
    fontSize: 18,
    lineHeight: 26, // 1.444x
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  cardHeading: {
    fontSize: 16,
    lineHeight: 24, // 1.500x
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  body: {
    fontSize: 14,
    lineHeight: 21, // 1.500x
    fontWeight: '400',
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 18, // 1.500x
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  caption: {
    fontSize: 11,
    lineHeight: 16, // 1.455x
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  button: {
    fontSize: 14,
    lineHeight: 20, // 1.428x
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 20,
    lineHeight: 28, // 1.400x
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  formLabel: {
    fontSize: 13,
    lineHeight: 19, // 1.462x
    fontWeight: '600',
    letterSpacing: 0.2,
  },
};

/**
 * Returns typography style with optional overrides.
 * @param {string} scaleKey 
 * @param {object} [overrides={}] 
 * @returns {object}
 */
function getTypography(scaleKey, overrides = {}) {
  const base = TYPOGRAPHY_SCALES[scaleKey] || TYPOGRAPHY_SCALES.body;
  return {
    ...base,
    ...overrides,
  };
}

module.exports = {
  TYPOGRAPHY_SCALES,
  BENGALI_LINE_HEIGHT_MULTIPLIER,
  getBengaliLineHeight,
  getTypography,
  display: TYPOGRAPHY_SCALES.display,
  screenHeading: TYPOGRAPHY_SCALES.screenHeading,
  sectionHeading: TYPOGRAPHY_SCALES.sectionHeading,
  cardHeading: TYPOGRAPHY_SCALES.cardHeading,
  body: TYPOGRAPHY_SCALES.body,
  bodySmall: TYPOGRAPHY_SCALES.bodySmall,
  caption: TYPOGRAPHY_SCALES.caption,
  button: TYPOGRAPHY_SCALES.button,
  amount: TYPOGRAPHY_SCALES.amount,
  formLabel: TYPOGRAPHY_SCALES.formLabel,
};
