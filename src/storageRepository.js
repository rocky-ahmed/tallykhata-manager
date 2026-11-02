/**
 * src/storageRepository.js
 * Production Storage Repository & Offline State Manager for TallyKhata
 * - Stable, module-scoped write queue mutex that survives component rerenders
 * - mutateCollection(collectionName, updater): Atomic same-collection updates on latest committed data
 * - mutateStore(updater): Multi-collection atomic mutations inside the write queue
 * - Prevents stale React state snapshots from overwriting newer records
 * - Protects against failed write lockups (queue never permanently blocks)
 * - Safe v5 to v6 migration with backup retention
 * - Injectable storage adapter (AsyncStorage in production, Memory/Disk in test)
 */

const SAFETY_SNAPSHOT_KEY = 'tallykhata_safety_snapshot';
let moneyManagerService = null;
try {
  moneyManagerService = require('./moneyManagerService');
} catch (e) {}

let preferencesService = null;
try {
  preferencesService = require('./preferencesService');
} catch (e) {}

const MM_STORAGE_KEY = (moneyManagerService && moneyManagerService.MM_STORAGE_KEY) || '@tallykhata_personal_money_manager_v2';
const PREFERENCES_STORAGE_KEY = (preferencesService && preferencesService.PREFERENCES_STORAGE_KEY) || '@tallykhata_app_preferences_v1';

const {
  migrateV5toV6,
  V5_KEY,
  V6_KEY,
  V5_BACKUP_KEY,
  recalculateAccountRunningBalances,
  normalizeAccountFields,
  normalizeTagadaLogFields,
  resolveStatementDateRange,
  generateAccountStatement,
} = require('./ledgerEngine');

const VALID_COLLECTIONS = new Set([
  'accounts',
  'journals',
  'cashEntries',
  'inventory',
  'stock',
  'notes',
  'walletTxns',
  'businesses',
  'tagadaLogs',
]);

// Default initial dataset with 100% mathematically consistent opening balances and journal running totals
const DEFAULT_BUSINESSES = [
  {
    id: '1',
    business_id: 1,
    name: 'Mobile Xpress',
    business_name: 'Mobile Xpress',
    businessName: 'Mobile Xpress',
    owner: 'স্বত্বাধিকারী',
    phone: '01700000000',
    address: 'বাজার রোড, ঢাকা',
    business_address: 'বাজার রোড, ঢাকা',
    businessAddress: 'বাজার রোড, ঢাকা',
    business_type: 'RETAIL',
    businessType: 'RETAIL',
    business_age: 0,
    synced: 0,
    is_active: 1,
    is_primary: 1,
    is_current: 1,
    isSelected: true,
    isArchived: false,
    isPrimary: true,
    createdAt: '2026-10-15T00:00:00.000Z',
    create_date: '2026-10-15T00:00:00.000Z',
  },
  {
    id: '2',
    business_id: 2,
    name: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ',
    business_name: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ',
    businessName: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ',
    owner: 'হাজী মো: করিম',
    phone: '01811223344',
    address: 'পাইকারি আড়ৎ, ঢাকা',
    business_address: 'পাইকারি আড়ৎ, ঢাকা',
    businessAddress: 'পাইকারি আড়ৎ, ঢাকা',
    business_type: 'WHOLESALE',
    businessType: 'WHOLESALE',
    business_age: 0,
    synced: 0,
    is_active: 1,
    is_primary: 0,
    is_current: 0,
    isSelected: false,
    isArchived: false,
    isPrimary: false,
    createdAt: '2026-10-15T00:00:00.000Z',
    create_date: '2026-10-15T00:00:00.000Z',
  },
  {
    id: '3',
    business_id: 3,
    name: 'সোনালী ফ্যাশন ও বস্ত্রালয়',
    business_name: 'সোনালী ফ্যাশন ও বস্ত্রালয়',
    businessName: 'সোনালী ফ্যাশন ও বস্ত্রালয়',
    owner: 'আহমেদ উল্লাহ',
    phone: '01911334455',
    address: 'নিউ মার্কেট, ঢাকা',
    business_address: 'নিউ মার্কেট, ঢাকা',
    businessAddress: 'নিউ মার্কেট, ঢাকা',
    business_type: 'RETAIL',
    businessType: 'RETAIL',
    business_age: 0,
    synced: 0,
    is_active: 1,
    is_primary: 0,
    is_current: 0,
    isSelected: false,
    isArchived: false,
    isPrimary: false,
    createdAt: '2026-10-15T00:00:00.000Z',
    create_date: '2026-10-15T00:00:00.000Z',
  },
];


// 1:1 Mapping between legacy default seed names and modern Bengali sample customer names
const SAMPLE_CUSTOMER_MAPPINGS = {
  '1': { legacy: 'Raihan ★ khoksha', modern: 'নমুনা গ্রাহক ০১' },
  '2': { legacy: 'Faysal ★★', modern: 'নমুনা গ্রাহক ০২' },
  '3': { legacy: 'Abd. Samad ★ Jv', modern: 'নমুনা গ্রাহক ০৩' },
  '4': { legacy: 'Tanvir ★ Al Baraka', modern: 'নমুনা গ্রাহক ০৪' },
  '5': { legacy: 'Jwel Vai Gk', modern: 'নমুনা গ্রাহক ০৫' },
  '6': { legacy: 'Shamim Telecom', modern: 'নমুনা গ্রাহক ০৬' },
  '7': { legacy: 'Kabir Hardware', modern: 'নমুনা গ্রাহক ০৭' },
  '8': { legacy: 'Babul Enterprise', modern: 'নমুনা গ্রাহক ০৮' },
  '9': { legacy: 'Rubel Electronics', modern: 'নমুনা গ্রাহক ০৯' },
  '10': { legacy: 'Shuvo Mobile Store', modern: 'নমুনা গ্রাহক ১০' },
  '11': { legacy: 'Ripon Telecom', modern: 'নমুনা গ্রাহক ১১' },
  '12': { legacy: 'Monir Store', modern: 'নমুনা গ্রাহক ১২' },
};

/**
 * Idempotently updates legacy default sample customer names under IDs '1'..'12'
 * to modern Bengali sample names without ever mutating user-created or user-renamed customers.
 */
function migrateLegacySampleCustomerNames(accounts) {
  if (!Array.isArray(accounts)) return { accounts, changed: false };
  let changed = false;
  const updatedAccounts = accounts.map((acc) => {
    if (!acc || typeof acc !== 'object') return acc;
    const mapping = SAMPLE_CUSTOMER_MAPPINGS[String(acc.id)];
    if (mapping && typeof acc.name === 'string' && acc.name.trim() === mapping.legacy) {
      changed = true;
      return {
        ...acc,
        name: mapping.modern,
      };
    }
    return acc;
  });
  return { accounts: updatedAccounts, changed };
}

function createDefaultState() {
  return {
    accounts: [
      { id: '1', name: 'নমুনা গ্রাহক ০১', phone: '01711223344', type: 1, openingBalance: 3800, balance: 7000, address: 'খোকসা বাজার', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '2', name: 'নমুনা গ্রাহক ০২', phone: '01812345678', type: 1, openingBalance: 8550, balance: 10000, address: 'পশ্চিম পাড়া', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '3', name: 'নমুনা গ্রাহক ০৩', phone: '01911998877', type: 1, openingBalance: 3000, balance: 8000, address: 'জেভি মোড়', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '4', name: 'নমুনা গ্রাহক ০৪', phone: '01622334455', type: 1, openingBalance: 0, balance: 0, address: 'আল বারাকা মার্কেট', createDate: '2026-10-15', timeAgo: '৪ মাস' },
      { id: '5', name: 'নমুনা গ্রাহক ০৫', phone: '01733445566', type: 1, openingBalance: 500, balance: 500, address: 'জিকে কলোনি', createDate: '2026-10-15', timeAgo: '৫ মাস' },
      { id: '6', name: 'নমুনা গ্রাহক ০৬', phone: '01744556677', type: 1, openingBalance: 12000, balance: 12000, address: 'স্টেশন রোড', createDate: '2026-10-15', timeAgo: '৬ মাস' },
      { id: '7', name: 'নমুনা গ্রাহক ০৭', phone: '01755667788', type: 1, openingBalance: 15000, balance: 15000, address: 'মেইন রোড', createDate: '2026-10-15', timeAgo: '২ মাস' },
      { id: '8', name: 'নমুনা গ্রাহক ০৮', phone: '01766778899', type: 1, openingBalance: 18000, balance: 18000, address: 'চকবাজার', createDate: '2026-10-15', timeAgo: '১ মাস' },
      { id: '9', name: 'নমুনা গ্রাহক ০৯', phone: '01777889900', type: 1, openingBalance: 14000, balance: 14000, address: 'নিউ মার্কেট', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '10', name: 'নমুনা গ্রাহক ১০', phone: '01788990011', type: 1, openingBalance: 9000, balance: 9000, address: 'কলেজ গেট', createDate: '2026-10-15', timeAgo: '৪ মাস' },
      { id: '11', name: 'নমুনা গ্রাহক ১১', phone: '01799001122', type: 1, openingBalance: 7000, balance: 7000, address: 'থানা মোড়', createDate: '2026-10-15', timeAgo: '৫ মাস' },
      { id: '12', name: 'নমুনা গ্রাহক ১২', phone: '01712341234', type: 1, openingBalance: 8000, balance: 8000, address: 'হাসপাতাল রোড', createDate: '2026-10-15', timeAgo: '২ মাস' },
    ],
    journals: [
      { id: '1', accountId: '1', type: 'given', amount: 3200, desc: 'বাকিতে চাল ও ডাল বিক্রয়', date: '2026-10-15', time: '10:30 AM', runningBalance: 7000 },
      { id: '2', accountId: '2', type: 'given', amount: 1450, desc: 'মালামাল বাকি বিক্রি', date: '2026-10-15', time: '11:15 AM', runningBalance: 10000 },
      { id: '3', accountId: '3', type: 'given', amount: 5000, desc: 'পাইকারি মাল ক্রয় বাবদ দেনা', date: '2026-10-15', time: '02:00 PM', runningBalance: 8000 },
    ],
    cashEntries: [
      { id: '1', category: 'sale', type: 'in', amount: 4500, desc: 'সকালের নগদ বিক্রি', date: '2026-10-15', time: '09:00 AM' },
      { id: '2', category: 'cost', type: 'out', amount: 250, desc: 'দোকান খরচ ও নাস্তা', date: '2026-10-15', time: '11:00 AM' },
      { id: '3', category: 'malik_in', type: 'in', amount: 2000, desc: 'মালিকের দেওয়া নগদ টাকা (জমা)', date: '2026-10-15', time: '08:30 AM' },
    ],
    inventory: [
      { id: '1', name: 'মিনিকেট চাল (৫০ কেজি)', unit: 'বস্তা', buyPrice: 3200, sellPrice: 3450, stock: 25 },
      { id: '2', name: 'তীর সয়াবিন তেল (৫ লিটার)', unit: 'বোতল', buyPrice: 820, sellPrice: 875, stock: 40 },
      { id: '3', name: 'চিনি (প্যাকেট)', unit: 'কেজি', buyPrice: 130, sellPrice: 140, stock: 65 },
      { id: '4', name: 'মসুর ডাল (দেশি)', unit: 'কেজি', buyPrice: 135, sellPrice: 150, stock: 8 },
    ],
    stock: [
      { id: '1', name: 'মিনিকেট চাল (৫০ কেজি)', unit: 'বস্তা', buyPrice: 3200, sellPrice: 3450, stock: 25 },
      { id: '2', name: 'তীর সয়াবিন তেল (৫ লিটার)', unit: 'বোতল', buyPrice: 820, sellPrice: 875, stock: 40 },
      { id: '3', name: 'চিনি (প্যাকেট)', unit: 'কেজি', buyPrice: 130, sellPrice: 140, stock: 65 },
      { id: '4', name: 'মসুর ডাল (দেশি)', unit: 'কেজি', buyPrice: 135, sellPrice: 150, stock: 8 },
    ],
    notes: [
      { id: '1', text: 'রবিবার সকালে আড়ৎ থেকে চাল ও তেল ডেলিভারি আসবে', isComplete: false, date: '2026-10-15' },
      { id: '2', text: 'বিদ্যুৎ বিল ও দোকান ভাড়া পরিশোধ করা হয়েছে', isComplete: true, date: '2026-10-15' },
    ],
    walletBalance: 1500,
    walletTxns: [
      { id: 'w1', title: 'অ্যাড মানি (বিকাশ)', amount: 2500, type: 'in', date: '2026-10-15', time: '10:00 AM' },
      { id: 'w2', title: 'মোবাইল রিচার্জ (01711223344)', amount: 100, type: 'out', date: '2026-10-15', time: '12:30 PM' },
    ],
    businessName: 'Mobile Xpress',
    ownerName: 'স্বত্বাধিকারী',
    ownerPhone: '01700000000',
    businessAddress: 'বাজার রোড, ঢাকা',
    businesses: DEFAULT_BUSINESSES,
    activeBusinessId: '1',
    remainingSmsCount: 5,
    tallyMessageBalance: 50,
    openingBalance: 3000,
    pinEnabled: false,
    appPin: '',
    tagadaLogs: [],
    version: 6,
  };
}

class StorageRepository {
  constructor(storageAdapter = null) {
    this.adapter = storageAdapter || this.createInMemoryAdapter();
    this.currentStore = null;
    this.writeQueue = Promise.resolve();
    this._pendingWrites = 0;
    this.telemetry = defaultTelemetryService;
  }

  getPendingWritesCount() {
    return Math.max(0, this._pendingWrites || 0);
  }

  isWriteQueueIdle() {
    return (this._pendingWrites || 0) === 0;
  }

  async waitForIdle() {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }
    return true;
  }

  createInMemoryAdapter() {
    const memory = new Map();
    return {
      getItem: async (key) => memory.has(key) ? memory.get(key) : null,
      setItem: async (key, val) => { memory.set(key, String(val)); },
      removeItem: async (key) => { memory.delete(key); },
      clear: async () => { memory.clear(); },
      _map: memory,
    };
  }

  setStorageAdapter(adapter) {
    if (adapter && typeof adapter.getItem === 'function' && typeof adapter.setItem === 'function') {
      this.adapter = adapter;
    }
  }

  /**
   * Safe, idempotent load of the store ensuring legacy default customer names are updated.
   */
  async loadStore() {
    const res = await this.loadInitialData();
    if (res && res.success && res.data && Array.isArray(res.data.accounts)) {
      const sampleCheck = migrateLegacySampleCustomerNames(res.data.accounts);
      if (sampleCheck.changed) {
        res.data.accounts = sampleCheck.accounts;
        if (this.currentStore) {
          this.currentStore.accounts = sampleCheck.accounts;
        }
        if (this.adapter && typeof this.adapter.setItem === 'function') {
          try {
            await this.adapter.setItem(V6_KEY, JSON.stringify(res.data));
          } catch (_) {}
        }
      }
    }
    return res;
  }
  async resetStore() {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }
    this.currentStore = null;
    this._cachedMoneyManager = null;
    clearJournalIndexCache();
    if (typeof moneyManagerService !== 'undefined' && moneyManagerService && typeof moneyManagerService.resetCache === 'function') {
      try { moneyManagerService.resetCache(); } catch (_) {}
    }
    if (typeof preferencesService !== 'undefined' && preferencesService && typeof preferencesService.resetCache === 'function') {
      try { preferencesService.resetCache(); } catch (_) {}
    }
    try {
      const { resetCache: resetLedgerCache } = require('./ledgerEngine');
      if (typeof resetLedgerCache === 'function') resetLedgerCache();
    } catch (_) {}
    this.writeQueue = Promise.resolve();
    this._pendingWrites = 0;
    return true;
  }

  getAuthoritativeState() {
    return this.currentStore ? JSON.parse(JSON.stringify(this.currentStore)) : null;
  }

  /**
   * Loads initial state with safe migration from v5 if v6 does not exist.
   * Ensures existing user records are NEVER overwritten by hardcoded seed data.
   */
  async loadInitialData() {
    try {
      let v6DataStr = await this.adapter.getItem(V6_KEY);
      if (!v6DataStr && typeof this.adapter.getItem === 'function') {
        v6DataStr = (await this.adapter.getItem('@' + V6_KEY)) ||
                    (await this.adapter.getItem('tallykhata_v6_store')) ||
                    (await this.adapter.getItem('@tallykhata_v6_store'));
      }
      if (v6DataStr) {
        const parsed = JSON.parse(v6DataStr);
        let storeNeedsSave = false;
        if (Array.isArray(parsed.accounts)) {
          const sampleCheck = migrateLegacySampleCustomerNames(parsed.accounts);
          if (sampleCheck.changed) {
            parsed.accounts = sampleCheck.accounts;
            storeNeedsSave = true;
          }
        }
        if (Array.isArray(parsed.inventory) && !Array.isArray(parsed.stock)) {
          parsed.stock = parsed.inventory;
        } else if (Array.isArray(parsed.stock) && !Array.isArray(parsed.inventory)) {
          parsed.inventory = parsed.stock;
        }
        if (Array.isArray(parsed.businesses)) {
          parsed.businesses = parsed.businesses.map((b) => ({
            ...b,
            isArchived: Boolean(b.isArchived),
          }));
          const selectedBiz = parsed.businesses.find((b) => b.isSelected && !b.isArchived) ||
            parsed.businesses.find((b) => !b.isArchived) ||
            parsed.businesses[0];
          parsed.activeBusinessId = selectedBiz ? String(selectedBiz.id) : '1';
        } else {
          parsed.businesses = DEFAULT_BUSINESSES;
          parsed.activeBusinessId = '1';
        }
        if (storeNeedsSave) {
          try {
            await this.adapter.setItem(V6_KEY, JSON.stringify(parsed));
          } catch (e) {
            console.warn('Failed to persist migrated sample customer names:', e);
          }
        }
        this.currentStore = parsed;
        return { success: true, data: parsed, source: 'v6' };
      }

      // Check for v5 data to migrate safely
      const v5DataStr = await this.adapter.getItem(V5_KEY);
      if (v5DataStr) {
        const migResult = migrateV5toV6(v5DataStr);
        if (migResult.success && migResult.data) {
          const migratedData = migResult.data;
          if (Array.isArray(migratedData.accounts)) {
            const sampleCheck = migrateLegacySampleCustomerNames(migratedData.accounts);
            if (sampleCheck.changed) {
              migratedData.accounts = sampleCheck.accounts;
            }
          }
          // Retain unmutated v5 backup
          await this.adapter.setItem(V5_BACKUP_KEY, v5DataStr);
          // Save migrated v6 data
          await this.adapter.setItem(V6_KEY, JSON.stringify(migratedData));
          this.currentStore = migratedData;
          return { success: true, data: migratedData, source: 'migrated_v5', stats: migResult.stats };
        }
      }

      // No prior store exists: initialize with default state
      const initial = createDefaultState();
      await this.adapter.setItem(V6_KEY, JSON.stringify(initial));
      this.currentStore = initial;
      return { success: true, data: initial, source: 'initial_seed' };
    } catch (err) {
      console.error('loadInitialData failure:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Mutates a specific collection atomically inside the serialized write queue.
   * Operates on the latest committed state in the queue, preventing stale React snapshots.
   * @param {string} collectionName - One of VALID_COLLECTIONS
   * @param {Function} updater - function(currentCollection, fullStore) => updatedCollection
   * @returns {Promise<{success: boolean, data?: Object, collection?: Array, error?: any}>}
   */
  mutateCollection(collectionName, updater) {
    if (!VALID_COLLECTIONS.has(collectionName)) {
      return Promise.resolve({
        success: false,
        error: `Invalid collection: ${collectionName}. Must be one of: ${Array.from(VALID_COLLECTIONS).join(', ')}`,
      });
    }
    if (typeof updater !== 'function') {
      return Promise.resolve({
        success: false,
        error: 'Updater must be a function that receives the latest authoritative collection',
      });
    }

    return new Promise((resolve) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          try {
            if (!this.currentStore) {
              const loadRes = await this.loadInitialData();
              if (!loadRes.success) {
                resolve({ success: false, error: loadRes.error });
                return;
              }
            }

            const baseStore = JSON.parse(JSON.stringify(this.currentStore));
            const currentCollection = Array.isArray(baseStore[collectionName])
              ? baseStore[collectionName]
              : [];

            const result = await updater(currentCollection, baseStore);
            if (!Array.isArray(result)) {
              resolve({
                success: false,
                error: `Updater for ${collectionName} must return an array, received ${typeof result}`,
              });
              return;
            }

            // Deduplicate items with identical 'id' if items have an id property
            const seenIds = new Set();
            const deduplicated = [];
            for (const item of result) {
              if (item && item.id !== undefined && item.id !== null) {
                const sId = String(item.id);
                if (seenIds.has(sId)) {
                  console.warn(`Duplicate id detected and suppressed in ${collectionName}: ${sId}`);
                  continue;
                }
                seenIds.add(sId);
              }
              deduplicated.push(item);
            }

            const updatedStore = {
              ...baseStore,
              [collectionName]: deduplicated,
              ...(collectionName === 'inventory' ? { stock: deduplicated } : {}),
              ...(collectionName === 'stock' ? { inventory: deduplicated } : {}),
            };

            // Keep inventory and stock synchronized continuously (DATA-12)
            if (Array.isArray(updatedStore.inventory) && !Array.isArray(updatedStore.stock)) {
              updatedStore.stock = updatedStore.inventory;
            } else if (Array.isArray(updatedStore.stock) && !Array.isArray(updatedStore.inventory)) {
              updatedStore.inventory = updatedStore.stock;
            } else if (Array.isArray(updatedStore.inventory) && Array.isArray(updatedStore.stock)) {
              if (JSON.stringify(updatedStore.inventory) !== JSON.stringify(baseStore.inventory) &&
                  JSON.stringify(updatedStore.stock) === JSON.stringify(baseStore.stock)) {
                updatedStore.stock = updatedStore.inventory;
              } else if (JSON.stringify(updatedStore.stock) !== JSON.stringify(baseStore.stock) &&
                         JSON.stringify(updatedStore.inventory) === JSON.stringify(baseStore.inventory)) {
                updatedStore.inventory = updatedStore.stock;
              }
            }

            // Write to storage adapter first
            const serialized = JSON.stringify(updatedStore);
            await this.adapter.setItem(V6_KEY, serialized);

            // Commit to in-memory state only after successful storage write
            this.currentStore = updatedStore;
            resolve({
              success: true,
              data: updatedStore,
              collection: deduplicated,
            });
          } catch (err) {
            console.error(`mutateCollection write error on ${collectionName}:`, err);
            resolve({ success: false, error: err });
          } finally {
            this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          }
        })
        .catch((fatalErr) => {
          this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          console.error(`writeQueue recovered from error during mutateCollection(${collectionName}):`, fatalErr);
          resolve({ success: false, error: fatalErr });
        });
    });
  }

  /**
   * Mutates multiple collections or store fields atomically inside the serialized write queue.
   * @param {Function} updater - function(latestAuthoritativeStore) => updatedStore
   * @returns {Promise<{success: boolean, data?: Object, error?: any}>}
   */
  mutateStore(updater) {
    if (typeof updater !== 'function') {
      return Promise.resolve({
        success: false,
        error: 'Updater must be a function that receives the latest authoritative store',
      });
    }

    this._pendingWrites = (this._pendingWrites || 0) + 1;
    return new Promise((resolve) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          try {
            if (!this.currentStore) {
              const loadRes = await this.loadInitialData();
              if (!loadRes.success) {
                resolve({ success: false, error: loadRes.error });
                return;
              }
            }

            const baseStore = JSON.parse(JSON.stringify(this.currentStore));
            const updatedStore = await updater(baseStore);
            if (!updatedStore || typeof updatedStore !== 'object') {
              resolve({
                success: false,
                error: 'Updater must return a valid store object',
              });
              return;
            }

            // Write to storage adapter first
            const serialized = JSON.stringify(updatedStore);
            await this.adapter.setItem(V6_KEY, serialized);

            // Commit to in-memory state only after storage write succeeds
            this.currentStore = updatedStore;
            resolve({ success: true, data: updatedStore });
          } catch (err) {
            console.error('mutateStore write error:', err);
            resolve({ success: false, error: err });
          } finally {
            this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          }
        })
        .catch((fatalErr) => {
          this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          console.error('writeQueue recovered from error during mutateStore:', fatalErr);
          resolve({ success: false, error: fatalErr });
        });
    });
  }

  /**
   * Persists changes to the authoritative data store.
   * Merges changes onto the latest committed state in the writeQueue mutex.
   * @param {Object|Function} changesOrUpdater - Dictionary of fields or function(prevStore) => newStore
   * @returns {Promise<{success: boolean, data?: Object, error?: any}>}
   */
  persistData(changesOrUpdater = {}) {
    if (typeof changesOrUpdater === 'function') {
      return this.mutateStore(changesOrUpdater);
    }
    return this.mutateStore((baseStore) => {
      const updatedStore = { ...baseStore };
      for (const key of Object.keys(changesOrUpdater)) {
        if (changesOrUpdater[key] !== undefined) {
          updatedStore[key] = changesOrUpdater[key];
        }
      }
      return updatedStore;
    });
  }

  /**
   * Creates a safety snapshot of the current local state before restore.
   * Scoped to an explicit snapshotId so rollbacks never apply stale snapshots from earlier sessions.
   */
  /**
   * Enqueues an arbitrary async operation onto the FIFO writeQueue mutex.
   * Tracks pending writes and ensures serial execution with error isolation.
   * @param {Function} operation - async () => any
   * @returns {Promise<any>}
   */
  enqueueWrite(operation) {
    if (typeof operation !== 'function') {
      return Promise.reject(new Error('enqueueWrite requires a function argument'));
    }

    this._pendingWrites = (this._pendingWrites || 0) + 1;
    return new Promise((resolve, reject) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          try {
            const res = await operation();
            resolve(res);
          } catch (err) {
            console.error('Error during enqueueWrite operation:', err);
            reject(err);
          } finally {
            this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          }
        })
        .catch((fatalQueueErr) => {
          this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          console.error('writeQueue recovered from fatal error during enqueueWrite:', fatalQueueErr);
          reject(fatalQueueErr);
        });
    });
  }

  /**
   * Executes an atomic multi-step financial transaction inside the writeQueue mutex.
   * If any step throws or the post-mutation state fails financial invariants
   * (e.g. NaN balance, missing account references, negative values),
   * the mutation is automatically rolled back and the error is returned.
   * @param {Function} transactionFn - async (draftStore) => { store, result }
   * @param {Object} [options] - { validateBalances?: boolean }
   * @returns {Promise<{success: boolean, result?: any, rolledBack?: boolean, error?: string}>}
   */
  async executeAtomicTransaction(transactionFn, options = {}) {
    if (typeof transactionFn !== 'function') {
      return { success: false, rolledBack: false, error: 'Transaction requires a function' };
    }

    return this.enqueueWrite(async () => {
      if (!this.currentStore) {
        await this.loadInitialData();
      }

      const preTransactionSnapshot = JSON.parse(JSON.stringify(this.currentStore));

      try {
        const draft = JSON.parse(JSON.stringify(this.currentStore));
        const txOutput = await transactionFn(draft);

        const updatedStore = (txOutput && txOutput.store) ? txOutput.store : (txOutput !== undefined ? txOutput : draft);
        const result = (txOutput && txOutput.result !== undefined) ? txOutput.result : txOutput;

        if (!updatedStore || typeof updatedStore !== 'object') {
          throw new Error('Transaction must return a valid updated store object');
        }

        if (Array.isArray(updatedStore.accounts)) {
          for (const acc of updatedStore.accounts) {
            if (acc && (acc.balance === null || acc.balance === undefined || isNaN(Number(acc.balance)))) {
              throw new Error('Integrity violation: Account ' + acc.id + ' balance is NaN or invalid');
            }
          }
        }

        if (Array.isArray(updatedStore.journals)) {
          for (const j of updatedStore.journals) {
            if (j && (j.amount === null || j.amount === undefined || isNaN(Number(j.amount)) || Number(j.amount) < 0)) {
              throw new Error('Integrity violation: Journal ' + j.id + ' has invalid amount ' + j.amount);
            }
          }
        }

        await this.adapter.setItem(V6_KEY, JSON.stringify(updatedStore));
        this.currentStore = updatedStore;

        return {
          success: true,
          rolledBack: false,
          result,
        };
      } catch (err) {
        this.currentStore = preTransactionSnapshot;
        await this.adapter.setItem(V6_KEY, JSON.stringify(preTransactionSnapshot));
        console.warn('Atomic transaction failed and was rolled back:', err.message);

        return {
          success: false,
          rolledBack: true,
          error: err.message || String(err),
        };
      }
    });
  }

  /**
   * Vacuums and compacts local storage by:
   * 1. Removing orphaned journals referencing non-existent accounts
   * 2. Deduplicating entries by unique ID within collections
   * 3. Purging obsolete temporary safety snapshots older than maxAgeMs
   * 4. Recalculating account balances from journals to ensure ledger balance integrity
   * @param {Object} [options] - { maxSnapshotAgeMs?: number, recalculateBalances?: boolean }
   * @returns {Promise<{success: boolean, stats: Object}>}
   */
  async compactStorage(options = {}) {
    const maxSnapshotAgeMs = (options && options.maxSnapshotAgeMs) || 24 * 60 * 60 * 1000;
    const shouldRecalculate = options.recalculateBalances !== false;

    return this.enqueueWrite(async () => {
      if (!this.currentStore) {
        await this.loadInitialData();
      }

      const store = this.currentStore;
      const initialSerialized = JSON.stringify(store);
      const initialSize = initialSerialized.length;

      let orphanedJournalsRemoved = 0;
      let deduplicatedRecords = 0;
      let prunedSnapshots = 0;

      const collectionsToDedupe = ['accounts', 'journals', 'cashEntries', 'inventory', 'stock', 'notes', 'businesses'];
      for (const col of collectionsToDedupe) {
        if (Array.isArray(store[col])) {
          const seen = new Set();
          const deduped = [];
          for (const item of store[col]) {
            if (item && item.id) {
              const strId = String(item.id);
              const bizId = col === 'businesses'
                ? ''
                : String(item.businessId !== undefined && item.businessId !== null
                  ? item.businessId
                  : (item.business_id !== undefined && item.business_id !== null ? item.business_id : '1'));
              const dedupeKey = col === 'businesses' ? strId : (bizId + ':' + strId);
              if (seen.has(dedupeKey)) {
                deduplicatedRecords++;
                continue;
              }
              seen.add(dedupeKey);
            }
            deduped.push(item);
          }
          store[col] = deduped;
        }
      }

      if (Array.isArray(store.accounts) && Array.isArray(store.journals)) {
        const validAccountKeys = new Set(
          store.accounts.map((a) => {
            const biz = a.businessId || a.business_id || '1';
            return biz + ':' + a.id;
          })
        );
        const filteredJournals = [];
        for (const j of store.journals) {
          const accId = j.accountId !== undefined && j.accountId !== null ? j.accountId : j.orig_account_id;
          const biz = j.businessId || j.business_id || '1';
          if (accId && !validAccountKeys.has(biz + ':' + accId)) {
            orphanedJournalsRemoved++;
            continue;
          }
          filteredJournals.push(j);
        }
        store.journals = filteredJournals;
      }

      if (shouldRecalculate && Array.isArray(store.accounts) && Array.isArray(store.journals)) {
        try {
          const { recalculateAllAccountBalances } = require('./ledgerEngine');
          const recalcRes = recalculateAllAccountBalances(store.accounts, store.journals);
          if (recalcRes && Array.isArray(recalcRes.updatedAccounts)) {
            store.accounts = recalcRes.updatedAccounts;
          }
          if (recalcRes && Array.isArray(recalcRes.updatedJournals)) {
            store.journals = recalcRes.updatedJournals;
          }
        } catch (e) {
          console.warn('Compaction balance recalculation warning:', e.message);
        }
      }

      try {
        const snapStr = await this.adapter.getItem(SAFETY_SNAPSHOT_KEY);
        if (snapStr) {
          const parsedSnap = JSON.parse(snapStr);
          if (parsedSnap && parsedSnap.createdAt) {
            const age = Date.now() - new Date(parsedSnap.createdAt).getTime();
            if (age > maxSnapshotAgeMs) {
              await this.adapter.removeItem(SAFETY_SNAPSHOT_KEY);
              this.activeSafetySnapshot = null;
              prunedSnapshots++;
            }
          }
        }
      } catch (e) {}

      const finalSerialized = JSON.stringify(store);
      await this.adapter.setItem(V6_KEY, finalSerialized);

      const stats = {
        orphanedJournalsRemoved,
        deduplicatedRecords,
        prunedSnapshots,
        bytesReclaimed: Math.max(0, initialSize - finalSerialized.length),
        storageSizeBefore: initialSize,
        storageSizeAfter: finalSerialized.length,
      };

      return { success: true, stats, purgedJournalsCount: orphanedJournalsRemoved, orphanedJournalsRemoved, deduplicatedRecords, prunedSnapshots, bytesReclaimed: stats.bytesReclaimed };
    });
  }

  /**
   * Creates a safety snapshot of the current local state before restore.
   * Scoped to an explicit snapshotId so rollbacks never apply stale snapshots from earlier sessions.
   */
  async createLocalSafetySnapshot(customSnapshotId = null, extraState = {}) {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }

    const currentState = this.getAuthoritativeState();
    if (currentState) {
      const snapshotId = customSnapshotId || ('snap_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));

      let mmState = null;
      if (this.adapter && typeof this.adapter.getItem === 'function') {
        try {
          const rawMM = await this.adapter.getItem(MM_STORAGE_KEY);
          if (rawMM) mmState = JSON.parse(rawMM);
        } catch (e) {}
      }
      if (mmState === null && extraState) {
        if (extraState.moneyManager !== undefined && extraState.moneyManager !== null) {
          mmState = extraState.moneyManager;
        } else if (extraState.money_manager !== undefined && extraState.money_manager !== null) {
          mmState = extraState.money_manager;
        }
      }

      let prefs = extraState && extraState.preferences !== undefined ? extraState.preferences : null;
      if (prefs === null && this.adapter && typeof this.adapter.getItem === 'function') {
        try {
          const rawPrefs = await this.adapter.getItem(PREFERENCES_STORAGE_KEY);
          if (rawPrefs) prefs = JSON.parse(rawPrefs);
        } catch (e) {}
      }

      const record = {
        snapshotId,
        createdAt: new Date().toISOString(),
        state: currentState,
        moneyManager: mmState,
        preferences: prefs,
      };
      await this.adapter.setItem(SAFETY_SNAPSHOT_KEY, JSON.stringify(record));
      this.activeSafetySnapshot = record;
      return { success: true, snapshotId, timestamp: record.createdAt };
    }
    return { success: false, reason: 'No state to snapshot' };
  }

  async rollbackToSafetySnapshot(expectedSnapshotId = null) {
    if (expectedSnapshotId !== null && expectedSnapshotId !== undefined && !expectedSnapshotId) {
      return { success: false, reason: 'No fresh snapshot ID provided for this restore attempt' };
    }

    const snapshotStr = await this.adapter.getItem(SAFETY_SNAPSHOT_KEY);
    if (!snapshotStr) {
      return { success: false, reason: 'No safety snapshot found' };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(snapshotStr);
    } catch (e) {
      return { success: false, reason: 'Corrupted safety snapshot' };
    }

    let snapshotId = null;
    let stateData = null;
    let mmData = null;
    let prefsData = null;

    if (parsed && typeof parsed === 'object' && parsed.snapshotId && parsed.state) {
      snapshotId = parsed.snapshotId;
      stateData = parsed.state;
      mmData = parsed.moneyManager || null;
      prefsData = parsed.preferences || null;
    } else {
      stateData = parsed;
    }

    if (expectedSnapshotId) {
      if (!snapshotId || snapshotId !== expectedSnapshotId) {
        return {
          success: false,
          reason: 'Snapshot attempt mismatch: Expected ' + expectedSnapshotId + ', but found ' + snapshotId,
          attemptMismatch: true,
        };
      }
    }

    await this.adapter.setItem(V6_KEY, JSON.stringify(stateData));
    this.currentStore = stateData;

    if (mmData && this.adapter && typeof this.adapter.setItem === 'function') {
      try {
        await this.adapter.setItem(MM_STORAGE_KEY, JSON.stringify(mmData));
      } catch (e) {}
    }

    if (prefsData && this.adapter && typeof this.adapter.setItem === 'function') {
      try {
        await this.adapter.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefsData));
      } catch (e) {}
    }

    this.activeSafetySnapshot = null;
    this.notifyRestoreHooks({
      moneyManager: mmData,
      preferences: prefsData,
    });
    return {
      success: true,
      restored: true,
      snapshotId,
      restoredState: stateData,
      restoredMoneyManager: mmData,
      restoredPreferences: prefsData,
    };
  }

  async getFullBackupState(extraState = {}) {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }

    const authoritative = { ...this.getAuthoritativeState() };
    authoritative.pinEnabled = false;
    authoritative.appPin = '';

    const domains = (extraState && Array.isArray(extraState.domains) && extraState.domains.length > 0)
      ? extraState.domains
      : ['all'];
    const includeAll = domains.includes('all');
    const includeMM = includeAll || domains.includes('moneyManager') || domains.includes('money_manager');
    const includePrefs = includeAll || domains.includes('preferences');

    let mmState = null;
    if (includeMM) {
      if (extraState && extraState.moneyManager !== undefined && extraState.moneyManager !== null) {
        mmState = extraState.moneyManager;
      } else if (extraState && extraState.money_manager !== undefined && extraState.money_manager !== null) {
        mmState = extraState.money_manager;
      } else if (this.adapter && typeof this.adapter.getItem === 'function') {
        try {
          const raw = await this.adapter.getItem(MM_STORAGE_KEY);
          if (raw) mmState = JSON.parse(raw);
        } catch (e) {}
      }
    }

    let prefs = null;
    if (includePrefs) {
      if (extraState && extraState.preferences !== undefined && extraState.preferences !== null) {
        prefs = extraState.preferences;
      } else if (this.adapter && typeof this.adapter.getItem === 'function') {
        try {
          const raw = await this.adapter.getItem(PREFERENCES_STORAGE_KEY);
          if (raw) prefs = JSON.parse(raw);
        } catch (e) {}
      }
    }

    return {
      ...authoritative,
      moneyManager: mmState,
      preferences: prefs,
    };
  }

  listActiveBusinesses(store = null) {
    const s = store || this.currentStore;
    const list = s && Array.isArray(s.businesses) ? s.businesses : DEFAULT_BUSINESSES;
    return list.filter((b) => !b.isArchived);
  }

  /**
   * Returns list of archived businesses.
   */
  listArchivedBusinesses(store = null) {
    const s = store || this.currentStore;
    const list = s && Array.isArray(s.businesses) ? s.businesses : [];
    return list.filter((b) => Boolean(b.isArchived));
  }

  /**
   * Returns currently active business object.
   */
  getActiveBusiness(store = null) {
    const s = store || this.currentStore;
    const list = s && Array.isArray(s.businesses) ? s.businesses : DEFAULT_BUSINESSES;
    return (
      list.find((b) => b.isSelected && !b.isArchived) ||
      list.find((b) => !b.isArchived) ||
      list[0] ||
      DEFAULT_BUSINESSES[0]
    );
  }

  /**
   * Returns currently active business ID.
   */
  getActiveBusinessId(store = null) {
    const active = this.getActiveBusiness(store);
    return active ? String(active.id) : '1';
  }

  /**
   * Filters an array of items by businessId. Items without businessId default to business '1'.
   */
  filterByBusiness(collection, businessId) {
    if (!Array.isArray(collection)) return [];
    const targetId = String(businessId || '1');
    return collection.filter((item) => {
      const itemBizId = String(
        item?.businessId !== undefined && item?.businessId !== null
          ? item.businessId
          : (item?.business_id !== undefined && item?.business_id !== null ? item.business_id : '1')
      );
      return itemBizId === targetId;
    });
  }

  /**
   * Switches active business. Validates business exists and is not archived.
   */
  async selectBusiness(bizId) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const target = list.find((b) => String(b.id) === targetId);
      if (!target) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }
      if (target.isArchived) {
        throw new Error('আর্কাইভ করা ব্যবসা সরাসরি নির্বাচন করা যাবে না। প্রথমে এটি পুনরুদ্ধার করুন।');
      }

      const nowIso = new Date().toISOString();
      const updatedBusinesses = list.map((b) => {
        const isCur = String(b.id) === targetId;
        return {
          ...b,
          isSelected: isCur,
          is_current: isCur ? 1 : 0,
          isCurrent: isCur,
          update_date: isCur ? nowIso : (b.update_date || b.updateDate || null),
          updateDate: isCur ? nowIso : (b.update_date || b.updateDate || null),
        };
      });

      return {
        ...prevStore,
        activeBusinessId: targetId,
        businessName: target.name,
        ownerName: target.owner || prevStore.ownerName || '',
        ownerPhone: target.phone || prevStore.ownerPhone || '',
        businessAddress: target.address || prevStore.businessAddress || '',
        businesses: updatedBusinesses,
      };
    });
  }

  /**
   * Creates a new business with stable unique ID, non-archived status, and validation.
   */
  async createBusiness(bizData) {
    if (!bizData || typeof bizData !== 'object') {
      return { success: false, error: new Error('ব্যবসার তথ্য সঠিক নয়') };
    }
    const name = String(bizData.name || '').trim();
    if (!name) {
      return { success: false, error: new Error('ব্যবসার নাম লেখা আবশ্যক') };
    }

    const newId = bizData.id ? String(bizData.id) : ('biz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    const isSelected = bizData.isSelected !== false;

    const nowIso = new Date().toISOString();
    const bType = String(bizData.business_type || bizData.businessType || bizData.type || 'RETAIL');
    const newBiz = {
      id: newId,
      business_id: isNaN(Number(newId)) ? newId : Number(newId),
      name,
      business_name: name,
      businessName: name,
      owner: String(bizData.owner || '').trim() || 'স্বত্বাধিকারী',
      phone: String(bizData.phone || '').trim() || '01700000000',
      address: String(bizData.address || '').trim() || 'ঢাকা, বাংলাদেশ',
      business_address: String(bizData.address || '').trim() || 'ঢাকা, বাংলাদেশ',
      businessAddress: String(bizData.address || '').trim() || 'ঢাকা, বাংলাদেশ',
      business_type: bType,
      businessType: bType,
      business_age: Number(bizData.business_age || bizData.businessAge || 0),
      businessAge: Number(bizData.business_age || bizData.businessAge || 0),
      synced: 0,
      is_active: 1,
      is_primary: 0,
      is_current: isSelected ? 1 : 0,
      isSelected,
      isArchived: false,
      isPrimary: false,
      createdAt: bizData.createdAt || nowIso,
      create_date: bizData.create_date || bizData.createDate || bizData.createdAt || nowIso,
      createDate: bizData.create_date || bizData.createDate || bizData.createdAt || nowIso,
      update_date: null,
      updateDate: null,
      sync_date: null,
    };

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      if (list.some((b) => String(b.id) === newId)) {
        throw new Error('এই আইডি বিশিষ্ট ব্যবসা ইতোমধ্যে বিদ্যমান: ' + newId);
      }

      const updatedBusinesses = isSelected
        ? [...list.map((b) => ({ ...b, isSelected: false, is_current: 0, isCurrent: false })), newBiz]
        : [...list, newBiz];

      return {
        ...prevStore,
        businesses: updatedBusinesses,
        ...(isSelected
          ? {
              activeBusinessId: newBiz.id,
              businessName: newBiz.name,
              ownerName: newBiz.owner,
              ownerPhone: newBiz.phone,
              businessAddress: newBiz.address,
            }
          : {}),
      };
    });
  }

  /**
   * Reversibly archives a business.
   * Safety guard: Never allows the sole remaining active business to be archived.
   * If the archived business was active, automatically switches to next active business.
   */
  async archiveBusiness(bizId) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const activeList = list.filter((b) => !b.isArchived);

      if (activeList.length <= 1) {
        throw new Error('কমপক্ষে একটি ব্যবসা সক্রিয় থাকতে হবে। একমাত্র সক্রিয় ব্যবসাটি আর্কাইভ করা যাবে না।');
      }

      const target = list.find((b) => String(b.id) === targetId);
      if (!target) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }
      if (target.isArchived) {
        return prevStore; // Already archived
      }

      const remainingActive = activeList.filter((b) => String(b.id) !== targetId);
      const wasSelected = target.isSelected || String(prevStore.activeBusinessId) === targetId;
      const nextActive = wasSelected ? remainingActive[0] : null;

      const nowIso = new Date().toISOString();
      const updatedBusinesses = list.map((b) => {
        if (String(b.id) === targetId) {
          return {
            ...b,
            isArchived: true,
            is_active: 0,
            isActive: false,
            isSelected: false,
            is_current: 0,
            isCurrent: false,
            archivedAt: nowIso,
            update_date: nowIso,
            updateDate: nowIso,
          };
        }
        if (nextActive && String(b.id) === String(nextActive.id)) {
          return {
            ...b,
            isSelected: true,
            is_current: 1,
            isCurrent: true,
            update_date: nowIso,
            updateDate: nowIso,
          };
        }
        return b;
      });

      return {
        ...prevStore,
        businesses: updatedBusinesses,
        ...(nextActive
          ? {
              activeBusinessId: String(nextActive.id),
              businessName: nextActive.name,
              ownerName: nextActive.owner || prevStore.ownerName,
              ownerPhone: nextActive.phone || prevStore.ownerPhone,
              businessAddress: nextActive.address || prevStore.businessAddress,
            }
          : {}),
      };
    });
  }

  /**
   * Restores an archived business safely.
   */

  /**
   * Updates business profile attributes with Room DB parity.
   * Reference Room DB: UPDATE business SET business_name = ?, business_type = ?, synced=0, update_date = ? WHERE id = ?
   */
  async updateBusiness(bizId, updateData = {}) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const targetIndex = list.findIndex((b) => String(b.id) === targetId);
      if (targetIndex === -1) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }
      const existing = list[targetIndex];
      const nowIso = new Date().toISOString();
      const newName = String(updateData.name || updateData.business_name || updateData.businessName || existing.name || '').trim();
      if (!newName) {
        throw new Error('ব্যবসার নাম খালি রাখা যাবে না');
      }

      const updatedBiz = {
        ...existing,
        ...updateData,
        id: targetId,
        business_id: isNaN(Number(targetId)) ? targetId : Number(targetId),
        name: newName,
        business_name: newName,
        businessName: newName,
        owner: updateData.owner !== undefined ? String(updateData.owner).trim() : existing.owner,
        phone: updateData.phone !== undefined ? String(updateData.phone).trim() : existing.phone,
        address: updateData.address !== undefined ? String(updateData.address).trim() : (updateData.business_address || existing.address),
        business_address: updateData.address !== undefined ? String(updateData.address).trim() : (updateData.business_address || existing.address),
        businessAddress: updateData.address !== undefined ? String(updateData.address).trim() : (updateData.business_address || existing.address),
        business_type: String(updateData.business_type || updateData.businessType || updateData.type || existing.business_type || 'RETAIL'),
        businessType: String(updateData.business_type || updateData.businessType || updateData.type || existing.business_type || 'RETAIL'),
        synced: 0,
        update_date: nowIso,
        updateDate: nowIso,
        updatedAt: nowIso,
      };

      const updatedList = [...list];
      updatedList[targetIndex] = updatedBiz;

      const isCurrentActive = String(prevStore.activeBusinessId) === targetId;

      return {
        ...prevStore,
        businesses: updatedList,
        ...(isCurrentActive
          ? {
              businessName: updatedBiz.name,
              ownerName: updatedBiz.owner,
              ownerPhone: updatedBiz.phone,
              businessAddress: updatedBiz.address,
            }
          : {}),
      };
    });
  }

  async restoreBusiness(bizId, options = {}) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const target = list.find((b) => String(b.id) === targetId);
      if (!target) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }
      if (!target.isArchived) {
        return prevStore; // Already active
      }

      const makeActive = Boolean(options.makeActive || options.selectImmediately);
      const nowIso = new Date().toISOString();
      const updatedBusinesses = list.map((b) => {
        if (String(b.id) === targetId) {
          return {
            ...b,
            isArchived: false,
            is_active: 1,
            isActive: true,
            isSelected: makeActive ? true : Boolean(b.isSelected),
            is_current: makeActive ? 1 : (b.isSelected ? 1 : 0),
            isCurrent: makeActive ? true : Boolean(b.isSelected),
            restoredAt: nowIso,
            update_date: nowIso,
            updateDate: nowIso,
          };
        }
        if (makeActive) {
          return {
            ...b,
            isSelected: false,
            is_current: 0,
            isCurrent: false,
          };
        }
        return b;
      });

      return {
        ...prevStore,
        businesses: updatedBusinesses,
        ...(makeActive
          ? {
              activeBusinessId: target.id,
              businessName: target.name,
              ownerName: target.owner || prevStore.ownerName,
              ownerPhone: target.phone || prevStore.ownerPhone,
              businessAddress: target.address || prevStore.businessAddress,
            }
          : {}),
      };
    });
  }

  /**
   * Permanently deletes a business ONLY if it has zero linked financial records.
   * Guard: Refuses permanent deletion when accounts, cash entries, or stock exist.
   * Guard: Never deletes the sole remaining active business.
   */
  async deleteBusinessPermanently(bizId, options = {}) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const target = list.find((b) => String(b.id) === targetId);
      if (!target) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }

      // Check linked financial records
      const accounts = Array.isArray(prevStore.accounts) ? prevStore.accounts : [];
      const cash = Array.isArray(prevStore.cashEntries) ? prevStore.cashEntries : [];
      const stock = Array.isArray(prevStore.stock) ? prevStore.stock : (Array.isArray(prevStore.inventory) ? prevStore.inventory : []);

      const hasAccounts = accounts.some((a) => {
        const bId = a.businessId !== undefined && a.businessId !== null ? String(a.businessId) : (a.business_id !== undefined && a.business_id !== null ? String(a.business_id) : '1');
        return bId === targetId;
      });
      const hasCash = cash.some((c) => {
        const bId = c.businessId !== undefined && c.businessId !== null ? String(c.businessId) : (c.business_id !== undefined && c.business_id !== null ? String(c.business_id) : '1');
        return bId === targetId;
      });
      const hasStock = stock.some((s) => {
        const bId = s.businessId !== undefined && s.businessId !== null ? String(s.businessId) : (s.business_id !== undefined && s.business_id !== null ? String(s.business_id) : '1');
        return bId === targetId;
      });

      if ((hasAccounts || hasCash || hasStock) && !options.force) {
        throw new Error(
          'এই ব্যবসার অধীনে সংরক্ষিত আর্থিক হিসাব বা পণ্য তালিকা রয়েছে। ডেটা সুরক্ষার জন্য এটি স্থায়ীভাবে মুছে ফেলা সম্ভব নয়। আপনি এটি সুরক্ষিতভাবে আর্কাইভ করতে পারেন।'
        );
      }

      const activeList = list.filter((b) => !b.isArchived);
      if (activeList.length <= 1 && !target.isArchived) {
        throw new Error('কমপক্ষে একটি ব্যবসা সক্রিয় থাকতে হবে। একমাত্র সক্রিয় ব্যবসাটি মুছে ফেলা যাবে না।');
      }

      const updatedBusinesses = list.filter((b) => String(b.id) !== targetId);
      const wasSelected = target.isSelected || String(prevStore.activeBusinessId) === targetId;
      const nextActive = wasSelected ? updatedBusinesses.find((b) => !b.isArchived) : null;

      return {
        ...prevStore,
        businesses: updatedBusinesses,
        ...(nextActive
          ? {
              activeBusinessId: String(nextActive.id),
              businessName: nextActive.name,
              ownerName: nextActive.owner || prevStore.ownerName,
              ownerPhone: nextActive.phone || prevStore.ownerPhone,
              businessAddress: nextActive.address || prevStore.businessAddress,
            }
          : {}),
      };
    });
  }

  /**
   * Cascade deletes a business and atomically purges all records matching businessId
   * across accounts, journals, cashEntries, inventory, stock, notes, walletTxns, and tagadaLogs.
   * Refuses deletion if it is the sole remaining active business.
   */
  async deleteBusinessCascade(bizId) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const target = list.find((b) => String(b.id) === targetId);
      if (!target) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }

      const activeList = list.filter((b) => !b.isArchived);
      if (activeList.length <= 1 && !target.isArchived) {
        throw new Error('কমপক্ষে একটি ব্যবসা সক্রিয় থাকতে হবে। একমাত্র সক্রিয় ব্যবসাটি মুছে ফেলা যাবে না।');
      }

      // Purge all records matching targetId across collections
      const getBizId = (item) => String(item?.businessId !== undefined && item?.businessId !== null ? item.businessId : (item?.business_id !== undefined && item?.business_id !== null ? item.business_id : '1'));
      const accounts = (prevStore.accounts || []).filter((a) => getBizId(a) !== targetId);
      const journals = (prevStore.journals || []).filter((j) => getBizId(j) !== targetId);
      const cashEntries = (prevStore.cashEntries || []).filter((c) => getBizId(c) !== targetId);
      const inventory = (prevStore.inventory || []).filter((i) => getBizId(i) !== targetId);
      const stock = (prevStore.stock || []).filter((s) => getBizId(s) !== targetId);
      const notes = (prevStore.notes || []).filter((n) => getBizId(n) !== targetId);
      const walletTxns = (prevStore.walletTxns || []).filter((w) => getBizId(w) !== targetId);
      const tagadaLogs = (prevStore.tagadaLogs || []).filter((t) => getBizId(t) !== targetId);

      const remainingBusinesses = list.filter((b) => String(b.id) !== targetId);

      let nextActiveId = prevStore.activeBusinessId;
      if (String(prevStore.activeBusinessId) === targetId) {
        const firstActive = remainingBusinesses.find((b) => !b.isArchived) || remainingBusinesses[0];
        nextActiveId = firstActive ? String(firstActive.id) : '1';
      }

      const updatedBusinesses = remainingBusinesses.map((b) => {
        const isCur = String(b.id) === String(nextActiveId);
        return {
          ...b,
          isSelected: isCur,
          is_current: isCur ? 1 : 0,
          isCurrent: isCur,
          isActive: !b.isArchived,
          is_active: b.isArchived ? 0 : 1,
        };
      });

      const activeBiz = updatedBusinesses.find((b) => String(b.id) === String(nextActiveId));

      return {
        ...prevStore,
        businesses: updatedBusinesses,
        activeBusinessId: nextActiveId,
        businessName: activeBiz ? activeBiz.name : prevStore.businessName,
        accounts,
        journals,
        cashEntries,
        inventory,
        stock,
        notes,
        walletTxns,
        tagadaLogs,
      };
    });
  }

  /**
   * Commits restored backup payload safely into storage.
   * Performs validation, recalculates ledger balances, and writes atomically.
   */
  async commitRestorePayload(backupPayload, options = {}) {
    if (!backupPayload || typeof backupPayload !== 'object') {
      throw new Error('Invalid restore payload: payload must be an object');
    }

    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }

    const expectedChecksum = (backupPayload && backupPayload.checksum) ||
                             (backupPayload && backupPayload.manifest && backupPayload.manifest.checksum) ||
                             null;
    if (expectedChecksum) {
      const dataToVerify = backupPayload.data || backupPayload;
      const isLegacyChk = String(expectedChecksum).startsWith('chk_');
      const computed = isLegacyChk ? this.computeLegacyChecksum(dataToVerify) : this.computeChecksum(dataToVerify);
      if (computed !== expectedChecksum) {
        throw new Error('Backup integrity checksum mismatch: data may be corrupted or tampered');
      }
    }

    let manifest = backupPayload.manifest || null;
    let data = backupPayload.data || null;

    // Handle legacy unwrapped format where data is at root
    if (!data && Array.isArray(backupPayload.accounts)) {
      data = backupPayload;
      manifest = manifest || {
        backupVersion: 0,
        schemaVersion: backupPayload.version || 5,
        legacy: true,
      };
    }

    if (!data || !Array.isArray(data.accounts)) {
      throw new Error('Invalid restore payload: accounts must be an array');
    }

    const requestedDomains = (options && Array.isArray(options.domains) && options.domains.length > 0)
      ? options.domains
      : (options && typeof options.domain === 'string' ? [options.domain] : ['all']);
    const shouldRestoreAll = requestedDomains.includes('all');
    const shouldRestoreBusiness = shouldRestoreAll || requestedDomains.includes('business');
    const shouldRestoreMM = shouldRestoreAll || requestedDomains.includes('moneyManager') || requestedDomains.includes('money_manager') || requestedDomains.includes('personal');
    const shouldRestorePrefs = shouldRestoreAll || requestedDomains.includes('preferences');

    // Create safety snapshot before altering live store if not already created
    let snapshotId = options && options.snapshotId;
    if (!snapshotId) {
      const snapRes = await this.createLocalSafetySnapshot(null, options.extraState);
      if (snapRes && snapRes.success) {
        snapshotId = snapRes.snapshotId;
      }
    }

    let restoredMM = null;
    if (shouldRestoreMM) {
      const mmPayload = (data.moneyManager !== undefined && data.moneyManager !== null)
        ? data.moneyManager
        : data.money_manager;
      const hasValidAccounts = mmPayload &&
        typeof mmPayload === 'object' &&
        Array.isArray(mmPayload.accounts) &&
        (mmPayload.accounts.length > 0 || (manifest && manifest.hasMoneyManager === true) || (mmPayload.version >= 3));

      if (hasValidAccounts) {
        const defaultMMState = moneyManagerService ? moneyManagerService.getDefaultState() : {};
        const sanitizedMM = moneyManagerService
          ? moneyManagerService.sanitizeState(mmPayload, defaultMMState)
          : mmPayload;
        if (this.adapter && typeof this.adapter.setItem === 'function') {
          await this.adapter.setItem(MM_STORAGE_KEY, JSON.stringify(sanitizedMM));
        }
        restoredMM = sanitizedMM;
      }
      // If data.moneyManager is not present, empty {}, or lacks valid accounts, DO NOT touch or overwrite existing MM state (legacy safety)
    }

    let restoredPrefs = null;
    if (shouldRestorePrefs) {
      if (data.preferences && typeof data.preferences === 'object') {
        const sanitizedPrefs = preferencesService
          ? preferencesService.sanitizePreferences(data.preferences)
          : data.preferences;
        if (this.adapter && typeof this.adapter.setItem === 'function') {
          await this.adapter.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(sanitizedPrefs));
        }
        restoredPrefs = sanitizedPrefs;
      }
    }

    const mutateResult = await this.mutateStore((prevStore) => {
      if (!shouldRestoreBusiness) {
        return prevStore;
      }

      // If selective business restore is requested
      const selectedBizId = options && options.selectedBusinessId ? String(options.selectedBusinessId) : null;
      if (selectedBizId) {
        const importedAccounts = (data.accounts || []).filter(a => String(a.businessId || '1') === selectedBizId);
        const importedJournals = (data.journals || []).filter(j => String(j.businessId || '1') === selectedBizId);
        const importedCash = (data.cashEntries || []).filter(c => String(c.businessId || '1') === selectedBizId);
        const importedStock = ((data.stock || data.inventory) || []).filter(s => String(s.businessId || '1') === selectedBizId);
        const importedNotes = (data.notes || []).filter(n => String(n.businessId || '1') === selectedBizId);

        const keptAccounts = (prevStore.accounts || []).filter(a => String(a.businessId || '1') !== selectedBizId);
        const keptJournals = (prevStore.journals || []).filter(j => String(j.businessId || '1') !== selectedBizId);
        const keptCash = (prevStore.cashEntries || []).filter(c => String(c.businessId || '1') !== selectedBizId);
        const keptStock = ((prevStore.stock || prevStore.inventory) || []).filter(s => String(s.businessId || '1') !== selectedBizId);
        const keptNotes = (prevStore.notes || []).filter(n => String(n.businessId || '1') !== selectedBizId);

        const mergedAccounts = [...keptAccounts, ...importedAccounts];
        const mergedJournals = [...keptJournals, ...importedJournals];

        const finalMergedAccounts = ledgerEngine && typeof ledgerEngine.recalculateAccountRunningBalances === 'function'
          ? ledgerEngine.recalculateAccountRunningBalances(mergedAccounts, mergedJournals, selectedBizId)
          : mergedAccounts;

        return {
          ...prevStore,
          accounts: finalMergedAccounts,
          journals: mergedJournals,
          cashEntries: [...keptCash, ...importedCash],
          stock: [...keptStock, ...importedStock],
          inventory: [...keptStock, ...importedStock],
          notes: [...keptNotes, ...importedNotes],
          version: 6,
          lastRestoredAt: new Date().toISOString(),
          restoredFromOwner: manifest && manifest.backupOwner ? manifest.backupOwner.sub : null,
        };
      }

      const restoredInventory = Array.isArray(data.inventory)
        ? data.inventory
        : (Array.isArray(data.stock) ? data.stock : []);

      const newStore = {
        ...createDefaultState(),
        ...data,
        inventory: restoredInventory,
        stock: restoredInventory,
        pinEnabled: false,
        appPin: '', // Restored backup always resets PIN lock to safe default for security
        version: 6,
        lastRestoredAt: new Date().toISOString(),
        restoredFromOwner: manifest && manifest.backupOwner ? manifest.backupOwner.sub : null,
      };

      if (Array.isArray(newStore.accounts) && Array.isArray(newStore.journals)) {
        newStore.accounts = newStore.accounts.map(acc => {
          const accIdStr = String(acc.id);
          const accBizId = String(acc.businessId !== undefined && acc.businessId !== null ? acc.businessId : (acc.business_id !== undefined && acc.business_id !== null ? acc.business_id : '1'));
          const accJournals = newStore.journals.filter(j => {
            const jAccId = String(j?.accountId !== undefined && j?.accountId !== null ? j.accountId : (j?.orig_account_id !== undefined && j?.orig_account_id !== null ? j.orig_account_id : ''));
            if (jAccId !== accIdStr) return false;
            const jBizId = String(j?.businessId !== undefined && j?.businessId !== null ? j.businessId : (j?.business_id !== undefined && j?.business_id !== null ? j.business_id : '1'));
            return jBizId === accBizId;
          });
          if (accJournals.length > 0) {
            accJournals.sort((a, b) => {
              const dateComp = (a.date || a.txn_date || '').localeCompare(b.date || b.txn_date || '');
              if (dateComp !== 0) return dateComp;

              const timeComp = (a.time || '').localeCompare(b.time || '');
              if (timeComp !== 0) return timeComp;

              const idA = isNaN(Number(a.id)) ? a.id : Number(a.id);
              const idB = isNaN(Number(b.id)) ? b.id : Number(b.id);
              if (typeof idA === 'number' && typeof idB === 'number') {
                return idA - idB;
              }
              return String(a.id || '').localeCompare(String(b.id || ''));
            });
            const opening = Number(acc.openingBalance) || 0;
            let runningPaisa = Math.round(opening * 100);
            for (const j of accJournals) {
              const amount = Number(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received) || 0;
              const amtPaisa = Math.round(amount * 100);
              const isCust = acc.type === 1;
              let isGiven = j.type === 'given' || j.type === 'credit' || j.type === 'purchase' || j.txn_type === 'given';
              let isReceived = j.type === 'received' || j.type === 'cash' || j.type === 'payment' || j.txn_type === 'received';
              if (!isGiven && !isReceived && (j.txn_type === 1 || j.txn_type === 2 || j.txn_type === '1' || j.txn_type === '2')) {
                const numType = Number(j.txn_type);
                if (isCust) {
                  isGiven = numType === 1;
                  isReceived = numType === 2;
                } else {
                  isReceived = numType === 1;
                  isGiven = numType === 2;
                }
              }
              if (isCust) {
                if (isGiven) runningPaisa += amtPaisa;
                else if (isReceived) runningPaisa -= amtPaisa;
              } else {
                if (isReceived) runningPaisa += amtPaisa;
                else if (isGiven) runningPaisa -= amtPaisa;
              }
            }
            return { ...acc, balance: runningPaisa / 100 };
          }
          return acc;
        });
      }

      if (Array.isArray(newStore.businesses)) {
        newStore.businesses = newStore.businesses.map((b) => ({
          ...b,
          isArchived: Boolean(b.isArchived),
        }));
        if (data.businessName && !Array.isArray(data.businesses) && newStore.businesses[0]) {
          newStore.businesses[0] = {
            ...newStore.businesses[0],
            name: data.businessName,
          };
        }
        const hasActiveSelected = newStore.businesses.some((b) => b.isSelected && !b.isArchived);
        if (!hasActiveSelected) {
          const firstActive = newStore.businesses.find((b) => !b.isArchived) || newStore.businesses[0];
          if (firstActive) {
            newStore.businesses = newStore.businesses.map((b) => ({
              ...b,
              isSelected: String(b.id) === String(firstActive.id),
            }));
            newStore.activeBusinessId = String(firstActive.id);
            if (!newStore.businessName) {
              newStore.businessName = firstActive.name;
            }
          }
        } else {
          const selectedBiz = newStore.businesses.find((b) => b.isSelected && !b.isArchived);
          newStore.activeBusinessId = String(selectedBiz.id);
          if (!newStore.businessName) {
            newStore.businessName = selectedBiz.name;
          }
        }
      }

      return newStore;
    });

    this.notifyRestoreHooks({
      moneyManager: restoredMM,
      preferences: restoredPrefs,
    });

    return {
      ...mutateResult,
      restoredMoneyManager: restoredMM,
      restoredPreferences: restoredPrefs,
      restoredDomains: {
        business: shouldRestoreBusiness,
        moneyManager: Boolean(restoredMM),
        money_manager: Boolean(restoredMM),
        preferences: Boolean(restoredPrefs),
      },
    };
  }
  computeLegacyChecksum(dataObj) {
    if (!dataObj) return '';
    const str = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'chk_' + Math.abs(hash).toString(16) + '_' + str.length;
  }

  computeChecksum(dataObj) {
    if (!dataObj) return '';
    const str = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
    try {
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const nodeReq = typeof require === 'function' ? require : null;
        const cryptoModName = ['cry', 'pto'].join('');
        const crypto = nodeReq ? nodeReq(cryptoModName) : null;
        if (crypto && typeof crypto.createHash === 'function') {
          return 'sha256_' + crypto.createHash('sha256').update(str, 'utf8').digest('hex');
        }
      }
    } catch (_) {}
    return this.computeLegacyChecksum(dataObj);
  }

  notifyRestoreHooks(restoredState = {}) {
    try {
      if (moneyManagerService) {
        if (typeof moneyManagerService.resetCache === 'function') {
          moneyManagerService.resetCache();
        }
        if (typeof moneyManagerService.reloadCache === 'function') {
          moneyManagerService.reloadCache(restoredState.moneyManager);
        }
      }
    } catch (_) {}
    try {
      if (preferencesService) {
        if (typeof preferencesService.resetCache === 'function') {
          preferencesService.resetCache();
        }
        if (typeof preferencesService.reloadCache === 'function') {
          preferencesService.reloadCache(restoredState.preferences);
        }
      }
    } catch (_) {}
  }

  async createStorageBackup(extraState = {}, options = {}) {
    const fullState = await this.getFullBackupState(extraState);
    const checksum = this.computeChecksum(fullState);

    const payload = {
      version: 6,
      formatVersion: 2,
      createdAt: new Date().toISOString(),
      checksum,
      manifest: {
        schemaVersion: 6,
        recordCounts: {
          accounts: (fullState.accounts || []).length,
          journals: (fullState.journals || []).length,
          cashEntries: (fullState.cashEntries || []).length,
          businesses: (fullState.businesses || []).length,
          mmAccounts: (fullState.moneyManager && Array.isArray(fullState.moneyManager.accounts)) ? fullState.moneyManager.accounts.length : 0,
          mmTransactions: (fullState.moneyManager && Array.isArray(fullState.moneyManager.transactions)) ? fullState.moneyManager.transactions.length : 0,
          mmCategories: (fullState.moneyManager && Array.isArray(fullState.moneyManager.categories)) ? fullState.moneyManager.categories.length : 0,
          mmGoals: (fullState.moneyManager && Array.isArray(fullState.moneyManager.goals)) ? fullState.moneyManager.goals.length : 0,
          mmRecurring: (fullState.moneyManager && Array.isArray(fullState.moneyManager.recurring)) ? fullState.moneyManager.recurring.length : 0,
        },
        hasMoneyManager: Boolean(fullState.moneyManager),
      },
      data: fullState,
    };
    return payload;
  }

  async exportAllData(extraState = {}, options = {}) {
    return this.createStorageBackup(extraState, options);
  }

  async restoreStorageBackup(backupPayload, options = {}) {
    if (!backupPayload || typeof backupPayload !== 'object') {
      throw new Error('Invalid restore payload: payload must be an object');
    }

    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }

    if (backupPayload.checksum) {
      const dataToVerify = backupPayload.data || backupPayload;
      const expectedChecksum = backupPayload.checksum;
      const isLegacyChk = String(expectedChecksum).startsWith('chk_');
      const computed = isLegacyChk ? this.computeLegacyChecksum(dataToVerify) : this.computeChecksum(dataToVerify);
      if (computed !== expectedChecksum) {
        throw new Error('Backup integrity checksum mismatch: data may be corrupted or tampered');
      }
    }

    this.currentStore = null;
    this._cachedMoneyManager = null;
    if (typeof moneyManagerService !== 'undefined' && moneyManagerService && typeof moneyManagerService.resetCache === 'function') {
      try { moneyManagerService.resetCache(); } catch (_) {}
    }
    if (typeof preferencesService !== 'undefined' && preferencesService && typeof preferencesService.resetCache === 'function') {
      try { preferencesService.resetCache(); } catch (_) {}
    }
    const res = await this.commitRestorePayload(backupPayload, options);

    this.notifyRestoreHooks({
      moneyManager: res.restoredMoneyManager,
      preferences: res.restoredPreferences,
    });

    return res;
  }

  async importAllData(backupPayload, options = {}) {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }
    return this.restoreStorageBackup(backupPayload, options);
  }

  /**
   * Chains a Money Manager state write onto this.writeQueue mutex,
   * guaranteeing that subsequent getFullBackupState/commitRestorePayload calls
   * await the finished disk mutation.
   */
  async saveMoneyManager(mmState) {
    if (!mmState || typeof mmState !== 'object') {
      return { success: false, error: new Error('Valid Money Manager state object is required') };
    }

    this._pendingWrites = (this._pendingWrites || 0) + 1;
    return new Promise((resolve) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          try {
            if (this.adapter && typeof this.adapter.setItem === 'function') {
              await this.adapter.setItem(MM_STORAGE_KEY, JSON.stringify(mmState));
            }
            this._cachedMoneyManager = mmState;
            this.notifyRestoreHooks({ moneyManager: mmState });
            resolve({ success: true, moneyManager: mmState });
          } catch (err) {
            console.error('saveMoneyManager write error:', err);
            resolve({ success: false, error: err });
          } finally {
            this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          }
        })
        .catch((fatalErr) => {
          this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          console.error('writeQueue recovered from error during saveMoneyManager:', fatalErr);
          resolve({ success: false, error: fatalErr });
        });
    });
  }

  /**
   * Retrieves authoritative Money Manager state after awaiting any in-flight writeQueue promises.
   */
  async getAuthoritativeMoneyManager() {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }
    if (this._cachedMoneyManager) {
      return this._cachedMoneyManager;
    }
    if (this.adapter && typeof this.adapter.getItem === 'function') {
      try {
        const raw = await this.adapter.getItem(MM_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this._cachedMoneyManager = parsed;
          return parsed;
        }
      } catch (_) {}
    }
    return null;
  }

  /**
   * Returns a copy of journals sorted chronologically by date/time.
   * Memoized via WeakMap caching with array length guard (__len).
   * @param {Array|null} journals Optional journals array (defaults to authoritative state)
   * @returns {Array} Sorted copy of journals
   */
  indexJournalsChronologically(journals = null) {
    const target = Array.isArray(journals)
      ? journals
      : (this && typeof this.getAuthoritativeState === 'function'
          ? (this.getAuthoritativeState()?.journals || [])
          : []);
    return indexJournalsChronologically(target);
  }

  /**
   * Queries journals within a date range using O(log N) binary search on chronologically indexed records.
   * Supports both signatures:
   *   repo.queryJournalsByDateRange(journals, startDate, endDate, options)
   *   repo.queryJournalsByDateRange(startDate, endDate, options)
   *
   * @param {Array|string|Date|null} journalsOrStart
   * @param {string|Date|null} startOrEnd
   * @param {string|Date|Object|null} endOrOptions
   * @param {Object} [maybeOptions={}]
   * @returns {{ journals: Array, totalCount: number, executionTimeMs: number }}
   */
  queryJournalsByDateRange(journalsOrStart, startOrEnd, endOrOptions, maybeOptions = {}) {
    let journals, startDate, endDate, options;
    if (Array.isArray(journalsOrStart)) {
      journals = journalsOrStart;
      startDate = startOrEnd;
      endDate = endOrOptions;
      options = maybeOptions || {};
    } else {
      journals = (this && typeof this.getAuthoritativeState === 'function')
        ? (this.getAuthoritativeState()?.journals || [])
        : [];
      startDate = journalsOrStart;
      endDate = startOrEnd;
      options = (endOrOptions && typeof endOrOptions === 'object' && !(endOrOptions instanceof Date))
        ? endOrOptions
        : (maybeOptions || {});
    }
    return queryJournalsByDateRange(journals, startDate, endDate, options);
  }

  /**
   * Generates an account statement with exact integer-paisa opening balance,
   * range-filtered transactions, step-by-step running balance, and closing balance
   * with 0.00 Paisa float drift and multi-tenant business isolation.
   *
   * @param {Object|string|number} accountOrId Account object or accountId
   * @param {Array|string|number} [journalsOrBizId] Journals array or businessId
   * @param {string|Object} [dateRange='all'] 'all' | 'today' | 'this_month' | 'last_month' | 'custom'
   * @param {Object} [options={}] Additional filter options ({ startDate, endDate, referenceDate })
   * @returns {Object} Statement result
   */
  generateAccountStatement(accountOrId, journalsOrBizId = null, dateRange = 'all', options = {}) {
    let account = null;
    let journals = [];
    let businessId = null;

    if (accountOrId && typeof accountOrId === 'object' && !Array.isArray(accountOrId)) {
      account = accountOrId;
      journals = Array.isArray(journalsOrBizId)
        ? journalsOrBizId
        : (this.currentStore?.journals || this.getAuthoritativeState()?.journals || []);
      businessId = account.businessId || account.business_id || options.businessId || this.getActiveBusinessId();
    } else {
      const targetAccId = String(accountOrId);
      if (typeof journalsOrBizId === 'string' || typeof journalsOrBizId === 'number') {
        businessId = String(journalsOrBizId);
      } else if (Array.isArray(journalsOrBizId)) {
        journals = journalsOrBizId;
        businessId = String(options.businessId || this.getActiveBusinessId() || '1');
      } else if (journalsOrBizId && typeof journalsOrBizId === 'object' && (dateRange === 'all' || !dateRange)) {
        dateRange = journalsOrBizId;
        businessId = String(options.businessId || this.getActiveBusinessId() || '1');
      } else {
        businessId = String(options.businessId || this.getActiveBusinessId() || '1');
      }

      const state = this.getAuthoritativeState() || this.currentStore || {};
      if (!journals || journals.length === 0) {
        journals = Array.isArray(options.journals) ? options.journals : (state.journals || []);
      }
      const accounts = Array.isArray(options.accounts) ? options.accounts : (state.accounts || []);
      account = accounts.find(a => String(a.id) === targetAccId && String(a.businessId || a.business_id || '1') === businessId);
      if (!account) {
        account = { id: targetAccId, name: options.name || 'Account', type: options.type || 1, businessId };
      }
    }

    return generateAccountStatement(account, journals, dateRange, { ...options, businessId });
  }

  /**
   * Records a Tagada reminder audit log with Room DB schema parity,
   * SMS quota deduction, and idempotency guard against duplicate submissions.
   *
   * @param {Object} rawLog Raw Tagada log record (snake_case or camelCase)
   * @param {Object} [options={}] Options ({ bypassQuota, isFreeSms })
   * @returns {Promise<{ success: boolean, data?: Object, duplicate?: boolean, remainingSmsCount: number, error?: string }>} 
   */
  async recordTagadaLog(rawLog = {}, options = {}) {
    const normalized = normalizeTagadaLogFields(rawLog);
    if (!normalized || !normalized.accountId) {
      return { success: false, error: 'INVALID_TAGADA_LOG', remainingSmsCount: 0 };
    }

    const isFreeSms = options.isFreeSms !== false && (
      normalized.tagada_type === 'TAGADA_BY_FREE_SMS' ||
      normalized.tagadaType === 'TAGADA_BY_FREE_SMS' ||
      options.isFreeSms === true
    );

    let duplicateDetected = false;
    let finalLog = normalized;
    let finalRemaining = 0;

    const mutateRes = await this.mutateStore((latestStore) => {
      const curLogs = Array.isArray(latestStore.tagadaLogs) ? latestStore.tagadaLogs : [];
      const curCount = Number(latestStore.remainingSmsCount !== undefined && latestStore.remainingSmsCount !== null
        ? latestStore.remainingSmsCount
        : 5);

      const existing = curLogs.find(l => String(l.id) === String(normalized.id));
      if (existing) {
        duplicateDetected = true;
        finalLog = existing;
        finalRemaining = curCount;
        return latestStore;
      }

      if (isFreeSms && options.bypassQuota !== true && curCount <= 0) {
        throw new Error('SMS_QUOTA_EXHAUSTED');
      }

      const nextCount = isFreeSms ? Math.max(0, curCount - 1) : curCount;
      finalRemaining = nextCount;

      return {
        ...latestStore,
        remainingSmsCount: nextCount,
        tagadaLogs: [normalized, ...curLogs],
      };
    });

    if (!mutateRes.success) {
      if (mutateRes.error && String(mutateRes.error).includes('SMS_QUOTA_EXHAUSTED')) {
        return { success: false, error: 'SMS_QUOTA_EXHAUSTED', remainingSmsCount: 0 };
      }
      return { success: false, error: mutateRes.error || 'MUTATION_FAILED', remainingSmsCount: 0 };
    }

    if (duplicateDetected) {
      return {
        success: true,
        duplicate: true,
        data: finalLog,
        remainingSmsCount: finalRemaining,
      };
    }

    if (this.telemetry && typeof this.telemetry.logEvent === 'function') {
      try {
        this.telemetry.logEvent(EVENT_TYPES.TAGADA_SENT, {
          accountId: normalized.accountId,
          businessId: normalized.businessId,
          tagadaType: normalized.tagadaType,
          creditAmount: normalized.creditAmount,
          remainingSmsCount: finalRemaining,
        });
      } catch (_) {}
    }

    return {
      success: true,
      duplicate: false,
      data: normalized,
      remainingSmsCount: finalRemaining,
    };
  }

  /**
   * Retrieves current Tagada quota status.
   * @param {string|number|null} [businessId=null]
   * @returns {{ remainingSmsCount: number, tallyMessageBalance: number, maxSmsQuota: number }}
   */
  getTagadaQuota(businessId = null) {
    const state = this.getAuthoritativeState() || this.currentStore || {};
    const remaining = Number(state.remainingSmsCount !== undefined && state.remainingSmsCount !== null
      ? state.remainingSmsCount
      : 5);
    const tallyMsg = Number(state.tallyMessageBalance !== undefined && state.tallyMessageBalance !== null
      ? state.tallyMessageBalance
      : 50);
    return {
      remainingSmsCount: Math.max(0, remaining),
      tallyMessageBalance: Math.max(0, tallyMsg),
      maxSmsQuota: 100,
    };
  }

  /**
   * Adjusts SMS quota with ceiling enforcement (0 <= remaining <= maxQuota).
   * @param {number} delta Positive or negative delta
   * @param {Object} [options={}] Optional parameters ({ maxQuota: 100 })
   * @returns {Promise<{ success: boolean, remainingSmsCount: number, prevRemaining: number, error?: string }>} 
   */
  async adjustTagadaQuota(delta = 0, options = {}) {
    const maxQuota = Math.max(1, Number(options.maxQuota || 100));
    let prev = 0;
    let next = 0;

    const res = await this.mutateStore((latestStore) => {
      prev = Number(latestStore.remainingSmsCount !== undefined && latestStore.remainingSmsCount !== null
        ? latestStore.remainingSmsCount
        : 5);
      next = Math.min(maxQuota, Math.max(0, prev + Number(delta || 0)));
      return {
        ...latestStore,
        remainingSmsCount: next,
      };
    });

    return {
      success: res.success,
      remainingSmsCount: next,
      prevRemaining: prev,
      error: res.error,
    };
  }

  /**
   * Lists Tagada logs with multi-tenant business and account isolation.
   * @param {string|number|null} [accountId=null]
   * @param {string|number|null} [businessId=null]
   * @param {Object} [options={}] Optional pagination and sorting
   * @returns {{ tagadaLogs: Array, totalCount: number }}
   */
  listTagadaLogs(accountId = null, businessId = null, options = {}) {
    const state = this.getAuthoritativeState() || this.currentStore || {};
    const allLogs = Array.isArray(state.tagadaLogs) ? state.tagadaLogs : [];

    const targetAccId = accountId !== null && accountId !== undefined ? String(accountId) : null;
    const targetBizId = businessId !== null && businessId !== undefined ? String(businessId) : null;

    let filtered = allLogs.filter((log) => {
      if (!log) return false;
      if (targetAccId !== null) {
        const lAccId = String(log.accountId !== undefined && log.accountId !== null
          ? log.accountId
          : (log.account_id !== undefined && log.account_id !== null ? log.account_id : ''));
        if (lAccId !== targetAccId) return false;
      }
      if (targetBizId !== null) {
        const lBizId = String(log.businessId !== undefined && log.businessId !== null
          ? log.businessId
          : (log.business_id !== undefined && log.business_id !== null ? log.business_id : '1'));
        if (lBizId !== targetBizId) return false;
      }
      return true;
    });

    const totalCount = filtered.length;
    if (options && (options.offset > 0 || (options.limit !== undefined && options.limit !== null))) {
      const offset = Math.max(0, Number(options.offset) || 0);
      const limit = options.limit !== undefined && options.limit !== null ? Math.max(0, Number(options.limit)) : totalCount;
      filtered = filtered.slice(offset, offset + limit);
    }

    return {
      tagadaLogs: filtered,
      totalCount,
    };
  }

  /**
   * Calculates comprehensive storage resource metrics, byte allocations, and quota status.
   * @returns {Promise<{
   *   totalBytes: number,
   *   domains: { business: number, personal: number, preferences: number },
   *   collectionCounts: Object,
   *   quotaBytes: number,
   *   usagePercent: number,
   *   isNearQuota: boolean,
   *   recommendedAction: 'none' | 'compactStorage'
   * }>}
   */
  async getStorageMetrics() {
    if (!this.currentStore) {
      await this.loadInitialData();
    }

    const v6Str = (await this.adapter.getItem(V6_KEY)) || JSON.stringify(this.currentStore);
    const mmStr = (await this.adapter.getItem(MM_STORAGE_KEY)) || '{}';
    const prefsStr = (await this.adapter.getItem(PREFERENCES_STORAGE_KEY)) || '{}';

    const businessBytes = Buffer.byteLength(v6Str, 'utf8');
    const personalBytes = Buffer.byteLength(mmStr, 'utf8');
    const prefsBytes = Buffer.byteLength(prefsStr, 'utf8');
    const totalBytes = businessBytes + personalBytes + prefsBytes;

    const QUOTA_LIMIT_BYTES = 50 * 1024 * 1024;
    const usagePercent = Number(((totalBytes / QUOTA_LIMIT_BYTES) * 100).toFixed(2));
    const isNearQuota = usagePercent >= 80;

    let parsedMM = {};
    try { parsedMM = JSON.parse(mmStr); } catch (e) {}

    const store = this.currentStore;
    const collectionCounts = {
      accounts: Array.isArray(store.accounts) ? store.accounts.length : 0,
      journals: Array.isArray(store.journals) ? store.journals.length : 0,
      cashEntries: Array.isArray(store.cashEntries) ? store.cashEntries.length : 0,
      inventory: Array.isArray(store.inventory) ? store.inventory.length : 0,
      stock: Array.isArray(store.stock) ? store.stock.length : 0,
      notes: Array.isArray(store.notes) ? store.notes.length : 0,
      businesses: Array.isArray(store.businesses) ? store.businesses.length : 0,
      wallets: Array.isArray(parsedMM.wallets) ? parsedMM.wallets.length : (Array.isArray(parsedMM.accounts) ? parsedMM.accounts.length : 0),
      moneyManagerTxns: Array.isArray(parsedMM.transactions) ? parsedMM.transactions.length : 0,
    };

    return {
      totalBytes,
      domains: {
        business: businessBytes,
        personal: personalBytes,
        preferences: prefsBytes,
      },
      collectionCounts,
      quotaBytes: QUOTA_LIMIT_BYTES,
      usagePercent,
      isNearQuota,
      recommendedAction: isNearQuota || collectionCounts.journals > 5000 ? 'compactStorage' : 'none',
    };
  }

  /**
   * Retrieves all unsynced records (synced === 0) for a specific collection or across all collections.
   * Aligns with reference Room DB DAO queries: SELECT * FROM <table> WHERE synced = 0
   * @param {string} [collectionName] - Optional specific collection (e.g., 'accounts', 'journals', 'businesses')
   * @returns {Array|Object}
   */
  getUnsyncedRecords(collectionName = null) {
    if (!this.currentStore) return collectionName ? [] : {};

    const targetCols = collectionName
      ? [collectionName]
      : ['accounts', 'journals', 'cashEntries', 'businesses', 'inventory', 'stock', 'tagadaLogs'];

    const result = {};
    for (const col of targetCols) {
      if (Array.isArray(this.currentStore[col])) {
        result[col] = this.currentStore[col].filter((item) => item && (item.synced === 0 || item.synced === false || item.synced === undefined));
      } else {
        result[col] = [];
      }
    }

    return collectionName ? (result[collectionName] || []) : result;
  }

  /**
   * Marks specified record IDs as synchronized (synced = 1) in a collection.
   * Aligns with reference Room DB DAO updates: UPDATE <table> SET synced = 1 WHERE id IN (...)
   * @param {string} collectionName
   * @param {Array<string|number>} ids
   * @returns {Promise<{success: boolean, updatedCount: number}>}
   */
  async markRecordsSynced(collectionName, ids = []) {
    if (!collectionName || !VALID_COLLECTIONS.has(collectionName) || !Array.isArray(ids) || ids.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    const idSet = new Set(ids.map(String));
    let updatedCount = 0;

    const res = await this.mutateCollection(collectionName, (list) => {
      return list.map((item) => {
        if (item && item.id && idSet.has(String(item.id))) {
          updatedCount++;
          const nowIso = new Date().toISOString();
          return {
            ...item,
            synced: 1,
            is_synced: 1,
            syncedDate: nowIso,
            synced_date: nowIso,
          };
        }
        return item;
      });
    });

    return {
      success: res.success,
      updatedCount,
      error: res.error,
    };
  }
}

// ============================================================================
// BL-017: TRANSACTION DATE-RANGE QUERY INDEXING & BINARY SEARCH ENGINE
// ============================================================================

let _journalIndexCache = new WeakMap();

function clearJournalIndexCache() {
  _journalIndexCache = new WeakMap();
}

/**
 * Normalizes input date/timestamp into a canonical YYYY-MM-DD string.
 * Supports Date objects, timestamps, ISO strings, Bengali numerals, and standard strings.
 */
function toStandardDateStr(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'string') {
    // Fast path: standard ASCII YYYY-MM-DD
    if (val.length === 10 &&
        val.charCodeAt(0) >= 48 && val.charCodeAt(0) <= 57 &&
        val.charCodeAt(4) === 45 && val.charCodeAt(7) === 45) {
      return val;
    }
    if (val.length >= 10 &&
        val.charCodeAt(0) >= 48 && val.charCodeAt(0) <= 57 &&
        val.charCodeAt(4) === 45 && val.charCodeAt(7) === 45) {
      return val.slice(0, 10);
    }
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  let str = String(val).trim();
  const bengaliDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  for (let i = 0; i < 10; i++) {
    if (str.indexOf(bengaliDigits[i]) !== -1) {
      str = str.replace(new RegExp(bengaliDigits[i], 'g'), String(i));
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str;
}

/**
 * Normalizes 12-hour or 24-hour time string into a canonical 24-hour HH:MM:SS string for chronological comparison.
 */
function normalizeTimeComparable(timeStr) {
  if (!timeStr) return '';
  let str = String(timeStr).trim();
  const bengaliDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  for (let i = 0; i < 10; i++) {
    if (str.indexOf(bengaliDigits[i]) !== -1) {
      str = str.replace(new RegExp(bengaliDigits[i], 'g'), String(i));
    }
  }
  const match12 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const seconds = match12[3] || '00';
    const ampm = match12[4] ? match12[4].toUpperCase() : null;
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
  }
  return str;
}

/**
 * Deterministic chronological comparator for journal entries.
 * Primary: Date (ascending YYYY-MM-DD)
 * Secondary: Raw date/timestamp string
 * Tertiary: Time string (e.g. '09:00 AM')
 * Quaternary: ID (numeric or string)
 */
function compareJournals(a, b) {
  const dateA = toStandardDateStr(a?.date || a?.txn_date || a?.createdAt || a?.create_date);
  const dateB = toStandardDateStr(b?.date || b?.txn_date || b?.createdAt || b?.create_date);
  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;

  const rawA = String(a?.date || a?.txn_date || a?.createdAt || a?.create_date || '');
  const rawB = String(b?.date || b?.txn_date || b?.createdAt || b?.create_date || '');
  if (rawA < rawB) return -1;
  if (rawA > rawB) return 1;

  const timeA = normalizeTimeComparable(a?.time);
  const timeB = normalizeTimeComparable(b?.time);
  if (timeA < timeB) return -1;
  if (timeA > timeB) return 1;

  const numA = Number(a?.id);
  const numB = Number(b?.id);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  const idA = String(a?.id || '');
  const idB = String(b?.id || '');
  return idA < idB ? -1 : (idA > idB ? 1 : 0);
}

/**
 * Returns a copy of journals sorted chronologically by date/time.
 * Memoized via WeakMap caching with array length guard (__len) to prevent re-sorting unmodified arrays.
 */
function indexJournalsChronologically(journals = []) {
  if (!Array.isArray(journals)) return [];
  if (journals.length <= 1) return [...journals];

  const cached = _journalIndexCache.get(journals);
  if (cached && cached.__len === journals.length) {
    return cached.indexed;
  }

  const copy = [...journals];
  copy.sort(compareJournals);

  _journalIndexCache.set(journals, { indexed: copy, __len: journals.length });
  return copy;
}

/**
 * Binary search for lower bound: first index where journal date >= targetDate
 */
function findLowerBound(arr, targetDate) {
  let low = 0;
  let high = arr.length - 1;
  let result = arr.length;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const midDate = toStandardDateStr(arr[mid]?.date || arr[mid]?.txn_date || arr[mid]?.createdAt || arr[mid]?.create_date);
    if (midDate >= targetDate) {
      result = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return result;
}

/**
 * Binary search for upper bound: last index where journal date <= targetDate
 */
function findUpperBound(arr, targetDate) {
  let low = 0;
  let high = arr.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const midDate = toStandardDateStr(arr[mid]?.date || arr[mid]?.txn_date || arr[mid]?.createdAt || arr[mid]?.create_date);
    if (midDate <= targetDate) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

/**
 * Queries journals within a date range using O(log N) binary search on chronologically indexed records.
 * Supports optional multi-business (businessId) and accountId filtering.
 *
 * @param {Array} journals Array of journal objects
 * @param {string|Date|null} startDate Start date (inclusive)
 * @param {string|Date|null} endDate End date (inclusive)
 * @param {Object} options Optional filters: { businessId, accountId, type, filter }
 * @returns {{ journals: Array, totalCount: number, executionTimeMs: number }}
 */
function queryJournalsByDateRange(journals, startDate, endDate, options = {}) {
  const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const calcElapsed = () => {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return Math.max(0, Number((now - startTime).toFixed(2)));
  };

  if (!Array.isArray(journals) || journals.length === 0) {
    return { journals: [], totalCount: 0, executionTimeMs: calcElapsed() };
  }

  const normStart = toStandardDateStr(startDate);
  const normEnd = toStandardDateStr(endDate);

  if (normStart && normEnd && normStart > normEnd) {
    return { journals: [], totalCount: 0, executionTimeMs: calcElapsed() };
  }

  const indexed = indexJournalsChronologically(journals);
  if (indexed.length === 0) {
    return { journals: [], totalCount: 0, executionTimeMs: calcElapsed() };
  }

  const low = normStart ? findLowerBound(indexed, normStart) : (normEnd ? findLowerBound(indexed, '0000-00-00') : 0);
  const high = normEnd ? findUpperBound(indexed, normEnd) : indexed.length - 1;

  if (low > high || low >= indexed.length || high < 0) {
    return { journals: [], totalCount: 0, executionTimeMs: calcElapsed() };
  }

  let candidates = indexed.slice(low, high + 1);

  const rawBizFilter = options.businessId !== undefined && options.businessId !== null
    ? options.businessId
    : (options.business_id !== undefined && options.business_id !== null ? options.business_id : null);
  const rawAccFilter = options.accountId !== undefined && options.accountId !== null
    ? options.accountId
    : (options.orig_account_id !== undefined && options.orig_account_id !== null ? options.orig_account_id : null);

  const hasBizFilter = rawBizFilter !== null;
  const hasAccFilter = rawAccFilter !== null;
  const hasTypeFilter = (options.type !== undefined && options.type !== null && options.type !== '') ||
                        (options.txn_type !== undefined && options.txn_type !== null && options.txn_type !== '');
  const hasModeFilter = (options.txn_mode !== undefined && options.txn_mode !== null && options.txn_mode !== '');
  const hasCustomFilter = typeof options.filter === 'function';

  if (hasBizFilter || hasAccFilter || hasTypeFilter || hasModeFilter || hasCustomFilter) {
    const targetBizId = hasBizFilter ? String(rawBizFilter) : null;
    const targetAccId = hasAccFilter ? String(rawAccFilter) : null;
    const targetType = options.type !== undefined && options.type !== null && options.type !== ''
      ? String(options.type)
      : (options.txn_type !== undefined && options.txn_type !== null && options.txn_type !== '' ? String(options.txn_type) : null);
    const targetMode = hasModeFilter ? Number(options.txn_mode) : null;

    candidates = candidates.filter((item) => {
      // 1. Business ID scoping (multi-business isolation)
      if (targetBizId !== null) {
        const itemBizId = String(
          item?.businessId !== undefined && item?.businessId !== null
            ? item.businessId
            : (item?.business_id !== undefined && item?.business_id !== null ? item.business_id : '1')
        );
        if (itemBizId !== targetBizId) {
          return false;
        }
      }

      // 2. Account ID scoping (orig_account_id <-> accountId)
      if (targetAccId !== null) {
        const itemAccId = item?.accountId !== undefined && item?.accountId !== null
          ? String(item.accountId)
          : (item?.orig_account_id !== undefined && item?.orig_account_id !== null ? String(item.orig_account_id) : null);
        if (itemAccId !== targetAccId) {
          return false;
        }
      }

      // 3. Transaction Type (type <-> txn_type)
      if (targetType !== null) {
        const itemType = item?.type !== undefined && item?.type !== null ? String(item.type) : null;
        const itemTxnType = item?.txn_type !== undefined && item?.txn_type !== null ? String(item.txn_type) : null;
        let matched = (itemType === targetType || itemTxnType === targetType);
        if (!matched) {
          if (targetType === 'given' && itemTxnType === '1') matched = true;
          else if (targetType === 'received' && itemTxnType === '2') matched = true;
          else if (targetType === '1' && itemType === 'given') matched = true;
          else if (targetType === '2' && itemType === 'received') matched = true;
        }
        if (!matched) return false;
      }

      // 4. Transaction Mode (txn_mode)
      if (targetMode !== null) {
        const itemMode = item?.txn_mode !== undefined && item?.txn_mode !== null
          ? Number(item.txn_mode)
          : (item?.isDigital ? 2 : 1);
        if (itemMode !== targetMode) {
          return false;
        }
      }

      // 5. Custom predicate filter
      if (hasCustomFilter && !options.filter(item)) {
        return false;
      }
      return true;
    });
  }

  const totalCount = candidates.length;

  if (options && options.sortOrder === 'desc') {
    candidates.reverse();
  }

  if (options && (options.offset > 0 || (options.limit !== undefined && options.limit !== null))) {
    const offset = Math.max(0, Number(options.offset) || 0);
    const limit = options.limit !== undefined && options.limit !== null ? Math.max(0, Number(options.limit)) : candidates.length;
    candidates = candidates.slice(offset, offset + limit);
  }

  return {
    journals: candidates,
    totalCount,
    executionTimeMs: calcElapsed()
  };
}


// ============================================================================
// PRIVACY-PRESERVING OPERATIONAL TELEMETRY & EVENT LOGGING (BL-018)
// ============================================================================

const MAX_EVENT_QUEUE_SIZE = 500;

const EVENT_TYPES = Object.freeze({
  CUSTOMER_CREATED: 'customer_created',
  CUSTOMER_UPDATED: 'customer_updated',
  TRANSACTION_RECORDED: 'transaction_recorded',
  CASHBOX_UPDATED: 'cashbox_updated',
  TAGADA_SENT: 'tagada_sent',
  BACKUP_INITIATED: 'backup_initiated',
  BACKUP_COMPLETED: 'backup_completed',
  BACKUP_FAILED: 'backup_failed',
  RESTORE_COMPLETED: 'restore_completed',
  PREFERENCES_UPDATED: 'preferences_updated',
});

class TelemetryService {
  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || MAX_EVENT_QUEUE_SIZE;
    this.enabled = options.enabled !== false;
    this.eventQueue = [];
    this._sequenceId = 0;
  }

  isTelemetryEnabled() {
    return this.enabled;
  }

  setTelemetryEnabled(isEnabled) {
    this.enabled = Boolean(isEnabled);
    if (!this.enabled) {
      this.clearEvents();
    }
  }

  sanitizePayload(rawPayload = {}) {
    if (!rawPayload || typeof rawPayload !== 'object') return {};

    const sanitized = {};
    const piiKeys = new Set([
      'name', 'customerName', 'customer_name',
      'mobile', 'phone', 'contact', 'address',
      'pin', 'password', 'token', 'accessToken',
      'notes', 'desc', 'description', 'message',
    ]);

    for (const [key, value] of Object.entries(rawPayload)) {
      if (piiKeys.has(key)) continue;
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  recordEvent(eventType, payload = {}) {
    if (!this.enabled) return null;

    this._sequenceId++;
    const nowIso = new Date().toISOString();

    const eventEnvelope = {
      id: `evt_${Date.now()}_${this._sequenceId}`,
      type: String(eventType || 'unknown_event'),
      timestamp: nowIso,
      data: this.sanitizePayload(payload),
    };

    this.eventQueue.push(eventEnvelope);

    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.splice(0, this.eventQueue.length - this.maxQueueSize);
    }

    return eventEnvelope;
  }

  getEvents(options = {}) {
    let result = [...this.eventQueue];

    if (options.type) {
      result = result.filter((e) => e.type === options.type);
    }

    const limit = options.limit !== undefined ? Math.max(0, Number(options.limit)) : 50;
    if (limit > 0 && result.length > limit) {
      result = result.slice(result.length - limit);
    }

    return result;
  }

  getEventCountsByType() {
    const counts = {};
    for (const type of Object.values(EVENT_TYPES)) {
      counts[type] = 0;
    }

    for (const evt of this.eventQueue) {
      if (evt && evt.type) {
        counts[evt.type] = (counts[evt.type] || 0) + 1;
      }
    }

    return counts;
  }

  exportTelemetrySnapshot() {
    return {
      enabled: this.enabled,
      totalEventsLogged: this.eventQueue.length,
      maxQueueSize: this.maxQueueSize,
      countsByType: this.getEventCountsByType(),
      latestEventTimestamp: this.eventQueue.length > 0 ? this.eventQueue[this.eventQueue.length - 1].timestamp : null,
      eventQueue: [...this.eventQueue],
    };
  }

  clearEvents() {
    this.eventQueue = [];
    this._sequenceId = 0;
  }
}

const defaultTelemetryService = new TelemetryService();
// Singleton repository instance for production and test suites
const defaultRepository = new StorageRepository();

const loadStore = async (repo = defaultRepository) => {
  if (repo && typeof repo.loadStore === 'function') {
    return repo.loadStore();
  }
  return defaultRepository.loadStore();
};


async function recordTagadaLog(rawLog, options = {}, repo = defaultRepository) {
  return repo.recordTagadaLog(rawLog, options);
}

function getTagadaQuota(businessId = null, repo = defaultRepository) {
  return repo.getTagadaQuota(businessId);
}

async function adjustTagadaQuota(delta = 0, options = {}, repo = defaultRepository) {
  return repo.adjustTagadaQuota(delta, options);
}

function listTagadaLogs(accountId = null, businessId = null, options = {}, repo = defaultRepository) {
  return repo.listTagadaLogs(accountId, businessId, options);
}

function generateAccountStatementRepo(accountOrId, journalsOrBizId, dateRange = 'all', options = {}, repo = defaultRepository) {
  if (repo && typeof repo.generateAccountStatement === 'function') {
    return repo.generateAccountStatement(accountOrId, journalsOrBizId, dateRange, options);
  }
  return generateAccountStatement(accountOrId, journalsOrBizId, dateRange, options);
}

const repoExport = {
  StorageRepository,
  storageRepository: defaultRepository,
  createDefaultState,
  SAMPLE_CUSTOMER_MAPPINGS,
  migrateLegacySampleCustomerNames,
  loadStore,
  VALID_COLLECTIONS,
  indexJournalsChronologically,
  queryJournalsByDateRange,
  clearJournalIndexCache,
  normalizeAccountFields,
  normalizeTagadaLogFields,
  resolveStatementDateRange,
  generateAccountStatement: generateAccountStatementRepo,
  recordTagadaLog,
  getTagadaQuota,
  adjustTagadaQuota,
  listTagadaLogs,
  TelemetryService,
  telemetryService: defaultTelemetryService,
  EVENT_TYPES,
  MAX_EVENT_QUEUE_SIZE,
  default: defaultRepository,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = repoExport;
}
if (typeof exports !== 'undefined') {
  exports.StorageRepository = StorageRepository;
  exports.storageRepository = defaultRepository;
  exports.createDefaultState = createDefaultState;
  exports.SAMPLE_CUSTOMER_MAPPINGS = SAMPLE_CUSTOMER_MAPPINGS;
  exports.migrateLegacySampleCustomerNames = migrateLegacySampleCustomerNames;
  exports.loadStore = loadStore;
  exports.VALID_COLLECTIONS = VALID_COLLECTIONS;
  exports.indexJournalsChronologically = indexJournalsChronologically;
  exports.queryJournalsByDateRange = queryJournalsByDateRange;
  exports.clearJournalIndexCache = clearJournalIndexCache;
  exports.normalizeAccountFields = normalizeAccountFields;
  exports.normalizeTagadaLogFields = normalizeTagadaLogFields;
  exports.resolveStatementDateRange = resolveStatementDateRange;
  exports.generateAccountStatement = generateAccountStatementRepo;
  exports.recordTagadaLog = recordTagadaLog;
  exports.getTagadaQuota = getTagadaQuota;
  exports.adjustTagadaQuota = adjustTagadaQuota;
  exports.listTagadaLogs = listTagadaLogs;
  exports.TelemetryService = TelemetryService;
  exports.telemetryService = defaultTelemetryService;
  exports.EVENT_TYPES = EVENT_TYPES;
  exports.MAX_EVENT_QUEUE_SIZE = MAX_EVENT_QUEUE_SIZE;
  exports.default = defaultRepository;
}