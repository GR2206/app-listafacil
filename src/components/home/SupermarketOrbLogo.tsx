import { View, Image, StyleSheet } from 'react-native';

import { SUPERMARKET_LOGOS } from '@/assets/supermarketLogos';
import { getOrbLogoSize } from '@/components/home/orbLogoMetrics';

interface SupermarketOrbLogoProps {
  marketId: string;
  orbSize: number;
}

export function SupermarketOrbLogo({ marketId, orbSize }: SupermarketOrbLogoProps) {
  const clipStyle = {
    width: orbSize,
    height: orbSize,
    borderRadius: orbSize / 2,
  };

  const source = SUPERMARKET_LOGOS[marketId];
  if (!source) return null;

  const logoSize = getOrbLogoSize(marketId, orbSize);

  return (
    <View style={[styles.clipSlot, clipStyle]}>
      <Image
        source={source}
        style={[styles.logo, { width: logoSize, height: logoSize }]}
        resizeMode="contain"
        accessibilityLabel={`Logo ${marketId}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clipSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 6,
  },
  logo: {
    alignSelf: 'center',
  },
});


