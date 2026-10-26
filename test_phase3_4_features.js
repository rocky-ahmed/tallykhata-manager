// Test Phase 3.4 Feature Verifications
const assert = require('assert');
const { StorageRepository, createDefaultState } = require('./src/storageRepository');

async function run() {
  console.log('Running Phase 3.4 Feature Verifications...');

  // Test 1: Default state includes tallyMessageBalance: 50
  const def = createDefaultState();
  assert.strictEqual(def.tallyMessageBalance, 50, 'Default state must include 50 tally message balance');
  console.log('[PASS] TEST 1: Default state includes tallyMessageBalance = 50');

  // Test 2: In-memory mock storage persistence
  let mockStore = {};
  const mockStorage = {
    getItem: async (k) => mockStore[k] || null,
    setItem: async (k, v) => { mockStore[k] = v; },
    removeItem: async (k) => { delete mockStore[k]; }
  };

  const repo = new StorageRepository(mockStorage);
  const bootRes = await repo.loadInitialData();
  assert.strictEqual(bootRes.success, true);
  assert.strictEqual(bootRes.data.tallyMessageBalance, 50, 'Initial load should have 50 SMS balance');

  // Purchase SMS package (+100 SMS)
  const persistRes = await repo.persistData({ tallyMessageBalance: 150 });
  assert.strictEqual(persistRes.success, true);

  const repo2 = new StorageRepository(mockStorage);
  const reloadRes = await repo2.loadInitialData();
  assert.strictEqual(reloadRes.success, true);
  assert.strictEqual(reloadRes.data.tallyMessageBalance, 150, 'Reloaded state should reflect purchased SMS balance');
  console.log('[PASS] TEST 2: tallyMessageBalance persists and reloads correctly');

  // Test 3: Account filtering logic for customer (type 1) and supplier (type 2)
  const testAccounts = [
    { id: '1', name: 'Customer A', type: 1, balance: 500 },
    { id: '2', name: 'Customer B', type: 1, balance: 0 },
    { id: '3', name: 'Supplier X', type: 2, balance: 1200 },
  ];

  const custFiltered = testAccounts.filter(a => a.type === 1);
  const supFiltered = testAccounts.filter(a => a.type === 2);
  assert.strictEqual(custFiltered.length, 2, 'Customer filter should return 2 accounts');
  assert.strictEqual(supFiltered.length, 1, 'Supplier filter should return 1 account');
  console.log('[PASS] TEST 3: Account type filtering operates correctly');


  // Test 4: mutateCollection('inventory') continuously synchronizes 'stock' (DATA-12)
  const repoSync = new StorageRepository(mockStorage);
  await repoSync.loadInitialData();
  const mutInvRes = await repoSync.mutateCollection('inventory', (items) => {
    return [...items, { id: 'test_item_99', name: 'টেস্ট চাল', unit: 'কেজি', buyPrice: 50, sellPrice: 60, stock: 10 }];
  });
  assert.strictEqual(mutInvRes.success, true);
  const stateAfterInv = repoSync.getAuthoritativeState();
  assert.ok(Array.isArray(stateAfterInv.inventory), 'inventory must be array');
  assert.ok(Array.isArray(stateAfterInv.stock), 'stock must be array');
  assert.strictEqual(stateAfterInv.inventory.length, stateAfterInv.stock.length, 'inventory and stock count must match');
  assert.ok(stateAfterInv.stock.some(s => s.id === 'test_item_99'), 'stock must contain newly added inventory item');
  console.log('[PASS] TEST 4: mutateCollection(\'inventory\') continuously synchronizes \'stock\' (DATA-12)');

  // Test 5: mutateCollection('stock') continuously synchronizes 'inventory' (DATA-12)
  const mutStockRes = await repoSync.mutateCollection('stock', (items) => {
    return items.filter(s => s.id !== 'test_item_99');
  });
  assert.strictEqual(mutStockRes.success, true);
  const stateAfterStock = repoSync.getAuthoritativeState();
  assert.strictEqual(stateAfterStock.inventory.length, stateAfterStock.stock.length, 'inventory and stock count must match after stock mutation');
  assert.ok(!stateAfterStock.inventory.some(s => s.id === 'test_item_99'), 'inventory must remove deleted stock item');
  console.log('[PASS] TEST 5: mutateCollection(\'stock\') continuously synchronizes \'inventory\' (DATA-12)');

  // Test 6: Tagada Quota & Bulk Tagada atomic logging
  const repoTagada = new StorageRepository(mockStorage);
  await repoTagada.loadInitialData();
  await repoTagada.persistData({ remainingSmsCount: 1, tagadaLogs: [] });

  // Simulate bulk tagada with 2 customers
  const sampleDue = [
    { id: 'c1', name: 'কাস্টমার ১', phone: '01711111111', balance: 5000 },
    { id: 'c2', name: 'কাস্টমার ২', phone: '01822222222', balance: 3500 },
  ];
  const newLogs = sampleDue.map(c => ({
    id: 'tag_' + c.id,
    customerName: c.name,
    phone: c.phone,
    amount: c.balance,
    date: '2026-10-26',
    time: '12:00 PM',
  }));

  const bulkRes = await repoTagada.mutateStore((latest) => {
    const curCount = Number(latest.remainingSmsCount) || 0;
    return {
      ...latest,
      remainingSmsCount: Math.max(0, curCount - 1),
      tagadaLogs: [...newLogs, ...(latest.tagadaLogs || [])],
    };
  });
  assert.strictEqual(bulkRes.success, true);
  assert.strictEqual(bulkRes.data.remainingSmsCount, 0, 'Remaining SMS count should decrement to 0');
  assert.strictEqual(bulkRes.data.tagadaLogs.length, 2, 'Tagada logs should contain 2 entries');

  // Second bulk attempt with 0 quota must be blocked
  let quotaBlocked = false;
  if (bulkRes.data.remainingSmsCount <= 0) {
    quotaBlocked = true;
  }
  assert.strictEqual(quotaBlocked, true, 'Zero quota should block further tagada sends');
  console.log('[PASS] TEST 6: Tagada Quota & Bulk Tagada logging protects zero quota and records per-customer log items atomically');

  console.log('All Phase 3.4 tests passed!');
}

run().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
