import { Image } from 'expo-image';

import defaultManifest from '@/data/home-app.default.json';
import { HOME_APP_FETCH_TIMEOUT_MS, HOME_APP_GIST_URL } from '@/config/homeBackground';
import type { HomeAppManifest } from '@/types/homeBackground';
import { fetchRemoteJson } from '@/utils/fetchRemoteJson';
import { isValidHttpUrl } from '@/utils/validateBannerUrl';

let cachedManifest: HomeAppManifest | null = null;
let usedRemoteManifest = false;
const prefetchedUrls = new Set<string>();

function normalizeSponsorMap(
  raw: unknown
): HomeAppManifest['taquilleroSponsorByZone'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

  const out: NonNullable<HomeAppManifest['taquilleroSponsorByZone']> = {};
  for (const [zoneKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = zoneKey.trim().toLowerCase();
    if (!key) continue;

    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim().toLowerCase();
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const entry = value as { supermarketId?: unknown; name?: unknown };
      if (typeof entry.supermarketId === 'string' && entry.supermarketId.trim()) {
        out[key] = {
          supermarketId: entry.supermarketId.trim().toLowerCase(),
          name: typeof entry.name === 'string' ? entry.name.trim() : undefined,
        };
      }
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeManifest(raw: unknown): HomeAppManifest {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<HomeAppManifest>;

  return {
    version: typeof source.version === 'number' ? source.version : 1,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : undefined,
    homeBackgroundUrl: isValidHttpUrl(source.homeBackgroundUrl)
      ? source.homeBackgroundUrl.trim()
      : null,
    appLogoUrl: isValidHttpUrl(source.appLogoUrl) ? source.appLogoUrl.trim() : null,
    taquilleroSponsorByZone: normalizeSponsorMap(source.taquilleroSponsorByZone),
  };
}

export function buildHomeBackgroundImageUri(
  manifest: HomeAppManifest
): string | null {
  if (!isValidHttpUrl(manifest.homeBackgroundUrl)) return null;

  const base = manifest.homeBackgroundUrl!.trim();
  const cacheKey = encodeURIComponent(manifest.updatedAt ?? String(manifest.version ?? 1));
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}v=${cacheKey}`;
}

export function buildAppLogoImageUri(manifest: HomeAppManifest): string | null {
  if (!isValidHttpUrl(manifest.appLogoUrl)) return null;

  const base = manifest.appLogoUrl!.trim();
  const cacheKey = encodeURIComponent(
    `logo-${manifest.updatedAt ?? String(manifest.version ?? 1)}`
  );
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}v=${cacheKey}`;
}

export async function fetchHomeAppManifest(options?: {
  forceRefresh?: boolean;
}): Promise<{
  manifest: HomeAppManifest;
  fromRemote: boolean;
}> {
  if (!options?.forceRefresh && cachedManifest && usedRemoteManifest) {
    return { manifest: cachedManifest, fromRemote: true };
  }

  try {
    const json = await fetchRemoteJson(HOME_APP_GIST_URL, HOME_APP_FETCH_TIMEOUT_MS, 'Home app');
    const manifest = normalizeManifest(json);

    cachedManifest = manifest;
    usedRemoteManifest = true;
    return { manifest, fromRemote: true };
  } catch {
    if (cachedManifest && usedRemoteManifest && !options?.forceRefresh) {
      return { manifest: cachedManifest, fromRemote: true };
    }

    const manifest = normalizeManifest(defaultManifest);
    return { manifest, fromRemote: false };
  }
}

export function getStartupHomeAppManifest(): HomeAppManifest | null {
  return cachedManifest;
}

export function wasRemoteHomeAppManifestUsed(): boolean {
  return usedRemoteManifest;
}

export async function prefetchAppLogoImage(manifest: HomeAppManifest): Promise<boolean> {
  const url = buildAppLogoImageUri(manifest);
  if (!url || prefetchedUrls.has(url)) {
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

export async function prefetchHomeBackgroundImage(manifest: HomeAppManifest): Promise<boolean> {
  const url = buildHomeBackgroundImageUri(manifest);
  if (!url || prefetchedUrls.has(url)) {
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
