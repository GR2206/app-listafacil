import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { SuperTaquilleroWidget } from '@/components/home/SuperTaquilleroWidget';
import { HomeHeroHeading } from '@/components/home/HomeHeroHeading';
import { HomeSupermarketGrid } from '@/components/home/HomeSupermarketGrid';
import { HomeCatalogCarousel } from '@/components/home/HomeCatalogCarousel';
import { HomeCyberTopBanner } from '@/components/home/HomeCyberTopBanner';
import { HomeDrawer } from '@/components/home/HomeDrawer';
import { HomeTexturedBackground } from '@/components/home/HomeTexturedBackground';
import { FinanzasModule } from '@/components/home/FinanzasModule';
import { useCartStore } from '@/store/cartStore';
import { useHomeGamification } from '@/hooks/useHomeGamification';
import { logSupermarketClick } from '@/services/analytics';
import { recordSupermarketVisit } from '@/services/favoriteSupermarket';
import { withNavFeedback } from '@/utils/withNavFeedback';
import type { Supermarket } from '@/types';
import { homeColors } from '@/theme/home';
import { finanzasColors } from '@/theme/finanzas';
import { spacing } from '@/theme';
import {
  MENU_CONTENT_PADDING_H,
  MENU_HEADER_MARGIN_TOP,
} from '@/theme/menuContentStyles';
import { getHomeGridMetrics } from '@/components/home/homeGridLayout';

export default function SupermarketSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setSupermarket = useCartStore((s) => s.setSupermarket);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const { loading, favoriteId, hotIds, liveTicker } = useHomeGamification();
  const pagerRef = useRef<ScrollView>(null);

  const { width: screenWidth } = useWindowDimensions();
  const { gridWidth, orbSize, slotOrbSize, colGap, rowGap } = getHomeGridMetrics(screenWidth);
  const footerPad = Math.max(insets.bottom, spacing.xs) + spacing.lg;

  const goToFinanzas = useCallback(() => {
    pagerRef.current?.scrollTo({ x: screenWidth, animated: true });
    setPageIndex(1);
  }, [screenWidth]);

  const goToHome = useCallback(() => {
    pagerRef.current?.scrollTo({ x: 0, animated: true });
    setPageIndex(0);
  }, []);

  const onSelect = async (market: Supermarket) => {
    void logSupermarketClick(market.id, market.name, 'grid');
    void recordSupermarketVisit(market.id);
    await setSupermarket(market.id, market.name);
    router.push({
      pathname: '/cart',
      params: { supermarketId: market.id, name: market.name },
    });
  };

  const onPagerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / Math.max(screenWidth, 1));
    setPageIndex(Math.min(1, Math.max(0, next)));
  };

  const pageH = pagerHeight > 0 ? pagerHeight : undefined;

  return (
    <View style={styles.root} onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}>
      <StatusBar style={pageIndex === 1 ? 'dark' : 'light'} />
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        bounces
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPagerScrollEnd}
        nestedScrollEnabled
        style={styles.pager}
        contentContainerStyle={pageH ? { height: pageH } : undefined}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: screenWidth, height: pageH }}>
          <HomeTexturedBackground paddingTop={insets.top} parallaxEnabled={pageIndex === 0}>
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

            <HomeCatalogCarousel />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ir al módulo de finanzas"
              onPress={withNavFeedback(goToFinanzas)}
              style={({ pressed }) => [styles.swipeHint, pressed && styles.menuPressed]}
            >
              <Text style={styles.swipeHintText}>Finanzas</Text>
              <Ionicons name="chevron-forward" size={14} color={finanzasColors.accentSoft} />
            </Pressable>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPad }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              <View style={styles.headingZone}>
                <HomeHeroHeading />
                <SuperTaquilleroWidget gamificationLoading={loading} liveTicker={liveTicker} />
              </View>

              <View style={styles.gridZone}>
                <HomeSupermarketGrid
                  loading={loading}
                  orbSize={orbSize}
                  slotOrbSize={slotOrbSize}
                  gridWidth={gridWidth}
                  colGap={colGap}
                  rowGap={rowGap}
                  hotIds={hotIds}
                  favoriteId={favoriteId}
                  onSelect={(market) => void onSelect(market)}
                />
              </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
              <Text style={styles.footerLegal} accessibilityRole="text">
                Lista Fácil es un producto de GR Producciones. Todos los derechos reservados ©️ 2026
              </Text>
            </View>
          </HomeTexturedBackground>
        </View>

        <View style={{ width: screenWidth, height: pageH }}>
          <FinanzasModule width={screenWidth} showBackButton onBack={goToHome} />
        </View>
      </ScrollView>

      <View
        pointerEvents="none"
        style={[styles.dots, { bottom: Math.max(insets.bottom, 10) + 14 }]}
      >
        <View style={[styles.dot, pageIndex === 0 && styles.dotActiveHome]} />
        <View style={[styles.dot, pageIndex === 1 && styles.dotActiveFinanzas]} />
      </View>

      <HomeDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: homeColors.background,
  },
  pager: {
    flex: 1,
  },
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
  swipeHint: {
    alignSelf: 'flex-end',
    marginRight: MENU_CONTENT_PADDING_H,
    marginTop: 2,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 122, 90, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 235, 217, 0.3)',
  },
  swipeHintText: {
    color: '#C8EBD9',
    fontSize: 11,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: MENU_CONTENT_PADDING_H,
  },
  headingZone: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    minHeight: 168,
  },
  gridZone: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
  dots: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  dotActiveHome: {
    backgroundColor: homeColors.neonBlue,
    width: 18,
  },
  dotActiveFinanzas: {
    backgroundColor: finanzasColors.accent,
    width: 18,
  },
});
