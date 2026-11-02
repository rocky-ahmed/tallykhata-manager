# REA RECONSTRUCTION — REFERENCE DATA MODEL
**Target Application:** `TallyKhata-Demo.apk` (`REF-001`)  
**Maintained by:** Main Engineering Orchestrator  
**Status:** FULLY REVERSE-ENGINEERED & SPECIFIED  

---

## 1. Room SQLite Database Schema (Compiled DDL in `classes4.dex`)

### 1.1 `account` Table
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

### 1.2 `journal` Table
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

### 1.3 `business` Table
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

### 1.4 `cashbox_adjustment` Table
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

## 2. TKEnum Bytecode Mappings (`classes4.dex`)

- **`TKEnum$TransactionType` (`txn_type`):**
  - `1`: CASH_SALE (নগদ বিক্রি)
  - `2`: CASH_PURCHASE (নগদ ক্রয়)
  - `3`: CREDIT_SALE (বাকি বিক্রি / কাস্টমারকে দিলাম)
  - `4`: CREDIT_PURCHASE (বাকি ক্রয় / মহাজন থেকে পেলাম)
  - `5`: CASH_EXPENSE (দোকানের খরচ)
  - `6`: MALIK_NILO (মালিক নিলো / Drawings)
  - `7`: MALIK_DILO (মালিক দিলো / Capital)
  - `8`: CASH_ADJUST (ক্যাশবাক্স সমন্বয়)
  - `9`: CREDIT_COLLECTION (বাকি আদায় / কাস্টমার থেকে পেলাম)
  - `10`: SUPPLIER_PAYMENT (মহাজনকে দিলাম)
  - `11`: DIGITAL_SALE (ডিজিটাল বিক্রি)

- **`TKEnum$TransactionMode` (`txn_mode`):**
  - `1`: CASH (Physical Drawer)
  - `2`: MFS (Mobile Banking: bKash, Nagad, Rocket)
  - `3`: WALLET (TallyPay Merchant Wallet)

- **`TKEnum$AccountType` (`type` in `account`):**
  - `1`: SYSTEM (General Ledger Accounts)
  - `2`: CUSTOMER (Customer Directory)
  - `3`: SUPPLIER (Supplier Directory)

---

## 3. Dual-Schema Normalization Mapping

| Room DB Reference Field | Reconstructed Engine Field | Normalization Invariant |
| :--- | :--- | :--- |
| `orig_account_id` | `accountId` | Converted to string key, composite-indexed with `businessId` |
| `txn_type` | `type` | For Customer: `3` $\rightarrow$ `given`, `9` $\rightarrow$ `received`. For Supplier: `4` $\rightarrow$ `received`, `10` $\rightarrow$ `given` |
| `amount` | `amount` | Normalized to integer paisa: `round(v * 100) / 100` |
| `amount_received` | `amountReceived` | Upfront cash settlement portion recorded in same entry |
| `txn_mode` | `isDigital` / `mode` | `1` $\rightarrow$ Cash (`isDigital: false`), `2` $\rightarrow$ Digital (`isDigital: true`) |
| `txn_date` | `date` | Standard ISO-8601 string (`YYYY-MM-DDTHH:mm:ss.sssZ`) |
| `business_id` | `businessId` | Multi-tenant tenant identifier |
