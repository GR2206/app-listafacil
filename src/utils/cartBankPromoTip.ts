import type { PromoBancariaItem, PromosBancariasManifest } from '@/types/promosBancarias';
import { formatPesosAR, resolveAhorroPesos } from '@/utils/promoAhorroPesos';
import { promoAppliesToZone } from '@/services/promosBancariasManager';
import { promoAppliesToday } from '@/utils/promoVigencia';

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
 * Mejor promo de HOY para el súper (misma fuente que Finanzas: Gist + aplicaHoy).
 * No muestra beneficios de otros días aunque el súper esté en la lista.
 */
export function findBestPromoForSupermarket(
  manifest: PromosBancariasManifest | null | undefined,
  supermarketId: string,
  zoneSetting: string | null
): PromoBancariaItem | null {
  if (!manifest || !supermarketId) return null;

  const candidates = manifest.promos_bancarias.filter(
    (promo) =>
      promoAppliesToday(promo) &&
      promoAppliesToZone(promo, zoneSetting) &&
      promoAppliesToSupermarket(promo, supermarketId)
  );

  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort((a, b) => {
    const confRank: Record<string, number> = {
      cruzado: 4,
      super: 3,
      banco: 2,
      catalogo: 1,
    };
    const ca = confRank[a.matchConfidence || ''] || 0;
    const cb = confRank[b.matchConfidence || ''] || 0;
    if (ca !== cb) return cb - ca;
    // Preferí promos específicas de este súper (ej. La Reina + Personal Pay).
    const specA = a.supers.length === 1 ? 1 : 0;
    const specB = b.supers.length === 1 ? 1 : 0;
    if (specA !== specB) return specB - specA;
    if (a.prioridad !== b.prioridad) return b.prioridad - a.prioridad;
    const pctA = a.descuentoPct ?? 0;
    const pctB = b.descuentoPct ?? 0;
    if (pctA !== pctB) return pctB - pctA;
    const savA = resolveAhorroPesos(a) ?? 0;
    const savB = resolveAhorroPesos(b) ?? 0;
    if (savA !== savB) return savB - savA;
    return a.venceEnHoras - b.venceEnHoras;
  });

  return ranked[0] ?? null;
}

/**
 * Texto del tip: primero el súper (dónde lo encontrás), después el beneficio.
 */
export function buildCartPromoTipMessage(
  promo: PromoBancariaItem,
  supermarketName: string
): string {
  const banco = promo.banco.trim() || 'tu banco';
  const medio = promo.medios[0]?.trim();
  const payLabel = medio ? `${banco} (${medio})` : banco;
  const superLabel = supermarketName.trim() || 'este súper';
  const tope = promo.tope?.trim();

  if (promo.descuentoPct != null) {
    const topeBit = tope ? ` · tope ${tope}` : '';
    return `Descuento en ${superLabel}: ${promo.descuentoPct}% con ${payLabel}${topeBit}.`;
  }

  const ahorro = resolveAhorroPesos(promo);
  if (ahorro != null) {
    const topeBit = tope ? ` · ${tope}` : '';
    return `Descuento en ${superLabel}: hasta ${formatPesosAR(ahorro)} con ${payLabel}${topeBit}.`;
  }

  const titulo = promo.titulo.trim();
  if (titulo) {
    return `Descuento en ${superLabel}: ${titulo}.`;
  }

  return `Descuento en ${superLabel} con ${banco}.`;
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
