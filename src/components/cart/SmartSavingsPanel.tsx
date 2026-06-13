import { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  PanResponder,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SUPERMARKET_NEON_COLORS } from '@/components/home/supermarketOrbTheme';
import type { SupermarketQuote } from '@/services/smartSavingsEngine';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatPriceSyncLabel } from '@/utils/formatPriceSync';
import { cartCompact as c, cartListColors as lc } from '@/theme/cartCompact';
import { homeColors } from '@/theme/home';
import { withClickSound } from '@/utils/withClickSound';

const OFFER_NEON_BLUE = homeColors.neonBlue;
const OFFER_NEON_BLUE_DARK = '#0097B2';
const SWIPE_DISMISS_THRESHOLD = 80;
const PANEL_SCALE = 0.85;

interface SmartSavingsPanelProps {
  quotes: SupermarketQuote[];
  winnerId: string | null;
  onForceRefresh?: () => void;
  isRefreshing?: boolean;
  onDismiss?: () => void;
  onOpenMaps?: (supermarketId: string) => void;
  /** Solo la primera aparición automática; null = permanece hasta que el usuario la barre */
  autoDismissMs?: number | null;
}

export function SmartSavingsPanel({
  quotes,
  winnerId,
  onForceRefresh,
  isRefreshing = false,
  onDismiss,
  onOpenMaps,
  autoDismissMs = null,
}: SmartSavingsPanelProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const screenWidth = Dimensions.get('window').width;
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pricedQuotes = quotes.filter((q) => q.pricedItemCount > 0);

  const dismissPanel = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onDismiss?.();
        translateX.setValue(0);
        opacity.setValue(1);
      }
    });
  }, [onDismiss, opacity, screenWidth, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 0) {
          translateX.setValue(gesture.dx);
          opacity.setValue(Math.max(0.35, 1 - gesture.dx / (screenWidth * 0.7)));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_DISMISS_THRESHOLD || gesture.vx > 0.4) {
          dismissPanel();
          return;
        }

        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 120,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 120,
        }).start();
        opacity.setValue(1);
      },
    })
  ).current;

  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;

    autoDismissTimer.current = setTimeout(() => {
      dismissPanel();
    }, autoDismissMs);

    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    };
  }, [autoDismissMs, onDismiss, dismissPanel]);

  if (pricedQuotes.length === 0) return null;

  const hasStaleSync = pricedQuotes.some((quote) => {
    const syncLabel = formatPriceSyncLabel(quote.lastSyncedAt, {
      dailyReportDate: quote.dailyReportDate,
    });
    return syncLabel.isStale && !syncLabel.isSynced;
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity,
          transform: [{ translateX }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>Compará tu lista</Text>
        <View style={styles.titleActions}>
          {hasStaleSync && onForceRefresh ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Actualizar precios desde el servidor"
              onPress={onForceRefresh}
              disabled={isRefreshing}
              style={({ pressed }) => [
                styles.refreshBtn,
                pressed && !isRefreshing && styles.refreshPressed,
                isRefreshing && styles.refreshDisabled,
              ]}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={OFFER_NEON_BLUE_DARK} />
              ) : (
                <Ionicons name="refresh" size={12} color={OFFER_NEON_BLUE_DARK} />
              )}
              <Text style={styles.refreshText}>
                {isRefreshing ? '…' : 'Actualizar'}
              </Text>
            </Pressable>
          ) : null}
          <Ionicons name="chevron-forward" size={12} color={lc.textMuted} style={styles.swipeHint} />
        </View>
      </View>

      {pricedQuotes.map((quote) => {
        const isWinner = quote.supermarketId === winnerId;
        const neonColor =
          SUPERMARKET_NEON_COLORS[quote.supermarketId] ?? OFFER_NEON_BLUE;
        const syncLabel = formatPriceSyncLabel(quote.lastSyncedAt, {
          dailyReportDate: quote.dailyReportDate,
        });

        return (
          <View
            key={quote.supermarketId}
            style={[
              styles.row,
              isWinner && {
                borderColor: neonColor,
                borderWidth: 1.5,
                shadowColor: neonColor,
                shadowOpacity: 0.6,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 0 },
                elevation: 4,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${quote.name} en Google Maps${
                quote.savingsVsMax > 0 ? `, ahorrás ${formatCurrency(quote.savingsVsMax)}` : ''
              }`}
              onPress={withClickSound(() => onOpenMaps?.(quote.supermarketId))}
              style={({ pressed }) => [
                styles.rowMain,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.nameBlock}>
                <View style={styles.nameRow}>
                  <Text style={[styles.marketName, isWinner && styles.marketNameWinner]}>
                    {quote.name}
                  </Text>
                  <Ionicons name="navigate" size={12} color={isWinner ? OFFER_NEON_BLUE_DARK : lc.textMuted} />
                </View>
                <Text
                  style={[
                    styles.syncLabel,
                    syncLabel.isSynced
                      ? styles.syncLabelSynced
                      : syncLabel.isStale
                        ? styles.syncLabelStale
                        : styles.syncLabelFresh,
                  ]}
                >
                  {syncLabel.label}
                </Text>
                {!quote.isComplete ? (
                  <Text style={styles.partialHint}>
                    {quote.pricedItemCount}/{quote.totalItems} productos
                  </Text>
                ) : null}
              </View>

              <View style={styles.rightBlock}>
                {quote.savingsVsMax > 0 ? (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>
                      Ahorrás {formatCurrency(quote.savingsVsMax)}
                    </Text>
                  </View>
                ) : isWinner ? (
                  <View style={[styles.savingsBadge, styles.winnerBadge]}>
                    <Text style={styles.winnerBadgeText}>Mejor precio</Text>
                  </View>
                ) : null}

                <Text
                  style={[
                    styles.total,
                    isWinner && { color: OFFER_NEON_BLUE_DARK },
                  ]}
                >
                  {formatCurrency(quote.total)}
                </Text>
              </View>
            </Pressable>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: c.margin,
    marginBottom: c.gap,
    gap: Math.round(6 * PANEL_SCALE),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 8,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: Math.round(11 * PANEL_SCALE),
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: lc.textMuted,
    flex: 1,
  },
  swipeHint: {
    opacity: 0.45,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  refreshPressed: {
    opacity: 0.8,
  },
  refreshDisabled: {
    opacity: 0.7,
  },
  refreshText: {
    fontSize: 9,
    fontWeight: '700',
    color: OFFER_NEON_BLUE_DARK,
  },
  row: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    gap: 0,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Math.round(10 * PANEL_SCALE),
    paddingVertical: Math.round(6 * PANEL_SCALE),
    gap: 6,
  },
  rowPressed: {
    opacity: 0.88,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  marketName: {
    flex: 1,
    fontSize: Math.round(13 * PANEL_SCALE),
    fontWeight: '700',
    color: lc.text,
  },
  marketNameWinner: {
    fontWeight: '900',
  },
  syncLabel: {
    fontSize: 8,
    fontWeight: '500',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  syncLabelFresh: {
    color: lc.textSecondary,
  },
  syncLabelSynced: {
    color: OFFER_NEON_BLUE_DARK,
    fontWeight: '700',
  },
  syncLabelStale: {
    color: '#B45309',
  },
  partialHint: {
    fontSize: 9,
    color: lc.textSecondary,
    marginTop: 1,
  },
  rightBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  savingsBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  savingsText: {
    fontSize: 9,
    fontWeight: '700',
    color: OFFER_NEON_BLUE_DARK,
  },
  winnerBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
  },
  winnerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: OFFER_NEON_BLUE_DARK,
  },
  total: {
    fontSize: Math.round(14 * PANEL_SCALE),
    fontWeight: '900',
    color: lc.text,
  },
});
