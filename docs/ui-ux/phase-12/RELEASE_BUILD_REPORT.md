# TALLYKHATA — PHASE 12: RELEASE BUILD CONFIGURATION REPORT
## Android Gradle Configuration, SDK Versions, Engine Settings & Signing Status

---

## 1. Build Specifications
- **Application ID:** `com.progoti.tallykhata.offline`
- **Version Name:** `4.0.0`
- **Version Code:** `1`
- **Compile SDK:** 35 (Android 15)
- **Target SDK:** 35 (Android 15)
- **Min SDK:** 24 (Android 7.0 Nougat)
- **JavaScript Engine:** Hermes (Enabled: `hermesEnabled=true`)
- **Architecture:** React Native New Architecture (`newArchEnabled=true`)
- **Display:** Edge-to-Edge (`edgeToEdgeEnabled=true`)

---

## 2. Signing & Distribution Readiness
- **Debug Signing:** Configured for development builds and local device testing.
- **Release Signing:** Ready for production keystore injection via environment variables or EAS credentials.
- **ProGuard / R8:** Asset crunching enabled (`android.enablePngCrunchInReleaseBuilds=true`).
