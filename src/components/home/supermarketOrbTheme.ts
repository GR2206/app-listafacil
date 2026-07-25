import { getCatalogEntry } from '@/data/supermarketCatalog';
import { getOrbVisualPreset } from '@/components/home/supermarketOrbVisualPresets';
import type { OrbVisualPresetId } from '@/components/home/supermarketOrbVisualPresets';

/** Contorno neón por cadena — catálogo + overrides puntuales. */
export const SUPERMARKET_NEON_COLORS: Record<string, string> = {
  'la-reina': '#FF8C1A',
  'la-gallega': '#D946EF',
  carrefour: '#3B9BFF',
  jumbo: '#00E676',
  dar: '#FFBF00',
  coto: '#FF1A2E',
  arcoiris: '#00A651',
  unico: '#E30613',
  disco: '#E30613',
  dia: '#E30613',
  vea: '#EE1D23',
  atomo: '#E30613',
  changomas: '#7CB342',
  'la-anonima': '#004A99',
  california: '#F5A623',
  yaguar: '#00A651',
  maxiconsumo: '#E30613',
  vital: '#0091DA',
  toledo: '#0B1F3F',
};

export function getSupermarketNeonColor(supermarketId: string): string {
  return (
    getCatalogEntry(supermarketId)?.neonColor ??
    SUPERMARKET_NEON_COLORS[supermarketId] ??
    '#00E5FF'
  );
}

export const SUPERMARKET_NEON_COLOR_PALETTES: Record<string, string[]> = {
  arcoiris: ['#E30613', '#FFD100', '#00A651'],
  unico: ['#E30613', '#FFD100', '#006B3F'],
};

/** Disco de color detrás del logo (gallega, carrefour, jumbo) */
export const SUPERMARKET_LOGO_DISCS: Record<string, { color: string; border?: string }> = {
  'la-gallega': { color: '#7B1FA2' },
  carrefour: { color: '#1565C0' },
  jumbo: { color: '#00A651', border: 'rgba(255,255,255,0.85)' },
  disco: { color: '#111111', border: 'rgba(255,255,255,0.9)' },
  dia: { color: '#111111', border: 'rgba(255,255,255,0.9)' },
  vea: { color: '#111111', border: 'rgba(255,255,255,0.9)' },
  // Logo con fondo negro: disco negro para que el recorte circular no muestre bordes.
  unico: { color: '#111111', border: 'rgba(255,255,255,0.9)' },
  'la-anonima': { color: '#FFFFFF', border: 'rgba(0,74,153,0.45)' },
  // Posadas: contraste para wordmarks claros/oscuros dentro del orbe.
  california: { color: '#111111', border: 'rgba(255,255,255,0.85)' },
  yaguar: { color: '#111111', border: 'rgba(255,255,255,0.9)' },
  maxiconsumo: { color: '#F5F5F5', border: 'rgba(10,37,90,0.35)' },
  vital: { color: '#111111', border: 'rgba(255,255,255,0.85)' },
  toledo: { color: '#F4F7FB', border: 'rgba(11,31,63,0.45)' },
};

const CURRENT = getOrbVisualPreset('current');

/** Halo exterior difuso */
export const ORB_NEON_GLOW_LAYERS = CURRENT.glowLayers;

/** Anillo plasma intenso pegado al borde del orbe */
export const ORB_PLASMA_RING = CURRENT.plasmaRing;

/** Partículas / destellos alrededor del halo neón */
export const ORB_SPARKLE_OFFSETS = CURRENT.sparkleOffsets;

/** Curva senoidal para respiro suave (0→1→0 sin giros bruscos). */
export const ORB_BREATH_SINE_INPUT = [
  0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1,
] as const;

const ORB_BREATH_SINE_FACTORS = [
  0, 0.1464466094, 0.5, 0.8535533906, 1, 0.8535533906, 0.5, 0.1464466094, 0,
] as const;

export function buildOrbBreathRange(min: number, max: number): number[] {
  const span = max - min;
  return ORB_BREATH_SINE_FACTORS.map((factor) => min + span * factor);
}

/** Animaciones premium del orbe (preset actual en producción). */
export const ORB_ANIMATION = CURRENT.animation;

/** Deriva lenta del halo — visible solo si te detenés a mirar */
export const ORB_GLOW_DRIFT = {
  primaryDurationMs: 17_000,
  secondaryDurationMs: 23_000,
  sparkleDurationMs: 19_500,
  shimmerDurationMs: 13_000,
  primaryAmpX: 2.8,
  primaryAmpY: 2.2,
  secondaryAmpX: 1.6,
  secondaryAmpY: 1.4,
  sparkleAmpX: 3.2,
  sparkleAmpY: 2.6,
  shimmerOpacityMin: 0.9,
  shimmerOpacityMax: 1,
} as const;

/** Fase inicial distinta por supermercado para que no se muevan al unísono */
export function getOrbGlowPhaseOffset(marketId: string): number {
  let hash = 0;
  for (let i = 0; i < marketId.length; i += 1) {
    hash = (hash + marketId.charCodeAt(i) * (i + 3)) % 10_000;
  }
  return hash / 10_000;
}

export function getSupermarketNeonColors(marketId: string): string[] {
  const palette = SUPERMARKET_NEON_COLOR_PALETTES[marketId];
  if (palette?.length) return palette;
  return [getSupermarketNeonColor(marketId)];
}

export function getSupermarketNeonColorForIndex(marketId: string, index: number): string {
  const colors = getSupermarketNeonColors(marketId);
  return colors[index % colors.length] ?? getSupermarketNeonColor(marketId);
}

export type { OrbVisualPresetId };
