/**
 * src/iconMetrics.js
 * Optical scaling, alignment offsets, and touch hit slop definitions for TallyKhata icons.
 * Compensates for transparent padding in raw assets to ensure perceptual visual balance.
 */

const STANDARD_TOUCH_HIT_SLOP = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
};

const ICON_METRICS = {
  // Required task specifications
  ic_cash_buy: { opticalScale: 1.28, translateY: 0 },
  ic_delete: { opticalScale: 1.35, translateY: 0 },
  ic_edit: { opticalScale: 1.25, translateY: 0 },
  grid_backup: { opticalScale: 1.0, translateY: 2 },

  // Supplementary optical balancing for core action and navigation icons
  ic_call: { opticalScale: 1.15, translateY: 0 },
  ic_sms: { opticalScale: 1.15, translateY: 0 },
  ic_pdf: { opticalScale: 1.15, translateY: 0 },
  grid_stock: { opticalScale: 1.12, translateY: 0 },
  grid_note: { opticalScale: 1.10, translateY: 0 },
  grid_tally_msg: { opticalScale: 1.15, translateY: 0 },
  grid_bulk_tagada: { opticalScale: 1.08, translateY: 0 },
  grid_multi_biz: { opticalScale: 1.05, translateY: 0 },
  grid_money_manager: { opticalScale: 1.05, translateY: 0 },
  grid_cashbox: { opticalScale: 1.05, translateY: 0 },
};

/**
 * Normalizes an icon key and returns calibrated optical scale and translation metrics.
 * @param {string} iconKey - e.g. "ic_delete", "ic_edit.png", "./assets/icons/grid_backup.png"
 * @returns {{ opticalScale: number, translateY: number }}
 */
function getIconMetrics(iconKey) {
  if (!iconKey || typeof iconKey !== 'string') {
    return { opticalScale: 1.0, translateY: 0 };
  }
  const cleanKey = iconKey
    .replace(/\.(png|jpg|jpeg|webp)$/i, '')
    .replace(/^.*[/\\]/, '');

  return ICON_METRICS[cleanKey] || { opticalScale: 1.0, translateY: 0 };
}

module.exports = {
  ICON_METRICS,
  getIconMetrics,
  STANDARD_TOUCH_HIT_SLOP,
};
