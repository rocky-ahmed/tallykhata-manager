# TALLYKHATA — UNIFIED 3D DESIGN SYSTEM SPECIFICATION
## Centralized Design Tokens, Dimensional Geometry, Color Architecture & Typography

---

## 1. DESIGN PHILOSOPHY & 3D VISUAL PRINCIPLES

1. **Dimensional Tactility (Tactile Realism):**
   - UI elements are tactile surfaces rather than flat digital rectangles.
   - Every primary interactive component (cards, action buttons, avatars, pills) features a subtle top specular highlight, crisp side borders, and a grounding bottom extrusion edge.
2. **Harmonious Controlled Contrast:**
   - Cohesive semantic color families (Crimson Red for Primary/Due, Emerald Green for Income/Cash IN, Sapphire Blue for Info/Transfers, Amber Gold for Warnings/Budgets, Amethyst Purple for Digital Pay).
   - High accessibility contrast ratio (>= 4.5:1 for body copy, >= 3:1 for large display metrics).
3. **Ergonomic Touch Boundaries:**
   - Minimum bounding touch target of 44×44 dp (ideal >= 48×48 dp) across all interactive icons, buttons, and list items.

---

## 2. CENTRALIZED COLOR PALETTE & SEMANTIC TOKENS

### Brand & Core Accents
| Token | Light Mode | Dark Mode | Semantic Meaning |
|---|---|---|---|
| `primary` | `#B81414` (Classic Tally Crimson) | `#EF4444` (Vibrant Coral Red) | Core brand, Customer Due (পাবো), Primary CTA |
| `primaryLight` | `#FEF2F2` (Soft Blush) | `#2A1215` (Deep Rosewood) | Background container for primary actions |
| `success` | `#10B981` (Emerald Green) | `#34D399` (Mint Green) | Cash IN, Income, Supplier Paid, Savings |
| `successLight` | `#F0FDF4` (Pale Mint) | `#0B291B` (Deep Forest) | Income card backgrounds, positive badges |
| `warning` | `#F59E0B` (Amber Gold) | `#FBBF24` (Sunburst Amber) | Due warnings, Budget 80-100%, pending alerts |
| `warningLight` | `#FFFBEB` (Warm Cream) | `#2C1E0A` (Dark Umber) | Warning banners and tagada alerts |
| `info` | `#2563EB` (Royal Sapphire) | `#60A5FA` (Sky Sapphire) | Bank accounts, Fund transfers, System notes |
| `infoLight` | `#EFF6FF` (Pale Azure) | `#0E2344` (Deep Midnight Blue) | Transfer backgrounds, bank cards |
| `purple` | `#8B5CF6` (Royal Amethyst) | `#A78BFA` (Lavender Amethyst) | Tali Pay, Digital wallets, MFS services |
| `purpleLight` | `#FAF5FF` (Pale Lavender) | `#23153C` (Deep Violet) | Digital wallet cards, QR backgrounds |
| `neutral` | `#4B5563` (Slate Steel) | `#94A3B8` (Cool Grey) | Secondary buttons, edit icons, inactive tabs |
| `neutralLight` | `#F1F5F9` (Soft Alabaster) | `#1E293B` (Charcoal Surface) | Secondary action chips, inactive pills |

### Surface & Canvas Architecture
| Token | Light Mode | Dark Mode | Description |
|---|---|---|---|
| `screenBg` | `#F4F6F8` | `#0B0F19` | Overall screen backdrop |
| `headerBg` | `#B81414` | `#131927` | Top navigation app bar |
| `cardBg` | `#FFFFFF` | `#161E2E` | Primary elevated card surface |
| `cardBgElevated` | `#FFFFFF` | `#222D42` | Floating dialogs, modals, popovers |
| `cardBorder` | `#E2E8F0` | `#2A3447` | Subtle structural 1px border |
| `divider` | `#E2E8F0` | `#1E293B` | Hairline list row separator |
| `modalOverlay` | `rgba(0, 0, 0, 0.55)` | `rgba(0, 0, 0, 0.75)` | Backing scrim for modals and sheets |

---

## 3. 3D GEOMETRIC SPECIFICATION (SQUIRCLE & BEVEL FORMULA)

```
+--------------------------------------------------------------+
| [Specular 3D Highlight]: borderTopColor (White / Alpha 0.45) |
| [Top Inner Bevel]: height = containerSize * 0.36             |
|                                                              |
|                     [CENTER ICON / GLYPH]                    |
|             size = Math.round(containerSize * 0.58)          |
|                                                              |
| [Extrusion Ledge]: borderBottomWidth: 3, borderBottomColor   |
+--------------------------------------------------------------+
```

1. **Squircle Corner Radius:**
   - Standard: `radius = Math.round(containerSize * 0.28)`.
   - Circular: `radius = containerSize / 2`.
2. **Inner Icon Ratio Standard:**
   - Small Actions: `containerSize = 36-38`, `size = 20-22` (ratio ~ 0.58).
   - Medium Grid Cards: `containerSize = 48-52`, `size = 28-30` (ratio ~ 0.58).
   - Hero Cards / Avatars: `containerSize = 56-64`, `size = 32-36` (ratio ~ 0.57).
3. **Dimensional Shadow Tokens:**
   - Elevation: 3 (Light), 4 (Dark).
   - Shadow Offset: `{ width: 0, height: 2 }` (Light), `{ width: 0, height: 3 }` (Dark).
   - Shadow Opacity: `0.10 - 0.14` (Light), `0.35 - 0.45` (Dark).

---

## 4. TYPOGRAPHY SCALE (BENGALI & NUMERICAL INTEGRATION)

| Style Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `fontDisplay` | 28sp | 36sp | Bold (700) | Hero Net Worth, Grand Cash Balances |
| `fontTitle1` | 22sp | 28sp | Bold (700) | Screen titles, Modal header titles |
| `fontTitle2` | 18sp | 24sp | Semi-Bold (600) | Section headers, Card title banners |
| `fontHeadline` | 16sp | 22sp | Semi-Bold (600) | Customer names, Wallet names |
| `fontBody` | 14sp | 20sp | Regular (400) | Transaction descriptions, note text |
| `fontCaption` | 12sp | 16sp | Regular (400) | Timestamps, dates, subtitle labels |
| `fontBadge` | 11sp | 14sp | Bold (700) | Status pills, transaction type badges |

---

## 5. ANDROID VIEWPORT & SAFE AREA MARGINS
- **Redmi Note 9 / 1080×2340 / Android 3-Button & Gesture Navigation:**
  - Content bottom scroll padding: `paddingBottom: 88-100 dp`.
  - Horizontal gutter margin: `paddingHorizontal: 16 dp`.
  - Floating Action Button (FAB) bottom offset: `bottom: 76 dp` (clear of tab bar).
