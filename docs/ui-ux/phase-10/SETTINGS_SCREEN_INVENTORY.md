# TALLYKHATA — PHASE 10 SETTINGS SCREEN INVENTORY
## Complete Inventory of Discovered Settings Screens, Modals & Subsections

---

## 1. INVENTORY OVERVIEW

This inventory documents all discovered settings screens, modals, bottom sheets, navigation routes, and configuration entry points across the TallyKhata application.

---

## 2. COMPREHENSIVE SETTINGS SCREEN & MODAL CATALOG

| Inventory ID | Screen / Modal Identifier | Trigger Point / Route | Functional Scope & Controls | Persistence Key / Adapter | Underlying Service / Handler |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SET-01** | **Settings & Menu Dashboard** | `activeTab === 'menu'` | Landing screen for business profile hero, report shortcuts, and 7 core settings cards. | `@tallykhata_state_v6` | `App.js` |
| **SET-02** | **Store & Business Profile Settings** | `modalSettings` | Business name, owner name, mobile number, shop address, and opening cash balance. | `@tallykhata_state_v6` | `persistData()` / `storageRepository.js` |
| **SET-03** | **Multi-Business Switcher** | `modalBusinessPicker` | Active business switching, archive business, add new business, and cascade delete. | `@tallykhata_state_v6` | `businessManagementService.js` |
| **SET-04** | **Add Business Profile** | `modalAddBusiness` | New business profile registration with initial opening balance and currency. | `@tallykhata_state_v6` | `persistData()` |
| **SET-05** | **Theme & Appearance Picker** | `modalThemePicker` | Light Mode, Dark Mode, System Default selection with radio pills. | `@tallykhata_app_preferences_v1` | `preferencesService.js` / `themeService.js` |
| **SET-06** | **Language & Localization Picker** | `modalLanguagePicker` | Bengali (বাংলা), English, System Default language selection. | `@tallykhata_app_preferences_v1` | `preferencesService.js` / `i18nService.js` |
| **SET-07** | **PIN Lock & Security Setup** | `modalPinSetup` | 4-digit security PIN setup, change PIN, remove PIN, and biometric toggle. | `@tallykhata_state_v6` | `securityService.js` / `App.js` |
| **SET-08** | **Cloud Backup & Restore** | `modalBackupRestore` | Google Drive OAuth sign-in, user-specific sub isolation, manual backup, and restore. | Google Drive API & `@tallykhata_state_v6` | `googleDriveBackupService.js` |
| **SET-09** | **Personal Money Manager Studio** | `modalMMPreferences` | 8-section visual studio, 6 presets, 4 tint levels, 3 typography scales, and reset. | `@tallykhata_personal_money_manager_v2` | `moneyManagerCustomizationService.js` |
| **SET-10** | **App Notifications & Reminders** | `modalNotifications` (New Phase 10) | Due reminders, Tagada SMS alerts, backup warnings, and daily summary toggles. | `@tallykhata_app_preferences_v1` | `preferencesService.js` |
| **SET-11** | **Data & Storage Management** | `modalDataManagement` (New Phase 10) | Local database stats, storage breakdown, cache clearance, and safe export. | Local Storage & SQLite | `storageRepository.js` |
| **SET-12** | **Tali Pay Wallet Settings** | `modalTxnLimit` | Daily and monthly transaction limits, merchant fee schedule, and verification tiers. | `@tallykhata_state_v6` | `taliPayService.js` |
| **SET-13** | **Help & Customer Support** | `modalSupport` | Helpline phone call, WhatsApp direct message, user feedback form, and FAQs. | External Intent / URL | `Linking.openURL()` |
| **SET-14** | **About & App Information** | `modalAbout` (New Phase 10) | App version (4.0.0), build ID, offline guarantee notice, terms, and privacy policy. | Read-Only Bundle Meta | `App.js` |
