/**
 * src/audioNoteService.js
 *
 * TALLYKHATA AUDIO NOTE & TAGADA VOICE MESSAGING SERVICE
 * Milestone: REA-ITER-216
 * Integrated by Main Agent Orchestrator combining:
 * - Worker 1 (Gibbs): REA Architecture & Room entity evidence
 * - Worker 2 (Averroes): Storage persistence, state machines, GC & cloud backup sanitization
 * - Worker 3 (Ohm): UI/UX, bilingual formatting, waveform generation & player controls
 */

const fs = require("fs");
const path = require("path");

// --- CONSTANTS ---
const AUDIO_NOTE_SCHEMA_VERSION = 1;
const MAX_RECORDING_SECONDS = 120; // 2 minutes strict limit
const DEFAULT_MAX_RECORDING_DURATION_MS = 120000;

const RECORDING_STATES = Object.freeze({
  IDLE: "IDLE",
  RECORDING: "RECORDING",
  PAUSED: "PAUSED",
  STOPPED: "STOPPED",
});

const PLAYBACK_STATES = Object.freeze({
  IDLE: "IDLE",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  STOPPED: "STOPPED",
});

const VALID_ENTITY_TYPES = new Set([
  "customer",
  "supplier",
  "tagada",
  "transaction",
  "general",
]);

const SUPPORTED_MIME_TYPES = new Set([
  "audio/m4a",
  "audio/aac",
  "audio/3gpp",
  "audio/amr",
  "audio/mp4",
]);

const BN_NUMS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

// --- NUMERAL & DURATION CONVERSIONS ---
function toBengaliNumeral(val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[0-9]/g, (d) => BN_NUMS[parseInt(d, 10)] || d);
}

const toBengaliDigits = toBengaliNumeral;

function toAsciiDigits(val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[০-৯]/g, (d) => String(BN_NUMS.indexOf(d)));
}

function formatDuration(durationMs, options = { locale: "bn" }) {
  const ms = Math.max(0, Math.floor(Number(durationMs) || 0));
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => (n < 10 ? "0" + n : String(n));

  let res = "";
  if (hours > 0) {
    res = pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
  } else {
    res = pad(minutes) + ":" + pad(seconds);
  }

  const locale = options && options.locale ? options.locale : "bn";
  return locale === "bn" ? toBengaliNumeral(res) : res;
}

function formatAudioDuration(totalSeconds, lang = "bn") {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const mm = String(m);
  const ss = s < 10 ? "0" + s : String(s);
  const res = mm + ":" + ss;
  return lang === "bn" ? toBengaliNumeral(res) : res;
}

function formatTimerRatio(currentSec, totalSec = MAX_RECORDING_SECONDS, lang = "bn") {
  const c = formatAudioDuration(currentSec, lang);
  const t = formatAudioDuration(totalSec, lang);
  return c + " / " + t;
}

function parseDuration(durationStr) {
  if (!durationStr || typeof durationStr !== "string") return 0;
  const ascii = toAsciiDigits(durationStr.trim());
  const parts = ascii.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return 0;
}

function formatFileSize(bytes, options = { locale: "en" }) {
  const b = Math.max(0, Number(bytes) || 0);
  const locale = options && options.locale ? options.locale : "en";

  let formatted = "";
  if (b < 1024) {
    formatted = b + (locale === "bn" ? " বাইট" : " B");
  } else if (b < 1048576) {
    const kb = (b / 1024).toFixed(1).replace(/\.0$/, "");
    formatted = kb + (locale === "bn" ? " কেবি" : " KB");
  } else {
    const mb = (b / 1048576).toFixed(1).replace(/\.0$/, "");
    formatted = mb + (locale === "bn" ? " এমবি" : " MB");
  }
  return locale === "bn" ? toBengaliNumeral(formatted) : formatted;
}

function calculateAudioProgress(currentSec, totalSec = MAX_RECORDING_SECONDS) {
  const c = Math.max(0, Number(currentSec) || 0);
  const t = Math.max(0.001, Number(totalSec) || MAX_RECORDING_SECONDS);
  return Math.min(1.0, Math.max(0.0, c / t));
}

function generateWaveformSamples(count = 20, seed = null) {
  const samples = [];
  let s = typeof seed === "number" ? seed : 42;
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280;
    // float between 0.15 and 0.95
    samples.push(Math.round((0.15 + rnd * 0.8) * 100) / 100);
  }
  return samples;
}

function generateAudioNoteId() {
  return "audio_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function generateAudioFileName(entityType, entityId, ext = "m4a") {
  return "voice_" + (entityType || "note") + "_" + (entityId || "0") + "_" + Date.now() + "." + ext;
}

function resolveAudioDirectory(customPath = null) {
  if (customPath) return customPath;
  return path.join("audio_notes");
}

// --- METADATA & VALIDATION ---
function createAudioNoteMetadata(props = {}) {
  if (!props || typeof props !== "object") {
    throw new Error("Audio note properties must be an object");
  }
  if (!VALID_ENTITY_TYPES.has(props.entityType)) {
    throw new Error("Invalid entityType: " + props.entityType);
  }
  if (!props.entityId) {
    throw new Error("entityId is required for audio note metadata");
  }

  const durationMs = Math.max(0, Math.floor(Number(props.durationMs) || 0));
  const fileSizeBytes = Math.max(0, Math.floor(Number(props.fileSizeBytes) || 0));

  return {
    id: props.id || generateAudioNoteId(),
    fileName: props.fileName || generateAudioFileName(props.entityType, props.entityId),
    fileUri: props.fileUri || null,
    durationMs,
    fileSizeBytes,
    mimeType: props.mimeType || "audio/m4a",
    createdAt: props.createdAt || new Date().toISOString(),
    entityType: props.entityType,
    entityId: String(props.entityId),
    businessId: props.businessId ? String(props.businessId) : "1",
    title: props.title || "ভয়েস নোট",
    isSynced: Boolean(props.isSynced),
    waveform: Array.isArray(props.waveform) ? props.waveform : generateWaveformSamples(20),
    version: AUDIO_NOTE_SCHEMA_VERSION,
  };
}

function createVoiceNoteRecord(props = {}) {
  const entityType = props.entityType || props.targetType || "customer";
  const entityId = props.entityId || props.targetId || "general";
  const durationSec = props.durationSec !== undefined 
    ? Number(props.durationSec) 
    : Math.round((Number(props.durationMs) || 0) / 1000);
  const durationMs = props.durationMs !== undefined 
    ? Number(props.durationMs) 
    : durationSec * 1000;

  const metadata = createAudioNoteMetadata({
    ...props,
    entityType,
    entityId,
    durationMs,
  });

  return {
    ...metadata,
    targetId: String(entityId),
    targetType: String(entityType),
    durationSec: Math.max(1, Math.min(MAX_RECORDING_SECONDS, Math.round(durationSec) || 1)),
    uri: metadata.fileUri || `file:///data/user/0/com.tallykhata/voice_notes/${metadata.id}.m4a`,
    status: "saved",
  };
}

function validateAudioNote(note) {
  const errors = [];
  if (!note || typeof note !== "object") {
    return { isValid: false, errors: ["Audio note must be an object"] };
  }
  if (!note.id || typeof note.id !== "string") {
    errors.push("Valid string id is required");
  }
  if (typeof note.durationMs !== "number" || note.durationMs < 0) {
    errors.push("durationMs must be a non-negative number");
  }
  if (typeof note.fileSizeBytes !== "number" || note.fileSizeBytes < 0) {
    errors.push("fileSizeBytes must be a non-negative number");
  }
  if (!VALID_ENTITY_TYPES.has(note.entityType)) {
    errors.push("entityType must be one of: " + Array.from(VALID_ENTITY_TYPES).join(", "));
  }
  if (!note.entityId) {
    errors.push("entityId is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function isValidVoiceNote(note) {
  return validateAudioNote(note).isValid;
}

// --- CLOUD SANITIZATION & STORAGE METRICS ---
function sanitizeAudioNotesForBackup(notes = []) {
  if (!Array.isArray(notes)) return [];
  return notes.map((n) => {
    if (!n || typeof n !== "object") return n;
    const {
      audioBlob,
      base64Data,
      data,
      rawBytes,
      blob,
      buffer,
      ...rest
    } = n;
    return {
      ...rest,
      fileUri: null, // Scrub local device paths for portable restore
      backupExcludedBinary: true,
    };
  });
}

function calculateAudioStorageUsage(notes = [], options = {}) {
  const list = Array.isArray(notes) ? notes : [];
  const locale = options && options.locale ? options.locale : "en";

  let totalBytes = 0;
  let totalDurationMs = 0;

  const byEntityType = {
    customer: { count: 0, bytes: 0 },
    supplier: { count: 0, bytes: 0 },
    tagada: { count: 0, bytes: 0 },
    transaction: { count: 0, bytes: 0 },
    general: { count: 0, bytes: 0 },
  };

  for (const n of list) {
    const bytes = Number(n?.fileSizeBytes) || 0;
    const dur = Number(n?.durationMs) || 0;
    totalBytes += bytes;
    totalDurationMs += dur;

    const et = n?.entityType;
    if (byEntityType[et]) {
      byEntityType[et].count++;
      byEntityType[et].bytes += bytes;
    } else {
      byEntityType.general.count++;
      byEntityType.general.bytes += bytes;
    }
  }

  return {
    totalCount: list.length,
    totalBytes,
    totalDurationMs,
    formattedBytes: formatFileSize(totalBytes, { locale }),
    formattedDurationBn: formatDuration(totalDurationMs, { locale: "bn" }),
    formattedDurationEn: formatDuration(totalDurationMs, { locale: "en" }),
    byEntityType,
  };
}

// --- FILE SYSTEM STORAGE & GARBAGE COLLECTION ---
async function deleteAudioFile(fileUri, fsAdapter = null) {
  if (!fileUri) return { success: true, deleted: false };
  const rawPath = String(fileUri).replace(/^file:\/\//, "");

  try {
    if (fsAdapter && typeof fsAdapter.unlink === "function") {
      await fsAdapter.unlink(rawPath);
      return { success: true, deleted: true, fileUri };
    }
    if (fs.existsSync(rawPath)) {
      fs.unlinkSync(rawPath);
      return { success: true, deleted: true, fileUri };
    }
    return { success: true, deleted: false, fileUri };
  } catch (err) {
    return { success: false, deleted: false, error: err.message, fileUri };
  }
}

async function cleanOrphanedAudioFiles(activeNotes = [], directoryPath = null, fsAdapter = null) {
  const dir = directoryPath || resolveAudioDirectory();
  const referencedNames = new Set();

  for (const note of activeNotes) {
    if (note?.fileName) referencedNames.add(path.basename(note.fileName));
    if (note?.fileUri) referencedNames.add(path.basename(String(note.fileUri).replace(/^file:\/\//, "")));
  }

  let scannedCount = 0;
  let referencedCount = 0;
  let orphanedCount = 0;
  let deletedCount = 0;
  let bytesReclaimed = 0;
  const errors = [];

  try {
    if (!fs.existsSync(dir)) {
      return { scannedCount, referencedCount, orphanedCount, deletedCount, bytesReclaimed, errors };
    }

    const files = fs.readdirSync(dir);
    scannedCount = files.length;

    for (const f of files) {
      const fullPath = path.join(dir, f);
      if (referencedNames.has(f)) {
        referencedCount++;
      } else {
        orphanedCount++;
        try {
          const stats = fs.statSync(fullPath);
          const size = stats.size;
          fs.unlinkSync(fullPath);
          deletedCount++;
          bytesReclaimed += size;
        } catch (delErr) {
          errors.push({ file: f, error: delErr.message });
        }
      }
    }
  } catch (scanErr) {
    errors.push({ directory: dir, error: scanErr.message });
  }

  return {
    scannedCount,
    referencedCount,
    orphanedCount,
    deletedCount,
    bytesReclaimed,
    errors,
  };
}

// --- STATE MACHINES ---
class AudioRecorderStateMachine {
  constructor(options = {}) {
    this.tickIntervalMs = options.tickIntervalMs || 25;
    this.state = RECORDING_STATES.IDLE;
    this.durationMs = 0;
    this.timer = null;
    this.listeners = new Map();
    this.currentContext = null;
    this.maxDurationMs = DEFAULT_MAX_RECORDING_DURATION_MS;
  }

  getState() {
    return this.state;
  }

  getDurationMs() {
    return this.durationMs;
  }

  addListener(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(fn);
  }

  removeListener(event, fn) {
    const arr = this.listeners.get(event);
    if (arr) {
      this.listeners.set(event, arr.filter((f) => f !== fn));
    }
  }

  emit(event, data) {
    const arr = this.listeners.get(event);
    if (arr) {
      for (const fn of arr) {
        try { fn(data); } catch (_) {}
      }
    }
  }

  _transitionTo(newState) {
    const from = this.state;
    this.state = newState;
    this.emit("stateChange", { from, to: newState });
  }

  _startTimer() {
    this._stopTimer();
    let lastTime = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      this.durationMs += delta;
      this.emit("tick", { durationMs: this.durationMs });

      if (this.durationMs >= this.maxDurationMs) {
        this._stopTimer();
        this._transitionTo(RECORDING_STATES.STOPPED);
        this.emit("maxDurationReached", { durationMs: this.durationMs, maxDurationMs: this.maxDurationMs });
      }
    }, this.tickIntervalMs);
  }

  _stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async startRecording(context = {}) {
    this.currentContext = { ...context };
    this.maxDurationMs = context.maxDurationMs || DEFAULT_MAX_RECORDING_DURATION_MS;
    this.durationMs = 0;
    this._transitionTo(RECORDING_STATES.RECORDING);
    this._startTimer();
    return { state: this.state, durationMs: this.durationMs };
  }

  async pauseRecording() {
    if (this.state === RECORDING_STATES.RECORDING) {
      this._stopTimer();
      this._transitionTo(RECORDING_STATES.PAUSED);
    }
    return { state: this.state, durationMs: this.durationMs };
  }

  async resumeRecording() {
    if (this.state === RECORDING_STATES.PAUSED) {
      this._transitionTo(RECORDING_STATES.RECORDING);
      this._startTimer();
    }
    return { state: this.state, durationMs: this.durationMs };
  }

  async stopRecording(meta = {}) {
    this._stopTimer();
    this._transitionTo(RECORDING_STATES.STOPPED);

    const note = createAudioNoteMetadata({
      ...this.currentContext,
      durationMs: this.durationMs,
      fileSizeBytes: meta.fileSizeBytes || Math.round(this.durationMs * 4.1),
    });

    return note;
  }

  async cancelRecording() {
    this._stopTimer();
    this.durationMs = 0;
    this.currentContext = null;
    this._transitionTo(RECORDING_STATES.IDLE);
    return { state: this.state, durationMs: 0 };
  }

  reset() {
    this._stopTimer();
    this.durationMs = 0;
    this.currentContext = null;
    this.state = RECORDING_STATES.IDLE;
  }
}

class AudioPlayerStateMachine {
  constructor(options = {}) {
    this.tickIntervalMs = options.tickIntervalMs || 25;
    this.state = PLAYBACK_STATES.IDLE;
    this.positionMs = 0;
    this.durationMs = 0;
    this.timer = null;
    this.listeners = new Map();
    this.currentAudio = null;
  }

  getState() {
    return this.state;
  }

  getPositionMs() {
    return this.positionMs;
  }

  getDurationMs() {
    return this.durationMs;
  }

  addListener(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(fn);
  }

  removeListener(event, fn) {
    const arr = this.listeners.get(event);
    if (arr) {
      this.listeners.set(event, arr.filter((f) => f !== fn));
    }
  }

  emit(event, data) {
    const arr = this.listeners.get(event);
    if (arr) {
      for (const fn of arr) {
        try { fn(data); } catch (_) {}
      }
    }
  }

  _transitionTo(newState) {
    const from = this.state;
    this.state = newState;
    this.emit("stateChange", { from, to: newState });
  }

  _startTimer() {
    this._stopTimer();
    let lastTime = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      this.positionMs += delta;
      this.emit("tick", { positionMs: this.positionMs, durationMs: this.durationMs });

      if (this.positionMs >= this.durationMs) {
        this.positionMs = this.durationMs;
        this._stopTimer();
        this._transitionTo(PLAYBACK_STATES.STOPPED);
        this.emit("ended", { audioNote: this.currentAudio, durationMs: this.durationMs });
      }
    }, this.tickIntervalMs);
  }

  _stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async play(audioNote) {
    this.currentAudio = audioNote;
    this.durationMs = Number(audioNote?.durationMs) || 0;
    this.positionMs = 0;
    this._transitionTo(PLAYBACK_STATES.PLAYING);
    this._startTimer();
    return { state: this.state, positionMs: this.positionMs, durationMs: this.durationMs };
  }

  async pause() {
    if (this.state === PLAYBACK_STATES.PLAYING) {
      this._stopTimer();
      this._transitionTo(PLAYBACK_STATES.PAUSED);
    }
    return { state: this.state, positionMs: this.positionMs };
  }

  async resume() {
    if (this.state === PLAYBACK_STATES.PAUSED) {
      this._transitionTo(PLAYBACK_STATES.PLAYING);
      this._startTimer();
    }
    return { state: this.state, positionMs: this.positionMs };
  }

  async seek(positionMs) {
    this.positionMs = Math.min(this.durationMs, Math.max(0, positionMs));
    this.emit("seek", { positionMs: this.positionMs, durationMs: this.durationMs });
    return { positionMs: this.positionMs };
  }

  async stop() {
    this._stopTimer();
    this.positionMs = 0;
    this._transitionTo(PLAYBACK_STATES.STOPPED);
    return { state: this.state, positionMs: 0 };
  }
}

// --- UI CONTROLLER (OHM HOOK COMPATIBILITY) ---
class AudioController {
  constructor() {
    this.recorderState = {
      isRecording: false,
      isPaused: false,
      elapsedSec: 0,
      durationSec: 0,
      maxSec: MAX_RECORDING_SECONDS,
      uri: null,
      waveform: [],
    };
    this.playbackState = {
      isPlaying: false,
      currentSec: 0,
      totalSec: 0,
      activeNoteId: null,
      uri: null,
    };
    this.listeners = [];
  }

  get recordingState() {
    return this.recorderState;
  }
  set recordingState(val) {
    this.recorderState = val;
  }

  playNote(note) {
    if (!note) return false;
    this.stopPlayback();
    const durSec = note.durationSec || (note.durationMs ? Math.round(note.durationMs / 1000) : 0);
    this.startPlayback(note.id, durSec, note.uri || note.fileUri);
    return true;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    for (const l of this.listeners) {
      try {
        l({
          recorder: { ...this.recorderState },
          playback: { ...this.playbackState },
        });
      } catch (_) {}
    }
  }

  startRecording() {
    this.recorderState = {
      isRecording: true,
      isPaused: false,
      elapsedSec: 0,
      durationSec: 0,
      maxSec: MAX_RECORDING_SECONDS,
      uri: "file:///mock/recording_" + Date.now() + ".m4a",
      waveform: generateWaveformSamples(20, 0.1),
    };
    this.notify();
    return this.recorderState;
  }

  pauseRecording() {
    if (this.recorderState.isRecording) {
      this.recorderState.isPaused = true;
      this.notify();
    }
  }

  resumeRecording() {
    if (this.recorderState.isRecording && this.recorderState.isPaused) {
      this.recorderState.isPaused = false;
      this.notify();
    }
  }

  tickRecording(delta = 1) {
    if (this.recorderState.isRecording && !this.recorderState.isPaused) {
      const next = this.recorderState.elapsedSec + delta;
      if (next >= this.recorderState.maxSec) {
        this.recorderState.elapsedSec = this.recorderState.maxSec;
        this.recorderState.durationSec = this.recorderState.maxSec;
        this.stopRecording();
      } else {
        this.recorderState.elapsedSec = next;
        this.recorderState.durationSec = next;
        this.notify();
      }
    }
  }

  stopRecording() {
    const finalSec = this.recorderState.elapsedSec || this.recorderState.durationSec;
    const uri = this.recorderState.uri;
    const waveform = this.recorderState.waveform;
    this.recorderState = {
      isRecording: false,
      isPaused: false,
      elapsedSec: 0,
      durationSec: finalSec,
      maxSec: MAX_RECORDING_SECONDS,
      uri,
      waveform,
    };
    this.notify();
    return { durationSec: finalSec, uri, waveform };
  }

  startPlayback(noteId, totalSec, uri = null) {
    this.playbackState = {
      isPlaying: true,
      currentSec: 0,
      totalSec: Number(totalSec) || 0,
      activeNoteId: noteId,
      uri,
    };
    this.notify();
  }

  pausePlayback() {
    if (this.playbackState.isPlaying) {
      this.playbackState.isPlaying = false;
      this.notify();
    }
  }

  resumePlayback() {
    if (!this.playbackState.isPlaying && this.playbackState.activeNoteId) {
      this.playbackState.isPlaying = true;
      this.notify();
    }
  }

  tickPlayback(delta = 1) {
    if (!this.playbackState.isPlaying) return;
    const next = this.playbackState.currentSec + delta;
    if (next >= this.playbackState.totalSec) {
      this.stopPlayback();
    } else {
      this.playbackState.currentSec = next;
      this.notify();
    }
  }

  seekPlayback(ratio) {
    const r = Math.min(1, Math.max(0, ratio));
    this.playbackState.currentSec = Math.round(r * this.playbackState.totalSec);
    this.notify();
  }

  stopPlayback() {
    this.playbackState = {
      isPlaying: false,
      currentSec: 0,
      totalSec: 0,
      activeNoteId: null,
      uri: null,
    };
    this.notify();
  }
}

const audioController = new AudioController();

const defaultAudioNoteService = {
  AUDIO_NOTE_SCHEMA_VERSION,
  MAX_RECORDING_SECONDS,
  DEFAULT_MAX_RECORDING_DURATION_MS,
  RECORDING_STATES,
  PLAYBACK_STATES,
  VALID_ENTITY_TYPES,
  SUPPORTED_MIME_TYPES,
  toBengaliNumeral,
  toBengaliDigits,
  toAsciiDigits,
  formatDuration,
  formatAudioDuration,
  formatTimerRatio,
  parseDuration,
  formatFileSize,
  calculateAudioProgress,
  generateWaveformSamples,
  generateAudioNoteId,
  generateAudioFileName,
  resolveAudioDirectory,
  createAudioNoteMetadata,
  createVoiceNoteRecord,
  validateAudioNote,
  isValidVoiceNote,
  sanitizeAudioNotesForBackup,
  calculateAudioStorageUsage,
  deleteAudioFile,
  cleanOrphanedAudioFiles,
  AudioRecorderStateMachine,
  AudioPlayerStateMachine,
  AudioController,
  audioController,
};

module.exports = {
  ...defaultAudioNoteService,
  audioNoteService: defaultAudioNoteService,
  default: defaultAudioNoteService,
};
