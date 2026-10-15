# Known Technical Limitations & External Dependencies

1. **External Payment Gateway Integration**:
   - Real bank transfers and telecom operator recharge APIs (bKash Merchant API, Nagad Gateway, Grameenphone E-load) require active commercial merchant agreements and API credentials.
   - Currently operating in 100% offline local ledger mode, accurately recording wallet credits, debits, and recharge transactions locally without fabricating fake server receipts.

2. **Device Input Injection on Xiaomi MIUI/HyperOS**:
   - Simulating touch taps via `adb shell input tap` on Xiaomi devices requires toggling "USB debugging (Security settings)" in MIUI Developer Options.
   - Screen capture (`adb exec-out screencap`) and bundle delivery over USB (`adb reverse`) work unconditionally without security restrictions.
