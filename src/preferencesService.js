let _cachedPreferences = null;
function resetCache() {
  _cachedPreferences = null;
}
function reloadCache(newPrefs = null) {
  _cachedPreferences = newPrefs;
}

/**
 * Global App Preferences Service for TallyKhata
 * Manages app-wide Light/Dark/System theme, Bangla/English/System language,
 * global typography scaling, visual density, brand accent, notifications,
 * security parameters, and data/backup configurations.
 */

const PREFERENCES_STORAGE_KEY = '@tallykhata_app_preferences_v1';

const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

const LANGUAGES = {
  BN: 'bn',
  EN: 'en',
  SYSTEM: 'system',
};

const DENSITIES = {
  COMFORTABLE: 'comfortable',
  STANDARD: 'standard',
  COMPACT: 'compact',
};

const DEFAULT_PREFERENCES = {
  theme: THEMES.LIGHT,
  language: LANGUAGES.BN,
  fontScale: 1.0,
  density: DENSITIES.STANDARD,
  accentColor: '#B8141F',
  notifications: {
    dueReminders: true,
    tagadaSms: true,
    backupAlerts: true,
    dailySummary: false,
  },
  security: {
    biometricEnabled: false,
    autoLockMinutes: 5,
    hideBalances: false,
  },
  data: {
    autoBackupDrive: false,
    backupFrequency: 'manual',
  },
};

function sanitizePreferences(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PREFERENCES };
  }
  let theme = THEMES.LIGHT;
  if (raw.theme === THEMES.DARK) {
    theme = THEMES.DARK;
  } else if (raw.theme === THEMES.SYSTEM) {
    theme = THEMES.SYSTEM;
  } else {
    theme = THEMES.LIGHT;
  }

  let language = LANGUAGES.BN;
  if (raw.language === LANGUAGES.EN) {
    language = LANGUAGES.EN;
  } else if (raw.language === LANGUAGES.SYSTEM) {
    language = LANGUAGES.SYSTEM;
  } else {
    language = LANGUAGES.BN;
  }

  // Phase 10: Typography Scale [0.85, 1.30]
  let fontScale = 1.0;
  if (raw.fontScale !== undefined && raw.fontScale !== null) {
    const parsedScale = parseFloat(raw.fontScale);
    if (!isNaN(parsedScale)) {
      fontScale = Math.min(1.30, Math.max(0.85, Math.round(parsedScale * 100) / 100));
    }
  }

  // Phase 10: Visual Density
  let density = DENSITIES.STANDARD;
  if (raw.density === DENSITIES.COMFORTABLE || raw.density === DENSITIES.COMPACT) {
    density = raw.density;
  }

  // Phase 10: Brand Accent Color
  let accentColor = '#B8141F';
  if (typeof raw.accentColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.accentColor)) {
    accentColor = raw.accentColor;
  }

  // Phase 10: Notification Preferences
  const rawNotif = (raw.notifications && typeof raw.notifications === 'object') ? raw.notifications : {};
  const notifications = {
    dueReminders: rawNotif.dueReminders !== false,
    tagadaSms: rawNotif.tagadaSms !== false,
    backupAlerts: rawNotif.backupAlerts !== false,
    dailySummary: Boolean(rawNotif.dailySummary),
  };

  // Phase 10: Security Preferences
  const rawSec = (raw.security && typeof raw.security === 'object') ? raw.security : {};
  let autoLockMinutes = 5;
  if (typeof rawSec.autoLockMinutes === 'number' && [1, 2, 5, 10, 15, 30].includes(rawSec.autoLockMinutes)) {
    autoLockMinutes = rawSec.autoLockMinutes;
  }
  const security = {
    biometricEnabled: Boolean(rawSec.biometricEnabled),
    autoLockMinutes,
    hideBalances: Boolean(rawSec.hideBalances),
  };

  // Phase 10: Data & Backup Preferences
  const rawData = (raw.data && typeof raw.data === 'object') ? raw.data : {};
  let backupFrequency = 'manual';
  if (['manual', 'daily', 'weekly'].includes(rawData.backupFrequency)) {
    backupFrequency = rawData.backupFrequency;
  }
  const data = {
    autoBackupDrive: Boolean(rawData.autoBackupDrive),
    backupFrequency,
  };

  return {
    theme,
    language,
    fontScale,
    density,
    accentColor,
    notifications,
    security,
    data,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function resolveEffectiveTheme(themePreference, systemColorScheme) {
  if (themePreference === THEMES.DARK) return 'dark';
  if (themePreference === THEMES.LIGHT) return 'light';
  // SYSTEM mode
  if (systemColorScheme === 'dark') return 'dark';
  return 'light'; // default fallback for system mode
}

function resolveEffectiveLanguage(languagePreference, systemLocale) {
  if (languagePreference === LANGUAGES.EN) return 'en';
  if (languagePreference === LANGUAGES.BN) return 'bn';
  // SYSTEM mode
  const loc = String(systemLocale || '').trim().replace(/_/g, '-').toLowerCase();
  const languageCode = loc.match(/^([a-z]{2,3})(?:-|$)/)?.[1];
  if (languageCode === 'en') return 'en';
  if (languageCode === 'bn') return 'bn';
  return 'bn'; // stable default fallback for unsupported system locales
}

function resolveEffectiveDensity(prefDensity) {
  if (prefDensity === DENSITIES.COMPACT) {
    return { paddingFactor: 0.8, itemGap: 6, cardPadding: 10 };
  }
  if (prefDensity === DENSITIES.COMFORTABLE) {
    return { paddingFactor: 1.2, itemGap: 12, cardPadding: 16 };
  }
  return { paddingFactor: 1.0, itemGap: 8, cardPadding: 12 };
}

function resolveGlobalFontScale(prefFontScale) {
  const base = typeof prefFontScale === 'number' ? prefFontScale : 1.0;
  return Math.min(1.30, Math.max(0.85, Math.round(base * 100) / 100));
}

async function getStoredPreferences(adapter) {
  if (!adapter || typeof adapter.getItem !== 'function') {
    return { ...DEFAULT_PREFERENCES };
  }
  try {
    const raw = await adapter.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    return sanitizePreferences(parsed);
  } catch (err) {
    return { ...DEFAULT_PREFERENCES };
  }
}

async function savePreferences(adapter, prefs) {
  const sanitized = sanitizePreferences(prefs);
  sanitized.updatedAt = new Date().toISOString();
  if (adapter && typeof adapter.setItem === 'function') {
    await adapter.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(sanitized));
  }
  return sanitized;
}

module.exports = {
  PREFERENCES_STORAGE_KEY,
  THEMES,
  LANGUAGES,
  DENSITIES,
  DEFAULT_PREFERENCES,
  sanitizePreferences,
  resolveEffectiveTheme,
  resolveEffectiveLanguage,
  resolveEffectiveDensity,
  resolveGlobalFontScale,
  getStoredPreferences,
  savePreferences,
  resetCache,
  reloadCache,
};
