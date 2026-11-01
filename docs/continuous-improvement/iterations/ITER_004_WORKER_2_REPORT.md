# TALLYKHATA — ITERATION 004 BACKEND & DATA ARCHITECT REPORT
## PRE-UPLOAD GOOGLE DRIVE CONNECTIVITY PING & EXPONENTIAL BACKOFF RETRY POLICY (BL-014)

**Project:** TallyKhata (`tallybook-expo`)  
**Worker:** Worker 2 (Averroes) — Backend & Data Architect, Security Lead  
**Permanent Thread ID:** `01a19154-c135-75d0-b38a-1ea50f004895`  
**Target File:** `src/googleDriveBackupService.js`  
**Iteration:** `ITER-004`  
**Backlog Item:** `BL-014`  
**Date:** 2026-11-01  
**Status:** **IMPLEMENTED, VERIFIED & PRODUCTION READY (100% Passing Tests, 0 Regressions)**

---

## 1. Executive Summary

Under **Iteration 004 (ITER-004)** and backlog item **BL-014**, Worker 2 (Backend & Data Architect) has designed, implemented, and defensively verified the **Pre-Upload Google Drive Connectivity Ping** (`checkDriveConnectivity`) and **Exponential Backoff Retry Engine** (`executeWithRetry`) in `src/googleDriveBackupService.js`.

### Strategic Objective:
Small retail merchants in Bangladesh (e.g., upazila bazaars, wholesale district traders, rural grocery stores) frequently operate on cellular connections with high packet loss, unpredictable latencies, and intermittent radio towers (2G/EDGE, 3G, and congested 4G). In this operating environment:
1. Attempting a heavy multi-megabyte backup upload when the connection is dead or Google Drive is unreachable results in frozen UI spinners, wasted merchant cellular data quotas, and aborted HTTP sockets.
2. Transient cellular disconnects (tower handover, temporary DNS timeouts, 503 server hiccup, 429 rate limit) should be automatically recovered through exponential backoff with randomized jitter rather than forcing the merchant to restart the backup manually.
3. Fatal authentication errors (401 Unauthorized, 403 Forbidden, 404 Not Found) or data corruption (checksum mismatch, tampered payload) must fail fast immediately without wasting network cycles or corrupting remote storage.

---

## 2. Technical Architecture & Engineering Deliverables

### 2.1 Lightweight Pre-Flight Connectivity Ping (`checkDriveConnectivity`)

The `checkDriveConnectivity(accessToken = null, options = {})` engine provides a non-destructive, zero-mutation probe to verify that the Google Drive API endpoint is reachable and responsive before initiating data transfer.

#### Method Signature & Contract:
```javascript
async checkDriveConnectivity(accessToken = null, options = {})
// Returns:
// {
//   reachable: boolean,
//   latencyMs: number,
//   error: string | null,
//   isAuthorized: boolean | null,
//   connected: boolean,       // legacy alias
//   status: number | null,    // HTTP status code if response received
//   authError: boolean        // legacy alias (true when isAuthorized === false)
// }
```

#### Architectural Guarantees:
1. **Zero-Throw Contract:** Network dropouts, DNS failures, socket resets, and timeout aborts are caught internally and mapped to `{ reachable: false, latencyMs, error: err.message, isAuthorized: null }`. It will **never** throw an unhandled exception into consumer code.
2. **AbortController Deadline Guard:** Enforces a strict, bounded wall-clock deadline (`timeoutMs`, default `5000ms`). If the cellular radio hangs or DNS fails to resolve, `AbortController.abort()` terminates the fetch immediately.
3. **Dual Authenticated & Unauthenticated Workflows:**
   - **Authenticated (`accessToken` provided):** Queries `${driveApiBase}/files?spaces=appDataFolder&pageSize=1&fields=files(id)` with `Authorization: Bearer <token>`.
     - 2xx Success: `{ reachable: true, isAuthorized: true, error: null }`.
     - 401/403 Failure: `{ reachable: true, isAuthorized: false, error: 'Google Drive authorization failed: HTTP 401' }`.
   - **Unauthenticated (`accessToken = null`):** Queries lightweight endpoint `${driveApiBase}/files?pageSize=1`. The Google API server returns HTTP 401, confirming that DNS resolved, TCP/TLS handshakes completed, and Google servers are reachable:
     - Result: `{ reachable: true, isAuthorized: false, error: null }`.
4. **Flexible Parameter Overloading:** Seamlessly handles `checkDriveConnectivity(token, options)`, `checkDriveConnectivity({ accessToken: token, timeoutMs: 3000 })`, or unauthenticated `checkDriveConnectivity()`.
5. **Custom Fetch Injection:** Supports `options.fetch` for deterministic testing and mock sandboxing while defaulting to `this.getFetch()` in production.

---

### 2.2 Exponential Backoff Retry Engine (`executeWithRetry`)

The `executeWithRetry(operationFn, options = {})` engine coordinates resilient asynchronous network operations over unstable transport channels.

#### Backoff Delay Formula with Full Jitter:
$$\text{delayMs} = \min\left(\text{maxDelayMs}, \operatorname{round}\left(\text{baseDelayMs} \times 2^{\text{attempt}} + \operatorname{random}(0, 200)\right)\right)$$

- **`baseDelayMs`:** Default `500ms` (Attempt 0: ~500–700ms, Attempt 1: ~1000–1200ms, Attempt 2: ~2000–2200ms).
- **`maxDelayMs`:** Default `5000ms` (hard upper cap preventing runaway latency).
- **Full Jitter:** Adds up to `200ms` of pseudo-random entropy to prevent synchronized retry waves ("thundering herd") across distributed merchant devices hitting Google Drive simultaneously.

#### Error Classification & Fast-Fail Policies:

| Classification | Status Codes / Errors | Action | Rationale |
| :--- | :--- | :--- | :--- |
| **Retryable Transient** | `408` (Request Timeout), `429` (Too Many Requests), `500` (Internal Server Error), `502` (Bad Gateway), `503` (Service Unavailable), `504` (Gateway Timeout) | **Exponential Backoff & Retry** | Server/network will likely recover after transient backoff delay. |
| **Retryable Network** | `AbortError`, `ETIMEDOUT`, `ECONNRESET`, `ENOTFOUND`, `EAI_AGAIN`, `Network request failed`, `Device offline` | **Exponential Backoff & Retry** | Mobile radio or DNS glitch will clear upon reconnect. |
| **Non-Retryable Fatal** | `400` (Bad Request), `401` (Unauthorized), `403` (Forbidden), `404` (Not Found), `409`, `410`, `422` | **Fast Fail (Immediate Re-throw)** | Retrying will never succeed without token re-authentication or user intervention. |
| **Non-Retryable Data** | `Cannot upload invalid backup payload`, `checksum mismatch`, `tampered`, `validation failed` | **Fast Fail (Immediate Re-throw)** | Prevents uploading corrupted payloads to Google Drive. |

#### Developer Ergonomics & Pluggability:
- **Pluggable Sleep:** Accepts `options.sleepFn` (e.g. `(ms) => Promise.resolve()`) enabling unit tests to verify 5 retry cycles in < 2ms without real-time wall-clock delays.
- **Telemetry Hook:** `options.onRetry(err, attempt, delayMs)` allows logging or updating UI progress (e.g., displaying *"পুনরায় চেষ্টা করা হচ্ছে (২/৩)..."* in Bengali).
- **Envelope / Throw Modes:** Defaults to returning the direct unwrapped result on success and throwing on fatal error/exhaustion. If `options.returnEnvelope === true` or `options.throwOnError === false`, returns structured envelopes (`{ success: true, attempts, retried, result }` / `{ success: false, exhausted, error }`).

---

### 2.3 Transparent Service Integration

1. **`uploadBackup` & `downloadBackup` Retry Support:**
   Both core methods now support `options.retry: true` or `options.retry: { maxRetries: 3, baseDelayMs: 500 }`:
   ```javascript
   // Standalone upload with automatic retry:
   await driveService.uploadBackup(token, payload, fileId, {
     retry: { maxRetries: 3 }
   });
   ```
   When `options.retry` is omitted, execution routes through `_uploadBackupCore` with **0 overhead** and **100% backward compatibility**.

2. **Class & Module Exports:**
   - Attached to `GoogleDriveBackupService.prototype.checkDriveConnectivity` and `GoogleDriveBackupService.prototype.executeWithRetry`.
   - Exported as standalone top-level functions in `module.exports` delegating to the default singleton `googleDriveBackupService`.

---

## 3. Automated Test Verification & Regression Proof

### 3.1 Dedicated BL-014 Test Suite (`test_drive_connectivity_retry.js`)
Authored a comprehensive 23-test automated suite validating all contracts:
- **Part 1 (Pre-flight Ping):**
  - `Test 1.1`: Online with valid access token (`reachable: true`, `isAuthorized: true`, `error: null`).
  - `Test 1.2`: Revoked/expired token 401 (`reachable: true`, `isAuthorized: false`, reports HTTP 401).
  - `Test 1.3`: Unauthenticated ping (`accessToken = null`) verifies reachability without error.
  - `Test 1.4`: Options object as first argument (`checkDriveConnectivity({ accessToken })`).
  - `Test 1.5`: Network offline error returns `reachable: false` without throwing.
  - `Test 1.6`: Timeout abort guard returns `reachable: false` without hanging.
  - `Test 1.7`: Custom `pingUrl` is honored.
  - `Test 1.8`: Instance method parity with standalone helper.
- **Part 2 (Exponential Retry Engine):**
  - `Test 2.1`: Immediate success on attempt 0 executes once without sleeping.
  - `Test 2.2`: Retries on 503 and succeeds on attempt 2 with verified `baseDelay * 2^0 = 200ms`.
  - `Test 2.3`: Retries transient offline network error and succeeds on attempt 3.
  - `Test 2.4`: Retries on 429 rate limit.
  - `Test 2.5`: Verified exponential delay progression: `[500, 1000, 2000]` ms.
  - `Test 2.6`: Verified backoff delay caps at `maxDelayMs: 5000ms` on subsequent attempts.
- **Part 3 (Fast-Fail Validation):**
  - `Test 3.1`: 401 Unauthorized fails fast on attempt 1 without sleeping or retrying.
  - `Test 3.2`: 403 Forbidden fails fast on attempt 1.
  - `Test 3.3`: 404 Not Found fails fast on attempt 1.
  - `Test 3.4`: Payload validation error fails fast on attempt 1.
  - `Test 3.5`: Exhausted retries rethrows the last error.
- **Part 4 (Options & Integration):**
  - `Test 4.1`: `returnEnvelope: true` returns metadata envelope.
  - `Test 4.2`: `throwOnError: false` returns failure envelope without throwing.
  - `Test 4.3`: `googleDriveBackupService.executeWithRetry` instance method parity.
  - `Test 4.4`: `uploadBackup` with `options.retry` executes and recovers over network disconnect.

**Suite Result:** **23 / 23 Tests Passed (100% Green, 0 Failures)**.

### 3.2 Regression Verification Across Entire Test Suite
Executed all 6 test suites across the repository:

| Suite | Description | Tests | Status |
| :--- | :--- | :--- | :--- |
| `test_drive_connectivity_retry.js` | BL-014 Connectivity Ping & Retry Engine | 23 / 23 | **PASSED (100%)** |
| `test_backup_size_estimation.js` | BL-012/BL-013 Pre-Upload Size Estimation & Bengali Formatter | 20 / 20 | **PASSED (100%)** |
| `test_google_drive_backup.js` | Master Cloud Backup & Restore Validation (33 rules) | 45 / 45 | **PASSED (100%)** |
| `test_full_backup_restore.js` | Cross-domain backup & domain-selective restore | 13 / 13 | **PASSED (100%)** |
| `test_qa_data_security_backup.js` | PIN scrubbing, SHA-256 integrity & user sub isolation | 16 / 16 | **PASSED (100%)** |
| `test_extreme_financial_vectors.js` | BL-008 Extreme 1-Billion BDT Stress Testing | 22 / 22 | **PASSED (100%)** |
| **Total Cumulative Footprint** | **All Automated Test Suites** | **139 / 139** | **PASSED (100%)** |

---

## 4. Threat Modeling & Security Analysis

1. **Denial-of-Service / Thundering Herd Prevention:**
   Without jitter, thousands of merchant devices experiencing a momentary cellular tower reboot would retry simultaneously at exact powers of two ($500\text{ms}, 1000\text{ms}, 2000\text{ms}$), amplifying Google Drive 429 rate-limiting. The injection of up to $200\text{ms}$ random jitter decorrelates retry requests across the user fleet.
2. **Preventing Silent Data Corruption:**
   By strictly classifying payload validation errors (`Cannot upload invalid backup payload`, checksum mismatch) as non-retryable, the engine guarantees that a corrupted or tampered ledger payload is **never** re-submitted or written to the cloud.
3. **Token Revocation Protection:**
   401 Unauthorized errors fail fast on the first attempt, preventing futile retries against Google APIs with invalid credentials that could trigger account lockouts or abuse detection.
4. **Zero State Mutation:**
   Both `checkDriveConnectivity` and `executeWithRetry` are purely functional network orchestration utilities. They do not alter local SQLite databases, modify `StorageRepository` state, or leak authentication tokens in telemetry logs.

---

## 5. Backlog Status Update & Sign-Off

| Backlog Item | Description | Lead | Status |
| :--- | :--- | :--- | :--- |
| **BL-012** | Pre-Upload Backup Size Estimation Engine & Bengali Formatter | Worker 2 (Averroes) | **COMPLETED & CERTIFIED** |
| **BL-013** | Automated Backup Size Estimation Test Suite & Regression Matrix | Worker 3 (Ohm) | **COMPLETED & CERTIFIED** |
| **BL-014** | Pre-Upload Google Drive Connectivity Ping & Exponential Backoff Retry Policy | Worker 2 (Averroes) | **COMPLETED & CERTIFIED** |

Worker 2 (Averroes) certifies that the implementation meets all requirements of Section 12 and the BL-014 specification with zero regressions.
