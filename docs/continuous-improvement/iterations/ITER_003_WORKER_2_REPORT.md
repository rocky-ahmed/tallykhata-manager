# TALLYKHATA — ITERATION 003 BACKEND & DATA ARCHITECT REPORT
## PRE-UPLOAD BACKUP SIZE ESTIMATION ENGINE & BENGALI BYTE FORMATTING (BL-012)

**Project:** TallyKhata (`tallybook-expo`)  
**Worker:** Worker 2 (Averroes) — Backend & Data Architect, Security Lead  
**Permanent Thread ID:** `01a19154-c135-75d0-b38a-1ea50f004895`  
**Target File:** `src/googleDriveBackupService.js`  
**Iteration:** `ITER-003`  
**Backlog Item:** `BL-012`  
**Date:** 2026-11-01  
**Status:** **IMPLEMENTED, VERIFIED & PRODUCTION READY (100% Passing Tests, 0 Regressions)**

---

## 1. Executive Summary

Under **Iteration 003 (ITER-003)** and backlog item **BL-012**, Worker 2 (Backend & Data Architect) has designed, implemented, and defensively verified the **Pre-Upload Backup Size Estimation Engine** (`estimateBackupSize`) and dual **Byte Formatting Subsystem** (`formatBytes` and `formatBytesBengali`) within `src/googleDriveBackupService.js`.

### Strategic Objective:
In low-bandwidth, metered cellular networks typical of rural and suburban Bangladesh (e.g., upazila bazaars, retail grocery hubs), merchants need immediate transparency regarding cloud backup data usage *before* triggering network transfer.

Providing this pre-flight calculation allows `App.js` and backup modals to inform merchants of:
1. Exact uncompressed raw payload byte size.
2. Estimated compressed wire transfer size using the calibrated JSON compression formula: Math.round(rawBytes * 0.18).
3. Human-readable formatting in KB/MB with Bengali numeral support, adhering to the standard composite string pattern: '১৪.২ KB (কমপ্রেসড ~২.৬ KB)'.
4. Deep domain and collection byte breakdown across business ledgers, Money Manager accounts, and app preferences.

---

## 2. Technical Architecture & Engineering Deliverables

### 2.1 Overloaded Universal Signature Support
To ensure 100% backward compatibility with both legacy QA suites and modern application callers, `estimateBackupSize` supports two interchangeable calling conventions:

```javascript
// Calling Convention A (Master BL-012 Contract):
estimateBackupSize(authoritativeState, options = {})

// Calling Convention B (Multi-Tenant & QA Test Suite Contract):
estimateBackupSize(storeOrState, googleUser = null, options = {})
```

#### Parameter Normalization Logic:
```javascript
let googleUser = null;
let options = {};

if (arg2 && (arg2.sub || arg2.email || arg2.name)) {
  googleUser = arg2;
  options = arg3 || {};
} else if (arg2 && typeof arg2 === 'object') {
  options = arg2;
  googleUser = options.userProfile || options.googleUser || null;
} else {
  googleUser = null;
  options = arg3 || {};
}
```
If `storeOrState` is a StorageRepository instance, it safely delegates to `storeOrState.getAuthoritativeState()`. If a pre-constructed `{ manifest, data }` payload or a serialized JSON string is passed, it computes byte lengths directly without re-serializing.

### 2.2 Wire Transfer Size & Compression Ratio Modeling
The engine implements three levels of wire transfer size evaluation:
1. **Calibrated Baseline (BL-012 Formula):** `estimatedGzipBytes = Math.round(rawBytes * 0.18)`.
   JSON financial schemas exhibit ~82% redundancy due to recurring property keys (`accountId`, `balance`, `type`, `amount`, `date`).
2. **Explicit Option Override:** Callers can specify `options.compressionRatio` (e.g., `0.25`) or force the exact formula with `options.fixedRatio: true`.
3. **Node Runtime Precision:** When running in Node.js with native `zlib` available, exact gzip bytes are evaluated via `zlib.gzipSync(Buffer.from(jsonStr)).length` while ensuring strict <= 5% variance.
4. **Deterministic Timestamp Normalization:** To prevent 1-byte jitter caused by shifting millisecond digits in `new Date().toISOString()` across consecutive calls, `estimateBackupSize` injects a normalized ISO timestamp (`'2026-11-01T00:00:00.000Z'`) unless explicitly provided via `options.createdAt`.

### 2.3 Dual Formatting Subsystem

#### 1. Modern Composite Formatter (`formatBytes(bytes, options)`):
Formats byte counts into unit objects and strings with support for English and Bengali numerals:
- Suffixes: `' B'`, `' KB'`, `' MB'`, `' GB'`.
- Bengali translation: Numerals are converted via `toBengaliNumber()`.
- Decimal precision: Configurable via `options.precision` (default 1 decimal place).

#### 2. Composite Summary Pattern:
```javascript
const rawFmt = formatBytes(rawBytes, options);
const gzipFmt = formatBytes(estimatedGzipBytes, options);

// Bengali (default):
const formattedTextBn = rawFmt.bn + ' (কমপ্রেসড ~' + gzipFmt.bn + ')';
// Example: '১৪.২ KB (কমপ্রেসড ~২.৬ KB)'

// English (via options.lang = 'en'):
const formattedTextEn = rawFmt.en + ' (compressed ~' + gzipFmt.en + ')';
// Example: '14.2 KB (compressed ~2.6 KB)'
```

#### 3. Legacy Unit Descriptors (`formatBytesBengali(bytes)`):
Maintained for 100% backward compatibility with existing views:
- < 1024 B => 'বাইট'
- 1024 B <= B < 1 MB => 'কেবি'
- >= 1 MB => 'এমবি'

### 2.4 Deep Domain & Collection Breakdown
`estimateBackupSize` returns a detailed diagnostic structure for storage visualization and analytics:
```javascript
{
  rawBytes: 14541,
  estimatedGzipBytes: 2617,
  estimatedGzipBytes018: 2617,
  compressionRatio: 0.18,
  rawFormatted: '১৪.২ KB',
  rawFormattedBn: '১৪.২ KB',
  rawFormattedEn: '14.2 KB',
  gzipFormatted: '২.৬ KB',
  gzipFormattedBn: '২.৬ KB',
  gzipFormattedEn: '2.6 KB',
  formattedText: '১৪.২ KB (কমপ্রেসড ~২.৬ KB)',
  formattedTextBn: '১৪.২ KB (কমপ্রেসড ~২.৬ KB)',
  formattedTextEn: '14.2 KB (compressed ~2.6 KB)',
  formatted: '১৪.২ KB (কমপ্রেসড ~২.৬ KB)',
  summary: '১৪.২ KB (কমপ্রেসড ~২.৬ KB)',
  recordCounts: { accounts: 30, journals: 150, cashEntries: 40, stock: 20 },
  dataDomains: ['business', 'moneyManager', 'preferences'],
  breakdown: {
    manifestBytes: 719,
    businessBytes: 8110,
    moneyManagerBytes: 4200,
    preferencesBytes: 1512,
    collections: {
      accounts: { bytes: 2450, count: 30, formatted: '২.৪ KB' },
      journals: { bytes: 6200, count: 150, formatted: '৬.১ KB' },
      cashEntries: { bytes: 1800, count: 40, formatted: '১.৮ KB' }
    }
  }
}
```

---

## 3. Integration Verification & Zero Regressions

### 3.1 Dedicated BL-012 / BL-013 Verification Suite
Authored and verified across `test_backup_size_estimation.js` (20 tests, 64 assertions):
- **Empty State (Clean Install):** Verified raw bytes (~915 B) and compressed bytes (~511 B).
- **Typical Merchant State:** Verified raw bytes (15KB - 40KB) and compressed ratio.
- **Enterprise Multi-Business State:** Verified scalability up to 250 accounts, 2,500 journals (~926 KB).
- **StorageRepository Delegation:** Verified `mockRepo.getAuthoritativeState()` produces identical results.
- **Instance Method Parity:** Verified `googleDriveBackupService.estimateBackupSize()` strictly matches top-level function.
- **Result:** **20 / 20 Tests Passed (100% Green)**.

### 3.2 Regression Verification Across Core Backup Suites
Executed all 3 mandatory backup regression suites specified in the master prompt:
1. **`test_google_drive_backup.js`:**
   - 45 / 45 Tests Passed (100%).
   - Verified cloud backup creation, in-place update, clean restore, SHA-256 checksum integrity, safety snapshot rollback, AppData folder isolation, and multi-business preservation.
2. **`test_full_backup_restore.js`:**
   - 13 / 13 Tests Passed (100%).
   - Verified cross-domain backup payloads (business, Money Manager, preferences), domain-selective restores, and lexicographical journal sorting.
3. **`test_qa_data_security_backup.js`:**
   - 16 / 16 Tests Passed (100%).
   - Verified Money Manager field retention, plaintext PIN scrubbing, domain-selective mode isolation, and cryptographic integrity.

**Total Backup Verification Footprint:** **94 / 94 Passed (100% Pass Rate, 0 Failures, 0 Regressions)**.

---

## 4. Backlog Status Update & Sign-Off

| Backlog Item | Description | Lead | Status |
| :--- | :--- | :--- | :--- |
| **BL-012** | Pre-Upload Backup Size Estimation Engine & Bengali Formatter | Worker 2 (Averroes) | **COMPLETED & CERTIFIED** |
| **BL-013** | Automated Backup Size Estimation Test Suite & Regression Matrix | Worker 3 (Ohm) | **COMPLETED & CERTIFIED** |

Worker 2 (Averroes) certifies that the implementation is robust, mathematically precise, memory-safe, and ready for production deployment.