import type { CompletedPurchaseRecord } from '@/db/database';

export interface PurchaseMonthGroup {
  key: string;
  label: string;
  purchases: CompletedPurchaseRecord[];
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function monthLabel(date: Date): string {
  const month = MONTH_NAMES[date.getMonth()] ?? '';
  return `${month} ${date.getFullYear()}`;
}

function monthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function groupPurchasesByMonth(
  purchases: CompletedPurchaseRecord[]
): PurchaseMonthGroup[] {
  const groups = new Map<string, PurchaseMonthGroup>();

  for (const purchase of purchases) {
    const date = new Date(purchase.completedAt);
    const key = monthKey(date);

    const existing = groups.get(key);
    if (existing) {
      existing.purchases.push(purchase);
      continue;
    }

    groups.set(key, {
      key,
      label: monthLabel(date),
      purchases: [purchase],
    });
  }

  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}
