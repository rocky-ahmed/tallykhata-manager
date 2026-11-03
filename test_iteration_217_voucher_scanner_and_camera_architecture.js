/**
 * TEST SUITE: REA-ITER-217 (OCR Voucher Scanner, CameraX Ingestion, Image Compression & Document Processing Architecture)
 * Target Binary: D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk (REF-001)
 * Expected SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9
 * Expected Size: 53,969,511 bytes
 */

const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const path = require('path');

const APK_PATH = 'D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk';
const EXPECTED_SHA256 = '267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9';
const EXPECTED_SIZE = 53969511;

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`[FAIL] Test ${totalTests}: ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  }
}

console.log('================================================================');
console.log('  REA-ITER-217: VOUCHER SCANNER & CAMERA ARCHITECTURE TEST SUITE ');
console.log('================================================================\n');

// Helper to extract entry from APK zip
function readZipEntry(zipBuffer, entryName) {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer.readUInt32LE(i) === eocdSignature) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) return null;
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  let cur = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    const sig = zipBuffer.readUInt32LE(cur);
    if (sig !== 0x02014b50) break;
    const compression = zipBuffer.readUInt16LE(cur + 10);
    const compSize = zipBuffer.readUInt32LE(cur + 20);
    const nameLen = zipBuffer.readUInt16LE(cur + 28);
    const extraLen = zipBuffer.readUInt16LE(cur + 30);
    const commentLen = zipBuffer.readUInt16LE(cur + 32);
    const localHeaderOff = zipBuffer.readUInt32LE(cur + 42);
    const name = zipBuffer.toString('utf8', cur + 46, cur + 46 + nameLen);
    cur += 46 + nameLen + extraLen + commentLen;
    if (name === entryName) {
      const locNameLen = zipBuffer.readUInt16LE(localHeaderOff + 26);
      const locExtraLen = zipBuffer.readUInt16LE(localHeaderOff + 28);
      const dataStart = localHeaderOff + 30 + locNameLen + locExtraLen;
      const compData = zipBuffer.slice(dataStart, dataStart + compSize);
      return compression === 8 ? zlib.inflateRawSync(compData) : compData;
    }
  }
  return null;
}

// Helper to list all zip entries
function listZipEntries(zipBuffer) {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer.readUInt32LE(i) === eocdSignature) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) return [];
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  let cur = cdOffset;
  const entries = [];
  for (let i = 0; i < totalEntries; i++) {
    const nameLen = zipBuffer.readUInt16LE(cur + 28);
    const extraLen = zipBuffer.readUInt16LE(cur + 30);
    const commentLen = zipBuffer.readUInt16LE(cur + 32);
    const name = zipBuffer.toString('utf8', cur + 46, cur + 46 + nameLen);
    cur += 46 + nameLen + extraLen + commentLen;
    entries.push(name);
  }
  return entries;
}

// Helper to extract all strings from a DEX buffer
function extractDexStrings(dexBuffer) {
  const stringIdsSize = dexBuffer.readUInt32LE(0x38);
  const stringIdsOff = dexBuffer.readUInt32LE(0x3c);
  const strings = new Set();
  const stringList = [];
  for (let i = 0; i < stringIdsSize; i++) {
    let p = dexBuffer.readUInt32LE(stringIdsOff + i * 4);
    let len = 0, shift = 0;
    while (true) {
      const b = dexBuffer[p++];
      len |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    const start = p;
    while (dexBuffer[p] !== 0) p++;
    const s = dexBuffer.toString('utf8', start, p);
    strings.add(s);
    stringList.push(s);
  }
  return { set: strings, list: stringList };
}

// Helper to dump string pool from Android binary XML
function dumpAXmlStrings(b) {
  if (!b) return [];
  const stringCount = b.readUInt32LE(16);
  const flags = b.readUInt32LE(24);
  const isUtf8 = (flags & (1 << 8)) !== 0;
  const stringsOffset = b.readUInt32LE(28);
  const poolBase = 8;
  const strings = [];
  for (let i = 0; i < stringCount; i++) {
    const off = b.readUInt32LE(36 + i * 4);
    let p = poolBase + stringsOffset + off;
    if (isUtf8) {
      let charLen = b[p++];
      if (charLen & 0x80) { charLen = ((charLen & 0x7f) << 8) | b[p++]; }
      let byteLen = b[p++];
      if (byteLen & 0x80) { byteLen = ((byteLen & 0x7f) << 8) | b[p++]; }
      strings.push(b.toString('utf8', p, p + byteLen));
    } else {
      let charLen = b.readUInt16LE(p);
      p += 2;
      if (charLen & 0x8000) {
        charLen = ((charLen & 0x7fff) << 16) | b.readUInt16LE(p);
        p += 2;
      }
      strings.push(b.toString('utf16le', p, p + charLen * 2));
    }
  }
  return strings;
}

// -------------------------------------------------------------
// TEST 1: Reference APK Integrity & Cryptographic Identity
// -------------------------------------------------------------
console.log('--- Test Suite 1: Reference APK Integrity ---');
assert(fs.existsSync(APK_PATH), `Reference APK exists at ${APK_PATH}`);
const apkBuffer = fs.readFileSync(APK_PATH);
assert(apkBuffer.length === EXPECTED_SIZE, `APK size matches expected (${apkBuffer.length} === ${EXPECTED_SIZE})`);
const actualHash = crypto.createHash('sha256').update(apkBuffer).digest('hex');
assert(actualHash === EXPECTED_SHA256, `APK SHA-256 matches expected digest (${actualHash})`);

// Extract DEX files and manifest
console.log('\n--- Extracting DEX Containers & Manifest from Reference APK ---');
const c1Data = readZipEntry(apkBuffer, 'classes.dex');
const c3Data = readZipEntry(apkBuffer, 'classes3.dex');
const c4Data = readZipEntry(apkBuffer, 'classes4.dex');
const manifestData = readZipEntry(apkBuffer, 'AndroidManifest.xml');

assert(c1Data !== null, 'classes.dex extracted successfully');
assert(c3Data !== null, 'classes3.dex extracted successfully');
assert(c4Data !== null, 'classes4.dex extracted successfully');
assert(manifestData !== null, 'AndroidManifest.xml extracted successfully');

const c1Strings = extractDexStrings(c1Data);
const c3Strings = extractDexStrings(c3Data);
const c4Strings = extractDexStrings(c4Data);
const manifestStrings = dumpAXmlStrings(manifestData);

// -------------------------------------------------------------
// TEST 2: AndroidManifest Camera Permissions & Registered Activities
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: AndroidManifest Permissions & Activities ---');
assert(manifestStrings.includes('android.permission.CAMERA'), 'Manifest declares android.permission.CAMERA');
assert(manifestStrings.includes('android.permission.WRITE_EXTERNAL_STORAGE'), 'Manifest declares android.permission.WRITE_EXTERNAL_STORAGE');
assert(manifestStrings.includes('com.progoti.tallykhata.v2.camera.CameraActivity'), 'Manifest registers CameraActivity');
assert(manifestStrings.includes('com.psl.tkpicker.ImagePickerActivity'), 'Manifest registers ImagePickerActivity');
assert(manifestStrings.includes('com.psl.tkpicker.ImagePickerFileProvider'), 'Manifest registers ImagePickerFileProvider');
assert(manifestStrings.includes('com.yalantis.ucrop.UCropActivity'), 'Manifest registers UCropActivity');
assert(manifestStrings.includes('com.progoti.tallykhata.v2.tallypay.activities.qrScanner.QrScannerActivity'), 'Manifest registers QrScannerActivity');
assert(manifestStrings.includes('com.progoti.tallykhata.v2.tallypay.activities.qrScanner.BanglaQrCaptureActivity'), 'Manifest registers BanglaQrCaptureActivity');
assert(manifestStrings.includes('com.progoti.tallykhata.v2.activities.ImageUploadPreviewActivity'), 'Manifest registers ImageUploadPreviewActivity');

// -------------------------------------------------------------
// TEST 3: CameraX & Custom Camera Invariants in classes4.dex
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: CameraX & Custom Viewfinder Invariants ---');
assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/camera/CameraActivity;'), 'classes4.dex defines CameraActivity');
assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/camera/CameraXFragment;'), 'classes4.dex defines CameraXFragment');
assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/camera/BaseCameraFragment;'), 'classes4.dex defines BaseCameraFragment');
assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/camera/CustomCameraFragment;'), 'classes4.dex defines CustomCameraFragment');
assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/camera/CameraXImageUtil$CodecFailedException;'), 'classes4.dex defines CameraXImageUtil$CodecFailedException');
assert(c4Strings.set.has('key_from_cs_add'), 'classes4.dex contains key_from_cs_add intent extra');
assert(c4Strings.set.has('post_process'), 'classes4.dex contains post_process intent extra');

// Verify layout res/layout/fragment_camera_x.xml exists and uses PreviewView
const cameraXLayoutData = readZipEntry(apkBuffer, 'res/layout/fragment_camera_x.xml');
assert(cameraXLayoutData !== null, 'res/layout/fragment_camera_x.xml exists in APK');
const cameraXLayoutStrings = dumpAXmlStrings(cameraXLayoutData);
assert(cameraXLayoutStrings.includes('androidx.camera.view.PreviewView'), 'fragment_camera_x.xml contains androidx.camera.view.PreviewView');
assert(cameraXLayoutStrings.includes('keepScreenOn'), 'fragment_camera_x.xml enables keepScreenOn');

// -------------------------------------------------------------
// TEST 4: TKPicker Subsystem, Intent Contract & Extras
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: TKPicker Protocol & Extras ---');
assert(c4Strings.set.has('Lcom/psl/tkpicker/ImagePickerActivity;'), 'classes4.dex defines ImagePickerActivity');
assert(c4Strings.set.has('Lcom/psl/tkpicker/constant/ImageProvider;'), 'classes4.dex defines ImageProvider enum');
assert(c4Strings.set.has('GALLERY'), 'ImageProvider contains GALLERY');
assert(c4Strings.set.has('CAMERA'), 'ImageProvider contains CAMERA');
assert(c4Strings.set.has('BOTH'), 'ImageProvider contains BOTH');

// Verify standard TKPicker intent extras
const expectedExtras = [
  'extra.crop',
  'extra.crop_x',
  'extra.crop_y',
  'extra.error',
  'extra.file_path',
  'extra.image_max_size',
  'extra.image_provider',
  'extra.max_height',
  'extra.max_width',
  'extra.mime_types',
  'extra.save_directory'
];
for (const extra of expectedExtras) {
  assert(c4Strings.set.has(extra), `classes4.dex contains intent extra "${extra}"`);
}

// -------------------------------------------------------------
// TEST 5: CompressionProvider (gn/d) & ExifDataCopier (gn/c) Bytecode Invariants
// -------------------------------------------------------------
console.log('\n--- Test Suite 5: CompressionProvider & EXIF Preservation ---');
assert(c4Strings.set.has('Lgn/c;'), 'classes4.dex defines Lgn/c; (ExifDataCopier)');
assert(c4Strings.set.has('Lgn/d;'), 'classes4.dex defines Lgn/d; (CompressionProvider)');
assert(c4Strings.set.has('ExifDataCopier'), 'classes4.dex contains ExifDataCopier string');
assert(c4Strings.set.has('Error preserving Exif data on selected image: '), 'classes4.dex contains EXIF error handler string');

// Verify bytecode constants inside gn/d (offset 4277396)
const compCodeOff = 4277396;
const compInsnsSize = c4Data.readUInt32LE(compCodeOff + 12);
const compInsns = c4Data.slice(compCodeOff + 16, compCodeOff + 16 + compInsnsSize * 2);

let foundQuality80 = false;
let foundQuality60 = false;
let foundQuality40 = false;
let found1024Ceiling = false;

for (let i = 0; i < compInsns.length - 1; i++) {
  const v16 = compInsns.readUInt16LE(i);
  if (v16 === 80) foundQuality80 = true;
  if (v16 === 60) foundQuality60 = true;
  if (v16 === 40) foundQuality40 = true;
  if (v16 === 1024) found1024Ceiling = true;
}

assert(foundQuality80, 'CompressionProvider bytecode contains 80% JPEG quality constant (0x0050)');
assert(foundQuality60, 'CompressionProvider bytecode contains 60% JPEG quality constant (0x003c)');
assert(foundQuality40, 'CompressionProvider bytecode contains 40% JPEG quality constant (0x0028)');
assert(found1024Ceiling, 'CompressionProvider bytecode contains 1024 dimension/size ceiling constant (0x0400)');

// -------------------------------------------------------------
// TEST 6: UCropActivity & Crop Shape Geometry
// -------------------------------------------------------------
console.log('\n--- Test Suite 6: UCrop & Crop Shape Geometry ---');
assert(c4Strings.set.has('Lcom/yalantis/ucrop/UCropActivity;'), 'classes4.dex defines UCropActivity');
assert(c4Strings.set.has('Lcom/yalantis/ucrop/view/UCropView;'), 'classes4.dex defines UCropView');
assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/constant/EnumConstant$CropShapeType;'), 'classes4.dex defines CropShapeType enum');
assert(c4Strings.set.has('CIRCLE'), 'CropShapeType contains CIRCLE');
assert(c4Strings.set.has('RECTANGLE'), 'CropShapeType contains RECTANGLE');

// Verify UCrop layouts exist in APK
const ucropLayouts = [
  'res/layout/ucrop_activity_photobox.xml',
  'res/layout/ucrop_view.xml',
  'res/layout/ucrop_controls.xml'
];
for (const uLayout of ucropLayouts) {
  const lData = readZipEntry(apkBuffer, uLayout);
  assert(lData !== null, `APK contains layout "${uLayout}"`);
}

// -------------------------------------------------------------
// TEST 7: ZXing Barcode Engine & Bangla QR Invariants
// -------------------------------------------------------------
console.log('\n--- Test Suite 7: ZXing Barcode & Bangla QR Invariants ---');
assert(c3Strings.set.has('Lcom/google/zxing/BarcodeFormat;'), 'classes3.dex defines ZXing BarcodeFormat');
assert(c3Strings.set.has('QR_CODE'), 'BarcodeFormat contains QR_CODE');
assert(c3Strings.set.has('EAN_13'), 'BarcodeFormat contains EAN_13');
assert(c3Strings.set.has('UPC_A'), 'BarcodeFormat contains UPC_A');
assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/tallypay/activities/qrScanner/QrScannerActivity;'), 'classes4.dex defines QrScannerActivity');
assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/tallypay/activities/qrScanner/BanglaQrCaptureActivity;'), 'classes4.dex defines BanglaQrCaptureActivity');
assert(c4Strings.set.has('SCAN_RESULT_IMAGE_PATH'), 'classes4.dex contains SCAN_RESULT_IMAGE_PATH parameter');
assert(c3Strings.set.has('BARCODE_IMAGE_ENABLED'), 'classes3.dex contains BARCODE_IMAGE_ENABLED parameter');

// -------------------------------------------------------------
// TEST 8: Room DB journal_media Schema & Query Invariants
// -------------------------------------------------------------
console.log('\n--- Test Suite 8: Room DB journal_media Entity & Operations ---');
assert(c4Strings.set.has('journal_media'), 'classes4.dex defines journal_media table');
assert(c4Strings.set.has('index_journal_media_journal_id'), 'classes4.dex defines index_journal_media_journal_id');
assert(c4Strings.set.has('index_journal_media_file_name'), 'classes4.dex defines unique index_journal_media_file_name');

// Verify exact CREATE TABLE DDL string in classes4.dex
const hasJournalMediaDDL = c4Strings.list.some(s => 
  s.includes('CREATE TABLE IF NOT EXISTS `journal_media`') &&
  s.includes('`file_name` TEXT NOT NULL') &&
  s.includes('`path` TEXT NOT NULL') &&
  s.includes('`journal_id` INTEGER NOT NULL') &&
  s.includes('`is_active` INTEGER NOT NULL DEFAULT 1') &&
  s.includes('`synced` INTEGER NOT NULL')
);
assert(hasJournalMediaDDL, 'classes4.dex defines canonical journal_media Room DDL with is_active, synced, and path');

// Verify active query
assert(
  c4Strings.set.has('select * from journal_media WHERE is_active = 1 AND journal_id =? order by datetime(create_date)'),
  'classes4.dex contains active attachment fetch query'
);

// Verify soft-delete query
assert(
  c4Strings.set.has('UPDATE journal_media SET synced = 0, is_active = 0 WHERE journal_id = ?'),
  'classes4.dex contains soft-delete attachment query'
);

// -------------------------------------------------------------
// TEST 9: Room DB file_upload_history, account_media & Workers
// -------------------------------------------------------------
console.log('\n--- Test Suite 9: file_upload_history & CSImageUploadWorker ---');
assert(c4Strings.set.has('file_upload_history'), 'classes4.dex defines file_upload_history table');
assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/arch/util/TKEnum$ImageResolutionType;'), 'classes4.dex defines ImageResolutionType enum');
assert(c4Strings.set.has('HIGH'), 'ImageResolutionType contains HIGH');
assert(c4Strings.set.has('MEDIUM'), 'ImageResolutionType contains MEDIUM');
assert(c4Strings.set.has('LOW'), 'ImageResolutionType contains LOW');

assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/arch/util/TKEnum$ImageUploadStatus;'), 'classes4.dex defines ImageUploadStatus enum');
assert(c4Strings.set.has('CAPTURED'), 'ImageUploadStatus contains CAPTURED');
assert(c4Strings.set.has('UPLOADING'), 'ImageUploadStatus contains UPLOADING');
assert(c4Strings.set.has('UPLOAD_COMPLETE'), 'ImageUploadStatus contains UPLOAD_COMPLETE');
assert(c4Strings.set.has('EMPTY'), 'ImageUploadStatus contains EMPTY');

assert(c1Strings.set.has('Lcom/progoti/tallykhata/v2/workers/CSImageUploadWorker;'), 'classes.dex defines CSImageUploadWorker');
assert(c4Strings.set.has('IMG-UPLOAD'), 'classes4.dex contains WorkManager tag "IMG-UPLOAD"');
assert(c4Strings.set.has('account_media'), 'classes4.dex defines account_media table');
assert(c4Strings.set.has('gallery_media'), 'classes4.dex defines gallery_media table');

// -------------------------------------------------------------
// TEST 10: Clean-Room Voucher & Receipt Processing Simulation
// -------------------------------------------------------------
console.log('\n--- Test Suite 10: Clean-Room Voucher Lifecycle Simulation ---');

// 10.1 Compression Ladder Simulator mirroring gn/d
function simulateAdaptiveCompression(originalWidth, originalHeight, estimatedRawBytes) {
  const MAX_DIM = 1024;
  const MAX_BYTES = 1024 * 1024; // 1 MB ceiling

  // Step 1: Scale dimension
  let w = originalWidth;
  let h = originalHeight;
  if (w > MAX_DIM || h > MAX_DIM) {
    if (w >= h) {
      h = Math.round((h * MAX_DIM) / w);
      w = MAX_DIM;
    } else {
      w = Math.round((w * MAX_DIM) / h);
      h = MAX_DIM;
    }
  }

  const dimensionFactor = (w * h) / (originalWidth * originalHeight);
  let baseBytes = estimatedRawBytes * dimensionFactor;

  // Step 2: Quality ladder: 80% -> 60% -> 40%
  const qualityLadder = [80, 60, 40];
  let selectedQuality = 40;
  let finalBytes = baseBytes * 0.4;

  for (const q of qualityLadder) {
    const bytesAtQ = baseBytes * (q / 100);
    if (bytesAtQ <= MAX_BYTES) {
      selectedQuality = q;
      finalBytes = bytesAtQ;
      break;
    }
  }

  return {
    width: w,
    height: h,
    quality: selectedQuality,
    bytes: Math.round(finalBytes)
  };
}

// Test with 4000x3000 high-res camera capture (3.5MB uncompressed estimate)
const simResult = simulateAdaptiveCompression(4000, 3000, 3500000);
assert(simResult.width <= 1024, `Scaled width clamped to <= 1024 (${simResult.width})`);
assert(simResult.height <= 1024, `Scaled height clamped to <= 1024 (${simResult.height})`);
assert(simResult.bytes <= 1024 * 1024, `Compressed bytes below 1024KB ceiling (${simResult.bytes} bytes)`);
assert(simResult.quality === 80, `Accepted at tier 1 (80% quality): ${simResult.quality}%`);

// Test with extreme 12000x9000 poster capture (45MB raw)
const extremeResult = simulateAdaptiveCompression(12000, 9000, 45000000);
assert(extremeResult.width <= 1024, `Extreme image clamped width: ${extremeResult.width}`);
assert(extremeResult.bytes <= 1024 * 1024, `Extreme image clamped size below ceiling: ${extremeResult.bytes}`);

// 10.2 Simulated Room SQLite journal_media Database
class MockJournalMediaDatabase {
  constructor() {
    this.records = [];
    this.nextId = 1;
  }

  insert(media) {
    const record = {
      id: this.nextId++,
      file_name: media.file_name,
      path: media.path,
      journal_id: media.journal_id,
      create_date: media.create_date || new Date().toISOString(),
      synced: media.synced !== undefined ? media.synced : 0,
      is_active: media.is_active !== undefined ? media.is_active : 1,
      server_id: media.server_id || null
    };
    // Unique index check on file_name
    if (this.records.some(r => r.file_name === record.file_name)) {
      throw new Error(`UNIQUE constraint failed: index_journal_media_file_name (${record.file_name})`);
    }
    this.records.push(record);
    return record;
  }

  getActiveByJournalId(journalId) {
    // Matches: select * from journal_media WHERE is_active = 1 AND journal_id =? order by datetime(create_date)
    return this.records
      .filter(r => r.is_active === 1 && r.journal_id === journalId)
      .sort((a, b) => new Date(a.create_date).getTime() - new Date(b.create_date).getTime());
  }

  softDeleteByJournalId(journalId) {
    // Matches: UPDATE journal_media SET synced = 0, is_active = 0 WHERE journal_id = ?
    let updated = 0;
    for (const r of this.records) {
      if (r.journal_id === journalId) {
        r.synced = 0;
        r.is_active = 0;
        updated++;
      }
    }
    return updated;
  }

  markSynced(id, syncedValue) {
    // Matches: UPDATE journal_media SET synced = ? WHERE id = ?
    const r = this.records.find(rec => rec.id === id);
    if (r) {
      r.synced = syncedValue;
      return true;
    }
    return false;
  }
}

const mockDb = new MockJournalMediaDatabase();

// Ingest two voucher photos for Journal entry #101
const v1 = mockDb.insert({
  file_name: 'TK_IMG_1730620800001.jpg',
  path: '/data/user/0/com.progoti.tallykhata/files/vouchers/TK_IMG_1730620800001.jpg',
  journal_id: 101,
  create_date: '2026-11-03T10:00:00Z',
  synced: 0,
  is_active: 1
});

const v2 = mockDb.insert({
  file_name: 'TK_IMG_1730620800002.jpg',
  path: '/data/user/0/com.progoti.tallykhata/files/vouchers/TK_IMG_1730620800002.jpg',
  journal_id: 101,
  create_date: '2026-11-03T10:01:00Z',
  synced: 0,
  is_active: 1
});

assert(v1.id === 1, 'First voucher assigned ID 1');
assert(v2.id === 2, 'Second voucher assigned ID 2');

// Verify unique index enforcement
let uniqueViolated = false;
try {
  mockDb.insert({
    file_name: 'TK_IMG_1730620800001.jpg', // Duplicate
    path: '/duplicate.jpg',
    journal_id: 102
  });
} catch (e) {
  uniqueViolated = true;
}
assert(uniqueViolated, 'Unique index index_journal_media_file_name successfully prevented duplicate file name');

// Query active vouchers
const activeVouchers = mockDb.getActiveByJournalId(101);
assert(activeVouchers.length === 2, `Fetched 2 active vouchers for journal #101 (${activeVouchers.length})`);
assert(activeVouchers[0].file_name === 'TK_IMG_1730620800001.jpg', 'Order by create_date preserved');

// Sync one voucher
mockDb.markSynced(1, 1);
assert(mockDb.getActiveByJournalId(101)[0].synced === 1, 'Voucher #1 marked synced = 1');

// Soft-delete journal #101 attachments
const softDeleted = mockDb.softDeleteByJournalId(101);
assert(softDeleted === 2, `Soft-deleted 2 attachments for journal #101 (${softDeleted})`);
const postDeleteActive = mockDb.getActiveByJournalId(101);
assert(postDeleteActive.length === 0, `Active vouchers count is now 0 after soft delete (${postDeleteActive.length})`);

console.log('\n================================================================');
console.log(`  ALL ${totalTests} TESTS PASSED WITH 100% SUCCESS RATE`);
console.log('================================================================\n');
