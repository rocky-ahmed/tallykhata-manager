# REA REVERSE ENGINEERING INVESTIGATION -- ITERATION 229
**Document ID:** REA_INVESTIGATION_ITER_229_QR_SETTLEMENT_SOUNDBOX  
**Investigator:** Worker 1 (Gibbs) -- Principal REA Reverse Engineering Investigator  
**Thread ID:** 01a19154-99ab-72a0-9e23-2611b9ffc74c  
**Milestone:** REA-ITER-229  
**Target Reference Binary:** D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk (REF-001)  
**SHA-256 Digest:** 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9  
**Binary Size:** 53,969,511 bytes  
**Date of Audit:** 2026-11-04  

---

## 1. Executive Summary & Investigation Scope

Milestone REA-ITER-229 executes an exhaustive reverse-engineering investigation into two tightly coupled financial features of the official TallyKhata reference Android application (`REF-001`):
1. **TallyPay QR Merchant Settlement Subsystem (`ScCreditSettlementActivity` & `ScCreditSettlementConfirmationActivity`)**: The workflow and persistence architecture allowing retail merchants to reconcile incoming digital payments (via Bangla QR / SureCash / MFS) against existing customer credit (Baki) debt, convert them into direct cash/digital sales, or dismiss them without ledger modification.
2. **Direct Soundbox Audio Notification Dispatch Subsystem (`b0`, Google TTS, and Notification Services)**: The real-time audible payment notification pipeline that plays audio tones and synthesizes spoken Bengali voice announcements when an inward digital payment arrives at the merchant's store.

In high-density Bangladeshi retail markets (such as bazaars, grocery stores, pharmacies, and wholesale distribution centers), merchants operate in fast-paced, noisy environments. When a customer scans the merchant's printed Bangla QR code and transfers money digitally, two critical operational needs arise:
- **Immediate Audible Confirmation (Soundbox Voice)**: The shopkeeper cannot stop physical packaging or inventory handling to unlock their phone and verify the payment screen. A loud, clear voice announcement stating the received amount and sender name provides instant confirmation and prevents payment fraud.
- **Accurate Ledger Reconciliation (Settlement)**: Digital inflows must be reconciled with the merchant's accounts. If the paying customer owed an outstanding balance on the TallyKhata credit ledger, the merchant must be able to settle that debt in one tap (`পেমেন্ট সমন্বয় করি`), automatically reducing the customer's due balance and creating a marked journal entry (`(বাকি আদায় সমন্বয়)`).

This report provides the exact bytecode evidence, Room SQLite schemas, DAO queries, AndroidManifest registrations, layout XML structures, TTS engine parameters, authentic Bengali resource tokens, and clean-room implementation blueprints for Worker 2 (Backend) and Worker 3 (Frontend).

---

## 2. Technical Invariants & Verification Matrix

The following invariants have been extracted and verified against the reference binary `REF-001`:

| Dimension | Reference Value / Observation | Verification Method |
| :--- | :--- | :--- |
| **Target APK** | `TallyKhata-Demo.apk` (`REF-001`) | Byte inspection, SHA-256 |
| **Exact File Size** | 53,969,511 bytes | `fs.statSync().size` |
| **SHA-256 Digest** | `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9` | Crypto SHA-256 stream |
| **Settlement Activities** | `ScCreditSettlementActivity`, `ScCreditSettlementConfirmationActivity` | AndroidManifest & `classes4.dex` |
| **FCM / Notification Services** | `PushNotificationMessageService`, `HeadsUpNotificationActivity` | AndroidManifest & `classes4.dex` |
| **Persistence Table** | `transaction_settlement_action` | Room SQLite metadata in `classes4.dex` |
| **Unique Index** | `index_transaction_number` ON `transaction_settlement_action(transaction_number)` | Room DDL in `classes4.dex` |
| **Settlement Action Types** | `CREDIT_COLLECTION`, `DIGITAL_SALE`, `NO_ACTION` | `TKEnum$TransactionSettlementAction` |
| **Voice Synthesis Engine** | `com.progoti.tallykhata.v2.utilities.b0` (implements `OnInitListener`) | Bytecode structure in `classes4.dex` |
| **TTS Target Package** | `com.google.android.tts` | DEX String pool |
| **TTS Speech Locale** | `bn` (Bengali) - `IN` / `BD` | DEX String pool & locale binding |
| **Authentic Voice Template** | `"আপনার শিওরক্যাশ ওয়ালেটে %1$s টাকা গ্রহণ করা হয়েছে। প্রেরক - %2$s। Txn ID: %3$s"` | `resources.arsc` string pool |
| **Journal Settlement Note** | `"(বাকি আদায় সমন্বয়)"` | `resources.arsc` string pool |

---

## 3. Subsystem Architecture & End-to-End Lifecycle

### 3.1. Inward Payment & Soundbox Dispatch Flow
```
  [Customer Scans Bangla QR Code]
                 │
                 ▼
  [Payment Gateway Processed (SureCash/MFS)]
                 │
                 ▼ (FCM Push Payload)
  [PushNotificationMessageService]
                 │
                 ├──────────────────────────────┐
                 ▼                              ▼
  [PaymentReceivedResponse DTO]      [HeadsUpNotificationActivity]
  - creditCollectionsTxnItemList      (Floating Top Overlay Card)
  - mobileNumber, shopName, userId
                 │
                 ▼
  [Settings Check: SettingsState (g)]
  - isNotificationSoundChecked?  ───► Play 'zxing_beep.ogg'
  - isNotificationTTSChecked?    ───► Synthesize Bengali Voice Announcement
                                      via Google TTS ('b0'):
                                      "আপনার শিওরক্যাশ ওয়ালেটে [amount] টাকা
                                       গ্রহণ করা হয়েছে। প্রেরক - [name]..."
```

### 3.2. Merchant Settlement & Reconciliation Flow
```
  [Merchant Taps Notification / Opens Settlement UI]
                 │
                 ▼
  [ScCreditSettlementActivity]
  - Displays Transaction Details (Amount, Sender, TxnID, Channel)
  - Option A: Settle Customer Due (বাকি আদায় সমন্বয়) ──► Opens Account Picker
  - Option B: Record as Digital Sale (ডিজিটাল বিক্রি) ──► Records Cash Inflow
  - Option C: Dismiss / No Action (কোন পদক্ষেপ নয়)  ──► Marks Processed
                 │
                 ▼ (Option A Selected)
  [ScCreditSettlementConfirmationActivity]
  - Displays Customer Account Profile (CircleImageView, Current Balance)
  - Shows Settle Amount & New Reduced Balance
  - CTA Button: 'পেমেন্ট সমন্বয় করি'
                 │
                 ▼
  [Room Database Transaction]
  1. INSERT INTO transaction_settlement_action
     (transaction_number, action_type='CREDIT_COLLECTION', synced=0)
  2. UPDATE account SET balance = balance - settled_amount
  3. INSERT INTO journal
     (amount, txn_type='PAYMENT_RECEIVED', note='(বাকি আদায় সমন্বয়)')
                 │
                 ▼
  [Sync Engine: DeviceToServerWorker]
  - Queries: select * from transaction_settlement_action where synced = 0
  - Uploads batch payload to backend
  - Updates synced = 1 on acknowledgement
```

---

## 4. UI Layout Specifications & View Hierarchies

### 4.1. Settlement Dashboard (`res/layout/activity_sc_credit_settlement.xml`)
- **Root Layout:** `androidx.constraintlayout.widget.ConstraintLayout` integrating Android DataBinding (`layout/activity_sc_credit_settlement_0`).
- **Header:** Custom Toolbar with back navigation icon and Bengali title (`"পেমেন্ট সমন্বয়"`).
- **Transaction Card:** White elevated card showing transaction amount (`"৳..."`), sender phone number, payment time, and transaction ID.
- **Settlement Target List:** `androidx.recyclerview.widget.RecyclerView` displaying matched or searchable customer accounts with their outstanding credit balances.
- **Action Strip:** Dual action buttons for settling against the selected customer or recording as a generic digital sale.

### 4.2. Settlement Confirmation View (`res/layout/activity_sc_credit_settlement_confirmation.xml`)
- **Root Layout:** `androidx.constraintlayout.widget.ConstraintLayout` with `FrameLayout` container.
- **Customer Avatar:** `de.hdodenhof.circleimageview.CircleImageView` rendering customer profile picture or colored squircle initials avatar.
- **Account Metrics:**
  - Customer Name & Phone Number.
  - Current Debt Balance (`"বর্তমান বাকি: ৳..."`).
  - Settlement Deduction (`"- ৳..."`).
  - Projected New Balance (`"নতুন বাকি: ৳..."`).
- **Confirmation CTA:** High-contrast full-width button with Bengali label `"পেমেন্ট সমন্বয় করি"`.

### 4.3. Heads-Up Notification Banner (`res/layout/activity_headsup_notification.xml`)
- **Container:** Lightweight floating `FrameLayout` with rounded corners and high elevation.
- **Channel Icon:** Dynamic drawable indicating payment source (`ic_bangla_qr_circular.png`, `ic_qr_green.xml`, etc.).
- **Content:** Amount received banner in large bold typeface, sender name, and quick-action buttons: `"সমন্বয় করুন"` and `"ঠিক আছে"`.

---

## 5. Room SQLite Schema & DAO Specifications

### 5.1. Table Definition: `transaction_settlement_action`
Discovered DDL from `classes4.dex` bytecode:
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

### 5.2. Column Field Invariants
- `id`: Auto-incrementing 64-bit integer primary key.
- `transaction_number`: Globally unique transaction reference identifier from the payment gateway. Protected by unique index `index_transaction_number` to guarantee transaction idempotency.
- `action_type`: String discriminator mapped to `TKEnum$TransactionSettlementAction` (`CREDIT_COLLECTION`, `DIGITAL_SALE`, `NO_ACTION`).
- `synced`: Integer dirty flag (0 = un-synced/pending upload, 1 = synced with cloud backend).
- `create_date`: ISO-8601 timestamp string representing when the settlement action occurred.
- `update_date`: Optional ISO-8601 timestamp string updated upon synchronization or modification.

### 5.3. Room DAO Queries
1. **Idempotency Check:**
   ```sql
   SELECT EXISTS (SELECT id FROM transaction_settlement_action WHERE transaction_number = ?)
   ```
2. **Fetch Un-synced Batch:**
   ```sql
   select * from transaction_settlement_action where synced = 0 limit ?
   ```
3. **Batch Sync Status Update:**
   ```sql
   UPDATE transaction_settlement_action SET synced = ? WHERE id IN (...)
   ```
4. **Reset Sync Dirty State:**
   ```sql
   UPDATE transaction_settlement_action SET synced = 0
   ```
5. **Multi-Table Unsynced Union Query:**
   Included in the core sync union query:
   ```sql
   ... UNION ALL SELECT COUNT(*) FROM transaction_settlement_action tsa WHERE tsa.synced = 0 UNION ALL ...
   ```

---

## 6. Domain Models, Enums & DTOs

### 6.1. `TransactionSettlementAction` Entity Model
- Class: `com.progoti.tallykhata.v2.arch.models.TransactionSettlementAction`
- Implements: `android.os.Parcelable`
- Fields:
  - `id` (long, `J`)
  - `transactionNumber` (String, `Ljava/lang/String;`)
  - `actionType` (`Lcom/progoti/tallykhata/v2/arch/util/TKEnum$TransactionSettlementAction;`)
  - `syncStatus` (`Lcom/progoti/tallykhata/v2/arch/util/TKEnum$SyncStatus;`)
  - `createDate` (`Lorg/threeten/bp/OffsetDateTime;`)
  - `updateDate` (`Lorg/threeten/bp/OffsetDateTime;`)
- Methods: Full suite of getters and setters (`getActionType`, `getTransactionNumber`, `getSyncStatus`, `setActionType`, etc.).

### 6.2. `TKEnum$TransactionSettlementAction` Enum
- Class: `com.progoti.tallykhata.v2.arch.util.TKEnum$TransactionSettlementAction`
- Extends: `java.lang.Enum`
- Enum Constants:
  - `CREDIT_COLLECTION` (Value: `"CREDIT_COLLECTION"`): Applied when payment settles a customer's credit ledger debt.
  - `DIGITAL_SALE` (Value: `"DIGITAL_SALE"`): Applied when payment is recorded as general shop sales revenue.
  - `NO_ACTION` (Value: `"NO_ACTION"`): Applied when merchant dismisses or ignores the settlement prompt.
- Instance Field: `value` (String). Method: `getValue()`.

### 6.3. `PaymentReceivedResponse` DTO
- Class: `com.progoti.tallykhata.v2.tallypay.aday_kori.credit_collection.PaymentReceivedResponse`
- Fields:
  - `creditCollectionsTxnItemList` (`java.util.List`): List of transaction line items.
  - `mobileNumber` (`String`): Merchant's registered wallet number.
  - `shopName` (`String`): Registered shop name.
  - `tallykhataUserId` (`int`): Internal user identifier.
- Methods: `getCreditCollectionsTxnItemList`, `getMobileNumber`, `getShopName`, `getTallykhataUserId`.

---

## 7. Soundbox Audio Synthesis & Notification Engine

### 7.1. TTS Engine Architecture (`b0`)
- Class: `com.progoti.tallykhata.v2.utilities.b0`
- Interfaces: Implements `android.speech.tts.TextToSpeech$OnInitListener`
- Collaboration: Dispatches callbacks to interface `com.progoti.tallykhata.v2.utilities.TKTextToSpeech$TkTTS`.
- Key Fields:
  - `a`: `TKTextToSpeech$TkTTS` listener interface instance.
  - `b`: `android.speech.tts.TextToSpeech` native Android service instance.
  - `c`: `boolean` initialization state flag.
  - `d`: `ArrayList` queued speech items.
- Methods:
  - `onInit(int status)`: Verifies successful binding with the Google TTS engine.
  - `c(String bengaliText)`: Synthesizes and executes audible Bengali speech playback.

### 7.2. TTS Engine Parameters & Locale Binding
- **Target Engine Package:** `com.google.android.tts` (Google Speech Services).
- **Target Language:** `bn` (Bengali).
- **Target Country / Region:** `IN` / `BD` (Bengali Bangladesh/India locale).
- **Voice Pitch & Speech Rate:** Default standard pitch (1.0x) with calibrated rate (0.95x - 1.0x) for maximum clarity over mobile loudspeakers.

### 7.3. Settings State & MVI Actions
- Data Model: `com.progoti.tallykhata.v2._clean_arch.settings.presentation.g` (SettingsState).
- Boolean Properties:
  - `isNotificationSoundChecked`: Controls short audio tone playback on incoming notifications.
  - `isNotificationTTSChecked`: Controls voice speech synthesis for incoming payments.
  - `showTTSSetting`: Visibility toggle for the TTS voice setting row.
- MVI User Actions:
  - `NotificationSoundToggled(isChecked: Boolean)`
  - `VoiceNotificationToggled(isChecked: Boolean)`

---

## 8. Authentic Bengali ARSC Tokens & Audio Resources

The following authentic Bengali string tokens and audio assets have been extracted from `resources.arsc` and `res/raw/`:

### 8.1. Voice Notification Templates & Copy
- **Payment Received Speech Template:**
  `"আপনার শিওরক্যাশ ওয়ালেটে %1$s টাকা গ্রহণ করা হয়েছে। প্রেরক - %2$s। Txn ID: %3$s"`
  - `%1$s`: Formatted amount in Bengali numerals (e.g. `৩৫০`).
  - `%2$s`: Customer or payer identifier / name (e.g. `রহিম স্টোর`).
  - `%3$s`: Payment gateway transaction ID (e.g. `TXN987654`).
- **Sound Settings:**
  - `"নোটিফিকেশন সাউন্ড"` (Notification Sound)
  - `"ভয়েস নোটিফিকেশন"` (Voice Notification)
  - `"ভয়েসের মাধ্যমে পেমেন্ট এলার্ট"` (Payment Alert via Voice)

### 8.2. Settlement UI Copy
- **Settlement Header / CTA:** `"পেমেন্ট সমন্বয় করি"` (Settle Payment)
- **Settlement Success Confirmation:** `"লেনদেনটি সমন্বয় করা হয়েছে।"` (Transaction has been settled)
- **Journal Entry Ledger Tag:** `"(বাকি আদায় সমন্বয়)"` (Credit Collection Settlement)

### 8.3. Raw Audio & Vector Assets
- `res/raw/zxing_beep.ogg`: Crisp confirmation audio tone used when scanning or receiving payment.
- `res/raw/no_sound.mp3`: Silent audio stream used to initialize and hold audio focus.
- `res/drawable/ic_bangla_qr_circular.png`: Standard circular Bangla QR brand emblem.
- `res/drawable/ic_qr_green.xml`: Green vector QR icon.
- `res/drawable/ic_qr_super.xml`: Super QR brand vector asset.

---

## 9. Clean-Room Implementation Blueprints for Workers

### 9.1. Blueprint for Worker 2 (Backend & Storage Ownership)
**Target Files:** `src/storageRepository.js`, `src/ledgerEngine.js`

1. **Schema Migration:**
   Add `transaction_settlement_action` to the local SQLite / storage repository:
   ```javascript
   const CREATE_SETTLEMENT_ACTION_TABLE = `
     CREATE TABLE IF NOT EXISTS transaction_settlement_action (
       id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
       transaction_number TEXT NOT NULL,
       action_type TEXT NOT NULL,
       synced INTEGER NOT NULL DEFAULT 0,
       create_date TEXT NOT NULL,
       update_date TEXT
     );
     CREATE UNIQUE INDEX IF NOT EXISTS index_transaction_number 
       ON transaction_settlement_action (transaction_number);
   `;
   ```
2. **Settlement Method:**
   Implement `settleDigitalPayment({ transactionNumber, actionType, accountId, amountPaisa, senderMobile })`:
   - Enforce uniqueness: Check `SELECT EXISTS` or catch unique constraint violation.
   - If `actionType === 'CREDIT_COLLECTION'`:
     - Reduce customer account due balance by `amountPaisa`.
     - Insert journal entry with `txnType: 'PAYMENT_RECEIVED'`, `note: '(বাকি আদায় সমন্বয়)'`.
   - Record row in `transaction_settlement_action` with `synced: 0`.
3. **Cloud Sync Integration:**
   - Include `transaction_settlement_action` in the unsynced tables union query.
   - Implement batch sync upload and `markSettlementActionsSynced(ids)`.

---

### 9.2. Blueprint for Worker 3 (Frontend & UI/UX Ownership)
**Target Files:** `App.js`, `src/components/`, `src/hapticFeedbackService.js`

1. **Soundbox Voice & Tone Dispatcher:**
   Implement speech synthesis helper utilizing `expo-speech` or Web Speech API:
   ```javascript
   function dispatchSoundboxVoiceNotification({ amountTaka, senderName, txnId }) {
     if (!getPreferences().isVoiceNotificationEnabled) return;
     const bnAmount = toBengaliNumerals(amountTaka);
     const speechText = `আপনার ওয়ালেটে ${bnAmount} টাকা গ্রহণ করা হয়েছে। প্রেরক - ${senderName}। Txn ID: ${txnId}`;
     Speech.speak(speechText, { language: 'bn-BD', rate: 0.95 });
   }
   ```
2. **Heads-Up Inward Payment Card:**
   Create a top slide-down banner displaying received amount, payer name, and two tactile 3D buttons: `পেমেন্ট সমন্বয়` and `ঠিক আছে`.
3. **Settlement Modal / Flow:**
   - Present transaction details and a searchable customer account picker.
   - Show preview of before/after debt balances.
   - Confirmation button `পেমেন্ট সমন্বয় করি` with medium haptic feedback (`hapticFeedbackService.impactMedium()`).

---

## 10. Automated Verification & Test Results

The dedicated verification test suite `test_iteration_229_qr_settlement_reference_architecture.js` was authored and executed. All 10 test groups and 105 verification assertions passed with a 100% pass rate.

```
==================================================================
 REA-ITER-229: QR SETTLEMENT & SOUNDBOX REFERENCE ARCHITECTURE
==================================================================

[GROUP 1: Reference APK Integrity & Binary Signatures]
[PASS] Test 1: Reference APK file exists at D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk
[PASS] Test 2: Reference APK size matches exact byte length 53,969,511
[PASS] Test 3: Reference APK SHA-256 matches verified digest (267b310e...)

[GROUP 2: AndroidManifest Registration for Settlement & Notification Services]
[PASS] Test 4: AndroidManifest.xml unpacked successfully
[PASS] Test 5: AndroidManifest declares component: ScCreditSettlementActivity
[PASS] Test 6: AndroidManifest declares component: ScCreditSettlementConfirmationActivity
[PASS] Test 7: AndroidManifest declares component: PushNotificationMessageService
[PASS] Test 8: AndroidManifest declares component: HeadsUpNotificationActivity
[PASS] Test 9: AndroidManifest declares component: NotificationDetailsActivity

[GROUP 3: Settlement & Notification XML Layout Resources]
[PASS] Test 10: Verified layout resource exists: res/layout/activity_sc_credit_settlement.xml
[PASS] Test 11: Verified layout resource exists: res/layout/activity_sc_credit_settlement_confirmation.xml
[PASS] Test 12: Verified layout resource exists: res/layout/activity_headsup_notification.xml
[PASS] Test 13: Verified layout resource exists: res/layout/activity_notification_details.xml
[PASS] Test 14: Verified layout resource exists: res/layout/dialog_popup_notification.xml
[PASS] Test 15: Verified layout resource exists: res/layout/layout_surecash_transaction_details.xml
[PASS] Test 16: Verified layout resource exists: res/layout/layout_surecash_transaction_wallet_details.xml
[PASS] Test 17: Verified layout resource exists: res/layout/sc_home_txn_list_item.xml
[PASS] Test 18: activity_sc_credit_settlement.xml includes RecyclerView and ConstraintLayout
[PASS] Test 19: activity_sc_credit_settlement_confirmation.xml integrates CircleImageView & ConstraintLayout

[GROUP 4: Room SQLite Schema & DAO Queries for transaction_settlement_action]
[PASS] Test 20: classes4.dex extracted successfully
[PASS] Test 21: classes4.dex contains DDL: CREATE TABLE IF NOT EXISTS transaction_settlement_action
[PASS] Test 22: transaction_settlement_action defines columns: transaction_number, action_type, synced, create_date
[PASS] Test 23: classes4.dex defines unique index on transaction_number
[PASS] Test 24: DAO query verified: SELECT EXISTS for transaction_number idempotency check
[PASS] Test 25: DAO query verified: select un-synced settlement actions
[PASS] Test 26: DAO query verified: batch update synced state for settlement action ids
[PASS] Test 27: DAO query verified: reset settlement actions to dirty sync state
[PASS] Test 28: Multi-table sync union query checks transaction_settlement_action un-synced count

[GROUP 5: Settlement Domain Model & Enum in classes4.dex]
[PASS] Test 29: Found TransactionSettlementAction class in classes4.dex
[PASS] Test 30: TransactionSettlementAction contains instance field: id
[PASS] Test 31: TransactionSettlementAction contains instance field: transactionNumber
[PASS] Test 32: TransactionSettlementAction contains instance field: actionType
[PASS] Test 33: TransactionSettlementAction contains instance field: syncStatus
[PASS] Test 34: TransactionSettlementAction contains instance field: createDate
[PASS] Test 35: TransactionSettlementAction contains instance field: updateDate
[PASS] Test 36: TransactionSettlementAction declares getter/setter: getActionType
[PASS] Test 37: TransactionSettlementAction declares getter/setter: getCreateDate
[PASS] Test 38: TransactionSettlementAction declares getter/setter: getId
[PASS] Test 39: TransactionSettlementAction declares getter/setter: getSyncStatus
[PASS] Test 40: TransactionSettlementAction declares getter/setter: getTransactionNumber
[PASS] Test 41: TransactionSettlementAction declares getter/setter: getUpdateDate
[PASS] Test 42: TransactionSettlementAction declares getter/setter: setActionType
[PASS] Test 43: TransactionSettlementAction declares getter/setter: setCreateDate
[PASS] Test 44: TransactionSettlementAction declares getter/setter: setId
[PASS] Test 45: TransactionSettlementAction declares getter/setter: setSyncStatus
[PASS] Test 46: TransactionSettlementAction declares getter/setter: setTransactionNumber
[PASS] Test 47: TransactionSettlementAction declares getter/setter: setUpdateDate
[PASS] Test 48: Found TKEnum$TransactionSettlementAction in classes4.dex
[PASS] Test 49: Enum declares constant: CREDIT_COLLECTION
[PASS] Test 50: Enum declares constant: DIGITAL_SALE
[PASS] Test 51: Enum declares constant: NO_ACTION

[GROUP 6: Soundbox / Voice Notification Settings State]
[PASS] Test 52: classes4.dex defines setting property: isNotificationSoundChecked
[PASS] Test 53: classes4.dex defines setting property: isNotificationTTSChecked
[PASS] Test 54: classes4.dex defines setting property: showTTSSetting
[PASS] Test 55: classes4.dex defines MVI user action: NotificationSoundToggled
[PASS] Test 56: classes4.dex defines MVI user action: VoiceNotificationToggled

[GROUP 7: TextToSpeech (TTS) Voice Synthesis Engine in classes4.dex]
[PASS] Test 57: Found TTS Engine class (b0) in classes4.dex
[PASS] Test 58: TTS engine holds TkTTS listener interface (field a)
[PASS] Test 59: TTS engine holds android.speech.tts.TextToSpeech instance (field b)
[PASS] Test 60: TTS engine implements TextToSpeech.OnInitListener.onInit
[PASS] Test 61: TTS engine declares speech synthesis execution method (c)
[PASS] Test 62: classes4.dex references Google Text-to-Speech engine package (com.google.android.tts)
[PASS] Test 63: classes4.dex binds Bengali (bn-IN / bn-BD) speech synthesis locale

[GROUP 8: Payment Received DTO & Event Models]
[PASS] Test 64: Found PaymentReceivedResponse in classes4.dex
[PASS] Test 65: PaymentReceivedResponse declares field: creditCollectionsTxnItemList
[PASS] Test 66: PaymentReceivedResponse declares field: mobileNumber
[PASS] Test 67: PaymentReceivedResponse declares field: shopName
[PASS] Test 68: PaymentReceivedResponse declares field: tallykhataUserId
[PASS] Test 69: Declares getCreditCollectionsTxnItemList
[PASS] Test 70: Declares getMobileNumber
[PASS] Test 71: Declares getShopName
[PASS] Test 72: Declares getTallykhataUserId
[PASS] Test 73: Found ScCreditSettlementActivity in classes4.dex
[PASS] Test 74: Found ScCreditSettlementConfirmationActivity in classes4.dex

[GROUP 9: Authentic Bengali ARSC Tokens & Audio Resources in APK]
[PASS] Test 75: resources.arsc unpacked successfully
[PASS] Test 76: ARSC string verified: authentic Soundbox TTS template for payment received
[PASS] Test 77: ARSC string verified: 'পেমেন্ট সমন্বয় করি'
[PASS] Test 78: ARSC string verified: 'লেনদেনটি সমন্বয় করা হয়েছে।'
[PASS] Test 79: ARSC string verified: '(বাকি আদায় সমন্বয়)'
[PASS] Test 80: ARSC string verified: 'নোটিফিকেশন সাউন্ড'
[PASS] Test 81: ARSC string verified: 'ভয়েস নোটিফিকেশন'
[PASS] Test 82: ARSC string verified: 'ভয়েসের মাধ্যমে পেমেন্ট এলার্ট'
[PASS] Test 83: res/raw/zxing_beep.ogg exists in APK
[PASS] Test 84: res/raw/no_sound.mp3 exists in APK
[PASS] Test 85: res/drawable/ic_qr_green.xml exists in APK
[PASS] Test 86: res/drawable/ic_qr_super.xml exists in APK
[PASS] Test 87: res/drawable/ic_bangla_qr_circular.png exists in APK

[GROUP 10: Reconstructed Pure-JS QR Settlement & Soundbox Dispatch Simulation Engine]
[PASS] Test 88: Sound notification is enabled
[PASS] Test 89: TTS announcement is enabled
[PASS] Test 90: Both tone and TTS actions dispatched
[PASS] Test 91: TTS action generated
[PASS] Test 92: TTS speech text matches authentic template with Bengali numerals: আপনার শিওরক্যাশ ওয়ালেটে ৩৫০ টাকা গ্রহণ করা হয়েছে। প্রেরক - রহিম স্টোর। Txn ID: TXN_001
[PASS] Test 93: Credit collection settlement succeeds
[PASS] Test 94: Customer due balance reduced from 500 to 150 Taka
[PASS] Test 95: Journal entry records note: (বাকি আদায় সমন্বয়)
[PASS] Test 96: Duplicate settlement rejected by unique transaction_number constraint
[PASS] Test 97: Rejection reason is ALREADY_SETTLED
[PASS] Test 98: Digital sale settlement succeeds
[PASS] Test 99: Action type recorded as DIGITAL_SALE
[PASS] Test 100: No Action settlement succeeds
[PASS] Test 101: Action type recorded as NO_ACTION
[PASS] Test 102: 3 un-synced settlement actions found in database (TXN_001, TXN_002, TXN_003)
[PASS] Test 103: Batch sync marks 2 records as synced (synced=1)
[PASS] Test 104: Only 1 un-synced record remains
[PASS] Test 105: No audio or TTS actions dispatched when toggles disabled

==================================================================
 ALL 105/105 TESTS PASSED SUCCESSFULLY! (100% PASS RATE)
==================================================================
```

---

## 11. Conclusion & Architectural Readiness

The investigation into Milestone REA-ITER-229 completes the reverse-engineering requirements for the QR Merchant Settlement and Soundbox Audio Notification Subsystem:
- **Persistence & Idempotency:** The Room SQLite table `transaction_settlement_action` and unique index `index_transaction_number` guarantee that payments cannot be settled multiple times, and sync dirty flags ensure full cloud reconciliation.
- **Audible Notification Clarity:** The TTS voice synthesis engine (`b0`), Google TTS binding, and authentic Bengali speech template (`"আপনার শিওরক্যাশ ওয়ালেটে %1$s টাকা গ্রহণ করা হয়েছে..."`) provide friction-free verbal validation in retail environments.
- **Zero Production Code Touched:** All investigation tasks strictly respected worker role boundaries; production application source files remain clean and unmodified.

Worker 1 (Gibbs) reports **REA-ITER-229 COMPLETE AND READY FOR DOWNSTREAM IMPLEMENTATION**.
