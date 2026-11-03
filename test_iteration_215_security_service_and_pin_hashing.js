/**
 * TALLYKHATA SECURITY SERVICE, PIN HASHING & AUTO-LOCK TEST SUITE
 * Milestone: REA-ITER-215
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic / Backend & Data Architect)
 * Registered Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 *
 * Verifies:
 * 1. Cryptographic salt generation (16 bytes = 32 hex chars, high entropy, uniqueness).
 * 2. Timing attack resistance (constantTimeCompare).
 * 3. Strict 4-digit PIN regex invariant (^\d{4}$).
 * 4. PBKDF2/SHA-256 PIN hashing & deterministic verification.
 * 5. Progressive brute-force rate limiting & escalating lockout (30s at 5, 60s at 6, 300s at 7+).
 * 6. Lockout enforcement: blocks authentication attempts during lockout window.
 * 7. Inactivity auto-lock policy & app backgrounding duration evaluation (3 minutes = 180,000 ms).
 * 8. Biometric authentication acceleration & signature verification.
 * 9. PIN change and disable lifecycle workflows with verification guards.
 * 10. Backward-compatible migration of legacy plaintext PINs from @tallykhata_state_v6.
 * 11. StorageRepository integration with writeQueue mutex serialization.
 * 12. Google Drive cloud backup sanitization & safe restore defaults.
 */

const assert = require('assert');
const {
  DEFAULT_PBKDF2_ITERATIONS,
  DEFAULT_SALT_BYTE_LENGTH,
  DEFAULT_KEY_LENGTH,
  DEFAULT_AUTOLOCK_TIMEOUT_MS,
  LOCKOUT_THRESHOLDS,
  generateSalt,
  constantTimeCompare,
  validatePinFormat,
  hashPin,
  verifyPinHash,
  migratePlaintextPin,
  sha256Bytes,
  hmacSha256,
  pbkdf2Sha256Pure,
  calculateLockoutDuration,
  isLockoutActive,
  getRemainingLockoutTimeMs,
  getLockoutStatus,
  recordFailedAttempt,
  resetFailedAttempts,
  recordActivity,
  recordAppBackgrounded,
  checkAutoLockCondition,
  recordAppForegrounded,
  lockApp,
  unlockApp,
  enableBiometrics,
  disableBiometrics,
  verifyBiometricSignature,
  authenticateWithBiometrics,
  verifyPin,
  setupPin,
  changePin,
  disablePin,
  createDefaultSecurityConfig,
  normalizeSecurityConfig,
  SecurityService,
  securityService,
} = require('./src/securityService');

const {
  StorageRepository,
  storageRepository,
  createDefaultState,
  getSecurityConfig,
  verifyAppPin,
  setAppPinSecure,
  changeAppPinSecure,
  disableAppPinSecure,
  recordAppActivity,
  recordAppBackgrounded: repoRecordBackgrounded,
  recordAppForegrounded: repoRecordForegrounded,
  unlockAppWithPin,
  unlockAppWithBiometrics,
  getAppLockoutStatus,
} = require('./src/storageRepository');

let passedTests = 0;
let totalTests = 0;

function pass(testName, detail = '') {
  passedTests++;
  totalTests++;
  console.log(`  [PASS] TEST ${totalTests}: ${testName}${detail ? ' -> ' + JSON.stringify(detail) : ''}`);
}

function fail(testName, err) {
  totalTests++;
  console.error(`  [FAIL] TEST ${totalTests}: ${testName}`);
  console.error(err);
  process.exit(1);
}

// In-memory AsyncStorage mock adapter
function createMockAdapter(initialState = {}) {
  const storage = new Map();
  for (const [k, v] of Object.entries(initialState)) {
    storage.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  return {
    getItem: async (key) => storage.get(key) || null,
    setItem: async (key, val) => { storage.set(key, val); },
    removeItem: async (key) => { storage.delete(key); },
    clear: async () => { storage.clear(); },
    _dump: () => Object.fromEntries(storage.entries()),
  };
}

async function runSuite() {
  console.log('===============================================================================');
  console.log('TALLYKHATA ITERATION 215: SECURITY SERVICE & PIN HASHING ARCHITECTURE');
  console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
  console.log('Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895');
  console.log('===============================================================================');

  // TEST 1: Salt Generation Uniqueness & Entropy
  try {
    const salts = new Set();
    for (let i = 0; i < 100; i++) {
      const salt = generateSalt(16);
      assert.strictEqual(typeof salt, 'string', 'Salt must be string');
      assert.strictEqual(salt.length, 32, '16-byte salt must yield 32 hex chars');
      assert.strictEqual(/^[0-9a-f]{32}$/.test(salt), true, 'Salt must be valid lowercase hex');
      salts.add(salt);
    }
    assert.strictEqual(salts.size, 100, 'All 100 generated salts must be globally unique');
    pass('Salt Generation Uniqueness & Entropy', { samples: 100, hexLength: 32 });
  } catch (err) { fail('Salt Generation Uniqueness & Entropy', err); }

  // TEST 2: Constant-Time Comparison Timing Attack Defense
  try {
    assert.strictEqual(constantTimeCompare('secret_pin_hash_1', 'secret_pin_hash_1'), true);
    assert.strictEqual(constantTimeCompare('secret_pin_hash_1', 'secret_pin_hash_2'), false);
    assert.strictEqual(constantTimeCompare('short', 'longer_string'), false);
    assert.strictEqual(constantTimeCompare('', ''), true);
    assert.strictEqual(constantTimeCompare(null, 'test'), false);
    assert.strictEqual(constantTimeCompare('test', undefined), false);
    assert.strictEqual(constantTimeCompare(1234, 1234), false, 'Non-string inputs must return false');
    pass('Constant-Time Comparison Timing Attack Defense');
  } catch (err) { fail('Constant-Time Comparison Timing Attack Defense', err); }

  // TEST 3: Strict 4-Digit PIN Regex Invariant (^\d{4}$)
  try {
    assert.strictEqual(validatePinFormat('1234').valid, true);
    assert.strictEqual(validatePinFormat('0000').valid, true);
    assert.strictEqual(validatePinFormat('9876').valid, true);
    assert.strictEqual(validatePinFormat(' 1234 ').valid, true, 'Trim whitespace before validation');

    // Invalid formats
    assert.strictEqual(validatePinFormat('123').valid, false, '3 digits rejected');
    assert.strictEqual(validatePinFormat('12345').valid, false, '5 digits rejected');
    assert.strictEqual(validatePinFormat('abcd').valid, false, 'Alpha chars rejected');
    assert.strictEqual(validatePinFormat('12a4').valid, false, 'Alphanumeric rejected');
    assert.strictEqual(validatePinFormat('    ').valid, false, 'Blank string rejected');
    assert.strictEqual(validatePinFormat('').valid, false, 'Empty string rejected');
    assert.strictEqual(validatePinFormat(null).valid, false, 'Null rejected');
    assert.strictEqual(validatePinFormat(undefined).valid, false, 'Undefined rejected');
    pass('Strict 4-Digit PIN Regex Invariant (^\d{4}$)');
  } catch (err) { fail('Strict 4-Digit PIN Regex Invariant (^\d{4}$)', err); }

  // TEST 4: PBKDF2/SHA-256 PIN Hashing & Cross-Engine Parity
  try {
    const salt = 'a1b2c3d4e5f6789012345678abcdef01';
    const hashNative = hashPin('4321', salt, 1000);
    const hashPure = pbkdf2Sha256Pure('4321', salt, 1000, 32);

    assert.strictEqual(hashNative.length, 64, 'PBKDF2-SHA-256 hash must be 64 hex chars (32 bytes)');
    assert.strictEqual(hashNative, hashPure, 'Pure JS PBKDF2 implementation must match Node.js crypto exactly');

    // Verification
    assert.strictEqual(verifyPinHash('4321', hashNative, salt, 1000), true, 'Correct PIN verifies');
    assert.strictEqual(verifyPinHash('4322', hashNative, salt, 1000), false, 'Incorrect PIN fails verification');
    assert.strictEqual(verifyPinHash('', hashNative, salt, 1000), false, 'Empty PIN fails verification');
    assert.strictEqual(verifyPinHash('4321', 'tampered_hash', salt, 1000), false, 'Tampered hash fails verification');
    pass('PBKDF2/SHA-256 PIN Hashing & Cross-Engine Parity', { hash: hashNative.slice(0, 16) + '...' });
  } catch (err) { fail('PBKDF2/SHA-256 PIN Hashing & Cross-Engine Parity', err); }

  // TEST 5: Legacy Plaintext PIN Migration without Data Loss
  try {
    const legacyPlaintext = '7890';
    const migrated = migratePlaintextPin(legacyPlaintext);

    assert.strictEqual(migrated.pinEnabled, true);
    assert.strictEqual(typeof migrated.pinHash, 'string');
    assert.strictEqual(migrated.pinHash.length, 64);
    assert.strictEqual(typeof migrated.salt, 'string');
    assert.strictEqual(migrated.salt.length, 32);
    assert.strictEqual(migrated.iterations, DEFAULT_PBKDF2_ITERATIONS);
    assert.strictEqual(typeof migrated.migratedAt, 'string');

    // Verify migrated hash succeeds against legacy PIN
    const verifyMigrated = verifyPinHash('7890', migrated.pinHash, migrated.salt, migrated.iterations);
    assert.strictEqual(verifyMigrated, true, 'Migrated hash must verify original plaintext PIN');

    // Verify invalid migration throws
    assert.throws(() => migratePlaintextPin('123'), /Cannot migrate invalid PIN/);
    pass('Legacy Plaintext PIN Migration without Data Loss');
  } catch (err) { fail('Legacy Plaintext PIN Migration without Data Loss', err); }

  // TEST 6: Progressive Rate Limiting & Escalating Lockout Schedule
  try {
    let cfg = createDefaultSecurityConfig({ pinEnabled: true });
    cfg = setupPin(cfg, '2580').updatedConfig;

    const baseNow = 1700000000000;

    // Failures 1 through 4: no lockout, remaining attempts decrement
    for (let i = 1; i <= 4; i++) {
      const res = verifyPin('9999', cfg, baseNow);
      assert.strictEqual(res.verified, false);
      assert.strictEqual(res.lockout.isLockedOut, false);
      assert.strictEqual(res.lockout.failedAttempts, i);
      assert.strictEqual(res.lockout.remainingAttempts, 5 - i);
      cfg = res.updatedConfig;
    }

    // 5th Failure: 30-second lockout
    const res5 = verifyPin('9999', cfg, baseNow);
    assert.strictEqual(res5.verified, false);
    assert.strictEqual(res5.lockout.isLockedOut, true);
    assert.strictEqual(res5.lockout.remainingSeconds, 30);
    assert.strictEqual(res5.lockout.lockoutLevel, 1);
    assert.strictEqual(res5.updatedConfig.lockoutUntil, baseNow + 30000);
    cfg = res5.updatedConfig;

    // Attempt during 30s lockout: must return LOCKED_OUT even if correct PIN is entered!
    const duringLockout = verifyPin('2580', cfg, baseNow + 10000);
    assert.strictEqual(duringLockout.verified, false);
    assert.strictEqual(duringLockout.error, 'LOCKED_OUT');
    assert.strictEqual(duringLockout.lockout.isLockedOut, true);
    assert.strictEqual(duringLockout.lockout.remainingSeconds, 20);

    // After 30s expiry: 6th failure -> 60-second lockout
    const afterExpiry1 = baseNow + 31000;
    assert.strictEqual(isLockoutActive(cfg, afterExpiry1), false, 'Lockout should have expired');
    const res6 = verifyPin('9999', cfg, afterExpiry1);
    assert.strictEqual(res6.verified, false);
    assert.strictEqual(res6.lockout.isLockedOut, true);
    assert.strictEqual(res6.lockout.remainingSeconds, 60);
    assert.strictEqual(res6.lockout.lockoutLevel, 2);
    assert.strictEqual(res6.updatedConfig.lockoutUntil, afterExpiry1 + 60000);
    cfg = res6.updatedConfig;

    // After 60s expiry: 7th failure -> 300-second (5 min) lockout
    const afterExpiry2 = afterExpiry1 + 61000;
    assert.strictEqual(isLockoutActive(cfg, afterExpiry2), false, 'Lockout should have expired');
    const res7 = verifyPin('9999', cfg, afterExpiry2);
    assert.strictEqual(res7.verified, false);
    assert.strictEqual(res7.lockout.isLockedOut, true);
    assert.strictEqual(res7.lockout.remainingSeconds, 300);
    assert.strictEqual(res7.lockout.lockoutLevel, 3);
    assert.strictEqual(res7.updatedConfig.lockoutUntil, afterExpiry2 + 300000);
    cfg = res7.updatedConfig;

    // Successful authentication after lockout expiry resets failedAttempts to 0
    const afterExpiry3 = afterExpiry2 + 301000;
    const successRes = verifyPin('2580', cfg, afterExpiry3);
    assert.strictEqual(successRes.verified, true);
    assert.strictEqual(successRes.updatedConfig.failedAttempts, 0);
    assert.strictEqual(successRes.updatedConfig.lockoutUntil, null);
    assert.strictEqual(successRes.updatedConfig.lockoutLevel, 0);

    pass('Progressive Rate Limiting & Escalating Lockout Schedule', {
      level1: '30s',
      level2: '60s',
      level3: '300s',
    });
  } catch (err) { fail('Progressive Rate Limiting & Escalating Lockout Schedule', err); }

  // TEST 7: Inactivity & App Background Auto-Lock Engine
  try {
    let cfg = createDefaultSecurityConfig({ pinEnabled: true, autoLockTimeoutMs: 180000 });
    const startTime = 2000000;

    // Active usage
    cfg = recordActivity(cfg, startTime);
    assert.strictEqual(cfg.isLocked, false);

    // Background app at startTime + 10,000 ms
    cfg = recordAppBackgrounded(cfg, startTime + 10000);
    assert.strictEqual(cfg.appBackgroundedTimestamp, startTime + 10000);

    // Foreground after 2 minutes (120,000 ms) -> 130,000 ms total elapsed -> SHOULD NOT LOCK (timeout is 180,000 ms)
    const fg1 = recordAppForegrounded(cfg, startTime + 130000);
    assert.strictEqual(fg1.didAutoLock, false);
    assert.strictEqual(fg1.updatedConfig.isLocked, false);
    assert.strictEqual(fg1.updatedConfig.appBackgroundedTimestamp, null);
    cfg = fg1.updatedConfig;

    // Background app again at startTime + 140,000 ms
    cfg = recordAppBackgrounded(cfg, startTime + 140000);

    // Foreground after 3.5 minutes background duration (210,000 ms elapsed >= 180,000 ms) -> MUST AUTO-LOCK
    const fg2 = recordAppForegrounded(cfg, startTime + 350000);
    assert.strictEqual(fg2.didAutoLock, true);
    assert.strictEqual(fg2.updatedConfig.isLocked, true);
    cfg = fg2.updatedConfig;

    // Unlock app
    cfg = unlockApp(cfg, startTime + 355000);
    assert.strictEqual(cfg.isLocked, false);
    assert.strictEqual(cfg.lastActiveTimestamp, startTime + 355000);

    // If PIN is disabled, background timeout must NOT lock the app
    let cfgNoPin = createDefaultSecurityConfig({ pinEnabled: false, autoLockTimeoutMs: 180000 });
    cfgNoPin = recordAppBackgrounded(cfgNoPin, startTime);
    const fgNoPin = recordAppForegrounded(cfgNoPin, startTime + 500000);
    assert.strictEqual(fgNoPin.didAutoLock, false);
    assert.strictEqual(fgNoPin.updatedConfig.isLocked, false);

    pass('Inactivity & App Background Auto-Lock Engine', { timeoutMs: 180000 });
  } catch (err) { fail('Inactivity & App Background Auto-Lock Engine', err); }

  // TEST 8: Biometric Acceleration & Signature Verification
  try {
    let cfg = createDefaultSecurityConfig({ pinEnabled: true, isLocked: true, failedAttempts: 3 });

    // Biometrics disabled by default
    const preAuth = authenticateWithBiometrics(cfg);
    assert.strictEqual(preAuth.verified, false);
    assert.strictEqual(preAuth.error, 'BIOMETRICS_DISABLED');

    // Enable biometrics with signature
    const testSignature = 'tally_bio_sig_f89312b98e72';
    cfg = enableBiometrics(cfg, testSignature);
    assert.strictEqual(cfg.biometricsEnabled, true);
    assert.strictEqual(cfg.biometricKeySignature, testSignature);

    // Authenticate with valid signature
    const bioSuccess = authenticateWithBiometrics(cfg, testSignature);
    assert.strictEqual(bioSuccess.verified, true);
    assert.strictEqual(bioSuccess.updatedConfig.isLocked, false);
    assert.strictEqual(bioSuccess.updatedConfig.failedAttempts, 0);

    // Authenticate with invalid signature
    const bioFail = authenticateWithBiometrics(cfg, 'wrong_signature');
    assert.strictEqual(bioFail.verified, false);
    assert.strictEqual(bioFail.error, 'INVALID_BIOMETRIC_SIGNATURE');

    // Disable biometrics
    cfg = disableBiometrics(cfg);
    assert.strictEqual(cfg.biometricsEnabled, false);
    assert.strictEqual(cfg.biometricKeySignature, null);

    pass('Biometric Acceleration & Signature Verification');
  } catch (err) { fail('Biometric Acceleration & Signature Verification', err); }

  // TEST 9: Secure PIN Change & Disable Workflows
  try {
    let cfg = createDefaultSecurityConfig({ pinEnabled: false });

    // Setup initial PIN: 1357
    const setup = setupPin(cfg, '1357');
    assert.strictEqual(setup.success, true);
    assert.strictEqual(setup.updatedConfig.pinEnabled, true);
    cfg = setup.updatedConfig;

    // Change PIN with invalid current PIN: should fail
    const changeFail = changePin(cfg, '9999', '2468');
    assert.strictEqual(changeFail.success, false);
    assert.strictEqual(changeFail.error, 'INCORRECT_CURRENT_PIN');

    // Change PIN with invalid format for new PIN: should fail
    const changeBadFormat = changePin(cfg, '1357', '246');
    assert.strictEqual(changeBadFormat.success, false);
    assert.strictEqual(changeBadFormat.error, 'INVALID_NEW_PIN_FORMAT');

    // Change PIN successfully to 2468
    const changeSucc = changePin(cfg, '1357', '2468');
    assert.strictEqual(changeSucc.success, true);
    cfg = changeSucc.updatedConfig;

    // Verify old PIN no longer works, new PIN works
    assert.strictEqual(verifyPin('1357', cfg).verified, false);
    assert.strictEqual(verifyPin('2468', cfg).verified, true);

    // Disable PIN with incorrect credential: fails
    const disableFail = disablePin(cfg, '0000');
    assert.strictEqual(disableFail.success, false);
    assert.strictEqual(disableFail.error, 'INCORRECT_CURRENT_PIN');

    // Disable PIN with correct credential: succeeds
    const disableSucc = disablePin(cfg, '2468');
    assert.strictEqual(disableSucc.success, true);
    assert.strictEqual(disableSucc.updatedConfig.pinEnabled, false);
    assert.strictEqual(disableSucc.updatedConfig.pinHash, '');
    assert.strictEqual(disableSucc.updatedConfig.salt, '');

    pass('Secure PIN Change & Disable Workflows');
  } catch (err) { fail('Secure PIN Change & Disable Workflows', err); }

  // TEST 10: Stateful SecurityService Wrapper Class
  try {
    const service = new SecurityService();
    assert.strictEqual(service.getConfig().pinEnabled, false);

    const setupRes = service.setupPin('8888');
    assert.strictEqual(setupRes.success, true);
    assert.strictEqual(service.getConfig().pinEnabled, true);

    // Verification
    const v1 = service.verifyPin('8888');
    assert.strictEqual(v1.verified, true);

    const v2 = service.verifyPin('1111');
    assert.strictEqual(v2.verified, false);
    assert.strictEqual(service.getConfig().failedAttempts, 1);

    // Auto-lock state
    service.lock();
    assert.strictEqual(service.getConfig().isLocked, true);

    service.unlock();
    assert.strictEqual(service.getConfig().isLocked, false);

    pass('Stateful SecurityService Wrapper Class');
  } catch (err) { fail('Stateful SecurityService Wrapper Class', err); }

  // TEST 11: StorageRepository Direct Integration & Migration on Load
  try {
    // 1. Initial seed contains valid securityConfig
    const mockStorage = createMockAdapter();
    const repo = new StorageRepository(mockStorage);
    const loadRes = await repo.loadInitialData();
    assert.strictEqual(loadRes.success, true);

    const secCfg = repo.getSecurityConfig();
    assert.strictEqual(typeof secCfg, 'object');
    assert.strictEqual(secCfg.pinEnabled, false);
    assert.strictEqual(secCfg.failedAttempts, 0);

    // 2. Setup secure PIN in repo
    const setRes = await repo.setAppPinSecure('9876');
    assert.strictEqual(setRes.success, true);
    assert.strictEqual(repo.currentStore.pinEnabled, true);
    assert.strictEqual(repo.currentStore.appPin, '', 'Plaintext appPin must be wiped');
    assert.strictEqual(repo.currentStore.securityConfig.pinHash.length, 64);

    // 3. Verify PIN in repo
    const checkValid = await repo.verifyAppPin('9876');
    assert.strictEqual(checkValid.verified, true);

    const checkInvalid = await repo.verifyAppPin('0000');
    assert.strictEqual(checkInvalid.verified, false);
    assert.strictEqual(repo.currentStore.securityConfig.failedAttempts, 1);

    // 4. Test legacy migration from raw store with plaintext appPin: '5555'
    const legacyStore = {
      ...createDefaultState(),
      pinEnabled: true,
      appPin: '5555',
      securityConfig: null,
    };
    const mockLegacyAdapter = createMockAdapter({ '@tallykhata_state_v6': legacyStore });
    const legacyRepo = new StorageRepository(mockLegacyAdapter);
    const legacyLoad = await legacyRepo.loadInitialData();
    assert.strictEqual(legacyLoad.success, true);

    // Verifies legacy PIN was automatically migrated to salted PBKDF2 hash
    assert.strictEqual(legacyRepo.currentStore.pinEnabled, true);
    assert.strictEqual(legacyRepo.currentStore.appPin, '', 'appPin must be scrubbed after migration');
    assert.strictEqual(legacyRepo.currentStore.securityConfig.pinHash.length, 64);
    assert.strictEqual(legacyRepo.currentStore.securityConfig.salt.length, 32);

    // Verify 5555 works against migrated repo
    const legacyVerify = await legacyRepo.verifyAppPin('5555');
    assert.strictEqual(legacyVerify.verified, true);

    pass('StorageRepository Direct Integration & Migration on Load');
  } catch (err) { fail('StorageRepository Direct Integration & Migration on Load', err); }

  // TEST 12: StorageRepository Auto-Lock & Biometric Unlock
  try {
    const mockStorage = createMockAdapter();
    const repo = new StorageRepository(mockStorage);
    await repo.loadInitialData();
    await repo.setAppPinSecure('3333');

    // Enable biometrics
    const cfg = repo.getSecurityConfig();
    const bioCfg = enableBiometrics(cfg, 'tally_device_sig_991');
    await repo.mutateStore((s) => ({ ...s, securityConfig: bioCfg }));

    // Simulate backgrounding and auto-lock threshold
    const baseTime = 5000000;
    await repo.recordAppActivity(baseTime);
    await repo.recordAppBackgrounded(baseTime + 1000);

    // Foreground 4 minutes later (240,000 ms elapsed > 180,000 ms)
    const fgRes = await repo.recordAppForegrounded(baseTime + 241000);
    assert.strictEqual(fgRes.didAutoLock, true);
    assert.strictEqual(repo.currentStore.securityConfig.isLocked, true);

    // Unlock with biometric signature
    const bioUnlock = await repo.unlockAppWithBiometrics('tally_device_sig_991');
    assert.strictEqual(bioUnlock.verified, true);
    assert.strictEqual(repo.currentStore.securityConfig.isLocked, false);

    // Re-lock and unlock with PIN
    repo.currentStore.securityConfig.isLocked = true;
    const pinUnlock = await repo.unlockAppWithPin('3333');
    assert.strictEqual(pinUnlock.verified, true);
    assert.strictEqual(repo.currentStore.securityConfig.isLocked, false);

    pass('StorageRepository Auto-Lock & Biometric Unlock');
  } catch (err) { fail('StorageRepository Auto-Lock & Biometric Unlock', err); }

  // TEST 13: Google Drive Cloud Backup Sanitization & Safe Restore Invariant
  try {
    const mockStorage = createMockAdapter();
    const repo = new StorageRepository(mockStorage);
    await repo.loadInitialData();
    await repo.setAppPinSecure('4444');

    // Enable biometrics & lockout metrics
    repo.currentStore.securityConfig.failedAttempts = 4;
    repo.currentStore.securityConfig.biometricsEnabled = true;

    // Export backup: MUST SCRUB all PIN data and hashes!
    const backup = await repo.createStorageBackup();
    assert.strictEqual(backup.data.pinEnabled, false, 'Cloud backup data must have pinEnabled: false');
    assert.strictEqual(backup.data.appPin, '', 'Cloud backup data must have appPin: empty string');
    if (backup.data.securityConfig) {
      assert.strictEqual(backup.data.securityConfig.pinEnabled, false);
      assert.strictEqual(backup.data.securityConfig.pinHash, '', 'pinHash must be empty in cloud backup');
      assert.strictEqual(backup.data.securityConfig.salt, '', 'salt must be empty in cloud backup');
      assert.strictEqual(backup.data.securityConfig.failedAttempts, 0);
    }

    // Now restore: restored state must reset PIN to disabled default
    const restoreRes = await repo.restoreStorageBackup(backup, { overwrite: true });
    assert.strictEqual(restoreRes.success, true);
    assert.strictEqual(repo.currentStore.pinEnabled, false, 'Restored state must have pinEnabled: false');
    assert.strictEqual(repo.currentStore.appPin, '', 'Restored state must have appPin: empty string');
    assert.strictEqual(repo.currentStore.securityConfig.pinEnabled, false);
    assert.strictEqual(repo.currentStore.securityConfig.pinHash, '');

    pass('Google Drive Cloud Backup Sanitization & Safe Restore Invariant');
  } catch (err) { fail('Google Drive Cloud Backup Sanitization & Safe Restore Invariant', err); }

  // TEST 14: Module-Level Exported Helper Functions
  try {
    const mockStorage = createMockAdapter();
    const repo = new StorageRepository(mockStorage);
    await repo.loadInitialData();

    const secCfg = await getSecurityConfig(repo);
    assert.strictEqual(typeof secCfg, 'object');

    const setRes = await setAppPinSecure('1234', {}, repo);
    assert.strictEqual(setRes.success, true);

    const vRes = await verifyAppPin('1234', Date.now(), repo);
    assert.strictEqual(vRes.verified, true);

    const cRes = await changeAppPinSecure('1234', '5678', {}, repo);
    assert.strictEqual(cRes.success, true);

    const dRes = await disableAppPinSecure('5678', repo);
    assert.strictEqual(dRes.success, true);

    const lockoutStatus = getAppLockoutStatus(Date.now(), repo);
    assert.strictEqual(lockoutStatus.isLockedOut, false);

    pass('Module-Level Exported Helper Functions');
  } catch (err) { fail('Module-Level Exported Helper Functions', err); }

  console.log('===============================================================================');
  console.log(`ALL ${totalTests} TESTS PASSED CLEANLY (${passedTests}/${totalTests} - 100% SUCCESS RATE)`);
  console.log('===============================================================================');
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
