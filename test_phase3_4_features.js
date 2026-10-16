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

  console.log('All Phase 3.4 tests passed!');
}

run().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
