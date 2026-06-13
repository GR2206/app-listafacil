import { Image, type ImageContentFit, type ImageProps } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

type BannerImageSource = ImageProps['source'];

interface BannerImageViewProps {
  source: BannerImageSource;
  contentFit: ImageContentFit;
  style?: StyleProp<ImageStyle>;
  onLoad?: () => void;
  onError?: () => void;
}

export function BannerImageView({
  source,
  contentFit,
  style,
  onLoad,
  onError,
}: BannerImageViewProps) {
  return (
    <Image
      source={source}
      style={[styles.image, style]}
      contentFit={contentFit}
      placeholderContentFit={contentFit}
      allowDownscaling={false}
      priority="high"
      cachePolicy="memory-disk"
      decodeFormat="argb"
      transition={180}
      onLoad={onLoad}
      onError={onError}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});
