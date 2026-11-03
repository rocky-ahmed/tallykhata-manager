/**
 * test_iteration_213_sync_architecture_and_dirty_flags.js
 * Continuous Verification & Hardening Suite for Iteration 213:
 * Room DB Sync Architecture, Dirty Flags, Conflict Resolution & Batch Sync Schemas
 *
 * Worker: Worker 1 (Gibbs) — Principal REA Reverse Engineering Investigator
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-213
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  StorageRepository,
  storageRepository,
} = require("./src/storageRepository");

const {
  normalizeJournalFields,
  calculateAggregateMetrics,
} = require("./src/ledgerEngine");

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  console.log("===============================================================================");
  console.log("ITERATION 213: ROOM DB SYNC ARCHITECTURE, DIRTY FLAGS & NETWORK SYNC VERIFICATION");
  console.log("===============================================================================");

  const APK_PATH = "D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk";
  const EXPECTED_APK_SHA256 = "267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9";
  const EXPECTED_APK_SIZE = 53969511;

  await runTest("Reference APK Binary Integrity & Digest Match", async () => {
    assert.strictEqual(fs.existsSync(APK_PATH), true, "Reference APK must exist at target location");
    const stat = fs.statSync(APK_PATH);
    assert.strictEqual(stat.size, EXPECTED_APK_SIZE, "APK file size must match byte-for-byte");
    
    const hash = crypto.createHash("sha256");
    const fd = fs.openSync(APK_PATH, "r");
    const buf = Buffer.alloc(65536);
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(buf.slice(0, bytesRead));
    }
    fs.closeSync(fd);
    const digest = hash.digest("hex");
    assert.strictEqual(digest, EXPECTED_APK_SHA256, "SHA-256 digest must match reference signature");
  });

  await runTest("Bytecode Presence of D2S Worker & Sync DTOs in classes4.dex", async () => {
    const fd = fs.openSync(APK_PATH, "r");
    const lhBuf = Buffer.alloc(30);
    fs.readSync(fd, lhBuf, 0, 30, 35177936);
    const fnLen = lhBuf.readUInt16LE(26);
    const exLen = lhBuf.readUInt16LE(28);
    const dataOffset = 35177936 + 30 + fnLen + exLen;
    const dexBuf = Buffer.alloc(10200444);
    fs.readSync(fd, dexBuf, 0, 10200444, dataOffset);
    fs.closeSync(fd);

    assert.strictEqual(dexBuf.toString("utf8", 0, 8), "dex\n035\0", "Must be valid DEX 035 header");

    const requiredClasses = [
      "Lcom/progoti/tallykhata/v2/_clean_arch/data_backup/worker/DeviceToServerWorker;",
      "Lcom/progoti/tallykhata/v2/_clean_arch/data_backup/domain/model/UploadRequest;",
      "Lcom/progoti/tallykhata/v2/_clean_arch/data_backup/data/model/UploadResponse;",
      "Lcom/progoti/tallykhata/v2/_clean_arch/data_backup/data/dto/ResponseUnsyncData;",
      "Lcom/progoti/tallykhata/v2/_clean_arch/data_backup/data/dto/UnsyncedTable;",
      "Lcom/progoti/tallykhata/v2/_clean_arch/data_backup/domain/model/JournalMetaDto;",
      "Lcom/progoti/tallykhata/v2/_clean_arch/data_backup/domain/model/deviceToServer/DeviceJournalMetaListDto;",
      "Lcom/progoti/tallykhata/v2/_clean_arch/data_backup/domain/model/serverToDevice/ServerJournalMetaListDto;",
      "Lcom/progoti/tallykhata/v2/arch/sync/server_to_device/DownloadRequest;",
      "Lcom/progoti/tallykhata/v2/arch/sync/server_to_device/DownloadResponse;",
      "Lcom/progoti/tallykhata/v2/arch/util/TKEnum$SyncStatus;",
      "Lcom/progoti/tallykhata/v2/_clean_arch/db_backup/worker/AppDbFileBackupWorker;",
      "Lcom/progoti/tallykhata/v2/_clean_arch/db_backup/data/remote/AppDbFileBackupApi;"
    ];

    for (const cls of requiredClasses) {
      assert.strictEqual(dexBuf.includes(Buffer.from(cls)), true, `DEX must contain class ${cls}`);
    }
  });

  await runTest("Retrofit Endpoint Strings in Reference APK", async () => {
    const fd = fs.openSync(APK_PATH, "r");
    const lhBuf = Buffer.alloc(30);
    fs.readSync(fd, lhBuf, 0, 30, 35177936);
    const fnLen = lhBuf.readUInt16LE(26);
    const exLen = lhBuf.readUInt16LE(28);
    const dataOffset = 35177936 + 30 + fnLen + exLen;
    const dexBuf = Buffer.alloc(10200444);
    fs.readSync(fd, dexBuf, 0, 10200444, dataOffset);
    fs.closeSync(fd);

    const requiredEndpoints = [
      "api/tallykhata/sync/v1/device-data",
      "api/tallykhata/sync/v5/server_to_device",
      "api/tallykhata/sync/v2/migration/complete",
      "api/tallykhata/sync/v2/inactive-device-activate",
      "api/tallykhata/sync/google_ad_id"
    ];

    for (const ep of requiredEndpoints) {
      assert.strictEqual(dexBuf.includes(Buffer.from(ep)), true, `DEX must contain endpoint ${ep}`);
    }
  });

  await runTest("Room DB Schema Column Taxonomy for Dirty Flags & Remote IDs", async () => {
    const fd = fs.openSync(APK_PATH, "r");
    const lhBuf = Buffer.alloc(30);
    fs.readSync(fd, lhBuf, 0, 30, 35177936);
    const fnLen = lhBuf.readUInt16LE(26);
    const exLen = lhBuf.readUInt16LE(28);
    const dataOffset = 35177936 + 30 + fnLen + exLen;
    const dexBuf = Buffer.alloc(10200444);
    fs.readSync(fd, dexBuf, 0, 10200444, dataOffset);
    fs.closeSync(fd);

    const requiredTokens = [
      "`synced` INTEGER NOT NULL",
      "`is_updated` INTEGER NOT NULL DEFAULT 0",
      "`last_update_date` TEXT",
      "`is_active` INTEGER NOT NULL DEFAULT 1",
      "`server_id` INTEGER",
      "`synced_date` TEXT"
    ];

    for (const tok of requiredTokens) {
      assert.strictEqual(dexBuf.includes(Buffer.from(tok)), true, `DEX must declare Room column ${tok}`);
    }
  });

  await runTest("Local Storage Engine simulateSyncBatch & LWW Reconciliation", async () => {
    const repo = new StorageRepository();
    const loadRes = await repo.loadInitialData();
    assert.strictEqual(loadRes.success, true, "Initial store must load cleanly");

    // Add a local account (customer/supplier)
    const localId = "cust_sync_test_" + Date.now();
    const nowIso = new Date().toISOString();
    await repo.mutateCollection("accounts", (list) => {
      list.push({
        id: localId,
        businessId: 1,
        name: "আমানত ট্রেডার্স",
        mobile: "01812345678",
        balance: 12500,
        synced: 0,
        is_updated: 0,
        is_active: 1,
        created_at: nowIso,
        updated_at: nowIso,
      });
      return list;
    });

    // Simulate batch sync with server: Server accepts and returns synced record with server_id
    const serverSyncResult = await repo.simulateSyncBatch("accounts", [
      {
        id: localId,
        businessId: 1,
        name: "আমানত ট্রেডার্স",
        mobile: "01812345678",
        balance: 12500,
        synced: 1,
        server_id: 99482,
        updated_at: nowIso,
      }
    ], { preferFieldMerge: true, tieBreaker: "server" });

    assert.strictEqual(serverSyncResult.success, true, "simulateSyncBatch must execute successfully");
    assert.strictEqual(serverSyncResult.syncedCount >= 1, true, "At least 1 item must be synced");

    // Verify local record is now synced
    const updatedStore = repo.getAuthoritativeState();
    const matched = updatedStore.accounts.find(c => c.id === localId);
    assert.strictEqual(!!matched, true, "Record must exist in store");
    assert.strictEqual(matched.synced, 1, "Record synced flag must be updated to 1");
    assert.strictEqual(matched.server_id, 99482, "server_id must be assigned");
  });

  await runTest("High-Frequency Sync Model Serialization Benchmark", async () => {
    const start = Date.now();
    const testBatch = [];
    for (let i = 0; i < 1000; i++) {
      testBatch.push({
        deviceId: 1001,
        deviceJournalId: i + 1,
        deviceCreatedAt: "2026-11-03T09:00:00.000Z",
        deviceUpdatedAt: "2026-11-03T09:15:00.000Z",
        smsSent: true
      });
    }
    const serialized = JSON.stringify({
      userId: 8801711223344,
      direction: "DEVICE_TO_SERVER",
      journalMetaDtos: testBatch
    });
    const parsed = JSON.parse(serialized);
    assert.strictEqual(parsed.journalMetaDtos.length, 1000, "1,000 items must round-trip cleanly");
    const elapsed = Date.now() - start;
    console.log(`    [Benchmark] Serialized and parsed 1,000 sync metadata records in ${elapsed}ms`);
    assert.strictEqual(elapsed < 100, true, "Serialization must take < 100ms");
  });

  console.log("-------------------------------------------------------------------------------");
  console.log(`RESULTS: ${passedTests}/${totalTests} tests passed cleanly (100% success rate).`);
  console.log("===============================================================================");
}

main().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
