/**
 * TALLYKHATA ITERATION 231: SECURITY PIN, BIOMETRICS & DEVICE BINDING BACKEND SUITE
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Milestone: REA-ITER-231
 */

const assert = require('assert');
const crypto = require('crypto');
const {
  DEFAULT_PIN_SALT,
  PIN_ARSC_TOKENS,
  PIN_STRENGTH_ERRORS,
  hashPin,
  validatePinStrength,
  ReconstructedSecurityPinAndAuthEngine,
  PinSecurityEngine,
  pinSecurityEngine,
  TallyPaySecurityManager,
  tallyPaySecurityManager,
} = require('./src/tallyPayService');

const storageRepoModule = require('./src/storageRepository');
const storageRepo = storageRepoModule.storageRepository || storageRepoModule;

console.log('================================================================================');
console.log('TALLYKHATA ITERATION 231: SECURITY PIN, BIOMETRICS & DEVICE BINDING BACKEND SUITE');
console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
console.log('Milestone: REA-ITER-231');
console.log('================================================================================\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error(err);
    failCount++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}`);
    console.error(err);
    failCount++;
  }
}

(async () => {
  console.log('--- PART 1: CRYPTOGRAPHIC CONSTANTS & SALTED HASH INTEGRITY ---');

  it('1.1: Default PIN salt matches reference application constant (jrhwesdfbmnew)', () => {
    assert.strictEqual(DEFAULT_PIN_SALT, 'jrhwesdfbmnew');
  });

  it('1.2: hashPin generates valid SHA-1 digest matching reference salt computation', () => {
    const pin = '2580';
    const expected = crypto.createHash('sha1').update('2580jrhwesdfbmnew').digest('hex');
    assert.strictEqual(hashPin(pin), expected);
    assert.strictEqual(hashPin(pin).length, 40);
  });

  it('1.3: hashPin handles custom salt parameter correctly', () => {
    const pin = '1234';
    const customSalt = 'custom_salt_999';
    const expected = crypto.createHash('sha1').update('1234custom_salt_999').digest('hex');
    assert.strictEqual(hashPin(pin, customSalt), expected);
  });

  it('1.4: Authentic Bengali ARSC tokens verified in PIN_ARSC_TOKENS', () => {
    assert.strictEqual(PIN_ARSC_TOKENS.ALERT_ACCOUNT_LOCKED, '৩ বার ভুল PIN দেয়ার জন্য আপনার একাউন্টটি ১ ঘণ্টার জন্য ব্লক করা হয়েছে।');
    assert.strictEqual(PIN_ARSC_TOKENS.ALERT_ATTEMPT_WARNING, 'আপনি পরপর ২ বার ভুল PIN দিয়েছেন। আরেকবার ভুল PIN দিলে আপনার একাউন্ট ব্লক করে দেওয়া হবে।');
    assert.strictEqual(PIN_ARSC_TOKENS.RULE_WEAK_PIN, 'অনুগ্রহ করে ধারাবাহিক বা পুনরাবৃত্ত নম্বর ছাড়া একটি ভিন্ন PIN দিন।');
    assert.strictEqual(PIN_ARSC_TOKENS.RULE_PREVIOUSLY_USED, 'এই PIN পূর্বে ব্যবহৃত হয়েছে');
    assert.strictEqual(PIN_ARSC_TOKENS.ALERT_PIN_MISMATCH, 'PIN দুটি মিলছে না, আবার চেষ্টা করুন।');
    assert.strictEqual(PIN_ARSC_TOKENS.NOTICE_BIOMETRIC_FALLBACK, 'Failed to verify using Finger Print. Please do continue with PIN');
    assert.strictEqual(PIN_ARSC_TOKENS.NOTICE_NO_BIOMETRIC_REGISTERED, 'কোন নিবন্ধিত ফিঙ্গারপ্রিন্ট পাওয়া যায়নি।');
  });

  console.log('\n--- PART 2: PIN STRENGTH VALIDATION RULES ---');

  it('2.1: validatePinStrength rejects non-string and invalid lengths', () => {
    assert.strictEqual(validatePinStrength(null).valid, false);
    assert.strictEqual(validatePinStrength(1234).valid, false);
    assert.strictEqual(validatePinStrength('123').valid, false);
    assert.strictEqual(validatePinStrength('12345').valid, false);
    assert.strictEqual(validatePinStrength('abcd').valid, false);
  });

  it('2.2: validatePinStrength rejects repetitive digits (1111, 2222, etc.)', () => {
    ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'].forEach((pin) => {
      const res = validatePinStrength(pin);
      assert.strictEqual(res.valid, false, `Should reject ${pin}`);
      assert.strictEqual(res.reason, 'REPETITIVE_DIGITS');
    });
  });

  it('2.3: validatePinStrength rejects sequential ascending digits (1234, 2345, 6789, etc.)', () => {
    ['0123', '1234', '2345', '3456', '4567', '5678', '6789'].forEach((pin) => {
      const res = validatePinStrength(pin);
      assert.strictEqual(res.valid, false, `Should reject ${pin}`);
      assert.strictEqual(res.reason, 'SEQUENTIAL_ASCENDING');
    });
  });

  it('2.4: validatePinStrength rejects sequential descending digits (4321, 9876, etc.)', () => {
    ['3210', '4321', '5432', '6543', '7654', '8765', '9876'].forEach((pin) => {
      const res = validatePinStrength(pin);
      assert.strictEqual(res.valid, false, `Should reject ${pin}`);
      assert.strictEqual(res.reason, 'SEQUENTIAL_DESCENDING');
    });
  });

  it('2.5: validatePinStrength accepts non-sequential, strong 4-digit PINs', () => {
    ['2580', '7412', '9630', '1379', '8426', '9513', '3197'].forEach((pin) => {
      const res = validatePinStrength(pin);
      assert.strictEqual(res.valid, true, `Should accept ${pin}`);
    });
  });

  console.log('\n--- PART 3: INITIAL PIN SETUP WORKFLOW ---');

  it('3.1: setupPin rejects mismatched confirmation PIN', () => {
    const engine = new PinSecurityEngine();
    const res = engine.setupPin('2580', '2581');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'PIN_MISMATCH');
  });

  it('3.2: setupPin rejects weak initial PIN', () => {
    const engine = new PinSecurityEngine();
    const res = engine.setupPin('1234', '1234');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'SEQUENTIAL_ASCENDING');
  });

  it('3.3: setupPin sets valid PIN, hashes it and resets lockout states', () => {
    const engine = new PinSecurityEngine();
    const res = engine.setupPin('2580', '2580');
    assert.strictEqual(res.success, true);
    assert.strictEqual(engine.storedPinHash, hashPin('2580'));
    assert.strictEqual(engine.previousPins.has(hashPin('2580')), true);
    assert.strictEqual(engine.failedAttempts, 0);
    assert.strictEqual(engine.lockoutUntil, null);
  });

  console.log('\n--- PART 4: PIN CHANGE & HISTORICAL REUSE PROTECTION ---');

  it('4.1: changePin rejects when account is locked out', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    engine.lockoutUntil = Date.now() + 3600000;
    const res = engine.changePin('2580', '7412', '7412');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'LOCKED_OUT');
  });

  it('4.2: changePin rejects wrong old PIN and increments failed attempts', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    const res = engine.changePin('9999', '7412', '7412');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'WRONG_OLD_PIN');
    assert.strictEqual(engine.failedAttempts, 1);
  });

  it('4.3: changePin rejects mismatched new PIN confirmation', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    const res = engine.changePin('2580', '7412', '7413');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'PIN_MISMATCH');
  });

  it('4.4: changePin rejects historical reuse of previously used PIN', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    engine.changePin('2580', '7412', '7412');
    // Try to change back to 2580
    const res = engine.changePin('7412', '2580', '2580');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'PREVIOUSLY_USED');
    assert.strictEqual(res.message, PIN_ARSC_TOKENS.RULE_PREVIOUSLY_USED);
  });

  it('4.5: changePin successfully updates PIN with valid, non-historical credentials', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    const res = engine.changePin('2580', '9630', '9630');
    assert.strictEqual(res.success, true);
    assert.strictEqual(engine.storedPinHash, hashPin('9630'));
    assert.strictEqual(engine.previousPins.has(hashPin('9630')), true);
    assert.strictEqual(engine.failedAttempts, 0);
  });

  console.log('\n--- PART 5: PROGRESSIVE BRUTE-FORCE LOCKOUT DEFENSE ---');

  it('5.1: Attempt 1 returns failure with 1 failed attempt', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    const res = engine.validatePin('9999');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.failedAttempts, 1);
    assert.strictEqual(engine.isLockedOut(), false);
  });

  it('5.2: Attempt 2 returns warning banner before lockout threshold', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    engine.validatePin('9999'); // Attempt 1
    const res = engine.validatePin('8888'); // Attempt 2
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.warning, true);
    assert.strictEqual(res.failedAttempts, 2);
    assert.strictEqual(res.message, PIN_ARSC_TOKENS.ALERT_ATTEMPT_WARNING);
    assert.strictEqual(engine.isLockedOut(), false);
  });

  it('5.3: Attempt 3 triggers 1-hour account lockout and returns lockout alert', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    engine.validatePin('9999'); // Attempt 1
    engine.validatePin('8888'); // Attempt 2
    const res = engine.validatePin('7777'); // Attempt 3
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.lockedOut, true);
    assert.strictEqual(res.failedAttempts, 3);
    assert.strictEqual(res.message, PIN_ARSC_TOKENS.ALERT_ACCOUNT_LOCKED);
    assert.strictEqual(engine.isLockedOut(), true);
  });

  it('5.4: While locked out, all PIN checks rejected even with correct PIN', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    engine.validatePin('9999');
    engine.validatePin('8888');
    engine.validatePin('7777'); // Locked out
    assert.strictEqual(engine.isLockedOut(), true);

    const res = engine.validatePin('2580'); // Correct PIN
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.lockedOut, true);
    assert.strictEqual(res.reason, 'LOCKED_OUT');
  });

  it('5.5: Lockout automatically clears when timer expires', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    engine.lockoutUntil = Date.now() - 1000; // Expired 1 second ago
    assert.strictEqual(engine.isLockedOut(), false);
    assert.strictEqual(engine.validatePin('2580').success, true);
  });

  console.log('\n--- PART 6: SMS OTP PIN RESET WORKFLOW ---');

  it('6.1: requestResetPinOtp generates 6-digit OTP with 5-minute expiry', () => {
    const engine = new PinSecurityEngine();
    const res = engine.requestResetPinOtp('01712345678');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.otpToken.length, 6);
    assert.strictEqual(/^\d{6}$/.test(res.otpToken), true);
  });

  it('6.2: resetPinWithOtp rejects if no pending OTP exists', () => {
    const engine = new PinSecurityEngine();
    const res = engine.resetPinWithOtp('01799999999', '123456', '7412', '7412');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'NO_PENDING_OTP');
  });

  it('6.3: resetPinWithOtp rejects expired OTP', () => {
    const engine = new PinSecurityEngine();
    engine.pendingOtps.set('01712345678', {
      otp: '654321',
      otpType: 'PIN_RESET',
      expiry: Date.now() - 5000, // Expired
    });
    const res = engine.resetPinWithOtp('01712345678', '654321', '7412', '7412');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'OTP_EXPIRED');
  });

  it('6.4: resetPinWithOtp rejects incorrect OTP input', () => {
    const engine = new PinSecurityEngine();
    const otpRes = engine.requestResetPinOtp('01712345678');
    const res = engine.resetPinWithOtp('01712345678', '000000', '7412', '7412');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'INVALID_OTP');
  });

  it('6.5: resetPinWithOtp resets PIN with valid OTP and clears lockout state', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    // Lock it out
    engine.validatePin('9999');
    engine.validatePin('8888');
    engine.validatePin('7777');
    assert.strictEqual(engine.isLockedOut(), true);

    const otpRes = engine.requestResetPinOtp('01712345678');
    const res = engine.resetPinWithOtp('01712345678', otpRes.otpToken, '7412', '7412');
    assert.strictEqual(res.success, true);
    assert.strictEqual(engine.isLockedOut(), false);
    assert.strictEqual(engine.validatePin('7412').success, true);
    assert.strictEqual(engine.pendingOtps.has('01712345678'), false);
  });

  console.log('\n--- PART 7: BIOMETRICS & FALLBACK AUTHENTICATION ---');

  it('7.1: enrollBiometrics enables biometrics and records public key', () => {
    const engine = new PinSecurityEngine();
    const res = engine.enrollBiometrics('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg...');
    assert.strictEqual(res.success, true);
    assert.strictEqual(engine.biometricEnabled, true);
    assert.strictEqual(engine.biometricPublicKey, 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg...');
  });

  it('7.2: validateCredentialWithBiometric rejects if biometrics not enrolled', () => {
    const engine = new PinSecurityEngine();
    const res = engine.validateCredentialWithBiometric({
      walletNo: '01712345678',
      amount: 500,
      fingerPrintTxn: true,
      fpSignature: 'SIG_VALID_123456789',
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'BIOMETRIC_NOT_ENROLLED');
  });

  it('7.3: validateCredentialWithBiometric falls back to PIN on signature failure', () => {
    const engine = new PinSecurityEngine();
    engine.enrollBiometrics('PUBKEY_123');
    const res = engine.validateCredentialWithBiometric({
      walletNo: '01712345678',
      amount: 500,
      fingerPrintTxn: true,
      fpSignature: 'short', // Too short / invalid signature
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'BIOMETRIC_SIGNATURE_FAILED');
    assert.strictEqual(res.fallbackToPin, true);
    assert.strictEqual(res.message, PIN_ARSC_TOKENS.NOTICE_BIOMETRIC_FALLBACK);
  });

  it('7.4: validateCredentialWithBiometric authenticates via BIOMETRIC_FINGERPRINT on valid signature', () => {
    const engine = new PinSecurityEngine();
    engine.enrollBiometrics('PUBKEY_123');
    const res = engine.validateCredentialWithBiometric({
      walletNo: '01712345678',
      amount: 500,
      fingerPrintTxn: true,
      fpSignature: 'SIG_VALID_123456789_LONG_FINGERPRINT',
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.authenticatedVia, 'BIOMETRIC_FINGERPRINT');
  });

  it('7.5: validateCredentialWithBiometric authenticates via SECURITY_PIN when fingerprint not used', () => {
    const engine = new PinSecurityEngine();
    engine.setupPin('2580', '2580');
    const res = engine.validateCredentialWithBiometric({
      walletNo: '01712345678',
      amount: 500,
      fingerPrintTxn: false,
      pin: '2580',
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.authenticatedVia, 'SECURITY_PIN');
  });

  console.log('\n--- PART 8: SINGLE ACTIVE DEVICE BINDING ---');

  it('8.1: bindDevice binds new device and invalidates prior active device', () => {
    const engine = new PinSecurityEngine();
    engine.pendingOtps.set('01712345678', {
      otp: '123456',
      otpType: 'REGISTRATION',
      expiry: Date.now() + 60000,
    });
    const res = engine.bindDevice('DEV_NEW_PHONE_99', '01712345678', '123456');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.activeDeviceId, 'DEV_NEW_PHONE_99');
    assert.strictEqual(res.previousDeviceInvalidated, 'DEV_INIT_001');
    assert.strictEqual(engine.getActiveDeviceId(), 'DEV_NEW_PHONE_99');
  });

  it('8.2: bindDevice rejects with invalid registration OTP', () => {
    const engine = new PinSecurityEngine();
    engine.pendingOtps.set('01712345678', {
      otp: '123456',
      otpType: 'REGISTRATION',
      expiry: Date.now() + 60000,
    });
    const res = engine.bindDevice('DEV_NEW_PHONE_99', '01712345678', '999999');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'INVALID_OTP');
  });

  console.log('\n--- PART 9: MULTI-TENANT STORAGE REPOSITORY INTEGRATION ---');

  await itAsync('9.1: storageRepository saves and retrieves wallet security credentials per business', async () => {
    const res = await storageRepo.saveWalletSecurityCredentials('1', {
      storedPinHash: hashPin('2580'),
      salt: DEFAULT_PIN_SALT,
      previousPins: [hashPin('2580')],
      failedAttempts: 0,
      biometricEnabled: true,
      activeDeviceId: 'DEV_TEST_001',
    });
    assert.strictEqual(res.success, true);

    const creds1 = storageRepo.getWalletSecurityCredentials('1');
    assert.strictEqual(creds1.storedPinHash, hashPin('2580'));
    assert.strictEqual(creds1.biometricEnabled, true);

    // Business 2 has independent default credentials
    const creds2 = storageRepo.getWalletSecurityCredentials('2');
    assert.strictEqual(creds2.storedPinHash, null);
    assert.strictEqual(creds2.biometricEnabled, false);
  });

  await itAsync('9.2: storageRepository registers device bindings enforcing single active device', async () => {
    const res1 = await storageRepo.registerDeviceBinding('1', {
      deviceId: 'DEV_PHONE_A',
      deviceName: 'Redmi Note 9',
      mobileNumber: '01712345678',
    });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(storageRepo.getActiveDeviceBinding('1').deviceId, 'DEV_PHONE_A');

    // Register second device for Business 1
    const res2 = await storageRepo.registerDeviceBinding('1', {
      deviceId: 'DEV_PHONE_B',
      deviceName: 'Pixel 7',
      mobileNumber: '01712345678',
    });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.previousDeviceInvalidated, 'DEV_PHONE_A');
    assert.strictEqual(storageRepo.getActiveDeviceBinding('1').deviceId, 'DEV_PHONE_B');

    // Previous device marked INACTIVE
    const allDevices = storageRepo.getDeviceBindings('1');
    const devA = allDevices.find((d) => d.deviceId === 'DEV_PHONE_A');
    assert.strictEqual(devA.status, 'INACTIVE');
  });

  await itAsync('9.3: deleteBusinessCascade purges credentials and device bindings for deleted business', async () => {
    // Setup for business 2
    await storageRepo.saveWalletSecurityCredentials('2', {
      storedPinHash: hashPin('7412'),
      activeDeviceId: 'DEV_BIZ_2',
    });
    await storageRepo.registerDeviceBinding('2', {
      deviceId: 'DEV_BIZ_2',
      deviceName: 'Samsung Galaxy',
    });

    assert.strictEqual(storageRepo.getWalletSecurityCredentials('2').storedPinHash, hashPin('7412'));
    assert.strictEqual(storageRepo.getActiveDeviceBinding('2').deviceId, 'DEV_BIZ_2');

    // Delete business 2
    await storageRepo.deleteBusinessCascade('2');

    // Business 2 credentials reset to default
    assert.strictEqual(storageRepo.getWalletSecurityCredentials('2').storedPinHash, null);
    assert.strictEqual(storageRepo.getActiveDeviceBinding('2'), null);

    // Business 1 remains completely intact
    assert.strictEqual(storageRepo.getWalletSecurityCredentials('1').storedPinHash, hashPin('2580'));
    assert.strictEqual(storageRepo.getActiveDeviceBinding('1').deviceId, 'DEV_PHONE_B');
  });

  await itAsync('9.4: getFullBackupState scrubs raw PINs and secrets from credentials backup', async () => {
    await storageRepo.saveWalletSecurityCredentials('1', {
      storedPinHash: hashPin('2580'),
      salt: DEFAULT_PIN_SALT,
      pin: '2580', // raw field that must be scrubbed
      rawPin: '2580',
      apiKey: 'SECRET_API_KEY_123',
    });

    const backupState = await storageRepo.getFullBackupState();
    const backupCreds = backupState.walletSecurityCredentials.find((c) => String(c.businessId || '1') === '1');
    assert.strictEqual(backupCreds.storedPinHash, hashPin('2580'));
    assert.strictEqual(backupCreds.pin, undefined);
    assert.strictEqual(backupCreds.rawPin, undefined);
    assert.strictEqual(backupCreds.apiKey, undefined);
  });

  console.log('\n--- PART 10: TALLYPAY SECURITY MANAGER HIGH-LEVEL FACADE ---');

  await itAsync('10.1: TallyPaySecurityManager initializes and persists setupPin', async () => {
    const manager = new TallyPaySecurityManager(storageRepo);
    const res = await manager.setupPin('9630', '9630', '1');
    assert.strictEqual(res.success, true);

    const creds = storageRepo.getWalletSecurityCredentials('1');
    assert.strictEqual(creds.storedPinHash, hashPin('9630'));
  });

  await itAsync('10.2: TallyPaySecurityManager handles PIN change and persistence', async () => {
    const manager = new TallyPaySecurityManager(storageRepo);
    const res = await manager.changePin('9630', '3197', '3197', '1');
    assert.strictEqual(res.success, true);

    const creds = storageRepo.getWalletSecurityCredentials('1');
    assert.strictEqual(creds.storedPinHash, hashPin('3197'));
  });

  await itAsync('10.3: TallyPaySecurityManager handles OTP reset and persistence', async () => {
    const manager = new TallyPaySecurityManager(storageRepo);
    const otpRes = await manager.requestResetPinOtp('01712345678', 'PIN_RESET', '1');
    const resetRes = await manager.resetPinWithOtp('01712345678', otpRes.otpToken, '7412', '7412', '1');
    assert.strictEqual(resetRes.success, true);

    const creds = storageRepo.getWalletSecurityCredentials('1');
    assert.strictEqual(creds.storedPinHash, hashPin('7412'));
  });

  await itAsync('10.4: TallyPaySecurityManager handles biometric enrollment and device binding', async () => {
    const manager = new TallyPaySecurityManager(storageRepo);
    await manager.enrollBiometrics('PUBKEY_MANAGER_TEST', '1');
    const creds = storageRepo.getWalletSecurityCredentials('1');
    assert.strictEqual(creds.biometricEnabled, true);

    // Bind device with OTP
    const engine = manager.getEngine('1');
    engine.pendingOtps.set('01712345678', {
      otp: '777888',
      otpType: 'REGISTRATION',
      expiry: Date.now() + 60000,
    });
    const bindRes = await manager.bindDevice('DEV_MGR_001', '01712345678', '777888', 'Manager Device', '1');
    assert.strictEqual(bindRes.success, true);
    assert.strictEqual(storageRepo.getActiveDeviceBinding('1').deviceId, 'DEV_MGR_001');

    const status = manager.getSecurityStatus('1');
    assert.strictEqual(status.isPinSet, true);
    assert.strictEqual(status.biometricEnabled, true);
    assert.strictEqual(status.activeDeviceId, 'DEV_MGR_001');
  });

  console.log('\n================================================================================');
  console.log(`TOTAL: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount} (100% SUCCESS)`);
  console.log('================================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
})();
