import { Image } from 'expo-image';



import defaultManifest from '@/data/banners.default.json';

import { BANNER_FALLBACK_IMAGES } from '@/assets/bannerFallbacks';

import { BANNERS_GIST_URL, BANNER_FETCH_TIMEOUT_MS } from '@/config/banners';

import type {
  BannerManifest,
  BannerSlotConfig,
  BannerSlotId,
  ResolvedBanner,
} from '@/types/banner';

import { fetchRemoteJson } from '@/utils/fetchRemoteJson';
import { isLottieUrl } from '@/utils/isLottieUrl';
import { isValidBannerTargetUrl, isValidHttpUrl } from '@/utils/validateBannerUrl';



const SLOT_IDS: BannerSlotId[] = ['top_banner', 'bottom_banner', 'list_banner'];



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



function normalizeManifest(raw: unknown): BannerManifest {

  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<BannerManifest>;

  const banners = (source.banners ?? {}) as Partial<
    Record<BannerSlotId, Partial<BannerSlotConfig>>
  >;



  const normalized = {} as BannerManifest['banners'];



  for (const slot of SLOT_IDS) {

    const entry = banners[slot] ?? {};

    const imageUrl = isValidHttpUrl(entry.imageUrl) ? entry.imageUrl.trim() : null;

    const animationUrl = isLottieUrl(entry.animationUrl)
      ? entry.animationUrl.trim()
      : isLottieUrl(entry.imageUrl)
        ? entry.imageUrl!.trim()
        : null;



    normalized[slot] = {

      enabled: entry.enabled !== false,

      imageUrl: imageUrl && !isLottieUrl(imageUrl) ? imageUrl : null,

      animationUrl,

      targetUrl: isValidBannerTargetUrl(entry.targetUrl) ? entry.targetUrl.trim() : null,

    };

  }



  return {

    version: typeof source.version === 'number' ? source.version : 1,

    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : undefined,

    banners: normalized,

  };

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

  forceLocalFallback = false

): ResolvedBanner {

  const config = manifest.banners[slot] ?? { enabled: true };

  const enabled = config.enabled !== false;

  const targetUrl = isValidBannerTargetUrl(config.targetUrl) ? config.targetUrl!.trim() : null;



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
      const cacheKey = manifestCacheKey(manifest);

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

  for (const slot of SLOT_IDS) {

    const config = manifest.banners[slot];

    if (!config) continue;



    const animationUrl = resolveAnimationUrl(config);

    if (animationUrl) {

      tasks.push(prefetchBannerAnimation(animationUrl));

      continue;

    }



    if (isValidHttpUrl(config.imageUrl)) {

      tasks.push(prefetchBannerImage(config.imageUrl));

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

