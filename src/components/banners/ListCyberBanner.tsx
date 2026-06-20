import { useCallback, useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';

import { useBannerManager } from '@/hooks/useBannerManager';
import { ManagedBannerSlot } from '@/components/banners/ManagedBannerSlot';
import { ListBannerNeonGlow } from '@/components/banners/ListBannerNeonGlow';
import { hasRemoteBannerCreative } from '@/services/bannerManager';
import { openBannerTarget } from '@/utils/openBannerTarget';
import { withClickSound } from '@/utils/withClickSound';
import {
  LIST_BANNER_HEIGHT,
  LIST_BANNER_WIDTH,
} from '@/config/bannerDimensions';

const LIST_BANNER_ART = require('../../../assets/list_banner_300x50.png');

export { LIST_BANNER_WIDTH, LIST_BANNER_HEIGHT };

const ACCESSIBILITY_LABEL = 'ListaFacil te cuida el bolsillo';
const DEFAULT_SUPERMARKET_ID = 'carrefour';

interface ListCyberBannerProps {
  supermarketId?: string;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

export function ListCyberBanner({
  supermarketId = DEFAULT_SUPERMARKET_ID,
  style,
}: ListCyberBannerProps) {
  const { getBanner } = useBannerManager();
  const resolved = getBanner('list_banner');

  if (!resolved.enabled) {
    return null;
  }

  if (hasRemoteBannerCreative(resolved)) {
    return (
      <ListBannerNeonGlow supermarketId={supermarketId} style={style}>
        <ManagedBannerSlot slot="list_banner" />
      </ListBannerNeonGlow>
    );
  }

  return (
    <ListCyberBannerFallback
      supermarketId={supermarketId}
      targetUrl={resolved.targetUrl}
      style={style}
    />
  );
}

function ListCyberBannerFallback({
  supermarketId,
  targetUrl,
  style,
}: {
  supermarketId: string;
  targetUrl: string | null;
  style?: ListCyberBannerProps['style'];
}) {
  const openTarget = useCallback(async () => {
    await openBannerTarget('list_banner', targetUrl);
  }, [targetUrl]);

  return (
    <ListBannerNeonGlow supermarketId={supermarketId} style={style}>
      <Pressable
        style={({ pressed }) => [styles.root, pressed && styles.rootPressed]}
        onPress={withClickSound(() => void openTarget())}
        disabled={!targetUrl}
        accessibilityRole="button"
        accessibilityLabel={ACCESSIBILITY_LABEL}
        accessibilityHint="Abre el enlace promocional configurado"
      >
        <Image
          source={LIST_BANNER_ART}
          style={styles.art}
          resizeMode="stretch"
          accessibilityIgnoresInvertColors
        />
      </Pressable>
    </ListBannerNeonGlow>
  );
}

const styles = StyleSheet.create({
  root: {
    width: LIST_BANNER_WIDTH,
    height: LIST_BANNER_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#020612',
  },
  rootPressed: {
    opacity: 0.94,
  },
  art: {
    width: LIST_BANNER_WIDTH,
    height: LIST_BANNER_HEIGHT,
    borderRadius: 10,
  },
});
