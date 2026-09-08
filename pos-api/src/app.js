require('dotenv').config();
const express = require('express');

// Prevent unhandled DB errors from crashing the process
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err?.message || err);
});
const cors    = require('cors');
const tenant  = require('./middleware/tenant');

const app = express();

app.use(cors({
  origin: (origin, cb) => cb(null, true), // tighten in production
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Tenant DB switch — must be before all routes
app.use(tenant);

// Health check
app.get('/api/ping', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/me',        require('./routes/auth')); // /api/me is in auth router
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/categories',require('./routes/categories'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/sales',     require('./routes/sales'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/features',  require('./routes/features'));
app.use('/api/roles',     require('./routes/roles'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/imagekit',       require('./routes/imagekit'));
app.use('/api/notifications',  require('./routes/notifications'));
app.use('/api/areas',      require('./routes/areas'));
app.use('/api/deliveries', require('./routes/deliveries'));

// Wrap all async route handlers so thrown errors flow to the error handler
function wrapAsync(router) {
  router.stack.forEach(layer => {
    if (layer.handle?.stack) wrapAsync(layer.handle);
    else if (layer.route) {
      layer.route.stack.forEach(r => {
        const orig = r.handle;
        r.handle = (req, res, next) => {
          const result = orig(req, res, next);
          if (result?.catch) result.catch(next);
        };
      });
    }
  });
}

// Apply async wrapper to all mounted routers
['auth', 'dashboard', 'products', 'categories', 'suppliers', 'customers', 'sales', 'purchases', 'settings', 'users', 'reports', 'areas', 'deliveries'].forEach(name => {
  try { wrapAsync(require(`./routes/${name}`)); } catch {}
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err?.message || err);
  const status = err.status || (err.name === 'SequelizeAccessDeniedError' ? 503 : 500);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`POS API running on http://localhost:${PORT}`));
