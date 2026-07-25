import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { SUPERMARKET_LOGOS } from '@/assets/supermarketLogos';
import { getSupermarketNeonColor } from '@/components/home/supermarketOrbTheme';

type SupermarketLogoBadgeProps = {
  marketId: string;
  /** Diámetro del círculo. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Badge tipo Vea: plato blanco + anillo del color del súper + logo centrado.
 * Usado en el carrusel de oferta del día.
 */
export function SupermarketLogoBadge({
  marketId,
  size = 36,
  style,
  accessibilityLabel,
}: SupermarketLogoBadgeProps) {
  const source = SUPERMARKET_LOGOS[marketId];
  if (!source) return null;

  const ring = getSupermarketNeonColor(marketId);
  const borderW = Math.max(2, Math.round(size * 0.07));
  // Antes el logo ocupaba ~58% del diámetro; +50% → ~87% (casi al anillo).
  const logoBox = Math.max(12, Math.round((size - borderW * 2) * 0.92));

  return (
    <View
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderW,
          borderColor: ring,
          shadowColor: ring,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={source}
        style={{ width: logoBox, height: logoBox }}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
