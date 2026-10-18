# DATA INTEGRITY REPORT — TALLYKHATA ACCOUNTING ENGINE

## 1. Accounting Conventions and Mathematical Model

### A. Customer Ledger (কাস্টমার খাতা)
- **দিলাম (বাকি / Credit Given)**:
  - Increases the customer's outstanding debt (+).
  - Formula: `NewBalance = PreviousBalance + Amount`
  - Running balance reflected on every journal entry in chronological order.
- **পেলাম (জমা / Cash Received)**:
  - Decreases the customer's outstanding debt (-).
  - Formula: `NewBalance = PreviousBalance - Amount`
  - **Cashbox Linkage**: Automatically records an atomic Cash Inflow (+ ক্যাশ বেচা / কাস্টমার জমা) in `cashEntries`.

### B. Supplier Ledger (সাপ্লায়ার খাতা)
- **নিলাম (বাকি কেনা / Credit Purchase)**:
  - Increases the merchant's payable debt (+).
  - Formula: `NewBalance = PreviousBalance + Amount`
- **দিলাম (পেমেন্ট / Cash Paid)**:
  - Decreases the merchant's payable debt (-).
  - Formula: `NewBalance = PreviousBalance - Amount`
  - **Cashbox Linkage**: Automatically records an atomic Cash Outflow (- দোকান খরচ / সাপ্লায়ার পেমেন্ট) in `cashEntries`.

### C. Opening Balances (প্রারম্ভিক জের)
- Opening balances are explicitly tracked in `account.openingBalance`.
- Base balance is treated as a foundational baseline:
  `TotalBalance = OpeningBalance + Sum(ChronologicalJournalNetDeltas)`
- Editing or deleting historical transactions preserves the immutable opening baseline.

## 2. Concurrency & Atomicity (Mutex Write Queue)

### A. `writeQueue` Mutex in `src/storageRepository.js`
- Sequential Promise chain guarantees that all disk operations (`AsyncStorage.setItem`) are strictly serialized.
- Any concurrent calls to `mutateCollection` or `mutateStore` receive the latest committed in-memory state.
- Write failures are cleanly caught, rejected promises do not poison or deadlock the queue, and errors are returned without corrupting local state.

### B. Cascade Deletions & Referential Integrity
- Deleting an account executes inside `mutateStore`:
  1. Removes target account from `accounts`.
  2. Identifies all dependent journals in `journals`.
  3. Removes associated journals.
  4. Nullifies or removes linked cashbox entries.
  5. Recalculates global receivables and payables in real-time.
- No orphan records are left in the database.

## 3. Safe Migration & Backup Snapshots
- V5 to V6 migration preserves original V5 data in `tallykhata_store_v5_backup`.
- Before executing cloud or offline restore, `createLocalSafetySnapshot()` saves a full local state copy in `tallykhata_safety_snapshot`.
- If restore validation fails, `rollbackToSafetySnapshot()` cleanly restores previous state without data loss.
