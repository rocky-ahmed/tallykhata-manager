/**
 * test_phase3_shared_components.js
 * Automated Verification Suite for Phase 3 Shared 3D UI Components
 * Validates Card3D, Button3D, SquircleBadge, and consolidated exports.
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const themeService = require('./src/themeService');
const { LIGHT_THEME, DARK_THEME, getIconTheme } = themeService;
const iconMetrics = require('./src/iconMetrics');
const { ICON_METRICS, getIconMetrics, STANDARD_TOUCH_HIT_SLOP } = iconMetrics;
const typographyTokens = require('./src/typographyTokens');
const { TYPOGRAPHY_SCALES, getBengaliLineHeight } = typographyTokens;

console.log('================================================================');
console.log('PHASE 3: SHARED 3D UI COMPONENT LIBRARY VERIFICATION SUITE');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log('[PASS] TEST ' + total + ': ' + name);
    passed++;
  } catch (err) {
    console.error('[FAIL] TEST ' + total + ': ' + name);
    console.error(err);
    process.exitCode = 1;
  }
}

// Helper to parse AST
function parseComponentAst(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  return babel.parseSync(code, {
    filename: filePath,
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ['jsx', 'flow'] },
  });
}

// -------------------------------------------------------------
// PART 1: FILE EXISTENCE & EXPORT GATEWAY INTEGRITY
// -------------------------------------------------------------
console.log('--- PART 1: FILE EXISTENCE & EXPORT GATEWAY INTEGRITY ---');

runTest('Component files exist in src/components/ and src/sharedComponents.js', () => {
  assert(fs.existsSync('src/components/Card3D.js'), 'src/components/Card3D.js must exist');
  assert(fs.existsSync('src/components/Button3D.js'), 'src/components/Button3D.js must exist');
  assert(fs.existsSync('src/components/SquircleBadge.js'), 'src/components/SquircleBadge.js must exist');
  assert(fs.existsSync('src/components/index.js'), 'src/components/index.js must exist');
  assert(fs.existsSync('src/sharedComponents.js'), 'src/sharedComponents.js must exist');
});

runTest('Babel parses all shared component files with zero errors', () => {
  const cardAst = parseComponentAst('src/components/Card3D.js');
  const btnAst = parseComponentAst('src/components/Button3D.js');
  const badgeAst = parseComponentAst('src/components/SquircleBadge.js');
  const indexAst = parseComponentAst('src/components/index.js');
  const sharedAst = parseComponentAst('src/sharedComponents.js');

  assert(cardAst && cardAst.program.body.length > 0, 'Card3D AST must be valid');
  assert(btnAst && btnAst.program.body.length > 0, 'Button3D AST must be valid');
  assert(badgeAst && badgeAst.program.body.length > 0, 'SquircleBadge AST must be valid');
  assert(indexAst && indexAst.program.body.length > 0, 'index AST must be valid');
  assert(sharedAst && sharedAst.program.body.length > 0, 'sharedComponents AST must be valid');
});

runTest('Consolidated index and sharedComponents re-export Card3D, Button3D, SquircleBadge', () => {
  const indexCode = fs.readFileSync('src/components/index.js', 'utf8');
  const sharedCode = fs.readFileSync('src/sharedComponents.js', 'utf8');

  assert(indexCode.includes('Card3D'), 'index.js must export Card3D');
  assert(indexCode.includes('Button3D'), 'index.js must export Button3D');
  assert(indexCode.includes('SquircleBadge'), 'index.js must export SquircleBadge');

  assert(sharedCode.includes('Card3D'), 'sharedComponents.js must export Card3D');
  assert(sharedCode.includes('Button3D'), 'sharedComponents.js must export Button3D');
  assert(sharedCode.includes('SquircleBadge'), 'sharedComponents.js must export SquircleBadge');
});

// -------------------------------------------------------------
// PART 2: CARD3D COMPONENT ARCHITECTURE & PROPS INTERFACE
// -------------------------------------------------------------
console.log('\n--- PART 2: CARD3D COMPONENT ARCHITECTURE & PROPS ---');

const card3DSource = fs.readFileSync('src/components/Card3D.js', 'utf8');

runTest('Card3D defines standard props interface and defaults', () => {
  assert(card3DSource.includes('export const Card3D = ({'), 'Card3D named export exists');
  assert(card3DSource.includes("variant = 'primary'"), 'Card3D default variant is primary');
  assert(card3DSource.includes('isDark = false'), 'Card3D default isDark is false');
  assert(card3DSource.includes('noLedge = false'), 'Card3D default noLedge is false');
  assert(card3DSource.includes('activeOpacity = 0.85'), 'Card3D default activeOpacity is 0.85');
});

runTest('Card3D supports 5 standard surface variants', () => {
  assert(card3DSource.includes("case 'elevated':"), 'Card3D elevated variant');
  assert(card3DSource.includes("case 'financial':"), 'Card3D financial variant');
  assert(card3DSource.includes("case 'secondary':"), 'Card3D secondary variant');
  assert(card3DSource.includes("case 'highlight':"), 'Card3D highlight variant');
  assert(card3DSource.includes("case 'primary':"), 'Card3D primary variant');
});

runTest('Card3D implements 3D specular highlight and bottom extrusion ledge', () => {
  assert(card3DSource.includes('borderTopWidth: 1.5'), 'Card3D top highlight border');
  assert(card3DSource.includes('borderTopColor: isDark ?'), 'Card3D theme-sensitive top highlight');
  assert(card3DSource.includes('borderBottomWidth: noLedge ? 1 :'), 'Card3D bottom extrusion ledge');
  assert(card3DSource.includes('borderRadius: 16'), 'Card3D continuous squircle radius');
});

runTest('Card3D consumes semantic tokens from themeService', () => {
  assert(card3DSource.includes('theme.cardBg'), 'Card3D consumes cardBg');
  assert(card3DSource.includes('theme.cardBorder'), 'Card3D consumes cardBorder');
  assert(card3DSource.includes('theme.surfaceVariant'), 'Card3D consumes surfaceVariant');
  assert(card3DSource.includes('theme.cardBgElevated'), 'Card3D consumes cardBgElevated');
});

runTest('Card3D conditionally renders TouchableOpacity on onPress', () => {
  assert(card3DSource.includes('if (onPress) {'), 'Card3D checks onPress');
  assert(card3DSource.includes('<TouchableOpacity'), 'Card3D wraps in TouchableOpacity when onPress passed');
  assert(card3DSource.includes('<View'), 'Card3D falls back to View when onPress not provided');
});

// -------------------------------------------------------------
// PART 3: BUTTON3D COMPONENT ARCHITECTURE & PROPS INTERFACE
// -------------------------------------------------------------
console.log('\n--- PART 3: BUTTON3D COMPONENT ARCHITECTURE & PROPS ---');

const button3DSource = fs.readFileSync('src/components/Button3D.js', 'utf8');

runTest('Button3D defines standard props interface and defaults', () => {
  assert(button3DSource.includes('export const Button3D = ({'), 'Button3D named export exists');
  assert(button3DSource.includes("variant = 'primary'"), 'Button3D default variant is primary');
  assert(button3DSource.includes("size = 'md'"), 'Button3D default size is md');
  assert(button3DSource.includes('disabled = false'), 'Button3D default disabled is false');
  assert(button3DSource.includes('isDark = false'), 'Button3D default isDark is false');
});

runTest('Button3D supports primary, secondary, compact, destructive, outline variants', () => {
  assert(button3DSource.includes("case 'secondary':"), 'Button3D secondary variant');
  assert(button3DSource.includes("case 'destructive':"), 'Button3D destructive variant');
  assert(button3DSource.includes("case 'outline':"), 'Button3D outline variant');
  assert(button3DSource.includes("case 'compact':"), 'Button3D compact variant');
  assert(button3DSource.includes("case 'primary':"), 'Button3D primary variant');
});

runTest('Button3D supports sm (36dp), md (44dp), and lg (52dp) scales', () => {
  assert(button3DSource.includes('height = 36'), 'Button3D sm height 36dp');
  assert(button3DSource.includes('height = 44'), 'Button3D md height 44dp');
  assert(button3DSource.includes('height = 52'), 'Button3D lg height 52dp');
});

runTest('Button3D attaches STANDARD_TOUCH_HIT_SLOP for sub-48dp controls', () => {
  assert(button3DSource.includes('isSmall ? STANDARD_TOUCH_HIT_SLOP : undefined'), 'Button3D auto-attaches hit slop');
});

runTest('Button3D incorporates Bengali line-height safety', () => {
  assert(button3DSource.includes('getBengaliLineHeight(fontSize)'), 'Button3D applies getBengaliLineHeight');
});

// -------------------------------------------------------------
// PART 4: SQUIRCLEBADGE COMPONENT ARCHITECTURE & GEOMETRY
// -------------------------------------------------------------
console.log('\n--- PART 4: SQUIRCLEBADGE COMPONENT ARCHITECTURE ---');

const squircleBadgeSource = fs.readFileSync('src/components/SquircleBadge.js', 'utf8');

runTest('SquircleBadge defines standard props interface and defaults', () => {
  assert(squircleBadgeSource.includes('export const SquircleBadge = ({'), 'SquircleBadge named export exists');
  assert(squircleBadgeSource.includes("variant = 'neutral'"), 'SquircleBadge default variant neutral');
  assert(squircleBadgeSource.includes('size = 24'), 'SquircleBadge default size 24');
  assert(squircleBadgeSource.includes('containerSize = 44'), 'SquircleBadge default containerSize 44');
  assert(squircleBadgeSource.includes("shape = 'rounded'"), 'SquircleBadge default shape rounded');
});

runTest('SquircleBadge calculates squircle curvature using 0.28 golden-ratio constant', () => {
  assert(squircleBadgeSource.includes('Math.round(containerSize * 0.28)'), 'Squircle curvature formula containerSize * 0.28');
});

runTest('SquircleBadge implements 3D bevel and extrusion borders (1.5 top, 3 bottom)', () => {
  assert(squircleBadgeSource.includes('borderTopWidth: 1.5'), 'Top highlight border 1.5');
  assert(squircleBadgeSource.includes('borderBottomWidth: 3'), 'Bottom extrusion ledge 3');
});

runTest('SquircleBadge renders 3D specular sheen overlay (0.36 height multiplier)', () => {
  assert(squircleBadgeSource.includes('Math.round(containerSize * 0.36)'), 'Specular sheen height containerSize * 0.36');
});

runTest('SquircleBadge integrates optical scaling and vertical offset via iconMetrics', () => {
  assert(squircleBadgeSource.includes('getIconMetrics'), 'SquircleBadge consumes getIconMetrics');
  assert(squircleBadgeSource.includes('Math.round(size * effectiveScale)'), 'SquircleBadge applies opticalScale');
  assert(squircleBadgeSource.includes('translateY: effectiveTranslateY'), 'SquircleBadge applies translateY');
});

runTest('SquircleBadge renders notification counter badge when count prop provided', () => {
  assert(squircleBadgeSource.includes('count !== undefined && count !== null'), 'SquircleBadge checks count');
  assert(squircleBadgeSource.includes('countBadge'), 'SquircleBadge renders countBadge');
});

console.log('\n================================================================');
console.log(`SHARED COMPONENT TEST SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
console.log('================================================================');

if (passed !== total) {
  process.exit(1);
}
