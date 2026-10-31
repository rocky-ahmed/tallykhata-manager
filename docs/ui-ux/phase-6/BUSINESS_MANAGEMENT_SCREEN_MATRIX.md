# TALLYKHATA — PHASE 6 BUSINESS MANAGEMENT SCREEN IMPLEMENTATION MATRIX
## Multi-Business Architecture, Lifecycle Operations & UI Audit Status

---

## 1. SCOPE OVERVIEW
Business Management enables single-device shopkeepers to maintain multiple distinct business entities (e.g. "মুদি দোকান", "ফার্মেসি", "হোলসেল") with 100% data isolation.
Phase 6 encompasses:
- Business Picker Switcher Modal (`SCR-28` / `modalBusinessPicker`)
- Create Business Profile Form (`SCR-29` / `modalAddBusiness`)
- Business Profile Overview in Main Menu (`SCR-30` Header Hero)
- Business Archiving and Restoration Workflows
- Business Permanent Deletion and Cascade Deletion Safeguards

---

## 2. BUSINESS MANAGEMENT IMPLEMENTATION MATRIX

| Screen ID | Module / Surface | Route / Trigger | Source File | Existing Behavior | Phase 6 3D Transformation | Visual & QA Status |
|---|---|---|---|---|---|:---:|
| **SCR-28** | Business / Switcher | `modalBusinessPicker` | `App.js:8325-8440` | Bottom sheet, active radio list, archive button | Tactile 3D card layout, "বর্তমানে সক্রিয়" badge, logo avatar, active shop elevation, Light/Dark parity | **FULLY REDESIGNED** |
| **SCR-29** | Business / Create | `modalAddBusiness` | `App.js:8441-8515` | Add business modal, flat input fields | Modern input surfaces, placeholder typography, `Button3D` actions (বাতিল, তৈরি করুন), Dark Mode tokens | **FULLY REDESIGNED** |
| **SCR-28-Archive**| Business / Lifecycle| `handleArchiveBusiness` | `App.js:3838-3868` | Confirmation alert, hides from active list | Safe non-destructive archive list with "পুনরুদ্ধার" and "মুছুন" actions | **FULLY REDESIGNED** |
| **SCR-28-Restore**| Business / Lifecycle| `handleRestoreBusiness` | `App.js:3869-3886` | Unarchives and sets active | 1-tap restore action, immediate business selection, success feedback | **FULLY REDESIGNED** |
| **SCR-28-Delete** | Business / Lifecycle| `handlePermanentDeleteBusiness` | `App.js:3887-3918` | Destructive alert, rejects if txns exist | Multi-check guard preventing accidental loss of financial journals | **FULLY REDESIGNED** |
| **SCR-30 (Hero)** | Settings / Profile | `activeTab === 'menu'` | `App.js:7825-7890` | Profile hero card, business switcher trigger | 3D profile container, business switch chip, verified badge | **FULLY REDESIGNED** |

---

## 3. MULTI-BUSINESS DATA ISOLATION GUARANTEES
1. **Scoping by `businessId`**:
   - `accounts`: Filtered strictly by `acc.businessId === activeBusinessId`.
   - `journals`: Filtered strictly by `j.businessId === activeBusinessId`.
   - `cashEntries`: Filtered strictly by `c.businessId === activeBusinessId`.
   - `wallets`: Filtered strictly by `w.businessId === activeBusinessId`.
2. **Switching Integrity**:
   - Selecting Business B immediately unloads Business A's in-memory ledgers and loads Business B's verified records from `@tallykhata_state_v6`.
   - Zero in-memory cross-contamination or stale state bleeding across shop switches.
3. **Cascade Deletion Safeguards**:
   - Standard permanent delete (`deleteBusinessPermanently`): Fails if the business contains accounts or transactions.
   - Cascade delete (`deleteBusinessCascade`): Authorized only via explicit multi-step confirmation in dedicated settings; removes only records tagged with the target `businessId`.
