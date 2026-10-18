# TEST COVERAGE MATRIX — AUTOMATED & PHYSICAL VERIFICATION

## 1. Automated Test Suites Summary

| Test Suite File | Domain & Scope | Test Count | Assertions Passed | Exit Status | Coverage Summary |
|---|---|---|---|---|---|
| `test_phase3_1.js` | Core Ledger & Persistence | 9 | 9 / 9 | 0 (PASS) | Ledger recalculation, cashbox linkage, cascade delete, write queue, data migration |
| `test_phase3_2.js` | Production-Path Reliability | 12 | 12 / 12 | 0 (PASS) | Customer & supplier chronologies, date ordering, validation rules, disk failure recovery |
| `test_phase3_3.js` | Data Integrity & Concurrency | 18 | 18 / 18 | 0 (PASS) | Opening balance baselines, non-discrepancy recovery, concurrent notes/cash/accounts/stock |
| `test_phase3_4_features.js` | Feature Settings & Flags | 3 | 3 / 3 | 0 (PASS) | Tally message balance persistence, SMS packages, account type filtering |
| `test_phase4_backup_controls.js` | Backup & Cloud Controls | 6 | 6 / 6 | 0 (PASS) | JSON export checksum, unauthenticated prompts, cloud restore validation, account disconnection |
| **TOTAL** | **Full System Suite** | **48** | **48 / 48** | **100% PASS** | **All core business logic, persistence, and state mechanics verified** |

## 2. Physical Device End-to-End Verification (Xiaomi Redmi Note 9)

| Target Screen / Flow | Action Performed | Expected Device Outcome | Observed Physical Result | Verdict |
|---|---|---|---|---|
| Metro Server & Tunnel | `adb reverse tcp:8081 tcp:8081` | Dev Client connects and bundles JS | "Bundling 100%", Fast Refresh active | PASS |
| Home / টালি Ledger | View customer balances | Red & green totals match accounting | ১,১০,০০০ মোট পাবো, ০ মোট দেবো | PASS |
| Account Details | Tap Raihan ★ khoksha | Customer detail ledger opens | Details, call, tagada, and journal history | PASS |
| Credit Entry (- দিলাম) | Enter 1,000 with "+চাল" tag | Balance updates from 7,500 to 8,500 | Live recalculation with instant feedback | PASS |
| Global Re-computation | Return to Home screen | মোট পাবো updates from ১,০৯,০০০ to ১,১০,০০০ | Global balance recomputed instantly | PASS |
| Tab 2 / ক্যাশবাক্স | Tap ক্যাশবাক্স tab | Cashbox dashboard and categories render | Balance ৳ 9,250, entries listed | PASS |
| Tab 3 / টালিপে | Tap টালিপে tab | Wallet, Bangla QR banner, MFS render | Balance ৳ 1,500, bKash/Nagad/Rocket | PASS |
| Tab 4 / মেন্যু | Tap মেন্যু tab | Profile, reports, and settings render | Business card, analytics, backup link | PASS |
| Google Drive Backup | Open Backup & Restore | Shows connected account & 5 controls | ROCKY AHMED (khalbococ@gmail.com) | PASS |
