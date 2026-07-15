import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getProductPriceMetaMaps } from '@/db/database';
import { getUserPricesMap, type UserPriceRecord } from '@/db/userPrices';
import { refreshCartPricesFromFirestore } from '@/services/refreshCartPrices';
import { useCartStore } from '@/store/cartStore';
import { isManualCartLine } from '@/utils/manualProduct';
import {
  countUnpricedLines,
  resolveCartLinesForSupermarket,
  sumCartTotal,
} from '@/utils/resolveCartLines';
import type { CartLine } from '@/types';

interface UseCartListForSupermarketOptions {
  supermarketId: string;
  supermarketName?: string;
}

interface UseCartListForSupermarketResult {
  items: CartLine[];
  displayItems: CartLine[];
  total: number;
  pricesByBarcode: Record<string, Record<string, number>>;
  syncedAtByBarcode: Record<string, Record<string, string>>;
  userPricesByBarcode: Record<string, UserPriceRecord>;
  unpricedCount: number;
  isResolvingPrices: boolean;
  isForceRefreshing: boolean;
  reload: () => Promise<void>;
  forceRefreshPrices: () => Promise<void>;
  refreshUserPrices: () => Promise<void>;
}

export function useCartListForSupermarket({
  supermarketId,
  supermarketName = 'Supermercado',
}: UseCartListForSupermarketOptions): UseCartListForSupermarketResult {
  const storeItems = useCartStore((s) => s.items);
  const storeMarketId = useCartStore((s) => s.supermarketId);
  const setSupermarket = useCartStore((s) => s.setSupermarket);

  const [pricesByBarcode, setPricesByBarcode] = useState<
    Record<string, Record<string, number>>
  >({});
  const [syncedAtByBarcode, setSyncedAtByBarcode] = useState<
    Record<string, Record<string, string>>
  >({});
  const [userPricesByBarcode, setUserPricesByBarcode] = useState<
    Record<string, UserPriceRecord>
  >({});
  const [isResolvingPrices, setIsResolvingPrices] = useState(false);
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const loadRequestIdRef = useRef(0);
  const loadedBarcodeKeyRef = useRef('');

  const catalogBarcodeKey = useMemo(() => {
    const barcodes = [
      ...new Set(
        storeItems
          .filter((item) => !isManualCartLine(item))
          .map((item) => item.barcode)
      ),
    ].sort();
    return barcodes.join('|');
  }, [storeItems]);

  const catalogBarcodes = useMemo(
    () => (catalogBarcodeKey ? catalogBarcodeKey.split('|') : []),
    [catalogBarcodeKey]
  );

  const reload = useCallback(async () => {
    await setSupermarket(supermarketId, supermarketName);
  }, [setSupermarket, supermarketId, supermarketName]);

  const loadPricesForItems = useCallback(async (barcodes: string[]) => {
    const requestId = ++loadRequestIdRef.current;

    if (barcodes.length === 0) {
      setPricesByBarcode({});
      setSyncedAtByBarcode({});
      setUserPricesByBarcode({});
      setIsResolvingPrices(false);
      return;
    }

    setIsResolvingPrices(true);

    try {
      const [metaMaps, userPrices] = await Promise.all([
        getProductPriceMetaMaps(barcodes),
        getUserPricesMap(barcodes, supermarketId),
      ]);

      if (requestId !== loadRequestIdRef.current) return;

      const prices: Record<string, Record<string, number>> = {};
      const syncedAt: Record<string, Record<string, string>> = {};

      for (const [barcode, meta] of Object.entries(metaMaps)) {
        prices[barcode] = meta.prices;
        syncedAt[barcode] = meta.syncedAt;
        console.log('[PriceAudit:LoadPrices]', {
          barcode,
          activeSupermarketId: supermarketId,
          allPrices: meta.prices,
        });
      }

      setPricesByBarcode(prices);
      setSyncedAtByBarcode(syncedAt);
      setUserPricesByBarcode(userPrices);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsResolvingPrices(false);
      }
    }
  }, [supermarketId]);

  const refreshUserPrices = useCallback(async () => {
    if (catalogBarcodes.length === 0) {
      setUserPricesByBarcode({});
      return;
    }

    const userPrices = await getUserPricesMap(catalogBarcodes, supermarketId);
    setUserPricesByBarcode(userPrices);
  }, [catalogBarcodes, supermarketId]);

  const forceRefreshPrices = useCallback(async () => {
    if (storeMarketId !== supermarketId) return;

    if (catalogBarcodes.length === 0) return;

    setIsForceRefreshing(true);
    try {
      await refreshCartPricesFromFirestore(catalogBarcodes, supermarketId);
      await loadPricesForItems(catalogBarcodes);
    } finally {
      setIsForceRefreshing(false);
    }
  }, [
    storeMarketId,
    supermarketId,
    catalogBarcodes,
    loadPricesForItems,
  ]);

  useFocusEffect(
    useCallback(() => {
      // Solo reinstalar sesión si cambiamos de súper; no re-upsertar mocks en cada foco.
      if (storeMarketId !== supermarketId) {
        void reload();
        return;
      }
      void loadPricesForItems(catalogBarcodes);
    }, [
      storeMarketId,
      supermarketId,
      reload,
      loadPricesForItems,
      catalogBarcodes,
    ])
  );

  useEffect(() => {
    if (storeMarketId !== supermarketId) {
      void reload();
    }
  }, [storeMarketId, supermarketId, reload]);

  useEffect(() => {
    loadedBarcodeKeyRef.current = '';
  }, [supermarketId]);

  useEffect(() => {
    if (storeMarketId !== supermarketId) return;
    if (catalogBarcodeKey === loadedBarcodeKeyRef.current) return;

    loadedBarcodeKeyRef.current = catalogBarcodeKey;
    void loadPricesForItems(catalogBarcodes);
  }, [
    catalogBarcodeKey,
    catalogBarcodes,
    supermarketId,
    storeMarketId,
    loadPricesForItems,
  ]);

  const displayItems = useMemo(
    () =>
      storeMarketId === supermarketId
        ? resolveCartLinesForSupermarket(storeItems, pricesByBarcode, supermarketId, {
            syncedAtByBarcode,
            userPricesByBarcode,
          })
        : [],
    [
      storeItems,
      pricesByBarcode,
      syncedAtByBarcode,
      userPricesByBarcode,
      supermarketId,
      storeMarketId,
    ]
  );

  const total = useMemo(() => sumCartTotal(displayItems), [displayItems]);
  const unpricedCount = useMemo(() => countUnpricedLines(displayItems), [displayItems]);

  return {
    items: storeItems,
    displayItems,
    total,
    pricesByBarcode,
    syncedAtByBarcode,
    userPricesByBarcode,
    unpricedCount,
    isResolvingPrices,
    isForceRefreshing,
    reload,
    forceRefreshPrices,
    refreshUserPrices,
  };
}
