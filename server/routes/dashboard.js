import { Router } from 'express';
import { db, localExpr } from '../db.js';

const r = Router();
const L = localExpr('s.created_at');
const NOW = localExpr("'now'"); // hora local de Colombia (UTC + TZ_OFFSET)

r.get('/', (req, res) => {
  const admin = req.user.role === 'admin';
  const own = admin ? '' : ' AND s.user_id = ?';
  const oa = admin ? [] : [req.user.id];
  const done = `s.status = 'completed'${own}`;
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const all = (sql, ...a) => db.prepare(sql).all(...a);

  const today = `date(${NOW})`;
  const monthStart = `strftime('%Y-%m-01', ${NOW})`;
  const prevMonthStart = `strftime('%Y-%m-01', ${NOW}, '-1 month')`;

  const salesToday = one(`SELECT COALESCE(SUM(total),0) AS v, COUNT(*) AS n FROM sales s WHERE ${done} AND date(${L}) = ${today}`, ...oa);
  const salesMonth = one(`SELECT COALESCE(SUM(total),0) AS v, COUNT(*) AS n FROM sales s WHERE ${done} AND date(${L}) >= ${monthStart}`, ...oa);
  const salesPrev = one(`SELECT COALESCE(SUM(total),0) AS v FROM sales s WHERE ${done} AND date(${L}) >= ${prevMonthStart} AND date(${L}) <= date(${NOW}, '-1 month')`, ...oa);  // mismo tramo del mes anterior
  const customers = one(`SELECT COUNT(*) AS n, SUM(status='active') AS active, SUM(status='prospect') AS prospects FROM customers`);
  const newCustomers = one(`SELECT COUNT(*) AS n FROM customers WHERE date(${localExpr('created_at')}) >= ${monthStart}`);
  const products = one(`SELECT COUNT(*) AS n, SUM(stock <= min_stock) AS low, SUM(stock = 0) AS out, COALESCE(SUM(stock*cost),0) AS inv_cost, COALESCE(SUM(stock*price),0) AS inv_value FROM products`);
  const suppliers = one('SELECT COUNT(*) AS n FROM suppliers');

  const daily = all(`SELECT date(${L}) AS d, SUM(total) AS total, COUNT(*) AS n FROM sales s
    WHERE ${done} AND date(${L}) >= date(${NOW}, '-29 days') GROUP BY d`, ...oa);
  const dmap = new Map(daily.map((x) => [x.d, x]));
  const days = all(`WITH RECURSIVE d(x, i) AS (SELECT date(${NOW}, '-29 days'), 0 UNION ALL SELECT date(x, '+1 day'), i+1 FROM d WHERE i < 29) SELECT x FROM d`).map((x) => x.x);
  const salesByDay = days.map((d) => ({ date: d, total: dmap.get(d)?.total || 0, count: dmap.get(d)?.n || 0 }));

  const monthly = all(`SELECT strftime('%Y-%m', ${L}) AS m, SUM(total) AS total, COUNT(*) AS n FROM sales s
    WHERE ${done} AND date(${L}) >= date(${NOW}, 'start of month', '-5 months') GROUP BY m`, ...oa);
  const mmap = new Map(monthly.map((x) => [x.m, x]));
  const months = all(`WITH RECURSIVE m(x, i) AS (SELECT strftime('%Y-%m', ${NOW}, 'start of month', '-5 months'), 0 UNION ALL SELECT strftime('%Y-%m', x || '-01', '+1 month'), i+1 FROM m WHERE i < 5) SELECT x FROM m`).map((x) => x.x);
  const salesByMonth = months.map((m) => ({ month: m, total: mmap.get(m)?.total || 0, count: mmap.get(m)?.n || 0 }));

  const topProducts = all(`SELECT i.name, SUM(i.qty) AS qty, SUM(i.line_total) AS total FROM sale_items i JOIN sales s ON s.id = i.sale_id
    WHERE ${done} AND date(${L}) >= date(${NOW}, '-89 days') GROUP BY i.name ORDER BY total DESC LIMIT 6`, ...oa);
  const byCategory = all(`SELECT COALESCE(NULLIF(p.category,''),'Sin categoría') AS category, SUM(i.line_total) AS total FROM sale_items i
    JOIN sales s ON s.id = i.sale_id LEFT JOIN products p ON p.id = i.product_id
    WHERE ${done} AND date(${L}) >= date(${NOW}, '-89 days') GROUP BY category ORDER BY total DESC`, ...oa);
  const topCustomers = all(`SELECT c.name, SUM(s.total) AS total, COUNT(*) AS n FROM sales s JOIN customers c ON c.id = s.customer_id
    WHERE ${done} GROUP BY c.id ORDER BY total DESC LIMIT 5`, ...oa);
  const recent = all(`SELECT s.id, s.total, s.created_at, c.name AS customer_name, u.name AS employee_name FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id LEFT JOIN users u ON u.id = s.user_id
    WHERE ${done} ORDER BY s.created_at DESC, s.id DESC LIMIT 6`, ...oa);
  const lowStock = all('SELECT id, sku, name, stock, min_stock FROM products WHERE stock <= min_stock ORDER BY (stock = 0) DESC, stock - min_stock, name LIMIT 6');
  const topEmployees = admin ? all(`SELECT u.name, SUM(s.total) AS total, COUNT(*) AS n FROM sales s JOIN users u ON u.id = s.user_id
    WHERE s.status='completed' AND date(${L}) >= ${monthStart} GROUP BY u.id ORDER BY total DESC LIMIT 5`) : [];

  const growth = salesPrev.v > 0 ? (salesMonth.v - salesPrev.v) / salesPrev.v : null;
  res.json({
    scope: admin ? 'all' : 'own',
    kpis: {
      sales_today: salesToday.v, sales_today_count: salesToday.n,
      sales_month: salesMonth.v, sales_month_count: salesMonth.n, sales_prev_month: salesPrev.v, growth,
      avg_ticket: salesMonth.n ? Math.round(salesMonth.v / salesMonth.n) : 0,
      customers: customers.n, customers_active: customers.active || 0, customers_prospects: customers.prospects || 0, new_customers_month: newCustomers.n,
      products: products.n, low_stock: products.low || 0, out_of_stock: products.out || 0,
      inventory_cost: products.inv_cost, inventory_value: products.inv_value, suppliers: suppliers.n,
    },
    salesByDay, salesByMonth, topProducts, byCategory, topCustomers, recent, lowStock, topEmployees,
  });
});

export default r;
