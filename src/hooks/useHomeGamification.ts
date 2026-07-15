import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import { getAppSetting } from '@/db/database';
import { getFavoriteSupermarketId } from '@/services/favoriteSupermarket';
import {
  fetchWeeklyRankingSnapshot,
  type WeeklyRankingSnapshot,
} from '@/services/supermarketRanking';

export interface LiveSavingsTicker {
  supermarketId: string;
  supermarketName: string;
  zoneLabel: string;
  count: number;
}

function estimateTodaySavers(weeklyCount: number, supermarketId: string): number {
  const daySeed = new Date().getDate() + supermarketId.length * 7;
  const base = Math.max(weeklyCount * 9, 120);
  const jitter = (daySeed % 90) + 40;
  return base + jitter;
}

function resolveHotSupermarketIds(counts: Record<string, number>): string[] {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => id);
}

export function useHomeGamification() {
  const [loading, setLoading] = useState(true);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [hotIds, setHotIds] = useState<string[]>([]);
  const [liveTicker, setLiveTicker] = useState<LiveSavingsTicker | null>(null);
  const tickerValue = useRef(0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const zone = await getAppSetting('selected_zone');
      const [favorite, snapshot] = await Promise.all([
        getFavoriteSupermarketId(),
        fetchWeeklyRankingSnapshot(zone),
      ]);

      setFavoriteId(favorite);

      const counts = snapshot?.counts ?? {};
      setHotIds(resolveHotSupermarketIds(counts));

      const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (topEntry) {
        const [supermarketId, weeklyCount] = topEntry;
        const supermarketName =
          MOCK_SUPERMARKETS.find((m) => m.id === supermarketId)?.name ?? supermarketId;
        const count = estimateTodaySavers(weeklyCount, supermarketId);
        tickerValue.current = count;
        setLiveTicker({
          supermarketId,
          supermarketName,
          zoneLabel: snapshot?.zoneLabel ?? 'Rosario',
          count,
        });
      } else {
        const fallback = MOCK_SUPERMARKETS[2];
        const count = estimateTodaySavers(12, fallback.id);
        tickerValue.current = count;
        setLiveTicker({
          supermarketId: fallback.id,
          supermarketName: fallback.name,
          zoneLabel: 'Rosario',
          count,
        });
        setHotIds([fallback.id]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  useEffect(() => {
    if (!liveTicker || loading) return;

    const interval = setInterval(() => {
      const delta = Math.random() > 0.55 ? 1 : 0;
      if (delta === 0) return;

      tickerValue.current += delta;
      setLiveTicker((current) =>
        current ? { ...current, count: tickerValue.current } : current
      );
    }, 4200);

    return () => clearInterval(interval);
  }, [liveTicker?.supermarketId, loading]);

  return {
    loading,
    favoriteId,
    hotIds,
    liveTicker,
    reload,
  };
}
