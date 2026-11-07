/**
 * test_iteration_242_dispute_reconciliation_backend.js
 *
 * Automated Backend & Business Logic Test Suite for REA-ITER-242:
 * TallyPay Settlement Reconciliation, Dispute Resolution & Chargeback Management Subsystem
 *
 * Milestone: REA-ITER-242
 * Worker: Worker 2: Averroes / Peirce (Permanent Backend Developer & Business Logic Architect)
 */

const assert = require('assert');
const disputeSubsystem = require('./src/disputeSubsystem');
const tallyPayService = require('./src/tallyPayService');
const storageRepository = require('./src/storageRepository');

const {
  RECONCILIATION_SCHEMA,
  TRANSACTION_SETTLEMENT_ACTION_SCHEMA,
  MERCHANT_DISPUTE_TICKET_SCHEMA,
  RECONCILIATION_TABLE_DDL,
  TRANSACTION_SETTLEMENT_ACTION_DDL,
  MERCHANT_DISPUTE_TICKET_DDL,
  DISPUTE_CATEGORIES,
  DISPUTE_CATEGORY_METADATA,
  DISPUTE_STATUSES,
  DISPUTE_SLA_HOURS,
  SETTLEMENT_ACTION_TYPES,
  RECONCILIATION_STATUSES,
  DISPUTE_ARSC_TOKENS,
  MAX_PROOF_FILE_SIZE_BYTES,
  ALLOWED_PROOF_MIME_TYPES,
  VALID_DISPUTE_TRANSITIONS,
  ReconciliationDao,
  TransactionSettlementActionDao,
  MerchantDisputeTicketDao,
  calculateDailyReconciliation,
  getBstDateComponents,
  isBeforeCutOffTime,
  calculateClearingDate,
  validateProofAttachment,
  generateDisputeTicketId,
  calculateSlaDeadline,
  isValidDisputeTransition,
  SettlementDisputeEngine,
  settlementDisputeEngine,
} = disputeSubsystem;

const {
  StorageRepository,
  MemoryStorageAdapter,
  saveDisputeTicket,
  getDisputeTickets,
  getDisputeTicketById,
  updateDisputeTicketStatus,
  deleteDisputeTicket,
  getUnsyncedDisputeTickets,
  updateDisputeTicketSyncStatus,
  performAutoSettlementReconciliation,
  saveSettlementAction,
  getSettlementActions,
  getSettlementActionByTxn,
  getUnsyncedSettlementActions,
  updateSettlementActionSyncStatus,
  updateReconciliationSyncStatus,
} = storageRepository;

let passed = 0;
let failed = 0;

function runTest(desc, fn) {
  try {
    fn();
    passed++;
    console.log('[PASS] ' + desc);
  } catch (err) {
    failed++;
    console.error('[FAIL] ' + desc + ': ' + err.message);
    if (err.stack) console.error(err.stack);
  }
}

async function runTestAsync(desc, fn) {
  try {
    await fn();
    passed++;
    console.log('[PASS] ' + desc);
  } catch (err) {
    failed++;
    console.error('[FAIL] ' + desc + ': ' + err.message);
    if (err.stack) console.error(err.stack);
  }
}

console.log('==================================================================');
console.log(' REA-ITER-242: BACKEND DISPUTE & RECONCILIATION TEST SUITE');
console.log('==================================================================\n');

async function runAllTests() {
  // -------------------------------------------------------------
  // GROUP 1: Room SQLite Schemas & DDL Specifications
  // -------------------------------------------------------------
  console.log('[GROUP 1: Room SQLite Schemas & DDL Specifications]');

  runTest('Test 1.1: RECONCILIATION_SCHEMA defines table reconciliations with 7 columns', () => {
    assert.strictEqual(RECONCILIATION_SCHEMA.tableName, 'reconciliations');
    assert.strictEqual(RECONCILIATION_SCHEMA.columns.length, 7);
    const pk = RECONCILIATION_SCHEMA.columns.find(c => c.name === '_id');
    assert(pk && pk.primaryKey && pk.autoincrement, '_id is autoincrement primary key');
  });

  runTest('Test 1.2: TRANSACTION_SETTLEMENT_ACTION_SCHEMA defines unique index on transaction_number', () => {
    assert.strictEqual(TRANSACTION_SETTLEMENT_ACTION_SCHEMA.tableName, 'transaction_settlement_action');
    assert.strictEqual(TRANSACTION_SETTLEMENT_ACTION_SCHEMA.columns.length, 6);
    const idx = TRANSACTION_SETTLEMENT_ACTION_SCHEMA.indices.find(i => i.name === 'index_transaction_number');
    assert(idx && idx.unique && idx.columns.includes('transaction_number'), 'Unique index on transaction_number');
  });

  runTest('Test 1.3: MERCHANT_DISPUTE_TICKET_SCHEMA defines the approved 14 columns with unique ticket_id and synced default', () => {
    assert.strictEqual(MERCHANT_DISPUTE_TICKET_SCHEMA.tableName, 'merchant_dispute_ticket');
    const expectedFields = [
      'id', 'ticket_id', 'business_id', 'transaction_number', 'category',
      'claimed_amount_paisa', 'status', 'description', 'proof_url',
      'sla_deadline', 'resolved_amount_paisa', 'created_at', 'updated_at', 'synced',
    ];
    const actualFields = MERCHANT_DISPUTE_TICKET_SCHEMA.columns.map(column => column.name);
    assert.strictEqual(actualFields.length, 14, 'approved schema has exactly 14 columns');
    assert.deepStrictEqual(actualFields, expectedFields, 'schema fields match the approved ordered contract');
    assert.strictEqual(new Set(actualFields).size, actualFields.length, 'schema has no duplicate field names');
    const tidCol = MERCHANT_DISPUTE_TICKET_SCHEMA.columns.find(c => c.name === 'ticket_id');
    assert(tidCol && tidCol.unique, 'ticket_id column is unique');
    const uniqueTicketIndex = MERCHANT_DISPUTE_TICKET_SCHEMA.indices.find(index => index.columns.includes('ticket_id'));
    assert(uniqueTicketIndex && uniqueTicketIndex.unique, 'ticket_id has a unique schema index');
    const syncedCol = MERCHANT_DISPUTE_TICKET_SCHEMA.columns.find(c => c.name === 'synced');
    assert(syncedCol && syncedCol.notNull, 'synced is required');
    assert.strictEqual(syncedCol.defaultValue, 0, 'new tickets default to unsynced');
    assert(MERCHANT_DISPUTE_TICKET_DDL.includes('`synced` INTEGER NOT NULL DEFAULT 0'), 'DDL preserves the synced default');
  });

  runTest('Test 1.4: Room DDL statements contain valid SQL syntax for all 3 tables', () => {
    assert(RECONCILIATION_TABLE_DDL.includes('CREATE TABLE IF NOT EXISTS `reconciliations`'));
    assert(TRANSACTION_SETTLEMENT_ACTION_DDL.includes('CREATE TABLE IF NOT EXISTS `transaction_settlement_action`'));
    assert(MERCHANT_DISPUTE_TICKET_DDL.includes('CREATE TABLE IF NOT EXISTS `merchant_dispute_ticket`'));
  });

  // -------------------------------------------------------------
  // GROUP 2: Enums, Constants & Authentic Bengali ARSC Tokens
  // -------------------------------------------------------------
  console.log('\n[GROUP 2: Enums, Constants & Authentic Bengali ARSC Tokens]');

  runTest('Test 2.1: DISPUTE_CATEGORIES and metadata encompass all 5 standardized problem types', () => {
    assert.strictEqual(DISPUTE_CATEGORIES.TXN_FAILED_BUT_DEBITED, 'TXN_FAILED_BUT_DEBITED');
    assert.strictEqual(DISPUTE_CATEGORIES.DOUBLE_DEBIT, 'DOUBLE_DEBIT');
    assert.strictEqual(DISPUTE_CATEGORIES.AMOUNT_MISMATCH, 'AMOUNT_MISMATCH');
    assert.strictEqual(DISPUTE_CATEGORIES.DELAYED_SETTLEMENT, 'DELAYED_SETTLEMENT');
    assert.strictEqual(DISPUTE_CATEGORIES.UNAUTHORIZED_TXN, 'UNAUTHORIZED_TXN');
    assert.strictEqual(DISPUTE_CATEGORY_METADATA.TXN_FAILED_BUT_DEBITED.slaHours, 24);
    assert.strictEqual(DISPUTE_CATEGORY_METADATA.UNAUTHORIZED_TXN.slaHours, 72);
  });

  runTest('Test 2.2: DISPUTE_STATUSES defines 4 lifecycle states', () => {
    assert.strictEqual(DISPUTE_STATUSES.SUBMITTED, 'SUBMITTED');
    assert.strictEqual(DISPUTE_STATUSES.UNDER_INVESTIGATION, 'UNDER_INVESTIGATION');
    assert.strictEqual(DISPUTE_STATUSES.RESOLVED_REFUNDED, 'RESOLVED_REFUNDED');
    assert.strictEqual(DISPUTE_STATUSES.REJECTED, 'REJECTED');
  });

  runTest('Test 2.3: SETTLEMENT_ACTION_TYPES and RECONCILIATION_STATUSES match specifications', () => {
    assert.strictEqual(SETTLEMENT_ACTION_TYPES.DIGITAL_SALE, 'DIGITAL_SALE');
    assert.strictEqual(SETTLEMENT_ACTION_TYPES.CREDIT_COLLECTION, 'CREDIT_COLLECTION');
    assert.strictEqual(SETTLEMENT_ACTION_TYPES.NO_ACTION, 'NO_ACTION');
    assert.strictEqual(SETTLEMENT_ACTION_TYPES.REFUND, 'REFUND');
    assert.strictEqual(RECONCILIATION_STATUSES.MATCHED, 'MATCHED');
    assert.strictEqual(RECONCILIATION_STATUSES.DISCREPANCY, 'DISCREPANCY');
  });

  runTest('Test 2.4: Authentic Bengali ARSC tokens are present and non-empty', () => {
    assert.strictEqual(DISPUTE_ARSC_TOKENS.HELPLINE_NUMBER, '১৬৭২৬');
    assert(DISPUTE_ARSC_TOKENS.HELPLINE_BANNER.includes('১৬৭২৬'));
    assert.strictEqual(DISPUTE_ARSC_TOKENS.RECONCILIATION_HEADER, 'সমন্বয়');
    assert.strictEqual(DISPUTE_ARSC_TOKENS.DUE_RECOVERY_RECONCILIATION, '(বাকি আদায় সমন্বয়)');
    assert.strictEqual(DISPUTE_ARSC_TOKENS.REFUND_HEADER, 'ফেরত');
    assert.strictEqual(DISPUTE_ARSC_TOKENS.PAYMENT_REFUND, 'পেমেন্ট ফেরত');
  });

  // -------------------------------------------------------------
  // GROUP 3: In-Memory DAOs for Reconciliations & Settlement Actions
  // -------------------------------------------------------------
  console.log('\n[GROUP 3: In-Memory DAOs for Reconciliations & Settlement Actions]');

  runTest('Test 3.1: ReconciliationDao inserts, retrieves, and filters by sync_status', () => {
    const dao = new ReconciliationDao();
    dao.insert({
      business_id: 'biz_01',
      time: '2026-11-05 10:00:00',
      opening_balance: 1000,
      other_cash_sales: 5000,
      other_credit_sales: 2000,
      closing_balance: 6000,
      sync_status: 0,
    });
    dao.insert({
      business_id: 'biz_01',
      time: '2026-11-06 10:00:00',
      opening_balance: 6000,
      other_cash_sales: 4000,
      other_credit_sales: 1000,
      closing_balance: 10000,
      sync_status: 1,
    });

    assert.strictEqual(dao.count('biz_01'), 2);
    assert.strictEqual(dao.countUnsynced('biz_01'), 1);
    assert.strictEqual(dao.getUnsynced('biz_01')[0].opening_balance, 1000);

    const updated = dao.updateSyncStatus([dao.getUnsynced('biz_01')[0]._id], 1, 'biz_01');
    assert.strictEqual(updated, 1);
    assert.strictEqual(dao.countUnsynced('biz_01'), 0);
  });

  runTest('Test 3.2: TransactionSettlementActionDao enforces unique index on transaction_number', () => {
    const dao = new TransactionSettlementActionDao();
    dao.insert({
      business_id: 'biz_01',
      transaction_number: 'TXN-9001',
      action_type: 'DIGITAL_SALE',
      synced: 0,
    });

    assert.strictEqual(dao.exists('TXN-9001', 'biz_01'), true);
    assert.strictEqual(dao.exists('TXN-9002', 'biz_01'), false);

    assert.throws(() => {
      dao.insert({
        business_id: 'biz_01',
        transaction_number: 'TXN-9001',
        action_type: 'REFUND',
      });
    }, /DUPLICATE_TRANSACTION/);
  });

  runTest('Test 3.3: TransactionSettlementActionDao batch sync status updates', () => {
    const dao = new TransactionSettlementActionDao();
    const a1 = dao.insert({ business_id: 'biz_01', transaction_number: 'TXN-A1', action_type: 'REFUND', synced: 0 });
    const a2 = dao.insert({ business_id: 'biz_01', transaction_number: 'TXN-A2', action_type: 'REFUND', synced: 0 });

    assert.strictEqual(dao.countUnsynced('biz_01'), 2);
    dao.updateSyncStatusByIds(1, [a1.id, a2.id], 'biz_01');
    assert.strictEqual(dao.countUnsynced('biz_01'), 0);

    dao.updateAllUnsynced('biz_01');
    assert.strictEqual(dao.countUnsynced('biz_01'), 2);
  });

  // -------------------------------------------------------------
  // GROUP 4: In-Memory DAO for Merchant Dispute Tickets
  // -------------------------------------------------------------
  console.log('\n[GROUP 4: In-Memory DAO for Merchant Dispute Tickets]');

  runTest('Test 4.1: MerchantDisputeTicketDao CRUD, auto SLA deadline, and duplicate ticket rejection', () => {
    const dao = new MerchantDisputeTicketDao();
    const t1 = dao.insert({
      ticket_id: 'DISP-101',
      business_id: 'biz_01',
      transaction_number: 'TXN-5001',
      category: DISPUTE_CATEGORIES.TXN_FAILED_BUT_DEBITED,
      claimed_amount_paisa: 50000,
      description: 'টাকা কেটেছে কিন্তু আসেনি',
    });

    assert.strictEqual(t1.ticket_id, 'DISP-101');
    assert.strictEqual(t1.status, DISPUTE_STATUSES.SUBMITTED);
    assert.strictEqual(t1.claimed_amount_paisa, 50000);
    assert.strictEqual(t1.synced, 0, 'new tickets enter the pending sync queue');
    assert(t1.sla_deadline !== null, 'SLA deadline auto calculated');

    assert.throws(() => {
      dao.insert({
        ticket_id: 'DISP-101',
        business_id: 'biz_01',
        transaction_number: 'TXN-5002',
      });
    }, /DUPLICATE_TICKET/);
  });

  runTest('Test 4.2: MerchantDisputeTicketDao status transitions with resolution notes', () => {
    const dao = new MerchantDisputeTicketDao();
    const t = dao.insert({
      ticket_id: 'DISP-102',
      business_id: 'biz_01',
      transaction_number: 'TXN-5002',
      category: DISPUTE_CATEGORIES.DOUBLE_DEBIT,
      claimed_amount_paisa: 120000,
    });
    t.synced = 1;

    // Valid: SUBMITTED -> UNDER_INVESTIGATION
    dao.updateStatus('DISP-102', DISPUTE_STATUSES.UNDER_INVESTIGATION, { resolutionNotes: 'Checking gateway logs' }, 'biz_01');
    assert.strictEqual(dao.getById('DISP-102', 'biz_01').status, DISPUTE_STATUSES.UNDER_INVESTIGATION);
    assert.strictEqual(dao.getById('DISP-102', 'biz_01').synced, 0, 'status changes return the payload to the pending queue');

    // Invalid: UNDER_INVESTIGATION -> SUBMITTED (backward transition forbidden)
    assert.throws(() => {
      dao.updateStatus('DISP-102', DISPUTE_STATUSES.SUBMITTED, {}, 'biz_01');
    }, /INVALID_STATUS_TRANSITION/);

    // Valid: UNDER_INVESTIGATION -> RESOLVED_REFUNDED
    dao.updateStatus('DISP-102', DISPUTE_STATUSES.RESOLVED_REFUNDED, { resolvedAmountPaisa: 120000 }, 'biz_01');
    const resolved = dao.getById('DISP-102', 'biz_01');
    assert.strictEqual(resolved.status, DISPUTE_STATUSES.RESOLVED_REFUNDED);
    assert.strictEqual(resolved.resolved_amount_paisa, 120000);
  });

  // -------------------------------------------------------------
  // GROUP 5: Pure-JS Financial Arithmetic & Reconciliation Engine
  // -------------------------------------------------------------
  console.log('\n[GROUP 5: Pure-JS Financial Arithmetic & Reconciliation Engine]');

  runTest('Test 5.1: calculateDailyReconciliation exact MATCHED status with 0 float drift', () => {
    const res = calculateDailyReconciliation(
      200000,  // opening: ৳2,000.00
      800000,  // cash sales: ৳8,000.00
      300000,  // credit sales: ৳3,000.00
      1000000, // digital inflow: ৳10,000.00
      1000000  // bank disbursed: ৳10,000.00
    );

    assert.strictEqual(res.variancePaisa, 0);
    assert.strictEqual(res.status, RECONCILIATION_STATUSES.MATCHED);
    assert.strictEqual(res.isMatched, true);
    assert.strictEqual(res.discrepancyType, null);
    // closing = opening (2,000) + cash sales (8,000) + digital (10,000) - disbursed (10,000) = ৳10,000.00
    assert.strictEqual(res.closingBalancePaisa, 1000000);
  });

  runTest('Test 5.2: calculateDailyReconciliation underpayment discrepancy (variance > 0)', () => {
    const res = calculateDailyReconciliation({
      openingBalancePaisa: 100000,
      otherCashSalesPaisa: 500000,
      digitalInflowPaisa: 600000,
      bankDisbursedPaisa: 550000, // Received ৳500 less
    });

    assert.strictEqual(res.variancePaisa, 50000);
    assert.strictEqual(res.status, RECONCILIATION_STATUSES.DISCREPANCY);
    assert.strictEqual(res.discrepancyType, RECONCILIATION_STATUSES.DISCREPANCY_UNDERPAYMENT);
    assert.strictEqual(res.isMatched, false);
  });

  runTest('Test 5.3: calculateDailyReconciliation overpayment discrepancy (variance < 0)', () => {
    const res = calculateDailyReconciliation({
      openingBalancePaisa: 100000,
      otherCashSalesPaisa: 500000,
      digitalInflowPaisa: 600000,
      bankDisbursedPaisa: 650000, // Disbursed ৳500 more
    });

    assert.strictEqual(res.variancePaisa, -50000);
    assert.strictEqual(res.status, RECONCILIATION_STATUSES.DISCREPANCY);
    assert.strictEqual(res.discrepancyType, RECONCILIATION_STATUSES.DISCREPANCY_OVERPAYMENT);
    assert.strictEqual(res.isMatched, false);
  });

  // -------------------------------------------------------------
  // GROUP 6: Bangladesh Banking Cut-Off & Clearing Days (BST UTC+6)
  // -------------------------------------------------------------
  console.log('\n[GROUP 6: Bangladesh Banking Cut-Off & Clearing Days (BST UTC+6)]');

  runTest('Test 6.1: isBeforeCutOffTime validates 14:00 BST boundary', () => {
    // 07:00 UTC = 13:00 BST (before 14:00)
    assert.strictEqual(isBeforeCutOffTime('2026-11-05T07:00:00Z'), true);
    // 09:00 UTC = 15:00 BST (after 14:00)
    assert.strictEqual(isBeforeCutOffTime('2026-11-05T09:00:00Z'), false);
    // Exactly 08:00 UTC = 14:00 BST
    assert.strictEqual(isBeforeCutOffTime('2026-11-05T08:00:00Z'), true);
    // 08:01 UTC = 14:01 BST (after 14:00)
    assert.strictEqual(isBeforeCutOffTime('2026-11-05T08:01:00Z'), false);
  });

  runTest('Test 6.2: calculateClearingDate skips Friday and Saturday weekends', () => {
    // Thursday 2026-11-05 morning (11:00 BST): before cut-off -> T+1
    // Friday & Saturday are bank holidays, so T+1 lands on Sunday 2026-11-08
    const thuMorning = calculateClearingDate('2026-11-05T05:00:00Z');
    assert.strictEqual(thuMorning.cycle, 'T+1');
    assert.strictEqual(thuMorning.isBeforeCutOff, true);
    assert.strictEqual(thuMorning.clearingDate, '2026-11-08');

    // Thursday 2026-11-05 afternoon (15:00 BST): after cut-off -> T+2
    // T+1 = Sunday 2026-11-08, T+2 = Monday 2026-11-09
    const thuAfternoon = calculateClearingDate('2026-11-05T09:00:00Z');
    assert.strictEqual(thuAfternoon.cycle, 'T+2');
    assert.strictEqual(thuAfternoon.isBeforeCutOff, false);
    assert.strictEqual(thuAfternoon.clearingDate, '2026-11-09');
  });

  runTest('Test 6.3: calculateClearingDate on normal weekday (Monday)', () => {
    // Monday 2026-11-09 morning (10:00 BST) -> T+1 is Tuesday 2026-11-10
    const monMorning = calculateClearingDate('2026-11-09T04:00:00Z');
    assert.strictEqual(monMorning.cycle, 'T+1');
    assert.strictEqual(monMorning.clearingDate, '2026-11-10');

    // Monday 2026-11-09 afternoon (16:00 BST) -> T+2 is Wednesday 2026-11-11
    const monAfternoon = calculateClearingDate('2026-11-09T10:00:00Z');
    assert.strictEqual(monAfternoon.cycle, 'T+2');
    assert.strictEqual(monAfternoon.clearingDate, '2026-11-11');
  });

  // -------------------------------------------------------------
  // GROUP 7: Proof Attachment & SLA Validation
  // -------------------------------------------------------------
  console.log('\n[GROUP 7: Proof Attachment & SLA Validation]');

  runTest('Test 7.1: validateProofAttachment enforces 5MB size limit', () => {
    assert.strictEqual(validateProofAttachment({ fileSizeBytes: 4 * 1024 * 1024 }).valid, true);
    const tooLarge = validateProofAttachment({ fileSizeBytes: 6 * 1024 * 1024 });
    assert.strictEqual(tooLarge.valid, false);
    assert.strictEqual(tooLarge.error, 'FILE_TOO_LARGE');
  });

  runTest('Test 7.2: validateProofAttachment checks supported MIME types (JPEG, PNG, PDF)', () => {
    assert.strictEqual(validateProofAttachment({ fileSizeBytes: 1024, mimeType: 'image/jpeg' }).valid, true);
    assert.strictEqual(validateProofAttachment({ fileSizeBytes: 1024, mimeType: 'image/png' }).valid, true);
    assert.strictEqual(validateProofAttachment({ fileSizeBytes: 1024, mimeType: 'application/pdf' }).valid, true);
    const invalidMime = validateProofAttachment({ fileSizeBytes: 1024, mimeType: 'video/mp4' });
    assert.strictEqual(invalidMime.valid, false);
    assert.strictEqual(invalidMime.error, 'INVALID_MIME_TYPE');
  });

  runTest('Test 7.3: calculateSlaDeadline correctly maps 24h, 48h, 72h durations', () => {
    const baseDate = '2026-11-05T00:00:00.000Z';
    const sla24 = calculateSlaDeadline(DISPUTE_CATEGORIES.TXN_FAILED_BUT_DEBITED, baseDate);
    assert.strictEqual(sla24, '2026-11-06T00:00:00.000Z');

    const sla48 = calculateSlaDeadline(DISPUTE_CATEGORIES.AMOUNT_MISMATCH, baseDate);
    assert.strictEqual(sla48, '2026-11-07T00:00:00.000Z');

    const sla72 = calculateSlaDeadline(DISPUTE_CATEGORIES.UNAUTHORIZED_TXN, baseDate);
    assert.strictEqual(sla72, '2026-11-08T00:00:00.000Z');
  });

  // -------------------------------------------------------------
  // GROUP 8: SettlementDisputeEngine Simulation & Reference Architecture
  // -------------------------------------------------------------
  console.log('\n[GROUP 8: SettlementDisputeEngine Simulation & Reference Architecture]');

  runTest('Test 8.1: SettlementDisputeEngine matches Reference Architecture Group 10 behavior', () => {
    const engine = new SettlementDisputeEngine();
    engine.registerBusiness('biz_sim_01', 'সততা জেনারেল স্টোর');

    engine.recordDigitalCollection('biz_sim_01', {
      txnNumber: 'TXN-2026-9901',
      amountPaisa: 450000,
      customerMobile: '01711000001',
    });
    engine.recordDigitalCollection('biz_sim_01', {
      txnNumber: 'TXN-2026-9902',
      amountPaisa: 550000,
      customerMobile: '01811000002',
    });

    engine.recordBankDisbursement('biz_sim_01', {
      disbursementId: 'DISB-2026-001',
      amountPaisa: 1000000,
      bankAccount: '10521010000456',
    });

    const recon = engine.performReconciliation('biz_sim_01', {
      time: '2026-11-05 15:00:00',
      openingBalancePaisa: 200000,
      otherCashSalesPaisa: 800000,
      otherCreditSalesPaisa: 300000,
    });

    assert.strictEqual(recon.totalCollectedPaisa, 1000000);
    assert.strictEqual(recon.totalDisbursedPaisa, 1000000);
    assert.strictEqual(recon.variancePaisa, 0);
    assert.strictEqual(recon.status, 'MATCHED');
    assert.strictEqual(recon.closingBalancePaisa, 1000000);

    const dispute = engine.fileDispute('biz_sim_01', {
      txnNumber: 'TXN-2026-9901',
      category: 'TXN_FAILED_BUT_DEBITED',
      claimedAmountPaisa: 50000,
      disputeReason: 'টাকা কাটার পরও লেনদেন সম্পন্ন হয়নি',
      proofAttachmentUrl: 'https://storage.tallykhata.com/proofs/proof_001.jpg',
    });

    assert.strictEqual(dispute.disputeId, 'DISP-1001');
    assert.strictEqual(dispute.status, 'SUBMITTED');
    assert.strictEqual(dispute.claimedAmountPaisa, 50000);

    engine.transitionDisputeStatus('biz_sim_01', dispute.disputeId, 'UNDER_INVESTIGATION');
    engine.transitionDisputeStatus('biz_sim_01', dispute.disputeId, 'RESOLVED_REFUNDED', 'Bank confirmed duplicate charge');

    assert.strictEqual(dispute.refundPaisa, 50000);
    const unsynced = engine.getUnsyncedSettlementActions('biz_sim_01');
    assert.strictEqual(unsynced.length, 1);
    assert.strictEqual(unsynced[0].transactionNumber, 'TXN-2026-9901');
    assert.strictEqual(unsynced[0].actionType, 'REFUND');
    assert.strictEqual(unsynced[0].synced, 0);
  });

  // -------------------------------------------------------------
  // GROUP 9: StorageRepository Multi-Tenant Persistence & Cascade Purge
  // -------------------------------------------------------------
  console.log('\n[GROUP 9: StorageRepository Multi-Tenant Persistence & Cascade Purge]');

  await runTestAsync('Test 9.1: StorageRepository saves dispute tickets and enforces multi-tenant isolation', async () => {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.initialize();

    const res1 = await repo.saveDisputeTicket('biz_001', {
      transaction_number: 'TXN-101',
      category: DISPUTE_CATEGORIES.TXN_FAILED_BUT_DEBITED,
      claimed_amount_paisa: 75000,
      description: 'Customer was debited twice',
    });
    assert.strictEqual(res1.success, true);
    assert(res1.ticketId.startsWith('DISP-'));

    const res2 = await repo.saveDisputeTicket('biz_002', {
      transaction_number: 'TXN-202',
      category: DISPUTE_CATEGORIES.DELAYED_SETTLEMENT,
      claimed_amount_paisa: 250000,
      description: 'Settlement delayed over 48 hours',
    });
    assert.strictEqual(res2.success, true);

    const biz1Tickets = repo.getDisputeTickets('biz_001');
    const biz2Tickets = repo.getDisputeTickets('biz_002');

    assert.strictEqual(biz1Tickets.totalCount, 1);
    assert.strictEqual(biz2Tickets.totalCount, 1);
    assert.strictEqual(biz1Tickets.items[0].transaction_number, 'TXN-101');
    assert.strictEqual(biz1Tickets.items[0].synced, 0, 'new tickets default to unsynced');
    assert.strictEqual(biz2Tickets.items[0].transaction_number, 'TXN-202');
    assert.deepStrictEqual(repo.getUnsyncedDisputeTickets('biz_001').map(ticket => ticket.ticket_id), [res1.ticketId]);
    assert.deepStrictEqual(repo.getUnsyncedDisputeTickets('biz_002').map(ticket => ticket.ticket_id), [res2.ticketId]);
    const normalizedLegacy = repo.sanitizeState({
      merchantDisputeTickets: [
        { ticket_id: 'LEGACY-MISSING-SYNC' },
        { ticket_id: 'LEGACY-ACKED', synced: 1 },
        { ticket_id: 'LEGACY-INVALID-SYNC', synced: 'invalid' },
      ],
    }).merchantDisputeTickets;
    assert.deepStrictEqual(normalizedLegacy.map(ticket => ticket.synced), [0, 1, 0], 'legacy tickets normalize safely while retaining valid acknowledgements');
    assert.strictEqual(await repo.updateDisputeTicketSyncStatus('biz_001', [res1.ticketId], 1), 1);
    assert.strictEqual(await repo.updateDisputeTicketSyncStatus('biz_001', [res1.ticketId], 1), 1, 'repeated acknowledgements are safe');
    assert.strictEqual(repo.getDisputeTicketById('biz_001', res1.ticketId).synced, 1);
    assert.deepStrictEqual(repo.getUnsyncedDisputeTickets('biz_001'), []);
    assert.strictEqual(repo.getDisputeTicketById('biz_002', res2.ticketId).synced, 0, 'acknowledgement is tenant scoped');
    assert.strictEqual(repo.getDisputeTicketById('biz_002', res1.ticketId), null, 'A tenant cannot retrieve another tenant ticket');
    const duplicate = await repo.saveDisputeTicket('biz_002', {
      ticket_id: res1.ticketId,
      transaction_number: 'TXN-DUPLICATE-TICKET',
      category: DISPUTE_CATEGORIES.AMOUNT_MISMATCH,
      claimed_amount_paisa: 1000,
    });
    assert.strictEqual(duplicate.success, false);
    assert.strictEqual(duplicate.error, 'DUPLICATE_TICKET');
  });

  await runTestAsync('Test 9.2: StorageRepository updateDisputeTicketStatus generates refund settlement action', async () => {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.initialize();

    const res = await repo.saveDisputeTicket('biz_001', {
      transaction_number: 'TXN-REFUND-1',
      category: DISPUTE_CATEGORIES.DOUBLE_DEBIT,
      claimed_amount_paisa: 50000,
    });
    const ticketId = res.ticketId;

    await repo.updateDisputeTicketStatus('biz_001', ticketId, DISPUTE_STATUSES.UNDER_INVESTIGATION);
    assert.strictEqual(repo.getDisputeTicketById('biz_001', ticketId).synced, 0, 'status mutation resets sync state');
    const resolveRes = await repo.updateDisputeTicketStatus('biz_001', ticketId, DISPUTE_STATUSES.RESOLVED_REFUNDED, {
      resolutionNotes: 'Refund approved by bank gateway',
    });

    assert.strictEqual(resolveRes.success, true);
    assert.strictEqual(resolveRes.ticket.status, DISPUTE_STATUSES.RESOLVED_REFUNDED);
    assert.strictEqual(resolveRes.ticket.resolved_amount_paisa, 50000);
    assert(resolveRes.refundAction !== null, 'Refund settlement action created');
    assert.strictEqual(resolveRes.refundAction.action_type, 'REFUND');

    const actions = repo.getTransactionSettlementActions('biz_001');
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].transaction_number, 'TXN-REFUND-1');
  });

  await runTestAsync('Test 9.3: performAutoSettlementReconciliation calculates and saves daily record', async () => {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.initialize();

    const todayStr = new Date().toISOString().slice(0, 10);

    // Seed through StorageRepository's existing atomic cashEntries collection API.
    const cashEntryDate = new Date().toISOString();
    await repo.mutateCollection('cashEntries', (entries) => [{
      id: 'ITER242-CASH-SALE-1',
      businessId: 'biz_001',
      type: 'in',
      category: 'sale',
      amount: 5000, // Repository cash entries store Taka; 5000 Taka = 500,000 Paisa.
      date: cashEntryDate,
      timestamp: cashEntryDate,
    }, ...entries]);

    // Record digital settlement in integer Paisa.
    await repo.saveTransactionSettlementAction('biz_001', {
      transaction_number: 'TXN-TODAY-1',
      action_type: 'DIGITAL_SALE',
      amountPaisa: 125000,
      create_date: cashEntryDate,
    });

    const autoRecon = await repo.performAutoSettlementReconciliation('biz_001', todayStr);
    assert.strictEqual(autoRecon.success, true);
    assert.strictEqual(autoRecon.reconciliation.other_cash_sales, 5000);
    assert(autoRecon.reconciliationResult.closingBalancePaisa >= 500000);
    assert.strictEqual(autoRecon.reconciliationResult.otherCashSalesPaisa, 500000);
    assert.strictEqual(autoRecon.reconciliationResult.totalCollectedPaisa, 125000);

    const recons = repo.getReconciliations('biz_001');
    assert(recons.totalCount >= 1);
    const repeatedRecon = await repo.performAutoSettlementReconciliation('biz_001', todayStr);
    assert.strictEqual(repeatedRecon.duplicate, true);
    assert.strictEqual(repo.getReconciliations('biz_001').totalCount, recons.totalCount);
  });

  await runTestAsync('Test 9.4: deleteBusinessCascade purges dispute tickets, reconciliations, and actions', async () => {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.initialize();

    await repo.createBusiness({ id: 'biz_del', name: 'Iteration 242 Delete Fixture', isSelected: false });
    await repo.createBusiness({ id: 'biz_keep', name: 'Iteration 242 Keep Fixture', isSelected: false });

    await repo.saveDisputeTicket('biz_del', { transaction_number: 'TXN-D1', category: DISPUTE_CATEGORIES.AMOUNT_MISMATCH, claimed_amount_paisa: 10000 });
    await repo.saveReconciliation('biz_del', { opening_balance: 1000, closing_balance: 2000, sync_status: 0 });
    await repo.saveTransactionSettlementAction('biz_del', { transaction_number: 'TXN-D1', action_type: 'DIGITAL_SALE' });
    await repo.saveReconciliation('biz_keep', { opening_balance: 2000, closing_balance: 3000, sync_status: 0 });
    await repo.saveTransactionSettlementAction('biz_keep', { transaction_number: 'TXN-K1', action_type: 'DIGITAL_SALE' });

    // Seed biz_keep
    await repo.saveDisputeTicket('biz_keep', { transaction_number: 'TXN-K1', category: DISPUTE_CATEGORIES.AMOUNT_MISMATCH, claimed_amount_paisa: 20000 });

    assert.strictEqual(repo.getDisputeTickets('biz_del').totalCount, 1);
    assert.strictEqual(repo.getDisputeTickets('biz_keep').totalCount, 1);

    await repo.deleteBusinessCascade('biz_del');

    assert.strictEqual(repo.getDisputeTickets('biz_del').totalCount, 0);
    assert.strictEqual(repo.getReconciliations('biz_del').totalCount, 0);
    assert.strictEqual(repo.getTransactionSettlementActions('biz_del').length, 0);

    // biz_keep is preserved
    assert.strictEqual(repo.getDisputeTickets('biz_keep').totalCount, 1);
    assert.strictEqual(repo.getReconciliations('biz_keep').totalCount, 1);
    assert.strictEqual(repo.getTransactionSettlementActions('biz_keep').length, 1);
  });

  await runTestAsync('Test 9.5: getFullBackupState sanitizes proof attachments and createStorageBackup includes manifest', async () => {
    const memAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memAdapter);
    await repo.initialize();

    await repo.saveDisputeTicket('biz_001', {
      transaction_number: 'TXN-PII-1',
      category: DISPUTE_CATEGORIES.DOUBLE_DEBIT,
      claimed_amount_paisa: 30000,
      proof_url: 'https://storage.tallykhata.com/secrets/sensitive_voucher.jpg',
    });
    const ticketId = repo.getDisputeTickets('biz_001').items[0].ticket_id;
    await repo.updateDisputeTicketSyncStatus('biz_001', [ticketId], 1);

    const backup = await repo.createStorageBackup();
    assert.strictEqual(backup.manifest.recordCounts.merchantDisputeTickets, 1);
    assert(backup.manifest.recordCounts.reconciliations !== undefined);
    assert(backup.manifest.recordCounts.transactionSettlementActions !== undefined);

    const ticketInBackup = backup.data.merchantDisputeTickets[0];
    assert.strictEqual(ticketInBackup.proof_url, '[ATTACHMENT_REDACTED_FOR_BACKUP]');
    assert.strictEqual(ticketInBackup.proofAttachmentUrl, '[ATTACHMENT_REDACTED_FOR_BACKUP]');
    assert.strictEqual(ticketInBackup.synced, 1, 'backup preserves the acknowledged sync state');
    assert.strictEqual(backup.version, 6);

    const restoredRepo = new StorageRepository(new MemoryStorageAdapter());
    await restoredRepo.initialize();
    const restoreResult = await restoredRepo.restoreStorageBackup(backup);
    assert.strictEqual(restoreResult.success, true);
    assert.strictEqual(restoredRepo.getDisputeTickets('biz_001').totalCount, 1);
    assert.strictEqual(restoredRepo.getDisputeTickets('biz_001').items[0].proof_url, '[ATTACHMENT_REDACTED_FOR_BACKUP]');
    assert.strictEqual(restoredRepo.getDisputeTickets('biz_001').items[0].synced, 1, 'restore preserves the sync state');
  });

  // -------------------------------------------------------------
  // GROUP 10: High-Throughput Performance & Latency Benchmark
  // -------------------------------------------------------------
  console.log('\n[GROUP 10: High-Throughput Performance & Latency Benchmark]');

  runTest('Test 10.1: 1,000 dispute & reconciliation operations complete under 200ms', () => {
    const engine = new SettlementDisputeEngine();
    engine.registerBusiness('bench_biz', 'Benchmark Store');

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      engine.recordDigitalCollection('bench_biz', {
        txnNumber: 'TXN-BENCH-' + i,
        amountPaisa: 10000 + (i % 100),
        customerMobile: '01700000000',
      });
    }

    const recon = engine.performReconciliation('bench_biz', {
      time: '2026-11-05 18:00:00',
      openingBalancePaisa: 500000,
      otherCashSalesPaisa: 1000000,
      otherCreditSalesPaisa: 200000,
    });

    const elapsed = Date.now() - start;
    console.log('   Benchmark executed 1,000 digital transactions + daily reconciliation in ' + elapsed + 'ms');
    assert(elapsed < 200, 'Benchmark elapsed time (' + elapsed + 'ms) must be < 200ms');
    assert(recon.totalCollectedPaisa > 0);
  });

  // Summary
  console.log('\n==================================================================');
  const total = passed + failed;
  const passRate = total === 0 ? 0 : (passed / total) * 100;
  const verdict = total > 0 && failed === 0 && passed === total ? 'PASS' : 'FAIL';
  console.log(' Passed: ' + passed + '/' + total);
  console.log(' Failed: ' + failed + '/' + total);
  console.log(' Pass rate: ' + passRate.toFixed(2) + '%');
  console.log(' Verdict: ' + verdict);
  console.log('==================================================================');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
