/**
 * test_iteration_234_transfer_backend.js
 *
 * Comprehensive Unit and Integration Test Suite for Milestone REA-ITER-234:
 * TallyPay Money Out / Wallet Transfer Subsystem & Customer Aday Integration
 *
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 * Milestone: REA-ITER-234
 */

const assert = require("assert");
const tallyPayService = require("./src/tallyPayService");
const storageRepoModule = require("./src/storageRepository");

const {
  TRANSFER_CHANNELS,
  TransferChannel,
  TRANSFER_FEES,
  TRANSFER_LIMITS,
  TRANSFER_ARSC_TOKENS,
  calculateTransferFee,
  validateTransferLimits,
  selectCustomerForAday,
  generateAdayPaymentLink,
  generateAdaySmsText,
  recordAdayCollection,
  ReconstructedTransferEngine,
  TransferEngine,
  TallyPayTransferEngine,
  reconstructedTransferEngine,
  transferEngine,
} = tallyPayService;

const {
  StorageRepository,
  createDefaultState,
  sanitizeState,
  saveTransferRecord,
  getTransferHistory,
  getTransferById,
  getFullBackupState,
} = storageRepoModule;

console.log("================================================================================");
console.log("TALLYKHATA ITERATION 234: TALLYPAY TRANSFER & CUSTOMER ADAY BACKEND SUITE");
console.log("Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)");
console.log("Milestone: REA-ITER-234");
console.log("================================================================================");

let totalTests = 0;
let passedTests = 0;

async function it(desc, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log("  ✓ [PASS] " + desc);
  } catch (err) {
    console.error("  ✗ [FAIL] " + desc);
    console.error(err);
    process.exitCode = 1;
  }
}

// In-Memory Storage Adapter for Mock Isolation
class MemoryStorageAdapter {
  constructor(initialData = null) {
    this.data = initialData ? JSON.stringify(initialData) : null;
  }
  async getItem(key) {
    return this.data;
  }
  async setItem(key, value) {
    this.data = value;
  }
  async removeItem(key) {
    this.data = null;
  }
}

async function runTestSuite() {
  // ============================================================================
  // GROUP 1: Enums, Constants, Limits & ARSC Bengali String Tokens
  // ============================================================================
  console.log("\n[GROUP 1: Enums, Constants, Limits & ARSC Bengali String Tokens]");

  await it("1.1: TRANSFER_CHANNELS defines WALLET, BANK, MFS, and VISA channels", () => {
    assert(TRANSFER_CHANNELS.WALLET === "TP_WALLET");
    assert(TRANSFER_CHANNELS.TP_WALLET === "TP_WALLET");
    assert(TRANSFER_CHANNELS.BANK === "BANK");
    assert(TRANSFER_CHANNELS.BANK_REGULAR === "BANK");
    assert(TRANSFER_CHANNELS.BANK_INSTANT === "BANK_INSTANT");
    assert(TRANSFER_CHANNELS.MFS === "MFS");
    assert(TRANSFER_CHANNELS.MFS_BKASH === "MFS_BKASH");
    assert(TRANSFER_CHANNELS.MFS_NAGAD === "MFS_NAGAD");
    assert(TRANSFER_CHANNELS.MFS_ROCKET === "MFS_ROCKET");
    assert(TRANSFER_CHANNELS.VISA === "VISA");
    assert(TRANSFER_CHANNELS.VISA_DIRECT === "VISA");
    assert(TransferChannel === TRANSFER_CHANNELS);
  });

  await it("1.2: TRANSFER_FEES defines fee schedule (Wallet 0%, Bank Reg 0%, Bank Instant 1.0%, MFS 1.0%, Visa 1.5%)", () => {
    assert(TRANSFER_FEES.WALLET === 0.0);
    assert(TRANSFER_FEES.TP_WALLET === 0.0);
    assert(TRANSFER_FEES.BANK_REGULAR === 0.0);
    assert(TRANSFER_FEES.BANK_INSTANT === 0.010);
    assert(TRANSFER_FEES.BANK_INSTANT_MIN_PAISA === 1000); // ৳10 min fee
    assert(TRANSFER_FEES.MFS === 0.010);
    assert(TRANSFER_FEES.MFS_BKASH === 0.010);
    assert(TRANSFER_FEES.MFS_NAGAD === 0.010);
    assert(TRANSFER_FEES.MFS_ROCKET === 0.010);
    assert(TRANSFER_FEES.VISA === 0.015);
  });

  await it("1.3: TRANSFER_LIMITS defines regulatory limits for Wallet, Bank, and MFS", () => {
    assert(TRANSFER_LIMITS.wallet.minPaisa === 1000); // ৳10
    assert(TRANSFER_LIMITS.wallet.maxPaisa === 2500000); // ৳25,000
    assert(TRANSFER_LIMITS.bankRegular.minPaisa === 10000); // ৳100
    assert(TRANSFER_LIMITS.bankRegular.maxPaisa === 5000000); // ৳50,000
    assert(TRANSFER_LIMITS.bankInstant.minPaisa === 10000); // ৳100
    assert(TRANSFER_LIMITS.bankInstant.maxPaisa === 5000000); // ৳50,000
    assert(TRANSFER_LIMITS.mfs.minPaisa === 5000); // ৳50
    assert(TRANSFER_LIMITS.mfs.maxPaisa === 2500000); // ৳25,000
    assert(TRANSFER_LIMITS.dailyCumulativePaisa === 10000000); // ৳1,00,000
    assert(TRANSFER_LIMITS.maxDailyTxnCount === 10);
  });

  await it("1.4: TRANSFER_ARSC_TOKENS contains 20 authentic Bengali tokens matching REF-001", () => {
    assert(TRANSFER_ARSC_TOKENS.title_send_money === "টাকা পাঠানো");
    assert(TRANSFER_ARSC_TOKENS.label_send_money_transliterated === "সেন্ড মানি");
    assert(TRANSFER_ARSC_TOKENS.title_transfer === "ট্রান্সফার");
    assert(TRANSFER_ARSC_TOKENS.option_instant_bank_transfer === "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার");
    assert(TRANSFER_ARSC_TOKENS.label_instant_transfer_charge === "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার চার্জ");
    assert(TRANSFER_ARSC_TOKENS.status_instant_transfer_active === "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার চালু করা হয়েছে");
    assert(TRANSFER_ARSC_TOKENS.status_instant_transfer_paused === "ইনস্ট্যান্ট ব্যাংক ট্রান্সফার সাময়িক ভাবে বন্ধ আছে");
    assert(TRANSFER_ARSC_TOKENS.error_bank_not_supported === "উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না");
    assert(TRANSFER_ARSC_TOKENS.error_daily_count_exceeded === "আপনি আজ সর্বোচ্চ সংখ্যক বার কার্ড-এ ব্যাংক ট্রান্সফার করেছেন");
    assert(TRANSFER_ARSC_TOKENS.action_aday === "আদায়");
    assert(TRANSFER_ARSC_TOKENS.title_aday_kori === "আদায় করি");
    assert(TRANSFER_ARSC_TOKENS.desc_baki_aday_somonvoy === "বাকি আদায় সমন্বয়");
    assert(TRANSFER_ARSC_TOKENS.prompt_payment_link_aday === "পেমেন্ট লিংক পাঠিয়ে বাকি আদায় করি");
    assert(TRANSFER_ARSC_TOKENS.status_sent === "পাঠানো হয়েছে");
    assert(TRANSFER_ARSC_TOKENS.label_amount === "টাকার পরিমাণ");
    assert(TRANSFER_ARSC_TOKENS.label_min === "সর্বনিম্ন");
    assert(TRANSFER_ARSC_TOKENS.label_max === "সর্বোচ্চ");
    assert(TRANSFER_ARSC_TOKENS.label_charge === "চার্জ");
    assert(TRANSFER_ARSC_TOKENS.btn_next === "পরবর্তী");
    assert(TRANSFER_ARSC_TOKENS.btn_confirm === "নিশ্চিত");
  });

  // ============================================================================
  // GROUP 2: Integer-Paisa Fee Calculation & Regulatory Limit Validation
  // ============================================================================
  console.log("\n[GROUP 2: Integer-Paisa Fee Calculation & Regulatory Limit Validation]");

  await it("2.1: calculateTransferFee returns 0 for Wallet-to-Wallet and Regular Bank (BEFTN)", () => {
    assert.strictEqual(calculateTransferFee("TP_WALLET", 100000), 0);
    assert.strictEqual(calculateTransferFee("WALLET", 500000), 0);
    assert.strictEqual(calculateTransferFee("BANK", 500000, false), 0);
    assert.strictEqual(calculateTransferFee("BANK_REGULAR", 1000000, false), 0);
  });

  await it("2.2: calculateTransferFee enforces 1.0% fee with min ৳10 (1,000 paisa) floor for Instant NPSB", () => {
    // ৳500 (50,000 paisa) -> 1% is 500 paisa, but floor is 1,000 paisa (৳10)
    assert.strictEqual(calculateTransferFee("BANK", 50000, true), 1000);
    // ৳1,000 (100,000 paisa) -> 1% is 1,000 paisa (৳10)
    assert.strictEqual(calculateTransferFee("BANK", 100000, true), 1000);
    // ৳3,000 (300,000 paisa) -> 1% is 3,000 paisa (৳30)
    assert.strictEqual(calculateTransferFee("BANK", 300000, true), 3000);
  });

  await it("2.3: calculateTransferFee enforces 1.0% fee for MFS and 1.5% for Visa Direct", () => {
    assert.strictEqual(calculateTransferFee("MFS_BKASH", 200000), 2000); // ৳20 on ৳2,000
    assert.strictEqual(calculateTransferFee("MFS_NAGAD", 500000), 5000); // ৳50 on ৳5,000
    assert.strictEqual(calculateTransferFee("MFS", 100000), 1000); // ৳10 on ৳1,000
    assert.strictEqual(calculateTransferFee("VISA", 200000), 3000); // 1.5% on ৳2,000 = ৳30
  });

  await it("2.4: calculateTransferFee supports both (channel, amount) and (amount, channel) signatures", () => {
    assert.strictEqual(calculateTransferFee(100000, "TP_WALLET"), 0);
    assert.strictEqual(calculateTransferFee(100000, "BANK", true), 1000);
    assert.strictEqual(calculateTransferFee(200000, "MFS_BKASH"), 2000);
  });

  await it("2.5: validateTransferLimits validates minimum and maximum per-transaction limits", () => {
    // Below wallet minimum ৳10 (1,000 paisa)
    const v1 = validateTransferLimits("TP_WALLET", 500);
    assert.strictEqual(v1.valid, false);
    assert(v1.error.includes("সর্বনিম্ন"));

    // Above wallet maximum ৳25,000 (2,500,000 paisa)
    const v2 = validateTransferLimits("TP_WALLET", 3000000);
    assert.strictEqual(v2.valid, false);
    assert(v2.error.includes("সর্বোচ্চ"));

    // Below bank minimum ৳100 (10,000 paisa)
    const v3 = validateTransferLimits("BANK", 5000, false);
    assert.strictEqual(v3.valid, false);
    assert(v3.error.includes("সর্বনিম্ন"));

    // Valid bank amount ৳5,000
    const v4 = validateTransferLimits("BANK", 500000, false);
    assert.strictEqual(v4.valid, true);
    assert.strictEqual(v4.feePaisa, 0);
    assert.strictEqual(v4.totalDeductionPaisa, 500000);
  });

  await it("2.6: validateTransferLimits enforces daily cumulative ceiling (৳1,00,000)", () => {
    const dailyAccumulated = 9500000; // ৳95,000 already transferred
    const attempt = 1000000; // Attempt ৳10,000 -> Total ৳1,05,000 exceeds ৳1,00,000
    const val = validateTransferLimits("BANK", attempt, false, dailyAccumulated);
    assert.strictEqual(val.valid, false);
    assert(val.error.includes("দৈনিক ট্রান্সফার সীমা"));
  });

  await it("2.7: validateTransferLimits enforces max daily transaction count", () => {
    const val = validateTransferLimits("BANK", 50000, false, 0, 10);
    assert.strictEqual(val.valid, false);
    assert(val.error.includes("সর্বোচ্চ সংখ্যক বার"));
  });

  await it("2.8: validateTransferLimits rejects transfer when total deduction exceeds balance", () => {
    const val = validateTransferLimits("BANK", 500000, true, 0, 0, 400000); // Balance ৳4,000 < ৳5,000 + fee
    assert.strictEqual(val.valid, false);
    assert.strictEqual(val.error, "পর্যাপ্ত ব্যালেন্স নেই");
  });

  // ============================================================================
  // GROUP 3: Peer-to-Peer Wallet Transfer Execution
  // ============================================================================
  console.log("\n[GROUP 3: Peer-to-Peer Wallet Transfer Execution]");

  await it("3.1: Rejects wallet transfer with invalid 11-digit mobile number", async () => {
    const engine = new ReconstructedTransferEngine(1000000);
    let failed = false;
    try {
      await engine.executeWalletTransfer("1", {
        recipientMobile: "01700", // Invalid length
        amountPaisa: 20000,
        pin: "1234",
      });
    } catch (e) {
      failed = true;
      assert(e.message.includes("সঠিক ১১ ডিজিটের"));
    }
    assert.strictEqual(failed, true);
  });

  await it("3.2: Rejects wallet transfer with incorrect PIN", async () => {
    const engine = new ReconstructedTransferEngine(1000000);
    let failed = false;
    try {
      await engine.executeWalletTransfer("1", {
        recipientMobile: "01711000000",
        amountPaisa: 20000,
        pin: "9999",
      });
    } catch (e) {
      failed = true;
      assert.strictEqual(e.message, "ভুল পিন নম্বর");
    }
    assert.strictEqual(failed, true);
  });

  await it("3.3: Successfully executes wallet transfer with 0 fee and exact balance deduction", async () => {
    const initialBal = 1000000; // ৳10,000
    const engine = new ReconstructedTransferEngine(initialBal);
    const txn = await engine.executeWalletTransfer("1", {
      recipientMobile: "01711223344",
      amountPaisa: 200000, // ৳2,000
      pin: "1234",
    });

    assert.strictEqual(txn.status, "SUCCESS");
    assert.strictEqual(txn.feePaisa, 0);
    assert.strictEqual(txn.amountPaisa, 200000);
    assert.strictEqual(txn.totalDeductionPaisa, 200000);
    assert.strictEqual(engine.walletBalancePaisa, initialBal - 200000);
    assert.strictEqual(engine.dailyTransferredPaisa, 200000);
    assert.strictEqual(engine.dailyTransferCount, 1);
  });

  // ============================================================================
  // GROUP 4: Bank Transfer Execution & NPSB vs BEFTN Routing
  // ============================================================================
  console.log("\n[GROUP 4: Bank Transfer Execution & NPSB vs BEFTN Routing]");

  await it("4.1: Successfully executes Regular Bank Transfer (BEFTN) with 0 fee", async () => {
    const initialBal = 1000000; // ৳10,000
    const engine = new ReconstructedTransferEngine(initialBal);
    const txn = await engine.executeBankTransfer("1", {
      bankAccount: { id: "bank_1", bankName: "City Bank", accountNumber: "1102938475" },
      amountPaisa: 300000, // ৳3,000
      isInstant: false,
      pin: "1234",
    });

    assert.strictEqual(txn.status, "SUCCESS");
    assert.strictEqual(txn.feePaisa, 0);
    assert.strictEqual(txn.totalDeductionPaisa, 300000);
    assert.strictEqual(engine.walletBalancePaisa, initialBal - 300000);
    assert(txn.note.includes("রেগুলার"));
  });

  await it("4.2: Successfully executes Instant Bank Transfer (NPSB) with 1.0% fee", async () => {
    const initialBal = 1000000; // ৳10,000
    const engine = new ReconstructedTransferEngine(initialBal);
    const txn = await engine.executeBankTransfer("1", {
      bankAccount: { id: "bank_2", bankName: "BRAC Bank", accountNumber: "1501203498", isNpsbSupported: true },
      amountPaisa: 300000, // ৳3,000
      isInstant: true,
      pin: "1234",
    });

    assert.strictEqual(txn.status, "SUCCESS");
    assert.strictEqual(txn.feePaisa, 3000); // 1.0% of ৳3,000 = ৳30
    assert.strictEqual(txn.totalDeductionPaisa, 303000); // ৳3,030
    assert.strictEqual(engine.walletBalancePaisa, initialBal - 303000);
    assert(txn.note.includes("ইনস্ট্যান্ট"));
  });

  await it("4.3: Rejects instant bank transfer when bank does not support NPSB", async () => {
    const engine = new ReconstructedTransferEngine(1000000);
    let failed = false;
    try {
      await engine.executeBankTransfer("1", {
        bankAccount: { id: "bank_legacy", bankName: "Legacy Bank", isNpsbSupported: false },
        amountPaisa: 200000,
        isInstant: true,
        pin: "1234",
      });
    } catch (e) {
      failed = true;
      assert.strictEqual(e.message, "উক্ত ব্যাংক ইনস্ট্যান্ট ট্রান্সফার সাপোর্ট করে না");
    }
    assert.strictEqual(failed, true);
  });

  // ============================================================================
  // GROUP 5: MFS Transfer Execution
  // ============================================================================
  console.log("\n[GROUP 5: MFS Transfer Execution]");

  await it("5.1: Rejects MFS transfer for invalid operator", async () => {
    const engine = new ReconstructedTransferEngine(1000000);
    let failed = false;
    try {
      await engine.executeMfsTransfer("1", {
        operator: "INVALID_OP",
        recipientMobile: "01711223344",
        amountPaisa: 20000,
        pin: "1234",
      });
    } catch (e) {
      failed = true;
      assert(e.message.includes("অসমর্থিত এমএফএস"));
    }
    assert.strictEqual(failed, true);
  });

  await it("5.2: Successfully executes bKash, Nagad, and Rocket transfers with 1.0% fee", async () => {
    const initialBal = 1000000;
    const engine = new ReconstructedTransferEngine(initialBal);
    const txn = await engine.executeMfsTransfer("1", {
      operator: "BKASH",
      recipientMobile: "01811223344",
      amountPaisa: 100000, // ৳1,000
      pin: "1234",
    });

    assert.strictEqual(txn.status, "SUCCESS");
    assert.strictEqual(txn.feePaisa, 1000); // 1.0% = ৳10
    assert.strictEqual(txn.totalDeductionPaisa, 101000);
    assert.strictEqual(engine.walletBalancePaisa, initialBal - 101000);
  });

  // ============================================================================
  // GROUP 6: Customer Due Collection & Aday Kori Integration
  // ============================================================================
  console.log("\n[GROUP 6: Customer Due Collection & Aday Kori Integration]");

  const mockCustomers = [
    { id: "cust_1", name: "করিম চাচা", mobile: "01711111111", duePaisa: 250000 },
    { id: "cust_2", name: "রহিম ভাই", mobile: "01822222222", duePaisa: 0 },
    { id: "cust_3", name: "জসিম স্টোর", mobile: "01933333333", duePaisa: 120000 },
  ];

  await it("6.1: selectCustomerForAday filters only customers with outstanding due >= minDuePaisa", () => {
    const list = selectCustomerForAday(mockCustomers, 100);
    assert.strictEqual(list.length, 2);
    assert.strictEqual(list[0].name, "করিম চাচা");
    assert.strictEqual(list[1].name, "জসিম স্টোর");
  });

  await it("6.2: selectCustomerForAday formats due amount in BDT and creates tokenized payment link", () => {
    const list = selectCustomerForAday(mockCustomers);
    assert.strictEqual(list[0].dueFormatted, "৳ 2500.00");
    assert(list[0].paymentLink.includes("tallypay.net/pay/cust_1"));
    assert(list[0].smsText.includes("বকেয়া ৳ 2500"));
  });

  await it("6.3: generateAdayPaymentLink constructs valid collection URL", () => {
    const link = generateAdayPaymentLink("1", "cust_101", 1500);
    assert(link.includes("https://tallypay.net/pay/cust_101"));
    assert(link.includes("amt=1500"));
    assert(link.includes("biz=1"));
  });

  await it("6.4: generateAdaySmsText synthesizes authentic Bengali SMS copy", () => {
    const sms = generateAdaySmsText("মেসার্স করিম ট্রেডার্স", "করিম চাচা", 2500, "https://tallypay.net/pay/c1");
    assert(sms.includes("করিম চাচা"));
    assert(sms.includes("মেসার্স করিম ট্রেডার্স"));
    assert(sms.includes("বকেয়া ৳ 2500"));
    assert(sms.includes("https://tallypay.net/pay/c1"));
  });

  await it("6.5: recordAdayCollection reconciles customer debt with 'বাকি আদায় সমন্বয়' and tag 'baki_aday'", async () => {
    const mockStorage = {
      customerAccounts: new Map([
        ["cust_1", { id: "cust_1", name: "করিম চাচা", balance: 2500, journals: [] }],
      ]),
    };

    const res = await recordAdayCollection("1", "cust_1", 1000, "TALLYPAY_LINK", "TRX_ADAY_001", mockStorage);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.collectedAmount, 1000);
    assert.strictEqual(res.remainingDue, 1500);
    assert.strictEqual(res.journalNote, "বাকি আদায় সমন্বয়");
    assert.strictEqual(res.tag, "baki_aday");
    assert.strictEqual(mockStorage.customerAccounts.get("cust_1").balance, 1500);
    assert.strictEqual(mockStorage.customerAccounts.get("cust_1").journals.length, 1);
  });

  // ============================================================================
  // GROUP 7: StorageRepository Multi-Tenant Persistence & CRUD
  // ============================================================================
  console.log("\n[GROUP 7: StorageRepository Multi-Tenant Persistence & CRUD]");

  await it("7.1: StorageRepository saves and retrieves transfer records isolated by businessId", async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    const rec1 = await repo.saveTransferRecord("1", {
      orderId: "TRX-BIZ1-01",
      recipient: "01711223344",
      channel: "TP_WALLET",
      amountPaisa: 150000,
      feePaisa: 0,
      status: "SUCCESS",
    });
    assert.strictEqual(rec1.success, true);

    const rec2 = await repo.saveTransferRecord("2", {
      orderId: "TRX-BIZ2-01",
      recipient: "01811223344",
      channel: "BANK",
      amountPaisa: 500000,
      feePaisa: 5000,
      status: "SUCCESS",
    });
    assert.strictEqual(rec2.success, true);

    const biz1History = repo.getTransferHistory("1");
    assert.strictEqual(biz1History.totalCount, 1);
    assert.strictEqual(biz1History.items[0].orderId, "TRX-BIZ1-01");
    assert.strictEqual(biz1History.totalAmountPaisa, 150000);

    const biz2History = repo.getTransferHistory("2");
    assert.strictEqual(biz2History.totalCount, 1);
    assert.strictEqual(biz2History.items[0].orderId, "TRX-BIZ2-01");
  });

  await it("7.2: getTransferHistory supports channel, status, query filtering and pagination", async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    await repo.saveTransferRecord("1", { orderId: "TRX-1", channel: "TP_WALLET", status: "SUCCESS", amountPaisa: 100000 });
    await repo.saveTransferRecord("1", { orderId: "TRX-2", channel: "BANK", status: "SUCCESS", amountPaisa: 200000 });
    await repo.saveTransferRecord("1", { orderId: "TRX-3", channel: "MFS_BKASH", status: "FAILED", amountPaisa: 300000 });

    const walletOnly = repo.getTransferHistory("1", { channel: "TP_WALLET" });
    assert.strictEqual(walletOnly.totalCount, 1);
    assert.strictEqual(walletOnly.items[0].orderId, "TRX-1");

    const failedOnly = repo.getTransferHistory("1", { status: "FAILED" });
    assert.strictEqual(failedOnly.totalCount, 1);
    assert.strictEqual(failedOnly.items[0].orderId, "TRX-3");

    const paged = repo.getTransferHistory("1", { offset: 0, limit: 2 });
    assert.strictEqual(paged.items.length, 2);
    assert.strictEqual(paged.totalCount, 3);
    assert.strictEqual(paged.hasMore, true);
  });

  await it("7.3: getTransferById retrieves single transfer by ID or orderId", async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    await repo.saveTransferRecord("1", { id: "TRX_CUSTOM_ID", orderId: "ORDER_999", amountPaisa: 50000 });
    const foundById = repo.getTransferById("1", "TRX_CUSTOM_ID");
    assert(foundById !== null);
    assert.strictEqual(foundById.orderId, "ORDER_999");

    const foundByOrder = repo.getTransferById("1", "ORDER_999");
    assert(foundByOrder !== null);
    assert.strictEqual(foundByOrder.id, "TRX_CUSTOM_ID");
  });

  // ============================================================================
  // GROUP 8: Business Cascade Deletion
  // ============================================================================
  console.log("\n[GROUP 8: Business Cascade Deletion]");

  await it("8.1: deleteBusinessCascade purges transferHistory for deleted business only", async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    await repo.saveTransferRecord("1", { orderId: "T-B1", amountPaisa: 10000 });
    await repo.saveTransferRecord("2", { orderId: "T-B2", amountPaisa: 20000 });

    await repo.deleteBusinessCascade("1");

    const b1History = repo.getTransferHistory("1");
    assert.strictEqual(b1History.totalCount, 0);

    const b2History = repo.getTransferHistory("2");
    assert.strictEqual(b2History.totalCount, 1);
    assert.strictEqual(b2History.items[0].orderId, "T-B2");
  });

  // ============================================================================
  // GROUP 9: Cloud Backup Sanitization & Serialization
  // ============================================================================
  console.log("\n[GROUP 9: Cloud Backup Sanitization & Serialization]");

  await it("9.1: getFullBackupState sanitizes credentials, PINs, and masks recipient mobile", async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    await repo.saveTransferRecord("1", {
      orderId: "TRX_SECURE",
      recipientMobile: "01711223344",
      pin: "1234",
      rawPin: "1234",
      pinHash: "hash_value",
      sessionToken: "secret_token",
      amountPaisa: 50000,
    });

    const backup = await repo.getFullBackupState();
    assert(Array.isArray(backup.transferHistory));
    assert.strictEqual(backup.transferHistory.length, 1);

    const sanitized = backup.transferHistory[0];
    assert.strictEqual(sanitized.pin, undefined);
    assert.strictEqual(sanitized.rawPin, undefined);
    assert.strictEqual(sanitized.pinHash, undefined);
    assert.strictEqual(sanitized.sessionToken, undefined);
    assert.strictEqual(sanitized.recipientMobile, "017****3344");
  });

  await it("9.2: commitRestorePayload preserves transferHistory across full restore", async () => {
    const adapter = new MemoryStorageAdapter(createDefaultState());
    const repo = new StorageRepository({ adapter });
    await repo.loadInitialData();

    await repo.saveTransferRecord("1", { orderId: "TRX_RESTORE_TEST", amountPaisa: 99000 });
    const backupPayload = await repo.createStorageBackup();

    const newAdapter = new MemoryStorageAdapter(createDefaultState());
    const newRepo = new StorageRepository({ adapter: newAdapter });
    await newRepo.loadInitialData();

    await newRepo.commitRestorePayload(backupPayload);
    const restoredHistory = newRepo.getTransferHistory("1");
    assert.strictEqual(restoredHistory.totalCount, 1);
    assert.strictEqual(restoredHistory.items[0].orderId, "TRX_RESTORE_TEST");
  });

  // ============================================================================
  // GROUP 10: Performance & Latency Benchmark
  // ============================================================================
  console.log("\n[GROUP 10: Performance & Latency Benchmark]");

  await it("10.1: 1,000 transfer fee calculations, limit validations & aday selections execute in < 100ms", () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      calculateTransferFee("BANK", 100000 + i, true);
      validateTransferLimits("BANK", 100000 + i, true, 500000, 2);
      selectCustomerForAday(mockCustomers, 100);
    }
    const duration = Date.now() - start;
    console.log(`    -> 1,000 operations completed in ${duration}ms (${(duration / 1000).toFixed(4)}ms/op)`);
    assert(duration < 100, `Benchmark exceeded: took ${duration}ms`);
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n================================================================================");
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests} (${totalTests === passedTests ? "100% SUCCESS" : "FAILURES DETECTED"})`);
  console.log("================================================================================");

  if (totalTests !== passedTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Unhandled error in test suite:", err);
  process.exit(1);
});
