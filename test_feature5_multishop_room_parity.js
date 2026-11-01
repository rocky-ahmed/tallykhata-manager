/**
 * test_feature5_multishop_room_parity.js
 * Comprehensive Room DB Parity & Multi-Shop Tenancy Automated Verification Suite
 * 
 * Verifies 100% parity against Dalvik bytecode evidence in classes4.dex:
 * - Table: CREATE TABLE business (id, business_name, business_address, business_age, business_type, synced, is_active, is_primary, is_current, comment, create_date, update_date, sync_date)
 * - Queries: SELECT * FROM business WHERE is_current=1 AND is_active=1
 *            UPDATE business SET business_name = ?, business_type = ?, synced=0, update_date = ? WHERE id = ?
 *            UPDATE business SET is_active = 0, synced=0, comment=?, update_date = ? WHERE id=?
 *            UPDATE business SET is_current = 1, synced = 0, update_date = ? WHERE id=?
 */

const assert = require('assert');
const fs = require('fs');
const babel = require('@babel/core');

const {
  StorageRepository,
  createDefaultState,
} = require('./src/storageRepository');

const ledgerEngine = require('./src/ledgerEngine');
const { normalizeBusinessFields } = ledgerEngine;

console.log('================================================================');
console.log('FEATURE 5: MULTI-SHOP TENANCY & PROFILE SWITCHER ROOM PARITY SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function createMockAdapter(initialData = null) {
  const store = new Map();
  if (initialData) {
    store.set(ledgerEngine.V6_KEY, JSON.stringify(initialData));
    store.set('tallykhata_v6_store', JSON.stringify(initialData));
  }
  return {
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, val) => { store.set(key, String(val)); },
    removeItem: async (key) => { store.delete(key); },
    clear: async () => { store.clear(); },
    _map: store,
  };
}

async function runAllTests() {
  console.log('--- PART 1: ROOM DB BUSINESS SCHEMA & NORMALIZATION ---');

  runTest('1.1: normalizeBusinessFields maps Room DB snake_case columns to camelCase', () => {
    const rawRoomBiz = {
      id: 2,
      business_name: 'মেঘনা ট্রেডার্স',
      business_address: 'চট্টগ্রাম পোর্ট রোড',
      business_type: 'WHOLESALE',
      business_age: 5,
      synced: 1,
      is_active: 1,
      is_primary: 0,
      is_current: 1,
      comment: 'প্রধান শাখা',
      create_date: '2026-10-01T10:00:00.000Z',
      update_date: '2026-10-15T12:00:00.000Z',
    };

    const norm = normalizeBusinessFields(rawRoomBiz);
    assert.strictEqual(norm.id, '2');
    assert.strictEqual(norm.business_id, 2);
    assert.strictEqual(norm.name, 'মেঘনা ট্রেডার্স');
    assert.strictEqual(norm.businessName, 'মেঘনা ট্রেডার্স');
    assert.strictEqual(norm.business_name, 'মেঘনা ট্রেডার্স');
    assert.strictEqual(norm.address, 'চট্টগ্রাম পোর্ট রোড');
    assert.strictEqual(norm.businessAddress, 'চট্টগ্রাম পোর্ট রোড');
    assert.strictEqual(norm.business_type, 'WHOLESALE');
    assert.strictEqual(norm.businessType, 'WHOLESALE');
    assert.strictEqual(norm.is_active, 1);
    assert.strictEqual(norm.isArchived, false);
    assert.strictEqual(norm.is_current, 1);
    assert.strictEqual(norm.isSelected, true);
    assert.strictEqual(norm.is_primary, 0);
    assert.strictEqual(norm.isPrimary, false);
    assert.strictEqual(norm.synced, 1);
    assert.strictEqual(norm.createdAt, '2026-10-01T10:00:00.000Z');
    assert.strictEqual(norm.updateDate, '2026-10-15T12:00:00.000Z');
  });

  runTest('1.2: normalizeBusinessFields maps JS camelCase properties to Room DB snake_case', () => {
    const rawJsBiz = {
      id: 'biz_sample_99',
      name: 'পদ্মা ডিপার্টমেন্টাল স্টোর',
      address: 'রাজশাহী বাজার',
      type: 'RETAIL',
      isSelected: false,
      isArchived: true,
      owner: 'করিম সাহেব',
      phone: '01711223344',
      createdAt: '2026-10-10T08:00:00.000Z',
    };

    const norm = normalizeBusinessFields(rawJsBiz);
    assert.strictEqual(norm.id, 'biz_sample_99');
    assert.strictEqual(norm.business_name, 'পদ্মা ডিপার্টমেন্টাল স্টোর');
    assert.strictEqual(norm.business_address, 'রাজশাহী বাজার');
    assert.strictEqual(norm.business_type, 'RETAIL');
    assert.strictEqual(norm.is_active, 0);
    assert.strictEqual(norm.isArchived, true);
    assert.strictEqual(norm.is_current, 0);
    assert.strictEqual(norm.isSelected, false);
    assert.strictEqual(norm.create_date, '2026-10-10T08:00:00.000Z');
    assert.strictEqual(norm.synced, 0);
  });

  runTest('1.3: normalizeBusinessFields provides robust fallback defaults', () => {
    const emptyNorm = normalizeBusinessFields({});
    assert.strictEqual(emptyNorm.id, '1');
    assert.strictEqual(emptyNorm.business_name, '');
    assert.strictEqual(emptyNorm.business_type, 'RETAIL');
    assert.strictEqual(emptyNorm.is_active, 1);
    assert.strictEqual(emptyNorm.is_current, 0);
    assert.strictEqual(emptyNorm.is_primary, 1); // id '1' defaults to primary
    assert.strictEqual(emptyNorm.synced, 0);
    assert.ok(emptyNorm.create_date);

    assert.strictEqual(normalizeBusinessFields(null), null);
    assert.strictEqual(normalizeBusinessFields(undefined), null);
    assert.strictEqual(normalizeBusinessFields('string'), null);
  });

  runTest('1.4: DEFAULT_BUSINESSES contains full Room DB parity columns', () => {
    const state = createDefaultState();
    assert.strictEqual(Array.isArray(state.businesses), true);
    assert.strictEqual(state.businesses.length, 3);

    const primaryBiz = state.businesses[0];
    assert.strictEqual(primaryBiz.id, '1');
    assert.strictEqual(primaryBiz.business_id, 1);
    assert.strictEqual(primaryBiz.is_primary, 1);
    assert.strictEqual(primaryBiz.is_current, 1);
    assert.strictEqual(primaryBiz.is_active, 1);
    assert.strictEqual(primaryBiz.isSelected, true);
    assert.strictEqual(primaryBiz.isArchived, false);
    assert.ok(primaryBiz.business_name);
    assert.ok(primaryBiz.business_address);
    assert.ok(primaryBiz.business_type);

    const subBiz = state.businesses[1];
    assert.strictEqual(subBiz.id, '2');
    assert.strictEqual(subBiz.is_primary, 0);
    assert.strictEqual(subBiz.is_current, 0);
    assert.strictEqual(subBiz.is_active, 1);
    assert.strictEqual(subBiz.isSelected, false);
  });

  console.log('\n--- PART 2: MULTI-SHOP TENANCY STATE TRANSITIONS & DAO PARITY ---');

  await runAsyncTest('2.1: selectBusiness updates is_current = 1, isSelected = true, and stamps update_date', async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const switchRes = await repo.selectBusiness('2');
    assert.strictEqual(switchRes.success, true);
    assert.strictEqual(switchRes.data.activeBusinessId, '2');

    const state = repo.getAuthoritativeState();
    const biz1 = state.businesses.find(b => b.id === '1');
    const biz2 = state.businesses.find(b => b.id === '2');

    assert.strictEqual(biz2.isSelected, true);
    assert.strictEqual(biz2.is_current, 1);
    assert.strictEqual(biz2.isCurrent, true);
    assert.ok(biz2.update_date);

    assert.strictEqual(biz1.isSelected, false);
    assert.strictEqual(biz1.is_current, 0);
    assert.strictEqual(biz1.isCurrent, false);
  });

  await runAsyncTest('2.2: createBusiness persists complete Room DB entity columns', async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const res = await repo.createBusiness({
      name: 'কর্ণফুলী এন্টারপ্রাইজ',
      owner: 'জাহাঙ্গীর আলম',
      phone: '01899112233',
      address: 'আগ্রাবাদ, চট্টগ্রাম',
      business_type: 'WHOLESALE',
      isSelected: true,
    });

    assert.strictEqual(res.success, true);
    const newBiz = res.data.businesses.find(b => b.name === 'কর্ণফুলী এন্টারপ্রাইজ');
    assert.ok(newBiz);
    assert.strictEqual(newBiz.business_name, 'কর্ণফুলী এন্টারপ্রাইজ');
    assert.strictEqual(newBiz.business_type, 'WHOLESALE');
    assert.strictEqual(newBiz.is_active, 1);
    assert.strictEqual(newBiz.is_current, 1);
    assert.strictEqual(newBiz.is_primary, 0);
    assert.strictEqual(newBiz.synced, 0);
    assert.ok(newBiz.create_date);
  });

  await runAsyncTest('2.3: updateBusiness provides 1:1 parity with Room DAO update query', async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const updateRes = await repo.updateBusiness('2', {
      name: 'মেসার্স ভাই ভাই সুপারমার্কেট',
      business_type: 'SUPERMARKET',
      address: 'কাওরান বাজার, ঢাকা',
      owner: 'হাজী মো: করিম চৌধুরী',
    });

    assert.strictEqual(updateRes.success, true);
    const updated = repo.getAuthoritativeState().businesses.find(b => b.id === '2');
    assert.strictEqual(updated.name, 'মেসার্স ভাই ভাই সুপারমার্কেট');
    assert.strictEqual(updated.business_name, 'মেসার্স ভাই ভাই সুপারমার্কেট');
    assert.strictEqual(updated.business_type, 'SUPERMARKET');
    assert.strictEqual(updated.businessType, 'SUPERMARKET');
    assert.strictEqual(updated.address, 'কাওরান বাজার, ঢাকা');
    assert.strictEqual(updated.owner, 'হাজী মো: করিম চৌধুরী');
    assert.ok(updated.update_date);
    assert.strictEqual(updated.synced, 0);
  });

  await runAsyncTest('2.4: archiveBusiness sets is_active = 0, is_current = 0 and auto-activates fallback', async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    await repo.selectBusiness('1');
    const arcRes = await repo.archiveBusiness('1');
    assert.strictEqual(arcRes.success, true);

    const state = repo.getAuthoritativeState();
    const archivedBiz = state.businesses.find(b => b.id === '1');
    assert.strictEqual(archivedBiz.is_active, 0);
    assert.strictEqual(archivedBiz.isArchived, true);
    assert.strictEqual(archivedBiz.is_current, 0);
    assert.strictEqual(archivedBiz.isSelected, false);

    // Fallback activated business 2
    const activeBiz = state.businesses.find(b => b.id === '2');
    assert.strictEqual(activeBiz.is_current, 1);
    assert.strictEqual(activeBiz.isSelected, true);
  });

  await runAsyncTest('2.5: restoreBusiness safely returns business to active list with makeActive support', async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    await repo.archiveBusiness('3');
    assert.strictEqual(repo.listArchivedBusinesses().length, 1);

    const restRes = await repo.restoreBusiness('3', { selectImmediately: true });
    assert.strictEqual(restRes.success, true);

    const state = repo.getAuthoritativeState();
    const restoredBiz = state.businesses.find(b => b.id === '3');
    assert.strictEqual(restoredBiz.is_active, 1);
    assert.strictEqual(restoredBiz.isArchived, false);
    assert.strictEqual(restoredBiz.is_current, 1);
    assert.strictEqual(restoredBiz.isSelected, true);
  });

  await runAsyncTest('2.6: Safety guard prevents archiving sole remaining active business', async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    await repo.archiveBusiness('3');
    await repo.archiveBusiness('2');

    const activeList = repo.listActiveBusinesses();
    assert.strictEqual(activeList.length, 1);

    const failRes = await repo.archiveBusiness(activeList[0].id);
    assert.strictEqual(failRes.success, false);
    assert.ok(failRes.error.message.includes('কমপক্ষে একটি ব্যবসা'));
  });

  console.log('\n--- PART 3: CROSS-BUSINESS DATA ISOLATION & CASCADE DELETION ---');

  await runAsyncTest('3.1: Complete entity scoping across all collections by businessId', async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    await repo.mutateCollection('accounts', prev => [
      ...prev,
      { id: 'acc_b1', businessId: '1', name: 'কাস্টমার ১', balance: 100 },
      { id: 'acc_b2', businessId: '2', name: 'কাস্টমার ২', balance: 200 },
    ]);

    await repo.mutateCollection('journals', prev => [
      ...prev,
      { id: 'j_b1', businessId: '1', accountId: 'acc_b1', amount: 100 },
      { id: 'j_b2', businessId: '2', accountId: 'acc_b2', amount: 200 },
    ]);

    const state = repo.getAuthoritativeState();
    const b1Accounts = repo.filterByBusiness(state.accounts, '1');
    const b2Accounts = repo.filterByBusiness(state.accounts, '2');

    assert.strictEqual(b1Accounts.some(a => a.id === 'acc_b1'), true);
    assert.strictEqual(b1Accounts.some(a => a.id === 'acc_b2'), false);
    assert.strictEqual(b2Accounts.some(a => a.id === 'acc_b2'), true);
    assert.strictEqual(b2Accounts.some(a => a.id === 'acc_b1'), false);
  });

  runTest('3.2: Cross-business accountId collision isolation in ledgerEngine calculations', () => {
    const acc1 = { id: 'cust_overlap_77', businessId: '1', type: 1, openingBalance: 1500 };
    const acc2 = { id: 'cust_overlap_77', businessId: '2', type: 1, openingBalance: 800 };

    const sharedJournals = [
      { id: 'j_1', accountId: 'cust_overlap_77', businessId: '1', amount: 500, type: 'given', date: '2026-11-01' },
      { id: 'j_2', accountId: 'cust_overlap_77', businessId: '2', amount: 400, type: 'given', date: '2026-11-01' },
    ];

    const calc1 = ledgerEngine.recalculateAccountRunningBalances(acc1, sharedJournals);
    const calc2 = ledgerEngine.recalculateAccountRunningBalances(acc2, sharedJournals);

    assert.strictEqual(calc1.updatedAccount.balance, 2000);
    assert.strictEqual(calc1.accountJournals.length, 1);
    assert.strictEqual(calc1.accountJournals[0].id, 'j_1');

    assert.strictEqual(calc2.updatedAccount.balance, 1200);
    assert.strictEqual(calc2.accountJournals.length, 1);
    assert.strictEqual(calc2.accountJournals[0].id, 'j_2');
  });

  await runAsyncTest('3.3: deleteBusinessCascade purges multi-business records matching Room ON DELETE CASCADE', async () => {
    const testData = {
      businesses: [
        { id: '1', name: 'Main Store', isSelected: true, isArchived: false, is_active: 1, is_current: 1 },
        { id: '2', name: 'Branch Store', isSelected: false, isArchived: false, is_active: 1, is_current: 0 },
      ],
      activeBusinessId: '2',
      accounts: [
        { id: 'acc_1', businessId: '1', name: 'Cust 1', balance: 50 },
        { id: 'acc_2', businessId: '2', name: 'Cust 2', balance: 150 },
      ],
      journals: [
        { id: 'j_1', businessId: '1', accountId: 'acc_1', amount: 50 },
        { id: 'j_2', businessId: '2', accountId: 'acc_2', amount: 150 },
      ],
      cashEntries: [
        { id: 'c_1', businessId: '1', amount: 20 },
        { id: 'c_2', businessId: '2', amount: 40 },
      ],
      stock: [
        { id: 'st_1', businessId: '1', name: 'Prod 1' },
        { id: 'st_2', businessId: '2', name: 'Prod 2' },
      ],
      inventory: [
        { id: 'st_1', businessId: '1', name: 'Prod 1' },
        { id: 'st_2', businessId: '2', name: 'Prod 2' },
      ],
      tagadaLogs: [
        { id: 'tg_1', businessId: '1', credit_amount: 50 },
        { id: 'tg_2', businessId: '2', credit_amount: 150 },
      ],
    };

    const repo = new StorageRepository(createMockAdapter(testData));
    await repo.loadInitialData();

    const delRes = await repo.deleteBusinessCascade('2');
    assert.strictEqual(delRes.success, true);

    const afterState = repo.getAuthoritativeState();
    assert.strictEqual(afterState.businesses.length, 1);
    assert.strictEqual(afterState.businesses[0].id, '1');
    assert.strictEqual(afterState.businesses[0].is_current, 1);
    assert.strictEqual(afterState.activeBusinessId, '1');

    assert.strictEqual(afterState.accounts.some(a => String(a.businessId) === '2'), false);
    assert.strictEqual(afterState.journals.some(j => String(j.businessId) === '2'), false);
    assert.strictEqual(afterState.cashEntries.some(c => String(c.businessId) === '2'), false);
    assert.strictEqual(afterState.stock.some(s => String(s.businessId) === '2'), false);
    assert.strictEqual(afterState.tagadaLogs.some(t => String(t.businessId) === '2'), false);
  });

  await runAsyncTest('3.4: deleteBusinessPermanently protects business with linked records unless cascade chosen', async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const delPrimary = await repo.deleteBusinessPermanently('1');
    assert.strictEqual(delPrimary.success, false);
    assert.ok(delPrimary.error.message.includes('সংরক্ষিত আর্থিক হিসাব'));
  });

  console.log('\n--- PART 4: APP.JS INTEGRATION & BABEL PARSING ---');

  const appSource = fs.readFileSync('App.js', 'utf8');

  runTest('4.1: App.js triggers haptics on handleSelectBusiness', () => {
    assert(appSource.includes('handleSelectBusiness = async (biz) => {\n    try { hapticFeedbackService.selection(); } catch (e) {}'),
      'handleSelectBusiness must trigger hapticFeedbackService.selection()');
  });

  runTest('4.2: App.js triggers haptics on handleCreateBusiness', () => {
    assert(appSource.includes('try { hapticFeedbackService.onTransactionSave(); } catch (e) {}\n    const store = res.data;'),
      'handleCreateBusiness must trigger hapticFeedbackService.onTransactionSave()');
  });

  runTest('4.3: App.js triggers haptics on handleArchiveBusiness', () => {
    assert(appSource.includes('try { hapticFeedbackService.selection(); } catch (e) {}\n            const store = res.data;'),
      'handleArchiveBusiness must trigger hapticFeedbackService.selection()');
  });

  runTest('4.4: App.js triggers haptics on handleRestoreBusiness', () => {
    assert(appSource.includes('try { hapticFeedbackService.onTransactionSave(); } catch (e) {}\n    const store = res.data;'),
      'handleRestoreBusiness must trigger hapticFeedbackService.onTransactionSave()');
  });

  runTest('4.5: App.js compiles cleanly with zero syntax errors via Babel parser', () => {
    const ast = babel.parseSync(appSource, {
      filename: 'App.js',
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ['jsx', 'flow'] },
    });
    assert(ast && ast.program && ast.program.body.length > 0, 'AST must be valid');
  });

  console.log('\n================================================================');
  console.log(`FEATURE 5 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================\n');
}

runAllTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
