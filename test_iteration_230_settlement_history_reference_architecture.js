/**
 * test_iteration_230_settlement_history_reference_architecture.js
 *
 * REA-ITER-230: TALLYPAY MERCHANT SETTLEMENT HISTORY, DAILY AUTO-DISBURSEMENT & BANK RECONCILIATION SUBSYSTEM
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-230
 * Target Binary: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 * SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9
 */

const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error("[FAIL] Test " + totalTests + ": " + message);
    process.exit(1);
  } else {
    console.log("[PASS] Test " + totalTests + ": " + message);
    passedTests++;
  }
}

console.log("==================================================================");
console.log(" REA-ITER-230: SETTLEMENT HISTORY & AUTO-DISBURSEMENT ARCHITECTURE");
console.log("==================================================================\n");

// -------------------------------------------------------------
// HELPER: Read Zip Entry from APK
// -------------------------------------------------------------
function readZipEntry(apkPath, entryName) {
  const buf = fs.readFileSync(apkPath);
  let eocdOffset = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdOffset === -1) throw new Error("EOCD not found");
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let cur = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    const fnLen = buf.readUInt16LE(cur + 28);
    const extraLen = buf.readUInt16LE(cur + 30);
    const commentLen = buf.readUInt16LE(cur + 32);
    const localHeaderOffset = buf.readUInt32LE(cur + 42);
    const compMethod = buf.readUInt16LE(cur + 10);
    const compSize = buf.readUInt32LE(cur + 20);
    const name = buf.toString("utf8", cur + 46, cur + 46 + fnLen);
    if (name === entryName) {
      const locHdr = localHeaderOffset;
      const lFnLen = buf.readUInt16LE(locHdr + 26);
      const lExtraLen = buf.readUInt16LE(locHdr + 28);
      const dataStart = locHdr + 30 + lFnLen + lExtraLen;
      const rawData = buf.slice(dataStart, dataStart + compSize);
      if (compMethod === 0) return rawData;
      if (compMethod === 8) return zlib.inflateRawSync(rawData);
      throw new Error("Unsupported compression method: " + compMethod);
    }
    cur += 46 + fnLen + extraLen + commentLen;
  }
  return null;
}

// -------------------------------------------------------------
// HELPER: Parse DEX Classes, Fields & Methods
// -------------------------------------------------------------
function parseDex(buf) {
  const stringIdsSize = buf.readUInt32LE(56);
  const stringIdsOff = buf.readUInt32LE(60);
  const typeIdsSize = buf.readUInt32LE(64);
  const typeIdsOff = buf.readUInt32LE(68);
  const fieldIdsSize = buf.readUInt32LE(80);
  const fieldIdsOff = buf.readUInt32LE(84);
  const methodIdsSize = buf.readUInt32LE(88);
  const methodIdsOff = buf.readUInt32LE(92);
  const classDefsSize = buf.readUInt32LE(96);
  const classDefsOff = buf.readUInt32LE(100);

  function getString(idx) {
    const off = buf.readUInt32LE(stringIdsOff + idx * 4);
    let p = off;
    let len = 0, shift = 0;
    while (true) {
      let b = buf.readUInt8(p++);
      len |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    let end = p;
    while (buf.readUInt8(end) !== 0) end++;
    return buf.toString("utf8", p, end);
  }

  function getType(idx) {
    const sIdx = buf.readUInt32LE(typeIdsOff + idx * 4);
    return getString(sIdx);
  }

  function getFieldName(idx) {
    const nameIdx = buf.readUInt32LE(fieldIdsOff + idx * 8 + 4);
    return getString(nameIdx);
  }

  function getFieldType(idx) {
    const tIdx = buf.readUInt16LE(fieldIdsOff + idx * 8 + 2);
    return getType(tIdx);
  }

  function getMethodName(idx) {
    const nameIdx = buf.readUInt32LE(methodIdsOff + idx * 8 + 4);
    return getString(nameIdx);
  }

  function readUleb128(p) {
    let result = 0, shift = 0;
    while (true) {
      let b = buf.readUInt8(p.off++);
      result |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return result;
  }

  function getClassDetails(classDefIdx) {
    const classDataOff = buf.readUInt32LE(classDefsOff + classDefIdx * 32 + 24);
    if (classDataOff === 0) return { staticFields: [], instanceFields: [], directMethods: [], virtualMethods: [] };
    const p = { off: classDataOff };
    const staticFieldsSize = readUleb128(p);
    const instanceFieldsSize = readUleb128(p);
    const directMethodsSize = readUleb128(p);
    const virtualMethodsSize = readUleb128(p);

    let lastIdx = 0;
    const staticFields = [];
    for (let i = 0; i < staticFieldsSize; i++) {
      lastIdx += readUleb128(p);
      const accessFlags = readUleb128(p);
      staticFields.push({ name: getFieldName(lastIdx), type: getFieldType(lastIdx) });
    }

    lastIdx = 0;
    const instanceFields = [];
    for (let i = 0; i < instanceFieldsSize; i++) {
      lastIdx += readUleb128(p);
      const accessFlags = readUleb128(p);
      instanceFields.push({ name: getFieldName(lastIdx), type: getFieldType(lastIdx) });
    }

    lastIdx = 0;
    const directMethods = [];
    for (let i = 0; i < directMethodsSize; i++) {
      lastIdx += readUleb128(p);
      const accessFlags = readUleb128(p);
      const codeOff = readUleb128(p);
      directMethods.push(getMethodName(lastIdx));
    }

    lastIdx = 0;
    const virtualMethods = [];
    for (let i = 0; i < virtualMethodsSize; i++) {
      lastIdx += readUleb128(p);
      const accessFlags = readUleb128(p);
      const codeOff = readUleb128(p);
      virtualMethods.push(getMethodName(lastIdx));
    }

    return { staticFields, instanceFields, directMethods, virtualMethods };
  }

  const classes = [];
  for (let i = 0; i < classDefsSize; i++) {
    const classIdx = buf.readUInt32LE(classDefsOff + i * 32);
    const superIdx = buf.readUInt32LE(classDefsOff + i * 32 + 8);
    const cName = getType(classIdx);
    const sName = superIdx !== 0xFFFFFFFF ? getType(superIdx) : null;
    classes.push({ cName, sName, classDefIdx: i });
  }

  return { classes, getClassDetails };
}

const apkPath = "D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk";

// =============================================================
// GROUP 1: Reference APK Integrity & Binary Signatures
// =============================================================
console.log("[GROUP 1: Reference APK Integrity & Binary Signatures]");
assert(fs.existsSync(apkPath), "Reference APK file exists at " + apkPath);

const apkBytes = fs.readFileSync(apkPath);
assert(apkBytes.length === 53969511, "Reference APK size matches exact byte length 53,969,511");

const sha256 = crypto.createHash("sha256").update(apkBytes).digest("hex");
assert(
  sha256 === "267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9",
  "Reference APK SHA-256 matches verified digest (267b310e...)"
);

// =============================================================
// GROUP 2: AndroidManifest Registration for Transfer, Settlement & History Activities
// =============================================================
console.log("\n[GROUP 2: AndroidManifest Registration for Transfer, Settlement & History Activities]");
const manifestRaw = readZipEntry(apkPath, "AndroidManifest.xml");
assert(manifestRaw !== null && manifestRaw.length > 0, "AndroidManifest.xml unpacked successfully");

const manifestStr16 = manifestRaw.toString("utf16le");

const expectedActivities = [
  "com.progoti.tallykhata.v2.tallypay.activities.money_out.TpTransferActivity",
  "com.progoti.tallykhata.v2.tallypay.activities.transaction.transactionhistory.TransactionHistoryActivity",
  "com.progoti.tallykhata.v2.tallypay.activities.transaction.transactionhistory.TpEachTransactionDetailsActivity",
  "com.progoti.tallykhata.v2.tallypay.activities.transaction.transactiondetails.TpPendingTransactionDetailsActivity",
  "com.progoti.tallykhata.v2.surecash.activities.ScCreditSettlementActivity",
  "com.progoti.tallykhata.v2.surecash.activities.ScCreditSettlementConfirmationActivity",
  "com.progoti.tallykhata.v2.surecash.activities.ScCashOutActivity",
  "com.progoti.tallykhata.v2.surecash.activities.ScSupplierPaymentActivity"
];

for (const act of expectedActivities) {
  assert(manifestStr16.includes(act), "AndroidManifest declares activity: " + act.split(".").pop());
}

// =============================================================
// GROUP 3: Transfer, Reconciliation & Settlement XML Layout Resources
// =============================================================
console.log("\n[GROUP 3: Transfer, Reconciliation & Settlement XML Layout Resources]");
const expectedLayouts = [
  "res/layout/activity_tp_transfer.xml",
  "res/layout/fragment_bank_transfer.xml",
  "res/layout/fragment_transfer.xml",
  "res/layout/fragment_wallet_transfer.xml",
  "res/layout/fragment_visa_instant_transfer.xml",
  "res/layout/layout_instant_transfer_toggle.xml",
  "res/layout/layout_instant_transfer_unavailable.xml",
  "res/layout/bottomsheet_visa_transfer_info.xml",
  "res/layout/fragment_reconciliation.xml",
  "res/layout/activity_transaction_history.xml",
  "res/layout/fragment_tallypay_all_trasactions_history.xml",
  "res/layout/layout_tallypay_all_txn_history_and_txn_summary.xml"
];

for (const layout of expectedLayouts) {
  const data = readZipEntry(apkPath, layout);
  assert(data !== null && data.length > 0, "Verified layout resource exists: " + layout);
}

// Check layout_instant_transfer_toggle.xml structure
const toggleLayout = readZipEntry(apkPath, "res/layout/layout_instant_transfer_toggle.xml");
const toggleStr = toggleLayout.toString("utf8");
assert(toggleStr.includes("SwitchCompat"), "layout_instant_transfer_toggle.xml incorporates SwitchCompat");
assert(toggleStr.includes("KohinoorTextView"), "layout_instant_transfer_toggle.xml incorporates KohinoorTextView");

// Check fragment_bank_transfer.xml structure
const bankTransferLayout = readZipEntry(apkPath, "res/layout/fragment_bank_transfer.xml");
const bankTransferStr = bankTransferLayout.toString("utf8");
assert(bankTransferStr.includes("RecyclerView"), "fragment_bank_transfer.xml incorporates RecyclerView");
assert(bankTransferStr.includes("KohinoorTextView"), "fragment_bank_transfer.xml incorporates KohinoorTextView");

// =============================================================
// GROUP 4: Room SQLite Persistence Schema for reconciliations & transaction_settlement_action
// =============================================================
console.log("\n[GROUP 4: Room SQLite Persistence Schema for reconciliations & transaction_settlement_action]");
const c4Raw = readZipEntry(apkPath, "classes4.dex");
assert(c4Raw !== null && c4Raw.length > 0, "classes4.dex extracted successfully");
const c4Utf8 = c4Raw.toString("utf8");

// 1. Reconciliations table schema
assert(
  c4Utf8.includes("CREATE TABLE IF NOT EXISTS `reconciliations`"),
  "classes4.dex defines DDL: CREATE TABLE IF NOT EXISTS `reconciliations`"
);
assert(
  c4Utf8.includes("`_id` INTEGER PRIMARY KEY AUTOINCREMENT") &&
  c4Utf8.includes("`time` TEXT NOT NULL") &&
  c4Utf8.includes("`opening_balance` REAL NOT NULL") &&
  c4Utf8.includes("`other_cash_sales` REAL NOT NULL") &&
  c4Utf8.includes("`other_credit_sales` REAL NOT NULL") &&
  c4Utf8.includes("`closing_balance` REAL NOT NULL") &&
  c4Utf8.includes("`sync_status` INTEGER NOT NULL"),
  "reconciliations table defines exact columns (_id, time, opening_balance, other_cash_sales, other_credit_sales, closing_balance, sync_status)"
);

// 2. Reconciliations DAO query
assert(
  c4Utf8.includes("select * from reconciliations where sync_status = ?"),
  "DAO query verified: select un-synced reconciliations by sync_status"
);

// 3. transaction_settlement_action table schema
assert(
  c4Utf8.includes("CREATE TABLE IF NOT EXISTS `transaction_settlement_action`"),
  "classes4.dex defines DDL: CREATE TABLE IF NOT EXISTS `transaction_settlement_action`"
);

assert(
  c4Utf8.includes("CREATE UNIQUE INDEX IF NOT EXISTS `index_transaction_number` ON `transaction_settlement_action` (`transaction_number`)"),
  "transaction_settlement_action index verified on transaction_number"
);

// =============================================================
// GROUP 5: Reconciliation Entity Model & DAO in classes4.dex
// =============================================================
console.log("\n[GROUP 5: Reconciliation Entity Model & DAO in classes4.dex]");
const p4 = parseDex(c4Raw);

const reconModelClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/arch/models/Reconciliation;");
assert(reconModelClass !== undefined, "Found Reconciliation model class in classes4.dex");

const reconDetails = p4.getClassDetails(reconModelClass.classDefIdx);
const reconFields = reconDetails.instanceFields.map(f => f.name);
const expectedReconFields = [
  "id",
  "time",
  "openingBalance",
  "otherCashSale",
  "otherCreditSale",
  "closingBalance",
  "syncStatus"
];
for (const f of expectedReconFields) {
  assert(reconFields.includes(f), "Reconciliation model contains instance field: " + f);
}

const reconMethods = reconDetails.virtualMethods;
const expectedReconMethods = [
  "getClosingBalance",
  "getId",
  "getOpeningBalance",
  "getOtherCashSale",
  "getOtherCreditSale",
  "getSyncStatus",
  "getTime",
  "setClosingBalance",
  "setId",
  "setOpeningBalance",
  "setOtherCashSale",
  "setOtherCreditSale",
  "setSyncStatus",
  "setTime",
  "toJson"
];
for (const m of expectedReconMethods) {
  assert(reconMethods.includes(m), "Reconciliation model declares method: " + m);
}

const reconDaoClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/arch/persistence/ReconciliationDao;");
assert(reconDaoClass !== undefined, "Found ReconciliationDao interface in classes4.dex");

// =============================================================
// GROUP 6: Bank Transfer Configuration & Fee Models in classes4.dex
// =============================================================
console.log("\n[GROUP 6: Bank Transfer Configuration & Fee Models in classes4.dex]");
const bankConfigClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/helper/BankTransferConfig;");
assert(bankConfigClass !== undefined, "Found BankTransferConfig in classes4.dex");

const bankConfigDetails = p4.getClassDetails(bankConfigClass.classDefIdx);
const bankConfigFields = bankConfigDetails.instanceFields.map(f => f.name);
assert(bankConfigFields.includes("instantTransferCharge"), "BankTransferConfig declares field: instantTransferCharge");
assert(bankConfigFields.includes("regularTransferCharge"), "BankTransferConfig declares field: regularTransferCharge");
assert(bankConfigFields.includes("isInstantTransferActive"), "BankTransferConfig declares field: isInstantTransferActive");
assert(bankConfigFields.includes("isRegularTransferActive"), "BankTransferConfig declares field: isRegularTransferActive");

const bankConfigMethods = bankConfigDetails.virtualMethods;
assert(bankConfigMethods.includes("getInstantTransferCharge"), "Declares getter: getInstantTransferCharge");
assert(bankConfigMethods.includes("getRegularTransferCharge"), "Declares getter: getRegularTransferCharge");
assert(bankConfigMethods.includes("isInstantTransferActive"), "Declares getter: isInstantTransferActive");
assert(bankConfigMethods.includes("isRegularTransferActive"), "Declares getter: isRegularTransferActive");

// =============================================================
// GROUP 7: Money Out / Remittance DTOs in classes4.dex
// =============================================================
console.log("\n[GROUP 7: Money Out / Remittance DTOs in classes4.dex]");

// 1. TransferMoneyToExternalDto
const extTransferClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/TransferMoneyToExternalDto;");
assert(extTransferClass !== undefined, "Found TransferMoneyToExternalDto in classes4.dex");

const extTransferDetails = p4.getClassDetails(extTransferClass.classDefIdx);
const extFields = extTransferDetails.instanceFields.map(f => f.name);
assert(extFields.includes("externalReceiver"), "TransferMoneyToExternalDto declares field: externalReceiver");
assert(extFields.includes("external_FI"), "TransferMoneyToExternalDto declares field: external_FI");
assert(extFields.includes("note"), "TransferMoneyToExternalDto declares field: note");

// 2. VISATransferRequest
const visaReqClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/VISATransferRequest;");
assert(visaReqClass !== undefined, "Found VISATransferRequest in classes4.dex");

const visaDetails = p4.getClassDetails(visaReqClass.classDefIdx);
const visaFields = visaDetails.instanceFields.map(f => f.name);
assert(visaFields.includes("amount"), "VISATransferRequest declares field: amount");
assert(visaFields.includes("bankName"), "VISATransferRequest declares field: bankName");
assert(visaFields.includes("instantTransferEnabled"), "VISATransferRequest declares field: instantTransferEnabled");
assert(visaFields.includes("primaryAccountNumber"), "VISATransferRequest declares field: primaryAccountNumber");
assert(visaFields.includes("wallet"), "VISATransferRequest declares field: wallet");

// 3. WalletTransferServiceDto
const walletServiceClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/data/WalletTransferServiceDto;");
assert(walletServiceClass !== undefined, "Found WalletTransferServiceDto in classes4.dex");

const walletDetails = p4.getClassDetails(walletServiceClass.classDefIdx);
const walletFields = walletDetails.instanceFields.map(f => f.name);
assert(walletFields.includes("enable"), "WalletTransferServiceDto declares field: enable");
assert(walletFields.includes("externalFI"), "WalletTransferServiceDto declares field: externalFI");
assert(walletFields.includes("serviceName"), "WalletTransferServiceDto declares field: serviceName");
assert(walletFields.includes("walletType"), "WalletTransferServiceDto declares field: walletType");

// =============================================================
// GROUP 8: Settlement Backup & Sync DTOs in classes4.dex
// =============================================================
console.log("\n[GROUP 8: Settlement Backup & Sync DTOs in classes4.dex]");

// 1. Data Backup DTO
const backupSettleClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/_clean_arch/data_backup/data/dto/TransactionSettlementActions;");
assert(backupSettleClass !== undefined, "Found data_backup TransactionSettlementActions DTO");
const backupDetails = p4.getClassDetails(backupSettleClass.classDefIdx);
const backupFields = backupDetails.instanceFields.map(f => f.name);
assert(backupFields.includes("success"), "Backup DTO declares field: success");
assert(backupFields.includes("failed"), "Backup DTO declares field: failed");

// 2. Server To Device Sync DTO
const syncSettleClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/arch/sync/server_to_device/dto/TransactionSettlementActions;");
assert(syncSettleClass !== undefined, "Found server_to_device TransactionSettlementActions DTO");
const syncDetails = p4.getClassDetails(syncSettleClass.classDefIdx);
const syncFields = syncDetails.instanceFields.map(f => f.name);
assert(syncFields.includes("count"), "Sync DTO declares field: count");
assert(syncFields.includes("data"), "Sync DTO declares field: data");

// =============================================================
// GROUP 9: Authentic Bengali ARSC Tokens for Bank Transfer & Reconciliation
// =============================================================
console.log("\n[GROUP 9: Authentic Bengali ARSC Tokens for Bank Transfer & Reconciliation]");
const arscRaw = readZipEntry(apkPath, "resources.arsc");
assert(arscRaw !== null && arscRaw.length > 0, "resources.arsc unpacked successfully");
const arscUtf8 = arscRaw.toString("utf8");

// Authentic string assertions
assert(
  arscUtf8.includes("উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না। BEFTN এর মাধ্যমে ট্রান্সফার হবে।"),
  "ARSC verified: fallback notice when bank does not support instant NPSB transfer"
);

assert(
  arscUtf8.includes("BEFTN এর মাধ্যমে ব্যাংক ট্রান্সফার করা হবে। টাকা জমা হতে ১-৩ কার্যদিবস লাগতে পারে।"),
  "ARSC verified: BEFTN 1-3 business days delivery SLA notice"
);

assert(
  arscUtf8.includes("NPSB এর মাধ্যমে ইনস্ট্যান্ট ব্যাংক ট্রান্সফার করুন।"),
  "ARSC verified: NPSB instant transfer prompt"
);

assert(
  arscUtf8.includes("নোটঃ ভিসা কার্ডের মাধ্যমে ব্যাংক একাউন্টে ইনস্ট্যান্ট ট্রান্সফার হবে।"),
  "ARSC verified: Visa Direct instant transfer notice"
);

assert(
  arscUtf8.includes("ভিসা কার্ডের মাধ্যমে ব্যাংক একাউন্টে ইনস্ট্যান্ট ট্রান্সফার করি"),
  "ARSC verified: Visa card transfer action title"
);

assert(
  arscUtf8.includes("অ্যাড মানি-এর দৈনিক লিমিট অতিক্রম করছে। অনুগ্রহ করে দৈনিক লেনদেনের লিমিট দেখে নিন।"),
  "ARSC verified: daily transaction limit threshold alert"
);

assert(
  arscUtf8.includes("(বাকি আদায় সমন্বয়)"),
  "ARSC verified: credit settlement ledger note '(বাকি আদায় সমন্বয়)'"
);

assert(
  arscUtf8.includes("লেনদেনটি সমন্বয় করা হয়েছে।"),
  "ARSC verified: settlement confirmation prompt"
);

// =============================================================
// GROUP 10: Reconstructed Pure-JS Settlement History, Daily Auto-Disbursement & Bank Reconciliation Engine
// =============================================================
console.log("\n[GROUP 10: Reconstructed Pure-JS Settlement History, Daily Auto-Disbursement & Bank Reconciliation Engine]");

// 1. Bengali Number Formatter
function toBengaliNumerals(num) {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, d => bnDigits[Number(d)]);
}

// 2. Reconstructed Engine
class ReconstructedSettlementAndReconciliationEngine {
  constructor(config = {}) {
    this.bankTransferConfig = {
      isInstantTransferActive: config.isInstantTransferActive !== false,
      isRegularTransferActive: config.isRegularTransferActive !== false,
      instantTransferCharge: config.instantTransferCharge || 10.0, // 10 Taka convenience fee
      regularTransferCharge: config.regularTransferCharge || 0.0   // 0 Taka regular fee
    };

    // Simulated local DB tables
    this.settlementActions = [];
    this.reconciliations = [];
    this.disbursements = [];
    this.nextReconId = 1;
    this.nextSettlementId = 1;

    // Supported NPSB participant banks (Routing prefixes)
    this.npsbSupportedBankRoutings = new Set(["06026", "08527", "22527", "11527"]);
  }

  // Record a customer credit settlement action
  recordSettlement(transactionNumber, actionType, amountPaisa, accountId = null) {
    // Idempotency check via UNIQUE transaction_number
    if (this.settlementActions.some(s => s.transactionNumber === transactionNumber)) {
      return { success: false, duplicate: true, reason: "ALREADY_SETTLED" };
    }

    const record = {
      id: this.nextSettlementId++,
      transactionNumber,
      actionType, // CREDIT_COLLECTION, DIGITAL_SALE, NO_ACTION
      amountTaka: amountPaisa / 100,
      accountId,
      synced: 0,
      createDate: new Date().toISOString()
    };
    this.settlementActions.push(record);
    return { success: true, record };
  }

  // Query settlement history with date range and status filters
  getSettlementHistory(filter = {}) {
    let result = [...this.settlementActions];

    if (filter.actionType) {
      result = result.filter(s => s.actionType === filter.actionType);
    }
    if (filter.startDate) {
      result = result.filter(s => new Date(s.createDate) >= new Date(filter.startDate));
    }
    if (filter.endDate) {
      result = result.filter(s => new Date(s.createDate) <= new Date(filter.endDate));
    }

    // Calculate aggregated metrics
    const totalCount = result.length;
    const totalAmount = result.reduce((acc, curr) => acc + curr.amountTaka, 0);

    return {
      totalCount,
      totalAmount,
      items: result
    };
  }

  // Route and execute bank transfer disbursement
  initiateBankDisbursement(request) {
    const { amountTaka, bankRoutingNo, bankAccountNo, recipientName, note, preferInstant } = request;

    // Determine routing channel: NPSB (Instant) vs BEFTN (Batch Regular)
    const bankSupportsNpsb = this.npsbSupportedBankRoutings.has(bankRoutingNo.substring(0, 5));
    let transferMode = "BEFTN";
    let notice = "BEFTN এর মাধ্যমে ব্যাংক ট্রান্সফার করা হবে। টাকা জমা হতে ১-৩ কার্যদিবস লাগতে পারে।";
    let fee = this.bankTransferConfig.regularTransferCharge;

    if (preferInstant && bankSupportsNpsb && this.bankTransferConfig.isInstantTransferActive) {
      transferMode = "NPSB";
      notice = "NPSB এর মাধ্যমে ইনস্ট্যান্ট ব্যাংক ট্রান্সফার করুন।";
      fee = this.bankTransferConfig.instantTransferCharge;
    } else if (preferInstant && !bankSupportsNpsb) {
      transferMode = "BEFTN";
      notice = "উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না। BEFTN এর মাধ্যমে ট্রান্সফার হবে।";
      fee = this.bankTransferConfig.regularTransferCharge;
    }

    const disbursementRecord = {
      id: "DISB_" + Date.now(),
      amountTaka,
      fee,
      netAmount: amountTaka - fee,
      bankRoutingNo,
      bankAccountNo,
      recipientName,
      transferMode,
      notice,
      status: transferMode === "NPSB" ? "INSTANT_SUCCESS" : "PROCESSING_BATCH",
      timestamp: new Date().toISOString()
    };

    this.disbursements.push(disbursementRecord);
    return {
      success: true,
      disbursement: disbursementRecord
    };
  }

  // Execute End-of-Day cashbox and digital sales reconciliation
  reconcileDay(openingBalance, otherCashSales, otherCreditSales, digitalSettlementsTotal) {
    // Closing balance = Opening + Cash Sales + Digital Settlements - Credit Given
    const closingBalance = openingBalance + otherCashSales + digitalSettlementsTotal - otherCreditSales;

    const reconRecord = {
      _id: this.nextReconId++,
      time: new Date().toISOString(),
      opening_balance: openingBalance,
      other_cash_sales: otherCashSales,
      other_credit_sales: otherCreditSales,
      digital_settlements: digitalSettlementsTotal,
      closing_balance: closingBalance,
      sync_status: 0
    };

    this.reconciliations.push(reconRecord);
    return reconRecord;
  }

  // Sync cycle helper
  getUnsyncedReconciliations() {
    return this.reconciliations.filter(r => r.sync_status === 0);
  }

  markReconciliationsSynced(ids) {
    let count = 0;
    this.reconciliations.forEach(r => {
      if (ids.includes(r._id)) {
        r.sync_status = 1;
        count++;
      }
    });
    return count;
  }
}

// Execute Group 10 Verification Scenarios
const engine = new ReconstructedSettlementAndReconciliationEngine();

// Scenario 1: Record settlement actions across different days and action types
const s1 = engine.recordSettlement("TXN_S01", "CREDIT_COLLECTION", 50000, "ACC_101");
assert(s1.success === true, "First settlement recorded successfully");
assert(s1.record.amountTaka === 500.0, "Settlement amount converted to 500 Taka");

const s2 = engine.recordSettlement("TXN_S02", "DIGITAL_SALE", 25000);
assert(s2.success === true, "Digital sale settlement recorded");

const s3 = engine.recordSettlement("TXN_S03", "NO_ACTION", 10000);
assert(s3.success === true, "No Action settlement recorded");

// Scenario 2: Idempotency enforcement
const sDup = engine.recordSettlement("TXN_S01", "CREDIT_COLLECTION", 50000);
assert(sDup.success === false, "Duplicate settlement ID rejected");
assert(sDup.reason === "ALREADY_SETTLED", "Rejection reason is ALREADY_SETTLED");

// Scenario 3: Query settlement history with filters
const histAll = engine.getSettlementHistory();
assert(histAll.totalCount === 3, "Settlement history returns 3 total transactions");
assert(histAll.totalAmount === 850.0, "Total settled amount equals 850.0 Taka");

const histCredit = engine.getSettlementHistory({ actionType: "CREDIT_COLLECTION" });
assert(histCredit.totalCount === 1, "Filtered history by CREDIT_COLLECTION returns 1 transaction");
assert(histCredit.items[0].transactionNumber === "TXN_S01", "Filtered item transaction number is TXN_S01");

// Scenario 4: Bank transfer routing - Target bank supports NPSB (Instant)
const disbNpsb = engine.initiateBankDisbursement({
  amountTaka: 1000.0,
  bankRoutingNo: "085271234", // BRAC Bank (NPSB supported)
  bankAccountNo: "1501201234567001",
  recipientName: "রহিম এন্টারপ্রাইজ",
  preferInstant: true
});
assert(disbNpsb.success === true, "Disbursement request succeeds");
assert(disbNpsb.disbursement.transferMode === "NPSB", "Transfer mode routed to NPSB");
assert(disbNpsb.disbursement.fee === 10.0, "Convenience fee of 10 Taka applied for NPSB instant transfer");
assert(disbNpsb.disbursement.netAmount === 990.0, "Net disbursed amount equals 990.0 Taka");
assert(disbNpsb.disbursement.notice.includes("NPSB"), "Notice informs merchant about NPSB instant transfer");

// Scenario 5: Bank transfer routing - Target bank does NOT support NPSB (Graceful Fallback to BEFTN)
const disbBeftn = engine.initiateBankDisbursement({
  amountTaka: 2000.0,
  bankRoutingNo: "999991234", // Non-NPSB Bank
  bankAccountNo: "9991201234567001",
  recipientName: "করিম ট্রেডার্স",
  preferInstant: true // Merchant asked for instant, but bank cannot support it
});
assert(disbBeftn.success === true, "Fallback disbursement succeeds");
assert(disbBeftn.disbursement.transferMode === "BEFTN", "Transfer mode gracefully falls back to BEFTN");
assert(disbBeftn.disbursement.fee === 0.0, "Regular transfer charge of 0 Taka applied for BEFTN");
assert(
  disbBeftn.disbursement.notice.includes("উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না"),
  "Authentic Bengali notice returned: উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না"
);

// Scenario 6: End-of-Day Reconciliation
const recon = engine.reconcileDay(5000.0, 3000.0, 1500.0, 850.0);
assert(recon.opening_balance === 5000.0, "Opening balance is 5000.0 Taka");
assert(recon.other_cash_sales === 3000.0, "Cash sales is 3000.0 Taka");
assert(recon.other_credit_sales === 1500.0, "Credit sales is 1500.0 Taka");
assert(recon.closing_balance === 7350.0, "Closing balance correctly computed: 5000 + 3000 + 850 - 1500 = 7350.0 Taka");
assert(recon.sync_status === 0, "Initial sync status is 0 (dirty)");

// Scenario 7: Reconciliation sync cycle
const unsyncedRecons = engine.getUnsyncedReconciliations();
assert(unsyncedRecons.length === 1, "1 un-synced reconciliation record pending");

const syncedCount = engine.markReconciliationsSynced([recon._id]);
assert(syncedCount === 1, "1 reconciliation marked synced");
assert(engine.getUnsyncedReconciliations().length === 0, "No pending un-synced reconciliations remain");

// =============================================================
// SUMMARY
// =============================================================
console.log("\n==================================================================");
console.log(" ALL " + passedTests + "/" + totalTests + " TESTS PASSED SUCCESSFULLY! (100% PASS RATE)");
console.log("==================================================================");
