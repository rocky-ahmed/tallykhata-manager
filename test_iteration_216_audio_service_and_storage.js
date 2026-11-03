/**
 * TALLYKHATA AUDIO NOTE & TAGADA VOICE MESSAGING TEST SUITE
 * Milestone: REA-ITER-216
 * Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic / Backend & Data Architect)
 * Registered Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895
 *
 * Verifies:
 * 1. Audio Note Metadata Schema & Schema Validation
 * 2. Bilingual Duration & Numeral Formatting (Bengali '০২:০৫' vs English '02:05')
 * 3. AudioRecorderStateMachine: Lifecycle transitions, pause/resume, cancel, and max duration auto-stop
 * 4. AudioPlayerStateMachine: Lifecycle transitions, pause/resume, seeking, and auto-ended callback
 * 5. StorageRepository Atomic Persistence: attachAudioNote, getAudioNotesForEntity, getAudioNotesForBusiness
 * 6. Multi-Tenant Business Isolation: ID collision protection across shops
 * 7. Cascade Deletion Invariants: deleteAudioNote, deleteAudioNotesForEntity, deleteAccountCascade, deleteBusinessCascade
 * 8. File System Storage & Garbage Collection: cleanOrphanedAudioFiles, deleteAudioFile
 * 9. Cloud Backup Sanitization: Binary exclusion and metadata preservation in Google Drive and compressed backups
 */

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');

const {
  AUDIO_NOTE_SCHEMA_VERSION,
  RECORDING_STATES,
  PLAYBACK_STATES,
  DEFAULT_MAX_RECORDING_DURATION_MS,
  VALID_ENTITY_TYPES,
  SUPPORTED_MIME_TYPES,
  toBengaliNumeral,
  toAsciiDigits,
  formatDuration,
  parseDuration,
  formatFileSize,
  generateAudioNoteId,
  generateAudioFileName,
  createAudioNoteMetadata,
  validateAudioNote,
  sanitizeAudioNotesForBackup,
  calculateAudioStorageUsage,
  resolveAudioDirectory,
  deleteAudioFile,
  cleanOrphanedAudioFiles,
  AudioRecorderStateMachine,
  AudioPlayerStateMachine,
  audioNoteService,
} = require('./src/audioNoteService');

const {
  StorageRepository,
  createDefaultState,
  VALID_COLLECTIONS,
} = require('./src/storageRepository');

const googleDriveBackupService = require('./src/googleDriveBackupService');

class MemoryStorageAdapter {
  constructor(initialData = {}) {
    this.storage = { ...initialData };
  }
  async getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.storage, key) ? this.storage[key] : null;
  }
  async setItem(key, val) {
    this.storage[key] = String(val);
  }
  async removeItem(key) {
    delete this.storage[key];
  }
}

let passedTests = 0;
let totalTests = 0;

function reportTest(name, passed, detail = null) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  [PASS] TEST ${totalTests}: ${name}` + (detail ? ` -> ${JSON.stringify(detail)}` : ''));
  } else {
    console.error(`  [FAIL] TEST ${totalTests}: ${name}` + (detail ? ` -> ${JSON.stringify(detail)}` : ''));
  }
}

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('TALLYKHATA ITERATION 216: AUDIO NOTE & VOICE MESSAGING INFRASTRUCTURE');
  console.log('Worker: Worker 2: Averroes (Permanent Backend Developer & Business Logic)');
  console.log('Thread ID: 01a19154-c135-75d0-b38a-1ea50f004895');
  console.log('='.repeat(80));

  // --- PART 1: METADATA SCHEMA & SCHEMA VALIDATION ---
  try {
    const meta = createAudioNoteMetadata({
      entityType: 'customer',
      entityId: 'cust_101',
      businessId: '1',
      durationMs: 45000,
      fileSizeBytes: 184320,
      title: 'বাকির তাগাদা ভয়েস নোট',
      waveform: [0.1, 0.45, 0.82, 0.3],
    });

    assert.strictEqual(typeof meta.id, 'string');
    assert.ok(meta.id.startsWith('audio_'));
    assert.strictEqual(meta.entityType, 'customer');
    assert.strictEqual(meta.entityId, 'cust_101');
    assert.strictEqual(meta.businessId, '1');
    assert.strictEqual(meta.durationMs, 45000);
    assert.strictEqual(meta.fileSizeBytes, 184320);
    assert.strictEqual(meta.mimeType, 'audio/m4a');
    assert.strictEqual(meta.version, AUDIO_NOTE_SCHEMA_VERSION);
    assert.strictEqual(meta.title, 'বাকির তাগাদা ভয়েস নোট');
    assert.deepStrictEqual(meta.waveform, [0.1, 0.45, 0.82, 0.3]);

    const valRes = validateAudioNote(meta);
    assert.strictEqual(valRes.isValid, true);
    assert.strictEqual(valRes.errors.length, 0);

    reportTest('Metadata Schema & Construction Validation', true, { id: meta.id, version: meta.version });
  } catch (err) {
    reportTest('Metadata Schema & Construction Validation', false, { error: err.message });
  }

  try {
    let threwInvalidType = false;
    try {
      createAudioNoteMetadata({ entityType: 'invalid_type', entityId: '101' });
    } catch (_) {
      threwInvalidType = true;
    }
    assert.strictEqual(threwInvalidType, true, 'Must reject invalid entityType');

    let threwMissingEntityId = false;
    try {
      createAudioNoteMetadata({ entityType: 'customer', entityId: null });
    } catch (_) {
      threwMissingEntityId = true;
    }
    assert.strictEqual(threwMissingEntityId, true, 'Must reject missing entityId');

    const invalidNote = { id: '', durationMs: -50, fileSizeBytes: -10 };
    const invalidRes = validateAudioNote(invalidNote);
    assert.strictEqual(invalidRes.isValid, false);
    assert.ok(invalidRes.errors.length >= 3);

    reportTest('Metadata Invariant & Boundary Enforcement', true, { errorCount: invalidRes.errors.length });
  } catch (err) {
    reportTest('Metadata Invariant & Boundary Enforcement', false, { error: err.message });
  }

  // --- PART 2: BILINGUAL DURATION & NUMERAL FORMATTING ---
  try {
    // 0 ms
    assert.strictEqual(formatDuration(0, { locale: 'bn' }), '০০:০০');
    assert.strictEqual(formatDuration(0, { locale: 'en' }), '00:00');

    // 45,000 ms = 45 sec
    assert.strictEqual(formatDuration(45000, { locale: 'bn' }), '০০:৪৫');
    assert.strictEqual(formatDuration(45000, { locale: 'en' }), '00:45');

    // 125,000 ms = 2 min 5 sec
    assert.strictEqual(formatDuration(125000, { locale: 'bn' }), '০২:০৫');
    assert.strictEqual(formatDuration(125000, { locale: 'en' }), '02:05');

    // 3,665,000 ms = 1 hr 1 min 5 sec
    assert.strictEqual(formatDuration(3665000, { locale: 'bn' }), '০১:০১:০৫');
    assert.strictEqual(formatDuration(3665000, { locale: 'en' }), '01:01:05');

    // Duration parser round-trip
    assert.strictEqual(parseDuration('০২:০৫'), 125000);
    assert.strictEqual(parseDuration('02:05'), 125000);
    assert.strictEqual(parseDuration('০১:০১:০৫'), 3665000);
    assert.strictEqual(parseDuration('01:01:05'), 3665000);

    // File size formatting
    assert.strictEqual(formatFileSize(188743, { locale: 'en' }), '184.3 KB');
    assert.strictEqual(formatFileSize(188743, { locale: 'bn' }), '১৮৪.৩ কেবি');
    assert.strictEqual(formatFileSize(1048576 * 2.5, { locale: 'en' }), '2.5 MB');
    assert.strictEqual(formatFileSize(1048576 * 2.5, { locale: 'bn' }), '২.৫ এমবি');

    reportTest('Bilingual Duration & File Size Formatting Invariants', true, {
      sampleBn: formatDuration(125000, { locale: 'bn' }),
      sampleEn: formatDuration(125000, { locale: 'en' }),
    });
  } catch (err) {
    reportTest('Bilingual Duration & File Size Formatting Invariants', false, { error: err.message });
  }

  // --- PART 3: AUDIO RECORDER STATE MACHINE ---
  try {
    const recorder = new AudioRecorderStateMachine({ tickIntervalMs: 15 });
    assert.strictEqual(recorder.getState(), RECORDING_STATES.IDLE);

    const stateChanges = [];
    recorder.addListener('stateChange', (e) => stateChanges.push(e.to));

    // Start recording
    await recorder.startRecording({
      entityType: 'customer',
      entityId: 'acc_55',
      title: 'নমুনা অডিও রেকর্ড',
      maxDurationMs: 500,
    });
    assert.strictEqual(recorder.getState(), RECORDING_STATES.RECORDING);

    // Wait 50ms
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(recorder.getDurationMs() >= 30);

    // Pause recording
    await recorder.pauseRecording();
    assert.strictEqual(recorder.getState(), RECORDING_STATES.PAUSED);
    const pausedMs = recorder.getDurationMs();

    // Wait while paused - duration must NOT advance
    await new Promise((r) => setTimeout(r, 40));
    assert.strictEqual(recorder.getDurationMs(), pausedMs);

    // Resume recording
    await recorder.resumeRecording();
    assert.strictEqual(recorder.getState(), RECORDING_STATES.RECORDING);
    await new Promise((r) => setTimeout(r, 40));
    assert.ok(recorder.getDurationMs() > pausedMs);

    // Stop recording
    const finalizedNote = await recorder.stopRecording({ fileSizeBytes: 12400 });
    assert.strictEqual(recorder.getState(), RECORDING_STATES.STOPPED);
    assert.ok(finalizedNote);
    assert.strictEqual(finalizedNote.entityId, 'acc_55');
    assert.strictEqual(finalizedNote.fileSizeBytes, 12400);
    assert.ok(finalizedNote.durationMs > 0);

    // Reset back to IDLE
    recorder.reset();
    assert.strictEqual(recorder.getState(), RECORDING_STATES.IDLE);

    assert.ok(stateChanges.includes(RECORDING_STATES.RECORDING));
    assert.ok(stateChanges.includes(RECORDING_STATES.PAUSED));
    assert.ok(stateChanges.includes(RECORDING_STATES.STOPPED));

    reportTest('AudioRecorderStateMachine Lifecycle Transitions', true, {
      transitions: stateChanges,
      finalDuration: finalizedNote.durationMs,
    });
  } catch (err) {
    reportTest('AudioRecorderStateMachine Lifecycle Transitions', false, { error: err.message });
  }

  // --- PART 4: MAX DURATION ENFORCEMENT & CANCEL CLEANUP ---
  try {
    const recorder = new AudioRecorderStateMachine({ tickIntervalMs: 10 });
    let maxReachedEvent = null;
    recorder.addListener('maxDurationReached', (e) => {
      maxReachedEvent = e;
    });

    // Ceiling of 80ms
    await recorder.startRecording({
      entityType: 'tagada',
      entityId: 't_99',
      maxDurationMs: 80,
    });

    // Wait 130ms for auto-stop trigger
    await new Promise((r) => setTimeout(r, 130));

    assert.ok(maxReachedEvent !== null, 'maxDurationReached event must be emitted');
    assert.strictEqual(recorder.getState(), RECORDING_STATES.STOPPED);
    assert.ok(recorder.getDurationMs() >= 75);

    // Test cancel
    await recorder.startRecording({ entityType: 'general', entityId: '0' });
    assert.strictEqual(recorder.getState(), RECORDING_STATES.RECORDING);
    const cancelRes = await recorder.cancelRecording();
    assert.strictEqual(cancelRes.state, RECORDING_STATES.IDLE);
    assert.strictEqual(recorder.getDurationMs(), 0);

    reportTest('Maximum Duration Auto-Stop & Cancellation Engine', true, {
      autoStopped: true,
      durationMs: recorder.getDurationMs(),
    });
  } catch (err) {
    reportTest('Maximum Duration Auto-Stop & Cancellation Engine', false, { error: err.message });
  }

  // --- PART 5: AUDIO PLAYER STATE MACHINE ---
  try {
    const player = new AudioPlayerStateMachine({ tickIntervalMs: 15 });
    assert.strictEqual(player.getState(), PLAYBACK_STATES.IDLE);

    const testAudio = createAudioNoteMetadata({
      entityType: 'customer',
      entityId: 'c1',
      durationMs: 150,
      fileUri: 'file://audio_notes/sample.m4a',
    });

    let endedEvent = null;
    player.addListener('ended', (e) => {
      endedEvent = e;
    });

    // Play
    await player.play(testAudio);
    assert.strictEqual(player.getState(), PLAYBACK_STATES.PLAYING);
    assert.strictEqual(player.getDurationMs(), 150);

    // Wait 40ms
    await new Promise((r) => setTimeout(r, 40));
    assert.ok(player.getPositionMs() >= 25);

    // Pause
    await player.pause();
    assert.strictEqual(player.getState(), PLAYBACK_STATES.PAUSED);
    const pausedPos = player.getPositionMs();

    // Seeking while paused
    await player.seek(20);
    assert.strictEqual(player.getPositionMs(), 20);
    assert.strictEqual(player.getState(), PLAYBACK_STATES.PAUSED);

    // Resume
    await player.resume();
    assert.strictEqual(player.getState(), PLAYBACK_STATES.PLAYING);

    // Wait for playback to reach duration and auto-end
    await new Promise((r) => setTimeout(r, 180));
    assert.strictEqual(player.getState(), PLAYBACK_STATES.STOPPED);
    assert.ok(endedEvent !== null, 'Player ended event must trigger at 100% duration');

    // Manual stop resets position
    await player.play(testAudio);
    await player.stop();
    assert.strictEqual(player.getState(), PLAYBACK_STATES.STOPPED);
    assert.strictEqual(player.getPositionMs(), 0);

    reportTest('AudioPlayerStateMachine Playback, Seek & Ended Lifecycle', true, {
      autoEnded: true,
      lastState: player.getState(),
    });
  } catch (err) {
    reportTest('AudioPlayerStateMachine Playback, Seek & Ended Lifecycle', false, { error: err.message });
  }

  // --- PART 6: STORAGE REPOSITORY ATOMIC ATTACH & QUERY ---
  try {
    const memoryAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memoryAdapter);
    await repo.loadStore();

    assert.ok(VALID_COLLECTIONS.has('audioNotes'));
    assert.ok(Array.isArray(repo.currentStore.audioNotes));

    // Attach audio note to customer 1 in business 1
    const attachRes1 = await repo.attachAudioNote({
      entityType: 'customer',
      entityId: '1',
      businessId: '1',
      title: 'গ্রাহক ০১ তাগাদা অডিও',
      durationMs: 30000,
      fileSizeBytes: 120000,
    });
    assert.strictEqual(attachRes1.success, true);
    assert.ok(attachRes1.audioNote.id);

    // Attach second audio note to customer 1 in business 1
    const attachRes2 = await repo.attachAudioNote({
      entityType: 'customer',
      entityId: '1',
      businessId: '1',
      title: 'গ্রাহক ০১ দ্বিতীয় বার্তা',
      durationMs: 15000,
      fileSizeBytes: 60000,
    });
    assert.strictEqual(attachRes2.success, true);

    // Attach audio note to supplier 2 in business 1
    const attachRes3 = await repo.attachAudioNote({
      entityType: 'supplier',
      entityId: '2',
      businessId: '1',
      title: 'মহাজন ০২ পেমেন্ট ভয়েস নোট',
      durationMs: 40000,
      fileSizeBytes: 160000,
    });
    assert.strictEqual(attachRes3.success, true);

    // Query notes for customer 1
    const cust1Notes = repo.getAudioNotesForEntity('customer', '1', '1');
    assert.strictEqual(cust1Notes.length, 2);
    assert.strictEqual(cust1Notes[0].title, 'গ্রাহক ০১ তাগাদা অডিও');
    assert.strictEqual(cust1Notes[1].title, 'গ্রাহক ০১ দ্বিতীয় বার্তা');

    // Query notes for supplier 2
    const supp2Notes = repo.getAudioNotesForEntity('supplier', '2', '1');
    assert.strictEqual(supp2Notes.length, 1);
    assert.strictEqual(supp2Notes[0].title, 'মহাজন ০২ পেমেন্ট ভয়েস নোট');

    // Query notes for non-existent entity
    const emptyNotes = repo.getAudioNotesForEntity('customer', '999', '1');
    assert.strictEqual(emptyNotes.length, 0);

    // Business aggregation
    const allBiz1Notes = repo.getAudioNotesForBusiness('1');
    assert.strictEqual(allBiz1Notes.length, 3);

    reportTest('StorageRepository Atomic attachAudioNote & Entity Querying', true, {
      cust1NotesCount: cust1Notes.length,
      supp2NotesCount: supp2Notes.length,
      totalBiz1Notes: allBiz1Notes.length,
    });
  } catch (err) {
    reportTest('StorageRepository Atomic attachAudioNote & Entity Querying', false, { error: err.message });
  }

  // --- PART 7: MULTI-TENANT BUSINESS ISOLATION WITH COLLIDING ENTITY IDS ---
  try {
    const memoryAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memoryAdapter);
    await repo.loadStore();

    // Attach note for entity '100' in Business '1'
    await repo.attachAudioNote({
      entityType: 'customer',
      entityId: '100',
      businessId: '1',
      title: 'Shop 1 Customer Note',
    });

    // Attach note for identical entity ID '100' in Business '2'
    await repo.attachAudioNote({
      entityType: 'customer',
      entityId: '100',
      businessId: '2',
      title: 'Shop 2 Customer Note',
    });

    const shop1Notes = repo.getAudioNotesForEntity('customer', '100', '1');
    const shop2Notes = repo.getAudioNotesForEntity('customer', '100', '2');

    assert.strictEqual(shop1Notes.length, 1);
    assert.strictEqual(shop1Notes[0].title, 'Shop 1 Customer Note');
    assert.strictEqual(shop1Notes[0].businessId, '1');

    assert.strictEqual(shop2Notes.length, 1);
    assert.strictEqual(shop2Notes[0].title, 'Shop 2 Customer Note');
    assert.strictEqual(shop2Notes[0].businessId, '2');

    // Verify business scoping
    const biz1All = repo.getAudioNotesForBusiness('1');
    const biz2All = repo.getAudioNotesForBusiness('2');
    assert.strictEqual(biz1All.length, 1);
    assert.strictEqual(biz2All.length, 1);

    reportTest('Multi-Tenant Audio Note Business Scoping & Colliding ID Isolation', true, {
      shop1Title: shop1Notes[0].title,
      shop2Title: shop2Notes[0].title,
    });
  } catch (err) {
    reportTest('Multi-Tenant Audio Note Business Scoping & Colliding ID Isolation', false, { error: err.message });
  }

  // --- PART 8: DELETION & CASCADE CLEANUP (ENTITY & BUSINESS) ---
  try {
    const memoryAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memoryAdapter);
    await repo.loadStore();

    // Create a temporary mock directory with audio files
    const tmpDir = path.join(os.tmpdir(), 'tallykhata_audio_test_' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    const file1 = path.join(tmpDir, 'voice_c1.m4a');
    const file2 = path.join(tmpDir, 'voice_c2.m4a');
    const file3 = path.join(tmpDir, 'voice_biz2.m4a');
    fs.writeFileSync(file1, 'MOCK_AUDIO_DATA_1');
    fs.writeFileSync(file2, 'MOCK_AUDIO_DATA_2');
    fs.writeFileSync(file3, 'MOCK_AUDIO_DATA_3');

    // Attach note 1 & 2 to account 'acc_del_1'
    const res1 = await repo.attachAudioNote({
      entityType: 'customer',
      entityId: 'acc_del_1',
      businessId: '1',
      fileUri: 'file://' + file1,
    });

    const res2 = await repo.attachAudioNote({
      entityType: 'customer',
      entityId: 'acc_del_1',
      businessId: '1',
      fileUri: 'file://' + file2,
    });

    // Attach note 3 to business '2'
    await repo.attachAudioNote({
      entityType: 'customer',
      entityId: 'acc_del_1',
      businessId: '2',
      fileUri: 'file://' + file3,
    });

    // 1. Delete single audio note
    const delSingleRes = await repo.deleteAudioNote(res1.audioNote.id);
    assert.strictEqual(delSingleRes.success, true);
    assert.strictEqual(delSingleRes.fileDeleted, true);
    assert.strictEqual(fs.existsSync(file1), false, 'File 1 must be unlinked');

    // 2. Cascade delete entity audio notes
    const delEntityRes = await repo.deleteAudioNotesForEntity('customer', 'acc_del_1', '1');
    assert.strictEqual(delEntityRes.success, true);
    assert.strictEqual(delEntityRes.deletedCount, 1);
    assert.strictEqual(fs.existsSync(file2), false, 'File 2 must be unlinked');

    // Verify Business 2 note is still intact
    const b2Notes = repo.getAudioNotesForEntity('customer', 'acc_del_1', '2');
    assert.strictEqual(b2Notes.length, 1);
    assert.strictEqual(fs.existsSync(file3), true, 'File 3 for Business 2 must not be deleted');

    // 3. deleteBusinessCascade
    // Add business 2 to list
    await repo.mutateStore((st) => {
      return {
        ...st,
        businesses: [
          ...(st.businesses || []),
          { id: '2', name: 'Second Shop', isArchived: false },
        ],
      };
    });

    const cascadeBizRes = await repo.deleteBusinessCascade('2');
    assert.strictEqual(cascadeBizRes.success, true);
    assert.strictEqual(repo.getAudioNotesForBusiness('2').length, 0);
    assert.strictEqual(fs.existsSync(file3), false, 'File 3 must be cleaned up on business cascade delete');

    // Cleanup temp dir
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}

    reportTest('Audio Note Deletion & Multi-Tenant Cascade Invariants', true, {
      singleDeleted: true,
      entityCascade: true,
      businessCascade: true,
    });
  } catch (err) {
    reportTest('Audio Note Deletion & Multi-Tenant Cascade Invariants', false, { error: err.message });
  }

  // --- PART 9: ORPHANED FILE GARBAGE COLLECTION ENGINE ---
  try {
    const tmpDir = path.join(os.tmpdir(), 'tallykhata_gc_test_' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    const activeFileName = 'voice_active_123.m4a';
    const orphanFileName1 = 'voice_orphan_999.m4a';
    const orphanFileName2 = 'voice_orphan_888.m4a';

    const activeFilePath = path.join(tmpDir, activeFileName);
    const orphanFilePath1 = path.join(tmpDir, orphanFileName1);
    const orphanFilePath2 = path.join(tmpDir, orphanFileName2);

    fs.writeFileSync(activeFilePath, 'ACTIVE_RECORDING_BYTES');
    fs.writeFileSync(orphanFilePath1, 'ORPHANED_GARBAGE_BYTES_1');
    fs.writeFileSync(orphanFilePath2, 'ORPHANED_GARBAGE_BYTES_2');

    const activeNotes = [
      {
        id: 'aud_1',
        fileName: activeFileName,
        fileUri: 'file://' + activeFilePath,
      },
    ];

    const gcReport = await cleanOrphanedAudioFiles(activeNotes, tmpDir);

    assert.strictEqual(gcReport.scannedCount, 3);
    assert.strictEqual(gcReport.referencedCount, 1);
    assert.strictEqual(gcReport.orphanedCount, 2);
    assert.strictEqual(gcReport.deletedCount, 2);
    assert.ok(gcReport.bytesReclaimed > 0);

    // Active file must still exist
    assert.strictEqual(fs.existsSync(activeFilePath), true, 'Active referenced file must be preserved');
    // Orphaned files must be deleted
    assert.strictEqual(fs.existsSync(orphanFilePath1), false, 'Orphaned file 1 must be deleted');
    assert.strictEqual(fs.existsSync(orphanFilePath2), false, 'Orphaned file 2 must be deleted');

    // Cleanup temp dir
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}

    reportTest('Orphaned Audio File Garbage Collection & Storage Reclamation', true, {
      scanned: gcReport.scannedCount,
      orphaned: gcReport.orphanedCount,
      reclaimedBytes: gcReport.bytesReclaimed,
    });
  } catch (err) {
    reportTest('Orphaned Audio File Garbage Collection & Storage Reclamation', false, { error: err.message });
  }

  // --- PART 10: STORAGE METRICS BREAKDOWN ---
  try {
    const notes = [
      createAudioNoteMetadata({ entityType: 'customer', entityId: 'c1', durationMs: 60000, fileSizeBytes: 240000 }),
      createAudioNoteMetadata({ entityType: 'customer', entityId: 'c2', durationMs: 30000, fileSizeBytes: 120000 }),
      createAudioNoteMetadata({ entityType: 'supplier', entityId: 's1', durationMs: 45000, fileSizeBytes: 180000 }),
      createAudioNoteMetadata({ entityType: 'tagada', entityId: 't1', durationMs: 15000, fileSizeBytes: 60000 }),
    ];

    const stats = calculateAudioStorageUsage(notes, { locale: 'bn' });
    assert.strictEqual(stats.totalCount, 4);
    assert.strictEqual(stats.totalBytes, 600000);
    assert.strictEqual(stats.totalDurationMs, 150000); // 2m 30s
    assert.strictEqual(stats.formattedDurationBn, '০২:৩০');
    assert.strictEqual(stats.byEntityType.customer.count, 2);
    assert.strictEqual(stats.byEntityType.supplier.count, 1);
    assert.strictEqual(stats.byEntityType.tagada.count, 1);

    reportTest('Audio Storage Metrics Aggregation & Entity Categorization', true, {
      totalCount: stats.totalCount,
      totalBytes: stats.formattedBytes,
      totalDuration: stats.formattedDurationBn,
    });
  } catch (err) {
    reportTest('Audio Storage Metrics Aggregation & Entity Categorization', false, { error: err.message });
  }

  // --- PART 11: CLOUD BACKUP SANITIZATION & BINARY EXCLUSION ---
  try {
    const rawAudioNotes = [
      {
        id: 'aud_clean_1',
        fileName: 'voice_c1.m4a',
        fileUri: 'file:///data/user/0/com.progoti.tallykhata/files/audio_notes/voice_c1.m4a',
        durationMs: 30000,
        fileSizeBytes: 120000,
        mimeType: 'audio/m4a',
        createdAt: '2026-11-03T10:00:00.000Z',
        entityType: 'customer',
        entityId: '1',
        businessId: '1',
        title: 'গ্রাহক তাগাদা বার্তা',
        // Heavy binary blobs that must NEVER enter cloud backups:
        audioBlob: Buffer.alloc(50000).toString('base64'),
        base64Data: 'DATA_URIAUDIO_M4A_BASE64_VERY_LARGE...',
        data: { rawPcm: [1, 2, 3, 4, 5] },
        rawBytes: new Uint8Array([0, 1, 2, 3]),
      },
    ];

    const sanitized = sanitizeAudioNotesForBackup(rawAudioNotes);
    assert.strictEqual(sanitized.length, 1);
    const s = sanitized[0];

    // Verify metadata preserved
    assert.strictEqual(s.id, 'aud_clean_1');
    assert.strictEqual(s.fileName, 'voice_c1.m4a');
    assert.strictEqual(s.durationMs, 30000);
    assert.strictEqual(s.fileSizeBytes, 120000);
    assert.strictEqual(s.entityType, 'customer');
    assert.strictEqual(s.entityId, '1');
    assert.strictEqual(s.title, 'গ্রাহক তাগাদা বার্তা');

    // Verify absolute local path scrubbed for portability
    assert.strictEqual(s.fileUri, null, 'fileUri must be sanitized to null for cross-device cloud restore');

    // Verify binary fields stripped
    assert.strictEqual(s.audioBlob, undefined);
    assert.strictEqual(s.base64Data, undefined);
    assert.strictEqual(s.data, undefined);
    assert.strictEqual(s.rawBytes, undefined);
    assert.strictEqual(s.backupExcludedBinary, true);

    reportTest('Cloud Backup Sanitization & Heavy Binary Exclusion', true, {
      sanitized: true,
      binaryStripped: true,
    });
  } catch (err) {
    reportTest('Cloud Backup Sanitization & Heavy Binary Exclusion', false, { error: err.message });
  }

  // --- PART 12: GOOGLE DRIVE BACKUP SERIALIZATION & RESTORE ROUND-TRIP ---
  try {
    const memoryAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memoryAdapter);
    await repo.loadStore();

    // Attach audio note
    await repo.attachAudioNote({
      id: 'aud_cloud_test',
      entityType: 'customer',
      entityId: 'acc_1',
      title: 'Cloud Backup Voice Note',
      durationMs: 25000,
      fileSizeBytes: 100000,
      audioBlob: 'HEAVY_BINARY_SHOULD_BE_STRIPPED',
    });

    const fullState = await repo.getFullBackupState();
    assert.ok(Array.isArray(fullState.audioNotes));
    assert.strictEqual(fullState.audioNotes.length, 1);
    assert.strictEqual(fullState.audioNotes[0].audioBlob, undefined, 'Blob stripped in getFullBackupState');

    // Serialize Google Drive payload
    const userProfile = { sub: 'merchant_google_sub_123', email: 'merchant@test.com' };
    const serialized = googleDriveBackupService.serializeBackupPayload(fullState, {
      userProfile,
      compression: 'gzip',
    });

    assert.ok(serialized.manifest);
    assert.strictEqual(serialized.manifest.recordCounts.audioNotes, 1);

    // Decompress and verify
    const restored = googleDriveBackupService.decompressBackupPayload(serialized);
    assert.ok(Array.isArray(restored.data.audioNotes));
    assert.strictEqual(restored.data.audioNotes.length, 1);
    assert.strictEqual(restored.data.audioNotes[0].id, 'aud_cloud_test');
    assert.strictEqual(restored.data.audioNotes[0].title, 'Cloud Backup Voice Note');

    // Export & Import compressed storage backup
    const compBackup = await repo.exportCompressedBackup();
    assert.strictEqual(compBackup.compressed, true);
    assert.strictEqual(compBackup.manifest.recordCounts.audioNotes, 1);

    const importRes = await repo.importCompressedBackup(compBackup);
    assert.strictEqual(importRes.success, true);
    assert.strictEqual(repo.currentStore.audioNotes.length, 1);

    reportTest('Google Drive & Storage Compressed Backup Round-Trip', true, {
      recordCounts: serialized.manifest.recordCounts.audioNotes,
      compressed: compBackup.compressed,
      restoredCount: repo.currentStore.audioNotes.length,
    });
  } catch (err) {
    reportTest('Google Drive & Storage Compressed Backup Round-Trip', false, { error: err.message });
  }

  // --- PART 13: DELETE ACCOUNT CASCADE WITH AUDIO NOTES ---
  try {
    const memoryAdapter = new MemoryStorageAdapter();
    const repo = new StorageRepository(memoryAdapter);
    await repo.loadStore();

    // Create a customer account
    const accId = '999';
    await repo.mutateStore((st) => ({
      ...st,
      accounts: [
        ...(st.accounts || []),
        { id: accId, name: 'Customer to Delete', type: 1, balance: 500, businessId: '1' },
      ],
      journals: [
        ...(st.journals || []),
        { id: 'j_del_1', accountId: accId, type: 'given', amount: 500, businessId: '1' },
      ],
    }));

    // Attach audio note to customer 999
    await repo.attachAudioNote({
      entityType: 'customer',
      entityId: accId,
      businessId: '1',
      title: 'Customer Note to Cascade Delete',
    });

    // Attach audio note to tagada for customer 999
    await repo.attachAudioNote({
      entityType: 'tagada',
      entityId: accId,
      businessId: '1',
      title: 'Tagada Note to Cascade Delete',
    });

    // Attach audio note to another customer (must NOT be deleted)
    await repo.attachAudioNote({
      entityType: 'customer',
      entityId: '1',
      businessId: '1',
      title: 'Customer 1 Note',
    });

    assert.strictEqual(repo.getAudioNotesForEntity('customer', accId, '1').length, 1);
    assert.strictEqual(repo.getAudioNotesForEntity('tagada', accId, '1').length, 1);

    // Cascade delete account 999
    const cascadeRes = await repo.deleteAccountCascade(accId, '1');
    assert.strictEqual(cascadeRes.success, true);
    assert.strictEqual(cascadeRes.deletedAccountId, accId);
    assert.strictEqual(cascadeRes.deletedJournalsCount, 1);
    assert.strictEqual(cascadeRes.deletedAudioNotesCount, 2);

    // Verify account and journals removed
    assert.ok(!repo.currentStore.accounts.some((a) => String(a.id) === accId));
    assert.ok(!repo.currentStore.journals.some((j) => String(j.accountId) === accId));

    // Verify audio notes for 999 removed, but customer 1 kept
    assert.strictEqual(repo.getAudioNotesForEntity('customer', accId, '1').length, 0);
    assert.strictEqual(repo.getAudioNotesForEntity('tagada', accId, '1').length, 0);
    assert.strictEqual(repo.getAudioNotesForEntity('customer', '1', '1').length, 1);

    reportTest('deleteAccountCascade Comprehensive Cascade Invariant', true, {
      deletedAccount: accId,
      purgedJournals: cascadeRes.deletedJournalsCount,
      purgedAudioNotes: cascadeRes.deletedAudioNotesCount,
    });
  } catch (err) {
    reportTest('deleteAccountCascade Comprehensive Cascade Invariant', false, { error: err.message });
  }

  console.log('='.repeat(80));
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('='.repeat(80));

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
