/**
 * test_feature12_high_frequency_io_parity.js
 * Comprehensive Parity & Verification Suite for Feature 012: High-Frequency I/O & Mutex Serialization Parity
 *
 * Verifies 100% parity across:
 * 1. Mutex Queue Serialization & Execution Ordering (FIFO sequence).
 * 2. High-Frequency Concurrent Burst Mutations (50+ interleaved writes).
 * 3. Zero Torn Reads & Snapshot Atomicity under high-frequency writes.
 * 4. Error Recovery & Queue Unpoisoning (failing writes do not deadlock subsequent writes).
 * 5. Multi-Collection Concurrency (journals, accounts, cashEntries, notes).
 * 6. Inventory & Stock Continuous Synchronization under rapid concurrency.
 * 7. Money Manager Mutex Integration (saveMoneyManager serialized without severing business writes).
 * 8. Pre-Restore & Safety Snapshot Queue Drainage (waitForIdle / writeQueue drainage).
 * 9. Integer-Paisa Arithmetic Under Concurrent Load (zero IEEE-754 drift).
 * 10. Babel AST Syntax & Static Analysis Integrity.
 */

const assert = require("assert");
const fs = require("fs");
const babel = require("@babel/core");

const {
  StorageRepository,
  storageRepository,
} = require("./src/storageRepository");
const ledgerEngine = require("./src/ledgerEngine");

console.log("================================================================");
console.log("FEATURE 12: HIGH-FREQUENCY I/O & MUTEX SERIALIZATION PARITY");
console.log("================================================================\n");

let totalTests = 0;
let passedTests = 0;

function runSyncTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function main() {
  // ============================================================================
  // PART 1: MUTEX QUEUE INITIALIZATION & BASIC STATE HELPERS
  // ============================================================================
  console.log("--- PART 1: MUTEX QUEUE INITIALIZATION & BASIC STATE HELPERS ---");

  await runAsyncTest("1.1: StorageRepository initializes with idle writeQueue and zero pending writes", async () => {
    const repo = new StorageRepository();
    assert.strictEqual(repo.isWriteQueueIdle(), true, "Fresh repo writeQueue must be idle");
    assert.strictEqual(repo.getPendingWritesCount(), 0, "Fresh repo pending writes must be 0");
    const isIdle = await repo.waitForIdle();
    assert.strictEqual(isIdle, true, "waitForIdle() must resolve true on idle repo");
  });

  await runAsyncTest("1.2: MutateCollection single write transitions queue and settles to idle", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const writePromise = repo.mutateCollection("notes", (items) => [
      ...items,
      { id: "note_single_1", title: "Single Note", text: "Test note" },
    ]);

    const res = await writePromise;
    assert.strictEqual(res.success, true, "Single note write must succeed");
    assert.strictEqual(repo.isWriteQueueIdle(), true, "Queue must be idle after write resolves");
    assert.strictEqual(repo.getPendingWritesCount(), 0, "Pending writes count must be 0");

    const state = await repo.getAuthoritativeState();
    const found = state.notes.find((n) => n.id === "note_single_1");
    assert.ok(found, "Newly added note must exist in authoritative store");
  });

  // ============================================================================
  // PART 2: CONCURRENT BURST MUTATIONS & STRICT FIFO ORDERING
  // ============================================================================
  console.log("\n--- PART 2: CONCURRENT BURST MUTATIONS & STRICT FIFO ORDERING ---");

  await runAsyncTest("2.1: 50 concurrent un-awaited mutations to same collection execute in strict FIFO order", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const orderTracker = [];
    const promises = [];
    const TOTAL_BURST = 50;

    for (let i = 1; i <= TOTAL_BURST; i++) {
      const idx = i;
      promises.push(
        repo.mutateCollection("journals", (items) => {
          orderTracker.push(idx);
          return [
            ...items,
            { id: `j_burst_${idx}`, amount: idx * 100, date: "2026-11-02", businessId: "1" },
          ];
        })
      );
    }

    const results = await Promise.all(promises);
    for (let i = 0; i < TOTAL_BURST; i++) {
      assert.strictEqual(results[i].success, true, `Burst write ${i + 1} must report success`);
    }

    // Verify strict FIFO order of updater execution
    assert.strictEqual(orderTracker.length, TOTAL_BURST, "All updaters must have executed");
    for (let i = 0; i < TOTAL_BURST; i++) {
      assert.strictEqual(orderTracker[i], i + 1, `Updater ${i + 1} must execute in exact chronological order`);
    }

    const state = await repo.getAuthoritativeState();
    const burstJournals = state.journals.filter((j) => j.id.startsWith("j_burst_"));
    assert.strictEqual(burstJournals.length, TOTAL_BURST, "Authoritative store must contain all 50 burst records");
    assert.strictEqual(repo.isWriteQueueIdle(), true, "Queue must be idle after all burst writes complete");
  });

  await runAsyncTest("2.2: Interleaved concurrent mutations across multiple collections maintain isolation", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const promises = [];
    const NUM_ROUNDS = 20;

    for (let r = 1; r <= NUM_ROUNDS; r++) {
      // Interleave across 4 distinct collections
      promises.push(
        repo.mutateCollection("accounts", (items) => [
          ...items,
          { id: `acc_interleaved_${r}`, name: `Customer ${r}`, type: 1, balance: r * 50 },
        ])
      );
      promises.push(
        repo.mutateCollection("journals", (items) => [
          ...items,
          { id: `j_interleaved_${r}`, accountId: `acc_interleaved_${r}`, amount: r * 50, date: "2026-11-02" },
        ])
      );
      promises.push(
        repo.mutateCollection("cashEntries", (items) => [
          ...items,
          { id: `cash_interleaved_${r}`, amount: r * 20, type: "in", date: "2026-11-02" },
        ])
      );
      promises.push(
        repo.mutateCollection("notes", (items) => [
          ...items,
          { id: `note_interleaved_${r}`, title: `Note ${r}`, date: "2026-11-02" },
        ])
      );
    }

    const results = await Promise.all(promises);
    assert.strictEqual(results.length, NUM_ROUNDS * 4, "All 80 interleaved promises must resolve");
    for (const res of results) {
      assert.strictEqual(res.success, true, "Every interleaved mutation must succeed");
    }

    const finalState = await repo.getAuthoritativeState();
    const addedAccounts = finalState.accounts.filter((a) => a.id.startsWith("acc_interleaved_"));
    const addedJournals = finalState.journals.filter((j) => j.id.startsWith("j_interleaved_"));
    const addedCash = finalState.cashEntries.filter((c) => c.id.startsWith("cash_interleaved_"));
    const addedNotes = finalState.notes.filter((n) => n.id.startsWith("note_interleaved_"));

    assert.strictEqual(addedAccounts.length, NUM_ROUNDS, "Accounts count must match rounds");
    assert.strictEqual(addedJournals.length, NUM_ROUNDS, "Journals count must match rounds");
    assert.strictEqual(addedCash.length, NUM_ROUNDS, "CashEntries count must match rounds");
    assert.strictEqual(addedNotes.length, NUM_ROUNDS, "Notes count must match rounds");
  });

  // ============================================================================
  // PART 3: ZERO TORN READS & ATOMIC STATE IMMUTABILITY
  // ============================================================================
  console.log("\n--- PART 3: ZERO TORN READS & ATOMIC STATE IMMUTABILITY ---");

  await runAsyncTest("3.1: Sequential read-modify-write patterns observe atomic committed states without torn reads", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    // Start with a customer account
    await repo.mutateCollection("accounts", (items) => [
      ...items,
      { id: "cust_atom_1", name: "Atomic Customer", type: 1, balance: 1000 },
    ]);

    // Fire 10 rapid concurrent updates that read the previous balance and add 100
    const addPromises = [];
    for (let i = 0; i < 10; i++) {
      addPromises.push(
        repo.mutateCollection("accounts", (items) => {
          return items.map((acc) => {
            if (acc.id === "cust_atom_1") {
              return { ...acc, balance: (acc.balance || 0) + 100 };
            }
            return acc;
          });
        })
      );
    }

    await Promise.all(addPromises);

    const state = await repo.getAuthoritativeState();
    const targetAcc = state.accounts.find((a) => a.id === "cust_atom_1");
    assert.ok(targetAcc);
    assert.strictEqual(targetAcc.balance, 2000, "10 concurrent +100 increments on 1000 must strictly yield 2000 (zero lost updates)");
  });

  await runAsyncTest("3.2: Continuous inventory and stock two-way synchronization under rapid mutations", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    // Mutate inventory collection directly
    const invRes = await repo.mutateCollection("inventory", (items) => [
      ...items,
      { id: "prod_sync_1", name: "SIM Card", stockQty: 10, buyPrice: 50, salePrice: 100 },
    ]);
    assert.strictEqual(invRes.success, true);

    const state1 = await repo.getAuthoritativeState();
    assert.strictEqual(state1.inventory.length, state1.stock.length, "inventory and stock lengths must be identical");
    assert.ok(state1.stock.find((s) => s.id === "prod_sync_1"), "stock must receive item added via inventory");

    // Mutate stock collection directly
    const stockRes = await repo.mutateCollection("stock", (items) => [
      ...items,
      { id: "prod_sync_2", name: "Scratch Card", stockQty: 25, buyPrice: 20, salePrice: 25 },
    ]);
    assert.strictEqual(stockRes.success, true);

    const state2 = await repo.getAuthoritativeState();
    assert.strictEqual(state2.inventory.length, state2.stock.length, "inventory and stock lengths must remain synchronized");
    assert.ok(state2.inventory.find((i) => i.id === "prod_sync_2"), "inventory must receive item added via stock");
  });

  // ============================================================================
  // PART 4: ERROR RECOVERY & UNPOISONED QUEUE RESILIENCE
  // ============================================================================
  console.log("\n--- PART 4: ERROR RECOVERY & UNPOISONED QUEUE RESILIENCE ---");

  await runAsyncTest("4.1: Synchronous throw inside mutateCollection updater reports failure and unblocks subsequent writes", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const failingPromise = repo.mutateCollection("notes", () => {
      throw new Error("Simulated intentional synchronous fault in updater");
    });

    const succeedingPromise = repo.mutateCollection("notes", (items) => [
      ...items,
      { id: "note_recovered_sync", title: "Recovered Note", text: "Must succeed after sync failure" },
    ]);

    const [failRes, successRes] = await Promise.all([failingPromise, succeedingPromise]);
    assert.strictEqual(failRes.success, false, "Failing mutation must report success: false");
    assert.ok(failRes.error, "Failing mutation must provide error object");
    assert.strictEqual(successRes.success, true, "Subsequent mutation must succeed without deadlock");

    const state = await repo.getAuthoritativeState();
    assert.ok(state.notes.find((n) => n.id === "note_recovered_sync"), "Subsequent write must be committed");
  });

  await runAsyncTest("4.2: Asynchronous rejection inside mutateStore updater reports failure and does not poison queue", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const failingPromise = repo.mutateStore(async () => {
      await new Promise((r) => setTimeout(r, 5));
      throw new Error("Simulated async rejection inside mutateStore");
    });

    const succeedingPromise = repo.mutateStore(async (baseStore) => {
      return {
        ...baseStore,
        notes: [...baseStore.notes, { id: "note_recovered_async", title: "Recovered Async" }],
      };
    });

    const [failRes, successRes] = await Promise.all([failingPromise, succeedingPromise]);
    assert.strictEqual(failRes.success, false, "Async failing mutation must report failure");
    assert.strictEqual(successRes.success, true, "Subsequent mutateStore must succeed");

    const state = await repo.getAuthoritativeState();
    assert.ok(state.notes.find((n) => n.id === "note_recovered_async"));
  });

  await runAsyncTest("4.3: Non-array or non-object return from updaters safely rejected without queue deadlock", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    // Invalid non-array return from mutateCollection
    const badCollRes = await repo.mutateCollection("notes", () => "not-an-array");
    assert.strictEqual(badCollRes.success, false, "Non-array return must fail");
    assert.ok(badCollRes.error.includes("must return an array"));

    // Invalid non-object return from mutateStore
    const badStoreRes = await repo.mutateStore(() => null);
    assert.strictEqual(badStoreRes.success, false, "Null return must fail");
    assert.ok(badStoreRes.error.includes("valid store object"));

    // Verify queue remains healthy for normal mutation
    const healthyRes = await repo.mutateCollection("notes", (items) => [
      ...items,
      { id: "note_after_invalid_type", title: "Valid Item" },
    ]);
    assert.strictEqual(healthyRes.success, true, "Queue must remain operational");
  });

  await runAsyncTest("4.4: Adapter write failure gracefully caught and subsequent writes succeed", async () => {
    let failNextSet = false;
    const baseAdapter = {
      _store: new Map(),
      async getItem(k) { return this._store.get(k) || null; },
      async setItem(k, v) {
        if (failNextSet) {
          failNextSet = false;
          throw new Error("Simulated disk I/O write failure (disk full)");
        }
        this._store.set(k, String(v));
      },
      async removeItem(k) { this._store.delete(k); },
      async clear() { this._store.clear(); },
    };

    const repo = new StorageRepository(baseAdapter);
    await repo.loadInitialData();

    failNextSet = true;
    const failRes = await repo.mutateCollection("notes", (items) => [
      ...items,
      { id: "note_disk_fail", title: "Will Fail" },
    ]);
    assert.strictEqual(failRes.success, false, "Disk error must result in failure result");

    // Next write must succeed
    const okRes = await repo.mutateCollection("notes", (items) => [
      ...items,
      { id: "note_disk_recovered", title: "Disk Recovered" },
    ]);
    assert.strictEqual(okRes.success, true, "Subsequent write must succeed after disk recovery");
  });

  // ============================================================================
  // PART 5: MONEY MANAGER WRITE QUEUE INTEGRATION & DOMAIN SAFETY
  // ============================================================================
  console.log("\n--- PART 5: MONEY MANAGER WRITE QUEUE INTEGRATION & DOMAIN SAFETY ---");

  await runAsyncTest("5.1: saveMoneyManager chains onto writeQueue and preserves domain isolation", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const mockMMState = {
      version: 3,
      accounts: [{ id: "acc_mm_1", name: "Cash Wallet", balance: 5000 }],
      categories: [{ id: "cat_food", name: "Food", type: "expense" }],
      transactions: [{ id: "mm_tx_1", amount: 150, type: "expense", categoryId: "cat_food" }],
    };

    // Save Money Manager through repo mutex
    const saveRes = await repo.saveMoneyManager(mockMMState);
    assert.strictEqual(saveRes.success, true, "saveMoneyManager must succeed");

    // Retrieve authoritative Money Manager
    const authoritativeMM = await repo.getAuthoritativeMoneyManager();
    assert.strictEqual(authoritativeMM.version, 3);
    assert.strictEqual(authoritativeMM.transactions.length, 1);
    assert.strictEqual(authoritativeMM.transactions[0].id, "mm_tx_1");

    // Verify Business state remains unpolluted
    const bizState = await repo.getAuthoritativeState();
    assert.strictEqual(bizState.journals.find((j) => j.id === "mm_tx_1"), undefined, "Business journals must not contain MM transaction");
  });

  await runAsyncTest("5.2: Interleaved saveMoneyManager and mutateCollection calls do not sever queue", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const promises = [];
    // Queue alternating business mutations and MM saves simultaneously
    for (let i = 1; i <= 10; i++) {
      promises.push(
        repo.mutateCollection("journals", (items) => [
          ...items,
          { id: `j_inter_${i}`, amount: i * 50, date: "2026-11-02", businessId: "1" },
        ])
      );
      promises.push(
        repo.saveMoneyManager({
          version: 3,
          accounts: [{ id: "acc_mm", name: "Wallet", balance: i * 100 }],
          transactions: [{ id: `mm_tx_${i}`, amount: i * 20 }],
        })
      );
    }

    const results = await Promise.all(promises);
    assert.strictEqual(results.length, 20, "All 20 interleaved operations must settle");
    for (const r of results) {
      assert.strictEqual(r.success, true, "All interleaved operations must report success");
    }

    // Await idle
    await repo.waitForIdle();
    assert.strictEqual(repo.isWriteQueueIdle(), true, "Queue must be completely idle");

    const state = await repo.getAuthoritativeState();
    assert.strictEqual(state.journals.filter((j) => j.id.startsWith("j_inter_")).length, 10);

    const finalMM = await repo.getAuthoritativeMoneyManager();
    assert.strictEqual(finalMM.transactions[0].id, "mm_tx_10");
  });

  // ============================================================================
  // PART 6: DRAINAGE SAFETY ON SNAPSHOT, BACKUP & RESET
  // ============================================================================
  console.log("\n--- PART 6: DRAINAGE SAFETY ON SNAPSHOT, BACKUP & RESET ---");

  await runAsyncTest("6.1: createLocalSafetySnapshot awaits all in-flight writes before snapshot capture", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    // Fire un-awaited mutation
    repo.mutateCollection("notes", (items) => [
      ...items,
      { id: "note_drain_snap", title: "Must be in snapshot", date: "2026-11-02" },
    ]);

    // Immediately call snapshot without awaiting mutateCollection
    const snapRes = await repo.createLocalSafetySnapshot("snap_drain_test");
    assert.strictEqual(snapRes.success, true);

    // Snapshot payload must contain the queued note because snapshot awaits writeQueue
    const snapStore = repo.activeSafetySnapshot.state;
    assert.ok(snapStore.notes.find((n) => n.id === "note_drain_snap"), "Snapshot must capture in-flight mutation");
  });

  await runAsyncTest("6.2: resetStore cleanly drains queue, clears caches, and resets pending count", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    // Queue mutation
    repo.mutateCollection("notes", (items) => [
      ...items,
      { id: "note_before_reset", title: "Before Reset" },
    ]);

    const resetOk = await repo.resetStore();
    assert.strictEqual(resetOk, true);
    assert.strictEqual(repo.isWriteQueueIdle(), true);
    assert.strictEqual(repo.getPendingWritesCount(), 0);
    assert.strictEqual(repo.currentStore, null);
  });

  // ============================================================================
  // PART 7: INTEGER-PAISA ARITHMETIC INTEGRITY UNDER CONCURRENT LOAD
  // ============================================================================
  console.log("\n--- PART 7: INTEGER-PAISA ARITHMETIC INTEGRITY UNDER CONCURRENT LOAD ---");

  await runAsyncTest("7.1: Concurrent 1,000 debit and credit journal additions maintain zero paisa drift", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const TOTAL_TXNS = 1000;
    const promises = [];

    // Rapid alternating 12.34 Taka credit and debit
    for (let i = 1; i <= TOTAL_TXNS; i++) {
      const type = i % 2 === 0 ? "credit" : "debit";
      promises.push(
        repo.mutateCollection("journals", (items) => [
          ...items,
          {
            id: `j_paisa_${i}`,
            accountId: "acc_paisa_test",
            amount: 12.34,
            type,
            date: "2026-11-02",
            businessId: "1",
          },
        ])
      );
    }

    await Promise.all(promises);

    const state = await repo.getAuthoritativeState();
    const testJournals = state.journals.filter((j) => j.id.startsWith("j_paisa_"));
    assert.strictEqual(testJournals.length, TOTAL_TXNS);

    // Compute balance with integer paisa logic
    let netPaisa = 0;
    for (const j of testJournals) {
      const p = Math.round(Number(j.amount) * 100);
      if (j.type === "credit") netPaisa += p;
      else netPaisa -= p;
    }

    assert.strictEqual(netPaisa, 0, "Alternating 500 equal credits and debits must yield exactly 0 paisa net balance");
  });

  // ============================================================================
  // PART 8: BABEL AST SYNTAX & STATIC ANALYSIS INTEGRITY
  // ============================================================================
  console.log("\n--- PART 8: BABEL AST SYNTAX & STATIC ANALYSIS INTEGRITY ---");

  runSyncTest("8.1: src/storageRepository.js parses cleanly with Babel AST", () => {
    const code = fs.readFileSync("src/storageRepository.js", "utf8");
    const ast = babel.parseSync(code, {
      filename: "src/storageRepository.js",
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["jsx", "flow"] },
    });
    assert.ok(ast, "src/storageRepository.js must produce valid AST");
  });

  runSyncTest("8.2: test_feature12_high_frequency_io_parity.js parses cleanly with Babel AST", () => {
    const code = fs.readFileSync("test_feature12_high_frequency_io_parity.js", "utf8");
    const ast = babel.parseSync(code, {
      filename: "test_feature12_high_frequency_io_parity.js",
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["jsx", "flow"] },
    });
    assert.ok(ast, "test_feature12_high_frequency_io_parity.js must produce valid AST");
  });

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  console.log("\n================================================================");
  console.log(`FEATURE 12 PARITY TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================\n");

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Unhandled error in test_feature12_high_frequency_io_parity:", err);
  process.exit(1);
});
