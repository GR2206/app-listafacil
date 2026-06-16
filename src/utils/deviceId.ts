import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'listafacil_device_id';

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const created = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}
