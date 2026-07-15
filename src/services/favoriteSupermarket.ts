import AsyncStorage from '@react-native-async-storage/async-storage';

const VISIT_COUNTS_KEY = 'supermarket_visit_counts_v1';
const FAVORITE_MIN_VISITS = 3;

type VisitCounts = Record<string, number>;

async function readVisitCounts(): Promise<VisitCounts> {
  try {
    const raw = await AsyncStorage.getItem(VISIT_COUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VisitCounts;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function recordSupermarketVisit(supermarketId: string): Promise<void> {
  if (!supermarketId) return;

  const counts = await readVisitCounts();
  counts[supermarketId] = (counts[supermarketId] ?? 0) + 1;
  await AsyncStorage.setItem(VISIT_COUNTS_KEY, JSON.stringify(counts));
}

export async function getFavoriteSupermarketId(): Promise<string | null> {
  const counts = await readVisitCounts();
  let favoriteId: string | null = null;
  let maxVisits = 0;

  for (const [id, count] of Object.entries(counts)) {
    if (count > maxVisits) {
      maxVisits = count;
      favoriteId = id;
    }
  }

  if (!favoriteId || maxVisits < FAVORITE_MIN_VISITS) return null;
  return favoriteId;
}
