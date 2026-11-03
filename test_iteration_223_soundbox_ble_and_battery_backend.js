/**
 * test_iteration_223_soundbox_ble_and_battery_backend.js
 *
 * REA-ITER-223: Hardware BLE Soundbox Controller & Battery Telemetry Engine Test Suite
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic / Backend & Data Architect)
 * Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 * Milestone: REA-ITER-223
 */

const assert = require("assert");
const {
  CONNECTION_STATES,
  BATTERY_THRESHOLDS,
  ROUTING_TARGETS,
  GATT_UUIDS,
  SOUNDBOX_CHANNELS,
  SOUNDBOX_COMMANDS,
  CURRENCY_CODES,
  calculatePacketCrc16,
  buildAudioCommandPacket,
  parseAudioCommandPacket,
  convertVolumeStepToDuty,
  convertDutyToVolumeStep,
  convertSoftwareVolumeToHardware,
  convertHardwareVolumeToSoftware,
  resolveAudioFeedbackSink,
  createDefaultDeviceModel,
  SoundboxDeviceManager,
  soundboxDeviceManager,
  SoundboxQueueManager,
  generateSoundboxPrompt,
} = require("./src/soundboxService");

const {
  StorageRepository,
  createDefaultState,
  saveSoundboxDeviceSettings,
  getSoundboxDeviceSettings,
  logSoundboxTelemetry,
  getSoundboxTelemetry,
} = require("./src/storageRepository");

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log("  ✓ [PASS] " + name);
    passedTests++;
  } catch (err) {
    console.error("  ✗ [FAIL] " + name);
    console.error(err);
    process.exit(1);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log("  ✓ [PASS] " + name);
    passedTests++;
  } catch (err) {
    console.error("  ✗ [FAIL] " + name);
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("TALLYKHATA ITERATION 223: SOUNDBOX BLE & BATTERY BACKEND TEST SUITE");
  console.log("Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)");
  console.log("Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895");
  console.log("================================================================================\n");

  // 1. Protocol Constants
  console.log("--- 1. Protocol Constants & GATT Specification ---");
  runTest("Protocol constants and GATT UUIDs conform to Bluetooth SIG & Soundbox spec", () => {
    assert.strictEqual(CONNECTION_STATES.DISCONNECTED, "DISCONNECTED");
    assert.strictEqual(CONNECTION_STATES.SCANNING, "SCANNING");
    assert.strictEqual(CONNECTION_STATES.CONNECTING, "CONNECTING");
    assert.strictEqual(CONNECTION_STATES.CONNECTED, "CONNECTED");
    assert.strictEqual(CONNECTION_STATES.ERROR, "ERROR");

    assert.strictEqual(BATTERY_THRESHOLDS.BATTERY_LOW_THRESHOLD, 15);
    assert.strictEqual(BATTERY_THRESHOLDS.BATTERY_CRITICAL_THRESHOLD, 10);

    assert.strictEqual(ROUTING_TARGETS.HARDWARE_BLE_SOUNDBOX, "HARDWARE_BLE_SOUNDBOX");
    assert.strictEqual(ROUTING_TARGETS.SOFTWARE_IN_APP_TTS, "SOFTWARE_IN_APP_TTS");
    assert.strictEqual(ROUTING_TARGETS.SILENT_OR_VIBRATE, "SILENT_OR_VIBRATE");

    assert(GATT_UUIDS.BATTERY_SERVICE.startsWith("0000180F"), "Battery Service must start with 0x180F");
    assert(GATT_UUIDS.BATTERY_LEVEL_CHAR.startsWith("00002A19"), "Battery Level Characteristic must start with 0x2A19");
    assert(GATT_UUIDS.SOUNDBOX_SERVICE.startsWith("0000FFE0"), "Soundbox Service must start with 0xFFE0");
    assert(GATT_UUIDS.SOUNDBOX_COMMAND_CHAR.startsWith("0000FFE1"), "Audio Command Char must start with 0xFFE1");
    assert(GATT_UUIDS.SOUNDBOX_VOLUME_CHAR.startsWith("0000FFE2"), "Volume Sync Char must start with 0xFFE2");
    assert(GATT_UUIDS.SOUNDBOX_TELEMETRY_CHAR.startsWith("0000FFE3"), "Telemetry Char must start with 0xFFE3");

    assert.strictEqual(SOUNDBOX_CHANNELS.DEFAULT, 0x00);
    assert.strictEqual(SOUNDBOX_CHANNELS.BKASH, 0x01);
    assert.strictEqual(SOUNDBOX_CHANNELS.NAGAD, 0x02);
    assert.strictEqual(SOUNDBOX_CHANNELS.ROCKET, 0x03);
    assert.strictEqual(SOUNDBOX_CHANNELS.BANGLA_QR, 0x04);
    assert.strictEqual(SOUNDBOX_CHANNELS.UPAY, 0x05);
    assert.strictEqual(SOUNDBOX_CHANNELS.CASH, 0x06);

    assert.strictEqual(CURRENCY_CODES.BDT, 0x01);
  });

  // 2. Device Connection State Machine
  console.log("\n--- 2. Device Connection State Machine ---");
  runTest("SoundboxDeviceManager executes valid state transitions", () => {
    const manager = new SoundboxDeviceManager();

    assert.strictEqual(manager.getState(), CONNECTION_STATES.DISCONNECTED);
    assert.strictEqual(manager.isConnected(), false);
    assert.strictEqual(manager.isScanning(), false);

    // 1. Start Scan
    const scanRes = manager.startScan();
    assert.strictEqual(scanRes.success, true);
    assert.strictEqual(manager.getState(), CONNECTION_STATES.SCANNING);
    assert.strictEqual(manager.isScanning(), true);

    // 2. Stop Scan
    manager.stopScan();
    assert.strictEqual(manager.getState(), CONNECTION_STATES.DISCONNECTED);

    // 3. Connect to Device
    const deviceInfo = {
      id: "sb_hw_01",
      name: "TallyKhata Soundbox Pro",
      macAddress: "DC:0D:30:11:22:33",
      batteryLevel: 95,
      volumeLevel: 12,
    };
    const connRes = manager.connect(deviceInfo);
    assert.strictEqual(connRes.success, true);
    assert.strictEqual(manager.getState(), CONNECTION_STATES.CONNECTED);
    assert.strictEqual(manager.isConnected(), true);

    const dev = manager.getDevice();
    assert.strictEqual(dev.id, "sb_hw_01");
    assert.strictEqual(dev.name, "TallyKhata Soundbox Pro");
    assert.strictEqual(dev.macAddress, "DC:0D:30:11:22:33");
    assert.strictEqual(dev.batteryLevel, 95);
    assert.strictEqual(dev.volumeLevel, 12);

    // 4. Disconnect
    const discRes = manager.disconnect();
    assert.strictEqual(discRes.success, true);
    assert.strictEqual(manager.getState(), CONNECTION_STATES.DISCONNECTED);
    assert.strictEqual(manager.isConnected(), false);

    // 5. Error State Handling
    const errRes = manager.setError(new Error("BLE connection timeout"));
    assert.strictEqual(errRes.success, false);
    assert.strictEqual(manager.getState(), CONNECTION_STATES.ERROR);
    assert.strictEqual(manager.lastError, "BLE connection timeout");

    // 6. Reset
    manager.reset();
    assert.strictEqual(manager.getState(), CONNECTION_STATES.DISCONNECTED);
    assert.strictEqual(manager.getDevice(), null);
  });

  // 3. 0xFFE1 Binary Packet Encoding & CRC-16
  console.log("\n--- 3. 0xFFE1 Binary Packet Encoding & CRC-16 Integrity ---");
  runTest("buildAudioCommandPacket encodes 16-byte buffer with exact layout and CRC-16", () => {
    const amountPaisa = 125050; // ৳1,250.50
    const channelId = 2; // Nagad

    const packet = buildAudioCommandPacket(amountPaisa, channelId);

    assert.strictEqual(packet.length, 16, "Packet length must be 16 bytes");
    assert.strictEqual(packet[0], 0xAA, "Preamble byte 1 must be 0xAA");
    assert.strictEqual(packet[1], 0x55, "Preamble byte 2 must be 0x55");
    assert.strictEqual(packet[2], 0x01, "Command ID must be 0x01 (Payment announcement)");
    assert.strictEqual(packet[3], 0x01, "Currency must be 0x01 (BDT)");
    assert.strictEqual(packet[4], 0x02, "Channel ID must be 0x02 (Nagad)");

    const readPaisa = Number(packet.readBigUInt64BE(5));
    assert.strictEqual(readPaisa, 125050, "Paisa amount must match 125050");

    const expectedCrc = calculatePacketCrc16(packet, 13);
    const readCrc = packet.readUInt16LE(13);
    assert.strictEqual(readCrc, expectedCrc, "CRC-16 Little-Endian must match calculated CRC");
    assert.strictEqual(packet[15], 0x00, "Byte 15 must be 0x00 reserved");

    // Parse and verify
    const parsed = parseAudioCommandPacket(packet);
    assert.strictEqual(parsed.isValid, true);
    assert.strictEqual(parsed.commandId, 1);
    assert.strictEqual(parsed.currency, 1);
    assert.strictEqual(parsed.channelId, 2);
    assert.strictEqual(parsed.amountPaisa, 125050);
    assert.strictEqual(parsed.amountTaka, "1250.50");
    assert.strictEqual(parsed.isCrcValid, true);
  });

  runTest("Tampered packet fails CRC-16 verification", () => {
    const packet = buildAudioCommandPacket(50000, 1); // ৳500.00 via bKash
    const tampered = Buffer.from(packet);

    // Flip bit in amount byte 6
    tampered[6] ^= 0x01;

    const parsed = parseAudioCommandPacket(tampered);
    assert.strictEqual(parsed.isCrcValid, false, "Tampered packet must fail CRC check");
    assert.strictEqual(parsed.isValid, false);
  });

  runTest("Integer paisa arithmetic handles extreme boundaries without float drift", () => {
    // 1 paisa (0.01 Taka)
    const p1 = buildAudioCommandPacket(1, "bkash");
    const parsed1 = parseAudioCommandPacket(p1);
    assert.strictEqual(parsed1.amountPaisa, 1);
    assert.strictEqual(parsed1.amountTaka, "0.01");
    assert.strictEqual(parsed1.channelId, 0x01);

    // 10 Crore Taka (100,000,000 Taka = 10,000,000,000 Paisa)
    const tenCrorePaisa = 10000000000n;
    const pBig = buildAudioCommandPacket(tenCrorePaisa, "bangla_qr");
    const parsedBig = parseAudioCommandPacket(pBig);
    assert.strictEqual(parsedBig.amountPaisa, 10000000000);
    assert.strictEqual(parsedBig.channelId, 0x04);
    assert.strictEqual(parsedBig.isValid, true);
  });

  // 4. Battery Telemetry & State Monitoring
  console.log("\n--- 4. Battery Telemetry & Automatic Threshold Logic ---");
  runTest("updateBatteryTelemetry tracks normal, low, and critical thresholds", () => {
    const manager = new SoundboxDeviceManager();
    manager.connect({ batteryLevel: 100, isCharging: false });

    let lowBatteryTriggered = false;
    let criticalBatteryTriggered = false;

    manager.on("lowBattery", () => { lowBatteryTriggered = true; });
    manager.on("criticalBattery", () => { criticalBatteryTriggered = true; });

    // 1. Normal state (50%)
    const tNormal = manager.updateBatteryTelemetry(50, true);
    assert.strictEqual(tNormal.status, "NORMAL");
    assert.strictEqual(tNormal.isLow, false);
    assert.strictEqual(tNormal.isCritical, false);
    assert.strictEqual(tNormal.shouldFallback, false);
    assert.strictEqual(tNormal.isCharging, true);
    assert.strictEqual(manager.getBatteryStatus(), "NORMAL");
    assert.strictEqual(manager.isLowBattery(), false);
    assert.strictEqual(manager.isCriticalBattery(), false);

    // 2. Low battery state (15%)
    const tLow = manager.updateBatteryTelemetry(15, false);
    assert.strictEqual(tLow.status, "LOW");
    assert.strictEqual(tLow.isLow, true);
    assert.strictEqual(tLow.isCritical, false);
    assert.strictEqual(tLow.shouldFallback, false);
    assert.strictEqual(manager.getBatteryStatus(), "LOW");
    assert.strictEqual(manager.isLowBattery(), true);
    assert.strictEqual(manager.isCriticalBattery(), false);
    assert.strictEqual(lowBatteryTriggered, true);

    // 3. Critical battery state (9%)
    const tCrit = manager.updateBatteryTelemetry(9, false);
    assert.strictEqual(tCrit.status, "CRITICAL");
    assert.strictEqual(tCrit.isLow, true);
    assert.strictEqual(tCrit.isCritical, true);
    assert.strictEqual(tCrit.shouldFallback, true);
    assert.strictEqual(manager.getBatteryStatus(), "CRITICAL");
    assert.strictEqual(manager.isCriticalBattery(), true);
    assert.strictEqual(criticalBatteryTriggered, true);

    // 4. Telemetry history check
    const history = manager.getTelemetryHistory();
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[0].batteryLevel, 9);
    assert.strictEqual(history[1].batteryLevel, 15);
    assert.strictEqual(history[2].batteryLevel, 50);
  });

  // 5. Volume Synchronization
  console.log("\n--- 5. Volume Synchronization (Hardware 0-15 vs Software 1-5) ---");
  runTest("Volume conversion and bidirectional synchronization", () => {
    // Duty cycle conversions
    assert.strictEqual(convertVolumeStepToDuty(0), 0);
    assert.strictEqual(convertVolumeStepToDuty(7), 47);
    assert.strictEqual(convertVolumeStepToDuty(15), 100);

    assert.strictEqual(convertDutyToVolumeStep(0), 0);
    assert.strictEqual(convertDutyToVolumeStep(47), 7);
    assert.strictEqual(convertDutyToVolumeStep(100), 15);

    // Software (1..5) to Hardware (0..15)
    assert.strictEqual(convertSoftwareVolumeToHardware(1), 3);
    assert.strictEqual(convertSoftwareVolumeToHardware(2), 6);
    assert.strictEqual(convertSoftwareVolumeToHardware(3), 9);
    assert.strictEqual(convertSoftwareVolumeToHardware(4), 12);
    assert.strictEqual(convertSoftwareVolumeToHardware(5), 15);

    // Hardware (0..15) to Software (1..5)
    assert.strictEqual(convertHardwareVolumeToSoftware(0), 1);
    assert.strictEqual(convertHardwareVolumeToSoftware(3), 1);
    assert.strictEqual(convertHardwareVolumeToSoftware(6), 2);
    assert.strictEqual(convertHardwareVolumeToSoftware(9), 3);
    assert.strictEqual(convertHardwareVolumeToSoftware(12), 4);
    assert.strictEqual(convertHardwareVolumeToSoftware(15), 5);

    // Device manager volume sync
    const manager = new SoundboxDeviceManager();
    manager.connect({ volumeLevel: 15 });

    const syncHwRes = manager.syncHardwareVolume(9);
    assert.strictEqual(syncHwRes.hardwareVolume, 9);
    assert.strictEqual(syncHwRes.softwareVolume, 3);
    assert.strictEqual(manager.queueManager.getVolume(), 3);

    const syncSwRes = manager.syncSoftwareVolume(5);
    assert.strictEqual(syncSwRes.softwareVolume, 5);
    assert.strictEqual(syncSwRes.hardwareVolume, 15);
    assert.strictEqual(manager.getDevice().volumeLevel, 15);
  });

  // 6. Dual Audio Routing & Failover
  console.log("\n--- 6. Dual Audio Routing & Automatic Fallback Engine ---");
  runTest("resolveAudioFeedbackSink adheres to connectivity and power invariants", () => {
    // Connected + good battery (>= 10%)
    assert.strictEqual(resolveAudioFeedbackSink(true, 100), ROUTING_TARGETS.HARDWARE_BLE_SOUNDBOX);
    assert.strictEqual(resolveAudioFeedbackSink(true, 10), ROUTING_TARGETS.HARDWARE_BLE_SOUNDBOX);

    // Connected + critical battery (< 10%)
    assert.strictEqual(resolveAudioFeedbackSink(true, 9), ROUTING_TARGETS.SOFTWARE_IN_APP_TTS);
    assert.strictEqual(resolveAudioFeedbackSink(true, 0), ROUTING_TARGETS.SOFTWARE_IN_APP_TTS);

    // Disconnected
    assert.strictEqual(resolveAudioFeedbackSink(false, 100), ROUTING_TARGETS.SOFTWARE_IN_APP_TTS);
    assert.strictEqual(resolveAudioFeedbackSink(false, 100, true), ROUTING_TARGETS.SOFTWARE_IN_APP_TTS);
    assert.strictEqual(resolveAudioFeedbackSink(false, 100, false), ROUTING_TARGETS.SILENT_OR_VIBRATE);
  });

  runTest("routeAudioNotification routes to hardware when connected and battery >= 10%", () => {
    const manager = new SoundboxDeviceManager();
    manager.connect({ batteryLevel: 80, isCharging: false });

    const payment = {
      amount: 750,
      appNameBn: "বিকাশ",
      channelId: SOUNDBOX_CHANNELS.BKASH,
    };

    const routeRes = manager.routeAudioNotification(payment);
    assert.strictEqual(routeRes.target, ROUTING_TARGETS.HARDWARE_BLE_SOUNDBOX);
    assert.strictEqual(routeRes.dispatched, true);
    assert(Buffer.isBuffer(routeRes.packet), "Packet must be Buffer");
    assert.strictEqual(routeRes.packet.length, 16);
    assert.strictEqual(routeRes.channelId, 1);
    assert.strictEqual(routeRes.paisa, 75000);

    const parsed = parseAudioCommandPacket(routeRes.packet);
    assert.strictEqual(parsed.amountPaisa, 75000);
    assert.strictEqual(parsed.channelId, 1);
    assert.strictEqual(parsed.isValid, true);
  });

  runTest("routeAudioNotification falls back to Software TTS on low battery (< 10%)", () => {
    const manager = new SoundboxDeviceManager();
    manager.connect({ batteryLevel: 5, isCharging: false });

    const payment = {
      amount: 1200,
      appNameBn: "নগদ",
    };

    const routeRes = manager.routeAudioNotification(payment);
    assert.strictEqual(routeRes.target, ROUTING_TARGETS.SOFTWARE_IN_APP_TTS);
    assert.strictEqual(routeRes.dispatched, true);
    assert.strictEqual(routeRes.packet, null);
    assert.strictEqual(routeRes.fallbackReason, "LOW_BATTERY");
    assert(routeRes.queueLength >= 1);
    assert.strictEqual(routeRes.prompt.amount, 1200);
  });

  runTest("routeAudioNotification falls back to Software TTS when disconnected", () => {
    const manager = new SoundboxDeviceManager();
    manager.disconnect();

    const payment = {
      amount: 300,
      appNameBn: "রকেট",
    };

    const routeRes = manager.routeAudioNotification(payment);
    assert.strictEqual(routeRes.target, ROUTING_TARGETS.SOFTWARE_IN_APP_TTS);
    assert.strictEqual(routeRes.dispatched, true);
    assert.strictEqual(routeRes.fallbackReason, "BLE_DISCONNECTED");
  });

  runTest("routeAudioNotification returns SILENT_OR_VIBRATE when TTS is disabled", () => {
    const manager = new SoundboxDeviceManager();
    manager.disconnect();

    const payment = { amount: 500 };
    const routeRes = manager.routeAudioNotification(payment, { ttsEnabled: false });

    assert.strictEqual(routeRes.target, ROUTING_TARGETS.SILENT_OR_VIBRATE);
    assert.strictEqual(routeRes.dispatched, false);
    assert.strictEqual(routeRes.reason, "TTS_DISABLED");
  });

  // 7. Storage Persistence & Multi-Tenant Isolation
  console.log("\n--- 7. Storage Persistence, Mutex & Multi-Tenant Isolation ---");
  await runAsyncTest("saveSoundboxDeviceSettings & getSoundboxDeviceSettings isolate across businesses", async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    // Save for Business 1
    const b1Settings = {
      id: "sb_b1_01",
      name: "Mobile Xpress Soundbox",
      macAddress: "11:22:33:44:55:66",
      volumeLevel: 15,
      autoConnect: true,
    };
    const save1 = await repo.saveSoundboxDeviceSettings(b1Settings, { businessId: "1" });
    assert.strictEqual(save1.success, true);
    assert.strictEqual(save1.settings.businessId, "1");

    // Save for Business 2
    const b2Settings = {
      id: "sb_b2_02",
      name: "Bhai Bhai Enterprise Soundbox",
      macAddress: "AA:BB:CC:DD:EE:FF",
      volumeLevel: 9,
      autoConnect: false,
    };
    const save2 = await repo.saveSoundboxDeviceSettings(b2Settings, { businessId: "2" });
    assert.strictEqual(save2.success, true);
    assert.strictEqual(save2.settings.businessId, "2");

    // Verify retrieval isolation
    const get1 = repo.getSoundboxDeviceSettings("1");
    const get2 = repo.getSoundboxDeviceSettings("2");

    assert.strictEqual(get1.id, "sb_b1_01");
    assert.strictEqual(get1.macAddress, "11:22:33:44:55:66");
    assert.strictEqual(get1.volumeLevel, 15);

    assert.strictEqual(get2.id, "sb_b2_02");
    assert.strictEqual(get2.macAddress, "AA:BB:CC:DD:EE:FF");
    assert.strictEqual(get2.volumeLevel, 9);
  });

  await runAsyncTest("logSoundboxTelemetry & getSoundboxTelemetry record and isolate logs", async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    // Log telemetry for Business 1
    const log1 = await repo.logSoundboxTelemetry({
      batteryLevel: 14,
      isCharging: false,
      status: "LOW",
      rssi: -65,
    }, { businessId: "1" });
    assert.strictEqual(log1.success, true);

    // Log telemetry for Business 2
    const log2 = await repo.logSoundboxTelemetry({
      batteryLevel: 85,
      isCharging: true,
      status: "NORMAL",
      rssi: -50,
    }, { businessId: "2" });
    assert.strictEqual(log2.success, true);

    const t1 = repo.getSoundboxTelemetry("1");
    const t2 = repo.getSoundboxTelemetry("2");

    assert.strictEqual(t1.length, 1);
    assert.strictEqual(t1[0].batteryLevel, 14);
    assert.strictEqual(t1[0].status, "LOW");

    assert.strictEqual(t2.length, 1);
    assert.strictEqual(t2[0].batteryLevel, 85);
    assert.strictEqual(t2[0].isCharging, true);
  });

  await runAsyncTest("getFullBackupState sanitizes live tokens, socket handles, and live RSSI", async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    await repo.saveSoundboxDeviceSettings({
      id: "sb_sec_01",
      macAddress: "AA:11:22:33:44:55",
      connectionToken: "secret_ble_session_token_xyz",
      socketHandle: 9942,
      rssi: -45,
      isConnected: true,
      connectionState: "CONNECTED",
      volumeLevel: 12,
    }, { businessId: "1" });

    const backup = await repo.getFullBackupState();
    const sanitizedSettings = backup.soundboxSettings["1"];

    assert.strictEqual(sanitizedSettings.id, "sb_sec_01");
    assert.strictEqual(sanitizedSettings.volumeLevel, 12);
    assert.strictEqual(sanitizedSettings.isConnected, false, "Backup must mark device disconnected");
    assert.strictEqual(sanitizedSettings.connectionState, "DISCONNECTED");
    assert.strictEqual(sanitizedSettings.connectionToken, undefined, "connectionToken must be stripped");
    assert.strictEqual(sanitizedSettings.socketHandle, undefined, "socketHandle must be stripped");
    assert.strictEqual(sanitizedSettings.rssi, undefined, "live RSSI must be stripped");
  });

  await runAsyncTest("deleteBusinessCascade purges soundboxSettings and telemetry logs for target business", async () => {
    const repo = new StorageRepository();
    await repo.initialize();

    const b2Id = "2"; // Existing default business

    // Save settings and telemetry for Business 2
    await repo.saveSoundboxDeviceSettings({ id: "sb_temp_02", name: "Temp Soundbox" }, { businessId: b2Id });
    await repo.logSoundboxTelemetry({ batteryLevel: 25 }, { businessId: b2Id });

    // Ensure Business 1 also has settings
    await repo.saveSoundboxDeviceSettings({ id: "sb_main_01", name: "Main Shop Soundbox" }, { businessId: "1" });
    await repo.logSoundboxTelemetry({ batteryLevel: 90 }, { businessId: "1" });

    // Verify before deletion
    assert(repo.getSoundboxDeviceSettings(b2Id) !== null);
    assert.strictEqual(repo.getSoundboxTelemetry(b2Id).length, 1);

    // Cascade delete Business 2
    const delRes = await repo.deleteBusinessCascade(b2Id);
    assert.strictEqual(delRes.success, true);

    // Assert Business 2 soundbox data is completely purged
    assert.strictEqual(repo.getSoundboxDeviceSettings(b2Id), null, "Deleted business settings must be null");
    assert.strictEqual(repo.getSoundboxTelemetry(b2Id).length, 0, "Deleted business telemetry must be purged");

    // Assert Business 1 soundbox data is preserved
    assert(repo.getSoundboxDeviceSettings("1") !== null, "Business 1 settings must remain intact");
    assert.strictEqual(repo.getSoundboxTelemetry("1").length, 1, "Business 1 telemetry must remain intact");
  });

  await runAsyncTest("Standalone exported repository helpers function correctly", async () => {
    const saveRes = await saveSoundboxDeviceSettings({ id: "sb_top_level", volumeLevel: 10 });
    assert.strictEqual(saveRes.success, true);

    const getRes = getSoundboxDeviceSettings();
    assert.strictEqual(getRes.id, "sb_top_level");
    assert.strictEqual(getRes.volumeLevel, 10);

    const logRes = await logSoundboxTelemetry({ batteryLevel: 75, status: "NORMAL" });
    assert.strictEqual(logRes.success, true);

    const teleList = getSoundboxTelemetry();
    assert(teleList.length >= 1);
    assert.strictEqual(teleList[0].batteryLevel, 75);
  });

  console.log("\n================================================================================");
  console.log("TOTAL: " + totalTests + " | PASSED: " + passedTests + " | FAILED: 0 (100% SUCCESS)");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
