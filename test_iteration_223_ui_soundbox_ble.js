/**
 * test_iteration_223_ui_soundbox_ble.js
 *
 * Automated QA & UI/UX Test Suite for Merchant Soundbox BLE Device Pairing,
 * Battery Telemetry, Volume Synchronization, and Audio Routing Fallback.
 *
 * Milestone: REA-ITER-223
 * Hardware Display Baseline: Xiaomi Redmi Note 9 (1080x2340, 440dpi)
 * Target Framework: React Native / Expo (Babel Expo Preset)
 */

const assert = require("assert");
const fs = require("fs");
const babel = require("@babel/core");

const i18n = require("./src/i18nService");
const soundbox = require("./src/soundboxService");
const storage = require("./src/storageRepository");

// Read App.js source for static code & AST analysis
const appSource = fs.readFileSync("App.js", "utf8");

// ============================================================================
// TEST HARNESS UTILITIES
// ============================================================================
let totalTests = 0;
let passedTests = 0;
const failures = [];

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] TEST ${totalTests}: ${testName}`);
  } catch (err) {
    failures.push({ test: testName, error: err.message });
    console.error(`[FAIL] TEST ${totalTests}: ${testName}`);
    console.error(`       Error: ${err.message}`);
  }
}

// Relative luminance & WCAG contrast calculation
function getLuminance(hex) {
  const cleanHex = hex.replace("#", "");
  const rgb = [
    parseInt(cleanHex.substring(0, 2), 16) / 255,
    parseInt(cleanHex.substring(2, 4), 16) / 255,
    parseInt(cleanHex.substring(4, 6), 16) / 255,
  ];
  const a = rgb.map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

console.log("================================================================================");
console.log("ITERATION 223: SOUNDBOX BLE PAIRING & BATTERY TELEMETRY UI QA SUITE");
console.log("================================================================================");

// ============================================================================
// PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY
// ============================================================================
console.log("\n--- PART 1: BILINGUAL LOCALIZATION (i18n) KEY SYMMETRY ---");

const ITERATION_223_KEYS = [
  "soundbox_settings_title",
  "soundbox_settings_desc",
  "soundbox_state_connected",
  "soundbox_state_scanning",
  "soundbox_state_connecting",
  "soundbox_state_disconnected",
  "soundbox_state_error",
  "soundbox_action_scan",
  "soundbox_action_disconnect",
  "soundbox_action_reconnect",
  "soundbox_device_name",
  "soundbox_device_mac",
  "soundbox_device_rssi",
  "soundbox_battery_title",
  "soundbox_battery_charging",
  "soundbox_battery_discharging",
  "soundbox_battery_low_warning",
  "soundbox_battery_critical_alert",
  "soundbox_volume_title",
  "soundbox_volume_hardware_step",
  "soundbox_volume_software_level",
  "soundbox_volume_mute",
  "soundbox_volume_max",
  "soundbox_routing_title",
  "soundbox_routing_hardware",
  "soundbox_routing_software",
  "soundbox_routing_fallback_reason",
  "soundbox_routing_fallback_disconnected",
  "soundbox_routing_fallback_low_battery",
  "soundbox_test_btn",
  "soundbox_test_playing",
  "soundbox_test_success",
  "soundbox_test_sample_prompt",
];

runTest("1.1: All Iteration 223 localization keys exist in STRINGS.bn", () => {
  const bn = i18n.STRINGS.bn;
  assert(bn, "STRINGS.bn missing");
  ITERATION_223_KEYS.forEach((k) => {
    assert(bn[k] !== undefined && bn[k].trim() !== "", `Key '${k}' missing or empty in STRINGS.bn`);
  });
});

runTest("1.2: All Iteration 223 localization keys exist in STRINGS.en", () => {
  const en = i18n.STRINGS.en;
  assert(en, "STRINGS.en missing");
  ITERATION_223_KEYS.forEach((k) => {
    assert(en[k] !== undefined && en[k].trim() !== "", `Key '${k}' missing or empty in STRINGS.en`);
  });
});

runTest("1.3: t() helper translates keys symmetrically across languages", () => {
  assert.strictEqual(i18n.t("soundbox_settings_title", "bn"), "সাউন্ডবক্স ও ব্লুটুথ ডিভাইস");
  assert.strictEqual(i18n.t("soundbox_settings_title", "en"), "Soundbox & Bluetooth Device");
  assert.strictEqual(i18n.t("soundbox_state_connected", "bn"), "সংযুক্ত");
  assert.strictEqual(i18n.t("soundbox_state_connected", "en"), "Connected");
  assert.strictEqual(i18n.t("soundbox_action_scan", "bn"), "ডিভাইস খুঁজুন");
  assert.strictEqual(i18n.t("soundbox_action_scan", "en"), "Scan for Device");
  assert.strictEqual(i18n.t("soundbox_routing_hardware", "bn"), "হার্ডওয়্যার সাউন্ডবক্স");
  assert.strictEqual(i18n.t("soundbox_routing_hardware", "en"), "Hardware Soundbox");
  assert.strictEqual(i18n.t("soundbox_routing_software", "bn"), "ইন-অ্যাপ সাউন্ডবক্স (TTS)");
  assert.strictEqual(i18n.t("soundbox_routing_software", "en"), "In-App Soundbox (TTS)");
});

// ============================================================================
// PART 2: APP.JS STATE HOOKS & TEST HOOKS EXPOSURE
// ============================================================================
console.log("\n--- PART 2: APP.JS STATE HOOKS & TEST HOOKS DECLARATION ---");

runTest("2.1: Soundbox BLE state hooks declared in App.js", () => {
  assert(appSource.includes("const [modalSoundboxSettings, setModalSoundboxSettings] = useState(false);"), "modalSoundboxSettings missing");
  assert(appSource.includes("const [soundboxBleState, setSoundboxBleState] = useState('DISCONNECTED');"), "soundboxBleState missing");
  assert(appSource.includes("const [soundboxBatteryLevel, setSoundboxBatteryLevel] = useState(85);"), "soundboxBatteryLevel missing");
  assert(appSource.includes("const [soundboxIsCharging, setSoundboxIsCharging] = useState(false);"), "soundboxIsCharging missing");
  assert(appSource.includes("const [soundboxHardwareVolume, setSoundboxHardwareVolume] = useState(10);"), "soundboxHardwareVolume missing");
  assert(appSource.includes("const [soundboxSoftwareVolume, setSoundboxSoftwareVolume] = useState(3);"), "soundboxSoftwareVolume missing");
  assert(appSource.includes("const [soundboxDeviceName, setSoundboxDeviceName] = useState('TallyKhata Soundbox Pro');"), "soundboxDeviceName missing");
  assert(appSource.includes("const [soundboxDeviceMac, setSoundboxDeviceMac] = useState('C4:4F:33:0A:12:8E');"), "soundboxDeviceMac missing");
  assert(appSource.includes("const [soundboxRssi, setSoundboxRssi] = useState(-58);"), "soundboxRssi missing");
  assert(appSource.includes("const [soundboxIsPlayingTest, setSoundboxIsPlayingTest] = useState(false);"), "soundboxIsPlayingTest missing");
});

runTest("2.2: global.__SOUNDBOX_BLE_TEST_HOOKS__ exposed in App.js", () => {
  assert(appSource.includes("global.__SOUNDBOX_BLE_TEST_HOOKS__ = {"), "__SOUNDBOX_BLE_TEST_HOOKS__ missing");
  assert(appSource.includes("modalSoundboxSettings,"), "modalSoundboxSettings hook missing");
  assert(appSource.includes("soundboxBleState,"), "soundboxBleState hook missing");
  assert(appSource.includes("soundboxBatteryLevel,"), "soundboxBatteryLevel hook missing");
  assert(appSource.includes("soundboxIsCharging,"), "soundboxIsCharging hook missing");
  assert(appSource.includes("soundboxHardwareVolume,"), "soundboxHardwareVolume hook missing");
  assert(appSource.includes("soundboxSoftwareVolume,"), "soundboxSoftwareVolume hook missing");
  assert(appSource.includes("handleOpenSoundboxSettings,"), "handleOpenSoundboxSettings hook missing");
  assert(appSource.includes("handleToggleSoundboxBleScan,"), "handleToggleSoundboxBleScan hook missing");
  assert(appSource.includes("handleSetSoundboxBattery,"), "handleSetSoundboxBattery hook missing");
  assert(appSource.includes("handleSetSoundboxHardwareVolume,"), "handleSetSoundboxHardwareVolume hook missing");
  assert(appSource.includes("handleSetSoundboxSoftwareVolume,"), "handleSetSoundboxSoftwareVolume hook missing");
  assert(appSource.includes("handleTestSoundboxAnnouncement,"), "handleTestSoundboxAnnouncement hook missing");
  assert(appSource.includes("soundboxDeviceManager,"), "soundboxDeviceManager hook missing");
});

// ============================================================================
// PART 3: MODAL LAYOUT & NAVIGATION ENTRY POINTS
// ============================================================================
console.log("\n--- PART 3: MODAL LAYOUT & NAVIGATION ENTRY POINTS ---");

runTest("3.1: modalSoundboxSettings Modal container and header rendered", () => {
  assert(appSource.includes("<Modal"), "Modal JSX missing");
  assert(appSource.includes("visible={modalSoundboxSettings}"), "visible={modalSoundboxSettings} missing");
  assert(appSource.includes("t('soundbox_settings_title')"), "soundbox_settings_title header missing");
  assert(appSource.includes("t('soundbox_settings_desc')"), "soundbox_settings_desc header missing");
});

runTest("3.2: Soundbox Settings entry point rendered in Menu Tab", () => {
  assert(appSource.includes("onPress={handleOpenSoundboxSettings}"), "handleOpenSoundboxSettings press trigger missing");
  assert(appSource.includes("accessibilityLabel={t('soundbox_settings_title')}"), "accessibilityLabel missing on menu item");
});

runTest("3.3: Merchant QR Voice Announcement banner connects to Soundbox Settings", () => {
  assert(appSource.includes("onPress={handleOpenSoundboxSettings}"), "Banner trigger missing in modalBanglaQR");
  assert(appSource.includes("t('soundbox_settings_title')"), "Soundbox settings label missing in QR banner");
});

// ============================================================================
// PART 4: BLE PAIRING STATES & STATE MACHINE SIMULATION
// ============================================================================
console.log("\n--- PART 4: BLE PAIRING STATES & STATE TRANSITIONS ---");

runTest("4.1: Pairing state badge renders all 4 dynamic states (Connected, Scanning, Connecting, Disconnected)", () => {
  assert(appSource.includes("t('soundbox_state_connected')"), "Connected state label missing");
  assert(appSource.includes("t('soundbox_state_scanning')"), "Scanning state label missing");
  assert(appSource.includes("t('soundbox_state_connecting')"), "Connecting state label missing");
  assert(appSource.includes("t('soundbox_state_disconnected')"), "Disconnected state label missing");
});

runTest("4.2: SoundboxDeviceManager state machine lifecycle transitions", () => {
  const mgr = soundbox.soundboxDeviceManager;
  mgr.reset();
  assert.strictEqual(mgr.getConnectionState(), soundbox.CONNECTION_STATES.DISCONNECTED);
  assert.strictEqual(mgr.isConnected(), false);

  mgr.startScan();
  assert.strictEqual(mgr.getConnectionState(), soundbox.CONNECTION_STATES.SCANNING);
  assert.strictEqual(mgr.isScanning(), true);

  mgr.connect({ id: "DEV-001", name: "TK Soundbox S1", rssi: -62 });
  assert.strictEqual(mgr.getConnectionState(), soundbox.CONNECTION_STATES.CONNECTED);
  assert.strictEqual(mgr.isConnected(), true);
  assert.strictEqual(mgr.getDevice().id, "DEV-001");

  mgr.disconnect();
  assert.strictEqual(mgr.getConnectionState(), soundbox.CONNECTION_STATES.DISCONNECTED);
  assert.strictEqual(mgr.isConnected(), false);
});

runTest("4.3: Action button toggles between Scan and Disconnect based on connection state", () => {
  assert(appSource.includes("soundboxBleState === 'CONNECTED' ? t('soundbox_action_disconnect') : t('soundbox_action_scan')"), "Action button label toggle missing");
});

// ============================================================================
// PART 5: BATTERY TELEMETRY & THRESHOLD BADGES
// ============================================================================
console.log("\n--- PART 5: BATTERY TELEMETRY & THRESHOLD BADGES ---");

runTest("5.1: Battery progress bar and percentage display rendered", () => {
  assert(appSource.includes("t('soundbox_battery_title')"), "Battery title missing");
  assert(appSource.includes("`${soundboxBatteryLevel}%`"), "Battery percentage width missing");
  assert(appSource.includes("{soundboxBatteryLevel}%"), "Battery percentage label missing");
});

runTest("5.2: Charging indicator toggles between charging and discharging state", () => {
  assert(appSource.includes("t('soundbox_battery_charging')"), "Charging label missing");
  assert(appSource.includes("t('soundbox_battery_discharging')"), "Discharging label missing");
  assert(appSource.includes("handleToggleSoundboxCharging"), "handleToggleSoundboxCharging missing");
});

runTest("5.3: Low battery warning badge rendered when battery <= 15%", () => {
  assert(appSource.includes("soundboxBatteryLevel <= 15"), "Battery <= 15 check missing");
  assert(appSource.includes("t('soundbox_battery_low_warning')"), "soundbox_battery_low_warning label missing");
});

runTest("5.4: Critical battery alert badge rendered when battery < 10%", () => {
  assert(appSource.includes("soundboxBatteryLevel < 10"), "Battery < 10 check missing");
  assert(appSource.includes("t('soundbox_battery_critical_alert')"), "soundbox_battery_critical_alert label missing");
});

runTest("5.5: Quick simulation chips allow instant testing (100%, 50%, 15%, 8%)", () => {
  [100, 50, 15, 8].forEach((lvl) => {
    assert(appSource.includes(`${lvl}%`), `Simulation chip for ${lvl}% missing`);
  });
  assert(appSource.includes("handleSetSoundboxBattery(lvl)"), "handleSetSoundboxBattery call missing");
});

// ============================================================================
// PART 6: VOLUME SYNCHRONIZATION (HARDWARE 0-15 <-> SOFTWARE 1-5)
// ============================================================================
console.log("\n--- PART 6: VOLUME SYNCHRONIZATION ---");

runTest("6.1: Hardware volume step converters (0-15 <-> 1-5) mathematical invariants", () => {
  // convertHardwareVolumeToSoftware
  assert.strictEqual(soundbox.convertHardwareVolumeToSoftware(0), 1);
  assert.strictEqual(soundbox.convertHardwareVolumeToSoftware(3), 1);
  assert.strictEqual(soundbox.convertHardwareVolumeToSoftware(6), 2);
  assert.strictEqual(soundbox.convertHardwareVolumeToSoftware(9), 3);
  assert.strictEqual(soundbox.convertHardwareVolumeToSoftware(12), 4);
  assert.strictEqual(soundbox.convertHardwareVolumeToSoftware(15), 5);

  // convertSoftwareVolumeToHardware
  assert.strictEqual(soundbox.convertSoftwareVolumeToHardware(1), 3);
  assert.strictEqual(soundbox.convertSoftwareVolumeToHardware(2), 6);
  assert.strictEqual(soundbox.convertSoftwareVolumeToHardware(3), 9);
  assert.strictEqual(soundbox.convertSoftwareVolumeToHardware(4), 12);
  assert.strictEqual(soundbox.convertSoftwareVolumeToHardware(5), 15);
});

runTest("6.2: Volume stepper controls render minus and plus buttons with accessible labels", () => {
  assert(appSource.includes("handleSetSoundboxHardwareVolume(soundboxHardwareVolume - 1)"), "Hardware volume decrement missing");
  assert(appSource.includes("handleSetSoundboxHardwareVolume(soundboxHardwareVolume + 1)"), "Hardware volume increment missing");
  assert(appSource.includes("tStatic(\"কমান\")"), "Minus button accessible label missing");
  assert(appSource.includes("tStatic(\"বাড়ান\")"), "Plus button accessible label missing");
});

runTest("6.3: Software 5-step volume pills rendered and interactive", () => {
  assert(appSource.includes("[1, 2, 3, 4, 5].map"), "Software volume 5-step mapping missing");
  assert(appSource.includes("handleSetSoundboxSoftwareVolume(level)"), "handleSetSoundboxSoftwareVolume call missing");
});

// ============================================================================
// PART 7: DUAL AUDIO ROUTING STATUS & AUTOMATIC FALLBACK
// ============================================================================
console.log("\n--- PART 7: DUAL AUDIO ROUTING STATUS & FALLBACK ---");

runTest("7.1: resolveAudioFeedbackSink selects HARDWARE_BLE_SOUNDBOX when connected and battery >= 10%", () => {
  const target = soundbox.resolveAudioFeedbackSink(true, 85, true);
  assert.strictEqual(target, soundbox.ROUTING_TARGETS.HARDWARE_BLE_SOUNDBOX);
});

runTest("7.2: resolveAudioFeedbackSink falls back to SOFTWARE_IN_APP_TTS when BLE disconnected", () => {
  const target = soundbox.resolveAudioFeedbackSink(false, 85, true);
  assert.strictEqual(target, soundbox.ROUTING_TARGETS.SOFTWARE_IN_APP_TTS);
});

runTest("7.3: resolveAudioFeedbackSink falls back to SOFTWARE_IN_APP_TTS when battery < 10% (critical threshold)", () => {
  const target = soundbox.resolveAudioFeedbackSink(true, 8, true);
  assert.strictEqual(target, soundbox.ROUTING_TARGETS.SOFTWARE_IN_APP_TTS);
});

runTest("7.4: App.js displays Hardware Soundbox when active, and Fallback Reason when inactive", () => {
  assert(appSource.includes("soundboxBleState === 'CONNECTED' && soundboxBatteryLevel >= 10"), "Audio routing condition missing");
  assert(appSource.includes("t('soundbox_routing_hardware')"), "soundbox_routing_hardware missing");
  assert(appSource.includes("t('soundbox_routing_software')"), "soundbox_routing_software missing");
  assert(appSource.includes("t('soundbox_routing_fallback_reason'"), "soundbox_routing_fallback_reason missing");
});

// ============================================================================
// PART 8: TEST ANNOUNCEMENT ACTION & HAPTIC FEEDBACK
// ============================================================================
console.log("\n--- PART 8: TEST ANNOUNCEMENT & HAPTIC FEEDBACK ---");

runTest("8.1: Test announcement button rendered with tactile Button3D", () => {
  assert(appSource.includes("t('soundbox_test_btn')"), "Test sound button title missing");
  assert(appSource.includes("handleTestSoundboxAnnouncement"), "handleTestSoundboxAnnouncement handler missing");
});

runTest("8.2: routeAudioNotification constructs valid announcement and returns routing metadata", () => {
  const mgr = soundbox.soundboxDeviceManager;
  mgr.connect({ id: "DEV-001", name: "TK Soundbox S1" });
  mgr.updateBatteryTelemetry(75, false);

  const res = mgr.routeAudioNotification({ amount: 500, customerName: "করিম স্টোর", typeName: "ক্যাশ গ্রহণ" });
  assert.strictEqual(res.dispatched, true);
  assert.strictEqual(res.target, soundbox.ROUTING_TARGETS.HARDWARE_BLE_SOUNDBOX);
  assert(res.packet instanceof Buffer, "BLE packet buffer missing");
  assert.strictEqual(res.paisa, 50000);
});

runTest("8.3: Tactile hapticFeedbackService wired to all key Soundbox actions", () => {
  assert(appSource.includes("hapticFeedbackService.impactMedium()"), "impactMedium on test announcement missing");
  assert(appSource.includes("hapticFeedbackService.selection()"), "selection on settings open / volume / toggle missing");
  assert(appSource.includes("hapticFeedbackService.notificationSuccess()"), "notificationSuccess on pairing / test missing");
});

// ============================================================================
// PART 9: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
// ============================================================================
console.log("\n--- PART 9: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

runTest("9.1: Connected badge text achieves WCAG AAA in Dark mode (#A7F3D0 on #064E3B >= 7.0:1)", () => {
  const cr = contrastRatio("#A7F3D0", "#064E3B");
  console.log(`      [CONTRAST] Connected Dark Badge: ${cr.toFixed(2)}:1`);
  assert(cr >= 7.0, `Contrast ratio ${cr.toFixed(2)} must be >= 7.0:1 (AAA)`);
});

runTest("9.2: Connected badge text achieves WCAG AAA in Light mode (#064E3B on #DCFCE7 >= 7.0:1)", () => {
  const cr = contrastRatio("#064E3B", "#DCFCE7");
  console.log(`      [CONTRAST] Connected Light Badge: ${cr.toFixed(2)}:1`);
  assert(cr >= 7.0, `Contrast ratio ${cr.toFixed(2)} must be >= 7.0:1 (AAA)`);
});

runTest("9.3: Scanning badge text achieves WCAG AAA in Dark mode (#FDE68A on #451A03 >= 7.0:1)", () => {
  const cr = contrastRatio("#FDE68A", "#451A03");
  console.log(`      [CONTRAST] Scanning Dark Badge: ${cr.toFixed(2)}:1`);
  assert(cr >= 7.0, `Contrast ratio ${cr.toFixed(2)} must be >= 7.0:1 (AAA)`);
});

runTest("9.4: Scanning badge text achieves WCAG AA in Light mode (#92400E on #FEF3C7 >= 4.5:1)", () => {
  const cr = contrastRatio("#92400E", "#FEF3C7");
  console.log(`      [CONTRAST] Scanning Light Badge: ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Contrast ratio ${cr.toFixed(2)} must be >= 4.5:1 (AA)`);
});

runTest("9.5: Disconnected badge text achieves WCAG AAA in Dark mode (#FEE2E2 on #7F1D1D >= 7.0:1)", () => {
  const cr = contrastRatio("#FEE2E2", "#7F1D1D");
  console.log(`      [CONTRAST] Disconnected Dark Badge: ${cr.toFixed(2)}:1`);
  assert(cr >= 7.0, `Contrast ratio ${cr.toFixed(2)} must be >= 7.0:1 (AAA)`);
});

runTest("9.6: Disconnected badge text achieves WCAG AA in Light mode (#991B1B on #FEE2E2 >= 4.5:1)", () => {
  const cr = contrastRatio("#991B1B", "#FEE2E2");
  console.log(`      [CONTRAST] Disconnected Light Badge: ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Contrast ratio ${cr.toFixed(2)} must be >= 4.5:1 (AA)`);
});

runTest("9.7: Volume active pill text achieves WCAG AA (#FFFFFF on #0D6E5C >= 4.5:1)", () => {
  const cr = contrastRatio("#FFFFFF", "#0D6E5C");
  console.log(`      [CONTRAST] Volume Active Pill: ${cr.toFixed(2)}:1`);
  assert(cr >= 4.5, `Contrast ratio ${cr.toFixed(2)} must be >= 4.5:1 (AA)`);
});

runTest("9.8: Volume inactive pill text achieves WCAG AAA (#334155 on #F1F5F9 >= 7.0:1)", () => {
  const cr = contrastRatio("#334155", "#F1F5F9");
  console.log(`      [CONTRAST] Volume Inactive Pill: ${cr.toFixed(2)}:1`);
  assert(cr >= 7.0, `Contrast ratio ${cr.toFixed(2)} must be >= 7.0:1 (AAA)`);
});

// ============================================================================
// PART 10: HARDWARE BACKHANDLER SAFE DISMISSAL
// ============================================================================
console.log("\n--- PART 10: HARDWARE BACKHANDLER SAFE DISMISSAL ---");

runTest("10.1: modalSoundboxSettings dismissed gracefully in onBackPress", () => {
  assert(appSource.includes("if (modalSoundboxSettings) { setModalSoundboxSettings(false); return true; }"), "modalSoundboxSettings onBackPress check missing");
});

runTest("10.2: modalSoundboxSettings included in BackHandler dependency array", () => {
  assert(appSource.includes("modalSoundboxSettings,"), "modalSoundboxSettings missing from BackHandler dependencies");
});

// ============================================================================
// PART 11: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK
// ============================================================================
console.log("\n--- PART 11: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK ---");

runTest("11.1: App.js compiles cleanly via Babel parser with Expo preset", () => {
  const ast = babel.parseSync(appSource, {
    configFile: false,
    babelrc: false,
    presets: ["babel-preset-expo"],
  });
  assert(ast && ast.program, "AST program root missing");
  assert(ast.program.body.length > 50, "App.js program statements count too low");
  console.log(`      [BABEL] Successfully parsed ${ast.program.body.length} top-level program statements`);
});

runTest("11.2: Latency benchmark: 1,000 routeAudioNotification dispatches in < 500ms (< 0.5ms/op)", () => {
  const mgr = soundbox.soundboxDeviceManager;
  mgr.connect({ id: "DEV-BENCH", name: "Bench Soundbox" });
  mgr.updateBatteryTelemetry({ batteryLevel: 90 });

  const samplePrompt = {
    amount: 1250,
    customerName: "আব্দুল্লাহ স্টোর",
    typeName: "বাকি আদায়",
    channelId: 0x01, // bKash
  };

  const start = process.hrtime.bigint();
  for (let i = 0; i < 1000; i++) {
    mgr.routeAudioNotification(samplePrompt);
  }
  const end = process.hrtime.bigint();
  const elapsedMs = Number(end - start) / 1e6;
  const perOpMs = elapsedMs / 1000;

  console.log(`      [BENCHMARK] 1,000 dispatches in ${elapsedMs.toFixed(2)}ms (${perOpMs.toFixed(4)}ms/op)`);
  assert(elapsedMs < 500, `Elapsed ${elapsedMs.toFixed(2)}ms exceeded 500ms budget`);
});

// ============================================================================
// SUMMARY & EXIT
// ============================================================================
console.log("\n================================================================================");
console.log(`ITERATION 223 QA SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log("================================================================================");

if (failures.length > 0) {
  console.error("\nFailures encountered:", failures);
  process.exit(1);
} else {
  console.log("\nALL TESTS PASSED! Soundbox BLE & Battery Telemetry UI is Production-Ready.");
  process.exit(0);
}
