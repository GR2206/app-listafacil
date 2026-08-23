import { useCallback, useEffect, useMemo, useState } from 'react';

import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';



import { MenuScreenLayout } from '@/components/home/MenuScreenLayout';
import { AppBackground } from '@/components/layout/AppBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MerchantHeroCard } from '@/components/merchant/MerchantHeroCard';

import { MerchantStatCard } from '@/components/merchant/MerchantStatCard';

import { TopProductsChart } from '@/components/merchant/TopProductsChart';

import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';

import { IS_MERCHANT_MODE } from '@/config/merchant';

import {

  loadMerchantDashboardStats,

  type MerchantDashboardStats,

} from '@/services/merchantAnalytics';

import { useMerchantAuthStore } from '@/store/merchantAuthStore';

import { SUPERMARKET_NEON_COLORS } from '@/components/home/supermarketOrbTheme';

import { homeColors } from '@/theme/home';

import { radii } from '@/theme';
import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';
import type { ScaledMenuMetrics } from '@/theme/scaledMenuMetrics';



const EMPTY_STATS: MerchantDashboardStats = {
  uniquePriceVisitors: 0,
  uniqueSuperEntries: 0,
  mapsClicks: 0,
  bestPriceWins: 0,
  weeklyPeak: {
    uniquePriceVisitors: 0,
    uniqueSuperEntries: 0,
    mapsClicks: 0,
    bestPriceWins: 0,
  },
  topProducts: [],
};



function createComercianteStyles(m: ScaledMenuMetrics, sectionGap: number) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readOnlyBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(148, 163, 184, 0.16)',
      borderRadius: radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: m.spacingMd,
    },
    readOnlyText: {
      fontSize: Math.max(9, m.caption - 4),
      fontWeight: '700',
      color: homeColors.textMuted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    dashboardIntro: {
      marginBottom: sectionGap,
    },
    dashboardSubtitle: {
      fontSize: m.body,
      fontWeight: '700',
      color: homeColors.text,
    },
    sectionHeadingOnly: {
      marginBottom: sectionGap,
      paddingVertical: m.spacingSm,
    },
    sectionLabel: {
      fontSize: m.caption,
      fontWeight: '800',
      color: homeColors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    marketRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: m.spacingLg,
    },
    marketChip: {
      borderWidth: 1,
      borderColor: homeColors.border,
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: homeColors.panel,
    },
    marketChipText: {
      fontSize: Math.max(9, m.caption - 3),
      fontWeight: '600',
      color: homeColors.textMuted,
    },
    footerNote: {
      fontSize: m.caption,
      color: homeColors.textMuted,
      lineHeight: Math.round(m.caption * 1.25),
    },
    logoutBtn: {
      alignSelf: 'center',
      marginTop: m.spacingLg,
      paddingVertical: 10,
      paddingHorizontal: m.spacingMd,
    },
    logoutText: {
      fontSize: m.caption,
      fontWeight: '700',
      color: homeColors.textMuted,
    },
  });
}

export default function ComercianteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { styles: menuContentStyles, m, MENU_SECTION_GAP } = useMenuContentStyles();
  const styles = useMemo(
    () => createComercianteStyles(m, MENU_SECTION_GAP),
    [m, MENU_SECTION_GAP]
  );

  const isHydrated = useMerchantAuthStore((s) => s.isHydrated);

  const canAccess = useMerchantAuthStore((s) => s.canAccessMerchantPanel);

  const logout = useMerchantAuthStore((s) => s.logout);



  const [selectedMarketId, setSelectedMarketId] = useState(MOCK_SUPERMARKETS[0].id);

  const [stats, setStats] = useState<MerchantDashboardStats>(EMPTY_STATS);



  useEffect(() => {

    if (isHydrated && !canAccess) {

      router.replace('/');

    }

  }, [isHydrated, canAccess, router]);



  const reload = useCallback(async () => {

    const next = await loadMerchantDashboardStats(selectedMarketId);

    setStats(next);

  }, [selectedMarketId]);



  useEffect(() => {

    if (!canAccess) return;

    void reload();

  }, [canAccess, reload]);



  useFocusEffect(

    useCallback(() => {

      if (!canAccess) return;

      void reload();

    }, [canAccess, reload])

  );



  if (!isHydrated) {

    return (
      <AppBackground paddingTop={insets.top}>
        <View style={styles.loading}>
          <ActivityIndicator color={homeColors.logoRing} />
        </View>
      </AppBackground>
    );

  }



  if (!canAccess) {

    return null;

  }



  const selectedMarket = MOCK_SUPERMARKETS.find((m) => m.id === selectedMarketId);



  const barMax = Math.max(
    stats.uniqueSuperEntries,
    stats.uniquePriceVisitors,
    stats.mapsClicks,
    stats.bestPriceWins,
    stats.weeklyPeak.uniqueSuperEntries,
    stats.weeklyPeak.uniquePriceVisitors,
    stats.weeklyPeak.mapsClicks,
    stats.weeklyPeak.bestPriceWins,
    10
  );



  const topProductViews = stats.topProducts.reduce((sum, p) => sum + p.views, 0);

  const heroBarMax = Math.max(stats.mapsClicks, topProductViews, barMax);



  return (

    <MenuScreenLayout title="Dashboard">

      <View style={styles.readOnlyBadge}>

        <Text style={styles.readOnlyText}>Solo lectura</Text>

      </View>



      <View style={[menuContentStyles.panel, styles.dashboardIntro]}>
        <Text style={styles.dashboardSubtitle}>
          Global · todas las regiones · {selectedMarket?.name ?? 'Comercio'}
        </Text>
      </View>



      <View style={styles.marketRow}>

        {MOCK_SUPERMARKETS.map((market) => {

          const active = market.id === selectedMarketId;

          const color = SUPERMARKET_NEON_COLORS[market.id] ?? homeColors.logoRing;



          return (

            <Pressable

              key={market.id}

              onPress={() => setSelectedMarketId(market.id)}

              style={[

                styles.marketChip,

                active && { borderColor: color, backgroundColor: `${color}22` },

              ]}

            >

              <Text style={[styles.marketChipText, active && { color: homeColors.text }]}>

                {market.name}

              </Text>

            </Pressable>

          );

        })}

      </View>



      <MerchantHeroCard
        label="Entradas al súper"
        value={stats.uniqueSuperEntries}
        barMax={Math.max(stats.uniqueSuperEntries, heroBarMax)}
        color="#F0C419"
        subtitle="Usuarios únicos que abrieron este súper (cualquier ciudad)"
      />

      <View style={menuContentStyles.sectionPanel}>
        <Text style={styles.sectionLabel}>Compará tu rendimiento</Text>
      </View>

      <MerchantStatCard
        title="Entradas al súper (hoy)"
        value={stats.uniqueSuperEntries}
        barMax={barMax}
        color="#F0C419"
        hint={`Pico semanal: ${stats.weeklyPeak.uniqueSuperEntries}`}
      />

      <MerchantStatCard
        title="Usuarios únicos que vieron precios"
        value={stats.uniquePriceVisitors}
        barMax={barMax}
        color="#3B9BFF"
        hint={`Pico semanal: ${stats.weeklyPeak.uniquePriceVisitors}`}
      />



      <MerchantStatCard

        title="Clics hacia la ubicación (Google Maps)"

        value={stats.mapsClicks}

        barMax={barMax}

        color="#00E676"

        hint={`Pico semanal: ${stats.weeklyPeak.mapsClicks}`}

      />



      <MerchantStatCard

        title="Veces elegido como mejor precio"

        value={stats.bestPriceWins}

        barMax={barMax}

        color="#FF8C1A"

        hint={`Pico semanal: ${stats.weeklyPeak.bestPriceWins}`}

      />



      <View style={[menuContentStyles.sectionPanel, styles.sectionHeadingOnly]}>
        <Text style={styles.sectionLabel}>Productos más vistos</Text>
      </View>

      <TopProductsChart products={stats.topProducts} />

      <View style={menuContentStyles.panel}>
        <Text style={styles.footerNote}>
          Métricas agregadas de todos los usuarios de la app. Se actualizan cuando comparan listas y abren mapas.
        </Text>
      </View>



      {!IS_MERCHANT_MODE ? (

        <Pressable

          style={styles.logoutBtn}

          onPress={() => void logout().then(() => router.replace('/'))}

        >

          <Text style={styles.logoutText}>Cerrar sesión</Text>

        </Pressable>

      ) : null}

    </MenuScreenLayout>

  );

}





