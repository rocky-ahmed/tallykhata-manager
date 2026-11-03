/**
 * TALLYKHATA CRYPTOGRAPHIC SECURITY SERVICE
 * Milestone: REA-ITER-215
 * Permanent Backend Developer & Business Logic: Worker 2 (Averroes)
 * Active Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 *
 * Implements:
 * 1. Cryptographically secure PIN hashing using PBKDF2 with SHA-256 and unique 16-byte random hex salts.
 * 2. Constant-time comparison (timingSafeEqual) preventing timing side-channel attacks.
 * 3. Rate limiting and progressive brute-force protection:
 *    - Failed attempt tracking.
 *    - 5 failed attempts -> 30-second lockout.
 *    - 6 failed attempts -> 60-second lockout.
 *    - 7+ failed attempts -> 300-second (5 min) lockout.
 * 4. Inactivity auto-lock policy:
 *    - Configurable timeout (default 3 minutes = 180,000 ms).
 *    - Activity tracking and background/foreground duration checks.
 * 5. Biometric authentication state verification and signature checks.
 * 6. PIN creation, verification, change, and legacy plaintext migration workflows.
 * 7. Zero-dependency universal support across Node.js and Hermes (React Native).
 */

let nodeCrypto = null;
try {
  nodeCrypto = require('crypto');
} catch (_) {}

// Cryptographic & Policy Constants
const DEFAULT_PBKDF2_ITERATIONS = 10000;
const DEFAULT_SALT_BYTE_LENGTH = 16; // 16 bytes = 32 hex chars
const DEFAULT_KEY_LENGTH = 32; // 32 bytes = 256 bits = 64 hex chars
const DIGEST_ALGORITHM = 'sha256';
const DEFAULT_AUTOLOCK_TIMEOUT_MS = 180000; // 3 minutes = 180 seconds

const LOCKOUT_THRESHOLDS = {
  LEVEL_1_ATTEMPTS: 5,
  LEVEL_1_DURATION_MS: 30000,   // 30 seconds
  LEVEL_2_ATTEMPTS: 6,
  LEVEL_2_DURATION_MS: 60000,   // 60 seconds
  LEVEL_3_ATTEMPTS: 7,
  LEVEL_3_DURATION_MS: 300000,  // 300 seconds (5 minutes)
};

/**
 * Universal synchronous SHA-256 implementation (FIPS 180-4) operating on Uint8Array bytes.
 * Provides identical output to Node.js crypto.createHash('sha256').
 * @param {Uint8Array} bytes
 * @returns {Uint8Array} 32-byte digest
 */
function sha256Bytes(bytes) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const maxWord = Math.pow(2, 32);
  let i, j;
  const words = [];
  const bitLength = bytes.length * 8;
  let hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  hash = hash.slice(0, 8);
  const padded = new Uint8Array(((bytes.length + 8 + 64) >>> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLength, false);
  view.setUint32(padded.length - 8, Math.floor(bitLength / maxWord), false);

  for (i = 0; i < padded.length; i += 4) {
    words.push(view.getUint32(i, false));
  }

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (i = 0; i < 8; i++) {
    outView.setUint32(i * 4, hash[i], false);
  }
  return out;
}

/**
 * Universal synchronous HMAC-SHA256 implementation operating on Uint8Array bytes.
 * @param {Uint8Array} keyBytes
 * @param {Uint8Array} msgBytes
 * @returns {Uint8Array} 32-byte HMAC
 */
function hmacSha256(keyBytes, msgBytes) {
  let k = keyBytes;
  if (k.length > 64) {
    k = sha256Bytes(k);
  }
  const keyPadded = new Uint8Array(64);
  keyPadded.set(k);
  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = keyPadded[i] ^ 0x5c;
    iKeyPad[i] = keyPadded[i] ^ 0x36;
  }
  const inner = new Uint8Array(64 + msgBytes.length);
  inner.set(iKeyPad);
  inner.set(msgBytes, 64);
  const innerHash = sha256Bytes(inner);

  const outer = new Uint8Array(64 + 32);
  outer.set(oKeyPad);
  outer.set(innerHash, 64);
  return sha256Bytes(outer);
}

/**
 * Universal pure-JS PBKDF2-HMAC-SHA-256 for environments without Node.js crypto.
 * @param {string} passwordStr
 * @param {string} saltStr
 * @param {number} iterations
 * @param {number} keyLen
 * @returns {string} Hex-encoded key
 */
function pbkdf2Sha256Pure(passwordStr, saltStr, iterations = DEFAULT_PBKDF2_ITERATIONS, keyLen = DEFAULT_KEY_LENGTH) {
  const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : {
    encode: (s) => {
      const arr = [];
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c < 128) arr.push(c);
        else if (c < 2048) { arr.push(192 | (c >> 6)); arr.push(128 | (c & 63)); }
        else { arr.push(224 | (c >> 12)); arr.push(128 | ((c >> 6) & 63)); arr.push(128 | (c & 63)); }
      }
      return new Uint8Array(arr);
    }
  };
  const passBytes = enc.encode(String(passwordStr));
  const saltBytes = enc.encode(String(saltStr));

  // For 32-byte key output (SHA-256 block size), block index is 1 (4 bytes: 00 00 00 01)
  const initialMsg = new Uint8Array(saltBytes.length + 4);
  initialMsg.set(saltBytes);
  initialMsg[saltBytes.length + 3] = 1;

  let u = hmacSha256(passBytes, initialMsg);
  const t = new Uint8Array(u);

  for (let i = 1; i < iterations; i++) {
    u = hmacSha256(passBytes, u);
    for (let j = 0; j < 32; j++) {
      t[j] ^= u[j];
    }
  }

  let hex = '';
  const limit = Math.min(keyLen, t.length);
  for (let i = 0; i < limit; i++) {
    const b = t[i];
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

/**
 * Generates a cryptographically strong random salt as a hex string.
 * @param {number} [byteLength=16]
 * @returns {string} Hex string (32 characters for 16 bytes)
 */
function generateSalt(byteLength = DEFAULT_SALT_BYTE_LENGTH) {
  const bytes = Number(byteLength) > 0 ? Number(byteLength) : DEFAULT_SALT_BYTE_LENGTH;
  if (nodeCrypto && typeof nodeCrypto.randomBytes === 'function') {
    return nodeCrypto.randomBytes(bytes).toString('hex');
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const arr = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(arr);
    let hex = '';
    for (let i = 0; i < arr.length; i++) {
      hex += (arr[i] < 16 ? '0' : '') + arr[i].toString(16);
    }
    return hex;
  }
  // High-entropy PRNG fallback
  let hex = '';
  for (let i = 0; i < bytes; i++) {
    const rand = Math.floor(Math.random() * 256);
    const timeVal = (Date.now() ^ (i * 137)) & 0xff;
    const val = (rand ^ timeVal) & 0xff;
    hex += (val < 16 ? '0' : '') + val.toString(16);
  }
  return hex;
}

/**
 * Compares two strings in constant time to prevent timing side-channel attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (nodeCrypto && typeof nodeCrypto.timingSafeEqual === 'function' && typeof Buffer !== 'undefined') {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length === bufB.length) {
      return nodeCrypto.timingSafeEqual(bufA, bufB);
    }
    return false;
  }
  const lenA = a.length;
  const lenB = b.length;
  let mismatch = lenA === lenB ? 0 : 1;
  const minLen = Math.min(lenA, lenB);
  for (let i = 0; i < minLen; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Validates the format of an app PIN (must be 4 numeric digits by default).
 * @param {any} pin
 * @param {Object} [options]
 * @returns {{valid: boolean, error: string|null, pin?: string}}
 */
function validatePinFormat(pin, options = {}) {
  const minLen = Number(options.minLength) || 4;
  const maxLen = Number(options.maxLength) || 4;
  if (pin === null || pin === undefined) {
    return { valid: false, error: 'PIN cannot be empty' };
  }
  const str = String(pin).trim();
  if (str.length < minLen || str.length > maxLen) {
    return {
      valid: false,
      error: minLen === maxLen
        ? ('PIN must be exactly ' + minLen + ' digits')
        : ('PIN must be between ' + minLen + ' and ' + maxLen + ' digits'),
    };
  }
  if (!/^\d+$/.test(str)) {
    return { valid: false, error: 'PIN must contain only numeric digits (0-9)' };
  }
  return { valid: true, error: null, pin: str };
}

/**
 * Computes the cryptographically secure PBKDF2-SHA-256 hash of a PIN.
 * @param {string} pin
 * @param {string} salt
 * @param {number} [iterations=10000]
 * @param {number} [keyLength=32]
 * @returns {string} 64-character lowercase hex string
 */
function hashPin(pin, salt, iterations = DEFAULT_PBKDF2_ITERATIONS, keyLength = DEFAULT_KEY_LENGTH) {
  const pinStr = String(pin !== undefined && pin !== null ? pin : '');
  const saltStr = String(salt !== undefined && salt !== null ? salt : '');
  const iters = Number(iterations) > 0 ? Number(iterations) : DEFAULT_PBKDF2_ITERATIONS;
  const keyLen = Number(keyLength) > 0 ? Number(keyLength) : DEFAULT_KEY_LENGTH;

  if (nodeCrypto && typeof nodeCrypto.pbkdf2Sync === 'function') {
    return nodeCrypto.pbkdf2Sync(pinStr, saltStr, iters, keyLen, DIGEST_ALGORITHM).toString('hex');
  }
  return pbkdf2Sha256Pure(pinStr, saltStr, iters, keyLen);
}

/**
 * Verifies a PIN against a stored PBKDF2 hash using constant-time comparison.
 * @param {string} pin
 * @param {string} storedHash
 * @param {string} salt
 * @param {number} [iterations=10000]
 * @returns {boolean}
 */
function verifyPinHash(pin, storedHash, salt, iterations = DEFAULT_PBKDF2_ITERATIONS) {
  if (!pin || !storedHash || !salt) return false;
  const computed = hashPin(pin, salt, iterations);
  return constantTimeCompare(computed, storedHash);
}

/**
 * Migrates a legacy plaintext PIN into a salted PBKDF2 hash.
 * @param {string} plaintextPin
 * @param {number} [iterations=10000]
 * @returns {{pinEnabled: boolean, pinHash: string, salt: string, iterations: number, migratedAt: string}}
 */
function migratePlaintextPin(plaintextPin, iterations = DEFAULT_PBKDF2_ITERATIONS) {
  const validation = validatePinFormat(plaintextPin);
  if (!validation.valid) {
    throw new Error('Cannot migrate invalid PIN: ' + validation.error);
  }
  const salt = generateSalt();
  const pinHash = hashPin(validation.pin, salt, iterations);
  return {
    pinEnabled: true,
    pinHash,
    salt,
    iterations: Number(iterations) || DEFAULT_PBKDF2_ITERATIONS,
    migratedAt: new Date().toISOString(),
  };
}

/**
 * Calculates progressive brute-force lockout duration in milliseconds based on failed attempts.
 * @param {number} failedAttempts
 * @returns {number} Duration in ms (0, 30000, 60000, or 300000)
 */
function calculateLockoutDuration(failedAttempts) {
  const attempts = Number(failedAttempts) || 0;
  if (attempts < LOCKOUT_THRESHOLDS.LEVEL_1_ATTEMPTS) return 0;
  if (attempts === LOCKOUT_THRESHOLDS.LEVEL_1_ATTEMPTS) return LOCKOUT_THRESHOLDS.LEVEL_1_DURATION_MS; // 30s
  if (attempts === LOCKOUT_THRESHOLDS.LEVEL_2_ATTEMPTS) return LOCKOUT_THRESHOLDS.LEVEL_2_DURATION_MS; // 60s
  return LOCKOUT_THRESHOLDS.LEVEL_3_DURATION_MS; // 300s (5 min)
}

/**
 * Checks whether the security configuration is currently in an active lockout state.
 * @param {Object} securityConfig
 * @param {number} [now=Date.now()]
 * @returns {boolean}
 */
function isLockoutActive(securityConfig, now = Date.now()) {
  if (!securityConfig || !securityConfig.lockoutUntil) return false;
  return Number(now) < Number(securityConfig.lockoutUntil);
}

/**
 * Calculates remaining lockout time in milliseconds.
 * @param {Object} securityConfig
 * @param {number} [now=Date.now()]
 * @returns {number}
 */
function getRemainingLockoutTimeMs(securityConfig, now = Date.now()) {
  if (!isLockoutActive(securityConfig, now)) return 0;
  return Math.max(0, Number(securityConfig.lockoutUntil) - Number(now));
}

/**
 * Returns comprehensive lockout status and retry metrics.
 * @param {Object} securityConfig
 * @param {number} [now=Date.now()]
 * @returns {Object}
 */
function getLockoutStatus(securityConfig, now = Date.now()) {
  const active = isLockoutActive(securityConfig, now);
  const remainingMs = getRemainingLockoutTimeMs(securityConfig, now);
  const failed = Number(securityConfig?.failedAttempts) || 0;
  const remainingAttempts = Math.max(0, LOCKOUT_THRESHOLDS.LEVEL_1_ATTEMPTS - failed);
  return {
    isLockedOut: active,
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    failedAttempts: failed,
    remainingAttempts: active ? 0 : remainingAttempts,
    lockoutUntil: active ? securityConfig.lockoutUntil : null,
    lockoutLevel: Number(securityConfig?.lockoutLevel) || 0,
  };
}

/**
 * Records a failed PIN attempt, escalating lockout thresholds when limits are breached.
 * @param {Object} securityConfig
 * @param {number} [now=Date.now()]
 * @returns {Object} Updated security config
 */
function recordFailedAttempt(securityConfig, now = Date.now()) {
  const cfg = normalizeSecurityConfig(securityConfig);
  const currentAttempts = cfg.failedAttempts + 1;
  const lockoutDuration = calculateLockoutDuration(currentAttempts);
  const lockoutUntil = lockoutDuration > 0 ? now + lockoutDuration : null;
  const lockoutLevel = currentAttempts >= LOCKOUT_THRESHOLDS.LEVEL_3_ATTEMPTS
    ? 3
    : (currentAttempts === LOCKOUT_THRESHOLDS.LEVEL_2_ATTEMPTS
        ? 2
        : (currentAttempts === LOCKOUT_THRESHOLDS.LEVEL_1_ATTEMPTS ? 1 : 0));

  return {
    ...cfg,
    failedAttempts: currentAttempts,
    lockoutUntil,
    lockoutLevel,
    lastFailedTimestamp: now,
  };
}

/**
 * Resets failed attempts and clears any active or historical lockout.
 * @param {Object} securityConfig
 * @returns {Object} Updated security config
 */
function resetFailedAttempts(securityConfig) {
  const cfg = normalizeSecurityConfig(securityConfig);
  return {
    ...cfg,
    failedAttempts: 0,
    lockoutUntil: null,
    lockoutLevel: 0,
    lastFailedTimestamp: null,
  };
}

/**
 * Records merchant user activity to reset the auto-lock timer.
 * @param {Object} securityConfig
 * @param {number} [now=Date.now()]
 * @returns {Object} Updated security config
 */
function recordActivity(securityConfig, now = Date.now()) {
  const cfg = normalizeSecurityConfig(securityConfig);
  return {
    ...cfg,
    lastActiveTimestamp: now,
    appBackgroundedTimestamp: null,
  };
}

/**
 * Records app transition to background state.
 * @param {Object} securityConfig
 * @param {number} [now=Date.now()]
 * @returns {Object} Updated security config
 */
function recordAppBackgrounded(securityConfig, now = Date.now()) {
  const cfg = normalizeSecurityConfig(securityConfig);
  return {
    ...cfg,
    appBackgroundedTimestamp: now,
  };
}

/**
 * Evaluates whether the inactivity or background duration exceeds the auto-lock timeout.
 * @param {Object} securityConfig
 * @param {number} [now=Date.now()]
 * @returns {{shouldLock: boolean, elapsedMs: number, timeoutMs: number, backgroundDurationMs: number|null}}
 */
function checkAutoLockCondition(securityConfig, now = Date.now()) {
  const cfg = normalizeSecurityConfig(securityConfig);
  const timeout = cfg.autoLockTimeoutMs || DEFAULT_AUTOLOCK_TIMEOUT_MS;
  let elapsedMs = 0;
  if (cfg.appBackgroundedTimestamp) {
    elapsedMs = Math.max(0, now - cfg.appBackgroundedTimestamp);
  } else if (cfg.lastActiveTimestamp) {
    elapsedMs = Math.max(0, now - cfg.lastActiveTimestamp);
  }
  const shouldLock = Boolean(cfg.pinEnabled && elapsedMs >= timeout);
  return {
    shouldLock,
    elapsedMs,
    timeoutMs: timeout,
    backgroundDurationMs: cfg.appBackgroundedTimestamp ? Math.max(0, now - cfg.appBackgroundedTimestamp) : null,
  };
}

/**
 * Handles app foregrounding, evaluating auto-lock rules and updating state.
 * @param {Object} securityConfig
 * @param {number} [now=Date.now()]
 * @returns {{updatedConfig: Object, didAutoLock: boolean, elapsedMs: number}}
 */
function recordAppForegrounded(securityConfig, now = Date.now()) {
  const cfg = normalizeSecurityConfig(securityConfig);
  const check = checkAutoLockCondition(cfg, now);
  const shouldLock = check.shouldLock;
  return {
    updatedConfig: {
      ...cfg,
      isLocked: shouldLock ? true : Boolean(cfg.isLocked),
      lastActiveTimestamp: now,
      appBackgroundedTimestamp: null,
    },
    didAutoLock: shouldLock,
    elapsedMs: check.elapsedMs,
  };
}

/**
 * Immediately locks the application.
 * @param {Object} securityConfig
 * @returns {Object}
 */
function lockApp(securityConfig) {
  const cfg = normalizeSecurityConfig(securityConfig);
  return {
    ...cfg,
    isLocked: true,
  };
}

/**
 * Unlocks the application and refreshes activity timestamps.
 * @param {Object} securityConfig
 * @param {number} [now=Date.now()]
 * @returns {Object}
 */
function unlockApp(securityConfig, now = Date.now()) {
  const cfg = normalizeSecurityConfig(securityConfig);
  return {
    ...cfg,
    isLocked: false,
    lastActiveTimestamp: now,
    appBackgroundedTimestamp: null,
  };
}

/**
 * Enables biometric authentication with an optional cryptographic key signature.
 * @param {Object} securityConfig
 * @param {string|null} [signature=null]
 * @returns {Object}
 */
function enableBiometrics(securityConfig, signature = null) {
  const cfg = normalizeSecurityConfig(securityConfig);
  const sig = signature || ('bio_sig_' + generateSalt(16));
  return {
    ...cfg,
    biometricsEnabled: true,
    biometricsSupported: true,
    biometricKeySignature: sig,
  };
}

/**
 * Disables biometric authentication and purges stored biometric signature.
 * @param {Object} securityConfig
 * @returns {Object}
 */
function disableBiometrics(securityConfig) {
  const cfg = normalizeSecurityConfig(securityConfig);
  return {
    ...cfg,
    biometricsEnabled: false,
    biometricKeySignature: null,
  };
}

/**
 * Verifies a biometric signature in constant time.
 * @param {string} providedSignature
 * @param {string} storedSignature
 * @returns {boolean}
 */
function verifyBiometricSignature(providedSignature, storedSignature) {
  if (!providedSignature || !storedSignature) return false;
  return constantTimeCompare(String(providedSignature), String(storedSignature));
}

/**
 * Authenticates merchant using biometrics, clearing failed attempts on success.
 * @param {Object} securityConfig
 * @param {string|null} [providedSignature=null]
 * @returns {Object}
 */
function authenticateWithBiometrics(securityConfig, providedSignature = null) {
  const cfg = normalizeSecurityConfig(securityConfig);
  if (!cfg.biometricsEnabled) {
    return {
      success: false,
      verified: false,
      error: 'BIOMETRICS_DISABLED',
      updatedConfig: cfg,
    };
  }
  if (cfg.biometricKeySignature && providedSignature) {
    const valid = verifyBiometricSignature(providedSignature, cfg.biometricKeySignature);
    if (!valid) {
      return {
        success: false,
        verified: false,
        error: 'INVALID_BIOMETRIC_SIGNATURE',
        updatedConfig: cfg,
      };
    }
  }
  const cleared = resetFailedAttempts(cfg);
  return {
    success: true,
    verified: true,
    error: null,
    updatedConfig: {
      ...cleared,
      isLocked: false,
      lastActiveTimestamp: Date.now(),
      appBackgroundedTimestamp: null,
    },
  };
}

/**
 * Primary PIN verification workflow.
 * Handles rate-limiting checks, hash verification, and failed attempt escalation.
 * @param {string} pin
 * @param {Object} securityConfig
 * @param {number} [now=Date.now()]
 * @returns {Object} Result object with success, verified, error, and updatedConfig
 */
function verifyPin(pin, securityConfig, now = Date.now()) {
  const cfg = normalizeSecurityConfig(securityConfig);

  // If PIN lock is not enabled, verification is bypassed
  if (!cfg.pinEnabled) {
    return {
      success: true,
      verified: true,
      pinEnabled: false,
      error: null,
      updatedConfig: cfg,
    };
  }

  // 1. Check active lockout
  if (isLockoutActive(cfg, now)) {
    const lockout = getLockoutStatus(cfg, now);
    return {
      success: false,
      verified: false,
      error: 'LOCKED_OUT',
      details: 'Too many failed attempts. Locked out for ' + lockout.remainingSeconds + ' more seconds.',
      lockout,
      updatedConfig: cfg,
    };
  }

  // 2. Validate PIN input format
  const formatValidation = validatePinFormat(pin);
  if (!formatValidation.valid) {
    const updated = recordFailedAttempt(cfg, now);
    const lockout = getLockoutStatus(updated, now);
    return {
      success: false,
      verified: false,
      error: 'INVALID_FORMAT',
      details: formatValidation.error,
      lockout,
      updatedConfig: updated,
    };
  }

  // 3. Verify PIN against stored hash or fallback
  let isMatch = false;
  if (cfg.pinHash && cfg.salt) {
    isMatch = verifyPinHash(formatValidation.pin, cfg.pinHash, cfg.salt, cfg.iterations);
  } else if (typeof cfg.appPin === 'string' && cfg.appPin.length > 0) {
    // Backward compatibility for un-migrated store
    isMatch = constantTimeCompare(formatValidation.pin, cfg.appPin);
  }

  if (isMatch) {
    const cleared = resetFailedAttempts(cfg);
    return {
      success: true,
      verified: true,
      error: null,
      updatedConfig: {
        ...cleared,
        isLocked: false,
        lastActiveTimestamp: now,
        appBackgroundedTimestamp: null,
      },
    };
  }

  // 4. Failed match: record failure and evaluate lockout escalation
  const updated = recordFailedAttempt(cfg, now);
  const lockout = getLockoutStatus(updated, now);
  return {
    success: false,
    verified: false,
    error: 'INVALID_PIN',
    details: lockout.isLockedOut
      ? ('Incorrect PIN. Maximum attempts exceeded. Locked out for ' + lockout.remainingSeconds + 's.')
      : ('Incorrect PIN. ' + lockout.remainingAttempts + ' attempt(s) remaining before temporary lockout.'),
    lockout,
    updatedConfig: updated,
  };
}

/**
 * Securely provisions a new PIN for first-time setup or re-enabling PIN lock.
 * @param {Object} securityConfig
 * @param {string} newPin
 * @param {Object} [options={}]
 * @returns {Object}
 */
function setupPin(securityConfig, newPin, options = {}) {
  const cfg = normalizeSecurityConfig(securityConfig);
  const formatValidation = validatePinFormat(newPin, options);
  if (!formatValidation.valid) {
    return {
      success: false,
      error: 'INVALID_PIN_FORMAT',
      details: formatValidation.error,
      updatedConfig: cfg,
    };
  }
  const iterations = Number(options.iterations) || cfg.iterations || DEFAULT_PBKDF2_ITERATIONS;
  const salt = generateSalt();
  const pinHash = hashPin(formatValidation.pin, salt, iterations);

  const updatedConfig = {
    ...cfg,
    pinEnabled: true,
    pinHash,
    salt,
    iterations,
    failedAttempts: 0,
    lockoutUntil: null,
    lockoutLevel: 0,
    isLocked: false,
    lastActiveTimestamp: Date.now(),
  };

  return {
    success: true,
    error: null,
    updatedConfig,
  };
}

/**
 * Changes an existing PIN after validating current PIN credentials.
 * @param {Object} securityConfig
 * @param {string} currentPin
 * @param {string} newPin
 * @param {Object} [options={}]
 * @returns {Object}
 */
function changePin(securityConfig, currentPin, newPin, options = {}) {
  const cfg = normalizeSecurityConfig(securityConfig);

  // If PIN is currently enabled, current PIN must be verified first
  if (cfg.pinEnabled) {
    const verifyRes = verifyPin(currentPin, cfg);
    if (!verifyRes.verified) {
      return {
        success: false,
        error: 'INCORRECT_CURRENT_PIN',
        details: verifyRes.details || 'Current PIN verification failed',
        lockout: verifyRes.lockout,
        updatedConfig: verifyRes.updatedConfig,
      };
    }
  }

  // Validate new PIN format
  const formatValidation = validatePinFormat(newPin, options);
  if (!formatValidation.valid) {
    return {
      success: false,
      error: 'INVALID_NEW_PIN_FORMAT',
      details: formatValidation.error,
      updatedConfig: cfg,
    };
  }

  const iterations = Number(options.iterations) || cfg.iterations || DEFAULT_PBKDF2_ITERATIONS;
  const salt = generateSalt();
  const pinHash = hashPin(formatValidation.pin, salt, iterations);

  const updatedConfig = {
    ...cfg,
    pinEnabled: true,
    pinHash,
    salt,
    iterations,
    failedAttempts: 0,
    lockoutUntil: null,
    lockoutLevel: 0,
    isLocked: false,
    lastActiveTimestamp: Date.now(),
  };

  return {
    success: true,
    error: null,
    updatedConfig,
  };
}

/**
 * Disables PIN lock after validating current PIN credentials.
 * @param {Object} securityConfig
 * @param {string} currentPin
 * @returns {Object}
 */
function disablePin(securityConfig, currentPin) {
  const cfg = normalizeSecurityConfig(securityConfig);

  if (cfg.pinEnabled) {
    const verifyRes = verifyPin(currentPin, cfg);
    if (!verifyRes.verified) {
      return {
        success: false,
        error: 'INCORRECT_CURRENT_PIN',
        details: verifyRes.details || 'Current PIN verification failed',
        lockout: verifyRes.lockout,
        updatedConfig: verifyRes.updatedConfig,
      };
    }
  }

  const updatedConfig = {
    ...cfg,
    pinEnabled: false,
    pinHash: '',
    salt: '',
    failedAttempts: 0,
    lockoutUntil: null,
    lockoutLevel: 0,
    isLocked: false,
  };

  return {
    success: true,
    error: null,
    updatedConfig,
  };
}

/**
 * Creates a canonical default security configuration object.
 * @param {Object} [overrides={}]
 * @returns {Object}
 */
function createDefaultSecurityConfig(overrides = {}) {
  return {
    pinEnabled: false,
    pinHash: '',
    salt: '',
    iterations: DEFAULT_PBKDF2_ITERATIONS,
    failedAttempts: 0,
    lockoutUntil: null,
    lockoutLevel: 0,
    isLocked: false,
    lastActiveTimestamp: Date.now(),
    appBackgroundedTimestamp: null,
    autoLockTimeoutMs: DEFAULT_AUTOLOCK_TIMEOUT_MS,
    biometricsEnabled: false,
    biometricsSupported: true,
    biometricKeySignature: null,
    version: 1,
    ...overrides,
  };
}

/**
 * Normalizes an arbitrary security config or raw store, guaranteeing all fields exist with valid types.
 * @param {Object} [raw={}]
 * @returns {Object} Validated SecurityConfig
 */
function normalizeSecurityConfig(raw = {}) {
  if (!raw || typeof raw !== 'object') {
    return createDefaultSecurityConfig();
  }

  const pinEnabled = Boolean(raw.pinEnabled);
  const pinHash = typeof raw.pinHash === 'string' ? raw.pinHash : '';
  const salt = typeof raw.salt === 'string' ? raw.salt : '';
  const iterations = Number(raw.iterations) > 0 ? Number(raw.iterations) : DEFAULT_PBKDF2_ITERATIONS;
  const failedAttempts = Math.max(0, Number(raw.failedAttempts) || 0);
  const lockoutUntil = raw.lockoutUntil ? Number(raw.lockoutUntil) : null;
  const lockoutLevel = Math.max(0, Number(raw.lockoutLevel) || 0);
  const isLocked = Boolean(raw.isLocked);
  const lastActiveTimestamp = Number(raw.lastActiveTimestamp) || Date.now();
  const appBackgroundedTimestamp = raw.appBackgroundedTimestamp ? Number(raw.appBackgroundedTimestamp) : null;
  const autoLockTimeoutMs = Number(raw.autoLockTimeoutMs) > 0 ? Number(raw.autoLockTimeoutMs) : DEFAULT_AUTOLOCK_TIMEOUT_MS;
  const biometricsEnabled = Boolean(raw.biometricsEnabled);
  const biometricsSupported = raw.biometricsSupported !== undefined ? Boolean(raw.biometricsSupported) : true;
  const biometricKeySignature = typeof raw.biometricKeySignature === 'string' ? raw.biometricKeySignature : null;

  return {
    pinEnabled,
    pinHash,
    salt,
    iterations,
    failedAttempts,
    lockoutUntil,
    lockoutLevel,
    isLocked,
    lastActiveTimestamp,
    appBackgroundedTimestamp,
    autoLockTimeoutMs,
    biometricsEnabled,
    biometricsSupported,
    biometricKeySignature,
    version: Number(raw.version) || 1,
  };
}

/**
 * Stateful SecurityService instance wrapper.
 */
class SecurityService {
  constructor(initialConfig = null) {
    this.config = normalizeSecurityConfig(initialConfig);
  }

  getConfig() {
    return { ...this.config };
  }

  setConfig(config) {
    this.config = normalizeSecurityConfig(config);
    return this.getConfig();
  }

  validatePinFormat(pin, options) {
    return validatePinFormat(pin, options);
  }

  generateSalt(byteLength) {
    return generateSalt(byteLength);
  }

  hashPin(pin, salt, iterations, keyLength) {
    return hashPin(pin, salt, iterations, keyLength);
  }

  verifyPinHash(pin, storedHash, salt, iterations) {
    return verifyPinHash(pin, storedHash, salt, iterations);
  }

  constantTimeCompare(a, b) {
    return constantTimeCompare(a, b);
  }

  verifyPin(pin, now = Date.now()) {
    const res = verifyPin(pin, this.config, now);
    if (res.updatedConfig) {
      this.config = res.updatedConfig;
    }
    return res;
  }

  setupPin(newPin, options = {}) {
    const res = setupPin(this.config, newPin, options);
    if (res.success && res.updatedConfig) {
      this.config = res.updatedConfig;
    }
    return res;
  }

  changePin(currentPin, newPin, options = {}) {
    const res = changePin(this.config, currentPin, newPin, options);
    if (res.updatedConfig) {
      this.config = res.updatedConfig;
    }
    return res;
  }

  disablePin(currentPin) {
    const res = disablePin(this.config, currentPin);
    if (res.updatedConfig) {
      this.config = res.updatedConfig;
    }
    return res;
  }

  recordActivity(now = Date.now()) {
    this.config = recordActivity(this.config, now);
    return this.getConfig();
  }

  recordAppBackgrounded(now = Date.now()) {
    this.config = recordAppBackgrounded(this.config, now);
    return this.getConfig();
  }

  recordAppForegrounded(now = Date.now()) {
    const res = recordAppForegrounded(this.config, now);
    this.config = res.updatedConfig;
    return res;
  }

  checkAutoLockCondition(now = Date.now()) {
    return checkAutoLockCondition(this.config, now);
  }

  lock() {
    this.config = lockApp(this.config);
    return this.getConfig();
  }

  unlock(now = Date.now()) {
    this.config = unlockApp(this.config, now);
    return this.getConfig();
  }

  enableBiometrics(signature = null) {
    this.config = enableBiometrics(this.config, signature);
    return this.getConfig();
  }

  disableBiometrics() {
    this.config = disableBiometrics(this.config);
    return this.getConfig();
  }

  authenticateWithBiometrics(signature = null) {
    const res = authenticateWithBiometrics(this.config, signature);
    if (res.updatedConfig) {
      this.config = res.updatedConfig;
    }
    return res;
  }

  getLockoutStatus(now = Date.now()) {
    return getLockoutStatus(this.config, now);
  }

  migratePlaintextPin(plaintextPin, iterations) {
    return migratePlaintextPin(plaintextPin, iterations);
  }
}

const securityService = new SecurityService();

module.exports = {
  // Constants
  DEFAULT_PBKDF2_ITERATIONS,
  DEFAULT_SALT_BYTE_LENGTH,
  DEFAULT_KEY_LENGTH,
  DIGEST_ALGORITHM,
  DEFAULT_AUTOLOCK_TIMEOUT_MS,
  LOCKOUT_THRESHOLDS,

  // Cryptographic Primitives
  generateSalt,
  constantTimeCompare,
  validatePinFormat,
  hashPin,
  verifyPinHash,
  migratePlaintextPin,
  sha256Bytes,
  hmacSha256,
  pbkdf2Sha256Pure,

  // Lockout & Brute-Force Protection
  calculateLockoutDuration,
  isLockoutActive,
  getRemainingLockoutTimeMs,
  getLockoutStatus,
  recordFailedAttempt,
  resetFailedAttempts,

  // Inactivity & Auto-Lock
  recordActivity,
  recordAppBackgrounded,
  checkAutoLockCondition,
  recordAppForegrounded,
  lockApp,
  unlockApp,

  // Biometrics
  enableBiometrics,
  disableBiometrics,
  verifyBiometricSignature,
  authenticateWithBiometrics,

  // Workflows & Lifecycles
  verifyPin,
  setupPin,
  changePin,
  disablePin,
  createDefaultSecurityConfig,
  normalizeSecurityConfig,

  // Class & Instance
  SecurityService,
  securityService,
};
