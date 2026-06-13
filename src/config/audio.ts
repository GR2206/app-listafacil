export type SoundType = 'tecla' | 'beep' | 'click' | 'delete';

/**
 * Ganancia normalizada por tipo de archivo (0–1).
 * MP3: taps cortos con menos ganancia. WAV (delete): archivo más pesado, ganancia contenida.
 */
export const NORMALIZED_SOUND_VOLUME: Record<SoundType, number> = {
  tecla: 0.3,
  click: 0.32,
  beep: 0.38,
  delete: 0.34,
};

/** Pool amplio: +/-, zoom, escáner, manual, finalizar y taps rápidos. */
export const TECLA_SOUND_POOL_SIZE = 16;

/** Pool para clics del menú principal. */
export const CLICK_SOUND_POOL_SIZE = 3;

export const BEEP_SOUND_POOL_SIZE = 4;

export const PRELOAD_MAX_ATTEMPTS = 3;
