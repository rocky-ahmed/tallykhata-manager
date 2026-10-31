# TALLYKHATA — PHASE 1 DESIGN RESEARCH REFERENCES
## Authoritative Design Systems, Platform Guidelines & TallyKhata Applicability Synthesis

---

### 1. Material Design 3 Color Roles
- **Source URL:** https://m3.material.io/styles/color/the-color-system
- **Core Principle:** Role-based semantic tokens (primary, onPrimary, primaryContainer, surface, onSurface, outline) decouple UI components from rigid hex values.
- **TallyKhata Application:** Replace 1,510 hardcoded hex literals with centralized semantic tokens, ensuring flawless automatic Dark Mode adaptation.

### 2. Material Design 3 Typography
- **Source URL:** https://m3.material.io/styles/typography/applying-type
- **Core Principle:** Strict hierarchical type scale (Display, Headline, Title, Body, Label) with proportional line heights.
- **TallyKhata Application:** Establish standard 1.4x-1.5x line heights to accommodate Bengali matras and conjuncts without vertical clipping.

### 3. Material Design 3 Motion
- **Source URL:** https://m3.material.io/styles/motion/overview/how-it-works
- **Core Principle:** Subtle, natural physics-based feedback (200-300ms deceleration easing, tactile press states).
- **TallyKhata Application:** Standardize 3D squircle tactile press feedback (activeOpacity={0.7}, scale to 0.98x) across quick action cards and ledger buttons.

### 4. Android Mobile Layout & Navigation Patterns
- **Source URL:** https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- **Core Principle:** Persistent bottom navigation for 3-5 top destinations, top app bar for contextual actions, and bottom sheets for modal workflows.
- **TallyKhata Application:** Reinforce the 5-tab bottom navigation bar and convert centered dialogs to gesture-friendly bottom sheets with safe-area insets.

### 5. Android Adaptive App Quality
- **Source URL:** https://developer.android.com/docs/quality-guidelines/adaptive-app-quality
- **Core Principle:** Resilient layout scaling across compact, medium, and expanded window size classes.
- **TallyKhata Application:** Protect against gesture navigation bar overlap on Redmi Note 9 (Android 11) and adapt modal widths on wide screens.

### 6. W3C WCAG 2.2
- **Source URL:** https://www.w3.org/TR/WCAG22/
- **Core Principle:** Success Criterion 1.4.3 (Contrast Minimum >= 4.5:1) and SC 2.5.8 (Target Size Minimum >= 24px, recommended >= 48px).
- **TallyKhata Application:** Darken light-mode secondary text (#475569) and status indicators; ensure all touch targets satisfy 48 x 48 dp via hitSlop.

### 7. React Native useWindowDimensions
- **Source URL:** https://reactnative.dev/docs/usewindowdimensions
- **Core Principle:** Dynamic viewport hook that updates automatically on orientation change, multi-window split, or fold/unfold.
- **TallyKhata Application:** Migrate static Dimensions.get('window') in App.js to dynamic useWindowDimensions().

### 8. React Native Accessibility
- **Source URL:** https://reactnative.dev/docs/accessibility
- **Core Principle:** First-class accessibility props (accessibilityLabel, accessibilityRole, accessibilityState, accessibilityHint).
- **TallyKhata Application:** Add bilingual accessibilityLabel props across the 252 currently unannounced buttons.

### 9. React Native Performance
- **Source URL:** https://reactnative.dev/docs/performance
- **Core Principle:** Component memoization (useMemo, React.memo) and virtualized list optimization (windowSize={5}, initialNumToRender={10}).
- **TallyKhata Application:** Memoize themed styles and derived section customization styles to maintain 60 FPS on budget devices.

### 10. Codex Subagent Guidance
- **Source URL:** https://learn.chatgpt.com/docs/agent-configuration/subagents
- **Core Principle:** Reusable, specialized worker roles (Frontend, Backend, QA) coordinated under a single Main Agent orchestrator.
- **TallyKhata Application:** Implemented and verified across Gibbs, Averroes, and Ohm without creating unnecessary duplicate threads.
