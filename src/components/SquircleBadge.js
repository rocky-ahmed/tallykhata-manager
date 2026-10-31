import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
const { getIconTheme, LIGHT_THEME, DARK_THEME } = require('../themeService');
const { getIconMetrics } = require('../iconMetrics');
const { TYPOGRAPHY_SCALES } = require('../typographyTokens');

/**
 * SquircleBadge — 3D Dimensional Squircle Badge, Icon Container & Counter
 *
 * Implements continuous squircle geometry (radius = containerSize * 0.28),
 * top specular sheen overlay (0.36 height multiplier), 3D extrusion borders,
 * optical icon scaling, and optional notification counter tags.
 *
 * @param {Object} props
 * @param {any} props.source - Image asset source
 * @param {string} [props.iconKey] - Key for icon optical scaling
 * @param {string} [props.variant='neutral'] - Theme palette variant
 * @param {number} [props.size=24] - Base icon dimension
 * @param {number} [props.containerSize=44] - Container width and height
 * @param {number|string} [props.count] - Optional notification counter
 * @param {boolean} [props.isDark=false] - Dark mode flag
 * @param {Object} [props.style] - Container style overrides
 * @param {Object} [props.imageStyle] - Inner image style overrides
 * @param {'rounded'|'circle'|'none'} [props.shape='rounded'] - Container shape
 * @param {string|null} [props.tintColor] - Icon tint color override
 * @param {number} [props.opticalScale] - Explicit scale multiplier
 * @param {number} [props.translateY] - Explicit vertical offset
 * @param {string} [props.accessibilityLabel] - A11y label
 * @param {string} [props.testID] - Test ID
 */
export const SquircleBadge = ({
  source,
  iconKey,
  variant = 'neutral',
  size = 24,
  containerSize = 44,
  count,
  isDark = false,
  style,
  imageStyle,
  shape = 'rounded',
  tintColor,
  opticalScale,
  translateY,
  accessibilityLabel,
  testID,
  ...rest
}) => {
  const mode = isDark ? 'dark' : 'light';
  const theme = getIconTheme(variant, mode);
  const resolvedTint = tintColor !== undefined ? tintColor : theme.tint;

  const metrics = getIconMetrics(iconKey || (typeof source === 'string' ? source : ''));
  const effectiveScale = opticalScale !== undefined ? opticalScale : metrics.opticalScale;
  const effectiveTranslateY = translateY !== undefined ? translateY : metrics.translateY;
  const effectiveWidth = Math.round(size * effectiveScale);
  const effectiveHeight = Math.round(size * effectiveScale);
  const transformStyle = effectiveTranslateY ? [{ translateY: effectiveTranslateY }] : undefined;

  if (shape === 'none') {
    return (
      <Image
        source={source}
        style={[
          { width: effectiveWidth, height: effectiveHeight },
          transformStyle ? { transform: transformStyle } : {},
          resolvedTint ? { tintColor: resolvedTint } : {},
          imageStyle,
        ]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      />
    );
  }

  const isCircle = shape === 'circle';
  const radius = isCircle ? containerSize / 2 : Math.round(containerSize * 0.28);

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: radius,
          backgroundColor: theme.bg,
          borderTopWidth: 1.5,
          borderTopColor: theme.borderTop,
          borderBottomWidth: 3,
          borderBottomColor: theme.borderBottom,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: theme.borderSides,
          elevation: isDark ? 4 : 3,
          shadowColor: isDark ? '#000000' : (theme.shadowColor || '#000000'),
          shadowOffset: { width: 0, height: isDark ? 3 : 2 },
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: isDark ? 4 : 3.5,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      {...rest}
    >
      {/* 3D Specular Sheen Overlay */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: Math.round(containerSize * 0.36),
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.32)',
        }}
      />

      <Image
        source={source}
        style={[
          { width: effectiveWidth, height: effectiveHeight },
          transformStyle ? { transform: transformStyle } : {},
          resolvedTint ? { tintColor: resolvedTint } : {},
          imageStyle,
        ]}
        resizeMode="contain"
      />

      {/* Optional Notification Counter Badge */}
      {count !== undefined && count !== null ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#B81414',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

module.exports = {
  SquircleBadge,
  default: SquircleBadge,
};
