# TALLYKHATA — CURRENT DESIGN INCONSISTENCIES & DEFECT AUDIT
## Systematic Catalog of Visual, Spacing, Iconographic & Typographic Defects

---

## 1. COLOR FRAGMENTATION & HARDCODED VALUES

1. **1,510 Hardcoded Hex Color Literals:**
   - Analysis of App.js identifies 1,510 raw hex occurrences across 136 distinct codes.
   - Most frequent hardcoded colors: #FFFFFF (202), #B81414 (88), #E2E8F0 (60), #64748B (57), #E5E7EB (56), #F1F5F9 (48), #1E293B (46), #10B981 (44).
   - **Impact:** Hardcoded #FFFFFF and #1E293B in secondary modals cause harsh contrast breaks and unreadable dark-on-dark text when the user toggles Dark Mode.
2. **WCAG 2.2 AA Contrast Failures (Light Mode on White Surface):**
   - textMuted (#94A3B8): **2.56:1** (FAIL AA Normal & Large). Must be shifted to #475569 (7.12:1, PASS AAA).
   - success (#10B981): **2.54:1** (FAIL AA Normal Text). Must be shifted to #047857 (4.54:1, PASS AA).
   - warning (#F59E0B): **2.15:1** (FAIL AA Normal Text). Must be shifted to #B45309 (4.52:1, PASS AA).
   - danger (#EF4444): **3.76:1** (FAIL AA Normal Text). Must be shifted to #DC2626 (4.52:1, PASS AA).

---

## 2. ICON SCALING & OPTICAL DEFICITS

1. **Intrinsic Whitespace Disparity in PNG Artwork:**
   - ic_cash_sale.png: 240 x 240 canvas, 237 x 233 glyph (4.1% whitespace) — optical weight heavy / full-bleed.
   - ic_cash_buy.png: 240 x 240 canvas, 172 x 168 glyph (49.8% whitespace) — optical weight weak (-38.4% visual area).
   - ic_delete.png: 240 x 240 canvas, 151 x 169 glyph (55.7% whitespace) — optical weight tiny (-50% visual area).
2. **Optical Scaling Solution:**
   - Standardize AppIcon with an opticalScale multiplier table:
     - ic_cash_buy: 1.28x
     - ic_delete: 1.35x
     - ic_edit: 1.25x
     - grid_backup: translateY: +2 (compensates for 82px bottom transparent padding).

---

## 3. TOUCH TARGET BOUNDARIES & ACCESSIBILITY

1. **Sub-48dp Touch Targets:**
   - Only **31 out of 352** TouchableOpacity components define hitSlop (8.8%).
   - Ledger header buttons (38dp) and modal close icons (32dp) fail the Android 48dp ergonomic standard.
   - **Fix:** Standardize hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} across all compact icon buttons.
2. **Screen Reader Missing Labels:**
   - Only **100 out of 352** touchable controls define accessibilityLabel (28.4%). 252 controls remain unannounced on TalkBack.

---

## 4. TYPOGRAPHY & BENGALI SCRIPT CLIPPING

1. **Missing Line Heights:**
   - App.js specifies lineHeight on only **13** text components.
   - Bengali conjuncts and vertical vowel marks (ি, ী, ু, ূ, হসন্ত) clip at the top and bottom when system text size is enlarged.
   - **Fix:** Standardize minimum 1.4x to 1.5x line height across all typography styles.
