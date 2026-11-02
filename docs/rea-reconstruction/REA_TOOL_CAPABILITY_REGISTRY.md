# REA RECONSTRUCTION — TOOL CAPABILITY REGISTRY
**System:** Reverse Engineer Anything (REA) Integration  
**Maintained by:** Main Engineering Orchestrator  
**Status:** ACTIVE & DOCUMENTED  

---

## 1. REA Architecture & Operational Framework
The Reverse Engineer Anything (REA) plugin provides deterministic, evidence-backed reverse engineering for compiled application binaries. All observations are authenticated and recorded in immutable Evidence Bundles.

### Core Capabilities:
1. **Artifact Graph Inspection (inspect_artifact, inventory_artifact):**
   - Decomposes container structures (APK, ZIP, AAB, JAR) without executing unverified code.
   - Calculates cryptographic SHA-256 digests for all internal components (DEX files, manifests, assets, resources).
   - Identifies structural nodes, occurrences, entry points, and integrity status.
2. **Android Package & DEX Analysis (inspect_android_package, inspect_apk_signature):**
   - Extracts AndroidManifest declarations, activities, services, broadcast receivers, and intent-filters.
   - Decodes APK Signature Scheme v1, v2, v3 blocks, certificates, and source stamps.
   - Projects Android application topology and dependency models.
3. **Bytecode & Decompilation Integration (Jadx / Dalvik Bytecode):**
   - Dalvik bytecode decompilation across multidex archives (classes.dex - classes4.dex).
   - Identifies database DDL schemas, Room entity builders, DAO interfaces, and enum definitions.
4. **Evidence Bundling & Provenance (get_evidence_bundle, xport_evidence_bundle):**
   - Produces JSON evidence bundles linking observations to specific bytecode locations and source ranges.
   - Enables verifiable clean-room reconstruction without proprietary code copying.

---

## 2. Active REA Tools & MCP Interface Mapping

| Operation / Capability | Tool Identifier | Primary Usage in TallyKhata Reconstruction |
| :--- | :--- | :--- |
| **Artifact Inspection** | ea inspect_artifact | Full ZIP container inventory of TallyKhata-Demo.apk (9,839 entries) |
| **Signature Analysis** | ea inspect_apk_signature | Verification of v1/v2/v3 signatures, developer certificates, and digest coverage |
| **Android Graph Projection** | ea project_android_application_graph | Identification of activities, navigation controllers, and services |
| **Room Schema Extraction** | Bytecode Analysis (classes4.dex) | Extraction of SQLite table DDL (journal, ccount, usiness, etc.) |
| **Enum Disassembly** | Dalvik Analysis (TKEnum) | Mapping transaction types, modes, account roles, and system ledgers |
| **Evidence Serialization** | ea export_evidence_bundle | Export of authenticated evidence bundle 	allykhata_demo_evidence.json |

---

## 3. Supporting Platform & Android Tooling
- **Android Debug Bridge (ADB):** Device inspection, package management, activity launch, and window focus tracking on physical test device (Xiaomi Redmi Note 9, 737ee4410405).
- **Node.js Test Framework:** Autonomous JavaScript test execution verifying integer-paisa financial arithmetic, storage compaction, concurrency mutexes, and cloud backup fidelity.
- **Expo / React Native Toolchain:** Independent clean-room implementation producing production Android APK artifacts.
