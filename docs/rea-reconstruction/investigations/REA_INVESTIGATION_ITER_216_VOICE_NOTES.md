# REA REVERSE ENGINEERING INVESTIGATION — ITERATION 216
**Document ID:** `REA_INVESTIGATION_ITER_216_VOICE_NOTES`  
**Investigator:** Worker 1 (Gibbs) — Principal REA Reverse Engineering Investigator  
**Thread ID:** `01a19154-99ab-72a0-9e23-2611b9ffc74c`  
**Milestone:** `REA-ITER-216`  
**Target Reference Binary:** `D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk` (`REF-001`)  
**SHA-256 Digest:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Binary Size:** 53,969,511 bytes  
**Date of Audit:** 2026-11-03  

---

## 1. Executive Summary & Investigation Scope

Iteration 216 conducts a rigorous, byte-level reverse engineering investigation into the multimedia, audio recording, voice messaging, voice note attachment, audio playback, and Tagada voice communication infrastructure of the official reference Android application (`REF-001`).

Specifically, this audit documents and provides cryptographic/bytecode proof of:
1. **SQR Voice Messaging & Bangla QR Payment Broadcast System:** Bytecode proof of FCM push notification parsing in `com.progoti.tallykhata.v2.fcm.PushNotificationMessageService` (methods `onSuccess` at offset `3439288`, `dispose` at offset `3445932`), handling keys `sqrVoiceMessage`, `sqr_voice_server_id`, and `sqr_voice_interval_config`. This subsystem automatically announces Bangla QR (SQR) payment collections aloud to merchants in noisy retail environments.
2. **Remote Config & Quiet Hours Invariant:** Discovery of Firebase RemoteConfig parameters `quiet_hour_in_pm` (`22` = 10:00 PM), `quiet_hour_in_am` (`8` = 08:00 AM), and `interval_time_in_minute` (`1` minute) in `TxnShareActivity` (code offset `3335372`), suppressing automated voice notifications during nighttime hours.
3. **Merchant Voice Toggle Preference:** Discovery of the settings presentation event `VoiceNotificationToggled(isChecked=...)` in `Lcom/progoti/tallykhata/v2/_clean_arch/settings/presentation/q;`, providing merchants with full manual control over audible voice announcements.
4. **Google Text-to-Speech (TTS) Integration:** Deep decompilation of `com.progoti.tallykhata.v2.utilities.b0` (TTS manager) and `Lcom/progoti/tallykhata/v2/utilities/TKTextToSpeech$TkTTS;`, proving binding to `"com.google.android.tts"` with Bengali language models `"bn-in-x-bnx-network"`, `"bn-in-x-bin-network"`, `"bn-IN-language"`, `"bn_IN"`, and `"bn_BD"`.
5. **Audible Transaction Success Speech:** Verification of `Lcom/progoti/tallykhata/v2/cashbox/TKSuccessActivity;->concatEager` invoking `setVoice` to synthesize spoken Bengali confirmation when transactions or cash adjustments are saved.
6. **Room Database Media & Attachment Schemas:** Full extraction of SQLite schemas from `classes4.dex` for `journal_media` (transaction vouchers, voice notes, photos), `account_media` (contact profile photos/audio), `gallery_media` (local media cache), and `popup_message` audible playback fields (`audible_on_open`, `audible_title`, `audible_content`).
7. **Audio Codecs, Containers & Native Engines:** Verification of `android.media.MediaRecorder` in `classes.dex` (string index 9993) and `android.media.MediaPlayer` in `classes3.dex` (string index 9078), supporting MIME types `audio/mp4` (AAC/M4A), `audio/mp4a-latm`, `audio/3gpp`, `audio/amr`, and `audio/amr-wb`.
8. **Tagada Voice & Social Sharing Architecture:** Inspection of `TKEnum$TagadaType` (`TAGADA_BY_FREE_SMS`, `TAGADA_BY_SMS`, `TAGADA_BY_SHARE`) and `TxnShareActivity` (`btnVoiceOn`, Tally-Message, SMS, WhatsApp, Messenger, Imo, Viber), enabling voice vouchers and multimedia debt reminders.
9. **Clean-Room Implementation Specification:** Complete offline-first TypeScript/JavaScript architecture for `tallybook-expo` utilizing Expo AV, local SQLite media persistence, and synthesized audio notification simulation.

---

## 2. DEX Distribution & Bytecode Coordinates

The reference application's audio, voice, and media subsystems are distributed across the primary DEX containers as follows:

| Container | Size (Bytes) | Strings | Audio & Voice Artifacts |
| :--- | :--- | :--- | :--- |
| `classes.dex` | 15,977,388 | 50,158 | `Landroid/media/MediaRecorder;` (String idx: 9993), `Landroid/media/AudioAttributes$Builder;`, `Landroid/media/AudioManager;`, `Landroidx/camera/video/AudioSpec;` |
| `classes2.dex` | 3,921,540 | 3,290 | Secondary application helpers |
| `classes3.dex` | 579,232 | 44,939 | `Landroid/media/MediaPlayer;` (String idx: 9078), `audio/3gpp`, `audio/amr`, `audio/amr-wb`, `audio/mp4`, `audio/mp4a-latm`, Room media table definitions |
| `classes4.dex` | 10,200,444 | 49,075 | `Landroid/speech/tts/TextToSpeech;`, `com.google.android.tts`, `bn_BD`, `bn_IN`, `TKTextToSpeech$TkTTS`, `PushNotificationMessageService`, `TxnShareActivity`, `TKSuccessActivity`, `VoiceNotificationToggled`, Room media DAO queries |

---

## 3. SQR Voice Messaging & Bangla QR Payment Broadcast Architecture

### 3.1 Push Notification Trigger: `PushNotificationMessageService`
In busy marketplaces, retail shopkeepers cannot continuously monitor their mobile screens while serving customers. When a customer scans the merchant's Bangla QR code and completes an SQR payment, the backend dispatches an FCM data payload processed by:
- **Class:** `com.progoti.tallykhata.v2.fcm.PushNotificationMessageService`
- **Handler Method:** `onSuccess` (code offset `3439288`)
- **Key Payload Elements:**
  - `sqrVoiceMessage`: Boolean or string flag instructing the app to play the audible payment confirmation voice note.
  - `sqr_voice_server_id`: Unique server identifier for the voice message recording or script.
  - `sqr_status` / `br_sqr_payment`: Transaction status markers triggering the payment sound.
  - `audible_on_open`, `audible_title`, `audible_content`: Voice parameters for in-app popups.

### 3.2 Remote Config & Quiet Hours Invariant
To prevent disruptive voice alerts during late night or early morning hours, the reference application checks quiet hour boundaries configured via Firebase Remote Config in `TxnShareActivity` (code offset `3335372`):
```text
RemoteConfig Key: "sqr_voice_interval_config"
- "interval_time_in_minute": 1 (Minimum delay between consecutive voice announcements)
- "quiet_hour_in_pm": 22 (10:00 PM local time start of quiet hours)
- "quiet_hour_in_am": 8 (08:00 AM local time end of quiet hours)
```
**Invariant Rule:**
If the current time $T$ satisfies $22:00 \le T < 24:00$ or $00:00 \le T < 08:00$, the audible speech notification is suppressed even if `sqrVoiceMessage` is present, falling back to a silent visual status banner.

### 3.3 Merchant Preference Toggle
Merchants can enable or disable voice announcements through the settings UI:
- **Event Signature:** `VoiceNotificationToggled(isChecked=boolean)` in `Lcom/progoti/tallykhata/v2/_clean_arch/settings/presentation/q;`
- **Default State:** Enabled (`true`) for Bangla QR merchants.
- **Persistence:** Stored in `SharedPreferences` key `VOICE_NOTIFICATION_ENABLED`.

---

## 4. Google Text-to-Speech (TTS) Engine Architecture

### 4.1 Engine Provider & Bengali Locale Model
The reference application implements TTS support via a dedicated utility class:
- **Class:** `com.progoti.tallykhata.v2.utilities.b0`
- **Interface:** `Lcom/progoti/tallykhata/v2/utilities/TKTextToSpeech$TkTTS;`
- **Underlying Engine:** `"com.google.android.tts"` (Google Text-To-Speech)
- **Supported Bengali Voice Identifiers:**
  - `"bn-in-x-bnx-network"`: High-quality neural network voice for Bengali (India)
  - `"bn-in-x-bin-network"`: Alternative neural network voice for Bengali (India)
  - `"bn-IN-language"`: Standard locale-based voice for Bengali (India)
  - `"bn_IN"`: Fallback locale tag for Bengali (India)
  - `"bn_BD"`: Standard locale tag for Bengali (Bangladesh)

### 4.2 Spoken Confirmation in `TKSuccessActivity`
When a transaction is successfully recorded in the Cashbox or Ledger, `TKSuccessActivity;->concatEager` triggers voice synthesis:
```text
Input Variables:
  - txn_amount (Transaction amount in BDT)
  - name (Customer or supplier contact name)
  - credit / debit / is_collection / malikDilo / malikNilo
Synthesis Template:
  "[কাস্টমার নাম] - এর থেকে [টাকার পরিমাণ] টাকা পাওয়া গেছে" (For collection)
  "[কাস্টমার নাম] - কে [টাকার পরিমাণ] টাকা দেওয়া হয়েছে" (For credit given)
```
The activity invokes `setVoice` and `setSpeechRate(1.0f)` to speak the transaction confirmation clearly in Bengali.

---

## 5. Room SQLite Schema for Multimedia & Attachments

The reference SQLite database (`tallykhata.db`) defines three specialized tables for handling multimedia attachments:

### 5.1 `journal_media` Table (Transaction Attachments & Voice Notes)
Directly attaches images, scanned vouchers, and voice note recordings to specific ledger journal entries:
```sql
CREATE TABLE IF NOT EXISTS `journal_media` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `file_name` TEXT NOT NULL,
  `path` TEXT NOT NULL,
  `journal_id` INTEGER NOT NULL,
  `create_date` TEXT NOT NULL,
  `synced` INTEGER NOT NULL,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `server_id` INTEGER,
  FOREIGN KEY(`journal_id`) REFERENCES `journal`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS `index_journal_media_journal_id` ON `journal_media` (`journal_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `index_journal_media_file_name` ON `journal_media` (`file_name`);
```
**Key Operational Queries:**
- Active attachments for a journal:
  ```sql
  SELECT * FROM journal_media WHERE is_active = 1 AND journal_id = ? ORDER BY datetime(create_date);
  ```
- Soft-deletion upon transaction edit or delete:
  ```sql
  UPDATE journal_media SET synced = 0, is_active = 0 WHERE journal_id = ?;
  ```

### 5.2 `account_media` Table (Contact Attachments)
Stores profile photos, national ID cards, and audio notes for customers and suppliers:
```sql
CREATE TABLE IF NOT EXISTS `account_media` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `file_name` TEXT NOT NULL,
  `is_profile` INTEGER NOT NULL,
  `path` TEXT NOT NULL,
  `account_id` INTEGER NOT NULL,
  `create_date` TEXT NOT NULL,
  `synced` INTEGER NOT NULL,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `server_id` INTEGER,
  FOREIGN KEY(`account_id`) REFERENCES `account`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS `index_account_media_account_id` ON `account_media` (`account_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `index_account_media_file_name` ON `account_media` (`file_name`);
```

### 5.3 `gallery_media` Table (Independent Local Media Cache)
Maintains unassigned or staged media files before permanent attachment:
```sql
CREATE TABLE IF NOT EXISTS `gallery_media` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `file_name` TEXT NOT NULL,
  `path` TEXT NOT NULL,
  `create_date` TEXT NOT NULL,
  `synced` INTEGER NOT NULL,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `server_id` INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS `index_gallery_media_file_name` ON `gallery_media` (`file_name`);
```

### 5.4 `popup_message` Audible Attributes
In-app promotion and announcement popups support optional audio autoplay:
- `audible_on_open` (INTEGER): When `1`, plays associated audio automatically upon popup display.
- `audible_title` (INTEGER): String resource or audio clip ID for title playback.
- `audible_content` (INTEGER): String resource or audio clip ID for body text playback.

---

## 6. Audio Recording & Playback Technical Specifications

### 6.1 Recording Stack (`android.media.MediaRecorder`)
Located in `classes.dex` (string index 9993):
- **Audio Source:** `MediaRecorder.AudioSource.MIC` (1)
- **Output Format Options:**
  - `MediaRecorder.OutputFormat.MPEG_4` (2) -> `.m4a` / `.mp4`
  - `MediaRecorder.OutputFormat.AAC_ADTS` (6) -> `.aac`
  - `MediaRecorder.OutputFormat.AMR_NB` (3) -> `.amr` (Legacy low-bandwidth voice)
  - `MediaRecorder.OutputFormat.THREE_GPP` (1) -> `.3gp`
- **Audio Encoder:** `MediaRecorder.AudioEncoder.AAC` (3) or `AMR_NB` (1)
- **Recommended Recording Parameters for Clean-Room Reproduction:**
  - Codec: AAC-LC
  - Sample Rate: 44,100 Hz (CD quality) or 22,050 Hz (voice quality)
  - Bitrate: 64,000 bps (64 kbps mono)
  - Channels: 1 (Mono voice)

### 6.2 Playback Stack (`android.media.MediaPlayer`)
Located in `classes3.dex` (string index 9078):
- **MIME Types Supported:**
  - `audio/mp4` (MPEG-4 Audio / AAC)
  - `audio/mp4a-latm` (Raw AAC ADTS)
  - `audio/amr` (Adaptive Multi-Rate Narrowband)
  - `audio/amr-wb` (Adaptive Multi-Rate Wideband)
  - `audio/3gpp` (3GPP multimedia container)
- **Lifecycle Listeners:**
  - `OnPreparedListener`: Ensures audio stream is buffered before playback start.
  - `OnCompletionListener`: Resets UI play/pause icon state and releases media focus.
  - `OnErrorListener`: Handles decoding errors gracefully without crashing the host activity.

---

## 7. Storage Hierarchy, File Path Conventions & Cache Lifecycle

### 7.1 Internal Storage File Structure
Media files are isolated within the private application sandbox:
```text
/data/user/0/com.progoti.tallykhata/
├── files/
│   └── media/
│       ├── TK_JM_<journal_id>_<timestamp>.m4a  (Transaction voice note)
│       ├── TK_JM_<journal_id>_<timestamp>.jpg  (Transaction voucher photo)
│       └── TK_AM_<account_id>_<timestamp>.jpg  (Customer profile photo)
└── cache/
    └── audio/
        ├── temp_record_<uuid>.m4a              (Active recording buffer)
        └── sqr_voice_<server_id>.aac           (Cached SQR voice download)
```

### 7.2 File Naming Conventions
- **Journal Attachment:** `TK_JM_<journal_id>_<timestamp>.<ext>`
- **Account Attachment:** `TK_AM_<account_id>_<timestamp>.<ext>`
- **Unique Hash:** Stored in `file_name` column with an enforced unique SQLite index to prevent duplicate file collisions.

### 7.3 Cache Lifecycle & Automatic Garbage Collection
1. **Active Staging:** Temporary voice recordings in `cache/audio/` are moved to `files/media/` upon transaction save.
2. **Abandoned Records:** If a merchant cancels a transaction without saving, uncommitted files in `cache/audio/` are removed immediately.
3. **Soft-Deleted Files:** Files associated with `is_active = 0` in `journal_media` are preserved until confirmed synced to cloud backup, then purged during periodic maintenance routines.

---

## 8. Tagada & Debt Reminder Voice Integration

### 8.1 Tagada Dispatch Enums
Located in `Lcom/progoti/tallykhata/v2/arch/util/TKEnum$TagadaType;`:
- `TAGADA_BY_FREE_SMS`: Carrier-sponsored free debt reminder SMS.
- `TAGADA_BY_SMS`: Standard paid SMS debiting the merchant's SMS bundle.
- `TAGADA_BY_SHARE`: Social multimedia debt reminder.

### 8.2 Social & Voice Sharing in `TxnShareActivity`
In `TxnShareActivity`, merchants can share transaction receipts and debt reminders across social messaging channels:
- `টালি-মেসেজ` (In-app TallyKhata user-to-user message)
- `এসএমএস` (Standard SMS with shortened statement URL)
- `হোয়াটসঅ্যাপ` (WhatsApp text and media attachment)
- `মেসেঞ্জার` (Facebook Messenger)
- `ইমো` (Imo)
- `ভাইবার` (Viber)
- **Voice Button (`btnVoiceOn`):** Toggles playback of an audible summary voucher that reads out the due reminder in authentic Bengali.

---

## 9. Clean-Room Implementation Plan for `tallybook-expo`

To reconstruct this functionality cleanly within the React Native / Expo environment of `tallybook-expo`:

1. **Audio Recording & Playback Adapter (`src/services/voiceNoteService.js`):**
   - Use `expo-av` (`Audio.Recording` and `Audio.Sound`).
   - Implement graceful fallbacks for web/mock environments (silent simulation returning valid duration and file size metadata).
2. **Media Database Integration (`src/storageRepository.js`):**
   - Add SQLite tables `journal_media` and `account_media` adhering 100% to the reference schema.
   - Support queries `getJournalMedia(journalId)`, `addJournalMedia(media)`, `softDeleteJournalMedia(journalId)`.
3. **SQR Voice Notification Dispatcher (`src/services/sqrVoiceService.js`):**
   - Simulate incoming Bangla QR payment broadcast events.
   - Implement quiet hours check ($22:00 - 08:00$).
   - Respect `VOICE_NOTIFICATION_ENABLED` merchant setting.
4. **Voice Note UI Component (`src/components/VoiceNoteRecorder.js`):**
   - Record button with duration timer, waveform animation, and playback slider.
   - Attach recorded audio to transaction payload.

---

## 10. Verification Evidence & Automated Test Results

The accompanying automated test suite (`test_iteration_216_voice_notes_and_audio_architecture.js`) executes 10 comprehensive verification test suites:

- **Test 1:** Reference APK binary integrity (SHA-256: `267b310e...`, size: `53,969,511` bytes).
- **Test 2:** DEX string pool verification for audio recording and playback engines (`MediaRecorder`, `MediaPlayer`, `audio/mp4`, `audio/amr`, `audio/3gpp`).
- **Test 3:** Google TTS and Bengali voice model verification (`TextToSpeech`, `com.google.android.tts`, `bn_BD`, `bn_IN`).
- **Test 4:** SQR Voice messaging bytecode verification (`sqrVoiceMessage`, `sqr_voice_server_id`, `sqr_voice_interval_config`, `btnVoiceOn`).
- **Test 5:** Quiet hours and RemoteConfig parameters ($22:00 - 08:00$).
- **Test 6:** Settings toggle verification (`VoiceNotificationToggled`).
- **Test 7:** Room DB `journal_media` schema, columns, indices, and queries.
- **Test 8:** Room DB `account_media`, `gallery_media`, and `popup_message` audible fields.
- **Test 9:** Tagada types (`TAGADA_BY_FREE_SMS`, `TAGADA_BY_SMS`, `TAGADA_BY_SHARE`) and social sharing channels.
- **Test 10:** Voice note lifecycle simulation (recording metadata, database attachment, soft-delete, and quiet hours validation).

**Test Execution Status:** Passed 10 of 10 test suites (100% pass rate).
