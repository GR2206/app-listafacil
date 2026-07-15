import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { getSupermarketsForZone } from '@/utils/supermarketCoverage';
import { SupermarketGridButton } from '@/components/home/SupermarketGridButton';
import { ShimmerBlock } from '@/components/ui/ShimmerBlock';
import { splitHomeGridMarkets } from '@/components/home/homeGridLayout';
import { getAppSetting } from '@/db/database';
import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import type { Supermarket } from '@/types';
import { spacing } from '@/theme';

interface HomeSupermarketGridProps {
  loading: boolean;
  orbSize: number;
  slotOrbSize: number;
  gridWidth: number;
  colGap: number;
  rowGap: number;
  hotIds: string[];
  favoriteId: string | null;
  onSelect: (market: Supermarket) => void;
}

function OrbSkeleton({ size }: { size: number }) {
  return (
    <View style={[styles.skeletonSlot, { width: size + 12, height: size + 12 }]}>
      <ShimmerBlock style={{ width: size, height: size, borderRadius: size / 2 }} />
    </View>
  );
}

export function HomeSupermarketGrid({
  loading,
  orbSize,
  slotOrbSize,
  gridWidth,
  colGap,
  rowGap,
  hotIds,
  favoriteId,
  onSelect,
}: HomeSupermarketGridProps) {
  const [zone, setZone] = useState<string | null>(null);

  const refreshZone = useCallback(() => {
    void getAppSetting(SELECTED_ZONE_SETTING_KEY).then(setZone);
  }, []);

  useEffect(() => {
    refreshZone();
  }, [refreshZone]);

  useFocusEffect(
    useCallback(() => {
      refreshZone();
    }, [refreshZone])
  );

  const markets = useMemo(() => getSupermarketsForZone(zone), [zone]);

  const { primaryRows, extraMarkets } = splitHomeGridMarkets(markets);

  if (loading) {
    return (
      <View style={[styles.grid, { width: gridWidth, rowGap }]}>
        {primaryRows.map((row, rowIndex) => (
          <View key={`sk-row-${rowIndex}`} style={[styles.gridRow, { columnGap: colGap }]}>
            {row.map((market) => (
              <OrbSkeleton key={market.id} size={slotOrbSize} />
            ))}
          </View>
        ))}
        {extraMarkets.length > 0 ? (
          <View style={[styles.gridRow, styles.extraGridRow, { columnGap: colGap }]}>
            {extraMarkets.map((market) => (
              <OrbSkeleton key={market.id} size={slotOrbSize} />
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  let entranceIndex = 0;

  const renderButton = (market: Supermarket) => {
    const index = entranceIndex;
    entranceIndex += 1;

    return (
      <SupermarketGridButton
        key={market.id}
        market={market}
        orbSize={orbSize}
        slotOrbSize={slotOrbSize}
        entranceIndex={index}
        isHot={hotIds.includes(market.id)}
        isFavorite={favoriteId === market.id}
        onPress={() => onSelect(market)}
      />
    );
  };

  return (
    <View style={[styles.grid, { width: gridWidth, rowGap }]}>
      {primaryRows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={[styles.gridRow, { columnGap: colGap }]}>
          {row.map((market) => renderButton(market))}
        </View>
      ))}

      {extraMarkets.length > 0 ? (
        <View style={[styles.gridRow, styles.extraGridRow, { columnGap: colGap }]}>
          {extraMarkets.map((market) => renderButton(market))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'visible',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    overflow: 'visible',
  },
  extraGridRow: {
    marginTop: spacing.xs,
  },
  skeletonSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
