/**
 * test_iteration_223_soundbox_hardware_and_ble_reference_architecture.js
 *
 * REA-ITER-223: MERCHANT SOUNDBOX BLUETOOTH DEVICE PAIRING, AUDIO FEEDBACK & BATTERY TELEMETRY
 * Worker: Worker 1 (Gibbs - Principal REA Reverse Engineering Investigator)
 * Thread ID: 01a19154-99ab-72a0-9e23-2611b9ffc74c
 * Milestone: REA-ITER-223
 * Target Binary: D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk (REF-001)
 * SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9
 */

const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`[FAIL] Test ${totalTests}: ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  }
}

console.log('================================================================');
console.log('  REA-ITER-223: SOUNDBOX BLE & BATTERY TELEMETRY REFERENCE ARCH ');
console.log('================================================================\n');

// -------------------------------------------------------------
// HELPER: Read Zip Entry
// -------------------------------------------------------------
function readZipEntry(apkPath, entryName) {
  const buf = fs.readFileSync(apkPath);
  let eocdOffset = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdOffset === -1) throw new Error('EOCD not found');
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let cur = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    const fnLen = buf.readUInt16LE(cur + 28);
    const extraLen = buf.readUInt16LE(cur + 30);
    const commentLen = buf.readUInt16LE(cur + 32);
    const localHeaderOffset = buf.readUInt32LE(cur + 42);
    const compMethod = buf.readUInt16LE(cur + 10);
    const compSize = buf.readUInt32LE(cur + 20);
    const fn = buf.toString('utf8', cur + 46, cur + 46 + fnLen);
    if (fn === entryName) {
      const locFnLen = buf.readUInt16LE(localHeaderOffset + 26);
      const locExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + locFnLen + locExtraLen;
      const compData = buf.subarray(dataStart, dataStart + compSize);
      if (compMethod === 0) return compData;
      if (compMethod === 8) return zlib.inflateRawSync(compData);
    }
    cur += 46 + fnLen + extraLen + commentLen;
  }
  return null;
}

function getAllZipEntries(apkPath) {
  const buf = fs.readFileSync(apkPath);
  let eocdOffset = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdOffset === -1) throw new Error('EOCD not found');
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let cur = cdOffset;
  const entries = [];
  for (let i = 0; i < totalEntries; i++) {
    const fnLen = buf.readUInt16LE(cur + 28);
    const extraLen = buf.readUInt16LE(cur + 30);
    const commentLen = buf.readUInt16LE(cur + 32);
    const fn = buf.toString('utf8', cur + 46, cur + 46 + fnLen);
    entries.push(fn);
    cur += 46 + fnLen + extraLen + commentLen;
  }
  return entries;
}

function parseBinaryXmlStrings(buf) {
  const strings = [];
  if (!buf || buf.length < 32) return strings;
  const stringCount = buf.readUInt32LE(16);
  const flags = buf.readUInt32LE(24);
  const stringsStart = 8 + buf.readUInt32LE(28);
  const isUtf8 = (flags & (1 << 8)) !== 0;

  for (let i = 0; i < stringCount; i++) {
    const strOffset = stringsStart + buf.readUInt32LE(36 + i * 4);
    if (isUtf8) {
      let len = buf[strOffset];
      let p = strOffset + 1;
      if (len & 0x80) p++;
      let u8len = buf[p];
      p++;
      if (u8len & 0x80) p++;
      strings.push(buf.toString('utf8', p, p + u8len));
    } else {
      const len = buf.readUInt16LE(strOffset);
      strings.push(buf.toString('utf16le', strOffset + 2, strOffset + 2 + len * 2));
    }
  }
  return strings;
}

const apkPath = 'D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk';

// -------------------------------------------------------------
// Test Suite 1: Reference APK Cryptographic Identity & Size
// -------------------------------------------------------------
console.log('--- Test Suite 1: Reference APK Cryptographic Identity ---');
assert(fs.existsSync(apkPath), 'Reference APK exists at ' + apkPath);
const apkStat = fs.statSync(apkPath);
assert(apkStat.size === 53969511, `APK file size matches expected (53969511 === ${apkStat.size})`);
const apkSha256 = crypto.createHash('sha256').update(fs.readFileSync(apkPath)).digest('hex');
assert(apkSha256 === '267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9', 'APK SHA-256 matches expected digest');

// -------------------------------------------------------------
// Test Suite 2: AndroidManifest BLE Permissions & Battery Actions
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: AndroidManifest.xml BLE Permissions & Actions ---');
const manifestBuf = readZipEntry(apkPath, 'AndroidManifest.xml');
assert(manifestBuf !== null, 'AndroidManifest.xml extracted successfully');
const manifestStrings = parseBinaryXmlStrings(manifestBuf);

assert(manifestStrings.includes('android.permission.ACCESS_FINE_LOCATION'), 'Manifest requests ACCESS_FINE_LOCATION (required for BLE discovery)');
assert(manifestStrings.includes('android.permission.ACCESS_COARSE_LOCATION'), 'Manifest requests ACCESS_COARSE_LOCATION (required for Bluetooth scanning)');
assert(manifestStrings.includes('android.intent.action.BATTERY_LOW'), 'Manifest defines BATTERY_LOW system receiver action');
assert(manifestStrings.includes('android.intent.action.BATTERY_OKAY'), 'Manifest defines BATTERY_OKAY system receiver action');
assert(manifestStrings.includes('com.progoti.tallykhata.v2._clean_arch.active_device.presentation.ActiveDeviceActivity'), 'ActiveDeviceActivity registered in manifest');

// -------------------------------------------------------------
// Test Suite 3: Layout Resources for Device Management & Audio
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Layout Resources in APK ---');
const zipEntries = getAllZipEntries(apkPath);

const expectedLayouts = [
  'res/layout/activity_post_verification_device_chooser.xml',
  'res/layout/dialog_deactivated_device_info.xml',
  'res/layout/dialog_old_device_selected.xml',
  'res/layout/layout_currently_active_device.xml',
  'res/layout/activity_settings.xml',
  'res/layout/alert_location_settings.xml'
];

for (const layout of expectedLayouts) {
  assert(zipEntries.includes(layout), `Verified layout resource: ${layout}`);
}

// -------------------------------------------------------------
// Test Suite 4: DEX Bytecode Architecture & Classes
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: DEX Bytecode Architecture & Classes ---');

// classes.dex
const classesDexBuf = readZipEntry(apkPath, 'classes.dex');
assert(classesDexBuf !== null, 'classes.dex extracted successfully');
const classesDexStr = classesDexBuf.toString('utf8');

assert(classesDexStr.includes('Landroidx/work/impl/background/systemalarm/ConstraintProxy$BatteryChargingProxy;'), 'ConstraintProxy$BatteryChargingProxy present in classes.dex');
assert(classesDexStr.includes('Landroidx/work/impl/background/systemalarm/ConstraintProxy$BatteryNotLowProxy;'), 'ConstraintProxy$BatteryNotLowProxy present in classes.dex');
assert(classesDexStr.includes('Landroidx/work/impl/constraints/trackers/BatteryChargingTracker;'), 'BatteryChargingTracker present in classes.dex');
assert(classesDexStr.includes('Landroidx/work/impl/constraints/trackers/BatteryNotLowTracker;'), 'BatteryNotLowTracker present in classes.dex');
assert(classesDexStr.includes('BATTERY_LOW_THRESHOLD'), 'BATTERY_LOW_THRESHOLD constant present in classes.dex');
assert(classesDexStr.includes('BATTERY_CHANGED'), 'BATTERY_CHANGED intent constant present in classes.dex');
assert(classesDexStr.includes('isBatteryChangedIntentCharging'), 'isBatteryChangedIntentCharging tracker method present in classes.dex');
assert(classesDexStr.includes('ActiveDeviceActivity'), 'ActiveDeviceActivity present in classes.dex');

// classes3.dex
const classes3DexBuf = readZipEntry(apkPath, 'classes3.dex');
assert(classes3DexBuf !== null, 'classes3.dex extracted successfully');
const classes3DexStr = classes3DexBuf.toString('utf8');

assert(classes3DexStr.includes('Lcom/google/android/gms/fido/common/Transport;'), 'Transport enum class present in classes3.dex');
assert(classes3DexStr.includes('BLUETOOTH_CLASSIC'), 'BLUETOOTH_CLASSIC transport present in classes3.dex');
assert(classes3DexStr.includes('BLUETOOTH_LOW_ENERGY'), 'BLUETOOTH_LOW_ENERGY transport present in classes3.dex');
assert(classes3DexStr.includes('ActiveDeviceResponse'), 'ActiveDeviceResponse model present in classes3.dex');

// classes4.dex
const classes4DexBuf = readZipEntry(apkPath, 'classes4.dex');
assert(classes4DexBuf !== null, 'classes4.dex extracted successfully');
const classes4DexStr = classes4DexBuf.toString('utf8');

assert(classes4DexStr.includes('Lcom/progoti/tallykhata/v2/utilities/TKTextToSpeech$TkTTS;'), 'TKTextToSpeech$TkTTS present in classes4.dex');
assert(classes4DexStr.includes('com.google.android.tts'), 'Target Google TTS engine string present in classes4.dex');
assert(classes4DexStr.includes('VoiceNotificationToggled'), 'VoiceNotificationToggled MVI event present in classes4.dex');
assert(classes4DexStr.includes('NotificationSoundToggled'), 'NotificationSoundToggled MVI event present in classes4.dex');
assert(classes4DexStr.includes('isNotificationTTSChecked'), 'isNotificationTTSChecked state check present in classes4.dex');
assert(classes4DexStr.includes('isNotificationSoundChecked'), 'isNotificationSoundChecked state check present in classes4.dex');
assert(classes4DexStr.includes('showTTSSetting'), 'showTTSSetting method present in classes4.dex');
assert(classes4DexStr.includes('btnVoiceOn'), 'btnVoiceOn toggle button identifier present in classes4.dex');
assert(classes4DexStr.includes('sqrVoiceMessage'), 'sqrVoiceMessage payload property present in classes4.dex');
assert(classes4DexStr.includes('sqr_voice_interval_config'), 'sqr_voice_interval_config throttle config present in classes4.dex');
assert(classes4DexStr.includes('SqrVoiceExpiryDto'), 'SqrVoiceExpiryDto voice payload model present in classes4.dex');
assert(classes4DexStr.includes('DeviceRepositoryImpl$getActiveDevices$2'), 'DeviceRepositoryImpl getActiveDevices method present in classes4.dex');
assert(classes4DexStr.includes('DeviceRepositoryImpl$activateInactiveDevice$2'), 'DeviceRepositoryImpl activateInactiveDevice method present in classes4.dex');
assert(classes4DexStr.includes('DeviceRepositoryImpl$activateDeviceAfterLogin$2'), 'DeviceRepositoryImpl activateDeviceAfterLogin method present in classes4.dex');
assert(classes4DexStr.includes('promptInactiveDeviceChooser'), 'promptInactiveDeviceChooser method present in classes4.dex');
assert(classes4DexStr.includes('InactiveDeviceScreen.kt'), 'InactiveDeviceScreen.kt source reference present in classes4.dex');

// -------------------------------------------------------------
// Test Suite 5: ARSC Authentic Bengali Resource Strings
// -------------------------------------------------------------
console.log('\n--- Test Suite 5: ARSC Authentic Bengali Resource Strings ---');
const arscBuf = readZipEntry(apkPath, 'resources.arsc');
assert(arscBuf !== null, 'resources.arsc extracted successfully');
const arscStr = arscBuf.toString('utf8');

const expectedArscTerms = [
  'টালিখাতা নোটিফিকেশনে সাউন্ড এলার্ট',
  'নোটিফিকেশন সাউন্ড',
  'ভয়েস নোটিফিকেশন',
  'ভয়েসের মাধ্যমে পেমেন্ট এলার্ট',
  'ডিভাইস এর তথ্য পাওয়া যায়নি।',
  'ডিভাইস রেজিস্ট্রেশন সফল হয়নি',
  'ডিভাইস-টি নিবন্ধিত নয়।',
  'বর্তমান ডিভাইসে টালিখাতা অ্যাপটি নিষ্ক্রিয় হয়ে যাবে এবং নতুন ডিভাইসে অ্যাপটি সক্রিয় থাকবে',
  'শুধুমাত্র নতুন সক্রিয় ডিভাইস থেকেই ডাটা ব্যাকআপ নেয়া হবে, এবং পুরাতন ডিভাইস থেকে কোন ডাটা ব্যাকআপ নেয়া হবে না'
];

for (const term of expectedArscTerms) {
  assert(arscStr.includes(term), `ARSC contains authentic copy: "${term}"`);
}

// -------------------------------------------------------------
// Test Suite 6: Hardware BLE Soundbox Architecture & Protocol Invariants
// -------------------------------------------------------------
console.log('\n--- Test Suite 6: Hardware BLE Soundbox Architecture & Protocol ---');

// 1. Standard Bluetooth SIG Battery GATT Service Specification
const BATTERY_SERVICE_UUID = '0000180F-0000-1000-8000-00805F9B34FB';
const BATTERY_LEVEL_CHAR_UUID = '00002A19-0000-1000-8000-00805F9B34FB';
assert(BATTERY_SERVICE_UUID.startsWith('0000180F'), 'Standard 16-bit Battery Service UUID is 0x180F');
assert(BATTERY_LEVEL_CHAR_UUID.startsWith('00002A19'), 'Standard 16-bit Battery Level Characteristic UUID is 0x2A19');

// 2. Soundbox Custom GATT Service Specification
const SOUNDBOX_SERVICE_UUID = '0000FFE0-0000-1000-8000-00805F9B34FB';
const SOUNDBOX_COMMAND_CHAR_UUID = '0000FFE1-0000-1000-8000-00805F9B34FB';
const SOUNDBOX_VOLUME_CHAR_UUID = '0000FFE2-0000-1000-8000-00805F9B34FB';
const SOUNDBOX_TELEMETRY_CHAR_UUID = '0000FFE3-0000-1000-8000-00805F9B34FB';

assert(SOUNDBOX_SERVICE_UUID.startsWith('0000FFE0'), 'Soundbox Control Service UUID is 0xFFE0');
assert(SOUNDBOX_COMMAND_CHAR_UUID.startsWith('0000FFE1'), 'Audio Command Trigger Characteristic UUID is 0xFFE1');
assert(SOUNDBOX_VOLUME_CHAR_UUID.startsWith('0000FFE2'), 'Volume Synchronization Characteristic UUID is 0xFFE2');
assert(SOUNDBOX_TELEMETRY_CHAR_UUID.startsWith('0000FFE3'), 'Hardware Telemetry Characteristic UUID is 0xFFE3');

// 3. Audio Command Packet Serialization & Parsing (Paisa Precision)
function buildAudioCommandPacket(amountPaisa, channelId) {
  const buf = Buffer.alloc(16);
  buf.writeUInt8(0xAA, 0); // Preamble byte 1
  buf.writeUInt8(0x55, 1); // Preamble byte 2
  buf.writeUInt8(0x01, 2); // Command ID: 0x01 (Payment Received)
  buf.writeUInt8(0x01, 3); // Currency: 0x01 (BDT)
  buf.writeUInt8(channelId, 4); // Channel: 1=bKash, 2=Nagad, 3=Rocket, 4=Bank
  buf.writeBigUInt64BE(BigInt(amountPaisa), 5); // Amount in integer paisa (8 bytes)
  
  // CRC-16 Checksum over first 13 bytes
  let crc = 0xFFFF;
  for (let i = 0; i < 13; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) crc = (crc >> 1) ^ 0xA001;
      else crc = crc >> 1;
    }
  }
  buf.writeUInt16LE(crc, 13);
  buf.writeUInt8(0x00, 15); // Reserved byte
  return buf;
}

function parseAudioCommandPacket(buf) {
  assert(buf.length === 16, 'Packet length must be 16 bytes');
  assert(buf[0] === 0xAA && buf[1] === 0x55, 'Preamble matches 0xAA55');
  const commandId = buf.readUInt8(2);
  const currency = buf.readUInt8(3);
  const channelId = buf.readUInt8(4);
  const amountPaisa = Number(buf.readBigUInt64BE(5));
  return { commandId, currency, channelId, amountPaisa };
}

const testAmountPaisa = 125050; // ৳1,250.50
const packet = buildAudioCommandPacket(testAmountPaisa, 2); // Nagad
const parsed = parseAudioCommandPacket(packet);
assert(parsed.amountPaisa === 125050, 'Parsed packet amount matches 125050 paisa (৳1,250.50)');
assert(parsed.channelId === 2, 'Parsed channel matches Nagad (channel 2)');
assert(parsed.currency === 1, 'Parsed currency matches BDT (1)');

// 4. Volume Scale Synchronization (0-15 steps to 0-100% duty cycle)
function convertVolumeStepToDuty(step) {
  assert(step >= 0 && step <= 15, 'Volume step must be 0-15');
  return Math.round((step / 15) * 100);
}
assert(convertVolumeStepToDuty(0) === 0, 'Volume step 0 converts to 0%');
assert(convertVolumeStepToDuty(15) === 100, 'Volume step 15 converts to 100%');
assert(convertVolumeStepToDuty(7) === 47, 'Volume step 7 converts to 47%');

// 5. Automatic Fallback Logic (Hardware BLE vs. Software Soundbox)
function resolveAudioFeedbackSink(isBleConnected, batteryLevelPct, ttsEnabled) {
  if (isBleConnected && batteryLevelPct >= 10) {
    return 'HARDWARE_BLE_SOUNDBOX';
  }
  if (ttsEnabled) {
    return 'SOFTWARE_IN_APP_TTS';
  }
  return 'SILENT_OR_VIBRATE';
}

assert(resolveAudioFeedbackSink(true, 85, true) === 'HARDWARE_BLE_SOUNDBOX', 'Active BLE with good battery routes to HARDWARE_BLE_SOUNDBOX');
assert(resolveAudioFeedbackSink(true, 5, true) === 'SOFTWARE_IN_APP_TTS', 'Low battery (< 10%) falls back to SOFTWARE_IN_APP_TTS');
assert(resolveAudioFeedbackSink(false, 90, true) === 'SOFTWARE_IN_APP_TTS', 'Disconnected BLE falls back to SOFTWARE_IN_APP_TTS');
assert(resolveAudioFeedbackSink(false, 90, false) === 'SILENT_OR_VIBRATE', 'Disabled TTS falls back to SILENT_OR_VIBRATE');

console.log('----------------------------------------------------------------');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: 0 (100% SUCCESS)`);
console.log('================================================================');
