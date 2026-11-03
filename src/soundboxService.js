/**
 * src/soundboxService.js
 *
 * Clean-Room Merchant QR Soundbox & Audible Voice Notification Engine
 * Generates Bengali voice prompts and serializes soundbox playback in loud shop environments.
 *
 * Milestone: REA-ITER-221
 * Target Reference: REF-001 (TallyKhata-Demo.apk)
 */

const crypto = require('crypto');
let voucherPdfService = null;
try {
  voucherPdfService = require('./voucherPdfService');
} catch (e) {}

/**
 * Converts numbers to Bengali words using voucherPdfService or built-in fallback.
 *
 * @param {number} amount
 * @returns {string} Words in Bengali (e.g. "পাঁচশত টাকা মাত্র")
 */
function toBengaliWords(amount) {
  if (voucherPdfService && typeof voucherPdfService.numberToBengaliWords === 'function') {
    return voucherPdfService.numberToBengaliWords(amount);
  }
  return `${amount} টাকা মাত্র`;
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

  const appNameBn = payment.appNameBn || payment.appName || 'পেমেন্ট';
  const appNameEn = payment.appNameEn || payment.typeName || 'Digital Payment';

  // Authentic Bengali announcement: e.g. "বিকাশ থেকে পাঁচশত টাকা পেয়েছেন।"
  const speechTextBn = `${appNameBn} থেকে ${bengaliWords.replace(' মাত্র', '')} টাকা সফলভাবে জমা হয়েছে।`;
  const speechTextEn = `Received ${formattedAmount} Taka successfully via ${appNameEn}.`;
  const shortPromptBn = `টাকা পেয়েছেন: ৳ ${amount.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}`;

  const promptId = 'sb_evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const nowIso = new Date().toISOString();

  return {
    id: promptId,
    transactionNumber: payment.transactionNumber || `BQR-${Date.now().toString().slice(-6)}`,
    amount,
    paisa,
    appNameBn,
    appNameEn,
    speechTextBn,
    speechTextEn,
    shortPromptBn,
    timestamp: nowIso,
    durationMs: Math.min(6000, Math.max(2000, Math.round(speechTextBn.length * 120))),
    soundFrequencyHz: 440, // Standard audio prompt pitch
    played: false,
    volume: 5, // Default max volume for bazaar
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
    this.volume = 5; // 1 to 5
    this.muted = false;
    this.isPlaying = false;
    this.maxHistory = 100;
  }

  /**
   * Enqueues a new audio notification event.
   *
   * @param {object} prompt - Audio prompt event
   * @returns {number} Current queue length
   */
  enqueue(prompt) {
    if (!prompt || typeof prompt !== 'object') return this.queue.length;
    const item = { ...prompt, enqueuedAt: Date.now() };
    this.queue.push(item);
    return this.queue.length;
  }

  /**
   * Dequeues the next notification event for playback.
   *
   * @returns {object|null} Next notification event or null
   */
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

  /**
   * Peeks at the next item in the queue without removing it.
   *
   * @returns {object|null} Next item or null
   */
  peek() {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /**
   * Returns current pending queue items.
   *
   * @returns {Array<object>} Pending queue
   */
  getPendingItems() {
    return [...this.queue];
  }

  /**
   * Returns playback history.
   *
   * @returns {Array<object>} Played history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clears all pending notifications.
   */
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

module.exports = {
  generateSoundboxPrompt,
  SoundboxQueueManager,
  soundboxQueueManager: defaultSoundboxQueue,
};
