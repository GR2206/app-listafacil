import { useMemo } from 'react';

import {
  computeSmartSavings,
  type SmartSavingsResult,
} from '@/services/smartSavingsEngine';
import type { UserPriceRecord } from '@/db/userPrices';
import type { SupermarketSyncStatus } from '@/services/syncStatus';
import type { CartLine, Supermarket } from '@/types';
import { getSupermarketsForZone } from '@/utils/supermarketCoverage';
import { useSelectedZone } from '@/hooks/useSelectedZone';
import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';

interface UseSmartSavingsOptions {
  items: CartLine[];
  pricesByBarcode: Record<string, Record<string, number>>;
  syncedAtByBarcode?: Record<string, Record<string, string>>;
  userPricesByBarcode?: Record<string, UserPriceRecord>;
  syncStatusBySuper?: Record<string, SupermarketSyncStatus>;
  /** Super actual del carrito: siempre entra en la comparación. */
  currentSupermarketId?: string | null;
}

function marketsForComparison(
  zoneSetting: string | null,
  currentSupermarketId?: string | null
): Supermarket[] {
  const zoneMarkets = getSupermarketsForZone(zoneSetting);
  if (!currentSupermarketId) return zoneMarkets;

  if (zoneMarkets.some((m) => m.id === currentSupermarketId)) {
    return zoneMarkets;
  }

  const current = MOCK_SUPERMARKETS.find((m) => m.id === currentSupermarketId);
  if (!current) return zoneMarkets;
  return [current, ...zoneMarkets];
}

export function useSmartSavings({
  items,
  pricesByBarcode,
  syncedAtByBarcode = {},
  userPricesByBarcode = {},
  syncStatusBySuper = {},
  currentSupermarketId = null,
}: UseSmartSavingsOptions): SmartSavingsResult {
  const zone = useSelectedZone();

  const markets = useMemo(
    () => marketsForComparison(zone, currentSupermarketId),
    [zone, currentSupermarketId]
  );

  return useMemo(
    () =>
      computeSmartSavings(
        items,
        pricesByBarcode,
        syncedAtByBarcode,
        markets,
        syncStatusBySuper,
        userPricesByBarcode
      ),
    [
      items,
      pricesByBarcode,
      syncedAtByBarcode,
      userPricesByBarcode,
      syncStatusBySuper,
      markets,
    ]
  );
}

export { marketsForComparison };
