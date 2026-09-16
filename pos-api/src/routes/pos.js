const router = require('express').Router();
const { Op, literal } = require('sequelize');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

function nextInvoiceNo(sequelize) {
  const d  = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return sequelize.query(
    `SELECT invoice_no FROM pos_sales ORDER BY id DESC LIMIT 1`,
    { type: sequelize.QueryTypes.SELECT }
  ).then(rows => {
    if (!rows.length) return `POS-${ds}-0001`;
    const last  = rows[0].invoice_no || '';
    const parts = last.split('-');
    const num   = parseInt(parts[parts.length - 1] || '0') + 1;
    return `POS-${ds}-${String(num).padStart(4, '0')}`;
  });
}

// GET /api/pos
router.get('/', auth, async (req, res) => {
  const { PosSale, PosSaleItem, PosPayment, User, Customer } = req.models;
  const where = {};
  if (req.query.date) {
    const d = req.query.date;
    where.created_at = { [Op.between]: [`${d} 00:00:00`, `${d} 23:59:59`] };
  }
  if (req.query.search) {
    where.invoice_no = { [Op.like]: `%${req.query.search}%` };
  }

  const page  = parseInt(req.query.page || '1');
  const limit = 20;
  const { count, rows } = await PosSale.findAndCountAll({
    where,
    include: [
      { model: User,       as: 'user',     attributes: ['id', 'name'] },
      { model: Customer,   as: 'customer', attributes: ['id', 'name', 'phone'] },
      { model: PosPayment, as: 'payments' },
    ],
    order: [['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  res.json({ data: rows, total: count, page, last_page: Math.ceil(count / limit) });
});

// POST /api/pos
router.post('/', auth, async (req, res) => {
  const { PosSale, PosSaleItem, PosPayment, Product, Customer, StockMovement } = req.models;
  const { items = [], payments = [], customer_id, ...saleData } = req.body;

  const invoice_no = await nextInvoiceNo(req.db);
  const sale = await PosSale.create({ ...saleData, invoice_no, user_id: req.user.id, customer_id: customer_id || null });

  for (const item of items) {
    await PosSaleItem.create({ ...item, pos_sale_id: sale.id });

    // Stock deduction disabled for POS sales
    // const product = await Product.findByPk(item.product_id);
    // if (product) {
    //   const before = parseFloat(product.stock_qty);
    //   const after  = Math.max(0, before - parseFloat(item.qty));
    //   await product.update({ stock_qty: after });
    //   await StockMovement.create({
    //     product_id:   product.id,
    //     user_id:      req.user.id,
    //     type:         'out',
    //     qty:          item.qty,
    //     stock_before: before,
    //     stock_after:  after,
    //     reference:    invoice_no,
    //   });
    // }
  }

  for (const pay of payments) await PosPayment.create({ ...pay, pos_sale_id: sale.id });

  const creditPay = payments.find(p => p.method === 'credit');
  if (creditPay && customer_id) {
    const customer = await Customer.findByPk(customer_id);
    if (customer) {
      await customer.update({ credit_balance: parseFloat(customer.credit_balance) + parseFloat(creditPay.amount) });
    }
  }

  const created = await PosSale.findByPk(sale.id, {
    include: [
      { model: PosSaleItem, as: 'items' },
      { model: PosPayment,  as: 'payments' },
    ],
  });
  res.status(201).json(created);
});

// GET /api/pos/:id
router.get('/:id', auth, async (req, res) => {
  const { PosSale, PosSaleItem, PosPayment, User, Customer } = req.models;
  const sale = await PosSale.findByPk(req.params.id, {
    include: [
      { model: PosSaleItem, as: 'items' },
      { model: PosPayment,  as: 'payments' },
      { model: User,        as: 'user',     attributes: ['id', 'name'] },
      { model: Customer,    as: 'customer', attributes: ['id', 'name', 'phone'] },
    ],
  });
  if (!sale) return res.status(404).json({ error: 'Not found' });
  res.json(sale);
});

// DELETE /api/pos/:id
router.delete('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { PosSale } = req.models;
  const sale = await PosSale.findByPk(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Not found' });
  await sale.destroy();
  res.json({ message: 'Deleted' });
});

module.exports = router;
