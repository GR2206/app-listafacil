import type { BannerSlotId } from '@/types/banner';

export const BANNER_FALLBACK_IMAGES: Record<BannerSlotId, number> = {
  top_banner: require('../../assets/banners/top-fallback.png'),
  bottom_banner: require('../../assets/banners/bottom-fallback.png'),
  list_banner: require('../../assets/banners/list-fallback.png'),
};
