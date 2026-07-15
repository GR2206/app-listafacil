import { SUPERMARKET_CATALOG, type SupermarketCatalogEntry } from '@/data/supermarketCatalog';
import { resolveProvince, resolveZoneRegion } from '@/utils/zoneRegion';
import type { Supermarket } from '@/types';

function matchesCoverage(
  entry: SupermarketCatalogEntry,
  zoneSetting: string | null
): boolean {
  const rule = entry.coverage;

  if (rule.type === 'national') return true;

  if (rule.type === 'cities') {
    const { key } = resolveZoneRegion(zoneSetting);
    return rule.cities.includes(key);
  }

  if (rule.type === 'provinces') {
    const { key } = resolveProvince(zoneSetting);
    return rule.provinces.includes(key);
  }

  return false;
}

/** ¿Este súper se muestra en la zona activa? */
export function isSupermarketAvailableInZone(
  supermarketId: string,
  zoneSetting: string | null
): boolean {
  const entry = SUPERMARKET_CATALOG.find((item) => item.id === supermarketId);
  if (!entry) return true;
  return matchesCoverage(entry, zoneSetting);
}

/** Supers visibles para la zona (orden del catálogo). */
export function getSupermarketsForZone(zoneSetting: string | null): Supermarket[] {
  return SUPERMARKET_CATALOG.filter((entry) => matchesCoverage(entry, zoneSetting)).map(
    ({ id, name, slug, initial, logoUrl }) => ({ id, name, slug, initial, logoUrl })
  );
}

/** @deprecated preferí coverage en supermarketCatalog */
export const SUPERMARKET_COVERAGE: Record<string, string> = Object.fromEntries(
  SUPERMARKET_CATALOG.map((entry) => [
    entry.id,
    entry.coverage.type === 'national'
      ? 'national'
      : entry.coverage.type === 'cities'
        ? entry.coverage.cities[0] ?? 'local'
        : entry.coverage.provinces[0] ?? 'local',
  ])
);
