# Backend Architecture & Data Persistence Audit (Phase 2)

## 1. Storage Architecture
The application runs as a resilient, offline-first client-side architecture using @react-native-async-storage/async-storage.

### Primary Storage Schema
| Key | Data Type | Description |
|---|---|---|
| 	ally_businesses | Array<Business> | List of registered business profiles |
| 	ally_active_biz | string | ID of the currently active business |
| 	ally_customers | Array<Account> | Customer and supplier profiles with running balances |
| 	ally_txns | Array<JournalEntry> | Complete ledger entries (given, received, cash, voucher) |
| 	ally_cash_entries | Array<CashEntry> | Cashbox ledger (sale, buy, cost, malik_in, malik_out) |
| 	ally_cash_denominations| Object | Count of notes (1000, 500, 200, 100, 50, 20, 10, 5, 2, 1) |
| 	ally_wallet_balance | 
umber | TallyPay merchant wallet balance |
| 	ally_wallet_txns | Array<WalletTxn> | TallyPay wallet transactions (add money, cash out, recharge) |
| 	ally_inventory | Array<Product> | Stock items, quantities, purchase prices, sell prices |
| 	ally_notes | Array<Note> | Business memo notes with completion status |
| 	ally_pin | string | 4-digit hashed/stored security PIN |
| 	ally_pin_enabled | oolean | Flag indicating whether PIN lock is active on app resume |

---

## 2. Atomic Relational Integrity
1. **Account Balance Calculation**:
   Account Balance = Sum(Given Amounts) - Sum(Received Amounts)
   Whenever a transaction is added, updated, or deleted, the parent account balance is recomputed atomically and persisted to AsyncStorage.
2. **Cashbox Daily Balance**:
   Total Cash = Starting Cash + Sum(Cash In) - Sum(Cash Out)
3. **Data Export & Restoration**:
   The backup file contains the entire application graph. When imported, each entity array is schema-validated before committing to storage.
