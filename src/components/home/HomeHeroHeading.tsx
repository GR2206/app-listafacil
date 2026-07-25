import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';

import { APP_FONT_FAMILY } from '@/services/preloadAppFonts';
import { homeColors } from '@/theme/home';
import { spacing, radii } from '@/theme';

const HEADING = '¿A QUÉ SÚPER VAS HOY?';
const GLOW_CYCLE_MS = 4000;

export function HomeHeroHeading() {
  const { width } = useWindowDimensions();
  const glowPulse = useRef(new Animated.Value(0.28)).current;

  const titleSize = width < 340 ? 18 : width < 390 ? 20 : 22;
  const lineHeight = Math.round(titleSize * 1.1);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.88,
          duration: GLOW_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.28,
          duration: GLOW_CYCLE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [glowPulse]);

  const titleStyle = {
    fontFamily: APP_FONT_FAMILY,
    fontSize: titleSize,
    lineHeight,
    letterSpacing: 0.35,
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    maxWidth: '100%' as const,
  };

  return (
    <View style={styles.wrap} accessibilityRole="header">
      <View style={styles.textPanel}>
      <View style={[styles.titleStack, { minHeight: lineHeight * 1.15 }]}>
        <Text
          style={[
            titleStyle,
            styles.layer,
            {
              color: 'rgba(0, 0, 0, 0.55)',
              transform: [{ translateY: 3 }],
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.68}
          accessibilityElementsHidden
        >
          {HEADING}
        </Text>

        <Text
          style={[
            titleStyle,
            styles.layer,
            {
              color: 'transparent',
              textShadowColor: 'rgba(0, 0, 0, 0.85)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 6,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.68}
          accessibilityElementsHidden
        >
          {HEADING}
        </Text>

        <Animated.Text
          style={[
            titleStyle,
            styles.layer,
            {
              color: homeColors.neonBlue,
              opacity: glowPulse,
              textShadowColor: homeColors.neonBlue,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 18,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.68}
          accessibilityElementsHidden
        >
          {HEADING}
        </Animated.Text>

        <Text
          style={[
            titleStyle,
            styles.layer,
            {
              color: '#FFFFFF',
              textShadowColor: 'rgba(0, 0, 0, 0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.68}
        >
          {HEADING}
        </Text>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    paddingBottom: spacing.sm,
  },
  textPanel: {
    width: '100%',
    backgroundColor: homeColors.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: homeColors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  titleStack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    textAlign: 'center',
    width: '100%',
  },
});
