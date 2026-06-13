/** Relleno base del logo dentro del orbe (el botón mantiene su diámetro). */
const ORB_LOGO_BASE_FILL = 0.94;

/** Aumento de legibilidad (+20%) sin agrandar el orbe. */
const ORB_LOGO_ACCESSIBILITY_BOOST = 1.2;

/** Máximo diámetro útil dentro del vidrio circular (margen al borde). */
const ORB_LOGO_MAX_DIAMETER_RATIO = 0.98;

/**
 * Ajuste por super: logos horizontales o con mucho texto
 * reciben un factor menor para no perder bordes al recortar el círculo.
 */
const MARKET_LOGO_TUNING: Record<string, number> = {
  'la-reina': 0.93,
  'la-gallega': 0.9,
  carrefour: 0.97,
  coto: 1,
  dar: 1,
  jumbo: 0.96,
};

export function getOrbLogoSize(marketId: string, orbSize: number): number {
  const tuning = MARKET_LOGO_TUNING[marketId] ?? 1;
  const boosted = orbSize * ORB_LOGO_BASE_FILL * ORB_LOGO_ACCESSIBILITY_BOOST * tuning;
  const maxSize = orbSize * ORB_LOGO_MAX_DIAMETER_RATIO;
  return Math.round(Math.min(boosted, maxSize));
}

export function getJumboOrbDiscRatio(): number {
  const boosted = 0.78 * ORB_LOGO_ACCESSIBILITY_BOOST * (MARKET_LOGO_TUNING.jumbo ?? 1);
  return Math.min(boosted, ORB_LOGO_MAX_DIAMETER_RATIO);
}
