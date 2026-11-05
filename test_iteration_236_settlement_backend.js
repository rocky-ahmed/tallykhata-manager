/**
 * ============================================================================
 * TEST SUITE: Milestone REA-ITER-236 — TallyPay Merchant Settlement Automation &
 * QR Soundbox Hardware Diagnostics Backend Suite
 * ============================================================================
 * Verification coverage:
 * - Group 1: Enums, Constants & SQLite Schema Invariants
 * - Group 2: BLE Diagnostics State Machine Transitions & Resilience
 * - Group 3: Hardware Telemetry, Battery Curves & Signal Health
 * - Group 4: Soundbox Binary Packet Serialization & CRC-16 Modbus
 * - Group 5: Dual Audio Routing & Bengali Voice Announcement Verbalizer
 * - Group 6: Payout Fee Calculation (NPSB Instant vs BEFTN Regular)
 * - Group 7: Settlement Automation Engine & Customer Debt Auto-Matching
 * - Group 8: Transaction Settlement Action DAO Queries & Sync State Machine
 * - Group 9: Multi-Tenant StorageRepository Persistence & Cascade Deletion
 * - Group 10: Cloud Backup State Sanitization & Performance Benchmark
 * ============================================================================
 */

const assert = require('assert');
const {
  TRANSACTION_SETTLEMENT_ACTION_SCHEMA,
  TKEnum$TransactionSettlementAction,
  TRANSACTION_SETTLEMENT_ACTIONS,
  TransactionSettlementActionType,
  SETTLEMENT_SOUNDBOX_ARSC_TOKENS,
  BLE_STATES,
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_CHAR_UUID,
  SOUNDBOX_SERVICE_UUID,
  SOUNDBOX_CMD_CHAR_UUID,
  AUDIO_OUTPUT_SINKS,
  SETTLEMENT_PAYOUT_RULES,
  transitionBleState,
  evaluateRssiHealth,
  evaluateBatteryTelemetry,
  syncSoundboxVolume,
  buildSoundboxCommandPacket,
  resolveAudioOutputSink,
  toBengaliDigits,
  generateBengaliVoiceAnnouncement,
  calculateSettlementPayoutFee,
  TransactionSettlementAction,
  TransactionSettlementActionDao,
  SettlementAutomationEngine,
  SoundboxBleDiagnosticsService,
} = require('./src/tallyPayService');

const {
  storageRepository,
  saveTransactionSettlementAction,
  getTransactionSettlementActions,
  getTransactionSettlementActionByTxn,
  existsTransactionSettlementAction,
  getUnsyncedTxnSettlementActions,
  updateTxnSettlementActionSyncStatusByIds,
  updateAllTxnSettlementActionUnsynced,
  saveSettlementHistoryRecord,
  getSettlementHistory,
  saveSoundboxConfig,
  getSoundboxConfig,
  VALID_COLLECTIONS,
} = require('./src/storageRepository');

let totalTests = 0;
function test(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Test ${totalTests}: ${desc}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function asyncTest(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] Test ${totalTests}: ${desc}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAllTests() {
  console.log('==================================================================');
  console.log(' REA-ITER-236: TALLYPAY SETTLEMENT & SOUNDBOX BACKEND TEST SUITE');
  console.log('==================================================================');

  // ============================================================================
  // GROUP 1: Enums, Constants & SQLite Schema Invariants
  // ============================================================================
  console.log('\n[GROUP 1: Enums, Constants & SQLite Schema Invariants]');

  test('Schema defines table name transaction_settlement_action', () => {
    assert.strictEqual(TRANSACTION_SETTLEMENT_ACTION_SCHEMA.tableName, 'transaction_settlement_action');
    assert.ok(TRANSACTION_SETTLEMENT_ACTION_SCHEMA.columns.includes('transaction_number'));
    assert.ok(TRANSACTION_SETTLEMENT_ACTION_SCHEMA.columns.includes('action_type'));
    assert.ok(TRANSACTION_SETTLEMENT_ACTION_SCHEMA.columns.includes('synced'));
    assert.ok(TRANSACTION_SETTLEMENT_ACTION_SCHEMA.columns.includes('create_date'));
    assert.ok(TRANSACTION_SETTLEMENT_ACTION_SCHEMA.columns.includes('update_date'));
    assert.strictEqual(TRANSACTION_SETTLEMENT_ACTION_SCHEMA.uniqueIndex, 'index_transaction_number');
  });

  test('Enum defines DIGITAL_SALE, CREDIT_COLLECTION, and NO_ACTION', () => {
    assert.strictEqual(TKEnum$TransactionSettlementAction.DIGITAL_SALE, 'DIGITAL_SALE');
    assert.strictEqual(TKEnum$TransactionSettlementAction.CREDIT_COLLECTION, 'CREDIT_COLLECTION');
    assert.strictEqual(TKEnum$TransactionSettlementAction.NO_ACTION, 'NO_ACTION');
    assert.strictEqual(TRANSACTION_SETTLEMENT_ACTIONS.DIGITAL_SALE, 'DIGITAL_SALE');
    assert.strictEqual(TransactionSettlementActionType.CREDIT_COLLECTION, 'CREDIT_COLLECTION');
  });

  test('SETTLEMENT_SOUNDBOX_ARSC_TOKENS defines authentic Bengali tokens', () => {
    assert.strictEqual(SETTLEMENT_SOUNDBOX_ARSC_TOKENS.SC_CREDIT_SETTLEMENT, '(বাকি আদায় সমন্বয়)');
    assert.strictEqual(SETTLEMENT_SOUNDBOX_ARSC_TOKENS.SETTLE_PAYMENT_ACTION, 'পেমেন্ট সমন্বয় করি');
    assert.strictEqual(SETTLEMENT_SOUNDBOX_ARSC_TOKENS.INVALID_SETTLE_AMOUNT, 'পেমেন্টের পরিমাণ ০ হতে পারে না।');
    assert.strictEqual(SETTLEMENT_SOUNDBOX_ARSC_TOKENS.SELECT_PAYMENT_MODE, 'পেমেন্টের মাধ্যম সিলেক্ট করি');
    assert.strictEqual(SETTLEMENT_SOUNDBOX_ARSC_TOKENS.PAYMENT_RECEIVED_WALLET, 'পেলাম (ওয়ালেট)');
    assert.strictEqual(SETTLEMENT_SOUNDBOX_ARSC_TOKENS.PREVIOUS_BALANCE_PREFIX, 'সর্বশেষ ');
  });

  test('BLE GATT UUID constants conform to Bluetooth SIG & custom specs', () => {
    assert.ok(BATTERY_SERVICE_UUID.startsWith('0000180F'));
    assert.ok(BATTERY_LEVEL_CHAR_UUID.startsWith('00002A19'));
    assert.ok(SOUNDBOX_SERVICE_UUID.startsWith('0000FFE0'));
    assert.ok(SOUNDBOX_CMD_CHAR_UUID.startsWith('0000FFE1'));
  });

  test('AUDIO_OUTPUT_SINKS defines expected audio routing targets', () => {
    assert.strictEqual(AUDIO_OUTPUT_SINKS.HARDWARE_BLE_SOUNDBOX, 'HARDWARE_BLE_SOUNDBOX');
    assert.strictEqual(AUDIO_OUTPUT_SINKS.SOFTWARE_IN_APP_TTS, 'SOFTWARE_IN_APP_TTS');
    assert.strictEqual(AUDIO_OUTPUT_SINKS.SILENT_OR_VIBRATE, 'SILENT_OR_VIBRATE');
  });

  test('Collections registered in VALID_COLLECTIONS set', () => {
    assert.ok(VALID_COLLECTIONS.has('transactionSettlementActions'));
    assert.ok(VALID_COLLECTIONS.has('settlementHistory'));
    assert.ok(VALID_COLLECTIONS.has('soundboxConfig'));
  });

  // ============================================================================
  // GROUP 2: BLE Diagnostics State Machine Transitions & Resilience
  // ============================================================================
  console.log('\n[GROUP 2: BLE Diagnostics State Machine Transitions & Resilience]');

  test('transitionBleState handles happy-path connection', () => {
    let state = BLE_STATES.DISCONNECTED;
    state = transitionBleState(state, 'START_SCAN');
    assert.strictEqual(state, BLE_STATES.SCANNING);
    state = transitionBleState(state, 'DEVICE_FOUND');
    assert.strictEqual(state, BLE_STATES.CONNECTING);
    state = transitionBleState(state, 'GATT_CONNECTED');
    assert.strictEqual(state, BLE_STATES.CONNECTED);
  });

  test('transitionBleState handles link loss and automatic reconnection', () => {
    let state = BLE_STATES.CONNECTED;
    state = transitionBleState(state, 'LINK_LOSS');
    assert.strictEqual(state, BLE_STATES.RECONNECTING);
    state = transitionBleState(state, 'GATT_RECONNECTED');
    assert.strictEqual(state, BLE_STATES.CONNECTED);
  });

  test('transitionBleState handles retry exhaustion and error resets', () => {
    let state = BLE_STATES.RECONNECTING;
    state = transitionBleState(state, 'MAX_RETRIES_EXCEEDED');
    assert.strictEqual(state, BLE_STATES.DISCONNECTED);

    let errState = BLE_STATES.CONNECTING;
    errState = transitionBleState(errState, 'FAILED');
    assert.strictEqual(errState, BLE_STATES.ERROR);
    errState = transitionBleState(errState, 'RESET');
    assert.strictEqual(errState, BLE_STATES.DISCONNECTED);
  });

  test('SoundboxBleDiagnosticsService tracks lifecycle transitions and retries', () => {
    const sb = new SoundboxBleDiagnosticsService({ deviceId: 'SB-TEST-001', maxRetries: 3 });
    assert.strictEqual(sb.state, BLE_STATES.DISCONNECTED);
    sb.startScan();
    assert.strictEqual(sb.state, BLE_STATES.SCANNING);
    sb.deviceFound();
    assert.strictEqual(sb.state, BLE_STATES.CONNECTING);
    sb.connect();
    assert.strictEqual(sb.state, BLE_STATES.CONNECTED);
    assert.ok(sb.connectedTimestamp > 0);

    // Simulate 3 link losses
    sb.linkLoss();
    assert.strictEqual(sb.state, BLE_STATES.RECONNECTING);
    assert.strictEqual(sb.retries, 1);
    sb.linkLoss();
    assert.strictEqual(sb.retries, 2);
    sb.linkLoss();
    assert.strictEqual(sb.retries, 3);
    // Exceed max retries
    sb.linkLoss();
    assert.strictEqual(sb.state, BLE_STATES.DISCONNECTED);
  });

  // ============================================================================
  // GROUP 3: Hardware Telemetry, Battery Curves & Signal Health
  // ============================================================================
  console.log('\n[GROUP 3: Hardware Telemetry, Battery Curves & Signal Health]');

  test('evaluateRssiHealth categorizes RSSI signal quality', () => {
    assert.deepStrictEqual(evaluateRssiHealth(-55), { quality: 'EXCELLENT', bars: 4, reliable: true });
    assert.deepStrictEqual(evaluateRssiHealth(-60), { quality: 'EXCELLENT', bars: 4, reliable: true });
    assert.deepStrictEqual(evaluateRssiHealth(-70), { quality: 'GOOD', bars: 3, reliable: true });
    assert.deepStrictEqual(evaluateRssiHealth(-80), { quality: 'FAIR', bars: 2, reliable: true });
    assert.deepStrictEqual(evaluateRssiHealth(-90), { quality: 'POOR', bars: 1, reliable: false });
  });

  test('evaluateBatteryTelemetry accurately computes percentage and thresholds', () => {
    const b100 = evaluateBatteryTelemetry(4200, false);
    assert.strictEqual(b100.percentage, 100);
    assert.strictEqual(b100.statusText, 'NORMAL');

    const b50 = evaluateBatteryTelemetry(3700, false);
    assert.strictEqual(b50.percentage, 50);

    const b15 = evaluateBatteryTelemetry(3350, false);
    assert.strictEqual(b15.isLow, true);
    assert.strictEqual(b15.statusText, 'LOW_BATTERY');

    const bCritical = evaluateBatteryTelemetry(3220, false);
    assert.strictEqual(bCritical.isCritical, true);
    assert.strictEqual(bCritical.statusText, 'CRITICAL');

    const bCharging = evaluateBatteryTelemetry(3250, true);
    assert.strictEqual(bCharging.isCharging, true);
    assert.strictEqual(bCharging.statusText, 'CHARGING');
  });

  test('syncSoundboxVolume enforces 16 discrete steps (0-15)', () => {
    const v0 = syncSoundboxVolume(0);
    assert.strictEqual(v0.step, 0);
    assert.strictEqual(v0.dutyPct, 0);
    assert.strictEqual(v0.hexCmd, '0x00');

    const v15 = syncSoundboxVolume(15);
    assert.strictEqual(v15.step, 15);
    assert.strictEqual(v15.dutyPct, 100);
    assert.strictEqual(v15.hexCmd, '0x0F');

    const vMid = syncSoundboxVolume(8);
    assert.strictEqual(vMid.step, 8);
    assert.strictEqual(vMid.dutyPct, 53);

    const vClampHigh = syncSoundboxVolume(99);
    assert.strictEqual(vClampHigh.step, 15);

    const vClampLow = syncSoundboxVolume(-5);
    assert.strictEqual(vClampLow.step, 0);
  });

  // ============================================================================
  // GROUP 4: Soundbox Binary Packet Serialization & CRC-16 Modbus
  // ============================================================================
  console.log('\n[GROUP 4: Soundbox Binary Packet Serialization & CRC-16 Modbus]');

  test('buildSoundboxCommandPacket encodes 16-byte buffer with correct headers', () => {
    const pkt = buildSoundboxCommandPacket(50000, 1);
    assert.strictEqual(pkt.length, 16);
    assert.strictEqual(pkt[0], 0xAA);
    assert.strictEqual(pkt[1], 0x55);
    assert.strictEqual(pkt[2], 0x01); // opcode
    assert.strictEqual(pkt[3], 0x01); // currency (BDT)
    assert.strictEqual(pkt[4], 0x01); // channel code
    assert.strictEqual(Number(pkt.readBigUInt64BE(5)), 50000);
    assert.strictEqual(pkt[15], 0x00);
  });

  test('buildSoundboxCommandPacket validates CRC-16 Modbus checksum', () => {
    const pkt = buildSoundboxCommandPacket(100000, 2);
    // Recalculate CRC-16 on first 13 bytes
    let crc = 0xFFFF;
    for (let i = 0; i < 13; i++) {
      crc ^= pkt[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 1) crc = (crc >> 1) ^ 0xA001;
        else crc = crc >> 1;
      }
    }
    const storedCrc = pkt.readUInt16LE(13);
    assert.strictEqual(storedCrc, crc);
  });

  test('SoundboxBleDiagnosticsService dispatches payment packet with telemetry', () => {
    const sb = new SoundboxBleDiagnosticsService();
    sb.connect();
    sb.setBattery(4000);
    const res = sb.dispatchPaymentPacket(75000, 1, true);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.sink, 'HARDWARE_BLE_SOUNDBOX');
    assert.strictEqual(res.packet.length, 16);
    assert.ok(res.voiceAnnouncement.includes('টাকা'));
    assert.ok(sb.lastPacketSent !== null);
  });

  // ============================================================================
  // GROUP 5: Dual Audio Routing & Bengali Voice Announcement Verbalizer
  // ============================================================================
  console.log('\n[GROUP 5: Dual Audio Routing & Bengali Voice Announcement Verbalizer]');

  test('resolveAudioOutputSink routes based on hardware health and preferences', () => {
    assert.strictEqual(resolveAudioOutputSink(true, 80, true), AUDIO_OUTPUT_SINKS.HARDWARE_BLE_SOUNDBOX);
    assert.strictEqual(resolveAudioOutputSink(true, 5, true), AUDIO_OUTPUT_SINKS.SOFTWARE_IN_APP_TTS);
    assert.strictEqual(resolveAudioOutputSink(false, 90, true), AUDIO_OUTPUT_SINKS.SOFTWARE_IN_APP_TTS);
    assert.strictEqual(resolveAudioOutputSink(false, 90, false), AUDIO_OUTPUT_SINKS.SILENT_OR_VIBRATE);
    assert.strictEqual(resolveAudioOutputSink(true, 5, false), AUDIO_OUTPUT_SINKS.SILENT_OR_VIBRATE);
  });

  test('toBengaliDigits converts numeric strings correctly', () => {
    assert.strictEqual(toBengaliDigits('0123456789'), '০১২৩৪৫৬৭৮৯');
    assert.strictEqual(toBengaliDigits(1500), '১৫০০');
    assert.strictEqual(toBengaliDigits(0), '০');
  });

  test('generateBengaliVoiceAnnouncement produces authentic pronunciation phrases', () => {
    const v50 = generateBengaliVoiceAnnouncement(5000);
    assert.strictEqual(v50.announcementPhrase, 'টালিপে-তে পঞ্চাশ টাকা পাওয়া গেছে');

    const v100 = generateBengaliVoiceAnnouncement(10000);
    assert.strictEqual(v100.announcementPhrase, 'টালিপে-তে এক শত টাকা পাওয়া গেছে');

    const v500 = generateBengaliVoiceAnnouncement(50000);
    assert.strictEqual(v500.announcementPhrase, 'টালিপে-তে পাঁচ শত টাকা পাওয়া গেছে');

    const v1000 = generateBengaliVoiceAnnouncement(100000);
    assert.strictEqual(v1000.announcementPhrase, 'টালিপে-তে এক হাজার টাকা পাওয়া গেছে');

    const vCustom = generateBengaliVoiceAnnouncement(25000, 'ওয়ালেট');
    assert.strictEqual(vCustom.announcementPhrase, 'ওয়ালেট-তে ২৫০ টাকা পাওয়া গেছে');

    const vFractional = generateBengaliVoiceAnnouncement(7550);
    assert.ok(vFractional.announcementPhrase.includes('৭৫ টাকা ৫০ পয়সা পাওয়া গেছে'));
  });

  // ============================================================================
  // GROUP 6: Payout Fee Calculation (NPSB Instant vs BEFTN Regular)
  // ============================================================================
  console.log('\n[GROUP 6: Payout Fee Calculation (NPSB Instant vs BEFTN Regular)]');

  test('calculateSettlementPayoutFee computes zero fees for regular BEFTN', () => {
    const res = calculateSettlementPayoutFee(100000, false);
    assert.strictEqual(res.amountPaisa, 100000);
    assert.strictEqual(res.feePaisa, 0);
    assert.strictEqual(res.netPayoutPaisa, 100000);
    assert.strictEqual(res.mode, 'BEFTN_REGULAR');
  });

  test('calculateSettlementPayoutFee enforces minimum ৳10 fee on small NPSB transfers', () => {
    const resSmall = calculateSettlementPayoutFee(20000, true); // ৳200 -> 1% is ৳2 (200p), min is ৳10 (1000p)
    assert.strictEqual(resSmall.feePaisa, 1000);
    assert.strictEqual(resSmall.netPayoutPaisa, 19000);
    assert.strictEqual(resSmall.feeTaka, 10);
    assert.strictEqual(resSmall.netPayoutTaka, 190);
  });

  test('calculateSettlementPayoutFee computes exact 1.0% fee on large NPSB transfers', () => {
    const resLarge = calculateSettlementPayoutFee(500000, true); // ৳5,000 -> 1% is ৳50 (5000p)
    assert.strictEqual(resLarge.feePaisa, 5000);
    assert.strictEqual(resLarge.netPayoutPaisa, 495000);
    assert.strictEqual(resLarge.feeTaka, 50);
    assert.strictEqual(resLarge.netPayoutTaka, 4950);
  });

  // ============================================================================
  // GROUP 7: Settlement Automation Engine & Customer Debt Auto-Matching
  // ============================================================================
  console.log('\n[GROUP 7: Settlement Automation Engine & Customer Debt Auto-Matching]');

  test('SettlementAutomationEngine auto-matches customer debt as CREDIT_COLLECTION', () => {
    const engine = new SettlementAutomationEngine();
    engine.addCustomer('C-01', 'আনোয়ার ব্রাদার্স', '01711000001', 200000); // ৳2,000 due

    const res = engine.processIncomingTransaction({
      transactionNumber: 'TXN-AUTO-01',
      amountPaisa: 50000, // ৳500
      senderMobile: '01711000001',
      channel: 'টালিপে',
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.actionType, 'CREDIT_COLLECTION');
    assert.strictEqual(res.customerRemainingDuePaisa, 150000);
    assert.strictEqual(engine.journal.length, 1);
    assert.strictEqual(engine.journal[0].txnType, 2);
    assert.strictEqual(engine.journal[0].amountReceived, 500);
  });

  test('SettlementAutomationEngine settles customer without debt as DIGITAL_SALE', () => {
    const engine = new SettlementAutomationEngine();
    engine.addCustomer('C-02', 'মেসার্স জামান', '01811000002', 0); // ৳0 due

    const res = engine.processIncomingTransaction({
      transactionNumber: 'TXN-AUTO-02',
      amountPaisa: 30000, // ৳300
      senderMobile: '01811000002',
      channel: 'টালিপে',
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.actionType, 'DIGITAL_SALE');
    assert.strictEqual(engine.journal.length, 1);
    assert.strictEqual(engine.journal[0].txnType, 1);
  });

  test('SettlementAutomationEngine rejects duplicate transaction number (Idempotency)', () => {
    const engine = new SettlementAutomationEngine();
    engine.processIncomingTransaction({
      transactionNumber: 'TXN-UNIQUE-01',
      amountPaisa: 10000,
      senderMobile: '01911000003',
    });

    const dup = engine.processIncomingTransaction({
      transactionNumber: 'TXN-UNIQUE-01',
      amountPaisa: 10000,
      senderMobile: '01911000003',
    });
    assert.strictEqual(dup.success, false);
    assert.strictEqual(dup.reason, 'DUPLICATE_TRANSACTION');
  });

  test('SettlementAutomationEngine clears customer debt completely on payoff', () => {
    const engine = new SettlementAutomationEngine();
    engine.addCustomer('C-03', 'তারেক এন্টারপ্রাইজ', '01611000004', 40000); // ৳400 due

    const res = engine.processIncomingTransaction({
      transactionNumber: 'TXN-AUTO-03',
      amountPaisa: 40000,
      senderMobile: '01611000004',
    });
    assert.strictEqual(res.actionType, 'CREDIT_COLLECTION');
    assert.strictEqual(res.customerRemainingDuePaisa, 0);
  });

  // ============================================================================
  // GROUP 8: Transaction Settlement Action DAO Queries & Sync State Machine
  // ============================================================================
  console.log('\n[GROUP 8: Transaction Settlement Action DAO Queries & Sync State Machine]');

  test('TransactionSettlementAction entity initializes with default values', () => {
    const action = new TransactionSettlementAction({
      transaction_number: 'TXN-DAO-001',
      action_type: 'DIGITAL_SALE',
    });
    assert.strictEqual(action.transaction_number, 'TXN-DAO-001');
    assert.strictEqual(action.action_type, 'DIGITAL_SALE');
    assert.strictEqual(action.synced, 0);
    assert.ok(action.create_date !== null);
    assert.strictEqual(action.update_date, null);
  });

  test('TransactionSettlementActionDao handles in-memory queries and sync lifecycle', () => {
    const dao = new TransactionSettlementActionDao();
    dao.insert({ transaction_number: 'TXN-A1', action_type: 'CREDIT_COLLECTION', synced: 0 });
    dao.insert({ transaction_number: 'TXN-A2', action_type: 'DIGITAL_SALE', synced: 0 });
    dao.insert({ transaction_number: 'TXN-A3', action_type: 'NO_ACTION', synced: 0 });

    assert.strictEqual(dao.exists('TXN-A1'), true);
    assert.strictEqual(dao.exists('TXN-NOT-FOUND'), false);
    assert.strictEqual(dao.countUnsynced(), 3);

    // Update 2 items to synced=1
    const unsynced = dao.getUnsyncedTxnSettlementActions(2);
    assert.strictEqual(unsynced.length, 2);
    const updated = dao.updateTxnSettlementActionSyncStatusByIds(1, unsynced.map(x => x.id));
    assert.strictEqual(updated, 2);
    assert.strictEqual(dao.countUnsynced(), 1);

    // Reset all to unsynced
    dao.updateAllTxnSettlementActionUnsynced();
    assert.strictEqual(dao.countUnsynced(), 3);
  });

  // ============================================================================
  // GROUP 9: Multi-Tenant StorageRepository Persistence & Cascade Deletion
  // ============================================================================
  console.log('\n[GROUP 9: Multi-Tenant StorageRepository Persistence & Cascade Deletion]');

  await asyncTest('StorageRepository saves settlement action with uniqueness check', async () => {
    const res = await saveTransactionSettlementAction('1', {
      transaction_number: 'TXN-STORAGE-001',
      action_type: 'CREDIT_COLLECTION',
      synced: 0,
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.record.transaction_number, 'TXN-STORAGE-001');

    // Duplicate check on same tenant
    const dupRes = await saveTransactionSettlementAction('1', {
      transaction_number: 'TXN-STORAGE-001',
      action_type: 'CREDIT_COLLECTION',
    });
    assert.strictEqual(dupRes.success, false);
    assert.strictEqual(dupRes.duplicate, true);
  });

  await asyncTest('StorageRepository enforces strict multi-tenant business isolation', async () => {
    // Tenant 1 has TXN-STORAGE-001
    assert.strictEqual(existsTransactionSettlementAction('1', 'TXN-STORAGE-001'), true);
    // Tenant 2 should not have TXN-STORAGE-001
    assert.strictEqual(existsTransactionSettlementAction('2', 'TXN-STORAGE-001'), false);

    // Tenant 2 can save the same transaction number independently
    const res2 = await saveTransactionSettlementAction('2', {
      transaction_number: 'TXN-STORAGE-001',
      action_type: 'DIGITAL_SALE',
    });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(existsTransactionSettlementAction('2', 'TXN-STORAGE-001'), true);
  });

  await asyncTest('StorageRepository supports sync status queries and batch updates', async () => {
    await saveTransactionSettlementAction('1', { transaction_number: 'TXN-SYNC-01', synced: 0 });
    await saveTransactionSettlementAction('1', { transaction_number: 'TXN-SYNC-02', synced: 0 });

    const unsynced = getUnsyncedTxnSettlementActions('1');
    assert.ok(unsynced.length >= 2);

    const ids = unsynced.map(x => x.id);
    const count = await updateTxnSettlementActionSyncStatusByIds('1', 1, ids);
    assert.strictEqual(count, ids.length);

    const remainingUnsynced = getUnsyncedTxnSettlementActions('1');
    assert.strictEqual(remainingUnsynced.length, 0);

    // Reset all to unsynced
    const resetCount = await updateAllTxnSettlementActionUnsynced('1');
    assert.ok(resetCount >= 2);
  });

  await asyncTest('StorageRepository persists and retrieves Soundbox configuration', async () => {
    const saved = await saveSoundboxConfig('1', {
      deviceId: 'SB-HQ-001',
      volumeStep: 14,
      isConnected: true,
    });
    assert.strictEqual(saved.deviceId, 'SB-HQ-001');
    assert.strictEqual(saved.volumeStep, 14);

    const read = getSoundboxConfig('1');
    assert.strictEqual(read.deviceId, 'SB-HQ-001');
    assert.strictEqual(read.volumeStep, 14);

    // Tenant 2 gets default soundbox configuration
    const read2 = getSoundboxConfig('2');
    assert.strictEqual(read2.deviceId, 'SB-QR-001');
    assert.strictEqual(read2.volumeStep, 12);
  });

  await asyncTest('StorageRepository persists and retrieves settlement history records', async () => {
    const hist = await saveSettlementHistoryRecord('1', {
      transactionNumber: 'SH-TXN-101',
      actionType: 'CREDIT_COLLECTION',
      amountPaisa: 150000,
      senderMobile: '01711223344',
    });
    assert.strictEqual(hist.transactionNumber, 'SH-TXN-101');

    const list1 = getSettlementHistory('1');
    assert.ok(list1.some(h => h.transactionNumber === 'SH-TXN-101'));

    const list2 = getSettlementHistory('2');
    assert.ok(!list2.some(h => h.transactionNumber === 'SH-TXN-101'));
  });

  await asyncTest('deleteBusinessCascade purges all settlement & soundbox records for target tenant', async () => {
    // Setup temporary business '88'
    await storageRepository.mutateStore((s) => ({
      ...s,
      businesses: [...(s.businesses || []), { id: '88', name: 'Tenant 88', isArchived: false }],
    }));

    await saveTransactionSettlementAction('88', { transaction_number: 'TXN-88-DEL', synced: 0 });
    await saveSettlementHistoryRecord('88', { transactionNumber: 'TXN-88-DEL', amountPaisa: 5000 });
    await saveSoundboxConfig('88', { deviceId: 'SB-88', volumeStep: 8 });

    assert.strictEqual(existsTransactionSettlementAction('88', 'TXN-88-DEL'), true);
    assert.ok(getSettlementHistory('88').length > 0);

    // Delete business 88
    const delRes = await storageRepository.deleteBusinessCascade('88');
    assert.strictEqual(delRes.success !== false, true);

    // Verify tenant 88 data is purged
    assert.strictEqual(existsTransactionSettlementAction('88', 'TXN-88-DEL'), false);
    assert.strictEqual(getSettlementHistory('88').length, 0);
    assert.strictEqual(storageRepository.currentStore.soundboxConfig['88'], undefined);

    // Verify tenant 1 data is preserved
    assert.strictEqual(existsTransactionSettlementAction('1', 'TXN-STORAGE-001'), true);
  });

  // ============================================================================
  // GROUP 10: Cloud Backup State Sanitization & Performance Benchmark
  // ============================================================================
  console.log('\n[GROUP 10: Cloud Backup State Sanitization & Performance Benchmark]');

  await asyncTest('getFullBackupState sanitizes live session tokens and credentials', async () => {
    await saveSoundboxConfig('1', {
      deviceId: 'SB-PROD',
      sessionToken: 'SECRET_BLE_SESSION_KEY_007',
      connectionToken: 'SOCKET_AUTH_TOKEN_999',
      isConnected: true,
    });

    const backup = await storageRepository.getFullBackupState();
    const sbBackup = backup.soundboxConfig && backup.soundboxConfig['1'];
    assert.ok(sbBackup !== undefined);
    assert.strictEqual(sbBackup.sessionToken, undefined);
    assert.strictEqual(sbBackup.connectionToken, undefined);
    assert.strictEqual(sbBackup.isConnected, false);
    assert.strictEqual(sbBackup.connectionState, 'DISCONNECTED');
  });

  test('Performance Benchmark: 1,000 settlement evaluations under 200ms', () => {
    const engine = new SettlementAutomationEngine();
    for (let i = 0; i < 100; i++) {
      engine.addCustomer(`CUST-${i}`, `গ্রাহক ${i}`, `017000000${String(i).padStart(2, '0')}`, 50000);
    }

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      const custIdx = i % 100;
      engine.processIncomingTransaction({
        transactionNumber: `TXN-BENCH-${i}`,
        amountPaisa: 10000,
        senderMobile: `017000000${String(custIdx).padStart(2, '0')}`,
      });
    }
    const elapsed = Date.now() - start;
    console.log(`  (Executed 1,000 settlement evaluations in ${elapsed}ms)`);
    assert.ok(elapsed < 200, `Benchmark exceeded 200ms limit: ${elapsed}ms`);
  });

  console.log('\n==================================================================');
  console.log(` ALL ${totalTests}/${totalTests} BACKEND TESTS PASSED SUCCESSFULLY! (100% PASS RATE)`);
  console.log('==================================================================');
}

runAllTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
