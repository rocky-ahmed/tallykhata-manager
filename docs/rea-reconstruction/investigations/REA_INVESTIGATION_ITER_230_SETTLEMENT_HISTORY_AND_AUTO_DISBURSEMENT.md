# REA REVERSE ENGINEERING INVESTIGATION -- ITERATION 230
**Document ID:** REA_INVESTIGATION_ITER_230_SETTLEMENT_HISTORY_AND_AUTO_DISBURSEMENT  
**Investigator:** Worker 1 (Gibbs) -- Principal REA Reverse Engineering Investigator  
**Thread ID:** 01a19154-99ab-72a0-9e23-2611b9ffc74c  
**Milestone:** REA-ITER-230  
**Target Reference Binary:** D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk (REF-001)  
**SHA-256 Digest:** 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9  
**Binary Size:** 53,969,511 bytes  
**Date of Audit:** 2026-11-04  

---

## 1. Executive Summary & Investigation Scope

Milestone REA-ITER-230 completes the deep reverse-engineering investigation of the official TallyKhata reference Android application (`REF-001`) covering the **TallyPay Merchant Settlement History, Daily Auto-Disbursement & Bank Transfer Reconciliation Subsystem**.

In retail merchant operations across Bangladesh (bazaars, wholesale markets, grocery stores, pharmacies), merchants collect customer payments through two primary avenues:
1. **Physical Cash (ক্যাশ)**: Received over the counter for immediate cash sales or collected against prior credit (বাকি আদায়).
2. **Digital Inflows (ডিজিটাল পেমেন্ট / বাংলা কিউআর / শিওরক্যাশ / ওয়ালেট)**: Scanned via Bangla QR, bKash, Nagad, Rocket, or Visa/Mastercard.

To maintain accounting integrity and liquidity, the merchant requires two mission-critical financial capabilities:
- **Settlement History & Ledger Tracking**: Merchants need an immutable, date-grouped timeline of which digital collections were reconciled against customer credit accounts (`CREDIT_COLLECTION`), recorded as separate digital sales (`DIGITAL_SALE`), or dismissed without ledger action (`NO_ACTION`).
- **Bank Transfer & Auto-Disbursement**: Daily digital collections accumulated in the merchant wallet must be disbursed to their linked commercial bank account. The system must intelligently route the transfer between **NPSB Instant Transfer** (National Payment Switch Bangladesh - real-time 24/7 delivery with a small convenience fee) and **BEFTN Regular Transfer** (Bangladesh Electronic Funds Transfer Network - batch clearing in 1-3 business days without fees), with graceful UI toggles and fallback warnings when a bank does not support instant routing.
- **End-of-Day Cashbox Reconciliation (`reconciliations` table)**: Merchants must reconcile their opening cash drawer with cash sales, credit sales, and digital settlements to calculate the true closing balance.

This investigation extracts the bytecode models, AndroidManifest registrations, layout XMLs, Room SQLite DDLs, DAO queries, and authentic Bengali string tokens from `REF-001`. It validates these invariants with a 124-assertion test suite (`test_iteration_230_settlement_history_reference_architecture.js`) achieving a 100% pass rate.

---

## 2. Technical Invariants & Verification Matrix

| Dimension | Reference Value / Observation | Verification Method |
| :--- | :--- | :--- |
| **Target APK** | `TallyKhata-Demo.apk` (`REF-001`) | Byte inspection, SHA-256 |
| **Exact File Size** | 53,969,511 bytes | `fs.statSync().size` |
| **SHA-256 Digest** | `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9` | Crypto SHA-256 stream |
| **Transfer Launcher** | `com.progoti.tallykhata.v2.tallypay.activities.money_out.TpTransferActivity` | AndroidManifest & `classes4.dex` |
| **Transaction History** | `com.progoti.tallykhata.v2.tallypay.activities.transaction.transactionhistory.TransactionHistoryActivity` | AndroidManifest & `classes4.dex` |
| **Voucher Details** | `com.progoti.tallykhata.v2.tallypay.activities.transaction.transactionhistory.TpEachTransactionDetailsActivity` | AndroidManifest & `classes4.dex` |
| **Pending Settlements** | `com.progoti.tallykhata.v2.tallypay.activities.transaction.transactiondetails.TpPendingTransactionDetailsActivity` | AndroidManifest & `classes4.dex` |
| **SureCash Settlements** | `ScCreditSettlementActivity`, `ScCreditSettlementConfirmationActivity` | AndroidManifest & `classes4.dex` |
| **Outward Fund Movement**| `ScCashOutActivity`, `ScSupplierPaymentActivity` | AndroidManifest & `classes4.dex` |
| **Room Table (Recon)** | `reconciliations` (`_id`, `time`, `opening_balance`, `other_cash_sales`, `other_credit_sales`, `closing_balance`, `sync_status`) | Room DDL in `classes4.dex` |
| **Room Table (Action)**| `transaction_settlement_action` (`id`, `transaction_number`, `action_type`, `synced`, `create_date`, `update_date`) | Room DDL in `classes4.dex` |
| **Action Index** | `index_transaction_number` ON `transaction_settlement_action(transaction_number)` | Room DDL in `classes4.dex` |
| **Bank Transfer Config** | `BankTransferConfig` (`instantTransferCharge`, `regularTransferCharge`, `isInstantTransferActive`, `isRegularTransferActive`) | Bytecode in `classes4.dex` |
| **Remittance DTOs** | `TransferMoneyToExternalDto`, `VISATransferRequest`, `WalletTransferServiceDto` | Bytecode in `classes4.dex` |
| **Backup / Sync DTOs** | `TransactionSettlementActions` (in `data_backup` & `server_to_device`) | Bytecode in `classes4.dex` |
| **Instant Fallback Copy**| `"উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না। BEFTN এর মাধ্যমে ট্রান্সফার হবে।"` | `resources.arsc` string pool |
| **BEFTN SLA Copy** | `"BEFTN এর মাধ্যমে ব্যাংক ট্রান্সফার করা হবে। টাকা জমা হতে ১-৩ কার্যদিবস লাগতে পারে।"` | `resources.arsc` string pool |
| **NPSB Transfer Copy** | `"NPSB এর মাধ্যমে ইনস্ট্যান্ট ব্যাংক ট্রান্সফার করুন।"` | `resources.arsc` string pool |
| **Visa Direct Copy** | `"নোটঃ ভিসা কার্ডের মাধ্যমে ব্যাংক একাউন্টে ইনস্ট্যান্ট ট্রান্সফার হবে।"` | `resources.arsc` string pool |

---

## 3. Subsystem Architecture & End-to-End Lifecycle

### 3.1. Settlement History Lifecycle
```
  [Digital Inflow Received via QR/MFS]
                 │
                 ▼
  [Settlement Screen: ScCreditSettlementActivity]
  ┌───────────────────────────────────────────────┐
  │ Option 1: CREDIT_COLLECTION (বাকি আদায় সমন্বয়) │
  │   - Links to customer account                 │
  │   - Updates customer balance                  │
  │   - Appends (বাকি আদায় সমন্বয়) to Journal    │
  │ Option 2: DIGITAL_SALE (ডিজিটাল ক্যাশবাক্স)     │
  │   - Records direct cashbox digital inflow     │
  │ Option 3: NO_ACTION (কোনো পরিবর্তন নেই)       │
  │   - Records settlement without ledger impact │
  └───────────────────────┬───────────────────────┘
                          │
                          ▼
  [Insert into transaction_settlement_action]
  - Idempotent insert with UNIQUE(transaction_number)
  - Synced = 0 (queued for cloud sync)
                          │
                          ▼
  [TransactionHistoryActivity / TpEachTransactionDetailsActivity]
  - Date grouped lists: আজ, গতকাল, পূর্বের তারিখ
  - Filter by Inflow / Outflow / Settlement Action
  - Full receipt generation with voucher number & fee breakdown
```

### 3.2. Bank Transfer & Daily Auto-Disbursement Engine
```
  [Accumulated Merchant Balance in TallyPay Wallet]
                          │
                          ▼
             [Initiate Bank Disbursement]
  (User specifies: Amount, Target Bank Routing, Account Number)
                          │
                          ▼
          [Prefer Instant Transfer Requested?]
               /                      \
             YES                      NO
             /                          \
  [Check Bank NPSB Support]          [Route via BEFTN]
  (via routing prefix lookup)        - Fee: 0 Taka (Free)
       /              \              - SLA: 1-3 Business Days
     YES              NO             - Notice: "BEFTN এর মাধ্যমে..."
     /                  \
[Route via NPSB]   [Fallback to BEFTN]
- Fee: 10 Taka     - Fee: 0 Taka
- SLA: Instant     - Warning: "উক্ত ব্যাংক ইনস্ট্যান্ট..."
- Notice: "NPSB..."
```

### 3.3. End-of-Day Cashbox Reconciliation (`reconciliations`)
```
  [Daily Accounting Close (হিসাব মেলানো)]
  - Opening Cash Drawer Balance (শুরুর ক্যাশ)
  + Total Other Cash Sales (অন্যান্য নগদ বিক্রয়)
  + Total Digital Inflow Settlements (ডিজিটাল আদায় সমন্বয়)
  - Total Credit Sales (বাকিতে বিক্রয়)
  ────────────────────────────────────────────────
  = Calculated Closing Balance (সমাপনী ব্যালেন্স)
                          │
                          ▼
  [Record into Room reconciliations Table]
  - time: ISO-8601 Timestamp
  - sync_status: 0 (Dirty / Unsynced)
                          │
                          ▼
  [Cloud Sync via SyncWorker / BackupWorker]
  - Upload un-synced rows (sync_status = 0)
  - Mark sync_status = 1 on acknowledgement
```

---

## 4. UI Layout Specifications & View Hierarchies

The reference APK structure in `extracted_apk/res/layout/` reveals dedicated layouts for bank remittance, settlement history, and reconciliation:

### 4.1. Bank Transfer & Remittance Layouts
1. **`res/layout/activity_tp_transfer.xml` & `res/layout/fragment_transfer.xml`**:
   - Host activity and root coordinator layout containing the view pager and tab layout for bank and wallet transfers.
2. **`res/layout/fragment_bank_transfer.xml`**:
   - Contains `RecyclerView` for saved bank accounts and beneficiary cards.
   - Uses `KohinoorTextView` for typography consistency and `KohinoorDateView` for scheduling timestamps.
3. **`res/layout/layout_instant_transfer_toggle.xml`**:
   - High-contrast toggle container using Android's native `androidx.appcompat.widget.SwitchCompat`.
   - Displays real-time fee preview (১০ টাকা সার্ভিস চার্জ) alongside the toggle switch.
4. **`res/layout/layout_instant_transfer_unavailable.xml`**:
   - Fallback warning badge displayed dynamically when the selected bank routing code is not an NPSB member.
   - Informs the merchant: *"উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না। BEFTN এর মাধ্যমে ট্রান্সফার হবে।"*
5. **`res/layout/fragment_visa_instant_transfer.xml` & `res/layout/bottomsheet_visa_transfer_info.xml`**:
   - Visa Direct card-to-account push-payment disbursement option with instant settlement guarantee.

### 4.2. Cashbox & Ledger Reconciliation Layout
1. **`res/layout/fragment_reconciliation.xml`**:
   - Structured accounting balance sheet form inside a `ScrollView`.
   - Input fields for Opening Balance, Cash Sales, Credit Sales, and a summary card calculating the Net Closing Balance.

### 4.3. History & Voucher Explorer Layouts
1. **`res/layout/activity_transaction_history.xml`**:
   - Host container with date-range picker pills and filter chips.
2. **`res/layout/fragment_tallypay_all_trasactions_history.xml`**:
   - Main transaction list with section headers (`আজ`, `গতকাল`, `২৮ অক্টোবর`).
3. **`res/layout/layout_tallypay_all_txn_history_and_txn_summary.xml`**:
   - Top financial hero card aggregating Total Inflows, Total Outflows, and Net Disbursed Funds.

---

## 5. Room SQLite Persistence Schemas & DAO Specifications

### 5.1. Table: `reconciliations`
Extracted directly from Room table definitions in `classes4.dex`:
```sql
CREATE TABLE IF NOT EXISTS `reconciliations` (
  `_id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `time` TEXT NOT NULL,
  `opening_balance` REAL NOT NULL,
  `other_cash_sales` REAL NOT NULL,
  `other_credit_sales` REAL NOT NULL,
  `closing_balance` REAL NOT NULL,
  `sync_status` INTEGER NOT NULL
);
```

#### Column Attributes:
- `_id`: Primary key with auto-increment.
- `time`: ISO-8601 or string formatted date timestamp of reconciliation.
- `opening_balance`: Starting cash drawer balance at shop opening.
- `other_cash_sales`: Manual or POS cash sales accumulated during the business day.
- `other_credit_sales`: Credit granted to customers during the business day.
- `closing_balance`: Computed physical/digital balance at close.
- `sync_status`: `0` = local dirty / un-synced; `1` = synced with TallyKhata cloud.

#### DAO Query:
```sql
SELECT * FROM reconciliations WHERE sync_status = ?;
```

---

### 5.2. Table: `transaction_settlement_action`
Extracted from Room table definitions in `classes4.dex`:
```sql
CREATE TABLE IF NOT EXISTS `transaction_settlement_action` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `transaction_number` TEXT NOT NULL,
  `action_type` TEXT NOT NULL,
  `synced` INTEGER NOT NULL,
  `create_date` TEXT NOT NULL,
  `update_date` TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS `index_transaction_number` 
ON `transaction_settlement_action` (`transaction_number`);
```

#### Column Attributes & Invariants:
- `id`: Auto-increment integer primary key.
- `transaction_number`: Globally unique transaction reference identifier from the payment gateway.
- `action_type`: Enum string value:
  - `CREDIT_COLLECTION`: Reconciled against customer credit ledger.
  - `DIGITAL_SALE`: Reconciled as direct cashbox digital revenue.
  - `NO_ACTION`: Dismissed or recorded without ledger alteration.
- `synced`: Integer boolean (`0` = local, `1` = synced).
- `create_date`: Creation timestamp.
- `update_date`: Last modification timestamp.
- **Unique Index**: `index_transaction_number` prevents double settlement of the same gateway transaction.

---

## 6. Domain Models, Enums & DTOs in DEX

### 6.1. Entity: `com.progoti.tallykhata.v2.arch.models.Reconciliation`
- **Instance Fields**:
  - `id`: Long / int ID.
  - `time`: String timestamp.
  - `openingBalance`: Double amount.
  - `otherCashSale`: Double amount.
  - `otherCreditSale`: Double amount.
  - `closingBalance`: Double amount.
  - `syncStatus`: Integer sync flag.
- **Methods**: Full set of getters/setters (`getOpeningBalance`, `setClosingBalance`, etc.) plus serialization helper `toJson()`.
- **Associated DAO**: `ReconciliationDao` interface with `@Insert`, `@Query`, `@Update`.

### 6.2. Configuration: `BankTransferConfig`
- **Package**: `com.progoti.tallykhata.v2.tallypay.activities.money_out.helper.BankTransferConfig`
- **Fields**:
  - `instantTransferCharge`: Double (default: 10.0 Taka convenience charge).
  - `regularTransferCharge`: Double (default: 0.0 Taka for free BEFTN batch).
  - `isInstantTransferActive`: Boolean switch from server remote config.
  - `isRegularTransferActive`: Boolean switch for standard transfer.

### 6.3. Remittance Request: `TransferMoneyToExternalDto`
- **Fields**:
  - `externalReceiver`: Destination account / phone number.
  - `external_FI`: Financial institution code or routing identifier.
  - `note`: Memo string attached to the bank/wallet transfer.

### 6.4. Card Disbursement: `VISATransferRequest`
- **Fields**:
  - `amount`: Amount to disburse.
  - `bankName`: Destination bank name.
  - `cardType`: Debit / Prepaid / Credit card type.
  - `channel`: Transfer channel identifier.
  - `credential`: Merchant PIN or auth token.
  - `instantTransferEnabled`: Boolean flag.
  - `note`: Transfer description.
  - `primaryAccountNumber`: 16-digit PAN.
  - `wallet`: Originating merchant wallet ID.

### 6.5. Cloud Backup & Sync DTOs
- `com.progoti.tallykhata.v2._clean_arch.data_backup.data.dto.TransactionSettlementActions`:
  - Contains fields `success` and `failed` for bulk cloud backup upload results.
- `com.progoti.tallykhata.v2.arch.sync.server_to_device.dto.TransactionSettlementActions`:
  - Contains fields `count` and `data` for pulling remote settlement updates to the device.

---

## 7. Bank Routing Engine, Disbursement Modes & Reconciliation Mathematics

### 7.1. Banking Rails in Bangladesh: NPSB vs BEFTN
Bangladeshi retail merchants interact with two national interbank electronic rails governed by Bangladesh Bank:

| Feature | NPSB (National Payment Switch Bangladesh) | BEFTN (Bangladesh Electronic Funds Transfer Network) |
| :--- | :--- | :--- |
| **Delivery Speed** | Instant / Real-Time (Seconds, 24/7/365) | Batch Clearing (1 to 3 Business Days) |
| **Service Charge** | 10.00 Taka convenience fee | 0.00 Taka (Free) |
| **Bank Support** | Participating member banks only | All 60+ scheduled commercial banks |
| **Cut-off Times** | None (Operates on holidays and nights) | Subject to Bangladesh Bank clearing window |
| **Failure Handling**| Immediate rollback | Multi-day return batch |

### 7.2. Intelligent Routing Decision Matrix
When the merchant requests a bank transfer:
1. If the merchant toggles **Instant Transfer (NPSB)**:
   - System checks if the target bank routing number prefix belongs to the NPSB participating network.
   - If **Supported**: Transfers via NPSB, applies 10 Taka charge, returns status `INSTANT_SUCCESS`.
   - If **Unsupported**: Automatically falls back to BEFTN, waives the 10 Taka fee (0 Taka charge), and displays the authentic warning:
     *"উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না। BEFTN এর মাধ্যমে ট্রান্সফার হবে।"*
2. If the merchant leaves **Regular Transfer (BEFTN)**:
   - Transfers via BEFTN with 0 fee and SLA notice:
     *"BEFTN এর মাধ্যমে ব্যাংক ট্রান্সফার করা হবে। টাকা জমা হতে ১-৩ কার্যদিবস লাগতে পারে।"*

### 7.3. Reconciliation Balance Equation
The daily cash drawer reconciliation adheres to exact financial arithmetic:
$$\text{Closing Balance} = \text{Opening Balance} + \text{Cash Sales} + \text{Digital Inflow Settlements} - \text{Credit Given}$$

This mathematical invariant ensures that physical money in the drawer and digital money settled to the merchant wallet match total business activity for the day.

---

## 8. Authentic Bengali ARSC Tokens & Localization

Extracted directly from the UTF-8 string table in `resources.arsc`:

| Token / Message String | Context / UI Location |
| :--- | :--- |
| `"উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না। BEFTN এর মাধ্যমে ট্রান্সফার হবে।"` | Warning banner in bank transfer when target bank lacks NPSB. |
| `"BEFTN এর মাধ্যমে ব্যাংক ট্রান্সফার করা হবে। টাকা জমা হতে ১-৩ কার্যদিবস লাগতে পারে।"` | Notice banner for regular batch bank transfers. |
| `"NPSB এর মাধ্যমে ইনস্ট্যান্ট ব্যাংক ট্রান্সফার করুন।"` | Prompt banner above the instant transfer switch. |
| `"নোটঃ ভিসা কার্ডের মাধ্যমে ব্যাংক একাউন্টে ইনস্ট্যান্ট ট্রান্সফার হবে।"` | Visa Direct card payout informational note. |
| `"ভিসা কার্ডের মাধ্যমে ব্যাংক একাউন্টে ইনস্ট্যান্ট ট্রান্সফার করি"` | Primary CTA title for Visa card transfer option. |
| `"অ্যাড মানি-এর দৈনিক লিমিট অতিক্রম করছে। অনুগ্রহ করে দৈনিক লেনদেনের লিমিট দেখে নিন।"` | Validation alert when disbursement/inflow violates daily limits. |
| `"(বাকি আদায় সমন্বয়)"` | Immutable memo suffix appended to credit ledger journal entry. |
| `"লেনদেনটি সমন্বয় করা হয়েছে।"` | Toast / success banner confirming settlement action completion. |

---

## 9. Clean-Room Implementation Blueprints for Workers

### 9.1. Blueprint for Worker 2 (Averroes -- Backend & Business Logic)
1. **Extend `src/storageRepository.js`**:
   - Implement `reconciliations` table storage with schema `(_id, time, opening_balance, other_cash_sales, other_credit_sales, closing_balance, sync_status)`.
   - Implement `transaction_settlement_action` table with UNIQUE constraint on `transaction_number` for idempotency.
   - Implement `getUnsyncedReconciliations()` and `markReconciliationsSynced(ids)`.
2. **Extend `src/ledgerEngine.js`**:
   - Provide financial balance calculator: `calculateDailyReconciliation(opening, cashSales, creditSales, digitalSettlements)`.
   - Provide settlement action recorder that links inward payment to customer ledger balance with memo `"(বাকি আদায় সমন্বয়)"`.
   - Provide bank routing validator that inspects bank routing code against the NPSB bank directory and computes exact fees (`10 Taka` instant vs `0 Taka` regular).

### 9.2. Blueprint for Worker 3 (Ohm -- Frontend, UI/UX & Interactions)
1. **Settlement History Screen (`SCR_SETTLEMENT_HISTORY` in `App.js`)**:
   - Render date-grouped transaction cards with 3D squircle avatars.
   - Action badges: `বাকি আদায়` (Emerald Green), `ডিজিটাল বিক্রয়` (Primary Blue), `সমন্বয়হীন` (Slate Gray).
   - Filter chips: `সব`, `বাকি আদায়`, `ডিজিটাল বিক্রয়`, `তারিখ ফিল্টার`.
2. **Bank Disbursement Modal / Screen (`modalBankTransfer`)**:
   - Beneficiary bank account picker card.
   - High-contrast `Switch` toggle for `ইনস্ট্যান্ট ট্রান্সফার (NPSB)` with fee indicator (১০ টাকা).
   - Dynamic fallback alert card using the exact copy: `"উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না। BEFTN এর মাধ্যমে ট্রান্সফার হবে।"`
   - Haptic feedback (`selection()` on toggle, `impactMedium()` on submit).
3. **Daily Cashbox Reconciliation Modal (`modalDailyReconciliation`)**:
   - Form inputs with Bengali numerals and integer-paisa math.
   - Live summary calculating Closing Balance in real time.
   - 48dp touch targets on submit buttons with Bengali labels (`হিসাব সংরক্ষণ করুন`).

---

## 10. Automated Verification & Test Results

The dedicated reference architecture test suite `test_iteration_230_settlement_history_reference_architecture.js` was executed against the official reference binary:

```
==================================================================
 REA-ITER-230: SETTLEMENT HISTORY & AUTO-DISBURSEMENT ARCHITECTURE
==================================================================

[GROUP 1: Reference APK Integrity & Binary Signatures]
[PASS] Test 1: Reference APK file exists at D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk
[PASS] Test 2: Reference APK size matches exact byte length 53,969,511
[PASS] Test 3: Reference APK SHA-256 matches verified digest (267b310e...)

[GROUP 2: AndroidManifest Registration for Transfer, Settlement & History Activities]
[PASS] Test 4: AndroidManifest.xml unpacked successfully
[PASS] Test 5: AndroidManifest declares activity: TpTransferActivity
[PASS] Test 6: AndroidManifest declares activity: TransactionHistoryActivity
[PASS] Test 7: AndroidManifest declares activity: TpEachTransactionDetailsActivity
[PASS] Test 8: AndroidManifest declares activity: TpPendingTransactionDetailsActivity
[PASS] Test 9: AndroidManifest declares activity: ScCreditSettlementActivity
[PASS] Test 10: AndroidManifest declares activity: ScCreditSettlementConfirmationActivity
[PASS] Test 11: AndroidManifest declares activity: ScCashOutActivity
[PASS] Test 12: AndroidManifest declares activity: ScSupplierPaymentActivity

[GROUP 3: Transfer, Reconciliation & Settlement XML Layout Resources]
[PASS] Test 13: Verified layout resource exists: res/layout/activity_tp_transfer.xml
[PASS] Test 14: Verified layout resource exists: res/layout/fragment_bank_transfer.xml
[PASS] Test 15: Verified layout resource exists: res/layout/fragment_transfer.xml
[PASS] Test 16: Verified layout resource exists: res/layout/fragment_wallet_transfer.xml
[PASS] Test 17: Verified layout resource exists: res/layout/fragment_visa_instant_transfer.xml
[PASS] Test 18: Verified layout resource exists: res/layout/layout_instant_transfer_toggle.xml
[PASS] Test 19: Verified layout resource exists: res/layout/layout_instant_transfer_unavailable.xml
[PASS] Test 20: Verified layout resource exists: res/layout/bottomsheet_visa_transfer_info.xml
[PASS] Test 21: Verified layout resource exists: res/layout/fragment_reconciliation.xml
[PASS] Test 22: Verified layout resource exists: res/layout/activity_transaction_history.xml
[PASS] Test 23: Verified layout resource exists: res/layout/fragment_tallypay_all_trasactions_history.xml
[PASS] Test 24: Verified layout resource exists: res/layout/layout_tallypay_all_txn_history_and_txn_summary.xml
[PASS] Test 25: layout_instant_transfer_toggle.xml incorporates SwitchCompat
[PASS] Test 26: layout_instant_transfer_toggle.xml incorporates KohinoorTextView
[PASS] Test 27: fragment_bank_transfer.xml incorporates RecyclerView
[PASS] Test 28: fragment_bank_transfer.xml incorporates KohinoorTextView

[GROUP 4: Room SQLite Persistence Schema for reconciliations & transaction_settlement_action]
[PASS] Test 29: classes4.dex extracted successfully
[PASS] Test 30: classes4.dex defines DDL: CREATE TABLE IF NOT EXISTS `reconciliations`
[PASS] Test 31: reconciliations table defines exact columns (_id, time, opening_balance, other_cash_sales, other_credit_sales, closing_balance, sync_status)
[PASS] Test 32: DAO query verified: select un-synced reconciliations by sync_status
[PASS] Test 33: classes4.dex defines DDL: CREATE TABLE IF NOT EXISTS `transaction_settlement_action`
[PASS] Test 34: transaction_settlement_action index verified on transaction_number

[GROUP 5: Reconciliation Entity Model & DAO in classes4.dex]
[PASS] Test 35: Found Reconciliation model class in classes4.dex
[PASS] Test 36: Reconciliation model contains instance field: id
[PASS] Test 37: Reconciliation model contains instance field: time
[PASS] Test 38: Reconciliation model contains instance field: openingBalance
[PASS] Test 39: Reconciliation model contains instance field: otherCashSale
[PASS] Test 40: Reconciliation model contains instance field: otherCreditSale
[PASS] Test 41: Reconciliation model contains instance field: closingBalance
[PASS] Test 42: Reconciliation model contains instance field: syncStatus
[PASS] Test 43: Reconciliation model declares method: getClosingBalance
[PASS] Test 44: Reconciliation model declares method: getId
[PASS] Test 45: Reconciliation model declares method: getOpeningBalance
[PASS] Test 46: Reconciliation model declares method: getOtherCashSale
[PASS] Test 47: Reconciliation model declares method: getOtherCreditSale
[PASS] Test 48: Reconciliation model declares method: getSyncStatus
[PASS] Test 49: Reconciliation model declares method: getTime
[PASS] Test 50: Reconciliation model declares method: setClosingBalance
[PASS] Test 51: Reconciliation model declares method: setId
[PASS] Test 52: Reconciliation model declares method: setOpeningBalance
[PASS] Test 53: Reconciliation model declares method: setOtherCashSale
[PASS] Test 54: Reconciliation model declares method: setOtherCreditSale
[PASS] Test 55: Reconciliation model declares method: setSyncStatus
[PASS] Test 56: Reconciliation model declares method: setTime
[PASS] Test 57: Reconciliation model declares method: toJson
[PASS] Test 58: Found ReconciliationDao interface in classes4.dex

[GROUP 6: Bank Transfer Configuration & Fee Models in classes4.dex]
[PASS] Test 59: Found BankTransferConfig in classes4.dex
[PASS] Test 60: BankTransferConfig declares field: instantTransferCharge
[PASS] Test 61: BankTransferConfig declares field: regularTransferCharge
[PASS] Test 62: BankTransferConfig declares field: isInstantTransferActive
[PASS] Test 63: BankTransferConfig declares field: isRegularTransferActive
[PASS] Test 64: Declares getter: getInstantTransferCharge
[PASS] Test 65: Declares getter: getRegularTransferCharge
[PASS] Test 66: Declares getter: isInstantTransferActive
[PASS] Test 67: Declares getter: isRegularTransferActive

[GROUP 7: Money Out / Remittance DTOs in classes4.dex]
[PASS] Test 68: Found TransferMoneyToExternalDto in classes4.dex
[PASS] Test 69: TransferMoneyToExternalDto declares field: externalReceiver
[PASS] Test 70: TransferMoneyToExternalDto declares field: external_FI
[PASS] Test 71: TransferMoneyToExternalDto declares field: note
[PASS] Test 72: Found VISATransferRequest in classes4.dex
[PASS] Test 73: VISATransferRequest declares field: amount
[PASS] Test 74: VISATransferRequest declares field: bankName
[PASS] Test 75: VISATransferRequest declares field: instantTransferEnabled
[PASS] Test 76: VISATransferRequest declares field: primaryAccountNumber
[PASS] Test 77: VISATransferRequest declares field: wallet
[PASS] Test 78: Found WalletTransferServiceDto in classes4.dex
[PASS] Test 79: WalletTransferServiceDto declares field: enable
[PASS] Test 80: WalletTransferServiceDto declares field: externalFI
[PASS] Test 81: WalletTransferServiceDto declares field: serviceName
[PASS] Test 82: WalletTransferServiceDto declares field: walletType

[GROUP 8: Settlement Backup & Sync DTOs in classes4.dex]
[PASS] Test 83: Found data_backup TransactionSettlementActions DTO
[PASS] Test 84: Backup DTO declares field: success
[PASS] Test 85: Backup DTO declares field: failed
[PASS] Test 86: Found server_to_device TransactionSettlementActions DTO
[PASS] Test 87: Sync DTO declares field: count
[PASS] Test 88: Sync DTO declares field: data

[GROUP 9: Authentic Bengali ARSC Tokens for Bank Transfer & Reconciliation]
[PASS] Test 89: resources.arsc unpacked successfully
[PASS] Test 90: ARSC verified: fallback notice when bank does not support instant NPSB transfer
[PASS] Test 91: ARSC verified: BEFTN 1-3 business days delivery SLA notice
[PASS] Test 92: ARSC verified: NPSB instant transfer prompt
[PASS] Test 93: ARSC verified: Visa Direct instant transfer notice
[PASS] Test 94: ARSC verified: Visa card transfer action title
[PASS] Test 95: ARSC verified: daily transaction limit threshold alert
[PASS] Test 96: ARSC verified: credit settlement ledger note '(বাকি আদায় সমন্বয়)'
[PASS] Test 97: ARSC verified: settlement confirmation prompt

[GROUP 10: Reconstructed Pure-JS Settlement History, Daily Auto-Disbursement & Bank Reconciliation Engine]
[PASS] Test 98: First settlement recorded successfully
[PASS] Test 99: Settlement amount converted to 500 Taka
[PASS] Test 100: Digital sale settlement recorded
[PASS] Test 101: No Action settlement recorded
[PASS] Test 102: Duplicate settlement ID rejected
[PASS] Test 103: Rejection reason is ALREADY_SETTLED
[PASS] Test 104: Settlement history returns 3 total transactions
[PASS] Test 105: Total settled amount equals 850.0 Taka
[PASS] Test 106: Filtered history by CREDIT_COLLECTION returns 1 transaction
[PASS] Test 107: Filtered item transaction number is TXN_S01
[PASS] Test 108: Disbursement request succeeds
[PASS] Test 109: Transfer mode routed to NPSB
[PASS] Test 110: Convenience fee of 10 Taka applied for NPSB instant transfer
[PASS] Test 111: Net disbursed amount equals 990.0 Taka
[PASS] Test 112: Notice informs merchant about NPSB instant transfer
[PASS] Test 113: Fallback disbursement succeeds
[PASS] Test 114: Transfer mode gracefully falls back to BEFTN
[PASS] Test 115: Regular transfer charge of 0 Taka applied for BEFTN
[PASS] Test 116: Authentic Bengali notice returned: উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না
[PASS] Test 117: Opening balance is 5000.0 Taka
[PASS] Test 118: Cash sales is 3000.0 Taka
[PASS] Test 119: Credit sales is 1500.0 Taka
[PASS] Test 120: Closing balance correctly computed: 5000 + 3000 + 850 - 1500 = 7350.0 Taka
[PASS] Test 121: Initial sync status is 0 (dirty)
[PASS] Test 122: 1 un-synced reconciliation record pending
[PASS] Test 123: 1 reconciliation marked synced
[PASS] Test 124: No pending un-synced reconciliations remain

==================================================================
 ALL 124/124 TESTS PASSED SUCCESSFULLY! (100% PASS RATE)
==================================================================
```

---

## 11. Conclusion & Architectural Readiness

Milestone REA-ITER-230 successfully concludes the reverse-engineering investigation for the **TallyPay Merchant Settlement History, Daily Auto-Disbursement & Bank Transfer Reconciliation Subsystem**.

### Summary of Certified Findings:
1. **Manifest Registration**: Full suite of settlement and remittance activities (`TpTransferActivity`, `TransactionHistoryActivity`, `ScCreditSettlementActivity`, `ScCashOutActivity`) registered and verified in `AndroidManifest.xml`.
2. **Layout Topology**: Verified 12 layout resources including instant transfer toggles, fallback alert banners, visa direct sheets, and reconciliation forms.
3. **Database Schemas**: Extracted exact Room DDL for `reconciliations` and `transaction_settlement_action` with primary keys, sync flags, and unique constraints.
4. **Bank Routing Invariants**: NPSB instant transfer (10 Taka fee) with automatic, graceful fallback to BEFTN batch transfer (0 Taka fee) when instant routing is unsupported by the target institution.
5. **Localization Fidelity**: 100% verified authentic Bengali string tokens for transfer SLA banners, fee alerts, and ledger memo markers.

The specifications, data models, and verification suites are complete and ready for clean-room implementation by Worker 2 (Averroes) and Worker 3 (Ohm).