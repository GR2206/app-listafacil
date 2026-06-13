import { View, Text, StyleSheet } from 'react-native';

import { SimpleHorizontalBar } from '@/components/merchant/SimpleHorizontalBar';
import { homeColors } from '@/theme/home';
import { typography, spacing, radii } from '@/theme';

interface MerchantHeroCardProps {
  label: string;
  value: number;
  barMax: number;
  color: string;
  subtitle?: string;
}

export function MerchantHeroCard({
  label,
  value,
  barMax,
  color,
  subtitle,
}: MerchantHeroCardProps) {
  return (
    <View style={[styles.card, { borderColor: `${color}44` }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <SimpleHorizontalBar value={value} max={barMax} color={color} width={300} height={12} />
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: homeColors.panel,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: homeColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  subtitle: {
    fontSize: typography.caption,
    color: homeColors.textMuted,
  },
});
