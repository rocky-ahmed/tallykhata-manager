# REA RECONSTRUCTION — REFERENCE UI SPECIFICATIONS
**Target Application:** `TallyKhata-Demo.apk` (`REF-001`)  
**Maintained by:** Main Engineering Orchestrator  
**Status:** SPECIFIED & VERIFIED  

---

## 1. Brand Palette & Surface Color Architecture

| Semantic Role | Light Mode Value | Dark Mode Value | WCAG 2.1 AA Contrast Ratio |
| :--- | :--- | :--- | :---: |
| **Primary Brand** | `#B81414` (Ruby Crimson) | `#EF4444` (Light Red) | $\ge 4.5:1$ against surface |
| **Header Background** | `#B81414` | `#111827` (Deep Obsidian) | $\ge 4.5:1$ with white text |
| **Receivable (মোট পাবো)** | `#1C7D50` (Emerald Green) | `#34D399` (Mint Green) | $5.12:1$ (Light), $8.42:1$ (Dark) |
| **Payable (মোট দেবো)** | `#B81414` (Ruby Crimson) | `#F87171` (Salmon Red) | $6.81:1$ (Light), $5.38:1$ (Dark) |
| **Card Surface** | `#FFFFFF` (Pure White) | `#1E293B` (Slate Navy) | Base background container |
| **Background Surface** | `#F8F9FA` (Soft Gray) | `#0F172A` (Midnight Navy) | Base app canvas |
| **Primary Text** | `#1F2937` (Charcoal) | `#F9FAFB` (Off-White) | $> 10:1$ on respective cards |
| **Secondary Text** | `#6B7280` (Muted Gray) | `#9CA3AF` (Muted Slate) | $\ge 4.5:1$ on respective cards |

---

## 2. Bengali Typography & Diacritic Safety Standards

Bengali script requires extended vertical clearance due to upper vowel marks (হ্রস্ব-ই কার ি, দীর্ঘ-ঈ কার ী, রেফ র্) and lower vowel signs (হ্রস্ব-উ কার ু, দীর্ঘ-ঊ কার ূ, ঋ-কার ৃ, হসন্ত্). Standard Latin line heights cause severe diacritic clipping.

### Formula & Constraints:
$$\text{LineHeight} \ge \max(\text{size} \times 1.40, \text{size} + 6.0\text{dp})$$

### Typography Token Scales:
- **Caption (14.0sp):** Line Height $= 20.0\text{dp}$ ($1.43\times$)
- **Body Small (16.5sp):** Line Height $= 23.5\text{dp}$ ($1.42\times$)
- **Body Regular (19.0sp):** Line Height $= 27.0\text{dp}$ ($1.42\times$)
- **Title (24.0sp):** Line Height $= 34.0\text{dp}$ ($1.42\times$)
- **Heading (30.0sp):** Line Height $= 42.0\text{dp}$ ($1.40\times$)
- **Hero / Display (38.0sp - 62.0sp):** Guaranteed $\ge 1.40\times$ clearance.

---

## 3. Touch Targets & Optical Icon Scaling
- **Minimum Android Touch Dimensions:** $\ge 48\times 48\text{dp}$ for all interactive elements.
- **Touch Hit Slop (`STANDARD_TOUCH_HIT_SLOP`):**
  - `top: 10dp`, `bottom: 10dp`, `left: 10dp`, `right: 10dp`
  - Expands effective interactive area on compact mobile displays (e.g. 5.5" to 6.5" Android screens).
- **Calibrated Optical Scaling (`iconMetrics.getIconMetrics`):**
  - Grid Navigation Icons (`grid_cashbox`, `grid_tagada`): $1.05\times$ optical correction.
  - Cash Action Icons (`ic_cash_buy`, `ic_cash_sell`): $1.28\times$ optical correction.
  - High-density vector icon rendering without raster blur.
