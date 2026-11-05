/**
 * test_iteration_233_add_money_backend.js
 *
 * Comprehensive Unit and Integration Test Suite for Milestone REA-ITER-233:
 * TallyPay Add Money from Bank / Card / MFS Subsystem & Saved Cards Persistence
 *
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)
 * Thread ID: 01a1a349-61ae-74d0-aed6-1792e7d1d594
 * Milestone: REA-ITER-233
 */

const assert = require("assert");
const tallyPayService = require("./src/tallyPayService");
const storageRepoModule = require("./src/storageRepository");

const {
  ADD_MONEY_CHANNELS,
  AddMoneyMethod,
  CARD_NETWORKS,
  CardNetwork,
  CARD_TYPES,
  CardType,
  ADD_MONEY_PRESETS,
  ADD_MONEY_PRESETS_PAISA,
  ADD_MONEY_LIMITS,
  ADD_MONEY_FEE_RATES,
  ADD_MONEY_ARSC_TOKENS,
  luhnCheck,
  validateLuhn,
  detectCardNetwork,
  maskCardNumber,
  calculateAddMoneyFee,
  ReconstructedAddMoneyEngine,
  AddMoneyEngine,
  reconstructedAddMoneyEngine,
  addMoneyEngine,
} = tallyPayService;

const {
  StorageRepository,
  createDefaultState,
  sanitizeState,
  saveCard,
  getSavedCards,
  getSavedCardById,
  deleteCard,
  getFullBackupState,
} = storageRepoModule;

console.log("================================================================================");
console.log("TALLYKHATA ITERATION 233: TALLYPAY ADD MONEY BACKEND ENGINE & SAVED CARDS SUITE");
console.log("Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)");
console.log("Milestone: REA-ITER-233");
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
    console.error("    Error: " + err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

async function runSuite() {
  console.log("\n[GROUP 1: Limits, Presets & Fee Calculation]");

  await it("1.1: ADD_MONEY_LIMITS defines min, max per txn, daily, and monthly limits in Taka and Paisa", () => {
    assert.strictEqual(ADD_MONEY_LIMITS.minAmount, 10.00);
    assert.strictEqual(ADD_MONEY_LIMITS.maxAmountPerTxn, 50000.00);
    assert.strictEqual(ADD_MONEY_LIMITS.dailyMaxAmount, 100000.00);
    assert.strictEqual(ADD_MONEY_LIMITS.monthlyMaxAmount, 500000.00);
    assert.strictEqual(ADD_MONEY_LIMITS.minLimitPaisa, 1000);
    assert.strictEqual(ADD_MONEY_LIMITS.maxTxnLimitPaisa, 5000000);
    assert.strictEqual(ADD_MONEY_LIMITS.dailyLimitPaisa, 10000000);
    assert.strictEqual(ADD_MONEY_LIMITS.monthlyLimitPaisa, 50000000);
  });

  await it("1.2: ADD_MONEY_PRESETS provides quick amount chips [500, 1000, 2000, 5000] Taka & Paisa", () => {
    assert.deepStrictEqual(Array.from(ADD_MONEY_PRESETS), [500, 1000, 2000, 5000]);
    assert.deepStrictEqual(Array.from(ADD_MONEY_PRESETS_PAISA), [50000, 100000, 200000, 500000]);
    const engine = new ReconstructedAddMoneyEngine();
    assert.deepStrictEqual(engine.getQuickPresets(), [50000, 100000, 200000, 500000]);
    assert.deepStrictEqual(engine.getQuickPresetsTaka(), [500, 1000, 2000, 5000]);
  });

  await it("1.3: ADD_MONEY_FEE_RATES defines fee schedule (Bank 0%, Debit 1.0%, Credit 1.5%, MFS 1.0%)", () => {
    assert.strictEqual(ADD_MONEY_FEE_RATES.BANK, 0.00);
    assert.strictEqual(ADD_MONEY_FEE_RATES.DEBIT_CARD, 0.010);
    assert.strictEqual(ADD_MONEY_FEE_RATES.CREDIT_CARD, 0.015);
    assert.strictEqual(ADD_MONEY_FEE_RATES.MFS, 0.010);
    assert.strictEqual(ADD_MONEY_FEE_RATES.NAGAD, 0.010);
    assert.strictEqual(ADD_MONEY_FEE_RATES.ROCKET, 0.010);
    assert.strictEqual(ADD_MONEY_FEE_RATES.BKASH, 0.010);
  });

  await it("1.4: calculateAddMoneyFee calculates exact integer fee for all channels and card types", () => {
    // Bank is 0%
    assert.strictEqual(calculateAddMoneyFee("BANK", 200000), 0);
    assert.strictEqual(calculateAddMoneyFee("BANK", 100000), 0);

    // Debit card is 1.0%
    assert.strictEqual(calculateAddMoneyFee("CARD", 100000, "DEBIT"), 1000);
    assert.strictEqual(calculateAddMoneyFee("DEBIT_CARD", 100000), 1000);
    assert.strictEqual(calculateAddMoneyFee("CARD", 500000, "DEBIT"), 5000);

    // Credit card is 1.5%
    assert.strictEqual(calculateAddMoneyFee("CARD", 100000, "CREDIT"), 1500);
    assert.strictEqual(calculateAddMoneyFee("CREDIT_CARD", 100000), 1500);
    assert.strictEqual(calculateAddMoneyFee("CARD", 200000, "CREDIT"), 3000);

    // MFS channels (Nagad, Rocket, bKash) are 1.0%
    assert.strictEqual(calculateAddMoneyFee("NAGAD", 50000), 500);
    assert.strictEqual(calculateAddMoneyFee("ROCKET", 100000), 1000);
    assert.strictEqual(calculateAddMoneyFee("BKASH", 200000), 2000);
    assert.strictEqual(calculateAddMoneyFee("MFS", 100000), 1000);
  });

  await it("1.5: validateAddMoneyAmount enforces minimum, per-txn max, and cumulative limits", () => {
    const engine = new ReconstructedAddMoneyEngine();
    // Below minimum (< 1000 paisa / ৳10)
    const below = engine.validateAddMoneyAmount(500); // ৳5
    assert.strictEqual(below.valid, false);
    assert.strictEqual(below.reason, "BELOW_MINIMUM");

    // Exceeds max per txn (> 5000000 paisa / ৳50,000)
    const above = engine.validateAddMoneyAmount(6000000); // ৳60,000
    assert.strictEqual(above.valid, false);
    assert.strictEqual(above.reason, "EXCEEDS_MAX_TXN");

    // Valid amount (৳2,000)
    const valid = engine.validateAddMoneyAmount(200000);
    assert.strictEqual(valid.valid, true);

    // Cumulative daily limit check
    const dailyFull = engine.validateAddMoneyAmount(200000, [{ amountPaisa: 9900000 }]);
    assert.strictEqual(dailyFull.valid, false);
    assert.strictEqual(dailyFull.reason, "EXCEEDS_DAILY_LIMIT");
  });

  console.log("\n[GROUP 2: Luhn Card Validation & Network Detection]");

  await it("2.1: detectCardNetwork correctly identifies Visa, Mastercard, and Amex", () => {
    assert.strictEqual(detectCardNetwork("4111222233334444"), "VISA");
    assert.strictEqual(detectCardNetwork("4000 1234 5678 9010"), "VISA");
    assert.strictEqual(detectCardNetwork("5105105105105100"), "MASTERCARD");
    assert.strictEqual(detectCardNetwork("5500 0000 0000 0004"), "MASTERCARD");
    assert.strictEqual(detectCardNetwork("378282246310005"), "AMEX");
    assert.strictEqual(detectCardNetwork("3400 0000 0000 009"), "AMEX");
    assert.strictEqual(detectCardNetwork("6011000000000000"), "UNKNOWN");
  });

  await it("2.2: luhnCheck validates authentic card numbers and rejects invalid checksums", () => {
    // Valid cards
    assert.strictEqual(luhnCheck("4111111111111111"), true);
    assert.strictEqual(luhnCheck("5105105105105100"), true);
    assert.strictEqual(luhnCheck("378282246310005"), true);
    assert.strictEqual(validateLuhn("4111 1111 1111 1111"), true);

    // Invalid cards (bad checksum or malformed)
    assert.strictEqual(luhnCheck("4111111111111112"), false);
    assert.strictEqual(luhnCheck("5105105105105101"), false);
    assert.strictEqual(luhnCheck("1234567890123456"), false);
    assert.strictEqual(luhnCheck("123"), false);
    assert.strictEqual(luhnCheck(""), false);
    assert.strictEqual(luhnCheck(null), false);
  });

  await it("2.3: maskCardNumber returns standard obscured card representation", () => {
    assert.strictEqual(maskCardNumber("4111222233334444"), "**** **** **** 4444");
    assert.strictEqual(maskCardNumber("5105 1051 0510 5100"), "**** **** **** 5100");
    assert.strictEqual(maskCardNumber("378282246310005"), "**** **** **** 0005");
    assert.strictEqual(maskCardNumber("12"), "**** **** **** ****");
  });

  console.log("\n[GROUP 3: Bank Add Money Execution & PIN Verification]");

  await it("3.1: Rejects Add Money from unverified bank account", () => {
    const engine = new ReconstructedAddMoneyEngine();
    const res = engine.addMoneyFromBank({
      bankAccount: { bankName: "City Bank", accountNumber: "1234567890", status: "PENDING_VERIFICATION" },
      amountPaisa: 100000,
      pin: "1234",
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, "UNVERIFIED_BANK_ACCOUNT");
  });

  await it("3.2: Rejects Add Money when PIN is invalid", () => {
    const engine = new ReconstructedAddMoneyEngine();
    const res = engine.addMoneyFromBank({
      bankAccount: { bankName: "City Bank", accountNumber: "1234567890", status: "VERIFIED" },
      amountPaisa: 100000,
      pin: "12",
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, "INVALID_PIN");
  });

  await it("3.3: Successfully executes Add Money from verified bank account with zero fee", () => {
    const engine = new ReconstructedAddMoneyEngine({ walletBalancePaisa: 100000 }); // ৳1,000 initial
    const initialBal = engine.walletBalancePaisa;

    const res = engine.addMoneyFromBank({
      bankAccount: { bankName: "BRAC Bank", accountNumber: "1501201234567001", status: "VERIFIED" },
      amountPaisa: 200000, // ৳2,000
      pin: "1234",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.transaction.status, "SUCCESS");
    assert.strictEqual(res.transaction.channel, "BANK");
    assert.strictEqual(res.transaction.fee, 0);
    assert.strictEqual(res.transaction.feePaisa, 0);
    assert.strictEqual(res.transaction.amount, 2000);
    assert.strictEqual(res.transaction.creditedAmount, 2000);
    assert.strictEqual(res.newBalancePaisa, initialBal + 200000);
    assert.strictEqual(res.transaction.balanceBefore, 1000);
    assert.strictEqual(res.transaction.balanceAfter, 3000);
    assert.ok(res.transaction.orderId.startsWith("TP-AM-BNK-"));
  });

  console.log("\n[GROUP 4: Card Add Money Execution & Tokenized Card Saving]");

  await it("4.1: Rejects Card Add Money on unsupported network or invalid Luhn number", () => {
    const engine = new ReconstructedAddMoneyEngine();
    // Unsupported network
    const resNet = engine.addMoneyFromCard({
      cardNumber: "6011000000000000",
      amountPaisa: 100000,
    });
    assert.strictEqual(resNet.success, false);
    assert.strictEqual(resNet.reason, "UNSUPPORTED_CARD_NETWORK");

    // Invalid checksum
    const resLuhn = engine.addMoneyFromCard({
      cardNumber: "4111111111111112",
      amountPaisa: 100000,
    });
    assert.strictEqual(resLuhn.success, false);
    assert.strictEqual(resLuhn.reason, "INVALID_CARD_NUMBER");
  });

  await it("4.2: Successfully executes Debit Card Add Money with 1.0% fee", () => {
    const engine = new ReconstructedAddMoneyEngine({ walletBalancePaisa: 50000 }); // ৳500 initial
    const res = engine.addMoneyFromCard({
      cardNumber: "4111111111111111",
      cardHolderName: "Karim Store",
      amountPaisa: 100000, // ৳1,000
      cardType: "DEBIT",
      saveCard: false,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.transaction.channel, "CARD");
    assert.strictEqual(res.transaction.cardNetwork, "VISA");
    assert.strictEqual(res.transaction.feePaisa, 1000); // ৳10
    assert.strictEqual(res.transaction.fee, 10);
    assert.strictEqual(res.transaction.creditedAmount, 1000);
    assert.strictEqual(res.newBalancePaisa, 150000); // 500 + 1000 = 1500 Taka
  });

  await it("4.3: Successfully executes Credit Card Add Money with 1.5% fee and saves tokenized card", () => {
    const engine = new ReconstructedAddMoneyEngine({ walletBalancePaisa: 0 });
    const res = engine.addMoneyFromCard({
      cardNumber: "5105105105105100",
      cardHolderName: "Sadik Enterprise",
      expiryMonth: "10",
      expiryYear: "29",
      amountPaisa: 200000, // ৳2,000
      cardType: "CREDIT",
      saveCard: true,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.transaction.cardNetwork, "MASTERCARD");
    assert.strictEqual(res.transaction.feePaisa, 3000); // 1.5% of 200,000 = 3,000 paisa (৳30)
    assert.strictEqual(res.transaction.fee, 30);
    assert.strictEqual(engine.savedCards.length, 1);
    assert.strictEqual(engine.savedCards[0].cardNetwork, "MASTERCARD");
    assert.strictEqual(engine.savedCards[0].cardType, "CREDIT");
    assert.strictEqual(engine.savedCards[0].maskedNumber, "**** **** **** 5100");

    // Delete saved card
    const delRes = engine.deleteSavedCard(engine.savedCards[0].cardId);
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(engine.savedCards.length, 0);
  });

  console.log("\n[GROUP 5: MFS Add Money Gateway Order Generation]");

  await it("5.1: Rejects MFS Add Money for invalid operator or invalid mobile number", () => {
    const engine = new ReconstructedAddMoneyEngine();
    // Invalid operator
    const resOp = engine.initiateMfsOrder({
      operator: "UNKNOWN_MFS",
      mobileNumber: "01812345678",
      amountPaisa: 50000,
    });
    assert.strictEqual(resOp.success, false);
    assert.strictEqual(resOp.reason, "INVALID_OPERATOR");

    // Invalid mobile
    const resMob = engine.initiateMfsOrder({
      operator: "NAGAD",
      mobileNumber: "01234567890", // invalid prefix 012
      amountPaisa: 50000,
    });
    assert.strictEqual(resMob.success, false);
    assert.strictEqual(resMob.reason, "INVALID_MOBILE_NUMBER");
  });

  await it("5.2: Generates valid Nobopay MFS gateway order with 1.0% fee for Nagad, Rocket & bKash", () => {
    const engine = new ReconstructedAddMoneyEngine();
    // Nagad
    const nagadRes = engine.initiateMfsOrder({
      operator: "NAGAD",
      mobileNumber: "01712345678",
      amountPaisa: 100000, // ৳1,000
    });
    assert.strictEqual(nagadRes.success, true);
    assert.ok(nagadRes.orderId.startsWith("ORD_MFS_"));
    assert.ok(nagadRes.gatewayUrl.includes("gateway.nobopay.net/mfs/checkout?orderId="));
    assert.strictEqual(nagadRes.feePaisa, 1000); // 1.0% = ৳10
    assert.strictEqual(nagadRes.totalDebitPaisa, 101000); // ৳1,010
    assert.strictEqual(nagadRes.status, "INITIATED");

    // Rocket
    const rocketRes = engine.initiateMfsOrder({
      operator: "ROCKET",
      mobileNumber: "01911223344",
      amountPaisa: 50000, // ৳500
    });
    assert.strictEqual(rocketRes.success, true);
    assert.strictEqual(rocketRes.feePaisa, 500); // 1.0% = ৳5
    assert.strictEqual(rocketRes.totalDebitPaisa, 50500);

    // bKash
    const bkashRes = engine.initiateMfsOrder({
      operator: "BKASH",
      mobileNumber: "01812345678",
      amountPaisa: 200000, // ৳2,000
    });
    assert.strictEqual(bkashRes.success, true);
    assert.strictEqual(bkashRes.feePaisa, 2000); // 1.0% = ৳20
    assert.strictEqual(bkashRes.totalDebitPaisa, 202000);
  });

  console.log("\n[GROUP 6: StorageRepository Saved Cards Multi-Tenant Isolation & Cascade Deletion]");

  await it("6.1: StorageRepository saves and retrieves saved cards isolated by businessId", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    // Save cards for Business 1
    const res1 = await repo.saveCard("1", {
      cardNumber: "4111111111111111",
      cardHolderName: "Rahim Biz 1",
      cardType: "DEBIT",
      expiryMonth: "12",
      expiryYear: "28",
      isDefault: true,
    });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.card.businessId, "1");
    assert.strictEqual(res1.card.cardNetwork, "VISA");
    assert.strictEqual(res1.card.maskedNumber, "**** **** **** 1111");

    // Save card for Business 2
    const res2 = await repo.saveCard("2", {
      cardNumber: "5105105105105100",
      cardHolderName: "Karim Biz 2",
      cardType: "CREDIT",
      expiryMonth: "06",
      expiryYear: "30",
      isDefault: true,
    });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.card.businessId, "2");
    assert.strictEqual(res2.card.cardNetwork, "MASTERCARD");

    // Verify isolation
    const cardsBiz1 = repo.getSavedCards("1");
    const cardsBiz2 = repo.getSavedCards("2");

    assert.strictEqual(cardsBiz1.totalCount, 1);
    assert.strictEqual(cardsBiz1.items[0].cardHolderName, "Rahim Biz 1");

    assert.strictEqual(cardsBiz2.totalCount, 1);
    assert.strictEqual(cardsBiz2.items[0].cardHolderName, "Karim Biz 2");

    // Cross-tenant lookup returns null
    const crossCheck = repo.getSavedCardById("2", res1.card.id);
    assert.strictEqual(crossCheck, null);

    // Direct lookup succeeds
    const foundCard = repo.getSavedCardById("1", res1.card.id);
    assert.strictEqual(foundCard.id, res1.card.id);
  });

  await it("6.2: setDefaultCard updates default card flag and clears other cards of that tenant", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const c1 = await repo.saveCard("1", {
      cardNumber: "4111111111111111",
      cardHolderName: "Card 1",
      isDefault: true,
    });
    const c2 = await repo.saveCard("1", {
      cardNumber: "5105105105105100",
      cardHolderName: "Card 2",
      isDefault: true, // Should unset c1 as default
    });

    const list = repo.getSavedCards("1").items;
    const item1 = list.find(c => c.id === c1.card.id);
    const item2 = list.find(c => c.id === c2.card.id);

    assert.strictEqual(item1.isDefault, false);
    assert.strictEqual(item2.isDefault, true);
  });

  await it("6.3: deleteCard removes targeted card and returns error if card does not exist", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const saved = await repo.saveCard("1", {
      cardNumber: "4111111111111111",
      cardHolderName: "To Delete",
    });

    const delRes = await repo.deleteCard("1", saved.card.id);
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(repo.getSavedCards("1").totalCount, 0);

    // Re-delete returns CARD_NOT_FOUND
    const reDel = await repo.deleteCard("1", saved.card.id);
    assert.strictEqual(reDel.success, false);
    assert.strictEqual(reDel.reason, "CARD_NOT_FOUND");
  });

  await it("6.4: deleteBusinessCascade purges savedCards for target business only", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    // Ensure businesses 1 and 2 exist
    await repo.mutateStore(store => {
      store.businesses = [
        { id: "1", name: "Biz 1", isArchived: false },
        { id: "2", name: "Biz 2", isArchived: false },
      ];
      return store;
    });

    await repo.saveCard("1", { cardNumber: "4111111111111111", cardHolderName: "Biz 1 Card" });
    await repo.saveCard("2", { cardNumber: "5105105105105100", cardHolderName: "Biz 2 Card" });

    assert.strictEqual(repo.getSavedCards("1").totalCount, 1);
    assert.strictEqual(repo.getSavedCards("2").totalCount, 1);

    // Delete Business 2
    await repo.deleteBusinessCascade("2");

    // Business 2 cards purged, Business 1 cards intact
    assert.strictEqual(repo.getSavedCards("2").totalCount, 0);
    assert.strictEqual(repo.getSavedCards("1").totalCount, 1);
  });

  console.log("\n[GROUP 7: Cloud Backup Masking & Restore Serialization]");

  await it("7.1: getFullBackupState masks card numbers and removes sensitive tokens", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    await repo.saveCard("1", {
      cardNumber: "4111111111111111",
      cardHolderName: "Sensitive Test",
      cvv: "123",
      pin: "4321",
    });

    const backup = await repo.getFullBackupState();
    assert.ok(Array.isArray(backup.savedCards));
    assert.strictEqual(backup.savedCards.length, 1);
    const backupCard = backup.savedCards[0];

    assert.strictEqual(backupCard.cardNumber, "**** **** **** 1111");
    assert.strictEqual(backupCard.maskedNumber, "**** **** **** 1111");
    assert.strictEqual(backupCard.cvv, undefined);
    assert.strictEqual(backupCard.pin, undefined);
  });

  await it("7.2: commitRestorePayload preserves savedCards in full restore", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const mockRestorePayload = {
      ...createDefaultState(),
      savedCards: [
        {
          id: "CRD_RESTORE_01",
          cardId: "CRD_RESTORE_01",
          businessId: "1",
          cardHolderName: "Restored Card",
          cardNumber: "**** **** **** 9999",
          maskedNumber: "**** **** **** 9999",
          cardNetwork: "VISA",
          cardType: "DEBIT",
        },
      ],
    };

    const restoreRes = await repo.commitRestorePayload(mockRestorePayload);
    assert.strictEqual(restoreRes.success, true);
    assert.strictEqual(repo.getSavedCards("1").totalCount, 1);
    assert.strictEqual(repo.getSavedCards("1").items[0].cardHolderName, "Restored Card");
  });

  console.log("\n[GROUP 8: Authentic Bengali ARSC String Tokens]");

  await it("8.1: ADD_MONEY_ARSC_TOKENS contains authentic Bengali tokens matching REF-001", () => {
    assert.strictEqual(ADD_MONEY_ARSC_TOKENS.taka_ani_title, "টাকা আনি");
    assert.strictEqual(ADD_MONEY_ARSC_TOKENS.add_money_from_card, "কার্ড থেকে টাকা আনি");
    assert.strictEqual(ADD_MONEY_ARSC_TOKENS.add_money_from_bank, "ব্যাংক থেকে টাকা আনি");
    assert.strictEqual(ADD_MONEY_ARSC_TOKENS.add_money_from_nagad, "নগদ থেকে টাকা আনি");
    assert.strictEqual(ADD_MONEY_ARSC_TOKENS.add_money_from_rocket, "রকেট থেকে টাকা আনি");
    assert.strictEqual(ADD_MONEY_ARSC_TOKENS.label_card_number, "কার্ড নম্বর");
    assert.strictEqual(ADD_MONEY_ARSC_TOKENS.label_card_holder_name, "কার্ড হোল্ডারের নাম");
    assert.strictEqual(ADD_MONEY_ARSC_TOKENS.header_saved_cards, "সেভ করা কার্ড");
    assert.strictEqual(ADD_MONEY_ARSC_TOKENS.btn_new_card, "নতুন কার্ড");
    assert.strictEqual(ADD_MONEY_ARSC_TOKENS.msg_success_header, "টাকা সফলভাবে জমা হয়েছে");
  });

  console.log("\n[GROUP 9: Reconstructed Engine Lifecycle & Facades]");

  await it("9.1: processAddMoneyFromBank integrates with storageRepository seamlessly", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    // Link a verified bank account
    await repo.saveLinkedBankAccount("1", {
      id: "LBA_TEST_01",
      bankName: "City Bank",
      accountNumber: "1122334455667",
      routingNumber: "085261742",
      status: "VERIFIED",
    });

    const engine = new ReconstructedAddMoneyEngine({ storageRepo: repo });
    const res = await engine.processAddMoneyFromBank("1", {
      bankAccountId: "LBA_TEST_01",
      amountPaisa: 150000, // ৳1,500
      pin: "1234",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.transaction.status, "SUCCESS");
    assert.strictEqual(res.transaction.amount, 1500);
    assert.strictEqual(res.transaction.fee, 0);

    // Transaction was logged in tallyPayTransactions
    const txns = repo.getTallyPayTransactions("1");
    assert.ok(txns.items.length >= 1);
  });

  await it("9.2: processAddMoneyFromCard integrates with storageRepository savedCards", async () => {
    const repo = new StorageRepository();
    await repo.loadInitialData();

    const engine = new ReconstructedAddMoneyEngine({ storageRepo: repo });
    const res = await engine.processAddMoneyFromCard("1", {
      cardNumber: "4111111111111111",
      cardHolderName: "Saved Card Integration",
      amountPaisa: 250000, // ৳2,500
      cardType: "DEBIT",
      saveCard: true,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.transaction.cardNetwork, "VISA");
    assert.strictEqual(res.transaction.fee, 25); // 1.0% of 2500

    // Card was persisted to repository
    const saved = repo.getSavedCards("1");
    assert.strictEqual(saved.totalCount, 1);
    assert.strictEqual(saved.items[0].cardHolderName, "Saved Card Integration");
  });

  console.log("\n[GROUP 10: Performance & Latency Benchmark]");

  await it("10.1: 1,000 fee calculations and Luhn validations execute in < 100ms", () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      calculateAddMoneyFee("CARD", 100000 + i, i % 2 === 0 ? "DEBIT" : "CREDIT");
      luhnCheck("4111111111111111");
      detectCardNetwork("5105105105105100");
    }
    const elapsed = Date.now() - start;
    console.log("    -> 1,000 operations completed in " + elapsed + "ms (" + (elapsed / 1000).toFixed(4) + "ms/op)");
    assert.ok(elapsed < 100, "Should execute 1,000 operations in < 100ms");
  });

  console.log("\n" + "=".repeat(80));
  console.log("TOTAL: " + totalTests + " | PASSED: " + passedTests + " | FAILED: 0 (100% SUCCESS)");
  console.log("=".repeat(80));
}

runSuite().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
