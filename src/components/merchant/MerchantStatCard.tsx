import { View, Text, StyleSheet } from 'react-native';

import { SimpleHorizontalBar } from '@/components/merchant/SimpleHorizontalBar';
import { homeColors } from '@/theme/home';
import { typography, spacing, radii } from '@/theme';

interface MerchantStatCardProps {
  title: string;
  value: number;
  barMax: number;
  color: string;
  hint?: string;
}

export function MerchantStatCard({
  title,
  value,
  barMax,
  color,
  hint,
}: MerchantStatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <SimpleHorizontalBar value={value} max={barMax} color={color} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: homeColors.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: homeColors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 8,
  },
  title: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: homeColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  hint: {
    fontSize: 11,
    color: homeColors.textMuted,
  },
});
