/**
 * Seed Shakya Enterprises product catalogue from Messenger Hardware invoice.
 * WARNING: Clears existing products, categories, sale_items, sales, purchases,
 *          purchase_items, stock_movements first.
 *
 * Usage:  node scripts/seed-shakya.js [host]
 *         node scripts/seed-shakya.js localhost
 */
require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');
const getModels = require('../src/models');
const tenants   = require('../src/config/tenants');

const host   = process.argv[2] || 'localhost';
const tenant = tenants[host];
if (!tenant) { console.error(`Host "${host}" not in tenants.js`); process.exit(1); }

const log  = m => console.log(`\x1b[32m✔\x1b[0m  ${m}`);
const warn = m => console.log(`\x1b[33m⚠\x1b[0m  ${m}`);

// ── Product data from Messenger Hardware invoice ──────────────────────────────
// selling_price = List Price from invoice
// cost_price    = ~78% of selling (estimated margin)
// wholesale_price = ~88% of selling
const PRODUCTS = [
  // ── Door Locks ──
  { name: 'Bird Night Latch No. 2 (564) Card',  category: 'Door Locks',  unit: 'NOS',  stock_qty: 180,   selling_price: 1050.00, cost_price: 820.00,  wholesale_price: 950.00  },
  { name: 'Xiaboshi Drawer Lock 22mm ST',        category: 'Door Locks',  unit: 'NOS',  stock_qty: 48,    selling_price: 300.00,  cost_price: 230.00,  wholesale_price: 270.00  },
  { name: 'Xiaboshi Drawer Lock 26mm ST',        category: 'Door Locks',  unit: 'NOS',  stock_qty: 48,    selling_price: 325.00,  cost_price: 250.00,  wholesale_price: 295.00  },
  { name: 'Xiaboshi Drawer Lock 32mm ST',        category: 'Door Locks',  unit: 'NOS',  stock_qty: 48,    selling_price: 350.00,  cost_price: 270.00,  wholesale_price: 315.00  },
  { name: 'Xiaboshi Drawer Lock 38mm ST',        category: 'Door Locks',  unit: 'NOS',  stock_qty: 48,    selling_price: 375.00,  cost_price: 290.00,  wholesale_price: 338.00  },
  { name: 'Xiaboshi Drawer Lock 22mm DT',        category: 'Door Locks',  unit: 'NOS',  stock_qty: 48,    selling_price: 325.00,  cost_price: 250.00,  wholesale_price: 295.00  },
  { name: 'Xiaboshi Drawer Lock 26mm DT',        category: 'Door Locks',  unit: 'NOS',  stock_qty: 48,    selling_price: 350.00,  cost_price: 270.00,  wholesale_price: 315.00  },
  { name: 'Xiaboshi Drawer Lock 32mm DT',        category: 'Door Locks',  unit: 'NOS',  stock_qty: 48,    selling_price: 375.00,  cost_price: 290.00,  wholesale_price: 338.00  },
  { name: 'Xiaboshi Drawer Lock 38mm DT',        category: 'Door Locks',  unit: 'NOS',  stock_qty: 48,    selling_price: 400.00,  cost_price: 310.00,  wholesale_price: 360.00  },
  // ── Screws ──
  { name: 'Satin Flower Head Screws 1 x 8',      category: 'Screws',      unit: 'NOS',  stock_qty: 1500,  selling_price: 7.50,    cost_price: 5.50,    wholesale_price: 6.80    },
  { name: 'Satin Flower Head Screws 5/8 x 4',    category: 'Screws',      unit: 'NOS',  stock_qty: 3000,  selling_price: 3.50,    cost_price: 2.50,    wholesale_price: 3.15    },
  { name: 'Satin Flower Head Screws 3/4 x 6',    category: 'Screws',      unit: 'NOS',  stock_qty: 3000,  selling_price: 5.00,    cost_price: 3.75,    wholesale_price: 4.50    },
  { name: 'SS Flower Head Screws 5/8 x 5',       category: 'Screws',      unit: 'NOS',  stock_qty: 3600,  selling_price: 4.50,    cost_price: 3.25,    wholesale_price: 4.05    },
  { name: 'SS Flower Head Screws 3/4 x 6',       category: 'Screws',      unit: 'NOS',  stock_qty: 3000,  selling_price: 5.00,    cost_price: 3.75,    wholesale_price: 4.50    },
  { name: 'SS Flower Head Screws 3/4 x 7',       category: 'Screws',      unit: 'NOS',  stock_qty: 3000,  selling_price: 6.00,    cost_price: 4.50,    wholesale_price: 5.40    },
  { name: 'SS Flower Head Screws 1 x 8',         category: 'Screws',      unit: 'NOS',  stock_qty: 1200,  selling_price: 7.50,    cost_price: 5.50,    wholesale_price: 6.80    },
  // ── Hinges ──
  { name: 'BP Brass Railway Hinges 6 x 3',       category: 'Hinges',      unit: 'PAIR', stock_qty: 2,     selling_price: 2800.00, cost_price: 2200.00, wholesale_price: 2520.00 },
];

async function main() {
  console.log(`\n\x1b[1m── Shakya Product Seed: ${host} → ${tenant.database} ──\x1b[0m\n`);
  warn('This will DELETE all existing products, categories, and related records.');
  console.log('Continuing in 3 seconds… (Ctrl+C to abort)\n');
  await new Promise(r => setTimeout(r, 3000));

  const seq = new Sequelize(tenant.database, tenant.username, tenant.password, {
    host:    tenant.host || process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    define:  { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', underscored: true },
  });
  await seq.authenticate();
  const { Category, Product } = getModels(seq);

  // ── Step 1: Clear dependent tables in safe order ──────────────────────────
  console.log('\x1b[1mClearing existing data\x1b[0m');
  await seq.query('SET FOREIGN_KEY_CHECKS = 0', { type: QueryTypes.RAW });
  await seq.query('TRUNCATE TABLE stock_movements',  { type: QueryTypes.RAW });
  await seq.query('TRUNCATE TABLE purchase_items',   { type: QueryTypes.RAW });
  await seq.query('TRUNCATE TABLE purchases',        { type: QueryTypes.RAW });
  await seq.query('TRUNCATE TABLE sale_items',       { type: QueryTypes.RAW });
  await seq.query('TRUNCATE TABLE payments',         { type: QueryTypes.RAW });
  await seq.query('TRUNCATE TABLE sales',            { type: QueryTypes.RAW });
  await seq.query('TRUNCATE TABLE product_variants', { type: QueryTypes.RAW });
  await seq.query('TRUNCATE TABLE products',         { type: QueryTypes.RAW });
  await seq.query('TRUNCATE TABLE categories',       { type: QueryTypes.RAW });
  await seq.query('SET FOREIGN_KEY_CHECKS = 1', { type: QueryTypes.RAW });
  log('Cleared: stock_movements, purchases, sales, products, categories');

  // ── Step 2: Categories ────────────────────────────────────────────────────
  console.log('\n\x1b[1mCategories\x1b[0m');
  const cats = {};
  for (const name of ['Door Locks', 'Screws', 'Hinges']) {
    const [c] = await Category.findOrCreate({ where: { name } });
    cats[name] = c;
    log(`Created: ${name}`);
  }

  // ── Step 3: Products ──────────────────────────────────────────────────────
  console.log('\n\x1b[1mProducts\x1b[0m');
  for (const p of PRODUCTS) {
    const cat = cats[p.category];
    const { category: _cat, ...pData } = p;
    await Product.create({
      ...pData,
      category_id:  cat?.id,
      alert_qty:    p.stock_qty * 0.1,   // 10% of stock as alert threshold
      active:       true,
    });
    log(`${p.name}  (${p.category}, ${p.unit}, Rs. ${p.selling_price})`);
  }

  await seq.close();
  console.log(`\n\x1b[1mDone.\x1b[0m  ${PRODUCTS.length} products loaded across 3 categories.\n`);
}

main().catch(e => { console.error(`\x1b[31m✖\x1b[0m  ${e.message}`); process.exit(1); });
