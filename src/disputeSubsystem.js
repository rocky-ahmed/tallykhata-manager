/**
 * src/disputeSubsystem.js
 *
 * Clean-Room TallyPay Settlement Reconciliation, Dispute Resolution & Chargeback Management Subsystem
 * Room SQLite Tables: reconciliations, transaction_settlement_action, merchant_dispute_ticket
 *
 * Milestone: REA-ITER-242
 * Target Reference: REF-001 (TallyKhata-Demo.apk, SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9)
 */

let _cachedIsoSec = 0;
let _cachedIsoStr = '';
function getFastIsoString() {
  const now = Date.now();
  const sec = Math.floor(now / 1000);
  if (sec !== _cachedIsoSec) {
    _cachedIsoSec = sec;
    _cachedIsoStr = new Date(now).toISOString();
  }
  return _cachedIsoStr;
}

// -------------------------------------------------------------
// 1. ROOM SQLITE SCHEMAS & DDL DEFINITIONS
// -------------------------------------------------------------

const RECONCILIATION_SCHEMA = Object.freeze({
  tableName: 'reconciliations',
  columns: Object.freeze([
    { name: '_id', type: 'INTEGER', primaryKey: true, autoincrement: true, notNull: true },
    { name: 'time', type: 'TEXT', notNull: true },
    { name: 'opening_balance', type: 'REAL', notNull: true },
    { name: 'other_cash_sales', type: 'REAL', notNull: true },
    { name: 'other_credit_sales', type: 'REAL', notNull: true },
    { name: 'closing_balance', type: 'REAL', notNull: true },
    { name: 'sync_status', type: 'INTEGER', notNull: true },
  ]),
  indices: Object.freeze([
    { name: 'index_reconciliations_sync_status', columns: ['sync_status'], unique: false },
  ]),
});

const TRANSACTION_SETTLEMENT_ACTION_SCHEMA = Object.freeze({
  tableName: 'transaction_settlement_action',
  columns: Object.freeze([
    { name: 'id', type: 'INTEGER', primaryKey: true, autoincrement: true, notNull: true },
    { name: 'transaction_number', type: 'TEXT', notNull: true },
    { name: 'action_type', type: 'TEXT', notNull: true },
    { name: 'synced', type: 'INTEGER', notNull: true },
    { name: 'create_date', type: 'TEXT', notNull: true },
    { name: 'update_date', type: 'TEXT', notNull: false },
  ]),
  indices: Object.freeze([
    { name: 'index_transaction_number', columns: ['transaction_number'], unique: true },
  ]),
});

const MERCHANT_DISPUTE_TICKET_SCHEMA = Object.freeze({
  tableName: 'merchant_dispute_ticket',
  columns: Object.freeze([
    { name: 'id', type: 'INTEGER', primaryKey: true, autoincrement: true, notNull: true },
    { name: 'ticket_id', type: 'TEXT', notNull: true, unique: true },
    { name: 'business_id', type: 'TEXT', notNull: true },
    { name: 'transaction_number', type: 'TEXT', notNull: true },
    { name: 'category', type: 'TEXT', notNull: true },
    { name: 'claimed_amount_paisa', type: 'INTEGER', notNull: true },
    { name: 'status', type: 'TEXT', notNull: true },
    { name: 'description', type: 'TEXT', notNull: false },
    { name: 'proof_url', type: 'TEXT', notNull: false },
    { name: 'sla_deadline', type: 'TEXT', notNull: false },
    { name: 'resolved_amount_paisa', type: 'INTEGER', notNull: false, defaultValue: 0 },
    { name: 'created_at', type: 'TEXT', notNull: true },
    { name: 'updated_at', type: 'TEXT', notNull: false },
    { name: 'synced', type: 'INTEGER', notNull: true, defaultValue: 0 },
  ]),
  indices: Object.freeze([
    { name: 'index_merchant_dispute_ticket_ticket_id', columns: ['ticket_id'], unique: true },
    { name: 'index_merchant_dispute_ticket_business_id', columns: ['business_id'], unique: false },
    { name: 'index_merchant_dispute_ticket_txn_no', columns: ['transaction_number'], unique: false },
  ]),
});

const RECONCILIATION_TABLE_DDL = [
  'CREATE TABLE IF NOT EXISTS `reconciliations` (',
  '    `_id` INTEGER PRIMARY KEY AUTOINCREMENT,',
  '    `time` TEXT NOT NULL,',
  '    `opening_balance` REAL NOT NULL,',
  '    `other_cash_sales` REAL NOT NULL,',
  '    `other_credit_sales` REAL NOT NULL,',
  '    `closing_balance` REAL NOT NULL,',
  '    `sync_status` INTEGER NOT NULL',
  ');',
  'CREATE INDEX IF NOT EXISTS `index_reconciliations_sync_status` ON `reconciliations` (`sync_status`);'
].join('\n');

const TRANSACTION_SETTLEMENT_ACTION_DDL = [
  'CREATE TABLE IF NOT EXISTS `transaction_settlement_action` (',
  '    `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,',
  '    `transaction_number` TEXT NOT NULL,',
  '    `action_type` TEXT NOT NULL,',
  '    `synced` INTEGER NOT NULL,',
  '    `create_date` TEXT NOT NULL,',
  '    `update_date` TEXT',
  ');',
  'CREATE UNIQUE INDEX IF NOT EXISTS `index_transaction_number` ON `transaction_settlement_action` (`transaction_number`);'
].join('\n');

const MERCHANT_DISPUTE_TICKET_DDL = [
  'CREATE TABLE IF NOT EXISTS `merchant_dispute_ticket` (',
  '    `id` INTEGER PRIMARY KEY AUTOINCREMENT,',
  '    `ticket_id` TEXT UNIQUE NOT NULL,',
  '    `business_id` TEXT NOT NULL,',
  '    `transaction_number` TEXT NOT NULL,',
  '    `category` TEXT NOT NULL,',
  '    `claimed_amount_paisa` INTEGER NOT NULL,',
  '    `status` TEXT NOT NULL,',
  '    `description` TEXT,',
  '    `proof_url` TEXT,',
  '    `sla_deadline` TEXT,',
  '    `resolved_amount_paisa` INTEGER,',
  '    `created_at` TEXT NOT NULL,',
  '    `updated_at` TEXT,',
  '    `synced` INTEGER NOT NULL DEFAULT 0',
  ');',
  'CREATE UNIQUE INDEX IF NOT EXISTS `index_merchant_dispute_ticket_ticket_id` ON `merchant_dispute_ticket` (`ticket_id`);',
  'CREATE INDEX IF NOT EXISTS `index_merchant_dispute_ticket_business_id` ON `merchant_dispute_ticket` (`business_id`);',
  'CREATE INDEX IF NOT EXISTS `index_merchant_dispute_ticket_txn_no` ON `merchant_dispute_ticket` (`transaction_number`);'
].join('\n');

// -------------------------------------------------------------
// 2. ENUMS & CONSTANTS
// -------------------------------------------------------------

const DISPUTE_CATEGORIES = Object.freeze({
  TXN_FAILED_BUT_DEBITED: 'TXN_FAILED_BUT_DEBITED',
  DOUBLE_DEBIT: 'DOUBLE_DEBIT',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  DELAYED_SETTLEMENT: 'DELAYED_SETTLEMENT',
  UNAUTHORIZED_TXN: 'UNAUTHORIZED_TXN',
});

const DISPUTE_CATEGORY_METADATA = Object.freeze({
  TXN_FAILED_BUT_DEBITED: Object.freeze({
    code: 'TXN_FAILED_BUT_DEBITED',
    labelBn: 'টাকা কেটেছে কিন্তু ওয়ালেটে আসেনি',
    titleBn: 'টাকা কাটার পরও লেনদেন সম্পন্ন হয়নি',
    slaHours: 24,
    priority: 'CRITICAL',
    defaultMessageIcon: 'ic_support_default_message_1',
    resolutionPath: 'Direct bank gateway reversal / re-credit',
  }),
  DOUBLE_DEBIT: Object.freeze({
    code: 'DOUBLE_DEBIT',
    labelBn: 'একই লেনদেনে একাধিকবার টাকা কাটা হয়েছে',
    titleBn: 'দ্বিগুণ টাকা কাটা হয়েছে',
    slaHours: 24,
    priority: 'HIGH',
    defaultMessageIcon: 'ic_support_default_message_2',
    resolutionPath: 'Automated duplicate charge refund',
  }),
  AMOUNT_MISMATCH: Object.freeze({
    code: 'AMOUNT_MISMATCH',
    labelBn: 'লেনদেনের পরিমাণ ভুল দেখানো হচ্ছে',
    titleBn: 'পরিমাণ অমিল / অতিরিক্ত চার্জ',
    slaHours: 48,
    priority: 'MEDIUM',
    defaultMessageIcon: 'ic_support_default_message_4',
    resolutionPath: 'Audit journal amount vs gateway amount',
  }),
  DELAYED_SETTLEMENT: Object.freeze({
    code: 'DELAYED_SETTLEMENT',
    labelBn: 'ব্যাংক অ্যাকাউন্টে টাকা জমা হয়নি',
    titleBn: 'সেটেলমেন্ট একাউন্টে টাকা পৌঁছায়নি',
    slaHours: 48,
    priority: 'MEDIUM',
    defaultMessageIcon: 'ic_support_default_message_2',
    resolutionPath: 'Bank clearing verification (BEFTN/NPSB check)',
  }),
  UNAUTHORIZED_TXN: Object.freeze({
    code: 'UNAUTHORIZED_TXN',
    labelBn: 'অননুমোদিত বা সন্দেহজনক লেনদেন',
    titleBn: 'অননুমোদিত লেনদেন',
    slaHours: 72,
    priority: 'HIGH',
    defaultMessageIcon: 'ic_problem',
    resolutionPath: 'Security lock & audit trail investigation',
  }),
});

const DISPUTE_STATUSES = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  RESOLVED_REFUNDED: 'RESOLVED_REFUNDED',
  REJECTED: 'REJECTED',
});

const DISPUTE_SLA_HOURS = Object.freeze({
  TXN_FAILED_BUT_DEBITED: 24,
  DOUBLE_DEBIT: 24,
  AMOUNT_MISMATCH: 48,
  DELAYED_SETTLEMENT: 48,
  UNAUTHORIZED_TXN: 72,
});

const SETTLEMENT_ACTION_TYPES = Object.freeze({
  DIGITAL_SALE: 'DIGITAL_SALE',
  CREDIT_COLLECTION: 'CREDIT_COLLECTION',
  NO_ACTION: 'NO_ACTION',
  REFUND: 'REFUND',
});

const RECONCILIATION_STATUSES = Object.freeze({
  MATCHED: 'MATCHED',
  DISCREPANCY: 'DISCREPANCY',
  DISCREPANCY_UNDERPAYMENT: 'DISCREPANCY_UNDERPAYMENT',
  DISCREPANCY_OVERPAYMENT: 'DISCREPANCY_OVERPAYMENT',
});

const DISPUTE_ARSC_TOKENS = Object.freeze({
  HELPLINE_NUMBER: '১৬৭২৬',
  HELPLINE_BANNER: 'হেল্পলাইন ১৬৭২৬, ০৯৬০৯০১৬৭৬ (সকাল ৯ টা থেকে রাত ৭ টা)',
  HELPLINE_ERROR_ALERT: 'কোন একটি সমস্যা হয়েছে। সহায়তার জন্য ১৬৭২৬ নম্বরে কল করুন।',
  PROBLEM_PROMPT: 'কোন একটা সমস্যা হয়েছে।',
  PROBLEM_QUERY: 'সমস্যাটি কি?',
  LIVE_SUPPORT: 'লাইভ সাপোর্ট',
  SUPPORT_GENERAL: 'সাপোর্ট',
  MESSENGER_SUPPORT: 'ম্যাসেঞ্জার সাপোর্ট',
  CHAT_HISTORY_NOTE: 'সাপোর্টে কোন প্রশ্ন করলে আপনার সব কথোপকথন এখানে জমা থাকবে। যেকোনো সময় ফিরে এসে দেখে নিতে পারবেন।',
  RECONCILIATION_HEADER: 'সমন্বয়',
  RECONCILIATION_DISMISS: 'সমন্বয় করবো না',
  RECONCILIATION_CONFIRM: 'সমন্বয় করি',
  DATA_RECONCILIATION: 'তথ্য সমন্বয়',
  DUE_RECOVERY_RECONCILIATION: '(বাকি আদায় সমন্বয়)',
  PAYMENT_RECONCILIATION: 'পেমেন্ট সমন্বয় করি',
  RECONCILIATION_SUCCESS: 'লেনদেনটি সমন্বয় করা হয়েছে।',
  REFUND_HEADER: 'ফেরত',
  PAYMENT_REFUND: 'পেমেন্ট ফেরত',
  REFUNDABLE_LABEL: 'ফেরতযোগ্য​:',
  DUE_MINUS_REFUND: 'বাকি - ফেরত',
  TOTAL_DUE_REFUND: 'মোট বাকি ফেরত',
  REFUND_OVERLIMIT_ERROR: 'ফেরত দেয়া টাকার পরিমাণ বাকির থেকে বেশি।',
  REFUND_REJECTION_ERROR: 'লেনদেনটি ফেরত দেওয়া সম্ভব হচ্ছে না।',
  TALLY_MESSAGE_REFUND: 'টালি-মেসেজ (ফেরত)',
  TAGADA_MESSAGE_REFUND: 'তাগাদা মেসেজ (ফেরত)',
  TXN_MESSAGE_REFUND: 'লেনদেন মেসেজ (ফেরত)',
});

const MAX_PROOF_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PROOF_MIME_TYPES = Object.freeze(['image/jpeg', 'image/png', 'application/pdf']);

const VALID_DISPUTE_TRANSITIONS = Object.freeze({
  SUBMITTED: Object.freeze(['UNDER_INVESTIGATION', 'REJECTED']),
  UNDER_INVESTIGATION: Object.freeze(['RESOLVED_REFUNDED', 'REJECTED']),
  RESOLVED_REFUNDED: Object.freeze([]),
  REJECTED: Object.freeze([]),
});

// -------------------------------------------------------------
// 3. PURE-JS ALGORITHMS & MATHEMATICAL UTILITIES
// -------------------------------------------------------------

/**
 * Calculates daily reconciliation between cash/credit entries and digital disbursements.
 * All arithmetic in exact integer Paisa with zero floating-point drift.
 */
function calculateDailyReconciliation(openingBalancePaisa, cashSalesPaisa, creditSalesPaisa, digitalInflowPaisa, bankDisbursedPaisa) {
  let opening = 0;
  let cash = 0;
  let credit = 0;
  let digital = 0;
  let disbursed = 0;

  if (typeof openingBalancePaisa === 'object' && openingBalancePaisa !== null) {
    const o = openingBalancePaisa;
    opening = Number(o.openingBalancePaisa !== undefined ? o.openingBalancePaisa : o.opening_balance) || 0;
    cash = Number(o.otherCashSalesPaisa !== undefined ? o.otherCashSalesPaisa : (o.cashSalesPaisa !== undefined ? o.cashSalesPaisa : o.other_cash_sales)) || 0;
    credit = Number(o.otherCreditSalesPaisa !== undefined ? o.otherCreditSalesPaisa : (o.creditSalesPaisa !== undefined ? o.creditSalesPaisa : o.other_credit_sales)) || 0;
    digital = Number(o.digitalInflowPaisa !== undefined ? o.digitalInflowPaisa : (o.totalCollectedPaisa !== undefined ? o.totalCollectedPaisa : o.digital_settlements)) || 0;
    disbursed = Number(o.bankDisbursedPaisa !== undefined ? o.bankDisbursedPaisa : (o.totalDisbursedPaisa !== undefined ? o.totalDisbursedPaisa : o.bank_disbursed)) || 0;
  } else {
    opening = Number(openingBalancePaisa) || 0;
    cash = Number(cashSalesPaisa) || 0;
    credit = Number(creditSalesPaisa) || 0;
    digital = Number(digitalInflowPaisa) || 0;
    disbursed = Number(bankDisbursedPaisa) || 0;
  }

  const closingBalancePaisa = Math.round(opening + cash + digital - disbursed);
  const variancePaisa = Math.round(digital - disbursed);

  const isMatched = (variancePaisa === 0);
  const status = isMatched ? RECONCILIATION_STATUSES.MATCHED : RECONCILIATION_STATUSES.DISCREPANCY;
  let discrepancyType = null;
  if (variancePaisa > 0) {
    discrepancyType = RECONCILIATION_STATUSES.DISCREPANCY_UNDERPAYMENT;
  } else if (variancePaisa < 0) {
    discrepancyType = RECONCILIATION_STATUSES.DISCREPANCY_OVERPAYMENT;
  }

  return {
    openingBalancePaisa: opening,
    otherCashSalesPaisa: cash,
    otherCreditSalesPaisa: credit,
    totalCollectedPaisa: digital,
    digitalInflowPaisa: digital,
    totalDisbursedPaisa: disbursed,
    bankDisbursedPaisa: disbursed,
    closingBalancePaisa,
    variancePaisa,
    status,
    discrepancyType,
    isMatched,
  };
}

/**
 * Extracts BST (UTC+6) date and time components.
 */
function getBstDateComponents(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
  if (isNaN(d.getTime())) {
    throw new Error('INVALID_DATE_INPUT');
  }
  const bstEpoch = d.getTime() + (6 * 3600 * 1000);
  const bstDate = new Date(bstEpoch);
  return {
    year: bstDate.getUTCFullYear(),
    month: bstDate.getUTCMonth(),
    day: bstDate.getUTCDate(),
    dayOfWeek: bstDate.getUTCDay(), // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    hours: bstDate.getUTCHours(),
    minutes: bstDate.getUTCMinutes(),
    seconds: bstDate.getUTCSeconds(),
    epoch: d.getTime(),
    bstEpoch,
  };
}

/**
 * Determines whether a transaction timestamp occurred before the 14:00 BST cut-off.
 */
function isBeforeCutOffTime(dateInput, cutOffHour = 14) {
  const { hours, minutes, seconds } = getBstDateComponents(dateInput);
  if (hours < cutOffHour) return true;
  if (hours === cutOffHour && minutes === 0 && seconds === 0) return true;
  return false;
}

/**
 * Calculates Bangladesh bank clearing settlement date (T+1 or T+2, skipping Fri/Sat).
 */
function calculateClearingDate(dateInput, cutOffHour = 14) {
  const bst = getBstDateComponents(dateInput);
  const isBeforeCutOff = isBeforeCutOffTime(dateInput, cutOffHour);
  const bankingDaysToAdd = isBeforeCutOff ? 1 : 2;
  const cycle = isBeforeCutOff ? 'T+1' : 'T+2';

  let currentDate = new Date(Date.UTC(bst.year, bst.month, bst.day));
  let addedDays = 0;

  while (addedDays < bankingDaysToAdd) {
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    const dow = currentDate.getUTCDay();
    if (dow !== 5 && dow !== 6) {
      addedDays++;
    }
  }

  const y = currentDate.getUTCFullYear();
  const m = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(currentDate.getUTCDate()).padStart(2, '0');
  const clearingDate = y + '-' + m + '-' + d;

  return {
    cycle,
    isBeforeCutOff,
    clearingDate,
    bankingDaysAdded: bankingDaysToAdd,
    cutOffHour,
  };
}

/**
 * Validates uploaded proof document attachments.
 */
function validateProofAttachment(options = {}) {
  const fileSizeBytes = options.fileSizeBytes || 0;
  const mimeType = options.mimeType || '';

  if (fileSizeBytes > MAX_PROOF_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'FILE_TOO_LARGE',
      message: 'প্রমাণ সংযুক্তির আকার ৫ মেগাবাইটের বেশি হতে পারবে না।',
    };
  }

  if (mimeType && !ALLOWED_PROOF_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: 'INVALID_MIME_TYPE',
      message: 'শুধুমাত্র JPEG, PNG অথবা PDF ফাইল সমর্থিত।',
    };
  }

  return { valid: true };
}

/**
 * Generates an authentic ticket ID.
 */
let _ticketCounter = 1000;
function generateDisputeTicketId(prefix = 'DISP') {
  _ticketCounter++;
  return prefix + '-' + _ticketCounter;
}

/**
 * Calculates SLA deadline date based on dispute category.
 */
function calculateSlaDeadline(category, createdAt = null) {
  const hours = DISPUTE_SLA_HOURS[category] || 48;
  const createdMs = createdAt ? new Date(createdAt).getTime() : Date.now();
  const deadlineMs = createdMs + (hours * 3600 * 1000);
  return new Date(deadlineMs).toISOString();
}

/**
 * Validates dispute lifecycle state transition.
 */
function isValidDisputeTransition(currentStatus, newStatus) {
  const allowed = VALID_DISPUTE_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

// -------------------------------------------------------------
// 4. IN-MEMORY ROOM DAOS
// -------------------------------------------------------------

class ReconciliationDao {
  constructor(initialRecords = []) {
    this.records = Array.isArray(initialRecords) ? [...initialRecords] : [];
    this.nextId = this.records.length > 0 ? Math.max(...this.records.map(r => r._id || r.id || 0)) + 1 : 1;
  }

  insert(reconciliation) {
    const id = reconciliation._id || reconciliation.id || this.nextId++;
    const record = {
      _id: id,
      id,
      business_id: String(reconciliation.business_id || reconciliation.businessId || '1'),
      businessId: String(reconciliation.business_id || reconciliation.businessId || '1'),
      time: reconciliation.time || getFastIsoString(),
      opening_balance: Number(reconciliation.opening_balance !== undefined ? reconciliation.opening_balance : reconciliation.openingBalance) || 0,
      other_cash_sales: Number(reconciliation.other_cash_sales !== undefined ? reconciliation.other_cash_sales : reconciliation.otherCashSales) || 0,
      other_credit_sales: Number(reconciliation.other_credit_sales !== undefined ? reconciliation.other_credit_sales : reconciliation.otherCreditSales) || 0,
      closing_balance: Number(reconciliation.closing_balance !== undefined ? reconciliation.closing_balance : reconciliation.closingBalance) || 0,
      sync_status: reconciliation.sync_status !== undefined ? Number(reconciliation.sync_status) : (reconciliation.syncStatus !== undefined ? Number(reconciliation.syncStatus) : 0),
    };
    this.records.push(record);
    return record;
  }

  insertAll(records = []) {
    return records.map(r => this.insert(r));
  }

  getById(id) {
    const targetId = Number(id);
    return this.records.find(r => (r._id === targetId || r.id === targetId)) || null;
  }

  getAll(businessId = null) {
    const targetBizId = businessId ? String(businessId) : null;
    return this.records.filter(r => !targetBizId || r.businessId === targetBizId);
  }

  getBySyncStatus(syncStatus, businessId = null) {
    const targetSync = Number(syncStatus);
    const targetBizId = businessId ? String(businessId) : null;
    return this.records.filter(r =>
      r.sync_status === targetSync &&
      (!targetBizId || r.businessId === targetBizId)
    );
  }

  getUnsynced(businessId = null) {
    return this.getBySyncStatus(0, businessId);
  }

  updateSyncStatus(ids, syncStatus, businessId = null) {
    const targetSync = Number(syncStatus);
    const targetBizId = businessId ? String(businessId) : null;
    const idSet = new Set((Array.isArray(ids) ? ids : [ids]).map(Number));
    let updated = 0;
    for (const r of this.records) {
      if (idSet.has(Number(r._id || r.id)) && (!targetBizId || r.businessId === targetBizId)) {
        r.sync_status = targetSync;
        updated++;
      }
    }
    return updated;
  }

  syncReconciliations(businessId, remoteRecords = []) {
    const targetBizId = String(businessId || '1');
    const inserted = [];
    for (const remote of remoteRecords) {
      const rec = this.insert({
        ...remote,
        businessId: targetBizId,
        sync_status: 1,
      });
      inserted.push(rec);
    }
    return inserted;
  }

  count(businessId = null) {
    return this.getAll(businessId).length;
  }

  countUnsynced(businessId = null) {
    return this.getUnsynced(businessId).length;
  }

  exists(id) {
    return Boolean(this.getById(id));
  }
}

class TransactionSettlementActionDao {
  constructor(initialRecords = []) {
    this.records = Array.isArray(initialRecords) ? [...initialRecords] : [];
    this.nextId = this.records.length > 0 ? Math.max(...this.records.map(r => r.id || 0)) + 1 : 1;
  }

  insert(action) {
    const txnNo = String(action.transaction_number || action.transactionNumber || '').trim();
    if (!txnNo) {
      throw new Error('TRANSACTION_NUMBER_REQUIRED');
    }

    const businessId = String(action.business_id || action.businessId || '1');
    const existing = this.records.find(r =>
      (r.transaction_number === txnNo || r.transactionNumber === txnNo) &&
      r.businessId === businessId
    );
    if (existing) {
      const err = new Error('DUPLICATE_TRANSACTION: ' + txnNo);
      err.code = 'SQLITE_CONSTRAINT_UNIQUE';
      err.duplicate = true;
      throw err;
    }

    const id = action.id || this.nextId++;
    const actionType = String(action.action_type || action.actionType || 'NO_ACTION').toUpperCase();
    const record = {
      id,
      business_id: businessId,
      businessId,
      transaction_number: txnNo,
      transactionNumber: txnNo,
      action_type: actionType,
      actionType,
      synced: action.synced !== undefined ? Number(action.synced) : 0,
      create_date: action.create_date || action.createDate || getFastIsoString(),
      update_date: action.update_date || action.updateDate || null,
    };
    this.records.push(record);
    return record;
  }

  save(action) {
    return this.insert(action);
  }

  exists(transactionNumber, businessId = null) {
    const txnNo = String(transactionNumber || '').trim();
    const targetBizId = businessId ? String(businessId) : null;
    return this.records.some(r =>
      (r.transaction_number === txnNo || r.transactionNumber === txnNo) &&
      (!targetBizId || r.businessId === targetBizId)
    );
  }

  getByTransactionNumber(transactionNumber, businessId = null) {
    const txnNo = String(transactionNumber || '').trim();
    const targetBizId = businessId ? String(businessId) : null;
    return this.records.find(r =>
      (r.transaction_number === txnNo || r.transactionNumber === txnNo) &&
      (!targetBizId || r.businessId === targetBizId)
    ) || null;
  }

  getAll(businessId = null) {
    const targetBizId = businessId ? String(businessId) : null;
    return this.records.filter(r => !targetBizId || r.businessId === targetBizId);
  }

  getUnsynced(businessId = null, limit = 100) {
    const targetBizId = businessId ? String(businessId) : null;
    const unsynced = this.records.filter(r =>
      r.synced === 0 &&
      (!targetBizId || r.businessId === targetBizId)
    );
    return unsynced.slice(0, limit);
  }

  updateSyncStatusByIds(synced, ids = [], businessId = null) {
    const targetSync = Number(synced);
    const targetBizId = businessId ? String(businessId) : null;
    const idSet = new Set((ids || []).map(Number));
    let updated = 0;
    const now = getFastIsoString();
    for (const r of this.records) {
      if (idSet.has(Number(r.id)) && (!targetBizId || r.businessId === targetBizId)) {
        r.synced = targetSync;
        r.update_date = now;
        updated++;
      }
    }
    return updated;
  }

  updateAllUnsynced(businessId = null) {
    const targetBizId = businessId ? String(businessId) : null;
    let updated = 0;
    const now = getFastIsoString();
    for (const r of this.records) {
      if (!targetBizId || r.businessId === targetBizId) {
        r.synced = 0;
        r.update_date = now;
        updated++;
      }
    }
    return updated;
  }

  count(businessId = null) {
    return this.getAll(businessId).length;
  }

  countUnsynced(businessId = null) {
    const targetBizId = businessId ? String(businessId) : null;
    return this.records.filter(r =>
      r.synced === 0 &&
      (!targetBizId || r.businessId === targetBizId)
    ).length;
  }
}

class MerchantDisputeTicketDao {
  constructor(initialRecords = []) {
    this.records = Array.isArray(initialRecords) ? [...initialRecords] : [];
    this.nextId = this.records.length > 0 ? Math.max(...this.records.map(r => r.id || 0)) + 1 : 1;
  }

  insert(ticket) {
    const ticketId = String(ticket.ticket_id || ticket.ticketId || generateDisputeTicketId()).trim();
    const existing = this.records.find(r => r.ticket_id === ticketId || r.ticketId === ticketId);
    if (existing) {
      const err = new Error('DUPLICATE_TICKET: ' + ticketId);
      err.code = 'SQLITE_CONSTRAINT_UNIQUE';
      err.duplicate = true;
      throw err;
    }

    const id = ticket.id || this.nextId++;
    const businessId = String(ticket.business_id || ticket.businessId || '1');
    const txnNumber = String(ticket.transaction_number || ticket.transactionNumber || ticket.txnNumber || '').trim();
    const category = String(ticket.category || DISPUTE_CATEGORIES.TXN_FAILED_BUT_DEBITED);
    const claimedAmountPaisa = Math.round(Number(ticket.claimed_amount_paisa !== undefined ? ticket.claimed_amount_paisa : ticket.claimedAmountPaisa) || 0);
    const status = String(ticket.status || DISPUTE_STATUSES.SUBMITTED);
    const createdAt = ticket.created_at || ticket.createdAt || getFastIsoString();
    const slaDeadline = ticket.sla_deadline || ticket.slaDeadline || calculateSlaDeadline(category, createdAt);

    const record = {
      id,
      ticket_id: ticketId,
      ticketId,
      business_id: businessId,
      businessId,
      transaction_number: txnNumber,
      transactionNumber: txnNumber,
      txnNumber,
      category,
      claimed_amount_paisa: claimedAmountPaisa,
      claimedAmountPaisa,
      status,
      description: ticket.description || ticket.disputeReason || '',
      disputeReason: ticket.description || ticket.disputeReason || '',
      proof_url: ticket.proof_url || ticket.proofAttachmentUrl || ticket.proofUrl || null,
      proofAttachmentUrl: ticket.proof_url || ticket.proofAttachmentUrl || ticket.proofUrl || null,
      sla_deadline: slaDeadline,
      slaDeadline,
      resolved_amount_paisa: Number(ticket.resolved_amount_paisa !== undefined ? ticket.resolved_amount_paisa : (ticket.refundPaisa || 0)) || 0,
      refundPaisa: Number(ticket.resolved_amount_paisa !== undefined ? ticket.resolved_amount_paisa : (ticket.refundPaisa || 0)) || 0,
      resolution: ticket.resolution || null,
      created_at: createdAt,
      createdAt,
      updated_at: ticket.updated_at || ticket.updatedAt || createdAt,
      updatedAt: ticket.updated_at || ticket.updatedAt || createdAt,
      synced: ticket.synced !== undefined ? Number(ticket.synced) : 0,
    };
    this.records.push(record);
    return record;
  }

  save(ticket) {
    return this.insert(ticket);
  }

  getById(ticketId, businessId = null) {
    const tid = String(ticketId || '').trim();
    const targetBizId = businessId ? String(businessId) : null;
    return this.records.find(r =>
      (r.ticket_id === tid || r.ticketId === tid) &&
      (!targetBizId || r.businessId === targetBizId)
    ) || null;
  }

  getByBusinessId(businessId, options = {}) {
    const targetBizId = String(businessId || '1');
    let list = this.records.filter(r => r.businessId === targetBizId);

    if (options.status) {
      const st = String(options.status).toUpperCase();
      list = list.filter(r => String(r.status).toUpperCase() === st);
    }
    if (options.category) {
      const cat = String(options.category);
      list = list.filter(r => r.category === cat);
    }
    if (options.synced !== undefined && options.synced !== null) {
      const syn = Number(options.synced);
      list = list.filter(r => Number(r.synced) === syn);
    }
    if (options.search) {
      const q = String(options.search).toLowerCase();
      list = list.filter(r =>
        (r.ticket_id && r.ticket_id.toLowerCase().includes(q)) ||
        (r.transaction_number && r.transaction_number.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

    const offset = Number(options.offset) || 0;
    const limit = options.limit !== undefined ? Number(options.limit) : list.length;
    return list.slice(offset, offset + limit);
  }

  getByTransactionNumber(transactionNumber, businessId = null) {
    const txnNo = String(transactionNumber || '').trim();
    const targetBizId = businessId ? String(businessId) : null;
    return this.records.filter(r =>
      (r.transaction_number === txnNo || r.transactionNumber === txnNo) &&
      (!targetBizId || r.businessId === targetBizId)
    );
  }

  updateStatus(ticketId, newStatus, resolutionData = {}, businessId = null) {
    const ticket = this.getById(ticketId, businessId);
    if (!ticket) {
      throw new Error('DISPUTE_NOT_FOUND: ' + ticketId);
    }

    if (!isValidDisputeTransition(ticket.status, newStatus)) {
      throw new Error('INVALID_STATUS_TRANSITION from ' + ticket.status + ' to ' + newStatus);
    }

    const now = getFastIsoString();
    ticket.status = newStatus;
    ticket.updated_at = now;
    ticket.updatedAt = now;
    ticket.synced = 0;

    if (typeof resolutionData === 'string') {
      ticket.resolution = resolutionData;
    } else if (resolutionData && typeof resolutionData === 'object') {
      if (resolutionData.resolutionNotes) ticket.resolution = resolutionData.resolutionNotes;
      if (resolutionData.resolution) ticket.resolution = resolutionData.resolution;
      if (resolutionData.resolvedAmountPaisa !== undefined) {
        ticket.resolved_amount_paisa = Number(resolutionData.resolvedAmountPaisa);
        ticket.refundPaisa = Number(resolutionData.resolvedAmountPaisa);
      }
    }

    if (newStatus === DISPUTE_STATUSES.RESOLVED_REFUNDED) {
      if (!ticket.resolved_amount_paisa) {
        ticket.resolved_amount_paisa = ticket.claimed_amount_paisa;
        ticket.refundPaisa = ticket.claimed_amount_paisa;
      }
    }

    return ticket;
  }

  updateSyncStatus(ticketIdOrIds, synced = 1, businessId = null) {
    const targetSync = Number(synced);
    const targetBizId = businessId ? String(businessId) : null;
    const idSet = new Set((Array.isArray(ticketIdOrIds) ? ticketIdOrIds : [ticketIdOrIds]).map(String));
    let updated = 0;
    for (const r of this.records) {
      const tid = String(r.ticket_id || r.ticketId);
      if (idSet.has(tid) && (!targetBizId || r.businessId === targetBizId)) {
        r.synced = targetSync;
        updated++;
      }
    }
    return updated;
  }

  getUnsynced(businessId = null, limit = 100) {
    const targetBizId = businessId ? String(businessId) : null;
    const unsynced = this.records.filter(r =>
      r.synced === 0 &&
      (!targetBizId || r.businessId === targetBizId)
    );
    return unsynced.slice(0, limit);
  }

  delete(ticketId, businessId = null) {
    const tid = String(ticketId || '').trim();
    const targetBizId = businessId ? String(businessId) : null;
    const idx = this.records.findIndex(r =>
      (r.ticket_id === tid || r.ticketId === tid) &&
      (!targetBizId || r.businessId === targetBizId)
    );
    if (idx !== -1) {
      this.records.splice(idx, 1);
      return true;
    }
    return false;
  }

  count(businessId = null) {
    const targetBizId = businessId ? String(businessId) : null;
    return this.records.filter(r => !targetBizId || r.businessId === targetBizId).length;
  }

  countUnsynced(businessId = null) {
    return this.getUnsynced(businessId).length;
  }

  exists(ticketId, businessId = null) {
    return Boolean(this.getById(ticketId, businessId));
  }
}

// -------------------------------------------------------------
// 5. UNIFIED DISPUTE & RECONCILIATION SIMULATION ENGINE
// -------------------------------------------------------------

class SettlementDisputeEngine {
  constructor() {
    this.businesses = new Map();
  }

  registerBusiness(businessId, businessName) {
    const bId = String(businessId);
    this.businesses.set(bId, {
      businessId: bId,
      businessName: String(businessName || 'Business'),
      collections: [],
      disbursements: [],
      reconciliations: [],
      disputes: [],
      settlementActions: [],
    });
    return this.businesses.get(bId);
  }

  recordDigitalCollection(businessId, { txnNumber, amountPaisa, customerMobile, timestamp }) {
    const b = this.businesses.get(String(businessId));
    if (!b) throw new Error('BUSINESS_NOT_FOUND');
    const entry = {
      txnNumber: String(txnNumber),
      amountPaisa: Math.round(Number(amountPaisa) || 0),
      customerMobile: String(customerMobile || ''),
      timestamp: timestamp || getFastIsoString(),
      reconciled: false,
    };
    b.collections.push(entry);
    return entry;
  }

  recordBankDisbursement(businessId, { disbursementId, amountPaisa, bankAccount, timestamp }) {
    const b = this.businesses.get(String(businessId));
    if (!b) throw new Error('BUSINESS_NOT_FOUND');
    const entry = {
      disbursementId: String(disbursementId),
      amountPaisa: Math.round(Number(amountPaisa) || 0),
      bankAccount: String(bankAccount || ''),
      timestamp: timestamp || getFastIsoString(),
      reconciled: false,
    };
    b.disbursements.push(entry);
    return entry;
  }

  performReconciliation(businessId, { time, openingBalancePaisa, otherCashSalesPaisa, otherCreditSalesPaisa }) {
    const b = this.businesses.get(String(businessId));
    if (!b) throw new Error('BUSINESS_NOT_FOUND');

    const totalCollected = b.collections.reduce((sum, c) => sum + c.amountPaisa, 0);
    const totalDisbursed = b.disbursements.reduce((sum, d) => sum + d.amountPaisa, 0);
    const opening = Math.round(Number(openingBalancePaisa) || 0);
    const cash = Math.round(Number(otherCashSalesPaisa) || 0);
    const credit = Math.round(Number(otherCreditSalesPaisa) || 0);

    const closingBalancePaisa = opening + cash + totalCollected - totalDisbursed;
    const variancePaisa = totalCollected - totalDisbursed;

    const reconRecord = {
      id: b.reconciliations.length + 1,
      _id: b.reconciliations.length + 1,
      time: time || getFastIsoString(),
      openingBalancePaisa: opening,
      otherCashSalesPaisa: cash,
      otherCreditSalesPaisa: credit,
      totalCollectedPaisa: totalCollected,
      totalDisbursedPaisa: totalDisbursed,
      closingBalancePaisa,
      variancePaisa,
      status: variancePaisa === 0 ? RECONCILIATION_STATUSES.MATCHED : RECONCILIATION_STATUSES.DISCREPANCY,
      syncStatus: 0,
    };
    b.reconciliations.push(reconRecord);
    return reconRecord;
  }

  fileDispute(businessId, { txnNumber, category, claimedAmountPaisa, disputeReason, proofAttachmentUrl, fileSizeBytes, mimeType }) {
    const b = this.businesses.get(String(businessId));
    if (!b) throw new Error('BUSINESS_NOT_FOUND');

    if (fileSizeBytes !== undefined) {
      const proofCheck = validateProofAttachment({ fileSizeBytes, mimeType });
      if (!proofCheck.valid) {
        throw new Error(proofCheck.error);
      }
    }

    const disputeId = 'DISP-' + (b.disputes.length + 1001);
    const amount = Math.round(Number(claimedAmountPaisa) || 0);
    const now = getFastIsoString();
    const dispute = {
      disputeId,
      id: b.disputes.length + 1,
      businessId: String(businessId),
      txnNumber: String(txnNumber),
      transactionNumber: String(txnNumber),
      category: String(category || DISPUTE_CATEGORIES.TXN_FAILED_BUT_DEBITED),
      claimedAmountPaisa: amount,
      disputeReason: disputeReason || '',
      description: disputeReason || '',
      proofAttachmentUrl: proofAttachmentUrl || null,
      proofUrl: proofAttachmentUrl || null,
      status: DISPUTE_STATUSES.SUBMITTED,
      createdAt: now,
      updatedAt: now,
      resolution: null,
      refundPaisa: 0,
      resolvedAmountPaisa: 0,
      synced: 0,
    };
    b.disputes.push(dispute);
    return dispute;
  }

  transitionDisputeStatus(businessId, disputeId, newStatus, resolutionNotes = '') {
    const b = this.businesses.get(String(businessId));
    if (!b) throw new Error('BUSINESS_NOT_FOUND');

    const dispute = b.disputes.find(d => d.disputeId === disputeId || d.id === disputeId);
    if (!dispute) throw new Error('DISPUTE_NOT_FOUND');

    if (!isValidDisputeTransition(dispute.status, newStatus)) {
      throw new Error('INVALID_STATUS_TRANSITION from ' + dispute.status + ' to ' + newStatus);
    }

    dispute.status = newStatus;
    dispute.resolution = resolutionNotes;
    dispute.updatedAt = getFastIsoString();

    if (newStatus === DISPUTE_STATUSES.RESOLVED_REFUNDED) {
      dispute.refundPaisa = dispute.claimedAmountPaisa;
      dispute.resolvedAmountPaisa = dispute.claimedAmountPaisa;

      b.settlementActions.push({
        id: b.settlementActions.length + 1,
        transactionNumber: dispute.txnNumber,
        actionType: SETTLEMENT_ACTION_TYPES.REFUND,
        synced: 0,
        createDate: getFastIsoString(),
      });
    }

    return dispute;
  }

  getUnsyncedSettlementActions(businessId) {
    const b = this.businesses.get(String(businessId));
    if (!b) throw new Error('BUSINESS_NOT_FOUND');
    return b.settlementActions.filter(a => a.synced === 0);
  }
}

const settlementDisputeEngine = new SettlementDisputeEngine();

module.exports = {
  // Room Schemas & DDL
  RECONCILIATION_SCHEMA,
  TRANSACTION_SETTLEMENT_ACTION_SCHEMA,
  MERCHANT_DISPUTE_TICKET_SCHEMA,
  RECONCILIATION_TABLE_DDL,
  TRANSACTION_SETTLEMENT_ACTION_DDL,
  MERCHANT_DISPUTE_TICKET_DDL,

  // Enums & Constants
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

  // DAOs
  ReconciliationDao,
  TransactionSettlementActionDao,
  MerchantDisputeTicketDao,

  // Algorithms & Math
  calculateDailyReconciliation,
  getBstDateComponents,
  isBeforeCutOffTime,
  calculateClearingDate,
  validateProofAttachment,
  generateDisputeTicketId,
  calculateSlaDeadline,
  isValidDisputeTransition,

  // Engine Classes & Singleton
  SettlementDisputeEngine,
  MerchantDisputeAndReconciliationEngine: SettlementDisputeEngine,
  ReconstructedDisputeReconciliationEngine: SettlementDisputeEngine,
  settlementDisputeEngine,
};
