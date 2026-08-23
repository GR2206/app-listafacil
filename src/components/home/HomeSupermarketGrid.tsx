import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { getSupermarketsForZone } from '@/utils/supermarketCoverage';
import { SupermarketGridButton } from '@/components/home/SupermarketGridButton';
import { ShimmerBlock } from '@/components/ui/ShimmerBlock';
import { getHomeGridRows, HOME_GRID_COLS } from '@/components/home/homeGridLayout';
import { getOrbVisualPreset } from '@/components/home/supermarketOrbVisualPresets';
import { getAppSetting } from '@/db/database';
import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import type { Supermarket } from '@/types';

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
  const slot = cellWidth(size);
  return (
    <View style={[styles.skeletonSlot, { width: slot, height: slot }]}>
      <ShimmerBlock style={{ width: size, height: size, borderRadius: size / 2 }} />
    </View>
  );
}

/** Ancho de celda = slot del botón (footprint + padding del preset). */
function cellWidth(slotOrbSize: number) {
  const slotPadding = getOrbVisualPreset('current').grid.slotPadding;
  return slotOrbSize + slotPadding * 2;
}

/**
 * Fila de hasta 3 orbes.
 * Completa: 3 columnas fijas (márgenes = extremos de esa fila).
 * Incompleta (1 o 2): centrada en el mismo ancho — 1 queda bajo el del medio.
 */
function GridRow({
  children,
  colGap,
  slotOrbSize,
  count,
}: {
  children: ReactNode;
  colGap: number;
  slotOrbSize: number;
  count: number;
}) {
  const cell = cellWidth(slotOrbSize);
  const fullRowWidth = cell * HOME_GRID_COLS + colGap * (HOME_GRID_COLS - 1);

  return (
    <View
      style={[
        styles.gridRow,
        count < HOME_GRID_COLS ? styles.partialRow : null,
        { width: fullRowWidth, columnGap: colGap },
      ]}
    >
      {children}
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
  const rows = useMemo(() => getHomeGridRows(markets), [markets]);

  if (loading) {
    return (
      <View style={[styles.grid, { width: gridWidth, rowGap }]}>
        {rows.map((row, rowIndex) => (
          <GridRow
            key={`sk-row-${rowIndex}`}
            colGap={colGap}
            slotOrbSize={slotOrbSize}
            count={row.length}
          >
            {row.map((market) => (
              <OrbSkeleton key={market.id} size={slotOrbSize} />
            ))}
          </GridRow>
        ))}
      </View>
    );
  }

  let entranceIndex = 0;

  return (
    <View style={[styles.grid, { width: gridWidth, rowGap }]}>
      {rows.map((row, rowIndex) => (
        <GridRow
          key={`row-${rowIndex}`}
          colGap={colGap}
          slotOrbSize={slotOrbSize}
          count={row.length}
        >
          {row.map((market) => {
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
          })}
        </GridRow>
      ))}
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    overflow: 'visible',
  },
  partialRow: {
    justifyContent: 'center',
  },
  skeletonSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
