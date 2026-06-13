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

const GLOW_BRIGHTNESS = 1.35;
/** Tamaño e intensidad del halo de fondo en botones de la home (+20%). */
const GLOW_BACKGROUND_SCALE = 1.2;

/** Halo exterior difuso — +35% brillo sobre intensidad previa */
export const ORB_NEON_GLOW_LAYERS = [
  { spread: Math.round(66 * GLOW_BACKGROUND_SCALE), opacity: 0.0039 * GLOW_BRIGHTNESS * GLOW_BACKGROUND_SCALE },
  { spread: Math.round(54 * GLOW_BACKGROUND_SCALE), opacity: 0.0058 * GLOW_BRIGHTNESS * GLOW_BACKGROUND_SCALE },
  { spread: Math.round(42 * GLOW_BACKGROUND_SCALE), opacity: 0.009 * GLOW_BRIGHTNESS * GLOW_BACKGROUND_SCALE },
  { spread: Math.round(32 * GLOW_BACKGROUND_SCALE), opacity: 0.0138 * GLOW_BRIGHTNESS * GLOW_BACKGROUND_SCALE },
  { spread: Math.round(22 * GLOW_BACKGROUND_SCALE), opacity: 0.0207 * GLOW_BRIGHTNESS * GLOW_BACKGROUND_SCALE },
  { spread: Math.round(16 * GLOW_BACKGROUND_SCALE), opacity: 0.0317 * GLOW_BRIGHTNESS * GLOW_BACKGROUND_SCALE },
  { spread: Math.round(10 * GLOW_BACKGROUND_SCALE), opacity: 0.0469 * GLOW_BRIGHTNESS * GLOW_BACKGROUND_SCALE },
  { spread: Math.round(6 * GLOW_BACKGROUND_SCALE), opacity: 0.069 * GLOW_BRIGHTNESS * GLOW_BACKGROUND_SCALE },
  { spread: Math.round(3 * GLOW_BACKGROUND_SCALE), opacity: 0.0938 * GLOW_BRIGHTNESS * GLOW_BACKGROUND_SCALE },
] as const;

/** Anillo plasma intenso pegado al borde del orbe */
export const ORB_PLASMA_RING = {
  spread: 6,
  borderWidth: 3.5,
  opacity: 0.131 * GLOW_BRIGHTNESS,
} as const;

/** Partículas / destellos alrededor del halo neón */
export const ORB_SPARKLE_OFFSETS = [
  { top: '4%', left: '10%', size: 3.5, opacity: 0.138 * GLOW_BRIGHTNESS },
  { top: '14%', right: '2%', size: 2, opacity: 0.117 * GLOW_BRIGHTNESS },
  { top: '28%', left: '-3%', size: 2.5, opacity: 0.124 * GLOW_BRIGHTNESS },
  { top: '46%', right: '-2%', size: 2, opacity: 0.110 * GLOW_BRIGHTNESS },
  { bottom: '24%', left: '4%', size: 3, opacity: 0.131 * GLOW_BRIGHTNESS },
  { bottom: '12%', right: '10%', size: 2.5, opacity: 0.122 * GLOW_BRIGHTNESS },
  { bottom: '6%', left: '22%', size: 1.8, opacity: 0.104 * GLOW_BRIGHTNESS },
  { top: '36%', right: '8%', size: 1.5, opacity: 0.097 * GLOW_BRIGHTNESS },
  { bottom: '32%', right: '-1%', size: 2.2, opacity: 0.127 * GLOW_BRIGHTNESS },
  { top: '52%', left: '6%', size: 1.6, opacity: 0.108 * GLOW_BRIGHTNESS },
] as const;

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

/** Animaciones premium del orbe */
export const ORB_ANIMATION = {
  pressDurationMs: 120,
  /** Ciclo completo inhalar/exhalar del destello (ms). */
  breatheDurationMs: 5600,
  /** El halo se achica y agranda; el botón queda fijo. */
  breatheGlowScaleMin: 0.9,
  breatheGlowScaleMax: 1,
  breatheGlowOpacityMin: 0.68,
  breatheGlowOpacityMax: 1,
  pressScale: 0.97,
  pressTranslateY: 0,
  pressGlowOpacity: 0.82,
  neonShadowOpacity: 0.110 * GLOW_BRIGHTNESS,
  neonShadowRadius: Math.round(25 * GLOW_BACKGROUND_SCALE),
} as const;

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