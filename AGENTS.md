# TALLYKHATA — PERMANENT SUBAGENT & REUSE POLICY

## 1. THREE DESIGNATED WORKER ROLES

The project operates under the REA-Driven Autonomous Reconstruction System with exactly THREE permanent Subagent worker roles:

1. **Worker 1: PERMANENT REA REVERSE ENGINEERING INVESTIGATOR**
   - Active Thread ID: `01a19154-99ab-72a0-9e23-2611b9ffc74c` (Nickname: `Gibbs`)
   - Responsibilities: Continuously investigate authorized reference applications (e.g. `TallyKhata-Demo.apk`) using REA tools; deliver evidence-backed specifications and data models.
   - REA Toolset: `rea inspect-artifact`, `rea project-android-application-graph`, `rea inspect-apk-signature`, `rea doctor`.

2. **Worker 2: PERMANENT BACKEND DEVELOPER & BUSINESS LOGIC**
   - Active Thread ID: `01a1a349-61ae-74d0-aed6-1792e7d1d594` (Nickname: `Averroes`)
   - Responsibilities: Implement backend data models, storage repositories, integer-paisa financial engines, cloud backup/restore, and mutex serialization based on REA specifications.
   - Exclusive Ownership: `src/moneyManagerService.js`, `src/ledgerEngine.js`, `src/storageRepository.js`, `src/googleDriveBackupService.js`, `src/preferencesService.js`.

3. **Worker 3: PERMANENT FRONTEND DEVELOPER, UI/UX & INTERACTIONS**
   - Active Thread ID: `01a19154-e3ee-7ab2-b682-798b64a0bb6b` (Nickname: `Ohm`)
   - Responsibilities: Implement React Native screens, components, user journeys, navigation, tactile haptics, and bilingual localization based on REA specifications.
   - Exclusive Ownership: `App.js`, `src/components/`, `src/themeService.js`, `src/i18nService.js`, `src/hapticFeedbackService.js`.

---

## 2. STRICT SUBAGENT REUSE & LIFECYCLE RULES

1. **Reuse First**: Always reuse the three designated workers via `multi_agent_v1__send_input` or `multi_agent_v1__resume_agent`.
2. **No Automatic Spawning**: Never automatically spawn three new Subagents for every new user prompt.
3. **No Duplicates**: Do not spawn duplicate frontend, backend, or QA workers.
4. **Concurrency Limit**: Maintain a maximum of THREE concurrent Subagents at any time.
5. **Replacements Only When Necessary**: Create a replacement worker only if the designated thread is permanently terminated or cannot accept messages.
6. **Thread ID Verification**: Record replacement thread IDs in `AGENT_REGISTRY.md`. Never claim reuse without matching thread ID verification.

---

## 3. GIT SAFETY POLICY

1. **Explicit Authorization Required**:
   - Never run `git commit` without explicit user authorization.
   - Never run `git push` without explicit user authorization.
   - Never alter remote branches or repository history without explicit user authorization.
2. **Preserve Working Tree**:
   - Preserve all existing uncommitted work.
   - Never run destructive commands (`git reset --hard`, `git checkout -- .`, `git clean -fd`).
   - Do not stage or commit untracked files (`extracted_apk/`, private binaries, keys, screenshots).
3. **No Automatic Pushing**:
   - Remove any conflicting instruction requiring automatic commit or push after every task.

---

## 4. DATA SAFETY & PRODUCTION INTEGRITY

1. Never clear, overwrite, or delete real user financial records or live app databases.
2. Never overwrite or delete production Google Drive backups.
3. All verification and testing must use synthetic, isolated fixtures only.
4. Untracked `extracted_apk/` and assets must remain completely untouched.
