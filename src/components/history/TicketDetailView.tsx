import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SupermarketOrbLogo } from '@/components/home/SupermarketOrbLogo';
import { SUPERMARKET_NEON_COLORS } from '@/components/home/supermarketOrbTheme';
import type { CompletedPurchaseRecord } from '@/db/database';
import { homeColors } from '@/theme/home';
import { radii } from '@/theme';
import { useMenuContentStyles } from '@/hooks/useMenuContentStyles';
import { formatCurrency } from '@/utils/formatCurrency';

interface TicketDetailViewProps {
  purchase: CompletedPurchaseRecord;
}

function formatDetailDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TicketDetailView({ purchase }: TicketDetailViewProps) {
  const neonColor =
    SUPERMARKET_NEON_COLORS[purchase.supermarketId] ?? homeColors.neonBlue;
  const { styles: menuContentStyles, m } = useMenuContentStyles();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: {
          paddingBottom: m.paddingBottom,
          gap: m.spacingSm,
        },
        headerCard: {
          backgroundColor: homeColors.panel,
          borderRadius: radii.md,
          borderWidth: 1,
          padding: m.spacingMd,
          shadowOpacity: 0.4,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
          elevation: 4,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: m.spacingMd,
        },
        headerText: {
          flex: 1,
          minWidth: 0,
        },
        marketName: {
          fontSize: m.title,
          fontWeight: '900',
          color: homeColors.text,
        },
        date: {
          fontSize: m.caption,
          color: homeColors.textMuted,
          marginTop: 4,
          textTransform: 'capitalize',
        },
        readOnlyBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: m.spacingMd,
          alignSelf: 'flex-start',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: homeColors.border,
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
        },
        readOnlyText: {
          fontSize: Math.max(9, m.caption - 2),
          fontWeight: '600',
          color: homeColors.textMuted,
        },
        sectionTitle: {
          fontSize: m.caption,
          fontWeight: '800',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: homeColors.neonBlueSoft,
          marginBottom: m.spacingSm,
        },
        lineRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: m.spacingSm,
          paddingVertical: m.spacingSm,
        },
        lineRowBorder: {
          borderBottomWidth: 1,
          borderBottomColor: homeColors.border,
        },
        lineInfo: {
          flex: 1,
          minWidth: 0,
        },
        lineName: {
          fontSize: m.body,
          fontWeight: '700',
          color: homeColors.text,
        },
        lineBrand: {
          fontSize: Math.max(9, m.caption - 2),
          color: homeColors.textMuted,
          marginTop: 2,
        },
        lineQty: {
          fontSize: m.caption,
          color: homeColors.textMuted,
          marginTop: 4,
        },
        lineSubtotal: {
          fontSize: m.body,
          fontWeight: '800',
          color: homeColors.text,
        },
        lineNoPrice: {
          color: homeColors.textMuted,
        },
        totalCard: {
          backgroundColor: homeColors.panel,
          borderRadius: radii.md,
          borderWidth: 1.5,
          padding: m.spacingMd,
          marginTop: m.spacingXs,
        },
        savingsRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: m.spacingSm,
          paddingBottom: m.spacingSm,
          borderBottomWidth: 1,
          borderBottomColor: homeColors.border,
        },
        savingsLabel: {
          fontSize: m.caption,
          color: homeColors.textMuted,
        },
        savingsValue: {
          fontSize: m.body,
          fontWeight: '700',
          color: homeColors.neonBlue,
        },
        totalRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        totalLabel: {
          fontSize: m.title,
          fontWeight: '800',
          color: homeColors.text,
        },
        totalValue: {
          fontSize: Math.round(m.title * 1.35),
          fontWeight: '900',
        },
      }),
    [m]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.headerCard,
          { borderColor: neonColor, shadowColor: neonColor },
        ]}
      >
        <View style={styles.headerRow}>
          <SupermarketOrbLogo marketId={purchase.supermarketId} orbSize={44} />
          <View style={styles.headerText}>
            <Text style={styles.marketName}>{purchase.supermarketName}</Text>
            <Text style={styles.date}>{formatDetailDate(purchase.completedAt)}</Text>
          </View>
        </View>

        <View style={styles.readOnlyBadge}>
          <Ionicons name="lock-closed-outline" size={14} color={homeColors.textMuted} />
          <Text style={styles.readOnlyText}>Solo consulta</Text>
        </View>
      </View>

      <View style={menuContentStyles.sectionPanel}>
        <Text style={styles.sectionTitle}>Productos</Text>

        {purchase.items.map((item, index) => {
          const subtotal = item.unitPrice * item.quantity;
          const hasPrice = item.unitPrice > 0;

          return (
            <View
              key={item.id}
              style={[
                styles.lineRow,
                index < purchase.items.length - 1 && styles.lineRowBorder,
              ]}
            >
              <View style={styles.lineInfo}>
                <Text style={styles.lineName} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.brand ? (
                  <Text style={styles.lineBrand} numberOfLines={1}>
                    {item.brand}
                  </Text>
                ) : null}
                <Text style={styles.lineQty}>
                  {item.quantity} ×{' '}
                  {hasPrice ? formatCurrency(item.unitPrice) : 'Sin precio'}
                </Text>
              </View>
              <Text style={[styles.lineSubtotal, !hasPrice && styles.lineNoPrice]}>
                {hasPrice ? formatCurrency(subtotal) : '—'}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.totalCard, { borderColor: neonColor }]}>
        {purchase.listSavings > 0 ? (
          <View style={styles.savingsRow}>
            <Text style={styles.savingsLabel}>Ahorro estimado</Text>
            <Text style={styles.savingsValue}>
              {formatCurrency(purchase.listSavings)}
            </Text>
          </View>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalValue, { color: neonColor }]}>
            {formatCurrency(purchase.total)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
