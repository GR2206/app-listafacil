export const SUPERMARKET_PRICE_ALIASES: Record<string, string[]> = {
  'la-reina': ['la-reina', 'la_reina', 'La_Reina', 'LA_REINA'],
  'la-gallega': ['la-gallega', 'la_gallega', 'La_Gallega', 'LA_GALEGA'],
  carrefour: ['carrefour', 'Carrefour', 'CARREFOUR'],
  jumbo: ['jumbo', 'Jumbo', 'JUMBO'],
  dar: ['dar', 'DAR', 'Dar'],
  coto: ['coto', 'Coto', 'COTO'],
};

export function supermarketPriceKeys(supermarketId: string): string[] {
  const aliases = SUPERMARKET_PRICE_ALIASES[supermarketId];
  if (aliases) return [...new Set(aliases)];

  const underscore = supermarketId.replace(/-/g, '_');
  const hyphen = supermarketId.replace(/_/g, '-');
  return [...new Set([supermarketId, underscore, hyphen])];
}

export function parsePricesJson(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const map: Record<string, number> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        map[key] = Math.round(value);
      }
    }

    return map;
  } catch {
    return {};
  }
}

export function readPriceForSupermarket(
  pricesMap: Record<string, number>,
  supermarketId: string,
  fallbackPrice = 0
): number {
  for (const key of supermarketPriceKeys(supermarketId)) {
    const price = pricesMap[key];
    if (price != null && price > 0) return price;
  }

  return fallbackPrice > 0 ? fallbackPrice : 0;
}

export function mergeSupermarketPrice(
  pricesMap: Record<string, number>,
  supermarketId: string,
  price: number
): Record<string, number> {
  if (price <= 0) return pricesMap;

  const merged = { ...pricesMap };
  for (const key of supermarketPriceKeys(supermarketId)) {
    merged[key] = Math.round(price);
  }
  return merged;
}

export function parseSyncedAtJson(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const map: Record<string, string> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim()) {
        map[key] = value;
      }
    }

    return map;
  } catch {
    return {};
  }
}

export function readSyncTimeForSupermarket(
  syncedAtMap: Record<string, string>,
  supermarketId: string
): string | null {
  for (const key of supermarketPriceKeys(supermarketId)) {
    const syncedAt = syncedAtMap[key];
    if (syncedAt) return syncedAt;
  }

  return null;
}

export function mergeSupermarketSyncTime(
  syncedAtMap: Record<string, string>,
  supermarketId: string,
  syncedAt: string
): Record<string, string> {
  if (!syncedAt.trim()) return syncedAtMap;

  const merged = { ...syncedAtMap };
  for (const key of supermarketPriceKeys(supermarketId)) {
    merged[key] = syncedAt;
  }
  return merged;
}
