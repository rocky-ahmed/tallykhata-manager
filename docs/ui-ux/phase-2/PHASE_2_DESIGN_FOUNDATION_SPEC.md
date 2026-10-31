# TALLYKHATA — PHASE 2 DESIGN FOUNDATION SPECIFICATION
## Centralized Semantic Color Architecture, Typography Tokens & Optical Icon Geometry
**Date:** 2026-10-31  
**Target Repository:** `tallybook-expo` (`tallykhata-manager`)  
**Implementation Lead:** Worker 1 — Gibbs (Frontend Specialist)  
**Architecture Reviewer:** Worker 2 — Averroes (Backend & Data Architect)  
**QA & Accessibility Auditor:** Worker 3 — Ohm (Testing & Security Engineer)  
**Status:** PHASE 2 COMPLETE (Foundation Ready)

---

## 1. ARCHITECTURAL OVERVIEW

Phase 2 establishes a unified, accessible, and mathematically balanced design foundation for TallyKhata across all 52 application surfaces.
The core pillars implemented are:
1. **Centralized Semantic Color Architecture (`src/themeService.js`):**
   Full semantic token hierarchy covering Brand, Surface, Text, Border, Financial semantics, and Opacity across synchronized Light and Dark themes, with 100% backward compatibility for all 39 legacy tokens.
2. **Standardized Typography System (`src/typographyTokens.js`):**
   10 typography scales (display, screenHeading, sectionHeading, cardHeading, body, bodySmall, caption, button, amount, formLabel) featuring mandatory Bengali-safe line-height multipliers (1.40x-1.50x) to eliminate matra and conjunct clipping.
3. **Icon Optical Scale & Alignment Engine (`src/iconMetrics.js` & `AppIcon`):**
   Perceptual alpha-bounding-box compensation for intrinsic icon whitespace (`ic_cash_buy`: 1.28x, `ic_delete`: 1.35x, `ic_edit`: 1.25x, `grid_backup`: translateY +2) and standardized 48dp touch targets via `STANDARD_TOUCH_HIT_SLOP`.
4. **WCAG 2.2 AA Contrast Compliance:**
   Calibrated light-mode text tokens (`textMuted` darkened to `#475569`, `income` to `#047857`, `due` to `#B45309`) ensuring all normal text achieves at least 4.5:1 contrast against surface backgrounds.
5. **Zero Financial Regressions & 100% Test Stability:**
   All 16 test suites passing (340 / 340 discrete tests, 100% pass rate).
