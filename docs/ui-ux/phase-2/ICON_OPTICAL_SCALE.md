# TALLYKHATA — ICON OPTICAL SCALE & ALIGNMENT SPECIFICATION
## Compensating for Intrinsic Whitespace via Perceptual Alpha Calibration (`src/iconMetrics.js`)

---

## 1. CALIBRATED OPTICAL MULTIPLIERS

| Asset Identifier | Canvas | Content Bounding Box | Intrinsic Whitespace | Optical Scale | Vertical Offset | Rendered Effect |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `ic_cash_sale` | $240 \times 240$ | $237 \times 233$ | **4.1%** | **1.00x** | 0 px | Baseline full-bleed visual area |
| `ic_cash_cost` | $240 \times 240$ | $240 \times 230$ | **4.2%** | **1.00x** | 0 px | Baseline full-bleed visual area |
| `ic_cash_buy` | $240 \times 240$ | $172 \times 168$ | **49.8%** | **1.28x** | 0 px | Compensates -38.4% visual deficit |
| `ic_edit` | $240 \times 240$ | $172 \times 170$ | **49.2%** | **1.25x** | 0 px | Balances optical weight in ledger |
| `ic_delete` | $240 \times 240$ | $151 \times 169$ | **55.7%** | **1.35x** | 0 px | Compensates -50% visual deficit |
| `grid_backup` | $288 \times 288$ | $288 \times 206$ | **28.5%** | **1.00x** | **+2 px** | Centers visual mass (82px bottom padding)|

---

## 2. TOUCH BOUNDARY INFRASTRUCTURE

- `STANDARD_TOUCH_HIT_SLOP`: `{ top: 10, bottom: 10, left: 10, right: 10 }`
- Automatically expands compact icon buttons (e.g., $38 \times 38\text{ dp}$) to exceed the $48 \times 48\text{ dp}$ Android accessibility minimum without requiring intrusive layout expansions.
