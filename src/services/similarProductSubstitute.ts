import { findSimilarProductCandidatesLocal } from '@/db/database';
import type { UserPriceRecord } from '@/db/userPrices';
import { searchProductCandidatesByName } from '@/services/firebaseProducts';
import type { CartLine } from '@/types';
import { isManualCartLine } from '@/utils/manualProduct';
import { resolveEffectiveUnitPriceForItem } from '@/utils/resolvePrice';
import {
  candidateMatchesProductType,
  candidateSharesBrand,
  extractSimilarProductQuery,
  normalizeSimilarText,
} from '@/utils/similarProductTokens';
import { readPriceForSupermarket } from '@/utils/supermarketPrices';

export interface TicketSubstitute {
  originalBarcode: string;
  supermarketId: string;
  substituteBarcode: string;
  substituteName: string;
  unitPrice: number;
  matchToken: string;
  source: 'sqlite' | 'firestore';
  /** Mismo producto (otro EAN) vs similar de otra marca. */
  kind?: 'same_product' | 'similar';
}

export type TicketSubstituteMap = Record<string, TicketSubstitute>;

export function substituteKey(barcode: string, supermarketId: string): string {
  return `${barcode}::${supermarketId}`;
}

interface RankedCandidate {
  barcode: string;
  name: string;
  unitPrice: number;
  source: 'sqlite' | 'firestore';
  sameBrand: boolean;
  score: number;
}

const queryCache = new Map<string, TicketSubstitute | null>();

function cacheKey(
  supermarketId: string,
  searchQuery: string,
  requiredTokens: string[],
  brandTokens: string[]
): string {
  return [
    supermarketId,
    searchQuery.toLowerCase(),
    requiredTokens.join('+'),
    brandTokens.join('+'),
  ].join('::');
}

function significantNameTokens(name: string): string[] {
  return normalizeSimilarText(name)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !/^\d+[a-z]*$/.test(t));
}

function nameOverlapScore(a: string, b: string): number {
  const ta = new Set(significantNameTokens(a));
  const tb = significantNameTokens(b);
  if (ta.size === 0 || tb.length === 0) return 0;
  let hit = 0;
  for (const t of tb) {
    if (ta.has(t)) hit += 1;
  }
  return hit / Math.max(ta.size, tb.length);
}

function pickBestCandidate(
  candidates: RankedCandidate[],
  excludeBarcode: string
): RankedCandidate | null {
  const valid = candidates.filter(
    (c) => c.barcode !== excludeBarcode && c.unitPrice > 0
  );
  if (valid.length === 0) return null;

  const otherBrand = valid.filter((c) => !c.sameBrand);
  const pool = otherBrand.length > 0 ? otherBrand : valid;
  return pool.reduce((best, current) => {
    if (current.score !== best.score) return current.score > best.score ? current : best;
    return current.unitPrice < best.unitPrice ? current : best;
  });
}

/**
 * Mismo producto con otro EAN (cadenas usan GTIN distintos).
 */
async function findSameProductAlternateBarcode(options: {
  name: string;
  brand?: string;
  barcode: string;
  supermarketId: string;
}): Promise<TicketSubstitute | null> {
  const query = extractSimilarProductQuery(options.name, options.brand);
  const seed =
    query.searchQueries[0] ?? significantNameTokens(options.name)[0] ?? '';
  if (seed.length < 3) return null;

  const localRows = await findSimilarProductCandidatesLocal({
    token: seed,
    supermarketId: options.supermarketId,
    excludeBarcode: options.barcode,
    limit: 80,
  });

  let best: RankedCandidate | null = null;
  for (const row of localRows) {
    const score = nameOverlapScore(options.name, row.name);
    if (score < 0.55) continue;
    const sameBrand =
      query.brandTokens.length === 0
        ? true
        : candidateSharesBrand(row.name, query.brandTokens);
    if (query.brandTokens.length > 0 && !sameBrand && score < 0.75) continue;

    const candidate: RankedCandidate = {
      barcode: row.barcode,
      name: row.name,
      unitPrice: row.unitPrice,
      source: 'sqlite',
      sameBrand: true,
      score,
    };
    if (!best || candidate.score > best.score) best = candidate;
  }

  if (!best) return null;

  return {
    originalBarcode: options.barcode,
    supermarketId: options.supermarketId,
    substituteBarcode: best.barcode,
    substituteName: best.name,
    unitPrice: best.unitPrice,
    matchToken: seed,
    source: best.source,
    kind: 'same_product',
  };
}

async function findCheapestForQuery(options: {
  searchQuery: string;
  requiredTokens: string[];
  brandTokens: string[];
  supermarketId: string;
  excludeBarcode: string;
}): Promise<TicketSubstitute | null> {
  const {
    searchQuery,
    requiredTokens,
    brandTokens,
    supermarketId,
    excludeBarcode,
  } = options;

  const key = cacheKey(supermarketId, searchQuery, requiredTokens, brandTokens);
  if (queryCache.has(key)) {
    const cached = queryCache.get(key) ?? null;
    if (cached && cached.substituteBarcode === excludeBarcode) return null;
    return cached;
  }

  const ranked: RankedCandidate[] = [];

  const localRows = await findSimilarProductCandidatesLocal({
    token: searchQuery,
    supermarketId,
    excludeBarcode,
    requiredTokens,
    limit: 100,
  });

  for (const row of localRows) {
    if (!candidateMatchesProductType(row.name, requiredTokens)) continue;
    ranked.push({
      barcode: row.barcode,
      name: row.name,
      unitPrice: row.unitPrice,
      source: 'sqlite',
      sameBrand: candidateSharesBrand(row.name, brandTokens),
      score: nameOverlapScore(searchQuery, row.name),
    });
  }

  if (ranked.length === 0) {
    try {
      const remote = await searchProductCandidatesByName(searchQuery, supermarketId, 16);
      for (const product of remote) {
        if (product.barcode === excludeBarcode) continue;
        if (product.price <= 0) continue;
        if (!candidateMatchesProductType(product.name, requiredTokens)) continue;
        ranked.push({
          barcode: product.barcode,
          name: product.name,
          unitPrice: product.price,
          source: 'firestore',
          sameBrand: candidateSharesBrand(product.name, brandTokens),
          score: nameOverlapScore(searchQuery, product.name),
        });
      }
    } catch {
      // sin red / índice
    }
  }

  const best = pickBestCandidate(ranked, excludeBarcode);
  if (!best) {
    queryCache.set(key, null);
    return null;
  }

  const match: TicketSubstitute = {
    originalBarcode: excludeBarcode,
    supermarketId,
    substituteBarcode: best.barcode,
    substituteName: best.name,
    unitPrice: best.unitPrice,
    matchToken: searchQuery,
    source: best.source,
    kind: 'similar',
  };
  queryCache.set(key, match);
  return match;
}

export async function findCheapestSimilarProduct(options: {
  name: string;
  brand?: string;
  barcode: string;
  supermarketId: string;
}): Promise<TicketSubstitute | null> {
  const same = await findSameProductAlternateBarcode(options);
  if (same) return same;

  const query = extractSimilarProductQuery(options.name, options.brand);
  if (query.requiredTokens.length === 0 || query.searchQueries.length === 0) {
    return null;
  }

  let fallbackSameBrand: TicketSubstitute | null = null;

  for (const searchQuery of query.searchQueries) {
    const match = await findCheapestForQuery({
      searchQuery,
      requiredTokens: query.requiredTokens,
      brandTokens: query.brandTokens,
      supermarketId: options.supermarketId,
      excludeBarcode: options.barcode,
    });
    if (!match) continue;

    const resolved = { ...match, originalBarcode: options.barcode, kind: 'similar' as const };
    const isSameBrand = candidateSharesBrand(match.substituteName, query.brandTokens);

    if (!isSameBrand) return resolved;
    if (!fallbackSameBrand) fallbackSameBrand = resolved;
  }

  return fallbackSameBrand;
}

function hasPriceInSupermarket(
  item: CartLine,
  supermarketId: string,
  pricesByBarcode: Record<string, Record<string, number>>,
  syncedAtByBarcode: Record<string, Record<string, string>>,
  userPricesByBarcode: Record<string, UserPriceRecord>
): boolean {
  if (isManualCartLine(item)) return item.unitPrice > 0;

  const fromCatalog = readPriceForSupermarket(
    pricesByBarcode[item.barcode] ?? {},
    supermarketId,
    0
  );

  const unitPrice = resolveEffectiveUnitPriceForItem({
    barcode: item.barcode,
    supermarketId,
    pricesByBarcode,
    syncedAtByBarcode,
    userPricesByBarcode,
    catalogPrice: fromCatalog,
    cartStoredPrice: item.supermarketId === supermarketId ? item.unitPrice : 0,
  });

  return unitPrice > 0;
}

/**
 * Completa huecos: mismo producto (otro EAN) o similar del mismo tipo.
 */
export async function resolveTicketSubstitutes(options: {
  items: CartLine[];
  supermarketIds: string[];
  pricesByBarcode: Record<string, Record<string, number>>;
  syncedAtByBarcode?: Record<string, Record<string, string>>;
  userPricesByBarcode?: Record<string, UserPriceRecord>;
}): Promise<TicketSubstituteMap> {
  const {
    items,
    supermarketIds,
    pricesByBarcode,
    syncedAtByBarcode = {},
    userPricesByBarcode = {},
  } = options;

  const result: TicketSubstituteMap = {};
  const gaps: Array<{ item: CartLine; supermarketId: string }> = [];

  for (const supermarketId of supermarketIds) {
    for (const item of items) {
      if (isManualCartLine(item)) continue;
      if (
        hasPriceInSupermarket(
          item,
          supermarketId,
          pricesByBarcode,
          syncedAtByBarcode,
          userPricesByBarcode
        )
      ) {
        continue;
      }
      gaps.push({ item, supermarketId });
    }
  }

  for (const gap of gaps) {
    const key = substituteKey(gap.item.barcode, gap.supermarketId);
    const match = await findCheapestSimilarProduct({
      name: gap.item.name,
      brand: gap.item.brand,
      barcode: gap.item.barcode,
      supermarketId: gap.supermarketId,
    });
    if (match) {
      result[key] = match;
    }
  }

  return result;
}
