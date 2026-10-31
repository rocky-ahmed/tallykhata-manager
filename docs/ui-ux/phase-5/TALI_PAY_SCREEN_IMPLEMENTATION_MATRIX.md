# TALLYKHATA — PHASE 5 TALI PAY SCREEN IMPLEMENTATION MATRIX
## Complete Payment Screen Inventory, Visual Elevation & Safety Verification Matrix

| Screen ID | Module / Surface | Route / State Selector | Source File & Line Range | Visual Treatment | Touch Target & Contrast | Safety & Functional Verification | QA Review Status | Classification |
|---|---|---|---|---|---|---|---|---|
| **SCR-15** | Digital Wallet Dashboard | `activeTab === 'tallypay'` | `App.js:5313-5520` | 3D Merchant Wallet Card, Bangla QR trigger, 4-column quick action grid, transaction history | Touch $\ge 48\text{dp}$, contrast $\ge 4.5:1$ in Light/Dark | Verified: Wallet balance display, merchant ID, zero promotional clutter | **PASSED** | Core (P0) |
| **SCR-16** | Bangla QR Merchant Modal | `modalBanglaQR` | `App.js:7052-7110` | 3D QR display frame, merchant branding, download & share actions, hitSlop close | Touch $\ge 48\text{dp}$, clean printable surface | Verified: Authentic QR asset rendering, download & share triggers | **PASSED** | Core (P1) |
| **SCR-17** | Add Money Modal | `modalAddMoney` | `App.js:7114-7200` | 3D card/bank selector, amount input with quick chips, fee breakdown, secure CTA | Touch $\ge 48\text{dp}$, full keyboard handling | Verified: Validation guards, non-negative amounts, fee calculation | **PASSED** | Core (P1) |
| **SCR-18** | Send Money / Money Out Modal | `modalMoneyOut` | `App.js:9095-9265` | Recipient input, amount, wallet balance check, masked PIN input, 3D submit button | Touch $\ge 48\text{dp}$, secure entry layout | Verified: Sufficient balance check, idempotency guard, PIN masking | **PASSED** | Core (P1) |
| **SCR-19** | Limits & Fees Modal | `modalTxnLimit` | `App.js:9269-9330` | 3D compliance card, daily/monthly limit progress bars, fee schedule table | Touch $\ge 48\text{dp}$, high contrast table | Verified: Accurate regulatory limits, fee display, clean close | **PASSED** | Secondary (P2) |

---

## Detailed Component Specifications

### 1. SCR-15: Digital Wallet Dashboard
- **Merchant Wallet Card**:
  - Tactile 3D card with gradient background, specular top highlight, and bottom extrusion.
  - Tali Pay white logo badge (`assets/ic_tally_pay_bn_png.png`).
  - Available balance in high-density typography (`৳ XX,XXX.XX`).
  - Merchant ID label: `মার্চেন্ট আইডি: TP-XXXXXXXXXX`.
  - Integrated Bangla QR button (`setModalBanglaQR(true)`).
- **Quick Service Grid**:
  - ৪টি সার্ভিস অ্যাকশন:
    1. অ্যাড মানি (`modalAddMoney`) — আইকন ভ্যারিয়েন্ট `info`
    2. মানি আউট (`modalMoneyOut`) — আইকন ভ্যারিয়েন্ট `success`
    3. মোবাইল রিচার্জ (`modalMobileRecharge`) — আইকন ভ্যারিয়েন্ট `danger`
    4. কিউআর পেমেন্ট (`modalBanglaQR`) — বাংলা কিউআর আইকন
- **Wallet Transaction History**:
  - SectionHeader with count badge.
  - Transaction items with type indicator (green `+` for In, red `-` for Out), date, time, and title.

### 2. SCR-16: Bangla QR Merchant Modal
- **Branding Header**:
  - Bangladesh Bank interoperable Bangla QR standard logo.
  - Merchant store name & account phone number.
- **QR Frame**:
  - High-resolution authentic QR asset (`assets/ic_bangla_qr.png`).
  - Scan & pay guidance in Bengali.
- **Actions**:
  - গ্যালারিতে সেভ করুন (`Button3D` secondary).
  - শেয়ার করুন (`Button3D` primary).

### 3. SCR-17: Add Money Modal
- **Source Selection**:
  - ব্যাংক অ্যাকাউন্ট / ডেবিট কার্ড / বিকাশ / নগদ অপশন।
- **Amount Input**:
  - Numeric input with instant fee breakdown (চার্জ: ৳ ০.০০).
- **CTA**:
  - নিরাপদভাবে টাকা যোগ করুন (`Button3D` primary with lock icon).

### 4. SCR-18: Send Money / Money Out Modal
- **Recipient Verification**:
  - ফোন নম্বর / ব্যাংক অ্যাকাউন্ট ভ্যালিডেশন।
- **Amount & Balance Check**:
  - Insufficient balance error if amount exceeds `walletBalance`.
- **PIN Security**:
  - SecureTextEntry masked PIN input.
- **Idempotency Guard**:
  - Prevents rapid double taps or repeated submissions.

### 5. SCR-19: Limits & Fees Modal
- **Tiered Table**:
  - দৈনিক লেনদেন সীমা: ৳ ৫০,০০০ (ব্যবহৃত: ৳ ০)
  - মাসিক লেনদেন সীমা: ৳ ২,০০,০০০ (ব্যবহৃত: ৳ ০)
- **Fee Transparency**:
  - মার্চেন্ট পেমেন্ট গ্রহণ: সম্পূর্ণ ফ্রি (০%)
  - ব্যাংক ট্র্যান্সফার ফি: নির্ধারিত সরকারি নিয়ম অনুযায়ী
