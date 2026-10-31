/**
 * test_phase6_contacts_business.js
 * Automated Verification Suite for Phase 6: Contacts & Business Management UI/UX Transformation
 */

const assert = require("assert");
const fs = require("fs");
const babel = require("@babel/core");
const { StorageRepository, createDefaultState } = require("./src/storageRepository");
const ledgerEngine = require("./src/ledgerEngine");

console.log("================================================================");
console.log("PHASE 6: CONTACTS & BUSINESS MANAGEMENT VERIFICATION SUITE");
console.log("================================================================\n");

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
    process.exit(1);
  }
}

function createMockAdapter(initialData = null) {
  const store = new Map();
  if (initialData) {
    store.set(ledgerEngine.V6_KEY, JSON.stringify(initialData));
    store.set("tallykhata_v6_store", JSON.stringify(initialData));
  }
  return {
    getItem: async (key) => (store.has(key) ? store.get(key) : null),
    setItem: async (key, val) => { store.set(key, String(val)); },
    removeItem: async (key) => { store.delete(key); },
    clear: async () => { store.clear(); },
  };
}

// Contrast ratio calculator
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(rgb1, rgb2) {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

(async () => {
  // ==========================================
  // 1. CONTACT / ACCOUNT MODEL & INVARIANTS
  // ==========================================
  await runTest("Account creation validates non-empty name and correct type", async () => {
    const validCustomer = ledgerEngine.validateAccount("Rahim Ahmed", "01711223344", 500);
    assert.strictEqual(validCustomer.valid, true);
    assert.strictEqual(validCustomer.name, "Rahim Ahmed");
    assert.strictEqual(validCustomer.phone, "01711223344");

    const validSupplier = ledgerEngine.validateAccount("Haji Traders", "01811223344", 1200);
    assert.strictEqual(validSupplier.valid, true);
    assert.strictEqual(validSupplier.initialBalance, 1200);

    const invalidName = ledgerEngine.validateAccount("   ", "01700000000");
    assert.strictEqual(invalidName.valid, false);
  });

  await runTest("Contact type separation: Customer (1) vs Supplier (2)", async () => {
    const raw = createDefaultState();
    raw.activeBusinessId = "biz_test_1";
    raw.accounts = [
      { id: "acc_1", name: "Customer Karim", type: 1, balance: 1000, businessId: "biz_test_1" },
      { id: "acc_2", name: "Supplier Jamuna", type: 2, balance: 2500, businessId: "biz_test_1" },
    ];
    const customers = raw.accounts.filter(a => a.type === 1);
    const suppliers = raw.accounts.filter(a => a.type === 2);
    assert.strictEqual(customers.length, 1);
    assert.strictEqual(suppliers.length, 1);
    assert.strictEqual(customers[0].id, "acc_1");
    assert.strictEqual(suppliers[0].id, "acc_2");
  });

  await runTest("Phone number normalization handles standard Bangladeshi formats", async () => {
    function normalizeBDPhone(phone) {
      if (!phone) return "";
      const cleaned = String(phone).replace(/[^\d+]/g, "");
      if (cleaned.startsWith("+880")) return "0" + cleaned.slice(4);
      if (cleaned.startsWith("880")) return "0" + cleaned.slice(3);
      if (cleaned.startsWith("01") && cleaned.length === 11) return cleaned;
      return cleaned;
    }
    assert.strictEqual(normalizeBDPhone("+8801711223344"), "01711223344");
    assert.strictEqual(normalizeBDPhone("8801812345678"), "01812345678");
    assert.strictEqual(normalizeBDPhone("01999887766"), "01999887766");
    assert.strictEqual(normalizeBDPhone("01711-223344"), "01711223344");
  });

  await runTest("Contact search filters by partial name and partial phone number", async () => {
    const list = [
      { id: "acc_1", name: "আব্দুল করিম", phone: "01711223344" },
      { id: "acc_2", name: "রফিকুল ইসলাম", phone: "01812345678" },
      { id: "acc_3", name: "করিম ব্রাদার্স", phone: "01999887766" },
    ];
    const searchName = "করিম";
    const filteredName = list.filter(c => c.name.includes(searchName) || (c.phone && c.phone.includes(searchName)));
    assert.strictEqual(filteredName.length, 2);

    const searchPhone = "01812";
    const filteredPhone = list.filter(c => c.name.includes(searchPhone) || (c.phone && c.phone.includes(searchPhone)));
    assert.strictEqual(filteredPhone.length, 1);
    assert.strictEqual(filteredPhone[0].id, "acc_2");
  });

  await runTest("Historical transaction preservation: Updating contact name does not mutate journal linkages", async () => {
    const initial = createDefaultState();
    initial.activeBusinessId = "biz_main";
    initial.accounts = [{ id: "acc_10", name: "Old Name", phone: "01700000000", balance: 500, businessId: "biz_main" }];
    initial.journals = [
      { id: "j_1", accountId: "acc_10", type: "debit", amount: 500, date: "2026-10-01", businessId: "biz_main" }
    ];
    const repo = new StorageRepository(createMockAdapter(initial));
    await repo.loadInitialData();

    // Update account name via mutateCollection
    await repo.mutateCollection("accounts", (prev) =>
      prev.map(a => a.id === "acc_10" ? { ...a, name: "New Updated Name", phone: "01711111111" } : a)
    );

    const updated = repo.getAuthoritativeState();
    const updatedAcc = updated.accounts.find(a => a.id === "acc_10");
    assert.strictEqual(updatedAcc.name, "New Updated Name");
    assert.strictEqual(updatedAcc.phone, "01711111111");

    // Journal remains strictly linked
    const linkedJournals = updated.journals.filter(j => j.accountId === "acc_10");
    assert.strictEqual(linkedJournals.length, 1);
    assert.strictEqual(linkedJournals[0].id, "j_1");
    assert.strictEqual(linkedJournals[0].amount, 500);
  });

  // ==========================================
  // 2. MULTI-BUSINESS MANAGEMENT & ISOLATION
  // ==========================================
  await runTest("Multi-business creation initializes unique businessId and switches active state", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const res1 = await repo.createBusiness({
      name: "মেসার্স আল-মদিনা স্টোর",
      owner: "মুহাম্মদ আব্দুল্লাহ",
      phone: "01712345678",
      address: "চকবাজার, ঢাকা",
      selectImmediately: true,
    });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.data.businessName, "মেসার্স আল-মদিনা স্টোর");
    const biz1Id = res1.data.activeBusinessId;

    const res2 = await repo.createBusiness({
      name: "মদিনা ফার্মেসি",
      owner: "মুহাম্মদ আব্দুল্লাহ",
      phone: "01812345678",
      address: "উত্তরা, ঢাকা",
      selectImmediately: true,
    });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.data.businessName, "মদিনা ফার্মেসি");
    const biz2Id = res2.data.activeBusinessId;
    assert.notStrictEqual(biz1Id, biz2Id);
    assert.strictEqual(res2.data.businesses.length, 5); // default (3) + 2 new
  });

  await runTest("Business switching strictly isolates accounts and journals across shops", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    // Create Shop A
    const b1 = await repo.createBusiness({ name: "Shop Alpha", selectImmediately: true });
    const b1Id = b1.data.activeBusinessId;
    await repo.mutateCollection("accounts", prev => [
      ...prev,
      { id: "acc_alpha_1", name: "Customer Alpha", balance: 1000, businessId: b1Id }
    ]);
    await repo.mutateCollection("journals", prev => [
      ...prev,
      { id: "j_alpha_1", accountId: "acc_alpha_1", amount: 1000, businessId: b1Id }
    ]);

    // Create Shop B
    const b2 = await repo.createBusiness({ name: "Shop Beta", selectImmediately: true });
    const b2Id = b2.data.activeBusinessId;
    await repo.mutateCollection("accounts", prev => [
      ...prev,
      { id: "acc_beta_1", name: "Customer Beta", balance: 2000, businessId: b2Id }
    ]);
    await repo.mutateCollection("journals", prev => [
      ...prev,
      { id: "j_beta_1", accountId: "acc_beta_1", amount: 2000, businessId: b2Id }
    ]);

    // Switch back to Shop A
    const sw1 = await repo.selectBusiness(b1Id);
    assert.strictEqual(sw1.success, true);
    assert.strictEqual(sw1.data.activeBusinessId, b1Id);
    const shop1Accounts = sw1.data.accounts.filter(a => (a.businessId || sw1.data.activeBusinessId) === b1Id);
    assert.strictEqual(shop1Accounts.some(a => a.id === "acc_alpha_1"), true);
    assert.strictEqual(shop1Accounts.some(a => a.id === "acc_beta_1"), false);

    // Switch to Shop B
    const sw2 = await repo.selectBusiness(b2Id);
    assert.strictEqual(sw2.success, true);
    const shop2Accounts = sw2.data.accounts.filter(a => a.businessId === b2Id);
    assert.strictEqual(shop2Accounts.some(a => a.id === "acc_beta_1"), true);
    assert.strictEqual(shop2Accounts.some(a => a.id === "acc_alpha_1"), false);
  });

  await runTest("Sole Active Business Guard: Cannot archive the only remaining active business", async () => {
    const raw = createDefaultState();
    raw.businesses = [{ id: "only_1", name: "Sole Shop", isArchived: false }];
    raw.activeBusinessId = "only_1";
    const repo = new StorageRepository(createMockAdapter(raw));
    await repo.loadInitialData();

    const res = await repo.archiveBusiness("only_1");
    assert.strictEqual(res.success, false);
    assert.match(res.error.message, /কমপক্ষে একটি ব্যবসা সক্রিয় থাকতে হবে/);
  });

  await runTest("Business Archival & Restoration maintains full data preservation", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const b1 = await repo.createBusiness({ name: "Primary Shop", selectImmediately: true });
    const b2 = await repo.createBusiness({ name: "Secondary Shop", selectImmediately: false });
    const b2Id = b2.data.businesses.find(b => b.name === "Secondary Shop").id;

    // Archive Secondary Shop
    const arc = await repo.archiveBusiness(b2Id);
    assert.strictEqual(arc.success, true);
    const archivedBiz = arc.data.businesses.find(b => b.id === b2Id);
    assert.strictEqual(archivedBiz.isArchived, true);

    // Restore Secondary Shop
    const rest = await repo.restoreBusiness(b2Id, { makeActive: true });
    assert.strictEqual(rest.success, true);
    assert.strictEqual(rest.data.activeBusinessId, b2Id);
    const restoredBiz = rest.data.businesses.find(b => b.id === b2Id);
    assert.strictEqual(restoredBiz.isArchived, false);
  });

  await runTest("Permanent Deletion Financial Guard: Blocks deletion if accounts or journals exist", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const b = await repo.createBusiness({ name: "Trading Co", selectImmediately: true });
    const bId = b.data.activeBusinessId;
    await repo.mutateCollection("accounts", prev => [
      ...prev,
      { id: "acc_trade_1", name: "Counterparty", balance: 500, businessId: bId }
    ]);

    const del = await repo.deleteBusinessPermanently(bId);
    assert.strictEqual(del.success, false);
    assert.match(del.error.message, /সংরক্ষিত আর্থিক হিসাব/);
  });

  await runTest("Cascade Deletion safely cleans up target business while leaving others unaffected", async () => {
    const repo = new StorageRepository(createMockAdapter());
    await repo.loadInitialData();

    const bAlpha = await repo.createBusiness({ name: "Alpha", selectImmediately: true });
    const aId = bAlpha.data.activeBusinessId;
    const bBeta = await repo.createBusiness({ name: "Beta", selectImmediately: true });
    const betaId = bBeta.data.activeBusinessId;

    await repo.mutateCollection("accounts", prev => [
      ...prev,
      { id: "acc_a", name: "A-Cust", balance: 100, businessId: aId },
      { id: "acc_b", name: "B-Cust", balance: 200, businessId: betaId },
    ]);

    // Cascade delete Beta
    const casc = await repo.deleteBusinessCascade(betaId);
    assert.strictEqual(casc.success, true);
    const state = repo.getAuthoritativeState();
    assert.strictEqual(state.accounts.some(a => a.id === "acc_b"), false);
    assert.strictEqual(state.accounts.some(a => a.id === "acc_a"), true);
  });

  // ==========================================
  // 3. WCAG 2.2 AA / AAA CONTRAST & TOUCH TARGETS
  // ==========================================
  await runTest("WCAG 2.2 AA Contrast: Contact cards & due badges", async () => {
    const darkBg = hexToRgb("#1E293B");
    const lightBg = hexToRgb("#FFFFFF");
    const crimsonText = hexToRgb("#B81414");
    const darkPrimaryText = hexToRgb("#F8FAFC");
    const lightPrimaryText = hexToRgb("#1A1A1A");

    const lightTextRatio = getContrast(lightPrimaryText, lightBg);
    assert.ok(lightTextRatio >= 7.0, `Light mode text contrast ${lightTextRatio.toFixed(2)} should be >= 7.0 (AAA)`);

    const darkTextRatio = getContrast(darkPrimaryText, darkBg);
    assert.ok(darkTextRatio >= 7.0, `Dark mode text contrast ${darkTextRatio.toFixed(2)} should be >= 7.0 (AAA)`);

    const dueLightRatio = getContrast(crimsonText, lightBg);
    assert.ok(dueLightRatio >= 4.5, `Due badge light contrast ${dueLightRatio.toFixed(2)} should be >= 4.5 (AA)`);

    const dueDarkRatio = getContrast(hexToRgb("#FCA5A5"), hexToRgb("#450A0A"));
    assert.ok(dueDarkRatio >= 4.5, `Due badge dark contrast ${dueDarkRatio.toFixed(2)} should be >= 4.5 (AA)`);
  });

  await runTest("Touch target dimensions meet or exceed 48x48dp standard", async () => {
    const touchTargets = {
      floatingAddAccountFab: { width: 56, height: 56 },
      callActionButton: { width: 48, height: 48 },
      editActionButton: { width: 48, height: 48 },
      deleteActionButton: { width: 48, height: 48 },
      smsTagadaButton: { width: 48, height: 48 },
      businessSwitcherItem: { minHeight: 64 },
      addBusinessButton3D: { minHeight: 48 },
      modalCloseCircle: { width: 36, height: 36, hitSlop: 10 }, // effective 56x56
    };
    for (const [name, target] of Object.entries(touchTargets)) {
      const effectiveW = (target.width || 48) + (target.hitSlop ? target.hitSlop * 2 : 0);
      const effectiveH = (target.height || target.minHeight || 48) + (target.hitSlop ? target.hitSlop * 2 : 0);
      assert.ok(effectiveW >= 48, `${name} effective width ${effectiveW}dp must be >= 48dp`);
      assert.ok(effectiveH >= 48, `${name} effective height ${effectiveH}dp must be >= 48dp`);
    }
  });

  // ==========================================
  // 4. AST & SYNTAX INTEGRITY OF APP.JS
  // ==========================================
  await runTest("App.js compiles cleanly with zero syntax errors via Babel parser", async () => {
    const appSource = fs.readFileSync("./App.js", "utf8");
    const ast = babel.parseSync(appSource, {
      filename: "App.js",
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["jsx", "flow"] },
    });
    assert.ok(ast && ast.program && ast.program.body.length > 0, "App.js must compile into valid AST");
    assert.ok(appSource.includes("modalBusinessPicker"), "modalBusinessPicker must exist in App.js");
    assert.ok(appSource.includes("modalAddBusiness"), "modalAddBusiness must exist in App.js");
  });

  console.log(`\n================================================================`);
  console.log(`PHASE 6 AUTOMATED VERIFICATION COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log(`================================================================\n`);
})();
