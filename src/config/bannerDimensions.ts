import type { BannerSlotId } from '@/types/banner';

/** Creativo lista (carrito) — 6:1 */
export const LIST_BANNER_WIDTH = 300;
export const LIST_BANNER_HEIGHT = 50;

/** Creativo home (junto al menú) — 3:1 */
export const TOP_BANNER_WIDTH = 300;
export const TOP_BANNER_HEIGHT = 100;

export interface BannerStripMetrics {
  width: number;
  height: number;
}

export function getBannerStripMetrics(slot: BannerSlotId): BannerStripMetrics {
  if (slot === 'top_banner') {
    return { width: TOP_BANNER_WIDTH, height: TOP_BANNER_HEIGHT };
  }
  if (slot === 'list_banner') {
    return { width: LIST_BANNER_WIDTH, height: LIST_BANNER_HEIGHT };
  }
  return { width: LIST_BANNER_WIDTH, height: LIST_BANNER_HEIGHT };
}

export const HOME_MENU_BUTTON_SIZE = 44;
