import { View, Text, StyleSheet } from 'react-native';

import { homeColors } from '@/theme/home';

import { radii } from '@/theme';

export function PremiumTopBanner() {
  return (
    <View style={styles.container} accessibilityLabel="Oferta destacada">
      <Text style={styles.star}>★</Text>
      <Text style={styles.text} numberOfLines={2}>
        OFERTA EXCLUSIVA: ¡20% DE DESCUENTO EN LÁCTEOS!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 28, 0.55)',
    borderWidth: 1.5,
    borderColor: homeColors.bannerPremiumBorder,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 46,
    gap: 8,
  },
  star: {
    fontSize: 16,
    color: homeColors.bannerPremiumBorder,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.35,
    lineHeight: 16,
  },
});
