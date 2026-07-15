import { useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { getSupermarketNeonColor } from '@/components/home/supermarketOrbTheme';
import {
  LIST_BANNER_ASPECT_RATIO,
  LIST_BANNER_MIN_HEIGHT,
} from '@/config/bannerDimensions';

interface ListBannerGlowFrameProps {
  supermarketId: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Marco del banner lista con brillo (shadow) del color del supermercado. */
export function ListBannerGlowFrame({
  supermarketId,
  children,
  style,
}: ListBannerGlowFrameProps) {
  const glowColor = getSupermarketNeonColor(supermarketId);

  const glowStyle = useMemo(
    () => ({
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 0 } as const,
      shadowOpacity: 0.6,
      shadowRadius: 15,
      ...(Platform.OS === 'android' ? { elevation: 10 } : null),
    }),
    [glowColor]
  );

  return (
    <View style={[styles.glowFrame, glowStyle, style]}>
      <View style={styles.mediaClip}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  glowFrame: {
    alignSelf: 'stretch',
    minHeight: LIST_BANNER_MIN_HEIGHT,
    aspectRatio: LIST_BANNER_ASPECT_RATIO,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  mediaClip: {
    alignSelf: 'stretch',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
