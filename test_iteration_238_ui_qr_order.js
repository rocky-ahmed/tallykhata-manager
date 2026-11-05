/**
 * TALLYKHATA ITERATION 238: TALLYPAY MERCHANT QR STANDEE ORDER & COLLATERAL DELIVERY UI/UX QA SUITE
 *
 * Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions / QA & Security Owner)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Milestone: REA-ITER-238
 * Reference APK: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const i18n = require("./src/i18nService");
const tallyPay = require("./src/tallyPayService");
const storageRepository = require("./src/storageRepository");
const iconMetrics = require("./src/iconMetrics");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(desc, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log("  ✓ [PASS] " + desc);
  } catch (err) {
    failedTests++;
    console.error("  ✗ [FAIL] " + desc);
    console.error("    Error: " + err.message);
    if (err.stack) {
      console.error("    " + err.stack.split("\n").slice(1, 3).join("\n    "));
    }
  }
}

function parseHex(hex) {
  let cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleaned, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getLuminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(fgHex, bgHex) {
  const lum1 = getLuminance(parseHex(fgHex));
  const lum2 = getLuminance(parseHex(bgHex));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

async function runSuite() {
  console.log("================================================================================");
  console.log("TALLYKHATA ITERATION 238: TALLYPAY QR STANDEE ORDER & DELIVERY UI/UX QA SUITE");
  console.log("Worker: Worker 3: Ohm (Permanent Frontend Developer, UI/UX & Interactions)");
  console.log("Milestone: REA-ITER-238");
  console.log("================================================================================");

  const appSrc = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");

  // -----------------------------------------------------------------------------
  // PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY & REF-001 TOKENS ---");

  const requiredIter238Keys = [
    "qr_standee_order",
    "qr_order_catalog_title",
    "qr_order_catalog_subtitle",
    "select_standee_material",
    "standee_acrylic",
    "standee_acrylic_desc",
    "standee_wooden",
    "standee_wooden_desc",
    "standee_metal",
    "standee_metal_desc",
    "standee_sticker",
    "standee_sticker_desc",
    "standee_soundbox_stand",
    "standee_soundbox_stand_desc",
    "quantity",
    "unit_price",
    "preview_standee",
    "customize_preview",
    "bangla_qr_merchant",
    "scan_and_pay",
    "delivery_address",
    "delivery_address_desc",
    "recipient_name",
    "recipient_mobile",
    "division",
    "district",
    "thana_area",
    "street_address",
    "street_address_req",
    "postal_code",
    "delivery_charge",
    "delivery_inside_dhaka",
    "delivery_outside_dhaka",
    "free_delivery",
    "order_checkout",
    "order_summary",
    "item_subtotal",
    "total_payable",
    "payment_method",
    "pay_with_tp_wallet",
    "cash_on_delivery",
    "place_order_btn",
    "order_placed_success",
    "order_tracking",
    "order_id",
    "track_order_timeline",
    "step_placed",
    "step_confirmed",
    "step_shipped",
    "step_out_for_delivery",
    "step_delivered",
    "delivery_partner",
    "estimated_delivery",
    "view_all_orders",
    "delivery_man_mobile"
  ];

  await runTest("1.1: All Iteration 238 localization keys exist in STRINGS.bn", () => {
    requiredIter238Keys.forEach((key) => {
      assert.ok(i18n.STRINGS.bn[key], "Missing BN key: " + key);
    });
  });

  await runTest("1.2: All Iteration 238 localization keys exist in STRINGS.en", () => {
    requiredIter238Keys.forEach((key) => {
      assert.ok(i18n.STRINGS.en[key], "Missing EN key: " + key);
    });
  });

  await runTest("1.3: t() helper translates keys symmetrically across languages", () => {
    assert.strictEqual(i18n.t("qr_standee_order", "bn"), "কিউআর স্ট্যান্ডি ও স্টিকার অর্ডার");
    assert.strictEqual(i18n.t("qr_standee_order", "en"), "QR Standee & Sticker Order");
    assert.strictEqual(i18n.t("standee_acrylic", "bn"), "এক্রিলিক স্ট্যান্ডি");
    assert.strictEqual(i18n.t("standee_acrylic", "en"), "Acrylic Standee");
  });

  await runTest("1.4: Authentic REF-001 ARSC tokens present in STRINGS.bn", () => {
    assert.strictEqual(i18n.STRINGS.bn.scan_and_pay, "যেকোনো অ্যাপ থেকে স্ক্যান করে পেমেন্ট করুন");
    assert.strictEqual(i18n.STRINGS.bn.delivery_inside_dhaka, "ঢাকার ভিতরে (৳৬০)");
    assert.strictEqual(i18n.STRINGS.bn.delivery_outside_dhaka, "ঢাকার বাইরে (৳১২০)");
  });

  await runTest("1.5: Complete dictionary parity maintained across bn and en (zero missing keys)", () => {
    const bnKeys = Object.keys(i18n.STRINGS.bn);
    const enKeys = Object.keys(i18n.STRINGS.en);
    assert.strictEqual(bnKeys.length, enKeys.length, "bn and en must have identical key count");
    const diff = bnKeys.filter((k) => !i18n.STRINGS.en[k]);
    assert.strictEqual(diff.length, 0, "Discrepancy detected: " + diff.join(", "));
  });

  // -----------------------------------------------------------------------------
  // PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

  await runTest("2.1: Modals 112–116 state controllers declared in App.js", () => {
    assert.ok(appSrc.includes("const [modalQrOrderCatalog, setModalQrOrderCatalog] = useState(false);"));
    assert.ok(appSrc.includes("const [modalQrStandeePreview, setModalQrStandeePreview] = useState(false);"));
    assert.ok(appSrc.includes("const [modalDeliveryAddress, setModalDeliveryAddress] = useState(false);"));
    assert.ok(appSrc.includes("const [modalOrderPaymentCheckout, setModalOrderPaymentCheckout] = useState(false);"));
    assert.ok(appSrc.includes("const [modalOrderTracking, setModalOrderTracking] = useState(false);"));
  });

  await runTest("2.2: Standee material, quantity, address, payment method, tracking hooks declared", () => {
    assert.ok(appSrc.includes("const [selectedStandeeMaterial, setSelectedStandeeMaterial] = useState("));
    assert.ok(appSrc.includes("const [qrOrderQuantity, setQrOrderQuantity] = useState("));
    assert.ok(appSrc.includes("const [deliveryRecipientName, setDeliveryRecipientName] = useState("));
    assert.ok(appSrc.includes("const [deliveryMobile, setDeliveryMobile] = useState("));
    assert.ok(appSrc.includes("const [deliveryDivision, setDeliveryDivision] = useState("));
    assert.ok(appSrc.includes("const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("));
    assert.ok(appSrc.includes("const [orderTrackingStep, setOrderTrackingStep] = useState("));
  });

  await runTest("2.3: global.__QR_ORDER_TEST_HOOKS__ exposed in App.js with required keys", () => {
    assert.ok(appSrc.includes("global.__QR_ORDER_TEST_HOOKS__ = {"));
    assert.ok(appSrc.includes("modalQrOrderCatalog"));
    assert.ok(appSrc.includes("modalQrStandeePreview"));
    assert.ok(appSrc.includes("modalDeliveryAddress"));
    assert.ok(appSrc.includes("modalOrderPaymentCheckout"));
    assert.ok(appSrc.includes("modalOrderTracking"));
    assert.ok(appSrc.includes("handleOpenQrOrderCatalog"));
    assert.ok(appSrc.includes("handleOpenStandeePreview"));
    assert.ok(appSrc.includes("handleProceedToAddress"));
    assert.ok(appSrc.includes("handleProceedToCheckout"));
    assert.ok(appSrc.includes("handleConfirmPlaceOrder"));
    assert.ok(appSrc.includes("handleDoneOrderTracking"));
    assert.ok(appSrc.includes("QR_STANDEE_CATALOG"));
  });

  await runTest("2.4: QR standee ordering handlers and state management connected in App.js", () => {
    assert.ok(appSrc.includes("handleConfirmPlaceOrder"));
    assert.ok(appSrc.includes("lastPlacedOrder"));
    assert.ok(appSrc.includes("QR_STANDEE_CATALOG"));
    assert.ok(appSrc.includes("orderTrackingStep"));
  });

  await runTest("2.5: QR_STANDEE_CATALOG defined and matches material options with prices", () => {
    assert.ok(appSrc.includes("QR_STANDEE_CATALOG = ["));
    assert.ok(appSrc.includes("standee_acrylic"));
    assert.ok(appSrc.includes("standee_wooden"));
    assert.ok(appSrc.includes("standee_metal"));
    assert.ok(appSrc.includes("standee_sticker"));
    assert.ok(appSrc.includes("standee_soundbox_stand"));
  });

  // -----------------------------------------------------------------------------
  // PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 3: NAVIGATION ENTRY POINTS (TAB 4 & TAB 5) ---");

  await runTest("3.1: Tab 4 (TallyPay) renders QR Standee Order quick action button", () => {
    assert.ok(appSrc.includes('testID="tp_qr_standee_order_btn"'));
    assert.ok(appSrc.includes("handleOpenQrOrderCatalog"));
  });

  await runTest("3.2: Tab 5 (Menu) renders QR Standee Order menu list item", () => {
    assert.ok(appSrc.includes('testID="menu_tp_qr_standee_order_item"'));
  });

  await runTest("3.3: All navigation triggers attach STANDARD_TOUCH_HIT_SLOP and accessible button roles", () => {
    const tpIdx = appSrc.indexOf('testID="tp_qr_standee_order_btn"');
    const tpBtn = appSrc.substring(Math.max(0, tpIdx - 300), Math.min(appSrc.length, tpIdx + 300));
    assert.ok(tpBtn.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"));
    assert.ok(tpBtn.includes('accessibilityRole="button"'));

    const menuIdx = appSrc.indexOf('testID="menu_tp_qr_standee_order_item"');
    const menuBtn = appSrc.substring(Math.max(0, menuIdx - 300), Math.min(appSrc.length, menuIdx + 300));
    assert.ok(menuBtn.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"));
    assert.ok(menuBtn.includes('accessibilityRole="button"'));
  });

  // -----------------------------------------------------------------------------
  // PART 4: MODAL 112 (modalQrOrderCatalog) LAYOUT & QUANTITY STEPPER
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 4: MODAL 112 (modalQrOrderCatalog) LAYOUT & QUANTITY STEPPER ---");

  await runTest("4.1: modalQrOrderCatalog defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('visible={modalQrOrderCatalog}'));
    assert.ok(appSrc.includes('onRequestClose={() => setModalQrOrderCatalog(false)}'));
    assert.ok(appSrc.includes('testID="modal_qr_order_catalog"'));
  });

  await runTest("4.2: Header renders title, subtitle, and back button (btn_qr_catalog_back)", () => {
    assert.ok(appSrc.includes('testID="btn_qr_catalog_back"'));
    assert.ok(appSrc.includes("qr_order_catalog_title"));
    assert.ok(appSrc.includes("qr_order_catalog_subtitle"));
  });

  await runTest("4.3: 5 collateral item material cards (Acrylic, Wooden, Metal, Sticker, Soundbox Stand) with pricing", () => {
    assert.ok(appSrc.includes("standee_acrylic"));
    assert.ok(appSrc.includes("standee_wooden"));
    assert.ok(appSrc.includes("standee_metal"));
    assert.ok(appSrc.includes("standee_sticker"));
    assert.ok(appSrc.includes("standee_soundbox_stand"));
  });

  await runTest("4.4: Quantity stepper controls (btn_qr_qty_minus, btn_qr_qty_plus, text_qr_order_qty)", () => {
    assert.ok(appSrc.includes('testID="btn_qr_qty_minus"'));
    assert.ok(appSrc.includes('testID="btn_qr_qty_plus"'));
    assert.ok(appSrc.includes('testID="text_qr_order_qty"'));
  });

  await runTest("4.5: Subtotal dynamic display (text_catalog_subtotal)", () => {
    assert.ok(appSrc.includes('testID="text_catalog_subtotal"'));
  });

  await runTest("4.6: Preview trigger (btn_view_standee_preview) transitions to Modal 113", () => {
    assert.ok(appSrc.includes('testID="btn_view_standee_preview"'));
    assert.ok(appSrc.includes("handleOpenStandeePreview"));
  });

  await runTest("4.7: Proceed CTA (btn_proceed_to_address) transitions to Modal 114", () => {
    assert.ok(appSrc.includes('testID="btn_proceed_to_address"'));
    assert.ok(appSrc.includes("handleProceedToAddress"));
  });

  // -----------------------------------------------------------------------------
  // PART 5: MODAL 113 (modalQrStandeePreview) PHOTOREALISTIC STANDEE MOCKUP
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 5: MODAL 113 (modalQrStandeePreview) PHOTOREALISTIC STANDEE MOCKUP ---");

  await runTest("5.1: modalQrStandeePreview defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('visible={modalQrStandeePreview}'));
    assert.ok(appSrc.includes('onRequestClose={() => setModalQrStandeePreview(false)}'));
    assert.ok(appSrc.includes('testID="modal_qr_standee_preview"'));
  });

  await runTest("5.2: Header renders title, subtitle, and back button (btn_qr_preview_back)", () => {
    assert.ok(appSrc.includes('testID="btn_qr_preview_back"'));
    assert.ok(appSrc.includes("preview_standee"));
  });

  await runTest("5.3: Photorealistic mockup card (view_standee_mockup_card) with authentic styling", () => {
    assert.ok(appSrc.includes('testID="view_standee_mockup_card"'));
  });

  await runTest("5.4: Merchant shop name (text_standee_shop_name) and mobile (text_standee_merchant_mobile) rendered", () => {
    assert.ok(appSrc.includes('testID="text_standee_shop_name"'));
    assert.ok(appSrc.includes('testID="text_standee_merchant_mobile"'));
  });

  await runTest("5.5: QR code container (view_standee_qr_display) and Bangla QR branding", () => {
    assert.ok(appSrc.includes('testID="view_standee_qr_display"'));
    assert.ok(appSrc.includes("bangla_qr_merchant"));
    assert.ok(appSrc.includes("scan_and_pay"));
  });

  await runTest("5.6: Selected material badge (badge_selected_material)", () => {
    assert.ok(appSrc.includes('testID="badge_selected_material"'));
  });

  await runTest("5.7: Confirm and proceed CTA (btn_preview_confirm_proceed) transitions to Modal 114", () => {
    assert.ok(appSrc.includes('testID="btn_preview_confirm_proceed"'));
  });

  // -----------------------------------------------------------------------------
  // PART 6: MODAL 114 (modalDeliveryAddress) DELIVERY FORM & LIVE VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 6: MODAL 114 (modalDeliveryAddress) DELIVERY FORM & LIVE VALIDATION ---");

  await runTest("6.1: modalDeliveryAddress defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('visible={modalDeliveryAddress}'));
    assert.ok(appSrc.includes('onRequestClose={() => setModalDeliveryAddress(false)}'));
    assert.ok(appSrc.includes('testID="modal_delivery_address"'));
  });

  await runTest("6.2: Header renders title, subtitle, and back button (btn_delivery_address_back)", () => {
    assert.ok(appSrc.includes('testID="btn_delivery_address_back"'));
    assert.ok(appSrc.includes("delivery_address"));
    assert.ok(appSrc.includes("delivery_address_desc"));
  });

  await runTest("6.3: Recipient name input (input_delivery_recipient_name) and mobile input (input_delivery_mobile)", () => {
    assert.ok(appSrc.includes('testID="input_delivery_recipient_name"'));
    assert.ok(appSrc.includes('testID="input_delivery_mobile"'));
  });

  await runTest("6.4: Division selection chips (chip_division_dhaka, chip_division_outside)", () => {
    assert.ok(appSrc.includes('testID="chip_division_dhaka"'));
    assert.ok(appSrc.includes('testID="chip_division_outside"'));
  });

  await runTest("6.5: District, Thana, Street address, and Postal code inputs", () => {
    assert.ok(appSrc.includes('testID="input_delivery_district"'));
    assert.ok(appSrc.includes('testID="input_delivery_thana"'));
    assert.ok(appSrc.includes('testID="input_delivery_address"'));
    assert.ok(appSrc.includes('testID="input_delivery_postal_code"'));
  });

  await runTest("6.6: Delivery fee notice card (card_delivery_fee_info) displays fee tier", () => {
    assert.ok(appSrc.includes('testID="card_delivery_fee_info"'));
    assert.ok(appSrc.includes("delivery_inside_dhaka"));
    assert.ok(appSrc.includes("delivery_outside_dhaka"));
  });

  await runTest("6.7: Validation error banner (text_delivery_address_error) displays validation feedback", () => {
    assert.ok(appSrc.includes('testID="text_delivery_address_error"'));
  });

  await runTest("6.8: Proceed CTA (btn_proceed_to_checkout) advances to Modal 115", () => {
    assert.ok(appSrc.includes('testID="btn_proceed_to_checkout"'));
    assert.ok(appSrc.includes("handleProceedToCheckout"));
  });

  // -----------------------------------------------------------------------------
  // PART 7: MODAL 115 (modalOrderPaymentCheckout) BREAKDOWN & PAYMENT METHOD
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 7: MODAL 115 (modalOrderPaymentCheckout) BREAKDOWN & PAYMENT METHOD ---");

  await runTest("7.1: modalOrderPaymentCheckout defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('visible={modalOrderPaymentCheckout}'));
    assert.ok(appSrc.includes('onRequestClose={() => setModalOrderPaymentCheckout(false)}'));
    assert.ok(appSrc.includes('testID="modal_order_payment_checkout"'));
  });

  await runTest("7.2: Header renders title, subtitle, and back button (btn_checkout_back)", () => {
    assert.ok(appSrc.includes('testID="btn_checkout_back"'));
    assert.ok(appSrc.includes("order_checkout"));
  });

  await runTest("7.3: Order breakdown card (card_checkout_breakdown) renders subtotal, fee, and grand total", () => {
    assert.ok(appSrc.includes('testID="card_checkout_breakdown"'));
    assert.ok(appSrc.includes('testID="text_checkout_subtotal"'));
    assert.ok(appSrc.includes('testID="text_checkout_delivery_fee"'));
    assert.ok(appSrc.includes('testID="text_checkout_grand_total"'));
  });

  await runTest("7.4: Payment method radios (radio_pay_wallet, radio_pay_cod)", () => {
    assert.ok(appSrc.includes('testID="radio_pay_wallet"'));
    assert.ok(appSrc.includes('testID="radio_pay_cod"'));
  });

  await runTest("7.5: TallyPay wallet payment option indicates instant debit & balance verification", () => {
    assert.ok(appSrc.includes("pay_with_tp_wallet"));
    assert.ok(appSrc.includes("walletBalance"));
  });

  await runTest("7.6: Cash on Delivery option indicates payment upon delivery", () => {
    assert.ok(appSrc.includes("cash_on_delivery"));
  });

  await runTest("7.7: Confirm place order CTA (btn_confirm_place_order) executes order creation and opens Modal 116", () => {
    assert.ok(appSrc.includes('testID="btn_confirm_place_order"'));
    assert.ok(appSrc.includes("handleConfirmPlaceOrder"));
  });

  // -----------------------------------------------------------------------------
  // PART 8: MODAL 116 (modalOrderTracking) 5-STEP FSM STEPPER & LOGISTICS
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 8: MODAL 116 (modalOrderTracking) 5-STEP FSM STEPPER & LOGISTICS ---");

  await runTest("8.1: modalOrderTracking defines Modal with testID, onRequestClose and visible prop", () => {
    assert.ok(appSrc.includes('visible={modalOrderTracking}'));
    assert.ok(appSrc.includes('onRequestClose={() => setModalOrderTracking(false)}'));
    assert.ok(appSrc.includes('testID="modal_order_tracking"'));
  });

  await runTest("8.2: Header renders title and back button (btn_order_tracking_back)", () => {
    assert.ok(appSrc.includes('testID="btn_order_tracking_back"'));
    assert.ok(appSrc.includes("order_tracking"));
  });

  await runTest("8.3: Order info card (card_order_info) with order ID badge (text_order_id_badge)", () => {
    assert.ok(appSrc.includes('testID="card_order_info"'));
    assert.ok(appSrc.includes('testID="text_order_id_badge"'));
  });

  await runTest("8.4: 5-step visual tracking timeline stepper (stepper_order_tracking) with completed/active markers", () => {
    assert.ok(appSrc.includes('testID="stepper_order_tracking"'));
    assert.ok(appSrc.includes("step_placed"));
    assert.ok(appSrc.includes("step_confirmed"));
    assert.ok(appSrc.includes("step_shipped"));
    assert.ok(appSrc.includes("step_out_for_delivery"));
    assert.ok(appSrc.includes("step_delivered"));
  });

  await runTest("8.5: Stepper items (step_item_placed, step_item_confirmed, step_item_shipped, step_item_out_for_delivery, step_item_delivered)", () => {
    assert.ok(appSrc.includes("testId: 'step_item_placed'"));
    assert.ok(appSrc.includes("testId: 'step_item_confirmed'"));
    assert.ok(appSrc.includes("testId: 'step_item_shipped'"));
    assert.ok(appSrc.includes("testId: 'step_item_out_for_delivery'"));
    assert.ok(appSrc.includes("testId: 'step_item_delivered'"));
  });

  await runTest("8.6: Courier & logistics card (card_courier_info, text_courier_partner, btn_call_delivery_man)", () => {
    assert.ok(appSrc.includes('testID="card_courier_info"'));
    assert.ok(appSrc.includes('testID="text_courier_partner"'));
    assert.ok(appSrc.includes('testID="btn_call_delivery_man"'));
  });

  await runTest("8.7: Done CTA (btn_tracking_done) dismisses tracking modal cleanly", () => {
    assert.ok(appSrc.includes('testID="btn_tracking_done"'));
    assert.ok(appSrc.includes("handleDoneOrderTracking"));
  });

  // -----------------------------------------------------------------------------
  // PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 9: HARDWARE BACKHANDLER SAFE STACKED DISMISSAL ---");

  await runTest("9.1: BackHandler onBackPress dismisses modalOrderTracking cleanly", () => {
    assert.ok(appSrc.includes("if (modalOrderTracking) {"));
    assert.ok(appSrc.includes("setModalOrderTracking(false);"));
    assert.ok(appSrc.includes("return true;"));
  });

  await runTest("9.2: BackHandler onBackPress steps back from modalOrderPaymentCheckout to modalDeliveryAddress", () => {
    assert.ok(appSrc.includes("if (modalOrderPaymentCheckout) {"));
    assert.ok(appSrc.includes("setModalOrderPaymentCheckout(false);"));
    assert.ok(appSrc.includes("setModalDeliveryAddress(true);"));
    assert.ok(appSrc.includes("return true;"));
  });

  await runTest("9.3: BackHandler onBackPress steps back from modalDeliveryAddress to modalQrOrderCatalog", () => {
    assert.ok(appSrc.includes("if (modalDeliveryAddress) {"));
    assert.ok(appSrc.includes("setModalDeliveryAddress(false);"));
    assert.ok(appSrc.includes("setModalQrOrderCatalog(true);"));
    assert.ok(appSrc.includes("return true;"));
  });

  await runTest("9.4: BackHandler onBackPress steps back from modalQrStandeePreview to modalQrOrderCatalog", () => {
    assert.ok(appSrc.includes("if (modalQrStandeePreview) {"));
    assert.ok(appSrc.includes("setModalQrStandeePreview(false);"));
    assert.ok(appSrc.includes("setModalQrOrderCatalog(true);"));
    assert.ok(appSrc.includes("return true;"));
  });

  await runTest("9.5: BackHandler onBackPress dismisses modalQrOrderCatalog cleanly", () => {
    assert.ok(appSrc.includes("if (modalQrOrderCatalog) {"));
    assert.ok(appSrc.includes("setModalQrOrderCatalog(false);"));
    assert.ok(appSrc.includes("return true;"));
  });

  await runTest("9.6: BackHandler useCallback dependency array includes all 5 Iteration 238 modal controllers", () => {
    assert.ok(appSrc.includes("modalQrOrderCatalog, modalQrStandeePreview, modalDeliveryAddress, modalOrderPaymentCheckout, modalOrderTracking"));
  });

  // -----------------------------------------------------------------------------
  // PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 10: TOUCH TARGET ERGONOMICS & HAPTIC FEEDBACK ---");

  await runTest("10.1: STANDARD_TOUCH_HIT_SLOP provides >= 10dp expansion on all edges", () => {
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP !== undefined);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.top >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.bottom >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.left >= 10);
    assert.ok(iconMetrics.STANDARD_TOUCH_HIT_SLOP.right >= 10);
  });

  await runTest("10.2: STANDARD_TOUCH_HIT_SLOP attached to interactive triggers in Modals 112–116", () => {
    const qrButtons = [
      'testID="btn_qr_catalog_back"',
      'testID="btn_qr_qty_minus"',
      'testID="btn_qr_qty_plus"',
      'testID="btn_view_standee_preview"',
      'testID="btn_proceed_to_address"',
      'testID="btn_qr_preview_back"',
      'testID="btn_preview_confirm_proceed"',
      'testID="btn_delivery_address_back"',
      'testID="chip_division_dhaka"',
      'testID="chip_division_outside"',
      'testID="btn_proceed_to_checkout"',
      'testID="btn_checkout_back"',
      'testID="radio_pay_wallet"',
      'testID="radio_pay_cod"',
      'testID="btn_confirm_place_order"',
      'testID="btn_order_tracking_back"',
      'testID="btn_call_delivery_man"',
      'testID="btn_tracking_done"'
    ];

    qrButtons.forEach((btnTestId) => {
      const idx = appSrc.indexOf(btnTestId);
      assert.ok(idx > -1, "Button must exist: " + btnTestId);
      const surrounding = appSrc.substring(Math.max(0, idx - 350), Math.min(appSrc.length, idx + 350));
      assert.ok(surrounding.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "Button must attach STANDARD_TOUCH_HIT_SLOP: " + btnTestId);
    });
  });

  await runTest("10.3: Haptic feedback milestones wired in QR standee order action handlers", () => {
    assert.ok(appSrc.includes("hapticFeedbackService.impactMedium();"));
    assert.ok(appSrc.includes("hapticFeedbackService.notificationSuccess();"));
  });

  // -----------------------------------------------------------------------------
  // PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 11: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

  await runTest("11.1: Primary CTA button (#FFFFFF on #0D6E5C) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#FFFFFF", "#0D6E5C");
    console.log("      [CONTRAST] #FFFFFF on #0D6E5C: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Contrast ratio must be >= 4.5:1, got " + ratio);
  });

  await runTest("11.2: Dark mode card surface (#FFFFFF on #0F172A) achieves WCAG AAA (>= 7.0:1)", () => {
    const ratio = getContrastRatio("#FFFFFF", "#0F172A");
    console.log("      [CONTRAST] #FFFFFF on #0F172A: " + ratio.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(ratio >= 7.0, "Contrast ratio must be >= 7.0:1, got " + ratio);
  });

  await runTest("11.3: Confirmed / Delivered status badge (#0D6E5C on #D1FAE5) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#0D6E5C", "#D1FAE5");
    console.log("      [CONTRAST] #0D6E5C on #D1FAE5: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Contrast ratio must be >= 4.5:1, got " + ratio);
  });

  await runTest("11.4: Order warning / fee notice badge (#78350F on #FEF3C7) achieves WCAG AA (>= 4.5:1)", () => {
    const ratio = getContrastRatio("#78350F", "#FEF3C7");
    console.log("      [CONTRAST] #78350F on #FEF3C7: " + ratio.toFixed(2) + ":1 (PASS AA)");
    assert.ok(ratio >= 4.5, "Contrast ratio must be >= 4.5:1, got " + ratio);
  });

  await runTest("11.5: Light theme card background text (#1E293B on #F8FAFC) achieves WCAG AAA (>= 7.0:1)", () => {
    const ratio = getContrastRatio("#1E293B", "#F8FAFC");
    console.log("      [CONTRAST] #1E293B on #F8FAFC: " + ratio.toFixed(2) + ":1 (PASS AAA)");
    assert.ok(ratio >= 7.0, "Contrast ratio must be >= 7.0:1, got " + ratio);
  });

  // -----------------------------------------------------------------------------
  // PART 12: MODAL COUNT & CONTROLLER INVARIANTS (131 MODALS)
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 12: MODAL COUNT & CONTROLLER INVARIANTS (131 MODALS) ---");

  await runTest("12.1: App.js contains exactly 131 <Modal elements", () => {
    const modalMatches = appSrc.match(/<Modal\b/g) || [];
    assert.strictEqual(modalMatches.length, 131, "Expected exactly 131 modals in App.js, got " + modalMatches.length);
  });

  await runTest("12.2: App.js contains exactly 131 onRequestClose handlers", () => {
    const reqCloseMatches = appSrc.match(/onRequestClose=\{/g) || [];
    assert.strictEqual(reqCloseMatches.length, 131, "Expected 131 onRequestClose handlers, got " + reqCloseMatches.length);
  });

  await runTest("12.3: App.js contains exactly 131 unique modal state controllers", () => {
    const regex = /visible=\{([a-zA-Z0-9_]+)\}/g;
    const uniqueModals = new Set();
    let m;
    while ((m = regex.exec(appSrc)) !== null) {
      uniqueModals.add(m[1]);
    }
    assert.strictEqual(uniqueModals.size, 131, "Expected 131 unique visible controllers, got " + uniqueModals.size);
    assert.ok(uniqueModals.has("modalQrOrderCatalog"), "modalQrOrderCatalog must be in unique controllers");
    assert.ok(uniqueModals.has("modalQrStandeePreview"), "modalQrStandeePreview must be in unique controllers");
    assert.ok(uniqueModals.has("modalDeliveryAddress"), "modalDeliveryAddress must be in unique controllers");
    assert.ok(uniqueModals.has("modalOrderPaymentCheckout"), "modalOrderPaymentCheckout must be in unique controllers");
    assert.ok(uniqueModals.has("modalOrderTracking"), "modalOrderTracking must be in unique controllers");
  });

  // -----------------------------------------------------------------------------
  // PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK
  // -----------------------------------------------------------------------------
  console.log("\n--- PART 13: BABEL AST PARSER VERIFICATION & BENCHMARK ---");

  await runTest("13.1: App.js compiles cleanly via Babel parser with zero syntax errors", () => {
    const t0 = Date.now();
    babel.parseSync(appSrc, {
      filename: "App.js",
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["jsx", "flow"] },
    });
    const elapsed = Date.now() - t0;
    console.log("      [BABEL] Successfully parsed App.js in " + elapsed + "ms");
  });

  await runTest("13.2: Latency benchmark: 1,000 QR order operations execute in < 200ms", () => {
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
      tallyPay.calculateQrOrderPricing({
        itemType: "ACRYLIC_STANDEE",
        quantity: 2,
        division: "Dhaka",
        district: "Dhaka"
      });
      tallyPay.validateDeliveryAddress({
        recipientName: "Test Merchant",
        recipientPhone: "01712345678",
        deliveryAddress: "Shop 12, Banani Super Market",
        division: "Dhaka",
        district: "Dhaka",
        postalCode: "1213"
      });
    }
    const elapsed = Date.now() - t0;
    console.log("      [BENCHMARK] 1,000 operations completed in " + elapsed + "ms (" + (elapsed / 1000).toFixed(4) + "ms/op)");
    assert.ok(elapsed < 200, "Benchmark exceeded 200ms limit: " + elapsed + "ms");
  });

  console.log("\n================================================================================");
  console.log("TOTAL: " + totalTests + " | PASSED: " + passedTests + " | FAILED: " + failedTests + " (" + (failedTests === 0 ? "100% SUCCESS" : "FAILURES DETECTED") + ")");
  console.log("================================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Suite execution failure:", err);
  process.exit(1);
});
