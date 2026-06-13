import { cartCompact as base } from '@/theme/cartCompact';

export const CART_SCALE_MIN = 0.8;
export const CART_SCALE_MAX = 1.5;
export const CART_SCALE_STEP = 0.05;
export const CART_SCALE_DEFAULT = 1;
export const CART_SCALE_STORAGE_KEY = 'cart_list_ui_scale_v1';

export function clampCartScale(scale: number): number {
  const clamped = Math.min(CART_SCALE_MAX, Math.max(CART_SCALE_MIN, scale));
  return Math.round(clamped * 100) / 100;
}

function scaleValue(value: number, factor: number, max?: number): number {
  const scaled = Math.round(value * factor);
  return max != null ? Math.min(scaled, max) : scaled;
}

export type ScaledCartMetrics = typeof base;

/** Métricas escaladas con topes para evitar desbordes en pantallas chicas. */
export function createScaledCartMetrics(scale: number): ScaledCartMetrics {
  const factor = clampCartScale(scale);

  return {
    ...base,
    scanBarHeight: scaleValue(base.scanBarHeight, factor, 52),
    scanIconSize: scaleValue(base.scanIconSize, factor, 28),
    scanFontSize: scaleValue(base.scanFontSize, factor, 18),
    rowMinHeight: scaleValue(base.rowMinHeight, factor, 68),
    rowPaddingV: scaleValue(base.rowPaddingV, factor, 8),
    thumbSize: scaleValue(base.thumbSize, factor, 44),
    nameFontSize: scaleValue(base.nameFontSize, factor, 18),
    qtyBtnSize: scaleValue(base.qtyBtnSize, factor, 38),
    qtySymbolSize: scaleValue(base.qtySymbolSize, factor, 22),
    qtyFontSize: scaleValue(base.qtyFontSize, factor, 18),
    qtyColWidth: scaleValue(base.qtyColWidth, factor, 108),
    totalColWidth: scaleValue(base.totalColWidth, factor, 120),
    totalFontSize: scaleValue(base.totalFontSize, factor, 18),
    editBtnSize: scaleValue(base.editBtnSize, factor, 40),
    editIconSize: scaleValue(base.editIconSize, factor, 22),
    colHeaderFontSize: scaleValue(base.colHeaderFontSize, factor, 13),
    sortChipHeight: scaleValue(base.sortChipHeight, factor, 40),
    sortChipFontSize: scaleValue(base.sortChipFontSize, factor, 14),
    sortIconSize: scaleValue(base.sortIconSize, factor, 18),
    clearIconSize: scaleValue(base.clearIconSize, factor, 18),
    clearFontSize: scaleValue(base.clearFontSize, factor, 14),
    noticeIconSize: scaleValue(base.noticeIconSize, factor, 22),
    noticeFontSize: scaleValue(base.noticeFontSize, factor, 15),
    footerLabelFontSize: scaleValue(base.footerLabelFontSize, factor, 18),
    footerTotalFontSize: scaleValue(base.footerTotalFontSize, factor, 30),
    adMinHeight: scaleValue(base.adMinHeight, factor, 40),
    emptyIconSize: scaleValue(base.emptyIconSize, factor, 52),
    emptyTitleSize: scaleValue(base.emptyTitleSize, factor, 22),
    emptyHintSize: scaleValue(base.emptyHintSize, factor, 18),
    listBottomPadding: scaleValue(base.listBottomPadding, factor, 280),
    margin: scaleValue(base.margin, factor, 12),
    gap: scaleValue(base.gap, factor, 6),
  };
}
