import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  BannerSlotSkeleton,
  ManagedBannerSlot,
} from '@/components/banners/ManagedBannerSlot';
import { useBannerManager } from '@/hooks/useBannerManager';
import { hasRemoteBannerCreative } from '@/services/bannerManager';
import {
  SAVINGS_BANNER_AD_PLACEHOLDER,
  SAVINGS_BANNER_DEFAULT_HINT,
  SAVINGS_BANNER_SPONSOR_URL,
} from '@/config/savingsBanner';
import { formatCurrency } from '@/utils/formatCurrency';
import { isValidBannerTargetUrl } from '@/utils/validateBannerUrl';
import { openExternalUrlDirect } from '@/utils/safeLinking';
import { withClickSound } from '@/utils/withClickSound';
import { homeColors } from '@/theme/home';
import { radii, spacing, typography } from '@/theme';
import type { BannerSlotId } from '@/types/banner';

const PULSE_MS = 2200;
const NEON_BLUE = homeColors.neonBlue;
const NEON_BLUE_SOFT = homeColors.neonBlueSoft;
const NEON_BLUE_DARK = '#0088A8';

interface SavingsBannerProps {
  listSavings?: number;
  totalSavings?: number;
  compact?: boolean;
  bannerSlot?: Extract<BannerSlotId, 'top_banner' | 'list_banner'>;
  style?: StyleProp<ViewStyle>;
}

function NeonGradientBackground() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="savingsNeon" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={NEON_BLUE_SOFT} stopOpacity="0.95" />
          <Stop offset="45%" stopColor={NEON_BLUE} stopOpacity="0.9" />
          <Stop offset="100%" stopColor={NEON_BLUE_DARK} stopOpacity="0.95" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#savingsNeon)" />
    </Svg>
  );
}

function resolveSavingsClickUrl(targetUrl: string | null | undefined): string {
  if (isValidBannerTargetUrl(targetUrl)) {
    return targetUrl.trim();
  }
  return SAVINGS_BANNER_SPONSOR_URL;
}

interface SavingsBannerContentProps {
  listSavings: number;
  totalSavings: number;
  compact: boolean;
  sponsorUrl: string;
  style?: StyleProp<ViewStyle>;
}

function SavingsBannerContent({
  listSavings,
  totalSavings,
  compact,
  sponsorUrl,
  style,
}: SavingsBannerContentProps) {
  const glowPulse = useRef(new Animated.Value(0.35)).current;

  const safeListSavings = Math.max(0, Math.round(listSavings));
  const safeTotalSavings = Math.max(0, Math.round(totalSavings));
  const hasSavingsData = safeListSavings > 0 || safeTotalSavings > 0;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: PULSE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.35,
          duration: PULSE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [glowPulse]);

  const openSponsorLink = useCallback(async () => {
    await openExternalUrlDirect(sponsorUrl);
  }, [sponsorUrl]);

  const listLabel = compact ? 'Esta lista' : 'Ahorro de esta lista';
  const totalLabel = compact ? 'Total' : 'Ahorro Total Acumulado';

  const accessibilityLabel = [
    hasSavingsData
      ? `${listLabel}: ${formatCurrency(safeListSavings)}. ${totalLabel}: ${formatCurrency(safeTotalSavings)}`
      : SAVINGS_BANNER_DEFAULT_HINT,
    SAVINGS_BANNER_AD_PLACEHOLDER,
  ].join('. ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Abre la web del auspiciante"
      onPress={withClickSound(() => void openSponsorLink())}
      style={({ pressed }) => [
        compact ? styles.wrapCompact : styles.wrap,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.glowHalo} pointerEvents="none" />
      <View style={[styles.card, compact && styles.cardCompact]}>
        <NeonGradientBackground />

        <View style={[styles.content, compact && styles.contentCompact]}>
          <View style={[styles.iconBadge, compact && styles.iconBadgeCompact]}>
            <FontAwesome5 name="piggy-bank" size={compact ? 16 : 20} color="#FFFFFF" />
          </View>

          <View style={styles.metrics}>
            {hasSavingsData ? (
              <>
                <View style={styles.metricRow}>
                  <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
                    {listLabel}
                  </Text>
                  <Text style={[styles.listAmount, compact && styles.listAmountCompact]}>
                    {formatCurrency(safeListSavings)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.metricRow}>
                  <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
                    {totalLabel}
                  </Text>
                  <Animated.Text
                    style={[
                      styles.totalAmount,
                      compact && styles.totalAmountCompact,
                      {
                        opacity: glowPulse,
                        textShadowColor: homeColors.neonBlue,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 12,
                      },
                    ]}
                  >
                    {formatCurrency(safeTotalSavings)}
                  </Animated.Text>
                </View>
              </>
            ) : (
              <View style={styles.defaultState}>
                <Text style={[styles.defaultTitle, compact && styles.defaultTitleCompact]}>
                  {totalLabel}
                </Text>
                <Text
                  style={[styles.defaultHint, compact && styles.defaultHintCompact]}
                  numberOfLines={compact ? 2 : 3}
                >
                  {SAVINGS_BANNER_DEFAULT_HINT}
                </Text>
                <Text style={[styles.defaultAmount, compact && styles.defaultAmountCompact]}>
                  {formatCurrency(0)}
                </Text>
              </View>
            )}
          </View>

          <View
            style={[styles.adSlot, compact && styles.adSlotCompact]}
            accessibilityRole="text"
            accessibilityLabel={SAVINGS_BANNER_AD_PLACEHOLDER}
          >
            <Ionicons
              name="megaphone-outline"
              size={compact ? 12 : 14}
              color="rgba(255, 255, 255, 0.9)"
            />
            <Text
              style={[styles.adSlotText, compact && styles.adSlotTextCompact]}
              numberOfLines={3}
            >
              {SAVINGS_BANNER_AD_PLACEHOLDER}
            </Text>
            <Ionicons
              name="open-outline"
              size={compact ? 10 : 12}
              color="rgba(255, 255, 255, 0.75)"
              style={styles.adLinkIcon}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Alterna entre modo ahorro y banner publicitario del Gist (banners-app.json).
 * Si el JSON trae imageUrl/animationUrl remota → ManagedBannerSlot (imagen + targetUrl).
 * Si no hay creativo remoto → panel de ahorro dinámico con slot reservado para publicidad.
 */
export function SavingsBanner({
  listSavings = 0,
  totalSavings = 0,
  compact = false,
  bannerSlot = 'top_banner',
  style,
}: SavingsBannerProps) {
  const { isLoading, isReady, getBanner } = useBannerManager();
  const resolved = getBanner(bannerSlot);

  const showAdBanner = useMemo(() => hasRemoteBannerCreative(resolved), [resolved]);

  const savingsSponsorUrl = useMemo(
    () => resolveSavingsClickUrl(resolved.targetUrl),
    [resolved.targetUrl]
  );

  if (!isReady && isLoading) {
    return <BannerSlotSkeleton slot={bannerSlot} style={style} />;
  }

  if (showAdBanner) {
    return <ManagedBannerSlot slot={bannerSlot} style={style} />;
  }

  return (
    <SavingsBannerContent
      listSavings={listSavings}
      totalSavings={totalSavings}
      compact={compact}
      sponsorUrl={savingsSponsorUrl}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  wrapCompact: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  glowHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(0, 229, 255, 0.22)',
    transform: [{ scale: 1.03 }],
  },
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    minHeight: 78,
    shadowColor: NEON_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  cardCompact: {
    minHeight: 58,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  contentCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
  },
  iconBadgeCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  metrics: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metricLabel: {
    flex: 1,
    fontSize: typography.caption,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 0.2,
  },
  metricLabelCompact: {
    fontSize: 11,
  },
  listAmount: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  listAmountCompact: {
    fontSize: 14,
  },
  totalAmount: {
    fontSize: typography.bodyLarge,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowOffset: { width: 0, height: 0 },
  },
  totalAmountCompact: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  defaultState: {
    gap: 2,
  },
  defaultTitle: {
    fontSize: typography.caption,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  defaultTitleCompact: {
    fontSize: 11,
  },
  defaultHint: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 16,
  },
  defaultHintCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
  defaultAmount: {
    fontSize: typography.bodyLarge,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  defaultAmountCompact: {
    fontSize: 14,
  },
  adSlot: {
    width: 72,
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
    alignSelf: 'center',
  },
  adSlotCompact: {
    width: 58,
    minHeight: 46,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
  adSlotText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 11,
    letterSpacing: 0.15,
  },
  adSlotTextCompact: {
    fontSize: 8,
    lineHeight: 10,
  },
  adLinkIcon: {
    marginTop: 1,
  },
});
