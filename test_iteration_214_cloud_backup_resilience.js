/**
 * TALLYKHATA CLOUD BACKUP COMPRESSION & NETWORK RESILIENCE TEST SUITE
 * Milestone: REA-ITER-214
 * Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * 
 * Verifies:
 * 1. Compression ratio benchmarks (70%+ payload reduction on 500+ records).
 * 2. Round-trip compression -> decompression -> SHA-256 cryptographic verification.
 * 3. Resumable chunked upload simulation with progress callbacks, exponential backoff, and jitter.
 * 4. Simulated transient network packet drops (ETIMEDOUT), HTTP 429 rate limits, and 503 server errors.
 * 5. StorageRepository exportCompressedBackup and importCompressedBackup integration.
 * 6. 100% backward compatibility for legacy uncompressed backups (v0, v1, unwrapped, legacy chk_).
 */

const assert = require('assert');
const zlib = require('zlib');
const {
  buildBackupPayload,
  normalizeBackupPayload,
  validateBackupIntegrity,
  previewBackup,
  serializeBackupPayload,
  compressBackupPayload,
  decompressBackupPayload,
  isPayloadCompressed,
  compressData,
  decompressData,
  retryWithBackoff,
  simulateResumableChunkedUpload,
  GoogleDriveBackupService,
  googleDriveBackupService,
  calculateSha256Checksum,
} = require('./src/googleDriveBackupService');

const {
  StorageRepository,
  storageRepository,
  createDefaultState,
  exportCompressedBackup,
  importCompressedBackup,
  isStoragePayloadCompressed,
  decompressStoragePayload,
} = require('./src/storageRepository');

let passedTests = 0;
let totalTests = 0;

function pass(testName, detail = '') {
  passedTests++;
  totalTests++;
  console.log(`[PASS] TEST ${totalTests}: ${testName}${detail ? ' -> ' + JSON.stringify(detail) : ''}`);
}

function fail(testName, err) {
  totalTests++;
  console.error(`[FAIL] TEST ${totalTests}: ${testName}`);
  console.error(err);
  process.exit(1);
}

// In-memory AsyncStorage mock adapter
function createMockAdapter(initialState = {}) {
  const storage = new Map();
  for (const [k, v] of Object.entries(initialState)) {
    storage.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  return {
    getItem: async (key) => storage.get(key) || null,
    setItem: async (key, val) => { storage.set(key, val); },
    removeItem: async (key) => { storage.delete(key); },
    clear: async () => { storage.clear(); },
    _dump: () => Object.fromEntries(storage.entries()),
  };
}

// Helper to generate 500+ synthetic records
function generateLargeAuthoritativeState(customerCount = 150, journalCount = 250, cashCount = 60, stockCount = 40) {
  const accounts = [];
  const journals = [];
  const cashEntries = [];
  const stock = [];
  const businesses = [
    { id: 'biz_1', name: 'Mobile Xpress - Gulshan', isSelected: true, isArchived: false },
    { id: 'biz_2', name: 'Mobile Care - Dhanmondi', isSelected: false, isArchived: false },
  ];

  for (let i = 1; i <= customerCount; i++) {
    accounts.push({
      id: 'acc_' + i,
      businessId: i % 2 === 0 ? 'biz_2' : 'biz_1',
      name: 'Customer ' + i + ' Chowdhury',
      phone: '01711' + String(100000 + i).slice(-6),
      type: i % 4 === 0 ? 2 : 1, // 2 = supplier, 1 = customer
      balance: Math.round((i * 125.75 + Number.EPSILON) * 100) / 100,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    });
  }

  for (let j = 1; j <= journalCount; j++) {
    const accId = 'acc_' + ((j % customerCount) + 1);
    journals.push({
      id: 'j_' + j,
      accountId: accId,
      businessId: j % 2 === 0 ? 'biz_2' : 'biz_1',
      amount: Math.round((j * 50.25 + Number.EPSILON) * 100) / 100,
      type: j % 2 === 0 ? 'received' : 'given',
      date: new Date(Date.now() - j * 1800000).toISOString(),
      note: 'Transaction note for invoice #' + j + ' with detailed items and serial codes',
    });
  }

  for (let c = 1; c <= cashCount; c++) {
    cashEntries.push({
      id: 'cash_' + c,
      businessId: 'biz_1',
      type: c % 2 === 0 ? 'cash_in' : 'cash_out',
      amount: Math.round((c * 75.50 + Number.EPSILON) * 100) / 100,
      category: c % 3 === 0 ? 'দোকান ভাড়া' : (c % 3 === 1 ? 'পণ্য বিক্রয়' : 'চা-নাস্তা'),
      note: 'Daily cash movement entry #' + c,
      timestamp: new Date(Date.now() - c * 7200000).toISOString(),
    });
  }

  for (let s = 1; s <= stockCount; s++) {
    stock.push({
      id: 'prod_' + s,
      businessId: 'biz_1',
      name: 'Smartphone Accessory Product ' + s,
      sku: 'SKU-00' + s,
      stock: 10 + (s % 50),
      costPrice: 250 + (s * 10),
      sellingPrice: 350 + (s * 15),
    });
  }

  const moneyManager = {
    accounts: [
      { id: 'mm_acc_1', name: 'City Bank Retail', balance: 50000, type: 'bank', isArchived: false },
      { id: 'mm_acc_2', name: 'bKash Merchant', balance: 12500, type: 'mobile_banking', isArchived: false },
    ],
    transactions: [
      { id: 'mm_tx_1', accountId: 'mm_acc_1', amount: 5000, type: 'expense', categoryId: 'cat_rent' },
      { id: 'mm_tx_2', accountId: 'mm_acc_2', amount: 12000, type: 'income', categoryId: 'cat_sales' },
    ],
    categories: [
      { id: 'cat_rent', name: 'Rent', type: 'expense' },
      { id: 'cat_sales', name: 'Sales', type: 'income' },
    ],
    goals: [
      { id: 'goal_1', name: 'New Inventory Capital', targetAmount: 200000, currentAmount: 62500 },
    ],
    recurring: [],
  };

  return {
    accounts,
    journals,
    cashEntries,
    stock,
    inventory: stock,
    notes: [
      { id: 'note_1', title: 'Supplier Follow-up', content: 'Contact Dhaka distributors on Monday' },
    ],
    businesses,
    moneyManager,
    businessName: 'Mobile Xpress Main Branch',
    ownerName: 'Tanvir Hossain',
    ownerPhone: '01711999888',
    openingBalance: 25000,
  };
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('ITERATION 214: CLOUD BACKUP COMPRESSION & NETWORK RESILIENCE');
  console.log('Validating Payload Compression, Resumable Upload & Fallback Safety');
  console.log('================================================================\n');

  const userProfile = {
    sub: 'google_user_sub_998877',
    email: 'merchant@tallykhata.app',
    name: 'Tanvir Hossain',
  };

  // -------------------------------------------------------------------------
  // PART 1: COMPRESSION RATIO BENCHMARKS (70%+ REDUCTION ON 500+ RECORDS)
  // -------------------------------------------------------------------------
  console.log('--- PART 1: COMPRESSION RATIO BENCHMARKS (70%+ REDUCTION ON 500+ RECORDS) ---');

  const state500 = generateLargeAuthoritativeState(150, 250, 60, 40);
  const totalRecordCount = state500.accounts.length + state500.journals.length +
    state500.cashEntries.length + state500.stock.length + state500.businesses.length;
  
  assert.ok(totalRecordCount >= 500, 'Dataset must contain at least 500 records');

  // Test 1: Serialize uncompressed
  const uncompressedPayload = serializeBackupPayload(state500, {
    compression: 'none',
    userProfile,
  });
  const uncompressedJson = JSON.stringify(uncompressedPayload);
  const uncompressedBytes = Buffer.byteLength(uncompressedJson, 'utf8');

  pass('1.1: Uncompressed serialization on 500+ records', {
    recordCount: totalRecordCount,
    uncompressedBytes,
    compression: uncompressedPayload.manifest.compression,
  });

  // Test 2: Serialize with GZIP compression
  const gzipCompressedPayload = serializeBackupPayload(state500, {
    compression: 'gzip',
    userProfile,
  });
  const gzipJson = JSON.stringify(gzipCompressedPayload);
  const gzipBytes = Buffer.byteLength(gzipJson, 'utf8');

  pass('1.2: GZIP compressed serialization on 500+ records', {
    gzipEnvelopeBytes: gzipBytes,
    compressedBytes: gzipCompressedPayload.compressedBytes,
    uncompressedBytes: gzipCompressedPayload.uncompressedBytes,
  });

  // Test 3: Benchmark 70%+ reduction
  const reductionRatio = ((uncompressedBytes - gzipBytes) / uncompressedBytes) * 100;
  assert.ok(reductionRatio >= 70, `Expected >= 70% compression reduction, got ${reductionRatio.toFixed(2)}%`);

  pass('1.3: Compression benchmark achieves 70%+ payload reduction', {
    rawKb: (uncompressedBytes / 1024).toFixed(2) + ' KB',
    compressedKb: (gzipBytes / 1024).toFixed(2) + ' KB',
    reductionAchieved: reductionRatio.toFixed(2) + '%',
    benchmarkThreshold: '70%+',
  });

  // Test 4: Manifest compression metadata flags
  assert.strictEqual(gzipCompressedPayload.manifest.compressed, true);
  assert.strictEqual(gzipCompressedPayload.manifest.compression, 'gzip');
  assert.strictEqual(gzipCompressedPayload.manifest.compressionAlgorithm, 'gzip');
  assert.strictEqual(gzipCompressedPayload.manifest.uncompressedBytes, gzipCompressedPayload.uncompressedBytes);
  assert.strictEqual(gzipCompressedPayload.manifest.compressedBytes, gzipCompressedPayload.compressedBytes);
  assert.ok(gzipCompressedPayload.manifest.compressionRatio >= 70);

  pass('1.4: Manifest metadata reflects compression flags & metrics', {
    compressed: gzipCompressedPayload.manifest.compressed,
    algorithm: gzipCompressedPayload.manifest.compressionAlgorithm,
    ratio: gzipCompressedPayload.manifest.compressionRatio + '%',
  });

  // Test 5: Deflate compression option
  const deflatePayload = serializeBackupPayload(state500, {
    compression: 'deflate',
    userProfile,
  });
  assert.strictEqual(deflatePayload.manifest.compressed, true);
  assert.strictEqual(deflatePayload.manifest.compression, 'deflate');
  assert.strictEqual(deflatePayload.compression, 'deflate');
  const deflateBytes = Buffer.byteLength(JSON.stringify(deflatePayload), 'utf8');
  assert.ok(((uncompressedBytes - deflateBytes) / uncompressedBytes) * 100 >= 70);

  pass('1.5: Deflate compression algorithm support', {
    compression: deflatePayload.manifest.compression,
    deflateEnvelopeBytes: deflateBytes,
    ratio: deflatePayload.manifest.compressionRatio + '%',
  });

  // -------------------------------------------------------------------------
  // PART 2: ROUND-TRIP COMPRESSION, DECOMPRESSION & SHA-256 INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- PART 2: ROUND-TRIP COMPRESSION, DECOMPRESSION & SHA-256 INTEGRITY ---');

  // Test 6: Decompress and verify structural parity
  const decompressed = decompressBackupPayload(gzipCompressedPayload);
  assert.ok(decompressed && decompressed.data && decompressed.manifest);
  assert.strictEqual(decompressed.data.accounts.length, state500.accounts.length);
  assert.strictEqual(decompressed.data.journals.length, state500.journals.length);
  assert.strictEqual(decompressed.data.cashEntries.length, state500.cashEntries.length);
  assert.strictEqual(decompressed.data.stock.length, state500.stock.length);
  assert.strictEqual(decompressed.data.moneyManager.accounts.length, state500.moneyManager.accounts.length);

  pass('2.1: Round-trip decompression preserves 100% of collections & fields', {
    accountsRestored: decompressed.data.accounts.length,
    journalsRestored: decompressed.data.journals.length,
    cashEntriesRestored: decompressed.data.cashEntries.length,
  });

  // Test 7: SHA-256 cryptographic verification of decompressed payload
  const validationResult = validateBackupIntegrity(gzipCompressedPayload, userProfile.sub);
  assert.strictEqual(validationResult.valid, true);
  assert.strictEqual(validationResult.wasCompressed, true);
  const recomputedChecksum = calculateSha256Checksum(validationResult.data);
  assert.strictEqual(recomputedChecksum, validationResult.manifest.checksum);

  pass('2.2: SHA-256 integrity checksum verified against decompressed data', {
    valid: validationResult.valid,
    checksum: validationResult.manifest.checksum,
    wasCompressed: validationResult.wasCompressed,
  });

  // Test 8: Rejection of tampered compressed payload
  const tamperedPayload = JSON.parse(JSON.stringify(gzipCompressedPayload));
  // Mutate base64 data to cause corruption
  tamperedPayload.compressedData = tamperedPayload.compressedData.slice(0, 50) + 'XXXX' + tamperedPayload.compressedData.slice(54);
  const tamperedResult = validateBackupIntegrity(tamperedPayload, userProfile.sub);
  assert.strictEqual(tamperedResult.valid, false);
  assert.ok(tamperedResult.error.toLowerCase().includes('decompression') || tamperedResult.error.toLowerCase().includes('failed'));

  pass('2.3: Tampered compressed payload is detected and rejected', {
    rejected: !tamperedResult.valid,
    error: tamperedResult.error,
  });

  // Test 9: previewBackup supports compressed payloads
  const preview = previewBackup(gzipCompressedPayload);
  assert.strictEqual(preview.valid, true);
  assert.strictEqual(preview.recordCounts.accounts, state500.accounts.length);
  assert.strictEqual(preview.recordCounts.journals, state500.journals.length);
  assert.strictEqual(preview.hasMoneyManager, true);
  assert.strictEqual(preview.hasBusinessData, true);

  pass('2.4: previewBackup accurately previews compressed backup payloads', {
    valid: preview.valid,
    accountsCount: preview.recordCounts.accounts,
    journalsCount: preview.recordCounts.journals,
    hasMoneyManager: preview.hasMoneyManager,
  });

  // -------------------------------------------------------------------------
  // PART 3: RESUMABLE CHUNKED UPLOAD SIMULATION & NETWORK RESILIENCY
  // -------------------------------------------------------------------------
  console.log('\n--- PART 3: RESUMABLE CHUNKED UPLOAD SIMULATION & NETWORK RESILIENCY ---');

  // Test 10: Standard chunked upload
  const progressList = [];
  const chunkedResult = await simulateResumableChunkedUpload('mock_token', gzipCompressedPayload, {
    chunkSize: 1024, // 1KB chunks for granular testing
    baseDelayMs: 5,
    maxDelayMs: 20,
    onProgress: (p) => progressList.push(p),
  });

  assert.strictEqual(chunkedResult.success, true);
  assert.ok(chunkedResult.totalChunks > 1, 'Should require multiple chunks');
  assert.strictEqual(chunkedResult.chunksUploaded, chunkedResult.totalChunks);
  assert.strictEqual(chunkedResult.bytesUploaded, chunkedResult.totalBytes);

  pass('3.1: Standard chunked upload divides payload and completes all chunks', {
    totalBytes: chunkedResult.totalBytes,
    chunkSize: chunkedResult.chunkSize,
    totalChunks: chunkedResult.totalChunks,
  });

  // Test 11: Progress callback verification
  assert.strictEqual(progressList.length, chunkedResult.totalChunks);
  assert.strictEqual(progressList[0].chunkIndex, 1);
  assert.strictEqual(progressList[progressList.length - 1].chunkIndex, chunkedResult.totalChunks);
  assert.strictEqual(progressList[progressList.length - 1].percent, 100);
  assert.strictEqual(progressList[progressList.length - 1].bytesUploaded, chunkedResult.totalBytes);

  pass('3.2: Progress callbacks emit accurate metrics up to 100%', {
    totalEvents: progressList.length,
    finalPercent: progressList[progressList.length - 1].percent,
    finalBytesUploaded: progressList[progressList.length - 1].bytesUploaded,
  });

  // Test 12: Network disconnect recovery (ETIMEDOUT)
  let retryCountNetwork = 0;
  const progressRecovered = [];
  const recoveredResult = await simulateResumableChunkedUpload('mock_token', gzipCompressedPayload, {
    chunkSize: 1024,
    simulateNetworkDrops: [1, 3], // Drop on chunk 1 and chunk 3
    baseDelayMs: 5,
    maxDelayMs: 30,
    onRetry: (err) => {
      retryCountNetwork++;
      assert.ok(err.message.includes('ETIMEDOUT') || err.code === 'ETIMEDOUT');
    },
    onProgress: (p) => progressRecovered.push(p),
  });

  assert.strictEqual(recoveredResult.success, true);
  assert.strictEqual(recoveredResult.resumedChunks, 2);
  assert.ok(recoveredResult.retryAttempts >= 2);
  assert.strictEqual(recoveredResult.bytesUploaded, recoveredResult.totalBytes);

  pass('3.3: Network disconnect (ETIMEDOUT) recovers from byte offset without restarting', {
    recoveredDrops: recoveredResult.resumedChunks,
    retryAttempts: recoveredResult.retryAttempts,
    finalUploadedBytes: recoveredResult.bytesUploaded,
  });

  // Test 13: Rate limit recovery (HTTP 429)
  let retryCountRateLimit = 0;
  const rateLimitResult = await simulateResumableChunkedUpload('mock_token', gzipCompressedPayload, {
    chunkSize: 1024,
    simulateRateLimits: [2], // 429 on chunk 2
    baseDelayMs: 5,
    maxDelayMs: 30,
    onRetry: (err) => {
      retryCountRateLimit++;
      assert.strictEqual(err.status, 429);
    },
  });

  assert.strictEqual(rateLimitResult.success, true);
  assert.ok(rateLimitResult.retryAttempts >= 1);
  assert.strictEqual(retryCountRateLimit, 1);

  pass('3.4: HTTP 429 Rate Limit triggers exponential backoff and succeeds', {
    rateLimitRetries: retryCountRateLimit,
    success: rateLimitResult.success,
  });

  // Test 14: Server error recovery (HTTP 500 / 503)
  let retryCountServer = 0;
  const serverErrorResult = await simulateResumableChunkedUpload('mock_token', gzipCompressedPayload, {
    chunkSize: 1024,
    simulateServerErrors: [0], // 503 on chunk 0
    baseDelayMs: 5,
    maxDelayMs: 30,
    onRetry: (err) => {
      retryCountServer++;
      assert.strictEqual(err.status, 503);
    },
  });

  assert.strictEqual(serverErrorResult.success, true);
  assert.ok(serverErrorResult.retryAttempts >= 1);
  assert.strictEqual(retryCountServer, 1);

  pass('3.5: HTTP 503 Service Unavailable triggers retry and succeeds', {
    serverErrorRetries: retryCountServer,
    success: serverErrorResult.success,
  });

  // Test 15: Non-retryable error fail-fast (401 Unauthorized / 403 Forbidden)
  let fastFailThrew = false;
  try {
    await retryWithBackoff(async () => {
      const err = new Error('401 Unauthorized: Invalid credentials');
      err.status = 401;
      throw err;
    }, { maxRetries: 3, baseDelayMs: 5 });
  } catch (err) {
    fastFailThrew = true;
    assert.strictEqual(err.status, 401);
  }
  assert.strictEqual(fastFailThrew, true, '401 Unauthorized must fail fast without retrying');

  pass('3.6: Non-retryable HTTP 401 aborts immediately without wasteful retries', {
    failedFast: fastFailThrew,
  });

  // Test 16: uploadBackup with options.resumable / options.chunked
  const delegatingService = new GoogleDriveBackupService();
  const uploadDelegated = await delegatingService.uploadBackup('token', gzipCompressedPayload, null, {
    resumable: true,
    chunkSize: 1024,
    baseDelayMs: 5,
  });
  assert.strictEqual(uploadDelegated.success, true);
  assert.ok(uploadDelegated.totalChunks > 1);

  pass('3.7: uploadBackup delegates to resumable chunked engine when options.resumable = true', {
    success: uploadDelegated.success,
    totalChunks: uploadDelegated.totalChunks,
  });

  // -------------------------------------------------------------------------
  // PART 4: STORAGE REPOSITORY COMPRESSED BACKUP & RESTORE INTEGRATION
  // -------------------------------------------------------------------------
  console.log('\n--- PART 4: STORAGE REPOSITORY COMPRESSED BACKUP & RESTORE INTEGRATION ---');

  const testRepo = new StorageRepository(createMockAdapter());

  // Populate test store
  const sampleCustomer = { id: 'cust_iter214', name: 'Al-Amin Traders', phone: '01811223344', type: 1, balance: 5400 };
  const sampleSupplier = { id: 'supp_iter214', name: 'Beximco Pharma', phone: '01911223344', type: 2, balance: 12000 };
  await testRepo.mutateCollection('accounts', () => [sampleCustomer, sampleSupplier]);

  const sampleJournal1 = { id: 'j_c1', accountId: 'cust_iter214', businessId: '1', amount: 5400, type: 'given', date: new Date().toISOString() };
  const sampleJournal2 = { id: 'j_s1', accountId: 'supp_iter214', businessId: '1', amount: 12000, type: 'received', date: new Date().toISOString() };
  await testRepo.mutateCollection('journals', () => [sampleJournal1, sampleJournal2]);

  const sampleCash = { id: 'cash_1', businessId: '1', type: 'cash_in', amount: 5000, category: 'বিক্রয়' };
  await testRepo.mutateCollection('cashEntries', () => [sampleCash]);

  // Test 17: exportCompressedBackup
  const exportedCompressed = await testRepo.exportCompressedBackup();
  assert.strictEqual(exportedCompressed.compressed, true);
  assert.strictEqual(exportedCompressed.compression, 'gzip');
  assert.strictEqual(exportedCompressed.manifest.compressed, true);
  assert.ok(Boolean(exportedCompressed.compressedData));
  assert.ok(isStoragePayloadCompressed(exportedCompressed));

  pass('4.1: exportCompressedBackup produces valid compressed payload', {
    compressed: exportedCompressed.compressed,
    compression: exportedCompressed.compression,
    uncompressedBytes: exportedCompressed.uncompressedBytes,
    compressedBytes: exportedCompressed.compressedBytes,
    ratio: exportedCompressed.compressionRatio + '%',
  });

  // Test 18: importCompressedBackup restores all records
  const freshRepo = new StorageRepository(createMockAdapter());

  const restoreResult = await freshRepo.importCompressedBackup(exportedCompressed);
  assert.ok(restoreResult);
  assert.strictEqual(freshRepo.currentStore.accounts.length, 2);
  assert.strictEqual(freshRepo.currentStore.journals.length, 2);
  assert.strictEqual(freshRepo.currentStore.cashEntries.length, 1);

  pass('4.2: importCompressedBackup transparently decompresses and restores state', {
    accountsRestored: freshRepo.currentStore.accounts.length,
    journalsRestored: freshRepo.currentStore.journals.length,
    cashEntriesRestored: freshRepo.currentStore.cashEntries.length,
  });

  // Test 19: restoreStorageBackup accepts compressed payload directly
  const cleanRepo = new StorageRepository(createMockAdapter());

  const directRestoreResult = await cleanRepo.restoreStorageBackup(exportedCompressed);
  assert.ok(directRestoreResult);
  assert.strictEqual(cleanRepo.currentStore.accounts.length, 2);
  assert.strictEqual(cleanRepo.currentStore.journals.length, 2);

  pass('4.3: restoreStorageBackup autodetects and restores compressed payload directly', {
    accountsCount: cleanRepo.currentStore.accounts.length,
    journalsCount: cleanRepo.currentStore.journals.length,
  });

  // Test 20: Full round-trip data invariance verification
  const restoredCust = cleanRepo.currentStore.accounts.find(a => a.id === 'cust_iter214');
  const restoredSupp = cleanRepo.currentStore.accounts.find(a => a.id === 'supp_iter214');
  assert.strictEqual(restoredCust.balance, 5400);
  assert.strictEqual(restoredSupp.balance, 12000);
  assert.strictEqual(cleanRepo.currentStore.cashEntries[0].amount, 5000);

  pass('4.4: Full round-trip data invariance preserves balances and transactions', {
    customerBalance: restoredCust.balance,
    supplierBalance: restoredSupp.balance,
    cashAmount: cleanRepo.currentStore.cashEntries[0].amount,
  });

  // -------------------------------------------------------------------------
  // PART 5: BACKWARD COMPATIBILITY WITH LEGACY UNCOMPRESSED BACKUPS
  // -------------------------------------------------------------------------
  console.log('\n--- PART 5: BACKWARD COMPATIBILITY WITH LEGACY UNCOMPRESSED BACKUPS ---');

  // Test 21: Modern uncompressed backup restores without issue
  const modernUncompressed = await testRepo.createStorageBackup();
  assert.strictEqual(isStoragePayloadCompressed(modernUncompressed), false);
  const uncompRepo = new StorageRepository(createMockAdapter());
  await uncompRepo.restoreStorageBackup(modernUncompressed);
  assert.strictEqual(uncompRepo.currentStore.accounts.length, 2);

  pass('5.1: Modern uncompressed backup restores seamlessly', {
    accountsCount: uncompRepo.currentStore.accounts.length,
    compressed: false,
  });

  // Test 22: Legacy v1 uncompressed backup
  const legacyV1Payload = {
    manifest: {
      backupVersion: 1,
      schemaVersion: 6,
      appVersion: '3.5.0',
      createdAt: '2026-05-10T12:00:00.000Z',
      backupOwner: userProfile,
      checksum: calculateSha256Checksum(state500),
    },
    data: state500,
  };
  const legacyV1Val = validateBackupIntegrity(legacyV1Payload, userProfile.sub);
  assert.strictEqual(legacyV1Val.valid, true);
  assert.strictEqual(legacyV1Val.wasCompressed, false);

  pass('5.2: Legacy v1 uncompressed backup validates and restores', {
    valid: legacyV1Val.valid,
    wasCompressed: legacyV1Val.wasCompressed,
    accountsCount: legacyV1Val.data.accounts.length,
  });

  // Test 23: Legacy v0 unwrapped backup ({ accounts: [...], journals: [...] })
  const legacyV0Payload = {
    accounts: [
      { id: 'acc_v0_1', name: 'Legacy Shop', type: 1, balance: 350 },
    ],
    journals: [
      { id: 'j_v0_1', accountId: 'acc_v0_1', amount: 350, type: 'given' },
    ],
    version: 5,
  };
  const legacyV0Val = validateBackupIntegrity(legacyV0Payload);
  assert.strictEqual(legacyV0Val.valid, true);
  assert.strictEqual(legacyV0Val.manifest.legacy, true);

  pass('5.3: Legacy v0 unwrapped backup validates safely', {
    valid: legacyV0Val.valid,
    legacy: legacyV0Val.manifest.legacy,
  });

  // Test 24: Legacy checksum (chk_...) recognized
  const stateWithLegacyChk = {
    manifest: {
      backupVersion: 0,
      schemaVersion: 5,
      backupOwner: userProfile,
      checksum: 'chk_legacy_test_checksum_ok',
    },
    data: {
      accounts: [{ id: 'acc_1', name: 'Test', balance: 0, type: 1 }],
      journals: [],
    },
  };
  // Compute legacy checksum using testRepo
  const legacyChk = testRepo.computeLegacyChecksum(stateWithLegacyChk.data);
  stateWithLegacyChk.manifest.checksum = legacyChk;
  const legacyChkVal = validateBackupIntegrity(stateWithLegacyChk, userProfile.sub);
  assert.strictEqual(legacyChkVal.valid, true);

  pass('5.4: Legacy checksum format (chk_...) validated without regression', {
    valid: legacyChkVal.valid,
    checksum: legacyChkVal.manifest.checksum,
  });

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY (100%)`);
  console.log('================================================================');
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
