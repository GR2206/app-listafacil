import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import * as Font from 'expo-font';

export const APP_FONT_FAMILY = 'BebasNeue_400Regular';

let fontsReady = false;

export async function preloadAppFonts(): Promise<void> {
  if (fontsReady || Font.isLoaded(APP_FONT_FAMILY)) {
    fontsReady = true;
    return;
  }

  await Font.loadAsync({ [APP_FONT_FAMILY]: BebasNeue_400Regular });
  fontsReady = true;
}

export function areAppFontsLoaded(): boolean {
  return fontsReady || Font.isLoaded(APP_FONT_FAMILY);
}
