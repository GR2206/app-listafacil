import { Image } from 'expo-image';



import defaultManifest from '@/data/banners.default.json';

import { BANNER_FALLBACK_IMAGES } from '@/assets/bannerFallbacks';

import { BANNERS_GIST_URL, BANNER_FETCH_TIMEOUT_MS } from '@/config/banners';

import type {
  BannerManifest,
  BannerSlotConfig,
  BannerSlotId,
  HomeCarouselConfig,
  HomeCarouselSlideConfig,
  ResolvedBanner,
  ResolvedHomeCarouselSlide,
} from '@/types/banner';

import { fetchRemoteJson } from '@/utils/fetchRemoteJson';
import { isLottieUrl } from '@/utils/isLottieUrl';
import { isValidBannerTargetUrl, isValidHttpUrl } from '@/utils/validateBannerUrl';
import { resolveZoneRegion } from '@/utils/zoneRegion';
import type { BannerZoneOverride } from '@/types/banner';

const SLOT_IDS: BannerSlotId[] = ['top_banner', 'bottom_banner', 'list_banner'];

const DEFAULT_CAROUSEL_SLIDES: ResolvedHomeCarouselSlide[] = (
  (defaultManifest as BannerManifest).carousel?.slides ?? []
).map((slide, index) => ({
  id: slide.id?.trim() || `slide-${index + 1}`,
  title: (slide.title ?? '').trim() || 'Catálogo del día',
  subtitle: (slide.subtitle ?? '').trim() || 'Deslizá para explorar.',
  imageUrl: isValidHttpUrl(slide.imageUrl) ? slide.imageUrl!.trim() : null,
  targetUrl: isValidBannerTargetUrl(slide.targetUrl) ? slide.targetUrl!.trim() : null,
}));



const prefetchedUrls = new Set<string>();



let cachedManifest: BannerManifest | null = null;

let usedRemoteManifest = false;



function resolveAnimationUrl(entry: BannerManifest['banners'][BannerSlotId]): string | null {

  if (isLottieUrl(entry.animationUrl)) {

    return entry.animationUrl!.trim();

  }



  if (isLottieUrl(entry.imageUrl)) {

    return entry.imageUrl!.trim();

  }



  return null;

}



function normalizeCarouselSlide(
  raw: Partial<HomeCarouselSlideConfig> | null | undefined,
  index: number
): HomeCarouselSlideConfig | null {
  if (!raw || typeof raw !== 'object') return null;

  const imageUrl = isValidHttpUrl(raw.imageUrl) ? raw.imageUrl.trim() : null;
  const targetUrl = isValidBannerTargetUrl(raw.targetUrl) ? raw.targetUrl.trim() : null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const subtitle = typeof raw.subtitle === 'string' ? raw.subtitle.trim() : '';

  if (!imageUrl && !title) return null;

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `slide-${index + 1}`,
    title: title || null,
    subtitle: subtitle || null,
    imageUrl,
    targetUrl,
  };
}

function normalizeCarousel(raw: unknown): HomeCarouselConfig {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<HomeCarouselConfig>;
  const slidesRaw = Array.isArray(source.slides) ? source.slides : [];
  const slides = slidesRaw
    .map((slide, index) => normalizeCarouselSlide(slide as Partial<HomeCarouselSlideConfig>, index))
    .filter((slide): slide is HomeCarouselSlideConfig => slide !== null);

  return {
    enabled: source.enabled !== false,
    slides,
  };
}

function normalizeZoneOverride(raw: unknown): BannerZoneOverride | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const entry = raw as Partial<BannerZoneOverride>;
  const rawImage = typeof entry.imageUrl === 'string' ? entry.imageUrl.replace(/\s+/g, '').trim() : null;
  const rawAnim =
    typeof entry.animationUrl === 'string' ? entry.animationUrl.replace(/\s+/g, '').trim() : null;
  const rawTarget =
    typeof entry.targetUrl === 'string' ? entry.targetUrl.replace(/\s+/g, '').trim() : null;

  const imageUrl = isValidHttpUrl(rawImage) ? rawImage : null;
  const animationUrl = isLottieUrl(rawAnim)
    ? rawAnim
    : isLottieUrl(rawImage)
      ? rawImage
      : null;

  const override: BannerZoneOverride = {
    enabled: entry.enabled,
    imageUrl: imageUrl && !isLottieUrl(imageUrl) ? imageUrl : null,
    animationUrl,
    targetUrl: isValidBannerTargetUrl(rawTarget) ? rawTarget : null,
  };

  // Vacío útil solo si al menos define algo (enabled / media / link).
  if (
    override.enabled === undefined &&
    !override.imageUrl &&
    !override.animationUrl &&
    !override.targetUrl
  ) {
    return null;
  }

  return override;
}

function normalizeByZone(raw: unknown): Record<string, BannerZoneOverride> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, BannerZoneOverride> = {};
  for (const [zoneKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = zoneKey.trim().toLowerCase();
    if (!key) continue;
    const override = normalizeZoneOverride(value);
    if (override) out[key] = override;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeSlotConfig(entry: Partial<BannerSlotConfig>): BannerSlotConfig {
  const imageUrl = isValidHttpUrl(entry.imageUrl) ? entry.imageUrl!.trim() : null;
  const animationUrl = isLottieUrl(entry.animationUrl)
    ? entry.animationUrl!.trim()
    : isLottieUrl(entry.imageUrl)
      ? entry.imageUrl!.trim()
      : null;

  return {
    enabled: entry.enabled !== false,
    imageUrl: imageUrl && !isLottieUrl(imageUrl) ? imageUrl : null,
    animationUrl,
    targetUrl: isValidBannerTargetUrl(entry.targetUrl) ? entry.targetUrl!.trim() : null,
    byZone: normalizeByZone(entry.byZone),
  };
}

function zoneOverrideHasMedia(override: BannerZoneOverride | null | undefined): boolean {
  if (!override) return false;
  return Boolean(
    (override.imageUrl && isValidHttpUrl(override.imageUrl)) ||
      (override.animationUrl && isLottieUrl(override.animationUrl))
  );
}

/**
 * Fusiona creativo base + override de zona.
 * Solo aplica byZone[ciudad] si tiene imagen/animación real (publicidad vendida).
 * Si la zona no tiene → banner general (base del Gist o fallback local programado).
 */
export function mergeBannerConfigForZone(
  base: BannerSlotConfig,
  zoneSetting: string | null | undefined
): BannerSlotConfig {
  const byZone = base.byZone;
  if (!byZone) return base;

  const { key: zoneKey } = resolveZoneRegion(zoneSetting ?? null);
  const zoneOverride = byZone[zoneKey];

  // Sin creativo zonal → general (no usar byZone.default para tapar todas las ciudades).
  if (!zoneOverrideHasMedia(zoneOverride)) {
    return base;
  }

  return {
    enabled:
      zoneOverride!.enabled !== undefined ? zoneOverride!.enabled !== false : base.enabled !== false,
    imageUrl: zoneOverride!.imageUrl ?? base.imageUrl,
    animationUrl: zoneOverride!.animationUrl ?? null,
    targetUrl: zoneOverride!.targetUrl ?? base.targetUrl,
    byZone: base.byZone,
  };
}

function normalizeManifest(raw: unknown): BannerManifest {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<BannerManifest>;
  const banners = (source.banners ?? {}) as Partial<
    Record<BannerSlotId, Partial<BannerSlotConfig>>
  >;

  const normalized = {} as BannerManifest['banners'];

  for (const slot of SLOT_IDS) {
    normalized[slot] = normalizeSlotConfig(banners[slot] ?? {});
  }

  return {
    version: typeof source.version === 'number' ? source.version : 1,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : undefined,
    banners: normalized,
    carousel: normalizeCarousel(source.carousel),
  };
}

/**
 * Slides del carousel home.
 * Prioridad: `carousel.slides` del Gist → creativos remotos de banners → defaults locales.
 */
export function resolveHomeCarouselSlides(manifest: BannerManifest | null): ResolvedHomeCarouselSlide[] {
  if (manifest?.carousel?.enabled === false) {
    return [];
  }

  const configured = manifest?.carousel?.slides ?? [];
  if (configured.length > 0) {
    return configured.map((slide, index) => ({
      id: slide.id?.trim() || `slide-${index + 1}`,
      title: (slide.title ?? '').trim() || 'Catálogo del día',
      subtitle: (slide.subtitle ?? '').trim() || 'Deslizá para explorar.',
      imageUrl: isValidHttpUrl(slide.imageUrl) ? slide.imageUrl!.trim() : null,
      targetUrl: isValidBannerTargetUrl(slide.targetUrl) ? slide.targetUrl!.trim() : null,
    }));
  }

  if (manifest) {
    const fromBanners: ResolvedHomeCarouselSlide[] = [];
    for (const slot of ['top_banner', 'list_banner'] as const) {
      const entry = manifest.banners[slot];
      if (!entry?.enabled || !isValidHttpUrl(entry.imageUrl)) continue;
      fromBanners.push({
        id: `from-${slot}`,
        title: slot === 'top_banner' ? 'Destacado de hoy' : 'Novedad en tu lista',
        subtitle: 'Tocá para ver más · deslizá para seguir explorando',
        imageUrl: entry.imageUrl!.trim(),
        targetUrl: isValidBannerTargetUrl(entry.targetUrl) ? entry.targetUrl!.trim() : null,
      });
    }
    if (fromBanners.length > 0) {
      return [
        ...fromBanners,
        ...DEFAULT_CAROUSEL_SLIDES.filter((slide) => !slide.imageUrl).slice(0, 1),
      ];
    }
  }

  return DEFAULT_CAROUSEL_SLIDES;
}



function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Banner fetch timeout')), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function buildBannerImageUri(url: string, cacheKey: string): string {
  const base = url.trim();
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}v=${encodeURIComponent(cacheKey)}`;
}

function manifestCacheKey(manifest: BannerManifest): string {
  return manifest.updatedAt ?? String(manifest.version ?? 1);
}

export async function fetchBannerManifest(options?: {
  forceRefresh?: boolean;
}): Promise<{
  manifest: BannerManifest;
  fromRemote: boolean;
}> {
  if (!options?.forceRefresh && cachedManifest && usedRemoteManifest) {
    return { manifest: cachedManifest, fromRemote: true };
  }

  try {
    const json = await fetchRemoteJson(BANNERS_GIST_URL, BANNER_FETCH_TIMEOUT_MS, 'Banners');
    const manifest = normalizeManifest(json);

    cachedManifest = manifest;
    usedRemoteManifest = true;

    return { manifest, fromRemote: true };
  } catch {
    if (cachedManifest && usedRemoteManifest && !options?.forceRefresh) {
      return { manifest: cachedManifest, fromRemote: true };
    }

    const manifest = normalizeManifest(defaultManifest);
    cachedManifest = manifest;
    usedRemoteManifest = false;
    return { manifest, fromRemote: false };
  }
}



/** Creativo publicitario remoto cargado desde banners-app.json (Gist). */
export function hasRemoteBannerCreative(resolved: ResolvedBanner): boolean {
  return (
    resolved.enabled &&
    resolved.isRemote &&
    (resolved.mediaType === 'image' || resolved.mediaType === 'lottie')
  );
}

export function resolveBannerSlot(
  manifest: BannerManifest,
  slot: BannerSlotId,
  forceLocalFallback = false,
  zoneSetting: string | null = null
): ResolvedBanner {
  const base = manifest.banners[slot] ?? { enabled: true };
  const config = mergeBannerConfigForZone(base, zoneSetting);
  const enabled = config.enabled !== false;
  const targetUrl = isValidBannerTargetUrl(config.targetUrl) ? config.targetUrl!.trim() : null;
  const { key: zoneKey } = resolveZoneRegion(zoneSetting);

  if (!forceLocalFallback) {
    const animationUrl = resolveAnimationUrl(config);

    if (animationUrl) {
      return {
        slot,
        enabled,
        mediaType: 'lottie',
        animationUrl,
        targetUrl,
        isRemote: true,
      };
    }

    const hasRemoteImage = isValidHttpUrl(config.imageUrl);

    if (hasRemoteImage) {
      const cacheKey = `${manifestCacheKey(manifest)}-${zoneKey}`;

      return {
        slot,
        enabled,
        mediaType: 'image',
        imageSource: {
          uri: buildBannerImageUri(config.imageUrl!.trim(), `${slot}-${cacheKey}`),
        },
        targetUrl,
        isRemote: true,
      };
    }
  }

  return {
    slot,
    enabled,
    mediaType: 'fallback',
    imageSource: BANNER_FALLBACK_IMAGES[slot],
    targetUrl,
    isRemote: false,
  };
}



export async function prefetchBannerImage(url: string): Promise<boolean> {

  if (!isValidHttpUrl(url) || isLottieUrl(url) || prefetchedUrls.has(url)) {

    return false;

  }



  try {
    const ok = await Image.prefetch(url, {
      cachePolicy: 'memory-disk',
    });

    if (ok) {
      prefetchedUrls.add(url);
    }

    return ok;
  } catch {
    return false;
  }

}



export async function prefetchBannerAnimation(url: string): Promise<boolean> {

  if (!isLottieUrl(url) || prefetchedUrls.has(url)) {

    return false;

  }



  try {

    const response = await withTimeout(fetch(url), BANNER_FETCH_TIMEOUT_MS);



    if (!response.ok) {

      return false;

    }



    await response.json();

    prefetchedUrls.add(url);

    return true;

  } catch {

    return false;

  }

}



export async function prefetchManifestImages(manifest: BannerManifest): Promise<void> {
  const tasks: Promise<boolean>[] = [];

  const enqueueConfig = (config: BannerSlotConfig | BannerZoneOverride | undefined) => {
    if (!config) return;
    const animationUrl = resolveAnimationUrl(config as BannerSlotConfig);
    if (animationUrl) {
      tasks.push(prefetchBannerAnimation(animationUrl));
      return;
    }
    if (isValidHttpUrl(config.imageUrl)) {
      tasks.push(prefetchBannerImage(config.imageUrl!));
    }
  };

  for (const slot of SLOT_IDS) {
    const config = manifest.banners[slot];
    if (!config) continue;
    enqueueConfig(config);
    if (config.byZone) {
      for (const override of Object.values(config.byZone)) {
        enqueueConfig(override);
      }
    }
  }

  for (const slide of resolveHomeCarouselSlides(manifest)) {
    if (slide.imageUrl) {
      tasks.push(prefetchBannerImage(slide.imageUrl));
    }
  }

  await Promise.all(tasks);
}



export function clearBannerCacheForTests(): void {

  cachedManifest = null;

  usedRemoteManifest = false;

  prefetchedUrls.clear();

}

export function getStartupBannerManifest(): BannerManifest | null {
  return cachedManifest;
}

export function wasRemoteBannerManifestUsed(): boolean {
  return usedRemoteManifest;
}

