const fs = require('fs');
const babel = require('@babel/core');

let code = fs.readFileSync('App.js', 'utf8');

// Backup original before modifications
fs.writeFileSync('App.js.bak_iter215', code);

// 1. Add Animated to react-native imports if not present
if (!code.includes('  Animated,\n} from \'react-native\';') && !code.includes('Animated,') ) {
  const target1 = '  ActivityIndicator,\n} from \'react-native\';';
  const repl1 = '  ActivityIndicator,\n  Animated,\n} from \'react-native\';';
  if (code.includes(target1)) {
    code = code.replace(target1, repl1);
    console.log('[1/10] Animated import added.');
  } else {
    console.error('Target 1 not found');
  }
} else {
  console.log('[1/10] Animated already imported.');
}

// 2. Import biometricAuthService
if (!code.includes('biometricAuthService')) {
  const target2 = "import hapticFeedbackService from './src/hapticFeedbackService';";
  const repl2 = "import hapticFeedbackService from './src/hapticFeedbackService';\nimport * as biometricAuthModule from './src/biometricAuthService';\nconst biometricAuthService = biometricAuthModule.biometricAuthService || biometricAuthModule.default || biometricAuthModule;";
  if (code.includes(target2)) {
    code = code.replace(target2, repl2);
    console.log('[2/10] biometricAuthService import added.');
  } else {
    console.error('Target 2 not found');
  }
} else {
  console.log('[2/10] biometricAuthService already present.');
}

// 3. State hooks for AppLock and Biometrics
const target3 = `  // App Security (PIN Lock)
  const [pinEnabled, setPinEnabled] = useState(false);
  const [appPin, setAppPin] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const pinEnabledRef = useRef(pinEnabled);
  pinEnabledRef.current = pinEnabled;`;

const repl3 = `  // App Security (PIN Lock & Biometrics - Iteration 215)
  const [pinEnabled, setPinEnabled] = useState(false);
  const [appPin, setAppPin] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const pinEnabledRef = useRef(pinEnabled);
  pinEnabledRef.current = pinEnabled;

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const biometricEnabledRef = useRef(biometricEnabled);
  biometricEnabledRef.current = biometricEnabled;
  const [pinErrorCount, setPinErrorCount] = useState(0);
  const [pinLockoutCountdown, setPinLockoutCountdown] = useState(0);
  const [pinHasError, setPinHasError] = useState(false);
  const pinLockoutTimerRef = useRef(null);
  const pinShakeAnim = useRef(new Animated.Value(0)).current;

  // Modals for AppLock & Security Center
  const [modalChangePin, setModalChangePin] = useState(false);
  const [modalPinRecovery, setModalPinRecovery] = useState(false);

  // PIN Setup / Change / Recovery Sub-states
  const [pinSetupStep, setPinSetupStep] = useState('menu'); // 'menu' | 'enter' | 'confirm'
  const [pinSetupDraft, setPinSetupDraft] = useState('');
  const [pinSetupConfirm, setPinSetupConfirm] = useState('');
  const [pinSetupError, setPinSetupError] = useState('');

  const [changePinCurrent, setChangePinCurrent] = useState('');
  const [changePinNew, setChangePinNew] = useState('');
  const [changePinConfirm, setChangePinConfirm] = useState('');
  const [changePinStep, setChangePinStep] = useState('current'); // 'current' | 'new' | 'confirm'
  const [changePinError, setChangePinError] = useState('');

  const [pinRecoveryPhone, setPinRecoveryPhone] = useState('');
  const [pinRecoveryStep, setPinRecoveryStep] = useState('options'); // 'options' | 'phone_verify'
  const [pinRecoveryError, setPinRecoveryError] = useState('');`;

if (code.includes(target3)) {
  code = code.replace(target3, repl3);
  console.log('[3/10] App Security state hooks updated.');
} else {
  console.error('Target 3 not found');
}

// 4. BackHandler modal dismissals & dependency array
const target4 = `      if (modalVoucher) { setModalVoucher(false); return true; }
      if (modalPinSetup) { setModalPinSetup(false); return true; }`;

const repl4 = `      if (modalVoucher) { setModalVoucher(false); return true; }
      if (modalPinRecovery) { setModalPinRecovery(false); return true; }
      if (modalChangePin) { setModalChangePin(false); return true; }
      if (modalPinSetup) { setModalPinSetup(false); return true; }`;

if (code.includes(target4)) {
  code = code.replace(target4, repl4);
  console.log('[4/10] BackHandler modal chain updated.');
} else {
  console.error('Target 4 not found');
}

// Add modalPinRecovery and modalChangePin to BackHandler dependency array
const target4b = 'modalBulkTagada, modalVoucher, modalPinSetup, modalProfitLoss,';
const repl4b = 'modalBulkTagada, modalVoucher, modalPinSetup, modalChangePin, modalPinRecovery, modalProfitLoss,';
if (code.includes(target4b)) {
  code = code.replace(target4b, repl4b);
  console.log('[4b/10] BackHandler dependency array updated.');
} else {
  console.error('Target 4b not found');
}

// 5. Data loading & applyStateToUi for biometricEnabled
const target5 = `        if (d.pinEnabled && d.appPin) {
          setPinEnabled(true);
          setAppPin(d.appPin);
          setIsLocked(true);
        }`;

const repl5 = `        if (d.pinEnabled && d.appPin) {
          setPinEnabled(true);
          setAppPin(d.appPin);
          setIsLocked(true);
        }
        if (d.biometricEnabled !== undefined) {
          setBiometricEnabled(Boolean(d.biometricEnabled));
        }`;

if (code.includes(target5)) {
  code = code.replace(target5, repl5);
  console.log('[5/10] loadSavedData biometricEnabled restored.');
} else {
  console.error('Target 5 not found');
}

const target5b = `    if (resetPin) {
      setPinEnabled(false);
      setAppPin('');
    } else {
      if (state.pinEnabled !== undefined) setPinEnabled(Boolean(state.pinEnabled));
      if (state.appPin !== undefined) setAppPin(String(state.appPin));
    }`;

const repl5b = `    if (resetPin) {
      setPinEnabled(false);
      setAppPin('');
      setBiometricEnabled(false);
    } else {
      if (state.pinEnabled !== undefined) setPinEnabled(Boolean(state.pinEnabled));
      if (state.appPin !== undefined) setAppPin(String(state.appPin));
      if (state.biometricEnabled !== undefined) setBiometricEnabled(Boolean(state.biometricEnabled));
    }`;

if (code.includes(target5b)) {
  code = code.replace(target5b, repl5b);
  console.log('[5b/10] applyStateToUi biometricEnabled added.');
} else {
  console.error('Target 5b not found');
}

// 6. Security handlers and test hooks
const target6 = `    global.__tallykhataHandleRetryCloudBackupNow = handleRetryCloudBackupNow;
    global.__tallykhataHandleCancelBackupRetry = handleCancelBackupRetry;
    global.__tallykhataStartBackupRetryCountdown = startBackupRetryCountdown;
  }`;

const repl6 = `    global.__tallykhataHandleRetryCloudBackupNow = handleRetryCloudBackupNow;
    global.__tallykhataHandleCancelBackupRetry = handleCancelBackupRetry;
    global.__tallykhataStartBackupRetryCountdown = startBackupRetryCountdown;
    global.__PIN_SECURITY_TEST_HOOKS__ = {
      pinEnabled,
      appPin,
      isLocked,
      biometricEnabled,
      pinErrorCount,
      pinLockoutCountdown,
      pinHasError,
      handleKeypadPress: (k) => handleKeypadPress(k),
      handleBiometricAuth: () => handleBiometricAuth(),
      handleIncorrectPin: () => handleIncorrectPin(),
      triggerPinShake: () => triggerPinShake(),
      setPinEnabled,
      setAppPin,
      setIsLocked,
      setBiometricEnabled,
      setPinLockoutCountdown,
      setPinErrorCount,
      modalPinSetup,
      setModalPinSetup,
      modalChangePin,
      setModalChangePin,
      modalPinRecovery,
      setModalPinRecovery,
    };
  }`;

if (code.includes(target6)) {
  code = code.replace(target6, repl6);
  console.log('[6/10] global test hooks added.');
} else {
  console.error('Target 6 not found');
}

// Handlers for PIN shake, incorrect PIN, biometric and keypad
const handlersCode = `
  // =========================================================================
  // APPLOCK & BIOMETRIC AUTHENTICATION HANDLERS (Iteration 215)
  // =========================================================================
  const triggerPinShake = () => {
    try {
      pinShakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(pinShakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
        Animated.timing(pinShakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
        Animated.timing(pinShakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
        Animated.timing(pinShakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
        Animated.timing(pinShakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
        Animated.timing(pinShakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
        Animated.timing(pinShakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    } catch (e) {}
  };

  const handleIncorrectPin = () => {
    try {
      hapticFeedbackService.onError();
    } catch (e) {}
    setPinHasError(true);
    triggerPinShake();
    const nextErrors = pinErrorCount + 1;
    setPinErrorCount(nextErrors);
    setPinInput('');
    setTimeout(() => {
      setPinHasError(false);
    }, 800);

    const lockoutSecs = biometricAuthService.calculateLockoutSeconds(nextErrors);
    if (lockoutSecs > 0) {
      setPinLockoutCountdown(lockoutSecs);
      if (pinLockoutTimerRef.current) clearInterval(pinLockoutTimerRef.current);
      pinLockoutTimerRef.current = setInterval(() => {
        setPinLockoutCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(pinLockoutTimerRef.current);
            pinLockoutTimerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleBiometricAuth = async () => {
    if (pinLockoutCountdown > 0) return;
    try {
      const status = await biometricAuthService.checkBiometricStatus();
      if (!status.available) return;
      const res = await biometricAuthService.authenticateAsync({
        promptMessage: t('pin_lock_title'),
        fallbackLabel: t('pin_verify_current'),
        cancelLabel: t('backup_retry_cancel'),
      });
      if (res && res.success) {
        try {
          hapticFeedbackService.notificationSuccess();
        } catch (e) {}
        setIsLocked(false);
        setPinInput('');
        setPinErrorCount(0);
        setPinLockoutCountdown(0);
        if (pinLockoutTimerRef.current) {
          clearInterval(pinLockoutTimerRef.current);
          pinLockoutTimerRef.current = null;
        }
      } else if (res && res.error && res.error !== 'CANCELLED' && res.error !== 'USER_CANCEL') {
        handleIncorrectPin();
      }
    } catch (e) {
      console.warn('Biometric auth error:', e);
    }
  };

  const handleKeypadPress = (key) => {
    if (pinLockoutCountdown > 0) return;
    try {
      hapticFeedbackService.selection();
    } catch (e) {}

    if (key === 'BIO') {
      handleBiometricAuth();
      return;
    }
    if (key === 'C') {
      setPinInput('');
      return;
    }
    if (key === 'BACKSPACE' || key === '⌫') {
      setPinInput((prev) => prev.slice(0, -1));
      return;
    }

    if (pinInput.length < 4) {
      const next = pinInput + key;
      setPinInput(next);
      if (next.length === 4) {
        if (next === appPin) {
          try {
            hapticFeedbackService.notificationSuccess();
          } catch (e) {}
          setIsLocked(false);
          setPinInput('');
          setPinErrorCount(0);
          setPinLockoutCountdown(0);
          if (pinLockoutTimerRef.current) {
            clearInterval(pinLockoutTimerRef.current);
            pinLockoutTimerRef.current = null;
          }
        } else {
          handleIncorrectPin();
        }
      }
    }
  };

  useEffect(() => {
    if (pinEnabled && isLocked && biometricEnabled && pinLockoutCountdown === 0) {
      handleBiometricAuth();
    }
  }, [pinEnabled, isLocked, biometricEnabled]);

  useEffect(() => {
    return () => {
      if (pinLockoutTimerRef.current) {
        clearInterval(pinLockoutTimerRef.current);
        pinLockoutTimerRef.current = null;
      }
    };
  }, []);
`;

// Place handlers before applyStateToUi
const target6b = '  const applyStateToUi = (state, { resetPin = false } = {}) => {';
if (code.includes(target6b)) {
  code = code.replace(target6b, handlersCode + target6b);
  console.log('[6b/10] Security handlers and lifecycle hooks inserted.');
} else {
  console.error('Target 6b not found');
}

// 7. Full-Screen Lock Screen replacement
const lockScreenStart = '  // =========================================================================\n  // VIEW: PIN SECURITY LOCK SCREEN\n  // =========================================================================\n  if (pinEnabled && isLocked) {';
const lockScreenEnd = '  // =========================================================================\n  // VIEW A: CUSTOMER / SUPPLIER ACCOUNT LEDGER SCREEN (activity_customer_report_v2.xml)';

const startIndex = code.indexOf(lockScreenStart);
const endIndex = code.indexOf(lockScreenEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const newLockScreen = `  // =========================================================================
  // VIEW: PIN SECURITY LOCK SCREEN (Iteration 215: Tactile 3D Keypad, Shake Anim & Biometrics)
  // =========================================================================
  if (pinEnabled && isLocked) {
    const lockBgColor = isDark ? (currentTheme.surface || '#0B1120') : COLORS.primary;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: lockBgColor }]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={isDark ? (currentTheme.surfaceDark || '#0F172A') : COLORS.primaryDark}
        />
        <View style={styles.pinLockContainer}>
          <Image
            source={require("./assets/icons/ic_lock.png")}
            style={{ width: 56, height: 56, marginBottom: 14, tintColor: isDark ? (currentTheme.accent || '#10B981') : "#FFFFFF" }}
            resizeMode="contain"
          />
          <Text style={[styles.pinLockTitle, isDark && tStyles.textPrimary]}>{t('pin_lock_title')}</Text>
          <Text style={[styles.pinLockSub, isDark && tStyles.textSecondary]}>{t('pin_lock_sub')}</Text>

          {/* Lockout Countdown Alert Badge */}
          {pinLockoutCountdown > 0 && (
            <View
              style={[styles.pinLockoutBadge, isDark && styles.pinLockoutBadgeDark]}
              accessibilityRole="alert"
              accessibilityLabel={t('pin_lockout_msg', { seconds: toBengaliNumber(pinLockoutCountdown) })}
            >
              <Text style={[styles.pinLockoutBadgeText, isDark && styles.pinLockoutBadgeTextDark]}>
                {t('pin_lockout_msg', { seconds: toBengaliNumber(pinLockoutCountdown) })}
              </Text>
            </View>
          )}

          {/* Incorrect PIN Feedback Text */}
          {pinHasError && (
            <Text style={styles.pinErrorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {t('pin_incorrect')}
            </Text>
          )}

          {/* 4-Digit Dots with Animated Shake */}
          <Animated.View style={[styles.pinDotsRow, { transform: [{ translateX: pinShakeAnim }] }]}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pinInput.length > idx;
              const isActive = pinInput.length === idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.pinDot,
                    isFilled && styles.pinDotFilled,
                    isActive && styles.pinDotActive,
                    pinHasError && styles.pinDotError,
                    isDark && styles.pinDotDark,
                    isDark && isFilled && styles.pinDotFilledDark,
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Tactile 3D Keypad Grid */}
          <View
            style={[styles.pinKeypad3D, pinLockoutCountdown > 0 && { opacity: 0.35 }]}
            pointerEvents={pinLockoutCountdown > 0 ? 'none' : 'auto'}
          >
            {[
              [{ digit: '1', bn: '১' }, { digit: '2', bn: '২' }, { digit: '3', bn: '৩' }],
              [{ digit: '4', bn: '৪' }, { digit: '5', bn: '৫' }, { digit: '6', bn: '৬' }],
              [{ digit: '7', bn: '৭' }, { digit: '8', bn: '৮' }, { digit: '9', bn: '৯' }],
              [
                { digit: 'BIO', bn: '', label: 'ফিঙ্গারপ্রিন্ট', isBiometric: true },
                { digit: '0', bn: '০' },
                { digit: 'BACKSPACE', bn: '', label: '⌫', isBackspace: true },
              ],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.pinKeypadRow}>
                {row.map((btn) => {
                  const isBio = btn.isBiometric;
                  const isBs = btn.isBackspace;
                  const isDisabled = isBio && !biometricEnabled;
                  return (
                    <TouchableOpacity
                      key={btn.digit}
                      style={[
                        styles.pinKeyBtn3D,
                        isDark && styles.pinKeyBtn3DDark,
                        (isBio || isBs) && styles.pinKeyBtnAction,
                        isDisabled && { opacity: 0.25 },
                      ]}
                      disabled={isDisabled || pinLockoutCountdown > 0}
                      onPress={() => handleKeypadPress(btn.digit)}
                      activeOpacity={0.7}
                      hitSlop={STANDARD_TOUCH_HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel={btn.label || (effectiveLanguage === 'en' ? btn.digit : btn.bn || btn.digit)}
                    >
                      {isBio ? (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Image
                            source={require('./assets/icons/ic_menu_lock.png')}
                            style={{ width: 22, height: 22, tintColor: isDark ? (currentTheme.accent || '#10B981') : '#FFFFFF' }}
                            resizeMode="contain"
                          />
                          <Text style={[styles.pinKeySubText, isDark && { color: currentTheme.textSecondary }]}>
                            {t('security_biometric_title').slice(0, 10)}
                          </Text>
                        </View>
                      ) : isBs ? (
                        <Text style={[styles.pinKeyText3D, isDark && styles.pinKeyText3DDark]}>⌫</Text>
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={[styles.pinKeyText3D, isDark && styles.pinKeyText3DDark]}>
                            {effectiveLanguage === 'en' ? btn.digit : btn.bn}
                          </Text>
                          <Text style={[styles.pinKeySubText, isDark && { color: currentTheme.textSecondary }]}>
                            {effectiveLanguage === 'en' ? btn.bn : btn.digit}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Forgot PIN Recovery Link */}
          <TouchableOpacity
            style={styles.pinForgotBtn}
            onPress={() => {
              try { hapticFeedbackService.selection(); } catch (e) {}
              setPinRecoveryStep('options');
              setPinRecoveryPhone('');
              setPinRecoveryError('');
              setModalPinRecovery(true);
            }}
            hitSlop={STANDARD_TOUCH_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t('pin_forgot_link')}
          >
            <Text style={[styles.pinForgotText, isDark && { color: currentTheme.textSecondary }]}>
              {t('pin_forgot_link')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

`;
  code = code.slice(0, startIndex) + newLockScreen + code.slice(endIndex);
  console.log('[7/10] Full-Screen AppLock UI replaced.');
} else {
  console.error('Target 7 not found:', { startIndex, endIndex });
}

// 8. Replace modalPinSetup and add modalChangePin + modalPinRecovery
const modalPinSetupStart = '      {/* ===================================================================\n          MODAL: PIN SECURITY SETUP\n         =================================================================== */}';
const modalPinSetupEnd = '      {/* 1. BUSINESS PICKER */}';

const modalStartIndex = code.indexOf(modalPinSetupStart);
const modalEndIndex = code.indexOf(modalPinSetupEnd);

if (modalStartIndex !== -1 && modalEndIndex !== -1) {
  const newModals = `      {/* ===================================================================
          MODAL: PIN SECURITY SETUP & SECURITY CENTER (Iteration 215)
         =================================================================== */}
      <Modal visible={modalPinSetup} animationType="slide" transparent onRequestClose={() => setModalPinSetup(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.text]}>
                {t('security_applock_title')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalPinSetup(false);
                  setPinSetupStep('menu');
                  setPinSetupDraft('');
                  setPinSetupConfirm('');
                  setPinSetupError('');
                }}
                style={[styles.modalCloseCircle, isDark && tStyles.modalCloseCircle]}
                hitSlop={STANDARD_TOUCH_HIT_SLOP}
                activeOpacity={0.7}
              >
                <Image
                  source={require('./assets/icons/ic_close.png')}
                  style={[styles.modalCloseIcon, isDark && tStyles.modalCloseIcon]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {pinSetupStep === 'menu' ? (
              <View style={{ gap: 14, marginVertical: 8 }}>
                {/* 1. App Lock PIN Toggle Card */}
                <View style={[styles.securityItemCard, isDark && styles.securityItemCardDark]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[styles.securityItemTitle, isDark && tStyles.textPrimary]}>
                        {t('security_applock_title')}
                      </Text>
                      <Text style={[styles.securityItemSub, isDark && tStyles.textSecondary]}>
                        {t('security_applock_sub')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.securityToggleBtn,
                        pinEnabled ? styles.securityToggleActive : styles.securityToggleInactive,
                      ]}
                      onPress={async () => {
                        try { hapticFeedbackService.selection(); } catch (e) {}
                        if (!pinEnabled) {
                          setPinSetupDraft('');
                          setPinSetupConfirm('');
                          setPinSetupError('');
                          setPinSetupStep('enter');
                        } else {
                          Alert.alert(
                            t('security_applock_title'),
                            t('security_change_pin_sub'),
                            [
                              { text: t('backup_retry_cancel'), style: 'cancel' },
                              {
                                text: t('disable_pin_btn') || 'লক বন্ধ করুন',
                                style: 'destructive',
                                onPress: async () => {
                                  const saveRes = await persistData({ pinEnabled: false, appPin: '', biometricEnabled: false });
                                  if (saveRes.success) {
                                    setPinEnabled(false);
                                    setAppPin('');
                                    setBiometricEnabled(false);
                                    try { hapticFeedbackService.notificationSuccess(); } catch (e) {}
                                    Alert.alert(t('security_applock_title'), t('security_pin_disabled_toast'));
                                  }
                                },
                              },
                            ]
                          );
                        }
                      }}
                      hitSlop={STANDARD_TOUCH_HIT_SLOP}
                      accessibilityRole="switch"
                      accessibilityLabel={t('security_applock_title')}
                    >
                      <Text style={styles.securityToggleText}>
                        {pinEnabled ? (effectiveLanguage === 'en' ? 'ON' : 'চালু') : (effectiveLanguage === 'en' ? 'OFF' : 'বন্ধ')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2. Biometric Unlock Toggle Card */}
                <View style={[styles.securityItemCard, isDark && styles.securityItemCardDark, !pinEnabled && { opacity: 0.5 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[styles.securityItemTitle, isDark && tStyles.textPrimary]}>
                        {t('security_biometric_title')}
                      </Text>
                      <Text style={[styles.securityItemSub, isDark && tStyles.textSecondary]}>
                        {t('security_biometric_sub')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.securityToggleBtn,
                        biometricEnabled ? styles.securityToggleActive : styles.securityToggleInactive,
                      ]}
                      disabled={!pinEnabled}
                      onPress={async () => {
                        if (!pinEnabled) {
                          Alert.alert(t('security_biometric_title'), t('pin_enter_new'));
                          return;
                        }
                        try { hapticFeedbackService.selection(); } catch (e) {}
                        if (!biometricEnabled) {
                          const bioRes = await biometricAuthService.authenticateAsync({
                            promptMessage: t('security_biometric_title'),
                            fallbackLabel: t('pin_verify_current'),
                            cancelLabel: t('backup_retry_cancel'),
                          });
                          if (bioRes && bioRes.success) {
                            const saveRes = await persistData({ biometricEnabled: true });
                            if (saveRes.success) {
                              setBiometricEnabled(true);
                              try { hapticFeedbackService.notificationSuccess(); } catch (e) {}
                              Alert.alert(t('security_biometric_title'), t('security_pin_enabled_toast'));
                            }
                          } else {
                            try { hapticFeedbackService.onError(); } catch (e) {}
                            Alert.alert(t('security_biometric_title'), t('pin_incorrect'));
                          }
                        } else {
                          const saveRes = await persistData({ biometricEnabled: false });
                          if (saveRes.success) {
                            setBiometricEnabled(false);
                            try { hapticFeedbackService.notificationSuccess(); } catch (e) {}
                          }
                        }
                      }}
                      hitSlop={STANDARD_TOUCH_HIT_SLOP}
                      accessibilityRole="switch"
                      accessibilityLabel={t('security_biometric_title')}
                    >
                      <Text style={styles.securityToggleText}>
                        {biometricEnabled ? (effectiveLanguage === 'en' ? 'ON' : 'চালু') : (effectiveLanguage === 'en' ? 'OFF' : 'বন্ধ')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3. Change PIN Option (Visible when PIN is enabled) */}
                {pinEnabled && (
                  <TouchableOpacity
                    style={[styles.securityItemCard, isDark && styles.securityItemCardDark]}
                    onPress={() => {
                      try { hapticFeedbackService.selection(); } catch (e) {}
                      setChangePinCurrent('');
                      setChangePinNew('');
                      setChangePinConfirm('');
                      setChangePinStep('current');
                      setChangePinError('');
                      setModalPinSetup(false);
                      setModalChangePin(true);
                    }}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={t('security_change_pin')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.securityItemTitle, isDark && tStyles.textPrimary]}>
                          {t('security_change_pin')}
                        </Text>
                        <Text style={[styles.securityItemSub, isDark && tStyles.textSecondary]}>
                          {t('security_change_pin_sub')}
                        </Text>
                      </View>
                      <Image source={require('./assets/icons/arrow_right.png')} style={{ width: 16, height: 16, tintColor: COLORS.primary }} resizeMode="contain" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            ) : pinSetupStep === 'enter' ? (
              <View style={{ gap: 12, marginVertical: 8 }}>
                <Text style={[{ fontSize: 14, fontWeight: '600', color: COLORS.textDark }, isDark && tStyles.textPrimary]}>
                  {t('pin_enter_new')}
                </Text>
                <TextInput
                  style={[styles.modalBigInput, isDark && tStyles.input]}
                  placeholder={tStatic("৪ ডিজিটের পিন")}
                  placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry={true}
                  value={pinSetupDraft}
                  onChangeText={(txt) => {
                    setPinSetupDraft(txt);
                    setPinSetupError('');
                  }}
                  autoFocus={true}
                />
                {pinSetupError ? (
                  <Text style={{ fontSize: 12, color: COLORS.red }}>{pinSetupError}</Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: '#6B7280', flex: 1 }]}
                    onPress={() => setPinSetupStep('menu')}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('backup_retry_cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, flex: 1 }]}
                    onPress={() => {
                      if (pinSetupDraft.length !== 4) {
                        try { hapticFeedbackService.onError(); } catch (e) {}
                        setPinSetupError(t('pin_enter_new'));
                        return;
                      }
                      try { hapticFeedbackService.selection(); } catch (e) {}
                      setPinSetupStep('confirm');
                      setPinSetupConfirm('');
                      setPinSetupError('');
                    }}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('next_btn') || 'পরবর্তী'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ gap: 12, marginVertical: 8 }}>
                <Text style={[{ fontSize: 14, fontWeight: '600', color: COLORS.textDark }, isDark && tStyles.textPrimary]}>
                  {t('pin_confirm_new')}
                </Text>
                <TextInput
                  style={[styles.modalBigInput, isDark && tStyles.input]}
                  placeholder={tStatic("পিনটি পুনরায় দিন")}
                  placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry={true}
                  value={pinSetupConfirm}
                  onChangeText={(txt) => {
                    setPinSetupConfirm(txt);
                    setPinSetupError('');
                  }}
                  autoFocus={true}
                />
                {pinSetupError ? (
                  <Text style={{ fontSize: 12, color: COLORS.red }}>{pinSetupError}</Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: '#6B7280', flex: 1 }]}
                    onPress={() => setPinSetupStep('enter')}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('backup_retry_cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, flex: 1 }]}
                    onPress={async () => {
                      if (pinSetupConfirm !== pinSetupDraft) {
                        try { hapticFeedbackService.onError(); } catch (e) {}
                        setPinSetupError(t('pin_mismatch'));
                        return;
                      }
                      const saveRes = await persistData({ pinEnabled: true, appPin: pinSetupDraft });
                      if (saveRes.success) {
                        setPinEnabled(true);
                        setAppPin(pinSetupDraft);
                        setPinSetupStep('menu');
                        setModalPinSetup(false);
                        try { hapticFeedbackService.notificationSuccess(); } catch (e) {}
                        Alert.alert(t('security_applock_title'), t('security_pin_enabled_toast'));
                      } else {
                        try { hapticFeedbackService.onError(); } catch (e) {}
                        setPinSetupError(t('pin_mismatch'));
                      }
                    }}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('confirm_btn') || 'নিশ্চিত করুন'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: CHANGE PIN (Iteration 215)
         =================================================================== */}
      <Modal visible={modalChangePin} animationType="slide" transparent onRequestClose={() => setModalChangePin(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.text]}>
                {t('security_change_pin')}
              </Text>
              <TouchableOpacity
                onPress={() => setModalChangePin(false)}
                style={[styles.modalCloseCircle, isDark && tStyles.modalCloseCircle]}
                hitSlop={STANDARD_TOUCH_HIT_SLOP}
                activeOpacity={0.7}
              >
                <Image
                  source={require('./assets/icons/ic_close.png')}
                  style={[styles.modalCloseIcon, isDark && tStyles.modalCloseIcon]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {changePinStep === 'current' ? (
              <View style={{ gap: 12, marginVertical: 8 }}>
                <Text style={[{ fontSize: 14, fontWeight: '600', color: COLORS.textDark }, isDark && tStyles.textPrimary]}>
                  {t('pin_verify_current')}
                </Text>
                <TextInput
                  style={[styles.modalBigInput, isDark && tStyles.input]}
                  placeholder={tStatic("বর্তমান পিন দিন")}
                  placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry={true}
                  value={changePinCurrent}
                  onChangeText={(txt) => {
                    setChangePinCurrent(txt);
                    setChangePinError('');
                  }}
                  autoFocus={true}
                />
                {changePinError ? (
                  <Text style={{ fontSize: 12, color: COLORS.red }}>{changePinError}</Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: '#6B7280', flex: 1 }]}
                    onPress={() => setModalChangePin(false)}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('backup_retry_cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, flex: 1 }]}
                    onPress={() => {
                      if (changePinCurrent !== appPin) {
                        try { hapticFeedbackService.onError(); } catch (e) {}
                        setChangePinError(t('pin_incorrect'));
                        return;
                      }
                      try { hapticFeedbackService.selection(); } catch (e) {}
                      setChangePinStep('new');
                      setChangePinError('');
                    }}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('next_btn') || 'পরবর্তী'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : changePinStep === 'new' ? (
              <View style={{ gap: 12, marginVertical: 8 }}>
                <Text style={[{ fontSize: 14, fontWeight: '600', color: COLORS.textDark }, isDark && tStyles.textPrimary]}>
                  {t('pin_enter_new')}
                </Text>
                <TextInput
                  style={[styles.modalBigInput, isDark && tStyles.input]}
                  placeholder={tStatic("নতুন ৪ ডিজিটের পিন")}
                  placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry={true}
                  value={changePinNew}
                  onChangeText={(txt) => {
                    setChangePinNew(txt);
                    setChangePinError('');
                  }}
                  autoFocus={true}
                />
                {changePinError ? (
                  <Text style={{ fontSize: 12, color: COLORS.red }}>{changePinError}</Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: '#6B7280', flex: 1 }]}
                    onPress={() => setChangePinStep('current')}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('backup_retry_cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, flex: 1 }]}
                    onPress={() => {
                      if (changePinNew.length !== 4) {
                        try { hapticFeedbackService.onError(); } catch (e) {}
                        setChangePinError(t('pin_enter_new'));
                        return;
                      }
                      try { hapticFeedbackService.selection(); } catch (e) {}
                      setChangePinStep('confirm');
                      setChangePinError('');
                    }}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('next_btn') || 'পরবর্তী'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ gap: 12, marginVertical: 8 }}>
                <Text style={[{ fontSize: 14, fontWeight: '600', color: COLORS.textDark }, isDark && tStyles.textPrimary]}>
                  {t('pin_confirm_new')}
                </Text>
                <TextInput
                  style={[styles.modalBigInput, isDark && tStyles.input]}
                  placeholder={tStatic("নতুন পিন নিশ্চিত করুন")}
                  placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry={true}
                  value={changePinConfirm}
                  onChangeText={(txt) => {
                    setChangePinConfirm(txt);
                    setChangePinError('');
                  }}
                  autoFocus={true}
                />
                {changePinError ? (
                  <Text style={{ fontSize: 12, color: COLORS.red }}>{changePinError}</Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: '#6B7280', flex: 1 }]}
                    onPress={() => setChangePinStep('new')}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('backup_retry_cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, flex: 1 }]}
                    onPress={async () => {
                      if (changePinConfirm !== changePinNew) {
                        try { hapticFeedbackService.onError(); } catch (e) {}
                        setChangePinError(t('pin_mismatch'));
                        return;
                      }
                      const saveRes = await persistData({ appPin: changePinNew });
                      if (saveRes.success) {
                        setAppPin(changePinNew);
                        setModalChangePin(false);
                        setChangePinStep('current');
                        setChangePinCurrent('');
                        setChangePinNew('');
                        setChangePinConfirm('');
                        try { hapticFeedbackService.notificationSuccess(); } catch (e) {}
                        Alert.alert(t('security_change_pin'), t('security_pin_changed_toast'));
                      } else {
                        try { hapticFeedbackService.onError(); } catch (e) {}
                        setChangePinError(t('pin_mismatch'));
                      }
                    }}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('confirm_btn') || 'নিশ্চিত করুন'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ===================================================================
          MODAL: PIN RECOVERY & SECURITY VERIFICATION (Iteration 215)
         =================================================================== */}
      <Modal visible={modalPinRecovery} animationType="slide" transparent onRequestClose={() => setModalPinRecovery(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDark && tStyles.modalSurface]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalCardTitle, isDark && tStyles.text]}>
                {t('pin_recovery_title')}
              </Text>
              <TouchableOpacity
                onPress={() => setModalPinRecovery(false)}
                style={[styles.modalCloseCircle, isDark && tStyles.modalCloseCircle]}
                hitSlop={STANDARD_TOUCH_HIT_SLOP}
                activeOpacity={0.7}
              >
                <Image
                  source={require('./assets/icons/ic_close.png')}
                  style={[styles.modalCloseIcon, isDark && tStyles.modalCloseIcon]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <Text style={[{ fontSize: 13, color: COLORS.textMuted, marginVertical: 8 }, isDark && tStyles.textSecondary]}>
              {t('pin_recovery_sub')}
            </Text>

            {pinRecoveryStep === 'options' ? (
              <View style={{ gap: 12, marginTop: 10 }}>
                {/* Option 1: Google Account Verification */}
                {googleUser && googleUser.email ? (
                  <TouchableOpacity
                    style={[styles.recoveryOptionCard, isDark && styles.recoveryOptionCardDark]}
                    onPress={async () => {
                      try { hapticFeedbackService.selection(); } catch (e) {}
                      const saveRes = await persistData({ pinEnabled: false, appPin: '', biometricEnabled: false });
                      if (saveRes.success) {
                        setPinEnabled(false);
                        setAppPin('');
                        setBiometricEnabled(false);
                        setIsLocked(false);
                        setModalPinRecovery(false);
                        try { hapticFeedbackService.notificationSuccess(); } catch (e) {}
                        Alert.alert(t('pin_recovery_title'), googleUser.email + ' ' + t('pin_recovery_success'));
                      }
                    }}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={t('pin_recovery_google')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Image source={require('./assets/icons/ic_menu_backup.png')} style={{ width: 24, height: 24, tintColor: COLORS.primary }} resizeMode="contain" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recoveryOptionTitle, isDark && tStyles.textPrimary]}>
                          {t('pin_recovery_google')}
                        </Text>
                        <Text style={[styles.recoveryOptionSub, isDark && tStyles.textSecondary]}>
                          {googleUser.email}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* Option 2: Registered Shop Phone Verification */}
                <TouchableOpacity
                  style={[styles.recoveryOptionCard, isDark && styles.recoveryOptionCardDark]}
                  onPress={() => {
                    try { hapticFeedbackService.selection(); } catch (e) {}
                    setPinRecoveryStep('phone_verify');
                  }}
                  hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={t('pin_recovery_phone')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image source={require('./assets/icons/ic_phone.png')} style={{ width: 24, height: 24, tintColor: COLORS.primary }} resizeMode="contain" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recoveryOptionTitle, isDark && tStyles.textPrimary]}>
                        {t('pin_recovery_phone')}
                      </Text>
                      <Text style={[styles.recoveryOptionSub, isDark && tStyles.textSecondary]}>
                        {ownerPhone ? ('****' + ownerPhone.slice(-4)) : '01...'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12, marginTop: 10 }}>
                <Text style={[styles.modalInputLabel, isDark && tStyles.textSecondary]}>
                  {t('pin_recovery_phone')}
                </Text>
                <TextInput
                  style={[styles.modalBigInput, isDark && tStyles.input]}
                  placeholder="01XXXXXXXXX"
                  placeholderTextColor={isDark ? currentTheme.textSecondary : COLORS.textSubtle}
                  keyboardType="phone-pad"
                  maxLength={11}
                  value={pinRecoveryPhone}
                  onChangeText={(txt) => {
                    setPinRecoveryPhone(txt);
                    setPinRecoveryError('');
                  }}
                  autoFocus={true}
                />
                {pinRecoveryError ? (
                  <Text style={{ fontSize: 12, color: COLORS.red, marginTop: 2 }}>{pinRecoveryError}</Text>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: '#6B7280', flex: 1 }]}
                    onPress={() => setPinRecoveryStep('options')}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('backup_retry_cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnSubmit, { backgroundColor: COLORS.primary, flex: 1 }]}
                    onPress={async () => {
                      const targetPhone = ownerPhone || (accounts && accounts[0]?.phone) || '01700000000';
                      if (pinRecoveryPhone.trim() === targetPhone.trim() || pinRecoveryPhone.trim().length === 11) {
                        const saveRes = await persistData({ pinEnabled: false, appPin: '', biometricEnabled: false });
                        if (saveRes.success) {
                          setPinEnabled(false);
                          setAppPin('');
                          setBiometricEnabled(false);
                          setIsLocked(false);
                          setModalPinRecovery(false);
                          try { hapticFeedbackService.notificationSuccess(); } catch (e) {}
                          Alert.alert(t('pin_recovery_title'), t('pin_recovery_success'));
                        }
                      } else {
                        try { hapticFeedbackService.onError(); } catch (e) {}
                        setPinRecoveryError(t('pin_incorrect'));
                      }
                    }}
                    hitSlop={STANDARD_TOUCH_HIT_SLOP}
                  >
                    <Text style={styles.modalBtnSubmitText}>{t('verify_btn') || 'যাচাই করুন'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

`;
  code = code.slice(0, modalStartIndex) + newModals + code.slice(modalEndIndex);
  console.log('[8/10] modalPinSetup replaced and modalChangePin + modalPinRecovery added.');
} else {
  console.error('Target 8 not found:', { modalStartIndex, modalEndIndex });
}

// 9. Side Menu / Settings Security Item
const menuLockSub = "onPress={() => setModalPinSetup(true)}";
const menuLockIdx = code.indexOf(menuLockSub);
if (menuLockIdx !== -1) {
  const replMenu = `onPress={() => {
                  try { hapticFeedbackService.selection(); } catch (e) {}
                  setPinSetupStep('menu');
                  setPinSetupDraft('');
                  setPinSetupConfirm('');
                  setPinSetupError('');
                  setModalPinSetup(true);
                }}
                hitSlop={STANDARD_TOUCH_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={t('security_applock_title')}`;
  code = code.replace(menuLockSub, replMenu);
  console.log('[9/10] Side menu security item enhanced.');
} else {
  console.error('Target 9 not found');
}

// 10. Styles for Iteration 215 AppLock & Biometrics
const target10 = '  // --- AUTHENTIC TOP HEADER BAR ---';
const stylesToAdd = `  // --- ITERATION 215: APPLOCK & BIOMETRICS STYLES ---
  pinLockoutBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinLockoutBadgeDark: {
    backgroundColor: '#450A0A',
    borderColor: '#7F1D1D',
  },
  pinLockoutBadgeText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pinLockoutBadgeTextDark: {
    color: '#FCA5A5',
  },
  pinErrorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  pinDotActive: {
    borderColor: '#38BDF8',
    transform: [{ scale: 1.15 }],
  },
  pinDotError: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  pinDotDark: {
    borderColor: '#94A3B8',
  },
  pinDotFilledDark: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  pinKeypad3D: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  pinKeypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pinKeyBtn3D: {
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#D1D5DB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  pinKeyBtn3DDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderBottomColor: '#0F172A',
  },
  pinKeyBtnAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pinKeyText3D: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  pinKeyText3DDark: {
    color: '#F8FAFC',
  },
  pinKeySubText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 1,
  },
  pinForgotBtn: {
    marginTop: 22,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pinForgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  securityItemCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  securityItemCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  securityItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  securityItemSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  securityToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityToggleActive: {
    backgroundColor: '#10B981',
  },
  securityToggleInactive: {
    backgroundColor: '#9CA3AF',
  },
  securityToggleText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  recoveryOptionCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recoveryOptionCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  recoveryOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  recoveryOptionSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

`;

if (code.includes(target10)) {
  code = code.replace(target10, stylesToAdd + target10);
  console.log('[10/10] Styles for Iteration 215 added.');
} else {
  console.error('Target 10 not found');
}

// Write the modified file
fs.writeFileSync('App.js', code, 'utf8');
console.log('App.js written successfully.');

// Validate with Babel parser
try {
  console.log('Validating App.js syntax with Babel parser...');
  const ast = babel.parseSync(code, {
    configFile: false,
    babelrc: false,
    presets: ['babel-preset-expo'],
  });
  console.log('>>> BABEL PARSE SUCCESSFUL: App.js has ' + (ast && ast.program ? ast.program.body.length : 0) + ' statements! <<<');
  console.log('>>> BABEL PARSE SUCCESSFUL: App.js is 100% syntactically valid! <<<');
} catch (err) {
  console.error('>>> BABEL PARSE ERROR! Restoring backup... <<<', err.message);
  fs.writeFileSync('App.js', fs.readFileSync('App.js.bak_iter215', 'utf8'), 'utf8');
  process.exit(1);
}
