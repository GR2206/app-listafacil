import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

import { APP_FONT_FAMILY } from '@/services/preloadAppFonts';

export type BankBrandKey = 'hipotecario' | 'galicia' | 'nacion' | 'provincia' | 'modo' | 'default';

export function resolveBankBrandKey(banco: string, medios: string[] = []): BankBrandKey {
  const blob = `${banco} ${medios.join(' ')}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (blob.includes('hipotecario')) return 'hipotecario';
  if (blob.includes('galicia')) return 'galicia';
  if (blob.includes('nacion') || blob.includes('bna')) return 'nacion';
  if (blob.includes('provincia') || blob.includes('cuenta dni') || blob.includes('dni')) {
    return 'provincia';
  }
  if (blob.includes('modo') && !blob.includes('galicia') && !blob.includes('hipotecario')) {
    return 'modo';
  }
  return 'default';
}

const BRAND: Record<
  BankBrandKey,
  { bg: string; fg: string; ring: string; label: string }
> = {
  hipotecario: { bg: '#0F7A5A', fg: '#FFFDF8', ring: '#0A5C44', label: 'HIPOTECARIO' },
  galicia: { bg: '#E85D04', fg: '#FFFDF8', ring: '#B84700', label: 'GALICIA' },
  nacion: { bg: '#1D4E89', fg: '#FFFDF8', ring: '#12365F', label: 'NACIÓN' },
  provincia: { bg: '#2D6A4F', fg: '#FFFDF8', ring: '#1B4D38', label: 'PROVINCIA' },
  modo: { bg: '#111111', fg: '#FFFFFF', ring: '#333333', label: 'MODO' },
  default: { bg: '#C1121F', fg: '#FFFDF8', ring: '#8E0D16', label: 'BANCO' },
};

type BankLogoBadgeProps = {
  banco: string;
  medios?: string[];
  /** Diámetro del logo (grande). */
  size?: number;
  showLabel?: boolean;
};

function Mark({ brandKey, bg, fg }: { brandKey: BankBrandKey; bg: string; fg: string }) {
  if (brandKey === 'galicia') {
    return (
      <>
        <Circle cx="50" cy="50" r="46" fill={bg} />
        <SvgText x="50" y="58" fill={fg} fontSize="44" fontWeight="800" textAnchor="middle">
          G
        </SvgText>
        <Path
          d="M30 66c10 12 30 12 40 0"
          stroke={fg}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  }
  if (brandKey === 'nacion') {
    return (
      <>
        <Circle cx="50" cy="50" r="46" fill={bg} />
        <Circle cx="50" cy="34" r="9" fill={fg} />
        <Path d="M28 50h44" stroke={fg} strokeWidth="5" strokeLinecap="round" />
        <Path d="M32 60h36" stroke={fg} strokeWidth="4" strokeLinecap="round" />
        <Path d="M36 69h28" stroke={fg} strokeWidth="3.5" strokeLinecap="round" />
        <SvgText
          x="50"
          y="88"
          fill={fg}
          fontSize="12"
          fontWeight="800"
          textAnchor="middle"
          letterSpacing="1.5"
        >
          BNA
        </SvgText>
      </>
    );
  }
  if (brandKey === 'hipotecario') {
    return (
      <>
        <Circle cx="50" cy="50" r="46" fill={bg} />
        <SvgText x="50" y="60" fill={fg} fontSize="34" fontWeight="800" textAnchor="middle">
          BH
        </SvgText>
      </>
    );
  }
  if (brandKey === 'provincia') {
    return (
      <>
        <Circle cx="50" cy="50" r="46" fill={bg} />
        <Rect x="24" y="30" width="52" height="26" rx="5" fill={fg} />
        <SvgText x="50" y="49" fill={bg} fontSize="16" fontWeight="800" textAnchor="middle">
          DNI
        </SvgText>
        <SvgText x="50" y="74" fill={fg} fontSize="11" fontWeight="800" textAnchor="middle">
          PROV
        </SvgText>
      </>
    );
  }
  if (brandKey === 'modo') {
    return (
      <>
        <Circle cx="50" cy="50" r="46" fill={bg} />
        <SvgText
          x="50"
          y="58"
          fill={fg}
          fontSize="20"
          fontWeight="800"
          textAnchor="middle"
          letterSpacing="2"
        >
          MODO
        </SvgText>
      </>
    );
  }
  return (
    <>
      <Circle cx="50" cy="50" r="46" fill={bg} />
      <SvgText x="50" y="60" fill={fg} fontSize="40" fontWeight="800" textAnchor="middle">
        %
      </SvgText>
    </>
  );
}

/** Logo de banco grande (disco + marca + nombre). */
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

  return (
    <View style={[styles.wrap, { width: showLabel ? Math.max(size, 120) : size }]} accessibilityLabel={`Logo ${brand.label}`}>
      <View
        style={[
          styles.disc,
          {
            width: markSize,
            height: markSize,
            borderRadius: markSize / 2,
            borderColor: brand.ring,
            shadowColor: brand.ring,
          },
        ]}
      >
        <Svg width={markSize} height={markSize} viewBox="0 0 100 100">
          <Mark brandKey={key} bg={brand.bg} fg={brand.fg} />
          <Circle cx="50" cy="50" r="47" fill="none" stroke={brand.fg} strokeWidth="3" opacity={0.35} />
        </Svg>
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

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  disc: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  label: {
    marginTop: 6,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
});
