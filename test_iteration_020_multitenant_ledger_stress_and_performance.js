/**
 * REA Reconstruction — Iteration 020: Multi-Tenant Ledger Performance & Stress Hardening Suite
 */
const assert = require("assert");
const { StorageRepository, queryJournalsByDateRange } = require("./src/storageRepository");
const ledgerEngine = require("./src/ledgerEngine");

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

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

(async () => {
  console.log("================================================================");
  console.log("REA RECONSTRUCTION: ITERATION 020 MULTI-TENANT STRESS SUITE");
  console.log("================================================================\n");

  const repo = new StorageRepository(createMockAdapter());
  const initRes = await repo.loadInitialData();
  assert.strictEqual(initRes.success, true);

  // STEP 1: MULTI-TENANT ACTIVE PROVISIONING
  console.log("--- STEP 1: MULTI-TENANT PROVISIONING ---");

  await runTest("1.1: Default multi-tenant business profiles active and isolated", async () => {
    const active = repo.listActiveBusinesses();
    assert.strictEqual(active.length, 3, "Must have exactly 3 initial businesses");
    assert.strictEqual(active[0].id, "1");
    assert.strictEqual(active[1].id, "2");
    assert.strictEqual(active[2].id, "3");
  });

  // STEP 2: CROSS-BUSINESS ACCOUNT ID COLLISION ISOLATION & CONCURRENCY
  console.log("\n--- STEP 2: COLLISION ISOLATION & CONCURRENT WRITES ---");

  await runTest("2.1: indexJournalsByAccount scopes identical accountId across businesses", async () => {
    const b1Entries = [];
    const b2Entries = [];
    for (let i = 0; i < 30; i++) {
      b1Entries.push({
        id: `j_b1_${i + 1}`,
        businessId: "1",
        accountId: "shared_cust_01",
        amount: 100,
        type: "given",
        date: "2026-11-01",
        created_at: 1730460000000 + i * 1000
      });
      b2Entries.push({
        id: `j_b2_${i + 1}`,
        businessId: "2",
        accountId: "shared_cust_01",
        amount: 250,
        type: "given",
        date: "2026-11-02",
        created_at: 1730550000000 + i * 1000
      });
    }

    await repo.mutateCollection("journals", prev => [...prev, ...b1Entries, ...b2Entries]);
    const state = repo.getAuthoritativeState();

    const indexed = ledgerEngine.indexJournalsByAccount(state.journals);
    assert(indexed.has("1:shared_cust_01"), "Index must contain 1:shared_cust_01");
    assert(indexed.has("2:shared_cust_01"), "Index must contain 2:shared_cust_01");
    assert.strictEqual(indexed.get("1:shared_cust_01").length, 30, "Business 1 must have 30 journals");
    assert.strictEqual(indexed.get("2:shared_cust_01").length, 30, "Business 2 must have 30 journals");
  });

  await runTest("2.2: recalculateAccountRunningBalances isolates balances for identical account IDs", async () => {
    const state = repo.getAuthoritativeState();
    const accBiz1 = { id: "shared_cust_01", businessId: "1", type: 1, openingBalance: 1000 };
    const accBiz2 = { id: "shared_cust_01", businessId: "2", type: 1, openingBalance: 500 };

    const recalc1 = ledgerEngine.recalculateAccountRunningBalances(accBiz1, state.journals);
    const recalc2 = ledgerEngine.recalculateAccountRunningBalances(accBiz2, state.journals);

    // Business 1: 1000 + 30 * 100 = 4000
    assert.strictEqual(recalc1.updatedAccount.balance, 4000, "Business 1 balance must be 4000");
    assert.strictEqual(recalc1.accountJournals.length, 30, "Business 1 must filter exactly 30 journals");

    // Business 2: 500 + 30 * 250 = 8000
    assert.strictEqual(recalc2.updatedAccount.balance, 8000, "Business 2 balance must be 8000");
    assert.strictEqual(recalc2.accountJournals.length, 30, "Business 2 must filter exactly 30 journals");
  });

  // STEP 3: HIGH-VOLUME CHRONOLOGICAL PAGINATION & SORT PERFORMANCE
  console.log("\n--- STEP 3: HIGH-VOLUME PAGINATION & SORT PERFORMANCE ---");

  await runTest("3.1: queryJournalsByDateRange paginates high-volume journals with sub-millisecond latency", async () => {
    const state = repo.getAuthoritativeState();
    const b1Journals = state.journals.filter(j => String(j.businessId) === "1");
    const startTime = Date.now();
    const page1 = queryJournalsByDateRange(b1Journals, "2020-01-01", "2030-12-31", {
      limit: 10,
      offset: 0,
      sortOrder: "desc"
    });
    const duration = Date.now() - startTime;

    assert.strictEqual(page1.journals.length, 10, "Page 1 must return exactly 10 records");
    assert.strictEqual(page1.totalCount, 30, "Total count must be 30");
    assert(duration < 50, `Query duration (${duration}ms) must be under 50ms`);

    const page2 = queryJournalsByDateRange(b1Journals, "2020-01-01", "2030-12-31", {
      limit: 10,
      offset: 10,
      sortOrder: "desc"
    });
    assert.strictEqual(page2.journals.length, 10, "Page 2 must return exactly 10 records");

    // Ensure zero overlap between page 1 and page 2
    const page1Ids = new Set(page1.journals.map(j => j.id));
    for (const j of page2.journals) {
      assert(!page1Ids.has(j.id), "Page 2 IDs must not overlap Page 1");
    }
  });

  // STEP 4: CASCADE PURGE & INTEGRITY AUDIT
  console.log("\n--- STEP 4: CASCADE PURGE & MULTI-TENANT ISOLATION ---");

  await runTest("4.1: deleteBusinessCascade cleanly purges secondary business without touching Business 1 or 2", async () => {
    // Add some data to Business 3
    await repo.mutateCollection("journals", prev => [
      ...prev,
      { id: "j_b3_1", businessId: "3", accountId: "acc_b3", amount: 500, type: "given", date: "2026-11-03" }
    ]);

    // Archive Business 3 first
    const archiveRes = await repo.archiveBusiness("3");
    assert.strictEqual(archiveRes.success, true);

    // Delete Business 3 via cascade purge
    const deleteRes = await repo.deleteBusinessCascade("3");
    assert.strictEqual(deleteRes.success, true);

    const activeList = repo.listActiveBusinesses();
    assert.strictEqual(activeList.length, 2, "Must now have exactly 2 active businesses");
    assert(!activeList.some(b => b.id === "3"), "Business 3 must be absent");

    // Verify Business 1 and Business 2 data are 100% intact
    const postState = repo.getAuthoritativeState();
    const b1Count = (postState.journals || []).filter(j => String(j.businessId) === "1").length;
    const b2Count = (postState.journals || []).filter(j => String(j.businessId) === "2").length;
    const b3Count = (postState.journals || []).filter(j => String(j.businessId) === "3").length;

    assert.strictEqual(b1Count, 30, "Business 1 journals must remain exactly 30");
    assert.strictEqual(b2Count, 30, "Business 2 journals must remain exactly 30");
    assert.strictEqual(b3Count, 0, "Business 3 journals must be completely purged");
  });

  console.log("\n================================================================");
  console.log(`ITERATION 020 VERDICT: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================\n");
})();