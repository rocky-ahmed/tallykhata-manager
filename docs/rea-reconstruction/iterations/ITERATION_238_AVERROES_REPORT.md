# TALLYKHATA RECONSTRUCTION — ITERATION 238 BACKEND REPORT
**Worker:** Worker 2: Averroes / Peirce (Permanent Backend Developer & Business Logic Architect)  
**Registered Thread ID:** `01a1a349-61ae-74d0-aed6-1792e7d1d594`  
**Milestone:** REA-ITER-238 (TallyPay Merchant QR Standee Order & POS Soundbox Collateral Delivery Subsystem Backend)  
**Date:** 2026-11-05  
**Status:** **100% COMPLETE & VERIFIED** (67/67 Backend Tests Passing, 145/145 Reference Architecture Tests Passing, Zero Regressions Across Iterations 229–238)

---

## 1. Executive Summary

In Milestone **REA-ITER-238**, Worker 2 (Averroes / Peirce) designed, implemented, and verified the complete backend data architecture, Room SQLite storage layer, financial arithmetic engine, delivery address validation rules, and fulfillment finite state machine (FSM) for:

1. **Room SQLite Persistence for `merchant_qr_order`:**
   - 23-column Room SQLite table schema `merchant_qr_order` with unique index `index_merchant_qr_order_order_id` on `order_id`.
   - Full-featured in-memory DAO (`MerchantQrOrderDao`): auto-increment primary key assignment, multi-parameter querying by `business_id`, `order_status`, `item_type`, pagination (`offset` and `limit`), and sync lifecycle tracking.
2. **Standee & Collateral Material Catalog & Enums:**
   - Enums: `QR_ORDER_STATUSES` (`PLACED`, `CONFIRMED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`), `QR_PAYMENT_METHODS` (`WALLET`, `CASH_ON_DELIVERY`, `ONLINE_GATEWAY`), and `QR_PAYMENT_STATUSES` (`PAID`, `PENDING`, `FAILED`, `REFUNDED`).
   - 5 collateral items with exact integer paisa pricing:
     1. `ACRYLIC_STANDEE`: ৳250 (25,000 paisa) — *"অ্যাক্রিলিক কিউআর স্ট্যান্ড"*
     2. `WOODEN_STANDEE`: ৳350 (35,000 paisa) — *"কাঠের কিউআর স্ট্যান্ড"*
     3. `METAL_STANDEE`: ৳500 (50,000 paisa) — *"মেটাল কিউআর স্ট্যান্ড"*
     4. `COUNTER_STICKER`: ৳50 (5,000 paisa) — *"কাউন্টার কিউআর স্টিকার"*
     5. `SOUNDBOX_STAND`: ৳400 (40,000 paisa) — *"সাউন্ডবক্স স্ট্যান্ড"*
   - Full mapping of all 8 administrative divisions of Bangladesh (`BANGLADESH_DIVISIONS` and `BANGLADESH_DIVISION_ALIASES`) in English and Bengali.
   - Authentic Bengali copy extracted from `resources.arsc` (`QR_ORDER_ARSC_TOKENS`).
3. **Financial Arithmetic & Pricing Engine (`calculateQrOrderPricing`):**
   - Inside Dhaka (`division` or `district` matching Dhaka): 6,000 paisa (৳60).
   - Outside Dhaka: 12,000 paisa (৳120).
   - Free delivery threshold: Orders with subtotal $\ge$ 100,000 paisa (৳1,000) receive free shipping (`deliveryFeePaisa = 0`).
   - Strict integer paisa arithmetic guaranteeing zero floating-point drift.
4. **Delivery Address & Contact Validation Engine (`validateDeliveryAddress`):**
   - Strict 11-digit Bangladeshi mobile verification (`/^01[3-9]\d{8}$/`).
   - Whitespace and hyphen normalization.
   - Validation of recipient name ($\\ge 2$ characters), address lines ($\\ge 5$ characters), valid division, and 4-digit postal code.
5. **Order Fulfillment FSM & Tracking Engine (`transitionQrOrderStatus`, `MerchantQrOrderEngine`):**
   - State transition rules: `PLACED` $\rightarrow$ `CONFIRMED` $\rightarrow$ `SHIPPED` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`.
   - Mandatory courier name and tracking code validation upon advancing to `SHIPPED`.
   - Guard against cancelling orders once shipped or delivered.
   - Automatic status updating for Cash On Delivery (`PENDING` $\rightarrow$ `PAID` upon `DELIVERED`).
   - Automatic refund for Wallet payments upon order cancellation (`PAID` $\rightarrow$ `REFUNDED`).
   - Visual timeline generator (`trackOrder`) providing current milestone indicators.
6. **Multi-Tenant StorageRepository Persistence & Cascade Deletion:**
   - Multi-tenant business isolation by `businessId` under collection `merchantQrOrders`.
   - CRUD and query operations in `StorageRepository`: `saveMerchantQrOrder`, `getMerchantQrOrderById`, `getMerchantQrOrdersByBusinessId`, `updateMerchantQrOrderStatus`, `deleteMerchantQrOrder`, `getUnsyncedMerchantQrOrders`, `updateMerchantQrOrderSyncStatus`, `existsMerchantQrOrder`.
   - Tenant-scoped cascade deletion in `deleteBusinessCascade` ensuring complete purge for deleted businesses without cross-tenant side effects.
   - Cloud backup sanitization in `getFullBackupState`: masks `recipient_phone` (`017****5678`), scrubs sensitive tokens/credentials, and records entity count in `manifest.recordCounts.merchantQrOrders`.
   - Full and single-tenant restore support in `commitRestorePayload`.

All implementations conform directly to the reverse engineering evidence documented by Worker 1 (Gibbs) in `docs/rea-reconstruction/investigations/REA_INVESTIGATION_ITER_238_QR_ORDER_DELIVERY.md`.

---

## 2. Architecture & Components Delivered

### 2.1 Room SQLite Schema & DAO Layer (`src/tallyPayService.js`)
- **Table Definition (`merchant_qr_order`):**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
  - `order_id`: TEXT NOT NULL (Unique Indexed: `index_merchant_qr_order_order_id`)
  - `business_id`: TEXT NOT NULL
  - `item_type`: TEXT NOT NULL
  - `item_name`: TEXT NOT NULL
  - `quantity`: INTEGER NOT NULL
  - `unit_price_paisa`: INTEGER NOT NULL
  - `total_price_paisa`: INTEGER NOT NULL
  - `delivery_fee_paisa`: INTEGER NOT NULL
  - `payment_method`: TEXT NOT NULL (Enum: `WALLET`, `CASH_ON_DELIVERY`, `ONLINE_GATEWAY`)
  - `payment_status`: TEXT NOT NULL (Enum: `PAID`, `PENDING`, `FAILED`, `REFUNDED`)
  - `order_status`: TEXT NOT NULL (Enum: `PLACED`, `CONFIRMED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`)
  - `recipient_name`: TEXT NOT NULL
  - `recipient_phone`: TEXT NOT NULL
  - `delivery_address`: TEXT NOT NULL
  - `division`: TEXT NOT NULL
  - `district`: TEXT NOT NULL
  - `postal_code`: TEXT (Nullable 4-digit code)
  - `courier_name`: TEXT (Nullable courier partner name)
  - `tracking_code`: TEXT (Nullable consignment tracking code)
  - `synced`: INTEGER NOT NULL DEFAULT 0 (0 = Dirty/Unsynced, 1 = Synced)
  - `create_date`: TEXT NOT NULL (ISO 8601 timestamp)
  - `update_date`: TEXT (Nullable ISO 8601 timestamp)
- **DAO Queries (`MerchantQrOrderDao`):**
  - `saveOrder(orderRecord)`: Inserts or updates order, automatically allocating an autoincrement ID.
  - `getOrderById(orderId)`: Returns isolated record copy by unique `order_id`.
  - `getOrdersByBusinessId(businessId, options)`: Filters orders by status, item type, sync flag, and sorts descending by creation date with pagination support.
  - `updateOrderStatus(orderId, status, trackingInfo)`: Updates status and optional courier details while marking record unsynced (`synced = 0`).
  - `deleteOrder(orderId)`: Removes order from database.
  - `getUnsyncedOrders(limit)`: Retrieves batch of unsynced records.
  - `updateOrderSyncStatus(orderId, synced)`: Manages synchronization lifecycle.
  - `exists(orderId)`: Checks existence of order ID.

### 2.2 Financial Arithmetic & Pricing Engine (`calculateQrOrderPricing`)
- **Unit Pricing:**
  - Acrylic Standee: 25,000 paisa (৳250)
  - Wooden Standee: 35,000 paisa (৳350)
  - Metal Standee: 50,000 paisa (৳500)
  - Counter Sticker: 5,000 paisa (৳50)
  - Soundbox Stand: 40,000 paisa (৳400)
- **Delivery Fee Logic:**
  - Inside Dhaka (`division` or `district` matching Dhaka in English or Bengali): 6,000 paisa (৳60).
  - Outside Dhaka: 12,000 paisa (৳120).
  - Free delivery threshold: If subtotal $\ge$ 100,000 paisa (৳1,000), delivery fee is 0 paisa.
- **Arithmetic Safety:**
  - Enforces non-negative integers for all paisa values.
  - Rejects unknown item types and invalid quantities ($\\le 0$ or non-integer).

### 2.3 Delivery Address & Contact Validation Engine (`validateDeliveryAddress`)
- **Bangladeshi Mobile Phone Validation:**
  - Regex: `/^01[3-9]\d{8}$/` ensuring valid mobile operator prefixes (013–019) and exactly 11 digits.
  - Normalizes and strips spaces and hyphens.
- **Geographic Validation:**
  - Enforces valid administrative division from the 8 official divisions: Dhaka, Chattogram, Rajshahi, Khulna, Barishal, Sylhet, Rangpur, Mymensingh (accepts both English and Bengali forms).
  - Enforces mandatory district.
  - Optional 4-digit postal code checked against `/^\d{4}$/`.
- **String Boundary Checks:**
  - Recipient name $\\ge 2$ characters.
  - Delivery address $\\ge 5$ characters.

### 2.4 Order Fulfillment Finite State Machine (FSM) & Tracking
- **State Progression:**
  - `PLACED` $\rightarrow$ `CONFIRMED` $\rightarrow$ `SHIPPED` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`.
- **Transition Constraints:**
  - Moving to `SHIPPED` requires valid non-empty `courierName` and `trackingCode`.
  - Cancellation allowed only from `PLACED` and `CONFIRMED` states.
  - Once `SHIPPED`, `OUT_FOR_DELIVERY`, or `DELIVERED`, cancellation is strictly rejected.
  - Terminal states (`DELIVERED`, `CANCELLED`) cannot transition to any other status.
- **Automated Settlement & Refunds:**
  - Wallet orders: Wallet balance validated and deducted; upon cancellation, `payment_status` is updated to `REFUNDED` and funds returned.
  - COD orders: `payment_status` starts as `PENDING`; automatically transitions to `PAID` upon reaching `DELIVERED`.
- **Visual Tracking Timeline (`trackOrder`):**
  - Generates a 4-stage formatted tracking timeline:
    1. অর্ডার গ্রহণ করা হয়েছে (`ORDER_PLACED`)
    2. অর্ডার প্রস্তুত হচ্ছে (`ORDER_CONFIRMED`)
    3. কুরিয়ারে পাঠানো হয়েছে (`ORDER_SHIPPED`)
    4. ডেলিভারি সম্পন্ন হয়েছে (`ORDER_DELIVERED`)

### 2.5 StorageRepository Multi-Tenant Persistence (`src/storageRepository.js`)
- Registered collection: `merchantQrOrders: []` in `VALID_COLLECTIONS`, `createDefaultState`, and `sanitizeState`.
- Exposed methods on StorageRepository and module exports:
  - `saveMerchantQrOrder(businessId, orderRecord)`
  - `getMerchantQrOrderById(businessId, orderId)`
  - `getMerchantQrOrdersByBusinessId(businessId, options)`
  - `updateMerchantQrOrderStatus(businessId, orderId, status, trackingInfo)`
  - `deleteMerchantQrOrder(businessId, orderId)`
  - `getUnsyncedMerchantQrOrders(businessId, limit)`
  - `updateMerchantQrOrderSyncStatus(businessId, orderId, synced)`
  - `existsMerchantQrOrder(businessId, orderId)`
- Strict multi-tenant isolation guaranteeing zero cross-tenant data leakage.
- Cascading purge in `deleteBusinessCascade` ensuring all orders for the target business are cleaned up.
- Cloud backup sanitization in `getFullBackupState`:
  - Masks phone numbers: `017****5678`.
  - Strips credentials/secrets.
  - Tracks record counts in `manifest.recordCounts.merchantQrOrders`.
- Selective single-tenant restore in `commitRestorePayload`.

---

## 3. Verification & Test Results

### 3.1 Suite Execution Summary: `test_iteration_238_qr_order_backend.js`
- **Test Groups:** 10
- **Total Assertions:** 67
- **Passed Assertions:** 67
- **Failed Assertions:** 0
- **Pass Rate:** **100.0%**
- **Performance Benchmark:** 1,000 QR order operations completed in **39ms** (target $< 150\text{ms}$)

### 3.2 Breakdown by Test Group:
| Group | Description | Assertions | Result |
|---|---|:---:|:---:|
| **Group 1** | Enums, Constants & Room SQLite Schema Invariants | 9 | **PASS** |
| **Group 2** | Financial Arithmetic & Pricing Engine | 8 | **PASS** |
| **Group 3** | Delivery Address & Contact Validation Engine | 10 | **PASS** |
| **Group 4** | Order Fulfillment State Machine (FSM) & Tracking | 11 | **PASS** |
| **Group 5** | MerchantQrOrderRecord & In-Memory DAO Operations | 9 | **PASS** |
| **Group 6** | End-to-End Order Creation & Tracking Engine | 7 | **PASS** |
| **Group 7** | StorageRepository Multi-Tenant Persistence & CRUD | 6 | **PASS** |
| **Group 8** | Multi-Tenant Business Isolation & Cascade Deletion | 2 | **PASS** |
| **Group 9** | Cloud Backup Sanitization & Serialization | 4 | **PASS** |
| **Group 10** | High-Throughput Performance Benchmark (1,000 ops < 150ms) | 1 | **PASS** |
| **Total** | | **67** | **100% PASS** |

### 3.3 Reference Architecture Verification: `test_iteration_238_qr_order_reference_architecture.js`
- **Test Groups:** 10
- **Total Assertions:** 145
- **Passed Assertions:** 145
- **Failed Assertions:** 0
- **Pass Rate:** **100.0%**

### 3.4 Zero Regression Verification Across Prior Iterations:
- `test_iteration_229_qr_settlement_backend.js`: **36 / 36 PASS** (100%)
- `test_iteration_230_settlement_history_backend.js`: **40 / 40 PASS** (100%)
- `test_iteration_231_pin_biometrics_backend.js`: **38 / 38 PASS** (100%)
- `test_iteration_232_account_manager_backend.js`: **30 / 30 PASS** (100%)
- `test_iteration_233_add_money_backend.js`: **32 / 32 PASS** (100%)
- `test_iteration_234_transfer_backend.js`: **30 / 30 PASS** (100%)
- `test_iteration_235_recharge_backend.js`: **31 / 31 PASS** (100%)
- `test_iteration_236_settlement_backend.js`: **36 / 36 PASS** (100%)
- `test_iteration_237_kyc_backend.js`: **54 / 54 PASS** (100%)
- `test_iteration_238_qr_order_backend.js`: **67 / 67 PASS** (100%)

---

## 4. Handoff to Worker 3 (Ohm — Frontend UI/UX Developer)

The backend service, pricing calculator, address validator, order fulfillment FSM, and storage repository are ready for UI integration in `App.js` or dedicated UI modules:

1. **Collateral Order Catalog Screen:**
   - Display items from `QR_ORDER_CATALOG`:
     - Acrylic Desk Standee (৳250)
     - Wooden Base Standee (৳350)
     - Metal Counter Standee (৳500)
     - Counter Sticker (৳50)
     - Soundbox Stand (৳400)
   - Real-time pricing display showing item subtotal, delivery fee (৳60 inside Dhaka, ৳120 outside Dhaka, Free if subtotal $\ge$ ৳1,000), and grand total.
2. **Delivery Address Form:**
   - Input fields: Recipient Name, 11-digit Phone Number, Division (dropdown with 8 divisions), District, Thana/Area, Street Address, Postal Code.
   - Use validation function `validateDeliveryAddress` exported from `src/tallyPayService.js`.
3. **Payment Selector:**
   - TallyPay Wallet (instant deduction)
   - Cash on Delivery (COD)
4. **Order History & Consignment Tracking Modal:**
   - List past merchant QR orders using `getMerchantQrOrdersByBusinessId`.
   - Visual step-by-step progress indicator via `trackOrder`:
     - অর্ডার গ্রহণ করা হয়েছে $\rightarrow$ প্রস্তুত হচ্ছে $\rightarrow$ কুরিয়ারে পাঠানো হয়েছে $\rightarrow$ ডেলিভারি সম্পন্ন হয়েছে.
     - Display courier name and consignment tracking code when status is `SHIPPED` or higher.
5. **Authentic Bengali String Invariants:**
   - Utilize tokens from `QR_ORDER_ARSC_TOKENS` exported from `src/tallyPayService.js`.

---

## 5. Compliance & Git Safety Policy
- **No Direct Commits/Pushes:** In strict adherence to AGENTS.md, no `git commit` or `git push` commands were executed.
- **Untracked Directories:** `extracted_apk/` and reference APK assets were preserved untouched.
- **App.js Ownership:** Zero modifications made to `App.js` (strictly preserved for Worker 3 Ohm).
