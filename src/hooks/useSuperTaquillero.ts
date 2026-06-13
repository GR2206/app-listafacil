import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getAppSetting } from '@/db/database';
import {
  fetchWeeklyTopSupermarket,
  type TopSupermarketResult,
} from '@/services/supermarketRanking';

export function useSuperTaquillero() {
  const [top, setTop] = useState<TopSupermarketResult | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const zone = await getAppSetting('selected_zone');
      const result = await fetchWeeklyTopSupermarket(zone);
      setTop(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return { top, loading, reload };
}
