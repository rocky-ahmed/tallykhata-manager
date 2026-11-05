/**
 * src/rewardsSubsystem.js
 *
 * Clean-Room TallyPay Merchant Cashback, Scratch Card Rewards & Loyalty Points Subsystem
 * Room SQLite Tables: merchant_reward, merchant_reward_ledger
 *
 * Milestone: REA-ITER-240
 * Target Reference: REF-001 (TallyKhata-Demo.apk, SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9)
 */

let _cachedIsoSec = 0;
let _cachedIsoStr = '';
function getFastIsoString() {
  const now = Date.now();
  const sec = Math.floor(now / 1000);
  if (sec !== _cachedIsoSec) {
    _cachedIsoSec = sec;
    _cachedIsoStr = new Date(now).toISOString();
  }
  return _cachedIsoStr;
}

// -------------------------------------------------------------
// 1. ROOM SQLITE SCHEMAS & DDL DEFINITIONS
// -------------------------------------------------------------
const MERCHANT_REWARD_SCHEMA = {
  tableName: 'merchant_reward',
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoincrement: true, notNull: true },
    { name: 'reward_id', type: 'TEXT', notNull: true, unique: true },
    { name: 'business_id', type: 'TEXT', notNull: true },
    { name: 'reward_type', type: 'TEXT', notNull: true },
    { name: 'amount_paisa', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'points', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'status', type: 'TEXT', notNull: true },
    { name: 'title', type: 'TEXT', notNull: true },
    { name: 'description', type: 'TEXT', notNull: false },
    { name: 'expiry_date', type: 'TEXT', notNull: false },
    { name: 'claimed_date', type: 'TEXT', notNull: false },
    { name: 'created_at', type: 'TEXT', notNull: true },
    { name: 'synced', type: 'INTEGER', notNull: true, defaultValue: 0 }
  ],
  indices: [
    {
      name: 'index_merchant_reward_reward_id',
      unique: true,
      columns: ['reward_id'],
      ddl: 'CREATE UNIQUE INDEX IF NOT EXISTS index_merchant_reward_reward_id ON merchant_reward (reward_id);'
    },
    {
      name: 'index_merchant_reward_business_id',
      unique: false,
      columns: ['business_id'],
      ddl: 'CREATE INDEX IF NOT EXISTS index_merchant_reward_business_id ON merchant_reward (business_id);'
    }
  ],
  ddl: `CREATE TABLE IF NOT EXISTS merchant_reward (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    reward_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    reward_type TEXT NOT NULL,
    amount_paisa INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    expiry_date TEXT,
    claimed_date TEXT,
    created_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );`
};
const REWARD_TABLE_SCHEMA = MERCHANT_REWARD_SCHEMA;

const MERCHANT_REWARD_LEDGER_SCHEMA = {
  tableName: 'merchant_reward_ledger',
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoincrement: true, notNull: true },
    { name: 'entry_id', type: 'TEXT', notNull: true, unique: true },
    { name: 'business_id', type: 'TEXT', notNull: true },
    { name: 'points_change', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'running_points_balance', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'cashback_paisa_change', type: 'INTEGER', notNull: true, defaultValue: 0 },
    { name: 'source_event', type: 'TEXT', notNull: true },
    { name: 'reference_id', type: 'TEXT', notNull: false },
    { name: 'created_at', type: 'TEXT', notNull: true },
    { name: 'synced', type: 'INTEGER', notNull: true, defaultValue: 0 }
  ],
  indices: [
    {
      name: 'index_merchant_reward_ledger_entry_id',
      unique: true,
      columns: ['entry_id'],
      ddl: 'CREATE UNIQUE INDEX IF NOT EXISTS index_merchant_reward_ledger_entry_id ON merchant_reward_ledger (entry_id);'
    },
    {
      name: 'index_merchant_reward_ledger_business_id',
      unique: false,
      columns: ['business_id'],
      ddl: 'CREATE INDEX IF NOT EXISTS index_merchant_reward_ledger_business_id ON merchant_reward_ledger (business_id);'
    }
  ],
  ddl: `CREATE TABLE IF NOT EXISTS merchant_reward_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    entry_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    points_change INTEGER NOT NULL DEFAULT 0,
    running_points_balance INTEGER NOT NULL DEFAULT 0,
    cashback_paisa_change INTEGER NOT NULL DEFAULT 0,
    source_event TEXT NOT NULL,
    reference_id TEXT,
    created_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );`
};
const REWARD_LEDGER_TABLE_SCHEMA = MERCHANT_REWARD_LEDGER_SCHEMA;

// -------------------------------------------------------------
// 2. ENUMS & CONSTANTS
// -------------------------------------------------------------
const REWARD_TYPES = {
  CASHBACK: 'CASHBACK',
  POINTS: 'POINTS',
  VOUCHER: 'VOUCHER',
  SCRATCH_CARD: 'SCRATCH_CARD'
};
const RewardType = REWARD_TYPES;
const MerchantRewardType = REWARD_TYPES;

const REWARD_STATUSES = {
  LOCKED: 'LOCKED',
  UNLOCKED: 'UNLOCKED',
  UNSCRATCHED: 'UNLOCKED',
  SCRATCHED: 'SCRATCHED',
  REVEALED: 'SCRATCHED',
  CLAIMED: 'CLAIMED',
  EXPIRED: 'EXPIRED'
};
const RewardStatus = REWARD_STATUSES;
const MerchantRewardStatus = REWARD_STATUSES;

const REWARD_LEDGER_SOURCE_EVENTS = {
  TRANSACTION_VOLUME: 'TRANSACTION_VOLUME',
  SCRATCH_CARD_CLAIM: 'SCRATCH_CARD_CLAIM',
  POINTS_REDEMPTION: 'POINTS_REDEMPTION',
  CAMPAIGN_BONUS: 'CAMPAIGN_BONUS',
  EXPIRY_REVERSAL: 'EXPIRY_REVERSAL',
  REFERRAL_BONUS: 'REFERRAL_BONUS'
};
const RewardLedgerSourceEvent = REWARD_LEDGER_SOURCE_EVENTS;

const CASHBACK_VOLUME_TIERS = {
  BRONZE: {
    tierKey: 'BRONZE',
    nameBn: 'ব্রোঞ্জ',
    minVolumePaisa: 0,
    maxVolumePaisa: 4999999,
    rateBps: 50
  },
  SILVER: {
    tierKey: 'SILVER',
    nameBn: 'সিলভার',
    minVolumePaisa: 5000000,
    maxVolumePaisa: 9999999,
    rateBps: 100
  },
  GOLD: {
    tierKey: 'GOLD',
    nameBn: 'গোল্ড',
    minVolumePaisa: 10000000,
    maxVolumePaisa: 19999999,
    rateBps: 150
  },
  PLATINUM: {
    tierKey: 'PLATINUM',
    nameBn: 'প্ল্যাটিনাম',
    minVolumePaisa: 20000000,
    maxVolumePaisa: Infinity,
    rateBps: 200
  }
};

const LOYALTY_TIERS = {
  BRONZE: { tier: 'BRONZE', nameBn: 'ব্রোঞ্জ', minCoins: 0, cashbackBoostBps: 0, freeTagadaSms: 0 },
  SILVER: { tier: 'SILVER', nameBn: 'সিলভার', minCoins: 500, cashbackBoostBps: 25, freeTagadaSms: 5 },
  GOLD: { tier: 'GOLD', nameBn: 'টালিখাতা গোল্ড', minCoins: 2000, cashbackBoostBps: 50, freeTagadaSms: 20 },
  PLATINUM: { tier: 'PLATINUM', nameBn: 'প্ল্যাটিনাম', minCoins: 5000, cashbackBoostBps: 100, freeTagadaSms: 50 }
};

const LOYALTY_POINTS_CONFIG = {
  pointsPerHundredTaka: 1,
  redemptionPointsPerTaka: 10,
  minRedemptionPoints: 100
};

const REWARD_ARSC_TOKENS = {
  cashback: 'ক্যাশব্যাক',
  cashback_badge: '%1$s ক্যাশব্যাক',
  cashback_headline: 'টালিপে দিয়ে পাচ্ছেন ক্যাশব্যাক %1$s',
  regular_cashback: 'নিয়মিত ক্যাশব্যাক',
  bonus_cashback: 'বোনাস ক্যাশব্যাক',
  gold_tier: 'টালিখাতা গোল্ড',
  refer_earn: 'রেফার করুন',
  scratch_card_title: 'স্ক্র্যাচ কার্ড রিওয়ার্ড',
  scratch_prompt: 'ঘষে পুরস্কার জিতে নিন!',
  points_title: 'লয়্যালটি পয়েন্টস',
  redeem_success: 'পয়েন্টস সফলভাবে ওয়ালেটে যোগ করা হয়েছে',
  claim_success: 'রিওয়ার্ড সফলভাবে গ্রহণ করা হয়েছে',
  expired_notice: 'এই রিওয়ার্ডের মেয়াদ শেষ হয়ে গেছে'
};

// -------------------------------------------------------------
// 3. FINANCIAL ARITHMETIC & CASHBACK CALCULATION ENGINES
// -------------------------------------------------------------
function getCashbackTier(monthlyVolumePaisa) {
  const vol = Number.isInteger(monthlyVolumePaisa) ? Math.max(0, monthlyVolumePaisa) : 0;
  if (vol >= 20000000) return CASHBACK_VOLUME_TIERS.PLATINUM;
  if (vol >= 10000000) return CASHBACK_VOLUME_TIERS.GOLD;
  if (vol >= 5000000) return CASHBACK_VOLUME_TIERS.SILVER;
  return CASHBACK_VOLUME_TIERS.BRONZE;
}

function calculateVolumeCashback(monthlyVolumePaisa, maxCashbackPaisa = 100000) {
  if (!Number.isInteger(monthlyVolumePaisa) || monthlyVolumePaisa < 0) {
    throw new Error('Monthly volume must be a non-negative integer in paisa');
  }
  const tier = getCashbackTier(monthlyVolumePaisa);
  const rawCashback = Math.floor((monthlyVolumePaisa * tier.rateBps) / 10000);
  const cappedCashback = Math.min(rawCashback, maxCashbackPaisa);
  return {
    monthlyVolumePaisa,
    tierKey: tier.tierKey,
    nameBn: tier.nameBn,
    rateBps: tier.rateBps,
    ratePercent: tier.rateBps / 100,
    rawCashbackPaisa: rawCashback,
    cashbackPaisa: cappedCashback,
    isCapped: rawCashback > maxCashbackPaisa
  };
}

function calculateCashback(txnAmountPaisa, rateBps, minTxnThresholdPaisa = 50000, maxCashbackPaisa = 10000) {
  if (!Number.isInteger(txnAmountPaisa) || txnAmountPaisa < minTxnThresholdPaisa) return 0;
  const rawCashback = Math.floor((txnAmountPaisa * rateBps) / 10000);
  return Math.min(rawCashback, maxCashbackPaisa);
}

function applyMonthlyCap(earnedPaisa, currentMonthlyTotalPaisa, monthlyCapPaisa = 100000) {
  const allowed = Math.max(0, monthlyCapPaisa - (currentMonthlyTotalPaisa || 0));
  return Math.min(earnedPaisa, allowed);
}

// -------------------------------------------------------------
// 4. LOYALTY POINTS & TIER ENGINES
// -------------------------------------------------------------
function calculatePointsEarned(txnAmountPaisa, coinsPerHundredTaka = 1) {
  if (!Number.isInteger(txnAmountPaisa) || txnAmountPaisa <= 0) return 0;
  return Math.floor(txnAmountPaisa / 10000) * coinsPerHundredTaka;
}
const calculateCoinsEarned = calculatePointsEarned;

function classifyMerchantTier(lifetimeCoins) {
  const coins = Number.isInteger(lifetimeCoins) ? Math.max(0, lifetimeCoins) : 0;
  if (coins >= 5000) return { ...LOYALTY_TIERS.PLATINUM };
  if (coins >= 2000) return { ...LOYALTY_TIERS.GOLD };
  if (coins >= 500) return { ...LOYALTY_TIERS.SILVER };
  return { ...LOYALTY_TIERS.BRONZE };
}

function calculatePointsRedemptionValue(pointsToRedeem, minCoinsThreshold = 100, coinsPerTaka = 10) {
  if (!Number.isInteger(pointsToRedeem) || pointsToRedeem < minCoinsThreshold) {
    throw new Error('MINIMUM_COIN_THRESHOLD_NOT_MET');
  }
  const takaCredit = Math.floor(pointsToRedeem / coinsPerTaka);
  const remainingCoins = pointsToRedeem % coinsPerTaka;
  return {
    creditedPaisa: takaCredit * 100,
    coinsDeducted: pointsToRedeem - remainingCoins,
    pointsDeducted: pointsToRedeem - remainingCoins,
    leftoverCoins: remainingCoins,
    leftoverPoints: remainingCoins
  };
}
const redeemCoinsToWallet = calculatePointsRedemptionValue;

function validatePointsRedemption(points, availablePoints, minThreshold = 100) {
  if (!Number.isInteger(points) || points <= 0) {
    return { valid: false, reason: 'INVALID_POINTS_AMOUNT', message: 'পয়েন্টসের পরিমাণ ধনাত্মক পূর্ণসংখ্যা হতে হবে।' };
  }
  if (points < minThreshold) {
    return { valid: false, reason: 'MINIMUM_THRESHOLD_NOT_MET', message: `সর্বনিম্ন ${minThreshold} পয়েন্টস রিডিম করা যাবে।` };
  }
  if (points > availablePoints) {
    return { valid: false, reason: 'INSUFFICIENT_POINTS', message: 'আপনার অ্যাকাউন্টে পর্যাপ্ত পয়েন্টস নেই।' };
  }
  return { valid: true };
}

// -------------------------------------------------------------
// 5. FINITE STATE MACHINE (FSM) TRANSITIONS
// -------------------------------------------------------------
function transitionRewardStatus(currentStatus, targetStatus, context = {}) {
  const current = String(currentStatus || '').toUpperCase();
  const target = String(targetStatus || '').toUpperCase();

  const normalize = (s) => {
    if (s === 'UNSCRATCHED') return 'UNLOCKED';
    if (s === 'REVEALED') return 'SCRATCHED';
    return s;
  };

  const nCur = normalize(current);
  const nTgt = normalize(target);

  if (nCur === 'CLAIMED' || nCur === 'EXPIRED') {
    throw new Error(`Cannot transition from terminal state: ${current}`);
  }

  const ALLOWED = {
    LOCKED: ['UNLOCKED', 'EXPIRED'],
    UNLOCKED: ['SCRATCHED', 'EXPIRED'],
    SCRATCHED: ['CLAIMED', 'EXPIRED']
  };

  const validTargets = ALLOWED[nCur] || [];
  if (!validTargets.includes(nTgt)) {
    throw new Error(`Illegal reward status transition from ${current} to ${target}`);
  }

  if (nTgt === 'EXPIRED' && context.expiryDate) {
    if (new Date(context.expiryDate) > new Date()) {
      throw new Error('Cannot expire reward before expiry date');
    }
  }

  return target;
}

// -------------------------------------------------------------
// 6. DETERMINISTIC SEEDED SCRATCH CARD GENERATOR
// -------------------------------------------------------------
function _mulberry32(seed) {
  let s = typeof seed === 'string'
    ? seed.split('').reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
    : (seed | 0);
  return function() {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _rewardSeq = 1;
let _rewardLedgerSeq = 1;

class MerchantRewardRecord {
  constructor(data = {}) {
    this.id = data.id || null;
    this.reward_id = data.reward_id || `TK-RWD-${Date.now()}-${_rewardSeq++}`;
    this.business_id = String(data.business_id || data.businessId || '1');
    this.reward_type = data.reward_type || data.rewardType || REWARD_TYPES.SCRATCH_CARD;
    this.amount_paisa = Number.isInteger(data.amount_paisa) ? data.amount_paisa : (Number.isInteger(data.amountPaisa) ? data.amountPaisa : 0);
    this.points = Number.isInteger(data.points) ? data.points : 0;
    this.status = data.status || REWARD_STATUSES.UNLOCKED;
    this.title = data.title || 'রিওয়ার্ড';
    this.description = data.description || '';
    this.expiry_date = data.expiry_date || data.expiryDate || null;
    this.claimed_date = data.claimed_date || data.claimedDate || null;
    this.created_at = data.created_at || data.createdAt || getFastIsoString();
    this.synced = data.synced !== undefined ? data.synced : 0;
  }
}

class MerchantRewardLedgerRecord {
  constructor(data = {}) {
    this.id = data.id || null;
    this.entry_id = data.entry_id || `TK-RWL-${Date.now()}-${_rewardLedgerSeq++}`;
    this.business_id = String(data.business_id || data.businessId || '1');
    this.points_change = Number.isInteger(data.points_change) ? data.points_change : (Number.isInteger(data.pointsChange) ? data.pointsChange : 0);
    this.running_points_balance = Number.isInteger(data.running_points_balance) ? data.running_points_balance : (Number.isInteger(data.runningPointsBalance) ? data.runningPointsBalance : 0);
    this.cashback_paisa_change = Number.isInteger(data.cashback_paisa_change) ? data.cashback_paisa_change : (Number.isInteger(data.cashbackPaisaChange) ? data.cashbackPaisaChange : 0);
    this.source_event = data.source_event || data.sourceEvent || REWARD_LEDGER_SOURCE_EVENTS.TRANSACTION_VOLUME;
    this.reference_id = data.reference_id || data.referenceId || null;
    this.created_at = data.created_at || data.createdAt || getFastIsoString();
    this.synced = data.synced !== undefined ? data.synced : 0;
  }
}

function generateSeededScratchCard({
  businessId = '1',
  title = 'লটারি স্ক্র্যাচ কার্ড',
  description = 'ঘষে আকর্ষণীয় পুরস্কার জিতে নিন',
  seed = Date.now(),
  minAmountPaisa = 500,
  maxAmountPaisa = 10000,
  minPoints = 50,
  maxPoints = 500,
  rewardType = null,
  expiryDays = 7,
  status = REWARD_STATUSES.UNLOCKED
} = {}) {
  const prng = _mulberry32(seed);
  const randVal = prng();
  const selectedType = rewardType || (randVal > 0.5 ? REWARD_TYPES.CASHBACK : REWARD_TYPES.POINTS);

  let amountPaisa = 0;
  let points = 0;
  if (selectedType === REWARD_TYPES.CASHBACK) {
    const range = maxAmountPaisa - minAmountPaisa;
    amountPaisa = minAmountPaisa + Math.floor(prng() * (range + 1));
  } else {
    const range = maxPoints - minPoints;
    points = minPoints + Math.floor(prng() * (range + 1));
  }

  const expiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return new MerchantRewardRecord({
    business_id: businessId,
    reward_type: selectedType,
    amount_paisa: amountPaisa,
    points: points,
    status: status,
    title,
    description,
    expiry_date: expiry,
    created_at: getFastIsoString(),
    synced: 0
  });
}

// -------------------------------------------------------------
// 7. IN-MEMORY DAOS
// -------------------------------------------------------------
class MerchantRewardDao {
  constructor() {
    this.rewards = [];
    this.rewardsById = new Map();
    this.nextId = 1;
  }

  saveReward(record) {
    const reward = record instanceof MerchantRewardRecord ? record : new MerchantRewardRecord(record);
    const existing = this.rewardsById.get(reward.reward_id);
    if (existing) {
      reward.id = existing.id;
      Object.assign(existing, reward);
      return { ...existing };
    }
    reward.id = this.nextId++;
    const cloned = { ...reward };
    this.rewards.push(cloned);
    this.rewardsById.set(reward.reward_id, cloned);
    return { ...cloned };
  }

  getRewardById(rewardId) {
    const found = this.rewardsById.get(rewardId);
    return found ? { ...found } : null;
  }

  getRewardsByBusinessId(businessId, options = {}) {
    const bId = String(businessId);
    let list = this.rewards.filter(r => r.business_id === bId);
    if (options.status) {
      list = list.filter(r => r.status === options.status);
    }
    if (options.reward_type) {
      list = list.filter(r => r.reward_type === options.reward_type);
    }
    if (options.synced !== undefined) {
      list = list.filter(r => r.synced === options.synced);
    }
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const offset = options.offset || 0;
    const limit = options.limit || list.length;
    return list.slice(offset, offset + limit).map(r => ({ ...r }));
  }

  updateRewardStatus(rewardId, status, extraFields = {}) {
    const reward = this.rewards.find(r => r.reward_id === rewardId);
    if (!reward) throw new Error(`Reward not found with ID: ${rewardId}`);
    reward.status = status;
    reward.synced = 0;
    Object.assign(reward, extraFields);
    return { ...reward };
  }

  deleteReward(rewardId) {
    const idx = this.rewards.findIndex(r => r.reward_id === rewardId);
    if (idx !== -1) {
      this.rewards.splice(idx, 1);
      this.rewardsById.delete(rewardId);
      return true;
    }
    return false;
  }

  exists(rewardId) {
    return this.rewardsById.has(rewardId);
  }

  getUnsyncedRewards(limit = 50) {
    return this.rewards.filter(r => r.synced === 0).slice(0, limit).map(r => ({ ...r }));
  }

  updateRewardSyncStatus(ids, synced = 1) {
    const idSet = new Set(ids);
    let updated = 0;
    for (const r of this.rewards) {
      if (idSet.has(r.id) || idSet.has(r.reward_id)) {
        r.synced = synced;
        updated++;
      }
    }
    return updated;
  }
}

class MerchantRewardLedgerDao {
  constructor() {
    this.entries = [];
    this.entriesById = new Map();
    this.nextId = 1;
  }

  saveEntry(record) {
    const entry = record instanceof MerchantRewardLedgerRecord ? record : new MerchantRewardLedgerRecord(record);
    const existing = this.entriesById.get(entry.entry_id);
    if (existing) {
      entry.id = existing.id;
      Object.assign(existing, entry);
      return { ...existing };
    }
    entry.id = this.nextId++;
    const cloned = { ...entry };
    this.entries.push(cloned);
    this.entriesById.set(entry.entry_id, cloned);
    return { ...cloned };
  }

  getEntriesByBusinessId(businessId, options = {}) {
    const bId = String(businessId);
    let list = this.entries.filter(e => e.business_id === bId);
    if (options.source_event) {
      list = list.filter(e => e.source_event === options.source_event);
    }
    if (options.synced !== undefined) {
      list = list.filter(e => e.synced === options.synced);
    }
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const offset = options.offset || 0;
    const limit = options.limit || list.length;
    return list.slice(offset, offset + limit).map(e => ({ ...e }));
  }

  getRunningPointsBalance(businessId) {
    const bId = String(businessId);
    const list = this.entries.filter(e => e.business_id === bId);
    if (list.length === 0) return 0;
    return list.reduce((sum, e) => sum + (e.points_change || 0), 0);
  }

  getUnsyncedEntries(limit = 50) {
    return this.entries.filter(e => e.synced === 0).slice(0, limit).map(e => ({ ...e }));
  }

  updateEntrySyncStatus(ids, synced = 1) {
    const idSet = new Set(ids);
    let updated = 0;
    for (const e of this.entries) {
      if (idSet.has(e.id) || idSet.has(e.entry_id)) {
        e.synced = synced;
        updated++;
      }
    }
    return updated;
  }
}

// -------------------------------------------------------------
// 8. MERCHANT REWARD ENGINE
// -------------------------------------------------------------
class MerchantRewardEngine {
  constructor(rewardDao = null, ledgerDao = null) {
    this.rewardDao = rewardDao || new MerchantRewardDao();
    this.ledgerDao = ledgerDao || new MerchantRewardLedgerDao();
  }

  applyVolumeCashback({ businessId = '1', monthlyVolumePaisa, walletBalancePaisa = 0, maxCashbackPaisa = 100000 }) {
    const result = calculateVolumeCashback(monthlyVolumePaisa, maxCashbackPaisa);
    if (result.cashbackPaisa <= 0) {
      return {
        ...result,
        credited: false,
        newWalletBalancePaisa: walletBalancePaisa
      };
    }

    const reward = this.rewardDao.saveReward({
      business_id: businessId,
      reward_type: REWARD_TYPES.CASHBACK,
      amount_paisa: result.cashbackPaisa,
      points: 0,
      status: REWARD_STATUSES.CLAIMED,
      title: 'মাসিক ক্যাশব্যাক রিওয়ার্ড',
      description: `${result.nameBn} টিয়ার ক্যাশব্যাক (${result.ratePercent}%)`,
      claimed_date: getFastIsoString()
    });

    this.ledgerDao.saveEntry({
      business_id: businessId,
      points_change: 0,
      running_points_balance: this.ledgerDao.getRunningPointsBalance(businessId),
      cashback_paisa_change: result.cashbackPaisa,
      source_event: REWARD_LEDGER_SOURCE_EVENTS.TRANSACTION_VOLUME,
      reference_id: reward.reward_id
    });

    return {
      ...result,
      credited: true,
      rewardId: reward.reward_id,
      newWalletBalancePaisa: walletBalancePaisa + result.cashbackPaisa
    };
  }

  awardTransactionPoints({ businessId = '1', txnAmountPaisa, txnId = null, txnType = 'QR_PAYMENT' }) {
    const pointsEarned = calculatePointsEarned(txnAmountPaisa);
    if (pointsEarned <= 0) {
      return {
        pointsEarned: 0,
        runningPointsBalance: this.ledgerDao.getRunningPointsBalance(businessId)
      };
    }

    const currentBalance = this.ledgerDao.getRunningPointsBalance(businessId);
    const newBalance = currentBalance + pointsEarned;

    const entry = this.ledgerDao.saveEntry({
      business_id: businessId,
      points_change: pointsEarned,
      running_points_balance: newBalance,
      cashback_paisa_change: 0,
      source_event: REWARD_LEDGER_SOURCE_EVENTS.TRANSACTION_VOLUME,
      reference_id: txnId || `TXN-${Date.now()}`
    });

    return {
      pointsEarned,
      runningPointsBalance: newBalance,
      entryId: entry.entry_id,
      tier: classifyMerchantTier(newBalance)
    };
  }

  generateScratchCard(options = {}) {
    const card = generateSeededScratchCard(options);
    return this.rewardDao.saveReward(card);
  }

  scratchCard(rewardId, scratchPercentage = 100) {
    const reward = this.rewardDao.getRewardById(rewardId);
    if (!reward) throw new Error(`Reward not found with ID: ${rewardId}`);
    if (reward.status === REWARD_STATUSES.CLAIMED) throw new Error('ALREADY_CLAIMED');
    if (reward.status === REWARD_STATUSES.EXPIRED) throw new Error('REWARD_EXPIRED');

    if (scratchPercentage >= 70 && (reward.status === REWARD_STATUSES.UNLOCKED || reward.status === 'UNSCRATCHED')) {
      return this.rewardDao.updateRewardStatus(rewardId, REWARD_STATUSES.SCRATCHED);
    }
    return reward;
  }

  claimReward(rewardId, currentWalletBalancePaisa = 0) {
    const reward = this.rewardDao.getRewardById(rewardId);
    if (!reward) throw new Error(`Reward not found with ID: ${rewardId}`);
    if (reward.status === REWARD_STATUSES.CLAIMED) throw new Error('ALREADY_CLAIMED');
    if (reward.status !== REWARD_STATUSES.SCRATCHED && reward.status !== 'REVEALED') {
      throw new Error('CARD_NOT_REVEALED_YET');
    }

    const claimedDate = getFastIsoString();
    const updatedReward = this.rewardDao.updateRewardStatus(rewardId, REWARD_STATUSES.CLAIMED, {
      claimed_date: claimedDate
    });

    let newWalletBalancePaisa = currentWalletBalancePaisa;
    let pointsAdded = 0;

    if (reward.amount_paisa > 0) {
      newWalletBalancePaisa += reward.amount_paisa;
    }
    if (reward.points > 0) {
      pointsAdded = reward.points;
    }

    const currentPoints = this.ledgerDao.getRunningPointsBalance(reward.business_id);
    const newPoints = currentPoints + pointsAdded;

    this.ledgerDao.saveEntry({
      business_id: reward.business_id,
      points_change: pointsAdded,
      running_points_balance: newPoints,
      cashback_paisa_change: reward.amount_paisa,
      source_event: REWARD_LEDGER_SOURCE_EVENTS.SCRATCH_CARD_CLAIM,
      reference_id: reward.reward_id
    });

    return {
      claimed: true,
      reward: updatedReward,
      creditedPaisa: reward.amount_paisa,
      pointsAdded,
      newWalletBalancePaisa,
      newPointsBalance: newPoints
    };
  }

  redeemPoints({ businessId = '1', points, currentWalletBalancePaisa = 0 }) {
    const currentPoints = this.ledgerDao.getRunningPointsBalance(businessId);
    if (points > currentPoints) {
      throw new Error(`Insufficient points balance: available ${currentPoints}, requested ${points}`);
    }

    const redemption = calculatePointsRedemptionValue(points);
    const newPointsBalance = currentPoints - redemption.pointsDeducted;
    const newWalletBalancePaisa = currentWalletBalancePaisa + redemption.creditedPaisa;

    const entry = this.ledgerDao.saveEntry({
      business_id: businessId,
      points_change: -redemption.pointsDeducted,
      running_points_balance: newPointsBalance,
      cashback_paisa_change: redemption.creditedPaisa,
      source_event: REWARD_LEDGER_SOURCE_EVENTS.POINTS_REDEMPTION,
      reference_id: `RED-${Date.now()}`
    });

    return {
      success: true,
      pointsDeducted: redemption.pointsDeducted,
      creditedPaisa: redemption.creditedPaisa,
      newPointsBalance,
      newWalletBalancePaisa,
      entryId: entry.entry_id
    };
  }

  processReferralReward({
    referrerBusinessId,
    refereeBusinessId,
    txnAmountPaisa,
    referrerWalletBalancePaisa = 0,
    refereeWalletBalancePaisa = 0,
    bonusPaisa = 5000,
    minTxnThresholdPaisa = 50000
  }) {
    if (txnAmountPaisa < minTxnThresholdPaisa) {
      return { qualified: false, reason: 'MINIMUM_TXN_THRESHOLD_NOT_MET' };
    }

    const refReward = this.rewardDao.saveReward({
      business_id: referrerBusinessId,
      reward_type: REWARD_TYPES.CASHBACK,
      amount_paisa: bonusPaisa,
      points: 0,
      status: REWARD_STATUSES.CLAIMED,
      title: 'রেফারেল বোনাস',
      description: 'নতুন মার্চেন্ট রেফার করার জন্য বোনাস',
      claimed_date: getFastIsoString()
    });

    const refereeReward = this.rewardDao.saveReward({
      business_id: refereeBusinessId,
      reward_type: REWARD_TYPES.CASHBACK,
      amount_paisa: bonusPaisa,
      points: 0,
      status: REWARD_STATUSES.CLAIMED,
      title: 'রেফারেল ওয়েলকাম বোনাস',
      description: 'রেফারেল কোড ব্যবহারের জন্য বোনাস',
      claimed_date: getFastIsoString()
    });

    return {
      qualified: true,
      referrerBonusPaisa: bonusPaisa,
      refereeBonusPaisa: bonusPaisa,
      newReferrerWalletBalancePaisa: referrerWalletBalancePaisa + bonusPaisa,
      newRefereeWalletBalancePaisa: refereeWalletBalancePaisa + bonusPaisa,
      referrerRewardId: refReward.reward_id,
      refereeRewardId: refereeReward.reward_id
    };
  }

  getRewardSummary(businessId = '1') {
    const rewards = this.rewardDao.getRewardsByBusinessId(businessId);
    const pointsBalance = this.ledgerDao.getRunningPointsBalance(businessId);
    const entries = this.ledgerDao.getEntriesByBusinessId(businessId);

    const totalCashbackEarnedPaisa = entries.reduce((sum, e) => sum + (e.cashback_paisa_change || 0), 0);
    const totalRewardsClaimed = rewards.filter(r => r.status === REWARD_STATUSES.CLAIMED).length;
    const activeScratchCardsCount = rewards.filter(r => r.status === REWARD_STATUSES.UNLOCKED || r.status === REWARD_STATUSES.SCRATCHED).length;
    const pointsRedemptionValuePaisa = Math.floor(pointsBalance / 10) * 100;
    const tier = classifyMerchantTier(pointsBalance);

    return {
      totalCashbackEarnedPaisa,
      totalPointsBalance: pointsBalance,
      totalRewardsClaimed,
      activeScratchCardsCount,
      pointsRedemptionValuePaisa,
      tier
    };
  }
}

const ReconstructedRewardEngine = MerchantRewardEngine;
const RewardEngine = MerchantRewardEngine;
const TallyPayRewardsEngine = MerchantRewardEngine;
const merchantRewardEngine = new MerchantRewardEngine();
const reconstructedRewardEngine = merchantRewardEngine;

module.exports = {
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
  reconstructedRewardEngine
};
