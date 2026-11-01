# TALLYKHATA — CURRENT ITERATION PLAN (ITER-004)
**Iteration ID:** `ITER-004`  
**Iteration Title:** Modal Header Subcomponent Consolidation, Cloud Connectivity Ping & Concurrent Multi-Device Restoration Stress  
**Status:** **QUEUED / READY FOR EXECUTION**  
**Initiated:** 2026-11-01  
**Lead Architect:** Main Agent  

---

## 1. Context & Strategic Rationale
Following the successful completion and certification of `ITER-003`:
1. **Modal Header Subcomponent Consolidation (`BL-009`):** Across `App.js`, modal headers follow a consistent UX pattern (title, subtitle, 3D icon badge, circular close button with 52x52dp hit-slop). Consolidating these into a shared component structure reduces code duplication and standardizes touch accessibility.
2. **Pre-Upload Cloud Connectivity Ping (`BL-014`):** Prior to initiating multipart Google Drive uploads on high-latency 2G/3G connections, performing a lightweight HTTP `HEAD` / connectivity pre-flight check prevents hanging sockets and formalizes exponential backoff.
3. **Multi-Device Concurrent Restoration Stress (`BL-015`):** Simulation of multi-device restoration scenarios to verify that simultaneous or interleaved restore attempts with identical Google credentials never result in partial state corruption or cross-tenant contamination.

---

## 2. Iteration Assignments for ITER-004
- **Worker 1 (Gibbs):** Extract and standardize modal header subcomponent architecture across `App.js` modal dialogs (`BL-009`).
- **Worker 2 (Averroes):** Formalize pre-upload Google Drive connectivity ping and exponential backoff retry policy (`BL-014`).
- **Worker 3 (Ohm):** Implement automated test suite simulating multi-device concurrent backup restore state collisions (`BL-015`).
