# REA RECONSTRUCTION — FEATURE 002 SPECIFICATION
**Feature Name:** Cashbox (Galla), Daily Cash Flow & Cash Reconciliation  
**Reference Target:** `TallyKhata-Demo.apk` (`REF-001`)  
**Target SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Document Version:** 1.0.0  
**Status:** SPECIFICATION APPROVED  

---

## 1. Executive Summary & REA Evidence Basis
Feature 002 reconstructs the digital cash drawer (ক্যাশবাক্স / Cashbox) used by Bangladeshi merchants to monitor physical cash in hand, daily sales, operational expenses, customer cash collections, supplier payments, and physical cash counting / reconciliation.

### Authoritative REA Evidence (`classes4.dex`):
- **Reference Activities (`com.progoti.tallykhata.v2.cashbox`):**
  - `CashAdjustmentActivity`: Cash reconciliation entry
  - `CashAdjustmentConfirmationEvenActivity`: Discrepancy = 0 (হিসাব মিলে গেছে)
  - `CashAdjustmentConfirmationPositiveActivity`: Discrepancy > 0 (ক্যাশে বেশি / উদ্বৃত্ত)
  - `CashAdjustmentConfirmationNegativeActivity`: Discrepancy < 0 (ক্যাশে কম / ঘাটতি)
  - `CashAdjustmentSuccessPositiveActivity`: Confirmation dialog & commit
  - `CashBoxTodayActivity`: Daily cash metrics dashboard
  - `CashSellActivity`: Quick cash sale entry
  - `PreviousDayCashAdjustmentActivity`: Previous day cash reconciliation
- **Reference Room DB Tables (`classes4.dex`):**
  - `reconciliations`
  - `closing_balance`
  - `opening_balance`
  - `cash_sales`
  - `costs`
  - `cashbox_adjustment`

---

## 2. Room Database Schema Alignment

### 2.1 `reconciliations` Table
```sql
CREATE TABLE IF NOT EXISTS reconciliations (
  _id INTEGER PRIMARY KEY AUTOINCREMENT,
  time TEXT NOT NULL,
  opening_balance REAL NOT NULL,
  other_cash_sales REAL NOT NULL,
  other_credit_sales REAL NOT NULL,
  closing_balance REAL NOT NULL,
  sync_status INTEGER NOT NULL
);
```

### 2.2 `closing_balance` & `opening_balance` Tables
```sql
CREATE TABLE IF NOT EXISTS closing_balance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  closing_date TEXT NOT NULL,
  balance_generation_time TEXT NOT NULL,
  sync_status INTEGER NOT NULL,
  is_updated INTEGER NOT NULL DEFAULT 0,
  last_update_date TEXT,
  business_id INTEGER,
  FOREIGN KEY(business_id) REFERENCES business(id)
);

CREATE TABLE IF NOT EXISTS opening_balance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  input_date TEXT NOT NULL,
  sync_status INTEGER NOT NULL
);
```

### 2.3 `cashbox_adjustment` Table
```sql
CREATE TABLE IF NOT EXISTS cashbox_adjustment (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  journal_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  synced INTEGER NOT NULL,
  create_date TEXT NOT NULL,
  update_date TEXT,
  FOREIGN KEY(journal_id) REFERENCES journal(id) ON UPDATE NO ACTION ON DELETE CASCADE
);
```

---

## 3. Financial Mechanics & Reconciliation Logic

### 3.1 Integer Paisa Arithmetic
All cash amounts are computed in integer paisa ($1\text{ Taka} = 100\text{ Paisa}$) to prevent floating-point accumulation:
```javascript
const amtPaisa = Math.round(Number(amount) * 100);
```

### 3.2 Expected Cash Calculation
$$\text{Expected Cash} = \text{Opening Balance} + \sum(\text{Cash In}) - \sum(\text{Cash Out})$$
Where:
- **Cash In:**
  - Cash Sales (নগদ বিক্রি / `category === 'sale'`)
  - Customer Cash Collections (বাকি আদায় / `category === 'baki_aday'`)
  - Capital Added (মালিক জমা / `category === 'malik_in'`)
- **Cash Out:**
  - Shop Expenses (দোকান খরচ / `category === 'cost'`)
  - Cash Purchases (নগদ কেনা / `category === 'buy'`)
  - Supplier Cash Payments (মহাজন পরিশোধ / `category === 'supplier_pay'`)
  - Owner Withdrawal (মালিক উত্তোলন / `category === 'malik_out'`)

### 3.3 Physical Reconciliation & Discrepancy Tri-State
When merchant counts physical currency:
$$\text{Discrepancy} = \text{Counted Physical Cash} - \text{Expected Cash}$$
1. **Even (হিসাব নিখুঁত):** $\text{Discrepancy} = 0$. Zero adjustment needed.
2. **Positive / Surplus (ক্যাশে বেশি):** $\text{Discrepancy} > 0$. An adjustment entry is logged with type `in` (`category === 'reconciliation_surplus'`).
3. **Negative / Deficit (ক্যাশে কম):** $\text{Discrepancy} < 0$. An adjustment entry is logged with type `out` (`category === 'reconciliation_deficit'`).

### 3.4 Currency Denomination Counter
Reconciliation screen supports Bangladeshi Taka banknotes:
- ৳১০০০, ৳৫০০, ৳২০০, ৳১০০, ৳৫০, ৳২০, ৳১০, ৳৫, ৳২, ৳১.

---

## 4. Multi-Tenant Business Isolation
Cashbox summaries (`deriveCashBoxSummary`) and cash entries are strictly scoped to the active `businessId`. Switching businesses preserves zero cross-business contamination.
