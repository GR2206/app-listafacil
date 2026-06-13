/** Escala compacta (~50%) para la pantalla Mi lista */
export const cartListColors = {
  text: '#1A1A1A',
  textMuted: '#4A4A4A',
  textSecondary: '#6B6B6B',
  border: '#D4D4D4',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F0F0',
} as const;

/** Escala de filas de producto (imagen, botones +/-, destello). */
const ROW_SCALE = 0.867;

export const cartCompact = {
  listBackground: '#FFFFFF',
  scanBarHeight: 40,
  scanIconSize: 20,
  scanFontSize: 13,
  rowMinHeight: Math.round(44 * ROW_SCALE),
  rowPaddingV: Math.round(4 * ROW_SCALE),
  thumbSize: Math.round(28 * ROW_SCALE),
  nameFontSize: Math.round(13 * ROW_SCALE),
  qtyBtnSize: Math.round(26 * ROW_SCALE),
  qtySymbolSize: Math.round(15 * ROW_SCALE),
  qtyFontSize: Math.round(13 * ROW_SCALE),
  qtyColWidth: Math.round(82 * ROW_SCALE),
  /** Cabe "$999.999" (6 cifras) + flecha de variación sin salto de línea. */
  totalColWidth: Math.round(94 * ROW_SCALE),
  totalFontSize: Math.round(13 * ROW_SCALE),
  editBtnSize: Math.round(30 * ROW_SCALE),
  editIconSize: Math.round(15 * ROW_SCALE),
  colHeaderFontSize: 10,
  sortChipHeight: Math.round(28 * ROW_SCALE),
  sortChipFontSize: Math.round(11 * ROW_SCALE),
  sortIconSize: Math.round(13 * ROW_SCALE),
  clearIconSize: Math.round(14 * ROW_SCALE),
  clearFontSize: Math.round(11 * ROW_SCALE),
  noticeIconSize: Math.round(16 * ROW_SCALE),
  noticeFontSize: 12,
  footerLabelFontSize: 10,
  footerTotalFontSize: 14,
  adMinHeight: 28,
  emptyIconSize: 40,
  emptyTitleSize: 16,
  emptyHintSize: 13,
  listBottomPadding: 214,
  margin: 8,
  gap: 4,
};
