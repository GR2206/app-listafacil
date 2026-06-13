import { playSound, type SoundType } from '@/services/playSound';
import { triggerHaptic, type HapticType } from '@/utils/triggerHaptic';

interface InstantFeedbackOptions {
  sound?: SoundType;
  haptic?: HapticType;
}

/** Dispara sonido y háptico en el mismo tick, sin await entre medias. */
export function fireInstantFeedback({ sound, haptic }: InstantFeedbackOptions): void {
  if (sound) {
    playSound(sound);
  }
  if (haptic) {
    triggerHaptic(haptic);
  }
}
