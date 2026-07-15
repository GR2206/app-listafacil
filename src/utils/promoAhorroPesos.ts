/** Parsea montos AR ($15.000 / 15000 / 15.000) y formatea “Ahorrás $…”. */

/** Extrae el primer monto en pesos de un texto (tope, etc.). */
export function parsePesosAmount(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.round(raw);
  }
  if (typeof raw !== 'string' || !raw.trim()) return null;

  // "$15.000/mes", "hasta $25.000", "10000"
  const match = raw.replace(/\s/g, '').match(/\$?\s*(\d{1,3}(?:\.\d{3})+|\d+)/);
  if (!match) return null;
  const digits = match[1].replace(/\./g, '');
  const value = Number(digits);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Formato AR: 15000 → "$15.000" */
export function formatPesosAR(amount: number): string {
  const whole = Math.round(Math.abs(amount));
  const withDots = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${withDots}`;
}

/**
 * Monto de impacto visual: campo explícito > parseo del tope.
 */
export function resolveAhorroPesos(item: {
  ahorroPesos?: number | null;
  tope?: string;
}): number | null {
  if (typeof item.ahorroPesos === 'number' && Number.isFinite(item.ahorroPesos) && item.ahorroPesos > 0) {
    return Math.round(item.ahorroPesos);
  }
  return parsePesosAmount(item.tope);
}

export function formatAhorrasLine(amount: number): string {
  return `Ahorrás ${formatPesosAR(amount)}`;
}
