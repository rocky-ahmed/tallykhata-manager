# TALLYKHATA — PHASE 6 CONTACTS VISUAL DESIGN SPECIFICATION
## Design Foundation, Visual Components, Elevation Tokens & Typography

---

## 1. DESIGN FOUNDATION & SEMANTIC ROLES
The Contacts interface follows the unified TallyKhata 3D Tactile Design Foundation established in Phase 2:
- **Card Surfaces**: `Card3D` with $16\text{dp}$ border radius, subtle $3\text{dp}$ bottom shadow (`#00000020`), and light reflective top border (`rgba(255,255,255,0.6)` for light mode, `rgba(255,255,255,0.08)` for dark mode).
- **Interactive Buttons**: `Button3D` with $3\text{dp}$ press depth, $48\text{dp}$ minimum target height, and tactile click states.
- **Semantic Badges**:
  - Customer / Due (বাকি): `#B81414` Crimson (Light), `#FCA5A5` Rose on `#450A0A` (Dark).
  - Supplier / Advance (অগ্রিম / দেনা): `#059669` Emerald (Light), `#6EE7B7` Mint on `#064E3B` (Dark).
  - Settled (পরিশোধ): `#64748B` Slate on `#F1F5F9` (Light), `#94A3B8` on `#1E293B` (Dark).

---

## 2. AVATAR & INITIALS SYSTEM
- **Geometry**: $44 \times 44\text{ dp}$ squircle / circular container with $2\text{dp}$ border.
- **Dynamic Color Generation**:
  - Derived from contact name hash using an 8-color accessible palette:
    - Crimson Red (`#B81414`), Forest Green (`#0F8A0F`), Royal Blue (`#2563EB`), Amber Gold (`#D97706`), Purple (`#7C3AED`), Teal (`#0D9488`), Indigo (`#4F46E5`), Rose (`#E11D48`).
- **Typography**: Bengali initial character (e.g. "রহিম" $\rightarrow$ "র") rendered in bold $18\text{sp}$ glyph.

---

## 3. CONTACT CARD ANATOMY & SPACING
```
+-----------------------------------------------------------------------+
|  [AVATAR]  Contact Name (16sp SemiBold)               ৳ ১২,৫০০.০০   |
|   (44dp)   Phone Number (12sp Regular)               [বাকি / অগ্রিম]  |
|            Address / Note (11sp Muted)                        [ > ]   |
+-----------------------------------------------------------------------+
```
- **Horizontal Padding**: $16\text{dp}$
- **Vertical Padding**: $12\text{dp}$
- **Margin Bottom**: $8\text{dp}$ between cards
- **Touch Feedback**: `activeOpacity={0.7}` with ripple/press depth

---

## 4. FORM & MODAL SPECIFICATION (SCR-05 & SCR-06)
- **Modal Container**: Semi-transparent dark overlay (`rgba(0,0,0,0.55)`), curved top-bottom card ($20\text{dp}$ radius).
- **Input Fields**:
  - Height: $48\text{dp}$
  - Border: $1.5\text{dp}$ solid border (`#E5E7EB` in light, `#374151` in dark)
  - Focused State: `#B81414` primary border highlight
  - Bengali Line Height: $1.45\times$ multiplier preventing vowel clipping.
- **Action Buttons**:
  - Cancel: `Button3D` variant `secondary` (Width: 35%)
  - Save / Create: `Button3D` variant `primary` (Width: 65%)
