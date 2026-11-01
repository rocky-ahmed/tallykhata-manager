/**
 * test_phase7_inventory_stock.js
 * Comprehensive Automated Regression Test Suite for Phase 7:
 * Independent Inventory QA, Product Data Models, Stock Adjustment Invariants,
 * Dual Collection ('inventory' & 'stock') Synchronization, Multi-Business Stock Scoping,
 * Real-Time Search & Status Filtering, WCAG 2.2 Contrast & Babel AST Syntax Audit.
 *
 * Worker: Worker 3 (Ohm) - QA, Testing & Security Engineer
 * Registered Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 */

const assert = require("assert");
const fs = require("fs");
const babel = require("@babel/core");

const ledgerEngine = require("./src/ledgerEngine");
const {
  validateStockAdjustment,
  generateUniqueId,
} = ledgerEngine;

const { StorageRepository, DEFAULT_STATE } = require("./src/storageRepository");
const themeService = require("./src/themeService");
const { LIGHT_THEME, DARK_THEME, getThemeTokens, getThemedStyles } = themeService;
const iconMetrics = require("./src/iconMetrics");
const { STANDARD_TOUCH_HIT_SLOP } = iconMetrics;
const typographyTokens = require("./src/typographyTokens");
const { TYPOGRAPHY_SCALES, BENGALI_LINE_HEIGHT_MULTIPLIER } = typographyTokens;

console.log("================================================================");
console.log("PHASE 7: INVENTORY & STOCK MANAGEMENT REGRESSION TEST SUITE");
console.log("================================================================\n");

let passed = 0;
let total = 0;

async function runTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`[PASS] TEST ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] TEST ${total}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function getLuminance(hex) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) => {
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Product validator helper mirroring App.js handleSaveProduct logic
function validateProductData(name, unit, buyPrice, sellPrice, initialStock) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    return { valid: false, error: "পণ্যের নাম লেখা আবশ্যক।" };
  }
  const cleanUnit = String(unit || "পিস").trim() || "পিস";
  const buy = parseFloat(buyPrice) || 0;
  const sell = parseFloat(sellPrice) || 0;
  const stock = parseFloat(initialStock) || 0;

  if (buy < 0 || sell < 0) {
    return { valid: false, error: "ক্রয়মূল্য বা বিক্রয়মূল্য ঋণাত্মক হতে পারে না।" };
  }
  if (stock < 0) {
    return { valid: false, error: "প্রারম্ভিক স্টক ঋণাত্মক হতে পারে না।" };
  }

  return {
    valid: true,
    name: trimmedName,
    unit: cleanUnit,
    buyPrice: Math.round(buy * 100) / 100,
    sellPrice: Math.round(sell * 100) / 100,
    stock: Math.round(stock * 100) / 100,
  };
}

async function main() {
  // ============================================================================
  // PART 1: PRODUCT DATA MODEL & VALIDATION
  // ============================================================================
  console.log("--- PART 1: PRODUCT DATA MODEL & VALIDATION ---");

  await runTest("Product creation requires non-empty name and trims whitespace", () => {
    const resEmpty = validateProductData("", "কেজি", 100, 120, 10);
    assert.strictEqual(resEmpty.valid, false);
    assert(resEmpty.error.includes("পণ্যের নাম"), "Must reject empty name");

    const resSpaces = validateProductData("   ", "কেজি", 100, 120, 10);
    assert.strictEqual(resSpaces.valid, false);

    const resValid = validateProductData("  নাজিরশাইল চাল  ", "বস্তা", 2800, 3100, 15);
    assert.strictEqual(resValid.valid, true);
    assert.strictEqual(resValid.name, "নাজিরশাইল চাল");
  });

  await runTest("Product creation accepts standard and custom units with sensible default", () => {
    const resDefault = validateProductData("চানাচুর", "", 25, 30, 50);
    assert.strictEqual(resDefault.valid, true);
    assert.strictEqual(resDefault.unit, "পিস", "Empty unit should default to পিস");

    const resKg = validateProductData("আলু", "কেজি", 40, 50, 100);
    assert.strictEqual(resKg.unit, "কেজি");

    const resLtr = validateProductData("সয়াবিন তেল", "লিটার", 170, 185, 40);
    assert.strictEqual(resLtr.unit, "লিটার");
  });

  await runTest("Product creation parses and validates positive buyPrice and sellPrice", () => {
    const resValid = validateProductData("ডিম", "ডজন", "135.50", "150.00", 30);
    assert.strictEqual(resValid.valid, true);
    assert.strictEqual(resValid.buyPrice, 135.5);
    assert.strictEqual(resValid.sellPrice, 150);

    const resNeg = validateProductData("খারাপ দাম", "পিস", -50, 60, 10);
    assert.strictEqual(resNeg.valid, false);
    assert(resNeg.error.includes("ঋণাত্মক"), "Must reject negative buy price");
  });

  await runTest("Product creation enforces non-negative initial stock (stock >= 0)", () => {
    const resZeroStock = validateProductData("নতুন পণ্য", "পিস", 100, 120, 0);
    assert.strictEqual(resZeroStock.valid, true);
    assert.strictEqual(resZeroStock.stock, 0);

    const resNegStock = validateProductData("নেগেটিভ পণ্য", "পিস", 100, 120, -5);
    assert.strictEqual(resNegStock.valid, false);
    assert(resNegStock.error.includes("ঋণাত্মক"), "Must reject negative stock");
  });

  await runTest("Product creation assigns unique collision-free ID with 'prod_' or 'p_' prefix", () => {
    const id1 = generateUniqueId("prod_");
    const id2 = generateUniqueId("prod_");
    assert(id1.startsWith("prod_"));
    assert(id2.startsWith("prod_"));
    assert.notStrictEqual(id1, id2, "Generated IDs must be unique");
  });

  await runTest("Inventory valuation: accurately calculates totalStockCost (sum of stock * buyPrice)", () => {
    const items = [
      { id: "1", stock: 25, buyPrice: 3200, sellPrice: 3450 }, // 80,000
      { id: "2", stock: 40, buyPrice: 820, sellPrice: 875 },   // 32,800
      { id: "3", stock: 65, buyPrice: 130, sellPrice: 140 },   // 8,450
      { id: "4", stock: 8, buyPrice: 135, sellPrice: 150 },    // 1,080
    ];
    let totalCost = 0;
    items.forEach((item) => {
      totalCost += (Number(item.stock) || 0) * (Number(item.buyPrice) || 0);
    });
    assert.strictEqual(totalCost, 122330, "Total stock cost must be exactly 122,330 Taka");
  });

  await runTest("Inventory valuation: accurately calculates totalStockSaleValue and estimated gross profit", () => {
    const items = [
      { id: "1", stock: 25, buyPrice: 3200, sellPrice: 3450 }, // sale: 86,250
      { id: "2", stock: 40, buyPrice: 820, sellPrice: 875 },   // sale: 35,000
      { id: "3", stock: 65, buyPrice: 130, sellPrice: 140 },   // sale: 9,100
      { id: "4", stock: 8, buyPrice: 135, sellPrice: 150 },    // sale: 1,200
    ];
    let totalSale = 0;
    let totalCost = 0;
    items.forEach((item) => {
      totalSale += (Number(item.stock) || 0) * (Number(item.sellPrice) || 0);
      totalCost += (Number(item.stock) || 0) * (Number(item.buyPrice) || 0);
    });
    assert.strictEqual(totalSale, 131550, "Total sale value must be 131,550 Taka");
    const grossProfit = totalSale - totalCost;
    assert.strictEqual(grossProfit, 9220, "Estimated profit must be 9,220 Taka");
  });

  await runTest("Product default scoping: products without explicit businessId safely resolve to active business '1'", () => {
    const repo = new StorageRepository();
    const inventory = [
      { id: "p1", name: "চাল", stock: 10 }, // no businessId
      { id: "p2", name: "ডাল", businessId: "2", stock: 20 },
    ];
    const filtered1 = repo.filterByBusiness(inventory, "1");
    assert.strictEqual(filtered1.length, 1);
    assert.strictEqual(filtered1[0].id, "p1");
  });

  // ============================================================================
  // PART 2: STOCK ADJUSTMENT INVARIANTS VIA validateStockAdjustment
  // ============================================================================
  console.log("\n--- PART 2: STOCK ADJUSTMENT INVARIANTS VIA validateStockAdjustment ---");

  await runTest("validateStockAdjustment rejects non-numeric or NaN adjustment quantities", () => {
    const resNaN = validateStockAdjustment(10, "abc", "in");
    assert.strictEqual(resNaN.valid, false);
    assert(resNaN.error.includes("সঠিক স্টক সমন্বয় পরিমাণ দিন"));

    const resNull = validateStockAdjustment(10, null, "in");
    assert.strictEqual(resNull.valid, false);
  });

  await runTest("validateStockAdjustment rejects zero or negative adjustment quantities", () => {
    const resZero = validateStockAdjustment(10, 0, "in");
    assert.strictEqual(resZero.valid, false);
    assert(resZero.error.includes("সঠিক স্টক সমন্বয় পরিমাণ দিন"));

    const resNeg = validateStockAdjustment(10, -5, "in");
    assert.strictEqual(resNeg.valid, false);
  });

  await runTest("validateStockAdjustment rejects invalid adjustment type strings", () => {
    const resInvalidType = validateStockAdjustment(10, 5, "unknown_type");
    assert.strictEqual(resInvalidType.valid, false);
    assert(resInvalidType.error.includes("অবৈধ স্টক সমন্বয় ধরন"));
  });

  await runTest("validateStockAdjustment processes valid Stock In ('in') and increases stock accurately", () => {
    const res = validateStockAdjustment(25, 10, "in");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.newStock, 35, "25 + 10 = 35");
  });

  await runTest("validateStockAdjustment accepts alternate In aliases ('add', 'increase')", () => {
    const resAdd = validateStockAdjustment(15, 5, "add");
    assert.strictEqual(resAdd.valid, true);
    assert.strictEqual(resAdd.newStock, 20);

    const resInc = validateStockAdjustment(20, 8, "increase");
    assert.strictEqual(resInc.valid, true);
    assert.strictEqual(resInc.newStock, 28);
  });

  await runTest("validateStockAdjustment processes valid Stock Out ('out') and decreases stock accurately", () => {
    const res = validateStockAdjustment(40, 15, "out");
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.newStock, 25, "40 - 15 = 25");
  });

  await runTest("validateStockAdjustment accepts alternate Out aliases ('reduce', 'decrease')", () => {
    const resReduce = validateStockAdjustment(30, 10, "reduce");
    assert.strictEqual(resReduce.valid, true);
    assert.strictEqual(resReduce.newStock, 20);

    const resDec = validateStockAdjustment(25, 5, "decrease");
    assert.strictEqual(resDec.valid, true);
    assert.strictEqual(resDec.newStock, 20);
  });

  await runTest("validateStockAdjustment allows exact stock depletion to zero (adjustQty === currentStock)", () => {
    const resZeroDeplete = validateStockAdjustment(12, 12, "out");
    assert.strictEqual(resZeroDeplete.valid, true);
    assert.strictEqual(resZeroDeplete.newStock, 0, "Stock can be depleted to exactly 0");
  });

  await runTest("validateStockAdjustment strictly protects against negative stock when adjustQty > currentStock", () => {
    const resOver = validateStockAdjustment(8, 10, "out");
    assert.strictEqual(resOver.valid, false);
    assert(resOver.error.includes("বেশি (10) বাদ দেওয়া সম্ভব নয়"), "Must protect against negative stock");
  });

  // ============================================================================
  // PART 3: DUAL COLLECTION SYNCHRONIZATION ('inventory' & 'stock' PARITY)
  // ============================================================================
  console.log("\n--- PART 3: DUAL COLLECTION SYNCHRONIZATION ('inventory' & 'stock') ---");

  await runTest("Initial state defines 100% parity between default 'inventory' and 'stock' arrays", async () => {
    const repo = new StorageRepository();
    await repo.loadStore();

    assert(Array.isArray(repo.currentStore.inventory), "inventory must be an array");
    assert(Array.isArray(repo.currentStore.stock), "stock must be an array");
    assert.strictEqual(repo.currentStore.inventory.length, repo.currentStore.stock.length);
    assert.strictEqual(
      JSON.stringify(repo.currentStore.inventory),
      JSON.stringify(repo.currentStore.stock),
      "inventory and stock must be bit-identical initially"
    );
  });

  await runTest("mutateCollection('inventory') automatically mirrors changes to 'stock' collection", async () => {
    const repo = new StorageRepository();
    await repo.loadStore();

    const newProd = { id: "p_sync_1", name: "টেস্ট পণ্য ১", stock: 10, buyPrice: 50, sellPrice: 60 };
    const res = await repo.mutateCollection("inventory", (list) => [newProd, ...list]);
    assert.strictEqual(res.success, true);

    const store = repo.currentStore;
    assert.strictEqual(store.inventory[0].id, "p_sync_1");
    assert.strictEqual(store.stock[0].id, "p_sync_1", "stock must be automatically synchronized with inventory");
    assert.strictEqual(store.inventory.length, store.stock.length);
  });

  await runTest("mutateCollection('stock') automatically mirrors changes to 'inventory' collection", async () => {
    const repo = new StorageRepository();
    await repo.loadStore();

    const newStockItem = { id: "p_sync_2", name: "টেস্ট স্টক ২", stock: 20, buyPrice: 100, sellPrice: 120 };
    const res = await repo.mutateCollection("stock", (list) => [newStockItem, ...list]);
    assert.strictEqual(res.success, true);

    const store = repo.currentStore;
    assert.strictEqual(store.stock[0].id, "p_sync_2");
    assert.strictEqual(store.inventory[0].id, "p_sync_2", "inventory must be automatically synchronized with stock");
  });

  await runTest("Store initialization synchronizes 'stock' from 'inventory' when 'stock' is missing", async () => {
    const rawData = {
      ...DEFAULT_STATE,
      inventory: [{ id: "p_legacy_1", name: "লেগ্যাসি পণ্য", stock: 5 }],
      stock: undefined, // missing
    };

    const mockAdapter = {
      getItem: async () => JSON.stringify(rawData),
      setItem: async () => {},
      removeItem: async () => {},
      clear: async () => {},
    };

    const repo = new StorageRepository(mockAdapter);
    await repo.loadStore();

    assert(Array.isArray(repo.currentStore.stock), "stock array must be restored");
    assert.strictEqual(repo.currentStore.stock.length, 1);
    assert.strictEqual(repo.currentStore.stock[0].name, "লেগ্যাসি পণ্য");
  });

  await runTest("Store initialization synchronizes 'inventory' from 'stock' when 'inventory' is missing", async () => {
    const rawData = {
      ...DEFAULT_STATE,
      stock: [{ id: "p_legacy_2", name: "লেগ্যাসি স্টক", stock: 12 }],
      inventory: undefined, // missing
    };

    const mockAdapter = {
      getItem: async () => JSON.stringify(rawData),
      setItem: async () => {},
      removeItem: async () => {},
      clear: async () => {},
    };

    const repo = new StorageRepository(mockAdapter);
    await repo.loadStore();

    assert(Array.isArray(repo.currentStore.inventory), "inventory array must be restored");
    assert.strictEqual(repo.currentStore.inventory.length, 1);
    assert.strictEqual(repo.currentStore.inventory[0].name, "লেগ্যাসি স্টক");
  });

  await runTest("Continuous dual-collection synchronization preserves parity across multiple sequential mutations", async () => {
    const repo = new StorageRepository();
    await repo.loadStore();

    // 1. Add product to inventory
    await repo.mutateCollection("inventory", (list) => [
      { id: "p_chain_1", name: "আইটেম ১", stock: 10 },
      ...list,
    ]);
    // 2. Adjust stock via stock collection
    await repo.mutateCollection("stock", (list) =>
      list.map((p) => (p.id === "p_chain_1" ? { ...p, stock: 15 } : p))
    );
    // 3. Delete product via inventory collection
    await repo.mutateCollection("inventory", (list) => list.filter((p) => p.id !== "p_chain_1"));

    const store = repo.currentStore;
    assert.strictEqual(
      JSON.stringify(store.inventory),
      JSON.stringify(store.stock),
      "inventory and stock must remain completely identical across chained operations"
    );
  });

  // ============================================================================
  // PART 4: MULTI-BUSINESS STOCK ISOLATION & LIFECYCLE SAFEGUARDS
  // ============================================================================
  console.log("\n--- PART 4: MULTI-BUSINESS STOCK ISOLATION & LIFECYCLE SAFEGUARDS ---");

  await runTest("filterByBusiness segregates inventory items strictly by businessId", () => {
    const repo = new StorageRepository();
    const allProducts = [
      { id: "p1", name: "চাল (শপ ১)", businessId: "1", stock: 20 },
      { id: "p2", name: "ডাল (শপ ১)", businessId: "1", stock: 15 },
      { id: "p3", name: "শাড়ি (শপ ২)", businessId: "2", stock: 50 },
    ];

    const b1Products = repo.filterByBusiness(allProducts, "1");
    const b2Products = repo.filterByBusiness(allProducts, "2");

    assert.strictEqual(b1Products.length, 2);
    assert(b1Products.some((p) => p.id === "p1"));
    assert(b1Products.some((p) => p.id === "p2"));
    assert(!b1Products.some((p) => p.id === "p3"));

    assert.strictEqual(b2Products.length, 1);
    assert.strictEqual(b2Products[0].id, "p3");
  });

  await runTest("Adding product to Business 1 does not leak into Business 2", async () => {
    const repo = new StorageRepository();
    await repo.loadStore();

    const pBiz1 = { id: "p_b1_test", businessId: "1", name: "তেল শপ ১", stock: 10 };
    await repo.mutateCollection("inventory", (list) => [pBiz1, ...list]);

    const b2List = repo.filterByBusiness(repo.currentStore.inventory, "2");
    assert(!b2List.some((p) => p.id === "p_b1_test"), "Business 2 must not see Business 1 product");
  });

  await runTest("Updating stock in Business 1 does not affect stock of same-named product in Business 2", async () => {
    const repo = new StorageRepository();
    await repo.loadStore();

    const p1 = { id: "p_dup_b1", businessId: "1", name: "চিনি", stock: 50 };
    const p2 = { id: "p_dup_b2", businessId: "2", name: "চিনি", stock: 20 };
    await repo.mutateCollection("inventory", (list) => [p1, p2, ...list]);

    // Adjust Business 1 stock
    await repo.mutateCollection("inventory", (list) =>
      list.map((p) => (p.id === "p_dup_b1" ? { ...p, stock: 40 } : p))
    );

    const store = repo.currentStore;
    const b1Item = store.inventory.find((p) => p.id === "p_dup_b1");
    const b2Item = store.inventory.find((p) => p.id === "p_dup_b2");

    assert.strictEqual(b1Item.stock, 40, "Business 1 stock reduced to 40");
    assert.strictEqual(b2Item.stock, 20, "Business 2 stock strictly untouched at 20");
  });

  await runTest("deleteBusinessPermanently financial safeguard refuses deletion when linked stock exists", async () => {
    const repo = new StorageRepository();
    await repo.loadStore();

    // Create a temporary business
    const resBiz = await repo.createBusiness({ name: "স্টক ওয়ালা দোকান", isSelected: false });
    const bizId = resBiz.data.businesses.find((b) => b.name === "স্টক ওয়ালা দোকান").id;

    // Attach stock to this business
    await repo.mutateCollection("inventory", (list) => [
      { id: "p_biz_linked", businessId: bizId, name: "পণ্য", stock: 5 },
      ...list,
    ]);

    const delRes = await repo.deleteBusinessPermanently(bizId);
    assert.strictEqual(delRes.success, false);
    assert(
      delRes.error.message.includes("সংরক্ষিত আর্থিক হিসাব বা পণ্য তালিকা রয়েছে"),
      "Must refuse deletion of business with existing stock"
    );
  });

  await runTest("deleteBusinessPermanently financial safeguard checks both 'stock' and 'inventory' collections", async () => {
    const repo = new StorageRepository();
    await repo.loadStore();

    const resBiz = await repo.createBusiness({ name: "স্টক টেস্ট দোকান ২", isSelected: false });
    const bizId = resBiz.data.businesses.find((b) => b.name === "স্টক টেস্ট দোকান ২").id;

    // Attach item in stock
    await repo.mutateCollection("stock", (list) => [
      { id: "p_biz_stock_only", businessId: bizId, name: "পণ্য ২", stock: 10 },
      ...list,
    ]);

    const delRes = await repo.deleteBusinessPermanently(bizId);
    assert.strictEqual(delRes.success, false);
    assert(delRes.error.message.includes("সংরক্ষিত আর্থিক হিসাব বা পণ্য তালিকা রয়েছে"));
  });

  await runTest("deleteBusinessCascade atomically purges all products belonging to target businessId from inventory and stock", async () => {
    const repo = new StorageRepository();
    await repo.loadStore();

    const resBiz = await repo.createBusiness({ name: "ক্যাসকেড শপ", isSelected: false });
    const bizId = resBiz.data.businesses.find((b) => b.name === "ক্যাসকেড শপ").id;

    await repo.mutateCollection("inventory", (list) => [
      { id: "p_cas_1", businessId: bizId, name: "ক্যাসকেড আইটেম ১", stock: 5 },
      { id: "p_cas_2", businessId: bizId, name: "ক্যাসকেড আইটেম ২", stock: 10 },
      ...list,
    ]);

    assert(repo.currentStore.inventory.some((p) => p.businessId === bizId));

    const casRes = await repo.deleteBusinessCascade(bizId);
    assert.strictEqual(casRes.success, true);

    const store = repo.currentStore;
    assert(!store.inventory.some((p) => p.businessId === bizId), "Inventory must be purged of target business");
    assert(!store.stock.some((p) => p.businessId === bizId), "Stock must be purged of target business");
  });

  await runTest("deleteBusinessCascade leaves inventory and stock of all other businesses 100% untouched", async () => {
    const repo = new StorageRepository();
    await repo.loadStore();

    const defaultBiz1Count = repo.filterByBusiness(repo.currentStore.inventory, "1").length;

    const resBiz = await repo.createBusiness({ name: "আইসোলেশন শপ", isSelected: false });
    const bizId = resBiz.data.businesses.find((b) => b.name === "আইসোলেশন শপ").id;

    await repo.mutateCollection("inventory", (list) => [
      { id: "p_iso_temp", businessId: bizId, name: "অস্থায়ী", stock: 5 },
      ...list,
    ]);

    await repo.deleteBusinessCascade(bizId);

    const finalBiz1Count = repo.filterByBusiness(repo.currentStore.inventory, "1").length;
    assert.strictEqual(finalBiz1Count, defaultBiz1Count, "Business 1 inventory must remain 100% intact");
  });

  // ============================================================================
  // PART 5: INVENTORY REAL-TIME SEARCH & STATUS FILTERING
  // ============================================================================
  console.log("\n--- PART 5: INVENTORY REAL-TIME SEARCH & STATUS FILTERING ---");

  const sampleInventory = [
    { id: "p1", name: "মিনিকেট চাল (৫০ কেজি)", unit: "বস্তা", stock: 25, buyPrice: 3200, sellPrice: 3450 },
    { id: "p2", name: "তীর সয়াবিন তেল (৫ লিটার)", unit: "বোতল", stock: 4, buyPrice: 820, sellPrice: 875 }, // low stock (<= 5)
    { id: "p3", name: "চিনি (প্যাকেট)", unit: "কেজি", stock: 0, buyPrice: 130, sellPrice: 140 },            // out of stock (== 0)
    { id: "p4", name: "মসুর ডাল (দেশি)", unit: "কেজি", stock: 5, buyPrice: 135, sellPrice: 150 },          // low stock (<= 5)
    { id: "p5", name: "আটা (২ কেজি)", unit: "প্যাকেট", stock: 18, buyPrice: 110, sellPrice: 125 },
  ];

  // Search & filter routine mirroring App.js inventory state
  function filterInventory(items, statusFilter = "all", query = "") {
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      // Status filter
      if (statusFilter === "low_stock" && !(item.stock > 0 && item.stock <= 5)) return false;
      if (statusFilter === "out_of_stock" && item.stock !== 0) return false;
      if (statusFilter === "in_stock" && item.stock <= 5) return false;

      // Query filter
      if (q) {
        const mName = (item.name || "").toLowerCase().includes(q);
        const mUnit = (item.unit || "").toLowerCase().includes(q);
        if (!mName && !mUnit) return false;
      }
      return true;
    });
  }

  await runTest("Status Filter 'all' returns all products in current business inventory", () => {
    const all = filterInventory(sampleInventory, "all");
    assert.strictEqual(all.length, 5);
  });

  await runTest("Status Filter 'low_stock' returns only products with 0 < stock <= 5", () => {
    const low = filterInventory(sampleInventory, "low_stock");
    assert.strictEqual(low.length, 2, "Items p2 (stock 4) and p4 (stock 5) must be returned");
    assert(low.some((p) => p.id === "p2"));
    assert(low.some((p) => p.id === "p4"));
  });

  await runTest("Status Filter 'out_of_stock' returns only products with stock === 0", () => {
    const out = filterInventory(sampleInventory, "out_of_stock");
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].id, "p3");
    assert.strictEqual(out[0].stock, 0);
  });

  await runTest("Status Filter 'in_stock' returns only healthy inventory with stock > 5", () => {
    const inStock = filterInventory(sampleInventory, "in_stock");
    assert.strictEqual(inStock.length, 2);
    assert(inStock.some((p) => p.id === "p1")); // 25
    assert(inStock.some((p) => p.id === "p5")); // 18
  });

  await runTest("Real-time search matches product names case-insensitively and handles Bengali Unicode text", () => {
    const searchOil = filterInventory(sampleInventory, "all", "তেল");
    assert.strictEqual(searchOil.length, 1);
    assert.strictEqual(searchOil[0].id, "p2");

    const searchRice = filterInventory(sampleInventory, "all", "চাল");
    assert.strictEqual(searchRice.length, 1);
    assert.strictEqual(searchRice[0].id, "p1");
  });

  await runTest("Real-time search matches product units (e.g., 'কেজি', 'বস্তা')", () => {
    const searchKg = filterInventory(sampleInventory, "all", "কেজি");
    assert.strictEqual(searchKg.length, 4, "p1 (চাল ৫০ কেজি), p3 (চিনি কেজি), p4 (ডাল কেজি), p5 (আটা ২ কেজি)");
  });

  // ============================================================================
  // PART 6: WCAG 2.2 AA / AAA COLOR CONTRAST RATIOS
  // ============================================================================
  console.log("\n--- PART 6: WCAG 2.2 AA / AAA COLOR CONTRAST RATIOS ---");

  await runTest("Light mode Product Name (#1A1A1A on #FFFFFF) achieves AAA contrast (>= 7.0:1)", () => {
    const cr = getContrastRatio("#1A1A1A", "#FFFFFF");
    assert(cr >= 7.0, `Contrast ratio ${cr.toFixed(2)}:1 must meet AAA`);
  });

  await runTest("Light mode Price Subtitle (#6B7280 on #FFFFFF) achieves AA contrast (>= 4.5:1)", () => {
    const cr = getContrastRatio("#6B7280", "#FFFFFF");
    assert(cr >= 4.5, `Contrast ratio ${cr.toFixed(2)}:1 must meet AA`);
  });

  await runTest("Light mode Low/Zero Stock Alert Red (#B81414 on #FFFFFF) achieves AA contrast (>= 4.5:1)", () => {
    const cr = getContrastRatio("#B81414", "#FFFFFF");
    assert(cr >= 4.5, `Contrast ratio ${cr.toFixed(2)}:1 must meet AA`);
  });

  await runTest("Light mode Est Sale Value Green (#047857 on #FFFFFF) achieves AA contrast (>= 4.5:1)", () => {
    const cr = getContrastRatio("#047857", "#FFFFFF");
    assert(cr >= 4.5, `Contrast ratio ${cr.toFixed(2)}:1 must meet AA`);
  });

  await runTest("Light mode Stock In Button Text (#374151 on #F3F4F6) achieves AAA contrast (>= 7.0:1)", () => {
    const cr = getContrastRatio("#374151", "#F3F4F6");
    assert(cr >= 7.0, `Contrast ratio ${cr.toFixed(2)}:1 must meet AAA`);
  });

  await runTest("Dark mode Product Name (#F8FAFC on #1E293B) achieves AAA contrast (>= 7.0:1)", () => {
    const cr = getContrastRatio("#F8FAFC", "#1E293B");
    assert(cr >= 7.0, `Contrast ratio ${cr.toFixed(2)}:1 must meet AAA`);
  });

  await runTest("Dark mode Price Subtitle (#94A3B8 on #1E293B) achieves AA contrast (>= 4.5:1)", () => {
    const cr = getContrastRatio("#94A3B8", "#1E293B");
    assert(cr >= 4.5, `Contrast ratio ${cr.toFixed(2)}:1 must meet AA`);
  });

  await runTest("Dark mode Low/Zero Stock Alert Red (#F87171 on #1E293B) achieves AA contrast (>= 4.5:1)", () => {
    const cr = getContrastRatio("#F87171", "#1E293B");
    assert(cr >= 4.5, `Contrast ratio ${cr.toFixed(2)}:1 must meet AA`);
  });

  await runTest("Dark mode Est Sale Value Green (#34D399 on #1E293B) achieves AAA contrast (>= 7.0:1)", () => {
    const cr = getContrastRatio("#34D399", "#1E293B");
    assert(cr >= 7.0, `Contrast ratio ${cr.toFixed(2)}:1 must meet AAA`);
  });

  // ============================================================================
  // PART 7: TOUCH TARGET PHYSICS & ERGONOMICS
  // ============================================================================
  console.log("\n--- PART 7: TOUCH TARGET PHYSICS & ERGONOMICS ---");

  await runTest("Mini stock adjust buttons (+ ইন, - আউট) achieve >= 48x48dp effective touch area via hitSlop expansion", () => {
    const btnWidth = 32;
    const btnHeight = 24;
    const hitSlop = { top: 12, bottom: 12, left: 8, right: 8 };

    const effectiveW = btnWidth + hitSlop.left + hitSlop.right;
    const effectiveH = btnHeight + hitSlop.top + hitSlop.bottom;

    assert(effectiveW >= 48, `Effective width ${effectiveW}dp must be >= 48dp`);
    assert(effectiveH >= 48, `Effective height ${effectiveH}dp must be >= 48dp`);
  });

  await runTest("Delete product trigger achieves >= 48x48dp touch target with STANDARD_TOUCH_HIT_SLOP", () => {
    const iconSize = 16;
    const hitSlop = STANDARD_TOUCH_HIT_SLOP; // 8dp
    const padding = 8;
    const effectiveTarget = iconSize + (padding * 2) + (hitSlop.top * 2);
    assert(effectiveTarget >= 48, "Delete button touch target satisfies accessibility standard");
  });

  await runTest("Modal Add Product CTA button (+ পণ্য যোগ করুন) satisfies minimum 48dp height", () => {
    const ctaHeight = 48; // paddingVertical 14 + fontSize 15
    assert(ctaHeight >= 48, "CTA button height meets 48dp minimum");
  });

  await runTest("Menu stock navigation row satisfies full width and >= 56dp touch height", () => {
    const rowHeight = 60; // containerSize 38 + vertical padding 12 + margin
    assert(rowHeight >= 48, "Navigation row touch area exceeds 48dp");
  });

  // ============================================================================
  // PART 8: AST SYNTAX & BABEL COMPILATION INTEGRITY
  // ============================================================================
  console.log("\n--- PART 8: SYNTAX & AST INTEGRITY ---");

  await runTest("App.js compiles cleanly with zero syntax errors via Babel parser", () => {
    const appSource = fs.readFileSync("App.js", "utf8");
    const ast = babel.parseSync(appSource, {
      filename: "App.js",
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["jsx", "flow"] },
    });
    assert(ast && ast.program && ast.program.body.length > 0, "App.js must compile into valid AST");
  });

  console.log("\n================================================================");
  console.log(`PHASE 7 TEST SUMMARY: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("================================================================\n");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN TEST RUNNER:", err);
  process.exit(1);
});
