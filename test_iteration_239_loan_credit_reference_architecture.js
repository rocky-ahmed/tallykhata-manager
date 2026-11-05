/**
 * test_iteration_239_loan_credit_reference_architecture.js
 *
 * REA-ITER-239: TALLYPAY MERCHANT DIGITAL MICRO-LOAN, CREDIT SCORING & EMI REPAYMENT SUBSYSTEM
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-239
 * Target Binary: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 * SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9
 * Size: 53,969,511 bytes
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
console.log(" REA-ITER-239: MERCHANT DIGITAL LOAN & CREDIT TEST SUITE");
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

const apkPath = "D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk";

// -------------------------------------------------------------
// GROUP 1: Reference APK Integrity & Cryptographic Identity
// -------------------------------------------------------------
console.log("[GROUP 1: Reference APK Integrity & Cryptographic Identity]");

assert(fs.existsSync(apkPath), "Reference APK exists at designated path");
const apkBuf = fs.readFileSync(apkPath);
assert(apkBuf.length === 53969511, "Reference APK exact byte size is 53,969,511 bytes");

const sha256 = crypto.createHash("sha256").update(apkBuf).digest("hex");
assert(
  sha256 === "267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9",
  "Reference APK SHA-256 matches verified golden digest (267b310e...)"
);

let eocd = apkBuf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
assert(eocd !== -1, "Reference APK contains valid Zip EOCD signature (PK\x05\x06)");
const totalEntries = apkBuf.readUInt16LE(eocd + 10);
assert(totalEntries === 3338, "Reference APK central directory contains exactly 3,338 records");

assert(readZipEntry(apkPath, "classes.dex") !== null, "classes.dex exists in APK");
assert(readZipEntry(apkPath, "classes2.dex") !== null, "classes2.dex exists in APK");
assert(readZipEntry(apkPath, "classes3.dex") !== null, "classes3.dex exists in APK");
const dex4Raw = readZipEntry(apkPath, "classes4.dex");
assert(dex4Raw !== null, "classes4.dex exists in APK");
assert(dex4Raw.length === 10200444, "classes4.dex uncompressed size matches exactly 10,200,444 bytes");

// -------------------------------------------------------------
// GROUP 2: AndroidManifest Registration & Permissions
// -------------------------------------------------------------
console.log("\n[GROUP 2: AndroidManifest Registration & Permissions]");

const manifestRaw = readZipEntry(apkPath, "AndroidManifest.xml");
assert(manifestRaw !== null, "AndroidManifest.xml exists and is readable");
assert(manifestRaw.length === 98296, "AndroidManifest.xml uncompressed size is 98,296 bytes");

const mtbActivityU16 = Buffer.from("com.progoti.tallykhata.v2._clean_arch.mtb_loan.presentation.MtbLoanActivity", "utf16le");
assert(manifestRaw.indexOf(mtbActivityU16) !== -1, "MtbLoanActivity is registered in AndroidManifest.xml (UTF-16LE)");

const permCameraU16 = Buffer.from("android.permission.CAMERA", "utf16le");
assert(manifestRaw.indexOf(permCameraU16) !== -1, "android.permission.CAMERA is declared in AndroidManifest.xml for KYC face selfie");

const permNetU16 = Buffer.from("android.permission.INTERNET", "utf16le");
assert(manifestRaw.indexOf(permNetU16) !== -1, "android.permission.INTERNET is declared in AndroidManifest.xml");

const permNetStateU16 = Buffer.from("android.permission.ACCESS_NETWORK_STATE", "utf16le");
assert(manifestRaw.indexOf(permNetStateU16) !== -1, "android.permission.ACCESS_NETWORK_STATE is declared in AndroidManifest.xml");

const permStorageU16 = Buffer.from("android.permission.WRITE_EXTERNAL_STORAGE", "utf16le");
assert(manifestRaw.indexOf(permStorageU16) !== -1, "android.permission.WRITE_EXTERNAL_STORAGE is declared in AndroidManifest.xml");

// -------------------------------------------------------------
// GROUP 3: Visual Layouts & XML Drawables
// -------------------------------------------------------------
console.log("\n[GROUP 3: Visual Layouts & XML Drawables]");

const layoutRepay = readZipEntry(apkPath, "res/layout/layout_loan_repayment_view.xml");
assert(layoutRepay !== null, "res/layout/layout_loan_repayment_view.xml exists in APK");
assert(layoutRepay.length === 3812, "layout_loan_repayment_view.xml size is 3,812 bytes");
assert(layoutRepay.toString("utf8").includes("layout/layout_loan_repayment_view_0"), "layout_loan_repayment_view.xml uses Android DataBinding layout tag");

const layoutTotal = readZipEntry(apkPath, "res/layout/layout_tp_wallet_amount_loan_charge_total_view.xml");
assert(layoutTotal !== null, "res/layout/layout_tp_wallet_amount_loan_charge_total_view.xml exists in APK");
assert(layoutTotal.length === 4924, "layout_tp_wallet_amount_loan_charge_total_view.xml size is 4,924 bytes");
assert(layoutTotal.toString("utf8").includes("layout/layout_tp_wallet_amount_loan_charge_total_view_0"), "layout_tp_wallet_amount_loan_charge_total_view.xml uses Android DataBinding layout tag");

const rowLoan = readZipEntry(apkPath, "res/layout/row_loan_account.xml");
assert(rowLoan !== null, "res/layout/row_loan_account.xml exists in APK");
assert(rowLoan.length === 2940, "row_loan_account.xml size is 2,940 bytes");
assert(rowLoan.toString("utf8").includes("layout/row_loan_account_0"), "row_loan_account.xml uses Android DataBinding layout tag");

const icLoan = readZipEntry(apkPath, "res/drawable/ic_loan.xml");
assert(icLoan !== null && icLoan.length === 7812, "ic_loan.xml vector drawable exists (7,812 bytes)");

const icLoanV2 = readZipEntry(apkPath, "res/drawable/ic_loan_v2.xml");
assert(icLoanV2 !== null && icLoanV2.length === 6004, "ic_loan_v2.xml vector drawable exists (6,004 bytes)");

const icLoanV3 = readZipEntry(apkPath, "res/drawable/ic_loan_v3.xml");
assert(icLoanV3 !== null && icLoanV3.length === 2996, "ic_loan_v3.xml vector drawable exists (2,996 bytes)");

const icMtb = readZipEntry(apkPath, "res/drawable/ic_mtb.xml");
assert(icMtb !== null && icMtb.length === 2068, "ic_mtb.xml vector drawable exists (2,068 bytes)");

const icMtbLogoFull = readZipEntry(apkPath, "res/drawable/ic_mtb_logo_full.xml");
assert(icMtbLogoFull !== null && icMtbLogoFull.length === 41948, "ic_mtb_logo_full.xml vector drawable exists (41,948 bytes)");

const logoMtbWebp = readZipEntry(apkPath, "res/drawable/logo_demo_mtb_bank.webp");
assert(logoMtbWebp !== null && logoMtbWebp.length === 1826, "logo_demo_mtb_bank.webp bitmap asset exists (1,826 bytes)");

// -------------------------------------------------------------
// GROUP 4: Bytecode Classes & Clean Architecture (classes4.dex)
// -------------------------------------------------------------
console.log("\n[GROUP 4: Bytecode Classes & Clean Architecture (classes4.dex)]");

const dex4Str = dex4Raw.toString("latin1");

assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/mtb_loan/presentation/MtbLoanActivity;"), "MtbLoanActivity class descriptor present in classes4.dex");
assert(dex4Str.includes("MtbLoanActivity_GeneratedInjector"), "MtbLoanActivity_GeneratedInjector present for Hilt dependency injection");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/mtb_loan/presentation/MtbLoanViewModel"), "MtbLoanViewModel class present in classes4.dex");

const vmMethods = [
  "applyForLoan", "getClientData", "getDashboardInfo", "getWalletStatus",
  "handleClickNext", "loadRemoteConfig", "onAction", "onUpdateOtpCode",
  "requestForOtp", "resendOtp", "updateClientData", "updateSelfieImage", "uploadImage"
];
vmMethods.forEach(m => {
  assert(dex4Str.includes(m), "MtbLoanViewModel method " + m + " present in bytecode");
});

assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/mtb_loan/domain/repository/MtbLoanRepository;"), "MtbLoanRepository domain repository interface present in classes4.dex");
assert(dex4Str.includes("MtbLoanRepositoryImpl"), "MtbLoanRepositoryImpl data repository present in classes4.dex");

const repoMethods = [
  "applyLoan", "getClientData", "getLoanDashboardInfoData", "makeApiCall",
  "requestOtp", "updateClient", "uploadMedia"
];
repoMethods.forEach(m => {
  assert(dex4Str.includes(m), "MtbLoanRepositoryImpl method " + m + " present in bytecode");
});

assert(dex4Str.includes("LoanApplicationScreenKt"), "LoanApplicationScreenKt Compose screen present in classes4.dex");
assert(dex4Str.includes("LoanDashboardScreenKt"), "LoanDashboardScreenKt Compose screen present in classes4.dex");
assert(dex4Str.includes("LoanOtpVerificationScreenKt"), "LoanOtpVerificationScreenKt Compose screen present in classes4.dex");
assert(dex4Str.includes("PinEntryViewKt"), "PinEntryViewKt Compose component present in classes4.dex");

assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/mtb_loan/presentation/UiEvent;"), "UiEvent sealed interface present in classes4.dex");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/mtb_loan/presentation/UserAction;"), "UserAction sealed interface present in classes4.dex");

const telemetryKeys = [
  "is_mtb_loan_applied", "is_mtb_loan_approved", "mtb_loan_application",
  "mtb_loan_dashboard", "mtb_loan_otp_verification", "mtb_loan_success"
];
telemetryKeys.forEach(t => {
  assert(dex4Str.includes(t), "Telemetry / event constant " + t + " present in classes4.dex");
});

// -------------------------------------------------------------
// GROUP 5: Remote REST APIs & Endpoints
// -------------------------------------------------------------
console.log("\n[GROUP 5: Remote REST APIs & Endpoints]");

assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/mtb_loan/data/remote/MtbLoanTpApi;"), "MtbLoanTpApi interface present in classes4.dex");
assert(dex4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/mtb_loan/data/remote/MtbLoanUMPSApi;"), "MtbLoanUMPSApi interface present in classes4.dex");
assert(dex4Str.includes("MTBLoanTpApiQualifier"), "MTBLoanTpApiQualifier Dagger qualifier present in classes4.dex");
assert(dex4Str.includes("MTBLoanUPMSApiQualifier"), "MTBLoanUPMSApiQualifier Dagger qualifier present in classes4.dex");

const apiEndpoints = [
  "api/loan/tp-client-data/tk-app/details",
  "api/loan/client-status/tk-app/{business_account_number_tp}",
  "api/loan/client-data/applied/{client_id}",
  "api/loan/client-data/form/{form_code_name}/upload"
];
apiEndpoints.forEach(ep => {
  assert(dex4Str.includes(ep), "API endpoint " + ep + " present in classes4.dex");
});

// -------------------------------------------------------------
// GROUP 6: DTOs & Domain Models
// -------------------------------------------------------------
console.log("\n[GROUP 6: DTOs & Domain Models]");

assert(dex4Str.includes("LoanAccountDto"), "LoanAccountDto class present in classes4.dex");
const loanAccountFields = [
  "loanId", "loanAccountNo", "loanCardNo", "loanReferenceNo", "accountName",
  "walletNo", "externalFI", "creditLimit", "availableLimit", "isActive",
  "status", "userId", "loanIssueDate", "loanRepaymentDate"
];
loanAccountFields.forEach(f => {
  assert(dex4Str.includes(f), "LoanAccountDto field " + f + " present in classes4.dex");
});

const installmentFields = [
  "interestRate", "interestType", "loanProcessingFee", "tenure", "tenureInDay", "tenureInMonth",
  "dailyInstallmentAmount", "installmentAmount", "totalInstallmentAmount", "nextInstallmentAmount",
  "nextInstallmentDate", "pendingInstallmentAmount"
];
installmentFields.forEach(f => {
  assert(dex4Str.includes(f), "Installment & financial field " + f + " present in classes4.dex");
});

const clientFields = ["requestedLoanAmount", "isLoanApplied", "clientData"];
clientFields.forEach(f => {
  assert(dex4Str.includes(f), "Client loan field " + f + " present in classes4.dex");
});

assert(dex4Str.includes("LoanAddMoneyRequestDto"), "LoanAddMoneyRequestDto present in classes4.dex");
assert(dex4Str.includes("LoanTxnResponseDto"), "LoanTxnResponseDto present in classes4.dex");
assert(dex4Str.includes("MerchantPaymentWithLoanDto"), "MerchantPaymentWithLoanDto present in classes4.dex");
assert(dex4Str.includes("TransferMoneyForLoanRepaymentDto"), "TransferMoneyForLoanRepaymentDto present in classes4.dex");
assert(dex4Str.includes("LoanStatusDto"), "LoanStatusDto present in classes4.dex");

// -------------------------------------------------------------
// GROUP 7: Loan Status Taxonomy & Backend Enums
// -------------------------------------------------------------
console.log("\n[GROUP 7: Loan Status Taxonomy & Backend Enums]");

assert(dex4Str.includes("BackendEnum$LoanAccountStatus"), "BackendEnum$LoanAccountStatus enum present in classes4.dex");
assert(dex4Str.includes("EnumConstant$LoanStatus"), "EnumConstant$LoanStatus class present in classes4.dex");

const loanStatuses = ["APPROVED", "PENDING", "REJECTED", "INVALID"];
loanStatuses.forEach(st => {
  assert(dex4Str.includes(st), "Loan status enum constant " + st + " present in classes4.dex");
});

const txnTypes = [
  "LOAN", "LOAN_APPLICATION", "LOAN_APPROVED", "LOAN_REJECTED",
  "LOAN_REPAYMENT", "PAYMENT_WITH_LOAN", "CASH_IN_FROM_LOAN_CREDIT", "TK_APP_MTB_LOAN"
];
txnTypes.forEach(tt => {
  assert(dex4Str.includes(tt), "Loan transaction type constant " + tt + " present in classes4.dex");
});

// -------------------------------------------------------------
// GROUP 8: Financial & Credit Math Invariants (Reducing Balance & Flat Rate EMI)
// -------------------------------------------------------------
console.log("\n[GROUP 8: Financial & Credit Math Invariants (Reducing Balance & Flat Rate EMI)]");

// Reducing balance EMI Formula: E = [P * r * (1 + r)^n] / [(1 + r)^n - 1]
function calculateReducingBalanceEmi(principalPaisa, annualRatePercent, tenureMonths) {
  const p = principalPaisa / 100;
  const monthlyRate = (annualRatePercent / 100) / 12;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emiTaka = (p * monthlyRate * factor) / (factor - 1);
  return Math.round(emiTaka * 100); // Return in Paisa
}

// Flat rate interest formula: Total Interest = P * r * (tenureMonths / 12)
function calculateFlatRateRepayment(principalPaisa, annualRatePercent, tenureMonths) {
  const p = principalPaisa / 100;
  const totalInterestTaka = p * (annualRatePercent / 100) * (tenureMonths / 12);
  const totalRepayableTaka = p + totalInterestTaka;
  const monthlyEmiTaka = totalRepayableTaka / tenureMonths;
  return {
    totalInterestPaisa: Math.round(totalInterestTaka * 100),
    totalRepayablePaisa: Math.round(totalRepayableTaka * 100),
    monthlyEmiPaisa: Math.round(monthlyEmiTaka * 100)
  };
}

// Processing fee calculation (e.g. 1.5% with min fee of ৳100)
function calculateProcessingFee(principalPaisa, feeRatePercent = 1.5, minFeePaisa = 10000) {
  const calculatedFee = Math.round(principalPaisa * (feeRatePercent / 100));
  return Math.max(calculatedFee, minFeePaisa);
}

// Test 1: ৳20,000 principal, 9% annual reducing balance, 6 months
const emiPaisa6m = calculateReducingBalanceEmi(2000000, 9.0, 6);
assert(emiPaisa6m > 0, "Reducing balance EMI for ৳20,000 @ 9% 6m produces positive integer Paisa: " + emiPaisa6m);
// Expected: 20000 * 0.0075 * (1.0075)^6 / ((1.0075)^6 - 1) = ~3421.14 Taka = 342114 Paisa
assert(Math.abs(emiPaisa6m - 342114) <= 50, "Reducing balance EMI matches exact actuarial value (~৳3,421.14)");

// Test 2: Flat rate for ৳20,000, 9% annual, 6 months
const flat6m = calculateFlatRateRepayment(2000000, 9.0, 6);
assert(flat6m.totalInterestPaisa === 90000, "Flat rate total interest for ৳20,000 @ 9% 6m is exactly ৳900 (90,000 Paisa)");
assert(flat6m.totalRepayablePaisa === 2090000, "Flat rate total repayable is exactly ৳20,900 (2,090,000 Paisa)");
assert(flat6m.monthlyEmiPaisa === 348333, "Flat rate monthly EMI is ৳3,483.33 (348,333 Paisa)");

// Test 3: Processing fee calculation
const procFee20k = calculateProcessingFee(2000000, 1.5, 10000); // 1.5% of 20,000 = 300 Taka
assert(procFee20k === 30000, "Processing fee for ৳20,000 @ 1.5% is exactly ৳300 (30,000 Paisa)");

const procFee5k = calculateProcessingFee(500000, 1.0, 10000); // 1% of 5,000 = 50 Taka < 100 min
assert(procFee5k === 10000, "Processing fee for ৳5,000 @ 1% enforces minimum fee of ৳100 (10,000 Paisa)");

// Test 4: Daily installment deduction from wallet
function calculateDailyInstallment(totalRepayablePaisa, tenureDays) {
  return Math.ceil(totalRepayablePaisa / tenureDays);
}
const dailyInst = calculateDailyInstallment(flat6m.totalRepayablePaisa, 180);
assert(dailyInst === 11612, "Daily installment for ৳20,900 over 180 days is ৳116.12 (11,612 Paisa)");

// -------------------------------------------------------------
// GROUP 9: Authentic Bengali ARSC Resource Strings
// -------------------------------------------------------------
console.log("\n[GROUP 9: Authentic Bengali ARSC Resource Strings]");

const arscRaw = readZipEntry(apkPath, "resources.arsc");
assert(arscRaw !== null, "resources.arsc exists and is readable in APK");
const arscUtf8 = arscRaw.toString("utf8");

const bengaliTokens = [
  "OTP দিয়ে লোন আবেদন নিশ্চিত করুন",
  "অপর্যাপ্ত একাউন্ট ব্যালেন্স ও লোন লিমিট",
  "মিউচুয়াল ট্রাস্ট ব্যাংকের লোন এর শর্তাবলী-তে সম্মতি দিচ্ছি।",
  "কিস্তি পরিশোধ করতে ব্যবহার করুন",
  "টালি লোন",
  "লোন",
  "লোন আবেদন",
  "লোন আবেদন করি",
  "লোন একাউন্ট",
  "লোন গ্রহণের তারিখ",
  "লোন চলাকালীন এই একাউন্ট ডিলিট করা যাবে না।",
  "লোন পরিশোদ সফল হয়নি",
  "লোন প্রসেসিং ফি",
  "লোনের তথ্য",
  "লোনের পরিমাণ",
  "লোনের বিস্তারিত",
  "লোনের মেয়াদ",
  "আপনার পরিশোধযোগ্য লোণ নেই।",
  "মিউচুয়াল ট্রাস্ট ব্যাংক",
  "নিজেই আবেদন করছেন তা নিশ্চিত করতে ফেইস ভেরিফিকেশন করুন।"
];

bengaliTokens.forEach(tok => {
  assert(arscUtf8.includes(tok), "Authentic Bengali string token \"" + tok + "\" present in resources.arsc");
});

// -------------------------------------------------------------
// GROUP 10: Pure-JS Loan & Credit Scoring Reference Engine Simulation
// -------------------------------------------------------------
console.log("\n[GROUP 10: Pure-JS Loan & Credit Scoring Reference Engine Simulation]");

class MtbDigitalLoanEngine {
  constructor() {
    this.loanAccounts = new Map();
    this.applications = new Map();
    this.repaymentLogs = [];
  }

  // Credit Scoring & Eligibility Rule Engine
  evaluateEligibility(merchantProfile) {
    const { businessAgeMonths, monthlyTurnoverPaisa, dueRecoveryRatio, kycVerified } = merchantProfile;
    if (!kycVerified) {
      return { eligible: false, maxLimitPaisa: 0, reason: "KYC_INCOMPLETE", score: 0 };
    }
    if (businessAgeMonths < 3) {
      return { eligible: false, maxLimitPaisa: 0, reason: "BUSINESS_TOO_NEW", score: 25 };
    }
    if (monthlyTurnoverPaisa < 3000000) { // < ৳30,000
      return { eligible: false, maxLimitPaisa: 0, reason: "INSUFFICIENT_TURNOVER", score: 40 };
    }

    // Scoring out of 100
    let score = 50;
    if (businessAgeMonths >= 12) score += 20;
    else if (businessAgeMonths >= 6) score += 10;

    if (monthlyTurnoverPaisa >= 10000000) score += 20; // >= ৳1,00,000
    else if (monthlyTurnoverPaisa >= 5000000) score += 10;

    if (dueRecoveryRatio >= 0.85) score += 10;

    // Credit limit calculation
    let maxLimitPaisa = 0;
    if (score >= 80) maxLimitPaisa = 5000000; // ৳50,000
    else if (score >= 65) maxLimitPaisa = 3000000; // ৳30,000
    else if (score >= 50) maxLimitPaisa = 1500000; // ৳15,000

    return {
      eligible: true,
      score,
      maxLimitPaisa,
      interestRatePercent: 9.0,
      supportedTenuresMonths: [3, 6, 12],
      lenderName: "Mutual Trust Bank Limited"
    };
  }

  // Application Submission with Face Verification & OTP
  submitApplication(application) {
    const { merchantId, requestedAmountPaisa, tenureMonths, selfieUploaded, termsAccepted } = application;
    if (!termsAccepted) throw new Error("TERMS_NOT_ACCEPTED");
    if (!selfieUploaded) throw new Error("FACE_VERIFICATION_REQUIRED");

    const appId = "MTB-APP-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const appRecord = {
      appId,
      merchantId,
      requestedAmountPaisa,
      tenureMonths,
      status: "OTP_PENDING",
      createdAt: new Date().toISOString()
    };
    this.applications.set(appId, appRecord);
    return appRecord;
  }

  // Confirm Application with OTP
  confirmOtp(appId, otpCode) {
    const app = this.applications.get(appId);
    if (!app) throw new Error("APP_NOT_FOUND");
    if (otpCode !== "123456") throw new Error("INVALID_OTP");

    app.status = "PENDING_BANK_APPROVAL";
    return app;
  }

  // Bank Approval & Disbursement
  disburseLoan(appId, approvalResult) {
    const app = this.applications.get(appId);
    if (!app) throw new Error("APP_NOT_FOUND");
    if (!approvalResult.approved) {
      app.status = "REJECTED";
      return { status: "REJECTED", reason: approvalResult.reason };
    }

    app.status = "APPROVED";
    const loanAccountNo = "MTB-LN-" + Math.floor(1000000000 + Math.random() * 9000000000);
    const tenureDays = app.tenureMonths * 30;
    const flatRepayment = calculateFlatRateRepayment(app.requestedAmountPaisa, 9.0, app.tenureMonths);
    const procFee = calculateProcessingFee(app.requestedAmountPaisa, 1.5, 10000);
    const disbursedAmountPaisa = app.requestedAmountPaisa - procFee;

    const loanAccount = {
      loanAccountNo,
      appId,
      merchantId: app.merchantId,
      lenderName: "Mutual Trust Bank",
      principalPaisa: app.requestedAmountPaisa,
      disbursedAmountPaisa,
      processingFeePaisa: procFee,
      interestRatePercent: 9.0,
      interestType: "FLAT",
      totalRepayablePaisa: flatRepayment.totalRepayablePaisa,
      remainingRepayablePaisa: flatRepayment.totalRepayablePaisa,
      monthlyEmiPaisa: flatRepayment.monthlyEmiPaisa,
      dailyInstallmentPaisa: calculateDailyInstallment(flatRepayment.totalRepayablePaisa, tenureDays),
      tenureMonths: app.tenureMonths,
      tenureDays,
      status: "ACTIVE",
      installmentsPaid: 0,
      issuedAt: new Date().toISOString()
    };

    this.loanAccounts.set(loanAccountNo, loanAccount);
    return loanAccount;
  }

  // Repayment Process (Daily Sweep or Manual Installment)
  repayInstallment(loanAccountNo, paymentAmountPaisa, sourceWalletNo) {
    const loan = this.loanAccounts.get(loanAccountNo);
    if (!loan) throw new Error("LOAN_NOT_FOUND");
    if (loan.status !== "ACTIVE") throw new Error("LOAN_NOT_ACTIVE");

    const effectivePayment = Math.min(paymentAmountPaisa, loan.remainingRepayablePaisa);
    loan.remainingRepayablePaisa -= effectivePayment;
    loan.installmentsPaid++;

    const logEntry = {
      logId: "REP-" + Date.now(),
      loanAccountNo,
      amountPaisa: effectivePayment,
      sourceWalletNo,
      remainingPaisa: loan.remainingRepayablePaisa,
      timestamp: new Date().toISOString()
    };
    this.repaymentLogs.push(logEntry);

    if (loan.remainingRepayablePaisa === 0) {
      loan.status = "CLOSED";
    }

    return {
      success: true,
      paidAmountPaisa: effectivePayment,
      remainingRepayablePaisa: loan.remainingRepayablePaisa,
      loanStatus: loan.status
    };
  }
}

// Simulation Runs
const engine = new MtbDigitalLoanEngine();

// 1. Evaluate Eligibility
const profile1 = {
  businessAgeMonths: 14,
  monthlyTurnoverPaisa: 8500000, // ৳85,000
  dueRecoveryRatio: 0.90,
  kycVerified: true
};
const eval1 = engine.evaluateEligibility(profile1);
assert(eval1.eligible === true, "Merchant with valid turnover & KYC is eligible for MTB Loan");
assert(eval1.score >= 80, "Merchant achieves high credit score (score: " + eval1.score + ")");
assert(eval1.maxLimitPaisa === 5000000, "Eligible max limit is ৳50,000 (5,000,000 Paisa)");

// 2. Submit Application
const app1 = engine.submitApplication({
  merchantId: "MCH-01711000000",
  requestedAmountPaisa: 3000000, // ৳30,000
  tenureMonths: 6,
  selfieUploaded: true,
  termsAccepted: true
});
assert(app1.status === "OTP_PENDING", "Application moves to OTP_PENDING state");

// 3. Confirm with OTP
const appConfirmed = engine.confirmOtp(app1.appId, "123456");
assert(appConfirmed.status === "PENDING_BANK_APPROVAL", "Application moves to PENDING_BANK_APPROVAL after OTP");

// 4. Disburse Loan
const loanDisbursed = engine.disburseLoan(app1.appId, { approved: true });
assert(loanDisbursed.status === "ACTIVE", "Disbursed loan account is ACTIVE");
assert(loanDisbursed.principalPaisa === 3000000, "Principal is exactly ৳30,000");
assert(loanDisbursed.processingFeePaisa === 45000, "Processing fee is 1.5% = ৳450 (45,000 Paisa)");
assert(loanDisbursed.disbursedAmountPaisa === 2955000, "Net disbursed amount to wallet is ৳29,550");
assert(loanDisbursed.totalRepayablePaisa === 3135000, "Total repayable (principal + 9% 6m interest) is ৳31,350");

// 5. Repay Partial Installment
const repay1 = engine.repayInstallment(loanDisbursed.loanAccountNo, 522500, "01711000000");
assert(repay1.success === true, "Partial installment repayment succeeds");
assert(repay1.remainingRepayablePaisa === 2612500, "Remaining balance correctly decremented to ৳26,125");
assert(repay1.loanStatus === "ACTIVE", "Loan remains ACTIVE after partial payment");

// 6. Pay off remaining balance
const repayFinal = engine.repayInstallment(loanDisbursed.loanAccountNo, 2612500, "01711000000");
assert(repayFinal.success === true, "Full repayment succeeds");
assert(repayFinal.remainingRepayablePaisa === 0, "Remaining balance is exactly 0 Paisa");
assert(repayFinal.loanStatus === "CLOSED", "Loan transitions to CLOSED status upon full repayment");

console.log("\n==================================================================");
console.log(" ALL " + totalTests + "/" + totalTests + " TESTS PASSED SUCCESSFULLY! (100% PASS RATE)");
console.log("==================================================================");
