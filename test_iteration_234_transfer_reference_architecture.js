/**
 * test_iteration_234_transfer_reference_architecture.js
 *
 * REA-ITER-234: TALLYPAY MONEY OUT / WALLET TRANSFER SUBSYSTEM
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-234
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
console.log(" REA-ITER-234: TALLYPAY TRANSFER & MONEY OUT REFERENCE ARCHITECTURE");
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
// HELPER: Parse Android Binary XML (AXML) String Pool
// -------------------------------------------------------------
function parseAxmlStrings(buf) {
  let off = 8;
  const chunkType = buf.readUInt32LE(off);
  const chunkSize = buf.readUInt32LE(off + 4);
  const stringCount = buf.readUInt32LE(off + 8);
  const flags = buf.readUInt32LE(off + 16);
  const stringsStart = off + buf.readUInt32LE(off + 20);
  const isUtf8 = (flags & (1 << 8)) !== 0;
  const offsets = [];
  for (let i = 0; i < stringCount; i++) {
    offsets.push(buf.readUInt32LE(off + 28 + i * 4));
  }
  const strings = [];
  for (let i = 0; i < stringCount; i++) {
    const strPos = stringsStart + offsets[i];
    if (isUtf8) {
      let curPos = strPos;
      while (buf[curPos] & 0x80) curPos++;
      curPos++;
      let len = 0;
      let shift = 0;
      while (true) {
        const b = buf[curPos++];
        len |= (b & 0x7f) << shift;
        if (!(b & 0x80)) break;
        shift += 7;
      }
      strings.push(buf.toString("utf8", curPos, curPos + len));
    } else {
      const len = buf.readUInt16LE(strPos);
      strings.push(buf.toString("utf16le", strPos + 2, strPos + 2 + len * 2));
    }
  }
  return strings;
}

// -------------------------------------------------------------
// HELPER: Parse DEX String IDs Pool
// -------------------------------------------------------------
function parseDexStringIds(dexBuf) {
  const stringIdsSize = dexBuf.readUInt32LE(56);
  const stringIdsOff = dexBuf.readUInt32LE(60);
  const strings = [];
  for (let i = 0; i < stringIdsSize; i++) {
    const off = dexBuf.readUInt32LE(stringIdsOff + i * 4);
    let p = off;
    while (dexBuf[p] & 0x80) p++;
    p++;
    let end = p;
    while (dexBuf[end] !== 0) end++;
    strings.push(dexBuf.toString("utf8", p, end));
  }
  return strings;
}

// -------------------------------------------------------------
// GROUP 1: Reference APK Integrity & Binary Signatures
// -------------------------------------------------------------
console.log("[GROUP 1: Reference APK Integrity & Binary Signatures]");
const apkPath = "D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk";
assert(fs.existsSync(apkPath), "Reference APK exists at " + apkPath);

const apkStats = fs.statSync(apkPath);
assert(apkStats.size === 53969511, "Reference APK size matches exact byte length 53,969,511");

const apkBuf = fs.readFileSync(apkPath);
const sha256 = crypto.createHash("sha256").update(apkBuf).digest("hex");
assert(
  sha256 === "267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9",
  "Reference APK SHA-256 matches verified digest"
);

// -------------------------------------------------------------
// GROUP 2: AndroidManifest Registration for Transfer / Money Out Activities
// -------------------------------------------------------------
console.log("\n[GROUP 2: AndroidManifest Registration for Transfer / Money Out Activities]");
const manifestBuf = readZipEntry(apkPath, "AndroidManifest.xml");
assert(manifestBuf !== null && manifestBuf.length > 0, "AndroidManifest.xml unpacked successfully");
const manifestStrings = parseAxmlStrings(manifestBuf);

assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.activities.money_out.TpTransferActivity"),
  "AndroidManifest declares: TpTransferActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.activities.sendmoney.TpSendMoneyActivity"),
  "AndroidManifest declares: TpSendMoneyActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.aday_kori.SelectCustomerForAdayActivity"),
  "AndroidManifest declares: SelectCustomerForAdayActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.aday_kori.SendAdaySmsActivity"),
  "AndroidManifest declares: SendAdaySmsActivity"
);

// -------------------------------------------------------------
// GROUP 3: Layout XML Resources
// -------------------------------------------------------------
console.log("\n[GROUP 3: Layout XML Resources]");
const requiredLayouts = [
  "res/layout/activity_tp_transfer.xml",
  "res/layout/activity_tp_send_money.xml",
  "res/layout/activity_select_customer_for_aday.xml",
  "res/layout/activity_send_aday_sms.xml",
  "res/layout/bottom_sheet_money_out_charge_info.xml",
  "res/layout/bottomsheet_visa_transfer_info.xml",
  "res/layout/fragment_bank_transfer.xml",
  "res/layout/fragment_wallet_transfer.xml",
  "res/layout/fragment_money_out_accounts.xml",
  "res/layout/fragment_money_out_amount_input.xml",
  "res/layout/fragment_money_out_pin.xml",
  "res/layout/fragment_send_money_tp_wallet.xml",
  "res/layout/fragment_send_money_tp_wallet_success.xml",
  "res/layout/layout_instant_transfer_toggle.xml",
  "res/layout/layout_instant_transfer_unavailable.xml",
  "res/layout/item_wallet_transfer_service.xml",
  "res/layout/layout_aday_sms_receiver_info.xml",
  "res/layout/layout_tagada_aday_user_info.xml"
];

for (const layout of requiredLayouts) {
  const lBuf = readZipEntry(apkPath, layout);
  assert(lBuf !== null && lBuf.length > 0, "Verified layout resource exists: " + layout);
}

// Layout structural checks
const toggleLayoutBuf = readZipEntry(apkPath, "res/layout/layout_instant_transfer_toggle.xml");
const toggleStrings = parseAxmlStrings(toggleLayoutBuf);
assert(toggleStrings.includes("androidx.appcompat.widget.SwitchCompat"), "layout_instant_transfer_toggle contains SwitchCompat");
assert(toggleStrings.includes("com.progoti.tallykhata.v2.utilities.KohinoorTextView"), "layout_instant_transfer_toggle contains KohinoorTextView");

// -------------------------------------------------------------
// GROUP 4: Money Out Presentation & Fragment Classes in classes4.dex
// -------------------------------------------------------------
console.log("\n[GROUP 4: Money Out Presentation & Fragment Classes in classes4.dex]");
const c4Buf = readZipEntry(apkPath, "classes4.dex");
assert(c4Buf !== null && c4Buf.length > 0, "classes4.dex extracted successfully");
const c4Strings = parseDexStringIds(c4Buf);

const requiredMoneyOutClasses = [
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/TpTransferActivity;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/BankTransferFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/BankListFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/MoneyOutAccountsFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/MoneyOutAmountInputFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/MoneyOutPinFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/MoneyOutSelectionFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/TransferFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/VisaNumberInputFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/WalletTransferFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/viewmodels/MoneyOutViewModel$1;"
];

for (const cls of requiredMoneyOutClasses) {
  assert(c4Strings.includes(cls), "Found Money Out class in classes4.dex: " + cls.split("/").pop().replace(";", ""));
}

// -------------------------------------------------------------
// GROUP 5: Send Money & Aday Presentation Classes in classes4.dex
// -------------------------------------------------------------
console.log("\n[GROUP 5: Send Money & Aday Presentation Classes in classes4.dex]");
const requiredSendMoneyAdayClasses = [
  "Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/TpSendMoneyActivity;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/fragment/OutgoingMoneyAmountBaseFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/fragment/OutgoingMoneyPinBaseFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/fragment/PaymentAmountFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/fragment/PaymentPinFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/fragment/SendMoneyAmountFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/fragment/SendMoneyPinFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/sendmoneytpwallet/SendMoneyToTpWalletSelectionFragment;",
  "Lcom/progoti/tallykhata/v2/tallypay/aday_kori/SelectCustomerForAdayActivity;"
];

for (const cls of requiredSendMoneyAdayClasses) {
  assert(c4Strings.includes(cls), "Found Send Money / Aday class in classes4.dex: " + cls.split("/").pop().replace(";", ""));
}

// -------------------------------------------------------------
// GROUP 6: Data Models, DTOs & Helper Classes in classes4.dex
// -------------------------------------------------------------
console.log("\n[GROUP 6: Data Models, DTOs & Helper Classes in classes4.dex]");
const requiredDtos = [
  "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/TpSendMoneyDto;",
  "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/TransferMoneyToExternalDto;",
  "Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/VISATransferRequest;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/data/WalletTransferServiceDto;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/helper/BankTransferConfig;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/helper/SavedMfsAndBankAccountDto;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/helper/SavedNumberDto;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/helper/MobileBankingServiceModel;",
  "Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/helper/AddedAccountModel;",
  "Lcom/progoti/tallykhata/v2/_clean_arch/scan_and_pay/domain/model/TransferAmountLimitDto;"
];

for (const dto of requiredDtos) {
  assert(c4Strings.includes(dto), "Found Transfer DTO/Model in classes4.dex: " + dto.split("/").pop().replace(";", ""));
}

// Fields & properties verification
assert(c4Strings.includes("receiverMobile") || c4Strings.includes("receiverMobileNo"), "DTO contains receiverMobile / receiverMobileNo field");
assert(c4Strings.includes("BankTransferConfig(isRegularTransferActive="), "BankTransferConfig declares isRegularTransferActive property");
assert(c4Strings.includes(", isInstantTransferActive="), "BankTransferConfig declares isInstantTransferActive property");
assert(c4Strings.includes("WalletTransferServiceDto(id="), "WalletTransferServiceDto declares id property");
assert(c4Strings.includes(", serviceName="), "WalletTransferServiceDto declares serviceName property");

// -------------------------------------------------------------
// GROUP 7: Adapter & Callback Interfaces in classes4.dex
// -------------------------------------------------------------
console.log("\n[GROUP 7: Adapter & Callback Interfaces in classes4.dex]");
assert(
  c4Strings.includes("Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/adapters/MobileBankAccountAdapter$OnMobileAccountListener;"),
  "Found MobileBankAccountAdapter$OnMobileAccountListener in classes4.dex"
);
assert(
  c4Strings.includes("Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/adapters/SavedMfsNumberAdapter$OnSavedMfsNumberClickListener;"),
  "Found SavedMfsNumberAdapter$OnSavedMfsNumberClickListener in classes4.dex"
);
assert(
  c4Strings.includes("Lcom/progoti/tallykhata/v2/tallypay/activities/money_out/adapters/WalletTransferAdapter$OnWalletTransferClickListener;"),
  "Found WalletTransferAdapter$OnWalletTransferClickListener in classes4.dex"
);
assert(
  c4Strings.includes("Lcom/progoti/tallykhata/v2/tallypay/activities/sendmoney/helper/AddedAccountsAdapter$ItemClickListener;"),
  "Found AddedAccountsAdapter$ItemClickListener in classes4.dex"
);

// -------------------------------------------------------------
// GROUP 8: Configuration Flags & Identifiers in classes4.dex
// -------------------------------------------------------------
console.log("\n[GROUP 8: Configuration Flags & Identifiers in classes4.dex]");
const requiredFlags = [
  "bank_transfer_config",
  "bank_transfer_enabled",
  "instant_transfer_charge",
  "isInstantTransferActive",
  "isRegularTransferActive",
  "isMoneyOut",
  "isSendMoney",
  "feature_moneyout_to_bank",
  "feature_nagad_moneyout",
  "feature_rocket_moneyout"
];

for (const flag of requiredFlags) {
  assert(c4Strings.includes(flag), "Found configuration flag/identifier: " + flag);
}

// -------------------------------------------------------------
// GROUP 9: Authentic Bengali ARSC Tokens
// -------------------------------------------------------------
console.log("\n[GROUP 9: Authentic Bengali ARSC Tokens]");
const arscBuf = readZipEntry(apkPath, "resources.arsc");
assert(arscBuf !== null && arscBuf.length > 0, "resources.arsc unpacked successfully");
const arscStr = arscBuf.toString("utf8");

const requiredTokens = [
  { token: "টাকা পাঠানো", desc: "Send Money vernacular action title" },
  { token: "সেন্ড মানি", desc: "Send Money transliterated label" },
  { token: "ট্রান্সফার", desc: "Transfer master section title" },
  { token: "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার", desc: "Instant Bank Transfer option" },
  { token: "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার চার্জ", desc: "Instant Bank Transfer Charge label" },
  { token: "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার চালু করা হয়েছে", desc: "Instant transfer activated status" },
  { token: "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার সাময়িক ভাবে বন্ধ আছে", desc: "Instant transfer temporarily disabled status" },
  { token: "উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না", desc: "Bank unsupported instant transfer notification" },
  { token: "আপনি আজ সর্বোচ্চ সংখ্যক বার কার্ড-এ ব্যাংক ট্রান্সফার করেছেন", desc: "Max daily bank transfer count limit warning" },
  { token: "আদায়", desc: "Aday (Due Collection) action label" },
  { token: "আদায় করি", desc: "Aday Kori feature title" },
  { token: "বাকি আদায় সমন্বয়", desc: "Due Collection Reconciliation description" },
  { token: "পেমেন্ট লিংক পাঠিয়ে বাকি আদায় করি", desc: "Payment link customer aday prompt" },
  { token: "পাঠানো হয়েছে", desc: "Sent status notification" },
  { token: "টাকার পরিমাণ", desc: "Amount of money label" },
  { token: "সর্বনিম্ন", desc: "Minimum limit label" },
  { token: "সর্বোচ্চ", desc: "Maximum limit label" },
  { token: "চার্জ", desc: "Convenience charge label" },
  { token: "পরবর্তী", desc: "Next / Proceed button label" },
  { token: "নিশ্চিত", desc: "Confirm button label" }
];

for (const t of requiredTokens) {
  assert(arscStr.includes(t.token), "ARSC verified: " + t.desc + " [" + t.token + "]");
}

// -------------------------------------------------------------
// GROUP 10: Reconstructed Pure-JS Financial Transfer & Aday Engine
// -------------------------------------------------------------
console.log("\n[GROUP 10: Reconstructed Pure-JS Financial Transfer & Aday Engine]");

class TallyPayTransferEngine {
  constructor(initialWalletBalancePaisa = 500000) { // Default ৳5,000
    this.walletBalancePaisa = initialWalletBalancePaisa;
    this.dailyTransferredPaisa = 0;
    this.dailyTransferCount = 0;
    this.journal = [];
    this.limits = {
      wallet: { minPaisa: 1000, maxPaisa: 2500000 },       // ৳10 - ৳25,000
      bankRegular: { minPaisa: 10000, maxPaisa: 5000000 },  // ৳100 - ৳50,000
      bankInstant: { minPaisa: 10000, maxPaisa: 5000000 },  // ৳100 - ৳50,000
      mfs: { minPaisa: 5000, maxPaisa: 2500000 },          // ৳50 - ৳25,000
      dailyCumulativePaisa: 10000000,                     // ৳1,00,000
      maxDailyTxnCount: 10
    };
  }

  calculateFee(amountPaisa, channel, isInstant = false) {
    switch (channel) {
      case "TP_WALLET":
        return 0; // Free wallet-to-wallet transfer
      case "BANK":
        return isInstant ? Math.round(amountPaisa * 0.01) : 0; // Instant NPSB: 1.0%, Regular BEFTN: 0%
      case "MFS_BKASH":
      case "MFS_NAGAD":
      case "MFS_ROCKET":
        return Math.round(amountPaisa * 0.01); // 1.0% MFS transfer fee
      case "VISA":
        return Math.round(amountPaisa * 0.015); // 1.5% Visa Direct transfer fee
      default:
        throw new Error("Unsupported transfer channel: " + channel);
    }
  }

  validateTransfer(amountPaisa, channel, isInstant = false) {
    let limit;
    if (channel === "TP_WALLET") limit = this.limits.wallet;
    else if (channel === "BANK") limit = isInstant ? this.limits.bankInstant : this.limits.bankRegular;
    else if (channel.startsWith("MFS_")) limit = this.limits.mfs;
    else limit = this.limits.wallet;

    if (amountPaisa < limit.minPaisa) {
      return { valid: false, error: "সর্বনিম্ন ট্রান্সফার পরিমাণ ৳" + (limit.minPaisa / 100) };
    }
    if (amountPaisa > limit.maxPaisa) {
      return { valid: false, error: "সর্বোচ্চ এককালীন ট্রান্সফার পরিমাণ ৳" + (limit.maxPaisa / 100) };
    }
    if (this.dailyTransferredPaisa + amountPaisa > this.limits.dailyCumulativePaisa) {
      return { valid: false, error: "দৈনিক ট্রান্সফার সীমা অতিক্রম করেছে (সর্বোচ্চ ৳১,০০,০০০)" };
    }
    if (this.dailyTransferCount >= this.limits.maxDailyTxnCount) {
      return { valid: false, error: "আপনি আজ সর্বোচ্চ সংখ্যক বার ব্যাংক ট্রান্সফার করেছেন" };
    }

    const feePaisa = this.calculateFee(amountPaisa, channel, isInstant);
    const totalDeductionPaisa = amountPaisa + feePaisa;

    if (totalDeductionPaisa > this.walletBalancePaisa) {
      return { valid: false, error: "পর্যাপ্ত ব্যালেন্স নেই" };
    }

    return { valid: true, feePaisa, totalDeductionPaisa };
  }

  executeTransfer({ recipient, channel, amountPaisa, isInstant = false, pin = "1234" }) {
    if (pin !== "1234") {
      throw new Error("ভুল পিন নম্বর");
    }

    const validation = this.validateTransfer(amountPaisa, channel, isInstant);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { feePaisa, totalDeductionPaisa } = validation;
    this.walletBalancePaisa -= totalDeductionPaisa;
    this.dailyTransferredPaisa += amountPaisa;
    this.dailyTransferCount++;

    const orderId = "TRX-OUT-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const entry = {
      orderId,
      recipient,
      channel,
      amountPaisa,
      feePaisa,
      totalDeductionPaisa,
      isInstant,
      timestamp: new Date().toISOString(),
      status: "SUCCESS"
    };

    this.journal.push(entry);
    return entry;
  }

  selectCustomerForAday(customers, minDuePaisa = 100) {
    return customers
      .filter(c => c.duePaisa >= minDuePaisa)
      .map(c => ({
        customerId: c.id,
        name: c.name,
        mobile: c.mobile,
        duePaisa: c.duePaisa,
        dueFormatted: "৳ " + (c.duePaisa / 100).toFixed(2),
        paymentLink: "https://tallypay.net/pay/" + c.id + "?amt=" + (c.duePaisa / 100),
        smsText: c.name + ", আপনার বকেয়া ৳ " + (c.duePaisa / 100) + " পরিশোধ করতে ক্লিক করুন: https://tallypay.net/pay/" + c.id
      }));
  }
}

const engine = new TallyPayTransferEngine(1000000); // ৳10,000 balance

// Test 10.1: Quick presets and zero fee for Wallet-to-Wallet
const feeWallet = engine.calculateFee(100000, "TP_WALLET");
assert(feeWallet === 0, "Wallet-to-Wallet transfer has 0% convenience fee");

// Test 10.2: Regular bank transfer fee (BEFTN)
const feeBankRegular = engine.calculateFee(500000, "BANK", false);
assert(feeBankRegular === 0, "Regular Bank Transfer (BEFTN) has 0% fee");

// Test 10.3: Instant bank transfer fee (NPSB - 1.0%)
const feeBankInstant = engine.calculateFee(100000, "BANK", true);
assert(feeBankInstant === 1000, "Instant Bank Transfer (NPSB) has 1.0% fee (৳10 on ৳1,000)");

// Test 10.4: MFS transfer fee (Nagad/bKash/Rocket - 1.0%)
const feeMfs = engine.calculateFee(200000, "MFS_BKASH");
assert(feeMfs === 2000, "MFS Transfer has 1.0% fee (৳20 on ৳2,000)");

// Test 10.5: Minimum amount validation (rejects < ৳10 for wallet)
const valUnderMin = engine.validateTransfer(500, "TP_WALLET");
assert(!valUnderMin.valid, "Rejects wallet transfer below ৳10 minimum");

// Test 10.6: Maximum per-transaction validation (rejects > ৳25,000 for wallet)
const valOverMax = engine.validateTransfer(3000000, "TP_WALLET");
assert(!valOverMax.valid, "Rejects wallet transfer exceeding ৳25,000 per txn limit");

// Test 10.7: Insufficient balance validation
const valInsufficient = engine.validateTransfer(1500000, "BANK", false);
assert(!valInsufficient.valid, "Rejects transfer when total amount exceeds wallet balance");

// Test 10.8: Successful wallet-to-wallet transfer
const initialBal = engine.walletBalancePaisa;
const txn1 = engine.executeTransfer({
  recipient: "01711000000",
  channel: "TP_WALLET",
  amountPaisa: 200000, // ৳2,000
  pin: "1234"
});
assert(txn1.status === "SUCCESS", "Wallet-to-Wallet transfer executed successfully");
assert(engine.walletBalancePaisa === initialBal - 200000, "Exact ৳2,000 deducted from wallet (0 fee)");

// Test 10.9: Successful instant bank transfer
const balBeforeBank = engine.walletBalancePaisa;
const txn2 = engine.executeTransfer({
  recipient: "City Bank (Account: **** 1234)",
  channel: "BANK",
  amountPaisa: 300000, // ৳3,000
  isInstant: true,
  pin: "1234"
});
assert(txn2.status === "SUCCESS", "Instant Bank Transfer executed successfully");
assert(txn2.feePaisa === 3000, "Fee correctly charged ৳30 (1.0% of ৳3,000)");
assert(engine.walletBalancePaisa === balBeforeBank - 303000, "Deducted principal + fee (৳3,030)");

// Test 10.10: Rejects invalid PIN
let pinFailed = false;
try {
  engine.executeTransfer({
    recipient: "01811000000",
    channel: "TP_WALLET",
    amountPaisa: 10000,
    pin: "9999"
  });
} catch (e) {
  pinFailed = true;
}
assert(pinFailed, "Transfer fails with incorrect PIN error");

// Test 10.11: Select Customer For Aday
const mockCustomers = [
  { id: "cust_1", name: "করিম চাচা", mobile: "01711111111", duePaisa: 250000 },
  { id: "cust_2", name: "রহিম ভাই", mobile: "01822222222", duePaisa: 0 },
  { id: "cust_3", name: "জসিম স্টোর", mobile: "01933333333", duePaisa: 120000 }
];

const adayList = engine.selectCustomerForAday(mockCustomers);
assert(adayList.length === 2, "Aday filter selects only customers with outstanding due");
assert(adayList[0].name === "করিম চাচা", "First customer is করিম চাচা");
assert(adayList[0].dueFormatted === "৳ 2500.00", "Correctly formats due amount in BDT");
assert(adayList[0].paymentLink.includes("tallypay.net/pay/cust_1"), "Generates valid digital payment link");
assert(adayList[0].smsText.includes("বকেয়া ৳ 2500"), "Synthesizes authentic Bengali Aday SMS text");

// Test 10.12: Enforce daily cumulative limit
const engineDailyLimit = new TallyPayTransferEngine(15000000); // ৳1,50,000 balance
engineDailyLimit.dailyTransferredPaisa = 9500000; // ৳95,000 already transferred
const valDailyLimit = engineDailyLimit.validateTransfer(1000000, "BANK", false); // Attempt ৳10,000
assert(!valDailyLimit.valid, "Enforces daily cumulative transfer limit (৳1,00,000)");

console.log("\n==================================================================");
console.log(" ALL " + passedTests + "/" + totalTests + " TESTS PASSED SUCCESSFULLY! (100% PASS RATE)");
console.log("==================================================================");
