import { useEffect, useState, type ReactNode } from 'react';

import { ImageBackground, StyleSheet } from 'react-native';

import { useHomeBackground } from '@/hooks/useHomeBackground';

/** Fondo original embebido: se usa sin internet o si falla la imagen del Gist. */
export const HOME_SCREEN_BACKGROUND_FALLBACK = require('../../../assets/home.png');

interface HomeTexturedBackgroundProps {
  children: ReactNode;
  paddingTop?: number;
}

export function HomeTexturedBackground({ children, paddingTop = 0 }: HomeTexturedBackgroundProps) {
  const { homeBackgroundUrl, usedFallbackManifest } = useHomeBackground();
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setRemoteFailed(false);
  }, [homeBackgroundUrl]);

  const useRemote = Boolean(homeBackgroundUrl) && !usedFallbackManifest && !remoteFailed;
  const source = useRemote
    ? { uri: homeBackgroundUrl! }
    : HOME_SCREEN_BACKGROUND_FALLBACK;

  return (
    <ImageBackground
      key={useRemote ? homeBackgroundUrl : 'local-home-fallback'}
      source={source}
      style={[styles.root, { paddingTop }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
      onError={() => setRemoteFailed(true)}
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
