import { useState } from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { useRouter } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';

import { SupermarketGridButton } from '@/components/home/SupermarketGridButton';
import { HomeHeroHeading } from '@/components/home/HomeHeroHeading';
import { SuperTaquilleroWidget } from '@/components/home/SuperTaquilleroWidget';

import { HomeCyberTopBanner } from '@/components/home/HomeCyberTopBanner';

import { HomeDrawer } from '@/components/home/HomeDrawer';

import { HomeTexturedBackground } from '@/components/home/HomeTexturedBackground';

import { useCartStore } from '@/store/cartStore';
import { logSupermarketClick } from '@/services/analytics';
import { withNavFeedback } from '@/utils/withNavFeedback';

import type { Supermarket } from '@/types';

import { homeColors } from '@/theme/home';

import { spacing } from '@/theme';
import {
  MENU_CONTENT_PADDING_H,
  MENU_HEADER_MARGIN_TOP,
} from '@/theme/menuContentStyles';

import {
  getHomeGridMetrics,
  getHomeGridRows,
} from '@/components/home/homeGridLayout';

export default function SupermarketSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setSupermarket = useCartStore((s) => s.setSupermarket);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { width: screenWidth } = useWindowDimensions();
  const { gridWidth, orbSize, slotOrbSize, colGap, rowGap } = getHomeGridMetrics(screenWidth);
  const gridRows = getHomeGridRows(MOCK_SUPERMARKETS);
  const onSelect = async (market: Supermarket) => {
    void logSupermarketClick(market.id, market.name, 'grid');
    await setSupermarket(market.id, market.name);
    router.push({
      pathname: '/cart',
      params: { supermarketId: market.id, name: market.name },
    });
  };

  return (
    <HomeTexturedBackground paddingTop={insets.top}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir menú"
          onPress={withNavFeedback(() => setDrawerOpen(true))}
          style={({ pressed }) => [styles.menuBtn, pressed && styles.menuPressed]}
        >
          <Ionicons name="menu" size={26} color={homeColors.menuIcon} />
        </Pressable>
        <HomeCyberTopBanner />
      </View>

      <View style={styles.mainContent}>
        <View style={styles.headingZone}>
          <HomeHeroHeading />
          <SuperTaquilleroWidget />
        </View>

        <View style={styles.gridZone}>
          <View style={[styles.grid, { width: gridWidth, rowGap }]}>
            {gridRows.map((row, rowIndex) => (
              <View
                key={`row-${rowIndex}`}
                style={[styles.gridRow, { columnGap: colGap }]}
              >
                {row.map((market) => (
                  <SupermarketGridButton
                    key={market.id}
                    market={market}
                    orbSize={orbSize}
                    slotOrbSize={slotOrbSize}
                    onPress={() => void onSelect(market)}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
        <Text style={styles.footerLegal} accessibilityRole="text">
          Lista Fácil es un producto de GR Producciones. Todos los derechos reservados ©️ 2026
        </Text>
      </View>

      <HomeDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </HomeTexturedBackground>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MENU_CONTENT_PADDING_H,
    paddingTop: MENU_HEADER_MARGIN_TOP,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
    minHeight: 100,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: homeColors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: homeColors.border,
  },
  menuPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: MENU_CONTENT_PADDING_H,
  },
  headingZone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  gridZone: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    overflow: 'visible',
  },
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
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  footerLegal: {
    fontSize: 6,
    lineHeight: 9,
    textAlign: 'center',
    color: 'rgba(140, 180, 217, 0.72)',
  },
});
