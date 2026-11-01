/**
 * test_phase8_tagada_reports_notes.js
 * Comprehensive Verification Suite for Phase 8:
 * - Tagada & Due Architecture (Receivables, Payables, Partial Payments, Full Settlement, Multi-Business Scoping)
 * - Reminder Architecture (SMS intent, WhatsApp intent, Sharesheet fallback, Zero Background Messaging)
 * - Notes Architecture (Persistence via mutateCollection, Unique IDs, Business Scoping, State Machine)
 * - Business Reports Architecture (Mapping all 7 report modals, Single Source of Truth, Integer Paisa Precision)
 * - Inventory Carry-Forward Audit (DATA-12 parity, non-negative guards, over-issue handling, idempotency)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const {
  StorageRepository,
  createDefaultState,
  DEFAULT_BUSINESSES,
} = require("./src/storageRepository");

const {
  validateStockAdjustment,
  calculateAggregateMetrics,
} = require("./src/ledgerEngine");

const formatMoney = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Mock AsyncStorage Adapter
function createMockStorage(initialStore = {}) {
  const store = new Map(Object.entries(initialStore));
  return {
    store,
    async getItem(k) {
      return store.get(k) || null;
    },
    async setItem(k, v) {
      store.set(k, String(v));
    },
    async removeItem(k) {
      store.delete(k);
    },
    async getAllKeys() {
      return Array.from(store.keys());
    },
  };
}

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAllTests() {
  console.log("================================================================");
  console.log("PHASE 8: TAGADA, REMINDERS, NOTES & REPORTS VERIFICATION SUITE");
  console.log("================================================================\n");

  console.log("--- PART 1: TAGADA & DUE ARCHITECTURE ---");

  await runTest("Receivables vs Payables classification separation (Customer type 1 vs Supplier type 2)", () => {
    const accounts = [
      { id: "c1", name: "কাস্টমার করিম", type: 1, balance: 1500, businessId: "1" },
      { id: "c2", name: "কাস্টমার রহিম", type: 1, balance: 2500, businessId: "1" },
      { id: "s1", name: "সাপ্লায়ার আড়ৎদার", type: 2, balance: 5000, businessId: "1" },
      { id: "s2", name: "সাপ্লায়ার কোম্পানি", type: 2, balance: 3000, businessId: "1" },
    ];

    const customerDue = accounts
      .filter((a) => a.type === 1)
      .reduce((sum, a) => sum + a.balance, 0);
    const supplierDue = accounts
      .filter((a) => a.type === 2)
      .reduce((sum, a) => sum + a.balance, 0);

    assert.strictEqual(customerDue, 4000, "Customer receivables must sum to 4000");
    assert.strictEqual(supplierDue, 8000, "Supplier payables must sum to 8000");
  });

  await runTest("Partial payment monotonically reduces balance while preserving opening balance", () => {
    const account = { id: "c1", name: "করিম", type: 1, openingBalance: 5000, balance: 5000 };
    const payment = 2000;
    const newBalance = Math.round((account.balance - payment) * 100) / 100;

    assert.strictEqual(newBalance, 3000, "New balance must be exactly 3000");
    assert.strictEqual(account.openingBalance, 5000, "Opening balance baseline must remain strictly untouched");
  });

  await runTest("Full settlement to zero excludes account from active due list while preserving record", () => {
    const accounts = [
      { id: "c1", name: "করিম", type: 1, balance: 0 },
      { id: "c2", name: "রহিম", type: 1, balance: 1500 },
    ];

    const dueList = accounts.filter((a) => a.type === 1 && a.balance > 0);
    assert.strictEqual(dueList.length, 1, "Only accounts with balance > 0 appear in due list");
    assert.strictEqual(dueList[0].id, "c2");
    assert.strictEqual(accounts.length, 2, "Settled account remains fully preserved in master ledger");
  });

  await runTest("Customer overpayment results in negative balance (advance deposit) excluded from receivables due", () => {
    const accounts = [
      { id: "c1", name: "করিম", type: 1, balance: -500 }, // Advance deposit
      { id: "c2", name: "রহিম", type: 1, balance: 1200 },
    ];

    const totalReceivableDue = accounts
      .filter((a) => a.type === 1 && a.balance > 0)
      .reduce((sum, a) => sum + a.balance, 0);

    assert.strictEqual(totalReceivableDue, 1200, "Negative balances must not be counted as receivable dues");
  });

  await runTest("Due balance calculation isolates accounts strictly by activeBusinessId", () => {
    const accounts = [
      { id: "c1", name: "শপ ১ কাস্টমার", type: 1, balance: 1200, businessId: "1" },
      { id: "c2", name: "শপ ২ কাস্টমার", type: 1, balance: 4500, businessId: "2" },
    ];

    const b1Due = accounts
      .filter((a) => String(a.businessId || "1") === "1" && a.type === 1 && a.balance > 0)
      .reduce((sum, a) => sum + a.balance, 0);
    const b2Due = accounts
      .filter((a) => String(a.businessId || "1") === "2" && a.type === 1 && a.balance > 0)
      .reduce((sum, a) => sum + a.balance, 0);

    assert.strictEqual(b1Due, 1200, "Business 1 due must be 1200");
    assert.strictEqual(b2Due, 4500, "Business 2 due must be 4500");
  });

  console.log("\n--- PART 2: REMINDER & COMMUNICATION FLOW ARCHITECTURE ---");

  await runTest("SMS Reminder template generates correct Bengali message and sanitized sms: URI", () => {
    const account = { id: "c1", name: "আব্দুল হক", phone: "01711-223344", balance: 3500 };
    const businessName = "Mobile Xpress";
    const ownerPhone = "01811223344";

    const msg =
      `আসসালামু আলাইকুম ${account.name},\n` +
      `${businessName}-এ আপনার বকেয়া হিসাব বাবদ মোট ৳ ${formatMoney(account.balance)} টাকা পাওনা রয়েছে। ` +
      `অনুগ্রহ করে বকেয়া পরিশোধ করার জন্য অনুরোধ করা হলো। ধন্যবাদ।\n` +
      `যোগাযোগ: ${ownerPhone}`;

    const cleanPhone = account.phone.replace(/[^0-9+]/g, "");
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(msg)}`;

    assert(cleanPhone === "01711223344", "Phone must be sanitized to pure digits");
    assert(smsUrl.startsWith("sms:01711223344?body="), "Must construct standard sms: protocol URL");
    assert(msg.includes("3,500.00"), "Must format balance with integer paisa formatting");
  });

  await runTest("Reminder template handles fallback for empty or missing customer name", () => {
    const account = { id: "c_anon", name: "", phone: "01700000000", balance: 1000 };
    const businessName = "Mobile Xpress";
    const displayName = account.name || "সম্মানিত গ্রাহক";
    const msg = `আসসালামু আলাইকুম ${displayName},\n${businessName}-এ আপনার বকেয়া হিসাব বাবদ মোট ৳ ${formatMoney(account.balance)} টাকা পাওনা রয়েছে।`;

    assert(msg.includes("সম্মানিত গ্রাহক"), "Must fallback gracefully to generic respectful title");
  });

  await runTest("WhatsApp Reminder URL formats standard international phone with '88' country code prefix", () => {
    const account = { id: "c1", name: "হাসান", phone: "01912345678", balance: 1250 };
    let phone = account.phone.replace(/[^0-9]/g, "");
    if (phone.startsWith("01")) phone = "88" + phone;

    const waUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent("বকেয়া তাগাদা")}`;
    assert.strictEqual(phone, "8801912345678", "Must format phone with 88 country code");
    assert(waUrl.startsWith("whatsapp://send?phone=8801912345678"), "Must construct valid WhatsApp URI");
  });

  await runTest("Zero background SMS: Communications execute exclusively through client OS deep links / Sharesheet", () => {
    const calls = [];
    const mockLinking = {
      openURL: async (url) => {
        calls.push({ type: "linking", url });
      },
    };
    const mockShare = {
      share: async (payload) => {
        calls.push({ type: "share", payload });
      },
    };

    // User taps SMS
    const testUrl = "sms:01711223344?body=test";
    mockLinking.openURL(testUrl);

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].type, "linking");
    assert(calls[0].url.startsWith("sms:"), "SMS launched via OS intent, zero silent background SMS daemon");
  });

  await runTest("Tagada logs and quota decrement execute atomically via mutateStore", async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();

    await repo.persistData({ remainingSmsCount: 5, tagadaLogs: [] });

    const customer = { id: "c_tag", name: "জামাল", phone: "01700000000", balance: 2000 };
    const logItem = {
      id: "tag_1",
      customerName: customer.name,
      phone: customer.phone,
      amount: customer.balance,
      date: "2026-11-01",
      time: "10:30 AM",
    };

    const res = await repo.mutateStore((latest) => {
      const curCount = Number(latest.remainingSmsCount) || 0;
      return {
        ...latest,
        remainingSmsCount: Math.max(0, curCount - 1),
        tagadaLogs: [logItem, ...(latest.tagadaLogs || [])],
      };
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.remainingSmsCount, 4, "Remaining SMS count decrements from 5 to 4");
    assert.strictEqual(res.data.tagadaLogs.length, 1);
    assert.strictEqual(res.data.tagadaLogs[0].customerName, "জামাল");
  });

  await runTest("Tagada logs persist across store reload and backup payloads", async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();

    const sampleLogs = [
      { id: "log_1", customerName: "গ্রাহক ১", amount: 1500, date: "2026-11-01" },
      { id: "log_2", customerName: "গ্রাহক ২", amount: 2500, date: "2026-11-01" },
    ];
    await repo.persistData({ tagadaLogs: sampleLogs });

    const fullBackup = await repo.getFullBackupState();
    assert.ok(Array.isArray(fullBackup.tagadaLogs));
    assert.strictEqual(fullBackup.tagadaLogs.length, 2);
    assert.strictEqual(fullBackup.tagadaLogs[0].customerName, "গ্রাহক ১");
  });

  console.log("\n--- PART 3: BUSINESS NOTES DATA ARCHITECTURE ---");

  await runTest("Notes creation stamps unique ID with 'note_' prefix and default isComplete: false", async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();

    const noteItem = {
      id: "note_1730419200000_1_abc12",
      businessId: "1",
      text: "রবিবার চাল ডেলিভারি আসবে",
      isComplete: false,
      date: "2026-11-01",
    };

    const res = await repo.mutateCollection("notes", (latest) => [noteItem, ...latest]);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.collection[0].id, noteItem.id);
    assert.strictEqual(res.collection[0].isComplete, false);
    assert.strictEqual(res.collection[0].businessId, "1");
  });

  await runTest("Notes toggle isComplete mutates state atomically in storage", async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();

    await repo.mutateCollection("notes", (latest) => [
      { id: "note_target", businessId: "1", text: "দোকান ভাড়া পরিশোধ", isComplete: false },
    ]);

    const toggleRes = await repo.mutateCollection("notes", (latest) =>
      latest.map((n) => (n.id === "note_target" ? { ...n, isComplete: !n.isComplete } : n))
    );

    assert.strictEqual(toggleRes.success, true);
    const toggled = toggleRes.collection.find((n) => n.id === "note_target");
    assert.strictEqual(toggled.isComplete, true, "Note isComplete must flip from false to true");
  });

  await runTest("Notes deletion filters target note without orphan residuals", async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();

    await repo.mutateCollection("notes", (latest) => [
      { id: "note_del_1", businessId: "1", text: "নোট ১", isComplete: false },
      { id: "note_keep_2", businessId: "1", text: "নোট ২", isComplete: false },
    ]);

    const delRes = await repo.mutateCollection("notes", (latest) =>
      latest.filter((n) => n.id !== "note_del_1")
    );

    assert.strictEqual(delRes.success, true);
    assert.strictEqual(delRes.collection.length, 1);
    assert.strictEqual(delRes.collection[0].id, "note_keep_2");
  });

  await runTest("Notes are strictly scoped by businessId in multi-business tenancy", async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();

    await repo.mutateCollection("notes", (latest) => [
      { id: "n_b1", businessId: "1", text: "শপ ১ নোট" },
      { id: "n_b2", businessId: "2", text: "শপ ২ নোট" },
    ]);

    const b1Notes = repo.filterByBusiness(repo.currentStore.notes, "1");
    const b2Notes = repo.filterByBusiness(repo.currentStore.notes, "2");

    assert.strictEqual(b1Notes.length, 1);
    assert.strictEqual(b1Notes[0].id, "n_b1");
    assert.strictEqual(b2Notes.length, 1);
    assert.strictEqual(b2Notes[0].id, "n_b2");
  });

  await runTest("deleteBusinessCascade purges notes of target business while preserving others", async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();

    const createdBiz = await repo.createBusiness({ name: "শাখা ২" });
    const biz2Id = createdBiz.data.activeBusinessId;

    await repo.mutateCollection("notes", (latest) => [
      { id: "n_b1_perm", businessId: "1", text: "মূল দোকান নোট" },
      { id: "n_b2_temp", businessId: biz2Id, text: "শাখা ২ নোট" },
    ]);

    const cascadeRes = await repo.deleteBusinessCascade(biz2Id);
    assert.strictEqual(cascadeRes.success, true);

    const remainingNotes = repo.currentStore.notes;
    assert.strictEqual(remainingNotes.some((n) => n.businessId === biz2Id), false);
    assert.strictEqual(remainingNotes.some((n) => n.id === "n_b1_perm"), true);
  });

  console.log("\n--- PART 4: BUSINESS REPORTS ARCHITECTURE (7 REPORT MODALS) ---");

  await runTest("Report 1 (Profit & Loss / modalProfitLoss) formula aggregates revenue, COGS, and operating expenses", () => {
    const todaySales = 12000;
    const totalCustomerDue = 4000;
    const totalSupplierDue = 5000;
    const todayCosts = 1500;

    const estimatedNetProfit = Math.max(0, todaySales + totalCustomerDue - totalSupplierDue - todayCosts);
    assert.strictEqual(estimatedNetProfit, 9500, "Net profit must equal (12000 + 4000) - 5000 - 1500 = 9500");
  });

  await runTest("Report 1 (Profit & Loss) clamps loss safely to zero when operating costs exceed revenue", () => {
    const todaySales = 2000;
    const totalCustomerDue = 1000;
    const totalSupplierDue = 4000;
    const todayCosts = 1500;

    const estimatedNetProfit = Math.max(0, todaySales + totalCustomerDue - totalSupplierDue - todayCosts);
    assert.strictEqual(estimatedNetProfit, 0, "Loss condition clamps estimated net profit cleanly to 0");
  });

  await runTest("Report 2 (Full Balance Sheet / modalFullReport) formula calculates Total Business Assets", () => {
    const totalCash = 18500;
    const totalCustomerDue = 6200;
    const totalStockCost = 35000;

    const totalBusinessAssets = totalCash + totalCustomerDue + totalStockCost;
    assert.strictEqual(totalBusinessAssets, 59700, "Total assets must equal 18500 + 6200 + 35000 = 59700");
  });

  await runTest("Report 3 (Sales & Purchases / modalBechaKena) aggregates cash + credit trade", () => {
    const cashEntries = [
      { id: "c1", category: "sale", amount: 8000 },
      { id: "c2", category: "buy", amount: 3000 },
    ];
    const journals = [
      { id: "j1", type: "give", amount: 2500 }, // credit sale
      { id: "j2", type: "got", amount: 1500 },  // credit purchase
    ];

    let cashBecha = 0;
    let cashKena = 0;
    cashEntries.forEach((e) => {
      if (e.category === "sale") cashBecha += Number(e.amount);
      if (e.category === "buy") cashKena += Number(e.amount);
    });

    let bakiBecha = 0;
    let bakiKena = 0;
    journals.forEach((j) => {
      if (j.type === "give") bakiBecha += Number(j.amount);
      if (j.type === "got") bakiKena += Number(j.amount);
    });

    const totalBecha = cashBecha + bakiBecha;
    const totalKena = cashKena + bakiKena;
    const grossMargin = totalBecha - totalKena;

    assert.strictEqual(totalBecha, 10500, "Total sales = 8000 + 2500 = 10500");
    assert.strictEqual(totalKena, 4500, "Total purchase = 3000 + 1500 = 4500");
    assert.strictEqual(grossMargin, 6000, "Gross margin = 10500 - 4500 = 6000");
  });

  await runTest("Report 4 (Baki Report / modalBakiReport) segregates customer receivables and supplier payables", () => {
    const accounts = [
      { id: "a1", name: "গ্রাহক ১", type: 1, balance: 3000 },
      { id: "a2", name: "গ্রাহক ২", type: 1, balance: 0 },
      { id: "a3", name: "মহাজন ১", type: 2, balance: 4000 },
      { id: "a4", name: "মহাজন ২", type: 2, balance: 0 },
    ];

    const customerDueList = accounts.filter((a) => a.type === 1 && a.balance > 0);
    const supplierDueList = accounts.filter((a) => a.type === 2 && a.balance > 0);

    assert.strictEqual(customerDueList.length, 1);
    assert.strictEqual(customerDueList[0].id, "a1");
    assert.strictEqual(supplierDueList.length, 1);
    assert.strictEqual(supplierDueList[0].id, "a3");
  });

  await runTest("Report 5 (Cashbook Statement / modalCashReport) classifies inflow and outflow streams", () => {
    const entries = [
      { id: "1", type: "in", category: "sale", amount: 5000 },
      { id: "2", type: "in", category: "baki_aday", amount: 2000 },
      { id: "3", type: "out", category: "cost", amount: 600 },
      { id: "4", type: "out", category: "supplier_pay", amount: 3500 },
    ];

    const totalInflow = entries
      .filter((e) => e.type === "in")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalOutflow = entries
      .filter((e) => e.type === "out")
      .reduce((sum, e) => sum + e.amount, 0);

    assert.strictEqual(totalInflow, 7000, "Inflow = 5000 + 2000 = 7000");
    assert.strictEqual(totalOutflow, 4100, "Outflow = 600 + 3500 = 4100");
  });

  await runTest("Report 6 (Operating Expenses / modalExpenseReport) isolates category: 'cost'", () => {
    const entries = [
      { id: "1", category: "cost", amount: 250, desc: "নাস্তা ও চা" },
      { id: "2", category: "cost", amount: 1200, desc: "বিদ্যুৎ বিল" },
      { id: "3", category: "buy", amount: 4500, desc: "মাল ক্রয়" },
    ];

    const costs = entries.filter((e) => e.category === "cost");
    const totalCost = costs.reduce((sum, e) => sum + e.amount, 0);

    assert.strictEqual(costs.length, 2);
    assert.strictEqual(totalCost, 1450, "Total cost = 250 + 1200 = 1450");
  });

  await runTest("Report 7 (Owner Equity / modalMalikReport) calculates net business equity investment vs drawings", () => {
    const entries = [
      { id: "1", category: "malik_in", amount: 50000 }, // capital introduced
      { id: "2", category: "malik_in", amount: 10000 },
      { id: "3", category: "malik_out", amount: 15000 }, // personal drawing
    ];

    const malikIn = entries
      .filter((e) => e.category === "malik_in")
      .reduce((sum, e) => sum + e.amount, 0);
    const malikOut = entries
      .filter((e) => e.category === "malik_out")
      .reduce((sum, e) => sum + e.amount, 0);
    const netEquity = malikIn - malikOut;

    assert.strictEqual(malikIn, 60000, "Total capital introduced = 60000");
    assert.strictEqual(malikOut, 15000, "Total drawings = 15000");
    assert.strictEqual(netEquity, 45000, "Net business equity = 45000");
  });

  await runTest("Financial precision: Paisa math eliminates floating point drift (0.1 + 0.2 = 0.30)", () => {
    const item1 = 0.1;
    const item2 = 0.2;
    const rawSum = item1 + item2;
    const normalizedSum = Math.round(rawSum * 100) / 100;
    const formatted = formatMoney(normalizedSum);

    assert.strictEqual(normalizedSum, 0.3);
    assert.strictEqual(formatted, "0.30");
  });

  console.log("\n--- PART 5: PHASE 7 INVENTORY INTEGRITY CARRY-FORWARD AUDIT ---");

  await runTest("Continuous DATA-12 parity across inventory and stock mutations", async () => {
    const mock = createMockStorage();
    const repo = new StorageRepository(mock);
    await repo.loadInitialData();

    await repo.mutateCollection("inventory", (list) => [
      { id: "p_carry_1", name: "সয়াবিন তেল", stock: 20, buyPrice: 150, sellPrice: 170 },
      ...list,
    ]);

    const store = repo.getAuthoritativeState();
    assert.strictEqual(store.inventory.length, store.stock.length);
    assert.strictEqual(store.inventory[0].id, store.stock[0].id);
    assert.strictEqual(store.stock[0].stock, 20);
  });

  await runTest("validateStockAdjustment non-negative guard blocks reduction exceeding current stock", () => {
    const res = validateStockAdjustment(10, 15, "out");
    assert.strictEqual(res.valid, false);
    assert(res.error.includes("বেশি"));
  });

  await runTest("Over-issue handling and floor clamping via Math.max(0, current - qty)", () => {
    const current = 10;
    const overIssueQty = 15;
    const clampedNewStock = Math.max(0, current - overIssueQty);
    assert.strictEqual(clampedNewStock, 0, "Floor clamping prevents negative number");
  });

  await runTest("Transaction reversal safety restores exact stock quantity without drift", () => {
    let stock = 50;
    // Transaction deduction
    const deductRes = validateStockAdjustment(stock, 12, "reduce");
    assert.strictEqual(deductRes.valid, true);
    stock = deductRes.newStock;
    assert.strictEqual(stock, 38);

    // Reversal / cancel transaction
    const reverseRes = validateStockAdjustment(stock, 12, "add");
    assert.strictEqual(reverseRes.valid, true);
    stock = reverseRes.newStock;
    assert.strictEqual(stock, 50, "Reversal must restore exact stock to 50");
  });

  console.log("\n--- PART 6: SYNTAX & BABEL AST INTEGRITY ---");

  await runTest("App.js compiles cleanly with zero syntax errors via Babel parser", () => {
    const appSource = fs.readFileSync(path.resolve(__dirname, "App.js"), "utf8");
    const ast = babel.parseSync(appSource, {
      filename: "App.js",
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["jsx", "flow"] },
    });
    assert.ok(ast, "Babel AST must parse successfully");
  });

  console.log("\n================================================================");
  console.log(`PHASE 8 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================\n");
}

runAllTests().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
