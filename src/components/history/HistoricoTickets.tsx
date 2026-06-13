import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SUPERMARKET_NEON_COLORS } from '@/components/home/supermarketOrbTheme';
import type { CompletedPurchaseRecord } from '@/db/database';
import { homeColors } from '@/theme/home';
import { radii } from '@/theme';
import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';
import { formatCurrency } from '@/utils/formatCurrency';
import { groupPurchasesByMonth } from '@/utils/groupPurchasesByMonth';
import { withClickSound } from '@/utils/withClickSound';

interface HistoricoTicketsProps {
  purchases: CompletedPurchaseRecord[];
}

function formatTicketDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoricoTickets({ purchases }: HistoricoTicketsProps) {
  const router = useRouter();
  const groups = groupPurchasesByMonth(purchases);
  const { styles: menuContentStyles, m } = useMenuContentStyles();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          gap: m.spacingMd,
        },
        monthSection: {
          gap: m.spacingSm,
        },
        monthLabel: {
          fontSize: m.caption,
          fontWeight: '800',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: homeColors.neonBlueSoft,
          marginTop: m.spacingXs,
          marginBottom: 2,
        },
        ticketCard: {
          backgroundColor: homeColors.panel,
          borderRadius: radii.md,
          borderWidth: 1,
          padding: m.spacingMd,
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          elevation: 3,
        },
        ticketPressed: {
          opacity: 0.88,
          transform: [{ scale: 0.99 }],
        },
        ticketHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: m.spacingSm,
        },
        marketName: {
          flex: 1,
          fontSize: m.body,
          fontWeight: '800',
          color: homeColors.text,
        },
        ticketDate: {
          fontSize: Math.max(9, m.caption - 2),
          color: homeColors.textMuted,
          marginTop: 4,
        },
        ticketFooter: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: m.spacingSm,
        },
        itemCount: {
          fontSize: m.caption,
          color: homeColors.textMuted,
        },
        total: {
          fontSize: m.title,
          fontWeight: '900',
        },
        savings: {
          fontSize: Math.max(9, m.caption - 2),
          fontWeight: '700',
          color: homeColors.neonBlue,
          marginTop: 6,
        },
        emptyTitle: {
          marginTop: m.spacingSm,
        },
        emptyHint: {
          fontSize: m.caption,
          color: homeColors.textMuted,
          textAlign: 'center',
          marginTop: m.spacingSm,
          lineHeight: Math.round(m.caption * 1.35),
        },
      }),
    [m]
  );

  if (purchases.length === 0) {
    return (
      <View style={menuContentStyles.emptyPanel}>
        <Ionicons name="receipt-outline" size={40} color={homeColors.textMuted} />
        <Text style={[menuContentStyles.emptyText, styles.emptyTitle]}>
          Todavía no hay compras finalizadas.
        </Text>
        <Text style={styles.emptyHint}>
          Cuando termines de comprar, usá «Finalizar compra» al pie de tu lista.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {groups.map((group) => (
        <View key={group.key} style={styles.monthSection}>
          <Text style={styles.monthLabel}>{group.label}</Text>

          {group.purchases.map((purchase) => {
            const neonColor =
              SUPERMARKET_NEON_COLORS[purchase.supermarketId] ?? homeColors.neonBlue;

            return (
              <Pressable
                key={purchase.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver ticket de ${purchase.supermarketName}, ${formatCurrency(purchase.total)}`}
                onPress={withClickSound(() =>
                  router.push(`/mis-compras/${purchase.id}`)
                )}
                style={({ pressed }) => [
                  styles.ticketCard,
                  {
                    borderColor: neonColor,
                    shadowColor: neonColor,
                  },
                  pressed && styles.ticketPressed,
                ]}
              >
                <View style={styles.ticketHeader}>
                  <Text style={styles.marketName}>{purchase.supermarketName}</Text>
                  <Ionicons name="chevron-forward" size={m.iconSm} color={homeColors.textMuted} />
                </View>

                <Text style={styles.ticketDate}>
                  {formatTicketDate(purchase.completedAt)}
                </Text>

                <View style={styles.ticketFooter}>
                  <Text style={styles.itemCount}>
                    {purchase.itemCount}{' '}
                    {purchase.itemCount === 1 ? 'producto' : 'productos'}
                  </Text>
                  <Text style={[styles.total, { color: neonColor }]}>
                    {formatCurrency(purchase.total)}
                  </Text>
                </View>

                {purchase.listSavings > 0 ? (
                  <Text style={styles.savings}>
                    Ahorraste {formatCurrency(purchase.listSavings)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
