# TALLYKHATA — PHASE 6 CONTACTS SCREEN IMPLEMENTATION MATRIX
## Complete Scope Mapping, Component Identification & Audit Status

---

## 1. SCOPE OVERVIEW & REUSE CLASSIFICATION
Phase 4 successfully overhauled the transactional accounting ledger screens for customers and suppliers (`SCR-04`).
Phase 6 focuses specifically on:
- Contact Directory and Lists (`SCR-02`, `SCR-03`)
- Contact Search and Filtering Experience
- Contact Profile and Contact Information Display (`SCR-04` Info Header & Quick Communication Actions)
- Add Contact Modal (`SCR-05` / `modalAddAccount`)
- Edit Contact Modal (`SCR-06` / `modalEditAccount`)
- Quick Communication Triggers (Direct Phone Call, SMS Tagada, Statement Sharing)
- Empty States, Loading States, and Bengali Typography Invariants

---

## 2. CONTACTS IMPLEMENTATION MATRIX

| Screen ID | Module / Surface | Route / Trigger | Source File | Existing Behavior | Phase 6 3D Transformation | Visual & QA Status |
|---|---|---|---|---|---|:---:|
| **SCR-02** | Contacts / Tali | `activeTab === 'home' && filterMode === 'customer'` | `App.js:4850-4960` | Customer directory list, flat squircle cards, balance amounts | Tactile 3D avatar containers, initial-based colored avatars, bold typography, due tag badge, 48dp touch targets | **FULLY REDESIGNED** |
| **SCR-03** | Contacts / Tali | `activeTab === 'home' && filterMode === 'supplier'` | `App.js:4850-4960` | Supplier directory list, flat list items, payable tags | Tactile 3D avatar containers, emerald payable badge, optical alignment | **FULLY REDESIGNED** |
| **SCR-04 (Contact Info)**| Contacts / Ledger | `currentScreen === 'account_ledger'` | `App.js:4266-4400` | Account header, profile card, action buttons | 3D Card elevation, contact phone & address, quick communication bar (কল, এসএমএস, স্টেটমেন্ট শেয়ার) | **FULLY REDESIGNED** |
| **SCR-05** | Contacts / Form | `modalAddAccount` | `App.js:6747-6840` | Create account modal, flat toggle pills | `Button3D` actions, type selector (কাস্টমার vs সাপ্লায়ার), phone-pad keyboard, Dark Mode surface | **FULLY REDESIGNED** |
| **SCR-06** | Contacts / Form | `modalEditAccount` | `App.js:6663-6745` | Edit customer/supplier modal | Pre-filled inputs, `Button3D` actions, Dark Mode integration, 11-digit phone formatting | **FULLY REDESIGNED** |
| **SCR-05-Search** | Contacts / Search | `searchQuery` state | `App.js:4750-4820` | Real-time name and phone search bar | High-contrast search input, clear button, instant empty search state | **FULLY REDESIGNED** |
| **SCR-05-Empty** | Contacts / Empty | `ListEmptyComponent` | `App.js:4915-4940` | Empty image and text | Preserved authentic asset `ic_no_txn_img_customer.png`, Bengali typography scaling | **FULLY REDESIGNED** |

---

## 3. CONTACT DATA & COMMUNICATION INVARIANTS
1. **Contact Identification**: Each contact retains a stable `accountId` UUID, immutable across edits.
2. **Contact Classification**:
   - `type === 1`: Customer (কাস্টমার / বাকি হিসাব)
   - `type === 2`: Supplier (সাপ্লায়ার / দেনা হিসাব)
3. **Communication Integrations**:
   - Phone Call: `Linking.openURL('tel:${phone}')` with 48x48dp touch target.
   - SMS Tagada: 1-tap launcher to `modalTagada` with pre-filled debt reminder.
   - Statement Share: Direct integration with native Android Share sheet.
4. **Historical Ledger Preservation**:
   - Deleting a contact verifies that zero transactions exist or requires explicit user confirmation.
   - Editing contact details (name, phone, address) updates all related views without mutating previous journal entry IDs.
