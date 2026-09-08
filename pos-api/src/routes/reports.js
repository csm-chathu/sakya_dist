const router = require('express').Router();
const { Op }  = require('sequelize');
const auth    = require('../middleware/auth');

function dateRange(req) {
  const from = req.query.date_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const to   = req.query.date_to   || new Date().toISOString().slice(0, 10);
  return [`${from} 00:00:00`, `${to} 23:59:59`];
}

// GET /api/reports/today
router.get('/today', auth, async (req, res) => {
  const db   = req.db;
  const today = new Date().toISOString().slice(0, 10);

  const [sales, byPayment] = await Promise.all([
    db.query(`SELECT id, invoice_no, total, discount, tax, paid, balance, created_at FROM sales WHERE DATE(created_at) = ? AND status != 'held' ORDER BY id DESC`, { replacements: [today], type: db.QueryTypes.SELECT }),
    db.query(`SELECT p.method, SUM(p.amount) as total, COUNT(DISTINCT p.sale_id) as count FROM payments p JOIN sales s ON p.sale_id = s.id WHERE DATE(s.created_at) = ? AND s.status != 'held' GROUP BY p.method`, { replacements: [today], type: db.QueryTypes.SELECT }),
  ]);

  const summary = {
    total_sales:    sales.length,
    total_revenue:  sales.reduce((a, s) => a + parseFloat(s.total), 0),
    total_discount: sales.reduce((a, s) => a + parseFloat(s.discount), 0),
    total_tax:      sales.reduce((a, s) => a + parseFloat(s.tax), 0),
  };
  res.json({ sales, summary, byPayment, date: today });
});

// GET /api/reports/day-end?date=
router.get('/day-end', auth, async (req, res) => {
  const db   = req.db;
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const [sales, byPayment] = await Promise.all([
    db.query(`SELECT s.*, u.name as user_name FROM sales s JOIN users u ON s.user_id = u.id WHERE DATE(s.created_at) = ? AND s.status != 'held' ORDER BY s.id`, { replacements: [date], type: db.QueryTypes.SELECT }),
    db.query(`SELECT p.method, SUM(p.amount) as total, COUNT(DISTINCT p.sale_id) as count FROM payments p JOIN sales s ON p.sale_id = s.id WHERE DATE(s.created_at) = ? AND s.status != 'held' GROUP BY p.method`, { replacements: [date], type: db.QueryTypes.SELECT }),
  ]);

  const summary = {
    total_bills:    sales.length,
    total_revenue:  sales.reduce((a, s) => a + parseFloat(s.total), 0),
    total_discount: sales.reduce((a, s) => a + parseFloat(s.discount), 0),
    total_paid:     sales.reduce((a, s) => a + parseFloat(s.paid), 0),
    total_balance:  sales.reduce((a, s) => a + parseFloat(s.balance), 0),
  };
  res.json({ sales, summary, byPayment, date });
});

// GET /api/reports/monthly?month=2026-07
router.get('/monthly', auth, async (req, res) => {
  const db = req.db;
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const [year, mo] = month.split('-');
  const start = `${month}-01 00:00:00`;
  const end   = new Date(year, mo, 0).toISOString().slice(0, 10) + ' 23:59:59';

  const byDay = await db.query(`
    SELECT DATE(created_at) as date, SUM(total) as total, SUM(discount) as discount, COUNT(*) as count
    FROM sales WHERE created_at BETWEEN ? AND ? AND status != 'held'
    GROUP BY DATE(created_at) ORDER BY date
  `, { replacements: [start, end], type: db.QueryTypes.SELECT });

  res.json({ byDay, summary: { month, total_revenue: byDay.reduce((a, d) => a + parseFloat(d.total), 0), total_sales: byDay.reduce((a, d) => a + d.count, 0) } });
});

// GET /api/reports/top-products
router.get('/top-products', auth, async (req, res) => {
  const db = req.db;
  const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const topProducts = await db.query(`
    SELECT si.product_id, si.product_name, SUM(si.qty) as total_qty,
           SUM(si.total) as total_revenue, COUNT(DISTINCT si.sale_id) as sale_count
    FROM sale_items si JOIN sales s ON si.sale_id = s.id
    WHERE s.created_at >= ? AND s.status != 'held'
    GROUP BY si.product_id, si.product_name ORDER BY total_qty DESC LIMIT 10
  `, { replacements: [`${from} 00:00:00`], type: db.QueryTypes.SELECT });

  res.json({ topProducts, from, to: new Date().toISOString().slice(0, 10) });
});

// GET /api/reports/low-stock
router.get('/low-stock', auth, async (req, res) => {
  const { Product, Category } = req.models;
  const products = await Product.findAll({
    where: { active: true },
    having: db => db.literal('stock_qty <= alert_qty'),
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    order: [['stock_qty', 'ASC']],
  });
  res.json({ products });
});

// GET /api/reports/profit?date_from=&date_to=
router.get('/profit', auth, async (req, res) => {
  const db = req.db;
  const [from, to] = dateRange(req);

  const [items, salesSummary] = await Promise.all([
    db.query(`
      SELECT si.product_id, si.product_name, si.unit_price, si.cost_price,
             (si.unit_price - si.cost_price) as unit_profit,
             SUM(si.qty) as total_qty,
             SUM(si.unit_price * si.qty) as gross_revenue,
             SUM(si.discount) as total_item_discount,
             SUM(si.total) as net_revenue,
             SUM(si.cost_price * si.qty) as total_cost,
             SUM((si.unit_price - si.cost_price) * si.qty) as gross_profit
      FROM sale_items si JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at BETWEEN ? AND ? AND s.status != 'held'
      GROUP BY si.product_id, si.product_name, si.unit_price, si.cost_price
      ORDER BY si.product_name
    `, { replacements: [from, to], type: db.QueryTypes.SELECT }),
    db.query(`SELECT COUNT(*) as total_bills, SUM(subtotal) as subtotal, SUM(discount) as bill_discount, SUM(total) as net_total FROM sales WHERE created_at BETWEEN ? AND ? AND status != 'held'`, { replacements: [from, to], type: db.QueryTypes.SELECT }),
  ]);

  const ss          = salesSummary[0] || {};
  const grossRevenue  = items.reduce((a, i) => a + parseFloat(i.gross_revenue), 0);
  const itemDiscount  = items.reduce((a, i) => a + parseFloat(i.total_item_discount), 0);
  const billDiscount  = parseFloat(ss.bill_discount || 0);
  const totalDiscount = itemDiscount + billDiscount;
  const totalCost     = items.reduce((a, i) => a + parseFloat(i.total_cost), 0);
  const grossProfit   = items.reduce((a, i) => a + parseFloat(i.gross_profit), 0);

  res.json({
    items,
    summary: {
      total_bills: parseInt(ss.total_bills || 0),
      gross_revenue: grossRevenue, item_discount: itemDiscount, bill_discount: billDiscount,
      total_discount: totalDiscount, net_revenue: grossRevenue - totalDiscount,
      total_cost: totalCost, gross_profit: grossProfit, net_profit: grossProfit - totalDiscount,
    },
    date_from: req.query.date_from, date_to: req.query.date_to,
  });
});

// GET /api/reports/credit-customers
router.get('/credit-customers', auth, async (req, res) => {
  const { Customer } = req.models;
  const customers = await Customer.findAll({
    where: { credit_balance: { [Op.gt]: 0 } },
    order: [['credit_balance', 'DESC']],
  });
  const totalCredit = customers.reduce((a, c) => a + parseFloat(c.credit_balance), 0);
  res.json({ customers, totalCredit });
});

// GET /api/reports/stock-summary
router.get('/stock-summary', auth, async (req, res) => {
  const { Product, Category } = req.models;
  const { Op } = require('sequelize');
  const where = { active: true };
  if (req.query.search) {
    const s = req.query.search;
    where[Op.or] = [{ name: { [Op.like]: `%${s}%` } }, { sku: { [Op.like]: `%${s}%` } }];
  }
  if (req.query.category_id) where.category_id = req.query.category_id;

  const page  = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || '50'), 9999);
  const { count, rows } = await Product.findAndCountAll({
    where,
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    order: [['id', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });

  const all = await Product.findOne({
    where: { active: true },
    attributes: [
      [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'total_products'],
      [Product.sequelize.fn('SUM', Product.sequelize.col('stock_qty')), 'total_units'],
      [Product.sequelize.literal('SUM(cost_price * stock_qty)'), 'total_cost_value'],
      [Product.sequelize.literal('SUM(selling_price * stock_qty)'), 'total_retail_value'],
    ],
    raw: true,
  });

  res.json({ products: { data: rows, total: count, page, last_page: Math.ceil(count / limit) }, summary: all });
});

// GET /api/reports/revenue
router.get('/revenue', auth, async (req, res) => {
  const db = req.db;
  const [from, to] = dateRange(req);

  const [byDay, billDiscountsByDay, byPayment] = await Promise.all([
    db.query(`
      SELECT DATE(s.created_at) as date, COUNT(DISTINCT s.id) as total_bills,
             SUM(si.unit_price * si.qty) as gross_revenue, SUM(si.discount) as item_discount,
             SUM(si.total) as net_revenue, SUM(si.cost_price * si.qty) as total_cost,
             SUM((si.unit_price - si.cost_price) * si.qty) as gross_profit
      FROM sale_items si JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at BETWEEN ? AND ? AND s.status != 'held'
      GROUP BY DATE(s.created_at) ORDER BY date
    `, { replacements: [from, to], type: db.QueryTypes.SELECT }),
    db.query(`SELECT DATE(created_at) as date, SUM(discount) as bill_discount FROM sales WHERE created_at BETWEEN ? AND ? AND status != 'held' GROUP BY DATE(created_at)`, { replacements: [from, to], type: db.QueryTypes.SELECT }),
    db.query(`SELECT p.method, SUM(p.amount) as total FROM payments p JOIN sales s ON p.sale_id = s.id WHERE s.created_at BETWEEN ? AND ? AND s.status != 'held' GROUP BY p.method`, { replacements: [from, to], type: db.QueryTypes.SELECT }),
  ]);

  const discMap = Object.fromEntries(billDiscountsByDay.map(r => [r.date, parseFloat(r.bill_discount)]));
  byDay.forEach(row => {
    row.bill_discount  = discMap[row.date] || 0;
    row.total_discount = parseFloat(row.item_discount) + row.bill_discount;
    row.net_profit     = parseFloat(row.gross_profit) - row.total_discount;
  });

  res.json({ byDay, byPayment, date_from: req.query.date_from, date_to: req.query.date_to });
});

// GET /api/reports/stock-movements?date_from=&date_to=&type=&search=&page=
router.get('/stock-movements', auth, async (req, res) => {
  const db = req.db;
  const [from, to] = dateRange(req);

  const conditions = ['sm.created_at BETWEEN ? AND ?'];
  const replacements = [from, to];

  if (req.query.type && req.query.type !== 'all') {
    conditions.push('sm.type = ?');
    replacements.push(req.query.type);
  }
  if (req.query.search) {
    conditions.push('p.name LIKE ?');
    replacements.push(`%${req.query.search}%`);
  }

  const page  = parseInt(req.query.page || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  const where = conditions.join(' AND ');

  const [rows, [{ total }]] = await Promise.all([
    db.query(`
      SELECT sm.id, sm.type, sm.qty, sm.stock_before, sm.stock_after,
             sm.reference, sm.note, sm.created_at,
             p.name as product_name, p.unit,
             u.name as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN users u ON sm.user_id = u.id
      WHERE ${where}
      ORDER BY sm.id DESC
      LIMIT ? OFFSET ?
    `, { replacements: [...replacements, limit, offset], type: db.QueryTypes.SELECT }),
    db.query(`
      SELECT COUNT(*) as total
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE ${where}
    `, { replacements, type: db.QueryTypes.SELECT }),
  ]);

  res.json({ data: rows, total: parseInt(total), page, last_page: Math.ceil(parseInt(total) / limit) });
});

// GET /api/reports/daily-sales — pivot: product × date
router.get('/daily-sales', auth, async (req, res) => {
  const db = req.db;
  const [from, to] = dateRange(req);

  const rows = await db.query(`
    SELECT
      si.product_name,
      ROUND(MAX(si.unit_price), 2)    AS unit_price,
      DATE(s.created_at)              AS sale_date,
      ROUND(SUM(si.qty), 3)           AS day_qty,
      ROUND(SUM(si.total), 2)         AS day_total
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status != 'held'
      AND s.created_at BETWEEN ? AND ?
    GROUP BY si.product_name, DATE(s.created_at)
    ORDER BY si.product_name, DATE(s.created_at)
  `, { replacements: [from, to], type: db.QueryTypes.SELECT });

  const dateSet = new Set(rows.map(r => r.sale_date));
  const dates   = [...dateSet].sort();

  const productMap = {};
  for (const r of rows) {
    if (!productMap[r.product_name]) {
      productMap[r.product_name] = {
        product_name: r.product_name,
        unit_price:   parseFloat(r.unit_price),
        total_qty:    0,
        total_value:  0,
        by_date:      {},
      };
    }
    const p = productMap[r.product_name];
    p.by_date[r.sale_date] = parseFloat(r.day_qty);
    p.total_qty   += parseFloat(r.day_qty);
    p.total_value += parseFloat(r.day_total);
  }

  res.json({ dates, rows: Object.values(productMap) });
});

// GET /api/reports/aging — credit customers grouped by days outstanding
router.get('/aging', auth, async (req, res) => {
  const db = req.db;
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db.query(`
    SELECT
      c.id, c.name, c.phone, c.payment_terms,
      c.credit_balance,
      MIN(s.created_at) as oldest_credit_sale
    FROM customers c
    LEFT JOIN sales s ON s.customer_id = c.id
      AND s.status != 'held'
      AND EXISTS (SELECT 1 FROM payments p WHERE p.sale_id = s.id AND p.method = 'credit')
    WHERE c.credit_balance > 0
    GROUP BY c.id, c.name, c.phone, c.payment_terms, c.credit_balance
    ORDER BY oldest_credit_sale ASC
  `, { type: db.QueryTypes.SELECT });

  const buckets = { current: [], days_31_60: [], days_61_90: [], over_90: [] };
  const now = new Date(today);

  for (const r of rows) {
    const days = r.oldest_credit_sale
      ? Math.floor((now - new Date(r.oldest_credit_sale)) / 86400000)
      : 0;
    r.days_outstanding = days;
    if (days <= 30) buckets.current.push(r);
    else if (days <= 60) buckets.days_31_60.push(r);
    else if (days <= 90) buckets.days_61_90.push(r);
    else buckets.over_90.push(r);
  }

  const total = rows.reduce((s, r) => s + parseFloat(r.credit_balance), 0);
  res.json({ buckets, total, as_of: today });
});

// GET /api/reports/credit-payments?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/credit-payments', auth, async (req, res) => {
  const { CreditPayment, Customer, User } = req.models;
  const from = req.query.from || new Date().toISOString().slice(0, 10);
  const to   = req.query.to   || from;
  const rows = await CreditPayment.findAll({
    where: {
      created_at: {
        [Op.gte]: new Date(from + 'T00:00:00'),
        [Op.lte]: new Date(to   + 'T23:59:59'),
      },
    },
    include: [
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
      { model: User,     as: 'user',     attributes: ['id', 'name'] },
    ],
    order: [['created_at', 'DESC']],
  });
  const total = rows.reduce((s, r) => s + parseFloat(r.amount), 0);
  res.json({ payments: rows, total });
});

module.exports = router;
