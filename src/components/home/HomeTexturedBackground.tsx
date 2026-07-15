import { useEffect, useState, type ReactNode } from 'react';

import { ImageBackground, StyleSheet, View } from 'react-native';

import { useHomeBackground } from '@/hooks/useHomeBackground';
import { useDeviceTilt } from '@/hooks/useDeviceTilt';

export const HOME_SCREEN_BACKGROUND_FALLBACK = require('../../../assets/home.png');

interface HomeTexturedBackgroundProps {
  children: ReactNode;
  paddingTop?: number;
  /** Parallax suave por inclinación; una sola capa (sin duplicar la imagen del Gist). */
  parallaxEnabled?: boolean;
}

export function HomeTexturedBackground({
  children,
  paddingTop = 0,
  parallaxEnabled = true,
}: HomeTexturedBackgroundProps) {
  const { homeBackgroundUrl, usedFallbackManifest } = useHomeBackground();
  const [remoteFailed, setRemoteFailed] = useState(false);
  const tilt = useDeviceTilt(parallaxEnabled);

  useEffect(() => {
    setRemoteFailed(false);
  }, [homeBackgroundUrl]);

  const useRemote = Boolean(homeBackgroundUrl) && !usedFallbackManifest && !remoteFailed;
  const source = useRemote
    ? { uri: homeBackgroundUrl! }
    : HOME_SCREEN_BACKGROUND_FALLBACK;

  return (
    <View style={[styles.root, { paddingTop }]}>
      <View
        pointerEvents="none"
        style={[
          styles.layer,
          parallaxEnabled
            ? {
                transform: [
                  { translateX: tilt.x * 12 },
                  { translateY: tilt.y * 9 },
                  { scale: 1.06 },
                ],
              }
            : null,
        ]}
      >
        <ImageBackground
          key={useRemote ? homeBackgroundUrl! : 'local-home'}
          source={source}
          style={styles.fill}
          imageStyle={styles.backgroundImage}
          resizeMode="cover"
          onError={() => setRemoteFailed(true)}
        />
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050508',
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  fill: {
    flex: 1,
  },
  backgroundImage: {
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
  },
});
