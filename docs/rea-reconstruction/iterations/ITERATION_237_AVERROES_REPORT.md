# TALLYKHATA RECONSTRUCTION — ITERATION 237 BACKEND REPORT
**Worker:** Worker 2: Averroes / Peirce (Permanent Backend Developer & Business Logic Architect)  
**Registered Thread ID:** `01a1a349-61ae-74d0-aed6-1792e7d1d594`  
**Milestone:** REA-ITER-237 (TallyPay Merchant KYC, NID Scanner OCR & Bio-Verification Pipeline Backend)  
**Date:** 2026-11-05  
**Status:** **100% COMPLETE & VERIFIED** (54/54 Backend Tests Passing, 130/130 Reference Architecture Tests Passing, Zero Regressions)

---

## 1. Executive Summary

In Milestone **REA-ITER-237**, Worker 2 (Averroes / Peirce) implemented, validated, and verified the complete backend data architecture, National ID validation engine, OCR normalization pipeline, facial liveness state machine, and multi-tenant persistence layer for:

1. **Room SQLite Persistence for `merchant_kyc`:**
   - Room SQLite table schema `merchant_kyc` with 16 columns and unique index `index_merchant_kyc_business_id` on `business_id`.
   - In-memory DAO queries (`MerchantKycDao`): `exists(businessId)`, `getKycByBusinessId(businessId)`, `updateKycStatus(businessId, status, livenessScore)`, `getUnsyncedKyc(limit)`, and `updateKycSyncStatus(businessId, synced)`.
2. **Bangladesh National ID (NID) Validation Engine (`validateBangladeshNid`):**
   - 10-digit Smart NID (`SMART_NID`).
   - 13-digit legacy NID (`LEGACY_13`).
   - 17-digit legacy NID (`LEGACY_17`) with mandatory 4-digit birth year prefix correlation check against `dob`.
   - Statutory merchant age verification (applicant must be $\ge 18$ years old; underage applicants rejected with `UNDERAGE` reason code).
   - Rejection of invalid lengths (9, 11, 12, 14, 15, 16, 18+), non-numeric characters, future dates of birth (`FUTURE_DOB`), and malformed date strings (`INVALID_DOB`).
   - Automatic stripping of hyphens and whitespace.
3. **OCR Field Extractor & Normalizer (`extractAndNormalizeOcrFields`):**
   - Front NID extraction: `identificationNumber`, `name` (converted to uppercase), `nameBN`, `dob`, `fatherName`, `motherName`.
   - Back NID extraction: `address`, `postalCode` (Bengali digits normalized to ASCII digits), `bloodGroup` (converted to uppercase), `issueDate`.
   - Multi-format numeral mapping converting all Bengali digits (`০-৯`) to standard digits (`0-9`).
4. **Facial Liveness & Bio-Verification State Machine:**
   - 8-state liveness lifecycle state machine: `IDLE` $\rightarrow$ `AWAITING_CENTRE` $\rightarrow$ `AWAITING_GESTURE` $\rightarrow$ `HOLDING` $\rightarrow$ `GESTURE_PASSED` $\rightarrow$ `SESSION_COMPLETE` (with `GESTURE_TIMED_OUT` and `EXIT_OFFERED` failure/retry states).
   - Support for 6 interactive challenge movements: `LOOK_DOWN`, `LOOK_LEFT`, `LOOK_RIGHT`, `LOOK_UP`, `SMILE`, `BLINK`.
   - Real-time image quality pre-gate evaluator (`assessSelfieQuality`):
     - Viewfinder Centering: face bounding box center within $35\% - 65\%$ of frame dimensions.
     - Ambient Lighting: mean luminance between $40$ and $240$.
     - Sharpness: Laplacian variance $\ge 100$ to reject motion blur.
5. **Bio-Verification Status Evaluator (`evaluateKycVerificationStatus`):**
   - $\text{validNid} = \text{true} \land \text{livenessScore} \ge 0.85 \implies \text{VERIFIED}$.
   - $\text{validNid} = \text{true} \land 0.50 \le \text{livenessScore} < 0.85 \implies \text{PENDING}$ (manual review queue).
   - $\text{validNid} = \text{true} \land \text{livenessScore} < 0.50 \implies \text{REJECTED}$.
   - $\text{validNid} = \text{false} \implies \text{REJECTED}$ regardless of liveness score.
6. **Pure-JS End-to-End KYC Pipeline Engine (`MerchantKycPipelineEngine` / `reconstructedKycEngine`):**
   - Step 1: `processNidFront(businessId, imageBase64, ocrResult)`.
   - Step 2: `processNidBack(businessId, imageBase64, ocrResult)` (enforces front NID submitted first).
   - Step 3: `processLivenessAndSelfie(businessId, selfieBase64, livenessScore)`.
7. **Multi-Tenant StorageRepository Persistence & Cascade Deletion:**
   - Thread-safe storage under collection `merchantKyc`.
   - Multi-tenant business isolation by `businessId` with upsert on re-submission.
   - Comprehensive CRUD: `saveMerchantKyc`, `getMerchantKycByBusinessId`, `getMerchantKycList`, `updateMerchantKycStatus`, `getUnsyncedMerchantKyc`, `updateMerchantKycSyncStatus`, `existsMerchantKyc`, `deleteMerchantKyc`.
   - Cascading purge in `deleteBusinessCascade` ensuring target business KYC is permanently removed while other tenants remain unaffected.
   - Strict cloud backup sanitization in `getFullBackupState`: masks NID number (`198****0123`) and completely strips all raw base64 images (`selfie_base64`, `image_base64`), biometric vectors/embeddings (`biometricPayload`, `faceEmbedding`), and session tokens.
   - Cloud backup manifest inclusion in `manifest.recordCounts.merchantKyc`.

All implementations conform directly to the reverse-engineering discoveries established by Worker 1 (Gibbs) in `docs/rea-reconstruction/investigations/REA_INVESTIGATION_ITER_237_KYC_NID_LIVENESS.md`.

---

## 2. Architecture & Components Delivered

### 2.1 Room SQLite Schema & DAO Layer (`src/tallyPayService.js`)
- **Table Definition (`merchant_kyc`):**
  - `id`: INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
  - `business_id`: TEXT NOT NULL (Unique Indexed: `index_merchant_kyc_business_id`)
  - `nid_number`: TEXT NOT NULL
  - `dob`: TEXT NOT NULL (ISO 8601 date string, `YYYY-MM-DD`)
  - `name_bn`: TEXT (Bengali legal name)
  - `name_en`: TEXT (English legal name, uppercase)
  - `father_name`: TEXT (Father's name)
  - `mother_name`: TEXT (Mother's name)
  - `nid_front_path`: TEXT (Local filesystem path to front NID photo)
  - `nid_back_path`: TEXT (Local filesystem path to back NID photo)
  - `selfie_path`: TEXT (Local filesystem path to captured selfie photo)
  - `verification_status`: TEXT NOT NULL (Enum: `INCOMPLETE`, `PENDING`, `VERIFIED`, `REJECTED`)
  - `liveness_score`: REAL (Facial liveness confidence between 0.00 and 1.00)
  - `synced`: INTEGER NOT NULL DEFAULT 0 (0 = Dirty/Unsynced, 1 = Synced)
  - `create_date`: TEXT NOT NULL (ISO 8601 timestamp)
  - `update_date`: TEXT (Nullable ISO 8601 timestamp)
- **DAO Queries (`MerchantKycDao`):**
  - `exists(businessId)`: Checks if merchant KYC record exists for the tenant.
  - `getKycByBusinessId(businessId)`: Returns isolated copy of the KYC record.
  - `updateKycStatus(businessId, status, livenessScore)`: Updates verification status and liveness score.
  - `getUnsyncedKyc(limit)`: Returns up to `limit` records where `synced === 0`.
  - `updateKycSyncStatus(businessId, synced)`: Marks records synced or dirty.

### 2.2 Bangladesh National ID Validation Engine (`validateBangladeshNid`)
- **Digit Length & Pattern Verification:**
  - 10-digit: `SMART_NID` (`^\d{10}$`).
  - 13-digit: `LEGACY_13` (`^\d{13}$`).
  - 17-digit: `LEGACY_17` (`^\d{17}$`).
- **Birth Year Correlation Rule:**
  - For 17-digit legacy NIDs, the first 4 digits must match the citizen's birth year: `cleaned.substring(0, 4) === new Date(dateOfBirth).getFullYear().toString()`.
  - Rejection code: `BIRTH_YEAR_MISMATCH`.
- **Statutory Age Rule:**
  - Applicants must be $\ge 18$ years old on the current date.
  - Rejection code: `UNDERAGE`.
- **Integrity Guards:**
  - Strips spaces and hyphens before evaluation.
  - Rejects future dates (`FUTURE_DOB`).
  - Rejects malformed dates (`INVALID_DOB`).
  - Rejects non-numeric characters (`NON_NUMERIC`).
  - Rejects non-string types (`INVALID_TYPE`).

### 2.3 OCR Field Extractor & Normalizer (`extractAndNormalizeOcrFields`)
- **Numeral Normalization:**
  - Maps Bengali digits `['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']` to ASCII digits `0-9`.
- **Front Side Parsing:**
  - Extracts identification number, English name (uppercase), Bengali name, date of birth, father's name, mother's name.
- **Back Side Parsing:**
  - Extracts address, postal code (normalized), blood group (uppercase, e.g. `B+`, `O+`), issue date.
- **Defensive Error Handling:**
  - Validates input object and side parameter, returning typed error `UNSUPPORTED_NID_SIDE` or `INVALID_OCR_INPUT`.

### 2.4 Facial Liveness State Machine & Quality Pre-Gates
- **State Machine (`transitionLivenessState`):**
  - Handles valid events: `START_SESSION`, `FACE_CENTERED`, `GESTURE_DETECTED`, `HOLD_SUCCESS`, `ALL_GESTURES_PASSED`.
  - Handles edge-case interruptions: `GESTURE_TIMEOUT` $\rightarrow$ `GESTURE_TIMED_OUT`, `RETRY` $\rightarrow$ `AWAITING_GESTURE`, `CANCEL` $\rightarrow$ `EXIT_OFFERED`, `HOLD_BROKEN` $\rightarrow$ `AWAITING_GESTURE`.
- **Image Quality Evaluator (`assessSelfieQuality`):**
  - Centering: bounding box center must have $x$ and $y$ ratios within $[0.35, 0.65]$.
  - Lighting: luminance within $[40, 240]$.
  - Sharpness: Laplacian blur variance $\ge 100$.

### 2.5 StorageRepository Integration (`src/storageRepository.js`)
- **Multi-Tenant Persistence:**
  - `saveMerchantKyc(businessId, record)`: Upsert with business isolation.
  - `getMerchantKycByBusinessId(businessId)`: Single-tenant fetch.
  - `getMerchantKycList(businessId, options)`: Filtered query by status or sync flag.
  - `updateMerchantKycStatus(businessId, status, livenessScore)`: Atomic status update.
  - `getUnsyncedMerchantKyc(businessId, limit)`: Unsynced batch fetching.
  - `updateMerchantKycSyncStatus(businessId, synced)`: Sync status progression.
  - `existsMerchantKyc(businessId)`: Existence check.
  - `deleteMerchantKyc(businessId)`: Tenant-scoped deletion.
- **Cascade Purge (`deleteBusinessCascade`):**
  - Purges `merchantKyc` records matching `getBizId(k) === targetId`.
- **Cloud Backup Sanitization (`getFullBackupState`):**
  - Masks NID numbers: first 3 digits + `****` + last 4 digits.
  - Strips all base64 images (`selfie_base64`, `selfieBase64`, `image_base64`, `imageBase64`, `nid_front_base64`, `nid_back_base64`).
  - Strips all biometric vectors and face embeddings (`biometricPayload`, `faceEmbedding`, `rawFaceData`).
  - Strips session tokens and secrets (`token`, `sessionToken`, `secret`).
  - Includes `merchantKyc` in `manifest.recordCounts`.

---

## 3. Verification & Test Results

### 3.1 Suite Execution Summary: `test_iteration_237_kyc_backend.js`
- **Test Groups:** 10
- **Total Assertions:** 54
- **Passed Assertions:** 54
- **Failed Assertions:** 0
- **Pass Rate:** **100.0%**
- **Performance Benchmark:** 1,000 KYC operations completed in **37ms** (target $< 150\text{ms}$)

### 3.2 Breakdown by Test Group:
| Group | Description | Assertions | Result |
|---|---|:---:|:---:|
| **Group 1** | Enums, Constants & Room SQLite Schema Invariants | 8 | **PASS** |
| **Group 2** | Bangladesh National ID (NID) Validation Engine | 11 | **PASS** |
| **Group 3** | OCR Field Extractor & Bengali Digit Normalization | 4 | **PASS** |
| **Group 4** | Facial Liveness State Machine & Quality Pre-Gates | 8 | **PASS** |
| **Group 5** | Bio-Verification Status Evaluation Rules | 4 | **PASS** |
| **Group 6** | Pure-JS End-to-End KYC Pipeline Engine | 5 | **PASS** |
| **Group 7** | Merchant KYC Room SQLite DAO Operations | 3 | **PASS** |
| **Group 8** | StorageRepository Multi-Tenant Persistence & CRUD | 5 | **PASS** |
| **Group 9** | Multi-Tenant Business Isolation & Cascade Deletion | 2 | **PASS** |
| **Group 10** | Cloud Backup Sanitization & High-Throughput Performance Benchmark | 4 | **PASS** |
| **Total** | | **54** | **100% PASS** |

### 3.3 Zero Regression Verification Across Prior Iterations:
- `test_iteration_229_qr_settlement_backend.js`: **36 / 36 PASS** (100%)
- `test_iteration_230_settlement_history_backend.js`: **40 / 40 PASS** (100%)
- `test_iteration_231_pin_biometrics_backend.js`: **38 / 38 PASS** (100%)
- `test_iteration_232_account_manager_backend.js`: **30 / 30 PASS** (100%)
- `test_iteration_233_add_money_backend.js`: **32 / 32 PASS** (100%)
- `test_iteration_234_transfer_backend.js`: **30 / 30 PASS** (100%)
- `test_iteration_235_recharge_backend.js`: **31 / 31 PASS** (100%)
- `test_iteration_236_settlement_backend.js`: **36 / 36 PASS** (100%)
- `test_iteration_237_kyc_reference_architecture.js`: **130 / 130 PASS** (100%)
- `test_iteration_237_kyc_backend.js`: **54 / 54 PASS** (100%)

---

## 4. Handoff to Worker 3 (Ohm — Frontend UI/UX Developer)

The backend engine and storage infrastructure are ready for UI integration:
1. **Modal / Screen Component:**
   - Author `modalMerchantKyc.js` or integrate into `App.js` with a 3-step wizard flow:
     - Step 1: NID Front Photo Capture (`NID-এর ছবি (সামনে)`).
     - Step 2: NID Back Photo Capture (`NID-এর ছবি (পেছনে)`).
     - Step 3: Selfie & Facial Liveness Challenge (`আপনার সেলফি নিশ্চিত করুন`).
2. **Interactive UI Guides:**
   - Visual document reticle overlay for NID boundary cropping.
   - Oval face mask with dynamic gesture prompts:
     - "একটু হাসুন" (`SMILE`)
     - "চোখ পলক দিন" (`BLINK`)
     - "ডানে তাকান" (`LOOK_RIGHT`)
     - "বামে তাকান" (`LOOK_LEFT`)
     - "উপরে তাকান" (`LOOK_UP`)
     - "নিচে তাকান" (`LOOK_DOWN`)
3. **Bengali Copy Invariants:**
   - Use tokens from `KYC_ARSC_TOKENS` exported from `src/tallyPayService.js`.
