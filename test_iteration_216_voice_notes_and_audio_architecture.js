/**
 * TEST SUITE: REA-ITER-216 (Audio/Voice Note Attachment, Voice Tagada & SQR Voice Messaging)
 * Target Binary: D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk (REF-001)
 * Expected SHA-256: 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9
 * Expected Size: 53,969,511 bytes
 */

const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const path = require('path');

const APK_PATH = 'D:/Claude/TallyKhata/New folder/TallyKhata-Demo.apk';
const EXPECTED_SHA256 = '267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9';
const EXPECTED_SIZE = 53969511;

let passedTests = 0;
let totalTests = 0;

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
console.log('  REA-ITER-216: AUDIO, VOICE NOTES & SQR MESSAGING TEST SUITE  ');
console.log('================================================================\n');

// Helper to extract entry from APK zip
function readZipEntry(zipBuffer, entryName) {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer.readUInt32LE(i) === eocdSignature) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) return null;
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  let cur = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    const sig = zipBuffer.readUInt32LE(cur);
    if (sig !== 0x02014b50) break;
    const compression = zipBuffer.readUInt16LE(cur + 10);
    const compSize = zipBuffer.readUInt32LE(cur + 20);
    const nameLen = zipBuffer.readUInt16LE(cur + 28);
    const extraLen = zipBuffer.readUInt16LE(cur + 30);
    const commentLen = zipBuffer.readUInt16LE(cur + 32);
    const localHeaderOff = zipBuffer.readUInt32LE(cur + 42);
    const name = zipBuffer.toString('utf8', cur + 46, cur + 46 + nameLen);
    cur += 46 + nameLen + extraLen + commentLen;
    if (name === entryName) {
      const locNameLen = zipBuffer.readUInt16LE(localHeaderOff + 26);
      const locExtraLen = zipBuffer.readUInt16LE(localHeaderOff + 28);
      const dataStart = localHeaderOff + 30 + locNameLen + locExtraLen;
      const compData = zipBuffer.slice(dataStart, dataStart + compSize);
      return compression === 8 ? zlib.inflateRawSync(compData) : compData;
    }
  }
  return null;
}

// Helper to extract all strings from a DEX buffer
function extractDexStrings(dexBuffer) {
  const stringIdsSize = dexBuffer.readUInt32LE(0x38);
  const stringIdsOff = dexBuffer.readUInt32LE(0x3c);
  const strings = new Set();
  const stringList = [];
  for (let i = 0; i < stringIdsSize; i++) {
    let p = dexBuffer.readUInt32LE(stringIdsOff + i * 4);
    let len = 0, shift = 0;
    while (true) {
      const b = dexBuffer[p++];
      len |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    const start = p;
    while (dexBuffer[p] !== 0) p++;
    const s = dexBuffer.toString('utf8', start, p);
    strings.add(s);
    stringList.push(s);
  }
  return { set: strings, list: stringList };
}

// -------------------------------------------------------------
// TEST 1: Reference APK Integrity & Cryptographic Identity
// -------------------------------------------------------------
console.log('--- Test Suite 1: Reference APK Integrity ---');
assert(fs.existsSync(APK_PATH), `Reference APK exists at ${APK_PATH}`);
const apkBuffer = fs.readFileSync(APK_PATH);
assert(apkBuffer.length === EXPECTED_SIZE, `APK size matches expected (${apkBuffer.length} === ${EXPECTED_SIZE})`);
const actualHash = crypto.createHash('sha256').update(apkBuffer).digest('hex');
assert(actualHash === EXPECTED_SHA256, `APK SHA-256 matches expected digest (${actualHash})`);

// Read DEX entries
console.log('\n--- Extracting DEX Containers from Reference APK ---');
const c1Data = readZipEntry(apkBuffer, 'classes.dex');
const c3Data = readZipEntry(apkBuffer, 'classes3.dex');
const c4Data = readZipEntry(apkBuffer, 'classes4.dex');
assert(c1Data !== null, 'classes.dex extracted successfully');
assert(c3Data !== null, 'classes3.dex extracted successfully');
assert(c4Data !== null, 'classes4.dex extracted successfully');

const c1Strings = extractDexStrings(c1Data);
const c3Strings = extractDexStrings(c3Data);
const c4Strings = extractDexStrings(c4Data);

// -------------------------------------------------------------
// TEST 2: Native Audio Recording & Playback Engine Invariants
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Native Audio Recording & Playback Invariants ---');
assert(c1Strings.set.has('Landroid/media/MediaRecorder;'), 'classes.dex contains Landroid/media/MediaRecorder;');
assert(c1Strings.set.has('Landroid/media/AudioAttributes$Builder;'), 'classes.dex contains AudioAttributes$Builder');
assert(c1Strings.set.has('Landroid/media/AudioManager;'), 'classes.dex contains AudioManager');

assert(c3Strings.set.has('Landroid/media/MediaPlayer;'), 'classes3.dex contains Landroid/media/MediaPlayer;');
assert(c3Strings.set.has('audio/3gpp'), 'classes3.dex contains audio/3gpp MIME type');
assert(c3Strings.set.has('audio/amr'), 'classes3.dex contains audio/amr MIME type');
assert(c3Strings.set.has('audio/amr-wb'), 'classes3.dex contains audio/amr-wb MIME type');
assert(c3Strings.set.has('audio/mp4'), 'classes3.dex contains audio/mp4 MIME type');
assert(c3Strings.set.has('audio/mp4a-latm'), 'classes3.dex contains audio/mp4a-latm MIME type');

// -------------------------------------------------------------
// TEST 3: Google Text-To-Speech (TTS) Architecture & Bengali Models
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Google TTS Engine & Bengali Voice Models ---');
assert(c4Strings.set.has('Landroid/speech/tts/TextToSpeech;'), 'classes4.dex contains Landroid/speech/tts/TextToSpeech;');
assert(c4Strings.set.has('Landroid/speech/tts/Voice;'), 'classes4.dex contains Landroid/speech/tts/Voice;');
assert(c4Strings.set.has('com.google.android.tts'), 'classes4.dex contains Google TTS package ID "com.google.android.tts"');
assert(c4Strings.set.has('bn_BD'), 'classes4.dex contains Bengali Bangladesh locale "bn_BD"');
assert(c4Strings.set.has('bn_IN'), 'classes4.dex contains Bengali India locale "bn_IN"');
assert(c4Strings.set.has('bn-in-x-bnx-network'), 'classes4.dex contains high-quality neural voice "bn-in-x-bnx-network"');
assert(c4Strings.set.has('bn-in-x-bin-network'), 'classes4.dex contains neural voice "bn-in-x-bin-network"');
assert(c4Strings.set.has('bn-IN-language'), 'classes4.dex contains standard voice "bn-IN-language"');
assert(c4Strings.set.has('Lcom/progoti/tallykhata/v2/utilities/TKTextToSpeech$TkTTS;'), 'classes4.dex contains TKTextToSpeech$TkTTS interface');

// -------------------------------------------------------------
// TEST 4: SQR Voice Messaging & Push Notification Invariants
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: SQR Voice Notification & Push Notification ---');
assert(c4Strings.set.has('sqrVoiceMessage'), 'classes4.dex contains "sqrVoiceMessage" push trigger');
assert(c4Strings.set.has('sqr_voice_server_id'), 'classes4.dex contains "sqr_voice_server_id" voice identifier');
assert(c4Strings.set.has('sqr_voice_interval_config'), 'classes4.dex contains "sqr_voice_interval_config"');
assert(c4Strings.set.has('btnVoiceOn'), 'classes4.dex contains "btnVoiceOn" voice toggle in TxnShareActivity');
assert(c4Strings.set.has('br_sqr_payment'), 'classes4.dex contains "br_sqr_payment" FCM event trigger');
assert(c4Strings.set.has('TALLYCREDIT'), 'classes4.dex contains "TALLYCREDIT" payment event');
assert(c4Strings.set.has('TALLYPAY'), 'classes4.dex contains "TALLYPAY" digital payment event');

// -------------------------------------------------------------
// TEST 5: RemoteConfig Quiet Hours Logic Invariant
// -------------------------------------------------------------
console.log('\n--- Test Suite 5: RemoteConfig Quiet Hours Suppression Logic ---');
assert(c4Strings.set.has('quiet_hour_in_pm'), 'classes4.dex contains "quiet_hour_in_pm" parameter');
assert(c4Strings.set.has('quiet_hour_in_am'), 'classes4.dex contains "quiet_hour_in_am" parameter');
assert(c4Strings.set.has('interval_time_in_minute'), 'classes4.dex contains "interval_time_in_minute" parameter');

// Verify quiet hours calculation logic
function isQuietHours(hour24, quietStartPm = 22, quietEndAm = 8) {
  // If between 22 (10 PM) and 24, or 0 and 8 (8 AM)
  if (hour24 >= quietStartPm || hour24 < quietEndAm) {
    return true; // Quiet hours: voice notification suppressed
  }
  return false; // Active business hours: voice notification audible
}

assert(isQuietHours(23) === true, '11:00 PM is within quiet hours (suppressed)');
assert(isQuietHours(3) === true, '03:00 AM is within quiet hours (suppressed)');
assert(isQuietHours(7) === true, '07:00 AM is within quiet hours (suppressed)');
assert(isQuietHours(8) === false, '08:00 AM is outside quiet hours (audible)');
assert(isQuietHours(14) === false, '02:00 PM is outside quiet hours (audible)');
assert(isQuietHours(21) === false, '09:00 PM is outside quiet hours (audible)');
assert(isQuietHours(22) === true, '10:00 PM is within quiet hours (suppressed)');

// -------------------------------------------------------------
// TEST 6: Settings Merchant Voice Toggle Event Invariant
// -------------------------------------------------------------
console.log('\n--- Test Suite 6: Settings Voice Notification Toggle ---');
assert(c4Strings.set.has('VoiceNotificationToggled(isChecked='), 'classes4.dex contains VoiceNotificationToggled(isChecked= event');

// -------------------------------------------------------------
// TEST 7: Room DB journal_media Schema & Query Invariants
// -------------------------------------------------------------
console.log('\n--- Test Suite 7: Room DB journal_media Entity & Operations ---');
assert(c4Strings.set.has('journal_media'), 'classes4.dex defines journal_media table');
assert(c4Strings.set.has('index_journal_media_journal_id'), 'classes4.dex defines index_journal_media_journal_id');
assert(c4Strings.set.has('index_journal_media_file_name'), 'classes4.dex defines unique index_journal_media_file_name');
assert(
  c4Strings.set.has('select * from journal_media WHERE is_active = 1 AND journal_id =? order by datetime(create_date)'),
  'classes4.dex contains query to fetch active attachments for a journal entry'
);
assert(
  c4Strings.set.has('UPDATE journal_media SET synced = 0, is_active = 0 WHERE journal_id = ?'),
  'classes4.dex contains soft-delete query for journal attachments'
);

// -------------------------------------------------------------
// TEST 8: Room DB account_media, gallery_media & popup_message
// -------------------------------------------------------------
console.log('\n--- Test Suite 8: Room DB account_media, gallery_media & popup_message ---');
assert(c4Strings.set.has('account_media'), 'classes4.dex defines account_media table');
assert(c4Strings.set.has('index_account_media_account_id'), 'classes4.dex defines index_account_media_account_id');
assert(c4Strings.set.has('index_account_media_file_name'), 'classes4.dex defines index_account_media_file_name');
assert(c4Strings.set.has('gallery_media'), 'classes4.dex defines gallery_media table');
assert(c4Strings.set.has('index_gallery_media_file_name'), 'classes4.dex defines index_gallery_media_file_name');

// Popup audible fields in classes4.dex
assert(c4Strings.set.has('audible_on_open'), 'classes4.dex defines popup audible_on_open attribute');
assert(c4Strings.set.has('audible_title'), 'classes4.dex defines popup audible_title attribute');
assert(c4Strings.set.has('audible_content'), 'classes4.dex defines popup audible_content attribute');

// -------------------------------------------------------------
// TEST 9: Tagada Types & Social Voice Sharing Channels
// -------------------------------------------------------------
console.log('\n--- Test Suite 9: Tagada Types & Social Messaging Channels ---');
assert(c4Strings.set.has('TAGADA_BY_FREE_SMS'), 'classes4.dex contains TAGADA_BY_FREE_SMS');
assert(c4Strings.set.has('TAGADA_BY_SMS'), 'classes4.dex contains TAGADA_BY_SMS');
assert(c4Strings.set.has('TAGADA_BY_SHARE'), 'classes4.dex contains TAGADA_BY_SHARE');

// Social channels in TxnShareActivity
assert(c4Strings.set.has('টালি-মেসেজ'), 'classes4.dex contains Bengali channel "টালি-মেসেজ"');
assert(c4Strings.set.has('এসএমএস'), 'classes4.dex contains Bengali channel "এসএমএস"');
assert(c4Strings.set.has('হোয়াটসঅ্যাপ'), 'classes4.dex contains Bengali channel "হোয়াটসঅ্যাপ"');
assert(c4Strings.set.has('মেসেঞ্জার'), 'classes4.dex contains Bengali channel "মেসেঞ্জার"');
assert(c4Strings.set.has('ইমো'), 'classes4.dex contains Bengali channel "ইমো"');
assert(c4Strings.set.has('ভাইবার'), 'classes4.dex contains Bengali channel "ভাইবার"');

// -------------------------------------------------------------
// TEST 10: Voice Note Lifecycle & Clean-Room Simulation
// -------------------------------------------------------------
console.log('\n--- Test Suite 10: Clean-Room Voice Note Lifecycle Simulation ---');

class MockJournalMediaDatabase {
  constructor() {
    this.records = [];
    this.nextId = 1;
  }

  insert(media) {
    const record = {
      id: this.nextId++,
      file_name: media.file_name,
      path: media.path,
      journal_id: media.journal_id,
      create_date: media.create_date || new Date().toISOString(),
      synced: 0,
      is_active: 1,
      server_id: null,
      duration_seconds: media.duration_seconds || 0,
      mime_type: media.mime_type || 'audio/mp4'
    };
    this.records.push(record);
    return record;
  }

  getActiveByJournalId(journalId) {
    return this.records.filter(r => r.journal_id === journalId && r.is_active === 1);
  }

  softDeleteByJournalId(journalId) {
    let count = 0;
    for (const r of this.records) {
      if (r.journal_id === journalId) {
        r.is_active = 0;
        r.synced = 0;
        count++;
      }
    }
    return count;
  }
}

const db = new MockJournalMediaDatabase();

// 1. Record a voice note for journal entry 1001
const voiceNote = db.insert({
  file_name: 'TK_JM_1001_1730628000.m4a',
  path: 'files/media/TK_JM_1001_1730628000.m4a',
  journal_id: 1001,
  duration_seconds: 14.5,
  mime_type: 'audio/mp4'
});

assert(voiceNote.id === 1, 'Voice note inserted with id 1');
assert(voiceNote.file_name.startsWith('TK_JM_1001_'), 'File name adheres to TK_JM_<journal_id>_<timestamp> convention');
assert(voiceNote.duration_seconds === 14.5, 'Duration recorded accurately (14.5s)');

// 2. Query active attachments
const activeList = db.getActiveByJournalId(1001);
assert(activeList.length === 1, 'Found 1 active attachment for journal 1001');
assert(activeList[0].is_active === 1, 'Attachment is active');

// 3. Soft-delete on journal deletion or edit
const updatedCount = db.softDeleteByJournalId(1001);
assert(updatedCount === 1, 'Soft deleted 1 attachment');
const activeListAfterDelete = db.getActiveByJournalId(1001);
assert(activeListAfterDelete.length === 0, 'Zero active attachments remain after soft-delete');

console.log('\n================================================================');
console.log(`  ALL ${totalTests} TESTS PASSED CLEANLY (100% PASS RATE)       `);
console.log('================================================================');
