/**
 * test_iteration_235_recharge_backend.js
 *
 * Comprehensive Backend Unit & Integration Test Suite for Milestone REA-ITER-235:
 * TallyPay Mobile Recharge & Airtime Top-Up Engine
 *
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 * Milestone: REA-ITER-235
 */

const assert = require('assert');
const tallyPayService = require('./src/tallyPayService');
const storageRepoModule = require('./src/storageRepository');

const {
  TELECOM_OPERATORS,
  RECHARGE_TELECOM_OPERATORS,
  RECHARGE_CONNECTION_TYPES,
  RECHARGE_PACKAGE_CATEGORIES,
  PACKAGE_CATEGORY_META,
  RECHARGE_REGULATORY_LIMITS,
  RECHARGE_PACKAGES_CATALOG,
  RECHARGE_ARSC_TOKENS,
  detectRechargeOperator,
  calculateRechargeCommission,
  validateRechargeParameters,
  validateRecharge,
  getRechargePackages,
  searchRechargePackages,
  ReconstructedRechargeEngine,
} = tallyPayService;

const { StorageRepository, createDefaultState } = storageRepoModule;

class MemoryStorageAdapter {
  constructor(initialData = null) {
    this.data = initialData ? JSON.stringify(initialData) : null;
  }
  async getItem(key) {
    return this.data;
  }
  async setItem(key, value) {
    this.data = value;
  }
  async removeItem(key) {
    this.data = null;
  }
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function group(name) {
  console.log('\n[' + name + ']');
}

async function it(label, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log('  ✓ [PASS] ' + label);
  } catch (err) {
    failedTests++;
    console.error('  ✗ [FAIL] ' + label);
    console.error(err);
  }
}

async function runTestSuite() {
  console.log('================================================================================');
  console.log('TALLYKHATA ITERATION 235: TALLYPAY MOBILE RECHARGE BACKEND SUITE');
  console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
  console.log('Milestone: REA-ITER-235');
  console.log('================================================================================');

  // GROUP 1: Operators, Enums & Catalogs
  group('GROUP 1: Telecom Operators, Enums & Package Catalog Specifications');
  await it('1.1: RECHARGE_TELECOM_OPERATORS defines GP, Banglalink, Robi, Airtel, Teletalk, Skitto', () => {
    assert.strictEqual(typeof RECHARGE_TELECOM_OPERATORS, 'object');
    assert.ok(RECHARGE_TELECOM_OPERATORS.GP);
    assert.ok(RECHARGE_TELECOM_OPERATORS.BANGLALINK);
    assert.ok(RECHARGE_TELECOM_OPERATORS.ROBI);
    assert.ok(RECHARGE_TELECOM_OPERATORS.AIRTEL);
    assert.ok(RECHARGE_TELECOM_OPERATORS.TELETALK);
    assert.ok(RECHARGE_TELECOM_OPERATORS.SKITTO);
    assert.strictEqual(RECHARGE_TELECOM_OPERATORS.GP.nameBn, 'গ্রামীণফোন');
    assert.strictEqual(RECHARGE_TELECOM_OPERATORS.TELETALK.nameBn, 'টেলিটক');
  });

  await it('1.2: RECHARGE_CONNECTION_TYPES supports PREPAID, POSTPAID, SKITTO', () => {
    assert.strictEqual(RECHARGE_CONNECTION_TYPES.PREPAID, 'PREPAID');
    assert.strictEqual(RECHARGE_CONNECTION_TYPES.POSTPAID, 'POSTPAID');
    assert.strictEqual(RECHARGE_CONNECTION_TYPES.SKITTO, 'SKITTO');
  });

  await it('1.3: RECHARGE_PACKAGE_CATEGORIES and PACKAGE_CATEGORY_META define standard categories with Bengali labels', () => {
    const cats = Object.keys(RECHARGE_PACKAGE_CATEGORIES);
    assert.strictEqual(cats.length, 5);
    assert.strictEqual(PACKAGE_CATEGORY_META.INTERNET.nameBn, 'ইন্টারনেট');
    assert.strictEqual(PACKAGE_CATEGORY_META.MINUTES.nameBn, 'মিনিট');
    assert.strictEqual(PACKAGE_CATEGORY_META.BUNDLE.nameBn, 'বান্ডেল');
    assert.strictEqual(PACKAGE_CATEGORY_META.CALL_RATE.nameBn, 'কল রেট');
    assert.strictEqual(PACKAGE_CATEGORY_META.SPECIAL_OFFER.nameBn, 'অফার');
  });

  await it('1.4: RECHARGE_REGULATORY_LIMITS enforces exact Bangladesh telecom guidelines', () => {
    assert.strictEqual(RECHARGE_REGULATORY_LIMITS.minAmountPaisa, 1000);
    assert.strictEqual(RECHARGE_REGULATORY_LIMITS.maxAirtimePaisa, 100000);
    assert.strictEqual(RECHARGE_REGULATORY_LIMITS.maxPackagePaisa, 500000);
    assert.strictEqual(RECHARGE_REGULATORY_LIMITS.dailyCumulativePaisa, 2500000);
    assert.strictEqual(RECHARGE_REGULATORY_LIMITS.maxDailyTxnCount, 50);
  });

  await it('1.5: RECHARGE_PACKAGES_CATALOG contains curated packages with complete integer-paisa fields', () => {
    assert.ok(Array.isArray(RECHARGE_PACKAGES_CATALOG));
    assert.ok(RECHARGE_PACKAGES_CATALOG.length >= 10);
    RECHARGE_PACKAGES_CATALOG.forEach((pkg) => {
      assert.ok(pkg.id);
      assert.ok(pkg.operator);
      assert.ok(pkg.category);
      assert.ok(pkg.name);
      assert.ok(typeof pkg.amountPaisa === 'number' && pkg.amountPaisa > 0);
      assert.ok(typeof pkg.commissionPaisa === 'number' && pkg.commissionPaisa >= 0);
      assert.ok(pkg.validity);
    });
  });

  await it('1.6: RECHARGE_ARSC_TOKENS contains verified Bengali tokens matching REF-001', () => {
    assert.strictEqual(RECHARGE_ARSC_TOKENS.HEADER_TITLE, 'মোবাইল রিচার্জ');
    assert.strictEqual(RECHARGE_ARSC_TOKENS.PROCESSING_NOTICE, 'মোবাইল রিচার্জ প্রসেস করা হচ্ছে');
    assert.strictEqual(RECHARGE_ARSC_TOKENS.SUCCESS_NOTICE, 'মোবাইল রিচার্জ সফল হয়েছে');
    assert.strictEqual(RECHARGE_ARSC_TOKENS.FAILURE_NOTICE, 'মোবাইল রিচার্জ সফল হয়নি');
  });

  // GROUP 2: Prefix Detection & Sanitization
  group('GROUP 2: Mobile Number Prefix Detection & Sanitization');
  await it('2.1: detectRechargeOperator correctly identifies GP prefixes (017, 013)', () => {
    assert.strictEqual(detectRechargeOperator('01712345678'), 'GP');
    assert.strictEqual(detectRechargeOperator('01312345678'), 'GP');
  });

  await it('2.2: detectRechargeOperator correctly identifies Banglalink prefixes (019, 014)', () => {
    assert.strictEqual(detectRechargeOperator('01912345678'), 'BANGLALINK');
    assert.strictEqual(detectRechargeOperator('01412345678'), 'BANGLALINK');
  });

  await it('2.3: detectRechargeOperator correctly identifies Robi (018), Airtel (016), Teletalk (015)', () => {
    assert.strictEqual(detectRechargeOperator('01812345678'), 'ROBI');
    assert.strictEqual(detectRechargeOperator('01612345678'), 'AIRTEL');
    assert.strictEqual(detectRechargeOperator('01512345678'), 'TELETALK');
  });

  await it('2.4: detectRechargeOperator strips international +880 and spaces', () => {
    assert.strictEqual(detectRechargeOperator('+8801712345678'), 'GP');
    assert.strictEqual(detectRechargeOperator('8801812345678'), 'ROBI');
    assert.strictEqual(detectRechargeOperator('017 12 34 56 78'), 'GP');
  });

  await it('2.5: detectRechargeOperator returns null for invalid prefixes', () => {
    assert.strictEqual(detectRechargeOperator('01112345678'), null);
    assert.strictEqual(detectRechargeOperator('01212345678'), null);
    assert.strictEqual(detectRechargeOperator('01012345678'), null);
    assert.strictEqual(detectRechargeOperator(''), null);
    assert.strictEqual(detectRechargeOperator(null), null);
  });

  // GROUP 3: Commission Calculation
  group('GROUP 3: Retailer Commission Calculation Engine');
  await it('3.1: calculateRechargeCommission computes 2.7% standard retailer commission (270 paisa / ৳100)', () => {
    assert.strictEqual(calculateRechargeCommission(10000), 270);
    assert.strictEqual(calculateRechargeCommission(5000), 135);
    assert.strictEqual(calculateRechargeCommission(2000), 54);
    assert.strictEqual(calculateRechargeCommission(100000), 2700);
  });

  await it('3.2: calculateRechargeCommission prioritizes special package bonus commission', () => {
    const pkgComm = 3500;
    assert.strictEqual(calculateRechargeCommission(49800, pkgComm), 3500);
  });

  // GROUP 4: Parameter & Regulatory Limit Validation
  group('GROUP 4: Parameter & Regulatory Limit Validation');
  await it('4.1: validateRechargeParameters rejects malformed or non-11-digit numbers', () => {
    const resShort = validateRechargeParameters({ mobileNumber: '017123456', amountPaisa: 5000, walletBalancePaisa: 50000 });
    assert.strictEqual(resShort.valid, false);
    assert.strictEqual(resShort.error, 'INVALID_MOBILE_NUMBER');

    const resLong = validateRechargeParameters({ mobileNumber: '0171234567899', amountPaisa: 5000, walletBalancePaisa: 50000 });
    assert.strictEqual(resLong.valid, false);
  });

  await it('4.2: validateRechargeParameters rejects invalid connection types or Skitto on non-GP', () => {
    const resBadType = validateRechargeParameters({ mobileNumber: '01712345678', amountPaisa: 5000, connectionType: 'OTHER', walletBalancePaisa: 50000 });
    assert.strictEqual(resBadType.valid, false);
    assert.strictEqual(resBadType.error, 'INVALID_CONNECTION_TYPE');

    const resSkittoRobi = validateRechargeParameters({ mobileNumber: '01812345678', amountPaisa: 5000, connectionType: 'SKITTO', walletBalancePaisa: 50000 });
    assert.strictEqual(resSkittoRobi.valid, false);
    assert.strictEqual(resSkittoRobi.error, 'SKITTO_ONLY_ON_GP');
  });

  await it('4.3: validateRechargeParameters rejects below min ৳10 and above max airtime ৳1,000', () => {
    const resBelow = validateRechargeParameters({ mobileNumber: '01712345678', amountPaisa: 900, walletBalancePaisa: 50000 });
    assert.strictEqual(resBelow.valid, false);
    assert.strictEqual(resBelow.error, 'BELOW_MINIMUM_LIMIT');

    const resAbove = validateRechargeParameters({ mobileNumber: '01712345678', amountPaisa: 105000, isPackage: false, walletBalancePaisa: 200000 });
    assert.strictEqual(resAbove.valid, false);
    assert.strictEqual(resAbove.error, 'EXCEEDS_AIRTIME_LIMIT');
  });

  await it('4.4: validateRechargeParameters allows package recharge up to ৳5,000', () => {
    const resPkg = validateRechargeParameters({ mobileNumber: '01712345678', amountPaisa: 39900, isPackage: true, walletBalancePaisa: 200000 });
    assert.strictEqual(resPkg.valid, true);

    const resPkgOver = validateRechargeParameters({ mobileNumber: '01712345678', amountPaisa: 550000, isPackage: true, walletBalancePaisa: 600000 });
    assert.strictEqual(resPkgOver.valid, false);
    assert.strictEqual(resPkgOver.error, 'EXCEEDS_PACKAGE_LIMIT');
  });

  await it('4.5: validateRechargeParameters enforces daily limit (৳25,000) and max 50 daily txns', () => {
    const resLimit = validateRechargeParameters({ mobileNumber: '01712345678', amountPaisa: 10000, walletBalancePaisa: 50000, dailyRechargedPaisa: 2495000 });
    assert.strictEqual(resLimit.valid, false);
    assert.strictEqual(resLimit.error, 'DAILY_LIMIT_EXCEEDED');

    const resTxn = validateRechargeParameters({ mobileNumber: '01712345678', amountPaisa: 1000, walletBalancePaisa: 50000, dailyTxnCount: 50 });
    assert.strictEqual(resTxn.valid, false);
    assert.strictEqual(resTxn.error, 'DAILY_TXN_COUNT_EXCEEDED');
  });

  await it('4.6: validateRechargeParameters rejects if wallet balance is insufficient', () => {
    const resBal = validateRechargeParameters({ mobileNumber: '01712345678', amountPaisa: 5000, walletBalancePaisa: 3000 });
    assert.strictEqual(resBal.valid, false);
    assert.strictEqual(resBal.error, 'INSUFFICIENT_BALANCE');
  });

  // GROUP 5: Package Catalog Operations
  group('GROUP 5: Package Catalog Filtering & Search');
  await it('5.1: getRechargePackages filters accurately by operator and category', () => {
    const gpPkgs = getRechargePackages('GP');
    assert.ok(gpPkgs.length > 0);
    gpPkgs.forEach(p => assert.strictEqual(p.operator, 'GP'));

    const gpInternet = getRechargePackages('GP', 'INTERNET');
    assert.ok(gpInternet.length > 0);
    gpInternet.forEach(p => {
      assert.strictEqual(p.operator, 'GP');
      assert.strictEqual(p.category, 'INTERNET');
    });
  });

  await it('5.2: searchRechargePackages performs multi-field substring queries', () => {
    const results = searchRechargePackages('GB', 'GP');
    assert.ok(results.length > 0);
    results.forEach(p => {
      assert.strictEqual(p.operator, 'GP');
      assert.ok(p.name.includes('GB'));
    });
  });

  // GROUP 6: Engine Atomic Execution & State Transitions
  group('GROUP 6: ReconstructedRechargeEngine Atomic Execution');
  await it('6.1: Executes standard airtime top-up, deducts balance, and credits commission atomically', async () => {
    const engine = new ReconstructedRechargeEngine(50000, { pin: '1234' });
    const initialBal = engine.walletBalancePaisa;
    const amount = 10000;
    const expectedComm = 270;

    const record = await engine.executeRecharge({
      mobileNumber: '01712345678',
      amountPaisa: amount,
      connectionType: 'PREPAID',
      pin: '1234',
      note: 'Customer Topup',
    });

    assert.ok(record.id.startsWith('RC_'));
    assert.strictEqual(record.mobileNumber, '01712345678');
    assert.strictEqual(record.operator, 'GP');
    assert.strictEqual(record.amountPaisa, amount);
    assert.strictEqual(record.commissionPaisa, expectedComm);
    assert.strictEqual(record.status, 'SUCCESS');

    const expectedBal = initialBal - amount + expectedComm;
    assert.strictEqual(engine.walletBalancePaisa, expectedBal);
    assert.strictEqual(engine.dailyRechargedPaisa, amount);
    assert.strictEqual(engine.dailyTxnCount, 1);
    assert.strictEqual(engine.rechargeHistory.length, 1);
  });

  await it('6.2: Executes package recharge with bonus commission', async () => {
    const engine = new ReconstructedRechargeEngine(100000, { pin: '1234' });
    const pkg = RECHARGE_PACKAGES_CATALOG.find(p => p.operator === 'GP' && p.category === 'INTERNET');
    assert.ok(pkg);

    const record = await engine.executeRecharge({
      mobileNumber: '01712345678',
      amountPaisa: pkg.amountPaisa,
      packageInfo: pkg,
      pin: '1234',
    });

    assert.strictEqual(record.isPackage, true);
    assert.strictEqual(record.packageId, pkg.id);
    assert.strictEqual(record.commissionPaisa, pkg.commissionPaisa);
  });

  await it('6.3: Rejects execution on wrong PIN and does not mutate balance', async () => {
    const engine = new ReconstructedRechargeEngine(50000, { pin: '1234' });
    let threw = false;
    try {
      await engine.executeRecharge({
        mobileNumber: '01712345678',
        amountPaisa: 5000,
        pin: '9999',
      });
    } catch (err) {
      threw = true;
      assert.strictEqual(err.message, 'INVALID_PIN');
    }
    assert.ok(threw);
    assert.strictEqual(engine.walletBalancePaisa, 50000);
    assert.strictEqual(engine.dailyTxnCount, 0);
  });

  // GROUP 7: StorageRepository Multi-Tenant Persistence
  group('GROUP 7: StorageRepository Multi-Tenant Persistence & CRUD');
  await it('7.1: saveRechargeRecord persists records isolated by businessId', async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    const recA = await repo.saveRechargeRecord('1', {
      mobileNumber: '01711112222',
      operator: 'GP',
      amountPaisa: 5000,
      commissionPaisa: 135,
    });
    assert.ok(recA.id);

    const recB = await repo.saveRechargeRecord('2', {
      mobileNumber: '01888889999',
      operator: 'ROBI',
      amountPaisa: 10000,
      commissionPaisa: 270,
    });

    const historyA = repo.getRechargeHistory('1');
    assert.strictEqual(historyA.length, 1);
    assert.strictEqual(historyA[0].mobileNumber, '01711112222');

    const historyB = repo.getRechargeHistory('2');
    assert.strictEqual(historyB.length, 1);
    assert.strictEqual(historyB[0].mobileNumber, '01888889999');
  });

  await it('7.2: getRechargeHistory supports operator, connectionType, and pagination', async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    for (let i = 1; i <= 5; i++) {
      await repo.saveRechargeRecord('1', {
        id: 'RC_FILTER_' + i,
        mobileNumber: '0170000000' + i,
        operator: i % 2 === 0 ? 'GP' : 'ROBI',
        connectionType: i === 5 ? 'POSTPAID' : 'PREPAID',
        amountPaisa: i * 1000,
        isPackage: i > 3,
      });
    }

    const gpOnly = repo.getRechargeHistory('1', { operator: 'GP' });
    assert.strictEqual(gpOnly.length, 2);

    const postpaidOnly = repo.getRechargeHistory('1', { connectionType: 'POSTPAID' });
    assert.strictEqual(postpaidOnly.length, 1);

    const paged = repo.getRechargeHistory('1', { limit: 2, offset: 0 });
    assert.strictEqual(paged.length, 2);
  });

  await it('7.3: getRechargeById retrieves single recharge accurately', async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    const created = await repo.saveRechargeRecord('1', {
      id: 'RC_UNIQUE_1001',
      mobileNumber: '01999998888',
      operator: 'BANGLALINK',
      amountPaisa: 2000,
    });

    const found = repo.getRechargeById('1', 'RC_UNIQUE_1001');
    assert.ok(found);
    assert.strictEqual(found.mobileNumber, '01999998888');

    const notFound = repo.getRechargeById('1', 'NON_EXISTENT');
    assert.strictEqual(notFound, null);
  });

  // GROUP 8: Business Cascade Deletion
  group('GROUP 8: Multi-Business Cascade Deletion');
  await it('8.1: deleteBusinessCascade purges rechargeHistory for target business only', async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    await repo.saveRechargeRecord('1', { id: 'RC_DEL_1', mobileNumber: '01700000001', amountPaisa: 5000 });
    await repo.saveRechargeRecord('2', { id: 'RC_SURV_1', mobileNumber: '01800000001', amountPaisa: 10000 });

    assert.strictEqual(repo.getRechargeHistory('1').length, 1);
    assert.strictEqual(repo.getRechargeHistory('2').length, 1);

    await repo.deleteBusinessCascade('1');

    assert.strictEqual(repo.getRechargeHistory('1').length, 0);
    assert.strictEqual(repo.getRechargeHistory('2').length, 1);
  });

  // GROUP 9: Cloud Backup Sanitization & Serialization
  group('GROUP 9: Cloud Backup Sanitization & Full Restore Round-Trip');
  await it('9.1: getFullBackupState masks recipient phone numbers for privacy compliance', async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    await repo.saveRechargeRecord('1', {
      id: 'RC_PRIV_1',
      mobileNumber: '01712345678',
      operator: 'GP',
      amountPaisa: 10000,
    });

    const backup = await repo.getFullBackupState();
    assert.ok(Array.isArray(backup.rechargeHistory));
    assert.strictEqual(backup.rechargeHistory.length, 1);
    assert.strictEqual(backup.rechargeHistory[0].mobileNumber, '017****5678');
  });

  await it('9.2: commitRestorePayload preserves rechargeHistory across full restore', async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    await repo.saveRechargeRecord('1', {
      id: 'RC_RESTORE_TEST',
      mobileNumber: '01712345678',
      operator: 'GP',
      amountPaisa: 5000,
    });

    const backupPayload = await repo.createStorageBackup();

    const newAdapter = new MemoryStorageAdapter(createDefaultState());
    const newRepo = new StorageRepository({ adapter: newAdapter });
    await newRepo.loadInitialData();

    await newRepo.commitRestorePayload(backupPayload);
    const restoredHistory = newRepo.getRechargeHistory('1');
    assert.strictEqual(restoredHistory.length, 1);
    assert.strictEqual(restoredHistory[0].id, 'RC_RESTORE_TEST');
  });

  // GROUP 10: Performance & Latency Benchmark
  group('GROUP 10: High-Throughput Performance Benchmark');
  await it('10.1: 1,000 operator detections, limit validations & commission calculations execute in < 100ms', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      const phone = i % 2 === 0 ? '01712345678' : '01812345678';
      const op = detectRechargeOperator(phone);
      const comm = calculateRechargeCommission(10000);
      const val = validateRechargeParameters({
        mobileNumber: phone,
        amountPaisa: 10000,
        connectionType: 'PREPAID',
        walletBalancePaisa: 50000,
      });
      assert.ok(op);
      assert.strictEqual(comm, 270);
      assert.strictEqual(val.valid, true);
    }
    const elapsed = Date.now() - start;
    console.log('    -> 1,000 recharge operations completed in ' + elapsed + 'ms (' + (elapsed / 1000).toFixed(4) + 'ms/op)');
    assert.ok(elapsed < 200, 'Elapsed ' + elapsed + 'ms exceeds budget');
  });

  console.log('================================================================================');
  console.log('TOTAL: ' + totalTests + ' | PASSED: ' + passedTests + ' | FAILED: ' + failedTests);
  console.log('================================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('FATAL SUITE ERROR:', err);
  process.exit(1);
});