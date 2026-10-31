# TALLYKHATA — PHASE 5 CASHBOX SCREEN IMPLEMENTATION MATRIX
## Complete Screen Inventory, Visual Elevation & Functional Verification Matrix

| Screen ID | Module / Surface | Route / State Selector | Source File & Line Range | Visual Treatment | Touch Target & Contrast | Functional Verification | QA Review Status | Classification |
|---|---|---|---|---|---|---|---|---|
| **SCR-10** | Cashbox Main Dashboard | `activeTab === 'cashbox'` | `App.js:4954-5310` | 3D Cash Hero Card, 2-column stats, Baki Aday strip, 3D big entry buttons, category breakdown, daily timeline | Touch $\ge 48\text{dp}$, contrast $\ge 4.5:1$ in Light/Dark | Verified: Total cash, today sales, in/out flow, eye toggle | **PASSED** | Core (P0) |
| **SCR-11** | Add Cash Transaction Modal | `modalAddCash` | `App.js:6849-6925` | 3D modal container, category pills, tactile amount input, notes, 3D CTA | Touch $\ge 48\text{dp}$, full keyboard safety | Verified: IN/OUT cash validation, category tagging, store write sync | **PASSED** | Core (P0) |
| **SCR-12** | Reconcile Cashbox Modal | `modalReconcileCash` | `App.js:6927-7050` | 3D reconciliation card, live diff indicator, notes input, confirmation guard | Touch $\ge 48\text{dp}$, contrast $\ge 4.5:1$ | Verified: Expected vs counted diff, adjustment transaction recording | **PASSED** | Core (P1) |

---

## Detailed Component Specifications

### 1. SCR-10: Cashbox Main Dashboard
- **Header & Hero Card**:
  - Upper Box: আজকের বেচা (`todaySales` / `todayCashIn`) and বর্তমান ক্যাশ (`totalCash`).
  - Eye Toggle: Toggles `hideCashAmounts` between masked (`***`) and formatted (`৳ XX,XXX`).
  - Lower Strip: আজ পেলাম (`todayCashIn`, green) and আজ দিলাম (`todayCashOut`, red) with specular 3D highlight.
- **Quick Actions Row**:
  - ক্যাশ রিপোর্ট (`setModalCashReport(true)`) with report icon.
  - ক্যাশবক্স মিলাই (`setModalReconcileCash(true)`) with balance synchronization icon.
  - Eye toggle button with 48dp hit-slop.
- **Baki Aday & Supplier Pay Strip**:
  - Baki Aday collection indicator (green text).
  - Supplier payment indicator (red text).
- **Big Entry CTAs**:
  - `+ ক্যাশ বেচা` (50dp height, tactile green 3D press).
  - `- দোকান খরচ` (50dp height, tactile red 3D press).
- **Cash Accounts Breakdown**:
  - 5 authentic categories (`sale`, `buy`, `cost`, `malik_in`, `malik_out`) with transaction counters and aggregated amounts.
- **Daily Timeline**:
  - Chronological grouped entries with IN/OUT badges and category icons.

### 2. SCR-11: Add Cash Transaction Modal
- **Category Selector**:
  - 5 category chips with distinct icons and active squircle highlight.
- **Amount & Notes**:
  - Prominent amount input with Bengali currency prefix (`৳`).
  - Notes / Memo input with character count.
- **Submission**:
  - Tactile 3D save button with instant writeQueue synchronization and validation against negative/zero amounts.

### 3. SCR-12: Reconcile Cashbox Modal
- **Expected Cash**:
  - Real-time ledger-derived balance display.
- **Counted Cash Input**:
  - Physical cash input with real-time diff calculation (`diff = counted - expected`).
- **Diff Indicator**:
  - Green for surplus (+), Red for deficit (-), Neutral for exact match (০).
- **Reconciliation Entry**:
  - Stamped with active `businessId` and category `adjustment`.
