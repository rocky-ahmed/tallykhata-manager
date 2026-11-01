# TALLYKHATA — PHASE 8 TAGADA & DUE MANAGEMENT SCREEN IMPLEMENTATION MATRIX
## Comprehensive Surface Inventory & Audit Across All Due Collection Surfaces

---

## 1. TAGADA MODULE SURFACES & COMPONENT MAPPING

| Screen ID | Surface / Screen Name | Component / Modal Identifier | Source File & Location | Parent Route / Trigger | Interaction Capabilities | Multi-Business Scope | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SCR-11** | Group Tagada Dashboard | `activeTab === 'tagada'` | `App.js:5215-5350` | Bottom Navigation Tab 3 (`ic_tagada.png`) / Deep Link (`action=tagada`) | • Top metric cards: Total Customer Due, Due Customer Count, Free SMS Quota<br>• Real-time customer search & due filters (All, Highest Due, With Phone)<br>• Group Tagada bulk SMS broadcast trigger<br>• Individual customer due cards with 3D squircle avatars, due balance pills, and direct SMS/WhatsApp buttons<br>• Sent Tagada history log table with timestamp and recipient details | Strictly scoped to `businessAccounts` via `activeBusinessId` | **FULLY REDESIGNED** |
| **SCR-12** | Single Customer Tagada Reminder Modal | `modalTagada` | `App.js:7755-7840` | Due card action (`টালি-মেসেজ`), Account details Tagada button, Report drill-down | • Recipient profile card with phone, outstanding due, and 3D avatar<br>• Contextual Bengali reminder message preview box<br>• Primary Tali-SMS button with remaining quota indicator<br>• WhatsApp direct share trigger<br>• Cancel / Back button with full modal dismissal | Scoped to selected customer account belonging to active business | **FULLY REDESIGNED** |
| **SCR-11-D**| Due Summary Metric Cards | `tagadaHeaderCard` in `activeTab === 'tagada'` | `App.js:5230-5260` | Integrated into `activeTab === 'tagada'` | • Aggregate metrics: মোট বকেয়া বাকি, মোট বাকি কাস্টমার সংখ্যা, অবশিষ্ট এসএমএস কোটা<br>• Color-coded warning indicators and integer currency formatting<br>• Eliminated legacy text duplication glitches | Dynamically computed from `dueCustomers` | **FULLY REDESIGNED** |

---

## 2. DATA BINDINGS & STATE DEPENDENCIES

| Screen ID | Reactive State Variable | Data Source / Storage Key | Handler / Mutation API | Persistence Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **SCR-11** | `dueCustomers`, `tagadaLogs`, `remainingSmsCount` | `@tallykhata_state_v6` (`accounts`, `tagadaLogs`, `remainingSmsCount`) | `handleSendBulkTagada`, `handleSendSingleTagada`, `handleSendTagadaWhatsApp` | `storageRepository.mutateStore()` with atomic write queue |
| **SCR-12** | `tagadaCustomer`, `selectedAccount` | Local component state & active account reference | `generateTagadaMessage()`, `handleSendSingleTagada` | SMS log persisted to `tagadaLogs` collection |

---

## 3. KEYBOARD & HARDWARE NAVIGATION PARITY

- **Android Hardware Back**:
  - `modalTagada` closes to previous screen or customer ledger on back press (`App.js:1992`).
  - `activeTab === 'tagada'` navigates to `activeTab === 'home'` on header back button press (`App.js:5222`).
- **Touch Target Ergonomics**:
  - All interactive buttons (`টালি-মেসেজ`, `WhatsApp`, `গ্রুপ তাগাদা পাঠান`) meet or exceed $48\times 48\text{dp}$ effective touch size via `hitSlop` expansion.
