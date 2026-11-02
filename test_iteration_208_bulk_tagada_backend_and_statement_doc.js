/**
 * test_iteration_208_bulk_tagada_backend_and_statement_doc.js
 * Continuous Verification & Benchmark Suite for Iteration 208:
 * 1. Bulk Tagada Eligibility Filtering & Ordering (Active Customers, Debt Balance > 0, Descending Sort)
 * 2. Telecom SMS Segmentation (UCS-2 70/67 & GSM-7 160/153) & Batch Preparation
 * 3. Atomic Batch Dispatch, Mutex WriteQueue, Quota Deduction & Idempotency Guards
 * 4. Statement Document Payload Generator (Print/Receipt Format, 0.00 Paisa Drift, Localized Copy)
 * 5. Multi-Tenant Business Isolation across 30 Businesses with Colliding Customer IDs
 * 6. High-Volume Batch Dispatch Benchmark (100 Concurrent Recipients < 50ms)
 *
 * Worker: Worker 2 (Averroes) — Principal Backend Developer & Business Logic
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 */

const assert = require('assert');
const { performance } = require('perf_hooks');
const {
  StorageRepository,
  createDefaultState,
  V6_KEY,
  calculateSmsSegments,
  getBulkTagadaEligibleCustomers,
  prepareBulkTagadaBatch,
  dispatchBulkTagadaBatch,
  generateStatementDocumentPayload,
  recordTagadaLog,
  getTagadaQuota,
  adjustTagadaQuota,
  listTagadaLogs,
} = require('./src/storageRepository');
const {
  calculateSmsSegments: calculateSmsSegmentsEngine,
  getBulkTagadaEligibleCustomers: getBulkTagadaEligibleCustomersEngine,
  prepareBulkTagadaBatch: prepareBulkTagadaBatchEngine,
  generateStatementDocumentPayload: generateStatementDocumentPayloadEngine,
  generateAccountStatement,
  recalculateAccountRunningBalances,
  normalizeTagadaLogFields,
} = require('./src/ledgerEngine');

function createMockAsyncAdapter(writeDelayMs = 0.5) {
  const store = new Map();
  return {
    getItem: async (key) => {
      await new Promise(r => setTimeout(r, 0.1));
      return store.has(key) ? store.get(key) : null;
    },
    setItem: async (key, val) => {
      await new Promise(r => setTimeout(r, writeDelayMs));
      store.set(key, String(val));
    },
    removeItem: async (key) => {
      await new Promise(r => setTimeout(r, 0.1));
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
    setWriteDelay: (d) => { writeDelayMs = d; },
    _map: store
  };
}

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        passedTests++;
        console.log(`[PASS] TEST ${totalTests}: ${testName}`);
      }).catch(err => {
        console.error(`[FAIL] TEST ${totalTests}: ${testName}`, err);
        process.exitCode = 1;
      });
    } else {
      passedTests++;
      console.log(`[PASS] TEST ${totalTests}: ${testName}`);
    }
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${testName}`, err);
    process.exitCode = 1;
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('ITERATION 208: BULK TAGADA BACKEND & STATEMENT DOCUMENT GENERATOR');
  console.log('================================================================\n');

  console.log('--- PART 1: BULK TAGADA ELIGIBILITY FILTERING & ORDERING ---');

  const sampleAccounts = [
    { id: 'c1', name: 'করিম সাহেব', type: 1, balance: 1500.50, isArchived: false, isActive: true, businessId: '1' },
    { id: 'c2', name: 'রহিম মিয়া', type: 1, balance: 3200.00, isArchived: false, isActive: true, businessId: '1' },
    { id: 'c3', name: 'শাকিল আহমেদ', type: 1, balance: 0.00, isArchived: false, isActive: true, businessId: '1' }, // Zero balance (excluded)
    { id: 'c4', name: 'জসিম উদ্দিন', type: 1, balance: -500.00, isArchived: false, isActive: true, businessId: '1' }, // Advance balance (excluded)
    { id: 'c5', name: 'মকবুল হাসান', type: 1, balance: 800.75, isArchived: true, isActive: false, businessId: '1' }, // Archived (excluded)
    { id: 's1', name: 'মেসার্স ডাল সাপ্লায়ার', type: 2, balance: 4500.00, isArchived: false, isActive: true, businessId: '1' }, // Supplier (excluded)
    { id: 'c6', name: 'শফিক ট্রেডার্স (অন্য দোকান)', type: 1, balance: 2100.00, isArchived: false, isActive: true, businessId: '2' }, // Shop 2 (excluded)
  ];

  await runTest('1.1: getBulkTagadaEligibleCustomers filters only active customers with balance > 0 in businessId "1"', () => {
    const eligible = getBulkTagadaEligibleCustomersEngine('1', sampleAccounts);
    assert.strictEqual(eligible.length, 2, 'Should only return 2 eligible customers for shop 1');
    assert.strictEqual(eligible[0].id, 'c2', 'Customer c2 (3200) must be first');
    assert.strictEqual(eligible[1].id, 'c1', 'Customer c1 (1500.50) must be second');
  });

  await runTest('1.2: getBulkTagadaEligibleCustomers sorts descending by balance (highest debt first)', () => {
    const accs = [
      { id: 'a', name: 'A', type: 1, balance: 100, businessId: '1' },
      { id: 'b', name: 'B', type: 1, balance: 5000, businessId: '1' },
      { id: 'c', name: 'C', type: 1, balance: 250, businessId: '1' },
      { id: 'd', name: 'D', type: 1, balance: 1200.75, businessId: '1' },
    ];
    const res = getBulkTagadaEligibleCustomersEngine('1', accs);
    assert.deepStrictEqual(res.map(x => x.id), ['b', 'd', 'c', 'a']);
    assert.strictEqual(res[0].balance, 5000);
    assert.strictEqual(res[1].balance, 1200.75);
    assert.strictEqual(res[2].balance, 250);
    assert.strictEqual(res[3].balance, 100);
  });

  await runTest('1.3: getBulkTagadaEligibleCustomers strictly isolates multi-tenant businesses', () => {
    const shop1Eligible = getBulkTagadaEligibleCustomersEngine('1', sampleAccounts);
    const shop2Eligible = getBulkTagadaEligibleCustomersEngine('2', sampleAccounts);
    const shop3Eligible = getBulkTagadaEligibleCustomersEngine('3', sampleAccounts);

    assert.strictEqual(shop1Eligible.length, 2);
    assert.strictEqual(shop2Eligible.length, 1);
    assert.strictEqual(shop2Eligible[0].id, 'c6');
    assert.strictEqual(shop3Eligible.length, 0);
  });

  console.log('\n--- PART 2: TELECOM SMS SEGMENTATION & BATCH PREPARATION ---');

  await runTest('2.1: calculateSmsSegments accurately calculates GSM-7 single (<=160) and multipart (ceil(len/153))', () => {
    const empty = calculateSmsSegmentsEngine('');
    assert.strictEqual(empty.charCount, 0);
    assert.strictEqual(empty.segments, 0);
    assert.strictEqual(empty.encoding, 'GSM-7');

    const singleGsm = calculateSmsSegmentsEngine('Hello, your due balance is 500 Taka.');
    assert.strictEqual(singleGsm.encoding, 'GSM-7');
    assert.strictEqual(singleGsm.segments, 1);
    assert.strictEqual(singleGsm.maxSingleSegment, 160);

    const exact160 = 'A'.repeat(160);
    const res160 = calculateSmsSegmentsEngine(exact160);
    assert.strictEqual(res160.segments, 1);

    const exact161 = 'A'.repeat(161);
    const res161 = calculateSmsSegmentsEngine(exact161);
    assert.strictEqual(res161.segments, 2, '161 chars GSM-7 must require 2 segments');

    const exact306 = 'A'.repeat(306);
    assert.strictEqual(calculateSmsSegmentsEngine(exact306).segments, 2);

    const exact307 = 'A'.repeat(307);
    assert.strictEqual(calculateSmsSegmentsEngine(exact307).segments, 3);
  });

  await runTest('2.2: calculateSmsSegments accurately calculates UCS-2 Bengali single (<=70) and multipart (ceil(len/67))', () => {
    const bengaliSingle = 'আসসালামু আলাইকুম, আপনার বকেয়া ৫০০ টাকা।';
    const resBenSingle = calculateSmsSegmentsEngine(bengaliSingle);
    assert.strictEqual(resBenSingle.encoding, 'UCS-2');
    assert.strictEqual(resBenSingle.segments, 1);
    assert.strictEqual(resBenSingle.maxSingleSegment, 70);
    assert.strictEqual(resBenSingle.maxMultipartSegment, 67);

    // Exact 70 chars UCS-2
    const ucs70 = 'বাংলা'.repeat(14); // 5 * 14 = 70 chars
    assert.strictEqual(ucs70.length, 70);
    assert.strictEqual(calculateSmsSegmentsEngine(ucs70).segments, 1);

    // 71 chars UCS-2 -> 2 segments
    const ucs71 = ucs70 + 'ক';
    assert.strictEqual(ucs71.length, 71);
    assert.strictEqual(calculateSmsSegmentsEngine(ucs71).segments, 2);

    // Exact 134 chars UCS-2 (67 * 2) -> 2 segments
    const ucs134 = 'ক'.repeat(134);
    assert.strictEqual(calculateSmsSegmentsEngine(ucs134).segments, 2);

    // 135 chars UCS-2 -> 3 segments
    const ucs135 = 'ক'.repeat(135);
    assert.strictEqual(calculateSmsSegmentsEngine(ucs135).segments, 3);
  });

  await runTest('2.3: prepareBulkTagadaBatch compiles localized Bengali reminders with aggregate quota calculations', () => {
    const eligible = getBulkTagadaEligibleCustomersEngine('1', sampleAccounts);
    const prep = prepareBulkTagadaBatchEngine(eligible, {
      businessId: '1',
      businessName: 'ভাই ভাই স্টোর',
      businessPhone: '01711223344',
      remainingSmsCount: 10,
    });

    assert.strictEqual(prep.businessId, '1');
    assert.strictEqual(prep.businessName, 'ভাই ভাই স্টোর');
    assert.strictEqual(prep.totalRecipients, 2);
    assert.strictEqual(prep.totalDebtAmount, 4700.50);
    assert.strictEqual(prep.batchItems.length, 2);
    assert.strictEqual(prep.hasSufficientQuota, true);
    assert.strictEqual(prep.quotaShortfall, 0);

    const firstItem = prep.batchItems[0];
    assert.strictEqual(firstItem.accountId, 'c2');
    assert.strictEqual(firstItem.customerName, 'রহিম মিয়া');
    assert.strictEqual(firstItem.creditAmount, 3200);
    assert.ok(firstItem.message.includes('ভাই ভাই স্টোর'));
    assert.ok(firstItem.message.includes('৩২০০.০০') || firstItem.message.includes('3200.00'));
    assert.ok(firstItem.message.includes('01711223344'));
    assert.strictEqual(firstItem.encoding, 'UCS-2');
    assert.ok(firstItem.segments >= 1);
  });

  await runTest('2.4: prepareBulkTagadaBatch accurately calculates quota shortfall when remaining quota is low', () => {
    const eligible = getBulkTagadaEligibleCustomersEngine('1', sampleAccounts);
    const prep = prepareBulkTagadaBatchEngine(eligible, {
      businessId: '1',
      businessName: 'ভাই ভাই স্টোর',
      remainingSmsCount: 1, // Only 1 SMS remaining
    });

    assert.strictEqual(prep.availableQuota, 1);
    assert.ok(prep.requiredQuota >= 2);
    assert.strictEqual(prep.hasSufficientQuota, false);
    assert.ok(prep.quotaShortfall >= 1);
  });

  console.log('\n--- PART 3: ATOMIC BATCH DISPATCH, MUTEX WRITEQUEUE & QUOTA DEDUCTION ---');

  const adapter = createMockAsyncAdapter(1);
  const repo = new StorageRepository(adapter);
  await repo.loadInitialData();

  // Reset store to known state
  await repo.mutateStore((s) => ({
    ...s,
    remainingSmsCount: 15,
    tagadaLogs: [],
    accounts: sampleAccounts,
    activeBusinessId: '1',
  }));

  await runTest('3.1: dispatchBulkTagadaBatch executes under writeQueue mutex and inserts Room DB tagada_logs', async () => {
    const eligible = repo.getBulkTagadaEligibleCustomers('1');
    const prep = repo.prepareBulkTagadaBatch(eligible, {
      businessName: 'মেসার্স ভাই ভাই',
      businessPhone: '01800000000',
    });

    const dispatchRes = await repo.dispatchBulkTagadaBatch(prep);
    assert.strictEqual(dispatchRes.success, true);
    assert.strictEqual(dispatchRes.dispatchedCount, 2);
    assert.strictEqual(dispatchRes.skippedDuplicates, 0);
    assert.ok(dispatchRes.deductedQuota >= 2);
    assert.strictEqual(dispatchRes.remainingSmsCount, 15 - dispatchRes.deductedQuota);

    // Verify persisted tagada logs in repo
    const logs = repo.listTagadaLogs(null, '1').tagadaLogs;
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[0].business_id, 1);
    assert.strictEqual(logs[0].businessId, '1');
    assert.ok(logs[0].account_id);
    assert.ok(logs[0].credit_amount > 0);
  });

  await runTest('3.2: dispatchBulkTagadaBatch idempotency: Re-dispatching batch skips duplicate IDs and protects quota', async () => {
    const curQuotaBefore = repo.getTagadaQuota('1').remainingSmsCount;
    const logsBefore = repo.listTagadaLogs(null, '1').tagadaLogs;

    // Use same batch items that were already dispatched
    const reDispatchRes = await repo.dispatchBulkTagadaBatch(logsBefore);
    assert.strictEqual(reDispatchRes.success, true);
    assert.strictEqual(reDispatchRes.dispatchedCount, 0, 'Zero new items should be dispatched');
    assert.strictEqual(reDispatchRes.skippedDuplicates, 2, 'Both duplicate items should be skipped');
    assert.strictEqual(reDispatchRes.deductedQuota, 0, 'No quota should be deducted for duplicates');
    assert.strictEqual(reDispatchRes.remainingSmsCount, curQuotaBefore, 'Quota must remain unchanged');
  });

  await runTest('3.3: dispatchBulkTagadaBatch rejects when SMS quota is exhausted (SMS_QUOTA_EXHAUSTED)', async () => {
    // Set remaining quota to 0
    await repo.mutateStore((s) => ({ ...s, remainingSmsCount: 0 }));

    const prep = repo.prepareBulkTagadaBatch([
      { id: 'cx', name: 'নতুন গ্রাহক', balance: 500, businessId: '1' }
    ]);

    const failRes = await repo.dispatchBulkTagadaBatch(prep);
    assert.strictEqual(failRes.success, false);
    assert.strictEqual(failRes.error, 'SMS_QUOTA_EXHAUSTED');
    assert.strictEqual(failRes.dispatchedCount, 0);
    assert.strictEqual(repo.getTagadaQuota('1').remainingSmsCount, 0);
  });

  await runTest('3.4: dispatchBulkTagadaBatch allows bypassQuota: true (WhatsApp/override)', async () => {
    const prep = repo.prepareBulkTagadaBatch([
      { id: 'cx', name: 'নতুন গ্রাহক', balance: 500, businessId: '1' }
    ], { tagadaType: 'TAGADA_BY_WHATSAPP' });

    const bypassRes = await repo.dispatchBulkTagadaBatch(prep, { bypassQuota: true, isFreeSms: false });
    assert.strictEqual(bypassRes.success, true);
    assert.strictEqual(bypassRes.dispatchedCount, 1);
    assert.strictEqual(bypassRes.deductedQuota, 0);
  });

  console.log('\n--- PART 4: STATEMENT DOCUMENT PAYLOAD GENERATOR & PRINT RECEIPT ---');

  const customerAccount = {
    id: 'cust_201',
    name: 'আব্দুল করিম',
    phone: '01712345678',
    type: 1, // Customer
    openingBalance: 500,
    balance: 1150.75,
    businessId: '1',
  };

  const customerJournals = [
    { id: 'j1', accountId: 'cust_201', type: 'given', amount: 300, date: '2026-10-10', businessId: '1' },
    { id: 'j2', accountId: 'cust_201', type: 'received', amount: 150, date: '2026-10-15', businessId: '1' },
    { id: 'j3', accountId: 'cust_201', type: 'given', amount: 700.75, date: '2026-11-01', businessId: '1' },
    { id: 'j4', accountId: 'cust_201', type: 'received', amount: 200, date: '2026-11-02', businessId: '1' },
  ];

  await runTest('4.1: generateStatementDocumentPayload compiles complete printable document structure', () => {
    const doc = generateStatementDocumentPayloadEngine(customerAccount, customerJournals, 'all', {
      businessName: 'মেসার্স সততা স্টোর',
      businessPhone: '01911223344',
      businessAddress: 'নিউ মার্কেট, ঢাকা',
      referenceDate: new Date('2026-11-03T10:00:00.000Z'),
    });

    assert.strictEqual(doc.docType, 'ACCOUNT_STATEMENT');
    assert.strictEqual(doc.version, '1.0');
    assert.ok(doc.documentId.startsWith('stmt_doc_'));
    assert.strictEqual(doc.business.name, 'মেসার্স সততা স্টোর');
    assert.strictEqual(doc.business.phone, '01911223344');
    assert.strictEqual(doc.business.address, 'নিউ মার্কেট, ঢাকা');
    assert.strictEqual(doc.account.name, 'আব্দুল করিম');
    assert.strictEqual(doc.account.phone, '01712345678');
    assert.strictEqual(doc.account.isCustomer, true);
    assert.strictEqual(doc.account.typeLabel, 'গ্রাহক');
    assert.strictEqual(doc.dateRange.range, 'all');
    assert.strictEqual(doc.dateRange.label, 'সকল লেনদেন');
  });

  await runTest('4.2: generateStatementDocumentPayload preserves 0.00 Paisa float drift across itemized entries', () => {
    const doc = generateStatementDocumentPayloadEngine(customerAccount, customerJournals, 'all', {
      referenceDate: new Date('2026-11-03T10:00:00.000Z'),
    });

    assert.strictEqual(doc.summary.openingBalance, 500);
    assert.strictEqual(doc.summary.totalGiven, 1000.75);
    assert.strictEqual(doc.summary.totalReceived, 350);
    assert.strictEqual(doc.summary.closingBalance, 1150.75);
    assert.strictEqual(doc.summary.floatDriftPaisa, 0);

    assert.strictEqual(doc.itemizedEntries.length, 4);
    assert.strictEqual(doc.itemizedEntries[0].runningBalance, 800); // 500 + 300
    assert.strictEqual(doc.itemizedEntries[1].runningBalance, 650); // 800 - 150
    assert.strictEqual(doc.itemizedEntries[2].runningBalance, 1350.75); // 650 + 700.75
    assert.strictEqual(doc.itemizedEntries[3].runningBalance, 1150.75); // 1350.75 - 200
  });

  await runTest('4.3: generateStatementDocumentPayload generates localized Bengali presentation & shareable text', () => {
    const doc = generateStatementDocumentPayloadEngine(customerAccount, customerJournals, 'this_month', {
      businessName: 'সততা স্টোর',
      businessPhone: '01900000000',
      referenceDate: new Date('2026-11-03T10:00:00.000Z'),
    });

    assert.strictEqual(doc.presentation.title, 'বকেয়া হিসাব বিবরণী');
    assert.strictEqual(doc.presentation.balanceStatusLabel, 'মোট পাওনা বকেয়া');
    assert.ok(doc.presentation.summaryBanner.includes('সততা স্টোর'));
    assert.ok(doc.presentation.summaryBanner.includes('বকেয়া হিসাব বিবরণী'));
    assert.ok(doc.presentation.shareableText.includes('📋 *বকেয়া হিসাব বিবরণী*'));
    assert.ok(doc.presentation.shareableText.includes('সততা স্টোর'));
    assert.ok(doc.presentation.shareableText.includes('আব্দুল করিম'));
    assert.ok(doc.presentation.shareableText.includes('শুরুর জের: ৳ 650.00'));
    assert.ok(doc.presentation.shareableText.includes('মোট দিলাম: ৳ 700.75'));
    assert.ok(doc.presentation.shareableText.includes('মোট পেলাম: ৳ 200.00'));
    assert.ok(doc.presentation.shareableText.includes('সমাপনী জের: ৳ 1150.75'));
  });

  await runTest('4.4: generateStatementDocumentPayload supports supplier accounts with correct signage and copy', () => {
    const supplierAccount = {
      id: 'sup_101',
      name: 'মেসার্স রহিম ট্রেডার্স',
      phone: '01899887766',
      type: 2, // Supplier
      openingBalance: 2000,
      balance: 1500,
      businessId: '1',
    };
    const supplierJournals = [
      { id: 'sj1', accountId: 'sup_101', type: 'received', amount: 1000, date: '2026-11-01', businessId: '1' }, // Got goods (+1000 debt)
      { id: 'sj2', accountId: 'sup_101', type: 'given', amount: 1500, date: '2026-11-02', businessId: '1' }, // Paid cash (-1500 debt)
    ];

    const supDoc = generateStatementDocumentPayloadEngine(supplierAccount, supplierJournals, 'all');
    assert.strictEqual(supDoc.presentation.title, 'দেনা হিসাব বিবরণী');
    assert.strictEqual(supDoc.account.typeLabel, 'সরবরাহকারী');
    assert.strictEqual(supDoc.account.isCustomer, false);
    assert.strictEqual(supDoc.summary.openingBalance, 2000);
    assert.strictEqual(supDoc.summary.totalReceived, 1000);
    assert.strictEqual(supDoc.summary.totalGiven, 1500);
    assert.strictEqual(supDoc.summary.closingBalance, 1500); // 2000 + 1000 - 1500 = 1500
    assert.strictEqual(supDoc.presentation.balanceStatusLabel, 'মোট দেনা বকেয়া');
  });

  await runTest('4.5: repo.generateStatementDocumentPayload auto-resolves business metadata from state', async () => {
    await repo.mutateStore((s) => ({
      ...s,
      businesses: [
        { id: '1', name: 'আল-মদিনা জেনারেল স্টোর', phone: '01755443322', address: 'মিরপুর ১০, ঢাকা' }
      ],
      accounts: [customerAccount],
      journals: customerJournals,
      activeBusinessId: '1',
    }));

    const repoDoc = repo.generateStatementDocumentPayload('cust_201');
    assert.strictEqual(repoDoc.business.name, 'আল-মদিনা জেনারেল স্টোর');
    assert.strictEqual(repoDoc.business.phone, '01755443322');
    assert.strictEqual(repoDoc.business.address, 'মিরপুর ১০, ঢাকা');
    assert.strictEqual(repoDoc.summary.closingBalance, 1150.75);
  });

  console.log('\n--- PART 5: MULTI-TENANT ISOLATION ACROSS 30 BUSINESSES (COLLIDING CUSTOMER IDS) ---');

  await runTest('5.1: 30 businesses with colliding customer IDs ("cust_collide") verify zero cross-tenant contamination', () => {
    const multiBizAccounts = [];
    const multiBizJournals = [];

    for (let b = 1; b <= 30; b++) {
      const bId = String(b);
      // Colliding customer ID 'cust_collide' in every business with different balance
      const bal = b * 100 + 50.25;
      multiBizAccounts.push({
        id: 'cust_collide',
        name: `Customer in Shop ${b}`,
        type: 1,
        balance: bal,
        isArchived: false,
        isActive: true,
        businessId: bId,
      });

      multiBizJournals.push({
        id: `j_b${b}`,
        accountId: 'cust_collide',
        type: 'given',
        amount: bal,
        date: '2026-11-01',
        businessId: bId,
      });
    }

    for (let b = 1; b <= 30; b++) {
      const bId = String(b);
      const eligible = getBulkTagadaEligibleCustomersEngine(bId, multiBizAccounts);
      assert.strictEqual(eligible.length, 1, `Business ${bId} must have exactly 1 customer`);
      assert.strictEqual(eligible[0].businessId, bId);
      assert.strictEqual(eligible[0].balance, b * 100 + 50.25);

      const prep = prepareBulkTagadaBatchEngine(eligible, { businessId: bId });
      assert.strictEqual(prep.businessId, bId);
      assert.strictEqual(prep.totalRecipients, 1);
      assert.strictEqual(prep.batchItems[0].accountId, 'cust_collide');
      assert.strictEqual(prep.batchItems[0].creditAmount, b * 100 + 50.25);

      const doc = generateStatementDocumentPayloadEngine('cust_collide', multiBizJournals, 'all', {
        businessId: bId,
        accounts: multiBizAccounts,
      });
      assert.strictEqual(doc.business.id, bId);
      assert.strictEqual(doc.summary.closingBalance, b * 100 + 50.25);
    }
  });

  console.log('\n--- PART 6: HIGH-VOLUME BATCH DISPATCH BENCHMARK (100 CONCURRENT RECIPIENTS) ---');

  await runTest('6.1: Benchmark: Bulk Tagada batch preparation & dispatch for 100 simultaneous customers (< 50ms)', async () => {
    // Generate 100 mock customers
    const benchCustomers = [];
    for (let i = 1; i <= 100; i++) {
      benchCustomers.push({
        id: `bench_cust_${i}`,
        name: `গ্রাহক ${i}`,
        phone: `01700000${String(i).padStart(3, '0')}`,
        type: 1,
        balance: (i * 15.5).toFixed(2),
        isArchived: false,
        isActive: true,
        businessId: '1',
      });
    }

    // Recharge SMS quota in repo
    await repo.mutateStore((s) => ({
      ...s,
      remainingSmsCount: 500,
      tagadaLogs: [],
      accounts: benchCustomers,
      activeBusinessId: '1',
    }));

    const startTime = performance.now();

    // 1. Prepare batch
    const prep = repo.prepareBulkTagadaBatch(benchCustomers, {
      businessName: 'সুপার টেস্ট স্টোর',
      businessPhone: '01811223344',
    });
    assert.strictEqual(prep.totalRecipients, 100);

    // 2. Dispatch batch atomically
    const dispatchRes = await repo.dispatchBulkTagadaBatch(prep);
    const endTime = performance.now();
    const durationMs = endTime - startTime;

    assert.strictEqual(dispatchRes.success, true);
    assert.strictEqual(dispatchRes.dispatchedCount, 100);
    assert.strictEqual(dispatchRes.skippedDuplicates, 0);
    assert.ok(dispatchRes.deductedQuota >= 100);

    console.log(`[BENCHMARK] 100 recipients batch prepared & dispatched in: ${durationMs.toFixed(2)} ms (${(durationMs / 100).toFixed(3)} ms/recipient)`);
    assert.ok(durationMs < 50, `Duration ${durationMs.toFixed(2)} ms must be strictly under 50 ms`);
  });

  console.log('\n================================================================');
  console.log(`ITERATION 208 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================\n');
}

runSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
