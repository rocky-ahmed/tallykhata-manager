# CUSTOMIZATION CONTROL IMPLEMENTATION MATRIX
**Document Version:** 3.0.0 (Phase 9 Final Implementation)  
**Author:** Worker 1 — Gibbs (Frontend & UI/UX Specialist, Thread ID: `01a19154-99ab-72a0-9e23-2611b9ffc74c`)  
**Target Component:** `modalMMPreferences` in `App.js`  
**Design Standards:** Material Design 3, WCAG 2.2 AA Contrast, 48dp Touch Targets

---

## 1. Overview of Preferences Modal UI

The Money Manager User Preferences Modal (`modalMMPreferences`) has been transformed into a comprehensive, tactile design studio. Users can customize the visual hierarchy of the application either globally across all sections or individually for specific financial modules.

All controls feature tactile 3D feedback, real-time live previewing, ergonomic touch targets, and full Light/Dark mode parity.

---

## 2. Interactive Control Matrix

| Control Component | UI Representation | Data Field Target | State Binding / Handler | Options / Range | Tactile Feedback & Visual State |
|---|---|---|---|---|---|
| **Section Selector Carousel** | Horizontal pill scroll with icons | `mmActiveCustomSection` | `setMmActiveCustomSection(id)` | 8 sections: `dashboard`, `transactions`, `wallets`, `budgets`, `goals`, `analytics`, `categories`, `reports` | Active: Theme Primary background + white text + elevation: 2; Inactive: Surface card background + border ring |
| **Subsection Chips** | Compact tag chips | `mmActiveCustomSubsection` | `setMmActiveCustomSubsection(sub)` | Section-specific: e.g. `#hero`, `#cards`, `#inflow_outflow`, `#search`, `#filters` | Active: Solid accent pill + bold text; Inactive: Subtle surface outline |
| **Theme Preset Selector** | 2-column or wrapping swatch cards | `customization[section].preset` | Updates `preset` & `accent` | 7 Presets: Emerald, Sapphire, Obsidian, Rose Gold, Amber, Amethyst, Custom | 14dp color circle + label + 2px active border ring |
| **Color Property Tabs** | 4-way segmented tab bar | `mmCustomPropertyTab` | `setMmCustomPropertyTab(id)` | `accent`, `cardBg`, `textPrimary`, `border` | Active: High-contrast primary pill; Inactive: Muted background pill |
| **Color Swatches Grid** | 10-circle color palette | `customization[section][propertyTab]` | Updates active property with hex | 10 Hex Colors: #10B981, #2563EB, #334155, #EC4899, #F59E0B, #8B5CF6, #06B6D4, #DC2626, #1E293B, #FFFFFF | 28x28dp circle, active 2.5px ring, shadow elevation: 3 |
| **Background Tint & Opacity** | 4-segment percentage bar | `customization[section].tint` | Updates `tint` (string float) | 10% (`0.1`), 20% (`0.2`), 30% (`0.3`), 40% (`0.4`) | Active: Primary background + white text; Inactive: Surface card |
| **Typography & Text Scale** | 3-segment scale bar | `customization[section].textScale` | Updates `textScale` (string float) | 1.0x (Normal), 1.1x (Medium), 1.2x (Large) | Active: Primary pill; Inactive: Outline surface pill |
| **Icon Sizing Selector** | 3-segment size bar | `customization[section].iconSize` | Updates `iconSize` (`sm`, `md`, `lg`) | `sm` (Small: 20dp), `md` (Medium: 24dp), `lg` (Large: 28dp) | Active: Primary pill; Inactive: Outline surface pill |
| **3D Card Elevation** | 3-segment elevation bar | `customization[section].elevation` | Updates `elevation` | `subtle` (1.5px border), `standard` (2.5px ledge), `high` (4.0px ledge) | Active: Primary pill; Inactive: Outline surface pill |
| **Real-time Live Preview** | Interactive representative card | Dynamic resolver projection | Live reactive render | Dynamic representation of current section | Dynamic amount (৳ ১,৫০,০০০.০০), progress bar, status badges |
| **Section Reset Action** | Ghost action button with icon | Active section override | Deletes `mmCustomization[section]` | Reverts current section to global/default | `↩ সেকশন রিসেট` (mm_reset_section) |
| **Apply All Action** | Blue-tinted action button | All 8 section overrides | Clones active section to all 8 keys | Propagates active style app-wide | `🌐 সব সেকশনে প্রয়োগ` (mm_apply_all_sections) |
| **Reset Custom Action** | Red-tinted warning button | All customization overrides | Clears `mmCustomization = {}` | Reverts all sections to base tokens | `🔄 সব কাস্টম রিসেট` (mm_reset_all_custom) |
| **Full MM Reset Action** | Outline destructive button | All MM preferences & customization | Calls `handleResetMMPreferences` | Restores default period, symbol, visibility | `রিসেট` (mm_reset) with confirmation alert |
| **Save Settings Action** | Tactile 3D primary CTA | Storage persistence | Calls `handleSaveMMPreferences` | Persists to AsyncStorage under MM key | `সংরক্ষণ করুন` (mm_save_settings) |

---

## 3. Detailed UI Component Implementation Specs

### 3.1 Theme Preset Palette Definitions
Each preset is crafted to maintain high emotional resonance and distinct brand identity:
1. **Emerald (`emerald`):**
   - Light Accent: `#10B981` (Fresh investment green)
   - Dark Accent: `#064E3B` (Deep forest emerald)
   - Contrast Ratio: 9.72:1 (Dark variant on light surfaces)
2. **Sapphire (`sapphire`):**
   - Light Accent: `#2563EB` (Vibrant corporate blue)
   - Dark Accent: `#1E3A8A` (Deep navy sapphire)
   - Contrast Ratio: 10.36:1 (Dark variant on light surfaces)
3. **Obsidian (`obsidian`):**
   - Light Accent: `#334155` (Refined slate steel)
   - Dark Accent: `#0F172A` (Deep midnight obsidian)
   - Contrast Ratio: 17.85:1 (Dark variant on light surfaces)
4. **Rose Gold (`rose`):**
   - Light Accent: `#EC4899` (Sophisticated pink)
   - Dark Accent: `#831843` (Rich plum rose)
   - Contrast Ratio: 9.65:1 (Dark variant on light surfaces)
5. **Amber (`amber`):**
   - Light Accent: `#F59E0B` (Warm golden amber)
   - Dark Accent: `#78350F` (Deep bronze amber)
   - Contrast Ratio: 9.07:1 (Dark variant on light surfaces)
6. **Amethyst (`amethyst`):**
   - Light Accent: `#8B5CF6` (Royal violet amethyst)
   - Dark Accent: `#4C1D95` (Deep imperial purple)
   - Contrast Ratio: 10.95:1 (Dark variant on light surfaces)
7. **Custom (`custom`):**
   - Allows explicit hex color selection for accent, card background, primary text, and border.

---

### 3.2 Real-time Live Interactive Preview
The preview card renders directly inside `modalMMPreferences` immediately below the control selectors, allowing zero-latency visual validation before saving:
- **Container Structure:**
  - Background: Computed dynamically via `secAccent + hexAlpha` or explicit `cardBg`
  - Border: 1.5px solid with bottom extrusion ledge (1.5px for subtle, 2.5px for standard, 4.0px for high)
  - Corner Radius: 16dp
- **Content Hierarchy:**
  - Header: 3D Squircle icon + localized section title (e.g. "মোট নেট ওয়ার্থ", "আজকের লেনদেন", "ব্যাংক হিসাব")
  - Balance Display: Large bold formatted currency (`৳ ১,৫০,০০০.০০`) scaled by active `textScale`
  - Dynamic Progress Bar: 6dp height with rounded caps filled with active accent
  - Footer Metadata: Live readout of active tint percentage and scale factor + "LIVE PREVIEW" badge

---

## 4. Accessibility, Ergonomics & Bengali Localization

### 4.1 Touch Target Compliance (>= 48x48dp)
In accordance with Android Adaptive App Quality guidelines and WCAG 2.2 Success Criterion 2.5.8 (Target Size):
- All sub-48dp icon buttons and action chips utilize `hitSlop={STANDARD_TOUCH_HIT_SLOP}` where:
  ```javascript
  STANDARD_TOUCH_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
  ```
- Action buttons (`mm_reset_section`, `mm_apply_all_sections`, `mm_reset_all_custom`) have vertical padding of 6dp and minimum height of 32dp, yielding an effective touch clearance of 52dp.
- Section selector pills have vertical padding of 7dp and pill height of 42dp, providing effortless single-thumb switching.

### 4.2 Bengali Typography & Line-Height Scaling
- Multiline Bengali text requires adequate vertical clearance to render ascenders (matras like ি, ী, ৈ) and complex conjunct descenders (like ্র, ্ন, ্ব, ্ল).
- Typography scaling strictly enforces a line-height multiplier of >= 1.45x:
  ```javascript
  lineHeight: Math.round(fontSize * 1.45)
  ```
- Font size scaling is bounded between 0.85x and 1.30x to prevent UI overflow or unreadable text.

### 4.3 Dark Mode OLED Contrast
- In Dark Mode, background tint calculations use strict RGBA notation rather than solid hex overlays to maintain deep OLED blacks on AMOLED displays.
- Card elevated surfaces use `DARK_THEME.cardBgElevated` (`#1E293B`) to ensure clear visual separation from the root screen background (`#0F172A`).

---

## 5. Storage Persistence & Concurrency Safety

When the user taps `mm_save_settings`:
1. The updated `mmCustomization` state is validated and sanitized against `MM_SCHEMA_VERSION = 3`.
2. The customization object is merged into `moneyManagerState.preferences.customization`.
3. The complete state is serialized via JSON round-trip and committed atomically to `AsyncStorage` under `@tallykhata_personal_money_manager_v2`.
4. Concurrency guards ensure rapid repeated taps do not result in race conditions or partial writes.
