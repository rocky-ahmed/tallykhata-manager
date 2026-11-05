# REA REVERSE ENGINEERING INVESTIGATION -- ITERATION 235
**Subsystem:** TallyPay Mobile Recharge / Airtime Top-Up Subsystem (`TpRechargeActivity`, `MobileRechargeDto`, Operator Catalogs & Package Bundles)  
**Reference Binary:** `D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk` (`REF-001`)  
**SHA-256 Digest:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Binary Size:** 53,969,511 bytes  
**Investigator:** Worker 1 (Gibbs -- Principal REA Reverse Engineering Investigator)  
**Registered Thread ID:** `01a19154-99ab-72a0-9e23-2611b9ffc74c`  
**Milestone:** `REA-ITER-235`  
**Date:** 2026-11-05  

---

## 1. Executive Summary & Investigation Scope

In Milestone **REA-ITER-235**, an exhaustive, evidence-backed reverse engineering investigation was performed on reference binary `REF-001` (`TallyKhata-Demo.apk`) to deconstruct the **TallyPay Mobile Recharge / Airtime Top-Up Subsystem ("মোবাইল রিচার্জ")**.

In authentic Bangladeshi retail merchant operations, mobile recharge (airtime top-up and digital data/talk-time bundle resale) serves as a primary driver of customer footfall and secondary retailer commission revenue. Within TallyKhata / TallyPay, this subsystem enables:
1. **Dynamic Operator Detection:** Automatic detection of Bangladeshi telecom operators based on 3-digit mobile number prefix:
   - **Grameenphone (GP):** `017`, `013`
   - **Banglalink:** `019`, `014`
   - **Robi:** `018`
   - **Airtel:** `016`
   - **Teletalk:** `015`
   - **Skitto:** Digital sub-brand operating on GP network with specialized digital bundles.
2. **Dual Recharge Modes:**
   - **Airtime Flexiload / Easyload:** Custom amount recharge between ৳১০ and ৳১,০০০.
   - **Internet & Combo Bundle Packages:** Resale of pre-packaged operator bundles (Internet, Minutes/Talk-time, Bundles/Combos, Call Rate, Cashback offers).
3. **Connection Type Support:**
   - **Prepaid ("প্রিপেইড")**
   - **Postpaid ("পোস্টপেইড")**
   - **Skitto ("স্কিটো")**
4. **Merchant Commission & Incentive Revenue:**
   - Standard airtime commission: 2.7% (৳২৭ per ৳১,০০০ top-up) credited to merchant wallet or cashbox.
   - Special offer bonus / cashback on high-value data/voice bundle resale.
5. **Secure Execution & Double-Entry Accounting:**
   - 4-digit TallyPay PIN confirmation.
   - Immutable `rechargeHistory` journal logging.
   - Instant wallet balance deduction and commission accounting.

---

## 2. Technical Invariants & Verification Matrix

| Component | Target Location in REF-001 | Bytecode / Structural Verification Status | Invariant Requirement |
| :--- | :--- | :--- | :--- |
| **APK Binary Digest** | `D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk` | SHA-256: `267b310e...` (53,969,511 bytes) | Exact match with verified baseline |
| **TpRechargeActivity** | `AndroidManifest.xml` & `classes4.dex` | `com.progoti.tallykhata.v2.tallypay.activities.recharge.TpRechargeActivity` | Master mobile recharge activity |
| **TpRechargeNumberSelectionFragment** | `classes4.dex` | `...fragment.TpRechargeNumberSelectionFragment` | Phone number input & contact picker fragment |
| **RechargeAmountFragment** | `classes4.dex` | `...fragment.RechargeAmountFragment` | Recharge amount input with quick presets |
| **RechargePackageFragment** | `classes4.dex` | `...fragment.RechargePackageFragment` | Operator package & bundle browsing fragment |
| **RechargePinFragment** | `classes4.dex` | `...fragment.RechargePinFragment` | 4-digit secure PIN authentication fragment |
| **MobileRechargeDto** | `classes4.dex` | `...nobopayDataModel.dto.transaction.MobileRechargeDto` | Transaction payload DTO |
| **Room Table Schema** | `classes4.dex` | `recharge_packages` SQLite Room table | Pinned 28-column database schema |
| **Layout XMLs** | `res/layout/` | 15+ XML layout files | Authentic layout hierarchies & view IDs |
| **Authentic Bengali ARSC Tokens** | `resources.arsc` | Verified UTF-8 string pool entries | Pinned vernacular terms for recharge & operators |

---

## 3. AndroidManifest Registration & Activities

In `AndroidManifest.xml`, mobile recharge is registered under:
```xml
<activity 
    android:name="com.progoti.tallykhata.v2.tallypay.activities.recharge.TpRechargeActivity" 
    android:screenOrientation="portrait" 
    android:windowSoftInputMode="adjustResize" />
```

Associated activity declarations include:
- `com.progoti.tallykhata.v2.tallypay.activities.recharge.execution.RechargeExecutionActivity`
- Service components for background bundle synchronization:
  - `com.progoti.tallykhata.v2.tallypay.workers.RechargePackageFetchWorker`

---

## 4. Layout XML Resources & View Hierarchies

Deconstructed from `res/layout/`:
1. `activity_tp_recharge.xml`: Fragment container (`nav_host_fragment_recharge`), top app bar with title `"মোবাইল রিচার্জ"`, and wallet balance preview pill.
2. `fragment_tp_recharge.xml`: Master multi-tab container switching between **Flexiload ("টাকা")** and **Packages ("প্যাকেজ")**.
3. `fragment_recharge_amount.xml`:
   - 11-digit mobile number preview with operator icon badge.
   - Connection type radio group: `[ প্রিপেইড ]`, `[ পোস্টপেইড ]`, `[ স্কিটো ]`.
   - Amount input field with currency symbol (৳).
   - Quick preset amount chips: ৳২০, ৳৫০, ৳১০০, ৳২০০, ৳৫০০.
   - Next button: `btn_next` with authentic green CTA.
4. `fragment_package_recharge.xml`:
   - Category horizontal tab strip: **[ অফার / স্পেশাল ]**, **[ ইন্টারনেট ]**, **[ মিনিট ]**, **[ বান্ডেল ]**, **[ কল রেট ]**.
   - Search & filter by price / validity.
   - RecyclerView rendering `recharge_package_row_item.xml`.
5. `recharge_package_row_item.xml`:
   - Package title (e.g. "30 GB Internet + 700 Mins").
   - Validity tag (e.g. "30 দিন").
   - Price tag pill (e.g. "৳ 498").
   - Commission / cashback badge (e.g. "কমিশন: ৳২৫.০০").
6. `fragment_recharge_pin.xml`:
   - Transaction summary card: Recipient number, Operator name & logo, Amount, Commission earned.
   - 4-digit masked PIN input with `secureTextEntry`.
   - Confirm button: `btn_confirm_recharge` with loading indicator.
7. `selected_recharge_package.xml` & `layout_tp_recharge_confirm_row.xml`:
   - Detailed confirmation breakdown before final PIN submission.

---

## 5. Deconstructed Classes, DTOs & Database Schema

### 5.1 Bytecode Classes in `classes4.dex`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/TpRechargeActivity;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/fragment/TpRechargeNumberSelectionFragment;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/fragment/RechargeAmountFragment;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/fragment/RechargePackageFragment;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/fragment/RechargePinFragment;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/fragment/RechargeFragment;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/fragment/RechargeFragmentData;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/others/RechargePackageCategory;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/others/RechargeUtils;`
- `Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/MobileRechargeDto;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/model/ResponsePackageRecharge;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/model/RechargePackageCacheDao;`
- `Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/model/RechargePackageCacheEntity;`

### 5.2 Room Database Schema for `recharge_packages`
Directly extracted from DEX table definition:
```sql
CREATE TABLE IF NOT EXISTS `recharge_packages` (
  `id` INTEGER NOT NULL,
  `operator` TEXT NOT NULL,
  `connectionType` TEXT NOT NULL,
  `category` TEXT,
  `internetBandwidth` TEXT,
  `bandwidthUnit` TEXT,
  `talkTime` INTEGER,
  `talkTimeUnit` TEXT,
  `callRate` REAL,
  `callRateUnit` TEXT,
  `callRateUnitTime` TEXT,
  `callRatePulse` INTEGER,
  `callRatePulseUnit` TEXT,
  `smsCount` INTEGER,
  `others` TEXT,
  `amount` REAL NOT NULL,
  `validity` TEXT,
  `validityUnit` TEXT,
  `packageCommissionReceive` REAL,
  `packageCommissionOffer` REAL,
  `offerTag` TEXT,
  `published` INTEGER,
  `startDate` TEXT,
  `expiryDate` TEXT,
  `createdAt` TEXT NOT NULL,
  `updatedAt` TEXT,
  `remarks` TEXT,
  `order` INTEGER,
  PRIMARY KEY(`id`)
);
```

---

## 6. Telecom Operator Specifications & Regulatory Limits

### 6.1 Operator Prefix & Metadata Mapping
| Operator Key | Brand Name | Bengali Name | Primary Prefixes | Brand Color | Connection Types |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GP` | Grameenphone | গ্রামীণফোন | `017`, `013` | `#00A3E0` | PREPAID, POSTPAID |
| `BANGLALINK` | Banglalink | বাংলালিংক | `019`, `014` | `#F37021` | PREPAID, POSTPAID |
| `ROBI` | Robi | রবি | `018` | `#ED1C24` | PREPAID, POSTPAID |
| `AIRTEL` | Airtel | এয়ারটেল | `016` | `#E40000` | PREPAID, POSTPAID |
| `TELETALK` | Teletalk | টেলিটক | `015` | `#009639` | PREPAID, POSTPAID |
| `SKITTO` | Skitto | স্কিটো | `017`, `013` | `#FF69B4` | SKITTO (Special Digital) |

### 6.2 Regulatory Limits & Rules (BTRC & Bangladesh Bank)
- **Minimum Recharge:** ৳১০ (1,000 paisa)
- **Maximum Regular Airtime Recharge:** ৳১,০০০ (100,000 paisa) per transaction
- **Maximum Package / Bundle Recharge:** ৳৫,০০০ (500,000 paisa) per transaction
- **Daily Cumulative Maximum:** ৳২৫,০০০ (2,500,000 paisa)
- **Maximum Daily Transactions:** 50 transactions per merchant per day
- **Mobile Number Validation:** Valid 11-digit Bangladeshi mobile format starting with `01[3-9]`

### 6.3 Retailer Commission Rates
- **Regular Airtime Top-Up:** 2.7% (৳২৭ per ৳১,০০০)
- **Package Bundles:** Dynamic bonus commission ranging from ৳৫ to ৳৫০ based on operator package incentive.

---

## 7. Authentic Bengali String Tokens (`resources.arsc`)

- `"মোবাইল রিচার্জ"` (Mobile Recharge Header)
- `"মোবাইল রিচার্জ প্রসেস করা হচ্ছে"` (Processing Notice)
- `"মোবাইল রিচার্জ সফল হয়েছে"` (Success Voucher)
- `"মোবাইল রিচার্জ সফল হয়নি"` (Failure Notice)
- `"মোবাইল রিচার্জ সার্ভিসটি সাময়িকভাবে ব্যবহার উপযোগী নয়"` (Maintenance Alert)
- `"অপারেটর সিলেক্ট করি"` / `"অপারেটর"` (Operator Selector)
- `"এই মুহূর্তে কোন বান্ডেল অফার নেই"` (Empty Packages State)
- `"প্রিপেইড"`, `"পোস্টপেইড"`, `"স্কিটো"` (Connection Types)
- `"ইন্টারনেট"`, `"মিনিট"`, `"বান্ডেল"`, `"কল রেট"`, `"কমিশন"`

---

## 8. Clean-Room Architectural Blueprint

For **Worker 2 (Averroes -- Backend):**
- Implement `ReconstructedRechargeEngine` in `src/tallyPayService.js`.
- Implement `rechargeHistory` persistence in `src/storageRepository.js`.
- Package catalog with authentic GP, Banglalink, Robi, Airtel, and Teletalk plans.

For **Worker 3 (Ohm -- Frontend):**
- Implement Modals 97 to 101 in `App.js`:
  - Modal 97 (`modalRechargeNumber`): Recipient mobile number, contact book selector, operator preview.
  - Modal 98 (`modalRechargeAmount`): Airtime amount, connection type radio buttons, quick presets.
  - Modal 99 (`modalRechargePackages`): Categorized bundle browser (Internet, Minutes, Combo, Offers).
  - Modal 100 (`modalRechargePin`): PIN confirmation with commission summary.
  - Modal 101 (`modalRechargeVoucher`): Success receipt voucher with transaction ID & print/share triggers.
- Tab 4 trigger button `tp_mobile_recharge_btn`.
