
async function saveWalletSecurityCredentialsRepo(businessId = null, credentials = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveWalletSecurityCredentials === 'function') {
    return repo.saveWalletSecurityCredentials(businessId, credentials);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getWalletSecurityCredentialsRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getWalletSecurityCredentials === 'function') {
    return repo.getWalletSecurityCredentials(businessId);
  }
  return { id: 'CRED_1', businessId: String(businessId || '1'), storedPinHash: null };
}

async function registerDeviceBindingRepo(businessId = null, binding = {}, repo = defaultRepository) {
  if (repo && typeof repo.registerDeviceBinding === 'function') {
    return repo.registerDeviceBinding(businessId, binding);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getDeviceBindingsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getDeviceBindings === 'function') {
    return repo.getDeviceBindings(businessId, options);
  }
  return [];
}

function getActiveDeviceBindingRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getActiveDeviceBinding === 'function') {
    return repo.getActiveDeviceBinding(businessId);
  }
  return null;
}

async function revokeDeviceBindingRepo(businessId = null, deviceId = null, repo = defaultRepository) {
  if (repo && typeof repo.revokeDeviceBinding === 'function') {
    return repo.revokeDeviceBinding(businessId, deviceId);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}
﻿/**
 * src/storageRepository.js
 * Production Storage Repository & Offline State Manager for TallyKhata
 * - Stable, module-scoped write queue mutex that survives component rerenders
 * - mutateCollection(collectionName, updater): Atomic same-collection updates on latest committed data
 * - mutateStore(updater): Multi-collection atomic mutations inside the write queue
 * - Prevents stale React state snapshots from overwriting newer records
 * - Protects against failed write lockups (queue never permanently blocks)
 * - Safe v5 to v6 migration with backup retention
 * - Injectable storage adapter (AsyncStorage in production, Memory/Disk in test)
 */

const SAFETY_SNAPSHOT_KEY = 'tallykhata_safety_snapshot';
let moneyManagerService = null;
try {
  moneyManagerService = require('./moneyManagerService');
} catch (e) {}

let preferencesService = null;
try {
  preferencesService = require('./preferencesService');
} catch (e) {}

let securityService = null;
try {
  securityService = require('./securityService');
} catch (e) {}

let audioNoteService = null;
try {
  audioNoteService = require('./audioNoteService');
} catch (e) {}

let receiptImageService = null;
try {
  receiptImageService = require('./receiptImageService');
} catch (e) {}

let voucherPdfService = null;
try {
  voucherPdfService = require('./voucherPdfService');
} catch (e) {}

let banglaQrService = null;
try {
  banglaQrService = require('./banglaQrService');
} catch (e) {}

let tallyPayService = null;
try {
  tallyPayService = require('./tallyPayService');
} catch (e) {}

const {
  BALANCE_CHANGE_TYPES: TP_BALANCE_CHANGE_TYPES,
  TXN_STATUSES: TP_TXN_STATUSES,
  TXN_INCOMING_OUTGOING_FILTERS: TP_TXN_FILTERS,
  TRANSACTION_TYPES: TP_TRANSACTION_TYPES,
  formatTransactionStatementItem,
  queryWalletTransactions,
  calculateMonthlyTransactionSummary,
  generateTransactionReceiptDetails,
  generateShareText,
  TransactionHistoryEngine,
  transactionHistoryEngine,
} = tallyPayService || {};

let soundboxService = null;
try {
  soundboxService = require('./soundboxService');
} catch (e) {}

let thermalPrintService = null;
try {
  thermalPrintService = require('./thermalPrintService');
} catch (e) {}

let digitalAnalyticsService = null;
try {
  digitalAnalyticsService = require('./digitalAnalyticsService');
} catch (e) {}

let ledgerEngine = null;
try {
  ledgerEngine = require('./ledgerEngine');
} catch (e) {}

let batchTagadaService = null;
try {
  batchTagadaService = require('./batchTagadaService');
} catch (e) {}

let analyticsSubsystem = null;
try {
  analyticsSubsystem = require('./analyticsSubsystem');
} catch (e) {}

let disputeSubsystem = null;
try {
  disputeSubsystem = require('./disputeSubsystem');
} catch (e) {}

const {
  calculateDailyReconciliation,
  getBstDateComponents,
  isBeforeCutOffTime,
  calculateClearingDate,
  validateProofAttachment,
  generateDisputeTicketId,
  calculateSlaDeadline,
  isValidDisputeTransition,
  DISPUTE_CATEGORIES,
  DISPUTE_CATEGORY_METADATA,
  DISPUTE_STATUSES,
  DISPUTE_SLA_HOURS,
  SETTLEMENT_ACTION_TYPES,
  RECONCILIATION_STATUSES,
  DISPUTE_ARSC_TOKENS,
  ReconciliationDao,
  TransactionSettlementActionDao,
  MerchantDisputeTicketDao,
  SettlementDisputeEngine,
  settlementDisputeEngine,
} = disputeSubsystem || {};

const {
  calculateBusinessHealthScore,
  classifyHealthTier,
  calculateWeightedMovingAverage,
  calculateExponentialSmoothing,
  calculateHoltWintersLinearTrend,
  generateSalesForecast,
  calculateCustomerRankings,
  calculateCategoryExpenseBreakdown,
  calculateSalesMarginBreakdown,
  MerchantAnalyticsSnapshotRecord,
  MerchantSalesForecastRecord,
  MerchantAnalyticsSnapshotDao,
  MerchantSalesForecastDao,
  merchantAnalyticsEngine,
} = analyticsSubsystem || {};

let billPaymentService = null;
try {
  billPaymentService = require('./billPaymentService');
} catch (e) {}

const {
  BILLER_CATEGORIES,
  BILL_PAYMENT_INPUT_DATA_TYPES,
  BILL_PAYMENT_INPUT_UI_TYPES,
  BILL_PAYMENT_LABEL_KEYWORDS,
  BENGALI_ARSC_TOKENS: BILL_ARSC_TOKENS,
  BILLER_PROVIDERS,
  calculateBillConvenienceFee,
  calculateUtilityBillFeePaisa,
  calculateServiceChargePaisa,
  fetchBillInfo,
  generateBillPaymentTransactionId,
  executeBillPayment,
  saveBillerAccount,
  getSavedBillers,
  deleteSavedBiller,
  getBillReceiptList,
  BillPaymentEngine,
  billPaymentEngine,
} = billPaymentService || {};

const {
  TAGADA_CHANNELS,
  DISPATCH_MODES,
  DEBT_AGING_TIERS,
  TELECOM_LIMITS,
  BENGALI_ARSC_TOKENS,
  toBengaliNumerals,
  formatBengaliCurrency,
  formatBengaliDate,
  isValidBangladeshiMobile,
  generateSmsContent,
  evaluateBatchSelection,
  categorizeDebtAging,
  sortDebtorsByPriority,
  TagadaBatchDispatchEngine,
  batchTagadaEngine,
} = batchTagadaService || {};

const {
  createReceiptImageMetadata,
  validateReceiptImage,
  sanitizeReceiptImagesForBackup,
  calculateReceiptStorageUsage,
  deleteReceiptFile,
  cleanOrphanedReceiptImages,
  calculateThumbnailBounds,
  extractVoucherDetails,
  inferVoucherFields,
  isHighConfidence,
  isMediumConfidence,
  formatInferredSummary,
  CONFIDENCE_HIGH,
  CONFIDENCE_MEDIUM,
} = receiptImageService || {};

const {
  createAudioNoteMetadata,
  validateAudioNote,
  sanitizeAudioNotesForBackup,
  calculateAudioStorageUsage,
  deleteAudioFile,
  cleanOrphanedAudioFiles,
  formatDuration,
  parseDuration,
  formatFileSize,
  AudioRecorderStateMachine,
  AudioPlayerStateMachine,
} = audioNoteService || {};

const {
  createDefaultSecurityConfig,
  normalizeSecurityConfig,
  validatePinFormat,
  generateSalt,
  hashPin,
  verifyPinHash,
  migratePlaintextPin,
} = securityService || {};

const MM_STORAGE_KEY = (moneyManagerService && moneyManagerService.MM_STORAGE_KEY) || '@tallykhata_personal_money_manager_v2';
const PREFERENCES_STORAGE_KEY = (preferencesService && preferencesService.PREFERENCES_STORAGE_KEY) || '@tallykhata_app_preferences_v1';

const {
  migrateV5toV6,
  V5_KEY,
  V6_KEY,
  V5_BACKUP_KEY,
  recalculateAccountRunningBalances,
  normalizeAccountFields,
  normalizeTagadaLogFields,
  resolveStatementDateRange,
  generateAccountStatement,
  calculateSmsSegments,
  getBulkTagadaEligibleCustomers,
  prepareBulkTagadaBatch,
  generateStatementDocumentPayload,
  REPORT_TYPES,
  escapeHtml,
  generatePrintableHtmlStatement,
  generateConsolidatedReportDocument,
  generatePrintableHtmlReport,
  generateCustomerListReportDocument,
  generateExpenseReportDocument,
  generateStockMovementReportDocument,
  REPORT_PREFIXES,
  toBengaliNumeral,
  paginateStatementDocument,
  paginateConsolidatedReportDocument,
  generatePdfShareIntentPayload,
} = require('./ledgerEngine');

const VALID_COLLECTIONS = new Set([
  'accounts',
  'journals',
  'cashEntries',
  'inventory',
  'stock',
  'notes',
  'walletTxns',
  'businesses',
  'tagadaLogs',
  'tagada_log',
  'audioNotes',
  'receiptImages',
  'voucherPrintLogs',
  'banglaQrTransactions',
  'tallyPayAddMoneyTxns',
  'soundboxLogs',
  'billPaymentTransactions',
  'savedBillers',
  'tallyPayTransactions',
  'tallyPayBeneficiaries',
  'qrSettlementActions',
  'merchantDisbursements',
  'reconciliations',
  'walletSecurityCredentials',
  'deviceBindings',
    'linkedBankAccounts',
    'linkedMfsAccounts',
    'savedCards',
    'transferHistory',
    'rechargeHistory',
  'settlementHistory',
  'transactionSettlementActions',
  'soundboxConfig',
  'merchantKyc',
  'merchantQrOrders',
  'merchantLoans',
  'merchantLoanEmis',
  'merchantRewards',
  'merchantRewardLedger',
  'merchantAnalyticsSnapshots',
  'merchantSalesForecasts',
  'merchantDisputeTickets',
]);

// Default initial dataset with 100% mathematically consistent opening balances and journal running totals
const DEFAULT_BUSINESSES = [
  {
    id: '1',
    business_id: 1,
    name: 'Mobile Xpress',
    business_name: 'Mobile Xpress',
    businessName: 'Mobile Xpress',
    owner: 'স্বত্বাধিকারী',
    phone: '01700000000',
    address: 'বাজার রোড, ঢাকা',
    business_address: 'বাজার রোড, ঢাকা',
    businessAddress: 'বাজার রোড, ঢাকা',
    business_type: 'RETAIL',
    businessType: 'RETAIL',
    business_age: 0,
    synced: 0,
    is_active: 1,
    is_primary: 1,
    is_current: 1,
    isSelected: true,
    isArchived: false,
    isPrimary: true,
    createdAt: '2026-10-15T00:00:00.000Z',
    create_date: '2026-10-15T00:00:00.000Z',
  },
  {
    id: '2',
    business_id: 2,
    name: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ',
    business_name: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ',
    businessName: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ',
    owner: 'হাজী মো: করিম',
    phone: '01811223344',
    address: 'পাইকারি আড়ৎ, ঢাকা',
    business_address: 'পাইকারি আড়ৎ, ঢাকা',
    businessAddress: 'পাইকারি আড়ৎ, ঢাকা',
    business_type: 'WHOLESALE',
    businessType: 'WHOLESALE',
    business_age: 0,
    synced: 0,
    is_active: 1,
    is_primary: 0,
    is_current: 0,
    isSelected: false,
    isArchived: false,
    isPrimary: false,
    createdAt: '2026-10-15T00:00:00.000Z',
    create_date: '2026-10-15T00:00:00.000Z',
  },
  {
    id: '3',
    business_id: 3,
    name: 'সোনালী ফ্যাশন ও বস্ত্রালয়',
    business_name: 'সোনালী ফ্যাশন ও বস্ত্রালয়',
    businessName: 'সোনালী ফ্যাশন ও বস্ত্রালয়',
    owner: 'আহমেদ উল্লাহ',
    phone: '01911334455',
    address: 'নিউ মার্কেট, ঢাকা',
    business_address: 'নিউ মার্কেট, ঢাকা',
    businessAddress: 'নিউ মার্কেট, ঢাকা',
    business_type: 'RETAIL',
    businessType: 'RETAIL',
    business_age: 0,
    synced: 0,
    is_active: 1,
    is_primary: 0,
    is_current: 0,
    isSelected: false,
    isArchived: false,
    isPrimary: false,
    createdAt: '2026-10-15T00:00:00.000Z',
    create_date: '2026-10-15T00:00:00.000Z',
  },
];


// 1:1 Mapping between legacy default seed names and modern Bengali sample customer names
const SAMPLE_CUSTOMER_MAPPINGS = {
  '1': { legacy: 'Raihan ★ khoksha', modern: 'নমুনা গ্রাহক ০১' },
  '2': { legacy: 'Faysal ★★', modern: 'নমুনা গ্রাহক ০২' },
  '3': { legacy: 'Abd. Samad ★ Jv', modern: 'নমুনা গ্রাহক ০৩' },
  '4': { legacy: 'Tanvir ★ Al Baraka', modern: 'নমুনা গ্রাহক ০৪' },
  '5': { legacy: 'Jwel Vai Gk', modern: 'নমুনা গ্রাহক ০৫' },
  '6': { legacy: 'Shamim Telecom', modern: 'নমুনা গ্রাহক ০৬' },
  '7': { legacy: 'Kabir Hardware', modern: 'নমুনা গ্রাহক ০৭' },
  '8': { legacy: 'Babul Enterprise', modern: 'নমুনা গ্রাহক ০৮' },
  '9': { legacy: 'Rubel Electronics', modern: 'নমুনা গ্রাহক ০৯' },
  '10': { legacy: 'Shuvo Mobile Store', modern: 'নমুনা গ্রাহক ১০' },
  '11': { legacy: 'Ripon Telecom', modern: 'নমুনা গ্রাহক ১১' },
  '12': { legacy: 'Monir Store', modern: 'নমুনা গ্রাহক ১২' },
};

/**
 * Idempotently updates legacy default sample customer names under IDs '1'..'12'
 * to modern Bengali sample names without ever mutating user-created or user-renamed customers.
 */
function migrateLegacySampleCustomerNames(accounts) {
  if (!Array.isArray(accounts)) return { accounts, changed: false };
  let changed = false;
  const updatedAccounts = accounts.map((acc) => {
    if (!acc || typeof acc !== 'object') return acc;
    const mapping = SAMPLE_CUSTOMER_MAPPINGS[String(acc.id)];
    if (mapping && typeof acc.name === 'string' && acc.name.trim() === mapping.legacy) {
      changed = true;
      return {
        ...acc,
        name: mapping.modern,
      };
    }
    return acc;
  });
  return { accounts: updatedAccounts, changed };
}

function sanitizeState(state) {
  if (!state || typeof state !== 'object') return createDefaultState();
  const s = { ...state };
  if (!Array.isArray(s.merchantDisbursements)) s.merchantDisbursements = [];
  if (!Array.isArray(s.reconciliations)) s.reconciliations = [];
  if (!Array.isArray(s.walletSecurityCredentials)) s.walletSecurityCredentials = [];
  if (!Array.isArray(s.deviceBindings)) s.deviceBindings = [];
  if (!Array.isArray(s.linkedBankAccounts)) s.linkedBankAccounts = [];
  if (!Array.isArray(s.linkedMfsAccounts)) s.linkedMfsAccounts = [];
  if (!Array.isArray(s.savedCards)) s.savedCards = [];
  if (!Array.isArray(s.transferHistory)) s.transferHistory = [];
  if (!Array.isArray(s.rechargeHistory)) s.rechargeHistory = [];
  if (!Array.isArray(s.settlementHistory)) s.settlementHistory = [];
  if (!Array.isArray(s.transactionSettlementActions)) s.transactionSettlementActions = [];
  if (!Array.isArray(s.merchantKyc)) s.merchantKyc = [];
  if (!Array.isArray(s.merchantQrOrders)) s.merchantQrOrders = [];
  if (!Array.isArray(s.merchantLoans)) s.merchantLoans = [];
  if (!Array.isArray(s.merchantLoanEmis)) s.merchantLoanEmis = [];
  if (!Array.isArray(s.merchantRewards)) s.merchantRewards = [];
  if (!Array.isArray(s.merchantRewardLedger)) s.merchantRewardLedger = [];
  if (!Array.isArray(s.merchantAnalyticsSnapshots)) s.merchantAnalyticsSnapshots = [];
  if (!Array.isArray(s.merchantSalesForecasts)) s.merchantSalesForecasts = [];
  if (!Array.isArray(s.merchantDisputeTickets)) s.merchantDisputeTickets = [];
  else s.merchantDisputeTickets = s.merchantDisputeTickets.map((ticket) => {
    if (!ticket || typeof ticket !== 'object') return ticket;
    const persistedSyncState = Number(ticket.synced);
    return { ...ticket, synced: persistedSyncState === 1 ? 1 : 0 };
  });
  if (!s.soundboxConfig || typeof s.soundboxConfig !== 'object') s.soundboxConfig = {};
  if (!s.autoDisbursementConfig || typeof s.autoDisbursementConfig !== 'object') s.autoDisbursementConfig = {};
  if (!Array.isArray(s.qrSettlementActions)) s.qrSettlementActions = [];
  if (!Array.isArray(s.tallyPayBeneficiaries)) s.tallyPayBeneficiaries = [];
  if (!Array.isArray(s.tallyPayTransactions)) s.tallyPayTransactions = [];
  if (!Array.isArray(s.billPaymentTransactions)) s.billPaymentTransactions = [];
  if (!Array.isArray(s.savedBillers)) s.savedBillers = [];
  if (!Array.isArray(s.banglaQrTransactions)) s.banglaQrTransactions = [];
  if (!Array.isArray(s.tallyPayAddMoneyTxns)) s.tallyPayAddMoneyTxns = [];
  if (!Array.isArray(s.accounts)) s.accounts = [];
  if (!Array.isArray(s.journals)) s.journals = [];
  if (!Array.isArray(s.businesses)) s.businesses = DEFAULT_BUSINESSES;
  return s;
}

function createDefaultState() {
  return {
    accounts: [
      { id: '1', name: 'নমুনা গ্রাহক ০১', phone: '01711223344', type: 1, openingBalance: 3800, balance: 7000, address: 'খোকসা বাজার', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '2', name: 'নমুনা গ্রাহক ০২', phone: '01812345678', type: 1, openingBalance: 8550, balance: 10000, address: 'পশ্চিম পাড়া', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '3', name: 'নমুনা গ্রাহক ০৩', phone: '01911998877', type: 1, openingBalance: 3000, balance: 8000, address: 'জেভি মোড়', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '4', name: 'নমুনা গ্রাহক ০৪', phone: '01622334455', type: 1, openingBalance: 0, balance: 0, address: 'আল বারাকা মার্কেট', createDate: '2026-10-15', timeAgo: '৪ মাস' },
      { id: '5', name: 'নমুনা গ্রাহক ০৫', phone: '01733445566', type: 1, openingBalance: 500, balance: 500, address: 'জিকে কলোনি', createDate: '2026-10-15', timeAgo: '৫ মাস' },
      { id: '6', name: 'নমুনা গ্রাহক ০৬', phone: '01744556677', type: 1, openingBalance: 12000, balance: 12000, address: 'স্টেশন রোড', createDate: '2026-10-15', timeAgo: '৬ মাস' },
      { id: '7', name: 'নমুনা গ্রাহক ০৭', phone: '01755667788', type: 1, openingBalance: 15000, balance: 15000, address: 'মেইন রোড', createDate: '2026-10-15', timeAgo: '২ মাস' },
      { id: '8', name: 'নমুনা গ্রাহক ০৮', phone: '01766778899', type: 1, openingBalance: 18000, balance: 18000, address: 'চকবাজার', createDate: '2026-10-15', timeAgo: '১ মাস' },
      { id: '9', name: 'নমুনা গ্রাহক ০৯', phone: '01777889900', type: 1, openingBalance: 14000, balance: 14000, address: 'নিউ মার্কেট', createDate: '2026-10-15', timeAgo: '৩ মাস' },
      { id: '10', name: 'নমুনা গ্রাহক ১০', phone: '01788990011', type: 1, openingBalance: 9000, balance: 9000, address: 'কলেজ গেট', createDate: '2026-10-15', timeAgo: '৪ মাস' },
      { id: '11', name: 'নমুনা গ্রাহক ১১', phone: '01799001122', type: 1, openingBalance: 7000, balance: 7000, address: 'থানা মোড়', createDate: '2026-10-15', timeAgo: '৫ মাস' },
      { id: '12', name: 'নমুনা গ্রাহক ১২', phone: '01712341234', type: 1, openingBalance: 8000, balance: 8000, address: 'হাসপাতাল রোড', createDate: '2026-10-15', timeAgo: '২ মাস' },
    ],
    journals: [
      { id: '1', accountId: '1', type: 'given', amount: 3200, desc: 'বাকিতে চাল ও ডাল বিক্রয়', date: '2026-10-15', time: '10:30 AM', runningBalance: 7000 },
      { id: '2', accountId: '2', type: 'given', amount: 1450, desc: 'মালামাল বাকি বিক্রি', date: '2026-10-15', time: '11:15 AM', runningBalance: 10000 },
      { id: '3', accountId: '3', type: 'given', amount: 5000, desc: 'পাইকারি মাল ক্রয় বাবদ দেনা', date: '2026-10-15', time: '02:00 PM', runningBalance: 8000 },
    ],
    cashEntries: [
      { id: '1', category: 'sale', type: 'in', amount: 4500, desc: 'সকালের নগদ বিক্রি', date: '2026-10-15', time: '09:00 AM' },
      { id: '2', category: 'cost', type: 'out', amount: 250, desc: 'দোকান খরচ ও নাস্তা', date: '2026-10-15', time: '11:00 AM' },
      { id: '3', category: 'malik_in', type: 'in', amount: 2000, desc: 'মালিকের দেওয়া নগদ টাকা (জমা)', date: '2026-10-15', time: '08:30 AM' },
    ],
    inventory: [
      { id: '1', name: 'মিনিকেট চাল (৫০ কেজি)', unit: 'বস্তা', buyPrice: 3200, sellPrice: 3450, stock: 25 },
      { id: '2', name: 'তীর সয়াবিন তেল (৫ লিটার)', unit: 'বোতল', buyPrice: 820, sellPrice: 875, stock: 40 },
      { id: '3', name: 'চিনি (প্যাকেট)', unit: 'কেজি', buyPrice: 130, sellPrice: 140, stock: 65 },
      { id: '4', name: 'মসুর ডাল (দেশি)', unit: 'কেজি', buyPrice: 135, sellPrice: 150, stock: 8 },
    ],
    stock: [
      { id: '1', name: 'মিনিকেট চাল (৫০ কেজি)', unit: 'বস্তা', buyPrice: 3200, sellPrice: 3450, stock: 25 },
      { id: '2', name: 'তীর সয়াবিন তেল (৫ লিটার)', unit: 'বোতল', buyPrice: 820, sellPrice: 875, stock: 40 },
      { id: '3', name: 'চিনি (প্যাকেট)', unit: 'কেজি', buyPrice: 130, sellPrice: 140, stock: 65 },
      { id: '4', name: 'মসুর ডাল (দেশি)', unit: 'কেজি', buyPrice: 135, sellPrice: 150, stock: 8 },
    ],
    notes: [
      { id: '1', text: 'রবিবার সকালে আড়ৎ থেকে চাল ও তেল ডেলিভারি আসবে', isComplete: false, date: '2026-10-15' },
      { id: '2', text: 'বিদ্যুৎ বিল ও দোকান ভাড়া পরিশোধ করা হয়েছে', isComplete: true, date: '2026-10-15' },
    ],
    walletBalance: 1500,
    walletTxns: [
      { id: 'w1', title: 'অ্যাড মানি (বিকাশ)', amount: 2500, type: 'in', date: '2026-10-15', time: '10:00 AM' },
      { id: 'w2', title: 'মোবাইল রিচার্জ (01711223344)', amount: 100, type: 'out', date: '2026-10-15', time: '12:30 PM' },
    ],
    businessName: 'Mobile Xpress',
    ownerName: 'স্বত্বাধিকারী',
    ownerPhone: '01700000000',
    businessAddress: 'বাজার রোড, ঢাকা',
    businesses: DEFAULT_BUSINESSES,
    activeBusinessId: '1',
    remainingSmsCount: 5,
    tallyMessageBalance: 50,
    openingBalance: 3000,
    pinEnabled: false,
    appPin: '',
    securityConfig: (securityService && typeof securityService.createDefaultSecurityConfig === 'function')
      ? securityService.createDefaultSecurityConfig()
      : {
          pinEnabled: false,
          pinHash: '',
          salt: '',
          iterations: 10000,
          failedAttempts: 0,
          lockoutUntil: null,
          lockoutLevel: 0,
          isLocked: false,
          lastActiveTimestamp: Date.now(),
          appBackgroundedTimestamp: null,
          autoLockTimeoutMs: 180000,
          biometricsEnabled: false,
          biometricsSupported: true,
          biometricKeySignature: null,
          version: 1,
        },
    tagadaLogs: [],
    tagada_log: [],
    tagada_quota: {
      '1': {
        freeSmsCount: 5,
        purchasedSmsCount: 50,
        lastRefreshDate: '2026-11-04T00:00:00.000Z',
      },
      '2': {
        freeSmsCount: 5,
        purchasedSmsCount: 50,
        lastRefreshDate: '2026-11-04T00:00:00.000Z',
      },
      '3': {
        freeSmsCount: 5,
        purchasedSmsCount: 50,
        lastRefreshDate: '2026-11-04T00:00:00.000Z',
      },
    },
    tagadaQuota: {
      '1': {
        freeSmsCount: 5,
        purchasedSmsCount: 50,
        lastRefreshDate: '2026-11-04T00:00:00.000Z',
      },
      '2': {
        freeSmsCount: 5,
        purchasedSmsCount: 50,
        lastRefreshDate: '2026-11-04T00:00:00.000Z',
      },
      '3': {
        freeSmsCount: 5,
        purchasedSmsCount: 50,
        lastRefreshDate: '2026-11-04T00:00:00.000Z',
      },
    },
    audioNotes: [],
    receiptImages: [],
    voucherPrintLogs: [],
    banglaQrTransactions: [],
    tallyPayAddMoneyTxns: [],
    soundboxLogs: [],
    soundboxSettings: {},
    soundboxDeviceSettings: {},
    billPaymentTransactions: [],
    savedBillers: [],
    tallyPayTransactions: [],
    tallyPayBeneficiaries: [],
    qrSettlementActions: [],
    merchantDisbursements: [],
    reconciliations: [],
    walletSecurityCredentials: [],
    deviceBindings: [],
      linkedBankAccounts: [],
      linkedMfsAccounts: [],
      savedCards: [],
      transferHistory: [],
      rechargeHistory: [],
    settlementHistory: [],
    transactionSettlementActions: [],
    soundboxConfig: {},
    merchantKyc: [],
    merchantQrOrders: [],
    merchantLoans: [],
    merchantLoanEmis: [],
    merchantRewards: [],
    merchantRewardLedger: [],
    merchantAnalyticsSnapshots: [],
    merchantSalesForecasts: [],
    merchantDisputeTickets: [],
    autoDisbursementConfig: {},
    version: 6,
  };
}

/**
 * Extracts numeric timestamp (epoch ms) from a record across multiple candidate field names.
 * @param {Object} record
 * @param {string|string[]} [customFields]
 * @returns {number}
 */
function extractRecordTimestamp(record, customFields = null) {
  if (!record || typeof record !== 'object') return 0;
  const fields = customFields
    ? (Array.isArray(customFields) ? customFields : [customFields])
    : [
        'updated_at',
        'update_date',
        'updatedAt',
        'timestamp',
        'syncedDate',
        'synced_date',
        'date',
        'txn_date',
        'created_at',
        'create_date',
        'createdAt',
      ];
  for (const f of fields) {
    if (record[f] !== undefined && record[f] !== null && record[f] !== '') {
      const val = record[f];
      if (typeof val === 'number') {
        if (!isNaN(val)) return val;
      }
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

/**
 * Checks whether two records have meaningful differences in business data fields,
 * ignoring synchronization metadata fields.
 * @param {Object} recA
 * @param {Object} recB
 * @returns {boolean}
 */
function recordsDiffer(recA, recB) {
  if (!recA || !recB) return true;
  const ignore = new Set(['synced', 'is_synced', 'syncedDate', 'synced_date', 'last_sync', 'client_id']);
  const allKeys = new Set([...Object.keys(recA), ...Object.keys(recB)]);
  for (const k of allKeys) {
    if (ignore.has(k)) continue;
    const valA = recA[k];
    const valB = recB[k];
    if (valA === valB) continue;
    if ((valA === undefined || valA === null) && (valB === undefined || valB === null)) continue;
    if (typeof valA === 'object' && typeof valB === 'object' && valA !== null && valB !== null) {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) return true;
    } else if (valA !== valB) {
      return true;
    }
  }
  return false;
}

/**
 * Universal Compression Detection and Decompression for StorageRepository (REA-ITER-214)
 */
function isStoragePayloadCompressed(payload) {
  if (!payload) return false;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload)) {
    if (payload.length >= 2 && payload[0] === 0x1f && payload[1] === 0x8b) return true;
    if (payload.length >= 2 && payload[0] === 0x78) return true;
    return false;
  }
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (trimmed.startsWith('H4sI')) return true;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return isStoragePayloadCompressed(parsed);
      } catch (_) {
        return false;
      }
    }
    return false;
  }
  if (typeof payload === 'object') {
    if (payload.compressed === true) return true;
    if (payload.compression === 'gzip' || payload.compression === 'deflate') return true;
    if (payload.compressionAlgorithm === 'gzip' || payload.compressionAlgorithm === 'deflate') return true;
    if (Boolean(payload.compressedData)) return true;
    if (payload.manifest && (
      payload.manifest.compressed === true ||
      payload.manifest.compression === 'gzip' ||
      payload.manifest.compression === 'deflate' ||
      payload.manifest.compressionAlgorithm === 'gzip' ||
      payload.manifest.compressionAlgorithm === 'deflate'
    )) {
      return true;
    }
    if (typeof payload.data === 'string' && payload.data.startsWith('H4sI')) {
      return true;
    }
  }
  return false;
}

function decompressStoragePayload(payload) {
  if (!payload) return payload;
  let zlib = null;
  if (typeof require !== 'undefined') {
    try {
      zlib = require('zlib');
    } catch (_) {
      zlib = null;
    }
  }
  if (!zlib) return payload;

  // Case 1: Buffer
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload)) {
    try {
      const isDeflate = payload.length >= 2 && payload[0] === 0x78;
      const decompStr = isDeflate ? zlib.inflateSync(payload).toString('utf8') : zlib.gunzipSync(payload).toString('utf8');
      const parsed = JSON.parse(decompStr);
      return decompressStoragePayload(parsed);
    } catch (e) {
      return payload;
    }
  }

  // Case 2: String
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (trimmed.startsWith('H4sI')) {
      try {
        const buf = Buffer.from(trimmed, 'base64');
        const decompStr = zlib.gunzipSync(buf).toString('utf8');
        const parsed = JSON.parse(decompStr);
        return decompressStoragePayload(parsed);
      } catch (e) {
        return payload;
      }
    }
    try {
      const parsed = JSON.parse(trimmed);
      return decompressStoragePayload(parsed);
    } catch (_) {
      return payload;
    }
  }

  // Case 3: Object with compressedData
  if (typeof payload === 'object') {
    if (payload.compressedData) {
      try {
        const buf = (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload.compressedData))
          ? payload.compressedData
          : Buffer.from(payload.compressedData, 'base64');
        const isDeflate = payload.compression === 'deflate' || payload.compressionAlgorithm === 'deflate';
        const decompStr = isDeflate ? zlib.inflateSync(buf).toString('utf8') : zlib.gunzipSync(buf).toString('utf8');
        const dataObj = JSON.parse(decompStr);
        return {
          ...payload,
          compressed: false,
          compression: 'none',
          compressionAlgorithm: 'none',
          manifest: payload.manifest ? {
            ...payload.manifest,
            compressed: false,
            compression: 'none',
            compressionAlgorithm: 'none',
          } : undefined,
          data: dataObj,
        };
      } catch (e) {
        return payload;
      }
    }

    if (payload.data && typeof payload.data === 'string' && payload.data.startsWith('H4sI')) {
      try {
        const buf = Buffer.from(payload.data, 'base64');
        const decompStr = zlib.gunzipSync(buf).toString('utf8');
        const dataObj = JSON.parse(decompStr);
        return {
          ...payload,
          compressed: false,
          compression: 'none',
          compressionAlgorithm: 'none',
          manifest: payload.manifest ? {
            ...payload.manifest,
            compressed: false,
            compression: 'none',
            compressionAlgorithm: 'none',
          } : undefined,
          data: dataObj,
        };
      } catch (e) {
        return payload;
      }
    }
  }

  return payload;
}

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
  async clear() {
    this.data = null;
  }
}

class StorageRepository {
  constructor(storageAdapter = null) {
    if (storageAdapter && typeof storageAdapter === 'object' && typeof storageAdapter.getItem === 'function') {
      this.adapter = storageAdapter;
    } else if (storageAdapter && typeof storageAdapter === 'object' && storageAdapter.customStore && typeof storageAdapter.customStore.getItem === 'function') {
      this.adapter = storageAdapter.customStore;
    } else if (storageAdapter && typeof storageAdapter === 'object' && storageAdapter.adapter && typeof storageAdapter.adapter.getItem === 'function') {
      this.adapter = storageAdapter.adapter;
    } else {
      this.adapter = this.createInMemoryAdapter();
    }
    this.currentStore = null;
    this.writeQueue = Promise.resolve();
    this._pendingWrites = 0;
    this.telemetry = defaultTelemetryService;
  }

  async initialize() {
    return this.loadStore();
  }

  async initStore() {
    return this.loadStore();
  }

  async init() {
    return this.loadStore();
  }

  getPendingWritesCount() {
    return Math.max(0, this._pendingWrites || 0);
  }

  isWriteQueueIdle() {
    return (this._pendingWrites || 0) === 0;
  }

  async waitForIdle() {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }
    return true;
  }

  createInMemoryAdapter() {
    const memory = new Map();
    return {
      getItem: async (key) => memory.has(key) ? memory.get(key) : null,
      setItem: async (key, val) => { memory.set(key, String(val)); },
      removeItem: async (key) => { memory.delete(key); },
      clear: async () => { memory.clear(); },
      _map: memory,
    };
  }

  setStorageAdapter(adapter) {
    if (adapter && typeof adapter.getItem === 'function' && typeof adapter.setItem === 'function') {
      this.adapter = adapter;
    }
  }

  /**
   * Safe, idempotent load of the store ensuring legacy default customer names are updated.
   */
  async loadStore() {
    const res = await this.loadInitialData();
    if (res && res.success && res.data && Array.isArray(res.data.accounts)) {
      const sampleCheck = migrateLegacySampleCustomerNames(res.data.accounts);
      if (sampleCheck.changed) {
        res.data.accounts = sampleCheck.accounts;
        if (this.currentStore) {
          this.currentStore.accounts = sampleCheck.accounts;
        }
        if (this.adapter && typeof this.adapter.setItem === 'function') {
          try {
            await this.adapter.setItem(V6_KEY, JSON.stringify(res.data));
          } catch (_) {}
        }
      }
    }
    return res;
  }
  async resetStore() {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }
    this.currentStore = null;
    this._cachedMoneyManager = null;
    clearJournalIndexCache();
    if (typeof moneyManagerService !== 'undefined' && moneyManagerService && typeof moneyManagerService.resetCache === 'function') {
      try { moneyManagerService.resetCache(); } catch (_) {}
    }
    if (typeof preferencesService !== 'undefined' && preferencesService && typeof preferencesService.resetCache === 'function') {
      try { preferencesService.resetCache(); } catch (_) {}
    }
    try {
      const { resetCache: resetLedgerCache } = require('./ledgerEngine');
      if (typeof resetLedgerCache === 'function') resetLedgerCache();
    } catch (_) {}
    this.writeQueue = Promise.resolve();
    this._pendingWrites = 0;
    return true;
  }

  getAuthoritativeState() {
    return this.currentStore ? JSON.parse(JSON.stringify(this.currentStore)) : null;
  }

  /**
   * Loads initial state with safe migration from v5 if v6 does not exist.
   * Ensures existing user records are NEVER overwritten by hardcoded seed data.
   */
  async loadInitialData() {
    try {
      let v6DataStr = await this.adapter.getItem(V6_KEY);
      if (!v6DataStr && typeof this.adapter.getItem === 'function') {
        v6DataStr = (await this.adapter.getItem('@' + V6_KEY)) ||
                    (await this.adapter.getItem('@tallykhata_state_v6')) ||
                    (await this.adapter.getItem('tallykhata_state_v6')) ||
                    (await this.adapter.getItem('tallykhata_v6_store')) ||
                    (await this.adapter.getItem('@tallykhata_v6_store'));
      }
      if (v6DataStr) {
        const parsed = JSON.parse(v6DataStr);
        let storeNeedsSave = false;
        if (Array.isArray(parsed.accounts)) {
          const sampleCheck = migrateLegacySampleCustomerNames(parsed.accounts);
          if (sampleCheck.changed) {
            parsed.accounts = sampleCheck.accounts;
            storeNeedsSave = true;
          }
        }
        if (Array.isArray(parsed.inventory) && !Array.isArray(parsed.stock)) {
          parsed.stock = parsed.inventory;
        } else if (Array.isArray(parsed.stock) && !Array.isArray(parsed.inventory)) {
          parsed.inventory = parsed.stock;
        }
        if (Array.isArray(parsed.businesses)) {
          parsed.businesses = parsed.businesses.map((b) => ({
            ...b,
            isArchived: Boolean(b.isArchived),
          }));
          const selectedBiz = parsed.businesses.find((b) => b.isSelected && !b.isArchived) ||
            parsed.businesses.find((b) => !b.isArchived) ||
            parsed.businesses[0];
          parsed.activeBusinessId = selectedBiz ? String(selectedBiz.id) : '1';
        } else {
          parsed.businesses = DEFAULT_BUSINESSES;
          parsed.activeBusinessId = '1';
        }
        // Security & PIN normalization with smooth legacy migration
        if (parsed.appPin && parsed.pinEnabled && (!parsed.securityConfig || !parsed.securityConfig.pinHash)) {
          if (securityService && typeof securityService.migratePlaintextPin === 'function') {
            try {
              const mig = securityService.migratePlaintextPin(parsed.appPin);
              parsed.securityConfig = {
                ...securityService.createDefaultSecurityConfig(),
                pinEnabled: true,
                pinHash: mig.pinHash,
                salt: mig.salt,
                iterations: mig.iterations,
              };
              parsed.appPin = '';
              storeNeedsSave = true;
            } catch (_) {}
          }
        }
        if (securityService && typeof securityService.normalizeSecurityConfig === 'function') {
          parsed.securityConfig = securityService.normalizeSecurityConfig(parsed.securityConfig || { pinEnabled: parsed.pinEnabled });
          parsed.pinEnabled = Boolean(parsed.securityConfig.pinEnabled);
        } else if (!parsed.securityConfig) {
          parsed.securityConfig = {
            pinEnabled: Boolean(parsed.pinEnabled),
            pinHash: '',
            salt: '',
            iterations: 10000,
            failedAttempts: 0,
            lockoutUntil: null,
            lockoutLevel: 0,
            isLocked: false,
            lastActiveTimestamp: Date.now(),
            appBackgroundedTimestamp: null,
            autoLockTimeoutMs: 180000,
            biometricsEnabled: false,
            biometricsSupported: true,
            biometricKeySignature: null,
            version: 1,
          };
        }

        if (storeNeedsSave) {
          try {
            await this.adapter.setItem(V6_KEY, JSON.stringify(parsed));
          } catch (e) {
            console.warn('Failed to persist migrated sample customer names:', e);
          }
        }
        this.currentStore = parsed;
        return { success: true, data: parsed, source: 'v6' };
      }

      // Check for v5 data to migrate safely
      const v5DataStr = await this.adapter.getItem(V5_KEY);
      if (v5DataStr) {
        const migResult = migrateV5toV6(v5DataStr);
        if (migResult.success && migResult.data) {
          const migratedData = migResult.data;
          if (Array.isArray(migratedData.accounts)) {
            const sampleCheck = migrateLegacySampleCustomerNames(migratedData.accounts);
            if (sampleCheck.changed) {
              migratedData.accounts = sampleCheck.accounts;
            }
          }
          // Retain unmutated v5 backup
          await this.adapter.setItem(V5_BACKUP_KEY, v5DataStr);
          // Save migrated v6 data
          await this.adapter.setItem(V6_KEY, JSON.stringify(migratedData));
          this.currentStore = migratedData;
          return { success: true, data: migratedData, source: 'migrated_v5', stats: migResult.stats };
        }
      }

      // No prior store exists: initialize with default state
      const initial = createDefaultState();
      await this.adapter.setItem(V6_KEY, JSON.stringify(initial));
      this.currentStore = initial;
      return { success: true, data: initial, source: 'initial_seed' };
    } catch (err) {
      console.error('loadInitialData failure:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Mutates a specific collection atomically inside the serialized write queue.
   * Operates on the latest committed state in the queue, preventing stale React snapshots.
   * @param {string} collectionName - One of VALID_COLLECTIONS
   * @param {Function} updater - function(currentCollection, fullStore) => updatedCollection
   * @returns {Promise<{success: boolean, data?: Object, collection?: Array, error?: any}>}
   */
  mutateCollection(collectionName, updater) {
    if (!VALID_COLLECTIONS.has(collectionName)) {
      return Promise.resolve({
        success: false,
        error: `Invalid collection: ${collectionName}. Must be one of: ${Array.from(VALID_COLLECTIONS).join(', ')}`,
      });
    }
    if (typeof updater !== 'function') {
      return Promise.resolve({
        success: false,
        error: 'Updater must be a function that receives the latest authoritative collection',
      });
    }

    return new Promise((resolve) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          try {
            if (!this.currentStore) {
              const loadRes = await this.loadInitialData();
              if (!loadRes.success) {
                resolve({ success: false, error: loadRes.error });
                return;
              }
            }

            const baseStore = JSON.parse(JSON.stringify(this.currentStore));
            const currentCollection = Array.isArray(baseStore[collectionName])
              ? baseStore[collectionName]
              : [];

            const result = await updater(currentCollection, baseStore);
            if (!Array.isArray(result)) {
              resolve({
                success: false,
                error: `Updater for ${collectionName} must return an array, received ${typeof result}`,
              });
              return;
            }

            // Deduplicate items with identical 'id' if items have an id property
            const seenIds = new Set();
            const deduplicated = [];
            for (const item of result) {
              if (item && item.id !== undefined && item.id !== null) {
                const sId = String(item.id);
                if (seenIds.has(sId)) {
                  console.warn(`Duplicate id detected and suppressed in ${collectionName}: ${sId}`);
                  continue;
                }
                seenIds.add(sId);
              }
              deduplicated.push(item);
            }

            const updatedStore = {
              ...baseStore,
              [collectionName]: deduplicated,
              ...(collectionName === 'inventory' ? { stock: deduplicated } : {}),
              ...(collectionName === 'stock' ? { inventory: deduplicated } : {}),
            };

            // Keep inventory and stock synchronized continuously (DATA-12)
            if (Array.isArray(updatedStore.inventory) && !Array.isArray(updatedStore.stock)) {
              updatedStore.stock = updatedStore.inventory;
            } else if (Array.isArray(updatedStore.stock) && !Array.isArray(updatedStore.inventory)) {
              updatedStore.inventory = updatedStore.stock;
            } else if (Array.isArray(updatedStore.inventory) && Array.isArray(updatedStore.stock)) {
              if (JSON.stringify(updatedStore.inventory) !== JSON.stringify(baseStore.inventory) &&
                  JSON.stringify(updatedStore.stock) === JSON.stringify(baseStore.stock)) {
                updatedStore.stock = updatedStore.inventory;
              } else if (JSON.stringify(updatedStore.stock) !== JSON.stringify(baseStore.stock) &&
                         JSON.stringify(updatedStore.inventory) === JSON.stringify(baseStore.inventory)) {
                updatedStore.inventory = updatedStore.stock;
              }
            }

            // Write to storage adapter first
            const serialized = JSON.stringify(updatedStore);
            await this.adapter.setItem(V6_KEY, serialized);

            // Commit to in-memory state only after successful storage write
            this.currentStore = updatedStore;
            resolve({
              success: true,
              data: updatedStore,
              collection: deduplicated,
            });
          } catch (err) {
            console.error(`mutateCollection write error on ${collectionName}:`, err);
            resolve({ success: false, error: err });
          } finally {
            this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          }
        })
        .catch((fatalErr) => {
          this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          console.error(`writeQueue recovered from error during mutateCollection(${collectionName}):`, fatalErr);
          resolve({ success: false, error: fatalErr });
        });
    });
  }

  /**
   * Mutates multiple collections or store fields atomically inside the serialized write queue.
   * @param {Function} updater - function(latestAuthoritativeStore) => updatedStore
   * @returns {Promise<{success: boolean, data?: Object, error?: any}>}
   */
  mutateStore(updater) {
    if (typeof updater !== 'function') {
      return Promise.resolve({
        success: false,
        error: 'Updater must be a function that receives the latest authoritative store',
      });
    }

    this._pendingWrites = (this._pendingWrites || 0) + 1;
    return new Promise((resolve) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          try {
            if (!this.currentStore) {
              const loadRes = await this.loadInitialData();
              if (!loadRes.success) {
                resolve({ success: false, error: loadRes.error });
                return;
              }
            }

            const baseStore = JSON.parse(JSON.stringify(this.currentStore));
            const updatedStore = await updater(baseStore);
            if (!updatedStore || typeof updatedStore !== 'object') {
              resolve({
                success: false,
                error: 'Updater must return a valid store object',
              });
              return;
            }

            // Write to storage adapter first
            const serialized = JSON.stringify(updatedStore);
            await this.adapter.setItem(V6_KEY, serialized);

            // Commit to in-memory state only after storage write succeeds
            this.currentStore = updatedStore;
            resolve({ success: true, data: updatedStore });
          } catch (err) {
            console.error('mutateStore write error:', err);
            resolve({ success: false, error: err });
          } finally {
            this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          }
        })
        .catch((fatalErr) => {
          this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          console.error('writeQueue recovered from error during mutateStore:', fatalErr);
          resolve({ success: false, error: fatalErr });
        });
    });
  }

  /**
   * Persists changes to the authoritative data store.
   * Merges changes onto the latest committed state in the writeQueue mutex.
   * @param {Object|Function} changesOrUpdater - Dictionary of fields or function(prevStore) => newStore
   * @returns {Promise<{success: boolean, data?: Object, error?: any}>}
   */
  persistData(changesOrUpdater = {}) {
    if (typeof changesOrUpdater === 'function') {
      return this.mutateStore(changesOrUpdater);
    }
    return this.mutateStore((baseStore) => {
      const updatedStore = { ...baseStore };
      for (const key of Object.keys(changesOrUpdater)) {
        if (changesOrUpdater[key] !== undefined) {
          updatedStore[key] = changesOrUpdater[key];
        }
      }
      return updatedStore;
    });
  }

  /**
   * Creates a safety snapshot of the current local state before restore.
   * Scoped to an explicit snapshotId so rollbacks never apply stale snapshots from earlier sessions.
   */
  /**
   * Enqueues an arbitrary async operation onto the FIFO writeQueue mutex.
   * Tracks pending writes and ensures serial execution with error isolation.
   * @param {Function} operation - async () => any
   * @returns {Promise<any>}
   */
  enqueueWrite(operation) {
    if (typeof operation !== 'function') {
      return Promise.reject(new Error('enqueueWrite requires a function argument'));
    }

    this._pendingWrites = (this._pendingWrites || 0) + 1;
    return new Promise((resolve, reject) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          try {
            const res = await operation();
            resolve(res);
          } catch (err) {
            console.error('Error during enqueueWrite operation:', err);
            reject(err);
          } finally {
            this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          }
        })
        .catch((fatalQueueErr) => {
          this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          console.error('writeQueue recovered from fatal error during enqueueWrite:', fatalQueueErr);
          reject(fatalQueueErr);
        });
    });
  }

  /**
   * Executes an atomic multi-step financial transaction inside the writeQueue mutex.
   * If any step throws or the post-mutation state fails financial invariants
   * (e.g. NaN balance, missing account references, negative values),
   * the mutation is automatically rolled back and the error is returned.
   * @param {Function} transactionFn - async (draftStore) => { store, result }
   * @param {Object} [options] - { validateBalances?: boolean }
   * @returns {Promise<{success: boolean, result?: any, rolledBack?: boolean, error?: string}>}
   */
  async executeAtomicTransaction(transactionFn, options = {}) {
    if (typeof transactionFn !== 'function') {
      return { success: false, rolledBack: false, error: 'Transaction requires a function' };
    }

    return this.enqueueWrite(async () => {
      if (!this.currentStore) {
        await this.loadInitialData();
      }

      const preTransactionSnapshot = JSON.parse(JSON.stringify(this.currentStore));

      try {
        const draft = JSON.parse(JSON.stringify(this.currentStore));
        const txOutput = await transactionFn(draft);

        const updatedStore = (txOutput && txOutput.store) ? txOutput.store : (txOutput !== undefined ? txOutput : draft);
        const result = (txOutput && txOutput.result !== undefined) ? txOutput.result : txOutput;

        if (!updatedStore || typeof updatedStore !== 'object') {
          throw new Error('Transaction must return a valid updated store object');
        }

        if (Array.isArray(updatedStore.accounts)) {
          for (const acc of updatedStore.accounts) {
            if (acc && (acc.balance === null || acc.balance === undefined || isNaN(Number(acc.balance)))) {
              throw new Error('Integrity violation: Account ' + acc.id + ' balance is NaN or invalid');
            }
          }
        }

        if (Array.isArray(updatedStore.journals)) {
          for (const j of updatedStore.journals) {
            if (j && (j.amount === null || j.amount === undefined || isNaN(Number(j.amount)) || Number(j.amount) < 0)) {
              throw new Error('Integrity violation: Journal ' + j.id + ' has invalid amount ' + j.amount);
            }
          }
        }

        await this.adapter.setItem(V6_KEY, JSON.stringify(updatedStore));
        this.currentStore = updatedStore;

        return {
          success: true,
          rolledBack: false,
          result,
        };
      } catch (err) {
        this.currentStore = preTransactionSnapshot;
        await this.adapter.setItem(V6_KEY, JSON.stringify(preTransactionSnapshot));
        console.warn('Atomic transaction failed and was rolled back:', err.message);

        return {
          success: false,
          rolledBack: true,
          error: err.message || String(err),
        };
      }
    });
  }

  /**
   * Vacuums and compacts local storage by:
   * 1. Removing orphaned journals referencing non-existent accounts
   * 2. Deduplicating entries by unique ID within collections
   * 3. Purging obsolete temporary safety snapshots older than maxAgeMs
   * 4. Recalculating account balances from journals to ensure ledger balance integrity
   * @param {Object} [options] - { maxSnapshotAgeMs?: number, recalculateBalances?: boolean }
   * @returns {Promise<{success: boolean, stats: Object}>}
   */
  async compactStorage(options = {}) {
    const maxSnapshotAgeMs = (options && options.maxSnapshotAgeMs) || 24 * 60 * 60 * 1000;
    const shouldRecalculate = options.recalculateBalances !== false;

    return this.enqueueWrite(async () => {
      if (!this.currentStore) {
        await this.loadInitialData();
      }

      const store = this.currentStore;
      const initialSerialized = JSON.stringify(store);
      const initialSize = initialSerialized.length;

      let orphanedJournalsRemoved = 0;
      let deduplicatedRecords = 0;
      let prunedSnapshots = 0;

      const collectionsToDedupe = ['accounts', 'journals', 'cashEntries', 'inventory', 'stock', 'notes', 'businesses'];
      for (const col of collectionsToDedupe) {
        if (Array.isArray(store[col])) {
          const seen = new Set();
          const deduped = [];
          for (const item of store[col]) {
            if (item && item.id) {
              const strId = String(item.id);
              const bizId = col === 'businesses'
                ? ''
                : String(item.businessId !== undefined && item.businessId !== null
                  ? item.businessId
                  : (item.business_id !== undefined && item.business_id !== null ? item.business_id : '1'));
              const dedupeKey = col === 'businesses' ? strId : (bizId + ':' + strId);
              if (seen.has(dedupeKey)) {
                deduplicatedRecords++;
                continue;
              }
              seen.add(dedupeKey);
            }
            deduped.push(item);
          }
          store[col] = deduped;
        }
      }

      if (Array.isArray(store.accounts) && Array.isArray(store.journals)) {
        const validAccountKeys = new Set(
          store.accounts.map((a) => {
            const biz = a.businessId || a.business_id || '1';
            return biz + ':' + a.id;
          })
        );
        const filteredJournals = [];
        for (const j of store.journals) {
          const accId = j.accountId !== undefined && j.accountId !== null ? j.accountId : j.orig_account_id;
          const biz = j.businessId || j.business_id || '1';
          if (accId && !validAccountKeys.has(biz + ':' + accId)) {
            orphanedJournalsRemoved++;
            continue;
          }
          filteredJournals.push(j);
        }
        store.journals = filteredJournals;
      }

      if (shouldRecalculate && Array.isArray(store.accounts) && Array.isArray(store.journals)) {
        try {
          const { recalculateAllAccountBalances } = require('./ledgerEngine');
          const recalcRes = recalculateAllAccountBalances(store.accounts, store.journals);
          if (recalcRes && Array.isArray(recalcRes.updatedAccounts)) {
            store.accounts = recalcRes.updatedAccounts;
          }
          if (recalcRes && Array.isArray(recalcRes.updatedJournals)) {
            store.journals = recalcRes.updatedJournals;
          }
        } catch (e) {
          console.warn('Compaction balance recalculation warning:', e.message);
        }
      }

      try {
        const snapStr = await this.adapter.getItem(SAFETY_SNAPSHOT_KEY);
        if (snapStr) {
          const parsedSnap = JSON.parse(snapStr);
          if (parsedSnap && parsedSnap.createdAt) {
            const age = Date.now() - new Date(parsedSnap.createdAt).getTime();
            if (age > maxSnapshotAgeMs) {
              await this.adapter.removeItem(SAFETY_SNAPSHOT_KEY);
              this.activeSafetySnapshot = null;
              prunedSnapshots++;
            }
          }
        }
      } catch (e) {}

      const finalSerialized = JSON.stringify(store);
      await this.adapter.setItem(V6_KEY, finalSerialized);

      const stats = {
        orphanedJournalsRemoved,
        deduplicatedRecords,
        prunedSnapshots,
        bytesReclaimed: Math.max(0, initialSize - finalSerialized.length),
        storageSizeBefore: initialSize,
        storageSizeAfter: finalSerialized.length,
      };

      return { success: true, stats, purgedJournalsCount: orphanedJournalsRemoved, orphanedJournalsRemoved, deduplicatedRecords, prunedSnapshots, bytesReclaimed: stats.bytesReclaimed };
    });
  }

  /**
   * Creates a safety snapshot of the current local state before restore.
   * Scoped to an explicit snapshotId so rollbacks never apply stale snapshots from earlier sessions.
   */
  async createLocalSafetySnapshot(customSnapshotId = null, extraState = {}) {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }

    const currentState = this.getAuthoritativeState();
    if (currentState) {
      const snapshotId = customSnapshotId || ('snap_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));

      let mmState = null;
      if (this.adapter && typeof this.adapter.getItem === 'function') {
        try {
          const rawMM = await this.adapter.getItem(MM_STORAGE_KEY);
          if (rawMM) mmState = JSON.parse(rawMM);
        } catch (e) {}
      }
      if (mmState === null && extraState) {
        if (extraState.moneyManager !== undefined && extraState.moneyManager !== null) {
          mmState = extraState.moneyManager;
        } else if (extraState.money_manager !== undefined && extraState.money_manager !== null) {
          mmState = extraState.money_manager;
        }
      }

      let prefs = extraState && extraState.preferences !== undefined ? extraState.preferences : null;
      if (prefs === null && this.adapter && typeof this.adapter.getItem === 'function') {
        try {
          const rawPrefs = await this.adapter.getItem(PREFERENCES_STORAGE_KEY);
          if (rawPrefs) prefs = JSON.parse(rawPrefs);
        } catch (e) {}
      }

      const record = {
        snapshotId,
        createdAt: new Date().toISOString(),
        state: currentState,
        moneyManager: mmState,
        preferences: prefs,
      };
      await this.adapter.setItem(SAFETY_SNAPSHOT_KEY, JSON.stringify(record));
      this.activeSafetySnapshot = record;
      return { success: true, snapshotId, timestamp: record.createdAt };
    }
    return { success: false, reason: 'No state to snapshot' };
  }

  async rollbackToSafetySnapshot(expectedSnapshotId = null) {
    if (expectedSnapshotId !== null && expectedSnapshotId !== undefined && !expectedSnapshotId) {
      return { success: false, reason: 'No fresh snapshot ID provided for this restore attempt' };
    }

    const snapshotStr = await this.adapter.getItem(SAFETY_SNAPSHOT_KEY);
    if (!snapshotStr) {
      return { success: false, reason: 'No safety snapshot found' };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(snapshotStr);
    } catch (e) {
      return { success: false, reason: 'Corrupted safety snapshot' };
    }

    let snapshotId = null;
    let stateData = null;
    let mmData = null;
    let prefsData = null;

    if (parsed && typeof parsed === 'object' && parsed.snapshotId && parsed.state) {
      snapshotId = parsed.snapshotId;
      stateData = parsed.state;
      mmData = parsed.moneyManager || null;
      prefsData = parsed.preferences || null;
    } else {
      stateData = parsed;
    }

    if (expectedSnapshotId) {
      if (!snapshotId || snapshotId !== expectedSnapshotId) {
        return {
          success: false,
          reason: 'Snapshot attempt mismatch: Expected ' + expectedSnapshotId + ', but found ' + snapshotId,
          attemptMismatch: true,
        };
      }
    }

    await this.adapter.setItem(V6_KEY, JSON.stringify(stateData));
    this.currentStore = stateData;

    if (mmData && this.adapter && typeof this.adapter.setItem === 'function') {
      try {
        await this.adapter.setItem(MM_STORAGE_KEY, JSON.stringify(mmData));
      } catch (e) {}
    }

    if (prefsData && this.adapter && typeof this.adapter.setItem === 'function') {
      try {
        await this.adapter.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefsData));
      } catch (e) {}
    }

    this.activeSafetySnapshot = null;
    this.notifyRestoreHooks({
      moneyManager: mmData,
      preferences: prefsData,
    });
    return {
      success: true,
      restored: true,
      snapshotId,
      restoredState: stateData,
      restoredMoneyManager: mmData,
      restoredPreferences: prefsData,
    };
  }

  async getFullBackupState(extraState = {}) {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }

    const authoritative = { ...this.getAuthoritativeState() };
    authoritative.pinEnabled = false;
    authoritative.appPin = '';
    if (authoritative.securityConfig && securityService && typeof securityService.createDefaultSecurityConfig === 'function') {
      authoritative.securityConfig = securityService.createDefaultSecurityConfig();
    }

    if (authoritative.audioNotes && Array.isArray(authoritative.audioNotes)) {
      authoritative.audioNotes = audioNoteService && typeof audioNoteService.sanitizeAudioNotesForBackup === 'function'
        ? audioNoteService.sanitizeAudioNotesForBackup(authoritative.audioNotes)
        : authoritative.audioNotes.map((a) => {
            const { audioBlob, base64Data, data, rawBytes, blob, buffer, ...rest } = a || {};
            return { ...rest, fileUri: null, sanitized: true, backupExcludedBinary: true };
          });
    }

    if (authoritative.receiptImages && Array.isArray(authoritative.receiptImages)) {
      authoritative.receiptImages = receiptImageService && typeof receiptImageService.sanitizeReceiptImagesForBackup === 'function'
        ? receiptImageService.sanitizeReceiptImagesForBackup(authoritative.receiptImages)
        : authoritative.receiptImages.map((r) => {
            const { imageBlob, base64Data, data, rawBytes, blob, buffer, imageData, ...rest } = r || {};
            return { ...rest, fileUri: null, thumbnailUri: null, uri: null, thumbnail: null, sanitized: true, backupExcludedBinary: true };
          });
    }

        if (authoritative.banglaQrTransactions && Array.isArray(authoritative.banglaQrTransactions)) {
      authoritative.banglaQrTransactions = authoritative.banglaQrTransactions.map((tx) => {
        const { qrMatrix, rawPayload, ...rest } = tx || {};
        return rest;
      });
    }

    if (authoritative.soundboxLogs && Array.isArray(authoritative.soundboxLogs)) {
      authoritative.soundboxLogs = authoritative.soundboxLogs.map((s) => {
        const { audioBuffer, rawBytes, audioBlob, connectionToken, socketHandle, ...rest } = s || {};
        return rest;
      });
    }

    if (authoritative.soundboxSettings && typeof authoritative.soundboxSettings === 'object') {
      const sanitizedSettings = {};
      for (const [bId, conf] of Object.entries(authoritative.soundboxSettings)) {
        if (!conf || typeof conf !== 'object') continue;
        const { connectionToken, token, socket, socketHandle, rssi, sessionToken, ...rest } = conf;
        sanitizedSettings[bId] = { ...rest, isConnected: false, connectionState: 'DISCONNECTED' };
      }
      authoritative.soundboxSettings = sanitizedSettings;
      authoritative.soundboxDeviceSettings = sanitizedSettings;
    }

    if (authoritative.voucherPrintLogs && Array.isArray(authoritative.voucherPrintLogs)) {
      authoritative.voucherPrintLogs = authoritative.voucherPrintLogs.map((v) => {
        const { buffer, rawBytes, data, ...rest } = v || {};
        return rest;
      });
    }

    if (authoritative.tagada_log && Array.isArray(authoritative.tagada_log)) {
      authoritative.tagada_log = authoritative.tagada_log.map((log) => {
        const { token, sessionToken, apiKey, gatewaySecret, pin, ...rest } = log || {};
        return rest;
      });
    }
    if (authoritative.tagadaLogs && Array.isArray(authoritative.tagadaLogs)) {
      authoritative.tagadaLogs = authoritative.tagadaLogs.map((log) => {
        const { token, sessionToken, apiKey, gatewaySecret, pin, ...rest } = log || {};
        return rest;
      });
    }
    if (authoritative.tagada_quota && typeof authoritative.tagada_quota === 'object') {
      const sanitizedQuota = {};
      for (const [bId, q] of Object.entries(authoritative.tagada_quota)) {
        if (!q || typeof q !== 'object') continue;
        const { token, apiKey, secret, ...rest } = q;
        sanitizedQuota[bId] = rest;
      }
      authoritative.tagada_quota = sanitizedQuota;
      authoritative.tagadaQuota = sanitizedQuota;
    }

    authoritative.tagada_log = authoritative.tagada_log || authoritative.tagadaLogs || [];
    authoritative.tagadaLogs = authoritative.tagadaLogs || authoritative.tagada_log || [];
    authoritative.tagada_quota = authoritative.tagada_quota || authoritative.tagadaQuota || {};

    if (authoritative.billPaymentTransactions && Array.isArray(authoritative.billPaymentTransactions)) {
      authoritative.billPaymentTransactions = authoritative.billPaymentTransactions.map((tx) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, ...rest } = tx || {};
        return rest;
      });
    } else {
      authoritative.billPaymentTransactions = [];
    }

    if (authoritative.savedBillers && Array.isArray(authoritative.savedBillers)) {
      authoritative.savedBillers = authoritative.savedBillers.map((b) => {
        const { pin, token, apiKey, secretKey, ...rest } = b || {};
        return rest;
      });
    } else {
      authoritative.savedBillers = [];
    }

    if (authoritative.tallyPayTransactions && Array.isArray(authoritative.tallyPayTransactions)) {
      authoritative.tallyPayTransactions = authoritative.tallyPayTransactions.map((tx) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, ...rest } = tx || {};
        return rest;
      });
    } else {
      authoritative.tallyPayTransactions = [];
    }

    if (authoritative.qrSettlementActions && Array.isArray(authoritative.qrSettlementActions)) {
      authoritative.qrSettlementActions = authoritative.qrSettlementActions.map((q) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, ...rest } = q || {};
        return rest;
      });
    } else {
      authoritative.qrSettlementActions = [];
    }

    if (authoritative.merchantDisbursements && Array.isArray(authoritative.merchantDisbursements)) {
      authoritative.merchantDisbursements = authoritative.merchantDisbursements.map((d) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, ...rest } = d || {};
        return rest;
      });
    } else {
      authoritative.merchantDisbursements = [];
    }

    if (authoritative.walletSecurityCredentials && Array.isArray(authoritative.walletSecurityCredentials)) {
      authoritative.walletSecurityCredentials = authoritative.walletSecurityCredentials.map((c) => {
        const { pin, rawPin, pinInput, oldPin, newPin, sessionToken, token, apiKey, secretKey, privateKey, ...rest } = c || {};
        return rest;
      });
    } else {
      authoritative.walletSecurityCredentials = [];
    }

    if (authoritative.linkedBankAccounts && Array.isArray(authoritative.linkedBankAccounts)) {
      authoritative.linkedBankAccounts = authoritative.linkedBankAccounts.map((b) => {
        const accNo = String(b.accountNumber || "");
        const maskedAcc = accNo.length > 4 ? "**** **** " + accNo.slice(-4) : "****";
        return { ...b, accountNumber: maskedAcc };
      });
    } else {
      authoritative.linkedBankAccounts = [];
    }

    if (authoritative.linkedMfsAccounts && Array.isArray(authoritative.linkedMfsAccounts)) {
      authoritative.linkedMfsAccounts = authoritative.linkedMfsAccounts.map((m) => {
        const mob = String(m.mobileNumber || "");
        const maskedMob = mob.length >= 11 ? mob.slice(0, 3) + "****" + mob.slice(-4) : "****";
        return { ...m, mobileNumber: maskedMob };
      });
    } else {
      authoritative.linkedMfsAccounts = [];
    }

        if (authoritative.rechargeHistory && Array.isArray(authoritative.rechargeHistory)) {
      authoritative.rechargeHistory = authoritative.rechargeHistory.map((r) => {
        const rawPhone = String(r.recipientMobile || r.mobileNumber || r.phone || "").replace(/[\s-]+/g, "");
        let masked = rawPhone;
        if (rawPhone.length >= 11) {
          masked = rawPhone.slice(0, 3) + "****" + rawPhone.slice(7);
        }
        return {
          ...r,
          mobileNumber: masked,
          recipientMobile: masked,
          phone: masked,
        };
      });
    } else {
      authoritative.rechargeHistory = [];
    }

    if (authoritative.merchantKyc && Array.isArray(authoritative.merchantKyc)) {
      authoritative.merchantKyc = authoritative.merchantKyc.map((k) => {
        const { selfie_base64, selfieBase64, image_base64, imageBase64, nid_front_base64, nid_back_base64, frontBase64, backBase64, biometricPayload, faceEmbedding, rawFaceData, token, sessionToken, secret, ...rest } = k || {};
        const rawNid = String(rest.nid_number || rest.nidNumber || '');
        const maskedNid = rawNid.length >= 8
          ? rawNid.slice(0, 3) + '****' + rawNid.slice(-4)
          : '****';
        return {
          ...rest,
          nid_number: maskedNid,
          nidNumber: maskedNid,
        };
      });
    } else {
      authoritative.merchantKyc = [];
    }

    if (authoritative.merchantLoans && Array.isArray(authoritative.merchantLoans)) {
      authoritative.merchantLoans = authoritative.merchantLoans.map((l) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, secret, bank_credential, ...rest } = l || {};
        return rest;
      });
    } else {
      authoritative.merchantLoans = [];
    }

    if (authoritative.merchantLoanEmis && Array.isArray(authoritative.merchantLoanEmis)) {
      authoritative.merchantLoanEmis = authoritative.merchantLoanEmis.map((e) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, secret, ...rest } = e || {};
        return rest;
      });
    } else {
      authoritative.merchantLoanEmis = [];
    }
    if (authoritative.merchantRewards && Array.isArray(authoritative.merchantRewards)) {
      authoritative.merchantRewards = authoritative.merchantRewards.map((r) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, secret, voucherCode, voucher_code, ...rest } = r || {};
        return rest;
      });
    } else {
      authoritative.merchantRewards = [];
    }

    if (authoritative.merchantRewardLedger && Array.isArray(authoritative.merchantRewardLedger)) {
      authoritative.merchantRewardLedger = authoritative.merchantRewardLedger.map((e) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, secret, ...rest } = e || {};
        return rest;
      });
    } else {
      authoritative.merchantRewardLedger = [];
    }

    if (authoritative.merchantAnalyticsSnapshots && Array.isArray(authoritative.merchantAnalyticsSnapshots)) {
      authoritative.merchantAnalyticsSnapshots = authoritative.merchantAnalyticsSnapshots.map((s) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, secret, ...rest } = s || {};
        return rest;
      });
    } else {
      authoritative.merchantAnalyticsSnapshots = [];
    }

    if (authoritative.merchantSalesForecasts && Array.isArray(authoritative.merchantSalesForecasts)) {
      authoritative.merchantSalesForecasts = authoritative.merchantSalesForecasts.map((f) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, secret, ...rest } = f || {};
        return rest;
      });
    } else {
      authoritative.merchantSalesForecasts = [];
    }

    if (authoritative.merchantDisputeTickets && Array.isArray(authoritative.merchantDisputeTickets)) {
      authoritative.merchantDisputeTickets = authoritative.merchantDisputeTickets.map((t) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, secret, proof_url, proofAttachmentUrl, proofUrl, ...rest } = t || {};
        return {
          ...rest,
          proof_url: (proof_url || proofAttachmentUrl || proofUrl) ? '[ATTACHMENT_REDACTED_FOR_BACKUP]' : null,
          proofAttachmentUrl: (proof_url || proofAttachmentUrl || proofUrl) ? '[ATTACHMENT_REDACTED_FOR_BACKUP]' : null,
        };
      });
    } else {
      authoritative.merchantDisputeTickets = [];
    }


    if (authoritative.merchantQrOrders && Array.isArray(authoritative.merchantQrOrders)) {
      authoritative.merchantQrOrders = authoritative.merchantQrOrders.map((o) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, secret, ...rest } = o || {};
        const rawPhone = String(rest.recipient_phone || rest.recipientPhone || '');
        const maskedPhone = rawPhone.length === 11
          ? rawPhone.slice(0, 3) + '****' + rawPhone.slice(-4)
          : (rawPhone ? '****' : '');
        return {
          ...rest,
          recipient_phone: maskedPhone,
          recipientPhone: maskedPhone,
        };
      });
    } else {
      authoritative.merchantQrOrders = [];
    }

    if (authoritative.transactionSettlementActions && Array.isArray(authoritative.transactionSettlementActions)) {
      authoritative.transactionSettlementActions = authoritative.transactionSettlementActions.map((t) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, secret, ...rest } = t || {};
        return rest;
      });
    } else {
      authoritative.transactionSettlementActions = [];
    }

    if (authoritative.settlementHistory && Array.isArray(authoritative.settlementHistory)) {
      authoritative.settlementHistory = authoritative.settlementHistory.map((s) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, secret, ...rest } = s || {};
        return rest;
      });
    } else {
      authoritative.settlementHistory = [];
    }

    if (authoritative.soundboxConfig && typeof authoritative.soundboxConfig === 'object') {
      const sanitizedSoundbox = {};
      for (const [bizId, cfg] of Object.entries(authoritative.soundboxConfig)) {
        if (!cfg || typeof cfg !== 'object') continue;
        const { connectionToken, token, socket, socketHandle, sessionToken, secret, ...rest } = cfg;
        sanitizedSoundbox[bizId] = { ...rest, isConnected: false, connectionState: 'DISCONNECTED' };
      }
      authoritative.soundboxConfig = sanitizedSoundbox;
    } else {
      authoritative.soundboxConfig = {};
    }

        if (authoritative.transferHistory && Array.isArray(authoritative.transferHistory)) {
      authoritative.transferHistory = authoritative.transferHistory.map((t) => {
        const rawPhone = String(t.recipientMobile || t.recipient || t.receiverMobile || t.phone || "").replace(/[\s-]+/g, "");
        let maskedRecipient = t.recipient;
        let maskedMobile = t.recipientMobile;
        let maskedReceiver = t.receiverMobile;
        if (/^01[3-9]\d{8}$/.test(rawPhone)) {
          const masked = rawPhone.slice(0, 3) + "****" + rawPhone.slice(-4);
          if (t.recipient) maskedRecipient = masked;
          if (t.recipientMobile) maskedMobile = masked;
          if (t.receiverMobile) maskedReceiver = masked;
        }
        const { pin, rawPin, pinHash, sessionToken, token, apiKey, secretKey, credential, secret, ...rest } = t || {};
        return {
          ...rest,
          ...(maskedRecipient !== undefined ? { recipient: maskedRecipient } : {}),
          ...(maskedMobile !== undefined ? { recipientMobile: maskedMobile } : {}),
          ...(maskedReceiver !== undefined ? { receiverMobile: maskedReceiver } : {}),
        };
      });
    } else {
      authoritative.transferHistory = [];
    }

    if (authoritative.savedCards && Array.isArray(authoritative.savedCards)) {
      authoritative.savedCards = authoritative.savedCards.map((c) => {
        const rawNum = String(c.cardNumber || c.maskedNumber || c.maskedCardNumber || "").replace(/[\s-]+/g, "");
        const masked = rawNum.length > 4 ? "**** **** **** " + rawNum.slice(-4) : "**** **** **** ****";
        const { cvv, cvc, pin, rawPin, sessionToken, token, apiKey, secretKey, credential, ...rest } = c || {};
        return { ...rest, cardNumber: masked, maskedCardNumber: masked, maskedNumber: masked };
      });
    } else {
      authoritative.savedCards = [];
    }

    if (authoritative.deviceBindings && Array.isArray(authoritative.deviceBindings)) {
      authoritative.deviceBindings = authoritative.deviceBindings.map((b) => {
        const { pin, rawPin, sessionToken, token, secret, ...rest } = b || {};
        return rest;
      });
    } else {
      authoritative.deviceBindings = [];
    }

    if (authoritative.reconciliations && Array.isArray(authoritative.reconciliations)) {
      authoritative.reconciliations = authoritative.reconciliations.map((r) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, ...rest } = r || {};
        return rest;
      });
    } else {
      authoritative.reconciliations = [];
    }

    if (authoritative.autoDisbursementConfig && typeof authoritative.autoDisbursementConfig === 'object') {
      const cleanCfg = {};
      for (const [bizId, cfg] of Object.entries(authoritative.autoDisbursementConfig)) {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, ...rest } = cfg || {};
        cleanCfg[bizId] = rest;
      }
      authoritative.autoDisbursementConfig = cleanCfg;
    } else {
      authoritative.autoDisbursementConfig = {};
    }

    if (authoritative.tallyPayBeneficiaries && Array.isArray(authoritative.tallyPayBeneficiaries)) {
      authoritative.tallyPayBeneficiaries = authoritative.tallyPayBeneficiaries.map((b) => {
        const { pin, rawPin, sessionToken, token, apiKey, secretKey, credential, ...rest } = b || {};
        return rest;
      });
    } else {
      authoritative.tallyPayBeneficiaries = [];
    }

    const domains = (extraState && Array.isArray(extraState.domains) && extraState.domains.length > 0)
      ? extraState.domains
      : ['all'];
    const includeAll = domains.includes('all');
    const includeMM = includeAll || domains.includes('moneyManager') || domains.includes('money_manager');
    const includePrefs = includeAll || domains.includes('preferences');

    let mmState = null;
    if (includeMM) {
      if (extraState && extraState.moneyManager !== undefined && extraState.moneyManager !== null) {
        mmState = extraState.moneyManager;
      } else if (extraState && extraState.money_manager !== undefined && extraState.money_manager !== null) {
        mmState = extraState.money_manager;
      } else if (this.adapter && typeof this.adapter.getItem === 'function') {
        try {
          const raw = await this.adapter.getItem(MM_STORAGE_KEY);
          if (raw) mmState = JSON.parse(raw);
        } catch (e) {}
      }
    }

    let prefs = null;
    if (includePrefs) {
      if (extraState && extraState.preferences !== undefined && extraState.preferences !== null) {
        prefs = extraState.preferences;
      } else if (this.adapter && typeof this.adapter.getItem === 'function') {
        try {
          const raw = await this.adapter.getItem(PREFERENCES_STORAGE_KEY);
          if (raw) prefs = JSON.parse(raw);
        } catch (e) {}
      }
    }

    return {
      ...authoritative,
      moneyManager: mmState,
      preferences: prefs,
    };
  }

  listActiveBusinesses(store = null) {
    const s = store || this.currentStore;
    const list = s && Array.isArray(s.businesses) ? s.businesses : DEFAULT_BUSINESSES;
    return list.filter((b) => !b.isArchived);
  }

  /**
   * Returns list of archived businesses.
   */
  listArchivedBusinesses(store = null) {
    const s = store || this.currentStore;
    const list = s && Array.isArray(s.businesses) ? s.businesses : [];
    return list.filter((b) => Boolean(b.isArchived));
  }

  /**
   * Returns currently active business object.
   */
  getActiveBusiness(store = null) {
    const s = store || this.currentStore;
    const list = s && Array.isArray(s.businesses) ? s.businesses : DEFAULT_BUSINESSES;
    return (
      list.find((b) => b.isSelected && !b.isArchived) ||
      list.find((b) => !b.isArchived) ||
      list[0] ||
      DEFAULT_BUSINESSES[0]
    );
  }

  /**
   * Returns currently active business ID.
   */
  getActiveBusinessId(store = null) {
    const active = this.getActiveBusiness(store);
    return active ? String(active.id) : '1';
  }

  /**
   * Filters an array of items by businessId. Items without businessId default to business '1'.
   */
  filterByBusiness(collection, businessId) {
    if (!Array.isArray(collection)) return [];
    const targetId = String(businessId || '1');
    return collection.filter((item) => {
      const itemBizId = String(
        item?.businessId !== undefined && item?.businessId !== null
          ? item.businessId
          : (item?.business_id !== undefined && item?.business_id !== null ? item.business_id : '1')
      );
      return itemBizId === targetId;
    });
  }

  /**
   * Switches active business. Validates business exists and is not archived.
   */
  async selectBusiness(bizId) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const target = list.find((b) => String(b.id) === targetId);
      if (!target) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }
      if (target.isArchived) {
        throw new Error('আর্কাইভ করা ব্যবসা সরাসরি নির্বাচন করা যাবে না। প্রথমে এটি পুনরুদ্ধার করুন।');
      }

      const nowIso = new Date().toISOString();
      const updatedBusinesses = list.map((b) => {
        const isCur = String(b.id) === targetId;
        return {
          ...b,
          isSelected: isCur,
          is_current: isCur ? 1 : 0,
          isCurrent: isCur,
          update_date: isCur ? nowIso : (b.update_date || b.updateDate || null),
          updateDate: isCur ? nowIso : (b.update_date || b.updateDate || null),
        };
      });

      const prevActiveId = String(prevStore.activeBusinessId || '1');
      const quotaMap = { ...(prevStore.tagada_quota || prevStore.tagadaQuota || {}) };
      if (prevStore.remainingSmsCount !== undefined) {
        quotaMap[prevActiveId] = {
          ...(quotaMap[prevActiveId] || {}),
          freeSmsCount: Number(prevStore.remainingSmsCount),
          purchasedSmsCount: Number(prevStore.tallyMessageBalance !== undefined ? prevStore.tallyMessageBalance : 50),
          lastRefreshDate: quotaMap[prevActiveId]?.lastRefreshDate || new Date().toISOString(),
          businessId: prevActiveId,
        };
      }
      const targetQuota = quotaMap[targetId] || { freeSmsCount: 5, purchasedSmsCount: 50 };

      return {
        ...prevStore,
        activeBusinessId: targetId,
        businessName: target.name,
        ownerName: target.owner || prevStore.ownerName || '',
        ownerPhone: target.phone || prevStore.ownerPhone || '',
        businessAddress: target.address || prevStore.businessAddress || '',
        businesses: updatedBusinesses,
        tagada_quota: quotaMap,
        tagadaQuota: quotaMap,
        remainingSmsCount: targetQuota.freeSmsCount !== undefined ? targetQuota.freeSmsCount : 5,
        tallyMessageBalance: targetQuota.purchasedSmsCount !== undefined ? targetQuota.purchasedSmsCount : 50,
      };
    });
  }

  /**
   * Creates a new business with stable unique ID, non-archived status, and validation.
   */
  async createBusiness(bizData) {
    if (!bizData || typeof bizData !== 'object') {
      return { success: false, error: new Error('ব্যবসার তথ্য সঠিক নয়') };
    }
    const name = String(bizData.name || '').trim();
    if (!name) {
      return { success: false, error: new Error('ব্যবসার নাম লেখা আবশ্যক') };
    }

    const newId = bizData.id ? String(bizData.id) : ('biz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    const isSelected = bizData.isSelected !== false;

    const nowIso = new Date().toISOString();
    const bType = String(bizData.business_type || bizData.businessType || bizData.type || 'RETAIL');
    const newBiz = {
      id: newId,
      business_id: isNaN(Number(newId)) ? newId : Number(newId),
      name,
      business_name: name,
      businessName: name,
      owner: String(bizData.owner || '').trim() || 'স্বত্বাধিকারী',
      phone: String(bizData.phone || '').trim() || '01700000000',
      address: String(bizData.address || '').trim() || 'ঢাকা, বাংলাদেশ',
      business_address: String(bizData.address || '').trim() || 'ঢাকা, বাংলাদেশ',
      businessAddress: String(bizData.address || '').trim() || 'ঢাকা, বাংলাদেশ',
      business_type: bType,
      businessType: bType,
      business_age: Number(bizData.business_age || bizData.businessAge || 0),
      businessAge: Number(bizData.business_age || bizData.businessAge || 0),
      synced: 0,
      is_active: 1,
      is_primary: 0,
      is_current: isSelected ? 1 : 0,
      isSelected,
      isArchived: false,
      isPrimary: false,
      createdAt: bizData.createdAt || nowIso,
      create_date: bizData.create_date || bizData.createDate || bizData.createdAt || nowIso,
      createDate: bizData.create_date || bizData.createDate || bizData.createdAt || nowIso,
      update_date: null,
      updateDate: null,
      sync_date: null,
    };

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      if (list.some((b) => String(b.id) === newId)) {
        throw new Error('এই আইডি বিশিষ্ট ব্যবসা ইতোমধ্যে বিদ্যমান: ' + newId);
      }

      const updatedBusinesses = isSelected
        ? [...list.map((b) => ({ ...b, isSelected: false, is_current: 0, isCurrent: false })), newBiz]
        : [...list, newBiz];

      return {
        ...prevStore,
        businesses: updatedBusinesses,
        ...(isSelected
          ? {
              activeBusinessId: newBiz.id,
              businessName: newBiz.name,
              ownerName: newBiz.owner,
              ownerPhone: newBiz.phone,
              businessAddress: newBiz.address,
            }
          : {}),
      };
    });
  }

  /**
   * Reversibly archives a business.
   * Safety guard: Never allows the sole remaining active business to be archived.
   * If the archived business was active, automatically switches to next active business.
   */
  async archiveBusiness(bizId) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const activeList = list.filter((b) => !b.isArchived);

      if (activeList.length <= 1) {
        throw new Error('কমপক্ষে একটি ব্যবসা সক্রিয় থাকতে হবে। একমাত্র সক্রিয় ব্যবসাটি আর্কাইভ করা যাবে না।');
      }

      const target = list.find((b) => String(b.id) === targetId);
      if (!target) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }
      if (target.isArchived) {
        return prevStore; // Already archived
      }

      const remainingActive = activeList.filter((b) => String(b.id) !== targetId);
      const wasSelected = target.isSelected || String(prevStore.activeBusinessId) === targetId;
      const nextActive = wasSelected ? remainingActive[0] : null;

      const nowIso = new Date().toISOString();
      const updatedBusinesses = list.map((b) => {
        if (String(b.id) === targetId) {
          return {
            ...b,
            isArchived: true,
            is_active: 0,
            isActive: false,
            isSelected: false,
            is_current: 0,
            isCurrent: false,
            archivedAt: nowIso,
            update_date: nowIso,
            updateDate: nowIso,
          };
        }
        if (nextActive && String(b.id) === String(nextActive.id)) {
          return {
            ...b,
            isSelected: true,
            is_current: 1,
            isCurrent: true,
            update_date: nowIso,
            updateDate: nowIso,
          };
        }
        return b;
      });

      return {
        ...prevStore,
        businesses: updatedBusinesses,
        ...(nextActive
          ? {
              activeBusinessId: String(nextActive.id),
              businessName: nextActive.name,
              ownerName: nextActive.owner || prevStore.ownerName,
              ownerPhone: nextActive.phone || prevStore.ownerPhone,
              businessAddress: nextActive.address || prevStore.businessAddress,
            }
          : {}),
      };
    });
  }

  /**
   * Restores an archived business safely.
   */

  /**
   * Updates business profile attributes with Room DB parity.
   * Reference Room DB: UPDATE business SET business_name = ?, business_type = ?, synced=0, update_date = ? WHERE id = ?
   */
  async updateBusiness(bizId, updateData = {}) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const targetIndex = list.findIndex((b) => String(b.id) === targetId);
      if (targetIndex === -1) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }
      const existing = list[targetIndex];
      const nowIso = new Date().toISOString();
      const newName = String(updateData.name || updateData.business_name || updateData.businessName || existing.name || '').trim();
      if (!newName) {
        throw new Error('ব্যবসার নাম খালি রাখা যাবে না');
      }

      const updatedBiz = {
        ...existing,
        ...updateData,
        id: targetId,
        business_id: isNaN(Number(targetId)) ? targetId : Number(targetId),
        name: newName,
        business_name: newName,
        businessName: newName,
        owner: updateData.owner !== undefined ? String(updateData.owner).trim() : existing.owner,
        phone: updateData.phone !== undefined ? String(updateData.phone).trim() : existing.phone,
        address: updateData.address !== undefined ? String(updateData.address).trim() : (updateData.business_address || existing.address),
        business_address: updateData.address !== undefined ? String(updateData.address).trim() : (updateData.business_address || existing.address),
        businessAddress: updateData.address !== undefined ? String(updateData.address).trim() : (updateData.business_address || existing.address),
        business_type: String(updateData.business_type || updateData.businessType || updateData.type || existing.business_type || 'RETAIL'),
        businessType: String(updateData.business_type || updateData.businessType || updateData.type || existing.business_type || 'RETAIL'),
        synced: 0,
        update_date: nowIso,
        updateDate: nowIso,
        updatedAt: nowIso,
      };

      const updatedList = [...list];
      updatedList[targetIndex] = updatedBiz;

      const isCurrentActive = String(prevStore.activeBusinessId) === targetId;

      return {
        ...prevStore,
        businesses: updatedList,
        ...(isCurrentActive
          ? {
              businessName: updatedBiz.name,
              ownerName: updatedBiz.owner,
              ownerPhone: updatedBiz.phone,
              businessAddress: updatedBiz.address,
            }
          : {}),
      };
    });
  }

  async restoreBusiness(bizId, options = {}) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const target = list.find((b) => String(b.id) === targetId);
      if (!target) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }
      if (!target.isArchived) {
        return prevStore; // Already active
      }

      const makeActive = Boolean(options.makeActive || options.selectImmediately);
      const nowIso = new Date().toISOString();
      const updatedBusinesses = list.map((b) => {
        if (String(b.id) === targetId) {
          return {
            ...b,
            isArchived: false,
            is_active: 1,
            isActive: true,
            isSelected: makeActive ? true : Boolean(b.isSelected),
            is_current: makeActive ? 1 : (b.isSelected ? 1 : 0),
            isCurrent: makeActive ? true : Boolean(b.isSelected),
            restoredAt: nowIso,
            update_date: nowIso,
            updateDate: nowIso,
          };
        }
        if (makeActive) {
          return {
            ...b,
            isSelected: false,
            is_current: 0,
            isCurrent: false,
          };
        }
        return b;
      });

      return {
        ...prevStore,
        businesses: updatedBusinesses,
        ...(makeActive
          ? {
              activeBusinessId: target.id,
              businessName: target.name,
              ownerName: target.owner || prevStore.ownerName,
              ownerPhone: target.phone || prevStore.ownerPhone,
              businessAddress: target.address || prevStore.businessAddress,
            }
          : {}),
      };
    });
  }

  /**
   * Permanently deletes a business ONLY if it has zero linked financial records.
   * Guard: Refuses permanent deletion when accounts, cash entries, or stock exist.
   * Guard: Never deletes the sole remaining active business.
   */
  async deleteBusinessPermanently(bizId, options = {}) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const target = list.find((b) => String(b.id) === targetId);
      if (!target) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }

      // Check linked financial records
      const accounts = Array.isArray(prevStore.accounts) ? prevStore.accounts : [];
      const cash = Array.isArray(prevStore.cashEntries) ? prevStore.cashEntries : [];
      const stock = Array.isArray(prevStore.stock) ? prevStore.stock : (Array.isArray(prevStore.inventory) ? prevStore.inventory : []);

      const hasAccounts = accounts.some((a) => {
        const bId = a.businessId !== undefined && a.businessId !== null ? String(a.businessId) : (a.business_id !== undefined && a.business_id !== null ? String(a.business_id) : '1');
        return bId === targetId;
      });
      const hasCash = cash.some((c) => {
        const bId = c.businessId !== undefined && c.businessId !== null ? String(c.businessId) : (c.business_id !== undefined && c.business_id !== null ? String(c.business_id) : '1');
        return bId === targetId;
      });
      const hasStock = stock.some((s) => {
        const bId = s.businessId !== undefined && s.businessId !== null ? String(s.businessId) : (s.business_id !== undefined && s.business_id !== null ? String(s.business_id) : '1');
        return bId === targetId;
      });

      if ((hasAccounts || hasCash || hasStock) && !options.force) {
        throw new Error(
          'এই ব্যবসার অধীনে সংরক্ষিত আর্থিক হিসাব বা পণ্য তালিকা রয়েছে। ডেটা সুরক্ষার জন্য এটি স্থায়ীভাবে মুছে ফেলা সম্ভব নয়। আপনি এটি সুরক্ষিতভাবে আর্কাইভ করতে পারেন।'
        );
      }

      const activeList = list.filter((b) => !b.isArchived);
      if (activeList.length <= 1 && !target.isArchived) {
        throw new Error('কমপক্ষে একটি ব্যবসা সক্রিয় থাকতে হবে। একমাত্র সক্রিয় ব্যবসাটি মুছে ফেলা যাবে না।');
      }

      const updatedBusinesses = list.filter((b) => String(b.id) !== targetId);
      const wasSelected = target.isSelected || String(prevStore.activeBusinessId) === targetId;
      const nextActive = wasSelected ? updatedBusinesses.find((b) => !b.isArchived) : null;

      return {
        ...prevStore,
        businesses: updatedBusinesses,
        ...(nextActive
          ? {
              activeBusinessId: String(nextActive.id),
              businessName: nextActive.name,
              ownerName: nextActive.owner || prevStore.ownerName,
              ownerPhone: nextActive.phone || prevStore.ownerPhone,
              businessAddress: nextActive.address || prevStore.businessAddress,
            }
          : {}),
      };
    });
  }

  /**
   * Cascade deletes a business and atomically purges all records matching businessId
   * across accounts, journals, cashEntries, inventory, stock, notes, walletTxns, and tagadaLogs.
   * Refuses deletion if it is the sole remaining active business.
   */
  async deleteBusinessCascade(bizId) {
    if (!bizId) return { success: false, error: new Error('Business ID is required') };
    const targetId = String(bizId);

    return this.mutateStore((prevStore) => {
      const list = Array.isArray(prevStore.businesses) ? prevStore.businesses : DEFAULT_BUSINESSES;
      const target = list.find((b) => String(b.id) === targetId);
      if (!target) {
        throw new Error('ব্যবসা প্রতিষ্ঠানটি পাওয়া যায়নি: ' + targetId);
      }

      const activeList = list.filter((b) => !b.isArchived);
      if (activeList.length <= 1 && !target.isArchived) {
        throw new Error('কমপক্ষে একটি ব্যবসা সক্রিয় থাকতে হবে। একমাত্র সক্রিয় ব্যবসাটি মুছে ফেলা যাবে না।');
      }

      // Purge all records matching targetId across collections
      const getBizId = (item) => String(item?.businessId !== undefined && item?.businessId !== null ? item.businessId : (item?.business_id !== undefined && item?.business_id !== null ? item.business_id : '1'));
      const accounts = (prevStore.accounts || []).filter((a) => getBizId(a) !== targetId);
      const journals = (prevStore.journals || []).filter((j) => getBizId(j) !== targetId);
      const cashEntries = (prevStore.cashEntries || []).filter((c) => getBizId(c) !== targetId);
      const inventory = (prevStore.inventory || []).filter((i) => getBizId(i) !== targetId);
      const stock = (prevStore.stock || []).filter((s) => getBizId(s) !== targetId);
      const notes = (prevStore.notes || []).filter((n) => getBizId(n) !== targetId);
      const walletTxns = (prevStore.walletTxns || []).filter((w) => getBizId(w) !== targetId);
      const tagadaLogs = (prevStore.tagadaLogs || []).filter((t) => getBizId(t) !== targetId);
      const tagada_log = (prevStore.tagada_log || []).filter((t) => getBizId(t) !== targetId);
      const tagada_quota = { ...(prevStore.tagada_quota || {}) };
      delete tagada_quota[targetId];
      const tagadaQuota = { ...(prevStore.tagadaQuota || {}) };
      delete tagadaQuota[targetId];
      const audioNotesToPurge = (prevStore.audioNotes || []).filter((a) => getBizId(a) === targetId);
      const audioNotes = (prevStore.audioNotes || []).filter((a) => getBizId(a) !== targetId);
      const receiptsToPurge = (prevStore.receiptImages || []).filter((r) => getBizId(r) === targetId);
      const receiptImages = (prevStore.receiptImages || []).filter((r) => getBizId(r) !== targetId);
      const voucherPrintLogs = (prevStore.voucherPrintLogs || []).filter((v) => getBizId(v) !== targetId);
        const banglaQrTransactions = (prevStore.banglaQrTransactions || []).filter((b) => getBizId(b) !== targetId);
        const tallyPayAddMoneyTxns = (prevStore.tallyPayAddMoneyTxns || []).filter((t) => getBizId(t) !== targetId);
        const soundboxLogs = (prevStore.soundboxLogs || []).filter((s) => getBizId(s) !== targetId);
        const soundboxSettings = { ...(prevStore.soundboxSettings || {}) };
        delete soundboxSettings[targetId];
        const soundboxDeviceSettings = { ...(prevStore.soundboxDeviceSettings || {}) };
        delete soundboxDeviceSettings[targetId];
        const billPaymentTransactions = (prevStore.billPaymentTransactions || []).filter((b) => getBizId(b) !== targetId);
        const savedBillers = (prevStore.savedBillers || []).filter((s) => getBizId(s) !== targetId);
        const tallyPayTransactions = (prevStore.tallyPayTransactions || []).filter((t) => getBizId(t) !== targetId);
        const tallyPayBeneficiaries = (prevStore.tallyPayBeneficiaries || []).filter((b) => getBizId(b) !== targetId);
        const qrSettlementActions = (prevStore.qrSettlementActions || []).filter((q) => getBizId(q) !== targetId);
        const merchantDisbursements = (prevStore.merchantDisbursements || []).filter((d) => getBizId(d) !== targetId);
        const reconciliations = (prevStore.reconciliations || []).filter((r) => getBizId(r) !== targetId);
        const walletSecurityCredentials = (prevStore.walletSecurityCredentials || []).filter((c) => getBizId(c) !== targetId);
        const deviceBindings = (prevStore.deviceBindings || []).filter((b) => getBizId(b) !== targetId);
        const linkedBankAccounts = (prevStore.linkedBankAccounts || []).filter((b) => getBizId(b) !== targetId);
        const linkedMfsAccounts = (prevStore.linkedMfsAccounts || []).filter((m) => getBizId(m) !== targetId);
        const savedCards = (prevStore.savedCards || []).filter((c) => getBizId(c) !== targetId);
        const transferHistory = (prevStore.transferHistory || []).filter((t) => getBizId(t) !== targetId);
        const rechargeHistory = (prevStore.rechargeHistory || []).filter((r) => getBizId(r) !== targetId);
        const settlementHistory = (prevStore.settlementHistory || []).filter((s) => getBizId(s) !== targetId);
        const transactionSettlementActions = (prevStore.transactionSettlementActions || []).filter((t) => getBizId(t) !== targetId);
        const merchantKyc = (prevStore.merchantKyc || []).filter((k) => getBizId(k) !== targetId);
        const merchantQrOrders = (prevStore.merchantQrOrders || []).filter((o) => getBizId(o) !== targetId);
        const merchantLoans = (prevStore.merchantLoans || []).filter((l) => getBizId(l) !== targetId);
        const merchantLoanEmis = (prevStore.merchantLoanEmis || []).filter((e) => getBizId(e) !== targetId);
        const merchantRewards = (prevStore.merchantRewards || []).filter((r) => getBizId(r) !== targetId);
        const merchantRewardLedger = (prevStore.merchantRewardLedger || []).filter((e) => getBizId(e) !== targetId);
        const merchantAnalyticsSnapshots = (prevStore.merchantAnalyticsSnapshots || []).filter((s) => getBizId(s) !== targetId);
        const merchantSalesForecasts = (prevStore.merchantSalesForecasts || []).filter((f) => getBizId(f) !== targetId);
        const merchantDisputeTickets = (prevStore.merchantDisputeTickets || []).filter((d) => getBizId(d) !== targetId);
        const soundboxConfig = { ...(prevStore.soundboxConfig || {}) };
        delete soundboxConfig[targetId];
        const autoDisbursementConfig = { ...(prevStore.autoDisbursementConfig || {}) };
        delete autoDisbursementConfig[targetId];

      // Clean up physical audio files of deleted business
      if (audioNoteService && typeof audioNoteService.deleteAudioFile === 'function') {
        for (const note of audioNotesToPurge) {
          if (note && note.fileUri) {
            try {
              audioNoteService.deleteAudioFile(note.fileUri);
            } catch (_) {}
          }
        }
      }

      // Clean up physical receipt files of deleted business
      if (receiptImageService && typeof receiptImageService.deleteReceiptFile === 'function') {
        for (const r of receiptsToPurge) {
          try {
            if (r.fileUri) receiptImageService.deleteReceiptFile(r.fileUri);
            if (r.thumbnailUri) receiptImageService.deleteReceiptFile(r.thumbnailUri);
          } catch (_) {}
        }
      }

      const remainingBusinesses = list.filter((b) => String(b.id) !== targetId);

      let nextActiveId = prevStore.activeBusinessId;
      if (String(prevStore.activeBusinessId) === targetId) {
        const firstActive = remainingBusinesses.find((b) => !b.isArchived) || remainingBusinesses[0];
        nextActiveId = firstActive ? String(firstActive.id) : '1';
      }

      const updatedBusinesses = remainingBusinesses.map((b) => {
        const isCur = String(b.id) === String(nextActiveId);
        return {
          ...b,
          isSelected: isCur,
          is_current: isCur ? 1 : 0,
          isCurrent: isCur,
          isActive: !b.isArchived,
          is_active: b.isArchived ? 0 : 1,
        };
      });

      const activeBiz = updatedBusinesses.find((b) => String(b.id) === String(nextActiveId));

      const cashReconciliation = (prevStore.cashReconciliation && getBizId(prevStore.cashReconciliation) === targetId)
        ? null
        : prevStore.cashReconciliation;

      const nextActiveQuota = (tagada_quota && tagada_quota[nextActiveId]) || { freeSmsCount: 5, purchasedSmsCount: 50 };

      return {
        ...prevStore,
        businesses: updatedBusinesses,
        activeBusinessId: nextActiveId,
        businessName: activeBiz ? activeBiz.name : prevStore.businessName,
        accounts,
        journals,
        cashEntries,
        inventory,
        stock,
        notes,
        walletTxns,
        tagadaLogs,
        tagada_log,
        tagada_quota,
        tagadaQuota,
        remainingSmsCount: nextActiveQuota.freeSmsCount !== undefined ? nextActiveQuota.freeSmsCount : 5,
        tallyMessageBalance: nextActiveQuota.purchasedSmsCount !== undefined ? nextActiveQuota.purchasedSmsCount : 50,
        audioNotes,
        receiptImages,
        voucherPrintLogs,
        banglaQrTransactions,
        tallyPayAddMoneyTxns,
        soundboxLogs,
        soundboxSettings,
        soundboxDeviceSettings,
        billPaymentTransactions,
        savedBillers,
        tallyPayTransactions,
        tallyPayBeneficiaries,
        qrSettlementActions,
        merchantDisbursements,
        reconciliations,
        walletSecurityCredentials,
        deviceBindings,
        linkedBankAccounts,
        linkedMfsAccounts,
        savedCards,
        transferHistory,
        rechargeHistory,
        settlementHistory,
        transactionSettlementActions,
        merchantKyc,
        merchantQrOrders,
        merchantLoans,
        merchantLoanEmis,
        merchantRewards,
        merchantRewardLedger,
        merchantAnalyticsSnapshots,
        merchantSalesForecasts,
        merchantDisputeTickets,
        soundboxConfig,
        autoDisbursementConfig,
        cashReconciliation,
      };
    });
  }

  /**
   * Commits restored backup payload safely into storage.
   * Performs validation, recalculates ledger balances, and writes atomically.
   */
  /**
   * Calculates aggregate financial metrics (receivables, payables, customer/supplier counts)
   * strictly isolated for a specific business or across the entire store.
   *
   * @param {string|null} [businessId=null]
   * @returns {{ totalReceivable: number, totalPayable: number, netBalance: number, customerCount: number, supplierCount: number }}
   */
  calculateMetrics(businessId = null) {
    const { recalculateAllAccountBalances, calculateAggregateMetrics } = require('./ledgerEngine');
    const store = this.currentStore || {};
    const accounts = Array.isArray(store.accounts) ? store.accounts : [];
    const journals = Array.isArray(store.journals) ? store.journals : [];
    const recalcRes = recalculateAllAccountBalances(accounts, journals, businessId);
    const updatedAccounts = recalcRes && recalcRes.updatedAccounts ? recalcRes.updatedAccounts : accounts;
    return calculateAggregateMetrics(updatedAccounts, journals, businessId);
  }

  async commitRestorePayload(backupPayload, options = {}) {
    if (isStoragePayloadCompressed(backupPayload)) {
      backupPayload = decompressStoragePayload(backupPayload);
    }
    if (!backupPayload || typeof backupPayload !== 'object') {
      throw new Error('Invalid restore payload: payload must be an object');
    }

    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }

    const expectedChecksum = (backupPayload && backupPayload.checksum) ||
                             (backupPayload && backupPayload.manifest && (backupPayload.manifest.checksum || backupPayload.manifest.sha256)) ||
                             (backupPayload && backupPayload.sha256) ||
                             null;
    if (expectedChecksum) {
      const dataToVerify = backupPayload.data || backupPayload;
      const isLegacyChk = String(expectedChecksum).startsWith('chk_');
      const computed = isLegacyChk ? this.computeLegacyChecksum(dataToVerify) : this.computeChecksum(dataToVerify);
      if (computed !== expectedChecksum) {
        throw new Error('Backup integrity checksum mismatch: data may be corrupted or tampered');
      }
    }

    let manifest = backupPayload.manifest || null;
    let data = backupPayload.data || null;

    // Handle legacy unwrapped format where data is at root
    if (!data && Array.isArray(backupPayload.accounts)) {
      data = backupPayload;
      manifest = manifest || {
        backupVersion: 0,
        schemaVersion: backupPayload.version || 5,
        legacy: true,
      };
    }

    if (!data || !Array.isArray(data.accounts)) {
      throw new Error('Invalid restore payload: accounts must be an array');
    }

    const requestedDomains = (options && Array.isArray(options.domains) && options.domains.length > 0)
      ? options.domains
      : (options && typeof options.domain === 'string' ? [options.domain] : ['all']);
    const shouldRestoreAll = requestedDomains.includes('all');
    const shouldRestoreBusiness = shouldRestoreAll || requestedDomains.includes('business');
    const shouldRestoreMM = shouldRestoreAll || requestedDomains.includes('moneyManager') || requestedDomains.includes('money_manager') || requestedDomains.includes('personal');
    const shouldRestorePrefs = shouldRestoreAll || requestedDomains.includes('preferences');

    // Create safety snapshot before altering live store if not already created
    let snapshotId = options && options.snapshotId;
    if (!snapshotId) {
      const snapRes = await this.createLocalSafetySnapshot(null, options.extraState);
      if (snapRes && snapRes.success) {
        snapshotId = snapRes.snapshotId;
      }
    }

    let restoredMM = null;
    if (shouldRestoreMM) {
      const mmPayload = (data.moneyManager !== undefined && data.moneyManager !== null)
        ? data.moneyManager
        : data.money_manager;
      const hasValidAccounts = mmPayload &&
        typeof mmPayload === 'object' &&
        Array.isArray(mmPayload.accounts) &&
        (mmPayload.accounts.length > 0 || (manifest && manifest.hasMoneyManager === true) || (mmPayload.version >= 3));

      if (hasValidAccounts) {
        const defaultMMState = moneyManagerService ? moneyManagerService.getDefaultState() : {};
        const sanitizedMM = moneyManagerService
          ? moneyManagerService.sanitizeState(mmPayload, defaultMMState)
          : mmPayload;
        if (this.adapter && typeof this.adapter.setItem === 'function') {
          await this.adapter.setItem(MM_STORAGE_KEY, JSON.stringify(sanitizedMM));
        }
        restoredMM = sanitizedMM;
      }
      // If data.moneyManager is not present, empty {}, or lacks valid accounts, DO NOT touch or overwrite existing MM state (legacy safety)
    }

    let restoredPrefs = null;
    if (shouldRestorePrefs) {
      if (data.preferences && typeof data.preferences === 'object') {
        const sanitizedPrefs = preferencesService
          ? preferencesService.sanitizePreferences(data.preferences)
          : data.preferences;
        if (this.adapter && typeof this.adapter.setItem === 'function') {
          await this.adapter.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(sanitizedPrefs));
        }
        restoredPrefs = sanitizedPrefs;
      }
    }

    const mutateResult = await this.mutateStore((prevStore) => {
      if (!shouldRestoreBusiness) {
        return prevStore;
      }

      // If selective business restore is requested
      const selectedBizId = options && (options.selectedBusinessId || options.targetBusinessId || options.businessId) ? String(options.selectedBusinessId || options.targetBusinessId || options.businessId) : null;
      if (selectedBizId) {
        const importedAccounts = (data.accounts || []).filter(a => String(a.businessId || '1') === selectedBizId);
        const importedJournals = (data.journals || []).filter(j => String(j.businessId || '1') === selectedBizId);
        const importedCash = (data.cashEntries || []).filter(c => String(c.businessId || '1') === selectedBizId);
        const importedStock = ((data.stock || data.inventory) || []).filter(s => String(s.businessId || '1') === selectedBizId);
        const importedNotes = (data.notes || []).filter(n => String(n.businessId || '1') === selectedBizId);
        const importedTagadaLog = ((data.tagada_log || data.tagadaLogs) || []).filter(t => String(t.businessId || t.business_id || '1') === selectedBizId);
        const keptTagadaLog = ((prevStore.tagada_log || prevStore.tagadaLogs) || []).filter(t => String(t.businessId || t.business_id || '1') !== selectedBizId);
        const keptTagadaQuota = { ...(prevStore.tagada_quota || prevStore.tagadaQuota || {}) };
        if (data.tagada_quota && data.tagada_quota[selectedBizId]) {
          keptTagadaQuota[selectedBizId] = data.tagada_quota[selectedBizId];
        }
        const importedAudio = (data.audioNotes || []).filter(a => String(a.businessId || '1') === selectedBizId);
        const importedReceipts = (data.receiptImages || []).filter(r => String(r.businessId || '1') === selectedBizId);
        const importedVouchers = (data.voucherPrintLogs || []).filter(v => String(v.businessId || '1') === selectedBizId);
          const importedBanglaQr = (data.banglaQrTransactions || []).filter(b => String(b.businessId || '1') === selectedBizId);
          const importedBillPayments = (data.billPaymentTransactions || []).filter(b => String(b.businessId || '1') === selectedBizId);
          const importedSavedBillers = (data.savedBillers || []).filter(s => String(s.businessId || '1') === selectedBizId);
          const importedTallyPay = (data.tallyPayTransactions || []).filter(t => String(t.businessId || '1') === selectedBizId);
          const importedBeneficiaries = (data.tallyPayBeneficiaries || []).filter(b => String(b.businessId || '1') === selectedBizId);
          const importedQrSettlements = (data.qrSettlementActions || []).filter(q => String(q.businessId || '1') === selectedBizId);
          const importedDisbursements = (data.merchantDisbursements || []).filter(d => String(d.businessId || '1') === selectedBizId);
          const importedReconciliations = (data.reconciliations || []).filter(r => String(r.businessId || '1') === selectedBizId);
          const importedWalletCredentials = (data.walletSecurityCredentials || []).filter(c => String(c.businessId || '1') === selectedBizId);
          const importedDeviceBindings = (data.deviceBindings || []).filter(b => String(b.businessId || '1') === selectedBizId);
          const importedLinkedBankAccounts = (data.linkedBankAccounts || []).filter(b => String(b.businessId || '1') === selectedBizId);
          const importedLinkedMfsAccounts = (data.linkedMfsAccounts || []).filter(m => String(m.businessId || '1') === selectedBizId);

        const keptAccounts = (prevStore.accounts || []).filter(a => String(a.businessId || '1') !== selectedBizId);
        const keptJournals = (prevStore.journals || []).filter(j => String(j.businessId || '1') !== selectedBizId);
        const keptCash = (prevStore.cashEntries || []).filter(c => String(c.businessId || '1') !== selectedBizId);
        const keptStock = ((prevStore.stock || prevStore.inventory) || []).filter(s => String(s.businessId || '1') !== selectedBizId);
        const keptNotes = (prevStore.notes || []).filter(n => String(n.businessId || '1') !== selectedBizId);
        const keptAudio = (prevStore.audioNotes || []).filter(a => String(a.businessId || '1') !== selectedBizId);
        const keptReceipts = (prevStore.receiptImages || []).filter(r => String(r.businessId || '1') !== selectedBizId);
        const keptVouchers = (prevStore.voucherPrintLogs || []).filter(v => String(v.businessId || '1') !== selectedBizId);
          const keptBanglaQr = (prevStore.banglaQrTransactions || []).filter(b => String(b.businessId || '1') !== selectedBizId);
          const keptBillPayments = (prevStore.billPaymentTransactions || []).filter(b => String(b.businessId || '1') !== selectedBizId);
          const keptSavedBillers = (prevStore.savedBillers || []).filter(s => String(s.businessId || '1') !== selectedBizId);
          const keptTallyPay = (prevStore.tallyPayTransactions || []).filter(t => String(t.businessId || '1') !== selectedBizId);
        const keptBeneficiaries = (prevStore.tallyPayBeneficiaries || []).filter(b => String(b.businessId || '1') !== selectedBizId);
        const keptMerchantKyc = (prevStore.merchantKyc || []).filter(k => String(k.businessId || k.business_id || '1') !== selectedBizId);
        const importedMerchantKyc = (data.merchantKyc || []).filter(k => String(k.businessId || k.business_id || '1') === selectedBizId);
        const keptMerchantQrOrders = (prevStore.merchantQrOrders || []).filter(o => String(o.businessId || o.business_id || '1') !== selectedBizId);
        const importedMerchantQrOrders = (data.merchantQrOrders || []).filter(o => String(o.businessId || o.business_id || '1') === selectedBizId);
        const keptMerchantLoans = (prevStore.merchantLoans || []).filter(l => String(l.businessId || l.business_id || '1') !== selectedBizId);
        const importedMerchantLoans = (data.merchantLoans || []).filter(l => String(l.businessId || l.business_id || '1') === selectedBizId);
        const keptMerchantLoanEmis = (prevStore.merchantLoanEmis || []).filter(e => String(e.businessId || e.business_id || '1') !== selectedBizId);
        const importedMerchantLoanEmis = (data.merchantLoanEmis || []).filter(e => String(e.businessId || e.business_id || '1') === selectedBizId);
        const keptMerchantRewards = (prevStore.merchantRewards || []).filter(r => String(r.businessId || r.business_id || '1') !== selectedBizId);
        const importedMerchantRewards = (data.merchantRewards || []).filter(r => String(r.businessId || r.business_id || '1') === selectedBizId);
        const keptMerchantRewardLedger = (prevStore.merchantRewardLedger || []).filter(e => String(e.businessId || e.business_id || '1') !== selectedBizId);
        const importedMerchantRewardLedger = (data.merchantRewardLedger || []).filter(e => String(e.businessId || e.business_id || '1') === selectedBizId);
        const keptMerchantAnalyticsSnapshots = (prevStore.merchantAnalyticsSnapshots || []).filter(s => String(s.businessId || s.business_id || '1') !== selectedBizId);
        const importedMerchantAnalyticsSnapshots = (data.merchantAnalyticsSnapshots || []).filter(s => String(s.businessId || s.business_id || '1') === selectedBizId);
        const keptMerchantSalesForecasts = (prevStore.merchantSalesForecasts || []).filter(f => String(f.businessId || f.business_id || '1') !== selectedBizId);
        const importedMerchantSalesForecasts = (data.merchantSalesForecasts || []).filter(f => String(f.businessId || f.business_id || '1') === selectedBizId);
        const keptMerchantDisputeTickets = (prevStore.merchantDisputeTickets || []).filter(d => String(d.businessId || d.business_id || '1') !== selectedBizId);
        const importedMerchantDisputeTickets = (data.merchantDisputeTickets || []).filter(d => String(d.businessId || d.business_id || '1') === selectedBizId);
        const keptQrSettlements = (prevStore.qrSettlementActions || []).filter(q => String(q.businessId || '1') !== selectedBizId);
        const keptDisbursements = (prevStore.merchantDisbursements || []).filter(d => String(d.businessId || '1') !== selectedBizId);
        const keptReconciliations = (prevStore.reconciliations || []).filter(r => String(r.businessId || '1') !== selectedBizId);
        const keptWalletCredentials = (prevStore.walletSecurityCredentials || []).filter(c => String(c.businessId || '1') !== selectedBizId);
        const keptDeviceBindings = (prevStore.deviceBindings || []).filter(b => String(b.businessId || '1') !== selectedBizId);
          const keptLinkedBankAccounts = (prevStore.linkedBankAccounts || []).filter(b => String(b.businessId || '1') !== selectedBizId);
          const keptLinkedMfsAccounts = (prevStore.linkedMfsAccounts || []).filter(m => String(m.businessId || '1') !== selectedBizId);
        const keptSavedCards = (prevStore.savedCards || []).filter(c => String(c.businessId || '1') !== selectedBizId);
        const importedSavedCards = (data.savedCards || []).filter(c => String(c.businessId || '1') === selectedBizId);

        const mergedAccounts = [...keptAccounts, ...importedAccounts];
        const mergedJournals = [...keptJournals, ...importedJournals];

        const finalMergedAccounts = ledgerEngine && typeof ledgerEngine.recalculateAccountRunningBalances === 'function'
          ? ledgerEngine.recalculateAccountRunningBalances(mergedAccounts, mergedJournals, selectedBizId)
          : mergedAccounts;

        return {
          ...prevStore,
          accounts: finalMergedAccounts,
          journals: mergedJournals,
          cashEntries: [...keptCash, ...importedCash],
          stock: [...keptStock, ...importedStock],
          inventory: [...keptStock, ...importedStock],
          notes: [...keptNotes, ...importedNotes],
          tagadaLogs: [...keptTagadaLog, ...importedTagadaLog],
          tagada_log: [...keptTagadaLog, ...importedTagadaLog],
          tagada_quota: keptTagadaQuota,
          tagadaQuota: keptTagadaQuota,
          remainingSmsCount: (selectedBizId === String(prevStore.activeBusinessId || "1") && keptTagadaQuota[selectedBizId]?.freeSmsCount !== undefined)
            ? keptTagadaQuota[selectedBizId].freeSmsCount
            : prevStore.remainingSmsCount,
          tallyMessageBalance: (selectedBizId === String(prevStore.activeBusinessId || "1") && keptTagadaQuota[selectedBizId]?.purchasedSmsCount !== undefined)
            ? keptTagadaQuota[selectedBizId].purchasedSmsCount
            : prevStore.tallyMessageBalance,
          audioNotes: [...keptAudio, ...importedAudio],
          receiptImages: [...keptReceipts, ...importedReceipts],
          voucherPrintLogs: [...keptVouchers, ...importedVouchers],
            banglaQrTransactions: [...keptBanglaQr, ...importedBanglaQr],
            billPaymentTransactions: [...keptBillPayments, ...importedBillPayments],
            savedBillers: [...keptSavedBillers, ...importedSavedBillers],
          tallyPayTransactions: [...keptTallyPay, ...importedTallyPay],
          tallyPayBeneficiaries: [...keptBeneficiaries, ...importedBeneficiaries],
          merchantKyc: [...keptMerchantKyc, ...importedMerchantKyc],
          merchantQrOrders: [...keptMerchantQrOrders, ...importedMerchantQrOrders],
          merchantLoans: [...keptMerchantLoans, ...importedMerchantLoans],
          merchantLoanEmis: [...keptMerchantLoanEmis, ...importedMerchantLoanEmis],
          merchantRewards: [...keptMerchantRewards, ...importedMerchantRewards],
          merchantRewardLedger: [...keptMerchantRewardLedger, ...importedMerchantRewardLedger],
          merchantAnalyticsSnapshots: [...keptMerchantAnalyticsSnapshots, ...importedMerchantAnalyticsSnapshots],
          merchantSalesForecasts: [...keptMerchantSalesForecasts, ...importedMerchantSalesForecasts],
          merchantDisputeTickets: [...keptMerchantDisputeTickets, ...importedMerchantDisputeTickets],
          transactionSettlementActions: (data.transactionSettlementActions ? [...(prevStore.transactionSettlementActions || []).filter(t => String(t.businessId || t.business_id || "1") !== selectedBizId), ...(data.transactionSettlementActions || []).filter(t => String(t.businessId || t.business_id || "1") === selectedBizId)] : (prevStore.transactionSettlementActions || [])),
          qrSettlementActions: [...keptQrSettlements, ...importedQrSettlements],
          merchantDisbursements: [...keptDisbursements, ...importedDisbursements],
          reconciliations: [...keptReconciliations, ...importedReconciliations],
          walletSecurityCredentials: [...keptWalletCredentials, ...importedWalletCredentials],
          deviceBindings: [...keptDeviceBindings, ...importedDeviceBindings],
            linkedBankAccounts: [...keptLinkedBankAccounts, ...importedLinkedBankAccounts],
            linkedMfsAccounts: [...keptLinkedMfsAccounts, ...importedLinkedMfsAccounts],
          savedCards: [...keptSavedCards, ...importedSavedCards],
          autoDisbursementConfig: { ...(prevStore.autoDisbursementConfig || {}), ...(data.autoDisbursementConfig || {}) },
          version: 6,
          lastRestoredAt: new Date().toISOString(),
          restoredFromOwner: manifest && manifest.backupOwner ? manifest.backupOwner.sub : null,
        };
      }

      const restoredInventory = Array.isArray(data.inventory)
        ? data.inventory
        : (Array.isArray(data.stock) ? data.stock : []);

      const rawQuotaMap = (data.tagada_quota && typeof data.tagada_quota === 'object')
        ? data.tagada_quota
        : ((data.tagadaQuota && typeof data.tagadaQuota === 'object') ? data.tagadaQuota : null);
      const activeRestoredBizId = String(data.activeBusinessId || '1');
      const restoredQuotaMap = rawQuotaMap ? { ...rawQuotaMap } : { ...createDefaultState().tagada_quota };

      if (!rawQuotaMap && (data.remainingSmsCount !== undefined || data.tallyMessageBalance !== undefined)) {
        restoredQuotaMap[activeRestoredBizId] = {
          ...(restoredQuotaMap[activeRestoredBizId] || {}),
          freeSmsCount: data.remainingSmsCount !== undefined ? data.remainingSmsCount : (restoredQuotaMap[activeRestoredBizId]?.freeSmsCount ?? 5),
          purchasedSmsCount: data.tallyMessageBalance !== undefined ? data.tallyMessageBalance : (restoredQuotaMap[activeRestoredBizId]?.purchasedSmsCount ?? 50),
          remainingSmsCount: data.remainingSmsCount !== undefined ? data.remainingSmsCount : (restoredQuotaMap[activeRestoredBizId]?.freeSmsCount ?? 5),
          tallyMessageBalance: data.tallyMessageBalance !== undefined ? data.tallyMessageBalance : (restoredQuotaMap[activeRestoredBizId]?.purchasedSmsCount ?? 50),
          lastRefreshDate: new Date().toISOString(),
          businessId: activeRestoredBizId,
        };
      }
      const activeRestoredQuota = restoredQuotaMap[activeRestoredBizId] || {};

      const newStore = {
        ...createDefaultState(),
        ...data,
        tagada_log: Array.isArray(data.tagada_log) ? data.tagada_log : (Array.isArray(data.tagadaLogs) ? data.tagadaLogs : []),
        tagadaLogs: Array.isArray(data.tagadaLogs) ? data.tagadaLogs : (Array.isArray(data.tagada_log) ? data.tagada_log : []),
        tagada_quota: restoredQuotaMap,
        tagadaQuota: restoredQuotaMap,
        remainingSmsCount: activeRestoredQuota.freeSmsCount !== undefined ? activeRestoredQuota.freeSmsCount : (data.remainingSmsCount ?? 5),
        tallyMessageBalance: activeRestoredQuota.purchasedSmsCount !== undefined ? activeRestoredQuota.purchasedSmsCount : (data.tallyMessageBalance ?? 50),
        billPaymentTransactions: Array.isArray(data.billPaymentTransactions) ? data.billPaymentTransactions : [],
        savedBillers: Array.isArray(data.savedBillers) ? data.savedBillers : [],
        tallyPayTransactions: Array.isArray(data.tallyPayTransactions) ? data.tallyPayTransactions : [],
        tallyPayBeneficiaries: Array.isArray(data.tallyPayBeneficiaries) ? data.tallyPayBeneficiaries : [],
        merchantKyc: Array.isArray(data.merchantKyc) ? data.merchantKyc : [],
        merchantQrOrders: Array.isArray(data.merchantQrOrders) ? data.merchantQrOrders : [],
        merchantLoans: Array.isArray(data.merchantLoans) ? data.merchantLoans : [],
        merchantLoanEmis: Array.isArray(data.merchantLoanEmis) ? data.merchantLoanEmis : [],
        merchantRewards: Array.isArray(data.merchantRewards) ? data.merchantRewards : [],
        merchantRewardLedger: Array.isArray(data.merchantRewardLedger) ? data.merchantRewardLedger : [],
        merchantAnalyticsSnapshots: Array.isArray(data.merchantAnalyticsSnapshots) ? data.merchantAnalyticsSnapshots : [],
        merchantSalesForecasts: Array.isArray(data.merchantSalesForecasts) ? data.merchantSalesForecasts : [],
        merchantDisputeTickets: Array.isArray(data.merchantDisputeTickets) ? data.merchantDisputeTickets : [],
        transactionSettlementActions: Array.isArray(data.transactionSettlementActions) ? data.transactionSettlementActions : [],
        qrSettlementActions: Array.isArray(data.qrSettlementActions) ? data.qrSettlementActions : [],
        merchantDisbursements: Array.isArray(data.merchantDisbursements) ? data.merchantDisbursements : [],
        reconciliations: Array.isArray(data.reconciliations) ? data.reconciliations : [],
        walletSecurityCredentials: Array.isArray(data.walletSecurityCredentials) ? data.walletSecurityCredentials : [],
        deviceBindings: Array.isArray(data.deviceBindings) ? data.deviceBindings : [],
          linkedBankAccounts: Array.isArray(data.linkedBankAccounts) ? data.linkedBankAccounts : [],
          linkedMfsAccounts: Array.isArray(data.linkedMfsAccounts) ? data.linkedMfsAccounts : [],
          savedCards: Array.isArray(data.savedCards) ? data.savedCards : [],
        autoDisbursementConfig: (data.autoDisbursementConfig && typeof data.autoDisbursementConfig === 'object') ? data.autoDisbursementConfig : {},
        inventory: restoredInventory,
        stock: restoredInventory,
        pinEnabled: false,
        appPin: '', // Restored backup always resets PIN lock to safe default for security
        securityConfig: securityService && typeof securityService.createDefaultSecurityConfig === 'function'
          ? securityService.createDefaultSecurityConfig()
          : undefined,
        version: 6,
        lastRestoredAt: new Date().toISOString(),
        restoredFromOwner: manifest && manifest.backupOwner ? manifest.backupOwner.sub : null,
      };

      if (Array.isArray(newStore.accounts) && Array.isArray(newStore.journals)) {
        newStore.accounts = newStore.accounts.map(acc => {
          const accIdStr = String(acc.id);
          const accBizId = String(acc.businessId !== undefined && acc.businessId !== null ? acc.businessId : (acc.business_id !== undefined && acc.business_id !== null ? acc.business_id : '1'));
          const accJournals = newStore.journals.filter(j => {
            const jAccId = String(j?.accountId !== undefined && j?.accountId !== null ? j.accountId : (j?.orig_account_id !== undefined && j?.orig_account_id !== null ? j.orig_account_id : ''));
            if (jAccId !== accIdStr) return false;
            const jBizId = String(j?.businessId !== undefined && j?.businessId !== null ? j.businessId : (j?.business_id !== undefined && j?.business_id !== null ? j.business_id : '1'));
            return jBizId === accBizId;
          });
          if (accJournals.length > 0) {
            accJournals.sort((a, b) => {
              const dateComp = (a.date || a.txn_date || '').localeCompare(b.date || b.txn_date || '');
              if (dateComp !== 0) return dateComp;

              const timeComp = (a.time || '').localeCompare(b.time || '');
              if (timeComp !== 0) return timeComp;

              const idA = isNaN(Number(a.id)) ? a.id : Number(a.id);
              const idB = isNaN(Number(b.id)) ? b.id : Number(b.id);
              if (typeof idA === 'number' && typeof idB === 'number') {
                return idA - idB;
              }
              return String(a.id || '').localeCompare(String(b.id || ''));
            });
            const opening = Number(acc.openingBalance) || 0;
            let runningPaisa = Math.round(opening * 100);
            for (const j of accJournals) {
              const amount = Number(j.amount !== undefined && j.amount !== null ? j.amount : j.amount_received) || 0;
              const amtPaisa = Math.round(amount * 100);
              const isCust = acc.type === 1;
              let isGiven = j.type === 'given' || j.type === 'credit' || j.type === 'purchase' || j.txn_type === 'given';
              let isReceived = j.type === 'received' || j.type === 'cash' || j.type === 'payment' || j.txn_type === 'received';
              if (!isGiven && !isReceived && (j.txn_type === 1 || j.txn_type === 2 || j.txn_type === '1' || j.txn_type === '2')) {
                const numType = Number(j.txn_type);
                if (isCust) {
                  isGiven = numType === 1;
                  isReceived = numType === 2;
                } else {
                  isReceived = numType === 1;
                  isGiven = numType === 2;
                }
              }
              if (isCust) {
                if (isGiven) runningPaisa += amtPaisa;
                else if (isReceived) runningPaisa -= amtPaisa;
              } else {
                if (isReceived) runningPaisa += amtPaisa;
                else if (isGiven) runningPaisa -= amtPaisa;
              }
            }
            return { ...acc, balance: runningPaisa / 100 };
          }
          return acc;
        });
      }

      if (Array.isArray(newStore.businesses)) {
        newStore.businesses = newStore.businesses.map((b) => ({
          ...b,
          isArchived: Boolean(b.isArchived),
        }));
        if (data.businessName && !Array.isArray(data.businesses) && newStore.businesses[0]) {
          newStore.businesses[0] = {
            ...newStore.businesses[0],
            name: data.businessName,
          };
        }
        const hasActiveSelected = newStore.businesses.some((b) => b.isSelected && !b.isArchived);
        if (!hasActiveSelected) {
          const firstActive = newStore.businesses.find((b) => !b.isArchived) || newStore.businesses[0];
          if (firstActive) {
            newStore.businesses = newStore.businesses.map((b) => ({
              ...b,
              isSelected: String(b.id) === String(firstActive.id),
            }));
            newStore.activeBusinessId = String(firstActive.id);
            if (!newStore.businessName) {
              newStore.businessName = firstActive.name;
            }
          }
        } else {
          const selectedBiz = newStore.businesses.find((b) => b.isSelected && !b.isArchived);
          newStore.activeBusinessId = String(selectedBiz.id);
          if (!newStore.businessName) {
            newStore.businessName = selectedBiz.name;
          }
        }
      }

      return newStore;
    });

    this.notifyRestoreHooks({
      moneyManager: restoredMM,
      preferences: restoredPrefs,
    });

    return {
      ...mutateResult,
      restoredMoneyManager: restoredMM,
      restoredPreferences: restoredPrefs,
      restoredDomains: {
        business: shouldRestoreBusiness,
        moneyManager: Boolean(restoredMM),
        money_manager: Boolean(restoredMM),
        preferences: Boolean(restoredPrefs),
      },
    };
  }
  computeLegacyChecksum(dataObj) {
    if (!dataObj) return '';
    const str = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'chk_' + Math.abs(hash).toString(16) + '_' + str.length;
  }

  computeChecksum(dataObj) {
    if (!dataObj) return '';
    const str = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
    try {
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const nodeReq = typeof require === 'function' ? require : null;
        const cryptoModName = ['cry', 'pto'].join('');
        const crypto = nodeReq ? nodeReq(cryptoModName) : null;
        if (crypto && typeof crypto.createHash === 'function') {
          return 'sha256_' + crypto.createHash('sha256').update(str, 'utf8').digest('hex');
        }
      }
    } catch (_) {}
    return this.computeLegacyChecksum(dataObj);
  }

  notifyRestoreHooks(restoredState = {}) {
    try {
      if (moneyManagerService) {
        if (typeof moneyManagerService.resetCache === 'function') {
          moneyManagerService.resetCache();
        }
        if (typeof moneyManagerService.reloadCache === 'function') {
          moneyManagerService.reloadCache(restoredState.moneyManager);
        }
      }
    } catch (_) {}
    try {
      if (preferencesService) {
        if (typeof preferencesService.resetCache === 'function') {
          preferencesService.resetCache();
        }
        if (typeof preferencesService.reloadCache === 'function') {
          preferencesService.reloadCache(restoredState.preferences);
        }
      }
    } catch (_) {}
  }

  async exportCompressedBackup(extraState = {}, options = {}) {
    const backup = await this.createStorageBackup(extraState, options);
    let zlib = null;
    if (typeof require !== 'undefined') {
      try {
        zlib = require('zlib');
      } catch (_) {
        zlib = null;
      }
    }
    if (!zlib) {
      return {
        ...backup,
        compressed: false,
        compression: 'none',
      };
    }

    const rawJson = JSON.stringify(backup.data);
    const uncompressedBytes = Buffer.byteLength(rawJson, 'utf8');
    const compressedBuf = zlib.gzipSync(Buffer.from(rawJson, 'utf8'));
    const compressedBytes = compressedBuf.length;
    const compressedData = compressedBuf.toString('base64');
    const compressionRatio = uncompressedBytes > 0
      ? Math.round((1 - compressedBytes / uncompressedBytes) * 100)
      : 0;

    const manifest = {
      ...backup.manifest,
      compressed: true,
      compression: 'gzip',
      compressionAlgorithm: 'gzip',
      uncompressedBytes,
      compressedBytes,
      compressionRatio,
    };

    const compressedPayload = {
      version: backup.version,
      formatVersion: backup.formatVersion,
      createdAt: backup.createdAt,
      checksum: backup.checksum,
      compressed: true,
      compression: 'gzip',
      compressionAlgorithm: 'gzip',
      manifest,
      compressedData,
      uncompressedBytes,
      compressedBytes,
      compressionRatio,
    };

    // Define non-enumerable lazy getter for data for backward compatibility
    Object.defineProperty(compressedPayload, 'data', {
      get() {
        try {
          const decomp = zlib.gunzipSync(Buffer.from(this.compressedData, 'base64')).toString('utf8');
          return JSON.parse(decomp);
        } catch (_) {
          return backup.data;
        }
      },
      enumerable: false,
      configurable: true,
    });

    if (options && options.asBuffer) {
      return zlib.gzipSync(Buffer.from(JSON.stringify(compressedPayload), 'utf8'));
    }
    if (options && options.asString) {
      return JSON.stringify(compressedPayload);
    }

    return compressedPayload;
  }

  async importCompressedBackup(compressedPayload, options = {}) {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }
    let payload = compressedPayload;
    if (isStoragePayloadCompressed(payload)) {
      payload = decompressStoragePayload(payload);
    }
    return await this.restoreStorageBackup(payload, options);
  }

  async importBackupPayload(backupPayload, options = {}) {
    return this.importCompressedBackup(backupPayload, options);
  }

  async createStorageBackup(extraState = {}, options = {}) {
    const fullState = await this.getFullBackupState(extraState);
    const checksum = this.computeChecksum(fullState);

    const payload = {
      version: 6,
      formatVersion: 2,
      createdAt: new Date().toISOString(),
      checksum,
      manifest: {
        schemaVersion: 6,
        recordCounts: {
          accounts: (fullState.accounts || []).length,
          journals: (fullState.journals || []).length,
          cashEntries: (fullState.cashEntries || []).length,
          businesses: (fullState.businesses || []).length,
          audioNotes: (fullState.audioNotes || []).length,
          tagada_log: (fullState.tagada_log || fullState.tagadaLogs || []).length,
          tagadaLogs: (fullState.tagadaLogs || fullState.tagada_log || []).length,
          billPaymentTransactions: (fullState.billPaymentTransactions || []).length,
          savedBillers: (fullState.savedBillers || []).length,
          transferHistory: (fullState.transferHistory || []).length,
          rechargeHistory: (fullState.rechargeHistory || []).length,
          merchantKyc: (fullState.merchantKyc || []).length,
          merchantQrOrders: (fullState.merchantQrOrders || []).length,
          merchantLoans: (fullState.merchantLoans || []).length,
          merchantLoanEmis: (fullState.merchantLoanEmis || []).length,
        merchantRewards: (fullState.merchantRewards || []).length,
        merchantRewardLedger: (fullState.merchantRewardLedger || []).length,
          merchantAnalyticsSnapshots: (fullState.merchantAnalyticsSnapshots || []).length,
          merchantSalesForecasts: (fullState.merchantSalesForecasts || []).length,
          merchantDisputeTickets: (fullState.merchantDisputeTickets || []).length,
          reconciliations: (fullState.reconciliations || []).length,
          transactionSettlementActions: (fullState.transactionSettlementActions || []).length,
          mmAccounts: (fullState.moneyManager && Array.isArray(fullState.moneyManager.accounts)) ? fullState.moneyManager.accounts.length : 0,
          mmTransactions: (fullState.moneyManager && Array.isArray(fullState.moneyManager.transactions)) ? fullState.moneyManager.transactions.length : 0,
          mmCategories: (fullState.moneyManager && Array.isArray(fullState.moneyManager.categories)) ? fullState.moneyManager.categories.length : 0,
          mmGoals: (fullState.moneyManager && Array.isArray(fullState.moneyManager.goals)) ? fullState.moneyManager.goals.length : 0,
          mmRecurring: (fullState.moneyManager && Array.isArray(fullState.moneyManager.recurring)) ? fullState.moneyManager.recurring.length : 0,
        },
        hasMoneyManager: Boolean(fullState.moneyManager),
      },
      data: fullState,
    };
    return payload;
  }

  async exportAllData(extraState = {}, options = {}) {
    return this.createStorageBackup(extraState, options);
  }

  async exportBackupPayload(extraState = {}, options = {}) {
    return this.createStorageBackup(extraState, options);
  }

  async restoreStorageBackup(backupPayload, options = {}) {
    if (isStoragePayloadCompressed(backupPayload)) {
      backupPayload = decompressStoragePayload(backupPayload);
    }
    if (!backupPayload || typeof backupPayload !== 'object') {
      throw new Error('Invalid restore payload: payload must be an object');
    }

    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }

    const expectedChecksum = (backupPayload && backupPayload.checksum) ||
                             (backupPayload && backupPayload.manifest && (backupPayload.manifest.checksum || backupPayload.manifest.sha256)) ||
                             (backupPayload && backupPayload.sha256) ||
                             null;
    if (expectedChecksum) {
      const dataToVerify = backupPayload.data || backupPayload;
      const isLegacyChk = String(expectedChecksum).startsWith('chk_');
      const computed = isLegacyChk ? this.computeLegacyChecksum(dataToVerify) : this.computeChecksum(dataToVerify);
      if (computed !== expectedChecksum) {
        throw new Error('Backup integrity checksum mismatch: data may be corrupted or tampered');
      }
    }

    this.currentStore = null;
    this._cachedMoneyManager = null;
    if (typeof moneyManagerService !== 'undefined' && moneyManagerService && typeof moneyManagerService.resetCache === 'function') {
      try { moneyManagerService.resetCache(); } catch (_) {}
    }
    if (typeof preferencesService !== 'undefined' && preferencesService && typeof preferencesService.resetCache === 'function') {
      try { preferencesService.resetCache(); } catch (_) {}
    }
    const res = await this.commitRestorePayload(backupPayload, options);

    this.notifyRestoreHooks({
      moneyManager: res.restoredMoneyManager,
      preferences: res.restoredPreferences,
    });

    return res;
  }

  async importAllData(backupPayload, options = {}) {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }
    return this.restoreStorageBackup(backupPayload, options);
  }

  /**
   * Chains a Money Manager state write onto this.writeQueue mutex,
   * guaranteeing that subsequent getFullBackupState/commitRestorePayload calls
   * await the finished disk mutation.
   */
  async saveMoneyManager(mmState) {
    if (!mmState || typeof mmState !== 'object') {
      return { success: false, error: new Error('Valid Money Manager state object is required') };
    }

    this._pendingWrites = (this._pendingWrites || 0) + 1;
    return new Promise((resolve) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          try {
            if (this.adapter && typeof this.adapter.setItem === 'function') {
              await this.adapter.setItem(MM_STORAGE_KEY, JSON.stringify(mmState));
            }
            this._cachedMoneyManager = mmState;
            this.notifyRestoreHooks({ moneyManager: mmState });
            resolve({ success: true, moneyManager: mmState });
          } catch (err) {
            console.error('saveMoneyManager write error:', err);
            resolve({ success: false, error: err });
          } finally {
            this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          }
        })
        .catch((fatalErr) => {
          this._pendingWrites = Math.max(0, (this._pendingWrites || 0) - 1);
          console.error('writeQueue recovered from error during saveMoneyManager:', fatalErr);
          resolve({ success: false, error: fatalErr });
        });
    });
  }

  /**
   * Retrieves authoritative Money Manager state after awaiting any in-flight writeQueue promises.
   */
  async getAuthoritativeMoneyManager() {
    if (this.writeQueue) {
      try {
        await Promise.resolve(this.writeQueue).catch(() => {});
      } catch (_) {}
    }
    if (this._cachedMoneyManager) {
      return this._cachedMoneyManager;
    }
    if (this.adapter && typeof this.adapter.getItem === 'function') {
      try {
        const raw = await this.adapter.getItem(MM_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this._cachedMoneyManager = parsed;
          return parsed;
        }
      } catch (_) {}
    }
    return null;
  }

  /**
   * Returns a copy of journals sorted chronologically by date/time.
   * Memoized via WeakMap caching with array length guard (__len).
   * @param {Array|null} journals Optional journals array (defaults to authoritative state)
   * @returns {Array} Sorted copy of journals
   */
  indexJournalsChronologically(journals = null) {
    const target = Array.isArray(journals)
      ? journals
      : (this && typeof this.getAuthoritativeState === 'function'
          ? (this.getAuthoritativeState()?.journals || [])
          : []);
    return indexJournalsChronologically(target);
  }

  /**
   * Queries journals within a date range using O(log N) binary search on chronologically indexed records.
   * Supports both signatures:
   *   repo.queryJournalsByDateRange(journals, startDate, endDate, options)
   *   repo.queryJournalsByDateRange(startDate, endDate, options)
   *
   * @param {Array|string|Date|null} journalsOrStart
   * @param {string|Date|null} startOrEnd
   * @param {string|Date|Object|null} endOrOptions
   * @param {Object} [maybeOptions={}]
   * @returns {{ journals: Array, totalCount: number, executionTimeMs: number }}
   */
  queryJournalsByDateRange(journalsOrStart, startOrEnd, endOrOptions, maybeOptions = {}) {
    let journals, startDate, endDate, options;
    if (Array.isArray(journalsOrStart)) {
      journals = journalsOrStart;
      startDate = startOrEnd;
      endDate = endOrOptions;
      options = maybeOptions || {};
    } else {
      journals = (this && typeof this.getAuthoritativeState === 'function')
        ? (this.getAuthoritativeState()?.journals || [])
        : [];
      startDate = journalsOrStart;
      endDate = startOrEnd;
      options = (endOrOptions && typeof endOrOptions === 'object' && !(endOrOptions instanceof Date))
        ? endOrOptions
        : (maybeOptions || {});
    }
    return queryJournalsByDateRange(journals, startDate, endDate, options);
  }

  /**
   * Generates an account statement with exact integer-paisa opening balance,
   * range-filtered transactions, step-by-step running balance, and closing balance
   * with 0.00 Paisa float drift and multi-tenant business isolation.
   *
   * @param {Object|string|number} accountOrId Account object or accountId
   * @param {Array|string|number} [journalsOrBizId] Journals array or businessId
   * @param {string|Object} [dateRange='all'] 'all' | 'today' | 'this_month' | 'last_month' | 'custom'
   * @param {Object} [options={}] Additional filter options ({ startDate, endDate, referenceDate })
   * @returns {Object} Statement result
   */
  generateAccountStatement(accountOrId, journalsOrBizId = null, dateRange = 'all', options = {}) {
    let account = null;
    let journals = [];
    let businessId = null;

    if (accountOrId && typeof accountOrId === 'object' && !Array.isArray(accountOrId)) {
      account = accountOrId;
      journals = Array.isArray(journalsOrBizId)
        ? journalsOrBizId
        : (this.currentStore?.journals || this.getAuthoritativeState()?.journals || []);
      businessId = account.businessId || account.business_id || options.businessId || this.getActiveBusinessId();
    } else {
      const targetAccId = String(accountOrId);
      if (typeof journalsOrBizId === 'string' || typeof journalsOrBizId === 'number') {
        businessId = String(journalsOrBizId);
      } else if (Array.isArray(journalsOrBizId)) {
        journals = journalsOrBizId;
        businessId = String(options.businessId || this.getActiveBusinessId() || '1');
      } else if (journalsOrBizId && typeof journalsOrBizId === 'object' && (dateRange === 'all' || !dateRange)) {
        dateRange = journalsOrBizId;
        businessId = String(options.businessId || this.getActiveBusinessId() || '1');
      } else {
        businessId = String(options.businessId || this.getActiveBusinessId() || '1');
      }

      const state = this.getAuthoritativeState() || this.currentStore || {};
      if (!journals || journals.length === 0) {
        journals = Array.isArray(options.journals) ? options.journals : (state.journals || []);
      }
      const accounts = Array.isArray(options.accounts) ? options.accounts : (state.accounts || []);
      account = accounts.find(a => String(a.id) === targetAccId && String(a.businessId || a.business_id || '1') === businessId);
      if (!account) {
        account = { id: targetAccId, name: options.name || 'Account', type: options.type || 1, businessId };
      }
    }

    return generateAccountStatement(account, journals, dateRange, { ...options, businessId });
  }

  /**
   * Records a Tagada reminder audit log with Room DB schema parity,
   * SMS quota deduction, and idempotency guard against duplicate submissions.
   *
   * @param {Object} rawLog Raw Tagada log record (snake_case or camelCase)
   * @param {Object} [options={}] Options ({ bypassQuota, isFreeSms })
   * @returns {Promise<{ success: boolean, data?: Object, duplicate?: boolean, remainingSmsCount: number, error?: string }>} 
   */
  async recordTagadaLog(rawLog = {}, options = {}) {
    const normalized = normalizeTagadaLogFields(rawLog);
    if (!normalized || !normalized.accountId) {
      return { success: false, error: 'INVALID_TAGADA_LOG', remainingSmsCount: 0 };
    }

    const isFreeSms = options.isFreeSms !== false && (
      normalized.tagada_type === 'TAGADA_BY_FREE_SMS' ||
      normalized.tagadaType === 'TAGADA_BY_FREE_SMS' ||
      options.isFreeSms === true
    );

    let duplicateDetected = false;
    let finalLog = normalized;
    let finalRemaining = 0;

    const mutateRes = await this.mutateStore((latestStore) => {
      const curLogs = Array.isArray(latestStore.tagadaLogs) ? latestStore.tagadaLogs : [];
      const curCount = Number(latestStore.remainingSmsCount !== undefined && latestStore.remainingSmsCount !== null
        ? latestStore.remainingSmsCount
        : 5);

      const existing = curLogs.find(l => String(l.id) === String(normalized.id));
      if (existing) {
        duplicateDetected = true;
        finalLog = existing;
        finalRemaining = curCount;
        return latestStore;
      }

      if (isFreeSms && options.bypassQuota !== true && curCount <= 0) {
        throw new Error('SMS_QUOTA_EXHAUSTED');
      }

      const bId = String(normalized.businessId || latestStore.activeBusinessId || '1');
      const quotas = { ...(latestStore.tagada_quota || latestStore.tagadaQuota || {}) };
      const currentQuota = quotas[bId] || {
        freeSmsCount: curCount,
        purchasedSmsCount: Number(latestStore.tallyMessageBalance || 50),
        lastRefreshDate: new Date().toISOString(),
      };

      const nextCount = isFreeSms ? Math.max(0, curCount - 1) : curCount;
      finalRemaining = nextCount;

      quotas[bId] = {
        ...currentQuota,
        freeSmsCount: nextCount,
        purchasedSmsCount: Number(currentQuota.purchasedSmsCount !== undefined ? currentQuota.purchasedSmsCount : (latestStore.tallyMessageBalance || 50)),
        lastRefreshDate: currentQuota.lastRefreshDate || new Date().toISOString(),
        remainingSmsCount: nextCount,
        tallyMessageBalance: Number(currentQuota.purchasedSmsCount !== undefined ? currentQuota.purchasedSmsCount : (latestStore.tallyMessageBalance || 50)),
        businessId: bId,
      };

      const updatedLogs = [normalized, ...curLogs];

      return {
        ...latestStore,
        remainingSmsCount: nextCount,
        tagadaLogs: updatedLogs,
        tagada_log: updatedLogs,
        tagada_quota: quotas,
        tagadaQuota: quotas,
      };
    });

    if (!mutateRes.success) {
      if (mutateRes.error && String(mutateRes.error).includes('SMS_QUOTA_EXHAUSTED')) {
        return { success: false, error: 'SMS_QUOTA_EXHAUSTED', remainingSmsCount: 0 };
      }
      return { success: false, error: mutateRes.error || 'MUTATION_FAILED', remainingSmsCount: 0 };
    }

    if (duplicateDetected) {
      return {
        success: true,
        duplicate: true,
        data: finalLog,
        remainingSmsCount: finalRemaining,
      };
    }

    if (this.telemetry && typeof this.telemetry.logEvent === 'function') {
      try {
        this.telemetry.logEvent(EVENT_TYPES.TAGADA_SENT, {
          accountId: normalized.accountId,
          businessId: normalized.businessId,
          tagadaType: normalized.tagadaType,
          creditAmount: normalized.creditAmount,
          remainingSmsCount: finalRemaining,
        });
      } catch (_) {}
    }

    return {
      success: true,
      duplicate: false,
      data: normalized,
      remainingSmsCount: finalRemaining,
    };
  }

  /**
   * Retrieves current Tagada quota status.
   * @param {string|number|null} [businessId=null]
   * @returns {{ remainingSmsCount: number, tallyMessageBalance: number, maxSmsQuota: number }}
   */
  /**
   * Retrieves current Tagada quota status for a specific business.
   * Multi-tenant business isolation by businessId.
   *
   * @param {string|number|null} [businessId=null]
   * @returns {{
   *   freeSmsCount: number,
   *   purchasedSmsCount: number,
   *   lastRefreshDate: string,
   *   remainingSmsCount: number,
   *   tallyMessageBalance: number,
   *   maxSmsQuota: number,
   *   businessId: string
   * }}
   */
  getTagadaQuota(businessId = null) {
    const state = this.getAuthoritativeState() || this.currentStore || {};
    const bId = String(businessId || this.getActiveBusinessId() || '1');
    const isActive = bId === String(state.activeBusinessId || '1');
    const quotaMap = state.tagada_quota || state.tagadaQuota || {};
    const bQuota = quotaMap[bId];

    let freeSms;
    if (isActive && state.remainingSmsCount !== undefined && state.remainingSmsCount !== null) {
      freeSms = Number(state.remainingSmsCount);
    } else if (bQuota?.freeSmsCount !== undefined && bQuota?.freeSmsCount !== null) {
      freeSms = Number(bQuota.freeSmsCount);
    } else {
      freeSms = 5;
    }

    let purchasedSms;
    if (isActive && state.tallyMessageBalance !== undefined && state.tallyMessageBalance !== null) {
      purchasedSms = Number(state.tallyMessageBalance);
    } else if (bQuota?.purchasedSmsCount !== undefined && bQuota?.purchasedSmsCount !== null) {
      purchasedSms = Number(bQuota.purchasedSmsCount);
    } else {
      purchasedSms = 50;
    }

    const lastRefresh = bQuota?.lastRefreshDate || (state.lastQuotaRefreshDate || '2026-11-04T00:00:00.000Z');

    return {
      freeSmsCount: Math.max(0, freeSms),
      purchasedSmsCount: Math.max(0, purchasedSms),
      lastRefreshDate: lastRefresh,
      remainingSmsCount: Math.max(0, freeSms),
      tallyMessageBalance: Math.max(0, purchasedSms),
      maxSmsQuota: 100,
      businessId: bId,
    };
  }

  /**
   * Persists Tagada quota for a specific business.
   * Multi-tenant business isolation by businessId.
   *
   * @param {string|number} businessId
   * @param {Object} quota { freeSmsCount, purchasedSmsCount, lastRefreshDate }
   * @returns {Promise<{ success: boolean, quota: Object, businessId: string, error?: string }>}
   */
  async setTagadaQuota(businessId, quota = {}) {
    const bId = String(businessId || this.getActiveBusinessId() || '1');
    let updatedQuota = null;

    const res = await this.mutateStore((latestStore) => {
      const quotaMap = { ...(latestStore.tagada_quota || latestStore.tagadaQuota || {}) };
      const current = quotaMap[bId] || {
        freeSmsCount: 5,
        purchasedSmsCount: 50,
        lastRefreshDate: new Date().toISOString(),
      };

      const free = quota.freeSmsCount !== undefined
        ? quota.freeSmsCount
        : (quota.remainingSmsCount !== undefined ? quota.remainingSmsCount : current.freeSmsCount);
      const purchased = quota.purchasedSmsCount !== undefined
        ? quota.purchasedSmsCount
        : (quota.tallyMessageBalance !== undefined ? quota.tallyMessageBalance : current.purchasedSmsCount);
      const refresh = quota.lastRefreshDate || current.lastRefreshDate || new Date().toISOString();

      updatedQuota = {
        freeSmsCount: Math.max(0, Number(free || 0)),
        purchasedSmsCount: Math.max(0, Number(purchased || 0)),
        lastRefreshDate: refresh,
        remainingSmsCount: Math.max(0, Number(free || 0)),
        tallyMessageBalance: Math.max(0, Number(purchased || 0)),
        businessId: bId,
      };

      quotaMap[bId] = updatedQuota;

      const nextStore = {
        ...latestStore,
        tagada_quota: quotaMap,
        tagadaQuota: quotaMap,
      };

      if (bId === String(latestStore.activeBusinessId || '1')) {
        nextStore.remainingSmsCount = updatedQuota.freeSmsCount;
        nextStore.tallyMessageBalance = updatedQuota.purchasedSmsCount;
      }

      return nextStore;
    });

    return {
      success: res.success,
      quota: updatedQuota,
      businessId: bId,
      error: res.error,
    };
  }

  /**
   * Records SMS pack purchase and increments purchasedSmsCount for a business.
   *
   * @param {string|number} businessId
   * @param {Object|number} pack Pack descriptor ({ smsCount, price, packId, name }) or count
   * @returns {Promise<{ success: boolean, quota: Object, pack: Object, addedCount: number, businessId: string, error?: string }>}
   */
  async recordTagadaQuotaPurchase(businessId, pack = {}) {
    const bId = String(businessId || this.getActiveBusinessId() || '1');
    const addedCount = typeof pack === 'number'
      ? pack
      : Number(pack?.smsCount || pack?.count || pack?.quantity || pack?.tallyMessageBalance || 0);

    if (addedCount <= 0) {
      return {
        success: false,
        error: 'INVALID_PACK_SMS_COUNT',
        quota: this.getTagadaQuota(bId),
        businessId: bId,
      };
    }

    let updatedQuota = null;

    const res = await this.mutateStore((latestStore) => {
      const quotaMap = { ...(latestStore.tagada_quota || latestStore.tagadaQuota || {}) };
      const current = quotaMap[bId] || {
        freeSmsCount: 5,
        purchasedSmsCount: 50,
        lastRefreshDate: new Date().toISOString(),
      };

      const newPurchased = Math.max(0, Number(current.purchasedSmsCount || 0) + addedCount);
      const refresh = new Date().toISOString();

      updatedQuota = {
        freeSmsCount: Math.max(0, Number(current.freeSmsCount || 0)),
        purchasedSmsCount: newPurchased,
        lastRefreshDate: refresh,
        remainingSmsCount: Math.max(0, Number(current.freeSmsCount || 0)),
        tallyMessageBalance: newPurchased,
        businessId: bId,
      };

      quotaMap[bId] = updatedQuota;

      const nextStore = {
        ...latestStore,
        tagada_quota: quotaMap,
        tagadaQuota: quotaMap,
      };

      if (bId === String(latestStore.activeBusinessId || '1')) {
        nextStore.remainingSmsCount = updatedQuota.freeSmsCount;
        nextStore.tallyMessageBalance = updatedQuota.purchasedSmsCount;
      }

      return nextStore;
    });

    return {
      success: res.success,
      quota: updatedQuota,
      pack: typeof pack === 'object' ? pack : { smsCount: addedCount },
      addedCount,
      businessId: bId,
      error: res.error,
    };
  }

  /**
   * Adjusts SMS quota with ceiling enforcement (0 <= remaining <= maxQuota).
   * @param {number} delta Positive or negative delta
   * @param {Object} [options={}] Optional parameters ({ maxQuota: 100 })
   * @returns {Promise<{ success: boolean, remainingSmsCount: number, prevRemaining: number, error?: string }>} 
   */
  async adjustTagadaQuota(delta = 0, options = {}) {
    const targetBizId = String(options.businessId || this.getActiveBusinessId() || '1');
    const maxQuota = Math.max(1, Number(options.maxQuota || 100));
    let prev = 0;
    let next = 0;

    const res = await this.mutateStore((latestStore) => {
      const quotas = { ...(latestStore.tagada_quota || latestStore.tagadaQuota || {}) };
      const currentQuota = quotas[targetBizId] || {
        freeSmsCount: 5,
        purchasedSmsCount: 50,
        lastRefreshDate: new Date().toISOString(),
      };

      prev = Number(latestStore.remainingSmsCount !== undefined && latestStore.remainingSmsCount !== null
        ? latestStore.remainingSmsCount
        : 5);
      next = Math.min(maxQuota, Math.max(0, prev + Number(delta || 0)));

      quotas[targetBizId] = {
        ...currentQuota,
        freeSmsCount: next,
        remainingSmsCount: next,
        businessId: targetBizId,
      };

      return {
        ...latestStore,
        remainingSmsCount: next,
        tagada_quota: quotas,
        tagadaQuota: quotas,
      };
    });

    return {
      success: res.success,
      remainingSmsCount: next,
      prevRemaining: prev,
      error: res.error,
    };
  }

  /**
   * Lists Tagada logs with multi-tenant business and account isolation.
   * @param {string|number|null} [accountId=null]
   * @param {string|number|null} [businessId=null]
   * @param {Object} [options={}] Optional pagination and sorting
   * @returns {{ tagadaLogs: Array, totalCount: number }}
   */
  listTagadaLogs(accountId = null, businessId = null, options = {}) {
    const state = this.getAuthoritativeState() || this.currentStore || {};
    const allLogs = Array.isArray(state.tagadaLogs) ? state.tagadaLogs : [];

    const targetAccId = accountId !== null && accountId !== undefined ? String(accountId) : null;
    const targetBizId = businessId !== null && businessId !== undefined ? String(businessId) : null;

    let filtered = allLogs.filter((log) => {
      if (!log) return false;
      if (targetAccId !== null) {
        const lAccId = String(log.accountId !== undefined && log.accountId !== null
          ? log.accountId
          : (log.account_id !== undefined && log.account_id !== null ? log.account_id : ''));
        if (lAccId !== targetAccId) return false;
      }
      if (targetBizId !== null) {
        const lBizId = String(log.businessId !== undefined && log.businessId !== null
          ? log.businessId
          : (log.business_id !== undefined && log.business_id !== null ? log.business_id : '1'));
        if (lBizId !== targetBizId) return false;
      }
      return true;
    });

    const totalCount = filtered.length;
    if (options && (options.offset > 0 || (options.limit !== undefined && options.limit !== null))) {
      const offset = Math.max(0, Number(options.offset) || 0);
      const limit = options.limit !== undefined && options.limit !== null ? Math.max(0, Number(options.limit)) : totalCount;
      filtered = filtered.slice(offset, offset + limit);
    }

    return {
      tagadaLogs: filtered,
      tagada_log: filtered,
      totalCount,
    };
  }

  /**
   * Logs a batch of Tagada reminders with Room SQLite schema parity:
   * (id, account_id, tagada_type, credit_amount, synced, create_date)
   * Multi-tenant business isolation by businessId.
   *
   * @param {string|number} businessId
   * @param {Array<Object>} batchRecords
   * @returns {Promise<{ success: boolean, count: number, records: Array<Object>, businessId: string, error?: string }>}
   */
  async logTagadaBatch(businessId, batchRecords = []) {
    const bId = String(businessId || this.getActiveBusinessId() || '1');
    const rawList = Array.isArray(batchRecords)
      ? batchRecords
      : (batchRecords ? [batchRecords] : []);

    if (rawList.length === 0) {
      return {
        success: true,
        count: 0,
        records: [],
        businessId: bId,
      };
    }

    let createdRecords = [];

    const res = await this.mutateStore((latestStore) => {
      const curLog = Array.isArray(latestStore.tagada_log)
        ? latestStore.tagada_log
        : (Array.isArray(latestStore.tagadaLogs) ? latestStore.tagadaLogs : []);

      let maxId = 0;
      for (const item of curLog) {
        const numId = Number(item?.id);
        if (!isNaN(numId) && numId > maxId) {
          maxId = numId;
        }
      }

      const normalizedBatch = [];
      for (let i = 0; i < rawList.length; i++) {
        const item = rawList[i];
        if (!item || typeof item !== 'object') continue;

        const normId = item.id !== undefined && item.id !== null && !isNaN(Number(item.id))
          ? Number(item.id)
          : (item.id || ++maxId);

        const accId = item.account_id !== undefined && item.account_id !== null
          ? item.account_id
          : (item.accountId !== undefined && item.accountId !== null ? item.accountId : 0);

        const creditAmt = Number(
          item.credit_amount !== undefined
            ? item.credit_amount
            : (item.creditAmount !== undefined ? item.creditAmount : (item.amount || 0))
        );
        const cleanCreditAmt = Math.round((Number.isFinite(creditAmt) ? creditAmt : 0) * 100) / 100;

        const tagadaType = String(
          item.tagada_type || item.tagadaType || item.type || 'TAGADA_BY_FREE_SMS'
        );

        const synced = item.synced !== undefined && item.synced !== null
          ? (Number(item.synced) === 1 ? 1 : 0)
          : 0;

        const createDate = String(
          item.create_date || item.createDate || item.date || new Date().toISOString()
        );

        const record = {
          id: normId,
          account_id: isNaN(Number(accId)) ? accId : Number(accId),
          accountId: String(accId),
          create_date: createDate,
          createDate: createDate,
          credit_amount: cleanCreditAmt,
          creditAmount: cleanCreditAmt,
          tagada_type: tagadaType,
          tagadaType: tagadaType,
          synced,
          business_id: isNaN(Number(bId)) ? bId : Number(bId),
          businessId: bId,
        };

        normalizedBatch.push(record);
      }

      createdRecords = normalizedBatch;

      return {
        ...latestStore,
        tagada_log: [...normalizedBatch, ...curLog],
        tagadaLogs: [...normalizedBatch, ...curLog],
      };
    });

    return {
      success: res.success,
      count: createdRecords.length,
      records: createdRecords,
      businessId: bId,
      error: res.error,
    };
  }

  /**
   * Retrieves all Tagada reminder logs for an account, sorted descending by create_date.
   * Multi-tenant business isolation by businessId.
   *
   * @param {string|number} businessId
   * @param {string|number} accountId
   * @returns {Array<Object>}
   */
  getTagadaLogsByAccount(businessId, accountId) {
    const bId = String(businessId || this.getActiveBusinessId() || '1');
    const accIdStr = String(accountId !== undefined && accountId !== null ? accountId : '');
    const state = this.getAuthoritativeState() || this.currentStore || {};
    const allLogs = Array.isArray(state.tagada_log)
      ? state.tagada_log
      : (Array.isArray(state.tagadaLogs) ? state.tagadaLogs : []);

    const matches = allLogs.filter((log) => {
      if (!log) return false;
      const logBizId = String(
        log.businessId !== undefined && log.businessId !== null
          ? log.businessId
          : (log.business_id !== undefined && log.business_id !== null ? log.business_id : '1')
      );
      if (logBizId !== bId) return false;

      const logAccId = String(
        log.accountId !== undefined && log.accountId !== null
          ? log.accountId
          : (log.account_id !== undefined && log.account_id !== null ? log.account_id : '')
      );
      return logAccId === accIdStr;
    });

    matches.sort((a, b) => {
      const dateA = a.create_date || a.createDate || '';
      const dateB = b.create_date || b.createDate || '';
      const dateCmp = dateB.localeCompare(dateA);
      if (dateCmp !== 0) return dateCmp;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });

    return matches;
  }

  /**
   * Returns the timestamp (create_date) of the most recent Tagada reminder sent to an account.
   * Multi-tenant business isolation by businessId.
   *
   * @param {string|number} businessId
   * @param {string|number} accountId
   * @returns {string|null}
   */
  getLastTagadaDateByAccount(businessId, accountId) {
    const logs = this.getTagadaLogsByAccount(businessId, accountId);
    if (!logs || logs.length === 0) return null;
    return logs[0].create_date || logs[0].createDate || null;
  }

  /**
   * Generates debt aging report for a business categorized into tiers:
   * (0-15 days, 16-30 days, 31-60 days, 60+ days)
   *
   * @param {string|number|null} [businessId=null]
   * @param {Date|string} [asOfDate=new Date()]
   * @returns {Object}
   */
  getDebtAgingReport(businessId = null, asOfDate = new Date()) {
    const bId = String(businessId || this.getActiveBusinessId() || '1');
    const state = this.getAuthoritativeState() || this.currentStore || {};
    const allAccounts = Array.isArray(state.accounts) ? state.accounts : [];
    const bizAccounts = allAccounts.filter((a) => {
      const aBizId = String(
        a.businessId !== undefined && a.businessId !== null
          ? a.businessId
          : (a.business_id !== undefined && a.business_id !== null ? a.business_id : '1')
      );
      return aBizId === bId && a.type === 1;
    });

    if (batchTagadaService && typeof batchTagadaService.categorizeDebtAging === 'function') {
      return batchTagadaService.categorizeDebtAging(bizAccounts, asOfDate);
    }
    return {};
  }

  /**
   * Calculates comprehensive storage resource metrics, byte allocations, and quota status.
   * @returns {Promise<{
   *   totalBytes: number,
   *   domains: { business: number, personal: number, preferences: number },
   *   collectionCounts: Object,
   *   quotaBytes: number,
   *   usagePercent: number,
   *   isNearQuota: boolean,
   *   recommendedAction: 'none' | 'compactStorage'
   * }>}
   */
  /**
   * Retrieves all active customers with positive outstanding debt for bulk Tagada dispatch.
   * Scoped to businessId, sorted descending by balance.
   *
   * @param {string|number|null} [businessId=null]
   * @param {Array|null} [accounts=null]
   * @returns {Array<Object>} Eligible customers
   */
  getBulkTagadaEligibleCustomers(businessId = null, accounts = null) {
    const targetBizId = businessId !== null && businessId !== undefined
      ? String(businessId)
      : this.getActiveBusinessId();
    let accList = Array.isArray(accounts) ? accounts : null;
    if (!accList) {
      const state = this.getAuthoritativeState() || this.currentStore || {};
      accList = Array.isArray(state.accounts) ? state.accounts : [];
    }
    return getBulkTagadaEligibleCustomers(targetBizId, accList);
  }

  /**
   * Prepares a bulk Tagada batch:
   * - Localized Bengali SMS reminders with telecom UCS-2 character counting & segments
   * - Aggregate quota checks and shortfall calculation
   *
   * @param {Array<Object|string|number>} customerIdsOrCustomers Customer objects or IDs
   * @param {Object} [options={}] Options
   * @returns {Object} Compiled batch metadata
   */
  prepareBulkTagadaBatch(customerIdsOrCustomers = [], options = {}) {
    const targetBizId = options.businessId !== undefined && options.businessId !== null
      ? String(options.businessId)
      : this.getActiveBusinessId();
    const state = this.getAuthoritativeState() || this.currentStore || {};
    const accounts = Array.isArray(options.accounts) ? options.accounts : (state.accounts || []);

    let businessName = options.businessName;
    let businessPhone = options.businessPhone;
    if (!businessName || !businessPhone) {
      const bizList = Array.isArray(state.businesses) ? state.businesses : [];
      const currentBiz = bizList.find(b => String(b.id || b.business_id) === targetBizId) || null;
      if (currentBiz) {
        if (!businessName) businessName = currentBiz.name || currentBiz.business_name || currentBiz.businessName;
        if (!businessPhone) businessPhone = currentBiz.phone;
      }
    }

    const remainingQuota = options.remainingSmsCount !== undefined && options.remainingSmsCount !== null
      ? options.remainingSmsCount
      : this.getTagadaQuota(targetBizId).remainingSmsCount;

    return prepareBulkTagadaBatch(customerIdsOrCustomers, {
      businessId: targetBizId,
      accounts,
      businessName,
      businessPhone,
      remainingSmsCount: remainingQuota,
      ...options,
    });
  }

  /**
   * Dispatches bulk Tagada batch atomically under writeQueue mutex:
   * - Idempotency guard: skips items whose ID is already recorded in tagadaLogs
   * - SMS quota deduction with zero-floor clamping
   * - Fast-rejection on SMS_QUOTA_EXHAUSTED
   * - Creates normalized Room DB-compliant tagada_log entries
   * - Dispatches telemetry events for each sent reminder
   *
   * @param {Array|Object} batchItemsOrPrep Array of items or prepareBulkTagadaBatch result
   * @param {Object} [options={}] Options ({ isFreeSms, bypassQuota, countBySegments })
   * @returns {Promise<{ success: boolean, dispatchedCount: number, skippedDuplicates: number, deductedQuota: number, remainingSmsCount: number, tagadaLogs: Array, error?: string }>}
   */
  async dispatchBulkTagadaBatch(batchItemsOrPrep = [], options = {}) {
    let items = [];
    if (batchItemsOrPrep && typeof batchItemsOrPrep === 'object' && Array.isArray(batchItemsOrPrep.batchItems)) {
      items = batchItemsOrPrep.batchItems;
    } else if (Array.isArray(batchItemsOrPrep)) {
      items = batchItemsOrPrep;
    }

    if (!items || items.length === 0) {
      return {
        success: true,
        dispatchedCount: 0,
        skippedDuplicates: 0,
        deductedQuota: 0,
        remainingSmsCount: this.getTagadaQuota().remainingSmsCount,
        tagadaLogs: [],
        totalRecipients: 0,
      };
    }

    const isFreeSms = options.isFreeSms !== false;
    const bypassQuota = options.bypassQuota === true;
    const countBySegments = options.countBySegments !== false;

    let dispatchedLogs = [];
    let skippedCount = 0;
    let finalQuotaDeducted = 0;
    let finalRemaining = 0;

    const mutateRes = await this.mutateStore((latestStore) => {
      const curLogs = Array.isArray(latestStore.tagadaLogs) ? latestStore.tagadaLogs : [];
      const curRemaining = Number(latestStore.remainingSmsCount !== undefined && latestStore.remainingSmsCount !== null
        ? latestStore.remainingSmsCount
        : 5);

      const existingIdSet = new Set(curLogs.map(l => String(l.id)));
      const newItems = [];
      let quotaNeeded = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const itemId = String(item.id || '');
        if (itemId && existingIdSet.has(itemId)) {
          skippedCount++;
          continue;
        }
        const norm = normalizeTagadaLogFields(item);
        if (!norm || !norm.accountId) continue;

        newItems.push(norm);
        existingIdSet.add(String(norm.id));

        const segs = Number(item.segments || norm.segments || 1);
        quotaNeeded += countBySegments ? segs : 1;
      }

      if (isFreeSms && !bypassQuota && curRemaining < quotaNeeded) {
        throw new Error(`SMS_QUOTA_EXHAUSTED: required ${quotaNeeded}, available ${curRemaining}`);
      }

      const nextRemaining = (isFreeSms && !bypassQuota)
        ? Math.max(0, curRemaining - quotaNeeded)
        : curRemaining;

      const targetBizId = options.businessId !== undefined && options.businessId !== null
        ? String(options.businessId)
        : String(latestStore.activeBusinessId || '1');
      const quotas = { ...(latestStore.tagada_quota || latestStore.tagadaQuota || {}) };
      const currentQuota = quotas[targetBizId] || {
        freeSmsCount: curRemaining,
        purchasedSmsCount: Number(latestStore.tallyMessageBalance || 50),
        lastRefreshDate: new Date().toISOString(),
      };

      quotas[targetBizId] = {
        ...currentQuota,
        freeSmsCount: nextRemaining,
        purchasedSmsCount: Number(currentQuota.purchasedSmsCount !== undefined ? currentQuota.purchasedSmsCount : (latestStore.tallyMessageBalance || 50)),
        lastRefreshDate: currentQuota.lastRefreshDate || new Date().toISOString(),
        remainingSmsCount: nextRemaining,
        tallyMessageBalance: Number(currentQuota.purchasedSmsCount !== undefined ? currentQuota.purchasedSmsCount : (latestStore.tallyMessageBalance || 50)),
        businessId: targetBizId,
      };

      finalQuotaDeducted = (isFreeSms && !bypassQuota) ? quotaNeeded : 0;
      finalRemaining = nextRemaining;
      dispatchedLogs = newItems;

      const updatedLogs = [...newItems, ...curLogs];

      return {
        ...latestStore,
        remainingSmsCount: nextRemaining,
        tagadaLogs: updatedLogs,
        tagada_log: updatedLogs,
        tagada_quota: quotas,
        tagadaQuota: quotas,
      };
    });

    if (!mutateRes.success) {
      const errMsg = mutateRes.error ? String(mutateRes.error) : 'MUTATION_FAILED';
      if (errMsg.includes('SMS_QUOTA_EXHAUSTED')) {
        return {
          success: false,
          error: 'SMS_QUOTA_EXHAUSTED',
          dispatchedCount: 0,
          skippedDuplicates: skippedCount,
          deductedQuota: 0,
          remainingSmsCount: this.getTagadaQuota().remainingSmsCount,
        };
      }
      return {
        success: false,
        error: errMsg,
        dispatchedCount: 0,
        skippedDuplicates: skippedCount,
        deductedQuota: 0,
        remainingSmsCount: this.getTagadaQuota().remainingSmsCount,
      };
    }

    // Emit telemetry events
    if (this.telemetry && typeof this.telemetry.logEvent === 'function') {
      for (let i = 0; i < dispatchedLogs.length; i++) {
        const log = dispatchedLogs[i];
        try {
          this.telemetry.logEvent(EVENT_TYPES.TAGADA_SENT, {
            accountId: log.accountId,
            businessId: log.businessId,
            tagadaType: log.tagadaType,
            creditAmount: log.creditAmount,
            remainingSmsCount: finalRemaining,
            isBulk: true,
          });
        } catch (_) {}
      }
    }

    return {
      success: true,
      dispatchedCount: dispatchedLogs.length,
      skippedDuplicates: skippedCount,
      deductedQuota: finalQuotaDeducted,
      remainingSmsCount: finalRemaining,
      tagadaLogs: dispatchedLogs,
      totalRecipients: items.length,
    };
  }

  /**
   * Generates a printable/exportable statement document payload with business metadata,
   * customer profile, date-range headers, itemized ledger entries, running balances,
   * and localized Bengali summary presentation copy.
   *
   * @param {Object|string|number} accountOrId Account object or accountId
   * @param {Array|string|number} [journalsOrBizId] Journals array or businessId
   * @param {string|Object} [dateRange='all'] 'all' | 'today' | 'this_month' | 'last_month' | 'custom'
   * @param {Object} [options={}] Additional presentation options
   * @returns {Object} Comprehensive statement document payload
   */
  generateStatementDocumentPayload(accountOrId, journalsOrBizId = null, dateRange = 'all', options = {}) {
    let account = null;
    let journals = [];
    let businessId = null;

    if (accountOrId && typeof accountOrId === 'object' && !Array.isArray(accountOrId)) {
      account = accountOrId;
      journals = Array.isArray(journalsOrBizId)
        ? journalsOrBizId
        : (this.currentStore?.journals || this.getAuthoritativeState()?.journals || []);
      businessId = account.businessId || account.business_id || options.businessId || this.getActiveBusinessId();
    } else {
      const targetAccId = String(accountOrId);
      if (typeof journalsOrBizId === 'string' || typeof journalsOrBizId === 'number') {
        businessId = String(journalsOrBizId);
      } else if (Array.isArray(journalsOrBizId)) {
        journals = journalsOrBizId;
        businessId = String(options.businessId || this.getActiveBusinessId() || '1');
      } else if (journalsOrBizId && typeof journalsOrBizId === 'object' && (dateRange === 'all' || !dateRange)) {
        dateRange = journalsOrBizId;
        businessId = String(options.businessId || this.getActiveBusinessId() || '1');
      } else {
        businessId = String(options.businessId || this.getActiveBusinessId() || '1');
      }

      const state = this.getAuthoritativeState() || this.currentStore || {};
      if (!journals || journals.length === 0) {
        journals = Array.isArray(options.journals) ? options.journals : (state.journals || []);
      }
      const accounts = Array.isArray(options.accounts) ? options.accounts : (state.accounts || []);
      account = accounts.find(a => String(a.id) === targetAccId && String(a.businessId || a.business_id || '1') === businessId);
      if (!account) {
        account = { id: targetAccId, name: options.name || 'Account', type: options.type || 1, businessId };
      }
    }

    // Resolve business info if missing in options
    const state = this.getAuthoritativeState() || this.currentStore || {};
    let businessName = options.businessName;
    let businessOwner = options.businessOwner;
    let businessPhone = options.businessPhone;
    let businessAddress = options.businessAddress;

    if (!businessName || !businessPhone || !businessAddress || !businessOwner) {
      const bizList = Array.isArray(state.businesses) ? state.businesses : [];
      const currentBiz = bizList.find(b => String(b.id || b.business_id) === String(businessId || '1')) || null;
      if (currentBiz) {
        if (!businessName) businessName = currentBiz.name || currentBiz.business_name || currentBiz.businessName;
        if (!businessOwner) businessOwner = currentBiz.owner;
        if (!businessPhone) businessPhone = currentBiz.phone;
        if (!businessAddress) businessAddress = currentBiz.address || currentBiz.business_address || currentBiz.businessAddress;
      }
    }

    return generateStatementDocumentPayload(account, journals, dateRange, {
      ...options,
      businessId,
      businessName,
      businessOwner,
      businessPhone,
      businessAddress,
    });
  }

  /**
   * Generates a printable, standalone HTML5 statement styled to standard A4 (794px x 1123px / 210mm x 297mm).
   *
   * @param {Object|string} statementPayload Statement document payload, or account object / accountId
   * @param {Object} [options={}] Additional formatting and override options
   * @returns {string} Standalone HTML5 document
   */
  generatePrintableHtmlStatement(statementPayload, options = {}) {
    if (statementPayload && (statementPayload.docType === 'ACCOUNT_STATEMENT' || statementPayload.docType === 'CONSOLIDATED_REPORT')) {
      return generatePrintableHtmlStatement(statementPayload, options);
    }
    const stmtPayload = this.generateStatementDocumentPayload(statementPayload, options.journals || null, options.dateRange || 'all', options);
    return generatePrintableHtmlStatement(stmtPayload, options);
  }

  /**
   * Generates structured document payload for consolidated business reports:
   * - REPORT_TYPES.DAILY_BAKI
   * - REPORT_TYPES.MONTHLY_BAKI
   * - REPORT_TYPES.CASHBOX_SUMMARY
   * - REPORT_TYPES.BECHA_KENA_SUMMARY
   *
   * @param {string} reportType One of REPORT_TYPES
   * @param {string|Object} [dateRange='all'] Date range ('today', 'this_month', 'last_month', 'all', 'custom')
   * @param {Object} [options={}] Additional filter and presentation options
   * @returns {Object} Structured report document payload with embedded print-ready HTML
   */
  generateConsolidatedReportDocument(reportType, dateRange = 'all', options = {}) {
    const store = this.currentStore || this.getAuthoritativeState() || {};
    const businessId = String(options.businessId || this.getActiveBusinessId() || '1');
    const businesses = Array.isArray(store.businesses) ? store.businesses : [];
    const currentBiz = businesses.find(b => String(b.id || b.business_id) === businessId) || null;

    const mergedOptions = {
      accounts: Array.isArray(options.accounts) ? options.accounts : (store.accounts || []),
      journals: Array.isArray(options.journals) ? options.journals : (store.journals || []),
      cashEntries: Array.isArray(options.cashEntries) ? options.cashEntries : (store.cashEntries || []),
      inventory: Array.isArray(options.inventory) ? options.inventory : (store.inventory || store.stock || []),
      stock: Array.isArray(options.stock) ? options.stock : (store.stock || store.inventory || []),
      businessId,
      business: currentBiz || options.business,
      businessName: options.businessName || (currentBiz ? (currentBiz.name || currentBiz.business_name || currentBiz.businessName) : 'টালিখাতা ডিজিটাল'),
      businessPhone: options.businessPhone || (currentBiz ? currentBiz.phone : ''),
      businessAddress: options.businessAddress || (currentBiz ? (currentBiz.address || currentBiz.business_address || currentBiz.businessAddress) : ''),
      businessOwner: options.businessOwner || (currentBiz ? currentBiz.owner : ''),
      ...options,
    };

    return generateConsolidatedReportDocument(reportType, dateRange, mergedOptions);
  }

  /**
   * Generates structured customer list & outstanding debt report.
   * Parity with activity_customer_list_report_builder.xml
   *
   * @param {Object} [options={}] Filter and sorting options
   * @returns {Object} Structured report document payload with embedded print-ready HTML
   */
  generateCustomerListReportDocument(options = {}) {
    const store = this.currentStore || this.getAuthoritativeState() || {};
    const businessId = String(options.businessId || this.getActiveBusinessId() || "1");
    const businesses = Array.isArray(store.businesses) ? store.businesses : [];
    const currentBiz = businesses.find(b => String(b.id || b.business_id) === businessId) || null;

    const mergedOptions = {
      accounts: Array.isArray(options.accounts) ? options.accounts : (store.accounts || []),
      journals: Array.isArray(options.journals) ? options.journals : (store.journals || []),
      businessId,
      business: currentBiz || options.business,
      businessName: options.businessName || (currentBiz ? (currentBiz.name || currentBiz.business_name || currentBiz.businessName) : "টালিখাতা ডিজিটাল"),
      businessPhone: options.businessPhone || (currentBiz ? currentBiz.phone : ""),
      businessAddress: options.businessAddress || (currentBiz ? (currentBiz.address || currentBiz.business_address || currentBiz.businessAddress) : ""),
      businessOwner: options.businessOwner || (currentBiz ? currentBiz.owner : ""),
      ...options,
    };

    return generateCustomerListReportDocument(mergedOptions);
  }

  /**
   * Generates business expense breakdown report.
   * Parity with MonthlyExpensePdfBuilderActivity
   *
   * @param {string|Object} [dateRange="this_month"] Date range selection
   * @param {Object} [options={}] Storage collections and overrides
   * @returns {Object} Structured report document payload with embedded print-ready HTML
   */
  generateExpenseReportDocument(dateRange = "this_month", options = {}) {
    const store = this.currentStore || this.getAuthoritativeState() || {};
    const businessId = String(options.businessId || this.getActiveBusinessId() || "1");
    const businesses = Array.isArray(store.businesses) ? store.businesses : [];
    const currentBiz = businesses.find(b => String(b.id || b.business_id) === businessId) || null;

    const mergedOptions = {
      cashEntries: Array.isArray(options.cashEntries) ? options.cashEntries : (store.cashEntries || []),
      journals: Array.isArray(options.journals) ? options.journals : (store.journals || []),
      businessId,
      business: currentBiz || options.business,
      businessName: options.businessName || (currentBiz ? (currentBiz.name || currentBiz.business_name || currentBiz.businessName) : "টালিখাতা ডিজিটাল"),
      businessPhone: options.businessPhone || (currentBiz ? currentBiz.phone : ""),
      businessAddress: options.businessAddress || (currentBiz ? (currentBiz.address || currentBiz.business_address || currentBiz.businessAddress) : ""),
      businessOwner: options.businessOwner || (currentBiz ? currentBiz.owner : ""),
      ...options,
    };

    return generateExpenseReportDocument(dateRange, mergedOptions);
  }

  /**
   * Generates inventory stock movement and valuation report.
   * Parity with stock ledger statement layout
   *
   * @param {string|Object} [dateRange="all"] Date range selection
   * @param {Object} [options={}] Storage collections and overrides
   * @returns {Object} Structured report document payload with embedded print-ready HTML
   */
  generateStockMovementReportDocument(dateRange = "all", options = {}) {
    const store = this.currentStore || this.getAuthoritativeState() || {};
    const businessId = String(options.businessId || this.getActiveBusinessId() || "1");
    const businesses = Array.isArray(store.businesses) ? store.businesses : [];
    const currentBiz = businesses.find(b => String(b.id || b.business_id) === businessId) || null;

    const mergedOptions = {
      inventory: Array.isArray(options.inventory) ? options.inventory : (store.inventory || store.stock || []),
      stock: Array.isArray(options.stock) ? options.stock : (store.stock || store.inventory || []),
      businessId,
      business: currentBiz || options.business,
      businessName: options.businessName || (currentBiz ? (currentBiz.name || currentBiz.business_name || currentBiz.businessName) : "টালিখাতা ডিজিটাল"),
      businessPhone: options.businessPhone || (currentBiz ? currentBiz.phone : ""),
      businessAddress: options.businessAddress || (currentBiz ? (currentBiz.address || currentBiz.business_address || currentBiz.businessAddress) : ""),
      businessOwner: options.businessOwner || (currentBiz ? currentBiz.owner : ""),
      ...options,
    };

    return generateStockMovementReportDocument(dateRange, mergedOptions);
  }

  /**
   * Generates a printable, standalone HTML5 report styled to standard A4 (794px x 1123px / 210mm x 297mm).
   *
   * @param {Object} reportPayload Consolidated report document payload
   * @param {Object} [options={}] Formatting and presentation overrides
   * @returns {string} Standalone HTML5 document
   */
  generatePrintableHtmlReport(reportPayload, options = {}) {
    return generatePrintableHtmlReport(reportPayload, options);
  }

  paginateStatementDocument(statementPayload, options = {}) {
    if (statementPayload && (statementPayload.docType === 'ACCOUNT_STATEMENT' || statementPayload.docType === 'PAGINATED_ACCOUNT_STATEMENT')) {
      return paginateStatementDocument(statementPayload, options);
    }
    const stmtPayload = this.generateStatementDocumentPayload(statementPayload, options.journals || null, options.dateRange || 'all', options);
    return paginateStatementDocument(stmtPayload, options);
  }

  generatePdfShareIntentPayload(documentPayload, options = {}) {
    if (documentPayload && (documentPayload.docType === 'ACCOUNT_STATEMENT' || documentPayload.docType === 'CONSOLIDATED_REPORT' || documentPayload.docType === 'PAGINATED_ACCOUNT_STATEMENT' || documentPayload.docType === 'PAGINATED_CONSOLIDATED_REPORT')) {
      return generatePdfShareIntentPayload(documentPayload, options);
    }
    const stmtPayload = this.generateStatementDocumentPayload(documentPayload, options.journals || null, options.dateRange || 'all', options);
    return generatePdfShareIntentPayload(stmtPayload, options);
  }

  paginateConsolidatedReportDocument(reportPayload, options = {}) {
    if (reportPayload && (reportPayload.docType === 'CONSOLIDATED_REPORT' || reportPayload.docType === 'PAGINATED_CONSOLIDATED_REPORT' || reportPayload.reportType)) {
      return paginateConsolidatedReportDocument(reportPayload, options);
    }
    const repPayload = this.generateConsolidatedReportDocument(options.reportType || REPORT_TYPES.DAILY_BAKI, options.dateRange || 'all', options);
    return paginateConsolidatedReportDocument(repPayload, options);
  }

  async getStorageMetrics() {
    if (!this.currentStore) {
      await this.loadInitialData();
    }

    const v6Str = (await this.adapter.getItem(V6_KEY)) || JSON.stringify(this.currentStore);
    const mmStr = (await this.adapter.getItem(MM_STORAGE_KEY)) || '{}';
    const prefsStr = (await this.adapter.getItem(PREFERENCES_STORAGE_KEY)) || '{}';

    const businessBytes = Buffer.byteLength(v6Str, 'utf8');
    const personalBytes = Buffer.byteLength(mmStr, 'utf8');
    const prefsBytes = Buffer.byteLength(prefsStr, 'utf8');
    const totalBytes = businessBytes + personalBytes + prefsBytes;

    const QUOTA_LIMIT_BYTES = 50 * 1024 * 1024;
    const usagePercent = Number(((totalBytes / QUOTA_LIMIT_BYTES) * 100).toFixed(2));
    const isNearQuota = usagePercent >= 80;

    let parsedMM = {};
    try { parsedMM = JSON.parse(mmStr); } catch (e) {}

    const store = this.currentStore;
    const collectionCounts = {
      accounts: Array.isArray(store.accounts) ? store.accounts.length : 0,
      journals: Array.isArray(store.journals) ? store.journals.length : 0,
      cashEntries: Array.isArray(store.cashEntries) ? store.cashEntries.length : 0,
      inventory: Array.isArray(store.inventory) ? store.inventory.length : 0,
      stock: Array.isArray(store.stock) ? store.stock.length : 0,
      notes: Array.isArray(store.notes) ? store.notes.length : 0,
      businesses: Array.isArray(store.businesses) ? store.businesses.length : 0,
      wallets: Array.isArray(parsedMM.wallets) ? parsedMM.wallets.length : (Array.isArray(parsedMM.accounts) ? parsedMM.accounts.length : 0),
      moneyManagerTxns: Array.isArray(parsedMM.transactions) ? parsedMM.transactions.length : 0,
    };

    return {
      totalBytes,
      domains: {
        business: businessBytes,
        personal: personalBytes,
        preferences: prefsBytes,
      },
      collectionCounts,
      quotaBytes: QUOTA_LIMIT_BYTES,
      usagePercent,
      isNearQuota,
      recommendedAction: isNearQuota || collectionCounts.journals > 5000 ? 'compactStorage' : 'none',
    };
  }

  /**
   * Retrieves all unsynced records (synced === 0) for a specific collection or across all collections.
   * Aligns with reference Room DB DAO queries: SELECT * FROM <table> WHERE synced = 0
   * @param {string} [collectionName] - Optional specific collection (e.g., 'accounts', 'journals', 'businesses')
   * @returns {Array|Object}
   */
  getUnsyncedRecords(collectionName = null) {
    if (!this.currentStore) return collectionName ? [] : {};

    const targetCols = collectionName
      ? [collectionName]
      : ['accounts', 'journals', 'cashEntries', 'businesses', 'inventory', 'stock', 'tagadaLogs'];

    const result = {};
    for (const col of targetCols) {
      if (Array.isArray(this.currentStore[col])) {
        result[col] = this.currentStore[col].filter((item) => item && (item.synced === 0 || item.synced === false || item.synced === undefined));
      } else {
        result[col] = [];
      }
    }

    return collectionName ? (result[collectionName] || []) : result;
  }

  /**
   * Marks specified record IDs as synchronized (synced = 1) in a collection.
   * Aligns with reference Room DB DAO updates: UPDATE <table> SET synced = 1 WHERE id IN (...)
   * @param {string} collectionName
   * @param {Array<string|number>} ids
   * @returns {Promise<{success: boolean, updatedCount: number}>}
   */
  async markRecordsSynced(collectionName, ids = []) {
    if (!collectionName || !VALID_COLLECTIONS.has(collectionName) || !Array.isArray(ids) || ids.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    const idSet = new Set(ids.map(String));
    let updatedCount = 0;

    const res = await this.mutateCollection(collectionName, (list) => {
      return list.map((item) => {
        if (item && item.id && idSet.has(String(item.id))) {
          updatedCount++;
          const nowIso = new Date().toISOString();
          return {
            ...item,
            synced: 1,
            is_synced: 1,
            syncedDate: nowIso,
            synced_date: nowIso,
          };
        }
        return item;
      });
    });

    return {
      success: res.success,
      updatedCount,
      error: res.error,
    };
  }

  /**
   * Simulates bidirectional synchronization of a collection against a server snapshot.
   * - Identifies pending local changes (synced === 0 || synced === false || synced === undefined).
   * - Detects conflicts between local modifications and server incoming records using updated_at / timestamp.
   * - Applies conflict resolution:
   *     - local changes newer than server take precedence (local wins, merges non-conflicting fields if enabled).
   *     - server changes newer than local overwrite local (server wins, merges non-conflicting fields if enabled).
   *     - identical timestamps resolved via deterministic tieBreaker (default: server wins or field merge).
   * - Marks successfully synchronized records with synced = 1, is_synced = 1, syncedDate = nowIso.
   * - Supports atomic rollback on partial failure or simulated network errors.
   * 
   * @param {string} collectionName - Valid collection name ('accounts', 'journals', etc.)
   * @param {Array<Object>} [serverSnapshot=[]] - Array of server records for this collection
   * @param {Object} [options={}] - Sync options (dryRun, preferFieldMerge, forceLocal, forceServer, simulatePartialFailure, tieBreaker, etc.)
   * @returns {Promise<{success: boolean, syncedCount: number, conflictCount: number, resolvedCount: number, errors: string[], details?: Object}>}
   */
  async simulateSyncBatch(collectionName, serverSnapshot = [], options = {}) {
    // If collectionName is 'all' or omitted and serverSnapshot is an object with collection arrays
    if ((!collectionName || collectionName === 'all') && serverSnapshot && typeof serverSnapshot === 'object' && !Array.isArray(serverSnapshot)) {
      const summary = {
        success: true,
        syncedCount: 0,
        conflictCount: 0,
        resolvedCount: 0,
        errors: [],
        collections: {},
      };
      for (const col of Object.keys(serverSnapshot)) {
        if (VALID_COLLECTIONS.has(col)) {
          const colRes = await this.simulateSyncBatch(col, serverSnapshot[col], options);
          summary.syncedCount += colRes.syncedCount || 0;
          summary.conflictCount += colRes.conflictCount || 0;
          summary.resolvedCount += colRes.resolvedCount || 0;
          if (colRes.errors && colRes.errors.length) {
            summary.errors.push(...colRes.errors);
          }
          if (!colRes.success) {
            summary.success = false;
          }
          summary.collections[col] = colRes;
        }
      }
      return summary;
    }

    if (!collectionName || !VALID_COLLECTIONS.has(collectionName)) {
      return {
        success: false,
        syncedCount: 0,
        conflictCount: 0,
        resolvedCount: 0,
        errors: [`INVALID_COLLECTION: ${collectionName}`],
      };
    }

    if (!Array.isArray(serverSnapshot)) {
      return {
        success: false,
        syncedCount: 0,
        conflictCount: 0,
        resolvedCount: 0,
        errors: ['INVALID_SERVER_SNAPSHOT: expected array of server records'],
      };
    }

    if (!this.currentStore) {
      const loadRes = await this.loadInitialData();
      if (!loadRes.success) {
        return {
          success: false,
          syncedCount: 0,
          conflictCount: 0,
          resolvedCount: 0,
          errors: [`LOAD_FAILED: ${loadRes.error}`],
        };
      }
    }

    const preferFieldMerge = options.preferFieldMerge !== false;
    const tieBreaker = options.tieBreaker || 'server';
    const nowIso = new Date().toISOString();
    const errors = [];
    let syncedCount = 0;
    let conflictCount = 0;
    let resolvedCount = 0;
    let localPushedCount = 0;
    let serverPulledCount = 0;
    const conflictDetails = [];

    const serverMap = new Map();
    for (const sItem of serverSnapshot) {
      if (sItem && typeof sItem === 'object' && sItem.id !== undefined && sItem.id !== null) {
        serverMap.set(String(sItem.id), sItem);
      }
    }

    // Dry-run mode: compute transitions and diffs without storage mutation
    if (options.dryRun) {
      const currentList = Array.isArray(this.currentStore[collectionName]) ? this.currentStore[collectionName] : [];
      const processedServerIds = new Set();

      for (let idx = 0; idx < currentList.length; idx++) {
        const localItem = currentList[idx];
        if (!localItem || localItem.id === undefined || localItem.id === null) continue;
        const idStr = String(localItem.id);
        const isDirty = (localItem.synced === 0 || localItem.synced === false || localItem.synced === undefined || localItem.synced === null);

        if (serverMap.has(idStr)) {
          processedServerIds.add(idStr);
          const serverItem = serverMap.get(idStr);
          if (!isDirty) {
            syncedCount++;
            serverPulledCount++;
          } else {
            const hasConflict = recordsDiffer(localItem, serverItem);
            if (!hasConflict) {
              syncedCount++;
              localPushedCount++;
            } else {
              conflictCount++;
              resolvedCount++;
              syncedCount++;
              const localTs = extractRecordTimestamp(localItem, options.timestampFields);
              const serverTs = extractRecordTimestamp(serverItem, options.timestampFields);
              const winner = options.forceLocal ? 'local' : (options.forceServer ? 'server' : (localTs > serverTs ? 'local' : (serverTs > localTs ? 'server' : tieBreaker)));
              conflictDetails.push({
                id: idStr,
                winner,
                localTs,
                serverTs,
                reason: localTs > serverTs ? 'local_newer' : (serverTs > localTs ? 'server_newer' : 'identical_timestamp_tie'),
              });
            }
          }
        } else {
          if (isDirty) {
            syncedCount++;
            localPushedCount++;
          }
        }
      }

      for (const [sId] of serverMap.entries()) {
        if (!processedServerIds.has(sId)) {
          syncedCount++;
          serverPulledCount++;
        }
      }

      return {
        success: true,
        dryRun: true,
        syncedCount,
        conflictCount,
        resolvedCount,
        serverAddedCount: serverPulledCount,
        localPushedCount,
        errors,
        conflictDetails,
      };
    }

    // Actual persistent mutation with atomic rollback
    let batchConflictDetails = [];
    const mutationRes = await this.mutateCollection(collectionName, (currentList) => {
      const updatedList = [];
      const processedServerIds = new Set();
      let batchSyncedCount = 0;
      let batchConflictCount = 0;
      let batchResolvedCount = 0;
      let batchLocalPushed = 0;
      let batchServerPulled = 0;
      batchConflictDetails = [];

      for (let idx = 0; idx < currentList.length; idx++) {
        const localItem = currentList[idx];
        if (!localItem || localItem.id === undefined || localItem.id === null) {
          updatedList.push(localItem);
          continue;
        }
        const idStr = String(localItem.id);
        const isDirty = (localItem.synced === 0 || localItem.synced === false || localItem.synced === undefined || localItem.synced === null);

        // Check simulated partial failure
        if (options.simulatePartialFailure) {
          if (typeof options.simulatePartialFailure === 'function' && options.simulatePartialFailure(localItem, idx)) {
            throw new Error(`SIMULATED_SYNC_PARTIAL_FAILURE at record ID ${idStr}`);
          } else if (typeof options.simulatePartialFailure === 'number' && idx >= options.simulatePartialFailure) {
            throw new Error(`SIMULATED_SYNC_PARTIAL_FAILURE at index ${idx}`);
          } else if (options.simulatePartialFailure === true && idx >= Math.floor(currentList.length / 2)) {
            throw new Error(`SIMULATED_SYNC_PARTIAL_FAILURE midway at index ${idx}`);
          }
        }

        if (serverMap.has(idStr)) {
          processedServerIds.add(idStr);
          const serverItem = serverMap.get(idStr);

          if (!isDirty) {
            // Local is clean: server is authoritative for updates
            const updatedItem = {
              ...localItem,
              ...serverItem,
              synced: 1,
              is_synced: 1,
              syncedDate: nowIso,
              synced_date: nowIso,
            };
            updatedList.push(updatedItem);
            batchSyncedCount++;
            batchServerPulled++;
          } else {
            // Local is dirty: check for conflict
            const hasConflict = recordsDiffer(localItem, serverItem);
            if (!hasConflict) {
              // Same content, mark clean
              updatedList.push({
                ...localItem,
                synced: 1,
                is_synced: 1,
                syncedDate: nowIso,
                synced_date: nowIso,
              });
              batchSyncedCount++;
              batchLocalPushed++;
            } else {
              batchConflictCount++;
              const localTs = extractRecordTimestamp(localItem, options.timestampFields);
              const serverTs = extractRecordTimestamp(serverItem, options.timestampFields);

              let winner = 'server';
              if (options.forceLocal) {
                winner = 'local';
              } else if (options.forceServer) {
                winner = 'server';
              } else if (localTs > serverTs) {
                winner = 'local';
              } else if (serverTs > localTs) {
                winner = 'server';
              } else {
                winner = tieBreaker;
              }

              let resolvedItem;
              if (winner === 'local') {
                resolvedItem = preferFieldMerge ? { ...serverItem, ...localItem } : { ...localItem };
              } else {
                resolvedItem = preferFieldMerge ? { ...localItem, ...serverItem } : { ...serverItem };
              }

              resolvedItem.synced = 1;
              resolvedItem.is_synced = 1;
              resolvedItem.syncedDate = nowIso;
              resolvedItem.synced_date = nowIso;

              updatedList.push(resolvedItem);
              batchResolvedCount++;
              batchSyncedCount++;

              batchConflictDetails.push({
                id: idStr,
                winner,
                localTs,
                serverTs,
                reason: localTs > serverTs ? 'local_newer' : (serverTs > localTs ? 'server_newer' : 'identical_timestamp_tie'),
              });
            }
          }
        } else {
          // Local record not in server snapshot
          if (isDirty) {
            // Pushed to server
            updatedList.push({
              ...localItem,
              synced: 1,
              is_synced: 1,
              syncedDate: nowIso,
              synced_date: nowIso,
            });
            batchSyncedCount++;
            batchLocalPushed++;
          } else {
            updatedList.push(localItem);
          }
        }
      }

      // Add new server records that were not present locally
      for (const [sId, serverItem] of serverMap.entries()) {
        if (!processedServerIds.has(sId)) {
          const newItem = {
            ...serverItem,
            synced: 1,
            is_synced: 1,
            syncedDate: nowIso,
            synced_date: nowIso,
          };
          updatedList.push(newItem);
          batchSyncedCount++;
          batchServerPulled++;
        }
      }

      // Populate outer metrics upon successful preparation
      syncedCount = batchSyncedCount;
      conflictCount = batchConflictCount;
      resolvedCount = batchResolvedCount;
      localPushedCount = batchLocalPushed;
      serverPulledCount = batchServerPulled;

      return updatedList;
    });

    if (!mutationRes.success) {
      const errMsg = mutationRes.error instanceof Error ? mutationRes.error.message : String(mutationRes.error);
      errors.push(errMsg);
      return {
        success: false,
        syncedCount: 0,
        conflictCount: 0,
        resolvedCount: 0,
        errors,
        rolledBack: true,
      };
    }

    conflictDetails.push(...batchConflictDetails);

    return {
      success: true,
      syncedCount,
      conflictCount,
      resolvedCount,
      serverAddedCount: serverPulledCount,
      localPushedCount,
      errors,
      conflictDetails,
    };
  }

  // ============================================================================
  // REA-ITER-215: CRYPTOGRAPHIC PIN SECURITY & AUTO-LOCK INTEGRATION
  // ============================================================================

  /**
   * Returns the normalized security configuration from the authoritative store.
   * @returns {Object}
   */
  getSecurityConfig() {
    const store = this.getAuthoritativeState();
    if (securityService && typeof securityService.normalizeSecurityConfig === 'function') {
      return securityService.normalizeSecurityConfig(store?.securityConfig || { pinEnabled: store?.pinEnabled });
    }
    return store?.securityConfig || { pinEnabled: false, pinHash: '', salt: '' };
  }

  /**
   * Verifies an entered PIN against the stored cryptographic PBKDF2 hash.
   * Enforces progressive brute-force rate-limiting and persists attempt metrics.
   * @param {string} pin
   * @param {number} [now=Date.now()]
   * @returns {Promise<Object>}
   */
  async verifyAppPin(pin, now = Date.now()) {
    const currentCfg = this.getSecurityConfig();
    if (!securityService || typeof securityService.verifyPin !== 'function') {
      return { success: true, verified: true };
    }
    const result = securityService.verifyPin(pin, currentCfg, now);
    if (result.updatedConfig) {
      await this.mutateStore((latestStore) => ({
        ...latestStore,
        securityConfig: result.updatedConfig,
        pinEnabled: Boolean(result.updatedConfig.pinEnabled),
      }));
    }
    return result;
  }

  /**
   * Securely sets up or updates the application PIN with a fresh 16-byte random salt.
   * Plaintext PIN is never stored.
   * @param {string} pin
   * @param {Object} [options={}]
   * @returns {Promise<Object>}
   */
  async setAppPinSecure(pin, options = {}) {
    const currentCfg = this.getSecurityConfig();
    if (!securityService || typeof securityService.setupPin !== 'function') {
      return { success: false, error: 'SECURITY_SERVICE_UNAVAILABLE' };
    }
    const result = securityService.setupPin(currentCfg, pin, options);
    if (result.success && result.updatedConfig) {
      const mutateRes = await this.mutateStore((latestStore) => ({
        ...latestStore,
        appPin: '', // Always scrub plaintext PIN
        pinEnabled: true,
        securityConfig: result.updatedConfig,
      }));
      return { success: mutateRes.success, updatedConfig: result.updatedConfig, error: mutateRes.error };
    }
    return result;
  }

  /**
   * Changes the application PIN after verifying current credentials.
   * @param {string} currentPin
   * @param {string} newPin
   * @param {Object} [options={}]
   * @returns {Promise<Object>}
   */
  async changeAppPinSecure(currentPin, newPin, options = {}) {
    const currentCfg = this.getSecurityConfig();
    if (!securityService || typeof securityService.changePin !== 'function') {
      return { success: false, error: 'SECURITY_SERVICE_UNAVAILABLE' };
    }
    const result = securityService.changePin(currentCfg, currentPin, newPin, options);
    if (result.updatedConfig) {
      await this.mutateStore((latestStore) => ({
        ...latestStore,
        appPin: '',
        pinEnabled: Boolean(result.updatedConfig.pinEnabled),
        securityConfig: result.updatedConfig,
      }));
    }
    return result;
  }

  /**
   * Disables PIN protection after verifying current credentials.
   * @param {string} currentPin
   * @returns {Promise<Object>}
   */
  async disableAppPinSecure(currentPin) {
    const currentCfg = this.getSecurityConfig();
    if (!securityService || typeof securityService.disablePin !== 'function') {
      return { success: false, error: 'SECURITY_SERVICE_UNAVAILABLE' };
    }
    const result = securityService.disablePin(currentCfg, currentPin);
    if (result.updatedConfig) {
      await this.mutateStore((latestStore) => ({
        ...latestStore,
        appPin: '',
        pinEnabled: false,
        securityConfig: result.updatedConfig,
      }));
    }
    return result;
  }

  /**
   * Records user activity to refresh auto-lock timer.
   * @param {number} [now=Date.now()]
   * @returns {Promise<Object>}
   */
  async recordAppActivity(now = Date.now()) {
    const currentCfg = this.getSecurityConfig();
    if (securityService && typeof securityService.recordActivity === 'function') {
      const updated = securityService.recordActivity(currentCfg, now);
      if (this.currentStore) {
        this.currentStore.securityConfig = updated;
      }
      return updated;
    }
    return currentCfg;
  }

  /**
   * Records app backgrounding timestamp.
   * @param {number} [now=Date.now()]
   * @returns {Promise<Object>}
   */
  async recordAppBackgrounded(now = Date.now()) {
    const currentCfg = this.getSecurityConfig();
    if (securityService && typeof securityService.recordAppBackgrounded === 'function') {
      const updated = securityService.recordAppBackgrounded(currentCfg, now);
      if (this.currentStore) {
        this.currentStore.securityConfig = updated;
      }
      return updated;
    }
    return currentCfg;
  }

  /**
   * Evaluates auto-lock condition when app returns to foreground.
   * @param {number} [now=Date.now()]
   * @returns {Promise<Object>}
   */
  async recordAppForegrounded(now = Date.now()) {
    const currentCfg = this.getSecurityConfig();
    if (!securityService || typeof securityService.recordAppForegrounded !== 'function') {
      return { didAutoLock: false, updatedConfig: currentCfg };
    }
    const res = securityService.recordAppForegrounded(currentCfg, now);
    if (res.updatedConfig) {
      if (this.currentStore) {
        this.currentStore.securityConfig = res.updatedConfig;
      }
      if (res.didAutoLock) {
        await this.mutateStore((latestStore) => ({
          ...latestStore,
          securityConfig: res.updatedConfig,
        }));
      }
    }
    return res;
  }

  /**
   * Unlocks the app using a verified PIN.
   * @param {string} pin
   * @param {number} [now=Date.now()]
   * @returns {Promise<Object>}
   */
  async unlockAppWithPin(pin, now = Date.now()) {
    const verifyRes = await this.verifyAppPin(pin, now);
    if (verifyRes.verified) {
      const currentCfg = this.getSecurityConfig();
      const unlocked = securityService ? securityService.unlockApp(currentCfg, now) : { ...currentCfg, isLocked: false };
      await this.mutateStore((latestStore) => ({
        ...latestStore,
        securityConfig: unlocked,
      }));
      return { success: true, verified: true, isLocked: false };
    }
    return verifyRes;
  }

  /**
   * Unlocks the app using biometrics.
   * @param {string|null} [signature=null]
   * @returns {Promise<Object>}
   */
  async unlockAppWithBiometrics(signature = null) {
    const currentCfg = this.getSecurityConfig();
    if (!securityService || typeof securityService.authenticateWithBiometrics !== 'function') {
      return { success: false, verified: false, error: 'SECURITY_SERVICE_UNAVAILABLE' };
    }
    const authRes = securityService.authenticateWithBiometrics(currentCfg, signature);
    if (authRes.verified && authRes.updatedConfig) {
      await this.mutateStore((latestStore) => ({
        ...latestStore,
        securityConfig: authRes.updatedConfig,
      }));
    }
    return authRes;
  }

  /**
   * Gets current lockout status from store.
   * @param {number} [now=Date.now()]
   * @returns {Object}
   */
  getAppLockoutStatus(now = Date.now()) {
    const currentCfg = this.getSecurityConfig();
    if (securityService && typeof securityService.getLockoutStatus === 'function') {
      return securityService.getLockoutStatus(currentCfg, now);
    }
    return { isLockedOut: false, remainingSeconds: 0, remainingAttempts: 5 };
  }

  /**
   * Attaches an audio note metadata record to an entity (customer, supplier, tagada, transaction, general).
   * Persists atomically in the 'audioNotes' collection under writeQueue mutex.
   *
   * @param {object} audioNote - Audio note metadata parameters
   * @param {object} [options] - Options (businessId, etc.)
   * @returns {Promise<{ success: boolean, audioNote?: object, error?: any }>}
   */
  async attachAudioNote(audioNote, options = {}) {
    if (!audioNote || typeof audioNote !== 'object') {
      return { success: false, error: new Error('Audio note must be an object') };
    }

    const bizId = options.businessId || audioNote.businessId || this.currentStore?.activeBusinessId || '1';
    let normalizedNote;
    try {
      if (audioNoteService && typeof audioNoteService.createAudioNoteMetadata === 'function') {
        normalizedNote = audioNoteService.createAudioNoteMetadata({
          ...audioNote,
          businessId: bizId,
        });
      } else {
        normalizedNote = {
          ...audioNote,
          id: audioNote.id || `audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          businessId: String(bizId),
          createdAt: audioNote.createdAt || new Date().toISOString(),
        };
      }
    } catch (validationErr) {
      return { success: false, error: validationErr };
    }

    const res = await this.mutateCollection('audioNotes', (list) => {
      const existingIndex = list.findIndex((n) => n.id === normalizedNote.id);
      if (existingIndex >= 0) {
        const updated = [...list];
        updated[existingIndex] = normalizedNote;
        return updated;
      }
      return [...list, normalizedNote];
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, audioNote: normalizedNote };
  }

  /**
   * Retrieves all audio notes attached to a specific entity for the current or specified business.
   *
   * @param {string} entityType - 'customer' | 'supplier' | 'tagada' | 'transaction' | 'general'
   * @param {string|number} entityId - Entity identifier
   * @param {string|number} [businessId=null] - Scoped business ID
   * @returns {Array<object>} Matching audio notes
   */
  getAudioNotesForEntity(entityType, entityId, businessId = null) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.audioNotes) ? store.audioNotes : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const cleanType = String(entityType || '').toLowerCase();
    const cleanId = String(entityId || '');

    return list.filter((note) => {
      if (!note) return false;
      const noteBizId = String(note.businessId || '1');
      return noteBizId === targetBizId &&
             String(note.entityType).toLowerCase() === cleanType &&
             String(note.entityId) === cleanId;
    });
  }

  /**
   * Retrieves all audio notes scoped to a specific business.
   *
   * @param {string|number} [businessId=null] - Business ID
   * @returns {Array<object>} All audio notes for the business
   */
  getAudioNotesForBusiness(businessId = null) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.audioNotes) ? store.audioNotes : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    return list.filter((note) => {
      if (!note) return false;
      const noteBizId = String(note.businessId || '1');
      return noteBizId === targetBizId;
    });
  }

  /**
   * Deletes an audio note by ID and safely unlinks its underlying audio file.
   *
   * @param {string} audioNoteId - ID of the audio note to delete
   * @param {object} [options] - Options (deleteFile: boolean, fileSystemAdapter)
   * @returns {Promise<{ success: boolean, deletedNote?: object, fileDeleted?: boolean, error?: any }>}
   */
  async deleteAudioNote(audioNoteId, options = {}) {
    if (!audioNoteId) {
      return { success: false, error: new Error('audioNoteId is required') };
    }

    let deletedNote = null;
    const res = await this.mutateCollection('audioNotes', (list) => {
      const target = list.find((n) => n.id === audioNoteId);
      if (target) {
        deletedNote = target;
        return list.filter((n) => n.id !== audioNoteId);
      }
      return list;
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    let fileDeleted = false;
    if (deletedNote && options.deleteFile !== false && deletedNote.fileUri) {
      if (audioNoteService && typeof audioNoteService.deleteAudioFile === 'function') {
        const delRes = await audioNoteService.deleteAudioFile(deletedNote.fileUri, options.fileSystemAdapter);
        fileDeleted = Boolean(delRes.deleted);
      }
    }

    return {
      success: true,
      deletedNote,
      fileDeleted,
    };
  }

  /**
   * Deletes all audio notes associated with an entity and unlinks their files.
   *
   * @param {string} entityType - 'customer' | 'supplier' | 'tagada' | 'transaction'
   * @param {string|number} entityId - Target entity identifier
   * @param {string|number} [businessId=null] - Scoped business ID
   * @param {object} [options] - Options (deleteFile, fileSystemAdapter)
   * @returns {Promise<{ success: boolean, deletedCount: number, deletedNotes: Array<object> }>}
   */
  async deleteAudioNotesForEntity(entityType, entityId, businessId = null, options = {}) {
    const targetBizId = String(businessId || this.currentStore?.activeBusinessId || '1');
    const cleanType = String(entityType || '').toLowerCase();
    const cleanId = String(entityId || '');

    let deletedNotes = [];
    const res = await this.mutateCollection('audioNotes', (list) => {
      const remaining = [];
      for (const note of list) {
        const noteBizId = String(note?.businessId || '1');
        if (noteBizId === targetBizId &&
            String(note?.entityType).toLowerCase() === cleanType &&
            String(note?.entityId) === cleanId) {
          deletedNotes.push(note);
        } else {
          remaining.push(note);
        }
      }
      return remaining;
    });

    if (!res.success) {
      return { success: false, deletedCount: 0, deletedNotes: [], error: res.error };
    }

    if (options.deleteFile !== false && audioNoteService && typeof audioNoteService.deleteAudioFile === 'function') {
      for (const note of deletedNotes) {
        if (note && note.fileUri) {
          try {
            await audioNoteService.deleteAudioFile(note.fileUri, options.fileSystemAdapter);
          } catch (_) {}
        }
      }
    }

    return {
      success: true,
      deletedCount: deletedNotes.length,
      deletedNotes,
    };
  }

  /**
   * Cascades customer/account deletion: purges account, journals, cash entries, and associated audio notes.
   *
   * @param {string|number} accountId - ID of account to delete
   * @param {string|number} [businessId=null] - Scoped business ID
   * @param {object} [options] - Options (deleteFile: boolean, fileSystemAdapter)
   * @returns {Promise<{ success: boolean, deletedAccountId?: string, deletedJournalsCount?: number, deletedAudioNotesCount?: number, error?: any }>}
   */
  async deleteAccountCascade(accountId, businessId = null, options = {}) {
    if (!accountId) return { success: false, error: new Error('accountId is required') };
    const targetAccId = String(accountId);
    const targetBizId = String(businessId || this.currentStore?.activeBusinessId || '1');

    let purgedAudioNotes = [];
    let purgedReceiptImages = [];
    let purgedJournalsCount = 0;

    const res = await this.mutateStore((latestStore) => {
      const getBizId = (item) => String(item?.businessId !== undefined && item?.businessId !== null ? item.businessId : (item?.business_id !== undefined && item?.business_id !== null ? item.business_id : '1'));

      const curAccounts = latestStore.accounts || [];
      const curJournals = latestStore.journals || [];
      const curCash = latestStore.cashEntries || [];
      const curAudio = latestStore.audioNotes || [];

      // Find journals to remove
      const accTxnIds = curJournals
        .filter((j) => String(j.accountId) === targetAccId && getBizId(j) === targetBizId)
        .map((j) => String(j.id));
      purgedJournalsCount = accTxnIds.length;

      // Find audio notes to remove (customers, suppliers, or tagada logs for this account)
      purgedAudioNotes = curAudio.filter((a) => {
        const biz = getBizId(a);
        const isEntityMatch = (a.entityType === 'customer' || a.entityType === 'supplier' || a.entityType === 'tagada') &&
                              String(a.entityId) === targetAccId;
        return biz === targetBizId && isEntityMatch;
      });

      // Find receipt images to remove (attached to any of the purged journals for this account)
      const curReceipts = latestStore.receiptImages || [];
      purgedReceiptImages = curReceipts.filter((r) => {
        const biz = getBizId(r);
        return biz === targetBizId && accTxnIds.includes(String(r.journalId));
      });

      // Find voucher print logs to remove (attached to any of the purged journals or this account)
      const curBanglaQr = latestStore.banglaQrTransactions || [];
        const purgedBanglaQr = curBanglaQr.filter((tx) => {
          const biz = getBizId(tx);
          const matchesAccount = tx.accountId && String(tx.accountId) === targetAccId;
          return biz === targetBizId && matchesAccount;
        });
        const updatedBanglaQr = curBanglaQr.filter((tx) => !purgedBanglaQr.includes(tx));

        const curVouchers = latestStore.voucherPrintLogs || [];
      const purgedVoucherLogs = curVouchers.filter((v) => {
        const biz = getBizId(v);
        const matchesJournal = v.journalId && accTxnIds.includes(String(v.journalId));
        const matchesAccount = v.accountId && String(v.accountId) === targetAccId;
        return biz === targetBizId && (matchesJournal || matchesAccount);
      });
      const updatedVouchers = curVouchers.filter((v) => !purgedVoucherLogs.some((p) => p.id === v.id));

      const updatedAccounts = curAccounts.filter((a) => !(String(a.id) === targetAccId && getBizId(a) === targetBizId));
      const updatedJournals = curJournals.filter((j) => !(String(j.accountId) === targetAccId && getBizId(j) === targetBizId));
      const updatedCash = curCash.filter((c) => !accTxnIds.includes(String(c.transactionId || c.txnId || c.id)));
      const updatedAudio = curAudio.filter((a) => !purgedAudioNotes.some((p) => p.id === a.id));
      const updatedReceipts = curReceipts.filter((r) => !purgedReceiptImages.some((p) => p.id === r.id));
      const curTagadaLogs = latestStore.tagada_log || latestStore.tagadaLogs || [];
      const updatedTagadaLogs = curTagadaLogs.filter((t) => {
        const accId = String(t.accountId !== undefined && t.accountId !== null ? t.accountId : (t.account_id !== undefined && t.account_id !== null ? t.account_id : ''));
        return !(accId === targetAccId && getBizId(t) === targetBizId);
      });

      return {
        ...latestStore,
        accounts: updatedAccounts,
        journals: updatedJournals,
        cashEntries: updatedCash,
        audioNotes: updatedAudio,
        receiptImages: updatedReceipts,
        tagadaLogs: updatedTagadaLogs,
        tagada_log: updatedTagadaLogs,
        voucherPrintLogs: updatedVouchers,
        banglaQrTransactions: updatedBanglaQr,
      };
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    // Clean up audio files on disk
    if (options.deleteFile !== false && audioNoteService && typeof audioNoteService.deleteAudioFile === 'function') {
      for (const note of purgedAudioNotes) {
        if (note && note.fileUri) {
          try {
            await audioNoteService.deleteAudioFile(note.fileUri, options.fileSystemAdapter);
          } catch (_) {}
        }
      }
    }

    // Clean up receipt files on disk
    if (options.deleteFile !== false && receiptImageService && typeof receiptImageService.deleteReceiptFile === 'function') {
      for (const r of purgedReceiptImages) {
        try {
          if (r && r.fileUri) await receiptImageService.deleteReceiptFile(r.fileUri, options.fileSystemAdapter);
          if (r && r.thumbnailUri) await receiptImageService.deleteReceiptFile(r.thumbnailUri, options.fileSystemAdapter);
        } catch (_) {}
      }
    }

    return {
      success: true,
      deletedAccountId: targetAccId,
      deletedJournalsCount: purgedJournalsCount,
      deletedAudioNotesCount: purgedAudioNotes.length,
      deletedReceiptImagesCount: purgedReceiptImages.length,
    };
  }

  /**
   * Scans audio directory and cleans up orphaned audio files not referenced by current store.
   *
   * @param {string} [directoryPath=null] - Directory path
   * @param {object} [fileSystemAdapter=null] - Filesystem adapter
   * @returns {Promise<object>} Garbage collection summary report
   */
  async cleanOrphanedAudioFiles(directoryPath = null, fileSystemAdapter = null) {
    const allNotes = Array.isArray(this.currentStore?.audioNotes) ? this.currentStore.audioNotes : [];
    if (audioNoteService && typeof audioNoteService.cleanOrphanedAudioFiles === 'function') {
      return audioNoteService.cleanOrphanedAudioFiles(allNotes, directoryPath, fileSystemAdapter);
    }
    return {
      scannedCount: 0,
      referencedCount: allNotes.length,
      orphanedCount: 0,
      deletedCount: 0,
      bytesReclaimed: 0,
      errors: [],
    };
  }

  /**
   * Returns aggregate audio storage statistics for the business.
   *
   * @param {string|number} [businessId=null]
   * @param {object} [options]
   * @returns {object}
   */
  getAudioStorageMetrics(businessId = null, options = {}) {
    const list = this.getAudioNotesForBusiness(businessId);
    if (audioNoteService && typeof audioNoteService.calculateAudioStorageUsage === 'function') {
      return audioNoteService.calculateAudioStorageUsage(list, options);
    }
    const totalBytes = list.reduce((sum, n) => sum + (Number(n?.fileSizeBytes) || 0), 0);
    const totalDurationMs = list.reduce((sum, n) => sum + (Number(n?.durationMs) || 0), 0);
    return {
      totalCount: list.length,
      totalBytes,
      totalDurationMs,
      formattedBytes: `${totalBytes} B`,
      formattedDurationBn: '০০:০০',
      formattedDurationEn: '00:00',
    };
  }

  /**
   * Attaches a receipt image metadata record to a transaction/journal.
   * Persists atomically in the 'receiptImages' collection under writeQueue mutex.
   *
   * @param {object} receiptImage - Receipt image metadata parameters
   * @param {object} [options] - Options (businessId, etc.)
   * @returns {Promise<{ success: boolean, receiptImage?: object, error?: any }>}
   */
  async attachReceiptImage(receiptImage, options = {}) {
    if (!receiptImage || typeof receiptImage !== 'object') {
      return { success: false, error: new Error('Receipt image must be an object') };
    }

    const bizId = options.businessId || receiptImage.businessId || receiptImage.business_id || this.currentStore?.activeBusinessId || '1';
    let normalizedReceipt;
    try {
      if (receiptImageService && typeof receiptImageService.createReceiptImageMetadata === 'function') {
        normalizedReceipt = receiptImageService.createReceiptImageMetadata({
          ...receiptImage,
          businessId: bizId,
        });
      } else {
        const jId = receiptImage.journalId || receiptImage.journal_id;
        if (!jId) throw new Error('journalId is required');
        normalizedReceipt = {
          ...receiptImage,
          id: receiptImage.id || `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          journalId: String(jId),
          businessId: String(bizId),
          createdAt: receiptImage.createdAt || new Date().toISOString(),
        };
      }
    } catch (validationErr) {
      return { success: false, error: validationErr };
    }

    const res = await this.mutateCollection('receiptImages', (list) => {
      const existingIndex = list.findIndex((r) => r.id === normalizedReceipt.id);
      if (existingIndex >= 0) {
        const updated = [...list];
        updated[existingIndex] = normalizedReceipt;
        return updated;
      }
      return [...list, normalizedReceipt];
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, receiptImage: normalizedReceipt };
  }

  /**
   * Retrieves all receipt images attached to a specific journal/transaction for the business.
   *
   * @param {string|number} journalId - Transaction/journal ID
   * @param {string|number} [businessId=null] - Scoped business ID
   * @returns {Array<object>} Matching receipt images
   */
  getReceiptImagesForJournal(journalId, businessId = null) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.receiptImages) ? store.receiptImages : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const cleanJournalId = String(journalId !== undefined && journalId !== null ? journalId : '');

    return list.filter((r) => {
      if (!r) return false;
      const rBizId = String(r.businessId || r.business_id || '1');
      const rJournalId = String(r.journalId !== undefined && r.journalId !== null ? r.journalId : (r.journal_id || ''));
      return rBizId === targetBizId && rJournalId === cleanJournalId;
    });
  }

  /**
   * Retrieves all receipt images scoped to a specific business.
   *
   * @param {string|number} [businessId=null] - Business ID
   * @returns {Array<object>} All receipt images for the business
   */
  getReceiptImagesForBusiness(businessId = null) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.receiptImages) ? store.receiptImages : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    return list.filter((r) => {
      if (!r) return false;
      const rBizId = String(r.businessId || r.business_id || '1');
      return rBizId === targetBizId;
    });
  }

  /**
   * Deletes a receipt image by ID and safely unlinks its underlying image files.
   *
   * @param {string} receiptImageId - ID of the receipt image to delete
   * @param {object} [options] - Options (deleteFile: boolean, fileSystemAdapter)
   * @returns {Promise<{ success: boolean, deletedReceipt?: object, fileDeleted?: boolean, error?: any }>}
   */
  async deleteReceiptImage(receiptImageId, options = {}) {
    if (!receiptImageId) {
      return { success: false, error: new Error('receiptImageId is required') };
    }

    let deletedReceipt = null;
    const res = await this.mutateCollection('receiptImages', (list) => {
      const target = list.find((r) => r.id === receiptImageId);
      if (target) {
        deletedReceipt = target;
        return list.filter((r) => r.id !== receiptImageId);
      }
      return list;
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    let fileDeleted = false;
    if (deletedReceipt && options.deleteFile !== false) {
      if (receiptImageService && typeof receiptImageService.deleteReceiptFile === 'function') {
        if (deletedReceipt.fileUri) {
          const delRes = await receiptImageService.deleteReceiptFile(deletedReceipt.fileUri, options.fileSystemAdapter);
          fileDeleted = Boolean(delRes.deleted);
        }
        if (deletedReceipt.thumbnailUri) {
          await receiptImageService.deleteReceiptFile(deletedReceipt.thumbnailUri, options.fileSystemAdapter);
        }
      }
    }

    return {
      success: true,
      deletedReceipt,
      fileDeleted,
    };
  }

  /**
   * Deletes all receipt images associated with a journal and unlinks their files.
   *
   * @param {string|number} journalId - Target journal ID
   * @param {string|number} [businessId=null] - Scoped business ID
   * @param {object} [options] - Options (deleteFile, fileSystemAdapter)
   * @returns {Promise<{ success: boolean, deletedCount: number, deletedReceipts: Array<object> }>}
   */
  async deleteReceiptImagesForJournal(journalId, businessId = null, options = {}) {
    const targetBizId = String(businessId || this.currentStore?.activeBusinessId || '1');
    const cleanJournalId = String(journalId !== undefined && journalId !== null ? journalId : '');

    let deletedReceipts = [];
    const res = await this.mutateCollection('receiptImages', (list) => {
      const remaining = [];
      for (const r of list) {
        const rBizId = String(r?.businessId || r?.business_id || '1');
        const rJournalId = String(r?.journalId !== undefined && r?.journalId !== null ? r.journalId : (r?.journal_id || ''));
        if (rBizId === targetBizId && rJournalId === cleanJournalId) {
          deletedReceipts.push(r);
        } else {
          remaining.push(r);
        }
      }
      return remaining;
    });

    if (!res.success) {
      return { success: false, deletedCount: 0, deletedReceipts: [], error: res.error };
    }

    if (options.deleteFile !== false && receiptImageService && typeof receiptImageService.deleteReceiptFile === 'function') {
      for (const r of deletedReceipts) {
        try {
          if (r?.fileUri) await receiptImageService.deleteReceiptFile(r.fileUri, options.fileSystemAdapter);
          if (r?.thumbnailUri) await receiptImageService.deleteReceiptFile(r.thumbnailUri, options.fileSystemAdapter);
        } catch (_) {}
      }
    }

    return {
      success: true,
      deletedCount: deletedReceipts.length,
      deletedReceipts,
    };
  }

  /**
   * Scans receipt directory and cleans up orphaned receipt images not referenced by current store.
   *
   * @param {string} [directoryPath=null] - Directory path
   * @param {object} [fileSystemAdapter=null] - Filesystem adapter
   * @returns {Promise<object>} Garbage collection summary report
   */
  async cleanOrphanedReceiptImages(directoryPath = null, fileSystemAdapter = null) {
    const allReceipts = Array.isArray(this.currentStore?.receiptImages) ? this.currentStore.receiptImages : [];
    if (receiptImageService && typeof receiptImageService.cleanOrphanedReceiptImages === 'function') {
      return receiptImageService.cleanOrphanedReceiptImages(allReceipts, directoryPath, fileSystemAdapter);
    }
    return {
      scannedCount: 0,
      referencedCount: allReceipts.length,
      orphanedCount: 0,
      deletedCount: 0,
      bytesReclaimed: 0,
      deletedFiles: [],
      errors: [],
    };
  }

  /**
   * Returns aggregate receipt storage statistics for the business.
   *
   * @param {string|number} [businessId=null]
   * @param {object} [options]
   * @returns {object}
   */
  getReceiptStorageMetrics(businessId = null, options = {}) {
    const list = this.getReceiptImagesForBusiness(businessId);
    if (receiptImageService && typeof receiptImageService.calculateReceiptStorageUsage === 'function') {
      return receiptImageService.calculateReceiptStorageUsage(list, options);
    }
    const totalBytes = list.reduce((sum, r) => sum + (Number(r?.fileSizeBytes !== undefined ? r.fileSizeBytes : r?.fileSize) || 0), 0);
    return {
      totalCount: list.length,
      totalBytes,
      averageFileSizeBytes: list.length > 0 ? Math.round(totalBytes / list.length) : 0,
    };
  }

  /**
   * Logs a voucher print, export, or share event.
   * Persists atomically in the 'voucherPrintLogs' collection under writeQueue mutex.
   *
   * @param {object} printEvent - Voucher print/export event data
   * @param {object} [options] - Options (businessId, etc.)
   * @returns {Promise<{ success: boolean, log?: object, error?: any }>}
   */
  async logVoucherPrintExport(printEvent, options = {}) {
    if (!printEvent || typeof printEvent !== 'object') {
      return { success: false, error: new Error('Print event must be an object') };
    }

    const bizId = String(options.businessId || printEvent.businessId || printEvent.business_id || this.currentStore?.activeBusinessId || '1');
    const normalizedLog = {
      id: printEvent.id || `vpl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      voucherNo: String(printEvent.voucherNo || printEvent.voucherNumber || 'VCH-001'),
      voucherType: String(printEvent.voucherType || printEvent.type || 'CASH_MEMO'),
      format: String(printEvent.format || 'pdf'),
      destination: String(printEvent.destination || 'print'),
      status: String(printEvent.status || 'success'),
      timestamp: printEvent.timestamp || new Date().toISOString(),
      businessId: bizId,
      journalId: printEvent.journalId !== undefined && printEvent.journalId !== null ? String(printEvent.journalId) : null,
      accountId: printEvent.accountId !== undefined && printEvent.accountId !== null ? String(printEvent.accountId) : null,
      printBytes: Number(printEvent.printBytes || printEvent.byteLength || 0),
      metadata: typeof printEvent.metadata === 'object' && printEvent.metadata !== null ? printEvent.metadata : {},
    };

    const res = await this.mutateCollection('voucherPrintLogs', (list) => {
      const existingIndex = list.findIndex((l) => l.id === normalizedLog.id);
      if (existingIndex >= 0) {
        const updated = [...list];
        updated[existingIndex] = normalizedLog;
        return updated;
      }
      return [...list, normalizedLog];
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, log: normalizedLog };
  }

  /**
   * Retrieves all voucher print logs matching a voucher number or journal ID for a business.
   *
   * @param {string|number} voucherNoOrJournalId - Voucher number or journal ID
   * @param {string|number} [businessId=null] - Scoped business ID
   * @returns {Array<object>} Matching voucher print logs
   */
  getVoucherPrintLogs(voucherNoOrJournalId, businessId = null) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.voucherPrintLogs) ? store.voucherPrintLogs : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const targetQuery = String(voucherNoOrJournalId !== undefined && voucherNoOrJournalId !== null ? voucherNoOrJournalId : '');

    return list.filter((log) => {
      if (!log) return false;
      const logBiz = String(log.businessId || log.business_id || '1');
      if (logBiz !== targetBizId) return false;
      return String(log.voucherNo || '') === targetQuery || String(log.journalId || '') === targetQuery;
    });
  }

  /**
   * Retrieves all voucher print logs scoped to a specific business.
   *
   * @param {string|number} [businessId=null] - Business ID
   * @returns {Array<object>} All voucher print logs for the business
   */
  getVoucherPrintLogsForBusiness(businessId = null) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.voucherPrintLogs) ? store.voucherPrintLogs : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    return list.filter((log) => {
      if (!log) return false;
      const logBiz = String(log.businessId || log.business_id || '1');
      return logBiz === targetBizId;
    });
  }

  /**
   * Deletes a specific voucher print log by ID.
   *
   * @param {string} logId - Voucher print log ID
   * @returns {Promise<{ success: boolean, deletedLog?: object, error?: any }>}
   */
  async deleteVoucherPrintLog(logId) {
    if (!logId) {
      return { success: false, error: new Error('logId is required') };
    }

    let deletedLog = null;
    const res = await this.mutateCollection('voucherPrintLogs', (list) => {
      const target = list.find((l) => l.id === logId);
      if (target) {
        deletedLog = target;
        return list.filter((l) => l.id !== logId);
      }
      return list;
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, deletedLog };
  }
  /**
   * Logs a Bangla QR / Super QR payment transaction.
   * Persists atomically in the 'banglaQrTransactions' collection under writeQueue mutex.
   *
   * @param {object} txnData - QR payment transaction data
   * @param {object} [options] - Options (businessId, etc.)
   * @returns {Promise<{ success: boolean, transaction?: object, error?: any }>}
   */
  async logBanglaQrTransaction(txnData, options = {}) {
    if (!txnData || typeof txnData !== 'object') {
      return { success: false, error: 'INVALID_TRANSACTION_PAYLOAD' };
    }

    const businessId = String(options.businessId || txnData.businessId || this.currentStore?.activeBusinessId || '1');
    const id = txnData.id || ('bqr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
    const nowIso = txnData.createdAt || txnData.txnTime || new Date().toISOString();

    const normalizedTxn = {
      ...txnData,
      id,
      businessId,
      business_id: businessId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const res = await this.mutateCollection('banglaQrTransactions', (list) => {
      const existingIndex = list.findIndex((l) => l.id === normalizedTxn.id);
      if (existingIndex >= 0) {
        const updated = [...list];
        updated[existingIndex] = normalizedTxn;
        return updated;
      }
      return [normalizedTxn, ...list];
    });

    if (res.success) {
      return { success: true, transaction: normalizedTxn };
    }
    return { success: false, error: res.error };
  }

  /**
   * Retrieves all Bangla QR transactions for a given business.
   *
   * @param {string|number} [businessId=null] - Business ID
   * @returns {Array<object>} All Bangla QR transactions for the business
   */
  getBanglaQrTransactions(businessId = null) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.banglaQrTransactions) ? store.banglaQrTransactions : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    return list.filter((tx) => {
      if (!tx) return false;
      const txBiz = String(tx.businessId || tx.business_id || '1');
      return txBiz === targetBizId;
    });
  }

  /**
   * Retrieves a single Bangla QR transaction by its transaction number or ID.
   *
   * @param {string} txnNumberOrId - Transaction number or ID
   * @param {string|number} [businessId=null] - Business ID
   * @returns {object|null} Matching transaction or null
   */
  getBanglaQrTransactionByTxnNumber(txnNumberOrId, businessId = null) {
    const list = this.getBanglaQrTransactions(businessId);
    const target = String(txnNumberOrId || '');
    return list.find((tx) => tx && (tx.id === target || tx.transactionNumber === target || tx.invoiceNo === target)) || null;
  }

  /**
   * Logs a TallyPay Add Money top-up transaction atomically.
   */
  async logAddMoneyTransaction(txnData, options = {}) {
    if (!txnData || typeof txnData !== 'object') {
      return { success: false, error: 'INVALID_TRANSACTION_PAYLOAD' };
    }

    const businessId = String(options.businessId || txnData.businessId || this.currentStore?.activeBusinessId || '1');
    const id = txnData.id || ('w_add_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
    const nowIso = txnData.createdAt || new Date().toISOString();

    const normalizedTxn = {
      ...txnData,
      id,
      businessId,
      business_id: businessId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const res = await this.mutateCollection('tallyPayAddMoneyTxns', (list) => {
      const existingIndex = list.findIndex((l) => l.id === normalizedTxn.id);
      if (existingIndex >= 0) {
        const updated = [...list];
        updated[existingIndex] = normalizedTxn;
        return updated;
      }
      return [normalizedTxn, ...list];
    });

    if (res.success) {
      return { success: true, transaction: normalizedTxn };
    }
    return { success: false, error: res.error };
  }

  /**
   * Retrieves all TallyPay Add Money transactions for a given business.
   */
  getAddMoneyTransactions(businessId = null) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.tallyPayAddMoneyTxns) ? store.tallyPayAddMoneyTxns : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    return list.filter((tx) => {
      if (!tx) return false;
      const txBiz = String(tx.businessId || tx.business_id || '1');
      return txBiz === targetBizId;
    });
  }

  /**
   * Logs a Soundbox audio notification event.
   */
  async logSoundboxNotification(eventData, options = {}) {
    if (!eventData || typeof eventData !== 'object') {
      return { success: false, error: 'INVALID_EVENT_PAYLOAD' };
    }

    const businessId = String(options.businessId || eventData.businessId || this.currentStore?.activeBusinessId || '1');
    const id = eventData.id || ('sb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
    const nowIso = eventData.timestamp || eventData.createdAt || new Date().toISOString();

    const normalizedEvent = {
      ...eventData,
      id,
      businessId,
      business_id: businessId,
      timestamp: nowIso,
      createdAt: nowIso,
    };

    const res = await this.mutateCollection('soundboxLogs', (list) => {
      const existingIndex = list.findIndex((l) => l.id === normalizedEvent.id);
      if (existingIndex >= 0) {
        const updated = [...list];
        updated[existingIndex] = normalizedEvent;
        return updated;
      }
      return [normalizedEvent, ...list];
    });

    if (res.success) {
      return { success: true, event: normalizedEvent };
    }
    return { success: false, error: res.error };
  }

  /**
   * Retrieves Soundbox notification history for a given business.
   */
  getSoundboxNotifications(businessId = null) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.soundboxLogs) ? store.soundboxLogs : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    return list.filter((e) => {
      if (!e) return false;
      const eBiz = String(e.businessId || e.business_id || '1');
      return eBiz === targetBizId;
    });
  }

  /**
   * Persists BLE Soundbox device configuration for a specific business under writeQueue mutex.
   *
   * @param {object} settings - Device settings (id, macAddress, name, volumeLevel, etc.)
   * @param {object} [options={}] - Options (businessId)
   * @returns {Promise<{ success: boolean, settings?: object, error?: string }>}
   */
  async saveSoundboxDeviceSettings(settings, options = {}) {
    if (!settings || typeof settings !== 'object') {
      return { success: false, error: 'INVALID_SETTINGS_PAYLOAD' };
    }
    const businessId = String(options.businessId || settings.businessId || settings.business_id || this.currentStore?.activeBusinessId || '1');
    const nowIso = new Date().toISOString();

    const normalizedSettings = {
      ...settings,
      businessId,
      business_id: businessId,
      updatedAt: nowIso,
    };

    const res = await this.mutateStore((prevStore) => {
      const prevMap = prevStore.soundboxSettings || prevStore.soundboxDeviceSettings || {};
      const updatedMap = {
        ...prevMap,
        [businessId]: normalizedSettings,
      };
      return {
        ...prevStore,
        soundboxSettings: updatedMap,
        soundboxDeviceSettings: updatedMap,
      };
    });

    if (res && res.success !== false) {
      return { success: true, settings: normalizedSettings };
    }
    return { success: false, error: res?.error || 'MUTATION_FAILED' };
  }

  /**
   * Retrieves persisted BLE Soundbox device configuration for a given business.
   *
   * @param {string|null} [businessId=null]
   * @returns {object|null}
   */
  getSoundboxDeviceSettings(businessId = null) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const settingsMap = store.soundboxSettings || store.soundboxDeviceSettings || {};
    return settingsMap[targetBizId] || null;
  }

  /**
   * Logs a Soundbox telemetry event (battery status, charging, RSSI, disconnects).
   *
   * @param {object} telemetryEvent - Telemetry payload
   * @param {object} [options={}] - Options (businessId)
   * @returns {Promise<{ success: boolean, event?: object, error?: string }>}
   */
  async logSoundboxTelemetry(telemetryEvent, options = {}) {
    if (!telemetryEvent || typeof telemetryEvent !== 'object') {
      return { success: false, error: 'INVALID_TELEMETRY_PAYLOAD' };
    }
    const businessId = String(options.businessId || telemetryEvent.businessId || telemetryEvent.business_id || this.currentStore?.activeBusinessId || '1');
    const id = telemetryEvent.id || ('sbt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
    const nowIso = telemetryEvent.timestamp || telemetryEvent.createdAt || new Date().toISOString();

    const normalizedEvent = {
      ...telemetryEvent,
      id,
      businessId,
      business_id: businessId,
      type: telemetryEvent.type || 'telemetry',
      timestamp: nowIso,
      createdAt: nowIso,
    };

    const res = await this.mutateCollection('soundboxLogs', (list) => {
      return [normalizedEvent, ...list];
    });

    if (res.success) {
      return { success: true, event: normalizedEvent };
    }
    return { success: false, error: res.error };
  }

  /**
   * Retrieves Soundbox telemetry history for a given business.
   *
   * @param {string|null} [businessId=null]
   * @returns {Array<object>}
   */
  getSoundboxTelemetry(businessId = null) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.soundboxLogs) ? store.soundboxLogs : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    return list.filter((e) => {
      if (!e) return false;
      const eBiz = String(e.businessId || e.business_id || '1');
      const isTelemetry = e.batteryLevel !== undefined || e.type === 'telemetry' || (e.id && String(e.id).startsWith('sbt_'));
      return eBiz === targetBizId && isTelemetry;
    });
  }

  /**
   * Aggregates and retrieves digital inflow transactions across Bangla QR, TallyPay Add Money,
   * and digital journal entries for a given business with multi-tenant isolation.
   *
   * @param {string|number} [businessId=null] - Target business ID
   * @param {object} [filterOptions={}] - Optional filters (startDate, endDate, period, channelId, status, limit)
   * @returns {Array<object>} Unified array of normalized digital inflow transactions sorted descending by date/time
   */
  getDigitalInflowTransactions(businessId = null, filterOptions = {}) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    const results = [];
    const seenTxnIds = new Set();

    // 1. Bangla QR Transactions
    const banglaQrList = Array.isArray(store.banglaQrTransactions) ? store.banglaQrTransactions : [];
    for (const bTx of banglaQrList) {
      if (!bTx) continue;
      const bBiz = String(bTx.businessId || bTx.business_id || '1');
      if (bBiz !== targetBizId) continue;

      const numAmt = Number(bTx.amount !== undefined && bTx.amount !== null ? bTx.amount : (bTx.amountPaisa ? bTx.amountPaisa / 100 : 0));
      const paisa = bTx.amountPaisa !== undefined && bTx.amountPaisa !== null
        ? Math.round(Number(bTx.amountPaisa))
        : Math.round(numAmt * 100);
      const feePaisa = bTx.feePaisa !== undefined && bTx.feePaisa !== null
        ? Math.round(Number(bTx.feePaisa))
        : Math.round(Number(bTx.fee || 0) * 100);

      const ts = extractRecordTimestamp(bTx) || Date.now();
      const isoDate = (bTx.date && typeof bTx.date === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(bTx.date.trim()))
        ? bTx.date.trim()
        : (new Date(ts).toISOString().slice(0, 10));

      const normTx = {
        id: String(bTx.id || ('bqr_' + ts + '_' + Math.random().toString(36).substring(2, 7))),
        source: 'bangla_qr',
        channelId: bTx.channelId || bTx.appId || 'bangla_qr',
        channel: bTx.channelId || bTx.appId || 'bangla_qr',
        amount: numAmt,
        amountPaisa: paisa,
        fee: feePaisa / 100,
        feePaisa,
        type: 'CREDIT',
        status: bTx.status || 'SUCCESS',
        timestamp: ts,
        date: isoDate,
        createdAt: bTx.createdAt || new Date(ts).toISOString(),
        businessId: targetBizId,
        fromName: bTx.fromName || bTx.customerName || '',
        fromPhone: bTx.fromPhone || bTx.customerPhone || '',
        transactionNumber: bTx.transactionNumber || bTx.invoiceNo || '',
        ref: bTx.reference || bTx.ref || '',
      };

      results.push(normTx);
      if (normTx.id) seenTxnIds.add(normTx.id);
      if (bTx.transactionNumber) seenTxnIds.add(bTx.transactionNumber);
    }

    // 2. TallyPay Add Money Transactions
    const addMoneyList = Array.isArray(store.tallyPayAddMoneyTxns) ? store.tallyPayAddMoneyTxns : [];
    for (const aTx of addMoneyList) {
      if (!aTx) continue;
      const aBiz = String(aTx.businessId || aTx.business_id || '1');
      if (aBiz !== targetBizId) continue;

      const numAmt = Number(aTx.amount !== undefined && aTx.amount !== null ? aTx.amount : (aTx.amountPaisa ? aTx.amountPaisa / 100 : 0));
      const paisa = aTx.amountPaisa !== undefined && aTx.amountPaisa !== null
        ? Math.round(Number(aTx.amountPaisa))
        : Math.round(numAmt * 100);
      const feePaisa = aTx.feePaisa !== undefined && aTx.feePaisa !== null
        ? Math.round(Number(aTx.feePaisa))
        : Math.round(Number(aTx.fee || 0) * 100);

      const ts = extractRecordTimestamp(aTx) || Date.now();
      const isoDate = (aTx.date && typeof aTx.date === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(aTx.date.trim()))
        ? aTx.date.trim()
        : (new Date(ts).toISOString().slice(0, 10));

      const normTx = {
        id: String(aTx.id || ('tp_add_' + ts + '_' + Math.random().toString(36).substring(2, 7))),
        source: 'tallypay_add_money',
        channelId: aTx.channelId || aTx.provider || 'tallypay',
        channel: aTx.channelId || aTx.provider || 'tallypay',
        amount: numAmt,
        amountPaisa: paisa,
        fee: feePaisa / 100,
        feePaisa,
        type: 'CREDIT',
        status: aTx.status || 'SUCCESS',
        timestamp: ts,
        date: isoDate,
        createdAt: aTx.createdAt || new Date(ts).toISOString(),
        businessId: targetBizId,
        fromName: aTx.fromName || '',
        fromPhone: aTx.fromPhone || '',
        transactionNumber: aTx.transactionNumber || '',
        ref: aTx.reference || '',
      };

      results.push(normTx);
      if (normTx.id) seenTxnIds.add(normTx.id);
      if (aTx.transactionNumber) seenTxnIds.add(aTx.transactionNumber);
    }

    // 3. Digital Journal Entries
    const journalList = Array.isArray(store.journals) ? store.journals : [];
    for (const j of journalList) {
      if (!j) continue;
      const jBiz = String(j.businessId || j.business_id || '1');
      if (jBiz !== targetBizId) continue;

      if (j.id && seenTxnIds.has(String(j.id))) continue;
      if (j.banglaQrId && seenTxnIds.has(String(j.banglaQrId))) continue;
      if (j.transactionNumber && seenTxnIds.has(String(j.transactionNumber))) continue;
      if (j.externalId && seenTxnIds.has(String(j.externalId))) continue;

      const isDigital = j.isDigital === true ||
                        j.txn_mode === 2 ||
                        j.txn_mode === '2' ||
                        j.txn_mode === 'digital' ||
                        j.txn_mode === 'bank' ||
                        j.txn_mode === 'mfs';
      if (!isDigital) continue;

      const isReceived = j.type === 'received' || j.txn_type === 2 || j.txn_type === 'received' || j.type === 'deposit';
      const numAmt = Number(j.amount !== undefined && j.amount !== null ? j.amount : (j.amount_received || 0));
      if (!isReceived && numAmt <= 0) continue;

      const paisa = Math.round(numAmt * 100);
      const ts = extractRecordTimestamp(j) || Date.now();
      const isoDate = (j.date && typeof j.date === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(j.date.trim()))
        ? j.date.trim()
        : (new Date(ts).toISOString().slice(0, 10));

      let resolvedCh = j.channelId || j.channel || j.paymentMethod || null;
      if (!resolvedCh) {
        const descLower = String(j.desc || j.description || '').toLowerCase();
        if (descLower.includes('bkash') || descLower.includes('বিকাশ')) resolvedCh = 'bkash';
        else if (descLower.includes('nagad') || descLower.includes('নগদ')) resolvedCh = 'nagad';
        else if (descLower.includes('rocket') || descLower.includes('রকেট')) resolvedCh = 'rocket';
        else if (descLower.includes('upay') || descLower.includes('উপায়')) resolvedCh = 'upay';
        else if (descLower.includes('card') || descLower.includes('কার্ড') || descLower.includes('visa')) resolvedCh = 'card';
        else resolvedCh = 'bangla_qr';
      }

      const normTx = {
        id: String(j.id || ('j_dig_' + ts + '_' + Math.random().toString(36).substring(2, 7))),
        source: 'journal_digital',
        channelId: resolvedCh,
        channel: resolvedCh,
        amount: numAmt,
        amountPaisa: paisa,
        fee: 0,
        feePaisa: 0,
        type: 'CREDIT',
        status: (j.status !== undefined && j.status !== null) ? j.status : 'SUCCESS',
        timestamp: ts,
        date: isoDate,
        createdAt: j.createdAt || new Date(ts).toISOString(),
        businessId: targetBizId,
        accountId: j.accountId || j.orig_account_id || null,
        desc: j.desc || j.description || '',
      };

      results.push(normTx);
    }

    let filtered = results;

    if (filterOptions.channelId) {
      const targetCh = String(filterOptions.channelId).toLowerCase();
      filtered = filtered.filter((t) => String(t.channelId || t.channel).toLowerCase() === targetCh);
    }

    if (filterOptions.status) {
      const targetStatus = String(filterOptions.status).toUpperCase();
      filtered = filtered.filter((t) => String(t.status || 'SUCCESS').toUpperCase() === targetStatus);
    }

    if (filterOptions.source) {
      filtered = filtered.filter((t) => t.source === filterOptions.source);
    }

    if (filterOptions.startDate || filterOptions.endDate) {
      if (digitalAnalyticsService && typeof digitalAnalyticsService.filterTransactionsByDateRange === 'function') {
        filtered = digitalAnalyticsService.filterTransactionsByDateRange(filtered, filterOptions.startDate, filterOptions.endDate);
      } else {
        const start = filterOptions.startDate ? String(filterOptions.startDate).slice(0, 10) : null;
        const end = filterOptions.endDate ? String(filterOptions.endDate).slice(0, 10) : null;
        filtered = filtered.filter((tx) => {
          const d = tx.date;
          if (!d) return true;
          if (start && d < start) return false;
          if (end && d > end) return false;
          return true;
        });
      }
    }

    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (typeof filterOptions.limit === 'number' && filterOptions.limit > 0) {
      return filtered.slice(0, filterOptions.limit);
    }

    return filtered;
  }

  /**
   * Logs a TallyPay Utility Bill Payment transaction atomically.
   */
  async logBillPaymentTransaction(businessId, txnData, options = {}) {
    if (!txnData || typeof txnData !== 'object') {
      return { success: false, error: 'INVALID_TRANSACTION_PAYLOAD' };
    }

    const bizId = String(businessId || options.businessId || txnData.businessId || this.currentStore?.activeBusinessId || '1');
    const id = String(txnData.id || txnData.transactionNumber || ('TKBP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase()));
    const nowIso = txnData.paymentDate || txnData.createdAt || new Date().toISOString();

    const normalizedTxn = {
      ...txnData,
      id,
      transactionNumber: txnData.transactionNumber || id,
      txnNumber: txnData.txnNumber || txnData.transactionNumber || id,
      businessId: bizId,
      business_id: bizId,
      createdAt: txnData.createdAt || nowIso,
      paymentDate: txnData.paymentDate || nowIso,
      updatedAt: nowIso,
    };

    const res = await this.mutateCollection('billPaymentTransactions', (list) => {
      const existingIndex = list.findIndex((l) => String(l.id) === String(normalizedTxn.id) || String(l.transactionNumber) === String(normalizedTxn.id));
      if (existingIndex >= 0) {
        const updated = [...list];
        updated[existingIndex] = normalizedTxn;
        return updated;
      }
      return [normalizedTxn, ...list];
    });

    if (res.success) {
      return { success: true, transaction: normalizedTxn };
    }
    return { success: false, error: res.error };
  }

  /**
   * Retrieves all Utility Bill Payment transactions for a given business.
   */
  getBillPaymentTransactions(businessId = null, options = {}) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.billPaymentTransactions) ? store.billPaymentTransactions : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    let filtered = list.filter((tx) => {
      if (!tx) return false;
      const txBiz = String(tx.businessId !== undefined && tx.businessId !== null ? tx.businessId : (tx.business_id || '1'));
      return txBiz === targetBizId;
    });

    if (options && options.billerCode) {
      const bCode = String(options.billerCode).trim().toUpperCase();
      filtered = filtered.filter((tx) => String(tx.billerCode || '').toUpperCase() === bCode);
    }

    if (options && options.billerCategory) {
      const bCat = String(options.billerCategory).trim().toUpperCase();
      filtered = filtered.filter((tx) => String(tx.billerCategory || '').toUpperCase() === bCat);
    }

    // Sort descending by timestamp or paymentDate
    filtered.sort((a, b) => {
      const tA = new Date(a.paymentDate || a.timestamp || a.createdAt || 0).getTime();
      const tB = new Date(b.paymentDate || b.timestamp || b.createdAt || 0).getTime();
      return tB - tA;
    });

    if (options && options.offset !== undefined && options.offset > 0) {
      filtered = filtered.slice(options.offset);
    }
    if (options && options.limit !== undefined && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Retrieves a specific bill payment transaction by ID.
   */
  getBillPaymentTransactionById(businessId = null, txnId = null) {
    if (!txnId) return null;
    const list = this.getBillPaymentTransactions(businessId);
    return list.find((tx) => String(tx.id) === String(txnId) || String(tx.transactionNumber) === String(txnId)) || null;
  }

  /**
   * Saves or updates a biller account for fast re-entry.
   */
  async saveBillerAccount(businessId, billerData = {}, options = {}) {
    if (!billerData || typeof billerData !== 'object') {
      return { success: false, error: 'INVALID_BILLER_PAYLOAD' };
    }

    const bizId = String(businessId || options.businessId || billerData.businessId || this.currentStore?.activeBusinessId || '1');
    const billerCode = String(billerData.billerCode || '').trim();
    const accountNo = String(billerData.accountNo || billerData.smsAccountNo || '').trim();
    if (!billerCode || !accountNo) {
      return { success: false, error: 'BILLER_CODE_AND_ACCOUNT_REQUIRED' };
    }

    const nowIso = new Date().toISOString();
    const id = billerData.id || ('SAVED_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));

    const normalizedBiller = {
      ...billerData,
      id,
      businessId: bizId,
      business_id: bizId,
      billerCode,
      accountNo,
      meterNo: billerData.meterNo || null,
      nickName: billerData.nickName || billerData.customerName || billerCode,
      customerMobile: billerData.customerMobile || '',
      billerCategory: billerData.billerCategory || 'OTHER_BILL',
      createdAt: billerData.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const res = await this.mutateCollection('savedBillers', (list) => {
      const existingIndex = list.findIndex((b) => {
        if (!b) return false;
        const bBiz = String(b.businessId !== undefined && b.businessId !== null ? b.businessId : (b.business_id || '1'));
        return bBiz === bizId &&
               String(b.billerCode).toUpperCase() === billerCode.toUpperCase() &&
               String(b.accountNo) === accountNo;
      });

      if (existingIndex >= 0) {
        const updated = [...list];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...normalizedBiller,
          id: updated[existingIndex].id,
          createdAt: updated[existingIndex].createdAt || nowIso,
          updatedAt: nowIso,
        };
        return updated;
      }
      return [normalizedBiller, ...list];
    });

    if (res.success) {
      return { success: true, savedBiller: normalizedBiller };
    }
    return { success: false, error: res.error };
  }

  /**
   * Retrieves saved billers for a given business.
   */
  getSavedBillers(businessId = null, options = {}) {
    const store = this.currentStore || {};
    const list = Array.isArray(store.savedBillers) ? store.savedBillers : [];
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    let filtered = list.filter((b) => {
      if (!b) return false;
      const bBiz = String(b.businessId !== undefined && b.businessId !== null ? b.businessId : (b.business_id || '1'));
      return bBiz === targetBizId;
    });

    if (options && options.billerCategory) {
      const cat = String(options.billerCategory).trim().toUpperCase();
      filtered = filtered.filter((b) => String(b.billerCategory || '').toUpperCase() === cat);
    }
    if (options && options.billerCode) {
      const code = String(options.billerCode).trim().toUpperCase();
      filtered = filtered.filter((b) => String(b.billerCode || '').toUpperCase() === code);
    }

    filtered.sort((a, b) => {
      const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tB - tA;
    });

    return filtered;
  }

  /**
   * Deletes a saved biller for a given business.
   */
  async deleteSavedBiller(businessId, savedBillerId) {
    if (!savedBillerId) {
      return { success: false, error: 'SAVED_BILLER_ID_REQUIRED' };
    }
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const targetId = String(savedBillerId);

    const res = await this.mutateCollection('savedBillers', (list) => {
      return list.filter((b) => {
        if (!b) return false;
        const bBiz = String(b.businessId !== undefined && b.businessId !== null ? b.businessId : (b.business_id || '1'));
        return !(bBiz === targetBizId && String(b.id) === targetId);
      });
    });

    if (res.success) {
      return { success: true, deletedId: targetId };
    }
    return { success: false, error: res.error };
  }

  /**
   * Retrieves bill receipt history (alias to getBillPaymentTransactions).
   */
  getBillReceiptList(businessId = null, options = {}) {
    return this.getBillPaymentTransactions(businessId, options);
  }

  /**
   * Logs a TallyPay digital transaction atomically.
   */
  async logTallyPayTransaction(businessId, txnData, options = {}) {
    if (!txnData || typeof txnData !== 'object') {
      return { success: false, error: 'INVALID_TRANSACTION_PAYLOAD' };
    }

    const bizId = String(businessId || options.businessId || txnData.businessId || this.currentStore?.activeBusinessId || '1');
    const normalizer = (tallyPayService && typeof tallyPayService.formatTransactionStatementItem === 'function')
      ? tallyPayService.formatTransactionStatementItem
      : formatTransactionStatementItem;

    const normalizedTxn = normalizer ? normalizer({ ...txnData, businessId: bizId }) : { ...txnData, businessId: bizId };
    if (!normalizedTxn) {
      return { success: false, error: 'NORMALIZATION_FAILED' };
    }

    const res = await this.mutateCollection('tallyPayTransactions', (list) => {
      const existingIndex = list.findIndex(
        (l) => String(l.id) === String(normalizedTxn.id) || String(l.transactionNumber) === String(normalizedTxn.transactionNumber)
      );
      if (existingIndex >= 0) {
        const updated = [...list];
        updated[existingIndex] = normalizedTxn;
        return updated;
      }
      return [normalizedTxn, ...list];
    });

    if (res.success) {
      return { success: true, transaction: normalizedTxn };
    }
    return { success: false, error: res.error };
  }

  /**
   * Retrieves TallyPay digital transactions for a given business with filters & pagination.
   */
  getTallyPayTransactions(businessId = null, options = {}) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const queryFn = (tallyPayService && typeof tallyPayService.queryWalletTransactions === 'function')
      ? tallyPayService.queryWalletTransactions
      : queryWalletTransactions;

    if (queryFn) {
      return queryFn(store, { ...options, businessId: targetBizId });
    }

    const list = Array.isArray(store.tallyPayTransactions) ? store.tallyPayTransactions : [];
    const items = list.filter((t) => String(t.businessId || '1') === targetBizId);
    return {
      items,
      transactions: items,
      totalCount: items.length,
      offset: 0,
      limit: 20,
      hasMore: false,
    };
  }

  /**
   * Retrieves a specific TallyPay transaction by transactionNumber or ID.
   */
  getTallyPayTransactionById(businessId = null, txnId = null) {
    if (!txnId) return null;
    const res = this.getTallyPayTransactions(businessId, { limit: 100000 });
    const target = String(txnId).trim();
    return (res.items || []).find((tx) =>
      String(tx.transactionNumber) === target ||
      String(tx.id) === target ||
      String(tx.txnNumber) === target ||
      String(tx.transactionId) === target
    ) || null;
  }

  /**
   * Calculates monthly summary report for TallyPay transactions matching TxnReport.
   */
  getTallyPayMonthlySummary(businessId = null, month = null) {
    const res = this.getTallyPayTransactions(businessId, { limit: 100000 });
    const summaryFn = (tallyPayService && typeof tallyPayService.calculateMonthlyTransactionSummary === 'function')
      ? tallyPayService.calculateMonthlyTransactionSummary
      : calculateMonthlyTransactionSummary;

    if (summaryFn) {
      return summaryFn(res.items || [], month);
    }
    return null;
  }

  /**
   * Saves or updates a TallyPay beneficiary (Bank or MFS) for a business.
   */
  async saveTallyPayBeneficiary(businessId, beneficiaryData, options = {}) {
    if (!beneficiaryData || typeof beneficiaryData !== 'object') {
      return { success: false, error: 'INVALID_BENEFICIARY_PAYLOAD' };
    }

    const store = this.currentStore || {};
    const bizId = String(businessId || options.businessId || beneficiaryData.businessId || store.activeBusinessId || '1');
    const targetType = String(
      beneficiaryData.targetType || beneficiaryData.type || (beneficiaryData.routingNo || beneficiaryData.routingNumber ? 'BANK' : 'MFS')
    ).toUpperCase();

    let normalized = null;
    if (targetType === 'BANK') {
      const normalizer = (tallyPayService && typeof tallyPayService.formatBankAccountItem === 'function')
        ? tallyPayService.formatBankAccountItem
        : null;
      normalized = normalizer ? normalizer(beneficiaryData) : { ...beneficiaryData, targetType: 'BANK' };
    } else {
      const normalizer = (tallyPayService && typeof tallyPayService.formatMfsAccountItem === 'function')
        ? tallyPayService.formatMfsAccountItem
        : null;
      normalized = normalizer ? normalizer(beneficiaryData) : { ...beneficiaryData, targetType: 'MFS' };
    }

    if (!normalized) {
      return { success: false, error: 'NORMALIZATION_FAILED' };
    }

    normalized.businessId = bizId;
    if (!normalized.id) {
      normalized.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 6);
    }
    normalized.updatedAt = new Date().toISOString();
    if (!normalized.createdAt) {
      normalized.createdAt = normalized.updatedAt;
    }

    await this.mutateCollection('tallyPayBeneficiaries', (list) => {
      const existingIndex = list.findIndex((item) => {
        if (String(item.businessId || '1') !== bizId) return false;
        if (String(item.id) === String(normalized.id)) return true;
        if (item.targetType === 'BANK' && normalized.targetType === 'BANK') {
          return String(item.accountNumber).trim() === String(normalized.accountNumber).trim();
        }
        if (item.targetType === 'MFS' && normalized.targetType === 'MFS') {
          return String(item.walletNo || item.mobileNumber).trim() === String(normalized.walletNo || normalized.mobileNumber).trim();
        }
        return false;
      });

      if (existingIndex !== -1) {
        normalized.id = list[existingIndex].id;
        normalized.createdAt = list[existingIndex].createdAt || normalized.createdAt;
        list[existingIndex] = { ...list[existingIndex], ...normalized };
      } else {
        list.push(normalized);
      }
      return list;
    });

    return {
      success: true,
      beneficiary: normalized,
      data: normalized,
    };
  }

  /**
   * Retrieves saved beneficiaries for a business with filtering, search, and pagination.
   */
  getTallyPayBeneficiaries(businessId = null, options = {}) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const list = Array.isArray(store.tallyPayBeneficiaries) ? store.tallyPayBeneficiaries : [];
    const items = list.filter((b) => String(b.businessId || '1') === targetBizId);

    const queryFn = (tallyPayService && typeof tallyPayService.queryBeneficiaries === 'function')
      ? tallyPayService.queryBeneficiaries
      : null;

    if (queryFn) {
      return queryFn(items, options);
    }

    let filtered = [...items];
    if (options.targetType && options.targetType !== 'ALL') {
      const t = String(options.targetType).toUpperCase();
      filtered = filtered.filter((b) => String(b.targetType || b.type).toUpperCase() === t);
    }
    if (options.status && options.status !== 'ALL') {
      const s = String(options.status).toUpperCase();
      filtered = filtered.filter((b) => String(b.status).toUpperCase() === s);
    }
    const query = options.search || options.searchQuery || options.query;
    if (query && typeof query === 'string' && query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter((b) => {
        const name = String(b.accountName || b.name || '').toLowerCase();
        const accNo = String(b.accountNumber || b.walletNo || b.mobileNumber || '').toLowerCase();
        const bankName = String(b.bankName || b.mfsProvider || b.walletType || '').toLowerCase();
        const routing = String(b.routingNo || b.routingNumber || '').toLowerCase();
        return name.includes(q) || accNo.includes(q) || bankName.includes(q) || routing.includes(q);
      });
    }
    if (options.isFavorite !== undefined && options.isFavorite !== null) {
      const fav = Boolean(options.isFavorite);
      filtered = filtered.filter((b) => Boolean(b.isFavorite) === fav);
    }

    filtered.sort((a, b) => {
      const favA = a.isFavorite ? 1 : 0;
      const favB = b.isFavorite ? 1 : 0;
      if (favA !== favB) return favB - favA;
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const totalCount = filtered.length;
    const offset = Math.max(0, parseInt(options.offset, 10) || 0);
    const limit = Math.max(1, parseInt(options.limit, 10) || 50);
    const paginated = filtered.slice(offset, offset + limit);
    const hasMore = offset + paginated.length < totalCount;

    return {
      items: paginated,
      beneficiaries: paginated,
      totalCount,
      offset,
      limit,
      hasMore,
    };
  }

  /**
   * Retrieves a single saved beneficiary by ID.
   */
  getTallyPayBeneficiaryById(businessId = null, id) {
    if (!id) return null;
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const list = Array.isArray(store.tallyPayBeneficiaries) ? store.tallyPayBeneficiaries : [];
    return list.find((b) => String(b.id) === String(id) && String(b.businessId || '1') === targetBizId) || null;
  }

  /**
   * Updates fields of an existing saved beneficiary.
   */
  async updateTallyPayBeneficiary(businessId, id, updates = {}) {
    if (!id || typeof updates !== 'object') {
      return { success: false, error: 'INVALID_PARAMETERS' };
    }
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    let updatedRecord = null;
    await this.mutateCollection('tallyPayBeneficiaries', (list) => {
      const idx = list.findIndex((b) => String(b.id) === String(id) && String(b.businessId || '1') === targetBizId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        updatedRecord = list[idx];
      }
      return list;
    });

    if (!updatedRecord) {
      return { success: false, error: 'BENEFICIARY_NOT_FOUND' };
    }
    return { success: true, beneficiary: updatedRecord, data: updatedRecord };
  }

  /**
   * Deletes a saved beneficiary with optional PIN authorization.
   */
  async deleteTallyPayBeneficiary(businessId, id, credential = null) {
    if (!id) {
      return { success: false, error: 'BENEFICIARY_ID_REQUIRED' };
    }
    if (credential !== null && credential !== undefined) {
      const credStr = String(credential).trim();
      if (credStr.length < 4) {
        throw new Error('Invalid security credential for deletion');
      }
    }
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');

    let deleted = false;
    await this.mutateCollection('tallyPayBeneficiaries', (list) => {
      const idx = list.findIndex((b) => String(b.id) === String(id) && String(b.businessId || '1') === targetBizId);
      if (idx !== -1) {
        list.splice(idx, 1);
        deleted = true;
      }
      return list;
    });

    if (!deleted) {
      return { success: false, error: 'BENEFICIARY_NOT_FOUND', message: 'Account not found' };
    }
    return { success: true, message: 'Bank beneficiary deleted successfully' };
  }


  /**
   * Sanitizes in-memory state ensuring all collections are well-formed arrays.
   */

  /**
   * Saves a TallyPay QR payment settlement action idempotently.
   * Enforces unique constraint on transactionNumber per business / global.
   */
  async saveQrSettlementAction(businessId, actionData) {
    if (!actionData || typeof actionData !== 'object') {
      return { success: false, error: 'INVALID_PAYLOAD' };
    }
    const txnNumber = String(actionData.transactionNumber || actionData.transaction_number || actionData.txnNumber || '').trim();
    if (!txnNumber) {
      return { success: false, error: 'TRANSACTION_NUMBER_REQUIRED' };
    }

    const store = this.currentStore || {};
    const targetBizId = String(businessId || actionData.businessId || store.activeBusinessId || '1');
    const list = Array.isArray(store.qrSettlementActions) ? store.qrSettlementActions : [];

    // Check unique constraint matching Room index_transaction_number
    const existing = list.find((s) =>
      String(s.transactionNumber) === txnNumber &&
      String(s.businessId || '1') === targetBizId
    );
    if (existing) {
      return {
        success: false,
        duplicate: true,
        reason: 'ALREADY_SETTLED',
        error: 'ALREADY_SETTLED',
        message: 'Transaction already settled',
        existingId: existing.id,
        record: existing,
      };
    }

    const actionType = String(actionData.actionType || actionData.action_type || 'NO_ACTION').toUpperCase();
    const nowIso = new Date().toISOString();
    const newId = actionData.id !== undefined && actionData.id !== null
      ? (typeof actionData.id === 'number' ? actionData.id : String(actionData.id))
      : (Date.now() + Math.floor(Math.random() * 1000));

    const amountVal = Number(actionData.amount) || (actionData.amountPaisa ? Number(actionData.amountPaisa) / 100 : 0);
    const amountPaisa = actionData.amountPaisa !== undefined
      ? Math.round(Number(actionData.amountPaisa))
      : Math.round(amountVal * 100);

    const record = {
      id: newId,
      transactionNumber: txnNumber,
      transaction_number: txnNumber,
      actionType,
      action_type: actionType,
      synced: actionData.synced !== undefined ? Number(actionData.synced) : 0,
      createDate: actionData.createDate || actionData.create_date || nowIso,
      create_date: actionData.create_date || actionData.createDate || nowIso,
      updateDate: actionData.updateDate || actionData.update_date || null,
      update_date: actionData.update_date || actionData.updateDate || null,
      businessId: targetBizId,
      business_id: targetBizId,
      accountId: actionData.accountId || actionData.account_id || null,
      accountName: actionData.accountName || actionData.account_name || null,
      amount: amountPaisa / 100,
      amountPaisa,
      senderMobile: actionData.senderMobile || actionData.sender_mobile || '',
      senderName: actionData.senderName || actionData.sender_name || '',
      note: actionData.note || '',
    };

    let savedRecord = null;
    await this.mutateCollection('qrSettlementActions', (actions) => {
      const dup = actions.find((s) =>
        String(s.transactionNumber) === txnNumber &&
        String(s.businessId || '1') === targetBizId
      );
      if (dup) {
        return actions;
      }
      actions.push(record);
      savedRecord = record;
      return actions;
    });

    if (!savedRecord) {
      return {
        success: false,
        duplicate: true,
        reason: 'ALREADY_SETTLED',
        error: 'ALREADY_SETTLED',
        message: 'Transaction already settled',
      };
    }

    return {
      success: true,
      duplicate: false,
      action: savedRecord,
      record: savedRecord,
      id: savedRecord.id,
    };
  }

  /**
   * Retrieves QR settlement actions with optional filters and pagination.
   */
  getQrSettlementActions(businessId = null, options = {}) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const list = Array.isArray(store.qrSettlementActions) ? store.qrSettlementActions : [];
    let filtered = list.filter((a) => String(a.businessId || '1') === targetBizId);

    if (options.actionType && options.actionType !== 'ALL') {
      const typeStr = String(options.actionType).toUpperCase();
      filtered = filtered.filter((a) => String(a.actionType || a.action_type).toUpperCase() === typeStr);
    }

    if (options.synced !== undefined && options.synced !== null && options.synced !== 'ALL') {
      const synVal = Number(options.synced);
      filtered = filtered.filter((a) => Number(a.synced) === synVal);
    }

    const query = options.search || options.searchQuery || options.query;
    if (query && typeof query === 'string' && query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter((a) => {
        const txn = String(a.transactionNumber || '').toLowerCase();
        const accName = String(a.accountName || '').toLowerCase();
        const sender = String(a.senderName || a.senderMobile || '').toLowerCase();
        const note = String(a.note || '').toLowerCase();
        return txn.includes(q) || accName.includes(q) || sender.includes(q) || note.includes(q);
      });
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.createDate || a.create_date || 0).getTime();
      const dateB = new Date(b.createDate || b.create_date || 0).getTime();
      return dateB - dateA;
    });

    const totalCount = filtered.length;
    const offset = Math.max(0, parseInt(options.offset, 10) || 0);
    const limit = Math.max(1, parseInt(options.limit, 10) || 50);
    const paginated = filtered.slice(offset, offset + limit);
    const hasMore = offset + paginated.length < totalCount;

    return {
      items: paginated,
      actions: paginated,
      settlements: paginated,
      totalCount,
      offset,
      limit,
      hasMore,
    };
  }

  /**
   * Retrieves a specific settlement action by transactionNumber.
   */
  getSettlementActionByTxnNumber(businessId = null, transactionNumber) {
    if (!transactionNumber) return null;
    const store = this.currentStore || {};
    const targetBizId = businessId ? String(businessId) : null;
    const list = Array.isArray(store.qrSettlementActions) ? store.qrSettlementActions : [];
    const targetTxn = String(transactionNumber).trim();
    return list.find((a) =>
      String(a.transactionNumber) === targetTxn &&
      (!targetBizId || String(a.businessId || '1') === targetBizId)
    ) || null;
  }

  /**
   * Marks batch settlement action IDs as synced (synced = 1).
   */
  async markQrSettlementActionsSynced(businessId = null, ids = []) {
    const idSet = new Set((Array.isArray(ids) ? ids : [ids]).map(String));
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    let count = 0;
    const nowIso = new Date().toISOString();
    await this.mutateCollection('qrSettlementActions', (list) => {
      for (const item of list) {
        if (idSet.has(String(item.id)) && String(item.businessId || '1') === targetBizId) {
          item.synced = 1;
          item.updateDate = nowIso;
          item.update_date = nowIso;
          count++;
        }
      }
      return list;
    });
    return { success: true, count };
  }


  // ============================================================================
  // MILESTONE REA-ITER-230: MERCHANT DISBURSEMENT, RECONCILIATION & AUTO-CONFIG
  // ============================================================================

  /**
   * Saves a merchant bank disbursement record atomically.
   */
  async saveMerchantDisbursement(businessId = null, disbursement = {}) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const nowIso = new Date().toISOString();
    const id = disbursement.id || ('DISB_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    const amountVal = Number(disbursement.amountTaka !== undefined ? disbursement.amountTaka : (disbursement.amount || 0));
    const amountPaisa = disbursement.amountPaisa !== undefined
      ? Math.round(Number(disbursement.amountPaisa))
      : Math.round(amountVal * 100);
    const feeVal = Number(disbursement.fee !== undefined ? disbursement.fee : (disbursement.serviceCharge || 0));
    const feePaisa = disbursement.feePaisa !== undefined
      ? Math.round(Number(disbursement.feePaisa))
      : Math.round(feeVal * 100);
    const netAmountVal = Number(disbursement.netAmount !== undefined ? disbursement.netAmount : (amountVal - feeVal));
    const netAmountPaisa = Math.round(amountPaisa - feePaisa);

    const record = {
      id,
      _id: id,
      businessId: targetBizId,
      business_id: targetBizId,
      amount: amountVal,
      amountTaka: amountVal,
      amountPaisa,
      fee: feeVal,
      feePaisa,
      netAmount: netAmountVal,
      netAmountPaisa,
      bankRoutingNo: disbursement.bankRoutingNo || disbursement.routingNumber || '',
      bankAccountNo: disbursement.bankAccountNo || disbursement.accountNumber || '',
      recipientName: disbursement.recipientName || disbursement.accountName || '',
      transferMode: disbursement.transferMode || 'BEFTN',
      notice: disbursement.notice || '',
      status: disbursement.status || 'SCHEDULED',
      timestamp: disbursement.timestamp || nowIso,
      createDate: disbursement.createDate || nowIso,
      updateDate: nowIso,
    };

    let saved = null;
    await this.mutateCollection('merchantDisbursements', (list) => {
      saved = record;
      return [record, ...list];
    });

    return { success: true, disbursement: saved };
  }

  /**
   * Queries merchant bank disbursements with filtering and pagination.
   */
  getMerchantDisbursements(businessId = null, options = {}) {
    const store = this.currentStore || {};
    const targetBizId = businessId ? String(businessId) : null;
    const list = Array.isArray(store.merchantDisbursements) ? store.merchantDisbursements : [];

    let filtered = list.filter((d) => {
      if (targetBizId && String(d.businessId || '1') !== targetBizId) return false;
      if (options.status && String(d.status).toUpperCase() !== String(options.status).toUpperCase()) return false;
      if (options.transferMode && String(d.transferMode).toUpperCase() !== String(options.transferMode).toUpperCase()) return false;
      if (options.startDate) {
        const itemDate = new Date(d.createDate || d.timestamp || 0).getTime();
        const start = new Date(options.startDate).getTime();
        if (itemDate < start) return false;
      }
      if (options.endDate) {
        const itemDate = new Date(d.createDate || d.timestamp || 0).getTime();
        const end = new Date(options.endDate).getTime();
        if (itemDate > end) return false;
      }
      return true;
    });

    if (options.query || options.search) {
      const q = String(options.query || options.search).trim().toLowerCase();
      filtered = filtered.filter((d) => {
        const id = String(d.id || '').toLowerCase();
        const rec = String(d.recipientName || '').toLowerCase();
        const acc = String(d.bankAccountNo || '').toLowerCase();
        const rout = String(d.bankRoutingNo || '').toLowerCase();
        return id.includes(q) || rec.includes(q) || acc.includes(q) || rout.includes(q);
      });
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.createDate || a.timestamp || 0).getTime();
      const dateB = new Date(b.createDate || b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    const totalCount = filtered.length;
    const totalAmount = filtered.reduce((acc, curr) => acc + Number(curr.amountTaka || curr.amount || 0), 0);
    const totalAmountPaisa = filtered.reduce((acc, curr) => acc + Number(curr.amountPaisa || Math.round(Number(curr.amount || 0) * 100)), 0);
    const offset = Math.max(0, parseInt(options.offset, 10) || 0);
    const limit = Math.max(1, parseInt(options.limit, 10) || 50);
    const paginated = filtered.slice(offset, offset + limit);
    const hasMore = offset + paginated.length < totalCount;

    return {
      items: paginated,
      disbursements: paginated,
      totalCount,
      totalAmount,
      totalAmountPaisa,
      offset,
      limit,
      hasMore,
    };
  }

  /**
   * Retrieves a specific disbursement by id.
   */
  getDisbursementById(businessId = null, id = null) {
    if (!id) return null;
    const store = this.currentStore || {};
    const targetBizId = businessId ? String(businessId) : null;
    const list = Array.isArray(store.merchantDisbursements) ? store.merchantDisbursements : [];
    const targetId = String(id).trim();
    return list.find((d) =>
      (String(d.id) === targetId || String(d._id) === targetId) &&
      (!targetBizId || String(d.businessId || '1') === targetBizId)
    ) || null;
  }

  /** Saves a dispute ticket in the existing serialized business-state store. */
  async saveDisputeTicket(businessId = null, ticketData = {}) {
    if (!ticketData || typeof ticketData !== 'object' || Array.isArray(ticketData)) {
      return { success: false, error: 'INVALID_TICKET' };
    }
    const store = this.currentStore || {};
    const targetBizId = String(businessId || ticketData.businessId || ticketData.business_id || store.activeBusinessId || '1');
    const transactionNumber = String(ticketData.transaction_number || ticketData.transactionNumber || ticketData.txnNumber || '').trim();
    const category = String(ticketData.category || '');
    const amountRaw = ticketData.claimed_amount_paisa !== undefined ? ticketData.claimed_amount_paisa : ticketData.claimedAmountPaisa;
    const claimedAmountPaisa = Number(amountRaw);
    if (!transactionNumber || !category || !Number.isSafeInteger(claimedAmountPaisa) || claimedAmountPaisa <= 0) {
      return { success: false, error: 'INVALID_TICKET_FIELDS' };
    }
    if (!Object.values(DISPUTE_CATEGORIES || {}).includes(category)) {
      return { success: false, error: 'INVALID_DISPUTE_CATEGORY' };
    }
    if (ticketData.fileSizeBytes !== undefined || ticketData.mimeType !== undefined) {
      const proofCheck = validateProofAttachment({ fileSizeBytes: ticketData.fileSizeBytes, mimeType: ticketData.mimeType });
      if (!proofCheck.valid) return { success: false, error: proofCheck.error };
    }

    const existingRecords = Array.isArray(store.merchantDisputeTickets) ? store.merchantDisputeTickets : [];
    let ticketId = String(ticketData.ticket_id || ticketData.ticketId || '').trim();
    if (!ticketId) {
      do { ticketId = generateDisputeTicketId(); }
      while (existingRecords.some((ticket) => String(ticket.ticket_id || ticket.ticketId) === ticketId));
    }
    if (existingRecords.some((ticket) => String(ticket.ticket_id || ticket.ticketId) === ticketId)) {
      return { success: false, error: 'DUPLICATE_TICKET', duplicate: true, ticketId };
    }

    let savedTicket = null;
    const mutation = await this.mutateCollection('merchantDisputeTickets', (records) => {
      const list = Array.isArray(records) ? records : [];
      if (list.some((ticket) => String(ticket.ticket_id || ticket.ticketId) === ticketId)) return list;
      const dao = new MerchantDisputeTicketDao(list);
      savedTicket = dao.insert({
        ...ticketData,
        ticket_id: ticketId,
        business_id: targetBizId,
        transaction_number: transactionNumber,
        category,
        claimed_amount_paisa: claimedAmountPaisa,
      });
      return dao.records;
    });
    if (!mutation.success) return { success: false, error: mutation.error };
    if (!savedTicket) return { success: false, error: 'DUPLICATE_TICKET', duplicate: true, ticketId };
    return { success: true, ticketId, ticket: { ...savedTicket } };
  }

  getDisputeTickets(businessId = null, options = {}) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const all = (store.merchantDisputeTickets || []).filter((ticket) =>
      String(ticket.businessId || ticket.business_id || '1') === targetBizId
    );
    let filtered = all;
    if (options.status) filtered = filtered.filter((ticket) => String(ticket.status).toUpperCase() === String(options.status).toUpperCase());
    if (options.category) filtered = filtered.filter((ticket) => String(ticket.category) === String(options.category));
    if (options.search) {
      const query = String(options.search).toLowerCase();
      filtered = filtered.filter((ticket) => [ticket.ticket_id, ticket.transaction_number, ticket.description]
        .some((value) => String(value || '').toLowerCase().includes(query)));
    }
    filtered.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
    const totalCount = filtered.length;
    const offset = Math.max(0, Number(options.offset) || 0);
    const limit = Math.max(1, Number(options.limit) || 50);
    const items = filtered.slice(offset, offset + limit).map((ticket) => ({ ...ticket }));
    return { items, tickets: items, totalCount, offset, limit, hasMore: offset + items.length < totalCount };
  }

  getDisputeTicketById(businessId = null, ticketId = '') {
    const targetBizId = String(businessId || this.currentStore?.activeBusinessId || '1');
    const wantedId = String(ticketId || '').trim();
    const ticket = (this.currentStore?.merchantDisputeTickets || []).find((item) =>
      String(item.businessId || item.business_id || '1') === targetBizId &&
      String(item.ticket_id || item.ticketId) === wantedId
    );
    return ticket ? { ...ticket } : null;
  }

  async updateDisputeTicketStatus(businessId = null, ticketId = '', newStatus = '', resolutionData = {}) {
    const targetBizId = String(businessId || this.currentStore?.activeBusinessId || '1');
    const wantedId = String(ticketId || '').trim();
    let result = { success: false, error: 'DISPUTE_NOT_FOUND' };
    const mutation = await this.mutateStore((store) => {
      const tickets = Array.isArray(store.merchantDisputeTickets) ? store.merchantDisputeTickets : [];
      const index = tickets.findIndex((item) =>
        String(item.businessId || item.business_id || '1') === targetBizId &&
        String(item.ticket_id || item.ticketId) === wantedId
      );
      if (index < 0) return store;

      const ticket = { ...tickets[index] };
      if (!isValidDisputeTransition(ticket.status, newStatus)) {
        result = { success: false, error: 'INVALID_STATUS_TRANSITION' };
        return store;
      }
      const resolution = typeof resolutionData === 'string' ? { resolutionNotes: resolutionData } : (resolutionData || {});
      const now = new Date().toISOString();
      ticket.status = newStatus;
      ticket.updated_at = now;
      ticket.updatedAt = now;
      ticket.synced = 0;
      if (resolution.resolutionNotes !== undefined) ticket.resolution = resolution.resolutionNotes;
      if (resolution.resolution !== undefined) ticket.resolution = resolution.resolution;

      let actions = Array.isArray(store.transactionSettlementActions) ? [...store.transactionSettlementActions] : [];
      let refundAction = null;
      if (newStatus === DISPUTE_STATUSES.RESOLVED_REFUNDED) {
        const resolvedAmount = resolution.resolvedAmountPaisa !== undefined
          ? Number(resolution.resolvedAmountPaisa)
          : Number(ticket.claimed_amount_paisa || ticket.claimedAmountPaisa || 0);
        if (!Number.isSafeInteger(resolvedAmount) || resolvedAmount < 0) {
          result = { success: false, error: 'INVALID_RESOLVED_AMOUNT' };
          return store;
        }
        ticket.resolved_amount_paisa = resolvedAmount;
        const previousRefund = actions.find((action) =>
          String(action.businessId || action.business_id || '1') === targetBizId &&
          String(action.transaction_number || action.transactionNumber) === String(ticket.transaction_number || ticket.transactionNumber) &&
          String(action.action_type || action.actionType).toUpperCase() === SETTLEMENT_ACTION_TYPES.REFUND
        );
        if (previousRefund) {
          refundAction = previousRefund;
        } else {
          const transactionNumber = String(ticket.transaction_number || ticket.transactionNumber || '');
          const transactionAlreadyUsed = actions.some((action) =>
            String(action.businessId || action.business_id || '1') === targetBizId &&
            String(action.transaction_number || action.transactionNumber) === transactionNumber
          );
          if (transactionAlreadyUsed) {
            result = { success: false, error: 'SETTLEMENT_ACTION_EXISTS' };
            return store;
          }
          const nextId = actions.reduce((max, action) => Math.max(max, Number(action.id) || 0), 0) + 1;
          refundAction = {
            id: nextId,
            businessId: targetBizId,
            transaction_number: transactionNumber,
            transactionNumber,
            action_type: SETTLEMENT_ACTION_TYPES.REFUND,
            actionType: SETTLEMENT_ACTION_TYPES.REFUND,
            amount_paisa: resolvedAmount,
            amountPaisa: resolvedAmount,
            synced: 0,
            create_date: now,
            update_date: null,
          };
          actions.push(refundAction);
        }
      }

      const nextTickets = [...tickets];
      nextTickets[index] = ticket;
      result = { success: true, ticket: { ...ticket }, refundAction: refundAction ? { ...refundAction } : null };
      return { ...store, merchantDisputeTickets: nextTickets, transactionSettlementActions: actions };
    });
    if (!mutation.success) return { success: false, error: mutation.error };
    return result;
  }

  async deleteDisputeTicket(businessId = null, ticketId = '') {
    const targetBizId = String(businessId || this.currentStore?.activeBusinessId || '1');
    const wantedId = String(ticketId || '').trim();
    let deleted = false;
    const mutation = await this.mutateCollection('merchantDisputeTickets', (tickets) => (tickets || []).filter((ticket) => {
      const matches = String(ticket.businessId || ticket.business_id || '1') === targetBizId &&
        String(ticket.ticket_id || ticket.ticketId) === wantedId;
      if (matches) deleted = true;
      return !matches;
    }));
    return mutation.success ? { success: deleted } : { success: false, error: mutation.error };
  }

  async performAutoSettlementReconciliation(businessId = null, dateInput = null) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const bstToday = getBstDateComponents(new Date());
    const defaultDateKey = [bstToday.year, String(bstToday.month + 1).padStart(2, '0'), String(bstToday.day).padStart(2, '0')].join('-');
    const dateKey = dateInput ? String(dateInput).slice(0, 10) : defaultDateKey;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || Number.isNaN(Date.parse(dateKey))) {
      return { success: false, error: 'INVALID_RECONCILIATION_DATE' };
    }
    const recordMatchesDate = (record) => {
      const value = record.time || record.createDate;
      if (!value) return false;
      const parsed = new Date(value);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === dateKey;
    };
    const existing = (store.reconciliations || []).find((record) =>
      String(record.businessId || record.business_id || '1') === targetBizId &&
      recordMatchesDate(record)
    );
    if (existing) return { success: true, duplicate: true, reconciliation: { ...existing } };

    const sameBusiness = (record) => String(record.businessId || record.business_id || '1') === targetBizId;
    const onDate = (record) => {
      const rawDate = record.date || record.txn_date || record.time || record.timestamp || record.create_date || record.createDate || '';
      if (!rawDate) return false;
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return String(rawDate).slice(0, 10) === dateKey;
      const bstDate = new Date(parsed.getTime() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return bstDate === dateKey;
    };
    const amountPaisa = (record) => {
      if (record.amountPaisa !== undefined) return Math.round(Number(record.amountPaisa) || 0);
      if (record.amount_paisa !== undefined) return Math.round(Number(record.amount_paisa) || 0);
      if (record.amountTaka !== undefined) return Math.round((Number(record.amountTaka) || 0) * 100);
      return Math.round((Number(record.amount) || 0) * 100);
    };

    const cashSalesPaisa = (store.cashEntries || []).filter((entry) => sameBusiness(entry) && onDate(entry) &&
      (String(entry.category || entry.tag || '').toUpperCase() === 'SALE') &&
      ['IN', 'CASH_IN'].includes(String(entry.type || '').toUpperCase())
    ).reduce((sum, entry) => sum + amountPaisa(entry), 0);
    const digitalCollectedPaisa = (store.transactionSettlementActions || []).filter((action) => sameBusiness(action) && onDate(action) &&
      String(action.action_type || action.actionType).toUpperCase() === SETTLEMENT_ACTION_TYPES.DIGITAL_SALE
    ).reduce((sum, action) => sum + amountPaisa(action), 0);
    const bankDisbursedPaisa = (store.merchantDisbursements || []).filter((disbursement) => sameBusiness(disbursement) && onDate(disbursement))
      .reduce((sum, disbursement) => sum + amountPaisa(disbursement), 0);
    const business = (store.businesses || []).find((item) => String(item.id || item.business_id) === targetBizId);
    const openingTaka = business && (business.openingBalance !== undefined || business.opening_balance !== undefined)
      ? Number(business.openingBalance !== undefined ? business.openingBalance : business.opening_balance) || 0
      : (String(store.activeBusinessId || '1') === targetBizId ? Number(store.openingBalance) || 0 : 0);
    const reconciliationResult = calculateDailyReconciliation({
      openingBalancePaisa: Math.round(openingTaka * 100),
      otherCashSalesPaisa: cashSalesPaisa,
      otherCreditSalesPaisa: 0,
      digitalInflowPaisa: digitalCollectedPaisa,
      bankDisbursedPaisa,
    });
    const reconTime = new Date(`${dateKey}T12:00:00.000Z`).toISOString();
    let reconciliation = null;
    let duplicate = false;
    const mutation = await this.mutateStore((latest) => {
      const records = Array.isArray(latest.reconciliations) ? latest.reconciliations : [];
      const previous = records.find((record) =>
        String(record.businessId || record.business_id || '1') === targetBizId &&
        recordMatchesDate(record)
      );
      if (previous) {
        duplicate = true;
        reconciliation = { ...previous };
        return latest;
      }
      const now = new Date().toISOString();
      reconciliation = {
        id: 'RECON_' + targetBizId + '_' + dateKey,
        _id: 'RECON_' + targetBizId + '_' + dateKey,
        businessId: targetBizId,
        business_id: targetBizId,
        time: reconTime,
        opening_balance: reconciliationResult.openingBalancePaisa / 100,
        openingBalance: reconciliationResult.openingBalancePaisa / 100,
        other_cash_sales: reconciliationResult.otherCashSalesPaisa / 100,
        otherCashSale: reconciliationResult.otherCashSalesPaisa / 100,
        other_credit_sales: reconciliationResult.otherCreditSalesPaisa / 100,
        otherCreditSale: reconciliationResult.otherCreditSalesPaisa / 100,
        digital_settlements: reconciliationResult.totalCollectedPaisa / 100,
        digitalSettlements: reconciliationResult.totalCollectedPaisa / 100,
        closing_balance: reconciliationResult.closingBalancePaisa / 100,
        closingBalance: reconciliationResult.closingBalancePaisa / 100,
        sync_status: 0,
        syncStatus: 0,
        createDate: now,
        updateDate: now,
      };
      return { ...latest, reconciliations: [reconciliation, ...records] };
    });
    if (!mutation.success) return { success: false, error: mutation.error || 'RECONCILIATION_SAVE_FAILED' };
    return { success: true, duplicate, reconciliation: { ...reconciliation }, reconciliationResult };
  }

  saveSettlementAction(businessId = null, action = {}) {
    return this.saveTransactionSettlementAction(businessId, action);
  }

  getSettlementActions(businessId = null, options = {}) {
    return this.getTransactionSettlementActions(businessId, options);
  }

  getSettlementActionByTxn(businessId = null, transactionNumber = '') {
    return this.getTransactionSettlementActionByTxn(businessId, transactionNumber);
  }

  getUnsyncedSettlementActions(businessId = null, limit = 100) {
    return this.getUnsyncedTxnSettlementActions(businessId, limit);
  }

  updateSettlementActionSyncStatus(businessId = null, synced = 1, ids = []) {
    return this.updateTxnSettlementActionSyncStatusByIds(businessId, synced, ids);
  }

  getUnsyncedDisputeTickets(businessId = null, limit = 100) {
    const targetBizId = String(businessId || this.currentStore?.activeBusinessId || '1');
    return (this.currentStore?.merchantDisputeTickets || []).filter((ticket) =>
      String(ticket.businessId || ticket.business_id || '1') === targetBizId && Number(ticket.synced) === 0
    ).slice(0, Math.max(0, Number(limit) || 0)).map((ticket) => ({ ...ticket }));
  }

  async updateDisputeTicketSyncStatus(businessId = null, ticketIds = [], synced = 1) {
    const targetBizId = String(businessId || this.currentStore?.activeBusinessId || '1');
    const idSet = new Set((Array.isArray(ticketIds) ? ticketIds : [ticketIds]).map(String));
    let updated = 0;
    const mutation = await this.mutateCollection('merchantDisputeTickets', (tickets) => (tickets || []).map((ticket) => {
      if (String(ticket.businessId || ticket.business_id || '1') !== targetBizId ||
          (!idSet.has(String(ticket.id)) && !idSet.has(String(ticket.ticket_id || ticket.ticketId)))) return ticket;
      updated++;
      return { ...ticket, synced: Number(synced), updated_at: new Date().toISOString() };
    }));
    return mutation.success ? updated : 0;
  }

  async updateReconciliationSyncStatus(businessId = null, ids = [], syncStatus = 1) {
    const targetBizId = businessId ? String(businessId) : null;
    const idSet = new Set((Array.isArray(ids) ? ids : [ids]).map(String));
    let updated = 0;
    const mutation = await this.mutateCollection('reconciliations', (records) => (records || []).map((record) => {
      const id = String(record._id !== undefined ? record._id : record.id);
      if (idSet.has(id) && (!targetBizId || String(record.businessId || record.business_id || '1') === targetBizId)) {
        updated++;
        return { ...record, sync_status: Number(syncStatus), syncStatus: Number(syncStatus) };
      }
      return record;
    }));
    return mutation.success ? updated : 0;
  }

  /**
   * Saves an End-of-Day reconciliation record atomically.
   */
  async saveReconciliation(businessId = null, reconData = {}) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const nowIso = new Date().toISOString();
    const id = reconData._id !== undefined && reconData._id !== null
      ? reconData._id
      : (reconData.id !== undefined && reconData.id !== null ? reconData.id : ('RECON_' + Date.now() + '_' + Math.floor(Math.random() * 1000)));

    const openingBalance = Number(reconData.opening_balance !== undefined ? reconData.opening_balance : (reconData.openingBalance || 0));
    const otherCashSales = Number(reconData.other_cash_sales !== undefined ? reconData.other_cash_sales : (reconData.otherCashSale || 0));
    const otherCreditSales = Number(reconData.other_credit_sales !== undefined ? reconData.other_credit_sales : (reconData.otherCreditSale || 0));
    const digitalSettlements = Number(reconData.digital_settlements !== undefined ? reconData.digital_settlements : (reconData.digitalSettlementsTotal || 0));
    const closingBalance = reconData.closing_balance !== undefined
      ? Number(reconData.closing_balance)
      : (reconData.closingBalance !== undefined ? Number(reconData.closingBalance) : (openingBalance + otherCashSales + digitalSettlements - otherCreditSales));

    const syncStatus = reconData.sync_status !== undefined
      ? Number(reconData.sync_status)
      : (reconData.syncStatus !== undefined ? Number(reconData.syncStatus) : 0);

    const record = {
      _id: id,
      id,
      businessId: targetBizId,
      business_id: targetBizId,
      time: reconData.time || nowIso,
      opening_balance: openingBalance,
      openingBalance,
      other_cash_sales: otherCashSales,
      otherCashSale: otherCashSales,
      other_credit_sales: otherCreditSales,
      otherCreditSale: otherCreditSales,
      digital_settlements: digitalSettlements,
      digitalSettlements,
      closing_balance: closingBalance,
      closingBalance,
      sync_status: syncStatus,
      syncStatus,
      createDate: reconData.createDate || nowIso,
      updateDate: nowIso,
    };

    let saved = null;
    await this.mutateCollection('reconciliations', (list) => {
      saved = record;
      return [record, ...list];
    });

    return { success: true, reconciliation: saved };
  }

  /**
   * Queries reconciliations with optional filtering.
   */
  getReconciliations(businessId = null, options = {}) {
    const store = this.currentStore || {};
    const targetBizId = businessId ? String(businessId) : null;
    const list = Array.isArray(store.reconciliations) ? store.reconciliations : [];

    let filtered = list.filter((r) => {
      if (targetBizId && String(r.businessId || '1') !== targetBizId) return false;
      if (options.sync_status !== undefined && options.sync_status !== null) {
        const targetSync = Number(options.sync_status);
        const itemSync = Number(r.sync_status !== undefined ? r.sync_status : r.syncStatus);
        if (itemSync !== targetSync) return false;
      }
      if (options.startDate) {
        const itemDate = new Date(r.time || r.createDate || 0).getTime();
        const start = new Date(options.startDate).getTime();
        if (itemDate < start) return false;
      }
      if (options.endDate) {
        const itemDate = new Date(r.time || r.createDate || 0).getTime();
        const end = new Date(options.endDate).getTime();
        if (itemDate > end) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.time || a.createDate || 0).getTime();
      const dateB = new Date(b.time || b.createDate || 0).getTime();
      return dateB - dateA;
    });

    const totalCount = filtered.length;
    const offset = Math.max(0, parseInt(options.offset, 10) || 0);
    const limit = Math.max(1, parseInt(options.limit, 10) || 50);
    const paginated = filtered.slice(offset, offset + limit);
    const hasMore = offset + paginated.length < totalCount;

    return {
      items: paginated,
      reconciliations: paginated,
      totalCount,
      offset,
      limit,
      hasMore,
    };
  }

  /**
   * Retrieves pending un-synced reconciliations (sync_status === 0).
   */
  getUnsyncedReconciliations(businessId = null) {
    const store = this.currentStore || {};
    const targetBizId = businessId ? String(businessId) : null;
    const list = Array.isArray(store.reconciliations) ? store.reconciliations : [];
    return list.filter((r) =>
      Number(r.sync_status !== undefined ? r.sync_status : r.syncStatus) === 0 &&
      (!targetBizId || String(r.businessId || '1') === targetBizId)
    );
  }

  /**
   * Marks batch reconciliation IDs as synced (sync_status = 1).
   */
  async markReconciliationsSynced(businessId = null, ids = []) {
    const idSet = new Set((Array.isArray(ids) ? ids : [ids]).map(String));
    const store = this.currentStore || {};
    const targetBizId = businessId ? String(businessId) : null;
    let count = 0;
    const nowIso = new Date().toISOString();
    await this.mutateCollection('reconciliations', (list) => {
      for (const item of list) {
        const itemId = String(item._id !== undefined ? item._id : item.id);
        if (idSet.has(itemId) && (!targetBizId || String(item.businessId || '1') === targetBizId)) {
          item.sync_status = 1;
          item.syncStatus = 1;
          item.updateDate = nowIso;
          count++;
        }
      }
      return list;
    });
    return { success: true, count };
  }

  /**
   * Retrieves Auto-Disbursement configuration for a business.
   */
  getAutoDisbursementConfig(businessId = null) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const configMap = (store.autoDisbursementConfig && typeof store.autoDisbursementConfig === 'object')
      ? store.autoDisbursementConfig
      : {};
    const existing = configMap[targetBizId];
    if (existing) {
      return {
        businessId: targetBizId,
        isAutoDisbursementEnabled: false,
        linkedBankAccountId: null,
        minThresholdPaisa: 50000,
        minThresholdTaka: 500.0,
        payoutTime: '23:00',
        preferInstant: false,
        ...existing,
      };
    }
    return {
      businessId: targetBizId,
      isAutoDisbursementEnabled: false,
      linkedBankAccountId: null,
      minThresholdPaisa: 50000,
      minThresholdTaka: 500.0,
      payoutTime: '23:00',
      preferInstant: false,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Saves Auto-Disbursement configuration for a business.
   */
  async saveAutoDisbursementConfig(businessId = null, config = {}) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const nowIso = new Date().toISOString();
    let updatedConfig = null;

    const res = await this.mutateStore((prevStore) => {
      const prevMap = (prevStore.autoDisbursementConfig && typeof prevStore.autoDisbursementConfig === 'object')
        ? prevStore.autoDisbursementConfig
        : {};
      const current = prevMap[targetBizId] || {
        businessId: targetBizId,
        isAutoDisbursementEnabled: false,
        linkedBankAccountId: null,
        minThresholdPaisa: 50000,
        minThresholdTaka: 500.0,
        payoutTime: '23:00',
        preferInstant: false,
      };
      const merged = {
        ...current,
        ...config,
        businessId: targetBizId,
        updatedAt: nowIso,
      };
      if (config.minThresholdPaisa !== undefined && config.minThresholdTaka === undefined) {
        merged.minThresholdTaka = Number(config.minThresholdPaisa) / 100;
      } else if (config.minThresholdTaka !== undefined && config.minThresholdPaisa === undefined) {
        merged.minThresholdPaisa = Math.round(Number(config.minThresholdTaka) * 100);
      }
      updatedConfig = merged;
      return {
        ...prevStore,
        autoDisbursementConfig: {
          ...prevMap,
          [targetBizId]: merged,
        },
      };
    });

    if (res && res.success !== false) {
      return { success: true, config: updatedConfig };
    }
    return { success: false, error: res?.error || 'MUTATION_FAILED' };
  }

  /**
   * REA-ITER-231: Saves or updates wallet security credentials for a business.
   */
  async saveWalletSecurityCredentials(businessId = null, credentials = {}) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const nowIso = new Date().toISOString();

    const record = {
      id: credentials.id || `CRED_${targetBizId}`,
      businessId: targetBizId,
      storedPinHash: credentials.storedPinHash || credentials.pinHash || null,
      salt: credentials.salt || 'jrhwesdfbmnew',
      previousPins: Array.isArray(credentials.previousPins) ? credentials.previousPins : [],
      failedAttempts: Number(credentials.failedAttempts) || 0,
      lockoutUntil: credentials.lockoutUntil || null,
      tempLockoutMinutes: Number(credentials.tempLockoutMinutes) || 60,
      biometricEnabled: Boolean(credentials.biometricEnabled),
      biometricPublicKey: credentials.biometricPublicKey || null,
      activeDeviceId: credentials.activeDeviceId || 'DEV_INIT_001',
      activeWalletNo: credentials.activeWalletNo || '01712345678',
      createDate: credentials.createDate || nowIso,
      updateDate: nowIso,
    };

    let saved = null;
    await this.mutateCollection('walletSecurityCredentials', (list) => {
      const remaining = list.filter((c) => String(c.businessId || '1') !== targetBizId);
      saved = record;
      return [record, ...remaining];
    });

    return { success: true, credentials: saved };
  }

  /**
   * REA-ITER-231: Retrieves wallet security credentials for a business.
   */
  getWalletSecurityCredentials(businessId = null) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const list = Array.isArray(store.walletSecurityCredentials) ? store.walletSecurityCredentials : [];
    const found = list.find((c) => String(c.businessId || '1') === targetBizId);
    if (found) {
      return { ...found };
    }
    return {
      id: `CRED_${targetBizId}`,
      businessId: targetBizId,
      storedPinHash: null,
      salt: 'jrhwesdfbmnew',
      previousPins: [],
      failedAttempts: 0,
      lockoutUntil: null,
      tempLockoutMinutes: 60,
      biometricEnabled: false,
      biometricPublicKey: null,
      activeDeviceId: 'DEV_INIT_001',
      activeWalletNo: '01712345678',
    };
  }

  /**
   * REA-ITER-231: Registers or updates a device binding.
   * Enforces single active device policy: invalidates prior active device for the same business/wallet.
   */
  async registerDeviceBinding(businessId = null, binding = {}) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const nowIso = new Date().toISOString();

    const deviceId = binding.deviceId || binding.id || `DEV_${Date.now()}`;
    const record = {
      id: deviceId,
      deviceId,
      businessId: targetBizId,
      mobileNumber: binding.mobileNumber || '01712345678',
      walletNo: binding.walletNo || binding.mobileNumber || '01712345678',
      deviceName: binding.deviceName || 'Android Device',
      status: 'ACTIVE',
      boundAt: binding.boundAt || nowIso,
      updateDate: nowIso,
    };

    let invalidatedDeviceId = null;
    let saved = null;

    await this.mutateCollection('deviceBindings', (list) => {
      const updated = list.map((d) => {
        if (String(d.businessId || '1') === targetBizId && d.status === 'ACTIVE' && String(d.deviceId) !== String(deviceId)) {
          invalidatedDeviceId = d.deviceId;
          return { ...d, status: 'INACTIVE', invalidatedAt: nowIso, updateDate: nowIso };
        }
        return d;
      });

      const remaining = updated.filter((d) => String(d.deviceId) !== String(deviceId));
      saved = record;
      return [record, ...remaining];
    });

    return {
      success: true,
      binding: saved,
      previousDeviceInvalidated: invalidatedDeviceId,
    };
  }

  /**
   * REA-ITER-231: Retrieves all device bindings for a business.
   */
  getDeviceBindings(businessId = null, options = {}) {
    const store = this.currentStore || {};
    const targetBizId = businessId ? String(businessId) : null;
    const list = Array.isArray(store.deviceBindings) ? store.deviceBindings : [];

    let filtered = list.filter((d) => {
      if (targetBizId && String(d.businessId || '1') !== targetBizId) return false;
      if (options.status && String(d.status).toUpperCase() !== String(options.status).toUpperCase()) return false;
      return true;
    });

    filtered.sort((a, b) => new Date(b.boundAt || b.updateDate || 0) - new Date(a.boundAt || a.updateDate || 0));
    return filtered;
  }

  /**
   * REA-ITER-231: Retrieves active device binding for a business.
   */
  getActiveDeviceBinding(businessId = null) {
    const store = this.currentStore || {};
    const targetBizId = String(businessId || store.activeBusinessId || '1');
    const list = Array.isArray(store.deviceBindings) ? store.deviceBindings : [];
    return list.find((d) => String(d.businessId || '1') === targetBizId && d.status === 'ACTIVE') || null;
  }

  /**
   * REA-ITER-231: Revokes a device binding.
   */
  async revokeDeviceBinding(businessId = null, deviceId = null) {
    if (!deviceId) return { success: false, error: 'DEVICE_ID_REQUIRED' };
    const store = this.currentStore || {};
    const targetBizId = businessId ? String(businessId) : null;
    const targetDevId = String(deviceId);
    const nowIso = new Date().toISOString();
    let count = 0;

    await this.mutateCollection('deviceBindings', (list) => {
      return list.map((d) => {
        if (String(d.deviceId) === targetDevId && (!targetBizId || String(d.businessId || '1') === targetBizId)) {
          count++;
          return { ...d, status: 'REVOKED', revokedAt: nowIso, updateDate: nowIso };
        }
        return d;
      });
    });

    return { success: true, revokedCount: count };
  }


    /**
     * REA-ITER-232: Saves or updates a linked commercial bank account.
     */
    async saveLinkedBankAccount(businessId = null, accountData = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      const nowIso = new Date().toISOString();

      const existingAccounts = (store.linkedBankAccounts || []).filter(
        (a) => String(a.businessId || '1') === targetBizId
      );
      const isFirst = existingAccounts.length === 0;

      const recordId = accountData.id || ('LBA_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
      const testDepositPaisa = accountData.testDepositPaisa !== undefined
        ? Number(accountData.testDepositPaisa)
        : Math.floor(Math.random() * 90) + 10;

      const shouldBeDefault = accountData.isDefaultPayout !== undefined
        ? Boolean(accountData.isDefaultPayout)
        : isFirst;

      const record = {
        id: recordId,
        businessId: targetBizId,
        bankCode: accountData.bankCode || '',
        bankName: accountData.bankName || '',
        bankNameBn: accountData.bankNameBn || '',
        branchName: accountData.branchName || '',
        routingNumber: String(accountData.routingNumber || ''),
        accountNumber: String(accountData.accountNumber || ''),
        accountHolderName: accountData.accountHolderName || '',
        accountType: accountData.accountType || 'SAVINGS',
        status: accountData.status || 'PENDING_VERIFICATION',
        testDepositPaisa,
        verificationAttempts: Number(accountData.verificationAttempts) || 0,
        isDefaultPayout: shouldBeDefault,
        createDate: accountData.createDate || nowIso,
        updateDate: nowIso,
      };

      let saved = null;
      await this.mutateCollection('linkedBankAccounts', (list) => {
        const withoutCurrent = list.filter((a) => a.id !== recordId);
        let updatedList = withoutCurrent.map((a) => {
          if (String(a.businessId || '1') === targetBizId && shouldBeDefault) {
            return { ...a, isDefaultPayout: false, updateDate: nowIso };
          }
          return a;
        });
        saved = record;
        return [record, ...updatedList];
      });

      return { success: true, account: saved };
    }

    /**
     * REA-ITER-232: Retrieves linked bank accounts for a business.
     */
    getLinkedBankAccounts(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let list = (store.linkedBankAccounts || []).filter(
        (a) => String(a.businessId || '1') === targetBizId
      );

      if (options.status) {
        list = list.filter((a) => a.status === options.status);
      }

      list.sort((a, b) => {
        if (a.isDefaultPayout && !b.isDefaultPayout) return -1;
        if (!a.isDefaultPayout && b.isDefaultPayout) return 1;
        return new Date(b.createDate || 0) - new Date(a.createDate || 0);
      });

      return {
        items: list,
        accounts: list,
        totalCount: list.length,
      };
    }

    /**
     * REA-ITER-232: Retrieves single linked bank account by ID.
     */
    getLinkedBankAccountById(businessId = null, id = null) {
      if (!id) return null;
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const found = (store.linkedBankAccounts || []).find(
        (a) => a.id === id && (!targetBizId || String(a.businessId || '1') === targetBizId)
      );
      return found ? { ...found } : null;
    }

    /**
     * REA-ITER-232: Deletes / unlinks a bank account with auto-disbursement safety guard.
     */
    async deleteLinkedBankAccount(businessId = null, accountId = null) {
      if (!accountId) return { success: false, error: 'ACCOUNT_ID_REQUIRED' };
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');

      const existing = (store.linkedBankAccounts || []).find(
        (a) => a.id === accountId && String(a.businessId || '1') === targetBizId
      );
      if (!existing) {
        return { success: false, error: 'ACCOUNT_NOT_FOUND', message: 'ব্যাংক একাউন্টটি পাওয়া যায়নি।' };
      }

      // Check auto-disbursement protection
      const autoConfig = store.autoDisbursementConfig && store.autoDisbursementConfig[targetBizId];
      if (autoConfig && autoConfig.isAutoDisbursementEnabled && autoConfig.linkedBankAccountId === accountId) {
        return {
          success: false,
          error: 'CANNOT_DELETE_ACTIVE_AUTODISBURSEMENT_ACCOUNT',
          message: 'স্বয়ংক্রিয় ব্যাংক ট্রান্সফার চালু থাকায় এই একাউন্টটি মুছে ফেলা সম্ভব নয়।',
        };
      }

      let promotedNext = null;
      await this.mutateCollection('linkedBankAccounts', (list) => {
        const remaining = list.filter((a) => a.id !== accountId);
        if (existing.isDefaultPayout) {
          const nextVerified = remaining.find(
            (a) => String(a.businessId || '1') === targetBizId && a.status === 'VERIFIED'
          );
          if (nextVerified) {
            promotedNext = nextVerified.id;
            return remaining.map((a) => (a.id === nextVerified.id ? { ...a, isDefaultPayout: true } : a));
          }
        }
        return remaining;
      });

      return { success: true, deletedId: accountId, promotedDefaultId: promotedNext };
    }

    /**
     * REA-ITER-232: Sets a verified bank account as the default payout account.
     */
    async setDefaultBankAccount(businessId = null, accountId = null) {
      if (!accountId) return { success: false, error: 'ACCOUNT_ID_REQUIRED' };
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');

      const existing = (store.linkedBankAccounts || []).find(
        (a) => a.id === accountId && String(a.businessId || '1') === targetBizId
      );
      if (!existing) {
        return { success: false, error: 'ACCOUNT_NOT_FOUND', message: 'ব্যাংক একাউন্টটি পাওয়া যায়নি।' };
      }
      if (existing.status !== 'VERIFIED') {
        return {
          success: false,
          error: 'ACCOUNT_NOT_VERIFIED',
          message: 'শুধুমাত্র যাচাইকৃত ব্যাংক একাউন্ট ডিফল্ট হিসেবে সেট করা যাবে।',
        };
      }

      let updated = null;
      const nowIso = new Date().toISOString();
      await this.mutateCollection('linkedBankAccounts', (list) => {
        return list.map((a) => {
          if (String(a.businessId || '1') === targetBizId) {
            const isMatch = a.id === accountId;
            const rec = { ...a, isDefaultPayout: isMatch, updateDate: nowIso };
            if (isMatch) updated = rec;
            return rec;
          }
          return a;
        });
      });

      // Synchronize with auto-disbursement config if enabled
      if (typeof this.getAutoDisbursementConfig === 'function' && typeof this.saveAutoDisbursementConfig === 'function') {
        const autoConfig = this.getAutoDisbursementConfig(targetBizId);
        if (autoConfig && autoConfig.isAutoDisbursementEnabled) {
          await this.saveAutoDisbursementConfig(targetBizId, {
            ...autoConfig,
            linkedBankAccountId: accountId,
            linkedBankAccountNo: existing.accountNumber,
            linkedBankRoutingNo: existing.routingNumber,
            linkedAccountName: existing.accountHolderName,
          });
        }
      }

      return { success: true, account: updated };
    }

    /**
     * REA-ITER-232: Micro-deposit / penny deposit verification for a linked bank account.
     */
    async verifyLinkedBankAccount(businessId = null, accountId = null, depositPaisa = null) {
      if (!accountId) return { success: false, error: 'ACCOUNT_ID_REQUIRED' };
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');

      const existing = (store.linkedBankAccounts || []).find(
        (a) => a.id === accountId && String(a.businessId || '1') === targetBizId
      );
      if (!existing) {
        return { success: false, error: 'ACCOUNT_NOT_FOUND', message: 'ব্যাংক একাউন্টটি পাওয়া যায়নি।' };
      }
      if (existing.status === 'VERIFIED') {
        return { success: true, status: 'VERIFIED', account: existing };
      }

      const inputPaisa = Number(depositPaisa);
      const isMatch = existing.testDepositPaisa === inputPaisa;
      const nextAttempts = (existing.verificationAttempts || 0) + 1;
      let nextStatus = existing.status;

      if (isMatch) {
        nextStatus = 'VERIFIED';
      } else if (nextAttempts >= 3) {
        nextStatus = 'REJECTED';
      }

      const nowIso = new Date().toISOString();
      let updated = null;
      await this.mutateCollection('linkedBankAccounts', (list) => {
        return list.map((a) => {
          if (a.id === accountId) {
            updated = {
              ...a,
              status: nextStatus,
              verificationAttempts: nextAttempts,
              verifiedAt: isMatch ? nowIso : a.verifiedAt,
              updateDate: nowIso,
            };
            return updated;
          }
          return a;
        });
      });

      if (isMatch) {
        return { success: true, status: 'VERIFIED', account: updated };
      } else {
        return {
          success: false,
          error: 'DEPOSIT_MISMATCH',
          status: nextStatus,
          remainingAttempts: Math.max(0, 3 - nextAttempts),
          message: nextStatus === 'REJECTED'
            ? '৩ বার ভুল ডিপোজিট অ্যামাউন্ট দেওয়ার কারণে একাউন্টটি বাতিল করা হয়েছে।'
            : 'প্রদত্ত ডিপোজিট অ্যামাউন্ট মিলছে না। সঠিক পরিমাণ দিন।',
        };
      }
    }

    /**
     * REA-ITER-232: Saves a linked MFS mobile banking wallet (bKash, Nagad, Rocket, Upay).
     */
    async saveLinkedMfsAccount(businessId = null, mfsData = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      const nowIso = new Date().toISOString();

      const recordId = mfsData.id || ('MFS_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
      const record = {
        id: recordId,
        businessId: targetBizId,
        operator: mfsData.operator || 'BKASH',
        operatorName: mfsData.operatorName || mfsData.operator || 'bKash',
        mobileNumber: String(mfsData.mobileNumber || ''),
        accountHolderName: mfsData.accountHolderName || '',
        status: mfsData.status || 'VERIFIED',
        linkedAt: mfsData.linkedAt || nowIso,
        updateDate: nowIso,
      };

      let saved = null;
      await this.mutateCollection('linkedMfsAccounts', (list) => {
        const withoutCurrent = list.filter((m) => m.id !== recordId);
        saved = record;
        return [record, ...withoutCurrent];
      });

      return { success: true, mfs: saved };
    }

    /**
     * REA-ITER-232: Retrieves linked MFS mobile banking accounts for a business.
     */
    getLinkedMfsAccounts(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let list = (store.linkedMfsAccounts || []).filter(
        (m) => String(m.businessId || '1') === targetBizId
      );

      if (options.operator) {
        list = list.filter((m) => m.operator === options.operator);
      }

      list.sort((a, b) => new Date(b.linkedAt || 0) - new Date(a.linkedAt || 0));

      return {
        items: list,
        mfsAccounts: list,
        totalCount: list.length,
      };
    }

    /**
     * REA-ITER-232: Retrieves single linked MFS account by ID.
     */
    getLinkedMfsAccountById(businessId = null, id = null) {
      if (!id) return null;
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const found = (store.linkedMfsAccounts || []).find(
        (m) => m.id === id && (!targetBizId || String(m.businessId || '1') === targetBizId)
      );
      return found ? { ...found } : null;
    }

    /**
     * REA-ITER-232: Deletes a linked MFS account.
     */
    async deleteLinkedMfsAccount(businessId = null, id = null) {
      if (!id) return { success: false, error: 'ID_REQUIRED' };
      let removed = false;
      await this.mutateCollection('linkedMfsAccounts', (list) => {
        const filtered = list.filter((m) => m.id !== id);
        if (filtered.length !== list.length) removed = true;
        return filtered;
      });
      return { success: removed, deletedId: id };
    }

    /**
     * REA-ITER-233: Saves or updates a tokenized card in savedCards collection.
     */
    async saveCard(businessId = null, cardData = {}) {
      if (!cardData || typeof cardData !== "object") {
        return { success: false, error: "INVALID_CARD_DATA" };
      }
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || "1");
      const cardId = cardData.id || cardData.cardId || ("CRD_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8));

      const rawNum = String(cardData.cardNumber || cardData.maskedNumber || cardData.maskedCardNumber || "").replace(/[\s-]+/g, "");
      const maskedNumber = rawNum.length > 4 ? "**** **** **** " + rawNum.slice(-4) : "**** **** **** ****";

      let cardNetwork = cardData.cardNetwork;
      if (!cardNetwork || cardNetwork === "UNKNOWN") {
        if (tallyPayService && typeof tallyPayService.detectCardNetwork === "function") {
          cardNetwork = tallyPayService.detectCardNetwork(rawNum);
        } else {
          cardNetwork = "UNKNOWN";
        }
      }

      const nowIso = new Date().toISOString();
      const record = {
        id: cardId,
        cardId,
        businessId: targetBizId,
        cardHolderName: String(cardData.cardHolderName || "Cardholder").trim(),
        cardNumber: maskedNumber,
        maskedNumber,
        maskedCardNumber: maskedNumber,
        cardNetwork: cardNetwork || "UNKNOWN",
        cardType: cardData.cardType || "DEBIT",
        expiryMonth: String(cardData.expiryMonth || "12"),
        expiryYear: String(cardData.expiryYear || "28"),
        isDefault: Boolean(cardData.isDefault),
        createdAt: cardData.createdAt || nowIso,
        updatedAt: nowIso,
      };

      let saved = null;
      await this.mutateCollection("savedCards", (list) => {
        const withoutCurrent = (list || []).filter((c) => c.id !== cardId && c.cardId !== cardId);
        let updatedList = withoutCurrent;
        if (record.isDefault) {
          updatedList = withoutCurrent.map((c) => {
            if (String(c.businessId || "1") === targetBizId) {
              return { ...c, isDefault: false };
            }
            return c;
          });
        }
        saved = record;
        return [record, ...updatedList];
      });

      return { success: true, card: saved };
    }

    /**
     * REA-ITER-233: Retrieves saved cards for a business.
     */
    getSavedCards(businessId = null) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || "1");
      const list = (store.savedCards || []).filter(
        (c) => String(c.businessId || "1") === targetBizId
      );

      list.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      return {
        items: list,
        cards: list,
        totalCount: list.length,
      };
    }

    /**
     * REA-ITER-233: Retrieves a saved card by ID for a business.
     */
    getSavedCardById(businessId = null, cardId = null) {
      if (!cardId) return null;
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const found = (store.savedCards || []).find(
        (c) => (c.id === cardId || c.cardId === cardId) && (!targetBizId || String(c.businessId || "1") === targetBizId)
      );
      return found ? { ...found } : null;
    }

    /**
     * REA-ITER-233: Deletes a saved card for a business.
     */
    async deleteCard(businessId = null, cardId = null) {
      if (!cardId) return { success: false, error: "CARD_ID_REQUIRED" };
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || "1");
      let removed = false;

      await this.mutateCollection("savedCards", (list) => {
        const filtered = (list || []).filter(
          (c) => !((c.id === cardId || c.cardId === cardId) && String(c.businessId || "1") === targetBizId)
        );
        if (filtered.length !== (list || []).length) removed = true;
        return filtered;
      });

      if (!removed) {
        return { success: false, reason: "CARD_NOT_FOUND", error: "CARD_NOT_FOUND", message: "কার্ডটি পাওয়া যায়নি।" };
      }
      return { success: true, deletedId: cardId };
    }
    /**
     * REA-ITER-234: Saves a wallet transfer / money out record for a business.
     */
    async saveTransferRecord(businessId = null, recordData = {}) {
      if (!recordData || typeof recordData !== 'object') {
        return { success: false, error: 'RECORD_DATA_REQUIRED' };
      }
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      const transferId = recordData.id || recordData.transferId || ('TRX-' + Date.now() + '-' + Math.floor(Math.random() * 10000));
      const orderId = recordData.orderId || ('TRX-OUT-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
      const nowIso = new Date().toISOString();

      const record = {
        ...recordData,
        id: transferId,
        transferId,
        orderId,
        businessId: targetBizId,
        createdAt: recordData.createdAt || recordData.timestamp || nowIso,
        timestamp: recordData.timestamp || recordData.createdAt || nowIso,
        createDate: recordData.createDate || nowIso.slice(0, 10),
        status: recordData.status || 'SUCCESS',
      };

      let saved = null;
      await this.mutateCollection('transferHistory', (list) => {
        const withoutCurrent = (list || []).filter((t) => t.id !== transferId && t.transferId !== transferId);
        saved = record;
        return [record, ...withoutCurrent];
      });

      return { success: true, transfer: saved, record: saved };
    }

    /**
     * REA-ITER-234: Retrieves transfer history for a business with optional filtering and pagination.
     */
    getTransferHistory(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let list = (store.transferHistory || []).filter(
        (t) => String(t.businessId || '1') === targetBizId
      );

      if (options.channel) {
        const ch = String(options.channel).toUpperCase();
        list = list.filter((t) => String(t.channel || '').toUpperCase() === ch || String(t.channelType || '').toUpperCase() === ch);
      }
      if (options.status) {
        const st = String(options.status).toUpperCase();
        list = list.filter((t) => String(t.status || '').toUpperCase() === st);
      }
      if (options.startDate) {
        const start = new Date(options.startDate).getTime();
        list = list.filter((t) => new Date(t.timestamp || t.createdAt || 0).getTime() >= start);
      }
      if (options.endDate) {
        const end = new Date(options.endDate).getTime();
        list = list.filter((t) => new Date(t.timestamp || t.createdAt || 0).getTime() <= end);
      }
      if (options.searchQuery || options.query || options.search) {
        const q = String(options.searchQuery || options.query || options.search).toLowerCase();
        list = list.filter((t) =>
          String(t.orderId || '').toLowerCase().includes(q) ||
          String(t.recipient || '').toLowerCase().includes(q) ||
          String(t.recipientMobile || '').toLowerCase().includes(q) ||
          String(t.customerName || '').toLowerCase().includes(q) ||
          String(t.note || '').toLowerCase().includes(q)
        );
      }

      list.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));

      const totalCount = list.length;
      const offset = Number(options.offset) || 0;
      const limit = Number(options.limit) || 50;
      const paginated = list.slice(offset, offset + limit);

      const totalAmountPaisa = list.reduce((acc, t) => acc + (Number(t.amountPaisa) || Math.round((Number(t.amount) || 0) * 100)), 0);
      const totalFeePaisa = list.reduce((acc, t) => acc + (Number(t.feePaisa) || Math.round((Number(t.fee) || 0) * 100)), 0);

      return {
        items: paginated,
        transfers: paginated,
        totalCount,
        offset,
        limit,
        hasMore: offset + limit < totalCount,
        totalAmountPaisa,
        totalFeePaisa,
      };
    }

    /**
     * REA-ITER-234: Retrieves a transfer record by ID for a business.
     */
    getTransferById(businessId = null, transferId = null) {
      if (!transferId) return null;
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const found = (store.transferHistory || []).find(
        (t) => (t.id === transferId || t.transferId === transferId || t.orderId === transferId) &&
               (!targetBizId || String(t.businessId || '1') === targetBizId)
      );
      return found ? { ...found } : null;
    }

    /**
     * REA-ITER-235: Saves a mobile recharge record to storage.
     */
    async saveRechargeRecord(businessId = null, record = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      const rechargeId = record.id || record.rechargeId || `RC_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const entry = {
        id: rechargeId,
        rechargeId,
        businessId: targetBizId,
        mobileNumber: record.mobileNumber || '',
        operator: record.operator || 'GP',
        connectionType: record.connectionType || 'PREPAID',
        amountPaisa: Number(record.amountPaisa || 0),
        commissionPaisa: Number(record.commissionPaisa || 0),
        isPackage: Boolean(record.isPackage),
        packageId: record.packageId || null,
        packageName: record.packageName || null,
        packageCategory: record.packageCategory || null,
        validity: record.validity || null,
        status: record.status || 'SUCCESS',
        createdAt: record.createdAt || new Date().toISOString(),
        timestamp: record.timestamp || Date.now(),
        remarks: record.remarks || record.note || '',
      };

      let saved = null;
      await this.mutateCollection('rechargeHistory', (list) => {
        const withoutCurrent = (list || []).filter((r) => r.id !== rechargeId && r.rechargeId !== rechargeId);
        saved = entry;
        return [entry, ...withoutCurrent];
      });

      const result = saved ? { ...saved } : { ...entry };
      result.success = true;
      result.recharge = saved || entry;
      result.record = saved || entry;
      return result;
    }

    /**
     * REA-ITER-235: Retrieves recharge history with filtering and pagination.
     */
    getRechargeHistory(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let list = (store.rechargeHistory || []).filter(
        (r) => String(r.businessId || '1') === targetBizId
      );

      if (options.operator) {
        list = list.filter((r) => String(r.operator).toUpperCase() === String(options.operator).toUpperCase());
      }
      if (options.connectionType) {
        list = list.filter((r) => String(r.connectionType).toUpperCase() === String(options.connectionType).toUpperCase());
      }
      if (options.isPackage !== undefined) {
        list = list.filter((r) => Boolean(r.isPackage) === Boolean(options.isPackage));
      }
      if (options.startDate) {
        const sTime = new Date(options.startDate).getTime();
        list = list.filter((r) => new Date(r.createdAt || r.timestamp).getTime() >= sTime);
      }
      if (options.endDate) {
        const eTime = new Date(options.endDate).getTime();
        list = list.filter((r) => new Date(r.createdAt || r.timestamp).getTime() <= eTime);
      }

      if (options.searchQuery || options.query || options.search) {
        const q = String(options.searchQuery || options.query || options.search).toLowerCase();
        list = list.filter((r) =>
          String(r.mobileNumber || '').toLowerCase().includes(q) ||
          String(r.packageName || '').toLowerCase().includes(q) ||
          String(r.rechargeId || '').toLowerCase().includes(q) ||
          String(r.remarks || r.note || '').toLowerCase().includes(q)
        );
      }

      list.sort((a, b) => (b.timestamp || new Date(b.createdAt).getTime()) - (a.timestamp || new Date(a.createdAt).getTime()));

      const offset = Math.max(0, parseInt(options.offset || 0, 10));
      const limit = options.limit ? Math.max(1, parseInt(options.limit, 10)) : list.length;
      const paginated = list.slice(offset, offset + limit).map((r) => ({ ...r }));
      paginated.items = paginated;
      paginated.recharges = paginated;
      paginated.totalCount = list.length;
      paginated.offset = offset;
      paginated.limit = limit;
      paginated.hasMore = offset + limit < list.length;
      paginated.totalAmountPaisa = list.reduce((sum, r) => sum + Number(r.amountPaisa || 0), 0);
      paginated.totalCommissionPaisa = list.reduce((sum, r) => sum + Number(r.commissionPaisa || 0), 0);
      return paginated;
    }

    /**
     * REA-ITER-235: Retrieves a single recharge record by ID.
     */
    getRechargeById(businessId = null, rechargeId = null) {
      if (!rechargeId) return null;
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const found = (store.rechargeHistory || []).find(
        (r) => (r.id === rechargeId || r.rechargeId === rechargeId) &&
               (!targetBizId || String(r.businessId || '1') === targetBizId)
      );
      return found ? { ...found } : null;
    }

    /**
     * REA-ITER-236: Saves a transaction settlement action record with uniqueness check on transaction_number.
     */
    async saveTransactionSettlementAction(businessId = null, actionRecord = {}) {
      if (!actionRecord || typeof actionRecord !== 'object') {
        return { success: false, error: 'INVALID_RECORD' };
      }
      const store = this.currentStore || {};
      const targetBizId = String(businessId || actionRecord.businessId || store.activeBusinessId || '1');
      const txnNumber = String(actionRecord.transaction_number || actionRecord.transactionNumber || actionRecord.txnNumber || '').trim();
      if (!txnNumber) {
        return { success: false, error: 'TRANSACTION_NUMBER_REQUIRED' };
      }

      const list = Array.isArray(store.transactionSettlementActions) ? store.transactionSettlementActions : [];
      const existing = list.find((a) =>
        String(a.transaction_number || a.transactionNumber) === txnNumber &&
        String(a.businessId || '1') === targetBizId
      );
      if (existing) {
        return {
          success: false,
          duplicate: true,
          reason: 'DUPLICATE_TRANSACTION',
          error: 'DUPLICATE_TRANSACTION',
          existing,
        };
      }

      const id = actionRecord.id !== undefined && actionRecord.id !== null
        ? Number(actionRecord.id)
        : (list.length > 0 ? Math.max(...list.map((x) => Number(x.id) || 0)) + 1 : 1);
      const actionType = String(actionRecord.action_type || actionRecord.actionType || 'NO_ACTION').toUpperCase();
      const amountPaisa = actionRecord.amount_paisa !== undefined
        ? Math.round(Number(actionRecord.amount_paisa) || 0)
        : (actionRecord.amountPaisa !== undefined
          ? Math.round(Number(actionRecord.amountPaisa) || 0)
          : Math.round((Number(actionRecord.amount) || 0) * 100));
      const entry = {
        id,
        businessId: targetBizId,
        transaction_number: txnNumber,
        transactionNumber: txnNumber,
        action_type: actionType,
        actionType: actionType,
        amount_paisa: amountPaisa,
        amountPaisa,
        amount: amountPaisa / 100,
        synced: actionRecord.synced !== undefined ? Number(actionRecord.synced) : 0,
        create_date: actionRecord.create_date || actionRecord.createDate || new Date().toISOString(),
        update_date: actionRecord.update_date || actionRecord.updateDate || null,
      };

      let saved = null;
      await this.mutateCollection('transactionSettlementActions', (col) => {
        saved = entry;
        return [...(col || []), entry];
      });
      return { success: true, record: saved, id: entry.id };
    }

    /**
     * REA-ITER-236: Retrieves transaction settlement actions with optional sync and actionType filters.
     */
    getTransactionSettlementActions(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let list = (store.transactionSettlementActions || []).filter(
        (a) => String(a.businessId || '1') === targetBizId
      );

      if (options.synced !== undefined && options.synced !== null) {
        const syn = Number(options.synced);
        list = list.filter((a) => Number(a.synced) === syn);
      }
      if (options.actionType || options.action_type) {
        const act = String(options.actionType || options.action_type).toUpperCase();
        list = list.filter((a) => String(a.action_type || a.actionType).toUpperCase() === act);
      }

      list.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

      const offset = Number(options.offset) || 0;
      const limit = options.limit !== undefined ? Number(options.limit) : list.length;
      return list.slice(offset, offset + limit);
    }

    /**
     * REA-ITER-236: Retrieves a single settlement action by transaction number.
     */
    getTransactionSettlementActionByTxn(businessId = null, transactionNumber = '') {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      const txnNum = String(transactionNumber || '').trim();
      return (store.transactionSettlementActions || []).find(
        (a) => String(a.businessId || '1') === targetBizId &&
               String(a.transaction_number || a.transactionNumber) === txnNum
      ) || null;
    }

    /**
     * REA-ITER-236: Checks if a transaction settlement action exists (Room DAO exists query).
     */
    existsTransactionSettlementAction(businessId = null, transactionNumber = '') {
      return Boolean(this.getTransactionSettlementActionByTxn(businessId, transactionNumber));
    }

    /**
     * REA-ITER-236: Gets unsynced settlement actions (Room DAO getUnsyncedTxnSettlementActions).
     */
    getUnsyncedTxnSettlementActions(businessId = null, limit = 100) {
      return this.getTransactionSettlementActions(businessId, { synced: 0, limit });
    }

    /**
     * REA-ITER-236: Batch updates sync status by IDs (Room DAO updateTxnSettlementActionSyncStatusByIds).
     */
    async updateTxnSettlementActionSyncStatusByIds(businessId = null, synced = 1, ids = []) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      const idSet = new Set((ids || []).map(Number));
      let updatedCount = 0;

      await this.mutateCollection('transactionSettlementActions', (col) => {
        return (col || []).map((a) => {
          if (String(a.businessId || '1') === targetBizId && idSet.has(Number(a.id))) {
            updatedCount++;
            return {
              ...a,
              synced: Number(synced),
              update_date: new Date().toISOString(),
            };
          }
          return a;
        });
      });
      return updatedCount;
    }

    /**
     * REA-ITER-236: Resets all settlement actions to unsynced (Room DAO updateAllTxnSettlementActionUnsynced).
     */
    async updateAllTxnSettlementActionUnsynced(businessId = null) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let updatedCount = 0;

      await this.mutateCollection('transactionSettlementActions', (col) => {
        return (col || []).map((a) => {
          if (String(a.businessId || '1') === targetBizId) {
            updatedCount++;
            return {
              ...a,
              synced: 0,
              update_date: new Date().toISOString(),
            };
          }
          return a;
        });
      });
      return updatedCount;
    }

    /**
     * REA-ITER-236: Saves a settlement history record.
     */
    async saveSettlementHistoryRecord(businessId = null, record = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || record.businessId || store.activeBusinessId || '1');
      const entry = {
        id: record.id || 'SH_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        businessId: targetBizId,
        transactionNumber: record.transactionNumber || record.transaction_number || '',
        actionType: record.actionType || record.action_type || 'NO_ACTION',
        amountPaisa: Number(record.amountPaisa || 0),
        senderMobile: record.senderMobile || '',
        channel: record.channel || 'টালিপে',
        status: record.status || 'SETTLED',
        createdAt: record.createdAt || new Date().toISOString(),
        ...record,
      };

      let saved = null;
      await this.mutateCollection('settlementHistory', (col) => {
        saved = entry;
        return [...(col || []), entry];
      });
      return saved;
    }

    /**
     * REA-ITER-236: Retrieves settlement history records.
     */
    getSettlementHistory(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let list = (store.settlementHistory || []).filter(
        (s) => String(s.businessId || '1') === targetBizId
      );
      if (options.status) {
        list = list.filter((s) => s.status === options.status);
      }
      const offset = Number(options.offset) || 0;
      const limit = Number(options.limit) || list.length;
      return list.slice(offset, offset + limit);
    }

    /**
     * REA-ITER-236: Saves Soundbox hardware and diagnostics configuration.
     */
    async saveSoundboxConfig(businessId = null, config = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let updatedConfig = null;

      await this.mutateStore((prevStore) => {
        const prevMap = (prevStore.soundboxConfig && typeof prevStore.soundboxConfig === 'object')
          ? { ...prevStore.soundboxConfig }
          : {};
        const existing = prevMap[targetBizId] || {
          isConnected: false,
          connectionState: 'DISCONNECTED',
          volumeStep: 12,
          ttsEnabled: true,
          deviceId: 'SB-QR-001',
          deviceName: 'TallyPay Soundbox',
        };
        updatedConfig = {
          ...existing,
          ...config,
          businessId: targetBizId,
          updatedAt: new Date().toISOString(),
        };
        prevMap[targetBizId] = updatedConfig;
        return {
          ...prevStore,
          soundboxConfig: prevMap,
        };
      });
      return updatedConfig;
    }

    /**
     * REA-ITER-236: Retrieves Soundbox configuration for business.
     */
    getSoundboxConfig(businessId = null) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      const cfg = store.soundboxConfig && store.soundboxConfig[targetBizId];
      if (cfg) return { ...cfg };
      return {
        isConnected: false,
        connectionState: 'DISCONNECTED',
        volumeStep: 12,
        ttsEnabled: true,
        deviceId: 'SB-QR-001',
        deviceName: 'TallyPay Soundbox',
      };
    }

    /**
     * REA-ITER-237: Saves or updates merchant KYC record with uniqueness by business_id.
     */
    async saveMerchantKyc(businessId = null, kycRecord = {}) {
      if (!kycRecord || typeof kycRecord !== 'object') {
        return { success: false, error: 'INVALID_RECORD' };
      }
      const store = this.currentStore || {};
      const targetBizId = String(businessId || kycRecord.business_id || kycRecord.businessId || store.activeBusinessId || '1');
      const entry = {
        id: kycRecord.id || 'KYC_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        business_id: targetBizId,
        businessId: targetBizId,
        nid_number: String(kycRecord.nid_number || kycRecord.nidNumber || '').trim(),
        dob: String(kycRecord.dob || ''),
        name_bn: kycRecord.name_bn || kycRecord.nameBN || null,
        name_en: kycRecord.name_en || kycRecord.name || null,
        father_name: kycRecord.father_name || kycRecord.fatherName || null,
        mother_name: kycRecord.mother_name || kycRecord.motherName || null,
        nid_front_path: kycRecord.nid_front_path || kycRecord.nidFrontPath || null,
        nid_back_path: kycRecord.nid_back_path || kycRecord.nidBackPath || null,
        selfie_path: kycRecord.selfie_path || kycRecord.selfiePath || null,
        verification_status: kycRecord.verification_status || kycRecord.verificationStatus || 'INCOMPLETE',
        liveness_score: kycRecord.liveness_score !== undefined ? Number(kycRecord.liveness_score) : (kycRecord.livenessScore !== undefined ? Number(kycRecord.livenessScore) : null),
        synced: kycRecord.synced !== undefined ? Number(kycRecord.synced) : 0,
        create_date: kycRecord.create_date || kycRecord.createDate || new Date().toISOString(),
        update_date: new Date().toISOString(),
        ...kycRecord,
      };
      entry.business_id = targetBizId;
      entry.businessId = targetBizId;

      let saved = null;
      await this.mutateCollection('merchantKyc', (col) => {
        const list = Array.isArray(col) ? col : [];
        const idx = list.findIndex((k) => String(k.business_id || k.businessId || '1') === targetBizId);
        if (idx >= 0) {
          entry.id = list[idx].id;
          entry.create_date = list[idx].create_date || entry.create_date;
          const updated = [...list];
          updated[idx] = entry;
          saved = entry;
          return updated;
        } else {
          saved = entry;
          return [...list, entry];
        }
      });
      return { success: true, record: saved, id: entry.id };
    }

    /**
     * REA-ITER-237: Retrieves merchant KYC record by business ID.
     */
    getMerchantKycByBusinessId(businessId = null) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      const item = (store.merchantKyc || []).find(
        (k) => String(k.business_id || k.businessId || '1') === targetBizId
      );
      return item ? { ...item } : null;
    }

    /**
     * REA-ITER-237: Retrieves merchant KYC records with optional status or sync filter.
     */
    getMerchantKycList(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      let list = (store.merchantKyc || []);
      if (targetBizId) {
        list = list.filter((k) => String(k.business_id || k.businessId || '1') === targetBizId);
      }
      if (options.status || options.verification_status || options.verificationStatus) {
        const st = String(options.status || options.verification_status || options.verificationStatus).toUpperCase();
        list = list.filter((k) => String(k.verification_status || k.verificationStatus || '').toUpperCase() === st);
      }
      if (options.synced !== undefined && options.synced !== null) {
        const syn = Number(options.synced);
        list = list.filter((k) => Number(k.synced) === syn);
      }
      return list.map((k) => ({ ...k }));
    }

    /**
     * REA-ITER-237: Updates verification status and liveness score of merchant KYC record.
     */
    async updateMerchantKycStatus(businessId = null, status = 'PENDING', livenessScore = null) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let updatedRecord = null;
      await this.mutateCollection('merchantKyc', (col) => {
        return (col || []).map((k) => {
          if (String(k.business_id || k.businessId || '1') === targetBizId) {
            const upd = {
              ...k,
              verification_status: status,
              verificationStatus: status,
              update_date: new Date().toISOString(),
            };
            if (livenessScore !== null && livenessScore !== undefined) {
              upd.liveness_score = Number(livenessScore);
              upd.livenessScore = Number(livenessScore);
            }
            updatedRecord = upd;
            return upd;
          }
          return k;
        });
      });
      return { success: Boolean(updatedRecord), record: updatedRecord };
    }

    /**
     * REA-ITER-237: Retrieves unsynced merchant KYC records.
     */
    getUnsyncedMerchantKyc(businessId = null, limit = 100) {
      return this.getMerchantKycList(businessId, { synced: 0 }).slice(0, limit);
    }

    /**
     * REA-ITER-237: Updates sync status of merchant KYC record.
     */
    async updateMerchantKycSyncStatus(businessId = null, synced = 1) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let updatedCount = 0;
      await this.mutateCollection('merchantKyc', (col) => {
        return (col || []).map((k) => {
          if (String(k.business_id || k.businessId || '1') === targetBizId) {
            updatedCount++;
            return {
              ...k,
              synced: Number(synced),
              update_date: new Date().toISOString(),
            };
          }
          return k;
        });
      });
      return { success: true, updatedCount };
    }

    /**
     * REA-ITER-237: Checks if merchant KYC record exists for business ID.
     */
        /**
     * REA-ITER-237: Deletes merchant KYC record for business ID.
     */
    async deleteMerchantKyc(businessId = null) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let deleted = false;
      await this.mutateCollection('merchantKyc', (col) => {
        const list = Array.isArray(col) ? col : [];
        const nextList = list.filter((k) => String(k.business_id || k.businessId || '1') !== targetBizId);
        deleted = nextList.length < list.length;
        return nextList;
      });
      return { success: deleted };
    }

    existsMerchantKyc(businessId = null) {
      return Boolean(this.getMerchantKycByBusinessId(businessId));
    }

    // ========================================================================
    // REA-ITER-238: TallyPay Merchant QR Standee Order & Collateral Delivery
    // ========================================================================

    /**
     * REA-ITER-238: Saves or updates a merchant QR collateral order.
     */
    async saveMerchantQrOrder(businessId = null, orderData = {}) {
      if (!orderData || typeof orderData !== 'object') {
        return { success: false, error: 'INVALID_ORDER_DATA' };
      }
      const store = this.currentStore || {};
      const targetBizId = String(businessId || orderData.business_id || orderData.businessId || store.activeBusinessId || '1');
      const orderId = String(orderData.order_id || orderData.orderId || ('TK-QRO-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(100000 + Math.random() * 900000)));
      
      const entry = {
        id: orderData.id || ('QRO_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
        order_id: orderId,
        orderId: orderId,
        business_id: targetBizId,
        businessId: targetBizId,
        item_type: orderData.item_type || orderData.itemType,
        item_name: orderData.item_name || orderData.itemName,
        quantity: Number(orderData.quantity) || 1,
        unit_price_paisa: Number(orderData.unit_price_paisa !== undefined ? orderData.unit_price_paisa : orderData.unitPricePaisa) || 0,
        total_price_paisa: Number(orderData.total_price_paisa !== undefined ? orderData.total_price_paisa : orderData.totalPricePaisa) || 0,
        delivery_fee_paisa: Number(orderData.delivery_fee_paisa !== undefined ? orderData.delivery_fee_paisa : orderData.deliveryFeePaisa) || 0,
        payment_method: orderData.payment_method || orderData.paymentMethod || 'WALLET',
        payment_status: orderData.payment_status || orderData.paymentStatus || 'PENDING',
        order_status: orderData.order_status || orderData.orderStatus || 'PLACED',
        recipient_name: String(orderData.recipient_name || orderData.recipientName || '').trim(),
        recipient_phone: String(orderData.recipient_phone || orderData.recipientPhone || '').trim(),
        delivery_address: String(orderData.delivery_address || orderData.deliveryAddress || '').trim(),
        division: String(orderData.division || '').trim(),
        district: String(orderData.district || '').trim(),
        postal_code: orderData.postal_code || orderData.postalCode || null,
        courier_name: orderData.courier_name || orderData.courierName || null,
        tracking_code: orderData.tracking_code || orderData.trackingCode || null,
        synced: orderData.synced !== undefined ? Number(orderData.synced) : 0,
        create_date: orderData.create_date || orderData.createDate || new Date().toISOString(),
        update_date: new Date().toISOString(),
      };

      let saved = null;
      await this.mutateCollection('merchantQrOrders', (col) => {
        const list = Array.isArray(col) ? col : [];
        const idx = list.findIndex((o) => String(o.order_id || o.orderId) === orderId);
        if (idx >= 0) {
          const prev = list[idx];
          const merged = {
            ...prev,
            ...entry,
            id: prev.id,
            create_date: prev.create_date || entry.create_date,
            update_date: new Date().toISOString(),
          };
          if (!orderData.item_type && !orderData.itemType && prev.item_type) {
            merged.item_type = prev.item_type;
          }
          if (!orderData.item_name && !orderData.itemName && prev.item_name) {
            merged.item_name = prev.item_name;
          }
          if (!orderData.recipient_name && !orderData.recipientName && prev.recipient_name) {
            merged.recipient_name = prev.recipient_name;
          }
          if (!orderData.recipient_phone && !orderData.recipientPhone && prev.recipient_phone) {
            merged.recipient_phone = prev.recipient_phone;
          }
          if (!orderData.delivery_address && !orderData.deliveryAddress && prev.delivery_address) {
            merged.delivery_address = prev.delivery_address;
          }
          if (!orderData.division && prev.division) {
            merged.division = prev.division;
          }
          if (!orderData.district && prev.district) {
            merged.district = prev.district;
          }
          const updatedList = [...list];
          updatedList[idx] = merged;
          saved = merged;
          return updatedList;
        } else {
          saved = entry;
          return [...list, entry];
        }
      });
      return { success: true, record: saved, id: entry.order_id };
    }

    /**
     * REA-ITER-238: Retrieves a single merchant QR order by order ID.
     */
    getMerchantQrOrderById(businessId = null, orderId = null) {
      if (!orderId) return null;
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const targetOrderId = String(orderId);
      const item = (store.merchantQrOrders || []).find((o) => {
        const matchesId = String(o.order_id || o.orderId) === targetOrderId;
        if (!matchesId) return false;
        if (targetBizId) {
          return String(o.business_id || o.businessId || '1') === targetBizId;
        }
        return true;
      });
      return item ? { ...item } : null;
    }

    /**
     * REA-ITER-238: Retrieves merchant QR orders for a business with optional filtering, sorting, and pagination.
     */
    getMerchantQrOrdersByBusinessId(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let list = (store.merchantQrOrders || []).filter(
        (o) => String(o.business_id || o.businessId || '1') === targetBizId
      );

      if (options.status || options.order_status || options.orderStatus) {
        const st = String(options.status || options.order_status || options.orderStatus).toUpperCase();
        list = list.filter((o) => String(o.order_status || o.orderStatus || '').toUpperCase() === st);
      }
      if (options.itemType || options.item_type) {
        const it = String(options.itemType || options.item_type);
        list = list.filter((o) => (o.item_type || o.itemType) === it);
      }
      if (options.paymentStatus || options.payment_status) {
        const ps = String(options.paymentStatus || options.payment_status).toUpperCase();
        list = list.filter((o) => String(o.payment_status || o.paymentStatus || '').toUpperCase() === ps);
      }
      if (options.synced !== undefined && options.synced !== null) {
        const syn = Number(options.synced);
        list = list.filter((o) => Number(o.synced) === syn);
      }

      list.sort((a, b) => new Date(b.create_date || 0).getTime() - new Date(a.create_date || 0).getTime());

      const offset = Number(options.offset) || 0;
      const limit = options.limit !== undefined ? Number(options.limit) : list.length;
      return list.slice(offset, offset + limit).map((o) => ({ ...o }));
    }

    /**
     * REA-ITER-238: Updates order status and tracking information with transition validation.
     */
    async updateMerchantQrOrderStatus(businessId = null, orderId = null, status = 'CONFIRMED', trackingInfo = null) {
      if (!orderId) {
        return { success: false, error: 'MISSING_ORDER_ID' };
      }
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const targetOrderId = String(orderId);

      let existing = null;
      (store.merchantQrOrders || []).forEach((o) => {
        if (String(o.order_id || o.orderId) === targetOrderId) {
          if (!targetBizId || String(o.business_id || o.businessId || '1') === targetBizId) {
            existing = o;
          }
        }
      });

      if (!existing) {
        return { success: false, error: 'ORDER_NOT_FOUND' };
      }

      if (tallyPayService && typeof tallyPayService.transitionQrOrderStatus === 'function') {
        try {
          tallyPayService.transitionQrOrderStatus(existing.order_status, status, trackingInfo);
        } catch (err) {
          return { success: false, error: err.message };
        }
      }

      let updatedRecord = null;
      await this.mutateCollection('merchantQrOrders', (col) => {
        return (col || []).map((o) => {
          if (String(o.order_id || o.orderId) === targetOrderId) {
            const upd = {
              ...o,
              order_status: status,
              orderStatus: status,
              update_date: new Date().toISOString(),
              synced: 0,
            };
            if (trackingInfo && typeof trackingInfo === 'object') {
              if (trackingInfo.courierName || trackingInfo.courier_name) {
                upd.courier_name = trackingInfo.courierName || trackingInfo.courier_name;
              }
              if (trackingInfo.trackingCode || trackingInfo.tracking_code) {
                upd.tracking_code = trackingInfo.trackingCode || trackingInfo.tracking_code;
              }
            }
            if (status === 'DELIVERED' && (upd.payment_method === 'CASH_ON_DELIVERY' || upd.payment_method === 'COD')) {
              upd.payment_status = 'PAID';
              upd.paymentStatus = 'PAID';
            }
            updatedRecord = upd;
            return upd;
          }
          return o;
        });
      });
      return { success: Boolean(updatedRecord), record: updatedRecord };
    }

    /**
     * REA-ITER-238: Deletes an order by order ID and business ID.
     */
    async deleteMerchantQrOrder(businessId = null, orderId = null) {
      if (!orderId) return { success: false };
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const targetOrderId = String(orderId);
      let deleted = false;
      await this.mutateCollection('merchantQrOrders', (col) => {
        const list = Array.isArray(col) ? col : [];
        const nextList = list.filter((o) => {
          const matchId = String(o.order_id || o.orderId) === targetOrderId;
          if (!matchId) return true;
          if (targetBizId && String(o.business_id || o.businessId || '1') !== targetBizId) {
            return true;
          }
          return false;
        });
        deleted = nextList.length < list.length;
        return nextList;
      });
      return { success: deleted };
    }

    /**
     * REA-ITER-238: Retrieves unsynced merchant QR orders.
     */
    getUnsyncedMerchantQrOrders(businessId = null, limit = 100) {
      return this.getMerchantQrOrdersByBusinessId(businessId, { synced: 0 }).slice(0, limit);
    }

    /**
     * REA-ITER-238: Updates sync status of merchant QR order.
     */
    async updateMerchantQrOrderSyncStatus(businessId = null, orderId = null, synced = 1) {
      if (!orderId) return { success: false };
      const targetOrderId = String(orderId);
      const targetBizId = businessId ? String(businessId) : null;
      let updatedCount = 0;
      await this.mutateCollection('merchantQrOrders', (col) => {
        return (col || []).map((o) => {
          if (String(o.order_id || o.orderId) === targetOrderId) {
            if (!targetBizId || String(o.business_id || o.businessId || '1') === targetBizId) {
              updatedCount++;
              return {
                ...o,
                synced: Number(synced),
                update_date: new Date().toISOString(),
              };
            }
          }
          return o;
        });
      });
      return { success: true, updatedCount };
    }

    /**
     * REA-ITER-238: Checks if order exists by order ID.
     */
    existsMerchantQrOrder(businessId = null, orderId = null) {
      return Boolean(this.getMerchantQrOrderById(businessId, orderId));
    }


    // =========================================================================
    // REA-ITER-239: TallyPay Merchant Digital Micro-Loan & EMI Repayment Subsystem
    // =========================================================================

    /**
     * REA-ITER-239: Saves or updates a merchant digital loan.
     */
    async saveMerchantLoan(businessId = null, loanData = {}) {
      if (!loanData || typeof loanData !== 'object') {
        return { success: false, error: 'INVALID_LOAN_DATA' };
      }
      const store = this.currentStore || {};
      const targetBizId = String(businessId || loanData.business_id || loanData.businessId || store.activeBusinessId || '1');
      const loanId = String(loanData.loan_id || loanData.loanId || ('TK-LN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)));

      const entry = {
        ...loanData,
        id: loanData.id || ('LN_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
        loan_id: loanId,
        loanId: loanId,
        business_id: targetBizId,
        businessId: targetBizId,
        partner_bank: loanData.partner_bank || loanData.partnerBank || 'BRAC_BANK',
        principal_paisa: Number(loanData.principal_paisa !== undefined ? loanData.principal_paisa : loanData.principalPaisa) || 0,
        interest_rate_basis_points: Number(loanData.interest_rate_basis_points !== undefined ? loanData.interest_rate_basis_points : loanData.interestRateBps) || 900,
        tenure_months: Number(loanData.tenure_months !== undefined ? loanData.tenure_months : loanData.tenureMonths) || 6,
        total_payable_paisa: Number(loanData.total_payable_paisa !== undefined ? loanData.total_payable_paisa : loanData.totalPayablePaisa) || 0,
        monthly_emi_paisa: Number(loanData.monthly_emi_paisa !== undefined ? loanData.monthly_emi_paisa : loanData.monthlyEmiPaisa) || 0,
        disbursed_paisa: Number(loanData.disbursed_paisa !== undefined ? loanData.disbursed_paisa : loanData.disbursedPaisa) || 0,
        processing_fee_paisa: Number(loanData.processing_fee_paisa !== undefined ? loanData.processing_fee_paisa : loanData.processingFeePaisa) || 0,
        loan_status: loanData.loan_status || loanData.loanStatus || 'APPLIED',
        disbursement_date: loanData.disbursement_date || loanData.disbursementDate || null,
        repayment_start_date: loanData.repayment_start_date || loanData.repaymentStartDate || null,
        paid_paisa: Number(loanData.paid_paisa !== undefined ? loanData.paid_paisa : loanData.paidPaisa) || 0,
        remaining_paisa: Number(loanData.remaining_paisa !== undefined ? loanData.remaining_paisa : loanData.remainingPaisa) || 0,
        credit_score: Number(loanData.credit_score !== undefined ? loanData.credit_score : loanData.creditScore) || 300,
        created_at: loanData.created_at || loanData.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: loanData.synced !== undefined ? Number(loanData.synced) : 0,
      };

      let saved = null;
      await this.mutateCollection('merchantLoans', (col) => {
        const list = Array.isArray(col) ? col : [];
        const idx = list.findIndex((l) => String(l.loan_id || l.loanId) === loanId);
        if (idx >= 0) {
          const prev = list[idx];
          const merged = {
            ...prev,
            ...entry,
            id: prev.id || entry.id,
            created_at: prev.created_at || entry.created_at,
            updated_at: new Date().toISOString(),
          };
          list[idx] = merged;
          saved = { ...merged };
        } else {
          list.push(entry);
          saved = { ...entry };
        }
        return list;
      });

      return { success: true, loan: saved };
    }

    /**
     * REA-ITER-239: Retrieves a merchant loan by loan ID.
     */
    getMerchantLoanById(businessId = null, loanId = null) {
      if (!loanId) return null;
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const targetLoanId = String(loanId);
      const item = (store.merchantLoans || []).find((l) => {
        const matchesId = String(l.loan_id || l.loanId) === targetLoanId;
        if (!matchesId) return false;
        if (targetBizId) {
          return String(l.business_id || l.businessId || '1') === targetBizId;
        }
        return true;
      });
      return item ? { ...item } : null;
    }

    /**
     * REA-ITER-239: Retrieves merchant loans for a business with optional filtering.
     */
    getMerchantLoansByBusinessId(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let list = (store.merchantLoans || []).filter(
        (l) => String(l.business_id || l.businessId || '1') === targetBizId
      );

      if (options.status || options.loan_status) {
        const s = options.status || options.loan_status;
        list = list.filter((l) => l.loan_status === s || l.loanStatus === s);
      }
      if (options.partner_bank || options.partnerBank) {
        const b = options.partner_bank || options.partnerBank;
        list = list.filter((l) => l.partner_bank === b || l.partnerBank === b);
      }
      if (options.synced !== undefined) {
        list = list.filter((l) => Number(l.synced) === Number(options.synced));
      }

      list.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

      const offset = Number(options.offset) || 0;
      const limit = Number(options.limit) || list.length;
      return list.slice(offset, offset + limit).map((l) => ({ ...l }));
    }

    getMerchantLoans(businessId = null, options = {}) {
      return this.getMerchantLoansByBusinessId(businessId, options);
    }

    /**
     * REA-ITER-239: Updates status and metadata of a merchant loan.
     */
    async updateMerchantLoanStatus(businessId = null, loanId = null, status = 'ACTIVE', extraFields = {}) {
      if (!loanId) return { success: false, error: 'MISSING_LOAN_ID' };
      const targetLoanId = String(loanId);
      const targetBizId = businessId ? String(businessId) : null;
      let updated = null;

      await this.mutateCollection('merchantLoans', (col) => {
        return (col || []).map((l) => {
          if (String(l.loan_id || l.loanId) === targetLoanId) {
            if (!targetBizId || String(l.business_id || l.businessId || '1') === targetBizId) {
              const res = {
                ...l,
                loan_status: status,
                loanStatus: status,
                ...extraFields,
                synced: 0,
                updated_at: new Date().toISOString(),
              };
              updated = { ...res };
              return res;
            }
          }
          return l;
        });
      });

      return { success: Boolean(updated), loan: updated };
    }

    /**
     * REA-ITER-239: Updates repaid amounts and decrements remaining balance on a loan.
     */
    async updateMerchantLoanRepayment(businessId = null, loanId = null, paidAmountPaisa = 0) {
      if (!loanId) return { success: false, error: 'MISSING_LOAN_ID' };
      const targetLoanId = String(loanId);
      const targetBizId = businessId ? String(businessId) : null;
      let updated = null;

      await this.mutateCollection('merchantLoans', (col) => {
        return (col || []).map((l) => {
          if (String(l.loan_id || l.loanId) === targetLoanId) {
            if (!targetBizId || String(l.business_id || l.businessId || '1') === targetBizId) {
              const prevPaid = Number(l.paid_paisa !== undefined ? l.paid_paisa : l.paidPaisa) || 0;
              const prevRemaining = Number(l.remaining_paisa !== undefined ? l.remaining_paisa : l.remainingPaisa) || 0;
              const newPaid = prevPaid + paidAmountPaisa;
              const newRemaining = Math.max(0, prevRemaining - paidAmountPaisa);
              const newStatus = newRemaining === 0 ? 'PAID_OFF' : l.loan_status;

              const res = {
                ...l,
                paid_paisa: newPaid,
                paidPaisa: newPaid,
                remaining_paisa: newRemaining,
                remainingPaisa: newRemaining,
                loan_status: newStatus,
                loanStatus: newStatus,
                synced: 0,
                updated_at: new Date().toISOString(),
              };
              updated = { ...res };
              return res;
            }
          }
          return l;
        });
      });

      return { success: Boolean(updated), loan: updated };
    }

    /**
     * REA-ITER-239: Saves or updates an EMI installment schedule for a loan.
     */
    async saveMerchantLoanEmis(businessId = null, loanId = null, emis = []) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      const targetLoanId = String(loanId || '');
      const inputList = Array.isArray(emis) ? emis : [emis];
      const savedEmis = [];

      await this.mutateCollection('merchantLoanEmis', (col) => {
        const list = Array.isArray(col) ? col : [];
        for (const e of inputList) {
          const emiId = String(e.emi_id || e.emiId || ('TK-EMI-' + targetLoanId + '-' + (e.installment_number || e.installmentNumber || Date.now())));
          const entry = {
            ...e,
            id: e.id || ('EMI_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
            emi_id: emiId,
            emiId: emiId,
            loan_id: targetLoanId || e.loan_id || e.loanId,
            loanId: targetLoanId || e.loan_id || e.loanId,
            business_id: targetBizId,
            businessId: targetBizId,
            installment_number: Number(e.installment_number !== undefined ? e.installment_number : e.installmentNumber) || 1,
            due_date: e.due_date || e.dueDate || new Date().toISOString().slice(0, 10),
            principal_component_paisa: Number(e.principal_component_paisa !== undefined ? e.principal_component_paisa : e.principalComponentPaisa) || 0,
            interest_component_paisa: Number(e.interest_component_paisa !== undefined ? e.interest_component_paisa : e.interestComponentPaisa) || 0,
            total_installment_paisa: Number(e.total_installment_paisa !== undefined ? e.total_installment_paisa : e.totalInstallmentPaisa) || 0,
            penalty_paisa: Number(e.penalty_paisa !== undefined ? e.penalty_paisa : e.penaltyPaisa) || 0,
            payment_status: e.payment_status || e.paymentStatus || 'PENDING',
            paid_date: e.paid_date || e.paidDate || null,
            transaction_reference: e.transaction_reference || e.transactionReference || null,
            synced: e.synced !== undefined ? Number(e.synced) : 0,
          };

          const idx = list.findIndex((item) => String(item.emi_id || item.emiId) === emiId);
          if (idx >= 0) {
            const merged = { ...list[idx], ...entry };
            list[idx] = merged;
            savedEmis.push({ ...merged });
          } else {
            list.push(entry);
            savedEmis.push({ ...entry });
          }
        }
        return list;
      });

      return { success: true, emis: savedEmis };
    }

    /**
     * REA-ITER-239: Retrieves EMI installment records for a loan.
     */
    getMerchantLoanEmis(businessId = null, loanId = null) {
      if (!loanId) return [];
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const targetLoanId = String(loanId);

      return (store.merchantLoanEmis || [])
        .filter((e) => {
          if (String(e.loan_id || e.loanId) !== targetLoanId) return false;
          if (targetBizId && String(e.business_id || e.businessId || '1') !== targetBizId) return false;
          return true;
        })
        .sort((a, b) => (Number(a.installment_number || a.installmentNumber) - Number(b.installment_number || b.installmentNumber)))
        .map((e) => ({ ...e }));
    }

    /**
     * REA-ITER-239: Records payment of an EMI installment.
     */
    async recordMerchantLoanEmiPayment(businessId = null, loanId = null, emiId = null, paymentData = {}) {
      if (!emiId) return { success: false, error: 'MISSING_EMI_ID' };
      const targetEmiId = String(emiId);
      const targetBizId = businessId ? String(businessId) : null;
      let updatedEmi = null;

      await this.mutateCollection('merchantLoanEmis', (col) => {
        return (col || []).map((e) => {
          if (String(e.emi_id || e.emiId) === targetEmiId) {
            if (!targetBizId || String(e.business_id || e.businessId || '1') === targetBizId) {
              const res = {
                ...e,
                payment_status: paymentData.payment_status || paymentData.paymentStatus || 'PAID',
                paid_date: paymentData.paid_date || paymentData.paidDate || new Date().toISOString(),
                transaction_reference: paymentData.transaction_reference || paymentData.transactionReference || ('TXN-EMI-' + Date.now()),
                penalty_paisa: Number(paymentData.penalty_paisa !== undefined ? paymentData.penalty_paisa : paymentData.penaltyPaisa) || 0,
                synced: 0,
              };
              updatedEmi = { ...res };
              return res;
            }
          }
          return e;
        });
      });

      if (updatedEmi && loanId) {
        const principalInterestPaisa = Number(updatedEmi.total_installment_paisa) || 0;
        await this.updateMerchantLoanRepayment(businessId, loanId, principalInterestPaisa);
      }

      return { success: Boolean(updatedEmi), emi: updatedEmi };
    }

    /**
     * REA-ITER-239: Retrieves unsynced merchant loans.
     */
    getUnsyncedMerchantLoans(businessId = null, limit = 50) {
      return this.getMerchantLoansByBusinessId(businessId, { synced: 0 }).slice(0, limit);
    }

    /**
     * REA-ITER-239: Updates sync status of a merchant loan.
     */
    async updateMerchantLoanSyncStatus(businessId = null, loanId = null, synced = 1) {
      if (!loanId) return { success: false };
      const targetLoanId = String(loanId);
      const targetBizId = businessId ? String(businessId) : null;
      let updatedCount = 0;
      await this.mutateCollection('merchantLoans', (col) => {
        return (col || []).map((l) => {
          if (String(l.loan_id || l.loanId) === targetLoanId) {
            if (!targetBizId || String(l.business_id || l.businessId || '1') === targetBizId) {
              updatedCount++;
              return {
                ...l,
                synced: Number(synced),
                updated_at: new Date().toISOString(),
              };
            }
          }
          return l;
        });
      });
      return { success: true, updatedCount };
    }

    /**
     * REA-ITER-239: Retrieves unsynced loan EMIs.
     */
    getUnsyncedMerchantLoanEmis(businessId = null, limit = 100) {
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      return (store.merchantLoanEmis || [])
        .filter((e) => {
          if (targetBizId && String(e.business_id || e.businessId || '1') !== targetBizId) return false;
          return Number(e.synced) === 0;
        })
        .slice(0, limit)
        .map((e) => ({ ...e }));
    }

    /**
     * REA-ITER-239: Updates sync status of a loan EMI.
     */
    async updateMerchantLoanEmiSyncStatus(businessId = null, emiId = null, synced = 1) {
      if (!emiId) return { success: false };
      const targetEmiId = String(emiId);
      const targetBizId = businessId ? String(businessId) : null;
      let updatedCount = 0;
      await this.mutateCollection('merchantLoanEmis', (col) => {
        return (col || []).map((e) => {
          if (String(e.emi_id || e.emiId) === targetEmiId) {
            if (!targetBizId || String(e.business_id || e.businessId || '1') === targetBizId) {
              updatedCount++;
              return {
                ...e,
                synced: Number(synced),
              };
            }
          }
          return e;
        });
      });
      return { success: true, updatedCount };
    }

    /**
     * REA-ITER-239: Deletes a merchant loan and its associated EMIs.
     */
    async deleteMerchantLoan(businessId = null, loanId = null) {
      if (!loanId) return { success: false };
      const targetLoanId = String(loanId);
      const targetBizId = businessId ? String(businessId) : null;
      let deleted = false;

      await this.mutateCollection('merchantLoans', (col) => {
        const list = Array.isArray(col) ? col : [];
        const nextList = list.filter((l) => {
          if (String(l.loan_id || l.loanId) === targetLoanId) {
            if (!targetBizId || String(l.business_id || l.businessId || '1') === targetBizId) {
              return false;
            }
          }
          return true;
        });
        deleted = nextList.length < list.length;
        return nextList;
      });

      if (deleted) {
        await this.mutateCollection('merchantLoanEmis', (col) => {
          const list = Array.isArray(col) ? col : [];
          return list.filter((e) => String(e.loan_id || e.loanId) !== targetLoanId);
        });
      }

      return { success: deleted };
    }

    /**
     * REA-ITER-239: Checks existence of a merchant loan by ID.
     */
    existsMerchantLoan(businessId = null, loanId = null) {
      return Boolean(this.getMerchantLoanById(businessId, loanId));
    }

    // =========================================================================
    // REA-ITER-240: MERCHANT CASHBACK, SCRATCH CARDS & REWARDS METHODS
    // =========================================================================

    /**
     * REA-ITER-240: Saves or updates a merchant reward (scratch card, cashback, etc.)
     */
    async saveMerchantReward(businessId = null, rewardData = {}) {
      if (!rewardData || typeof rewardData !== 'object') {
        return { success: false, error: 'INVALID_REWARD_DATA' };
      }
      const store = this.currentStore || {};
      const targetBizId = String(businessId || rewardData.business_id || rewardData.businessId || store.activeBusinessId || '1');
      const rewardId = String(rewardData.reward_id || rewardData.rewardId || ('TK-RWD-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)));

      const entry = {
        ...rewardData,
        id: rewardData.id || ('RWD_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
        reward_id: rewardId,
        rewardId: rewardId,
        business_id: targetBizId,
        businessId: targetBizId,
        reward_type: rewardData.reward_type || rewardData.rewardType || 'SCRATCH_CARD',
        amount_paisa: Number(rewardData.amount_paisa !== undefined ? rewardData.amount_paisa : rewardData.amountPaisa) || 0,
        points: Number(rewardData.points) || 0,
        status: rewardData.status || 'UNLOCKED',
        title: rewardData.title || 'রিওয়ার্ড',
        description: rewardData.description || '',
        expiry_date: rewardData.expiry_date || rewardData.expiryDate || null,
        claimed_date: rewardData.claimed_date || rewardData.claimedDate || null,
        created_at: rewardData.created_at || rewardData.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: rewardData.synced !== undefined ? Number(rewardData.synced) : 0,
      };

      let saved = null;
      await this.mutateCollection('merchantRewards', (col) => {
        const list = Array.isArray(col) ? col : [];
        const idx = list.findIndex((r) => String(r.reward_id || r.rewardId) === rewardId);
        if (idx >= 0) {
          const prev = list[idx];
          const merged = {
            ...prev,
            ...entry,
            id: prev.id || entry.id,
            created_at: prev.created_at || entry.created_at,
            updated_at: new Date().toISOString(),
          };
          list[idx] = merged;
          saved = { ...merged };
        } else {
          list.push(entry);
          saved = { ...entry };
        }
        return list;
      });

      return { success: true, reward: saved };
    }

    /**
     * REA-ITER-240: Retrieves merchant rewards with optional filters and pagination.
     */
    getMerchantRewards(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let list = (store.merchantRewards || []).filter(
        (r) => String(r.business_id || r.businessId || '1') === targetBizId
      );

      if (options.status) {
        const st = String(options.status).toUpperCase();
        list = list.filter((r) => String(r.status || '').toUpperCase() === st);
      }
      if (options.reward_type || options.rewardType) {
        const rt = String(options.reward_type || options.rewardType).toUpperCase();
        list = list.filter((r) => String(r.reward_type || r.rewardType || '').toUpperCase() === rt);
      }
      if (options.synced !== undefined) {
        list = list.filter((r) => Number(r.synced) === Number(options.synced));
      }

      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      const offset = Number(options.offset) || 0;
      const limit = options.limit !== undefined ? Number(options.limit) : list.length;
      return list.slice(offset, offset + limit).map((r) => ({ ...r }));
    }

    getMerchantRewardsByBusinessId(businessId = null, options = {}) {
      return this.getMerchantRewards(businessId, options);
    }

    /**
     * REA-ITER-240: Retrieves a single merchant reward by ID.
     */
    getMerchantRewardById(businessId = null, rewardId = null) {
      if (!rewardId) return null;
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      const item = (store.merchantRewards || []).find((r) => {
        const matchId = String(r.reward_id || r.rewardId || r.id) === String(rewardId);
        if (!matchId) return false;
        if (targetBizId) {
          return String(r.business_id || r.businessId || '1') === targetBizId;
        }
        return true;
      });
      return item ? { ...item } : null;
    }

    /**
     * REA-ITER-240: Scratches a reward card. Transitions to SCRATCHED if progress >= 70%.
     */
    async scratchReward(businessId = null, rewardId = null, scratchPercentage = 100) {
      const reward = this.getMerchantRewardById(businessId, rewardId);
      if (!reward) return { success: false, error: 'REWARD_NOT_FOUND' };
      if (reward.status === 'CLAIMED') return { success: false, error: 'ALREADY_CLAIMED' };
      if (reward.status === 'EXPIRED') return { success: false, error: 'REWARD_EXPIRED' };

      let updated = null;
      if (scratchPercentage >= 70 && (reward.status === 'UNLOCKED' || reward.status === 'UNSCRATCHED')) {
        await this.mutateCollection('merchantRewards', (col) => {
          const list = Array.isArray(col) ? col : [];
          const idx = list.findIndex((r) => String(r.reward_id || r.rewardId) === String(rewardId));
          if (idx >= 0) {
            list[idx] = {
              ...list[idx],
              status: 'SCRATCHED',
              updated_at: new Date().toISOString(),
              synced: 0
            };
            updated = { ...list[idx] };
          }
          return list;
        });
        return { success: true, reward: updated, revealed: true };
      }
      return { success: true, reward, revealed: false };
    }

    /**
     * REA-ITER-240: Claims a revealed reward prize (cashback or loyalty points).
     */
    async claimReward(businessId = null, rewardId = null, currentWalletBalancePaisa = 0) {
      const reward = this.getMerchantRewardById(businessId, rewardId);
      if (!reward) return { success: false, error: 'REWARD_NOT_FOUND' };
      if (reward.status === 'CLAIMED') return { success: false, error: 'ALREADY_CLAIMED' };
      if (reward.status !== 'SCRATCHED' && reward.status !== 'REVEALED') {
        return { success: false, error: 'CARD_NOT_REVEALED_YET' };
      }

      const claimedDate = new Date().toISOString();
      let updatedReward = null;

      await this.mutateCollection('merchantRewards', (col) => {
        const list = Array.isArray(col) ? col : [];
        const idx = list.findIndex((r) => String(r.reward_id || r.rewardId) === String(rewardId));
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            status: 'CLAIMED',
            claimed_date: claimedDate,
            updated_at: claimedDate,
            synced: 0
          };
          updatedReward = { ...list[idx] };
        }
        return list;
      });

      const targetBizId = String(reward.business_id || reward.businessId || '1');
      const amountPaisa = Number(reward.amount_paisa !== undefined ? reward.amount_paisa : reward.amountPaisa) || 0;
      const points = Number(reward.points) || 0;
      const currentPoints = this.getMerchantRewardPointsBalance(targetBizId);
      const newPoints = currentPoints + points;

      await this.saveRewardLedgerEntry(targetBizId, {
        points_change: points,
        running_points_balance: newPoints,
        cashback_paisa_change: amountPaisa,
        source_event: 'SCRATCH_CARD_CLAIM',
        reference_id: reward.reward_id || reward.rewardId
      });

      return {
        success: true,
        reward: updatedReward,
        creditedPaisa: amountPaisa,
        pointsAdded: points,
        newWalletBalancePaisa: currentWalletBalancePaisa + amountPaisa,
        newPointsBalance: newPoints
      };
    }

    /**
     * REA-ITER-240: Deletes a merchant reward.
     */
    async deleteMerchantReward(businessId = null, rewardId = null) {
      if (!rewardId) return { success: false, error: 'MISSING_REWARD_ID' };
      const targetBizId = businessId ? String(businessId) : null;
      let deleted = false;
      await this.mutateCollection('merchantRewards', (col) => {
        const list = Array.isArray(col) ? col : [];
        const idx = list.findIndex((r) => {
          const matchId = String(r.reward_id || r.rewardId || r.id) === String(rewardId);
          if (!matchId) return false;
          if (targetBizId) {
            return String(r.business_id || r.businessId || '1') === targetBizId;
          }
          return true;
        });
        if (idx >= 0) {
          list.splice(idx, 1);
          deleted = true;
        }
        return list;
      });
      return { success: deleted };
    }

    /**
     * REA-ITER-240: Checks existence of a merchant reward.
     */
    existsMerchantReward(businessId = null, rewardId = null) {
      return Boolean(this.getMerchantRewardById(businessId, rewardId));
    }

    /**
     * REA-ITER-240: Gets unsynced merchant rewards.
     */
    getUnsyncedMerchantRewards(businessId = null, limit = 50) {
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      let list = (store.merchantRewards || []).filter((r) => Number(r.synced) === 0);
      if (targetBizId) {
        list = list.filter((r) => String(r.business_id || r.businessId || '1') === targetBizId);
      }
      return list.slice(0, limit).map((r) => ({ ...r }));
    }

    /**
     * REA-ITER-240: Updates sync status of merchant rewards.
     */
    async updateMerchantRewardSyncStatus(businessId = null, ids = [], synced = 1) {
      const idSet = new Set((ids || []).map(String));
      const targetBizId = businessId ? String(businessId) : null;
      let updated = 0;
      await this.mutateCollection('merchantRewards', (col) => {
        const list = Array.isArray(col) ? col : [];
        for (const r of list) {
          if (targetBizId && String(r.business_id || r.businessId || '1') !== targetBizId) continue;
          if (idSet.has(String(r.id)) || idSet.has(String(r.reward_id || r.rewardId))) {
            r.synced = Number(synced);
            updated++;
          }
        }
        return list;
      });
      return updated;
    }

    /**
     * REA-ITER-240: Saves an entry to the merchant reward ledger.
     */
    async saveRewardLedgerEntry(businessId = null, entryData = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || entryData.business_id || entryData.businessId || store.activeBusinessId || '1');
      const entryId = String(entryData.entry_id || entryData.entryId || ('TK-RWL-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)));

      const entry = {
        ...entryData,
        id: entryData.id || ('RWL_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
        entry_id: entryId,
        entryId: entryId,
        business_id: targetBizId,
        businessId: targetBizId,
        points_change: Number(entryData.points_change !== undefined ? entryData.points_change : entryData.pointsChange) || 0,
        running_points_balance: Number(entryData.running_points_balance !== undefined ? entryData.running_points_balance : entryData.runningPointsBalance) || 0,
        cashback_paisa_change: Number(entryData.cashback_paisa_change !== undefined ? entryData.cashback_paisa_change : entryData.cashbackPaisaChange) || 0,
        source_event: entryData.source_event || entryData.sourceEvent || 'TRANSACTION_VOLUME',
        reference_id: entryData.reference_id || entryData.referenceId || null,
        created_at: entryData.created_at || entryData.createdAt || new Date().toISOString(),
        synced: entryData.synced !== undefined ? Number(entryData.synced) : 0,
      };

      let saved = null;
      await this.mutateCollection('merchantRewardLedger', (col) => {
        const list = Array.isArray(col) ? col : [];
        list.push(entry);
        saved = { ...entry };
        return list;
      });

      return { success: true, entry: saved };
    }

    /**
     * REA-ITER-240: Retrieves merchant reward ledger entries.
     */
    getRewardLedger(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      let list = (store.merchantRewardLedger || []).filter(
        (e) => String(e.business_id || e.businessId || '1') === targetBizId
      );

      if (options.source_event || options.sourceEvent) {
        const se = String(options.source_event || options.sourceEvent);
        list = list.filter((e) => String(e.source_event || e.sourceEvent) === se);
      }
      if (options.synced !== undefined) {
        list = list.filter((e) => Number(e.synced) === Number(options.synced));
      }

      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      const offset = Number(options.offset) || 0;
      const limit = options.limit !== undefined ? Number(options.limit) : list.length;
      return list.slice(offset, offset + limit).map((e) => ({ ...e }));
    }

    /**
     * REA-ITER-240: Computes the net loyalty points balance for a merchant.
     */
    getMerchantRewardPointsBalance(businessId = null) {
      const store = this.currentStore || {};
      const targetBizId = String(businessId || store.activeBusinessId || '1');
      const list = (store.merchantRewardLedger || []).filter(
        (e) => String(e.business_id || e.businessId || '1') === targetBizId
      );
      if (list.length === 0) return 0;
      return list.reduce((sum, e) => sum + (Number(e.points_change !== undefined ? e.points_change : e.pointsChange) || 0), 0);
    }

    /**
     * REA-ITER-240: Redeems loyalty points to wallet balance (10 points = ৳1.00 = 100 paisa).
     */
    async redeemPointsToWallet(businessId = null, points = 0, currentWalletBalancePaisa = 0) {
      const targetBizId = String(businessId || (this.currentStore && this.currentStore.activeBusinessId) || '1');
      const currentPoints = this.getMerchantRewardPointsBalance(targetBizId);
      if (points > currentPoints) {
        return { success: false, error: 'INSUFFICIENT_POINTS', message: 'আপনার অ্যাকাউন্টে পর্যাপ্ত পয়েন্টস নেই।' };
      }
      if (points < 100) {
        return { success: false, error: 'MINIMUM_THRESHOLD_NOT_MET', message: 'সর্বনিম্ন ১০০ পয়েন্টস রিডিম করা যাবে।' };
      }

      const takaCredit = Math.floor(points / 10);
      const creditedPaisa = takaCredit * 100;
      const leftoverPoints = points % 10;
      const pointsDeducted = points - leftoverPoints;
      const newPointsBalance = currentPoints - pointsDeducted;
      const newWalletBalancePaisa = currentWalletBalancePaisa + creditedPaisa;

      const entryResult = await this.saveRewardLedgerEntry(targetBizId, {
        points_change: -pointsDeducted,
        running_points_balance: newPointsBalance,
        cashback_paisa_change: creditedPaisa,
        source_event: 'POINTS_REDEMPTION',
        reference_id: 'RED-' + Date.now()
      });

      return {
        success: true,
        pointsDeducted,
        creditedPaisa,
        newPointsBalance,
        newWalletBalancePaisa,
        entry: entryResult.entry
      };
    }

    /**
     * REA-ITER-240: Gets unsynced reward ledger entries.
     */
    getUnsyncedRewardLedgerEntries(businessId = null, limit = 50) {
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      let list = (store.merchantRewardLedger || []).filter((e) => Number(e.synced) === 0);
      if (targetBizId) {
        list = list.filter((e) => String(e.business_id || e.businessId || '1') === targetBizId);
      }
      return list.slice(0, limit).map((e) => ({ ...e }));
    }

    /**
     * REA-ITER-240: Updates sync status of reward ledger entries.
     */
    async updateRewardLedgerSyncStatus(businessId = null, ids = [], synced = 1) {
      const idSet = new Set((ids || []).map(String));
      const targetBizId = businessId ? String(businessId) : null;
      let updated = 0;
      await this.mutateCollection('merchantRewardLedger', (col) => {
        const list = Array.isArray(col) ? col : [];
        for (const e of list) {
          if (targetBizId && String(e.business_id || e.businessId || '1') !== targetBizId) continue;
          if (idSet.has(String(e.id)) || idSet.has(String(e.entry_id || e.entryId))) {
            e.synced = Number(synced);
            updated++;
          }
        }
        return list;
      });
      return updated;
    }



    // ============================================================================
    // REA-ITER-241: BUSINESS HEALTH ANALYTICS & REVENUE FORECASTING METHODS
    // ============================================================================

    /**
     * REA-ITER-241: Saves or updates an analytics snapshot for a business.
     * Idempotent by snapshot_id or business_id + period_key.
     */
    async saveAnalyticsSnapshot(businessId = null, snapshotData = {}) {
      if (!snapshotData || typeof snapshotData !== 'object') {
        return { success: false, error: 'INVALID_SNAPSHOT_DATA' };
      }
      const store = this.currentStore || {};
      const targetBizId = String(businessId || snapshotData.business_id || snapshotData.businessId || store.activeBusinessId || '1');
      const snapshotId = String(snapshotData.snapshot_id || snapshotData.snapshotId || ('TK-SNAP-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)));
      const periodKey = String(snapshotData.period_key || snapshotData.periodKey || '');

      const entry = {
        ...snapshotData,
        id: snapshotData.id || ('SNAP_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
        snapshot_id: snapshotId,
        snapshotId: snapshotId,
        business_id: targetBizId,
        businessId: targetBizId,
        period_type: snapshotData.period_type || snapshotData.periodType || 'MONTHLY',
        periodType: snapshotData.period_type || snapshotData.periodType || 'MONTHLY',
        period_key: periodKey,
        periodKey: periodKey,
        total_sales_paisa: Math.max(0, Math.floor(Number(snapshotData.total_sales_paisa !== undefined ? snapshotData.total_sales_paisa : (snapshotData.totalSalesPaisa || 0)))),
        totalSalesPaisa: Math.max(0, Math.floor(Number(snapshotData.total_sales_paisa !== undefined ? snapshotData.total_sales_paisa : (snapshotData.totalSalesPaisa || 0)))),
        total_expense_paisa: Math.max(0, Math.floor(Number(snapshotData.total_expense_paisa !== undefined ? snapshotData.total_expense_paisa : (snapshotData.totalExpensePaisa || 0)))),
        totalExpensePaisa: Math.max(0, Math.floor(Number(snapshotData.total_expense_paisa !== undefined ? snapshotData.total_expense_paisa : (snapshotData.totalExpensePaisa || 0)))),
        net_profit_paisa: Math.floor(Number(snapshotData.net_profit_paisa !== undefined ? snapshotData.net_profit_paisa : (snapshotData.netProfitPaisa !== undefined ? snapshotData.netProfitPaisa : ((snapshotData.total_sales_paisa || 0) - (snapshotData.total_expense_paisa || 0))))),
        netProfitPaisa: Math.floor(Number(snapshotData.net_profit_paisa !== undefined ? snapshotData.net_profit_paisa : (snapshotData.netProfitPaisa !== undefined ? snapshotData.netProfitPaisa : ((snapshotData.total_sales_paisa || 0) - (snapshotData.total_expense_paisa || 0))))),
        digital_inflow_paisa: Math.max(0, Math.floor(Number(snapshotData.digital_inflow_paisa !== undefined ? snapshotData.digital_inflow_paisa : (snapshotData.digitalInflowPaisa || 0)))),
        digitalInflowPaisa: Math.max(0, Math.floor(Number(snapshotData.digital_inflow_paisa !== undefined ? snapshotData.digital_inflow_paisa : (snapshotData.digitalInflowPaisa || 0)))),
        cash_inflow_paisa: Math.max(0, Math.floor(Number(snapshotData.cash_inflow_paisa !== undefined ? snapshotData.cash_inflow_paisa : (snapshotData.cashInflowPaisa || 0)))),
        cashInflowPaisa: Math.max(0, Math.floor(Number(snapshotData.cash_inflow_paisa !== undefined ? snapshotData.cash_inflow_paisa : (snapshotData.cashInflowPaisa || 0)))),
        customer_count: Math.max(0, Math.floor(Number(snapshotData.customer_count !== undefined ? snapshotData.customer_count : (snapshotData.customerCount || 0)))),
        customerCount: Math.max(0, Math.floor(Number(snapshotData.customer_count !== undefined ? snapshotData.customer_count : (snapshotData.customerCount || 0)))),
        health_score: Math.max(0, Math.min(100, Math.floor(Number(snapshotData.health_score !== undefined ? snapshotData.health_score : (snapshotData.healthScore || 0))))),
        healthScore: Math.max(0, Math.min(100, Math.floor(Number(snapshotData.health_score !== undefined ? snapshotData.health_score : (snapshotData.healthScore || 0))))),
        created_at: snapshotData.created_at || snapshotData.createdAt || new Date().toISOString(),
        createdAt: snapshotData.created_at || snapshotData.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: snapshotData.synced !== undefined ? Number(snapshotData.synced) : 0,
      };

      let saved = null;
      await this.mutateCollection('merchantAnalyticsSnapshots', (col) => {
        const list = Array.isArray(col) ? col : [];
        const idx = list.findIndex((s) => {
          if (String(s.snapshot_id || s.snapshotId) === snapshotId) return true;
          if (periodKey && String(s.business_id || s.businessId) === targetBizId && String(s.period_key || s.periodKey) === periodKey) return true;
          return false;
        });

        if (idx >= 0) {
          const prev = list[idx];
          const merged = {
            ...prev,
            ...entry,
            id: prev.id || entry.id,
            snapshot_id: prev.snapshot_id || entry.snapshot_id,
            snapshotId: prev.snapshotId || entry.snapshotId,
            created_at: prev.created_at || entry.created_at,
            createdAt: prev.createdAt || entry.createdAt,
            updated_at: new Date().toISOString(),
          };
          list[idx] = merged;
          saved = { ...merged };
        } else {
          list.push(entry);
          saved = { ...entry };
        }
        return list;
      });

      return { success: true, snapshot: saved };
    }

    /**
     * REA-ITER-241: Gets analytics snapshots for a business.
     */
    getAnalyticsSnapshots(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      let list = Array.isArray(store.merchantAnalyticsSnapshots) ? [...store.merchantAnalyticsSnapshots] : [];

      if (targetBizId) {
        list = list.filter((s) => String(s.business_id || s.businessId || '1') === targetBizId);
      }
      if (options.periodType || options.period_type) {
        const pType = String(options.periodType || options.period_type);
        list = list.filter((s) => String(s.period_type || s.periodType) === pType);
      }
      if (options.periodKey || options.period_key) {
        const pKey = String(options.periodKey || options.period_key);
        list = list.filter((s) => String(s.period_key || s.periodKey) === pKey);
      }

      list.sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());

      if (options.offset || options.limit) {
        const offset = Number(options.offset) || 0;
        const limit = Number(options.limit) || list.length;
        list = list.slice(offset, offset + limit);
      }

      return list.map((s) => ({ ...s }));
    }

    /**
     * REA-ITER-241: Gets analytics snapshot by period key.
     */
    getAnalyticsSnapshotByKey(businessId = null, periodKey = '') {
      if (!periodKey) return null;
      const targetBizId = String(businessId || this.currentStore?.activeBusinessId || '1');
      const store = this.currentStore || {};
      const list = Array.isArray(store.merchantAnalyticsSnapshots) ? store.merchantAnalyticsSnapshots : [];
      const match = list.find((s) => String(s.business_id || s.businessId || '1') === targetBizId && String(s.period_key || s.periodKey) === String(periodKey));
      return match ? { ...match } : null;
    }

    /**
     * REA-ITER-241: Deletes an analytics snapshot.
     */
    async deleteAnalyticsSnapshot(businessId = null, snapshotId = null) {
      if (!snapshotId) return { success: false, error: 'MISSING_SNAPSHOT_ID' };
      const targetBizId = businessId ? String(businessId) : null;
      let deleted = false;
      await this.mutateCollection('merchantAnalyticsSnapshots', (col) => {
        const list = Array.isArray(col) ? col : [];
        const idx = list.findIndex((s) => {
          const matchId = String(s.snapshot_id || s.snapshotId || s.id) === String(snapshotId);
          if (!matchId) return false;
          if (targetBizId) {
            return String(s.business_id || s.businessId || '1') === targetBizId;
          }
          return true;
        });
        if (idx >= 0) {
          list.splice(idx, 1);
          deleted = true;
        }
        return list;
      });
      return { success: deleted };
    }

    /**
     * REA-ITER-241: Gets unsynced analytics snapshots.
     */
    getUnsyncedAnalyticsSnapshots(businessId = null, limit = 50) {
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      let list = (store.merchantAnalyticsSnapshots || []).filter((s) => Number(s.synced) === 0);
      if (targetBizId) {
        list = list.filter((s) => String(s.business_id || s.businessId || '1') === targetBizId);
      }
      return list.slice(0, limit).map((s) => ({ ...s }));
    }

    /**
     * REA-ITER-241: Updates sync status of analytics snapshots.
     */
    async updateAnalyticsSnapshotSyncStatus(businessId = null, ids = [], synced = 1) {
      const idSet = new Set((ids || []).map(String));
      const targetBizId = businessId ? String(businessId) : null;
      let updated = 0;
      await this.mutateCollection('merchantAnalyticsSnapshots', (col) => {
        const list = Array.isArray(col) ? col : [];
        for (const s of list) {
          if (targetBizId && String(s.business_id || s.businessId || '1') !== targetBizId) continue;
          if (idSet.has(String(s.id)) || idSet.has(String(s.snapshot_id || s.snapshotId))) {
            s.synced = Number(synced);
            updated++;
          }
        }
        return list;
      });
      return updated;
    }

    /**
     * REA-ITER-241: Saves or updates a sales revenue forecast.
     * Idempotent by forecast_id or business_id + forecast_period.
     */
    async saveSalesForecast(businessId = null, forecastData = {}) {
      if (!forecastData || typeof forecastData !== 'object') {
        return { success: false, error: 'INVALID_FORECAST_DATA' };
      }
      const store = this.currentStore || {};
      const targetBizId = String(businessId || forecastData.business_id || forecastData.businessId || store.activeBusinessId || '1');
      const forecastId = String(forecastData.forecast_id || forecastData.forecastId || ('TK-FCST-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)));
      const forecastPeriod = String(forecastData.forecast_period || forecastData.forecastPeriod || 'NEXT_30_DAYS');

      const entry = {
        ...forecastData,
        id: forecastData.id || ('FCST_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
        forecast_id: forecastId,
        forecastId: forecastId,
        business_id: targetBizId,
        businessId: targetBizId,
        forecast_period: forecastPeriod,
        forecastPeriod: forecastPeriod,
        predicted_revenue_paisa: Math.max(0, Math.floor(Number(forecastData.predicted_revenue_paisa !== undefined ? forecastData.predicted_revenue_paisa : (forecastData.predictedRevenuePaisa || 0)))),
        predictedRevenuePaisa: Math.max(0, Math.floor(Number(forecastData.predicted_revenue_paisa !== undefined ? forecastData.predicted_revenue_paisa : (forecastData.predictedRevenuePaisa || 0)))),
        confidence_score_bps: Math.max(0, Math.min(10000, Math.floor(Number(forecastData.confidence_score_bps !== undefined ? forecastData.confidence_score_bps : (forecastData.confidenceScoreBps || 0))))),
        confidenceScoreBps: Math.max(0, Math.min(10000, Math.floor(Number(forecastData.confidence_score_bps !== undefined ? forecastData.confidence_score_bps : (forecastData.confidenceScoreBps || 0))))),
        trend_direction: forecastData.trend_direction || forecastData.trendDirection || 'STABLE',
        trendDirection: forecastData.trend_direction || forecastData.trendDirection || 'STABLE',
        growth_rate_bps: Math.floor(Number(forecastData.growth_rate_bps !== undefined ? forecastData.growth_rate_bps : (forecastData.growthRateBps || 0))),
        growthRateBps: Math.floor(Number(forecastData.growth_rate_bps !== undefined ? forecastData.growth_rate_bps : (forecastData.growthRateBps || 0))),
        model_type: forecastData.model_type || forecastData.modelType || 'LINEAR_TREND',
        modelType: forecastData.model_type || forecastData.modelType || 'LINEAR_TREND',
        created_at: forecastData.created_at || forecastData.createdAt || new Date().toISOString(),
        createdAt: forecastData.created_at || forecastData.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: forecastData.synced !== undefined ? Number(forecastData.synced) : 0,
      };

      let saved = null;
      await this.mutateCollection('merchantSalesForecasts', (col) => {
        const list = Array.isArray(col) ? col : [];
        const idx = list.findIndex((f) => {
          if (String(f.forecast_id || f.forecastId) === forecastId) return true;
          if (forecastPeriod && String(f.business_id || f.businessId) === targetBizId && String(f.forecast_period || f.forecastPeriod) === forecastPeriod) return true;
          return false;
        });

        if (idx >= 0) {
          const prev = list[idx];
          const merged = {
            ...prev,
            ...entry,
            id: prev.id || entry.id,
            forecast_id: prev.forecast_id || entry.forecast_id,
            forecastId: prev.forecastId || entry.forecastId,
            created_at: prev.created_at || entry.created_at,
            createdAt: prev.createdAt || entry.createdAt,
            updated_at: new Date().toISOString(),
          };
          list[idx] = merged;
          saved = { ...merged };
        } else {
          list.push(entry);
          saved = { ...entry };
        }
        return list;
      });

      return { success: true, forecast: saved };
    }

    /**
     * REA-ITER-241: Gets sales forecasts for a business.
     */
    getSalesForecasts(businessId = null, options = {}) {
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      let list = Array.isArray(store.merchantSalesForecasts) ? [...store.merchantSalesForecasts] : [];

      if (targetBizId) {
        list = list.filter((f) => String(f.business_id || f.businessId || '1') === targetBizId);
      }
      if (options.forecastPeriod || options.forecast_period) {
        const p = String(options.forecastPeriod || options.forecast_period);
        list = list.filter((f) => String(f.forecast_period || f.forecastPeriod) === p);
      }
      if (options.modelType || options.model_type) {
        const m = String(options.modelType || options.model_type);
        list = list.filter((f) => String(f.model_type || f.modelType) === m);
      }

      list.sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());

      if (options.offset || options.limit) {
        const offset = Number(options.offset) || 0;
        const limit = Number(options.limit) || list.length;
        list = list.slice(offset, offset + limit);
      }

      return list.map((f) => ({ ...f }));
    }

    /**
     * REA-ITER-241: Gets the latest sales forecast for a business.
     */
    getLatestSalesForecast(businessId = null) {
      const forecasts = this.getSalesForecasts(businessId);
      return forecasts.length > 0 ? { ...forecasts[0] } : null;
    }

    /**
     * REA-ITER-241: Deletes a sales forecast.
     */
    async deleteSalesForecast(businessId = null, forecastId = null) {
      if (!forecastId) return { success: false, error: 'MISSING_FORECAST_ID' };
      const targetBizId = businessId ? String(businessId) : null;
      let deleted = false;
      await this.mutateCollection('merchantSalesForecasts', (col) => {
        const list = Array.isArray(col) ? col : [];
        const idx = list.findIndex((f) => {
          const matchId = String(f.forecast_id || f.forecastId || f.id) === String(forecastId);
          if (!matchId) return false;
          if (targetBizId) {
            return String(f.business_id || f.businessId || '1') === targetBizId;
          }
          return true;
        });
        if (idx >= 0) {
          list.splice(idx, 1);
          deleted = true;
        }
        return list;
      });
      return { success: deleted };
    }

    /**
     * REA-ITER-241: Gets unsynced sales forecasts.
     */
    getUnsyncedSalesForecasts(businessId = null, limit = 50) {
      const store = this.currentStore || {};
      const targetBizId = businessId ? String(businessId) : null;
      let list = (store.merchantSalesForecasts || []).filter((f) => Number(f.synced) === 0);
      if (targetBizId) {
        list = list.filter((f) => String(f.business_id || f.businessId || '1') === targetBizId);
      }
      return list.slice(0, limit).map((f) => ({ ...f }));
    }

    /**
     * REA-ITER-241: Updates sync status of sales forecasts.
     */
    async updateSalesForecastSyncStatus(businessId = null, ids = [], synced = 1) {
      const idSet = new Set((ids || []).map(String));
      const targetBizId = businessId ? String(businessId) : null;
      let updated = 0;
      await this.mutateCollection('merchantSalesForecasts', (col) => {
        const list = Array.isArray(col) ? col : [];
        for (const f of list) {
          if (targetBizId && String(f.business_id || f.businessId || '1') !== targetBizId) continue;
          if (idSet.has(String(f.id)) || idSet.has(String(f.forecast_id || f.forecastId))) {
            f.synced = Number(synced);
            updated++;
          }
        }
        return list;
      });
      return updated;
    }

    /**
     * REA-ITER-241: Computes business health metrics from store or input parameters.
     */
    computeBusinessHealthMetrics(businessId = null, options = {}) {
      const targetBizId = String(businessId || this.currentStore?.activeBusinessId || '1');
      const store = this.currentStore || {};

      // If explicit metrics provided, compute directly
      if (options && typeof options === 'object' && (options.totalSalesPaisa !== undefined || options.salesPaisa !== undefined)) {
        const calcFn = calculateBusinessHealthScore || (analyticsSubsystem && analyticsSubsystem.calculateBusinessHealthScore);
        if (typeof calcFn === 'function') {
          return calcFn(options);
        }
      }

      // Aggregate from store for targetBizId
      const journals = (store.journals || []).filter((j) => String(j.businessId || j.business_id || '1') === targetBizId);
      const accounts = (store.accounts || []).filter((a) => String(a.businessId || a.business_id || '1') === targetBizId);
      const cashEntries = (store.cashEntries || []).filter((c) => String(c.businessId || c.business_id || '1') === targetBizId);
      const digitalTxns = (store.tallyPayTransactions || []).filter((t) => String(t.businessId || t.business_id || '1') === targetBizId);

      let totalSalesPaisa = 0;
      let totalExpensePaisa = 0;
      let creditGivenPaisa = 0;
      let creditCollectedPaisa = 0;

      for (const j of journals) {
        const amountPaisa = Number(j.amountPaisa !== undefined ? j.amountPaisa : (Number(j.amount || 0) * 100)) || 0;
        const type = String(j.type || j.journalType || '').toUpperCase();
        if (type === 'SALE' || type === 'CREDIT_SALE') {
          totalSalesPaisa += amountPaisa;
        }
        if (type === 'CREDIT_SALE' || type === 'DILAM') {
          creditGivenPaisa += amountPaisa;
        }
        if (type === 'CREDIT_COLLECTION' || type === 'PELAM') {
          creditCollectedPaisa += amountPaisa;
        }
        if (type === 'EXPENSE') {
          totalExpensePaisa += amountPaisa;
        }
      }

      let cashInflowPaisa = 0;
      for (const c of cashEntries) {
        const amountPaisa = Number(c.amountPaisa !== undefined ? c.amountPaisa : (Number(c.amount || 0) * 100)) || 0;
        const type = String(c.type || '').toUpperCase();
        if (type === 'CASH_IN') {
          cashInflowPaisa += amountPaisa;
          if (c.tag === 'SALE' || c.category === 'SALE') {
            totalSalesPaisa += amountPaisa;
          }
        } else if (type === 'CASH_OUT') {
          totalExpensePaisa += amountPaisa;
        }
      }

      let digitalInflowPaisa = 0;
      for (const t of digitalTxns) {
        const amountPaisa = Number(t.amountPaisa !== undefined ? t.amountPaisa : (Number(t.amount || 0) * 100)) || 0;
        if (t.balanceChangeType === 'CREDIT' || t.direction === 'INCOMING') {
          digitalInflowPaisa += amountPaisa;
        }
      }

      const customers = accounts.filter((a) => !a.type || String(a.type).toUpperCase() === 'CUSTOMER');
      const totalCustomers = customers.length;
      const customerIdsWithTxn = new Set(journals.map((j) => String(j.accountId || j.account_id || '')));
      const activeCustomers = customers.filter((c) => customerIdsWithTxn.has(String(c.id || c.accountId))).length;

      const calcFn = calculateBusinessHealthScore || (analyticsSubsystem && analyticsSubsystem.calculateBusinessHealthScore);
      if (typeof calcFn === 'function') {
        return calcFn({
          totalSalesPaisa,
          totalExpensePaisa,
          digitalInflowPaisa,
          cashInflowPaisa,
          creditGivenPaisa,
          creditCollectedPaisa,
          totalCustomers,
          activeCustomers,
        });
      }

      return {
        healthScore: 75,
        tier: { code: 'GOOD', labelBn: 'ভালো' },
        pillars: {}
      };
    }


  sanitizeState(state) {
    return sanitizeState(state || this.currentStore);
  }
}

// ============================================================================
// BL-017: TRANSACTION DATE-RANGE QUERY INDEXING & BINARY SEARCH ENGINE
// ============================================================================

let _journalIndexCache = new WeakMap();

function clearJournalIndexCache() {
  _journalIndexCache = new WeakMap();
}

/**
 * Normalizes input date/timestamp into a canonical YYYY-MM-DD string.
 * Supports Date objects, timestamps, ISO strings, Bengali numerals, and standard strings.
 */
function toStandardDateStr(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'string') {
    // Fast path: standard ASCII YYYY-MM-DD
    if (val.length === 10 &&
        val.charCodeAt(0) >= 48 && val.charCodeAt(0) <= 57 &&
        val.charCodeAt(4) === 45 && val.charCodeAt(7) === 45) {
      return val;
    }
    if (val.length >= 10 &&
        val.charCodeAt(0) >= 48 && val.charCodeAt(0) <= 57 &&
        val.charCodeAt(4) === 45 && val.charCodeAt(7) === 45) {
      return val.slice(0, 10);
    }
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  let str = String(val).trim();
  const bengaliDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  for (let i = 0; i < 10; i++) {
    if (str.indexOf(bengaliDigits[i]) !== -1) {
      str = str.replace(new RegExp(bengaliDigits[i], 'g'), String(i));
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str;
}

/**
 * Normalizes 12-hour or 24-hour time string into a canonical 24-hour HH:MM:SS string for chronological comparison.
 */
function normalizeTimeComparable(timeStr) {
  if (!timeStr) return '';
  let str = String(timeStr).trim();
  const bengaliDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  for (let i = 0; i < 10; i++) {
    if (str.indexOf(bengaliDigits[i]) !== -1) {
      str = str.replace(new RegExp(bengaliDigits[i], 'g'), String(i));
    }
  }
  const match12 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const seconds = match12[3] || '00';
    const ampm = match12[4] ? match12[4].toUpperCase() : null;
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
  }
  return str;
}

/**
 * Deterministic chronological comparator for journal entries.
 * Primary: Date (ascending YYYY-MM-DD)
 * Secondary: Raw date/timestamp string
 * Tertiary: Time string (e.g. '09:00 AM')
 * Quaternary: ID (numeric or string)
 */
function compareJournals(a, b) {
  const dateA = toStandardDateStr(a?.date || a?.txn_date || a?.createdAt || a?.create_date);
  const dateB = toStandardDateStr(b?.date || b?.txn_date || b?.createdAt || b?.create_date);
  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;

  const rawA = String(a?.date || a?.txn_date || a?.createdAt || a?.create_date || '');
  const rawB = String(b?.date || b?.txn_date || b?.createdAt || b?.create_date || '');
  if (rawA < rawB) return -1;
  if (rawA > rawB) return 1;

  const timeA = normalizeTimeComparable(a?.time);
  const timeB = normalizeTimeComparable(b?.time);
  if (timeA < timeB) return -1;
  if (timeA > timeB) return 1;

  const numA = Number(a?.id);
  const numB = Number(b?.id);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  const idA = String(a?.id || '');
  const idB = String(b?.id || '');
  return idA < idB ? -1 : (idA > idB ? 1 : 0);
}

/**
 * Returns a copy of journals sorted chronologically by date/time.
 * Memoized via WeakMap caching with array length guard (__len) to prevent re-sorting unmodified arrays.
 */
function indexJournalsChronologically(journals = []) {
  if (!Array.isArray(journals)) return [];
  if (journals.length <= 1) return [...journals];

  const cached = _journalIndexCache.get(journals);
  if (cached && cached.__len === journals.length) {
    return cached.indexed;
  }

  const copy = [...journals];
  copy.sort(compareJournals);

  _journalIndexCache.set(journals, { indexed: copy, __len: journals.length });
  return copy;
}

/**
 * Binary search for lower bound: first index where journal date >= targetDate
 */
function findLowerBound(arr, targetDate) {
  let low = 0;
  let high = arr.length - 1;
  let result = arr.length;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const midDate = toStandardDateStr(arr[mid]?.date || arr[mid]?.txn_date || arr[mid]?.createdAt || arr[mid]?.create_date);
    if (midDate >= targetDate) {
      result = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return result;
}

/**
 * Binary search for upper bound: last index where journal date <= targetDate
 */
function findUpperBound(arr, targetDate) {
  let low = 0;
  let high = arr.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const midDate = toStandardDateStr(arr[mid]?.date || arr[mid]?.txn_date || arr[mid]?.createdAt || arr[mid]?.create_date);
    if (midDate <= targetDate) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

/**
 * Queries journals within a date range using O(log N) binary search on chronologically indexed records.
 * Supports optional multi-business (businessId) and accountId filtering.
 *
 * @param {Array} journals Array of journal objects
 * @param {string|Date|null} startDate Start date (inclusive)
 * @param {string|Date|null} endDate End date (inclusive)
 * @param {Object} options Optional filters: { businessId, accountId, type, filter }
 * @returns {{ journals: Array, totalCount: number, executionTimeMs: number }}
 */
function queryJournalsByDateRange(journals, startDate, endDate, options = {}) {
  const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const calcElapsed = () => {
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return Math.max(0, Number((now - startTime).toFixed(2)));
  };

  if (!Array.isArray(journals) || journals.length === 0) {
    return { journals: [], totalCount: 0, executionTimeMs: calcElapsed() };
  }

  const normStart = toStandardDateStr(startDate);
  const normEnd = toStandardDateStr(endDate);

  if (normStart && normEnd && normStart > normEnd) {
    return { journals: [], totalCount: 0, executionTimeMs: calcElapsed() };
  }

  const indexed = indexJournalsChronologically(journals);
  if (indexed.length === 0) {
    return { journals: [], totalCount: 0, executionTimeMs: calcElapsed() };
  }

  const low = normStart ? findLowerBound(indexed, normStart) : (normEnd ? findLowerBound(indexed, '0000-00-00') : 0);
  const high = normEnd ? findUpperBound(indexed, normEnd) : indexed.length - 1;

  if (low > high || low >= indexed.length || high < 0) {
    return { journals: [], totalCount: 0, executionTimeMs: calcElapsed() };
  }

  let candidates = indexed.slice(low, high + 1);

  const rawBizFilter = options.businessId !== undefined && options.businessId !== null
    ? options.businessId
    : (options.business_id !== undefined && options.business_id !== null ? options.business_id : null);
  const rawAccFilter = options.accountId !== undefined && options.accountId !== null
    ? options.accountId
    : (options.orig_account_id !== undefined && options.orig_account_id !== null ? options.orig_account_id : null);

  const hasBizFilter = rawBizFilter !== null;
  const hasAccFilter = rawAccFilter !== null;
  const hasTypeFilter = (options.type !== undefined && options.type !== null && options.type !== '') ||
                        (options.txn_type !== undefined && options.txn_type !== null && options.txn_type !== '');
  const hasModeFilter = (options.txn_mode !== undefined && options.txn_mode !== null && options.txn_mode !== '');
  const hasCustomFilter = typeof options.filter === 'function';

  if (hasBizFilter || hasAccFilter || hasTypeFilter || hasModeFilter || hasCustomFilter) {
    const targetBizId = hasBizFilter ? String(rawBizFilter) : null;
    const targetAccId = hasAccFilter ? String(rawAccFilter) : null;
    const targetType = options.type !== undefined && options.type !== null && options.type !== ''
      ? String(options.type)
      : (options.txn_type !== undefined && options.txn_type !== null && options.txn_type !== '' ? String(options.txn_type) : null);
    const targetMode = hasModeFilter ? Number(options.txn_mode) : null;

    candidates = candidates.filter((item) => {
      // 1. Business ID scoping (multi-business isolation)
      if (targetBizId !== null) {
        const itemBizId = String(
          item?.businessId !== undefined && item?.businessId !== null
            ? item.businessId
            : (item?.business_id !== undefined && item?.business_id !== null ? item.business_id : '1')
        );
        if (itemBizId !== targetBizId) {
          return false;
        }
      }

      // 2. Account ID scoping (orig_account_id <-> accountId)
      if (targetAccId !== null) {
        const itemAccId = item?.accountId !== undefined && item?.accountId !== null
          ? String(item.accountId)
          : (item?.orig_account_id !== undefined && item?.orig_account_id !== null ? String(item.orig_account_id) : null);
        if (itemAccId !== targetAccId) {
          return false;
        }
      }

      // 3. Transaction Type (type <-> txn_type)
      if (targetType !== null) {
        const itemType = item?.type !== undefined && item?.type !== null ? String(item.type) : null;
        const itemTxnType = item?.txn_type !== undefined && item?.txn_type !== null ? String(item.txn_type) : null;
        let matched = (itemType === targetType || itemTxnType === targetType);
        if (!matched) {
          if (targetType === 'given' && itemTxnType === '1') matched = true;
          else if (targetType === 'received' && itemTxnType === '2') matched = true;
          else if (targetType === '1' && itemType === 'given') matched = true;
          else if (targetType === '2' && itemType === 'received') matched = true;
        }
        if (!matched) return false;
      }

      // 4. Transaction Mode (txn_mode)
      if (targetMode !== null) {
        const itemMode = item?.txn_mode !== undefined && item?.txn_mode !== null
          ? Number(item.txn_mode)
          : (item?.isDigital ? 2 : 1);
        if (itemMode !== targetMode) {
          return false;
        }
      }

      // 5. Custom predicate filter
      if (hasCustomFilter && !options.filter(item)) {
        return false;
      }
      return true;
    });
  }

  const totalCount = candidates.length;

  if (options && options.sortOrder === 'desc') {
    candidates.reverse();
  }

  if (options && (options.offset > 0 || (options.limit !== undefined && options.limit !== null))) {
    const offset = Math.max(0, Number(options.offset) || 0);
    const limit = options.limit !== undefined && options.limit !== null ? Math.max(0, Number(options.limit)) : candidates.length;
    candidates = candidates.slice(offset, offset + limit);
  }

  return {
    journals: candidates,
    totalCount,
    executionTimeMs: calcElapsed()
  };
}


// ============================================================================
// PRIVACY-PRESERVING OPERATIONAL TELEMETRY & EVENT LOGGING (BL-018)
// ============================================================================

const MAX_EVENT_QUEUE_SIZE = 500;

const EVENT_TYPES = Object.freeze({
  CUSTOMER_CREATED: 'customer_created',
  CUSTOMER_UPDATED: 'customer_updated',
  TRANSACTION_RECORDED: 'transaction_recorded',
  CASHBOX_UPDATED: 'cashbox_updated',
  TAGADA_SENT: 'tagada_sent',
  BACKUP_INITIATED: 'backup_initiated',
  BACKUP_COMPLETED: 'backup_completed',
  BACKUP_FAILED: 'backup_failed',
  RESTORE_COMPLETED: 'restore_completed',
  PREFERENCES_UPDATED: 'preferences_updated',
});

class TelemetryService {
  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || MAX_EVENT_QUEUE_SIZE;
    this.enabled = options.enabled !== false;
    this.eventQueue = [];
    this._sequenceId = 0;
  }

  isTelemetryEnabled() {
    return this.enabled;
  }

  setTelemetryEnabled(isEnabled) {
    this.enabled = Boolean(isEnabled);
    if (!this.enabled) {
      this.clearEvents();
    }
  }

  sanitizePayload(rawPayload = {}) {
    if (!rawPayload || typeof rawPayload !== 'object') return {};

    const sanitized = {};
    const piiKeys = new Set([
      'name', 'customerName', 'customer_name',
      'mobile', 'phone', 'contact', 'address',
      'pin', 'password', 'token', 'accessToken',
      'notes', 'desc', 'description', 'message',
    ]);

    for (const [key, value] of Object.entries(rawPayload)) {
      if (piiKeys.has(key)) continue;
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  recordEvent(eventType, payload = {}) {
    if (!this.enabled) return null;

    this._sequenceId++;
    const nowIso = new Date().toISOString();

    const eventEnvelope = {
      id: `evt_${Date.now()}_${this._sequenceId}`,
      type: String(eventType || 'unknown_event'),
      timestamp: nowIso,
      data: this.sanitizePayload(payload),
    };

    this.eventQueue.push(eventEnvelope);

    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.splice(0, this.eventQueue.length - this.maxQueueSize);
    }

    return eventEnvelope;
  }

  getEvents(options = {}) {
    let result = [...this.eventQueue];

    if (options.type) {
      result = result.filter((e) => e.type === options.type);
    }

    const limit = options.limit !== undefined ? Math.max(0, Number(options.limit)) : 50;
    if (limit > 0 && result.length > limit) {
      result = result.slice(result.length - limit);
    }

    return result;
  }

  getEventCountsByType() {
    const counts = {};
    for (const type of Object.values(EVENT_TYPES)) {
      counts[type] = 0;
    }

    for (const evt of this.eventQueue) {
      if (evt && evt.type) {
        counts[evt.type] = (counts[evt.type] || 0) + 1;
      }
    }

    return counts;
  }

  exportTelemetrySnapshot() {
    return {
      enabled: this.enabled,
      totalEventsLogged: this.eventQueue.length,
      maxQueueSize: this.maxQueueSize,
      countsByType: this.getEventCountsByType(),
      latestEventTimestamp: this.eventQueue.length > 0 ? this.eventQueue[this.eventQueue.length - 1].timestamp : null,
      eventQueue: [...this.eventQueue],
    };
  }

  clearEvents() {
    this.eventQueue = [];
    this._sequenceId = 0;
  }
}

const defaultTelemetryService = new TelemetryService();
// Singleton repository instance for production and test suites
const defaultRepository = new StorageRepository();

const loadStore = async (repo = defaultRepository) => {
  if (repo && typeof repo.loadStore === 'function') {
    return repo.loadStore();
  }
  return defaultRepository.loadStore();
};


async function recordTagadaLog(rawLog, options = {}, repo = defaultRepository) {
  return repo.recordTagadaLog(rawLog, options);
}

function getTagadaQuota(businessId = null, repo = defaultRepository) {
  return repo.getTagadaQuota(businessId);
}

async function adjustTagadaQuota(delta = 0, options = {}, repo = defaultRepository) {
  return repo.adjustTagadaQuota(delta, options);
}

function listTagadaLogs(accountId = null, businessId = null, options = {}, repo = defaultRepository) {
  return repo.listTagadaLogs(accountId, businessId, options);
}

async function logTagadaBatch(businessId, batchRecords, repo = defaultRepository) {
  return repo.logTagadaBatch(businessId, batchRecords);
}

function getTagadaLogsByAccount(businessId, accountId, repo = defaultRepository) {
  return repo.getTagadaLogsByAccount(businessId, accountId);
}

function getLastTagadaDateByAccount(businessId, accountId, repo = defaultRepository) {
  return repo.getLastTagadaDateByAccount(businessId, accountId);
}

async function setTagadaQuota(businessId, quota, repo = defaultRepository) {
  return repo.setTagadaQuota(businessId, quota);
}

async function recordTagadaQuotaPurchase(businessId, pack, repo = defaultRepository) {
  return repo.recordTagadaQuotaPurchase(businessId, pack);
}

function getDebtAgingReport(businessId = null, asOfDate = new Date(), repo = defaultRepository) {
  return repo.getDebtAgingReport(businessId, asOfDate);
}

function getBulkTagadaEligibleCustomersRepo(businessId = null, accounts = null, repo = defaultRepository) {
  if (repo && typeof repo.getBulkTagadaEligibleCustomers === 'function') {
    return repo.getBulkTagadaEligibleCustomers(businessId, accounts);
  }
  return getBulkTagadaEligibleCustomers(businessId, accounts);
}

function prepareBulkTagadaBatchRepo(customerIdsOrCustomers = [], options = {}, repo = defaultRepository) {
  if (repo && typeof repo.prepareBulkTagadaBatch === 'function') {
    return repo.prepareBulkTagadaBatch(customerIdsOrCustomers, options);
  }
  return prepareBulkTagadaBatch(customerIdsOrCustomers, options);
}

function dispatchBulkTagadaBatchRepo(batchItemsOrPrep = [], options = {}, repo = defaultRepository) {
  if (repo && typeof repo.dispatchBulkTagadaBatch === 'function') {
    return repo.dispatchBulkTagadaBatch(batchItemsOrPrep, options);
  }
  throw new Error('STORAGE_REPOSITORY_REQUIRED_FOR_DISPATCH');
}

function generateStatementDocumentPayloadRepo(accountOrId, journalsOrBizId = null, dateRange = 'all', options = {}, repo = defaultRepository) {
  if (repo && typeof repo.generateStatementDocumentPayload === 'function') {
    return repo.generateStatementDocumentPayload(accountOrId, journalsOrBizId, dateRange, options);
  }
  return generateStatementDocumentPayload(accountOrId, journalsOrBizId, dateRange, options);
}

function generatePrintableHtmlStatementRepo(statementPayload, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.generatePrintableHtmlStatement === 'function') {
    return repo.generatePrintableHtmlStatement(statementPayload, options);
  }
  return generatePrintableHtmlStatement(statementPayload, options);
}

function generateConsolidatedReportDocumentRepo(reportType, dateRange = 'all', options = {}, repo = defaultRepository) {
  if (repo && typeof repo.generateConsolidatedReportDocument === 'function') {
    return repo.generateConsolidatedReportDocument(reportType, dateRange, options);
  }
  return generateConsolidatedReportDocument(reportType, dateRange, options);
}

function generateCustomerListReportDocumentRepo(options = {}, repo = defaultRepository) {
  if (repo && typeof repo.generateCustomerListReportDocument === 'function') {
    return repo.generateCustomerListReportDocument(options);
  }
  return generateCustomerListReportDocument(options);
}

function generateExpenseReportDocumentRepo(dateRange = 'this_month', options = {}, repo = defaultRepository) {
  if (repo && typeof repo.generateExpenseReportDocument === 'function') {
    return repo.generateExpenseReportDocument(dateRange, options);
  }
  return generateExpenseReportDocument(dateRange, options);
}

function generateStockMovementReportDocumentRepo(dateRange = 'all', options = {}, repo = defaultRepository) {
  if (repo && typeof repo.generateStockMovementReportDocument === 'function') {
    return repo.generateStockMovementReportDocument(dateRange, options);
  }
  return generateStockMovementReportDocument(dateRange, options);
}

function generatePrintableHtmlReportRepo(reportPayload, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.generatePrintableHtmlReport === 'function') {
    return repo.generatePrintableHtmlReport(reportPayload, options);
  }
  return generatePrintableHtmlReport(reportPayload, options);
}

function paginateStatementDocumentRepo(statementPayload, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.paginateStatementDocument === 'function') {
    return repo.paginateStatementDocument(statementPayload, options);
  }
  return paginateStatementDocument(statementPayload, options);
}

function generatePdfShareIntentPayloadRepo(documentPayload, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.generatePdfShareIntentPayload === 'function') {
    return repo.generatePdfShareIntentPayload(documentPayload, options);
  }
  return generatePdfShareIntentPayload(documentPayload, options);
}

function paginateConsolidatedReportDocumentRepo(reportPayload, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.paginateConsolidatedReportDocument === 'function') {
    return repo.paginateConsolidatedReportDocument(reportPayload, options);
  }
  return paginateConsolidatedReportDocument(reportPayload, options);
}

function simulateSyncBatchRepo(collectionName, serverSnapshot = [], options = {}, repo = defaultRepository) {
  if (repo && typeof repo.simulateSyncBatch === 'function') {
    return repo.simulateSyncBatch(collectionName, serverSnapshot, options);
  }
  return Promise.resolve({
    success: false,
    syncedCount: 0,
    conflictCount: 0,
    resolvedCount: 0,
    errors: ['NO_STORAGE_REPOSITORY_AVAILABLE'],
  });
}



function generateAccountStatementRepo(accountOrId, journalsOrBizId, dateRange = 'all', options = {}, repo = defaultRepository) {
  if (repo && typeof repo.generateAccountStatement === 'function') {
    return repo.generateAccountStatement(accountOrId, journalsOrBizId, dateRange, options);
  }
  return generateAccountStatement(accountOrId, journalsOrBizId, dateRange, options);
}

async function exportCompressedBackupRepo(extraState = {}, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.exportCompressedBackup === 'function') {
    return repo.exportCompressedBackup(extraState, options);
  }
  return null;
}

async function importCompressedBackupRepo(compressedPayload, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.importCompressedBackup === 'function') {
    return repo.importCompressedBackup(compressedPayload, options);
  }
  return null;
}

async function getSecurityConfigRepo(repo = defaultRepository) {
  if (repo && typeof repo.getSecurityConfig === 'function') {
    return repo.getSecurityConfig();
  }
  return securityService ? securityService.createDefaultSecurityConfig() : null;
}

async function verifyAppPinRepo(pin, now = Date.now(), repo = defaultRepository) {
  if (repo && typeof repo.verifyAppPin === 'function') {
    return repo.verifyAppPin(pin, now);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function setAppPinSecureRepo(pin, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.setAppPinSecure === 'function') {
    return repo.setAppPinSecure(pin, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function changeAppPinSecureRepo(currentPin, newPin, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.changeAppPinSecure === 'function') {
    return repo.changeAppPinSecure(currentPin, newPin, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function disableAppPinSecureRepo(currentPin, repo = defaultRepository) {
  if (repo && typeof repo.disableAppPinSecure === 'function') {
    return repo.disableAppPinSecure(currentPin);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function recordAppActivityRepo(now = Date.now(), repo = defaultRepository) {
  if (repo && typeof repo.recordAppActivity === 'function') {
    return repo.recordAppActivity(now);
  }
  return null;
}

async function recordAppBackgroundedRepo(now = Date.now(), repo = defaultRepository) {
  if (repo && typeof repo.recordAppBackgrounded === 'function') {
    return repo.recordAppBackgrounded(now);
  }
  return null;
}

async function recordAppForegroundedRepo(now = Date.now(), repo = defaultRepository) {
  if (repo && typeof repo.recordAppForegrounded === 'function') {
    return repo.recordAppForegrounded(now);
  }
  return null;
}

async function unlockAppWithPinRepo(pin, now = Date.now(), repo = defaultRepository) {
  if (repo && typeof repo.unlockAppWithPin === 'function') {
    return repo.unlockAppWithPin(pin, now);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function unlockAppWithBiometricsRepo(signature = null, repo = defaultRepository) {
  if (repo && typeof repo.unlockAppWithBiometrics === 'function') {
    return repo.unlockAppWithBiometrics(signature);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getAppLockoutStatusRepo(now = Date.now(), repo = defaultRepository) {
  if (repo && typeof repo.getAppLockoutStatus === 'function') {
    return repo.getAppLockoutStatus(now);
  }
  return { isLockedOut: false, remainingSeconds: 0, remainingAttempts: 5 };
}

async function attachAudioNoteRepo(audioNote, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.attachAudioNote === 'function') {
    return repo.attachAudioNote(audioNote, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getAudioNotesForEntityRepo(entityType, entityId, businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getAudioNotesForEntity === 'function') {
    return repo.getAudioNotesForEntity(entityType, entityId, businessId);
  }
  return [];
}

function getAudioNotesForBusinessRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getAudioNotesForBusiness === 'function') {
    return repo.getAudioNotesForBusiness(businessId);
  }
  return [];
}

async function deleteAudioNoteRepo(audioNoteId, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.deleteAudioNote === 'function') {
    return repo.deleteAudioNote(audioNoteId, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function deleteAudioNotesForEntityRepo(entityType, entityId, businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.deleteAudioNotesForEntity === 'function') {
    return repo.deleteAudioNotesForEntity(entityType, entityId, businessId, options);
  }
  return { success: false, deletedCount: 0, deletedNotes: [], error: 'NO_REPOSITORY' };
}

async function deleteAccountCascadeRepo(accountId, businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.deleteAccountCascade === 'function') {
    return repo.deleteAccountCascade(accountId, businessId, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function cleanOrphanedAudioFilesRepo(directoryPath = null, fileSystemAdapter = null, repo = defaultRepository) {
  if (repo && typeof repo.cleanOrphanedAudioFiles === 'function') {
    return repo.cleanOrphanedAudioFiles(directoryPath, fileSystemAdapter);
  }
  return { scannedCount: 0, referencedCount: 0, orphanedCount: 0, deletedCount: 0, bytesReclaimed: 0, errors: [] };
}

function getAudioStorageMetricsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getAudioStorageMetrics === 'function') {
    return repo.getAudioStorageMetrics(businessId, options);
  }
  return { totalCount: 0, totalBytes: 0, totalDurationMs: 0 };
}

async function attachReceiptImageRepo(receiptImage, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.attachReceiptImage === 'function') {
    return repo.attachReceiptImage(receiptImage, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getReceiptImagesForJournalRepo(journalId, businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getReceiptImagesForJournal === 'function') {
    return repo.getReceiptImagesForJournal(journalId, businessId);
  }
  return [];
}

function getReceiptImagesForBusinessRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getReceiptImagesForBusiness === 'function') {
    return repo.getReceiptImagesForBusiness(businessId);
  }
  return [];
}

async function deleteReceiptImageRepo(receiptImageId, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.deleteReceiptImage === 'function') {
    return repo.deleteReceiptImage(receiptImageId, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function deleteReceiptImagesForJournalRepo(journalId, businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.deleteReceiptImagesForJournal === 'function') {
    return repo.deleteReceiptImagesForJournal(journalId, businessId, options);
  }
  return { success: false, deletedCount: 0, deletedReceipts: [], error: 'NO_REPOSITORY' };
}

async function cleanOrphanedReceiptImagesRepo(directoryPath = null, fileSystemAdapter = null, repo = defaultRepository) {
  if (repo && typeof repo.cleanOrphanedReceiptImages === 'function') {
    return repo.cleanOrphanedReceiptImages(directoryPath, fileSystemAdapter);
  }
  return { scannedCount: 0, referencedCount: 0, orphanedCount: 0, deletedCount: 0, bytesReclaimed: 0, deletedFiles: [], errors: [] };
}

function getReceiptStorageMetricsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getReceiptStorageMetrics === 'function') {
    return repo.getReceiptStorageMetrics(businessId, options);
  }
  return { totalCount: 0, totalBytes: 0, averageFileSizeBytes: 0 };
}

function inferVoucherFieldsRepo(ocrText, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.inferVoucherFields === 'function') {
    return repo.inferVoucherFields(ocrText, options);
  }
  if (receiptImageService && typeof receiptImageService.inferVoucherFields === 'function') {
    return receiptImageService.inferVoucherFields(ocrText, options);
  }
  return null;
}

async function logVoucherPrintExportRepo(printEvent, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.logVoucherPrintExport === 'function') {
    return repo.logVoucherPrintExport(printEvent, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function logBanglaQrTransactionRepo(txnData, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.logBanglaQrTransaction === 'function') {
    return repo.logBanglaQrTransaction(txnData, options);
  }
  return Promise.resolve({ success: false, error: 'NO_REPOSITORY' });
}

function getBanglaQrTransactionsRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getBanglaQrTransactions === 'function') {
    return repo.getBanglaQrTransactions(businessId);
  }
  return [];
}

function getBanglaQrTransactionByTxnNumberRepo(txnNumberOrId, businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getBanglaQrTransactionByTxnNumber === 'function') {
    return repo.getBanglaQrTransactionByTxnNumber(txnNumberOrId, businessId);
  }
  return null;
}

function logAddMoneyTransactionRepo(txnData, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.logAddMoneyTransaction === 'function') {
    return repo.logAddMoneyTransaction(txnData, options);
  }
  return Promise.resolve({ success: false, error: 'NO_REPOSITORY' });
}

function getAddMoneyTransactionsRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getAddMoneyTransactions === 'function') {
    return repo.getAddMoneyTransactions(businessId);
  }
  return [];
}

function logSoundboxNotificationRepo(eventData, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.logSoundboxNotification === 'function') {
    return repo.logSoundboxNotification(eventData, options);
  }
  return Promise.resolve({ success: false, error: 'NO_REPOSITORY' });
}

function getSoundboxNotificationsRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getSoundboxNotifications === 'function') {
    return repo.getSoundboxNotifications(businessId);
  }
  return [];
}

function saveSoundboxDeviceSettingsRepo(settings, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveSoundboxDeviceSettings === 'function') {
    return repo.saveSoundboxDeviceSettings(settings, options);
  }
  return Promise.resolve({ success: false, error: 'NO_REPOSITORY' });
}

function getSoundboxDeviceSettingsRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getSoundboxDeviceSettings === 'function') {
    return repo.getSoundboxDeviceSettings(businessId);
  }
  return null;
}

function logSoundboxTelemetryRepo(telemetryEvent, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.logSoundboxTelemetry === 'function') {
    return repo.logSoundboxTelemetry(telemetryEvent, options);
  }
  return Promise.resolve({ success: false, error: 'NO_REPOSITORY' });
}

function getSoundboxTelemetryRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getSoundboxTelemetry === 'function') {
    return repo.getSoundboxTelemetry(businessId);
  }
  return [];
}

function getDigitalInflowTransactionsRepo(businessId = null, filterOptions = {}, repo = defaultRepository) {
  if (repo && typeof repo.getDigitalInflowTransactions === 'function') {
    return repo.getDigitalInflowTransactions(businessId, filterOptions);
  }
  return [];
}

function getVoucherPrintLogsRepo(voucherNoOrJournalId, businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getVoucherPrintLogs === 'function') {
    return repo.getVoucherPrintLogs(voucherNoOrJournalId, businessId);
  }
  return [];
}

function getVoucherPrintLogsForBusinessRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getVoucherPrintLogsForBusiness === 'function') {
    return repo.getVoucherPrintLogsForBusiness(businessId);
  }
  return [];
}

async function deleteVoucherPrintLogRepo(logId, repo = defaultRepository) {
  if (repo && typeof repo.deleteVoucherPrintLog === 'function') {
    return repo.deleteVoucherPrintLog(logId);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function logBillPaymentTransactionRepo(businessId, txnData, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.logBillPaymentTransaction === 'function') {
    return repo.logBillPaymentTransaction(businessId, txnData, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getBillPaymentTransactionsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getBillPaymentTransactions === 'function') {
    return repo.getBillPaymentTransactions(businessId, options);
  }
  return [];
}

function getBillPaymentTransactionByIdRepo(businessId = null, txnId = null, repo = defaultRepository) {
  if (repo && typeof repo.getBillPaymentTransactionById === 'function') {
    return repo.getBillPaymentTransactionById(businessId, txnId);
  }
  return null;
}

async function saveBillerAccountRepo(businessId, billerData = {}, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveBillerAccount === 'function') {
    return repo.saveBillerAccount(businessId, billerData, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getSavedBillersRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getSavedBillers === 'function') {
    return repo.getSavedBillers(businessId, options);
  }
  return [];
}

async function deleteSavedBillerRepo(businessId, savedBillerId, repo = defaultRepository) {
  if (repo && typeof repo.deleteSavedBiller === 'function') {
    return repo.deleteSavedBiller(businessId, savedBillerId);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getBillReceiptListRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getBillReceiptList === 'function') {
    return repo.getBillReceiptList(businessId, options);
  }
  return [];
}

async function logTallyPayTransactionRepo(businessId, txnData, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.logTallyPayTransaction === 'function') {
    return repo.logTallyPayTransaction(businessId, txnData, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getTallyPayTransactionsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getTallyPayTransactions === 'function') {
    return repo.getTallyPayTransactions(businessId, options);
  }
  return { items: [], transactions: [], totalCount: 0, offset: 0, limit: 20, hasMore: false };
}

function getTallyPayTransactionByIdRepo(businessId = null, txnId = null, repo = defaultRepository) {
  if (repo && typeof repo.getTallyPayTransactionById === 'function') {
    return repo.getTallyPayTransactionById(businessId, txnId);
  }
  return null;
}

function getTallyPayMonthlySummaryRepo(businessId = null, month = null, repo = defaultRepository) {
  if (repo && typeof repo.getTallyPayMonthlySummary === 'function') {
    return repo.getTallyPayMonthlySummary(businessId, month);
  }
  return null;
}

function sanitizeStateRepo(state) {
  return sanitizeState(state);
}

async function saveTallyPayBeneficiaryRepo(businessId, beneficiaryData, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveTallyPayBeneficiary === 'function') {
    return repo.saveTallyPayBeneficiary(businessId, beneficiaryData, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getTallyPayBeneficiariesRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getTallyPayBeneficiaries === 'function') {
    return repo.getTallyPayBeneficiaries(businessId, options);
  }
  return { items: [], beneficiaries: [], totalCount: 0, offset: 0, limit: 50, hasMore: false };
}

function getTallyPayBeneficiaryByIdRepo(businessId = null, id = null, repo = defaultRepository) {
  if (repo && typeof repo.getTallyPayBeneficiaryById === 'function') {
    return repo.getTallyPayBeneficiaryById(businessId, id);
  }
  return null;
}

async function updateTallyPayBeneficiaryRepo(businessId, id, updates = {}, repo = defaultRepository) {
  if (repo && typeof repo.updateTallyPayBeneficiary === 'function') {
    return repo.updateTallyPayBeneficiary(businessId, id, updates);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function deleteTallyPayBeneficiaryRepo(businessId, id, credential = null, repo = defaultRepository) {
  if (repo && typeof repo.deleteTallyPayBeneficiary === 'function') {
    return repo.deleteTallyPayBeneficiary(businessId, id, credential);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}




async function saveQrSettlementActionRepo(businessId, actionData, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveQrSettlementAction === 'function') {
    return repo.saveQrSettlementAction(businessId, actionData, options);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getQrSettlementActionsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getQrSettlementActions === 'function') {
    return repo.getQrSettlementActions(businessId, options);
  }
  return { items: [], actions: [], settlements: [], totalCount: 0, offset: 0, limit: 50, hasMore: false };
}

function getSettlementActionByTxnNumberRepo(businessId = null, txnNumber = null, repo = defaultRepository) {
  if (repo && typeof repo.getSettlementActionByTxnNumber === 'function') {
    return repo.getSettlementActionByTxnNumber(businessId, txnNumber);
  }
  return null;
}

async function markQrSettlementActionsSyncedRepo(businessId = null, ids = [], repo = defaultRepository) {
  if (repo && typeof repo.markQrSettlementActionsSynced === 'function') {
    return repo.markQrSettlementActionsSynced(businessId, ids);
  }
  return { success: false, count: 0 };
}


async function saveMerchantDisbursementRepo(businessId, disbursement, repo = defaultRepository) {
  if (repo && typeof repo.saveMerchantDisbursement === 'function') {
    return repo.saveMerchantDisbursement(businessId, disbursement);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getMerchantDisbursementsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantDisbursements === 'function') {
    return repo.getMerchantDisbursements(businessId, options);
  }
  return { items: [], disbursements: [], totalCount: 0, totalAmount: 0, totalAmountPaisa: 0, offset: 0, limit: 50, hasMore: false };
}

function getDisbursementByIdRepo(businessId = null, id = null, repo = defaultRepository) {
  if (repo && typeof repo.getDisbursementById === 'function') {
    return repo.getDisbursementById(businessId, id);
  }
  return null;
}

async function saveReconciliationRepo(businessId, reconData, repo = defaultRepository) {
  if (repo && typeof repo.saveReconciliation === 'function') {
    return repo.saveReconciliation(businessId, reconData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getReconciliationsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getReconciliations === 'function') {
    return repo.getReconciliations(businessId, options);
  }
  return { items: [], reconciliations: [], totalCount: 0, offset: 0, limit: 50, hasMore: false };
}

function getUnsyncedReconciliationsRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedReconciliations === 'function') {
    return repo.getUnsyncedReconciliations(businessId);
  }
  return [];
}

async function markReconciliationsSyncedRepo(businessId = null, ids = [], repo = defaultRepository) {
  if (repo && typeof repo.markReconciliationsSynced === 'function') {
    return repo.markReconciliationsSynced(businessId, ids);
  }
  return { success: false, count: 0 };
}

function getAutoDisbursementConfigRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getAutoDisbursementConfig === 'function') {
    return repo.getAutoDisbursementConfig(businessId);
  }
  return {
    businessId: String(businessId || '1'),
    isAutoDisbursementEnabled: false,
    linkedBankAccountId: null,
    minThresholdPaisa: 50000,
    minThresholdTaka: 500.0,
    payoutTime: '23:00',
    preferInstant: false,
  };
}

async function saveAutoDisbursementConfigRepo(businessId = null, config = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveAutoDisbursementConfig === 'function') {
    return repo.saveAutoDisbursementConfig(businessId, config);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}


async function saveLinkedBankAccountRepo(businessId = null, accountData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveLinkedBankAccount === 'function') {
    return repo.saveLinkedBankAccount(businessId, accountData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getLinkedBankAccountsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getLinkedBankAccounts === 'function') {
    return repo.getLinkedBankAccounts(businessId, options);
  }
  return { items: [], accounts: [], totalCount: 0 };
}

function getLinkedBankAccountByIdRepo(businessId = null, id = null, repo = defaultRepository) {
  if (repo && typeof repo.getLinkedBankAccountById === 'function') {
    return repo.getLinkedBankAccountById(businessId, id);
  }
  return null;
}

async function deleteLinkedBankAccountRepo(businessId = null, accountId = null, repo = defaultRepository) {
  if (repo && typeof repo.deleteLinkedBankAccount === 'function') {
    return repo.deleteLinkedBankAccount(businessId, accountId);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function setDefaultBankAccountRepo(businessId = null, accountId = null, repo = defaultRepository) {
  if (repo && typeof repo.setDefaultBankAccount === 'function') {
    return repo.setDefaultBankAccount(businessId, accountId);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function verifyLinkedBankAccountRepo(businessId = null, accountId = null, depositPaisa = null, repo = defaultRepository) {
  if (repo && typeof repo.verifyLinkedBankAccount === 'function') {
    return repo.verifyLinkedBankAccount(businessId, accountId, depositPaisa);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function saveLinkedMfsAccountRepo(businessId = null, mfsData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveLinkedMfsAccount === 'function') {
    return repo.saveLinkedMfsAccount(businessId, mfsData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getLinkedMfsAccountsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getLinkedMfsAccounts === 'function') {
    return repo.getLinkedMfsAccounts(businessId, options);
  }
  return { items: [], mfsAccounts: [], totalCount: 0 };
}

function getLinkedMfsAccountByIdRepo(businessId = null, id = null, repo = defaultRepository) {
  if (repo && typeof repo.getLinkedMfsAccountById === 'function') {
    return repo.getLinkedMfsAccountById(businessId, id);
  }
  return null;
}

async function deleteLinkedMfsAccountRepo(businessId = null, id = null, repo = defaultRepository) {
  if (repo && typeof repo.deleteLinkedMfsAccount === 'function') {
    return repo.deleteLinkedMfsAccount(businessId, id);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function saveCardRepo(businessId = null, cardData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveCard === "function") {
    return repo.saveCard(businessId, cardData);
  }
  return { success: false, error: "NO_REPOSITORY" };
}

function getSavedCardsRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getSavedCards === "function") {
    return repo.getSavedCards(businessId);
  }
  return { items: [], cards: [], totalCount: 0 };
}

function getSavedCardByIdRepo(businessId = null, cardId = null, repo = defaultRepository) {
  if (repo && typeof repo.getSavedCardById === "function") {
    return repo.getSavedCardById(businessId, cardId);
  }
  return null;
}


function saveTransferRecordRepo(businessId = null, recordData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveTransferRecord === 'function') {
    return repo.saveTransferRecord(businessId, recordData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getTransferHistoryRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getTransferHistory === 'function') {
    return repo.getTransferHistory(businessId, options);
  }
  return { items: [], transfers: [], totalCount: 0, totalAmountPaisa: 0, totalFeePaisa: 0 };
}

function getTransferByIdRepo(businessId = null, transferId = null, repo = defaultRepository) {
  if (repo && typeof repo.getTransferById === 'function') {
    return repo.getTransferById(businessId, transferId);
  }
  return null;
}

async function saveTransactionSettlementActionRepo(businessId = null, actionRecord = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveTransactionSettlementAction === 'function') {
    return repo.saveTransactionSettlementAction(businessId, actionRecord);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getTransactionSettlementActionsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getTransactionSettlementActions === 'function') {
    return repo.getTransactionSettlementActions(businessId, options);
  }
  return [];
}

function getTransactionSettlementActionByTxnRepo(businessId = null, txnNumber = null, repo = defaultRepository) {
  if (repo && typeof repo.getTransactionSettlementActionByTxn === 'function') {
    return repo.getTransactionSettlementActionByTxn(businessId, txnNumber);
  }
  return null;
}

function existsTransactionSettlementActionRepo(businessId = null, txnNumber = null, repo = defaultRepository) {
  if (repo && typeof repo.existsTransactionSettlementAction === 'function') {
    return repo.existsTransactionSettlementAction(businessId, txnNumber);
  }
  return false;
}

function getUnsyncedTxnSettlementActionsRepo(businessId = null, limit = 100, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedTxnSettlementActions === 'function') {
    return repo.getUnsyncedTxnSettlementActions(businessId, limit);
  }
  return [];
}

async function updateTxnSettlementActionSyncStatusByIdsRepo(businessId = null, synced = 1, ids = [], repo = defaultRepository) {
  if (repo && typeof repo.updateTxnSettlementActionSyncStatusByIds === 'function') {
    return repo.updateTxnSettlementActionSyncStatusByIds(businessId, synced, ids);
  }
  return 0;
}

async function updateAllTxnSettlementActionUnsyncedRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.updateAllTxnSettlementActionUnsynced === 'function') {
    return repo.updateAllTxnSettlementActionUnsynced(businessId);
  }
  return 0;
}

async function saveSettlementHistoryRecordRepo(businessId = null, record = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveSettlementHistoryRecord === 'function') {
    return repo.saveSettlementHistoryRecord(businessId, record);
  }
  return null;
}

function getSettlementHistoryRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getSettlementHistory === 'function') {
    return repo.getSettlementHistory(businessId, options);
  }
  return [];
}

async function saveSoundboxConfigRepo(businessId = null, config = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveSoundboxConfig === 'function') {
    return repo.saveSoundboxConfig(businessId, config);
  }
  return null;
}

function getSoundboxConfigRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getSoundboxConfig === 'function') {
    return repo.getSoundboxConfig(businessId);
  }
  return null;
}

async function saveMerchantKycRepo(businessId = null, kycRecord = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveMerchantKyc === 'function') {
    return repo.saveMerchantKyc(businessId, kycRecord);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getMerchantKycByBusinessIdRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantKycByBusinessId === 'function') {
    return repo.getMerchantKycByBusinessId(businessId);
  }
  return null;
}

function getMerchantKycListRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantKycList === 'function') {
    return repo.getMerchantKycList(businessId, options);
  }
  return [];
}

async function updateMerchantKycStatusRepo(businessId = null, status = 'PENDING', livenessScore = null, repo = defaultRepository) {
  if (repo && typeof repo.updateMerchantKycStatus === 'function') {
    return repo.updateMerchantKycStatus(businessId, status, livenessScore);
  }
  return { success: false };
}

function getUnsyncedMerchantKycRepo(businessId = null, limit = 100, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedMerchantKyc === 'function') {
    return repo.getUnsyncedMerchantKyc(businessId, limit);
  }
  return [];
}

async function updateMerchantKycSyncStatusRepo(businessId = null, synced = 1, repo = defaultRepository) {
  if (repo && typeof repo.updateMerchantKycSyncStatus === 'function') {
    return repo.updateMerchantKycSyncStatus(businessId, synced);
  }
  return { success: false, updatedCount: 0 };
}

async function deleteMerchantKycRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.deleteMerchantKyc === 'function') {
    return repo.deleteMerchantKyc(businessId);
  }
  return { success: false };
}

// REA-ITER-238 Wrapper Functions
async function saveMerchantQrOrderRepo(businessId = null, orderData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveMerchantQrOrder === 'function') {
    return repo.saveMerchantQrOrder(businessId, orderData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getMerchantQrOrderByIdRepo(businessId = null, orderId = null, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantQrOrderById === 'function') {
    return repo.getMerchantQrOrderById(businessId, orderId);
  }
  return null;
}

function getMerchantQrOrdersByBusinessIdRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantQrOrdersByBusinessId === 'function') {
    return repo.getMerchantQrOrdersByBusinessId(businessId, options);
  }
  return [];
}

async function updateMerchantQrOrderStatusRepo(businessId = null, orderId = null, status = 'CONFIRMED', trackingInfo = null, repo = defaultRepository) {
  if (repo && typeof repo.updateMerchantQrOrderStatus === 'function') {
    return repo.updateMerchantQrOrderStatus(businessId, orderId, status, trackingInfo);
  }
  return { success: false };
}

async function deleteMerchantQrOrderRepo(businessId = null, orderId = null, repo = defaultRepository) {
  if (repo && typeof repo.deleteMerchantQrOrder === 'function') {
    return repo.deleteMerchantQrOrder(businessId, orderId);
  }
  return { success: false };
}

function getUnsyncedMerchantQrOrdersRepo(businessId = null, limit = 100, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedMerchantQrOrders === 'function') {
    return repo.getUnsyncedMerchantQrOrders(businessId, limit);
  }
  return [];
}

async function updateMerchantQrOrderSyncStatusRepo(businessId = null, orderId = null, synced = 1, repo = defaultRepository) {
  if (repo && typeof repo.updateMerchantQrOrderSyncStatus === 'function') {
    return repo.updateMerchantQrOrderSyncStatus(businessId, orderId, synced);
  }
  return { success: false };
}

function existsMerchantQrOrderRepo(businessId = null, orderId = null, repo = defaultRepository) {
  if (repo && typeof repo.existsMerchantQrOrder === 'function') {
    return repo.existsMerchantQrOrder(businessId, orderId);
  }
  return false;
}

// REA-ITER-239 Wrapper Functions
async function saveMerchantLoanRepo(businessId = null, loanData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveMerchantLoan === 'function') {
    return repo.saveMerchantLoan(businessId, loanData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getMerchantLoansByBusinessIdRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantLoansByBusinessId === 'function') {
    return repo.getMerchantLoansByBusinessId(businessId, options);
  }
  return [];
}

function getMerchantLoansRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantLoans === 'function') {
    return repo.getMerchantLoans(businessId, options);
  }
  return [];
}

function getMerchantLoanByIdRepo(businessId = null, loanId = null, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantLoanById === 'function') {
    return repo.getMerchantLoanById(businessId, loanId);
  }
  return null;
}

async function updateMerchantLoanStatusRepo(businessId = null, loanId = null, status = 'ACTIVE', extraFields = {}, repo = defaultRepository) {
  if (repo && typeof repo.updateMerchantLoanStatus === 'function') {
    return repo.updateMerchantLoanStatus(businessId, loanId, status, extraFields);
  }
  return { success: false };
}

async function updateMerchantLoanRepaymentRepo(businessId = null, loanId = null, paidAmountPaisa = 0, repo = defaultRepository) {
  if (repo && typeof repo.updateMerchantLoanRepayment === 'function') {
    return repo.updateMerchantLoanRepayment(businessId, loanId, paidAmountPaisa);
  }
  return { success: false };
}

async function saveMerchantLoanEmisRepo(businessId = null, loanId = null, emis = [], repo = defaultRepository) {
  if (repo && typeof repo.saveMerchantLoanEmis === 'function') {
    return repo.saveMerchantLoanEmis(businessId, loanId, emis);
  }
  return { success: false };
}

function getMerchantLoanEmisRepo(businessId = null, loanId = null, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantLoanEmis === 'function') {
    return repo.getMerchantLoanEmis(businessId, loanId);
  }
  return [];
}

async function recordMerchantLoanEmiPaymentRepo(businessId = null, loanId = null, emiId = null, paymentData = {}, repo = defaultRepository) {
  if (repo && typeof repo.recordMerchantLoanEmiPayment === 'function') {
    return repo.recordMerchantLoanEmiPayment(businessId, loanId, emiId, paymentData);
  }
  return { success: false };
}

function getUnsyncedMerchantLoansRepo(businessId = null, limit = 50, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedMerchantLoans === 'function') {
    return repo.getUnsyncedMerchantLoans(businessId, limit);
  }
  return [];
}

async function updateMerchantLoanSyncStatusRepo(businessId = null, loanId = null, synced = 1, repo = defaultRepository) {
  if (repo && typeof repo.updateMerchantLoanSyncStatus === 'function') {
    return repo.updateMerchantLoanSyncStatus(businessId, loanId, synced);
  }
  return { success: false };
}

function getUnsyncedMerchantLoanEmisRepo(businessId = null, limit = 100, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedMerchantLoanEmis === 'function') {
    return repo.getUnsyncedMerchantLoanEmis(businessId, limit);
  }
  return [];
}

async function updateMerchantLoanEmiSyncStatusRepo(businessId = null, emiId = null, synced = 1, repo = defaultRepository) {
  if (repo && typeof repo.updateMerchantLoanEmiSyncStatus === 'function') {
    return repo.updateMerchantLoanEmiSyncStatus(businessId, emiId, synced);
  }
  return { success: false };
}

async function deleteMerchantLoanRepo(businessId = null, loanId = null, repo = defaultRepository) {
  if (repo && typeof repo.deleteMerchantLoan === 'function') {
    return repo.deleteMerchantLoan(businessId, loanId);
  }
  return { success: false };
}

function existsMerchantLoanRepo(businessId = null, loanId = null, repo = defaultRepository) {
  if (repo && typeof repo.existsMerchantLoan === 'function') {
    return repo.existsMerchantLoan(businessId, loanId);
  }
  return false;
}

// REA-ITER-240 Wrapper Functions
async function saveMerchantRewardRepo(businessId = null, rewardData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveMerchantReward === 'function') {
    return repo.saveMerchantReward(businessId, rewardData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getMerchantRewardsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantRewards === 'function') {
    return repo.getMerchantRewards(businessId, options);
  }
  return [];
}

function getMerchantRewardByIdRepo(businessId = null, rewardId = null, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantRewardById === 'function') {
    return repo.getMerchantRewardById(businessId, rewardId);
  }
  return null;
}

async function scratchRewardRepo(businessId = null, rewardId = null, scratchPercentage = 100, repo = defaultRepository) {
  if (repo && typeof repo.scratchReward === 'function') {
    return repo.scratchReward(businessId, rewardId, scratchPercentage);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function claimRewardRepo(businessId = null, rewardId = null, walletBalancePaisa = 0, repo = defaultRepository) {
  if (repo && typeof repo.claimReward === 'function') {
    return repo.claimReward(businessId, rewardId, walletBalancePaisa);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function deleteMerchantRewardRepo(businessId = null, rewardId = null, repo = defaultRepository) {
  if (repo && typeof repo.deleteMerchantReward === 'function') {
    return repo.deleteMerchantReward(businessId, rewardId);
  }
  return { success: false };
}

function existsMerchantRewardRepo(businessId = null, rewardId = null, repo = defaultRepository) {
  if (repo && typeof repo.existsMerchantReward === 'function') {
    return repo.existsMerchantReward(businessId, rewardId);
  }
  return false;
}

function getUnsyncedMerchantRewardsRepo(businessId = null, limit = 50, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedMerchantRewards === 'function') {
    return repo.getUnsyncedMerchantRewards(businessId, limit);
  }
  return [];
}

async function updateMerchantRewardSyncStatusRepo(businessId = null, ids = [], synced = 1, repo = defaultRepository) {
  if (repo && typeof repo.updateMerchantRewardSyncStatus === 'function') {
    return repo.updateMerchantRewardSyncStatus(businessId, ids, synced);
  }
  return 0;
}

async function saveRewardLedgerEntryRepo(businessId = null, entryData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveRewardLedgerEntry === 'function') {
    return repo.saveRewardLedgerEntry(businessId, entryData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getRewardLedgerRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getRewardLedger === 'function') {
    return repo.getRewardLedger(businessId, options);
  }
  return [];
}

function getMerchantRewardPointsBalanceRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getMerchantRewardPointsBalance === 'function') {
    return repo.getMerchantRewardPointsBalance(businessId);
  }
  return 0;
}

async function redeemPointsToWalletRepo(businessId = null, points = 0, currentWalletBalancePaisa = 0, repo = defaultRepository) {
  if (repo && typeof repo.redeemPointsToWallet === 'function') {
    return repo.redeemPointsToWallet(businessId, points, currentWalletBalancePaisa);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getUnsyncedRewardLedgerEntriesRepo(businessId = null, limit = 50, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedRewardLedgerEntries === 'function') {
    return repo.getUnsyncedRewardLedgerEntries(businessId, limit);
  }
  return [];
}

async function updateRewardLedgerSyncStatusRepo(businessId = null, ids = [], synced = 1, repo = defaultRepository) {
  if (repo && typeof repo.updateRewardLedgerSyncStatus === 'function') {
    return repo.updateRewardLedgerSyncStatus(businessId, ids, synced);
  }
  return 0;
}


function existsMerchantKycRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.existsMerchantKyc === 'function') {
    return repo.existsMerchantKyc(businessId);
  }
  return false;
}

async function saveRechargeRecordRepo(businessId = null, recordData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveRechargeRecord === 'function') {
    return repo.saveRechargeRecord(businessId, recordData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getRechargeHistoryRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getRechargeHistory === 'function') {
    return repo.getRechargeHistory(businessId, options);
  }
  return [];
}

function getRechargeByIdRepo(businessId = null, rechargeId = null, repo = defaultRepository) {
  if (repo && typeof repo.getRechargeById === 'function') {
    return repo.getRechargeById(businessId, rechargeId);
  }
  return null;
}

function sanitizeForCloudBackupRepo(state = null, repo = defaultRepository) {
  if (repo && typeof repo.getFullBackupState === 'function') {
    return repo.getFullBackupState(state || repo.currentStore);
  }
  return null;
}

async function deleteCardRepo(businessId = null, cardId = null, repo = defaultRepository) {
  if (repo && typeof repo.deleteCard === "function") {
    return repo.deleteCard(businessId, cardId);
  }
  return { success: false, error: "NO_REPOSITORY" };
}



async function saveAnalyticsSnapshotRepo(businessId = null, snapshotData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveAnalyticsSnapshot === 'function') {
    return repo.saveAnalyticsSnapshot(businessId, snapshotData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getAnalyticsSnapshotsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getAnalyticsSnapshots === 'function') {
    return repo.getAnalyticsSnapshots(businessId, options);
  }
  return [];
}

function getAnalyticsSnapshotByKeyRepo(businessId = null, periodKey = '', repo = defaultRepository) {
  if (repo && typeof repo.getAnalyticsSnapshotByKey === 'function') {
    return repo.getAnalyticsSnapshotByKey(businessId, periodKey);
  }
  return null;
}

async function deleteAnalyticsSnapshotRepo(businessId = null, snapshotId = null, repo = defaultRepository) {
  if (repo && typeof repo.deleteAnalyticsSnapshot === 'function') {
    return repo.deleteAnalyticsSnapshot(businessId, snapshotId);
  }
  return { success: false };
}

function getUnsyncedAnalyticsSnapshotsRepo(businessId = null, limit = 50, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedAnalyticsSnapshots === 'function') {
    return repo.getUnsyncedAnalyticsSnapshots(businessId, limit);
  }
  return [];
}

async function updateAnalyticsSnapshotSyncStatusRepo(businessId = null, ids = [], synced = 1, repo = defaultRepository) {
  if (repo && typeof repo.updateAnalyticsSnapshotSyncStatus === 'function') {
    return repo.updateAnalyticsSnapshotSyncStatus(businessId, ids, synced);
  }
  return 0;
}

async function saveSalesForecastRepo(businessId = null, forecastData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveSalesForecast === 'function') {
    return repo.saveSalesForecast(businessId, forecastData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getSalesForecastsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getSalesForecasts === 'function') {
    return repo.getSalesForecasts(businessId, options);
  }
  return [];
}

function getLatestSalesForecastRepo(businessId = null, repo = defaultRepository) {
  if (repo && typeof repo.getLatestSalesForecast === 'function') {
    return repo.getLatestSalesForecast(businessId);
  }
  return null;
}

async function deleteSalesForecastRepo(businessId = null, forecastId = null, repo = defaultRepository) {
  if (repo && typeof repo.deleteSalesForecast === 'function') {
    return repo.deleteSalesForecast(businessId, forecastId);
  }
  return { success: false };
}

function getUnsyncedSalesForecastsRepo(businessId = null, limit = 50, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedSalesForecasts === 'function') {
    return repo.getUnsyncedSalesForecasts(businessId, limit);
  }
  return [];
}

async function updateSalesForecastSyncStatusRepo(businessId = null, ids = [], synced = 1, repo = defaultRepository) {
  if (repo && typeof repo.updateSalesForecastSyncStatus === 'function') {
    return repo.updateSalesForecastSyncStatus(businessId, ids, synced);
  }
  return 0;
}

function computeBusinessHealthMetricsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.computeBusinessHealthMetrics === 'function') {
    return repo.computeBusinessHealthMetrics(businessId, options);
  }
  return { healthScore: 0, tier: { code: 'AT_RISK' } };
}

// =========================================================================
// REA-ITER-242: STANDALONE REPO FUNCTIONS FOR DISPUTES & RECONCILIATION
// =========================================================================

async function saveDisputeTicketRepo(businessId = null, ticketData = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveDisputeTicket === 'function') {
    return repo.saveDisputeTicket(businessId, ticketData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getDisputeTicketsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getDisputeTickets === 'function') {
    return repo.getDisputeTickets(businessId, options);
  }
  return { items: [], tickets: [], totalCount: 0, offset: 0, limit: 50, hasMore: false };
}

function getDisputeTicketByIdRepo(businessId = null, ticketId = '', repo = defaultRepository) {
  if (repo && typeof repo.getDisputeTicketById === 'function') {
    return repo.getDisputeTicketById(businessId, ticketId);
  }
  return null;
}

async function updateDisputeTicketStatusRepo(businessId = null, ticketId = '', newStatus = '', resolutionData = {}, repo = defaultRepository) {
  if (repo && typeof repo.updateDisputeTicketStatus === 'function') {
    return repo.updateDisputeTicketStatus(businessId, ticketId, newStatus, resolutionData);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function deleteDisputeTicketRepo(businessId = null, ticketId = '', repo = defaultRepository) {
  if (repo && typeof repo.deleteDisputeTicket === 'function') {
    return repo.deleteDisputeTicket(businessId, ticketId);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getUnsyncedDisputeTicketsRepo(businessId = null, limit = 100, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedDisputeTickets === 'function') {
    return repo.getUnsyncedDisputeTickets(businessId, limit);
  }
  return [];
}

async function updateDisputeTicketSyncStatusRepo(businessId = null, ticketIdOrIds = [], synced = 1, repo = defaultRepository) {
  if (repo && typeof repo.updateDisputeTicketSyncStatus === 'function') {
    return repo.updateDisputeTicketSyncStatus(businessId, ticketIdOrIds, synced);
  }
  return 0;
}

async function performAutoSettlementReconciliationRepo(businessId = null, date = null, repo = defaultRepository) {
  if (repo && typeof repo.performAutoSettlementReconciliation === 'function') {
    return repo.performAutoSettlementReconciliation(businessId, date);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

async function saveSettlementActionRepo(businessId = null, action = {}, repo = defaultRepository) {
  if (repo && typeof repo.saveSettlementAction === 'function') {
    return repo.saveSettlementAction(businessId, action);
  }
  return { success: false, error: 'NO_REPOSITORY' };
}

function getSettlementActionsRepo(businessId = null, options = {}, repo = defaultRepository) {
  if (repo && typeof repo.getSettlementActions === 'function') {
    return repo.getSettlementActions(businessId, options);
  }
  return [];
}

function getSettlementActionByTxnRepo(businessId = null, txn = '', repo = defaultRepository) {
  if (repo && typeof repo.getSettlementActionByTxn === 'function') {
    return repo.getSettlementActionByTxn(businessId, txn);
  }
  return null;
}

function getUnsyncedSettlementActionsRepo(businessId = null, limit = 100, repo = defaultRepository) {
  if (repo && typeof repo.getUnsyncedSettlementActions === 'function') {
    return repo.getUnsyncedSettlementActions(businessId, limit);
  }
  return [];
}

async function updateSettlementActionSyncStatusRepo(businessId = null, synced = 1, ids = [], repo = defaultRepository) {
  if (repo && typeof repo.updateSettlementActionSyncStatus === 'function') {
    return repo.updateSettlementActionSyncStatus(businessId, synced, ids);
  }
  return 0;
}

async function updateReconciliationSyncStatusRepo(businessId = null, ids = [], syncStatus = 1, repo = defaultRepository) {
  if (repo && typeof repo.updateReconciliationSyncStatus === 'function') {
    return repo.updateReconciliationSyncStatus(businessId, ids, syncStatus);
  }
  return 0;
}

const repoExport = {
  V6_KEY,
  V5_KEY,
  StorageRepository,
  MemoryStorageAdapter,
  storageRepository: defaultRepository,
  createDefaultState,
  SAMPLE_CUSTOMER_MAPPINGS,
  migrateLegacySampleCustomerNames,
  loadStore,
  VALID_COLLECTIONS,
  indexJournalsChronologically,
  queryJournalsByDateRange,
  clearJournalIndexCache,
  normalizeAccountFields,
  normalizeTagadaLogFields,
  resolveStatementDateRange,
  generateAccountStatement: generateAccountStatementRepo,
  recordTagadaLog,
  getTagadaQuota,
  adjustTagadaQuota,
  listTagadaLogs,
  calculateSmsSegments,
  getBulkTagadaEligibleCustomers: getBulkTagadaEligibleCustomersRepo,
  prepareBulkTagadaBatch: prepareBulkTagadaBatchRepo,
  dispatchBulkTagadaBatch: dispatchBulkTagadaBatchRepo,
  generateStatementDocumentPayload: generateStatementDocumentPayloadRepo,
  REPORT_TYPES,
  escapeHtml,
  generatePrintableHtmlStatement: generatePrintableHtmlStatementRepo,
  generateConsolidatedReportDocument: generateConsolidatedReportDocumentRepo,
  generatePrintableHtmlReport: generatePrintableHtmlReportRepo,
  generateCustomerListReportDocument: generateCustomerListReportDocumentRepo,
  generateExpenseReportDocument: generateExpenseReportDocumentRepo,
  generateStockMovementReportDocument: generateStockMovementReportDocumentRepo,
  REPORT_PREFIXES,
  toBengaliNumeral,
  paginateStatementDocument: paginateStatementDocumentRepo,
  paginateConsolidatedReportDocument: paginateConsolidatedReportDocumentRepo,
  generatePdfShareIntentPayload: generatePdfShareIntentPayloadRepo,
  simulateSyncBatch: simulateSyncBatchRepo,
  exportCompressedBackup: exportCompressedBackupRepo,
  importCompressedBackup: importCompressedBackupRepo,
  isStoragePayloadCompressed,
  decompressStoragePayload,
  extractRecordTimestamp,
  recordsDiffer,
  TelemetryService,
  telemetryService: defaultTelemetryService,
  EVENT_TYPES,
  MAX_EVENT_QUEUE_SIZE,
  getSecurityConfig: getSecurityConfigRepo,
  verifyAppPin: verifyAppPinRepo,
  setAppPinSecure: setAppPinSecureRepo,
  changeAppPinSecure: changeAppPinSecureRepo,
  disableAppPinSecure: disableAppPinSecureRepo,
  recordAppActivity: recordAppActivityRepo,
  recordAppBackgrounded: recordAppBackgroundedRepo,
  recordAppForegrounded: recordAppForegroundedRepo,
  unlockAppWithPin: unlockAppWithPinRepo,
  unlockAppWithBiometrics: unlockAppWithBiometricsRepo,
  getAppLockoutStatus: getAppLockoutStatusRepo,
  securityService,
  audioNoteService,
  attachAudioNote: attachAudioNoteRepo,
  getAudioNotesForEntity: getAudioNotesForEntityRepo,
  getAudioNotesForBusiness: getAudioNotesForBusinessRepo,
  deleteAudioNote: deleteAudioNoteRepo,
  deleteAudioNotesForEntity: deleteAudioNotesForEntityRepo,
  deleteAccountCascade: deleteAccountCascadeRepo,
  cleanOrphanedAudioFiles: cleanOrphanedAudioFilesRepo,
  getAudioStorageMetrics: getAudioStorageMetricsRepo,
  receiptImageService,
  attachReceiptImage: attachReceiptImageRepo,
  getReceiptImagesForJournal: getReceiptImagesForJournalRepo,
  getReceiptImagesForBusiness: getReceiptImagesForBusinessRepo,
  deleteReceiptImage: deleteReceiptImageRepo,
  deleteReceiptImagesForJournal: deleteReceiptImagesForJournalRepo,
  cleanOrphanedReceiptImages: cleanOrphanedReceiptImagesRepo,
  getReceiptStorageMetrics: getReceiptStorageMetricsRepo,
  inferVoucherFields: inferVoucherFieldsRepo,
  isHighConfidence: isHighConfidence || (receiptImageService ? receiptImageService.isHighConfidence : null),
  isMediumConfidence: isMediumConfidence || (receiptImageService ? receiptImageService.isMediumConfidence : null),
  formatInferredSummary: formatInferredSummary || (receiptImageService ? receiptImageService.formatInferredSummary : null),
  CONFIDENCE_HIGH: CONFIDENCE_HIGH || 0.85,
  CONFIDENCE_MEDIUM: CONFIDENCE_MEDIUM || 0.60,
  voucherPdfService,
  thermalPrintService,
  logVoucherPrintExport: logVoucherPrintExportRepo,
  getVoucherPrintLogs: getVoucherPrintLogsRepo,
  getVoucherPrintLogsForBusiness: getVoucherPrintLogsForBusinessRepo,
  deleteVoucherPrintLog: deleteVoucherPrintLogRepo,
  banglaQrService,
  logBanglaQrTransaction: logBanglaQrTransactionRepo,
  getBanglaQrTransactions: getBanglaQrTransactionsRepo,
  getBanglaQrTransactionByTxnNumber: getBanglaQrTransactionByTxnNumberRepo,
  tallyPayService,
  soundboxService,
  logAddMoneyTransaction: logAddMoneyTransactionRepo,
  getAddMoneyTransactions: getAddMoneyTransactionsRepo,
  logSoundboxNotification: logSoundboxNotificationRepo,
  getSoundboxNotifications: getSoundboxNotificationsRepo,
  saveSoundboxDeviceSettings: saveSoundboxDeviceSettingsRepo,
  getSoundboxDeviceSettings: getSoundboxDeviceSettingsRepo,
  logSoundboxTelemetry: logSoundboxTelemetryRepo,
  getSoundboxTelemetry: getSoundboxTelemetryRepo,
  digitalAnalyticsService,
  getDigitalInflowTransactions: getDigitalInflowTransactionsRepo,
  batchTagadaService,
  logTagadaBatch,
  getTagadaLogsByAccount,
  getLastTagadaDateByAccount,
  setTagadaQuota,
  recordTagadaQuotaPurchase,
  getDebtAgingReport,
  billPaymentService,
  logBillPaymentTransaction: logBillPaymentTransactionRepo,
  getBillPaymentTransactions: getBillPaymentTransactionsRepo,
  getBillPaymentTransactionById: getBillPaymentTransactionByIdRepo,
  saveBillerAccount: saveBillerAccountRepo,
  getSavedBillers: getSavedBillersRepo,
  deleteSavedBiller: deleteSavedBillerRepo,
  getBillReceiptList: getBillReceiptListRepo,
  logTallyPayTransaction: logTallyPayTransactionRepo,
  getTallyPayTransactions: getTallyPayTransactionsRepo,
  getTallyPayTransactionById: getTallyPayTransactionByIdRepo,
  getTallyPayMonthlySummary: getTallyPayMonthlySummaryRepo,
  saveTallyPayBeneficiary: saveTallyPayBeneficiaryRepo,
  getTallyPayBeneficiaries: getTallyPayBeneficiariesRepo,
  getTallyPayBeneficiaryById: getTallyPayBeneficiaryByIdRepo,
  updateTallyPayBeneficiary: updateTallyPayBeneficiaryRepo,
  deleteTallyPayBeneficiary: deleteTallyPayBeneficiaryRepo,
  saveQrSettlementAction: saveQrSettlementActionRepo,
  getQrSettlementActions: getQrSettlementActionsRepo,
  getSettlementActionByTxnNumber: getSettlementActionByTxnNumberRepo,
  markQrSettlementActionsSynced: markQrSettlementActionsSyncedRepo,
  saveMerchantDisbursement: saveMerchantDisbursementRepo,
  getMerchantDisbursements: getMerchantDisbursementsRepo,
  getDisbursementById: getDisbursementByIdRepo,
  saveReconciliation: saveReconciliationRepo,
  getReconciliations: getReconciliationsRepo,
  getUnsyncedReconciliations: getUnsyncedReconciliationsRepo,
  markReconciliationsSynced: markReconciliationsSyncedRepo,
  getAutoDisbursementConfig: getAutoDisbursementConfigRepo,
  saveAutoDisbursementConfig: saveAutoDisbursementConfigRepo,
  saveWalletSecurityCredentials: saveWalletSecurityCredentialsRepo,
  getWalletSecurityCredentials: getWalletSecurityCredentialsRepo,
  registerDeviceBinding: registerDeviceBindingRepo,
  getDeviceBindings: getDeviceBindingsRepo,
  getActiveDeviceBinding: getActiveDeviceBindingRepo,
  revokeDeviceBinding: revokeDeviceBindingRepo,
  saveLinkedBankAccount: saveLinkedBankAccountRepo,
  getLinkedBankAccounts: getLinkedBankAccountsRepo,
  getLinkedBankAccountById: getLinkedBankAccountByIdRepo,
  deleteLinkedBankAccount: deleteLinkedBankAccountRepo,
  setDefaultBankAccount: setDefaultBankAccountRepo,
  verifyLinkedBankAccount: verifyLinkedBankAccountRepo,
  saveLinkedMfsAccount: saveLinkedMfsAccountRepo,
  getLinkedMfsAccounts: getLinkedMfsAccountsRepo,
  getLinkedMfsAccountById: getLinkedMfsAccountByIdRepo,
  deleteLinkedMfsAccount: deleteLinkedMfsAccountRepo,
  saveCard: saveCardRepo,
  getSavedCards: getSavedCardsRepo,
  getSavedCardById: getSavedCardByIdRepo,
  deleteCard: deleteCardRepo,
  saveTransferRecord: saveTransferRecordRepo,
  getTransferHistory: getTransferHistoryRepo,
  getTransferById: getTransferByIdRepo,
  saveTransactionSettlementAction: saveTransactionSettlementActionRepo,
  getTransactionSettlementActions: getTransactionSettlementActionsRepo,
  getTransactionSettlementActionByTxn: getTransactionSettlementActionByTxnRepo,
  existsTransactionSettlementAction: existsTransactionSettlementActionRepo,
  getUnsyncedTxnSettlementActions: getUnsyncedTxnSettlementActionsRepo,
  updateTxnSettlementActionSyncStatusByIds: updateTxnSettlementActionSyncStatusByIdsRepo,
  updateAllTxnSettlementActionUnsynced: updateAllTxnSettlementActionUnsyncedRepo,
  saveSettlementHistoryRecord: saveSettlementHistoryRecordRepo,
  getSettlementHistory: getSettlementHistoryRepo,
  saveSoundboxConfig: saveSoundboxConfigRepo,
  getSoundboxConfig: getSoundboxConfigRepo,
  saveMerchantKyc: saveMerchantKycRepo,
  getMerchantKycByBusinessId: getMerchantKycByBusinessIdRepo,
  getMerchantKycList: getMerchantKycListRepo,
  updateMerchantKycStatus: updateMerchantKycStatusRepo,
  getUnsyncedMerchantKyc: getUnsyncedMerchantKycRepo,
  updateMerchantKycSyncStatus: updateMerchantKycSyncStatusRepo,
  existsMerchantKyc: existsMerchantKycRepo,
  deleteMerchantKyc: deleteMerchantKycRepo,
  saveMerchantQrOrder: saveMerchantQrOrderRepo,
  getMerchantQrOrderById: getMerchantQrOrderByIdRepo,
  getMerchantQrOrdersByBusinessId: getMerchantQrOrdersByBusinessIdRepo,
  updateMerchantQrOrderStatus: updateMerchantQrOrderStatusRepo,
  deleteMerchantQrOrder: deleteMerchantQrOrderRepo,
  getUnsyncedMerchantQrOrders: getUnsyncedMerchantQrOrdersRepo,
  updateMerchantQrOrderSyncStatus: updateMerchantQrOrderSyncStatusRepo,
  existsMerchantQrOrder: existsMerchantQrOrderRepo,
  saveMerchantLoan: saveMerchantLoanRepo,
  getMerchantLoansByBusinessId: getMerchantLoansByBusinessIdRepo,
  getMerchantLoans: getMerchantLoansRepo,
  getMerchantLoanById: getMerchantLoanByIdRepo,
  updateMerchantLoanStatus: updateMerchantLoanStatusRepo,
  updateMerchantLoanRepayment: updateMerchantLoanRepaymentRepo,
  saveMerchantLoanEmis: saveMerchantLoanEmisRepo,
  getMerchantLoanEmis: getMerchantLoanEmisRepo,
  recordMerchantLoanEmiPayment: recordMerchantLoanEmiPaymentRepo,
  getUnsyncedMerchantLoans: getUnsyncedMerchantLoansRepo,
  updateMerchantLoanSyncStatus: updateMerchantLoanSyncStatusRepo,
  getUnsyncedMerchantLoanEmis: getUnsyncedMerchantLoanEmisRepo,
  updateMerchantLoanEmiSyncStatus: updateMerchantLoanEmiSyncStatusRepo,
  deleteMerchantLoan: deleteMerchantLoanRepo,
  existsMerchantLoan: existsMerchantLoanRepo,
  saveMerchantReward: saveMerchantRewardRepo,
  getMerchantRewards: getMerchantRewardsRepo,
  getMerchantRewardsByBusinessId: getMerchantRewardsRepo,
  getMerchantRewardById: getMerchantRewardByIdRepo,
  scratchReward: scratchRewardRepo,
  claimReward: claimRewardRepo,
  deleteMerchantReward: deleteMerchantRewardRepo,
  existsMerchantReward: existsMerchantRewardRepo,
  getUnsyncedMerchantRewards: getUnsyncedMerchantRewardsRepo,
  updateMerchantRewardSyncStatus: updateMerchantRewardSyncStatusRepo,
  saveRewardLedgerEntry: saveRewardLedgerEntryRepo,
  getRewardLedger: getRewardLedgerRepo,
  getMerchantRewardPointsBalance: getMerchantRewardPointsBalanceRepo,
  redeemPointsToWallet: redeemPointsToWalletRepo,
  getUnsyncedRewardLedgerEntries: getUnsyncedRewardLedgerEntriesRepo,
  updateRewardLedgerSyncStatus: updateRewardLedgerSyncStatusRepo,
  saveAnalyticsSnapshot: saveAnalyticsSnapshotRepo,
  getAnalyticsSnapshots: getAnalyticsSnapshotsRepo,
  getAnalyticsSnapshotByKey: getAnalyticsSnapshotByKeyRepo,
  deleteAnalyticsSnapshot: deleteAnalyticsSnapshotRepo,
  getUnsyncedAnalyticsSnapshots: getUnsyncedAnalyticsSnapshotsRepo,
  updateAnalyticsSnapshotSyncStatus: updateAnalyticsSnapshotSyncStatusRepo,
  saveSalesForecast: saveSalesForecastRepo,
  getSalesForecasts: getSalesForecastsRepo,
  getLatestSalesForecast: getLatestSalesForecastRepo,
  deleteSalesForecast: deleteSalesForecastRepo,
  getUnsyncedSalesForecasts: getUnsyncedSalesForecastsRepo,
  updateSalesForecastSyncStatus: updateSalesForecastSyncStatusRepo,
  computeBusinessHealthMetrics: computeBusinessHealthMetricsRepo,
  analyticsSubsystem: analyticsSubsystem,
  saveDisputeTicket: saveDisputeTicketRepo,
  getDisputeTickets: getDisputeTicketsRepo,
  getDisputeTicketById: getDisputeTicketByIdRepo,
  updateDisputeTicketStatus: updateDisputeTicketStatusRepo,
  deleteDisputeTicket: deleteDisputeTicketRepo,
  getUnsyncedDisputeTickets: getUnsyncedDisputeTicketsRepo,
  updateDisputeTicketSyncStatus: updateDisputeTicketSyncStatusRepo,
  performAutoSettlementReconciliation: performAutoSettlementReconciliationRepo,
  saveSettlementAction: saveSettlementActionRepo,
  getSettlementActions: getSettlementActionsRepo,
  getSettlementActionByTxn: getSettlementActionByTxnRepo,
  getUnsyncedSettlementActions: getUnsyncedSettlementActionsRepo,
  updateSettlementActionSyncStatus: updateSettlementActionSyncStatusRepo,
  updateReconciliationSyncStatus: updateReconciliationSyncStatusRepo,
  disputeSubsystem: disputeSubsystem,
  saveRechargeRecord: saveRechargeRecordRepo,
  getRechargeHistory: getRechargeHistoryRepo,
  getRechargeById: getRechargeByIdRepo,
  sanitizeForCloudBackup: sanitizeForCloudBackupRepo,
  sanitizeState: sanitizeStateRepo,
  default: defaultRepository,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = repoExport;
}
if (typeof exports !== 'undefined') {
  exports.StorageRepository = StorageRepository;
  exports.MemoryStorageAdapter = MemoryStorageAdapter;
  exports.storageRepository = defaultRepository;
  exports.createDefaultState = createDefaultState;
  exports.V6_KEY = V6_KEY;
  exports.V5_KEY = V5_KEY;
  exports.SAMPLE_CUSTOMER_MAPPINGS = SAMPLE_CUSTOMER_MAPPINGS;
  exports.migrateLegacySampleCustomerNames = migrateLegacySampleCustomerNames;
  exports.loadStore = loadStore;
  exports.VALID_COLLECTIONS = VALID_COLLECTIONS;
  exports.indexJournalsChronologically = indexJournalsChronologically;
  exports.queryJournalsByDateRange = queryJournalsByDateRange;
  exports.clearJournalIndexCache = clearJournalIndexCache;
  exports.normalizeAccountFields = normalizeAccountFields;
  exports.normalizeTagadaLogFields = normalizeTagadaLogFields;
  exports.resolveStatementDateRange = resolveStatementDateRange;
  exports.generateAccountStatement = generateAccountStatementRepo;
  exports.recordTagadaLog = recordTagadaLog;
  exports.getTagadaQuota = getTagadaQuota;
  exports.adjustTagadaQuota = adjustTagadaQuota;
  exports.listTagadaLogs = listTagadaLogs;
  exports.calculateSmsSegments = calculateSmsSegments;
  exports.getBulkTagadaEligibleCustomers = getBulkTagadaEligibleCustomersRepo;
  exports.prepareBulkTagadaBatch = prepareBulkTagadaBatchRepo;
  exports.dispatchBulkTagadaBatch = dispatchBulkTagadaBatchRepo;
  exports.generateStatementDocumentPayload = generateStatementDocumentPayloadRepo;
  exports.REPORT_TYPES = REPORT_TYPES;
  exports.escapeHtml = escapeHtml;
  exports.generatePrintableHtmlStatement = generatePrintableHtmlStatementRepo;
  exports.generateConsolidatedReportDocument = generateConsolidatedReportDocumentRepo;
  exports.generatePrintableHtmlReport = generatePrintableHtmlReportRepo;
  exports.generateCustomerListReportDocument = generateCustomerListReportDocumentRepo;
  exports.generateExpenseReportDocument = generateExpenseReportDocumentRepo;
  exports.generateStockMovementReportDocument = generateStockMovementReportDocumentRepo;
  exports.REPORT_PREFIXES = REPORT_PREFIXES;
  exports.toBengaliNumeral = toBengaliNumeral;
  exports.paginateStatementDocument = paginateStatementDocumentRepo;
  exports.paginateConsolidatedReportDocument = paginateConsolidatedReportDocumentRepo;
  exports.generatePdfShareIntentPayload = generatePdfShareIntentPayloadRepo;
  exports.simulateSyncBatch = simulateSyncBatchRepo;
  exports.exportCompressedBackup = exportCompressedBackupRepo;
  exports.importCompressedBackup = importCompressedBackupRepo;
  exports.isStoragePayloadCompressed = isStoragePayloadCompressed;
  exports.decompressStoragePayload = decompressStoragePayload;
  exports.extractRecordTimestamp = extractRecordTimestamp;
  exports.recordsDiffer = recordsDiffer;
  exports.TelemetryService = TelemetryService;
  exports.telemetryService = defaultTelemetryService;
  exports.EVENT_TYPES = EVENT_TYPES;
  exports.MAX_EVENT_QUEUE_SIZE = MAX_EVENT_QUEUE_SIZE;
  exports.getSecurityConfig = getSecurityConfigRepo;
  exports.verifyAppPin = verifyAppPinRepo;
  exports.setAppPinSecure = setAppPinSecureRepo;
  exports.changeAppPinSecure = changeAppPinSecureRepo;
  exports.disableAppPinSecure = disableAppPinSecureRepo;
  exports.recordAppActivity = recordAppActivityRepo;
  exports.recordAppBackgrounded = recordAppBackgroundedRepo;
  exports.recordAppForegrounded = recordAppForegroundedRepo;
  exports.unlockAppWithPin = unlockAppWithPinRepo;
  exports.unlockAppWithBiometrics = unlockAppWithBiometricsRepo;
  exports.getAppLockoutStatus = getAppLockoutStatusRepo;
  exports.securityService = securityService;
  exports.audioNoteService = audioNoteService;
  exports.attachAudioNote = attachAudioNoteRepo;
  exports.getAudioNotesForEntity = getAudioNotesForEntityRepo;
  exports.getAudioNotesForBusiness = getAudioNotesForBusinessRepo;
  exports.deleteAudioNote = deleteAudioNoteRepo;
  exports.deleteAudioNotesForEntity = deleteAudioNotesForEntityRepo;
  exports.deleteAccountCascade = deleteAccountCascadeRepo;
  exports.cleanOrphanedAudioFiles = cleanOrphanedAudioFilesRepo;
  exports.getAudioStorageMetrics = getAudioStorageMetricsRepo;
  exports.receiptImageService = receiptImageService;
  exports.attachReceiptImage = attachReceiptImageRepo;
  exports.getReceiptImagesForJournal = getReceiptImagesForJournalRepo;
  exports.getReceiptImagesForBusiness = getReceiptImagesForBusinessRepo;
  exports.deleteReceiptImage = deleteReceiptImageRepo;
  exports.deleteReceiptImagesForJournal = deleteReceiptImagesForJournalRepo;
  exports.cleanOrphanedReceiptImages = cleanOrphanedReceiptImagesRepo;
  exports.getReceiptStorageMetrics = getReceiptStorageMetricsRepo;
  exports.inferVoucherFields = inferVoucherFieldsRepo;
  exports.isHighConfidence = isHighConfidence || (receiptImageService ? receiptImageService.isHighConfidence : null);
  exports.isMediumConfidence = isMediumConfidence || (receiptImageService ? receiptImageService.isMediumConfidence : null);
  exports.formatInferredSummary = formatInferredSummary || (receiptImageService ? receiptImageService.formatInferredSummary : null);
  exports.CONFIDENCE_HIGH = CONFIDENCE_HIGH || 0.85;
  exports.CONFIDENCE_MEDIUM = CONFIDENCE_MEDIUM || 0.60;
  exports.voucherPdfService = voucherPdfService;
  exports.thermalPrintService = thermalPrintService;
  exports.logVoucherPrintExport = logVoucherPrintExportRepo;
  exports.getVoucherPrintLogs = getVoucherPrintLogsRepo;
  exports.getVoucherPrintLogsForBusiness = getVoucherPrintLogsForBusinessRepo;
  exports.deleteVoucherPrintLog = deleteVoucherPrintLogRepo;
  exports.banglaQrService = banglaQrService;
  exports.logBanglaQrTransaction = logBanglaQrTransactionRepo;
  exports.getBanglaQrTransactions = getBanglaQrTransactionsRepo;
  exports.getBanglaQrTransactionByTxnNumber = getBanglaQrTransactionByTxnNumberRepo;
  exports.tallyPayService = tallyPayService;
  exports.soundboxService = soundboxService;
  exports.logAddMoneyTransaction = logAddMoneyTransactionRepo;
  exports.getAddMoneyTransactions = getAddMoneyTransactionsRepo;
  exports.logSoundboxNotification = logSoundboxNotificationRepo;
  exports.getSoundboxNotifications = getSoundboxNotificationsRepo;
  exports.saveSoundboxDeviceSettings = saveSoundboxDeviceSettingsRepo;
  exports.getSoundboxDeviceSettings = getSoundboxDeviceSettingsRepo;
  exports.logSoundboxTelemetry = logSoundboxTelemetryRepo;
  exports.getSoundboxTelemetry = getSoundboxTelemetryRepo;
  exports.digitalAnalyticsService = digitalAnalyticsService;
  exports.getDigitalInflowTransactions = getDigitalInflowTransactionsRepo;
  exports.batchTagadaService = batchTagadaService;
  exports.logTagadaBatch = logTagadaBatch;
  exports.getTagadaLogsByAccount = getTagadaLogsByAccount;
  exports.getLastTagadaDateByAccount = getLastTagadaDateByAccount;
  exports.setTagadaQuota = setTagadaQuota;
  exports.recordTagadaQuotaPurchase = recordTagadaQuotaPurchase;
  exports.getDebtAgingReport = getDebtAgingReport;
  exports.billPaymentService = billPaymentService;
  exports.logBillPaymentTransaction = logBillPaymentTransactionRepo;
  exports.getBillPaymentTransactions = getBillPaymentTransactionsRepo;
  exports.getBillPaymentTransactionById = getBillPaymentTransactionByIdRepo;
  exports.saveBillerAccount = saveBillerAccountRepo;
  exports.getSavedBillers = getSavedBillersRepo;
  exports.deleteSavedBiller = deleteSavedBillerRepo;
  exports.getBillReceiptList = getBillReceiptListRepo;
  exports.logTallyPayTransaction = logTallyPayTransactionRepo;
  exports.getTallyPayTransactions = getTallyPayTransactionsRepo;
  exports.getTallyPayTransactionById = getTallyPayTransactionByIdRepo;
  exports.getTallyPayMonthlySummary = getTallyPayMonthlySummaryRepo;
  exports.saveTallyPayBeneficiary = saveTallyPayBeneficiaryRepo;
  exports.getTallyPayBeneficiaries = getTallyPayBeneficiariesRepo;
  exports.getTallyPayBeneficiaryById = getTallyPayBeneficiaryByIdRepo;
  exports.updateTallyPayBeneficiary = updateTallyPayBeneficiaryRepo;
  exports.deleteTallyPayBeneficiary = deleteTallyPayBeneficiaryRepo;
  exports.saveQrSettlementAction = saveQrSettlementActionRepo;
  exports.getQrSettlementActions = getQrSettlementActionsRepo;
  exports.getSettlementActionByTxnNumber = getSettlementActionByTxnNumberRepo;
  exports.markQrSettlementActionsSynced = markQrSettlementActionsSyncedRepo;
  exports.saveMerchantDisbursement = saveMerchantDisbursementRepo;
  exports.getMerchantDisbursements = getMerchantDisbursementsRepo;
  exports.getDisbursementById = getDisbursementByIdRepo;
  exports.saveReconciliation = saveReconciliationRepo;
  exports.getReconciliations = getReconciliationsRepo;
  exports.getUnsyncedReconciliations = getUnsyncedReconciliationsRepo;
  exports.markReconciliationsSynced = markReconciliationsSyncedRepo;
  exports.getAutoDisbursementConfig = getAutoDisbursementConfigRepo;
  exports.saveAutoDisbursementConfig = saveAutoDisbursementConfigRepo;
  exports.saveWalletSecurityCredentials = saveWalletSecurityCredentialsRepo;
  exports.getWalletSecurityCredentials = getWalletSecurityCredentialsRepo;
  exports.registerDeviceBinding = registerDeviceBindingRepo;
  exports.getDeviceBindings = getDeviceBindingsRepo;
  exports.getActiveDeviceBinding = getActiveDeviceBindingRepo;
  exports.revokeDeviceBinding = revokeDeviceBindingRepo;
  exports.saveLinkedBankAccount = saveLinkedBankAccountRepo;
  exports.getLinkedBankAccounts = getLinkedBankAccountsRepo;
  exports.getLinkedBankAccountById = getLinkedBankAccountByIdRepo;
  exports.deleteLinkedBankAccount = deleteLinkedBankAccountRepo;
  exports.setDefaultBankAccount = setDefaultBankAccountRepo;
  exports.verifyLinkedBankAccount = verifyLinkedBankAccountRepo;
  exports.saveLinkedMfsAccount = saveLinkedMfsAccountRepo;
  exports.getLinkedMfsAccounts = getLinkedMfsAccountsRepo;
  exports.getLinkedMfsAccountById = getLinkedMfsAccountByIdRepo;
  exports.deleteLinkedMfsAccount = deleteLinkedMfsAccountRepo;
  exports.saveCard = saveCardRepo;
  exports.getSavedCards = getSavedCardsRepo;
  exports.getSavedCardById = getSavedCardByIdRepo;
  exports.deleteCard = deleteCardRepo;
  exports.saveTransferRecord = saveTransferRecordRepo;
  exports.getTransferHistory = getTransferHistoryRepo;
  exports.getTransferById = getTransferByIdRepo;
  exports.saveTransactionSettlementAction = saveTransactionSettlementActionRepo;
  exports.getTransactionSettlementActions = getTransactionSettlementActionsRepo;
  exports.getTransactionSettlementActionByTxn = getTransactionSettlementActionByTxnRepo;
  exports.existsTransactionSettlementAction = existsTransactionSettlementActionRepo;
  exports.getUnsyncedTxnSettlementActions = getUnsyncedTxnSettlementActionsRepo;
  exports.updateTxnSettlementActionSyncStatusByIds = updateTxnSettlementActionSyncStatusByIdsRepo;
  exports.updateAllTxnSettlementActionUnsynced = updateAllTxnSettlementActionUnsyncedRepo;
  exports.saveSettlementHistoryRecord = saveSettlementHistoryRecordRepo;
  exports.getSettlementHistory = getSettlementHistoryRepo;
  exports.saveSoundboxConfig = saveSoundboxConfigRepo;
  exports.getSoundboxConfig = getSoundboxConfigRepo;
  exports.saveMerchantKyc = saveMerchantKycRepo;
  exports.getMerchantKycByBusinessId = getMerchantKycByBusinessIdRepo;
  exports.getMerchantKycList = getMerchantKycListRepo;
  exports.updateMerchantKycStatus = updateMerchantKycStatusRepo;
  exports.getUnsyncedMerchantKyc = getUnsyncedMerchantKycRepo;
  exports.updateMerchantKycSyncStatus = updateMerchantKycSyncStatusRepo;
  exports.existsMerchantKyc = existsMerchantKycRepo;
  exports.deleteMerchantKyc = deleteMerchantKycRepo;
  exports.saveMerchantQrOrder = saveMerchantQrOrderRepo;
  exports.getMerchantQrOrderById = getMerchantQrOrderByIdRepo;
  exports.getMerchantQrOrdersByBusinessId = getMerchantQrOrdersByBusinessIdRepo;
  exports.updateMerchantQrOrderStatus = updateMerchantQrOrderStatusRepo;
  exports.deleteMerchantQrOrder = deleteMerchantQrOrderRepo;
  exports.getUnsyncedMerchantQrOrders = getUnsyncedMerchantQrOrdersRepo;
  exports.updateMerchantQrOrderSyncStatus = updateMerchantQrOrderSyncStatusRepo;
  exports.existsMerchantQrOrder = existsMerchantQrOrderRepo;
  exports.saveMerchantLoan = saveMerchantLoanRepo;
  exports.getMerchantLoansByBusinessId = getMerchantLoansByBusinessIdRepo;
  exports.getMerchantLoans = getMerchantLoansRepo;
  exports.getMerchantLoanById = getMerchantLoanByIdRepo;
  exports.updateMerchantLoanStatus = updateMerchantLoanStatusRepo;
  exports.updateMerchantLoanRepayment = updateMerchantLoanRepaymentRepo;
  exports.saveMerchantLoanEmis = saveMerchantLoanEmisRepo;
  exports.getMerchantLoanEmis = getMerchantLoanEmisRepo;
  exports.recordMerchantLoanEmiPayment = recordMerchantLoanEmiPaymentRepo;
  exports.getUnsyncedMerchantLoans = getUnsyncedMerchantLoansRepo;
  exports.updateMerchantLoanSyncStatus = updateMerchantLoanSyncStatusRepo;
  exports.getUnsyncedMerchantLoanEmis = getUnsyncedMerchantLoanEmisRepo;
  exports.updateMerchantLoanEmiSyncStatus = updateMerchantLoanEmiSyncStatusRepo;
  exports.deleteMerchantLoan = deleteMerchantLoanRepo;
  exports.existsMerchantLoan = existsMerchantLoanRepo;
  exports.saveMerchantReward = saveMerchantRewardRepo;
  exports.getMerchantRewards = getMerchantRewardsRepo;
  exports.getMerchantRewardsByBusinessId = getMerchantRewardsRepo;
  exports.getMerchantRewardById = getMerchantRewardByIdRepo;
  exports.scratchReward = scratchRewardRepo;
  exports.claimReward = claimRewardRepo;
  exports.deleteMerchantReward = deleteMerchantRewardRepo;
  exports.existsMerchantReward = existsMerchantRewardRepo;
  exports.getUnsyncedMerchantRewards = getUnsyncedMerchantRewardsRepo;
  exports.updateMerchantRewardSyncStatus = updateMerchantRewardSyncStatusRepo;
  exports.saveRewardLedgerEntry = saveRewardLedgerEntryRepo;
  exports.getRewardLedger = getRewardLedgerRepo;
  exports.getMerchantRewardPointsBalance = getMerchantRewardPointsBalanceRepo;
  exports.redeemPointsToWallet = redeemPointsToWalletRepo;
  exports.getUnsyncedRewardLedgerEntries = getUnsyncedRewardLedgerEntriesRepo;
  exports.updateRewardLedgerSyncStatus = updateRewardLedgerSyncStatusRepo;
  exports.saveAnalyticsSnapshot = saveAnalyticsSnapshotRepo;
  exports.getAnalyticsSnapshots = getAnalyticsSnapshotsRepo;
  exports.getAnalyticsSnapshotByKey = getAnalyticsSnapshotByKeyRepo;
  exports.deleteAnalyticsSnapshot = deleteAnalyticsSnapshotRepo;
  exports.getUnsyncedAnalyticsSnapshots = getUnsyncedAnalyticsSnapshotsRepo;
  exports.updateAnalyticsSnapshotSyncStatus = updateAnalyticsSnapshotSyncStatusRepo;
  exports.saveSalesForecast = saveSalesForecastRepo;
  exports.getSalesForecasts = getSalesForecastsRepo;
  exports.getLatestSalesForecast = getLatestSalesForecastRepo;
  exports.deleteSalesForecast = deleteSalesForecastRepo;
  exports.getUnsyncedSalesForecasts = getUnsyncedSalesForecastsRepo;
  exports.updateSalesForecastSyncStatus = updateSalesForecastSyncStatusRepo;
  exports.computeBusinessHealthMetrics = computeBusinessHealthMetricsRepo;
  exports.analyticsSubsystem = analyticsSubsystem;
  exports.saveRechargeRecord = saveRechargeRecordRepo;
  exports.getRechargeHistory = getRechargeHistoryRepo;
  exports.getRechargeById = getRechargeByIdRepo;
  exports.sanitizeForCloudBackup = sanitizeForCloudBackupRepo;
  exports.sanitizeState = sanitizeStateRepo;
  exports.default = defaultRepository;
}
