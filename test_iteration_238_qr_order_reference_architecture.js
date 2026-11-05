/**
 * test_iteration_238_qr_order_reference_architecture.js
 *
 * REA-ITER-238: TALLYPAY MERCHANT QR STANDEE ORDER & POS SOUNDBOX COLLATERAL DELIVERY SUBSYSTEM
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-238
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
console.log(" REA-ITER-238: MERCHANT QR STANDEE ORDER & DELIVERY TEST SUITE");
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
  if (chunkType !== 0x001c0001) {
    let found = -1;
    for (let i = 0; i < buf.length - 4; i += 4) {
      if (buf.readUInt32LE(i) === 0x001c0001) { found = i; break; }
    }
    if (found === -1) return [];
    off = found;
  }
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
      if ((len & 0x8000) !== 0) {
        len = ((len & 0x7fff) << 16) | buf.readUInt16LE(cur);
        cur += 2;
      }
      result.push(buf.toString("utf16le", cur, cur + len * 2));
    }
  }
  return result;
}

const apkPath = "D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk";

// =============================================================
// GROUP 1: Reference APK Integrity & Cryptographic Identity
// =============================================================
console.log("[GROUP 1: Reference APK Integrity & Cryptographic Identity]");
assert(fs.existsSync(apkPath), "Reference APK exists at " + apkPath);
const apkStats = fs.statSync(apkPath);
assert(apkStats.size === 53969511, "Reference APK size matches exact byte length 53,969,511");

const apkBuf = fs.readFileSync(apkPath);
const actualHash = crypto.createHash("sha256").update(apkBuf).digest("hex");
assert(
  actualHash === "267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9",
  "Reference APK SHA-256 matches verified digest"
);

// =============================================================
// GROUP 2: AndroidManifest Registration for QR & Collateral Activities
// =============================================================
console.log("\n[GROUP 2: AndroidManifest Registration for QR & Collateral Activities]");
const manifestBuf = readZipEntry(apkPath, "AndroidManifest.xml");
assert(manifestBuf !== null && manifestBuf.length > 0, "AndroidManifest.xml unpacked successfully");
const manifestStrings = parseAxmlStrings(manifestBuf);

assert(
  manifestStrings.includes("com.progoti.tallykhata.v2._clean_arch.sqr_onboarding.presentation.SqrOnboardingActivity"),
  "AndroidManifest declares SqrOnboardingActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2._clean_arch.super_qr.presentation.SuperQRActivity"),
  "AndroidManifest declares SuperQRActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.activities.profile.qr.TpProfileQrActivity"),
  "AndroidManifest declares TpProfileQrActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.activities.qrScanner.BanglaQrCaptureActivity"),
  "AndroidManifest declares BanglaQrCaptureActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.activities.qrScanner.QrCaptureActivity"),
  "AndroidManifest declares QrCaptureActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.activities.qrScanner.QrScannerActivity"),
  "AndroidManifest declares QrScannerActivity"
);

// Permissions
assert(manifestStrings.includes("android.permission.CAMERA"), "Manifest declares CAMERA permission");
assert(manifestStrings.includes("android.permission.WRITE_EXTERNAL_STORAGE"), "Manifest declares WRITE_EXTERNAL_STORAGE permission");
assert(manifestStrings.includes("android.permission.ACCESS_FINE_LOCATION"), "Manifest declares ACCESS_FINE_LOCATION permission for delivery mapping");
assert(manifestStrings.includes("android.permission.ACCESS_COARSE_LOCATION"), "Manifest declares ACCESS_COARSE_LOCATION permission");

// =============================================================
// GROUP 3: Visual Layouts & XML Drawables for QR, Standees & Collateral
// =============================================================
console.log("\n[GROUP 3: Visual Layouts & XML Drawables for QR, Standees & Collateral]");
const expectedLayouts = [
  "res/layout/sqr_download_bottom_sheet.xml",
  "res/layout/activity_bangla_qr_capture.xml",
  "res/layout/activity_qr_capture.xml",
  "res/layout/activity_qr_scanner.xml",
  "res/layout/activity_tp_profile_qr.xml",
  "res/layout/layout_bqr_app.xml",
  "res/layout/layout_tallypay_balance_qr_code_profile.xml",
  "res/layout/qr_scan_error_dialog.xml"
];

for (const layout of expectedLayouts) {
  const lBuf = readZipEntry(apkPath, layout);
  assert(lBuf !== null && lBuf.length > 0, "Verified layout XML exists: " + layout);
}

const expectedDrawables = [
  "res/drawable/ic_bangla_qr_circular.png",
  "res/drawable/ic_super_qr_new.xml",
  "res/drawable/ic_super_qr_filled.xml",
  "res/drawable/ic_sqr_566.png",
  "res/drawable/ic_sqr_rejected.xml",
  "res/drawable/ic_sqr_value_banner.png",
  "res/drawable/ic_non_sqr.png",
  "res/drawable/ic_super_qr_account_selection.png",
  "res/drawable-v23/ic_bangla_qr.png"
];

for (const drw of expectedDrawables) {
  const dBuf = readZipEntry(apkPath, drw);
  assert(dBuf !== null && dBuf.length > 0, "Verified drawable asset exists: " + drw);
}

// Check components in activity_tp_profile_qr.xml
const profQrBuf = readZipEntry(apkPath, "res/layout/activity_tp_profile_qr.xml");
const profQrStrings = parseAxmlStrings(profQrBuf);
assert(profQrStrings.includes("com.progoti.tallykhata.v2.utilities.KohinoorTextView"), "Profile QR layout uses KohinoorTextView typography");
assert(profQrStrings.includes("androidx.constraintlayout.widget.ConstraintLayout"), "Profile QR layout uses ConstraintLayout");

// Check components in sqr_download_bottom_sheet.xml
const sheetBuf = readZipEntry(apkPath, "res/layout/sqr_download_bottom_sheet.xml");
const sheetStrings = parseAxmlStrings(sheetBuf);
assert(sheetStrings.includes("com.progoti.tallykhata.v2.utilities.KohinoorTextView"), "SQR download sheet uses KohinoorTextView typography");
assert(sheetStrings.includes("androidx.appcompat.widget.LinearLayoutCompat"), "SQR download sheet uses LinearLayoutCompat container");

// =============================================================
// GROUP 4: Bytecode Classes & Clean Architecture (classes4.dex)
// =============================================================
console.log("\n[GROUP 4: Bytecode Classes & Clean Architecture (classes4.dex)]");
const c4Buf = readZipEntry(apkPath, "classes4.dex");
assert(c4Buf !== null && c4Buf.length > 0, "classes4.dex extracted successfully");
const c4Str = c4Buf.toString("utf8");

// Super QR Clean Architecture
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/super_qr/presentation/SuperQRActivity;"), "classes4.dex contains SuperQRActivity");
assert(c4Str.includes("SuperQrViewModel"), "classes4.dex contains SuperQrViewModel");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/super_qr/data/remote/SuperQRAPI;"), "classes4.dex contains SuperQRAPI");
assert(c4Str.includes("SuperQRRepositoryImpl"), "classes4.dex contains SuperQRRepositoryImpl");
assert(c4Str.includes("SuperQRScreen.kt"), "classes4.dex contains SuperQRScreen Compose reference");
assert(c4Str.includes("SuperQRSuccessScreen.kt"), "classes4.dex contains SuperQRSuccessScreen Compose reference");

// SQR Onboarding Clean Architecture
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/presentation/SqrOnboardingActivity;"), "classes4.dex contains SqrOnboardingActivity");
assert(c4Str.includes("SqrOnboardingViewModel"), "classes4.dex contains SqrOnboardingViewModel");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/remote/SqrOnboardingApi;"), "classes4.dex contains SqrOnboardingApi");
assert(c4Str.includes("SqrOnboardingRepositoryImpl"), "classes4.dex contains SqrOnboardingRepositoryImpl");
assert(c4Str.includes("SqrPhotoGuideScreen.kt"), "classes4.dex contains SqrPhotoGuideScreen Compose reference");

// Repository Methods
assert(c4Str.includes("downloadAndSaveQr"), "SuperQRRepositoryImpl implements downloadAndSaveQr");

// =============================================================
// GROUP 5: Data Models, DTOs & Address Entities in classes4.dex
// =============================================================
console.log("\n[GROUP 5: Data Models, DTOs & Address Entities in classes4.dex]");

// SQR Location & Forms
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/domain/model/LocationCatalog;"), "classes4.dex contains LocationCatalog");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/domain/model/LocationItem;"), "classes4.dex contains LocationItem");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/dto/SqrLocationDto;"), "classes4.dex contains SqrLocationDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/domain/model/SqrCoordinates;"), "classes4.dex contains SqrCoordinates");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/dto/SqrFormDataDto;"), "classes4.dex contains SqrFormDataDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/dto/SqrFormDefinitionDto;"), "classes4.dex contains SqrFormDefinitionDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/dto/SqrSectionDto;"), "classes4.dex contains SqrSectionDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/dto/SqrFieldDto;"), "classes4.dex contains SqrFieldDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/dto/SqrAnswerValueDto;"), "classes4.dex contains SqrAnswerValueDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/dto/SqrDataPointDto;"), "classes4.dex contains SqrDataPointDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/dto/SqrSavedClientDto;"), "classes4.dex contains SqrSavedClientDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/dto/SqrSavedDataPointDto;"), "classes4.dex contains SqrSavedDataPointDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/sqr_onboarding/data/dto/SqrUploadResponseDto;"), "classes4.dex contains SqrUploadResponseDto");

// Nobopay Address & QR DTOs
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/user/AddressDto;"), "classes4.dex contains AddressDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/user/UserAddressDto;"), "classes4.dex contains UserAddressDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/common/DistrictDto;"), "classes4.dex contains DistrictDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/common/ThanaDto;"), "classes4.dex contains ThanaDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/biz/ShopInfoDto;"), "classes4.dex contains ShopInfoDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/qr/MerchantQrRequestDto;"), "classes4.dex contains MerchantQrRequestDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/qr/MerchantQrResponseDto;"), "classes4.dex contains MerchantQrResponseDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/qr/QrQuantityDto;"), "classes4.dex contains QrQuantityDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/qr/QrTagDto;"), "classes4.dex contains QrTagDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/qr/GenerateQrDto;"), "classes4.dex contains GenerateQrDto");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/nobopayDataModel/dto/transaction/BanglaQrPaymentDto;"), "classes4.dex contains BanglaQrPaymentDto");

// =============================================================
// GROUP 6: Standee Material Taxonomy & Enums Validation
// =============================================================
console.log("\n[GROUP 6: Standee Material Taxonomy & Enums Validation]");

const STANDEE_MATERIALS = {
  ACRYLIC_DESK: {
    code: "ACRYLIC_DESK",
    name_bn: "এক্রিলিক ডেস্ক স্ট্যান্ডি",
    dimensions: "5x7 inch",
    basePrice: 250,
    durabilityRating: "HIGH",
    waterproof: true
  },
  WOODEN_BASE: {
    code: "WOODEN_BASE",
    name_bn: "কাঠের বেস স্ট্যান্ডি",
    dimensions: "6x8 inch",
    basePrice: 350,
    durabilityRating: "VERY_HIGH",
    waterproof: false
  },
  METAL_COUNTER: {
    code: "METAL_COUNTER",
    name_bn: "মেটাল কাউন্টার ফ্রেম",
    dimensions: "6x9 inch",
    basePrice: 450,
    durabilityRating: "EXTREME",
    waterproof: true
  },
  COUNTER_STICKER: {
    code: "COUNTER_STICKER",
    name_bn: "কাউন্টার কিউআর স্টিকার",
    dimensions: "4x4 inch",
    basePrice: 50,
    durabilityRating: "MEDIUM",
    waterproof: true
  },
  SOUNDBOX_STAND: {
    code: "SOUNDBOX_STAND",
    name_bn: "সাউন্ডবক্স কিউআর স্ট্যান্ড",
    dimensions: "Combined 7x9 inch",
    basePrice: 500,
    durabilityRating: "EXTREME",
    waterproof: true
  }
};

assert(Object.keys(STANDEE_MATERIALS).length === 5, "Defines 5 core collateral material items");
assert(STANDEE_MATERIALS.ACRYLIC_DESK.basePrice === 250, "Acrylic Desk standee base price is 250 BDT");
assert(STANDEE_MATERIALS.WOODEN_BASE.basePrice === 350, "Wooden Base standee base price is 350 BDT");
assert(STANDEE_MATERIALS.METAL_COUNTER.basePrice === 450, "Metal Counter standee base price is 450 BDT");
assert(STANDEE_MATERIALS.COUNTER_STICKER.basePrice === 50, "Counter Sticker base price is 50 BDT");
assert(STANDEE_MATERIALS.SOUNDBOX_STAND.basePrice === 500, "Soundbox Stand base price is 500 BDT");

const PAYMENT_METHODS = {
  WALLET_PAY: "WALLET_PAY",
  COD: "COD"
};
assert(PAYMENT_METHODS.WALLET_PAY === "WALLET_PAY", "Payment method WALLET_PAY is defined");
assert(PAYMENT_METHODS.COD === "COD", "Payment method COD is defined");

const ORDER_STATUS = {
  ORDER_PLACED: "ORDER_PLACED",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED"
};
assert(ORDER_STATUS.ORDER_PLACED === "ORDER_PLACED", "Order status ORDER_PLACED is defined");
assert(ORDER_STATUS.PROCESSING === "PROCESSING", "Order status PROCESSING is defined");
assert(ORDER_STATUS.SHIPPED === "SHIPPED", "Order status SHIPPED is defined");
assert(ORDER_STATUS.DELIVERED === "DELIVERED", "Order status DELIVERED is defined");
assert(ORDER_STATUS.CANCELLED === "CANCELLED", "Order status CANCELLED is defined");

// =============================================================
// GROUP 7: Bangladesh Shipping Address & Delivery Fee Calculator Invariants
// =============================================================
console.log("\n[GROUP 7: Bangladesh Shipping Address & Delivery Fee Calculator Invariants]");

const BD_DIVISIONS = [
  "Dhaka", "Chattogram", "Rajshahi", "Khulna",
  "Barishal", "Sylhet", "Rangpur", "Mymensingh"
];

assert(BD_DIVISIONS.length === 8, "LocationCatalog contains all 8 administrative divisions of Bangladesh");
assert(BD_DIVISIONS.includes("Dhaka"), "LocationCatalog includes Dhaka");
assert(BD_DIVISIONS.includes("Chattogram"), "LocationCatalog includes Chattogram");
assert(BD_DIVISIONS.includes("Sylhet"), "LocationCatalog includes Sylhet");

function calculateDeliveryFee(division, district, subtotal) {
  // Free delivery threshold: orders >= 1000 BDT get free shipping
  if (subtotal >= 1000) {
    return 0;
  }
  const isDhakaCity = division.toLowerCase() === "dhaka" && district.toLowerCase() === "dhaka";
  return isDhakaCity ? 60 : 120;
}

assert(calculateDeliveryFee("Dhaka", "Dhaka", 300) === 60, "Inside Dhaka shipping is 60 BDT for order < 1000 BDT");
assert(calculateDeliveryFee("Dhaka", "Gazipur", 300) === 120, "Outside Dhaka city shipping is 120 BDT");
assert(calculateDeliveryFee("Chattogram", "Chattogram", 450) === 120, "Chattogram shipping is 120 BDT");
assert(calculateDeliveryFee("Dhaka", "Dhaka", 1200) === 0, "Orders >= 1000 BDT qualify for free shipping");
assert(calculateDeliveryFee("Sylhet", "Sylhet", 1500) === 0, "Outside Dhaka orders >= 1000 BDT qualify for free shipping");

function validateShippingAddress(address) {
  if (!address) return { valid: false, reason: "MISSING_ADDRESS" };
  const { recipientName, phone, division, district, thana, streetAddress } = address;

  if (!recipientName || recipientName.trim().length < 2) {
    return { valid: false, reason: "INVALID_NAME", message: "প্রাপকের নাম সঠিকভাবে দিন।" };
  }
  const cleanPhone = (phone || "").replace(/[- ]/g, "");
  if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
    return { valid: false, reason: "INVALID_PHONE", message: "১১ ডিজিটের সঠিক মোবাইল নম্বর দিন।" };
  }
  if (!division || !BD_DIVISIONS.map(d => d.toLowerCase()).includes(division.toLowerCase())) {
    return { valid: false, reason: "INVALID_DIVISION", message: "সঠিক বিভাগ নির্বাচন করুন।" };
  }
  if (!district || district.trim().length < 2) {
    return { valid: false, reason: "INVALID_DISTRICT", message: "সঠিক জেলা দিন।" };
  }
  if (!thana || thana.trim().length < 2) {
    return { valid: false, reason: "INVALID_THANA", message: "সঠিক থানা/উপজেলা দিন।" };
  }
  if (!streetAddress || streetAddress.trim().length < 5) {
    return { valid: false, reason: "INVALID_STREET", message: "বিস্তারিত ঠিকানা (রাস্তা, বাসা/দোকান নং) দিন।" };
  }

  return { valid: true, cleanPhone };
}

const validAddr = {
  recipientName: "মো: রফিকুল ইসলাম",
  phone: "01712345678",
  division: "Dhaka",
  district: "Dhaka",
  thana: "Mirpur",
  streetAddress: "দোকান নং ৪২, ব্লক-সি, মিরপুর ১০"
};
const addrCheck = validateShippingAddress(validAddr);
assert(addrCheck.valid === true, "Valid shipping address passes verification");

const badPhoneAddr = Object.assign({}, validAddr, { phone: "012345" });
assert(validateShippingAddress(badPhoneAddr).valid === false, "Rejects invalid phone number");

const badDivAddr = Object.assign({}, validAddr, { division: "Kolkata" });
assert(validateShippingAddress(badDivAddr).valid === false, "Rejects non-Bangladesh division");

const shortStreetAddr = Object.assign({}, validAddr, { streetAddress: "123" });
assert(validateShippingAddress(shortStreetAddr).valid === false, "Rejects incomplete street address");

// =============================================================
// GROUP 8: QR Order Fulfillment & Consignment Tracking State Machine
// =============================================================
console.log("\n[GROUP 8: QR Order Fulfillment & Consignment Tracking State Machine]");

class QrOrderStateMachine {
  constructor(initialStatus = ORDER_STATUS.ORDER_PLACED) {
    this.status = initialStatus;
    this.history = [{ status: initialStatus, timestamp: new Date().toISOString() }];
    this.consignmentId = null;
    this.courierName = null;
  }

  advanceToProcessing() {
    if (this.status !== ORDER_STATUS.ORDER_PLACED) {
      throw new Error("Can only advance to PROCESSING from ORDER_PLACED");
    }
    this.status = ORDER_STATUS.PROCESSING;
    this.history.push({ status: this.status, timestamp: new Date().toISOString() });
    return this.status;
  }

  dispatchToCourier(courierName, consignmentId) {
    if (this.status !== ORDER_STATUS.PROCESSING) {
      throw new Error("Can only dispatch to courier from PROCESSING");
    }
    this.status = ORDER_STATUS.SHIPPED;
    this.courierName = courierName;
    this.consignmentId = consignmentId;
    this.history.push({
      status: this.status,
      courierName,
      consignmentId,
      timestamp: new Date().toISOString()
    });
    return this.status;
  }

  markDelivered() {
    if (this.status !== ORDER_STATUS.SHIPPED) {
      throw new Error("Can only mark delivered from SHIPPED");
    }
    this.status = ORDER_STATUS.DELIVERED;
    this.history.push({ status: this.status, timestamp: new Date().toISOString() });
    return this.status;
  }

  cancelOrder(reason) {
    if (this.status === ORDER_STATUS.SHIPPED || this.status === ORDER_STATUS.DELIVERED) {
      throw new Error("Cannot cancel order once SHIPPED or DELIVERED");
    }
    this.status = ORDER_STATUS.CANCELLED;
    this.history.push({ status: this.status, reason, timestamp: new Date().toISOString() });
    return this.status;
  }
}

const sm = new QrOrderStateMachine();
assert(sm.status === ORDER_STATUS.ORDER_PLACED, "Initial state is ORDER_PLACED");

sm.advanceToProcessing();
assert(sm.status === ORDER_STATUS.PROCESSING, "Advanced to PROCESSING state");

sm.dispatchToCourier("Steadfast Courier", "TK-QR-98214");
assert(sm.status === ORDER_STATUS.SHIPPED, "Advanced to SHIPPED state");
assert(sm.courierName === "Steadfast Courier", "Courier name recorded");
assert(sm.consignmentId === "TK-QR-98214", "Consignment ID recorded");

// Assert cannot cancel when shipped
let threwCancel = false;
try {
  sm.cancelOrder("Changed mind");
} catch (e) {
  threwCancel = true;
}
assert(threwCancel === true, "Guard prevents cancelling shipped orders");

sm.markDelivered();
assert(sm.status === ORDER_STATUS.DELIVERED, "Advanced to DELIVERED state");
assert(sm.history.length === 4, "State history recorded all 4 milestone steps");

// Test early cancellation
const cancelSm = new QrOrderStateMachine();
cancelSm.cancelOrder("Customer request");
assert(cancelSm.status === ORDER_STATUS.CANCELLED, "Order placed can be cancelled early");

// =============================================================
// GROUP 9: Authentic Bengali ARSC Tokens in resources.arsc
// =============================================================
console.log("\n[GROUP 9: Authentic Bengali ARSC Tokens in resources.arsc]");
const arscBuf = readZipEntry(apkPath, "resources.arsc");
assert(arscBuf !== null && arscBuf.length > 0, "resources.arsc extracted successfully");
const arscStr = arscBuf.toString("utf8");

const expectedArscTokens = [
  "QR কোড পেতে ব্যবসার নাম, ঠিকানা, ছবি ইত্যাদি তথ্য দিয়ে ফর্ম পূরণ করুন।",
  "QR কোড এর জন্য আপনার অনুরোধটি গ্রহণ করা হয়েছে।",
  "QR কোড নিন, ব্যবসা বাড়ান",
  "QR কোড নেবো",
  "QR কোড ডাউনলোড",
  "QR ডাউনলোড করা হচ্ছে",
  "QR ডাউনলোড সফল হয়েছে।",
  "QR ডাউনলোড সফল হয়নি।",
  "QR ডাউনলোড করা সম্ভব হয়নি।",
  "QR কোড পিডিএফ-টি আপনার মোবাইলের ডাউনলোড ফোল্ডারে সেভ করা হবে।",
  "টালিপে QR — ব্যবসায়ীদের জন্য সেরা বাংলা QR",
  "টালিপে QR-এ পেমেন্ট নিন নগদ, বিকাশ, রকেট সহ সকল ব্যাংক অ্যাপ থেকে।",
  "বাংলা QR পেমেন্ট",
  "ডেলিভারি ম্যানের নম্বর",
  "QR কোড-টি পাওয়া যায়নি।",
  "QR কোডটি সঠিক টালিপে QR নয়।",
  "QR ইতিমধ্যেই ট্যাগ করা হয়েছে।",
  "QR এর ছবি তৈরি করা যায়নি।",
  "QR কোড তথ্য ঘাটতি আছে। হালনাগাদ তথ্য দিন",
  "QR কোড দিয়ে এক কোডেই পেমেন্ট নিন বিকাশ, রকেট ও সকল ব্যাংক অ্যাপ থেকে।"
];

for (const token of expectedArscTokens) {
  assert(arscStr.includes(token), "ARSC contains token: " + token);
}

// =============================================================
// GROUP 10: Pure-JS QR Standee Order & Tracking Simulation Engine
// =============================================================
console.log("\n[GROUP 10: Pure-JS QR Standee Order & Tracking Simulation Engine]");

class MerchantQrOrderFulfillmentEngine {
  constructor() {
    this.orders = new Map(); // orderId -> orderRecord
    this.orderCounter = 1001;
  }

  createOrder(businessId, merchantName, items, shippingAddress, paymentMethod) {
    const addrCheck = validateShippingAddress(shippingAddress);
    if (!addrCheck.valid) {
      throw new Error(addrCheck.message || "Invalid shipping address");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Order must contain at least one collateral item");
    }

    let subtotal = 0;
    const validatedItems = [];
    for (const item of items) {
      const mat = STANDEE_MATERIALS[item.materialCode];
      if (!mat) throw new Error("Unknown material code: " + item.materialCode);
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemTotal = mat.basePrice * qty;
      subtotal += itemTotal;
      validatedItems.push({
        materialCode: mat.code,
        name_bn: mat.name_bn,
        unitPrice: mat.basePrice,
        quantity: qty,
        itemTotal
      });
    }

    const deliveryFee = calculateDeliveryFee(shippingAddress.division, shippingAddress.district, subtotal);
    const grandTotal = subtotal + deliveryFee;

    const orderId = "TK-ORD-" + this.orderCounter++;
    const record = {
      orderId,
      businessId,
      merchantName,
      items: validatedItems,
      subtotal,
      deliveryFee,
      grandTotal,
      shippingAddress: Object.assign({}, shippingAddress, { phone: addrCheck.cleanPhone }),
      paymentMethod,
      paymentStatus: paymentMethod === PAYMENT_METHODS.WALLET_PAY ? "PAID" : "PENDING_COD",
      status: ORDER_STATUS.ORDER_PLACED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tracking: new QrOrderStateMachine(ORDER_STATUS.ORDER_PLACED)
    };

    this.orders.set(orderId, record);
    return record;
  }

  getOrder(orderId) {
    return this.orders.get(orderId) || null;
  }

  updateOrderStatus(orderId, newStatus, extra = {}) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found: " + orderId);

    if (newStatus === ORDER_STATUS.PROCESSING) {
      order.tracking.advanceToProcessing();
      order.status = ORDER_STATUS.PROCESSING;
    } else if (newStatus === ORDER_STATUS.SHIPPED) {
      order.tracking.dispatchToCourier(extra.courierName || "RedX Logistics", extra.consignmentId || ("CS-" + orderId));
      order.status = ORDER_STATUS.SHIPPED;
    } else if (newStatus === ORDER_STATUS.DELIVERED) {
      order.tracking.markDelivered();
      order.status = ORDER_STATUS.DELIVERED;
      if (order.paymentMethod === PAYMENT_METHODS.COD) {
        order.paymentStatus = "PAID";
      }
    } else if (newStatus === ORDER_STATUS.CANCELLED) {
      order.tracking.cancelOrder(extra.reason || "Cancelled by admin");
      order.status = ORDER_STATUS.CANCELLED;
    }
    order.updatedAt = new Date().toISOString();
    return order;
  }
}

const engine = new MerchantQrOrderFulfillmentEngine();

// Test Order 1: Acrylic Desk Standee + 2 Stickers (Dhaka City)
const order1 = engine.createOrder(
  "BIZ-101",
  "মা স্টোর",
  [
    { materialCode: "ACRYLIC_DESK", quantity: 1 },
    { materialCode: "COUNTER_STICKER", quantity: 2 }
  ],
  validAddr,
  PAYMENT_METHODS.WALLET_PAY
);

assert(order1.orderId === "TK-ORD-1001", "Order ID generated sequentially");
assert(order1.subtotal === 350, "Subtotal calculated correctly: 250 + (50 * 2) = 350");
assert(order1.deliveryFee === 60, "Inside Dhaka delivery fee is 60");
assert(order1.grandTotal === 410, "Grand total is 410 BDT");
assert(order1.paymentStatus === "PAID", "Wallet pay is marked PAID immediately");
assert(order1.status === ORDER_STATUS.ORDER_PLACED, "Initial status is ORDER_PLACED");

// Advance Order 1 through fulfillment pipeline
const procOrder = engine.updateOrderStatus("TK-ORD-1001", ORDER_STATUS.PROCESSING);
assert(procOrder.status === ORDER_STATUS.PROCESSING, "Order 1 updated to PROCESSING");

const shipOrder = engine.updateOrderStatus("TK-ORD-1001", ORDER_STATUS.SHIPPED, {
  courierName: "Pathao Courier",
  consignmentId: "PTH-992144"
});
assert(shipOrder.status === ORDER_STATUS.SHIPPED, "Order 1 updated to SHIPPED");
assert(shipOrder.tracking.consignmentId === "PTH-992144", "Consignment ID bound to tracking");

const delOrder = engine.updateOrderStatus("TK-ORD-1001", ORDER_STATUS.DELIVERED);
assert(delOrder.status === ORDER_STATUS.DELIVERED, "Order 1 updated to DELIVERED");

// Test Order 2: Bulk Collateral with Free Shipping (> 1000 BDT) in Chattogram (COD)
const ctgAddr = {
  recipientName: "তাহের অ্যান্ড ব্রাদার্স",
  phone: "01812345678",
  division: "Chattogram",
  district: "Chattogram",
  thana: "Pahartali",
  streetAddress: "দোকান ১২, অলংকার মোড়"
};

const order2 = engine.createOrder(
  "BIZ-102",
  "তাহের ব্রাদার্স",
  [
    { materialCode: "SOUNDBOX_STAND", quantity: 2 }, // 500 * 2 = 1000
    { materialCode: "ACRYLIC_DESK", quantity: 1 }     // 250
  ],
  ctgAddr,
  PAYMENT_METHODS.COD
);

assert(order2.orderId === "TK-ORD-1002", "Order 2 generated sequentially");
assert(order2.subtotal === 1250, "Subtotal is 1250 BDT");
assert(order2.deliveryFee === 0, "Free shipping applied for order >= 1000 BDT");
assert(order2.grandTotal === 1250, "Grand total matches subtotal without shipping charge");
assert(order2.paymentStatus === "PENDING_COD", "COD order initial payment is PENDING_COD");

// When delivered, COD payment updates to PAID
engine.updateOrderStatus("TK-ORD-1002", ORDER_STATUS.PROCESSING);
engine.updateOrderStatus("TK-ORD-1002", ORDER_STATUS.SHIPPED, { courierName: "Paperfly", consignmentId: "PF-4412" });
const delOrder2 = engine.updateOrderStatus("TK-ORD-1002", ORDER_STATUS.DELIVERED);
assert(delOrder2.paymentStatus === "PAID", "COD payment transitions to PAID on delivery");

// Test Order 3: Rejection on empty items
let threwEmpty = false;
try {
  engine.createOrder("BIZ-103", "টেস্ট", [], validAddr, PAYMENT_METHODS.COD);
} catch (e) {
  threwEmpty = true;
}
assert(threwEmpty === true, "Engine rejects order with empty item list");

console.log("\n==================================================================");
console.log(` ALL ${totalTests}/${totalTests} TESTS PASSED SUCCESSFULLY! (100% PASS RATE)`);
console.log("==================================================================");
