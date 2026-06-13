import { fireInstantFeedback } from '@/utils/fireInstantFeedback';

export async function initScanFeedback(): Promise<void> {
  // La precarga ocurre en prepareAppResources / preloadSounds.
}

export function feedbackScanSuccess(): void {
  fireInstantFeedback({ sound: 'beep', haptic: 'success' });
}

export function feedbackScanError(): void {
  fireInstantFeedback({ haptic: 'error' });
}
