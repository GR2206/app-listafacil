import { Asset } from 'expo-asset';
import { Image } from 'expo-image';

import { fetchBannerManifest, prefetchManifestImages } from '@/services/bannerManager';
import { preloadAppFonts } from '@/services/preloadAppFonts';
import { seedMockCatalog } from '@/db/seed';
import { areSoundsPreloaded, preloadSounds } from '@/services/playSound';

import { APP_TECH_BACKGROUND } from '@/components/layout/AppBackground';

const SPLASH_LOGO = require('../../assets/logo_redondeado.png');

async function preloadVisualAssets(): Promise<void> {
  await Asset.loadAsync([SPLASH_LOGO, APP_TECH_BACKGROUND]);
  await Promise.all([Image.loadAsync(SPLASH_LOGO), Image.loadAsync(APP_TECH_BACKGROUND)]);
}

async function preloadBannerAssets(): Promise<void> {
  const { manifest } = await fetchBannerManifest();
  await prefetchManifestImages(manifest);
}

async function prepareDatabaseLayer(
  hydrate: () => Promise<void>,
  hydrateMerchantAuth: () => Promise<void>
): Promise<void> {
  // SQLite en Android no tolera apertura/migración concurrente: una sola cadena.
  await seedMockCatalog();
  await hydrate();
  await hydrateMerchantAuth();
}

export async function prepareAppResources(
  hydrate: () => Promise<void>,
  hydrateMerchantAuth: () => Promise<void>
): Promise<void> {
  await Promise.all([preloadSounds(), preloadVisualAssets(), preloadAppFonts()]);

  if (!areSoundsPreloaded()) {
    await preloadSounds();
  }

  await Promise.all([
    preloadBannerAssets(),
    prepareDatabaseLayer(hydrate, hydrateMerchantAuth),
  ]);
}

export const splashAssets = {
  logo: SPLASH_LOGO,
};
