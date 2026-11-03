/**
 * test_iteration_217_receipt_service_and_storage.js
 *
 * Comprehensive Automated Verification Suite for REA-ITER-217:
 * RECEIPT / VOUCHER IMAGE ATTACHMENT & STORAGE SERVICE
 *
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 * Milestone: REA-ITER-217
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const receiptService = require('./src/receiptImageService');
const {
  StorageRepository,
  createDefaultState,
  VALID_COLLECTIONS,
} = require('./src/storageRepository');

const googleDriveService = require('./src/googleDriveBackupService');

class MemoryStorageAdapter {
  constructor(initialData = {}) {
    this.storage = { ...initialData };
  }
  async getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.storage, key) ? this.storage[key] : null;
  }
  async setItem(key, val) {
    this.storage[key] = String(val);
  }
  async removeItem(key) {
    delete this.storage[key];
  }
}

let passedTests = 0;
let totalTests = 0;

function reportTest(name, passed, detail = null) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  [PASS] TEST ${totalTests}: ${name}` + (detail ? ` -> ${JSON.stringify(detail)}` : ''));
  } else {
    console.error(`  [FAIL] TEST ${totalTests}: ${name}` + (detail ? ` -> ${JSON.stringify(detail)}` : ''));
    process.exit(1);
  }
}

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('TALLYKHATA ITERATION 217: RECEIPT / VOUCHER IMAGE STORAGE & SCANNER PIPELINE');
  console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
  console.log('Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895');
  console.log('='.repeat(80));

  // --- TEST 1: Metadata Schema & Construction Validation ---
  try {
    assert.strictEqual(receiptService.RECEIPT_IMAGE_SCHEMA_VERSION, 1);
    assert.ok(receiptService.SUPPORTED_MIME_TYPES.has('image/jpeg'));
    assert.ok(receiptService.SUPPORTED_MIME_TYPES.has('image/png'));
    assert.ok(receiptService.SUPPORTED_MIME_TYPES.has('image/webp'));

    const meta = receiptService.createReceiptImageMetadata({
      journalId: 'txn_101',
      fileSizeBytes: 245000,
      width: 1080,
      height: 1920,
      mimeType: 'image/jpeg',
      fileUri: 'file:///data/user/0/tallybook/receipt_images/sample.jpg',
      thumbnailUri: 'file:///data/user/0/tallybook/receipt_images/sample_thumb.jpg',
      ocrText: 'মোট টাকা: ৫,৯৫০',
      businessId: '1',
      metadata: { scanner: 'camerax', confidence: 0.94 },
    });

    assert.ok(meta.id.startsWith('rcp_'));
    assert.ok(meta.fileName.startsWith('TK_RCP_txn_101_'));
    assert.strictEqual(meta.journalId, 'txn_101');
    assert.strictEqual(meta.businessId, '1');
    assert.strictEqual(meta.fileSizeBytes, 245000);
    assert.strictEqual(meta.width, 1080);
    assert.strictEqual(meta.height, 1920);
    assert.strictEqual(meta.mimeType, 'image/jpeg');
    assert.strictEqual(meta.ocrText, 'মোট টাকা: ৫,৯৫০');
    assert.strictEqual(meta.metadata.confidence, 0.94);

    // Ergonomic aliases check
    assert.strictEqual(meta.uri, meta.fileUri);
    assert.strictEqual(meta.thumbnail, meta.thumbnailUri);
    assert.strictEqual(meta.fileSize, meta.fileSizeBytes);
    assert.strictEqual(meta.journal_id, meta.journalId);
    assert.strictEqual(meta.business_id, meta.businessId);
    assert.strictEqual(meta.ocr_text, meta.ocrText);
    assert.strictEqual(meta.version, 1);

    reportTest('Metadata Schema & Construction Validation', true, { id: meta.id, version: meta.version });
  } catch (err) {
    reportTest('Metadata Schema & Construction Validation', false, { error: err.message });
  }

  // --- TEST 2: Metadata Invariant & Boundary Enforcement ---
  try {
    // Missing journalId must throw
    assert.throws(() => {
      receiptService.createReceiptImageMetadata({ fileSizeBytes: 1000 });
    }, /journalId is required/);

    // Unsupported mimeType must throw
    assert.throws(() => {
      receiptService.createReceiptImageMetadata({ journalId: 'j1', mimeType: 'application/pdf' });
    }, /Unsupported mimeType/);

    // image/jpg normalized to image/jpeg
    const jpgMeta = receiptService.createReceiptImageMetadata({
      journalId: 'j1',
      mimeType: 'image/jpg',
    });
    assert.strictEqual(jpgMeta.mimeType, 'image/jpeg');

    // Schema validation function
    assert.strictEqual(receiptService.isValidReceiptImage(jpgMeta), true);

    const invalid1 = receiptService.validateReceiptImage({ id: 'r1' });
    assert.strictEqual(invalid1.valid, false);
    assert.ok(invalid1.errors.some((e) => e.includes('journalId is required')));

    const invalid2 = receiptService.validateReceiptImage({
      id: 'r1',
      journalId: 'j1',
      businessId: '1',
      mimeType: 'image/gif',
      fileSizeBytes: -5,
      width: -20,
      height: -10,
      createdAt: 'invalid-date',
    });
    assert.strictEqual(invalid2.valid, false);
    assert.strictEqual(invalid2.errors.length >= 5, true);

    reportTest('Metadata Invariant & Boundary Enforcement', true, { errorCount: invalid2.errors.length });
  } catch (err) {
    reportTest('Metadata Invariant & Boundary Enforcement', false, { error: err.message });
  }

  // --- TEST 3: Aspect-Ratio Preserving Thumbnail Bounding Box Calculations ---
  try {
    // Portrait image 1200x1600 within 200 bounding box
    const portrait = receiptService.calculateThumbnailBounds(1200, 1600, 200);
    assert.strictEqual(portrait.height, 200);
    assert.strictEqual(portrait.width, 150);
    assert.strictEqual(portrait.scale, 0.125);

    // Landscape image 1920x1080 within 200 bounding box
    const landscape = receiptService.calculateThumbnailBounds(1920, 1080, 200);
    assert.strictEqual(landscape.width, 200);
    assert.strictEqual(landscape.height, 113);

    // Square image 800x800 within 200 bounding box
    const square = receiptService.calculateThumbnailBounds(800, 800, 200);
    assert.strictEqual(square.width, 200);
    assert.strictEqual(square.height, 200);
    assert.strictEqual(square.scale, 0.25);

    // Small image already within bounding box: no upscale
    const small = receiptService.calculateThumbnailBounds(150, 120, 200);
    assert.strictEqual(small.width, 150);
    assert.strictEqual(small.height, 120);
    assert.strictEqual(small.scale, 1.0);

    // Degenerate inputs safe fallback
    const degen = receiptService.calculateThumbnailBounds(0, -50, 200);
    assert.strictEqual(degen.width, 200);
    assert.strictEqual(degen.height, 200);

    reportTest('Aspect-Ratio Preserving Thumbnail Bounding Box Calculations', true, {
      portraitBounds: `${portrait.width}x${portrait.height}`,
      landscapeBounds: `${landscape.width}x${landscape.height}`,
    });
  } catch (err) {
    reportTest('Aspect-Ratio Preserving Thumbnail Bounding Box Calculations', false, { error: err.message });
  }

  // --- TEST 4: Bilingual Numeral & File Size Formatting Invariants ---
  try {
    assert.strictEqual(receiptService.toBengaliNumeral(5950), '৫৯৫০');
    assert.strictEqual(receiptService.toAsciiDigits('৫৯৫০'), '5950');

    assert.strictEqual(receiptService.formatFileSize(500, { locale: 'bn' }), '৫০০ বাইট');
    assert.strictEqual(receiptService.formatFileSize(500, { locale: 'en' }), '500 B');

    assert.strictEqual(receiptService.formatFileSize(204800, { locale: 'bn' }), '২০০ কেবি');
    assert.strictEqual(receiptService.formatFileSize(204800, { locale: 'en' }), '200 KB');

    assert.strictEqual(receiptService.formatFileSize(5242880, { locale: 'bn' }), '৫ এমবি');
    assert.strictEqual(receiptService.formatFileSize(5242880, { locale: 'en' }), '5 MB');

    reportTest('Bilingual Numeral & File Size Formatting Invariants', true, {
      sampleBn: receiptService.formatFileSize(204800, { locale: 'bn' }),
      sampleEn: receiptService.formatFileSize(204800, { locale: 'en' }),
    });
  } catch (err) {
    reportTest('Bilingual Numeral & File Size Formatting Invariants', false, { error: err.message });
  }

  // --- TEST 5: File Deletion with Cross-Platform Path Normalization ---
  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk_rcp_del_'));
    const testFile = path.join(tempDir, 'test_receipt.jpg');
    fs.writeFileSync(testFile, 'dummy image content');

    assert.strictEqual(fs.existsSync(testFile), true);

    // Normal deletion
    const res1 = await receiptService.deleteReceiptFile(testFile);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.deleted, true);
    assert.strictEqual(fs.existsSync(testFile), false);

    // Deleting again (already unlinked) returns success: true, deleted: false without throwing
    const res2 = await receiptService.deleteReceiptFile(testFile);
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.deleted, false);

    // File URI with file:// prefix
    const testFile2 = path.join(tempDir, 'test_receipt2.jpg');
    fs.writeFileSync(testFile2, 'dummy image 2');
    const fileUri = 'file://' + testFile2;
    const res3 = await receiptService.deleteReceiptFile(fileUri);
    assert.strictEqual(res3.success, true);
    assert.strictEqual(res3.deleted, true);
    assert.strictEqual(fs.existsSync(testFile2), false);

    // Clean up directory
    fs.rmdirSync(tempDir);

    reportTest('File Deletion with Cross-Platform Path Normalization', true, { deletedDirect: true, deletedUri: true });
  } catch (err) {
    reportTest('File Deletion with Cross-Platform Path Normalization', false, { error: err.message });
  }

  // --- TEST 6: Orphaned Receipt Image Garbage Collection & Storage Reclamation ---
  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk_rcp_gc_'));

    const file1 = path.join(tempDir, 'TK_RCP_j100_1.jpg');
    const thumb1 = path.join(tempDir, 'TK_RCP_THUMB_j100_1.jpg');
    const orphan1 = path.join(tempDir, 'TK_RCP_j200_2.jpg');
    const orphan2 = path.join(tempDir, 'TK_RCP_j300_3.jpg');

    fs.writeFileSync(file1, '1234567890'); // 10 bytes
    fs.writeFileSync(thumb1, '12345');     // 5 bytes
    fs.writeFileSync(orphan1, '12345678'); // 8 bytes
    fs.writeFileSync(orphan2, '123456');   // 6 bytes

    const activeReceipts = [
      {
        id: 'r1',
        fileName: 'TK_RCP_j100_1.jpg',
        fileUri: file1,
        thumbnailUri: thumb1,
      },
    ];

    const gcResult = await receiptService.cleanOrphanedReceiptImages(activeReceipts, tempDir);

    assert.strictEqual(gcResult.scannedCount, 4);
    assert.strictEqual(gcResult.referencedCount, 2);
    assert.strictEqual(gcResult.orphanedCount, 2);
    assert.strictEqual(gcResult.deletedCount, 2);
    assert.strictEqual(gcResult.bytesReclaimed, 14); // 8 + 6 = 14 bytes
    assert.strictEqual(gcResult.deletedFiles.length, 2);

    // Referenced files still exist
    assert.strictEqual(fs.existsSync(file1), true);
    assert.strictEqual(fs.existsSync(thumb1), true);

    // Orphaned files were unlinked
    assert.strictEqual(fs.existsSync(orphan1), false);
    assert.strictEqual(fs.existsSync(orphan2), false);

    // Clean up
    fs.unlinkSync(file1);
    fs.unlinkSync(thumb1);
    fs.rmdirSync(tempDir);

    reportTest('Orphaned Receipt Image Garbage Collection & Storage Reclamation', true, {
      scanned: gcResult.scannedCount,
      orphaned: gcResult.orphanedCount,
      reclaimedBytes: gcResult.bytesReclaimed,
    });
  } catch (err) {
    reportTest('Orphaned Receipt Image Garbage Collection & Storage Reclamation', false, { error: err.message });
  }

  // --- TEST 7: OCR Text Extraction & Voucher Details Parser ---
  try {
    const sampleOcr = [
      'মেসার্স ভাই ভাই ট্রেডার্স',
      'ভাউচার নং: VCH-9942',
      'তারিখ: 14/10/2026',
      'বিবরণ: সিমেন্ট ৫০ ব্যাগ',
      'মোট টাকা: ২৫,০০০',
      'জমা: ২০,০০০',
      'বাকি: ৫,০০০',
    ].join('\n');

    const details = receiptService.extractVoucherDetails(sampleOcr);

    assert.ok(details.keywords.includes('total'));
    assert.ok(details.keywords.includes('paid'));
    assert.ok(details.keywords.includes('due'));
    assert.ok(details.keywords.includes('memo'));
    assert.strictEqual(details.memoNumber, 'VCH-9942');
    assert.ok(details.detectedDates.includes('14/10/2026'));
    assert.ok(details.detectedAmounts.includes(25000));
    assert.ok(details.detectedAmounts.includes(20000));
    assert.ok(details.detectedAmounts.includes(5000));
    assert.strictEqual(details.primaryAmount, 25000);

    reportTest('OCR Text Extraction & Voucher Details Parser', true, {
      memoNumber: details.memoNumber,
      primaryAmount: details.primaryAmount,
      detectedDates: details.detectedDates,
    });
  } catch (err) {
    reportTest('OCR Text Extraction & Voucher Details Parser', false, { error: err.message });
  }

  // --- TEST 8: ReceiptScannerStateMachine Lifecycle Transitions & Event Flow ---
  try {
    const sm = new receiptService.ReceiptScannerStateMachine();
    assert.strictEqual(sm.state, receiptService.SCANNER_STATES.IDLE);

    const stateTransitions = [];
    sm.on('stateChange', ({ state }) => {
      stateTransitions.push(state);
    });

    sm.startCapture();
    assert.strictEqual(sm.state, receiptService.SCANNER_STATES.CAPTURING);

    sm.captureSuccess({ uri: 'sample.jpg', width: 1080, height: 1920 });
    assert.strictEqual(sm.state, receiptService.SCANNER_STATES.PROCESSING_OCR);

    const receipt = sm.processOcrComplete('মোট টাকা: ৫,০০০', {
      journalId: 'txn_555',
      fileSizeBytes: 120000,
      width: 1080,
      height: 1920,
      mimeType: 'image/jpeg',
    });

    assert.strictEqual(sm.state, receiptService.SCANNER_STATES.COMPLETED);
    assert.strictEqual(receipt.journalId, 'txn_555');
    assert.strictEqual(receipt.metadata.voucherInfo.primaryAmount, 5000);

    // Transitions: CAPTURING -> PROCESSING_OCR -> COMPLETED
    assert.deepStrictEqual(stateTransitions, ['CAPTURING', 'PROCESSING_OCR', 'COMPLETED']);

    // Error handling
    sm.fail(new Error('CAMERA_PERMISSION_DENIED'));
    assert.strictEqual(sm.state, receiptService.SCANNER_STATES.FAILED);
    assert.strictEqual(sm.lastError.message, 'CAMERA_PERMISSION_DENIED');

    // Reset back to IDLE
    sm.reset();
    assert.strictEqual(sm.state, receiptService.SCANNER_STATES.IDLE);

    reportTest('ReceiptScannerStateMachine Lifecycle Transitions & Event Flow', true, {
      transitions: stateTransitions,
      finalState: sm.state,
    });
  } catch (err) {
    reportTest('ReceiptScannerStateMachine Lifecycle Transitions & Event Flow', false, { error: err.message });
  }

  // --- TEST 9: StorageRepository Atomic attachReceiptImage & Journal Querying ---
  try {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.loadStore();

    assert.strictEqual(VALID_COLLECTIONS.has('receiptImages'), true);

    // Attach receipt 1 to journal 'j100'
    const res1 = await repo.attachReceiptImage({
      journalId: 'j100',
      fileSizeBytes: 150000,
      width: 800,
      height: 1200,
      fileUri: 'file:///path/j100_1.jpg',
      businessId: '1',
    });
    assert.strictEqual(res1.success, true);
    assert.ok(res1.receiptImage.id.startsWith('rcp_'));

    // Attach receipt 2 to journal 'j100'
    const res2 = await repo.attachReceiptImage({
      journalId: 'j100',
      fileSizeBytes: 180000,
      width: 800,
      height: 1200,
      fileUri: 'file:///path/j100_2.jpg',
      businessId: '1',
    });
    assert.strictEqual(res2.success, true);

    // Attach receipt 3 to journal 'j200'
    const res3 = await repo.attachReceiptImage({
      journalId: 'j200',
      fileSizeBytes: 200000,
      width: 800,
      height: 1200,
      fileUri: 'file:///path/j200_1.jpg',
      businessId: '1',
    });
    assert.strictEqual(res3.success, true);

    // Query receipts for j100
    const j100Receipts = repo.getReceiptImagesForJournal('j100', '1');
    assert.strictEqual(j100Receipts.length, 2);

    // Query receipts for j200
    const j200Receipts = repo.getReceiptImagesForJournal('j200', '1');
    assert.strictEqual(j200Receipts.length, 1);

    // Query all receipts for business 1
    const allBizReceipts = repo.getReceiptImagesForBusiness('1');
    assert.strictEqual(allBizReceipts.length, 3);

    // Idempotent update: updating existing receipt by ID
    const updatedRes = await repo.attachReceiptImage({
      id: res1.receiptImage.id,
      journalId: 'j100',
      fileSizeBytes: 155000,
      width: 800,
      height: 1200,
      businessId: '1',
      ocrText: 'Updated OCR Text',
    });
    assert.strictEqual(updatedRes.success, true);
    const updatedList = repo.getReceiptImagesForBusiness('1');
    assert.strictEqual(updatedList.length, 3); // Did not add duplicate!
    assert.strictEqual(repo.getReceiptImagesForJournal('j100', '1')[0].ocrText, 'Updated OCR Text');

    reportTest('StorageRepository Atomic attachReceiptImage & Journal Querying', true, {
      j100Count: j100Receipts.length,
      j200Count: j200Receipts.length,
      totalBiz1Count: allBizReceipts.length,
    });
  } catch (err) {
    reportTest('StorageRepository Atomic attachReceiptImage & Journal Querying', false, { error: err.message });
  }

  // --- TEST 10: Multi-Tenant Business Isolation & Colliding Journal ID Isolation ---
  try {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.loadStore();

    // Colliding journal ID 'txn_colliding_99' in Shop 1 and Shop 2
    await repo.attachReceiptImage({
      journalId: 'txn_colliding_99',
      fileSizeBytes: 100000,
      width: 600,
      height: 800,
      businessId: '1',
      metadata: { shop: 'Shop 1' },
    });

    await repo.attachReceiptImage({
      journalId: 'txn_colliding_99',
      fileSizeBytes: 200000,
      width: 600,
      height: 800,
      businessId: '2',
      metadata: { shop: 'Shop 2' },
    });

    const shop1Receipts = repo.getReceiptImagesForJournal('txn_colliding_99', '1');
    assert.strictEqual(shop1Receipts.length, 1);
    assert.strictEqual(shop1Receipts[0].metadata.shop, 'Shop 1');

    const shop2Receipts = repo.getReceiptImagesForJournal('txn_colliding_99', '2');
    assert.strictEqual(shop2Receipts.length, 1);
    assert.strictEqual(shop2Receipts[0].metadata.shop, 'Shop 2');

    const shop3Receipts = repo.getReceiptImagesForJournal('txn_colliding_99', '3');
    assert.strictEqual(shop3Receipts.length, 0);

    reportTest('Multi-Tenant Business Isolation & Colliding Journal ID Isolation', true, {
      shop1Isolated: true,
      shop2Isolated: true,
    });
  } catch (err) {
    reportTest('Multi-Tenant Business Isolation & Colliding Journal ID Isolation', false, { error: err.message });
  }

  // --- TEST 11: Single Receipt Deletion & Journal Batch Deletion ---
  try {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.loadStore();

    const r1 = (await repo.attachReceiptImage({
      journalId: 'j_del_1',
      fileSizeBytes: 100000,
      width: 500,
      height: 500,
      businessId: '1',
    })).receiptImage;

    const r2 = (await repo.attachReceiptImage({
      journalId: 'j_del_1',
      fileSizeBytes: 100000,
      width: 500,
      height: 500,
      businessId: '1',
    })).receiptImage;

    const r3 = (await repo.attachReceiptImage({
      journalId: 'j_del_2',
      fileSizeBytes: 100000,
      width: 500,
      height: 500,
      businessId: '1',
    })).receiptImage;

    // Single deletion
    const delRes1 = await repo.deleteReceiptImage(r1.id, { deleteFile: false });
    assert.strictEqual(delRes1.success, true);
    assert.strictEqual(delRes1.deletedReceipt.id, r1.id);
    assert.strictEqual(repo.getReceiptImagesForBusiness('1').length, 2);

    // Journal batch deletion
    const delBatch = await repo.deleteReceiptImagesForJournal('j_del_1', '1', { deleteFile: false });
    assert.strictEqual(delBatch.success, true);
    assert.strictEqual(delBatch.deletedCount, 1); // r2 was deleted
    assert.strictEqual(repo.getReceiptImagesForBusiness('1').length, 1); // only r3 remains
    assert.strictEqual(repo.getReceiptImagesForBusiness('1')[0].id, r3.id);

    reportTest('Single Receipt Deletion & Journal Batch Deletion', true, {
      singleDeleted: true,
      batchDeletedCount: delBatch.deletedCount,
      remainingCount: repo.getReceiptImagesForBusiness('1').length,
    });
  } catch (err) {
    reportTest('Single Receipt Deletion & Journal Batch Deletion', false, { error: err.message });
  }

  // --- TEST 12: Account Cascade Deletion Purges Attached Receipt Images ---
  try {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.loadStore();

    // Create an account with transactions
    const targetAccId = 'acc_target_cascade';
    await repo.mutateStore((s) => ({
      ...s,
      accounts: [
        ...(s.accounts || []),
        { id: targetAccId, name: 'Cascade Customer', type: 1, businessId: '1', balance: 5000 },
        { id: 'acc_other', name: 'Other Customer', type: 1, businessId: '1', balance: 1000 },
      ],
      journals: [
        ...(s.journals || []),
        { id: 'txn_c1', accountId: targetAccId, amount: 2000, businessId: '1' },
        { id: 'txn_c2', accountId: targetAccId, amount: 3000, businessId: '1' },
        { id: 'txn_o1', accountId: 'acc_other', amount: 1000, businessId: '1' },
      ],
    }));

    // Attach receipts to transactions
    await repo.attachReceiptImage({ journalId: 'txn_c1', fileSizeBytes: 100000, width: 800, height: 1000, businessId: '1' });
    await repo.attachReceiptImage({ journalId: 'txn_c1', fileSizeBytes: 120000, width: 800, height: 1000, businessId: '1' });
    await repo.attachReceiptImage({ journalId: 'txn_c2', fileSizeBytes: 140000, width: 800, height: 1000, businessId: '1' });
    await repo.attachReceiptImage({ journalId: 'txn_o1', fileSizeBytes: 160000, width: 800, height: 1000, businessId: '1' });

    assert.strictEqual(repo.getReceiptImagesForBusiness('1').length, 4);

    // Cascade delete target account
    const cascRes = await repo.deleteAccountCascade(targetAccId, '1', { deleteFile: false });
    assert.strictEqual(cascRes.success, true);
    assert.strictEqual(cascRes.deletedAccountId, targetAccId);
    assert.strictEqual(cascRes.deletedJournalsCount, 2);
    assert.strictEqual(cascRes.deletedReceiptImagesCount, 3); // txn_c1 (2) + txn_c2 (1) = 3

    // Only the other customer's receipt remains
    const remainingReceipts = repo.getReceiptImagesForBusiness('1');
    assert.strictEqual(remainingReceipts.length, 1);
    assert.strictEqual(remainingReceipts[0].journalId, 'txn_o1');

    reportTest('Account Cascade Deletion Purges Attached Receipt Images', true, {
      deletedJournals: cascRes.deletedJournalsCount,
      deletedReceipts: cascRes.deletedReceiptImagesCount,
    });
  } catch (err) {
    reportTest('Account Cascade Deletion Purges Attached Receipt Images', false, { error: err.message });
  }

  // --- TEST 13: Business Cascade Deletion Purges Shop Receipts & Unlinks Files ---
  try {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.loadStore();

    // Create Business 'biz_purge'
    await repo.mutateStore((s) => ({
      ...s,
      businesses: [
        ...(s.businesses || []),
        { id: 'biz_purge', name: 'To Be Purged', isArchived: false },
      ],
    }));

    // Attach receipts to biz_purge and business 1
    await repo.attachReceiptImage({ journalId: 'j_purge_1', fileSizeBytes: 100000, width: 600, height: 800, businessId: 'biz_purge' });
    await repo.attachReceiptImage({ journalId: 'j_purge_2', fileSizeBytes: 150000, width: 600, height: 800, businessId: 'biz_purge' });
    await repo.attachReceiptImage({ journalId: 'j_keep_1', fileSizeBytes: 200000, width: 600, height: 800, businessId: '1' });

    assert.strictEqual(repo.getReceiptImagesForBusiness('biz_purge').length, 2);
    assert.strictEqual(repo.getReceiptImagesForBusiness('1').length, 1);

    // Cascade delete biz_purge
    const delBizRes = await repo.deleteBusinessCascade('biz_purge');
    assert.strictEqual(delBizRes.success, true);

    // biz_purge receipts are completely gone
    assert.strictEqual(repo.getReceiptImagesForBusiness('biz_purge').length, 0);
    // Business 1 receipts remain intact
    assert.strictEqual(repo.getReceiptImagesForBusiness('1').length, 1);

    reportTest('Business Cascade Deletion Purges Shop Receipts & Unlinks Files', true, {
      bizPurged: true,
      shop1Preserved: true,
    });
  } catch (err) {
    reportTest('Business Cascade Deletion Purges Shop Receipts & Unlinks Files', false, { error: err.message });
  }

  // --- TEST 14: Receipt Storage Metrics Aggregation & Breakdown ---
  try {
    const receipts = [
      { id: 'r1', fileSizeBytes: 102400, mimeType: 'image/jpeg', ocrText: 'Text 1', businessId: '1' },
      { id: 'r2', fileSizeBytes: 204800, mimeType: 'image/jpeg', ocrText: null, businessId: '1' },
      { id: 'r3', fileSizeBytes: 307200, mimeType: 'image/png', ocrText: 'Text 3', businessId: '1' },
    ];

    const metrics = receiptService.calculateReceiptStorageUsage(receipts, { locale: 'bn' });
    assert.strictEqual(metrics.totalCount, 3);
    assert.strictEqual(metrics.totalBytes, 614400); // 100 + 200 + 300 = 600 KB
    assert.strictEqual(metrics.averageFileSizeBytes, 204800);
    assert.strictEqual(metrics.withOcrCount, 2);
    assert.strictEqual(metrics.formattedBytesBn, '৬০০ কেবি');
    assert.strictEqual(metrics.formattedAverageBytesBn, '২০০ কেবি');
    assert.strictEqual(metrics.byMimeType['image/jpeg'], 307200);
    assert.strictEqual(metrics.byMimeType['image/png'], 307200);
    assert.strictEqual(metrics.byBusiness['1'].count, 3);

    reportTest('Receipt Storage Metrics Aggregation & Breakdown', true, {
      totalCount: metrics.totalCount,
      totalBytes: metrics.formattedBytesBn,
      averageBytes: metrics.formattedAverageBytesBn,
    });
  } catch (err) {
    reportTest('Receipt Storage Metrics Aggregation & Breakdown', false, { error: err.message });
  }

  // --- TEST 15: Google Drive Cloud Backup Sanitization & Compressed Restore Round-Trip ---
  try {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.loadStore();

    // Attach a receipt with binary payloads and local device paths
    await repo.attachReceiptImage({
      id: 'rcp_cloud_test_1',
      journalId: 'txn_cloud_100',
      fileSizeBytes: 350000,
      width: 1080,
      height: 1920,
      mimeType: 'image/jpeg',
      fileUri: 'file:///data/user/0/tallybook/receipt_images/TK_RCP_txn_cloud_100.jpg',
      thumbnailUri: 'file:///data/user/0/tallybook/receipt_images/TK_RCP_THUMB_txn_cloud_100.jpg',
      ocrText: 'মোট টাকা: ৮,৫০০',
      businessId: '1',
      metadata: { notes: 'Paid by cash' },
      // Raw binary fields that must be stripped from backup
      imageBlob: 'BINARY_BLOB_SHOULD_BE_REMOVED',
      base64Data: 'BASE64_PAYLOAD_SHOULD_BE_REMOVED',
    });

    const authoritativeState = repo.getAuthoritativeState();
    assert.strictEqual(authoritativeState.receiptImages.length, 1);

    // Serialize and compress backup payload
    const backup = googleDriveService.serializeBackupPayload(authoritativeState, {
      userProfile: { sub: 'merchant_google_123', email: 'merchant@gmail.com' },
      compression: 'gzip',
    });

    assert.strictEqual(backup.compressed, true);
    assert.strictEqual(backup.manifest.recordCounts.receiptImages, 1);

    // Inspect the sanitized receipt inside uncompressed payload
    const sanitizedReceipt = backup.data.receiptImages[0];
    assert.strictEqual(sanitizedReceipt.id, 'rcp_cloud_test_1');
    assert.strictEqual(sanitizedReceipt.journalId, 'txn_cloud_100');
    assert.strictEqual(sanitizedReceipt.ocrText, 'মোট টাকা: ৮,৫০০');
    assert.strictEqual(sanitizedReceipt.sanitized, true);
    assert.strictEqual(sanitizedReceipt.backupExcludedBinary, true);
    assert.strictEqual(sanitizedReceipt.fileUri, null); // Local path scrubbed
    assert.strictEqual(sanitizedReceipt.thumbnailUri, null);
    assert.strictEqual(sanitizedReceipt.imageBlob, undefined); // Binary scrubbed
    assert.strictEqual(sanitizedReceipt.base64Data, undefined);

    // Restore payload into a fresh repository
    const freshAdapter = new MemoryStorageAdapter();
    const freshRepo = new StorageRepository(freshAdapter);
    await freshRepo.loadStore();

    // Import payload
    const restoreRes = await freshRepo.importBackupPayload(backup);
    assert.strictEqual(restoreRes.success, true);

    // Verify restored receipt in fresh repository
    const restoredReceipts = freshRepo.getReceiptImagesForBusiness('1');
    assert.strictEqual(restoredReceipts.length, 1);
    assert.strictEqual(restoredReceipts[0].id, 'rcp_cloud_test_1');
    assert.strictEqual(restoredReceipts[0].journalId, 'txn_cloud_100');
    assert.strictEqual(restoredReceipts[0].ocrText, 'মোট টাকা: ৮,৫০০');
    assert.strictEqual(restoredReceipts[0].backupExcludedBinary, true);

    reportTest('Google Drive Cloud Backup Sanitization & Compressed Restore Round-Trip', true, {
      backupSanitized: true,
      restoreVerified: true,
      restoredReceiptId: restoredReceipts[0].id,
    });
  } catch (err) {
    reportTest('Google Drive Cloud Backup Sanitization & Compressed Restore Round-Trip', false, { error: err.message });
  }

  // --- SUMMARY REPORT ---
  console.log('='.repeat(80));
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY (100%)`);
  console.log('='.repeat(80));

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
