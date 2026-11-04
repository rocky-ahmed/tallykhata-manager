/**
 * TALLYKHATA ITERATION 228: BENEFICIARY BOOK & FAST REMITTANCE DISPATCH BACKEND SUITE
 *
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic Architect)
 * Registered Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 * Milestone: REA-ITER-228
 * Target: src/tallyPayService.js, src/storageRepository.js
 */

const assert = require('assert');
const {
  BANK_VERIFICATION_STATUSES,
  BENEFICIARY_TARGET_TYPES,
  MFS_WALLET_OPERATORS,
  REMITTANCE_TRANSFER_MODES,
  BANGLADESH_BANKS_CATALOG,
  getBangladeshBanksCatalog,
  getBankByCode,
  getBankList,
  getObscureAccountNumber,
  getObscureMobileNumber,
  validateRoutingNumber,
  validateBangladeshiMobile,
  validateBanglaMobile,
  validateBeneficiaryPayload,
  formatBankAccountItem,
  formatMfsAccountItem,
  formatSavedRecipient,
  buildPrepopulatedRemittance,
  verifyBankPennyDeposit,
  queryBeneficiaries,
  BeneficiaryBookEngine,
  ReconstructedBeneficiaryBookEngine,
  beneficiaryBookEngine,
} = require('./src/tallyPayService');

const {
  StorageRepository,
  createDefaultState,
  sanitizeState,
  VALID_COLLECTIONS,
} = require('./src/storageRepository');

class MockAsyncStorageAdapter {
  constructor(initialData = {}) {
    this.store = new Map(Object.entries(initialData));
  }
  async getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  async setItem(key, value) {
    this.store.set(key, String(value));
  }
  async removeItem(key) {
    this.store.delete(key);
  }
  async getAllKeys() {
    return Array.from(this.store.keys());
  }
  async multiGet(keys) {
    return keys.map((k) => [k, this.store.has(k) ? this.store.get(k) : null]);
  }
  async multiSet(kvPairs) {
    for (const [k, v] of kvPairs) {
      this.store.set(k, String(v));
    }
  }
}

let totalTests = 0;
let passedTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✓ [PASS] ${description}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAsyncTest(description, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`  ✓ [PASS] ${description}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runTestSuite() {
  console.log('================================================================================');
  console.log('TALLYKHATA ITERATION 228: BENEFICIARY BOOK & REMITTANCE BACKEND SUITE');
  console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
  console.log('Milestone: REA-ITER-228');
  console.log('================================================================================\n');

  // -------------------------------------------------------------
  // GROUP 1: Enums, Constants & Bank Catalog
  // -------------------------------------------------------------
  console.log('[GROUP 1: Enums, Constants & Bank Catalog]');

  runTest('1.1: BANK_VERIFICATION_STATUSES defines VERIFIED, PENDING, REJECTED, UNVERIFIED, ACTIVE', () => {
    assert.strictEqual(BANK_VERIFICATION_STATUSES.VERIFIED, 'VERIFIED');
    assert.strictEqual(BANK_VERIFICATION_STATUSES.PENDING, 'PENDING');
    assert.strictEqual(BANK_VERIFICATION_STATUSES.REJECTED, 'REJECTED');
    assert.strictEqual(BANK_VERIFICATION_STATUSES.UNVERIFIED, 'UNVERIFIED');
    assert.strictEqual(BANK_VERIFICATION_STATUSES.ACTIVE, 'ACTIVE');
  });

  runTest('1.2: BENEFICIARY_TARGET_TYPES defines BANK and MFS', () => {
    assert.strictEqual(BENEFICIARY_TARGET_TYPES.BANK, 'BANK');
    assert.strictEqual(BENEFICIARY_TARGET_TYPES.MFS, 'MFS');
  });

  runTest('1.3: MFS_WALLET_OPERATORS defines BKASH, NAGAD, ROCKET, UPAY, TAP', () => {
    assert.strictEqual(MFS_WALLET_OPERATORS.BKASH, 'BKASH');
    assert.strictEqual(MFS_WALLET_OPERATORS.NAGAD, 'NAGAD');
    assert.strictEqual(MFS_WALLET_OPERATORS.ROCKET, 'ROCKET');
    assert.strictEqual(MFS_WALLET_OPERATORS.UPAY, 'UPAY');
    assert.strictEqual(MFS_WALLET_OPERATORS.TAP, 'TAP');
  });

  runTest('1.4: REMITTANCE_TRANSFER_MODES defines NPSB_INSTANT, BEFTN_NORMAL, RTGS_REALTIME, WALLET_INSTANT', () => {
    assert.strictEqual(REMITTANCE_TRANSFER_MODES.NPSB_INSTANT, 'NPSB_INSTANT');
    assert.strictEqual(REMITTANCE_TRANSFER_MODES.BEFTN_NORMAL, 'BEFTN_NORMAL');
    assert.strictEqual(REMITTANCE_TRANSFER_MODES.BEFTN_REGULAR, 'BEFTN_REGULAR');
    assert.strictEqual(REMITTANCE_TRANSFER_MODES.RTGS_REALTIME, 'RTGS_REALTIME');
    assert.strictEqual(REMITTANCE_TRANSFER_MODES.WALLET_INSTANT, 'WALLET_INSTANT');
  });

  runTest('1.5: BANGLADESH_BANKS_CATALOG contains verified commercial banks with routing and NPSB support', () => {
    assert(Array.isArray(BANGLADESH_BANKS_CATALOG), 'BANGLADESH_BANKS_CATALOG must be an array');
    assert(BANGLADESH_BANKS_CATALOG.length >= 15, 'Catalog should contain at least 15 commercial banks');
    const ibbl = BANGLADESH_BANKS_CATALOG.find((b) => b.bankCode === 'IBBL');
    assert(ibbl, 'IBBL must be present in catalog');
    assert.strictEqual(ibbl.routingNumber, '125261742');
    assert.strictEqual(ibbl.npsbSupported, true);
    assert.strictEqual(ibbl.instantTransferSupported, true);
    assert(Array.isArray(ibbl.branches) && ibbl.branches.length > 0, 'Bank must have branches list');

    const cbl = BANGLADESH_BANKS_CATALOG.find((b) => b.bankCode === 'CBL');
    assert(cbl, 'City Bank must be present in catalog');
    assert.strictEqual(cbl.routingNumber, '085261742');
  });

  runTest('1.6: Bank catalog query helpers resolve banks and list definitions', () => {
    const list = getBangladeshBanksCatalog();
    assert(Array.isArray(list) && list.length >= 15);
    const bankByCode = getBankByCode('bbl');
    assert(bankByCode, 'Bank resolution must be case-insensitive');
    assert.strictEqual(bankByCode.bankCode, 'BBL');

    const bankByRouting = getBankByCode('060261742');
    assert(bankByRouting, 'Bank resolution by routing number must work');
    assert.strictEqual(bankByRouting.bankCode, 'BBL');

    const summaryList = getBankList();
    assert(Array.isArray(summaryList) && summaryList.length >= 15);
    assert(summaryList[0].bankName && summaryList[0].routingNumber);
  });

  // -------------------------------------------------------------
  // GROUP 2: Privacy Obscuring & Security Formatters
  // -------------------------------------------------------------
  console.log('\n[GROUP 2: Privacy Obscuring & Security Formatters]');

  runTest('2.1: getObscureAccountNumber correctly masks bank account numbers', () => {
    assert.strictEqual(getObscureAccountNumber('2050123456789'), '**** **** 6789');
    assert.strictEqual(getObscureAccountNumber('1234567890123'), '**** **** 0123');
    assert.strictEqual(getObscureAccountNumber('9988'), '**** **** 9988');
    assert.strictEqual(getObscureAccountNumber('  5678  '), '**** **** 5678');
    assert.strictEqual(getObscureAccountNumber(''), '**** **** ****');
    assert.strictEqual(getObscureAccountNumber('123'), '**** **** ****');
    assert.strictEqual(getObscureAccountNumber(null), '**** **** ****');
    assert.strictEqual(getObscureAccountNumber(undefined), '**** **** ****');
  });

  runTest('2.2: getObscureMobileNumber correctly masks 11-digit mobile numbers', () => {
    assert.strictEqual(getObscureMobileNumber('01712345678'), '017****5678');
    assert.strictEqual(getObscureMobileNumber('01898765432'), '018****5432');
    assert.strictEqual(getObscureMobileNumber('01911223344'), '019****3344');
    assert.strictEqual(getObscureMobileNumber('017-1234-5678'), '017****5678');
    assert.strictEqual(getObscureMobileNumber(''), '01*********');
    assert.strictEqual(getObscureMobileNumber('0171234'), '01*********');
    assert.strictEqual(getObscureMobileNumber(null), '01*********');
  });

  // -------------------------------------------------------------
  // GROUP 3: Routing Number & Mobile Validators
  // -------------------------------------------------------------
  console.log('\n[GROUP 3: Routing Number & Mobile Validators]');

  runTest('3.1: validateRoutingNumber enforces strict 9-digit numeric routing format', () => {
    assert.strictEqual(validateRoutingNumber('085261742'), true);
    assert.strictEqual(validateRoutingNumber('125261742'), true);
    assert.strictEqual(validateRoutingNumber('200261742'), true);
    assert.strictEqual(validateRoutingNumber('08526'), false, 'Short routing number must be rejected');
    assert.strictEqual(validateRoutingNumber('0852617420'), false, '10-digit routing number must be rejected');
    assert.strictEqual(validateRoutingNumber('08526174A'), false, 'Alphanumeric routing number must be rejected');
    assert.strictEqual(validateRoutingNumber(''), false);
    assert.strictEqual(validateRoutingNumber(null), false);
  });

  runTest('3.2: validateBangladeshiMobile enforces 11-digit Bangladeshi operator prefixes', () => {
    assert.strictEqual(validateBangladeshiMobile('01712345678'), true, 'GP 017 valid');
    assert.strictEqual(validateBangladeshiMobile('01312345678'), true, 'GP 013 valid');
    assert.strictEqual(validateBangladeshiMobile('01812345678'), true, 'Robi 018 valid');
    assert.strictEqual(validateBangladeshiMobile('01612345678'), true, 'Airtel 016 valid');
    assert.strictEqual(validateBangladeshiMobile('01912345678'), true, 'Banglalink 019 valid');
    assert.strictEqual(validateBangladeshiMobile('01412345678'), true, 'Banglalink 014 valid');
    assert.strictEqual(validateBangladeshiMobile('01512345678'), true, 'Teletalk 015 valid');
    assert.strictEqual(validateBangladeshiMobile('01212345678'), false, 'Invalid prefix 012 rejected');
    assert.strictEqual(validateBangladeshiMobile('01112345678'), false, 'Citycell 011 rejected');
    assert.strictEqual(validateBangladeshiMobile('0171234567'), false, '10 digits rejected');
    assert.strictEqual(validateBangladeshiMobile('017123456789'), false, '12 digits rejected');
    assert.strictEqual(validateBanglaMobile('01712345678'), true, 'Alias validateBanglaMobile must work identically');
  });

  // -------------------------------------------------------------
  // GROUP 4: Beneficiary Payload Validation
  // -------------------------------------------------------------
  console.log('\n[GROUP 4: Beneficiary Payload Validation]');

  runTest('4.1: validateBeneficiaryPayload validates complete Bank beneficiary payload', () => {
    const validBank = {
      targetType: 'BANK',
      accountName: 'Abdur Rahim',
      accountNumber: '2050123456789',
      bankName: 'Islami Bank Bangladesh Ltd',
      routingNumber: '125261742',
    };
    const res = validateBeneficiaryPayload(validBank);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors.length, 0);
  });

  runTest('4.2: validateBeneficiaryPayload rejects incomplete or malformed Bank beneficiary payload', () => {
    const invalidBank = {
      targetType: 'BANK',
      accountName: 'A', // too short
      accountNumber: '12', // too short
      bankName: '',
      routingNumber: '12345', // invalid routing
    };
    const res = validateBeneficiaryPayload(invalidBank);
    assert.strictEqual(res.valid, false);
    assert(res.errors.includes('INVALID_ACCOUNT_NAME'));
    assert(res.errors.includes('INVALID_ACCOUNT_NUMBER'));
    assert(res.errors.includes('INVALID_BANK_NAME'));
    assert(res.errors.includes('INVALID_ROUTING_NUMBER'));
  });

  runTest('4.3: validateBeneficiaryPayload validates complete MFS beneficiary payload', () => {
    const validMfs = {
      targetType: 'MFS',
      accountName: 'Kamal Stores',
      walletNo: '01898765432',
      walletType: 'BKASH',
    };
    const res = validateBeneficiaryPayload(validMfs);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors.length, 0);
  });

  runTest('4.4: validateBeneficiaryPayload rejects invalid MFS operator or phone number', () => {
    const invalidMfs = {
      targetType: 'MFS',
      accountName: '',
      walletNo: '01234567890', // invalid prefix
      walletType: 'UNKNOWN_WALLET',
    };
    const res = validateBeneficiaryPayload(invalidMfs);
    assert.strictEqual(res.valid, false);
    assert(res.errors.includes('INVALID_ACCOUNT_NAME'));
    assert(res.errors.includes('INVALID_WALLET_NUMBER'));
    assert(res.errors.includes('INVALID_MFS_PROVIDER'));
  });

  // -------------------------------------------------------------
  // GROUP 5: DTO Normalizers
  // -------------------------------------------------------------
  console.log('\n[GROUP 5: DTO Normalizers]');

  runTest('5.1: formatBankAccountItem normalizes raw bank account into complete BankAccountDto', () => {
    const raw = {
      id: 101,
      accountName: 'Tanvir Hossain',
      accountNumber: '11029384756',
      bankName: 'BRAC Bank Ltd',
      bankCode: 'BBL',
      routingNumber: '060261742',
      branchName: 'Uttara Branch',
      instantTransferSupported: true,
      shouldAddMoney: true,
      status: 'VERIFIED',
      isFavorite: true,
    };
    const dto = formatBankAccountItem(raw);
    assert.strictEqual(dto.id, 101);
    assert.strictEqual(dto.targetType, 'BANK');
    assert.strictEqual(dto.accountName, 'Tanvir Hossain');
    assert.strictEqual(dto.accountNumber, '11029384756');
    assert.strictEqual(dto.maskedAccountNumber, '**** **** 4756');
    assert.strictEqual(dto.bankCode, 'BBL');
    assert.strictEqual(dto.bankName, 'BRAC Bank Ltd');
    assert.strictEqual(dto.routingNo, '060261742');
    assert.strictEqual(dto.branchName, 'Uttara Branch');
    assert.strictEqual(dto.instantTransferSupported, true);
    assert.strictEqual(dto.isLoanAccount, false);
    assert.strictEqual(dto.status, 'VERIFIED');
    assert.strictEqual(dto.isFavorite, true);
    assert(dto.createdAt && dto.updatedAt);
  });

  runTest('5.2: formatMfsAccountItem normalizes raw MFS account into complete MfsAccountDto', () => {
    const raw = {
      id: 202,
      accountName: 'Bhai Bhai Traders',
      walletNo: '01711223344',
      walletType: 'nagad',
      isFavorite: false,
    };
    const dto = formatMfsAccountItem(raw);
    assert.strictEqual(dto.id, 202);
    assert.strictEqual(dto.targetType, 'MFS');
    assert.strictEqual(dto.accountName, 'Bhai Bhai Traders');
    assert.strictEqual(dto.walletNo, '01711223344');
    assert.strictEqual(dto.maskedWalletNo, '017****3344');
    assert.strictEqual(dto.walletType, 'NAGAD');
    assert.strictEqual(dto.status, 'ACTIVE');
    assert.strictEqual(dto.instantTransferSupported, true);
    assert.strictEqual(dto.isFavorite, false);
    assert(dto.createdAt && dto.updatedAt);
  });

  runTest('5.3: formatSavedRecipient normalizes raw saved recipient into SavedNumberDto', () => {
    const raw = {
      name: 'Salma Akter',
      mobileNumber: '01988776655',
      walletType: 'rocket',
    };
    const dto = formatSavedRecipient(raw);
    assert.strictEqual(dto.name, 'Salma Akter');
    assert.strictEqual(dto.mobileNumber, '01988776655');
    assert.strictEqual(dto.walletNumber, '01988776655');
    assert.strictEqual(dto.walletType, 'ROCKET');
    assert(dto.txnDate);
  });

  // -------------------------------------------------------------
  // GROUP 6: Penny Deposit Verification Engine
  // -------------------------------------------------------------
  console.log('\n[GROUP 6: Penny Deposit Verification Engine]');

  runTest('6.1: verifyBankPennyDeposit successfully verifies pending bank account with 0.45 BDT', () => {
    const bank = {
      id: 1,
      accountName: 'Md. Shafiqul Islam',
      accountNumber: '2050998877665',
      status: 'UNVERIFIED',
    };
    const res = verifyBankPennyDeposit(bank, 0.45);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'VERIFIED');
    assert.strictEqual(bank.status, 'VERIFIED');
  });

  runTest('6.2: verifyBankPennyDeposit rejects micro-deposit amount outside 0.01 - 1.00 BDT interval', () => {
    const bank = {
      id: 2,
      accountName: 'Kamal Ahmed',
      accountNumber: '2050112233445',
      status: 'UNVERIFIED',
    };
    const resTooHigh = verifyBankPennyDeposit(bank, 1.50);
    assert.strictEqual(resTooHigh.success, false);
    assert.strictEqual(resTooHigh.status, 'REJECTED');
    assert.strictEqual(bank.status, 'REJECTED');

    const resZero = verifyBankPennyDeposit(bank, 0.00);
    assert.strictEqual(resZero.success, false);
  });

  runTest('6.3: verifyBankPennyDeposit is idempotent for already verified accounts', () => {
    const bank = {
      id: 3,
      accountName: 'Nasir Uddin',
      accountNumber: '2050554433221',
      status: 'ACTIVE',
    };
    const res = verifyBankPennyDeposit(bank, 0.50);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.message, 'Account already verified');
  });

  // -------------------------------------------------------------
  // GROUP 7: Remittance Pre-population & Fast Dispatch
  // -------------------------------------------------------------
  console.log('\n[GROUP 7: Remittance Pre-population & Fast Dispatch]');

  runTest('7.1: buildPrepopulatedRemittance for Bank selects NPSB_INSTANT when instant supported', () => {
    const bank = {
      targetType: 'BANK',
      accountName: 'Habibur Rahman',
      accountNumber: '2050123456789',
      bankName: 'Islami Bank Bangladesh Ltd',
      routingNo: '125261742',
      instantTransferSupported: true,
    };
    const remittance = buildPrepopulatedRemittance(bank, 5000);
    assert.strictEqual(remittance.targetType, 'BANK');
    assert.strictEqual(remittance.recipientName, 'Habibur Rahman');
    assert.strictEqual(remittance.recipientIdentifier, '2050123456789');
    assert.strictEqual(remittance.maskedIdentifier, '**** **** 6789');
    assert.strictEqual(remittance.transferMode, 'NPSB_INSTANT');
    assert.strictEqual(remittance.amount, 5000);
    assert.strictEqual(remittance.amountPaisa, 500000);
    assert.strictEqual(remittance.feePaisa, 1000); // ৳10 instant NPSB fee
    assert.strictEqual(remittance.totalPayablePaisa, 501000);
    assert.strictEqual(remittance.totalPayable, 5010);
  });

  runTest('7.2: buildPrepopulatedRemittance for Bank selects BEFTN_NORMAL when instant not supported', () => {
    const bank = {
      targetType: 'BANK',
      accountName: 'Mizanur Rahman',
      accountNumber: '1050987654321',
      bankName: 'Sonali Bank PLC',
      routingNo: '200261742',
      instantTransferSupported: false,
    };
    const remittance = buildPrepopulatedRemittance(bank, 2000);
    assert.strictEqual(remittance.targetType, 'BANK');
    assert.strictEqual(remittance.transferMode, 'BEFTN_NORMAL');
    assert.strictEqual(remittance.amount, 2000);
    assert.strictEqual(remittance.feePaisa, 0); // free BEFTN
    assert.strictEqual(remittance.totalPayablePaisa, 200000);
    assert.strictEqual(remittance.totalPayable, 2000);
  });

  runTest('7.3: buildPrepopulatedRemittance for MFS selects WALLET_INSTANT with P2P fee', () => {
    const mfs = {
      targetType: 'MFS',
      accountName: 'Rakib Enterprise',
      walletNo: '01812345678',
      walletType: 'BKASH',
    };
    const remittance = buildPrepopulatedRemittance(mfs, 1000);
    assert.strictEqual(remittance.targetType, 'MFS');
    assert.strictEqual(remittance.recipientName, 'Rakib Enterprise');
    assert.strictEqual(remittance.recipientIdentifier, '01812345678');
    assert.strictEqual(remittance.maskedIdentifier, '018****5678');
    assert.strictEqual(remittance.transferMode, 'WALLET_INSTANT');
    assert.strictEqual(remittance.amount, 1000);
    assert.strictEqual(remittance.amountPaisa, 100000);
    assert.strictEqual(remittance.feePaisa, 500); // ৳5 send money fee
    assert.strictEqual(remittance.totalPayablePaisa, 100500);
    assert.strictEqual(remittance.totalPayable, 1005);
  });

  runTest('7.4: queryBeneficiaries filters, searches, sorts favorites, and paginates items', () => {
    const sampleList = [
      { id: '1', targetType: 'BANK', accountName: 'Zahirul Islam', accountNumber: '20501111111', isFavorite: false, createdAt: '2026-11-01T10:00:00Z' },
      { id: '2', targetType: 'MFS', accountName: 'Al-Madina Store', walletNo: '01711111111', isFavorite: true, createdAt: '2026-11-02T10:00:00Z' },
      { id: '3', targetType: 'BANK', accountName: 'Bashundhara Paper', accountNumber: '20502222222', isFavorite: true, createdAt: '2026-11-03T10:00:00Z' },
      { id: '4', targetType: 'MFS', accountName: 'Chowdhury Auto', walletNo: '01822222222', isFavorite: false, createdAt: '2026-11-04T10:00:00Z' },
    ];

    // Filter by targetType
    const bankOnly = queryBeneficiaries(sampleList, { targetType: 'BANK' });
    assert.strictEqual(bankOnly.totalCount, 2);
    assert(bankOnly.items.every((b) => b.targetType === 'BANK'));

    // Filter by search query
    const searchRes = queryBeneficiaries(sampleList, { search: 'Chowdhury' });
    assert.strictEqual(searchRes.totalCount, 1);
    assert.strictEqual(searchRes.items[0].accountName, 'Chowdhury Auto');

    // Favorite sorting: favorites must appear first
    const allSorted = queryBeneficiaries(sampleList, {});
    assert.strictEqual(allSorted.items[0].isFavorite, true);
    assert.strictEqual(allSorted.items[1].isFavorite, true);
    assert.strictEqual(allSorted.items[2].isFavorite, false);

    // Pagination
    const page1 = queryBeneficiaries(sampleList, { offset: 0, limit: 2 });
    assert.strictEqual(page1.items.length, 2);
    assert.strictEqual(page1.hasMore, true);
    const page2 = queryBeneficiaries(sampleList, { offset: 2, limit: 2 });
    assert.strictEqual(page2.items.length, 2);
    assert.strictEqual(page2.hasMore, false);
  });

  // -------------------------------------------------------------
  // GROUP 8: Storage Repository CRUD & Multi-Tenant Isolation
  // -------------------------------------------------------------
  console.log('\n[GROUP 8: Storage Repository CRUD & Multi-Tenant Isolation]');

  await runAsyncTest('8.1: Storage repository creates and saves Bank and MFS beneficiaries', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const bankRes = await repo.saveTallyPayBeneficiary('1', {
      targetType: 'BANK',
      accountName: 'Abdul Karim',
      accountNumber: '2050123456789',
      bankName: 'Islami Bank Bangladesh Ltd',
      routingNumber: '125261742',
      instantTransferSupported: true,
      isFavorite: true,
    });
    assert.strictEqual(bankRes.success, true);
    assert(bankRes.beneficiary.id);
    assert.strictEqual(bankRes.beneficiary.maskedAccountNumber, '**** **** 6789');

    const mfsRes = await repo.saveTallyPayBeneficiary('1', {
      targetType: 'MFS',
      accountName: 'Rahim Electronics',
      walletNo: '01898765432',
      walletType: 'BKASH',
      isFavorite: false,
    });
    assert.strictEqual(mfsRes.success, true);
    assert.strictEqual(mfsRes.beneficiary.maskedWalletNo, '018****5432');

    const listRes = repo.getTallyPayBeneficiaries('1');
    assert.strictEqual(listRes.totalCount, 2);
    assert.strictEqual(listRes.items.length, 2);
  });

  await runAsyncTest('8.2: Multi-tenant isolation: Business 1 and Business 2 beneficiaries never leak', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.saveTallyPayBeneficiary('biz_A', {
      targetType: 'BANK',
      accountName: 'Biz A Supplier',
      accountNumber: '1111222233334',
      bankName: 'The City Bank Ltd',
      routingNumber: '085261742',
    });

    await repo.saveTallyPayBeneficiary('biz_B', {
      targetType: 'BANK',
      accountName: 'Biz B Supplier',
      accountNumber: '1111222233334', // Same account number in different business!
      bankName: 'The City Bank Ltd',
      routingNumber: '085261742',
    });

    const bizAList = repo.getTallyPayBeneficiaries('biz_A');
    const bizBList = repo.getTallyPayBeneficiaries('biz_B');

    assert.strictEqual(bizAList.totalCount, 1);
    assert.strictEqual(bizAList.items[0].accountName, 'Biz A Supplier');

    assert.strictEqual(bizBList.totalCount, 1);
    assert.strictEqual(bizBList.items[0].accountName, 'Biz B Supplier');
  });

  await runAsyncTest('8.3: getTallyPayBeneficiaryById and updateTallyPayBeneficiary adhere to tenant boundaries', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const saveRes = await repo.saveTallyPayBeneficiary('1', {
      targetType: 'MFS',
      accountName: 'Original Account Name',
      walletNo: '01712345678',
      walletType: 'NAGAD',
      isFavorite: false,
    });
    const id = saveRes.beneficiary.id;

    // Retrieve by ID in same tenant
    const item = repo.getTallyPayBeneficiaryById('1', id);
    assert(item, 'Item must be found in business 1');
    assert.strictEqual(item.accountName, 'Original Account Name');

    // Cross-tenant retrieval must return null
    const crossItem = repo.getTallyPayBeneficiaryById('2', id);
    assert.strictEqual(crossItem, null, 'Item must not be accessible from business 2');

    // Update beneficiary
    const updateRes = await repo.updateTallyPayBeneficiary('1', id, {
      accountName: 'Updated Account Name',
      isFavorite: true,
      status: 'VERIFIED',
    });
    assert.strictEqual(updateRes.success, true);
    assert.strictEqual(updateRes.beneficiary.accountName, 'Updated Account Name');
    assert.strictEqual(updateRes.beneficiary.isFavorite, true);
    assert.strictEqual(updateRes.beneficiary.status, 'VERIFIED');
  });

  await runAsyncTest('8.4: deleteTallyPayBeneficiary enforces 4-digit PIN security authorization', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const saveRes = await repo.saveTallyPayBeneficiary('1', {
      targetType: 'BANK',
      accountName: 'Account to Delete',
      accountNumber: '9999888877776',
      bankName: 'Pubali Bank Ltd',
      routingNumber: '180261742',
    });
    const id = saveRes.beneficiary.id;

    // Deletion with invalid short PIN must throw or reject
    let threwInvalidPin = false;
    try {
      await repo.deleteTallyPayBeneficiary('1', id, '12'); // 2 digits only
    } catch (e) {
      threwInvalidPin = true;
    }
    assert.strictEqual(threwInvalidPin, true, 'Short PIN must be rejected');

    // Deletion with valid 4-digit PIN must succeed
    const delRes = await repo.deleteTallyPayBeneficiary('1', id, '1234');
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(repo.getTallyPayBeneficiaryById('1', id), null);
  });

  // -------------------------------------------------------------
  // GROUP 9: Cascade Deletion & State Sanitization
  // -------------------------------------------------------------
  console.log('\n[GROUP 9: Cascade Deletion & State Sanitization]');

  await runAsyncTest('9.1: deleteBusinessCascade purges tallyPayBeneficiaries for deleted business only', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    // Add business 2
    await repo.saveTallyPayBeneficiary('2', {
      targetType: 'BANK',
      accountName: 'Biz 2 Beneficiary',
      accountNumber: '2222333344445',
      bankName: 'Eastern Bank Ltd',
      routingNumber: '105261742',
    });

    await repo.saveTallyPayBeneficiary('1', {
      targetType: 'BANK',
      accountName: 'Biz 1 Beneficiary',
      accountNumber: '1111333344445',
      bankName: 'Eastern Bank Ltd',
      routingNumber: '105261742',
    });

    // Cascade delete business 2
    await repo.deleteBusinessCascade('2');

    // Verify Biz 2 beneficiaries purged
    const biz2List = repo.getTallyPayBeneficiaries('2');
    assert.strictEqual(biz2List.totalCount, 0, 'Business 2 beneficiaries must be purged');

    // Verify Biz 1 beneficiaries remain intact
    const biz1List = repo.getTallyPayBeneficiaries('1');
    assert.strictEqual(biz1List.totalCount, 1, 'Business 1 beneficiaries must remain intact');
    assert.strictEqual(biz1List.items[0].accountName, 'Biz 1 Beneficiary');
  });

  runTest('9.2: sanitizeState ensures tallyPayBeneficiaries collection is initialized to array', () => {
    const rawState = { accounts: [], journals: [] };
    const sanitized = sanitizeState(rawState);
    assert(Array.isArray(sanitized.tallyPayBeneficiaries), 'tallyPayBeneficiaries must be initialized');
    assert.strictEqual(VALID_COLLECTIONS.has('tallyPayBeneficiaries'), true);
  });

  await runAsyncTest('9.3: getFullBackupState sanitizes credentials, PINs, and tokens from beneficiaries', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    await repo.saveTallyPayBeneficiary('1', {
      targetType: 'BANK',
      accountName: 'Secure Merchant',
      accountNumber: '2050123456789',
      bankName: 'Islami Bank Bangladesh Ltd',
      routingNumber: '125261742',
      pin: '1234',
      rawPin: '1234',
      sessionToken: 'xyz_secret_token',
      credential: 'hash_secret_credential',
    });

    const backupState = await repo.getFullBackupState();
    assert(Array.isArray(backupState.tallyPayBeneficiaries));
    assert.strictEqual(backupState.tallyPayBeneficiaries.length, 1);
    const backedUp = backupState.tallyPayBeneficiaries[0];
    assert.strictEqual(backedUp.pin, undefined, 'pin must be sanitized');
    assert.strictEqual(backedUp.rawPin, undefined, 'rawPin must be sanitized');
    assert.strictEqual(backedUp.sessionToken, undefined, 'sessionToken must be sanitized');
    assert.strictEqual(backedUp.credential, undefined, 'credential must be sanitized');
    assert.strictEqual(backedUp.accountName, 'Secure Merchant');
  });

  await runAsyncTest('9.4: commitRestorePayload restores tallyPayBeneficiaries accurately', async () => {
    const adapter = new MockAsyncStorageAdapter();
    const repo = new StorageRepository(adapter);
    await repo.loadInitialData();

    const payload = {
      manifest: { backupVersion: 6, backupOwner: { sub: 'merchant_99' } },
      data: {
        ...createDefaultState(),
        tallyPayBeneficiaries: [
          {
            id: 'restored_1',
            businessId: '1',
            targetType: 'BANK',
            accountName: 'Restored Bank Account',
            accountNumber: '2050999988887',
            bankName: 'BRAC Bank Ltd',
            routingNo: '060261742',
            status: 'VERIFIED',
          },
        ],
      },
    };

    await repo.commitRestorePayload(payload);
    const list = repo.getTallyPayBeneficiaries('1');
    assert.strictEqual(list.totalCount, 1);
    assert.strictEqual(list.items[0].id, 'restored_1');
    assert.strictEqual(list.items[0].accountName, 'Restored Bank Account');
  });

  // -------------------------------------------------------------
  // GROUP 10: Beneficiary Engine Facade & Performance Benchmark
  // -------------------------------------------------------------
  console.log('\n[GROUP 10: Beneficiary Engine Facade & Performance Benchmark]');

  runTest('10.1: BeneficiaryBookEngine simulation facade executes full lifecycle matching Reference Group 10', () => {
    const engine = new BeneficiaryBookEngine();

    // 1. Obscuring static tests
    assert.strictEqual(BeneficiaryBookEngine.getObscureAccountNumber('1234567890123'), '**** **** 0123');
    assert.strictEqual(BeneficiaryBookEngine.getObscureAccountNumber('9988'), '**** **** 9988');
    assert.strictEqual(BeneficiaryBookEngine.getObscureAccountNumber(''), '**** **** ****');
    assert.strictEqual(BeneficiaryBookEngine.getObscureMobileNumber('01712345678'), '017****5678');

    // 2. Routing validation
    assert.strictEqual(BeneficiaryBookEngine.validateRoutingNumber('085261742'), true);
    assert.strictEqual(BeneficiaryBookEngine.validateRoutingNumber('08526'), false);
    assert.strictEqual(BeneficiaryBookEngine.validateRoutingNumber('08526174A'), false);

    // 3. Mobile validation
    assert.strictEqual(BeneficiaryBookEngine.validateBanglaMobile('01712345678'), true);
    assert.strictEqual(BeneficiaryBookEngine.validateBanglaMobile('01812345678'), true);
    assert.strictEqual(BeneficiaryBookEngine.validateBanglaMobile('01212345678'), false);

    // 4. Add Bank Beneficiary
    const b1 = engine.addBankBeneficiary({
      accountName: 'Abdul Karim',
      accountNumber: '2050123456789',
      bankName: 'Islami Bank Bangladesh Ltd',
      routingNumber: '125261742',
      instantTransferSupported: true,
      shouldAddMoney: true,
    });
    assert.strictEqual(b1.id, 1);
    assert.strictEqual(b1.status, 'UNVERIFIED');

    // 5. Add MFS Beneficiary
    const m1 = engine.addMfsBeneficiary({
      accountName: 'Rahim Store',
      walletNo: '01898765432',
      walletType: 'BKASH',
    });
    assert.strictEqual(m1.id, 2);
    assert.strictEqual(m1.walletType, 'BKASH');

    // 6. Add Saved Recipient
    const s1 = engine.addSavedRecipient({
      name: 'Fatema Begum',
      mobileNumber: '01912345678',
      walletType: 'NAGAD',
    });
    assert.strictEqual(s1.walletType, 'NAGAD');

    // 7. Penny Verification
    const pRes = engine.verifyPennyDeposit(b1.id, 0.45);
    assert.strictEqual(pRes.success, true);
    assert.strictEqual(pRes.status, 'VERIFIED');

    // 8. Query All Accounts
    const all = engine.getAllAccounts();
    assert.strictEqual(all.bankAccounts.length, 1);
    assert.strictEqual(all.mfsAccounts.length, 1);

    // 9. Prepopulate Remittance
    const preBank = engine.prepopulateRemittanceForSendMoney('BANK', b1.id);
    assert.strictEqual(preBank.targetType, 'BANK');
    assert.strictEqual(preBank.recipientName, 'Abdul Karim');
    assert.strictEqual(preBank.maskedIdentifier, '**** **** 6789');
    assert.strictEqual(preBank.transferMode, 'NPSB_INSTANT');

    const preMfs = engine.prepopulateRemittanceForSendMoney('MFS', m1.id);
    assert.strictEqual(preMfs.targetType, 'MFS');
    assert.strictEqual(preMfs.recipientIdentifier, '01898765432');
    assert.strictEqual(preMfs.maskedIdentifier, '018****5432');
    assert.strictEqual(preMfs.transferMode, 'WALLET_INSTANT');

    // 10. Deletion with PIN
    const delRes = engine.deleteBankAccount(b1.routingNo, b1.accountNumber, '1234');
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(engine.getAllAccounts().bankAccounts.length, 0);

    // Verify alias ReconstructedBeneficiaryBookEngine
    assert.strictEqual(ReconstructedBeneficiaryBookEngine, BeneficiaryBookEngine);
  });

  runTest('10.2: Performance benchmark: 1,000 beneficiary operations executed in < 200ms (< 0.2ms/op)', () => {
    const mockList = [];
    for (let i = 0; i < 1000; i++) {
      const isBank = i % 2 === 0;
      mockList.push({
        id: String(i + 1),
        targetType: isBank ? 'BANK' : 'MFS',
        accountName: isBank ? `Merchant Supplier ${i}` : `Retail Customer ${i}`,
        accountNumber: isBank ? `2050${String(100000000 + i)}` : `017${String(10000000 + i)}`,
        walletNo: isBank ? '' : `017${String(10000000 + i)}`,
        bankName: isBank ? 'Islami Bank Bangladesh Ltd' : 'BKASH',
        routingNo: isBank ? '125261742' : '',
        instantTransferSupported: true,
        isFavorite: i % 5 === 0,
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
      });
    }

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      const item = mockList[i];
      if (item.targetType === 'BANK') {
        formatBankAccountItem(item);
      } else {
        formatMfsAccountItem(item);
      }
      buildPrepopulatedRemittance(item, 500);
    }
    const filtered = queryBeneficiaries(mockList, { search: 'Supplier', isFavorite: true, offset: 0, limit: 20 });
    const elapsed = Date.now() - start;

    console.log(`    -> 1,000 beneficiary normalizations, remittances & queries in ${elapsed}ms (${(elapsed / 1000).toFixed(4)}ms/op)`);
    assert(elapsed < 200, `Benchmark should complete in < 200ms, took ${elapsed}ms`);
    assert(filtered.totalCount > 0);
  });

  console.log('\n================================================================================');
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests} (${Math.round((passedTests / totalTests) * 100)}% SUCCESS)`);
  console.log('================================================================================');

  if (totalTests !== passedTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
