import { View, Text, StyleSheet } from 'react-native';

interface OrbLogoProps {
  size: number;
}

export function LaGallegaOrbLogo({ size }: OrbLogoProps) {
  const disc = size * 0.62;
  const gSize = size * 0.22;
  const textSize = size * 0.11;

  return (
    <View style={[styles.disc, { width: disc, height: disc, borderRadius: disc / 2, backgroundColor: '#8E24AA' }]}>
      <View style={styles.gallegaRow}>
        <Text style={[styles.gallegaG, { fontSize: gSize }]}>G</Text>
        <Text style={[styles.gallegaName, { fontSize: textSize }]}>La Gallega</Text>
      </View>
    </View>
  );
}

export function CarrefourOrbLogo({ size }: OrbLogoProps) {
  const disc = size * 0.6;
  const iconSize = size * 0.2;
  const textSize = size * 0.09;

  return (
    <View style={[styles.disc, { width: disc, height: disc, borderRadius: disc / 2, backgroundColor: '#1976D2' }]}>
      <Text style={[styles.carrefourIcon, { fontSize: iconSize }]}>‹›</Text>
      <Text style={[styles.carrefourText, { fontSize: textSize }]}>Carrefour</Text>
    </View>
  );
}

export function JumboOrbLogo({ size }: OrbLogoProps) {
  const disc = size * 0.6;
  const titleSize = size * 0.13;
  const subSize = size * 0.055;

  return (
    <View
      style={[
        styles.disc,
        styles.jumboDisc,
        { width: disc, height: disc, borderRadius: disc / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
      ]}
    >
      <Text style={[styles.jumboTitle, { fontSize: titleSize }]}>JUMBO</Text>
      <Text style={[styles.jumboSub, { fontSize: subSize }]}>ranvitout</Text>
    </View>
  );
}

export function DarOrbLogo({ size }: OrbLogoProps) {
  const textSize = size * 0.34;

  return (
    <Text
      style={[
        styles.darText,
        {
          fontSize: textSize,
          lineHeight: textSize * 1.05,
        },
      ]}
    >
      dar
    </Text>
  );
}

export function CotoOrbLogo({ size }: OrbLogoProps) {
  const textSize = size * 0.26;

  return (
    <Text
      style={[
        styles.cotoText,
        {
          fontSize: textSize,
          lineHeight: textSize * 1.05,
        },
      ]}
    >
      COTO
    </Text>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gallegaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  gallegaG: {
    color: '#FF5722',
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: '#3E2723',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gallegaName: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  carrefourIcon: {
    color: '#E53935',
    fontWeight: '900',
    letterSpacing: -4,
    marginBottom: -2,
  },
  carrefourText: {
    color: '#0D47A1',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  jumboDisc: {
    backgroundColor: '#00A651',
  },
  jumboTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  jumboSub: {
    color: '#FFFFFF',
    fontWeight: '400',
    marginTop: 1,
  },
  darText: {
    color: '#F5C518',
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: '#1A1200',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  cotoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
    textShadowColor: '#D50000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});
