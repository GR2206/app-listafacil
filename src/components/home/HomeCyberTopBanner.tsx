import { useCallback, useState, type ReactNode } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useBannerManager } from '@/hooks/useBannerManager';
import { APP_FONT_FAMILY } from '@/services/preloadAppFonts';
import { openBannerTarget } from '@/utils/openBannerTarget';
import { withClickSound } from '@/utils/withClickSound';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  FeGaussianBlur,
  Filter,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

const LOGO = require('../../../assets/logo_redondeado.png');

const CYAN = '#00E5FF';
const MAGENTA = '#FF2BD6';
const BG_DARK = '#000814';
const CIRCUIT_LINE = 'rgba(0, 180, 220, 0.14)';
const CIRCUIT_NODE = 'rgba(0, 229, 255, 0.28)';

const HEADLINE =
  'HACER LAS COMPRAS CON LISTAFACIL ES DIFERENTE.';
const SUBLINE = '¿YA LA USASTE HOY?';
const BANNER_ACCESSIBILITY_LABEL =
  'Hacer las compras con ListaFacil es diferente. ¿Ya la usaste hoy?';

const FONT_FAMILY = APP_FONT_FAMILY;

const BANNER_MIN_HEIGHT = 68;
const LOGO_SIZE = Math.round(36 * 1.15);
const LOGO_RING_SIZE = LOGO_SIZE + 6;
const FRAME_PADDING_H = 11;
const FRAME_PADDING_V = 9;
const TEXT_PADDING_H = 10;
const ZONE_GAP = 10;
const COPY_LINE_GAP = 4;
const LINE_HEIGHT_RATIO = 1.08;
/** Margen vertical interno para que el bloque no roce el marco neón */
const VERTICAL_BREATHING = 0.84;
/** Escala global del texto dentro del banner (+35%) */
const FONT_SIZE_BOOST = 1.35;

interface HomeCyberTopBannerProps {
  style?: StyleProp<ViewStyle>;
}

function createCyberFramePath(width: number, height: number): string {
  const w = width;
  const h = height;
  const ch = Math.min(10, w * 0.028);
  const tabHalf = Math.min(22, w * 0.09);
  const tabDepth = Math.min(6, h * 0.1);
  const cx = w / 2;

  return [
    `M ${ch} 0`,
    `L ${cx - tabHalf} 0`,
    `L ${cx - tabHalf * 0.45} ${tabDepth}`,
    `L ${cx + tabHalf * 0.45} ${tabDepth}`,
    `L ${cx + tabHalf} 0`,
    `L ${w - ch} 0`,
    `L ${w} ${ch}`,
    `L ${w} ${h - ch}`,
    `L ${w - ch} ${h}`,
    `L ${cx + tabHalf} ${h}`,
    `L ${cx + tabHalf * 0.45} ${h - tabDepth}`,
    `L ${cx - tabHalf * 0.45} ${h - tabDepth}`,
    `L ${cx - tabHalf} ${h}`,
    `L ${ch} ${h}`,
    `L 0 ${h - ch}`,
    `L 0 ${ch}`,
    'Z',
  ].join(' ');
}

function createInnerClipPath(width: number, height: number, inset: number): string {
  const w = width - inset * 2;
  const h = height - inset * 2;
  const ch = Math.max(6, Math.min(8, w * 0.022));
  const tabHalf = Math.max(14, Math.min(18, w * 0.075));
  const tabDepth = Math.max(4, Math.min(5, h * 0.08));
  const cx = w / 2;

  return [
    `M ${inset + ch} ${inset}`,
    `L ${inset + cx - tabHalf} ${inset}`,
    `L ${inset + cx - tabHalf * 0.45} ${inset + tabDepth}`,
    `L ${inset + cx + tabHalf * 0.45} ${inset + tabDepth}`,
    `L ${inset + cx + tabHalf} ${inset}`,
    `L ${inset + w - ch} ${inset}`,
    `L ${inset + w} ${inset + ch}`,
    `L ${inset + w} ${inset + h - ch}`,
    `L ${inset + w - ch} ${inset + h}`,
    `L ${inset + cx + tabHalf} ${inset + h}`,
    `L ${inset + cx + tabHalf * 0.45} ${inset + h - tabDepth}`,
    `L ${inset + cx - tabHalf * 0.45} ${inset + h - tabDepth}`,
    `L ${inset + cx - tabHalf} ${inset + h}`,
    `L ${inset + ch} ${inset + h}`,
    `L ${inset} ${inset + h - ch}`,
    `L ${inset} ${inset + ch}`,
    'Z',
  ].join(' ');
}

function CircuitPattern({ width, height }: { width: number; height: number }) {
  const lines: ReactNode[] = [];
  const stepY = 14;
  const stepX = 18;

  for (let y = stepY; y < height; y += stepY) {
    lines.push(
      <Line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={CIRCUIT_LINE}
        strokeWidth={0.6}
      />
    );
  }

  for (let x = stepX; x < width; x += stepX) {
    lines.push(
      <Line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={CIRCUIT_LINE}
        strokeWidth={0.6}
      />
    );
  }

  const nodes = [
    [width * 0.18, height * 0.35],
    [width * 0.42, height * 0.62],
    [width * 0.58, height * 0.28],
    [width * 0.72, height * 0.55],
    [width * 0.32, height * 0.78],
  ];

  return (
    <G opacity={0.9}>
      {lines}
      {nodes.map(([cx, cy], index) => (
        <G key={`node-${index}`}>
          <Line
            x1={cx - 8}
            y1={cy - 4}
            x2={cx + 10}
            y2={cy + 6}
            stroke={CIRCUIT_LINE}
            strokeWidth={0.7}
          />
          <Circle cx={cx} cy={cy} r={1.8} fill={CIRCUIT_NODE} />
        </G>
      ))}
    </G>
  );
}

function CyberBannerChrome({ width, height }: { width: number; height: number }) {
  if (width < 40 || height < 24) return null;

  const framePath = createCyberFramePath(width, height);
  const innerPath = createInnerClipPath(width, height, 3);
  const borderGradId = 'cyberBorderGrad';
  const glowFilterId = 'cyberBorderGlow';
  const clipId = 'cyberInnerClip';

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={innerPath} />
        </ClipPath>
        <LinearGradient id={borderGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={CYAN} stopOpacity="1" />
          <Stop offset="48%" stopColor="#5CEBFF" stopOpacity="1" />
          <Stop offset="52%" stopColor="#D946EF" stopOpacity="1" />
          <Stop offset="100%" stopColor={MAGENTA} stopOpacity="1" />
        </LinearGradient>
        <Filter id={glowFilterId} x="-8%" y="-20%" width="116%" height="140%">
          <FeGaussianBlur stdDeviation="2.2" />
        </Filter>
      </Defs>

      <Path d={innerPath} fill={BG_DARK} />
      <G clipPath={`url(#${clipId})`}>
        <CircuitPattern width={width} height={height} />
      </G>

      <Path
        d={framePath}
        fill="none"
        stroke={`url(#${borderGradId})`}
        strokeWidth={2.8}
        filter={`url(#${glowFilterId})`}
        opacity={0.55}
      />
      <Path
        d={framePath}
        fill="none"
        stroke={`url(#${borderGradId})`}
        strokeWidth={2}
      />
    </Svg>
  );
}

interface NeonWhiteLineProps {
  children: string;
  fontSize: number;
  lineHeight: number;
}

function NeonWhiteLine({ children, fontSize, lineHeight }: NeonWhiteLineProps) {
  const baseStyle = {
    fontFamily: FONT_FAMILY,
    fontSize,
    lineHeight,
    letterSpacing: 0.35,
    textTransform: 'uppercase' as const,
    width: '100%' as const,
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  };

  return (
    <View style={[neonLineStyles.stack, { height: lineHeight }]}>
      <Text
        style={[baseStyle, neonLineStyles.centered]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {children}
      </Text>
    </View>
  );
}

function NeonBannerCopy({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const maxFontFromHeight =
    ((height - COPY_LINE_GAP) / 2 / LINE_HEIGHT_RATIO) * VERTICAL_BREATHING;
  const maxFontFromWidth = width / 22;
  const fontSize = Math.max(8, Math.min(maxFontFromHeight, maxFontFromWidth) * FONT_SIZE_BOOST);
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;

  return (
    <View style={[neonLineStyles.copy, { width, height }]}>
      <NeonWhiteLine fontSize={fontSize} lineHeight={lineHeight}>
        {HEADLINE}
      </NeonWhiteLine>
      <NeonWhiteLine fontSize={fontSize} lineHeight={lineHeight}>
        {SUBLINE}
      </NeonWhiteLine>
    </View>
  );
}

const neonLineStyles = StyleSheet.create({
  copy: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: COPY_LINE_GAP,
  },
  stack: {
    width: '100%',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
});

export function HomeCyberTopBanner({ style }: HomeCyberTopBannerProps) {
  const { getBanner } = useBannerManager();
  const resolved = getBanner('top_banner');

  const [size, setSize] = useState({ width: 0, height: BANNER_MIN_HEIGHT });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height: Math.max(height, BANNER_MIN_HEIGHT) });
  }, []);

  const innerWidth = Math.max(0, size.width - FRAME_PADDING_H * 2);
  const textColumnOuterWidth = Math.max(0, innerWidth - LOGO_RING_SIZE - ZONE_GAP);
  const textAreaWidth = Math.max(0, textColumnOuterWidth - TEXT_PADDING_H * 2);
  const textAreaHeight = Math.max(0, size.height - FRAME_PADDING_V * 2);

  const openTarget = useCallback(async () => {
    await openBannerTarget('top_banner', resolved.targetUrl);
  }, [resolved.targetUrl]);

  return (
    <Pressable
      style={({ pressed }) => [styles.root, pressed && styles.rootPressed, style]}
      onLayout={onLayout}
      onPress={withClickSound(() => void openTarget())}
      disabled={!resolved.targetUrl}
      accessibilityRole="button"
      accessibilityLabel={BANNER_ACCESSIBILITY_LABEL}
      accessibilityHint="Abre el enlace promocional configurado"
    >
      {size.width > 0 ? <CyberBannerChrome width={size.width} height={size.height} /> : null}

      <View style={styles.content}>
        <View style={styles.textColumn}>
          {size.width > 0 ? (
            <NeonBannerCopy width={textAreaWidth} height={textAreaHeight} />
          ) : null}
        </View>

        <View style={styles.logoColumn}>
          <View style={styles.logoRingOuter}>
            <View style={styles.logoRingInner}>
              <Image source={LOGO} style={styles.logo} resizeMode="cover" accessibilityIgnoresInvertColors />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minWidth: 0,
    minHeight: BANNER_MIN_HEIGHT,
    overflow: 'hidden',
  },
  rootPressed: {
    opacity: 0.94,
  },
  fontPlaceholder: {
    minHeight: BANNER_MIN_HEIGHT,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: FRAME_PADDING_H,
    paddingRight: FRAME_PADDING_H,
    paddingVertical: FRAME_PADDING_V,
    gap: ZONE_GAP,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: TEXT_PADDING_H,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  logoColumn: {
    width: LOGO_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoRingOuter: {
    width: LOGO_RING_SIZE,
    height: LOGO_RING_SIZE,
    borderRadius: LOGO_RING_SIZE / 2,
    borderWidth: 2,
    borderColor: CYAN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRingInner: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#050A12',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
