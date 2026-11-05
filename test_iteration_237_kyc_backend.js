/**
 * ============================================================================
 * TEST SUITE: Milestone REA-ITER-237 — TallyPay Merchant KYC, NID Scanner OCR
 * & Bio-Verification Pipeline Backend Suite
 * ============================================================================
 * Worker: Worker 2 (Averroes / Peirce - Permanent Backend Developer & Business Logic)
 * Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 * Milestone: REA-ITER-237
 *
 * Verification coverage:
 * - Group 1: Enums, Constants & Room SQLite Schema Invariants
 * - Group 2: Bangladesh National ID (NID) Validation Engine
 * - Group 3: OCR Field Extractor & Bengali Digit Normalization
 * - Group 4: Facial Liveness State Machine & Quality Pre-Gates
 * - Group 5: Bio-Verification Status Evaluation Rules
 * - Group 6: Pure-JS End-to-End KYC Pipeline Engine
 * - Group 7: Merchant KYC Room SQLite DAO Operations
 * - Group 8: StorageRepository Multi-Tenant Persistence & CRUD
 * - Group 9: Multi-Tenant Business Isolation & Cascade Deletion
 * - Group 10: Cloud Backup Sanitization & High-Throughput Performance Benchmark
 * ============================================================================
 */

const assert = require('assert');
const {
  MERCHANT_KYC_SCHEMA,
  KYC_TABLE_SCHEMA,
  KYC_STATUSES,
  EkycVerificationStatus,
  MerchantKycStatus,
  NID_TYPES,
  BangladeshNidType,
  NID_SIDES,
  NidSide,
  LIVENESS_GESTURES,
  LivenessGesture,
  LIVENESS_STATES,
  LivenessState,
  KYC_ARSC_TOKENS,
  validateBangladeshNid,
  extractAndNormalizeOcrFields,
  transitionLivenessState,
  assessSelfieQuality,
  evaluateKycVerificationStatus,
  MerchantKycRecord,
  MerchantKycDao,
  MerchantKycPipelineEngine,
  ReconstructedKycEngine,
  KycPipelineEngine,
  merchantKycPipelineEngine,
  reconstructedKycEngine,
} = require('./src/tallyPayService');

const {
  storageRepository,
  StorageRepository,
  VALID_COLLECTIONS,
  saveMerchantKyc,
  getMerchantKycByBusinessId,
  getMerchantKycList,
  updateMerchantKycStatus,
  getUnsyncedMerchantKyc,
  updateMerchantKycSyncStatus,
  existsMerchantKyc,
  deleteMerchantKyc,
} = require('./src/storageRepository');

let totalTests = 0;
let passedTests = 0;

function test(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${desc}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function asyncTest(desc, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${desc}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAllTests() {
  console.log('==================================================================');
  console.log(' REA-ITER-237: TALLYPAY MERCHANT KYC & BIO-VERIFICATION BACKEND');
  console.log('==================================================================');

  // ============================================================================
  // GROUP 1: Enums, Constants & Room SQLite Schema Invariants
  // ============================================================================
  console.log('\n[GROUP 1: Enums, Constants & Room SQLite Schema Invariants]');

  test('Schema defines table name merchant_kyc with all 16 columns', () => {
    assert.strictEqual(MERCHANT_KYC_SCHEMA.tableName, 'merchant_kyc');
    assert.strictEqual(MERCHANT_KYC_SCHEMA.uniqueIndex, 'index_merchant_kyc_business_id');
    const requiredCols = [
      'id', 'business_id', 'nid_number', 'dob', 'name_bn', 'name_en',
      'father_name', 'mother_name', 'nid_front_path', 'nid_back_path',
      'selfie_path', 'verification_status', 'liveness_score', 'synced',
      'create_date', 'update_date'
    ];
    assert.strictEqual(MERCHANT_KYC_SCHEMA.columns.length, 16);
    requiredCols.forEach((col) => {
      assert.ok(MERCHANT_KYC_SCHEMA.columns.includes(col), `Schema missing column: ${col}`);
    });
  });

  test('DDL specifies AUTOINCREMENT primary key, unique index, and default values', () => {
    assert.ok(KYC_TABLE_SCHEMA.includes('INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL'));
    assert.ok(KYC_TABLE_SCHEMA.includes('`business_id` TEXT NOT NULL'));
    assert.ok(KYC_TABLE_SCHEMA.includes('`verification_status` TEXT NOT NULL'));
    assert.ok(MERCHANT_KYC_SCHEMA.indexDdl.includes('UNIQUE INDEX IF NOT EXISTS `index_merchant_kyc_business_id`'));
  });

  test('KYC_STATUSES enum matches reference lifecycle states', () => {
    assert.strictEqual(KYC_STATUSES.INCOMPLETE, 'INCOMPLETE');
    assert.strictEqual(KYC_STATUSES.PENDING, 'PENDING');
    assert.strictEqual(KYC_STATUSES.VERIFIED, 'VERIFIED');
    assert.strictEqual(KYC_STATUSES.REJECTED, 'REJECTED');
    assert.strictEqual(EkycVerificationStatus.VERIFIED, 'VERIFIED');
    assert.strictEqual(MerchantKycStatus.REJECTED, 'REJECTED');
  });

  test('NID_TYPES and NID_SIDES enums conform to Bangladesh specifications', () => {
    assert.strictEqual(NID_TYPES.SMART_NID, 'SMART_NID');
    assert.strictEqual(NID_TYPES.LEGACY_13, 'LEGACY_13');
    assert.strictEqual(NID_TYPES.LEGACY_17, 'LEGACY_17');
    assert.strictEqual(NID_TYPES.UNKNOWN, 'UNKNOWN');
    assert.strictEqual(BangladeshNidType.SMART_NID, 'SMART_NID');

    assert.strictEqual(NID_SIDES.FRONT, 'FRONT');
    assert.strictEqual(NID_SIDES.BACK, 'BACK');
    assert.strictEqual(NidSide.FRONT, 'FRONT');
  });

  test('LIVENESS_GESTURES defines all 6 interactive challenge movements', () => {
    const gestures = ['LOOK_DOWN', 'LOOK_LEFT', 'LOOK_RIGHT', 'LOOK_UP', 'SMILE', 'BLINK'];
    gestures.forEach((g) => {
      assert.strictEqual(LIVENESS_GESTURES[g], g);
      assert.strictEqual(LivenessGesture[g], g);
    });
  });

  test('LIVENESS_STATES defines all 8 state machine positions', () => {
    const states = [
      'IDLE', 'AWAITING_CENTRE', 'AWAITING_GESTURE', 'HOLDING',
      'GESTURE_PASSED', 'SESSION_COMPLETE', 'GESTURE_TIMED_OUT', 'EXIT_OFFERED'
    ];
    states.forEach((s) => {
      assert.strictEqual(LIVENESS_STATES[s], s);
      assert.strictEqual(LivenessState[s], s);
    });
  });

  test('KYC_ARSC_TOKENS contains authentic Bengali copy from resources.arsc', () => {
    assert.strictEqual(KYC_ARSC_TOKENS.NID_LENGTH_ERROR, 'NID নম্বর ১০, ১৩ অথবা ১৭ সংখ্যা হতে হবে।');
    assert.strictEqual(KYC_ARSC_TOKENS.EKYC_HEADER_BANNER, 'NID ও সেলফি দিয়ে e-KYC সম্পন্ন করুন');
    assert.strictEqual(KYC_ARSC_TOKENS.NID_FRONT_LABEL, 'NID-এর ছবি (সামনে)');
    assert.strictEqual(KYC_ARSC_TOKENS.NID_BACK_LABEL, 'NID-এর ছবি (পেছনে)');
    assert.strictEqual(KYC_ARSC_TOKENS.NID_FRONT_OVERLAY, 'NID-এর সামনের ছবি তুলুন।');
    assert.strictEqual(KYC_ARSC_TOKENS.NID_BACK_OVERLAY, 'NID-এর পিছনের ছবি তুলুন।');
    assert.strictEqual(KYC_ARSC_TOKENS.SELFIE_CONFIRM_TITLE, 'আপনার সেলফি নিশ্চিত করুন');
    assert.strictEqual(KYC_ARSC_TOKENS.BIRTH_YEAR_MISMATCH, '১৭ সংখ্যার এনআইডির প্রথম ৪ ডিজিট জন্ম সালের সাথে মিলতে হবে।');
    assert.strictEqual(KYC_ARSC_TOKENS.UNDERAGE_ERROR, 'মার্চেন্ট একাউন্টের জন্য আবেদনকারীর বয়স কমপক্ষে ১৮ বছর হতে হবে।');
  });

  test('StorageRepository registers merchantKyc collection in VALID_COLLECTIONS', () => {
    assert.ok(VALID_COLLECTIONS.has('merchantKyc'), 'VALID_COLLECTIONS must contain merchantKyc');
  });

  // ============================================================================
  // GROUP 2: Bangladesh National ID (NID) Validation Engine
  // ============================================================================
  console.log('\n[GROUP 2: Bangladesh National ID (NID) Validation Engine]');

  test('Validates 10-digit Smart NID accurately', () => {
    const res = validateBangladeshNid('1234567890', '1990-05-15');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.type, 'SMART_NID');
    assert.strictEqual(res.nidNumber, '1234567890');
  });

  test('Validates 13-digit legacy NID accurately', () => {
    const res = validateBangladeshNid('1234567890123', '1985-10-22');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.type, 'LEGACY_13');
    assert.strictEqual(res.nidNumber, '1234567890123');
  });

  test('Validates 17-digit legacy NID with matching birth year prefix', () => {
    const res = validateBangladeshNid('19881234567890123', '1988-03-25');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.type, 'LEGACY_17');
    assert.strictEqual(res.nidNumber, '19881234567890123');
  });

  test('Rejects 17-digit legacy NID with birth year prefix mismatch', () => {
    const res = validateBangladeshNid('19881234567890123', '1995-03-25');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.reason, 'BIRTH_YEAR_MISMATCH');
    assert.strictEqual(res.type, 'LEGACY_17');
    assert.strictEqual(res.message, KYC_ARSC_TOKENS.BIRTH_YEAR_MISMATCH);
  });

  test('Rejects invalid NID lengths (9, 11, 12, 14, 15, 16, 18)', () => {
    const invalidLengths = [
      '123456789',             // 9 digits
      '12345678901',           // 11 digits
      '123456789012',          // 12 digits
      '12345678901234',        // 14 digits
      '123456789012345',       // 15 digits
      '1234567890123456',      // 16 digits
      '123456789012345678',    // 18 digits
    ];
    invalidLengths.forEach((nid) => {
      const res = validateBangladeshNid(nid);
      assert.strictEqual(res.valid, false, `Length ${nid.length} should be rejected`);
      assert.strictEqual(res.reason, 'INVALID_LENGTH');
      assert.strictEqual(res.message, KYC_ARSC_TOKENS.NID_LENGTH_ERROR);
    });
  });

  test('Rejects non-numeric NID inputs and non-string types', () => {
    assert.strictEqual(validateBangladeshNid('12345ABCDE').valid, false);
    assert.strictEqual(validateBangladeshNid('12345ABCDE').reason, 'NON_NUMERIC');
    assert.strictEqual(validateBangladeshNid(1234567890).valid, false);
    assert.strictEqual(validateBangladeshNid(1234567890).reason, 'INVALID_TYPE');
    assert.strictEqual(validateBangladeshNid(null).valid, false);
  });

  test('Strips spaces and hyphens from NID string before validation', () => {
    const res = validateBangladeshNid('  1988-1234-5678-90123  ', '1988-01-01');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.nidNumber, '19881234567890123');
    assert.strictEqual(res.type, 'LEGACY_17');
  });

  test('Rejects underage applicants (< 18 years old)', () => {
    const underageDob = new Date();
    underageDob.setFullYear(underageDob.getFullYear() - 17);
    const dobStr = underageDob.toISOString().slice(0, 10);
    const res = validateBangladeshNid('1234567890', dobStr);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.reason, 'UNDERAGE');
    assert.strictEqual(res.message, KYC_ARSC_TOKENS.UNDERAGE_ERROR);
  });

  test('Accepts adult applicant exactly 18 years old or older', () => {
    const adultDob = new Date();
    adultDob.setFullYear(adultDob.getFullYear() - 18);
    adultDob.setDate(adultDob.getDate() - 5);
    const dobStr = adultDob.toISOString().slice(0, 10);
    const res = validateBangladeshNid('1234567890', dobStr);
    assert.strictEqual(res.valid, true);
  });

  test('Rejects future dates of birth', () => {
    const futureDob = new Date();
    futureDob.setFullYear(futureDob.getFullYear() + 2);
    const res = validateBangladeshNid('1234567890', futureDob.toISOString().slice(0, 10));
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.reason, 'FUTURE_DOB');
  });

  test('Rejects malformed date of birth strings', () => {
    const res = validateBangladeshNid('1234567890', 'invalid-date-string');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.reason, 'INVALID_DOB');
  });

  // ============================================================================
  // GROUP 3: OCR Field Extractor & Bengali Digit Normalization
  // ============================================================================
  console.log('\n[GROUP 3: OCR Field Extractor & Bengali Digit Normalization]');

  test('Extracts front NID fields with Bengali digit conversion and uppercase name', () => {
    const rawFront = {
      identificationNumber: '১৯৮৮১২৩৪৫৬৭৮৯০১২৩',
      name: '  mohammad karim  ',
      nameBN: 'মোহাম্মদ করিম',
      dob: '1988-03-25',
      fatherName: 'আব্দুল জলিল',
      motherName: 'মোসাম্মৎ রহিমা'
    };
    const res = extractAndNormalizeOcrFields(rawFront, 'FRONT');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.side, 'FRONT');
    assert.strictEqual(res.fields.identificationNumber, '19881234567890123');
    assert.strictEqual(res.fields.name, 'MOHAMMAD KARIM');
    assert.strictEqual(res.fields.nameBN, 'মোহাম্মদ করিম');
    assert.strictEqual(res.fields.dob, '1988-03-25');
    assert.strictEqual(res.fields.fatherName, 'আব্দুল জলিল');
    assert.strictEqual(res.fields.motherName, 'মোসাম্মৎ রহিমা');
  });

  test('Extracts back NID fields with postal code normalization and uppercase blood group', () => {
    const rawBack = {
      address: 'গ্রাম: শ্যামপুর, ডাকঘর: সদর, থানা: কোতোয়ালী, জেলা: চট্টগ্রাম',
      postalCode: '৪০০০',
      bloodGroup: 'b+',
      issueDate: '2016-08-10'
    };
    const res = extractAndNormalizeOcrFields(rawBack, 'BACK');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.side, 'BACK');
    assert.strictEqual(res.fields.address, 'গ্রাম: শ্যামপুর, ডাকঘর: সদর, থানা: কোতোয়ালী, জেলা: চট্টগ্রাম');
    assert.strictEqual(res.fields.postalCode, '4000');
    assert.strictEqual(res.fields.bloodGroup, 'B+');
    assert.strictEqual(res.fields.issueDate, '2016-08-10');
  });

  test('Handles alternate OCR field keys (nidNumber, name_en, date_of_birth)', () => {
    const altRaw = {
      nidNumber: '১২৩৪৫৬৭৮৯০',
      name_en: 'rahim uddin',
      date_of_birth: '1992-04-12',
      father_name: 'সোহরাব',
      mother_name: 'আমেনা'
    };
    const res = extractAndNormalizeOcrFields(altRaw, 'FRONT');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.fields.identificationNumber, '1234567890');
    assert.strictEqual(res.fields.name, 'RAHIM UDDIN');
    assert.strictEqual(res.fields.dob, '1992-04-12');
  });

  test('Returns error on invalid OCR input object or unsupported side', () => {
    assert.strictEqual(extractAndNormalizeOcrFields(null).success, false);
    assert.strictEqual(extractAndNormalizeOcrFields('string').success, false);
    assert.strictEqual(extractAndNormalizeOcrFields({}, 'SIDEWAYS').success, false);
    assert.strictEqual(extractAndNormalizeOcrFields({}, 'SIDEWAYS').error, 'UNSUPPORTED_NID_SIDE');
  });

  // ============================================================================
  // GROUP 4: Facial Liveness State Machine & Quality Pre-Gates
  // ============================================================================
  console.log('\n[GROUP 4: Facial Liveness State Machine & Quality Pre-Gates]');

  test('Transitions through complete happy-path liveness challenge sequence', () => {
    let state = LIVENESS_STATES.IDLE;
    state = transitionLivenessState(state, 'START_SESSION');
    assert.strictEqual(state, LIVENESS_STATES.AWAITING_CENTRE);

    state = transitionLivenessState(state, 'FACE_CENTERED');
    assert.strictEqual(state, LIVENESS_STATES.AWAITING_GESTURE);

    state = transitionLivenessState(state, 'GESTURE_DETECTED');
    assert.strictEqual(state, LIVENESS_STATES.HOLDING);

    state = transitionLivenessState(state, 'HOLD_SUCCESS');
    assert.strictEqual(state, LIVENESS_STATES.GESTURE_PASSED);

    state = transitionLivenessState(state, 'ALL_GESTURES_PASSED');
    assert.strictEqual(state, LIVENESS_STATES.SESSION_COMPLETE);
  });

  test('Handles gesture timeout and retry / cancel events', () => {
    let state = LIVENESS_STATES.AWAITING_GESTURE;
    state = transitionLivenessState(state, 'GESTURE_TIMEOUT');
    assert.strictEqual(state, LIVENESS_STATES.GESTURE_TIMED_OUT);

    // Test retry
    const retryState = transitionLivenessState(state, 'RETRY');
    assert.strictEqual(retryState, LIVENESS_STATES.AWAITING_GESTURE);

    // Test cancel
    const cancelState = transitionLivenessState(state, 'CANCEL');
    assert.strictEqual(cancelState, LIVENESS_STATES.EXIT_OFFERED);
  });

  test('Handles hold broken returning to awaiting gesture', () => {
    let state = LIVENESS_STATES.HOLDING;
    state = transitionLivenessState(state, 'HOLD_BROKEN');
    assert.strictEqual(state, LIVENESS_STATES.AWAITING_GESTURE);
  });

  test('Selfie quality pre-gates: passes optimal face capture', () => {
    const faceRect = { x: 180, y: 180, width: 240, height: 240 };
    const quality = assessSelfieQuality(faceRect, 600, 600, 130, 260);
    assert.strictEqual(quality.passed, true);
    assert.strictEqual(quality.metrics.centered, true);
    assert.strictEqual(quality.metrics.wellLit, true);
    assert.strictEqual(quality.metrics.sharp, true);
  });

  test('Selfie quality pre-gates: fails low light (< 40 luminance)', () => {
    const faceRect = { x: 180, y: 180, width: 240, height: 240 };
    const quality = assessSelfieQuality(faceRect, 600, 600, 25, 260);
    assert.strictEqual(quality.passed, false);
    assert.strictEqual(quality.metrics.wellLit, false);
  });

  test('Selfie quality pre-gates: fails over-exposed light (> 240 luminance)', () => {
    const faceRect = { x: 180, y: 180, width: 240, height: 240 };
    const quality = assessSelfieQuality(faceRect, 600, 600, 250, 260);
    assert.strictEqual(quality.passed, false);
    assert.strictEqual(quality.metrics.wellLit, false);
  });

  test('Selfie quality pre-gates: fails motion blur (Laplacian variance < 100)', () => {
    const faceRect = { x: 180, y: 180, width: 240, height: 240 };
    const quality = assessSelfieQuality(faceRect, 600, 600, 120, 65);
    assert.strictEqual(quality.passed, false);
    assert.strictEqual(quality.metrics.sharp, false);
  });

  test('Selfie quality pre-gates: fails off-center face position', () => {
    // Face on far left
    const offCenterRect = { x: 20, y: 180, width: 200, height: 200 };
    const quality = assessSelfieQuality(offCenterRect, 600, 600, 120, 200);
    assert.strictEqual(quality.passed, false);
    assert.strictEqual(quality.metrics.centered, false);
  });

  // ============================================================================
  // GROUP 5: Bio-Verification Status Evaluation Rules
  // ============================================================================
  console.log('\n[GROUP 5: Bio-Verification Status Evaluation Rules]');

  test('Valid NID and livenessScore >= 0.85 routes to VERIFIED', () => {
    assert.strictEqual(evaluateKycVerificationStatus(true, 0.85), KYC_STATUSES.VERIFIED);
    assert.strictEqual(evaluateKycVerificationStatus(true, 0.98), KYC_STATUSES.VERIFIED);
  });

  test('Valid NID and 0.50 <= livenessScore < 0.85 routes to PENDING', () => {
    assert.strictEqual(evaluateKycVerificationStatus(true, 0.50), KYC_STATUSES.PENDING);
    assert.strictEqual(evaluateKycVerificationStatus(true, 0.74), KYC_STATUSES.PENDING);
    assert.strictEqual(evaluateKycVerificationStatus(true, 0.849), KYC_STATUSES.PENDING);
  });

  test('Valid NID and livenessScore < 0.50 routes to REJECTED', () => {
    assert.strictEqual(evaluateKycVerificationStatus(true, 0.49), KYC_STATUSES.REJECTED);
    assert.strictEqual(evaluateKycVerificationStatus(true, 0.10), KYC_STATUSES.REJECTED);
  });

  test('Invalid NID routes to REJECTED regardless of high liveness score', () => {
    assert.strictEqual(evaluateKycVerificationStatus(false, 0.99), KYC_STATUSES.REJECTED);
    assert.strictEqual(evaluateKycVerificationStatus(false, 0.70), KYC_STATUSES.REJECTED);
    assert.strictEqual(evaluateKycVerificationStatus(false, 0.10), KYC_STATUSES.REJECTED);
  });

  // ============================================================================
  // GROUP 6: Pure-JS End-to-End KYC Pipeline Engine
  // ============================================================================
  console.log('\n[GROUP 6: Pure-JS End-to-End KYC Pipeline Engine]');

  test('Pipeline Step 1 (processNidFront) creates incomplete record and front path', () => {
    const engine = new MerchantKycPipelineEngine();
    const ocrFront = {
      identificationNumber: '19881234567890123',
      name: 'MOHAMMAD KARIM',
      nameBN: 'মোহাম্মদ করিম',
      dob: '1988-03-25',
      fatherName: 'আব্দুল জলিল',
      motherName: 'মোসাম্মৎ রহিমা'
    };

    const res = engine.processNidFront('BIZ-1001', 'base64_front_img', ocrFront);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.step, 'NID_FRONT_SAVED');
    assert.strictEqual(res.nidNumber, '19881234567890123');

    const rec = engine.getKycByBusinessId('BIZ-1001');
    assert.ok(rec);
    assert.strictEqual(rec.verification_status, 'INCOMPLETE');
    assert.ok(rec.nid_front_path.includes('nid_front_BIZ-1001.jpg'));
    assert.strictEqual(rec.name_en, 'MOHAMMAD KARIM');
  });

  test('Pipeline Step 2 (processNidBack) appends back metadata and throws if front missing', () => {
    const engine = new MerchantKycPipelineEngine();
    const ocrFront = {
      identificationNumber: '19881234567890123',
      name: 'MOHAMMAD KARIM',
      dob: '1988-03-25'
    };
    engine.processNidFront('BIZ-1002', 'base64_front', ocrFront);

    const ocrBack = {
      address: 'চট্টগ্রাম সদর',
      bloodGroup: 'B+',
      postalCode: '4000'
    };
    const res = engine.processNidBack('BIZ-1002', 'base64_back', ocrBack);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.step, 'NID_BACK_SAVED');

    const rec = engine.getKycByBusinessId('BIZ-1002');
    assert.ok(rec.nid_back_path.includes('nid_back_BIZ-1002.jpg'));
    assert.strictEqual(rec.blood_group, 'B+');

    // Throws if front missing
    assert.throws(() => {
      engine.processNidBack('NON_EXISTENT_BIZ', 'base64_back', ocrBack);
    }, /Front NID must be submitted first/);
  });

  test('Pipeline Step 3 (processLivenessAndSelfie) auto-verifies valid NID + high score', () => {
    const engine = new MerchantKycPipelineEngine();
    const ocrFront = {
      identificationNumber: '19881234567890123',
      name: 'MOHAMMAD KARIM',
      dob: '1988-03-25'
    };
    engine.processNidFront('BIZ-1003', 'front', ocrFront);
    engine.processNidBack('BIZ-1003', 'back', { address: 'চট্টগ্রাম', bloodGroup: 'O+' });

    const res = engine.processLivenessAndSelfie('BIZ-1003', 'selfie_img', 0.94);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'VERIFIED');
    assert.strictEqual(res.livenessScore, 0.94);

    const rec = engine.getKycByBusinessId('BIZ-1003');
    assert.strictEqual(rec.verification_status, 'VERIFIED');
    assert.ok(rec.selfie_path.includes('selfie_BIZ-1003.jpg'));
  });

  test('Pipeline Step 3 routes sub-threshold liveness score to PENDING for manual review', () => {
    const engine = new MerchantKycPipelineEngine();
    const ocrFront = {
      identificationNumber: '1234567890',
      name: 'HASAN MAHMUD',
      dob: '1990-01-01'
    };
    engine.processNidFront('BIZ-1004', 'front', ocrFront);
    engine.processNidBack('BIZ-1004', 'back', { address: 'ঢাকা' });

    const res = engine.processLivenessAndSelfie('BIZ-1004', 'selfie_img', 0.72);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'PENDING');

    const rec = engine.getKycByBusinessId('BIZ-1004');
    assert.strictEqual(rec.verification_status, 'PENDING');
  });

  test('Pipeline Step 3 throws if session not initialized', () => {
    const engine = new MerchantKycPipelineEngine();
    assert.throws(() => {
      engine.processLivenessAndSelfie('UNKNOWN_BIZ', 'selfie', 0.95);
    }, /KYC session not initialized/);
  });

  // ============================================================================
  // GROUP 7: Merchant KYC Room SQLite DAO Operations
  // ============================================================================
  console.log('\n[GROUP 7: Merchant KYC Room SQLite DAO Operations]');

  test('MerchantKycDao handles saveKyc, exists, and getKycByBusinessId', () => {
    const dao = new MerchantKycDao();
    assert.strictEqual(dao.exists('BIZ-DAO-1'), false);

    const saved = dao.saveKyc({
      business_id: 'BIZ-DAO-1',
      nid_number: '1234567890',
      dob: '1992-05-10',
      name_en: 'ABDUL ALIM',
      verification_status: 'PENDING'
    });
    assert.strictEqual(saved.business_id, 'BIZ-DAO-1');
    assert.strictEqual(saved.nid_number, '1234567890');
    assert.strictEqual(dao.exists('BIZ-DAO-1'), true);

    const fetched = dao.getKycByBusinessId('BIZ-DAO-1');
    assert.strictEqual(fetched.name_en, 'ABDUL ALIM');
    assert.strictEqual(fetched.verification_status, 'PENDING');
  });

  test('MerchantKycDao updates status and liveness score', () => {
    const dao = new MerchantKycDao();
    dao.saveKyc({
      business_id: 'BIZ-DAO-2',
      nid_number: '1234567890',
      dob: '1992-05-10',
      verification_status: 'PENDING'
    });

    const updated = dao.updateKycStatus('BIZ-DAO-2', 'VERIFIED', 0.91);
    assert.strictEqual(updated.verification_status, 'VERIFIED');
    assert.strictEqual(updated.liveness_score, 0.91);

    const fetched = dao.getKycByBusinessId('BIZ-DAO-2');
    assert.strictEqual(fetched.verification_status, 'VERIFIED');
    assert.strictEqual(fetched.liveness_score, 0.91);
  });

  test('MerchantKycDao manages sync lifecycle (getUnsyncedKyc & updateKycSyncStatus)', () => {
    const dao = new MerchantKycDao();
    dao.saveKyc({ business_id: 'BIZ-SYNC-1', nid_number: '1111111111', dob: '1990-01-01', synced: 0 });
    dao.saveKyc({ business_id: 'BIZ-SYNC-2', nid_number: '2222222222', dob: '1991-01-01', synced: 0 });
    dao.saveKyc({ business_id: 'BIZ-SYNC-3', nid_number: '3333333333', dob: '1992-01-01', synced: 1 });

    const unsynced = dao.getUnsyncedKyc(10);
    assert.strictEqual(unsynced.length, 2);

    const success = dao.updateKycSyncStatus('BIZ-SYNC-1', 1);
    assert.strictEqual(success, true);

    const remainingUnsynced = dao.getUnsyncedKyc(10);
    assert.strictEqual(remainingUnsynced.length, 1);
    assert.strictEqual(remainingUnsynced[0].business_id, 'BIZ-SYNC-2');
  });

  // ============================================================================
  // GROUP 8: StorageRepository Multi-Tenant Persistence & CRUD
  // ============================================================================
  console.log('\n[GROUP 8: StorageRepository Multi-Tenant Persistence & CRUD]');

  await asyncTest('StorageRepository saves and retrieves merchant KYC record by business ID', async () => {
    const saveRes = await saveMerchantKyc('BIZ-STORE-1', {
      nid_number: '19851234567890123',
      dob: '1985-06-15',
      name_en: 'MD TARIQUL ISLAM',
      name_bn: 'মোঃ তরিকুল ইসলাম',
      verification_status: 'INCOMPLETE'
    });
    assert.strictEqual(saveRes.success, true);
    assert.ok(saveRes.id);

    const retrieved = getMerchantKycByBusinessId('BIZ-STORE-1');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.business_id, 'BIZ-STORE-1');
    assert.strictEqual(retrieved.nid_number, '19851234567890123');
    assert.strictEqual(retrieved.name_en, 'MD TARIQUL ISLAM');
    assert.strictEqual(retrieved.name_bn, 'মোঃ তরিকুল ইসলাম');
    assert.strictEqual(existsMerchantKyc('BIZ-STORE-1'), true);
  });

  await asyncTest('StorageRepository upserts existing merchant KYC on duplicate business ID', async () => {
    const firstSave = await saveMerchantKyc('BIZ-STORE-2', {
      nid_number: '1234567890',
      dob: '1990-01-01',
      name_en: 'INITIAL NAME',
      verification_status: 'INCOMPLETE'
    });
    const firstId = firstSave.id;

    // Second save for same businessId updates the record
    const secondSave = await saveMerchantKyc('BIZ-STORE-2', {
      nid_number: '1234567890',
      dob: '1990-01-01',
      name_en: 'UPDATED NAME',
      verification_status: 'PENDING'
    });
    assert.strictEqual(secondSave.id, firstId);

    const list = getMerchantKycList('BIZ-STORE-2');
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].name_en, 'UPDATED NAME');
    assert.strictEqual(list[0].verification_status, 'PENDING');
  });

  await asyncTest('StorageRepository filters KYC records by status and synced flag', async () => {
    await saveMerchantKyc('BIZ-FILTER-1', { nid_number: '1000000001', dob: '1990-01-01', verification_status: 'VERIFIED', synced: 1 });
    await saveMerchantKyc('BIZ-FILTER-2', { nid_number: '1000000002', dob: '1990-01-01', verification_status: 'PENDING', synced: 0 });
    await saveMerchantKyc('BIZ-FILTER-3', { nid_number: '1000000003', dob: '1990-01-01', verification_status: 'REJECTED', synced: 0 });

    const verifiedList = getMerchantKycList(null, { status: 'VERIFIED' });
    assert.ok(verifiedList.some((k) => k.business_id === 'BIZ-FILTER-1'));
    assert.ok(!verifiedList.some((k) => k.business_id === 'BIZ-FILTER-2'));

    const unsyncedList = getUnsyncedMerchantKyc(null, 100);
    assert.ok(unsyncedList.some((k) => k.business_id === 'BIZ-FILTER-2'));
    assert.ok(unsyncedList.some((k) => k.business_id === 'BIZ-FILTER-3'));
    assert.ok(!unsyncedList.some((k) => k.business_id === 'BIZ-FILTER-1'));
  });

  await asyncTest('StorageRepository updates KYC status and sync status', async () => {
    await saveMerchantKyc('BIZ-STATUS-1', {
      nid_number: '1234567890',
      dob: '1990-01-01',
      verification_status: 'PENDING',
      synced: 0
    });

    const updStatus = await updateMerchantKycStatus('BIZ-STATUS-1', 'VERIFIED', 0.92);
    assert.strictEqual(updStatus.success, true);
    assert.strictEqual(updStatus.record.verification_status, 'VERIFIED');
    assert.strictEqual(updStatus.record.liveness_score, 0.92);

    const updSync = await updateMerchantKycSyncStatus('BIZ-STATUS-1', 1);
    assert.strictEqual(updSync.success, true);

    const finalKyc = getMerchantKycByBusinessId('BIZ-STATUS-1');
    assert.strictEqual(finalKyc.verification_status, 'VERIFIED');
    assert.strictEqual(finalKyc.synced, 1);
  });

  await asyncTest('StorageRepository deletes KYC record for specific business', async () => {
    await saveMerchantKyc('BIZ-DEL-1', { nid_number: '1234567890', dob: '1990-01-01' });
    assert.strictEqual(existsMerchantKyc('BIZ-DEL-1'), true);

    const delRes = await deleteMerchantKyc('BIZ-DEL-1');
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(existsMerchantKyc('BIZ-DEL-1'), false);
    assert.strictEqual(getMerchantKycByBusinessId('BIZ-DEL-1'), null);
  });

  // ============================================================================
  // GROUP 9: Multi-Tenant Business Isolation & Cascade Deletion
  // ============================================================================
  console.log('\n[GROUP 9: Multi-Tenant Business Isolation & Cascade Deletion]');

  await asyncTest('Strict business isolation between tenants', async () => {
    await saveMerchantKyc('BIZ-TENANT-A', {
      nid_number: '1000000001',
      name_en: 'TENANT A OWNER',
      verification_status: 'VERIFIED'
    });
    await saveMerchantKyc('BIZ-TENANT-B', {
      nid_number: '2000000002',
      name_en: 'TENANT B OWNER',
      verification_status: 'PENDING'
    });

    const kycA = getMerchantKycByBusinessId('BIZ-TENANT-A');
    const kycB = getMerchantKycByBusinessId('BIZ-TENANT-B');

    assert.strictEqual(kycA.name_en, 'TENANT A OWNER');
    assert.strictEqual(kycA.nid_number, '1000000001');
    assert.strictEqual(kycB.name_en, 'TENANT B OWNER');
    assert.strictEqual(kycB.nid_number, '2000000002');
  });

  await asyncTest('deleteBusinessCascade purges merchantKyc for deleted business only', async () => {
    // Setup temporary business '88'
    await storageRepository.mutateStore((s) => ({
      ...s,
      businesses: [...(s.businesses || []), { id: '88', name: 'Tenant 88', isArchived: false }],
    }));

    await saveMerchantKyc('88', { nid_number: '2222222222', name_en: 'OWNER 88' });
    await saveMerchantKyc('1', { nid_number: '1111111111', name_en: 'PRIMARY OWNER' });

    assert.ok(getMerchantKycByBusinessId('88'));
    assert.ok(getMerchantKycByBusinessId('1'));

    // Delete business 88
    const delRes = await storageRepository.deleteBusinessCascade('88');
    assert.strictEqual(delRes.success !== false, true);

    // Verify tenant 88 data is purged
    assert.strictEqual(getMerchantKycByBusinessId('88'), null);
    assert.ok(getMerchantKycByBusinessId('1'));
  });

  // ============================================================================
  // GROUP 10: Cloud Backup Sanitization & High-Throughput Performance Benchmark
  // ============================================================================
  console.log('\n[GROUP 10: Cloud Backup Sanitization & High-Throughput Performance Benchmark]');

  await asyncTest('getFullBackupState masks NID number and strips all base64 / biometric payloads', async () => {
    await saveMerchantKyc('BIZ-BACKUP-1', {
      nid_number: '19881234567890123',
      dob: '1988-03-25',
      name_en: 'BACKUP OWNER',
      selfie_base64: 'data:image/jpeg;base64,SECRET_SELFIE_PAYLOAD',
      selfieBase64: 'SECRET_SELFIE_RAW',
      image_base64: 'SECRET_NID_IMAGE',
      biometricPayload: { faceVectors: [0.12, 0.45, 0.88] },
      faceEmbedding: [1, 2, 3],
      token: 'jwt_auth_token_xyz',
      sessionToken: 'session_token_123',
      secret: 'private_key_secret'
    });

    const backupState = await storageRepository.getFullBackupState();
    const backupKyc = (backupState.merchantKyc || []).find((k) => k.business_id === 'BIZ-BACKUP-1');
    assert.ok(backupKyc, 'Backup should include merchantKyc record');

    // NID must be masked: first 3 digits + '****' + last 4 digits
    assert.strictEqual(backupKyc.nid_number, '198****0123');
    assert.strictEqual(backupKyc.nidNumber, '198****0123');

    // Sensitive biometric and image data must be stripped
    assert.strictEqual(backupKyc.selfie_base64, undefined);
    assert.strictEqual(backupKyc.selfieBase64, undefined);
    assert.strictEqual(backupKyc.image_base64, undefined);
    assert.strictEqual(backupKyc.biometricPayload, undefined);
    assert.strictEqual(backupKyc.faceEmbedding, undefined);
    assert.strictEqual(backupKyc.token, undefined);
    assert.strictEqual(backupKyc.sessionToken, undefined);
    assert.strictEqual(backupKyc.secret, undefined);
  });

  await asyncTest('createStorageBackup includes merchantKyc in manifest recordCounts', async () => {
    await saveMerchantKyc('BIZ-MANIFEST-1', { nid_number: '1234567890', dob: '1990-01-01' });
    const payload = await storageRepository.createStorageBackup();
    assert.ok(payload.manifest);
    assert.ok(payload.manifest.recordCounts);
    assert.ok(payload.manifest.recordCounts.merchantKyc >= 1);
  });

  await asyncTest('commitRestorePayload restores merchantKyc in full restore round-trip', async () => {
    const backup = await storageRepository.createStorageBackup();
    assert.ok(backup.data.merchantKyc.length > 0);

    const restorePayload = {
      ...backup.data,
      merchantKyc: [
        {
          id: 'KYC_RESTORED_1',
          business_id: '1',
          businessId: '1',
          nid_number: '19881234567890123',
          dob: '1988-03-25',
          name_en: 'RESTORED OWNER',
          verification_status: 'VERIFIED'
        }
      ]
    };

    const restoreRes = await storageRepository.commitRestorePayload(restorePayload);
    assert.strictEqual(restoreRes.success, true);

    const restoredKyc = getMerchantKycByBusinessId('1');
    assert.ok(restoredKyc);
    assert.strictEqual(restoredKyc.name_en, 'RESTORED OWNER');
    assert.strictEqual(restoredKyc.verification_status, 'VERIFIED');
  });

  test('High-throughput performance benchmark: 1,000 KYC operations in < 150ms', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      const nidVal = validateBangladeshNid('19881234567890123', '1988-03-25');
      assert.strictEqual(nidVal.valid, true);

      const ocr = extractAndNormalizeOcrFields({
        identificationNumber: '১৯৮৮১২৩৪৫৬৭৮৯০১২৩',
        name: 'test user',
        dob: '1988-03-25'
      }, 'FRONT');
      assert.strictEqual(ocr.fields.identificationNumber, '19881234567890123');

      const quality = assessSelfieQuality({ x: 180, y: 180, width: 240, height: 240 }, 600, 600, 120, 200);
      assert.strictEqual(quality.passed, true);

      const status = evaluateKycVerificationStatus(nidVal.valid, 0.92);
      assert.strictEqual(status, 'VERIFIED');
    }
    const duration = Date.now() - start;
    console.log(`  (Executed 1,000 complete KYC operations in ${duration}ms)`);
    assert.ok(duration < 150, `1,000 operations took ${duration}ms (target < 150ms)`);
  });

  console.log('\n==================================================================');
  console.log(` ALL ${totalTests}/${totalTests} BACKEND TESTS PASSED SUCCESSFULLY! (100% PASS RATE)`);
  console.log('==================================================================');
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
