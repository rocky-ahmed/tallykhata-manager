# REA REVERSE ENGINEERING INVESTIGATION — ITERATION 224
**Document ID:** `REA_INVESTIGATION_ITER_224_MERCHANT_DASHBOARD_ANALYTICS`  
**Investigator:** Worker 1 (Gibbs) — Principal REA Reverse Engineering Investigator  
**Thread ID:** `01a19154-99ab-72a0-9e23-2611b9ffc74c`  
**Milestone:** `REA-ITER-224`  
**Target Reference Binary:** `D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk` (`REF-001`)  
**SHA-256 Digest:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Binary Size:** 53,969,511 bytes  
**Date of Audit:** 2026-11-04  

---

## 1. Executive Summary & Investigation Scope

Iteration 224 executes an exhaustive reverse-engineering investigation into **Merchant Dashboard Analytics, Digital Inflow Statistics & Real-Time Payment Charts** within the TallyKhata reference ecosystem.

Micro-merchants, grocery shop owners, and retail distributors in Bangladesh receive payments across fragmented payment channels (Bangla QR, bKash, Nagad, Rocket, Upay, Visa, and Mastercard). At the end of each business day, merchants face significant reconciliation challenges without an automated digital inflow dashboard. They require:
1. **Real-Time Digital Inflow Aggregation (মোট ডিজিটাল কালেকশন):** Tracking gross inward revenue, net settlements, and transaction velocity.
2. **Payment Channel Distribution (পেমেন্ট চ্যানেল ভিত্তিক অনুপাত):** Breakdown of collections across bKash, Nagad, Rocket, Upay, and Cards to understand customer payment preferences and fee overheads.
3. **Period-Based Filtering (আজকে, এই সপ্তাহে, এই মাসে, নির্দিষ্ট তারিখ):** Flexible time buckets allowing instant comparison between today's sales, weekly trends, and monthly turnover.
4. **Volume & Average Ticket Metrics (মোট লেনদেন সংখ্যা ও গড় লেনদেন):** Statistical metrics showing average basket size and transaction frequency to assess retail business health.

This investigation extracts concrete bytecode, manifest, layout XML, and string pool evidence from `REF-001` and establishes the definitive technical specification for the reconstructed Merchant Dashboard Analytics subsystem.

---

## 2. Technical Invariants & Verification Matrix

| Component / Layer | Reference Artifact / Symbol | Verified Evidence in REF-001 |
| :--- | :--- | :--- |
| **Reference APK Identity** | `TallyKhata-Demo.apk` | SHA-256: `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`, 53,969,511 bytes |
| **Manifest Report Activities** | Bookkeeping & Inflow Reports | `com.progoti.tallykhata.v2.reports.BakiReportActivity`, `BechaKenaReportActivity`, `CashReportActivity`, `DailyBuySaleReportActivity`, `DailyCashBechaReportActivity`, `DailyCashExpenseReportActivity`, `ExpenseReportActivity`, `MalikReportActivity`, `SmsReportActivity` |
| **Transaction Summary UI** | TallyPay Summary Fragment | `classes4.dex`: `Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/TpTransactionHistorySummaryFragment;` |
| **Summary Response DTO** | Monthly Inflow DTO | `classes4.dex`: `Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/summary/MonthlyTxnResponseDto;` |
| **Transaction Report Model** | Period Report Container | `classes4.dex`: `Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/summary/TxnReport;` |
| **Statement Summary DTO** | Ledger & Inflow Summary | `classes4.dex`: `Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/StatementSummaryDto;` |
| **Summary Data Class** | Transaction Aggregates | `classes4.dex`: `Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/Summary;` |
| **Recent Txn Dashboard** | Inflow Dashboard View | `classes4.dex`: `Lcom/progoti/tallykhata/v2/tallypay/dashboard/TpWalletRecentTransactionFragment;`, `WalletFragment` |
| **Layout XML Resources** | Summary & Report Layouts | `res/layout/fragment_tallypay_transaction_summary.xml`, `layout_tallypay_all_txn_history_and_txn_summary.xml`, `layout_txn_summary.xml`, `adapter_report_download_date_range_selection.xml`, `cashbook_dashboard_item.xml`, `layout_cashbook_dashboard_total.xml`, `shimmer_txn_summary.xml` |
| **Period Tokens in ARSC** | Authentic Bengali Time Periods | `"দৈনিক"`, `"মাসিক"`, `"আজকের ক্যাশ"`, `"আজকের পেমেন্ট"`, `"আজকের বাকি"`, `"আজকের বেচা"`, `"আজকের সংগ্রহ"`, `"আজকের হিসাব"`, `"আজ পেলাম"`, `"এই মাসের ডাটা সার্ভার এ নেই"` |
| **Channel Tokens in ARSC** | MFS & Card Providers | `"বিকাশ"`, `"নগদ"`, `"রকেট"`, `"উপায়"`, `"ভিসা, মাষ্টারকার্ড বা আমেরিকান এক্সপ্রেস কার্ড"` |
| **Inflow & Metric Copy** | Business KPI Strings | `"এখন ডিজিটাল কালেকশন করুন খুব সহজেই।"`, `"কালেকশন"`, `"কালেকশন করতে টালিখাতার কাস্টমার সিলেক্ট করি"`, `"মোট লেনদেনের পরিমাণ লিমিট অতিক্রম করেছে।"`, `"মোট ব্যয়"`, `"মোট লাভ"` |

---

## 3. Bytecode Evidence & Architecture Analysis

### 3.1 Report & Summary Activities in AndroidManifest.xml
The reference application exposes a rich suite of analytics and report activities:
- `com.progoti.tallykhata.v2.reports.BakiReportActivity`: Credit/Receivable aging and outstanding ledger.
- `com.progoti.tallykhata.v2.reports.BechaKenaReportActivity`: Sales vs. Purchase volume reconciliation.
- `com.progoti.tallykhata.v2.reports.CashReportActivity`: Cashbox ledger with daily cash-in vs. cash-out totals.
- `com.progoti.tallykhata.v2.reports.DailyBuySaleReportActivity`: Granular daily sales breakdown.
- `com.progoti.tallykhata.v2.reports.DailyCashBechaReportActivity`: Cash sales velocity monitor.
- `com.progoti.tallykhata.v2.reports.DailyCashExpenseReportActivity`: Operating expense tracking.
- `com.progoti.tallykhata.v2.reports.ExpenseReportActivity`: Categorized expense ledger.
- `com.progoti.tallykhata.v2.reports.MalikReportActivity`: Merchant capital and equity distribution.
- `com.progoti.tallykhata.v2.activities.CustomerReportActivity` & `DailyReportActivity`: Daily merchant financial summaries.
- `com.progoti.tallykhata.v2.activities.MonthlyCashActivity`: Monthly cashflow statements.

### 3.2 TallyPay Transaction Summary Architecture
For digital wallet inflows (TallyPay and Super QR collections), `classes4.dex` implements dedicated summary components:
- **`TpTransactionHistorySummaryFragment`:**
  Presents the top-level digital inflow dashboard containing:
  1. Header period selector (Daily / Monthly / Custom Date Range).
  2. Aggregated totals strip (`layout_txn_summary.xml`).
  3. Channel breakdown cards.
  4. Chronological transaction list.
- **`MonthlyTxnResponseDto` & `TxnReport`:**
  - Server time synchronization (`serverTime`).
  - Month tag (`month`).
  - Total credit transactions count (`creditTxnCount`).
  - Daily credit aggregates (`totalCreditPerDay`).
  - Monthly credit aggregates (`totalCreditPerMonth`).
  - Total debit vs credit limits and usage (`totalDebitCreditLimit`, `totalDebitCreditUsage`, `totalDebitPerMonth`).
- **`StatementSummaryDto` & `Summary`:**
  - Encapsulates `totalCredit` (digital inflow), `totalDebit` (outward transfers/expenses), and `totalTransaction` counts.

### 3.3 Layout Resources & Presentation Layer
The visual structure in `res/layout/` incorporates high-clarity financial cards:
- `fragment_tallypay_transaction_summary.xml`: Container fragment hosting the summary widgets.
- `layout_txn_summary.xml`: Summary header displaying net inflow amount, credit/debit totals, and transaction badges.
- `layout_tallypay_all_txn_history_and_txn_summary.xml`: Master list combining the summary metrics with paginated transaction items.
- `shimmer_txn_summary.xml`: Shimmer loading placeholder for smooth UX during network fetches.
- `adapter_report_download_date_range_selection.xml`: Period selection chips (`দৈনিক`, `মাসিক`, `নির্দিষ্ট তারিখ`).

### 3.4 Authentic Bengali Strings (`resources.arsc`)
- **Digital Inflow:**
  - `"এখন ডিজিটাল কালেকশন করুন খুব সহজেই।"` (Promotes digital collection over cash)
  - `"কালেকশন"` / `"কালেকশন করতে টালিখাতার কাস্টমার সিলেক্ট করি"`
- **Period Tabs:**
  - `"দৈনিক"` (Daily view)
  - `"মাসিক"` (Monthly view)
  - `"আজকের ক্যাশ"`, `"আজকের পেমেন্ট"`, `"আজকের বাকি"`, `"আজকের বেচা"`, `"আজকের সংগ্রহ"`, `"আজকের হিসাব"`
  - `"এই মাসের ডাটা সার্ভার এ নেই"`
- **Channels:**
  - `"বিকাশ"`, `"নগদ"`, `"রকেট"`, `"উপায়"`
- **Aggregates:**
  - `"মোট লেনদেনের পরিমাণ লিমিট অতিক্রম করেছে।"`
  - `"মোট ব্যয়"`, `"মোট লাভ"`

---

## 4. Reconstructed Merchant Analytics & Real-Time Inflow Engine

Based on the verified bytecode models and merchant workflow requirements, the reconstructed analytics engine defines a clean, reactive financial processing pipeline:

```
                            ┌─────────────────────────────────────────┐
                            │    Raw Transaction Ledger (Journals)    │
                            └────────────────────┬────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │        Period Filter Processor          │
                            │ (Today / This Week / This Month / Date) │
                            └────────────────────┬────────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   │                                                           │
                   ▼                                                           ▼
    ┌─────────────────────────────┐                             ┌─────────────────────────────┐
    │     Volume & Totals KPIs    │                             │ Channel Distribution Engine │
    │ ─────────────────────────── │                             │ ─────────────────────────── │
    │ • Gross Inflow (মোট কালেকশন) │                             │ • bKash Inflow & % share    │
    │ • Txn Count (মোট লেনদেন)    │                             │ • Nagad Inflow & % share    │
    │ • Avg Ticket (গড় লেনদেন)    │                             │ • Rocket Inflow & % share   │
    │ • Velocity (লেনদেন/ঘণ্টা)   │                             │ • Upay Inflow & % share     │
    │ • Growth Rate vs Prior Period│                            │ • Cards / Bangla QR share   │
    └──────────────┬──────────────┘                             └──────────────┬──────────────┘
                   │                                                           │
                   └─────────────────────────────┬─────────────────────────────┘
                                                 │
                                                 ▼
                            ┌─────────────────────────────────────────┐
                            │     Merchant Inflow Visualization       │
                            │  (SVG Donut, Progress Bars & KPI Strip) │
                            └─────────────────────────────────────────┘
```

### 4.1 Invariant Data Model Specification
All financial calculations MUST operate on **integer paisa** (1 BDT = 100 Paisa) to completely eliminate 0.00 float drift.

```javascript
/**
 * Channel Distribution Item
 */
type ChannelMetric = {
  channelId: string,          // 'bkash' | 'nagad' | 'rocket' | 'upay' | 'card' | 'bangla_qr'
  channelNameBn: string,      // 'বিকাশ' | 'নগদ' | 'রকেট' | 'উপায়' | 'কার্ড' | 'বাংলা কিউআর'
  totalAmountPaisa: number,   // Integer Paisa
  totalAmountBdt: number,     // totalAmountPaisa / 100
  txnCount: number,           // Number of successful payments
  percentageShare: number,    // 0.00 to 100.00%
  basisPoints: number         // 0 to 10000 bp
};

/**
 * Period Inflow Summary
 */
type InflowSummary = {
  periodKey: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM',
  periodLabelBn: string,      // 'আজকে' | 'এই সপ্তাহে' | 'এই মাসে' | 'নির্দিষ্ট তারিখ'
  startDate: string,          // ISO YYYY-MM-DD
  endDate: string,            // ISO YYYY-MM-DD
  grossInflowPaisa: number,   // Total inward credit
  netInflowPaisa: number,     // Gross minus refunds/service charges
  totalTxnCount: number,      // Count of transactions
  avgTicketPaisa: number,     // Math.round(grossInflowPaisa / totalTxnCount)
  channelBreakdown: ChannelMetric[],
  growthRatePct: number       // Comparison with immediately preceding period
};
```

### 4.2 Mathematical Formulas & Invariants
1. **Average Ticket Size:**
   $$\text{AvgTicketPaisa} = \begin{cases} \lfloor \frac{\text{GrossInflowPaisa}}{\text{TotalTxnCount}} + 0.5 \rfloor, & \text{if } \text{TotalTxnCount} > 0 \\ 0, & \text{otherwise} \end{cases}$$
2. **Channel Share (Basis Points & Percentage):**
   $$\text{BasisPoints}_i = \begin{cases} \lfloor \frac{\text{AmountPaisa}_i \times 10000}{\text{GrossInflowPaisa}} + 0.5 \rfloor, & \text{if } \text{GrossInflowPaisa} > 0 \\ 0, & \text{otherwise} \end{cases}$$
   $$\text{PercentageShare}_i = \frac{\text{BasisPoints}_i}{100}$$
   The sum of all channel shares must strictly equal 100.00% (or 10,000 basis points) with largest-remainder rounding.
3. **Period Growth Rate:**
   $$\text{GrowthRatePct} = \begin{cases} \frac{(\text{CurrentInflow} - \text{PriorInflow}) \times 100.0}{\text{PriorInflow}}, & \text{if } \text{PriorInflow} > 0 \\ 100.0, & \text{if } \text{PriorInflow} = 0 \land \text{CurrentInflow} > 0 \\ 0.0, & \text{otherwise} \end{cases}$$

---

## 5. Verification Test Suite Architecture

The companion automated test suite `test_iteration_224_merchant_dashboard_analytics_reference_architecture.js` validates:
1. **Reference Binary Integrity:** Verifies SHA-256 digest (`267b310e...`) and 53,969,511 byte file size.
2. **Manifest Report Activities:** Asserts presence of report activities (`BakiReportActivity`, `BechaKenaReportActivity`, `CashReportActivity`, `DailyBuySaleReportActivity`, `ExpenseReportActivity`, `MalikReportActivity`, `SmsReportActivity`, etc.).
3. **Layout XML Resources:** Validates existence of `fragment_tallypay_transaction_summary.xml`, `layout_txn_summary.xml`, `layout_tallypay_all_txn_history_and_txn_summary.xml`, and `shimmer_txn_summary.xml`.
4. **DEX Bytecode Parity:** Confirms presence of `TpTransactionHistorySummaryFragment`, `MonthlyTxnResponseDto`, `TxnReport`, `StatementSummaryDto`, `Summary`, and `WalletFragment`.
5. **ARSC Authentic Bengali Resource Strings:** Asserts exact matching of period tokens (`"দৈনিক"`, `"মাসিক"`, `"আজকের ক্যাশ"`, `"আজকের পেমেন্ট"`, `"আজকের বেচা"`, `"আজকের সংগ্রহ"`, `"আজকের হিসাব"`, `"আজ পেলাম"`), channel names (`"বিকাশ"`, `"নগদ"`, `"রকেট"`, `"উপায়"`), and collection strings (`"এখন ডিজিটাল কালেকশন করুন খুব সহজেই।"`).
6. **Analytics Engine Mathematical Invariants:** Tests multi-channel inflow calculations, integer paisa precision, zero float drift, basis-points channel breakdown, period growth rate comparison, and largest-remainder normalization.

---

## 6. Conclusion & Next Steps

This investigation provides the evidence-backed foundation for the Merchant Dashboard Analytics and Real-Time Digital Inflow Charting module. The architecture ensures zero float drift, accurate channel attribution, and authentic Bengali localization aligned with the reference application.
