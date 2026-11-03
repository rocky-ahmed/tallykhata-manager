# REA REVERSE ENGINEERING INVESTIGATION — ITERATION 221
**Document ID:** `REA_INVESTIGATION_ITER_221_TALLYPAY_AND_SOUNDBOX`  
**Investigator:** Worker 1 (Gibbs) — Principal REA Reverse Engineering Investigator  
**Thread ID:** `01a19154-99ab-72a0-9e23-2611b9ffc74c`  
**Milestone:** `REA-ITER-221`  
**Target Reference Binary:** `D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk` (`REF-001`)  
**SHA-256 Digest:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Binary Size:** 53,969,511 bytes  
**Date of Audit:** 2026-11-03  

---

## 1. Executive Summary & Investigation Scope

Iteration 221 executes an exhaustive reverse-engineering investigation into the TallyPay digital wallet ecosystem, with focus on **Add Money (টাকা লোড / ক্যাশ-ইন)**, **Transaction Limits & Thresholds (লেনদেনের লিমিট ও চার্জ)**, and **Merchant QR Soundbox (সাউন্ডবক্স অডিও ঘোষণা)**.

Digital merchant inflow in Bangladesh operates under Bangladesh Bank MFS & Interoperable Digital Payment guidelines. Merchants must be able to:
1. Top up/load money into their TallyPay wallet via multiple payment channels (bKash, Nagad, Rocket, Upay, Visa, Mastercard, Internet Banking).
2. Monitor real-time transaction velocity, daily/monthly ceilings, and fee tiers (১০০% ফ্রি অ্যাড মানি).
3. Receive instant audible voice notifications through a Soundbox queue when incoming payments arrive in busy, noisy retail shop environments.

This investigation delivers concrete bytecode, resource, and manifest evidence extracted directly from `REF-001`.

---

## 2. Technical Invariants & Verification Matrix

| Component | Reference Artifact / Symbol | Verified Evidence |
| :--- | :--- | :--- |
| **Add Money Hub** | `AddMoneyActivity` | `com.progoti.tallykhata.v2._clean_arch.add_money.presentation.AddMoneyActivity` |
| **Channel Activities** | MFS & Card Top-Up | `AddMoneyFromNagadActivity`, `AddMoneyFromCardActivity`, `AddMoneyFromRocketActivity` |
| **API Endpoints** | Retrofit Service DTOs | `com.progoti.tallykhata.v2._clean_arch.add_money.data.remote.AddMoneyTpApi`, `AddMoneyTpV1Api` |
| **Limits Engine** | Limit Summary ViewModel | `AddMoneyViewModel$getTransactionLimitUsageSummary$2`, `SuperQrViewModel$getTransactionLimitUsageSummary$3` |
| **Layouts** | XML Presentation | `activity_add_money.xml`, `activity_transaction_limit.xml`, `layout_add_money_success.xml` |
| **Drawables** | Vector Assets | `ic_add_money_large.xml`, `ic_add_money_new.xml`, `ic_add_money_new_disbaled.xml` |
| **ARSC Strings** | Authentic Bengali Copy | `"অ্যাড মানি-এর দৈনিক লিমিট অতিক্রম করছে"`, `"আপনি আজ সর্বোচ্চ সংখ্যক বার অ্যাড মানি করেছেন"`, `"ভিসা, মাষ্টারকার্ড বা আমেরিকান এক্সপ্রেস কার্ড থেকে অ্যাড মানি করুন"` |

---

## 3. Bytecode Evidence & Architecture Reconstruction

### 3.1 Activity & Repository Declarations
- `classes.dex`:
  - `Lcom/progoti/tallykhata/v2/_clean_arch/add_money/presentation/AddMoneyActivity`
  - `Lcom/progoti/tallykhata/v2/tallypay/activities/addmoney/addmoneyfromNagad/AddMoneyFromNagadActivity`
  - `Lcom/progoti/tallykhata/v2/tallypay/activities/addmoney/addmoneyfromcard/AddMoneyFromCardActivity`
  - `Lcom/progoti/tallykhata/v2/tallypay/activities/addmoney/addmoneyfromrocket/AddMoneyFromRocketActivity`
- `classes4.dex`:
  - `Lcom/progoti/tallykhata/v2/_clean_arch/_core/domain/util/AddMoneyMethod`
  - `Lcom/progoti/tallykhata/v2/_clean_arch/add_money/data/remote/AddMoneyTpApi`
  - `Lcom/progoti/tallykhata/v2/_clean_arch/add_money/data/remote/AddMoneyTpV1Api`
  - `Lcom/progoti/tallykhata/v2/_clean_arch/add_money/data/repository/AddMoneyRepositoryImpl`

### 3.2 Layout Resources
- `res/layout/activity_add_money.xml`
- `res/layout/activity_add_money_from_bank.xml`
- `res/layout/activity_add_money_from_card.xml`
- `res/layout/activity_add_money_web_view.xml`
- `res/layout/activity_transaction_limit.xml`
- `res/layout/fragment_main_add_money.xml`
- `res/layout/fragment_transaction_limit.xml`
- `res/layout/layout_add_money_success.xml`
- `res/layout/transaction_limit_row_item.xml`

### 3.3 Authentic Bengali ARSC Resource Strings
1. `"অ্যাড মানি-এর দৈনিক লিমিট অতিক্রম করছে। অনুগ্রহ করে দৈনিক লেনদেনের লিমিট দেখুন।"`
2. `"অ্যাড মানি-এর মাসিক লিমিট অতিক্রম করছে। অনুগ্রহ করে মাসিক লেনদেনের লিমিট দেখুন।"`
3. `"আপনি আজ সর্বোচ্চ সংখ্যক বার অ্যাড মানি করেছেন।"`
4. `"কার্ড থেকে অ্যাড মানি করে ব্যবহার শুরু করুন।"`
5. `"ডেবিট/ক্রেডিট কার্ড থেকে অ্যাড মানি করতে ট্যাপ করুন।"`
6. `"নগদ, রকেট বা কার্ড থেকে অ্যাড মানি করে কিনুন"`
7. `"ভিসা, মাষ্টারকার্ড বা আমেরিকান এক্সপ্রেস কার্ড থেকে অ্যাড মানি করুন"`
8. `"মাসিক সর্বোচ্চ সংখ্যক বার অ্যাড মানি করেছেন।"`

---

## 4. Implementation Directives for Clean-Room Reproduction

1. **Transaction Limits (activity_transaction_limit.xml):**
   - Add Money: Min ৳10.00, Max per txn ৳50,000.00, Daily count 5, Daily max ৳50,000.00.
   - Send Money: Min ৳10.00, Max per txn ৳25,000.00, Daily count 5, Daily max ৳25,000.00.
   - Cash Out: Min ৳50.00, Max per txn ৳25,000.00, Daily count 3, Daily max ৳25,000.00.
   - QR Pay Receive: Min ৳1.00, Max per txn ৳100,000.00, Daily count 50.
2. **Fee Structures (১০০% ফ্রি ও স্বচ্ছ চার্জ কাঠামো):**
   - Add Money: 100% Free (0% fee).
   - QR Pay Receive: 100% Free (0% fee).
   - Cash Out via Bank: 100% Free (0% fee).
   - Cash Out via Agent: 1.49% (৳ 14.90 per ৳ 1,000).
3. **Soundbox Voice Prompts:**
   - Text synthesis format: `"{appNameBn} থেকে {amountBnWords} টাকা সফলভাবে জমা হয়েছে।"`.
   - Sequential FIFO playback queue with volume (1-5), mute toggle, and event persistence.
