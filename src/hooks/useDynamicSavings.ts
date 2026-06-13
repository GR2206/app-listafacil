import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { sessionIdFor } from '@/db/database';
import {
  getAccumulatedSavingsTotal,
  sumLedgerSavings,
  upsertSessionListSavings,
} from '@/services/savingsLedger';

interface UseDynamicSavingsOptions {
  supermarketId: string | null;
  listSavings: number;
}

interface DynamicSavingsState {
  listSavings: number;
  totalSavings: number;
  isLoading: boolean;
}

export function useDynamicSavings({
  supermarketId,
  listSavings,
}: UseDynamicSavingsOptions): DynamicSavingsState {
  const [totalSavings, setTotalSavings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTotal = useCallback(async () => {
    const total = await getAccumulatedSavingsTotal();
    setTotalSavings(total);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshTotal();
    }, [refreshTotal])
  );

  useEffect(() => {
    if (!supermarketId) {
      void refreshTotal();
      return;
    }

    const sessionId = sessionIdFor(supermarketId);
    let cancelled = false;

    void (async () => {
      const ledger = await upsertSessionListSavings(sessionId, listSavings);
      if (!cancelled) {
        setTotalSavings(sumLedgerSavings(ledger));
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supermarketId, listSavings, refreshTotal]);

  return {
    listSavings: Math.max(0, Math.round(listSavings)),
    totalSavings,
    isLoading,
  };
}
