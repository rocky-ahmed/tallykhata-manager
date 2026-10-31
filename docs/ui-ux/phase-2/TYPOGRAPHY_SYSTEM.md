# TALLYKHATA — UNIFIED TYPOGRAPHY TOKEN SYSTEM
## Hierarchical Typography Scales & Bengali Script Vertical Clearance Rules (`src/typographyTokens.js`)

---

## 1. TYPOGRAPHY SCALES INVENTORY

| Scale Name | Font Size | Line Height | Ratio | Font Weight | Letter Spacing | Semantic Usage |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `display` | 32sp | 46dp | **1.44x** | `700` (Bold) | -0.5 | Net Worth totals, Hero financial stats |
| `screenHeading` | 22sp | 32dp | **1.45x** | `700` (Bold) | -0.3 | Fullscreen titles, primary screen headers |
| `sectionHeading`| 18sp | 26dp | **1.44x** | `600` (SemiBold) | -0.2 | Section headers, modal group labels |
| `cardHeading` | 16sp | 24dp | **1.50x** | `600` (SemiBold) | 0.0 | Customer names, Wallet cards, Account rows |
| `body` | 14sp | 21dp | **1.50x** | `400` (Regular) | 0.0 | Standard paragraphs, transaction notes |
| `bodySmall` | 12sp | 18dp | **1.50x** | `400` (Regular) | 0.1 | Secondary timestamps, subtitled labels |
| `caption` | 11sp | 16dp | **1.45x** | `500` (Medium) | 0.2 | Badges, micro-status tags, filter pills |
| `button` | 14sp | 20dp | **1.43x** | `600` (SemiBold) | 0.1 | Primary and secondary CTA button labels |
| `amount` | 20sp | 28dp | **1.40x** | `700` (Bold) | -0.2 | Transaction list amounts, ledger numbers |
| `formLabel` | 13sp | 19dp | **1.46x** | `600` (SemiBold) | 0.0 | Form input headers, dropdown labels |

---

## 2. BENGALI SCRIPT VERTICAL CLEARANCE RULES

- **Default Multiplier:** `BENGALI_LINE_HEIGHT_MULTIPLIER = 1.45`
- **Rationale:** Standard English fonts often clip complex Bengali conjuncts (যেমন: ক্ত, ক্ষ, ঙ্গ, ঙ্ঘ, ঞ্চ, ষ্ণ) and vertical vowel diacritics (হ্রস্ব-ই কার, দীর্ঘ-উ কার, হসন্ত, রেফ). Enforcing $1.40x-1.50x$ line-height guarantees zero vertical clipping on Android hardware with enlarged font settings.
