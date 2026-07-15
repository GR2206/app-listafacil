import { Asset } from 'expo-asset';
import { Image } from 'expo-image';

import { fetchBannerManifest, prefetchManifestImages } from '@/services/bannerManager';
import { fetchHomeAppManifest, prefetchAppLogoImage, prefetchHomeBackgroundImage } from '@/services/homeBackgroundManager';
import { fetchOfertaDiaManifest, prefetchOfertaDiaImages } from '@/services/ofertaDiaManager';
import { fetchPromosBancariasManifest } from '@/services/promosBancariasManager';
import { ensureZoneOnLaunch } from '@/services/ensureZoneOnLaunch';
import { preloadAppFonts } from '@/services/preloadAppFonts';
import { seedMockCatalog } from '@/db/seed';
import { areSoundsPreloaded, preloadSounds } from '@/services/playSound';

import { APP_TECH_BACKGROUND } from '@/components/layout/AppBackground';
import { HOME_SCREEN_BACKGROUND_FALLBACK } from '@/components/home/HomeTexturedBackground';

const SPLASH_LOGO = require('../../assets/logo_redondeado.png');

async function preloadVisualAssets(): Promise<void> {
  await Asset.loadAsync([SPLASH_LOGO, APP_TECH_BACKGROUND, HOME_SCREEN_BACKGROUND_FALLBACK]);
  await Promise.all([
    Image.loadAsync(SPLASH_LOGO),
    Image.loadAsync(APP_TECH_BACKGROUND),
    Image.loadAsync(HOME_SCREEN_BACKGROUND_FALLBACK),
  ]);
}

async function preloadBannerAssets(): Promise<void> {
  const { manifest } = await fetchBannerManifest();
  await prefetchManifestImages(manifest);
}

async function preloadHomeBackgroundAssets(): Promise<void> {
  const { manifest } = await fetchHomeAppManifest();
  await Promise.all([prefetchHomeBackgroundImage(manifest), prefetchAppLogoImage(manifest)]);
}

async function preloadOfertaDiaAssets(): Promise<void> {
  const { manifest } = await fetchOfertaDiaManifest();
  await prefetchOfertaDiaImages(manifest);
}

async function preloadPromosBancarias(): Promise<void> {
  await fetchPromosBancariasManifest();
}

async function prepareDatabaseLayer(
  hydrate: () => Promise<void>,
  hydrateMerchantAuth: () => Promise<void>
): Promise<void> {
  // SQLite en Android no tolera apertura/migración concurrente: una sola cadena.
  await seedMockCatalog();
  await hydrate();
  await hydrateMerchantAuth();
  // GPS solo si aún no hay zona (primer uso).
  await ensureZoneOnLaunch();
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
    preloadHomeBackgroundAssets(),
    preloadOfertaDiaAssets(),
    preloadPromosBancarias(),
    prepareDatabaseLayer(hydrate, hydrateMerchantAuth),
  ]);
}

export const splashAssets = {
  logo: SPLASH_LOGO,
};
