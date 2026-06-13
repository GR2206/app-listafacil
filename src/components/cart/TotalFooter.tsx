import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSupermarketTheme } from '@/context/ThemeContext';
import { useCartListScale } from '@/context/CartListScaleContext';
import { formatTotalDisplay } from '@/utils/formatPriceDisplay';
import { withTeclaTaskFeedback } from '@/utils/withTaskFeedback';
import { radii } from '@/theme';

interface TotalFooterProps {
  total: number;
  unpricedCount?: number;
  adBanner?: ReactNode;
  onFinalizePurchase?: () => void;
  finalizeDisabled?: boolean;
}

export function TotalFooter({
  total,
  unpricedCount = 0,
  adBanner,
  onFinalizePurchase,
  finalizeDisabled = false,
}: TotalFooterProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useSupermarketTheme();
  const { metrics: c } = useCartListScale();
  const showPartialHint = unpricedCount > 0;
  const rowGap = Math.max(2, c.gap - 1);
  const totalZoneWidth =
    c.qtyColWidth + rowGap + c.totalColWidth + rowGap + c.editBtnSize;
  const styles = useMemo(() => createStyles(c), [c]);

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.primary,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {adBanner ? (
        <View style={[styles.adSlot, { borderBottomColor: theme.border }]}>
          {adBanner}
        </View>
      ) : null}

      <View style={styles.totalBar}>
        <View style={styles.totalRow}>
          <View style={styles.leftZone}>
            {onFinalizePurchase ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Finalizar compra"
                accessibilityState={{ disabled: finalizeDisabled }}
                disabled={finalizeDisabled}
                onPress={withTeclaTaskFeedback(onFinalizePurchase, 'medium')}
                style={({ pressed }) => [
                  styles.finalizeBtn,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                    opacity: finalizeDisabled ? 0.45 : pressed ? 0.88 : 1,
                  },
                  pressed && !finalizeDisabled && styles.finalizeBtnPressed,
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.textOnPrimary} />
                <Text style={[styles.finalizeBtnText, { color: theme.textOnPrimary }]}>
                  Finalizar compra
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.totalZone, { width: totalZoneWidth }]}>
            <Text
              style={[styles.totalLabel, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {showPartialHint ? 'TOTAL PARCIAL' : 'TOTAL'}
            </Text>
            {showPartialHint ? (
              <Text style={[styles.partialHint, { color: theme.textMuted }]} numberOfLines={1}>
                {unpricedCount} {unpricedCount === 1 ? 'producto' : 'productos'} sin precio
              </Text>
            ) : null}
            <View
              style={styles.totalAmountWrap}
              accessibilityRole="text"
              accessibilityLabel={`Total ${formatTotalDisplay(total)}`}
            >
              <Text
                style={[styles.totalAmount, { color: theme.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
              >
                {formatTotalDisplay(total)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(c: ReturnType<typeof import('@/theme/scaledCartMetrics').createScaledCartMetrics>) {
  return StyleSheet.create({
    wrapper: {
      borderTopWidth: 1.5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 8,
    },
    adSlot: {
      minHeight: Math.max(48, c.adMinHeight + 20),
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 1,
      paddingVertical: 4,
    },
    totalBar: {
      paddingHorizontal: c.margin,
      paddingVertical: c.margin,
      width: '100%',
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 2,
      gap: Math.max(2, c.gap - 1),
    },
    leftZone: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    totalZone: {
      flexShrink: 0,
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 1,
      minWidth: 0,
    },
    totalAmountWrap: {
      width: '100%',
      alignItems: 'flex-end',
      minHeight: c.footerTotalFontSize + 4,
    },
    totalLabel: {
      fontSize: c.footerLabelFontSize,
      fontWeight: '700',
      letterSpacing: 1.2,
      textAlign: 'right',
    },
    partialHint: {
      fontSize: Math.max(9, c.clearFontSize - 2),
      fontWeight: '600',
      fontStyle: 'italic',
      textAlign: 'right',
    },
    totalAmount: {
      fontSize: c.footerTotalFontSize,
      fontWeight: '900',
      textAlign: 'right',
      width: '100%',
      flexShrink: 1,
    },
    finalizeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      flexShrink: 0,
    },
    finalizeBtnPressed: {
      transform: [{ scale: 0.98 }],
    },
    finalizeBtnText: {
      fontSize: Math.max(12, c.clearFontSize),
      fontWeight: '800',
      letterSpacing: 0.2,
    },
  });
}
