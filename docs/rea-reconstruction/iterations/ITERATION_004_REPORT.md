# REA RECONSTRUCTION — ITERATION 004 REPORT
**Iteration ID:** `REA-ITER-004`  
**Target Application:** `TallyKhata-Demo.apk` (`REF-001`)  
**Audit Date:** 2026-11-02  
**Main Orchestrator:** Lead Software Architect  
**Status:** ACTIVE — REVERSE ENGINEERING AND RECONSTRUCTION IN PROGRESS  

---

## 1. Feature 003 REA Investigation & Evidence Findings
- **Target Analysis:** Examined `classes4.dex` under `com/progoti/tallykhata/v2/_clean_arch/stock/presentation`.
- **Reference Stock & Inventory Classes (164 classes identified):**
  - `StockActivity`: Main entry point for inventory management.
  - `screens/ProductListScreenKt`: Product catalog with real-time stock balances and valuation cards.
  - `screens/AddProductScreenKt`: New product addition form.
  - `StockViewModel`: Reactive StateFlow architecture handling `addProduct`, `editProduct`, `deleteProduct`, `getAllProducts`, `getAllStocks`, and `getDateWiseStockReport`.
- **Reference Room DB Tables:**
  - `inventory` (`id`, `business_id`, `name`, `unit_name`, `unit_price`, `synced`, `is_active`, `create_date`)
  - `inventory_lot` (`id`, `inventory_id`, `unit_price`, `lot_quantity`, `stock_balance`, `is_active`)
  - `stock` (`id`, `inventory_id`, `txn_type`, `quantity_in`, `quantity_out`, `price`, `description`, `adjustment`)

---

## 2. Specification & Implementation Deliverables
1. **Formal Specification:** Created `docs/rea-reconstruction/specifications/FEAT_003_INVENTORY_STOCK.md` detailing:
   - Stock valuation formulas (Total Cost, Estimated Sale Value, Gross Margin)
   - Stock adjustment invariants (`validateStockAdjustment` with zero/negative stock protection)
   - Status categorization (In Stock, Low Stock <= 5, Out of Stock == 0)
   - Dual-collection synchronization (`inventory` & `stock`)
2. **Backend Engine Parity (`src/storageRepository.js`, `src/ledgerEngine.js`):**
   - Dual-collection synchronization: mutating `inventory` mirrors `stock` and vice-versa.
   - `validateStockAdjustment`: strictly rejects non-numeric or NaN adjustment quantities, negative quantities, and protects against stock dipping below 0.
   - Multi-business stock isolation: `filterByBusiness`, cascade deletion safeguards (`deleteBusinessPermanently` guarded against businesses with stock; `deleteBusinessCascade` purges accurately).
3. **Frontend UI/UX Alignment (`App.js`):**
   - Product list with status filtering (all, low_stock, out_of_stock, in_stock) and search.
   - Mini stock adjustment buttons (`+ ইন`, `- আউট`) with 48x48dp effective touch area via `hitSlop`.
   - WCAG 2.2 AAA/AA contrast compliance across light and dark theme modes.

---

## 3. Automated Regression & Test Audit
- **Total Test Suites Executed:** 40 suites (`test_*.js`)
- **Total Passing Tests:** 955 discrete assertions
- **Test Results:** 100% Pass, 0 Failures, 0 Regressions
- **Target Suite:** `test_phase7_inventory_stock.js` (50 / 50 tests passed, 100%).

---

## 4. Feature Parity Status
- **Feature 001 (Ledger & Transactions):** PARITY VERIFIED
- **Feature 002 (Cashbox & Reconciliations):** PARITY VERIFIED
- **Feature 003 (Inventory & Stock):** PARITY VERIFIED

---

## 5. Next Iteration Strategy (Iteration 005)
1. **Gibbs (Worker 1):** Investigate Feature 004 — Tagada, SMS Due Reminders & Customer Communication (`tagada_log` table and `cstxn/TallySmsWorker` in `classes4.dex`).
2. **Averroes (Worker 2):** Audit tagada logging, SMS balance deduction, and payment link generation.
3. **Ohm (Worker 3):** Reconcile Tagada reminder modal, SMS template selector, and customer communication triggers.
4. **Main Agent:** Coordinate pipeline, review diffs, execute regression test suite, and audit feature parity.
