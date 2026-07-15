import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';

import type { PromoBancariaItem } from '@/types/promosBancarias';
import { APP_FONT_FAMILY } from '@/services/preloadAppFonts';
import { SUPERMARKET_CATALOG } from '@/data/supermarketCatalog';
import { BankLogoBadge, resolveBankBrandKey } from '@/components/home/BankLogoBadge';
import {
  formatPesosAR,
  resolveAhorroPesos,
} from '@/utils/promoAhorroPesos';
import { buildPromoBeneficioClipboardText } from '@/utils/promoBeneficioClipboard';
import { useInstagramClipboardNoticeStore } from '@/store/instagramClipboardNoticeStore';
import { triggerHaptic } from '@/utils/triggerHaptic';
import { withClickSound } from '@/utils/withClickSound';
import { radii, spacing } from '@/theme';

type StickerTone = {
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  ribbon: string;
  stamp: string;
};

const TONES: Record<string, StickerTone> = {
  hipotecario: {
    paper: '#FFF6E8',
    ink: '#1A2A22',
    muted: '#5C6B62',
    accent: '#0F7A5A',
    accentSoft: '#D8F3E8',
    ribbon: '#0F7A5A',
    stamp: '#0F7A5A',
  },
  galicia: {
    paper: '#FFF4EC',
    ink: '#2A1A12',
    muted: '#7A5A48',
    accent: '#E85D04',
    accentSoft: '#FFE0C8',
    ribbon: '#E85D04',
    stamp: '#C44B00',
  },
  nacion: {
    paper: '#F3F7FF',
    ink: '#12233A',
    muted: '#4A6078',
    accent: '#1D4E89',
    accentSoft: '#D6E6FA',
    ribbon: '#1D4E89',
    stamp: '#163A66',
  },
  provincia: {
    paper: '#F4FFF7',
    ink: '#143024',
    muted: '#4E6B5B',
    accent: '#2D6A4F',
    accentSoft: '#D4F0E2',
    ribbon: '#2D6A4F',
    stamp: '#1B4D38',
  },
  default: {
    paper: '#FFF8F0',
    ink: '#2A160F',
    muted: '#6B5348',
    accent: '#C1121F',
    accentSoft: '#FDE3E5',
    ribbon: '#C1121F',
    stamp: '#9B0E18',
  },
};

function toneForBank(banco: string, medios: string[] = []): StickerTone {
  const key = resolveBankBrandKey(banco, medios);
  if (key === 'hipotecario') return TONES.hipotecario;
  if (key === 'galicia') return TONES.galicia;
  if (key === 'nacion') return TONES.nacion;
  if (key === 'provincia') return TONES.provincia;
  if (key === 'modo') {
    return {
      paper: '#F5F5F5',
      ink: '#111111',
      muted: '#555555',
      accent: '#111111',
      accentSoft: '#E8E8E8',
      ribbon: '#111111',
      stamp: '#333333',
    };
  }
  return TONES.default;
}

function superLabel(ids: string[]): string {
  if (ids.length === 0) return 'Súpers adheridos';
  return ids
    .map((id) => SUPERMARKET_CATALOG.find((s) => s.id === id)?.name ?? id)
    .slice(0, 3)
    .join(' · ');
}

function Perforation({ color, width }: { color: string; width: number }) {
  const dash = 6;
  const gap = 5;
  const y = 1;
  const segments: ReactNode[] = [];
  for (let x = 0; x < width; x += dash + gap) {
    segments.push(
      <Line
        key={x}
        x1={x}
        y1={y}
        x2={Math.min(x + dash, width)}
        y2={y}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    );
  }
  return (
    <Svg width={width} height={3} style={{ marginVertical: 8 }}>
      {segments}
    </Svg>
  );
}

export type PromoReintegroStickerProps = {
  item: PromoBancariaItem;
  onPress: () => void;
  /** Índice para rotación / entrada escalonada */
  index?: number;
  variant?: 'rail' | 'full';
  style?: StyleProp<ViewStyle>;
};

/**
 * Tarjeta tipo sticker / cupón de reintegro (no cartel genérico).
 */
export function PromoReintegroSticker({
  item,
  onPress,
  index = 0,
  variant = 'rail',
  style,
}: PromoReintegroStickerProps) {
  const tone = useMemo(
    () => toneForBank(item.banco, item.medios),
    [item.banco, item.medios]
  );
  const scale = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const isFull = variant === 'full';
  const tilt = ((index % 5) - 2) * 1.4;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      friction: 7,
      tension: 68,
      delay: Math.min(index, 8) * 45,
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const pct = item.descuentoPct != null ? `${item.descuentoPct}` : null;
  const ahorroPesos = resolveAhorroPesos(item);
  const vigenciaBadge = item.enProximas24h
    ? { label: 'Próximas 24h', tone: 'soon' as const }
    : { label: 'Vigente Hoy', tone: 'hoy' as const };
  const medio = item.medios[0] ?? 'Promo banco';
  const a11yAhorro =
    ahorroPesos != null
      ? `Ahorrás ${formatPesosAR(ahorroPesos)}`
      : pct
        ? `${pct}%`
        : 'Promo';

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const cardWidth = isFull ? undefined : 178;
  const perforationW = isFull ? 280 : 146;
  const logoSize = isFull ? 108 : 84;

  const copyBeneficio = withClickSound(() => {
    void (async () => {
      try {
        await Clipboard.setStringAsync(buildPromoBeneficioClipboardText(item));
        triggerHaptic('success');
        setCopied(true);
        const store = useInstagramClipboardNoticeStore.getState();
        store.show('¡Beneficio copiado!', 'Pegalo en notas o mostralo en la caja');
        if (Platform.OS === 'android') {
          ToastAndroid.show('Beneficio copiado al portapapeles', ToastAndroid.SHORT);
        }
        setTimeout(() => {
          store.hide();
          setCopied(false);
        }, 1600);
      } catch {
        // silencioso
      }
    })();
  });

  const verCondiciones = withClickSound(() => {
    if (item.url) {
      void Linking.openURL(item.url);
      return;
    }
    onPress();
  });

  const enterScale = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });

  return (
    <Animated.View
      style={[
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: enterScale },
            { rotate: `${tilt}deg` },
          ],
        },
        style,
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${vigenciaBadge.label}. ${a11yAhorro} reintegro ${item.banco}. ${item.titulo}`}
        style={[
          styles.shadowWrap,
          isFull && styles.shadowWrapFull,
          { width: cardWidth },
        ]}
      >
        {/* sombra papel */}
        <View style={[styles.paperShadow, { backgroundColor: tone.accent }]} />

        <View
          style={[
            styles.paper,
            isFull && styles.paperFull,
            { backgroundColor: tone.paper, borderColor: tone.accent },
          ]}
        >
          {/* Badge vigencia */}
          <View
            style={[
              styles.vigenteBadge,
              vigenciaBadge.tone === 'hoy' ? styles.vigenteHoy : styles.vigenteSoon,
            ]}
          >
            <Text
              style={[
                styles.vigenteBadgeText,
                vigenciaBadge.tone === 'hoy' ? styles.vigenteHoyText : styles.vigenteSoonText,
              ]}
            >
              {vigenciaBadge.tone === 'hoy' ? '✓  ' : ''}
              {vigenciaBadge.label}
            </Text>
          </View>

          {/* esquina peel */}
          <View style={styles.peel} pointerEvents="none">
            <View style={[styles.peelFold, { borderTopColor: tone.accentSoft }]} />
          </View>

          <View style={styles.body}>
            <View style={styles.logoBlock}>
              <BankLogoBadge
                banco={item.banco}
                medios={item.medios}
                size={logoSize}
                showLabel
              />
            </View>

            <Text style={[styles.kicker, { color: tone.muted }]}>REINTEGRO</Text>

            {ahorroPesos != null ? (
              <View style={styles.ahorroBlock}>
                <Text style={[styles.ahorrasLabel, { color: tone.ink }]}>Ahorrás</Text>
                <Text
                  style={[styles.ahorroMonto, { color: tone.accent, fontFamily: APP_FONT_FAMILY }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatPesosAR(ahorroPesos)}
                </Text>
              </View>
            ) : null}

            {pct ? (
              <View style={[styles.pctBadge, { backgroundColor: tone.accentSoft }]}>
                <Text style={[styles.pctBadgeText, { color: tone.accent }]}>
                  {pct}% OFF
                </Text>
              </View>
            ) : ahorroPesos == null ? (
              <Text
                style={[
                  styles.ahorroMonto,
                  { color: tone.accent, fontFamily: APP_FONT_FAMILY, fontSize: 28 },
                ]}
              >
                PROMO
              </Text>
            ) : null}

            <Perforation color={`${tone.accent}66`} width={perforationW} />

            <Text style={[styles.title, { color: tone.ink }]} numberOfLines={isFull ? 3 : 2}>
              {item.titulo}
            </Text>

            <View style={[styles.chip, { backgroundColor: tone.accentSoft }]}>
              <Text style={[styles.chipText, { color: tone.accent }]} numberOfLines={1}>
                {medio}
              </Text>
            </View>

            <Text style={[styles.meta, { color: tone.muted }]} numberOfLines={1}>
              {superLabel(item.supers)}
            </Text>

            <View style={[styles.ctaRow, isFull && styles.ctaRowFull]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copiar beneficio al portapapeles"
                onPress={copyBeneficio}
                style={({ pressed }) => [
                  styles.ctaPrimary,
                  isFull && styles.ctaFlex,
                  { backgroundColor: tone.accent },
                  pressed && styles.ctaPressed,
                ]}
              >
                <Text style={styles.ctaPrimaryText} numberOfLines={1}>
                  {copied ? '¡Copiado!' : 'Copiar beneficio'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver condiciones de la promo"
                onPress={verCondiciones}
                style={({ pressed }) => [
                  styles.ctaSecondary,
                  isFull && styles.ctaFlex,
                  { borderColor: tone.accent },
                  pressed && styles.ctaPressed,
                ]}
              >
                <Text style={[styles.ctaSecondaryText, { color: tone.accent }]} numberOfLines={1}>
                  Ver condiciones
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    marginVertical: 4,
  },
  shadowWrapFull: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  paperShadow: {
    position: 'absolute',
    left: 5,
    right: -3,
    top: 6,
    bottom: -4,
    borderRadius: 18,
    opacity: 0.22,
  },
  paper: {
    width: 178,
    minHeight: 330,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    paddingTop: 26,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  paperFull: {
    width: '100%',
    minHeight: 300,
    paddingTop: 28,
    paddingHorizontal: spacing.md,
  },
  vigenteBadge: {
    position: 'absolute',
    top: 10,
    left: 8,
    zIndex: 3,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    maxWidth: '72%',
  },
  vigenteHoy: {
    backgroundColor: '#E8FFF2',
    borderColor: '#1F9D5C',
  },
  vigenteSoon: {
    backgroundColor: '#FFF6E0',
    borderColor: '#D4A017',
  },
  vigenteBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  vigenteHoyText: {
    color: '#146B3F',
  },
  vigenteSoonText: {
    color: '#8A6500',
  },
  peel: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    zIndex: 2,
  },
  peelFold: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 28,
    borderLeftWidth: 28,
    borderTopColor: '#FFEFD9',
    borderLeftColor: 'transparent',
    opacity: 0.9,
  },
  body: {
    flex: 1,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 4,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 2,
    textAlign: 'center',
  },
  ahorroBlock: {
    alignItems: 'center',
    marginBottom: 4,
  },
  ahorrasLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: -2,
  },
  ahorroMonto: {
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  pctBadge: {
    alignSelf: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 2,
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 8,
    textAlign: 'center',
  },
  chip: {
    alignSelf: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  ctaRow: {
    marginTop: 10,
    gap: 6,
    width: '100%',
  },
  ctaRowFull: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaFlex: {
    flex: 1,
  },
  ctaPrimary: {
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  ctaPrimaryText: {
    color: '#FFFDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  ctaSecondary: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  ctaSecondaryText: {
    fontSize: 11,
    fontWeight: '800',
  },
  ctaPressed: {
    opacity: 0.82,
  },
});
