import type { PromoBancariaItem, PromosBancariasManifest } from '@/types/promosBancarias';
import { formatPesosAR, resolveAhorroPesos } from '@/utils/promoAhorroPesos';
import { promoAppliesToZone } from '@/services/promosBancariasManager';

/** ¿La promo aplica a este súper concreto? */
export function promoAppliesToSupermarket(
  promo: PromoBancariaItem,
  supermarketId: string
): boolean {
  if (!supermarketId.trim()) return false;
  if (promo.supers.length === 0) return false;
  return promo.supers.includes(supermarketId);
}

/**
 * Mejor promo de HOY para el súper (excluye genéricas sin súper y prioriza hoy > +24h).
 */
export function findBestPromoForSupermarket(
  manifest: PromosBancariasManifest | null | undefined,
  supermarketId: string,
  zoneSetting: string | null
): PromoBancariaItem | null {
  if (!manifest || !supermarketId) return null;

  const candidates = manifest.promos_bancarias.filter(
    (promo) =>
      promoAppliesToZone(promo, zoneSetting) &&
      promoAppliesToSupermarket(promo, supermarketId)
  );

  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort((a, b) => {
    if (a.enProximas24h !== b.enProximas24h) return a.enProximas24h ? 1 : -1;
    const pctA = a.descuentoPct ?? 0;
    const pctB = b.descuentoPct ?? 0;
    if (pctA !== pctB) return pctB - pctA;
    if (a.prioridad !== b.prioridad) return b.prioridad - a.prioridad;
    return a.venceEnHoras - b.venceEnHoras;
  });

  return ranked[0] ?? null;
}

export function buildCartPromoTipMessage(
  promo: PromoBancariaItem,
  supermarketName: string
): string {
  const banco = promo.banco.trim() || 'tu banco';
  const medio = promo.medios[0]?.trim();
  const payLabel = medio ? `${banco} (${medio})` : banco;
  const superLabel = supermarketName.trim() || 'este súper';

  if (promo.descuentoPct != null) {
    return `¡Che, si pagás con ${payLabel}, hoy tenés ${promo.descuentoPct}% de reintegro en ${superLabel}!`;
  }

  const ahorro = resolveAhorroPesos(promo);
  if (ahorro != null) {
    return `¡Che, si pagás con ${payLabel}, hoy podés ahorrar hasta ${formatPesosAR(ahorro)} en ${superLabel}!`;
  }

  return `¡Che, hoy hay beneficio de ${banco} en ${superLabel}!`;
}

/** Estimación suave de devolución sobre el total de la lista (topeado). */
export function estimateListPromoReturn(
  promo: PromoBancariaItem,
  listTotal: number
): number | null {
  if (!(listTotal > 0) || promo.descuentoPct == null) return null;
  const raw = Math.round((listTotal * promo.descuentoPct) / 100);
  const cap = resolveAhorroPesos(promo);
  if (cap != null) return Math.min(raw, cap);
  return raw > 0 ? raw : null;
}
