import { View, Text, StyleSheet } from 'react-native';

interface JumboOrbLogoProps {
  size: number;
  discRatio?: number;
}

/** Logo Jumbo — disco verde con anillo y texto correcto */
export function JumboOrbLogo({ size, discRatio = 0.78 }: JumboOrbLogoProps) {
  const disc = size * discRatio;
  const titleSize = size * 0.17;
  const subSize = size * 0.065;
  const dotSize = size * 0.055;
  const ringWidth = Math.max(1.5, size * 0.012);

  return (
    <View
      style={[
        styles.disc,
        {
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          borderWidth: ringWidth,
        },
      ]}
    >
      <View
        style={[
          styles.orbitDot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            top: disc * 0.1,
            right: disc * 0.06,
            borderWidth: ringWidth * 0.8,
          },
        ]}
      />
      <Text style={[styles.title, { fontSize: titleSize }]}>JUMBO</Text>
      <Text style={[styles.sub, { fontSize: subSize }]}>cencosud</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    backgroundColor: '#00A651',
    borderColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  orbitDot: {
    position: 'absolute',
    backgroundColor: '#D4E157',
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  sub: {
    color: '#FFFFFF',
    fontWeight: '400',
    marginTop: 1,
    letterSpacing: 0.2,
  },
});
