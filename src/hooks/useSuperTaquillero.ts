import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getAppSetting } from '@/db/database';
import { fetchHomeAppManifest } from '@/services/homeBackgroundManager';
import {
  fetchWeeklyTopSupermarket,
  type TopSupermarketResult,
} from '@/services/supermarketRanking';
import {
  resolveTaquilleroSponsor,
  type ResolvedTaquilleroSponsor,
} from '@/services/taquilleroSponsor';

export function useSuperTaquillero() {
  const [sponsor, setSponsor] = useState<ResolvedTaquilleroSponsor | null>(null);
  const [top, setTop] = useState<TopSupermarketResult | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const zone = await getAppSetting('selected_zone');
      const [{ manifest }, rankingTop] = await Promise.all([
        fetchHomeAppManifest({ forceRefresh: false }),
        fetchWeeklyTopSupermarket(zone),
      ]);

      setSponsor(resolveTaquilleroSponsor(zone, manifest));
      setTop(rankingTop);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return { sponsor, top, loading, reload };
}
