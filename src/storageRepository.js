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

const {
  generateUniqueId,
  migrateV5toV6,
  V5_KEY,
  V6_KEY,
  V5_BACKUP_KEY,
  recalculateAccountRunningBalances,
} = require('./ledgerEngine');

const VALID_COLLECTIONS = new Set([
  'accounts',
  'journals',
  'cashEntries',
  'inventory',
  'notes',
  'walletTxns',
  'businesses',
  'tagadaLogs',
]);

// Default initial dataset with 100% mathematically consistent opening balances and journal running totals
const DEFAULT_BUSINESSES = [
  { id: '1', name: 'Mobile Xpress', owner: 'স্বত্বাধিকারী', phone: '01700000000', address: 'বাজার রোড, ঢাকা', isSelected: true },
  { id: '2', name: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ', owner: 'হাজী মো: করিম', phone: '01811223344', address: 'পাইকারি আড়ৎ, ঢাকা', isSelected: false },
  { id: '3', name: 'সোনালী ফ্যাশন ও বস্ত্রালয়', owner: 'আহমেদ উল্লাহ', phone: '01911334455', address: 'নিউ মার্কেট, ঢাকা', isSelected: false },
];

function createDefaultState() {
  return {
    accounts: [
      { id: '1', name: 'Raihan ★ khoksha', phone: '01711223344', type: 1, openingBalance: 3800, balance: 7000, address: 'খোকসা বাজার', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '2', name: 'Faysal ★★', phone: '01812345678', type: 1, openingBalance: 8550, balance: 10000, address: 'পশ্চিম পাড়া', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '3', name: 'Abd. Samad ★ Jv', phone: '01911998877', type: 1, openingBalance: 3000, balance: 8000, address: 'জেভি মোড়', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '4', name: 'Tanvir ★ Al Baraka', phone: '01622334455', type: 1, openingBalance: 0, balance: 0, address: 'আল বারাকা মার্কেট', createDate: '2026-10-15', timeAgo: '৪ মাস' },
      { id: '5', name: 'Jwel Vai Gk', phone: '01733445566', type: 1, openingBalance: 500, balance: 500, address: 'জিকে কলোনি', createDate: '2026-10-15', timeAgo: '৫ মাস' },
      { id: '6', name: 'Shamim Telecom', phone: '01744556677', type: 1, openingBalance: 12000, balance: 12000, address: 'স্টেশন রোড', createDate: '2026-10-15', timeAgo: '৬ মাস' },
      { id: '7', name: 'Kabir Hardware', phone: '01755667788', type: 1, openingBalance: 15000, balance: 15000, address: 'মেইন রোড', createDate: '2026-10-15', timeAgo: '২ মাস' },
      { id: '8', name: 'Babul Enterprise', phone: '01766778899', type: 1, openingBalance: 18000, balance: 18000, address: 'চকবাজার', createDate: '2026-10-15', timeAgo: '১ মাস' },
      { id: '9', name: 'Rubel Electronics', phone: '01777889900', type: 1, openingBalance: 14000, balance: 14000, address: 'নিউ মার্কেট', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '10', name: 'Shuvo Mobile Store', phone: '01788990011', type: 1, openingBalance: 9000, balance: 9000, address: 'কলেজ গেট', createDate: '2026-10-15', timeAgo: '৪ মাস' },
      { id: '11', name: 'Ripon Telecom', phone: '01799001122', type: 1, openingBalance: 7000, balance: 7000, address: 'থানা মোড়', createDate: '2026-10-15', timeAgo: '৫ মাস' },
      { id: '12', name: 'Monir Store', phone: '01712341234', type: 1, openingBalance: 8000, balance: 8000, address: 'হাসপাতাল রোড', createDate: '2026-10-15', timeAgo: '২ মাস' },
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
    remainingSmsCount: 5,
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

  resetStore() {
    this.currentStore = null;
    this.writeQueue = Promise.resolve();
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
      const v6DataStr = await this.adapter.getItem(V6_KEY);
      if (v6DataStr) {
        const parsed = JSON.parse(v6DataStr);
        this.currentStore = parsed;
        return { success: true, data: parsed, source: 'v6' };
      }

      // Check for v5 data to migrate safely
      const v5DataStr = await this.adapter.getItem(V5_KEY);
      if (v5DataStr) {
        const migResult = migrateV5toV6(v5DataStr);
        if (migResult.success && migResult.data) {
          const migratedData = migResult.data;
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
            };

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
          }
        })
        .catch((fatalErr) => {
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
          }
        })
        .catch((fatalErr) => {
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
}

// Singleton repository instance for production and test suites
const defaultRepository = new StorageRepository();

const repoExport = {
  StorageRepository,
  storageRepository: defaultRepository,
  createDefaultState,
  VALID_COLLECTIONS,
  default: defaultRepository,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = repoExport;
}
if (typeof exports !== 'undefined') {
  exports.StorageRepository = StorageRepository;
  exports.storageRepository = defaultRepository;
  exports.createDefaultState = createDefaultState;
  exports.VALID_COLLECTIONS = VALID_COLLECTIONS;
  exports.default = defaultRepository;
}