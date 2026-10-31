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
  { id: '1', name: 'Mobile Xpress', owner: 'স্বত্বাধিকারী', phone: '01700000000', address: 'বাজার রোড, ঢাকা', isSelected: true, isArchived: false, createdAt: '2026-10-15T00:00:00.000Z' },
  { id: '2', name: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ', owner: 'হাজী মো: করিম', phone: '01811223344', address: 'পাইকারি আড়ৎ, ঢাকা', isSelected: false, isArchived: false, createdAt: '2026-10-15T00:00:00.000Z' },
  { id: '3', name: 'সোনালী ফ্যাশন ও বস্ত্রালয়', owner: 'আহমেদ উল্লাহ', phone: '01911334455', address: 'নিউ মার্কেট, ঢাকা', isSelected: false, isArchived: false, createdAt: '2026-10-15T00:00:00.000Z' },
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
    const prevQueue = this.writeQueue;
    this.currentStore = null;
    this.writeQueue = Promise.resolve();
    if (prevQueue) {
      return Promise.resolve(prevQueue).catch(() => {}).then(() => {
        this.currentStore = null;
      });
    }
    return Promise.resolve(true);
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
    return collection.filter((item) => String(item.businessId || '1') === targetId);
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

      const updatedBusinesses = list.map((b) => ({
        ...b,
        isSelected: String(b.id) === targetId,
      }));

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

    const newBiz = {
      id: newId,
      name,
      owner: String(bizData.owner || '').trim() || 'স্বত্বাধিকারী',
      phone: String(bizData.phone || '').trim() || '01700000000',
      address: String(bizData.address || '').trim() || 'ঢাকা, বাংলাদেশ',
      isSelected,
      isArchived: false,
      createdAt: bizData.createdAt || new Date().toISOString(),
    };

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      if (list.some((b) => String(b.id) === newId)) {
        throw new Error('এই আইডি বিশিষ্ট ব্যবসা ইতোমধ্যে বিদ্যমান: ' + newId);
      }

      const updatedBusinesses = isSelected
        ? [...list.map((b) => ({ ...b, isSelected: false })), newBiz]
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

      const updatedBusinesses = list.map((b) => {
        if (String(b.id) === targetId) {
          return {
            ...b,
            isArchived: true,
            isSelected: false,
            archivedAt: new Date().toISOString(),
          };
        }
        if (nextActive && String(b.id) === String(nextActive.id)) {
          return {
            ...b,
            isSelected: true,
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

      const makeActive = Boolean(options.makeActive);
      const updatedBusinesses = list.map((b) => {
        if (String(b.id) === targetId) {
          return {
            ...b,
            isArchived: false,
            isSelected: makeActive ? true : Boolean(b.isSelected),
            restoredAt: new Date().toISOString(),
          };
        }
        if (makeActive) {
          return { ...b, isSelected: false };
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

      const hasAccounts = accounts.some((a) => String(a.businessId || '1') === targetId);
      const hasCash = cash.some((c) => String(c.businessId || '1') === targetId);
      const hasStock = stock.some((s) => String(s.businessId || '1') === targetId);

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
      const accounts = (prevStore.accounts || []).filter((a) => String(a.businessId || '1') !== targetId);
      const journals = (prevStore.journals || []).filter((j) => String(j.businessId || '1') !== targetId);
      const cashEntries = (prevStore.cashEntries || []).filter((c) => String(c.businessId || '1') !== targetId);
      const inventory = (prevStore.inventory || []).filter((i) => String(i.businessId || '1') !== targetId);
      const stock = (prevStore.stock || []).filter((s) => String(s.businessId || '1') !== targetId);
      const notes = (prevStore.notes || []).filter((n) => String(n.businessId || '1') !== targetId);
      const walletTxns = (prevStore.walletTxns || []).filter((w) => String(w.businessId || '1') !== targetId);
      const tagadaLogs = (prevStore.tagadaLogs || []).filter((t) => String(t.businessId || '1') !== targetId);

      const remainingBusinesses = list.filter((b) => String(b.id) !== targetId);

      let nextActiveId = prevStore.activeBusinessId;
      if (String(prevStore.activeBusinessId) === targetId) {
        const firstActive = remainingBusinesses.find((b) => !b.isArchived) || remainingBusinesses[0];
        nextActiveId = firstActive ? String(firstActive.id) : '1';
      }

      const updatedBusinesses = remainingBusinesses.map((b) => ({
        ...b,
        isSelected: String(b.id) === String(nextActiveId),
        isActive: !b.isArchived,
      }));

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

    if (backupPayload.checksum) {
      const dataToVerify = backupPayload.data || backupPayload;
      const expectedChecksum = backupPayload.checksum;
      const computed = this.computeChecksum(dataToVerify);
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
      : ['all'];
    const shouldRestoreAll = requestedDomains.includes('all');
    const shouldRestoreBusiness = shouldRestoreAll || requestedDomains.includes('business');
    const shouldRestoreMM = shouldRestoreAll || requestedDomains.includes('moneyManager') || requestedDomains.includes('money_manager');
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
        mmPayload.accounts.length > 0;

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
          const accJournals = newStore.journals.filter(j => String(j.accountId) === String(acc.id) && (!acc.businessId || !j.businessId || String(j.businessId) === String(acc.businessId)));
          if (accJournals.length > 0) {
            accJournals.sort((a, b) => {
              const dateComp = (a.date || '').localeCompare(b.date || '');
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
            let running = opening;
            for (const j of accJournals) {
              const amount = Number(j.amount) || 0;
              if (acc.type === 1) {
                if (j.type === 'given' || j.type === 'credit') running += amount;
                else if (j.type === 'received' || j.type === 'cash') running -= amount;
              } else {
                if (j.type === 'purchase' || j.type === 'credit') running += amount;
                else if (j.type === 'payment' || j.type === 'cash') running -= amount;
              }
            }
            return { ...acc, balance: running };
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
  computeChecksum(dataObj) {
    if (!dataObj) return '';
    const str = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
    try {
      if (typeof require !== 'undefined') {
        const crypto = require('crypto');
        if (crypto && crypto.createHash) {
          return 'sha256_' + crypto.createHash('sha256').update(str, 'utf8').digest('hex');
        }
      }
    } catch (_) {}
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'chk_' + Math.abs(hash).toString(16) + '_' + str.length;
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
      const computed = this.computeChecksum(dataToVerify);
      if (computed !== expectedChecksum) {
        throw new Error('Backup integrity checksum mismatch: data may be corrupted or tampered');
      }
    }

    this.currentStore = null;
    const res = await this.commitRestorePayload(backupPayload, options);

    this.notifyRestoreHooks({
      moneyManager: res.restoredMoneyManager,
      preferences: res.restoredPreferences,
    });

    return res;
  }

  async importAllData(backupPayload, options = {}) {
    return this.restoreStorageBackup(backupPayload, options);
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