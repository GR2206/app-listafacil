import type { BannerSlotId } from '@/types/banner';

export type BannerContentFit = 'cover' | 'contain' | 'fill';

/**
 * - top: contain → sin deformar (ideal 300×100 o 600×200).
 * - list: cover → llena el marco sin aplastar; recorta un poco arriba/abajo si la imagen es más alta.
 */
export const BANNER_CONTENT_FIT: Record<BannerSlotId, BannerContentFit> = {
  top_banner: 'contain',
  bottom_banner: 'contain',
  list_banner: 'cover',
};
