# Ivy Wallet & TallyKhata Same-APK Integration Architecture

## 1. Executive Summary & Objective
This document outlines the architecture for integrating the **Ivy Wallet** application into **TallyKhata** within the same installed Android package (`com.progoti.tallykhata.offline`) and single APK, in full compliance with the GNU General Public License v3.0 (GPL v3.0).

- **Host Application**: TallyKhata (Expo / React Native 0.86, Android package `com.progoti.tallykhata.offline`)
- **Integrated Module**: Ivy Wallet (Kotlin / Jetpack Compose multi-module application)
- **Pinned Ivy Source Revision**: `eb08c930cba1f988a5a8a7d6b5ff15b913d3168a` (v2026.10.22, #3694)
- **Source Repository**: `https://github.com/rocky-ahmed/ivy-wallet`
- **TallyKhata Target Repository**: `https://github.com/rocky-ahmed/tallykhata-manager`
- **License**: GNU General Public License v3.0 (GPL v3.0)

---

## 2. Same-Package / Same-APK Architecture

```
+-------------------------------------------------------------------------------+
|                      Single Installed Android Package                         |
|                       com.progoti.tallykhata.offline                          |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [Launcher Activity: MainActivity.kt]                                         |
|  - React Native / Expo React Host                                             |
|  - Bottom Navigation (টালি, ক্যাশবাক্স, তালিপে, মেন্যু)                         |
|  - Menu Tab -> "আইভি ওয়ালেট (Ivy Wallet)"                                    |
|                                                                               |
|       | Tap                                                                   |
|       v                                                                       |
|  [IvyWalletModule (ReactContextBaseJavaModule)]                               |
|  - Checks native availability of com.ivy.wallet.RootActivity                  |
|  - In full native APK: Launches Intent(context, RootActivity::class.java)     |
|  - In Metro/Dev Client: Triggers modalIvyWallet in-app experience             |
|                                                                               |
|       | Back Button Press                                                     |
|       v                                                                       |
|  [Clean Return to TallyKhata Menu Tab]                                        |
|                                                                               |
+-------------------------------------------------------------------------------+
|                               Data Layer Isolation                            |
|                                                                               |
|   TallyKhata Data Store                       Ivy Wallet Data Store           |
|   - Key: tallybook_offline_data_v6            - Key: @ivy_wallet_state_v1     |
|   - Customer/Supplier Ledgers                 - Personal Accounts (Bank/Cash) |
|   - Cashbox, Inventory, Memos                 - Category Budgets              |
|   - Google Drive AppData Backup               - Personal Income/Expense       |
|   (Strictly isolated; zero leakage)           (Independent & self-contained)  |
+-------------------------------------------------------------------------------+
```

---

## 3. Native Android Bridge & Manifest Integration

1. **Native Module (`IvyWalletModule.kt`)**:
   - Registered under package `com.progoti.tallykhata.offline`.
   - Exposes `@ReactMethod fun openIvyWallet(promise: Promise)`.
   - Attempts to launch `com.ivy.wallet.RootActivity`.
   - Catches `ClassNotFoundException` gracefully to allow dynamic JavaScript fallback during development client execution.
2. **Package Registration (`IvyWalletPackage.kt`)**:
   - Implements `ReactPackage` and provides `IvyWalletModule`.
   - Added to `MainApplication.kt` `PackageList(this).packages.apply { add(IvyWalletPackage()) }`.
3. **Manifest Declaration (`AndroidManifest.xml`)**:
   - Declares `<activity android:name="com.ivy.wallet.RootActivity" android:label="Ivy Wallet" android:exported="false" android:theme="@style/AppTheme" />`.

---

## 4. Data Layer Isolation Guarantees

- **No Contamination**: Ivy Wallet’s data model (Accounts, Categories, Budgets, Personal Transactions) is stored under its own dedicated storage key `@ivy_wallet_state_v1`.
- **TallyKhata Untouched**: TallyKhata’s core relational tables (`account`, `journal`, `ledger`, `costs`, `inventory`, `stock`, `note`, `business`) are completely untouched and never receive foreign Ivy records.
- **Backup Safety**: TallyKhata’s Google Drive backup only serializes `tallybook_offline_data_v6`, ensuring private business backups never mix with personal Ivy transactions.

---

## 5. User Experience & Navigation Lifecycle

1. TallyKhata launches normally as the primary launcher application.
2. User navigates to the **মেন্যু (Menu)** tab.
3. Under **সেটিংস ও অন্যান্য**, a prominent row displays **আইভি ওয়ালেট (Ivy Wallet)** with subtitle **ব্যক্তিগত বাজেট, ইনভেস্টমেন্ট ও আধুনিক খরচ ট্র্যাকার** and a **নতুন (New)** badge.
4. Tapping the row opens Ivy Wallet.
5. Inside Ivy Wallet, user can switch between:
   - **লেনদেন (Transactions)**: Personal income/expense tracking with category icons and timestamps.
   - **অ্যাকাউন্ট (Accounts)**: Cash, Bank, MFS, Card, and Investment balances with net total.
   - **বাজেট (Budgets)**: Category budget limits with progress bars and percentage spent.
   - **পরিসংখ্যান (Analytics)**: Spending breakdown by category.
6. Pressing the top back button or Android hardware back button immediately returns to TallyKhata's Menu tab with the previous scroll and business state preserved.
