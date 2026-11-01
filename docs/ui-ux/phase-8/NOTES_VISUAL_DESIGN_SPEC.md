# TALLYKHATA — PHASE 8 NOTES VISUAL DESIGN SPECIFICATION
## Modern Productivity Notes, 3D Geometry, Status Filters & Typography

---

## 1. DESIGN PHILOSOPHY & USER EXPERIENCE

The Business Notes module is designed as an integrated productivity surface:
- **Clean Information Hierarchy**: Notes are presented with legible typography, status indicators, and creation timestamps.
- **Fast Capture**: A prominent top input strip allows instant note capture without opening cumbersome secondary screens.
- **Tactile Completion**: Notes feature an interactive 3D squircle checkbox providing clear feedback when an item is completed (`সম্পন্ন`) vs pending (`বাকি`).
- **Scannable Density**: Compact card height ensures business owners can scan 5–8 tasks without excessive scrolling.

---

## 2. COLOR PALETTE & TOKEN SPECIFICATION

| Token Role | Light Mode Hex | Dark Mode Hex | Usage in Notes Module |
| :--- | :--- | :--- | :--- |
| `noteCardBg` | `#FFFFFF` | `#1E293B` | Note item row surface |
| `noteCardBorder` | `#E2E8F0` | `#334155` | Note item border |
| `noteInputBg` | `#F8FAFC` | `#0F172A` | Fast note entry input background |
| `noteTextActive` | `#1E293B` | `#F8FAFC` | Active note body text |
| `noteTextDone` | `#94A3B8` | `#64748B` | Completed note body text (strikethrough) |
| `noteBadgePendingBg`| `#F1F5F9` | `#334155` | Pending note status badge |
| `noteBadgeDoneBg` | `#ECFDF5` | `#064E3B` | Completed note status badge |
| `noteBadgeDoneText`| `#059669` | `#34D399` | Completed note checkmark text |
| `noteDeleteIcon` | `#EF4444` | `#F87171` | Delete note action trigger |

---

## 3. CARD GEOMETRY & ELEVATION RULES

- **Note Item Container (`noteItemRow`)**:
  - `borderRadius`: $12\text{dp}$
  - `borderWidth`: $1\text{dp}$ (`#E2E8F0` / `#334155`)
  - `borderBottomWidth`: $2\text{dp}$
  - `padding`: $12\text{dp}$
  - `flexDirection`: `row`, `alignItems: 'center'`
- **Status Checkbox (`noteStatusToggle`)**:
  - `width`: $24\text{dp}$, `height`: $24\text{dp}$
  - `borderRadius`: $6\text{dp}$ (3D squircle)
  - `borderWidth`: $1.5\text{dp}$
  - `hitSlop`: `top: 10, bottom: 10, left: 10, right: 10` ($\ge 48\times 48\text{dp}$)

---

## 4. TYPOGRAPHY SCALING & BENGALI NUMERALS

- **Note Title / Text**: $15\text{sp}$, Regular ($400$) / Medium ($500$), line-height $22\text{sp}$
- **Date Stamp**: $12\text{sp}$, Regular ($400$), line-height $16\text{sp}$
- **Filter Chip Text**: $13\text{sp}$, Medium ($500$), line-height $18\text{sp}$
