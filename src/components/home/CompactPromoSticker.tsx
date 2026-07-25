import { useEffect, useMemo, useRef, useState } from 'react';
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
import * as Clipboard from 'expo-clipboard';

import type { PromoBancariaItem } from '@/types/promosBancarias';
import { APP_FONT_FAMILY } from '@/services/preloadAppFonts';
import {
  BankLogoBadge,
  BankLogoWatermark,
  resolveBankBrandKey,
} from '@/components/home/BankLogoBadge';
import { formatPesosAR, resolveAhorroPesos } from '@/utils/promoAhorroPesos';
import { buildPromoBeneficioClipboardText } from '@/utils/promoBeneficioClipboard';
import { useInstagramClipboardNoticeStore } from '@/store/instagramClipboardNoticeStore';
import { triggerHaptic } from '@/utils/triggerHaptic';
import { withClickSound } from '@/utils/withClickSound';
import { radii } from '@/theme';

type StickerTone = {
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
};

const TONES: Record<string, StickerTone> = {
  hipotecario: {
    paper: '#FFF6E8',
    ink: '#1A2A22',
    muted: '#5C6B62',
    accent: '#0F7A5A',
    accentSoft: '#D8F3E8',
  },
  galicia: {
    paper: '#FFF4EC',
    ink: '#2A1A12',
    muted: '#7A5A48',
    accent: '#E85D04',
    accentSoft: '#FFE0C8',
  },
  nacion: {
    paper: '#E6F1FA',
    ink: '#0A2840',
    muted: '#3A5A72',
    accent: '#0A74C8',
    accentSoft: '#C8DFF5',
  },
  provincia: {
    paper: '#F4FFF7',
    ink: '#143024',
    muted: '#4E6B5B',
    accent: '#2D6A4F',
    accentSoft: '#D4F0E2',
  },
  default: {
    paper: '#FFF8F0',
    ink: '#2A160F',
    muted: '#6B5348',
    accent: '#C1121F',
    accentSoft: '#FDE3E5',
  },
  modo: {
    paper: '#F5F5F5',
    ink: '#111111',
    muted: '#555555',
    accent: '#111111',
    accentSoft: '#E8E8E8',
  },
  mercadopago: {
    paper: '#EAF7FD',
    ink: '#0A2A3A',
    muted: '#4A6B7A',
    accent: '#009EE3',
    accentSoft: '#CDEFFB',
  },
  uala: {
    paper: '#F3EEFF',
    ink: '#1A1038',
    muted: '#5A4A7A',
    accent: '#3D14B4',
    accentSoft: '#E0D4FF',
  },
  naranjax: {
    paper: '#FFF3E8',
    ink: '#3A1A08',
    muted: '#7A5A40',
    accent: '#FF6A00',
    accentSoft: '#FFE0C8',
  },
  personalpay: {
    paper: '#E8F7FD',
    ink: '#0A2A38',
    muted: '#4A6B7A',
    accent: '#00ADEF',
    accentSoft: '#C8EEFB',
  },
};

function toneForBank(banco: string, medios: string[] = []): StickerTone {
  const key = resolveBankBrandKey(banco, medios);
  if (TONES[key]) return TONES[key];
  // Tonos rápidos para marcas nuevas con logo.
  if (key === 'santander' || key === 'coinag' || key === 'icbc') {
    return {
      paper: '#FFF5F5',
      ink: '#2A0A0A',
      muted: '#7A4545',
      accent: '#EC0000',
      accentSoft: '#FFD6D6',
    };
  }
  if (key === 'bnaplus') {
    return TONES.nacion;
  }
  if (key === 'santafe') {
    return {
      paper: '#F0FFF2',
      ink: '#0F2A14',
      muted: '#4A6B52',
      accent: '#2EBE3B',
      accentSoft: '#D4F7D8',
    };
  }
  if (key === 'modo') {
    return {
      paper: '#F0FFF6',
      ink: '#0A2A18',
      muted: '#4A6B58',
      accent: '#008751',
      accentSoft: '#D4F0E2',
    };
  }
  if (key === 'municipal') {
    return {
      paper: '#FFF5F5',
      ink: '#1A0A0A',
      muted: '#6B4444',
      accent: '#E10600',
      accentSoft: '#FFD6D4',
    };
  }
  if (key === 'macro') {
    return {
      paper: '#F3F6FA',
      ink: '#0A1A2A',
      muted: '#4A6078',
      accent: '#003366',
      accentSoft: '#D6E0EC',
    };
  }
  return TONES.default;
}

type CompactPromoStickerProps = {
  item: PromoBancariaItem;
  index: number;
  /** Ancho de celda (≈ mitad de pantalla). */
  width: number;
  /** Alto fijo para que entren 2 filas (~4 por carilla). */
  height: number;
  style?: StyleProp<ViewStyle>;
};

/** Sticker torcido del Módulo de Finanzas — contenido escalado al tamaño de celda. */
export function CompactPromoSticker({
  item,
  index,
  width,
  height,
  style,
}: CompactPromoStickerProps) {
  const tone = useMemo(() => toneForBank(item.banco, item.medios), [item.banco, item.medios]);
  const scale = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const [copied, setCopied] = useState(false);

  const tilt = useMemo(() => {
    const pattern = [-6.5, 5, -3.5, 7, -5.5, 4];
    return pattern[index % pattern.length];
  }, [index]);

  // Escala tipográfica/logo vs base ~148px de ancho
  const s = Math.max(0.95, Math.min(1.35, width / 148));
  const logoSize = Math.round(52 * s);
  const montoSize = Math.round(30 * s);
  const pad = Math.round(10 * s);

  useEffect(() => {
    Animated.spring(enter, {
      toValue: 1,
      friction: 7,
      tension: 70,
      delay: Math.min(index, 8) * 35,
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const pct = item.descuentoPct;
  const ahorroPesos = resolveAhorroPesos(item);
  const paperW = width - 8;
  const paperH = height - 8;

  const copyBeneficio = withClickSound(() => {
    void (async () => {
      try {
        await Clipboard.setStringAsync(buildPromoBeneficioClipboardText(item));
        triggerHaptic('success');
        setCopied(true);
        const store = useInstagramClipboardNoticeStore.getState();
        store.show('¡Beneficio copiado!', 'Pegalo en notas o mostralo en la caja');
        if (Platform.OS === 'android') {
          ToastAndroid.show('Beneficio copiado', ToastAndroid.SHORT);
        }
        setTimeout(() => {
          store.hide();
          setCopied(false);
        }, 1400);
      } catch {
        // silencioso
      }
    })();
  });

  const verCondiciones = withClickSound(() => {
    if (item.url) void Linking.openURL(item.url);
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            {
              scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
            },
            { rotate: `${tilt}deg` },
          ],
        },
        style,
      ]}
    >
      <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
        <View
          style={[
            styles.paper,
            {
              width: paperW,
              height: paperH,
              backgroundColor: tone.paper,
              borderColor: tone.accent,
              paddingTop: Math.round(20 * s),
              paddingHorizontal: pad,
              paddingBottom: Math.round(8 * s),
              borderRadius: Math.round(14 * s),
              overflow: 'hidden',
            },
          ]}
        >
          <BankLogoWatermark
            banco={item.banco}
            medios={item.medios}
            size={Math.round(108 * s)}
            opacity={0.3}
          />
          <View style={[styles.hoy, item.enProximas24h ? styles.soon : styles.hoyOn]}>
            <Text
              style={[
                styles.hoyText,
                { fontSize: Math.round(10 * s) },
                item.enProximas24h ? styles.soonText : styles.hoyOnText,
              ]}
            >
              {item.enProximas24h ? '24h' : '✓ Hoy'}
            </Text>
          </View>

          <View style={[styles.logoWrap, { zIndex: 1 }]}>
            <BankLogoBadge
              banco={item.banco}
              medios={item.medios}
              size={logoSize}
              showLabel={false}
            />
          </View>

          <Text
            style={[styles.banco, { color: tone.muted, fontSize: Math.round(11 * s), zIndex: 1 }]}
            numberOfLines={1}
          >
            {item.banco}
          </Text>

          {ahorroPesos != null ? (
            <Text
              style={[
                styles.monto,
                {
                  color: tone.accent,
                  fontFamily: APP_FONT_FAMILY,
                  fontSize: montoSize,
                  lineHeight: montoSize + 2,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatPesosAR(ahorroPesos)}
            </Text>
          ) : pct != null ? (
            <Text
              style={[
                styles.monto,
                {
                  color: tone.accent,
                  fontFamily: APP_FONT_FAMILY,
                  fontSize: montoSize,
                  lineHeight: montoSize + 2,
                },
              ]}
            >
              {pct}%
            </Text>
          ) : (
            <Text
              style={[
                styles.monto,
                {
                  color: tone.accent,
                  fontFamily: APP_FONT_FAMILY,
                  fontSize: Math.round(22 * s),
                },
              ]}
            >
              PROMO
            </Text>
          )}

          {pct != null && ahorroPesos != null ? (
            <Text style={[styles.pctLine, { color: tone.ink, fontSize: Math.round(11 * s) }]}>
              {pct}% OFF
            </Text>
          ) : null}

          <Text
            style={[
              styles.titulo,
              {
                color: tone.ink,
                fontSize: Math.round(11 * s),
                lineHeight: Math.round(14 * s),
                minHeight: Math.round(28 * s),
              },
            ]}
            numberOfLines={2}
          >
            {item.titulo}
          </Text>

          <View style={[styles.ctaCol, { gap: Math.round(5 * s) }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copiar beneficio"
              onPress={copyBeneficio}
              onPressIn={() => {
                Animated.spring(scale, {
                  toValue: 0.97,
                  friction: 6,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
              }}
              style={[
                styles.ctaPrimary,
                {
                  backgroundColor: tone.accent,
                  paddingVertical: Math.round(7 * s),
                },
              ]}
            >
              <Text style={[styles.ctaPrimaryText, { fontSize: Math.round(12 * s) }]}>
                {copied ? '¡Ok!' : 'Copiar beneficio'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver condiciones"
              onPress={verCondiciones}
              style={[
                styles.ctaSecondary,
                {
                  borderColor: tone.accent,
                  paddingVertical: Math.round(6 * s),
                },
              ]}
            >
              <Text style={[styles.ctaSecondaryText, { color: tone.accent, fontSize: Math.round(11 * s) }]}>
                Ver condiciones
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  paper: {
    borderWidth: 2,
    overflow: 'hidden',
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 1, height: 3 },
  },
  hoy: {
    position: 'absolute',
    top: 7,
    left: 7,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    zIndex: 2,
  },
  hoyOn: {
    backgroundColor: '#E8FFF2',
    borderColor: '#1F9D5C',
  },
  soon: {
    backgroundColor: '#FFF6E0',
    borderColor: '#D4A017',
  },
  hoyText: {
    fontWeight: '800',
  },
  hoyOnText: {
    color: '#146B3F',
  },
  soonText: {
    color: '#8A6500',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 2,
  },
  banco: {
    fontWeight: '700',
    textAlign: 'center',
  },
  monto: {
    textAlign: 'center',
  },
  pctLine: {
    fontWeight: '800',
    textAlign: 'center',
    marginTop: -2,
  },
  titulo: {
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  ctaCol: {
    marginTop: 'auto',
  },
  ctaPrimary: {
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  ctaPrimaryText: {
    color: '#FFFDF8',
    fontWeight: '800',
  },
  ctaSecondary: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  ctaSecondaryText: {
    fontWeight: '800',
  },
});
