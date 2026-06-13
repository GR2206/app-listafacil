import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

import type { BannerContentFit } from '@/config/bannerMedia';

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
        resizeMode={contentFit}
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
