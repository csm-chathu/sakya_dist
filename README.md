# Shakya Distribution

Multi-tenant distribution management system — Express.js API + React/Vite/Tailwind client.

---

## Stack

| Layer  | Technology |
|--------|-----------|
| API    | Node.js, Express, Sequelize, MySQL |
| Client | React, Vite, Tailwind CSS, Redux Toolkit |
| Auth   | JWT, role-based (`admin`, `manager`, `cashier`) |

---

## Project Structure

```
pos-api/        — Express REST API (multi-tenant, per-subdomain DB)
pos-client/     — React SPA
```

---

## Features

| Module | Description |
|--------|-------------|
| Sales Orders | Create and manage distribution orders with delivery dates |
| Deliveries | Dispatch tracking — pending → loaded → in transit → delivered |
| Areas | Delivery zones/routes for grouping customers |
| Products | Inventory with retail, wholesale, and VIP pricing |
| Customers | Price levels (retail/wholesale/vip) and payment terms |
| Suppliers & Purchases | Stock receiving with GRN |
| Credit | Customer credit balances, settlement, aging report |
| Reports | Daily, monthly, profit, stock, aging receivables |
| Users & Roles | Role-based access control with feature permissions |

---

## Development Setup

### API

```bash
cd pos-api
npm install
cp .env.example .env   # set DB_HOST, JWT_SECRET, etc.
npm run dev            # nodemon on port 8000
```

### Client

```bash
cd pos-client
npm install
npm run dev            # Vite dev server
```

---

## Tenant Management

Each subdomain maps to its own MySQL database, configured in `pos-api/src/config/tenants.js`.

### Local development tenant

```js
// pos-api/src/config/tenants.js
localhost: {
  database: 'sakya_dist',
  username: 'root',
  password: 'root',
  host: '127.0.0.1',
},
```

### Adding a new tenant

**Step 1** — Create the database in MySQL.

**Step 2** — Add the tenant to `pos-api/src/config/tenants.js`:

```js
'yourshop.lumac.cc': {
  database: 'yourshop_dist',
  username: 'pos_user',
  password: 'Pos@2026Strong',
},
```

**Step 3** — Migrate and seed:

```bash
cd pos-api

# Schema only (safe — no data touched)
node scripts/migrate.js yourshop.lumac.cc

# Schema + roles + settings + default users
node scripts/migrate.js yourshop.lumac.cc --seed

# Drop everything and start fresh
node scripts/migrate.js yourshop.lumac.cc --fresh
```

**Step 4** — Load sample distribution data:

```bash
node scripts/seed-distribution.js yourshop.lumac.cc
```

Seeds: 5 categories, 4 suppliers, 12 products (with wholesale pricing), 6 delivery areas, 8 customers (with price levels and payment terms).

**Step 5** — Restart the API:

```bash
pm2 restart pos-api
```

---

### Schema changes (existing tenants)

When you add a new column or model to `pos-api/src/models/index.js`, apply it to live tenants:

```bash
node scripts/migrate.js <host>
```

Sequelize `alter: true` adds new columns/tables without touching existing data.

---

## Roles

| Role      | Permissions |
|-----------|-------------|
| `admin`   | Full access — users, settings, reports, all modules |
| `manager` | Orders, deliveries, products, customers, suppliers, reports |
| `cashier` | Orders and customers |

---

## Customer Price Levels

| Level | Auto-selected price |
|-------|-------------------|
| `retail` | `selling_price` |
| `wholesale` | `wholesale_price` |
| `vip` | `wholesale_price` |

When creating an order, the unit price auto-fills based on the selected customer's price level.

---

## Environment Variables (`pos-api/.env`)

```env
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=your_secret_here
PORT=8000
```

---

## Available Scripts

### API (`pos-api/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with nodemon |
| `npm start` | Start API (production) |
| `node scripts/migrate.js <host>` | Migrate schema (safe) |
| `node scripts/migrate.js <host> --seed` | Migrate + seed roles/users |
| `node scripts/migrate.js <host> --fresh` | Drop all + fresh seed |
| `node scripts/seed-distribution.js <host>` | Load sample distribution data |
| `node scripts/add-tenant.js` | Interactive full tenant setup |

### Client (`pos-client/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |

---

## Default Login

After running `migrate.js --seed`:

| Email | Password | Role |
|-------|----------|------|
| admin@lumac.lk | 123 | admin |
| manager@lumac.lk | 123 | manager |
| cashier@lumac.lk | 123 | cashier |
