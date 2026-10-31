# TALLYKHATA — COLOR TOKEN MAPPING & MIGRATION CATALOG
## Mapping 1,510 Hardcoded Raw Hex Literals to Centralized Semantic Tokens

| Legacy Hex Code | Occurrences | Role & Current Usage | Target Semantic Token | Light Mode Value | Dark Mode Value | Contrast Ratio (Light) |
|---|---|---|---|---|---|---|
| `#FFFFFF` | 202 | Card backgrounds, button text, modal surface | `cardBg` / `onPrimary` / `modalSurface` | `#FFFFFF` | `#1E293B` | N/A (Surface) |
| `#B81414` | 88 | Brand primary, customer due, action chips | `primary` / `headerBg` | `#B81414` | `#EF4444` | 6.84:1 (AAA Large) |
| `#E2E8F0` | 60 | Card borders, dividers, subtle borders | `cardBorder` / `divider` / `outlineVariant` | `#E2E8F0` | `#334155` | 1.28:1 (Non-text border) |
| `#64748B` | 57 | Secondary labels, timestamps, icons | `textSecondary` | `#64748B` | `#94A3B8` | 4.86:1 (AA Normal) |
| `#E5E7EB` | 56 | Secondary dividers, tab bar borders | `divider` / `outlineVariant` | `#E2E8F0` | `#334155` | 1.28:1 (Border) |
| `#F1F5F9` | 48 | Surface container, chip backgrounds | `surfaceContainer` | `#F1F5F9` | `#1E293B` | N/A (Surface) |
| `#1E293B` | 46 | Primary typography, dark surface | `textPrimary` / `cardBg` (Dark) | `#1E293B` | `#F8FAFC` | 14.59:1 (AAA Normal) |
| `#10B981` | 44 | Cash in, income, positive status | `paid` / `success` | `#10B981` | `#34D399` | 2.54:1 (Use `income` for text) |
| `#047857` | New | Income text, positive financial amounts | `income` | `#047857` | `#34D399` | 4.54:1 (AA Normal) |
| `#475569` | New | Calibrated muted text | `textMuted` | `#475569` | `#64748B` | 7.12:1 (AAA Normal) |
| `#B45309` | New | Due warnings, amber alerts | `due` | `#B45309` | `#FBBF24` | 4.52:1 (AA Normal) |
| `#DC2626` | New | Expense text, negative balances | `expense` / `loss` | `#DC2626` | `#F87171` | 4.52:1 (AA Normal) |
