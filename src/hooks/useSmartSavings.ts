import { useMemo } from 'react';

import {
  computeSmartSavings,
  type SmartSavingsResult,
} from '@/services/smartSavingsEngine';
import type { UserPriceRecord } from '@/db/userPrices';
import type { SupermarketSyncStatus } from '@/services/syncStatus';
import type { CartLine } from '@/types';

interface UseSmartSavingsOptions {
  items: CartLine[];
  pricesByBarcode: Record<string, Record<string, number>>;
  syncedAtByBarcode?: Record<string, Record<string, string>>;
  userPricesByBarcode?: Record<string, UserPriceRecord>;
  syncStatusBySuper?: Record<string, SupermarketSyncStatus>;
}

export function useSmartSavings({
  items,
  pricesByBarcode,
  syncedAtByBarcode = {},
  userPricesByBarcode = {},
  syncStatusBySuper = {},
}: UseSmartSavingsOptions): SmartSavingsResult {
  return useMemo(
    () =>
      computeSmartSavings(
        items,
        pricesByBarcode,
        syncedAtByBarcode,
        undefined,
        syncStatusBySuper,
        userPricesByBarcode
      ),
    [items, pricesByBarcode, syncedAtByBarcode, userPricesByBarcode, syncStatusBySuper]
  );
}
