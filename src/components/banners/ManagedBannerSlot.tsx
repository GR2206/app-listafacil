import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { BannerImageView } from '@/components/banners/BannerImageView';
import { BannerLottieView } from '@/components/banners/BannerLottieView';
import { BANNER_CONTENT_FIT } from '@/config/bannerMedia';
import { useBannerManager } from '@/hooks/useBannerManager';
import { prefetchBannerAnimation, prefetchBannerImage, resolveBannerSlot } from '@/services/bannerManager';
import type { BannerSlotId } from '@/types/banner';
import { openBannerTarget } from '@/utils/openBannerTarget';
import { homeColors } from '@/theme/home';
import { radii } from '@/theme';

const LIST_BANNER_WIDTH = 300;
const LIST_BANNER_HEIGHT = 50;

interface ManagedBannerSlotProps {
  slot: BannerSlotId;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

function isRemoteImageSource(
  source: ResolvedBannerImageSource | undefined
): source is { uri: string } {
  return Boolean(source && typeof source === 'object' && 'uri' in source);
}

type ResolvedBannerImageSource = { uri: string } | number;

export function ManagedBannerSlot({ slot, style, imageStyle }: ManagedBannerSlotProps) {
  const { isLoading, isReady, getBanner, manifest } = useBannerManager();
  const [mediaFailed, setMediaFailed] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const contentFit = BANNER_CONTENT_FIT[slot];

  const resolved = useMemo(() => {
    if (mediaFailed && manifest) {
      return resolveBannerSlot(manifest, slot, true);
    }
    return getBanner(slot);
  }, [getBanner, manifest, mediaFailed, slot]);

  useEffect(() => {
    setMediaFailed(false);
    setMediaReady(false);
  }, [resolved.animationUrl, resolved.imageSource, resolved.mediaType, slot]);

  useEffect(() => {
    if (resolved.mediaType === 'lottie' && resolved.animationUrl) {
      void prefetchBannerAnimation(resolved.animationUrl);
      return;
    }

    if (resolved.mediaType === 'image' && isRemoteImageSource(resolved.imageSource)) {
      void prefetchBannerImage(resolved.imageSource.uri);
    }
  }, [resolved.animationUrl, resolved.imageSource, resolved.mediaType]);

  const openTarget = useCallback(async () => {
    await openBannerTarget(slot, resolved.targetUrl);
  }, [resolved.targetUrl, slot]);

  const isList = slot === 'list_banner';
  const showLoading = isLoading || (resolved.isRemote && !mediaReady && !mediaFailed);

  if (!isReady && isLoading) {
    return <BannerSlotSkeleton slot={slot} style={style} />;
  }

  if (!resolved.enabled) {
    return null;
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Banner publicitario"
      activeOpacity={0.88}
      onPress={() => void openTarget()}
      disabled={!resolved.targetUrl}
      style={[
        isList ? styles.listWrap : styles.rectWrap,
        showLoading && styles.hiddenWhileLoading,
        style,
      ]}
    >
      {resolved.mediaType === 'lottie' && resolved.animationUrl ? (
        <BannerLottieView
          uri={resolved.animationUrl}
          contentFit={contentFit}
          style={isList ? styles.listMedia : styles.rectMedia}
          onReady={() => setMediaReady(true)}
          onError={() => {
            setMediaFailed(true);
            setMediaReady(true);
          }}
        />
      ) : (
        <BannerImageView
          source={resolved.imageSource!}
          contentFit={contentFit}
          style={[isList ? styles.listImage : styles.rectImage, imageStyle]}
          onLoad={() => setMediaReady(true)}
          onError={() => {
            setMediaFailed(true);
            setMediaReady(true);
          }}
        />
      )}

      {showLoading ? (
        <View style={[StyleSheet.absoluteFillObject, styles.loadingOverlay]}>
          <ActivityIndicator color={homeColors.logoRing} size="small" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function BannerSlotSkeleton({
  slot,
  style,
}: {
  slot: BannerSlotId;
  style?: StyleProp<ViewStyle>;
}) {
  const isList = slot === 'list_banner';

  return (
    <View
      style={[isList ? styles.listSkeleton : styles.rectSkeleton, style]}
      accessibilityLabel="Cargando banner"
    >
      <ActivityIndicator color={homeColors.logoRing} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  rectWrap: {
    flex: 1,
    height: 52,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 18, 28, 0.35)',
  },
  rectImage: {
    width: '100%',
    height: 52,
  },
  rectMedia: {
    width: '100%',
    height: 52,
  },
  listWrap: {
    width: LIST_BANNER_WIDTH,
    height: LIST_BANNER_HEIGHT,
    alignSelf: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E8EDF2',
  },
  listImage: {
    width: LIST_BANNER_WIDTH,
    height: LIST_BANNER_HEIGHT,
    borderRadius: 8,
  },
  listMedia: {
    width: LIST_BANNER_WIDTH,
    height: LIST_BANNER_HEIGHT,
    borderRadius: 8,
  },
  hiddenWhileLoading: {
    opacity: 0.92,
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 18, 28, 0.25)',
  },
  rectSkeleton: {
    flex: 1,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 18, 28, 0.35)',
  },
  listSkeleton: {
    width: LIST_BANNER_WIDTH,
    height: LIST_BANNER_HEIGHT,
    alignSelf: 'center',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EDF2',
  },
});

export const bannerSlotMetrics = {
  listWidth: LIST_BANNER_WIDTH,
  listHeight: LIST_BANNER_HEIGHT,
};
