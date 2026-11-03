/**
 * test_iteration_225_batch_tagada_backend.js
 *
 * Automated Backend & Business Logic Verification Suite for Milestone REA-ITER-225
 * Customer Debt Reminders & Automated SMS Tagada Batch Dispatch Subsystem
 *
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic Architect)
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 * Milestone: REA-ITER-225
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
  TAGADA_CHANNELS,
  DISPATCH_MODES,
  DEBT_AGING_TIERS,
  TELECOM_LIMITS,
  BENGALI_ARSC_TOKENS,
  toBengaliNumerals,
  formatBengaliCurrency,
  formatBengaliDate,
  isValidBangladeshiMobile,
  calculateSmsSegments,
  generateSmsContent,
  evaluateBatchSelection,
  categorizeDebtAging,
  sortDebtorsByPriority,
  TagadaBatchDispatchEngine,
  batchTagadaEngine,
} = require('./src/batchTagadaService');

const {
  StorageRepository,
  createDefaultState,
  logTagadaBatch,
  getTagadaLogsByAccount,
  getLastTagadaDateByAccount,
  getTagadaQuota,
  setTagadaQuota,
  recordTagadaQuotaPurchase,
  getDebtAgingReport,
  batchTagadaService,
} = require('./src/storageRepository');

let totalTests = 0;
let passedTests = 0;
const testQueue = [];

function runTest(name, fn) {
  testQueue.push({ name, fn, isAsync: false });
}

function runAsyncTest(name, fn) {
  testQueue.push({ name, fn, isAsync: true });
}

console.log('================================================================================');
console.log('TALLYKHATA ITERATION 225: BATCH TAGADA & SMS DEBT REMINDER BACKEND SUITE');
console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
console.log('Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895');
console.log('Milestone: REA-ITER-225');
console.log('================================================================================\n');
// -----------------------------------------------------------------------------
// 1. Constants, Channels, Enums & Authentic Bengali ARSC Tokens
// -----------------------------------------------------------------------------
runTest('1.1: TAGADA_CHANNELS enum conforms to Room SQLite schema & APK bytecode', () => {
  assert.strictEqual(TAGADA_CHANNELS.FREE_SMS, 'TAGADA_BY_FREE_SMS');
  assert.strictEqual(TAGADA_CHANNELS.SMS, 'TAGADA_BY_SMS');
  assert.strictEqual(TAGADA_CHANNELS.SHARE, 'TAGADA_BY_SHARE');
  assert.strictEqual(Object.isFrozen(TAGADA_CHANNELS), true);
});

runTest('1.2: DISPATCH_MODES enum conforms to MVI BulkTagadaState', () => {
  assert.strictEqual(DISPATCH_MODES.BULK_TAGADA, 'BULK_TAGADA');
  assert.strictEqual(DISPATCH_MODES.GROUP_TAGADA, 'GROUP_TAGADA');
  assert.strictEqual(Object.isFrozen(DISPATCH_MODES), true);
});

runTest('1.3: DEBT_AGING_TIERS enum matches standard accounting intervals', () => {
  assert.strictEqual(DEBT_AGING_TIERS.TIER_0_15, '0_15_DAYS');
  assert.strictEqual(DEBT_AGING_TIERS.TIER_16_30, '16_30_DAYS');
  assert.strictEqual(DEBT_AGING_TIERS.TIER_31_60, '31_60_DAYS');
  assert.strictEqual(DEBT_AGING_TIERS.TIER_60_PLUS, '60_PLUS_DAYS');
  assert.strictEqual(Object.isFrozen(DEBT_AGING_TIERS), true);
});

runTest('1.4: TELECOM_LIMITS match GSM-7 and UCS-2 telecom specifications', () => {
  assert.strictEqual(TELECOM_LIMITS.UCS2_SINGLE, 70);
  assert.strictEqual(TELECOM_LIMITS.UCS2_MULTIPART, 67);
  assert.strictEqual(TELECOM_LIMITS.GSM7_SINGLE, 160);
  assert.strictEqual(TELECOM_LIMITS.GSM7_MULTIPART, 153);
  assert.strictEqual(Object.isFrozen(TELECOM_LIMITS), true);
});

runTest('1.5: Authentic Bengali ARSC tokens match reference resources.arsc', () => {
  assert.strictEqual(BENGALI_ARSC_TOKENS.GROUP_TAGADA, 'গ্রুপ তাগাদা');
  assert.strictEqual(BENGALI_ARSC_TOKENS.SEND_GROUP_TAGADA, 'গ্রুপ তাগাদা পাঠাই');
  assert.strictEqual(BENGALI_ARSC_TOKENS.TAGADA, 'তাগাদা');
  assert.strictEqual(BENGALI_ARSC_TOKENS.TAGADA_MESSAGE, 'তাগাদা মেসেজ');
  assert.strictEqual(BENGALI_ARSC_TOKENS.BUY_TAGADA_MESSAGE, 'তাগাদা মেসেজ কিনুন');
  assert.strictEqual(BENGALI_ARSC_TOKENS.NO_FREE_SMS_LEFT, 'তাগাদার জন্য ফ্রি এসএমএস অবশিষ্ট নেই।');
  assert.strictEqual(BENGALI_ARSC_TOKENS.VIA_FREE_SMS, 'ফ্রি এসএমএস - এর মাধ্যমে তাগাদা মেসেজটি পাঠানো হবে।');
  assert.strictEqual(BENGALI_ARSC_TOKENS.GOLD_UPGRADE_PROMPT, 'সব কাস্টমারকে একসাথে গ্রুপ তাগাদা পাঠাতে টালিখাতা গোল্ড নিন');
  assert.ok(BENGALI_ARSC_TOKENS.SMS_TEMPLATE.includes('প্রিয় গ্রাহক'));
  assert.ok(BENGALI_ARSC_TOKENS.SMS_TEMPLATE.includes('আপনার মোট বাকি'));
});

// -----------------------------------------------------------------------------
// 2. Localization, Formatters, Phone Validation & Telecom Segmentation Math
// -----------------------------------------------------------------------------
runTest('2.1: toBengaliNumerals converts ASCII numbers to localized Bengali numerals', () => {
  assert.strictEqual(toBengaliNumerals(0), '০');
  assert.strictEqual(toBengaliNumerals(1234567890), '১২৩৪৫৬৭৮৯০');
  assert.strictEqual(toBengaliNumerals('৳ 1,500.50'), '৳ ১,৫০০.৫০');
  assert.strictEqual(toBengaliNumerals(null), '');
  assert.strictEqual(toBengaliNumerals(undefined), '');
});

runTest('2.2: formatBengaliCurrency formats South Asian comma grouping and decimals', () => {
  const formatted = formatBengaliCurrency(1234567.89);
  assert.ok(formatted.includes('১২,৩৪,৫৬৭.৮৯') || formatted.includes('১২৩৪৫৬৭.৮৯'));
  const zeroFormatted = formatBengaliCurrency(0);
  assert.ok(zeroFormatted.includes('০.০০'));
  const simple = formatBengaliCurrency(500);
  assert.ok(simple.includes('৫০০.০০'));
});

runTest('2.3: formatBengaliDate formats Date objects & ISO strings to Bengali text', () => {
  const d = new Date(2026, 10, 4); // Nov 4, 2026
  const formatted = formatBengaliDate(d);
  assert.ok(formatted.includes('০৪'));
  assert.ok(formatted.includes('নভেম্বর'));
  assert.ok(formatted.includes('২০২৬'));

  const fromIso = formatBengaliDate('2026-11-04T12:00:00.000Z');
  assert.ok(fromIso.includes('০৪'));
  assert.ok(fromIso.includes('নভেম্বর'));
  assert.ok(fromIso.includes('২০২৬'));
});

runTest('2.4: isValidBangladeshiMobile validates BD phone formats correctly', () => {
  // Valid formats
  assert.strictEqual(isValidBangladeshiMobile('01712345678'), true);
  assert.strictEqual(isValidBangladeshiMobile('+8801812345678'), true);
  assert.strictEqual(isValidBangladeshiMobile('8801912345678'), true);
  assert.strictEqual(isValidBangladeshiMobile('01312345678'), true);
  assert.strictEqual(isValidBangladeshiMobile('01412345678'), true);
  assert.strictEqual(isValidBangladeshiMobile('01512345678'), true);
  assert.strictEqual(isValidBangladeshiMobile('01612345678'), true);
  assert.strictEqual(isValidBangladeshiMobile('017-1234-5678'), true);
  assert.strictEqual(isValidBangladeshiMobile('+880 1812-345678'), true);

  // Invalid formats
  assert.strictEqual(isValidBangladeshiMobile(''), false);
  assert.strictEqual(isValidBangladeshiMobile(null), false);
  assert.strictEqual(isValidBangladeshiMobile('01012345678'), false);
  assert.strictEqual(isValidBangladeshiMobile('01112345678'), false);
  assert.strictEqual(isValidBangladeshiMobile('01212345678'), false);
  assert.strictEqual(isValidBangladeshiMobile('0171234567'), false);
  assert.strictEqual(isValidBangladeshiMobile('017123456789'), false);
  assert.strictEqual(isValidBangladeshiMobile('0171234567a'), false);
});

runTest('2.5: calculateSmsSegments calculates GSM-7 vs UCS-2 Unicode segments', () => {
  // ASCII / GSM-7 tests
  const asciiShort = 'Payment reminder: Please pay 500 BDT';
  const segAsciiShort = calculateSmsSegments(asciiShort);
  assert.strictEqual(segAsciiShort.encoding, 'GSM-7');
  assert.strictEqual(segAsciiShort.segments, 1);

  const asciiLong = 'A'.repeat(161);
  const segAsciiLong = calculateSmsSegments(asciiLong);
  assert.strictEqual(segAsciiLong.encoding, 'GSM-7');
  assert.strictEqual(segAsciiLong.segments, 2);

  // Unicode / UCS-2 tests (Bengali)
  const ucs2Short = 'প্রিয় গ্রাহক';
  const segUcs2Short = calculateSmsSegments(ucs2Short);
  assert.strictEqual(segUcs2Short.encoding, 'UCS-2');
  assert.strictEqual(segUcs2Short.segments, 1);

  const ucs2Boundary = 'ক'.repeat(70);
  const segUcs2Boundary = calculateSmsSegments(ucs2Boundary);
  assert.strictEqual(segUcs2Boundary.encoding, 'UCS-2');
  assert.strictEqual(segUcs2Boundary.segments, 1);

  const ucs2Multi = 'ক'.repeat(71);
  const segUcs2Multi = calculateSmsSegments(ucs2Multi);
  assert.strictEqual(segUcs2Multi.encoding, 'UCS-2');
  assert.strictEqual(segUcs2Multi.segments, 2);

  const ucs2ThreeSeg = 'ক'.repeat(135);
  const segUcs2ThreeSeg = calculateSmsSegments(ucs2ThreeSeg);
  assert.strictEqual(segUcs2ThreeSeg.encoding, 'UCS-2');
  assert.strictEqual(segUcs2ThreeSeg.segments, 3);
});

runTest('2.6: generateSmsContent compiles authentic personalized reminder template', () => {
  const content = generateSmsContent('রহিম ট্রেডার্স', 1500.50, '০৪ নভেম্বর ২০২৬', 'TK-1001');
  assert.ok(content.includes('প্রিয় গ্রাহক,'));
  assert.ok(content.includes('০৪ নভেম্বর ২০২৬ পর্যন্ত আপনার মোট বাকি'));
  assert.ok(content.includes('অনুগ্রহ করে আপনার বাকি পরিশোধ করুন।'));
  assert.ok(content.includes('বিস্তারিত জানতে ট্যাপ করুন https://tallypay.com/baki/TK-1001'));
});
// -----------------------------------------------------------------------------
// 3. Debtor Aging, Priority Sorting & Batch Selection Evaluation
// -----------------------------------------------------------------------------
runTest('3.1: evaluateBatchSelection filters debtors and computes paisa debt totals', () => {
  const mockCustomers = [
    { id: '1', name: 'Alim', balance: 500, mobile: '01711111111' },
    { id: '2', name: 'Basir', balance: 1250, mobile: '01822222222' },
    { id: '3', name: 'Chowdhury', balance: 750, mobile: '' },
    { id: '4', name: 'Dalim', balance: 300, mobile: 'invalid-phone' },
    { id: '5', name: 'Zero Balance', balance: 0, mobile: '01933333333' },
    { id: '6', name: 'Supplier Advance', balance: -200, mobile: '01644444444' },
  ];

  // Partial selection: select 1, 2, 3
  const eval1 = evaluateBatchSelection(mockCustomers, ['1', '2', '3']);
  assert.strictEqual(eval1.totalEligibleCount, 4);
  assert.strictEqual(eval1.selectedCount, 3);
  assert.strictEqual(eval1.totalDuePaisa, 280000);
  assert.strictEqual(eval1.totalDueBdt, 2800.00);
  assert.strictEqual(eval1.selectedDuePaisa, 250000);
  assert.strictEqual(eval1.selectedDueBdt, 2500.00);
  assert.strictEqual(eval1.validRecipients.length, 2);
  assert.strictEqual(eval1.missingPhoneCustomers.length, 1);
  assert.strictEqual(eval1.isAllSelected, false);

  // Select all 4 eligible customers
  const evalAll = evaluateBatchSelection(mockCustomers, ['1', '2', '3', '4']);
  assert.strictEqual(evalAll.selectedCount, 4);
  assert.strictEqual(evalAll.isAllSelected, true);
  assert.strictEqual(evalAll.validRecipients.length, 2);
  assert.strictEqual(evalAll.missingPhoneCustomers.length, 2);
});

runTest('3.2: categorizeDebtAging correctly buckets debtors into aging tiers', () => {
  const asOf = new Date('2026-11-04T12:00:00.000Z');
  const customers = [
    { id: '1', balance: 500, lastTxnDate: '2026-11-01T00:00:00.000Z' },
    { id: '2', balance: 800, lastTxnDate: '2026-10-18T00:00:00.000Z' },
    { id: '3', balance: 1200, lastTxnDate: '2026-09-20T00:00:00.000Z' },
    { id: '4', balance: 2500, lastTxnDate: '2026-08-01T00:00:00.000Z' },
    { id: '5', balance: 0, lastTxnDate: '2026-08-01T00:00:00.000Z' },
  ];

  const report = categorizeDebtAging(customers, asOf);
  assert.strictEqual(report['0_15_DAYS'].count, 1);
  assert.strictEqual(report['0_15_DAYS'].totalPaisa, 50000);
  assert.strictEqual(report['16_30_DAYS'].count, 1);
  assert.strictEqual(report['16_30_DAYS'].totalPaisa, 80000);
  assert.strictEqual(report['31_60_DAYS'].count, 1);
  assert.strictEqual(report['31_60_DAYS'].totalPaisa, 120000);
  assert.strictEqual(report['60_PLUS_DAYS'].count, 1);
  assert.strictEqual(report['60_PLUS_DAYS'].totalPaisa, 250000);
});

runTest('3.3: sortDebtorsByPriority sorts by balance, aging, last tagada, and name', () => {
  const list = [
    { id: '1', name: 'রহিম', balance: 500, lastTxnDate: '2026-11-01', lastTagadaDate: '2026-10-30' },
    { id: '2', name: 'করিম', balance: 2000, lastTxnDate: '2026-09-01', lastTagadaDate: null },
    { id: '3', name: 'জসিম', balance: 1200, lastTxnDate: '2026-10-15', lastTagadaDate: '2026-10-25' },
  ];

  const byBalDesc = sortDebtorsByPriority(list, 'balance_desc');
  assert.strictEqual(byBalDesc[0].id, '2');
  assert.strictEqual(byBalDesc[1].id, '3');
  assert.strictEqual(byBalDesc[2].id, '1');

  const byBalAsc = sortDebtorsByPriority(list, 'balance_asc');
  assert.strictEqual(byBalAsc[0].id, '1');
  assert.strictEqual(byBalAsc[2].id, '2');

  const byAging = sortDebtorsByPriority(list, 'aging_desc');
  assert.strictEqual(byAging[0].id, '2');

  const byTagada = sortDebtorsByPriority(list, 'last_tagada_asc');
  assert.strictEqual(byTagada[0].id, '2');
});

// -----------------------------------------------------------------------------
// 4. TagadaBatchDispatchEngine Core Dispatch & Quota Waterfall
// -----------------------------------------------------------------------------
runTest('4.1: TagadaBatchDispatchEngine executes waterfall: FREE_SMS -> SMS -> SHARE', () => {
  const engine = new TagadaBatchDispatchEngine();
  const quota = { freeSmsCount: 1, purchasedSmsCount: 1 };
  const recipients = [
    { id: 101, balance: 500, mobile: '01711111111' },
    { id: 102, balance: 1200, mobile: '01822222222' },
    { id: 103, balance: 800, mobile: '01933333333' },
  ];

  const res = engine.executeBatchDispatch(recipients, quota, '2026-11-04 14:30:00', { businessId: '1' });
  assert.strictEqual(res.dispatchedCount, 3);
  assert.strictEqual(res.remainingFreeQuota, 0);
  assert.strictEqual(res.remainingPurchasedQuota, 0);

  assert.strictEqual(res.dispatchResults[0].allocatedType, TAGADA_CHANNELS.FREE_SMS);
  assert.strictEqual(res.dispatchResults[1].allocatedType, TAGADA_CHANNELS.SMS);
  assert.strictEqual(res.dispatchResults[2].allocatedType, TAGADA_CHANNELS.SHARE);

  assert.strictEqual(engine.tagadaLogTable.length, 3);
  const log1 = engine.tagadaLogTable[0];
  assert.strictEqual(log1.account_id, 101);
  assert.strictEqual(log1.credit_amount, 500);
  assert.strictEqual(log1.tagada_type, TAGADA_CHANNELS.FREE_SMS);
  assert.strictEqual(log1.synced, 0);
  assert.strictEqual(log1.create_date, '2026-11-04 14:30:00');
  assert.strictEqual(log1.business_id, '1');
});
// -----------------------------------------------------------------------------
// 5. StorageRepository Batch Logging & Account Queries
// -----------------------------------------------------------------------------
runAsyncTest('5.1: StorageRepository.logTagadaBatch inserts records with Room SQLite schema', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  const batch = [
    { account_id: 1001, credit_amount: 350.50, tagada_type: 'TAGADA_BY_FREE_SMS', create_date: '2026-11-04T10:00:00.000Z' },
    { accountId: '1002', creditAmount: 720.00, tagadaType: 'TAGADA_BY_SMS', createDate: '2026-11-04T10:05:00.000Z' },
  ];

  const res = await repo.logTagadaBatch('1', batch);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.count, 2);
  assert.strictEqual(res.records.length, 2);

  const r1 = res.records[0];
  assert.strictEqual(r1.account_id, 1001);
  assert.strictEqual(r1.credit_amount, 350.50);
  assert.strictEqual(r1.tagada_type, 'TAGADA_BY_FREE_SMS');
  assert.strictEqual(r1.synced, 0);
  assert.strictEqual(r1.businessId, '1');

  const r2 = res.records[1];
  assert.strictEqual(r2.account_id, 1002);
  assert.strictEqual(r2.credit_amount, 720.00);
  assert.strictEqual(r2.tagada_type, 'TAGADA_BY_SMS');
  assert.strictEqual(r2.businessId, '1');
});

runAsyncTest('5.2: getTagadaLogsByAccount queries logs sorted descending by create_date', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  await repo.logTagadaBatch('1', [
    { account_id: 2001, credit_amount: 500, tagada_type: 'TAGADA_BY_FREE_SMS', create_date: '2026-11-01T10:00:00.000Z' },
    { account_id: 2001, credit_amount: 500, tagada_type: 'TAGADA_BY_SMS', create_date: '2026-11-03T12:00:00.000Z' },
    { account_id: 2001, credit_amount: 500, tagada_type: 'TAGADA_BY_FREE_SMS', create_date: '2026-11-02T11:00:00.000Z' },
  ]);

  const logs = repo.getTagadaLogsByAccount('1', 2001);
  assert.strictEqual(logs.length, 3);
  // Descending order: Nov 3 -> Nov 2 -> Nov 1
  assert.strictEqual(logs[0].create_date, '2026-11-03T12:00:00.000Z');
  assert.strictEqual(logs[1].create_date, '2026-11-02T11:00:00.000Z');
  assert.strictEqual(logs[2].create_date, '2026-11-01T10:00:00.000Z');
});

runAsyncTest('5.3: getLastTagadaDateByAccount returns newest date or null', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  const noDate = repo.getLastTagadaDateByAccount('1', 9999);
  assert.strictEqual(noDate, null);

  await repo.logTagadaBatch('1', [
    { account_id: 3001, credit_amount: 400, create_date: '2026-10-20T08:00:00.000Z' },
    { account_id: 3001, credit_amount: 400, create_date: '2026-11-04T15:30:00.000Z' },
  ]);

  const latestDate = repo.getLastTagadaDateByAccount('1', 3001);
  assert.strictEqual(latestDate, '2026-11-04T15:30:00.000Z');
});

runAsyncTest('5.4: getDebtAgingReport compiles debt aging report from stored accounts', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  await repo.mutateStore((s) => ({
    ...s,
    accounts: [
      { id: 4001, type: 1, balance: 1000, lastTxnDate: '2026-11-02T00:00:00.000Z', businessId: '1' },
      { id: 4002, type: 1, balance: 2500, lastTxnDate: '2026-10-10T00:00:00.000Z', businessId: '1' },
      { id: 4003, type: 2, balance: 1500, lastTxnDate: '2026-10-10T00:00:00.000Z', businessId: '1' },
    ]
  }));

  const asOf = new Date('2026-11-04T12:00:00.000Z');
  const report = repo.getDebtAgingReport('1', asOf);
  assert.strictEqual(report['0_15_DAYS'].count, 1);
  assert.strictEqual(report['16_30_DAYS'].count, 1);
});

// -----------------------------------------------------------------------------
// 6. StorageRepository Multi-Tenant Quota Management
// -----------------------------------------------------------------------------
runAsyncTest('6.1: getTagadaQuota returns default and business quotas accurately', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  const q1 = repo.getTagadaQuota('1');
  assert.strictEqual(q1.freeSmsCount, 5);
  assert.strictEqual(q1.purchasedSmsCount, 50);
  assert.strictEqual(q1.remainingSmsCount, 5);
  assert.strictEqual(q1.tallyMessageBalance, 50);
  assert.strictEqual(q1.businessId, '1');

  // Business without custom quota defaults cleanly
  const qNew = repo.getTagadaQuota('business_unknown');
  assert.strictEqual(qNew.freeSmsCount, 5);
  assert.strictEqual(qNew.purchasedSmsCount, 50);
});

runAsyncTest('6.2: setTagadaQuota updates target business and syncs active business', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  // Update active business ('1')
  const res1 = await repo.setTagadaQuota('1', { freeSmsCount: 10, purchasedSmsCount: 75 });
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.quota.freeSmsCount, 10);
  assert.strictEqual(res1.quota.purchasedSmsCount, 75);
  assert.strictEqual(repo.getTagadaQuota('1').freeSmsCount, 10);
  assert.strictEqual(repo.currentStore.remainingSmsCount, 10);
  assert.strictEqual(repo.currentStore.tallyMessageBalance, 75);

  // Update inactive business ('2') without polluting business '1'
  await repo.setTagadaQuota('2', { freeSmsCount: 3, purchasedSmsCount: 20 });
  assert.strictEqual(repo.getTagadaQuota('2').freeSmsCount, 3);
  assert.strictEqual(repo.getTagadaQuota('2').purchasedSmsCount, 20);
  // Business '1' remains untouched
  assert.strictEqual(repo.getTagadaQuota('1').freeSmsCount, 10);
  assert.strictEqual(repo.currentStore.remainingSmsCount, 10);
});

runAsyncTest('6.3: recordTagadaQuotaPurchase increments purchased SMS pack balance', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  const initial = repo.getTagadaQuota('1').purchasedSmsCount;
  const res = await repo.recordTagadaQuotaPurchase('1', { smsCount: 100, price: 200, packId: 'pack_100' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.addedCount, 100);
  assert.strictEqual(res.quota.purchasedSmsCount, initial + 100);
  assert.strictEqual(repo.getTagadaQuota('1').purchasedSmsCount, initial + 100);

  // Invalid pack counts rejected gracefully
  const invalidRes = await repo.recordTagadaQuotaPurchase('1', { smsCount: 0 });
  assert.strictEqual(invalidRes.success, false);
  assert.strictEqual(invalidRes.error, 'INVALID_PACK_SMS_COUNT');
});

runAsyncTest('6.4: adjustTagadaQuota adjusts SMS quota within [0, maxQuota] limits', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  // Start with 5, add 10 -> 15
  const r1 = await repo.adjustTagadaQuota(10);
  assert.strictEqual(r1.success, true);
  assert.strictEqual(r1.remainingSmsCount, 15);

  // Deduct 20 -> clamps to 0
  const r2 = await repo.adjustTagadaQuota(-20);
  assert.strictEqual(r2.remainingSmsCount, 0);

  // Add 150 -> clamps to maxQuota (100)
  const r3 = await repo.adjustTagadaQuota(150, { maxQuota: 100 });
  assert.strictEqual(r3.remainingSmsCount, 100);
});
// -----------------------------------------------------------------------------
// 7. Multi-Tenant Business Isolation, Cascading Deletions & Account Lifecycle
// -----------------------------------------------------------------------------
runAsyncTest('7.1: Multi-tenant isolation: identical account IDs in different businesses never collide', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  // Log reminder for account 501 in Business 1
  await repo.logTagadaBatch('1', [
    { account_id: 501, credit_amount: 1000, tagada_type: 'TAGADA_BY_FREE_SMS', create_date: '2026-11-04T10:00:00.000Z' }
  ]);

  // Log reminder for account 501 in Business 2
  await repo.logTagadaBatch('2', [
    { account_id: 501, credit_amount: 2500, tagada_type: 'TAGADA_BY_SMS', create_date: '2026-11-04T11:00:00.000Z' }
  ]);

  const b1Logs = repo.getTagadaLogsByAccount('1', 501);
  const b2Logs = repo.getTagadaLogsByAccount('2', 501);

  assert.strictEqual(b1Logs.length, 1);
  assert.strictEqual(b1Logs[0].credit_amount, 1000);
  assert.strictEqual(b1Logs[0].tagada_type, 'TAGADA_BY_FREE_SMS');

  assert.strictEqual(b2Logs.length, 1);
  assert.strictEqual(b2Logs[0].credit_amount, 2500);
  assert.strictEqual(b2Logs[0].tagada_type, 'TAGADA_BY_SMS');
});

runAsyncTest('7.2: deleteAccountCascade purges tagada_log records for target account only', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  await repo.mutateStore((s) => ({
    ...s,
    accounts: [
      { id: 601, name: 'Customer 601', businessId: '1' },
      { id: 602, name: 'Customer 602', businessId: '1' }
    ]
  }));

  await repo.logTagadaBatch('1', [
    { account_id: 601, credit_amount: 500, tagada_type: 'TAGADA_BY_FREE_SMS' },
    { account_id: 602, credit_amount: 800, tagada_type: 'TAGADA_BY_FREE_SMS' },
  ]);

  assert.strictEqual(repo.getTagadaLogsByAccount('1', 601).length, 1);
  assert.strictEqual(repo.getTagadaLogsByAccount('1', 602).length, 1);

  await repo.deleteAccountCascade(601, '1');

  assert.strictEqual(repo.getTagadaLogsByAccount('1', 601).length, 0);
  assert.strictEqual(repo.getTagadaLogsByAccount('1', 602).length, 1);
});

runAsyncTest('7.3: deleteBusinessCascade purges tagada_log and tagada_quota for deleted business', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  await repo.createBusiness({ id: '88', name: 'Temporary Business 88', isSelected: false });
  await repo.setTagadaQuota('88', { freeSmsCount: 15, purchasedSmsCount: 60 });
  await repo.logTagadaBatch('88', [
    { account_id: 701, credit_amount: 900, tagada_type: 'TAGADA_BY_FREE_SMS' }
  ]);

  assert.strictEqual(repo.getTagadaQuota('88').freeSmsCount, 15);
  assert.strictEqual(repo.getTagadaLogsByAccount('88', 701).length, 1);

  await repo.deleteBusinessCascade('88');

  assert.strictEqual(repo.getTagadaLogsByAccount('88', 701).length, 0);
  assert.strictEqual(repo.getTagadaQuota('88').freeSmsCount, 5);
  const state = repo.getAuthoritativeState();
  assert.strictEqual('88' in (state.tagada_quota || {}), false);
});

runAsyncTest('7.4: selectBusiness preserves per-business quota in tagada_quota', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  await repo.setTagadaQuota('1', { freeSmsCount: 4, purchasedSmsCount: 40 });
  await repo.setTagadaQuota('2', { freeSmsCount: 8, purchasedSmsCount: 90 });

  assert.strictEqual(repo.currentStore.remainingSmsCount, 4);

  await repo.selectBusiness('2');
  assert.strictEqual(repo.getActiveBusinessId(), '2');
  assert.strictEqual(repo.getTagadaQuota('2').freeSmsCount, 8);
  assert.strictEqual(repo.currentStore.remainingSmsCount, 8);

  await repo.selectBusiness('1');
  assert.strictEqual(repo.getActiveBusinessId(), '1');
  assert.strictEqual(repo.getTagadaQuota('1').freeSmsCount, 4);
  assert.strictEqual(repo.currentStore.remainingSmsCount, 4);
});

// -----------------------------------------------------------------------------
// 8. Cloud Backup, Token Sanitization & Full/Selective Restore
// -----------------------------------------------------------------------------
runAsyncTest('8.1: getFullBackupState includes tagada_log and tagada_quota with token sanitization', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  await repo.mutateStore((s) => ({
    ...s,
    tagada_log: [
      { id: 1, account_id: 101, credit_amount: 500, token: 'SECRET_SMS_GATEWAY_TOKEN', apiKey: 'KEY_123', pin: '1234' }
    ],
    tagada_quota: {
      '1': { freeSmsCount: 5, purchasedSmsCount: 50, apiKey: 'SECRET_API_KEY', secret: 'PASS' }
    }
  }));

  const backup = await repo.getFullBackupState();
  assert.ok(backup.tagada_log);
  assert.ok(backup.tagada_quota);

  const logEntry = backup.tagada_log[0];
  assert.strictEqual(logEntry.token, undefined);
  assert.strictEqual(logEntry.apiKey, undefined);
  assert.strictEqual(logEntry.pin, undefined);
  assert.strictEqual(logEntry.credit_amount, 500);

  const quotaEntry = backup.tagada_quota['1'];
  assert.strictEqual(quotaEntry.apiKey, undefined);
  assert.strictEqual(quotaEntry.secret, undefined);
  assert.strictEqual(quotaEntry.freeSmsCount, 5);
});

runAsyncTest('8.2: commitRestorePayload restores tagada_log and tagada_quota across tenants', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  const backupData = {
    accounts: [{ id: 801, name: 'Restored Customer', businessId: '1' }],
    journals: [],
    tagada_log: [
      { id: 991, account_id: 801, credit_amount: 600, tagada_type: 'TAGADA_BY_FREE_SMS', businessId: '1', create_date: '2026-11-04T10:00:00.000Z' }
    ],
    tagada_quota: {
      '1': { freeSmsCount: 7, purchasedSmsCount: 85, lastRefreshDate: '2026-11-04T00:00:00.000Z' }
    }
  };

  const payload = {
    data: backupData,
    manifest: { backupVersion: 1, schemaVersion: 6 }
  };

  await repo.commitRestorePayload(payload, { domains: ['all'] });

  const logs = repo.getTagadaLogsByAccount('1', 801);
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].credit_amount, 600);

  const quota = repo.getTagadaQuota('1');
  assert.strictEqual(quota.freeSmsCount, 7);
  assert.strictEqual(quota.purchasedSmsCount, 85);
});

runAsyncTest('8.3: commitRestorePayload selective business restore imports target tenant only', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  await repo.logTagadaBatch('1', [
    { account_id: 111, credit_amount: 200, tagada_type: 'TAGADA_BY_FREE_SMS' }
  ]);
  await repo.setTagadaQuota('1', { freeSmsCount: 5, purchasedSmsCount: 50 });

  const backupPayload = {
    data: {
      accounts: [{ id: 222, name: 'Biz 2 Customer', businessId: '2' }],
      journals: [],
      tagada_log: [
        { id: 992, account_id: 222, credit_amount: 1500, tagada_type: 'TAGADA_BY_SMS', businessId: '2', create_date: '2026-11-04T10:00:00.000Z' }
      ],
      tagada_quota: {
        '2': { freeSmsCount: 12, purchasedSmsCount: 95 }
      }
    },
    manifest: { backupVersion: 1, schemaVersion: 6 }
  };

  await repo.commitRestorePayload(backupPayload, { selectedBusinessId: '2' });

  assert.strictEqual(repo.getTagadaLogsByAccount('2', 222).length, 1);
  assert.strictEqual(repo.getTagadaQuota('2').freeSmsCount, 12);

  assert.strictEqual(repo.getTagadaLogsByAccount('1', 111).length, 1);
  assert.strictEqual(repo.getTagadaQuota('1').freeSmsCount, 5);
});

// -----------------------------------------------------------------------------
// 9. Performance Benchmark & High-Throughput Batch Stress
// -----------------------------------------------------------------------------
runTest('9.1: Latency benchmark: 1,000 batch selection evaluations in < 500ms (< 0.5ms/op)', () => {
  const mockDebtors = [];
  for (let i = 1; i <= 200; i++) {
    mockDebtors.push({
      id: String(i),
      name: `Debtor ${i}`,
      balance: i * 50,
      mobile: i % 10 === 0 ? '' : `01710${String(100000 + i)}`,
      lastTxnDate: new Date(Date.now() - (i % 60) * 86400000).toISOString(),
    });
  }

  const selectedIds = mockDebtors.slice(0, 100).map(d => d.id);

  const start = Date.now();
  for (let op = 0; op < 1000; op++) {
    evaluateBatchSelection(mockDebtors, selectedIds);
  }
  const durationMs = Date.now() - start;
  assert.ok(durationMs < 500, `Benchmark took ${durationMs}ms (threshold 500ms)`);
  console.log(`  -> Evaluated 1,000 debtor selections across 200 customers in ${durationMs}ms (${(durationMs / 1000).toFixed(4)}ms/op)`);
});

runAsyncTest('9.2: Batch dispatch stress: 500 records logged and queried in < 2000ms', async () => {
  const repo = new StorageRepository();
  await repo.initialize();

  const batch = [];
  for (let i = 1; i <= 500; i++) {
    batch.push({
      account_id: i,
      credit_amount: i * 10,
      tagada_type: i % 2 === 0 ? 'TAGADA_BY_FREE_SMS' : 'TAGADA_BY_SMS',
      create_date: new Date(Date.now() - i * 60000).toISOString()
    });
  }

  const start = Date.now();
  const res = await repo.logTagadaBatch('1', batch);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.count, 500);

  for (let i = 1; i <= 50; i++) {
    const logs = repo.getTagadaLogsByAccount('1', i);
    assert.strictEqual(logs.length, 1);
  }
  const durationMs = Date.now() - start;
  assert.ok(durationMs < 2000, `Benchmark took ${durationMs}ms (threshold 2000ms)`);
  console.log(`  -> Logged 500 batch reminder records and executed 50 queries in ${durationMs}ms`);
});

// -----------------------------------------------------------------------------
// Test Runner
// -----------------------------------------------------------------------------
async function runAllTests() {
  for (const t of testQueue) {
    totalTests++;
    try {
      if (t.isAsync) {
        await t.fn();
      } else {
        t.fn();
      }
      passedTests++;
      console.log(`  ✓ [PASS] ${t.name}`);
    } catch (err) {
      console.error(`  ✗ [FAIL] ${t.name}`);
      console.error(err);
      process.exit(1);
    }
  }

  console.log('\n================================================================================');
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: 0 (100% SUCCESS)`);
  console.log('================================================================================');
}

runAllTests().catch((e) => {
  console.error('Fatal test runner failure:', e);
  process.exit(1);
});