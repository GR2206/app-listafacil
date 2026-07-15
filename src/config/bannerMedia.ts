import type { BannerSlotId } from '@/types/banner';

export type BannerContentFit = 'cover' | 'contain' | 'fill';

/**
 * - top: contain → sin deformar (ideal 300×100).
 * - list: cover → llena el marco 6:1 estándar.
 */
export const BANNER_CONTENT_FIT: Record<BannerSlotId, BannerContentFit> = {
  top_banner: 'contain',
  bottom_banner: 'contain',
  list_banner: 'cover',
};
