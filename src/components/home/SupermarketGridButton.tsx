import { memo, useEffect, useRef } from 'react';

import { View, Pressable, StyleSheet, Platform, Animated, Easing } from 'react-native';

import type { Supermarket } from '@/types';

import { SupermarketOrbLogo } from '@/components/home/SupermarketOrbLogo';

import { fireInstantFeedback } from '@/utils/fireInstantFeedback';
import { hexToRgba } from '@/utils/hexToRgba';

import { HOME_ORB_VISUAL_SCALE } from '@/components/home/homeGridLayout';
import {
  buildOrbBreathRange,
  getOrbGlowPhaseOffset,
  getSupermarketNeonColor,
  ORB_ANIMATION,
  ORB_BREATH_SINE_INPUT,
  ORB_NEON_GLOW_LAYERS,
  ORB_PLASMA_RING,
  ORB_SPARKLE_OFFSETS,
} from '@/components/home/supermarketOrbTheme';

interface SupermarketGridButtonProps {
  market: Supermarket;
  /** Tamaño visual del orbe (logo + glow). */
  orbSize: number;
  /** Huella del slot en grilla — conserva espacios entre botones. */
  slotOrbSize?: number;
  onPress: () => void;
}

const BEZEL_WIDTH = 6;
const SLOT_PADDING = 12;

function SupermarketGridButtonComponent({
  market,
  orbSize,
  slotOrbSize,
  onPress,
}: SupermarketGridButtonProps) {
  const neonColor = getSupermarketNeonColor(market.id);
  const footprint = slotOrbSize ?? Math.round(orbSize / HOME_ORB_VISUAL_SCALE);
  const orbRadius = orbSize / 2;
  const bezelSize = orbSize + BEZEL_WIDTH * 2;
  const plasmaSize = orbSize + ORB_PLASMA_RING.spread * 2;
  const slotSize = footprint + SLOT_PADDING * 2;

  const press = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = ORB_ANIMATION.breatheDurationMs;
    const phase = getOrbGlowPhaseOffset(market.id);
    breathe.setValue(phase);

    const finishInitialCycle = Animated.timing(breathe, {
      toValue: 1,
      duration: Math.max(1, Math.round(duration * (1 - phase))),
      easing: Easing.linear,
      useNativeDriver: true,
    });

    const resetCycleStart = Animated.timing(breathe, {
      toValue: 0,
      duration: 0,
      useNativeDriver: true,
    });

    const fullCycles = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const breatheAnim = Animated.sequence([finishInitialCycle, resetCycleStart, fullCycles]);
    breatheAnim.start();

    return () => {
      breatheAnim.stop();
    };
  }, [breathe, market.id]);

  const handlePressIn = () => {
    fireInstantFeedback({ sound: 'click', haptic: 'selection' });
    Animated.timing(press, {
      toValue: 1,
      duration: ORB_ANIMATION.pressDurationMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(press, {
      toValue: 0,
      duration: ORB_ANIMATION.pressDurationMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const breatheGlowScale = breathe.interpolate({
    inputRange: [...ORB_BREATH_SINE_INPUT],
    outputRange: buildOrbBreathRange(
      ORB_ANIMATION.breatheGlowScaleMin,
      ORB_ANIMATION.breatheGlowScaleMax
    ),
    extrapolate: 'clamp',
  });

  const breatheGlowOpacity = breathe.interpolate({
    inputRange: [...ORB_BREATH_SINE_INPUT],
    outputRange: buildOrbBreathRange(
      ORB_ANIMATION.breatheGlowOpacityMin,
      ORB_ANIMATION.breatheGlowOpacityMax
    ),
    extrapolate: 'clamp',
  });

  const pressGlowOpacity = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, ORB_ANIMATION.pressGlowOpacity],
  });

  const combinedGlowOpacity = Animated.multiply(breatheGlowOpacity, pressGlowOpacity);

  const orbScale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, ORB_ANIMATION.pressScale],
  });

  const orbTranslateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, ORB_ANIMATION.pressTranslateY],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Entrar a ${market.name}`}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.wrapper, { width: slotSize, height: slotSize }]}
    >
      <View style={[styles.orbAnchor, { width: orbSize, height: orbSize }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowStack,
            {
              opacity: combinedGlowOpacity,
              transform: [{ scale: breatheGlowScale }],
            },
          ]}
        >
          {ORB_NEON_GLOW_LAYERS.map((layer) => {
            const glowSize = orbSize + layer.spread * 2;
            const glowOffset = (orbSize - glowSize) / 2;

            return (
              <View
                key={layer.spread}
                style={[
                  styles.neonGlow,
                  {
                    top: glowOffset,
                    left: glowOffset,
                    width: glowSize,
                    height: glowSize,
                    borderRadius: glowSize / 2,
                    backgroundColor: hexToRgba(neonColor, layer.opacity),
                  },
                ]}
              />
            );
          })}

          <View pointerEvents="none" style={styles.sparkleField}>
            {ORB_SPARKLE_OFFSETS.map((sparkle, index) => {
              const position: Record<string, string | number> = {};
              if ('top' in sparkle) position.top = sparkle.top;
              if ('bottom' in sparkle) position.bottom = sparkle.bottom;
              if ('left' in sparkle) position.left = sparkle.left;
              if ('right' in sparkle) position.right = sparkle.right;

              return (
                <View
                  key={index}
                  style={[
                    styles.sparkle,
                    {
                      width: sparkle.size,
                      height: sparkle.size,
                      borderRadius: sparkle.size / 2,
                      backgroundColor: hexToRgba(neonColor, sparkle.opacity),
                      ...position,
                    },
                  ]}
                />
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.orbStack,
            {
              transform: [{ translateY: orbTranslateY }, { scale: orbScale }],
            },
          ]}
        >
          <View
            style={[
              styles.chromeBezel,
              {
                width: bezelSize,
                height: bezelSize,
                borderRadius: bezelSize / 2,
              },
            ]}
          />

          <View
            style={[
              styles.plasmaRing,
              {
                width: plasmaSize,
                height: plasmaSize,
                borderRadius: plasmaSize / 2,
                borderWidth: ORB_PLASMA_RING.borderWidth,
                borderColor: hexToRgba(neonColor, ORB_PLASMA_RING.opacity),
              },
            ]}
          />

          <View
            style={[
              styles.dropShadow,
              { width: orbSize, height: orbSize, borderRadius: orbRadius },
              Platform.OS === 'ios' && styles.dropShadowIos,
            ]}
          />

          <View
            style={[
              styles.glassOrb,
              {
                width: orbSize,
                height: orbSize,
                borderRadius: orbRadius,
              },
              Platform.OS === 'ios' && {
                shadowColor: neonColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: ORB_ANIMATION.neonShadowOpacity,
                shadowRadius: ORB_ANIMATION.neonShadowRadius,
              },
            ]}
          >
            <View style={[styles.orbBody, { borderRadius: orbRadius }]} />
            <View style={[styles.orbGlossTop, { borderRadius: orbRadius }]} />
            <View style={[styles.orbDepth, { borderRadius: orbRadius }]} />
            <View style={[styles.orbInnerShadow, { borderRadius: orbRadius }]} />

            <View
              style={[
                styles.specularMain,
                {
                  width: orbSize * 0.58,
                  height: orbSize * 0.34,
                  borderRadius: orbSize * 0.2,
                  top: orbSize * 0.04,
                  left: orbSize * 0.08,
                },
              ]}
            />
            <View
              style={[
                styles.specularCorner,
                {
                  width: orbSize * 0.16,
                  height: orbSize * 0.1,
                  borderRadius: orbSize * 0.05,
                  top: orbSize * 0.1,
                  right: orbSize * 0.12,
                },
              ]}
            />

            <View
              pointerEvents="none"
              style={[styles.glassRim, { width: orbSize, height: orbSize, borderRadius: orbRadius }]}
            />

            <SupermarketOrbLogo marketId={market.id} orbSize={orbSize} />
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export const SupermarketGridButton = memo(SupermarketGridButtonComponent);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  orbAnchor: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glowStack: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  orbStack: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  neonGlow: {
    position: 'absolute',
  },
  sparkleField: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sparkle: {
    position: 'absolute',
  },
  chromeBezel: {
    position: 'absolute',
    backgroundColor: '#1C1C22',
    borderWidth: 3,
    borderTopColor: '#B8B8C8',
    borderLeftColor: '#9090A0',
    borderBottomColor: '#303038',
    borderRightColor: '#505058',
  },
  plasmaRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  dropShadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    transform: [{ translateX: -4 }, { translateY: 9 }],
    zIndex: 0,
  },
  dropShadowIos: {
    shadowColor: '#000000',
    shadowOffset: { width: -3, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
  },
  glassOrb: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    zIndex: 2,
    elevation: 12,
  },
  orbBody: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020204',
  },
  orbGlossTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  orbDepth: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    transform: [{ translateX: 1 }, { translateY: 4 }],
  },
  orbInnerShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  specularMain: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    zIndex: 2,
  },
  specularCorner: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    zIndex: 2,
  },
  glassRim: {
    position: 'absolute',
    borderWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    borderLeftColor: 'rgba(255, 255, 255, 0.25)',
    borderBottomColor: 'rgba(0, 0, 0, 0.8)',
    borderRightColor: 'rgba(0, 0, 0, 0.62)',
    zIndex: 7,
  },
});
