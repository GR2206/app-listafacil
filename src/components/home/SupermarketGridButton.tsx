import { memo, useEffect, useRef } from 'react';

import { View, Pressable, StyleSheet, Platform, Animated, Easing, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Supermarket } from '@/types';

import { SupermarketOrbLogo } from '@/components/home/SupermarketOrbLogo';

import { fireInstantFeedback } from '@/utils/fireInstantFeedback';
import { hexToRgba } from '@/utils/hexToRgba';

import { HOME_ORB_VISUAL_SCALE } from '@/components/home/homeGridLayout';
import {
  buildOrbBreathRange,
  getOrbGlowPhaseOffset,
  getSupermarketNeonColor,
  getSupermarketNeonColorForIndex,
  ORB_BREATH_SINE_INPUT,
  type OrbVisualPresetId,
} from '@/components/home/supermarketOrbTheme';
import { getOrbVisualPreset } from '@/components/home/supermarketOrbVisualPresets';

interface SupermarketGridButtonProps {
  market: Supermarket;
  orbSize: number;
  slotOrbSize?: number;
  onPress: () => void;
  visualPreset?: OrbVisualPresetId;
  entranceIndex?: number;
  isHot?: boolean;
  isFavorite?: boolean;
}

const BEZEL_WIDTH = 6;
const ENTRANCE_STAGGER_MS = 85;

function SupermarketGridButtonComponent({
  market,
  orbSize,
  slotOrbSize,
  onPress,
  visualPreset = 'current',
  entranceIndex = 0,
  isHot = false,
  isFavorite = false,
}: SupermarketGridButtonProps) {
  const preset = getOrbVisualPreset(visualPreset);
  const orbAnimation = preset.animation;
  const glowLayers = preset.glowLayers;
  const plasmaRing = preset.plasmaRing;
  const sparkleOffsets = preset.sparkleOffsets;
  const slotPadding = preset.grid.slotPadding;
  const neonColor = getSupermarketNeonColor(market.id);
  const footprint = slotOrbSize ?? Math.round(orbSize / HOME_ORB_VISUAL_SCALE);
  const orbRadius = orbSize / 2;
  const bezelSize = orbSize + BEZEL_WIDTH * 2;
  const plasmaSize = orbSize + plasmaRing.spread * 2;
  const slotSize = footprint + slotPadding * 2;

  const press = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const favoritePulse = useRef(new Animated.Value(1)).current;
  const hotPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = entranceIndex * ENTRANCE_STAGGER_MS;
    const timer = setTimeout(() => {
      Animated.spring(entrance, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [entrance, entranceIndex]);

  useEffect(() => {
    if (!isFavorite) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(favoritePulse, {
          toValue: 1.18,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(favoritePulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [favoritePulse, isFavorite]);

  useEffect(() => {
    if (!isHot) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hotPulse, {
          toValue: 1.18,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(hotPulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [hotPulse, isHot]);

  useEffect(() => {
    const duration = orbAnimation.breatheDurationMs;
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
      duration: orbAnimation.pressDurationMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(press, {
      toValue: 0,
      duration: orbAnimation.pressDurationMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const breatheGlowScale = breathe.interpolate({
    inputRange: [...ORB_BREATH_SINE_INPUT],
    outputRange: buildOrbBreathRange(
      orbAnimation.breatheGlowScaleMin,
      orbAnimation.breatheGlowScaleMax
    ),
    extrapolate: 'clamp',
  });

  const breatheGlowOpacity = breathe.interpolate({
    inputRange: [...ORB_BREATH_SINE_INPUT],
    outputRange: buildOrbBreathRange(
      orbAnimation.breatheGlowOpacityMin,
      orbAnimation.breatheGlowOpacityMax
    ),
    extrapolate: 'clamp',
  });

  const pressGlowOpacity = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, orbAnimation.pressGlowOpacity],
  });

  const combinedGlowOpacity = Animated.multiply(breatheGlowOpacity, pressGlowOpacity);

  const orbScale = press.interpolate({
    inputRange: [0, 1],
    outputRange: [1, orbAnimation.pressScale],
  });

  const orbTranslateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, orbAnimation.pressTranslateY],
  });

  const bezelTranslateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [0, orbAnimation.pressBezelInset],
  });

  const shadowTranslateY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [9, 9 + orbAnimation.pressBezelInset * 0.45],
  });

  const entranceScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  const entranceOpacity = entrance.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.85, 1],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { width: slotSize, height: slotSize },
        {
          opacity: entranceOpacity,
          transform: [{ scale: entranceScale }],
        },
      ]}
    >
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Entrar a ${market.name}`}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.pressableFill}
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
          {glowLayers.map((layer, layerIndex) => {
            const glowSize = orbSize + layer.spread * 2;
            const glowOffset = (orbSize - glowSize) / 2;
            const layerColor = getSupermarketNeonColorForIndex(market.id, layerIndex);

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
                    backgroundColor: hexToRgba(layerColor, layer.opacity),
                  },
                ]}
              />
            );
          })}

          <View pointerEvents="none" style={styles.sparkleField}>
            {sparkleOffsets.map((sparkle, index) => {
              const position: Record<string, string | number> = {};
              if (sparkle.top != null) position.top = sparkle.top;
              if (sparkle.bottom != null) position.bottom = sparkle.bottom;
              if (sparkle.left != null) position.left = sparkle.left;
              if (sparkle.right != null) position.right = sparkle.right;
              const sparkleColor = getSupermarketNeonColorForIndex(market.id, index);

              return (
                <View
                  key={index}
                  style={[
                    styles.sparkle,
                    {
                      width: sparkle.size,
                      height: sparkle.size,
                      borderRadius: sparkle.size / 2,
                      backgroundColor: hexToRgba(sparkleColor, sparkle.opacity),
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
          <Animated.View
            style={[
              styles.chromeBezel,
              {
                width: bezelSize,
                height: bezelSize,
                borderRadius: bezelSize / 2,
                transform: [{ translateY: bezelTranslateY }],
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
                borderWidth: plasmaRing.borderWidth,
                borderColor: hexToRgba(neonColor, plasmaRing.opacity),
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.plasmaHairline,
              {
                width: plasmaSize - 4,
                height: plasmaSize - 4,
                borderRadius: (plasmaSize - 4) / 2,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.dropShadow,
              { width: orbSize, height: orbSize, borderRadius: orbRadius },
              Platform.OS === 'ios' && styles.dropShadowIos,
              { transform: [{ translateX: -4 }, { translateY: shadowTranslateY }] },
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
                shadowOpacity: orbAnimation.neonShadowOpacity,
                shadowRadius: orbAnimation.neonShadowRadius,
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

            <View
              pointerEvents="none"
              style={[
                styles.buttonHairlineOuter,
                { width: orbSize, height: orbSize, borderRadius: orbRadius },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.buttonHairlineInner,
                {
                  width: orbSize - 4,
                  height: orbSize - 4,
                  borderRadius: orbRadius - 2,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.buttonTopCap,
                {
                  width: orbSize * 0.74,
                  height: orbSize * 0.3,
                  borderTopLeftRadius: orbSize * 0.37,
                  borderTopRightRadius: orbSize * 0.37,
                  top: orbSize * 0.05,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.buttonEquatorLine,
                { width: orbSize * 0.78, top: orbSize * 0.48 },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.buttonBaseLine,
                { width: orbSize * 0.62, bottom: orbSize * 0.09 },
              ]}
            />

            <SupermarketOrbLogo marketId={market.id} orbSize={orbSize} />
          </View>
        </Animated.View>
      </View>

      {isHot ? (
        <Animated.View
          style={[styles.hotBadge, { transform: [{ scale: hotPulse }] }]}
          accessibilityLabel="Ofertas del día"
        >
          <Text style={styles.hotEmoji}>🔥</Text>
          <Text style={styles.hotLabel}>Precio bajo</Text>
        </Animated.View>
      ) : null}

      {isFavorite ? (
        <Animated.View
          style={[styles.favoriteBadge, { transform: [{ scale: favoritePulse }] }]}
          accessibilityLabel="Tu súper favorito"
        >
          <Ionicons name="heart" size={12} color="#FF4D6D" />
        </Animated.View>
      ) : null}
    </Pressable>
    </Animated.View>
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
  pressableFill: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#1A1A20',
    borderWidth: 3.5,
    borderTopColor: '#D8D8E4',
    borderLeftColor: '#A8A8B8',
    borderBottomColor: '#24242C',
    borderRightColor: '#484850',
  },
  plasmaRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  plasmaHairline: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.42)',
    backgroundColor: 'transparent',
  },
  dropShadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    borderTopColor: 'rgba(255, 255, 255, 0.55)',
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomColor: 'rgba(0, 0, 0, 0.85)',
    borderRightColor: 'rgba(0, 0, 0, 0.68)',
    zIndex: 7,
  },
  buttonHairlineOuter: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.78)',
    zIndex: 9,
  },
  buttonHairlineInner: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    zIndex: 9,
  },
  buttonTopCap: {
    position: 'absolute',
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.92)',
    borderLeftColor: 'rgba(255, 255, 255, 0.38)',
    borderRightColor: 'rgba(255, 255, 255, 0.38)',
    backgroundColor: 'transparent',
    zIndex: 8,
  },
  buttonEquatorLine: {
    position: 'absolute',
    alignSelf: 'center',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    zIndex: 8,
  },
  buttonBaseLine: {
    position: 'absolute',
    alignSelf: 'center',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    zIndex: 8,
  },
  hotBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.65)',
    zIndex: 20,
  },
  hotEmoji: {
    fontSize: 10,
    lineHeight: 12,
  },
  hotLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFD166',
    letterSpacing: 0.2,
  },
  favoriteBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});
