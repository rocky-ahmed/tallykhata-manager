# TALLYKHATA — PHASE 6 BUSINESS MANAGEMENT VISUAL SPECIFICATION
## Switcher Bottom Sheet, Business Cards, Profile Typography & Dialogs

---

## 1. BUSINESS SWITCHER BOTTOM SHEET (SCR-28)
- **Overlay**: `rgba(0,0,0,0.6)` with backdrop dismiss.
- **Card Container**:
  - Border Radius: $24\text{dp}$ top-left, $24\text{dp}$ top-right.
  - Background: `#FFFFFF` (Light), `#1E293B` (Dark).
  - Handle Indicator: $40 \times 4\text{ dp}$ pill in `#CBD5E1` (Light) / `#475569` (Dark).
- **Header**:
  - Title: "ব্যবসা প্রতিষ্ঠান পরিবর্তন" in $18\text{sp}$ Bold Bengali typography.
  - Close Button: $36 \times 36\text{ dp}$ circle with $48 \times 48\text{ dp}$ hitSlop.

---

## 2. ACTIVE VS INACTIVE BUSINESS CARDS
### A. Active Business Card (বর্তমানে সক্রিয়)
- **Border**: $2\text{dp}$ solid border in Primary Crimson (`#B81414`) or Emerald (`#0F8A0F`).
- **Background**: Soft tinted surface (`#FEF2F2` in light mode, `#450A0A` in dark mode).
- **Badge**: "বর্তমানে সক্রিয়" SquircleBadge in Primary with white bold text.
- **Elevation**: $4\text{dp}$ 3D shadow with distinct tactile presence.
- **Logo Container**: $44 \times 44\text{ dp}$ rounded container with authentic TallyKhata shop icon.

### B. Inactive Business Card
- **Border**: $1\text{dp}$ border in `#E5E7EB` (Light) / `#334155` (Dark).
- **Background**: `#FFFFFF` (Light) / `#0F172A` (Dark).
- **Switch Action**: Entire row is clickable with immediate switch feedback and alert confirmation.
- **Archive Action**: Distinct archive button for multi-business setups with $\ge 2$ businesses.

### C. Archived Business Section
- **Header**: "আর্কাইভকৃত প্রতিষ্ঠান" in muted $13\text{sp}$ bold text.
- **Card**: Muted gray card background with struck/dimmed business name.
- **Action CTAs**:
  - "পুনরুদ্ধার" (Restore): Emerald mini-button.
  - "মুছুন" (Delete): Crimson destructive mini-button.

---

## 3. ADD BUSINESS FORM (SCR-29)
- **Card Style**: Standard centered modal card with $18\text{dp}$ padding.
- **Required Fields**:
  - ব্যবসার নাম (Required, with red asterisk `*`)
  - স্বত্বাধিকারীর নাম (Owner Name)
  - মোবাইল নম্বর (11-digit Phone)
  - ব্যবসার ঠিকানা (Address)
- **Action Buttons**:
  - "বাতিল": `Button3D` variant `secondary`.
  - "নতুন প্রতিষ্ঠান তৈরি করুন": `Button3D` variant `primary` (Crimson) with instant switch upon creation.
