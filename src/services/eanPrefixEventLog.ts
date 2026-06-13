import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';

const COLLECTION = 'EAN_Prefix_Eventos';

export interface EanPrefixStripEvent {
  scannedEan: string;
  matchedEan: string;
  supermarketId: string;
  prefixChar?: '5' | '0';
  supermarketName?: string;
}

export async function logEanPrefixStripEvent(event: EanPrefixStripEvent): Promise<void> {
  const scanned = event.scannedEan.replace(/\D/g, '');
  const matched = event.matchedEan.replace(/\D/g, '');

  if (!scanned || !matched || !event.supermarketId) return;

  const prefixLabel = event.prefixChar ?? scanned.charAt(0);

  console.info(
    `[EAN-Prefix] ${event.supermarketId}: ${scanned} → ${matched} (prefijo '${prefixLabel}' recortado)`
  );

  try {
    await setDoc(
      doc(db, COLLECTION, `${scanned}_${event.supermarketId}`),
      {
        scannedEan: scanned,
        matchedEan: matched,
        supermarketId: event.supermarketId,
        supermarketName: event.supermarketName ?? null,
        prefixChar: event.prefixChar ?? prefixLabel,
        hitCount: 1,
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('[EAN-Prefix] No se pudo guardar evento en Firestore:', error);
  }
}
