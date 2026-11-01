const assert = require('assert');
const fs = require('fs');
const preferencesService = require('./src/preferencesService');
const i18nService = require('./src/i18nService');
const themeService = require('./src/themeService');

console.log('================================================================');
console.log('TALLYKHATA PHASE 10: GLOBAL SETTINGS & CONFIGURATION TEST SUITE');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
  }
}

// 1. Canonical Default Preferences
runTest('preferencesService defines full Phase 10 V2 schema defaults', () => {
  const d = preferencesService.DEFAULT_PREFERENCES;
  assert.strictEqual(d.theme, 'light');
  assert.strictEqual(d.language, 'bn');
  assert.strictEqual(d.fontScale, 1.0);
  assert.strictEqual(d.density, 'standard');
  assert.strictEqual(d.accentColor, '#B8141F');
  assert.deepStrictEqual(d.notifications, {
    dueReminders: true,
    tagadaSms: true,
    backupAlerts: true,
    dailySummary: false,
  });
  assert.strictEqual(d.security.biometricEnabled, false);
  assert.strictEqual(d.security.autoLockMinutes, 5);
  assert.strictEqual(d.security.hideBalances, false);
  assert.strictEqual(d.data.autoBackupDrive, false);
  assert.strictEqual(d.data.backupFrequency, 'manual');
});

// 2. Font Scale Sanitization & Clamping
runTest('sanitizePreferences clamps fontScale between 0.85 and 1.30', () => {
  assert.strictEqual(preferencesService.sanitizePreferences({ fontScale: 0.5 }).fontScale, 0.85);
  assert.strictEqual(preferencesService.sanitizePreferences({ fontScale: 1.5 }).fontScale, 1.30);
  assert.strictEqual(preferencesService.sanitizePreferences({ fontScale: 1.15 }).fontScale, 1.15);
  assert.strictEqual(preferencesService.sanitizePreferences({ fontScale: 'invalid' }).fontScale, 1.0);
  assert.strictEqual(preferencesService.sanitizePreferences({}).fontScale, 1.0);
});

// 3. Density Sanitization & Resolving
runTest('density sanitizes and resolves effective factors correctly', () => {
  assert.strictEqual(preferencesService.sanitizePreferences({ density: 'compact' }).density, 'compact');
  assert.strictEqual(preferencesService.sanitizePreferences({ density: 'comfortable' }).density, 'comfortable');
  assert.strictEqual(preferencesService.sanitizePreferences({ density: 'unknown' }).density, 'standard');

  const compact = preferencesService.resolveEffectiveDensity('compact');
  assert.strictEqual(compact.paddingFactor, 0.8);
  assert.strictEqual(compact.cardPadding, 10);

  const comfortable = preferencesService.resolveEffectiveDensity('comfortable');
  assert.strictEqual(comfortable.paddingFactor, 1.2);
  assert.strictEqual(comfortable.cardPadding, 16);

  const standard = preferencesService.resolveEffectiveDensity('standard');
  assert.strictEqual(standard.paddingFactor, 1.0);
  assert.strictEqual(standard.cardPadding, 12);
});

// 4. Brand Accent Color Sanitization
runTest('accentColor validates 7-character hex with standard fallback', () => {
  assert.strictEqual(preferencesService.sanitizePreferences({ accentColor: '#2563EB' }).accentColor, '#2563EB');
  assert.strictEqual(preferencesService.sanitizePreferences({ accentColor: '#059669' }).accentColor, '#059669');
  assert.strictEqual(preferencesService.sanitizePreferences({ accentColor: 'invalid-color' }).accentColor, '#B8141F');
  assert.strictEqual(preferencesService.sanitizePreferences({ accentColor: '#123' }).accentColor, '#B8141F');
});

// 5. Notification Preferences Sanitization
runTest('notifications object structure and boolean coercion', () => {
  const sanitized = preferencesService.sanitizePreferences({
    notifications: {
      dueReminders: false,
      tagadaSms: true,
      backupAlerts: false,
      dailySummary: true,
    },
  });
  assert.strictEqual(sanitized.notifications.dueReminders, false);
  assert.strictEqual(sanitized.notifications.tagadaSms, true);
  assert.strictEqual(sanitized.notifications.backupAlerts, false);
  assert.strictEqual(sanitized.notifications.dailySummary, true);

  const emptySanitized = preferencesService.sanitizePreferences({});
  assert.strictEqual(emptySanitized.notifications.dueReminders, true);
  assert.strictEqual(emptySanitized.notifications.tagadaSms, true);
  assert.strictEqual(emptySanitized.notifications.backupAlerts, true);
  assert.strictEqual(emptySanitized.notifications.dailySummary, false);
});

// 6. Security Preferences Sanitization
runTest('security preferences whitelists autoLockMinutes and coerces booleans', () => {
  const sanitized = preferencesService.sanitizePreferences({
    security: {
      biometricEnabled: true,
      autoLockMinutes: 15,
      hideBalances: true,
    },
  });
  assert.strictEqual(sanitized.security.biometricEnabled, true);
  assert.strictEqual(sanitized.security.autoLockMinutes, 15);
  assert.strictEqual(sanitized.security.hideBalances, true);

  const invalidTime = preferencesService.sanitizePreferences({
    security: { autoLockMinutes: 99 },
  });
  assert.strictEqual(invalidTime.security.autoLockMinutes, 5);
});

// 7. Data Preferences Sanitization
runTest('data preferences whitelists backupFrequency', () => {
  assert.strictEqual(preferencesService.sanitizePreferences({ data: { backupFrequency: 'daily' } }).data.backupFrequency, 'daily');
  assert.strictEqual(preferencesService.sanitizePreferences({ data: { backupFrequency: 'weekly' } }).data.backupFrequency, 'weekly');
  assert.strictEqual(preferencesService.sanitizePreferences({ data: { backupFrequency: 'yearly' } }).data.backupFrequency, 'manual');
});

// 8. Storage Persistence & Partial Update Roundtrip
runTest('getStoredPreferences and savePreferences persist full Phase 10 snapshot', async () => {
  const storage = {};
  const mockAdapter = {
    getItem: async (k) => storage[k] || null,
    setItem: async (k, v) => { storage[k] = v; },
  };

  const initial = await preferencesService.getStoredPreferences(mockAdapter);
  assert.strictEqual(initial.fontScale, 1.0);
  assert.strictEqual(initial.density, 'standard');

  await preferencesService.savePreferences(mockAdapter, {
    fontScale: 1.1,
    density: 'compact',
    notifications: { dueReminders: false },
  });

  const updated = await preferencesService.getStoredPreferences(mockAdapter);
  assert.strictEqual(updated.fontScale, 1.1);
  assert.strictEqual(updated.density, 'compact');
  assert.strictEqual(updated.notifications.dueReminders, false);
  assert.strictEqual(updated.notifications.tagadaSms, true); // preserved default
});

// 9. Legacy V1 Migration Resilience
runTest('Legacy V1 preferences migrate seamlessly without data loss', async () => {
  const legacyStorage = {
    '@tallykhata_app_preferences_v1': JSON.stringify({
      theme: 'dark',
      language: 'en',
    }),
  };
  const mockAdapter = {
    getItem: async (k) => legacyStorage[k] || null,
    setItem: async (k, v) => { legacyStorage[k] = v; },
  };

  const migrated = await preferencesService.getStoredPreferences(mockAdapter);
  assert.strictEqual(migrated.theme, 'dark');
  assert.strictEqual(migrated.language, 'en');
  assert.strictEqual(migrated.fontScale, 1.0);
  assert.strictEqual(migrated.density, 'standard');
  assert.strictEqual(migrated.accentColor, '#B8141F');
  assert.strictEqual(migrated.notifications.dueReminders, true);
});

// 10. Corrupt Storage Recovery
runTest('Corrupt JSON storage recovers gracefully to DEFAULT_PREFERENCES', async () => {
  const corruptStorage = {
    '@tallykhata_app_preferences_v1': '{{{corrupted json',
  };
  const mockAdapter = {
    getItem: async (k) => corruptStorage[k] || null,
    setItem: async (k, v) => { corruptStorage[k] = v; },
  };

  const recovered = await preferencesService.getStoredPreferences(mockAdapter);
  assert.strictEqual(recovered.theme, 'light');
  assert.strictEqual(recovered.language, 'bn');
  assert.strictEqual(recovered.fontScale, 1.0);
});

// 11. App.js Menu Tab Integration & Offline Notice Fix
runTest('App.js wires new settings cards and fixes offline notice duplicate text', () => {
  const appSrc = fs.readFileSync('App.js', 'utf8');

  // Verify group 3 count is 10
  assert.ok(appSrc.includes("count={10}"), 'SectionHeader should specify count 10 for settings group');

  // Verify modal state hooks
  assert.ok(appSrc.includes('modalNotifications'), 'modalNotifications state hook should be defined');
  assert.ok(appSrc.includes('modalDataManagement'), 'modalDataManagement state hook should be defined');
  assert.ok(appSrc.includes('modalAbout'), 'modalAbout state hook should be defined');

  // Verify cards in Menu tab
  assert.ok(appSrc.includes("setModalNotifications(true)"), 'Menu should trigger modalNotifications');
  assert.ok(appSrc.includes("setModalDataManagement(true)"), 'Menu should trigger modalDataManagement');
  assert.ok(appSrc.includes("setModalAbout(true)"), 'Menu should trigger modalAbout');

  // Verify offline notice duplicate text is fixed
  assert.ok(!appSrc.includes('আপনার ফোনেই সুরক্ষিত। কোনো ইন্টারনেট কানেকশন বা সাবস্ক্রিপশন ছাড়াই আজীবন ব্যবহার করতে পারবেন।                 আপনার ব্যবসার তথ্য'), 'Offline notice duplicate text must be resolved');
});

// 12. App.js Modals Implementation
runTest('App.js implements all 3 new modals with complete UI controls', () => {
  const appSrc = fs.readFileSync('App.js', 'utf8');

  // modalNotifications checks
  assert.ok(appSrc.includes('visible={modalNotifications}'), 'modalNotifications Modal must be rendered');
  assert.ok(appSrc.includes("handleToggleNotification('dueReminders')"), 'Due reminders toggle wired');
  assert.ok(appSrc.includes("handleToggleNotification('tagadaSms')"), 'Tagada SMS toggle wired');
  assert.ok(appSrc.includes("handleToggleNotification('backupAlerts')"), 'Backup alerts toggle wired');
  assert.ok(appSrc.includes("handleToggleNotification('dailySummary')"), 'Daily summary toggle wired');

  // modalDataManagement checks
  assert.ok(appSrc.includes('visible={modalDataManagement}'), 'modalDataManagement Modal must be rendered');
  assert.ok(appSrc.includes('data_stat_customers'), 'Customer count stat displayed');
  assert.ok(appSrc.includes('data_stat_txns'), 'Transaction count stat displayed');
  assert.ok(appSrc.includes('data_btn_clear_cache'), 'Clear cache button wired');
  assert.ok(appSrc.includes('data_btn_export_json'), 'Safe export button wired');

  // modalAbout checks
  assert.ok(appSrc.includes('visible={modalAbout}'), 'modalAbout Modal must be rendered');
  assert.ok(appSrc.includes('about_app_name'), 'App name displayed');
  assert.ok(appSrc.includes('about_version'), 'App version displayed');
  assert.ok(appSrc.includes('about_offline_guarantee_title'), 'Offline guarantee card displayed');

  // modalThemePicker fontScale & density checks
  assert.ok(appSrc.includes('settings_font_scale'), 'Font scale picker rendered in theme modal');
  assert.ok(appSrc.includes('handleSelectFontScale'), 'handleSelectFontScale handler wired');
  assert.ok(appSrc.includes('settings_density'), 'Density picker rendered in theme modal');
  assert.ok(appSrc.includes('handleSelectDensity'), 'handleSelectDensity handler wired');
});

// 13. BackHandler Hardware Back Integration
runTest('BackHandler handles hardware back press for all new modals', () => {
  const appSrc = fs.readFileSync('App.js', 'utf8');
  assert.ok(appSrc.includes('if (modalNotifications) { setModalNotifications(false); return true; }'), 'BackHandler handles modalNotifications');
  assert.ok(appSrc.includes('if (modalDataManagement) { setModalDataManagement(false); return true; }'), 'BackHandler handles modalDataManagement');
  assert.ok(appSrc.includes('if (modalAbout) { setModalAbout(false); return true; }'), 'BackHandler handles modalAbout');
});

// 14. Phase 10 Translation Keys Complete in Both Languages
runTest('All Phase 10 translation keys exist in both Bangla and English', () => {
  const phase10Keys = [
    'menu_notifications', 'menu_notifications_sub', 'notif_title', 'notif_sub',
    'notif_due_reminders', 'notif_due_reminders_sub', 'notif_tagada_sms', 'notif_tagada_sms_sub',
    'notif_backup_alerts', 'notif_backup_alerts_sub', 'notif_daily_summary', 'notif_daily_summary_sub',
    'menu_data_storage', 'menu_data_storage_sub', 'data_storage_title', 'data_storage_sub',
    'data_stat_customers', 'data_stat_txns', 'data_stat_cashbox', 'data_stat_mm_txns',
    'data_stat_wallets', 'data_stat_storage_size', 'data_btn_clear_cache', 'data_cache_cleared',
    'data_btn_export_json', 'data_export_hint',
    'menu_about', 'menu_about_sub', 'about_title', 'about_app_name', 'about_version', 'about_build',
    'about_offline_guarantee_title', 'about_offline_guarantee_body', 'about_developer', 'about_copyright',
    'settings_font_scale', 'settings_font_scale_normal', 'settings_font_scale_medium', 'settings_font_scale_large',
    'settings_density', 'settings_density_comfortable', 'settings_density_standard', 'settings_density_compact',
  ];

  phase10Keys.forEach((key) => {
    const bnText = i18nService.t(key, 'bn');
    const enText = i18nService.t(key, 'en');
    assert.ok(bnText && bnText !== key, `Bangla translation missing for key: ${key}`);
    assert.ok(enText && enText !== key, `English translation missing for key: ${key}`);
  });
});

console.log('================================================================');
console.log(`PHASE 10 GLOBAL SETTINGS SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
