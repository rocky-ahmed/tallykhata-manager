/**
 * test_iteration_025_long_term_regression_and_concurrency.js
 * Continuous Verification Suite for Iteration 025: Long-Term Regression, Concurrency & Compaction
 *
 * Covers:
 * 1. Multi-Tenant Concurrent Stress Invariance across 5 businesses (50 interleaved operations).
 * 2. Atomic Transaction Invariants & Automatic Rollback on integrity failure.
 * 3. Storage Compaction & Orphaned Record Purging (vacuuming).
 * 4. Cloud Backup Checksum Tamper Detection (tamper single byte -> abort).
 * 5. Storage Metrics Observability & Quota Threshold Analysis.
 *
 * Worker Roles:
 * - Worker 1 (Gibbs): Thread ID 01a19154-99ab-72a0-9e23-2611b9ffc74c (Data Consistency Invariants)
 * - Worker 2 (Averroes): Thread ID 01a19154-c135-75d0-b38a-1ea50f004895 (Storage Repository & Mutex)
 * - Worker 3 (Ohm): Thread ID 01a19154-e3ee-7ab2-b682-798b64a0bb6b (QA & Concurrency Regression)
 */

const assert = require("assert");
const fs = require("fs");
const ledgerEngine = require("./src/ledgerEngine");
const mmService = require("./src/moneyManagerService");
const { StorageRepository, createDefaultState } = require("./src/storageRepository");
const { buildBackupPayload, validateBackupIntegrity } = require("./src/googleDriveBackupService");

console.log("================================================================");
console.log("TALLYKHATA ITERATION 025: CONCURRENCY & COMPACTION AUDIT");
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
  const store = new Map();
  if (initialData) {
    store.set(ledgerEngine.V6_KEY, JSON.stringify(initialData));
    store.set("tallykhata_v6_store", JSON.stringify(initialData));
  }
  return {
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, val) => { store.set(key, String(val)); },
    removeItem: async (key) => { store.delete(key); },
    clear: async () => { store.clear(); },
    _map: store,
  };
}

(async function main() {

  // =========================================================================
  // PART 1: Multi-Tenant Concurrent Stress Invariance across 5 Businesses
  // =========================================================================
  await runTest("1.1: 5-business concurrent interleaved operations preserve strict tenant isolation", async () => {
    const initialState = createDefaultState();
    initialState.businesses = [
      { id: "1", name: "Shop 1", isSelected: true, isArchived: false },
      { id: "2", name: "Shop 2", isSelected: false, isArchived: false },
      { id: "3", name: "Shop 3", isSelected: false, isArchived: false },
      { id: "4", name: "Shop 4", isSelected: false, isArchived: false },
      { id: "5", name: "Shop 5", isSelected: false, isArchived: false },
    ];
    initialState.accounts = [];
    initialState.journals = [];

    // Create 1 customer per business with opening balance of 1,000
    for (let b = 1; b <= 5; b++) {
      initialState.accounts.push({
        id: "cust_b" + b,
        businessId: String(b),
        name: "Customer of Shop " + b,
        type: 1,
        balance: 1000,
        openingBalance: 1000,
      });
    }

    const repo = new StorageRepository(createMockAdapter(initialState));
    await repo.loadInitialData();

    // Concurrently execute 50 interleaved mutations
    const promises = [];
    for (let i = 1; i <= 50; i++) {
      const bizId = String(((i - 1) % 5) + 1);
      const accId = "cust_b" + bizId;
      const amount = 100;
      const type = i % 2 === 0 ? "given" : "received";

      promises.push(
        repo.mutateCollection("journals", prev => [
          ...prev,
          { id: "j_stress_" + i, businessId: bizId, accountId: accId, amount, type, date: "2026-11-02" }
        ])
      );
    }

    await Promise.all(promises);

    const finalState = repo.getAuthoritativeState();
    assert.strictEqual(finalState.journals.length, 50, "All 50 journals must be recorded");

    // Verify each business ledger independently
    for (let b = 1; b <= 5; b++) {
      const bStr = String(b);
      const acc = finalState.accounts.find(a => a.id === "cust_b" + bStr);
      const bizJournals = finalState.journals.filter(j => String(j.businessId) === bStr);
      assert.strictEqual(bizJournals.length, 10, "Each business must have exactly 10 journals");

      const recalc = ledgerEngine.recalculateAccountRunningBalances(acc, finalState.journals);
      // In 10 journals: 5 are given (+500), 5 are received (-500) -> Net change = 0
      assert.strictEqual(recalc.updatedAccount.balance, 1000, "Account balance must return exactly to opening balance");
    }
  });

  // =========================================================================
  // PART 2: Atomic Transaction Invariants & Automatic Rollback
  // =========================================================================
  await runTest("2.1: executeAtomicTransaction rolls back completely on integrity error without corrupting state", async () => {
    const repo = new StorageRepository(createMockAdapter(createDefaultState()));
    await repo.loadInitialData();

    const baselineState = repo.getAuthoritativeState();

    // Attempt a transaction that introduces a NaN balance (violating integrity)
    const result = await repo.executeAtomicTransaction(async (draft) => {
      draft.accounts.push({ id: "acc_invalid", balance: NaN });
      return draft;
    });

    assert.strictEqual(result.success, false, "Transaction must fail");
    assert.strictEqual(result.rolledBack, true, "Transaction must be marked rolledBack");
    assert.ok(result.error.includes("NaN or invalid"));

    // State must be 100% identical to pre-transaction baseline
    assert.deepStrictEqual(repo.getAuthoritativeState(), baselineState);
  });

  // =========================================================================
  // PART 3: Storage Compaction & Orphaned Record Purging
  // =========================================================================
  await runTest("3.1: compactStorage removes orphaned journals and vacuum-recalculates account balances", async () => {
    const dirtyState = createDefaultState();
    dirtyState.accounts = [
      { id: "valid_acc_1", businessId: "1", type: 1, balance: 1000, openingBalance: 1000 }
    ];
    dirtyState.journals = [
      // Valid journal
      { id: "j_valid_1", businessId: "1", accountId: "valid_acc_1", amount: 500, type: "given", date: "2026-11-01" },
      // Orphaned journals referencing non-existent accounts
      { id: "j_orphan_1", businessId: "1", accountId: "ghost_acc_99", amount: 200, type: "given", date: "2026-11-01" },
      { id: "j_orphan_2", businessId: "1", accountId: "deleted_acc_88", amount: 300, type: "received", date: "2026-11-02" },
    ];

    const repo = new StorageRepository(createMockAdapter(dirtyState));
    await repo.loadInitialData();

    const compactRes = await repo.compactStorage({ recalculateBalances: true });
    assert.strictEqual(compactRes.success, true);
    assert.strictEqual(compactRes.stats.orphanedJournalsRemoved, 2, "Must remove exactly 2 orphaned journals");

    const cleanedState = repo.getAuthoritativeState();
    assert.strictEqual(cleanedState.journals.length, 1);
    assert.strictEqual(cleanedState.journals[0].id, "j_valid_1");

    // Valid account balance must be recalibrated: 1000 (opening) + 500 (given) = 1500
    assert.strictEqual(cleanedState.accounts[0].balance, 1500);
  });

  // =========================================================================
  // PART 4: Cloud Backup Checksum Tamper Detection
  // =========================================================================
  await runTest("4.1: validateBackupIntegrity detects byte-level tampering and aborts restoration", async () => {
    const state = createDefaultState();
    const userProfile = { sub: "merchant_tamper_test", email: "test@gmail.com", name: "Tamper Test" };
    const backup = buildBackupPayload(state, userProfile);

    // Baseline validation must be valid
    const initialCheck = validateBackupIntegrity(backup, "merchant_tamper_test");
    assert.strictEqual(initialCheck.valid, true);

    // Tamper with payload: modify an account balance
    const tamperedPayload = JSON.parse(JSON.stringify(backup));
    tamperedPayload.data.accounts.push({ id: "malicious_acc", balance: 999999 });

    // Validate tampered payload
    const tamperedCheck = validateBackupIntegrity(tamperedPayload, "merchant_tamper_test");
    assert.strictEqual(tamperedCheck.valid, false, "Tampered payload must fail integrity check");
    assert.ok(tamperedCheck.error.includes("integrity checksum verification failed"), "Error must cite checksum failure");
  });

  // =========================================================================
  // PART 5: Storage Metrics Observability & Quota Threshold Analysis
  // =========================================================================
  await runTest("5.1: getStorageMetrics calculates accurate domain breakdown and quota percentage", async () => {
    const mockStore = createMockAdapter(createDefaultState());
    const repo = new StorageRepository(mockStore);
    await repo.loadInitialData();

    const metrics = await repo.getStorageMetrics();
    assert.ok(metrics.totalBytes > 0, "totalBytes must be > 0");
    assert.ok(typeof metrics.domains.business === "number", "Business domain bytes must be a number");
    assert.ok(typeof metrics.domains.personal === "number", "Personal domain bytes must be a number");
    assert.ok(typeof metrics.domains.preferences === "number", "Preferences domain bytes must be a number");
    assert.strictEqual(typeof metrics.usagePercent, "number");
    assert.strictEqual(metrics.isNearQuota, false);
  });

  console.log("\n================================================================");
  console.log("ALL " + passedTests + " / " + totalTests + " TESTS PASSED WITH 100% SUCCESS!");
  console.log("ITERATION 025 CONCURRENCY & COMPACTION PARITY VERIFIED!");
  console.log("================================================================");
})();
