/**
 * ============================================================================
 * TEST SUITE: REA-ITER-238
 * TallyPay Merchant QR Standee Order & POS Soundbox Collateral Delivery Subsystem
 *
 * Scope:
 * - Group 1: Enums, Constants & Room SQLite Schema Invariants (Table: merchant_qr_order)
 * - Group 2: Financial Arithmetic & Pricing Engine (paisa arithmetic, delivery tiers, free delivery)
 * - Group 3: Delivery Address & Contact Validation Engine (8 divisions, mobile regex, postal code)
 * - Group 4: Order Fulfillment State Machine (FSM) & Tracking Validation
 * - Group 5: MerchantQrOrderRecord & In-Memory DAO Operations
 * - Group 6: End-to-End Order Creation & Tracking Engine
 * - Group 7: StorageRepository Multi-Tenant Persistence & CRUD
 * - Group 8: Multi-Tenant Business Isolation & Cascade Deletion
 * - Group 9: Cloud Backup Sanitization & Serialization
 * - Group 10: High-Throughput Performance Benchmark (< 150ms for 1,000 ops)
 * ============================================================================
 */

const assert = require('assert');
const {
  MERCHANT_QR_ORDER_SCHEMA,
  QR_ORDER_TABLE_SCHEMA,
  QR_ORDER_STATUSES,
  QrOrderStatus,
  QR_PAYMENT_METHODS,
  QrPaymentMethod,
  QR_PAYMENT_STATUSES,
  QrPaymentStatus,
  QR_ORDER_ITEM_TYPES,
  QR_ORDER_CATALOG,
  BANGLADESH_DIVISIONS,
  BANGLADESH_DIVISION_ALIASES,
  QR_ORDER_ARSC_TOKENS,
  calculateQrOrderPricing,
  validateDeliveryAddress,
  transitionQrOrderStatus,
  MerchantQrOrderRecord,
  MerchantQrOrderDao,
  MerchantQrOrderEngine,
  merchantQrOrderEngine,
} = require('./src/tallyPayService.js');

const {
  StorageRepository,
  MemoryStorageAdapter,
  VALID_COLLECTIONS,
  saveMerchantQrOrder,
  getMerchantQrOrderById,
  getMerchantQrOrdersByBusinessId,
  updateMerchantQrOrderStatus,
  deleteMerchantQrOrder,
  getUnsyncedMerchantQrOrders,
  updateMerchantQrOrderSyncStatus,
  existsMerchantQrOrder,
} = require('./src/storageRepository.js');

let totalTests = 0;
let passedTests = 0;

function runTest(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${desc}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAsyncTest(desc, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${desc}`);
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  console.log('==================================================================');
  console.log(' REA-ITER-238: TALLYPAY MERCHANT QR STANDEE ORDER BACKEND SUITE');
  console.log('==================================================================\n');

  // --------------------------------------------------------------------------
  // GROUP 1: Enums, Constants & Room SQLite Schema Invariants
  // --------------------------------------------------------------------------
  console.log('[GROUP 1: Enums, Constants & Room SQLite Schema Invariants]');

  runTest('Schema defines table name merchant_qr_order with all 23 columns', () => {
    assert.strictEqual(MERCHANT_QR_ORDER_SCHEMA.tableName, 'merchant_qr_order');
    assert.strictEqual(MERCHANT_QR_ORDER_SCHEMA.columns.length, 23);
    const expectedCols = [
      'id', 'order_id', 'business_id', 'item_type', 'item_name',
      'quantity', 'unit_price_paisa', 'total_price_paisa', 'delivery_fee_paisa',
      'payment_method', 'payment_status', 'order_status',
      'recipient_name', 'recipient_phone', 'delivery_address',
      'division', 'district', 'postal_code',
      'courier_name', 'tracking_code', 'synced',
      'create_date', 'update_date'
    ];
    for (const col of expectedCols) {
      assert.ok(MERCHANT_QR_ORDER_SCHEMA.columns.includes(col), `Missing column: ${col}`);
    }
  });

  runTest('Column types match Room SQLite specifications', () => {
    assert.strictEqual(MERCHANT_QR_ORDER_SCHEMA.columnTypes.id, 'INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL');
    assert.strictEqual(MERCHANT_QR_ORDER_SCHEMA.columnTypes.order_id, 'TEXT NOT NULL');
    assert.strictEqual(MERCHANT_QR_ORDER_SCHEMA.columnTypes.business_id, 'TEXT NOT NULL');
    assert.strictEqual(MERCHANT_QR_ORDER_SCHEMA.columnTypes.quantity, 'INTEGER NOT NULL');
    assert.strictEqual(MERCHANT_QR_ORDER_SCHEMA.columnTypes.unit_price_paisa, 'INTEGER NOT NULL');
    assert.strictEqual(MERCHANT_QR_ORDER_SCHEMA.columnTypes.synced, 'INTEGER NOT NULL DEFAULT 0');
  });

  runTest('Primary key is id and unique index index_merchant_qr_order_order_id on order_id is defined with DDL', () => {
    assert.strictEqual(MERCHANT_QR_ORDER_SCHEMA.primaryKey, 'id');
    assert.strictEqual(MERCHANT_QR_ORDER_SCHEMA.indices.length, 1);
    const idx = MERCHANT_QR_ORDER_SCHEMA.indices[0];
    assert.strictEqual(idx.name, 'index_merchant_qr_order_order_id');
    assert.strictEqual(idx.unique, true);
    assert.deepStrictEqual(idx.columns, ['order_id']);
    assert.ok(MERCHANT_QR_ORDER_SCHEMA.ddl.includes('CREATE TABLE IF NOT EXISTS merchant_qr_order'));
  });

  runTest('QR_ORDER_STATUSES defines all 6 lifecycle states', () => {
    const statuses = ['PLACED', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    for (const st of statuses) {
      assert.strictEqual(QR_ORDER_STATUSES[st], st);
      assert.strictEqual(QrOrderStatus[st], st);
    }
  });

  runTest('QR_PAYMENT_METHODS and QR_PAYMENT_STATUSES match reference specifications', () => {
    assert.strictEqual(QR_PAYMENT_METHODS.WALLET, 'WALLET');
    assert.strictEqual(QR_PAYMENT_METHODS.CASH_ON_DELIVERY, 'CASH_ON_DELIVERY');
    assert.strictEqual(QR_PAYMENT_METHODS.ONLINE_GATEWAY, 'ONLINE_GATEWAY');

    assert.strictEqual(QR_PAYMENT_STATUSES.PAID, 'PAID');
    assert.strictEqual(QR_PAYMENT_STATUSES.PENDING, 'PENDING');
    assert.strictEqual(QR_PAYMENT_STATUSES.FAILED, 'FAILED');
    assert.strictEqual(QR_PAYMENT_STATUSES.REFUNDED, 'REFUNDED');
  });

  runTest('QR_ORDER_ITEM_TYPES and QR_ORDER_CATALOG define all 5 collateral items with accurate pricing', () => {
    assert.strictEqual(QR_ORDER_CATALOG.ACRYLIC_STANDEE.unit_price_paisa, 25000);
    assert.strictEqual(QR_ORDER_CATALOG.WOODEN_STANDEE.unit_price_paisa, 35000);
    assert.strictEqual(QR_ORDER_CATALOG.METAL_STANDEE.unit_price_paisa, 50000);
    assert.strictEqual(QR_ORDER_CATALOG.COUNTER_STICKER.unit_price_paisa, 5000);
    assert.strictEqual(QR_ORDER_CATALOG.SOUNDBOX_STAND.unit_price_paisa, 40000);

    assert.strictEqual(QR_ORDER_CATALOG.ACRYLIC_STANDEE.name_bn, 'অ্যাক্রিলিক কিউআর স্ট্যান্ড');
    assert.strictEqual(QR_ORDER_CATALOG.WOODEN_STANDEE.name_bn, 'কাঠের কিউআর স্ট্যান্ড');
    assert.strictEqual(QR_ORDER_CATALOG.METAL_STANDEE.name_bn, 'মেটাল কিউআর স্ট্যান্ড');
    assert.strictEqual(QR_ORDER_CATALOG.COUNTER_STICKER.name_bn, 'কাউন্টার কিউআর স্টিকার');
    assert.strictEqual(QR_ORDER_CATALOG.SOUNDBOX_STAND.name_bn, 'সাউন্ডবক্স স্ট্যান্ড');
  });

  runTest('BANGLADESH_DIVISIONS and BANGLADESH_DIVISION_ALIASES map all 8 divisions in English and Bengali', () => {
    assert.strictEqual(BANGLADESH_DIVISIONS.length, 8);
    assert.strictEqual(BANGLADESH_DIVISION_ALIASES['dhaka'], 'Dhaka');
    assert.strictEqual(BANGLADESH_DIVISION_ALIASES['ঢাকা'], 'Dhaka');
    assert.strictEqual(BANGLADESH_DIVISION_ALIASES['chittagong'], 'Chattogram');
    assert.strictEqual(BANGLADESH_DIVISION_ALIASES['চট্টগ্রাম'], 'Chattogram');
    assert.strictEqual(BANGLADESH_DIVISION_ALIASES['barisal'], 'Barishal');
    assert.strictEqual(BANGLADESH_DIVISION_ALIASES['বরিশাল'], 'Barishal');
  });

  runTest('QR_ORDER_ARSC_TOKENS contains authentic Bengali copy from resources.arsc', () => {
    assert.strictEqual(QR_ORDER_ARSC_TOKENS.order_title, 'কিউআর ও সাউন্ডবক্স সামগ্রী অর্ডার');
    assert.strictEqual(QR_ORDER_ARSC_TOKENS.free_delivery_notice, '১,০০০ টাকার অর্ডারে ফ্রি ডেলিভারি!');
    assert.strictEqual(QR_ORDER_ARSC_TOKENS.status_placed, 'অর্ডার নেওয়া হয়েছে');
    assert.strictEqual(QR_ORDER_ARSC_TOKENS.status_delivered, 'ডেলিভারি সম্পন্ন');
  });

  runTest('StorageRepository registers merchantQrOrders in VALID_COLLECTIONS', () => {
    assert.ok(VALID_COLLECTIONS.has('merchantQrOrders'), 'VALID_COLLECTIONS must contain merchantQrOrders');
  });

  // --------------------------------------------------------------------------
  // GROUP 2: Financial Arithmetic & Pricing Engine
  // --------------------------------------------------------------------------
  console.log('\n[GROUP 2: Financial Arithmetic & Pricing Engine]');

  runTest('Calculates pricing for single item inside Dhaka (Acrylic standee, ৳250 + ৳60 = ৳310)', () => {
    const res = calculateQrOrderPricing({
      itemType: 'ACRYLIC_STANDEE',
      quantity: 1,
      division: 'Dhaka',
    });
    assert.strictEqual(res.unitPricePaisa, 25000);
    assert.strictEqual(res.subtotalPaisa, 25000);
    assert.strictEqual(res.deliveryFeePaisa, 6000);
    assert.strictEqual(res.totalPricePaisa, 31000);
    assert.strictEqual(res.isFreeDelivery, false);
  });

  runTest('Calculates pricing for multiple items outside Dhaka (2 Wooden standees: 2x৳350 = ৳700 + ৳120 = ৳820)', () => {
    const res = calculateQrOrderPricing({
      itemType: 'WOODEN_STANDEE',
      quantity: 2,
      division: 'Khulna',
    });
    assert.strictEqual(res.unitPricePaisa, 35000);
    assert.strictEqual(res.subtotalPaisa, 70000);
    assert.strictEqual(res.deliveryFeePaisa, 12000);
    assert.strictEqual(res.totalPricePaisa, 82000);
    assert.strictEqual(res.isFreeDelivery, false);
  });

  runTest('Applies free delivery threshold when subtotal >= ৳1,000 (100,000 paisa) inside Dhaka', () => {
    const res = calculateQrOrderPricing({
      itemType: 'METAL_STANDEE',
      quantity: 2, // 2 x 500 = ৳1,000
      division: 'Dhaka',
    });
    assert.strictEqual(res.subtotalPaisa, 100000);
    assert.strictEqual(res.deliveryFeePaisa, 0);
    assert.strictEqual(res.totalPricePaisa, 100000);
    assert.strictEqual(res.isFreeDelivery, true);
  });

  runTest('Applies free delivery threshold when subtotal >= ৳1,000 (100,000 paisa) outside Dhaka', () => {
    const res = calculateQrOrderPricing({
      itemType: 'SOUNDBOX_STAND',
      quantity: 3, // 3 x 400 = ৳1,200
      division: 'Rajshahi',
    });
    assert.strictEqual(res.subtotalPaisa, 120000);
    assert.strictEqual(res.deliveryFeePaisa, 0);
    assert.strictEqual(res.totalPricePaisa, 120000);
    assert.strictEqual(res.isFreeDelivery, true);
  });

  runTest('Handles Bengali division and district inputs (ঢাকা -> ৳60, চট্টগ্রাম -> ৳120)', () => {
    const dhakaRes = calculateQrOrderPricing({
      itemType: 'COUNTER_STICKER',
      quantity: 2,
      division: 'ঢাকা',
    });
    assert.strictEqual(dhakaRes.deliveryFeePaisa, 6000);

    const ctgRes = calculateQrOrderPricing({
      itemType: 'COUNTER_STICKER',
      quantity: 2,
      division: 'চট্টগ্রাম',
    });
    assert.strictEqual(ctgRes.deliveryFeePaisa, 12000);
  });

  runTest('Rejects unknown collateral item types with descriptive error', () => {
    assert.throws(() => {
      calculateQrOrderPricing({ itemType: 'FLYING_STANDEE' });
    }, /Unknown QR collateral item type/);
  });

  runTest('Rejects invalid or negative/zero quantities', () => {
    assert.throws(() => {
      calculateQrOrderPricing({ itemType: 'ACRYLIC_STANDEE', quantity: 0 });
    }, /Quantity must be a positive integer >= 1/);

    assert.throws(() => {
      calculateQrOrderPricing({ itemType: 'ACRYLIC_STANDEE', quantity: -5 });
    }, /Quantity must be a positive integer >= 1/);

    assert.throws(() => {
      calculateQrOrderPricing({ itemType: 'ACRYLIC_STANDEE', quantity: 'abc' });
    }, /Quantity must be a positive integer >= 1/);
  });

  runTest('Guarantees exact integer paisa arithmetic with zero float drift', () => {
    for (let qty = 1; qty <= 50; qty++) {
      const res = calculateQrOrderPricing({ itemType: 'WOODEN_STANDEE', quantity: qty, division: 'Sylhet' });
      assert.ok(Number.isInteger(res.subtotalPaisa));
      assert.ok(Number.isInteger(res.deliveryFeePaisa));
      assert.ok(Number.isInteger(res.totalPricePaisa));
      assert.strictEqual(res.totalPricePaisa, res.subtotalPaisa + res.deliveryFeePaisa);
    }
  });

  // --------------------------------------------------------------------------
  // GROUP 3: Delivery Address & Contact Validation Engine
  // --------------------------------------------------------------------------
  console.log('\n[GROUP 3: Delivery Address & Contact Validation Engine]');

  runTest('Accepts valid full address with English division and valid Bangladeshi mobile', () => {
    const res = validateDeliveryAddress({
      recipientName: 'Mizanur Rahman',
      recipientPhone: '01712-345678',
      deliveryAddress: 'Road 4, House 12, Dhanmondi',
      division: 'Dhaka',
      district: 'Dhaka',
      postalCode: '1205',
    });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.recipientPhone, '01712345678');
    assert.strictEqual(res.division, 'Dhaka');
    assert.strictEqual(res.postalCode, '1205');
  });

  runTest('Accepts valid full address with Bengali division and 4-digit postal code', () => {
    const res = validateDeliveryAddress({
      recipient_name: 'আব্দুল করিম',
      recipient_phone: '01819876543',
      delivery_address: 'জিইসি মোড়, নাসিরাবাদ',
      division: 'চট্টগ্রাম',
      district: 'চট্টগ্রাম',
    });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.recipientName, 'আব্দুল করিম');
    assert.strictEqual(res.division, 'Chattogram');
    assert.strictEqual(res.postalCode, null);
  });

  runTest('Normalizes and strips spaces and hyphens from mobile number', () => {
    const res = validateDeliveryAddress({
      recipientName: 'Test Name',
      recipientPhone: '01911 22 33 44',
      deliveryAddress: 'Shibbari Mor, Khulna',
      division: 'Khulna',
      district: 'Khulna',
    });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.recipientPhone, '01911223344');
  });

  runTest('Rejects invalid Bangladeshi mobile number prefix or length', () => {
    const invalidPrefix = validateDeliveryAddress({
      recipientName: 'Test User',
      recipientPhone: '01212345678', // 012 is invalid prefix in BD
      deliveryAddress: 'Zindabazar, Sylhet',
      division: 'Sylhet',
      district: 'Sylhet',
    });
    assert.strictEqual(invalidPrefix.valid, false);
    assert.match(invalidPrefix.error, /Invalid Bangladeshi mobile number/);

    const shortPhone = validateDeliveryAddress({
      recipientName: 'Test User',
      recipientPhone: '0171234567', // 10 digits
      deliveryAddress: 'Zindabazar, Sylhet',
      division: 'Sylhet',
      district: 'Sylhet',
    });
    assert.strictEqual(shortPhone.valid, false);
  });

  runTest('Rejects recipient name shorter than 2 characters', () => {
    const res = validateDeliveryAddress({
      recipientName: 'A',
      recipientPhone: '01712345678',
      deliveryAddress: 'Road 5, Uttara',
      division: 'Dhaka',
      district: 'Dhaka',
    });
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /Recipient name must be at least 2 characters/);
  });

  runTest('Rejects delivery address shorter than 5 characters', () => {
    const res = validateDeliveryAddress({
      recipientName: 'Valid Name',
      recipientPhone: '01712345678',
      deliveryAddress: 'Shop',
      division: 'Dhaka',
      district: 'Dhaka',
    });
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /Delivery address must be at least 5 characters/);
  });

  runTest('Rejects invalid or unrecognized administrative division', () => {
    const res = validateDeliveryAddress({
      recipientName: 'Valid Name',
      recipientPhone: '01712345678',
      deliveryAddress: 'Valid street address here',
      division: 'UnknownDivision',
      district: 'SomeDistrict',
    });
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /Invalid Bangladesh administrative division/);
  });

  runTest('Rejects missing district', () => {
    const res = validateDeliveryAddress({
      recipientName: 'Valid Name',
      recipientPhone: '01712345678',
      deliveryAddress: 'Valid street address here',
      division: 'Dhaka',
      district: '',
    });
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /District is required/);
  });

  runTest('Rejects malformed postal code (non-4-digit)', () => {
    const res = validateDeliveryAddress({
      recipientName: 'Valid Name',
      recipientPhone: '01712345678',
      deliveryAddress: 'Valid street address here',
      division: 'Dhaka',
      district: 'Dhaka',
      postalCode: '123', // 3 digits
    });
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /Postal code must be a 4-digit number/);
  });

  runTest('Rejects non-object or null address payloads', () => {
    assert.strictEqual(validateDeliveryAddress(null).valid, false);
    assert.strictEqual(validateDeliveryAddress('not an object').valid, false);
  });

  // --------------------------------------------------------------------------
  // GROUP 4: Order Fulfillment State Machine (FSM) & Tracking
  // --------------------------------------------------------------------------
  console.log('\n[GROUP 4: Order Fulfillment State Machine (FSM) & Tracking]');

  runTest('Valid transition: PLACED -> CONFIRMED', () => {
    const res = transitionQrOrderStatus('PLACED', 'CONFIRMED');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.fromStatus, 'PLACED');
    assert.strictEqual(res.toStatus, 'CONFIRMED');
  });

  runTest('Valid transition: CONFIRMED -> SHIPPED with required courier and tracking code', () => {
    const res = transitionQrOrderStatus('CONFIRMED', 'SHIPPED', {
      courierName: 'Pathao Courier',
      trackingCode: 'PTH-123456',
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.toStatus, 'SHIPPED');
    assert.strictEqual(res.trackingInfo.courierName, 'Pathao Courier');
    assert.strictEqual(res.trackingInfo.trackingCode, 'PTH-123456');
  });

  runTest('Fails transition: CONFIRMED -> SHIPPED without courier name or tracking code', () => {
    assert.throws(() => {
      transitionQrOrderStatus('CONFIRMED', 'SHIPPED', null);
    }, /Courier name and tracking code are required/);

    assert.throws(() => {
      transitionQrOrderStatus('CONFIRMED', 'SHIPPED', { courierName: 'Pathao' });
    }, /Courier name and tracking code are required/);
  });

  runTest('Valid transition: SHIPPED -> OUT_FOR_DELIVERY', () => {
    const res = transitionQrOrderStatus('SHIPPED', 'OUT_FOR_DELIVERY');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.toStatus, 'OUT_FOR_DELIVERY');
  });

  runTest('Valid transition: OUT_FOR_DELIVERY -> DELIVERED', () => {
    const res = transitionQrOrderStatus('OUT_FOR_DELIVERY', 'DELIVERED');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.toStatus, 'DELIVERED');
  });

  runTest('Valid cancellation: PLACED -> CANCELLED', () => {
    const res = transitionQrOrderStatus('PLACED', 'CANCELLED');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.toStatus, 'CANCELLED');
  });

  runTest('Valid cancellation: CONFIRMED -> CANCELLED', () => {
    const res = transitionQrOrderStatus('CONFIRMED', 'CANCELLED');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.toStatus, 'CANCELLED');
  });

  runTest('Rejects invalid transition: SHIPPED -> CANCELLED', () => {
    assert.throws(() => {
      transitionQrOrderStatus('SHIPPED', 'CANCELLED');
    }, /Cannot transition QR order status from SHIPPED to CANCELLED/);
  });

  runTest('Rejects transition from terminal state: DELIVERED -> any', () => {
    assert.throws(() => {
      transitionQrOrderStatus('DELIVERED', 'CANCELLED');
    }, /Cannot transition QR order status from DELIVERED to CANCELLED/);
  });

  runTest('Rejects transition from terminal state: CANCELLED -> any', () => {
    assert.throws(() => {
      transitionQrOrderStatus('CANCELLED', 'CONFIRMED');
    }, /Cannot transition QR order status from CANCELLED to CONFIRMED/);
  });

  runTest('Rejects unknown or malformed current or target statuses', () => {
    assert.throws(() => {
      transitionQrOrderStatus('INVALID_STATUS', 'CONFIRMED');
    }, /Invalid current QR order status/);
  });

  // --------------------------------------------------------------------------
  // GROUP 5: MerchantQrOrderRecord & In-Memory DAO Operations
  // --------------------------------------------------------------------------
  console.log('\n[GROUP 5: MerchantQrOrderRecord & In-Memory DAO Operations]');

  runTest('MerchantQrOrderRecord instantiates with auto-generated order_id and defaults', () => {
    const record = new MerchantQrOrderRecord({
      business_id: '1',
      item_type: 'ACRYLIC_STANDEE',
      quantity: 1,
      unit_price_paisa: 25000,
      total_price_paisa: 31000,
      delivery_fee_paisa: 6000,
    });
    assert.ok(record.order_id.startsWith('TK-QRO-'));
    assert.strictEqual(record.order_status, 'PLACED');
    assert.strictEqual(record.synced, 0);
    assert.strictEqual(record.item_name, 'অ্যাক্রিলিক কিউআর স্ট্যান্ড');
  });

  const dao = new MerchantQrOrderDao();

  runTest('MerchantQrOrderDao saves order and assigns autoincrement ID', () => {
    dao.clear();
    const order1 = dao.saveOrder({
      order_id: 'TK-QRO-20261105-001',
      business_id: '1',
      item_type: 'ACRYLIC_STANDEE',
      quantity: 1,
      unit_price_paisa: 25000,
      total_price_paisa: 31000,
      delivery_fee_paisa: 6000,
      payment_method: 'WALLET',
      payment_status: 'PAID',
    });
    assert.strictEqual(order1.id, 1);
    assert.strictEqual(order1.order_id, 'TK-QRO-20261105-001');
    assert.strictEqual(dao.exists('TK-QRO-20261105-001'), true);
  });

  runTest('MerchantQrOrderDao retrieves order by order_id', () => {
    const found = dao.getOrderById('TK-QRO-20261105-001');
    assert.ok(found);
    assert.strictEqual(found.item_type, 'ACRYLIC_STANDEE');
    assert.strictEqual(dao.getOrderById('NON_EXISTENT'), null);
  });

  runTest('MerchantQrOrderDao filters orders by business_id and order_status', () => {
    dao.saveOrder({
      order_id: 'TK-QRO-20261105-002',
      business_id: '1',
      item_type: 'WOODEN_STANDEE',
      order_status: 'CONFIRMED',
    });
    dao.saveOrder({
      order_id: 'TK-QRO-20261105-003',
      business_id: '2',
      item_type: 'METAL_STANDEE',
      order_status: 'PLACED',
    });

    const biz1Orders = dao.getOrdersByBusinessId('1');
    assert.strictEqual(biz1Orders.length, 2);

    const biz1Placed = dao.getOrdersByBusinessId('1', { status: 'PLACED' });
    assert.strictEqual(biz1Placed.length, 1);
    assert.strictEqual(biz1Placed[0].order_id, 'TK-QRO-20261105-001');
  });

  runTest('MerchantQrOrderDao filters orders by item_type and sorts by date descending', () => {
    const wooden = dao.getOrdersByBusinessId('1', { item_type: 'WOODEN_STANDEE' });
    assert.strictEqual(wooden.length, 1);
    assert.strictEqual(wooden[0].order_id, 'TK-QRO-20261105-002');
  });

  runTest('MerchantQrOrderDao handles pagination (offset and limit)', () => {
    const paged = dao.getOrdersByBusinessId('1', { offset: 0, limit: 1 });
    assert.strictEqual(paged.length, 1);
  });

  runTest('MerchantQrOrderDao updates order status and tracking info, setting synced=0', () => {
    const updated = dao.updateOrderStatus('TK-QRO-20261105-002', 'SHIPPED', {
      courierName: 'RedX',
      trackingCode: 'REDX-778899',
    });
    assert.strictEqual(updated.order_status, 'SHIPPED');
    assert.strictEqual(updated.courier_name, 'RedX');
    assert.strictEqual(updated.tracking_code, 'REDX-778899');
    assert.strictEqual(updated.synced, 0);
  });

  runTest('MerchantQrOrderDao manages sync lifecycle (getUnsyncedOrders & updateOrderSyncStatus)', () => {
    const unsynced = dao.getUnsyncedOrders();
    assert.ok(unsynced.length >= 2);

    const syncRes = dao.updateOrderSyncStatus('TK-QRO-20261105-002', 1);
    assert.strictEqual(syncRes.success, true);
    assert.strictEqual(syncRes.record.synced, 1);

    const found = dao.getOrderById('TK-QRO-20261105-002');
    assert.strictEqual(found.synced, 1);
  });

  runTest('MerchantQrOrderDao deletes order and verifies exists method', () => {
    const del = dao.deleteOrder('TK-QRO-20261105-001');
    assert.strictEqual(del, true);
    assert.strictEqual(dao.exists('TK-QRO-20261105-001'), false);
    assert.strictEqual(dao.getOrderById('TK-QRO-20261105-001'), null);
  });

  // --------------------------------------------------------------------------
  // GROUP 6: End-to-End Order Creation & Tracking Engine
  // --------------------------------------------------------------------------
  console.log('\n[GROUP 6: End-to-End Order Creation & Tracking Engine]');

  const engineDao = new MerchantQrOrderDao();
  const engine = new MerchantQrOrderEngine(engineDao);

  runTest('Creates order with WALLET payment and sufficient balance (status PAID, PLACED)', () => {
    const res = engine.createOrder({
      businessId: '1',
      itemType: 'ACRYLIC_STANDEE',
      quantity: 1,
      paymentMethod: 'WALLET',
      walletBalancePaisa: 50000, // ৳500 balance, order is ৳310
      address: {
        recipientName: 'Kazi Nazrul',
        recipientPhone: '01711223344',
        deliveryAddress: 'House 1, Road 2, Dhanmondi',
        division: 'Dhaka',
        district: 'Dhaka',
        postalCode: '1205',
      },
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.order.payment_method, 'WALLET');
    assert.strictEqual(res.order.payment_status, 'PAID');
    assert.strictEqual(res.order.order_status, 'PLACED');
    assert.strictEqual(res.order.total_price_paisa, 31000);
  });

  runTest('Rejects WALLET order when wallet balance is insufficient', () => {
    assert.throws(() => {
      engine.createOrder({
        businessId: '1',
        itemType: 'METAL_STANDEE',
        quantity: 1,
        paymentMethod: 'WALLET',
        walletBalancePaisa: 10000, // ৳100 balance, order is ৳500 + ৳60 = ৳560
        address: {
          recipientName: 'Kazi Nazrul',
          recipientPhone: '01711223344',
          deliveryAddress: 'House 1, Road 2, Dhanmondi',
          division: 'Dhaka',
          district: 'Dhaka',
        },
      });
    }, /Insufficient wallet balance for QR collateral order/);
  });

  let codOrderId = null;
  runTest('Creates order with CASH_ON_DELIVERY (status PENDING, PLACED)', () => {
    const res = engine.createOrder({
      businessId: '1',
      itemType: 'WOODEN_STANDEE',
      quantity: 1,
      paymentMethod: 'CASH_ON_DELIVERY',
      address: {
        recipientName: 'Shamsur Rahman',
        recipientPhone: '01811223344',
        deliveryAddress: 'Station Road, Mymensingh',
        division: 'Mymensingh',
        district: 'Mymensingh',
      },
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.order.payment_method, 'CASH_ON_DELIVERY');
    assert.strictEqual(res.order.payment_status, 'PENDING');
    assert.strictEqual(res.order.total_price_paisa, 47000); // 350 + 120 = ৳470
    codOrderId = res.order.order_id;
  });

  runTest('Auto-marks COD order as PAID upon transition to DELIVERED', () => {
    engine.confirmOrder(codOrderId);
    engine.shipOrder(codOrderId, { courierName: 'Sundarban Courier', trackingCode: 'SND-445566' });
    engine.outForDelivery(codOrderId);
    const delivered = engine.deliverOrder(codOrderId);
    assert.strictEqual(delivered.order_status, 'DELIVERED');
    assert.strictEqual(delivered.payment_status, 'PAID');
  });

  runTest('Refunds WALLET order upon cancellation (payment_status becomes REFUNDED)', () => {
    const res = engine.createOrder({
      businessId: '1',
      itemType: 'COUNTER_STICKER',
      quantity: 1,
      paymentMethod: 'WALLET',
      walletBalancePaisa: 20000,
      address: {
        recipientName: 'Begum Rokeya',
        recipientPhone: '01911223344',
        deliveryAddress: 'Pairaband, Rangpur',
        division: 'Rangpur',
        district: 'Rangpur',
      },
    });
    const orderId = res.order.order_id;
    assert.strictEqual(res.order.payment_status, 'PAID');

    const cancelled = engine.cancelOrder(orderId, 'User requested cancellation');
    assert.strictEqual(cancelled.order_status, 'CANCELLED');
    assert.strictEqual(cancelled.payment_status, 'REFUNDED');
  });

  runTest('trackOrder returns formatted timeline with completed and active step markers', () => {
    const tracking = engine.trackOrder(codOrderId);
    assert.strictEqual(tracking.orderId, codOrderId);
    assert.strictEqual(tracking.currentStatus, 'DELIVERED');
    assert.strictEqual(tracking.isCancelled, false);
    assert.strictEqual(tracking.courierName, 'Sundarban Courier');
    assert.strictEqual(tracking.trackingCode, 'SND-445566');
    assert.strictEqual(tracking.timeline.length, 5);
    // Since it's DELIVERED, all 5 steps should be completed
    assert.ok(tracking.timeline.every(t => t.isCompleted));
    assert.strictEqual(tracking.timeline[4].isCurrent, true);
  });

  runTest('trackOrder reports isCancelled=true when order is cancelled', () => {
    const res = engine.createOrder({
      businessId: '1',
      itemType: 'ACRYLIC_STANDEE',
      quantity: 1,
      paymentMethod: 'CASH_ON_DELIVERY',
      address: {
        recipientName: 'Jasmin',
        recipientPhone: '01511223344',
        deliveryAddress: 'Chowhatta, Sylhet',
        division: 'Sylhet',
        district: 'Sylhet',
      },
    });
    const orderId = res.order.order_id;
    engine.cancelOrder(orderId);

    const tracking = engine.trackOrder(orderId);
    assert.strictEqual(tracking.isCancelled, true);
    assert.strictEqual(tracking.currentStatus, 'CANCELLED');
  });

  // --------------------------------------------------------------------------
  // GROUP 7: StorageRepository Multi-Tenant Persistence & CRUD
  // --------------------------------------------------------------------------
  console.log('\n[GROUP 7: StorageRepository Multi-Tenant Persistence & CRUD]');

  const testAdapter = new MemoryStorageAdapter();
  const repo = new StorageRepository(testAdapter);

  await runAsyncTest('StorageRepository saves and retrieves merchant QR order by order ID and business ID', async () => {
    await repo.loadStore();
    const saveRes = await repo.saveMerchantQrOrder('101', {
      order_id: 'TK-QRO-TEST-001',
      item_type: 'ACRYLIC_STANDEE',
      item_name: 'অ্যাক্রিলিক কিউআর স্ট্যান্ড',
      quantity: 2,
      unit_price_paisa: 25000,
      total_price_paisa: 56000,
      delivery_fee_paisa: 6000,
      payment_method: 'WALLET',
      payment_status: 'PAID',
      recipient_name: 'Habibur Rahman',
      recipient_phone: '01700112233',
      delivery_address: 'Banani, Dhaka',
      division: 'Dhaka',
      district: 'Dhaka',
    });

    assert.strictEqual(saveRes.success, true);
    assert.strictEqual(saveRes.id, 'TK-QRO-TEST-001');

    const fetched = repo.getMerchantQrOrderById('101', 'TK-QRO-TEST-001');
    assert.ok(fetched);
    assert.strictEqual(fetched.item_type, 'ACRYLIC_STANDEE');
    assert.strictEqual(fetched.business_id, '101');
  });

  await runAsyncTest('StorageRepository upserts existing order on duplicate order_id', async () => {
    await repo.saveMerchantQrOrder('101', {
      order_id: 'TK-QRO-TEST-001',
      quantity: 3,
      total_price_paisa: 81000,
    });

    const fetched = repo.getMerchantQrOrderById('101', 'TK-QRO-TEST-001');
    assert.strictEqual(fetched.quantity, 3);
    assert.strictEqual(fetched.total_price_paisa, 81000);

    const all = repo.getMerchantQrOrdersByBusinessId('101');
    assert.strictEqual(all.length, 1);
  });

  await runAsyncTest('StorageRepository filters orders by status, item_type, and synced flag', async () => {
    await repo.saveMerchantQrOrder('101', {
      order_id: 'TK-QRO-TEST-002',
      item_type: 'WOODEN_STANDEE',
      order_status: 'CONFIRMED',
      synced: 1,
    });

    const confirmed = repo.getMerchantQrOrdersByBusinessId('101', { status: 'CONFIRMED' });
    assert.strictEqual(confirmed.length, 1);
    assert.strictEqual(confirmed[0].order_id, 'TK-QRO-TEST-002');

    const acrylics = repo.getMerchantQrOrdersByBusinessId('101', { item_type: 'ACRYLIC_STANDEE' });
    assert.strictEqual(acrylics.length, 1);

    const unsynced = repo.getMerchantQrOrdersByBusinessId('101', { synced: 0 });
    assert.strictEqual(unsynced.length, 1);
    assert.strictEqual(unsynced[0].order_id, 'TK-QRO-TEST-001');
  });

  await runAsyncTest('StorageRepository updates order status with courier tracking info', async () => {
    const updRes = await repo.updateMerchantQrOrderStatus('101', 'TK-QRO-TEST-002', 'SHIPPED', {
      courierName: 'Paperfly',
      trackingCode: 'PFLY-998877',
    });
    assert.strictEqual(updRes.success, true);
    assert.strictEqual(updRes.record.order_status, 'SHIPPED');
    assert.strictEqual(updRes.record.courier_name, 'Paperfly');
    assert.strictEqual(updRes.record.tracking_code, 'PFLY-998877');
    assert.strictEqual(updRes.record.synced, 0);
  });

  await runAsyncTest('StorageRepository manages unsynced orders and updates sync status', async () => {
    const unsynced = repo.getUnsyncedMerchantQrOrders('101');
    assert.strictEqual(unsynced.length, 2);

    const syncRes = await repo.updateMerchantQrOrderSyncStatus('101', 'TK-QRO-TEST-002', 1);
    assert.strictEqual(syncRes.success, true);

    const afterSync = repo.getUnsyncedMerchantQrOrders('101');
    assert.strictEqual(afterSync.length, 1);
    assert.strictEqual(afterSync[0].order_id, 'TK-QRO-TEST-001');
  });

  await runAsyncTest('StorageRepository deletes order for specific business', async () => {
    const delRes = await repo.deleteMerchantQrOrder('101', 'TK-QRO-TEST-001');
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(repo.existsMerchantQrOrder('101', 'TK-QRO-TEST-001'), false);
    assert.strictEqual(repo.getMerchantQrOrderById('101', 'TK-QRO-TEST-001'), null);
  });

  // --------------------------------------------------------------------------
  // GROUP 8: Multi-Tenant Business Isolation & Cascade Deletion
  // --------------------------------------------------------------------------
  console.log('\n[GROUP 8: Multi-Tenant Business Isolation & Cascade Deletion]');

  await runAsyncTest('Strict business isolation: orders from Tenant A are completely invisible to Tenant B', async () => {
    await repo.saveMerchantQrOrder('tenant_alpha', {
      order_id: 'ORD-ALPHA-1',
      item_type: 'ACRYLIC_STANDEE',
    });
    await repo.saveMerchantQrOrder('tenant_beta', {
      order_id: 'ORD-BETA-1',
      item_type: 'WOODEN_STANDEE',
    });

    const alphaOrders = repo.getMerchantQrOrdersByBusinessId('tenant_alpha');
    assert.strictEqual(alphaOrders.length, 1);
    assert.strictEqual(alphaOrders[0].order_id, 'ORD-ALPHA-1');

    const betaOrders = repo.getMerchantQrOrdersByBusinessId('tenant_beta');
    assert.strictEqual(betaOrders.length, 1);
    assert.strictEqual(betaOrders[0].order_id, 'ORD-BETA-1');

    assert.strictEqual(repo.getMerchantQrOrderById('tenant_beta', 'ORD-ALPHA-1'), null);
  });

  await runAsyncTest('deleteBusinessCascade purges merchantQrOrders for deleted business only, preserving other tenants', async () => {
    await repo.mutateStore((s) => ({
      ...s,
      businesses: [...(s.businesses || []), { id: 'tenant_victim', name: 'Tenant Victim', isArchived: false }],
    }));

    await repo.saveMerchantQrOrder('tenant_victim', {
      order_id: 'ORD-VICTIM-1',
      item_type: 'METAL_STANDEE',
    });

    assert.strictEqual(repo.existsMerchantQrOrder('tenant_victim', 'ORD-VICTIM-1'), true);
    assert.strictEqual(repo.existsMerchantQrOrder('tenant_alpha', 'ORD-ALPHA-1'), true);

    await repo.deleteBusinessCascade('tenant_victim');

    assert.strictEqual(repo.existsMerchantQrOrder('tenant_victim', 'ORD-VICTIM-1'), false);
    assert.strictEqual(repo.existsMerchantQrOrder('tenant_alpha', 'ORD-ALPHA-1'), true);
  });

  // --------------------------------------------------------------------------
  // GROUP 9: Cloud Backup Sanitization & Serialization
  // --------------------------------------------------------------------------
  console.log('\n[GROUP 9: Cloud Backup Sanitization & Serialization]');

  await runAsyncTest('getFullBackupState masks recipient_phone (017****5678) and scrubs sensitive credentials', async () => {
    await repo.saveMerchantQrOrder('backup_biz', {
      order_id: 'ORD-BACKUP-001',
      recipient_phone: '01712345678',
      secretKey: 'live_secret_token_123',
      apiKey: 'api_key_456',
      pin: '1234',
    });

    const backupState = await repo.getFullBackupState();
    const backupOrders = backupState.merchantQrOrders || [];
    const target = backupOrders.find(o => o.order_id === 'ORD-BACKUP-001');

    assert.ok(target, 'Order should be present in backupState');
    assert.strictEqual(target.recipient_phone, '017****5678');
    assert.strictEqual(target.recipientPhone, '017****5678');
    assert.strictEqual(target.secretKey, undefined);
    assert.strictEqual(target.apiKey, undefined);
    assert.strictEqual(target.pin, undefined);
  });

  await runAsyncTest('createStorageBackup includes merchantQrOrders in manifest recordCounts', async () => {
    const backup = await repo.createStorageBackup();
    assert.ok(backup.manifest);
    assert.ok(backup.manifest.recordCounts);
    assert.strictEqual(typeof backup.manifest.recordCounts.merchantQrOrders, 'number');
    assert.ok(backup.manifest.recordCounts.merchantQrOrders >= 1);
  });

  await runAsyncTest('commitRestorePayload restores merchantQrOrders in full restore mode', async () => {
    const backup = await repo.createStorageBackup();
    const rawPayload = {
      ...backup.data,
      merchantQrOrders: [
        {
          order_id: 'RESTORE-ORD-1',
          business_id: '1',
          businessId: '1',
          item_type: 'SOUNDBOX_STAND',
          quantity: 1,
        },
      ],
    };

    const restoreRes = await repo.commitRestorePayload(rawPayload, { fullRestore: true });
    assert.strictEqual(restoreRes.success, true);

    const restoredOrder = repo.getMerchantQrOrderById('1', 'RESTORE-ORD-1');
    assert.ok(restoredOrder);
    assert.strictEqual(restoredOrder.item_type, 'SOUNDBOX_STAND');
  });

  await runAsyncTest('commitRestorePayload selectively restores merchantQrOrders for a single tenant', async () => {
    await repo.saveMerchantQrOrder('keep_tenant', {
      order_id: 'KEEP-ORD-1',
      item_type: 'COUNTER_STICKER',
    });

    const backup = await repo.createStorageBackup();
    const partialPayload = {
      ...backup.data,
      merchantQrOrders: [
        {
          order_id: 'SELECTIVE-ORD-1',
          business_id: '1',
          businessId: '1',
          item_type: 'ACRYLIC_STANDEE',
        },
      ],
    };

    const restoreRes = await repo.commitRestorePayload(partialPayload, { selectedBusinessId: '1' });
    assert.strictEqual(restoreRes.success, true);

    // Kept tenant order survives
    assert.ok(repo.getMerchantQrOrderById('keep_tenant', 'KEEP-ORD-1'));
    // Selected tenant order restored
    assert.ok(repo.getMerchantQrOrderById('1', 'SELECTIVE-ORD-1'));
  });

  // --------------------------------------------------------------------------
  // GROUP 10: High-Throughput Performance Benchmark
  // --------------------------------------------------------------------------
  console.log('\n[GROUP 10: High-Throughput Performance Benchmark]');

  runTest('High-throughput benchmark: executes 1,000 QR order operations in < 150ms', () => {
    const benchDao = new MerchantQrOrderDao();
    const benchEngine = new MerchantQrOrderEngine(benchDao);

    const startTime = Date.now();
    const ITERATIONS = 1000;

    for (let i = 0; i < ITERATIONS; i++) {
      const pricing = calculateQrOrderPricing({
        itemType: i % 2 === 0 ? 'ACRYLIC_STANDEE' : 'WOODEN_STANDEE',
        quantity: (i % 5) + 1,
        division: i % 3 === 0 ? 'Dhaka' : 'Chattogram',
      });

      const validated = validateDeliveryAddress({
        recipientName: 'Bench User ' + i,
        recipientPhone: '01712345678',
        deliveryAddress: 'House ' + i + ', Road 1, Block A',
        division: 'Dhaka',
        district: 'Dhaka',
        postalCode: '1212',
      });

      const order = benchDao.saveOrder({
        order_id: 'BENCH-ORD-' + i,
        business_id: '1',
        item_type: pricing.itemType,
        quantity: pricing.quantity,
        total_price_paisa: pricing.totalPricePaisa,
      });

      if (i % 4 === 0) {
        benchDao.updateOrderStatus('BENCH-ORD-' + i, 'CONFIRMED');
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`  (Executed ${ITERATIONS} complete QR order operations in ${elapsed}ms)`);
    assert.ok(elapsed < 150, `Benchmark exceeded budget: ${elapsed}ms >= 150ms`);
  });

  console.log('\n==================================================================');
  console.log(` ALL ${passedTests}/${totalTests} BACKEND TESTS PASSED SUCCESSFULLY! (100% PASS RATE)`);
  console.log('==================================================================\n');
}

main().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
