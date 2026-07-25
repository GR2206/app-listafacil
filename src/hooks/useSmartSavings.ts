import { useEffect, useMemo, useRef, useState } from 'react';

import {
  computeSmartSavings,
  type SmartSavingsResult,
} from '@/services/smartSavingsEngine';
import {
  resolveTicketSubstitutes,
  type TicketSubstituteMap,
} from '@/services/similarProductSubstitute';
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

const EMPTY_RESULT: SmartSavingsResult = {
  quotes: [],
  winner: null,
  maxTotal: 0,
  winnerSavings: 0,
  hasComparableQuotes: false,
  hasCompleteQuotes: false,
};

export type UseSmartSavingsResult = SmartSavingsResult & {
  substitutesByKey: TicketSubstituteMap;
};

export function useSmartSavings({
  items,
  pricesByBarcode,
  syncedAtByBarcode = {},
  userPricesByBarcode = {},
  syncStatusBySuper = {},
  currentSupermarketId = null,
}: UseSmartSavingsOptions): UseSmartSavingsResult {
  const zone = useSelectedZone();

  const markets = useMemo(
    () => marketsForComparison(zone, currentSupermarketId),
    [zone, currentSupermarketId]
  );

  const [substitutesByKey, setSubstitutesByKey] = useState<TicketSubstituteMap>({});
  const requestIdRef = useRef(0);

  const marketIds = useMemo(() => markets.map((m) => m.id), [markets]);
  const marketIdsKey = marketIds.join('|');

  const itemsSignature = useMemo(
    () =>
      items
        .map((item) => `${item.barcode}:${item.name}:${item.quantity}`)
        .join('|'),
    [items]
  );

  useEffect(() => {
    if (items.length === 0 || marketIds.length === 0) {
      setSubstitutesByKey({});
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    void (async () => {
      const map = await resolveTicketSubstitutes({
        items,
        supermarketIds: marketIds,
        pricesByBarcode,
        syncedAtByBarcode,
        userPricesByBarcode,
      });

      if (cancelled || requestId !== requestIdRef.current) return;
      setSubstitutesByKey(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    items,
    itemsSignature,
    marketIds,
    marketIdsKey,
    pricesByBarcode,
    syncedAtByBarcode,
    userPricesByBarcode,
  ]);

  return useMemo(() => {
    if (items.length === 0) {
      return { ...EMPTY_RESULT, substitutesByKey: {} };
    }

    return {
      ...computeSmartSavings(
        items,
        pricesByBarcode,
        syncedAtByBarcode,
        markets,
        syncStatusBySuper,
        userPricesByBarcode,
        substitutesByKey
      ),
      substitutesByKey,
    };
  }, [
    items,
    pricesByBarcode,
    syncedAtByBarcode,
    userPricesByBarcode,
    syncStatusBySuper,
    markets,
    substitutesByKey,
  ]);
}

export { marketsForComparison };
