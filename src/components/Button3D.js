import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
const { LIGHT_THEME, DARK_THEME } = require('../themeService');
const { STANDARD_TOUCH_HIT_SLOP } = require('../iconMetrics');
const { TYPOGRAPHY_SCALES, getBengaliLineHeight } = require('../typographyTokens');

/**
 * Button3D — Tactile 3D Action Button with Extrusion Ledge
 *
 * Implements physical press feel, WCAG-compliant color contrast,
 * minimum 48x48dp hit-slop protection for compact variants,
 * and Bengali line-height safety.
 *
 * @param {Object} props
 * @param {string} [props.title] - Button label
 * @param {Function} props.onPress - Press handler
 * @param {'primary'|'secondary'|'compact'|'destructive'|'outline'} [props.variant='primary'] - Button style variant
 * @param {React.ReactNode} [props.icon] - Leading or standalone icon
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Button size
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {Object} [props.style] - Container style overrides
 * @param {Object} [props.textStyle] - Text style overrides
 * @param {boolean} [props.isDark=false] - Dark mode flag
 * @param {string} [props.accessibilityLabel] - A11y label
 * @param {string} [props.testID] - Test ID
 */
export const Button3D = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  size = 'md',
  disabled = false,
  style,
  textStyle,
  isDark = false,
  accessibilityLabel,
  testID,
  ...rest
}) => {
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  const isSmall = size === 'sm' || variant === 'compact';
  const isLarge = size === 'lg';

  let height = 44;
  let paddingHorizontal = 16;
  let borderRadius = 12;
  let fontSize = TYPOGRAPHY_SCALES.button.fontSize;

  if (isSmall) {
    height = 36;
    paddingHorizontal = 12;
    borderRadius = 10;
    fontSize = 13;
  } else if (isLarge) {
    height = 52;
    paddingHorizontal = 20;
    borderRadius = 14;
    fontSize = 16;
  }

  let bg = theme.primary;
  let textColor = theme.onPrimary;
  let borderTopColor = isDark ? '#FCA5A5' : '#FF6B6B';
  let borderBottomColor = isDark ? '#7F1D1D' : '#8A0E0E';
  let borderSideColor = isDark ? '#991B1B' : '#991B1B';
  let borderWidth = 1;
  let borderTopWidth = 1.5;
  let borderBottomWidth = isSmall ? 2 : 3;

  switch (variant) {
    case 'secondary':
      bg = theme.surfaceVariant;
      textColor = theme.textPrimary;
      borderTopColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF';
      borderBottomColor = isDark ? '#1E293B' : '#CBD5E1';
      borderSideColor = isDark ? '#334155' : '#E2E8F0';
      borderBottomWidth = 2.5;
      break;
    case 'destructive':
      bg = theme.danger;
      textColor = '#FFFFFF';
      borderTopColor = '#FCA5A5';
      borderBottomColor = '#991B1B';
      borderSideColor = '#B91C1C';
      break;
    case 'outline':
      bg = 'transparent';
      textColor = theme.textPrimary;
      borderTopColor = theme.outline;
      borderBottomColor = theme.outline;
      borderSideColor = theme.outline;
      borderTopWidth = 1.5;
      borderBottomWidth = 1.5;
      break;
    case 'compact':
      bg = theme.surfaceVariant;
      textColor = theme.textPrimary;
      borderTopColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF';
      borderBottomColor = isDark ? '#1E293B' : '#CBD5E1';
      borderSideColor = isDark ? '#334155' : '#E2E8F0';
      borderBottomWidth = 2;
      break;
    case 'success':
      bg = isDark ? (theme.income || '#047857') : (theme.success || '#059669');
      textColor = '#FFFFFF';
      borderTopColor = isDark ? '#6EE7B7' : '#34D399';
      borderBottomColor = isDark ? '#064E3B' : '#047857';
      borderSideColor = isDark ? '#047857' : '#059669';
      break;
    case 'warning':
    case 'gold':
      bg = theme.warning || '#D97706';
      textColor = '#FFFFFF';
      borderTopColor = isDark ? '#FCD34D' : '#FBBF24';
      borderBottomColor = isDark ? '#78350F' : '#B45309';
      borderSideColor = isDark ? '#92400E' : '#D97706';
      break;
    case 'info':
    case 'blue':
      bg = isDark ? '#2563EB' : '#1D4ED8';
      textColor = '#FFFFFF';
      borderTopColor = isDark ? '#93C5FD' : '#60A5FA';
      borderBottomColor = isDark ? '#1E3A8A' : '#1E40AF';
      borderSideColor = isDark ? '#1D4ED8' : '#2563EB';
      break;
    case 'primary':
    default:
      bg = theme.primary;
      textColor = theme.onPrimary;
      borderTopColor = isDark ? '#FCA5A5' : '#FF6B6B';
      borderBottomColor = isDark ? '#7F1D1D' : '#8A0E0E';
      borderSideColor = isDark ? '#991B1B' : '#991B1B';
      break;
  }

  const hitSlop = isSmall ? STANDARD_TOUCH_HIT_SLOP : undefined;

  return (
    <TouchableOpacity
      style={[
        styles.buttonBase,
        {
          height,
          paddingHorizontal,
          borderRadius,
          backgroundColor: bg,
          borderColor: borderSideColor,
          borderWidth,
          borderTopColor,
          borderTopWidth,
          borderBottomColor,
          borderBottomWidth,
          opacity: disabled ? theme.disabledOpacity : 1,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={theme.pressedOpacity || 0.7}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : undefined)}
      testID={testID}
      {...rest}
    >
      {icon ? <View style={title ? styles.iconMargin : undefined}>{icon}</View> : null}
      {title ? (
        <Text
          style={[
            styles.buttonText,
            {
              color: textColor,
              fontSize,
              lineHeight: getBengaliLineHeight(fontSize),
            },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 2.5,
  },
  buttonText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  iconMargin: {
    marginRight: 6,
  },
});

module.exports = {
  Button3D,
  default: Button3D,
};
