import { lookupProductDetailed, type ProductLookupResult } from '@/services/productLookup';

import { reportPendingProduct } from '@/services/pendingProductReport';

import { extractScanNameHint } from '@/utils/extractScanNameHint';

import { normalizeBarcode } from '@/utils/eanLookup';



export interface ScanResolutionResult extends ProductLookupResult {

  nameHint?: string;

  pendingQueued: boolean;

  rawData: string;

}



export interface ScanResolutionOptions {

  supermarketName?: string;

  nameHint?: string;

}



/**

 * Búsqueda dual al escanear:

 * 1) EAN con normalización (con/sin primer dígito, sin ceros de relleno)

 * 2) Nombre extraído del escáner, si existe

 * 3) Cola automática en Pendientes_de_carga para el bot de scraping

 */

export async function resolveScannedProduct(

  rawData: string,

  supermarketId: string,

  options: ScanResolutionOptions = {}

): Promise<ScanResolutionResult> {

  const normalized = normalizeBarcode(rawData);

  const barcodeDigits = normalized ?? rawData.replace(/\D/g, '');

  const nameHint = options.nameHint?.trim() || extractScanNameHint(rawData, barcodeDigits);



  const lookup = await lookupProductDetailed(rawData, supermarketId, { nameHint });



  if (lookup.product) {

    return {

      ...lookup,

      nameHint,

      pendingQueued: false,

      rawData,

    };

  }



  const pendingBarcode = lookup.normalizedBarcode ?? barcodeDigits;

  let pendingQueued = false;



  if (pendingBarcode) {

    pendingQueued = await reportPendingProduct({

      barcode: pendingBarcode,

      supermarketId,

      supermarketName: options.supermarketName,

      rawScan: rawData,

      nameHint,

      source: 'scan',

      priority: true,

    });

  }



  return {

    ...lookup,

    nameHint,

    pendingQueued,

    rawData,

  };

}


