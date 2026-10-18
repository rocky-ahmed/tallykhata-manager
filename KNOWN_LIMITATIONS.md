# KNOWN LIMITATIONS & DEVICE NOTES

## 1. Expo Development Client & Metro Bundler
- When running Expo CLI on Windows with `--localhost`, Node resolves to IPv6 `::1:8081`. Android ADB reverse tunnel expects IPv4 `127.0.0.1:8081`. Always start Metro with `--lan` or explicit `0.0.0.0:8081` binding so `adb reverse tcp:8081 tcp:8081` succeeds.
- Xiaomi MIUI 3-button navigation bar occupies bottom screen insets; bottom navigation components must account for 24-28px padding bottom.

## 2. Google OAuth & Cloud Credentials
- Development APK uses package `com.progoti.tallykhata.offline` with verified SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- Changing signing keys requires updating the SHA-1 fingerprint in Google Cloud Console OAuth 2.0 Client credentials.

## 3. Background Autotasks
- Offline-first architecture relies on local AsyncStorage with Mutex write serialization. Automatic backup triggers upon committed state mutations when online.
