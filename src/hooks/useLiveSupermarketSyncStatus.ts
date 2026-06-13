import { useCallback, useState } from 'react';

import { useFocusEffect } from 'expo-router';

import {
  fetchSupermarketSyncStatus,
  subscribeSupermarketSyncStatus,
  type SupermarketSyncStatus,
} from '@/services/syncStatus';

const POLL_INTERVAL_MS = 2 * 60 * 1000;

const EMPTY_STATUS = (supermarketId: string): SupermarketSyncStatus => ({
  supermarketId,
  lastUpdatedTimestamp: null,
  dailyReportDate: null,
});

export function useLiveSupermarketSyncStatus(supermarketId: string) {
  const [status, setStatus] = useState<SupermarketSyncStatus>(() =>
    EMPTY_STATUS(supermarketId)
  );
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);

      const applyStatus = (next: SupermarketSyncStatus) => {
        if (cancelled) return;
        setStatus(next);
        setLoading(false);
      };

      void fetchSupermarketSyncStatus(supermarketId).then(applyStatus);

      const unsubscribe = subscribeSupermarketSyncStatus(supermarketId, applyStatus);

      const pollTimer = setInterval(() => {
        void fetchSupermarketSyncStatus(supermarketId).then(applyStatus);
      }, POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        unsubscribe();
        clearInterval(pollTimer);
      };
    }, [supermarketId])
  );

  return {
    lastUpdatedTimestamp: status.lastUpdatedTimestamp,
    dailyReportDate: status.dailyReportDate,
    loading,
  };
}
