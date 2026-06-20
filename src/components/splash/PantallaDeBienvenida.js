import { Image, StyleSheet, View } from 'react-native';

import { useAppLogoSource } from '@/components/home/useAppLogoSource';

const LOGO_BORDER_RADIUS = 40;

/**
 * Splash premium: logo desde Gist (home-app.json) o fallback local.
 */
export function PantallaDeBienvenida() {
  const logoSource = useAppLogoSource('rounded');

  return (
    <View style={styles.root}>
      <View style={styles.logoFrame}>
        <Image
          source={logoSource}
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
