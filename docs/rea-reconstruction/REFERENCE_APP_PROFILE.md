# REA RECONSTRUCTION — REFERENCE APPLICATION PROFILE
**Target Identifier:** REF-001  
**Application Name:** TallyKhata Demo Reference Application  
**Target Path:** D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk  
**Target SHA-256:** 267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9  
**Target File Size:** 53,969,511 bytes  
**Maintained by:** Main Engineering Orchestrator  
**Status:** FULLY INVENTORIED & AUTHENTICATED  

---

## 1. Package & Android Platform Specifications
- **Package Name:** com.progoti.tallykhata.offline
- **Application Label:** টালিখাতা (TallyKhata)
- **Minimum Android SDK:** API Level 24 (Android 7.0 Nougat)
- **Target Android SDK:** API Level 36 (Android 16 preview / Modern Android ABI)
- **Container Architecture:** Android APK (ZIP archive with v1, v2, v3 APK Signing Block)
- **Code Signing Identities:**
  - Scheme v1 (JAR signing): Present and verified
  - Scheme v2 (APK Signature Scheme v2): Present and verified
  - Scheme v3 (APK Signature Scheme v3): Present, min_sdk=24, max_sdk=2147483647
  - Source Stamp: CN=Android, OU=Android, O=Google Inc.
- **Integrity Status:** 0 integrity contradictions across 9,839 inspected ZIP entries.

---

## 2. REA Structural Inventory & Artifact Topology
Extracted from REA Evidence bundle D:\Claude\TallyKhata\New folder\tallykhata_demo_evidence.json:
- **REA Evidence IDs:**
  - v_468528fa91d5720c537bc57594e12e76ec6a86cc8e37f2d391a7fbc646fd2a23 (Session root)
  - v_83bc6df2f3c0002857d193bc7f80032e89cd19e400e475d7eb366c454d2790ce (inventory_artifact)
  - v_e2de4efdc5f66d9f1d15f51c98846dffa041a5793df5c3372fb3ce31f5513658 (inspect_artifact)
- **Topological Counts:**
  - Distinct Structural Nodes: 3,162
  - Physical Inventory Occurrences: 3,339
  - Android Manifest Node: AndroidManifest.xml (SHA-256: 3d59ca18a7a2bde8cc4edbf76a2ae70cc45080a35266cebf499a337bc2f89f5e)
  - Compiled Resources Table: esources.arsc (SHA-256: 7d9942bff5624d2afdc36f74ba8c46fafd28e585009ac0df4b4f87b11ca963da)

---

## 3. Dalvik Bytecode Distribution (Multidex)
The reference binary uses 4 Dalvik Executable (DEX) archives:

| DEX Slice | SHA-256 Digest | Primary Responsibilities & Observed Packages |
| :--- | :--- | :--- |
| classes.dex | fc7bfefd4c6d691591bfac50887637833c61793ea10442b08fd5dae840df381 | AndroidX core, lifecycle, Kotlin runtime, Dagger/Hilt injection |
| classes2.dex | 7ee8d8ac26b00262581d16e687c966e1055d25ea6a747c71404b62ba005de801 | Google Play Services, Firebase, WorkManager, OkHttp/Retrofit |
| classes3.dex | c9bf4e84951d71272f12d8db348ca21e59dd3144af1eb6ab0d0c276a4eb44a23 | UI components, Material components, Glide, Chart rendering |
| classes4.dex | 285676d336d029b4f5e8e621753927e42269900cba2af6d6dfd3c75a98e647d | **Core Application Domain:** com.progoti.tallykhata.v2.*, Room DB TallyKhataDatabase_Impl, TKEnum, Ledgers, Cashbox, Tagada |

---

## 4. Key Component Declarations & Entry Points
1. **Application Entry:**
   - Launcher Activity: com.progoti.tallykhata.v2.SplashScreenActivity
   - Main Shell Activity: com.progoti.tallykhata.v2.MainActivity
2. **Navigation Tabs (MainActivity):**
   - HomeFragment: Customer & Supplier Ledgers
   - CashbookFragment: Cashbox (Galla) Register
   - WalletFragment: Digital Wallet & Payments
   - ProfileFragment: Business Profile, Reports & Settings
3. **Primary Workflow Activities:**
   - CreditEntryActivity: Transaction entry (বাকি দিলাম, টাকা পেলাম, ইত্যাদি)
   - CustomerAccountActivity: Detailed ledger history per customer/supplier
   - CashAdjustmentActivity: Cash drawer adjustment & reconciliation
   - TagadaListActivity: Due reminders & Tagada SMS workflow
   - ReportsActivity: Financial summaries, profit/loss, daily statements
