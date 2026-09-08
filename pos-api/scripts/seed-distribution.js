/**
 * Sample data seed for the distribution app.
 * Usage:  node scripts/seed-distribution.js [host]
 *         node scripts/seed-distribution.js localhost
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const getModels  = require('../src/models');
const tenants    = require('../src/config/tenants');
const bcrypt     = require('bcryptjs');

const host   = process.argv[2] || 'localhost';
const tenant = tenants[host];
if (!tenant) { console.error(`Host "${host}" not in tenants.js`); process.exit(1); }

const log = m => console.log(`\x1b[32m✔\x1b[0m  ${m}`);

async function main() {
  const seq = new Sequelize(tenant.database, tenant.username, tenant.password, {
    host:    tenant.host || process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    define:  { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', underscored: true },
  });
  await seq.authenticate();
  const { Category, Product, Supplier, Customer, Area } = getModels(seq);

  console.log('\n\x1b[1m── Distribution Sample Data ──\x1b[0m\n');

  // ── Categories ──────────────────────────────────────────────────────────────
  console.log('\x1b[1mCategories\x1b[0m');
  const catData = ['Beverages', 'Dry Goods', 'Dairy & Chilled', 'Personal Care', 'Household'];
  const cats = {};
  for (const name of catData) {
    const [c, created] = await Category.findOrCreate({ where: { name } });
    cats[name] = c;
    log(`${created ? 'Created' : 'Exists '}: ${name}`);
  }

  // ── Suppliers ───────────────────────────────────────────────────────────────
  console.log('\n\x1b[1mSuppliers\x1b[0m');
  const supplierData = [
    { name: 'Ceylon Beverages Ltd',    phone: '0112-345678', email: 'orders@ceybev.lk',   address: 'Kelaniya, Western Province' },
    { name: 'Maliban Biscuit Mfrs',    phone: '0112-876543', email: 'trade@maliban.lk',   address: 'Ratmalana, Western Province' },
    { name: 'Cargills Quality Dairies',phone: '0114-567890', email: 'supply@cargills.lk', address: 'Colombo 03' },
    { name: 'Unilever Ceylon Ltd',     phone: '0112-345000', email: 'dist@unilever.lk',   address: 'Grandpass, Colombo' },
  ];
  for (const s of supplierData) {
    const [, created] = await Supplier.findOrCreate({ where: { name: s.name }, defaults: s });
    log(`${created ? 'Created' : 'Exists '}: ${s.name}`);
  }

  // ── Products ─────────────────────────────────────────────────────────────────
  console.log('\n\x1b[1mProducts\x1b[0m');
  const productData = [
    { name: 'Elephant House Ginger Beer 400ml',  barcode: '8941007500012', category: 'Beverages',      cost_price: 65,  selling_price: 90,  wholesale_price: 78,  stock_qty: 240, unit: 'btl' },
    { name: 'Coca-Cola 500ml PET',               barcode: '5449000054227', category: 'Beverages',      cost_price: 75,  selling_price: 100, wholesale_price: 88,  stock_qty: 180, unit: 'btl' },
    { name: 'Nescafé Original 200g',             barcode: '5000101344848', category: 'Dry Goods',      cost_price: 520, selling_price: 695, wholesale_price: 620, stock_qty: 60,  unit: 'tin' },
    { name: 'Maliban Cream Cracker 180g',        barcode: '8941000350152', category: 'Dry Goods',      cost_price: 95,  selling_price: 130, wholesale_price: 115, stock_qty: 144, unit: 'pkt' },
    { name: 'Sunquick Orange Squash 840ml',      barcode: '5701480046006', category: 'Beverages',      cost_price: 380, selling_price: 495, wholesale_price: 440, stock_qty: 48,  unit: 'btl' },
    { name: 'Anchor Full Cream Milk Powder 400g',barcode: '9310036003014', category: 'Dry Goods',      cost_price: 680, selling_price: 895, wholesale_price: 800, stock_qty: 72,  unit: 'pkt' },
    { name: 'Cargills Magic Yoghurt 80g',        barcode: '8941007600020', category: 'Dairy & Chilled',cost_price: 35,  selling_price: 50,  wholesale_price: 44,  stock_qty: 120, unit: 'cup' },
    { name: 'Keells Processed Cheese 200g',      barcode: '8941007700031', category: 'Dairy & Chilled',cost_price: 280, selling_price: 375, wholesale_price: 335, stock_qty: 36,  unit: 'pkt' },
    { name: 'Sunlight Dishwash Liquid 400ml',    barcode: '8901030985095', category: 'Household',      cost_price: 125, selling_price: 165, wholesale_price: 148, stock_qty: 96,  unit: 'btl' },
    { name: 'Vim Dishwash Bar 200g',             barcode: '8901030860059', category: 'Household',      cost_price: 55,  selling_price: 75,  wholesale_price: 67,  stock_qty: 200, unit: 'bar' },
    { name: 'Lifebuoy Hand Wash 200ml',          barcode: '8901030978677', category: 'Personal Care',  cost_price: 145, selling_price: 195, wholesale_price: 175, stock_qty: 84,  unit: 'btl' },
    { name: 'Signal Toothpaste 160g',            barcode: '8690572005162', category: 'Personal Care',  cost_price: 135, selling_price: 180, wholesale_price: 162, stock_qty: 60,  unit: 'tube' },
  ];
  for (const p of productData) {
    const cat = cats[p.category];
    const { category: _cat, ...pData } = p;
    const [, created] = await Product.findOrCreate({
      where: { name: p.name },
      defaults: { ...pData, category_id: cat?.id, active: true },
    });
    log(`${created ? 'Created' : 'Exists '}: ${p.name}`);
  }

  // ── Areas ────────────────────────────────────────────────────────────────────
  console.log('\n\x1b[1mAreas\x1b[0m');
  const areaData = [
    { name: 'Colombo North',   description: 'Kelaniya, Wattala, Ja-Ela, Negombo' },
    { name: 'Colombo South',   description: 'Dehiwala, Moratuwa, Panadura' },
    { name: 'Colombo Central', description: 'Pettah, Maradana, Borella, Wellawatte' },
    { name: 'Gampaha',         description: 'Gampaha, Kadawatha, Kiribathgoda' },
    { name: 'Kandy',           description: 'Kandy city and surrounding areas' },
    { name: 'Galle',           description: 'Galle, Unawatuna, Hikkaduwa' },
  ];
  for (const a of areaData) {
    const [, created] = await Area.findOrCreate({ where: { name: a.name }, defaults: a });
    log(`${created ? 'Created' : 'Exists '}: ${a.name}`);
  }

  // ── Customers ────────────────────────────────────────────────────────────────
  console.log('\n\x1b[1mCustomers\x1b[0m');
  const customerData = [
    { name: 'Perera Grocery Store',    phone: '071-2345678', address: 'Kelaniya',      price_level: 'wholesale', payment_terms: 'net_30', credit_limit: 50000,  credit_balance: 0 },
    { name: 'Silva Supermart',         phone: '077-3456789', address: 'Wattala',       price_level: 'wholesale', payment_terms: 'net_15', credit_limit: 75000,  credit_balance: 12500 },
    { name: 'Nimal Mini Shop',         phone: '076-4567890', address: 'Ja-Ela',        price_level: 'retail',    payment_terms: 'cash',   credit_limit: 10000,  credit_balance: 0 },
    { name: 'City Convenience Store',  phone: '011-5678901', address: 'Pettah',        price_level: 'vip',       payment_terms: 'net_60', credit_limit: 150000, credit_balance: 35000 },
    { name: 'Karunathilake Traders',   phone: '081-6789012', address: 'Kandy',         price_level: 'wholesale', payment_terms: 'net_30', credit_limit: 60000,  credit_balance: 8000 },
    { name: 'Galle Road Provisions',  phone: '091-7890123', address: 'Galle',         price_level: 'wholesale', payment_terms: 'net_15', credit_limit: 40000,  credit_balance: 0 },
    { name: 'Sunrise Kade',           phone: '078-8901234', address: 'Gampaha',       price_level: 'retail',    payment_terms: 'cash',   credit_limit: 5000,   credit_balance: 2200 },
    { name: 'Metro Supermarket',       phone: '011-9012345', address: 'Dehiwala',      price_level: 'vip',       payment_terms: 'net_60', credit_limit: 200000, credit_balance: 45000 },
  ];
  for (const c of customerData) {
    const [, created] = await Customer.findOrCreate({
      where: { name: c.name },
      defaults: { ...c, email: null, active: true },
    });
    log(`${created ? 'Created' : 'Exists '}: ${c.name} (${c.price_level} / ${c.payment_terms})`);
  }

  await seq.close();
  console.log('\n\x1b[1mDone. Sample distribution data loaded.\x1b[0m\n');
  console.log('Login credentials:');
  console.log('  admin@lumac.lk   / 123  (admin)');
  console.log('  manager@lumac.lk / 123  (manager)\n');
}

main().catch(e => { console.error(`\x1b[31m✖\x1b[0m  ${e.message}`); process.exit(1); });
