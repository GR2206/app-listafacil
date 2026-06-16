import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';
import { publishCrowdPriceUpdate } from '@/services/publishApprovedProduct';
import { getOrCreateDeviceId } from '@/utils/deviceId';

const VOTES_COLLECTION = 'Reportes_precio_voto';
const CONSENSUS_COLLECTION = 'Consenso_precios_gondola';

/** Mínimo de usuarios distintos con el mismo precio el mismo día para actualizar la base. */
export const CROWD_PRICE_CONSENSUS_THRESHOLD = 5;

export interface CrowdPriceVotePayload {
  barcode: string;
  supermarketId: string;
  productName: string;
  reportedPrice: number;
  previousPrice?: number;
}

function normalizeBarcode(barcode: string): string {
  return barcode.replace(/\D/g, '').padStart(13, '0').slice(-13);
}

function normalizePrice(price: number): number {
  return Math.round(price * 100) / 100;
}

function getLocalDateKey(date = new Date()): string {
  return date.toLocaleDateString('en-CA');
}

function buildVoteDocId(
  deviceId: string,
  supermarketId: string,
  barcode: string,
  dateKey: string,
  price: number
): string {
  return `${deviceId}_${supermarketId}_${barcode}_${dateKey}_${price}`;
}

function buildConsensusDocId(
  supermarketId: string,
  barcode: string,
  dateKey: string,
  price: number
): string {
  return `${supermarketId}_${barcode}_${dateKey}_${price}`;
}

export interface CrowdPriceVoteResult {
  counted: boolean;
  consensusCount: number;
  publishedToCatalog: boolean;
}

/**
 * Registra el precio de góndola informado por un usuario.
 * Si {CROWD_PRICE_CONSENSUS_THRESHOLD} usuarios distintos coinciden el mismo día, actualiza Productos.
 */
export async function submitCrowdPriceVote(
  payload: CrowdPriceVotePayload
): Promise<CrowdPriceVoteResult> {
  const barcode = normalizeBarcode(payload.barcode);
  const supermarketId = payload.supermarketId.trim();
  const price = normalizePrice(payload.reportedPrice);

  if (!barcode || !supermarketId || price <= 0) {
    return { counted: false, consensusCount: 0, publishedToCatalog: false };
  }

  const dateKey = getLocalDateKey();
  const deviceId = await getOrCreateDeviceId();
  const voteDocId = buildVoteDocId(deviceId, supermarketId, barcode, dateKey, price);
  const consensusDocId = buildConsensusDocId(supermarketId, barcode, dateKey, price);

  const voteRef = doc(db, VOTES_COLLECTION, voteDocId);
  const existingVote = await getDoc(voteRef);
  if (existingVote.exists()) {
    const consensusSnap = await getDoc(doc(db, CONSENSUS_COLLECTION, consensusDocId));
    const count =
      typeof consensusSnap.data()?.count === 'number' ? consensusSnap.data()!.count : 0;
    return { counted: false, consensusCount: count, publishedToCatalog: false };
  }

  await setDoc(voteRef, {
    barcode,
    supermarketId,
    price,
    dateKey,
    deviceId,
    productName: payload.productName.trim() || null,
    previousPrice: payload.previousPrice ?? null,
    createdAt: serverTimestamp(),
  });

  let consensusCount = 0;
  let alreadyPublished = false;

  await runTransaction(db, async (transaction) => {
    const consensusRef = doc(db, CONSENSUS_COLLECTION, consensusDocId);
    const snap = await transaction.get(consensusRef);
    const prevCount = snap.exists() && typeof snap.data()?.count === 'number' ? snap.data()!.count : 0;
    consensusCount = prevCount + 1;
    alreadyPublished = Boolean(snap.data()?.published);

    transaction.set(
      consensusRef,
      {
        barcode,
        supermarketId,
        price,
        dateKey,
        count: consensusCount,
        productName: payload.productName.trim() || null,
        lastVoteAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        published: alreadyPublished,
      },
      { merge: true }
    );
  });

  let publishedToCatalog = alreadyPublished;
  if (!alreadyPublished && consensusCount >= CROWD_PRICE_CONSENSUS_THRESHOLD) {
    publishedToCatalog = await publishCrowdPriceUpdate({
      barcode,
      supermarketId,
      price,
      productName: payload.productName.trim() || undefined,
      consensusCount,
    });

    if (publishedToCatalog) {
      await setDoc(
        doc(db, CONSENSUS_COLLECTION, consensusDocId),
        {
          published: true,
          publishedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  return { counted: true, consensusCount, publishedToCatalog };
}
