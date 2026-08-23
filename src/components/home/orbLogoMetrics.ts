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
  // +30% vs tuning previo (1.0 / 0.58).
  dar: 1.3,
  alvear: 0.8,
  kilbel: 0.92,
  jumbo: 0.96,
  arcoiris: 0.88,
  // Logo ancho (wordmark + SUPERMERCADOS): achicar para centrar en el orbe.
  unico: 0.78,
  // Logos horizontales: Día/Vea/Disco −20% luego −15%; Átomo −15% (solo la imagen, no el orbe).
  disco: 0.53,
  dia: 0.49,
  vea: 0.53,
  atomo: 0.75,
  changomas: 0.82,
  'la-anonima': 0.86,
  // Wordmark horizontal Cooperativa Obrera.
  'cooperativa-obrera': 0.72,
  top: 0.82,
  // Logos anchos / con wordmark: margen extra dentro del orbe circular.
  california: 0.62,
  yaguar: 0.754,
  maxiconsumo: 0.68,
  vital: 0.56,
  // Wordmark horizontal: +25% vs base inicial (quedaba chico en el orbe).
  toledo: 0.725,
};

/** Tope de diámetro por super (permite +30% en logos que ya estaban al máximo). */
const MARKET_LOGO_MAX_RATIO: Record<string, number> = {
  dar: 1.18,
  yaguar: 1.05,
};

export function getOrbLogoSize(marketId: string, orbSize: number): number {
  const tuning = MARKET_LOGO_TUNING[marketId] ?? 1;
  const boosted = orbSize * ORB_LOGO_BASE_FILL * ORB_LOGO_ACCESSIBILITY_BOOST * tuning;
  const maxRatio = MARKET_LOGO_MAX_RATIO[marketId] ?? ORB_LOGO_MAX_DIAMETER_RATIO;
  const maxSize = orbSize * maxRatio;
  return Math.round(Math.min(boosted, maxSize));
}

export function getJumboOrbDiscRatio(): number {
  const boosted = 0.78 * ORB_LOGO_ACCESSIBILITY_BOOST * (MARKET_LOGO_TUNING.jumbo ?? 1);
  return Math.min(boosted, ORB_LOGO_MAX_DIAMETER_RATIO);
}
