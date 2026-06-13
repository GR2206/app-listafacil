import { View, Text, StyleSheet } from 'react-native';

interface LaReinaOrbLogoProps {
  size: number;
}

/** Logo La Reina — letras blancas + R naranja con corona (referencia image) */
export function LaReinaOrbLogo({ size }: LaReinaOrbLogoProps) {
  const wordSize = size * 0.17;
  const rSize = size * 0.3;
  const subSize = size * 0.062;
  const crownSize = size * 0.1;

  return (
    <View style={styles.root}>
      <View style={styles.wordRow}>
        <Text style={[styles.word, { fontSize: wordSize }]}>LA</Text>
        <View style={styles.rBlock}>
          <Text style={[styles.crown, { fontSize: crownSize }]}>♛</Text>
          <Text style={[styles.rLetter, { fontSize: rSize, lineHeight: rSize * 1.05 }]}>R</Text>
        </View>
        <Text style={[styles.word, { fontSize: wordSize }]}>EINA</Text>
      </View>
      <View
        style={[
          styles.subPill,
          {
            marginTop: size * 0.02,
            paddingHorizontal: size * 0.06,
            paddingVertical: size * 0.012,
            borderRadius: size * 0.04,
          },
        ]}
      >
        <Text style={[styles.sub, { fontSize: subSize }]}>SUPERMERCADOS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -1,
  },
  crown: {
    color: '#F38020',
    marginBottom: -4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  rLetter: {
    color: '#F38020',
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subPill: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  sub: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
  },
});
