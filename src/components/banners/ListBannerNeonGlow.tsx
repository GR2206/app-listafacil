import { useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { getSupermarketNeonColor } from '@/components/home/supermarketOrbTheme';
import {
  LIST_BANNER_HEIGHT,
  LIST_BANNER_WIDTH,
} from '@/config/bannerDimensions';
import { hexToRgba } from '@/utils/hexToRgba';

const BANNER_RADIUS = 10;
const GLOW_SCALE = 0.85;
const GLOW_SPREAD = Math.round(10 * GLOW_SCALE);

interface ListBannerNeonGlowProps {
  supermarketId: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Halo neón del color del súper, detrás del banner 300×50. */
export function ListBannerNeonGlow({ supermarketId, style, children }: ListBannerNeonGlowProps) {
  const neonColor = getSupermarketNeonColor(supermarketId);

  const glowOuterStyle = useMemo(
    () => ({
      backgroundColor: hexToRgba(neonColor, 0.055),
      borderRadius: BANNER_RADIUS + 5,
      shadowColor: neonColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: Platform.OS === 'ios' ? 0.48 : 0.38,
      shadowRadius: 26,
      elevation: 6,
    }),
    [neonColor]
  );

  const glowInnerStyle = useMemo(
    () => ({
      backgroundColor: hexToRgba(neonColor, 0.1),
      borderRadius: BANNER_RADIUS + 2,
      shadowColor: neonColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: Platform.OS === 'ios' ? 0.58 : 0.45,
      shadowRadius: 16,
      elevation: 4,
    }),
    [neonColor]
  );

  return (
    <View style={[styles.wrap, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.glowOuter,
          glowOuterStyle,
          {
            width: LIST_BANNER_WIDTH + GLOW_SPREAD * 2,
            height: LIST_BANNER_HEIGHT + GLOW_SPREAD * 2,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glowInner,
          glowInnerStyle,
          {
            width: LIST_BANNER_WIDTH + GLOW_SPREAD,
            height: LIST_BANNER_HEIGHT + GLOW_SPREAD,
          },
        ]}
      />
      <View style={styles.bannerLayer}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: LIST_BANNER_WIDTH + GLOW_SPREAD * 2,
    minHeight: LIST_BANNER_HEIGHT + GLOW_SPREAD * 2,
  },
  glowOuter: {
    position: 'absolute',
  },
  glowInner: {
    position: 'absolute',
  },
  bannerLayer: {
    zIndex: 1,
  },
});

export const listBannerGlowSpread = GLOW_SPREAD;
