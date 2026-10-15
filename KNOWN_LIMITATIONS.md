# Known Limitations & Architecture Boundaries

## 1. Offline vs. Live Server Integrations
- **SMS Gateway**:
  - Current Behavior: Invokes native Android SMS composer (Linking.openURL('sms:...?body=...')) or WhatsApp chat (Linking.openURL('whatsapp://send?...')) to send real messages through the user's carrier SIM or WhatsApp.
  - Server Dependency: In the commercial production app, automated transactional SMS uses TallyKhata's backend SMPP server. In this offline release, device-native messaging is used.
- **TallyPay Core Banking**:
  - Current Behavior: Full client-side wallet simulation with instant balance updates, persistent transaction slips, and voucher generation.
  - Server Dependency: Production live payments require Bangladesh Bank NPSB / BEFTN / MFS switch clearance.
- **Cloud Sync**:
  - Current Behavior: Robust offline JSON backup export and restoration mechanism with SHA-256 verification.
  - Server Dependency: Automatic real-time multi-device cloud synchronization requires authenticated Firebase/REST backend endpoints.
