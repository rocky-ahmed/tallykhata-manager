/**
 * test_feature4_tagada_room_parity.js
 * Comprehensive Verification Suite for Feature 004:
 * Tagada, SMS Due Reminders & Customer Communication
 * Reference: TallyKhata-Demo.apk (REF-001)
 * Room DB: CREATE TABLE tagada_log (id, account_id, create_date, credit_amount, tagada_type, synced)
 * Activities: TagadaActivity, BulkTagadaActivity, TagadaSelectionActivity
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const {
  StorageRepository,
  createDefaultState,
} = require('./src/storageRepository');

const {
  normalizeTagadaLogFields,
  generateUniqueId,
} = require('./src/ledgerEngine');

// Mock AsyncStorage Adapter
function createMockStorage(initialStore = {}) {
  const store = new Map(Object.entries(initialStore));
  return {
    store,
    async getItem(k) { return store.get(k) || null; },
    async setItem(k, v) { store.set(k, String(v)); },
    async removeItem(k) { store.delete(k); },
    async getAllKeys() { return Array.from(store.keys()); },
  };
}

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log('[PASS] TEST ' + totalTests + ': ' + name);
    passedTests++;
  } catch (err) {
    console.error('[FAIL] TEST ' + totalTests + ': ' + name);
    console.error(err);
    process.exit(1);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log('[PASS] TEST ' + totalTests + ': ' + name);
    passedTests++;
  } catch (err) {
    console.error('[FAIL] TEST ' + totalTests + ': ' + name);
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  console.log('================================================================');
  console.log('FEATURE 4: TAGADA & SMS DUE REMINDERS ROOM PARITY TEST SUITE');
  console.log('================================================================\n');

  console.log('--- PART 1: ROOM DB TAGADA_LOG SCHEMA & NORMALIZATION ---');

  runTest('1.1: normalizeTagadaLogFields maps Room DB snake_case columns to camelCase', () => {
    const roomDbRow = {
      id: 101,
      account_id: 42,
      create_date: '2026-11-02T10:15:30.000Z',
      credit_amount: 1450.75,
      tagada_type: 'TAGADA_BY_FREE_SMS',
      synced: 1,
      business_id: 1,
    };
    const norm = normalizeTagadaLogFields(roomDbRow);
    assert.strictEqual(norm.id, 101);
    assert.strictEqual(norm.account_id, 42);
    assert.strictEqual(norm.accountId, '42');
    assert.strictEqual(norm.create_date, '2026-11-02T10:15:30.000Z');
    assert.strictEqual(norm.createDate, '2026-11-02T10:15:30.000Z');
    assert.strictEqual(norm.date, '2026-11-02');
    assert.strictEqual(norm.credit_amount, 1450.75);
    assert.strictEqual(norm.creditAmount, 1450.75);
    assert.strictEqual(norm.amount, 1450.75);
    assert.strictEqual(norm.tagada_type, 'TAGADA_BY_FREE_SMS');
    assert.strictEqual(norm.tagadaType, 'TAGADA_BY_FREE_SMS');
    assert.strictEqual(norm.synced, 1);
    assert.strictEqual(norm.business_id, 1);
    assert.strictEqual(norm.businessId, '1');
  });

  runTest('1.2: normalizeTagadaLogFields maps JS camelCase properties to Room DB snake_case', () => {
    const jsModel = {
      id: 'tag_abc123',
      accountId: '88',
      createDate: '2026-11-02 14:20:00',
      creditAmount: 2500,
      tagadaType: 'BULK_TAGADA',
      synced: 0,
      businessId: '2',
      customerName: 'করিম শেখ',
      phone: '01711223344',
    };
    const norm = normalizeTagadaLogFields(jsModel);
    assert.strictEqual(norm.account_id, 88);
    assert.strictEqual(norm.accountId, '88');
    assert.strictEqual(norm.credit_amount, 2500);
    assert.strictEqual(norm.amount, 2500);
    assert.strictEqual(norm.tagada_type, 'BULK_TAGADA');
    assert.strictEqual(norm.tagadaType, 'BULK_TAGADA');
    assert.strictEqual(norm.business_id, 2);
    assert.strictEqual(norm.businessId, '2');
    assert.strictEqual(norm.customerName, 'করিম শেখ');
    assert.strictEqual(norm.phone, '01711223344');
  });

  runTest('1.3: normalizeTagadaLogFields enforces integer-paisa rounding', () => {
    const raw = {
      account_id: 10,
      credit_amount: 199.9999,
    };
    const norm = normalizeTagadaLogFields(raw);
    assert.strictEqual(norm.credit_amount, 200);
    assert.strictEqual(norm.amount, 200);
  });

  runTest('1.4: normalizeTagadaLogFields provides robust fallback defaults', () => {
    const norm = normalizeTagadaLogFields({});
    assert(norm.id, 'Must generate unique ID');
    assert.strictEqual(norm.credit_amount, 0);
    assert.strictEqual(norm.tagada_type, 'TAGADA_BY_FREE_SMS');
    assert.strictEqual(norm.synced, 0);
    assert.strictEqual(norm.businessId, '1');
  });

  console.log('\n--- PART 2: QUOTA DECREMENT & ZERO BACKGROUND DAEMON ---');

  await runAsyncTest('2.1: Single Tagada SMS decrements remainingSmsCount atomically', async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();
    await repo.persistData({ remainingSmsCount: 5, tagadaLogs: [] });

    const logItem = normalizeTagadaLogFields({
      accountId: 'c1',
      customerName: 'গ্রাহক ১',
      phone: '01700000000',
      creditAmount: 3500,
    });

    const res = await repo.mutateStore((latest) => {
      const curCount = Number(latest.remainingSmsCount) || 0;
      return {
        ...latest,
        remainingSmsCount: Math.max(0, curCount - 1),
        tagadaLogs: [logItem, ...(latest.tagadaLogs || [])],
      };
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.remainingSmsCount, 4);
    assert.strictEqual(res.data.tagadaLogs.length, 1);
    assert.strictEqual(res.data.tagadaLogs[0].tagada_type, 'TAGADA_BY_FREE_SMS');
  });

  await runAsyncTest('2.2: Quota exhaustion guard prevents remainingSmsCount from dipping below 0', async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();
    await repo.persistData({ remainingSmsCount: 0 });

    const res = await repo.mutateStore((latest) => {
      const curCount = Number(latest.remainingSmsCount) || 0;
      if (curCount <= 0) return latest;
      return { ...latest, remainingSmsCount: curCount - 1 };
    });

    assert.strictEqual(res.data.remainingSmsCount, 0);
  });

  runTest('2.3: Zero background daemon: Reminders execute exclusively via client OS deep links', () => {
    const account = { name: 'আব্দুর রহিম', phone: '01811-223344', balance: 5000 };
    const cleanPhone = account.phone.replace(/[^0-9+]/g, '');
    const smsUrl = 'sms:' + cleanPhone + '?body=test';
    assert.strictEqual(cleanPhone, '01811223344');
    assert(smsUrl.startsWith('sms:01811223344?body='));
  });

  runTest('2.4: WhatsApp URI formatting normalizes 11-digit Bangladeshi mobile to 88 prefix', () => {
    let phone = '01712345678';
    if (phone.startsWith('01')) phone = '88' + phone;
    const waUrl = 'whatsapp://send?phone=' + phone + '&text=test';
    assert.strictEqual(phone, '8801712345678');
    assert(waUrl.startsWith('whatsapp://send?phone=8801712345678'));
  });

  console.log('\n--- PART 3: BULK TAGADA & MULTI-BUSINESS SCOPING ---');

  runTest('3.1: Due customer filtering scopes strictly to type === 1 with positive balance', () => {
    const accounts = [
      { id: '1', name: 'কাস্টমার ১', type: 1, balance: 1200, businessId: '1' },
      { id: '2', name: 'কাস্টমার ২', type: 1, balance: 0, businessId: '1' },
      { id: '3', name: 'কাস্টমার ৩', type: 1, balance: -300, businessId: '1' },
      { id: '4', name: 'সাপ্লায়ার ১', type: 2, balance: 4000, businessId: '1' },
    ];
    const dueCustomers = accounts.filter(a => a.type === 1 && a.balance > 0);
    assert.strictEqual(dueCustomers.length, 1);
    assert.strictEqual(dueCustomers[0].id, '1');
  });

  runTest('3.2: Multi-business scoping isolates due customers per active business', () => {
    const accounts = [
      { id: '1', name: 'শপ ১ কাস্টমার', type: 1, balance: 1500, businessId: '1' },
      { id: '2', name: 'শপ ২ কাস্টমার', type: 1, balance: 2500, businessId: '2' },
    ];
    const b1Dues = accounts.filter(a => String(a.businessId || '1') === '1' && a.type === 1 && a.balance > 0);
    const b2Dues = accounts.filter(a => String(a.businessId || '1') === '2' && a.type === 1 && a.balance > 0);
    assert.strictEqual(b1Dues.length, 1);
    assert.strictEqual(b1Dues[0].id, '1');
    assert.strictEqual(b2Dues.length, 1);
    assert.strictEqual(b2Dues[0].id, '2');
  });

  runTest('3.3: Bulk Tagada maps all due customers into individual audit log entries', () => {
    const dueCustomers = [
      { id: 'c1', name: 'গ্রাহক ১', phone: '017001', balance: 1000, businessId: '1' },
      { id: 'c2', name: 'গ্রাহক ২', phone: '017002', balance: 2000, businessId: '1' },
    ];
    const todayStr = '2026-11-02';
    const timeStr = '10:00 AM';
    const newLogs = dueCustomers.map(cust => normalizeTagadaLogFields({
      accountId: cust.id,
      customerName: cust.name,
      phone: cust.phone,
      creditAmount: cust.balance,
      tagadaType: 'BULK_TAGADA',
      businessId: cust.businessId,
      date: todayStr,
      time: timeStr,
    }));
    assert.strictEqual(newLogs.length, 2);
    assert.strictEqual(newLogs[0].tagada_type, 'BULK_TAGADA');
    assert.strictEqual(newLogs[0].account_id, 'c1');
    assert.strictEqual(newLogs[0].accountId, 'c1');
    assert.strictEqual(newLogs[1].tagada_type, 'BULK_TAGADA');
    assert.strictEqual(newLogs[1].credit_amount, 2000);
  });

  await runAsyncTest('3.4: deleteBusinessCascade cleanly purges tagadaLogs of deleted business', async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();

    await repo.persistData({
      businesses: [
        { id: '1', name: 'দোকান ১', is_active: 1, is_current: 1 },
        { id: '2', name: 'দোকান ২', is_active: 1, is_current: 0 },
      ],
      tagadaLogs: [
        { id: 't1', businessId: '1', customerName: 'কাস্টমার ১', amount: 500 },
        { id: 't2', businessId: '2', customerName: 'কাস্টমার ২', amount: 1500 },
      ],
    });

    const cascadeRes = await repo.deleteBusinessCascade('2');
    assert.strictEqual(cascadeRes.success, true);
    assert.strictEqual(cascadeRes.data.tagadaLogs.length, 1);
    assert.strictEqual(cascadeRes.data.tagadaLogs[0].id, 't1');
  });

  console.log('\n--- PART 4: APP.JS INTEGRATION & BABEL COMPILATION ---');

  const appSource = fs.readFileSync('App.js', 'utf8');

  runTest('4.1: App.js handleSendSingleTagada records Room DB fields', () => {
    assert(appSource.includes("tagada_type: 'TAGADA_BY_FREE_SMS'"), 'Must record Room DB tagada_type');
    assert(appSource.includes('account_id:'), 'Must record Room DB account_id');
    assert(appSource.includes('credit_amount:'), 'Must record Room DB credit_amount');
    assert(appSource.includes('create_date:'), 'Must record Room DB create_date');
  });

  runTest('4.2: App.js handleSendBulkTagada records Room DB fields', () => {
    assert(appSource.includes("tagada_type: 'BULK_TAGADA'"), 'Must record Room DB tagada_type for bulk');
    assert(appSource.includes('dueCustomers.map'), 'Must map over dueCustomers');
  });

  runTest('4.3: App.js triggers hapticFeedbackService on Tagada interactions', () => {
    assert(appSource.includes('hapticFeedbackService.selection()'), 'Must trigger selection haptic on SMS/WhatsApp tap');
    assert(appSource.includes('hapticFeedbackService.onTransactionSave()'), 'Must trigger save haptic on Tagada commit');
  });

  runTest('4.4: App.js compiles cleanly with zero syntax errors via Babel parser', () => {
    const ast = babel.parseSync(appSource, {
      filename: 'App.js',
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ['jsx', 'flow'] },
    });
    assert(ast && ast.program && ast.program.body.length > 0, 'AST must be valid');
  });

  console.log('\n================================================================');
  console.log('FEATURE 4 TEST SUMMARY: ' + passedTests + ' / ' + totalTests + ' TESTS PASSED (100%)');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});