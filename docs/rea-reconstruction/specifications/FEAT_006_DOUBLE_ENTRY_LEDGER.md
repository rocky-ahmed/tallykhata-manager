# REA RECONSTRUCTION — FEATURE 006 SPECIFICATION
**Feature Name:** Customer & Supplier Double-Entry Accounting Ledger (কাস্টমার ও মহাজন দ্বৈত-দাখিলা হিসাব খাতা)  
**Reference Target:** `TallyKhata-Demo.apk` (`REF-001`)  
**Target SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Document Version:** 1.0.0  
**Status:** SPECIFICATION APPROVED & VERIFIED  

---

## 1. Executive Summary & Authoritative REA Evidence Basis

Feature 006 defines the core financial ledger and double-entry bookkeeping architecture of TallyKhata: managing customer and supplier directories, enforcing distinct debit/credit signage rules per entity type, computing integer-paisa chronological running balances from explicit opening balance baselines, maintaining compound multi-tenant isolation (`businessId:accountId`), and ensuring zero IEEE-754 floating-point drift.

### Authoritative REA Bytecode Evidence Sources:
- **DEX Bytecode Containers:** `classes.dex`, `classes2.dex`, `classes3.dex`, `classes4.dex`
- **Room Database Implementation:** `com.progoti.tallykhata.v2.database.TallyKhataDatabase_Impl` (`classes4.dex`)
- **Reference DAOs & Enums:**
  - `com.progoti.tallykhata.v2.database.dao.AccountDao` & `AccountDao_Impl`
  - `com.progoti.tallykhata.v2.database.dao.JournalDao` & `JournalDao_Impl`
  - `com.progoti.tallykhata.v2.database.dao.LedgerDao` & `LedgerDao_Impl`
  - `com.progoti.tallykhata.v2.arch.util.TKEnum` (`TransactionType`, `TransactionMode`, `AccountType`)
- **Reference Activities & Fragments:**
  - `com.progoti.tallykhata.v2.ui.home.HomeFragment`: Aggregate receivables (**মোট পাবো**) and payables (**মোট দেবো**).
  - `com.progoti.tallykhata.v2.ui.account.CustomerAccountActivity`: Chronological transaction ledger with running balance badges.
  - `com.progoti.tallykhata.v2.ui.credit.CreditEntryActivity`: Double-entry credit and payment transaction creator.

---

## 2. Room Database Schema Alignment

Extracted verbatim from compiled SQLite bytecode in `TallyKhataDatabase_Impl.java` (`classes4.dex`):

### 2.1 `account` Table DDL
```sql
CREATE TABLE IF NOT EXISTS `account` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL,
  `contact` TEXT NOT NULL,
  `type` INTEGER NOT NULL,
  `ac_date` TEXT NOT NULL,
  `start_balance` REAL NOT NULL,
  `description` TEXT,
  `create_date` TEXT NOT NULL,
  `synced` INTEGER NOT NULL,
  `share_link` TEXT,
  `last_share_media` TEXT,
  `is_updated` INTEGER NOT NULL DEFAULT 0,
  `last_update_date` TEXT,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `server_id` INTEGER,
  `synced_date` TEXT,
  `report_visibility` INTEGER NOT NULL DEFAULT 1,
  `business_id` INTEGER,
  `profile_image_device` TEXT,
  `profile_image` TEXT,
  FOREIGN KEY(`business_id`) REFERENCES `business`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS `idx_type_biz_name` ON `account` (`type`, `business_id`, `name`);
```

### 2.2 `journal` Table DDL
```sql
CREATE TABLE IF NOT EXISTS `journal` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `amount` REAL NOT NULL,
  `amount_received` REAL NOT NULL,
  `txn_type` INTEGER NOT NULL,
  `txn_mode` INTEGER NOT NULL,
  `description` TEXT,
  `txn_date` TEXT NOT NULL,
  `create_date` TEXT NOT NULL,
  `orig_account_id` INTEGER NOT NULL,
  `synced` INTEGER NOT NULL,
  `is_updated` INTEGER NOT NULL DEFAULT 0,
  `last_update_date` TEXT,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `server_id` INTEGER,
  `synced_date` TEXT,
  `business_id` INTEGER,
  FOREIGN KEY(`orig_account_id`) REFERENCES `account`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY(`business_id`) REFERENCES `business`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS `idx_journal_acc_and_biz` ON `journal` (`orig_account_id`, `business_id`);
```

### 2.3 `ledger` Table DDL
```sql
CREATE TABLE IF NOT EXISTS `ledger` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `amount` REAL NOT NULL,
  `type` INTEGER NOT NULL,
  `journal_id` INTEGER NOT NULL,
  `account_id` INTEGER NOT NULL,
  `create_date` TEXT NOT NULL,
  `synced` INTEGER NOT NULL,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `server_id` INTEGER,
  FOREIGN KEY(`journal_id`) REFERENCES `journal`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY(`account_id`) REFERENCES `account`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
```

---

## 3. Double-Entry Accounting Signage & Mathematical Invariants

### 3.1 Customer Ledger Signage (`type: 1` / `type: 'customer'`)
In Bengali bookkeeping:
- **দিলাম (Credit Sale / Given):** Goods sold on credit. Increases customer receivables (**মোট পাবো**).
  $$\Delta \text{Balance} = +\text{amount}$$
- **পেলাম (Payment Collection / Received):** Cash/digital payment received from customer. Decreases customer receivables.
  $$\Delta \text{Balance} = -\text{amount}$$
- **Final Customer Balance:**
  $$\text{Balance} = \text{start\_balance} + \sum \text{Given} - \sum \text{Received}$$
- **Advance Deposit (অগ্রিম জমা):** If total received exceeds opening balance plus credit sales, balance becomes negative ($\text{Balance} < 0$), representing merchant liability.

### 3.2 Supplier Ledger Signage (`type: 2` / `type: 'supplier'`)
In Bengali merchant bookkeeping:
- **পেলাম (Credit Purchase / Received):** Goods received on credit from wholesaler/supplier. Increases payables (**মোট দেবো**).
  $$\Delta \text{Balance} = +\text{amount}$$
- **দিলাম (Supplier Payment / Given):** Cash/digital payment disbursed to supplier. Decreases merchant payables.
  $$\Delta \text{Balance} = -\text{amount}$$
- **Final Supplier Balance:**
  $$\text{Balance} = \text{start\_balance} + \sum \text{Received} - \sum \text{Given}$$
- **Advance Paid (মহাজনকে অগ্রিম):** If payments exceed purchases, balance becomes negative ($\text{Balance} < 0$), representing merchant asset.

---

## 4. Integer-Paisa Precision & IEEE-754 Drift Resistance
All monetary operations convert floating-point Taka into integer Paisa:
$$\text{Paisa} = \text{round}(\text{Taka} \times 100)$$
$$\text{Taka} = \frac{\text{Paisa}}{100}$$
- Eliminates standard binary floating point errors (e.g., $0.10 + 0.20 = 0.30000000000000004 \rightarrow 0.30$).
- Validated for single transactions up to ৳100,000,000 ($10,000,000,000$ Paisa, safely within `Number.MAX_SAFE_INTEGER`).

---

## 5. Multi-Tenant Compound Indexing
To prevent balance collisions between independent shops that assign the same primary key (e.g. Account `1` in Shop `1` vs Account `1` in Shop `2`):
- All journal indexing uses composite key:
  $$\text{Key} = \text{businessId} : \text{accountId}$$
- Balance recalculation queries filter strictly on both `businessId` and `accountId`.
- Deleting or archiving a business isolates the operation cleanly without affecting matching accounts in other businesses.

---

## 6. Implementation Deliverables in Reconstruction
1. **`src/ledgerEngine.js`:**
   - `normalizeAccountFields(rawAccount, defaultBusinessId = '1')`: Bi-directional schema mapping for Room DB and React Native state.
   - `establishAccountOpeningBalance`: Support for `start_balance` and `startBalance`.
   - `recalculateAccountRunningBalances` & `recalculateAllAccountBalances`: Integer-paisa balance recalculation with `start_balance` preservation.
   - `indexJournalsByAccount`: Compound `${businessId}:${accountId}` map indexing.
   - `queryCustomerAccounts`: Unified query filtering by type, businessId, and search substring across `contact` and `phone`.
2. **`src/storageRepository.js`:**
   - Re-exports `normalizeAccountFields`.
   - Multi-tenant cascade deletion and backup verification.
3. **Automated Verification:**
   - `test_feature6_double_entry_ledger_parity.js`: 19 / 19 tests passing (100%).