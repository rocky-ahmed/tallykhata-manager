/**
 * test_iteration_229_qr_settlement_backend.js
 * Comprehensive Unit and Integration Test Suite for Milestone REA-ITER-229
 * TallyPay QR Merchant Settlement & Direct Soundbox Audio Notification Dispatch Subsystem
 *
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 * Milestone: REA-ITER-229
 */

const assert = require('assert');
const tallyPayService = require('./src/tallyPayService');
const storageRepoModule = require('./src/storageRepository');

const {
  SETTLEMENT_ACTION_TYPES,
  SETTLEMENT_ARSC_TOKENS,
  buildSettlementAction,
  checkSettlementIdempotency,
  processQrPaymentSettlement,
  generatePaymentSpeechPrompt,
  formatTtsSpeech,
  SoundboxConfigManager,
  soundboxConfigManager,
  getSoundboxNotificationConfig,
  updateSoundboxNotificationConfig,
  SoundboxAudioDispatcher,
  ReconstructedSoundboxAudioDispatcher,
  ReconstructedSettlementActionRepository,
  ReconstructedCreditSettlementEngine,
  QrSettlementEngine,
  toBengaliNumerals,
} = tallyPayService;

const {
  StorageRepository,
  createDefaultState,
  sanitizeState,
  saveQrSettlementAction,
  getQrSettlementActions,
  getSettlementActionByTxnNumber,
  markQrSettlementActionsSynced,
} = storageRepoModule;

console.log('='.repeat(80));
console.log('TALLYKHATA ITERATION 229: QR SETTLEMENT & SOUNDBOX BACKEND SUITE');
console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
console.log('Milestone: REA-ITER-229');
console.log('='.repeat(80));

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${desc}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function itAsync(desc, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${desc}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// Memory storage adapter helper
function createMemoryAdapter(initialStore = null) {
  let store = initialStore || createDefaultState();
  return {
    _store: store,
    getItem: async (key) => JSON.stringify(store),
    setItem: async (key, val) => {
      store = JSON.parse(val);
    },
    removeItem: async (key) => {
      store = createDefaultState();
    },
  };
}

(async () => {
  // ============================================================================
  // GROUP 1: Enums, Constants & Authentic ARSC Tokens
  // ============================================================================
  console.log('\n[GROUP 1: Enums, Constants & Authentic ARSC Tokens]');

  it('1.1: SETTLEMENT_ACTION_TYPES defines CREDIT_COLLECTION, DIGITAL_SALE, NO_ACTION', () => {
    assert.strictEqual(SETTLEMENT_ACTION_TYPES.CREDIT_COLLECTION, 'CREDIT_COLLECTION');
    assert.strictEqual(SETTLEMENT_ACTION_TYPES.DIGITAL_SALE, 'DIGITAL_SALE');
    assert.strictEqual(SETTLEMENT_ACTION_TYPES.NO_ACTION, 'NO_ACTION');
    assert.throws(() => { 'use strict'; SETTLEMENT_ACTION_TYPES.NEW_TYPE = 'FAIL'; });
  });

  it('1.2: SETTLEMENT_ARSC_TOKENS contains authentic Bengali string tokens matching reference', () => {
    assert.strictEqual(SETTLEMENT_ARSC_TOKENS.SETTLEMENT_CTA, 'পেমেন্ট সমন্বয় করি');
    assert.strictEqual(SETTLEMENT_ARSC_TOKENS.SETTLEMENT_SUCCESS, 'লেনদেনটি সমন্বয় করা হয়েছে।');
    assert.strictEqual(SETTLEMENT_ARSC_TOKENS.LEDGER_CREDIT_TAG, '(বাকি আদায় সমন্বয়)');
    assert.strictEqual(SETTLEMENT_ARSC_TOKENS.NOTIFICATION_SOUND, 'নোটিফিকেশন সাউন্ড');
    assert.strictEqual(SETTLEMENT_ARSC_TOKENS.VOICE_NOTIFICATION, 'ভয়েস নোটিফিকেশন');
    assert.strictEqual(SETTLEMENT_ARSC_TOKENS.VOICE_ALERT, 'ভয়েসের মাধ্যমে পেমেন্ট এলার্ট');
    assert(SETTLEMENT_ARSC_TOKENS.PAYMENT_RECEIVED_SURECASH_TTS.includes('আপনার শিওরক্যাশ ওয়ালেটে'));
    assert(SETTLEMENT_ARSC_TOKENS.PAYMENT_RECEIVED_TALLYKHATA_TTS.includes('আপনার টালিখাতা ওয়ালেটে'));
  });

  it('1.3: Default Soundbox config adheres to standard sound and TTS settings', () => {
    const config = getSoundboxNotificationConfig('1');
    assert.strictEqual(config.isNotificationSoundChecked, true);
    assert.strictEqual(config.isNotificationTTSChecked, true);
    assert.strictEqual(config.showTTSSetting, true);
    assert.strictEqual(config.engine, 'com.google.android.tts');
    assert.strictEqual(config.locale, 'bn-BD');
  });

  // ============================================================================
  // GROUP 2: DTO Normalization & Validation (buildSettlementAction)
  // ============================================================================
  console.log('\n[GROUP 2: DTO Normalization & Validation]');

  it('2.1: Normalizes complete settlement payload with integer paisa precision', () => {
    const raw = {
      transactionNumber: 'TXN_229_001',
      actionType: 'CREDIT_COLLECTION',
      accountId: 'ACC_101',
      accountName: 'করিম স্টোর',
      amount: 450.50,
      senderMobile: '01712345678',
      senderName: 'রহিম ইসলাম',
      note: 'সকালের চালান পরিশোধ',
      businessId: '1',
    };
    const dto = buildSettlementAction(raw);
    assert.strictEqual(dto.transactionNumber, 'TXN_229_001');
    assert.strictEqual(dto.transaction_number, 'TXN_229_001');
    assert.strictEqual(dto.actionType, 'CREDIT_COLLECTION');
    assert.strictEqual(dto.action_type, 'CREDIT_COLLECTION');
    assert.strictEqual(dto.amount, 450.50);
    assert.strictEqual(dto.amountPaisa, 45050);
    assert.strictEqual(dto.synced, 0);
    assert.strictEqual(dto.businessId, '1');
    assert(dto.createDate);
    assert(dto.create_date);
  });

  it('2.2: Rejects payload with missing or empty transactionNumber', () => {
    assert.throws(() => {
      buildSettlementAction({ actionType: 'NO_ACTION' });
    }, /Transaction number is required/);
    assert.throws(() => {
      buildSettlementAction({ transactionNumber: '   ', actionType: 'NO_ACTION' });
    }, /Transaction number is required/);
  });

  it('2.3: Rejects payload with invalid settlement actionType', () => {
    assert.throws(() => {
      buildSettlementAction({ transactionNumber: 'TXN_002', actionType: 'INVALID_ACTION' });
    }, /Invalid settlement action type/);
  });

  it('2.4: Normalizes amounts accurately from amount, amountPaisa, or amountTaka', () => {
    const dto1 = buildSettlementAction({ transactionNumber: 'T1', amountPaisa: 25000 });
    assert.strictEqual(dto1.amountPaisa, 25000);
    assert.strictEqual(dto1.amount, 250.00);

    const dto2 = buildSettlementAction({ transactionNumber: 'T2', amount: 120.75 });
    assert.strictEqual(dto2.amountPaisa, 12075);
    assert.strictEqual(dto2.amount, 120.75);

    const dto3 = buildSettlementAction({ transactionNumber: 'T3', amountTaka: 80 });
    assert.strictEqual(dto3.amountPaisa, 8000);
    assert.strictEqual(dto3.amount, 80);
  });

  // ============================================================================
  // GROUP 3: Idempotency Validation & Duplicate Protection
  // ============================================================================
  console.log('\n[GROUP 3: Idempotency Validation & Duplicate Protection]');

  await itAsync('3.1: checkSettlementIdempotency detects existing settlement in storage', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    assert.strictEqual(checkSettlementIdempotency(repo, 'TXN_DUP_001', '1'), false);

    await repo.saveQrSettlementAction('1', {
      transactionNumber: 'TXN_DUP_001',
      actionType: 'NO_ACTION',
      amount: 100,
    });

    assert.strictEqual(checkSettlementIdempotency(repo, 'TXN_DUP_001', '1'), true);
  });

  await itAsync('3.2: Rejects duplicate settlement attempt with ALREADY_SETTLED reason', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    const first = await repo.saveQrSettlementAction('1', {
      transactionNumber: 'TXN_UNIQUE_01',
      actionType: 'DIGITAL_SALE',
      amount: 500,
    });
    assert.strictEqual(first.success, true);
    assert.strictEqual(first.duplicate, false);

    const second = await repo.saveQrSettlementAction('1', {
      transactionNumber: 'TXN_UNIQUE_01',
      actionType: 'CREDIT_COLLECTION',
      amount: 500,
    });
    assert.strictEqual(second.success, false);
    assert.strictEqual(second.duplicate, true);
    assert.strictEqual(second.reason, 'ALREADY_SETTLED');
    assert.strictEqual(second.error, 'ALREADY_SETTLED');
  });

  await itAsync('3.3: processQrPaymentSettlement prevents duplicate execution on settled transaction', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    // Register a test customer
    await repo.mutateStore((prev) => {
      const accounts = [...(prev.accounts || [])];
      accounts.push({
        id: 'ACC_DUP_TEST',
        businessId: '1',
        name: 'সাকিব ট্রেডার্স',
        currentBalance: 1000,
        balance: 1000,
      });
      return { ...prev, accounts };
    });

    const res1 = await processQrPaymentSettlement('1', {
      transactionNumber: 'TXN_PROCESS_DUP',
      actionType: 'CREDIT_COLLECTION',
      accountId: 'ACC_DUP_TEST',
      amount: 400,
    }, repo);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.remainingBalance, 600);

    const res2 = await processQrPaymentSettlement('1', {
      transactionNumber: 'TXN_PROCESS_DUP',
      actionType: 'CREDIT_COLLECTION',
      accountId: 'ACC_DUP_TEST',
      amount: 400,
    }, repo);
    assert.strictEqual(res2.success, false);
    assert.strictEqual(res2.duplicate, true);
    assert.strictEqual(res2.reason, 'ALREADY_SETTLED');
  });

  // ============================================================================
  // GROUP 4: Credit Collection Settlement Workflow (CREDIT_COLLECTION)
  // ============================================================================
  console.log('\n[GROUP 4: Credit Collection Settlement Workflow]');

  await itAsync('4.1: Reduces customer credit due balance accurately', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    await repo.mutateStore((prev) => {
      const accounts = [...(prev.accounts || [])];
      accounts.push({
        id: 'ACC_TEST_41',
        businessId: '1',
        name: 'তারেক ব্রাদার্স',
        currentBalance: 1500.00,
        balance: 1500.00,
      });
      return { ...prev, accounts };
    });

    const res = await processQrPaymentSettlement('1', {
      transactionNumber: 'TXN_SETTLE_41',
      actionType: 'CREDIT_COLLECTION',
      accountId: 'ACC_TEST_41',
      amount: 500.00,
    }, repo);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.settledAmount, 500.00);
    assert.strictEqual(res.oldBalance, 1500.00);
    assert.strictEqual(res.remainingBalance, 1000.00);

    const updatedAccount = (repo.currentStore.accounts || []).find((a) => a.id === 'ACC_TEST_41');
    assert.strictEqual(updatedAccount.currentBalance, 1000.00);
    assert.strictEqual(updatedAccount.balance, 1000.00);
  });

  await itAsync('4.2: Inserts journal entry with note and description containing (বাকি আদায় সমন্বয়)', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    await repo.mutateStore((prev) => {
      const accounts = [...(prev.accounts || [])];
      accounts.push({
        id: 'ACC_TEST_42',
        businessId: '1',
        name: 'জাকির স্টোর',
        currentBalance: 800.00,
        balance: 800.00,
      });
      return { ...prev, accounts };
    });

    const res = await processQrPaymentSettlement('1', {
      transactionNumber: 'TXN_SETTLE_42',
      actionType: 'CREDIT_COLLECTION',
      accountId: 'ACC_TEST_42',
      amount: 300.00,
      note: 'বাংলা কিউআর পেমেন্ট',
    }, repo);

    assert.strictEqual(res.success, true);
    assert(res.journalEntry);
    assert.strictEqual(res.journalEntry.txnType, 'PAYMENT_RECEIVED');
    assert.strictEqual(res.journalEntry.amount, 300.00);
    assert(res.journalEntry.note.includes('(বাকি আদায় সমন্বয়)'));
    assert.strictEqual(res.journalEntry.description, '(বাকি আদায় সমন্বয়)');

    const storedJournal = (repo.currentStore.journals || []).find((j) => j.transactionNumber === 'TXN_SETTLE_42');
    assert(storedJournal !== undefined);
    assert.strictEqual(storedJournal.amount, 300.00);
    assert(storedJournal.note.includes('(বাকি আদায় সমন্বয়)'));
  });

  await itAsync('4.3: Records settlement action in qrSettlementActions with actionType CREDIT_COLLECTION', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    await repo.mutateStore((prev) => {
      const accounts = [...(prev.accounts || [])];
      accounts.push({
        id: 'ACC_TEST_43',
        businessId: '1',
        name: 'হাসান ইলেকট্রনিক্স',
        currentBalance: 2000.00,
        balance: 2000.00,
      });
      return { ...prev, accounts };
    });

    await processQrPaymentSettlement('1', {
      transactionNumber: 'TXN_SETTLE_43',
      actionType: 'CREDIT_COLLECTION',
      accountId: 'ACC_TEST_43',
      amount: 750.00,
    }, repo);

    const action = repo.getSettlementActionByTxnNumber('1', 'TXN_SETTLE_43');
    assert(action !== null);
    assert.strictEqual(action.actionType, 'CREDIT_COLLECTION');
    assert.strictEqual(action.amount, 750.00);
    assert.strictEqual(action.amountPaisa, 75000);
    assert.strictEqual(action.synced, 0);
  });

  await itAsync('4.4: Rejects CREDIT_COLLECTION when customer account is not found or missing accountId', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    await assert.rejects(async () => {
      await processQrPaymentSettlement('1', {
        transactionNumber: 'TXN_SETTLE_44A',
        actionType: 'CREDIT_COLLECTION',
        amount: 200,
      }, repo);
    }, /Account ID is required/);

    await assert.rejects(async () => {
      await processQrPaymentSettlement('1', {
        transactionNumber: 'TXN_SETTLE_44B',
        actionType: 'CREDIT_COLLECTION',
        accountId: 'NON_EXISTENT_ACC',
        amount: 200,
      }, repo);
    }, /Account not found/);
  });

  // ============================================================================
  // GROUP 5: Digital Sale & No Action Settlement Workflows
  // ============================================================================
  console.log('\n[GROUP 5: Digital Sale & No Action Settlement Workflows]');

  await itAsync('5.1: DIGITAL_SALE records direct sale revenue entry and logs settlement action', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    const res = await processQrPaymentSettlement('1', {
      transactionNumber: 'TXN_SALE_51',
      actionType: 'DIGITAL_SALE',
      amount: 1200.00,
      senderMobile: '01898765432',
      senderName: 'রুবেল আহমেদ',
    }, repo);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.actionType, 'DIGITAL_SALE');
    assert.strictEqual(res.settledAmount, 1200.00);
    assert.strictEqual(res.settledAmountPaisa, 120000);

    const storedAction = repo.getSettlementActionByTxnNumber('1', 'TXN_SALE_51');
    assert(storedAction !== null);
    assert.strictEqual(storedAction.actionType, 'DIGITAL_SALE');

    const cashEntry = (repo.currentStore.cashEntries || []).find((c) => c.transactionNumber === 'TXN_SALE_51');
    assert(cashEntry !== undefined);
    assert.strictEqual(cashEntry.type, 'in');
    assert.strictEqual(cashEntry.category, 'digital_sale');
    assert.strictEqual(cashEntry.amount, 1200.00);
  });

  await itAsync('5.2: NO_ACTION logs settlement action without altering customer balance or creating journal', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    const prevJournalCount = (repo.currentStore.journals || []).length;
    const prevCashCount = (repo.currentStore.cashEntries || []).length;

    const res = await processQrPaymentSettlement('1', {
      transactionNumber: 'TXN_NOACT_52',
      actionType: 'NO_ACTION',
      amount: 350.00,
    }, repo);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.actionType, 'NO_ACTION');

    const postJournalCount = (repo.currentStore.journals || []).length;
    const postCashCount = (repo.currentStore.cashEntries || []).length;
    assert.strictEqual(postJournalCount, prevJournalCount);
    assert.strictEqual(postCashCount, prevCashCount);

    const storedAction = repo.getSettlementActionByTxnNumber('1', 'TXN_NOACT_52');
    assert(storedAction !== null);
    assert.strictEqual(storedAction.actionType, 'NO_ACTION');
  });

  it('5.3: Pure simulation engine (QrSettlementEngine) executes full settlement lifecycle', () => {
    const engine = new QrSettlementEngine({ isNotificationSoundChecked: true, isNotificationTTSChecked: true });
    engine.registerAccount('ACC_SIM_01', 'কামাল স্টোর', 600.00);

    const res1 = engine.settlePayment('CREDIT_COLLECTION', 'TXN_SIM_01', {
      accountId: 'ACC_SIM_01',
      amountPaisa: 25000,
      senderMobile: '01711223344',
    });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.settledAmount, 250.00);
    assert.strictEqual(res1.remainingBalance, 350.00);

    const resDup = engine.settlePayment('CREDIT_COLLECTION', 'TXN_SIM_01', {
      accountId: 'ACC_SIM_01',
      amountPaisa: 25000,
    });
    assert.strictEqual(resDup.success, false);
    assert.strictEqual(resDup.reason, 'ALREADY_SETTLED');

    const resSale = engine.settlePayment('DIGITAL_SALE', 'TXN_SIM_02', { amountPaisa: 50000 });
    assert.strictEqual(resSale.success, true);
    assert.strictEqual(resSale.settledAmount, 500.00);

    const resNoAct = engine.settlePayment('NO_ACTION', 'TXN_SIM_03');
    assert.strictEqual(resNoAct.success, true);
    assert.strictEqual(resNoAct.actionType, 'NO_ACTION');
  });

  // ============================================================================
  // GROUP 6: Soundbox Voice & Speech Synthesis
  // ============================================================================
  console.log('\n[GROUP 6: Soundbox Voice & Speech Synthesis]');

  it('6.1: generatePaymentSpeechPrompt produces authentic Bengali voice string matching ARSC token', () => {
    const prompt = generatePaymentSpeechPrompt({
      amount: 500,
      senderName: 'সোহেল স্টোর',
    });
    assert.strictEqual(prompt, 'আপনার টালিখাতা ওয়ালেটে ৫০০ টাকা গ্রহণ করা হয়েছে। প্রেরক - সোহেল স্টোর।');
  });

  it('6.2: generatePaymentSpeechPrompt converts amounts to localized Bengali numerals', () => {
    const p1 = generatePaymentSpeechPrompt({ amount: 1234, senderName: 'আলী' });
    assert(p1.includes('১২৩৪ টাকা'));

    const p2 = generatePaymentSpeechPrompt({ amount: 7890.5, senderName: 'মজিবুর' });
    assert(p2.includes('৭৮৯০.৫ টাকা'));
  });

  it('6.3: formatTtsSpeech produces authentic SureCash voice string matching reference bytecode', () => {
    const tts = formatTtsSpeech(350, 'রহিম স্টোর', 'TXN_001');
    assert.strictEqual(tts, 'আপনার শিওরক্যাশ ওয়ালেটে ৩৫০ টাকা গ্রহণ করা হয়েছে। প্রেরক - রহিম স্টোর। Txn ID: TXN_001');
  });

  it('6.4: generatePaymentSpeechPrompt supports English localization (lang = "en")', () => {
    const pEn = generatePaymentSpeechPrompt({
      amount: 750,
      senderName: 'Kamal Enterprise',
      txnId: 'TXN_EN_01',
    }, 'en');
    assert.strictEqual(pEn, 'Payment of 750 Taka received in your TallyKhata wallet. Sender - Kamal Enterprise. Txn ID: TXN_EN_01');
  });

  // ============================================================================
  // GROUP 7: Soundbox Audio Dispatcher & Config Manager
  // ============================================================================
  console.log('\n[GROUP 7: Soundbox Audio Dispatcher & Config Manager]');

  it('7.1: SoundboxConfigManager retrieves and updates per-business sound and TTS toggles', () => {
    const mgr = new SoundboxConfigManager();
    const c1 = mgr.getConfig('biz_1');
    assert.strictEqual(c1.isNotificationSoundChecked, true);
    assert.strictEqual(c1.isNotificationTTSChecked, true);

    const updated = mgr.updateConfig('biz_1', {
      isNotificationSoundChecked: false,
      isNotificationTTSChecked: true,
    });
    assert.strictEqual(updated.isNotificationSoundChecked, false);
    assert.strictEqual(updated.isNotificationTTSChecked, true);

    const recheck = mgr.getConfig('biz_1');
    assert.strictEqual(recheck.isNotificationSoundChecked, false);
  });

  it('7.2: SoundboxAudioDispatcher dispatches both tone and TTS when both toggles enabled', () => {
    const dispatcher = new SoundboxAudioDispatcher({
      isNotificationSoundChecked: true,
      isNotificationTTSChecked: true,
    });

    const res = dispatcher.dispatchPaymentNotification({
      amountTaka: 500,
      senderName: 'ফারুক ফ্যাশন',
      txnId: 'TXN_SND_01',
    });

    assert.strictEqual(res.soundEnabled, true);
    assert.strictEqual(res.ttsEnabled, true);
    assert.strictEqual(res.actions.length, 2);
    assert.strictEqual(res.actions[0].type, 'NOTIFICATION_TONE');
    assert.strictEqual(res.actions[0].soundAsset, 'res/raw/zxing_beep.ogg');
    assert.strictEqual(res.actions[1].type, 'TTS_SPEECH');
    assert.strictEqual(res.actions[1].engine, 'com.google.android.tts');
    assert.strictEqual(res.actions[1].locale, 'bn-BD');
    assert(res.actions[1].text.includes('৫০০ টাকা'));
  });

  it('7.3: Dispatches tone only when TTS disabled', () => {
    const dispatcher = new SoundboxAudioDispatcher({
      isNotificationSoundChecked: true,
      isNotificationTTSChecked: false,
    });

    const res = dispatcher.dispatchPaymentNotification({
      amountTaka: 250,
      senderName: 'আরিফ ট্রেডার্স',
      txnId: 'TXN_SND_02',
    });

    assert.strictEqual(res.soundEnabled, true);
    assert.strictEqual(res.ttsEnabled, false);
    assert.strictEqual(res.actions.length, 1);
    assert.strictEqual(res.actions[0].type, 'NOTIFICATION_TONE');
  });

  it('7.4: Dispatches neither when both toggles disabled', () => {
    const dispatcher = new SoundboxAudioDispatcher({
      isNotificationSoundChecked: false,
      isNotificationTTSChecked: false,
    });

    const res = dispatcher.dispatchPaymentNotification({
      amountTaka: 100,
      senderName: 'নাঈম স্টোর',
      txnId: 'TXN_SND_03',
    });

    assert.strictEqual(res.actions.length, 0);
  });

  // ============================================================================
  // GROUP 8: Storage Repository CRUD & Multi-Tenant Isolation
  // ============================================================================
  console.log('\n[GROUP 8: Storage Repository CRUD & Multi-Tenant Isolation]');

  await itAsync('8.1: StorageRepository.saveQrSettlementAction records settlement actions atomically', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    const res = await repo.saveQrSettlementAction('1', {
      transactionNumber: 'TXN_CRUD_01',
      actionType: 'CREDIT_COLLECTION',
      accountId: 'ACC_01',
      accountName: 'মেহেদী হার্ডওয়্যার',
      amount: 1500.00,
      senderMobile: '01911223344',
      senderName: 'মেহেদী হাসান',
      note: 'বাকির টাকা পরিশোধ',
    });

    assert.strictEqual(res.success, true);
    assert(res.id);
    assert.strictEqual(res.action.transactionNumber, 'TXN_CRUD_01');
    assert.strictEqual(res.action.amount, 1500.00);
    assert.strictEqual(res.action.amountPaisa, 150000);
    assert.strictEqual(res.action.synced, 0);
  });

  await itAsync('8.2: getQrSettlementActions filters by actionType, synced status, search query, and paginates', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    await repo.saveQrSettlementAction('1', { transactionNumber: 'T_FILTER_1', actionType: 'CREDIT_COLLECTION', accountName: 'রহিম', amount: 100 });
    await repo.saveQrSettlementAction('1', { transactionNumber: 'T_FILTER_2', actionType: 'DIGITAL_SALE', accountName: 'করিম', amount: 200 });
    await repo.saveQrSettlementAction('1', { transactionNumber: 'T_FILTER_3', actionType: 'NO_ACTION', accountName: 'জামাল', amount: 300 });

    const all = repo.getQrSettlementActions('1');
    assert.strictEqual(all.totalCount, 3);

    const creditOnly = repo.getQrSettlementActions('1', { actionType: 'CREDIT_COLLECTION' });
    assert.strictEqual(creditOnly.totalCount, 1);
    assert.strictEqual(creditOnly.items[0].transactionNumber, 'T_FILTER_1');

    const searchRes = repo.getQrSettlementActions('1', { search: 'করিম' });
    assert.strictEqual(searchRes.totalCount, 1);
    assert.strictEqual(searchRes.items[0].transactionNumber, 'T_FILTER_2');

    const paged = repo.getQrSettlementActions('1', { offset: 1, limit: 1 });
    assert.strictEqual(paged.items.length, 1);
    assert.strictEqual(paged.hasMore, true);
  });

  await itAsync('8.3: getSettlementActionByTxnNumber retrieves matching record by transactionNumber', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    await repo.saveQrSettlementAction('1', {
      transactionNumber: 'TXN_FIND_ME',
      actionType: 'DIGITAL_SALE',
      amount: 420.00,
    });

    const found = repo.getSettlementActionByTxnNumber('1', 'TXN_FIND_ME');
    assert(found !== null);
    assert.strictEqual(found.transactionNumber, 'TXN_FIND_ME');
    assert.strictEqual(found.amount, 420.00);

    const notFound = repo.getSettlementActionByTxnNumber('1', 'NON_EXISTENT');
    assert.strictEqual(notFound, null);
  });

  await itAsync('8.4: Multi-tenant business isolation: Business 1 and Business 2 settlements never collide', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    await repo.saveQrSettlementAction('1', { transactionNumber: 'TXN_BIZ1_01', actionType: 'DIGITAL_SALE', amount: 100 });
    await repo.saveQrSettlementAction('2', { transactionNumber: 'TXN_BIZ2_01', actionType: 'DIGITAL_SALE', amount: 200 });

    const biz1Actions = repo.getQrSettlementActions('1');
    const biz2Actions = repo.getQrSettlementActions('2');

    assert.strictEqual(biz1Actions.totalCount, 1);
    assert.strictEqual(biz1Actions.items[0].transactionNumber, 'TXN_BIZ1_01');

    assert.strictEqual(biz2Actions.totalCount, 1);
    assert.strictEqual(biz2Actions.items[0].transactionNumber, 'TXN_BIZ2_01');

    assert.strictEqual(repo.getSettlementActionByTxnNumber('1', 'TXN_BIZ2_01'), null);
    assert.strictEqual(repo.getSettlementActionByTxnNumber('2', 'TXN_BIZ1_01'), null);
  });

  // ============================================================================
  // GROUP 9: Cascade Deletion & State Sanitization
  // ============================================================================
  console.log('\n[GROUP 9: Cascade Deletion & State Sanitization]');

  await itAsync('9.1: deleteBusinessCascade purges qrSettlementActions for deleted business only', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    // Create business 2
    await repo.mutateStore((prev) => {
      const businesses = [...prev.businesses, { id: '2', name: 'Second Shop', isArchived: false }];
      return { ...prev, businesses };
    });

    await repo.saveQrSettlementAction('1', { transactionNumber: 'TXN_KEEP', actionType: 'DIGITAL_SALE', amount: 100 });
    await repo.saveQrSettlementAction('2', { transactionNumber: 'TXN_PURGE', actionType: 'DIGITAL_SALE', amount: 200 });

    assert.strictEqual(repo.getQrSettlementActions('2').totalCount, 1);

    // Delete business 2 cascade
    await repo.deleteBusinessCascade('2');

    assert.strictEqual(repo.getQrSettlementActions('2').totalCount, 0);
    assert.strictEqual(repo.getQrSettlementActions('1').totalCount, 1);
    assert.strictEqual(repo.getSettlementActionByTxnNumber('1', 'TXN_KEEP').amount, 100);
  });

  await itAsync('9.2: markQrSettlementActionsSynced updates sync status accurately', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    const a1 = await repo.saveQrSettlementAction('1', { transactionNumber: 'TXN_SYNC_1', actionType: 'NO_ACTION' });
    const a2 = await repo.saveQrSettlementAction('1', { transactionNumber: 'TXN_SYNC_2', actionType: 'NO_ACTION' });

    assert.strictEqual(repo.getQrSettlementActions('1', { synced: 0 }).totalCount, 2);

    const syncRes = await repo.markQrSettlementActionsSynced('1', [a1.id]);
    assert.strictEqual(syncRes.success, true);
    assert.strictEqual(syncRes.count, 1);

    assert.strictEqual(repo.getQrSettlementActions('1', { synced: 1 }).totalCount, 1);
    assert.strictEqual(repo.getQrSettlementActions('1', { synced: 0 }).totalCount, 1);
  });

  it('9.3: sanitizeState guarantees qrSettlementActions is initialized to an array', () => {
    const s1 = sanitizeState({});
    assert(Array.isArray(s1.qrSettlementActions));
    assert.strictEqual(s1.qrSettlementActions.length, 0);

    const s2 = sanitizeState({ qrSettlementActions: 'corrupt' });
    assert(Array.isArray(s2.qrSettlementActions));
    assert.strictEqual(s2.qrSettlementActions.length, 0);

    const validItem = { id: 1, transactionNumber: 'TXN_VALID' };
    const s3 = sanitizeState({ qrSettlementActions: [validItem] });
    assert.strictEqual(s3.qrSettlementActions.length, 1);
    assert.strictEqual(s3.qrSettlementActions[0].transactionNumber, 'TXN_VALID');
  });

  // ============================================================================
  // GROUP 10: Backup/Restore Serialization & Latency Benchmark
  // ============================================================================
  console.log('\n[GROUP 10: Backup/Restore Serialization & Latency Benchmark]');

  await itAsync('10.1: getFullBackupState sanitizes credentials, PINs, and tokens from qrSettlementActions', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    await repo.saveQrSettlementAction('1', {
      transactionNumber: 'TXN_BACKUP_01',
      actionType: 'CREDIT_COLLECTION',
      pin: '1234',
      token: 'secret_token_123',
      apiKey: 'api_key_456',
      amount: 500,
    });

    const backup = await repo.getFullBackupState();
    const backupState = backup.data || backup;
    assert(backupState);
    assert(Array.isArray(backupState.qrSettlementActions));
    const item = backupState.qrSettlementActions.find((q) => q.transactionNumber === 'TXN_BACKUP_01');
    assert(item !== undefined);
    assert.strictEqual(item.amount, 500);
    assert.strictEqual(item.pin, undefined);
    assert.strictEqual(item.token, undefined);
    assert.strictEqual(item.apiKey, undefined);
  });

  await itAsync('10.2: commitRestorePayload restores qrSettlementActions in full restore', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    const payload = {
      manifest: { version: 6 },
      data: {
        ...createDefaultState(),
        activeBusinessId: '1',
        qrSettlementActions: [
          { id: 101, transactionNumber: 'TXN_RESTORED_01', actionType: 'DIGITAL_SALE', amount: 350, businessId: '1' },
          { id: 102, transactionNumber: 'TXN_RESTORED_02', actionType: 'NO_ACTION', amount: 150, businessId: '1' },
        ],
      },
    };

    const res = await repo.commitRestorePayload(payload);
    assert.strictEqual(res.success, true);

    const actions = repo.getQrSettlementActions('1');
    assert.strictEqual(actions.totalCount, 2);
    assert.strictEqual(repo.getSettlementActionByTxnNumber('1', 'TXN_RESTORED_01').amount, 350);
  });

  await itAsync('10.3: commitRestorePayload selective tenant restore imports target business only', async () => {
    const adapter = createMemoryAdapter();
    const repo = new StorageRepository(adapter);
    await repo.initStore();

    await repo.saveQrSettlementAction('1', { transactionNumber: 'TXN_KEEP_SELECTIVE', actionType: 'DIGITAL_SALE', amount: 100 });

    const payload = {
      manifest: { version: 6 },
      data: {
        ...createDefaultState(),
        qrSettlementActions: [
          { id: 201, transactionNumber: 'TXN_IMPORTED_B1', actionType: 'DIGITAL_SALE', amount: 777, businessId: '1' },
          { id: 202, transactionNumber: 'TXN_IMPORTED_B2', actionType: 'DIGITAL_SALE', amount: 888, businessId: '2' },
        ],
      },
    };

    // Restore selectively for business '2'
    await repo.commitRestorePayload(payload, { selectedBusinessId: '2' });

    // Business 1 should still have its original action
    const b1Actions = repo.getQrSettlementActions('1');
    assert.strictEqual(b1Actions.totalCount, 1);
    assert.strictEqual(b1Actions.items[0].transactionNumber, 'TXN_KEEP_SELECTIVE');

    // Business 2 should only have imported action for business 2
    const b2Actions = repo.getQrSettlementActions('2');
    assert.strictEqual(b2Actions.totalCount, 1);
    assert.strictEqual(b2Actions.items[0].transactionNumber, 'TXN_IMPORTED_B2');
  });

  await itAsync('10.4: Latency benchmark: 1,000 settlement operations executed in < 200ms (< 0.2ms/op)', async () => {
    const engine = new QrSettlementEngine({ isNotificationSoundChecked: true, isNotificationTTSChecked: true });
    engine.registerAccount('ACC_BENCH', 'বেঞ্চমার্ক গ্রাহক', 100000.00);

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      const txnNumber = 'TXN_BENCH_' + i;
      engine.settlePayment('CREDIT_COLLECTION', txnNumber, {
        accountId: 'ACC_BENCH',
        amountPaisa: 1000,
        senderMobile: '01700000000',
      });
      engine.dispatchSoundboxNotification({
        amountTaka: 10,
        senderName: 'গ্রাহক',
        txnId: txnNumber,
      });
    }
    const elapsed = Date.now() - start;
    console.log(`    -> 1,000 settlement & soundbox operations in ${elapsed}ms (${(elapsed / 1000).toFixed(4)}ms/op)`);
    assert(elapsed < 200, `Benchmark exceeded budget: ${elapsed}ms >= 200ms`);
  });

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests} (100% SUCCESS)`);
  console.log('='.repeat(80));
})();
