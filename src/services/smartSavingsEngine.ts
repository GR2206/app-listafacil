import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import type { UserPriceRecord } from '@/db/userPrices';
import type { TicketSubstituteMap } from '@/services/similarProductSubstitute';
import type { SupermarketSyncStatus } from '@/services/syncStatus';
import type { CartLine } from '@/types';
import { logPriceAudit } from '@/utils/priceAuditLog';
import { resolveEffectiveUnitPriceForItem } from '@/utils/resolvePrice';
import { readPriceForSupermarket, readSyncTimeForSupermarket } from '@/utils/supermarketPrices';
import {
  countSubstitutedLines,
  resolveCartLinesForSupermarket,
  sumCartTotal,
} from '@/utils/resolveCartLines';

export interface SupermarketQuote {
  supermarketId: string;
  name: string;
  total: number;
  pricedItemCount: number;
  totalItems: number;
  isComplete: boolean;
  /** Cantidad de ítems completados con un producto similar más barato. */
  substitutedItemCount: number;
  savingsVsMax: number;
  lastSyncedAt: string | null;
  dailyReportDate: string | null;
  /** Solo tickets completos compiten por ganador / ahorro. */
  isFairComparable: boolean;
  coverageRatio: number;
}

export interface SmartSavingsResult {
  quotes: SupermarketQuote[];
  winner: SupermarketQuote | null;
  maxTotal: number;
  winnerSavings: number;
  hasComparableQuotes: boolean;
  /** True si hay al menos un ticket con todos los productos. */
  hasCompleteQuotes: boolean;
}

export interface ScannedProductQuote {
  supermarketId: string;
  name: string;
  unitPrice: number;
  lineTotal: number;
}

function countPricedItems(lines: CartLine[]): number {
  return lines.filter((line) => line.unitPrice > 0).length;
}

function resolveSupermarketLastSync(
  items: CartLine[],
  pricesByBarcode: Record<string, Record<string, number>>,
  syncedAtByBarcode: Record<string, Record<string, string>>,
  supermarketId: string
): string | null {
  let latest: string | null = null;

  for (const item of items) {
    const prices = pricesByBarcode[item.barcode] ?? {};
    const hasPrice = readPriceForSupermarket(prices, supermarketId, 0) > 0;
    if (!hasPrice) continue;

    const syncedAt = readSyncTimeForSupermarket(
      syncedAtByBarcode[item.barcode] ?? {},
      supermarketId
    );

    if (!syncedAt) continue;
    if (!latest || syncedAt > latest) latest = syncedAt;
  }

  return latest;
}

/**
 * Calcula totales por supermercado y determina el ganador (lista completa al menor precio).
 */
function resolveQuoteSyncTimestamp(
  supermarketId: string,
  items: CartLine[],
  pricesByBarcode: Record<string, Record<string, number>>,
  syncedAtByBarcode: Record<string, Record<string, string>>,
  syncStatusBySuper: Record<string, SupermarketSyncStatus>
): string | null {
  const remote = syncStatusBySuper[supermarketId]?.lastUpdatedTimestamp ?? null;
  const fromItems = resolveSupermarketLastSync(
    items,
    pricesByBarcode,
    syncedAtByBarcode,
    supermarketId
  );

  if (remote && fromItems) {
    return remote > fromItems ? remote : fromItems;
  }

  return remote ?? fromItems;
}

function sortQuotesForDisplay(a: SupermarketQuote, b: SupermarketQuote): number {
  return a.total - b.total;
}

export function computeSmartSavings(
  items: CartLine[],
  pricesByBarcode: Record<string, Record<string, number>>,
  syncedAtByBarcode: Record<string, Record<string, string>> = {},
  supermarkets = MOCK_SUPERMARKETS,
  syncStatusBySuper: Record<string, SupermarketSyncStatus> = {},
  userPricesByBarcode: Record<string, UserPriceRecord> = {},
  substitutesByKey: TicketSubstituteMap = {}
): SmartSavingsResult {
  if (items.length === 0) {
    return {
      quotes: [],
      winner: null,
      maxTotal: 0,
      winnerSavings: 0,
      hasComparableQuotes: false,
      hasCompleteQuotes: false,
    };
  }

  const allQuotes: SupermarketQuote[] = supermarkets.map((market) => {
    const lines = resolveCartLinesForSupermarket(items, pricesByBarcode, market.id, {
      syncedAtByBarcode,
      userPricesByBarcode,
      substitutesByKey,
    });
    const pricedItemCount = countPricedItems(lines);
    const substitutedItemCount = countSubstitutedLines(lines);
    const total = sumCartTotal(lines);
    const isComplete = pricedItemCount === items.length && items.length > 0;

    for (const item of items) {
      const precios = pricesByBarcode[item.barcode] ?? {};
      const price = readPriceForSupermarket(precios, market.id, 0);
      logPriceAudit('CompareQuote', {
        supermarketId: market.id,
        barcode: item.barcode,
        price: price > 0 ? price : null,
      });
    }

    return {
      supermarketId: market.id,
      name: market.name,
      total,
      pricedItemCount,
      totalItems: items.length,
      isComplete,
      substitutedItemCount,
      savingsVsMax: 0,
      lastSyncedAt: resolveQuoteSyncTimestamp(
        market.id,
        items,
        pricesByBarcode,
        syncedAtByBarcode,
        syncStatusBySuper
      ),
      dailyReportDate: syncStatusBySuper[market.id]?.dailyReportDate ?? null,
      isFairComparable: isComplete && total > 0,
      coverageRatio: items.length > 0 ? pricedItemCount / items.length : 0,
    };
  });

  // Solo supers con TODOS los productos (exacto o similar). Sin huecos = comparación fiable.
  const fairQuotes = allQuotes.filter((q) => q.isFairComparable);
  const hasCompleteQuotes = fairQuotes.length > 0;
  const hasComparableQuotes = fairQuotes.length >= 2;

  const maxTotal =
    fairQuotes.length > 0 ? Math.max(...fairQuotes.map((q) => q.total)) : 0;

  const quotes = fairQuotes
    .map((quote) => ({
      ...quote,
      savingsVsMax: maxTotal > quote.total ? maxTotal - quote.total : 0,
    }))
    .sort(sortQuotesForDisplay);

  const winner = quotes.length > 0 ? quotes[0] : null;

  return {
    quotes,
    winner,
    maxTotal,
    winnerSavings: winner?.savingsVsMax ?? 0,
    hasComparableQuotes,
    hasCompleteQuotes,
  };
}

/** Precio del último producto escaneado en cada super (para comparación puntual). */
export function computeScannedProductQuotes(
  barcode: string,
  quantity: number,
  pricesByBarcode: Record<string, Record<string, number>>,
  syncedAtByBarcode: Record<string, Record<string, string>> = {},
  supermarkets = MOCK_SUPERMARKETS,
  userPricesByBarcode: Record<string, UserPriceRecord> = {},
  cartStoredPrice = 0
): ScannedProductQuote[] {
  return supermarkets
    .map((market) => {
      const catalogPrice = readPriceForSupermarket(
        pricesByBarcode[barcode] ?? {},
        market.id,
        0
      );
      const unitPrice = resolveEffectiveUnitPriceForItem({
        barcode,
        supermarketId: market.id,
        pricesByBarcode,
        syncedAtByBarcode,
        userPricesByBarcode,
        catalogPrice,
        cartStoredPrice,
      });

      return {
        supermarketId: market.id,
        name: market.name,
        unitPrice,
        lineTotal: unitPrice * quantity,
      };
    })
    .filter((quote) => quote.unitPrice > 0)
    .sort((a, b) => a.unitPrice - b.unitPrice);
}
