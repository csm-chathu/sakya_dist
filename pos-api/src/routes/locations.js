const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');

// POST /api/locations — sales rep saves current position
router.post('/', auth, async (req, res) => {
  const { UserLocation } = req.models;
  const { latitude, longitude, accuracy } = req.body;
  if (!latitude || !longitude) return res.status(400).json({ error: 'latitude and longitude required' });

  await UserLocation.upsert({
    user_id:   req.user.id,
    latitude,
    longitude,
    accuracy:  accuracy || null,
  });
  res.json({ ok: true });
});

// GET /api/locations — admin/manager gets all sales rep locations
router.get('/', auth, role('admin', 'manager'), async (req, res) => {
  const { UserLocation, User } = req.models;
  const locations = await UserLocation.findAll({
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    order: [['updatedAt', 'DESC']],
  });
  res.json(locations);
});

module.exports = router;
