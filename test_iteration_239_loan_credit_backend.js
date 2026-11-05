/**
 * test_iteration_239_loan_credit_backend.js
 *
 * REA-ITER-239: TallyPay Merchant Digital Micro-Loan, Credit Scoring & EMI Repayment Subsystem
 * Worker: Worker 2 (Averroes / Peirce - Permanent Backend Developer & Business Logic Architect)
 * Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 * Milestone: REA-ITER-239
 */

const assert = require('assert');
const {
  MERCHANT_LOAN_SCHEMA,
  LOAN_TABLE_SCHEMA,
  MERCHANT_LOAN_EMI_SCHEMA,
  LOAN_EMI_TABLE_SCHEMA,
  LOAN_STATUSES,
  LoanStatus,
  MerchantLoanStatus,
  EMI_PAYMENT_STATUSES,
  EmiPaymentStatus,
  LoanEmiStatus,
  CREDIT_SCORE_TIERS,
  CreditScoreTier,
  LOAN_PARTNER_BANKS,
  LoanPartnerBank,
  LOAN_ARSC_TOKENS,
  calculateMerchantCreditScore,
  calculateLoanAmortization,
  calculateEmiLatePenalty,
  transitionLoanStatus,
  MerchantLoanRecord,
  MerchantLoanEmiRecord,
  MerchantLoanDao,
  MerchantLoanEmiDao,
  MerchantLoanEngine,
  ReconstructedLoanEngine,
  LoanEngine,
  merchantLoanEngine,
  reconstructedLoanEngine,
} = require('./src/tallyPayService');

const {
  StorageRepository,
  storageRepository,
  createDefaultState,
  VALID_COLLECTIONS,
  saveMerchantLoan,
  getMerchantLoans,
  getMerchantLoanById,
  updateMerchantLoanStatus,
  updateMerchantLoanRepayment,
  saveMerchantLoanEmis,
  getMerchantLoanEmis,
  recordMerchantLoanEmiPayment,
  getUnsyncedMerchantLoans,
  updateMerchantLoanSyncStatus,
  getUnsyncedMerchantLoanEmis,
  updateMerchantLoanEmiSyncStatus,
  deleteMerchantLoan,
  existsMerchantLoan,
  deleteBusinessCascade,
  getFullBackupState,
  commitRestorePayload,
} = require('./src/storageRepository');

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${name}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function main() {
console.log('==================================================================');
console.log(' REA-ITER-239: TALLYPAY MERCHANT DIGITAL LOAN & EMI BACKEND SUITE');
console.log('==================================================================\n');

// =============================================================================
// GROUP 1: Enums, Constants & Room SQLite Schema Invariants
// =============================================================================
console.log('[GROUP 1: Enums, Constants & Room SQLite Schema Invariants]');

await runTest('Schema defines table merchant_loan with all 20 columns and correct types', () => {
  assert.strictEqual(MERCHANT_LOAN_SCHEMA.tableName, 'merchant_loan');
  assert.strictEqual(MERCHANT_LOAN_SCHEMA.columns.length, 20);
  assert.ok(MERCHANT_LOAN_SCHEMA.columns.includes('loan_id'));
  assert.ok(MERCHANT_LOAN_SCHEMA.columns.includes('principal_paisa'));
  assert.ok(MERCHANT_LOAN_SCHEMA.columns.includes('monthly_emi_paisa'));
  assert.ok(MERCHANT_LOAN_SCHEMA.columns.includes('credit_score'));
  assert.strictEqual(MERCHANT_LOAN_SCHEMA.columnTypes.id, 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL');
  assert.strictEqual(MERCHANT_LOAN_SCHEMA.columnTypes.principal_paisa, 'INTEGER NOT NULL');
});

await runTest('Schema defines unique index index_merchant_loan_loan_id on loan_id', () => {
  const uIdx = MERCHANT_LOAN_SCHEMA.indices.find(i => i.name === 'index_merchant_loan_loan_id');
  assert.ok(uIdx);
  assert.strictEqual(uIdx.unique, true);
  assert.deepStrictEqual(uIdx.columns, ['loan_id']);
  assert.ok(MERCHANT_LOAN_SCHEMA.ddl.includes('CREATE TABLE IF NOT EXISTS merchant_loan'));
});

await runTest('Schema defines table merchant_loan_emi with all 14 columns and indices', () => {
  assert.strictEqual(MERCHANT_LOAN_EMI_SCHEMA.tableName, 'merchant_loan_emi');
  assert.strictEqual(MERCHANT_LOAN_EMI_SCHEMA.columns.length, 14);
  assert.ok(MERCHANT_LOAN_EMI_SCHEMA.columns.includes('emi_id'));
  assert.ok(MERCHANT_LOAN_EMI_SCHEMA.columns.includes('loan_id'));
  assert.ok(MERCHANT_LOAN_EMI_SCHEMA.columns.includes('total_installment_paisa'));
  assert.ok(MERCHANT_LOAN_EMI_SCHEMA.columns.includes('penalty_paisa'));
  const emiIdx = MERCHANT_LOAN_EMI_SCHEMA.indices.find(i => i.name === 'index_merchant_loan_emi_emi_id');
  assert.ok(emiIdx && emiIdx.unique === true);
});

await runTest('LOAN_STATUSES defines all 9 lifecycle states with aliases', () => {
  const expected = ['ELIGIBLE', 'APPLIED', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED', 'ACTIVE', 'PAID_OFF', 'DEFAULTED', 'REJECTED'];
  for (const s of expected) {
    assert.strictEqual(LOAN_STATUSES[s], s);
  }
  assert.strictEqual(LoanStatus, LOAN_STATUSES);
  assert.strictEqual(MerchantLoanStatus, LOAN_STATUSES);
});

await runTest('EMI_PAYMENT_STATUSES defines all 4 states with aliases', () => {
  const expected = ['PENDING', 'OVERDUE', 'PAID', 'AUTO_DEBITED'];
  for (const s of expected) {
    assert.strictEqual(EMI_PAYMENT_STATUSES[s], s);
  }
  assert.strictEqual(EmiPaymentStatus, EMI_PAYMENT_STATUSES);
});

await runTest('CREDIT_SCORE_TIERS defines all 5 tiers with valid score boundaries', () => {
  assert.strictEqual(CREDIT_SCORE_TIERS.POOR.minScore, 300);
  assert.strictEqual(CREDIT_SCORE_TIERS.POOR.isEligible, false);
  assert.strictEqual(CREDIT_SCORE_TIERS.FAIR.minScore, 580);
  assert.strictEqual(CREDIT_SCORE_TIERS.FAIR.maxLoanPaisa, 5000000);
  assert.strictEqual(CREDIT_SCORE_TIERS.GOOD.minScore, 670);
  assert.strictEqual(CREDIT_SCORE_TIERS.EXCELLENT.minScore, 800);
  assert.strictEqual(CREDIT_SCORE_TIERS.EXCELLENT.maxLoanPaisa, 50000000);
});

await runTest('LOAN_PARTNER_BANKS defines 5 scheduled banks with interest and tenure ranges', () => {
  const banks = Object.keys(LOAN_PARTNER_BANKS);
  assert.strictEqual(banks.length, 5);
  assert.ok(banks.includes('BRAC_BANK'));
  assert.ok(banks.includes('CITY_BANK'));
  assert.ok(banks.includes('MUTUAL_TRUST_BANK'));
  assert.ok(banks.includes('PRIME_BANK'));
  assert.ok(banks.includes('IPDC_FINANCE'));
  assert.strictEqual(LOAN_PARTNER_BANKS.BRAC_BANK.interest_rate_bps, 900);
  assert.strictEqual(LOAN_PARTNER_BANKS.BRAC_BANK.processing_fee_bps, 100);
});

await runTest('LOAN_ARSC_TOKENS contains authentic Bengali digital loan copy', () => {
  assert.strictEqual(LOAN_ARSC_TOKENS.LOAN_TITLE, 'ডিজিটাল ঋণ');
  assert.strictEqual(LOAN_ARSC_TOKENS.CREDIT_SCORE, 'আপনার ক্রেডিট স্কোর');
  assert.strictEqual(LOAN_ARSC_TOKENS.MONTHLY_EMI, 'মাসিক কিস্তি (ইএমআই)');
  assert.strictEqual(LOAN_ARSC_TOKENS.AUTO_DEBIT_ACTIVE, 'অটো-ডেবিট সক্রিয় আছে');
});

await runTest('StorageRepository registers merchantLoans and merchantLoanEmis in VALID_COLLECTIONS', () => {
  assert.ok(VALID_COLLECTIONS.has('merchantLoans'));
  assert.ok(VALID_COLLECTIONS.has('merchantLoanEmis'));
});

// =============================================================================
// GROUP 2: Credit Scoring Algorithm (Range 300–850 & Risk Tiers)
// =============================================================================
console.log('\n[GROUP 2: Credit Scoring Algorithm (Range 300–850 & Risk Tiers)]');

await runTest('Calculates maximum credit score (850) for prime merchant profile', () => {
  const res = calculateMerchantCreditScore({
    averageMonthlyTurnoverPaisa: 15000000, // ৳150,000
    activeDaysLast30: 28,
    debtCollectionRecoveryRate: 0.90,
    averageWalletBalancePaisa: 2500000,
    priorDefaultCount: 0,
    priorOnTimeRepayments: 6
  });
  assert.strictEqual(res.score, 850);
  assert.strictEqual(res.tier, 'EXCELLENT');
  assert.strictEqual(res.label_bn, 'চমৎকার');
  assert.strictEqual(res.isEligible, true);
  assert.strictEqual(res.maxLoanAmountPaisa, 50000000);
  assert.strictEqual(res.factors.turnoverPoints, 180);
  assert.strictEqual(res.factors.regularityPoints, 140);
  assert.strictEqual(res.factors.debtRecoveryPoints, 130);
  assert.strictEqual(res.factors.walletPoints, 70);
  assert.strictEqual(res.factors.onTimeBonus, 30);
  assert.strictEqual(res.factors.defaultPenalty, 0);
});

await runTest('Calculates minimum score (300) when all metrics are zero or severely defaulted', () => {
  const zeroRes = calculateMerchantCreditScore({});
  assert.strictEqual(zeroRes.score, 300);
  assert.strictEqual(zeroRes.tier, 'POOR');
  assert.strictEqual(zeroRes.isEligible, false);
  assert.strictEqual(zeroRes.maxLoanAmountPaisa, 0);

  const defRes = calculateMerchantCreditScore({
    averageMonthlyTurnoverPaisa: 10000000,
    activeDaysLast30: 25,
    debtCollectionRecoveryRate: 0.8,
    averageWalletBalancePaisa: 1000000,
    priorDefaultCount: 5 // -600 penalty
  });
  assert.strictEqual(defRes.score, 300);
  assert.strictEqual(defRes.tier, 'POOR');
});

await runTest('Correctly classifies GOOD and FAIR tiers based on intermediate metrics', () => {
  const fairRes = calculateMerchantCreditScore({
    averageMonthlyTurnoverPaisa: 4000000, // 40% = 72 pts
    activeDaysLast30: 18, // 72% = 101 pts
    debtCollectionRecoveryRate: 0.60, // 75% = 98 pts
    averageWalletBalancePaisa: 500000 // 50% = 35 pts
    // Raw: 300 + 72 + 101 + 98 + 35 = 606 (FAIR)
  });
  assert.ok(fairRes.score >= 580 && fairRes.score < 670);
  assert.strictEqual(fairRes.tier, 'FAIR');
  assert.strictEqual(fairRes.isEligible, true);
  assert.strictEqual(fairRes.maxLoanAmountPaisa, 5000000);

  const goodRes = calculateMerchantCreditScore({
    averageMonthlyTurnoverPaisa: 7500000, // 75% = 135 pts
    activeDaysLast30: 22, // 88% = 123 pts
    debtCollectionRecoveryRate: 0.70, // 88% = 114 pts
    averageWalletBalancePaisa: 600000, // 60% = 42 pts
    priorOnTimeRepayments: 2 // +10
    // Raw: 300 + 135 + 123 + 114 + 42 + 10 = 724 (GOOD)
  });
  assert.ok(goodRes.score >= 670 && goodRes.score < 740);
  assert.strictEqual(goodRes.tier, 'GOOD');
  assert.strictEqual(goodRes.isEligible, true);
  assert.strictEqual(goodRes.maxLoanAmountPaisa, 15000000);
});

// =============================================================================
// GROUP 3: Amortization & EMI Schedule Engine (Exact Integer Paisa Arithmetic)
// =============================================================================
console.log('\n[GROUP 3: Amortization & EMI Schedule Engine (Exact Integer Paisa Arithmetic)]');

await runTest('Calculates reducing-balance EMI schedule with 100% exact principal return (zero drift)', () => {
  const amort = calculateLoanAmortization({
    principalPaisa: 10000000, // ৳100,000
    interestRateBps: 900, // 9.00%
    tenureMonths: 12,
    processingFeeBps: 150 // 1.50%
  });

  assert.strictEqual(amort.principalPaisa, 10000000);
  assert.strictEqual(amort.processingFeePaisa, 150000); // ৳1,500
  assert.strictEqual(amort.disbursedPaisa, 9850000); // ৳98,500
  assert.strictEqual(amort.schedule.length, 12);
  assert.strictEqual(amort.isExact, true);
  assert.strictEqual(amort.totalPrincipalReturned, amort.principalPaisa);
  assert.ok(amort.totalPayablePaisa > amort.principalPaisa);
  assert.strictEqual(amort.totalPayablePaisa, amort.principalPaisa + amort.totalInterestPaisa);

  // Verify each installment components
  for (const s of amort.schedule) {
    assert.strictEqual(s.totalInstallmentPaisa, s.principalComponentPaisa + s.interestComponentPaisa);
    assert.ok(Number.isInteger(s.principalComponentPaisa));
    assert.ok(Number.isInteger(s.interestComponentPaisa));
    assert.ok(Number.isInteger(s.totalInstallmentPaisa));
  }
  // Final month remaining principal must be 0
  assert.strictEqual(amort.schedule[11].remainingPrincipalPaisa, 0);
});

await runTest('Calculates 0% interest rate loan without division by zero', () => {
  const zeroAmort = calculateLoanAmortization({
    principalPaisa: 6000000, // ৳60,000
    interestRateBps: 0,
    tenureMonths: 6,
    processingFeeBps: 100
  });
  assert.strictEqual(zeroAmort.totalInterestPaisa, 0);
  assert.strictEqual(zeroAmort.monthlyEmiPaisa, 1000000); // ৳10,000
  assert.strictEqual(zeroAmort.totalPayablePaisa, 6000000);
  assert.strictEqual(zeroAmort.totalPrincipalReturned, 6000000);
});

await runTest('Rejects non-positive or non-integer inputs with descriptive errors', () => {
  assert.throws(() => calculateLoanAmortization({ principalPaisa: -500, interestRateBps: 900, tenureMonths: 6 }), /positive integer/);
  assert.throws(() => calculateLoanAmortization({ principalPaisa: 500.5, interestRateBps: 900, tenureMonths: 6 }), /positive integer/);
  assert.throws(() => calculateLoanAmortization({ principalPaisa: 50000, interestRateBps: -10, tenureMonths: 6 }), /non-negative integer/);
  assert.throws(() => calculateLoanAmortization({ principalPaisa: 50000, interestRateBps: 900, tenureMonths: 0 }), /positive integer/);
});

// =============================================================================
// GROUP 4: Late Payment Penalty & Days Overdue Calculator
// =============================================================================
console.log('\n[GROUP 4: Late Payment Penalty & Days Overdue Calculator]');

await runTest('Calculates zero penalty for non-overdue EMI or paid installment', () => {
  const emiNotDue = {
    due_date: '2026-12-01',
    total_installment_paisa: 1000000,
    payment_status: 'PENDING'
  };
  const penaltyNotDue = calculateEmiLatePenalty(emiNotDue, '2026-11-15');
  assert.strictEqual(penaltyNotDue, 0);

  const emiPaid = {
    due_date: '2026-10-01',
    total_installment_paisa: 1000000,
    payment_status: 'PAID'
  };
  const penaltyPaid = calculateEmiLatePenalty(emiPaid, '2026-11-15');
  assert.strictEqual(penaltyPaid, 0);
});

await runTest('Calculates 200 bps monthly penalty and caps at 10% maximum', () => {
  const emiOverdue = {
    due_date: '2026-10-01',
    total_installment_paisa: 1000000, // ৳10,000
    payment_status: 'PENDING'
  };
  // 30 days overdue -> 2% = 20,000 paisa
  const penalty30Days = calculateEmiLatePenalty(emiOverdue, '2026-10-31');
  assert.strictEqual(penalty30Days, 20000);

  // 180 days overdue -> calculated 120,000 paisa, but capped at 10% = 100,000 paisa
  const penalty180Days = calculateEmiLatePenalty(emiOverdue, '2027-03-30');
  assert.strictEqual(penalty180Days, 100000);
});

// =============================================================================
// GROUP 5: Loan Lifecycle State Machine (FSM)
// =============================================================================
console.log('\n[GROUP 5: Loan Lifecycle State Machine (FSM)]');

await runTest('Allows standard forward progression: ELIGIBLE -> APPLIED -> UNDER_REVIEW -> APPROVED -> DISBURSED -> ACTIVE', () => {
  assert.strictEqual(transitionLoanStatus('ELIGIBLE', 'APPLIED').newStatus, 'APPLIED');
  assert.strictEqual(transitionLoanStatus('APPLIED', 'UNDER_REVIEW').newStatus, 'UNDER_REVIEW');
  assert.strictEqual(transitionLoanStatus('UNDER_REVIEW', 'APPROVED').newStatus, 'APPROVED');
  assert.strictEqual(transitionLoanStatus('APPROVED', 'DISBURSED').newStatus, 'DISBURSED');
  assert.strictEqual(transitionLoanStatus('DISBURSED', 'ACTIVE').newStatus, 'ACTIVE');
});

await runTest('Allows transition to PAID_OFF only when remaining_paisa is zero', () => {
  assert.strictEqual(transitionLoanStatus('ACTIVE', 'PAID_OFF', { remaining_paisa: 0 }).newStatus, 'PAID_OFF');
  assert.throws(() => transitionLoanStatus('ACTIVE', 'PAID_OFF', { remaining_paisa: 5000 }), /remaining_paisa is 5000/);
});

await runTest('Allows rejection from APPLIED or UNDER_REVIEW and defaults from ACTIVE', () => {
  assert.strictEqual(transitionLoanStatus('APPLIED', 'REJECTED').newStatus, 'REJECTED');
  assert.strictEqual(transitionLoanStatus('UNDER_REVIEW', 'REJECTED').newStatus, 'REJECTED');
  assert.strictEqual(transitionLoanStatus('ACTIVE', 'DEFAULTED').newStatus, 'DEFAULTED');
  assert.strictEqual(transitionLoanStatus('DEFAULTED', 'PAID_OFF', { remaining_paisa: 0 }).newStatus, 'PAID_OFF');
});

await runTest('Rejects illegal status transitions and transitions from terminal states', () => {
  assert.throws(() => transitionLoanStatus('ELIGIBLE', 'DISBURSED'), /Illegal loan status transition/);
  assert.throws(() => transitionLoanStatus('ACTIVE', 'APPLIED'), /Illegal loan status transition/);
  assert.throws(() => transitionLoanStatus('PAID_OFF', 'ACTIVE'), /Illegal loan status transition/);
  assert.throws(() => transitionLoanStatus('REJECTED', 'APPROVED'), /Illegal loan status transition/);
  assert.throws(() => transitionLoanStatus('UNKNOWN', 'ACTIVE'), /Invalid current loan status/);
});

// =============================================================================
// GROUP 6: In-Memory Records & DAO Operations
// =============================================================================
console.log('\n[GROUP 6: In-Memory Records & DAO Operations]');

await runTest('MerchantLoanDao performs full CRUD with auto-increment ID and unique loan_id', () => {
  const dao = new MerchantLoanDao();
  const saved = dao.saveLoan({
    loan_id: 'TK-LN-TEST-001',
    business_id: 'biz_001',
    principal_paisa: 5000000,
    total_payable_paisa: 5200000,
    remaining_paisa: 5200000
  });

  assert.strictEqual(saved.id, 1);
  assert.strictEqual(dao.exists('TK-LN-TEST-001'), true);
  assert.strictEqual(dao.getLoanById('TK-LN-TEST-001').business_id, 'biz_001');

  // Upsert
  dao.saveLoan({
    loan_id: 'TK-LN-TEST-001',
    business_id: 'biz_001',
    principal_paisa: 5000000,
    total_payable_paisa: 5200000,
    credit_score: 750
  });
  assert.strictEqual(dao.getLoanById('TK-LN-TEST-001').credit_score, 750);
  assert.strictEqual(dao.loans.length, 1);

  // Update repayment
  const repaid = dao.updateLoanRepayment('TK-LN-TEST-001', 1000000);
  assert.strictEqual(repaid.paid_paisa, 1000000);
  assert.strictEqual(repaid.remaining_paisa, 4200000);
  assert.strictEqual(repaid.synced, 0);

  // Sync lifecycle
  assert.strictEqual(dao.getUnsyncedLoans().length, 1);
  dao.updateLoanSyncStatus('TK-LN-TEST-001', 1);
  assert.strictEqual(dao.getUnsyncedLoans().length, 0);

  // Delete
  assert.strictEqual(dao.deleteLoan('TK-LN-TEST-001'), true);
  assert.strictEqual(dao.exists('TK-LN-TEST-001'), false);
});

await runTest('MerchantLoanEmiDao performs batch save and payment recording', () => {
  const emiDao = new MerchantLoanEmiDao();
  const emis = [
    { emi_id: 'EMI-001', loan_id: 'LN-001', business_id: 'biz_001', installment_number: 1, total_installment_paisa: 100000 },
    { emi_id: 'EMI-002', loan_id: 'LN-001', business_id: 'biz_001', installment_number: 2, total_installment_paisa: 100000 }
  ];
  const savedEmis = emiDao.saveEmis(emis);
  assert.strictEqual(savedEmis.length, 2);
  assert.strictEqual(emiDao.getEmisByLoanId('LN-001').length, 2);

  const pending = emiDao.getPendingEmisByBusinessId('biz_001');
  assert.strictEqual(pending.length, 2);

  emiDao.recordEmiPayment('EMI-001', {
    paidDate: '2026-11-05',
    transactionReference: 'TXN-001',
    penaltyPaisa: 0
  });
  const emi1 = emiDao.getEmiById('EMI-001');
  assert.strictEqual(emi1.payment_status, 'PAID');
  assert.strictEqual(emi1.transaction_reference, 'TXN-001');
  assert.strictEqual(emiDao.getPendingEmisByBusinessId('biz_001').length, 1);
});

// =============================================================================
// GROUP 7: End-to-End Loan Application, Disbursement & Repayment Engine
// =============================================================================
console.log('\n[GROUP 7: End-to-End Loan Application, Disbursement & Repayment Engine]');

await runTest('Applies for digital loan with prime credit score and receives auto-approval', () => {
  const engine = new MerchantLoanEngine();
  const appResult = engine.applyForLoan({
    businessId: 'biz_prime',
    partnerBankCode: 'BRAC_BANK',
    requestedAmountPaisa: 20000000, // ৳200,000
    tenureMonths: 12,
    businessMetrics: {
      averageMonthlyTurnoverPaisa: 12000000,
      activeDaysLast30: 27,
      debtCollectionRecoveryRate: 0.85,
      averageWalletBalancePaisa: 1500000
    }
  });

  assert.strictEqual(appResult.success, true);
  assert.strictEqual(appResult.loan.loan_status, 'APPROVED'); // Auto-approved due to score >= 700
  assert.strictEqual(appResult.loan.principal_paisa, 20000000);
  assert.strictEqual(appResult.emis.length, 12);
  assert.strictEqual(appResult.amortization.isExact, true);
});

await runTest('Rejects loan application when requested amount exceeds credit tier limit', () => {
  const engine = new MerchantLoanEngine();
  const appResult = engine.applyForLoan({
    businessId: 'biz_fair',
    partnerBankCode: 'CITY_BANK',
    requestedAmountPaisa: 20000000, // ৳200,000 (Fair tier limit is ৳50,000)
    tenureMonths: 12,
    businessMetrics: {
      averageMonthlyTurnoverPaisa: 3500000,
      activeDaysLast30: 18,
      debtCollectionRecoveryRate: 0.60,
      averageWalletBalancePaisa: 300000
    }
  });

  assert.strictEqual(appResult.success, false);
  assert.strictEqual(appResult.reason, 'EXCEEDS_CREDIT_LIMIT');
});

await runTest('Disburses loan, credits wallet, and executes sequential wallet EMI repayments to payoff', () => {
  const engine = new MerchantLoanEngine();
  const wallet = { balancePaisa: 5000000 }; // Initial working capital in wallet

  // 1. Apply
  const app = engine.applyForLoan({
    businessId: 'biz_lifecycle',
    partnerBankCode: 'BRAC_BANK',
    requestedAmountPaisa: 6000000, // ৳60,000
    tenureMonths: 3,
    businessMetrics: {
      averageMonthlyTurnoverPaisa: 10000000,
      activeDaysLast30: 25,
      debtCollectionRecoveryRate: 0.8,
      averageWalletBalancePaisa: 1000000
    }
  });
  const loanId = app.loan.loan_id;

  // 2. Disburse
  const disburseRes = engine.disburseLoan({
    businessId: 'biz_lifecycle',
    loanId,
    walletAccount: wallet
  });
  assert.strictEqual(disburseRes.success, true);
  assert.strictEqual(disburseRes.loan.loan_status, 'ACTIVE');
  assert.strictEqual(wallet.balancePaisa, 5000000 + app.loan.disbursed_paisa);

  // 3. Repay EMI 1
  const emi1 = app.emis[0];
  const repay1 = engine.repayEmiFromWallet({
    businessId: 'biz_lifecycle',
    loanId,
    emiId: emi1.emi_id,
    walletAccount: wallet
  });
  assert.strictEqual(repay1.success, true);
  assert.strictEqual(repay1.emi.payment_status, 'AUTO_DEBITED');
  assert.strictEqual(repay1.loan.paid_paisa, emi1.total_installment_paisa);

  // 4. Repay EMI 2
  const emi2 = app.emis[1];
  const repay2 = engine.repayEmiFromWallet({
    businessId: 'biz_lifecycle',
    loanId,
    emiId: emi2.emi_id,
    walletAccount: wallet
  });
  assert.strictEqual(repay2.success, true);

  // 5. Repay final EMI 3
  const emi3 = app.emis[2];
  const repay3 = engine.repayEmiFromWallet({
    businessId: 'biz_lifecycle',
    loanId,
    emiId: emi3.emi_id,
    walletAccount: wallet
  });
  assert.strictEqual(repay3.success, true);
  assert.strictEqual(repay3.loan.remaining_paisa, 0);
  assert.strictEqual(repay3.loan.loan_status, 'PAID_OFF');

  // Verify summary
  const summary = engine.getLoanSummary('biz_lifecycle', loanId);
  assert.strictEqual(summary.paidEmisCount, 3);
  assert.strictEqual(summary.pendingEmisCount, 0);
  assert.strictEqual(summary.repaymentProgressPercent, 100);
});

await runTest('Rejects wallet EMI repayment when wallet balance is insufficient', () => {
  const engine = new MerchantLoanEngine();
  const wallet = { balancePaisa: 500 }; // ৳5 only

  const app = engine.applyForLoan({
    businessId: 'biz_insuf',
    partnerBankCode: 'IPDC_FINANCE',
    requestedAmountPaisa: 1000000,
    tenureMonths: 3,
    businessMetrics: { averageMonthlyTurnoverPaisa: 10000000, activeDaysLast30: 25, debtCollectionRecoveryRate: 0.8 }
  });

  const res = engine.repayEmiFromWallet({
    businessId: 'biz_insuf',
    loanId: app.loan.loan_id,
    emiId: app.emis[0].emi_id,
    walletAccount: wallet
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'INSUFFICIENT_WALLET_BALANCE');
});

// =============================================================================
// GROUP 8: StorageRepository Multi-Tenant Persistence & CRUD
// =============================================================================
console.log('\n[GROUP 8: StorageRepository Multi-Tenant Persistence & CRUD]');

await runTest('StorageRepository saves, retrieves, and filters loans and EMIs', async () => {
  const repo = new StorageRepository();
  await repo.init();

  const saveRes = await repo.saveMerchantLoan('biz_repo_1', {
    loan_id: 'LN-REPO-001',
    partner_bank: 'BRAC_BANK',
    principal_paisa: 5000000,
    total_payable_paisa: 5200000,
    remaining_paisa: 5200000,
    loan_status: 'ACTIVE'
  });
  assert.strictEqual(saveRes.success, true);

  const fetched = repo.getMerchantLoanById('biz_repo_1', 'LN-REPO-001');
  assert.ok(fetched);
  assert.strictEqual(fetched.partner_bank, 'BRAC_BANK');
  assert.strictEqual(repo.existsMerchantLoan('biz_repo_1', 'LN-REPO-001'), true);

  // Save EMIs
  const emis = [
    { emi_id: 'EMI-REPO-001', installment_number: 1, total_installment_paisa: 2600000 },
    { emi_id: 'EMI-REPO-002', installment_number: 2, total_installment_paisa: 2600000 }
  ];
  await repo.saveMerchantLoanEmis('biz_repo_1', 'LN-REPO-001', emis);
  const fetchedEmis = repo.getMerchantLoanEmis('biz_repo_1', 'LN-REPO-001');
  assert.strictEqual(fetchedEmis.length, 2);

  // Record EMI payment
  const emiPayRes = await repo.recordMerchantLoanEmiPayment('biz_repo_1', 'LN-REPO-001', 'EMI-REPO-001', {
    paymentStatus: 'PAID',
    paidDate: '2026-11-05'
  });
  assert.strictEqual(emiPayRes.success, true);

  const updatedLoan = repo.getMerchantLoanById('biz_repo_1', 'LN-REPO-001');
  assert.strictEqual(updatedLoan.paid_paisa, 2600000);
  assert.strictEqual(updatedLoan.remaining_paisa, 2600000);
});

// =============================================================================
// GROUP 9: Multi-Tenant Business Isolation & Cascade Deletion
// =============================================================================
console.log('\n[GROUP 9: Multi-Tenant Business Isolation & Cascade Deletion]');

await runTest('Strict business isolation: loans of Tenant A are invisible to Tenant B', async () => {
  const repo = new StorageRepository();
  await repo.init();

  await repo.saveMerchantLoan('tenant_A', { loan_id: 'LN-A-01', principal_paisa: 1000000 });
  await repo.saveMerchantLoan('tenant_B', { loan_id: 'LN-B-01', principal_paisa: 2000000 });

  const loansA = repo.getMerchantLoans('tenant_A');
  const loansB = repo.getMerchantLoans('tenant_B');

  assert.strictEqual(loansA.length, 1);
  assert.strictEqual(loansA[0].loan_id, 'LN-A-01');
  assert.strictEqual(loansB.length, 1);
  assert.strictEqual(loansB[0].loan_id, 'LN-B-01');

  assert.strictEqual(repo.getMerchantLoanById('tenant_A', 'LN-B-01'), null);
});

await runTest('deleteBusinessCascade purges loans and EMIs for deleted business only', async () => {
  const repo = new StorageRepository();
  await repo.init();

  await repo.mutateStore((s) => ({
    ...s,
    businesses: [
      ...(s.businesses || []),
      { id: 'tenant_del', name: 'Tenant Del', isArchived: false },
      { id: 'tenant_keep', name: 'Tenant Keep', isArchived: false }
    ],
  }));

  await repo.saveMerchantLoan('tenant_del', { loan_id: 'LN-DEL-01' });
  await repo.saveMerchantLoanEmis('tenant_del', 'LN-DEL-01', [{ emi_id: 'EMI-DEL-01' }]);
  await repo.saveMerchantLoan('tenant_keep', { loan_id: 'LN-KEEP-01' });

  await repo.deleteBusinessCascade('tenant_del');

  assert.strictEqual(repo.getMerchantLoans('tenant_del').length, 0);
  assert.strictEqual(repo.getMerchantLoanEmis('tenant_del', 'LN-DEL-01').length, 0);
  assert.strictEqual(repo.getMerchantLoans('tenant_keep').length, 1);
});

// =============================================================================
// GROUP 10: Cloud Backup Sanitization & High-Throughput Performance Benchmark
// =============================================================================
console.log('\n[GROUP 10: Cloud Backup Sanitization & High-Throughput Performance Benchmark]');

await runTest('getFullBackupState scrubs credentials and tracks recordCounts', async () => {
  const repo = new StorageRepository();
  await repo.init();

  await repo.saveMerchantLoan('tenant_bk', {
    loan_id: 'LN-BK-01',
    bank_credential: 'SECRET_API_TOKEN',
    pin: '1234'
  });
  await repo.saveMerchantLoanEmis('tenant_bk', 'LN-BK-01', [{
    emi_id: 'EMI-BK-01',
    token: 'BEARER_TOKEN'
  }]);

  const backupState = await repo.getFullBackupState();
  assert.ok(backupState.merchantLoans);
  assert.ok(backupState.merchantLoanEmis);
  assert.strictEqual(backupState.merchantLoans[0].bank_credential, undefined);
  assert.strictEqual(backupState.merchantLoans[0].pin, undefined);
  assert.strictEqual(backupState.merchantLoanEmis[0].token, undefined);
});

await runTest('High-throughput performance benchmark: executes 1,000 loan operations in < 1000ms', () => {
  const engine = new MerchantLoanEngine();
  const startTime = Date.now();

  for (let i = 0; i < 1000; i++) {
    engine.applyForLoan({
      businessId: `biz_${i % 10}`,
      partnerBankCode: 'BRAC_BANK',
      requestedAmountPaisa: 5000000,
      tenureMonths: 6,
      businessMetrics: {
        averageMonthlyTurnoverPaisa: 8000000,
        activeDaysLast30: 25,
        debtCollectionRecoveryRate: 0.8
      }
    });
  }

  const duration = Date.now() - startTime;
  console.log(`  (Executed 1,000 complete loan applications in ${duration}ms)`);
  assert.ok(duration < 1000, `Benchmark exceeded 1000ms budget: ${duration}ms`);
});

console.log('\n==================================================================');
console.log(` ALL ${passedTests}/${totalTests} BACKEND TESTS PASSED SUCCESSFULLY! (100% PASS RATE)`);
console.log('==================================================================\n');
}

main().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
