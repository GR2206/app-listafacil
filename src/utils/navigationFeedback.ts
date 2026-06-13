import { fireInstantFeedback } from '@/utils/fireInstantFeedback';

/** Breve pausa tras feedback de navegación antes de cambiar de pantalla. */
export const NAV_FEEDBACK_LEAD_MS = 120;

export async function playNavFeedbackThenWait(): Promise<void> {
  fireInstantFeedback({ sound: 'click', haptic: 'selection' });
  await new Promise((resolve) => setTimeout(resolve, NAV_FEEDBACK_LEAD_MS));
}
