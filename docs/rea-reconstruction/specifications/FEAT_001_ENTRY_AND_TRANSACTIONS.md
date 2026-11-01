# REA RECONSTRUCTION — FEATURE 001 SPECIFICATION
**Feature Name:** Application Entry, Navigation, Room DB Schema & Transaction Entry Flow  
**Reference Target:** `TallyKhata-Demo.apk` (`REF-001`)  
**Target SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Document Version:** 1.1.0  
**Status:** SPECIFICATION APPROVED & VERIFIED  

---

## 1. Executive Summary & Authoritative REA Evidence

Feature 001 governs the foundational architecture of TallyKhata: application lifecycle entry, multi-tab main navigation, Room database DDL, Dalvik enums, and the core credit entry workflow (`CreditEntryActivity`).

### Authoritative REA Bytecode Evidence Sources:
- **DEX Bytecode Containers:** `classes.dex`, `classes2.dex`, `classes3.dex`, `classes4.dex`
- **Database Engine Definition:** `com.progoti.tallykhata.v2.database.TallyKhataDatabase_Impl` (`classes4.dex`)
- **Core Entities & Enums:**
  - `com.progoti.tallykhata.v2.database.model.Journal`
  - `com.progoti.tallykhata.v2.database.model.Account`
  - `com.progoti.tallykhata.v2.database.model.Business`
  - `com.progoti.tallykhata.v2.database.model.CashboxAdjustment`
  - `com.progoti.tallykhata.v2.arch.util.TKEnum` (`$TransactionType`, `$TransactionMode`, `$AccountType`, `$SystemAccount`)
- **Key Navigation & UI Controllers:**
  - Splash & Routing: `com.progoti.tallykhata.v2.SplashScreenActivity`
  - Main Hub & Tab Controller: `com.progoti.tallykhata.v2.MainActivity`
  - Primary Navigation Tabs:
    1. `com.progoti.tallykhata.v2.home.HomeFragment` (হিসাব / খাতা — Customer & Supplier Ledgers)
    2. `com.progoti.tallykhata.v2.cashbook.CashbookFragment` (ক্যাশবাক্স — Cash Drawer & Daily Tally)
    3. `com.progoti.tallykhata.v2.wallet.WalletFragment` (তালীপে — Digital Wallet, Bangla QR & Payments)
    4. `com.progoti.tallykhata.v2.profile.ProfileFragment` (মেনু — Business Switcher, Reports, Notes & Settings)
  - Transaction Entry Activity: `com.progoti.tallykhata.v2.cstxn.CreditEntryActivity`
  - Customer Ledger History View: `com.progoti.tallykhata.v2.cstxn.CustomerAccountActivity`
  - Double-Entry Calculation Engine: `com.progoti.tallykhata.v2.arch.util.g->i`

---

## 2. Room Database Schema Alignment

Extracted directly from the compiled SQLite Room database implementation (`TallyKhataDatabase_Impl.java` in `classes4.dex`).

### 2.1 `business` Table
Represents multi-business profiles managed by the merchant.

```sql
CREATE TABLE IF NOT EXISTS `business` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `business_name` TEXT NOT NULL,
  `business_address` TEXT,
  `business_age` INTEGER,
  `business_type` TEXT,
  `synced` INTEGER NOT NULL DEFAULT 0,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `is_primary` INTEGER NOT NULL DEFAULT 0,
  `is_current` INTEGER NOT NULL DEFAULT 0,
  `comment` TEXT,
  `create_date` TEXT NOT NULL,
  `update_date` TEXT,
  `sync_date` TEXT
);

CREATE INDEX IF NOT EXISTS `idx_business_is_active` ON `business` (`is_active`);
CREATE INDEX IF NOT EXISTS `idx_business_is_current` ON `business` (`is_current`);
CREATE INDEX IF NOT EXISTS `idx_business_is_primary` ON `business` (`is_primary`);
```

### 2.2 `account` Table
Represents individual customers, suppliers, and internal system accounting accounts.

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

### 2.3 `journal` Table
The core immutable bookkeeping ledger containing all credit, cash, and digital transactions.

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

### 2.4 `cashbox_adjustment` Table
Links physical cash drawer manual reconciliations and discrepancies directly to the journal.

```sql
CREATE TABLE IF NOT EXISTS `cashbox_adjustment` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `journal_id` INTEGER NOT NULL,
  `amount` REAL NOT NULL,
  `synced` INTEGER NOT NULL,
  `create_date` TEXT NOT NULL,
  `update_date` TEXT,
  FOREIGN KEY(`journal_id`) REFERENCES `journal`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
```

---

## 3. Bytecode Enum Mappings (`TKEnum`)

Disassembled from Dalvik class `Lcom/progoti/tallykhata/v2/arch/util/TKEnum;`:

### 3.1 `TKEnum$TransactionType` (`txn_type`)
| Integer Value | Enum Constant | Bengali Semantic Meaning |
| :--- | :--- | :--- |
| `1` | `CASH_SALE` | নগদ বিক্রি (Cash Sale) |
| `2` | `CASH_PURCHASE` | নগদ ক্রয় (Cash Purchase) |
| `3` | `CREDIT_SALE` | বাকি বিক্রি / কাস্টমারকে দিলাম (Credit Given) |
| `4` | `CREDIT_PURCHASE` | বাকি ক্রয় / মহাজন থেকে পেলাম (Credit Taken) |
| `5` | `CASH_EXPENSE` | দোকানের খরচ (Shop Expense) |
| `6` | `MALIK_NILO` | মালিক নিলো (Owner Drawings) |
| `7` | `MALIK_DILO` | মালিক দিলো (Owner Capital) |
| `8` | `CASH_ADJUST` | ক্যাশবাক্স সমন্বয় (Cashbox Adjustment) |
| `9` | `CREDIT_COLLECTION` | বাকি আদায় / কাস্টমার থেকে পেলাম (Customer Payment) |
| `10` | `SUPPLIER_PAYMENT` | মহাজনকে দিলাম (Supplier Payment) |
| `11` | `DIGITAL_SALE` | ডিজিটাল পেমেন্ট বিক্রি (Digital Sale) |

### 3.2 `TKEnum$TransactionMode` (`txn_mode`)
| Integer Value | Enum Constant | Execution & Settlement Channel |
| :--- | :--- | :--- |
| `1` | `CASH` | Physical Cash (Affects Cash Drawer) |
| `2` | `MFS` | Mobile Financial Services (bKash, Nagad, Rocket) |
| `3` | `WALLET` | TallyPay Merchant Digital Wallet |

### 3.3 `TKEnum$AccountType` (`type` in `account`)
| Integer Value | Enum Constant | Directory / Filter Placement |
| :--- | :--- | :--- |
| `1` | `SYSTEM` | Internal General Ledger Accounts (`_CASH`, `_SALES`, etc.) |
| `2` | `CUSTOMER` | কাস্টমার (Customer Directory) |
| `3` | `SUPPLIER` | মহাজন / সাপ্লায়ার (Supplier Directory) |

### 3.4 `TKEnum$SystemAccount`
| Integer Value | Enum Constant | Account Identifier / Role |
| :--- | :--- | :--- |
| `0` | `_BUSINESS_OWNER` | Owner Equity / Capital Account |
| `1` | `_CASH` | Physical Cashbox General Ledger Account |
| `2` | `_EXPENSE` | Operating Expense Ledger Account |
| `3` | `_SALES` | Gross Sales Revenue Ledger Account |
| `4` | `_PURCHASE` | Inventory Purchase Ledger Account |

---

## 4. Main Navigation Architecture & Transaction Launch Flows

### 4.1 Root Navigation Controller (`MainActivity`)
`MainActivity` hosts the primary `BottomNavigationView` rendering four persistent destination fragments:
1. **`HomeFragment` (হিসাব):**
   - **Header Card:** Displays real-time aggregate totals:
     - **মোট পাবো (Total Customer Due):** Emerald Green badge (`#047857` Light / `#10B981` Dark).
     - **মোট দেবো (Total Supplier Payable):** Crimson Red badge (`#DC2626` Light / `#F87171` Dark).
   - **Dual Segment Switcher:**
     - Tab 1: **কাস্টমার (Customers)** — Filters `account.type == 2`
     - Tab 2: **সাপ্লায়ার (Suppliers)** — Filters `account.type == 3`
   - **Account Directory List:** Displays contact name, phone, last transaction date, and net balance badge.
2. **`CashbookFragment` (ক্যাশবাক্স):** Cash drawer balance, daily in/out entries, cashbox closing tally.
3. **`WalletFragment` (তালীপে):** Digital QR, online collections, bank transfer.
4. **`ProfileFragment` (মেনু):** Multi-business selector, Reports, Tagada, Notes, Settings.

### 4.2 User Flow to `CreditEntryActivity`
Transactions can be initiated through two verified paths:
- **Path A (Direct from HomeFragment Quick Actions):**
  - Tapping on a Customer item in `HomeFragment` displays quick action buttons: **দিলাম** (Gave) and **পেলাম** (Got).
  - Tapping either button immediately creates an Intent targeting `CreditEntryActivity`.
- **Path B (From CustomerAccountActivity Ledger Detail):**
  - Tapping a Customer/Supplier row navigates to `CustomerAccountActivity` showing their transaction history ledger.
  - Floating Bottom Action Bar provides dual 3D buttons: **দিলাম (Credit)** and **পেলাম (Payment)**.

### 4.3 Intent Contract & Extras Bundle
The launching Intent is constructed with the following parcelable contract:
```kotlin
val intent = Intent(context, CreditEntryActivity::class.java).apply {
    putExtra("account", accountWithBalance) // Parcelable: id, name, contact, type, balance
    putExtra("currentAmount", 0.0)          // Optional prefilled transaction amount
    putExtra("manual_adjustment", dto)      // Optional: ManualAdjustmentDto for TallyPay Aday
}
```

### 4.4 `CreditEntryActivity` UI Components & Interaction Ergonomics
Inside `CreditEntryActivity.onCreate()`:
1. **Header Section:** Renders customer/supplier name, mobile contact, and current running balance.
2. **Dual-Segment Switcher:**
   - For Customer (`type == 2`):
     - **বাকি দিলাম (Credit Sale):** `txn_type = 3`
     - **টাকা পেলাম (Payment Collection):** `txn_type = 9`
   - For Supplier (`type == 3`):
     - **বাকি নিলাম (Credit Purchase):** `txn_type = 4`
     - **টাকা দিলাম (Supplier Payment):** `txn_type = 10`
3. **Amount Input Display:**
   - Prominent Bengali Taka symbol (`৳`).
   - Custom `AmountPasteGuardEditText` with input filtering preventing invalid characters or double decimals.
4. **Upfront Payment / Split Entry (`amount_received`):**
   - When entering a Credit Sale (**বাকি দিলাম**), an optional input field enables entering immediate cash paid by the customer on the spot.
   - Example: Total sale = ৳500 (`amount`), Cash paid now = ৳200 (`amount_received`).
5. **Date Selector:**
   - Defaults to local current date (`DateTimeUtil.getCurrentDate()`).
   - Opens Android `DatePickerDialog` on tap for backdated entries.
6. **Note / Description:**
   - Multi-line text field for item breakdown or invoice memo.
7. **Mode Toggle:**
   - Defaults to **নগদ (Cash - `txn_mode = 1`)**.
   - Selectable **ডিজিটাল (MFS/Wallet - `txn_mode = 2`)**.
8. **Confirmation Action & Hardware Back:**
   - Primary 3D tactile button triggers validation and integer-paisa conversion.
   - Native `onBackPressed` cleanly dismisses the activity without saving uncommitted drafts.

---

## 5. Accounting Semantics & Double-Entry Invariants

Reverse-engineered from `com.progoti.tallykhata.v2.arch.util.g->i`:

### 5.1 Amount vs. Amount Received Semantics
- `amount`: Total gross monetary value of the transaction.
- `amount_received`: The portion settled immediately via cash/digital mode during a credit transaction.
- **Net Customer Due Change Formula:**
  $$\Delta \text{CustomerDue} = \text{amount} - \text{amount\_received}$$
- **Net Cashbox Impact Formula:**
  $$\Delta \text{Cashbox} = +\text{amount\_received} \quad (\text{if } \text{txn\_mode} == 1)$$

### 5.2 General Ledger Double-Entry Rules
When a transaction is committed, two balanced accounting legs are generated:

#### Scenario 1: Credit Sale with Upfront Cash Settlement
*(Customer buys ৳500 groceries on credit, pays ৳200 cash immediately)*
- **Leg 1 (Gross Sale):**
  - **Debit:** `orig_account_id` (Customer Account) $\rightarrow$ `+500.00`
  - **Credit:** `_SALES` (System Account 3) $\rightarrow$ `+500.00`
- **Leg 2 (Cash Received):**
  - **Debit:** `_CASH` (System Account 1) $\rightarrow$ `+200.00`
  - **Credit:** `orig_account_id` (Customer Account) $\rightarrow$ `+200.00`
- **Net Balances:**
  - Customer Receivable increases by `৳300.00`.
  - Cashbox increases by `৳200.00`.
  - Total Sales Revenue increases by `৳500.00`.

#### Scenario 2: Credit Collection (Customer Pays Due)
*(Customer pays ৳300 cash towards previous due)*
- **Debit:** `_CASH` (System Account 1) $\rightarrow$ `+300.00`
- **Credit:** `orig_account_id` (Customer Account) $\rightarrow$ `+300.00`
- **Net Balances:**
  - Customer Receivable decreases by `৳300.00`.
  - Cashbox increases by `৳300.00`.

#### Scenario 3: Supplier Payment
*(Merchant pays ৳400 cash to supplier)*
- **Debit:** `orig_account_id` (Supplier Account) $\rightarrow$ `+400.00`
- **Credit:** `_CASH` (System Account 1) $\rightarrow$ `+400.00`
- **Net Balances:**
  - Supplier Payable decreases by `৳400.00`.
  - Cashbox decreases by `৳400.00`.

### 5.3 Cashbox Linkage & Cascade Deletion Invariants
1. **Cash Mode Invariant (`txn_mode === 1`):**
   - Automatically synchronizes with the cash drawer.
   - Customer payment received $\rightarrow$ Cash-In.
   - Supplier payment given $\rightarrow$ Cash-Out.
   - Pure credit entries (`amount_received === 0`) do not touch cashbox.
2. **Digital Mode Bypass (`txn_mode === 2` or `3`):**
   - Transactions settled via bKash/Nagad/TallyPay completely bypass physical cashbox.
   - Modifying a cash transaction to digital automatically purges any linked cashbox record.
3. **Cashbox Adjustment Cascade:**
   - `cashbox_adjustment` enforces `FOREIGN KEY(journal_id) REFERENCES journal(id) ON DELETE CASCADE`.
   - If a manual cash adjustment journal entry is deleted, its linked `cashbox_adjustment` row is atomically deleted by SQLite.

---

## 6. Verification Status & Test Suite Mapping

All Feature 001 architectural requirements are validated against automated test suites:
- **Database & Math Integrity:** `test_feature1_room_parity.js` (17/17 tests passing - 100%).
- **UI/UX & Credit Entry Ergonomics:** `test_feature1_dashboard_credit_entry.js` (19/19 tests passing - 100%).
- **Overall Parity:** 36 / 36 tests passing with zero regressions.
