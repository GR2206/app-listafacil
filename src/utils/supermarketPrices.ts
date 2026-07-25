export const SUPERMARKET_PRICE_ALIASES: Record<string, string[]> = {
  'la-reina': ['la-reina', 'la_reina', 'La_Reina', 'LA_REINA'],
  'la-gallega': ['la-gallega', 'la_gallega', 'La_Gallega', 'LA_GALEGA'],
  carrefour: ['carrefour', 'Carrefour', 'CARREFOUR'],
  jumbo: ['jumbo', 'Jumbo', 'JUMBO'],
  dar: ['dar', 'DAR', 'Dar'],
  coto: ['coto', 'Coto', 'COTO', 'coto-digital', 'coto_digital', 'Coto Digital'],
  arcoiris: ['arcoiris', 'Arcoiris', 'ARCOIRIS'],
  unico: ['unico', 'Unico', 'UNICO', 'único', 'Único', 'ÚNICO', 'unico-rosario', 'unico_rosario'],
  disco: ['disco', 'Disco', 'DISCO'],
  dia: ['dia', 'Dia', 'DIA', 'día', 'Día'],
  vea: ['vea', 'Vea', 'VEA'],
  atomo: ['atomo', 'Atomo', 'ATOMO', 'átomo', 'Átomo'],
  changomas: ['changomas', 'chango-mas', 'chango_mas', 'ChangoMas', 'CHANGOMAS'],
  'la-anonima': ['la-anonima', 'la_anonima', 'La_Anonima', 'LA_ANONIMA'],
  // Posadas — IDs alineados a scrapers (otra PC)
  california: ['california', 'California', 'CALIFORNIA'],
  yaguar: ['yaguar', 'Yaguar', 'YAGUAR', 'jaguar'],
  maxiconsumo: [
    'maxiconsumo',
    'Maxiconsumo',
    'MAXICONSUMO',
    'maxi-consumo',
    'maxi_consumo',
    'MaxiConsumo',
    'Maxi Consumo',
  ],
  vital: ['vital', 'Vital', 'VITAL'],
  // Mar del Plata — scraper bot5 (otra PC)
  toledo: ['toledo', 'Toledo', 'TOLEDO'],
};

export function supermarketPriceKeys(supermarketId: string): string[] {
  const aliases = SUPERMARKET_PRICE_ALIASES[supermarketId];
  if (aliases) return [...new Set(aliases)];

  const underscore = supermarketId.replace(/-/g, '_');
  const hyphen = supermarketId.replace(/_/g, '-');
  return [...new Set([supermarketId, underscore, hyphen])];
}

/**
 * Piso de precio plausible (ARS). Valores tipo $11 en Jumbo suelen ser
 * precio por unidad / error de scrape — no se muestran ni se guardan.
 */
export const MIN_PLAUSIBLE_UNIT_PRICE = 100;

export function isPlausibleUnitPrice(price: number): boolean {
  return Number.isFinite(price) && price >= MIN_PLAUSIBLE_UNIT_PRICE;
}

/**
 * Precio fantasma típico de Jumbo/VTEX sin stock: ~$500–$1000 vs pares reales.
 * Se compara contra la mediana del resto (no solo el 2.º), ratio 50%.
 * Requiere ≥3 supers: con 2 precios un outlier falso borra cobertura real.
 */
export const CROSS_MARKET_OUTLIER_RATIO = 0.5;
export const CROSS_MARKET_OUTLIER_MIN_PEERS = 3;

function canonicalSupermarketIdForPriceKey(key: string): string {
  const normalized = key.trim();
  for (const [superId, aliases] of Object.entries(SUPERMARKET_PRICE_ALIASES)) {
    if (superId === normalized || aliases.includes(normalized)) return superId;
  }
  return normalized.replace(/_/g, '-').toLowerCase();
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function dropCrossMarketPriceOutliers(
  pricesMap: Record<string, number>
): Record<string, number> {
  /** Un precio por super canónico (evita jumbo/Jumbo como “pares”). */
  const bySuper = new Map<string, number>();
  for (const [key, rawPrice] of Object.entries(pricesMap)) {
    if (!isPlausibleUnitPrice(rawPrice)) continue;
    const superId = canonicalSupermarketIdForPriceKey(key);
    const rounded = Math.round(rawPrice);
    const prev = bySuper.get(superId);
    // Conservar el más alto: los fantasma VTEX suelen ser el valor bajo.
    if (prev == null || rounded > prev) bySuper.set(superId, rounded);
  }

  let entries = [...bySuper.entries()];
  if (entries.length < CROSS_MARKET_OUTLIER_MIN_PEERS) {
    return Object.fromEntries(entries);
  }

  let changed = true;
  while (changed && entries.length >= CROSS_MARKET_OUTLIER_MIN_PEERS) {
    changed = false;
    for (let i = 0; i < entries.length; i++) {
      const price = entries[i][1];
      const others = entries.filter((_, j) => j !== i).map(([, p]) => p);
      const peerMedian = median(others);
      if (peerMedian > 0 && price < peerMedian * CROSS_MARKET_OUTLIER_RATIO) {
        entries = entries.filter((_, j) => j !== i);
        changed = true;
        break;
      }
    }
  }

  return Object.fromEntries(entries);
}

export function parsePricesJson(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const map: Record<string, number> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && isPlausibleUnitPrice(value)) {
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
    if (price != null && isPlausibleUnitPrice(price)) return price;
  }

  return isPlausibleUnitPrice(fallbackPrice) ? fallbackPrice : 0;
}

export function mergeSupermarketPrice(
  pricesMap: Record<string, number>,
  supermarketId: string,
  price: number
): Record<string, number> {
  if (!isPlausibleUnitPrice(price)) return pricesMap;

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
