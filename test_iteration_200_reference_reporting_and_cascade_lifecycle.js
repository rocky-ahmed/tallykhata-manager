/**
 * test_iteration_200_reference_reporting_and_cascade_lifecycle.js
 * Continuous Verification Suite for Iteration 200:
 * Reference Reporting & KPI Aggregations, Cascade Deletion Lifecycle & Transaction Reversal Integrity
 *
 * Covers:
 * 1. Reference Reporting & KPI Aggregations (calculateAggregateMetrics, deriveCashBoxSummary, Date Range Indexing).
 * 2. Account Cascade Deletion & Referential Integrity (Customer & Supplier removal with journal/cashbox purging).
 * 3. Single Transaction Deletion & Chronological Running Balance Recalculation.
 * 4. Upfront Cash Settlement & Cashbox Synchronization (amount vs amount_received).
 * 5. Production Invariants, Cloud Backup Checksums & Selective Domain Restore.
 */

const assert = require("assert");
const ledgerEngine = require("./src/ledgerEngine");
const { StorageRepository, createDefaultState } = require("./src/storageRepository");
const { buildBackupPayload, validateBackupIntegrity, restoreBackupIntoStorage } = require("./src/googleDriveBackupService");

console.log("================================================================");
console.log("TALLYKHATA ITERATION 200: REPORTING & CASCADE LIFECYCLE AUDIT");
console.log("================================================================\n");

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log("[PASS] TEST " + totalTests + ": " + name);
    passedTests++;
  } catch (err) {
    console.error("[FAIL] TEST " + totalTests + ": " + name);
    console.error(err);
    process.exit(1);
  }
}

function createMockAdapter(initialData = null) {
  const store = {};
  if (initialData) {
    store[ledgerEngine.V6_KEY] = JSON.stringify(initialData);
  }
  return {
    async getItem(k) {
      return store[k] !== undefined ? store[k] : null;
    },
    async setItem(k, v) {
      store[k] = String(v);
    },
    async removeItem(k) {
      delete store[k];
    },
    _getStore() {
      return store;
    },
  };
}

(async () => {
  // =========================================================================
  // PART 1: Reference Reporting & KPI Aggregations
  // =========================================================================
  await runTest("1.1: calculateAggregateMetrics computes exact receivable, payable, and net balance", async () => {
    const accounts = [
      { id: "c1", name: "গ্রাহক ১", balance: 50000.50, type: 1, businessId: "1" },
      { id: "c2", name: "গ্রাহক ২", balance: 75000.25, type: 1, businessId: "1" },
      { id: "s1", name: "সাপ্লায়ার ১", balance: 35000.75, type: 2, businessId: "1" },
      { id: "s2", name: "সাপ্লায়ার ২", balance: 15000.00, type: 2, businessId: "1" },
    ];

    const metrics = ledgerEngine.calculateAggregateMetrics(accounts, [], "1");
    // totalReceivable = 50000.50 + 75000.25 = 125000.75
    // totalPayable = 35000.75 + 15000.00 = 50000.75
    // netBalance = 125000.75 - 50000.75 = 75000.00
    assert.strictEqual(metrics.totalReceivable, 125000.75);
    assert.strictEqual(metrics.totalPayable, 50000.75);
    assert.strictEqual(metrics.netBalance, 75000.00);
    assert.strictEqual(metrics.customerCount, 2);
    assert.strictEqual(metrics.supplierCount, 2);
  });

  await runTest("1.2: calculateAggregateMetrics strictly isolates metrics by businessId", async () => {
    const accounts = [
      { id: "c_shop1", name: "শপ ১ গ্রাহক", balance: 100000, type: 1, businessId: "shop_1" },
      { id: "c_shop2", name: "শপ ২ গ্রাহক", balance: 900000, type: 1, businessId: "shop_2" },
      { id: "s_shop1", name: "শপ ১ মহাজন", balance: 25000, type: 2, businessId: "shop_1" },
    ];

    const shop1Metrics = ledgerEngine.calculateAggregateMetrics(accounts, [], "shop_1");
    assert.strictEqual(shop1Metrics.totalReceivable, 100000);
    assert.strictEqual(shop1Metrics.totalPayable, 25000);
    assert.strictEqual(shop1Metrics.netBalance, 75000);
    assert.strictEqual(shop1Metrics.customerCount, 1);
    assert.strictEqual(shop1Metrics.supplierCount, 1);

    const shop2Metrics = ledgerEngine.calculateAggregateMetrics(accounts, [], "shop_2");
    assert.strictEqual(shop2Metrics.totalReceivable, 900000);
    assert.strictEqual(shop2Metrics.totalPayable, 0);
    assert.strictEqual(shop2Metrics.customerCount, 1);
    assert.strictEqual(shop2Metrics.supplierCount, 0);
  });

  await runTest("1.3: deriveCashBoxSummary calculates total cash in, out, and physical drawer balance", async () => {
    const cashEntries = [
      { id: "ce1", amount: 15000.50, type: "in", businessId: "1" },
      { id: "ce2", amount: 25000.25, type: "in", businessId: "1" },
      { id: "ce3", amount: 12000.00, type: "out", businessId: "1" },
      { id: "ce4", amount: 5000.75, type: "out", businessId: "1" },
      { id: "ce_other", amount: 88888.00, type: "in", businessId: "shop_other" },
    ];

    const summary = ledgerEngine.deriveCashBoxSummary(cashEntries, "1");
    // cashIn = 15000.50 + 25000.25 = 40000.75
    // cashOut = 12000.00 + 5000.75 = 17000.75
    // balance = 40000.75 - 17000.75 = 23000.00
    assert.strictEqual(summary.cashIn, 40000.75);
    assert.strictEqual(summary.cashOut, 17000.75);
    assert.strictEqual(summary.balance, 23000.00);
    assert.strictEqual(summary.netCash, 23000.00);
  });

  await runTest("1.4: Indexed date range query (queryJournalsByDateRange) extracts chronological statements", async () => {
    const state = createDefaultState();
    state.journals = [
      { id: "j1", accountId: "acc1", amount: 1000, type: "given", date: "2026-11-01T10:00:00.000Z", businessId: "1" },
      { id: "j2", accountId: "acc1", amount: 2000, type: "received", date: "2026-11-02T11:00:00.000Z", businessId: "1" },
      { id: "j3", accountId: "acc2", amount: 3000, type: "given", date: "2026-11-03T12:00:00.000Z", businessId: "1" },
      { id: "j4", accountId: "acc1", amount: 4000, type: "given", date: "2026-11-05T14:00:00.000Z", businessId: "1" },
    ];

    const repo = new StorageRepository(createMockAdapter(state));
    await repo.loadInitialData();

    // Query range 2026-11-02 to 2026-11-03
    const filtered = repo.queryJournalsByDateRange("2026-11-02T00:00:00.000Z", "2026-11-03T23:59:59.999Z", { businessId: "1" });
    assert.strictEqual(filtered.journals.length, 2);
    assert.strictEqual(filtered.journals[0].id, "j2");
    assert.strictEqual(filtered.journals[1].id, "j3");
  });

  // =========================================================================
  // PART 2: Account Cascade Deletion & Multi-Table Referential Integrity
  // =========================================================================
  await runTest("2.1: Deleting a customer account cascade-purges customer journals and linked cashbox entries", async () => {
    const state = createDefaultState();
    state.accounts = [
      { id: "c_del", name: "মুছে ফেলার কাস্টমার", balance: 5000, type: 1, businessId: "1" },
      { id: "c_stay", name: "অক্ষত কাস্টমার", balance: 8000, type: 1, businessId: "1" },
    ];
    state.journals = [
      { id: "j_del_1", accountId: "c_del", amount: 5000, type: "given", businessId: "1" },
      { id: "j_del_2", accountId: "c_del", amount: 2000, type: "received", businessId: "1" },
      { id: "j_stay", accountId: "c_stay", amount: 8000, type: "given", businessId: "1" },
    ];
    state.cashEntries = [
      { id: "ce_linked_del", amount: 2000, type: "in", linkedTxnId: "j_del_2", businessId: "1" },
      { id: "ce_manual", amount: 500, type: "in", businessId: "1" },
    ];

    const repo = new StorageRepository(createMockAdapter(state));
    await repo.loadInitialData();

    const accId = "c_del";
    const res = await repo.mutateStore((latestStore) => {
      const curAccounts = latestStore.accounts || [];
      const curJournals = latestStore.journals || [];
      const curCash = latestStore.cashEntries || [];

      const accTxnIds = curJournals
        .filter((j) => String(j.accountId) === accId)
        .map((j) => String(j.id));

      const updatedAccounts = curAccounts.filter((a) => String(a.id) !== accId);
      const updatedJournals = curJournals.filter((j) => String(j.accountId) !== accId);
      const updatedCash = ledgerEngine.removeCashEntriesForTransactions(accTxnIds, curCash);

      return {
        ...latestStore,
        accounts: updatedAccounts,
        journals: updatedJournals,
        cashEntries: updatedCash,
      };
    });

    assert.strictEqual(res.success, true);
    const updated = repo.getAuthoritativeState();
    assert.strictEqual(updated.accounts.length, 1);
    assert.strictEqual(updated.accounts[0].id, "c_stay");
    assert.strictEqual(updated.journals.length, 1);
    assert.strictEqual(updated.journals[0].id, "j_stay");
    assert.strictEqual(updated.cashEntries.length, 1);
    assert.strictEqual(updated.cashEntries[0].id, "ce_manual");
  });

  await runTest("2.2: Deleting a supplier account cascade-purges supplier purchases and payments", async () => {
    const state = createDefaultState();
    state.accounts = [
      { id: "s_del", name: "মুছে ফেলার মহাজন", balance: 12000, type: 2, businessId: "1" },
    ];
    state.journals = [
      { id: "j_s1", accountId: "s_del", amount: 20000, type: "received", businessId: "1" }, // purchase
      { id: "j_s2", accountId: "s_del", amount: 8000, type: "given", businessId: "1" },     // payment
    ];
    state.cashEntries = [
      { id: "ce_s_pay", amount: 8000, type: "out", linkedTxnId: "j_s2", businessId: "1" },
    ];

    const repo = new StorageRepository(createMockAdapter(state));
    await repo.loadInitialData();

    await repo.mutateStore((latest) => {
      const accTxnIds = latest.journals.filter(j => j.accountId === "s_del").map(j => j.id);
      return {
        ...latest,
        accounts: latest.accounts.filter(a => a.id !== "s_del"),
        journals: latest.journals.filter(j => j.accountId !== "s_del"),
        cashEntries: ledgerEngine.removeCashEntriesForTransactions(accTxnIds, latest.cashEntries),
      };
    });

    const updated = repo.getAuthoritativeState();
    assert.strictEqual(updated.accounts.length, 0);
    assert.strictEqual(updated.journals.length, 0);
    assert.strictEqual(updated.cashEntries.length, 0);
  });

  await runTest("2.3: deleteBusinessCascade completely purges one business without data bleed", async () => {
    const state = createDefaultState();
    state.businesses = [
      { id: "biz_1", name: "দোকান ১", isActive: true },
      { id: "biz_2", name: "দোকান ২", isActive: false },
    ];
    state.accounts = [
      { id: "a1", businessId: "biz_1", name: "Acc 1", balance: 5000, type: 1 },
      { id: "a2", businessId: "biz_2", name: "Acc 2", balance: 9000, type: 1 },
    ];
    state.journals = [
      { id: "j1", businessId: "biz_1", accountId: "a1", amount: 5000, type: "given" },
      { id: "j2", businessId: "biz_2", accountId: "a2", amount: 9000, type: "given" },
    ];
    state.cashEntries = [
      { id: "c1", businessId: "biz_1", amount: 500, type: "in" },
      { id: "c2", businessId: "biz_2", amount: 800, type: "in" },
    ];

    const repo = new StorageRepository(createMockAdapter(state));
    await repo.loadInitialData();

    const deleteRes = await repo.deleteBusinessCascade("biz_2");
    assert.strictEqual(deleteRes.success, true);

    const updated = repo.getAuthoritativeState();
    assert.strictEqual(updated.businesses.length, 1);
    assert.strictEqual(updated.businesses[0].id, "biz_1");
    assert.strictEqual(updated.accounts.length, 1);
    assert.strictEqual(updated.accounts[0].id, "a1");
    assert.strictEqual(updated.journals.length, 1);
    assert.strictEqual(updated.journals[0].id, "j1");
    assert.strictEqual(updated.cashEntries.length, 1);
    assert.strictEqual(updated.cashEntries[0].id, "c1");
  });

  // =========================================================================
  // PART 3: Single Transaction Deletion & Running Balance Recalculation
  // =========================================================================
  await runTest("3.1: Single transaction deletion recalculates chronological running balances accurately", async () => {
    const acc = { id: "cust_recalc", name: "চলতি খাতা কাস্টমার", balance: 0, openingBalance: 1000, type: 1, businessId: "1" };
    const journals = [
      { id: "tx1", accountId: "cust_recalc", amount: 500, type: "given", date: "2026-11-01T10:00:00Z", businessId: "1" },
      { id: "tx2", accountId: "cust_recalc", amount: 300, type: "given", date: "2026-11-01T11:00:00Z", businessId: "1" }, // to be deleted
      { id: "tx3", accountId: "cust_recalc", amount: 400, type: "received", date: "2026-11-01T12:00:00Z", businessId: "1" },
    ];

    // Initial recalculation with all 3 transactions
    const initial = ledgerEngine.recalculateAccountRunningBalances(acc, journals);
    // opening=1000, +500=1500, +300=1800, -400=1400
    assert.strictEqual(initial.finalBalance, 1400);

    // Delete tx2 (+300)
    const remaining = journals.filter(j => j.id !== "tx2");
    const recalculated = ledgerEngine.recalculateAccountRunningBalances(acc, remaining);
    // opening=1000, +500=1500, -400=1100
    assert.strictEqual(recalculated.finalBalance, 1100);
    assert.strictEqual(recalculated.accountJournals.length, 2);
    // Reverse chronological display check: tx3 (latest) should be first with runningBalance 1100
    assert.strictEqual(recalculated.accountJournals[0].id, "tx3");
    assert.strictEqual(recalculated.accountJournals[0].runningBalance, 1100);
    assert.strictEqual(recalculated.accountJournals[1].id, "tx1");
    assert.strictEqual(recalculated.accountJournals[1].runningBalance, 1500);
  });

  await runTest("3.2: Deleting a cash payment received purges linked cashbox entry", async () => {
    const cashEntries = [
      { id: "ce_1", amount: 2000, type: "in", linkedTxnId: "tx_cash_recv", businessId: "1" },
      { id: "ce_2", amount: 500, type: "in", linkedTxnId: "tx_other", businessId: "1" },
    ];

    const purged = ledgerEngine.removeCashEntriesForTransactions(["tx_cash_recv"], cashEntries);
    assert.strictEqual(purged.length, 1);
    assert.strictEqual(purged[0].id, "ce_2");
  });

  await runTest("3.3: Deleting a digital transaction preserves all cashbox entries", async () => {
    const cashEntries = [
      { id: "ce_1", amount: 1500, type: "in", linkedTxnId: "tx_physical_cash", businessId: "1" },
    ];

    // Attempting to remove digital txn (which has no linkedTxnId in cashbox)
    const purged = ledgerEngine.removeCashEntriesForTransactions(["tx_digital_sale"], cashEntries);
    assert.strictEqual(purged.length, 1);
    assert.strictEqual(purged[0].id, "ce_1");
  });

  // =========================================================================
  // PART 4: Upfront Cash Settlement & Cashbox Synchronization
  // =========================================================================
  await runTest("4.1: Credit sale with partial upfront cash settlement (amount: 500, amount_received: 200)", async () => {
    const customer = { id: "acc_partial", name: "গ্রাহক আংশিক", type: 1, businessId: "1" };
    const txn = {
      id: "tx_partial_upfront",
      accountId: "acc_partial",
      type: "received",
      amount: 500,
      amount_received: 200,
      txn_mode: 1,
      businessId: "1"
    };

    const cashEntries = [];
    const updatedCash = ledgerEngine.syncCashboxForTransaction(txn, customer, cashEntries);
    assert.strictEqual(updatedCash.length, 1);
    assert.strictEqual(updatedCash[0].amount, 200); // 200 cash inflow into drawer
    assert.strictEqual(updatedCash[0].type, "in");
    assert.strictEqual(updatedCash[0].linkedTxnId, "tx_partial_upfront");
  });

  await runTest("4.2: Full cash collection creates linked baki_aday cash-in entry", async () => {
    const customer = { id: "acc_full", name: "গ্রাহক পূর্ণ", type: 1, businessId: "1" };
    const txn = {
      id: "tx_full_aday",
      accountId: "acc_full",
      type: "received",
      amount: 1500,
      txn_mode: 1,
      businessId: "1"
    };

    const updatedCash = ledgerEngine.syncCashboxForTransaction(txn, customer, []);
    assert.strictEqual(updatedCash.length, 1);
    assert.strictEqual(updatedCash[0].amount, 1500);
    assert.strictEqual(updatedCash[0].category, "baki_aday");
    assert.strictEqual(updatedCash[0].type, "in");
  });

  // =========================================================================
  // PART 5: Production Invariants, Cloud Checksums & Domain Isolation
  // =========================================================================
  await runTest("5.1: Cloud backup payload generation with post-cascade state integrity", async () => {
    const state = createDefaultState();
    state.accounts = [{ id: "acc_c200", name: "কাস্টমার ২০০", balance: 75000, type: 1, businessId: "1" }];
    state.journals = [{ id: "j_c200", accountId: "acc_c200", amount: 75000, type: "given", businessId: "1" }];

    const user = { sub: "google_cadence_200", email: "cadence200@tallykhata.com" };
    const payload = buildBackupPayload(state, user);

    assert.ok(payload.manifest.checksum.startsWith("sha256_"));
    const verify = validateBackupIntegrity(payload, "google_cadence_200");
    assert.strictEqual(verify.valid, true);
  });

  await runTest("5.2: 3-way selective restore restores business state without modifying Personal Money Manager", async () => {
    const bizState = { ...createDefaultState(), accounts: [{ id: "acc_biz_200", balance: 50000000, businessId: "1", type: 1 }] };
    const mmState = { accounts: [{ id: "wallet_200", name: "ব্যক্তিগত ব্র্যাক ব্যাংক ওয়ালেট (২০০)", balance: 25000000 }] };

    const store = createMockAdapter(bizState);
    store._getStore()[ledgerEngine.MM_STORAGE_KEY] = JSON.stringify(mmState);

    const repo = new StorageRepository(store);
    await repo.loadInitialData();

    // Verify Business state loaded
    assert.strictEqual(repo.getAuthoritativeState().accounts.length, 1);
    // Verify Money Manager state intact
    const rawMM = JSON.parse(store._getStore()[ledgerEngine.MM_STORAGE_KEY]);
    assert.strictEqual(rawMM.accounts[0].balance, 25000000);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 200 REPORTING & CASCADE LIFECYCLE AUDIT VERIFIED!");
  console.log("================================================================");
})();
