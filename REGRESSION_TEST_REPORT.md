# Regression Test Report (Phase 2)

## Environment
- **Device Tested**: Xiaomi Redmi Note 9 (737ee4410405)
- **Android OS**: Android 12 (MIUI / HyperOS)
- **Screen Resolution**: 1080 x 2340 @ 440 DPI
- **Bundler**: Metro Bundler on port 8081 (packager-status:running)
- **Runtime**: Expo Go / React Native 0.74

## Test Cases & Results

| Test ID | Test Scenario | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|---|
| TC-01 | Initial App Load | App launches without crash; renders crimson header and 12 customer accounts | Header rendered with Mobile Xpress, 12 accounts visible | PASS |
| TC-02 | Tab 1: Home View | Promo banner, 8 quick action icons, summary card, search bar, and FAB visible | 1:1 visual match with reference screenshot | PASS |
| TC-03 | Tab 2: Cashbox View | Displays today sales, cash in hand, 5 categories, and denomination sheet | Rendered correctly with eye toggle and category breakdown | PASS |
| TC-04 | Tab 3: TallyPay View | Displays merchant balance, QR button, Add Money, Money Out, Recharge | All service buttons interactive and open respective modals | PASS |
| TC-05 | Tab 4: Menu View | 3 distinct grouped sections with authentic vectors and shop edit button | No colored square placeholders; authentic vector icons rendered | PASS |
| TC-06 | Customer Ledger Navigation | Tapping customer opens full ledger with transaction table, call, edit, and SMS | Ledger renders with running balance, given/received columns | PASS |
| TC-07 | Transaction Addition | Adding 500 given entry recalculates customer balance and updates storage | Balance increased by 500, journal added to list | PASS |
| TC-08 | Denomination Reconciliation | Entering note counts calculates physical cash and reports variance | Exact Bangladeshi note tiers calculated correctly | PASS |
| TC-09 | Backup & Export | Tapping backup generates JSON payload with all entities | Valid JSON generated and copied to clipboard/share dialog | PASS |
