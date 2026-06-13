import type { ReactNode } from 'react';

import { ImageBackground, StyleSheet } from 'react-native';

export const APP_TECH_BACKGROUND = require('../../../assets/home/home-main-background.png');

interface AppBackgroundProps {
  children: ReactNode;
  paddingTop?: number;
}

/** Fondo global unificado — misma imagen que la pantalla principal. */
export function AppBackground({ children, paddingTop = 0 }: AppBackgroundProps) {
  return (
    <ImageBackground
      source={APP_TECH_BACKGROUND}
      style={[styles.root, { paddingTop }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050508',
  },
  backgroundImage: {
    resizeMode: 'cover',
  },
});
