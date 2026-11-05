# TALLYKHATA RECONSTRUCTION — ITERATION 240 BACKEND REPORT

**Milestone:** REA-ITER-240 (TallyPay Merchant Cashback, Scratch Card Rewards & Loyalty Points Subsystem)  
**Worker Identity:** Worker 2: Averroes / Peirce (Permanent Backend Developer & Business Logic Architect)  
**Registered Thread ID:** `01a1a349-61ae-74d0-aed6-1792e7d1d594`  
**Target Reference:** REF-001 (`TallyKhata-Demo.apk`, SHA-256: `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`)  
**Date:** 2026-11-05  
**Status:** **100% COMPLETE & VERIFIED (37/37 BACKEND TESTS PASSING, 100% PASS RATE)**  

---

## 1. Executive Summary

Milestone REA-ITER-240 delivers the complete clean-room backend architecture and data persistence layer for the **TallyPay Merchant Cashback, Scratch Card Rewards & Loyalty Points Subsystem**. Based on the reverse engineering investigation of REF-001 (`TpPromoDetailsActivity`, `PromoAdapter`, `CashbackDto`, `OfferInfoBottomSheetDialogFragment`, `classes4.dex`, and `resources.arsc`), this subsystem provides:
1. **Room SQLite Persistence & Schema Invariants:**
   - Table `merchant_reward` (13 columns) with unique index `index_merchant_reward_reward_id` and tenant index `index_merchant_reward_business_id`.
   - Table `merchant_reward_ledger` (10 columns) with unique index `index_merchant_reward_ledger_entry_id` and tenant index `index_merchant_reward_ledger_business_id`.
2. **Financial Arithmetic & Tiered Cashback Engine:**
   - Volume-based cashback rate tiers (Bronze: 0.5% / 50 bps, Silver: 1.0% / 100 bps, Gold: 1.5% / 150 bps, Platinum: 2.0% / 200 bps).
   - Exact integer paisa calculations with zero floating-point drift.
   - Monthly and per-transaction budget capping.
3. **Loyalty Points Earning & Redemption Engine:**
   - 1 coin/point earned per ৳100 (10,000 paisa) transaction volume.
   - 4-tier merchant classification (Bronze: 0+, Silver: 500+, Gold: 2,000+ ["টালিখাতা গোল্ড"], Platinum: 5,000+).
   - Coin-to-cash redemption rate: 10 coins = ৳1.00 (100 paisa) with a 100-coin minimum threshold.
4. **Deterministic Seeded Scratch Card Generator & FSM:**
   - Mulberry32 seeded pseudo-random number generator for reproducible scratch card rewards within configured bounds (৳5–৳100 or 50–500 points).
   - 5-state lifecycle state machine (`LOCKED` -> `UNLOCKED` -> `SCRATCHED` -> `CLAIMED` with `EXPIRED`) and terminal state guardrails.
   - Scratch progress threshold requirement (>= 70%) before transition to revealed/scratched state.
5. **StorageRepository Multi-Tenant Persistence:**
   - Registered `'merchantRewards'` and `'merchantRewardLedger'` in `VALID_COLLECTIONS`, `createDefaultState`, and `sanitizeState`.
   - Multi-tenant CRUD operations strictly isolated by `businessId`.
   - Cascade purge in `deleteBusinessCascade` preserving other tenants.
   - Cloud backup sanitization stripping vouchers, bearer tokens, and credentials while recording exact manifest `recordCounts`.

---

## 2. Architecture & Components Delivered

### 2.1 Room SQLite Schema & DAO Layer (`src/rewardsSubsystem.js`, `src/tallyPayService.js`)

- **Table `merchant_reward`:**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
  - `reward_id`: TEXT NOT NULL UNIQUE
  - `business_id`: TEXT NOT NULL
  - `reward_type`: TEXT NOT NULL (`CASHBACK`, `POINTS`, `VOUCHER`, `SCRATCH_CARD`)
  - `amount_paisa`: INTEGER NOT NULL DEFAULT 0
  - `points`: INTEGER NOT NULL DEFAULT 0
  - `status`: TEXT NOT NULL (`LOCKED`, `UNLOCKED`, `SCRATCHED`, `CLAIMED`, `EXPIRED`)
  - `title`: TEXT NOT NULL
  - `description`: TEXT
  - `expiry_date`: TEXT
  - `claimed_date`: TEXT
  - `created_at`: TEXT NOT NULL
  - `synced`: INTEGER NOT NULL DEFAULT 0
  - Unique Index: `index_merchant_reward_reward_id` ON `merchant_reward` (`reward_id`)
  - Index: `index_merchant_reward_business_id` ON `merchant_reward` (`business_id`)

- **Table `merchant_reward_ledger`:**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
  - `entry_id`: TEXT NOT NULL UNIQUE
  - `business_id`: TEXT NOT NULL
  - `points_change`: INTEGER NOT NULL DEFAULT 0
  - `running_points_balance`: INTEGER NOT NULL DEFAULT 0
  - `cashback_paisa_change`: INTEGER NOT NULL DEFAULT 0
  - `source_event`: TEXT NOT NULL (`TRANSACTION_VOLUME`, `SCRATCH_CARD_CLAIM`, `POINTS_REDEMPTION`, `CAMPAIGN_BONUS`, `EXPIRY_REVERSAL`, `REFERRAL_BONUS`)
  - `reference_id`: TEXT
  - `created_at`: TEXT NOT NULL
  - `synced`: INTEGER NOT NULL DEFAULT 0
  - Unique Index: `index_merchant_reward_ledger_entry_id` ON `merchant_reward_ledger` (`entry_id`)
  - Index: `index_merchant_reward_ledger_business_id` ON `merchant_reward_ledger` (`business_id`)

- **DAO Layer:**
  - `MerchantRewardDao`: `saveReward`, `getRewardById`, `getRewardsByBusinessId`, `updateRewardStatus`, `deleteReward`, `exists`, `getUnsyncedRewards`, `updateRewardSyncStatus`.
  - `MerchantRewardLedgerDao`: `saveEntry`, `getEntriesByBusinessId`, `getRunningPointsBalance`, `getUnsyncedEntries`, `updateEntrySyncStatus`.

### 2.2 Financial Arithmetic & Cashback Tier Engine

- **Tier Structure:**
  - **Bronze:** ৳0 – ৳49,999 (0 – 4,999,999 paisa) -> 50 bps (0.5%)
  - **Silver:** ৳50,000 – ৳99,999 (5,000,000 – 9,999,999 paisa) -> 100 bps (1.0%)
  - **Gold:** ৳100,000 – ৳199,999 (10,000,000 – 19,999,999 paisa) -> 150 bps (1.5%)
  - **Platinum:** ৳200,000+ (20,000,000+ paisa) -> 200 bps (2.0%)
- **Zero Float Drift Guarantee:**
  - All arithmetic is executed in integer paisa using `Math.floor((volumePaisa * rateBps) / 10000)`.
  - Monthly capping enforces maximum allowable cashback across billing cycles.
  - Transaction qualification gates check minimum thresholds (e.g. ৳500).

### 2.3 Loyalty Points Engine & Tier Classification

- **Points Rate:** 1 point per ৳100 (10,000 paisa) volume.
- **Merchant Tiers:**
  - **Bronze:** 0 – 499 coins (+0 bps boost)
  - **Silver:** 500 – 1,999 coins (+25 bps boost, 5 free Tagada SMS)
  - **Gold ("টালিখাতা গোল্ড"):** 2,000 – 4,999 coins (+50 bps boost, 20 free Tagada SMS)
  - **Platinum:** 5,000+ coins (+100 bps boost, 50 free Tagada SMS)
- **Redemption Math:**
  - `pointsToRedeem >= 100` required.
  - `creditedPaisa = Math.floor(points / 10) * 100`.
  - Leftover coins are preserved (`points % 10`).

### 2.4 Deterministic Seeded Scratch Card Generator & FSM

- **Mulberry32 PRNG:**
  - `_mulberry32(seed)` generates repeatable pseudo-random outcomes across devices and test harnesses.
  - Generates either `CASHBACK` (৳5–৳100) or `POINTS` (50–500 coins).
- **Finite State Machine:**
  - Permitted forward transitions: `LOCKED` -> `UNLOCKED` -> `SCRATCHED` -> `CLAIMED`.
  - Aliases supported: `UNSCRATCHED` (mapped to `UNLOCKED`), `REVEALED` (mapped to `SCRATCHED`).
  - Terminal states (`CLAIMED`, `EXPIRED`) reject any subsequent status transitions.
  - Progress gate: `scratchPercentage >= 70` required before card state becomes revealed.

### 2.5 StorageRepository Multi-Tenant Persistence (`src/storageRepository.js`)

- **Methods Implemented:**
  - `saveMerchantReward(businessId, rewardData)`
  - `getMerchantRewards(businessId, options)` & `getMerchantRewardsByBusinessId`
  - `getMerchantRewardById(businessId, rewardId)`
  - `scratchReward(businessId, rewardId, scratchPercentage)`
  - `claimReward(businessId, rewardId, currentWalletBalancePaisa)`
  - `deleteMerchantReward(businessId, rewardId)`
  - `existsMerchantReward(businessId, rewardId)`
  - `getUnsyncedMerchantRewards(businessId, limit)`
  - `updateMerchantRewardSyncStatus(businessId, ids, synced)`
  - `saveRewardLedgerEntry(businessId, entryData)`
  - `getRewardLedger(businessId, options)`
  - `getMerchantRewardPointsBalance(businessId)`
  - `redeemPointsToWallet(businessId, points, currentWalletBalancePaisa)`
  - `getUnsyncedRewardLedgerEntries(businessId, limit)`
  - `updateRewardLedgerSyncStatus(businessId, ids, synced)`
- **Data Safety & Isolation:**
  - Strict tenant filtering prevents cross-tenant data leaks.
  - `deleteBusinessCascade` purges `merchantRewards` and `merchantRewardLedger` for the deleted business while preserving active tenants.
  - `getFullBackupState` sanitizes `voucherCode`, `token`, `apiKey`, and credentials.
  - `commitRestorePayload` restores rewards and ledger in full mode and selective tenant mode.

---

## 3. Verification & Test Results

### 3.1 Suite Execution Summary: `test_iteration_240_rewards_cashback_backend.js`

- Total Test Groups: **10**
- Total Assertions: **37**
- Passed: **37 / 37 (100% Pass Rate)**
- Execution Time: **~1.6s**

### 3.2 Breakdown by Test Group:

| Test Group | Focus Area | Assertions | Result |
| :--- | :--- | :---: | :---: |
| **Group 1** | Enums, Constants & Room SQLite Schema Invariants | 8 | **PASS** |
| **Group 2** | Volume-Based Cashback Tier Engine (Zero Float Drift) | 5 | **PASS** |
| **Group 3** | Loyalty Points Earning, Redemption & Tier Classification | 4 | **PASS** |
| **Group 4** | Deterministic Seeded Scratch Card Generator | 2 | **PASS** |
| **Group 5** | Scratch Card & Reward Lifecycle State Machine (FSM) | 4 | **PASS** |
| **Group 6** | In-Memory Records & DAO Operations | 2 | **PASS** |
| **Group 7** | End-to-End Reward Engine | 5 | **PASS** |
| **Group 8** | StorageRepository Multi-Tenant Persistence & CRUD | 2 | **PASS** |
| **Group 9** | Multi-Tenant Business Isolation & Cascade Deletion | 2 | **PASS** |
| **Group 10** | Cloud Backup Sanitization & High-Throughput Performance Benchmark | 3 | **PASS** |

### 3.3 Reference Architecture Verification: `test_iteration_240_rewards_cashback_reference_architecture.js`

- Total Tests: **137 / 137 PASS (100%)**
- Verifies APK integrity, byte counts, AndroidManifest declarations, XML layouts, drawables, bytecode classes, and authentic Bengali string tokens.

### 3.4 UI & Interaction Integration Suite: `test_iteration_240_ui_rewards_cashback.js`

- Total Tests: **65 / 65 PASS (100%)**
- Verifies bilingual dictionary symmetry, Modals 122–126, interactive scratch card surfaces, stepper controls, hardware BackHandler, touch hit slops, and WCAG 2.1 AA/AAA contrast.

### 3.5 Zero Regression Verification Across Prior Milestones:

- `test_iteration_239_loan_credit_backend.js`: **32 / 32 PASS (100%)**
- `test_iteration_238_qr_order_backend.js`: **67 / 67 PASS (100%)**
- `test_iteration_236_settlement_backend.js`: **36 / 36 PASS (100%)**
- `test_iteration_235_recharge_backend.js`: **31 / 31 PASS (100%)**

---

## 4. Integration Notes for Worker 3 (Ohm) & Production State

- All backend reward and cashback APIs are available on `src/tallyPayService.js` and `src/storageRepository.js`.
- Test hooks (`global.__REWARDS_CASHBACK_TEST_HOOKS__`) in `App.js` communicate directly with these underlying engines.
- Scratch reveal operations trigger `scratchReward(businessId, rewardId, scratchPercentage)` and `claimReward(businessId, rewardId, currentWalletBalancePaisa)` with automatic ledger recording.
- Points redemptions invoke `redeemPointsToWallet(businessId, points, currentWalletBalancePaisa)` ensuring exact Taka conversion (10 points = ৳1.00).

---

## 5. Compliance & Git Safety Policy

1. **Git Policy Strictly Obeyed:**
   - Zero git commits or pushes executed.
   - Working tree preserved; untracked `extracted_apk/` and backup files remain untouched.
2. **Frontend Boundary Obeyed:**
   - `App.js` left intact without modifications during backend implementation.
3. **Multi-Tenant Safety:**
   - All reward data structures and queries are scoped strictly by `businessId`.
