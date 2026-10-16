# Known Technical Limitations & External Dependencies

1. **External Payment Gateway Integration**:
   - Real bank transfers and telecom operator recharge APIs (bKash Merchant API, Nagad Gateway, Grameenphone E-load) require active commercial merchant agreements and API credentials.
   - Currently operating in 100% offline local ledger mode, accurately recording wallet credits, debits, and recharge transactions locally without fabricating fake server receipts.

2. **Device Input Injection on Xiaomi MIUI/HyperOS**:
   - Simulating touch taps via `adb shell input tap` on Xiaomi devices requires toggling "USB debugging (Security settings)" in MIUI Developer Options.
   - Screen capture (`adb exec-out screencap`) and bundle delivery over USB (`adb reverse`) work unconditionally without security restrictions.

---

## Phase 3.3 Status & Current Operating Environment
- **Device Connectivity**: Xiaomi Redmi Note 9 (737ee4410405, Android 12, SDK 31) connected via USB ADB.
- **MIUI Input Tap Limitation**: Xiaomi MIUI requires user manual toggle for 'USB debugging (Security settings)' in Developer Options before simulated taps via ADB (db shell input tap) can be dispatched. Screen captures, package inspection, and bundle delivery via Metro work without restrictions.
- **Offline Self-Contained Operation**: 100% of accounting, ledger calculation, cashbox double-entry, inventory, notes, and profile switching run locally in the offline engine with zero cloud dependency.
