export type OrbVisualPresetId = 'current' | 'proposed';

export interface OrbGridMetrics {
  colGap: number;
  rowGap: number;
  slotPadding: number;
}

export interface OrbPressAnimation {
  pressDurationMs: number;
  breatheDurationMs: number;
  breatheGlowScaleMin: number;
  breatheGlowScaleMax: number;
  breatheGlowOpacityMin: number;
  breatheGlowOpacityMax: number;
  pressScale: number;
  pressTranslateY: number;
  pressGlowOpacity: number;
  pressBezelInset: number;
  neonShadowOpacity: number;
  neonShadowRadius: number;
}

export interface OrbGlowLayer {
  spread: number;
  opacity: number;
}

export interface OrbPlasmaRing {
  spread: number;
  borderWidth: number;
  opacity: number;
}

export interface OrbSparkleOffset {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number;
  opacity: number;
}

export interface OrbVisualPreset {
  id: OrbVisualPresetId;
  label: string;
  description: string;
  glowBackgroundScale: number;
  glowBrightness: number;
  grid: OrbGridMetrics;
  animation: OrbPressAnimation;
  glowLayers: readonly OrbGlowLayer[];
  plasmaRing: OrbPlasmaRing;
  sparkleOffsets: readonly OrbSparkleOffset[];
}

function buildGlowLayers(glowBackgroundScale: number, glowBrightness: number): OrbGlowLayer[] {
  return [
    { spread: Math.round(66 * glowBackgroundScale), opacity: 0.0039 * glowBrightness * glowBackgroundScale },
    { spread: Math.round(54 * glowBackgroundScale), opacity: 0.0058 * glowBrightness * glowBackgroundScale },
    { spread: Math.round(42 * glowBackgroundScale), opacity: 0.009 * glowBrightness * glowBackgroundScale },
    { spread: Math.round(32 * glowBackgroundScale), opacity: 0.0138 * glowBrightness * glowBackgroundScale },
    { spread: Math.round(22 * glowBackgroundScale), opacity: 0.0207 * glowBrightness * glowBackgroundScale },
    { spread: Math.round(16 * glowBackgroundScale), opacity: 0.0317 * glowBrightness * glowBackgroundScale },
    { spread: Math.round(10 * glowBackgroundScale), opacity: 0.0469 * glowBrightness * glowBackgroundScale },
    { spread: Math.round(6 * glowBackgroundScale), opacity: 0.069 * glowBrightness * glowBackgroundScale },
    { spread: Math.round(3 * glowBackgroundScale), opacity: 0.0938 * glowBrightness * glowBackgroundScale },
  ];
}

function buildSparkleOffsets(glowBrightness: number, glowBackgroundScale: number): OrbSparkleOffset[] {
  const b = glowBrightness * glowBackgroundScale;
  return [
    { top: '4%', left: '10%', size: 3.5, opacity: 0.138 * b },
    { top: '14%', right: '2%', size: 2, opacity: 0.117 * b },
    { top: '28%', left: '-3%', size: 2.5, opacity: 0.124 * b },
    { top: '46%', right: '-2%', size: 2, opacity: 0.110 * b },
    { bottom: '24%', left: '4%', size: 3, opacity: 0.131 * b },
    { bottom: '12%', right: '10%', size: 2.5, opacity: 0.122 * b },
    { bottom: '6%', left: '22%', size: 1.8, opacity: 0.104 * b },
    { top: '36%', right: '8%', size: 1.5, opacity: 0.097 * b },
    { bottom: '32%', right: '-1%', size: 2.2, opacity: 0.127 * b },
    { top: '52%', left: '6%', size: 1.6, opacity: 0.108 * b },
  ];
}

function buildPlasmaRing(glowBrightness: number, scale = 1): OrbPlasmaRing {
  return {
    spread: 6,
    borderWidth: 3.5,
    opacity: 0.131 * glowBrightness * scale,
  };
}

const GLOW_BRIGHTNESS = 1.35;
/** +20% sobre base, luego −5% de ajuste = ×1.14 */
const PRODUCTION_GLOW_SCALE = 1.14;

function buildProductionAnimation(): OrbPressAnimation {
  return {
    pressDurationMs: 90,
    breatheDurationMs: 5200,
    breatheGlowScaleMin: 0.88,
    breatheGlowScaleMax: 1.04,
    breatheGlowOpacityMin: 0.72,
    breatheGlowOpacityMax: 1,
    pressScale: 0.9,
    pressTranslateY: 6,
    pressGlowOpacity: 0.76,
    pressBezelInset: 4,
    neonShadowOpacity: 0.14 * GLOW_BRIGHTNESS,
    neonShadowRadius: Math.round(25 * PRODUCTION_GLOW_SCALE),
  };
}

const ORB_VISUAL_CURRENT: OrbVisualPreset = {
  id: 'current',
  label: 'Actual (en producción)',
  description: 'Animación 3D, grilla compacta y destello afinado.',
  glowBackgroundScale: PRODUCTION_GLOW_SCALE,
  glowBrightness: GLOW_BRIGHTNESS,
  grid: { colGap: 10, rowGap: 22, slotPadding: 10 },
  animation: buildProductionAnimation(),
  glowLayers: buildGlowLayers(PRODUCTION_GLOW_SCALE, GLOW_BRIGHTNESS),
  plasmaRing: buildPlasmaRing(GLOW_BRIGHTNESS, 1.08),
  sparkleOffsets: buildSparkleOffsets(GLOW_BRIGHTNESS, PRODUCTION_GLOW_SCALE),
};

/** Referencia anterior para comparar en vista previa dev. */
const ORB_VISUAL_PROPOSED: OrbVisualPreset = {
  id: 'proposed',
  label: 'Anterior (sin 3D)',
  description: 'Versión previa sin hundimiento al tocar.',
  glowBackgroundScale: 1,
  glowBrightness: GLOW_BRIGHTNESS,
  grid: { colGap: 12, rowGap: 26, slotPadding: 12 },
  animation: {
    pressDurationMs: 120,
    breatheDurationMs: 5600,
    breatheGlowScaleMin: 0.9,
    breatheGlowScaleMax: 1,
    breatheGlowOpacityMin: 0.68,
    breatheGlowOpacityMax: 1,
    pressScale: 0.97,
    pressTranslateY: 0,
    pressGlowOpacity: 0.82,
    pressBezelInset: 0,
    neonShadowOpacity: 0.110 * GLOW_BRIGHTNESS,
    neonShadowRadius: 25,
  },
  glowLayers: buildGlowLayers(1, GLOW_BRIGHTNESS),
  plasmaRing: buildPlasmaRing(GLOW_BRIGHTNESS),
  sparkleOffsets: buildSparkleOffsets(GLOW_BRIGHTNESS, 1),
};

const PRESETS: Record<OrbVisualPresetId, OrbVisualPreset> = {
  current: ORB_VISUAL_CURRENT,
  proposed: ORB_VISUAL_PROPOSED,
};

export function getOrbVisualPreset(id: OrbVisualPresetId = 'current'): OrbVisualPreset {
  return PRESETS[id];
}

export const ORB_VISUAL_PRESETS = PRESETS;
