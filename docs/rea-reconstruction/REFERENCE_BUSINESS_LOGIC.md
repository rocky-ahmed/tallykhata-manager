# REA RECONSTRUCTION — REFERENCE BUSINESS LOGIC
**Target Application:** `TallyKhata-Demo.apk` (`REF-001`)  
**Maintained by:** Main Engineering Orchestrator  
**Status:** SPECIFIED & VERIFIED  

---

## 1. Double-Entry Accounting Invariants (`com.progoti.tallykhata.v2.arch.util.g->i`)

The reference application implements a double-entry bookkeeping engine where every customer/supplier transaction balances against system accounts (`_SALES`, `_PURCHASE`, `_CASH`, `_EXPENSE`).

### 1.1 Customer Transactions
- **Credit Sale (বাকি বিক্রি / কাস্টমারকে দিলাম):**
  - Debit: `orig_account_id` (Customer Receivables increase)
  - Credit: `_SALES` (Revenue increases)
  - Formula: $\text{Balance}_{\text{new}} = \text{Balance}_{\text{old}} + (\text{amount} - \text{amount\_received})$
- **Cash Collection (বাকি আদায় / কাস্টমার থেকে পেলাম):**
  - Debit: `_CASH` (Cash drawer increases)
  - Credit: `orig_account_id` (Customer Receivables decrease)
  - Formula: $\text{Balance}_{\text{new}} = \text{Balance}_{\text{old}} - \text{amount}$

### 1.2 Supplier Transactions
- **Credit Purchase (বাকিতে মাল ক্রয় / মহাজন থেকে পেলাম):**
  - Debit: `_PURCHASE` (Inventory/Cost increases)
  - Credit: `orig_account_id` (Supplier Payables increase)
  - Formula: $\text{Balance}_{\text{new}} = \text{Balance}_{\text{old}} + \text{amount}$
- **Supplier Payment (পাওনা পরিশোধ / মহাজনকে দিলাম):**
  - Debit: `orig_account_id` (Supplier Payables decrease)
  - Credit: `_CASH` (Cash drawer decreases)
  - Formula: $\text{Balance}_{\text{new}} = \text{Balance}_{\text{old}} - \text{amount}$

---

## 2. Upfront Settlement & Cashbox Synchronization
When a merchant records a credit sale with immediate partial cash:
- `amount`: Total sale price (e.g. ৳500).
- `amount_received`: Upfront cash paid on the spot (e.g. ৳200).
- **Net Customer Due Change:** $+৳300$ (500 - 200).
- **Cashbox Drawer Inflow:** $+৳200$ (recorded as linked cashbox entry with `linkedTxnId`).
- **Digital Mode Bypass (`txn_mode === 2`):** Bypasses the physical cash drawer completely. If a transaction is updated from cash to digital, the linked cashbox entry is automatically purged.

---

## 3. Multi-Tenant Composite Key Isolation
To prevent balance bleeding across distinct shops that happen to use identical account IDs (e.g., Account `1` in Shop `A` vs Account `1` in Shop `B`):
- All indexing and recalculation operations construct a composite key:
  $$\text{Key} = \text{businessId} + ":" + \text{accountId}$$
- Balance recalculations and date range queries strictly scope transactions to the active business context.

---

## 4. Integer Paisa Precision Math
To prevent IEEE 754 floating-point errors (e.g., $0.1 + 0.2 = 0.30000000000000004$):
- All monetary operations convert to exact integer Paisa before calculation:
  $$\text{Paisa} = \text{round}(\text{Taka} \times 100)$$
  $$\text{Taka} = \text{round}(\text{Paisa}) / 100$$
- Guaranteed 100% precision up to ৳100,000,000 (10 crore Taka limit).
