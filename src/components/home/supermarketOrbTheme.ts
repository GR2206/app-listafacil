import { getOrbVisualPreset } from '@/components/home/supermarketOrbVisualPresets';
import type { OrbVisualPresetId } from '@/components/home/supermarketOrbVisualPresets';

/** Contorno neón por cadena — referencia image final */
export const SUPERMARKET_NEON_COLORS: Record<string, string> = {
  'la-reina': '#FF8C1A',
  'la-gallega': '#D946EF',
  carrefour: '#3B9BFF',
  jumbo: '#00E676',
  dar: '#FFBF00',
  coto: '#FF1A2E',
};

/** Disco de color detrás del logo (gallega, carrefour, jumbo) */
export const SUPERMARKET_LOGO_DISCS: Record<string, { color: string; border?: string }> = {
  'la-gallega': { color: '#7B1FA2' },
  carrefour: { color: '#1565C0' },
  jumbo: { color: '#00A651', border: 'rgba(255,255,255,0.85)' },
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

export function getSupermarketNeonColor(marketId: string): string {
  return SUPERMARKET_NEON_COLORS[marketId] ?? '#FFFFFF';
}

export type { OrbVisualPresetId };
