# REA RECONSTRUCTION — FEATURE 003 SPECIFICATION
**Feature Name:** Inventory, Stock Ledger & Product Catalog (মালপত্র ও স্টক হিসাব)  
**Reference Target:** `TallyKhata-Demo.apk` (`REF-001`)  
**Target SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Document Version:** 1.0.0  
**Status:** SPECIFICATION APPROVED  

---

## 1. Executive Summary & REA Evidence Basis
Feature 003 provides product catalog management, item unit pricing, low stock alerts, stock-in / stock-out ledger adjustments, and inventory valuation for retail and wholesale merchants.

### Authoritative REA Evidence (`classes4.dex`):
- **Clean Architecture Stock Presentation (`com.progoti.tallykhata.v2._clean_arch.stock.presentation`):**
  - `StockActivity`: Main stock hub
  - `screens/ProductListScreenKt`: Product listing & inventory valuation screen
  - `screens/AddProductScreenKt`: New product addition form
  - `StockViewModel`:
    - `addProduct`: Validates item name, unit, buy price, sell price, initial quantity
    - `editProduct`: Updates product attributes & price changes
    - `deleteProduct`: Soft-deletes product (`is_active = 0`)
    - `getAllProducts`: Retrieves items scoped to active business ID
    - `getAllStocks`: Running stock journal
    - `getDateWiseStockReport`: Historical stock valuation and adjustments
- **Reference Room DB Tables (`classes4.dex`):**
  - `inventory`
  - `inventory_lot`
  - `stock`

---

## 2. Room Database Schema Alignment

### 2.1 `inventory` Table
```sql
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  business_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  unit_price REAL NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  comment TEXT,
  create_date TEXT NOT NULL,
  update_date TEXT,
  sync_date TEXT,
  FOREIGN KEY(business_id) REFERENCES business(id) ON UPDATE NO ACTION ON DELETE CASCADE
);
```

### 2.2 `inventory_lot` Table
```sql
CREATE TABLE IF NOT EXISTS inventory_lot (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  inventory_id INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  lot_quantity REAL NOT NULL DEFAULT 0.0,
  stock_balance REAL NOT NULL DEFAULT 0.0,
  synced INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  create_date TEXT NOT NULL,
  update_date TEXT,
  sync_date TEXT,
  FOREIGN KEY(inventory_id) REFERENCES inventory(id) ON UPDATE NO ACTION ON DELETE CASCADE
);
```

### 2.3 `stock` Table (Stock Movement Ledger)
```sql
CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  inventory_id INTEGER NOT NULL,
  txn_type INTEGER NOT NULL,            -- 1: Stock In (যোগ), 2: Stock Out (বাদ / বিক্রি)
  quantity_in REAL NOT NULL DEFAULT 0.0,
  quantity_out REAL NOT NULL DEFAULT 0.0,
  price REAL,
  description TEXT,
  adjustment REAL,
  synced INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  create_date TEXT NOT NULL,
  update_date TEXT,
  sync_date TEXT,
  FOREIGN KEY(inventory_id) REFERENCES inventory(id) ON UPDATE NO ACTION ON DELETE CASCADE
);
```

---

## 3. Stock Valuation & Accounting Formulas

### 3.1 Valuation Metrics
1. **Total Stock Purchase Cost:**
   $$\text{Total Cost} = \sum_{i} (\text{stock}_i \times \text{buyPrice}_i)$$
2. **Total Estimated Sales Value:**
   $$\text{Total Sales Value} = \sum_{i} (\text{stock}_i \times \text{sellPrice}_i)$$
3. **Estimated Gross Margin / Profit:**
   $$\text{Estimated Profit} = \text{Total Sales Value} - \text{Total Cost}$$

### 3.2 Stock Adjustment Invariants (`validateStockAdjustment`)
- **Stock In (`type === 'in'`):** $\text{New Stock} = \text{Current Stock} + \text{Adjust Qty}$.
- **Stock Out (`type === 'out'`):** $\text{New Stock} = \text{Current Stock} - \text{Adjust Qty}$.
- **Deficit Protection:** Rejects adjustment if $\text{Adjust Qty} > \text{Current Stock}$. Stock is strictly non-negative ($\text{Stock} \ge 0$).

### 3.3 Status Categorization
- **In Stock:** $\text{Stock} > 5$ units (Healthy / সবুজ)
- **Low Stock:** $0 < \text{Stock} \le 5$ units (Warning / হলুদ-কমলা)
- **Out of Stock:** $\text{Stock} = 0$ units (Danger / লাল)

---

## 4. Multi-Tenant Business Isolation
All inventory products and stock movements are strictly bound to `business_id`.
- `filterByBusiness('inventory', activeBizId)`
- `deleteBusinessPermanently` is guarded against deleting businesses with linked active stock.
- `deleteBusinessCascade` cleanly purges products of target business without cross-business side effects.
