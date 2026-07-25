export type BannerSlotId = 'top_banner' | 'bottom_banner' | 'list_banner';

export type BannerMediaType = 'lottie' | 'image' | 'fallback';

/** Override por zona (regionKey: rosario, posadas, mendoza…). */
export type BannerZoneOverride = {
  enabled?: boolean;
  imageUrl?: string | null;
  animationUrl?: string | null;
  targetUrl?: string | null;
};

export interface BannerSlotConfig {
  enabled?: boolean;
  /** URL de imagen estática (jpg, png, webp). */
  imageUrl?: string | null;
  /** URL de animación Lottie (.json) desde el Gist o CDN. */
  animationUrl?: string | null;
  targetUrl?: string | null;
  /**
   * Publicidad distinta por región (misma mecánica que el banner del medio).
   * Ej: { "posadas": { "imageUrl": "...", "targetUrl": "..." }, "default": { ... } }
   */
  byZone?: Record<string, BannerZoneOverride>;
}

/** Slide del carousel de catálogo del día (home). */
export interface HomeCarouselSlideConfig {
  id?: string;
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  targetUrl?: string | null;
}

export interface HomeCarouselConfig {
  enabled?: boolean;
  slides?: HomeCarouselSlideConfig[];
}

export interface BannerManifest {
  version?: number;
  updatedAt?: string;
  banners: Record<BannerSlotId, BannerSlotConfig>;
  /** Carousel horizontal bajo la cabecera del home (opcional en el Gist). */
  carousel?: HomeCarouselConfig;
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

export interface ResolvedHomeCarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  targetUrl: string | null;
}
