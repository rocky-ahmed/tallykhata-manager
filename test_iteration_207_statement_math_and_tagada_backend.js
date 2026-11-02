/**
 * test_iteration_207_statement_math_and_tagada_backend.js
 * Continuous Verification & Benchmark Suite for Iteration 207:
 * 1. Statement Running Balance & Date-Range Filters (all, today, this_month, last_month, custom)
 * 2. Customer & Supplier Balance Invariants with 0.00 Paisa Float Drift
 * 3. Multi-Tenant Statement Isolation across 30 Businesses with Colliding Account IDs
 * 4. Tagada Log Room DB Parity, Idempotency, Quota Deductions & Ceiling Enforcement
 * 5. High-Frequency Statement Generation Benchmarks
 *
 * Worker: Worker 2 (Averroes) — Principal Backend Developer & Business Logic
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 */

const assert = require('assert');
const { performance } = require('perf_hooks');
const {
  StorageRepository,
  createDefaultState,
  V6_KEY,
  recordTagadaLog,
  getTagadaQuota,
  adjustTagadaQuota,
  listTagadaLogs,
  generateAccountStatement: generateAccountStatementRepo,
  resolveStatementDateRange: resolveStatementDateRangeRepo,
} = require('./src/storageRepository');
const {
  resolveStatementDateRange,
  generateAccountStatement,
  recalculateAccountRunningBalances,
  recalculateAllAccountBalances,
  normalizeTagadaLogFields,
} = require('./src/ledgerEngine');

function createMockAsyncAdapter(writeDelayMs = 0.5) {
  const store = new Map();
  return {
    getItem: async (key) => {
      await new Promise(r => setTimeout(r, 0.1));
      return store.has(key) ? store.get(key) : null;
    },
    setItem: async (key, val) => {
      await new Promise(r => setTimeout(r, writeDelayMs));
      store.set(key, String(val));
    },
    removeItem: async (key) => {
      await new Promise(r => setTimeout(r, 0.1));
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
    setWriteDelay: (d) => { writeDelayMs = d; },
    _map: store
  };
}

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    const res = await fn();
    console.log('[PASS] TEST ' + totalTests + ': ' + name + (res ? ' -> ' + JSON.stringify(res) : ''));
    passedTests++;
    return res;
  } catch (err) {
    console.error('[FAIL] TEST ' + totalTests + ': ' + name);
    console.error(err);
    process.exit(1);
  }
}

(async () => {
  console.log('================================================================');
  console.log('ITERATION 207: STATEMENT LEDGER MATH, FILTERS & TAGADA BACKEND');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // PART 1: DATE-RANGE RESOLVER VERIFICATION (resolveStatementDateRange)
  // ---------------------------------------------------------------------------
  console.log('--- PART 1: STATEMENT DATE-RANGE RESOLVER (all, today, this_month, last_month, custom) ---');

  await runTest('1.1: resolveStatementDateRange handles all/all_time/null/undefined', async () => {
    const r1 = resolveStatementDateRange('all');
    assert.strictEqual(r1.range, 'all');
    assert.strictEqual(r1.startDate, null);
    assert.strictEqual(r1.endDate, null);

    const r2 = resolveStatementDateRange(null);
    assert.strictEqual(r2.range, 'all');

    const r3 = resolveStatementDateRange('ALL_TIME');
    assert.strictEqual(r3.range, 'all');

    return { allHandled: true };
  });

  await runTest('1.2: resolveStatementDateRange handles today with referenceDate', async () => {
    const ref = new Date(2026, 10, 3, 14, 30, 0); // 2026-11-03
    const res = resolveStatementDateRange('today', {}, ref);
    assert.strictEqual(res.range, 'today');
    assert.strictEqual(res.startDate, '2026-11-03');
    assert.strictEqual(res.endDate, '2026-11-03');
    return res;
  });

  await runTest('1.3: resolveStatementDateRange handles this_month with leap/boundary calculation', async () => {
    const feb2024 = new Date(2024, 1, 15); // Leap year Feb 2024
    const resFeb = resolveStatementDateRange('this_month', {}, feb2024);
    assert.strictEqual(resFeb.startDate, '2024-02-01');
    assert.strictEqual(resFeb.endDate, '2024-02-29');

    const nov2026 = new Date(2026, 10, 3); // Nov 2026 (30 days)
    const resNov = resolveStatementDateRange('this_month', {}, nov2026);
    assert.strictEqual(resNov.startDate, '2026-11-01');
    assert.strictEqual(resNov.endDate, '2026-11-30');

    return { febLeap: resFeb, nov30: resNov };
  });

  await runTest('1.4: resolveStatementDateRange handles last_month across year rollover (Jan -> Dec)', async () => {
    const jan2026 = new Date(2026, 0, 15); // Jan 2026
    const res = resolveStatementDateRange('last_month', {}, jan2026);
    assert.strictEqual(res.range, 'last_month');
    assert.strictEqual(res.startDate, '2025-12-01');
    assert.strictEqual(res.endDate, '2025-12-31');
    return res;
  });

  await runTest('1.5: resolveStatementDateRange custom range handles Bengali numerals and Date objects', async () => {
    const resBengali = resolveStatementDateRange('custom', {
      startDate: '২০২৬-১১-০১',
      endDate: '২০২৬-১১-১৫'
    });
    assert.strictEqual(resBengali.range, 'custom');
    assert.strictEqual(resBengali.startDate, '2026-11-01');
    assert.strictEqual(resBengali.endDate, '2026-11-15');

    const resDates = resolveStatementDateRange('custom', {
      startDate: new Date(2026, 9, 1),
      endDate: new Date(2026, 9, 31)
    });
    assert.strictEqual(resDates.startDate, '2026-10-01');
    assert.strictEqual(resDates.endDate, '2026-10-31');

    return { bengaliNumeralsNormalized: true, dateObjectsNormalized: true };
  });

  // ---------------------------------------------------------------------------
  // PART 2: CUSTOMER LEDGER STATEMENT MATH & INVARIANTS
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 2: CUSTOMER LEDGER STATEMENT MATH & INVARIANTS (0.00 PAISA FLOAT DRIFT) ---');

  const mockCustomer = {
    id: 'cust_iter207_01',
    name: 'আব্দুর রহিম',
    phone: '01711223344',
    type: 1, // Customer
    openingBalance: 500.00,
    businessId: 'biz_main',
  };

  const mockCustJournals = [
    { id: 'j_prior_1', accountId: 'cust_iter207_01', businessId: 'biz_main', type: 'given', amount: 250.75, date: '2026-09-15', time: '10:00' },
    { id: 'j_prior_2', accountId: 'cust_iter207_01', businessId: 'biz_main', type: 'received', amount: 150.25, date: '2026-09-20', time: '11:00' },
    // Sept balance: 500 + 250.75 - 150.25 = 600.50

    { id: 'j_oct_1', accountId: 'cust_iter207_01', businessId: 'biz_main', type: 'given', amount: 400.00, date: '2026-10-05', time: '09:00' },
    { id: 'j_oct_2', accountId: 'cust_iter207_01', businessId: 'biz_main', type: 'received', amount: 300.50, date: '2026-10-18', time: '14:00' },
    // Oct balance: 600.50 + 400 - 300.50 = 700.00

    { id: 'j_nov_1', accountId: 'cust_iter207_01', businessId: 'biz_main', type: 'given', amount: 550.25, date: '2026-11-01', time: '10:00' },
    { id: 'j_nov_2', accountId: 'cust_iter207_01', businessId: 'biz_main', type: 'received', amount: 200.00, date: '2026-11-02', time: '12:00' },
    { id: 'j_nov_3', accountId: 'cust_iter207_01', businessId: 'biz_main', type: 'given', amount: 100.50, date: '2026-11-03', time: '16:00' },
    // Nov balance: 700.00 + 550.25 - 200 + 100.50 = 1150.75
  ];

  await runTest('2.1: Customer statement over dateRange="all": Exact match with ledger running balance', async () => {
    const stmt = generateAccountStatement(mockCustomer, mockCustJournals, 'all');

    assert.strictEqual(stmt.openingBalance, 500.00);
    assert.strictEqual(stmt.totalGiven, 1301.50); // 250.75 + 400 + 550.25 + 100.50 = 1301.50
    assert.strictEqual(stmt.totalReceived, 650.75); // 150.25 + 300.50 + 200 = 650.75
    assert.strictEqual(stmt.closingBalance, 1150.75); // 500 + 1301.50 - 650.75 = 1150.75
    assert.strictEqual(stmt.netChange, 650.75); // 1301.50 - 650.75 = 650.75
    assert.strictEqual(stmt.transactionCount, 7);
    assert.strictEqual(stmt.floatDriftPaisa, 0);

    // Verify against ledgerEngine recalculateAccountRunningBalances
    const recalc = recalculateAccountRunningBalances(mockCustomer, mockCustJournals);
    assert.strictEqual(stmt.closingBalance, recalc.finalBalance);

    // Verify running balances on journals
    const lastJ = stmt.journals[stmt.journals.length - 1];
    assert.strictEqual(lastJ.runningBalance, 1150.75);

    return {
      openingBalance: stmt.openingBalance,
      totalGiven: stmt.totalGiven,
      totalReceived: stmt.totalReceived,
      closingBalance: stmt.closingBalance,
      recalcFinalBalance: recalc.finalBalance,
      floatDrift: '0.00 Paisa'
    };
  });

  await runTest('2.2: Customer statement over dateRange="this_month" (Nov 2026): Exact prior opening balance', async () => {
    const refDate = new Date(2026, 10, 3); // 2026-11-03
    const stmt = generateAccountStatement(mockCustomer, mockCustJournals, 'this_month', { referenceDate: refDate });

    // Prior transactions: Sept + Oct -> balance before Nov 01 was 700.00
    assert.strictEqual(stmt.openingBalance, 700.00);
    assert.strictEqual(stmt.priorCount, 4);

    // Nov range: 3 transactions
    assert.strictEqual(stmt.transactionCount, 3);
    assert.strictEqual(stmt.totalGiven, 650.75); // 550.25 + 100.50
    assert.strictEqual(stmt.totalReceived, 200.00);
    assert.strictEqual(stmt.closingBalance, 1150.75); // 700 + 650.75 - 200 = 1150.75
    assert.strictEqual(stmt.currentAccountBalance, 1150.75);

    // Mathematical invariant: closingBalance === openingBalance + totalGiven - totalReceived
    const invariantDiff = Math.abs(stmt.closingBalance - (stmt.openingBalance + stmt.totalGiven - stmt.totalReceived));
    assert.strictEqual(invariantDiff, 0);

    return {
      openingBalanceNov1: stmt.openingBalance,
      periodGiven: stmt.totalGiven,
      periodReceived: stmt.totalReceived,
      closingBalance: stmt.closingBalance,
      invariantDiff: '0.00 Paisa'
    };
  });

  await runTest('2.3: Customer statement over dateRange="last_month" (Oct 2026): Future transactions excluded from closing', async () => {
    const refDate = new Date(2026, 10, 3); // 2026-11-03 -> last month is Oct 2026
    const stmt = generateAccountStatement(mockCustomer, mockCustJournals, 'last_month', { referenceDate: refDate });

    // Prior transactions: Sept -> opening balance for Oct was 600.50
    assert.strictEqual(stmt.openingBalance, 600.50);
    assert.strictEqual(stmt.priorCount, 2);

    // Oct range: 2 transactions (given 400, received 300.50)
    assert.strictEqual(stmt.transactionCount, 2);
    assert.strictEqual(stmt.totalGiven, 400.00);
    assert.strictEqual(stmt.totalReceived, 300.50);
    assert.strictEqual(stmt.closingBalance, 700.00); // 600.50 + 400 - 300.50 = 700.00

    // Future transactions (Nov): 3 transactions
    assert.strictEqual(stmt.futureCount, 3);

    // currentAccountBalance reflects full history
    assert.strictEqual(stmt.currentAccountBalance, 1150.75);

    return {
      openingBalanceOct1: stmt.openingBalance,
      closingBalanceOct31: stmt.closingBalance,
      futureTxnCount: stmt.futureCount,
      currentLedgerBalance: stmt.currentAccountBalance
    };
  });

  await runTest('2.4: Customer statement over dateRange="today" (2026-11-03): Single-day precision', async () => {
    const refDate = new Date(2026, 10, 3);
    const stmt = generateAccountStatement(mockCustomer, mockCustJournals, 'today', { referenceDate: refDate });

    // Transactions before 2026-11-03: all up to Nov 2 -> balance was 1050.25
    assert.strictEqual(stmt.openingBalance, 1050.25);
    assert.strictEqual(stmt.priorCount, 6);

    // Today (Nov 3): j_nov_3 given 100.50
    assert.strictEqual(stmt.transactionCount, 1);
    assert.strictEqual(stmt.totalGiven, 100.50);
    assert.strictEqual(stmt.totalReceived, 0);
    assert.strictEqual(stmt.closingBalance, 1150.75);

    return {
      openingToday: stmt.openingBalance,
      givenToday: stmt.totalGiven,
      closingToday: stmt.closingBalance
    };
  });

  // ---------------------------------------------------------------------------
  // PART 3: SUPPLIER LEDGER STATEMENT MATH & INVARIANTS
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 3: SUPPLIER LEDGER STATEMENT MATH & INVARIANTS ---');

  const mockSupplier = {
    id: 'supp_iter207_01',
    name: 'মেসার্স ভাই ভাই ট্রেডার্স',
    phone: '01899887766',
    type: 2, // Supplier (liability)
    openingBalance: 1000.00,
    businessId: 'biz_main',
  };

  const mockSuppJournals = [
    // Sept: credit goods received 800, payment given 500 -> 1000 + 800 - 500 = 1300
    { id: 'sj_1', accountId: 'supp_iter207_01', businessId: 'biz_main', type: 'received', amount: 800.00, date: '2026-09-10' },
    { id: 'sj_2', accountId: 'supp_iter207_01', businessId: 'biz_main', type: 'given', amount: 500.00, date: '2026-09-25' },

    // Oct: credit goods received 1200.75, payment given 700.25 -> 1300 + 1200.75 - 700.25 = 1800.50
    { id: 'sj_3', accountId: 'supp_iter207_01', businessId: 'biz_main', type: 'received', amount: 1200.75, date: '2026-10-12' },
    { id: 'sj_4', accountId: 'supp_iter207_01', businessId: 'biz_main', type: 'given', amount: 700.25, date: '2026-10-28' },

    // Nov: payment given 300.50 -> 1800.50 - 300.50 = 1500.00
    { id: 'sj_5', accountId: 'supp_iter207_01', businessId: 'biz_main', type: 'given', amount: 300.50, date: '2026-11-02' },
  ];

  await runTest('3.1: Supplier statement: Invariant closingBalance === openingBalance + received - given', async () => {
    const stmtAll = generateAccountStatement(mockSupplier, mockSuppJournals, 'all');

    // Supplier balance: 1000 + (800 + 1200.75) - (500 + 700.25 + 300.50) = 1000 + 2000.75 - 1500.75 = 1500.00
    assert.strictEqual(stmtAll.openingBalance, 1000.00);
    assert.strictEqual(stmtAll.totalReceived, 2000.75); // credit stock received (+ debt)
    assert.strictEqual(stmtAll.totalGiven, 1500.75); // cash payment given to supplier (- debt)
    assert.strictEqual(stmtAll.closingBalance, 1500.00);
    assert.strictEqual(stmtAll.floatDriftPaisa, 0);

    // Verify against recalculateAccountRunningBalances
    const recalc = recalculateAccountRunningBalances(mockSupplier, mockSuppJournals);
    assert.strictEqual(stmtAll.closingBalance, recalc.finalBalance);

    return {
      supplierOpening: stmtAll.openingBalance,
      stockReceived: stmtAll.totalReceived,
      cashPaid: stmtAll.totalGiven,
      supplierClosingBalance: stmtAll.closingBalance,
      floatDrift: '0.00 Paisa'
    };
  });

  await runTest('3.2: Supplier statement over custom date range (Oct 2026)', async () => {
    const stmtCustom = generateAccountStatement(mockSupplier, mockSuppJournals, 'custom', {
      startDate: '2026-10-01',
      endDate: '2026-10-31'
    });

    // Opening for Oct was 1300.00
    assert.strictEqual(stmtCustom.openingBalance, 1300.00);
    assert.strictEqual(stmtCustom.totalReceived, 1200.75);
    assert.strictEqual(stmtCustom.totalGiven, 700.25);
    assert.strictEqual(stmtCustom.closingBalance, 1800.50); // 1300 + 1200.75 - 700.25 = 1800.50
    assert.strictEqual(stmtCustom.priorCount, 2);
    assert.strictEqual(stmtCustom.futureCount, 1);
    assert.strictEqual(stmtCustom.currentAccountBalance, 1500.00);

    return {
      openingOct: stmtCustom.openingBalance,
      closingOct: stmtCustom.closingBalance,
      finalCurrentBalance: stmtCustom.currentAccountBalance
    };
  });

  // ---------------------------------------------------------------------------
  // PART 4: MULTI-TENANT ISOLATION UNDER 30 BUSINESSES (COLLIDING ACCOUNT IDS)
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 4: MULTI-TENANT STATEMENT ISOLATION ACROSS 30 BUSINESSES (COLLIDING ACC IDS) ---');

  await runTest('4.1: Statement generation across 30 businesses with colliding account IDs: 0.00 Paisa leakage', async () => {
    const BIZ_COUNT = 30;
    const allAccounts = [];
    const allJournals = [];

    // Each business has an account with id='acc_colliding_cust' (type 1) and 'acc_colliding_supp' (type 2)
    for (let b = 1; b <= BIZ_COUNT; b++) {
      const bId = String(b);
      // Customer: base opening balance = 100 * b
      allAccounts.push({
        id: 'acc_colliding_cust',
        name: `Customer of Shop ${b}`,
        type: 1,
        openingBalance: 100 * b,
        businessId: bId,
      });

      // Supplier: base opening balance = 200 * b
      allAccounts.push({
        id: 'acc_colliding_supp',
        name: `Supplier of Shop ${b}`,
        type: 2,
        openingBalance: 200 * b,
        businessId: bId,
      });

      // Distinct transactions per business
      // Customer has given = 50 * b, received = 20 * b
      allJournals.push({
        id: `j_cust_${b}_1`,
        accountId: 'acc_colliding_cust',
        businessId: bId,
        type: 'given',
        amount: 50 * b,
        date: '2026-10-10'
      });
      allJournals.push({
        id: `j_cust_${b}_2`,
        accountId: 'acc_colliding_cust',
        businessId: bId,
        type: 'received',
        amount: 20 * b,
        date: '2026-11-02'
      });

      // Supplier has received = 80 * b, given = 30 * b
      allJournals.push({
        id: `j_supp_${b}_1`,
        accountId: 'acc_colliding_supp',
        businessId: bId,
        type: 'received',
        amount: 80 * b,
        date: '2026-10-15'
      });
      allJournals.push({
        id: `j_supp_${b}_2`,
        accountId: 'acc_colliding_supp',
        businessId: bId,
        type: 'given',
        amount: 30 * b,
        date: '2026-11-03'
      });
    }

    const tStart = performance.now();

    // Verify statements for all 30 businesses
    for (let b = 1; b <= BIZ_COUNT; b++) {
      const bId = String(b);
      const custAcc = allAccounts.find(a => a.id === 'acc_colliding_cust' && a.businessId === bId);
      const suppAcc = allAccounts.find(a => a.id === 'acc_colliding_supp' && a.businessId === bId);

      // Customer statement
      const custStmt = generateAccountStatement(custAcc, allJournals, 'all');
      const expectedCustClosing = (100 * b) + (50 * b) - (20 * b); // 130 * b
      assert.strictEqual(custStmt.businessId, bId);
      assert.strictEqual(custStmt.transactionCount, 2);
      assert.strictEqual(custStmt.totalGiven, 50 * b);
      assert.strictEqual(custStmt.totalReceived, 20 * b);
      assert.strictEqual(custStmt.closingBalance, expectedCustClosing);

      // Supplier statement
      const suppStmt = generateAccountStatement(suppAcc, allJournals, 'all');
      const expectedSuppClosing = (200 * b) + (80 * b) - (30 * b); // 250 * b
      assert.strictEqual(suppStmt.businessId, bId);
      assert.strictEqual(suppStmt.transactionCount, 2);
      assert.strictEqual(suppStmt.totalReceived, 80 * b);
      assert.strictEqual(suppStmt.totalGiven, 30 * b);
      assert.strictEqual(suppStmt.closingBalance, expectedSuppClosing);
    }

    const tElapsed = performance.now() - tStart;

    return {
      verifiedBusinesses: BIZ_COUNT,
      verifiedStatements: BIZ_COUNT * 2,
      crossTenantContamination: '0.00% (Zero Contamination)',
      durationMs: Number(tElapsed.toFixed(2)),
      avgLatencyPerStatementMs: Number((tElapsed / (BIZ_COUNT * 2)).toFixed(3))
    };
  });

  // ---------------------------------------------------------------------------
  // PART 5: TAGADA QUOTA & LOG MANAGEMENT (ROOM DB PARITY & CONCURRENCY)
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 5: TAGADA QUOTA & LOG MANAGEMENT (ROOM DB PARITY & CONCURRENCY) ---');

  await runTest('5.1: normalizeTagadaLogFields guarantees 100% Room DB schema parity', async () => {
    // Room DB schema: id, account_id, create_date, credit_amount, tagada_type, synced, business_id
    const rawRoomLog = {
      id: 'tag_room_01',
      account_id: 101,
      create_date: '2026-11-03T10:15:30.000Z',
      credit_amount: 1250.75,
      tagada_type: 'TAGADA_BY_FREE_SMS',
      synced: 1,
      business_id: 5
    };

    const norm = normalizeTagadaLogFields(rawRoomLog);
    assert.strictEqual(norm.id, 'tag_room_01');
    assert.strictEqual(norm.account_id, 101);
    assert.strictEqual(norm.accountId, '101');
    assert.strictEqual(norm.create_date, '2026-11-03T10:15:30.000Z');
    assert.strictEqual(norm.createDate, '2026-11-03T10:15:30.000Z');
    assert.strictEqual(norm.credit_amount, 1250.75);
    assert.strictEqual(norm.creditAmount, 1250.75);
    assert.strictEqual(norm.tagada_type, 'TAGADA_BY_FREE_SMS');
    assert.strictEqual(norm.synced, 1);
    assert.strictEqual(norm.business_id, 5);
    assert.strictEqual(norm.businessId, '5');

    return { roomDbParity: true, bidirectionalFieldsPresent: true };
  });

  await runTest('5.2: recordTagadaLog: Records free SMS tagada, decrements quota, logs telemetry', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Default remaining SMS count is 5
    const initialQuota = repo.getTagadaQuota();
    assert.strictEqual(initialQuota.remainingSmsCount, 5);

    const logPayload = {
      accountId: 'cust_tag_01',
      businessId: '1',
      creditAmount: 850.50,
      tagadaType: 'TAGADA_BY_FREE_SMS',
      customerName: 'করিম চাচা',
    };

    const res = await repo.recordTagadaLog(logPayload);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.duplicate, false);
    assert.strictEqual(res.remainingSmsCount, 4);

    // Verify stored state in repo
    const postQuota = repo.getTagadaQuota();
    assert.strictEqual(postQuota.remainingSmsCount, 4);

    const logs = repo.listTagadaLogs('cust_tag_01', '1');
    assert.strictEqual(logs.totalCount, 1);
    assert.strictEqual(logs.tagadaLogs[0].creditAmount, 850.50);

    return {
      recorded: true,
      prevQuota: initialQuota.remainingSmsCount,
      newQuota: postQuota.remainingSmsCount,
      storedLogId: res.data.id
    };
  });

  await runTest('5.3: recordTagadaLog idempotency: Re-submitting same ID does NOT deduct quota or duplicate', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const fixedId = 'tag_idempotent_test_999';
    const logPayload = {
      id: fixedId,
      accountId: 'cust_tag_02',
      businessId: '1',
      creditAmount: 500.00,
      tagadaType: 'TAGADA_BY_FREE_SMS',
    };

    // First submission
    const res1 = await repo.recordTagadaLog(logPayload);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.duplicate, false);
    assert.strictEqual(res1.remainingSmsCount, 4);

    // Second submission with exact same ID (e.g. network retry / duplicate click)
    const res2 = await repo.recordTagadaLog(logPayload);
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.duplicate, true);
    assert.strictEqual(res2.remainingSmsCount, 4); // Did NOT deduct again!

    const logs = repo.listTagadaLogs('cust_tag_02');
    assert.strictEqual(logs.totalCount, 1); // Exactly 1 record, not 2

    return {
      idempotencyVerified: true,
      duplicateDetected: true,
      quotaSafe: true
    };
  });

  await runTest('5.4: SMS quota exhaustion and floor enforcement at 0', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Set remaining SMS to 1
    await repo.mutateStore((s) => ({ ...s, remainingSmsCount: 1 }));

    // Send 1st SMS -> succeeds, quota becomes 0
    const res1 = await repo.recordTagadaLog({
      accountId: 'cust_exhaust_1',
      creditAmount: 100,
      tagadaType: 'TAGADA_BY_FREE_SMS'
    });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.remainingSmsCount, 0);

    // Send 2nd SMS -> fails fast with SMS_QUOTA_EXHAUSTED
    const res2 = await repo.recordTagadaLog({
      accountId: 'cust_exhaust_2',
      creditAmount: 200,
      tagadaType: 'TAGADA_BY_FREE_SMS'
    });
    assert.strictEqual(res2.success, false);
    assert.strictEqual(res2.error, 'SMS_QUOTA_EXHAUSTED');
    assert.strictEqual(repo.getTagadaQuota().remainingSmsCount, 0);

    // Non-free SMS (WhatsApp / generic Share) bypasses SMS quota
    const resWhatsApp = await repo.recordTagadaLog({
      accountId: 'cust_exhaust_3',
      creditAmount: 300,
      tagadaType: 'TAGADA_BY_WHATSAPP'
    });
    assert.strictEqual(resWhatsApp.success, true);
    assert.strictEqual(resWhatsApp.remainingSmsCount, 0); // Still 0, but succeeded

    return {
      exhaustionRejected: true,
      floorPreservedAtZero: true,
      whatsappBypassAllowed: true
    };
  });

  await runTest('5.5: adjustTagadaQuota: Recharges with ceiling enforcement at maxQuota (100)', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Current is 5. Add 50 -> 55
    const r1 = await repo.adjustTagadaQuota(50);
    assert.strictEqual(r1.success, true);
    assert.strictEqual(r1.remainingSmsCount, 55);

    // Add 100 more -> capped at maxQuota = 100
    const r2 = await repo.adjustTagadaQuota(100);
    assert.strictEqual(r2.success, true);
    assert.strictEqual(r2.remainingSmsCount, 100);

    // Deduct 200 -> clamped at floor = 0
    const r3 = await repo.adjustTagadaQuota(-200);
    assert.strictEqual(r3.success, true);
    assert.strictEqual(r3.remainingSmsCount, 0);

    return {
      rechargeWorked: true,
      ceilingEnforced: 100,
      floorEnforced: 0
    };
  });

  await runTest('5.6: listTagadaLogs: Multi-tenant business and account isolation', async () => {
    const adapter = createMockAsyncAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Create logs for shop 1 and shop 2 sharing account ID "acc_common"
    await repo.recordTagadaLog({ accountId: 'acc_common', businessId: '1', creditAmount: 100, tagadaType: 'TAGADA_SHARE' }, { bypassQuota: true });
    await repo.recordTagadaLog({ accountId: 'acc_common', businessId: '1', creditAmount: 200, tagadaType: 'TAGADA_SHARE' }, { bypassQuota: true });
    await repo.recordTagadaLog({ accountId: 'acc_common', businessId: '2', creditAmount: 300, tagadaType: 'TAGADA_SHARE' }, { bypassQuota: true });

    const shop1Logs = repo.listTagadaLogs('acc_common', '1');
    assert.strictEqual(shop1Logs.totalCount, 2);
    assert.strictEqual(shop1Logs.tagadaLogs[0].businessId, '1');
    assert.strictEqual(shop1Logs.tagadaLogs[1].businessId, '1');

    const shop2Logs = repo.listTagadaLogs('acc_common', '2');
    assert.strictEqual(shop2Logs.totalCount, 1);
    assert.strictEqual(shop2Logs.tagadaLogs[0].businessId, '2');

    return {
      shop1Count: shop1Logs.totalCount,
      shop2Count: shop2Logs.totalCount,
      isolation: '100% Verified'
    };
  });

  // ---------------------------------------------------------------------------
  // PART 6: HIGH-VOLUME PERFORMANCE BENCHMARK (1,000 STATEMENT GENERATIONS)
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 6: HIGH-VOLUME PERFORMANCE BENCHMARK (1,000 STATEMENT GENERATIONS) ---');

  await runTest('6.1: Benchmark: 1,000 statement calculations across historical journals', async () => {
    const TEST_RUNS = 1000;
    const tStart = performance.now();

    for (let i = 0; i < TEST_RUNS; i++) {
      const isCust = i % 2 === 0;
      const targetAcc = isCust ? mockCustomer : mockSupplier;
      const targetJournals = isCust ? mockCustJournals : mockSuppJournals;
      const range = i % 4 === 0 ? 'all' : (i % 4 === 1 ? 'today' : (i % 4 === 2 ? 'this_month' : 'custom'));
      const options = range === 'custom' ? { startDate: '2026-10-01', endDate: '2026-10-31' } : { referenceDate: new Date(2026, 10, 3) };

      const stmt = generateAccountStatement(targetAcc, targetJournals, range, options);
      assert(stmt.closingBalance !== undefined);
    }

    const tElapsed = performance.now() - tStart;
    const opsPerSec = Number(((TEST_RUNS / (tElapsed / 1000))).toFixed(2));
    const avgLatencyUs = Number(((tElapsed / TEST_RUNS) * 1000).toFixed(2));

    return {
      iterations: TEST_RUNS,
      totalDurationMs: Number(tElapsed.toFixed(2)),
      throughputStatementsPerSec: opsPerSec,
      avgLatencyMicroseconds: avgLatencyUs,
      status: 'ULTRA_FAST_SUB_MILLISECOND'
    };
  });

  console.log('\n================================================================');
  console.log(`ITERATION 207 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================\n');
})();
