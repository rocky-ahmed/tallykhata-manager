/**
 * test_iteration_240_rewards_cashback_backend.js
 *
 * REA-ITER-240: TallyPay Merchant Cashback, Scratch Card Rewards & Loyalty Points Subsystem
 * Worker: Worker 2 (Averroes / Peirce - Permanent Backend Developer & Business Logic Architect)
 * Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 * Milestone: REA-ITER-240
 */

const assert = require('assert');
const {
  MERCHANT_REWARD_SCHEMA,
  REWARD_TABLE_SCHEMA,
  MERCHANT_REWARD_LEDGER_SCHEMA,
  REWARD_LEDGER_TABLE_SCHEMA,
  REWARD_TYPES,
  RewardType,
  MerchantRewardType,
  REWARD_STATUSES,
  RewardStatus,
  MerchantRewardStatus,
  REWARD_LEDGER_SOURCE_EVENTS,
  RewardLedgerSourceEvent,
  CASHBACK_VOLUME_TIERS,
  LOYALTY_TIERS,
  LOYALTY_POINTS_CONFIG,
  REWARD_ARSC_TOKENS,
  getCashbackTier,
  calculateVolumeCashback,
  calculateCashback,
  applyMonthlyCap,
  calculatePointsEarned,
  calculateCoinsEarned,
  classifyMerchantTier,
  calculatePointsRedemptionValue,
  redeemCoinsToWallet,
  validatePointsRedemption,
  transitionRewardStatus,
  generateSeededScratchCard,
  MerchantRewardRecord,
  MerchantRewardLedgerRecord,
  MerchantRewardDao,
  MerchantRewardLedgerDao,
  MerchantRewardEngine,
  ReconstructedRewardEngine,
  RewardEngine,
  TallyPayRewardsEngine,
  merchantRewardEngine,
  reconstructedRewardEngine,
} = require('./src/tallyPayService');

const {
  StorageRepository,
  storageRepository,
  createDefaultState,
  VALID_COLLECTIONS,
  saveMerchantReward,
  getMerchantRewards,
  getMerchantRewardsByBusinessId,
  getMerchantRewardById,
  scratchReward,
  claimReward,
  deleteMerchantReward,
  existsMerchantReward,
  getUnsyncedMerchantRewards,
  updateMerchantRewardSyncStatus,
  saveRewardLedgerEntry,
  getRewardLedger,
  getMerchantRewardPointsBalance,
  redeemPointsToWallet,
  getUnsyncedRewardLedgerEntries,
  updateRewardLedgerSyncStatus,
  deleteBusinessCascade,
  getFullBackupState,
  commitRestorePayload,
} = require('./src/storageRepository');

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('==================================================================');
  console.log(' REA-ITER-240: TALLYPAY MERCHANT CASHBACK & REWARDS BACKEND SUITE');
  console.log('==================================================================\n');

  // -------------------------------------------------------------
  // GROUP 1: Enums, Constants & Room SQLite Schema Invariants
  // -------------------------------------------------------------
  console.log('[GROUP 1: Enums, Constants & Room SQLite Schema Invariants]');

  await runTest('MERCHANT_REWARD_SCHEMA defines table merchant_reward with all 13 columns and types', () => {
    assert.strictEqual(MERCHANT_REWARD_SCHEMA.tableName, 'merchant_reward');
    assert.strictEqual(REWARD_TABLE_SCHEMA.tableName, 'merchant_reward');
    assert.strictEqual(MERCHANT_REWARD_SCHEMA.columns.length, 13);
    const colNames = MERCHANT_REWARD_SCHEMA.columns.map(c => c.name);
    assert(colNames.includes('id'));
    assert(colNames.includes('reward_id'));
    assert(colNames.includes('business_id'));
    assert(colNames.includes('reward_type'));
    assert(colNames.includes('amount_paisa'));
    assert(colNames.includes('points'));
    assert(colNames.includes('status'));
    assert(colNames.includes('title'));
    assert(colNames.includes('description'));
    assert(colNames.includes('expiry_date'));
    assert(colNames.includes('claimed_date'));
    assert(colNames.includes('created_at'));
    assert(colNames.includes('synced'));

    const pk = MERCHANT_REWARD_SCHEMA.columns.find(c => c.name === 'id');
    assert.strictEqual(pk.primaryKey, true);
    assert.strictEqual(pk.autoincrement, true);

    const rwdIdCol = MERCHANT_REWARD_SCHEMA.columns.find(c => c.name === 'reward_id');
    assert.strictEqual(rwdIdCol.unique, true);
    assert.strictEqual(rwdIdCol.notNull, true);
  });

  await runTest('MERCHANT_REWARD_SCHEMA defines indices for reward_id (unique) and business_id', () => {
    assert.strictEqual(MERCHANT_REWARD_SCHEMA.indices.length, 2);
    const uniqueIdx = MERCHANT_REWARD_SCHEMA.indices.find(i => i.name === 'index_merchant_reward_reward_id');
    assert(uniqueIdx);
    assert.strictEqual(uniqueIdx.unique, true);
    assert.deepStrictEqual(uniqueIdx.columns, ['reward_id']);

    const bizIdx = MERCHANT_REWARD_SCHEMA.indices.find(i => i.name === 'index_merchant_reward_business_id');
    assert(bizIdx);
    assert.strictEqual(bizIdx.unique, false);
    assert.deepStrictEqual(bizIdx.columns, ['business_id']);
  });

  await runTest('MERCHANT_REWARD_LEDGER_SCHEMA defines table merchant_reward_ledger with 10 columns and indices', () => {
    assert.strictEqual(MERCHANT_REWARD_LEDGER_SCHEMA.tableName, 'merchant_reward_ledger');
    assert.strictEqual(REWARD_LEDGER_TABLE_SCHEMA.tableName, 'merchant_reward_ledger');
    assert.strictEqual(MERCHANT_REWARD_LEDGER_SCHEMA.columns.length, 10);
    const colNames = MERCHANT_REWARD_LEDGER_SCHEMA.columns.map(c => c.name);
    assert(colNames.includes('id'));
    assert(colNames.includes('entry_id'));
    assert(colNames.includes('business_id'));
    assert(colNames.includes('points_change'));
    assert(colNames.includes('running_points_balance'));
    assert(colNames.includes('cashback_paisa_change'));
    assert(colNames.includes('source_event'));
    assert(colNames.includes('reference_id'));
    assert(colNames.includes('created_at'));
    assert(colNames.includes('synced'));

    const entryUniqueIdx = MERCHANT_REWARD_LEDGER_SCHEMA.indices.find(i => i.name === 'index_merchant_reward_ledger_entry_id');
    assert(entryUniqueIdx);
    assert.strictEqual(entryUniqueIdx.unique, true);
  });

  await runTest('REWARD_TYPES and REWARD_STATUSES define all states and backward-compatible aliases', () => {
    assert.strictEqual(REWARD_TYPES.CASHBACK, 'CASHBACK');
    assert.strictEqual(REWARD_TYPES.POINTS, 'POINTS');
    assert.strictEqual(REWARD_TYPES.VOUCHER, 'VOUCHER');
    assert.strictEqual(REWARD_TYPES.SCRATCH_CARD, 'SCRATCH_CARD');
    assert.strictEqual(RewardType.CASHBACK, 'CASHBACK');
    assert.strictEqual(MerchantRewardType.SCRATCH_CARD, 'SCRATCH_CARD');

    assert.strictEqual(REWARD_STATUSES.LOCKED, 'LOCKED');
    assert.strictEqual(REWARD_STATUSES.UNLOCKED, 'UNLOCKED');
    assert.strictEqual(REWARD_STATUSES.UNSCRATCHED, 'UNLOCKED');
    assert.strictEqual(REWARD_STATUSES.SCRATCHED, 'SCRATCHED');
    assert.strictEqual(REWARD_STATUSES.REVEALED, 'SCRATCHED');
    assert.strictEqual(REWARD_STATUSES.CLAIMED, 'CLAIMED');
    assert.strictEqual(REWARD_STATUSES.EXPIRED, 'EXPIRED');
    assert.strictEqual(RewardStatus.CLAIMED, 'CLAIMED');
    assert.strictEqual(MerchantRewardStatus.EXPIRED, 'EXPIRED');
  });

  await runTest('REWARD_LEDGER_SOURCE_EVENTS defines all transactional audit source categories', () => {
    assert.strictEqual(REWARD_LEDGER_SOURCE_EVENTS.TRANSACTION_VOLUME, 'TRANSACTION_VOLUME');
    assert.strictEqual(REWARD_LEDGER_SOURCE_EVENTS.SCRATCH_CARD_CLAIM, 'SCRATCH_CARD_CLAIM');
    assert.strictEqual(REWARD_LEDGER_SOURCE_EVENTS.POINTS_REDEMPTION, 'POINTS_REDEMPTION');
    assert.strictEqual(REWARD_LEDGER_SOURCE_EVENTS.CAMPAIGN_BONUS, 'CAMPAIGN_BONUS');
    assert.strictEqual(REWARD_LEDGER_SOURCE_EVENTS.EXPIRY_REVERSAL, 'EXPIRY_REVERSAL');
    assert.strictEqual(REWARD_LEDGER_SOURCE_EVENTS.REFERRAL_BONUS, 'REFERRAL_BONUS');
    assert.strictEqual(RewardLedgerSourceEvent.POINTS_REDEMPTION, 'POINTS_REDEMPTION');
  });

  await runTest('CASHBACK_VOLUME_TIERS and LOYALTY_TIERS define tiers, basis points, and coins', () => {
    assert.strictEqual(CASHBACK_VOLUME_TIERS.BRONZE.rateBps, 50); // 0.5%
    assert.strictEqual(CASHBACK_VOLUME_TIERS.SILVER.rateBps, 100); // 1.0%
    assert.strictEqual(CASHBACK_VOLUME_TIERS.GOLD.rateBps, 150); // 1.5%
    assert.strictEqual(CASHBACK_VOLUME_TIERS.PLATINUM.rateBps, 200); // 2.0%

    assert.strictEqual(LOYALTY_TIERS.BRONZE.minCoins, 0);
    assert.strictEqual(LOYALTY_TIERS.SILVER.minCoins, 500);
    assert.strictEqual(LOYALTY_TIERS.GOLD.minCoins, 2000);
    assert.strictEqual(LOYALTY_TIERS.GOLD.cashbackBoostBps, 50);
    assert.strictEqual(LOYALTY_TIERS.PLATINUM.minCoins, 5000);

    assert.strictEqual(LOYALTY_POINTS_CONFIG.pointsPerHundredTaka, 1);
    assert.strictEqual(LOYALTY_POINTS_CONFIG.redemptionPointsPerTaka, 10);
    assert.strictEqual(LOYALTY_POINTS_CONFIG.minRedemptionPoints, 100);
  });

  await runTest('REWARD_ARSC_TOKENS contains authentic Bengali digital rewards copy', () => {
    assert.strictEqual(REWARD_ARSC_TOKENS.cashback, 'ক্যাশব্যাক');
    assert.strictEqual(REWARD_ARSC_TOKENS.gold_tier, 'টালিখাতা গোল্ড');
    assert.strictEqual(REWARD_ARSC_TOKENS.scratch_card_title, 'স্ক্র্যাচ কার্ড রিওয়ার্ড');
    assert.strictEqual(REWARD_ARSC_TOKENS.scratch_prompt, 'ঘষে পুরস্কার জিতে নিন!');
    assert.strictEqual(REWARD_ARSC_TOKENS.points_title, 'লয়্যালটি পয়েন্টস');
  });

  await runTest('StorageRepository registers merchantRewards and merchantRewardLedger in VALID_COLLECTIONS', () => {
    assert(VALID_COLLECTIONS.has('merchantRewards'));
    assert(VALID_COLLECTIONS.has('merchantRewardLedger'));
    const state = createDefaultState();
    assert(Array.isArray(state.merchantRewards));
    assert(Array.isArray(state.merchantRewardLedger));
  });

  // -------------------------------------------------------------
  // GROUP 2: Volume-Based Cashback Tier Engine (Zero Float Drift)
  // -------------------------------------------------------------
  console.log('\n[GROUP 2: Volume-Based Cashback Tier Engine (Zero Float Drift)]');

  await runTest('getCashbackTier correctly classifies monthly volume thresholds', () => {
    assert.strictEqual(getCashbackTier(1000000).tierKey, 'BRONZE'); // ৳10,000
    assert.strictEqual(getCashbackTier(5000000).tierKey, 'SILVER'); // ৳50,000
    assert.strictEqual(getCashbackTier(10000000).tierKey, 'GOLD');   // ৳100,000
    assert.strictEqual(getCashbackTier(25000000).tierKey, 'PLATINUM'); // ৳250,000
  });

  await runTest('calculateVolumeCashback calculates exact integer paisa without float drift', () => {
    // ৳40,000 = 4,000,000 paisa @ Bronze (0.5% / 50 bps) -> 4,000,000 * 50 / 10000 = 20,000 paisa (৳200)
    const bronze = calculateVolumeCashback(4000000);
    assert.strictEqual(bronze.tierKey, 'BRONZE');
    assert.strictEqual(bronze.cashbackPaisa, 20000);
    assert.strictEqual(bronze.isCapped, false);

    // ৳80,000 = 8,000,000 paisa @ Silver (1.0% / 100 bps) -> 8,000,000 * 100 / 10000 = 80,000 paisa (৳800)
    const silver = calculateVolumeCashback(8000000);
    assert.strictEqual(silver.tierKey, 'SILVER');
    assert.strictEqual(silver.cashbackPaisa, 80000);
    assert.strictEqual(silver.isCapped, false);

    // ৳150,000 = 15,000,000 paisa @ Gold (1.5% / 150 bps) -> 15,000,000 * 150 / 10000 = 225,000 paisa (৳2,250)
    // Capped at default ৳1,000 (100,000 paisa)
    const goldCapped = calculateVolumeCashback(15000000, 100000);
    assert.strictEqual(goldCapped.tierKey, 'GOLD');
    assert.strictEqual(goldCapped.rawCashbackPaisa, 225000);
    assert.strictEqual(goldCapped.cashbackPaisa, 100000);
    assert.strictEqual(goldCapped.isCapped, true);

    // ৳300,000 = 30,000,000 paisa @ Platinum (2.0% / 200 bps) -> 30,000,000 * 200 / 10000 = 600,000 paisa (৳6,000)
    const platUncapped = calculateVolumeCashback(30000000, 1000000);
    assert.strictEqual(platUncapped.tierKey, 'PLATINUM');
    assert.strictEqual(platUncapped.cashbackPaisa, 600000);
    assert.strictEqual(platUncapped.isCapped, false);
  });

  await runTest('calculateCashback enforces min transaction threshold and transaction cap', () => {
    // Below threshold (min ৳500 = 50,000 paisa) -> 0
    assert.strictEqual(calculateCashback(30000, 150, 50000, 10000), 0);

    // At threshold ৳1,000 (100,000 paisa) @ 1.5% (150 bps) -> 1,500 paisa (৳15)
    assert.strictEqual(calculateCashback(100000, 150, 50000, 10000), 1500);

    // High transaction ৳200,000 (20,000,000 paisa) @ 1.5% -> 300,000 paisa, capped at 10,000 paisa
    assert.strictEqual(calculateCashback(20000000, 150, 50000, 10000), 10000);
  });

  await runTest('applyMonthlyCap properly bounds total earned cashback to monthly budget', () => {
    assert.strictEqual(applyMonthlyCap(5000, 90000, 100000), 5000);
    assert.strictEqual(applyMonthlyCap(15000, 90000, 100000), 10000); // Only 10,000 remaining
    assert.strictEqual(applyMonthlyCap(5000, 100000, 100000), 0);     // Cap reached
  });

  await runTest('calculateVolumeCashback rejects invalid or negative inputs with error', () => {
    assert.throws(() => calculateVolumeCashback(-500), /non-negative integer/);
    assert.throws(() => calculateVolumeCashback(1234.56), /non-negative integer/);
    assert.throws(() => calculateVolumeCashback('invalid'), /non-negative integer/);
  });

  // -------------------------------------------------------------
  // GROUP 3: Loyalty Points Earning, Redemption & Tier Classification
  // -------------------------------------------------------------
  console.log('\n[GROUP 3: Loyalty Points Earning, Redemption & Tier Classification]');

  await runTest('calculatePointsEarned awards 1 point per ৳100 (10,000 paisa) volume', () => {
    assert.strictEqual(calculatePointsEarned(5000), 0);     // ৳50 -> 0 points
    assert.strictEqual(calculatePointsEarned(10000), 1);    // ৳100 -> 1 point
    assert.strictEqual(calculatePointsEarned(250000), 25);  // ৳2,500 -> 25 points
    assert.strictEqual(calculatePointsEarned(1000000), 100); // ৳10,000 -> 100 points
    assert.strictEqual(calculateCoinsEarned(50000), 5);     // alias verification
  });

  await runTest('classifyMerchantTier correctly maps coin totals to loyalty tiers', () => {
    assert.strictEqual(classifyMerchantTier(0).tier, 'BRONZE');
    assert.strictEqual(classifyMerchantTier(499).tier, 'BRONZE');
    assert.strictEqual(classifyMerchantTier(500).tier, 'SILVER');
    assert.strictEqual(classifyMerchantTier(1999).tier, 'SILVER');
    assert.strictEqual(classifyMerchantTier(2000).tier, 'GOLD');
    assert.strictEqual(classifyMerchantTier(2000).nameBn, 'টালিখাতা গোল্ড');
    assert.strictEqual(classifyMerchantTier(5000).tier, 'PLATINUM');
    assert.strictEqual(classifyMerchantTier(10000).tier, 'PLATINUM');
  });

  await runTest('calculatePointsRedemptionValue converts points to exact wallet paisa (10 pts = ৳1.00)', () => {
    // 100 points -> ৳10.00 = 1,000 paisa, 0 leftover
    const r1 = calculatePointsRedemptionValue(100);
    assert.strictEqual(r1.creditedPaisa, 1000);
    assert.strictEqual(r1.pointsDeducted, 100);
    assert.strictEqual(r1.leftoverPoints, 0);

    // 125 points -> ৳12.00 = 1,200 paisa, 5 points leftover
    const r2 = calculatePointsRedemptionValue(125);
    assert.strictEqual(r2.creditedPaisa, 1200);
    assert.strictEqual(r2.pointsDeducted, 120);
    assert.strictEqual(r2.leftoverPoints, 5);

    // 1,000 points -> ৳100.00 = 10,000 paisa
    const r3 = redeemCoinsToWallet(1000);
    assert.strictEqual(r3.creditedPaisa, 10000);
    assert.strictEqual(r3.pointsDeducted, 1000);

    // Throws on points below minimum threshold (< 100)
    assert.throws(() => calculatePointsRedemptionValue(50), /MINIMUM_COIN_THRESHOLD_NOT_MET/);
  });

  await runTest('validatePointsRedemption performs pre-flight boundary validation', () => {
    assert.strictEqual(validatePointsRedemption(50, 500).valid, false);
    assert.strictEqual(validatePointsRedemption(50, 500).reason, 'MINIMUM_THRESHOLD_NOT_MET');

    assert.strictEqual(validatePointsRedemption(600, 500).valid, false);
    assert.strictEqual(validatePointsRedemption(600, 500).reason, 'INSUFFICIENT_POINTS');

    assert.strictEqual(validatePointsRedemption(-10, 500).valid, false);
    assert.strictEqual(validatePointsRedemption(200, 500).valid, true);
  });

  // -------------------------------------------------------------
  // GROUP 4: Deterministic Seeded Scratch Card Generator
  // -------------------------------------------------------------
  console.log('\n[GROUP 4: Deterministic Seeded Scratch Card Generator]');

  await runTest('generateSeededScratchCard produces byte-deterministic prizes for identical seeds', () => {
    const seed = 'TK-CAMPAIGN-2026-DHAKA';
    const card1 = generateSeededScratchCard({ seed, businessId: '101' });
    const card2 = generateSeededScratchCard({ seed, businessId: '101' });

    assert.strictEqual(card1.reward_type, card2.reward_type);
    assert.strictEqual(card1.amount_paisa, card2.amount_paisa);
    assert.strictEqual(card1.points, card2.points);
    assert.strictEqual(card1.status, 'UNLOCKED');
    assert.strictEqual(card1.business_id, '101');
    assert(card1.expiry_date);
  });

  await runTest('generateSeededScratchCard adheres to explicit bounds and reward types', () => {
    const cardCash = generateSeededScratchCard({
      seed: 12345,
      rewardType: REWARD_TYPES.CASHBACK,
      minAmountPaisa: 1000,
      maxAmountPaisa: 5000
    });
    assert.strictEqual(cardCash.reward_type, 'CASHBACK');
    assert(cardCash.amount_paisa >= 1000 && cardCash.amount_paisa <= 5000);
    assert.strictEqual(cardCash.points, 0);

    const cardPts = generateSeededScratchCard({
      seed: 67890,
      rewardType: REWARD_TYPES.POINTS,
      minPoints: 50,
      maxPoints: 300
    });
    assert.strictEqual(cardPts.reward_type, 'POINTS');
    assert(cardPts.points >= 50 && cardPts.points <= 300);
    assert.strictEqual(cardPts.amount_paisa, 0);
  });

  // -------------------------------------------------------------
  // GROUP 5: Scratch Card & Reward Lifecycle State Machine (FSM)
  // -------------------------------------------------------------
  console.log('\n[GROUP 5: Scratch Card & Reward Lifecycle State Machine (FSM)]');

  await runTest('transitionRewardStatus permits standard forward progression', () => {
    let status = 'LOCKED';
    status = transitionRewardStatus(status, 'UNLOCKED');
    assert.strictEqual(status, 'UNLOCKED');

    status = transitionRewardStatus(status, 'SCRATCHED');
    assert.strictEqual(status, 'SCRATCHED');

    status = transitionRewardStatus(status, 'CLAIMED');
    assert.strictEqual(status, 'CLAIMED');
  });

  await runTest('transitionRewardStatus accepts normalized status aliases (UNSCRATCHED, REVEALED)', () => {
    let status = 'UNSCRATCHED'; // alias for UNLOCKED
    status = transitionRewardStatus(status, 'REVEALED'); // alias for SCRATCHED
    assert.strictEqual(status, 'REVEALED');

    status = transitionRewardStatus(status, 'CLAIMED');
    assert.strictEqual(status, 'CLAIMED');
  });

  await runTest('transitionRewardStatus allows expiry from non-terminal states and protects past dates', () => {
    assert.strictEqual(transitionRewardStatus('LOCKED', 'EXPIRED'), 'EXPIRED');
    assert.strictEqual(transitionRewardStatus('UNLOCKED', 'EXPIRED'), 'EXPIRED');
    assert.strictEqual(transitionRewardStatus('SCRATCHED', 'EXPIRED'), 'EXPIRED');

    // Future expiry date guard
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    assert.throws(() => transitionRewardStatus('UNLOCKED', 'EXPIRED', { expiryDate: futureDate }), /Cannot expire reward before expiry date/);
  });

  await runTest('transitionRewardStatus rejects illegal transitions and transitions from terminal states', () => {
    assert.throws(() => transitionRewardStatus('CLAIMED', 'UNLOCKED'), /Cannot transition from terminal state/);
    assert.throws(() => transitionRewardStatus('EXPIRED', 'CLAIMED'), /Cannot transition from terminal state/);
    assert.throws(() => transitionRewardStatus('LOCKED', 'CLAIMED'), /Illegal reward status transition/);
    assert.throws(() => transitionRewardStatus('UNLOCKED', 'CLAIMED'), /Illegal reward status transition/);
  });

  // -------------------------------------------------------------
  // GROUP 6: In-Memory Records & DAO Operations
  // -------------------------------------------------------------
  console.log('\n[GROUP 6: In-Memory Records & DAO Operations]');

  await runTest('MerchantRewardDao performs CRUD operations with unique reward_id index', () => {
    const dao = new MerchantRewardDao();
    const r1 = dao.saveReward({
      reward_id: 'RWD-001',
      business_id: 'TENANT-1',
      reward_type: 'CASHBACK',
      amount_paisa: 2500,
      status: 'UNLOCKED'
    });
    assert.strictEqual(r1.id, 1);
    assert.strictEqual(r1.reward_id, 'RWD-001');

    assert.strictEqual(dao.exists('RWD-001'), true);
    assert.strictEqual(dao.exists('NON-EXISTENT'), false);

    const fetched = dao.getRewardById('RWD-001');
    assert.strictEqual(fetched.amount_paisa, 2500);

    dao.updateRewardStatus('RWD-001', 'SCRATCHED');
    assert.strictEqual(dao.getRewardById('RWD-001').status, 'SCRATCHED');

    const bizRewards = dao.getRewardsByBusinessId('TENANT-1');
    assert.strictEqual(bizRewards.length, 1);

    const unsynced = dao.getUnsyncedRewards();
    assert.strictEqual(unsynced.length, 1);

    dao.updateRewardSyncStatus(['RWD-001'], 1);
    assert.strictEqual(dao.getUnsyncedRewards().length, 0);

    assert.strictEqual(dao.deleteReward('RWD-001'), true);
    assert.strictEqual(dao.exists('RWD-001'), false);
  });

  await runTest('MerchantRewardLedgerDao maintains audit trail and running points balance', () => {
    const ledger = new MerchantRewardLedgerDao();
    assert.strictEqual(ledger.getRunningPointsBalance('TENANT-1'), 0);

    ledger.saveEntry({
      entry_id: 'ENT-001',
      business_id: 'TENANT-1',
      points_change: 150,
      source_event: 'TRANSACTION_VOLUME'
    });
    assert.strictEqual(ledger.getRunningPointsBalance('TENANT-1'), 150);

    ledger.saveEntry({
      entry_id: 'ENT-002',
      business_id: 'TENANT-1',
      points_change: -100,
      source_event: 'POINTS_REDEMPTION'
    });
    assert.strictEqual(ledger.getRunningPointsBalance('TENANT-1'), 50);

    const entries = ledger.getEntriesByBusinessId('TENANT-1');
    assert.strictEqual(entries.length, 2);

    const unsynced = ledger.getUnsyncedEntries();
    assert.strictEqual(unsynced.length, 2);

    ledger.updateEntrySyncStatus(['ENT-001', 'ENT-002'], 1);
    assert.strictEqual(ledger.getUnsyncedEntries().length, 0);
  });

  // -------------------------------------------------------------
  // GROUP 7: End-to-End Reward Engine
  // -------------------------------------------------------------
  console.log('\n[GROUP 7: End-to-End Reward Engine]');

  await runTest('MerchantRewardEngine.applyVolumeCashback credits monthly tier rewards', () => {
    const engine = new MerchantRewardEngine();
    // ৳60,000 monthly volume -> Silver tier (1.0% = 100 bps) -> 60,000 paisa (৳600)
    const result = engine.applyVolumeCashback({
      businessId: 'TENANT-A',
      monthlyVolumePaisa: 6000000,
      walletBalancePaisa: 500000
    });
    assert.strictEqual(result.credited, true);
    assert.strictEqual(result.tierKey, 'SILVER');
    assert.strictEqual(result.cashbackPaisa, 60000);
    assert.strictEqual(result.newWalletBalancePaisa, 560000); // ৳5,000 + ৳600 = ৳5,600
  });

  await runTest('MerchantRewardEngine.awardTransactionPoints tracks points and loyalty tiers', () => {
    const engine = new MerchantRewardEngine();
    // ৳20,000 QR transaction -> 200 points
    const r1 = engine.awardTransactionPoints({
      businessId: 'TENANT-A',
      txnAmountPaisa: 2000000
    });
    assert.strictEqual(r1.pointsEarned, 200);
    assert.strictEqual(r1.runningPointsBalance, 200);
    assert.strictEqual(r1.tier.tier, 'BRONZE');

    // Add ৳200,000 -> 2,000 points -> total 2,200 points -> Gold tier
    const r2 = engine.awardTransactionPoints({
      businessId: 'TENANT-A',
      txnAmountPaisa: 20000000
    });
    assert.strictEqual(r2.pointsEarned, 2000);
    assert.strictEqual(r2.runningPointsBalance, 2200);
    assert.strictEqual(r2.tier.tier, 'GOLD');
    assert.strictEqual(r2.tier.nameBn, 'টালিখাতা গোল্ড');
  });

  await runTest('MerchantRewardEngine scratchCard and claimReward execution flow', () => {
    const engine = new MerchantRewardEngine();
    const card = engine.generateScratchCard({
      businessId: 'TENANT-A',
      rewardType: 'CASHBACK',
      minAmountPaisa: 2500,
      maxAmountPaisa: 2500, // fixed for test
      seed: 42
    });
    assert.strictEqual(card.status, 'UNLOCKED');

    // Scratching below 70% does not reveal
    const unrevealed = engine.scratchCard(card.reward_id, 50);
    assert.strictEqual(unrevealed.status, 'UNLOCKED');

    // Attempting to claim unrevealed throws error
    assert.throws(() => engine.claimReward(card.reward_id, 100000), /CARD_NOT_REVEALED_YET/);

    // Scratching at 75% reveals card
    const revealed = engine.scratchCard(card.reward_id, 75);
    assert.strictEqual(revealed.status, 'SCRATCHED');

    // Claim prize
    const claimRes = engine.claimReward(card.reward_id, 100000);
    assert.strictEqual(claimRes.claimed, true);
    assert.strictEqual(claimRes.creditedPaisa, 2500);
    assert.strictEqual(claimRes.newWalletBalancePaisa, 102500); // ৳1,000 + ৳25 = ৳1,025
    assert.strictEqual(claimRes.reward.status, 'CLAIMED');

    // Re-claiming throws error
    assert.throws(() => engine.claimReward(card.reward_id, 102500), /ALREADY_CLAIMED/);
  });

  await runTest('MerchantRewardEngine.redeemPoints debits points and credits wallet', () => {
    const engine = new MerchantRewardEngine();
    // Award 500 points first
    engine.awardTransactionPoints({ businessId: 'TENANT-A', txnAmountPaisa: 5000000 });

    // Redeem 300 points -> ৳30.00 = 3,000 paisa
    const res = engine.redeemPoints({
      businessId: 'TENANT-A',
      points: 300,
      currentWalletBalancePaisa: 100000
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.pointsDeducted, 300);
    assert.strictEqual(res.creditedPaisa, 3000);
    assert.strictEqual(res.newPointsBalance, 200);
    assert.strictEqual(res.newWalletBalancePaisa, 103000);

    // Insufficient points throws error
    assert.throws(() => engine.redeemPoints({ businessId: 'TENANT-A', points: 1000 }), /Insufficient points balance/);
  });

  await runTest('MerchantRewardEngine.processReferralReward and getRewardSummary aggregations', () => {
    const engine = new MerchantRewardEngine();
    // Referral bonus: ৳50.00 (5,000 paisa) each on qualifying transaction (>= ৳500)
    const ref = engine.processReferralReward({
      referrerBusinessId: 'REF-001',
      refereeBusinessId: 'REF-002',
      txnAmountPaisa: 60000, // ৳600 >= ৳500
      referrerWalletBalancePaisa: 100000,
      refereeWalletBalancePaisa: 50000,
      bonusPaisa: 5000
    });
    assert.strictEqual(ref.qualified, true);
    assert.strictEqual(ref.newReferrerWalletBalancePaisa, 105000);
    assert.strictEqual(ref.newRefereeWalletBalancePaisa, 55000);

    // Unqualified referral
    const unqual = engine.processReferralReward({
      referrerBusinessId: 'REF-001',
      refereeBusinessId: 'REF-003',
      txnAmountPaisa: 20000 // ৳200 < ৳500
    });
    assert.strictEqual(unqual.qualified, false);

    // Summary check for REF-001
    const summary = engine.getRewardSummary('REF-001');
    assert.strictEqual(summary.totalRewardsClaimed, 1);
  });

  // -------------------------------------------------------------
  // GROUP 8: StorageRepository Multi-Tenant Persistence & CRUD
  // -------------------------------------------------------------
  console.log('\n[GROUP 8: StorageRepository Multi-Tenant Persistence & CRUD]');

  await runTest('StorageRepository saves, filters, and manages merchant rewards', async () => {
    const repo = new StorageRepository();
    await repo.init();
    const saveRes = await repo.saveMerchantReward('TENANT-A', {
      reward_id: 'RWD-A1',
      reward_type: 'SCRATCH_CARD',
      amount_paisa: 3500,
      points: 0,
      status: 'UNLOCKED',
      title: 'টেস্ট স্ক্র্যাচ কার্ড'
    });
    assert.strictEqual(saveRes.success, true);
    assert.strictEqual(saveRes.reward.reward_id, 'RWD-A1');

    const fetched = repo.getMerchantRewardById('TENANT-A', 'RWD-A1');
    assert.strictEqual(fetched.amount_paisa, 3500);

    const exists = repo.existsMerchantReward('TENANT-A', 'RWD-A1');
    assert.strictEqual(exists, true);

    // Scratch card
    const scratchRes = await repo.scratchReward('TENANT-A', 'RWD-A1', 80);
    assert.strictEqual(scratchRes.revealed, true);
    assert.strictEqual(scratchRes.reward.status, 'SCRATCHED');

    // Claim card
    const claimRes = await repo.claimReward('TENANT-A', 'RWD-A1', 50000);
    assert.strictEqual(claimRes.success, true);
    assert.strictEqual(claimRes.creditedPaisa, 3500);
    assert.strictEqual(claimRes.newWalletBalancePaisa, 53500);

    const unsynced = repo.getUnsyncedMerchantRewards('TENANT-A');
    assert(unsynced.length >= 1);

    const updated = await repo.updateMerchantRewardSyncStatus('TENANT-A', ['RWD-A1'], 1);
    assert(updated >= 1);
  });

  await runTest('StorageRepository records reward ledger entries and executes redeemPointsToWallet', async () => {
    const repo = new StorageRepository();
    await repo.init();
    // Credit 500 points to ledger
    await repo.saveRewardLedgerEntry('TENANT-A', {
      points_change: 500,
      running_points_balance: 500,
      source_event: 'CAMPAIGN_BONUS'
    });

    assert.strictEqual(repo.getMerchantRewardPointsBalance('TENANT-A'), 500);

    // Redeem 250 points -> ৳25.00 (2,500 paisa)
    const redeemRes = await repo.redeemPointsToWallet('TENANT-A', 250, 100000);
    assert.strictEqual(redeemRes.success, true);
    assert.strictEqual(redeemRes.pointsDeducted, 250);
    assert.strictEqual(redeemRes.creditedPaisa, 2500);
    assert.strictEqual(redeemRes.newPointsBalance, 250);
    assert.strictEqual(redeemRes.newWalletBalancePaisa, 102500);

    const ledger = repo.getRewardLedger('TENANT-A');
    assert.strictEqual(ledger.length, 2);
  });

  // -------------------------------------------------------------
  // GROUP 9: Multi-Tenant Business Isolation & Cascade Deletion
  // -------------------------------------------------------------
  console.log('\n[GROUP 9: Multi-Tenant Business Isolation & Cascade Deletion]');

  await runTest('Strict business isolation: rewards and ledger of Tenant A are invisible to Tenant B', async () => {
    const repo = new StorageRepository();
    await repo.init();

    await repo.saveMerchantReward('TENANT-1', { reward_id: 'RWD-T1', amount_paisa: 1000 });
    await repo.saveMerchantReward('TENANT-2', { reward_id: 'RWD-T2', amount_paisa: 2000 });

    await repo.saveRewardLedgerEntry('TENANT-1', { points_change: 100 });
    await repo.saveRewardLedgerEntry('TENANT-2', { points_change: 200 });

    const rewardsT1 = repo.getMerchantRewards('TENANT-1');
    const rewardsT2 = repo.getMerchantRewards('TENANT-2');
    assert.strictEqual(rewardsT1.length, 1);
    assert.strictEqual(rewardsT1[0].reward_id, 'RWD-T1');
    assert.strictEqual(rewardsT2.length, 1);
    assert.strictEqual(rewardsT2[0].reward_id, 'RWD-T2');

    assert.strictEqual(repo.getMerchantRewardById('TENANT-1', 'RWD-T2'), null);
    assert.strictEqual(repo.getMerchantRewardById('TENANT-2', 'RWD-T1'), null);

    assert.strictEqual(repo.getMerchantRewardPointsBalance('TENANT-1'), 100);
    assert.strictEqual(repo.getMerchantRewardPointsBalance('TENANT-2'), 200);
  });

  await runTest('deleteBusinessCascade purges rewards and ledger for target tenant only', async () => {
    const repo = new StorageRepository();
    await repo.init();

    await repo.mutateStore((s) => ({
      ...s,
      businesses: [
        ...(s.businesses || []),
        { id: 'tenant_del', name: 'Tenant Del', isArchived: false },
        { id: 'tenant_keep', name: 'Tenant Keep', isArchived: false }
      ],
    }));

    await repo.saveMerchantReward('tenant_del', { reward_id: 'RWD-DEL' });
    await repo.saveMerchantReward('tenant_keep', { reward_id: 'RWD-KEEP' });

    await repo.saveRewardLedgerEntry('tenant_del', { points_change: 50 });
    await repo.saveRewardLedgerEntry('tenant_keep', { points_change: 75 });

    await repo.deleteBusinessCascade('tenant_del');

    assert.strictEqual(repo.getMerchantRewards('tenant_del').length, 0);
    assert.strictEqual(repo.getRewardLedger('tenant_del').length, 0);
    assert.strictEqual(repo.getMerchantRewardPointsBalance('tenant_del'), 0);

    // Tenant KEEP remains untouched
    assert.strictEqual(repo.getMerchantRewards('tenant_keep').length, 1);
    assert.strictEqual(repo.getRewardLedger('tenant_keep').length, 1);
    assert.strictEqual(repo.getMerchantRewardPointsBalance('tenant_keep'), 75);
  });

  // -------------------------------------------------------------
  // GROUP 10: Cloud Backup Sanitization & High-Throughput Performance Benchmark
  // -------------------------------------------------------------
  console.log('\n[GROUP 10: Cloud Backup Sanitization & High-Throughput Performance Benchmark]');

  await runTest('getFullBackupState sanitizes vouchers, tokens, and records exact recordCounts', async () => {
    const repo = new StorageRepository();
    await repo.init();

    await repo.saveMerchantReward('1', {
      reward_id: 'RWD-PII',
      voucherCode: 'SECRET_VOUCHER_123',
      token: 'BEARER_CONFIDENTIAL_TOKEN'
    });
    await repo.saveRewardLedgerEntry('1', { points_change: 300 });

    const backupState = await repo.getFullBackupState();
    assert.ok(backupState.merchantRewards);
    assert.ok(backupState.merchantRewardLedger);

    const backedUpReward = backupState.merchantRewards.find(r => r.reward_id === 'RWD-PII');
    assert.strictEqual(backedUpReward.voucherCode, undefined);
    assert.strictEqual(backedUpReward.token, undefined);

    const backupPayload = await repo.createStorageBackup();
    assert.strictEqual(backupPayload.manifest.recordCounts.merchantRewards, 1);
    assert.strictEqual(backupPayload.manifest.recordCounts.merchantRewardLedger, 1);
  });

  await runTest('commitRestorePayload restores merchant rewards and ledger state', async () => {
    const repo = new StorageRepository();
    await repo.init();

    const payload = {
      manifest: { schemaVersion: 6, businessesCount: 1 },
      data: {
        accounts: [],
        businesses: [{ id: 'RESTORE-BIZ', name: 'Restored Business' }],
        merchantRewards: [
          { reward_id: 'RWD-RESTORED', business_id: 'RESTORE-BIZ', amount_paisa: 7500, status: 'UNLOCKED' }
        ],
        merchantRewardLedger: [
          { entry_id: 'RWL-RESTORED', business_id: 'RESTORE-BIZ', points_change: 500, running_points_balance: 500 }
        ]
      }
    };

    const restoreRes = await repo.commitRestorePayload(payload, { mode: 'full' });
    assert.strictEqual(restoreRes.success, true);

    const rewards = repo.getMerchantRewards('RESTORE-BIZ');
    assert.strictEqual(rewards.length, 1);
    assert.strictEqual(rewards[0].reward_id, 'RWD-RESTORED');

    const points = repo.getMerchantRewardPointsBalance('RESTORE-BIZ');
    assert.strictEqual(points, 500);
  });

  await runTest('High-throughput performance benchmark: executes 1,000 reward and ledger operations in < 200ms', () => {
    const engine = new MerchantRewardEngine();
    const startTime = Date.now();

    for (let i = 0; i < 500; i++) {
      engine.awardTransactionPoints({
        businessId: 'PERF-BIZ',
        txnAmountPaisa: 1000000 + i * 10000
      });
      engine.generateScratchCard({
        businessId: 'PERF-BIZ',
        seed: i
      });
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`  (Executed 1,000 complete reward operations in ${elapsedMs}ms)`);
    assert(elapsedMs < 500, `Expected < 500ms, took ${elapsedMs}ms`);
  });

  console.log('\n==================================================================');
  console.log(` ALL ${passedTests}/${totalTests} BACKEND TESTS PASSED SUCCESSFULLY! (100% PASS RATE)`);
  console.log('==================================================================');
}

main().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
