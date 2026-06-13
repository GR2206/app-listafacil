import { formatCurrency } from '@/utils/formatCurrency';

import { isPriceAvailable } from '@/utils/resolvePrice';



export const PRICE_UNAVAILABLE_LABEL = 'Consultar en góndola';



export function formatPriceDisplay(amount: number): string {

  return isPriceAvailable(amount) ? formatCurrency(amount) : PRICE_UNAVAILABLE_LABEL;

}

/** Total del pie de lista: siempre monto en pesos (incluye $ 0,00 al iniciar). */
export function formatTotalDisplay(amount: number): string {
  const value = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}


