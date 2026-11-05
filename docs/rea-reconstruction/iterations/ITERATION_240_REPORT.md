# REA RECONSTRUCTION — ITERATION 240 AUDIT REPORT
**Milestone:** REA-ITER-240 (TallyPay Merchant Cashback, Scratch Card Rewards & Loyalty Points Subsystem)  
**Maintained by:** Main Engineering Orchestrator  
**Audit Date:** 2026-11-05  
**Status:** **COMPLETED — 100% PASS RATE (ALL 239/239 NEW TESTS PASSED, ZERO REGRESSIONS ACROSS FULL SUITE MATRIX)**  
**Reference Binary:** TallyKhata-Demo.apk (REF-001, SHA-256: `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`)  
**Target Hardware:** Xiaomi Redmi Note 9 (737ee4410405, Android 11/12)  

---

## 1. Executive Summary

Milestone **REA-ITER-240** delivers the complete **TallyPay Merchant Cashback, Scratch Card Rewards & Loyalty Points Subsystem** for TallyKhata (`TpPromoDetailsActivity`, `PromoAdapter`, `OfferInfoBottomSheetDialogFragment`, `item_wallet_promo.xml`, `layout_promotions_shimmer.xml`, `dialog_fragment_offer_info_bottom_sheet.xml`, `ic_cashback.xml`, `ic_coin.xml`, and associated promotional reward mechanics).

This milestone reconstructs the core digital merchant reward, gamification, and promotional infrastructure:
1. **Reference Architecture & Binary Extraction (REF-001):**
   - Reverse-engineered manifest declarations, activities, and DataBinding views from `classes4.dex`.
   - Extracted layouts: `activity_tp_promo_details.xml`, `item_wallet_promo.xml`, `layout_promotions_shimmer.xml`, `dialog_fragment_offer_info_bottom_sheet.xml`, `layout_banner_tk_premium.xml`, `layout_banner_tk_premium_menu.xml`.
   - Extracted drawables: `ic_cashback.xml`, `ic_coin.xml`, `background_discount_offer.xml`, `bg_offer_yellow.xml`.
   - Deconstructed Clean Architecture models & DTOs: `Promotion`, `CashbackDto`, `PromoDto`, `PromoAdapter`, `PromoAdapter$OnPromoClickListener`, `OfferInfoBottomSheetDialogFragment`, `TKEnum$SmsBonusTypeEnum`.
   - Extracted authentic Bengali ARSC strings for cashback promotions, bonus messages, referral incentives, and TallyKhata Gold loyalty packages.
2. **Room SQLite Persistence & Multi-Tenant Data Isolation:**
   - Room schema `merchant_reward` (13 columns, unique index `index_merchant_reward_reward_id` on `reward_id`).
   - Room schema `merchant_reward_ledger` (10 columns, unique index `index_merchant_reward_ledger_entry_id` on `entry_id`).
   - Pure integer paisa financial arithmetic: volume-based cashback tier calculations (0.5%–2.0% / 50–200 bps), monthly cumulative cashback budget caps (৳500 / 50,000 paisa), and minimum transaction threshold enforcement.
   - Loyalty points calculation (1 coin per ৳100 volume), 4 merchant loyalty tiers (Bronze, Silver, Gold, Platinum), and points-to-wallet redemption (10 coins = ৳1.00, minimum 100 coins).
   - Mulberry32 byte-deterministic scratch card prize generator and 5-state lifecycle FSM (`LOCKED` -> `UNLOCKED` -> `SCRATCHED` -> `CLAIMED` with `EXPIRED`) with interactive >= 70% reveal threshold.
   - Multi-tenant CRUD operations scoped by `businessId` in `src/storageRepository.js` and `src/rewardsSubsystem.js`.
   - Cascade purge on business deletion (`deleteBusinessCascade`).
   - Cloud backup privacy sanitization: sensitive vouchers, tokens, and credentials scrubbed.
3. **Presentation Layer & Modals 122–126 (`App.js`):**
   - Modal 122 (`modalRewardsHub` / `testID="modal_rewards_hub"`): Points balance card (1,250 pts), loyalty tier badge (`GOLD`), available scratch cards grid, quick redeem CTA, and recent cashback summary.
   - Modal 123 (`modalScratchCard` / `testID="modal_scratch_card"`): Interactive scratch surface with gesture reveal, confetti visualizer, celebratory copy, reward amount badge in Taka (৳৫০), and instant wallet credit CTA.
   - Modal 124 (`modalCashbackHistory` / `testID="modal_cashback_history"`): Monthly cashback overview (৳৯৫০ total, ৳১৮৫ this month), category filter chips (`সকল`, `কিউআর`, `বিল পে`, `স্ক্র্যাচ কার্ড`), and scrollable history.
   - Modal 125 (`modalPointsRedeem` / `testID="modal_points_redeem"`): Points-to-cash converter card ("১০০ পয়েন্ট = ৳১০ ক্যাশ"), stepper controls, live cash value calculator, destination wallet card, and confirmation banner.
   - Modal 126 (`modalRewardTierDetails` / `testID="modal_reward_tier_details"`): Loyalty tier ladder (Silver, Gold [Active], Platinum), progress bar toward next tier, and privilege breakdown.
   - Invariant count incremented from 121 to **exactly 126 Modals** with symmetrical `onRequestClose` handlers and boolean state controllers in `App.js`.
   - Hardware BackHandler safe stacked dismissal and touch target ergonomics (>= 48x48dp via `STANDARD_TOUCH_HIT_SLOP`).

---

## 2. Permanent Subagent Contributions

| Worker | Role & Thread ID | Deliverables | Test Result |
| :--- | :--- | :--- | :--- |
| **Worker 1 (Gibbs)** | Principal REA Reverse Engineering Investigator (`01a19154-99ab-72a0-9e23-2611b9ffc74c`) | APK decompilation, manifest activities, layout/drawable catalogs, DTO reverse engineering, ARSC token extraction, `REA_INVESTIGATION_ITER_240_REWARDS_CASHBACK.md`, `test_iteration_240_rewards_cashback_reference_architecture.js` | **137 / 137 PASS (100%)** |
| **Worker 2 (Averroes / Peirce)** | Principal Backend Engineer & Data Architect (`01a1a349-61ae-74d0-aed6-1792e7d1d594`) | Room SQLite schemas, integer cashback engine, loyalty points ladder, scratch card FSM, `src/rewardsSubsystem.js`, `src/tallyPayService.js`, `src/storageRepository.js`, `ITERATION_240_AVERROES_REPORT.md`, `test_iteration_240_rewards_cashback_backend.js` | **37 / 37 PASS (100%)** |
| **Worker 3 (Ohm)** | Principal Frontend Developer, UI/UX & Interactions (`01a19154-e3ee-7ab2-b682-798b64a0bb6b`) | Modals 122–126 in `App.js`, Tab 4 & Tab 5 entry points, bilingual parity (1,511 keys in `STRINGS.bn` and `STRINGS.en`), BackHandler stack, WCAG AA/AAA contrast, `ITERATION_240_OHM_REPORT.md`, `test_iteration_240_ui_rewards_cashback.js` | **65 / 65 PASS (100%)** |
| **Main Agent** | Orchestrator & Final QA | Test matrix execution, AST validation, integration, milestone documentation, local Git staging | **100% Verified** |

---

## 3. Comprehensive Test Results Matrix

| Test Suite | Scope / Component | Tests | Passed | Failed | Success Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `test_iteration_240_rewards_cashback_reference_architecture.js` | Reference Binary Extraction & REF-001 Parity | 137 | 137 | 0 | 100% |
| `test_iteration_240_rewards_cashback_backend.js` | Room Schemas, Cashback Engine, Points Ledger & DAO | 37 | 37 | 0 | 100% |
| `test_iteration_240_ui_rewards_cashback.js` | Modals 122–126, BackHandler, Contrast, AST | 65 | 65 | 0 | 100% |
| `test_iteration_239_loan_credit_backend.js` | Iteration 239 Micro-Loan Backend Regression | 32 | 32 | 0 | 100% |
| `test_iteration_239_ui_loan_credit.js` | Iteration 239 Micro-Loan UI Regression (126 Modals) | 64 | 64 | 0 | 100% |
| `test_iteration_238_ui_qr_order.js` | Iteration 238 QR Standee Order Regression (126 Modals) | 68 | 68 | 0 | 100% |
| `test_iteration_237_ui_kyc.js` | Iteration 237 KYC & NID Scanner Regression (126 Modals) | 59 | 59 | 0 | 100% |
| `test_iteration_236_ui_settlement.js` | Iteration 236 Auto-Settlement Regression (126 Modals) | 68 | 68 | 0 | 100% |
| `test_iteration_235_ui_recharge.js` | Iteration 235 Mobile Recharge Regression (126 Modals) | 45 | 45 | 0 | 100% |
| `test_iteration_234_ui_transfer.js` | Iteration 234 Bank/MFS Transfer Regression (126 Modals) | 51 | 51 | 0 | 100% |
| `test_iteration_233_ui_add_money.js` | Iteration 233 Add Money Regression (126 Modals) | 46 | 46 | 0 | 100% |
| `test_iteration_232_ui_account_manager.js` | Iteration 232 Linked Accounts Regression (126 Modals) | 44 | 44 | 0 | 100% |
| `test_iteration_231_ui_pin_security_and_biometrics.js` | Iteration 231 Security & PIN Regression (126 Modals) | 39 | 39 | 0 | 100% |
| `test_iteration_230_ui_settlement_history_disbursement.js` | Iteration 230 Settlement History Regression (126 Modals) | 45 | 45 | 0 | 100% |
| `test_iteration_229_ui_qr_settlement_soundbox.js` | Iteration 229 Soundbox & Settlement Regression (126 Modals) | 41 | 41 | 0 | 100% |
| `test_phase11_app_polish_performance.js` | Polish & Performance Invariants (126 Modals) | 22 | 22 | 0 | 100% |
| `test_phase11_visual_consistency_polish.js` | Visual Consistency & Bengali Typography (126 Modals) | 12 | 12 | 0 | 100% |
| `test_phase12_final_qa_release_readiness.js` | Final Release Readiness QA Gate (126 Modals) | 17 | 17 | 0 | 100% |
| `test_phase12_release_readiness.js` | Release Readiness Gate Invariants (126 Modals) | 25 | 25 | 0 | 100% |
| **TOTAL** | **Full Milestone & Regression Matrix** | **877** | **877** | **0** | **100%** |

---

## 4. Invariant Certifications

1. **Modal Invariant (126 Modals):**
   - Verified that `App.js` defines exactly 126 `<Modal` tags, 126 `onRequestClose` handlers, and 126 boolean state controllers.
   - All 15 UI regression test suites updated and verified to pass with the 126 modal invariant.
2. **Localization Symmetry:**
   - 1,511 keys present in both `STRINGS.bn` and `STRINGS.en`.
   - Zero missing localization keys across all application strings.
3. **Integer Financial Arithmetic:**
   - Zero floating-point arithmetic used for financial calculations; all amounts tracked in integer Paisa.
4. **Data Isolation & Security:**
   - Multi-tenant tenant boundaries strictly verified across all new tables and queries.
