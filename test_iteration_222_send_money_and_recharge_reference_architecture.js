/**
 * test_iteration_222_send_money_and_recharge_reference_architecture.js
 *
 * REA-ITER-222: TALLYPAY SEND MONEY & MOBILE RECHARGE REFERENCE ARCHITECTURE
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-222
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
console.log('  REA-ITER-222: SEND MONEY & RECHARGE REFERENCE ARCHITECTURE    ');
console.log('================================================================\n');

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

console.log('\n--- Test Suite 2: Send Money & Recharge Layout & Drawable Resources ---');
const zipEntries = getAllZipEntries(apkPath);

const requiredLayouts = [
  'res/layout/activity_tp_send_money.xml',
  'res/layout/activity_tp_send_money_selected_feature.xml',
  'res/layout/fragment_send_money_tp_wallet.xml',
  'res/layout/fragment_send_money_tp_wallet_input_amount.xml',
  'res/layout/fragment_send_money_tp_wallet_success.xml',
  'res/layout/activity_tp_recharge.xml',
  'res/layout/activity_recharge_execution.xml',
  'res/layout/fragment_recharge_amount.xml',
  'res/layout/fragment_recharge_confirm.xml',
  'res/layout/fragment_recharge_pin.xml',
];

for (const layout of requiredLayouts) {
  assert(zipEntries.includes(layout), `Verified layout resource: ${layout}`);
}

const requiredDrawables = [
  'res/drawable/ic_send_money_new.xml',
  'res/drawable/ic_mobile_recharge_new.xml',
  'res/drawable/selector_recharge_operator_green.xml',
];

for (const drawable of requiredDrawables) {
  assert(zipEntries.includes(drawable), `Verified drawable resource: ${drawable}`);
}

console.log('\n--- Test Suite 3: DEX Bytecode Architecture & Classes ---');
const classesDexBuf = readZipEntry(apkPath, 'classes.dex');
assert(classesDexBuf !== null, 'classes.dex extracted successfully');
const classesDexStr = classesDexBuf.toString('utf8');
assert(classesDexStr.includes('Lcom/progoti/tallykhata/v2/_clean_arch/shasroyi_send_money/presentation/SSMActivity'), 'SSMActivity found in classes.dex');
assert(classesDexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/TpSendMoneyActivity'), 'TpSendMoneyActivity found in classes.dex');
assert(classesDexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/RechargePackage'), 'RechargePackage found in classes.dex');
assert(classesDexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/fragment/RechargeAmountFragment'), 'RechargeAmountFragment found in classes.dex');

const classes4DexBuf = readZipEntry(apkPath, 'classes4.dex');
assert(classes4DexBuf !== null, 'classes4.dex extracted successfully');
const classes4DexStr = classes4DexBuf.toString('utf8');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/_clean_arch/shasroyi_send_money/data/remote/TpSSMApi'), 'TpSSMApi found in classes4.dex');
assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/tallypay/activities/recharge/TpRechargeActivity'), 'TpRechargeActivity found in classes4.dex');

console.log('\n--- Test Suite 4: ARSC Authentic Bengali Resource Strings ---');
const arscBuf = readZipEntry(apkPath, 'resources.arsc');
assert(arscBuf !== null, 'resources.arsc extracted successfully');
const arscStr = arscBuf.toString('utf8');

const expectedArscTerms = [
  'বাজারে এলো সাশ্রয়ী টালিপে সেন্ড মানি',
  'মোবাইল রিচার্জ প্রসেস করা হচ্ছে।',
  'মোবাইল রিচার্জ সফল হয়েছে।',
  'প্রিপেইড',
];

for (const term of expectedArscTerms) {
  assert(arscStr.includes(term), `ARSC contains authentic copy: "${term}"`);
}

console.log('----------------------------------------------------------------');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: 0 (100% SUCCESS)`);
console.log('================================================================');
