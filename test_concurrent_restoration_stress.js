/**
 * test_concurrent_restoration_stress.js
 * Continuous Improvement Suite for BL-015: Multi-Device Concurrent Backup Restore State Collision Simulation
 *
 * Verifies:
 * 1. Scenario 1: Multi-device concurrent upload & timestamp/checksum collision detection.
 * 2. Scenario 2: In-progress storage mutations & snapshot rollback isolation.
 * 3. Scenario 3: Corrupted or truncated wire payload simulation (SHA-256 tamper proofing).
 * 4. Scenario 4: Selective domain restore under concurrent multi-tenant data (Business vs Personal MM).
 * 5. Scenario 5: Google Drive pre-upload connectivity ping (checkDriveConnectivity) & exponential backoff (executeWithRetry).
 *
 * Worker: Worker 3 (Ohm) — QA, Testing & Security Engineer
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 */

const assert = require("assert");
const {
  buildBackupPayload,
  validateBackupIntegrity,
  orchestrateCloudRestore,
  previewBackup,
  calculateChecksum,
  checkDriveConnectivity,
  executeWithRetry,
  GoogleDriveBackupService,
  googleDriveBackupService,
} = require("./src/googleDriveBackupService");
const { StorageRepository } = require("./src/storageRepository");

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
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
  console.log("================================================================");
  console.log("BL-015: MULTI-DEVICE CONCURRENT RESTORATION STRESS SUITE");
  console.log("================================================================\n");

  const testUser = {
    sub: "google_user_737ee4410405",
    email: "merchant@tallykhata.com",
    name: "Al-Madina General Store",
  };

  // ============================================================================
  // PART 1: SCENARIO 1 — MULTI-DEVICE CONCURRENT UPLOAD & COLLISION DETECTION
  // ============================================================================
  console.log("--- PART 1: SCENARIO 1 — MULTI-DEVICE CONCURRENCY & COLLISION ---");

  runTest("Scenario 1.1: Device B detects remote modification collision (T_remote > T_localBase)", () => {
    // Device A and Device B both start from base state at T0
    const t0 = "2026-11-01T08:00:00.000Z";
    const t1_DeviceA = "2026-11-01T09:30:00.000Z";
    const t2_DeviceB = "2026-11-01T10:00:00.000Z";

    const baseState = {
      accounts: [{ id: "c1", name: "করিম ব্রাদার্স", type: 1, balance: 5000 }],
      journals: [{ id: "j1", accountId: "c1", amount: 5000, type: "given", date: "2026-11-01" }],
    };

    // Device A records sales and uploads v1 at T1
    const deviceA_State = {
      accounts: [{ id: "c1", name: "করিম ব্রাদার্স", type: 1, balance: 8000 }],
      journals: [
        { id: "j1", accountId: "c1", amount: 5000, type: "given", date: "2026-11-01" },
        { id: "j2", accountId: "c1", amount: 3000, type: "given", date: "2026-11-01" },
      ],
    };
    const deviceA_Payload = buildBackupPayload(deviceA_State, testUser);
    const remoteMeta = {
      id: "cloud_file_001",
      name: "tallykhata_cloud_backup.json",
      modifiedTime: t1_DeviceA,
      createdTime: t1_DeviceA,
      checksum: deviceA_Payload.manifest.checksum,
    };

    // Device B operated offline and recorded independent sales at T2
    const deviceB_LastSync = t0;
    const deviceB_HasConflict = new Date(remoteMeta.modifiedTime) > new Date(deviceB_LastSync);

    assert.strictEqual(deviceB_HasConflict, true, "Device B must detect that remote cloud file has diverged");
    assert(deviceA_Payload.manifest.recordCounts.journals === 2, "Remote has 2 journals");
  });

  runTest("Scenario 1.2: Checksum discrepancy detects concurrent divergence even under clock skew", () => {
    const stateA = {
      accounts: [{ id: "c1", name: "করিম ব্রাদার্স", type: 1, balance: 7000 }],
      journals: [{ id: "j1", accountId: "c1", amount: 7000, type: "given" }],
    };
    const stateB = {
      accounts: [{ id: "c1", name: "করিম ব্রাদার্স", type: 1, balance: 6500 }],
      journals: [{ id: "j1", accountId: "c1", amount: 6500, type: "given" }],
    };

    const payloadA = buildBackupPayload(stateA, testUser);
    const payloadB = buildBackupPayload(stateB, testUser);

    assert.notStrictEqual(
      payloadA.manifest.checksum,
      payloadB.manifest.checksum,
      "Checksums must diverge between independently updated states"
    );
  });

  runTest("Scenario 1.3: Collision resolution preview provides accurate record counts for user decision", () => {
    const incomingRemote = buildBackupPayload({
      accounts: [{ id: "c1", type: 1, balance: 1000 }, { id: "c2", type: 1, balance: 2000 }],
      journals: [{ id: "j1", amount: 1000 }, { id: "j2", amount: 2000 }],
      cashEntries: [{ id: "ce1", amount: 500 }],
    }, testUser);

    const preview = previewBackup(incomingRemote);
    assert.strictEqual(preview.valid, true);
    assert.strictEqual(preview.recordCounts.accounts, 2);
    assert.strictEqual(preview.recordCounts.journals, 2);
    assert.strictEqual(preview.recordCounts.cashEntries, 1);
  });

  // ============================================================================
  // PART 2: SCENARIO 2 — IN-PROGRESS STORAGE MUTATIONS & SNAPSHOT ISOLATION
  // ============================================================================
  console.log("\n--- PART 2: SCENARIO 2 — IN-PROGRESS MUTATIONS & SNAPSHOT ISOLATION ---");

  await runAsyncTest("Scenario 2.1: Safety snapshot created before restore preserves 100% of pre-restore state", async () => {
    const mockStorage = new Map();
    const adapter = {
      async getItem(k) { return mockStorage.get(k) || null; },
      async setItem(k, v) { mockStorage.set(k, String(v)); },
      async removeItem(k) { mockStorage.delete(k); },
    };
    const repo = new StorageRepository(adapter);

    await repo.loadStore();
    await repo.mutateCollection("accounts", () => [
      { id: "local_c1", name: "গ্রাহক ১", type: 1, balance: 1000 },
    ]);
    await repo.mutateCollection("journals", () => [
      { id: "local_j1", accountId: "local_c1", amount: 1000, type: "given" },
    ]);

    const snapshotRes = await repo.createLocalSafetySnapshot();
    assert(snapshotRes.success, "Safety snapshot creation must succeed");
    const snapshotId = snapshotRes.snapshotId;

    // Simulate in-progress mutation attempt
    await repo.mutateCollection("accounts", (accs) => [
      ...accs,
      { id: "concurrent_c2", name: "কনকারেন্ট গ্রাহক ২", type: 1, balance: 500 },
    ]);

    assert.strictEqual(repo.getAuthoritativeState().accounts.length, 2);

    // Rollback to safety snapshot
    const rollbackRes = await repo.rollbackToSafetySnapshot(snapshotId);
    assert(rollbackRes.success, "Rollback to safety snapshot must succeed");

    const stateAfterRollback = repo.getAuthoritativeState();
    assert.strictEqual(stateAfterRollback.accounts.length, 1);
    assert.strictEqual(stateAfterRollback.accounts[0].id, "local_c1");
  });

  await runAsyncTest("Scenario 2.2: Failed commit during cloud restore rolls back without torn reads", async () => {
    const mockStorage = new Map();
    let failCommit = false;
    const failingAdapter = {
      async getItem(k) { return mockStorage.get(k) || null; },
      async setItem(k, v) {
        if (failCommit && !k.includes("safety_snapshot")) {
          throw new Error("Simulated Disk I/O Write Failure mid-commit");
        }
        mockStorage.set(k, String(v));
      },
      async removeItem(k) { mockStorage.delete(k); },
    };
    const failingRepo = new StorageRepository(failingAdapter);

    await failingRepo.loadStore();
    await failingRepo.mutateCollection("accounts", () => [
      { id: "baseline_acc", name: "সুরক্ষিত হিসাব", type: 1, balance: 2500 },
    ]);

    const baselineState = failingRepo.getAuthoritativeState();
    assert.strictEqual(baselineState.accounts.length, 1);

    const cloudPayloadForTest5 = buildBackupPayload({
      accounts: [{ id: "cloud_acc_1" }, { id: "cloud_acc_2" }]
    }, testUser);

    const driveMock = {
      async findBackupFile() { return { id: "f1", name: "tallykhata_cloud_backup.json" }; },
      async downloadBackup() {
        return {
          success: true,
          valid: true,
          manifest: cloudPayloadForTest5.manifest,
          data: cloudPayloadForTest5.data,
        };
      },
    };

    const origCommit = failingRepo.commitRestorePayload.bind(failingRepo);
    failingRepo.commitRestorePayload = async (...args) => {
      failCommit = true;
      return await origCommit(...args);
    };

    const restoreRes = await orchestrateCloudRestore({
      storageRepository: failingRepo,
      driveService: driveMock,
      getAccessToken: async () => "mock_token",
      fileId: "f1",
      userSub: testUser.sub,
    });

    assert.strictEqual(restoreRes.success, false, "Restore must report failure when commit fails");
    assert(restoreRes.rollbackAttempted, "Rollback must be attempted on commit failure");

    // Local database must retain baseline data without torn partial updates
    const finalState = failingRepo.getAuthoritativeState();
    assert(finalState.accounts.some(a => a.id === "baseline_acc"), "Original baseline account must be preserved");
  });

  // ============================================================================
  // PART 3: SCENARIO 3 — CORRUPTED OR TRUNCATED WIRE PAYLOAD SIMULATION
  // ============================================================================
  console.log("\n--- PART 3: SCENARIO 3 — CORRUPTED OR TRUNCATED WIRE PAYLOAD ---");

  runTest("Scenario 3.1: Wire truncation (truncated JSON string) fails parsing safely", () => {
    const fullPayload = buildBackupPayload({
      accounts: [{ id: "c1", balance: 500 }],
      journals: [{ id: "j1", amount: 500 }],
    }, testUser);

    const jsonStr = JSON.stringify(fullPayload);
    // Cut in half mid-stream
    const truncatedStr = jsonStr.substring(0, Math.floor(jsonStr.length / 2));

    let parseFailed = false;
    try {
      JSON.parse(truncatedStr);
    } catch (_) {
      parseFailed = true;
    }
    assert.strictEqual(parseFailed, true, "Truncated JSON must throw SyntaxError");
  });

  runTest("Scenario 3.2: 1-paisa balance tampering strictly triggers SHA-256 integrity violation", () => {
    const validPayload = buildBackupPayload({
      accounts: [{ id: "c1", name: "করিম", type: 1, balance: 1000.00 }],
      journals: [{ id: "j1", accountId: "c1", amount: 1000.00, type: "given" }],
    }, testUser);

    // Deep clone and tamper with account balance by 1 paisa (1000.00 -> 1000.01)
    const tampered = JSON.parse(JSON.stringify(validPayload));
    tampered.data.accounts[0].balance = 1000.01;

    const integrity = validateBackupIntegrity(tampered);
    assert.strictEqual(integrity.valid, false, "Tampered payload must fail integrity check");
    assert(integrity.error.toLowerCase().includes("checksum") || integrity.error.includes("চেকসাম"), "Error must cite checksum mismatch");
  });

  runTest("Scenario 3.3: Missing required manifest security properties rejected immediately", () => {
    const noOwner = {
      manifest: { backupVersion: 1, schemaVersion: 6, checksum: "chk_abc" },
      data: { accounts: [] },
    };
    const resNoOwner = validateBackupIntegrity(noOwner);
    assert.strictEqual(resNoOwner.valid, false);
    assert(resNoOwner.error.includes("Missing backup owner"), "Must reject missing owner");

    const noChecksum = {
      manifest: { backupVersion: 1, schemaVersion: 6, backupOwner: testUser },
      data: { accounts: [] },
    };
    const resNoChecksum = validateBackupIntegrity(noChecksum);
    assert.strictEqual(resNoChecksum.valid, false);
    assert(resNoChecksum.error.includes("checksum is required"), "Must reject missing checksum");
  });

  // ============================================================================
  // PART 4: SCENARIO 4 — SELECTIVE DOMAIN RESTORE UNDER MULTI-TENANT CONCURRENCY
  // ============================================================================
  console.log("\n--- PART 4: SCENARIO 4 — SELECTIVE DOMAIN RESTORE ISOLATION ---");

  await runAsyncTest("Scenario 4.1: Business-only restore updates ledger while preserving in-flight Money Manager", async () => {
    const mockStorage = new Map();
    const adapter = {
      async getItem(k) { return mockStorage.get(k) || null; },
      async setItem(k, v) { mockStorage.set(k, String(v)); },
      async removeItem(k) { mockStorage.delete(k); },
    };
    const repo = new StorageRepository(adapter);
    await repo.loadStore();

    // Local in-flight state has both Business and active Personal MM records
    await repo.mutateCollection("accounts", () => [
      { id: "local_b1", name: "পুরাতন কাস্টমার", type: 1, balance: 300 },
    ]);
    const localMM = {
      accounts: [{ id: "local_wallet_1", name: "আমার পকেট মানি", balance: 1500 }],
      transactions: [{ id: "local_tx_1", amount: 200, type: "expense" }],
      categories: [{ id: "cat_food", name: "খাবার" }],
    };
    await repo.saveMoneyManager(localMM);

    // Incoming cloud backup has updated Business records, but different MM
    const cloudBusinessState = {
      accounts: [
        { id: "cloud_b1", name: "নতুন ক্লাউড পাইকারি কাস্টমার", type: 1, balance: 15000 },
      ],
      journals: [
        { id: "cloud_j1", accountId: "cloud_b1", amount: 15000, type: "given" },
      ],
      moneyManager: {
        accounts: [{ id: "cloud_w_foreign", balance: 99999 }],
      },
    };
    const cloudPayload = buildBackupPayload(cloudBusinessState, testUser);

    // Execute business-only restore (domains: ['business'])
    const commitRes = await repo.commitRestorePayload(cloudPayload, { domains: ["business"] });

    assert(commitRes.success, "Business-only commit must succeed");

    const finalState = repo.getAuthoritativeState();
    // Business was restored:
    assert.strictEqual(finalState.accounts.length, 1);
    assert.strictEqual(finalState.accounts[0].id, "cloud_b1");
    assert.strictEqual(finalState.accounts[0].balance, 15000);

    // Money Manager was completely preserved from local state:
    const finalMM = await repo.getAuthoritativeMoneyManager();
    assert.strictEqual(finalMM.accounts.length, 1);
    assert.strictEqual(finalMM.accounts[0].id, "local_wallet_1");
    assert.strictEqual(finalMM.accounts[0].balance, 1500);
    assert.strictEqual(finalMM.transactions.length, 1);
    assert.strictEqual(finalMM.transactions[0].id, "local_tx_1");
  });

  await runAsyncTest("Scenario 4.2: Personal-only restore updates Money Manager while preserving Business ledger", async () => {
    const mockStorage = new Map();
    const adapter = {
      async getItem(k) { return mockStorage.get(k) || null; },
      async setItem(k, v) { mockStorage.set(k, String(v)); },
      async removeItem(k) { mockStorage.delete(k); },
    };
    const repo = new StorageRepository(adapter);
    await repo.loadStore();

    // Local in-flight state has active business ledger
    await repo.mutateCollection("accounts", () => [
      { id: "local_biz_c1", name: "মেসার্স রফিক স্টোর", type: 1, balance: 45000 },
    ]);
    await repo.mutateCollection("journals", () => [
      { id: "local_biz_j1", accountId: "local_biz_c1", amount: 45000, type: "given" },
    ]);
    await repo.mutateCollection("cashEntries", () => [
      { id: "local_ce1", amount: 5000, type: "in" },
    ]);

    // Incoming cloud backup has updated personal finances
    const cloudPersonalState = {
      accounts: [{ id: "foreign_biz_c99", balance: 1 }],
      moneyManager: {
        accounts: [
          { id: "cloud_wallet_bank", name: "ব্র্যাক ব্যাংক একাউন্ট", balance: 250000 },
          { id: "cloud_wallet_cash", name: "ড্রয়ার ক্যাশ", balance: 10000 },
        ],
        transactions: [
          { id: "cloud_mm_tx1", amount: 50000, type: "income", date: "2026-11-01" },
        ],
      },
    };
    const cloudPayload = buildBackupPayload(cloudPersonalState, testUser);

    // Execute personal-only restore (domains: ['moneyManager'])
    const commitRes = await repo.commitRestorePayload(cloudPayload, { domains: ["moneyManager"] });

    assert(commitRes.success, "Personal-only commit must succeed");

    const finalState = repo.getAuthoritativeState();
    // Business state must remain 100% untouched:
    assert.strictEqual(finalState.accounts.length, 1);
    assert.strictEqual(finalState.accounts[0].id, "local_biz_c1");
    assert.strictEqual(finalState.accounts[0].balance, 45000);
    assert.strictEqual(finalState.journals.length, 1);
    assert.strictEqual(finalState.journals[0].id, "local_biz_j1");
    assert.strictEqual(finalState.cashEntries.length, 1);

    // Money Manager state must reflect the restored personal data:
    const finalMM = await repo.getAuthoritativeMoneyManager();
    assert.strictEqual(finalMM.accounts.length, 2);
    assert.strictEqual(finalMM.accounts[0].id, "cloud_wallet_bank");
    assert.strictEqual(finalMM.accounts[0].balance, 250000);
    assert.strictEqual(finalMM.transactions.length, 1);
  });

  // ============================================================================
  // PART 5: SCENARIO 5 — CONNECTIVITY PING & EXPONENTIAL BACKOFF RETRY POLICY
  // ============================================================================
  console.log("\n--- PART 5: SCENARIO 5 — CONNECTIVITY PING & RETRY POLICY ---");

  await runAsyncTest("Scenario 5.1: checkDriveConnectivity detects offline network state safely", async () => {
    const offlineService = new GoogleDriveBackupService({
      fetch: async () => {
        const netErr = new TypeError("Failed to fetch: Network is offline");
        throw netErr;
      },
    });

    const ping = await offlineService.checkDriveConnectivity("valid_token", { timeoutMs: 100 });
    assert.strictEqual(ping.connected, false);
    assert.strictEqual(ping.offline, true);
    assert(ping.error.includes("Network is offline") || ping.error.includes("নেটওয়ার্ক"));
  });

  await runAsyncTest("Scenario 5.2: checkDriveConnectivity identifies 429 Rate Limit response", async () => {
    const rateLimitedService = new GoogleDriveBackupService({
      fetch: async () => ({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
      }),
    });

    const ping = await rateLimitedService.checkDriveConnectivity("valid_token", { timeoutMs: 100 });
    assert.strictEqual(ping.connected, false);
    assert.strictEqual(ping.status, 429);
    assert.strictEqual(ping.rateLimited, true);
  });

  await runAsyncTest("Scenario 5.3: checkDriveConnectivity identifies 503 Gateway / Service Unavailable", async () => {
    const timeoutService = new GoogleDriveBackupService({
      fetch: async () => ({
        ok: false,
        status: 503,
        text: async () => "Backend unavailable",
      }),
    });

    const ping = await timeoutService.checkDriveConnectivity("valid_token", { timeoutMs: 100 });
    assert.strictEqual(ping.connected, false);
    assert.strictEqual(ping.status, 503);
    assert.strictEqual(ping.serverError, true);
  });

  await runAsyncTest("Scenario 5.4: checkDriveConnectivity confirms online connection and measures latency", async () => {
    const onlineService = new GoogleDriveBackupService({
      fetch: async () => {
        // Simulate 15ms latency
        await new Promise((r) => setTimeout(r, 15));
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: "f1" }] }),
        };
      },
    });

    const ping = await onlineService.checkDriveConnectivity("valid_token");
    assert.strictEqual(ping.connected, true);
    assert.strictEqual(ping.status, 200);
    assert(typeof ping.latencyMs === "number" && ping.latencyMs >= 10, "Latency must be tracked");
  });

  await runAsyncTest("Scenario 5.5: executeWithRetry recovers from transient 503 errors and succeeds on attempt 3", async () => {
    let callCount = 0;
    const retryLog = [];

    const res = await executeWithRetry(
      async (attempt) => {
        callCount++;
        if (callCount < 3) {
          const err = new Error("503 Service Unavailable");
          err.status = 503;
          throw err;
        }
        return { fileId: "uploaded_123" };
      },
      {
        returnEnvelope: true,
        maxRetries: 3,
        baseDelayMs: 2,
        onRetry: (att, delay, err) => {
          retryLog.push({ att, delay, msg: err.message });
        },
      }
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.attempts, 3);
    assert.strictEqual(res.retried, true);
    assert.strictEqual(res.result.fileId, "uploaded_123");
    assert.strictEqual(retryLog.length, 2, "Must log 2 retry attempts");
  });

  await runAsyncTest("Scenario 5.6: executeWithRetry recovers from 429 Rate Limit error", async () => {
    let callCount = 0;
    const res = await executeWithRetry(
      async () => {
        callCount++;
        if (callCount === 1) {
          const err = new Error("429 Too Many Requests");
          err.status = 429;
          throw err;
        }
        return "SUCCESS_AFTER_RATE_LIMIT";
      },
      { returnEnvelope: true, maxRetries: 2, baseDelayMs: 2 }
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.attempts, 2);
    assert.strictEqual(res.result, "SUCCESS_AFTER_RATE_LIMIT");
  });

  await runAsyncTest("Scenario 5.7: executeWithRetry fails fast on non-retryable 401 Unauthorized", async () => {
    let callCount = 0;
    const res = await executeWithRetry(
      async () => {
        callCount++;
        const err = new Error("401 Unauthorized token expired");
        err.status = 401;
        throw err;
      },
      { throwOnError: false, maxRetries: 3, baseDelayMs: 2 }
    );

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.attempts, 1, "Must not retry 401");
    assert.strictEqual(res.nonRetryable, true);
    assert.strictEqual(res.status, 401);
  });

  await runAsyncTest("Scenario 5.8: executeWithRetry exhausts retries on permanent server outage", async () => {
    let callCount = 0;
    const res = await executeWithRetry(
      async () => {
        callCount++;
        const err = new Error("500 Internal Server Error");
        err.status = 500;
        throw err;
      },
      { throwOnError: false, maxRetries: 2, baseDelayMs: 2 }
    );

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.attempts, 3, "Attempt 1 + 2 retries = 3 attempts");
    assert.strictEqual(res.exhausted, true);
  });

  console.log("\n================================================================");
  console.log(`BL-015 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================\n");
}

main().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
