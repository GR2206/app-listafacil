import { useEffect, useState } from 'react';

import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import {
  fetchAllSupermarketSyncStatuses,
  subscribeSupermarketSyncStatus,
  type SupermarketSyncStatus,
} from '@/services/syncStatus';

const POLL_INTERVAL_MS = 2 * 60 * 1000;

export function useSupermarketSyncStatus(): Record<string, SupermarketSyncStatus> {
  const [statusBySuper, setStatusBySuper] = useState<Record<string, SupermarketSyncStatus>>(
    {}
  );

  useEffect(() => {
    let cancelled = false;
    const supermarketIds = MOCK_SUPERMARKETS.map((market) => market.id);

    const applyStatus = (id: string, status: SupermarketSyncStatus) => {
      if (cancelled) return;
      setStatusBySuper((prev) => ({ ...prev, [id]: status }));
    };

    void fetchAllSupermarketSyncStatuses(supermarketIds).then((statuses) => {
      if (!cancelled) setStatusBySuper(statuses);
    });

    const unsubscribers = supermarketIds.map((id) =>
      subscribeSupermarketSyncStatus(id, (status) => applyStatus(id, status))
    );

    const pollTimer = setInterval(() => {
      void fetchAllSupermarketSyncStatuses(supermarketIds).then((statuses) => {
        if (!cancelled) setStatusBySuper(statuses);
      });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      clearInterval(pollTimer);
    };
  }, []);

  return statusBySuper;
}
