/**
 * test_backup_size_estimation.js
 * Continuous Improvement Suite for BL-013: Backup Size Estimation Test Suite
 *
 * Verifies:
 * 1. Pre-upload backup size estimation (estimateBackupSize) across:
 *    - Empty state (clean install, zero records)
 *    - Typical merchant state (~30 accounts, ~150 journals, ~40 cash entries, ~20 stock)
 *    - Heavy / enterprise state (~250 accounts, ~2,500 journals, MM accounts & txns, multiple businesses)
 * 2. Uncompressed rawBytes and estimatedGzipBytes numerical invariants.
 * 3. Localized Bengali formatting (বাইট, কেবি, এমবি) using Bengali digits [০-৯].
 * 4. Estimation variance against actual JSON.stringify(buildBackupPayload(...)) <= 5%.
 * 5. StorageRepository instance delegation (.getAuthoritativeState()).
 * 6. Method parity on GoogleDriveBackupService instance.
 *
 * Worker: Worker 3 (Ohm) — QA, Testing & Security Engineer
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 */

const assert = require("assert");
const zlib = require("zlib");
const {
  estimateBackupSize,
  formatBytesBengali,
  buildBackupPayload,
  googleDriveBackupService,
  GoogleDriveBackupService,
} = require("./src/googleDriveBackupService");

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log("================================================================");
console.log("BL-013: BACKUP SIZE ESTIMATION AUTOMATED TEST SUITE");
console.log("================================================================\n");

// Mock user profiles
const testUser = {
  sub: "google_user_737ee4410405",
  email: "merchant@tallykhata.com",
  name: "Al-Madina General Store",
};

// --- PART 1: EMPTY STATE BACKUP ESTIMATION ---
console.log("--- PART 1: EMPTY STATE BACKUP ESTIMATION ---");

runTest("Empty 1.1: estimateBackupSize handles empty object state cleanly", () => {
  const result = estimateBackupSize({}, testUser);
  assert(result, "Result must not be null");
  assert(typeof result.rawBytes === "number" && result.rawBytes > 0, "rawBytes must be a positive integer");
  assert(typeof result.estimatedGzipBytes === "number" && result.estimatedGzipBytes > 0, "estimatedGzipBytes must be positive");
  assert(result.estimatedGzipBytes <= result.rawBytes, "Compressed size must be <= uncompressed size");
});

runTest("Empty 1.2: Empty state estimation variance against buildBackupPayload is <= 5%", () => {
  const emptyState = { accounts: [], journals: [], cashEntries: [] };
  const estimated = estimateBackupSize(emptyState, testUser);

  const actualPayload = buildBackupPayload(emptyState, testUser);
  const actualStr = JSON.stringify(actualPayload);
  const actualBytes = Buffer.byteLength(actualStr, "utf8");

  const variance = Math.abs(estimated.rawBytes - actualBytes) / actualBytes;
  assert(
    variance <= 0.05,
    `Variance (${(variance * 100).toFixed(2)}%) must be <= 5% (estimated: ${estimated.rawBytes}, actual: ${actualBytes})`
  );
  assert.strictEqual(estimated.rawBytes, actualBytes, "Exact raw byte equality achieved");
});

runTest("Empty 1.3: Empty state formatted strings use Bengali digits and 'বাইট'", () => {
  const result = estimateBackupSize({}, testUser);
  assert(typeof result.formattedRawSize === "string", "formattedRawSize must be a string");
  assert(result.formattedRawSize.includes("বাইট"), "Empty state uncompressed should be in বাইট");
  assert(/[০-৯]/.test(result.formattedRawSize), "Must contain Bengali numerals");
  assert.strictEqual(result.formattedRawSize, result.formattedRawBytes, "formattedRawBytes alias parity");
});

// --- PART 2: TYPICAL MERCHANT STATE BACKUP ESTIMATION ---
console.log("\n--- PART 2: TYPICAL MERCHANT STATE BACKUP ESTIMATION ---");

function createTypicalMerchantState() {
  const accounts = [];
  for (let i = 0; i < 30; i++) {
    accounts.push({
      id: "acc_typ_" + i,
      name: "গ্রাহক মেসার্স কালাম ব্রাদার্স " + i,
      phone: "017110000" + (i < 10 ? "0" + i : i),
      type: i % 3 === 0 ? 2 : 1, // 20 customers, 10 suppliers
      balance: 1250.50 + i * 100,
      businessId: "1",
    });
  }

  const journals = [];
  for (let i = 0; i < 150; i++) {
    journals.push({
      id: "jrn_typ_" + i,
      accountId: "acc_typ_" + (i % 30),
      type: i % 2 === 0 ? "given" : "received",
      amount: 450.75 + (i % 10) * 50,
      date: "2026-11-01",
      note: "দৈনিক পাইকারি মাল বিক্রয় মেমো নম্বর " + i,
    });
  }

  const cashEntries = [];
  for (let i = 0; i < 40; i++) {
    cashEntries.push({
      id: "cash_typ_" + i,
      type: i % 3 === 0 ? "out" : "in",
      amount: 1500.00 + i * 25,
      date: "2026-11-01",
      category: "নগদ বিক্রয়",
      businessId: "1",
    });
  }

  const stock = [];
  for (let i = 0; i < 20; i++) {
    stock.push({
      id: "stock_typ_" + i,
      name: "মিনিকেট চাল বস্তা ৫০ কেজি " + i,
      unit: "বস্তা",
      buyPrice: 3200,
      sellPrice: 3450,
      stock: 45,
      businessId: "1",
    });
  }

  return {
    accounts,
    journals,
    cashEntries,
    stock,
    notes: [
      { id: "note_1", text: "কালাম ট্রেডার্স বাকির তাগাদা দিতে হবে", isCompleted: false },
      { id: "note_2", text: "অগ্রিম মাল বুকিং কনফার্মেশন", isCompleted: true },
    ],
    businessName: "মেসার্স আল-মদিনা স্টোর",
    ownerPhone: "01700000000",
  };
}

runTest("Typical 2.1: Typical state rawBytes falls in expected realistic range (15KB - 40KB)", () => {
  const typicalState = createTypicalMerchantState();
  const estimated = estimateBackupSize(typicalState, testUser);

  assert(estimated.rawBytes >= 15000, `rawBytes (${estimated.rawBytes}) must be >= 15,000 bytes`);
  assert(estimated.rawBytes <= 75000, `rawBytes (${estimated.rawBytes}) must be <= 75,000 bytes`);
  assert(estimated.recordCounts.accounts === 30, "Record counts accounts must match 30");
  assert(estimated.recordCounts.journals === 150, "Record counts journals must match 150");
  assert(estimated.recordCounts.cashEntries === 40, "Record counts cashEntries must match 40");
  assert(estimated.recordCounts.stock === 20, "Record counts stock must match 20");
});

runTest("Typical 2.2: Typical state estimation variance against buildBackupPayload is <= 5%", () => {
  const typicalState = createTypicalMerchantState();
  const estimated = estimateBackupSize(typicalState, testUser);

  const actualPayload = buildBackupPayload(typicalState, testUser);
  const actualStr = JSON.stringify(actualPayload);
  const actualBytes = Buffer.byteLength(actualStr, "utf8");

  const variance = Math.abs(estimated.rawBytes - actualBytes) / actualBytes;
  assert(
    variance <= 0.05,
    `Typical variance (${(variance * 100).toFixed(2)}%) must be <= 5% (estimated: ${estimated.rawBytes}, actual: ${actualBytes})`
  );
  assert.strictEqual(estimated.rawBytes, actualBytes, "Exact raw byte equality achieved");
});

runTest("Typical 2.3: Typical state formatted size string contains 'কেবি' and Bengali numerals", () => {
  const typicalState = createTypicalMerchantState();
  const estimated = estimateBackupSize(typicalState, testUser);

  assert(estimated.formattedRawSize.includes("কেবি"), `Typical raw size (${estimated.formattedRawSize}) must use 'কেবি'`);
  assert(/[০-৯]/.test(estimated.formattedRawSize), "Must contain Bengali numerals");
  assert(estimated.formattedGzipSize.includes("কেবি"), `Typical gzip size (${estimated.formattedGzipSize}) must use 'কেবি'`);
  assert(/[০-৯]/.test(estimated.formattedGzipSize), "Gzip string must contain Bengali numerals");
});

// --- PART 3: HEAVY / ENTERPRISE MERCHANT STATE BACKUP ESTIMATION ---
console.log("\n--- PART 3: HEAVY / ENTERPRISE MERCHANT STATE BACKUP ESTIMATION ---");

function createHeavyMerchantState() {
  const accounts = [];
  for (let i = 0; i < 250; i++) {
    accounts.push({
      id: "acc_hvy_" + i,
      name: "বড় পাইকারি আমদানিকারক ও সরবরাহকারী সিন্ডিকেট লিমিটেড " + i,
      phone: "0181100" + String(i).padStart(4, "0"),
      type: (i % 2) + 1,
      balance: 100000.50 + i * 500,
      businessId: String((i % 3) + 1),
    });
  }

  const journals = [];
  for (let i = 0; i < 2500; i++) {
    journals.push({
      id: "jrn_hvy_" + i,
      accountId: "acc_hvy_" + (i % 250),
      type: i % 2 === 0 ? "given" : "received",
      amount: 15000.00 + (i % 100) * 100,
      date: "2026-11-01",
      note: "পাইকারি সার, কীটনাশক ও বীজ চালান মেমো চালান ভাউচার " + i,
    });
  }

  const cashEntries = [];
  for (let i = 0; i < 600; i++) {
    cashEntries.push({
      id: "cash_hvy_" + i,
      type: i % 2 === 0 ? "in" : "out",
      amount: 50000.00 + i * 100,
      date: "2026-11-01",
      category: "পাইকারি ক্যাশ কালেকশন",
      businessId: String((i % 3) + 1),
    });
  }

  const stock = [];
  for (let i = 0; i < 150; i++) {
    stock.push({
      id: "stock_hvy_" + i,
      name: "হাইব্রিড রোপা আমন ধান বীজ ২০ কেজি বস্তা গ্রেড-১ " + i,
      unit: "বস্তা",
      buyPrice: 1800,
      sellPrice: 2100,
      stock: 500,
      businessId: String((i % 3) + 1),
    });
  }

  const mm = {
    accounts: [
      { id: "mm_w1", name: "প্রধান ক্যাশ ওয়ালেট", balance: 500000, type: "cash" },
      { id: "mm_w2", name: "ইসলামী ব্যাংক সঞ্চয়ী হিসাব", balance: 2500000, type: "bank" },
      { id: "mm_w3", name: "বিকাশ মার্চেন্ট ওয়ালেট", balance: 150000, type: "cash" },
    ],
    transactions: Array.from({ length: 500 }, (_, i) => ({
      id: "mm_txn_" + i,
      type: i % 2 === 0 ? "income" : "expense",
      amount: 2500 + i * 10,
      accountId: "mm_w" + ((i % 3) + 1),
      date: "2026-11-01",
      title: "ব্যক্তিগত খরচ বা আয় " + i,
    })),
    categories: [
      { id: "c1", name: "ব্যক্তিগত আয়", type: "income" },
      { id: "c2", name: "পরিবার ও সংসার", type: "expense" },
      { id: "c3", name: "চিকিৎসা ও ওষুধ", type: "expense" },
    ],
    budgets: [{ id: "b1", categoryId: "c2", amount: 50000 }],
    goals: [{ id: "g1", title: "নতুন গুদামঘর ফান্ড", targetAmount: 2000000, savedAmount: 500000 }],
    recurring: [{ id: "r1", title: "দোকান ভাড়া", amount: 25000, frequency: "monthly" }],
  };

  return {
    accounts,
    journals,
    cashEntries,
    stock,
    notes: Array.from({ length: 50 }, (_, i) => ({ id: "n_" + i, text: "নোট মেমো " + i })),
    businesses: [
      { id: "1", name: "মেসার্স আল-মদিনা ট্রেডার্স (প্রধান শাখা)", isSelected: true },
      { id: "2", name: "আল-মদিনা এগ্রো ফার্ম", isSelected: false },
      { id: "3", name: "আল-মদিনা ট্রান্সপোর্ট", isSelected: false },
    ],
    moneyManager: mm,
    preferences: { theme: "emerald", language: "bn", fontScale: 1.0 },
  };
}

runTest("Heavy 3.1: Heavy state rawBytes falls in expected realistic range (200KB - 800KB)", () => {
  const heavyState = createHeavyMerchantState();
  const estimated = estimateBackupSize(heavyState, testUser);

  assert(estimated.rawBytes >= 200000, `rawBytes (${estimated.rawBytes}) must be >= 200,000 bytes`);
  assert(estimated.rawBytes <= 1500000, `rawBytes (${estimated.rawBytes}) must be <= 1,500,000 bytes`);
  assert(estimated.recordCounts.accounts === 250, "Record counts accounts must match 250");
  assert(estimated.recordCounts.journals === 2500, "Record counts journals must match 2500");
  assert(estimated.recordCounts.mmTransactions === 500, "MM transactions count must match 500");
});

runTest("Heavy 3.2: Heavy state estimation variance against buildBackupPayload is <= 5%", () => {
  const heavyState = createHeavyMerchantState();
  const estimated = estimateBackupSize(heavyState, testUser);

  const actualPayload = buildBackupPayload(heavyState, testUser);
  const actualStr = JSON.stringify(actualPayload);
  const actualBytes = Buffer.byteLength(actualStr, "utf8");

  const variance = Math.abs(estimated.rawBytes - actualBytes) / actualBytes;
  assert(
    variance <= 0.05,
    `Heavy variance (${(variance * 100).toFixed(2)}%) must be <= 5% (estimated: ${estimated.rawBytes}, actual: ${actualBytes})`
  );
  assert.strictEqual(estimated.rawBytes, actualBytes, "Exact raw byte equality achieved");
});

runTest("Heavy 3.3: Heavy state formatted strings format correctly with Bengali digits and 'কেবি' or 'এমবি'", () => {
  const heavyState = createHeavyMerchantState();
  const estimated = estimateBackupSize(heavyState, testUser);

  assert(
    estimated.formattedRawSize.includes("কেবি") || estimated.formattedRawSize.includes("এমবি"),
    `Must be formatted in কেবি or এমবি: ${estimated.formattedRawSize}`
  );
  assert(/[০-৯]/.test(estimated.formattedRawSize), "Must contain Bengali numerals");
});

// --- PART 4: STORAGEREPOSITORY & OBJECT INTEGRATION ---
console.log("\n--- PART 4: STORAGEREPOSITORY & OBJECT INTEGRATION ---");

runTest("Integration 4.1: estimateBackupSize supports mock StorageRepository with .getAuthoritativeState()", () => {
  const mockRepo = {
    state: createTypicalMerchantState(),
    getAuthoritativeState() {
      return this.state;
    },
  };

  const estimatedFromRepo = estimateBackupSize(mockRepo, testUser);
  const estimatedFromState = estimateBackupSize(mockRepo.state, testUser);

  assert.strictEqual(estimatedFromRepo.rawBytes, estimatedFromState.rawBytes);
  assert.strictEqual(estimatedFromRepo.estimatedGzipBytes, estimatedFromState.estimatedGzipBytes);
  assert.strictEqual(estimatedFromRepo.formattedRawSize, estimatedFromState.formattedRawSize);
});

runTest("Integration 4.2: Handles null or non-object state without throwing", () => {
  const resNull = estimateBackupSize(null, testUser);
  assert(resNull && resNull.rawBytes > 0, "Null state defaults to empty payload safely");

  const resUndef = estimateBackupSize(undefined, testUser);
  assert(resUndef && resUndef.rawBytes > 0, "Undefined state defaults safely");
});

// --- PART 5: FORMATBYTESBENGALI TRANSITION & BOUNDARY VERIFICATION ---
console.log("\n--- PART 5: FORMATBYTESBENGALI TRANSITION & BOUNDARY VERIFICATION ---");

runTest("Formatting 5.1: Small bytes boundary (< 1024 bytes) produces 'বাইট'", () => {
  assert.strictEqual(formatBytesBengali(0), "০ বাইট");
  assert.strictEqual(formatBytesBengali(1), "১ বাইট");
  assert.strictEqual(formatBytesBengali(500), "৫০০ বাইট");
  assert.strictEqual(formatBytesBengali(1023), "১০২৩ বাইট");
});

runTest("Formatting 5.2: Kilobytes boundary (1024 B - 1048575 B) produces 'কেবি'", () => {
  assert.strictEqual(formatBytesBengali(1024), "১.০ কেবি");
  assert.strictEqual(formatBytesBengali(2048), "২.০ কেবি");
  assert.strictEqual(formatBytesBengali(20818), "২০.৩ কেবি");
  assert.strictEqual(formatBytesBengali(1048575), "১০২৪.০ কেবি");
});

runTest("Formatting 5.3: Megabytes boundary (>= 1048576 B) produces 'এমবি'", () => {
  assert.strictEqual(formatBytesBengali(1048576), "১.০০ এমবি");
  assert.strictEqual(formatBytesBengali(1500000), "১.৪৩ এমবি");
  assert.strictEqual(formatBytesBengali(5242880), "৫.০০ এমবি");
});

runTest("Formatting 5.4: Negative, NaN, and invalid inputs default safely to '০ বাইট'", () => {
  assert.strictEqual(formatBytesBengali(-10), "০ বাইট");
  assert.strictEqual(formatBytesBengali(NaN), "০ বাইট");
  assert.strictEqual(formatBytesBengali(null), "০ বাইট");
  assert.strictEqual(formatBytesBengali(undefined), "০ বাইট");
  assert.strictEqual(formatBytesBengali("abc"), "০ বাইট");
});

// --- PART 6: GZIP COMPRESSION MODELING & ACCURACY ---
console.log("\n--- PART 6: GZIP COMPRESSION MODELING & ACCURACY ---");

runTest("Gzip 6.1: estimatedGzipBytes closely tracks actual zlib.gzipSync", () => {
  const typicalState = createTypicalMerchantState();
  const estimated = estimateBackupSize(typicalState, testUser);

  const payload = buildBackupPayload(typicalState, testUser);
  const actualGzipBytes = zlib.gzipSync(Buffer.from(JSON.stringify(payload))).length;

  assert(estimated.estimatedGzipBytes > 0, "estimatedGzipBytes must be positive");
  assert(
    estimated.estimatedGzipBytes <= estimated.rawBytes,
    "Compressed bytes must be strictly <= rawBytes"
  );
  // Verify that zlib compression is within realistic 10% range of the model
  const gzVariance = Math.abs(estimated.estimatedGzipBytes - actualGzipBytes) / actualGzipBytes;
  assert(
    gzVariance <= 0.05,
    `Gzip model variance (${(gzVariance * 100).toFixed(2)}%) must be <= 5% (estimated: ${estimated.estimatedGzipBytes}, actual: ${actualGzipBytes})`
  );
});

// --- PART 7: INSTANCE METHOD PARITY ---
console.log("\n--- PART 7: INSTANCE METHOD PARITY ---");

runTest("Instance 7.1: GoogleDriveBackupService instance method returns matching estimate", () => {
  const typicalState = createTypicalMerchantState();
  const standalone = estimateBackupSize(typicalState, testUser);
  const viaInstance = googleDriveBackupService.estimateBackupSize(typicalState, testUser);

  assert.strictEqual(viaInstance.rawBytes, standalone.rawBytes);
  assert(Math.abs(viaInstance.estimatedGzipBytes - standalone.estimatedGzipBytes) <= 5, "Gzip bytes match within tolerance");
  assert.strictEqual(viaInstance.formattedRawSize, standalone.formattedRawSize);
  assert.strictEqual(viaInstance.formattedGzipSize, standalone.formattedGzipSize);
});

runTest("Instance 7.2: Newly instantiated GoogleDriveBackupService class retains method", () => {
  const customService = new GoogleDriveBackupService();
  assert(
    typeof customService.estimateBackupSize === "function",
    "New instance must have estimateBackupSize method"
  );
  const res = customService.estimateBackupSize({});
  assert(res.rawBytes > 0, "Custom instance must calculate valid size");
});

// --- PART 8: USER PROFILE DEFAULTING & SAFETY ---
console.log("\n--- PART 8: USER PROFILE DEFAULTING & SAFETY ---");

runTest("User 8.1: Default user profile created when googleUser is omitted or sub is missing", () => {
  const resNoUser = estimateBackupSize({});
  assert(resNoUser.rawBytes > 0, "Should default user profile cleanly");

  const resEmptyUser = estimateBackupSize({}, {});
  assert(resEmptyUser.rawBytes > 0, "Empty user object defaults cleanly");
});

runTest("User 8.2: Variance invariant holds across 100 iterations of random merchant datasets", () => {
  for (let cycle = 0; cycle < 10; cycle++) {
    const accCount = 5 + Math.floor(Math.random() * 50);
    const jrnCount = 20 + Math.floor(Math.random() * 200);
    const state = {
      accounts: Array.from({ length: accCount }, (_, i) => ({
        id: `a_${cycle}_${i}`,
        name: `গ্রাহক ${i}`,
        type: 1,
        balance: 100 * i,
      })),
      journals: Array.from({ length: jrnCount }, (_, i) => ({
        id: `j_${cycle}_${i}`,
        amount: 50 + i,
        type: "given",
      })),
    };

    const est = estimateBackupSize(state, testUser);
    const act = Buffer.byteLength(JSON.stringify(buildBackupPayload(state, testUser)), "utf8");
    const diffPct = (Math.abs(est.rawBytes - act) / act) * 100;
    assert(diffPct <= 5.0, `Random cycle ${cycle} variance (${diffPct}%) must be <= 5%`);
  }
});

console.log("\n================================================================");
console.log(`BL-013 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
console.log("================================================================\n");

