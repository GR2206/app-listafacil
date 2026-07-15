import type { PromoBancariaItem } from '@/types/promosBancarias';
import { formatPesosAR, resolveAhorroPesos } from '@/utils/promoAhorroPesos';

/** Texto listo para pegar en notas, WhatsApp o mostrar en caja. */
export function buildPromoBeneficioClipboardText(item: PromoBancariaItem): string {
  const ahorro = resolveAhorroPesos(item);
  const lines = [
    'Lista Fácil — beneficio bancario',
    `Banco: ${item.banco}`,
    item.titulo,
  ];

  if (item.descuentoPct != null) {
    lines.push(`Descuento: ${item.descuentoPct}%`);
  }
  if (ahorro != null) {
    lines.push(`Ahorrás hasta ${formatPesosAR(ahorro)}`);
  }
  if (item.medios.length) {
    lines.push(`Medio: ${item.medios.join(', ')}`);
  }
  if (item.tope) {
    lines.push(`Tope / condiciones: ${item.tope}`);
  }
  lines.push(item.enProximas24h ? 'Ventana: próximas 24 h' : 'Estado: Vigente hoy');
  if (item.url) {
    lines.push(`Más info: ${item.url}`);
  }

  return lines.join('\n');
}
