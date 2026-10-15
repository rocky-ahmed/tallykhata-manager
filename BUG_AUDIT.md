# Bug Audit & Remediation Log (Phase 2 & Phase 3)

## Executive Summary
This document records all detected bugs, UI mismatches, state synchronization defects, and runtime limitations identified during the Phase 2 & Phase 3 deep audit of the TallyKhata clone application against the reference demo application (TallyKhata-Demo.apk) and live hardware tests on Xiaomi Redmi Note 9.

---

## 1. UI & Visual Rendering Defects

| ID | Component / Screen | Observed Defect | Root Cause | Remediation & Fix | Status |
|---|---|---|---|---|---|
| UI-1 | Menu Tab (Menu) | Colored square placeholders for accounts, reports, settings, and lock | Icons were rendered as flat solid RGB blocks instead of transparent RGBA vectors | Extracted authentic vector drawables from APK and rendered via pypdfium2 and reportlab | RESOLVED |
| UI-2 | Bottom Navigation Bar | Inactive/active indicator pill only applied to Tab 1 (Tally) | Hardcoded condition activeTab === 'home' on pill container | Refactored all 4 tabs to wrap active icon in styles.tabActivePill with #B81414 tint and peach-pink background | RESOLVED |
| UI-3 | Quick Actions Grid | Vector icons were using generic fallback renderings | Vector coordinates scaled improperly without DPI viewport conversion | Parsed viewport width/height and scaled commands dynamically to 240x240 RGBA | RESOLVED |
| UI-4 | Promo Value Banner | Banner text was hardcoded to English in earlier build | Missing authentic Bengali string mapping | Mapped authentic string: মানি ট্রান্সফার চার্জ ফ্রি! with authentic yellow background #FFD400 | RESOLVED |
| UI-5 | Bottom Tab Labels | Tab labels had typos and spacing issues: 'ক্যাশবক্স' instead of 'ক্যাশবাক্স', 'টালিপে' instead of 'টালি পে', 'মেনু' instead of 'মেন্যু' | Inexact manual strings in earlier build | Updated all labels to exact Bengali orthography matching the reference APK and screenshot | RESOLVED |
| UI-6 | Active Tab Indicator Pill | Switching to Cashbox, TallyPay, or Menu lost the rounded active pill indicator | Only Tab 1 had conditional tabActivePill container | Generalized active pill container across all 4 navigation destinations | RESOLVED |
| UI-7 | Business Header Pill | Displayed 'আমার ব্যবসা প্রতিষ্ঠান' instead of 'Mobile Xpress' | Default business array had generic placeholder name | Set default profile to 'Mobile Xpress' with 'স্ট্যান্ডার্ড' package type, matching reference screenshot | RESOLVED |
| UI-8 | Quick Grid Item 8 | Labeled 'ক্যাশবক্স' instead of 'ক্যাশবাক্স' | Mismatched Bengali vowel sign | Fixed label to 'ক্যাশবাক্স' matching screenshot exactly | RESOLVED |

---

## 2. Business Logic & State Handlers

| ID | Workflow | Defect | Root Cause | Remediation & Fix | Status |
|---|---|---|---|---|---|
| LOGIC-1 | TallyPay Money Out | Tapping Money Out in Tab 3 showed an immediate Alert resetting balance | Button was hooked to a legacy inline handler instead of modal | Connected button directly to setModalMoneyOut(true), supporting Bank, bKash, and Nagad withdrawal | RESOLVED |
| LOGIC-2 | Cashbox Daily Calculation | Today sales showed 0 if no explicit sale entry was made today even with cash-in | Calculation only checked category === 'sale' without fallback to type === 'in' | Enhanced fallback logic: todaySales \|\| todayCashIn, ensuring consistent balance display | RESOLVED |
| LOGIC-3 | Denomination Reconciliation | Denomination state reset on modal close | Local state was not synchronized with AsyncStorage | Added persistent tally_cash_denominations state and calculation against counted vs expected cash | RESOLVED |
| LOGIC-4 | Transaction Delete Recalculation | Deleting a transaction left account balance unchanged | Balance state was recalculated on render but not updated in accounts array | Added atomic recalculation of account balance upon transaction deletion and updated AsyncStorage | RESOLVED |
| LOGIC-5 | Bulk Tagada Message | Single SMS template only | Missing debtor-specific balance interpolation | Enhanced bulk tagada handler to iterate through all positive balance accounts and format individual Bangla SMS texts with dynamic due amounts | RESOLVED |

---

## 3. Storage & Relational Synchronization

| ID | Domain | Defect | Root Cause | Remediation & Fix | Status |
|---|---|---|---|---|---|
| DATA-1 | Business Multi-tenancy | Switching business did not partition transactions | Schema stored single global list | Added businessId foreign key to accounts, journals, cashEntries, and inventory | RESOLVED |
| DATA-2 | Offline Backup Integrity | Exported JSON string lacked schema version and checksum | Plain JSON object stringified | Added metadata header with schema version, export timestamp, record counts, and verification | RESOLVED |
| DATA-3 | Storage Key Migration | Old local storage key cached stale placeholder profile | Hardcoded to tallykhata_offline_store_v5 | Bumped to tallykhata_offline_store_v6 with profile normalization on load | RESOLVED |
