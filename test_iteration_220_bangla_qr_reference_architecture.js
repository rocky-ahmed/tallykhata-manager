/**
 * test_iteration_220_bangla_qr_reference_architecture.js
 *
 * REA-ITER-220: SUPER QR & BANGLA QR EMVCo PAYMENT SUBSYSTEM
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-220
 * Target Binary: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 * SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

let totalTests = 0;
let passedTests = 0;

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
console.log('  REA-ITER-220: BANGLA QR & SUPER QR REFERENCE ARCHITECTURE     ');
console.log('================================================================\n');

// -------------------------------------------------------------
// HELPER: Read Zip Entry
// -------------------------------------------------------------
function readZipEntry(apkPath, entryName) {
  const buf = fs.readFileSync(apkPath);
  let eocdOffset = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdOffset === -1) throw new Error('EOCD not found');
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let cur = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    const fnLen = buf.readUInt16LE(cur + 28);
    const extraLen = buf.readUInt16LE(cur + 30);
    const commentLen = buf.readUInt16LE(cur + 32);
    const localHeaderOffset = buf.readUInt32LE(cur + 42);
    const compMethod = buf.readUInt16LE(cur + 10);
    const compSize = buf.readUInt32LE(cur + 20);
    const fn = buf.toString('utf8', cur + 46, cur + 46 + fnLen);
    if (fn === entryName) {
      const locFnLen = buf.readUInt16LE(localHeaderOffset + 26);
      const locExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + locFnLen + locExtraLen;
      const compData = buf.subarray(dataStart, dataStart + compSize);
      if (compMethod === 0) return compData;
      if (compMethod === 8) return zlib.inflateRawSync(compData);
    }
    cur += 46 + fnLen + extraLen + commentLen;
  }
  return null;
}

const apkPath = 'D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk';

console.log('--- Test Suite 1: Reference APK Cryptographic Identity ---');
assert(fs.existsSync(apkPath), 'Reference APK exists at ' + apkPath);
const apkStat = fs.statSync(apkPath);
assert(apkStat.size === 53969511, `APK file size matches expected (53969511 === ${apkStat.size})`);
const apkSha256 = crypto.createHash('sha256').update(fs.readFileSync(apkPath)).digest('hex');
assert(apkSha256 === '267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9', 'APK SHA-256 matches expected digest');

console.log('\n--- Test Suite 2: Manifest & Super QR Components ---');
const manifestBuf = readZipEntry(apkPath, 'AndroidManifest.xml');
assert(manifestBuf !== null && manifestBuf.length > 0, 'AndroidManifest.xml extracted successfully');

// Parse binary XML strings
const stringPoolOffset = 8;
const stringCount = manifestBuf.readUInt32LE(stringPoolOffset + 8);
const flags = manifestBuf.readUInt32LE(stringPoolOffset + 16);
const isUtf8 = (flags & (1 << 8)) !== 0;
const stringsStart = stringPoolOffset + manifestBuf.readUInt32LE(stringPoolOffset + 20);

const manifestStrings = [];
for (let i = 0; i < stringCount; i++) {
  const strOffset = stringsStart + manifestBuf.readUInt32LE(stringPoolOffset + 28 + i * 4);
  if (isUtf8) {
    let len = manifestBuf[strOffset];
    if (len & 0x80) len = ((len & 0x7f) << 8) | manifestBuf[strOffset + 1];
    let bLenOffset = (manifestBuf[strOffset] & 0x80) ? strOffset + 2 : strOffset + 1;
    let bLen = manifestBuf[bLenOffset];
    if (bLen & 0x80) bLen = ((bLen & 0x7f) << 8) | manifestBuf[bLenOffset + 1];
    let dataOffset = (manifestBuf[bLenOffset] & 0x80) ? bLenOffset + 2 : bLenOffset + 1;
    manifestStrings.push(manifestBuf.toString('utf8', dataOffset, dataOffset + bLen));
  } else {
    let len = manifestBuf.readUInt16LE(strOffset);
    let dataOffset = strOffset + 2;
    if (len & 0x8000) {
      len = ((len & 0x7fff) << 16) | manifestBuf.readUInt16LE(strOffset + 2);
      dataOffset += 2;
    }
    manifestStrings.push(manifestBuf.toString('utf16le', dataOffset, dataOffset + len * 2));
  }
}

assert(manifestStrings.includes('com.progoti.tallykhata.v2._clean_arch.super_qr.presentation.SuperQRActivity'), 'Manifest registers SuperQRActivity');
assert(manifestStrings.includes('com.progoti.tallykhata.v2.tallypay.activities.qrScanner.BanglaQrCaptureActivity'), 'Manifest registers BanglaQrCaptureActivity');
assert(manifestStrings.includes('com.journeyapps.barcodescanner.CaptureActivity'), 'Manifest registers Barcode CaptureActivity for camera QR scanning');

console.log('\n--- Test Suite 3: DEX Bytecode Domain Entities & DTOs ---');
const dex4Buf = readZipEntry(apkPath, 'classes4.dex');
assert(dex4Buf !== null && dex4Buf.length > 0, 'classes4.dex extracted successfully');

const dexStrIdsSize = dex4Buf.readUInt32LE(56);
const dexStrIdsOff = dex4Buf.readUInt32LE(60);
function getDexString(id) {
  const off = dex4Buf.readUInt32LE(dexStrIdsOff + id * 4);
  let cur = off;
  let val = dex4Buf[cur++];
  if (val > 0x7f) cur++;
  let end = cur;
  while (dex4Buf[end] !== 0) end++;
  return dex4Buf.toString('utf8', cur, end);
}

const typeIdsSize = dex4Buf.readUInt32LE(64);
const typeIdsOff = dex4Buf.readUInt32LE(68);
function getDexType(id) {
  const descriptorIdx = dex4Buf.readUInt32LE(typeIdsOff + id * 4);
  return getDexString(descriptorIdx);
}

const fieldIdsSize = dex4Buf.readUInt32LE(80);
const fieldIdsOff = dex4Buf.readUInt32LE(84);
function getDexField(id) {
  const classIdx = dex4Buf.readUInt16LE(fieldIdsOff + id * 8);
  const typeIdx = dex4Buf.readUInt16LE(fieldIdsOff + id * 8 + 2);
  const nameIdx = dex4Buf.readUInt32LE(fieldIdsOff + id * 8 + 4);
  return { className: getDexType(classIdx), typeName: getDexType(typeIdx), fieldName: getDexString(nameIdx) };
}

const dexStringsSet = new Set();
for (let i = 0; i < dexStrIdsSize; i++) {
  dexStringsSet.add(getDexString(i));
}

assert(dexStringsSet.has('Lcom/progoti/tallykhata/v2/_clean_arch/super_qr/presentation/SuperQRActivity;'), 'classes4.dex defines SuperQRActivity type');
assert(dexStringsSet.has('Lcom/progoti/tallykhata/v2/tallypay/activities/qrScanner/BanglaQrCaptureActivity;'), 'classes4.dex defines BanglaQrCaptureActivity type');
assert(dexStringsSet.has('Lcom/progoti/tallykhata/v2/_clean_arch/scan_and_pay/domain/model/BanglaQrPayment;'), 'classes4.dex defines BanglaQrPayment model');
assert(dexStringsSet.has('Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/BanglaQrPaymentDto;'), 'classes4.dex defines BanglaQrPaymentDto');
assert(dexStringsSet.has('Lcom/progoti/tallykhata/v2/_clean_arch/scan_and_pay/data/dto/BanglaQrResponseDto;'), 'classes4.dex defines BanglaQrResponseDto');
assert(dexStringsSet.has('Lcom/progoti/tallykhata/v2/_clean_arch/super_qr/domain/repository/SuperQRRepository;'), 'classes4.dex defines SuperQRRepository');
assert(dexStringsSet.has('SuperQRScreen.kt'), 'classes4.dex compiles SuperQRScreen.kt');
assert(dexStringsSet.has('SuperQRSuccessScreen.kt'), 'classes4.dex compiles SuperQRSuccessScreen.kt');
assert(dexStringsSet.has('SuperQrViewModel.kt'), 'classes4.dex compiles SuperQrViewModel.kt');

console.log('\n--- Test Suite 4: BanglaQrPaymentDto & BanglaQrResponseDto Fields ---');
const allFields = [];
for (let i = 0; i < fieldIdsSize; i++) {
  allFields.push(getDexField(i));
}

const paymentDtoFields = allFields.filter(f => f.className === 'Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/BanglaQrPaymentDto;').map(f => f.fieldName);
assert(paymentDtoFields.includes('acquirerId'), 'BanglaQrPaymentDto contains acquirerId');
assert(paymentDtoFields.includes('amount'), 'BanglaQrPaymentDto contains amount (BigDecimal precision)');
assert(paymentDtoFields.includes('counterId'), 'BanglaQrPaymentDto contains counterId');
assert(paymentDtoFields.includes('merchantCategoryCode'), 'BanglaQrPaymentDto contains merchantCategoryCode');
assert(paymentDtoFields.includes('merchantCity'), 'BanglaQrPaymentDto contains merchantCity');
assert(paymentDtoFields.includes('toAccount'), 'BanglaQrPaymentDto contains toAccount');
assert(paymentDtoFields.includes('toAccountName'), 'BanglaQrPaymentDto contains toAccountName');
assert(paymentDtoFields.includes('requestId'), 'BanglaQrPaymentDto contains requestId');

const responseDtoFields = allFields.filter(f => f.className === 'Lcom/progoti/tallykhata/v2/_clean_arch/scan_and_pay/data/dto/BanglaQrResponseDto;').map(f => f.fieldName);
assert(responseDtoFields.includes('amount'), 'BanglaQrResponseDto contains amount');
assert(responseDtoFields.includes('fromName'), 'BanglaQrResponseDto contains fromName');
assert(responseDtoFields.includes('fromWallet'), 'BanglaQrResponseDto contains fromWallet');
assert(responseDtoFields.includes('toWallet'), 'BanglaQrResponseDto contains toWallet');
assert(responseDtoFields.includes('transactionNumber'), 'BanglaQrResponseDto contains transactionNumber');
assert(responseDtoFields.includes('txnTime'), 'BanglaQrResponseDto contains txnTime');
assert(responseDtoFields.includes('fee'), 'BanglaQrResponseDto contains fee');
assert(responseDtoFields.includes('canReverse'), 'BanglaQrResponseDto contains canReverse');

console.log('\n--- Test Suite 5: Authentic Bengali Strings in resources.arsc ---');
const arscBuf = readZipEntry(apkPath, 'resources.arsc');
const spOff = arscBuf.readUInt16LE(2);
const arscStrCount = arscBuf.readUInt32LE(spOff + 8);
const arscFlags = arscBuf.readUInt32LE(spOff + 16);
const arscIsUtf8 = (arscFlags & (1 << 8)) !== 0;
const arscStringsStart = spOff + arscBuf.readUInt32LE(spOff + 20);

const arscStrings = new Set();
for (let i = 0; i < arscStrCount; i++) {
  const strOffset = arscStringsStart + arscBuf.readUInt32LE(spOff + 28 + i * 4);
  if (arscIsUtf8) {
    let len = arscBuf[strOffset];
    if (len & 0x80) len = ((len & 0x7f) << 8) | arscBuf[strOffset + 1];
    let bLenOffset = (arscBuf[strOffset] & 0x80) ? strOffset + 2 : strOffset + 1;
    let bLen = arscBuf[bLenOffset];
    if (bLen & 0x80) bLen = ((bLen & 0x7f) << 8) | arscBuf[bLenOffset + 1];
    let dataOffset = (arscBuf[bLenOffset] & 0x80) ? bLenOffset + 2 : bLenOffset + 1;
    arscStrings.add(arscBuf.toString('utf8', dataOffset, dataOffset + bLen));
  } else {
    let len = arscBuf.readUInt16LE(strOffset);
    let dataOffset = strOffset + 2;
    if (len & 0x8000) {
      len = ((len & 0x7fff) << 16) | arscBuf.readUInt16LE(strOffset + 2);
      dataOffset += 2;
    }
    arscStrings.add(arscBuf.toString('utf16le', dataOffset, dataOffset + len * 2));
  }
}

assert(arscStrings.has('বাংলা QR কোড') || arscStrings.has('QR কোড'), 'resources.arsc contains authentic QR title');
assert(arscStrings.has('বাংলা QR পেমেন্ট'), 'resources.arsc contains "বাংলা QR পেমেন্ট"');
assert(arscStrings.has('সব বাংলা QR অ্যাপ'), 'resources.arsc contains "সব বাংলা QR অ্যাপ"');
assert(arscStrings.has('QR কোড দিয়ে এক কোডেই পেমেন্ট নিন বিকাশ, রকেট ও সকল ব্যাংক অ্যাপ থেকে।'), 'resources.arsc contains universal QR description');
assert(arscStrings.has('QR কোড ডাউনলোড'), 'resources.arsc contains "QR কোড ডাউনলোড"');
assert(arscStrings.has('QR ডাউনলোড সফল হয়েছে।'), 'resources.arsc contains "QR ডাউনলোড সফল হয়েছে।"');
assert(arscStrings.has('পেমেন্ট সফল হয়েছে।'), 'resources.arsc contains "পেমেন্ট সফল হয়েছে।"');
assert(Array.from(arscStrings).some(s => s.includes('QR কোড ব্যালেন্স')), 'resources.arsc contains "QR কোড ব্যালেন্স"');

console.log('\n================================================================');
console.log(`  ALL ${totalTests} REFERENCE TESTS PASSED WITH 100% SUCCESS RATE`);
console.log('================================================================\n');
