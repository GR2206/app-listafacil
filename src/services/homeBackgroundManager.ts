import { Image } from 'expo-image';

import defaultManifest from '@/data/home-app.default.json';
import { HOME_APP_FETCH_TIMEOUT_MS, HOME_APP_GIST_URL } from '@/config/homeBackground';
import type { HomeAppManifest } from '@/types/homeBackground';
import { isValidHttpUrl } from '@/utils/validateBannerUrl';

let cachedManifest: HomeAppManifest | null = null;
let usedRemoteManifest = false;
const prefetchedUrls = new Set<string>();

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Home app fetch timeout')), timeoutMs);

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

function normalizeManifest(raw: unknown): HomeAppManifest {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<HomeAppManifest>;

  return {
    version: typeof source.version === 'number' ? source.version : 1,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : undefined,
    homeBackgroundUrl: isValidHttpUrl(source.homeBackgroundUrl)
      ? source.homeBackgroundUrl.trim()
      : null,
  };
}

export async function fetchHomeAppManifest(): Promise<{
  manifest: HomeAppManifest;
  fromRemote: boolean;
}> {
  if (cachedManifest) {
    return { manifest: cachedManifest, fromRemote: usedRemoteManifest };
  }

  try {
    const response = await withTimeout(fetch(HOME_APP_GIST_URL), HOME_APP_FETCH_TIMEOUT_MS);
    if (!response.ok) {
      throw new Error(`Home app HTTP ${response.status}`);
    }

    const manifest = normalizeManifest(await response.json());
    cachedManifest = manifest;
    usedRemoteManifest = true;
    return { manifest, fromRemote: true };
  } catch {
    const manifest = normalizeManifest(defaultManifest);
    cachedManifest = manifest;
    usedRemoteManifest = false;
    return { manifest, fromRemote: false };
  }
}

export function getStartupHomeAppManifest(): HomeAppManifest | null {
  return cachedManifest;
}

export function wasRemoteHomeAppManifestUsed(): boolean {
  return usedRemoteManifest;
}

export async function prefetchHomeBackgroundImage(manifest: HomeAppManifest): Promise<boolean> {
  const url = manifest.homeBackgroundUrl;
  if (!isValidHttpUrl(url) || prefetchedUrls.has(url)) {
    return false;
  }

  try {
    const ok = await Image.prefetch(url, { cachePolicy: 'memory-disk' });
    if (ok) prefetchedUrls.add(url);
    return ok;
  } catch {
    return false;
  }
}

export function clearHomeBackgroundCacheForTests(): void {
  cachedManifest = null;
  usedRemoteManifest = false;
  prefetchedUrls.clear();
}
