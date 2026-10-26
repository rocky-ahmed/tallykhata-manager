const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// 1. Add Component definitions
const target1 = '// =========================================================================\r\n// 4. SEED DATA & AUTHENTIC TALLYKHATA FAQS\r\n// =========================================================================';
const target1_alt = '// =========================================================================\n// 4. SEED DATA & AUTHENTIC TALLYKHATA FAQS\n// =========================================================================';

const componentDefs = `// =========================================================================
// 3.1. REUSABLE MODERN 3D TACTILE ICON & SECTION DIVIDER SYSTEM
// =========================================================================
const ICON_THEMES = {
  primary: {
    bg: '#FEF2F2',
    borderTop: '#FFFFFF',
    borderBottom: '#FECACA',
    borderSides: '#FEE2E2',
    tint: '#B81414',
  },
  success: {
    bg: '#F0FDF4',
    borderTop: '#FFFFFF',
    borderBottom: '#BBF7D0',
    borderSides: '#DCFCE7',
    tint: '#0F8A0F',
  },
  danger: {
    bg: '#FFF1F2',
    borderTop: '#FFFFFF',
    borderBottom: '#FECDD3',
    borderSides: '#FFE4E6',
    tint: '#DC2626',
  },
  warning: {
    bg: '#FFFBEB',
    borderTop: '#FFFFFF',
    borderBottom: '#FDE68A',
    borderSides: '#FEF3C7',
    tint: '#D97706',
  },
  info: {
    bg: '#F0F9FF',
    borderTop: '#FFFFFF',
    borderBottom: '#BAE6FD',
    borderSides: '#E0F2FE',
    tint: '#0284C7',
  },
  purple: {
    bg: '#FAF5FF',
    borderTop: '#FFFFFF',
    borderBottom: '#E9D5FF',
    borderSides: '#F3E8FF',
    tint: '#7C3AED',
  },
  neutral: {
    bg: '#F8FAFC',
    borderTop: '#FFFFFF',
    borderBottom: '#E2E8F0',
    borderSides: '#EDF2F7',
    tint: '#4B5563',
  },
  white: {
    bg: 'rgba(255, 255, 255, 0.2)',
    borderTop: 'rgba(255, 255, 255, 0.6)',
    borderBottom: 'rgba(0, 0, 0, 0.15)',
    borderSides: 'rgba(255, 255, 255, 0.3)',
    tint: '#FFFFFF',
  },
};

const AppIcon = ({
  source,
  size = 22,
  containerSize = 38,
  variant = 'neutral',
  shape = 'rounded',
  tintColor,
  style,
  imageStyle,
  accessibilityLabel,
}) => {
  const theme = ICON_THEMES[variant] || ICON_THEMES.neutral;
  const resolvedTint = tintColor !== undefined ? tintColor : theme.tint;

  if (shape === 'none') {
    return (
      <Image
        source={source}
        style={[{ width: size, height: size }, resolvedTint ? { tintColor: resolvedTint } : {}, imageStyle]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  const isCircle = shape === 'circle';
  const radius = isCircle ? containerSize / 2 : 10;

  return (
    <View
      style={[
        {
          width: containerSize,
          height: containerSize,
          borderRadius: radius,
          backgroundColor: theme.bg,
          borderTopWidth: 1.5,
          borderTopColor: theme.borderTop,
          borderBottomWidth: 2.5,
          borderBottomColor: theme.borderBottom,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: theme.borderSides,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 2,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={source}
        style={[{ width: size, height: size }, resolvedTint ? { tintColor: resolvedTint } : {}, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
};

const TwoToneDivider = ({ style, marginVertical = 6 }) => (
  <View style={[{ width: '100%', marginVertical }, style]}>
    <View style={{ height: 1, backgroundColor: '#E2E8F0' }} />
    <View style={{ height: 1, backgroundColor: '#FFFFFF' }} />
  </View>
);

const TwoToneVerticalDivider = ({ height = 32, style }) => (
  <View style={[{ flexDirection: 'row', height, alignItems: 'center' }, style]}>
    <View style={{ width: 1, height: '100%', backgroundColor: '#E2E8F0' }} />
    <View style={{ width: 1, height: '100%', backgroundColor: '#FFFFFF' }} />
  </View>
);

const SectionHeader = ({ title, count, badge, actionText, onAction, style }) => (
  <View style={[styles.sectionHeaderRow, style]}>
    <View style={styles.sectionHeaderLeft}>
      <View style={styles.sectionHeaderAccentPill} />
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {count !== undefined && (
        <View style={styles.sectionHeaderCountBadge}>
          <Text style={styles.sectionHeaderCountText}>{count}</Text>
        </View>
      )}
      {badge && (
        <View style={styles.sectionHeaderBadge}>
          <Text style={styles.sectionHeaderBadgeText}>{badge}</Text>
        </View>
      )}
    </View>
    {actionText && (
      <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
        <Text style={styles.sectionHeaderAction}>{actionText} ›</Text>
      </TouchableOpacity>
    )}
  </View>
);

`;

if (!code.includes('// 3.1. REUSABLE MODERN 3D TACTILE ICON')) {
  if (code.includes(target1)) {
    code = code.replace(target1, componentDefs + target1);
  } else if (code.includes(target1_alt)) {
    code = code.replace(target1_alt, componentDefs + target1_alt);
  } else {
    console.error('Target 1 not found!');
  }
}

// 2. Add Styles for SectionHeader and update divider styles
const styleAddition = `
  // 3D Section Headers & Dynamic Dividers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderAccentPill: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#B81414',
    marginRight: 8,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.2,
  },
  sectionHeaderCountBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeaderCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  sectionHeaderBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sectionHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  sectionHeaderAction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B81414',
  },
`;

const toggleThumbTarget = `  toggleThumbActive: {\r\n    alignSelf: 'flex-end',\r\n  },\r\n});`;
const toggleThumbTarget_alt = `  toggleThumbActive: {\n    alignSelf: 'flex-end',\n  },\n});`;

if (!code.includes('sectionHeaderRow:')) {
  if (code.includes(toggleThumbTarget)) {
    code = code.replace(toggleThumbTarget, `  toggleThumbActive: {\r\n    alignSelf: 'flex-end',\r\n  },\r\n${styleAddition}});\r\n`);
  } else if (code.includes(toggleThumbTarget_alt)) {
    code = code.replace(toggleThumbTarget_alt, `  toggleThumbActive: {\n    alignSelf: 'flex-end',\n  },\n${styleAddition}});\n`);
  } else {
    console.error('toggleThumbTarget not found!');
  }
}

// 3. Upgrade summaryCardDivider to two-tone etched
code = code.replace(
  `  summaryCardDivider: {\r\n    width: 1,\r\n    height: 48,\r\n    backgroundColor: '#EFEFEF',\r\n  },`,
  `  summaryCardDivider: {\r\n    width: 2,\r\n    height: 48,\r\n    borderLeftWidth: 1,\r\n    borderLeftColor: '#E2E8F0',\r\n    borderRightWidth: 1,\r\n    borderRightColor: '#FFFFFF',\r\n  },`
);
code = code.replace(
  `  summaryCardDivider: {\n    width: 1,\n    height: 48,\n    backgroundColor: '#EFEFEF',\n  },`,
  `  summaryCardDivider: {\n    width: 2,\n    height: 48,\n    borderLeftWidth: 1,\n    borderLeftColor: '#E2E8F0',\n    borderRightWidth: 1,\n    borderRightColor: '#FFFFFF',\n  },`
);

// 4. Upgrade cashTopDivider and cashSubDivider
code = code.replace(
  `  cashTopDivider: {\r\n    width: 1,\r\n    height: 44,\r\n    backgroundColor: '#E5E7EB',\r\n  },`,
  `  cashTopDivider: {\r\n    width: 2,\r\n    height: 44,\r\n    borderLeftWidth: 1,\r\n    borderLeftColor: '#E2E8F0',\r\n    borderRightWidth: 1,\r\n    borderRightColor: '#FFFFFF',\r\n  },`
);
code = code.replace(
  `  cashTopDivider: {\n    width: 1,\n    height: 44,\n    backgroundColor: '#E5E7EB',\n  },`,
  `  cashTopDivider: {\n    width: 2,\n    height: 44,\n    borderLeftWidth: 1,\n    borderLeftColor: '#E2E8F0',\n    borderRightWidth: 1,\n    borderRightColor: '#FFFFFF',\n  },`
);

code = code.replace(
  `  cashSubDivider: {\r\n    width: 1,\r\n    height: 28,\r\n    backgroundColor: '#E5E7EB',\r\n  },`,
  `  cashSubDivider: {\r\n    width: 2,\r\n    height: 28,\r\n    borderLeftWidth: 1,\r\n    borderLeftColor: '#E2E8F0',\r\n    borderRightWidth: 1,\r\n    borderRightColor: '#FFFFFF',\r\n  },`
);
code = code.replace(
  `  cashSubDivider: {\n    width: 1,\n    height: 28,\n    backgroundColor: '#E5E7EB',\n  },`,
  `  cashSubDivider: {\n    width: 2,\n    height: 28,\n    borderLeftWidth: 1,\n    borderLeftColor: '#E2E8F0',\n    borderRightWidth: 1,\n    borderRightColor: '#FFFFFF',\n  },`
);

// 5. Upgrade voucherDivider, txnLimitDivider, txnLimitRowDivider
code = code.replace(
  `  voucherDivider: {\r\n    height: 1,\r\n    backgroundColor: '#E5E7EB',\r\n    marginVertical: 10,\r\n  },`,
  `  voucherDivider: {\r\n    height: 2,\r\n    borderTopWidth: 1,\r\n    borderTopColor: '#E2E8F0',\r\n    borderBottomWidth: 1,\r\n    borderBottomColor: '#FFFFFF',\r\n    marginVertical: 10,\r\n  },`
);
code = code.replace(
  `  voucherDivider: {\n    height: 1,\n    backgroundColor: '#E5E7EB',\n    marginVertical: 10,\n  },`,
  `  voucherDivider: {\n    height: 2,\n    borderTopWidth: 1,\n    borderTopColor: '#E2E8F0',\n    borderBottomWidth: 1,\n    borderBottomColor: '#FFFFFF',\n    marginVertical: 10,\n  },`
);

fs.writeFileSync('App.js', code, 'utf8');
console.log('App.js updated with components & divider styles!');
