import { getAppSetting, setAppSetting } from '@/db/database';

const LEDGER_KEY = 'savings_ledger_v1';

export interface SavingsLedger {
  /** Ahorro por sesión de lista (session-{supermarketId}). */
  bySession: Record<string, number>;
}

function emptyLedger(): SavingsLedger {
  return { bySession: {} };
}

export function sumLedgerSavings(ledger: SavingsLedger): number {
  return Object.values(ledger.bySession).reduce((sum, value) => sum + Math.max(0, value), 0);
}

export async function loadSavingsLedger(): Promise<SavingsLedger> {
  const raw = await getAppSetting(LEDGER_KEY);
  if (!raw) return emptyLedger();

  try {
    const parsed = JSON.parse(raw) as SavingsLedger;
    if (!parsed || typeof parsed !== 'object' || !parsed.bySession) {
      return emptyLedger();
    }
    return {
      bySession: { ...parsed.bySession },
    };
  } catch {
    return emptyLedger();
  }
}

export async function saveSavingsLedger(ledger: SavingsLedger): Promise<void> {
  await setAppSetting(LEDGER_KEY, JSON.stringify(ledger));
}

/**
 * Guarda el ahorro de una lista (precios comparados vía catálogo Firestore).
 * Reemplaza el valor de esa sesión para no duplicar al recalcular.
 */
export async function upsertSessionListSavings(
  sessionId: string,
  listSavings: number
): Promise<SavingsLedger> {
  const ledger = await loadSavingsLedger();
  ledger.bySession[sessionId] = Math.max(0, Math.round(listSavings));
  await saveSavingsLedger(ledger);
  return ledger;
}

export async function getAccumulatedSavingsTotal(): Promise<number> {
  const ledger = await loadSavingsLedger();
  return sumLedgerSavings(ledger);
}
