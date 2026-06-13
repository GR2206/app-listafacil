import { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';

import { SupermarketOrbLogo } from '@/components/home/SupermarketOrbLogo';
import { SUPERMARKET_NEON_COLORS } from '@/components/home/supermarketOrbTheme';
import { useSuperTaquillero } from '@/hooks/useSuperTaquillero';
import { useCartStore } from '@/store/cartStore';
import { logSupermarketClick } from '@/services/analytics';
import { withNavFeedback } from '@/utils/withNavFeedback';
import { homeColors } from '@/theme/home';
import { radii, spacing, typography } from '@/theme';

const ORB_SIZE = 52;
const GLOW_CYCLE_MS = 3200;

export function SuperTaquilleroWidget() {
  const router = useRouter();
  const setSupermarket = useCartStore((s) => s.setSupermarket);
  const { top, loading } = useSuperTaquillero();
  const glowPulse = useRef(new Animated.Value(0.35)).current;

  const openWinnerList = useCallback(() => {
    if (!top) return;
    void (async () => {
      void logSupermarketClick(top.supermarketId, top.supermarketName, 'super_taquillero');
      await setSupermarket(top.supermarketId, top.supermarketName);
      router.push({
        pathname: '/cart',
        params: {
          supermarketId: top.supermarketId,
          name: top.supermarketName,
        },
      });
    })();
  }, [router, setSupermarket, top]);

  const accentColor = top
    ? (SUPERMARKET_NEON_COLORS[top.supermarketId] ?? homeColors.neonBlue)
    : homeColors.neonBlue;
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

  if (loading) {
    return (
      <View style={styles.shell}>
        <View style={styles.loadingPanel}>
          <ActivityIndicator color={homeColors.neonBlue} size="small" />
        </View>
      </View>
    );
  }

  if (!top) return null;

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
          accessibilityLabel={`Abrir lista de ${top.supermarketName}`}
          accessibilityHint="Abre la lista de compras del súper ganador"
          onPress={withNavFeedback(openWinnerList)}
          style={({ pressed }) => [
            styles.orbHalo,
            { borderColor: `${frameColor}44` },
            pressed && styles.orbHaloPressed,
          ]}
        >
          <SupermarketOrbLogo marketId={top.supermarketId} orbSize={ORB_SIZE} />
          <View style={styles.fireBadge}>
            <Text style={styles.fireIcon} accessibilityLabel="Más elegido">
              🔥
            </Text>
          </View>
        </Pressable>

        <View style={styles.copyBlock}>
          <Text style={styles.kicker}>Súper más taquillero de la semana</Text>
          <Text style={styles.message}>
            El súper más elegido en{' '}
            <Text style={[styles.zoneHighlight, { color: accentColor }]}>
              {top.zoneLabel}
            </Text>{' '}
            esta semana:{' '}
            <Text style={[styles.winnerName, { color: accentColor }]}>
              {top.supermarketName}
            </Text>
          </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
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
});
