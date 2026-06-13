import { doc, getDoc, onSnapshot } from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';
import { formatDateKey } from '@/utils/formatPriceSync';

const SYNC_COLLECTION = 'SyncEstado';

export interface SupermarketSyncStatus {
  supermarketId: string;
  lastUpdatedTimestamp: string | null;
  dailyReportDate: string | null;
}

function parseFirestoreTimestamp(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
}

function parseSyncStatusDoc(
  supermarketId: string,
  data: Record<string, unknown> | undefined
): SupermarketSyncStatus {
  const fallback: SupermarketSyncStatus = {
    supermarketId,
    lastUpdatedTimestamp: null,
    dailyReportDate: null,
  };

  if (!data) return fallback;

  const lastUpdatedTimestamp =
    parseFirestoreTimestamp(data.last_updated_timestamp) ??
    parseFirestoreTimestamp(data.lastUpdatedTimestamp) ??
    parseFirestoreTimestamp(data.updatedAt);

  const dailyReportDateRaw =
    (typeof data.daily_report_date === 'string' && data.daily_report_date) ||
    (typeof data.dailyReportDate === 'string' && data.dailyReportDate) ||
    null;

  const dailyReportCompletedAt = parseFirestoreTimestamp(
    data.daily_report_completed_at ?? data.dailyReportCompletedAt
  );

  let dailyReportDate = dailyReportDateRaw;
  if (!dailyReportDate && dailyReportCompletedAt) {
    dailyReportDate = formatDateKey(new Date(dailyReportCompletedAt));
  }

  return {
    supermarketId,
    lastUpdatedTimestamp,
    dailyReportDate,
  };
}

export async function fetchSupermarketSyncStatus(
  supermarketId: string
): Promise<SupermarketSyncStatus> {
  try {
    const snapshot = await getDoc(doc(db, SYNC_COLLECTION, supermarketId));
    if (!snapshot.exists()) {
      return parseSyncStatusDoc(supermarketId, undefined);
    }

    return parseSyncStatusDoc(supermarketId, snapshot.data() as Record<string, unknown>);
  } catch (error) {
    console.warn(`[Firestore] SyncEstado/${supermarketId}:`, error);
    return parseSyncStatusDoc(supermarketId, undefined);
  }
}

/** Escucha en tiempo real SyncEstado/{supermarketId} (la app se actualiza al terminar el escaneo). */
export function subscribeSupermarketSyncStatus(
  supermarketId: string,
  onUpdate: (status: SupermarketSyncStatus) => void
): () => void {
  const ref = doc(db, SYNC_COLLECTION, supermarketId);

  return onSnapshot(
    ref,
    (snapshot) => {
      const data = snapshot.exists()
        ? (snapshot.data() as Record<string, unknown>)
        : undefined;
      onUpdate(parseSyncStatusDoc(supermarketId, data));
    },
    (error) => {
      console.warn(`[Firestore] SyncEstado/${supermarketId} listener:`, error);
      onUpdate(parseSyncStatusDoc(supermarketId, undefined));
    }
  );
}

export async function fetchAllSupermarketSyncStatuses(
  supermarketIds: string[]
): Promise<Record<string, SupermarketSyncStatus>> {
  const entries = await Promise.all(
    supermarketIds.map(async (id) => {
      const status = await fetchSupermarketSyncStatus(id);
      return [id, status] as const;
    })
  );

  return Object.fromEntries(entries);
}
