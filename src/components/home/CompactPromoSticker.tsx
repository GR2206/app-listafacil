import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { PromoBancariaItem } from '@/types/promosBancarias';
import { APP_FONT_FAMILY } from '@/services/preloadAppFonts';
import { SUPERMARKET_CATALOG } from '@/data/supermarketCatalog';
import {
  BankLogoBadge,
  resolveBankBrandKey,
} from '@/components/home/BankLogoBadge';
import { SupermarketLogoWatermark } from '@/components/home/SupermarketLogoBadge';
import { formatPesosAR, resolveAhorroPesos } from '@/utils/promoAhorroPesos';
import {
  primarySupermarketIdForPromo,
  resolvePromoVigenciaBadge,
} from '@/utils/promoVigencia';
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

function superLabel(ids: string[]): string {
  if (ids.length === 0) return 'Súpers adheridos';
  return ids
    .map((id) => SUPERMARKET_CATALOG.find((s) => s.id === id)?.name ?? id)
    .slice(0, 2)
    .join(' · ');
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
  const vigenciaBadge = resolvePromoVigenciaBadge(item);
  const superWatermarkId = primarySupermarketIdForPromo(item);
  const paperW = width - 8;
  const paperH = height - 8;

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
          {superWatermarkId ? (
            <SupermarketLogoWatermark
              marketId={superWatermarkId}
              size={Math.round(108 * s)}
              opacity={0.22}
            />
          ) : null}
          <View style={[styles.hoy, vigenciaBadge.tone === 'soon' ? styles.soon : styles.hoyOn]}>
            <Text
              style={[
                styles.hoyText,
                { fontSize: Math.round(10 * s) },
                vigenciaBadge.tone === 'soon' ? styles.soonText : styles.hoyOnText,
              ]}
              numberOfLines={1}
            >
              {vigenciaBadge.tone === 'hoy' ? `✓ ${vigenciaBadge.label}` : vigenciaBadge.label}
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

          <Text
            style={[
              styles.superLine,
              {
                color: tone.muted,
                fontSize: Math.round(10 * s),
                zIndex: 1,
              },
            ]}
            numberOfLines={1}
          >
            {superLabel(item.supers)}
          </Text>

          <View style={[styles.ctaCol, { gap: Math.round(5 * s) }]}>
            {item.url ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver condiciones"
                onPress={verCondiciones}
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
                  Ver condiciones
                </Text>
              </Pressable>
            ) : null}
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
  superLine: {
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 2,
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
});
