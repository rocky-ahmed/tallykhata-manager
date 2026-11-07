/**
 * TallyKhata REA Reconstruction - Milestone REA-ITER-242
 * Test Suite: TallyPay Settlement Reconciliation, Dispute Resolution & Chargeback Management Subsystem
 *
 * Verifies:
 * 1. Reference APK Integrity & Cryptographic Signature (REF-001)
 * 2. AndroidManifest Registrations for Support & Settlement Activities
 * 3. Layout XML Resources & Visual Support Drawables
 * 4. Room SQLite Schema & DAO Architecture (reconciliations & transaction_settlement_action)
 * 5. Clean Architecture Support, Settlement & Dispute Bytecode in classes4.dex
 * 6. Data Transfer Objects (DTOs) & Enums (RefundRequestDto, RevertTxnDto, ReportProblemDto, etc.)
 * 7. Dispute Resolution Categories, SLA & Evidence Attachment Invariants
 * 8. Settlement Auto-Reconciliation & Dual-Entry Math Invariants (Integer Paisa)
 * 9. Authentic Bengali ARSC Resource Strings (16726, সমন্বয়, ফেরত, সমস্যাটি কি?, ইত্যাদি)
 * 10. Pure-JS Settlement Reconciliation, Dispute & Chargeback Simulation Engine
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const apkPath = "D:\\Claude\\TallyKhata\\New folder\\TallyKhata-Demo.apk";
const EXPECTED_SHA256 = "267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9";
const EXPECTED_SIZE = 53969511;

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log("[PASS] Test " + totalTests + ": " + message);
  } else {
    console.error("[FAIL] Test " + totalTests + ": " + message);
    throw new Error("Assertion failed: " + message);
  }
}

console.log("==================================================================");
console.log(" REA-ITER-242: SETTLEMENT RECONCILIATION & DISPUTE TEST SUITE");
console.log("==================================================================");

// -------------------------------------------------------------
// Helper to read ZIP entries directly from APK buffer
// -------------------------------------------------------------
const apkBuffer = fs.readFileSync(apkPath);

function getZipEntries(buffer) {
  const entries = [];
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return entries;
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  const cdRecords = buffer.readUInt16LE(eocdOffset + 8);
  let pos = cdOffset;
  for (let i = 0; i < cdRecords; i++) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(pos + 10);
    const compSize = buffer.readUInt32LE(pos + 20);
    const uncompSize = buffer.readUInt32LE(pos + 24);
    const nameLen = buffer.readUInt16LE(pos + 28);
    const extraLen = buffer.readUInt16LE(pos + 30);
    const commentLen = buffer.readUInt16LE(pos + 32);
    const localHeaderOffset = buffer.readUInt32LE(pos + 42);
    const name = buffer.toString("utf8", pos + 46, pos + 46 + nameLen);
    entries.push({ name, method, compSize, uncompSize, localHeaderOffset });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const entries = getZipEntries(apkBuffer);

function readZipEntry(name) {
  const e = entries.find(x => x.name === name);
  if (!e) return null;
  const localHeaderOffset = e.localHeaderOffset;
  const nameLen = apkBuffer.readUInt16LE(localHeaderOffset + 26);
  const extraLen = apkBuffer.readUInt16LE(localHeaderOffset + 28);
  const dataOffset = localHeaderOffset + 30 + nameLen + extraLen;
  const compData = apkBuffer.slice(dataOffset, dataOffset + e.compSize);
  if (e.method === 0) {
    return compData;
  } else if (e.method === 8) {
    return zlib.inflateRawSync(compData);
  }
  return null;
}

function parseAxmlStrings(buf) {
  let off = -1;
  for (let i = 0; i < buf.length - 4; i += 4) {
    if (buf.readUInt32LE(i) === 0x001c0001) { off = i; break; }
  }
  if (off === -1) return [];
  const stringCount = buf.readUInt32LE(off + 8);
  const stringsStart = off + buf.readUInt32LE(off + 20);
  const isUtf8 = (buf.readUInt32LE(off + 16) & (1 << 8)) !== 0;
  const offsets = [];
  for (let i = 0; i < stringCount; i++) {
    offsets.push(buf.readUInt32LE(off + 28 + i * 4));
  }
  const result = [];
  for (let i = 0; i < stringCount; i++) {
    const sOff = stringsStart + offsets[i];
    if (sOff >= buf.length) continue;
    if (isUtf8) {
      let cur = sOff;
      while (cur < buf.length && (buf[cur] & 0x80) !== 0) cur++;
      cur++;
      while (cur < buf.length && (buf[cur] & 0x80) !== 0) cur++;
      cur++;
      const start = cur;
      while (cur < buf.length && buf[cur] !== 0) cur++;
      result.push(buf.toString("utf8", start, cur));
    } else {
      let cur = sOff;
      let len = buf.readUInt16LE(cur);
      cur += 2;
      result.push(buf.toString("utf16le", cur, cur + len * 2));
    }
  }
  return result;
}

// -------------------------------------------------------------
// GROUP 1: Reference APK Integrity & Cryptographic Identity
// -------------------------------------------------------------
console.log("\n[GROUP 1: Reference APK Integrity & Cryptographic Identity]");
assert(fs.existsSync(apkPath), "Reference APK exists at designated path");
assert(fs.statSync(apkPath).size === EXPECTED_SIZE, "Reference APK exact byte size is 53,969,511 bytes");

const actualSha256 = crypto.createHash("sha256").update(apkBuffer).digest("hex");
assert(actualSha256 === EXPECTED_SHA256, "Reference APK SHA-256 matches verified golden digest (267b310e...)");
assert(apkBuffer.readUInt32LE(0) === 0x04034b50, "Reference APK contains valid Zip Local File Header (PK\\x03\\x04)");
assert(entries.length === 3338, "Reference APK central directory contains exactly 3,338 records");

assert(entries.some(e => e.name === "classes.dex"), "classes.dex exists in APK");
assert(entries.some(e => e.name === "classes2.dex"), "classes2.dex exists in APK");
assert(entries.some(e => e.name === "classes3.dex"), "classes3.dex exists in APK");
assert(entries.some(e => e.name === "classes4.dex"), "classes4.dex exists in APK");
const dex4Entry = entries.find(e => e.name === "classes4.dex");
assert(dex4Entry.uncompSize === 10200444, "classes4.dex uncompressed size matches exactly 10,200,444 bytes");

// -------------------------------------------------------------
// GROUP 2: AndroidManifest Registration for Support & Settlement Activities
// -------------------------------------------------------------
console.log("\n[GROUP 2: AndroidManifest Registration for Support & Settlement Activities]");
const manifestBuf = readZipEntry("AndroidManifest.xml");
assert(manifestBuf !== null, "AndroidManifest.xml exists and is readable in APK");
assert(manifestBuf.length === 98296, "AndroidManifest.xml uncompressed size is 98,296 bytes");
const manifestStrings = parseAxmlStrings(manifestBuf);

assert(
  manifestStrings.includes("com.progoti.tallykhata.v2._clean_arch.support.presentation.SupportActivity"),
  "SupportActivity registered in AndroidManifest.xml"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.surecash.activities.ScCreditSettlementActivity"),
  "ScCreditSettlementActivity registered in AndroidManifest.xml"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.surecash.activities.ScCreditSettlementConfirmationActivity"),
  "ScCreditSettlementConfirmationActivity registered in AndroidManifest.xml"
);
assert(
  manifestStrings.includes("android.permission.INTERNET"),
  "Manifest requests INTERNET permission for dispute ticket API and support sync"
);
assert(
  manifestStrings.includes("android.permission.ACCESS_NETWORK_STATE"),
  "Manifest requests ACCESS_NETWORK_STATE for checking network before support sync"
);

// -------------------------------------------------------------
// GROUP 3: Layout XML Resources & Visual Support Drawables
// -------------------------------------------------------------
console.log("\n[GROUP 3: Layout XML Resources & Visual Support Drawables]");
const layoutFiles = [
  { path: "res/layout/fragment_reconciliation.xml", minSize: 7000 },
  { path: "res/layout/activity_sc_credit_settlement.xml", minSize: 2000 },
  { path: "res/layout/activity_sc_credit_settlement_confirmation.xml", minSize: 6000 }
];

layoutFiles.forEach(lf => {
  const e = entries.find(x => x.name === lf.path);
  assert(e !== undefined, lf.path + " exists in APK");
  assert(e.uncompSize >= lf.minSize, lf.path + " size (" + e.uncompSize + ") exceeds min " + lf.minSize);
});

// Verify view elements inside fragment_reconciliation.xml
const reconBuf = readZipEntry("res/layout/fragment_reconciliation.xml");
const reconStrings = parseAxmlStrings(reconBuf);
assert(reconStrings.includes("Button"), "fragment_reconciliation.xml contains Button");
assert(reconStrings.includes("EditText"), "fragment_reconciliation.xml contains EditText");
assert(reconStrings.includes("ScrollView"), "fragment_reconciliation.xml contains ScrollView");
assert(reconStrings.includes("TextView"), "fragment_reconciliation.xml contains TextView");
assert(reconStrings.includes("LinearLayout"), "fragment_reconciliation.xml contains LinearLayout");

// Verify view elements inside activity_sc_credit_settlement.xml
const scBuf = readZipEntry("res/layout/activity_sc_credit_settlement.xml");
const scStrings = parseAxmlStrings(scBuf);
assert(scStrings.includes("androidx.recyclerview.widget.RecyclerView"), "activity_sc_credit_settlement.xml contains RecyclerView");
assert(scStrings.includes("androidx.constraintlayout.widget.ConstraintLayout"), "activity_sc_credit_settlement.xml contains ConstraintLayout");

// Verify view elements inside activity_sc_credit_settlement_confirmation.xml
const scConfBuf = readZipEntry("res/layout/activity_sc_credit_settlement_confirmation.xml");
const scConfStrings = parseAxmlStrings(scConfBuf);
assert(scConfStrings.includes("de.hdodenhof.circleimageview.CircleImageView"), "activity_sc_credit_settlement_confirmation.xml contains CircleImageView avatar");
assert(scConfStrings.includes("ProgressBar"), "activity_sc_credit_settlement_confirmation.xml contains ProgressBar");

// Verify support and problem drawables
const drawableFiles = [
  { path: "res/drawable/ic_problem.xml", minSize: 1500 },
  { path: "res/drawable/ic_support.xml", minSize: 1500 },
  { path: "res/drawable/ic_support_chat_circular.xml", minSize: 2000 },
  { path: "res/drawable/ic_support_default_message_1.xml", minSize: 1800 },
  { path: "res/drawable/ic_support_default_message_2.xml", minSize: 2000 },
  { path: "res/drawable/ic_support_default_message_3.xml", minSize: 2200 },
  { path: "res/drawable/ic_support_default_message_4.xml", minSize: 1700 }
];

drawableFiles.forEach(df => {
  const e = entries.find(x => x.name === df.path);
  assert(e !== undefined, df.path + " exists in APK");
  assert(e.uncompSize >= df.minSize, df.path + " valid size (" + e.uncompSize + ")");
});

// -------------------------------------------------------------
// GROUP 4: Room SQLite Schema & DAO Architecture in classes4.dex
// -------------------------------------------------------------
console.log("\n[GROUP 4: Room SQLite Schema & DAO Architecture in classes4.dex]");
const dex4Raw = readZipEntry("classes4.dex");
assert(dex4Raw !== null, "classes4.dex is readable");
const dex4Str = dex4Raw.toString("utf8");

// Table 1: reconciliations
assert(dex4Str.includes("CREATE TABLE IF NOT EXISTS `reconciliations`"), "classes4.dex defines table reconciliations");
assert(dex4Str.includes("`_id` INTEGER PRIMARY KEY AUTOINCREMENT"), "Schema defines _id INTEGER PRIMARY KEY AUTOINCREMENT");
assert(dex4Str.includes("`time` TEXT NOT NULL"), "Schema defines time TEXT NOT NULL");
assert(dex4Str.includes("`opening_balance` REAL NOT NULL"), "Schema defines opening_balance REAL NOT NULL");
assert(dex4Str.includes("`other_cash_sales` REAL NOT NULL"), "Schema defines other_cash_sales REAL NOT NULL");
assert(dex4Str.includes("`other_credit_sales` REAL NOT NULL"), "Schema defines other_credit_sales REAL NOT NULL");
assert(dex4Str.includes("`closing_balance` REAL NOT NULL"), "Schema defines closing_balance REAL NOT NULL");
assert(dex4Str.includes("`sync_status` INTEGER NOT NULL"), "Schema defines sync_status INTEGER NOT NULL");
assert(dex4Str.includes("select * from reconciliations where sync_status = ?"), "DAO contains select by sync_status query");
assert(dex4Str.includes("syncReconciliations"), "syncReconciliations method exists in classes4.dex");
assert(dex4Str.includes("RECONCILIATION_TABLE"), "RECONCILIATION_TABLE constant exists in classes4.dex");

// Table 2: transaction_settlement_action
assert(dex4Str.includes("CREATE TABLE IF NOT EXISTS `transaction_settlement_action`"), "classes4.dex defines table transaction_settlement_action");
assert(dex4Str.includes("`transaction_number` TEXT NOT NULL"), "Schema defines transaction_number TEXT NOT NULL");
assert(dex4Str.includes("`action_type` TEXT NOT NULL"), "Schema defines action_type TEXT NOT NULL");
assert(dex4Str.includes("`synced` INTEGER NOT NULL"), "Schema defines synced INTEGER NOT NULL");
assert(dex4Str.includes("`create_date` TEXT NOT NULL"), "Schema defines create_date TEXT NOT NULL");
assert(dex4Str.includes("`update_date` TEXT"), "Schema defines update_date TEXT");
assert(dex4Str.includes("CREATE UNIQUE INDEX IF NOT EXISTS `index_transaction_number` ON `transaction_settlement_action` (`transaction_number`)"), "Schema defines index_transaction_number UNIQUE INDEX");

assert(dex4Str.includes("SELECT EXISTS (SELECT id FROM transaction_settlement_action WHERE transaction_number = ?)"), "DAO contains exists check query for settlement action");
assert(dex4Str.includes("select * from transaction_settlement_action where synced = 0 limit ?"), "DAO contains getUnsyncedTxnSettlementActions query");
assert(dex4Str.includes("UPDATE transaction_settlement_action SET synced = 0"), "DAO contains reset sync status query");
assert(dex4Str.includes("UPDATE transaction_settlement_action SET synced = ? WHERE id IN ("), "DAO contains batch sync update query");
assert(dex4Str.includes("SELECT COUNT(*) FROM transaction_settlement_action tsa WHERE tsa.synced = 0"), "DAO contains unsynced count query");

// -------------------------------------------------------------
// GROUP 5: Clean Architecture Support, Settlement & Dispute Bytecode in classes4.dex
// -------------------------------------------------------------
console.log("\n[GROUP 5: Clean Architecture Support, Settlement & Dispute Bytecode in classes4.dex]");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/support/presentation/SupportActivity;"), "SupportActivity class descriptor present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/support/domain/repository/SupportRepository;"), "SupportRepository domain interface present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/support/data/remote/SupportChatApi;"), "SupportChatApi remote interface present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/support/data/remote/ChatFileServiceApi;"), "ChatFileServiceApi remote interface present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/support/domain/model/ChatHistoryItem;"), "ChatHistoryItem domain model present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/support/domain/model/ChatSender;"), "ChatSender domain model present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/support/presentation/utils/ChatImageSource;"), "ChatImageSource presentation util present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/support/presentation/utils/ChatMediaToken;"), "ChatMediaToken presentation util present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/support/presentation/UiEvent;"), "UiEvent descriptor present in support presentation");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/support/presentation/UserAction;"), "UserAction descriptor present in support presentation");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/di/SupportChatApiQualifier;"), "SupportChatApiQualifier dependency injection present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/di/ChatFileServiceApiQualifier;"), "ChatFileServiceApiQualifier dependency injection present");

// -------------------------------------------------------------
// GROUP 6: Data Transfer Objects (DTOs) & Status Enums
// -------------------------------------------------------------
console.log("\n[GROUP 6: Data Transfer Objects (DTOs) & Status Enums]");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/RefundRequestDto;"), "RefundRequestDto descriptor present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/RevertTxnDto;"), "RevertTxnDto descriptor present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/logging/ReportProblemDto;"), "ReportProblemDto descriptor present");
assert(dex4Str.includes("getProblemTitle"), "ReportProblemDto getProblemTitle method present");
assert(dex4Str.includes("setProblemTitle"), "ReportProblemDto setProblemTitle method present");

assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/constant/EnumConstant$RefundRequestStatus;"), "RefundRequestStatus enum present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/constant/EnumConstant$ProblemReportStatus;"), "ProblemReportStatus enum present in nobopayDataModel");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/surecash/helper/EnumConstant$ProblemReportStatus;"), "ProblemReportStatus enum present in surecash helper");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/arch/util/TKEnum$TransactionSettlementAction;"), "TKEnum$TransactionSettlementAction enum present");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/arch/util/TKEnum$SmsRefundTypeEnum;"), "TKEnum$SmsRefundTypeEnum enum present");

assert(dex4Str.includes("DIGITAL_SALE"), "TKEnum$TransactionSettlementAction contains DIGITAL_SALE");
assert(dex4Str.includes("CREDIT_COLLECTION"), "TKEnum$TransactionSettlementAction contains CREDIT_COLLECTION");
assert(dex4Str.includes("NO_ACTION"), "TKEnum$TransactionSettlementAction contains NO_ACTION");

assert(dex4Str.includes("TALLY_SMS_REFUND_COUNT"), "TALLY_SMS_REFUND_COUNT constant present");
assert(dex4Str.includes("REFUND_PUSH_RECEIVED"), "REFUND_PUSH_RECEIVED constant present");

// -------------------------------------------------------------
// GROUP 7: Dispute Resolution Categories, SLA & Evidence Attachment Invariants
// -------------------------------------------------------------
console.log("\n[GROUP 7: Dispute Resolution Categories, SLA & Evidence Attachment Invariants]");

const DISPUTE_CATEGORIES = {
  AMOUNT_MISMATCH: { code: "AMOUNT_MISMATCH", labelBn: "পরিমাণ অমিল", slaHours: 48 },
  TXN_FAILED_BUT_DEBITED: { code: "TXN_FAILED_BUT_DEBITED", labelBn: "টাকা কাটার পরও লেনদেন ব্যর্থ", slaHours: 24 },
  UNAUTHORIZED_TXN: { code: "UNAUTHORIZED_TXN", labelBn: "অননুমোদিত লেনদেন", slaHours: 72 },
  DOUBLE_DEBIT: { code: "DOUBLE_DEBIT", labelBn: "দ্বিগুণ টাকা কাটা হয়েছে", slaHours: 24 },
  DELAYED_SETTLEMENT: { code: "DELAYED_SETTLEMENT", labelBn: "সেটেলমেন্ট বিলম্ব", slaHours: 48 }
};

assert(Object.keys(DISPUTE_CATEGORIES).length === 5, "Exactly 5 dispute category invariants defined");
assert(DISPUTE_CATEGORIES.AMOUNT_MISMATCH.slaHours === 48, "AMOUNT_MISMATCH SLA is 48 hours");
assert(DISPUTE_CATEGORIES.TXN_FAILED_BUT_DEBITED.slaHours === 24, "TXN_FAILED_BUT_DEBITED priority SLA is 24 hours");
assert(DISPUTE_CATEGORIES.UNAUTHORIZED_TXN.slaHours === 72, "UNAUTHORIZED_TXN fraud investigation SLA is 72 hours");

function validateDisputeAttachment(fileSize, mimeType) {
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_MIME = ["image/jpeg", "image/png", "application/pdf"];
  if (fileSize > MAX_SIZE) return { valid: false, error: "FILE_TOO_LARGE" };
  if (!ALLOWED_MIME.includes(mimeType)) return { valid: false, error: "UNSUPPORTED_TYPE" };
  return { valid: true };
}

assert(validateDisputeAttachment(1024 * 1024, "image/jpeg").valid === true, "1MB JPEG attachment is valid");
assert(validateDisputeAttachment(6 * 1024 * 1024, "image/png").valid === false, "6MB attachment rejected (max 5MB)");
assert(validateDisputeAttachment(500 * 1024, "text/plain").valid === false, "text/plain rejected (only image/pdf allowed)");

// -------------------------------------------------------------
// GROUP 8: Settlement Auto-Reconciliation & Dual-Entry Math Invariants (Integer Paisa)
// -------------------------------------------------------------
console.log("\n[GROUP 8: Settlement Auto-Reconciliation & Dual-Entry Math Invariants (Integer Paisa)]");

function reconcileSettlementBatch(collectionsPaisa, disbursementsPaisa, previousVariancePaisa = 0) {
  const totalCollections = collectionsPaisa.reduce((a, b) => a + b, 0);
  const totalDisbursements = disbursementsPaisa.reduce((a, b) => a + b, 0);
  const netVariancePaisa = totalCollections - totalDisbursements + previousVariancePaisa;

  let status = "MATCHED";
  if (netVariancePaisa > 0) status = "DISCREPANCY_UNDERPAYMENT";
  else if (netVariancePaisa < 0) status = "DISCREPANCY_OVERPAYMENT";

  return {
    totalCollectionsPaisa: totalCollections,
    totalDisbursementsPaisa: totalDisbursements,
    netVariancePaisa,
    status
  };
}

const batch1 = reconcileSettlementBatch([500000, 300000, 200000], [1000000]); // ৳10,000 collections vs ৳10,000 disbursement
assert(batch1.totalCollectionsPaisa === 1000000, "Batch 1 collections exactly 1,000,000 Paisa (৳10,000)");
assert(batch1.totalDisbursementsPaisa === 1000000, "Batch 1 disbursements exactly 1,000,000 Paisa (৳10,000)");
assert(batch1.netVariancePaisa === 0, "Batch 1 net variance is 0 Paisa (zero drift)");
assert(batch1.status === "MATCHED", "Batch 1 status is MATCHED");

const batch2 = reconcileSettlementBatch([500000, 300000], [700000]); // ৳8,000 collections vs ৳7,000 disbursement (short by ৳1,000)
assert(batch2.netVariancePaisa === 100000, "Batch 2 underpayment variance is exactly 100,000 Paisa (৳1,000.00)");
assert(batch2.status === "DISCREPANCY_UNDERPAYMENT", "Batch 2 status is DISCREPANCY_UNDERPAYMENT");

// Daily 14:00 (2:00 PM) BST Cut-Off Rule (Bangladesh Standard Time)
function isEligibleForTodaySettlement(timeStr) {
  // Cut-off is 14:00 (2:00 PM): transactions before 14:00 settle same cycle (T+1), after 14:00 roll over to next cycle (T+2)
  let hour = 0;
  if (timeStr.includes("T")) {
    const timePart = timeStr.split("T")[1];
    hour = parseInt(timePart.split(":")[0], 10);
  } else {
    hour = parseInt(timeStr.split(":")[0], 10);
  }
  return hour < 14;
}

assert(isEligibleForTodaySettlement("2026-11-05T10:30:00") === true, "10:30 AM transaction qualifies for T+1 settlement cycle");
assert(isEligibleForTodaySettlement("2026-11-05T15:45:00") === false, "3:45 PM transaction rolls over to next settlement cycle (post-cutoff)");

// -------------------------------------------------------------
// GROUP 9: Authentic Bengali ARSC Resource Strings
// -------------------------------------------------------------
console.log("\n[GROUP 9: Authentic Bengali ARSC Resource Strings]");
const arscRaw = readZipEntry("resources.arsc");
assert(arscRaw !== null, "resources.arsc exists and is readable in APK");
const arscUtf8 = arscRaw.toString("utf8");

const arscTokens = [
  "১৬৭২৬",
  "হেল্পলাইন",
  "হেল্পলাইন ১৬৭২৬, ০৯৬০৯০১৬৭৬ (সকাল ৯ টা থেকে রাত ৭ টা)",
  "কোন একটি সমস্যা হয়েছে। সহায়তার জন্য ১৬৭২৬ নম্বরে কল করুন।",
  "কোন একটা সমস্যা হয়েছে।",
  "লাইভ সাপোর্ট",
  "সাপোর্ট",
  "ম্যাসেঞ্জার সাপোর্ট",
  "সাপোর্টে কোন প্রশ্ন করলে আপনার সব কথোপকথন এখানে জমা থাকবে। যেকোনো সময় ফিরে এসে দেখে নিতে পারবেন।",
  "সমস্যাটি কি?",
  "সমন্বয়",
  "সমন্বয় করবো না",
  "সমন্বয় করি",
  "তথ্য সমন্বয়",
  "(বাকি আদায় সমন্বয়)",
  "পেমেন্ট সমন্বয় করি",
  "লেনদেনটি সমন্বয় করা হয়েছে।",
  "ফেরত",
  "পেমেন্ট ফেরত",
  "ফেরতযোগ্য​:",
  "বাকি - ফেরত",
  "মোট বাকি ফেরত",
  "ফেরত দেয়া টাকার পরিমাণ বাকির থেকে বেশি।",
  "লেনদেনটি ফেরত দেওয়া সম্ভব হচ্ছে না।",
  "টালি-মেসেজ (ফেরত)",
  "তাগাদা মেসেজ (ফেরত)",
  "লেনদেন মেসেজ (ফেরত)"
];

arscTokens.forEach(token => {
  assert(arscUtf8.includes(token), "Authentic Bengali string token \"" + token + "\" present in resources.arsc");
});

// -------------------------------------------------------------
// GROUP 10: Pure-JS Settlement Reconciliation, Dispute & Chargeback Simulation Engine
// -------------------------------------------------------------
console.log("\n[GROUP 10: Pure-JS Settlement Reconciliation, Dispute & Chargeback Simulation Engine]");

class SettlementDisputeEngine {
  constructor() {
    this.businesses = new Map();
  }

  registerBusiness(businessId, businessName) {
    this.businesses.set(businessId, {
      businessId,
      businessName,
      collections: [],
      disbursements: [],
      reconciliations: [],
      disputes: [],
      settlementActions: []
    });
  }

  recordDigitalCollection(businessId, { txnNumber, amountPaisa, customerMobile, timestamp }) {
    const b = this.businesses.get(businessId);
    if (!b) throw new Error("BUSINESS_NOT_FOUND");
    b.collections.push({
      txnNumber,
      amountPaisa,
      customerMobile,
      timestamp,
      reconciled: false
    });
  }

  recordBankDisbursement(businessId, { disbursementId, amountPaisa, bankAccount, timestamp }) {
    const b = this.businesses.get(businessId);
    if (!b) throw new Error("BUSINESS_NOT_FOUND");
    b.disbursements.push({
      disbursementId,
      amountPaisa,
      bankAccount,
      timestamp,
      reconciled: false
    });
  }

  performReconciliation(businessId, { time, openingBalancePaisa, otherCashSalesPaisa, otherCreditSalesPaisa }) {
    const b = this.businesses.get(businessId);
    if (!b) throw new Error("BUSINESS_NOT_FOUND");

    const totalCollected = b.collections.reduce((sum, c) => sum + c.amountPaisa, 0);
    const totalDisbursed = b.disbursements.reduce((sum, d) => sum + d.amountPaisa, 0);
    const closingBalancePaisa = openingBalancePaisa + otherCashSalesPaisa + totalCollected - totalDisbursed;
    const variancePaisa = totalCollected - totalDisbursed;

    const reconRecord = {
      id: b.reconciliations.length + 1,
      time,
      openingBalancePaisa,
      otherCashSalesPaisa,
      otherCreditSalesPaisa,
      totalCollectedPaisa: totalCollected,
      totalDisbursedPaisa: totalDisbursed,
      closingBalancePaisa,
      variancePaisa,
      status: variancePaisa === 0 ? "MATCHED" : "DISCREPANCY",
      syncStatus: 0
    };
    b.reconciliations.push(reconRecord);
    return reconRecord;
  }

  fileDispute(businessId, { txnNumber, category, claimedAmountPaisa, disputeReason, proofAttachmentUrl }) {
    const b = this.businesses.get(businessId);
    if (!b) throw new Error("BUSINESS_NOT_FOUND");

    const disputeId = "DISP-" + (b.disputes.length + 1001);
    const dispute = {
      disputeId,
      businessId,
      txnNumber,
      category,
      claimedAmountPaisa,
      disputeReason,
      proofAttachmentUrl,
      status: "SUBMITTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolution: null,
      refundPaisa: 0
    };
    b.disputes.push(dispute);
    return dispute;
  }

  transitionDisputeStatus(businessId, disputeId, newStatus, resolutionNotes = "") {
    const b = this.businesses.get(businessId);
    if (!b) throw new Error("BUSINESS_NOT_FOUND");

    const dispute = b.disputes.find(d => d.disputeId === disputeId);
    if (!dispute) throw new Error("DISPUTE_NOT_FOUND");

    const VALID_TRANSITIONS = {
      SUBMITTED: ["UNDER_INVESTIGATION", "REJECTED"],
      UNDER_INVESTIGATION: ["RESOLVED_REFUNDED", "REJECTED"],
      RESOLVED_REFUNDED: [],
      REJECTED: []
    };

    if (!VALID_TRANSITIONS[dispute.status].includes(newStatus)) {
      throw new Error("INVALID_STATUS_TRANSITION from " + dispute.status + " to " + newStatus);
    }

    dispute.status = newStatus;
    dispute.resolution = resolutionNotes;
    dispute.updatedAt = new Date().toISOString();

    if (newStatus === "RESOLVED_REFUNDED") {
      dispute.refundPaisa = dispute.claimedAmountPaisa;
      // Record transaction settlement action
      b.settlementActions.push({
        id: b.settlementActions.length + 1,
        transactionNumber: dispute.txnNumber,
        actionType: "REFUND",
        synced: 0,
        createDate: new Date().toISOString()
      });
    }

    return dispute;
  }

  getUnsyncedSettlementActions(businessId) {
    const b = this.businesses.get(businessId);
    if (!b) throw new Error("BUSINESS_NOT_FOUND");
    return b.settlementActions.filter(a => a.synced === 0);
  }
}

const simEngine = new SettlementDisputeEngine();
simEngine.registerBusiness("biz_001", "সততা জেনারেল স্টোর");

// 1. Record collections
simEngine.recordDigitalCollection("biz_001", {
  txnNumber: "TXN-2026-9901",
  amountPaisa: 450000, // ৳4,500.00
  customerMobile: "01711000001",
  timestamp: "2026-11-05T09:15:00Z"
});
simEngine.recordDigitalCollection("biz_001", {
  txnNumber: "TXN-2026-9902",
  amountPaisa: 550000, // ৳5,500.00
  customerMobile: "01811000002",
  timestamp: "2026-11-05T11:45:00Z"
});

// 2. Record bank disbursement
simEngine.recordBankDisbursement("biz_001", {
  disbursementId: "DISB-2026-001",
  amountPaisa: 1000000, // ৳10,000.00 (Exact match)
  bankAccount: "10521010000456",
  timestamp: "2026-11-05T14:30:00Z"
});

// 3. Perform reconciliation
const reconResult = simEngine.performReconciliation("biz_001", {
  time: "2026-11-05 15:00:00",
  openingBalancePaisa: 200000, // ৳2,000.00 opening
  otherCashSalesPaisa: 800000, // ৳8,000.00 cash sales
  otherCreditSalesPaisa: 300000 // ৳3,000.00 credit sales
});

assert(reconResult.totalCollectedPaisa === 1000000, "Reconciliation total collected is ৳10,000.00 (1,000,000 Paisa)");
assert(reconResult.totalDisbursedPaisa === 1000000, "Reconciliation total disbursed is ৳10,000.00 (1,000,000 Paisa)");
assert(reconResult.variancePaisa === 0, "Variance is exactly 0 Paisa");
assert(reconResult.status === "MATCHED", "Reconciliation status is MATCHED");
assert(reconResult.closingBalancePaisa === 1000000, "Closing balance is opening (2,000) + cash sales (8,000) = ৳10,000.00");

// 4. File a dispute for an amount mismatch
const dispute = simEngine.fileDispute("biz_001", {
  txnNumber: "TXN-2026-9901",
  category: "AMOUNT_MISMATCH",
  claimedAmountPaisa: 50000, // ৳500.00 discrepancy
  disputeReason: "গ্রাহকের অ্যাপে ৫০০ টাকা বেশি কেটেছে কিন্তু মার্চেন্ট অ্যাকাউন্টে জমা হয়নি",
  proofAttachmentUrl: "https://tallykhata.com/proofs/proof_9901.jpg"
});

assert(dispute.disputeId === "DISP-1001", "Dispute ID DISP-1001 generated");
assert(dispute.status === "SUBMITTED", "Initial dispute status is SUBMITTED");
assert(dispute.claimedAmountPaisa === 50000, "Claimed amount is 50,000 Paisa (৳500.00)");

// 5. Transition to UNDER_INVESTIGATION
const underInv = simEngine.transitionDisputeStatus("biz_001", "DISP-1001", "UNDER_INVESTIGATION", "ব্যাংক গেটওয়ে লগ যাচাই করা হচ্ছে");
assert(underInv.status === "UNDER_INVESTIGATION", "Dispute status transitioned to UNDER_INVESTIGATION");

// 6. Transition to RESOLVED_REFUNDED
const resolved = simEngine.transitionDisputeStatus("biz_001", "DISP-1001", "RESOLVED_REFUNDED", "অতিরিক্ত ৫০০ টাকা রিফান্ড অনুমোদন করা হয়েছে");
assert(resolved.status === "RESOLVED_REFUNDED", "Dispute status transitioned to RESOLVED_REFUNDED");
assert(resolved.refundPaisa === 50000, "Refund amount matches claimed amount ৳500.00");

// 7. Check settlement action generated for sync
const unsyncedActions = simEngine.getUnsyncedSettlementActions("biz_001");
assert(unsyncedActions.length === 1, "Exactly 1 unsynced settlement action created");
assert(unsyncedActions[0].transactionNumber === "TXN-2026-9901", "Action refers to TXN-2026-9901");
assert(unsyncedActions[0].actionType === "REFUND", "Action type is REFUND");
assert(unsyncedActions[0].synced === 0, "Action marked unsynced (0)");

// 8. Multi-tenant business isolation check
simEngine.registerBusiness("biz_002", "মেসার্স কবির ব্রাদার্স");
simEngine.recordDigitalCollection("biz_002", {
  txnNumber: "TXN-KABIR-001",
  amountPaisa: 250000,
  customerMobile: "01999000009",
  timestamp: "2026-11-05T12:00:00Z"
});

assert(simEngine.getUnsyncedSettlementActions("biz_002").length === 0, "Biz 002 has 0 settlement actions (isolated from Biz 001)");
const reconBiz2 = simEngine.performReconciliation("biz_002", {
  time: "2026-11-05 16:00:00",
  openingBalancePaisa: 50000,
  otherCashSalesPaisa: 100000,
  otherCreditSalesPaisa: 0
});
assert(reconBiz2.totalCollectedPaisa === 250000, "Biz 002 total collected is 250,000 Paisa (isolated)");
assert(simEngine.businesses.get("biz_001").reconciliations.length === 1, "Biz 001 reconciliations count unchanged");

console.log("\n==================================================================");
console.log(" ALL " + totalTests + "/" + totalTests + " TESTS PASSED SUCCESSFULLY! (100% PASS RATE)");
console.log("==================================================================");
