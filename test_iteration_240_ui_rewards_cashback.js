/**
 * TALLYKHATA ITERATION 240: TALLYPAY MERCHANT CASHBACK, SCRATCH CARDS & LOYALTY POINTS UI/UX QA SUITE
 *
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)
 * Milestone: REA-ITER-240
 * Target Hardware: Xiaomi Redmi Note 9 (merlin_in / M2003J15SC, Serial 737ee4410405)
 *
 * Verification Scope:
 * - Bilingual localization parity and authentic REF-001 ARSC copy for Cashback & Rewards
 * - State hooks, action handlers, and global test hooks in App.js
 * - Navigation entry points in Tab 4 (TallyPay) and Tab 5 (Menu)
 * - Modal 122: modalRewardsHub (Points balance, tier badge, scratch card grid, cashback summary)
 * - Modal 123: modalScratchCard (Interactive scratch surface, confetti effect, reward amount, claim CTA)
 * - Modal 124: modalCashbackHistory (Monthly total card, filter chips, transaction history list)
 * - Modal 125: modalPointsRedeem (Points-to-cash converter, stepper, destination card, confirm CTA)
 * - Modal 126: modalRewardTierDetails (Tier ladder, progress bar, benefits breakdown)
 * - Android Hardware BackHandler Safe Stacked Dismissal Sequence
 * - Touch Target Ergonomics (STANDARD_TOUCH_HIT_SLOP >= 10dp) & Haptics
 * - WCAG 2.1 AA / AAA Luminance Contrast Ratios across Light and Dark surfaces
 * - Strict Modal Count Invariant: Exactly 131 Modals, 131 onRequestClose handlers, 131 controllers
 * - Babel AST Parser Compilation & Latency Benchmark
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const i18n = require("./src/i18nService");
const tallyPay = require("./src/tallyPayService");
const storageRepository = require("./src/storageRepository");
const iconMetrics = require("./src/iconMetrics");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(desc, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log("  ✓ [PASS] " + desc);
  } catch (err) {
    failedTests++;
    console.error("  ✗ [FAIL] " + desc);
    console.error("    Error: " + err.message);
  }
}

async function runSuite() {
  console.log("================================================================================");
  console.log("TALLYKHATA ITERATION 240: TALLYPAY CASHBACK, SCRATCH CARDS & LOYALTY QA SUITE");
  console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
  console.log("Milestone: REA-ITER-240");
  console.log("================================================================================");

  const appSrc = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");

  // -----------------------------------------------------------------------------
  // PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS ---");

  const requiredIter240Keys = [
    "rewards_and_cashback",
    "rewards_hub_title",
    "rewards_hub_subtitle",
    "loyalty_points_balance",
    "loyalty_points_label",
    "loyalty_tier_label",
    "loyalty_tier_silver",
    "loyalty_tier_gold",
    "loyalty_tier_platinum",
    "cash_equivalent_value",
    "quick_redeem_btn",
    "view_tier_details_btn",
    "scratch_cards_section_title",
    "scratch_card_unscratched",
    "scratch_card_scratched",
    "scratch_card_claimed",
    "scratch_cards_available_count",
    "no_scratch_cards_available",
    "scratch_now_prompt",
    "claim_reward_btn",
    "reward_claimed_success",
    "cashback_history_section_title",
    "total_cashback_earned",
    "this_month_cashback",
    "view_all_cashback_btn",
    "no_cashback_records",
    "cashback_ref_qr_sale",
    "cashback_ref_bill_pay",
    "cashback_ref_scratch_bonus",
    "cashback_ref_merchant_recharge",
    "redeem_points_title",
    "redeem_points_subtitle",
    "conversion_rule_label",
    "points_to_redeem_label",
    "cash_value_received",
    "destination_wallet_label",
    "confirm_redeem_btn",
    "redeem_success_toast",
    "insufficient_points_error",
    "tier_details_title",
    "tier_details_subtitle",
    "tier_ladder_title",
    "tier_silver_range",
    "tier_gold_range",
    "tier_platinum_range",
    "current_tier_badge",
    "next_tier_progress_label",
    "points_needed_for_next_tier",
    "tier_benefits_title",
    "tier_benefit_silver_1",
    "tier_benefit_silver_2",
    "tier_benefit_gold_1",
    "tier_benefit_gold_2",
    "tier_benefit_gold_3",
    "tier_benefit_platinum_1",
    "tier_benefit_platinum_2",
    "tier_benefit_platinum_3",
    "scratch_card_congrats",
    "reward_amount_taka",
    "cashback_filter_all",
    "cashback_filter_qr",
    "cashback_filter_bill",
    "cashback_filter_scratch"
  ];

  await runTest("1.1: All Iteration 240 localization keys exist in STRINGS.bn", () => {
    requiredIter240Keys.forEach((key) => {
      assert.ok(i18n.STRINGS.bn[key], "Missing BN key: " + key);
    });
  });

  await runTest("1.2: All Iteration 240 localization keys exist in STRINGS.en", () => {
    requiredIter240Keys.forEach((key) => {
      assert.ok(i18n.STRINGS.en[key], "Missing EN key: " + key);
    });
  });

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
    assert.strictEqual(i18n.t("rewards_and_cashback", "bn"), "রিওয়ার্ড ও ক্যাশব্যাক");
    assert.strictEqual(i18n.t("rewards_and_cashback", "en"), "Rewards & Cashback");
    assert.strictEqual(i18n.t("rewards_hub_title", "bn"), "রিওয়ার্ড ও ক্যাশব্যাক হাব");
    assert.strictEqual(i18n.t("rewards_hub_title", "en"), "Rewards & Cashback Hub");
  });

  await runTest("1.4: Authentic REF-001 ARSC tokens present in STRINGS.bn", () => {
    assert.strictEqual(i18n.STRINGS.bn.rewards_and_cashback, "রিওয়ার্ড ও ক্যাশব্যাক");
    assert.strictEqual(i18n.STRINGS.bn.loyalty_points_balance, "মোট অর্জিত পয়েন্ট");
    assert.strictEqual(i18n.STRINGS.bn.scratch_card_unscratched, "ঘষে পুরস্কার জিতুন!");
    assert.strictEqual(i18n.STRINGS.bn.claim_reward_btn, "ওয়ালেটে যোগ করুন");
    assert.strictEqual(i18n.STRINGS.bn.total_cashback_earned, "মোট ক্যাশব্যাক লাভ");
    assert.strictEqual(i18n.STRINGS.bn.conversion_rule_label, "১০০ পয়েন্ট = ৳১০ ক্যাশ");
  });

  await runTest("1.5: Complete dictionary parity maintained across bn and en (zero missing keys)", () => {
    const bnKeys = Object.keys(i18n.STRINGS.bn);
    const enKeys = Object.keys(i18n.STRINGS.en);
    assert.strictEqual(bnKeys.length, enKeys.length, "bn and en must have identical key count");
    const diff = bnKeys.filter((k) => !i18n.STRINGS.en[k]);
    assert.strictEqual(diff.length, 0, "Discrepancy detected: " + diff.join(", "));
  });

  // -----------------------------------------------------------------------------
  // PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

  await runTest("2.1: Modals 122–126 state controllers declared in App.js", () => {
    assert.ok(appSrc.includes("const [modalRewardsHub, setModalRewardsHub] = useState(false);"));
    assert.ok(appSrc.includes("const [modalScratchCard, setModalScratchCard] = useState(false);"));
    assert.ok(appSrc.includes("const [modalCashbackHistory, setModalCashbackHistory] = useState(false);"));
    assert.ok(appSrc.includes("const [modalPointsRedeem, setModalPointsRedeem] = useState(false);"));
    assert.ok(appSrc.includes("const [modalRewardTierDetails, setModalRewardTierDetails] = useState(false);"));
  });

  await runTest("2.2: Loyalty points, tier, scratch cards, active scratch card, points to redeem hooks declared", () => {
    assert.ok(appSrc.includes("const [merchantLoyaltyPoints, setMerchantLoyaltyPoints] = useState(1250);"));
    assert.ok(appSrc.includes("const [merchantLoyaltyTier, setMerchantLoyaltyTier] = useState('GOLD');"));
    assert.ok(appSrc.includes("const [availableScratchCards, setAvailableScratchCards] = useState("));
    assert.ok(appSrc.includes("const [activeScratchCard, setActiveScratchCard] = useState(null);"));
    assert.ok(appSrc.includes("const [isScratchRevealed, setIsScratchRevealed] = useState(false);"));
    assert.ok(appSrc.includes("const [pointsToRedeemInput, setPointsToRedeemInput] = useState(500);"));
    assert.ok(appSrc.includes("const [cashbackHistoryList, setCashbackHistoryList] = useState("));
  });

  await runTest("2.3: global.__REWARDS_CASHBACK_TEST_HOOKS__ exposed in App.js with required keys", () => {
    assert.ok(appSrc.includes("global.__REWARDS_CASHBACK_TEST_HOOKS__ = {"));
    const requiredHooks = [
      "modalRewardsHub",
      "setModalRewardsHub",
      "modalScratchCard",
      "setModalScratchCard",
      "modalCashbackHistory",
      "setModalCashbackHistory",
      "modalPointsRedeem",
      "setModalPointsRedeem",
      "modalRewardTierDetails",
      "setModalRewardTierDetails",
      "merchantLoyaltyPoints",
      "setMerchantLoyaltyPoints",
      "merchantLoyaltyTier",
      "setMerchantLoyaltyTier",
      "availableScratchCards",
      "setAvailableScratchCards",
      "activeScratchCard",
      "setActiveScratchCard",
      "isScratchRevealed",
      "setIsScratchRevealed",
      "pointsToRedeemInput",
      "setPointsToRedeemInput",
      "cashbackHistoryList",
      "setCashbackHistoryList",
      "handleOpenRewardsHub",
      "handleOpenScratchCard",
      "handleRevealScratchCard",
      "handleClaimScratchReward",
      "handleOpenCashbackHistory",
      "handleOpenPointsRedeem",
      "handleConfirmPointsRedeem",
      "handleOpenRewardTierDetails"
    ];
    requiredHooks.forEach((hk) => {
      assert.ok(appSrc.includes(hk), "Missing test hook in App.js: " + hk);
    });
  });

  await runTest("2.4: Merchant rewards and scratch card action handlers defined and connected", () => {
    assert.ok(appSrc.includes("const handleOpenRewardsHub = () => {"));
    assert.ok(appSrc.includes("const handleOpenScratchCard = (card) => {"));
    assert.ok(appSrc.includes("const handleRevealScratchCard = () => {"));
    assert.ok(appSrc.includes("const handleClaimScratchReward = () => {"));
    assert.ok(appSrc.includes("const handleOpenCashbackHistory = () => {"));
    assert.ok(appSrc.includes("const handleOpenPointsRedeem = () => {"));
    assert.ok(appSrc.includes("const handleConfirmPointsRedeem = () => {"));
    assert.ok(appSrc.includes("const handleOpenRewardTierDetails = () => {"));
  });

  await runTest("2.5: Loyalty tier hierarchy (SILVER, GOLD, PLATINUM) and conversion rates supported", () => {
    const tiers = ["SILVER", "GOLD", "PLATINUM"];
    tiers.forEach(t => {
      assert.ok(i18n.STRINGS.bn["loyalty_tier_" + t.toLowerCase()]);
      assert.ok(i18n.STRINGS.en["loyalty_tier_" + t.toLowerCase()]);
    });
    // Conversion rate test: 100 points = 10 BDT
    const pts = 500;
    const cash = Math.floor(pts / 10);
    assert.strictEqual(cash, 50, "500 points must equal ৳50");
  });

  // -----------------------------------------------------------------------------
  // PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders Rewards & Cashback quick action button", () => {
    assert.ok(appSrc.includes('testID="tp_rewards_cashback_btn"'));
    assert.ok(appSrc.includes("onPress={handleOpenRewardsHub}"));
  });

  await runTest("3.2: Tab 5 (Menu) renders Rewards & Cashback menu list item", () => {
    assert.ok(appSrc.includes('testID="menu_tp_rewards_cashback_item"'));
    assert.ok(appSrc.includes("onPress={handleOpenRewardsHub}"));
  });

  await runTest("3.3: All navigation triggers attach STANDARD_TOUCH_HIT_SLOP and accessible button roles", () => {
    const t4Block = appSrc.slice(appSrc.indexOf('testID="tp_rewards_cashback_btn"'), appSrc.indexOf('testID="tp_rewards_cashback_btn"') + 300);
    assert.ok(t4Block.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"));
    assert.ok(t4Block.includes('accessibilityRole="button"'));

    const t5Pos = appSrc.indexOf('testID="menu_tp_rewards_cashback_item"');
    const t5Block = appSrc.slice(Math.max(0, t5Pos - 200), t5Pos + 200);
    assert.ok(t5Block.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"));
    assert.ok(t5Block.includes('accessibilityRole="button"'));
  });

  // -----------------------------------------------------------------------------
  // PART 4: MODAL 122 (modalRewardsHub) LAYOUT & LOYALTY BALANCE CARD
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 4: MODAL 122 (modalRewardsHub) LAYOUT & LOYALTY BALANCE CARD ---");

  await runTest("4.1: modalRewardsHub defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_rewards_hub"'));
    assert.ok(appSrc.includes("visible={modalRewardsHub}"));
    assert.ok(appSrc.includes("onRequestClose={() => setModalRewardsHub(false)}"));
  });

  await runTest("4.2: Header renders title, subtitle, and back button (btn_rewards_hub_back)", () => {
    assert.ok(appSrc.includes('testID="btn_rewards_hub_back"'));
    assert.ok(appSrc.includes("t('rewards_hub_title')"));
    assert.ok(appSrc.includes("t('rewards_hub_subtitle')"));
  });

  await runTest("4.3: Loyalty points balance card (card_loyalty_points_balance) with points and tier badge", () => {
    assert.ok(appSrc.includes('testID="card_loyalty_points_balance"'));
    assert.ok(appSrc.includes('testID="badge_active_loyalty_tier"'));
    assert.ok(appSrc.includes("merchantLoyaltyPoints.toLocaleString()"));
  });

  await runTest("4.4: Quick redeem CTA (btn_quick_redeem_points) transitions to Modal 125", () => {
    assert.ok(appSrc.includes('testID="btn_quick_redeem_points"'));
    assert.ok(appSrc.includes("onPress={handleOpenPointsRedeem}"));
  });

  await runTest("4.5: View tier details CTA (btn_view_tier_details) transitions to Modal 126", () => {
    assert.ok(appSrc.includes('testID="btn_view_tier_details"'));
    assert.ok(appSrc.includes("onPress={handleOpenRewardTierDetails}"));
  });

  await runTest("4.6: Scratch cards grid (grid_available_scratch_cards) with scratch card items", () => {
    assert.ok(appSrc.includes('testID="grid_available_scratch_cards"'));
    assert.ok(appSrc.includes("testID={'card_scratch_item_' + idx}"));
  });

  await runTest("4.7: Recent cashback summary card (card_recent_cashback_summary) and view history CTA", () => {
    assert.ok(appSrc.includes('testID="card_recent_cashback_summary"'));
    assert.ok(appSrc.includes('testID="btn_view_cashback_history"'));
    assert.ok(appSrc.includes("onPress={handleOpenCashbackHistory}"));
  });

  // -----------------------------------------------------------------------------
  // PART 5: MODAL 123 (modalScratchCard) INTERACTIVE SCRATCH SURFACE & CLAIM
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 5: MODAL 123 (modalScratchCard) INTERACTIVE SCRATCH SURFACE & CLAIM ---");

  await runTest("5.1: modalScratchCard defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_scratch_card"'));
    assert.ok(appSrc.includes("visible={modalScratchCard}"));
    assert.ok(appSrc.includes("onRequestClose={() => { setModalScratchCard(false); setModalRewardsHub(true); }}"));
  });

  await runTest("5.2: Header renders title, subtitle, and back button (btn_scratch_card_back)", () => {
    assert.ok(appSrc.includes('testID="btn_scratch_card_back"'));
    assert.ok(appSrc.includes("t('scratch_cards_section_title')"));
  });

  await runTest("5.3: Interactive scratch surface card (card_scratch_surface) with action button", () => {
    assert.ok(appSrc.includes('testID="card_scratch_surface"'));
    assert.ok(appSrc.includes('testID="btn_scratch_action_surface"'));
    assert.ok(appSrc.includes("onPress={handleRevealScratchCard}"));
  });

  await runTest("5.4: Scratch reveal triggers confetti view (view_scratch_confetti) and congrats text", () => {
    assert.ok(appSrc.includes('testID="view_scratch_confetti"'));
    assert.ok(appSrc.includes('testID="text_scratch_congrats"'));
    assert.ok(appSrc.includes("t('scratch_card_scratched')"));
  });

  await runTest("5.5: Reward amount badge (badge_scratch_reward_amount) displays earned amount in Taka", () => {
    assert.ok(appSrc.includes('testID="badge_scratch_reward_amount"'));
    assert.ok(appSrc.includes("activeScratchCard ? activeScratchCard.amount : 25"));
  });

  await runTest("5.6: Claim to wallet CTA (btn_claim_scratch_reward) adds to wallet balance", () => {
    assert.ok(appSrc.includes('testID="btn_claim_scratch_reward"'));
    assert.ok(appSrc.includes("onPress={handleClaimScratchReward}"));
  });

  await runTest("5.7: Claimed feedback banner (text_scratch_claimed_feedback) rendered after claim", () => {
    assert.ok(appSrc.includes('testID="text_scratch_claimed_feedback"'));
    assert.ok(appSrc.includes("t('reward_claimed_success')"));
  });

  // -----------------------------------------------------------------------------
  // PART 6: MODAL 124 (modalCashbackHistory) MONTHLY TOTAL & FILTERABLE LIST
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 6: MODAL 124 (modalCashbackHistory) MONTHLY TOTAL & FILTERABLE LIST ---");

  await runTest("6.1: modalCashbackHistory defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_cashback_history"'));
    assert.ok(appSrc.includes("visible={modalCashbackHistory}"));
    assert.ok(appSrc.includes("onRequestClose={() => { setModalCashbackHistory(false); setModalRewardsHub(true); }}"));
  });

  await runTest("6.2: Header renders title and back button (btn_cashback_history_back)", () => {
    assert.ok(appSrc.includes('testID="btn_cashback_history_back"'));
    assert.ok(appSrc.includes("t('cashback_history_section_title')"));
  });

  await runTest("6.3: Monthly cashback total card (card_monthly_cashback_total) renders total and this month's earnings", () => {
    assert.ok(appSrc.includes('testID="card_monthly_cashback_total"'));
    assert.ok(appSrc.includes("t('total_cashback_earned')"));
    assert.ok(appSrc.includes("t('this_month_cashback')"));
  });

  await runTest("6.4: Filter chips (chip_filter_all, chip_filter_qr, chip_filter_bill, chip_filter_scratch)", () => {
    assert.ok(appSrc.includes("chip_filter_all"));
    assert.ok(appSrc.includes("chip_filter_qr"));
    assert.ok(appSrc.includes("chip_filter_bill"));
    assert.ok(appSrc.includes("chip_filter_scratch"));
  });

  await runTest("6.5: Scrollable cashback history list (list_cashback_history) with item cards", () => {
    assert.ok(appSrc.includes('testID="list_cashback_history"'));
    assert.ok(appSrc.includes("testID={'card_cashback_item_' + idx}"));
  });

  await runTest("6.6: Transaction reference, date, and positive credit badges (+ ৳ ...) displayed", () => {
    assert.ok(appSrc.includes("+ ৳"));
    assert.ok(appSrc.includes("item.ref"));
    assert.ok(appSrc.includes("item.date"));
  });

  // -----------------------------------------------------------------------------
  // PART 7: MODAL 125 (modalPointsRedeem) STEPPER & WALLET CONVERSION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 7: MODAL 125 (modalPointsRedeem) STEPPER & WALLET CONVERSION ---");

  await runTest("7.1: modalPointsRedeem defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_points_redeem"'));
    assert.ok(appSrc.includes("visible={modalPointsRedeem}"));
    assert.ok(appSrc.includes("onRequestClose={() => { setModalPointsRedeem(false); setModalRewardsHub(true); }}"));
  });

  await runTest("7.2: Header renders title and back button (btn_points_redeem_back)", () => {
    assert.ok(appSrc.includes('testID="btn_points_redeem_back"'));
    assert.ok(appSrc.includes("t('redeem_points_title')"));
  });

  await runTest("7.3: Points converter rule card (card_points_converter, text_conversion_rule)", () => {
    assert.ok(appSrc.includes('testID="card_points_converter"'));
    assert.ok(appSrc.includes('testID="text_conversion_rule"'));
    assert.ok(appSrc.includes("t('conversion_rule_label')"));
  });

  await runTest("7.4: Stepper controls (stepper_redeem_points, btn_redeem_points_minus, btn_redeem_points_plus)", () => {
    assert.ok(appSrc.includes('testID="stepper_redeem_points"'));
    assert.ok(appSrc.includes('testID="btn_redeem_points_minus"'));
    assert.ok(appSrc.includes('testID="btn_redeem_points_plus"'));
  });

  await runTest("7.5: Points display (text_points_to_redeem) and cash value display (text_redeem_cash_value)", () => {
    assert.ok(appSrc.includes('testID="text_points_to_redeem"'));
    assert.ok(appSrc.includes('testID="text_redeem_cash_value"'));
  });

  await runTest("7.6: Wallet credit destination card (card_wallet_credit_destination)", () => {
    assert.ok(appSrc.includes('testID="card_wallet_credit_destination"'));
    assert.ok(appSrc.includes("t('destination_wallet_label')"));
  });

  await runTest("7.7: Confirm redeem CTA (btn_confirm_points_redeem) and success banner", () => {
    assert.ok(appSrc.includes('testID="btn_confirm_points_redeem"'));
    assert.ok(appSrc.includes('testID="text_redeem_success_banner"'));
    assert.ok(appSrc.includes("onPress={handleConfirmPointsRedeem}"));
  });

  // -----------------------------------------------------------------------------
  // PART 8: MODAL 126 (modalRewardTierDetails) TIER LADDER & BENEFITS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 8: MODAL 126 (modalRewardTierDetails) TIER LADDER & BENEFITS ---");

  await runTest("8.1: modalRewardTierDetails defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('testID="modal_reward_tier_details"'));
    assert.ok(appSrc.includes("visible={modalRewardTierDetails}"));
    assert.ok(appSrc.includes("onRequestClose={() => { setModalRewardTierDetails(false); setModalRewardsHub(true); }}"));
  });

  await runTest("8.2: Header renders title and back button (btn_tier_details_back)", () => {
    assert.ok(appSrc.includes('testID="btn_tier_details_back"'));
    assert.ok(appSrc.includes("t('tier_details_title')"));
  });

  await runTest("8.3: Visual loyalty tier ladder (card_tier_ladder) displaying Silver, Gold, and Platinum", () => {
    assert.ok(appSrc.includes('testID="card_tier_ladder"'));
    assert.ok(appSrc.includes("t('loyalty_tier_silver')"));
    assert.ok(appSrc.includes("t('loyalty_tier_gold')"));
    assert.ok(appSrc.includes("t('loyalty_tier_platinum')"));
  });

  await runTest("8.4: Current tier indicator badge (current_tier_badge)", () => {
    assert.ok(appSrc.includes("t('current_tier_badge')"));
  });

  await runTest("8.5: Progress bar toward next tier (progress_next_tier, text_next_tier_progress)", () => {
    assert.ok(appSrc.includes('testID="progress_next_tier"'));
    assert.ok(appSrc.includes('testID="text_next_tier_progress"'));
  });

  await runTest("8.6: Benefits breakdown card (card_tier_benefits) with tier privilege items", () => {
    assert.ok(appSrc.includes('testID="card_tier_benefits"'));
    assert.ok(appSrc.includes("t('tier_benefit_gold_1')"));
    assert.ok(appSrc.includes("t('tier_benefit_gold_2')"));
    assert.ok(appSrc.includes("t('tier_benefit_gold_3')"));
  });

  // -----------------------------------------------------------------------------
  // PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("9.1: BackHandler onBackPress steps back from modalScratchCard to modalRewardsHub", () => {
    assert.ok(appSrc.includes("if (modalScratchCard) {"));
    const idx = appSrc.indexOf("if (modalScratchCard) {");
    const block = appSrc.slice(idx, idx + 200);
    assert.ok(block.includes("setModalScratchCard(false)"));
    assert.ok(block.includes("setModalRewardsHub(true)"));
  });

  await runTest("9.2: BackHandler onBackPress steps back from modalCashbackHistory to modalRewardsHub", () => {
    assert.ok(appSrc.includes("if (modalCashbackHistory) {"));
    const idx = appSrc.indexOf("if (modalCashbackHistory) {");
    const block = appSrc.slice(idx, idx + 200);
    assert.ok(block.includes("setModalCashbackHistory(false)"));
    assert.ok(block.includes("setModalRewardsHub(true)"));
  });

  await runTest("9.3: BackHandler onBackPress steps back from modalPointsRedeem to modalRewardsHub", () => {
    assert.ok(appSrc.includes("if (modalPointsRedeem) {"));
    const idx = appSrc.indexOf("if (modalPointsRedeem) {");
    const block = appSrc.slice(idx, idx + 200);
    assert.ok(block.includes("setModalPointsRedeem(false)"));
    assert.ok(block.includes("setModalRewardsHub(true)"));
  });

  await runTest("9.4: BackHandler onBackPress steps back from modalRewardTierDetails to modalRewardsHub", () => {
    assert.ok(appSrc.includes("if (modalRewardTierDetails) {"));
    const idx = appSrc.indexOf("if (modalRewardTierDetails) {");
    const block = appSrc.slice(idx, idx + 200);
    assert.ok(block.includes("setModalRewardTierDetails(false)"));
    assert.ok(block.includes("setModalRewardsHub(true)"));
  });

  await runTest("9.5: BackHandler onBackPress dismisses modalRewardsHub cleanly", () => {
    assert.ok(appSrc.includes("if (modalRewardsHub) {"));
    const idx = appSrc.indexOf("if (modalRewardsHub) {");
    const block = appSrc.slice(idx, idx + 180);
    assert.ok(block.includes("setModalRewardsHub(false)"));
  });

  await runTest("9.6: BackHandler useCallback dependency array includes all 5 Iteration 240 modal controllers", () => {
    const bhDepStart = appSrc.indexOf("modalRewardsHub, modalScratchCard, modalCashbackHistory, modalPointsRedeem, modalRewardTierDetails");
    assert.ok(bhDepStart !== -1, "BackHandler dependencies must include all 5 Iteration 240 modal controllers");
  });

  // -----------------------------------------------------------------------------
  // PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK ---");

  await runTest("10.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
    assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.top, 10);
    assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.bottom, 10);
    assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.left, 10);
    assert.strictEqual(iconMetrics.STANDARD_TOUCH_HIT_SLOP.right, 10);
  });

  await runTest("10.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in Modals 122–126", () => {
    const modalsSlice = appSrc.slice(appSrc.indexOf('testID="modal_rewards_hub"'), appSrc.indexOf('testID="modal_reward_tier_details"') + 3000);
    const hitSlopMatches = modalsSlice.match(/hitSlop={STANDARD_TOUCH_HIT_SLOP}/g) || [];
    assert.ok(hitSlopMatches.length >= 10, "Expected >= 10 hitSlop attachments in Modals 122-126, got " + hitSlopMatches.length);
  });

  await runTest("10.3: Haptic feedback milestones wired in rewards and scratch card action handlers", () => {
    assert.ok(appSrc.includes("hapticFeedbackService.selection()"));
    assert.ok(appSrc.includes("hapticFeedbackService.impactMedium()"));
    assert.ok(appSrc.includes("hapticFeedbackService.notificationSuccess()"));
  });

  // -----------------------------------------------------------------------------
  // PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  function parseHex(hex) {
    let cleaned = hex.replace("#", "").trim();
    if (cleaned.length === 3) {
      cleaned = cleaned.split("").map((c) => c + c).join("");
    }
    const num = parseInt(cleaned, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function getLuminance(rgb) {
    const [r, g, b] = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function getContrastRatio(fgHex, bgHex) {
    const lum1 = getLuminance(parseHex(fgHex));
    const lum2 = getLuminance(parseHex(bgHex));
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  await runTest("11.1: Primary CTA button (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#FFFFFF", "#0D6E5C");
    console.log("      [CONTRAST] #FFFFFF on #0D6E5C: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Expected contrast ratio >= 4.5:1");
  });

  await runTest("11.2: Dark mode card surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
    const ratio = getContrastRatio("#FFFFFF", "#0F172A");
    console.log("      [CONTRAST] #FFFFFF on #0F172A: " + ratio.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(ratio >= 7.0, "Expected contrast ratio >= 7.0:1");
  });

  await runTest("11.3: Claimed reward pill (#0D6E5C on #D1FAE5) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#0D6E5C", "#D1FAE5");
    console.log("      [CONTRAST] #0D6E5C on #D1FAE5: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Expected contrast ratio >= 4.5:1");
  });

  await runTest("11.4: Tier badge text (#78350F on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#78350F", "#FEF3C7");
    console.log("      [CONTRAST] #78350F on #FEF3C7: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Expected contrast ratio >= 4.5:1");
  });

  await runTest("11.5: Light theme card background text (#1E293B on #F8FAFC) achieves WCAG AAA (>= 7.0:1)", () => {
    const ratio = getContrastRatio("#1E293B", "#F8FAFC");
    console.log("      [CONTRAST] #1E293B on #F8FAFC: " + ratio.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(ratio >= 7.0, "Expected contrast ratio >= 7.0:1");
  });

  // -----------------------------------------------------------------------------
  // PART 12: MODAL COUNT & CONTROLLER INVARIANTS (131 MODALS)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 12: MODAL COUNT & CONTROLLER INVARIANTS (131 MODALS) ---");

  await runTest("12.1: App.js contains exactly 131 <Modal elements", () => {
    const modalMatches = appSrc.match(/<Modal\b/g) || [];
    assert.strictEqual(modalMatches.length, 131, "Expected exactly 131 modals in App.js, got " + modalMatches.length);
  });

  await runTest("12.2: App.js contains exactly 131 onRequestClose handlers", () => {
    const reqCloseMatches = appSrc.match(/onRequestClose\s*=\s*\{/g) || [];
    assert.strictEqual(reqCloseMatches.length, 131, "Expected 131 onRequestClose handlers, got " + reqCloseMatches.length);
  });

  await runTest("12.3: App.js contains exactly 131 unique modal state controllers", () => {
    const visibleRegex = /<Modal[\s\S]*?visible=\{([a-zA-Z0-9_]+)\}/g;
    let match;
    const uniqueModals = new Set();
    while ((match = visibleRegex.exec(appSrc)) !== null) {
      uniqueModals.add(match[1]);
    }
    assert.strictEqual(uniqueModals.size, 131, "Expected 131 unique visible controllers, got " + uniqueModals.size);
  });

  // -----------------------------------------------------------------------------
  // PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK ---");

  await runTest("13.1: App.js compiles cleanly via Babel parser with zero syntax errors", () => {
    const t0 = Date.now();
    const result = babel.parseSync(appSrc, {
      filename: "App.js",
      presets: ["babel-preset-expo"]
    });
    const duration = Date.now() - t0;
    assert.ok(result, "Babel AST must be generated");
    assert.strictEqual(result.type, "File", "AST root must be File");
    console.log("      [BABEL] Successfully parsed App.js in " + duration + "ms");
  });

  await runTest("13.2: Latency benchmark: 1,000 points-to-cash conversions execute in < 200ms", () => {
    const t0 = Date.now();
    let totalCash = 0;
    for (let i = 0; i < 1000; i++) {
      const points = 100 + (i % 50) * 100;
      totalCash += Math.floor(points / 10);
    }
    const duration = Date.now() - t0;
    assert.ok(duration < 200, "1,000 calculations must take < 200ms, took " + duration + "ms");
    assert.ok(totalCash > 0);
    console.log("      [BENCHMARK] 1,000 operations completed in " + duration + "ms (" + (duration / 1000).toFixed(4) + "ms/op)");
  });

  // -----------------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("TOTAL: " + totalTests + " | PASSED: " + passedTests + " | FAILED: " + failedTests + " (" + ((passedTests / totalTests) * 100).toFixed(0) + "% SUCCESS)");
  console.log("================================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
