# Backend Architecture & Data Persistence Audit (Phase 3.1)

## 1. Storage Architecture
The application runs as a resilient, 100% offline-first architecture using `@react-native-async-storage/async-storage` backed by an authoritative double-entry domain engine (`src/ledgerEngine.js`).

### Storage Keys & Migration
| Key | Version | Purpose |
|---|---|---|
| `tallykhata_offline_store_v6` | Current (v6) | Primary persistent store for accounts, journals, cash, inventory, notes, and profile |
| `tallykhata_offline_store_v5` | Legacy (v5) | Older store migrated safely on first launch |
| `tallykhata_offline_store_v5_backup` | Safety Backup | Permanent unmutated snapshot of v5 data preserved before migration |

### Primary Storage Schema
```typescript
interface TallyKhataStoreV6 {
  accounts: Array<{
    id: string;
    name: string;
    phone: string;
    address: string;
    type: 1 | 2; // 1 = Customer, 2 = Supplier
    balance: number;
    createDate: string;
    timeAgo?: string;
  }>;
  journals: Array<{
    id: string;
    accountId: string;
    type: 'given' | 'received';
    amount: number;
    desc: string;
    date: string;
    time: string;
    runningBalance: number;
  }>;
  cashEntries: Array<{
    id: string;
    linkedTxnId?: string; // Foreign key to journal id (referential integrity)
    category: 'sale' | 'buy' | 'cost' | 'malik_in' | 'malik_out' | 'baki_aday' | 'supplier_pay';
    type: 'in' | 'out';
    amount: number;
    desc: string;
    date: string;
    time: string;
  }>;
  inventory: Array<{
    id: string;
    name: string;
    unit: string;
    buyPrice: number;
    sellPrice: number;
    stock: number;
  }>;
  notes: Array<{
    id: string;
    text: string;
    isComplete: boolean;
    date: string;
  }>;
  walletBalance: number;
  walletTxns: Array<{
    id: string;
    title: string;
    amount: number;
    type: 'in' | 'out';
    date: string;
    time: string;
  }>;
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  businessAddress: string;
  businesses: Array<{
    id: string;
    name: string;
    owner: string;
    phone: string;
    address: string;
    isSelected: boolean;
  }>;
  remainingSmsCount: number;
  openingBalance: number;
  pinEnabled: boolean;
  appPin: string;
  tagadaLogs: Array<any>;
  migrationVersion: 6;
  migratedAt: string;
}
```

---

## 2. Authoritative Double-Entry & Referential Integrity Rules
1. **Customer Balance Calculation (`type === 1`)**:
   - `given` (দিলাম / বাকি বিক্রি): Increases customer debt (`+amount`).
   - `received` (পেলাম / জমা আদায়): Decreases customer debt (`-amount`).
   - Running Balance: Sequentially computed from initial balance across all historical entries sorted chronologically by date, time, and sequence ID.
2. **Supplier Balance Calculation (`type === 2`)**:
   - `given` (দিলাম / টাকা পরিশোধ): Decreases supplier debt (`-amount`).
   - `received` (পেলাম / মাল ক্রয়): Increases supplier debt (`+amount`).
3. **Cashbox Double-Entry Synchronization**:
   - Customer payment (`received`) automatically creates/updates a linked Cash In entry (`category: 'baki_aday'`, `linkedTxnId: txn.id`).
   - Supplier payment (`given`) automatically creates/updates a linked Cash Out entry (`category: 'supplier_pay'`, `linkedTxnId: txn.id`).
   - Editing a transaction atomically updates the linked cash entry amount and description.
   - Deleting a transaction removes the linked cash entry without affecting manual cash records.
4. **Cascade Referential Integrity on Account Deletion**:
   - Deleting an account gathers all its journal IDs, deletes all journals, and removes all linked cashbox entries (`removeCashEntriesForTransactions`). Zero orphaned records remain.
5. **Persistence Serialization Queue**:
   - `persistData` runs through a serialized Promise queue mutex, preventing race conditions or concurrent state overwrites.
   - Handlers await persistence before modifying UI state or dismissing modals.

---

## 3. Phase 3.2 Production Storage Repository (`src/storageRepository.js`)

To ensure rock-solid data integrity under concurrent writes and React component re-rendering, data persistence has been refactored into a production-grade module: `src/storageRepository.js`.

### Key Capabilities
1. **Module-Scoped Write Queue Mutex**:
   - Unlike component-scoped promises, `this.writeQueue` lives at the singleton repository level and persists across all React lifecycle events and screen navigations.
   - All write operations are chained sequentially onto `this.writeQueue.then(...)`.
2. **Authoritative In-Memory Merge (`this.currentStore`)**:
   - `StorageRepository` caches the latest committed store in `this.currentStore`.
   - When a caller persists changes (e.g. `{ cashEntries: updated }`), it merges these changes onto `this.currentStore`, ensuring that unmentioned fields (e.g. `accounts`, `inventory`) retain their latest committed values rather than potentially stale React state snapshots.
3. **Fault-Tolerant Queue Unlocking**:
   - If an underlying storage write fails (e.g. disk quota exceeded, I/O error), `persistData` catches the exception, reports `{ success: false, error }`, and does NOT mutate `this.currentStore`.
   - The queue promise chain is kept resolved (`.catch(...)`), preventing deadlocks so subsequent write operations can proceed normally.
4. **Injectable Storage Adapter**:
   - In production, `storageRepository.setStorageAdapter(AsyncStorage)` binds the repository to React Native `@react-native-async-storage/async-storage`.
   - In unit/integration tests, `createMemoryAdapter()` or custom mock adapters can be injected to test serialization, error handling, and recovery without touching device storage.
5. **Safe V5 Migration with Backup Retention**:
   - `loadInitialData()` automatically detects existing V5 stores, creates an unmutated snapshot in `tallykhata_offline_store_v5_backup`, migrates to V6, and persists the result.
   - Seed data is strictly prohibited from overwriting genuine user records.