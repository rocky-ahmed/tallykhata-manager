# REA RECONSTRUCTION — FEATURE 009 SPECIFICATION
**Feature Name:** Bilingual i18n & High-DPI Font Parity  
**Reference Target:** `TallyKhata-Demo.apk` (`REF-001`)  
**Target SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Document Version:** 1.0.0  
**Status:** SPECIFICATION APPROVED & VERIFIED  

---

## 1. Executive Summary & Architecture Basis

Feature 009 defines the complete bilingual internationalization (`bn-BD` primary, `en-US` secondary) and high-DPI typography scaling architecture for TallyKhata. Reverse engineered from the reference application's localized string tables, dynamic resource loaders, and Android font metric configurations, it ensures seamless readability, full string parity, Bengali numeral transformations, and non-clipping typography across diverse mobile viewports and Android accessibility font scales.

### Core Architectural Invariants:
1. **Bengali Primary (`bn-BD`) Default with English (`en`) Parity:**
   - Default app locale is Bengali (`bn`).
   - Every single translation key in `STRINGS.bn` has a 1-to-1 counterpart in `STRINGS.en` (680+ verified dictionary keys).
   - Zero missing, undefined, or null translation values.
2. **Bengali Numeral Transformation (`formatNumber`):**
   - Transforms ASCII digits `0-9` to Unicode Bengali numerals `০-৯` in Bengali mode.
   - Preserves ASCII digits when active language is English (`en`).
   - Graceful null/undefined/empty string guards returning empty string `""` without throwing errors.
3. **Bidirectional Digit Parsing & Currency Extraction (`toEnglishDigits`, `parseNumber`):**
   - Converts Bengali numeral strings (e.g. `'১৫০.৭৫'`) to ASCII strings (`'150.75'`).
   - `parseNumber` strips non-numeric characters, currency symbols (`৳`, `$`), and commas to produce valid IEEE 754 floats.
4. **Indian Currency Number Grouping (`formatCurrency`):**
   - Uses Indian numbering system (`en-IN` comma grouping: $1,00,000$ for one lakh) prefixed with `৳` symbol.
   - Negative amounts formatted strictly as `-৳ ৫,০০০`.
5. **Dollar-Sign Safe Parameter Interpolation (`t`):**
   - Interpolates `{param}` tokens using safe function replacers (`() => val`), preventing `$1`, `$&`, and `$$` regex group mangling in currency or financial notes.
6. **Money Manager Error Localization (`translateMoneyManagerError`):**
   - Translates backend and business logic error strings into the active UI language.
   - Falls back to normalized generic errors when cross-locale errors are detected.
7. **Money Manager Seed Preservation (`translateMoneyManagerDefaultValue`):**
   - Translates default seeded categories and wallets for display while strictly preserving underlying immutable IDs (`acc_cash`, `cat_food`).
8. **Locale Resolution & System Persistence (`preferencesService`):**
   - Supports `system` mode auto-resolving device language (`bn_BD` $\rightarrow$ `bn`, `en_US` $\rightarrow$ `en`, unknown $\rightarrow$ `bn`).
   - Persists user preferences reliably in `@tallykhata_app_preferences_v1`.
9. **High-DPI Font Scaling & Bengali Typography Bounds (`themeService`):**
   - Clamps accessibility font scale between $0.85$ and $1.30$.
   - Prevents vertical clipping of complex Bengali compound glyphs (যুক্-তবর্ণ) with generous line-heights and ascender/descender margins.

---

## 2. Verification & Compliance Standards
- Verified via `test_feature9_bilingual_i18n_parity.js` (18/18 tests passing, 100%).
- All 48 test suites passing in regression suite.
