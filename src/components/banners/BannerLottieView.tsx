import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

import type { BannerContentFit } from '@/config/bannerMedia';

/** Lottie solo acepta cover | contain | center; `fill` del banner → cover. */
const LOTTIE_RESIZE_MODE: Record<BannerContentFit, 'cover' | 'contain' | 'center'> = {
  cover: 'cover',
  contain: 'contain',
  fill: 'cover',
};

interface BannerLottieViewProps {
  uri: string;
  contentFit: BannerContentFit;
  style?: StyleProp<ViewStyle>;
  onReady?: () => void;
  onError?: () => void;
}

export function BannerLottieView({
  uri,
  contentFit,
  style,
  onReady,
  onError,
}: BannerLottieViewProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (failed) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <LottieView
        source={{ uri }}
        autoPlay
        loop
        style={StyleSheet.absoluteFillObject}
        resizeMode={LOTTIE_RESIZE_MODE[contentFit]}
        onAnimationLoaded={() => onReady?.()}
        onAnimationFailure={() => {
          setFailed(true);
          onError?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
