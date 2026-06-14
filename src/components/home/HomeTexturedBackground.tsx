import type { ReactNode } from 'react';

import { ImageBackground, StyleSheet } from 'react-native';

import { useHomeBackground } from '@/hooks/useHomeBackground';
import { isValidHttpUrl } from '@/utils/validateBannerUrl';

/** Fallback local si el Gist no trae URL o falla la red. */
export const HOME_SCREEN_BACKGROUND_FALLBACK = require('../../../assets/home.png');

interface HomeTexturedBackgroundProps {
  children: ReactNode;
  paddingTop?: number;
}

export function HomeTexturedBackground({ children, paddingTop = 0 }: HomeTexturedBackgroundProps) {
  const { homeBackgroundUrl } = useHomeBackground();

  const source =
    isValidHttpUrl(homeBackgroundUrl) && homeBackgroundUrl
      ? { uri: homeBackgroundUrl.trim() }
      : HOME_SCREEN_BACKGROUND_FALLBACK;

  return (
    <ImageBackground
      source={source}
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
