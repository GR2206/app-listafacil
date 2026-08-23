import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CartBankPromoTip } from '@/hooks/useCartBankPromoTip';
import { getAppSetting, setAppSetting } from '@/db/database';
import { withClickSound } from '@/utils/withClickSound';
import { radii } from '@/theme';
import { cartCompact as c, cartListColors as lc } from '@/theme/cartCompact';

function dismissKey(supermarketId: string, promoId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `bank_promo_tip_dismiss_${day}_${supermarketId}_${promoId}`;
}

type BankPromoTipBannerProps = {
  tip: CartBankPromoTip;
  supermarketId: string;
};

/** Tip contextual al armar la lista: reintegro bancario en este súper hoy. */
export function BankPromoTipBanner({ tip, supermarketId }: BankPromoTipBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const key = dismissKey(supermarketId, tip.promo.id);
      const value = await getAppSetting(key);
      if (!cancelled) {
        setDismissed(value === '1');
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supermarketId, tip.promo.id]);

  if (!ready || dismissed) return null;

  const onDismiss = withClickSound(() => {
    setDismissed(true);
    void setAppSetting(dismissKey(supermarketId, tip.promo.id), '1');
  });

  const onConditions = withClickSound(() => {
    if (tip.promo.url) void Linking.openURL(tip.promo.url);
  });

  return (
    <View
      style={styles.banner}
      accessibilityRole="summary"
      accessibilityLabel={tip.message}
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={14} color="#0F7A5A" />
            <Text style={styles.badgeText}>Tip del día</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ocultar tip de reintegro"
            onPress={onDismiss}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="close" size={18} color={lc.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.message}>{tip.message}</Text>
        {tip.estimateLabel ? <Text style={styles.estimate}>{tip.estimateLabel}</Text> : null}

        {tip.promo.url ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver condiciones"
              onPress={onConditions}
              style={({ pressed }) => [styles.conditionsBtn, pressed && styles.pressed]}
            >
              <Text style={styles.conditionsText}>Ver condiciones</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    marginHorizontal: c.margin,
    marginBottom: c.gap,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#B7D4C6',
    backgroundColor: '#F2FBF6',
    overflow: 'hidden',
  },
  accent: {
    width: 5,
    backgroundColor: '#0F7A5A',
  },
  body: {
    flex: 1,
    paddingVertical: c.gap,
    paddingHorizontal: c.margin,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C8EBD9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F7A5A',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: c.noticeFontSize,
    fontWeight: '700',
    color: '#143024',
    lineHeight: Math.round(c.noticeFontSize * 1.35),
  },
  estimate: {
    fontSize: Math.max(12, c.noticeFontSize - 2),
    fontWeight: '600',
    color: '#2D6A4F',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  conditionsBtn: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: '#0F7A5A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  conditionsText: {
    color: '#0F7A5A',
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
