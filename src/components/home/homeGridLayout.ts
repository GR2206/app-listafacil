import { spacing } from '@/theme';

import type { OrbGridMetrics, OrbVisualPresetId } from '@/components/home/supermarketOrbVisualPresets';
import { getOrbVisualPreset } from '@/components/home/supermarketOrbVisualPresets';

/** Grilla 3×2 — tres orbes por fila, centrados */
export const HOME_GRID_COLS = 3;
export const HOME_GRID_COL_GAP = 12;
export const HOME_GRID_ROW_GAP = 26;
export const HOME_GRID_MAX_WIDTH = 520;
export const HOME_GRID_H_PADDING = spacing.lg * 2;
export const HOME_GRID_ORB_SCALE = 0.952;
export const HOME_ORB_VISUAL_SCALE = 1.018;

export function getHomeGridMetrics(
  screenWidth: number,
  visualPreset: OrbVisualPresetId = 'current'
) {
  const grid: OrbGridMetrics = getOrbVisualPreset(visualPreset).grid;
  const gridWidth = Math.min(screenWidth - HOME_GRID_H_PADDING, HOME_GRID_MAX_WIDTH);
  const cellSize = Math.floor(
    (gridWidth - grid.colGap * (HOME_GRID_COLS - 1)) / HOME_GRID_COLS
  );
  const slotOrbSize = Math.floor(cellSize * HOME_GRID_ORB_SCALE);
  const orbSize = Math.floor(slotOrbSize * HOME_ORB_VISUAL_SCALE);

  return {
    gridWidth,
    orbSize,
    slotOrbSize,
    itemSize: slotOrbSize,
    colGap: grid.colGap,
    rowGap: grid.rowGap,
  };
}

export function getHomeGridRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += HOME_GRID_COLS) {
    rows.push(items.slice(i, i + HOME_GRID_COLS));
  }
  return rows;
}

export const HOME_GRID_PRIMARY_COUNT = 6;

export function splitHomeGridMarkets<T>(
  items: T[]
): { primaryRows: T[][]; extraMarkets: T[] } {
  const primaryItems = items.slice(0, HOME_GRID_PRIMARY_COUNT);
  const extraMarkets = items.slice(HOME_GRID_PRIMARY_COUNT);
  return {
    primaryRows: getHomeGridRows(primaryItems),
    extraMarkets,
  };
}
