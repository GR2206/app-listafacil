const NAME_SEPARATORS = /[|;,:\t]/;



/**

 * Intenta extraer un nombre de producto del payload del escáner

 * cuando el lector devuelve texto además del EAN (GS1, Code128 compuesto, etc.).

 */

export function extractScanNameHint(rawData: string, barcodeDigits?: string): string | undefined {

  const trimmed = rawData.trim();

  if (!trimmed) return undefined;



  const barcode = barcodeDigits?.replace(/\D/g, '');



  const parts = trimmed.split(NAME_SEPARATORS).map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {

    const partDigits = part.replace(/\D/g, '');

    if (barcode && partDigits === barcode) continue;



    const alpha = part.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s.'-]/g, ' ').replace(/\s+/g, ' ').trim();

    if (alpha.length >= 3 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(alpha)) {

      return alpha;

    }

  }



  if (!/^\d+$/.test(trimmed)) {

    const withoutBarcode = barcode

      ? trimmed.replace(new RegExp(barcode, 'g'), ' ')

      : trimmed;

    const alpha = withoutBarcode

      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s.'-]/g, ' ')

      .replace(/\s+/g, ' ')

      .trim();



    if (alpha.length >= 3 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(alpha)) {

      return alpha;

    }

  }



  return undefined;

}


