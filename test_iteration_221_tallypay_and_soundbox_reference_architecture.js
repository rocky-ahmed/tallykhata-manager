/**
 * test_iteration_221_tallypay_and_soundbox_reference_architecture.js
 *
 * REA-ITER-221: TALLYPAY ADD MONEY, TRANSACTION LIMITS & SOUNDBOX REFERENCE ARCHITECTURE
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-221
 * Target Binary: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 * SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9
 */

const fs = require('fs');
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
console.log('  REA-ITER-221: TALLYPAY & SOUNDBOX REFERENCE ARCHITECTURE      ');
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

function getAllZipEntries(apkPath) {
  const buf = fs.readFileSync(apkPath);
  let eocdOffset = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdOffset === -1) throw new Error('EOCD not found');
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let cur = cdOffset;
  const entries = [];
  for (let i = 0; i < totalEntries; i++) {
    const fnLen = buf.readUInt16LE(cur + 28);
    const extraLen = buf.readUInt16LE(cur + 30);
    const commentLen = buf.readUInt16LE(cur + 32);
    const fn = buf.toString('utf8', cur + 46, cur + 46 + fnLen);
    entries.push(fn);
    cur += 46 + fnLen + extraLen + commentLen;
  }
  return entries;
}

const apkPath = 'D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk';

console.log('--- Test Suite 1: Reference APK Cryptographic Identity ---');
assert(fs.existsSync(apkPath), 'Reference APK exists at ' + apkPath);
const apkStat = fs.statSync(apkPath);
assert(apkStat.size === 53969511, `APK file size matches expected (53969511 === ${apkStat.size})`);
const apkSha256 = crypto.createHash('sha256').update(fs.readFileSync(apkPath)).digest('hex');
assert(apkSha256 === '267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9', 'APK SHA-256 matches expected digest');

console.log('\n--- Test Suite 2: TallyPay Layout & Vector Resources ---');
const zipEntries = getAllZipEntries(apkPath);

const requiredLayouts = [
  'res/layout/activity_add_money.xml',
  'res/layout/activity_add_money_from_bank.xml',
  'res/layout/activity_add_money_from_card.xml',
  'res/layout/activity_add_money_web_view.xml',
  'res/layout/activity_transaction_limit.xml',
  'res/layout/fragment_main_add_money.xml',
  'res/layout/fragment_transaction_limit.xml',
  'res/layout/layout_add_money_success.xml',
  'res/layout/transaction_limit_row_item.xml',
];

for (const layout of requiredLayouts) {
  assert(zipEntries.includes(layout), `Verified layout resource: ${layout}`);
}

const requiredDrawables = [
  'res/drawable/ic_add_money_large.xml',
  'res/drawable/ic_add_money_new.xml',
];

for (const drawable of requiredDrawables) {
  assert(zipEntries.includes(drawable), `Verified drawable resource: ${drawable}`);
}

console.log('\n--- Test Suite 3: DEX Bytecode Architecture & Classes ---');
const classesDexBuf = readZipEntry(apkPath, 'classes.dex');
assert(classesDexBuf !== null, 'classes.dex extracted successfully');
const classesDexStr = classesDexBuf.toString('utf8');
assert(classesDexStr.includes('Lcom/progoti/tallykhata/v2/_clean_arch/add_money/presentation/AddMoneyActivity'), 'AddMoneyActivity found in classes.dex');
assert(classesDexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/activities/addmoney/addmoneyfromNagad/AddMoneyFromNagadActivity'), 'AddMoneyFromNagadActivity found in classes.dex');
assert(classesDexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/activities/addmoney/addmoneyfromcard/AddMoneyFromCardActivity'), 'AddMoneyFromCardActivity found in classes.dex');
assert(classesDexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/activities/addmoney/addmoneyfromrocket/AddMoneyFromRocketActivity'), 'AddMoneyFromRocketActivity found in classes.dex');

const classes4DexBuf = readZipEntry(apkPath, 'classes4.dex');
assert(classes4DexBuf !== null, 'classes4.dex extracted successfully');
const classes4DexStr = classes4DexBuf.toString('utf8');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/_clean_arch/_core/domain/util/AddMoneyMethod'), 'AddMoneyMethod found in classes4.dex');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/_clean_arch/add_money/data/remote/AddMoneyTpApi'), 'AddMoneyTpApi found in classes4.dex');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/_clean_arch/add_money/data/remote/AddMoneyTpV1Api'), 'AddMoneyTpV1Api found in classes4.dex');
assert(classes4DexStr.includes('WalletRepositoryImpl$getTransactionLimitUsageDetails$2'), 'TransactionLimitUsageDetails repository method found in classes4.dex');
assert(classes4DexStr.includes('AddMoneyViewModel$getTransactionLimitUsageSummary$2'), 'AddMoneyViewModel limit summary found in classes4.dex');

console.log('\n--- Test Suite 4: ARSC Authentic Bengali Resource Strings ---');
const arscBuf = readZipEntry(apkPath, 'resources.arsc');
assert(arscBuf !== null, 'resources.arsc extracted successfully');
const arscStr = arscBuf.toString('utf8');

const expectedArscTerms = [
  'অ্যাড মানি-এর দৈনিক লিমিট অতিক্রম করছে',
  'আপনি আজ সর্বোচ্চ সংখ্যক বার অ্যাড মানি করেছেন',
  'ভিসা, মাষ্টারকার্ড বা আমেরিকান এক্সপ্রেস কার্ড থেকে অ্যাড মানি করুন',
];

for (const term of expectedArscTerms) {
  assert(arscStr.includes(term), `ARSC contains authentic copy: "${term}"`);
}

console.log('----------------------------------------------------------------');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: 0 (100% SUCCESS)`);
console.log('================================================================');
