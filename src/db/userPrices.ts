import { getDatabase } from '@/db/database';



export interface UserPriceRecord {

  barcode: string;

  supermarketId: string;

  unitPrice: number;

  updatedAt: string;

  scrapeSnapshotAt: string | null;

}



type UserPriceRow = {

  barcode: string;

  supermarket_id: string;

  unit_price: number;

  updated_at: string;

  scrape_snapshot_at: string | null;

};



function mapRow(row: UserPriceRow): UserPriceRecord {

  return {

    barcode: row.barcode,

    supermarketId: row.supermarket_id,

    unitPrice: row.unit_price,

    updatedAt: row.updated_at,

    scrapeSnapshotAt: row.scrape_snapshot_at,

  };

}



export async function saveUserPrice(input: {

  barcode: string;

  supermarketId: string;

  unitPrice: number;

  scrapeSnapshotAt?: string | null;

}): Promise<void> {

  const price = Math.round(input.unitPrice * 100) / 100;

  if (price <= 0) return;



  const database = await getDatabase();

  await database.runAsync(

    `INSERT INTO precios_usuario (barcode, supermarket_id, unit_price, updated_at, scrape_snapshot_at)

     VALUES (?, ?, ?, ?, ?)

     ON CONFLICT(barcode, supermarket_id) DO UPDATE SET

       unit_price = excluded.unit_price,

       updated_at = excluded.updated_at,

       scrape_snapshot_at = excluded.scrape_snapshot_at`,

    [

      input.barcode,

      input.supermarketId,

      price,

      new Date().toISOString(),

      input.scrapeSnapshotAt ?? null,

    ]

  );

}



export async function getUserPricesMap(

  barcodes: string[],

  supermarketId: string

): Promise<Record<string, UserPriceRecord>> {

  const uniqueBarcodes = [...new Set(barcodes.filter(Boolean))];

  if (uniqueBarcodes.length === 0) return {};



  const database = await getDatabase();

  const placeholders = uniqueBarcodes.map(() => '?').join(', ');

  const rows = await database.getAllAsync<UserPriceRow>(

    `SELECT barcode, supermarket_id, unit_price, updated_at, scrape_snapshot_at

     FROM precios_usuario

     WHERE supermarket_id = ?

       AND barcode IN (${placeholders})`,

    [supermarketId, ...uniqueBarcodes]

  );



  const map: Record<string, UserPriceRecord> = {};

  for (const row of rows) {

    map[row.barcode] = mapRow(row);

  }



  return map;

}


