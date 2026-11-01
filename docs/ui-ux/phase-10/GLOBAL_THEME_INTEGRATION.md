# TALLYKHATA — PHASE 10 GLOBAL THEME & APPEARANCE INTEGRATION
## Unified Theming Architecture, Multi-Layer Inheritance & Cross-Domain Isolation

---

## 1. ARCHITECTURAL OVERVIEW

Phase 10 unifies the application-wide theming system by establishing a single source of truth for global appearance while strictly preserving the **Personal Money Manager 5-Layer Style Inheritance Model** established in Phase 9.

The global theme engine coordinates:
1. **Application Theme Mode**: Light (`light`), Dark (`dark`), or System Default (`system`).
2. **Global Brand Accent**: Primary Brand Red (`#B8141F`) with high-contrast accessibility tokens.
3. **Global Typography Scale**: $1.0\text{x}$ (Normal), $1.1\text{x}$ (Medium), $1.2\text{x}$ (Large), strictly bounded within $[0.85, 1.30]$.
4. **Visual Layout Density**: Comfortable ($1.2\text{x}$ padding), Standard ($1.0\text{x}$ padding), and Compact ($0.8\text{x}$ padding).

---

## 2. 5-LAYER CASCADING RESOLUTION WITH GLOBAL SETTINGS INTEGRATION

When a consumer screen requests styling via `resolveMMSectionStyle(sectionId, elementType, fallbackStyle)`, the 5-layer resolver integrates global settings seamlessly:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: BASE DESIGN TOKENS (LIGHT_THEME / DARK_THEME)                       │
│ Derived from effective global theme mode (Light, Dark, or System).          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: GLOBAL MM PREFERENCES (`mmCustomization.global`)                   │
│ Custom global Money Manager accent, tint, and typography overrides.        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: SECTION OVERRIDES (`mmCustomization.sections[sectionId]`)          │
│ Section-specific preset (e.g. Sapphire, Obsidian) or custom hex accent.      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: SUBSECTION MICRO-OVERRIDES (`subsections[subsectionId]`)           │
│ Fine-grained overrides for specific cards, headers, or progress bars.       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 5: ACCESSIBILITY & CONTRAST GUARD (WCAG 2.2 AA)                        │
│ Automated contrast enforcement (>= 4.5:1), clamping, & double-scale guard.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. DOUBLE-SCALING PREVENTION SPECIFICATION

To ensure typography remains crisp and avoids visual clipping, global font scaling and Money Manager section font scaling are coordinated via a multiplicative clamp:

$$\text{Effective Scale} = \text{clamp}\left(0.85, 1.30, \text{GlobalScale} \times \text{SectionScale}\right)$$

When `SectionScale` is default ($1.0$), `GlobalScale` controls text size smoothly. If both are modified, the result is capped at $1.30\text{x}$, preventing text overflow or container breakdown. Line-height is maintained at $\ge 1.4\text{x}$ to ensure Bengali conjunct characters (যুক্তাক্ষর) remain legible without vertical truncation.

---

## 4. LIGHT, DARK & OLED SYSTEM BEHAVIOR

| Surface Layer | Light Mode Token | Dark Mode Token (Elevated) | Contrast on Dark Surface |
| :--- | :--- | :--- | :--- |
| **App Screen Background** | `#F8F9FA` | `#0B111E` (Deep OLED) | Base Level |
| **Standard Card Surface** | `#FFFFFF` | `#1E293B` (Slate Navy) | $\ge 12.5:1$ text contrast |
| **Elevated Card Surface** | `#FFFFFF` | `#2D3B55` (Elevated Slate) | $\ge 9.8:1$ text contrast |
| **Primary Text** | `#0F172A` | `#F8FAFC` | $\ge 14.2:1$ (AAA compliance) |
| **Secondary Text** | `#64748B` | `#94A3B8` | $\ge 5.8:1$ (AA compliance) |
| **Card Borders** | `#E2E8F0` | `#334155` | 1.5dp crisp tactile definition |

---

## 5. PERSISTENCE & CROSS-RESTART CONSISTENCY

All global appearance preferences are serialized to `@tallykhata_app_preferences_v1`:
- **Light/Dark Toggle**: Instantly recomputes `isDark` and updates theme tokens via React state and `themeService.getThemeTokens`.
- **Money Manager Independence**: Changing global appearance NEVER erases, resets, or overwrites existing section customizations in `@tallykhata_personal_money_manager_v2`.
- **Google Drive Backup Parity**: `@tallykhata_app_preferences_v1` is included in the user's isolated backup payload under domain `preferences`.
