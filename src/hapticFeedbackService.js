/**
 * src/hapticFeedbackService.js
 * Tactile & Haptic Feedback Abstraction Service for TallyKhata.
 * 
 * Provides calibrated, defensive tactile feedback tailored for retail merchants
 * operating in noisy, high-distraction market environments (হাট-বাজার ও মুদি দোকান).
 * 
 * Defensive Environment Guards:
 * - Safely detects whether `expo-haptics` or React Native `Vibration` is present.
 * - In Node.js or environments without native vibration hardware, executes as a silent no-op.
 * - Protects against unhandled promise rejections on native devices.
 * 
 * Interaction Patterns:
 * - selection(): Light tick for tab bar switches, filter chips, segmented controls.
 * - impactLight(): Numeric keypad touches, calculator clicks.
 * - impactMedium(): Saving transactions, adding stock items, creating customer profiles.
 * - impactHeavy(): Cashbox reconciliation, deleting records, archiving businesses.
 * - notificationSuccess(): Successful transaction saved, cloud backup complete, voucher shared.
 * - notificationWarning(): Low stock threshold reached, unsaved form changes prompt.
 * - notificationError(): Validation error, negative cash warning, incorrect PIN.
 */

// Native Module Probing
let _expoHaptics = null;
let _rnVibration = null;

try {
  _expoHaptics = require('expo-haptics');
} catch (e) {
  _expoHaptics = null;
}

try {
  const rn = require('react-native');
  if (rn && rn.Vibration) {
    _rnVibration = rn.Vibration;
  }
} catch (e) {
  _rnVibration = null;
}

// Interaction Pattern Identifiers
const HAPTIC_PATTERNS = {
  SELECTION: 'selection',
  IMPACT_LIGHT: 'impactLight',
  IMPACT_MEDIUM: 'impactMedium',
  IMPACT_HEAVY: 'impactHeavy',
  NOTIFICATION_SUCCESS: 'notificationSuccess',
  NOTIFICATION_WARNING: 'notificationWarning',
  NOTIFICATION_ERROR: 'notificationError',
};

// Vibration Fallback Timings (milliseconds) for React Native Vibration API
const VIBRATION_FALLBACK_PATTERNS = {
  [HAPTIC_PATTERNS.SELECTION]: 10,
  [HAPTIC_PATTERNS.IMPACT_LIGHT]: 15,
  [HAPTIC_PATTERNS.IMPACT_MEDIUM]: 35,
  [HAPTIC_PATTERNS.IMPACT_HEAVY]: 65,
  [HAPTIC_PATTERNS.NOTIFICATION_SUCCESS]: [0, 25, 40, 25],
  [HAPTIC_PATTERNS.NOTIFICATION_WARNING]: [0, 40, 60, 40],
  [HAPTIC_PATTERNS.NOTIFICATION_ERROR]: [0, 50, 50, 50, 50, 80],
};

// Internal State
let _enabled = true;
let _customAdapter = null;

/**
 * Checks whether haptic feedback is currently enabled.
 * @returns {boolean}
 */
function isEnabled() {
  return _enabled;
}

/**
 * Enables or disables haptic feedback globally.
 * @param {boolean} flag
 */
function setEnabled(flag) {
  _enabled = Boolean(flag);
}

/**
 * Sets a custom haptic adapter (e.g. for testing, custom hardware, or logging).
 * @param {Object|null} adapter
 */
function setHapticsAdapter(adapter) {
  _customAdapter = adapter;
}

/**
 * Returns the currently active custom haptic adapter, if any.
 * @returns {Object|null}
 */
function getHapticsAdapter() {
  return _customAdapter;
}

/**
 * Clears the custom haptic adapter.
 */
function resetHapticsAdapter() {
  _customAdapter = null;
}

/**
 * Resets haptic configuration to default active state.
 */
function resetSettings() {
  _enabled = true;
  _customAdapter = null;
}

/**
 * Internal dispatch routine executing feedback across available backends.
 * Returns true if an action was dispatched, or false if disabled / no-op.
 * @param {string} pattern
 * @returns {boolean}
 */
function _trigger(pattern) {
  if (!_enabled) {
    return false;
  }

  // 1. Prioritize Custom Mock / Hardware Adapter
  if (_customAdapter) {
    try {
      if (typeof _customAdapter[pattern] === 'function') {
        _customAdapter[pattern]();
        return true;
      }
      if (typeof _customAdapter.trigger === 'function') {
        _customAdapter.trigger(pattern);
        return true;
      }
      if (typeof _customAdapter.vibrate === 'function') {
        _customAdapter.vibrate(pattern);
        return true;
      }
    } catch (err) {
      // Catch custom adapter exceptions defensively
      return false;
    }
  }

  // 2. Prioritize expo-haptics when available
  if (_expoHaptics) {
    try {
      switch (pattern) {
        case HAPTIC_PATTERNS.SELECTION:
          if (typeof _expoHaptics.selectionAsync === 'function') {
            const res = _expoHaptics.selectionAsync();
            if (res && typeof res.catch === 'function') res.catch(() => {});
            return true;
          }
          break;

        case HAPTIC_PATTERNS.IMPACT_LIGHT:
          if (typeof _expoHaptics.impactAsync === 'function') {
            const style = _expoHaptics.ImpactFeedbackStyle
              ? _expoHaptics.ImpactFeedbackStyle.Light
              : 'light';
            const res = _expoHaptics.impactAsync(style);
            if (res && typeof res.catch === 'function') res.catch(() => {});
            return true;
          }
          break;

        case HAPTIC_PATTERNS.IMPACT_MEDIUM:
          if (typeof _expoHaptics.impactAsync === 'function') {
            const style = _expoHaptics.ImpactFeedbackStyle
              ? _expoHaptics.ImpactFeedbackStyle.Medium
              : 'medium';
            const res = _expoHaptics.impactAsync(style);
            if (res && typeof res.catch === 'function') res.catch(() => {});
            return true;
          }
          break;

        case HAPTIC_PATTERNS.IMPACT_HEAVY:
          if (typeof _expoHaptics.impactAsync === 'function') {
            const style = _expoHaptics.ImpactFeedbackStyle
              ? _expoHaptics.ImpactFeedbackStyle.Heavy
              : 'heavy';
            const res = _expoHaptics.impactAsync(style);
            if (res && typeof res.catch === 'function') res.catch(() => {});
            return true;
          }
          break;

        case HAPTIC_PATTERNS.NOTIFICATION_SUCCESS:
          if (typeof _expoHaptics.notificationAsync === 'function') {
            const type = _expoHaptics.NotificationFeedbackType
              ? _expoHaptics.NotificationFeedbackType.Success
              : 'success';
            const res = _expoHaptics.notificationAsync(type);
            if (res && typeof res.catch === 'function') res.catch(() => {});
            return true;
          }
          break;

        case HAPTIC_PATTERNS.NOTIFICATION_WARNING:
          if (typeof _expoHaptics.notificationAsync === 'function') {
            const type = _expoHaptics.NotificationFeedbackType
              ? _expoHaptics.NotificationFeedbackType.Warning
              : 'warning';
            const res = _expoHaptics.notificationAsync(type);
            if (res && typeof res.catch === 'function') res.catch(() => {});
            return true;
          }
          break;

        case HAPTIC_PATTERNS.NOTIFICATION_ERROR:
          if (typeof _expoHaptics.notificationAsync === 'function') {
            const type = _expoHaptics.NotificationFeedbackType
              ? _expoHaptics.NotificationFeedbackType.Error
              : 'error';
            const res = _expoHaptics.notificationAsync(type);
            if (res && typeof res.catch === 'function') res.catch(() => {});
            return true;
          }
          break;

        default:
          break;
      }
    } catch (err) {
      // Fall through to standard vibration fallback
    }
  }

  // 3. Fallback to React Native Vibration API
  if (_rnVibration && typeof _rnVibration.vibrate === 'function') {
    try {
      const timing = VIBRATION_FALLBACK_PATTERNS[pattern] || 15;
      _rnVibration.vibrate(timing);
      return true;
    } catch (err) {
      // In headless or uninitialized RN environments, ignore silently
      return false;
    }
  }

  // 4. Silent no-op in Node.js or environments without tactile hardware
  return false;
}

/**
 * Triggers a haptic feedback pattern by identifier.
 * @param {string} pattern
 * @returns {boolean}
 */
function trigger(pattern) {
  return _trigger(pattern);
}

/**
 * Subtle selection click: tab switches, filter chips, segmented controls.
 * @returns {boolean}
 */
function selection() {
  return _trigger(HAPTIC_PATTERNS.SELECTION);
}

/**
 * Light impact: numeric keypad touches, calculator buttons.
 * @returns {boolean}
 */
function impactLight() {
  return _trigger(HAPTIC_PATTERNS.IMPACT_LIGHT);
}

/**
 * Medium impact: saving customer/supplier dues, adding stock, updating profile.
 * @returns {boolean}
 */
function impactMedium() {
  return _trigger(HAPTIC_PATTERNS.IMPACT_MEDIUM);
}

/**
 * Heavy impact: cashbox reconciliation, deleting entries, archiving accounts.
 * @returns {boolean}
 */
function impactHeavy() {
  return _trigger(HAPTIC_PATTERNS.IMPACT_HEAVY);
}

/**
 * Success notification: transaction committed, backup restored, voucher shared.
 * @returns {boolean}
 */
function notificationSuccess() {
  return _trigger(HAPTIC_PATTERNS.NOTIFICATION_SUCCESS);
}

/**
 * Warning notification: low stock threshold reached, unsaved form changes prompt.
 * @returns {boolean}
 */
function notificationWarning() {
  return _trigger(HAPTIC_PATTERNS.NOTIFICATION_WARNING);
}

/**
 * Error notification: validation error, negative cash alert, incorrect PIN.
 * @returns {boolean}
 */
function notificationError() {
  return _trigger(HAPTIC_PATTERNS.NOTIFICATION_ERROR);
}

// Retail Domain Aliases
const onKeyPress = impactLight;
const onTabPress = selection;
const onTransactionSave = notificationSuccess;
const onDelete = impactHeavy;
const onError = notificationError;

module.exports = {
  HAPTIC_PATTERNS,
  VIBRATION_FALLBACK_PATTERNS,
  isEnabled,
  setEnabled,
  setHapticsAdapter,
  getHapticsAdapter,
  resetHapticsAdapter,
  resetSettings,
  trigger,
  selection,
  impactLight,
  impactMedium,
  impactHeavy,
  notificationSuccess,
  notificationWarning,
  notificationError,
  onKeyPress,
  onTabPress,
  onTransactionSave,
  onDelete,
  onError,
  default: {
    HAPTIC_PATTERNS,
    VIBRATION_FALLBACK_PATTERNS,
    isEnabled,
    setEnabled,
    setHapticsAdapter,
    getHapticsAdapter,
    resetHapticsAdapter,
    resetSettings,
    trigger,
    selection,
    impactLight,
    impactMedium,
    impactHeavy,
    notificationSuccess,
    notificationWarning,
    notificationError,
    onKeyPress,
    onTabPress,
    onTransactionSave,
    onDelete,
    onError,
  },
};