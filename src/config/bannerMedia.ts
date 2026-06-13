import type { BannerSlotId } from '@/types/banner';

export type BannerContentFit = 'cover' | 'contain';

/** Top/bottom: cover llena la franja; list: contain evita recortar creativos 300×50. */
export const BANNER_CONTENT_FIT: Record<BannerSlotId, BannerContentFit> = {
  top_banner: 'cover',
  bottom_banner: 'cover',
  list_banner: 'contain',
};
