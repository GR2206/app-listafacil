import { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';

import { SupermarketOrbLogo } from '@/components/home/SupermarketOrbLogo';
import { ShimmerBlock } from '@/components/ui/ShimmerBlock';
import { SUPERMARKET_NEON_COLORS } from '@/components/home/supermarketOrbTheme';
import { useSuperTaquillero } from '@/hooks/useSuperTaquillero';
import type { LiveSavingsTicker } from '@/hooks/useHomeGamification';
import { useCartStore } from '@/store/cartStore';
import { logSupermarketClick } from '@/services/analytics';
import { withNavFeedback } from '@/utils/withNavFeedback';
import { homeColors } from '@/theme/home';
import { radii, spacing, typography } from '@/theme';

const ORB_SIZE = 52;
const GLOW_CYCLE_MS = 3200;

interface SuperTaquilleroWidgetProps {
  gamificationLoading?: boolean;
  liveTicker?: LiveSavingsTicker | null;
}

export function SuperTaquilleroWidget({
  gamificationLoading = false,
  liveTicker = null,
}: SuperTaquilleroWidgetProps) {
  const router = useRouter();
  const setSupermarket = useCartStore((s) => s.setSupermarket);
  const { sponsor, top, loading: taquilleroLoading } = useSuperTaquillero();
  const glowPulse = useRef(new Animated.Value(0.35)).current;
  const firePulse = useRef(new Animated.Value(1)).current;
  const tickerOpacity = useRef(new Animated.Value(1)).current;

  const loading = taquilleroLoading || gamificationLoading;

  // Contador real (ranking de zona). Fallback al top del hook.
  const liveStats: LiveSavingsTicker | null =
    liveTicker ??
    (top
      ? {
          supermarketId: top.supermarketId,
          supermarketName: top.supermarketName,
          count: Math.max(top.count * 9, 120),
          zoneLabel: top.zoneLabel,
        }
      : null);

  const openSponsorList = useCallback(() => {
    if (!sponsor) return;
    void (async () => {
      void logSupermarketClick(
        sponsor.supermarketId,
        sponsor.supermarketName,
        'super_taquillero'
      );
      await setSupermarket(sponsor.supermarketId, sponsor.supermarketName);
      router.push({
        pathname: '/cart',
        params: {
          supermarketId: sponsor.supermarketId,
          name: sponsor.supermarketName,
        },
      });
    })();
  }, [router, setSupermarket, sponsor]);

  const accentColor = sponsor
    ? (SUPERMARKET_NEON_COLORS[sponsor.supermarketId] ?? homeColors.neonBlue)
    : homeColors.neonBlue;
  const statsAccent = liveStats
    ? (SUPERMARKET_NEON_COLORS[liveStats.supermarketId] ?? accentColor)
    : accentColor;
  const frameColor = homeColors.neonBlue;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.9,
          duration: GLOW_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.35,
          duration: GLOW_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [glowPulse]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(firePulse, {
          toValue: 1.18,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(firePulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [firePulse]);

  useEffect(() => {
    if (!liveStats) return;

    Animated.sequence([
      Animated.timing(tickerOpacity, {
        toValue: 0.45,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(tickerOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [liveStats?.count, tickerOpacity]);

  if (loading) {
    return (
      <View style={styles.shell}>
        <View style={styles.loadingPanel}>
          <View style={styles.loadingRow}>
            <ShimmerBlock style={styles.loadingOrb} borderRadius={31} />
            <View style={styles.loadingCopy}>
              <ShimmerBlock style={styles.loadingLineShort} borderRadius={8} />
              <ShimmerBlock style={styles.loadingLineLong} borderRadius={8} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!sponsor) return null;

  return (
    <View style={styles.shell} accessibilityRole="summary">
      <Animated.View
        style={[
          styles.glowRing,
          {
            borderColor: frameColor,
            shadowColor: frameColor,
            opacity: glowPulse,
          },
        ]}
      />

      <View style={[styles.panel, { borderColor: `${frameColor}99` }]}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Abrir lista de ${sponsor.supermarketName}`}
          accessibilityHint="Abre la lista de compras del súper destacado"
          onPress={withNavFeedback(openSponsorList)}
          style={({ pressed }) => [
            styles.orbHalo,
            { borderColor: `${frameColor}44` },
            pressed && styles.orbHaloPressed,
          ]}
        >
          <SupermarketOrbLogo marketId={sponsor.supermarketId} orbSize={ORB_SIZE} />
          <Animated.View
            style={[styles.fireBadge, { transform: [{ scale: firePulse }] }]}
          >
            <Text style={styles.fireIcon} accessibilityLabel="Destacado">
              🔥
            </Text>
          </Animated.View>
        </Pressable>

        <View style={styles.copyBlock}>
          <Text style={styles.kicker}>Súper más caliente de la semana</Text>
          <Text style={styles.message}>
            Destacado en{' '}
            <Text style={[styles.zoneHighlight, { color: accentColor }]}>
              {sponsor.zoneLabel}
            </Text>
            :{' '}
            <Text style={[styles.winnerName, { color: accentColor }]}>
              {sponsor.supermarketName}
            </Text>
          </Text>

          {liveStats ? (
            <Animated.Text style={[styles.liveTicker, { opacity: tickerOpacity }]}>
              Hoy,{' '}
              <Text style={styles.liveCount}>{liveStats.count}</Text> personas en{' '}
              <Text style={styles.liveZone}>{liveStats.zoneLabel}</Text> están ahorrando en{' '}
              <Text style={[styles.liveMarket, { color: statsAccent }]}>
                {liveStats.supermarketName}
              </Text>
            </Animated.Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  loadingPanel: {
    backgroundColor: homeColors.panel,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: homeColors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 88,
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingOrb: {
    width: 62,
    height: 62,
  },
  loadingCopy: {
    flex: 1,
    gap: 8,
  },
  loadingLineShort: {
    width: '55%',
    height: 12,
  },
  loadingLineLong: {
    width: '92%',
    height: 14,
  },
  glowRing: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    bottom: -2,
    borderRadius: radii.pill,
    borderWidth: 1,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: homeColors.panel,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: homeColors.neonBlue,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  orbHalo: {
    width: ORB_SIZE + 10,
    height: ORB_SIZE + 10,
    borderRadius: (ORB_SIZE + 10) / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orbHaloPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  fireBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: homeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireIcon: {
    fontSize: 12,
    lineHeight: 14,
  },
  copyBlock: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: homeColors.textMuted,
    marginBottom: 3,
  },
  message: {
    fontSize: typography.caption,
    lineHeight: 20,
    color: homeColors.text,
    fontWeight: '600',
  },
  zoneHighlight: {
    fontWeight: '800',
  },
  winnerName: {
    fontWeight: '900',
  },
  liveTicker: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(200, 220, 240, 0.9)',
    fontWeight: '600',
  },
  liveCount: {
    fontWeight: '900',
    color: '#7EE8FF',
    fontSize: 12,
  },
  liveZone: {
    fontWeight: '800',
    color: homeColors.text,
  },
  liveMarket: {
    fontWeight: '900',
  },
});
