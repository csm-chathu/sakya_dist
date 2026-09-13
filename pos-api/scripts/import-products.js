const XLSX   = require('xlsx');
const mysql  = require('mysql2/promise');

const EXCEL  = 'E:/LMUC/shakya/Export Items.xlsx';
const DB     = { host: '127.0.0.1', user: 'root', password: 'root', database: 'sakya_dist' };

async function run() {
  const wb   = XLSX.readFile(EXCEL);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(1); // skip header

  const products = rows
    .filter(r => r[0] && String(r[0]).trim())
    .map(r => ({
      name:          String(r[0]).trim(),
      sku:           r[1] ? String(r[1]).trim() : null,
      selling_price: parseFloat(r[5]) || 0,
      cost_price:    parseFloat(r[6]) || 0,
      stock_qty:     Math.max(0, parseFloat(r[9]) || 0),
      alert_qty:     Math.max(0, parseFloat(r[10]) || 0),
      active:        1,
    }));

  console.log(`Preparing to insert ${products.length} products...`);

  const conn = await mysql.createConnection(DB);

  let inserted = 0, skipped = 0;
  for (const p of products) {
    try {
      await conn.execute(
        `INSERT INTO products (name, sku, selling_price, cost_price, stock_qty, alert_qty, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [p.name, p.sku, p.selling_price, p.cost_price, p.stock_qty, p.alert_qty, p.active]
      );
      inserted++;
    } catch (e) {
      console.warn(`  SKIP "${p.name}": ${e.message}`);
      skipped++;
    }
  }

  await conn.end();
  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
}

run().catch(err => { console.error(err.message); process.exit(1); });
