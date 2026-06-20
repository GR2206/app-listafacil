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
import { getBannerStripMetrics } from '@/config/bannerDimensions';
import { useBannerManager } from '@/hooks/useBannerManager';
import { prefetchBannerAnimation, prefetchBannerImage, resolveBannerSlot } from '@/services/bannerManager';
import type { BannerSlotId } from '@/types/banner';
import { openBannerTarget } from '@/utils/openBannerTarget';
import { homeColors } from '@/theme/home';
import { radii } from '@/theme';

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

function usesFixedStrip(slot: BannerSlotId): boolean {
  return slot === 'list_banner' || slot === 'top_banner';
}

export function ManagedBannerSlot({ slot, style, imageStyle }: ManagedBannerSlotProps) {
  const { isLoading, isReady, getBanner, manifest } = useBannerManager();
  const [mediaFailed, setMediaFailed] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const contentFit = BANNER_CONTENT_FIT[slot];
  const fixedStrip = usesFixedStrip(slot);
  const isTop = slot === 'top_banner';
  const isList = slot === 'list_banner';
  const metrics = useMemo(() => getBannerStripMetrics(slot), [slot]);

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

  const showLoading = isLoading || (resolved.isRemote && !mediaReady && !mediaFailed);

  const stripFrameStyle = useMemo(
    () => ({
      width: metrics.width,
      height: metrics.height,
      borderRadius: isList ? 8 : radii.lg,
    }),
    [isList, metrics.height, metrics.width]
  );

  const stripMediaStyle = useMemo(
    () => ({
      width: metrics.width,
      height: metrics.height,
      borderRadius: isList ? 8 : radii.lg,
    }),
    [isList, metrics.height, metrics.width]
  );

  if (!isReady && isLoading) {
    return <BannerSlotSkeleton slot={slot} style={style} />;
  }

  if (!resolved.enabled) {
    return null;
  }

  const bannerBody = (
    <>
      {resolved.mediaType === 'lottie' && resolved.animationUrl ? (
        <BannerLottieView
          uri={resolved.animationUrl}
          contentFit={contentFit}
          style={[stripMediaStyle, imageStyle]}
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
          style={[stripMediaStyle, imageStyle]}
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
    </>
  );

  if (fixedStrip) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Banner publicitario"
        activeOpacity={0.88}
        onPress={() => void openTarget()}
        disabled={!resolved.targetUrl}
        style={[
          isTop ? styles.topSlot : styles.listSlot,
          { height: metrics.height },
          showLoading && styles.hiddenWhileLoading,
          style,
        ]}
      >
        <View
          style={[
            styles.stripFrame,
            stripFrameStyle,
            isTop ? styles.stripFrameTop : styles.stripFrameList,
          ]}
        >
          {bannerBody}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Banner publicitario"
      activeOpacity={0.88}
      onPress={() => void openTarget()}
      disabled={!resolved.targetUrl}
      style={[
        styles.rectWrap,
        { height: metrics.height },
        showLoading && styles.hiddenWhileLoading,
        style,
      ]}
    >
      {bannerBody}
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
  const fixedStrip = usesFixedStrip(slot);
  const isTop = slot === 'top_banner';
  const metrics = getBannerStripMetrics(slot);

  return (
    <View
      style={[
        fixedStrip ? (isTop ? styles.topSlot : styles.listSlot) : styles.rectSkeleton,
        fixedStrip ? { height: metrics.height } : null,
        style,
      ]}
      accessibilityLabel="Cargando banner"
    >
      {fixedStrip ? (
        <View style={[styles.stripSkeletonInner, { width: metrics.width, height: metrics.height }]}>
          <ActivityIndicator color={homeColors.logoRing} size="small" />
        </View>
      ) : (
        <ActivityIndicator color={homeColors.logoRing} size="small" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topSlot: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listSlot: {
    alignSelf: 'center',
  },
  stripFrame: {
    overflow: 'hidden',
  },
  stripFrameTop: {
    backgroundColor: 'rgba(8, 14, 24, 0.55)',
  },
  stripFrameList: {
    backgroundColor: 'transparent',
  },
  hiddenWhileLoading: {
    opacity: 0.92,
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 18, 28, 0.25)',
  },
  rectWrap: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 18, 28, 0.35)',
  },
  rectSkeleton: {
    flex: 1,
    height: 50,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 18, 28, 0.35)',
  },
  stripSkeletonInner: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 18, 28, 0.35)',
  },
});

export { getBannerStripMetrics } from '@/config/bannerDimensions';

export const bannerSlotMetrics = {
  listWidth: 300,
  listHeight: 50,
  topWidth: 300,
  topHeight: 100,
};
