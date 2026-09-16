const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const auth    = require('../middleware/auth');

async function getRoleFeatures(Role, Feature, roleId) {
  if (!roleId) return null;
  const r = await Role.findByPk(roleId, {
    include: [{ model: Feature, through: { attributes: [] } }],
  });
  return r?.Features?.map(f => f.key) ?? null;
}

// User-level features override role features when rows exist in user_features
async function getEffectiveFeatures(models, userId, roleObj, roleName) {
  if (roleName === 'admin') return null;

  const { User, Role, Feature } = models;
  try {
    const userWithFeatures = await User.findByPk(userId, {
      include: [{ model: Feature, as: 'DirectFeatures', through: { attributes: [] } }],
    });
    if ((userWithFeatures?.DirectFeatures?.length ?? 0) > 0) {
      return userWithFeatures.DirectFeatures.map(f => f.key);
    }
  } catch (_) {
    // user_features table not yet migrated — fall through to role features
  }

  return await getRoleFeatures(Role, Feature, roleObj?.id);
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(422).json({ error: 'Email/username and password required' });

  const { User, Role, Feature } = req.models;
  const { Op } = require('sequelize');
  const user = await User.findOne({
    where: { [Op.or]: [{ email }, { name: email }] },
    include: [{ model: Role, through: { attributes: [] } }],
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const roleObj  = user.Roles?.[0];
  const roleName = roleObj?.name ?? 'cashier';
  const features = await getEffectiveFeatures(req.models, user.id, roleObj, roleName);

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: roleName, tenant: req.tenant },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: roleName, features },
  });
});

// POST /api/auth/logout
router.post('/logout', auth, (req, res) => res.json({ message: 'Logged out' }));

// GET /api/me
router.get('/me', auth, async (req, res) => {
  const { Setting, User, Role, Feature } = req.models;
  const [settings, userWithRole] = await Promise.all([
    Setting.findAll(),
    User.findByPk(req.user.id, { include: [{ model: Role, through: { attributes: [] } }] }),
  ]);
  const appSettings = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const roleObj  = userWithRole?.Roles?.[0];
  const roleName = roleObj?.name ?? req.user.role;
  const features = await getEffectiveFeatures(req.models, req.user.id, roleObj, roleName);

  res.json({
    user: { id: req.user.id, name: req.user.name, email: req.user.email, role: roleName, features },
    appSettings,
  });
});

module.exports = router;
