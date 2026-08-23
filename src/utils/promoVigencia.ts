import { SUPERMARKET_LOGOS } from '@/assets/supermarketLogos';
import type { PromoBancariaItem } from '@/types/promosBancarias';

/**
 * ¿La promo aplica HOY según el bot (`aplicaHoy`) o, si falta, según `dias`?
 * No usar `enProximas24h` como “hoy”: incluye días que aún no aplican.
 */
export function promoAppliesToday(promo: PromoBancariaItem): boolean {
  if (typeof promo.aplicaHoy === 'boolean') return promo.aplicaHoy;
  if (promo.dias.length === 0) return !promo.enProximas24h;
  const today = new Date().getDay(); // 0=dom … 6=sáb (mismo criterio del bot)
  return promo.dias.includes(today);
}

/** Primer súper de la promo con logo disponible (marca de agua / ancla visual). */
export function primarySupermarketIdForPromo(promo: PromoBancariaItem): string | null {
  for (const id of promo.supers) {
    if (id && SUPERMARKET_LOGOS[id]) return id;
  }
  return promo.supers[0]?.trim() || null;
}

export function resolvePromoVigenciaBadge(promo: PromoBancariaItem): {
  label: string;
  tone: 'hoy' | 'soon';
} {
  if (promoAppliesToday(promo)) {
    return { label: 'Vigente hoy', tone: 'hoy' };
  }
  if (promo.enProximas24h) {
    return { label: 'Próximas 24h', tone: 'soon' };
  }
  const dias = promo.diasLabel?.trim();
  if (dias) {
    const capped = dias.charAt(0).toUpperCase() + dias.slice(1);
    return { label: capped, tone: 'soon' };
  }
  return { label: 'Otros días', tone: 'soon' };
}
