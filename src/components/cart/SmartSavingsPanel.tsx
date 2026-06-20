import { useCallback, useEffect, useRef, useState } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getSupermarketNeonColor,
  SUPERMARKET_NEON_COLORS,
} from '@/components/home/supermarketOrbTheme';
import type { ScannedProductQuote, SupermarketQuote } from '@/services/smartSavingsEngine';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatPriceSyncLabel } from '@/utils/formatPriceSync';
import { hexToRgba } from '@/utils/hexToRgba';
import { cartCompact as c, cartListColors as lc } from '@/theme/cartCompact';
import { withClickSound } from '@/utils/withClickSound';

const OFFER_NEON_BLUE_DARK = '#0097B2';
const SWIPE_DISMISS_THRESHOLD = 80;
const PANEL_SCALE = 0.85;
const PRODUCT_PHASE_MS = 4000;
const WINNER_PULSE_MS = 2000;

type ComparisonViewMode = 'product' | 'ticket';

interface LastScannedProductComparison {
  name: string;
  quantity: number;
  quotes: ScannedProductQuote[];
}

interface ComparisonSuperRowProps {
  supermarketId: string;
  name: string;
  price: number;
  isWinner: boolean;
  pulseKey: string;
  accessibilityLabel: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
}

function ComparisonSuperRow({
  supermarketId,
  name,
  price,
  isWinner,
  pulseKey,
  accessibilityLabel,
  subtitle,
  badge,
  onPress,
}: ComparisonSuperRowProps) {
  const neonColor =
    SUPERMARKET_NEON_COLORS[supermarketId] ?? getSupermarketNeonColor(supermarketId);
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isWinner) {
      glowOpacity.setValue(0);
      return;
    }

    glowOpacity.setValue(0);
    const pulse = Animated.sequence([
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: WINNER_PULSE_MS * 0.25,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.2,
        duration: WINNER_PULSE_MS * 0.25,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.75,
        duration: WINNER_PULSE_MS * 0.25,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: WINNER_PULSE_MS * 0.25,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    pulse.start();
    return () => pulse.stop();
  }, [isWinner, pulseKey, glowOpacity]);

  const haloOpacity = glowOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Platform.OS === 'ios' ? 0.42 : 0.34],
  });

  return (
    <View style={styles.rowOuter}>
      {isWinner ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rowGlow,
            {
              backgroundColor: hexToRgba(neonColor, 0.1),
              shadowColor: neonColor,
              opacity: haloOpacity,
            },
          ]}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={withClickSound(onPress)}
        style={({ pressed }) => [
          styles.row,
          isWinner && {
            borderColor: neonColor,
            borderWidth: 1.5,
          },
          pressed && styles.rowPressed,
        ]}
      >
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.marketName, isWinner && styles.marketNameWinner]}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Ionicons
              name="navigate"
              size={12}
              color={isWinner ? OFFER_NEON_BLUE_DARK : lc.textMuted}
            />
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.rightBlock}>
          {badge ? (
            <View style={[styles.badge, isWinner && styles.badgeWinner]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
          <Text style={[styles.price, isWinner && { color: OFFER_NEON_BLUE_DARK }]}>
            {formatCurrency(price)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

interface SmartSavingsPanelProps {
  quotes: SupermarketQuote[];
  winnerId: string | null;
  lastScannedProduct?: LastScannedProductComparison | null;
  itemsCount?: number;
  scanFlashKey?: number;
  rotateOnScan?: boolean;
  onForceRefresh?: () => void;
  isRefreshing?: boolean;
  onDismiss?: () => void;
  onOpenMaps?: (supermarketId: string) => void;
  autoDismissMs?: number | null;
}

export function SmartSavingsPanel({
  quotes,
  winnerId,
  lastScannedProduct = null,
  itemsCount = 0,
  scanFlashKey = 0,
  rotateOnScan = false,
  onForceRefresh,
  isRefreshing = false,
  onDismiss,
  onOpenMaps,
  autoDismissMs = null,
}: SmartSavingsPanelProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const screenWidth = Dimensions.get('window').width;
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('ticket');

  const pricedQuotes = quotes.filter((q) => q.pricedItemCount > 0);
  const lastScannedQuotes = lastScannedProduct?.quotes.filter((q) => q.unitPrice > 0) ?? [];
  const lastScannedWinnerId =
    lastScannedQuotes.length > 0 ? lastScannedQuotes[0].supermarketId : null;

  const canShowProduct =
    lastScannedProduct != null && lastScannedQuotes.length > 0;
  const shouldRotate = rotateOnScan && itemsCount > 1 && canShowProduct;

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
        contentOpacity.setValue(1);
      }
    });
  }, [onDismiss, opacity, contentOpacity, screenWidth, translateX]);

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

  const switchViewMode = useCallback(
    (next: ComparisonViewMode) => {
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setViewMode(next);
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();
      });
    },
    [contentOpacity]
  );

  useEffect(() => {
    if (rotateTimer.current) clearTimeout(rotateTimer.current);

    if (shouldRotate) {
      setViewMode('product');
      rotateTimer.current = setTimeout(() => {
        switchViewMode('ticket');
      }, PRODUCT_PHASE_MS);
    } else if (canShowProduct && itemsCount <= 1) {
      setViewMode('product');
    } else {
      setViewMode('ticket');
    }

    return () => {
      if (rotateTimer.current) clearTimeout(rotateTimer.current);
    };
  }, [scanFlashKey, shouldRotate, canShowProduct, itemsCount, switchViewMode]);

  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;

    if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    autoDismissTimer.current = setTimeout(() => {
      dismissPanel();
    }, autoDismissMs);

    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    };
  }, [autoDismissMs, onDismiss, dismissPanel, scanFlashKey]);

  if (pricedQuotes.length === 0 && lastScannedQuotes.length === 0) return null;

  const activeMode: ComparisonViewMode =
    viewMode === 'product' && canShowProduct ? 'product' : 'ticket';

  const headerLabel =
    activeMode === 'product' ? 'Este producto' : 'Total de tu lista';

  const pulseKey = `${scanFlashKey}-${activeMode}`;

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
        <Text style={styles.title}>Compará · {headerLabel}</Text>
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
            </Pressable>
          ) : null}
          <Ionicons name="chevron-forward" size={12} color={lc.textMuted} style={styles.swipeHint} />
        </View>
      </View>

      <Animated.View style={[styles.rows, { opacity: contentOpacity }]}>
        {activeMode === 'product' && lastScannedProduct ? (
          <Text style={styles.productName} numberOfLines={1}>
            {lastScannedProduct.name}
          </Text>
        ) : null}

        {activeMode === 'product'
          ? lastScannedQuotes.map((quote) => {
              const isWinner = quote.supermarketId === lastScannedWinnerId;

              return (
                <ComparisonSuperRow
                  key={`product-${quote.supermarketId}`}
                  supermarketId={quote.supermarketId}
                  name={quote.name}
                  price={quote.lineTotal}
                  isWinner={isWinner}
                  pulseKey={pulseKey}
                  accessibilityLabel={`Abrir ${quote.name} en Google Maps`}
                  badge={isWinner ? 'Mejor precio' : undefined}
                  onPress={() => onOpenMaps?.(quote.supermarketId)}
                />
              );
            })
          : pricedQuotes.map((quote) => {
              const isWinner = quote.supermarketId === winnerId;
              const badge =
                quote.savingsVsMax > 0
                  ? `Ahorrás ${formatCurrency(quote.savingsVsMax)}`
                  : isWinner
                    ? 'Mejor precio'
                    : undefined;

              return (
                <ComparisonSuperRow
                  key={`ticket-${quote.supermarketId}`}
                  supermarketId={quote.supermarketId}
                  name={quote.name}
                  price={quote.total}
                  isWinner={isWinner}
                  pulseKey={pulseKey}
                  accessibilityLabel={`Abrir ${quote.name} en Google Maps${
                    quote.savingsVsMax > 0
                      ? `, ahorrás ${formatCurrency(quote.savingsVsMax)}`
                      : ''
                  }`}
                  subtitle={
                    !quote.isComplete
                      ? `${quote.pricedItemCount}/${quote.totalItems} productos`
                      : undefined
                  }
                  badge={badge}
                  onPress={() => onOpenMaps?.(quote.supermarketId)}
                />
              );
            })}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: c.margin,
    marginBottom: c.gap,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: lc.textMuted,
    flex: 1,
  },
  swipeHint: {
    opacity: 0.45,
  },
  refreshBtn: {
    padding: 4,
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
  rows: {
    gap: Math.round(5 * PANEL_SCALE),
  },
  productName: {
    fontSize: Math.round(11 * PANEL_SCALE),
    fontWeight: '600',
    color: lc.textSecondary,
    marginBottom: 1,
    paddingHorizontal: 2,
  },
  rowOuter: {
    position: 'relative',
  },
  rowGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'ios' ? 0.55 : 0.4,
    shadowRadius: 10,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: Math.round(10 * PANEL_SCALE),
    paddingVertical: Math.round(6 * PANEL_SCALE),
    gap: 6,
    overflow: 'hidden',
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
  subtitle: {
    fontSize: 9,
    color: lc.textSecondary,
    marginTop: 1,
  },
  rightBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  badge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeWinner: {
    backgroundColor: 'rgba(0, 229, 255, 0.18)',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: OFFER_NEON_BLUE_DARK,
  },
  price: {
    fontSize: Math.round(14 * PANEL_SCALE),
    fontWeight: '900',
    color: lc.text,
  },
});
