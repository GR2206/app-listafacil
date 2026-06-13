export type BannerSlotId = 'top_banner' | 'bottom_banner' | 'list_banner';



export type BannerMediaType = 'lottie' | 'image' | 'fallback';



export interface BannerSlotConfig {

  enabled?: boolean;

  /** URL de imagen estática (jpg, png, webp). */

  imageUrl?: string | null;

  /** URL de animación Lottie (.json) desde el Gist o CDN. */

  animationUrl?: string | null;

  targetUrl?: string | null;

}



export interface BannerManifest {

  version?: number;

  updatedAt?: string;

  banners: Record<BannerSlotId, BannerSlotConfig>;

}



export interface ResolvedBanner {

  slot: BannerSlotId;

  enabled: boolean;

  mediaType: BannerMediaType;

  imageSource?: { uri: string } | number;

  animationUrl?: string | null;

  targetUrl: string | null;

  isRemote: boolean;

}

