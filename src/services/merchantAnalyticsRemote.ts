import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';

import type {
  MerchantAnalyticsEvent,
  MerchantDashboardStats,
  TopViewedProduct,
} from '@/services/merchantAnalytics';

const DAILY_COLLECTION = 'Metricas_diarias';

interface DailyMetricsDoc {
  supermarketId?: string;
  dateKey?: string;
  mapsClicks?: number;
  bestPriceWins?: number;
  uniquePriceVisitors?: number;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function getMetricsDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function dailyDocId(supermarketId: string, dateKey: string): string {
  return `${supermarketId}_${dateKey}`;
}

function emptyDailyStats(): MerchantDashboardStats {
  return {
    uniquePriceVisitors: 0,
    mapsClicks: 0,
    bestPriceWins: 0,
    weeklyPeak: {
      uniquePriceVisitors: 0,
      mapsClicks: 0,
      bestPriceWins: 0,
    },
    topProducts: [],
  };
}

function readDailyMetrics(data: DailyMetricsDoc | undefined) {
  return {
    uniquePriceVisitors: Math.max(0, Math.round(data?.uniquePriceVisitors ?? 0)),
    mapsClicks: Math.max(0, Math.round(data?.mapsClicks ?? 0)),
    bestPriceWins: Math.max(0, Math.round(data?.bestPriceWins ?? 0)),
  };
}

async function ensureDailyDoc(supermarketId: string, dateKey: string) {
  const ref = doc(db, DAILY_COLLECTION, dailyDocId(supermarketId, dateKey));
  await setDoc(
    ref,
    {
      supermarketId,
      dateKey,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return ref;
}

export async function recordRemoteMerchantEvent(input: {
  supermarketId: string;
  eventType: MerchantAnalyticsEvent;
  visitorId: string;
  productBarcode?: string;
  productName?: string;
}): Promise<void> {
  if (!input.supermarketId) return;

  try {
    const dateKey = getMetricsDateKey();
    const dayRef = await ensureDailyDoc(input.supermarketId, dateKey);

    if (input.eventType === 'maps_click') {
      await setDoc(dayRef, { mapsClicks: increment(1) }, { merge: true });
      return;
    }

    if (input.eventType === 'best_price_win') {
      await setDoc(dayRef, { bestPriceWins: increment(1) }, { merge: true });
      return;
    }

    if (input.eventType === 'price_view') {
      const visitorRef = doc(dayRef, 'visitantes', input.visitorId);
      const visitorSnap = await getDoc(visitorRef);
      if (!visitorSnap.exists()) {
        await setDoc(visitorRef, { at: serverTimestamp() });
        await setDoc(dayRef, { uniquePriceVisitors: increment(1) }, { merge: true });
      }
      return;
    }

    if (input.eventType === 'product_view' && input.productBarcode) {
      const productRef = doc(dayRef, 'productos_vistos', input.productBarcode);
      await setDoc(
        productRef,
        {
          name: input.productName?.trim() || input.productBarcode,
          views: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.warn('[Firestore] No se pudo registrar métrica remota:', error);
  }
}

async function loadDailyMetrics(supermarketId: string, dateKey: string) {
  const snap = await getDoc(doc(db, DAILY_COLLECTION, dailyDocId(supermarketId, dateKey)));
  return readDailyMetrics(snap.exists() ? (snap.data() as DailyMetricsDoc) : undefined);
}

async function loadTopProductsForDay(
  supermarketId: string,
  dateKey: string,
  limit = 5
): Promise<TopViewedProduct[]> {
  const dayRef = doc(db, DAILY_COLLECTION, dailyDocId(supermarketId, dateKey));
  const snapshot = await getDocs(collection(dayRef, 'productos_vistos'));

  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as { name?: string; views?: number };
      return {
        barcode: docSnap.id,
        name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : docSnap.id,
        views: Math.max(0, Math.round(data.views ?? 0)),
      };
    })
    .filter((row) => row.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

function startOfWeekDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  now.setDate(now.getDate() - diff);
  now.setHours(0, 0, 0, 0);
  return now;
}

export async function loadRemoteMerchantDashboardStats(
  supermarketId: string
): Promise<MerchantDashboardStats | null> {
  if (!supermarketId) return null;

  try {
    const todayKey = getMetricsDateKey();
    const weekStart = startOfWeekDate();
    const weekKeys: string[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + offset);
      weekKeys.push(getMetricsDateKey(day));
    }

    const weekMetrics = await Promise.all(
      weekKeys.map((dateKey) => loadDailyMetrics(supermarketId, dateKey))
    );
    const [today, topProducts] = await Promise.all([
      loadDailyMetrics(supermarketId, todayKey),
      loadTopProductsForDay(supermarketId, todayKey, 5),
    ]);

    const weeklyPeak = weekMetrics.reduce(
      (peak, day) => ({
        uniquePriceVisitors: Math.max(peak.uniquePriceVisitors, day.uniquePriceVisitors),
        mapsClicks: Math.max(peak.mapsClicks, day.mapsClicks),
        bestPriceWins: Math.max(peak.bestPriceWins, day.bestPriceWins),
      }),
      { uniquePriceVisitors: 0, mapsClicks: 0, bestPriceWins: 0 }
    );

    return {
      ...today,
      weeklyPeak,
      topProducts,
    };
  } catch (error) {
    console.warn('[Firestore] No se pudieron cargar métricas remotas:', error);
    return null;
  }
}

export function mergeRemoteAndLocalDashboardStats(
  remote: MerchantDashboardStats | null,
  local: MerchantDashboardStats
): MerchantDashboardStats {
  if (!remote) return local;

  const remoteHasData =
    remote.uniquePriceVisitors > 0 ||
    remote.mapsClicks > 0 ||
    remote.bestPriceWins > 0 ||
    remote.topProducts.length > 0;

  if (!remoteHasData) {
    return {
      ...local,
      weeklyPeak: {
        uniquePriceVisitors: Math.max(
          local.weeklyPeak.uniquePriceVisitors,
          remote.weeklyPeak.uniquePriceVisitors
        ),
        mapsClicks: Math.max(local.weeklyPeak.mapsClicks, remote.weeklyPeak.mapsClicks),
        bestPriceWins: Math.max(local.weeklyPeak.bestPriceWins, remote.weeklyPeak.bestPriceWins),
      },
    };
  }

  return remote;
}

export { emptyDailyStats };
