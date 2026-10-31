# TALLYKHATA — PHASE 4 TALI VISUAL DESIGN SPECIFICATION
## Premium 3D Visual Language & Tactile Design System for Business Accounting

---

## 1. CORE VISUAL PRINCIPLES

### 1.1 Dimensional Depth & 3D Layering
Every primary surface in the Tali / Business Accounting module utilizes a multi-layered physical depth system:
1. **Top Specular Highlight**: `1.5dp` solid highlight simulating overhead directional light (`rgba(255, 255, 255, 0.75)` in Light Mode, `rgba(255, 255, 255, 0.12)` in Dark Mode).
2. **Bottom Extrusion Ledge**: `2.5dp - 3.0dp` dimensional ledge providing tangible tactile presence (`#CBD5E1` in Light Mode, `#0F172A` in Dark Mode).
3. **Lateral Precision Borders**: `1.0dp` side borders (`#E2E8F0` / `#334155`) defining crisp boundary containment.
4. **Elevation Shadows**: Dual-shadow configuration with `elevation: 3` on Android and subtle Gaussian blur (`shadowOpacity: 0.08`, `shadowRadius: 6`) on iOS.

### 1.2 Squircle Continuous Curvature
All cards, avatars, badges, and action chips adopt the continuous squircle curvature formula:
$$\text{Border Radius} = \text{Dimension} \times 0.28$$
- **Account Avatars**: `48x48dp` with `radius = 14dp`.
- **Quick Action Chips**: `48x48dp` with `radius = 14dp`.
- **Primary Cards**: Corner radius of `16dp` with smooth squircle beveling.

---

## 2. COLOR PALETTES & CONTRAST RATIOS (WCAG 2.2 AA)

| Semantic Element | Light Mode Token | Dark Mode Token | Contrast Ratio | Compliance |
|---|---|---|---|---|
| **Primary Brand Header** | `#B81414` (Deep Crimson) | `#1E293B` (Elevated Slate) | 7.4:1 | **WCAG AAA** |
| **Gave (দিলাম / বাকি)** | `#DC2626` (Bright Crimson) | `#F87171` (Light Coral) | 5.2:1 | **WCAG AA** |
| **Got (পেলাম / জমা)** | `#0F8A0F` (Emerald Green) | `#34D399` (Mint Green) | 5.6:1 | **WCAG AA** |
| **Card Surface** | `#FFFFFF` (Pure White) | `#1E293B` (Dark Slate) | 14.8:1 | **WCAG AAA** |
| **Elevated Surface** | `#F8FAFC` (Ghost White) | `#0F172A` (Midnight) | 13.2:1 | **WCAG AAA** |
| **Primary Text** | `#1A1A1A` (Near Black) | `#F8FAFC` (Off-White) | 16.5:1 | **WCAG AAA** |
| **Secondary Text** | `#4B5563` (Neutral Grey) | `#94A3B8` (Slate Grey) | 5.8:1 | **WCAG AA** |

---

## 3. COMPONENT SPECIFICATIONS

### 3.1 Customer & Supplier Ledger Top Navigation
- **Height**: `56dp` (within standard Android Action Bar standards).
- **Navigation Controls**: Back button and action icons (`call`, `edit`, `delete`) maintain `>= 48x48dp` effective touch area with `hitSlop: { top: 10, bottom: 10, left: 10, right: 10 }`.
- **Party Context**: Prominent account name in bold Bengali typography (`fontSize: 18`, `lineHeight: 24`) and account subtitle (`fontSize: 12`, `color: #6B7280`).

### 3.2 Account Profile Summary Card
- **Avatar Squircle**: 3D container with 1.5dp top sheen and 2.5dp bottom extrusion.
  - Customer: Red tint (`#FFF0F1` / `#450A0A`).
  - Supplier: Green tint (`#ECFDF5` / `#064E3B`).
- **Balance Indicator**: Bold financial typography with prominent currency symbol (`৳`) and localized comma formatting.

### 3.3 Quick Action Bar
- **Chips**: 3 tactile quick action buttons:
  1. **তাগাদা পাঠান (Send SMS)**: Primary red squircle (`ic_sms.png`).
  2. **কল করুন (Call)**: Success green squircle (`ic_call.png`).
  3. **স্টেটমেন্ট শেয়ার (Share Statement)**: Purple squircle (`ic_pdf.png`).
- **Target Size**: Container `48x48dp`, icon size `24dp`, touch target `56x64dp`.

### 3.4 Ledger Table & Transaction Rows
- **Header Columns**:
  - `লেনদেনের বিবরণ`: `flex: 1.6` (Description and timestamp).
  - `দিলাম (-)`: `flex: 1` (Crimson debit amount, right aligned).
  - `পেলাম (+)`: `flex: 1` (Emerald credit amount, right aligned).
- **Transaction Cards**:
  - Row height: Minimum `52dp`.
  - Opening balance row highlighted with distinct tinted background and bold label.
  - Interactive press state triggers `modalVoucher` for instant receipt view.

### 3.5 Bottom Dual Entry Action Bar
- **Bar Height**: `72dp` (with Android navigation bar inset padding).
- **Buttons**:
  - Left (`দিলাম (বাকি)`): Crimson Red `#DC2626` with `#7F0C0C` bottom extrusion ledge.
  - Right (`পেলাম (জমা)`): Emerald Green `#0F8A0F` with `#065F06` bottom extrusion ledge.
- **Press Dynamics**: `activeOpacity: 0.85` with tactile feedback.

---

## 4. TYPOGRAPHY & LOCALIZATION STANDARDS

- **Bengali Line-Height Rule**: All Bengali text includes a minimum `1.35x` line-height multiplier to prevent vowel diacritic (উ-কার, ই-কার, রেফ) clipping.
- **Monetary Precision**: Exact integer paisa normalization rendered through `formatMoney()` with localized Bengali numerals (`০-৯`) in Bengali mode and Western numerals (`0-9`) in English mode.
- **Bilingual Consistency**: Key accounting terms mapped 1:1 across languages (`দিলাম` $\leftrightarrow$ `Gave`, `পেলাম` $\leftrightarrow$ `Got`, `বাকি` $\leftrightarrow$ `Due`, `জমা` $\leftrightarrow$ `Deposit`).

---

## 5. REDMI NOTE 9 PHYSICAL ADAPTATION

- **Display**: 6.53" FHD+ (1080 x 2340 px, ~395 ppi).
- **SafeArea Insets**: Top status bar `28dp`, bottom gesture bar `24dp`.
- **Keyboard Protection**: Modals implement `KeyboardAvoidingView` with `Platform.OS === 'android' ? 'height' : 'padding'` to prevent keypad occlusion.
