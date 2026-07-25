import { Image } from 'expo-image';

import { getDatabase } from '@/db/database';
import { searchProductCandidatesByName } from '@/services/firebaseProducts';
import type { Product } from '@/types';
import {
  normalizeSearchText,
  scoreProductNameMatch,
  suggestCorrectedQuery,
  titlePrefixMatchesSearchQuery,
} from '@/utils/productSearchQuery';
import {
  dropCrossMarketPriceOutliers,
  parsePricesJson,
  readPriceForSupermarket,
} from '@/utils/supermarketPrices';

type LocalRow = {
  barcode: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  price: number;
  supermarket_id: string;
  prices_json: string | null;
};

const resultCache = new Map<string, CatalogSearchResult>();
const CACHE_MAX = 64;
const prefetchedImageUrls = new Set<string>();

function cacheKey(query: string, supermarketId: string): string {
  return `${supermarketId}::${normalizeSearchText(query)}`;
}

function rowToProduct(row: LocalRow, supermarketId: string): Product {
  const prices = dropCrossMarketPriceOutliers(parsePricesJson(row.prices_json));
  const unitPrice =
    readPriceForSupermarket(prices, supermarketId, 0) ||
    (row.supermarket_id === supermarketId && row.price > 0 ? row.price : 0) ||
    row.price ||
    0;

  return {
    id: row.barcode,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand ?? undefined,
    imageUrl: row.image_url ?? undefined,
    price: unitPrice,
    supermarketId,
    catalogPrices: {
      prices,
      syncedAt: {},
    },
  };
}

/** Una sola variante Firestore (la más útil). */
function firestorePrimaryVariant(query: string): string {
  const raw = query.trim().replace(/\s+/g, ' ');
  if (raw.length < 2) return '';
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

async function searchLocalByTokens(
  query: string,
  supermarketId: string,
  limit = 64
): Promise<Product[]> {
  const tokens = normalizeSearchText(query)
    .split(' ')
    .filter((t) => t.length >= 2)
    .slice(0, 2);

  if (tokens.length === 0) return [];

  const database = await getDatabase();
  const primary = tokens[0];
  // Más filas candidatas: el filtro por prefijo achica después.
  // Prioriza nombres que empiezan con el token.
  const rows = await database.getAllAsync<LocalRow>(
    `SELECT barcode, name, brand, image_url, price, supermarket_id, prices_json
     FROM products
     WHERE name LIKE ? COLLATE NOCASE
     ORDER BY CASE
       WHEN name LIKE ? COLLATE NOCASE THEN 0
       WHEN name LIKE ? COLLATE NOCASE THEN 1
       ELSE 2
     END
     LIMIT ?`,
    [`%${primary}%`, `${primary}%`, `% ${primary}%`, limit]
  );

  return rows
    .filter((row) => titlePrefixMatchesSearchQuery(row.name, query))
    .map((row) => rowToProduct(row, supermarketId));
}

function mergeRanked(products: Product[], query: string, maxResults: number): Product[] {
  const seen = new Set<string>();
  return products
    .map((product) => ({
      product,
      score: scoreProductNameMatch(product.name, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter((entry) => {
      if (seen.has(entry.product.barcode)) return false;
      seen.add(entry.product.barcode);
      return true;
    })
    .slice(0, maxResults)
    .map((entry) => entry.product);
}

export interface CatalogSearchResult {
  products: Product[];
  correctedQuery: string | null;
  usedCorrection: boolean;
}

export interface SearchCatalogProgress {
  onPartial?: (products: Product[]) => void;
}

/** Prefetch thumbs para que la lista pinte con imagen al toque. */
export function prefetchProductThumbs(products: Product[]): void {
  for (const product of products) {
    const url = product.imageUrl?.trim();
    if (!url || prefetchedImageUrls.has(url)) continue;
    prefetchedImageUrls.add(url);
    void Image.prefetch(url, { cachePolicy: 'memory-disk' }).catch(() => {
      prefetchedImageUrls.delete(url);
    });
  }
}

/**
 * Resultado en caché o filtrado instantáneo de un prefijo tipado antes
 * (ej. "lec" → "leche") sin tocar SQLite/Firestore.
 */
export function peekInstantCatalogResults(
  query: string,
  supermarketId: string,
  maxResults = 20
): Product[] | null {
  const normalized = normalizeSearchText(query.trim());
  if (normalized.length < 2) return null;

  const exact = resultCache.get(cacheKey(query, supermarketId));
  if (exact?.products.length) return exact.products.slice(0, maxResults);

  // Prefijo más largo primero (más preciso).
  let best: Product[] | null = null;
  let bestLen = -1;
  for (const [key, value] of resultCache) {
    if (!key.startsWith(`${supermarketId}::`)) continue;
    const cachedQ = key.slice(supermarketId.length + 2);
    if (cachedQ.length < 2 || !normalized.startsWith(cachedQ)) continue;
    if (cachedQ.length < bestLen) continue;
    if (!value.products.length) continue;
    const narrowed = mergeRanked(value.products, query, maxResults);
    if (narrowed.length > 0) {
      best = narrowed;
      bestLen = cachedQ.length;
    }
  }

  return best;
}

/**
 * Búsqueda rápida: instantáneo desde caché → SQLite → Firestore solo si vacío.
 */
export async function searchCatalogProducts(
  options: {
    query: string;
    supermarketId: string;
    maxResults?: number;
  } & SearchCatalogProgress
): Promise<CatalogSearchResult> {
  const maxResults = options.maxResults ?? 20;
  const query = options.query.trim();
  if (query.length < 2) {
    return { products: [], correctedQuery: null, usedCorrection: false };
  }

  const key = cacheKey(query, options.supermarketId);
  const cached = resultCache.get(key);
  if (cached) {
    prefetchProductThumbs(cached.products);
    options.onPartial?.(cached.products);
    return cached;
  }

  const instant = peekInstantCatalogResults(query, options.supermarketId, maxResults);
  if (instant && instant.length > 0) {
    options.onPartial?.(instant);
  }

  const correctedQuery = suggestCorrectedQuery(query);
  const buckets: Product[] = [];

  try {
    const local = await searchLocalByTokens(query, options.supermarketId, 64);
    buckets.push(...local);
    const partial = mergeRanked(buckets, query, maxResults);
    if (partial.length > 0) {
      prefetchProductThumbs(partial);
      options.onPartial?.(partial);
    }
  } catch {
    // sin sqlite
  }

  let usedCorrection = false;
  let ranked = mergeRanked(buckets, query, maxResults);

  // Firestore solo si local vacío (no bloquear la UI con red).
  if (ranked.length === 0) {
    const variant = firestorePrimaryVariant(
      correctedQuery && correctedQuery !== normalizeSearchText(query)
        ? correctedQuery
        : query
    );
    if (variant) {
      try {
        const remote = await searchProductCandidatesByName(
          variant,
          options.supermarketId,
          Math.min(12, maxResults)
        );
        buckets.push(...remote);
        ranked = mergeRanked(buckets, query, maxResults);
        if (ranked.length > 0) {
          prefetchProductThumbs(ranked);
          options.onPartial?.(ranked);
        }
      } catch {
        // ignore
      }
    }
  }

  if (ranked.length === 0 && correctedQuery) {
    usedCorrection = true;
    try {
      buckets.push(
        ...(await searchLocalByTokens(correctedQuery, options.supermarketId, 64))
      );
    } catch {
      // ignore
    }
    ranked = mergeRanked(buckets, correctedQuery, maxResults);
    if (ranked.length === 0) {
      const variant = firestorePrimaryVariant(correctedQuery);
      if (variant) {
        try {
          buckets.push(
            ...(await searchProductCandidatesByName(
              variant,
              options.supermarketId,
              Math.min(12, maxResults)
            ))
          );
        } catch {
          // ignore
        }
      }
      ranked = mergeRanked(buckets, correctedQuery, maxResults);
    }
  }

  const result: CatalogSearchResult = {
    products: ranked,
    correctedQuery:
      correctedQuery && correctedQuery !== normalizeSearchText(query)
        ? correctedQuery
        : null,
    usedCorrection,
  };

  prefetchProductThumbs(result.products);

  // No cachear vacíos: evita “quemar” una query si el catálogo local aún no estaba listo.
  if (result.products.length > 0) {
    if (resultCache.size >= CACHE_MAX) {
      const first = resultCache.keys().next().value;
      if (first) resultCache.delete(first);
    }
    resultCache.set(key, result);
  }

  return result;
}
