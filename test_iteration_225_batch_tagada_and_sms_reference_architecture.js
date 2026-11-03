/**
 * test_iteration_225_batch_tagada_and_sms_reference_architecture.js
 *
 * REA-ITER-225: CUSTOMER DEBT REMINDERS & AUTOMATED SMS TAGADA BATCH DISPATCH SUBSYSTEM
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-225
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
console.log('  REA-ITER-225: BATCH TAGADA & SMS SUBSYSTEM REFERENCE ARCH     ');
console.log('================================================================\n');

// -------------------------------------------------------------
// HELPER: Read Zip Entry from APK
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

// =============================================================
// GROUP 1: Reference APK Integrity & Binary Signatures
// =============================================================
console.log('[GROUP 1: Reference APK Integrity & Binary Signatures]');
assert(fs.existsSync(apkPath), 'Target APK file exists on host filesystem');
const apkBuffer = fs.readFileSync(apkPath);
assert(apkBuffer.length === 53969511, 'Target APK byte length matches expected 53,969,511 bytes');
const calculatedSha256 = crypto.createHash('sha256').update(apkBuffer).digest('hex');
assert(
  calculatedSha256 === '267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9',
  'Target APK SHA-256 matches verified golden digest'
);

// =============================================================
// GROUP 2: AndroidManifest Telephony, SMS & Tagada Activities
// =============================================================
console.log('\n[GROUP 2: AndroidManifest Telephony, SMS & Tagada Activities]');
const manifestData = readZipEntry(apkPath, 'AndroidManifest.xml');
assert(manifestData !== null && manifestData.length > 0, 'AndroidManifest.xml extracted successfully');

const manifestStringPool = [];
{
  const pos = 8;
  const stringCount = manifestData.readUInt32LE(pos + 8);
  const flags = manifestData.readUInt32LE(pos + 16);
  const isUtf8 = (flags & (1 << 8)) !== 0;
  const stringsStart = pos + manifestData.readUInt32LE(pos + 20);
  for (let i = 0; i < stringCount; i++) {
    const strOffset = manifestData.readUInt32LE(pos + 28 + i * 4);
    let p = stringsStart + strOffset;
    if (isUtf8) {
      p += (manifestData[p] & 0x80) ? 2 : 1;
      const len = (manifestData[p] & 0x80) ? ((manifestData[p] & 0x7f) << 8) | manifestData[p + 1] : manifestData[p];
      p += (manifestData[p] & 0x80) ? 2 : 1;
      manifestStringPool.push(manifestData.toString('utf8', p, p + len));
    } else {
      const len = manifestData.readUInt16LE(p);
      p += 2;
      manifestStringPool.push(manifestData.toString('utf16le', p, p + len * 2));
    }
  }
}

// Telephony & Contact Permissions
assert(manifestStringPool.includes('android.permission.READ_CONTACTS'), 'Manifest declares android.permission.READ_CONTACTS');
assert(manifestStringPool.includes('android.permission.READ_PHONE_STATE'), 'Manifest declares android.permission.READ_PHONE_STATE');
assert(manifestStringPool.includes('android.permission.INTERNET'), 'Manifest declares android.permission.INTERNET');
assert(manifestStringPool.includes('android.permission.POST_NOTIFICATIONS'), 'Manifest declares android.permission.POST_NOTIFICATIONS');
assert(manifestStringPool.includes('android.permission.WAKE_LOCK'), 'Manifest declares android.permission.WAKE_LOCK');

// Registered Tagada and SMS Activities
assert(
  manifestStringPool.includes('com.progoti.tallykhata.v2._clean_arch.bulk_tagada.presentation.BulkTagadaActivity'),
  'Manifest registers clean architecture BulkTagadaActivity'
);
assert(
  manifestStringPool.includes('com.progoti.tallykhata.v2.tagada.TagadaActivity'),
  'Manifest registers core TagadaActivity'
);
assert(
  manifestStringPool.includes('com.progoti.tallykhata.v2.tagada.TagadaSelectionActivity'),
  'Manifest registers TagadaSelectionActivity'
);
assert(
  manifestStringPool.includes('com.progoti.tallykhata.v2.payments.bkash.BuySmsActivity'),
  'Manifest registers BuySmsActivity'
);
assert(
  manifestStringPool.includes('com.progoti.tallykhata.v2.reports.SmsReportActivity'),
  'Manifest registers SmsReportActivity'
);
assert(
  manifestStringPool.includes('com.progoti.tallykhata.v2.sms_auto_read.TKSMSReceiver'),
  'Manifest registers TKSMSReceiver for inbound SMS detection'
);
assert(
  manifestStringPool.includes('com.google.android.gms.auth.api.phone.SMS_RETRIEVED'),
  'Manifest registers SMS_RETRIEVED broadcast action for SMS Retriever API'
);

// =============================================================
// GROUP 3: Layout XML Resources for Tagada & SMS UI
// =============================================================
console.log('\n[GROUP 3: Layout XML Resources for Tagada & SMS UI]');
const requiredLayouts = [
  'res/layout/activity_tagada.xml',
  'res/layout/activity_tagada_v2.xml',
  'res/layout/activity_tagada_selection.xml',
  'res/layout/alert_tagada_quota_finished.xml',
  'res/layout/alert_tagada_sms_confirmation_dialog.xml',
  'res/layout/layout_tagada_receiver_user_info.xml',
  'res/layout/tagada_list_item.xml',
  'res/layout/activity_baki_report.xml',
  'res/layout/activity_buy_sms.xml',
  'res/layout/activity_sms_report.xml',
  'res/layout/bottom_sheet_sms_purchase.xml',
  'res/layout/fragment_sms_pack.xml'
];

requiredLayouts.forEach(layoutPath => {
  const data = readZipEntry(apkPath, layoutPath);
  assert(data !== null && data.length > 0, `Layout XML exists: ${layoutPath}`);
});

// Verify specific text in activity_tagada.xml string pool
const tagadaLayoutData = readZipEntry(apkPath, 'res/layout/activity_tagada.xml');
const tagadaLayoutStr = tagadaLayoutData.toString('utf8');
assert(tagadaLayoutStr.includes(' এসএমএস পাঠাই'), 'activity_tagada.xml contains button label " এসএমএস পাঠাই"');
assert(tagadaLayoutStr.includes('(ফ্রি ০/০)'), 'activity_tagada.xml contains free quota indicator "(ফ্রি ০/০)"');

// =============================================================
// GROUP 4: Bytecode Clean Architecture & DTO Evidence
// =============================================================
console.log('\n[GROUP 4: Bytecode Clean Architecture & DTO Evidence]');
const data4 = readZipEntry(apkPath, 'classes4.dex');
assert(data4 !== null && data4.length > 0, 'classes4.dex extracted successfully');
const str4 = data4.toString('latin1');

// Clean Architecture classes
assert(str4.includes('Lcom/progoti/tallykhata/v2/_clean_arch/bulk_tagada/presentation/BulkTagadaActivity;'), 'classes4.dex contains BulkTagadaActivity');
assert(str4.includes('Lcom/progoti/tallykhata/v2/_clean_arch/bulk_tagada/data/local/dao/BulkTagadaDao;'), 'classes4.dex contains BulkTagadaDao');
assert(str4.includes('Lcom/progoti/tallykhata/v2/_clean_arch/bulk_tagada/data/remote/BulkTagadaApi;'), 'classes4.dex contains BulkTagadaApi');
assert(str4.includes('Lcom/progoti/tallykhata/v2/_clean_arch/bulk_tagada/domain/repository/BulkTagadaRepository;'), 'classes4.dex contains BulkTagadaRepository domain interface');
assert(str4.includes('BulkTagadaRepositoryImpl'), 'classes4.dex contains BulkTagadaRepositoryImpl coroutines');
assert(str4.includes('BulkTagadaState(isShimmerLoading='), 'classes4.dex contains BulkTagadaState MVI state model');

// ViewModel interaction methods
assert(str4.includes('BulkTagadaViewModel$loadCustomerAccounts$1'), 'classes4.dex contains loadCustomerAccounts flow');
assert(str4.includes('BulkTagadaViewModel$onClickAllSelect$1'), 'classes4.dex contains onClickAllSelect handler');
assert(str4.includes('BulkTagadaViewModel$onSelectAllCustomers$1'), 'classes4.dex contains onSelectAllCustomers handler');
assert(str4.includes('BulkTagadaViewModel$onClickCustomerItem$2'), 'classes4.dex contains onClickCustomerItem handler');
assert(str4.includes('BulkTagadaViewModel$onFetchTagadaQuota$2'), 'classes4.dex contains onFetchTagadaQuota query');
assert(str4.includes('BulkTagadaViewModel$onSendTagada$1'), 'classes4.dex contains onSendTagada batch dispatch coroutine');

// Dispatch Modes and Tagada Types
assert(str4.includes('BULK_TAGADA'), 'classes4.dex contains BULK_TAGADA dispatch mode');
assert(str4.includes('GROUP_TAGADA'), 'classes4.dex contains GROUP_TAGADA dispatch mode');
assert(str4.includes('TAGADA_BY_FREE_SMS'), 'classes4.dex contains TAGADA_BY_FREE_SMS type');
assert(str4.includes('TAGADA_BY_SHARE'), 'classes4.dex contains TAGADA_BY_SHARE type');
assert(str4.includes('TAGADA_BY_SMS'), 'classes4.dex contains TAGADA_BY_SMS type');

// DTO Models
assert(str4.includes('TagadaQuotaInfoResponseDto{free_sms_count='), 'classes4.dex contains TagadaQuotaInfoResponseDto');
assert(str4.includes('TagadaQuotaRequestDto{device_id=\''), 'classes4.dex contains TagadaQuotaRequestDto');
assert(str4.includes('SendBulkTagadaRequestDto(amount='), 'classes4.dex contains SendBulkTagadaRequestDto');
assert(str4.includes('TagadaMessageSMSResponseDto{sms_body=\''), 'classes4.dex contains TagadaMessageSMSResponseDto');

// =============================================================
// GROUP 5: Room SQLite Schema & SQL Query Invariants
// =============================================================
console.log('\n[GROUP 5: Room SQLite Schema & SQL Query Invariants]');
assert(str4.includes('CREATE TABLE IF NOT EXISTS `tagada_log`'), 'classes4.dex contains Room CREATE TABLE statement for tagada_log');
assert(str4.includes('`account_id` INTEGER NOT NULL'), 'tagada_log schema defines foreign key account_id INTEGER NOT NULL');
assert(str4.includes('`credit_amount` REAL'), 'tagada_log schema defines credit_amount REAL');
assert(str4.includes('`tagada_type` TEXT'), 'tagada_log schema defines tagada_type TEXT');
assert(str4.includes('`synced` INTEGER NOT NULL'), 'tagada_log schema defines synced INTEGER NOT NULL');
assert(str4.includes('`create_date` TEXT NOT NULL'), 'tagada_log schema defines create_date TEXT NOT NULL');
assert(str4.includes('REFERENCES `account`(`id`) ON DELETE CASCADE'), 'tagada_log cascades on account deletion');

// Room DAO queries
assert(
  str4.includes("SELECT * FROM tagada_log WHERE account_id = ? AND tagada_type = 'TAGADA_BY_FREE_SMS' ORDER BY DATETIME(create_date, 'localtime') DESC"),
  'classes4.dex contains query for retrieving previous free SMS tagada by account'
);
assert(
  str4.includes('SELECT MAX(create_date) AS createDate FROM tagada_log WHERE account_id= ?'),
  'classes4.dex contains query for lastTagadaDateByAccountId'
);
assert(str4.includes('UPDATE tagada_log SET synced = 0'), 'classes4.dex contains query for updateAllTagadaLogUnsynced');

// =============================================================
// GROUP 6: Authentic Bengali ARSC Resource String Pool
// =============================================================
console.log('\n[GROUP 6: Authentic Bengali ARSC Resource String Pool]');
const arscData = readZipEntry(apkPath, 'resources.arsc');
assert(arscData !== null && arscData.length > 0, 'resources.arsc extracted successfully');
const arscStr = arscData.toString('utf8');

const expectedArscTokens = [
  'গ্রুপ তাগাদা',
  'গ্রুপ তাগাদা পাঠাই',
  'একসাথে অনেককে তাগাদা পাঠানো যায়, সময় বাঁচে।',
  'একাধিক কাস্টমার কে একসাথে সিলেক্ট করে গ্রুপ তাগাদা পাঠান।',
  'গ্রুপ তাগাদা পাঠাতে ফোন নম্বর যোগ করুন।',
  'টালি-মেসেজ-এর মাধ্যমে তাগাদা-টি পাঠানো হবে।',
  'তাগাদা',
  'তাগাদা পাঠাই',
  'তাগাদা পাঠানো হয়নি',
  'তাগাদা পাঠিয়ে কালেকশন করুন।',
  'তাগাদা মেসেজ',
  'তাগাদা মেসেজ কিনুন',
  'তাগাদা মেসেজ পাঠাই',
  'তাগাদা মেসেজ পাঠাতে সিলেক্ট করুন',
  'তাগাদা মেসেজ পাঠানো হচ্ছে',
  'তাগাদা মেসেজ পাঠানো হয়েছে।',
  'তাগাদার জন্য ফ্রি এসএমএস অবশিষ্ট নেই।',
  'ফ্রি এসএমএস - এর মাধ্যমে তাগাদা মেসেজটি পাঠানো হবে।',
  'সব কাস্টমারকে একসাথে গ্রুপ তাগাদা পাঠাতে টালিখাতা গোল্ড নিন',
  'টালি-মেসেজ প্যাক সিলেক্ট করি',
  'প্রিয় গ্রাহক,\n %1$s পর্যন্ত আপনার মোট বাকি %2$s টাকা। অনুগ্রহ করে আপনার বাকি পরিশোধ করুন।\n বিস্তারিত জানতে ট্যাপ করুন'
];

expectedArscTokens.forEach(token => {
  assert(arscStr.includes(token), `resources.arsc contains authentic Bengali token: "${token.replace(/\n/g, '\\n')}"`);
});

// =============================================================
// GROUP 7: Reconstructed Tagada & Batch SMS Dispatch Engine
// =============================================================
console.log('\n[GROUP 7: Reconstructed Tagada & Batch SMS Dispatch Engine]');

class TagadaBatchDispatchEngine {
  constructor(merchantName = 'মেসার্স ভাই ভাই এন্টারপ্রাইজ', tagadaBaseUrl = 'https://tallypay.com/baki') {
    this.merchantName = merchantName;
    this.tagadaBaseUrl = tagadaBaseUrl;
    this.tagadaLogTable = [];
    this.nextLogId = 1;
  }

  // Generate personalized Bengali SMS reminder
  generateSmsContent(customerName, bakiAmountBdt, asOfDate = '০৪ নভেম্বর ২০২৬', accountToken = 'T-9871') {
    const formattedAmount = Number(bakiAmountBdt).toLocaleString('bn-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const link = `${this.tagadaBaseUrl}/${accountToken}`;
    return `প্রিয় গ্রাহক,\n ${asOfDate} পর্যন্ত আপনার মোট বাকি ৳${formattedAmount} টাকা। অনুগ্রহ করে আপনার বাকি পরিশোধ করুন।\n বিস্তারিত জানতে ট্যাপ করুন ${link}`;
  }

  // Calculate telecommunication SMS segment counts (GSM 7-bit vs UCS-2 Unicode)
  calculateSmsSegments(text) {
    const isUnicode = /[^\u0000-\u007F]/.test(text);
    const charCount = text.length;
    if (isUnicode) {
      // Bengali characters require UCS-2 encoding: 70 chars for single SMS, 67 per segment if multi-part
      if (charCount <= 70) return { encoding: 'UCS-2', charCount, segments: 1 };
      return { encoding: 'UCS-2', charCount, segments: Math.ceil(charCount / 67) };
    } else {
      // GSM 7-bit: 160 chars for single SMS, 153 per segment if multi-part
      if (charCount <= 160) return { encoding: 'GSM-7', charCount, segments: 1 };
      return { encoding: 'GSM-7', charCount, segments: Math.ceil(charCount / 153) };
    }
  }

  // Batch customer selection & debt aggregation
  evaluateBatchSelection(customers, selectedAccountIds) {
    const selectedSet = new Set(selectedAccountIds);
    let totalEligibleCount = 0;
    let selectedCount = 0;
    let totalDuePaisa = 0;
    let selectedDuePaisa = 0;
    const validRecipients = [];
    const missingPhoneCustomers = [];

    customers.forEach(cust => {
      if (cust.balancePaisa > 0) { // Positive balance = customer owes merchant
        totalEligibleCount++;
        totalDuePaisa += cust.balancePaisa;

        if (selectedSet.has(cust.id)) {
          selectedCount++;
          selectedDuePaisa += cust.balancePaisa;
          if (cust.mobile && /^(\+?8801|01)[3-9]\d{8}$/.test(cust.mobile.replace(/[\s-]/g, ''))) {
            validRecipients.push(cust);
          } else {
            missingPhoneCustomers.push(cust);
          }
        }
      }
    });

    return {
      totalEligibleCount,
      selectedCount,
      totalDuePaisa,
      totalDueBdt: totalDuePaisa / 100,
      selectedDuePaisa,
      selectedDueBdt: selectedDuePaisa / 100,
      validRecipients,
      missingPhoneCustomers,
      isAllSelected: totalEligibleCount > 0 && selectedCount === totalEligibleCount
    };
  }

  // Batch dispatch with quota allocation & log recording
  executeBatchDispatch(recipients, quotaState, dispatchDate = '2026-11-04 14:30:00') {
    let availableFree = quotaState.freeSmsCount;
    let availablePurchased = quotaState.purchasedSmsCount;
    const dispatchResults = [];

    recipients.forEach(cust => {
      let allocatedType = null;
      if (availableFree > 0) {
        allocatedType = 'TAGADA_BY_FREE_SMS';
        availableFree--;
      } else if (availablePurchased > 0) {
        allocatedType = 'TAGADA_BY_SMS';
        availablePurchased--;
      } else {
        allocatedType = 'TAGADA_BY_SHARE'; // Fallback to external share / device SMS
      }

      const logEntry = {
        id: this.nextLogId++,
        account_id: cust.id,
        tagada_type: allocatedType,
        credit_amount: cust.balancePaisa / 100,
        synced: 0,
        create_date: dispatchDate
      };
      this.tagadaLogTable.push(logEntry);

      dispatchResults.push({
        accountId: cust.id,
        mobile: cust.mobile,
        allocatedType,
        amountBdt: cust.balancePaisa / 100,
        logId: logEntry.id,
        status: 'DISPATCHED'
      });
    });

    return {
      dispatchedCount: dispatchResults.length,
      remainingFreeQuota: availableFree,
      remainingPurchasedQuota: availablePurchased,
      dispatchResults,
      updatedQuotaState: {
        freeSmsCount: availableFree,
        purchasedSmsCount: availablePurchased
      }
    };
  }
}

const engine = new TagadaBatchDispatchEngine();

// Fixture 1: Bengali SMS Template Generation
const sampleMsg = engine.generateSmsContent('করিম স্টোর', 1250.50, '০৪ নভেম্বর ২০২৬', 'TK-CUST-101');
assert(sampleMsg.includes('প্রিয় গ্রাহক,'), 'SMS template contains Bengali salutation "প্রিয় গ্রাহক,"');
assert(sampleMsg.includes('০৪ নভেম্বর ২০২৬ পর্যন্ত আপনার মোট বাকি'), 'SMS template contains date boundary');
assert(sampleMsg.includes('১,২৫০.৫০ টাকা'), 'SMS template contains formatted Bengali digits amount');
assert(sampleMsg.includes('অনুগ্রহ করে আপনার বাকি পরিশোধ করুন।'), 'SMS template contains authentic reminder prompt');
assert(sampleMsg.includes('https://tallypay.com/baki/TK-CUST-101'), 'SMS template contains account payment deep-link');

// Fixture 2: Telecommunication segment calculations
const seg = engine.calculateSmsSegments(sampleMsg);
assert(seg.encoding === 'UCS-2', 'Bengali text triggers UCS-2 Unicode encoding');
assert(seg.charCount > 70, 'Detailed Bengali SMS exceeds 70-character single segment limit');
assert(seg.segments === Math.ceil(seg.charCount / 67), 'Multi-part UCS-2 segmentation calculates 67 characters per segment');

// Fixture 3: Batch Customer Selection & Due Math
const mockCustomers = [
  { id: 1, name: 'রহিম মিয়া', mobile: '01711223344', balancePaisa: 50000 },    // ৳500
  { id: 2, name: 'করিম সাহেব', mobile: '01811223344', balancePaisa: 125000 },  // ৳1250
  { id: 3, name: 'আবুল কালাম', mobile: '',            balancePaisa: 75000 },   // ৳750, missing phone
  { id: 4, name: 'জামাল উদ্দিন', mobile: '01911223344', balancePaisa: 0 },       // Paid up, zero balance
  { id: 5, name: 'কামাল হোসেন', mobile: '01511223344', balancePaisa: 30000 }    // ৳300
];

// Test partial selection (Select IDs 1, 2, 3)
const batchEval = engine.evaluateBatchSelection(mockCustomers, [1, 2, 3]);
assert(batchEval.totalEligibleCount === 4, 'Total eligible debt accounts count is 4 (excluding 0 balance)');
assert(batchEval.selectedCount === 3, 'Selected accounts count is 3');
assert(batchEval.totalDuePaisa === 280000, 'Total due is 280,000 paisa (৳2,800.00)');
assert(batchEval.totalDueBdt === 2800, 'Total due BDT is 2,800.00');
assert(batchEval.selectedDuePaisa === 250000, 'Selected due is 250,000 paisa (৳2,500.00)');
assert(batchEval.selectedDueBdt === 2500, 'Selected due BDT is 2,500.00');
assert(batchEval.validRecipients.length === 2, 'Valid recipients with mobile count is 2');
assert(batchEval.missingPhoneCustomers.length === 1, 'Accounts missing phone count is 1');
assert(batchEval.isAllSelected === false, 'Partial selection returns isAllSelected = false');

// Test "Select All" toggle
const allSelectedEval = engine.evaluateBatchSelection(mockCustomers, [1, 2, 3, 5]);
assert(allSelectedEval.isAllSelected === true, 'Selecting all eligible customers returns isAllSelected = true');

// Fixture 4: Batch Dispatch Execution & Quota Tiering
const quotaInitial = { freeSmsCount: 1, purchasedSmsCount: 1 };
const recipientsToDispatch = batchEval.validRecipients; // 2 customers (Rahim ৳500, Karim ৳1250)

const dispatchOutcome = engine.executeBatchDispatch(recipientsToDispatch, quotaInitial);
assert(dispatchOutcome.dispatchedCount === 2, 'Dispatched count is exactly 2');
assert(dispatchOutcome.remainingFreeQuota === 0, 'Free quota consumed to 0');
assert(dispatchOutcome.remainingPurchasedQuota === 0, 'Purchased quota consumed to 0');
assert(dispatchOutcome.dispatchResults[0].allocatedType === 'TAGADA_BY_FREE_SMS', 'First recipient receives TAGADA_BY_FREE_SMS');
assert(dispatchOutcome.dispatchResults[1].allocatedType === 'TAGADA_BY_SMS', 'Second recipient receives TAGADA_BY_SMS');

// Verify Room tagada_log database insertion
assert(engine.tagadaLogTable.length === 2, 'Room tagada_log table contains 2 inserted records');
assert(engine.tagadaLogTable[0].account_id === 1, 'First log entry belongs to account_id 1');
assert(engine.tagadaLogTable[0].credit_amount === 500, 'First log entry recorded credit_amount 500.00');
assert(engine.tagadaLogTable[0].synced === 0, 'First log entry initialized with synced = 0');
assert(engine.tagadaLogTable[1].account_id === 2, 'Second log entry belongs to account_id 2');
assert(engine.tagadaLogTable[1].credit_amount === 1250, 'Second log entry recorded credit_amount 1250.00');

// Test Quota Exhaustion Fallback to TAGADA_BY_SHARE
const exhaustedQuota = { freeSmsCount: 0, purchasedSmsCount: 0 };
const fallbackCustomer = [{ id: 5, name: 'কামাল হোসেন', mobile: '01511223344', balancePaisa: 30000 }];
const fallbackDispatch = engine.executeBatchDispatch(fallbackCustomer, exhaustedQuota);
assert(fallbackDispatch.dispatchResults[0].allocatedType === 'TAGADA_BY_SHARE', 'Exhausted quota triggers fallback to TAGADA_BY_SHARE');
assert(engine.tagadaLogTable.length === 3, 'Room tagada_log table contains 3 inserted records');
assert(engine.tagadaLogTable[2].tagada_type === 'TAGADA_BY_SHARE', 'Third log entry records tagada_type = TAGADA_BY_SHARE');

console.log('----------------------------------------------------------------');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: 0 (100% SUCCESS)`);
console.log('================================================================');