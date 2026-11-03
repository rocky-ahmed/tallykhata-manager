const fs = require('fs');
const babel = require('@babel/core');

let code = fs.readFileSync('App.js', 'utf8');

// 1. Add ActivityIndicator to react-native imports if not present
if (!code.includes('ActivityIndicator,')) {
  const target1 = '  Clipboard,\n} from \'react-native\';';
  const repl1 = '  Clipboard,\n  ActivityIndicator,\n} from \'react-native\';';
  if (code.includes(target1)) {
    code = code.replace(target1, repl1);
    console.log('[1/9] ActivityIndicator import added.');
  } else {
    console.error('Target 1 not found');
  }
}

// 2. Add cloudBackupStage and backupRetryState hooks
const target2 = '  const [cloudBackupMetadata, setCloudBackupMetadata] = useState(null);\n  const [cloudBackupStatus, setCloudBackupStatus] = useState(\'idle\'); // \'idle\' | \'checking\' | \'backing_up\' | \'restoring\' | \'success\' | \'error\'\n  const [isOffline, setIsOffline] = useState(false);\n  const [unsyncedCount, setUnsyncedCount] = useState(0);';
const repl2 = '  const [cloudBackupMetadata, setCloudBackupMetadata] = useState(null);\n  const [cloudBackupStatus, setCloudBackupStatus] = useState(\'idle\'); // \'idle\' | \'checking\' | \'compressing\' | \'uploading\' | \'verifying\' | \'retrying\' | \'backing_up\' | \'restoring\' | \'success\' | \'error\'\n  const [cloudBackupStage, setCloudBackupStage] = useState(\'idle\'); // \'idle\' | \'checking\' | \'compressing\' | \'uploading\' | \'verifying\' | \'retrying\' | \'success\' | \'error\'\n  const [backupRetryState, setBackupRetryState] = useState({\n    active: false,\n    attempt: 0,\n    maxAttempts: 3,\n    countdown: 0,\n    errorMsg: \'\',\n    isTransient: false,\n  });\n  const backupRetryTimerRef = useRef(null);\n  const [isOffline, setIsOffline] = useState(false);\n  const [unsyncedCount, setUnsyncedCount] = useState(0);';
if (code.includes(target2)) {
  code = code.replace(target2, repl2);
  console.log('[2/9] State hooks updated.');
} else {
  console.error('Target 2 not found');
}

// 3. Update BackHandler for modalBackupRestore
const target3 = '      if (modalBackupRestore) { setModalBackupRestore(false); return true; }';
const repl3 = '      if (modalBackupRestore) {\n        if (backupRetryTimerRef.current) {\n          clearInterval(backupRetryTimerRef.current);\n          backupRetryTimerRef.current = null;\n        }\n        if (backupRetryState.active) {\n          setBackupRetryState({ active: false, attempt: 0, maxAttempts: 3, countdown: 0, errorMsg: \'\', isTransient: false });\n          setCloudBackupStatus(\'idle\');\n          setCloudBackupStage(\'idle\');\n        }\n        setModalBackupRestore(false);\n        return true;\n      }';
if (code.includes(target3)) {
  code = code.replace(target3, repl3);
  console.log('[3/9] BackHandler cleanup updated.');
} else {
  console.error('Target 3 not found');
}

// 4. Update executeCloudBackup & add retry/countdown handlers
const target4Start = '  const executeCloudBackup = async () => {\n    let latestMM = moneyManagerState;';
const target4End = '    return backupRes;\n  };\n\n  const handleCloudBackupNow = async () => {';

const idx4Start = code.indexOf(target4Start);
const idx4End = code.indexOf(target4End);
if (idx4Start !== -1 && idx4End !== -1) {
  const target4 = code.substring(idx4Start, idx4End + '    return backupRes;\n  };'.length);

  const repl4 = `  useEffect(() => {
    return () => {
      if (backupRetryTimerRef.current) {
        clearInterval(backupRetryTimerRef.current);
        backupRetryTimerRef.current = null;
      }
    };
  }, []);

  const handleCancelBackupRetry = () => {
    if (backupRetryTimerRef.current) {
      clearInterval(backupRetryTimerRef.current);
      backupRetryTimerRef.current = null;
    }
    try {
      hapticFeedbackService.selection();
    } catch (e) {}
    setBackupRetryState({
      active: false,
      attempt: 0,
      maxAttempts: 3,
      countdown: 0,
      errorMsg: '',
      isTransient: false,
    });
    setCloudBackupStatus('idle');
    setCloudBackupStage('idle');
  };

  const handleRetryCloudBackupNow = (isManual = true) => {
    if (backupRetryTimerRef.current) {
      clearInterval(backupRetryTimerRef.current);
      backupRetryTimerRef.current = null;
    }
    // Wire tactile haptic feedback: impactMedium() on retry attempt
    try {
      hapticFeedbackService.impactMedium();
    } catch (e) {}
    const currentAttempt = (backupRetryState && backupRetryState.attempt) || 1;
    const maxAttempts = (backupRetryState && backupRetryState.maxAttempts) || 3;
    setBackupRetryState((prev) => ({ ...prev, countdown: 0, active: true, attempt: currentAttempt }));
    setCloudBackupStatus('retrying');
    setCloudBackupStage('retrying');
    return executeCloudBackup({ attempt: currentAttempt + 1, maxAttempts, isRetry: true });
  };

  const startBackupRetryCountdown = (attempt = 1, maxAttempts = 3, errorMsg = '') => {
    if (backupRetryTimerRef.current) {
      clearInterval(backupRetryTimerRef.current);
      backupRetryTimerRef.current = null;
    }
    const backoffSeconds = Math.min(10, Math.pow(2, attempt) + 1);
    setCloudBackupStatus('retrying');
    setCloudBackupStage('retrying');
    setBackupRetryState({
      active: true,
      attempt,
      maxAttempts,
      countdown: backoffSeconds,
      errorMsg,
      isTransient: true,
    });

    let currentSec = backoffSeconds;
    backupRetryTimerRef.current = setInterval(() => {
      currentSec -= 1;
      if (currentSec > 0) {
        setBackupRetryState((prev) => ({ ...prev, countdown: currentSec }));
      } else {
        if (backupRetryTimerRef.current) {
          clearInterval(backupRetryTimerRef.current);
          backupRetryTimerRef.current = null;
        }
        // Wire tactile haptic feedback: impactMedium() on retry attempt
        try {
          hapticFeedbackService.impactMedium();
        } catch (e) {}
        executeCloudBackup({ attempt: attempt + 1, maxAttempts, isRetry: true });
      }
    }, 1000);
  };

  const executeCloudBackup = async (retryOpts = {}) => {
    const currentAttempt = (retryOpts && retryOpts.attempt) || 1;
    const maxAttempts = (retryOpts && retryOpts.maxAttempts) || 3;
    const isRetry = Boolean(retryOpts && retryOpts.isRetry);

    if (isRetry) {
      setCloudBackupStatus('retrying');
      setCloudBackupStage('retrying');
    }

    // Step 1: Compressing ('কম্প্রেস হচ্ছে...')
    setCloudBackupStatus('compressing');
    setCloudBackupStage('compressing');

    let latestMM = moneyManagerState;
    try {
      if (storageRepository.writeQueue) {
        await Promise.resolve(storageRepository.writeQueue).catch(() => {});
      }
      const persisted = await AsyncStorage.getItem(MM_STORAGE_KEY);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        if (parsed && typeof parsed === 'object') {
          const inMemTime = (moneyManagerState && moneyManagerState.updatedAt) ? new Date(moneyManagerState.updatedAt).getTime() : 0;
          const diskTime = (parsed && parsed.updatedAt) ? new Date(parsed.updatedAt).getTime() : 0;
          if (diskTime > inMemTime && diskTime > 0) {
            latestMM = parsed;
          } else if (inMemTime >= diskTime && inMemTime > 0) {
            latestMM = moneyManagerState;
          } else {
            latestMM = moneyManagerState || parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[executeCloudBackup] Failed to read persisted Money Manager state:', e);
    }

    // Step 2: Uploading ('আপলোড হচ্ছে...')
    setCloudBackupStatus('uploading');
    setCloudBackupStage('uploading');

    let wasGlitchTransient = false;

    const backupRes = await orchestrateCloudBackup({
      storageRepository,
      driveService: googleDriveBackupService,
      getAccessToken: getValidGoogleAccessToken,
      googleUser,
      existingFileId: cloudBackupMetadata ? cloudBackupMetadata.fileId : null,
      extraData: {
        moneyManager: latestMM,
        preferences: { theme: appTheme, language: appLanguage },
      },
      onStatusChange: (status) => {
        if (status === 'backing_up') {
          setCloudBackupStatus('uploading');
          setCloudBackupStage('uploading');
        } else if (status === 'verifying') {
          setCloudBackupStatus('verifying');
          setCloudBackupStage('verifying');
        } else if (status === 'success') {
          setCloudBackupStatus('success');
          setCloudBackupStage('success');
        }
      },
      onMetaUpdated: async (meta) => {
        setCloudBackupMetadata(meta);
        await persistData({ cloudBackupMetadata: meta });
      },
      alertFn: (title, message) => {
        if (title && (title.includes('সফল') || title.includes('সিঙ্ক') || title.includes('ব্যাকআপ'))) {
          Alert.alert(tStatic("ডাটা সিঙ্ক সম্পন্ন হয়েছে"), message);
        } else if (title && title.includes('ত্রুটি')) {
          // Suppress abrupt failure alert on transient network glitch
          const isTransientMsg = message && (
            message.toLowerCase().includes('network') ||
            message.toLowerCase().includes('timeout') ||
            message.toLowerCase().includes('fetch') ||
            message.toLowerCase().includes('offline') ||
            message.toLowerCase().includes('socket') ||
            message.toLowerCase().includes('econnreset') ||
            message.toLowerCase().includes('429') ||
            message.toLowerCase().includes('500') ||
            message.toLowerCase().includes('502') ||
            message.toLowerCase().includes('503') ||
            message.toLowerCase().includes('504') ||
            message.toLowerCase().includes('নেটওয়ার্ক') ||
            message.toLowerCase().includes('ইন্টারনেট') ||
            message.toLowerCase().includes('ধীরগতি') ||
            message.toLowerCase().includes('সংযোগ')
          );
          if (isTransientMsg) {
            wasGlitchTransient = true;
          } else {
            Alert.alert(title, message);
          }
        } else {
          Alert.alert(title, message);
        }
      },
    });

    if (backupRes && backupRes.success) {
      // Wire tactile haptic feedback: notificationSuccess() on retry recovery
      try {
        hapticFeedbackService.notificationSuccess();
      } catch (e) {}

      if (backupRetryTimerRef.current) {
        clearInterval(backupRetryTimerRef.current);
        backupRetryTimerRef.current = null;
      }
      setBackupRetryState({
        active: false,
        attempt: 0,
        maxAttempts: 3,
        countdown: 0,
        errorMsg: '',
        isTransient: false,
      });
      setCloudBackupStatus('success');
      setCloudBackupStage('success');

      try {
        const unsynced = storageRepository.getUnsyncedRecords();
        for (const col of Object.keys(unsynced)) {
          const ids = (unsynced[col] || []).map((r) => r.id).filter(Boolean);
          if (ids.length > 0) {
            await storageRepository.markRecordsSynced(col, ids);
          }
        }
        setUnsyncedCount(0);
        setIsOffline(false);
      } catch (syncErr) {
        console.warn('[executeCloudBackup] markRecordsSynced error:', syncErr);
      }
      return backupRes;
    } else {
      // Determine if error is a transient glitch
      const isTransient = wasGlitchTransient || Boolean(
        (backupRes && backupRes.userFacingMessage && (
          backupRes.userFacingMessage.toLowerCase().includes('network') ||
          backupRes.userFacingMessage.toLowerCase().includes('timeout') ||
          backupRes.userFacingMessage.toLowerCase().includes('fetch') ||
          backupRes.userFacingMessage.toLowerCase().includes('socket') ||
          backupRes.userFacingMessage.toLowerCase().includes('offline') ||
          backupRes.userFacingMessage.toLowerCase().includes('নেটওয়ার্ক') ||
          backupRes.userFacingMessage.toLowerCase().includes('ইন্টারনেট') ||
          backupRes.userFacingMessage.toLowerCase().includes('ধীরগতি') ||
          backupRes.userFacingMessage.toLowerCase().includes('সংযোগ') ||
          backupRes.userFacingMessage.toLowerCase().includes('500') ||
          backupRes.userFacingMessage.toLowerCase().includes('502') ||
          backupRes.userFacingMessage.toLowerCase().includes('503') ||
          backupRes.userFacingMessage.toLowerCase().includes('504') ||
          backupRes.userFacingMessage.toLowerCase().includes('429') ||
          backupRes.userFacingMessage.toLowerCase().includes('408')
        )) ||
        (backupRes && backupRes.error && (
          backupRes.error.name === 'AbortError' ||
          (backupRes.error.code && ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED'].includes(backupRes.error.code))
        ))
      );

      if (isTransient && currentAttempt < maxAttempts) {
        // Show clean, reassuring retry state with countdown & backoff instead of abrupt failure alert
        startBackupRetryCountdown(
          currentAttempt,
          maxAttempts,
          (backupRes && backupRes.userFacingMessage) || tStatic("নেটওয়ার্ক সংযোগ বিঘ্নিত হয়েছে।")
        );
        return { success: false, retrying: true, attempt: currentAttempt, maxAttempts, isTransient: true };
      }

      if (backupRetryTimerRef.current) {
        clearInterval(backupRetryTimerRef.current);
        backupRetryTimerRef.current = null;
      }
      setBackupRetryState({
        active: false,
        attempt: currentAttempt,
        maxAttempts,
        countdown: 0,
        errorMsg: (backupRes && backupRes.userFacingMessage) || '',
        isTransient,
      });
      setCloudBackupStatus('error');
      setCloudBackupStage('error');

      try {
        hapticFeedbackService.onError();
      } catch (e) {}

      if (isTransient) {
        setIsOffline(true);
        Alert.alert(
          tStatic("সিঙ্ক সাময়িক ব্যর্থ"),
          tStatic("বারংবার চেষ্টার পরেও ধীরগতির নেটওয়ার্কের কারণে ব্যাকআপ সম্পন্ন করা যায়নি। আপনার স্থানীয় ডাটা অক্ষত রয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।")
        );
      }
    }

    return backupRes;
  };`;

  code = code.replace(target4, repl4);
  console.log('[4/9] executeCloudBackup & retry handlers updated.');
} else {
  console.error('Target 4 not found');
}

// 5. Update handleHeaderSyncPress
const target5 = '  const handleHeaderSyncPress = () => {\n    try {\n      hapticFeedbackService.selection();\n    } catch (e) {}\n    if (googleUser && googleUser.sub) {\n      handleCloudBackupNow();\n    } else {\n      setBackupJsonText(\'\');\n      setModalBackupRestore(true);\n    }\n  };';
const repl5 = '  const handleHeaderSyncPress = () => {\n    try {\n      hapticFeedbackService.selection();\n    } catch (e) {}\n    if (backupRetryState.active || cloudBackupStatus === \'retrying\' || cloudBackupStatus === \'compressing\' || cloudBackupStatus === \'uploading\') {\n      setBackupJsonText(\'\');\n      setModalBackupRestore(true);\n      return;\n    }\n    if (googleUser && googleUser.sub) {\n      handleCloudBackupNow();\n    } else {\n      setBackupJsonText(\'\');\n      setModalBackupRestore(true);\n    }\n  };';
if (code.includes(target5)) {
  code = code.replace(target5, repl5);
  console.log('[5/9] handleHeaderSyncPress updated.');
} else {
  console.error('Target 5 not found');
}

// 6. Update global registrations
const target6 = '    global.__tallykhataSetOffline = setIsOffline;\n    global.__tallykhataExecuteCloudBackup = executeCloudBackup;\n    global.__tallykhataSetUnsyncedCount = setUnsyncedCount;\n  }';
const repl6 = '    global.__tallykhataSetOffline = setIsOffline;\n    global.__tallykhataExecuteCloudBackup = executeCloudBackup;\n    global.__tallykhataSetUnsyncedCount = setUnsyncedCount;\n    global.__tallykhataCloudBackupStatus = cloudBackupStatus;\n    global.__tallykhataSetCloudBackupStatus = setCloudBackupStatus;\n    global.__tallykhataCloudBackupStage = cloudBackupStage;\n    global.__tallykhataSetCloudBackupStage = setCloudBackupStage;\n    global.__tallykhataBackupRetryState = backupRetryState;\n    global.__tallykhataSetBackupRetryState = setBackupRetryState;\n    global.__tallykhataHandleRetryCloudBackupNow = handleRetryCloudBackupNow;\n    global.__tallykhataHandleCancelBackupRetry = handleCancelBackupRetry;\n    global.__tallykhataStartBackupRetryCountdown = startBackupRetryCountdown;\n  }';
if (code.includes(target6)) {
  code = code.replace(target6, repl6);
  console.log('[6/9] Global registrations updated.');
} else {
  console.error('Target 6 not found');
}

// 7. Update Top Header Sync Button JSX
const target7Start = '            accessibilityLabel={\n              cloudBackupStatus === \'backing_up\' || cloudBackupStatus === \'checking\'';
const target7End = '                : tStatic("সিঙ্ক")}\n            </Text>\n          </TouchableOpacity>';

const idx7Start = code.indexOf(target7Start);
const idx7End = code.indexOf(target7End);
if (idx7Start !== -1 && idx7End !== -1) {
  const target7 = code.substring(idx7Start, idx7End + target7End.length);

  const repl7 = `accessibilityLabel={
              cloudBackupStatus === 'compressing'
                ? tStatic("ডাটা কম্প্রেস হচ্ছে")
                : cloudBackupStatus === 'uploading'
                ? tStatic("গুগল ড্রাইভে আপলোড হচ্ছে")
                : (cloudBackupStatus === 'retrying' || backupRetryState.active)
                ? tStatic("পুনরায় সিঙ্ক চেষ্টা করা হচ্ছে")
                : (cloudBackupStatus === 'backing_up' || cloudBackupStatus === 'checking')
                ? tStatic("ক্লাউড সিঙ্ক চলছে")
                : isOffline
                ? tStatic("অফলাইন মোড")
                : unsyncedCount > 0
                ? \`\${toBengaliNumber(unsyncedCount)} টি হিসাব সিঙ্ক বাকি\`
                : tStatic("সকল ডাটা সুরক্ষিত ও সিঙ্কড")
            }
          >
            <View style={{ position: 'relative' }}>
              <Image
                source={require('./assets/icons/ic_cloud.png')}
                style={[
                  styles.headerWhiteActionIcon,
                  { tintColor: '#FFFFFF' },
                  isOffline && { opacity: 0.65 },
                ]}
                resizeMode="contain"
              />
              {unsyncedCount > 0 && !backupRetryState.active && (
                <View style={[styles.headerBadgeWhite, { backgroundColor: '#FEF3C7', borderColor: '#D97706' }]}>
                  <Text style={[styles.headerBadgeWhiteText, { color: '#92400E', fontWeight: 'bold', fontSize: 10 }]}>
                    {unsyncedCount > 9 ? '৯+' : toBengaliNumber(unsyncedCount)}
                  </Text>
                </View>
              )}
              {backupRetryState.active && (
                <View style={[styles.headerBadgeWhite, { backgroundColor: '#FDE68A', borderColor: '#B45309', paddingHorizontal: 3 }]}>
                  <Text style={{ fontSize: 8, color: '#92400E', fontWeight: 'bold' }}>⟳</Text>
                </View>
              )}
              {unsyncedCount === 0 && cloudBackupMetadata && !isOffline && !backupRetryState.active && (
                <View style={[styles.headerBadgeWhite, { backgroundColor: '#DCFCE7', borderColor: '#16A34A', paddingHorizontal: 3 }]}>
                  <Text style={{ fontSize: 8, color: '#166534', fontWeight: 'bold' }}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerActionLabelWhite}>
              {cloudBackupStatus === 'compressing'
                ? tStatic("কম্প্রেস...")
                : cloudBackupStatus === 'uploading'
                ? tStatic("আপলোড...")
                : (cloudBackupStatus === 'retrying' || backupRetryState.active)
                ? tStatic("পুনরায় চেষ্টা...")
                : (cloudBackupStatus === 'backing_up' || cloudBackupStatus === 'checking')
                ? tStatic("সিঙ্ক...")
                : isOffline
                ? tStatic("অফলাইন")
                : unsyncedCount > 0
                ? tStatic("সিঙ্ক বাকি")
                : tStatic("সিঙ্ক")}
            </Text>
          </TouchableOpacity>`;

  code = code.replace(target7, repl7);
  console.log('[7/9] Header Sync Button JSX updated.');
} else {
  console.error('Target 7 not found');
}

// 8. Update modalBackupRestore controls
const target8Start = '                  {/* 5 ALWAYS VISIBLE CORE ACTIONS (PHASE 4 SPECIFICATION) */}\n                  <View style={styles.cloudControlsSection}>\n                    <SectionHeader title={tStatic("ক্লাউড ব্যাকআপ ও রিস্টোর অপশন")} />';
const target8End = '                      <Image source={require(\'./assets/icons/arrow_right_red.png\')} style={{ width: 14, height: 14 }} resizeMode="contain" />\n                    </TouchableOpacity>';

const idx8Start = code.indexOf(target8Start);
const idx8End = code.indexOf(target8End);
if (idx8Start !== -1 && idx8End !== -1) {
  const target8 = code.substring(idx8Start, idx8End + target8End.length);

  const repl8 = `                  {/* 5 ALWAYS VISIBLE CORE ACTIONS (PHASE 4 SPECIFICATION) */}
                  <View style={styles.cloudControlsSection}>
                    <SectionHeader title={tStatic("ক্লাউড ব্যাকআপ ও রিস্টোর অপশন")} />

                    {/* Reassuring Retry State Card (Iteration 214) */}
                    {backupRetryState.active && (
                      <View
                        style={[
                          styles.backupRetryCard,
                          {
                            backgroundColor: isDark ? '#2A1E0B' : '#FFFBEB',
                            borderColor: isDark ? '#B45309' : '#F59E0B',
                          },
                        ]}
                        accessibilityRole="alert"
                        accessibilityLabel={tStatic("পুনরায় চেষ্টা হচ্ছে")}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <AppIcon
                            source={require('./assets/icons/ic_cloud.png')}
                            variant="warning"
                            shape="circle"
                            size={20}
                            containerSize={36}
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.backupRetryTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                              {tStatic("পুনরায় চেষ্টা হচ্ছে...")}
                            </Text>
                            <Text style={[styles.backupRetrySubtitle, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                              {tStatic("চেষ্টা:")} {toBengaliNumber(backupRetryState.attempt || 1)} / {toBengaliNumber(backupRetryState.maxAttempts || 3)}
                              {backupRetryState.countdown > 0 ? \` • \${toBengaliNumber(backupRetryState.countdown)} সেকেন্ড পর চেষ্টা\` : ''}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.backupRetryDesc, { color: isDark ? '#F3F4F6' : '#374151', marginBottom: 12 }]}>
                          {tStatic("নেটওয়ার্ক সংযোগ কিছুটা ধীরগতির। ডাটা নিরাপদ রাখতে ব্যাকঅফ সহ পুনরায় ক্লাউড আপলোডের চেষ্টা করা হচ্ছে...")}
                        </Text>

                        {/* Retry Buttons */}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            style={[styles.backupRetryActionBtn, { backgroundColor: '#B45309', flex: 1 }]}
                            onPress={() => handleRetryCloudBackupNow(true)}
                            hitSlop={STANDARD_TOUCH_HIT_SLOP}
                            accessibilityRole="button"
                            accessibilityLabel={tStatic("এখনই পুনরায় চেষ্টা করুন")}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.backupRetryActionBtnText}>{tStatic("এখনই চেষ্টা করুন")}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.backupRetryCancelBtn,
                              {
                                backgroundColor: isDark ? currentTheme.cardBgElevated : '#F3F4F6',
                                borderColor: isDark ? currentTheme.cardBorder : '#D1D5DB',
                                flex: 0.8,
                              },
                            ]}
                            onPress={handleCancelBackupRetry}
                            hitSlop={STANDARD_TOUCH_HIT_SLOP}
                            accessibilityRole="button"
                            accessibilityLabel={tStatic("পুনরায় চেষ্টা বাতিল করুন")}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.backupRetryCancelBtnText, { color: isDark ? currentTheme.textSecondary : '#4B5563' }]}>
                              {tStatic("বাতিল")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Progressive Upload Feedback Card (Iteration 214) */}
                    {(cloudBackupStatus === 'compressing' || cloudBackupStatus === 'uploading' || cloudBackupStatus === 'verifying' || cloudBackupStatus === 'backing_up') && !backupRetryState.active && (
                      <View
                        style={[
                          styles.backupProgressCard,
                          {
                            backgroundColor: isDark ? '#062C1E' : '#ECFDF5',
                            borderColor: isDark ? '#059669' : '#A7F3D0',
                          },
                        ]}
                        accessibilityRole="progressbar"
                        accessibilityLabel={
                          cloudBackupStatus === 'compressing'
                            ? tStatic("ডাটা কম্প্রেস হচ্ছে")
                            : cloudBackupStatus === 'uploading'
                            ? tStatic("গুগল ড্রাইভে আপলোড হচ্ছে")
                            : tStatic("ক্লাউড ব্যাকআপ যাচাই হচ্ছে")
                        }
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <ActivityIndicator size="small" color="#059669" style={{ marginRight: 10 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.backupProgressTitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                              {cloudBackupStatus === 'compressing'
                                ? tStatic("কম্প্রেস হচ্ছে...")
                                : cloudBackupStatus === 'uploading'
                                ? tStatic("আপলোড হচ্ছে...")
                                : tStatic("যাচাই হচ্ছে...")}
                            </Text>
                            <Text style={[styles.backupProgressSubtitle, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                              {cloudBackupStatus === 'compressing'
                                ? tStatic("লোকাল ডাটা এনক্রিপ্ট ও জিপ কম্প্রেস করা হচ্ছে...")
                                : cloudBackupStatus === 'uploading'
                                ? tStatic("গুগল ড্রাইভ ক্লাউডে ফাইল আপলোড হচ্ছে...")
                                : tStatic("আপলোডকৃত ব্যাকআপের চেকসাম ও তথ্য যাচাই হচ্ছে...")}
                            </Text>
                          </View>
                        </View>

                        {/* Visual Stepper Pills */}
                        <View style={styles.backupStepperRow}>
                          <View style={[styles.backupStepPill, { backgroundColor: '#047857' }]}>
                            <Text style={styles.backupStepPillText}>১. {tStatic("কম্প্রেস")}</Text>
                          </View>
                          <View style={[styles.backupStepLine, { backgroundColor: (cloudBackupStatus === 'uploading' || cloudBackupStatus === 'verifying') ? '#047857' : (isDark ? '#064E3B' : '#D1D5DB') }]} />
                          <View style={[styles.backupStepPill, { backgroundColor: (cloudBackupStatus === 'uploading' || cloudBackupStatus === 'verifying') ? '#047857' : (isDark ? '#064E3B' : '#E5E7EB') }]}>
                            <Text style={[styles.backupStepPillText, { color: (cloudBackupStatus === 'uploading' || cloudBackupStatus === 'verifying') ? '#FFFFFF' : (isDark ? '#6EE7B7' : '#6B7280') }]}>
                              ২. {tStatic("আপলোড")}
                            </Text>
                          </View>
                          <View style={[styles.backupStepLine, { backgroundColor: cloudBackupStatus === 'verifying' ? '#047857' : (isDark ? '#064E3B' : '#D1D5DB') }]} />
                          <View style={[styles.backupStepPill, { backgroundColor: cloudBackupStatus === 'verifying' ? '#047857' : (isDark ? '#064E3B' : '#E5E7EB') }]}>
                            <Text style={[styles.backupStepPillText, { color: cloudBackupStatus === 'verifying' ? '#FFFFFF' : (isDark ? '#6EE7B7' : '#6B7280') }]}>
                              ৩. {tStatic("যাচাই")}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* CONTROL 0: লাইভ সিনথেটিক ভেরিফিকেশন (Google Drive E2E) */}
                    <TouchableOpacity
                      style={[styles.cloudControlCard, { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }]}
                      onPress={handleRunLiveSyntheticVerification}
                      disabled={cloudBackupStatus === 'backing_up' || cloudBackupStatus === 'compressing' || cloudBackupStatus === 'uploading' || cloudBackupStatus === 'verifying' || cloudBackupStatus === 'retrying'}
                      activeOpacity={0.75}
                    >
                      <AppIcon source={require('./assets/icons/ic_cloud.png')} variant="success" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#15803D' }]}>
                          {cloudBackupStatus === 'backing_up' ? tStatic("ভেরিফিকেশন চলছে...") : tStatic("লাইভ সিনথেটিক ভেরিফিকেশন (Drive E2E)")}
                        </Text>
                        <Text style={styles.cloudControlSub}>
                          {tStatic("আসল গুগল ড্রাইভে টেস্ট ফাইল আপলোড, ডাউনলোড ও চেকসাম অডিট যাচাই")}
                        </Text>
                      </View>
                      <Image source={require('./assets/icons/arrow_right.png')} style={{ width: 14, height: 14, tintColor: '#15803D' }} resizeMode="contain" />
                    </TouchableOpacity>

                    {/* CONTROL 1: এখন ব্যাকআপ নিন */}
                    <TouchableOpacity
                      style={[styles.cloudControlCard, { borderColor: '#FECACA' }]}
                      onPress={handleCloudBackupNow}
                      disabled={cloudBackupStatus === 'backing_up' || cloudBackupStatus === 'compressing' || cloudBackupStatus === 'uploading' || cloudBackupStatus === 'verifying' || cloudBackupStatus === 'retrying' || backupRetryState.active}
                      activeOpacity={0.75}
                    >
                      <AppIcon source={require('./assets/icons/grid_backup.png')} variant="danger" shape="circle" size={22} containerSize={44} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cloudControlTitle, { color: '#B81414' }]}>
                          {cloudBackupStatus === 'compressing'
                            ? tStatic("কম্প্রেস হচ্ছে...")
                            : cloudBackupStatus === 'uploading'
                            ? tStatic("আপলোড হচ্ছে...")
                            : (cloudBackupStatus === 'retrying' || backupRetryState.active)
                            ? tStatic("পুনরায় চেষ্টা হচ্ছে...")
                            : (cloudBackupStatus === 'backing_up' || cloudBackupStatus === 'checking')
                            ? tStatic("গুগল ড্রাইভে ব্যাকআপ হচ্ছে...")
                            : tStatic("এখন ব্যাকআপ নিন")}
                        </Text>
                        <Text style={styles.cloudControlSub}>
                          {unsyncedCount > 0
                            ? \`\${toBengaliNumber(unsyncedCount)} টি হিসাব ক্লাউডে ব্যাকআপ বাকি\`
                            : tStatic("খাতার সকল তথ্য ও লেনদেন গুগল ড্রাইভে নিরাপদ রাখুন")}
                        </Text>
                      </View>
                      <Image source={require('./assets/icons/arrow_right_red.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                    </TouchableOpacity>`;

  code = code.replace(target8, repl8);
  console.log('[8/9] modalBackupRestore controls updated.');
} else {
  console.error('Target 8 not found');
}

// 9. Add styles
const target9 = '  cloudControlTitle: {\n    fontSize: 14,\n    fontWeight: \'bold\',\n    color: \'#111827\',\n  },';
const repl9 = `  backupProgressCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  backupProgressTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  backupProgressSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  backupStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  backupStepPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  backupStepPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backupStepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  backupRetryCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  backupRetryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  backupRetrySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  backupRetryDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  backupRetryActionBtn: {
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backupRetryActionBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backupRetryCancelBtn: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  backupRetryCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cloudControlTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },`;

if (code.includes(target9)) {
  code = code.replace(target9, repl9);
  console.log('[9/9] Styles added.');
} else {
  console.error('Target 9 not found');
}

console.log('Verifying syntax with babel.parseSync...');
const ast = babel.parseSync(code, {
  configFile: false,
  babelrc: false,
  presets: ['babel-preset-expo'],
});
console.log('Babel parse verified! AST statements:', ast.program.body.length);

fs.writeFileSync('App.js', code, 'utf8');
console.log('App.js successfully updated and written.');
