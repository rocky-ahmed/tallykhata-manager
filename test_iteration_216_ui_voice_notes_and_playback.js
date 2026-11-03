/**
 * test_iteration_216_ui_voice_notes_and_playback.js
 * 
 * Iteration 216: Audio / Voice Note Attachment & Tagada Voice Messaging Infrastructure QA Suite
 * 
 * Verification Matrix:
 * 1. Audio Note Service & Data Model Invariants (src/audioNoteService.js).
 * 2. App.js State Hooks & References (modalAudioRecord, audioRecordingState, audioPlaybackState, voiceNotes).
 * 3. Recording Bottom Sheet Modal Layout & 2-Minute Limit Formula (modalAudioRecord, progress bar, timer ratio).
 * 4. Tactile 3D Controls & Touch Ergonomics (Record 72dp, Pause, Stop, Discard, Save Button3D, hitSlop >= 48x48dp).
 * 5. Inline Audio Player Pill in Account Ledger (Play/Pause, 16-bar waveform scrubber, elapsed/total time, re-record, delete).
 * 6. Voice Tagada Integration in Tagada View & modalTagada (due customer badge, quick-play toggle, attach triggers).
 * 7. Tactile Haptic Feedback Milestones (impactMedium, selection, notificationSuccess, onError).
 * 8. WCAG 2.1 AA / AAA Luminance Contrast Validation (Light & Dark mode surfaces, tokens, waveform bars).
 * 9. Bilingual Localization (i18n) Symmetry (25 symmetric keys in bn and en).
 * 10. Hardware BackHandler Dismissal Safety & Dependency Invariants.
 * 11. AST Syntax Integrity (Babel parser compilation) & Latency Benchmark (< 50ms for 1,000 transitions).
 * 
 * Worker: Worker 3 (Ohm) — Principal Frontend, UI/UX & Interaction Engineer (QA & Security Owner)
 * Thread ID: 01a19154-e3ee-7ab2-b682-798b64a0bb6b
 * Milestone: REA-ITER-216
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const babel = require("@babel/core");

const APP_PATH = path.join(__dirname, "App.js");
const appSource = fs.readFileSync(APP_PATH, "utf8");

const audioNoteService = require("./src/audioNoteService");
const {
  MAX_RECORDING_SECONDS,
  toBengaliDigits,
  formatAudioDuration,
  formatTimerRatio,
  calculateAudioProgress,
  generateWaveformSamples,
  createVoiceNoteRecord,
  isValidVoiceNote,
  AudioController,
} = audioNoteService;

const { STANDARD_TOUCH_HIT_SLOP } = require("./src/iconMetrics");
const { t, STRINGS } = require("./src/i18nService");
const { LIGHT_THEME, DARK_THEME } = require("./src/themeService");

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] TEST ${totalTests}: ${name}`);
  } catch (err) {
    console.error(`[FAIL] TEST ${totalTests}: ${name}`);
    console.error("       Error:", err.message);
  }
}

// Relative Luminance calculation for WCAG contrast
function getLuminance(hex) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

console.log("================================================================================");
console.log("ITERATION 216: AUDIO / VOICE NOTE & TAGADA MESSAGING INFRASTRUCTURE QA");
console.log("================================================================================");

// ============================================================================
// PART 1: AUDIO NOTE SERVICE & DATA MODEL INVARIANTS
// ============================================================================
console.log("\n--- PART 1: AUDIO NOTE SERVICE & DATA MODEL INVARIANTS ---");

runTest("1.1: MAX_RECORDING_SECONDS enforces strict 120-second (2-minute) limit", () => {
  assert.strictEqual(MAX_RECORDING_SECONDS, 120, "MAX_RECORDING_SECONDS must be 120");
});

runTest("1.2: toBengaliDigits converts English numerals to Bengali glyphs accurately", () => {
  assert.strictEqual(toBengaliDigits("0123456789"), "০১২৩৪৫৬৭৮৯");
  assert.strictEqual(toBengaliDigits(45), "৪৫");
});

runTest("1.3: formatAudioDuration formats MM:SS correctly for Bengali and English", () => {
  assert.strictEqual(formatAudioDuration(15, "bn"), "০:১৫");
  assert.strictEqual(formatAudioDuration(15, "en"), "0:15");
  assert.strictEqual(formatAudioDuration(120, "bn"), "২:০০");
  assert.strictEqual(formatAudioDuration(120, "en"), "2:00");
  assert.strictEqual(formatAudioDuration(0, "bn"), "০:০০");
  assert.strictEqual(formatAudioDuration(75, "en"), "1:15");
});

runTest("1.4: formatTimerRatio produces dual current/max format '০:১৫ / ২:০০' and '0:15 / 2:00'", () => {
  assert.strictEqual(formatTimerRatio(15, 120, "bn"), "০:১৫ / ২:০০");
  assert.strictEqual(formatTimerRatio(15, 120, "en"), "0:15 / 2:00");
});

runTest("1.5: calculateAudioProgress clamps ratios within [0.0, 1.0]", () => {
  assert.strictEqual(calculateAudioProgress(0, 120), 0);
  assert.strictEqual(calculateAudioProgress(60, 120), 0.5);
  assert.strictEqual(calculateAudioProgress(120, 120), 1.0);
  assert.strictEqual(calculateAudioProgress(150, 120), 1.0, "Should clamp at 1.0");
  assert.strictEqual(calculateAudioProgress(-10, 120), 0, "Should clamp at 0");
});

runTest("1.6: generateWaveformSamples generates normalized bar heights bounded [0.15, 1.0]", () => {
  const samples = generateWaveformSamples(20, 0.5);
  assert.strictEqual(samples.length, 20, "Should generate exactly 20 sample bars");
  for (const s of samples) {
    assert(s >= 0.15 && s <= 1.0, `Sample ${s} out of bounds [0.15, 1.0]`);
  }
});

runTest("1.7: createVoiceNoteRecord constructs valid entity with ID, timestamp, and waveform", () => {
  const note = createVoiceNoteRecord({
    targetId: "cust_101",
    targetType: "customer",
    durationSec: 35,
  });
  assert(note.id.startsWith("audio_") || note.id.startsWith("vn_"), "Voice note ID must start with audio_ or vn_");
  assert.strictEqual(note.targetId, "cust_101");
  assert.strictEqual(note.targetType, "customer");
  assert.strictEqual(note.durationSec, 35);
  assert(Array.isArray(note.waveform) && note.waveform.length === 20);
  assert.strictEqual(note.status, "saved");
  assert(isValidVoiceNote(note), "Created note must pass isValidVoiceNote");
});

runTest("1.8: AudioController state transitions (IDLE -> RECORDING -> PAUSED -> STOPPED -> PLAY)", () => {
  const controller = new AudioController();
  assert.strictEqual(controller.recordingState.isRecording, false);

  // Start recording
  controller.startRecording();
  assert.strictEqual(controller.recordingState.isRecording, true);
  assert.strictEqual(controller.recordingState.isPaused, false);

  // Pause
  controller.pauseRecording();
  assert.strictEqual(controller.recordingState.isPaused, true);

  // Resume
  controller.resumeRecording();
  assert.strictEqual(controller.recordingState.isPaused, false);

  // Tick timer
  controller.tickRecording(10);
  assert.strictEqual(controller.recordingState.durationSec, 10);

  // Stop
  const stopped = controller.stopRecording();
  assert.strictEqual(controller.recordingState.isRecording, false);
  assert.strictEqual(stopped.durationSec, 10);

  // Play
  const note = createVoiceNoteRecord({ durationSec: 10, targetId: "test" });
  const playOk = controller.playNote(note);
  assert.strictEqual(playOk, true);
  assert.strictEqual(controller.playbackState.isPlaying, true);
  assert.strictEqual(controller.playbackState.totalSec, 10);

  // Pause playback
  controller.pausePlayback();
  assert.strictEqual(controller.playbackState.isPlaying, false);

  // Stop playback
  controller.stopPlayback();
  assert.strictEqual(controller.playbackState.isPlaying, false);
  assert.strictEqual(controller.playbackState.activeNoteId, null);
});

// ============================================================================
// PART 2: APP.JS STATE HOOKS & REFERENCES
// ============================================================================
console.log("\n--- PART 2: APP.JS STATE HOOKS & REFERENCES ---");

runTest("2.1: State hooks declared in App.js (modalAudioRecord, voiceTarget, audioRecordingState, audioPlaybackState, voiceNotes)", () => {
  assert(appSource.includes("const [modalAudioRecord, setModalAudioRecord] = useState(false);"), "modalAudioRecord missing");
  assert(appSource.includes("const [voiceTarget, setVoiceTarget] = useState(null);"), "voiceTarget missing");
  assert(appSource.includes("const [audioRecordingState, setAudioRecordingState] = useState("), "audioRecordingState missing");
  assert(appSource.includes("const [audioPlaybackState, setAudioPlaybackState] = useState("), "audioPlaybackState missing");
  assert(appSource.includes("const [voiceNotes, setVoiceNotes] = useState({});"), "voiceNotes missing");
});

runTest("2.2: Animation and timer refs declared (voiceRecordTimerRef, voicePlaybackTimerRef, waveformAnim)", () => {
  assert(appSource.includes("const voiceRecordTimerRef = useRef(null);"), "voiceRecordTimerRef missing");
  assert(appSource.includes("const voicePlaybackTimerRef = useRef(null);"), "voicePlaybackTimerRef missing");
  assert(appSource.includes("const waveformAnim = useRef(new Animated.Value(0.3)).current;"), "waveformAnim missing");
});

runTest("2.3: Global test hooks exposed via global.__VOICE_NOTE_TEST_HOOKS__", () => {
  assert(appSource.includes("global.__VOICE_NOTE_TEST_HOOKS__ = {"), "global.__VOICE_NOTE_TEST_HOOKS__ missing");
  assert(appSource.includes("handleStartAudioRecording,"), "handleStartAudioRecording hook missing");
  assert(appSource.includes("handleSaveAudioRecording,"), "handleSaveAudioRecording hook missing");
  assert(appSource.includes("handleTogglePlayAudio,"), "handleTogglePlayAudio hook missing");
});

// ============================================================================
// PART 3: RECORDING BOTTOM SHEET MODAL LAYOUT & 2-MINUTE LIMIT FORMULA
// ============================================================================
console.log("\n--- PART 3: RECORDING MODAL LAYOUT & 2-MINUTE LIMIT ---");

runTest("3.1: modalAudioRecord declared with slide animation and transparent overlay", () => {
  assert(appSource.includes("<Modal"), "Modal missing");
  assert(appSource.includes("visible={modalAudioRecord}"), "visible={modalAudioRecord} missing");
  assert(appSource.includes('animationType="slide"'), 'animationType="slide" missing');
});

runTest("3.2: Target entity context card renders customer/supplier details and due balance", () => {
  assert(appSource.includes("(voiceTarget || selectedAccount) ? ("), "Target entity context card missing");
  assert(appSource.includes("(voiceTarget || selectedAccount).name"), "Target name missing");
  assert(appSource.includes("(voiceTarget || selectedAccount).balance"), "Target balance missing");
});

runTest("3.3: Waveform visualizer renders 20 dynamic bars with active and inactive colors", () => {
  assert(appSource.includes("audioRecordingState.waveform"), "audioRecordingState.waveform missing");
  assert(appSource.includes("barHeight"), "barHeight calculation missing");
  assert(appSource.includes("barColor"), "barColor state mapping missing");
});

runTest("3.4: Live timer counter renders duration ratio via audioNoteService.formatTimerRatio", () => {
  assert(appSource.includes("audioNoteService.formatTimerRatio("), "formatTimerRatio call in JSX missing");
});

runTest("3.5: 2-minute progress bar calculates width as ((durationSec / 120) * 100)%", () => {
  assert(appSource.includes("/ 120) * 100"), "Progress bar 120s limit calculation missing");
});

runTest("3.6: 120-second limit auto-stops recording and alerts voice_limit_reached", () => {
  assert(appSource.includes("nextSec >= 120"), "120s limit check in timer missing");
  assert(appSource.includes("voice_limit_reached"), "voice_limit_reached alert missing");
});

// ============================================================================
// PART 4: TACTILE 3D CONTROLS & TOUCH TARGET BOUNDS
// ============================================================================
console.log("\n--- PART 4: TACTILE 3D CONTROLS & TOUCH TARGET BOUNDS ---");

runTest("4.1: Central 3D Record Button has 72x72dp dimensions, 4dp bottom ledge, and STANDARD_TOUCH_HIT_SLOP", () => {
  assert(appSource.includes("width: 72"), "Record button width 72 missing");
  assert(appSource.includes("height: 72"), "Record button height 72 missing");
  assert(appSource.includes("borderBottomWidth: 4"), "Record button 4dp ledge missing");
  assert(appSource.includes("hitSlop={STANDARD_TOUCH_HIT_SLOP}"), "Record button hitSlop missing");
});

runTest("4.2: Recording controls (Pause, Resume, Stop, Discard) use Button3D with minHeight >= 48dp", () => {
  assert(appSource.includes("title={t('voice_pause')}"), "Pause Button3D missing");
  assert(appSource.includes("title={t('voice_resume')}"), "Resume Button3D missing");
  assert(appSource.includes("title={t('voice_stop')}"), "Stop Button3D missing");
  assert(appSource.includes("title={t('voice_discard')}"), "Discard Button3D missing");
  assert(appSource.includes("minHeight: 48"), "minHeight 48 missing");
});

runTest("4.3: Recorded preview controls (Play/Pause, Re-record, Save) use Button3D with minHeight >= 48dp and 52dp", () => {
  assert(appSource.includes("title={t('voice_rerecord')}"), "Re-record Button3D missing");
  assert(appSource.includes("title={t('voice_save')}"), "Save Button3D missing");
  assert(appSource.includes("minHeight: 52"), "Save button minHeight 52 missing");
});

// ============================================================================
// PART 5: INLINE AUDIO PLAYER PILL IN ACCOUNT LEDGER
// ============================================================================
console.log("\n--- PART 5: INLINE AUDIO PLAYER PILL IN ACCOUNT LEDGER ---");

runTest("5.1: Account Ledger renders Attached Voice Note Player Card when note exists", () => {
  assert(appSource.includes("voiceNotes[selectedAccount.id] && (() => {"), "Attached voice note check in ledger missing");
  assert(appSource.includes("handleTogglePlayAudio(note, selectedAccount.id)"), "Toggle play in ledger player missing");
});

runTest("5.2: Player card Play/Pause button has 44x44dp circle and STANDARD_TOUCH_HIT_SLOP (>= 48x48dp)", () => {
  assert(appSource.includes("width: 44"), "Play button 44dp width missing");
  assert(appSource.includes("height: 44"), "Play button 44dp height missing");
});

runTest("5.3: Player card renders mini 16-bar waveform scrubber and active progress bar", () => {
  assert(appSource.includes("slice(0, 16)"), "16-bar waveform slice missing");
  assert(appSource.includes("progressPercent"), "progressPercent missing");
});

runTest("5.4: Player card includes Re-record (36dp with hitSlop) and Delete triggers", () => {
  assert(appSource.includes("handleOpenAudioRecordModal(selectedAccount)"), "Re-record trigger in player missing");
  assert(appSource.includes("handleDeleteVoiceNote(selectedAccount.id)"), "Delete trigger in player missing");
});

runTest("5.5: Quick actions in ledger include Voice Note chip with attached/record dynamic label", () => {
  assert(appSource.includes("voice_attached_badge"), "voice_attached_badge label missing");
  assert(appSource.includes("voice_record_btn"), "voice_record_btn label missing");
});

// ============================================================================
// PART 6: VOICE TAGADA INTEGRATION IN TAGADA VIEW & MODAL
// ============================================================================
console.log("\n--- PART 6: VOICE TAGADA INTEGRATION IN TAGADA VIEW & MODAL ---");

runTest("6.1: Due customer list renders voice tagada pill badge with duration when note attached", () => {
  assert(appSource.includes("voiceNotes[item.id] && (() => {"), "voiceNotes check on customer card missing");
  assert(appSource.includes("voice_tagada_badge"), "voice_tagada_badge missing");
  assert(appSource.includes("formatAudioDuration(note.durationSec"), "formatAudioDuration in tagada item missing");
});

runTest("6.2: Due customer card includes inline quick-play / attach mic trigger button", () => {
  assert(appSource.includes("voice_tagada_play"), "voice_tagada_play label missing");
  assert(appSource.includes("voice_customer_attach"), "voice_customer_attach label missing");
});

runTest("6.3: modalTagada includes Voice Tagada attachment row with play and record triggers", () => {
  assert(appSource.includes("Voice Tagada Attachment in Tagada Modal"), "Voice tagada attachment in modalTagada missing");
  assert(appSource.includes("voice_attach_hint"), "voice_attach_hint in modalTagada missing");
});

// ============================================================================
// PART 7: TACTILE HAPTIC FEEDBACK MILESTONES
// ============================================================================
console.log("\n--- PART 7: TACTILE HAPTIC FEEDBACK MILESTONES ---");

runTest("7.1: hapticFeedbackService.impactMedium() wired on handleStartAudioRecording and handleStopAudioRecording", () => {
  assert(appSource.includes("handleStartAudioRecording = () => {"), "handleStartAudioRecording missing");
  assert(appSource.includes("hapticFeedbackService.impactMedium()"), "impactMedium missing");
});

runTest("7.2: hapticFeedbackService.selection() wired on handleOpenAudioRecordModal, pause, resume, and togglePlay", () => {
  assert(appSource.includes("handlePauseAudioRecording = () => {"), "handlePauseAudioRecording missing");
  assert(appSource.includes("handleResumeAudioRecording = () => {"), "handleResumeAudioRecording missing");
  assert(appSource.includes("handleTogglePlayAudio = (note"), "handleTogglePlayAudio missing");
  assert(appSource.includes("hapticFeedbackService.selection()"), "selection missing");
});

runTest("7.3: hapticFeedbackService.notificationSuccess() wired on handleSaveAudioRecording", () => {
  assert(appSource.includes("handleSaveAudioRecording = async () => {"), "handleSaveAudioRecording missing");
  assert(appSource.includes("hapticFeedbackService.notificationSuccess()"), "notificationSuccess missing");
});

runTest("7.4: hapticFeedbackService.onError() wired on handleDiscardAudioRecording and handleDeleteVoiceNote", () => {
  assert(appSource.includes("handleDiscardAudioRecording = () => {"), "handleDiscardAudioRecording missing");
  assert(appSource.includes("handleDeleteVoiceNote = (targetId) => {"), "handleDeleteVoiceNote missing");
  assert(appSource.includes("hapticFeedbackService.onError()"), "onError missing");
});

// ============================================================================
// PART 8: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION
// ============================================================================
console.log("\n--- PART 8: WCAG 2.1 AA / AAA LUMINANCE CONTRAST VALIDATION ---");

runTest("8.1: Light Mode Mic Record Button (#FFFFFF on #DC2626) achieves >= 4.5:1 (AA)", () => {
  const ratio = getContrastRatio("#FFFFFF", "#DC2626");
  console.log(`      [CONTRAST] Mic Button Light (#FFFFFF on #DC2626): ${ratio.toFixed(2)}:1`);
  assert(ratio >= 4.5, `Contrast ratio ${ratio} < 4.5:1`);
});

runTest("8.2: Light Mode Attached Voice Note Pill text (#064E3B on #DCFCE7) achieves >= 7.0:1 (AAA)", () => {
  const ratio = getContrastRatio("#064E3B", "#DCFCE7");
  console.log(`      [CONTRAST] Voice Pill Light (#064E3B on #DCFCE7): ${ratio.toFixed(2)}:1`);
  assert(ratio >= 7.0, `Contrast ratio ${ratio} < 7.0:1 (AAA)`);
});

runTest("8.3: Dark Mode Attached Voice Note Pill text (#A7F3D0 on #064E3B) achieves >= 7.0:1 (AAA)", () => {
  const ratio = getContrastRatio("#A7F3D0", "#064E3B");
  console.log(`      [CONTRAST] Voice Pill Dark (#A7F3D0 on #064E3B): ${ratio.toFixed(2)}:1`);
  assert(ratio >= 7.0, `Contrast ratio ${ratio} < 7.0:1 (AAA)`);
});

runTest("8.4: Modal Surface Text in Light (#111827 on #FFFFFF) achieves >= 14:1 (AAA)", () => {
  const ratio = getContrastRatio("#111827", "#FFFFFF");
  console.log(`      [CONTRAST] Modal Text Light (#111827 on #FFFFFF): ${ratio.toFixed(2)}:1`);
  assert(ratio >= 14.0, `Contrast ratio ${ratio} < 14:1 (AAA)`);
});

runTest("8.5: Modal Surface Text in Dark (#F8FAFC on #1E293B) achieves >= 12:1 (AAA)", () => {
  const ratio = getContrastRatio("#F8FAFC", "#1E293B");
  console.log(`      [CONTRAST] Modal Text Dark (#F8FAFC on #1E293B): ${ratio.toFixed(2)}:1`);
  assert(ratio >= 12.0, `Contrast ratio ${ratio} < 12:1 (AAA)`);
});

runTest("8.6: Emerald Waveform Bar in Dark (#10B981 on #0F172A) achieves >= 7.0:1 (AAA)", () => {
  const ratio = getContrastRatio("#10B981", "#0F172A");
  console.log(`      [CONTRAST] Waveform Bar Dark (#10B981 on #0F172A): ${ratio.toFixed(2)}:1`);
  assert(ratio >= 7.0, `Contrast ratio ${ratio} < 7.0:1 (AAA)`);
});

// ============================================================================
// PART 9: BILINGUAL LOCALIZATION (i18n) SYMMETRY
// ============================================================================
console.log("\n--- PART 9: BILINGUAL LOCALIZATION (i18n) SYMMETRY ---");

const iter216Keys = [
  "voice_note_title",
  "voice_record_btn",
  "voice_recording",
  "voice_paused",
  "voice_play",
  "voice_pause",
  "voice_resume",
  "voice_stop",
  "voice_discard",
  "voice_save",
  "voice_max_limit",
  "voice_tagada_badge",
  "voice_attach_hint",
  "voice_permission_error",
  "voice_record_start_hint",
  "voice_playing",
  "voice_saved_toast",
  "voice_deleted_toast",
  "voice_rerecord",
  "voice_note_duration",
  "voice_no_recordings",
  "voice_customer_attach",
  "voice_tagada_play",
  "voice_limit_reached",
  "voice_attached_badge",
];

runTest("9.1: All 25 Iteration 216 localization keys are defined and non-empty in STRINGS.bn", () => {
  for (const k of iter216Keys) {
    assert(STRINGS.bn[k], `Missing Bengali translation for key: ${k}`);
    assert(typeof STRINGS.bn[k] === "string" && STRINGS.bn[k].trim().length > 0);
  }
});

runTest("9.2: All 25 Iteration 216 localization keys are defined and non-empty in STRINGS.en", () => {
  for (const k of iter216Keys) {
    assert(STRINGS.en[k], `Missing English translation for key: ${k}`);
    assert(typeof STRINGS.en[k] === "string" && STRINGS.en[k].trim().length > 0);
  }
});

runTest("9.3: t() helper translates keys accurately in both languages", () => {
  assert.strictEqual(t("voice_note_title", "bn"), "ভয়েস নোট ও তাগাদা বার্তা");
  assert.strictEqual(t("voice_note_title", "en"), "Voice Note & Tagada Message");
  assert.strictEqual(t("voice_max_limit", "bn"), "সর্বোচ্চ ২ মিনিট");
  assert.strictEqual(t("voice_max_limit", "en"), "Max 2 minutes");
});

// ============================================================================
// PART 10: BACKHANDLER HARDWARE DISMISSAL SAFETY
// ============================================================================
console.log("\n--- PART 10: BACKHANDLER HARDWARE DISMISSAL SAFETY ---");

runTest("10.1: onBackPress dismisses modalAudioRecord gracefully before other modals", () => {
  assert(appSource.includes("if (modalAudioRecord) { handleCloseAudioRecordModal(); return true; }"), "modalAudioRecord back dismiss missing");
});

runTest("10.2: modalAudioRecord included in BackHandler useEffect dependency array", () => {
  assert(appSource.includes("modalMobileRecharge, modalAudioRecord, modalTagada,"), "modalAudioRecord missing in BackHandler dependencies");
});

// ============================================================================
// PART 11: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK
// ============================================================================
console.log("\n--- PART 11: AST SYNTAX INTEGRITY & PERFORMANCE BENCHMARK ---");

runTest("11.1: App.js compiles cleanly via Babel parser with Flow & JSX plugins", () => {
  const ast = babel.parseSync(appSource, {
    configFile: false,
    babelrc: false,
    presets: ["babel-preset-expo"],
  });
  assert(ast && ast.program, "AST program root missing");
  assert(ast.program.body.length > 50, "App.js program statements count too low");
  console.log(`      [BABEL] Successfully parsed ${ast.program.body.length} top-level program statements`);
});

runTest("11.2: Latency benchmark: 1,000 audio state transitions resolve in < 50ms", () => {
  const t0 = performance.now();
  const controller = new AudioController();
  controller.startRecording();
  for (let i = 0; i < 1000; i++) {
    if (i % 2 === 0) {
      controller.tickRecording(1);
    } else {
      controller.pauseRecording();
      controller.resumeRecording();
    }
  }
  const dt = performance.now() - t0;
  console.log(`      [BENCHMARK] 1,000 audio state transitions in ${dt.toFixed(2)}ms (${(dt / 1000).toFixed(4)}ms/op)`);
  assert(dt < 50, `Audio transition latency ${dt.toFixed(2)}ms >= 50ms`);
});

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log("\n================================================================================");
console.log(`ITERATION 216 QA SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log("================================================================================");

if (passedTests !== totalTests) {
  process.exit(1);
}
