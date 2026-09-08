const router = require('express').Router();
const { Op }  = require('sequelize');
const auth    = require('../middleware/auth');
const role    = require('../middleware/role');

// GET /api/deliveries — list with optional filter by status, date
router.get('/', auth, async (req, res) => {
  const { Delivery, Sale, Area } = req.models;
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.date) {
    const d = new Date(req.query.date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    where.scheduled_date = { [Op.gte]: d, [Op.lt]: next };
  }
  const page  = parseInt(req.query.page || '1');
  const limit = 20;
  const { count, rows } = await Delivery.findAndCountAll({
    where,
    include: [
      { model: Sale, as: 'sale', attributes: ['id', 'invoice_no', 'total', 'customer_id'] },
      { model: Area, as: 'area', attributes: ['id', 'name'] },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  res.json({ data: rows, total: count, page, last_page: Math.ceil(count / limit) });
});

// GET /api/deliveries/loadsheet?date=YYYY-MM-DD or ?ids=1,2,3
router.get('/loadsheet', auth, async (req, res) => {
  const { Delivery, Sale, SaleItem, Area, Customer, Product } = req.models;

  let where = {};
  if (req.query.ids) {
    const ids = req.query.ids.split(',').map(Number).filter(Boolean);
    where = { id: { [Op.in]: ids } };
  } else {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const next = new Date(date); next.setDate(next.getDate() + 1);
    where = { scheduled_date: { [Op.gte]: date, [Op.lt]: next } };
  }

  const rows = await Delivery.findAll({
    where,
    include: [
      {
        model: Sale, as: 'sale',
        attributes: ['id', 'invoice_no', 'total', 'customer_id', 'notes'],
        include: [
          { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'address'] },
          {
            model: SaleItem, as: 'items',
            attributes: ['id', 'product_name', 'qty', 'unit_price', 'total'],
          },
        ],
      },
      { model: Area, as: 'area', attributes: ['id', 'name'] },
    ],
    order: [['area_id', 'ASC'], ['created_at', 'ASC']],
  });
  res.json(rows);
});

// POST /api/deliveries — create
router.post('/', auth, async (req, res) => {
  const { Delivery } = req.models;
  try {
    const { sale_id, area_id, driver_name, notes, scheduled_date } = req.body;
    const delivery = await Delivery.create({ sale_id, area_id, driver_name, notes, scheduled_date, status: 'pending' });
    res.status(201).json(delivery);
  } catch (e) { res.status(422).json({ error: e.message }); }
});

// GET /api/deliveries/:id — show with items
router.get('/:id', auth, async (req, res) => {
  const { Delivery, Sale, Area, Customer } = req.models;
  const delivery = await Delivery.findByPk(req.params.id, {
    include: [
      {
        model: Sale, as: 'sale',
        attributes: ['id', 'invoice_no', 'total', 'customer_id'],
        include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] }],
      },
      { model: Area, as: 'area', attributes: ['id', 'name', 'description'] },
    ],
  });
  if (!delivery) return res.status(404).json({ error: 'Not found' });
  res.json(delivery);
});

// PUT /api/deliveries/:id/status — update status
router.put('/:id/status', auth, async (req, res) => {
  const { Delivery } = req.models;
  const VALID = ['pending', 'loaded', 'in_transit', 'delivered', 'returned'];
  const { status, return_note } = req.body;
  if (!VALID.includes(status)) return res.status(422).json({ error: 'Invalid status' });
  if (status === 'returned' && !return_note?.trim()) return res.status(422).json({ error: 'Return note is required' });
  const delivery = await Delivery.findByPk(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Not found' });
  const update = { status };
  if (status === 'returned') update.return_note = return_note.trim();
  await delivery.update(update);
  res.json(delivery);
});

// DELETE /api/deliveries/:id — delete (admin only)
router.delete('/:id', auth, role('admin'), async (req, res) => {
  const { Delivery } = req.models;
  const delivery = await Delivery.findByPk(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Not found' });
  await delivery.destroy();
  res.json({ message: 'Deleted' });
});

module.exports = router;
