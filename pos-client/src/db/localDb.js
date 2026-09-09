import Dexie from 'dexie';

export const db = new Dexie('LumacPOS');

db.version(1).stores({
  products: 'id, name, barcode, sku, category_id, active',
  meta:     'key',
});
