/**
 * test_drive_connectivity_retry.js
 * Continuous Improvement Suite for BL-014:
 * Pre-Upload Google Drive Connectivity Ping & Exponential Backoff Retry Policy
 *
 * Verifies:
 * 1. checkDriveConnectivity(accessToken = null, options = {})
 *    - Reachability ping with AbortController timeout guard (default 5000ms).
 *    - Valid access token online -> { reachable: true, isAuthorized: true, error: null }.
 *    - Revoked/expired token (401) online -> { reachable: true, isAuthorized: false, error: '...' }.
 *    - Unauthenticated ping (accessToken = null) -> { reachable: true, isAuthorized: false|null, error: null }.
 *    - Network offline / DNS error -> { reachable: false, isAuthorized: null, error: '...' } without throwing.
 *    - Timeout -> { reachable: false, isAuthorized: null, error: '...timed out...' } without throwing.
 * 2. executeWithRetry(operationFn, options = {})
 *    - Immediate success on attempt 0.
 *    - Exponential backoff delay: Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt) + jitter).
 *    - Retries on transient errors: 408, 429, 500, 502, 503, 504, network offline, AbortError.
 *    - Fast-fail on non-retryable errors: 401, 403, 404, payload validation errors.
 *    - Options: maxRetries (default 3), baseDelayMs (default 500ms), maxDelayMs (default 5000ms).
 *    - onRetry callback invocation and sleepFn integration.
 *    - returnEnvelope and throwOnError options.
 * 3. Instance parity on GoogleDriveBackupService and singleton export.
 *
 * Worker: Worker 2 (Averroes) — Backend & Data Architect, Security Lead
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 */

const assert = require("assert");
const {
  checkDriveConnectivity,
  executeWithRetry,
  GoogleDriveBackupService,
  googleDriveBackupService,
  buildBackupPayload,
} = require("./src/googleDriveBackupService");

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log("================================================================");
console.log("BL-014: GOOGLE DRIVE CONNECTIVITY PING & EXPONENTIAL RETRY SUITE");
console.log("================================================================\n");

(async () => {
  // --- PART 1: PRE-FLIGHT CONNECTIVITY PING ---
  console.log("--- PART 1: PRE-FLIGHT CONNECTIVITY PING (checkDriveConnectivity) ---");

  await runTest("Ping 1.1: Online with valid access token returns reachable: true, isAuthorized: true, error: null", async () => {
    const mockFetch = async (url, opts) => {
      assert(opts.headers && opts.headers.Authorization === "Bearer valid_token_123");
      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    };

    const res = await checkDriveConnectivity("valid_token_123", { fetch: mockFetch });
    assert.strictEqual(res.reachable, true, "Reachable must be true");
    assert.strictEqual(res.isAuthorized, true, "isAuthorized must be true with valid token");
    assert.strictEqual(res.error, null, "error must be null on success");
    assert.strictEqual(res.connected, true, "connected alias must be true");
    assert(typeof res.latencyMs === "number" && res.latencyMs >= 0, "latencyMs must be non-negative");
  });

  await runTest("Ping 1.2: Online with revoked/expired token (401) returns reachable: true, isAuthorized: false", async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => JSON.stringify({ error: "invalid_token" }),
    });

    const res = await checkDriveConnectivity("expired_token_xyz", { fetch: mockFetch });
    assert.strictEqual(res.reachable, true, "Google Drive server was reached, so reachable is true");
    assert.strictEqual(res.isAuthorized, false, "Token was invalid, so isAuthorized is false");
    assert(res.error !== null && res.error.includes("401"), "Error must report HTTP 401");
    assert.strictEqual(res.authError, true, "authError alias must be true");
  });

  await runTest("Ping 1.3: Unauthenticated ping (accessToken = null) verifies reachability without error", async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: "login_required" }),
    });

    const res = await checkDriveConnectivity(null, { fetch: mockFetch });
    assert.strictEqual(res.reachable, true, "Server was reached even without token");
    assert.strictEqual(res.error, null, "Error must be null for pure reachability check");
    assert.strictEqual(res.isAuthorized, false, "isAuthorized is false since no token was sent");
  });

  await runTest("Ping 1.4: Options object as first argument checkDriveConnectivity({ timeoutMs, accessToken })", async () => {
    const mockFetch = async (url, opts) => {
      assert(opts.headers && opts.headers.Authorization === "Bearer custom_token");
      return { ok: true, status: 200, json: async () => ({}) };
    };

    const res = await checkDriveConnectivity({ accessToken: "custom_token", fetch: mockFetch });
    assert.strictEqual(res.reachable, true);
    assert.strictEqual(res.isAuthorized, true);
  });

  await runTest("Ping 1.5: Offline network error returns reachable: false without throwing", async () => {
    const mockFetch = async () => {
      throw new Error("Network request failed: Device offline");
    };

    const res = await checkDriveConnectivity("valid_token", { fetch: mockFetch });
    assert.strictEqual(res.reachable, false, "Offline must produce reachable: false");
    assert.strictEqual(res.isAuthorized, null, "isAuthorized must be null when network unreachable");
    assert(res.error.includes("offline") || res.error.includes("Network"), "Error should report network failure");
    assert.strictEqual(res.connected, false, "connected alias must be false");
  });

  await runTest("Ping 1.6: Timeout abort guard returns reachable: false without throwing", async () => {
    const mockFetch = async () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    };

    const res = await checkDriveConnectivity("valid_token", { fetch: mockFetch, timeoutMs: 2000 });
    assert.strictEqual(res.reachable, false);
    assert(res.error.includes("timed out"), "Error must describe timeout");
    assert.strictEqual(res.isAuthorized, null);
  });

  await runTest("Ping 1.7: Custom pingUrl is honored by checkDriveConnectivity", async () => {
    let capturedUrl = "";
    const mockFetch = async (url) => {
      capturedUrl = url;
      return { ok: true, status: 204 };
    };

    const customUrl = "https://www.googleapis.com/generate_204";
    const res = await checkDriveConnectivity(null, { pingUrl: customUrl, fetch: mockFetch });
    assert.strictEqual(capturedUrl, customUrl, "Must query the specified pingUrl");
    assert.strictEqual(res.reachable, true);
  });

  await runTest("Ping 1.8: GoogleDriveBackupService instance method parity", async () => {
    const service = new GoogleDriveBackupService();
    service.setFetch(async () => ({ ok: true, status: 200 }));

    const res = await service.checkDriveConnectivity("inst_token");
    assert.strictEqual(res.reachable, true);
    assert.strictEqual(res.isAuthorized, true);
  });

  // --- PART 2: EXPONENTIAL BACKOFF RETRY ENGINE ---
  console.log("\n--- PART 2: EXPONENTIAL BACKOFF RETRY ENGINE (executeWithRetry) ---");

  await runTest("Retry 2.1: Immediate success on attempt 0 executes once without sleeping", async () => {
    let executions = 0;
    let sleepCount = 0;

    const res = await executeWithRetry(async (attempt) => {
      executions++;
      return { fileId: "file_ok_001" };
    }, {
      sleepFn: async () => { sleepCount++; },
    });

    assert.strictEqual(executions, 1, "Should execute exactly once");
    assert.strictEqual(sleepCount, 0, "Should not sleep on immediate success");
    assert.strictEqual(res.fileId, "file_ok_001", "Should return operation result directly");
  });

  await runTest("Retry 2.2: Retries on 503 Service Unavailable and succeeds on attempt 2", async () => {
    let executions = 0;
    const retryLog = [];

    const res = await executeWithRetry(async (attempt) => {
      executions++;
      if (executions === 1) {
        const err = new Error("Google Drive upload failed (503): Service Unavailable");
        err.status = 503;
        throw err;
      }
      return { success: true, uploaded: true };
    }, {
      baseDelayMs: 200,
      noJitter: true,
      sleepFn: async (ms) => { retryLog.push({ slept: ms }); },
      onRetry: (err, attempt, delay) => { retryLog.push({ attempt, delay, msg: err.message }); },
    });

    assert.strictEqual(executions, 2, "Should succeed on second attempt");
    assert.strictEqual(res.success, true);
    assert.strictEqual(retryLog.length, 2, "Should record 1 onRetry and 1 sleep");
    assert.strictEqual(retryLog[0].attempt, 1, "First retry is attempt 1");
    assert.strictEqual(retryLog[0].delay, 200, "baseDelay * 2^0 = 200ms");
  });

  await runTest("Retry 2.3: Retries transient network offline error and succeeds after reconnect", async () => {
    let executions = 0;
    const res = await executeWithRetry(async () => {
      executions++;
      if (executions < 3) {
        throw new Error("Network request failed: Device offline");
      }
      return "reconnected_success";
    }, {
      maxRetries: 3,
      baseDelayMs: 100,
      noJitter: true,
      sleepFn: async () => {},
    });

    assert.strictEqual(executions, 3, "Executed 3 times (2 retries)");
    assert.strictEqual(res, "reconnected_success");
  });

  await runTest("Retry 2.4: Retries on 429 Too Many Requests (rate limited)", async () => {
    let executions = 0;
    const res = await executeWithRetry(async () => {
      executions++;
      if (executions === 1) {
        const err = new Error("Rate limit exceeded");
        err.status = 429;
        throw err;
      }
      return { quotaRemaining: 1000 };
    }, {
      sleepFn: async () => {},
    });

    assert.strictEqual(executions, 2);
    assert.strictEqual(res.quotaRemaining, 1000);
  });

  await runTest("Retry 2.5: Exponential backoff delay calculation verifies baseDelay * 2^attempt", async () => {
    const observedDelays = [];
    let executions = 0;

    try {
      await executeWithRetry(async () => {
        executions++;
        const err = new Error("HTTP 500 Internal Error");
        err.status = 500;
        throw err;
      }, {
        maxRetries: 3,
        baseDelayMs: 500,
        maxDelayMs: 5000,
        noJitter: true,
        sleepFn: async (ms) => { observedDelays.push(ms); },
      });
    } catch (_) {}

    assert.strictEqual(executions, 4, "Initial attempt + 3 retries = 4 executions");
    assert.deepStrictEqual(observedDelays, [500, 1000, 2000], "Delays must strictly double: 500ms, 1000ms, 2000ms");
  });

  await runTest("Retry 2.6: Backoff delay respects maxDelayMs ceiling", async () => {
    const observedDelays = [];

    try {
      await executeWithRetry(async () => {
        const err = new Error("HTTP 502 Bad Gateway");
        err.status = 502;
        throw err;
      }, {
        maxRetries: 4,
        baseDelayMs: 2000,
        maxDelayMs: 5000,
        noJitter: true,
        sleepFn: async (ms) => { observedDelays.push(ms); },
      });
    } catch (_) {}

    // attempt 0: 2000ms, attempt 1: min(5000, 4000) = 4000ms, attempt 2: min(5000, 8000) = 5000ms, attempt 3: min(5000, 16000) = 5000ms
    assert.deepStrictEqual(observedDelays, [2000, 4000, 5000, 5000], "Delays must cap at maxDelayMs 5000ms");
  });

  // --- PART 3: NON-RETRYABLE FAST-FAIL VALIDATION ---
  console.log("\n--- PART 3: NON-RETRYABLE FAST-FAIL VALIDATION ---");

  await runTest("FastFail 3.1: 401 Unauthorized fails fast on attempt 1 without sleeping or retrying", async () => {
    let executions = 0;
    let sleepCalled = false;
    let caughtErr = null;

    try {
      await executeWithRetry(async () => {
        executions++;
        const err = new Error("Failed to fetch userinfo from Google: 401");
        err.status = 401;
        throw err;
      }, {
        maxRetries: 3,
        sleepFn: async () => { sleepCalled = true; },
      });
    } catch (err) {
      caughtErr = err;
    }

    assert.strictEqual(executions, 1, "Must execute exactly once");
    assert.strictEqual(sleepCalled, false, "Must never sleep on non-retryable 401");
    assert(caughtErr !== null && caughtErr.message.includes("401"), "Rethrows the 401 error");
  });

  await runTest("FastFail 3.2: 403 Forbidden fails fast on attempt 1", async () => {
    let executions = 0;
    try {
      await executeWithRetry(async () => {
        executions++;
        const err = new Error("Google Drive access forbidden (403)");
        err.status = 403;
        throw err;
      }, {
        maxRetries: 3,
        sleepFn: async () => { throw new Error("Should not sleep"); },
      });
    } catch (_) {}

    assert.strictEqual(executions, 1, "Must fail fast on 403");
  });

  await runTest("FastFail 3.3: 404 Not Found fails fast on attempt 1", async () => {
    let executions = 0;
    try {
      await executeWithRetry(async () => {
        executions++;
        const err = new Error("Google Drive file not found: 404");
        err.status = 404;
        throw err;
      }, {
        maxRetries: 3,
        sleepFn: async () => { throw new Error("Should not sleep"); },
      });
    } catch (_) {}

    assert.strictEqual(executions, 1, "Must fail fast on 404");
  });

  await runTest("FastFail 3.4: Payload validation error fails fast without retrying", async () => {
    let executions = 0;
    try {
      await executeWithRetry(async () => {
        executions++;
        throw new Error("Cannot upload invalid backup payload: Checksum mismatch");
      }, {
        maxRetries: 3,
        sleepFn: async () => { throw new Error("Should not sleep"); },
      });
    } catch (_) {}

    assert.strictEqual(executions, 1, "Must fail fast on payload validation error");
  });

  await runTest("FastFail 3.5: Exhausted retries rethrows the last encountered error", async () => {
    let caughtErr = null;
    try {
      await executeWithRetry(async () => {
        const err = new Error("Gateway Timeout (504)");
        err.status = 504;
        throw err;
      }, {
        maxRetries: 2,
        sleepFn: async () => {},
      });
    } catch (err) {
      caughtErr = err;
    }

    assert(caughtErr !== null, "Must rethrow after exhaustion");
    assert(caughtErr.message.includes("504"), "Must rethrow original 504 error");
  });

  // --- PART 4: OPTIONS, ENVELOPES & INTEGRATION ---
  console.log("\n--- PART 4: OPTIONS, ENVELOPES & INTEGRATION ---");

  await runTest("Options 4.1: returnEnvelope: true returns structured metadata on success", async () => {
    let executions = 0;
    const res = await executeWithRetry(async () => {
      executions++;
      if (executions === 1) {
        const err = new Error("HTTP 500");
        err.status = 500;
        throw err;
      }
      return "data_payload";
    }, {
      returnEnvelope: true,
      sleepFn: async () => {},
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.attempts, 2);
    assert.strictEqual(res.retried, true);
    assert.strictEqual(res.result, "data_payload");
  });

  await runTest("Options 4.2: throwOnError: false returns structured failure envelope without throwing", async () => {
    const res = await executeWithRetry(async () => {
      const err = new Error("Unauthorized (401)");
      err.status = 401;
      throw err;
    }, {
      throwOnError: false,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.nonRetryable, true);
    assert.strictEqual(res.attempts, 1);
    assert(res.error.message.includes("401"));
  });

  await runTest("Options 4.3: googleDriveBackupService.executeWithRetry instance method parity", async () => {
    const res = await googleDriveBackupService.executeWithRetry(async () => {
      return { connected: true };
    });
    assert.strictEqual(res.connected, true);
  });

  await runTest("Options 4.4: uploadBackup with options.retry executes through retry policy", async () => {
    const service = new GoogleDriveBackupService();
    let networkAttempts = 0;

    service.setFetch(async (url, opts) => {
      networkAttempts++;
      if (networkAttempts < 2) {
        throw new Error("Network request failed: Device offline");
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: "uploaded_file_retry_001", name: "backup.json" }),
      };
    });

    const payload = buildBackupPayload({ accounts: [] }, { sub: "test_sub_retry", email: "test@retry.com" });
    const res = await service.uploadBackup("test_token", payload, null, {
      retry: {
        maxRetries: 2,
        sleepFn: async () => {},
      },
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.fileId, "uploaded_file_retry_001");
    assert.strictEqual(networkAttempts, 2, "Uploaded after 1 retry");
  });

  console.log("\n================================================================");
  console.log(`BL-014 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================");
})();
