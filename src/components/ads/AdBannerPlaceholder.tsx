import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';

interface AdBannerPlaceholderProps {
  variant?: 'premium' | 'standard';
  compact?: boolean;
}

export function AdBannerPlaceholder({ variant = 'standard', compact = false }: AdBannerPlaceholderProps) {
  return (
    <View
      style={[
        styles.box,
        compact && styles.compact,
        variant === 'premium' && styles.premium,
      ]}
      accessibilityLabel="Espacio publicitario"
    >
      <Text style={styles.text}>
        {variant === 'premium' ? '★ Oferta destacada' : 'Publicidad'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  compact: {
    minHeight: 28,
  },
  premium: {
    minHeight: 120,
    backgroundColor: '#FFF8E7',
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: 12,
    margin: 12,
  },
  text: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
