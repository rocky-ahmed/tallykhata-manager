import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
const { LIGHT_THEME, DARK_THEME } = require('../themeService');
const { STANDARD_TOUCH_HIT_SLOP } = require('../iconMetrics');
const { TYPOGRAPHY_SCALES, getBengaliLineHeight, BENGALI_LINE_HEIGHT_MULTIPLIER } = require('../typographyTokens');

/**
 * ModalHeader — Reusable, Theme-Adaptive, Accessible Modal Header
 *
 * Implements:
 * - Unified header row with title, optional subtitle, and 3D icon/emoji badge
 * - WCAG 2.2 AA compliant contrast in both Light and Dark themes
 * - Bengali vowel/matra clipping prevention via 1.45x line-height multiplier
 * - Standardized >= 48x48dp touch target for modal close action via STANDARD_TOUCH_HIT_SLOP
 * - Full accessibility compliance (accessibilityRole="header" and "button", accessibilityLabel="বন্ধ করুন")
 * - Backward and forward compatibility with custom theme tokens
 *
 * @param {Object} props
 * @param {string} props.title - Modal title (Bengali or English, required)
 * @param {string} [props.subtitle] - Secondary helper/context text
 * @param {string|React.ReactNode} [props.icon] - Leading 3D emoji or icon element
 * @param {Function} [props.onClose] - Close action callback
 * @param {boolean} [props.isDark=false] - Dark mode toggle indicator
 * @param {Object} [props.theme] - Active theme token object
 * @param {boolean} [props.showDivider=true] - Bottom separator divider
 * @param {Object} [props.style] - Container style overrides
 * @param {Object} [props.titleStyle] - Title text style overrides
 * @param {Object} [props.subtitleStyle] - Subtitle text style overrides
 * @param {string} [props.closeAccessibilityLabel='বন্ধ করুন'] - Accessible label for close trigger
 * @param {React.ReactNode} [props.rightElement] - Optional supplementary action in header
 * @param {string} [props.testID='modal-header'] - Test identifier
 */
export const ModalHeader = ({
  title,
  subtitle,
  icon,
  onClose,
  isDark = false,
  theme: customTheme,
  showDivider = true,
  style,
  titleStyle,
  subtitleStyle,
  closeAccessibilityLabel = 'বন্ধ করুন',
  rightElement,
  testID = 'modal-header',
  ...rest
}) => {
  const activeTheme = customTheme || (isDark ? DARK_THEME : LIGHT_THEME);
  const darkMode = isDark || activeTheme.isDark || activeTheme.mode === 'dark';

  const titleFontSize = TYPOGRAPHY_SCALES.sectionHeading
    ? TYPOGRAPHY_SCALES.sectionHeading.fontSize
    : 18;
  const titleLineHeight = getBengaliLineHeight(titleFontSize, BENGALI_LINE_HEIGHT_MULTIPLIER || 1.45);

  const subFontSize = TYPOGRAPHY_SCALES.bodySmall
    ? TYPOGRAPHY_SCALES.bodySmall.fontSize
    : 12;
  const subLineHeight = getBengaliLineHeight(subFontSize, BENGALI_LINE_HEIGHT_MULTIPLIER || 1.45);

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return (
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: darkMode
                ? (activeTheme.surfaceVariant || '#334155')
                : (activeTheme.primaryContainer || '#FEF2F2'),
              borderColor: darkMode
                ? (activeTheme.cardBorder || '#475569')
                : (activeTheme.outlineVariant || '#FECACA'),
            },
          ]}
        >
          <Text style={styles.iconEmoji}>{icon}</Text>
        </View>
      );
    }
    return <View style={styles.iconContainer}>{icon}</View>;
  };

  return (
    <View
      style={[
        styles.container,
        showDivider && {
          borderBottomWidth: 1,
          borderBottomColor: activeTheme.divider || (darkMode ? '#334155' : '#E2E8F0'),
          paddingBottom: 12,
        },
        style,
      ]}
      testID={testID}
      {...rest}
    >
      <View style={styles.leadingRow}>
        {renderIcon()}
        <View style={styles.titleColumn} accessibilityRole="header">
          {title ? (
            <Text
              style={[
                styles.title,
                {
                  color: activeTheme.textPrimary || (darkMode ? '#F8FAFC' : '#1E293B'),
                  fontSize: titleFontSize,
                  lineHeight: titleLineHeight,
                },
                titleStyle,
              ]}
              numberOfLines={2}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                {
                  color: activeTheme.textSecondary || (darkMode ? '#94A3B8' : '#64748B'),
                  fontSize: subFontSize,
                  lineHeight: subLineHeight,
                },
                subtitleStyle,
              ]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.trailingRow}>
        {rightElement}
        {onClose ? (
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.closeButton,
              {
                backgroundColor: darkMode
                  ? (activeTheme.surfaceVariant || activeTheme.cardBorder || '#334155')
                  : (activeTheme.surfaceContainer || '#F1F5F9'),
                borderColor: darkMode
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
            hitSlop={STANDARD_TOUCH_HIT_SLOP}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={closeAccessibilityLabel}
            testID={`${testID}-close`}
          >
            <Text
              style={[
                styles.closeText,
                {
                  color: activeTheme.textSecondary || (darkMode ? '#CBD5E1' : '#4B5563'),
                },
              ]}
            >
              ✕
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  leadingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  iconEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  iconContainer: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0,
  },
  subtitle: {
    fontWeight: '400',
    marginTop: 2,
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
});

module.exports = {
  ModalHeader,
  default: ModalHeader,
};