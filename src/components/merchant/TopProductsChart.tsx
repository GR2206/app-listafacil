import { View, Text, StyleSheet } from 'react-native';

import { SimpleHorizontalBar } from '@/components/merchant/SimpleHorizontalBar';
import type { TopViewedProduct } from '@/services/merchantAnalytics';
import { homeColors } from '@/theme/home';
import { typography, spacing, radii } from '@/theme';

interface TopProductsChartProps {
  products: TopViewedProduct[];
}

export function TopProductsChart({ products }: TopProductsChartProps) {
  if (products.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>Todavía no hay productos vistos hoy.</Text>
      </View>
    );
  }

  const maxViews = Math.max(...products.map((p) => p.views), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Productos más vistos</Text>
      {products.map((product, index) => (
        <View key={product.barcode} style={styles.row}>
          <View style={styles.nameBlock}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>
          </View>
          <Text style={styles.count}>{product.views}</Text>
          <SimpleHorizontalBar
            value={product.views}
            max={maxViews}
            color="#3B9BFF"
            width={280}
            height={8}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: homeColors.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: homeColors.border,
    padding: spacing.md,
    gap: 14,
  },
  title: {
    fontSize: typography.body,
    fontWeight: '800',
    color: homeColors.text,
  },
  row: {
    gap: 6,
  },
  nameBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rank: {
    width: 18,
    fontSize: 12,
    fontWeight: '800',
    color: homeColors.textMuted,
  },
  name: {
    flex: 1,
    fontSize: typography.caption,
    fontWeight: '600',
    color: homeColors.text,
    lineHeight: 18,
  },
  count: {
    alignSelf: 'flex-end',
    fontSize: 12,
    fontWeight: '800',
    color: homeColors.textMuted,
  },
  emptyCard: {
    backgroundColor: homeColors.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: homeColors.border,
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: typography.caption,
    color: homeColors.textMuted,
    textAlign: 'center',
  },
});
