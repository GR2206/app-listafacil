import { useMemo } from 'react';

import { useHomeBackground } from '@/context/HomeBackgroundContext';

const LOGO_FALLBACK = require('../../../assets/logo_redondeado.png');
const LOGO_FINAL_FALLBACK = require('../../../assets/logo.png');

type AppLogoVariant = 'rounded' | 'final';

const FALLBACK_BY_VARIANT: Record<AppLogoVariant, number> = {
  rounded: LOGO_FALLBACK,
  final: LOGO_FINAL_FALLBACK,
};

export function useAppLogoSource(variant: AppLogoVariant = 'rounded') {
  const { appLogoUrl, usedFallbackManifest } = useHomeBackground();

  return useMemo(() => {
    if (appLogoUrl && !usedFallbackManifest) {
      return { uri: appLogoUrl } as const;
    }
    return FALLBACK_BY_VARIANT[variant];
  }, [appLogoUrl, usedFallbackManifest, variant]);
}
