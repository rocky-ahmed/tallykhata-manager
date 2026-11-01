/**
 * test_iteration_026_preferences_theme_and_customization.js
 * Continuous Verification Suite for Iteration 026: Preferences, Theme, Customization & Calendar Boundaries
 *
 * Covers:
 * 1. Preferences Sanitization, Boundary Clamping & System Defaults.
 * 2. Effective Theme, Language & Visual Density Resolution.
 * 3. Async Storage Persistence, Cache Lifecycle & Corrupted Payload Resilience.
 * 4. Design Tokens, Color Blending & WCAG 2.1 AA Contrast Invariants.
 * 5. Money Manager V3 Customization Engine & 5-Layer Cascading Resolution.
 * 6. Calendar Boundaries, Leap Days, Month-Ends & Date Filtering Parity.
 *
 * Worker Roles:
 * - Worker 1 (Gibbs): Thread ID 01a19154-99ab-72a0-9e23-2611b9ffc74c (REA Parity & Invariants)
 * - Worker 2 (Averroes): Thread ID 01a19154-c135-75d0-b38a-1ea50f004895 (Backend Preferences & Calendar Boundaries)
 * - Worker 3 (Ohm): Thread ID 01a19154-e3ee-7ab2-b682-798b64a0bb6b (Frontend Theme, Typography & Customization)
 */

const assert = require("assert");
const prefsService = require("./src/preferencesService");
const themeService = require("./src/themeService");
const customService = require("./src/moneyManagerCustomizationService");
const mmService = require("./src/moneyManagerService");

console.log("================================================================");
console.log("TALLYKHATA ITERATION 026: PREFERENCES, THEME & CUSTOMIZATION AUDIT");
console.log("================================================================\n");

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log("[PASS] TEST " + totalTests + ": " + name);
    passedTests++;
  } catch (err) {
    console.error("[FAIL] TEST " + totalTests + ": " + name);
    console.error(err);
    process.exit(1);
  }
}

function createMockAdapter(initialStore = {}) {
  const store = { ...initialStore };
  return {
    async getItem(key) {
      return store[key] !== undefined ? store[key] : null;
    },
    async setItem(key, val) {
      store[key] = String(val);
    },
    async removeItem(key) {
      delete store[key];
    },
    _getRawStore() {
      return store;
    },
  };
}

(async () => {
  // =========================================================================
  // PART 1: Preferences Sanitization, Boundary Clamping & System Defaults
  // =========================================================================
  await runTest("1.1: Default preferences structure adheres to production specifications", async () => {
    const def = prefsService.DEFAULT_PREFERENCES;
    assert.strictEqual(def.theme, "light");
    assert.strictEqual(def.language, "bn");
    assert.strictEqual(def.fontScale, 1.0);
    assert.strictEqual(def.density, "standard");
    assert.strictEqual(def.accentColor, "#B8141F");
    assert.strictEqual(def.notifications.dueReminders, true);
    assert.strictEqual(def.notifications.tagadaSms, true);
    assert.strictEqual(def.notifications.backupAlerts, true);
    assert.strictEqual(def.notifications.dailySummary, false);
    assert.strictEqual(def.security.biometricEnabled, false);
    assert.strictEqual(def.security.autoLockMinutes, 5);
    assert.strictEqual(def.security.hideBalances, false);
    assert.strictEqual(def.data.autoBackupDrive, false);
    assert.strictEqual(def.data.backupFrequency, "manual");
  });

  await runTest("1.2: sanitizePreferences clamps fontScale strictly within [0.85, 1.30] and validates autoLockMinutes", async () => {
    // Too small -> clamp to 0.85
    const low = prefsService.sanitizePreferences({ fontScale: 0.25 });
    assert.strictEqual(low.fontScale, 0.85);

    // Too large -> clamp to 1.30
    const high = prefsService.sanitizePreferences({ fontScale: 2.75 });
    assert.strictEqual(high.fontScale, 1.30);

    // Valid string number -> parsed and rounded
    const strNum = prefsService.sanitizePreferences({ fontScale: "1.156" });
    assert.strictEqual(strNum.fontScale, 1.16);

    // Invalid / NaN -> fallback to 1.0
    const nanNum = prefsService.sanitizePreferences({ fontScale: "invalid_scale" });
    assert.strictEqual(nanNum.fontScale, 1.0);

    // Valid autoLockMinutes
    const lock10 = prefsService.sanitizePreferences({ security: { autoLockMinutes: 10 } });
    assert.strictEqual(lock10.security.autoLockMinutes, 10);

    // Invalid autoLockMinutes -> fallback to 5
    const lockInvalid = prefsService.sanitizePreferences({ security: { autoLockMinutes: 99 } });
    assert.strictEqual(lockInvalid.security.autoLockMinutes, 5);
  });

  await runTest("1.3: sanitizePreferences handles null, undefined, empty, and invalid values gracefully", async () => {
    const fromNull = prefsService.sanitizePreferences(null);
    assert.strictEqual(fromNull.theme, "light");
    assert.strictEqual(fromNull.language, "bn");
    assert.strictEqual(fromNull.fontScale, 1.0);

    const fromEmpty = prefsService.sanitizePreferences({});
    assert.strictEqual(fromEmpty.theme, "light");
    assert.ok(fromEmpty.updatedAt, "Must assign updatedAt timestamp when object is sanitized");

    const fromInvalid = prefsService.sanitizePreferences({
      theme: "neon_cyberpunk",
      language: "fr_FR",
      density: "ultra_stretched",
      accentColor: "not_a_hex",
      data: { backupFrequency: "every_hour" },
    });

    assert.strictEqual(fromInvalid.theme, "light", "Invalid theme must default to light");
    assert.strictEqual(fromInvalid.language, "bn", "Invalid language must default to bn");
    assert.strictEqual(fromInvalid.density, "standard", "Invalid density must default to standard");
    assert.strictEqual(fromInvalid.accentColor, "#B8141F", "Invalid accent color must default to #B8141F");
    assert.strictEqual(fromInvalid.data.backupFrequency, "manual", "Invalid frequency must default to manual");
  });

  // =========================================================================
  // PART 2: Effective Theme, Language & Visual Density Resolution
  // =========================================================================
  await runTest("2.1: resolveEffectiveTheme resolves explicit and system color schemes accurately", async () => {
    assert.strictEqual(prefsService.resolveEffectiveTheme("dark", "light"), "dark");
    assert.strictEqual(prefsService.resolveEffectiveTheme("light", "dark"), "light");
    assert.strictEqual(prefsService.resolveEffectiveTheme("system", "dark"), "dark");
    assert.strictEqual(prefsService.resolveEffectiveTheme("system", "light"), "light");
    assert.strictEqual(prefsService.resolveEffectiveTheme("system", null), "light");
    assert.strictEqual(prefsService.resolveEffectiveTheme("unknown", "dark"), "dark");
    assert.strictEqual(prefsService.resolveEffectiveTheme("unknown", "light"), "light");
  });

  await runTest("2.2: resolveEffectiveLanguage parses BCP 47 and POSIX locale identifiers", async () => {
    assert.strictEqual(prefsService.resolveEffectiveLanguage("en", "bn_BD"), "en");
    assert.strictEqual(prefsService.resolveEffectiveLanguage("bn", "en-US"), "bn");
    assert.strictEqual(prefsService.resolveEffectiveLanguage("system", "en-US"), "en");
    assert.strictEqual(prefsService.resolveEffectiveLanguage("system", "en_GB"), "en");
    assert.strictEqual(prefsService.resolveEffectiveLanguage("system", "bn_BD"), "bn");
    assert.strictEqual(prefsService.resolveEffectiveLanguage("system", "bn-IN"), "bn");
    // Unsupported system locale -> fallback to Bangla
    assert.strictEqual(prefsService.resolveEffectiveLanguage("system", "de-DE"), "bn");
    assert.strictEqual(prefsService.resolveEffectiveLanguage("system", null), "bn");
  });

  await runTest("2.3: resolveEffectiveDensity provides proportional UI spacing metrics", async () => {
    const compact = prefsService.resolveEffectiveDensity("compact");
    assert.strictEqual(compact.paddingFactor, 0.8);
    assert.strictEqual(compact.itemGap, 6);
    assert.strictEqual(compact.cardPadding, 10);

    const comfortable = prefsService.resolveEffectiveDensity("comfortable");
    assert.strictEqual(comfortable.paddingFactor, 1.2);
    assert.strictEqual(comfortable.itemGap, 12);
    assert.strictEqual(comfortable.cardPadding, 16);

    const standard = prefsService.resolveEffectiveDensity("standard");
    assert.strictEqual(standard.paddingFactor, 1.0);
    assert.strictEqual(standard.itemGap, 8);
    assert.strictEqual(standard.cardPadding, 12);
  });

  // =========================================================================
  // PART 3: Async Storage Persistence, Cache Lifecycle & Corrupted Payloads
  // =========================================================================
  await runTest("3.1: getStoredPreferences and savePreferences persist and retrieve settings reliably", async () => {
    const adapter = createMockAdapter();
    // Initially empty -> return defaults
    const initial = await prefsService.getStoredPreferences(adapter);
    assert.strictEqual(initial.theme, "light");
    assert.strictEqual(initial.density, "standard");

    // Save custom preferences
    const saved = await prefsService.savePreferences(adapter, {
      theme: "dark",
      language: "en",
      fontScale: 1.15,
      density: "compact",
      accentColor: "#2563EB",
      security: { biometricEnabled: true, autoLockMinutes: 15 },
    });

    assert.strictEqual(saved.theme, "dark");
    assert.strictEqual(saved.accentColor, "#2563EB");

    // Retrieve back from storage
    const fetched = await prefsService.getStoredPreferences(adapter);
    assert.strictEqual(fetched.theme, "dark");
    assert.strictEqual(fetched.language, "en");
    assert.strictEqual(fetched.fontScale, 1.15);
    assert.strictEqual(fetched.density, "compact");
    assert.strictEqual(fetched.accentColor, "#2563EB");
    assert.strictEqual(fetched.security.biometricEnabled, true);
    assert.strictEqual(fetched.security.autoLockMinutes, 15);
  });

  await runTest("3.2: getStoredPreferences recovers cleanly from corrupted JSON payload in storage", async () => {
    const adapter = createMockAdapter({
      "@tallykhata_app_preferences_v1": "{ corrupted json payload unclosed bracket",
    });

    const recovered = await prefsService.getStoredPreferences(adapter);
    assert.strictEqual(recovered.theme, "light", "Corrupted payload must fallback to default light");
    assert.strictEqual(recovered.language, "bn", "Corrupted payload must fallback to default bn");
    assert.strictEqual(recovered.fontScale, 1.0);
  });

  // =========================================================================
  // PART 4: Design Tokens, Color Blending & WCAG 2.1 AA Contrast Invariants
  // =========================================================================
  await runTest("4.1: Design system tokens provide comprehensive light and dark palettes", async () => {
    const lightTokens = themeService.getThemeTokens("light");
    assert.strictEqual(lightTokens.isDark, false);
    assert.strictEqual(lightTokens.primary, "#B81414");
    assert.strictEqual(lightTokens.cardBg, "#FFFFFF");

    const darkTokens = themeService.getThemeTokens("dark");
    assert.strictEqual(darkTokens.isDark, true);
    assert.strictEqual(darkTokens.cardBg, "#1E293B");

    // getThemedStyles returns functional style definitions
    const styles = themeService.getThemedStyles(darkTokens, 1.1, "compact");
    assert.strictEqual(styles.card.backgroundColor, "#1E293B");
    assert.strictEqual(styles.card.borderColor, "#334155");
  });

  await runTest("4.2: getContrastRatio and WCAG 2.1 AA contrast calculations are exact", async () => {
    // Pure black (#000000) vs Pure white (#FFFFFF) = 21:1
    const maxContrast = themeService.getContrastRatio("#000000", "#FFFFFF");
    assert.strictEqual(maxContrast, 21.0);

    // Identical colors = 1:1
    const minContrast = themeService.getContrastRatio("#B81414", "#B81414");
    assert.strictEqual(minContrast, 1.0);

    // Hex validity checker (supports 6-digit and 8-digit hex)
    assert.strictEqual(themeService.isValidHex("#B8141F"), true);
    assert.strictEqual(themeService.isValidHex("#FFFFFF80"), true);
    assert.strictEqual(themeService.isValidHex("#FFF"), false);
    assert.strictEqual(themeService.isValidHex("not-a-hex"), false);
  });

  await runTest("4.3: Accessibility contrast guard auto-corrects low-contrast accent colors on surfaces", async () => {
    const customization = customService.getCanonicalDefaultCustomization();
    customization.accessibility.enforceContrastGuard = true;

    // Set a very light yellow accent on light card background (poor contrast < 4.5)
    customization.global.accent = "#FEF08A"; // Very light yellow

    const resolved = customService.resolveMMSectionStyle("dashboard", customization, false, themeService.LIGHT_THEME);
    // Since contrast is poor on white, auto-correct fallback should be applied
    assert.strictEqual(resolved.accentColor, "#7F1D1D", "Low contrast accent on light card must auto-correct to #7F1D1D");

    // On dark card background, low contrast dark accent auto-corrects to #FCA5A5
    customization.global.accent = "#1E293B"; // Dark slate
    const resolvedDark = customService.resolveMMSectionStyle("dashboard", customization, true, themeService.DARK_THEME);
    assert.strictEqual(resolvedDark.accentColor, "#FCA5A5", "Low contrast accent on dark card must auto-correct to #FCA5A5");
  });

  // =========================================================================
  // PART 5: Money Manager V3 Customization Engine & 5-Layer Cascading
  // =========================================================================
  await runTest("5.1: getCanonicalDefaultCustomization produces valid V3 schema with all 8 sections", async () => {
    const canon = customService.getCanonicalDefaultCustomization();
    assert.strictEqual(canon.schemaVersion, 3);
    assert.ok(canon.global);
    assert.strictEqual(canon.global.preset, "default");
    assert.strictEqual(canon.global.accent, "#B81414");

    const expectedSections = [
      "dashboard", "transactions", "wallets", "budgets",
      "goals", "analytics", "categories", "reports"
    ];
    expectedSections.forEach(sec => {
      assert.ok(canon.sections[sec] !== undefined, "Section " + sec + " must be defined in V3");
    });
  });

  await runTest("5.2: migrateCustomizationToV3 preserves legacy section accents losslessly", async () => {
    const legacyV2 = {
      schemaVersion: 2,
      global: { preset: "sapphire", accent: "#2563EB" },
      sections: {
        wallets: { accent: "#10B981" },
        budgets: { accent: "#F59E0B" },
      },
    };

    const migrated = customService.migrateCustomizationToV3(legacyV2);
    assert.strictEqual(migrated.schemaVersion, 3);
    assert.strictEqual(migrated.global.preset, "sapphire");
    assert.strictEqual(migrated.global.accent, "#2563EB");
    assert.strictEqual(migrated.sections.wallets.accent, "#10B981");
    assert.strictEqual(migrated.sections.budgets.accent, "#F59E0B");
  });

  await runTest("5.3: Section-level customization overrides global preset cascading", async () => {
    const custom = customService.getCanonicalDefaultCustomization();
    custom.global.accent = "#4F46E5"; // Royal Indigo (contrast > 4.5 on white)
    custom.sections.wallets = { accent: "#047857" }; // Dark Emerald (contrast > 4.5 on white)

    const dashboardStyle = customService.resolveMMSectionStyle("dashboard", custom, false, themeService.LIGHT_THEME);
    assert.strictEqual(dashboardStyle.accentColor, "#4F46E5", "Dashboard should inherit global accent");

    const walletsStyle = customService.resolveMMSectionStyle("wallets", custom, false, themeService.LIGHT_THEME);
    assert.strictEqual(walletsStyle.accentColor, "#047857", "Wallets should use section-level override accent");
  });

  // =========================================================================
  // PART 6: Calendar Boundaries, Leap Days, Month-Ends & Date Filtering Parity
  // =========================================================================
  await runTest("6.1: normalizeToLocalDate correctly validates leap days and detects non-leap anomalies", async () => {
    // Leap years: 2024, 2028, 2000 are leap years -> Feb 29 is valid
    assert.strictEqual(mmService.normalizeToLocalDate("2024-02-29"), "2024-02-29");
    assert.strictEqual(mmService.normalizeToLocalDate("2028-02-29"), "2028-02-29");
    assert.strictEqual(mmService.normalizeToLocalDate("2000-02-29"), "2000-02-29");

    // Non-leap years: 2025, 2026, 2027, 1900 (century not div by 400) -> Feb 29 is INVALID
    assert.strictEqual(mmService.normalizeToLocalDate("2025-02-29"), "", "2025-02-29 must be invalid");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-02-29"), "", "2026-02-29 must be invalid");
    assert.strictEqual(mmService.normalizeToLocalDate("2027-02-29"), "", "2027-02-29 must be invalid");
    assert.strictEqual(mmService.normalizeToLocalDate("1900-02-29"), "", "1900-02-29 must be invalid");

    // Date object input
    const d = new Date(Date.UTC(2026, 10, 2)); // Nov 2, 2026
    const norm = mmService.normalizeToLocalDate(d);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(norm));
  });

  await runTest("6.2: normalizeToLocalDate normalizes Bengali numerals to standard ISO dates", async () => {
    const bengaliDate = "২০২৬-১১-০২";
    const normalized = mmService.normalizeToLocalDate(bengaliDate);
    assert.strictEqual(normalized, "2026-11-02");

    const bengaliLeap = "২০২৪-০২-২৯";
    assert.strictEqual(mmService.normalizeToLocalDate(bengaliLeap), "2024-02-29");

    const bengaliInvalidLeap = "২০২৬-০২-২৯";
    assert.strictEqual(mmService.normalizeToLocalDate(bengaliInvalidLeap), "");
  });

  await runTest("6.3: Month-end boundary validations (30-day vs 31-day months)", async () => {
    // 30-day months: April (04), June (06), September (09), November (11)
    assert.strictEqual(mmService.normalizeToLocalDate("2026-04-30"), "2026-04-30");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-04-31"), "", "April 31 is invalid");

    assert.strictEqual(mmService.normalizeToLocalDate("2026-06-30"), "2026-06-30");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-06-31"), "", "June 31 is invalid");

    assert.strictEqual(mmService.normalizeToLocalDate("2026-09-30"), "2026-09-30");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-09-31"), "", "September 31 is invalid");

    assert.strictEqual(mmService.normalizeToLocalDate("2026-11-30"), "2026-11-30");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-11-31"), "", "November 31 is invalid");

    // 31-day months: January (01), March (03), May (05), July (07), August (08), October (10), December (12)
    assert.strictEqual(mmService.normalizeToLocalDate("2026-01-31"), "2026-01-31");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-03-31"), "2026-03-31");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-05-31"), "2026-05-31");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-07-31"), "2026-07-31");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-08-31"), "2026-08-31");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-10-31"), "2026-10-31");
    assert.strictEqual(mmService.normalizeToLocalDate("2026-12-31"), "2026-12-31");
  });

  await runTest("6.4: validateCustomDateRange detects valid, inverted, and malformed intervals", async () => {
    // Valid interval
    const valid = mmService.validateCustomDateRange("2026-01-01", "2026-01-31");
    assert.strictEqual(valid.valid, true);
    assert.strictEqual(valid.startDate, "2026-01-01");
    assert.strictEqual(valid.endDate, "2026-01-31");

    // Inverted interval (end before start)
    const inverted = mmService.validateCustomDateRange("2026-05-15", "2026-05-10");
    assert.strictEqual(inverted.valid, false);
    assert.strictEqual(inverted.error, "end_before_start");

    // Missing dates
    const missing = mmService.validateCustomDateRange(null, "2026-05-10");
    assert.strictEqual(missing.valid, false);
    assert.strictEqual(missing.error, "missing_dates");

    // Invalid calendar date
    const invalidDate = mmService.validateCustomDateRange("2026-02-29", "2026-03-05");
    assert.strictEqual(invalidDate.valid, false);
    assert.strictEqual(invalidDate.error, "invalid_calendar_date");
  });

  await runTest("6.5: getQuickDateRange provides accurate presets from reference date", async () => {
    const todayRef = "2026-11-02";

    const todayRange = mmService.getQuickDateRange("today", todayRef);
    assert.strictEqual(todayRange.valid, true);
    assert.strictEqual(todayRange.startDate, "2026-11-02");
    assert.strictEqual(todayRange.endDate, "2026-11-02");

    const last7Range = mmService.getQuickDateRange("last_7_days", todayRef);
    assert.strictEqual(last7Range.valid, true);
    assert.strictEqual(last7Range.startDate, "2026-10-27");
    assert.strictEqual(last7Range.endDate, "2026-11-02");

    const last30Range = mmService.getQuickDateRange("last_30_days", todayRef);
    assert.strictEqual(last30Range.valid, true);
    assert.strictEqual(last30Range.startDate, "2026-10-04");
    assert.strictEqual(last30Range.endDate, "2026-11-02");

    const thisYearRange = mmService.getQuickDateRange("this_year", todayRef);
    assert.strictEqual(thisYearRange.valid, true);
    assert.strictEqual(thisYearRange.startDate, "2026-01-01");
    assert.strictEqual(thisYearRange.endDate, "2026-11-02");

    const invalidRange = mmService.getQuickDateRange("invalid_preset", todayRef);
    assert.strictEqual(invalidRange.valid, false);
    assert.strictEqual(invalidRange.error, "invalid_preset");
  });

  await runTest("6.6: isDateInPeriod and filterAndSortTransactions filter transactions across periods", async () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, "0");
    const curDateStr = curYear + "-" + curMonth + "-15";

    // this_month checks
    assert.strictEqual(mmService.isDateInPeriod(curDateStr, "this_month"), true);
    assert.strictEqual(mmService.isDateInPeriod("2020-01-01", "this_month"), false);

    // all_time checks
    assert.strictEqual(mmService.isDateInPeriod("2020-01-01", "all_time"), true);
    assert.strictEqual(mmService.isDateInPeriod("2026-11-02", "all_time"), true);

    // custom period checks
    const customRange = {
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    };
    assert.strictEqual(mmService.isDateInPeriod("2026-06-15", "custom", customRange), true);
    assert.strictEqual(mmService.isDateInPeriod("2026-05-31", "custom", customRange), false);
    assert.strictEqual(mmService.isDateInPeriod("2026-07-01", "custom", customRange), false);

    // filterAndSortTransactions with period and customRange
    const sampleTxns = [
      { id: "tx_1", type: "expense", amount: 100, date: curDateStr },
      { id: "tx_2", type: "expense", amount: 200, date: "2020-05-10" },
      { id: "tx_3", type: "income", amount: 500, date: "2026-06-15" },
    ];

    const thisMonthFiltered = mmService.filterAndSortTransactions(sampleTxns, { period: "this_month" });
    assert.strictEqual(thisMonthFiltered.length, 1);
    assert.strictEqual(thisMonthFiltered[0].id, "tx_1");

    const customFiltered = mmService.filterAndSortTransactions(sampleTxns, { period: "custom", customRange });
    assert.strictEqual(customFiltered.length, 1);
    assert.strictEqual(customFiltered[0].id, "tx_3");
  });

  await runTest("6.7: overallBudgetStatus transitions through no_budget, safe, warning and exceeded", async () => {
    const baseState = {
      transactions: [],
      categories: [{ id: "cat_food", name: "খাবার" }],
      accounts: [{ id: "acc_cash", balance: 50000 }],
      overallMonthlyBudget: 0,
    };

    // 0 budget -> no_budget
    const resNoBudget = mmService.calculatePeriodMetrics(baseState, "all_time");
    assert.strictEqual(resNoBudget.overallBudgetStatus, "no_budget");
    assert.strictEqual(resNoBudget.overallBudgetRawPct, 0);

    // Budget 10,000 with 5,000 expense (50%) -> safe
    const stateSafe = {
      ...baseState,
      overallMonthlyBudget: 10000,
      transactions: [{ id: "t1", type: "expense", amount: 5000, date: "2026-11-02", categoryId: "cat_food" }],
    };
    const resSafe = mmService.calculatePeriodMetrics(stateSafe, "all_time");
    assert.strictEqual(resSafe.overallBudgetStatus, "safe");
    assert.strictEqual(resSafe.overallBudgetRawPct, 50);

    // Budget 10,000 with 8,500 expense (85%) -> warning (>= 80% and <= 100%)
    const stateWarn = {
      ...baseState,
      overallMonthlyBudget: 10000,
      transactions: [{ id: "t2", type: "expense", amount: 8500, date: "2026-11-02", categoryId: "cat_food" }],
    };
    const resWarn = mmService.calculatePeriodMetrics(stateWarn, "all_time");
    assert.strictEqual(resWarn.overallBudgetStatus, "warning");
    assert.strictEqual(resWarn.overallBudgetRawPct, 85);

    // Budget 10,000 with 10,000 expense (100%) -> warning (at threshold)
    const stateAt100 = {
      ...baseState,
      overallMonthlyBudget: 10000,
      transactions: [{ id: "t3", type: "expense", amount: 10000, date: "2026-11-02", categoryId: "cat_food" }],
    };
    const resAt100 = mmService.calculatePeriodMetrics(stateAt100, "all_time");
    assert.strictEqual(resAt100.overallBudgetStatus, "warning");
    assert.strictEqual(resAt100.overallBudgetRawPct, 100);

    // Budget 10,000 with 15,000 expense (> 100%) -> exceeded
    const stateExceeded = {
      ...baseState,
      overallMonthlyBudget: 10000,
      transactions: [{ id: "t4", type: "expense", amount: 15000, date: "2026-11-02", categoryId: "cat_food" }],
    };
    const resExceeded = mmService.calculatePeriodMetrics(stateExceeded, "all_time");
    assert.strictEqual(resExceeded.overallBudgetStatus, "exceeded");
    assert.strictEqual(resExceeded.overallBudgetRawPct, 150);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 026 PREFERENCES, THEME & CUSTOMIZATION PARITY VERIFIED!");
  console.log("================================================================");
})();
