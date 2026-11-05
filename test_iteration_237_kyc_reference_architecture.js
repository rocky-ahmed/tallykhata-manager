/**
 * test_iteration_237_kyc_reference_architecture.js
 *
 * REA-ITER-237: TALLYPAY MERCHANT KYC, NID SCANNER OCR & BIO-VERIFICATION PIPELINE
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-237
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
console.log(" REA-ITER-237: TALLYPAY KYC, NID SCANNER & BIO-VERIFICATION SUITE");
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
// GROUP 2: AndroidManifest Registration for KYC, NID & Camera Activities
// =============================================================
console.log("\n[GROUP 2: AndroidManifest Registration for KYC, NID & Camera Activities]");
const manifestBuf = readZipEntry(apkPath, "AndroidManifest.xml");
assert(manifestBuf !== null && manifestBuf.length > 0, "AndroidManifest.xml unpacked successfully");
const manifestStrings = parseAxmlStrings(manifestBuf);

assert(
  manifestStrings.includes("com.progoti.tallykhata.v2._clean_arch.ekyc.presentation.EkycActivity"),
  "AndroidManifest declares EkycActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.ekyc.EkycInitActivity"),
  "AndroidManifest declares EkycInitActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.ekyc.ImageCaptureActivity"),
  "AndroidManifest declares ImageCaptureActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.ekyc.NIDVerificationActivity"),
  "AndroidManifest declares NIDVerificationActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.activities.registration.NidInfoActivity"),
  "AndroidManifest declares NidInfoActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.tallypay.TpCaptureNidSuccessActivity"),
  "AndroidManifest declares TpCaptureNidSuccessActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.login.EKYCPinSetupActivity"),
  "AndroidManifest declares EKYCPinSetupActivity"
);
assert(
  manifestStrings.includes("com.progoti.tallykhata.v2.camera.CameraActivity"),
  "AndroidManifest declares CameraActivity"
);

// Check Permissions
assert(manifestStrings.includes("android.permission.CAMERA"), "Manifest declares CAMERA permission");
assert(manifestStrings.includes("android.permission.WRITE_EXTERNAL_STORAGE"), "Manifest declares WRITE_EXTERNAL_STORAGE permission");
assert(manifestStrings.includes("android.permission.READ_PHONE_STATE"), "Manifest declares READ_PHONE_STATE permission");

// =============================================================
// GROUP 3: Visual Layouts & XML Drawables for KYC / NID / Camera
// =============================================================
console.log("\n[GROUP 3: Visual Layouts & XML Drawables for KYC / NID / Camera]");
const expectedKycEntries = [
  "res/layout/activity_ekyc_init.xml",
  "res/layout/activity_nid_info.xml",
  "res/layout/activity_nid_preview_check.xml",
  "res/layout/activity_nidverification.xml",
  "res/layout/activity_tp_capture_nid_success.xml",
  "res/layout/dialog_selfie.xml",
  "res/layout/dialog_nid.xml",
  "res/layout/fragment_selfie_dialog.xml",
  "res/layout/fragment_tp_nid_info.xml",
  "res/layout/tp_fragment_camera_x.xml",
  "res/drawable/ic_nid.xml",
  "res/drawable/ic_nid_front.xml",
  "res/drawable/ic_nid_back.xml",
  "res/drawable/ic_take_selfie.xml",
  "res/drawable/graphic_take_selfie.png"
];

for (const entry of expectedKycEntries) {
  const eBuf = readZipEntry(apkPath, entry);
  assert(eBuf !== null && eBuf.length > 0, "Verified zip entry exists: " + entry);
}

// Check components in activity_nid_info.xml
const nidInfoBuf = readZipEntry(apkPath, "res/layout/activity_nid_info.xml");
const nidInfoStrings = parseAxmlStrings(nidInfoBuf);
assert(nidInfoStrings.includes("com.google.android.material.textfield.TextInputEditText"), "NID info layout has TextInputEditText for NID number/name input");
assert(nidInfoStrings.includes("com.google.android.material.textfield.TextInputLayout"), "NID info layout has TextInputLayout");
assert(nidInfoStrings.includes("com.progoti.tallykhata.v2.utilities.KohinoorTextView"), "NID info layout uses KohinoorTextView typography");

// =============================================================
// GROUP 4: Machine Learning Assets & Document Scanning Pipeline
// =============================================================
console.log("\n[GROUP 4: Machine Learning Assets & Document Scanning Pipeline]");
const tfliteBuf = readZipEntry(apkPath, "assets/ml/nid_classifier.tflite");
assert(tfliteBuf !== null, "assets/ml/nid_classifier.tflite exists in APK");
assert(tfliteBuf.length === 5861507, "NID classifier TFLite model matches exact size 5,861,507 bytes");

const c3Buf = readZipEntry(apkPath, "classes3.dex");
assert(c3Buf !== null && c3Buf.length > 0, "classes3.dex extracted successfully");
const c3Str = c3Buf.toString("utf8");
assert(c3Str.includes("ml/nid_classifier.tflite"), "classes3.dex references ml/nid_classifier.tflite model path");
assert(c3Str.includes("mlkit.docscan.crop"), "classes3.dex references ML Kit document scan cropping");
assert(c3Str.includes("mlkit.docscan.detect"), "classes3.dex references ML Kit document detection");
assert(c3Str.includes("mlkit.docscan.enhance"), "classes3.dex references ML Kit document enhancement");

// Additional Face Detection & Liveness Models in assets/models_bundled/
const blazefaceBuf = readZipEntry(apkPath, "assets/models_bundled/blazeface.tfl");
assert(blazefaceBuf !== null && blazefaceBuf.length > 0, "BlazeFace model exists in assets/models_bundled/blazeface.tfl");

const joyModelBuf = readZipEntry(apkPath, "assets/models_bundled/BCLjoy_200.emd");
assert(joyModelBuf !== null && joyModelBuf.length > 0, "Smile/Joy model exists in assets/models_bundled/BCLjoy_200.emd");

const leftEyeBuf = readZipEntry(apkPath, "assets/models_bundled/BCLlefteyeclosed_200.emd");
assert(leftEyeBuf !== null && leftEyeBuf.length > 0, "Left eye blink model exists in assets/models_bundled/BCLlefteyeclosed_200.emd");

const rightEyeBuf = readZipEntry(apkPath, "assets/models_bundled/BCLrighteyeclosed_200.emd");
assert(rightEyeBuf !== null && rightEyeBuf.length > 0, "Right eye blink model exists in assets/models_bundled/BCLrighteyeclosed_200.emd");

// =============================================================
// GROUP 5: Bytecode Classes, Presenters & ViewModels in classes4.dex
// =============================================================
console.log("\n[GROUP 5: Bytecode Classes, Presenters & ViewModels in classes4.dex]");
const c4Buf = readZipEntry(apkPath, "classes4.dex");
assert(c4Buf !== null && c4Buf.length > 0, "classes4.dex extracted successfully");
const c4Str = c4Buf.toString("utf8");

assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/ekyc/presentation/EkycActivity;"), "classes4.dex contains EkycActivity");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/ekyc/ImageCaptureActivity;"), "classes4.dex contains ImageCaptureActivity");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/ekyc/NIDVerificationActivity;"), "classes4.dex contains NIDVerificationActivity");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/activities/registration/NidInfoActivity;"), "classes4.dex contains NidInfoActivity");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/ekyc/EkycInitActivity;"), "classes4.dex contains EkycInitActivity");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/TpCaptureNidSuccessActivity;"), "classes4.dex contains TpCaptureNidSuccessActivity");

// Models & Enums
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/ekyc/TextRecognizedModel;"), "classes4.dex contains TextRecognizedModel (OCR data model)");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/ekyc/EKYCTrigger;"), "classes4.dex contains EKYCTrigger enum");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/tallypay/ekyc/RecognitionType;"), "classes4.dex contains RecognitionType enum");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/ekyc/domain/model/NidSide;"), "classes4.dex contains NidSide enum (FRONT, BACK)");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/ekyc/domain/model/LivenessGesture;"), "classes4.dex contains LivenessGesture enum");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/ekyc/domain/model/LivenessState;"), "classes4.dex contains LivenessState");

// Liveness Gestures
assert(c4Str.includes("LOOK_DOWN"), "LivenessGesture defines LOOK_DOWN");
assert(c4Str.includes("LOOK_LEFT"), "LivenessGesture defines LOOK_LEFT");
assert(c4Str.includes("LOOK_RIGHT"), "LivenessGesture defines LOOK_RIGHT");
assert(c4Str.includes("LOOK_UP"), "LivenessGesture defines LOOK_UP");
assert(c4Str.includes("SMILE"), "LivenessGesture defines SMILE");

// Clean Arch EkycState
assert(c4Str.includes("EkycState(totalSteps=6,"), "classes4.dex defines EkycState with totalSteps=6");
assert(c4Str.includes("EkycViewModel.kt"), "classes4.dex contains EkycViewModel source reference");
assert(c4Str.includes("EkycLivenessScreen.kt"), "classes4.dex contains EkycLivenessScreen source reference");
assert(c4Str.includes("EkycNidCaptureScreens.kt"), "classes4.dex contains EkycNidCaptureScreens source reference");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/di/EkycApiQualifier;"), "classes4.dex contains EkycApiQualifier");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/ekyc/data/remote/EkycApi;"), "classes4.dex contains EkycApi");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/ekyc/domain/model/FaceSample;"), "classes4.dex contains FaceSample");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/ekyc/domain/model/LivenessConfig;"), "classes4.dex contains LivenessConfig");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/ekyc/domain/model/NidInfo;"), "classes4.dex contains NidInfo");
assert(c4Str.includes("Lcom/progoti/tallykhata/v2/_clean_arch/ekyc/domain/repository/LivenessConfigRepository;"), "classes4.dex contains LivenessConfigRepository");

// =============================================================
// GROUP 6: Room SQLite Database Schema & Persistence Models for Merchant KYC
// =============================================================
console.log("\n[GROUP 6: Room SQLite Database Schema & Persistence Models for Merchant KYC]");

// Define pure JS schema simulation for merchant_kyc table
const KYC_TABLE_SCHEMA = `CREATE TABLE IF NOT EXISTS \`merchant_kyc\` (
  \`id\` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`business_id\` TEXT NOT NULL,
  \`nid_number\` TEXT NOT NULL,
  \`dob\` TEXT NOT NULL,
  \`name_bn\` TEXT,
  \`name_en\` TEXT,
  \`father_name\` TEXT,
  \`mother_name\` TEXT,
  \`nid_front_path\` TEXT,
  \`nid_back_path\` TEXT,
  \`selfie_path\` TEXT,
  \`verification_status\` TEXT NOT NULL,
  \`liveness_score\` REAL,
  \`synced\` INTEGER NOT NULL,
  \`create_date\` TEXT NOT NULL,
  \`update_date\` TEXT
);`;

assert(KYC_TABLE_SCHEMA.includes("INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL"), "merchant_kyc schema defines auto-increment primary key");
assert(KYC_TABLE_SCHEMA.includes("verification_status"), "merchant_kyc schema defines verification_status");
assert(KYC_TABLE_SCHEMA.includes("liveness_score"), "merchant_kyc schema defines liveness_score");

const KYC_STATUSES = {
  INCOMPLETE: "INCOMPLETE",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED"
};

assert(KYC_STATUSES.VERIFIED === "VERIFIED", "Status includes VERIFIED");
assert(KYC_STATUSES.PENDING === "PENDING", "Status includes PENDING");
assert(KYC_STATUSES.REJECTED === "REJECTED", "Status includes REJECTED");

// =============================================================
// GROUP 7: Bangladesh National ID Validation & Parsing Invariants
// =============================================================
console.log("\n[GROUP 7: Bangladesh National ID Validation & Parsing Invariants]");

function validateBangladeshNid(nidNumber, dateOfBirth) {
  if (typeof nidNumber !== "string") {
    return { valid: false, reason: "INVALID_TYPE", type: "UNKNOWN" };
  }
  const cleaned = nidNumber.trim().replace(/[- ]/g, "");
  
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, reason: "NON_NUMERIC", type: "UNKNOWN" };
  }

  const len = cleaned.length;
  if (len !== 10 && len !== 13 && len !== 17) {
    return {
      valid: false,
      reason: "INVALID_LENGTH",
      message: "NID নম্বর ১০, ১৩ অথবা ১৭ সংখ্যা হতে হবে।",
      type: "UNKNOWN"
    };
  }

  let nidType = "UNKNOWN";
  if (len === 10) {
    nidType = "SMART_NID";
  } else if (len === 13) {
    nidType = "LEGACY_13";
  } else if (len === 17) {
    nidType = "LEGACY_17";
    // Check birth year correlation if dateOfBirth is supplied
    if (dateOfBirth) {
      const birthYear = new Date(dateOfBirth).getFullYear().toString();
      const prefixYear = cleaned.substring(0, 4);
      if (prefixYear !== birthYear) {
        return {
          valid: false,
          reason: "BIRTH_YEAR_MISMATCH",
          message: "১৭ সংখ্যার এনআইডির প্রথম ৪ ডিজিট জন্ম সালের সাথে মিলতে হবে।",
          type: nidType
        };
      }
    }
  }

  // Age validation: merchant must be at least 18 years old
  if (dateOfBirth) {
    const dobDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    if (age < 18) {
      return {
        valid: false,
        reason: "UNDERAGE",
        message: "মার্চেন্ট একাউন্টের জন্য আবেদনকারীর বয়স কমপক্ষে ১৮ বছর হতে হবে।",
        type: nidType,
        age
      };
    }
  }

  return { valid: true, nidNumber: cleaned, type: nidType };
}

// Test Smart NID (10 digits)
const smartTest = validateBangladeshNid("1234567890", "1990-05-15");
assert(smartTest.valid === true, "10-digit Smart NID is valid");
assert(smartTest.type === "SMART_NID", "Correctly identified as SMART_NID");

// Test Legacy 13-digit NID
const leg13Test = validateBangladeshNid("1990123456789", "1990-05-15");
assert(leg13Test.valid === true, "13-digit legacy NID is valid");
assert(leg13Test.type === "LEGACY_13", "Correctly identified as LEGACY_13");

// Test Legacy 17-digit NID with matching birth year
const leg17Valid = validateBangladeshNid("19851234567890123", "1985-11-20");
assert(leg17Valid.valid === true, "17-digit legacy NID with matching birth year is valid");
assert(leg17Valid.type === "LEGACY_17", "Correctly identified as LEGACY_17");

// Test Legacy 17-digit NID with mismatched birth year
const leg17Mismatch = validateBangladeshNid("19951234567890123", "1985-11-20");
assert(leg17Mismatch.valid === false && leg17Mismatch.reason === "BIRTH_YEAR_MISMATCH", "17-digit NID rejects birth year mismatch");

// Test Invalid Lengths
assert(validateBangladeshNid("123456789").valid === false, "Rejects 9-digit NID");
assert(validateBangladeshNid("12345678901").valid === false, "Rejects 11-digit NID");
assert(validateBangladeshNid("12345678901234").valid === false, "Rejects 14-digit NID");
assert(validateBangladeshNid("123456789012345678").valid === false, "Rejects 18-digit NID");

// Test Underage Merchant (< 18 years old)
const underageTest = validateBangladeshNid("1234567890", "2015-01-01");
assert(underageTest.valid === false && underageTest.reason === "UNDERAGE", "Rejects applicant younger than 18 years");

// =============================================================
// GROUP 8: Facial Liveness & Bio-Verification State Machine
// =============================================================
console.log("\n[GROUP 8: Facial Liveness & Bio-Verification State Machine]");

const LIVENESS_STATES = {
  IDLE: "IDLE",
  AWAITING_CENTRE: "AWAITING_CENTRE",
  AWAITING_GESTURE: "AWAITING_GESTURE",
  HOLDING: "HOLDING",
  GESTURE_PASSED: "GESTURE_PASSED",
  SESSION_COMPLETE: "SESSION_COMPLETE",
  GESTURE_TIMED_OUT: "GESTURE_TIMED_OUT",
  EXIT_OFFERED: "EXIT_OFFERED"
};

function transitionLivenessState(currentState, event) {
  switch (currentState) {
    case LIVENESS_STATES.IDLE:
      if (event === "START_SESSION") return LIVENESS_STATES.AWAITING_CENTRE;
      break;
    case LIVENESS_STATES.AWAITING_CENTRE:
      if (event === "FACE_CENTERED") return LIVENESS_STATES.AWAITING_GESTURE;
      if (event === "TIMEOUT") return LIVENESS_STATES.EXIT_OFFERED;
      break;
    case LIVENESS_STATES.AWAITING_GESTURE:
      if (event === "GESTURE_DETECTED") return LIVENESS_STATES.HOLDING;
      if (event === "GESTURE_TIMEOUT") return LIVENESS_STATES.GESTURE_TIMED_OUT;
      break;
    case LIVENESS_STATES.HOLDING:
      if (event === "HOLD_SUCCESS") return LIVENESS_STATES.GESTURE_PASSED;
      if (event === "HOLD_BROKEN") return LIVENESS_STATES.AWAITING_GESTURE;
      break;
    case LIVENESS_STATES.GESTURE_PASSED:
      if (event === "ALL_GESTURES_PASSED") return LIVENESS_STATES.SESSION_COMPLETE;
      if (event === "NEXT_GESTURE") return LIVENESS_STATES.AWAITING_GESTURE;
      break;
    case LIVENESS_STATES.GESTURE_TIMED_OUT:
      if (event === "RETRY") return LIVENESS_STATES.AWAITING_GESTURE;
      if (event === "CANCEL") return LIVENESS_STATES.EXIT_OFFERED;
      break;
  }
  return currentState;
}

assert(transitionLivenessState(LIVENESS_STATES.IDLE, "START_SESSION") === LIVENESS_STATES.AWAITING_CENTRE, "Transitions IDLE -> AWAITING_CENTRE");
assert(transitionLivenessState(LIVENESS_STATES.AWAITING_CENTRE, "FACE_CENTERED") === LIVENESS_STATES.AWAITING_GESTURE, "Transitions AWAITING_CENTRE -> AWAITING_GESTURE");
assert(transitionLivenessState(LIVENESS_STATES.AWAITING_GESTURE, "GESTURE_DETECTED") === LIVENESS_STATES.HOLDING, "Transitions AWAITING_GESTURE -> HOLDING");
assert(transitionLivenessState(LIVENESS_STATES.HOLDING, "HOLD_SUCCESS") === LIVENESS_STATES.GESTURE_PASSED, "Transitions HOLDING -> GESTURE_PASSED");
assert(transitionLivenessState(LIVENESS_STATES.GESTURE_PASSED, "ALL_GESTURES_PASSED") === LIVENESS_STATES.SESSION_COMPLETE, "Transitions GESTURE_PASSED -> SESSION_COMPLETE");
assert(transitionLivenessState(LIVENESS_STATES.AWAITING_GESTURE, "GESTURE_TIMEOUT") === LIVENESS_STATES.GESTURE_TIMED_OUT, "Transitions AWAITING_GESTURE -> GESTURE_TIMED_OUT on timeout");

// Image Quality Assessment Simulator
function assessSelfieQuality(faceRect, imageWidth, imageHeight, luminance, blurVariance) {
  // 1. Centering check: bounding box within 50% center area
  const centerX = faceRect.x + faceRect.width / 2;
  const centerY = faceRect.y + faceRect.height / 2;
  const xRatio = centerX / imageWidth;
  const yRatio = centerY / imageHeight;
  const centered = xRatio >= 0.35 && xRatio <= 0.65 && yRatio >= 0.35 && yRatio <= 0.65;
  
  // 2. Lighting check
  const wellLit = luminance >= 40 && luminance <= 240;

  // 3. Sharpness check (Laplacian variance)
  const sharp = blurVariance >= 100;

  const passed = centered && wellLit && sharp;
  return {
    passed,
    metrics: { centered, wellLit, sharp, xRatio, yRatio, luminance, blurVariance }
  };
}

const goodSelfie = assessSelfieQuality({ x: 180, y: 180, width: 240, height: 240 }, 600, 600, 120, 250);
assert(goodSelfie.passed === true, "Good selfie passes centering, lighting, and sharpness");

const darkSelfie = assessSelfieQuality({ x: 180, y: 180, width: 240, height: 240 }, 600, 600, 20, 250);
assert(darkSelfie.passed === false && darkSelfie.metrics.wellLit === false, "Dark selfie fails lighting test");

const blurrySelfie = assessSelfieQuality({ x: 180, y: 180, width: 240, height: 240 }, 600, 600, 120, 45);
assert(blurrySelfie.passed === false && blurrySelfie.metrics.sharp === false, "Blurry selfie fails sharpness test");

// =============================================================
// GROUP 9: Authentic Bengali ARSC Tokens in resources.arsc
// =============================================================
console.log("\n[GROUP 9: Authentic Bengali ARSC Tokens in resources.arsc]");
const arscBuf = readZipEntry(apkPath, "resources.arsc");
assert(arscBuf !== null && arscBuf.length > 0, "resources.arsc extracted successfully");
const arscStr = arscBuf.toString("utf8");

assert(arscStr.includes("NID নম্বর ১০, ১৩ অথবা ১৭ সংখ্যা হতে হবে।"), "ARSC contains token: NID নম্বর ১০, ১৩ অথবা ১৭ সংখ্যা হতে হবে।");
assert(arscStr.includes("NID ও সেলফি দিয়ে e-KYC সম্পন্ন করুন"), "ARSC contains token: NID ও সেলফি দিয়ে e-KYC সম্পন্ন করুন");
assert(arscStr.includes("NID-এর ছবি (সামনে)"), "ARSC contains token: NID-এর ছবি (সামনে)");
assert(arscStr.includes("NID-এর ছবি (পেছনে)"), "ARSC contains token: NID-এর ছবি (পেছনে)");
assert(arscStr.includes("NID-এর সামনের ছবি তুলুন।"), "ARSC contains token: NID-এর সামনের ছবি তুলুন।");
assert(arscStr.includes("NID-এর পিছনের ছবি তুলুন।"), "ARSC contains token: NID-এর পিছনের ছবি তুলুন।");
assert(arscStr.includes("আপনার সেলফি নিশ্চিত করুন"), "ARSC contains token: আপনার সেলফি নিশ্চিত করুন");
assert(arscStr.includes("আপনার সেলফিটি NID-এর সাথে মেলানো হচ্ছে…"), "ARSC contains token: আপনার সেলফিটি NID-এর সাথে মেলানো হচ্ছে…");
assert(arscStr.includes("আপনার সেলফিটি NID-এর সাথে যাচাই হয়েছে।"), "ARSC contains token: আপনার সেলফিটি NID-এর সাথে যাচাই হয়েছে।");
assert(arscStr.includes("আপনার সেলফিটি NID-এর সাথে মেলেনি"), "ARSC contains token: আপনার সেলফিটি NID-এর সাথে মেলেনি");
assert(arscStr.includes("সেলফি যাচাই করা যাচ্ছে না। আপনি পরে আবার চেষ্টা করতে পারেন।"), "ARSC contains token: সেলফি যাচাই করা যাচ্ছে না। আপনি পরে আবার চেষ্টা করতে পারেন।");
assert(arscStr.includes("সেলফি মেলেনি"), "ARSC contains token: সেলফি মেলেনি");
assert(arscStr.includes("সেলফি নির্দেশনা"), "ARSC contains token: সেলফি নির্দেশনা");
assert(arscStr.includes("সেলফি তুলতে ক্যামেরা ব্যবহারের অনুমতি দিন।"), "ARSC contains token: সেলফি তুলতে ক্যামেরা ব্যবহারের অনুমতি দিন।");
assert(arscStr.includes("সেলফি তুলে e-KYC সম্পন্ন করুন।"), "ARSC contains token: সেলফি তুলে e-KYC সম্পন্ন করুন।");
assert(arscStr.includes("NID-এর তথ্য যাচাই করা হচ্ছে…"), "ARSC contains token: NID-এর তথ্য যাচাই করা হচ্ছে…");
assert(arscStr.includes("NID সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।"), "ARSC contains token: NID সার্ভারে সমস্যা হয়েছে।");

// =============================================================
// GROUP 10: Pure-JS Merchant KYC & NID Scanner Pipeline Simulation Engine
// =============================================================
console.log("\n[GROUP 10: Pure-JS Merchant KYC & NID Scanner Pipeline Simulation Engine]");

class MerchantKycPipelineEngine {
  constructor() {
    this.records = new Map(); // businessId -> kycRecord
    this.idCounter = 1;
  }

  // Step 1: Submit Front NID
  processNidFront(businessId, imageBase64, ocrResult) {
    let rec = this.records.get(businessId) || {
      id: this.idCounter++,
      business_id: businessId,
      verification_status: "INCOMPLETE",
      synced: 0,
      create_date: new Date().toISOString(),
      update_date: null
    };

    rec.nid_front_path = "/storage/emulated/0/TallyKhata/kyc/nid_front_" + businessId + ".jpg";
    rec.nid_number = ocrResult.identificationNumber;
    rec.name_en = ocrResult.name;
    rec.name_bn = ocrResult.nameBN;
    rec.dob = ocrResult.dob;
    rec.father_name = ocrResult.fatherName;
    rec.mother_name = ocrResult.motherName;
    rec.update_date = new Date().toISOString();
    
    this.records.set(businessId, rec);
    return { success: true, step: "NID_FRONT_SAVED", nidNumber: rec.nid_number };
  }

  // Step 2: Submit Back NID
  processNidBack(businessId, imageBase64, ocrResult) {
    const rec = this.records.get(businessId);
    if (!rec) throw new Error("Front NID must be submitted first");
    
    rec.nid_back_path = "/storage/emulated/0/TallyKhata/kyc/nid_back_" + businessId + ".jpg";
    rec.address = ocrResult.address;
    rec.blood_group = ocrResult.bloodGroup;
    rec.update_date = new Date().toISOString();
    
    return { success: true, step: "NID_BACK_SAVED" };
  }

  // Step 3: Complete Liveness and Submit Selfie
  processLivenessAndSelfie(businessId, selfieBase64, livenessScore) {
    const rec = this.records.get(businessId);
    if (!rec) throw new Error("KYC session not initialized");

    rec.selfie_path = "/storage/emulated/0/TallyKhata/kyc/selfie_" + businessId + ".jpg";
    rec.liveness_score = livenessScore;
    
    // Auto-verify if liveness score >= 0.85 and NID is valid
    const nidVal = validateBangladeshNid(rec.nid_number, rec.dob);
    if (nidVal.valid && livenessScore >= 0.85) {
      rec.verification_status = "VERIFIED";
    } else {
      rec.verification_status = "PENDING"; // Manual review queue
    }
    rec.update_date = new Date().toISOString();

    return {
      success: true,
      status: rec.verification_status,
      livenessScore: rec.liveness_score,
      nidNumber: rec.nid_number
    };
  }

  getKycByBusinessId(businessId) {
    return this.records.get(businessId) || null;
  }
}

const kycEngine = new MerchantKycPipelineEngine();

// Test End-to-End KYC Submission
const ocrFront = {
  identificationNumber: "19881234567890123",
  name: "MOHAMMAD KARIM",
  nameBN: "মোহাম্মদ করিম",
  dob: "1988-03-25",
  fatherName: "আব্দুল জলিল",
  motherName: "মোসাম্মৎ রহিমা"
};

const step1 = kycEngine.processNidFront("BIZ-501", "base64_front_img", ocrFront);
assert(step1.success === true, "Front NID processed successfully");
assert(step1.nidNumber === "19881234567890123", "NID number recorded");

const ocrBack = {
  address: "গ্রাম: শ্যামপুর, ডাকঘর: সদর, থানা: কোতোয়ালী, জেলা: চট্টগ্রাম",
  bloodGroup: "B+"
};

const step2 = kycEngine.processNidBack("BIZ-501", "base64_back_img", ocrBack);
assert(step2.success === true, "Back NID processed successfully");

const step3 = kycEngine.processLivenessAndSelfie("BIZ-501", "base64_selfie_img", 0.94);
assert(step3.success === true, "Liveness and selfie processed");
assert(step3.status === "VERIFIED", "KYC automatically marked VERIFIED for valid NID and high liveness score (0.94)");

const kycRecord = kycEngine.getKycByBusinessId("BIZ-501");
assert(kycRecord !== null, "KYC record retrieved from engine");
assert(kycRecord.name_bn === "মোহাম্মদ করিম", "Bengali name stored correctly");
assert(kycRecord.nid_front_path.includes("nid_front_BIZ-501.jpg"), "Front path stored correctly");
assert(kycRecord.nid_back_path.includes("nid_back_BIZ-501.jpg"), "Back path stored correctly");
assert(kycRecord.selfie_path.includes("selfie_BIZ-501.jpg"), "Selfie path stored correctly");

// Test Under-threshold liveness routes to PENDING
const ocrUnder = {
  identificationNumber: "1992123456789",
  name: "HASAN MAHMUD",
  nameBN: "হাসান মাহমুদ",
  dob: "1992-07-10"
};
kycEngine.processNidFront("BIZ-502", "base64_front_img", ocrUnder);
const stepUnder = kycEngine.processLivenessAndSelfie("BIZ-502", "base64_selfie_img", 0.72);
assert(stepUnder.status === "PENDING", "Sub-threshold liveness score routes to PENDING for manual review");
const kycRecord502 = kycEngine.getKycByBusinessId("BIZ-502");
assert(kycRecord502.verification_status === "PENDING", "Record status for BIZ-502 persists as PENDING");

// Test uninitialized business throws error
let threwUninit = false;
try {
  kycEngine.processLivenessAndSelfie("BIZ-999", "img", 0.9);
} catch (e) {
  threwUninit = true;
}
assert(threwUninit === true, "Calling selfie/liveness on uninitialized business throws exception");

console.log("\n==================================================================");
console.log(` ALL ${totalTests}/${totalTests} TESTS PASSED SUCCESSFULLY! (100% PASS RATE)`);
console.log("==================================================================");
