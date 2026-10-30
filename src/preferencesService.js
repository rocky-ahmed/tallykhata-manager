let _cachedPreferences = null;
function resetCache() {
  _cachedPreferences = null;
}
function reloadCache(newPrefs = null) {
  _cachedPreferences = newPrefs;
}

/**
 * Global App Preferences Service for TallyKhata
 * Manages app-wide Light/Dark/System theme and Bangla/English/System language settings.
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

const DEFAULT_PREFERENCES = {
  theme: THEMES.LIGHT,
  language: LANGUAGES.BN,
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

  return {
    theme,
    language,
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
  DEFAULT_PREFERENCES,
  sanitizePreferences,
  resolveEffectiveTheme,
  resolveEffectiveLanguage,
  getStoredPreferences,
  savePreferences,
  resetCache,
  reloadCache,
};
