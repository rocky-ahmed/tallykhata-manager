# TALLYKHATA — PHASE 7 INVENTORY SCREEN IMPLEMENTATION MATRIX
## Comprehensive Surface Inventory & Audit Across All Stock & Inventory Modals

---

## 1. INVENTORY MODULE SURFACES & COMPONENT MAPPING

| Screen ID | Surface / Screen Name | Component / Modal Identifier | Source File & Location | Parent Route / Trigger | Interaction Capabilities | Multi-Business Scope | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SCR-20** | Inventory Dashboard & Product Master | `modalAddStock` | `App.js:7270-7400` | Home Quick Action (`ic_menu_stock`) / Menu Tab (`menu_item_stock`) / Deep Link (`action=stock`) | • Top metric cards: Total Products, Stock Cost, Est. Sales Value, Low Stock Count<br>• Real-time search by product name & unit<br>• Status filter chips: All, Low Stock ($\le 5$), Out of Stock ($0$)<br>• Product cards with 3D avatars, buy/sell prices, quantity badges<br>• Quick actions: `+ ইন`, `- আউট`, Delete | Strictly isolated by `activeBusinessId` via `businessInventory` filter | **IMPLEMENTED & AUDITED** |
| **SCR-21** | Add / Edit Product Modal | `modalStockForm` / Inline creation form in `modalAddStock` | `App.js:7310-7360` | Header CTA / Inline Form in `modalAddStock` | • Product name input with localized placeholder<br>• Unit selector / input (কেজি/লিটার/পিস/বস্তা/ডজন)<br>• Opening stock input ($\ge 0$)<br>• Cost price (`buyPrice`) and selling price (`sellPrice`)<br>• Save validation with `generateUniqueId('prod_')`<br>• Real-time persistent state mutation via `mutateCollection('inventory')` | Stamped with `businessId: activeBusinessId \|\| '1'` | **IMPLEMENTED & AUDITED** |
| **SCR-22** | Stock Movement & Adjustment Modal | `modalAdjustStock` | `App.js:7402-7470` | Product row mini actions (`+ ইন`, `- আউট`) | • High-contrast segmented toggle: `+ নতুন স্টক এলো` (in) vs `- স্টক কমেছে / নষ্ট` (out)<br>• Big quantity numeric input with autofocus<br>• Positive numeric validation and non-negative guard via `validateStockAdjustment`<br>• Atomic collection mutation via `mutateCollection('inventory')`<br>• Tactile 3D confirmation and cancel buttons | Scoped to `selectedProduct.id` belonging to active business | **IMPLEMENTED & AUDITED** |
| **SCR-20-D**| Stock Summary & Metrics Strip | `stockSummaryRow` in `modalAddStock` | `App.js:7290-7320` | Integrated into `modalAddStock` | • Aggregate metric boxes: মোট পণ্য, মোট স্টক ক্রয়মূল্য, আনুমানিক বিক্রয়মূল্য<br>• Visual color-coded borders (Primary, Green, Warning)<br>• Formatted currency using integer-precision `formatMoney` | Dynamically calculated from `businessInventory` | **IMPLEMENTED & AUDITED** |

---

## 2. DATA BINDINGS & STATE DEPENDENCIES

| Screen ID | Reactive State Variable | Data Source / Storage Key | Handler / Mutation API | Persistence Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **SCR-20** | `inventory`, `businessInventory` | `@tallykhata_state_v6` (`inventory` / `stock`) | `useMemo` filter by `activeBizId` | Continuous dual collection sync (DATA-12) |
| **SCR-21** | `prodName`, `prodUnit`, `prodStock`, `prodBuyPrice`, `prodSellPrice` | Local component state | `handleSaveProduct` | `storageRepository.mutateCollection('inventory')` with write queue |
| **SCR-22** | `stockAdjustQty`, `stockAdjustType`, `selectedProduct` | Local component state | `handleAdjustStock` | `validateStockAdjustment` followed by `mutateCollection('inventory')` |

---

## 3. KEYBOARD & HARDWARE NAVIGATION PARITY

- **Android Hardware Back**:
  - `modalAdjustStock` closes to `modalAddStock` on back press (`App.js:1979`).
  - `modalAddStock` closes to Home screen on back press (`App.js:1978`).
  - Standard Android back event consumption prevents accidental app exit.
- **Keyboard Handling**:
  - `keyboardType="numeric"` applied to numeric fields (stock, buy price, sell price, adjustment qty).
  - ScrollView with `paddingBottom: 20` guarantees all buttons remain accessible when soft keyboard is raised on Redmi Note 9.
