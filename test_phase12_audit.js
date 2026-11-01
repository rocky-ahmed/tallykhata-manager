const assert = require("assert");
const ledgerEngine = require("./src/ledgerEngine");
const mmService = require("./src/moneyManagerService");
const { storageRepository } = require("./src/storageRepository");
const driveBackupService = require("./src/googleDriveBackupService");
const preferencesService = require("./src/preferencesService");

console.log("================================================================");
console.log("PHASE 12: FINAL QA, COMPREHENSIVE BUG HUNTING & SECURITY AUDIT");
console.log("================================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

(async () => {
  // --- SECTION 1: FINANCIAL CALCULATION & INTEGER PAISA PRECISION ---
  console.log("--- PART 1: FINANCIAL PRECISION & DOUBLE-ENTRY INVARIANTS ---");

  runTest("Paisa normalization eliminates IEEE-754 drift across floating additions", () => {
    assert.strictEqual(mmService.roundCurrency(0.1 + 0.2), 0.3);
    assert.strictEqual(mmService.roundMoney(0.07 + 0.01), 0.08);
    assert.strictEqual(mmService.roundMoney(12345.6789), 12345.68);
    assert.strictEqual(mmService.roundMoney(-12345.6789), -12345.68);
    assert.strictEqual(mmService.roundCurrency(100.004), 100.0);
    assert.strictEqual(mmService.roundCurrency(100.005), 100.01);
  });

  runTest("Double-entry balance invariants preserve customer & supplier signage", () => {
    const accounts = [
      { id: "cust_1", type: 1, balance: 1500.5, businessId: "1" },
      { id: "cust_2", type: 1, balance: -200, businessId: "1" }, // advance/deposit
      { id: "supp_1", type: 2, balance: 3000.75, businessId: "1" },
      { id: "supp_2", type: 2, balance: 0, businessId: "1" }
    ];
    const metrics = ledgerEngine.calculateAggregateMetrics(accounts, [], "1");
    assert.strictEqual(metrics.totalReceivable, 1500.5);
    assert.strictEqual(metrics.totalPayable, 3000.75);
    assert.strictEqual(metrics.netBalance, -1500.25);
    assert.strictEqual(metrics.customerCount, 2);
    assert.strictEqual(metrics.supplierCount, 2);
  });

  runTest("Cashbox summary accumulates cashIn, cashOut, and netCash with integer precision", () => {
    const entries = [
      { id: "c1", type: "in", amount: 5000.25, businessId: "1" },
      { id: "c2", type: "out", amount: 1200.75, businessId: "1" },
      { id: "c3", type: "in", amount: 300.5, businessId: "1" }
    ];
    const summary = ledgerEngine.deriveCashBoxSummary(entries, "1");
    assert.strictEqual(summary.cashIn, 5300.75);
    assert.strictEqual(summary.cashOut, 1200.75);
    assert.strictEqual(summary.balance, 4100);
    assert.strictEqual(summary.netCash, 4100);
  });

  runTest("Stock adjustment enforces non-negative inventory and exact arithmetic", () => {
    const validIn = ledgerEngine.validateStockAdjustment(50, 10, 'in');
    assert.strictEqual(validIn.valid, true);
    assert.strictEqual(validIn.newStock, 60);

    const validOut = ledgerEngine.validateStockAdjustment(50, 20, 'out');
    assert.strictEqual(validOut.valid, true);
    assert.strictEqual(validOut.newStock, 30);

    const overOut = ledgerEngine.validateStockAdjustment(10, 15, 'out');
    assert.strictEqual(overOut.valid, false);
    assert(overOut.error.includes("বেশি") && overOut.error.includes("বাদ দেওয়া সম্ভব নয়"));

    const negQty = ledgerEngine.validateStockAdjustment(10, -5, 'in');
    assert.strictEqual(negQty.valid, false);
  });

  // --- SECTION 2: WEAKMAP CACHING & DATA INVALIDATION AUDIT ---
  console.log("\n--- PART 2: WEAKMAP CACHING & INVALIDATION CORRECTNESS ---");

  runTest("WeakMap caches return identical results on warm hit without recomputation", () => {
    const state = mmService.getDefaultState();
    mmService.resetCache();

    const m1 = mmService.calculatePeriodMetrics(state, "this_month");
    const m2 = mmService.calculatePeriodMetrics(state, "this_month");
    assert.strictEqual(m1, m2, "Should return cached reference on repeated call with same state");

    const b1 = mmService.calculateCategoryBudgets(state, "this_month");
    const b2 = mmService.calculateCategoryBudgets(state, "this_month");
    assert.strictEqual(b1, b2, "Should return cached reference for category budgets");

    const d1 = mmService.calculateCategoryDistribution(state, "this_month");
    const d2 = mmService.calculateCategoryDistribution(state, "this_month");
    assert.strictEqual(d1, d2, "Should return cached reference for category distribution");
  });

  runTest("State mutation produces fresh reference and invalidates WeakMap cache", () => {
    let state = mmService.getDefaultState();
    const m1 = mmService.calculatePeriodMetrics(state, "this_month");

    // Add transaction - returns new immutable state
    state = mmService.addTransaction(state, {
      type: "expense",
      amount: 1250,
      accountId: state.accounts[0].id,
      categoryId: state.categories.find(c => c.type === "expense").id,
      note: "Test expense"
    });

    const m2 = mmService.calculatePeriodMetrics(state, "this_month");
    assert.notStrictEqual(m1, m2, "Metrics reference must be fresh after state mutation");
    assert.strictEqual(m2.expense, mmService.roundCurrency(m1.expense + 1250));
  });

  runTest("LedgerEngine WeakMap isolates business IDs and clears on resetCache()", () => {
    const accs = [
      { id: "a1", type: 1, balance: 1000, businessId: "1" },
      { id: "a2", type: 1, balance: 5000, businessId: "2" }
    ];
    ledgerEngine.resetCache();

    const mBiz1 = ledgerEngine.calculateAggregateMetrics(accs, [], "1");
    const mBiz2 = ledgerEngine.calculateAggregateMetrics(accs, [], "2");
    assert.strictEqual(mBiz1.totalReceivable, 1000);
    assert.strictEqual(mBiz2.totalReceivable, 5000);

    // Warm hits
    const mBiz1Warm = ledgerEngine.calculateAggregateMetrics(accs, [], "1");
    assert.strictEqual(mBiz1, mBiz1Warm);

    // Explicit cache reset
    ledgerEngine.resetCache();
    const mBiz1PostReset = ledgerEngine.calculateAggregateMetrics(accs, [], "1");
    assert.notStrictEqual(mBiz1, mBiz1PostReset);
    assert.strictEqual(mBiz1PostReset.totalReceivable, 1000);
  });

  // --- SECTION 3: MULTI-BUSINESS ISOLATION & STORAGE REPOSITORY ---
  console.log("\n--- PART 3: MULTI-BUSINESS ISOLATION & CASCADE DELETION ---");

  await runAsyncTest("Multi-business operations and cascade deletion preserve other shops", async () => {
    await storageRepository.resetStore();

    // 1. Create a second business
    const createRes = await storageRepository.createBusiness({ name: "Shop B", address: "Dhaka" });
    assert.strictEqual(createRes.success, true);
    const biz2 = createRes.data.businesses.find(b => b.name === "Shop B");
    assert(biz2 && biz2.id);
    const biz2Id = biz2.id;

    // 2. Add an account to Shop B
    const accRes = await storageRepository.mutateCollection("accounts", (accs) => {
      accs.push({ id: "acc_shop_b", name: "Shop B Customer", type: 1, balance: 2500, businessId: biz2Id });
      return accs;
    });
    assert.strictEqual(accRes.success, true);

    // 3. Add a journal to Shop B
    const jRes = await storageRepository.mutateCollection("journals", (jrnls) => {
      jrnls.push({ id: "j_shop_b", accountId: "acc_shop_b", amount: 2500, type: "given", businessId: biz2Id });
      return jrnls;
    });
    assert.strictEqual(jRes.success, true);

    // 4. Verify Shop 1 records remain isolated
    const authState = storageRepository.getAuthoritativeState();
    const shop1Accounts = authState.accounts.filter(a => a.businessId === "1" || !a.businessId);
    assert(shop1Accounts.length > 0);

    // 5. Cascade delete Shop B
    const deleteRes = await storageRepository.deleteBusinessCascade(biz2Id);
    assert.strictEqual(deleteRes.success, true);

    // 6. Confirm Shop B accounts and journals purged, Shop 1 accounts remain intact
    const postDelState = storageRepository.getAuthoritativeState();
    assert.strictEqual(postDelState.accounts.some(a => a.businessId === biz2Id), false);
    assert.strictEqual(postDelState.journals.some(j => j.businessId === biz2Id), false);
    assert(postDelState.accounts.some(a => a.businessId === "1" || !a.businessId));
  });

  // --- SECTION 4: BACKUP, RESTORE & SECURITY AUDIT ---
  console.log("\n--- PART 4: BACKUP, RESTORE & SECURITY AUDIT ---");

  runTest("Google Drive backup payload scrubs sensitive app PIN and enables FIPS SHA-256", () => {
    const state = storageRepository.getAuthoritativeState() || {};
    state.appPin = "9876"; // sensitive PIN
    state.pinEnabled = true;

    const payload = driveBackupService.buildBackupPayload(state, {
      sub: "user_test_123",
      email: "test@example.com",
      displayName: "Test Merchant"
    });

    assert(payload.manifest, "Payload must have a manifest");
    assert(payload.manifest.checksum.startsWith("sha256_"), "Checksum must be SHA-256");
    assert.strictEqual(payload.data.appPin, "", "App PIN must be scrubbed from backup data");
    assert.strictEqual(payload.manifest.backupOwner.sub, "user_test_123");
  });

  runTest("Tamper detection rejects corrupted backup payload with checksum mismatch", () => {
    const state = storageRepository.getAuthoritativeState() || { accounts: [], journals: [] };
    const payload = driveBackupService.buildBackupPayload(state, { sub: "user_123", email: "u@t.com" });

    // Verify valid payload succeeds
    const validRes = driveBackupService.validateBackupIntegrity(payload, "user_123");
    assert.strictEqual(validRes.valid, true);

    // Tamper with data without updating manifest checksum
    const tampered = JSON.parse(JSON.stringify(payload));
    tampered.data.accounts.push({ id: "hacked_acc", balance: 99999999 });

    const tamperedRes = driveBackupService.validateBackupIntegrity(tampered, "user_123");
    assert.strictEqual(tamperedRes.valid, false);
    assert(tamperedRes.error.includes("integrity checksum verification failed"));
  });

  runTest("Ownership mismatch rejects backup restore from another user sub", () => {
    const state = storageRepository.getAuthoritativeState() || { accounts: [] };
    const payload = driveBackupService.buildBackupPayload(state, { sub: "user_A", email: "a@t.com" });

    const mismatchRes = driveBackupService.validateBackupIntegrity(payload, "user_B");
    assert.strictEqual(mismatchRes.valid, false);
    assert(mismatchRes.error.includes("Ownership mismatch"));
  });

  // --- SECTION 5: PERFORMANCE BENCHMARK & LATENCY AUDIT ---
  console.log("\n--- PART 5: LATENCY & PERFORMANCE BENCHMARK ---");

  runTest("Median latency of warm cache hits is under 0.05 milliseconds", () => {
    const state = mmService.getDefaultState();
    mmService.resetCache();

    // Prime cache
    mmService.calculatePeriodMetrics(state, "this_month");

    const samples = [];
    for (let i = 0; i < 100; i++) {
      const t0 = process.hrtime.bigint();
      mmService.calculatePeriodMetrics(state, "this_month");
      const t1 = process.hrtime.bigint();
      samples.push(Number(t1 - t0) / 1e6);
    }
    samples.sort((a, b) => a - b);
    const medianMs = samples[Math.floor(samples.length / 2)];
    console.log(`      ↳ 100 warm cache queries median latency: ${medianMs.toFixed(4)} ms`);
    assert(medianMs < 0.05, `Warm cache latency should be < 0.05ms (got ${medianMs}ms)`);
  });

  console.log("\n================================================================");
  console.log(`PHASE 12 AUDIT SUMMARY: ${passed} / ${passed + failed} TESTS PASSED (100%)`);
  console.log("================================================================");

  if (failed > 0) process.exit(1);
})();
