import { Router } from 'express';
import { db, tx, HttpError, paginate, like, getSettings, localExpr } from '../db.js';
import { requireAdmin } from '../auth.js';

const r = Router();
const L = localExpr('s.created_at');
const base = `SELECT s.*, c.name AS customer_name, c.tax_id AS customer_tax_id, u.name AS employee_name
  FROM sales s LEFT JOIN customers c ON c.id = s.customer_id LEFT JOIN users u ON u.id = s.user_id`;
// Los empleados solo ven sus propias ventas; el administrador ve todas.
const scope = (req) => (req.user.role === 'admin' ? { sql: '', args: [] } : { sql: 's.user_id = ?', args: [req.user.id] });

function detail(id, req) {
  const s = db.prepare(`${base} WHERE s.id = ?`).get(id);
  if (!s) throw new HttpError(404, 'No encontramos esa venta.');
  if (req.user.role !== 'admin' && s.user_id !== req.user.id) throw new HttpError(403, 'Solo puedes ver tus propias ventas.');
  s.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id').all(id);
  s.company = getSettings();
  return s;
}

r.get('/', (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const where = [], args = [];
  const sc = scope(req); if (sc.sql) { where.push(sc.sql); args.push(...sc.args); }
  if (req.query.q) { const l = like(req.query.q); where.push("(c.name LIKE ? ESCAPE '\\' OR CAST(s.id AS TEXT) LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')"); args.push(l, l, l); }
  if (req.query.status) { where.push('s.status = ?'); args.push(req.query.status); }
  if (req.query.from) { where.push(`date(${L}) >= ?`); args.push(String(req.query.from).slice(0, 10)); }
  if (req.query.to) { where.push(`date(${L}) <= ?`); args.push(String(req.query.to).slice(0, 10)); }
  if (req.query.employee_id && req.user.role === 'admin') { where.push('s.user_id = ?'); args.push(Number(req.query.employee_id)); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM sales s LEFT JOIN customers c ON c.id = s.customer_id LEFT JOIN users u ON u.id = s.user_id ${w}`).get(...args).n;
  const data = db.prepare(`${base} ${w} ORDER BY s.created_at DESC, s.id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
  const ids = data.map((d) => d.id);
  if (ids.length) {
    const items = db.prepare(`SELECT sale_id, name, qty FROM sale_items WHERE sale_id IN (${ids.map(() => '?').join(',')})`).all(...ids);
    for (const d of data) d.items = items.filter((i) => i.sale_id === d.id);
  }
  res.json({ data, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
});

r.get('/:id', (req, res) => res.json(detail(Number(req.params.id), req)));

r.post('/', (req, res) => {
  const customerId = Number(req.body?.customer_id);
  const lines = Array.isArray(req.body?.items) ? req.body.items : [];
  const notes = String(req.body?.notes || '').slice(0, 500);
  if (!customerId || !db.prepare('SELECT 1 FROM customers WHERE id = ?').get(customerId)) throw new HttpError(422, 'Elige un cliente para la venta.', { customer_id: 'Elige un cliente.' });
  if (!lines.length) throw new HttpError(422, 'Agrega al menos un producto a la venta.', { items: 'Agrega al menos un producto.' });
  if (lines.length > 100) throw new HttpError(422, 'La venta tiene demasiados productos.');

  const id = tx(() => {
    // agrupar por producto por si llega repetido
    const qtyBy = new Map();
    for (const l of lines) {
      const pid = Number(l.product_id), q = Number(l.qty);
      if (!pid || !Number.isInteger(q) || q < 1) throw new HttpError(422, 'Cada producto debe tener una cantidad entera mayor que cero.');
      qtyBy.set(pid, (qtyBy.get(pid) || 0) + q);
    }
    const settings = getSettings();
    let subtotal = 0;
    const rows = [];
    for (const [pid, qty] of qtyBy) {
      const p = db.prepare('SELECT * FROM products WHERE id = ?').get(pid);
      if (!p) throw new HttpError(422, 'Uno de los productos ya no existe.');
      if (p.stock < qty) throw new HttpError(409, `Stock insuficiente para "${p.name}": quedan ${p.stock} y pediste ${qty}.`, { items: `Stock insuficiente para ${p.name}.` });
      const line = Math.round(p.price * qty);
      subtotal += line;
      rows.push({ p, qty, line });
    }
    const tax = Math.round(subtotal * settings.tax_rate);
    const total = subtotal + tax;
    const info = db.prepare('INSERT INTO sales (customer_id,user_id,subtotal,tax_rate,tax,total,status,notes) VALUES (?,?,?,?,?,?,?,?)')
      .run(customerId, req.user.id, subtotal, settings.tax_rate, tax, total, 'completed', notes);
    const sid = Number(info.lastInsertRowid);
    for (const { p, qty, line } of rows) {
      db.prepare('INSERT INTO sale_items (sale_id,product_id,name,sku,qty,unit_price,line_total) VALUES (?,?,?,?,?,?,?)').run(sid, p.id, p.name, p.sku, qty, p.price, line);
      // el UPDATE condicional evita que dos ventas simultáneas dejen stock negativo
      const u = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?').run(qty, p.id, qty);
      if (!u.changes) throw new HttpError(409, `Stock insuficiente para "${p.name}".`);
    }
    // un prospecto pasa a cliente activo con su primera compra
    db.prepare("UPDATE customers SET status = 'active' WHERE id = ? AND status = 'prospect'").run(customerId);
    return sid;
  });
  res.status(201).json(detail(id, req));
});

r.post('/:id/cancel', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  tx(() => {
    const s = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    if (!s) throw new HttpError(404, 'No encontramos esa venta.');
    if (s.status === 'cancelled') throw new HttpError(409, 'Esta venta ya estaba anulada.');
    for (const i of db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id)) {
      if (i.product_id) db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(i.qty, i.product_id);
    }
    db.prepare("UPDATE sales SET status = 'cancelled' WHERE id = ?").run(id);
  });
  res.json(detail(id, req));
});

export default r;
