# TALLYKHATA — PHASE 7 STOCK MOVEMENT WORKFLOW MAP
## Complete Lifecycle, Validation Rules, Arithmetic Invariants & Multi-Business Scoping

---

## 1. PRODUCT CREATION WORKFLOW (SCR-21)

```
[User Taps + পণ্য যোগ করুন]
        ↓
[Form Input: Name, Unit, Buy Price, Sell Price, Stock]
        ↓
[Input Sanitization: Name trimmed, Unit defaulted to 'পিস', Prices parsed via parseFloat]
        ↓
[Generate Product Record: id: generateUniqueId('prod_'), businessId: activeBusinessId || '1']
        ↓
[storageRepository.mutateCollection('inventory')]
        ↓
[Write Queue Serialization → Disk Atomic Write → Dual Collection Sync (inventory + stock)]
        ↓
[Reactive State Update: setInventory(latest) → businessInventory recalculation]
```

---

## 2. STOCK ADJUSTMENT WORKFLOW (SCR-22)

```
[User Taps '+ ইন' or '- আউট' on Product Card]
        ↓
[setSelectedProduct(item), setStockAdjustType('in' | 'out'), setModalAdjustStock(true)]
        ↓
[User Inputs Adjustment Quantity (numeric)]
        ↓
[validateStockAdjustment(currentStock, adjustQty, adjustType)]
  ├─ If isNaN(qty) or qty <= 0 → REJECT: 'সঠিক স্টক সমন্বয় পরিমাণ দিন।'
  ├─ If invalid type → REJECT: 'অবৈধ স্টক সমন্বয় ধরন।'
  ├─ If isOut and qty > currentStock → REJECT: 'বর্তমান স্টক থেকে বেশি বাদ দেওয়া সম্ভব নয়।'
  └─ If valid → newStock = isIn ? currentStock + qty : currentStock - qty
        ↓
[storageRepository.mutateCollection('inventory', p => p.id === selectedProduct.id ? {...p, stock: newStock} : p)]
        ↓
[Dual Collection Sync: stock and inventory updated in tandem (DATA-12)]
        ↓
[Reset State: setStockAdjustQty(''), setSelectedProduct(null), setModalAdjustStock(false)]
```

---

## 3. PRODUCT DELETION WORKFLOW

```
[User Taps Delete Icon on Product Card]
        ↓
[Confirmation Alert: 'এই পণ্যটি তালিকা থেকে মুছে ফেলতে চান?']
        ↓
[User Confirms 'মুছুন']
        ↓
[storageRepository.mutateCollection('inventory', items => items.filter(p => p.id !== targetId))]
        ↓
[Continuous Sync updates 'stock' collection simultaneously]
        ↓
[Reactive State Update: Product removed from businessInventory]
```

---

## 4. MULTI-BUSINESS ISOLATION & CASCADING DELETION

- **Data Scoping**:
  - Every product is stamped with `businessId: activeBusinessId || '1'`.
  - `businessInventory = useMemo(() => inventory.filter(i => String(i.businessId || '1') === String(activeBizId)), [inventory, activeBizId])`.
  - Switching business re-filters products instantaneously with zero cross-contamination.
- **Cascading Deletion (`deleteBusinessCascade`)**:
  - When a business is deleted via `deleteBusinessCascade(businessId)`:
    - Products belonging to that business (`String(item.businessId || '1') === targetId`) are completely purged.
    - Products belonging to other businesses remain completely unaffected.
