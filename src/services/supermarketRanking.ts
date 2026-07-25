import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import {
  TAQUILLERO_FETCH_TIMEOUT_MS,
  TAQUILLERO_JSON_URL,
} from '@/config/superTaquillero';
import { getCurrentWeekKey } from '@/utils/weekKey';
import {
  getSupermarketsForZone,
  isSupermarketAvailableInZone,
} from '@/utils/supermarketCoverage';
import { resolveZoneRegion } from '@/utils/zoneRegion';
import { db } from '../../firebaseConfig.js';

const COLLECTION = 'Ranking_Semanal_Zona';

export type RankingEventSource = 'finalize' | 'share';

export interface WeeklyRankingSnapshot {
  weekKey: string;
  zoneKey: string;
  zoneLabel: string;
  counts: Record<string, number>;
}

export interface TopSupermarketResult {
  supermarketId: string;
  supermarketName: string;
  count: number;
  zoneLabel: string;
  weekKey: string;
}

interface RemoteRankingManifest {
  zones?: Record<
    string,
    {
      weekKey?: string;
      counts?: Record<string, number>;
    }
  >;
}

function resolveSupermarketName(supermarketId: string): string {
  return (
    MOCK_SUPERMARKETS.find((market) => market.id === supermarketId)?.name ??
    supermarketId
  );
}

function filterCountsForZone(
  counts: Record<string, number> | undefined,
  zoneSetting: string | null
): Record<string, number> {
  if (!counts) return {};
  const filtered: Record<string, number> = {};
  for (const [supermarketId, count] of Object.entries(counts)) {
    if (!isSupermarketAvailableInZone(supermarketId, zoneSetting)) continue;
    const value = Math.max(0, Math.round(Number(count) || 0));
    if (value > 0) filtered[supermarketId] = value;
  }
  return filtered;
}

function pickTopSupermarket(
  counts: Record<string, number> | undefined,
  zoneLabel: string,
  weekKey: string,
  zoneSetting: string | null = null
): TopSupermarketResult | null {
  const scoped = filterCountsForZone(counts, zoneSetting);
  if (Object.keys(scoped).length === 0) return null;

  let topId = '';
  let topCount = 0;

  for (const [supermarketId, count] of Object.entries(scoped)) {
    if (count > topCount) {
      topId = supermarketId;
      topCount = count;
    }
  }

  if (!topId || topCount <= 0) return null;

  return {
    supermarketId: topId,
    supermarketName: resolveSupermarketName(topId),
    count: topCount,
    zoneLabel,
    weekKey,
  };
}

async function fetchRemoteRankingManifest(): Promise<RemoteRankingManifest | null> {
  if (!TAQUILLERO_JSON_URL) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TAQUILLERO_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(TAQUILLERO_JSON_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;
    return (await response.json()) as RemoteRankingManifest;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildZoneFallbackTop(
  zoneSetting: string | null,
  weekKey: string
): TopSupermarketResult {
  const { label: zoneLabel } = resolveZoneRegion(zoneSetting);
  const zoneMarkets = getSupermarketsForZone(zoneSetting);
  const preferred = zoneMarkets[0] ?? MOCK_SUPERMARKETS[0];

  return {
    supermarketId: preferred?.id ?? 'vea',
    supermarketName: preferred?.name ?? 'Vea',
    count: 1,
    zoneLabel,
    weekKey,
  };
}

let snapshotInflight:
  | Promise<WeeklyRankingSnapshot | null>
  | null = null;
let snapshotInflightKey = '';

export async function fetchWeeklyRankingSnapshot(
  zoneSetting: string | null
): Promise<WeeklyRankingSnapshot | null> {
  const { key: zoneKey, label: zoneLabel } = resolveZoneRegion(zoneSetting);
  const weekKey = getCurrentWeekKey();
  const inflightKey = `${zoneKey}::${weekKey}`;

  if (snapshotInflight && snapshotInflightKey === inflightKey) {
    return snapshotInflight;
  }

  snapshotInflightKey = inflightKey;
  snapshotInflight = (async () => {
    const manifest = await fetchRemoteRankingManifest();
    const remoteZone = manifest?.zones?.[zoneKey];

    if (remoteZone?.counts && Object.keys(remoteZone.counts).length > 0) {
      return {
        weekKey: remoteZone.weekKey === weekKey ? weekKey : remoteZone.weekKey || weekKey,
        zoneKey,
        zoneLabel,
        counts: remoteZone.counts,
      };
    }

    try {
      const snap = await getDoc(doc(db, COLLECTION, zoneKey));
      if (!snap.exists()) return null;

      const data = snap.data() as WeeklyRankingSnapshot;
      if (!data.counts || Object.keys(data.counts).length === 0) return null;

      return {
        weekKey: data.weekKey === weekKey ? weekKey : data.weekKey || weekKey,
        zoneKey: data.zoneKey || zoneKey,
        zoneLabel: data.zoneLabel ?? zoneLabel,
        counts: data.counts,
      };
    } catch {
      return null;
    }
  })().finally(() => {
    if (snapshotInflightKey === inflightKey) {
      snapshotInflight = null;
      snapshotInflightKey = '';
    }
  });

  return snapshotInflight;
}

export async function fetchWeeklyTopSupermarket(
  zoneSetting: string | null
): Promise<TopSupermarketResult | null> {
  const weekKey = getCurrentWeekKey();
  const snapshot = await fetchWeeklyRankingSnapshot(zoneSetting);
  if (snapshot) {
    const fromSnap = pickTopSupermarket(
      snapshot.counts,
      snapshot.zoneLabel,
      snapshot.weekKey || weekKey,
      zoneSetting
    );
    if (fromSnap) return fromSnap;
  }

  return buildZoneFallbackTop(zoneSetting, weekKey);
}

/** Counts del ranking limitados a supers que existen en la zona. */
export function filterRankingCountsForZone(
  counts: Record<string, number> | undefined,
  zoneSetting: string | null
): Record<string, number> {
  return filterCountsForZone(counts, zoneSetting);
}

export async function incrementSupermarketRanking(
  supermarketId: string,
  zoneSetting: string | null,
  source: RankingEventSource
): Promise<void> {
  if (!supermarketId) return;

  const { key: zoneKey, label: zoneLabel } = resolveZoneRegion(zoneSetting);
  const weekKey = getCurrentWeekKey();

  try {
    const docRef = doc(db, COLLECTION, zoneKey);
    const snap = await getDoc(docRef);
    const existing = snap.exists()
      ? (snap.data() as WeeklyRankingSnapshot)
      : null;

    const counts: Record<string, number> =
      existing?.weekKey === weekKey && existing.counts
        ? { ...existing.counts }
        : {};

    counts[supermarketId] = (counts[supermarketId] ?? 0) + 1;

    await setDoc(
      docRef,
      {
        weekKey,
        zoneKey,
        zoneLabel,
        counts,
        updatedAt: serverTimestamp(),
        lastEventSource: source,
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('[Taquillero] No se pudo actualizar ranking:', error);
  }
}
