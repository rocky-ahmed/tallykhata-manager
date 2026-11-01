# TALLYKHATA — PHASE 7 INVENTORY DATA INTEGRITY REVIEW
## Architectural Audit of Storage Repositories, Invariants, and Precision

---

## 1. DUAL COLLECTION CONTINUOUS SYNCHRONIZATION (DATA-12)

In legacy versions of TallyKhata, product records were intermittently referenced under both `'inventory'` and `'stock'`. To prevent data divergence, `src/storageRepository.js` enforces continuous dual collection synchronization:

1. **Mutation Parity**:
   ```javascript
   // src/storageRepository.js:371-372
   ...(collectionName === 'inventory' ? { stock: deduplicated } : {}),
   ...(collectionName === 'stock' ? { inventory: deduplicated } : {}),
   ```
2. **Continuous Bidirectional Guard**:
   Whenever either `inventory` or `stock` is modified through `mutateStore`, the counterpart collection is mirrored automatically before persisting to disk.
3. **Backup & Restore Parity**:
   During `exportBackupPayload`, both collections are verified and included in the checksum calculation. During `importBackupPayload`, both collections are restored synchronously:
   ```javascript
   // src/storageRepository.js:1171-1172
   inventory: restoredInventory,
   stock: restoredInventory,
   ```

---

## 2. ARITHMETIC PRECISION & NON-NEGATIVE INVARIANTS

1. **Non-Negative Stock Guard**:
   In `src/ledgerEngine.js`:
   - Outflow adjustments (`adjustType === 'out'`) strictly verify that the requested quantity `qty <= currentStock`.
   - If `qty > currentStock`, the operation is aborted with a localized error:
     `বর্তমান স্টক (${current}) থেকে বেশি (${qty}) বাদ দেওয়া সম্ভব নয়।`
   - Negative quantities (`qty <= 0`) or non-numeric inputs (`isNaN(qty)`) are rejected before state mutation.
2. **Stock Valuation Invariants**:
   - `totalStockCost = ∑ (qty × buyPrice)`
   - `totalStockSaleValue = ∑ (qty × sellPrice)`
   - Both metrics are computed dynamically using `Number(item.buyPrice) || 0` and formatted through `formatMoney` to prevent floating-point display anomalies.

---

## 3. MULTI-BUSINESS ISOLATION AUDIT

- **Scoping**:
  - Legacy records without `businessId` default safely to `'1'`.
  - New records are explicitly stamped with `businessId: activeBusinessId || '1'`.
- **Isolation Certification**:
  - Query filtering (`businessInventory`) strictly checks `String(i.businessId || '1') === String(activeBizId)`.
  - Adding, adjusting, or deleting a product in Business 2 has zero impact on Business 1 inventory counts or valuation totals.
  - Cascading business deletion cleanly purges only the target business's stock items while leaving all other businesses intact.
