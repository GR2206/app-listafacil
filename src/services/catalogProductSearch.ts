import { Image } from 'expo-image';

import { getDatabase } from '@/db/database';
import { searchProductCandidatesByName } from '@/services/firebaseProducts';
import type { Product } from '@/types';
import {
  expandSearchRemoteVariants,
  expandSearchSemanticSeeds,
  normalizeSearchText,
  productMatchesSearchQuery,
  scoreProductSearchMatch,
  suggestCorrectedQuery,
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

/** Cap razonable: lista usable sin freeze ni queries eternas. */
const RESULT_CAP = 120;
/** Máx. hits locales a escanear. */
const LOCAL_SCAN_CAP = 200;
/** Hits por variante Firestore (1 query liviana). */
const REMOTE_PER_VARIANT = 80;

function cacheKey(query: string, supermarketId: string): string {
  return `v4::${supermarketId}::${normalizeSearchText(query)}`;
}

function countPricedMarkets(product: Product): number {
  const prices = product.catalogPrices?.prices ?? {};
  return Object.values(prices).filter((value) => typeof value === 'number' && value > 0)
    .length;
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

function mergeProductPreferRicher(existing: Product, incoming: Product): Product {
  const existingPrices = existing.catalogPrices?.prices ?? {};
  const incomingPrices = incoming.catalogPrices?.prices ?? {};
  const mergedPrices = dropCrossMarketPriceOutliers({
    ...existingPrices,
    ...incomingPrices,
  });
  const existingCoverage = countPricedMarkets(existing);
  const incomingCoverage = countPricedMarkets(incoming);
  const preferIncoming =
    incomingCoverage > existingCoverage ||
    (!existing.imageUrl && Boolean(incoming.imageUrl)) ||
    (incoming.name?.length ?? 0) > (existing.name?.length ?? 0) + 8;

  const base = preferIncoming ? incoming : existing;
  return {
    ...base,
    imageUrl: base.imageUrl || existing.imageUrl || incoming.imageUrl,
    brand: base.brand || existing.brand || incoming.brand,
    catalogPrices: {
      prices: mergedPrices,
      syncedAt: {
        ...(existing.catalogPrices?.syncedAt ?? {}),
        ...(incoming.catalogPrices?.syncedAt ?? {}),
      },
    },
  };
}

async function searchLocalByTokens(
  query: string,
  supermarketId: string,
  limit = LOCAL_SCAN_CAP
): Promise<Product[]> {
  const seeds = expandSearchSemanticSeeds(query)
    .filter((t) => t.length >= 2 || /^\d+[a-z]?$/.test(t))
    .slice(0, 8);
  if (seeds.length === 0) return [];

  const database = await getDatabase();
  const primary = seeds[0];

  const likeClauses = seeds
    .flatMap(() => ['name LIKE ? COLLATE NOCASE', 'IFNULL(brand, "") LIKE ? COLLATE NOCASE'])
    .join(' OR ');
  const likeParams = seeds.flatMap((seed) => [`%${seed}%`, `%${seed}%`]);

  const rows = await database.getAllAsync<LocalRow>(
    `SELECT barcode, name, brand, image_url, price, supermarket_id, prices_json
     FROM products
     WHERE ${likeClauses}
     ORDER BY CASE
       WHEN IFNULL(brand, "") LIKE ? COLLATE NOCASE THEN 0
       WHEN name LIKE ? COLLATE NOCASE THEN 1
       WHEN name LIKE ? COLLATE NOCASE THEN 2
       ELSE 3
     END
     LIMIT ?`,
    [...likeParams, `%${primary}%`, `${primary}%`, `% ${primary}%`, limit]
  );

  return rows
    .filter((row) => productMatchesSearchQuery(row.name, row.brand, query))
    .map((row) => rowToProduct(row, supermarketId));
}

function mergeRanked(
  products: Product[],
  query: string,
  maxResults: number = RESULT_CAP
): Product[] {
  const byBarcode = new Map<string, Product>();
  for (const product of products) {
    const prev = byBarcode.get(product.barcode);
    byBarcode.set(
      product.barcode,
      prev ? mergeProductPreferRicher(prev, product) : product
    );
  }

  return [...byBarcode.values()]
    .map((product) => ({
      product,
      score: scoreProductSearchMatch(product.name, product.brand, query),
      coverage: countPricedMarkets(product),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      return a.product.name.localeCompare(b.product.name, 'es');
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
  /** Resultados parciales (local primero). `phase` indica si aún hay remoto. */
  onPartial?: (products: Product[], phase: 'local' | 'remote') => void;
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
  maxResults = RESULT_CAP
): Product[] | null {
  const normalized = normalizeSearchText(query.trim());
  if (normalized.length < 2) return null;

  const exact = resultCache.get(cacheKey(query, supermarketId));
  if (exact?.products.length) {
    return exact.products.slice(0, maxResults);
  }

  let best: Product[] | null = null;
  let bestLen = -1;
  const prefix = `v4::${supermarketId}::`;
  for (const [key, value] of resultCache) {
    if (!key.startsWith(prefix)) continue;
    const cachedQ = key.slice(prefix.length);
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

async function searchFirestoreVariants(
  query: string,
  supermarketId: string
): Promise<Product[]> {
  const variants = expandSearchRemoteVariants(query);
  if (variants.length === 0) return [];

  const batches = await Promise.all(
    variants.slice(0, 6).map((variant) =>
      searchProductCandidatesByName(variant, supermarketId, REMOTE_PER_VARIANT).catch(
        () => [] as Product[]
      )
    )
  );

  return batches.flat();
}

/**
 * Búsqueda ágil: SQLite al instante → 2–3 queries Firestore en paralelo.
 */
export async function searchCatalogProducts(
  options: {
    query: string;
    supermarketId: string;
    maxResults?: number;
  } & SearchCatalogProgress
): Promise<CatalogSearchResult> {
  const maxResults = options.maxResults ?? RESULT_CAP;
  const queryText = options.query.trim();
  if (queryText.length < 2) {
    return { products: [], correctedQuery: null, usedCorrection: false };
  }

  const key = cacheKey(queryText, options.supermarketId);
  const cached = resultCache.get(key);
  if (cached) {
    prefetchProductThumbs(cached.products);
    options.onPartial?.(cached.products, 'remote');
    return cached;
  }

  const instant = peekInstantCatalogResults(queryText, options.supermarketId, maxResults);
  if (instant && instant.length > 0) {
    options.onPartial?.(instant, 'local');
  }

  const correctedQuery = suggestCorrectedQuery(queryText);
  const buckets: Product[] = [];

  try {
    const local = await searchLocalByTokens(queryText, options.supermarketId, LOCAL_SCAN_CAP);
    buckets.push(...local);
    const partial = mergeRanked(buckets, queryText, maxResults);
    if (partial.length > 0) {
      prefetchProductThumbs(partial);
      options.onPartial?.(partial, 'local');
    }
  } catch {
    // sin sqlite
  }

  let usedCorrection = false;
  let ranked = mergeRanked(buckets, queryText, maxResults);

  // Siempre buscar con lo que escribió el usuario (nunca pepas→pepsi en remoto).
  try {
    const remote = await searchFirestoreVariants(queryText, options.supermarketId);
    buckets.push(...remote);
    ranked = mergeRanked(buckets, queryText, maxResults);
    if (ranked.length > 0) {
      prefetchProductThumbs(ranked);
      options.onPartial?.(ranked, 'remote');
    }
  } catch {
    // ignore
  }

  // Corrección solo como fallback si no hubo nada (y el chip avisa).
  if (ranked.length === 0 && correctedQuery) {
    usedCorrection = true;
    try {
      buckets.push(
        ...(await searchLocalByTokens(correctedQuery, options.supermarketId, LOCAL_SCAN_CAP))
      );
    } catch {
      // ignore
    }
    try {
      buckets.push(...(await searchFirestoreVariants(correctedQuery, options.supermarketId)));
    } catch {
      // ignore
    }
    ranked = mergeRanked(buckets, correctedQuery, maxResults);
  }

  const result: CatalogSearchResult = {
    products: ranked,
    correctedQuery:
      correctedQuery && correctedQuery !== normalizeSearchText(queryText)
        ? correctedQuery
        : null,
    usedCorrection,
  };

  prefetchProductThumbs(result.products);

  if (result.products.length > 0) {
    if (resultCache.size >= CACHE_MAX) {
      const first = resultCache.keys().next().value;
      if (first) resultCache.delete(first);
    }
    resultCache.set(key, result);
  }

  return result;
}
