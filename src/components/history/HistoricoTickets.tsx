import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
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
  onDeletePurchase?: (id: string) => void;
  onClearAll?: () => void;
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

export function HistoricoTickets({
  purchases,
  onDeletePurchase,
  onClearAll,
}: HistoricoTicketsProps) {
  const router = useRouter();
  const groups = groupPurchasesByMonth(purchases);
  const { styles: menuContentStyles, m } = useMenuContentStyles();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          gap: m.spacingMd,
        },
        toolbar: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          marginBottom: 2,
        },
        clearBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: 'rgba(193, 18, 31, 0.55)',
          backgroundColor: 'rgba(193, 18, 31, 0.12)',
        },
        clearBtnPressed: {
          opacity: 0.85,
        },
        clearBtnText: {
          fontSize: Math.max(11, m.caption - 1),
          fontWeight: '800',
          color: '#FF8A8A',
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
        headerActions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        deleteIconBtn: {
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(193, 18, 31, 0.14)',
          borderWidth: 1,
          borderColor: 'rgba(193, 18, 31, 0.4)',
        },
        deleteIconPressed: {
          opacity: 0.8,
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
        monthTotalRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: m.spacingSm,
          paddingTop: m.spacingSm,
          paddingHorizontal: m.spacingSm,
          paddingBottom: m.spacingXs,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: homeColors.border,
          backgroundColor: 'rgba(0, 229, 255, 0.08)',
        },
        monthTotalLabel: {
          flex: 1,
          fontSize: m.body,
          fontWeight: '800',
          color: homeColors.text,
        },
        monthTotalAmount: {
          fontSize: m.title,
          fontWeight: '900',
          color: homeColors.neonBlue,
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

  const confirmDeleteOne = (purchase: CompletedPurchaseRecord) => {
    if (!onDeletePurchase) return;
    Alert.alert(
      'Eliminar ticket',
      `¿Borrar la compra de ${purchase.supermarketName} (${formatCurrency(purchase.total)})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onDeletePurchase(purchase.id),
        },
      ]
    );
  };

  const confirmClearAll = () => {
    if (!onClearAll) return;
    Alert.alert(
      'Borrar historial',
      `Se van a eliminar ${purchases.length} ticket${purchases.length === 1 ? '' : 's'} de compra. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: onClearAll,
        },
      ]
    );
  };

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
      {onClearAll ? (
        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Borrar todo el historial de tickets"
            onPress={withClickSound(confirmClearAll)}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
          >
            <Ionicons name="trash-outline" size={16} color="#FF8A8A" />
            <Text style={styles.clearBtnText}>Borrar historial</Text>
          </Pressable>
        </View>
      ) : null}

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
                  <View style={styles.headerActions}>
                    {onDeletePurchase ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar ticket de ${purchase.supermarketName}`}
                        hitSlop={8}
                        onPress={withClickSound(() => confirmDeleteOne(purchase))}
                        style={({ pressed }) => [
                          styles.deleteIconBtn,
                          pressed && styles.deleteIconPressed,
                        ]}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FF8A8A" />
                      </Pressable>
                    ) : null}
                    <Ionicons name="chevron-forward" size={m.iconSm} color={homeColors.textMuted} />
                  </View>
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

          <View style={styles.monthTotalRow}>
            <Text style={styles.monthTotalLabel}>
              Total mes {group.monthName}
            </Text>
            <Text style={styles.monthTotalAmount}>
              {formatCurrency(group.monthTotal)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
