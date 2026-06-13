import { Asset } from 'expo-asset';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

import {
  BEEP_SOUND_POOL_SIZE,
  CLICK_SOUND_POOL_SIZE,
  NORMALIZED_SOUND_VOLUME,
  PRELOAD_MAX_ATTEMPTS,
  TECLA_SOUND_POOL_SIZE,
  type SoundType,
} from '@/config/audio';

export type { SoundType };

const SOUND_ASSETS: Record<SoundType, number> = {
  tecla: require('../../assets/sounds/tecla.mp3'),
  beep: require('../../assets/sounds/beep.mp3'),
  click: require('../../assets/sounds/click.mp3'),
  delete: require('../../assets/sounds/delete.wav'),
};

const POOL_SIZES: Record<SoundType, number> = {
  tecla: TECLA_SOUND_POOL_SIZE,
  click: CLICK_SOUND_POOL_SIZE,
  beep: BEEP_SOUND_POOL_SIZE,
  delete: 1,
};

const ALL_SOUND_TYPES = Object.keys(SOUND_ASSETS) as SoundType[];

const soundPools = new Map<SoundType, Audio.Sound[]>();
const poolCursors = new Map<SoundType, number>();

let audioReady = false;
let soundsPreloaded = false;
let assetsResolved = false;
let preloadPromise: Promise<void> | null = null;

export async function initSounds(): Promise<void> {
  if (audioReady) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    });
    audioReady = true;
  } catch {
    audioReady = false;
  }
}

async function resolveSoundAssets(): Promise<void> {
  if (assetsResolved) return;
  await Asset.loadAsync(Object.values(SOUND_ASSETS));
  assetsResolved = true;
}

async function prepareSoundInstance(type: SoundType): Promise<Audio.Sound | null> {
  try {
    const volume = NORMALIZED_SOUND_VOLUME[type];
    const { sound } = await Audio.Sound.createAsync(SOUND_ASSETS[type], {
      shouldPlay: false,
      isLooping: false,
      volume,
      rate: 1.0,
      shouldCorrectPitch: true,
    });

    await sound.setVolumeAsync(volume);
    await sound.setRateAsync(1.0, true);
    await warmUpSound(sound, volume);
    return sound;
  } catch {
    return null;
  }
}

async function warmUpSound(sound: Audio.Sound, volume: number): Promise<void> {
  try {
    await sound.setVolumeAsync(0.001);
    await sound.playAsync();
    await sound.stopAsync();
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(volume);
    await sound.setRateAsync(1.0, true);
  } catch {
    // El warm-up acelera el primer tap; si falla, el sonido sigue usable.
  }
}

function resetPools(): void {
  soundPools.clear();
  poolCursors.clear();
}

async function ensureSoundPool(type: SoundType): Promise<boolean> {
  const targetSize = POOL_SIZES[type];
  const pool = soundPools.get(type) ?? [];
  const missing = Math.max(0, targetSize - pool.length);

  if (missing === 0) {
    soundPools.set(type, pool);
    return true;
  }

  const created = await Promise.all(
    Array.from({ length: missing }, () => prepareSoundInstance(type))
  );

  const valid = created.filter((sound): sound is Audio.Sound => sound != null);
  soundPools.set(type, [...pool, ...valid]);

  return (soundPools.get(type)?.length ?? 0) >= targetSize;
}

function allPoolsReady(): boolean {
  return ALL_SOUND_TYPES.every((type) => {
    const pool = soundPools.get(type);
    return (pool?.length ?? 0) >= POOL_SIZES[type];
  });
}

function playInstanceInstant(sound: Audio.Sound): void {
  try {
    void sound.replayAsync().catch(() => {
      void sound
        .setPositionAsync(0)
        .then(() => sound.playAsync())
        .catch(() => undefined);
    });
  } catch {
    // Ignorar: taps muy rápidos no deben mostrar errores en pantalla.
  }
}

function dispatchSoundPlayback(type: SoundType): void {
  try {
    const pool = soundPools.get(type);
    if (!pool || pool.length === 0) return;

    const cursor = poolCursors.get(type) ?? 0;
    const sound = pool[cursor % pool.length];
    poolCursors.set(type, cursor + 1);
    playInstanceInstant(sound);
  } catch {
    // Ignorar fallos del pool de sonido.
  }
}

async function runPreloadPass(): Promise<boolean> {
  await resolveSoundAssets();
  await initSounds();

  const results = await Promise.all(ALL_SOUND_TYPES.map((type) => ensureSoundPool(type)));
  return results.every(Boolean) && allPoolsReady();
}

export async function preloadSounds(): Promise<void> {
  if (soundsPreloaded) return;

  if (preloadPromise) {
    await preloadPromise;
    return;
  }

  preloadPromise = (async () => {
    for (let attempt = 1; attempt <= PRELOAD_MAX_ATTEMPTS; attempt += 1) {
      resetPools();
      const ready = await runPreloadPass();
      if (ready) {
        soundsPreloaded = true;
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 80 * attempt));
    }

    soundsPreloaded = allPoolsReady();
  })();

  try {
    await preloadPromise;
  } finally {
    if (!soundsPreloaded) {
      preloadPromise = null;
    }
  }
}

/** Reproduce un sonido precargado. Retorna al instante, sin bloquear la UI. */
export function playSound(type: SoundType): void {
  try {
    if (!soundsPreloaded) {
      void preloadSounds()
        .then(() => {
          if (soundsPreloaded) {
            dispatchSoundPlayback(type);
          }
        })
        .catch(() => undefined);
      return;
    }

    dispatchSoundPlayback(type);
  } catch {
    // Ignorar: el audio nunca debe interrumpir la interacción.
  }
}

export function areSoundsPreloaded(): boolean {
  return soundsPreloaded;
}

export async function unloadSounds(): Promise<void> {
  const allSounds = [...soundPools.values()].flat();

  await Promise.all(
    allSounds.map(async (sound) => {
      try {
        await sound.unloadAsync();
      } catch {
        // ignore
      }
    })
  );

  resetPools();
  audioReady = false;
  soundsPreloaded = false;
  assetsResolved = false;
  preloadPromise = null;
}
