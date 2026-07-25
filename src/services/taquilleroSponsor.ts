import { getCatalogEntry, MOCK_SUPERMARKETS } from '@/data/supermarketCatalog';
import type { HomeAppManifest, TaquilleroSponsorEntry } from '@/types/homeBackground';
import {
  getSupermarketsForZone,
  isSupermarketAvailableInZone,
} from '@/utils/supermarketCoverage';
import { resolveZoneRegion } from '@/utils/zoneRegion';

export interface ResolvedTaquilleroSponsor {
  supermarketId: string;
  supermarketName: string;
  zoneKey: string;
  zoneLabel: string;
  source: 'gist' | 'zone_fallback';
}

function normalizeSponsorEntry(
  raw: string | TaquilleroSponsorEntry | null | undefined
): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const id = raw.trim().toLowerCase();
    return id || null;
  }
  if (typeof raw === 'object' && typeof raw.supermarketId === 'string') {
    const id = raw.supermarketId.trim().toLowerCase();
    return id || null;
  }
  return null;
}

function resolveName(supermarketId: string, hint?: string): string {
  if (hint?.trim()) return hint.trim();
  return (
    getCatalogEntry(supermarketId)?.name ??
    MOCK_SUPERMARKETS.find((m) => m.id === supermarketId)?.name ??
    supermarketId
  );
}

/**
 * Banner ovalado = sponsor por zona desde home-app.json (Gist).
 * Solo acepta supers del catálogo disponibles en esa zona.
 */
export function resolveTaquilleroSponsor(
  zoneSetting: string | null,
  manifest: HomeAppManifest | null | undefined
): ResolvedTaquilleroSponsor {
  const { key: zoneKey, label: zoneLabel } = resolveZoneRegion(zoneSetting);
  const byZone = manifest?.taquilleroSponsorByZone ?? {};

  const candidates = [
    normalizeSponsorEntry(byZone[zoneKey]),
    normalizeSponsorEntry(byZone.default),
    normalizeSponsorEntry(byZone._default),
  ].filter(Boolean) as string[];

  for (const supermarketId of candidates) {
    const known =
      Boolean(getCatalogEntry(supermarketId)) ||
      MOCK_SUPERMARKETS.some((m) => m.id === supermarketId);
    if (!known) continue;
    if (!isSupermarketAvailableInZone(supermarketId, zoneSetting)) continue;

    const entry = byZone[zoneKey];
    const nameHint =
      typeof entry === 'object' && entry && typeof entry.name === 'string'
        ? entry.name
        : undefined;

    return {
      supermarketId,
      supermarketName: resolveName(supermarketId, nameHint),
      zoneKey,
      zoneLabel,
      source: 'gist',
    };
  }

  const zoneMarkets = getSupermarketsForZone(zoneSetting);
  const fallback = zoneMarkets[0] ?? MOCK_SUPERMARKETS[0];

  return {
    supermarketId: fallback.id,
    supermarketName: fallback.name,
    zoneKey,
    zoneLabel,
    source: 'zone_fallback',
  };
}
