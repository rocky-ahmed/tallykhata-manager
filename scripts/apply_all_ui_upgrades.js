const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

console.log('=== STARTING TALLYKHATA UI/UX UPGRADE SCRIPT ===');

// --- 1. UPDATE i18nService.js ---
const i18nPath = path.resolve('src/i18nService.js');
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

const bnNewKeys = `    // Money Manager Section Customization Engine
    mm_customization_engine: 'অ্যাডভান্সড কাস্টমাইজেশন ইঞ্জিন',
    mm_select_section: 'সেকশন নির্বাচন করুন',
    mm_sec_dashboard: 'ড্যাশবোর্ড',
    mm_sec_transactions: 'লেনদেন তালিকা',
    mm_sec_wallets: 'হিসাব ও ওয়ালেট',
    mm_sec_budgets: 'বাজেট',
    mm_sec_goals: 'সঞ্চয় লক্ষ্য',
    mm_sec_analytics: 'অ্যানালিটিক্স',
    mm_theme_presets: 'থিম প্রিসেট (এক ক্লিকে থিম)',
    mm_bg_tint: 'ব্যাকগ্রাউন্ড টিন্ট ও অপাসিটি',
    mm_text_scale: 'টাইপোগ্রাফি ও টেক্সট স্কেল',
    mm_scale_normal: 'স্বাভাবিক (১.০x)',
    mm_scale_medium: 'বড় (১.১x)',
    mm_scale_large: 'অতিরিক্ত বড় (১.২x)',
    mm_live_preview: 'লাইভ প্রিভিউ',
    mm_reset_section: 'এই সেকশন রিসেট',
    mm_reset_all_custom: 'সব কাস্টমাইজেশন রিসেট',
    mm_success_custom_saved: 'কাস্টমাইজেশন সফলভাবে সংরক্ষিত হয়েছে',`;

const enNewKeys = `    // Money Manager Section Customization Engine
    mm_customization_engine: 'Advanced Customization Engine',
    mm_select_section: 'Select Section',
    mm_sec_dashboard: 'Dashboard',
    mm_sec_transactions: 'Transactions',
    mm_sec_wallets: 'Wallets & Accounts',
    mm_sec_budgets: 'Budgets',
    mm_sec_goals: 'Savings Goals',
    mm_sec_analytics: 'Analytics',
    mm_theme_presets: 'Theme Presets',
    mm_bg_tint: 'Background Tint & Opacity',
    mm_text_scale: 'Typography & Text Scale',
    mm_scale_normal: 'Normal (1.0x)',
    mm_scale_medium: 'Medium (1.1x)',
    mm_scale_large: 'Large (1.2x)',
    mm_live_preview: 'Live Preview',
    mm_reset_section: 'Reset Section',
    mm_reset_all_custom: 'Reset All Customization',
    mm_success_custom_saved: 'Customization saved successfully',`;

if (!i18nContent.includes('mm_customization_engine')) {
  i18nContent = i18nContent.replace(`mm_preferences: 'পছন্দসমূহ',`, `mm_preferences: 'পছন্দসমূহ',\n${bnNewKeys}`);
  i18nContent = i18nContent.replace(`mm_preferences: 'Preferences',`, `mm_preferences: 'Preferences',\n${enNewKeys}`);
  fs.writeFileSync(i18nPath, i18nContent, 'utf8');
  console.log('✓ i18nService.js updated with customization translations.');
} else {
  console.log('- i18nService.js already has customization translations.');
}

// --- 2. UPDATE App.js ---
const appPath = path.resolve('App.js');
let appContent = fs.readFileSync(appPath, 'utf8');

// A. Fix Ledger Header Action Icons
const oldLedgerCall = `<AppIcon source={require("./assets/icons/ic_call.png")} variant="success" shape="circle" size={16} containerSize={32} />`;
const newLedgerCall = `<AppIcon source={require("./assets/icons/ic_call.png")} variant="success" shape="rounded" size={20} containerSize={38} />`;
if (appContent.includes(oldLedgerCall)) {
  appContent = appContent.replace(oldLedgerCall, newLedgerCall);
  console.log('✓ Fixed ledger call icon size.');
}

const oldLedgerEdit = `<AppIcon source={require("./assets/icons/ic_edit.png")} variant="neutral" shape="circle" size={16} containerSize={32} />`;
const newLedgerEdit = `<AppIcon source={require("./assets/icons/ic_edit.png")} variant="neutral" shape="rounded" size={20} containerSize={38} />`;
if (appContent.includes(oldLedgerEdit)) {
  appContent = appContent.replace(oldLedgerEdit, newLedgerEdit);
  console.log('✓ Fixed ledger edit icon size.');
}

const oldLedgerDelete = `<AppIcon source={require("./assets/icons/ic_delete.png")} variant="danger" shape="circle" size={16} containerSize={32} />`;
const newLedgerDelete = `<AppIcon source={require("./assets/icons/ic_delete.png")} variant="danger" shape="rounded" size={20} containerSize={38} />`;
if (appContent.includes(oldLedgerDelete)) {
  appContent = appContent.replace(oldLedgerDelete, newLedgerDelete);
  console.log('✓ Fixed ledger delete icon size.');
}

// B. Fix Profile Due Amount Label Typo
const oldDueLabel = `{tStatic("৳                ৳ ")}{formatMoney(selectedAccount.balance)}`;
const newDueLabel = `{tStatic("৳ ")}{formatMoney(selectedAccount.balance)}`;
if (appContent.includes(oldDueLabel)) {
  appContent = appContent.replace(oldDueLabel, newDueLabel);
  console.log('✓ Fixed profile due amount label typo.');
}

// C. Fix Quick Action Chips in Ledger
const oldSmsChip = `<AppIcon source={require('./assets/icons/ic_sms.png')} variant="primary" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} tintColor={null} />`;
const newSmsChip = `<AppIcon source={require('./assets/icons/ic_sms.png')} variant="primary" shape="rounded" size={24} containerSize={48} style={{ marginBottom: 6 }} tintColor={null} />`;
if (appContent.includes(oldSmsChip)) {
  appContent = appContent.replace(oldSmsChip, newSmsChip);
  console.log('✓ Fixed SMS quick action chip size.');
}

const oldCallChip = `<AppIcon source={require('./assets/icons/ic_call.png')} variant="success" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} />`;
const newCallChip = `<AppIcon source={require('./assets/icons/ic_call.png')} variant="success" shape="rounded" size={24} containerSize={48} style={{ marginBottom: 6 }} />`;
if (appContent.includes(oldCallChip)) {
  appContent = appContent.replace(oldCallChip, newCallChip);
  console.log('✓ Fixed Call quick action chip size.');
}

const oldPdfChip = `<AppIcon source={require('./assets/icons/ic_pdf.png')} variant="purple" shape="circle" size={20} containerSize={42} style={{ marginBottom: 6 }} />`;
const newPdfChip = `<AppIcon source={require('./assets/icons/ic_pdf.png')} variant="purple" shape="rounded" size={24} containerSize={48} style={{ marginBottom: 6 }} />`;
if (appContent.includes(oldPdfChip)) {
  appContent = appContent.replace(oldPdfChip, newPdfChip);
  console.log('✓ Fixed PDF quick action chip size.');
}

// D. Fix Cashbox Spacing & Repeated Currency Strings
appContent = appContent.replace(`{tStatic("৳                      ৳ ")}{hideCashAmounts ? '***' : formatMoney(todaySales || todayCashIn)}`, `{tStatic("৳ ")}{hideCashAmounts ? '***' : formatMoney(todaySales || todayCashIn)}`);
appContent = appContent.replace(`{tStatic("৳                      ৳ ")}{hideCashAmounts ? '***' : formatMoney(totalCash)}`, `{tStatic("৳ ")}{hideCashAmounts ? '***' : formatMoney(totalCash)}`);
appContent = appContent.replace(`{tStatic("+ ৳                      + ৳ ")}{hideCashAmounts ? '***' : formatMoney(todayCashIn)}`, `{tStatic("+ ৳ ")}{hideCashAmounts ? '***' : formatMoney(todayCashIn)}`);
appContent = appContent.replace(`{tStatic("- ৳                      - ৳ ")}{hideCashAmounts ? '***' : formatMoney(todayCashOut)}`, `{tStatic("- ৳ ")}{hideCashAmounts ? '***' : formatMoney(todayCashOut)}`);
console.log('✓ Fixed Cashbox repeated currency strings.');

// E. 3D Squircle Customer List Avatar Styling
const oldAvatarCircle = `  customerAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },`;

const newAvatarCircle = `  customerAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomWidth: 2.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.15)',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },`;

if (appContent.includes(oldAvatarCircle)) {
  appContent = appContent.replace(oldAvatarCircle, newAvatarCircle);
  console.log('✓ Enhanced customerAvatarCircle with 3D squircle styling.');
}

// F. Add Customization States in App.js
if (!appContent.includes('const [mmActiveCustomSection, setMmActiveCustomSection]')) {
  const targetState = `const [mmPrefShowTips, setMmPrefShowTips] = useState(true);`;
  const customStates = `const [mmPrefShowTips, setMmPrefShowTips] = useState(true);
  const [mmActiveCustomSection, setMmActiveCustomSection] = useState('dashboard');
  const [mmCustomization, setMmCustomization] = useState(() => (moneyManagerState?.preferences?.customization || {}));`;
  appContent = appContent.replace(targetState, customStates);
  console.log('✓ Added mmActiveCustomSection and mmCustomization states.');
}

// G. Update handleSaveMMPreferences and handleResetMMPreferences
if (!appContent.includes('customization: mmCustomization,')) {
  appContent = appContent.replace(
    `showTipsCard: mmPrefShowTips,\n      });`,
    `showTipsCard: mmPrefShowTips,\n        customization: mmCustomization,\n      });`
  );
  console.log('✓ Updated handleSaveMMPreferences with customization persistence.');
}

if (!appContent.includes('setMmCustomization({});')) {
  appContent = appContent.replace(
    `setMoneyManagerState(updatedState);`,
    `setMoneyManagerState(updatedState);\n      setMmCustomization({});`
  );
  console.log('✓ Updated handleResetMMPreferences with customization reset.');
}

// When opening modalMMPreferences, sync mmCustomization
if (!appContent.includes('setMmCustomization(prefs.customization || {});')) {
  appContent = appContent.replace(
    `setMmPrefShowTips(prefs.showTipsCard !== false);`,
    `setMmPrefShowTips(prefs.showTipsCard !== false);\n                    setMmCustomization(prefs.customization || {});`
  );
  console.log('✓ Synced mmCustomization on modalMMPreferences open.');
}

// H. Insert Section Customization Engine inside modalMMPreferences
const mmCustomizationUI = `
              {/* --- SECTION-SPECIFIC CUSTOMIZATION ENGINE --- */}
              <View style={{ marginTop: 12, marginBottom: 8, padding: 14, borderRadius: 16, backgroundColor: isDark ? currentTheme.cardBgElevated : '#F8FAFC', borderWidth: 1, borderColor: isDark ? currentTheme.cardBorder : '#E2E8F0' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? currentTheme.textPrimary : '#1E293B', marginBottom: 4 }}>
                  🎨 {t('mm_customization_engine')}
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? currentTheme.textSecondary : '#64748B', marginBottom: 12 }}>
                  {t('mm_select_section')}
                </Text>

                {/* Section Selector Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {[
                    { id: 'dashboard', label: t('mm_sec_dashboard'), icon: '📊' },
                    { id: 'transactions', label: t('mm_sec_transactions'), icon: '📝' },
                    { id: 'wallets', label: t('mm_sec_wallets'), icon: '💳' },
                    { id: 'budgets', label: t('mm_sec_budgets'), icon: '🎯' },
                    { id: 'goals', label: t('mm_sec_goals'), icon: '🏆' },
                    { id: 'analytics', label: t('mm_sec_analytics'), icon: '📈' },
                  ].map((sec) => {
                    const isSecSel = mmActiveCustomSection === sec.id;
                    return (
                      <TouchableOpacity
                        key={sec.id}
                        onPress={() => setMmActiveCustomSection(sec.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 20,
                          backgroundColor: isSecSel ? (isDark ? currentTheme.primary : '#B81414') : (isDark ? currentTheme.cardBg : '#FFFFFF'),
                          borderWidth: 1,
                          borderColor: isSecSel ? (isDark ? currentTheme.primary : '#B81414') : (isDark ? currentTheme.cardBorder : '#CBD5E1'),
                          marginRight: 8,
                          elevation: isSecSel ? 2 : 0,
                        }}
                      >
                        <Text style={{ fontSize: 12, marginRight: 5 }}>{sec.icon}</Text>
                        <Text style={{ fontSize: 12, fontWeight: isSecSel ? '700' : '500', color: isSecSel ? '#FFFFFF' : (isDark ? currentTheme.textPrimary : '#1E293B') }}>
                          {sec.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Theme Presets */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? currentTheme.textPrimary : '#1E293B', marginBottom: 8 }}>
                  {t('mm_theme_presets')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {[
                    { id: 'emerald', name: 'এমারেল্ড', color: '#10B981', dark: '#064E3B' },
                    { id: 'sapphire', name: 'স্যাফায়ার', color: '#2563EB', dark: '#1E3A8A' },
                    { id: 'obsidian', name: 'ওবসিডিয়ান', color: '#334155', dark: '#0F172A' },
                    { id: 'rose', name: 'রোজ গোল্ড', color: '#EC4899', dark: '#831843' },
                    { id: 'amber', name: 'অ্যাম্বার', color: '#F59E0B', dark: '#78350F' },
                    { id: 'amethyst', name: 'অ্যামিথিস্ট', color: '#8B5CF6', dark: '#4C1D95' },
                  ].map((preset) => {
                    const currentSecTheme = (mmCustomization[mmActiveCustomSection] && mmCustomization[mmActiveCustomSection].preset) || 'default';
                    const isPresetSel = currentSecTheme === preset.id;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        onPress={() => {
                          setMmCustomization({
                            ...mmCustomization,
                            [mmActiveCustomSection]: {
                              ...(mmCustomization[mmActiveCustomSection] || {}),
                              preset: preset.id,
                              accent: preset.color,
                            },
                          });
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 14,
                          backgroundColor: isDark ? currentTheme.cardBg : '#FFFFFF',
                          borderWidth: isPresetSel ? 2 : 1,
                          borderColor: isPresetSel ? preset.color : (isDark ? currentTheme.cardBorder : '#E2E8F0'),
                          elevation: isPresetSel ? 2 : 0,
                        }}
                      >
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: preset.color, marginRight: 6 }} />
                        <Text style={{ fontSize: 11, fontWeight: isPresetSel ? '700' : '500', color: isDark ? currentTheme.textPrimary : '#1E293B' }}>
                          {preset.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Background Tint & Opacity */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? currentTheme.textPrimary : '#1E293B', marginBottom: 8 }}>
                  {t('mm_bg_tint')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  {['0.1', '0.2', '0.3', '0.4'].map((tintVal) => {
                    const currentSecTint = (mmCustomization[mmActiveCustomSection] && mmCustomization[mmActiveCustomSection].tint) || '0.1';
                    const isTintSel = currentSecTint === tintVal;
                    return (
                      <TouchableOpacity
                        key={tintVal}
                        onPress={() => {
                          setMmCustomization({
                            ...mmCustomization,
                            [mmActiveCustomSection]: {
                              ...(mmCustomization[mmActiveCustomSection] || {}),
                              tint: tintVal,
                            },
                          });
                        }}
                        style={{
                          flex: 1,
                          alignItems: 'center',
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: isTintSel ? (isDark ? currentTheme.primary : '#B81414') : (isDark ? currentTheme.cardBg : '#FFFFFF'),
                          borderWidth: 1,
                          borderColor: isTintSel ? (isDark ? currentTheme.primary : '#B81414') : (isDark ? currentTheme.cardBorder : '#E2E8F0'),
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: isTintSel ? '#FFFFFF' : (isDark ? currentTheme.textPrimary : '#1E293B') }}>
                          {Math.round(parseFloat(tintVal) * 100)}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Typography & Text Scale */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? currentTheme.textPrimary : '#1E293B', marginBottom: 8 }}>
                  {t('mm_text_scale')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  {[
                    { id: '1.0', label: t('mm_scale_normal') },
                    { id: '1.1', label: t('mm_scale_medium') },
                    { id: '1.2', label: t('mm_scale_large') },
                  ].map((scaleOpt) => {
                    const currentSecScale = (mmCustomization[mmActiveCustomSection] && mmCustomization[mmActiveCustomSection].textScale) || '1.0';
                    const isScaleSel = currentSecScale === scaleOpt.id;
                    return (
                      <TouchableOpacity
                        key={scaleOpt.id}
                        onPress={() => {
                          setMmCustomization({
                            ...mmCustomization,
                            [mmActiveCustomSection]: {
                              ...(mmCustomization[mmActiveCustomSection] || {}),
                              textScale: scaleOpt.id,
                            },
                          });
                        }}
                        style={{
                          flex: 1,
                          alignItems: 'center',
                          paddingVertical: 6,
                          paddingHorizontal: 4,
                          borderRadius: 10,
                          backgroundColor: isScaleSel ? (isDark ? currentTheme.primary : '#B81414') : (isDark ? currentTheme.cardBg : '#FFFFFF'),
                          borderWidth: 1,
                          borderColor: isScaleSel ? (isDark ? currentTheme.primary : '#B81414') : (isDark ? currentTheme.cardBorder : '#E2E8F0'),
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '600', color: isScaleSel ? '#FFFFFF' : (isDark ? currentTheme.textPrimary : '#1E293B') }}>
                          {scaleOpt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Live Preview Card */}
                <View style={{ padding: 12, borderRadius: 14, backgroundColor: isDark ? currentTheme.cardBg : '#FFFFFF', borderWidth: 1, borderColor: isDark ? currentTheme.cardBorder : '#E2E8F0', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? currentTheme.textSecondary : '#64748B', marginBottom: 6 }}>
                    👁️ {t('mm_live_preview')} ({mmActiveCustomSection})
                  </Text>
                  <View style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: (mmCustomization[mmActiveCustomSection]?.accent ? mmCustomization[mmActiveCustomSection].accent + '1A' : (isDark ? currentTheme.primaryLight : '#FEF2F2')),
                    borderWidth: 1,
                    borderColor: mmCustomization[mmActiveCustomSection]?.accent || (isDark ? currentTheme.primary : '#B81414'),
                  }}>
                    <Text style={{
                      fontSize: 14 * parseFloat(mmCustomization[mmActiveCustomSection]?.textScale || '1.0'),
                      fontWeight: '700',
                      color: mmCustomization[mmActiveCustomSection]?.accent || (isDark ? currentTheme.primary : '#B81414'),
                      marginBottom: 2,
                    }}>
                      ৳ ১,৫০,০০০.০০
                    </Text>
                    <Text style={{
                      fontSize: 11 * parseFloat(mmCustomization[mmActiveCustomSection]?.textScale || '1.0'),
                      color: isDark ? currentTheme.textSecondary : '#64748B',
                    }}>
                      {mmActiveCustomSection.toUpperCase()} • প্রিমিয়াম ৩ডি কাস্টমাইজড লুক
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        const updated = { ...mmCustomization };
                        delete updated[mmActiveCustomSection];
                        setMmCustomization(updated);
                      }}
                      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: isDark ? currentTheme.cardBgElevated : '#F1F5F9' }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '600', color: isDark ? currentTheme.textSecondary : '#64748B' }}>
                        ↩ {t('mm_reset_section')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
`;

if (!appContent.includes('mm_customization_engine')) {
  const insertMarker = `              {/* Card Visibility Toggles */}`;
  appContent = appContent.replace(insertMarker, `${mmCustomizationUI}\n              {/* Card Visibility Toggles */}`);
  console.log('✓ Inserted Section Customization Engine into modalMMPreferences.');
}

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('✓ App.js saved successfully.');

// --- 3. VALIDATE SYNTAX WITH BABEL ---
console.log('Validating App.js syntax with Babel...');
babel.parseSync(appContent, {
  filename: 'App.js',
  configFile: false,
  babelrc: false,
  parserOpts: { plugins: ['jsx', 'flow'] }
});
console.log('✅ BABEL SYNTAX CHECK PASSED 100%!');
