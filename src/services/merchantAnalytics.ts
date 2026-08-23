import {
  getAppSetting,
  getMerchantAnalyticsToday,
  getMerchantAnalyticsWeeklyPeak,
  getTopViewedProductsToday,
  recordMerchantAnalyticsEvent,
  setAppSetting,
} from '@/db/database';
import {
  loadRemoteMerchantDashboardStats,
  mergeRemoteAndLocalDashboardStats,
  recordRemoteMerchantEvent,
} from '@/services/merchantAnalyticsRemote';
import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import { resolveZoneRegion } from '@/utils/zoneRegion';

export type MerchantAnalyticsEvent =
  | 'price_view'
  | 'maps_click'
  | 'best_price_win'
  | 'product_view'
  | 'super_entry';

const VISITOR_ID_KEY = 'analytics_visitor_id';

export interface MerchantDailyStats {
  uniquePriceVisitors: number;
  uniqueSuperEntries: number;
  mapsClicks: number;
  bestPriceWins: number;
}

export interface MerchantDashboardStats extends MerchantDailyStats {
  weeklyPeak: MerchantDailyStats;
  topProducts: TopViewedProduct[];
}

export interface TopViewedProduct {
  barcode: string;
  name: string;
  views: number;
}

async function getOrCreateVisitorId(): Promise<string> {
  const existing = await getAppSetting(VISITOR_ID_KEY);
  if (existing) return existing;

  const visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await setAppSetting(VISITOR_ID_KEY, visitorId);
  return visitorId;
}

export async function trackMerchantEvent(
  supermarketId: string,
  eventType: MerchantAnalyticsEvent,
  extras?: { zoneKey?: string | null }
): Promise<void> {
  if (!supermarketId) return;

  const visitorId = await getOrCreateVisitorId();
  await recordMerchantAnalyticsEvent({
    supermarketId,
    eventType,
    visitorId,
  });
  void recordRemoteMerchantEvent({
    supermarketId,
    eventType,
    visitorId,
    zoneKey: extras?.zoneKey,
  });
}

/** Entrada al súper (grid / taquillero / oferta / búsqueda). Global, todas las regiones. */
export async function trackSupermarketEntry(supermarketId: string): Promise<void> {
  if (!supermarketId) return;

  let zoneKey: string | null = null;
  try {
    const zoneSetting = await getAppSetting(SELECTED_ZONE_SETTING_KEY);
    zoneKey = resolveZoneRegion(zoneSetting).key;
  } catch {
    // ignore
  }

  await trackMerchantEvent(supermarketId, 'super_entry', { zoneKey });
}

export async function trackMerchantProductView(
  supermarketId: string,
  barcode: string,
  productName: string
): Promise<void> {
  if (!supermarketId || !barcode) return;

  const visitorId = await getOrCreateVisitorId();
  await recordMerchantAnalyticsEvent({
    supermarketId,
    eventType: 'product_view',
    visitorId,
    productBarcode: barcode,
    productName: productName.trim() || barcode,
  });
  void recordRemoteMerchantEvent({
    supermarketId,
    eventType: 'product_view',
    visitorId,
    productBarcode: barcode,
    productName: productName.trim() || barcode,
  });
}

export async function loadMerchantDashboardStats(
  supermarketId: string
): Promise<MerchantDashboardStats> {
  const [today, weeklyPeak, topProducts, remote] = await Promise.all([
    getMerchantAnalyticsToday(supermarketId),
    getMerchantAnalyticsWeeklyPeak(supermarketId),
    getTopViewedProductsToday(supermarketId, 5),
    loadRemoteMerchantDashboardStats(supermarketId),
  ]);

  const local: MerchantDashboardStats = {
    uniquePriceVisitors: today.uniquePriceVisitors,
    uniqueSuperEntries: today.uniqueSuperEntries,
    mapsClicks: today.mapsClicks,
    bestPriceWins: today.bestPriceWins,
    weeklyPeak,
    topProducts,
  };

  return mergeRemoteAndLocalDashboardStats(remote, local);
}
