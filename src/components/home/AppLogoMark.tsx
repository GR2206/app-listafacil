import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { homeColors } from '@/theme/home';

const LOGO = require('../../../assets/logo_final.png');

const NEON_CYAN = homeColors.neonBlue;
const NEON_CYAN_SOFT = homeColors.neonBlueSoft;
const SATIN_BLACK = '#0A0C12';

type LogoVariant = 'default' | 'compact' | 'hero' | 'splash';
type LogoShape = 'circle' | 'squircle';
type LogoGlow = 'cyan' | 'warm';

interface AppLogoMarkProps {
  variant?: LogoVariant;
  shape?: LogoShape;
  glow?: LogoGlow;
  style?: StyleProp<ViewStyle>;
}

const DISC_SIZE: Record<LogoVariant, number> = {
  splash: 292,
  hero: 268,
  default: 232,
  compact: 200,
};

interface GlowSpec {
  spread: number;
  opacity: number;
  blur: number;
  color: string;
}

const CYAN_GLOW: GlowSpec[] = [
  { spread: 48, opacity: 0.1, blur: 34, color: NEON_CYAN_SOFT },
  { spread: 30, opacity: 0.16, blur: 24, color: NEON_CYAN },
  { spread: 14, opacity: 0.28, blur: 14, color: NEON_CYAN },
];

const WARM_GLOW: GlowSpec[] = [
  { spread: 56, opacity: 0.09, blur: 42, color: homeColors.splashGlowOuter },
  { spread: 38, opacity: 0.16, blur: 30, color: homeColors.splashGlowMid },
  { spread: 20, opacity: 0.26, blur: 18, color: homeColors.splashGlowCore },
  { spread: 8, opacity: 0.12, blur: 10, color: NEON_CYAN_SOFT },
];

function getCornerRadius(size: number, shape: LogoShape): number {
  return shape === 'squircle' ? Math.round(size * 0.24) : size / 2;
}

function NeonGlowRing({
  size,
  opacity,
  blur,
  color,
  cornerRadius,
}: {
  size: number;
  opacity: number;
  blur: number;
  color: string;
  cornerRadius: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.glowRing,
        {
          width: size,
          height: size,
          borderRadius: cornerRadius,
          backgroundColor: color,
          opacity,
          shadowColor: color,
          shadowRadius: blur,
          shadowOpacity: 1,
        },
      ]}
    />
  );
}

export function AppLogoMark({
  variant = 'compact',
  shape,
  glow,
  style,
}: AppLogoMarkProps) {
  const isSplash = variant === 'splash';
  const resolvedShape = shape ?? (isSplash ? 'squircle' : 'circle');
  const resolvedGlow = glow ?? (isSplash ? 'warm' : 'cyan');

  const discSize = DISC_SIZE[variant];
  const logoSize = Math.round(discSize * (isSplash ? 0.9 : 0.94));
  const cornerRadius = getCornerRadius(discSize, resolvedShape);
  const glowLayers = resolvedGlow === 'warm' ? WARM_GLOW : CYAN_GLOW;
  const haloPadding = isSplash ? 64 : 56;

  const discBg = isSplash ? homeColors.splashDisc : SATIN_BLACK;
  const discBorder =
    resolvedGlow === 'warm'
      ? homeColors.splashDiscBorder
      : 'rgba(0, 229, 255, 0.38)';
  const discShadow =
    resolvedGlow === 'warm' ? homeColors.splashGlowMid : NEON_CYAN;

  return (
    <View
      style={[styles.outer, { width: discSize + haloPadding, height: discSize + haloPadding }, style]}
      accessibilityLabel="Lista Fácil"
    >
      {glowLayers.map((layer) => (
        <NeonGlowRing
          key={`${layer.color}-${layer.spread}`}
          size={discSize + layer.spread}
          opacity={layer.opacity}
          blur={layer.blur}
          color={layer.color}
          cornerRadius={getCornerRadius(discSize + layer.spread, resolvedShape)}
        />
      ))}

      <View
        style={[
          styles.disc,
          {
            width: discSize,
            height: discSize,
            borderRadius: cornerRadius,
            backgroundColor: discBg,
            borderColor: discBorder,
            shadowColor: discShadow,
            shadowRadius: isSplash ? 26 : discSize * 0.08,
            shadowOpacity: isSplash ? 0.72 : 0.55,
          },
        ]}
      >
        <View style={[styles.satinSheen, { borderRadius: cornerRadius }]} />
        <View
          style={[
            styles.satinHighlight,
            {
              borderTopLeftRadius: cornerRadius,
              width: discSize * 0.58,
              height: discSize * 0.42,
            },
          ]}
        />

        <Image
          source={LOGO}
          style={{ width: logoSize, height: logoSize }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
    overflow: 'hidden',
  },
  satinSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  satinHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
});
