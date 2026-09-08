const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');

const DEFAULT_FEATURES = [
  { key: 'dashboard',        label: 'Dashboard',        path: '/dashboard',          group: 'main', sort_order: 1  },
  { key: 'new_sale',         label: 'New Sale',          path: '/sales/create',       group: 'main', sort_order: 2  },
  { key: 'sales',            label: 'Sales',             path: '/sales',              group: 'main', sort_order: 3  },
  { key: 'deliveries',       label: 'Deliveries',        path: '/deliveries',         group: 'main', sort_order: 4  },
  { key: 'areas',            label: 'Areas',             path: '/areas',              group: 'main', sort_order: 5  },
  { key: 'invoices',         label: 'Day End',           path: '/invoices',           group: 'main', sort_order: 6  },
  { key: 'products',         label: 'Products',          path: '/products',           group: 'main', sort_order: 7  },
  { key: 'stock_intake',     label: 'Stock Intake',      path: '/products/intake',    group: 'main', sort_order: 8  },
  { key: 'purchases',        label: 'Purchases',         path: '/purchases',          group: 'main', sort_order: 9  },
  { key: 'customers',        label: 'Customers',         path: '/customers',          group: 'main', sort_order: 10 },
  { key: 'credit',           label: 'Credit Book',       path: '/credit',             group: 'main', sort_order: 11 },
  { key: 'suppliers',        label: 'Suppliers',         path: '/suppliers',          group: 'main', sort_order: 12 },
  { key: 'categories',       label: 'Categories',        path: '/categories',         group: 'main', sort_order: 13 },
  { key: 'reports',          label: 'Reports',           path: '/reports',            group: 'mgmt', sort_order: 14 },
  { key: 'users',            label: 'Users',             path: '/users',              group: 'mgmt', sort_order: 15 },
  { key: 'settings',         label: 'Settings',          path: '/settings',           group: 'mgmt', sort_order: 16 },
  { key: 'data_import',      label: 'Data Import',       path: '/admin/data-import',  group: 'mgmt', sort_order: 17 },
  { key: 'role_permissions', label: 'Role Permissions',  path: '/settings/roles',     group: 'mgmt', sort_order: 18 },
];

async function ensureFeatures(Feature) {
  // Always upsert so new features added to DEFAULT_FEATURES appear automatically
  for (const f of DEFAULT_FEATURES) {
    await Feature.findOrCreate({ where: { key: f.key }, defaults: f });
  }
}

// GET /api/roles — list all roles with their assigned features
router.get('/', auth, async (req, res) => {
  const { Role, Feature } = req.models;
  await ensureFeatures(Feature);
  const roles = await Role.findAll({
    include: [{ model: Feature, through: { attributes: [] } }],
    order: [['name', 'ASC']],
  });
  res.json(roles.map(r => ({
    id:       r.id,
    name:     r.name,
    features: r.Features.map(f => f.key),
  })));
});

// GET /api/roles/features — list all available features (auto-seeds if empty)
router.get('/features', auth, async (req, res) => {
  const { Feature } = req.models;
  await ensureFeatures(Feature);
  const features = await Feature.findAll({ order: [['sort_order', 'ASC']] });
  res.json(features);
});

// PUT /api/roles/:id/features — assign features to a role (admin only)
router.put('/:id/features', auth, role('admin'), async (req, res) => {
  const { Role, Feature } = req.models;
  const r = await Role.findByPk(req.params.id);
  if (!r) return res.status(404).json({ error: 'Role not found' });

  const keys     = req.body.features || [];
  const features = await Feature.findAll({ where: { key: keys } });
  await r.setFeatures(features);

  res.json({ message: 'Updated', features: features.map(f => f.key) });
});

module.exports = router;
