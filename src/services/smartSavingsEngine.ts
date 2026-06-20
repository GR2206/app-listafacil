import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import type { UserPriceRecord } from '@/db/userPrices';
import type { SupermarketSyncStatus } from '@/services/syncStatus';
import type { CartLine } from '@/types';
import { logPriceAudit } from '@/utils/priceAuditLog';
import { resolveEffectiveUnitPriceForItem } from '@/utils/resolvePrice';
import { readPriceForSupermarket, readSyncTimeForSupermarket } from '@/utils/supermarketPrices';
import { resolveCartLinesForSupermarket, sumCartTotal } from '@/utils/resolveCartLines';

export interface SupermarketQuote {
  supermarketId: string;
  name: string;
  total: number;
  pricedItemCount: number;
  totalItems: number;
  isComplete: boolean;
  savingsVsMax: number;
  lastSyncedAt: string | null;
  dailyReportDate: string | null;
}

export interface SmartSavingsResult {
  quotes: SupermarketQuote[];
  winner: SupermarketQuote | null;
  maxTotal: number;
  winnerSavings: number;
  hasComparableQuotes: boolean;
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

export function computeSmartSavings(
  items: CartLine[],
  pricesByBarcode: Record<string, Record<string, number>>,
  syncedAtByBarcode: Record<string, Record<string, string>> = {},
  supermarkets = MOCK_SUPERMARKETS,
  syncStatusBySuper: Record<string, SupermarketSyncStatus> = {},
  userPricesByBarcode: Record<string, UserPriceRecord> = {}
): SmartSavingsResult {
  if (items.length === 0) {
    return {
      quotes: [],
      winner: null,
      maxTotal: 0,
      winnerSavings: 0,
      hasComparableQuotes: false,
    };
  }

  const quotes: SupermarketQuote[] = supermarkets.map((market) => {
    const lines = resolveCartLinesForSupermarket(items, pricesByBarcode, market.id, {
      syncedAtByBarcode,
      userPricesByBarcode,
    });
    const pricedItemCount = countPricedItems(lines);
    const total = sumCartTotal(lines);

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
      isComplete: pricedItemCount === items.length && items.length > 0,
      savingsVsMax: 0,
      lastSyncedAt: resolveQuoteSyncTimestamp(
        market.id,
        items,
        pricesByBarcode,
        syncedAtByBarcode,
        syncStatusBySuper
      ),
      dailyReportDate: syncStatusBySuper[market.id]?.dailyReportDate ?? null,
    };
  });

  const comparable = quotes.filter((q) => q.pricedItemCount > 0);

  const maxTotal =
    comparable.length > 0 ? Math.max(...comparable.map((q) => q.total)) : 0;

  const quotesWithSavings = quotes.map((quote) => ({
    ...quote,
    savingsVsMax:
      quote.pricedItemCount > 0 && maxTotal > quote.total ? maxTotal - quote.total : 0,
  }));

  const winner =
    comparable.length > 0
      ? comparable.reduce((best, current) => (current.total < best.total ? current : best))
      : null;

  const winnerQuote = winner
    ? quotesWithSavings.find((q) => q.supermarketId === winner.supermarketId) ?? null
    : null;

  return {
    quotes: quotesWithSavings.sort((a, b) => a.total - b.total),
    winner: winnerQuote,
    maxTotal,
    winnerSavings: winnerQuote?.savingsVsMax ?? 0,
    hasComparableQuotes: comparable.length >= 2,
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
