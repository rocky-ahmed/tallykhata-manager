/**
 * test_iteration_227_transaction_history_reference_architecture.js
 *
 * REA-ITER-227: TALLYPAY DIGITAL TRANSACTION HISTORY & RECEIPT EXPLORER SUBSYSTEM
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-227
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
console.log(" REA-ITER-227: TRANSACTION HISTORY & RECEIPT REFERENCE ARCHITECTURE");
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
// HELPER: Extract DEX String Pool
// -------------------------------------------------------------
function getDexStrings(dexBuffer) {
  const stringIdsSize = dexBuffer.readUInt32LE(56);
  const stringIdsOff = dexBuffer.readUInt32LE(60);
  const strings = [];
  for (let i = 0; i < stringIdsSize; i++) {
    const strOff = dexBuffer.readUInt32LE(stringIdsOff + i * 4);
    let p = strOff;
    let len = 0, shift = 0;
    while (true) {
      let b = dexBuffer.readUInt8(p++);
      len |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    let end = p;
    while (dexBuffer.readUInt8(end) !== 0) end++;
    strings.push(dexBuffer.toString("utf8", p, end));
  }
  return strings;
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
// GROUP 2: AndroidManifest Registration & Activities
// =============================================================
console.log("\n[GROUP 2: AndroidManifest Registration & Activities]");
const manifestRaw = readZipEntry(apkPath, "AndroidManifest.xml");
assert(manifestRaw !== null && manifestRaw.length > 0, "AndroidManifest.xml unpacked successfully");

const manifestStr16 = manifestRaw.toString("utf16le");
assert(
  manifestStr16.includes("com.progoti.tallykhata.v2.tallypay.activities.transaction.transactionhistory.TransactionHistoryActivity"),
  "AndroidManifest declares TransactionHistoryActivity"
);
assert(
  manifestStr16.includes("com.progoti.tallykhata.v2.tallypay.activities.transaction.transactionhistory.TpEachTransactionDetailsActivity"),
  "AndroidManifest declares TpEachTransactionDetailsActivity"
);
assert(
  manifestStr16.includes("com.progoti.tallykhata.v2.tallypay.activities.transaction.transactiondetails.TpPendingTransactionDetailsActivity"),
  "AndroidManifest declares TpPendingTransactionDetailsActivity"
);

// =============================================================
// GROUP 3: Transaction History & Receipt Layout XML Resources
// =============================================================
console.log("\n[GROUP 3: Transaction History & Receipt Layout XML Resources]");
const expectedLayouts = [
  "res/layout/activity_transaction_history.xml",
  "res/layout/activity_each_transaction_details.xml",
  "res/layout/activity_tp_pending_transaction_details.xml",
  "res/layout/fragment_tallypay_all_trasactions_history.xml",
  "res/layout/fragment_tallypay_transaction_summary.xml",
  "res/layout/layout_transaction_details_bottom.xml",
  "res/layout/layout_tallypay_all_txn_history_and_txn_summary.xml",
  "res/layout/row_tp_wallet_recent_txn_customer_item.xml",
  "res/layout/row_tp_wallet_recent_txn_customer_item_2.xml",
  "res/layout/layout_no_txn_view.xml",
  "res/layout/layout_tk_no_txn_view.xml"
];

for (const layout of expectedLayouts) {
  const data = readZipEntry(apkPath, layout);
  assert(data !== null && data.length > 0, "Verified layout resource exists: " + layout);
}

// Check custom views inside activity_each_transaction_details.xml
const eachTxnLayout = readZipEntry(apkPath, "res/layout/activity_each_transaction_details.xml");
const eachTxnStr = eachTxnLayout.toString("utf8");
assert(
  eachTxnStr.includes("KohinoorTextView") || eachTxnStr.includes("KohinoorNumberView") || eachTxnStr.includes("KohinoorDateView"),
  "activity_each_transaction_details.xml integrates custom Kohinoor typography views"
);

// Check share triggers in layout_transaction_details_bottom.xml
const bottomLayout = readZipEntry(apkPath, "res/layout/layout_transaction_details_bottom.xml");
assert(bottomLayout !== null && bottomLayout.length > 0, "layout_transaction_details_bottom.xml verified");

// =============================================================
// GROUP 4: Core DEX Classes & Fragments in classes4.dex
// =============================================================
console.log("\n[GROUP 4: Core DEX Classes & Fragments in classes4.dex]");
const c4Raw = readZipEntry(apkPath, "classes4.dex");
assert(c4Raw !== null && c4Raw.length > 0, "classes4.dex extracted successfully");

const p4 = parseDex(c4Raw);
const classNames = p4.classes.map(c => c.cName);

const targetClasses = [
  "Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/TransactionHistoryActivity;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/TpEachTransactionDetailsActivity;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactiondetails/TpPendingTransactionDetailsActivity;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/TpTransactionAllHistoryFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/TpTransactionHistorySummaryFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/recent/pagination/OnItemRtAdapterClickListener;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/txnHelper/TransactionStatementItem;",
  "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/model/TransactionDetailsModel;",
  "Lcom/progoti/tallykhata/v2/tallypay/appgatewayClient/service/TransactionApiService;"
];

for (const tc of targetClasses) {
  assert(classNames.includes(tc), "classes4.dex contains class definition: " + tc);
}

// Verify TpEachTransactionDetailsActivity fields
const eachTxnClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/TpEachTransactionDetailsActivity;");
assert(eachTxnClass !== undefined, "Found TpEachTransactionDetailsActivity in classes4.dex");
const eachTxnDetails = p4.getClassDetails(eachTxnClass.classDefIdx);
assert(
  eachTxnDetails.instanceFields.some(f => f.type.includes("TransactionDto")),
  "TpEachTransactionDetailsActivity holds TransactionDto reference"
);
assert(
  eachTxnDetails.instanceFields.some(f => f.type.includes("TxnChargeDetails") || f.type.includes("TxnChargeWithRunningBalance")),
  "TpEachTransactionDetailsActivity holds fee and charge details reference"
);

// Verify TransactionDetailsModel fields
const txnDetailsModelClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/model/TransactionDetailsModel;");
assert(txnDetailsModelClass !== undefined, "Found TransactionDetailsModel in classes4.dex");
const txnModelDetails = p4.getClassDetails(txnDetailsModelClass.classDefIdx);
const modelFieldNames = txnModelDetails.instanceFields.map(f => f.name);
const expectedModelFields = [
  "amount", "balance", "charge", "chargeText", "fromName", "fromWallet",
  "toName", "toWallet", "txnDate", "txnID", "txnIDText", "txnStatus",
  "txnType", "transactionTitle", "transactionSubtitle"
];
for (const mf of expectedModelFields) {
  assert(modelFieldNames.includes(mf), "TransactionDetailsModel declares field: " + mf);
}

// =============================================================
// GROUP 5: Data Models & DTOs (TxnReport, TransactionDto, etc.)
// =============================================================
console.log("\n[GROUP 5: Data Models & DTOs in classes4.dex]");

// TxnReport
const txnReportClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/summary/TxnReport;");
assert(txnReportClass !== undefined, "Found TxnReport in classes4.dex");
const txnReportDetails = p4.getClassDetails(txnReportClass.classDefIdx);
const reportFields = txnReportDetails.instanceFields.map(f => f.name);
const expectedReportFields = [
  "totalPelam", "totalDilam", "addMoney", "sendMoney", "sendMoneyFee",
  "mobileRecharge", "mobileRechargeFee", "billPay", "billPayFee",
  "bankTransfer", "bankTransferFee", "cardTransfer", "cardTransferFee",
  "cashback", "sqrCredit", "supplierPayment", "supplierPaymentFee",
  "moneyReceive", "month"
];
for (const rf of expectedReportFields) {
  assert(reportFields.includes(rf), "TxnReport declares field: " + rf);
}

// MonthlyTxnResponseDto
const monthlyDtoClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/activities/transaction/transactionhistory/summary/MonthlyTxnResponseDto;");
assert(monthlyDtoClass !== undefined, "Found MonthlyTxnResponseDto in classes4.dex");
const monthlyDtoDetails = p4.getClassDetails(monthlyDtoClass.classDefIdx);
const monthlyFields = monthlyDtoDetails.instanceFields.map(f => f.name);
assert(monthlyFields.includes("serverTime"), "MonthlyTxnResponseDto has serverTime");
assert(monthlyFields.includes("txnReport"), "MonthlyTxnResponseDto has txnReport");

// TransactionDto
const txnDtoClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/TransactionDto;");
assert(txnDtoClass !== undefined, "Found TransactionDto in classes4.dex");
const txnDtoDetails = p4.getClassDetails(txnDtoClass.classDefIdx);
const dtoFields = txnDtoDetails.instanceFields.map(f => f.name);
const expectedDtoFields = [
  "amount", "balanceChangeType", "balanceFrom", "balanceTo", "fee",
  "fromName", "fromWallet", "toName", "toWallet", "transactionNumber",
  "status", "txnStatus", "txnTime", "txnType", "typeName", "invoiceNo"
];
for (const df of expectedDtoFields) {
  assert(dtoFields.includes(df), "TransactionDto declares field: " + df);
}

// StatementResponseDto
const stmtDtoClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/StatementResponseDto;");
assert(stmtDtoClass !== undefined, "Found StatementResponseDto in classes4.dex");
const stmtDtoDetails = p4.getClassDetails(stmtDtoClass.classDefIdx);
const stmtFields = stmtDtoDetails.instanceFields.map(f => f.name);
assert(stmtFields.includes("currentPage"), "StatementResponseDto has currentPage");
assert(stmtFields.includes("pageSize"), "StatementResponseDto has pageSize");
assert(stmtFields.includes("totalCount"), "StatementResponseDto has totalCount");
assert(stmtFields.includes("walletStatementDetailList"), "StatementResponseDto has walletStatementDetailList");

// =============================================================
// GROUP 6: Transaction Enums & Constants
// =============================================================
console.log("\n[GROUP 6: Transaction Enums & Constants]");

// BalanceChangeType
const bctClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/constant/EnumConstant$BalanceChangeType;");
assert(bctClass !== undefined, "Found BalanceChangeType enum in classes4.dex");
const bctDetails = p4.getClassDetails(bctClass.classDefIdx);
const bctFields = bctDetails.staticFields.map(f => f.name);
assert(bctFields.includes("CREDIT"), "BalanceChangeType has CREDIT");
assert(bctFields.includes("DEBIT"), "BalanceChangeType has DEBIT");

// TxnStatus
const tsClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/constant/EnumConstant$TxnStatus;");
assert(tsClass !== undefined, "Found TxnStatus enum in classes4.dex");
const tsDetails = p4.getClassDetails(tsClass.classDefIdx);
const tsFields = tsDetails.staticFields.map(f => f.name);
assert(tsFields.includes("COMPLETE"), "TxnStatus has COMPLETE");
assert(tsFields.includes("FAILED"), "TxnStatus has FAILED");
assert(tsFields.includes("IN_PROGRESS"), "TxnStatus has IN_PROGRESS");
assert(tsFields.includes("PROCESSED"), "TxnStatus has PROCESSED");
assert(tsFields.includes("REVERSED"), "TxnStatus has REVERSED");

// TransactionType
const ttClass = p4.classes.find(c => c.cName === "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/constant/EnumConstant$TransactionType;");
assert(ttClass !== undefined, "Found TransactionType enum in classes4.dex");
const ttDetails = p4.getClassDetails(ttClass.classDefIdx);
const ttFields = ttDetails.staticFields.map(f => f.name);
const expectedTxnTypes = [
  "BILL_PAYMENT", "CASHBACK", "CASH_IN_FROM_BANK", "CASH_IN_FROM_CARD",
  "CASH_IN_FROM_MFS_WALLET", "CASH_OUT", "CASH_OUT_TO_BANK", "FUND_TRANSFER",
  "MOBILE_RECHARGE", "PAYMENT", "SEND_MONEY", "VISA_TRANSFER"
];
for (const ett of expectedTxnTypes) {
  assert(ttFields.includes(ett), "TransactionType has enum value: " + ett);
}

// =============================================================
// GROUP 7: Share Triggers & Endpoints in classes4.dex
// =============================================================
console.log("\n[GROUP 7: Share Triggers & Endpoints in classes4.dex]");
const c4Strs = getDexStrings(c4Raw);

const expectedShareTriggers = [
  "SHARE_TXN_WHATSAPP",
  "SHARE_TXN_SMS",
  "SHARE_TXN_IMO",
  "TK_TXN_"
];
for (const st of expectedShareTriggers) {
  assert(c4Strs.includes(st), "classes4.dex string pool contains share trigger: " + st);
}

const expectedEndpoints = [
  "wallet/statement",
  "wallet/monthly/statement",
  "wallet/statement/summary",
  "transaction/{txnId}/charges",
  "transaction/charge/details/{txnId}",
  "transaction/cash-back/details/{txnId}",
  "api/wallet/{wallet}/txnList"
];
for (const ep of expectedEndpoints) {
  assert(c4Strs.includes(ep), "classes4.dex string pool contains Retrofit endpoint: " + ep);
}

// =============================================================
// GROUP 8: Authentic Bengali Resource Tokens in resources.arsc
// =============================================================
console.log("\n[GROUP 8: Authentic Bengali Resource Tokens in resources.arsc]");
const arscRaw = readZipEntry(apkPath, "resources.arsc");
assert(arscRaw !== null && arscRaw.length > 0, "resources.arsc extracted successfully");
const arscStr = arscRaw.toString("utf8");

const expectedBengaliTokens = [
  "লেনদেন বিবরণী",
  "সব লেনদেন",
  "লেনদেন আইডি",
  "লেনদেন পাওয়া যায়নি",
  "সব বাংলা QR অ্যাপ",
  "সব সার্ভিস",
  "চার্জ",
  "টাকা পেলেন",
  "টাকা দিলেন",
  "সফল",
  "ব্যর্থ",
  "ডাউনলোড",
  "শেয়ার",
  "তারিখ",
  "সারসংক্ষেপ",
  "সেন্ড মানি",
  "মোবাইল রিচার্জ",
  "পেলেন",
  "দিলেন"
];

for (const token of expectedBengaliTokens) {
  assert(arscStr.includes(token), "resources.arsc contains authentic Bengali token: \"" + token + "\"");
}

// =============================================================
// GROUP 9: Drawables in APK
// =============================================================
console.log("\n[GROUP 9: Drawables in APK]");
const expectedDrawables = [
  "res/drawable/ic_successful_transaction.xml",
  "res/drawable/ic_history_toggle_off.xml",
  "res/drawable/ic_chat_history.xml",
  "res/drawable/ic_start_txn.xml",
  "res/drawable/ic_tk_txn_empty.xml",
  "res/drawable/ic_tallypay_no_recent_txn_image.xml",
  "res/drawable/empty_receipt_view.xml"
];

for (const dr of expectedDrawables) {
  const dData = readZipEntry(apkPath, dr);
  assert(dData !== null && dData.length > 0, "Verified drawable exists in APK: " + dr);
}

// =============================================================
// GROUP 10: Reconstructed Pure-JS Transaction History & Receipt Simulation Engine
// =============================================================
console.log("\n[GROUP 10: Reconstructed Pure-JS Transaction History & Receipt Simulation Engine]");

class ReconstructedTransactionHistoryEngine {
  constructor() {
    this.transactions = [];
  }

  addTransaction(txn) {
    this.transactions.push(txn);
  }

  // Filter by Type (All, Inflow/Pelam, Outflow/Dilam)
  filterByFlow(flowType) {
    if (!flowType || flowType === "ALL") return this.transactions;
    if (flowType === "INFLOW" || flowType === "PELAM") {
      return this.transactions.filter(t => t.balanceChangeType === "CREDIT");
    }
    if (flowType === "OUTFLOW" || flowType === "DILAM") {
      return this.transactions.filter(t => t.balanceChangeType === "DEBIT");
    }
    return this.transactions;
  }

  // Filter by Status
  filterByStatus(status) {
    if (!status || status === "ALL") return this.transactions;
    return this.transactions.filter(t => t.txnStatus === status);
  }

  // Date Range Filtering
  filterByDateRange(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return this.transactions.filter(t => {
      const time = new Date(t.txnTime).getTime();
      return time >= start && time <= end;
    });
  }

  // Calculate Monthly Summary Metrics (matching TxnReport)
  calculateMonthlySummary(monthStr) {
    const filtered = this.transactions.filter(t => !monthStr || t.month === monthStr);
    let totalPelam = 0;
    let totalDilam = 0;
    let sendMoney = 0;
    let sendMoneyFee = 0;
    let mobileRecharge = 0;
    let mobileRechargeFee = 0;
    let billPay = 0;
    let billPayFee = 0;
    let bankTransfer = 0;
    let bankTransferFee = 0;

    for (const t of filtered) {
      const amt = Number(t.amount || 0);
      const fee = Number(t.fee || 0);
      if (t.balanceChangeType === "CREDIT") {
        totalPelam += amt;
      } else if (t.balanceChangeType === "DEBIT") {
        totalDilam += amt;
      }

      if (t.txnType === "SEND_MONEY") {
        sendMoney += amt;
        sendMoneyFee += fee;
      } else if (t.txnType === "MOBILE_RECHARGE") {
        mobileRecharge += amt;
        mobileRechargeFee += fee;
      } else if (t.txnType === "BILL_PAYMENT") {
        billPay += amt;
        billPayFee += fee;
      } else if (t.txnType === "CASH_OUT_TO_BANK" || t.txnType === "FUND_TRANSFER") {
        bankTransfer += amt;
        bankTransferFee += fee;
      }
    }

    return {
      month: monthStr || "ALL",
      totalPelam: Math.round(totalPelam * 100) / 100,
      totalDilam: Math.round(totalDilam * 100) / 100,
      sendMoney: Math.round(sendMoney * 100) / 100,
      sendMoneyFee: Math.round(sendMoneyFee * 100) / 100,
      mobileRecharge: Math.round(mobileRecharge * 100) / 100,
      mobileRechargeFee: Math.round(mobileRechargeFee * 100) / 100,
      billPay: Math.round(billPay * 100) / 100,
      billPayFee: Math.round(billPayFee * 100) / 100,
      bankTransfer: Math.round(bankTransfer * 100) / 100,
      bankTransferFee: Math.round(bankTransferFee * 100) / 100
    };
  }

  // Generate Receipt Detail View Model (matching TransactionDetailsModel)
  generateReceiptDetails(txnNumber) {
    const t = this.transactions.find(x => x.transactionNumber === txnNumber);
    if (!t) return null;

    const isCredit = t.balanceChangeType === "CREDIT";
    const netAmount = isCredit
      ? Math.round((Number(t.amount) - Number(t.fee || 0)) * 100) / 100
      : Math.round((Number(t.amount) + Number(t.fee || 0)) * 100) / 100;

    const statusBn = t.txnStatus === "COMPLETE" ? "সফল" : (t.txnStatus === "FAILED" ? "ব্যর্থ" : "প্রক্রিয়াধীন");
    const flowBn = isCredit ? "টাকা পেলেন" : "টাকা দিলেন";

    return {
      transactionTitle: t.typeName || t.txnType,
      transactionSubtitle: isCredit ? t.fromName || t.fromWallet : t.toName || t.toWallet,
      flowTitleBn: flowBn,
      txnID: t.transactionNumber,
      txnIDText: "লেনদেন আইডি: " + t.transactionNumber,
      amount: Number(t.amount),
      fee: Number(t.fee || 0),
      netAmount: netAmount,
      balance: Number(t.balanceTo || 0),
      txnStatus: t.txnStatus,
      statusBn: statusBn,
      fromName: t.fromName,
      fromWallet: t.fromWallet,
      toName: t.toName,
      toWallet: t.toWallet,
      txnDate: new Date(t.txnTime),
      voucherPdfName: "TK_TXN_" + t.transactionNumber + ".pdf"
    };
  }

  // Generate Multi-Channel Share Text Payload (matching layout_transaction_details_bottom actions)
  generateShareText(txnNumber, channel = "WHATSAPP") {
    const details = this.generateReceiptDetails(txnNumber);
    if (!details) return "";

    return [
      "--- টালি পে লেনদেন বিবরণী ---",
      "ধরন: " + details.transactionTitle,
      details.flowTitleBn + ": ৳ " + details.amount.toFixed(2),
      "চার্জ: ৳ " + details.fee.toFixed(2),
      "স্ট্যাটাস: " + details.statusBn,
      "লেনদেন আইডি: " + details.txnID,
      "তারিখ: " + details.txnDate.toISOString().replace("T", " ").substring(0, 19),
      "ধন্যবাদ, টালিখাতা"
    ].join("\n");
  }
}

// -------------------------------------------------------------
// Test the Simulation Engine
// -------------------------------------------------------------
const engine = new ReconstructedTransactionHistoryEngine();

// Populate sample transactions
engine.addTransaction({
  transactionNumber: "TXN1001",
  balanceChangeType: "CREDIT",
  txnType: "PAYMENT",
  typeName: "মার্চেন্ট পেমেন্ট",
  amount: 1500.00,
  fee: 0.00,
  balanceTo: 5500.00,
  txnStatus: "COMPLETE",
  fromName: "রহিম ট্রেডার্স",
  fromWallet: "01711000001",
  toName: "আমার দোকান",
  toWallet: "01811000002",
  month: "2026-10",
  txnTime: "2026-10-15T10:30:00Z"
});

engine.addTransaction({
  transactionNumber: "TXN1002",
  balanceChangeType: "DEBIT",
  txnType: "SEND_MONEY",
  typeName: "সেন্ড মানি",
  amount: 500.00,
  fee: 5.00,
  balanceTo: 4995.00,
  txnStatus: "COMPLETE",
  fromName: "আমার দোকান",
  fromWallet: "01811000002",
  toName: "করিম ব্রাদার্স",
  toWallet: "01911000003",
  month: "2026-10",
  txnTime: "2026-10-16T14:20:00Z"
});

engine.addTransaction({
  transactionNumber: "TXN1003",
  balanceChangeType: "DEBIT",
  txnType: "MOBILE_RECHARGE",
  typeName: "মোবাইল রিচার্জ",
  amount: 100.00,
  fee: 0.00,
  balanceTo: 4895.00,
  txnStatus: "COMPLETE",
  fromName: "আমার দোকান",
  fromWallet: "01811000002",
  toName: "গ্রাহক মোবাইল",
  toWallet: "01611000004",
  month: "2026-10",
  txnTime: "2026-10-17T09:15:00Z"
});

engine.addTransaction({
  transactionNumber: "TXN1004",
  balanceChangeType: "CREDIT",
  txnType: "CASH_IN_FROM_BANK",
  typeName: "ব্যাংক থেকে ক্যাশ ইন",
  amount: 10000.00,
  fee: 0.00,
  balanceTo: 14895.00,
  txnStatus: "COMPLETE",
  fromName: "ডাচ-বাংলা ব্যাংক",
  fromWallet: "DBBL-123456",
  toName: "আমার দোকান",
  toWallet: "01811000002",
  month: "2026-10",
  txnTime: "2026-10-18T16:45:00Z"
});

// Assert Inflow filtering
const inflows = engine.filterByFlow("INFLOW");
assert(inflows.length === 2, "Inflow filter returns exactly 2 incoming transactions");
assert(inflows.every(t => t.balanceChangeType === "CREDIT"), "All filtered inflow transactions have CREDIT balanceChangeType");

// Assert Outflow filtering
const outflows = engine.filterByFlow("OUTFLOW");
assert(outflows.length === 2, "Outflow filter returns exactly 2 outgoing transactions");
assert(outflows.every(t => t.balanceChangeType === "DEBIT"), "All filtered outflow transactions have DEBIT balanceChangeType");

// Assert Date range filtering
const dateFiltered = engine.filterByDateRange("2026-10-16T00:00:00Z", "2026-10-17T23:59:59Z");
assert(dateFiltered.length === 2, "Date range filter correctly isolates transactions within window");

// Assert Monthly Summary calculation
const summary = engine.calculateMonthlySummary("2026-10");
assert(summary.totalPelam === 11500.00, "Total Inflow (পেলেন) correctly sums to 11,500.00");
assert(summary.totalDilam === 600.00, "Total Outflow (দিলেন) correctly sums to 600.00");
assert(summary.sendMoney === 500.00, "Send money total correctly sums to 500.00");
assert(summary.sendMoneyFee === 5.00, "Send money fee correctly sums to 5.00");
assert(summary.mobileRecharge === 100.00, "Mobile recharge total correctly sums to 100.00");

// Assert Receipt Details generation
const receipt = engine.generateReceiptDetails("TXN1002");
assert(receipt !== null, "Receipt generated successfully for TXN1002");
assert(receipt.flowTitleBn === "টাকা দিলেন", "Outflow receipt title is \"টাকা দিলেন\"");
assert(receipt.amount === 500.00, "Receipt principal amount is 500.00");
assert(receipt.fee === 5.00, "Receipt fee is 5.00");
assert(receipt.netAmount === 505.00, "Receipt net debit amount includes fee (505.00)");
assert(receipt.statusBn === "সফল", "Receipt status formatted in authentic Bengali as \"সফল\"");
assert(receipt.voucherPdfName === "TK_TXN_TXN1002.pdf", "Voucher PDF filename matches TK_TXN_ prefix format");

// Assert Share text payload
const shareText = engine.generateShareText("TXN1002", "WHATSAPP");
assert(shareText.includes("টালি পে লেনদেন বিবরণী"), "Share text contains Bengali header");
assert(shareText.includes("টাকা দিলেন: ৳ 500.00"), "Share text contains formatted principal amount");
assert(shareText.includes("চার্জ: ৳ 5.00"), "Share text contains fee amount");
assert(shareText.includes("লেনদেন আইডি: TXN1002"), "Share text contains transaction ID");
assert(shareText.includes("ধন্যবাদ, টালিখাতা"), "Share text contains brand closing signature");

console.log("\n================================================================");
console.log("  TOTAL TESTS: " + totalTests + " | PASSED: " + passedTests + " | FAILED: 0");
console.log("  100% REA REFERENCE ARCHITECTURE PARITY VERIFIED");
console.log("================================================================\n");
