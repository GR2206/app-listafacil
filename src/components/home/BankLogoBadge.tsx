import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { bankLogoImage, type BankBrandKey } from '@/assets/bankLogos';
import { APP_FONT_FAMILY } from '@/services/preloadAppFonts';

export type { BankBrandKey };

export function resolveBankBrandKey(banco: string, medios: string[] = []): BankBrandKey {
  const blob = `${banco} ${medios.join(' ')}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (blob.includes('hipotecario')) return 'hipotecario';
  if (blob.includes('galicia')) return 'galicia';
  if (blob.includes('santander')) return 'santander';
  if (blob.includes('icbc')) return 'icbc';
  if (blob.includes('coinag')) return 'coinag';
  if (blob.includes('municipal')) return 'municipal';
  // Santa Fe antes que "bna" genérico (evitar mezclar con Nación).
  if (
    blob.includes('santa fe') ||
    blob.includes('santafe') ||
    blob.includes('nuevo banco de santa') ||
    blob.includes('billetera santa')
  ) {
    return 'santafe';
  }
  if (blob.includes('bna+') || blob.includes('bna +') || blob.includes('bnaplus')) {
    return 'bnaplus';
  }
  // Nación / BNA (sin Santa Fe).
  if (blob.includes('nacion') || (blob.includes('bna') && !blob.includes('santa'))) {
    return 'nacion';
  }
  if (blob.includes('provincia') || blob.includes('cuenta dni') || blob.includes('dni')) {
    return 'provincia';
  }
  if (blob.includes('mercado pago') || blob.includes('mercadopago') || /\bmp\b/.test(blob)) {
    return 'mercadopago';
  }
  if (blob.includes('uala') || blob.includes('ualá')) return 'uala';
  if (blob.includes('naranja')) return 'naranjax';
  if (blob.includes('personal pay') || blob.includes('personalpay')) return 'personalpay';
  if (blob.includes('supervielle')) return 'supervielle';
  if (blob.includes('macro')) return 'macro';
  if (blob.includes('modo') && !blob.includes('galicia') && !blob.includes('hipotecario')) {
    return 'modo';
  }
  return 'default';
}

const BRAND: Record<
  BankBrandKey,
  { bg: string; fg: string; ring: string; label: string }
> = {
  hipotecario: { bg: '#F36C00', fg: '#FFFDF8', ring: '#C45600', label: 'HIPOTECARIO' },
  galicia: { bg: '#E85D04', fg: '#FFFDF8', ring: '#B84700', label: 'GALICIA' },
  nacion: { bg: '#0A74C8', fg: '#FFFFFF', ring: '#085A9C', label: 'NACIÓN' },
  bnaplus: { bg: '#0A74C8', fg: '#FFFFFF', ring: '#085A9C', label: 'BNA+' },
  provincia: { bg: '#2D6A4F', fg: '#FFFDF8', ring: '#1B4D38', label: 'PROVINCIA' },
  modo: { bg: '#008751', fg: '#FFFFFF', ring: '#00663D', label: 'MODO' },
  mercadopago: { bg: '#009EE3', fg: '#FFFFFF', ring: '#0077B3', label: 'MERCADO PAGO' },
  uala: { bg: '#3D14B4', fg: '#FFFFFF', ring: '#2A0E7A', label: 'UALÁ' },
  naranjax: { bg: '#FF6A00', fg: '#FFFFFF', ring: '#CC5500', label: 'NARANJA X' },
  personalpay: { bg: '#5B2EFF', fg: '#FFFFFF', ring: '#3D14B4', label: 'PERSONAL PAY' },
  supervielle: { bg: '#2B2B2B', fg: '#FFFFFF', ring: '#111111', label: 'SUPERVIELLE' },
  macro: { bg: '#003366', fg: '#FFFFFF', ring: '#002244', label: 'MACRO' },
  santander: { bg: '#EC0000', fg: '#FFFFFF', ring: '#B00000', label: 'SANTANDER' },
  icbc: { bg: '#C8102E', fg: '#FFFFFF', ring: '#8E0B20', label: 'ICBC' },
  coinag: { bg: '#E10600', fg: '#FFFFFF', ring: '#A10500', label: 'COINAG' },
  municipal: { bg: '#E10600', fg: '#FFFFFF', ring: '#A10500', label: 'MUNICIPAL' },
  santafe: { bg: '#2EBE3B', fg: '#FFFFFF', ring: '#1F8F2C', label: 'SANTA FE' },
  default: { bg: '#C1121F', fg: '#FFFDF8', ring: '#8E0D16', label: 'BANCO' },
};

type BankLogoBadgeProps = {
  banco: string;
  medios?: string[];
  size?: number;
  showLabel?: boolean;
};

function FallbackMark({ bg, fg }: { bg: string; fg: string }) {
  return (
    <>
      <Circle cx="50" cy="50" r="46" fill={bg} />
      <SvgText x="50" y="60" fill={fg} fontSize="40" fontWeight="800" textAnchor="middle">
        %
      </SvgText>
    </>
  );
}

/** Logo de banco (disco + marca + nombre). */
export function BankLogoBadge({
  banco,
  medios = [],
  size = 96,
  showLabel = true,
}: BankLogoBadgeProps) {
  const key = resolveBankBrandKey(banco, medios);
  const brand = BRAND[key];
  const markSize = Math.round(size * 0.94);
  const labelSize = Math.max(10, Math.round(size * 0.13));
  const logo = bankLogoImage(key);
  const pad = Math.round(markSize * 0.1);

  return (
    <View
      style={[styles.wrap, { width: showLabel ? Math.max(size, 120) : size }]}
      accessibilityLabel={`Logo ${brand.label}`}
    >
      <View
        style={[
          styles.disc,
          {
            width: markSize,
            height: markSize,
            borderRadius: markSize / 2,
            borderColor: brand.ring,
            shadowColor: brand.ring,
            backgroundColor: logo ? 'transparent' : '#fff',
            borderWidth: logo ? 0 : 3,
            elevation: logo ? 0 : 5,
            shadowOpacity: logo ? 0 : 0.3,
          },
        ]}
      >
        {logo ? (
          <Image
            source={logo}
            style={{ width: markSize - pad, height: markSize - pad }}
            resizeMode="contain"
          />
        ) : (
          <Svg width={markSize} height={markSize} viewBox="0 0 100 100">
            <FallbackMark bg={brand.bg} fg={brand.fg} />
          </Svg>
        )}
      </View>

      {showLabel ? (
        <Text
          style={[
            styles.label,
            {
              color: brand.ring,
              fontSize: labelSize,
              fontFamily: APP_FONT_FAMILY,
            },
          ]}
          numberOfLines={1}
        >
          {brand.label}
        </Text>
      ) : null}
    </View>
  );
}

/** Marca de agua centrada en la tarjeta (opacidad visible). */
export function BankLogoWatermark({
  banco,
  medios = [],
  size = 140,
  opacity = 0.28,
}: {
  banco: string;
  medios?: string[];
  size?: number;
  opacity?: number;
}) {
  const key = resolveBankBrandKey(banco, medios);
  const logo = bankLogoImage(key);
  if (!logo) return null;
  return (
    <View pointerEvents="none" style={[styles.watermarkLayer, { opacity }]}>
      <Image source={logo} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  label: {
    marginTop: 6,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
});
