/**
 * test_iteration_232_account_manager_backend.js
 * Comprehensive Backend Unit & Integration Tests for TallyPay Linked Bank Accounts & MFS Account Manager
 * Milestone: REA-ITER-232
 */

const assert = require('assert');
const {
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  MFS_OPERATORS,
  BANGLADESH_SCHEDULED_BANKS,
  getScheduledBankList,
  getScheduledBankByCode,
  ACCOUNT_MANAGER_ARSC_TOKENS,
  ReconstructedLinkedAccountEngine,
  LinkedAccountEngine,
  linkedAccountEngine,
  TallyPayAccountManager,
  BankAccountManager,
  tallyPayAccountManager,
} = require('./src/tallyPayService');

const {
  StorageRepository,
  createDefaultState,
  saveLinkedBankAccountRepo,
  getLinkedBankAccountsRepo,
  getLinkedBankAccountByIdRepo,
  deleteLinkedBankAccountRepo,
  setDefaultBankAccountRepo,
  verifyLinkedBankAccountRepo,
  saveLinkedMfsAccountRepo,
  getLinkedMfsAccountsRepo,
  getLinkedMfsAccountByIdRepo,
  deleteLinkedMfsAccountRepo,
} = require('./src/storageRepository');

let totalTests = 0;
let passedTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${desc}`);
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function itAsync(desc, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${desc}`);
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAll() {
  console.log('==================================================================');
  console.log(' REA-ITER-232: TALLYPAY ACCOUNT MANAGER BACKEND TEST SUITE');
  console.log('==================================================================\n');

  // GROUP 1: Constants & Bank Catalogs
  console.log('[GROUP 1: Scheduled Banks & MFS Catalogs]');
  it('BANGLADESH_SCHEDULED_BANKS contains all 10 scheduled banks with routing numbers', () => {
    assert(Array.isArray(BANGLADESH_SCHEDULED_BANKS), 'Must be array');
    assert.strictEqual(BANGLADESH_SCHEDULED_BANKS.length, 10, 'Must have 10 scheduled banks');
    const bbl = BANGLADESH_SCHEDULED_BANKS.find(b => b.code === '085');
    assert(bbl && bbl.shortCode === 'BBL' && bbl.npsbSupported === true, 'BRAC Bank valid');
    const cbl = BANGLADESH_SCHEDULED_BANKS.find(b => b.code === '225');
    assert(cbl && cbl.shortCode === 'CBL' && cbl.routingNumber === '085261742', 'City Bank valid');
  });

  it('getScheduledBankList returns detached copy of all banks', () => {
    const list = getScheduledBankList();
    assert.strictEqual(list.length, 10);
    list[0].name = 'MODIFIED';
    assert.notStrictEqual(BANGLADESH_SCHEDULED_BANKS[0].name, 'MODIFIED');
  });

  it('getScheduledBankByCode looks up by numeric code, bankCode, and shortCode', () => {
    const byNum = getScheduledBankByCode('085');
    assert(byNum && byNum.shortCode === 'BBL');
    const byShort = getScheduledBankByCode('dbbl');
    assert(byShort && byShort.code === '090');
    assert.strictEqual(getScheduledBankByCode('NON_EXISTENT'), null);
  });

  it('MFS_OPERATORS defines BKASH, NAGAD, ROCKET, UPAY, SURECASH, and TAP', () => {
    assert(MFS_OPERATORS.BKASH && MFS_OPERATORS.BKASH.name === 'bKash');
    assert(MFS_OPERATORS.NAGAD && MFS_OPERATORS.NAGAD.color === '#F7941D');
    assert(MFS_OPERATORS.ROCKET && MFS_OPERATORS.ROCKET.code === 'ROCKET');
    assert(MFS_OPERATORS.UPAY && MFS_OPERATORS.UPAY.nameBn === 'উপায়');
    assert(MFS_OPERATORS.SURECASH && MFS_OPERATORS.TAP);
  });

  it('ACCOUNT_STATUSES & ACCOUNT_TYPES match reference invariants', () => {
    assert.strictEqual(ACCOUNT_STATUSES.PENDING_VERIFICATION, 'PENDING_VERIFICATION');
    assert.strictEqual(ACCOUNT_STATUSES.VERIFIED, 'VERIFIED');
    assert.strictEqual(ACCOUNT_STATUSES.REJECTED, 'REJECTED');
    assert.strictEqual(ACCOUNT_STATUSES.BLOCKED, 'BLOCKED');
    assert.strictEqual(ACCOUNT_TYPES.SAVINGS, 'SAVINGS');
    assert.strictEqual(ACCOUNT_TYPES.CURRENT, 'CURRENT');
  });

  it('ACCOUNT_MANAGER_ARSC_TOKENS contains 20 authentic Bengali tokens', () => {
    assert.strictEqual(Object.keys(ACCOUNT_MANAGER_ARSC_TOKENS).length, 20);
    assert(ACCOUNT_MANAGER_ARSC_TOKENS.ADD_NEW_BANK_ACCOUNT.includes('নতুন ব্যাংক একাউন্ট'));
    assert(ACCOUNT_MANAGER_ARSC_TOKENS.ACTIVE_LOAN_GUARD.includes('লোন চলাকালীন এই একাউন্ট ডিলিট করা যাবে না'));
    assert(ACCOUNT_MANAGER_ARSC_TOKENS.LOCKOUT_ALERT_3_ATTEMPTS.includes('৩ বার ভুল টাকার পরিমাণ'));
  });

  // GROUP 2: In-Memory Engine Tests
  console.log('\n[GROUP 2: ReconstructedLinkedAccountEngine Logic]');
  it('addBankAccount validates 9-digit routing and 8-34 digit account numbers', () => {
    const engine = new ReconstructedLinkedAccountEngine();
    const r1 = engine.addBankAccount({
      bankCode: '085',
      bankName: 'BRAC Bank',
      routingNumber: '123',
      accountNumber: '1501201234567001',
      accountHolderName: 'Rahim'
    });
    assert(!r1.success && r1.reason === 'INVALID_ROUTING_NUMBER');

    const r2 = engine.addBankAccount({
      bankCode: '085',
      bankName: 'BRAC Bank',
      routingNumber: '060261742',
      accountNumber: '123',
      accountHolderName: 'Rahim'
    });
    assert(!r2.success && r2.reason === 'INVALID_ACCOUNT_NUMBER');

    const r3 = engine.addBankAccount({
      bankCode: '085',
      bankName: 'BRAC Bank',
      routingNumber: '060261742',
      accountNumber: '1501201234567001',
      accountHolderName: ''
    });
    assert(!r3.success && r3.reason === 'MISSING_HOLDER_NAME');

    const r4 = engine.addBankAccount({
      bankCode: '085',
      bankName: 'BRAC Bank',
      routingNumber: '060261742',
      accountNumber: '1501201234567001',
      accountHolderName: 'Rahim Traders'
    });
    assert(r4.success && r4.account.status === 'PENDING_VERIFICATION');
    assert(r4.account.isDefaultPayout === true, 'First account defaults to default payout');
    assert(r4.account.testDepositPaisa >= 10 && r4.account.testDepositPaisa <= 99);
  });

  it('verifyBankAccount handles match and 3-attempt lockout transition', () => {
    const engine = new ReconstructedLinkedAccountEngine();
    const { account } = engine.addBankAccount({
      bankCode: '085',
      routingNumber: '060261742',
      accountNumber: '1501201234567001',
      accountHolderName: 'Rahim'
    });

    const v1 = engine.verifyBankAccount(account.id, 999);
    assert(!v1.success && v1.remainingAttempts === 2);
    const v2 = engine.verifyBankAccount(account.id, 999);
    assert(!v2.success && v2.remainingAttempts === 1);
    const v3 = engine.verifyBankAccount(account.id, 999);
    assert(!v3.success && v3.remainingAttempts === 0 && v3.status === 'BLOCKED');

    const v4 = engine.verifyBankAccount(account.id, account.testDepositPaisa);
    assert(!v4.success && v4.reason === 'ACCOUNT_LOCKED');
  });

  it('verifyBankAccount succeeds on matching deposit amount', () => {
    const engine = new ReconstructedLinkedAccountEngine();
    const { account } = engine.addBankAccount({
      bankCode: '225',
      routingNumber: '085261742',
      accountNumber: '2251201234567001',
      accountHolderName: 'Karim'
    });
    const v = engine.verifyBankAccount(account.id, account.testDepositPaisa);
    assert(v.success && v.account.status === 'VERIFIED');
  });

  it('setDefaultPayoutAccount guards against unverified accounts and switches default', () => {
    const engine = new ReconstructedLinkedAccountEngine();
    const a1 = engine.addBankAccount({
      bankCode: '085',
      routingNumber: '060261742',
      accountNumber: '1501201234567001',
      accountHolderName: 'Rahim'
    }).account;
    const a2 = engine.addBankAccount({
      bankCode: '225',
      routingNumber: '085261742',
      accountNumber: '2251201234567001',
      accountHolderName: 'Karim'
    }).account;

    assert.strictEqual(a1.isDefaultPayout, true);
    assert.strictEqual(a2.isDefaultPayout, false);

    const s1 = engine.setDefaultPayoutAccount(a2.id);
    assert(!s1.success && s1.reason === 'ACCOUNT_NOT_VERIFIED');

    engine.verifyBankAccount(a2.id, a2.testDepositPaisa);
    const s2 = engine.setDefaultPayoutAccount(a2.id);
    assert(s2.success && a2.isDefaultPayout === true);
    assert.strictEqual(a1.isDefaultPayout, false);
  });

  it('deleteBankAccount checks PIN, loan guard, and auto-disbursement guard', () => {
    const engine = new ReconstructedLinkedAccountEngine();
    const a1 = engine.addBankAccount({
      bankCode: '085',
      routingNumber: '060261742',
      accountNumber: '1501201234567001',
      accountHolderName: 'Rahim',
      isLoanAccount: true
    }).account;

    const d1 = engine.deleteBankAccount(a1.id, '12');
    assert(!d1.success && d1.reason === 'INVALID_PIN');

    const d2 = engine.deleteBankAccount(a1.id, '1234');
    assert(!d2.success && d2.reason === 'CANNOT_DELETE_LOAN_ACCOUNT');

    a1.isLoanAccount = false;
    engine.autoDisbursementConfig = {
      isAutoDisbursementEnabled: true,
      linkedBankAccountId: a1.id
    };
    const d3 = engine.deleteBankAccount(a1.id, '1234');
    assert(!d3.success && d3.reason === 'CANNOT_DELETE_ACTIVE_AUTODISBURSEMENT_ACCOUNT');

    engine.autoDisbursementConfig.isAutoDisbursementEnabled = false;
    const d4 = engine.deleteBankAccount(a1.id, '1234');
    assert(d4.success);
    assert.strictEqual(engine.bankAccounts.length, 0);
  });

  it('linkMfsAccount validates Bangladeshi mobile, 6-digit OTP, and duplicate wallet', () => {
    const engine = new ReconstructedLinkedAccountEngine();
    const m1 = engine.linkMfsAccount({
      operator: 'BKASH',
      mobileNumber: '01212345678', // Invalid prefix
      accountHolderName: 'Rahim',
      otp: '123456'
    });
    assert(!m1.success && m1.reason === 'INVALID_MOBILE_NUMBER');

    const m2 = engine.linkMfsAccount({
      operator: 'BKASH',
      mobileNumber: '01712345678',
      accountHolderName: 'Rahim',
      otp: '123' // Invalid OTP length
    });
    assert(!m2.success && m2.reason === 'INVALID_OTP');

    const m3 = engine.linkMfsAccount({
      operator: 'BKASH',
      mobileNumber: '01712345678',
      accountHolderName: 'Rahim',
      otp: '123456'
    });
    assert(m3.success && m3.mfs.operator === 'BKASH');

    const m4 = engine.linkMfsAccount({
      operator: 'BKASH',
      mobileNumber: '01712345678',
      accountHolderName: 'Rahim',
      otp: '123456'
    });
    assert(!m4.success && m4.reason === 'WALLET_ALREADY_LINKED');

    // Linking Nagad with same number is allowed because operator differs
    const m5 = engine.linkMfsAccount({
      operator: 'NAGAD',
      mobileNumber: '01712345678',
      accountHolderName: 'Rahim',
      otp: '123456'
    });
    assert(m5.success && m5.mfs.operator === 'NAGAD');
    assert.strictEqual(engine.mfsAccounts.length, 2);
  });

  // GROUP 3: TallyPayAccountManager + StorageRepository Integration
  console.log('\n[GROUP 3: TallyPayAccountManager + StorageRepository Persistence]');
  const storageRepoModule = require('./src/storageRepository');
  const testRepo = storageRepoModule.storageRepository || storageRepoModule;
  if (!testRepo.currentStore) {
    testRepo.currentStore = createDefaultState();
  } else {
    testRepo.currentStore.linkedBankAccounts = [];
    testRepo.currentStore.linkedMfsAccounts = [];
  }

  const manager = new TallyPayAccountManager(testRepo);

  await itAsync('Manager saves and lists linked bank accounts with default status', async () => {
    const res1 = await manager.addBankAccount('1', {
      bankCode: '085',
      bankName: 'BRAC Bank Ltd',
      bankNameBn: 'ব্র্যাক ব্যাংক লিমিটেড',
      branchName: 'Gulshan Head Office',
      routingNumber: '060261742',
      accountNumber: '1501201234567001',
      accountHolderName: 'Rahim Traders',
      accountType: 'SAVINGS'
    });
    assert(res1.success, 'Bank account saved');
    assert(res1.account.id.startsWith('LBA_'));
    assert.strictEqual(res1.account.isDefaultPayout, true);

    const list = manager.getLinkedBankAccounts('1');
    assert.strictEqual(list.totalCount, 1);
    assert.strictEqual(list.items[0].bankCode, '085');
  });

  await itAsync('Manager verifies bank account with exact deposit amount', async () => {
    const list = manager.getLinkedBankAccounts('1');
    const acc = list.items[0];
    assert.strictEqual(acc.status, 'PENDING_VERIFICATION');

    const vFail = await manager.verifyBankAccount('1', acc.id, 9999);
    assert(!vFail.success && vFail.remainingAttempts === 2);

    const vSuccess = await manager.verifyBankAccount('1', acc.id, acc.testDepositPaisa);
    assert(vSuccess.success && vSuccess.status === 'VERIFIED');

    const refetched = manager.getLinkedBankAccountById('1', acc.id);
    assert.strictEqual(refetched.status, 'VERIFIED');
  });

  await itAsync('Manager links MFS wallets (bKash & Nagad) with duplicate rejection', async () => {
    const bRes = await manager.linkMfsAccount('1', {
      operator: 'BKASH',
      mobileNumber: '01812345678',
      accountHolderName: 'Rahim bKash',
      otp: '654321'
    });
    assert(bRes.success && bRes.mfs.operator === 'BKASH');

    const dupRes = await manager.linkMfsAccount('1', {
      operator: 'BKASH',
      mobileNumber: '01812345678',
      accountHolderName: 'Rahim bKash',
      otp: '654321'
    });
    assert(!dupRes.success && dupRes.reason === 'WALLET_ALREADY_LINKED');

    const nRes = await manager.linkMfsAccount('1', {
      operator: 'NAGAD',
      mobileNumber: '01912345678',
      accountHolderName: 'Rahim Nagad',
      otp: '112233'
    });
    assert(nRes.success && nRes.mfs.operator === 'NAGAD');

    const mfsList = manager.getLinkedMfsAccounts('1');
    assert.strictEqual(mfsList.totalCount, 2);
  });

  await itAsync('Manager sets new default bank account and updates autoDisbursement', async () => {
    const res2 = await manager.addBankAccount('1', {
      bankCode: '225',
      bankName: 'City Bank Ltd',
      routingNumber: '085261742',
      accountNumber: '2251201234567001',
      accountHolderName: 'Rahim Enterprise',
    });
    assert(res2.success);
    const acc2 = res2.account;

    // Verify acc2
    await manager.verifyBankAccount('1', acc2.id, acc2.testDepositPaisa);

    // Set as default
    const setDef = await manager.setDefaultBankAccount('1', acc2.id);
    assert(setDef.success && setDef.account.isDefaultPayout === true);

    const list = manager.getLinkedBankAccounts('1');
    const a1 = list.items.find(a => a.bankCode === '085');
    const a2 = list.items.find(a => a.bankCode === '225');
    assert.strictEqual(a2.isDefaultPayout, true);
    assert.strictEqual(a1.isDefaultPayout, false);
  });

  await itAsync('Manager deletion guards against invalid PIN and promotes next default', async () => {
    const list = manager.getLinkedBankAccounts('1');
    const defaultAcc = list.items.find(a => a.isDefaultPayout);
    const nonDefaultAcc = list.items.find(a => !a.isDefaultPayout);

    const dPinFail = await manager.deleteBankAccount('1', defaultAcc.id, '12');
    assert(!dPinFail.success && dPinFail.reason === 'INVALID_PIN');

    // Delete the default account with valid 4-digit PIN
    const dSuccess = await manager.deleteBankAccount('1', defaultAcc.id, '1234');
    assert(dSuccess.success);

    // Remaining account should now be promoted to default payout!
    const updatedList = manager.getLinkedBankAccounts('1');
    assert.strictEqual(updatedList.totalCount, 1);
    assert.strictEqual(updatedList.items[0].id, nonDefaultAcc.id);
    assert.strictEqual(updatedList.items[0].isDefaultPayout, true, 'Promoted next verified account');
  });

  // GROUP 4: Multi-Tenant Business Isolation & Data Protection
  console.log('\n[GROUP 4: Multi-Tenant Business Isolation & Cloud Backup Masking]');
  await itAsync('Business tenant isolation guarantees strict account segregation', async () => {
    // Add account for business '2'
    await manager.addBankAccount('2', {
      bankCode: '200',
      bankName: 'Sonali Bank Ltd',
      routingNumber: '200261742',
      accountNumber: '2001201234567001',
      accountHolderName: 'Business 2 Account'
    });

    const biz1List = manager.getLinkedBankAccounts('1');
    const biz2List = manager.getLinkedBankAccounts('2');
    assert.strictEqual(biz1List.totalCount, 1);
    assert.strictEqual(biz2List.totalCount, 1);
    assert.strictEqual(biz1List.items[0].bankCode, '085');
    assert.strictEqual(biz2List.items[0].bankCode, '200');
  });

  await itAsync('getFullBackupState masks bank account numbers and mobile numbers', async () => {
    const backupState = await testRepo.getFullBackupState();
    assert(Array.isArray(backupState.linkedBankAccounts), 'linkedBankAccounts present in backup');
    assert(Array.isArray(backupState.linkedMfsAccounts), 'linkedMfsAccounts present in backup');

    for (const b of backupState.linkedBankAccounts) {
      assert(b.accountNumber.startsWith('**** **** '), `Account number masked: ${b.accountNumber}`);
      assert(!/^[0-9]{10,}/.test(b.accountNumber), 'Raw account number not exposed');
    }

    for (const m of backupState.linkedMfsAccounts) {
      assert(m.mobileNumber.includes('****'), `Mobile number masked: ${m.mobileNumber}`);
    }
  });

  await itAsync('deleteBusinessCascade cleanly removes linked bank & MFS accounts', async () => {
    await testRepo.deleteBusinessCascade('2');
    const biz2Bank = manager.getLinkedBankAccounts('2');
    const biz2Mfs = manager.getLinkedMfsAccounts('2');
    assert.strictEqual(biz2Bank.totalCount, 0, 'Business 2 bank accounts cascaded');
    assert.strictEqual(biz2Mfs.totalCount, 0, 'Business 2 MFS accounts cascaded');

    // Business 1 remains completely intact
    const biz1Bank = manager.getLinkedBankAccounts('1');
    assert.strictEqual(biz1Bank.totalCount, 1, 'Business 1 bank accounts preserved');
  });

  console.log('\n==================================================================');
  console.log(` ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY! (100% PASS RATE)`);
  console.log('==================================================================');
}

runAll().catch(e => {
  console.error('Fatal test runner failure:', e);
  process.exit(1);
});
