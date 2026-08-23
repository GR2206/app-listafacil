import { SUPERMARKET_CATALOG, type SupermarketCatalogEntry } from '@/data/supermarketCatalog';
import { resolveProvince, resolveZoneRegion } from '@/utils/zoneRegion';
import type { Supermarket } from '@/types';

/**
 * Orden fijo (y exclusivo) de orbes por ciudad.
 * Si hay mapa, solo se muestran esos IDs (en ese orden).
 */
const ZONE_SUPER_ORDER: Record<string, readonly string[]> = {
  cordoba: ['vea', 'jumbo', 'carrefour', 'changomas', 'la-anonima', 'dia'],
  'rio-cuarto': ['top', 'vea', 'changomas', 'carrefour', 'atomo'],
  'santa-fe': ['alvear', 'kilbel', 'coto', 'changomas', 'dia', 'dar', 'yaguar'],
  'san-juan': ['vea', 'carrefour', 'la-anonima', 'atomo', 'changomas'],
  'la-plata': ['carrefour', 'changomas', 'coto', 'vea', 'maxiconsumo', 'disco', 'dia'],
  'bahia-blanca': ['cooperativa-obrera', 'vea', 'carrefour', 'changomas', 'vital'],
};

function matchesCoverage(
  entry: SupermarketCatalogEntry,
  zoneSetting: string | null
): boolean {
  const rule = entry.coverage;
  const { key: cityKey } = resolveZoneRegion(zoneSetting);

  if (rule.type === 'national') {
    if (rule.excludeCities?.length && rule.excludeCities.includes(cityKey)) {
      return false;
    }
    return true;
  }

  if (rule.type === 'cities') {
    return rule.cities.includes(cityKey);
  }

  if (rule.type === 'provinces') {
    if (rule.excludeCities?.length && rule.excludeCities.includes(cityKey)) {
      return false;
    }
    if (rule.alsoCities?.length && rule.alsoCities.includes(cityKey)) {
      return true;
    }
    const { key: provinceKey } = resolveProvince(zoneSetting);
    return rule.provinces.includes(provinceKey);
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
  if (!matchesCoverage(entry, zoneSetting)) return false;

  // Si la ciudad tiene grilla exclusiva, solo esos IDs cuentan (evita Disco en Bahía por BA).
  const { key } = resolveZoneRegion(zoneSetting);
  const exclusive = ZONE_SUPER_ORDER[key];
  if (exclusive?.length) return exclusive.includes(supermarketId);

  return true;
}

function orderSupermarketsForZone(
  markets: Supermarket[],
  zoneSetting: string | null
): Supermarket[] {
  const { key } = resolveZoneRegion(zoneSetting);
  const preferred = ZONE_SUPER_ORDER[key];
  if (!preferred?.length) return markets;

  const byId = new Map(markets.map((market) => [market.id, market]));
  const ordered: Supermarket[] = [];
  for (const id of preferred) {
    const market = byId.get(id);
    if (market) ordered.push(market);
  }
  return ordered;
}

/** Supers visibles para la zona (orden del catálogo o mapa exclusivo por ciudad). */
export function getSupermarketsForZone(zoneSetting: string | null): Supermarket[] {
  const markets = SUPERMARKET_CATALOG.filter((entry) =>
    matchesCoverage(entry, zoneSetting)
  ).map(({ id, name, slug, initial, logoUrl }) => ({ id, name, slug, initial, logoUrl }));

  return orderSupermarketsForZone(markets, zoneSetting);
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
