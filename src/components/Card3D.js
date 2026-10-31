import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
const { LIGHT_THEME, DARK_THEME } = require('../themeService');
const { STANDARD_TOUCH_HIT_SLOP } = require('../iconMetrics');

/**
 * Card3D — Premium Dimensional Squircle Surface Container
 *
 * Implements continuous squircle geometry (radius = 16), top specular highlight,
 * subtle vertical extrusion ledge (2.5-3dp), and semantic color tokens.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child elements
 * @param {'primary'|'elevated'|'financial'|'secondary'|'highlight'} [props.variant='primary'] - Surface variant
 * @param {Object} [props.style] - Container style overrides
 * @param {Function} [props.onPress] - Press handler making card interactive
 * @param {boolean} [props.isDark=false] - Dark mode flag
 * @param {number} [props.elevation] - Android elevation / iOS shadow multiplier
 * @param {boolean} [props.noLedge=false] - Disables bottom extrusion ledge
 * @param {number} [props.activeOpacity=0.85] - Press opacity
 * @param {string} [props.accessibilityLabel] - A11y label
 * @param {string} [props.testID] - Test ID
 */
export const Card3D = ({
  children,
  variant = 'primary',
  style,
  onPress,
  isDark = false,
  elevation,
  noLedge = false,
  activeOpacity = 0.85,
  accessibilityLabel,
  testID,
  ...rest
}) => {
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  let bg = theme.cardBg;
  let borderColor = theme.cardBorder;
  let borderBottomColor = isDark ? theme.outline : theme.surfaceVariant;
  let defaultElevation = 2;

  switch (variant) {
    case 'elevated':
      bg = theme.cardBgElevated;
      borderColor = isDark ? theme.outline : theme.cardBorder;
      borderBottomColor = isDark ? theme.outlineVariant : theme.outline;
      defaultElevation = 4;
      break;
    case 'financial':
      bg = theme.cardBg;
      borderColor = isDark ? theme.cardBorder : '#EFEFEF';
      borderBottomColor = isDark ? '#334155' : '#E2E8F0';
      defaultElevation = 3;
      break;
    case 'secondary':
      bg = theme.surfaceContainer;
      borderColor = theme.cardBorder;
      borderBottomColor = isDark ? theme.outline : theme.outlineVariant;
      defaultElevation = 1;
      break;
    case 'highlight':
      bg = theme.primaryContainer;
      borderColor = theme.primary;
      borderBottomColor = isDark ? '#7F1D1D' : '#FCA5A5';
      defaultElevation = 3;
      break;
    case 'primary':
    default:
      bg = theme.cardBg;
      borderColor = theme.cardBorder;
      borderBottomColor = isDark ? theme.outline : theme.surfaceVariant;
      defaultElevation = 2;
      break;
  }

  const effectiveElevation = elevation !== undefined ? elevation : defaultElevation;
  const isElevated = effectiveElevation >= 4;

  const containerStyles = [
    styles.base,
    {
      backgroundColor: bg,
      borderColor: borderColor,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
      borderTopWidth: 1.5,
      borderBottomColor: noLedge ? borderColor : borderBottomColor,
      borderBottomWidth: noLedge ? 1 : (variant === 'financial' ? 3 : 2.5),
      borderLeftWidth: 1,
      borderRightWidth: 1,
      elevation: effectiveElevation,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: isElevated ? 3 : 2 },
      shadowOpacity: isDark ? 0.35 : (isElevated ? 0.14 : 0.08),
      shadowRadius: isElevated ? 5 : 3.5,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyles}
        onPress={onPress}
        activeOpacity={activeOpacity}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={containerStyles}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
});

module.exports = {
  Card3D,
  default: Card3D,
};
