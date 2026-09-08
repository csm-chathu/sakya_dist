const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');

// GET /api/areas — list all
router.get('/', auth, async (req, res) => {
  const { Area } = req.models;
  const areas = await Area.findAll({ order: [['name', 'ASC']] });
  res.json({ data: areas });
});

// POST /api/areas — create
router.post('/', auth, role('admin', 'manager'), async (req, res) => {
  const { Area } = req.models;
  try {
    const { name, description } = req.body;
    const area = await Area.create({ name, description });
    res.status(201).json(area);
  } catch (e) { res.status(422).json({ error: e.message }); }
});

// PUT /api/areas/:id — update
router.put('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { Area } = req.models;
  try {
    const area = await Area.findByPk(req.params.id);
    if (!area) return res.status(404).json({ error: 'Not found' });
    const { name, description } = req.body;
    await area.update({ name, description });
    res.json(area);
  } catch (e) { res.status(422).json({ error: e.message }); }
});

// DELETE /api/areas/:id — delete
router.delete('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { Area } = req.models;
  const area = await Area.findByPk(req.params.id);
  if (!area) return res.status(404).json({ error: 'Not found' });
  await area.destroy();
  res.json({ message: 'Deleted' });
});

module.exports = router;
