/**
 * src/soundboxService.js
 *
 * Clean-Room Merchant QR Soundbox, Audible Voice Notification Engine,
 * Hardware BLE Soundbox Controller & Battery Telemetry Engine
 *
 * Generates Bengali voice prompts, manages sequential audio queues,
 * controls BLE Soundbox peripheral connectivity, serializes 0xFFE1 binary packets,
 * tracks battery telemetry, synchronizes volume scales, and executes dual-routing.
 *
 * Milestone: REA-ITER-223
 * Target Reference: REF-001 (TallyKhata-Demo.apk)
 */

const crypto = require("crypto");
let voucherPdfService = null;
try {
  voucherPdfService = require("./voucherPdfService");
} catch (e) {}

// ============================================================================
// CONSTANTS & PROTOCOL ENUMS
// ============================================================================

/**
 * BLE Peripheral Connection State Machine
 */
const CONNECTION_STATES = Object.freeze({
  DISCONNECTED: "DISCONNECTED",
  SCANNING: "SCANNING",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  ERROR: "ERROR",
});

/**
 * Battery Telemetry Thresholds
 * Reference: BatteryChargingTracker & BATTERY_LOW_THRESHOLD in REF-001 classes.dex
 */
const BATTERY_THRESHOLDS = Object.freeze({
  BATTERY_LOW_THRESHOLD: 15,       // <= 15%: Low battery advisory
  BATTERY_CRITICAL_THRESHOLD: 10,  // < 10%: Critical battery; fails over to Software TTS
});

/**
 * Audio Feedback Routing Sinks
 */
const ROUTING_TARGETS = Object.freeze({
  HARDWARE_BLE_SOUNDBOX: "HARDWARE_BLE_SOUNDBOX",
  SOFTWARE_IN_APP_TTS: "SOFTWARE_IN_APP_TTS",
  SILENT_OR_VIBRATE: "SILENT_OR_VIBRATE",
});

/**
 * Standard Bluetooth SIG & Custom Soundbox GATT UUIDs
 */
const GATT_UUIDS = Object.freeze({
  // Bluetooth SIG Adopted Battery Service
  BATTERY_SERVICE: "0000180F-0000-1000-8000-00805F9B34FB",
  BATTERY_LEVEL_CHAR: "00002A19-0000-1000-8000-00805F9B34FB",

  // Custom Soundbox Control Service & Characteristics
  SOUNDBOX_SERVICE: "0000FFE0-0000-1000-8000-00805F9B34FB",
  SOUNDBOX_COMMAND_CHAR: "0000FFE1-0000-1000-8000-00805F9B34FB",
  SOUNDBOX_VOLUME_CHAR: "0000FFE2-0000-1000-8000-00805F9B34FB",
  SOUNDBOX_TELEMETRY_CHAR: "0000FFE3-0000-1000-8000-00805F9B34FB",
});

/**
 * Transaction Channel Identifiers
 */
const SOUNDBOX_CHANNELS = Object.freeze({
  DEFAULT: 0x00,
  BKASH: 0x01,
  NAGAD: 0x02,
  ROCKET: 0x03,
  BANGLA_QR: 0x04,
  UPAY: 0x05,
  CASH: 0x06,
});

/**
 * Channel Name to Byte Mapping
 */
const CHANNEL_NAME_MAP = Object.freeze({
  default: 0x00,
  cash: 0x06,
  bkash: 0x01,
  b_kash: 0x01,
  nagad: 0x02,
  rocket: 0x03,
  bangla_qr: 0x04,
  banglaqr: 0x04,
  bank: 0x04,
  upay: 0x05,
});

/**
 * Soundbox Hardware Command IDs
 */
const SOUNDBOX_COMMANDS = Object.freeze({
  PAYMENT_ANNOUNCEMENT: 0x01,
  VOLUME_SET: 0x02,
  PING_HEARTBEAT: 0x03,
});

/**
 * ISO Currency Codes
 */
const CURRENCY_CODES = Object.freeze({
  BDT: 0x01, // Bangladeshi Taka
});

// ============================================================================
// CRC-16 & BINARY PACKET ENCODING (0xFFE1 GATT CHARACTERISTIC)
// ============================================================================

/**
 * Calculates standard 16-bit CRC-16 (Modbus/ARC, polynomial 0xA001, initial 0xFFFF)
 * over payload bytes.
 *
 * @param {Buffer} buf - Packet buffer
 * @param {number} [length=13] - Number of bytes to compute checksum over
 * @returns {number} 16-bit unsigned integer checksum
 */
function calculatePacketCrc16(buf, length = 13) {
  const len = Math.min(buf.length, length !== undefined ? length : 13);
  let crc = 0xFFFF;
  for (let i = 0; i < len; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc = crc >> 1;
      }
    }
  }
  return crc & 0xFFFF;
}

/**
 * Builds an authentic 16-byte binary payment announcement command packet for 0xFFE1.
 *
 * Packet layout:
 * - Bytes 0..1:   0xAA 0x55 (Preamble)
 * - Byte 2:       0x01 (Command ID: Payment Received)
 * - Byte 3:       0x01 (Currency: BDT)
 * - Byte 4:       channelId (1=bKash, 2=Nagad, 3=Rocket, 4=Bank/BanglaQR, etc.)
 * - Bytes 5..12:  BigUInt64BE amount in integer paisa (1 Taka = 100 Paisa)
 * - Bytes 13..14: CRC-16 checksum (Little-Endian UInt16)
 * - Byte 15:      0x00 (Reserved delimiter byte)
 *
 * @param {number|bigint} amountPaisa - Integer paisa amount (1 Taka = 100 Paisa)
 * @param {number|string} [channelId=0x00] - Payment channel ID or name
 * @param {object} [options={}] - Additional packet options
 * @returns {Buffer} 16-byte binary Buffer
 */
function buildAudioCommandPacket(amountPaisa, channelId = 0x00, options = {}) {
  let paisaVal;
  if (typeof amountPaisa === "bigint") {
    paisaVal = amountPaisa;
  } else {
    paisaVal = BigInt(Math.max(0, Math.round(Number(amountPaisa || 0))));
  }

  let chan = 0x00;
  if (typeof channelId === "string") {
    chan = CHANNEL_NAME_MAP[channelId.toLowerCase()] !== undefined
      ? CHANNEL_NAME_MAP[channelId.toLowerCase()]
      : 0x00;
  } else if (!isNaN(Number(channelId))) {
    chan = Math.max(0, Math.min(255, Number(channelId)));
  }

  const cmd = options.commandId !== undefined ? Number(options.commandId) : SOUNDBOX_COMMANDS.PAYMENT_ANNOUNCEMENT;
  const cur = options.currency !== undefined ? Number(options.currency) : CURRENCY_CODES.BDT;

  const buf = Buffer.alloc(16);
  buf.writeUInt8(0xAA, 0); // Preamble byte 1
  buf.writeUInt8(0x55, 1); // Preamble byte 2
  buf.writeUInt8(cmd, 2);  // Command ID
  buf.writeUInt8(cur, 3);  // Currency code (0x01 = BDT)
  buf.writeUInt8(chan, 4); // Channel ID
  buf.writeBigUInt64BE(paisaVal, 5); // 8-byte BigInt amount in paisa

  // Compute CRC-16 over the first 13 bytes
  const crc = calculatePacketCrc16(buf, 13);
  buf.writeUInt16LE(crc, 13);
  buf.writeUInt8(options.reservedByte !== undefined ? options.reservedByte : 0x00, 15);

  return buf;
}

/**
 * Parses and verifies a 15 or 16-byte binary payment announcement packet.
 *
 * @param {Buffer} buf - Raw binary packet Buffer
 * @returns {object} Parsed packet fields and validity status
 */
function parseAudioCommandPacket(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 15) {
    throw new Error("Invalid packet length: " + (buf ? buf.length : 0) + ", expected 15 or 16 bytes");
  }
  if (buf[0] !== 0xAA || buf[1] !== 0x55) {
    throw new Error("Invalid packet preamble: 0x" + buf[0].toString(16) + " 0x" + buf[1].toString(16) + ", expected 0xAA 0x55");
  }

  const commandId = buf.readUInt8(2);
  const currency = buf.readUInt8(3);
  const channelId = buf.readUInt8(4);
  const amountPaisa = Number(buf.readBigUInt64BE(5));
  const packetCrc = buf.readUInt16LE(13);
  const expectedCrc = calculatePacketCrc16(buf, 13);
  const isCrcValid = packetCrc === expectedCrc;

  return {
    commandId,
    currency,
    channelId,
    amountPaisa,
    amountTaka: (amountPaisa / 100).toFixed(2),
    crc: packetCrc,
    expectedCrc,
    isCrcValid,
    isValid: isCrcValid,
    rawBytes: buf,
  };
}

// ============================================================================
// VOLUME CONVERSION & SYNCHRONIZATION HELPERS
// ============================================================================

/**
 * Converts hardware volume step (0-15) to duty cycle percentage (0-100%).
 *
 * @param {number} step - Hardware volume step (0..15)
 * @returns {number} Duty cycle percentage (0..100)
 */
function convertVolumeStepToDuty(step) {
  const s = Math.max(0, Math.min(15, Number(step !== undefined && step !== null ? step : 0)));
  return Math.round((s / 15) * 100);
}

/**
 * Converts duty cycle percentage (0-100%) to hardware volume step (0-15).
 *
 * @param {number} duty - Duty cycle percentage (0..100)
 * @returns {number} Hardware volume step (0..15)
 */
function convertDutyToVolumeStep(duty) {
  const d = Math.max(0, Math.min(100, Number(duty !== undefined && duty !== null ? duty : 0)));
  return Math.max(0, Math.min(15, Math.round((d / 100) * 15)));
}

/**
 * Converts Software Queue volume scale (1..5) to Hardware volume steps (0..15).
 * Mapping: 1 -> 3, 2 -> 6, 3 -> 9, 4 -> 12, 5 -> 15.
 *
 * @param {number} swVol - Software volume level (1..5)
 * @returns {number} Hardware volume step (0..15)
 */
function convertSoftwareVolumeToHardware(swVol) {
  const v = Math.max(1, Math.min(5, Math.round(Number(swVol || 5))));
  return Math.max(0, Math.min(15, Math.round(v * 3)));
}

/**
 * Converts Hardware volume step (0..15) to Software Queue volume scale (1..5).
 * Mapping: 0 -> 1, 1..3 -> 1, 4..6 -> 2, 7..9 -> 3, 10..12 -> 4, 13..15 -> 5.
 *
 * @param {number} hwStep - Hardware volume step (0..15)
 * @returns {number} Software volume level (1..5)
 */
function convertHardwareVolumeToSoftware(hwStep) {
  const s = Math.max(0, Math.min(15, Math.round(Number(hwStep !== undefined && hwStep !== null ? hwStep : 15))));
  return Math.max(1, Math.min(5, Math.round(s / 3)));
}

/**
 * Resolves destination audio feedback sink based on connectivity, battery level, and TTS configuration.
 *
 * @param {boolean} isBleConnected - Whether hardware BLE soundbox is currently connected
 * @param {number} batteryLevelPct - Soundbox battery percentage (0..100)
 * @param {boolean} [ttsEnabled=true] - Whether in-app TTS is enabled
 * @returns {string} One of ROUTING_TARGETS
 */
function resolveAudioFeedbackSink(isBleConnected, batteryLevelPct, ttsEnabled = true) {
  if (isBleConnected && Number(batteryLevelPct) >= BATTERY_THRESHOLDS.BATTERY_CRITICAL_THRESHOLD) {
    return ROUTING_TARGETS.HARDWARE_BLE_SOUNDBOX;
  }
  if (ttsEnabled) {
    return ROUTING_TARGETS.SOFTWARE_IN_APP_TTS;
  }
  return ROUTING_TARGETS.SILENT_OR_VIBRATE;
}

/**
 * Creates default BLE Soundbox device model schema.
 *
 * @param {object} [overrides={}] 
 * @returns {object} Standard BLE Soundbox device model
 */
function createDefaultDeviceModel(overrides = {}) {
  const nowIso = new Date().toISOString();
  return {
    id: overrides.id || ("tk_sb_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6)),
    name: overrides.name || "TallyKhata Soundbox Pro",
    macAddress: overrides.macAddress || "AA:BB:CC:DD:EE:FF",
    rssi: overrides.rssi !== undefined ? Number(overrides.rssi) : -60,
    batteryLevel: overrides.batteryLevel !== undefined ? Math.max(0, Math.min(100, Number(overrides.batteryLevel))) : 100,
    isCharging: !!overrides.isCharging,
    lastSeen: overrides.lastSeen || nowIso,
    volumeLevel: overrides.volumeLevel !== undefined ? Math.max(0, Math.min(15, Number(overrides.volumeLevel))) : 15,
    firmwareVersion: overrides.firmwareVersion || "1.0.0",
    modelNumber: overrides.modelNumber || "TK-SB-01",
    channel: overrides.channel || "BLE_GATT",
  };
}

// ============================================================================
// SOUNDBOX PROMPT GENERATOR & SOFTWARE TTS QUEUE
// ============================================================================

/**
 * Converts numbers to Bengali words using voucherPdfService or built-in fallback.
 *
 * @param {number} amount
 * @returns {string} Words in Bengali (e.g. "পাঁচশত টাকা মাত্র")
 */
function toBengaliWords(amount) {
  if (voucherPdfService && typeof voucherPdfService.numberToBengaliWords === "function") {
    return voucherPdfService.numberToBengaliWords(amount);
  }
  return amount + " টাকা মাত্র";
}

/**
 * Generates an authentic Bengali Soundbox voice notification prompt for an inward payment.
 *
 * @param {object} payment - Payment details (amount, app, transactionNumber, etc.)
 * @returns {object} Structured Soundbox voice notification event
 */
function generateSoundboxPrompt(payment = {}) {
  const amount = Number(payment.amount || 0);
  const paisa = Math.round(amount * 100);
  const formattedAmount = (paisa / 100).toFixed(2);
  const bengaliWords = toBengaliWords(amount);

  const appNameBn = payment.appNameBn || payment.appName || "পেমেন্ট";
  const appNameEn = payment.appNameEn || payment.typeName || "Digital Payment";

  const speechTextBn = appNameBn + " থেকে " + bengaliWords.replace(" মাত্র", "") + " টাকা সফলভাবে জমা হয়েছে।";
  const speechTextEn = "Received " + formattedAmount + " Taka successfully via " + appNameEn + ".";
  const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  const bnFormatted = formattedAmount.replace(/[0-9]/g, (d) => BN_DIGITS[d]);
  const shortPromptBn = "টাকা পেয়েছেন: ৳ " + bnFormatted;

  const promptId = "sb_evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
  const nowIso = new Date().toISOString();

  return {
    id: promptId,
    transactionNumber: payment.transactionNumber || ("BQR-" + Date.now().toString().slice(-6)),
    amount,
    paisa,
    appNameBn,
    appNameEn,
    speechTextBn,
    speechTextEn,
    shortPromptBn,
    timestamp: nowIso,
    durationMs: Math.min(6000, Math.max(2000, Math.round(speechTextBn.length * 120))),
    soundFrequencyHz: 440,
    played: false,
    volume: 5,
  };
}

/**
 * In-memory Soundbox Playback FIFO Queue Manager.
 * Serializes audible announcements so concurrent customer payments are announced sequentially.
 */
class SoundboxQueueManager {
  constructor() {
    this.queue = [];
    this.history = [];
    this.volume = 5;
    this.muted = false;
    this.isPlaying = false;
    this.maxHistory = 100;
  }

  enqueue(prompt) {
    if (!prompt || typeof prompt !== "object") return this.queue.length;
    const item = { ...prompt, enqueuedAt: Date.now() };
    this.queue.push(item);
    return this.queue.length;
  }

  dequeue() {
    if (this.queue.length === 0) return null;
    const item = this.queue.shift();
    item.played = true;
    item.playedAt = Date.now();
    this.history.unshift(item);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
    return item;
  }

  peek() {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  getPendingItems() {
    return [...this.queue];
  }

  getHistory() {
    return [...this.history];
  }

  clear() {
    this.queue = [];
  }

  setVolume(vol) {
    const v = (vol !== undefined && vol !== null && !isNaN(Number(vol))) ? Number(vol) : 5;
    this.volume = Math.max(1, Math.min(5, Math.round(v)));
    return this.volume;
  }

  getVolume() {
    return this.volume;
  }

  setMuted(isMuted) {
    this.muted = !!isMuted;
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  getStatus() {
    return {
      pendingCount: this.queue.length,
      historyCount: this.history.length,
      volume: this.volume,
      muted: this.muted,
      isPlaying: this.isPlaying,
    };
  }
}

const defaultSoundboxQueue = new SoundboxQueueManager();

// ============================================================================
// HARDWARE BLE SOUNDBOX CONTROLLER & BATTERY TELEMETRY ENGINE
// ============================================================================

/**
 * Hardware BLE Soundbox Controller.
 * Manages Bluetooth peripheral connection lifecycle, battery telemetry tracking,
 * 0xFFE1 binary packet transmission, volume synchronization, and dual routing.
 */
class SoundboxDeviceManager {
  constructor(options = {}) {
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.device = null;
    this.telemetryHistory = [];
    this.maxTelemetryHistory = options.maxTelemetryHistory || 100;
    this.queueManager = options.queueManager || defaultSoundboxQueue;
    this.lastError = null;
    this.listeners = new Map();
  }

  getState() {
    return this.connectionState;
  }

  getConnectionState() {
    return this.connectionState;
  }

  getDevice() {
    return this.device ? { ...this.device } : null;
  }

  isConnected() {
    return this.connectionState === CONNECTION_STATES.CONNECTED;
  }

  isScanning() {
    return this.connectionState === CONNECTION_STATES.SCANNING;
  }

  isConnecting() {
    return this.connectionState === CONNECTION_STATES.CONNECTING;
  }

  getBatteryLevel() {
    return this.device ? this.device.batteryLevel : 0;
  }

  isCharging() {
    return this.device ? !!this.device.isCharging : false;
  }

  isLowBattery() {
    const level = this.getBatteryLevel();
    return level <= BATTERY_THRESHOLDS.BATTERY_LOW_THRESHOLD;
  }

  isCriticalBattery() {
    const level = this.getBatteryLevel();
    return level < BATTERY_THRESHOLDS.BATTERY_CRITICAL_THRESHOLD;
  }

  getBatteryStatus() {
    const level = this.getBatteryLevel();
    if (level < BATTERY_THRESHOLDS.BATTERY_CRITICAL_THRESHOLD) return "CRITICAL";
    if (level <= BATTERY_THRESHOLDS.BATTERY_LOW_THRESHOLD) return "LOW";
    return "NORMAL";
  }

  startScan(options = {}) {
    this.connectionState = CONNECTION_STATES.SCANNING;
    this.lastError = null;
    this._emit("stateChanged", { state: this.connectionState });
    return { success: true, state: this.connectionState };
  }

  stopScan() {
    if (this.connectionState === CONNECTION_STATES.SCANNING) {
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
      this._emit("stateChanged", { state: this.connectionState });
    }
    return { success: true, state: this.connectionState };
  }

  connect(deviceInfo = {}) {
    this.connectionState = CONNECTION_STATES.CONNECTING;
    this._emit("stateChanged", { state: this.connectionState });

    this.device = createDefaultDeviceModel(deviceInfo);
    this.connectionState = CONNECTION_STATES.CONNECTED;
    this.lastError = null;

    // Synchronize volume to software queue
    const swVol = convertHardwareVolumeToSoftware(this.device.volumeLevel);
    this.queueManager.setVolume(swVol);

    const snapshot = this.getDevice();
    this._emit("stateChanged", { state: this.connectionState, device: snapshot });
    this._emit("connected", { device: snapshot });

    return { success: true, state: this.connectionState, device: snapshot };
  }

  disconnect() {
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    if (this.device) {
      this.device.lastSeen = new Date().toISOString();
    }
    const snapshot = this.getDevice();
    this._emit("stateChanged", { state: this.connectionState, device: snapshot });
    this._emit("disconnected", { device: snapshot });
    return { success: true, state: this.connectionState };
  }

  setError(error) {
    this.connectionState = CONNECTION_STATES.ERROR;
    this.lastError = error instanceof Error ? error.message : String(error || "UNKNOWN_ERROR");
    this._emit("stateChanged", { state: this.connectionState, error: this.lastError });
    this._emit("error", { error: this.lastError });
    return { success: false, state: this.connectionState, error: this.lastError };
  }

  updateBatteryTelemetry(batteryLevel, isCharging = false) {
    const level = Math.max(0, Math.min(100, Math.round(Number(batteryLevel || 0))));
    const charging = !!isCharging;
    const nowIso = new Date().toISOString();

    if (this.device) {
      this.device.batteryLevel = level;
      this.device.isCharging = charging;
      this.device.lastSeen = nowIso;
    }

    const isLow = level <= BATTERY_THRESHOLDS.BATTERY_LOW_THRESHOLD;
    const isCritical = level < BATTERY_THRESHOLDS.BATTERY_CRITICAL_THRESHOLD;
    const status = isCritical ? "CRITICAL" : (isLow ? "LOW" : "NORMAL");
    const shouldFallback = isCritical;

    const telemetryEvent = {
      id: "sbt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      deviceId: this.device?.id || null,
      macAddress: this.device?.macAddress || null,
      batteryLevel: level,
      isCharging: charging,
      status,
      isLow,
      isCritical,
      shouldFallback,
      rssi: this.device?.rssi ?? -60,
      timestamp: nowIso,
    };

    this.telemetryHistory.unshift(telemetryEvent);
    if (this.telemetryHistory.length > this.maxTelemetryHistory) {
      this.telemetryHistory.pop();
    }

    this._emit("telemetry", telemetryEvent);
    if (isCritical) {
      this._emit("criticalBattery", telemetryEvent);
    } else if (isLow) {
      this._emit("lowBattery", telemetryEvent);
    }

    return telemetryEvent;
  }

  syncHardwareVolume(step) {
    const hwStep = Math.max(0, Math.min(15, Math.round(Number(step !== undefined && step !== null ? step : 15))));
    if (this.device) {
      this.device.volumeLevel = hwStep;
    }
    const swVol = convertHardwareVolumeToSoftware(hwStep);
    this.queueManager.setVolume(swVol);

    const result = {
      hardwareVolume: hwStep,
      softwareVolume: swVol,
      dutyCycle: convertVolumeStepToDuty(hwStep),
    };
    this._emit("volumeSynced", result);
    return result;
  }

  syncSoftwareVolume(swVol) {
    const vol = Math.max(1, Math.min(5, Math.round(Number(swVol || 5))));
    this.queueManager.setVolume(vol);
    const hwStep = convertSoftwareVolumeToHardware(vol);
    if (this.device) {
      this.device.volumeLevel = hwStep;
    }

    const result = {
      hardwareVolume: hwStep,
      softwareVolume: vol,
      dutyCycle: convertVolumeStepToDuty(hwStep),
    };
    this._emit("volumeSynced", result);
    return result;
  }

  getVolume() {
    const hw = this.device?.volumeLevel !== undefined ? this.device.volumeLevel : 15;
    return {
      hardwareVolume: hw,
      softwareVolume: this.queueManager.getVolume(),
      dutyCycle: convertVolumeStepToDuty(hw),
    };
  }

  encodePaymentAnnouncement(amountOrPaisa, channelId = 0x00, options = {}) {
    let paisa = amountOrPaisa;
    if (typeof amountOrPaisa === "number" && !Number.isInteger(amountOrPaisa)) {
      paisa = Math.round(amountOrPaisa * 100);
    }
    return buildAudioCommandPacket(paisa, channelId, options);
  }

  parsePaymentAnnouncement(buf) {
    return parseAudioCommandPacket(buf);
  }

  routeAudioNotification(paymentOrPrompt = {}, options = {}) {
    const isConnected = options.isConnected !== undefined ? !!options.isConnected : this.isConnected();
    const batteryLevel = options.batteryLevel !== undefined ? Number(options.batteryLevel) : this.getBatteryLevel();
    const ttsEnabled = options.ttsEnabled !== undefined ? !!options.ttsEnabled : true;
    const channelId = options.channelId !== undefined
      ? options.channelId
      : (paymentOrPrompt.channelId !== undefined ? paymentOrPrompt.channelId : 0x00);

    const target = resolveAudioFeedbackSink(isConnected, batteryLevel, ttsEnabled);

    const prompt = (paymentOrPrompt && paymentOrPrompt.speechTextBn)
      ? paymentOrPrompt
      : generateSoundboxPrompt(paymentOrPrompt);

    const paisa = prompt.paisa !== undefined ? prompt.paisa : Math.round((Number(prompt.amount) || 0) * 100);

    if (target === ROUTING_TARGETS.HARDWARE_BLE_SOUNDBOX) {
      const packet = this.encodePaymentAnnouncement(paisa, channelId, options);
      const result = {
        target,
        dispatched: true,
        packet,
        prompt,
        batteryLevel,
        isCharging: this.isCharging(),
        connectionState: this.connectionState,
        channelId,
        paisa,
      };
      this._emit("audioRouted", result);
      return result;
    }

    if (target === ROUTING_TARGETS.SOFTWARE_IN_APP_TTS) {
      const qLen = this.queueManager.enqueue(prompt);
      const fallbackReason = !isConnected ? "BLE_DISCONNECTED" : "LOW_BATTERY";
      const result = {
        target,
        dispatched: true,
        prompt,
        packet: null,
        queueLength: qLen,
        fallbackReason,
        batteryLevel,
        isCharging: this.isCharging(),
        connectionState: this.connectionState,
        channelId,
        paisa,
      };
      this._emit("audioRouted", result);
      return result;
    }

    const result = {
      target,
      dispatched: false,
      reason: "TTS_DISABLED",
      prompt,
      packet: null,
      batteryLevel,
      connectionState: this.connectionState,
    };
    this._emit("audioRouted", result);
    return result;
  }

  getTelemetryHistory() {
    return [...this.telemetryHistory];
  }

  clearTelemetryHistory() {
    this.telemetryHistory = [];
  }

  reset() {
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.device = null;
    this.lastError = null;
    this.telemetryHistory = [];
    this.listeners.clear();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const filtered = this.listeners.get(event).filter((cb) => cb !== callback);
    this.listeners.set(event, filtered);
  }

  _emit(event, data) {
    const cbs = this.listeners.get(event) || [];
    for (const cb of cbs) {
      try {
        cb(data);
      } catch (err) {}
    }
  }
}

const defaultSoundboxDeviceManager = new SoundboxDeviceManager();

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  // Legacy / Iteration 221 Exports
  generateSoundboxPrompt,
  SoundboxQueueManager,
  soundboxQueueManager: defaultSoundboxQueue,

  // Protocol Constants
  CONNECTION_STATES,
  BATTERY_THRESHOLDS,
  ROUTING_TARGETS,
  GATT_UUIDS,
  SOUNDBOX_CHANNELS,
  SOUNDBOX_COMMANDS,
  CURRENCY_CODES,

  // CRC-16 & Binary Packet Encoding
  calculatePacketCrc16,
  buildAudioCommandPacket,
  parseAudioCommandPacket,

  // Volume Conversion Helpers
  convertVolumeStepToDuty,
  convertDutyToVolumeStep,
  convertSoftwareVolumeToHardware,
  convertHardwareVolumeToSoftware,

  // Routing & Device Helpers
  resolveAudioFeedbackSink,
  createDefaultDeviceModel,

  // Hardware BLE Controller & Singleton
  SoundboxDeviceManager,
  soundboxDeviceManager: defaultSoundboxDeviceManager,
};
