import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import {
  TAQUILLERO_FETCH_TIMEOUT_MS,
  TAQUILLERO_JSON_URL,
} from '@/config/superTaquillero';
import { getCurrentWeekKey } from '@/utils/weekKey';
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

function pickTopSupermarket(
  counts: Record<string, number> | undefined,
  zoneLabel: string,
  weekKey: string
): TopSupermarketResult | null {
  if (!counts) return null;

  let topId = '';
  let topCount = 0;

  for (const [supermarketId, count] of Object.entries(counts)) {
    const value = Math.max(0, Math.round(Number(count) || 0));
    if (value > topCount) {
      topId = supermarketId;
      topCount = value;
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

async function fetchRankingFromFirestore(
  zoneKey: string,
  zoneLabel: string,
  weekKey: string
): Promise<TopSupermarketResult | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, zoneKey));
    if (!snap.exists()) return null;

    const data = snap.data() as WeeklyRankingSnapshot;
    if (data.weekKey !== weekKey) return null;

    return pickTopSupermarket(data.counts, zoneLabel, weekKey);
  } catch (error) {
    console.warn('[Taquillero] No se pudo leer ranking de Firestore:', error);
    return null;
  }
}

export async function fetchWeeklyTopSupermarket(
  zoneSetting: string | null
): Promise<TopSupermarketResult | null> {
  const { key: zoneKey, label: zoneLabel } = resolveZoneRegion(zoneSetting);
  const weekKey = getCurrentWeekKey();

  const manifest = await fetchRemoteRankingManifest();
  const remoteZone = manifest?.zones?.[zoneKey];

  if (remoteZone?.weekKey === weekKey) {
    const fromJson = pickTopSupermarket(remoteZone.counts, zoneLabel, weekKey);
    if (fromJson) return fromJson;
  }

  return fetchRankingFromFirestore(zoneKey, zoneLabel, weekKey);
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
