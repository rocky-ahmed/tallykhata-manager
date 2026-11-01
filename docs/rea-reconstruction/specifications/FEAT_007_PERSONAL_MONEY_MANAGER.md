# REA RECONSTRUCTION — FEATURE 007 SPECIFICATION
**Feature Name:** Personal Money Manager (Ivy Wallet Architecture Parity)  
**Reference Target:** `TallyKhata-Demo.apk` (`REF-001`) & Ivy Wallet Clean-Room Architecture  
**Target SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Document Version:** 1.0.0  
**Status:** SPECIFICATION APPROVED & VERIFIED  

---

## 1. Executive Summary & Architecture Basis

Feature 007 defines the comprehensive Personal Finance & Money Manager engine for TallyKhata. Engineered following a clean-room reconstruction inspired by the open-source Ivy Wallet architecture, it runs as an isolated personal bookkeeping system completely decoupled from the multi-shop business accounting ledgers.

### Core Architectural Invariants:
1. **Domain Isolation:** Operates under dedicated storage key `@tallykhata_personal_money_manager_v2` with schema version 3, guaranteeing zero cross-contamination with `@tallykhata_state_v6`.
2. **Multi-Wallet Net Worth Invariance:**
   $$\text{NetWorth} = \sum_{w \in \text{Accounts}} w.\text{balance} + \sum_{g \in \text{Goals}} g.\text{savedAmount}$$
   Net worth remains invariant across inter-wallet transfers ($NW_{\text{after}} = NW_{\text{before}}$).
3. **Category Budget Thresholds:**
   - `safe`: $\text{spent} < 80\% \times \text{budget}$
   - `warning`: $80\% \times \text{budget} \le \text{spent} \le \text{budget}$
   - `exceeded`: $\text{spent} > \text{budget}$
   - `no_budget`: $\text{budget} \le 0$
4. **Idempotent Recurring Engine:** Daily, weekly, monthly, and yearly recurring transaction schedules execute safely without double-posting.
5. **Atomic Goal Allocations:** Contributing to or withdrawing from savings goals adjusts the designated wallet balance atomically.

---

## 2. Storage Schema & State Model (Version 3)

### 2.1 State Structure
```javascript
{
  version: 3,
  overallMonthlyBudget: 40000,
  preferences: {
    defaultPeriod: "this_month", // "this_month" | "last_month" | "all_time" | "custom"
    currencySymbol: "৳",
    sortOrder: "newest",         // "newest" | "oldest" | "amount_high" | "amount_low"
    showNetWorthCard: true,
    showSavingsRateCard: true,
    showTipsCard: true,
    customRange: null
  },
  accounts: [
    { id: "acc_cash", name: "নগদ টাকা", type: "cash", balance: 15000, icon: "💵", color: "#10B981", isArchived: false },
    { id: "acc_bank", name: "ব্যাংক হিসাব", type: "bank", balance: 52000, icon: "🏦", color: "#3B82F6", isArchived: false },
    { id: "acc_bkash", name: "বিকাশ ওয়ালেট", type: "mfs", balance: 8500, icon: "📱", color: "#EC4899", isArchived: false },
    { id: "acc_nagad", name: "নগদ ওয়ালেট", type: "mfs", balance: 4200, icon: "💳", color: "#F97316", isArchived: false }
  ],
  categories: [
    { id: "cat_food", name: "খাবার ও মুদি বাজার", type: "expense", icon: "🍲", color: "#EF4444", budget: 15000, isArchived: false },
    { id: "cat_transport", name: "যাতায়াত ও জ্বালানি", type: "expense", icon: "🚌", color: "#F59E0B", budget: 5000, isArchived: false },
    { id: "cat_salary", name: "মাসিক বেতন ও সম্মানী", type: "income", icon: "💰", color: "#10B981", budget: 0, isArchived: false }
  ],
  goals: [
    { id: "goal_1", title: "জরুরি ফান্ড", targetAmount: 50000, savedAmount: 10000, targetDate: "2027-12-31", icon: "🎯", color: "#3B82F6" }
  ],
  recurring: [
    { id: "rec_rent", type: "expense", amount: 12000, categoryId: "cat_utility", accountId: "acc_bank", frequency: "monthly", nextDueDate: "2026-11-01", isActive: true }
  ],
  transactions: [
    { id: "mmtxn_1", type: "income", amount: 60000, categoryId: "cat_salary", accountId: "acc_bank", date: "2026-11-01", time: "10:00 AM", note: "মাসিক বেতন", payee: "অফিস" }
  ],
  updatedAt: "2026-11-02T00:00:00.000Z"
}
```

---

## 3. Core Engine Invariants & Functions (`src/moneyManagerService.js`)

### 3.1 Sanitization & Resilience (`sanitizeState`)
- Gracefully repairs corrupted, partial, or malformed state trees.
- Validates that malformed or non-array transaction collections recover to an empty array `[]` rather than injecting sample demo records.
- Preserves custom user accounts while merging missing default categories.

### 3.2 Wallet Management & Net Worth (`calculateNetWorth`, `addAccount`, `updateAccount`, `archiveAccount`, `deleteAccount`)
- Calculates total net worth across all accounts (active and archived) plus funds allocated to savings goals.
- `updateAccount` enables mutating name, icon, color, type, and balance with 2-decimal monetary rounding.
- Deleting accounts is guarded against accounts with active transaction histories.

### 3.3 Double-Entry Transactions & Atomic Transfers (`addTransaction`, `addTransfer`, `deleteTransaction`)
- **Expense:** Debits wallet balance ($Bal_{new} = Bal_{old} - Amt$), appends expense record.
- **Income:** Credits wallet balance ($Bal_{new} = Bal_{old} + Amt$), appends income record.
- **Transfer:** Atomically debits source wallet and credits target wallet ($Bal_{from} -= Amt$, $Bal_{to} += Amt$), creating an atomic transfer journal.
- **Deletion Rollback:** Deleting a transaction reverses the balance impact on the associated wallet(s) with 100% precision.

### 3.4 Budget Monitoring & Alert Flags (`calculateCategoryBudgets`)
- Evaluates period spending against budget allocations.
- Emits explicit status flags:
  - `status: 'safe'` ($\text{pct} < 80\%$)
  - `status: 'warning'` ($80\% \le \text{pct} \le 100\%$, `isWarning: true`)
  - `status: 'exceeded'` ($\text{pct} > 100\%$, `isOver: true`)
  - `status: 'no_budget'` (`hasBudget: false`)

### 3.5 Recurring Schedules Engine (`calculateNextDueDate`, `processRecurringTransactions`)
- Computes exact forward dates across `daily` (+1 day), `weekly` (+7 days), `monthly` (same day next month), and `yearly` (same date next year).
- Idempotently executes overdue recurring rules up to the target date, updating wallet balances and advancing `nextDueDate`.

### 3.6 Savings Goals (`addGoal`, `contributeToGoal`, `withdrawFromGoal`)
- `addGoal` validates target amount and optional initial allocated amount.
- `contributeToGoal`: Decrements account balance, increments `goal.savedAmount`.
- `withdrawFromGoal`: Increments account balance, decrements `goal.savedAmount`.

### 3.7 Cash Flow Analytics (`calculateCashFlow`)
- Computes aggregate `totalIncome`, `totalExpense`, `totalTransfer`, `netSavings` ($Income - Expense$), and `savingsRate` ($\text{round}((NetSavings / Income) \times 100)$).

---

## 4. Verification & Test Suite Parity

The specification is verified by `test_feature7_money_manager_parity.js`:
- Part 1: Storage schema & state sanitization (3 tests)
- Part 2: Wallets & net worth invariance (2 tests)
- Part 3: Double-entry transactions & atomic transfers (4 tests)
- Part 4: Category budgets & alert status flags (2 tests)
- Part 5: Recurring transactions & schedules (2 tests)
- Part 6: Savings goals allocation (2 tests)
- Part 7: Analytics & cash flow totals (1 test)
- Part 8: Domain isolation & cloud backup (1 test)
- Part 9: Frontend AST integrity (1 test)
- **Total:** 18 / 18 tests passed (100% success).
