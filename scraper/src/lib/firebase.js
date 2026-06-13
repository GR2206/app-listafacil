import { readFileSync, existsSync } from 'fs';

import { initializeApp, cert, getApps } from 'firebase-admin/app';

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { config } from '../config.js';



let db = null;



export function initFirebase() {

  if (getApps().length > 0) {

    db = getFirestore();

    return db;

  }



  if (!existsSync(config.firebaseServiceAccountPath)) {

    throw new Error(

      `No se encontró serviceAccountKey.json en ${config.firebaseServiceAccountPath}. ` +

        'Descargalo desde Firebase Console → Configuración → Cuentas de servicio.'

    );

  }



  const serviceAccount = JSON.parse(

    readFileSync(config.firebaseServiceAccountPath, 'utf8')

  );



  initializeApp({

    credential: cert(serviceAccount),

    projectId: config.firebaseProjectId || serviceAccount.project_id,

  });



  db = getFirestore();

  return db;

}



export async function upsertProductToFirestore(product) {

  if (!product.barcode || !/^\d{8,13}$/.test(product.barcode)) {

    console.warn(`  ⏭ Sin barcode válido: ${product.name}`);

    return false;

  }



  const barcode = product.barcode.padStart(13, '0').slice(-13);

  const ref = db.collection(config.firestoreCollection).doc(barcode);



  await ref.set(

    {

      barcode,

      Nombre: product.name,

      Marca: product.brand ?? null,

      Imagen: product.imageUrl ?? null,

      [`Precios.${product.supermarketId}`]: product.price,

      sourceUrl: product.productUrl ?? null,

      updatedAt: FieldValue.serverTimestamp(),

      scrapedAt: new Date().toISOString(),

    },

    { merge: true }

  );



  return true;

}



export async function saveBatch(products) {

  let saved = 0;

  let skipped = 0;

  let errors = 0;



  for (const product of products) {

    try {

      const ok = await upsertProductToFirestore(product);

      if (ok) saved++;

      else skipped++;

    } catch (err) {

      errors++;

      console.warn(`  ✗ Error ${product.barcode ?? product.name}: ${err.message}`);

    }

  }



  return { saved, skipped, errors };

}


