/**
 * Global App Preferences Service for TallyKhata
 * Manages app-wide Light/Dark theme and Bangla/English language settings.
 */

const PREFERENCES_STORAGE_KEY = '@tallykhata_app_preferences_v1';

const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

const LANGUAGES = {
  BN: 'bn',
  EN: 'en',
};

const DEFAULT_PREFERENCES = {
  theme: THEMES.LIGHT,
  language: LANGUAGES.BN,
};

function sanitizePreferences(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PREFERENCES };
  }
  const theme = raw.theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
  const language = raw.language === LANGUAGES.EN ? LANGUAGES.EN : LANGUAGES.BN;
  return {
    theme,
    language,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
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
  getStoredPreferences,
  savePreferences,
};
