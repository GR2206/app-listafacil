import { spacing } from '@/theme';

/** Grilla 3×2 — tres orbes por fila, centrados */
export const HOME_GRID_COLS = 3;
/** −15% sobre gaps anteriores (12 / 26). */
export const HOME_GRID_COL_GAP = 10;
export const HOME_GRID_ROW_GAP = 22;
export const HOME_GRID_MAX_WIDTH = 520;
export const HOME_GRID_H_PADDING = spacing.lg * 2;
/** Tamaño base del slot en la grilla (conserva espacios entre celdas). */
export const HOME_GRID_ORB_SCALE = 0.952;
/** Escala visual del bloque orbe (logo + botón + destello) dentro del slot. */
export const HOME_ORB_VISUAL_SCALE = 1.018;

export function getHomeGridMetrics(screenWidth: number) {
  const gridWidth = Math.min(screenWidth - HOME_GRID_H_PADDING, HOME_GRID_MAX_WIDTH);
  const cellSize = Math.floor(
    (gridWidth - HOME_GRID_COL_GAP * (HOME_GRID_COLS - 1)) / HOME_GRID_COLS,
  );
  const slotOrbSize = Math.floor(cellSize * HOME_GRID_ORB_SCALE);
  const orbSize = Math.floor(slotOrbSize * HOME_ORB_VISUAL_SCALE);

  return {
    gridWidth,
    orbSize,
    slotOrbSize,
    itemSize: slotOrbSize,
  };
}

export function getHomeGridRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += HOME_GRID_COLS) {
    rows.push(items.slice(i, i + HOME_GRID_COLS));
  }
  return rows;
}
