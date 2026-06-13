import { Image, StyleSheet, View } from 'react-native';

const LOGO_REDONDEADO = require('../../../assets/logo_redondeado.png');

const LOGO_BORDER_RADIUS = 40;

/**
 * Splash premium: solo muestra logo_redondeado.png tal cual, sin overlays ni texto extra.
 */
export function PantallaDeBienvenida() {
  return (
    <View style={styles.root}>
      <View style={styles.logoFrame}>
        <Image
          source={LOGO_REDONDEADO}
          style={styles.logo}
          resizeMode="cover"
          accessibilityLabel="Lista Fácil"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  logoFrame: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    borderRadius: LOGO_BORDER_RADIUS,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
