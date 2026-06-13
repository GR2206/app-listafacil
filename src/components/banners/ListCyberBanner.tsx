import { useCallback, useMemo } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useBannerManager } from '@/hooks/useBannerManager';
import { getSupermarketNeonColor } from '@/components/home/supermarketOrbTheme';
import { openBannerTarget } from '@/utils/openBannerTarget';
import { hexToRgba } from '@/utils/hexToRgba';
import { withClickSound } from '@/utils/withClickSound';

const LIST_BANNER_ART = require('../../../assets/list_banner_300x50.png');

export const LIST_BANNER_WIDTH = 300;
export const LIST_BANNER_HEIGHT = 50;
const BANNER_RADIUS = 10;
/** Destello ~15% más chico que la versión anterior */
const GLOW_SCALE = 0.85;
const GLOW_SPREAD = Math.round(10 * GLOW_SCALE);

const ACCESSIBILITY_LABEL = 'ListaFacil te cuida el bolsillo';
const DEFAULT_SUPERMARKET_ID = 'carrefour';

interface ListCyberBannerProps {
  supermarketId?: string;
  style?: StyleProp<ViewStyle>;
}

export function ListCyberBanner({
  supermarketId = DEFAULT_SUPERMARKET_ID,
  style,
}: ListCyberBannerProps) {
  const { getBanner } = useBannerManager();
  const resolved = getBanner('list_banner');

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

  const openTarget = useCallback(async () => {
    await openBannerTarget('list_banner', resolved.targetUrl);
  }, [resolved.targetUrl]);

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

      <Pressable
        style={({ pressed }) => [styles.root, pressed && styles.rootPressed]}
        onPress={withClickSound(() => void openTarget())}
        disabled={!resolved.targetUrl}
        accessibilityRole="button"
        accessibilityLabel={ACCESSIBILITY_LABEL}
        accessibilityHint="Abre el enlace promocional configurado"
      >
        <Image
          source={LIST_BANNER_ART}
          style={styles.art}
          resizeMode="stretch"
          accessibilityIgnoresInvertColors
        />
      </Pressable>
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
  root: {
    width: LIST_BANNER_WIDTH,
    height: LIST_BANNER_HEIGHT,
    borderRadius: BANNER_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#020612',
    zIndex: 1,
  },
  rootPressed: {
    opacity: 0.94,
  },
  art: {
    width: LIST_BANNER_WIDTH,
    height: LIST_BANNER_HEIGHT,
    borderRadius: BANNER_RADIUS,
  },
});
