# REA RECONSTRUCTION — REFERENCE APPLICATION REGISTRY
**System:** REA-Driven Autonomous Reconstruction System  
**Maintained by:** Main Engineering Orchestrator  
**Last Updated:** 2026-11-01  

---

## 1. Registered Reference Applications

| App ID | Application Name | Local Path | Package / Format | SHA-256 Digest | Size (Bytes) | REA Evidence ID | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REF-001** | TallyKhata Demo Reference | `D:\\Claude\\TallyKhata\\New folder\\TallyKhata-Demo.apk` | Android APK | `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9` | 53,969,511 | `ev_468528fa91d5720c537bc57594e12e76ec6a86cc8e37f2d391a7fbc646fd2a23` | **ACTIVE RECONSTRUCTION TARGET** |

---

## 2. Reference Target Detailed Identity (REF-001)

- **Target Path:** `D:\\Claude\\TallyKhata\\New folder\\TallyKhata-Demo.apk`
- **Target SHA-256:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`
- **Container Format:** Android APK (ZIP container with APK Signing Block)
- **Signature Schemes:** v1 (present), v2 (present), v3 (present, min_sdk=24, max_sdk=2147483647)
- **Source Stamp:** Present (`CN=Android, OU=Android, O=Google Inc.`)
- **REA Evidence Bundle:** `D:\\Claude\\TallyKhata\\New folder\\tallykhata_demo_evidence.json` (7,456,509 bytes)
- **Total Zip Entries Examined:** 9,839
- **Distinct Structural Nodes:** 3,162
- **Inventory Occurrences:** 3,339
- **Integrity Contradictions:** 0

### Key Structural Components (Projected by REA):
1. **Manifest:**
   - `AndroidManifest.xml` (SHA-256: `3d59ca18a7a2bde8cc4edbf76a2ae70cc45080a35266cebf499a337bc2f89f5e`)
2. **Resources Table:**
   - `resources.arsc` (SHA-256: `7d9942bff5624d2afdc36f74ba8c46fafd28e585009ac0df4b4f87b11ca963da`)
3. **Dalvik Bytecode (DEX):**
   - `classes.dex` (SHA-256: `ffc7bfefd4c6d691591bfac50887637833c61793ea10442b08fd5dae840df381`)
   - `classes2.dex` (SHA-256: `7ee8d8ac26b00262581d16e687c966e1055d25ea6a747c71404b62ba005de801`)
   - `classes3.dex` (SHA-256: `c9bf4e84951d71272f12d8db348ca21e59dd3144af1eb6ab0d0c276a4eb44a23`)
   - `classes4.dex` (SHA-256: `f285676d336d029b4f5e8e621753927e42269900cba2af6d6dfd3c75a98e647d`)
4. **Embedded Web / JavaScript Assets:**
   - `assets/bkash/js/jquery-3.7.1.min.js`
   - `assets/help/js/bootstrap.min.js`
   - `assets/help/js/help.js`
   - `assets/help/js/jquery/jquery-3.5.1.min.js`

---

## 3. Legal & Reverse Engineering Boundary
- **Authorization:** Authorized demonstration and compatibility reference target.
- **Methodology:** Clean-room behavioral and structural reconstruction using REA evidence.
- **Policy:** No proprietary code duplication; independent React Native + Expo implementation reproducing observable behavior, data schema, calculations, and UX workflows.
