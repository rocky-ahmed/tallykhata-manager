# REA RECONSTRUCTION — FEATURE 001 SPECIFICATION
**Feature Name:** Application Entry, Navigation & Ledger Transaction Flow  
**Reference Target:** `TallyKhata-Demo.apk` (`REF-001`)  
**Target SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Document Version:** 1.0.0  
**Status:** SPECIFICATION APPROVED  

---

## 1. Executive Summary & REA Evidence Basis
Feature 001 defines the core application entry point, primary navigation bar, customer/supplier ledgers, and transaction entry workflow (`CreditEntryActivity`).

### Authoritative REA Evidence:
- **APK DEX Analysis:** `classes.dex`, `classes2.dex`, `classes3.dex`, `classes4.dex`
- **Reference Activities:**
  - Entry/Splash: `com.progoti.tallykhata.v2.SplashScreenActivity`
  - Main Hub: `com.progoti.tallykhata.v2.MainActivity`
  - Transaction Entry: `com.progoti.tallykhata.v2.cstxn.CreditEntryActivity`
  - Transaction Share/Receipt: `com.progoti.tallykhata.v2.cstxn.TxnShareActivity`
- **Reference Navigation Tabs (`MainActivity`):**
  1. `HomeFragment` (হিসাব / খাতা - Customer & Supplier ledgers)
  2. `CashbookFragment` (ক্যাশবাক্স - Cash drawer)
  3. `WalletFragment` (তালীপে - Digital payment / wallet)
  4. `ProfileFragment` (মেনু - Profile, multi-business switcher & settings)

---

## 2. Room Database Schema Alignment

### 2.1 business Table
```sql
CREATE TABLE IF NOT EXISTS business (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  business_name TEXT NOT NULL,
  business_address TEXT,
  business_age INTEGER,
  business_type TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_primary INTEGER NOT NULL DEFAULT 0,
  is_current INTEGER NOT NULL DEFAULT 0,
  comment TEXT,
  create_date TEXT NOT NULL,
  update_date TEXT,
  sync_date TEXT
);
```

### 2.2 account Table
```sql
CREATE TABLE IF NOT EXISTS account (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  type INTEGER NOT NULL, -- 1: Customer (গ্রাহক / কাস্টমার), 2: Supplier (মহাজন / সাপ্লায়ার)
  ac_date TEXT NOT NULL,
  start_balance REAL NOT NULL, -- Integer paisa precision in clone
  description TEXT,
  create_date TEXT NOT NULL,
  synced INTEGER NOT NULL,
  share_link TEXT,
  last_share_media TEXT,
  is_updated INTEGER NOT NULL DEFAULT 0,
  last_update_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  server_id INTEGER,
  synced_date TEXT,
  report_visibility INTEGER NOT NULL DEFAULT 1,
  business_id INTEGER,
  profile_image_device TEXT,
  profile_image TEXT,
  FOREIGN KEY(business_id) REFERENCES business(id)
);
```

### 2.3 journal Table
```sql
CREATE TABLE IF NOT EXISTS journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,           -- Transaction amount (integer paisa in clone)
  amount_received REAL NOT NULL,  -- Received portion
  txn_type INTEGER NOT NULL,      -- 1: Credit (বাকি), 2: Payment/Collection (টাকা গ্রহণ/পরিশোধ)
  txn_mode INTEGER NOT NULL,      -- 1: Cash (নগদ), 2: Digital/Wallet (ডিজিটাল)
  description TEXT,
  txn_date TEXT NOT NULL,
  create_date TEXT NOT NULL,
  orig_account_id INTEGER NOT NULL, -- References account.id
  synced INTEGER NOT NULL,
  is_updated INTEGER NOT NULL DEFAULT 0,
  last_update_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  server_id INTEGER,
  synced_date TEXT,
  business_id INTEGER,
  FOREIGN KEY(orig_account_id) REFERENCES account(id),
  FOREIGN KEY(business_id) REFERENCES business(id)
);
```

### 2.4 Indexing Parity
```sql
CREATE INDEX IF NOT EXISTS idx_journal_acc_and_biz ON journal (orig_account_id, business_id);
CREATE INDEX IF NOT EXISTS index_account_media_account_id ON account_media (account_id);
```

---

## 3. Financial & Accounting Mechanics

### 3.1 Integer Paisa Arithmetic
All monetary calculations execute in integer paisa:
1 Taka = 100 Paisa.
Zero floating-point inaccuracies. Range: ৳0.01 to ৳100,000,000.

### 3.2 Running Balance Calculations
- **Customer (type === 1):**
  - txn_type === 1 (বাকি দেওয়া / Credit Sale): Balance increases (+amount).
  - txn_type === 2 (টাকা পাওয়া / Payment Collection): Balance decreases (-amount).
  - Net Customer Balance = Opening Balance + Sum(Credits) - Sum(Payments).
- **Supplier (type === 2):**
  - txn_type === 1 (বাকি নেওয়া / Credit Purchase): Payable increases (+amount).
  - txn_type === 2 (টাকা দেওয়া / Supplier Payment): Payable decreases (-amount).
  - Net Supplier Due = Opening Balance + Sum(Credit Purchases) - Sum(Payments).

### 3.3 Cashbox Linkage Invariant
When txn_mode === 1 (Cash):
- Customer Payment Received (type === 1 && txn_type === 2): Inflow into Cashbox (+amount).
- Supplier Payment Made (type === 2 && txn_type === 2): Outflow from Cashbox (-amount).
- Credit entries (txn_type === 1) and Digital transactions (txn_mode === 2) do not alter the cash drawer.

---

## 4. UI/UX Interaction Standards
1. **Top Summary Cards:**
   - **পাবো (Total Receivable):** Emerald Green card with Kohinoor Bangla typography.
   - **দেবো (Total Payable):** Ruby Red card.
2. **Dual-Tab Switcher:**
   - Smooth animated tab switch between Customers and Suppliers.
   - Dedicated search bar filtering by name and phone number.
3. **CreditEntry Flow:**
   - Large numeric keypad with Bengali Taka (৳) symbol.
   - Radio/Toggle for Transaction Type (বাকি / পাওয়া).
   - Date picker defaulting to current local date.
   - Note input for item details.
   - 3D tactile button with haptic feedback on save.
   - Hardware BackHandler integration (modal closes on back press without app exit).
