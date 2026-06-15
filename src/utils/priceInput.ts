export function normalizePriceInput(text: string): string {
  return text.replace(/,/g, '.').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

export function parsePriceInput(text: string): number {
  if (!text) return 0;
  const value = parseFloat(text);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}
