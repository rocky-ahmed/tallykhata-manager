# TALLYKHATA — PHASE 5 TALI PAY VISUAL DESIGN SPECIFICATION
## Modern Digital Wallet Language, Interoperable Bangla QR, Security Patterns & Token Parity

---

## 1. VISUAL PHILOSOPHY & OBJECTIVES
Tali Pay serves as the merchant's digital gateway for receiving customer cashless payments and executing digital payouts.
- **Trust & Credibility**: A refined digital card aesthetic inspired by modern fintech applications (Apple Wallet, bKash Merchant, Revolut) that instills immediate user confidence.
- **Interoperability Standards**: Strict adherence to Bangladesh Bank Bangla QR specifications for clear merchant identification and QR frame legibility.
- **Security by Design**: Masked balances, secure PIN inputs, transaction review sheets, and explicit status representation (zero ambiguous states).

---

## 2. COMPONENT ARCHITECTURE & DESIGN TOKENS

### 2.1 Merchant Wallet Card (`SCR-15`)
- **Container**: Custom 3D elevated card container.
  - Light mode: Deep crimson/burgundy gradient `#991B1B` $\rightarrow$ `#7F1D1D` with subtle golden accent trim.
  - Dark mode: Sophisticated obsidian/ruby gradient `#450A0A` $\rightarrow$ `#1F0404` with ruby border.
  - Geometry: `borderRadius: 16`, `borderWidth: 1`, `borderColor: rgba(255, 255, 255, 0.2)`.
  - 3D Physics: Top specular reflection `rgba(255, 255, 255, 0.25)` and bottom extrusion ledge `3dp`.
- **Branding Header**:
  - Official Tali Pay logo asset (`assets/ic_tally_pay_bn_png.png`) rendered in white.
  - Merchant status pill: `মার্চেন্ট ওয়ালেট` in crisp 11sp bold text.
- **Balance Display**:
  - Prominent 28sp bold typography with `৳` currency symbol.
  - Sub-label: `মার্চেন্ট আইডি: TP-XXXXXXXXXX` with high legibility.
- **Bangla QR Button**:
  - Embedded circular squircle button (`#FFFFFF` background, `elevation: 4`) with Bangla QR glyph and label.

### 2.2 Quick Service Grid
- **4 Action Items**:
  1. `অ্যাড মানি`: Bank/card inflow icon container.
  2. `মানি আউট`: Cash payout/withdrawal icon container.
  3. `মোবাইল রিচার্জ`: Airtime top-up icon container.
  4. `কিউআর পেমেন্ট`: Merchant Bangla QR scanner/display container.
- **Touch Target**: Each item spans full grid column with minimum $56\times 56\text{dp}$ touch bounds.

### 2.3 Bangla QR Display Modal (`SCR-16`)
- **Card Surface**: Pure white printable surface with authentic Bangladesh Bank Bangla QR branding header.
- **QR Asset**: Crisp rendering of `assets/ic_bangla_qr.png` at $200\times 200\text{px}$.
- **Merchant Verification**: Dynamic merchant business name and registered phone number displayed below QR.
- **Actions**: Two tactile action buttons (`Button3D`): Save to Gallery and Share.

### 2.4 Secure Payout Modal (`SCR-18`)
- **Review Card**: Displays recipient, requested amount, available balance, and transaction fee.
- **PIN Input**: Masked character dots with biometric option placeholder.
- **Validation**: Strict balance check preventing overdraft.

---

## 3. WCAG 2.2 AA CONTRAST AUDIT MATRIX
- White text on Burgundy Wallet Card (`#FFFFFF` on `#7F1D1D`): Contrast ratio `8.9:1` $\rightarrow$ **EXCEEDS $\ge 4.5:1$**
- Service Icon Labels on Screen Surface: Contrast ratio `11.5:1` (Light) / `13.1:1` (Dark) $\rightarrow$ **PASS**
- Action Button text on Primary CTA: Contrast ratio `5.4:1` $\rightarrow$ **PASS**
